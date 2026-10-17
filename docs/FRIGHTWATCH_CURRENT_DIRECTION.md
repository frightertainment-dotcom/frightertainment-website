# FrightWatch — CURRENT owner-approved private preview direction (17 October 2026)

This file supersedes any earlier design brief that includes multiple film cards, sample posters, Originals, trending, Continue Watching, fake user profiles, fake playback, or extra navigation tabs.

## Visual contract
- Preserve the **already owner-approved** premium Netflix/Shudder-inspired FrightWatch art direction: owner-supplied gothic FrightWatch logo, castle/red moon artwork, dark cinematic atmosphere, refined horror typography and tightly controlled red accents.
- Distinct from general Frightertainment editorial website; original live Frightertainment pages must not change.
- A polished, deliberately art-directed streaming UI: avoid template-like bordered boxes, repetitive grids, heavy outlines, meaningless gradients and fake platform affordances. Keyboard-only focus-visible outlines are an accessibility requirement and are not decorative borders.
- Mobile and desktop must match the same visual identity; no page horizontal overflow at 320, 390, 768, 1440px.

## Current site structure
1. FrightWatch header showing the genuine wordmark, **one Movies link only**, and unobtrusive return to Frightertainment. No Home/Series/Originals/My List tabs, no profile avatar, no fake search.
2. Cinematic hero using the existing approved atmospheric castle/red-moon artwork. Copy is about FrightWatch's independent-horror mission, not a fake film title. No Play or More Info actions until a licensed title is configured. Explore Movies is an anchor link.
3. Exactly **one empty/pending film template**, artwork shape 2:3, ready for the FIRST REAL film. Reserve fields for licensed poster, approved film name and filmmaker credits. Do not invent or imply film details, release date, runtime, ratings or availability. It is not a playable movie yet.
4. Compact invitation for indie filmmakers that explicitly mentions voluntary, unpaid screening agreements and retaining rights.
5. No fake film catalogue; `data/frightwatch-catalogue.json` remains empty pending the owner's real film details and written agreement.

## Safety and release
- Feature branch: `feature/frightscreen-private-live-parity-20261016`.
- Deploy ONLY through Cloudflare's Access-protected `frightertainment-private-preview` preview environment.
- Never merge to `main`, trigger production releases, or change the public domain without a separate instruction.
- The owner has stated there is **one film in agreement** but has not yet supplied verified artwork/title/permissions for the page. Do not guess which film it is or use any example films as substitutes.
- Existing private-preview sitewide FrightWatch banner remains on other pages, excluded from FrightWatch itself. Banner image and logo remain exact approved user artwork.

## Implementation state
- `frightwatch.html` Movies-only layout with one `data-frightwatch-slot="first-film"` and `data-rights-status="pending"`.
- `frightwatch.css` purpose-built and responsive, without repetitive outlined cards.
- `frightwatch.js` no demo catalogue, no fake streaming APIs.
- Old `concept.webp` and `title.webp` (fictional-film art) deleted from branch.
- `test/frightwatch-private.test.mjs` enforces current scope and production lockout.

Use this document whenever refining FrightWatch. Do not restore older demo shelves.
