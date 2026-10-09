# Frightertainment website management and launch control

Owner brief: 9 October 2026. Coordinator: PAT. This is an operating specification and launch checklist, not evidence that production has launched or that a ratings feed is active.

## Owner's intended outcome

Maintain the existing six-section Frightertainment site as a polished horror discovery service. Preserve the logo, six tabs, distinct themed areas, text-led poster artwork pending rights, accessible animations, movie archives and official trailer links. Review current movie information and available visitor statistics regularly. Report proposed changes to the owner and publish only the approved change set. Development must not routinely take the public website offline.

## Daily review is configured

The existing Frightertainment Release Watch has been changed to **Frightertainment Daily Manager**, beginning 10 October 2026, around 08:00 Europe/London. It is a ChatGPT scheduled review, not a Cloudflare data-ingestion Cron or 24-hour uptime guarantee. It depends on the tools and account permissions available during execution. It must report an access failure honestly.

The task is read-only: no automatic Git commits, website data edits, migrations, paid services, emails or deployments. It checks publicly reachable pages; reads GitHub/Cloudflare when available; reviews official current film announcements and approved ratings sources; and returns a dated, evidence-linked proposal. On Mondays it includes a deeper archive and source-freshness audit. Enable task notifications in the owner's ChatGPT/device settings as needed; a configured task does not itself prove notification delivery.

Use the repository and live connectors as the durable source of operational truth. Scheduled tasks must not depend on files uploaded only to a conversation or Project. Never place API credentials, database exports, signed backup URLs, private analytics payloads or authentication cookies in this public repository.

## Publication model: two environments, one reviewed release

- **Public production:** the intended destination is www.frightertainment.com. It serves only the last approved release and published data snapshot. Do not edit it in place during development.
- **Private staging:** the existing Access-protected Frightertainment preview is the testing environment. It uses its own D1 binding and credentials and retains noindex protections. Access must cover all reachable preview aliases and hash-based deployments; robots.txt alone is not access control.
- Shared source/templates and locked dependencies prevent two independently maintained websites drifting apart. A release records a source commit, content snapshot/version, supported schema version and expected environment differences.
- Production and staging must NOT share a writable database. Never mirror secrets, admin state or test fixtures into production. Promote only validated, permission-cleared public content.
- After testing, the owner approves a particular dated change set. Build/deploy the same reviewed source and content version with explicitly tested environment configuration. Keep the previous successful production deployment available for rollback.
- Production build output must not inherit staging noindex headers, disallow-all robots.txt, preview canonicals, Access login requirements or development notices. Conversely, do not expose staging by copying production settings onto it.
- An approval is scoped: approving a content change does not approve DNS edits, subscriptions, migrations, secret changes or unrelated new features.
- Use backward-compatible database changes with verified backups; a static code rollback does not roll back a database migration.

## Fright Rating: truthful public branding

The requested public label is **Fright Rating**. Do not invent a proprietary rating by adding or subtracting 0.1 from another site's number, or rebrand an unchanged copied rating as an original review. A numerical overlap is fine when it arises from the declared method.

The recommended calculation, pending consistent implementation and owner review, is a **critic composite /10**, not a personal scare-intensity measurement:

`Fright Rating = round(mean(10 * score / original_scale), 1)`

Use the existing distinct-professional-critic eligibility, minimum-review threshold and source/reuse verification unless a separately reviewed methodology change is approved. Keep scores unaltered in source records; record the transformation, methodology version, critic count, source URLs and actual check time. Source permissions must cover the intended public use and refresh/storage behaviour. Do not activate a source just because it can be viewed in a browser.

Do not average Rotten Tomatoes' positive-review percentage with numeric quality ratings as if they measure the same thing. Do not mix audience votes, popularity, box office, or genre interest into this critic rating. A future audience rating must be separately named. An aggregator-of-aggregators would be a different published method with overlap/weighting limitations, not the existing distinct-critic calculation.

Rotten Tomatoes' public licensing page requests approval for API/data-feed integration; its terms restrict unapproved data extraction, modification and republication. Merely changing or averaging scores is not evidence of reuse permission. Consult the actual source agreement before integration. Original editorial ratings are another possible route, but require genuine attributable assessments, not fabricated claims that PAT or a reviewer watched a film.

References reviewed for this policy:
- https://www.rottentomatoes.com/about
- https://www.rottentomatoes.com/help_desk/licensing
- https://www.rottentomatoes.com/policies/terms-of-use

## The 2026 Top 20

There is no universal external 'real Top 20'. Frightertainment must state its own method and eligible catalogue scope, rather than copy a publisher's order while implying a different source. Compare reference charts to identify candidate films and changed evidence, but do not treat that comparison as an approved ratings-data feed.

The full chart needs 20 distinct qualifying film identities and defensible scores to display 20 ranked positions. Unreviewed entries must remain separate and unnumbered; no filler scores. Scores and rank movement must derive from the same approved snapshot on the homepage, annual page and film detail pages.

Document which release event and territory determine annual eligibility. Original film/festival year, first general-audience release, UK release and re-release are not interchangeable. Preserve the existing verified film-year rules until a replacement is explicitly accepted and tested. Do not silently exclude a legitimate candidate merely because its source claim has not yet been researched; queue it for verification instead.

Each proposal should identify: eligible title IDs; prior and proposed ranks/scores; real contributing review count; source evidence and check dates; actual new entrants/exits; method version; and any coverage or rights limitation. Compare with the previous approved published snapshot, not an unapproved research draft. Daily research does not mean scores should change daily.

## Launch baseline checked 9 October 2026, about 20:24 UTC

Read-only connected-account checks found one Cloudflare Pages project: the private preview. Its production deployments were disabled, preview deployments were limited to codex/frightertainment-v1, and its build command was npm run build:preview. That builder deliberately injects noindex protections. No public apex/www A, AAAA or CNAME record was returned by the zone query. No Web Analytics site was returned by the listing check. These observations mean a working public/private production pair and visitor analytics have NOT been verified.

D1 held 20 canonical film rows, zero critic review rows and zero rank-history rows. The annual_ranking_snapshots, critic_review_revisions and d1_migrations tables were absent. The sole recorded daily ranking run had completed at 04:00 UTC with zero results. This is calculation execution, not a live populated rating feed. No live schema changes were made during this check.

The development PR and PAT review PR were still draft/unmerged. The PAT branch's existing quality run 37985429239 passed. Green CI is not proof of authenticated preview playback, production data availability, licence clearance or a full security audit.

## Concrete launch gates

1. Public/private environment wiring: prepare the production project, intended domain mapping, separate data/secrets and explicit build modes. Record and obtain release/configuration approval before any public cutover.
2. Source-backed chart: complete film eligibility research and obtain enough approved usable critic data for the intended 20 positions, or separately agree an honest editorial launch format. No fabricated substitutes.
3. Data integration: verify the full-backup gate, isolated restore and migration rehearsal before remote D1 changes; then separately approve migration and compatible scheduler deployment. A scheduled research report is not a database backup or migration approval.
4. Page quality: verify six tabs, all internal destinations/anchors, archive year links and search, generated film pages, long mobile titles, readable text, correct focus states and reduced motion.
5. Media: keep text-led covers until licensed; verify genuine YouTube playback in an authenticated browser, not just iframe creation; provide working fallbacks.
6. External destinations: review the outstanding outgoing links at reasonable rates; distinguish unavailable, removed and automation-blocked pages. Do not claim every external link works from the internal checker.
7. Public package: inspect the actual production build for accidental noindex/preview metadata, developer-only content, exposed source/fixtures and incorrect canonical URLs. Keep necessary source, privacy and rights notices.
8. Operational safety: verify security headers on static and function responses, auth/rate limits, dependencies, backup/restore, rollback plan and failure alerts. No 'unhackable' guarantee.
9. Measurement: configure approved privacy-conscious analytics and distinguish visitors/page views from edge requests or bots. Set a first baseline before claiming growth or losses.
10. Final release: document the exact tested commit/content snapshot, remaining limitations and rollback target; owner approval; deploy; then check the real public homepage, tab routes, chart, trailers and endpoint health. Do not announce live status based only on a build job.

## Daily report structure

- Website health and any urgent issue.
- Available analytics for comparable completed periods, or an explicit unavailable status.
- New/changed official releases and catalogue candidates with territory and source date.
- Fright Rating/Top 20 evidence changes under the approved methodology; no invented motion.
- Proposed updates: current -> proposed, affected pages and source links.
- Testing/rights/cost dependencies, then an approval request for the identified change set.

If there is no meaningful content change, report that rather than manufacture one. Preserve all historical film archives. The live site remains on its previous approved release until a new release is approved and successfully published.
