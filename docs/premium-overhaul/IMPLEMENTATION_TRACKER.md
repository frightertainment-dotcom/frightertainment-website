# V2 implementation tracker — 18 October 2026

Allowed states: `NOT_STARTED`, `IN_PROGRESS`, `IMPLEMENTED_UNVERIFIED`, `VERIFIED_PREVIEW`, `BLOCKED_EXTERNAL`, `APPROVED_LIVE`. No V2 route is `VERIFIED_PREVIEW` or `APPROVED_LIVE` at this checkpoint. Owner: Frightertainment Codex project; the named developer/agent changes with the continuing cloud session. Latest implementation source: `pat/seven-concepts-20261013` at `c18f52b2da00f94d0f1d0fd8c47046f8649dffd6`, based on `7575829` before V2 commits.

| Surface | State | Work now / exact remaining verification |
| --- | --- | --- |
| Home | IN_PROGRESS | Film/chart before news; four supporting picks and compact Cinema diary; chart pending state exposes verified film links, including an empty TMDB response. Local 320/1440 captures and browser contracts. Still needs authenticated preview, genuine data, all widths, accessibility/performance and media review. |
| Movies | IN_PROGRESS | Compact masthead, visible film title at 320, uncut synopsis, neutral fallback, responsive rearrangement fix and truthful generated film-file title cards. Still needs full archive journeys, posters, charts, all widths, hosted API and no-JS review. |
| TV Shows | NOT_STARTED | Existing route audited visually at 320/1440. Dedicated series art/data and responsive pass required. |
| Cinema | NOT_STARTED | Existing route and seven-nav identity audited locally. Dedicated UK/territory/date/calendar pass required. Home's new Clayface diary note has a 23 October 2026 date; replace its static selection with source-driven expiry before that date passes. |
| Indie Movies | NOT_STARTED | Existing route and 86-record source count audited. Dedicated archive/media/layout pass required. |
| Podcasts | NOT_STARTED | Existing route and 9-record editorial subset audited. Creator-feed cover and listening-link audit required. |
| Games | NOT_STARTED | Existing route and 9-record subset audited. Cover/screenshot/developer/platform audit required. |
| Supporting routes, details, search, charts, 404 | IN_PROGRESS | Route inventory and local link check complete; no custom 404 found. Chart integrity, historical years, media detail and error states remain. |
| Shared typography and neutral media | IMPLEMENTED_UNVERIFIED | Preview/production builders use versioned repository-local SIL OFL fonts; first-party fallback art names the appropriate file/cover type. All seven local first views have zero failed font requests. Hosted font loads, CLS and full media rights remain. |
| Cancelled-product scope | IMPLEMENTED_UNVERIFIED | Existing source had no active references; V2 check now guards active source and preview/production bundle. Hosted old-route state remains unverified. Never revive as a streaming service or in the MOT. |
| Private preview / release | BLOCKED_EXTERNAL | Cloudflare reports successful preview deployment `b0ae123c-ad7c-4243-93ff-82297d88fdc5` for source `c18f52b`; branch/Access/D1 separation verified by API. Hosted browser access is blocked at the cloud CONNECT tunnel (403), before Access. Served page bytes and rendered hosted state are unverified. Live remains at `7575829`. |

## Work queue

1. Get an authorised browser path to deployment `b0ae123c-ad7c-4243-93ff-82297d88fdc5` and inspect served SHA, all seven routes, fonts, posters, APIs and controls; record true hosted screenshots and console/network results. The local Chromium suite is 243/243, not a substitute.
2. Replace Home's static 23 October 2026 Cinema note with a source-driven/expiry-safe choice, then make dedicated TV and Indie passes, followed by Podcasts/Games and Cinema supporting routes. Re-run neighbouring pages after each pass.
3. Perform resumable whole-catalogue/media backfill with the exact denominator in `COVERAGE_LEDGER.md`.
