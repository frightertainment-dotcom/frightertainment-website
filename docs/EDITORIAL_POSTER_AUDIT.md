# Editorial carousel media audit — 12 October 2026

## Observed implementation and rights boundary

The 24 curated `data/movies.js` records have empty direct-poster fields. The old carousel required a direct URL plus approved licence, credit, permission, scope, source page and evidence. No film could satisfy that gate. `media-ui.js` already uses `/api/media` for TMDB imagery, while the carousel never requested it. The existing Cloudflare production and private-preview Pages configurations both have `TMDB_NONCOMMERCIAL_USE_APPROVED=true`, `TMDB_ATTRIBUTION_READY=true`, and a server-side read token. The Worker refuses TMDB requests without those settings. The site Credits page carries a TMDB logo and non-endorsement notice. The carousel now reuses that gated route for exact identities and labels poster and audience-score provenance. No TMDB image file or token is checked into this repository.

TMDB's [official FAQ](https://developer.themoviedb.org/docs/faq) says the free API permits non-commercial use with attribution, and commercial projects require a separate licence. TMDB defines a commercial project by whether its **primary purpose** is to generate revenue for the owner. This website also links to a Frightertainment clothing shop. The Cloudflare flag is an existing site configuration and an operational approval signal; it is not a legal determination that the site's primary purpose meets TMDB's definition. Before production promotion, the owner should confirm the site's primary purpose remains non-commercial under the current terms or supply a commercial TMDB licence. If neither can be confirmed, leave the TMDB route disabled and secure studio grants for each poster instead.

## Identity and provider register

The carousel requests these TMDB identities only via the approved `/api/media` route. Each response must match the pinned TMDB ID when present, the curated title, original year, movie type, TMDB source URL and safe poster path. IMDb mappings from the CC0 archive use TMDB's exact IMDb find route, then apply the same title/year check. An unmatched or broken response retains original Frightertainment display art labelled as such.

| Curated film ID | Identity | Verification source |
| --- | --- | --- |
| `longlegs` | TMDB 1226578, 2024 | [TMDB title](https://www.themoviedb.org/movie/1226578-longlegs), [NEON film file](https://www.neonrated.com/film/longlegs-film) |
| `heart-eyes` | TMDB 1302916, 2025 | [TMDB title](https://www.themoviedb.org/movie/1302916-heart-eyes), [Sony film file](https://www.sonypictures.com/movies/hearteyes) |
| `heretic` | TMDB 1138194, 2024 | [TMDB title](https://www.themoviedb.org/movie/1138194-heretic), [A24 film file](https://a24films.com/films/heretic/) |
| `nosferatu` | TMDB 426063, 2024 | [TMDB title](https://www.themoviedb.org/movie/426063-nosferatu), [Focus film file](https://www.focusfeatures.com/nosferatu) |
| `the-monkey` | TMDB 1124620, 2025 | [TMDB title](https://www.themoviedb.org/movie/1124620-the-monkey), [NEON film file](https://www.neonrated.com/film/the-monkey) |
| `28-days-later`, `28-weeks-later`, `28-years-later`, `28-years-later-bone-temple`, `five-nights-at-freddys-2`, `together`, `bring-her-back`, `scream-7` | IMDb IDs pinned in `editorial-spotlight.mjs` | Exact title and year entries in `data/archive/horror-films.json`; TMDB find response is checked again before display |

The first six indie picks map to the corresponding curated film IDs. Expanded indie picks do not have an approved identity mapping yet and remain in the catalogue below, outside the five-slide rotation. TV shows, podcasts and games retain labelled original display art: no documented artwork permission or vetted stable media identity was found for their carousel candidates. A publisher or creator can supply written permission with usage scope, attribution, evidence URL, territory and expiry for a future addition. A film's official source page alone is not poster permission.

No Fright Rating has been invented. When TMDB supplies audience votes, the label remains “TMDB AUDIENCE.” Official trailer links appear only when TMDB returns an official video listing for the exact resolved film; original verified links continue to use their existing claim-level gate.
