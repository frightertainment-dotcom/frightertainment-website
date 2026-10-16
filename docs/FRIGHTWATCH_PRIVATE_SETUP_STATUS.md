# FrightWatch — private build handoff and release locks

Status as of 17 October 2026: **source page staged on an isolated branch; not deployed or live.**

## What is implemented

- `frightwatch.html`, `frightwatch.css`, `frightwatch.js`: cinematic FrightWatch landing, categories, search, and respectful filmmaker submissions.
- `data/frightwatch-catalogue.json`: zero films until written permissions, artwork permissions, editorial review and server-side playback rights enforcement are supplied.
- `frightwatch-banner.js`, `frightwatch-banner.css`: one sitewide promo inserted below shared header on staging only; automatically excludes FrightWatch itself.
- `scripts/build-preview.mjs`: packages FrightWatch and injects promo on preview, never source/public pages.
- `scripts/build-production.mjs`: production file allowlist remains unchanged; explicit checks reject accidental FrightWatch content and assets.
- `test/frightwatch-private.test.mjs`: regression checks for the above.
- Branch derived from live deployment commit `22869c4bbec8b5b07dfd6a4e2833c70f906768e0`, not legacy concepts.

## Owner-supplied artwork (needs committing to THIS branch before branded preview)

Three web-optimised assets are supplied in the conversation attachment `FrightWatch_Private_Artwork_Assets.zip` in its `assets/frightwatch/` directory. **These binary files are not yet in GitHub**. Extract and add them to the same repository feature branch:

- `assets/frightwatch/frightwatch-banner.webp` (owner's exact supplied banner)
- `assets/frightwatch/frightwatch-banner-mobile.webp` (legibility crop from same banner)
- `assets/frightwatch/frightwatch-logo.webp` (owner's red illuminated bone-play logo)

The ZIP also includes the untouched source artworks.
Until the assets are committed, promo falls back to an accessible text prompt and the page shows temporary heading text instead of its intended image logo. **Do not represent that fallback as owner-approved art**.

## Mandatory pre-release testing and verification

1. Run `npm ci`, `npm run build:preview`, `npm test`, `npm run check`, `npm run check:published` on a clean checkout of the feature branch after adding the three assets.
2. On the same commit, compare a normal production build with the existing LIVE deployment at 320, 390, 768, 1024 and 1440px. Source parity is already verified by commit; **pixel/functional parity remains unverified**.
3. Compare private preview to that baseline before introducing any unrelated styling changes. Do not change the logo, fonts, mobile bottom navigation, animation or layout of the existing website.
4. Verify that preview access requires authentication in an incognito browser. Noindex and an unguessable URL are not sufficient access controls.
5. Confirm promo appears below headers on EVERY real page type (home, news, movies, TV, cinema, indie, podcasts, games, generated film/detail/archive pages) and never on FrightWatch. Check mobile banner for copy legibility and no hidden content or bottom bar overlap.
6. Confirm `npm run build:production` omits FrightWatch page, promo, logo, banner and private catalogue. **A production push or merge is prohibited until approval.**
7. Preview is NOT a streaming service yet: film detail/player, hosting, licensing/territory enforcement, tracking/privacy and launch copy require future work once real film permissions exist.

## Strict no-launch condition

Do not merge to `main`, alter Cloudflare Pages project settings, add an allowlisted preview branch, push to public domains, update a production sitemap, or advertise watchable films without separate approval. The existing live site must remain entirely unchanged.
