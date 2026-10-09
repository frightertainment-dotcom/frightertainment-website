import {
  averageReviews, buildAnnualRanking, isISOAlpha2, isISODate, normalizeReview, validateDataset
} from '../src/core.js';
import {
  discoverHorrorCandidates, fetchNearbyShowtimes, refreshComingSoon,
  refreshStreaming, refreshStreamingReleases, refreshTheatricalReleases, refreshTrending
} from './providers.js';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'strict-transport-security': 'max-age=31536000',
  'content-security-policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  'permissions-policy': 'camera=(), microphone=(), geolocation=()'
};
const countryPattern = /^[A-Z]{2}$/;
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const nowIso = () => new Date().toISOString();
const today = () => nowIso().slice(0, 10);
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...headers } });
const safeError = error => ({ code: error?.name === 'TypeError' ? 'invalid_data' : 'provider_or_storage_error', message: String(error?.message || 'Unknown error').slice(0, 300) });
const configuredCountries = env => new Set((env.DISCOVERY_COUNTRIES || env.DEFAULT_COUNTRY || 'GB').split(',').map(value => value.trim().toUpperCase()).filter(isISOAlpha2));
const countryOf = (request, env) => {
  const country = new URL(request.url).searchParams.get('country') || env.DEFAULT_COUNTRY || 'GB';
  if (!countryPattern.test(country) || !isISOAlpha2(country) || !configuredCountries(env).has(country)) throw new HttpError(400, 'Unsupported country code');
  return country;
};
const log = (event, details = {}) => console.log(JSON.stringify({ event, at: nowIso(), ...details }));
const id = () => crypto.randomUUID();

async function loadDataset(db, kind, country) {
  const row = await db.prepare(`SELECT s.* FROM current_datasets c JOIN dataset_snapshots s USING(snapshot_id)
    WHERE c.kind = ? AND c.country_code = ?`).bind(kind, country).first();
  if (!row) return { status: 'unavailable', updatedAt: null, source: null, items: [] };
  let payload;
  try { payload = JSON.parse(row.payload_json); } catch { return { status: 'invalid', updatedAt: row.updated_at, source: row.source_name, items: [] }; }
  const expired = Date.parse(row.expires_at) <= Date.now();
  return { ...payload, status: expired ? 'stale' : 'current', updatedAt: row.updated_at, expiresAt: row.expires_at };
}

async function publishDataset(db, dataset, maxAgeMs) {
  validateDataset(dataset);
  const snapshotId = id();
  const updatedAt = nowIso();
  const expiresAt = new Date(Date.now() + maxAgeMs).toISOString();
  const payload = JSON.stringify(dataset);
  await db.batch([
    db.prepare(`INSERT INTO dataset_snapshots(snapshot_id, kind, country_code, source_name, source_url, territory, checked_at, updated_at, expires_at, payload_json)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(snapshotId, dataset.kind, dataset.country || '', dataset.sourceName, dataset.sourceUrl, dataset.territory, dataset.checkedAt, updatedAt, expiresAt, payload),
    db.prepare(`INSERT INTO current_datasets(kind, country_code, snapshot_id) VALUES(?, ?, ?)
      ON CONFLICT(kind, country_code) DO UPDATE SET snapshot_id = excluded.snapshot_id`)
      .bind(dataset.kind, dataset.country || '', snapshotId)
  ]);
  return dataset.items.length;
}

async function logRun(db, task, country, trigger, status, startedAt, error = null, count = 0) {
  const finishedAt = nowIso();
  await db.prepare(`INSERT INTO update_runs(run_id, task, country_code, trigger_name, status, started_at, finished_at, record_count, error_code, error_message)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id(), task, country || '', trigger, status, startedAt, finishedAt, count, error?.code || null, error?.message || null).run();
}

async function refreshTask(env, task, country, loader, maxAgeMs, trigger) {
  const startedAt = nowIso();
  try {
    const dataset = await loader();
    const count = await publishDataset(env.DB, dataset, maxAgeMs);
    await logRun(env.DB, task, country, trigger, 'published', startedAt, null, count);
    log('refresh_published', { task, country, count });
    return { task, status: 'published', count };
  } catch (error) {
    const issue = safeError(error);
    try { await logRun(env.DB, task, country, trigger, 'failed', startedAt, issue); }
    catch (logError) { log('update_log_failed', { task, error: safeError(logError) }); }
    log('refresh_failed_last_good_retained', { task, country, error: issue });
    return { task, status: 'retained', error: issue };
  }
}

async function recordCandidates(env, candidates, country) {
  const statements = candidates.map(candidate => env.DB.prepare(`INSERT INTO review_queue(item_id, item_kind, source_name, source_url, territory, payload_json, reasons_json, created_at)
    VALUES(?, 'film-candidate', ?, ?, ?, ?, ?, ?)
    ON CONFLICT(item_id) DO NOTHING`).bind(candidate.id, candidate.sourceName, candidate.sourceUrl, country,
      JSON.stringify(candidate), JSON.stringify(['Automated discovery candidate; verify all public claims against primary sources']), nowIso()));
  if (statements.length) await env.DB.batch(statements);
  return statements.length;
}

async function refreshRankingHistory(env, year) {
  const [{ results: films }, { results: reviews }, { results: prior }] = await Promise.all([
    env.DB.prepare(`SELECT film_id AS id, title, release_year AS releaseYear FROM canonical_films WHERE editorial_status = 'approved' AND horror_verified = 1 AND release_year = ?`).bind(year).all(),
    env.DB.prepare(`SELECT film_id AS filmId, release_year AS releaseYear, critic_id AS criticId, critic_name AS criticName, publication, publication_url AS publicationUrl, review_url AS reviewUrl,
      score, score_out_of AS scoreOutOf, territory, published_at AS publishedAt, checked_at AS checkedAt, (permission_cleared = 1) AS permissionCleared, (professional_verified = 1) AS professionalVerified,
      'numeric-professional-review' AS ratingKind FROM critic_reviews WHERE status = 'approved' AND permission_cleared = 1 AND professional_verified = 1 AND release_year = ?`).bind(year).all(),
    env.DB.prepare(`SELECT film_id AS filmId, position FROM rank_history WHERE release_year = ? AND ranked_at = (SELECT MAX(ranked_at) FROM rank_history WHERE release_year = ?)`).bind(year, year).all()
  ]);
  const ranking = buildAnnualRanking(films, reviews, year, prior);
  const date = today();
  const rows = ranking.map(row => env.DB.prepare(`INSERT INTO rank_history(release_year, film_id, position, average_score, critic_count, ranked_at)
    VALUES(?, ?, ?, ?, ?, ?) ON CONFLICT(release_year, film_id, ranked_at) DO UPDATE SET position = excluded.position, average_score = excluded.average_score, critic_count = excluded.critic_count`)
    .bind(year, row.filmId, row.position, row.average, row.criticCount, date));
  if (rows.length) await env.DB.batch(rows);
  return ranking.length;
}

async function handleRanking(env, request) {
  const yearValue = new URL(request.url).searchParams.get('year') || String(new Date().getUTCFullYear());
  const year = Number(yearValue);
  if (!Number.isInteger(year) || year < 1888 || year > new Date().getUTCFullYear() + 2) return json({ error: 'Invalid ranking year' }, 400);
  const [{ results: films }, { results: reviews }, { results: prior }, { results: history }] = await Promise.all([
    env.DB.prepare(`SELECT film_id AS id, title, release_year AS releaseYear FROM canonical_films WHERE editorial_status = 'approved' AND horror_verified = 1 AND release_year = ? ORDER BY title`).bind(year).all(),
    env.DB.prepare(`SELECT film_id AS filmId, release_year AS releaseYear, critic_id AS criticId, critic_name AS criticName, publication, publication_url AS publicationUrl, review_url AS reviewUrl,
      score, score_out_of AS scoreOutOf, territory, published_at AS publishedAt, checked_at AS checkedAt, (permission_cleared = 1) AS permissionCleared, (professional_verified = 1) AS professionalVerified,
      'numeric-professional-review' AS ratingKind FROM critic_reviews WHERE status = 'approved' AND permission_cleared = 1 AND professional_verified = 1 AND release_year = ? ORDER BY published_at`).bind(year).all(),
    env.DB.prepare(`SELECT film_id AS filmId, position FROM rank_history WHERE release_year = ? AND ranked_at < ? ORDER BY ranked_at DESC`).bind(year, today()).all(),
    env.DB.prepare(`SELECT MAX(ranked_at) AS rankedAt FROM rank_history WHERE release_year = ?`).bind(year).first()
  ]);
  const previousByFilm = new Map();
  for (const row of prior) if (!previousByFilm.has(row.filmId)) previousByFilm.set(row.filmId, row.position);
  const ranking = buildAnnualRanking(films, reviews, year, [...previousByFilm].map(([filmId, position]) => ({ filmId, position })));
  const pending = films.filter(film => averageReviews(reviews.filter(review => review.filmId === film.id)).status === 'pending').length;
  return json({ year, status: ranking.length ? 'ranked' : 'pending', minimumCritics: Number(env.MINIMUM_CRITICS) || 3,
    methodology: 'Equal-weight average of distinct, permission-cleared, verified professional numeric critic ratings normalized to /100; rounded to the nearest whole point. Audience scores and aggregator percentages are excluded.',
    updatedAt: history?.rankedAt || null, rankedFilms: ranking.length, pendingFilmCount: pending, items: ranking.map(row => ({
      filmId: row.filmId, title: row.title, position: row.position, averageScore: row.average, criticCount: row.criticCount,
      movement: row.movement, movementLabel: row.movementLabel,
      sources: row.reviews.map(review => ({ critic: review.criticName, publication: review.publication, url: review.reviewUrl, territory: review.territory, checkedAt: review.checkedAt }))
    })) });
}

async function handleDiscovery(env, request) {
  const country = countryOf(request, env);
  const kinds = ['coming-soon', 'streaming-availability', 'streaming-releases', 'theatrical-releases', 'trending-horror'];
  const datasets = await Promise.all(kinds.map(async kind => [kind, await loadDataset(env.DB, kind, country)]));
  return json({ country, updatedAt: datasets.map(([, data]) => data.updatedAt).filter(Boolean).sort().at(-1) || null,
    datasets: Object.fromEntries(datasets) }, 200, { 'cache-control': 'public, max-age=60, stale-while-revalidate=300' });
}

async function handleCinema(env, request) {
  const country = countryOf(request, env);
  const body = await readBody(request);
  const { filmId, lat: rawLat, lon: rawLon } = body;
  const date = body.date || today();
  const lat = Number(rawLat);
  const lon = Number(rawLon);
  if (!filmId || !isISODate(date) || Math.abs(Date.now() - Date.parse(`${date}T00:00:00Z`)) > 2 * 86_400_000) return json({ error: 'A film, current screening date and location are required' }, 400, { 'cache-control': 'no-store' });
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return json({ error: 'Valid browser geolocation is required' }, 400, { 'cache-control': 'no-store' });
  const film = await env.DB.prepare(`SELECT film_id, title, movieglu_id FROM canonical_films WHERE film_id = ? AND editorial_status = 'approved' AND horror_verified = 1`).bind(filmId).first();
  if (!film) return json({ error: 'No verified local cinema listing is available for this film' }, 404, { 'cache-control': 'no-store' });
  const limited = await cinemaRateLimited(env, request);
  if (limited) return json({ error: 'Showtime request limit reached. Please retry in one minute.' }, 429, { 'cache-control': 'no-store', 'retry-after': '60' });
  try {
    const result = await fetchNearbyShowtimes(env, film, country, { lat, lon }, date);
    return json(result, 200, { 'cache-control': 'no-store' });
  } catch (error) { return json({ error: safeError(error), source: 'MovieGlu', status: 'unavailable' }, 503, { 'cache-control': 'no-store' }); }
}

async function cinemaRateLimited(env, request) {
  if (!env.CINEMA_RATE_LIMIT_SALT) throw new HttpError(503, 'Cinema lookup is not configured');
  const address = request.headers.get('cf-connecting-ip') || 'local-development';
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.CINEMA_RATE_LIMIT_SALT), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(address));
  const client = [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
  const window = Math.floor(Date.now() / 60_000) * 60_000;
  const row = await env.DB.prepare(`INSERT INTO cinema_rate_limits(client_digest, window_started, request_count) VALUES(?, ?, 1)
    ON CONFLICT(client_digest) DO UPDATE SET request_count = CASE WHEN window_started = excluded.window_started THEN request_count + 1 ELSE 1 END,
      window_started = excluded.window_started RETURNING request_count`).bind(client, window).first();
  return Number(row?.request_count || 0) > 10;
}

async function handleFilmDetail(env, filmId) {
  if (!/^[a-z0-9-]{1,100}$/.test(filmId)) return json({ error: 'Invalid film id' }, 400);
  const film = await env.DB.prepare(`SELECT film_id AS id, title, release_year AS releaseYear, territory,
    primary_source_name AS primarySourceName, primary_source_url AS primarySourceUrl, checked_at AS checkedAt,
    horror_source_url AS horrorSourceUrl, release_mode AS releaseMode, release_mode_source_url AS releaseModeSourceUrl
    FROM canonical_films WHERE film_id = ? AND editorial_status = 'approved' AND horror_verified = 1`).bind(filmId).first();
  if (!film) return json({ error: 'No approved horror film record was found' }, 404, { 'cache-control': 'no-store' });
  return json({ film, claims: [
    { label: 'Film year', value: String(film.releaseYear), territory: 'As recorded by Frightertainment', sourceName: film.primarySourceName, source: film.primarySourceUrl, checked: film.checkedAt },
    { label: 'Horror classification', value: 'Verified by editorial review', territory: 'As recorded by Frightertainment', sourceName: film.primarySourceName, source: film.horrorSourceUrl, checked: film.checkedAt },
    ...(film.releaseMode !== 'unconfirmed' && film.releaseModeSourceUrl ? [{ label: 'Release path', value: film.releaseMode, territory: film.territory, sourceName: 'Primary source', source: film.releaseModeSourceUrl, checked: film.checkedAt }] : [])
  ], unconfirmed: ['Territorial release date', 'Cast and crew', 'Synopsis', 'Official trailer', 'Promotional artwork'], updatedAt: film.checkedAt }, 200, { 'cache-control': 'public, max-age=300' });
}
async function handleCinemaFilms(env, request) {
  const country = countryOf(request, env);
  const { results } = await env.DB.prepare(`SELECT film_id AS id, title, release_year AS releaseYear FROM canonical_films
    WHERE editorial_status = 'approved' AND horror_verified = 1 AND movieglu_id IS NOT NULL AND territory = ? ORDER BY title`).bind(country).all();
  return json({ country, items: results }, 200, { 'cache-control': 'public, max-age=300' });
}

function constantTimeMatch(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}
function adminAuthorized(request, env) {
  const expected = env.ADMIN_TOKEN;
  const actual = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  return Boolean(expected && constantTimeMatch(actual, expected));
}
async function readBody(request) {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > 100_000) throw new TypeError('Request body too large');
  const body = await request.json();
  if (JSON.stringify(body).length > 100_000) throw new TypeError('Request body too large');
  return body;
}
async function handleAdmin(env, request, path) {
  if (!adminAuthorized(request, env)) return json({ error: 'Unauthorized' }, 401, { 'cache-control': 'no-store' });
  if (request.method === 'GET' && path === '/api/admin/reviews') {
    const { results } = await env.DB.prepare(`SELECT r.review_id AS id, f.title AS filmTitle, r.critic_name AS critic, r.publication, r.score, r.score_out_of AS scoreOutOf, r.territory, r.review_url AS reviewUrl, r.permission_evidence_url AS permissionEvidenceUrl, r.checked_at AS checkedAt
      FROM critic_reviews r JOIN canonical_films f ON f.film_id = r.film_id WHERE r.status = 'pending' ORDER BY r.created_at`).all();
    return json({ items: results }, 200, { 'cache-control': 'no-store' });
  }
  if (request.method === 'GET' && path === '/api/admin/review-queue') {
    const { results } = await env.DB.prepare(`SELECT item_id AS id, item_kind AS kind, source_name AS sourceName, source_url AS sourceUrl, territory, payload_json AS payload, reasons_json AS reasons, created_at AS createdAt FROM review_queue WHERE status = 'pending' ORDER BY created_at`).all();
    return json({ items: results.map(row => ({ ...row, payload: JSON.parse(row.payload), reasons: JSON.parse(row.reasons) })) }, 200, { 'cache-control': 'no-store' });
  }
  if (request.method === 'POST' && path === '/api/admin/review-queue/review') {
    const body = await readBody(request);
    if (!body.id || !['approved', 'rejected'].includes(body.decision)) return json({ error: 'A review queue id and approved/rejected decision are required' }, 400);
    const update = await env.DB.prepare(`UPDATE review_queue SET status = ?, reviewed_at = ?, reviewer = ? WHERE item_id = ? AND status = 'pending'`).bind(body.decision, nowIso(), String(body.reviewer || 'site-admin').slice(0, 80), body.id).run();
    if (!update.meta.changes) return json({ error: 'Pending review item not found' }, 404);
    return json({ id: body.id, status: body.decision }, 200, { 'cache-control': 'no-store' });
  }
  if (request.method === 'POST' && path === '/api/admin/sync-manual-films') {
    const body = await readBody(request);
    if (!Array.isArray(body.films) || body.films.length !== 6) return json({ error: 'Expected the six reviewed manual film records' }, 400);
    const approvedIds = new Set(['other-mommy', 'crawlers', 'clayface', 'victorian-psycho', 'werwulf', 'exorcist-2027']);
    if (new Set(body.films.map(film => film.id)).size !== 6 || body.films.some(film => !approvedIds.has(film.id))) return json({ error: 'The sync payload must contain each of the six reviewed records once' }, 400);
    for (const film of body.films) {
      if (film.editorialStatus !== 'approved' || !film.title || !Array.isArray(film.claims) || !film.claims.length) return json({ error: 'Manual film identity or prior approval is not recognized' }, 400);
      for (const claim of film.claims) {
        let source;
        try { source = new URL(claim.source); } catch { return json({ error: `Source URL is missing for ${film.id}` }, 400); }
        if (source.protocol !== 'https:' || !claim.label || !claim.value || !claim.sourceName || !claim.territory || !isISODate(claim.checked)) return json({ error: `Claim provenance is incomplete for ${film.id}` }, 400);
      }
    }
    const synced = [];
    for (const film of body.films) {
      const serialized = JSON.stringify(film);
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(serialized));
      const hash = [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
      const latest = await env.DB.prepare(`SELECT source_hash AS sourceHash FROM manual_film_versions WHERE film_id = ? ORDER BY synced_at DESC LIMIT 1`).bind(film.id).first();
      if (latest?.sourceHash === hash) {
        synced.push({ filmId: film.id, status: 'unchanged', sourceHash: hash });
        continue;
      }
      const approvalStatus = latest ? 'pending-review' : 'approved';
      await env.DB.prepare(`INSERT INTO manual_film_versions(film_id, source_hash, title, payload_json, approval_status, synced_at) VALUES(?, ?, ?, ?, ?, ?)
        ON CONFLICT(film_id, source_hash) DO NOTHING`).bind(film.id, hash, film.title, serialized, approvalStatus, nowIso()).run();
      synced.push({ filmId: film.id, status: approvalStatus, sourceHash: hash });
    }
    return json({ synced }, 200, { 'cache-control': 'no-store' });
  }
  if (request.method === 'GET' && path === '/api/admin/manual-film-changes') {
    const { results } = await env.DB.prepare(`SELECT film_id AS filmId, source_hash AS sourceHash, title, payload_json AS payload, synced_at AS syncedAt
      FROM manual_film_versions WHERE approval_status = 'pending-review' ORDER BY synced_at DESC`).all();
    return json({ items: results.map(row => ({ ...row, payload: JSON.parse(row.payload) })) }, 200, { 'cache-control': 'no-store' });
  }
  if (request.method === 'POST' && path === '/api/admin/manual-film-changes/approve') {
    const body = await readBody(request);
    if (!body.filmId || !body.sourceHash) return json({ error: 'filmId and sourceHash are required' }, 400);
    const result = await env.DB.prepare(`UPDATE manual_film_versions SET approval_status = 'approved' WHERE film_id = ? AND source_hash = ? AND approval_status = 'pending-review'`).bind(body.filmId, body.sourceHash).run();
    return result.meta.changes ? json({ filmId: body.filmId, sourceHash: body.sourceHash, status: 'approved' }, 200, { 'cache-control': 'no-store' }) : json({ error: 'Pending manual film revision not found' }, 404);
  }
  if (request.method === 'POST' && path === '/api/admin/films') {
    const body = await readBody(request);
    if (!body.filmId || !body.title || !Number.isInteger(body.releaseYear) || !body.primarySourceName || !/^https:\/\//.test(body.primarySourceUrl || '') || !isISOAlpha2(body.territory || '') || !isISODate(body.checkedAt || '')) return json({ error: 'Film identity, territory and primary source are required' }, 400);
    const source = new URL(body.primarySourceUrl);
    if (source.protocol !== 'https:') return json({ error: 'Primary source must use HTTPS' }, 400);
    let horrorSourceUrl = null;
    if (body.horrorVerified === true) {
      try { horrorSourceUrl = new URL(body.horrorSourceUrl).href; } catch { return json({ error: 'A primary source supporting the horror classification is required' }, 400); }
      if (!horrorSourceUrl.startsWith('https://')) return json({ error: 'Horror classification source must use HTTPS' }, 400);
    }
    const mode = ['streaming-first', 'direct-to-video', 'theatrical-then-streaming', 'unconfirmed'].includes(body.releaseMode) ? body.releaseMode : 'unconfirmed';
    let releaseModeSourceUrl = null;
    if (mode !== 'unconfirmed') {
      try { releaseModeSourceUrl = new URL(body.releaseModeSourceUrl).href; } catch { return json({ error: 'A source URL is required to label a release path' }, 400); }
      if (!releaseModeSourceUrl.startsWith('https://')) return json({ error: 'Release path source must use HTTPS' }, 400);
    }
    const { results: sameYearTerritory } = await env.DB.prepare(`SELECT film_id, title FROM canonical_films WHERE film_id <> ? AND release_year = ? AND territory = ?`).bind(body.filmId, body.releaseYear, body.territory).all();
    const normalizedTitle = value => String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
    const duplicate = sameYearTerritory.find(row => normalizedTitle(row.title) === normalizedTitle(body.title));
    if (duplicate) return json({ error: `Duplicate title, year and territory; existing record ${duplicate.film_id}` }, 409);
    await env.DB.prepare(`INSERT INTO canonical_films(film_id, title, release_year, territory, primary_source_name, primary_source_url, checked_at, horror_verified, horror_source_url, tmdb_id, watchmode_id, movieglu_id, release_mode, release_mode_source_url, editorial_status)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending') ON CONFLICT(film_id) DO UPDATE SET title = excluded.title, release_year = excluded.release_year, territory = excluded.territory, primary_source_name = excluded.primary_source_name, primary_source_url = excluded.primary_source_url, checked_at = excluded.checked_at, horror_verified = excluded.horror_verified, horror_source_url = excluded.horror_source_url, tmdb_id = excluded.tmdb_id, watchmode_id = excluded.watchmode_id, movieglu_id = excluded.movieglu_id, release_mode = excluded.release_mode, release_mode_source_url = excluded.release_mode_source_url, editorial_status = 'pending'`)
      .bind(body.filmId, body.title, body.releaseYear, body.territory, body.primarySourceName, body.primarySourceUrl, body.checkedAt, body.horrorVerified === true ? 1 : 0, horrorSourceUrl, body.tmdbId || null, body.watchmodeId || null, body.moviegluId || null, mode, releaseModeSourceUrl).run();
    return json({ filmId: body.filmId, editorialStatus: 'pending' }, 202, { 'cache-control': 'no-store' });
  }
  if (request.method === 'POST' && path === '/api/admin/films/approve') {
    const body = await readBody(request);
    if (!body.filmId) return json({ error: 'filmId is required' }, 400);
    const result = await env.DB.prepare(`UPDATE canonical_films SET editorial_status = 'approved' WHERE film_id = ? AND editorial_status = 'pending' AND horror_verified = 1 AND horror_source_url LIKE 'https://%' AND primary_source_url LIKE 'https://%' AND checked_at <= ?`).bind(body.filmId, today()).run();
    return result.meta.changes ? json({ filmId: body.filmId, status: 'approved' }, 200, { 'cache-control': 'no-store' }) : json({ error: 'Pending film not found or source check date is invalid' }, 404);
  }
  if (request.method === 'POST' && path === '/api/admin/reviews') {
    const body = await readBody(request);
    const review = normalizeReview(body);
    let permissionUrl;
    try { permissionUrl = new URL(body.permissionEvidenceUrl).href; } catch { return json({ error: 'Permission evidence URL is required' }, 400); }
    if (!permissionUrl.startsWith('https://')) return json({ error: 'Permission evidence must use HTTPS' }, 400);
    if (!review) return json({ error: 'Review lacks a supported numeric score, source, territory, permissions or professional verification' }, 400);
    const film = await env.DB.prepare(`SELECT release_year FROM canonical_films WHERE film_id = ? AND editorial_status = 'approved' AND horror_verified = 1`).bind(review.filmId).first();
    if (!film || film.release_year !== review.releaseYear) return json({ error: 'Review film/year is not an approved film record' }, 400);
    await env.DB.prepare(`INSERT INTO critic_reviews(review_id, film_id, release_year, critic_id, critic_name, publication, publication_url, review_url, canonical_review_key, score, score_out_of, territory, published_at, checked_at, permission_cleared, permission_evidence_url, professional_verified, status)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 1, 'pending')`)
      .bind(id(), review.filmId, review.releaseYear, review.criticId, review.criticName || review.criticId, review.publication, review.publicationUrl, review.reviewUrl, review.dedupeKey, review.score, review.scoreOutOf, review.territory, review.publishedAt, review.checkedAt, permissionUrl).run();
    return json({ status: 'pending' }, 202, { 'cache-control': 'no-store' });
  }
  if (request.method === 'POST' && path === '/api/admin/reviews/approve') {
    const body = await readBody(request);
    if (!body.reviewId) return json({ error: 'reviewId is required' }, 400);
    const result = await env.DB.prepare(`UPDATE critic_reviews SET status = 'approved' WHERE review_id = ? AND status = 'pending' AND permission_cleared = 1 AND professional_verified = 1`).bind(body.reviewId).run();
    return result.meta.changes ? json({ reviewId: body.reviewId, status: 'approved' }, 200, { 'cache-control': 'no-store' }) : json({ error: 'Pending eligible review not found' }, 404);
  }
  return json({ error: 'Not found' }, 404, { 'cache-control': 'no-store' });
}

async function fetchHandler(request, env) {
  const path = new URL(request.url).pathname;
  if (path === '/api/health') return json({ status: 'ok', apiVersion: 1 });
  try {
    if (path === '/api/discovery' && request.method === 'GET') return await handleDiscovery(env, request);
    if (path === '/api/rankings' && request.method === 'GET') return await handleRanking(env, request);
    if (path.startsWith('/api/films/') && request.method === 'GET') {
      let filmId;
      try { filmId = decodeURIComponent(path.slice('/api/films/'.length)); }
      catch { throw new HttpError(400, 'Invalid film identifier'); }
      if (!/^[A-Za-z0-9-]{1,80}$/.test(filmId)) throw new HttpError(400, 'Invalid film identifier');
      return await handleFilmDetail(env, filmId);
    }
    if (path === '/api/cinema' && request.method === 'POST') return await handleCinema(env, request);
    if (path === '/api/cinema/films' && request.method === 'GET') return await handleCinemaFilms(env, request);
    if (path.startsWith('/api/admin/')) return await handleAdmin(env, request, path);
    return json({ error: 'Not found' }, 404);
  } catch (error) {
    const issue = safeError(error);
    log('request_failed', { path, error: issue });
    return json({ error: issue }, error instanceof HttpError ? error.status : 500, { 'cache-control': 'no-store' });
  }
}

async function runScheduled(controller, env) {
  const countries = [...configuredCountries(env)];
  const tasks = [];
  if (controller.cron === '0 4 * * *') {
    await env.DB.prepare(`DELETE FROM cinema_rate_limits WHERE window_started < ?`).bind(Date.now() - 5 * 60_000).run();
    for (const country of countries) {
      tasks.push(await refreshTask(env, 'coming-soon', country, () => refreshComingSoon(env, env.DB, country), 36 * 60 * 60 * 1000, 'cron-daily'));
      tasks.push(await refreshTask(env, 'streaming-availability', country, () => refreshStreaming(env, env.DB, country), 36 * 60 * 60 * 1000, 'cron-daily'));
      tasks.push(await refreshTask(env, 'streaming-releases', country, () => refreshStreamingReleases(env, env.DB, country), 36 * 60 * 60 * 1000, 'cron-daily'));
      tasks.push(await refreshTask(env, 'theatrical-releases', country, () => refreshTheatricalReleases(env, env.DB, country), 36 * 60 * 60 * 1000, 'cron-daily'));
      tasks.push(await refreshTask(env, 'trending-horror', country, () => refreshTrending(env, country), 36 * 60 * 60 * 1000, 'cron-daily'));
    }
    const { results: years } = await env.DB.prepare(`SELECT DISTINCT release_year AS year FROM canonical_films WHERE editorial_status = 'approved' AND horror_verified = 1 UNION SELECT ? AS year`).bind(new Date().getUTCFullYear()).all();
    for (const row of years) {
      const startedAt = nowIso();
      try {
        const count = await refreshRankingHistory(env, row.year);
        await logRun(env.DB, `ranking-${row.year}`, '', 'cron-daily', 'published', startedAt, null, count);
      } catch (error) {
        const issue = safeError(error);
        try { await logRun(env.DB, `ranking-${row.year}`, '', 'cron-daily', 'failed', startedAt, issue); } catch {}
        log('ranking_snapshot_failed', { year: row.year, error: issue });
      }
    }
  } else if (controller.cron === '0 5 * * 1') {
    const from = today();
    const to = new Date(Date.now() + 2 * 365 * 86_400_000).toISOString().slice(0, 10);
    for (const country of countries) {
      try {
        const candidates = await discoverHorrorCandidates(env, country, from, to);
        const count = await recordCandidates(env, candidates, country);
        await logRun(env.DB, 'weekly-horror-discovery', country, 'cron-weekly', 'published', nowIso(), null, count);
        tasks.push({ task: 'weekly-horror-discovery', country, status: 'published', count });
      } catch (error) {
        const issue = safeError(error);
        try { await logRun(env.DB, 'weekly-horror-discovery', country, 'cron-weekly', 'failed', nowIso(), issue); } catch {}
        log('weekly_discovery_failed', { country, error: issue });
      }
    }
  } else {
    log('unknown_cron_skipped', { cron: controller.cron });
  }
  return tasks;
}

export default {
  fetch: fetchHandler,
  scheduled(controller, env, _ctx) { return runScheduled(controller, env); }
};
