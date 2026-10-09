import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.js';
import { onRequest } from '../functions/api/[[path]].js';

test('health endpoint returns JSON without a data binding', async () => {
  const response = await worker.fetch(new Request('https://site.test/api/health'), {});
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.match(response.headers.get('content-security-policy'), /default-src 'none'/);
  assert.equal(response.headers.get('access-control-allow-origin'), null);
  assert.equal((await response.json()).status, 'ok');
});

test('Pages Functions unavailable responses apply the API security headers too', async () => {
  const response = await onRequest({ request: new Request('https://site.test/api/health'), env: {} });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
});

test('admin endpoints reject requests without an owner secret', async () => {
  const response = await worker.fetch(new Request('https://site.test/api/admin/review-queue'), { DB: {} });
  assert.equal(response.status, 401);
});

test('ranking API serves an atomic last-good snapshot and labels a fallback snapshot stale', async () => {
  const chart = { year: 2026, status: 'ranked', minimumCritics: 3, rankedFilms: 1, pendingFilmCount: 0,
    items: [{ filmId: 'clayface', title: 'Verified Film', position: 1, averageScore: 82, criticCount: 3, sources: [] }] };
  const DB = { prepare(sql) { return { bind() { return this; }, async all() {
    if (!sql.includes('annual_ranking_snapshots')) throw new Error(`Unexpected query: ${sql}`);
    return { results: [
      { rankedAt: '2026-10-09', publishedAt: '2026-10-09T04:00:00.000Z', payload: '{invalid' },
      { rankedAt: '2026-10-08', publishedAt: '2026-10-08T04:00:00.000Z', payload: JSON.stringify(chart) }
    ] };
  } }; } };
  const response = await worker.fetch(new Request('https://site.test/api/rankings?year=2026'), { DB });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.stale, true);
  assert.equal(payload.updatedAt, '2026-10-08T04:00:00.000Z');
  assert.equal(payload.items[0].title, 'Verified Film');
});

test('daily ranking scheduler writes an empty or populated snapshot atomically with position history', async () => {
  const batches = [];
  const film = { id: 'fixture-film-a', title: 'Fixture Ranked Horror', filmYear: 2026 };
  const reviews = [
    ['critic-a', 4], ['critic-b', 5], ['critic-c', 3]
  ].map(([criticId, score], index) => ({
    filmId: film.id, filmYear: 2026, criticId, criticName: `Critic ${index + 1}`, publication: 'Fixture Review',
    publicationUrl: 'https://review.example.test/about', reviewUrl: `https://review.example.test/${index + 1}`,
    score, scoreOutOf: 5, territory: 'GB', publishedAt: `2026-10-0${index + 1}`, checkedAt: '2026-10-09',
    permissionCleared: true, professionalVerified: true, ratingKind: 'numeric-professional-review'
  }));
  const DB = { prepare(sql) {
    return { sql, values: [], bind(...values) { this.values = values; return this; }, async all() {
      if (sql.includes('SELECT DISTINCT film_year')) return { results: [{ year: 2026 }] };
      if (sql.includes('FROM canonical_films') && sql.includes('film_year = ?')) return { results: [film] };
      if (sql.includes('FROM critic_reviews') && sql.includes('status = \'approved\'')) return { results: reviews };
      if (sql.includes('FROM rank_history') && sql.includes('ranked_at = ?')) return { results: [{ filmId: film.id, position: 2 }] };
      if (sql.includes('annual_ranking_snapshots')) return { results: [] };
      return { results: [] };
    }, async first() {
      if (sql.includes('annual_ranking_snapshots')) return { rankedAt: '2026-10-08' };
      if (sql.includes('MAX(ranked_at)')) return { rankedAt: '2026-10-08' };
      return null;
    }, async run() { return { meta: { changes: 1 } }; } };
  }, async batch(statements) { batches.push(statements); } };
  const tasks = await worker.scheduled({ cron: '0 4 * * *' }, { DB, DEFAULT_COUNTRY: 'GB', DISCOVERY_COUNTRIES: 'GB' });
  const rankingBatch = batches.find(batch => batch.some(statement => statement.sql.includes('annual_ranking_snapshots')));
  assert.ok(rankingBatch);
  assert.equal(rankingBatch.some(statement => statement.sql.includes('rank_history')), true);
  const snapshot = rankingBatch.find(statement => statement.sql.includes('annual_ranking_snapshots'));
  const payload = JSON.parse(snapshot.values[4]);
  assert.equal(payload.rankedFilms, 1);
  assert.equal(payload.items[0].movementLabel, 'UP 1');
  assert.equal(payload.items[0].averageScore, 80);
  assert.equal(tasks.some(task => task.task === 'licensed-review-ingestion' && task.status === 'skipped'), true);
});

test('film detail endpoint rejects malformed and path-shaped identifiers safely', async () => {
  for (const id of ['%2Fadmin', '%E0%A4%A', '..']) {
    const response = await worker.fetch(new Request(`https://site.test/api/films/${id}`), { DB: {} });
    assert.ok([400, 404].includes(response.status));
  }
});

test('unsupported country is rejected before database access', async () => {
  const response = await worker.fetch(new Request('https://site.test/api/discovery?country=ZZ'), { DEFAULT_COUNTRY: 'GB', DB: {} });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error.message, /Unsupported country/);
});

test('cinema API applies the per-client quota before spending another MovieGlu request', async () => {
  let calls = 0;
  let count = 0;
  const DB = { prepare(sql) {
    let values = [];
    return { bind(...args) { values = args; return this; },
      async first() {
        if (sql.includes('FROM canonical_films')) return { film_id: 'approved-fixture', title: 'Test fixture', movieglu_id: 123 };
        count = values[1] > 0 ? count + 1 : count;
        return { request_count: count };
      } };
  } };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { calls++; return new Response(JSON.stringify({ cinemas: [] }), { status: 200 }); };
  try {
    const env = { DB, DEFAULT_COUNTRY: 'GB', CINEMA_RATE_LIMIT_SALT: 'test-only-salt', MOVIEGLU_LICENSE_APPROVED: 'true',
      MOVIEGLU_API_KEY: 'fixture', MOVIEGLU_AUTHORIZATION: 'fixture', MOVIEGLU_CLIENT: 'fixture', MOVIEGLU_API_VERSION: 'v200' };
    const makeRequest = () => new Request('https://site.test/api/cinema?country=GB', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': '192.0.2.1' },
      body: JSON.stringify({ filmId: 'approved-fixture', lat: 51.5, lon: -0.1, date: new Date().toISOString().slice(0, 10) }) });
    for (let index = 0; index < 10; index++) assert.equal((await worker.fetch(makeRequest(), env)).status, 200);
    assert.equal((await worker.fetch(makeRequest(), env)).status, 429);
    assert.equal(calls, 10);
  } finally { globalThis.fetch = originalFetch; }
});

test('approved horror film detail API returns source claims and hides unapproved records', async () => {
  const record = { id: 'approved-fixture', title: 'Test fixture', releaseYear: 2026, territory: 'GB', primarySourceName: 'Fixture source',
    primarySourceUrl: 'https://example.invalid/film', checkedAt: '2026-10-08', horrorSourceUrl: 'https://example.invalid/genre', releaseMode: 'unconfirmed', releaseModeSourceUrl: null };
  let current = record;
  const DB = { prepare() { return { bind() { return this; }, first: async () => current }; } };
  const response = await worker.fetch(new Request('https://site.test/api/films/approved-fixture'), { DB });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.film.title, 'Test fixture');
  assert.equal(result.claims[0].source, 'https://example.invalid/film');
  assert.deepEqual(result.unconfirmed, ['Territorial release date', 'Cast and crew', 'Synopsis', 'Official trailer', 'Promotional artwork']);
  current = null;
  assert.equal((await worker.fetch(new Request('https://site.test/api/films/pending-fixture'), { DB })).status, 404);
});
