# QA matrix — V2 slice and release backlog

Statuses: `PASS_LOCAL`, `FAIL_LOCAL`, `NOT_RUN`, `BLOCKED_HOSTED`. Local means the built bundle in headless Chromium or static scripts; it does not imply a protected-preview pass.

| Check | Current result | Evidence / next action |
| --- | --- | --- |
| Canonical repo, base SHA, public isolation, preview branch and D1 separation | PASS_LOCAL/API | `BASELINE.md`; live Pages `main` deployment enabled and serving `7575829` per API. Never push to `main`. |
| Seven active nav targets and cancelled-product scan in source/preview bundle | PASS_LOCAL | `npm run check`, `npm run check:v2:bundle`; local old product paths return 404. Hosted old-route response still needs review. |
| Preview bundle and 45 HTML/internal link validation | PASS_LOCAL | `npm run build:preview`, `npm run check`; 1,205 internal references passed; 276 external links not reachability-checked. |
| Unit/provider/security checks | PASS_LOCAL | `npm test`: 155 pass, 0 fail. No remote migrations executed. |
| Home/Movies 320 first fold, links and repeated responsive layout | PASS_LOCAL | `browser-tests/v2-first-slice.pw.js`: 4/4 after the final assertion edit. [After screenshots](evidence/after/). |
| Whole Chromium browser suite | PASS_LOCAL | 243/243 on the final preview source. A production-loading unit test rewrites `dist/`, so unit and browser suites must run sequentially; the passing run used a stable preview bundle. |
| 320/360/390/430/768/1024/1440/1920, landscape and 200% text | NOT_RUN | Only 320 and 1440 screenshots retained for this slice; targeted browser tests cover more widths but do not replace full visual review. |
| Firefox/WebKit and real Android/iOS/assistive technology | NOT_RUN | Browser/device capability must be checked in future sessions; never call Chromium emulation a phone test. |
| Authenticated protected preview: served SHA, deployment ID, fonts, posters, APIs, console/network and interactions | BLOCKED_HOSTED | Cloudflare reports successful preview deployment `b0ae123c-ad7c-4243-93ff-82297d88fdc5` for `c18f52b` on the allowlisted branch. Direct HTTP CONNECT tunnel returns 403 before Access; served bytes and rendered state remain unverified. Deployment metadata alone is insufficient. |
| Production artifact build, published links, Worker dry run, dependency audit | PASS_LOCAL | `build:production`, `check:published` (45 HTML files, 1,210 internal references), `validate:worker --dry-run`, and `npm audit --audit-level=high` passed. This was an artifact build only; preview bundle was rebuilt afterward. |
| Versioned local fonts on seven routes | PASS_LOCAL | 14 headless preview-bundle captures at 320/1440 have zero failed requests, page errors or document overflow. Browser inspection found loaded Cormorant Garamond and DM Sans. No hosted font/CLS measurement yet. |
| Rights/commercial use, chart methodology, full catalogue/media audit | BLOCKED_HOSTED / NOT_RUN | No new licence inferred from preview token or CDN response. Source census is not rights approval. |

Release candidate requires P0/P1 closure or explicit external-blocker decisions, protected-preview browser proof and owner approval. The 100-point rubric in `GOAL.md` is not scored yet; no honest full-site comparison exists.
