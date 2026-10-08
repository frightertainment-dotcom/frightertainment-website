import { validateDataset } from '../src/core.js';

const MOVIEGLU_BASE = 'https://api-gate2.movieglu.com';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const WATCHMODE_BASE = 'https://api.watchmode.com/v1';
const checkedToday = () => new Date().toISOString().slice(0, 10);

function requireTrue(value, message) {
  if (value !== 'true') throw new Error(message);
}

function movieGluHeaders(env, country, point, now = new Date()) {
  requireTrue(env.MOVIEGLU_LICENSE_APPROVED, 'MovieGlu commercial licence approval is not configured');
  if (!env.MOVIEGLU_API_KEY || !env.MOVIEGLU_AUTHORIZATION || !env.MOVIEGLU_CLIENT || !env.MOVIEGLU_API_VERSION) {
    throw new Error('MovieGlu credentials and current API version are not configured');
  }
  const deviceDatetime = now.toISOString();
  return {
    accept: 'application/json', 'api-version': env.MOVIEGLU_API_VERSION,
    authorization: env.MOVIEGLU_AUTHORIZATION, 'x-api-key': env.MOVIEGLU_API_KEY,
    client: env.MOVIEGLU_CLIENT, territory: country === 'GB' ? 'UK' : country, 'device-datetime': deviceDatetime,
    ...(point ? { geolocation: `${point.lat};${point.lon}` } : {})
  };
}

async function fetchJson(url, init = {}) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error(`Provider request failed (${response.status})`);
  return response.json();
}

export async function refreshComingSoon(env, db, country) {
  const headers = movieGluHeaders(env, country);
  const url = new URL(`${MOVIEGLU_BASE}/filmsComingSoon/`);
  url.searchParams.set('n', '15');
  const response = await fetchJson(url, { headers });
  const { results: approvedFilms = [] } = await db.prepare(`SELECT film_id, title, movieglu_id FROM canonical_films
    WHERE editorial_status = 'approved' AND horror_verified = 1 AND movieglu_id IS NOT NULL AND territory = ?`).bind(country).all();
  const approvedByProviderId = new Map(approvedFilms.map(film => [Number(film.movieglu_id), film]));
  const checkedAt = checkedToday();
  const items = (response.films || []).filter(film => approvedByProviderId.has(Number(film.film_id))).flatMap(film => {
    const dates = (film.release_dates || []).filter(row => /^\d{4}-\d{2}-\d{2}$/.test(row.release_date || '') && row.release_date >= checkedAt)
      .sort((left, right) => left.release_date.localeCompare(right.release_date));
    const canonical = approvedByProviderId.get(Number(film.film_id));
    return dates.slice(0, 1).map(date => ({
      id: `movieglu:${film.film_id}`, filmId: canonical.film_id, title: canonical.title,
      releaseDate: date.release_date, releaseTerritory: country,
      territory: country, status: 'scheduled-release',
      sourceName: 'MovieGlu', sourceUrl: `${MOVIEGLU_BASE}/filmsComingSoon/`, checkedAt,
      providerId: film.film_id, externalIds: { imdb: film.imdb_title_id || null }
    }));
  });
  return validateDataset({ kind: 'coming-soon', country, sourceName: 'MovieGlu', sourceUrl: `${MOVIEGLU_BASE}/filmsComingSoon/`, territory: country, checkedAt, items });
}

export async function refreshStreaming(env, db, country) {
  requireTrue(env.WATCHMODE_LICENSE_APPROVED, 'Watchmode commercial licence approval is not configured');
  if (!env.WATCHMODE_API_KEY || !['startup', 'business', 'enterprise'].includes(env.WATCHMODE_PLAN)) {
    throw new Error('A Watchmode commercial plan and API key are required');
  }
  const { results = [] } = await db.prepare(`SELECT film_id, title, release_year, watchmode_id, primary_source_url, release_mode, release_mode_source_url
    FROM canonical_films WHERE editorial_status = 'approved' AND horror_verified = 1 AND watchmode_id IS NOT NULL ORDER BY title`).all();
  const checkedAt = checkedToday();
  const items = [];
  // Keep fan-out bounded. Never request or store the provider's third-party image fields.
  for (let start = 0; start < results.length; start += 4) {
    const batch = await Promise.all(results.slice(start, start + 4).map(async film => {
      const url = new URL(`${WATCHMODE_BASE}/title/${encodeURIComponent(film.watchmode_id)}/sources/`);
      url.searchParams.set('regions', country);
      const sources = await fetchJson(url, { headers: { 'X-API-Key': env.WATCHMODE_API_KEY } });
      return sources.map(source => ({
        id: `${film.film_id}:${source.source_id}:${source.type}:${country}`,
        filmId: film.film_id, title: film.title, releaseYear: film.release_year,
        provider: source.name, availability: source.type,
        webUrl: /^https:\/\//.test(source.web_url || '') ? source.web_url : null,
        price: Number.isFinite(source.price) ? source.price : null,
        releaseMode: film.release_mode_source_url ? film.release_mode : 'unconfirmed',
        releaseModeSource: film.release_mode_source_url || null, territory: source.region || country,
        sourceName: 'Watchmode', sourceUrl: url.origin + url.pathname, checkedAt,
        primaryFilmSource: film.primary_source_url
      }));
    }));
    items.push(...batch.flat());
  }
  return validateDataset({ kind: 'streaming-availability', country, sourceName: 'Watchmode', sourceUrl: WATCHMODE_BASE, territory: country, checkedAt, items });
}

export async function refreshStreamingReleases(env, db, country, now = new Date()) {
  requireTrue(env.WATCHMODE_LICENSE_APPROVED, 'Watchmode commercial licence approval is not configured');
  if (!env.WATCHMODE_API_KEY || !['startup', 'business', 'enterprise'].includes(env.WATCHMODE_PLAN)) {
    throw new Error('A Watchmode commercial plan and API key are required');
  }
  const start = new Date(now.valueOf() - 30 * 86_400_000).toISOString().slice(0, 10).replaceAll('-', '');
  const end = new Date(now.valueOf() + 45 * 86_400_000).toISOString().slice(0, 10).replaceAll('-', '');
  const url = new URL(`${WATCHMODE_BASE}/title-release-dates/`);
  url.searchParams.set('start_date', start);
  url.searchParams.set('end_date', end);
  url.searchParams.set('regions', country);
  const response = await fetchJson(url, { headers: { 'X-API-Key': env.WATCHMODE_API_KEY } });
  const rows = Array.isArray(response) ? response : response.releases || response.results || [];
  const { results: films = [] } = await db.prepare(`SELECT film_id, title, watchmode_id, release_mode, release_mode_source_url
    FROM canonical_films WHERE editorial_status = 'approved' AND horror_verified = 1 AND watchmode_id IS NOT NULL`).all();
  const filmByProviderId = new Map(films.map(film => [Number(film.watchmode_id), film]));
  const checkedAt = checkedToday();
  const items = rows.filter(row => row.type === 'streaming_movie_release' && row.region === country &&
    ['scheduled', 'confirmed_available'].includes(row.verification_status) && /^\d{4}-\d{2}-\d{2}$/.test(row.release_date || ''))
    .map(row => {
      const mapped = filmByProviderId.get(Number(row.id));
      return {
        id: `watchmode:${row.id}:${row.region}:${row.release_date}`, filmId: mapped?.film_id || null, title: mapped?.title || row.title,
        releaseDate: row.release_date, releaseTerritory: row.region, territory: row.region,
        availabilityState: row.verification_status,
        providerId: row.provider_id, releaseMode: mapped?.release_mode || 'unconfirmed',
        sourceName: 'Watchmode', sourceUrl: `${WATCHMODE_BASE}/title-release-dates/`, checkedAt
      };
    });
  return validateDataset({ kind: 'streaming-releases', country, sourceName: 'Watchmode', sourceUrl: `${WATCHMODE_BASE}/title-release-dates/`, territory: country, checkedAt, items });
}

export async function refreshTheatricalReleases(env, db, country, now = new Date()) {
  requireTrue(env.WATCHMODE_LICENSE_APPROVED, 'Watchmode commercial licence approval is not configured');
  if (!env.WATCHMODE_API_KEY || !['startup', 'business', 'enterprise'].includes(env.WATCHMODE_PLAN)) {
    throw new Error('A Watchmode commercial plan and API key are required');
  }
  const start = new Date(now.valueOf() - 30 * 86_400_000).toISOString().slice(0, 10).replaceAll('-', '');
  const end = now.toISOString().slice(0, 10).replaceAll('-', '');
  const url = new URL(`${WATCHMODE_BASE}/title-release-dates/`);
  url.searchParams.set('start_date', start);
  url.searchParams.set('end_date', end);
  url.searchParams.set('regions', country);
  const response = await fetchJson(url, { headers: { 'X-API-Key': env.WATCHMODE_API_KEY } });
  const rows = Array.isArray(response) ? response : response.releases || response.results || [];
  const { results: films = [] } = await db.prepare(`SELECT film_id, title, watchmode_id FROM canonical_films WHERE editorial_status = 'approved' AND horror_verified = 1 AND watchmode_id IS NOT NULL`).all();
  const filmByProviderId = new Map(films.map(film => [Number(film.watchmode_id), film]));
  const checkedAt = checkedToday();
  const items = rows.filter(row => ['theatrical_release', 'theatrical_movie_release'].includes(row.type) && row.region === country &&
    row.verification_status === 'confirmed_available' && /^\d{4}-\d{2}-\d{2}$/.test(row.release_date || '') && filmByProviderId.has(Number(row.id)))
    .map(row => ({ id: `watchmode-theatrical:${row.id}:${country}:${row.release_date}`, filmId: filmByProviderId.get(Number(row.id)).film_id, title: filmByProviderId.get(Number(row.id)).title,
      releaseDate: row.release_date, releaseTerritory: country, territory: country,
      label: 'Recent theatrical release · date verified; current showtimes not confirmed',
      sourceName: 'Watchmode', sourceUrl: `${WATCHMODE_BASE}/title-release-dates/`, checkedAt }));
  return validateDataset({ kind: 'theatrical-releases', country, sourceName: 'Watchmode', sourceUrl: `${WATCHMODE_BASE}/title-release-dates/`, territory: country, checkedAt, items });
}

function requireTmdb(env) {
  requireTrue(env.TMDB_COMMERCIAL_LICENSE_APPROVED, 'TMDB commercial API licence is not approved');
  requireTrue(env.TMDB_ATTRIBUTION_READY, 'TMDB attribution logo and non-endorsement notice must be ready before activation');
  if (!env.TMDB_READ_ACCESS_TOKEN) throw new Error('TMDB read access token is not configured');
}

export async function refreshTrending(env, country) {
  requireTmdb(env);
  const language = ({ GB: 'en-GB', US: 'en-US', CA: 'en-CA', AU: 'en-AU', NZ: 'en-NZ', IE: 'en-IE' })[country] || 'en-US';
  const url = new URL(`${TMDB_BASE}/trending/movie/week`);
  url.searchParams.set('language', language);
  const data = await fetchJson(url, { headers: { Authorization: `Bearer ${env.TMDB_READ_ACCESS_TOKEN}`, accept: 'application/json' } });
  const checkedAt = checkedToday();
  const items = (data.results || []).filter(film => film.genre_ids?.includes(27)).map(film => ({
    id: `tmdb:${film.id}`, title: film.title || film.original_title,
    releaseYear: /^\d{4}/.test(film.release_date || '') ? Number(film.release_date.slice(0, 4)) : null,
    popularity: Number.isFinite(film.popularity) ? film.popularity : null,
    trendDefinition: 'Global TMDB weekly movie-trending list filtered to the Horror genre; selected country affects display language only',
    territory: 'Global', sourceName: 'TMDB', sourceUrl: `https://www.themoviedb.org/movie/${film.id}`, checkedAt
  }));
  return validateDataset({ kind: 'trending-horror', country, sourceName: 'TMDB', sourceUrl: `${TMDB_BASE}/trending/movie/week`, territory: 'Global', checkedAt, items });
}

export async function discoverHorrorCandidates(env, country, fromDate, toDate) {
  requireTmdb(env);
  const url = new URL(`${TMDB_BASE}/discover/movie`);
  url.searchParams.set('with_genres', '27');
  url.searchParams.set('region', country);
  url.searchParams.set('release_date.gte', fromDate);
  url.searchParams.set('release_date.lte', toDate);
  url.searchParams.set('include_adult', 'false');
  url.searchParams.set('sort_by', 'primary_release_date.asc');
  const headers = { Authorization: `Bearer ${env.TMDB_READ_ACCESS_TOKEN}`, accept: 'application/json' };
  const firstPage = await fetchJson(url, { headers });
  const data = [...(firstPage.results || [])];
  const pages = Math.min(Number(firstPage.total_pages) || 1, 3);
  for (let page = 2; page <= pages; page++) {
    url.searchParams.set('page', String(page));
    const next = await fetchJson(url, { headers });
    data.push(...(next.results || []));
  }
  return data.map(film => ({
    id: `tmdb:${film.id}`, title: film.title || film.original_title,
    releaseDate: film.release_date || null, territory: country,
    sourceName: 'TMDB', sourceUrl: `https://www.themoviedb.org/movie/${film.id}`,
    note: 'Discovery candidate only; verify every public fact against a primary source before publication.'
  }));
}

export async function fetchNearbyShowtimes(env, film, country, point, date) {
  if (!film?.movieglu_id) throw new Error('No licensed MovieGlu ID is mapped to this film');
  const headers = movieGluHeaders(env, country, point);
  const url = new URL(`${MOVIEGLU_BASE}/filmShowTimes/`);
  url.searchParams.set('film_id', film.movieglu_id);
  url.searchParams.set('date', date);
  url.searchParams.set('n', '25');
  const data = await fetchJson(url, { headers, cache: 'no-store' });
  return {
    film: { id: film.film_id, title: film.title }, date, country,
    sourceName: 'MovieGlu', sourceUrl: `${MOVIEGLU_BASE}/filmShowTimes/`, checkedAt: new Date().toISOString(),
    cinemas: (data.cinemas || []).map(cinema => ({
      id: cinema.cinema_id, name: cinema.cinema_name,
      showings: (cinema.showings || []).flatMap(format => (format.times || []).map(time => ({
        format: format.format?.name || 'Screening', startTime: time.start_time,
        endTime: time.end_time || null, bookingUrl: /^https:\/\//.test(time.booking_url || '') ? time.booking_url : null
      })))
    })).filter(cinema => cinema.showings.length)
  };
}
