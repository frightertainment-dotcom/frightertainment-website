# Licensed professional-review feed intake

## Current status

The ingestion adapter is implemented but **disabled**. No critic-score provider is contracted, licensed, credentialed or connected. It does not scrape Rotten Tomatoes, Metacritic, IMDb, publishers or review pages. The daily Worker only calls the adapter when its owner-managed enable and licence settings are explicitly set; absent configuration is a logged `skipped` run.

Imported rows are stored as pending editorial records. A provider cannot publish a score directly to the Fright Index. Corrections and withdrawals create a pending revision; an authorised editor must approve or reject each change. A provider outage is logged and leaves existing approved reviews and ranking history intact.

## Feed contract

The Worker makes a server-side HTTPS `GET` to the configured feed endpoint and sends a bearer credential from a Worker secret. The endpoint must return JSON with the configured `providerId` and a `reviews` array. Each review record must supply:

- `providerReviewId`: stable unique identifier from the provider.
- `filmId` and `filmYear`: exact canonical film identity and the source-verified film year.
- `criticId`, `criticName`, `publication`, `publicationUrl`, `reviewUrl`.
- `ratingKind: "numeric-professional-review"`, numeric `score`, and positive `scoreOutOf`.
- ISO `territory`, `publishedAt`, and `checkedAt`.
- `permissionCleared: true`, `professionalVerified: true`, and an HTTPS `permissionEvidenceUrl`.
- For a removal, `withdrawn: true`, the same stable provider identity, canonical film/year, review URL, and a check date.

The response is capped at 2 MB and 3,000 records. Redirects, non-HTTPS URLs, embedded URL credentials, unapproved hosts, malformed JSON, mismatched provider IDs, non-numeric score types, invalid territories/dates, unmapped film years, duplicate reviewers, and duplicate review identities are rejected or staged for editorial review. The Worker never trusts a provider's film title for a public canonical record.

Feed URL hosts must be an exact member of the configured comma-separated host allowlist. The configured feed URL cannot include a query string or fragment; pass credentials only in the Worker secret. The adapter refuses the default hostname, non-standard ports and redirects, which limits server-side request forgery risk. All credentials remain in Worker secret bindings.

## Owner setup after a provider contract is signed

Only after a commercial contract explicitly covers numeric critic-score reuse, territories, retention, corrections, caching and attribution:

1. Confirm the provider's API response can map its score to an original numeric critic rating. Aggregator positivity percentages, audience ratings and weighted aggregates are not accepted.
2. Configure non-secret Worker variables `REVIEW_FEED_ENABLED=true`, `REVIEW_FEED_LICENSE_APPROVED=true`, `REVIEW_FEED_PROVIDER_ID`, `REVIEW_FEED_URL` and `REVIEW_FEED_ALLOWED_HOSTS` with the contracted provider's exact HTTPS host.
3. Store its credential with `wrangler secret put REVIEW_FEED_API_KEY` in the intended private Worker environment; never put it in source, Pages variables exposed to clients, or a public workflow.
4. Apply migration `0003_explicit_film_year_and_review_provenance.sql` to the intended D1 database after taking a recoverable D1 export and reviewing the environment and ID. This migration has not been applied remotely by this branch.
5. Run the feed against the provider's authorised sandbox or a local test fixture, inspect the pending rows/revisions through the authenticated admin API, approve editorially, and confirm the ranking response and evidence links.

The feed runs as part of the existing daily `0 4 * * *` Worker job before ranking recalculation. Newly ingested records remain pending until editorial approval; the daily ranking calculation only reads approved, permission-cleared, numeric professional reviews attached to the exact verified film year. `GET /api/admin/provider-review-changes` lists pending provider corrections/withdrawals. `POST /api/admin/provider-review-changes/review` approves or rejects a revision and requires the existing `Authorization: Bearer ADMIN_TOKEN` secret. The admin routes are not a public editorial interface and have no cookie-based authentication.

## Last-good and audit behaviour

- New review events are validated before D1 writes, then inserted/staged in a batch.
- `provider_id` plus `provider_review_id` prevents repeated provider rows from duplicating an import.
- Canonical review URLs and the one-review-per-critic constraint prevent duplicate contributions.
- Changed or withdrawn provider rows are revision records; the existing score remains effective until an editor approves a correction/withdrawal.
- Failed provider responses create a failed `update_runs` event. They do not delete or replace approved scores.
- Each daily ranking run writes one atomic `annual_ranking_snapshots` payload alongside that date's positions. Movement compares against the previous valid snapshot date, not same-day reruns. The public ranking API serves the newest valid snapshot and falls back to an older valid snapshot as stale if the newest payload is corrupt.

An adapter and a passing contract test are not proof that a live feed is connected. Until the owner completes the licensing and credential actions above, the public 2026 ranking remains pending and the site shows source-verified unranked titles separately.
