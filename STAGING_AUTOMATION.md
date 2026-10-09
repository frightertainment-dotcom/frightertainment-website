# Frightertainment staging automation and editorial operations

Read-only Cloudflare status verified on **9 October 2026**. This describes the private preview and staging Worker only. It does not describe a production deployment or an approved commercial data feed.

## Verified staging components

- Cloudflare Pages project: `frightertainment-private-preview`. Its production branch is `main`, production deployments are disabled, and preview deployments are enabled for `codex/frightertainment-v1`. Cloudflare Access protects the preview. The latest successful preview deployment observed during this review was built from the branch's starting commit `a8f7b78` at 07:18 UTC on 9 October 2026. A new push to the branch triggers another preview deployment. This task therefore must not push its changes or update PR #1 with a new head until the owner authorizes that deployment.
- Pages Function API requests use the `frightertainment-staging-discovery` D1 binding in preview. The separate deployed Worker `frightertainment-staging-daily` has `workers.dev` disabled and runs `0 4 * * *` (daily at 04:00 UTC). It is bound to the same staging D1 and calculates rankings from already approved reviews; it does not acquire critic reviews.
- Read-only D1 queries on 9 October 2026 confirmed 20 rows in `canonical_films`, all flagged horror-verified/editorially approved, including 10 with `release_year=2026`; `critic_reviews` has 0 rows, `rank_history` has 0 rows and `dataset_snapshots` has 0 rows. The 04:00 UTC scheduled run completed with `status='published'` at `2026-10-09T04:00:48.518Z` and no error code. This was a successful empty ranking calculation, not a populated ranking or a provider refresh.
- The repository's `wrangler.jsonc` describes a separate local Worker named `frightertainment-discovery` and uses an all-zero D1 ID placeholder. It is not the deployed staging Worker and is not deployable as configured. Do not replace the placeholder or point local work at a production database without owner action.
- Weekly archive/profile workflows are defined in GitHub Actions. Their scheduled runs are conditioned on the default branch, so their schedules are not active from this development branch. A manual or branch push run is not proof of the scheduled production job.

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
