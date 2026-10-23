# Frightertainment source-backed content refresh — 23 October 2026

**Review status: staged GitHub proposal, NOT production.** The existing approved Cloudflare Pages deployment and Google Play upload must remain unaffected until this specific dated content set is reviewed and the normal GitHub → Cloudflare deployment gate is satisfied.

## Source and scope

Prepared against production GitHub `main` commit `7fca648ce35345f4434c4b5fb591ca09b0ed1c78`. The changes are limited to existing JSON data files and this review note. No styling, application code, Android APK, native signing, artwork, database schema or secrets are changed.

### Refreshed manual editorial selections

| Area | Previous | Proposed | Verification |
| --- | --- | --- | --- |
| Homepage movie | Heretic | **28 Years Later: The Bone Temple** | [Sony Pictures UK](https://www.sonypictures.co.uk/movies/28-years-later-bone-temple); existing `/films/28-years-later-bone-temple/` page |
| Homepage TV | Marianne | **Archive 81** | [Netflix official title](https://www.netflix.com/gb/title/80222802) |
| Homepage indie | Rabbit Trap | **Buddy** | [Sundance 2026 official film announcement](https://www.sundance.org/blogs/2026-sundance-film-festival-unveils-97-projects-selected-for-the-feature-film-and-episodic-program/) |
| Homepage podcast | Old Gods of Appalachia | **The Silt Verses** | [Official podcast listening page](https://www.thesiltverses.com/listen-now) |
| Homepage game | Phasmophobia | **Still Wakes the Deep** | [The Chinese Room official game page](https://www.thechineseroom.co.uk/games/still-wakes-the-deep) |
| Homepage cinema | Clayface | **Clayface**, with its UK 23 October release evidence freshly checked | [BBFC official release classification](https://www.bbfc.co.uk/release/clayface-q29sbgvjdglvbjpwwc0xmte2ndmx) |

The landing-page `weekOf` changes from 16 to **23 October**, and each featured item carries its individual source/check date. These are **Frightertainment editorial selections**, not claims of audience rank, reviews, prizes or live availability. No film poster or new media licence is inferred. Links to publisher, filmmaker, developer and classification sources are preserved.

The four editorial collections rotate the **existing, source-checked** cards without deleting any entries or altering their stable IDs:
TV leads with Archive 81, Podcasts with The Silt Verses, Games with Still Wakes the Deep, and Indie Movies with The Ugly Stepsister ([Sundance 2025 selection](https://www.sundance.org/blogs/2025-sundance-film-festival-reveals-93-projects-for-feature-film-and-episodic-programs/)). Only these four sources' individual checked dates are advanced.

### Cinema, UK streaming and Horror Radar

- **Cinema:** `Clayface` UK record rechecked against BBFC: **23 October 2026** (GB). All other countries' release data and unverified/provisional dates remain unchanged. The global cinema diary audit date **remains 16 October** because its full territory inventory has not been revalidated.
- **Shudder UK:** five already-listed 23–31 October releases have their individual sources rechecked against [Shudder's official October 2026 UK list](https://embed.letterboxd.com/shudder/list/october-2026-horror-films-coming-to-shudder-1/detail/): The Cycle (23 Oct), Deviant (26 Oct), The R.I.P Man (28 Oct), Big Baby (30 Oct), and Hunting Matthew Nichols (31 Oct). Existing film identity, access classification, country and premiere category are unchanged. Editorial releases' `updatedAt` reflects this update. Record-level `checkedAt` added to the five GB streaming entries; the **full streaming inventory last-checked date stays 11 October** because all 98 records were not reviewed.
- **Horror Radar:** three sourced UK Shudder dates added (The Cycle, Big Baby, Hunting Matthew Nichols); its already-listed Apple TV `Nocturne` date (30 Oct) rechecked against [Apple UK's official press page](https://www.apple.com/uk/tv-pr/originals/nocturne/). This is an editorial bulletin, **not** a scraped real-time streaming feed.

### Dynamic charts, news and archives: carefully separated

These live systems are **not fabricated or overwritten** by this static editorial update:

- The production D1 `tmdb-community-2026` community chart pointer was source-checked **22 October** and was serving a snapshot at the read-only 23 October inspection. It refreshes through the existing live TMDB route and existing caching/TTL; do **not** label it a professional critic composite. The separate D1 licensed-critic table and professional `annual_ranking_snapshots` contained **zero rows** in that inspection; no Fright Rating values or invented positions are created.
- FrightNews persists in production D1 and its 21 October empty-archive API bug was fixed via PR #58. The read-only count at this review was **438** total stored article rows; no publisher headlines or archived rows were changed by this branch.
- `data/archive/horror-films.json` and `data/archive/profiles.json` use separate cumulative Wikidata/CC0 staging import workflows. They are **unchanged** in this proposal because no newly sourced archive import or checked cumulative diff was available to promote. The indie archive retains its 86 individually checked records without deleting past years. Run those established archive workflows on staging and review counts, ID continuity, source links and schema before **any** separate archive promotion.
- Podcasts discovery and games/SteamDB charts are **not equivalent** to the manual editorial spotlight cards. Their provider/API freshness and licensing must be assessed separately; do not invent podcast ranking figures or game review metrics.
- Other cinema, streaming, title metadata and historic releases intentionally retain their last checked dates until those specific primary sources are actually reviewed. `updatedAt` alone does not certify all legacy claims.

### Pre-publication checks

1. Verify this change against the **current** GitHub `main` and Cloudflare Pages latest production source; if either moved after the review, rebase and check the full diff rather than deploy a stale branch.
2. Run `npm test`, `npm run check`, `npm run build:production` and relevant browser QA. Confirm generated editorial pages, `/data/homepage-features.json`, `/data/editorial.json`, `/data/horror-radar.json`, streaming and cinema paths are bundled, validated and reachable.
3. Confirm every source URL above, year, title identity and destination link. Verify the homepage six picks and the app's remote JSON refresh behaviour without changing bundled app code.
4. Keep the private staging/preview environment distinct and retain a known successful Cloudflare production deployment ID for rollback. Do not mutate D1 or publish from the dirty Windows checkout.
5. **Owner review of this exact dated selection set is required before merging to production**, following `WEBSITE_MANAGEMENT.md`. Subsequent content publication should be through the approved GitHub `main` → Cloudflare Pages pipeline. After publish, check both production domains and app-facing `/data/*` and `/api/*` paths.
