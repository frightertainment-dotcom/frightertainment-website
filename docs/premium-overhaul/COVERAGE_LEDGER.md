# Coverage ledger — scope is explicit

Run `node scripts/measure-v2-coverage.mjs` to refresh [the by-year JSON census](media-coverage.json). This is a **complete repository count** for the listed files on 18 October 2026, not a per-record correctness review.

| Source | Counted | Actually reviewed for identity/media in this V2 session | Remaining |
| --- | ---: | ---: | ---: |
| Broad historical film archive, 128 year labels | 9,772 unique QIDs | 0 per-record | 9,772 |
| Enriched archive profiles | 900 | 0 per-record | 900 |
| Manual sourced film details | 24 | 0 per-record | 24 |
| Indie archive | 86 | 0 per-record | 86 |
| TV editorial subset | 8 | 0 per-record | 8 |
| Podcast editorial subset | 9 | 0 per-record | 9 |
| Game editorial subset | 9 | 0 per-record | 9 |
| Indie editorial subset | 9 | 0 per-record | 9 |

The seven landing routes were rendered at 320 and 1440 in local headless Chromium, first viewport each; Home/Movies full pages were also captured. Local image elements in the first viewport reported loaded, but that covers first-party static assets only. External poster correctness, catalogue API pagination, official links and 276 external targets have **not** been completely checked. Staging/production D1 table counts in `BASELINE.md` are read-only operational counts, not additional catalogue coverage.

Next durable batch: review archive original years in `media-coverage.json` in bounded ranges, record `inspected`, `matched ID`, `poster verified`, `missing rights`, `broken URL`, `ambiguous`, and `last QID` per range. Preserve 9,772 as the denominator until source changes are recounted. Do not relabel 24 curated details or 900 profiles as the entire vault.
