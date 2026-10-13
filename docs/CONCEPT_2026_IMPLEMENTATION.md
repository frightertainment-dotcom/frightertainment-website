# Seven-section concept review

The October 2026 supplied Home, Movies, TV Shows, Cinema, Indie Movies,
Podcasts and Games images are visual references. Their fictional titles,
scores, episodes, services and ticket listings are not content data. The
site continues to show source-backed releases, posters and rankings only.

## Wordmarks and artwork

| Asset | Origin | Use |
| --- | --- | --- |
| `assets/frightertainment-brand.png` | Owner-supplied `07-1000124213.png`, byte-identical | Header and Home |
| `assets/page-title-indie-movies.png` | Owner-supplied `01-1000124934.png`, byte-identical | Indie title |
| `assets/page-title-tv-shows.png` | Owner-supplied `02-1000124933.png`, byte-identical | TV title |
| `assets/page-title-games.png` | Owner-supplied `03-1000124927.png`, byte-identical | Games title |
| `assets/page-title-cinema.png` | Owner-supplied `04-1000124928.png`, byte-identical | Cinema title |
| `assets/page-title-movies.png` | Owner-supplied `05-1000124925.png`, byte-identical | Movies title |
| `assets/page-title-podcasts.png` | Owner-supplied `06-1000124926.png`, byte-identical | Podcasts title |
| `assets/concept-haunted-house.png` | Original AI-generated scene for this rebuild, 2048 × 1024 | Shared masthead background; no film title or official poster claim |

The original site-owned `assets/worlds/` scenes remain fallback illustration.
Movie and TV posters resolve through the existing matched TMDB integration;
podcast artwork uses the existing podcast source. If source art is absent,
the site labels its illustration as a Frightertainment treatment rather than
passing it off as an official poster.

## Review boundary

The draft branch and PR are for isolated visual and functional review.
The protected Cloudflare preview and its Access policy must be verified before
deploying this branch. No production merge or public-domain release is part of
this change. Compare the CI's first-fold screenshots at 390 px and 1440 px
against each supplied concept, then verify real connected API data in the
protected preview. CI fixtures exercise layouts and interactions; they do not
prove live posters, rankings or availability.
