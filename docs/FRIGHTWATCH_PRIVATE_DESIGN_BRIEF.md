# FrightWatch — private streaming experience specification
Status: DESIGN BRIEF / PRIVATE ONLY — not published
Source of truth: the CURRENT Frightertainment production website, not any earlier theme or discarded ZIP.
Baseline commit for branch: 22869c4bbec8b5b07dfd6a4e2833c70f906768e0 (production deployed 2026-10-16).
Brand name: **FrightWatch** (NOT FrightScreen).

## Source artwork supplied by site owner, 16 October 2026
- Sitewide promo artwork: uploaded banner 1000126902.png (1536×512). Use intact with no redraw or typography substitution.
- FrightWatch logo candidates: uploaded 1000126903.png (2111×745, transparent) and 1000126904.png (1672×941, transparent). Preserve the bone-play device and FrightWatch spelling; owner chooses final variant.
- Placement reference: mobile screenshot 1000126895.jpg shows the available region below the fixed/mobile main header and above the Welcome hero, marked in red.
- Existing bottom mobile navigation reference: 1000126898.jpg. Keep the current navigation unchanged.
- These assets have NOT been added to the repository in this brief. Do not silently substitute CSS text or generated lettering.

## Rule 1: TRUE LIVE PARITY BEFORE FEATURES
- Begin from the exact production commit, rather than any old preview branch.
- Compare the private staging render against the currently deployed production site at 320px, 390px, 768px and desktop widths; check headers, logo, bottom mobile tab bar, background art, fonts, colors, poster grid, sizing, animations and links.
- Use the LIVE production build mode as parity reference; the existing Cloudflare private-preview build command differs and its deployments must not be assumed equivalent.
- Do not modify or redeploy the live Cloudflare Pages project, domain, DNS or main branch during private work.
- Private preview must be access restricted and verified inaccessible without authentication, not just noindex.
- New FrightWatch files must remain absent from production bundles and sitemap until explicit release approval.

## Rule 2: SITEWIDE FRIGHTWATCH BANNER
- Put the owner's existing promo artwork immediately BELOW the site header and ABOVE the page hero/content, including on desktop and on mobile in the annotated strip.
- Reuse ONE banner component and ONE canonical destination: /frightwatch.html (or approved clean-route equivalent), not duplicate bespoke markup on every page.
- Make the FULL banner one large accessible link, with alt/accessible name: "FrightWatch — watch free horror films".
- Maintain image aspect ratio with full text and bone icon legible; NEVER crop out text, stretch, or cover with duplicated overlay text. Adjust available width and intrinsic height responsibly. Provide distinct layout handling for mobile; if source is too small to read, request owner-approved mobile cut, do not invent typography.
- Mild hover/focus glow only; keyboard-visible focus; do not autoplay audio.
- Show on home, movies, TV, cinema, indie, podcasts, games, news, archive and other shared public templates including generated detail pages. Exclude FrightWatch and its film/player routes to avoid repetitive cross-promotion.
- No overlap with sticky mobile bottom nav, existing controls or the Welcome hero.
- IMPORTANT: Stage on feature branch only. All production pages must retain existing appearance until explicit approval.

## Rule 3: FRIGHTWATCH LANDING — CINEMATIC, NOT A BLOG
Maintain the current site's global Frightertainment identity/header/nav. FrightWatch's interior is an immersive dedicated streaming sub-brand rather than a duplicated second website.
1. Compact cinematic FrightWatch wordmark area, with owner's approved logo, dark filmgrain/filmstrip and restrained burgundy light (readable high contrast; not cluttered).
2. Hero rail: ONE editorially approved spotlight title with widescreen approved image, title, runtime, film year, synopsis snippet, age guidance and two controls: WATCH FREE and MORE DETAILS. Until licensed titles exist, replace the hero with a tasteful empty-state introduction; DO NOT fake a poster or show false 'play' affordance.
3. Compact browsing controls: ALL FILMS / FEATURE FILMS / SHORT HORROR, genre chips (Found Footage, Paranormal, Slashers, Psychological, Creature, Experimental) and search.
4. Horizontal poster shelves with legible posters/titles and a clear 'See all' path: Recently Added, Full-Length Nightmares, Short Screams, Found Footage, Supernatural, Indie Discoveries. Only display a shelf when it contains owner-approved watchable titles. Avoid empty rails.
5. 'About FrightWatch': free independent horror, proper creator credits; no misleading 'originals', studio affiliations, membership or licence claims.
6. Light footer with Frightertainment attribution, film submissions/contact, accessibility, privacy and rights information.

## Rule 4: FILM DETAILS / PLAYBACK
- Individual film details show licensed poster/key art, film title, filmmaker/director, country/year, runtime, age advisory if verified, synopsis, cast/crew only if sourced, captions/subtitles availability, content advisories, rights/credit links.
- Prominent WATCH FREE CTA only when a validated active licence AND allowed country match, plus verified video asset.
- Player supports responsive 16:9 video, native/fullscreen controls, seek, captions when available, keyboard/touch, loading/error states and playback-resume only when privacy controls permit.
- Do not embed a public watch URL based on an unverified video ID or link to a movie illegally hosted elsewhere. Licensed streaming playback only; integrate signed playback tokens when access policies need them.
- Display an accessible unavailable / rights-expired / territory-unavailable message as appropriate rather than leaking a player URL.
- Optional 'Up next' recommendations should only show other approved watchable films.

## Rule 5: CONTENT LICENSING GATE
Each film must carry: film ID, title, verified year and genre, credited filmmaker/rightsholder, territory rights, written grant of streaming rights to Frightertainment, start/expiry dates, monetisation permission, artwork permission, captions status, artwork attribution, media source and editorial approval. Rights are distinct for full film, trailer, stills and poster.
- Default new submissions to DRAFT/UNPUBLISHED, with no public asset exposed. Reject missing/expired rights.
- No films should be streamed simply because they appear in the existing Indie Movies discovery catalogue.
- No fabricated film availability, ratings, creator endorsements or 'free movies now' promises prior to launch. The owner's promotional artwork is for the approved launch, not public yet.

## Rule 6: MOBILE / ACCESSIBILITY / QUALITY
- Mobile: current header untouched, banner below it, FrightWatch hero readable and fast, ~2 portrait posters per shelf row, horizontal carousels with native swipe and sensible snap; no horizontal page overflow.
- Desktop: cinematic hero with content on left and approved art on right; multiple visible posters in a shelf.
- Test 320px, 360px, 390px, 768px, 1024px and 1440px; reduced motion, alt text, contrast, focus order, keyboard playback and touch targets.
- Keep video and poster requests lazy; never force a heavy player download on every site page due to the global banner.
- No popup adverts, subscription paywalls, fake film listings, or autoplay-on-load.

## Suggested implementation order / checkpoints
A. Verify local/private clone against LIVE production and record desktop/mobile parity screenshots.
B. Add banner to shared header injection + exclude FrightWatch routes; verify still private.
C. Implement empty FrightWatch page with exact logo, categories/search and polished empty state; use no invented catalogue entries.
D. Add protected film data model / player for permission-cleared test asset only.
E. Run cross-page and mobile browser checks; obtain owner visual approval.
F. Only after explicit separate approval: configure production release, sitemap, navigation, accurate public messaging, authorised films and sign-off.

## Hard release stop
The current branch is a private WORKSPACE branch, not permission to deploy. NO merge to main, NO public Pages deployment, NO publishing banner, NO production routes, NO live streaming, NO Cloudflare configuration change without separate owner approval.
