# V2 baseline — 18 October 2026

Goal: [GOAL.md](GOAL.md). Source baseline: canonical `frightertainment-dotcom/frightertainment-website` at `7575829c3719f3e9fcb0d7637681bf69f4323b72` (`origin/main` when inspected). The local work branch was fast-forwarded from `c0ad668` to that SHA before changes. No `AGENTS.md` was found in the checkout or `/workspace`. Node 24.19.0, npm 11.9.0, `package-lock.json`, Chromium in `/usr/bin/chromium`, and Playwright 1.64.1 are available. The package requires Node 22+.

## Actual environment and release boundary

- Cloud workspace: `/workspace/frightertainment-website`, `CODEX_ENVIRONMENT_ID=ccarenv_b64_Y2NhcmVudl8xZjI0ODRjNGJhZTA4MTkxOGIwMTc2MmRkMDgxYTE1NQ`.
- Cloudflare account/project inspection on 18 October: `frightertainment-private-preview` is Git connected to the canonical repo, uses `npm run build:preview`, allows preview deployments from `pat/seven-concepts-20261013`, and has a wildcard Pages Access application with an allow-members policy. Its preview `DB` binding points to `frightertainment-staging-discovery`.
- `frightertainment-live` is a separate project with a different `DB` binding (`frightertainment-production-discovery`). It serves `main` commit `7575829` as successful production deployment `74837293-03a3-4bbb-8e3c-82a9c65fd0d7` according to the Cloudflare API. **Production deployments are currently enabled**, unlike older repository notes. No live changes were made.
- The private-preview project's current `main` deployment is idle. Its newest 18 October preview events on an unlisted branch were also idle. The most recent success found in a bounded scan was an older `pat/premium-horror-art-direction-20261014` preview, not this V2 work. Protected preview rendering is **unverified**: this workspace's HTTP tunnel returns 403 before reaching both preview and live hosts, and no authenticated Access browser session is available here. Cloudflare API deployment metadata is not a rendered-page test.
- `gh pr list` / GitHub REST returned 403, so current PR state remains unverified. `git ls-remote` and fetch verified the branch tips. `pat/seven-concepts-20261013` was an ancestor of current `main` before this work; it is the continuing preview-allowed branch. Do not push to `main`.
- The supplied Site Manager Skills v5 and Mastery Evidence v5 files and prior brief were not present in the attachments or workspace. Existing `docs/evidence/` contains older visual feedback; it is historical context, not current hosted proof.

## Route and data inventory

| Surface | Source / generator | Baseline count or state |
| --- | --- | --- |
| Seven primary routes | `index.html`, `movies.html`, `tv-shows.html`, `cinema.html`, `indie-movies.html`, `podcasts.html`, `games.html`; shared `v5-magazine.js`, `hub.js`, `fr-polish.css` | All 7 returned 200 from the local preview bundle at 320 and 1440 CSS px; seven links in each primary nav. |
| Movies vault and detail | `all-horror-movies.html`, `archive-film.html`, `film.html`, `media.html`, `films/<id>/`; `horror-archive.js`, `data/archive/*`, `scripts/build-pages.mjs` | 9,772 unique QID archive films across 128 year labels; 900 enriched profiles (9.2% of archive); 24 generated manual film details. This is not a 24-film archive. |
| Annual charts | `top-20/`, `top-20/2023` through `2027`, `hub.js`, `v5-magazine.js`, Pages Functions/Worker | 5 generated year routes. Read-only staging and production D1 queries each found **0 critic reviews and 0 rank-history rows**. A complete Fright Rating Top 20 is not established. |
| Indie | `indie-movies.html`, `data/indie-archive.json`, `scripts/build-indie-index.mjs` | 86 source records in the indie archive; 9 additional editorial records. |
| TV, Podcasts, Games | `data/editorial.json`, `catalogue.js`, `podcasts.js`, `games.html`, Pages Functions | 8 TV, 9 podcast and 9 game editorial records in the repository. These are editorial subsets, not whole provider catalogues. Eight game records have a Steam widget ID; this is not cover-art verification. |
| Cinema | `cinema.html`, `cinema-diary.js`, `data/cinema-screenings.json`, `release-calendar.js` | Country/date logic and fixtures present; hosted API, current screenings and territory accuracy still require live preview review. |
| Supporting routes | `frightnews.html`, `contact.html`, `credits.html`, `privacy.html`, generated ranking/film pages, API routes in `functions/api/` | 45 HTML pages checked by local link checker; no dedicated custom 404 page located. Search, filters, watchlist, modal/consent, trailer and chart states require separate functional QA. |
| Active cancellation scope | Root HTML/JS/CSS, `data`, Functions, Worker, generated HTML, `_redirects`, sitemap and local preview bundle | No active FrightWatch/FrightScreen reference found; local `/frightwatch` and `/frightscreen` returned 404. Hosted old-route behaviour is unverified and production redirects were untouched. |

The read-only D1 census found staging: 20 canonical films, 0 critic reviews, 589 dataset snapshots, 0 rank history, 0 FrightNews articles. Production: 0 canonical films, 0 critic reviews, 1,048 dataset snapshots, 0 rank history, 203 FrightNews articles. `changed_db=false` and `rows_written=0` were reported for these queries. Dataset snapshots are not a substitute for an audited full catalogue.

## Reproducible rendered baseline

Run `npm ci`, `npm run build:preview`, serve `dist/` on port 4173, then `PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium node scripts/capture-premium-overhaul.mjs before`. Capture time: 13:59 UTC. [Raw observations](evidence/before/observations.json) and [first/full screenshots](evidence/before/) are **headless local Chromium against the built preview bundle**, not hosted Pages or physical-device evidence. The script captured all seven first viewports at 320 and 1440, plus Home/Movies full pages. Browser requests to Google Fonts failed with `ERR_TUNNEL_CONNECTION_FAILED`; local source and assets loaded. Local static serving has no Pages API; unavailable rankings/posters here do not prove hosted failure. No horizontal document overflow was measured at these two widths.

| Severity | Observed issue and evidence | Acceptance test |
| --- | --- | --- |
| P1 | Home news preceded the film pick and chart, consuming the 320px first fold. [Before Home 320](evidence/before/home-320-first.jpg), [1440](evidence/before/home-1440-first.jpg), `index.html`. | Pick and chart before news in DOM/visual order; sourced feature visible above mobile dock. |
| P1 | Movies' large masthead/links left the editorial film mostly below the 320px first fold. [Before Movies 320](evidence/before/movies-320-first.jpg), `movies.html`, `fr-polish.css`. | Film title readable above dock at 320; archive/year links still work; no horizontal overflow. |
| P1 | The neutral fallback card broke “Nosferatu” midword at desktop. [Before Movies 1440](evidence/before/movies-1440-first.jpg), `editorial-spotlight.mjs`. | Correct neutral title treatment with no false official poster and no midword split. |
| P1 | Current seven-route first views share closely repeated empty mastheads/fallback imagery; TV, Indie, Podcasts and Games show generic poster-unavailable title cards locally. [Seven 320 captures](evidence/before/). | Dedicated art-direction, media and responsive pass per section with identity/rights checks in protected preview. |
| P1 | Source coverage is uneven: 9,772 archive films, 900 enriched profiles, 24 manual details; no directly permission-documented posters in the 24 manual records. [Media census](media-coverage.json). | Resumable ID-first artwork/metadata audit by year; report verified rendered media, not field presence alone. |
| P1 | Home's local chart was unavailable and large; both reachable D1 databases have 0 approved critic reviews. [Before Home full](evidence/before/home-320-full.jpg), `hub.js`. | Honest partial/pending state with verified film links; never label an empty set a complete rated Top 20. |

Inherited issues are those present at baseline SHA. This slice adds its own regression tests; any new failures after the slice are tracked separately in `QA_MATRIX.md`. Older owner screenshots in `docs/evidence/owner-feedback-2026-10-14/` show the prior design direction but were not treated as current hosted state.
