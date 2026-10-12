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

## Closed 504 incident record — 12 October 2026

**Status: CLOSED — BENIGN CLOUDFLARE EARLY HINTS CACHE PROBES**

The 11 October 2026 UK-local day (10 October 23:00 UTC to 11 October 23:00 UTC) contained 300 edge 504 responses across `frightertainment.com` and `www.frightertainment.com`. Every response was `requestSource=earlyHintsCache`, a cache miss, and had no origin HTTP status. The request paths included both HTML routes and API paths; Cloudflare's Pages Early Hints probes do not execute the Pages project.

For 12 October, 121 probes were counted through 08:45 UTC (09:45 BST) in the earlier query. At the actual 08:45 BST boundary (07:45 UTC), the total was 119. Follow-up queries through 09:04:32 UTC found 12 additional probes. Across the examined windows, filtering out `earlyHintsCache` left zero visitor-source 504s. The requests affected both hostnames; the source and origin-status evidence was consistent across each.

This closure applies only to those queried historical windows. It does not classify future 504s as harmless. Investigate every future 504 whose request source is not `earlyHintsCache`. Grouped Analytics results do not contain Ray IDs; retrieve individual request details when a Ray ID is needed. Cloudflare Analytics is aggregated/retention-limited and does not establish who initiated a request.

## Contact-form 503 follow-up — 12 October 2026

One separate request to `/api/contact` returned a visitor-source 503 on 11 October at 04:07:16 UTC (Ray ID `a48aff36eb9beb19`). Cloudflare recorded `requestSource=eyeball`, origin status 503 and 49 ms origin response time. `eyeball` does not prove that the request came from a person.

The Pages handler returns 503 for missing delivery binding, failed mailer connection, non-2xx mailer response, or a malformed/unconfirmed success response. The private mailer can return 503 for a missing email binding, an email-service rejection, or no acceptance identifier. Production configuration has the Pages-to-mailer service binding and the mailer `send_email` binding. Cloudflare's invocation aggregate recorded one successful Worker execution with no runtime exception. That metric does not reveal which HTTP response was returned or whether the email service accepted the message.

A separate owner-labelled contact delivery test reached Gmail at 03:59 UTC, eight minutes before the 503. Gmail has no matching message at 04:07 UTC. This does not prove the failing request never submitted email: the historical Worker event logs contain no event for that invocation, and no message identifier is available to query Cloudflare Email Service. The 04:07 delivery outcome and the exact 503 branch therefore remain unverified. No production form message was sent during this investigation. No further visitor-source `/api/contact` 5xx was found from the incident through the 12 October Analytics query time. The 503 remains a separate unresolved diagnostic item; do not infer a delivery failure or success from the Worker invocation status alone.

## Request classification and monitoring procedure

For each report, keep these categories separate:

- **Early Hints probes:** keep a separate diagnostic count for `requestSource=earlyHintsCache`; exclude it from visitor-facing 5xx counts and rates.
- **Visitor-source HTTP requests:** report `requestSource` exactly as Cloudflare provides it. A value such as `eyeball` is not evidence of a human visitor. Use Cloudflare bot classification when it is available; otherwise label the source unclassified.
- **Page requests and APIs:** group by hostname, path, edge status, origin status, request source and timestamp. A browser page load may create multiple HTML, asset and API requests; do not treat request counts as visits.
- **Visits and browser tests:** report Cloudflare-defined visits/page views separately from HTTP request totals. Correlate owner/QA checks with GitHub Actions, preview deployment and test timestamps. The existing Playwright workflow tests a local server; it does not create production traffic.
- **Cloudflare Access:** report expected authentication/denial statuses such as 401/403 separately from application 5xx. Confirm the host and policy context before calling a denial an outage.
- **Application failures:** for genuine 500/502/503/504 responses, compare edge and origin status, request source, hostname/path, cache status and response duration. Capture Ray IDs from individual request details where available.

Report both the absolute non-probe 5xx count and its rate over non-probe HTTP requests for the same host, path and interval. Keep the numerator and denominator definitions identical between comparisons. At this site's current scale, investigate any visitor-source 504 immediately and treat two visitor-source 5xx responses on the same hostname and route within five minutes as an incident. Compare matching time windows before and after deployments; do not call an unverified request human traffic.

**Alerting status:** the Cloudflare account currently has no alert policies. This runbook and HTTP Analytics provide manual monitoring; automated notifications are not configured. Do not add a broad 5xx alert that counts Early Hints probes. A future automated alert needs a verified `requestSource` exclusion, an appropriate request-rate denominator, a tested route/host grouping and an authorized notification destination. A GitHub Actions monitor would also require a least-privilege Cloudflare Analytics credential stored as a repository secret; neither that secret nor an external notification destination was added here.
