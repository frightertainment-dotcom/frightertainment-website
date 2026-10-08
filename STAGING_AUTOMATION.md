# Frightertainment staging automation and editorial operations

This document describes the **private staging deployment**, not the public domain or an approved commercial data feed.

## Deployed staging components (8 October 2026)

- Cloudflare Pages project: `frightertainment-private-preview`. Branch alias: `codex-frightertainment-v1.frightertainment-private-preview.pages.dev`. Cloudflare Access restricts preview subdomains to the owner account. Git integration: branch `codex/frightertainment-v1` only; production deployments from `main` disabled.
- Pages Functions at `functions/api/[[path]].js` send API requests to the first-party Worker router in `worker/index.js`. A separate staging D1 database is bound as `DB` in **preview** configuration only. Other static requests do not invoke the Worker.
- Scheduler Worker: `frightertainment-staging-daily`, independent of production domains and with `workers.dev` disabled. Its Cron Trigger is `0 4 * * *`, meaning every day at **04:00 UTC**. It is bound only to the staging database and runs the SQL calculation in `worker/staging-rankings.js`. This schedule has been created and its database binding checked; future scheduled executions must still be observed in Worker logs.
- Staging D1 migrations `0001_initial.sql` and `0002_manual_sync_and_cinema_limits.sql` have been applied. Twenty initially source-matched and editorially verified film records were imported into `canonical_films`. Additional movies appear in static site records. No critic reviews were imported or fabricated.
- An explicit read-only source-driven release calendar (`release-calendar.js`) updates its future/past status on page view. Release territory is displayed and cinema/showtime availability is **not inferred**.
- Editorial catalogues (`data/editorial.json`) provide separate TV, podcast, game and independent-film recommendations. Entries are expanded to source-linked HTML by `scripts/build-editorial.mjs`.

## Correctness and source rights

The **Top 20** shows genuine ranked films **only** after at least three distinct professional numeric critic ratings for each film have their source, identity, score, date and re-use permission individually verified and approved. The current D1 seed includes **zero approved numeric critic reviews**, so Top 20 remains **pending**. The clearly labelled unranked film watchlist is a separate editorial discovery aid.

The daily scheduler **recalculates approved ratings; it does not acquire scores**. No legal free, unattended professional-review feed has yet been approved. Do not copy Rotten Tomatoes Tomatometer percentages, Metacritic weighted scores, reviews, images, provider rating APIs or user ratings into this equal-mean critic average unless permitted and methodologically consistent. Do not invent chart positions.

Owner setup needed before **new** critic reviews can publish:
1. Confirm permission to republish each numeric review score or secure an appropriately licensed critic-data feed. Preserve permission evidence and primary review URL.
2. Set a strong `ADMIN_TOKEN` secret in **preview environment only** through Cloudflare, not in Git or browser code.
3. Use protected admin submission `POST /api/admin/reviews`; each valid submission is staged for review, and `POST /api/admin/reviews/approve` requires explicit editorial approval.
4. Confirm data in D1 and wait until the next scheduled ranking run (or use a reviewed manual recovery process) before interpreting daily rank changes.

Provider flags and credentials for MovieGlu, Watchmode, and TMDB are deliberately absent. Cinema showtimes and country-specific streaming availability remain unavailable until commercial terms, relevant territory rights, permitted imagery and API secrets are approved. **No new payments or subscriptions are authorised.**

## Validation and troubleshooting

Use `npm run build:pages && npm run check && npm test && npm run test:browser` and monitor GitHub Actions on the latest commit. Pages deploys have a separate Cloudflare success/failure state; a successful GitHub Actions build alone does not prove a successful Pages deployment. Inspect the Cloudflare build logs if a deployment fails.

Example read-only D1 queries from an account-authorised environment:

```sql
SELECT COUNT(*) AS film_count FROM canonical_films;
SELECT COUNT(*) AS eligible_reviews FROM critic_reviews
  WHERE status='approved' AND permission_cleared=1 AND professional_verified=1;
SELECT release_year, COUNT(*) AS ranked_count, MAX(ranked_at) AS updated_at
  FROM rank_history GROUP BY release_year;
SELECT task, status, started_at, error_code
  FROM update_runs ORDER BY started_at DESC LIMIT 20;
```

Never expose private admin tokens in Pages JavaScript; never point the preview binding to a production database. The public domain and DNS must not change without owner approval.
