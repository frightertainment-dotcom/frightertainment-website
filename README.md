# Frightertainment website · Version 1

A responsive static horror publication using the supplied Frightertainment identity and artwork. The site includes claim-sourced film records, standalone detail pages, mobile navigation, search and filters, Fright Index method, Originals sections, editorial standards, accessibility support, SEO metadata, `robots.txt` and a sitemap.

## Preview and checks

Requires Node.js 18 or newer and Python 3.

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

- `index.html` — publication home, film listings, filters, score method, trailer status and Originals sections.
- `films/<id>/index.html` — generated source-linked detail page for each film.
- `editorial-standards.html` — verification, rights and scoring policy.
- `data/movies.js` — hand-edited claim-level film evidence.
- `assets/` — original supplied brand and series images. Directory case is intentionally lowercase and must stay that way.
- `scripts/build-pages.mjs` — generate film pages and `sitemap.xml`.
- `scripts/check-content.mjs` — validate evidence and generated files.
- `robots.txt`, `sitemap.xml`, `_headers` — crawl and host guidance.

## Branding and rights

The supplied artwork moved from `Assets/` to `assets/` without image edits or recompression; SHA-256 hashes match the original Git blobs. Frightmares and When the Horror Was Real use their supplied images. Frightertainment Cinema uses a typographic treatment because no corresponding image was supplied.

## Hosting

Static files publish from the repository root after editorial and rights review. Canonical metadata still targets `https://www.frightertainment.com/`; the public domain and hosting have not been verified or changed here. No Cloudflare or DNS settings are managed by this project.
