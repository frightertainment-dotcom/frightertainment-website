# Frightertainment website · Version 1

A responsive Frightertainment horror discovery hub. The compact homepage previews verified film information, annual charts, TV recommendations, independent horror, podcasts and games. Each category has its own page.

## Preview and checks

Requires Node.js 22 or newer and Python 3.

```sh
npm run build:pages
npm run check
npm run serve
```

Open <http://localhost:8080>. Use a local server to test clean `/films/<id>/` pages and navigation.

## Film records

Edit `data/movies.js`. The six film titles and the displayed details now have claim-level source records. Each `claims` entry includes `field`, `label`, `value`, `sourceName`, `source`, `territory` and `checked` (`YYYY-MM-DD`). Store theatrical dates as ISO dates only where the primary source supports both the date and territory. Keep festival years and film years separate from territory-specific theatrical dates. The pages show each source, the territory scope and check date next to its supported claim.

For information not present in the source, omit the claim. The interface identifies a missing exact release date or territory rather than filling the gap. The records do not contain critic scores or promotional posters. An official trailer is added only when its exact video ID, official upload channel and primary source are verified.

Reviews must link to the primary review and include `source`, `score`, `outOf`, `display`, `type`, `url`, `checked`, `territory` and `permission`. Scores are normalized to /100, equally weighted, averaged and rounded to the nearest whole number. Audience ratings are excluded. If score reuse permission is unclear, link the review without copying its score.

Only add poster artwork when source, credit and `posterPermission` are documented. Image search does not grant republication rights. The content checker rejects artwork without those fields.

After editing records, regenerate static detail pages and the sitemap, then validate:

```sh
npm run build:pages
npm run check
```

The checker validates claim completeness, source URLs, territory/date scopes, checked dates, media/review gates, mobile navigation markup on every page, generated detail content, sitemap entries and local asset paths. Review the site at desktop and mobile widths and test keyboard navigation and links before publishing.

## Site files

- `index.html` — publication home, film listings, filters, score method, trailer status and horror TV and podcast recommendation sections.
- `films/<id>/index.html` — generated source-linked detail page for each film.
- `editorial-standards.html` — verification, rights and scoring policy.
- `data/movies.js` — hand-edited claim-level film evidence.
- `assets/` — original supplied brand and series images. Directory case is intentionally lowercase and must stay that way.
- `scripts/build-pages.mjs` — generate film pages and `sitemap.xml`.
- `scripts/check-content.mjs` — validate evidence and generated files.
- `robots.txt`, `sitemap.xml`, `_headers` — crawl and host guidance.

## Branding and rights

The supplied artwork moved from `Assets/` to `assets/` without image edits or recompression; SHA-256 hashes match the original Git blobs. Legacy series artwork remains archived in assets/ but is not displayed or promoted on the site. No Frightertainment productions, premieres or screening programmes are announced.

## Hosting

Static files publish from the repository root after editorial and rights review. Canonical metadata still targets `https://www.frightertainment.com/`; the public domain and hosting have not been verified or changed here. No Cloudflare or DNS settings are managed by this project.

## Automated Horror Discovery (prepared, not activated)

The site now includes homepage panels for annual Top 20 rankings, actual cinema showtimes, recent theatrical release dates, streaming availability, coming soon and weekly trending horror. Country-specific feed data is shown with source links and freshness. Manually curated horror TV and podcast recommendations and the six-film watchlist remain separate from automated feeds.

Annual pages are generated for the current year, three prior years and the next year by `scripts/build-pages.mjs`; rebuilding in a later year extends the sequence. `/top-20/` is the archive. Public rankings are computed from approved, permission-cleared numeric professional critic reviews. The methodology uses one contribution per critic, an equal-weight average normalized to /100, nearest-integer rounding and a minimum of three distinct critics. Unsupported or insufficient data remains pending.

The Worker in `worker/` provides a scheduled ingestion pipeline, D1 snapshots, country-scoped API, ranking history, candidate review queue, protected editorial endpoints and live no-store showtime lookup. Daily Cron refreshes feed snapshots and rankings; a weekly Cron adds unapproved horror discovery candidates to the review queue. Failed provider refreshes preserve the previous valid snapshot and are logged. The client geolocation is used only for a visitor-requested, live showtime query.

### Local Worker and quality checks

Requires Node.js 22 or newer. No API accounts, licences, secrets or Cloudflare setup are required to run the checks.

```sh
npm install
npm run build:pages
npm run check
npm test
npm run test:browser
npm run validate:worker
npm run worker:migrations:local
```

`npm run validate:worker` is a Wrangler dry run, not a deploy. Synthetic fixtures live only under `test/fixtures/` and are loaded only by automated tests; they are never displayed or used by production Worker code. `npm run test:browser` launches Chromium against the local static site and checks mobile navigation on the homepage, standards, archive, every generated film page, the Top 20 page and the dynamic detail shell. It checks the no-JavaScript Other Mommy and Clayface trailer links, basic horizontal overflow, search empty state and local image loading, and writes screenshots under `test-results/`. You can use `npm run worker:dev` after applying the local D1 migration.

### Manual-film synchronization

`data/movies.js` remains the editorial source of truth for the six existing film pages. `npm run sync:manual-films` validates and prints a dry-run summary with record hashes. After reviewing source edits, an authorized operator may run `npm run sync:manual-films -- --apply` with `FR_API_BASE` and `ADMIN_TOKEN` supplied in the process environment. The Worker stores immutable versions and source claim JSON in `manual_film_versions`; first import preserves the six existing approved records, while any changed record is stored as `pending-review` and never replaces the previously approved version. Changed records are listed through `/api/admin/manual-film-changes` and require an explicit authenticated approval. This synchronization does not create canonical provider mappings or feed a database title into discovery automatically.

Only provider availability/showtime observations and explicitly licensed, territory-specific dates may refresh automatically, and only after exact IDs are editorially mapped to an approved horror film. Manual title, genre, synopsis, cast, crew, trailer, artwork, horror classification and editorial approval remain reviewed source claims. Changes to those claims are staged as a new version and require source-by-source review. See [OPERATIONS.md](OPERATIONS.md) for recovery and approval procedures.

Read [API_LICENSING.md](API_LICENSING.md) before activating any provider. It documents the reviewed API terms, costs/quotas and attribution requirements, required owner actions, Worker secret names and the deliberately unset Cloudflare database ID. Commercial services are disabled by default; until licences and service configuration are present, the website reports unavailable data instead of inventing it. No Worker route, Cloudflare account setting, public domain or DNS value is changed by this repository.

### Data tables

- `canonical_films` stores editorially approved identity records and separately sourced release-path labels. Automated discoveries are candidates only.
- `critic_reviews` stores one approved, licensed numeric score per critic, film and year, along with permission evidence and canonical source URL.
- `dataset_snapshots` and `current_datasets` retain validated territory-specific provider results and atomically point to the latest valid snapshot.
- `rank_history` records each daily score, position, critic count and date for movement labels. `update_runs` stores published, failed and skipped ingestion attempts.
- `review_queue` retains weekly discovery candidates for administrative review.

Admin endpoints require the `ADMIN_TOKEN` Worker secret and stay inactive without it. Provider API keys must be configured as Worker secrets rather than committed files or browser configuration. See the owner setup checklist in [API_LICENSING.md](API_LICENSING.md).

## Editorial positioning

Frightertainment currently covers independent horror discovery: source-verified film information, cinema and streaming listings when licensed feeds become available, TV recommendations, and independently produced horror podcasts. It does **not** advertise Frightertainment Originals, film productions, cinema screenings, or future podcast episodes as planned or coming soon. Recommendations must link to genuine programme or publisher sources without implying partnership, endorsement, or UK streaming availability. Film and TV posters remain text-only until per-asset rights or suitable commercial catalogue rights have been documented.

## Copyright-safe visual film links and tabbed hub

Home is a compact, responsive dashboard. Separate pages: /movies.html, /tv-shows.html, /indie-movies.html, /podcasts.html, /games.html and /top-20/. No invented charts, production promises or current streaming claims. The six original manually verified films remain intact. Tabs use ordinary URLs for accessible, shareable navigation.

Film cover cards are clickable visual links to local detail pages, with an additional link to the studio's original film page. Simply pointing to a webpage, hotlinking an image, using Open Graph image metadata, or providing an attribution is **not** a licence to show its poster. Only add a poster when a rightsholder permits publication or an appropriate licensed provider grants display rights. A record must have poster, posterCredit, posterPermission, posterLicenceStatus='approved', posterSourcePage, posterPermissionEvidence and posterUsageScope. The content checker rejects unapproved posters. Do not automatically mirror studio page imagery, scrape poster collections or borrow IMDb artwork. This supports an official permitted poster image in the future without relying on wholesale licences today.

## Expanded editorial catalogues

`data/editorial.json` contains primary-source-linked TV, podcasts, indie horror and game recommendations. `scripts/build-editorial.mjs` renders each into accessible HTML after the established original picks. The data and credits do not imply endorsement, territorial availability, ownership, or film-poster permission. Generate with `npm run build:pages`. Do not import unverified paid-media ratings or artwork. The six original Frightertainment reviewed film records remain the only six supported by the protected manual sync; additional film titles live in the static, source-checked catalogue.


## Film-year archive and publisher score references (October 2026)
The Movies landing page now defaults to current-year 2026 horror films, with explicit selectors for 2025, earlier archive, future and all films. The **original** film chronology for the 28 Days franchise is 2002 / 2007 / 2025 / 2026; 28 Days Later's U.S. release date was in 2003 and must not replace its original UK production year. The Bone Temple has a separately sourced US theatrical date and a UK digital release date, **not** the same territory and distribution mode.

Select films have `criticReferenceSnapshots`: directly linked, individually researched editorial references to publishers' publicly reported critical metrics at a stated check date. These are **not live metrics, licensing permissions, or inputs to the Fright Index**. Rotten Tomatoes' percentage of positive critics and Metacritic's weighted critic rating represent different calculations and must never be averaged together to manufacture a Frightertainment score. Do not extract scores automatically, use logos or build a commercial rankings product from these external metrics without appropriate data rights. Further review is required before any public commercial launch. Currently the independent Fright Index is still pending because zero source and reuse-permission-approved professional critic entries have been entered in its private database.

## PRIVATE preview critic percentage comparison (October 2026)
The protected Pages preview includes a **partial**, manually checked Rotten Tomatoes critic-score comparison on the homepage and annual pages, generated by `rankings-preview.js`. This is a temporary design prototype on the exact staging hostname only (or localhost). The six eligible source snapshots for 2026 are dated 2026-10-08. It reports RT positive-review percentage, which is **not** the Frightertainment Fright Index; it **never** averages Metacritic and RT percentages.

RT's current terms restrict republication, collection, and integrating its ratings data into third-party services without written approval. Do not enable this preview on the public domain or deploy this comparison to production without reviewing licensing and obtaining the necessary authorisation. Do not scrape RT or add automatic ratings ingestion under the preview arrangement. RT's licensing contact: https://www.rottentomatoes.com/help_desk/licensing ; their current terms: https://www.rottentomatoes.com/policies/terms-of-use .

The public Fright Index still uses distinct professional-review records whose provenance and reuse permissions are approved, evaluated by the existing Cloudflare staging database and daily calculator. This remains pending until eligible reviews are obtained. Never claim the six scored films comprise a completed Top 20. Browser tests and unit tests verify correct 2026 scoping, 6/11 partial counts and staging-only rendering.


## All Horror Movies, 1896–today — archival data model

The **Movies → All Horror Movies** subtab at `/all-horror-movies.html` contains a collapsed year for every year between 1896 and the current UTC year. Users can jump directly to a year, open it to reveal the film titles alphabetically and use that year's search box. A film opens the existing Frightertainment detail route if it has an approved local record; otherwise an exact IMDb page if Wikidata supplies a verified `P345` identifier, or a clearly marked IMDb search. The opening 1896 film is individually sourced to the BFI.

Film links are loaded from `data/archive/horror-films.json` (cumulative CC0 Wikidata title / release-date / identifier data), plus the established `data/movies.js` editorial film files. These data sets are kept separate from current-week charts, cinema/streaming availability, trailers, review scores and rights-sensitive poster images. The archive **does not imply complete worldwide filmography**: Wikidata has coverage gaps, particularly in microbudget and direct-to-video titles, and does not reliably classify cinema/VOD distribution. Never infer viewing availability or distribution platform.

### Weekly upkeep: one prompt, existing years preserved

When the owner says **"Update the Frightertainment horror archive"**, edit `data/archive/refresh-request.json` on branch `codex/frightertainment-v1` with a new `requestedAt` date/time and reason. This is the only human-triggered file change needed: `.github/workflows/horror-archive-sync.yml` then runs `node scripts/sync-horror-archive.mjs`, merges the latest bounded Wikidata CC0 year ranges by stable Wikidata QID into the existing file, and commits it back to that same preview branch. The importer is **append/merge, never replace**. It rejects failed, truncated or unexpectedly sparse downloads rather than deleting records. It respects Wikidata's bot etiquette, retries/backoff and a serial request schedule. The workflow also has manual workflow_dispatch; a weekly Monday 06:15 UTC schedule will take effect **only when this workflow is on the default branch after a separate authorised release**. During private staging, prompt-triggered updates run from the preview branch.

`data/archive/horror-films.json.manual` is reserved for verified, manually sourced special cases and historic titles absent from Wikidata. It is retained untouched across weekly importer runs. Report missing/incorrect films via Frightertainment's archive correction email link and verify before adding entries.

Scalability: Year panels render their film rows on first opening, not all years simultaneously. All records stay in the static JSON on every rebuild; editing the weekly Top 20 or adding featured movies **never resets old-year records**. Preserve titles from cinema, direct-to-video, physical media, streaming and VOD when Wikidata classifies them as horror, but only label distribution modes with independent credible evidence. No IMDb scraping or unauthorised API access.


## Reliable links for the all-year horror archive

As of October 2026, the 9,772-item historical archive no longer sends a visitor directly to third-party IMDb URLs by tapping a film entry. Each complete **year/film card**, including its right-hand label, opens a first-party `/archive-film.html?id=Q...` record (or `/films/<id>/` for the 24 fully sourced editorial films). This is deliberate: some Wikidata IMDb IDs are stale or mismatched, while IMDb can block requests or third-party browsing independently of our website.

The first-party archive film page shows the catalogue title/year and offers: the exact IMDb title link **only** if a plausible non-conflicting Wikidata P345 ID exists, an IMDb title-search fallback, and a Wikidata source link. Manual entries show their independent film-source link, e.g. the 1896 BFI film record. Two conflicting Wikidata films that share an IMDb ID are not given a misleading direct IMDb link; visitors can search IMDb instead.

All local film cards and archive film pages are served as static first-party files, so the 9,772-item catalogue can be browsed without relying on availability of a third-party website. Tests exercise examples across years, film cards with and without IMDb IDs, manual records, duplicate IDs, invalid IDs and the back link into the opened release year.

**Limitation:** Frightertainment cannot guarantee external IMDb or source pages will always be reachable, and validation of the syntactic IMDb ID cannot guarantee its owner identity. Keep fallback search and original Wikidata sources available. Do not describe all external URLs as individually verified.

## Homepage automatic discovery (October 2026)

The `index.html` homepage intentionally keeps the existing compact Frightertainment horror dashboard as the first/main visual experience. The source-linked cinema, streaming, upcoming, trends and Top 20 data panels from `home-discovery.js` are inside an accessible **closed-by-default** `details.home-discovery-wrap` immediately below the showcase. Users can open them as needed; do not expand them into a long vertically scrolling homepage by default. Film lists and the complete 1896–present horror archive remain separate Movies sub-tabs.

**Do not omit `home-discovery.js` from `scripts/build-preview.mjs`**: this once resulted in an apparently present but non-functional homepage discovery/search panel on the Cloudflare private preview. The build, content checks and browser tests now require the file to be included. Successful static HTML generation or unit tests by themselves are not proof that the browser client was shipped. GitHub Actions installs Chromium and executes Playwright independently of whether local/agent Chromium download succeeded.

Country selections must only advertise territories for which a licensed source has been approved. Empty/pending states remain visible when those licences or records are unavailable; do not invent availability or live rankings. The private homepage preview and public frightertainment.com are different deployments; avoid merging/deploying production without owner approval.


## Rich film pages and 20-title score coverage (9 October 2026)

Curated film pages under `/films/<id>/` now have a cinematic Frightertainment-made title artwork hero, release year, credited director and cast where source claims exist, a sourced plot description where approved, credited source links, and the existing trailers and distinct score types. The no-JavaScript generator `scripts/build-pages.mjs` produces the same original-art hero as the browser's `app.js` renderer. Only the access-protected preview displays the manually checked publisher score stamp. Do not treat it as a licensed movie poster, official review-aggregator icon, or independently computed Fright Index.

The long-lived `/archive-film.html?id=Q...` pages now display suggested **same-year** discoveries and optional CC0 Wikidata descriptions, directors, selected cast, genres, country and reported runtime. These details are sourced to each Wikidata entity and labelled as possibly incomplete. No copyrighted posters, studio plots, IMDb ratings or invented viewing services are downloaded.

### Growing cumulative source metadata with one prompt
`data/archive/profiles.json` is an additive, source-linked cache separate from the **original 9,772+ film archive**, containing incrementally sourced Wikidata film metadata. `scripts/sync-archive-profiles.mjs` enriches up to 450 additional film records at a time, processing new/current-year films before older historical entries. It uses the official Wikidata entity API (labels/descriptions and P57 director, P161 actor, P136 genre, P495 country, P2047 runtime), keeping the previous cache unchanged if the upstream import fails. A GitHub Action `.github/workflows/film-profile-sync.yml` invokes it on changes to `data/archive/profile-refresh-request.json`, with Monday UTC scheduling only after that workflow is published to the default branch. To refresh: ask “Update Frightertainment film profiles” and edit that small request file on the private branch.

### Twenty tracked films is not twenty rated films
The private Top 20 preview now shows up to **20 distinct 2026 film titles**: genuinely scored movies are numerically ranked, and unscored titles sourced from the cumulative archive appear in an explicitly **UNRANKED / awaiting verified rating** section. This watchlist updates as weekly archive imports arrive without erasing old films. Do not label those unrated titles #7–#20: that would invent a ranking. The existing staging Cloudflare daily scoring job recalculates approved, permission-cleared professional reviews already held in D1. It does **not** obtain reviews. Building a complete automatically refreshed 20-film critic chart requires an RT, IMDb, or equivalent approved commercial licence and implementation of that provider's permitted ingestion contract. Never scrape scores or assume free non-commercial datasets can be incorporated into a monetisable website.
