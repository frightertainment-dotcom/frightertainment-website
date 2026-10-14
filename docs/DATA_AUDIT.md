# Archive data audit — 10 October 2026

The original 9,772 source records remain intact for provenance. Confirmed non-film records have `excludedFromMovieArchive: true` and a `dataAudit` reason/source. They must not be listed as individual movies or hydrated with another movie’s TMDB media. Profiles carry the same quarantine flag when present.

## Confirmed corrections

| Wikidata ID | Title | Finding | Source |
|---|---|---|---|
| Q6166233 | Jaws | Film franchise or series, not an individual movie | https://www.wikidata.org/wiki/Q6166233 |
| Q1990792 | Alien | Film franchise or series, not an individual movie | https://www.wikidata.org/wiki/Q1990792 |
| Q617871 | A Nightmare on Elm Street | Film franchise or series, not an individual movie | https://www.wikidata.org/wiki/Q617871 |
| Q1616116 | Critters | Film franchise or series, not an individual movie | https://www.wikidata.org/wiki/Q1616116 |
| Q388659 | Scream | Film franchise or series, not an individual movie | https://www.wikidata.org/wiki/Q388659 |
| Q20022604 | Anaconda | Film franchise or series, not an individual movie | https://www.wikidata.org/wiki/Q20022604 |
| Q20022635 | Lake Placid | Film franchise or series, not an individual movie | https://www.wikidata.org/wiki/Q20022635 |
| Q3166407 | Wrong Turn | Film franchise or series, not an individual movie | https://www.wikidata.org/wiki/Q3166407 |
| Q2891967 | Paranormal Activity | Film franchise or series, not an individual movie | https://www.wikidata.org/wiki/Q2891967 |
| Q16997013 | Insidious | Film franchise or series, not an individual movie | https://www.wikidata.org/wiki/Q16997013 |
| Q130784448 | Absolute Green Lantern | Comic book series, not an individual movie | https://www.dc.com/comics/absolute-green-lantern-2025/absolute-green-lantern-2025-1 |
| Q114764421 | V/H/S | Film franchise or series, not an individual movie | https://www.wikidata.org/wiki/Q114764421 |

Saw (Q486239, IMDb tt0387564) moved from 2003 to 2004, confirmed by the [BFI film record](https://www.bfi.org.uk/film/58fd0003-8231-59ce-9e43-e613a24e78c1/saw) and [AFI catalogue](https://catalog.afi.com/Film/63212-SAW). The distinct 2003 short film Saw (Q612036, IMDb tt0495241) remains in 2003.

## Scope and remaining uncertainty

- Examined all 9,772 records for invalid IDs, duplicate IMDb IDs and identical title/year pairs.
- Examined all 900 local profiles for descriptions indicating comics, franchises, TV series, books, games or albums. Two confirmed non-film profiles were quarantined; a film description mentioning its source novel was retained.
- Reviewed a bounded cross-year sample of duplicate title/year groups. Matching titles are not automatically duplicates: distinct 1920 Dr. Jekyll and Mr. Hyde films, English/Spanish Dracula (1931), two 1928 Fall of the House of Usher films, and different recent Escape Room/The Home movies must retain independent identities.
- Duplicate IMDb tt4842814 occurs on The Inerasable (Q23763105, 2015) and Zane (Q21015393, 2016). Frontend omits exact IMDb matching for this collision and requires strict title/year matching. No fabricated replacement identifier was added.
- Four additional same-title records without IMDb (Silent Night, Deadly Night Q3960503; From Dusk till Dawn Q5505399; Killjoy Q6407866; Wolf Creek Q111476155) remain pending direct entity verification because primary-source fetches failed. They were not removed speculatively.
- This is a bounded contamination audit, not a claim that every historic release year, genre or entry has been independently fact-checked.
- Current source strings only mention horror genre and original date. The sync query should require an individual film instance and exclude film franchises/series, comic series and television series. Merge refreshes must preserve explicit quarantine and corrected years rather than overwriting audit decisions.

## Internal links

`node scripts/check-links.mjs` passed: 41 HTML files, 788 internal references, sitemap routes validated. It counted 304 external links but does not test their remote availability; external HTTP access requires a separate check.
