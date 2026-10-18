# V2 implementation tracker — 18 October 2026

Allowed states: `NOT_STARTED`, `IN_PROGRESS`, `IMPLEMENTED_UNVERIFIED`, `VERIFIED_PREVIEW`, `BLOCKED_EXTERNAL`, `APPROVED_LIVE`. No V2 route is `VERIFIED_PREVIEW` or `APPROVED_LIVE` at this checkpoint. Owner: Frightertainment Codex project; the named developer/agent changes with the continuing cloud session. Latest implementation source: `pat/seven-concepts-20261013` at `c18f52b2da00f94d0f1d0fd8c47046f8649dffd6`, based on `7575829` before V2 commits.

| Surface | State | Work now / exact remaining verification |
| --- | --- | --- |
| Home | IN_PROGRESS | Film/chart before news; four supporting picks and a compact Cinema diary drawn from the date-safe, source-checked UK ledger. The five other editorial picks no longer overwrite Cinema from a static weekly file. Chart pending state exposes verified film links. Local 320/1440 captures and browser contracts. Still needs authenticated preview, genuine ranking data, accessibility/performance and media review. |
| Movies | IN_PROGRESS | Compact masthead, visible film title at 320, uncut synopsis, neutral fallback, responsive rearrangement fix and truthful generated film-file title cards. Still needs full archive journeys, posters, charts, all widths, hosted API and no-JS review. |
| TV Shows | IN_PROGRESS | Shorter series masthead, cold transmission palette and type-first editorial composition when official poster art is unavailable. At 320, the sourced series title ends at y=446, ahead of the dock at y=665; archive link opens the existing complete-discovery controls. Four local widths captured. Exact series art, broader catalogue, details and hosted review remain. |
| Cinema | IN_PROGRESS | Home's static Clayface note is replaced by a date-safe, month/priority-matched UK selection from `cinema-screenings.json`, with an evergreen no-JS/upstream-failure state. The Cinema route itself still needs a dedicated date/calendar, visual, territory and borderless pass. |
| Indie Movies | IN_PROGRESS | Shorter festival masthead, warm print palette, type-first sourced film content and an honest “viewer chart” label. At 320, Buddy ends at y=412 ahead of the dock at y=665; archive jump opens preserved controls. Duplicate source year removed. The 86-record archive, rights/media and hosted journeys need deeper work. |
| Podcasts | NOT_STARTED | Existing route and 9-record editorial subset audited. Creator-feed cover and listening-link audit required. |
| Games | NOT_STARTED | Existing route and 9-record subset audited. Cover/screenshot/developer/platform audit required. |
| Supporting routes, details, search, charts, 404 | IN_PROGRESS | Route inventory and local link check complete; no custom 404 found. Chart integrity, historical years, media detail and error states remain. |
| Shared typography and neutral media | IMPLEMENTED_UNVERIFIED | Preview/production builders use versioned repository-local SIL OFL fonts; first-party fallback art names the appropriate file/cover type. All seven local first views have zero failed font requests. Hosted font loads, CLS and full media rights remain. |
| Cancelled-product scope | IMPLEMENTED_UNVERIFIED | Existing source had no active references; V2 check now guards active source and preview/production bundle. Hosted old-route state remains unverified. Never revive as a streaming service or in the MOT. |
| Private preview / release | BLOCKED_EXTERNAL | Cloudflare reports successful preview deployment `b0ae123c-ad7c-4243-93ff-82297d88fdc5` for source `c18f52b`; branch/Access/D1 separation verified by API. Hosted browser access is blocked at the cloud CONNECT tunnel (403), before Access. Served page bytes and rendered hosted state are unverified. Live remains at `7575829`. |

## Work queue

1. Use the owner's existing authenticated **Local browser session** for the newest protected-preview deployment. Verify served SHA, all seven routes, fonts, posters, APIs and controls; record true hosted screenshots and console/network results. This cloud task cannot reach the host through its CONNECT 403 tunnel. Local Chromium is not a substitute.
2. Continue TV/Indie data/media/deep journeys; then make dedicated Podcasts, Games and Cinema passes and finish supporting routes. Re-run neighbouring pages after each pass. The Home Cinema note is now source-driven and expiry-safe; test it on the actual hosted bundle.
3. Perform resumable whole-catalogue/media backfill with the exact denominator in `COVERAGE_LEDGER.md`.
