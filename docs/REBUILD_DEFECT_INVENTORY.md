# Rebuild checkpoint: baseline defects and factual counts

Checkpoint date: 10 October 2026
Baseline commit: `ba087875aab1d401ea76df1bfe0053a73724a082`
Working branch: `codex/frightertainment-v1`

## Baseline inventory

| Area | Finding at baseline | Current implementation status |
| --- | --- | --- |
| Main navigation | Six destinations existed, but every tab was shown as a bordered cell; generated film and annual pages required shared navigation decoration. | Restyled as a quieter six-destination rail with an underline state; generated pages and 320–1920px responsive widths are browser-tested. |
| Full film catalogue | The broad Wikidata snapshot was reachable from Movies, separate from the smaller enriched first-party film collection. | Movies now presents the full indexed archive as the Horror Vault; year selection, A–Z ordering, search, links and browser history pass browser regressions. |
| Archive year identity | Local archive logic treated `releaseYear` and the year portion of a territory `releaseDate` as the original film year. | Archive inclusion now requires explicit `filmYear`; territory-only dates remain separate. Territory-only 2026 records do not enter the 2026 original-year archive. |
| Upcoming cinema dates | Past dates were filtered out, but separate regional claims could produce duplicate-looking rows. | Events validate calendar dates, include only future cinema releases, group by canonical film and retain separate sourced territory dates. Browser regressions pass. |
| Fright Rating | No approved numerical critic reviews were in the enriched public film files; the public 2026 chart must remain pending. | No score or ranking is added. Empty and failed data states remain explicit. |
| Visual identity | Section pages reused similar artwork, box borders and card arrangements. | Six original room illustrations and six section compositions replace repeated generic art; responsive browser screenshots are captured for review. |
| Typography | Four remote font families were requested across pages, including unused display faces. Several title styles allowed arbitrary word breaking. | Standardized on Grenze Gotisch, Barlow Condensed and DM Sans. The 320px longest-title check and mobile contrast checks pass; actual font availability is separately reported. |
| Artwork | Generic illustration assets repeated as if they were film artwork. | Original environmental art is decorative and distinct from varied text-led film covers; official movie artwork remains rights-gated. Provenance and usage are recorded in `ASSET_REGISTER.md`. |
| Trailer playback | Exact official video IDs exist for selected film records and playback starts only after a click. | Privacy-enhanced YouTube embeds, responsive dimensions, no-JS source links and click-to-play behavior pass browser checks. Actual hosted playback remains an external/browser-access check. |
| Private/public separation | Private-preview Pages project and public live Pages project are separate; production deployment was reported disabled. | Read-only Cloudflare API checks confirm production deploys disabled, the development branch included only in private-preview, and all live preview hostnames plus apex/www behind owner-only Access. No configuration, production or DNS changes were made. |

## Dataset counts at baseline

- `data/archive/horror-films.json`: 9,772 Wikidata records with 9,772 unique QIDs, plus one separately checked 1896 BFI record. The Wikidata alias `Q153603` is collapsed against that BFI record when rendered.
- `data/movies.js`: 24 approved enriched first-party film files; this is not the full archive. Nineteen carry an explicit film-year claim. Six add a year/title identity not already present in the Wikidata snapshot, so the browser's computed archive total is 9,778 distinct links after the alias and local-title deduplication.
- Verified original film-year records in the public 2026 catalogue: 7. These are Victorian Psycho, 28 Years Later: The Bone Temple, Send Help, Backrooms, Scream 7, Insidious: Out of the Further, and Ready or Not 2: Here I Come.
- Eligible approved numeric critic reviews across the enriched records: 0. Eligible 2026 chart candidates: 0. Published 2026 ranking positions: 0. The chart therefore remains pending and the seven year-verified titles remain unranked.
- Read-only staging D1 check on 10 October 2026: 20 canonical rows, 0 critic reviews, and 0 legacy rank-history rows. Ten rows have `release_year=2026` and verified-horror/approved editorial flags. That column is territory-release year in the current schema, not verified original film year.
- Canonical-ID reconciliation: seven staging IDs match the public 2026 film-year records above. The other three are `clayface`, `crawlers`, and `werwulf`. Their public files contain sourced territory release dates (North America/US or an ANZ regional listing) but no verified original `filmYear` claim. They remain release-only records and must not be added to the 2026 original-film-year catalogue from release dates alone.

The staging database still has its older `release_year` schema and no `film_year` or `annual_ranking_snapshots` tables. No remote migration, Worker deployment, Cron change, database rebinding or production operation was performed. The migration remains gated on a complete verified backup and isolated restore/rehearsal.

## Visual evidence

Baseline and current screenshots were captured with Chromium at 1440×1000 desktop and 390×844 mobile, using the same explicitly empty/pending ranking response. The source screenshots are kept out of deployable assets under the ignored `test-results/design-refinement/` directory. `before/` uses baseline commit `ba087875aab1d401ea76df1bfe0053a73724a082`; `sections/` contains the current six-section, chart, archive, and trailer captures. These are browser-emulated viewport captures, not physical-device tests.

In this environment, outbound Google Fonts and YouTube requests fail through the network proxy. The page renders with the documented local fallback fonts; the trailer's click-to-embed behavior is verified, but actual YouTube playback and live remote font loading are not verified here.

The staging database schema is still awaiting the separately approved full-backup, isolated-restore and migration rehearsal. This document does not authorize a migration, scheduler deployment or database configuration change.
