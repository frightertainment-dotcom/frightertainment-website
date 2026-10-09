# Staging D1 migration 0003: backup, application and recovery plan

**Status:** Prepared for owner review only. Migration 0003 has not been applied to the remote staging database.

## Scope and safeguards

- Target only the Cloudflare D1 database named `frightertainment-staging-discovery`, used by the access-protected private preview and staging Worker.
- Confirm the database name, account, database ID and Pages Function/Worker bindings in the Cloudflare dashboard immediately before any operation. Do not copy a production ID into a local config.
- The repository `wrangler.jsonc` is a separate local Worker config with a zero-ID placeholder. It is not a staging config and must not be used for a remote command.
- Obtain the owner's separate approval after reviewing this plan. Do not run any remote migration or change the preview binding until that approval is explicit.
- Run only in a quiet window, outside the daily 04:00 UTC ranking Cron. If the owner chooses to pause Cron, record and restore its prior state; do not alter it without authorization.

## Pre-migration inspection and backup

1. Use the owner-designated staging Wrangler config and authenticated Cloudflare account. Verify with `wrangler whoami` and inspect the config's D1 binding in the Cloudflare dashboard. Confirm that `frightertainment-staging-discovery` is the staging database and is not the production database.
2. Run the read-only remote migration listing. Proceed only if migration 0003 is the sole pending migration; stop if the database/account/config does not match, or any earlier migration is pending.

   ```sh
   wrangler d1 migrations list frightertainment-staging-discovery \
     --remote \
     --config "$STAGING_WRANGLER_CONFIG"
   ```
3. Create a private, access-restricted backup directory outside the Git checkout. Use restrictive file permissions and encrypted storage; do not place the dump in the repository, `dist`, screenshots, a public artifact, or a shared log.
4. Export the entire remote D1 database before changing it:

   ```sh
   umask 077
   mkdir -p "$BACKUP_DIR"
   wrangler d1 export frightertainment-staging-discovery \
     --remote \
     --config "$STAGING_WRANGLER_CONFIG" \
     --output "$BACKUP_DIR/frightertainment-staging-discovery-before-0003.sql"
   test -s "$BACKUP_DIR/frightertainment-staging-discovery-before-0003.sql"
   sha256sum "$BACKUP_DIR/frightertainment-staging-discovery-before-0003.sql" \
     > "$BACKUP_DIR/frightertainment-staging-discovery-before-0003.sha256"
   ```

5. Record the export time, byte size, SHA-256 digest and non-sensitive pre-migration row counts. Keep the backup and digest in owner-controlled encrypted storage.
6. Restore the export into a new isolated local D1 persistence directory. Confirm the SQL imports, expected tables and baseline row counts match the remote read-only checks. Never use the production binding for this restore test.

   ```sh
   wrangler d1 execute frightertainment-staging-discovery \
     --local \
     --config "$STAGING_WRANGLER_CONFIG" \
     --persist-to "$RESTORE_STATE_DIR" \
     --file "$BACKUP_DIR/frightertainment-staging-discovery-before-0003.sql"
   ```
7. Review migration 0003 and run the existing local migration tests against disposable local state. Confirm the migration adds the separate `film_year` and review provenance fields and the atomic annual snapshot/revision tables, backfills only the seven explicitly sourced film-year 2026 identities, and leaves the three territory-release-only records without a film year.

## Application, after separate approval

1. Reconfirm the backup digest and that the expected database remains the active staging target. Confirm the worker Cron is not about to run.
2. Apply the pending migrations only to the verified staging configuration:

   ```sh
   wrangler d1 migrations apply frightertainment-staging-discovery \
     --remote \
     --config "$STAGING_WRANGLER_CONFIG"
   ```

   Wrangler prompts for confirmation interactively and creates a post-application backup. If the migration list shows anything other than the approved migration set, stop rather than applying extra changes.
3. Inspect the migration ledger and verify the schema, canonical film count, review count, verified film-year values, three release-only `NULL` film years, empty pending ranking state, and last-good snapshot behavior. Run the staging Worker/Pages Function read-only checks and confirm no production binding is involved.
4. Record the operator, approval, start/end UTC times, migration ledger result, backup location/digest, row-count comparison and validation outcome. Keep the existing last-good published ranking until the updated calculation path is validated.

## Failure and recovery

- If export or local restore validation fails, stop before migration. Retain the diagnostic output and do not proceed without a verified backup.
- Wrangler reports that a failed migration is rolled back and the preceding successful migration remains applied. Stop on any error, check the migration ledger and logs, and do not blindly rerun.
- If migration 0003 succeeds but post-migration validation finds a problem, stop scheduled writes and preserve logs and the pre-migration export. Do not overwrite or delete the current staging database as an improvised rollback.
- Recovery should restore the pre-migration SQL into a **new isolated D1 database**, validate its schema and data, and then request separate owner approval before changing any preview Worker or Pages Function binding to that recovered database. Rebinding is a distinct Cloudflare change and is not authorized by approval to apply migration 0003.
- Keep the original database and the export intact until the owner accepts the recovered or migrated state. Do not apply this plan to production.

## Current data note

The read-only staging inventory recorded in `STAGING_AUTOMATION.md` has 10 approved rows whose staging `release_year` is 2026, while the public catalogue contains seven separately source-verified `filmYear=2026` claims among those identities. The three release-only records (`clayface`, `crawlers`, `werwulf`) must remain unranked for the 2026 film-year chart unless a separate eligible film-year source is verified. There are currently no approved critic review records, so migration 0003 must not be presented as creating ranked films.
