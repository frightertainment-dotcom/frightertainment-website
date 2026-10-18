# V2 release gates — production unchanged

The current public Pages project is `frightertainment-live`. API inspection on 18 October 2026 reports successful production deployment `74837293-03a3-4bbb-8e3c-82a9c65fd0d7` for `main` SHA `7575829c3719f3e9fcb0d7637681bf69f4323b72`; production deployments are enabled. The public host could not be rendered from this workspace because its HTTP tunnel failed before Cloudflare Access. This overhaul has made no production push, deployment, DNS, Access or database change.

| Gate | Current state |
| --- | --- |
| Protected preview | Preview project, repo, branch allowlist, Access wildcard app and separate staging D1 binding verified by Cloudflare API. Deployment `b0ae123c-ad7c-4243-93ff-82297d88fdc5` succeeded for `c18f52b2da00f94d0f1d0fd8c47046f8649dffd6` at `https://b0ae123c.frightertainment-private-preview.pages.dev`. The cloud HTTP CONNECT tunnel returns 403 before Access, so the hosted served bytes, rendered state, font/poster/API loading and interactions are unverified. |
| Local release artifact | `build:production` and `check:published` passed for 45 HTML files; these commands only wrote `dist/` in the cloud workspace. Worker dry run and full dependency audit passed. The production artifact was never uploaded. |
| Data isolation | Preview `DB` is staging and live `DB` is production, with distinct IDs verified. Local captures read static files only. No remote schema migration or catalogue write was run. Any future preview write test must prove it targets disposable/approved staging data. |
| Rights | Original brand and title artwork preserved. No new third-party poster/image copied into the repo. Existing TMDB token is masked server-side; non-commercial flag presence is not a blanket commercial poster or redistribution licence. Podcast/game cover rights and 276 external link destinations require review. |
| Fright Rating | Staging and production currently report zero critic-review and rank-history rows. Formula, source permissions, eligibility, precision, tie policy and a 20-title 2026 snapshot are not approved/verified for V2 publication. A pending chart is the honest state. |
| Seven pages and supporting routes | Home/Movies first slice locally implemented, not hosted verified. TV, Cinema, Indie, Podcasts, Games and secondary journeys remain incomplete. P0/P1 release issues stay open. |
| Rollback | Cloudflare retains prior deployment IDs; redeploy procedure and restoration of any future schema/data change have **not** been rehearsed for this overhaul. No remote schema change is authorised from this file. |
| Owner approval | Explicit approval of a specific tested release is absent. Do not merge/push `main`, deploy `frightertainment-live`, change DNS/Access/security controls or claim a public launch. |

Before requesting approval, complete protected-preview visual/function/browser/accessibility/performance checks, rights/data gates, full catalogue coverage report and a release-candidate diff. After approval, identify the exact release SHA and rollback deployment, then perform a controlled release and post-release checks; no such release is part of the current task authority.
