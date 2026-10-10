import { validateDataset } from '../src/core.js';

const BASE = 'https://api.themoviedb.org/3';
const posterPath = value => /^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\.(?:jpg|png|webp)$/i.test(value || '') ? value : null;
const day = () => new Date().toISOString().slice(0, 10);
const normalize = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase().replace(/^(?:the)\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim();

async function tmdb(env, path, parameters) {
  if (env.TMDB_NONCOMMERCIAL_USE_APPROVED !== 'true' || env.TMDB_ATTRIBUTION_READY !== 'true' ||
      !env.TMDB_READ_ACCESS_TOKEN) throw new Error('TMDB preview access is not configured');
  const url = new URL(BASE + path);
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, String(value));
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${env.TMDB_READ_ACCESS_TOKEN}`, accept: 'application/json' },
    signal: AbortSignal.timeout(12_000)
  });
  if (!response.ok) throw new Error(`TMDB request failed (${response.status})`);
  return response.json();
}

export async function refreshCommunityChart(env, year) {
  const today = day();
  const end = `${year}-12-31` < today ? `${year}-12-31` : today;
  const kind = `tmdb-community-${year}`;
  if (end < `${year}-01-01`) return validateDataset({
    kind, sourceName: 'TMDB', sourceUrl: BASE + '/discover/movie',
    territory: 'Global', checkedAt: today, ratingKind: 'tmdb-community',
    minimumVotes: 50, items: []
  });
  const parameters = {
    with_genres: 27, include_adult: false, include_video: false, language: 'en-GB',
    'primary_release_date.gte': `${year}-01-01`, 'primary_release_date.lte': end,
    'vote_count.gte': 50, sort_by: 'vote_average.desc'
  };
  const first = await tmdb(env, '/discover/movie', { ...parameters, page: 1 });
  const pages = Math.min(Math.max(1, Number(first.total_pages) || 1), 3);
  const more = await Promise.all(Array.from({ length: pages - 1 }, (_, i) =>
    tmdb(env, '/discover/movie', { ...parameters, page: i + 2 })));
  const seen = new Set();
  const films = [first, ...more].flatMap(page => page.results || []).filter(film => {
    const valid = Number.isInteger(film.id) && !seen.has(film.id) && film.genre_ids?.includes(27) &&
      /^\d{4}-\d{2}-\d{2}$/.test(film.release_date || '') &&
      film.release_date >= `${year}-01-01` && film.release_date <= end &&
      Number.isFinite(film.vote_average) && film.vote_average > 0 &&
      Number.isInteger(film.vote_count) && film.vote_count >= 50 && posterPath(film.poster_path);
    if (valid) seen.add(film.id);
    return valid;
  }).sort((a, b) => b.vote_average - a.vote_average || b.vote_count - a.vote_count || a.id - b.id)
    .slice(0, 20);
  const items = films.map((film, position) => ({
    id: `tmdb-${film.id}`, filmId: `tmdb-${film.id}`, tmdbId: film.id,
    title: film.title || film.original_title, position: position + 1,
    averageScore: Math.round(film.vote_average * 10), voteCount: film.vote_count,
    posterPath: posterPath(film.poster_path), firstReleaseDate: film.release_date,
    sourceName: 'TMDB', sourceUrl: `https://www.themoviedb.org/movie/${film.id}`,
    territory: 'Global', checkedAt: today
  }));
  return validateDataset({ kind, sourceName: 'TMDB', sourceUrl: BASE + '/discover/movie',
    territory: 'Global', checkedAt: today, ratingKind: 'tmdb-community',
    minimumVotes: 50, year, items });
}

export async function refreshMovieArtwork(env, db) {
  const { results: approvedFilms = [] } = await db.prepare(`SELECT film_id AS id, title, release_year AS year, tmdb_id AS tmdbId
    FROM canonical_films WHERE editorial_status = 'approved' AND horror_verified = 1
    ORDER BY film_id LIMIT 100`).all();
  // Source-checked film files that have not yet been copied into the canonical D1 table.
  const extraFilms = [
    { id: 'other-mommy', title: 'Other Mommy', year: 2026, tmdbId: 1400837 },
    { id: '28-days-later', title: '28 Days Later', year: 2002 },
    { id: '28-weeks-later', title: '28 Weeks Later', year: 2007 }
  ];
  const films = [...approvedFilms, ...extraFilms.filter(film => !approvedFilms.some(row => row.id === film.id))];
  // Verified editorial title variant: TMDB omits the sequel number in this entry.
  const verifiedIds = { 'ready-or-not-2': 1266127 };
  const results = new Array(films.length);
  let next = 0;
  async function worker() {
    while (next < films.length) {
      const index = next++;
      const film = films[index];
      try {
        const pinnedId = film.tmdbId || verifiedIds[film.id];
        const response = pinnedId
          ? await tmdb(env, `/movie/${pinnedId}`, { language: 'en-GB' })
          : await tmdb(env, '/search/movie', { query: film.title, include_adult: false, language: 'en-GB' });
        const candidates = pinnedId ? [response] : (response.results || []);
        const matches = candidates.filter(item => pinnedId || normalize(item.title) === normalize(film.title) ||
          normalize(item.original_title) === normalize(film.title));
        const match = matches.filter(item => {
          const releaseYear = Number(String(item.release_date || '').slice(0, 4));
          return releaseYear >= film.year - 1 && releaseYear <= film.year + 1;
        }).sort((a, b) => Math.abs(Number(a.release_date.slice(0, 4)) - film.year) -
            Math.abs(Number(b.release_date.slice(0, 4)) - film.year) || b.popularity - a.popularity)[0];
        if (match && posterPath(match.poster_path)) results[index] = {
          id: film.id, title: film.title, posterPath: posterPath(match.poster_path),
          tmdbId: match.id, sourceName: 'TMDB',
          sourceUrl: `https://www.themoviedb.org/movie/${match.id}`,
          territory: 'Global', checkedAt: day()
        };
      } catch { /* One missing title must not hide the other verified posters. */ }
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, films.length) }, worker));
  return validateDataset({ kind: 'tmdb-movie-artwork', sourceName: 'TMDB',
    sourceUrl: BASE + '/search/movie', territory: 'Global', checkedAt: day(),
    items: results.filter(Boolean) });
}
