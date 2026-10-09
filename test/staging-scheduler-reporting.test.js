import test from 'node:test';
import assert from 'node:assert/strict';
import scheduler, { calculateDailyRanking } from '../worker/staging-rankings.js';

// Simulates successful and rejected atomic D1 batches. Uses the actual
// ranking-snapshots.js and src/core.js modules, with no upstream score data.
function mockD1({ years = [2024, 2025, 2026], failYears = [] } = {}) {
  const failures = new Set(failYears);
  const state = { writes: [], publishedYears: [], failures: [] };
  return {
    state,
    prepare(sql) {
      return {
        sql, values: [],
        bind(...values) { this.values = values; return this; },
        async all() {
          if (sql.includes('SELECT DISTINCT film_year')) return { results: years.map(year => ({ year })) };
          if (sql.includes('FROM canonical_films') || sql.includes('FROM critic_reviews') || sql.includes('FROM annual_ranking_snapshots')) return { results: [] };
          if (sql.includes('SELECT film_year FROM canonical_films')) return { results: [] };
          throw new Error('Unexpected SELECT in mock D1: ' + sql);
        },
        async run() {
          if (!sql.includes('INSERT INTO update_runs')) throw new Error('Unexpected standalone write in mock D1: ' + sql);
          state.writes.push({ sql, values: this.values });
          return { meta: { changes: 1 } };
        }
      };
    },
    async batch(statements) {
      const snapshot = statements.find(statement => statement.sql.includes('INSERT INTO annual_ranking_snapshots'));
      if (!snapshot) throw new Error('Expected atomic annual snapshot batch');
      const year = snapshot.values[0];
      if (failures.has(year)) { state.failures.push(year); throw new Error('Simulated D1 atomic batch rejection'); }
      state.publishedYears.push(year);
      return statements.map(() => ({ success: true }));
    }
  };
}

test('all empty annual snapshots may publish when the schema is present', async () => {
  const db = mockD1();
  const result = await calculateDailyRanking(db, new Date('2026-10-09T04:00:00.000Z'));
  assert.equal(result.status, 'published');
  assert.equal(result.rankedRows, 0);
  assert.equal(result.succeededYears, 3);
  assert.equal(result.failedYears, 0);
  assert.deepEqual(db.state.publishedYears, [2024, 2025, 2026]);
});

test('failure of one year reports partial, never published', async () => {
  const db = mockD1({ failYears: [2025] });
  const result = await calculateDailyRanking(db, new Date('2026-10-09T04:00:00.000Z'));
  assert.equal(result.status, 'partial');
  assert.equal(result.failedYears, 1);
  assert.equal(result.succeededYears, 2);
  assert.deepEqual(db.state.publishedYears, [2024, 2026]);
  assert.equal(db.state.writes.length, 1);
  assert.equal(db.state.writes[0].values[3], 'failed');
});

test('failure of every year reports failed', async () => {
  const db = mockD1({ failYears: [2024, 2025, 2026] });
  const result = await calculateDailyRanking(db, new Date('2026-10-09T04:00:00.000Z'));
  assert.equal(result.status, 'failed');
  assert.equal(result.failedYears, 3);
  assert.equal(result.succeededYears, 0);
  assert.deepEqual(db.state.publishedYears, []);
});

test('scheduled handler surfaces partial writes to Cloudflare Cron as a failure', async () => {
  const db = mockD1({ failYears: [2025] });
  await assert.rejects(scheduler.scheduled({}, { DB: db }, {}), /Failed to publish 1 of 3 annual ranking snapshots/);
  assert.deepEqual(db.state.publishedYears, [2024, 2026]);
});
