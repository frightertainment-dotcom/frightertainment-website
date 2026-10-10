# Frightertainment private-preview launch readiness and security review
**Audited:** 10 October 2026. **Scope:** Current code plus read-only Cloudflare Pages and Zone security configuration. **Release status:** HOLD — do not make the site publicly accessible until all release gates pass.

## Visitor-facing defects corrected
- The Recent Releases anchor previously led to a UK-only editorial area hidden for all other cinema territories. The Cinema page now uses a dedicated `cinema-recent` catalogue mode with region-specific theatrical dates from the last 90 days, verified from TMDB's detailed release-date records. Its anchor remains accessible after changing country. The Cinema page no longer displays the UK-only developer note.
- Long rights and publishing process notes from the Games, Podcasts, TV and Indie landings were relocated to the Credits and Attribution page. TMDB attribution and external publisher credits remain, including explicit links where applicable. The main Frightertainment logo and section artwork are unchanged.
- The code uses the existing regional selector across both Cinema lists and retains a user preference in localStorage; historic Horror Vault data remains untouched.

## Security controls verified or implemented
- The public Pages build copies only an approved allowlist of files. The D1 Worker implementation, scripts, test fixtures, internal markdown, developer-only data, and provider credentials are excluded. Preview Pages are noindex and retain the existing Cloudflare Access gate.
- Static responses have a restrictive CSP (no unsafe-inline scripts, no unsafe-eval, allowlisted media frames), HSTS, frame protection, nosniff, limited browser capabilities, Cross-Origin-Opener-Policy and Cross-Origin-Resource-Policy. Dynamic JSON endpoints use restrictive response headers.
- User-supplied film and media text is escaped; trailer embed IDs are format checked and official-video matched; TMDB token is held server-side. Admin endpoints require the secret Bearer token, with bounded request bodies, strict input validation, no permissive cross-origin response headers.
- The contact form enforces same-origin/Cross-Site restrictions, bounded byte length (including chunked requests), strictly typed inputs, email-header control-character rejection, a honeypot, fixed sending recipient, and a fail-closed response when email delivery isn't configured.
- The **Cloudflare zone** has a dedicated, enabled WAF rate-limiting rule for POST `/api/contact`: block after more than 5 submissions per IP in 10 seconds (10-second mitigation). This affects the zone frightertainment.com and www, not *.pages.dev; the latter remain behind Access.
- CI runs dependency audit for high/critical advisories, unit tests, site/browser tests, Worker dry run, D1 local migrations, public/private build separation and link checks.

## Release-blocking external configuration (verified)
- `frightertainment-private-preview` Preview has a D1 `DB` binding and server-side TMDB flags/secret configured.
- `frightertainment-live` **Production has no D1 database binding**, and no approved TMDB environment configuration. Browser-side movie, chart and Cinema discovery APIs cannot work as intended on that production project yet. Do not copy Preview's provider secret, database or approval flags blindly.
- Neither project's observed configuration has an `EMAIL` binding; the contact form will truthfully offer the mailto fallback until genuine delivery is installed and tested. The existing visible form cannot yet be counted as a fully functional backend delivery feature.
- At the time of inspection the live project's deployments stayed idle and the public-facing apex, www, and Pages hostnames remained behind Cloudflare Access. Keep them gated until explicit owner sign-off.
- TMDB's noncommercial approval and data licences must be checked for the **actual public use**, especially if advertising or other commercial activity will be added. Recheck poster, trailer and game material source rights before public launch.

## Owner launch gates (no automatic public launch)
1. Provision an independently appropriate production D1 binding `DB` and apply verified migrations. Do not unintentionally publish draft/preview-only records.
2. Confirm the production TMDB API terms/permissions and set the correct encrypted production token, source attribution flags and caching configuration. Avoid blindly enabling Preview-only on-demand update flags.
3. Choose between a real `EMAIL` delivery binding (test an end-to-end submission and anti-abuse controls) or simplifying the Contact page to an honest email link.
4. Run staging and then production-equivalent smoke tests for `/api/catalogue?type=movie&mode=cinema&country=GB`, `/api/catalogue?type=movie&mode=cinema-recent&country=AU`, year charts, TV/Indie loading, archive browse/search, posters, trailer dialog, podcast and games destinations, contact, 320/375/390/768/1440px responsiveness.
5. Confirm Cloudflare Access remains protective until owner approval; verify WAF, DNS/TLS, security headers and monitoring without lowering existing gates. Make a staged production deployment and smoke test protected production before lifting Access.
6. Record exact approved commit, CI completion, working deployment URL and owner acceptance before launch; never treat a successful build alone as proof of the whole live service's availability.

## Residual risk, not represented as completed
A full manual verification of every external destination and every official trailer across the thousands of horror-film archive records has not yet been completed. Cloudflare security features and input validation reduce risk but cannot guarantee that a publicly accessible site is free from all vulnerabilities. A production security audit and smoke test still require correctly provisioned production services.
