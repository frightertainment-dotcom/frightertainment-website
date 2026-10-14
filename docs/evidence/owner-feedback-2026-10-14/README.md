# Owner screenshot response — 14 October 2026

These captures document the owner’s Home, Movies, Indie and Cinema feedback. The five JPEGs in `before/` are the owner’s uploaded screenshots (four site views and the cinema showing-board reference). The showing-board photograph is a visual reference only; it is not a site asset. The older seven-page baseline and after captures remain in `../before/` and `../after/`.

The 24 PNGs in `after/` are first-viewport and full-page captures at 390, 980 and 1440 **CSS pixels**, 900px viewport height, device-pixel ratio 1, system Chromium, fonts ready and reduced motion. The 980px capture models a phone’s desktop-site viewport in layout width; it is not a physical-phone browser-chrome test. `scripts/capture-owner-feedback.mjs` reproduces the captures from the local static site. API routes in these captures use controlled layout fixtures. The fallback art explicitly says Frightertainment art; it is not an official poster. Fixture TMDB scores, dates, poster availability and trailer key are **not live source claims**. The owner JPEGs show genuine posters from the earlier protected preview; these after captures cannot prove authenticated live data.

The additional `after/{movies,indie}-{390,980}-poster-controls.png` crops show the first poster’s independent source, TMDB badge, trailer and watchlist controls using a controlled fixture. The trailer key is deliberately test-only and is not an official clip.

`after/layout-matrix.json` records 189 local static fallback observations across seven destinations and 27 widths (320–1920 CSS pixels), plus seven simulated phone desktop-site observations and matching `{page}-phone-desktop-site980-first.jpg` captures. The former handover’s matrix and JPEGs were preserved unchanged. This new matrix found zero measured document-width, page-identity or editorial-containment issues; it cannot replace manual image inspection or a physical device.

| Area | Owner before | Local after (390) | Local after (980) | Local after (1440) |
| --- | --- | --- | --- | --- |
| Home | `before/owner-home-desktop-site.jpg` | `after/home-390-viewport.png`, `after/home-390-full.png` | `after/home-980-viewport.png`, `after/home-980-full.png` | `after/home-1440-viewport.png`, `after/home-1440-full.png` |
| Movies | `before/owner-movies-desktop-site.jpg` | `after/movies-390-viewport.png`, `after/movies-390-full.png` | `after/movies-980-viewport.png`, `after/movies-980-full.png` | `after/movies-1440-viewport.png`, `after/movies-1440-full.png` |
| Indie | `before/owner-indie-desktop-site.jpg` | `after/indie-390-viewport.png`, `after/indie-390-full.png` | `after/indie-980-viewport.png`, `after/indie-980-full.png` | `after/indie-1440-viewport.png`, `after/indie-1440-full.png` |
| Cinema | `before/owner-cinema-desktop-site.jpg`, `before/owner-cinema-board-reference.jpg` | `after/cinema-390-viewport.png`, `after/cinema-390-full.png` | `after/cinema-980-viewport.png`, `after/cinema-980-full.png` | `after/cinema-1440-viewport.png`, `after/cinema-1440-full.png` |

## Visual review and corrections

- Home: the watchlist now sits immediately under the feature; the chart shows its five rows in aligned tracks; the mobile Editorial Picks heading and link each stay on one line, with the link below the heading through 460px so font differences cannot squeeze it; Longlegs stays on one line at desktop-site width; category actions align across the row. No watchlist storage key or record format changed.
- Movies: the duplicate watchlist panel is removed, a five-entry chart uses the available width when a trailer is absent, and rating badges no longer escape the chart’s right edge. The eight film cards reserve poster dimensions before load.
- Film, TV and Indie shelves: source, rated badge, verified trailer and watchlist toggle are independent controls. The media link and footer link are separate from controls. The overlay is anchored to the poster media wrapper, so an extra-long footer title cannot push a trailer below the artwork. At 320–700px the shelf uses two poster columns; through 400px the rating sits below the source to keep both labels readable. A missing verified trailer creates no fake Play action.
- Indie: six real fetched picks can fill its shelf without a blank fourth column; fewer results remain truthful. The announcement and trailer sections preserve honest unavailable states.
- Cinema: the upcoming section uses four sourced rows styled as an illuminated midnight showing board. Film name and country-specific release date are side by side, with source and release-kind context retained. The original country selector and chronological diary remain in place.

The full Playwright suite and source checks are recorded in the append-only handover. Local screenshot inspection is separate from automated assertions. Authenticated Pages rendering remains blocked by the workspace proxy until it can be opened through authorized access.
