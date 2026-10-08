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
