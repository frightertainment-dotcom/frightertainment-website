# Discovery feed operations

## Safe activation prerequisites

Do not set a provider's approval flag or credential until the account owner has accepted the commercial terms for this exact publication and territory. Provider routes are inert when those approval variables and Worker secrets are absent. Browser JavaScript never receives provider credentials.

The live MovieGlu showtime endpoint is uncached by design. It requires a current license, API headers and `CINEMA_RATE_LIMIT_SALT`; without the salt, requests fail closed. It allows at most 10 lookups per salted client digest per minute. Raw client IPs are not stored. A daily job removes old digest rows. Watchmode requests are made only for editorially approved horror records with an explicit Watchmode ID; one release-calendar query is used per territory. Recheck account quotas and plan terms before adding title-by-title availability fan-out. TMDB discovery and trends stay disabled until commercial permission and required attribution are approved.

## Check a failed update

1. Check Worker observability logs for `refresh_failed_last_good_retained`, `ranking_snapshot_failed`, or `weekly_discovery_failed` and note the task, country, timestamp and sanitized provider status.
2. Inspect recent runs in D1: `SELECT task,country_code,status,started_at,error_code,error_message FROM update_runs ORDER BY started_at DESC LIMIT 50;` Use `wrangler d1 execute frightertainment-discovery --remote --command "..."` only in the owner's approved account and after checking the selected database.
3. Inspect the current pointer and snapshot freshness: `SELECT c.kind,c.country_code,s.snapshot_id,s.checked_at,s.updated_at,s.expires_at FROM current_datasets c JOIN dataset_snapshots s USING(snapshot_id) ORDER BY c.kind,c.country_code;`. A failed fetch does not change `current_datasets`; keep serving the last valid snapshot with its stale status.
4. Correct the provider outage, quota, permission, source mapping or secret problem. Do not hand-edit a public payload to make the panel appear current. Verify the source contract and country before retrying through the next scheduled run.
5. Confirm a new `published` run, expected territory, item mappings and freshness. If the next run still fails, keep the prior snapshot, record the owner escalation and leave the panel marked stale/unavailable.
6. For questionable weekly discoveries, inspect `/api/admin/review-queue` using `ADMIN_TOKEN`. Approval of a discovery candidate is separate from adding verified source claims and provider mappings to a canonical film record.

Snapshots are immutable and their current pointers move only after dataset validation succeeds. Do not delete the last good snapshot during incident cleanup. Before any owner-authorized manual pointer repair, export the current pointer and verify the target snapshot JSON, country and source provenance.

## Manual film claims

Run `npm run sync:manual-films` first. It prints the record ids, claim counts and hashes without sending data. Review the actual `data/movies.js` diff and source URLs; do not use an API refresh to overwrite editorial claims. An owner can then pass `--apply` with process-only `FR_API_BASE` and `ADMIN_TOKEN` values. The server only accepts the six existing film IDs and their approved source shape. First sync preserves their pre-existing editorial approval; a changed record receives a new immutable version with `pending-review` status. Review every changed claim against its cited primary source, territory and date, then use the protected manual-film change approval endpoint. The approved static pages remain the public source until a separate reviewed website build is generated.

Automatic refresh is limited to licensed territory-level showtimes, streaming availability and release rows associated with an approved canonical film and exact provider ID. Film identity, horror classification, festival/film/release-year distinctions, synopsis, cast and crew, trailer identity, artwork rights, release path labels and critic scores require review. Automated ranking calculation only recomputes from approved numeric critic rows; it does not acquire reviews. Keep the annual rank in pending state until at least three distinct professionals' numeric ratings are individually verified and cleared for reuse.

## Review artifacts

The GitHub Actions `Website quality` workflow runs content validation, unit/provider contract tests, Chromium layout/navigation checks, Wrangler dry-run validation and local D1 migrations. Browser screenshots and traces are attached as `browser-review` workflow artifacts. A green test run covers fixtures and the disabled integration state; it does not prove that a real licensed provider account, production Worker binding, commercial feed, quota or live source coverage is available.


## 504 incident monitoring and response

Cloudflare HTTP Analytics is the live request monitor for both production hostnames. Review edge status, origin status, cache status, hostname and path together. A `504` with origin status `0` and a cache miss means Cloudflare returned the error before it received an HTTP response from Pages; it does not, by itself, name the stalled Pages component. Use UK-local midnight-to-midnight windows when comparing daily totals, and compare edge and origin status separately.

Treat two 5xx responses for the same hostname and route within five minutes as an incident at this site's current traffic. Any 504 on the homepage or repeated 504s across static pages and API routes warrants immediate investigation even if the absolute count is low. Include both `frightertainment.com` and `www.frightertainment.com` in every query. Capture available Ray IDs from individual request detail views when investigating a specific request; aggregated Analytics groups do not include per-request Ray IDs.

The `Website quality` GitHub Actions workflow validates the protected preview bundle, API fixtures, content checks and representative browser flows for each pull request. Its browser server is local to the runner; those runs are not live production monitoring and should not be counted as visitor traffic. Cloudflare Analytics remains the production 5xx source. After any release, compare the same route/host error counts and response-time percentiles before and after over matching UK-local windows.

Request-triggered TMDB refreshes run through Pages `waitUntil`. A cold cache returns an explicit 503 while the cache warms; a previously verified stale snapshot is served with its stale state. A genuine provider error remains an error in logs and is never presented as fresh data. Repeated requests for the same dataset share a refresh within one Worker isolate; each TMDB refresh has a 20-second total deadline and each provider call retains its 12-second timeout.

## Incident preview isolation

The 504 repair branch is tested in the `frightertainment-private-preview` Pages project. Its deployment is protected by the existing Cloudflare Access wildcard for `*.frightertainment-private-preview.pages.dev`, which allows only the owner email. The preview uses the staging D1 database; production deployments are disabled in that project. Keep incident branches explicitly listed in its custom preview branch allowlist and remove them when review is complete. Do not enable preview builds on `frightertainment-live` to test this repair.
