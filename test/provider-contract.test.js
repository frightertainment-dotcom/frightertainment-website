import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fetchNearbyShowtimes, refreshStreamingReleases, refreshTheatricalReleases, refreshTrending } from '../worker/providers.js';

const movieGluFixture = JSON.parse(await readFile(new URL('./fixtures/movieglu-film-showtimes.example.json', import.meta.url), 'utf8'));
const approvedFilm = { film_id: 'approved-horror', title: 'Approved Horror', release_year: 2026, watchmode_id: 123 };
const fakeDb = results => ({ prepare() { return { all: async () => ({ results }) }; } });
function stubFetch(response) {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify(response), { status: 200, headers: { 'content-type': 'application/json' } });
  return () => { globalThis.fetch = original; };
}

test('MovieGlu filmShowTimes consumes format-keyed showings objects', async () => {
  const restore = stubFetch(movieGluFixture);
  try {
    const result = await fetchNearbyShowtimes({
      MOVIEGLU_LICENSE_APPROVED: 'true', MOVIEGLU_API_KEY: 'fixture', MOVIEGLU_AUTHORIZATION: 'fixture',
      MOVIEGLU_CLIENT: 'fixture', MOVIEGLU_API_VERSION: 'v200'
    }, { film_id: 'approved-horror', title: 'Approved Horror', movieglu_id: 12345 }, 'GB', { lat: 51.5, lon: -0.1 }, '2026-10-08');
    assert.deepEqual(result.cinemas[0].showings.map(showing => [showing.format, showing.startTime]), [
      ['Standard', '18:30'], ['Standard', '21:00'], ['3D', '19:15']
    ]);
    assert.equal(result.cinemas[0].showings[1].bookingUrl, null);
  } finally { restore(); }
});

test('Watchmode theatrical null verification rows pass only with approved movie mapping, country and real date', async () => {
  const restore = stubFetch([
    { id: 123, title: 'Provider title', title_type: 'movie', region: 'GB', type: 'theatrical_release', release_date: '2026-10-01', verification_status: null },
    { id: 999, title: 'Unmapped Horror', title_type: 'movie', region: 'GB', type: 'theatrical_release', release_date: '2026-10-02', verification_status: null },
    { id: 123, title: 'Wrong territory', title_type: 'movie', region: 'US', type: 'theatrical_release', release_date: '2026-10-02', verification_status: null },
    { id: 123, title: 'Not a film', title_type: 'tv_series', region: 'GB', type: 'theatrical_release', release_date: '2026-10-02', verification_status: null },
    { id: 123, title: 'Impossible date', title_type: 'movie', region: 'GB', type: 'theatrical_release', release_date: '2026-02-30', verification_status: null },
    { id: 123, title: 'Digital release', title_type: 'movie', region: 'GB', type: 'streaming_movie_release', release_date: '2026-10-03', verification_status: 'confirmed_available' }
  ]);
  try {
    const data = await refreshTheatricalReleases({ WATCHMODE_LICENSE_APPROVED: 'true', WATCHMODE_API_KEY: 'fixture', WATCHMODE_PLAN: 'startup' }, fakeDb([approvedFilm]), 'GB', new Date('2026-10-08T00:00:00Z'));
    assert.equal(data.items.length, 1);
    assert.equal(data.items[0].filmId, 'approved-horror');
    assert.equal(data.items[0].title, 'Approved Horror');
    assert.equal(data.items[0].releaseDate, '2026-10-01');
  } finally { restore(); }
});

test('Watchmode streaming-release rows never publish unmapped provider titles', async () => {
  const restore = stubFetch([
    { id: 123, title: 'Provider title', title_type: 'movie', region: 'GB', type: 'streaming_movie_release', release_date: '2026-10-09', verification_status: 'scheduled', provider_id: 44 },
    { id: 999, title: 'Arbitrary Horror', title_type: 'movie', region: 'GB', type: 'streaming_movie_release', release_date: '2026-10-10', verification_status: 'scheduled', provider_id: 44 }
  ]);
  try {
    const data = await refreshStreamingReleases({ WATCHMODE_LICENSE_APPROVED: 'true', WATCHMODE_API_KEY: 'fixture', WATCHMODE_PLAN: 'startup' }, fakeDb([approvedFilm]), 'GB', new Date('2026-10-08T00:00:00Z'));
    assert.equal(data.items.length, 1);
    assert.equal(data.items[0].filmId, 'approved-horror');
    assert.equal(data.items[0].title, 'Approved Horror');
    assert.equal(data.items.some(item => item.title === 'Arbitrary Horror'), false);
  } finally { restore(); }
});

test('TMDB noncommercial route returns validated poster paths and rejects unsafe image paths', async () => {
  const restore = stubFetch({ results: [
    { id: 10, title: 'Poster Horror', release_date: '2026-10-01', popularity: 12, genre_ids: [27], poster_path: '/poster_10.jpg' },
    { id: 11, title: 'No Poster', release_date: '2026-10-02', popularity: 8, genre_ids: [27], poster_path: 'https://evil.example/poster.jpg' }
  ] });
  try {
    const result = await refreshTrending({
      TMDB_NONCOMMERCIAL_USE_APPROVED: 'true',
      TMDB_ATTRIBUTION_READY: 'true',
      TMDB_READ_ACCESS_TOKEN: 'fixture'
    }, 'GB');
    assert.equal(result.items[0].posterPath, '/poster_10.jpg');
    assert.equal(result.items[1].posterPath, null);
    await assert.rejects(() => refreshTrending({
      TMDB_NONCOMMERCIAL_USE_APPROVED: 'true',
      TMDB_COMMERCIAL_LICENSE_APPROVED: 'true',
      TMDB_ATTRIBUTION_READY: 'true',
      TMDB_READ_ACCESS_TOKEN: 'fixture'
    }, 'GB'), /Set exactly one/);
  } finally { restore(); }
});
