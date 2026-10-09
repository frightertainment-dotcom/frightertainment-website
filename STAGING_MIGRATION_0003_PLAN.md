# Staging D1 migration 0003: verified preflight, application and recovery plan

**Status:** Review draft only; not ready for migration approval. No remote migration, Worker deployment, database write, Cron edit, binding change, merge or public deployment was performed.

## Verified target and current state

Read-only Cloudflare checks on 9 October 2026 confirmed:

- The private Pages preview and Worker `frightertainment-staging-daily` both bind `DB` to the same staging D1 ID for `frightertainment-staging-discovery`.
- The separate Worker currently runs `0 4 * * *` (04:00 UTC). Its deployed source still groups by territory `release_year` and writes `rank_history`; it does not read `film_year` or write `annual_ranking_snapshots`.
- Read-only `sqlite_master` inspection found the nine expected application tables from `0001`/`0002` and their six named indexes. The table DDL, including primary/foreign keys, unique constraints and `CHECK` constraints, matches those migration files. Cloudflare's internal `_cf_KV` table is also present and must be preserved. There are no `film_year` columns, `annual_ranking_snapshots` or `critic_review_revisions` tables.
- There is no `d1_migrations` table in the remote database. The remote migration ledger therefore cannot confirm which migration files were applied.
- The application-data inventory has 20 canonical films, no critic review rows, no rank history, no dataset snapshots and one prior scheduled-run record. That recorded run was an empty `published` calculation at `2026-10-09T04:00:48.518Z`.
- D1 SELECT metadata reported `changed_db=false` and `rows_written=0` during the checks.

This confirms that the absent ledger does **not** mean an empty database. The current schema is the existing 0001/0002 schema, with its data intact; the ledger is simply unavailable to prove how it was originally applied. The Cloudflare database metadata reports 9 application tables and 139,264 bytes. Read-only queries returned 20 canonical films and 0 critic reviews.

The remote application table names are `dataset_snapshots`, `current_datasets`, `update_runs`, `review_queue`, `canonical_films`, `critic_reviews`, `rank_history`, `manual_film_versions` and `cinema_rate_limits`. The named indexes are `dataset_snapshots_lookup`, `update_runs_recent`, `review_queue_pending`, `critic_reviews_ranking`, `rank_history_latest` and `manual_film_versions_latest`; SQLite's automatic indexes implement declared primary-key and unique constraints. These match the definitions in the local 0001/0002 files. `_cf_KV` is separate from those nine application tables.

The repository's `wrangler.jsonc` is a separate local Worker config with an all-zero D1 ID. It is not a staging config and must not be used for remote commands. No D1 rebind or Cron change is needed: the existing staging binding and schedule are already correct.

## Migration 0003 data validation scope

The migration has 17 explicit, source-backed film-year updates across every backfilled year:

| Film year | Expected rows | Canonical IDs |
| --- | ---: | --- |
| 2024 | 3 | `heretic`, `longlegs`, `nosferatu` |
| 2025 | 7 | `28-years-later`, `black-phone-2`, `bring-her-back`, `five-nights-at-freddys-2`, `heart-eyes`, `the-monkey`, `together` |
| 2026 | 7 | `28-years-later-bone-temple`, `backrooms`, `insidious-out-of-the-further`, `ready-or-not-2`, `scream-7`, `send-help`, `victorian-psycho` |

The other three staging rows with `release_year=2026` must remain unassigned to a film year: `clayface`, `crawlers` and `werwulf`. They have territory-release evidence only. Expected post-migration inventory is 3 rows for 2024, 7 for 2025, 7 for 2026, and those 3 release-only records with `film_year IS NULL`. The migration must leave all 20 canonical rows intact, set source name/URL/check date on all 17 backfilled rows, and leave critic reviews empty. It must not add titles or ratings.

Use these checks on the isolated restore and again after any approved remote application:

```sql
SELECT film_year, COUNT(*) AS row_count
FROM canonical_films
GROUP BY film_year
ORDER BY film_year;

SELECT film_id, release_year, film_year, film_year_source_name,
       film_year_source_url, film_year_checked_at
FROM canonical_films
WHERE film_year IS NOT NULL
ORDER BY film_year, film_id;

SELECT film_id, release_year, film_year
FROM canonical_films
WHERE film_id IN ('clayface', 'crawlers', 'werwulf')
ORDER BY film_id;

SELECT COUNT(*) AS films FROM canonical_films;
SELECT COUNT(*) AS reviews FROM critic_reviews;
SELECT film_year, ranked_at, result_count, payload_json
FROM annual_ranking_snapshots
ORDER BY film_year, ranked_at;
```

Additionally compare the exact expected ID/year list above against the returned rows; require no missing/extra film-year assignment, no missing provenance field, 20 canonical rows, 0 critic reviews before owner-approved review entry, and 3 specified 2026 `NULL` rows.

## API and daily Worker compatibility

The deployed staging Worker is currently incompatible with the new snapshot API. The old code may continue inserting into `rank_history` after migration but will not produce annual snapshots; the updated API would then lack the intended daily publication history and movement baseline.

The development branch now has one shared ranking implementation in `worker/ranking-snapshots.js`:

- It selects approved, horror-verified films and approved, permission-cleared professional reviews by `film_year` only.
- It uses the existing equal-weight, distinct-critic calculation and three-critic threshold. Territory-only rows with `film_year=NULL` cannot enter the 2026 chart.
- It uses only the prior valid annual snapshot for movements; it no longer treats old `rank_history.release_year` rows as a film-year snapshot.
- It writes the complete payload, including a zero-result pending payload, and a successful update log in the same D1 batch. An empty ranking is a real snapshot with `result_count=0` and no numbered rows.
- A failed batch leaves the prior snapshot intact and is logged as a failed run.
- Before migration 0003 exists, the API returns an explicit pending/migration-required response, and the scheduler records a skipped run instead of querying a missing field or using the old release-year model.

**A staging Worker code deployment is required after migration and validation, before the next scheduled run.** This follows the requested order: migrate first, verify the new schema and film-year records, then deploy the updated `worker/staging-rankings.js`. The code deployment is a separate Cloudflare script deployment, not a Cron or binding change, and needs separate approval. Perform it after the existing 04:00 UTC run and complete it before the next 04:00 UTC run; do not alter the Cron to create a maintenance window. Preserve the current `DB` binding. Do not use the repository's zero-ID `wrangler.jsonc`.

No licensed critic review provider is configured. The scheduler only calculates from approved review records already present; it does not scrape protected services or acquire reviews. The 2026 Top 20 must remain pending until legitimate, permission-cleared scores qualify.

## Prior logical restore and rehearsal (not a full-backup validation)

Before this checkpoint, the Cloudflare SQL-export API produced an artifact, but the signed download URL was blocked by this environment's outbound proxy with `403`. The earlier read-only row-by-row copy of the nine application tables into local D1 was only a **logical restore**: it did not include `_cf_KV` or prove full-dump integrity. It was useful for code-path rehearsal, but is not a full-backup restore and cannot satisfy the current gate.

Against an isolated local copy:

1. Directly applying migration 0003 succeeded. Validation returned the expected 3/7/7 film-year distribution, the three specified 2026 `NULL` records, all 17 source fields and zero critic reviews.
2. With a fresh copy of the same pre-migration schema, Wrangler reported migrations `0001`, `0002` and `0003` pending. `wrangler d1 migrations apply --local` successfully applied all three; `0001` and `0002` were idempotent on the existing schema, and `0003` completed. This is the relevant rehearsal for the absent remote ledger: **do not assume 0003 is the only pending migration**.
3. Running `worker/staging-rankings.js` under Wrangler `dev --test-scheduled` wrote empty snapshots for 2024, 2025 and 2026. Their pending counts were 3, 7 and 7, respectively, with zero ranked positions. The updated API Worker, pointed at the same isolated local D1 persistence, returned the 2026 pending snapshot with seven eligible unranked films and no scores.
4. A local SQLite trigger deliberately aborted annual-snapshot inserts. All three snapshot batches failed, the three existing last-good snapshots stayed unchanged, and failure rows were added to `update_runs`. After removing the test trigger, the scheduled run succeeded and replaced the current-day pending snapshots. No synthetic review records were inserted.

The earlier local restore and Wrangler Cron test used temporary D1 IDs `11111111-1111-4111-8111-111111111111` and `22222222-2222-4222-8222-222222222222`; they are not Cloudflare resources and must never be used remotely.

## Current full-backup attempt and stop condition

On 9 October 2026, with owner authorization, a fresh full D1 SQL export was started through Cloudflare's export API and completed as one artifact. Downloading its one-hour signed URL with `curl` returned HTTP `403` from the outbound proxy. The SQL file is absent, so there is no checksum, no completed full restore, and no verified full-backup integrity result. The partial/empty local output was not treated as a backup. **No migration rehearsal against a full restored backup has been completed, and migration approval is not being requested.** The earlier logical-reconstruction rehearsal remains only prior code-path evidence and does not satisfy the full-copy gate. In accordance with the owner's stop condition, no further migration rehearsal was performed after the proxy failure.

To unblock the required rehearsal, perform the export and download from an owner-approved environment with direct access to Cloudflare's signed R2 export URL. Store the SQL outside the checkout with restrictive permissions, calculate its SHA-256, restore the exact file into a new isolated D1, and compare restored table/index DDL, all application row counts, the `_cf_KV` table, and a database integrity check. If any part is incomplete or inconsistent, stop before migration rehearsal.

## Required backup, migration and recovery sequence

### 1. Owner-designated preflight and backup

Use a dedicated staging CLI config provided or approved by the owner. The local `npx wrangler whoami` check reports that Wrangler is not authenticated in this environment, and no staging CLI config is present in the repository. Arrange an authenticated owner-controlled staging CLI environment before any future migration operation. Confirm the account, database name, database ID and `DB` binding immediately before the operation. The private preview and staging Worker must still reference the existing staging database. Do not use production IDs or the repository's zero-ID config.

Before migration:

1. Re-read the remote `sqlite_master`, row counts, latest `update_runs`, binding and Cron schedule. Stop on any schema or count drift from this plan.
2. Do not use `wrangler d1 migrations list --remote` as a read-only preflight. Wrangler initializes the migration table with `CREATE TABLE IF NOT EXISTS` before listing, which would write to staging when the table is absent. The absence was instead verified through read-only `sqlite_master` inspection. The local rehearsal showed all three migration files pending against that starting state. If the remote schema or counts differ from this plan, stop and revise it.
3. Export a full SQL backup to owner-controlled encrypted storage, outside the Git checkout, with restrictive permissions. Record UTC time, file size and SHA-256. Restore that exact dump into a new isolated D1 and confirm the baseline tables, indexes, constraints, `_cf_KV`, rows and counts before proceeding. If export, download, restore, integrity checks or checksum validation fail, stop; do not migrate or rehearse migrations against a row-level reconstruction.

Example commands, after substituting the owner-designated config and private backup directory:

```sh
umask 077
mkdir -p "$BACKUP_DIR"
wrangler d1 export frightertainment-staging-discovery \
  --remote --config "$STAGING_WRANGLER_CONFIG" \
  --output "$BACKUP_DIR/staging-before-0003.sql"
test -s "$BACKUP_DIR/staging-before-0003.sql"
sha256sum "$BACKUP_DIR/staging-before-0003.sql" \
  > "$BACKUP_DIR/staging-before-0003.sha256"
wrangler d1 execute frightertainment-staging-discovery \
  --local --config "$STAGING_WRANGLER_CONFIG" \
  --persist-to "$RESTORE_STATE_DIR" \
  --file "$BACKUP_DIR/staging-before-0003.sql"
```

Wrangler's remote D1 migration/export commands can make the database unavailable while operating. Schedule them after the existing 04:00 UTC run has completed. Do not pause or reschedule Cron without separate approval.

### 2. Migration application

After the full backup restore passes and the owner separately approves the migration, rerun the read-only preflight and backup checks. Then apply through Wrangler's migration system so it creates and populates its migration ledger consistently. Because the ledger is absent, this command is expected to initialize `d1_migrations` and apply all three files; both writes are included in the migration approval:

```sh
wrangler d1 migrations apply frightertainment-staging-discovery \
  --remote --config "$STAGING_WRANGLER_CONFIG"
```

Given the absent ledger, this is expected to apply `0001_initial.sql`, `0002_manual_sync_and_cinema_limits.sql` and `0003_explicit_film_year_and_review_provenance.sql` in order. Do not run a remote migration listing before the approved operation, apply only 0003 with ad hoc SQL, or manually edit `d1_migrations`. Afterward, verify the ledger with a read-only query such as `SELECT name, applied_at FROM d1_migrations ORDER BY id`.

### 3. Post-migration verification

Verify the migration ledger, exact film-year mapping, source provenance, unchanged row counts, zero unapproved critic reviews and three `NULL` release-only rows. Confirm `annual_ranking_snapshots` initially has no fabricated results. Then, under the separate Worker-deployment approval, deploy the updated staging Worker code while preserving its `DB` binding and `0 4 * * *` schedule, completing before the next scheduled run. On the next existing daily Cron, require an empty-but-valid 2024/2025/2026 snapshot with zero ranked positions and the matching pending-film counts. Confirm the API returns that snapshot and the update run succeeds. Do not label a scheduler calculation as a new critic-data acquisition.

### 4. Failure recovery

- If the backup cannot be restored and validated, stop before migration.
- If migration reports an error, stop, inspect the schema and migration ledger, retain logs and the original database, and do not blindly rerun.
- If post-migration validation fails, preserve the full pre-migration export and current database. Restore the export to a **new isolated D1 database**, verify its schema/data and request separate approval before changing any Cloudflare binding to it. Rebinding is a separate owner-approved operation; do not drop or overwrite the original staging DB as an improvised rollback.
- Retain the original export and the migrated database until the owner accepts recovery or post-migration validation.
- If the Worker upload or post-deploy verification fails, do not change the Cron or D1 binding. Restore the previously recorded Worker version/source through the owner-approved staging deployment path and verify its `DB` binding and schedule are unchanged. The additive database schema remains in place; do not attempt to undo migration with ad hoc `DROP` statements. The legacy Worker may not publish the new annual snapshots, so leave rankings pending until the updated Worker is successfully deployed and a scheduled run passes.

## Approval gates

The owner must separately approve:

1. Remote application of migrations `0001`–`0003` to the existing staging D1, only after a verified complete SQL backup restore and the checks above.
2. Deployment of the updated staging Worker script **after** migration verification and before the next daily Cron. This changes Worker code only; it must preserve the existing `0 4 * * *` schedule and current `DB` binding.
3. Any future Cron change or D1 rebind, if one is proposed. Neither is needed by this plan.

No production deployment, DNS change, paid provider activation or production database action is part of these approvals.
