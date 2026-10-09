// Staging-only daily snapshot job. It reads already approved, permission-cleared
// critic reviews; it never scrapes or calls a ratings provider.
import { hasRankingSchema, listRankingYears, publishAnnualRankingSnapshot } from './ranking-snapshots.js';

const method = 'approved-numeric-critic-scores-only';
const log = (event, details = {}) => console.log(JSON.stringify({ event, ...details }));
const errorDetails = error => ({
  code: error?.name === 'TypeError' ? 'invalid_data' : 'storage_or_schema_error',
  message: String(error?.message || 'unknown').slice(0, 240)
});

async function logRun(db, { task, trigger = 'cron-staging', status, startedAt, finishedAt, count = 0, error = null }) {
  await db.prepare(`INSERT INTO update_runs(run_id, task, country_code, trigger_name, status, started_at, finished_at, record_count, error_code, error_message)
    VALUES(?, ?, '', ?, ?, ?, ?, ?, ?, ?)`)
    .bind(crypto.randomUUID(), task, trigger, status, startedAt, finishedAt, count, error?.code || null, error?.message || null).run();
}

export async function calculateDailyRanking(db, now = new Date()) {
  if (!db) throw new Error('Staging D1 binding missing');
  const startedAt = now.toISOString();
  if (!(await hasRankingSchema(db))) {
    const issue = { code: 'migration_required', message: 'film_year and annual_ranking_snapshots are not available' };
    await logRun(db, { task: 'annual-rankings', status: 'skipped', startedAt, finishedAt: now.toISOString(), error: issue });
    log('daily_staging_rankings_skipped', { reason: 'migration-required' });
    return { updatedAt: now.toISOString(), rankedRows: 0, status: 'skipped', reason: 'migration-required', method };
  }

  const years = await listRankingYears(db, now.getUTCFullYear());
  const snapshots = [];
  for (const year of years) {
    try {
      const payload = await publishAnnualRankingSnapshot(db, year, now, 'cron-staging');
      snapshots.push({ year, rankedRows: payload?.rankedFilms || 0, status: 'published' });
    } catch (error) {
      const issue = errorDetails(error);
      try { await logRun(db, { task: `ranking-${year}`, status: 'failed', startedAt, finishedAt: new Date().toISOString(), error: issue }); }
      catch (logError) { log('staging_ranking_failure_log_failed', { year, error: errorDetails(logError) }); }
      snapshots.push({ year, rankedRows: 0, status: 'failed', error: issue });
      log('staging_ranking_snapshot_failed_last_good_retained', { year, error: issue });
    }
  }
  const succeededYears = snapshots.filter(row => row.status === 'published').length;
  const failedYears = snapshots.filter(row => row.status === 'failed').length;
  const status = failedYears === 0 ? 'published' : succeededYears === 0 ? 'failed' : 'partial';
  return {
    updatedAt: now.toISOString(),
    rankedRows: snapshots.reduce((total, row) => total + row.rankedRows, 0),
    status, snapshots, succeededYears, failedYears, method
  };
}

export default {
  async scheduled(_controller, env, _ctx) {
    try {
      const result = await calculateDailyRanking(env.DB);
      if (result.status === 'skipped') return result;
      if (result.failedYears > 0) {
        log('daily_staging_rankings_incomplete', {
          status: result.status,
          succeededYears: result.succeededYears,
          failedYears: result.failedYears,
          failedFilmYears: result.snapshots.filter(row => row.status === 'failed').map(row => row.year)
        });
        // Surface partial failure to Cloudflare Cron monitoring, even when another
        // year was successfully published. Per-year failure details are logged above.
        throw new Error(`Failed to publish ${result.failedYears} of ${result.snapshots.length} annual ranking snapshots`);
      }
      log('daily_staging_rankings_updated', { rankedRows: result.rankedRows, status: result.status, years: result.snapshots.map(row => row.year) });
      return result;
    } catch (error) {
      log('daily_staging_rankings_failed', { reason: errorDetails(error).message });
      throw error;
    }
  }
};
