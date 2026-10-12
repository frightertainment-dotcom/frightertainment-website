# Cinematic Frightertainment editorial design — release contract

Date: 12 October 2026. Source base: current live branch `codex/frightertainment-owner-smoke-20261010`, commit `29457586f207ac99e74ba2da995f7fb523bb6719`. Visual reference: owner-approved desktop Movies and mobile Indie Movies concept art. Keep the actual Frightertainment brand asset and all five existing page-title wordmark PNG files, all tabs and the full pre-existing site functionality.

## Included

- Full-site blood-red/black cinematic treatment for principal pages with original environmental assets rather than copyrighted unlicensed media. Shop promotional banner, verified review sources and archival navigation preserved.
- An editorial spotlight appears directly under the Movies, TV Shows, Indie Movies, Podcasts and Games page title, selected using the Europe/London calendar date from the existing vetted items and approved film files.
- A controlled owner override can nominate an indie film, subject to actual identity, rights and written public-claims verification. No automatic licence is presumed from an email.
- Poster appears only with provenance and suitable reuse permission; otherwise show original Frightertainment scene art, explicitly NOT an official poster. Only matching sourced trailers embed; otherwise link to a genuine source. Fright Rating is withheld without actual approved data.
- Mobile editorial content reflows vertically with touch-sized links, no sideways content scrolling. Reduced-motion and focus-visible styling preserved.

## Release gates

1. Green production and preview build with expected assets and absence of internal development files.
2. Browser QA for 320, 360, 390, 768, 1280, 1440 px on all 7 primary navigation destinations, including horizontal overflow, legible text, exact original logos, functioning tabs, spotlight placement, content links, media consent and poster fallbacks.
3. Test that daylight savings day index and owner override work, that no fabricated review score appears, and no unauthorised film poster renders.
4. Cloudflare protected preview checks and correct noindex, then source/build/release identity verification; never change Cloudflare Access or DNS for this design.
5. Production deployment explicitly tied to an approved, tested commit, previous deployment retained for rollback, followed by evidence of served www/apex pages without downtime.

## Caveat

The source-backed pool has finite size, and changing a browser-selected daily pick does not itself validate new film announcements or legal permissions. Source checks and owner-approved published content remain separate processes. Concept-art quote/ratings/poster graphics were illustrative, not editorial evidence and are not copied as factual claims.
