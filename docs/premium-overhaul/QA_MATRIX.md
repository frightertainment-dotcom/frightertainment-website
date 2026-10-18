# QA matrix — V2 slice and release backlog

Statuses: `PASS_LOCAL`, `FAIL_LOCAL`, `NOT_RUN`, `BLOCKED_HOSTED`. Local means the built bundle in headless Chromium or static scripts; it does not imply a protected-preview pass.

| Check | Current result | Evidence / next action |
| --- | --- | --- |
| Canonical repo, base SHA, public isolation, preview branch and D1 separation | PASS_LOCAL/API | `BASELINE.md`; live Pages `main` deployment enabled and serving `7575829` per API. Never push to `main`. |
| Seven active nav targets and cancelled-product scan in source/preview bundle | PASS_LOCAL | `npm run check`, `npm run check:v2:bundle`; local old product paths return 404. Hosted old-route response still needs review. |
| Preview bundle and 45 HTML/internal link validation | PASS_LOCAL | Final `npm run build:preview`, `npm run check`, `check:v2:bundle`; 1,202 internal references passed; 276 external links not reachability-checked. |
| Unit/provider/security checks | PASS_LOCAL | `npm test`: 155 pass, 0 fail. No remote migrations executed. |
| Home/Movies 320 first fold, links and repeated responsive layout | PASS_LOCAL | `browser-tests/v2-first-slice.pw.js`: 4/4 on the final preview bundle. [After screenshots](evidence/after/). |
| Home Cinema diary and TV/Indie first-fold/archive journeys | PASS_LOCAL | Source-priority/expiry, upstream failure and no-JS Cinema states; TV/Indie title-before-dock and archive jumps. `browser-tests/v2-phase3.pw.js`: 6/6. Four-width [TV/Indie observations](evidence/phase3-local/observations.json). |
| Whole Chromium browser suite | PASS_LOCAL with corrected assertions | Full run: 245/248 passed; three failures asserted the former Cinema nav href and the former side-by-side TV/Indie placeholder layout. Those test-only assertions were corrected, then all 46 affected/regression tests passed on the rebuilt final source. A production-loading unit test rewrites `dist/`, so unit and browser suites ran serially. This is **not** a second clean full-suite run. |
| 320/360/390/430/768/1024/1440/1920, landscape and 200% text | NOT_RUN | Seven-route first views retained at 320/1440; TV/Indie additional 390/768 first views and 320/1440 full pages. Targeted browser tests cover more widths, but no complete visual review across all required states. |
| Firefox/WebKit and real Android/iOS/assistive technology | NOT_RUN | Browser/device capability must be checked in future sessions; never call Chromium emulation a phone test. |
| Authenticated protected preview: served SHA, deployment ID, fonts, posters, APIs, console/network and interactions | BLOCKED_HOSTED | Cloudflare reports successful preview deployment `b0ae123c-ad7c-4243-93ff-82297d88fdc5` for `c18f52b` on the allowlisted branch. Direct HTTP CONNECT tunnel returns 403 before Access; served bytes and rendered state remain unverified. Deployment metadata alone is insufficient. |
| Production artifact build, published links, Worker dry run, dependency audit | PASS_LOCAL | Latest `build:production` and `check:published` passed (45 HTML files, 1,207 internal references); previous Worker dry run and `npm audit --audit-level=high` passed. This was an artifact build only; preview bundle was rebuilt afterward. |
| Versioned local fonts on seven routes | PASS_LOCAL | Final 14 headless preview-bundle captures at 320/1440 returned 200 and had zero failed requests, page errors or document overflow. Browser inspection found loaded Cormorant Garamond and DM Sans. No hosted font/CLS measurement yet. |
| Rights/commercial use, chart methodology, full catalogue/media audit | BLOCKED_HOSTED / NOT_RUN | No new licence inferred from preview token or CDN response. Source census is not rights approval. |

Release candidate requires P0/P1 closure or explicit external-blocker decisions, protected-preview browser proof and owner approval. The 100-point rubric in `GOAL.md` is not scored yet; no honest full-site comparison exists.
