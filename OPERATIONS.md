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

Cloudflare Pages emits internal Early Hints cache probes. Cloudflare documents that probe responses with HTTP 504 and a cache miss mean no Early Hint is cached for that URL; these probes do not reach the Pages project or affect visitors. In HTTP Analytics, classify requests using `requestSource`: `earlyHintsCache` with user agent `bastion early hints` or `nginx-ssl early hints` is internal probe traffic. Keep those counts visible for diagnostics, but exclude them from customer-impact alerts and public 5xx incident totals. Do not add synthetic Link headers just to change the probe status.

For visitor-impact monitoring, filter those probes out and review edge status, origin status, cache status, hostname, path and request source together. Any 504 with another request source warrants immediate investigation. Treat two visitor-source 5xx responses for the same hostname and route within five minutes as an incident at this site's current traffic. Include both `frightertainment.com` and `www.frightertainment.com` in each query and capture Ray IDs from individual request details when available; aggregate groups do not include Ray IDs.

Use UK-local midnight-to-midnight windows when comparing daily totals. The GitHub Actions `Website quality` workflow runs browser checks against a local server and is not production traffic or live monitoring. Cloudflare HTTP Analytics remains the production request source. After changes, compare matching host/path/request-source windows and response-time percentiles.

The incident query for 11 October 2026 (UK-local midnight-to-midnight) returned 300 504s, all with `requestSource=earlyHintsCache`, a cache miss and no origin HTTP status. The corresponding 12 October query through 08:45 UTC returned 121 with the same classification. Excluding `earlyHintsCache` left zero 504s in both windows. Keep the separately observed visitor-source 503 on `/api/contact` tracked as its own issue.
