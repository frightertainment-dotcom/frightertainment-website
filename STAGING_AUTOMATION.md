# Frightertainment staging automation and editorial operations

Read-only Cloudflare status verified on **9 October 2026**. This describes the private preview and staging Worker only. It does not describe a production deployment or an approved commercial data feed.

## Verified staging components

- Cloudflare Pages project: `frightertainment-private-preview`. At the latest read-only check (9 October 2026), its production branch was `main`, and the private preview was limited to `codex/frightertainment-v1` behind Cloudflare Access. The accepted preview deployment is commit `7cab14313ae466c8330db53cb66df960bcbe8b66`. Production deployment settings were not changed.
- Pages Function API requests use the `frightertainment-staging-discovery` D1 binding in preview. The separate deployed Worker `frightertainment-staging-daily` has `workers.dev` disabled and runs `0 4 * * *` (daily at 04:00 UTC). A read-only binding check on 9 October confirmed it points to the same staging D1 ID as the Pages preview. Its deployed source is still the older `release_year`/`rank_history` calculation; it does not read `film_year` or write `annual_ranking_snapshots`. It does not acquire critic reviews.
- Read-only D1 queries on 9 October 2026 confirmed 20 rows in `canonical_films`, all flagged horror-verified/editorially approved, including 10 with `release_year=2026`; `critic_reviews` has 0 rows, `rank_history` has 0 rows and `dataset_snapshots` has 0 rows. The 04:00 UTC scheduled run completed with `status='published'` at `2026-10-09T04:00:48.518Z` and no error code. This was the deployed legacy scheduler's successful empty calculation, not a populated ranking or provider refresh; it does not verify the new film-year scheduler.
- The repository's `wrangler.jsonc` describes a separate local Worker named `frightertainment-discovery` and uses an all-zero D1 ID placeholder. It is not the deployed staging Worker and is not deployable as configured. Do not replace the placeholder or point local work at a production database without owner action.
- Weekly archive/profile workflows are defined in GitHub Actions. Their scheduled runs are conditioned on the default branch, so their schedules are not active from this development branch. A manual or branch push run is not proof of the scheduled production job.

### Ranking schema and scheduler compatibility

On 9 October 2026, read-only Cloudflare D1 inspection found the expected `0001`/`0002` application tables, but no `d1_migrations` ledger, no `film_year` columns and no `annual_ranking_snapshots` table. Cloudflare's API reported `changed_db=false` and `rows_written=0` for the inspection. The Pages preview and separate staging Worker point to the same D1 ID, so no binding correction is indicated.

The deployed Worker is not compatible with the post-0003 snapshot contract: it groups by territory `release_year` and writes `rank_history`. If that code continues after 0003, it will not create snapshots read by the updated ranking API. The repository now has shared snapshot calculation code used by the API Worker and `worker/staging-rankings.js`; the scheduler checks migration readiness, uses only verified `film_year`, writes empty snapshots, and commits each snapshot with its success log atomically. The staging sequence is migration and verification first, followed by a separately approved Worker code deployment before the next daily run. Its existing `0 4 * * *` schedule and `DB` binding are already correct; changing either is unnecessary.

Read-only `sqlite_master` inspection on 9 October confirmed the nine application tables and six named indexes match the definitions in migrations 0001 and 0002, including their declared keys, foreign keys, uniqueness and `CHECK` constraints. The internal `_cf_KV` table is platform-managed and is not application data. The full-export endpoint completed an export, but this environment's proxy returned HTTP 403 for its signed download URL. No complete SQL file, checksum or full-dump restore was obtained. The migration rehearsal is therefore blocked; the earlier logical restore was not a full backup and must not be treated as one. The new scheduler log now reports a run-level `failed` status when every annual snapshot fails and `partial` when at least one year publishes and another fails; this code has not been deployed. See `STAGING_MIGRATION_0003_PLAN.md` for the stop condition, owner-controlled backup setup, recovery sequence and required owner approvals.

The remote `d1_migrations` ledger is absent. In a restored local copy with the same existing application schema, Wrangler reported all three migration files (`0001`–`0003`) as pending. Applying that full set locally succeeded: `0001` and `0002` were idempotent against the existing schema, then `0003` added and backfilled the new fields. Remote migration application remains owner-gated. Do not assume `0003` is the only pending migration or manually create/edit a remote migration ledger.

The isolated local scheduler run created honest empty snapshots for 2024, 2025 and 2026, with 3 / 7 / 7 eligible films respectively listed separately as awaiting reviews and zero ranked positions. The three 2026 territory-release-only records remained `film_year=NULL`. A fault-injected snapshot batch left the prior snapshots intact, logged the failed runs, and succeeded after the injected failure was removed. The API then read the resulting pending 2026 snapshot from the same local D1 copy. These prior tests used a logical row reconstruction, not a full export; they do not satisfy the newly requested full-backup migration rehearsal. No remote migration or scheduler write was performed.

### 2026 film-year reconciliation

The staging count of 10 refers to approved canonical rows whose `release_year` field held a 2026 territory/release year. A read-only D1 query on 9 October matched their canonical IDs, titles and source records against the public catalogue. Seven identities agree exactly and each has a separate, source-backed `film_year=2026` claim: `28-years-later-bone-temple` (28 Years Later: The Bone Temple), `backrooms` (Backrooms), `insidious-out-of-the-further` (Insidious: Out of the Further), `ready-or-not-2` (Ready or Not 2: Here I Come), `scream-7` (Scream 7), `send-help` (Send Help) and `victorian-psycho` (Victorian Psycho). The other three records are `crawlers`, `clayface` and `werwulf`: their 2026 dates are territory-specific release dates, with no verified film-year claim, so migration 0003 deliberately leaves `film_year` null. `Other Mommy` has territory-specific 2026 dates in the public catalogue but was not one of the 20 staging canonical records. No title was added to close either count. The public chart therefore has seven verified 2026 film-year records, zero qualifying critic-reviewed films and no numbered ranking positions.

## Ranking integrity and provider status

The public-facing 2026 chart remains pending until each film has at least three distinct eligible professional numeric critic reviews whose identity, publication, primary source, dates and reuse permission are verified and approved. D1 currently has no review rows, so there are no ranked films, no prior positions and no valid ranking movements. The 20 canonical staging records must not be described as 20 rated films.

No licensed unattended critic-review feed is connected. The deployed staging Cron calculates eligible ranking data already in D1; it does not scrape critic websites or fetch ratings. There are also no activated licensed MovieGlu cinema/showtime, Watchmode streaming, or TMDB discovery/trending feeds. Empty and pending states are the correct public presentation until rights, accounts and credentials are approved.

Before any provider is enabled, obtain written permission for the intended commercial site and territories, confirm attribution/cache/retention rules and quotas, add only server-side secrets, verify exact canonical ID mappings, and test a complete valid feed plus failure recovery. No account, licence, credentials or paid integration is activated by this work.

## Owner setup before production activation

1. Secure permission-cleared critic score data (a licensed feed or individually evidenced numeric reviews) and document the applicable reuse rights. Do not scrape Rotten Tomatoes, IMDb, Metacritic or publisher sites.
2. Approve commercial terms for each intended availability or discovery provider and territory. See `API_LICENSING.md` for the provider review and cost references.
3. Provision a separate production Worker and D1 database, apply migrations, verify bindings and access policy, and configure production secrets through Cloudflare. Keep the preview database separate. Do not use the local zero UUID as a real database ID.
4. Configure only licensed countries, provider credentials, attribution notices, quota controls and approved film/provider mappings. Do not enable poster or other artwork fields without separate usage rights.
5. Run and observe the production job, verify the source timestamp and last-good behavior, then separately authorize any production deployment. A successful staging Cron run is not proof of production execution.

## Validation and troubleshooting

For local checks, run `npm run validate:worker`, `npm run worker:migrations:local`, `npm test` and `npm run test:browser`. Wrangler dry-run validation does not deploy. The local migration command uses local state and does not modify Cloudflare resources.

For an owner-authorized staging or production incident, inspect Worker observability logs and recent `update_runs` rows. Useful read-only D1 queries include:

```sql
SELECT COUNT(*) AS film_count FROM canonical_films;
SELECT COUNT(*) AS review_count FROM critic_reviews;
SELECT task, status, started_at, error_code
  FROM update_runs ORDER BY started_at DESC LIMIT 20;
SELECT release_year, COUNT(*) AS ranked_rows, MAX(ranked_at) AS latest_ranked_at
  FROM rank_history GROUP BY release_year ORDER BY release_year DESC;
```

Do not manually edit a public payload or delete a last-good snapshot to make a panel look current. For provider-backed data, a failed refresh must keep the previous valid snapshot and report its stale state. New horror discovery candidates require editorial review before publication. Review changes to film claims source-by-source; do not silently rewrite historical evidence.
