import test from 'node:test';
import assert from 'node:assert/strict';
import { refreshCommunityChart, refreshMovieArtwork } from '../worker/tmdb-catalogue.js';

const env = {
  TMDB_NONCOMMERCIAL_USE_APPROVED: 'true',
  TMDB_ATTRIBUTION_READY: 'true',
  TMDB_READ_ACCESS_TOKEN: 'private-test-fixture'
};
const reply = body => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

test('community chart excludes unreleased, low-vote, non-horror and invalid-poster entries', async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer private-test-fixture');
    assert.equal(new URL(url).searchParams.get('with_genres'), '27');
    return reply({ total_pages: 1, results: [
      { id: 1, title: 'Qualified Horror', release_date: '2025-03-01', genre_ids: [27], vote_average: 8.2, vote_count: 90, poster_path: '/one.jpg' },
      { id: 2, title: 'Too Few Votes', release_date: '2025-04-01', genre_ids: [27], vote_average: 9.9, vote_count: 2, poster_path: '/two.jpg' },
      { id: 3, title: 'Wrong Year', release_date: '2026-03-01', genre_ids: [27], vote_average: 9.7, vote_count: 500, poster_path: '/three.jpg' },
      { id: 4, title: 'Not Horror', release_date: '2025-05-01', genre_ids: [35], vote_average: 9.6, vote_count: 500, poster_path: '/four.jpg' },
      { id: 5, title: 'Unsafe Image', release_date: '2025-05-01', genre_ids: [27], vote_average: 9.5, vote_count: 500, poster_path: 'https://evil.example/poster.jpg' }
    ] });
  };
  try {
    const chart = await refreshCommunityChart(env, 2025);
    assert.equal(chart.ratingKind, 'tmdb-community');
    assert.equal(chart.items.length, 1);
    assert.equal(chart.items[0].averageScore, 82);
    assert.equal(chart.items[0].voteCount, 90);
    assert.equal(JSON.stringify(chart).includes('private-test-fixture'), false);
  } finally { globalThis.fetch = previous; }
});

test('poster match requires the approved film title and a nearby release year', async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer private-test-fixture');
    if (String(url).includes('/movie/1400837')) return reply({ id: 1400837, title: 'Other Mommy', release_date: '2026-10-09', poster_path: '/other-mommy.jpg', vote_average: 7.2, vote_count: 300 });
    return reply({ results: [
      { id: 8, title: 'Matching Horror', release_date: '1980-01-01', poster_path: '/wrong.jpg' },
      { id: 9, title: 'Other Horror', release_date: '2026-01-01', poster_path: '/other.jpg' },
      { id: 10, title: 'Matching Horror', release_date: '2026-01-01', poster_path: '/correct.jpg', vote_average: 8.1, vote_count: 75 }
    ] });
  };
  const db = { prepare: () => ({ all: async () => ({ results: [
    { id: 'matching-horror', title: 'Matching Horror', year: 2026, tmdbId: null }
  ] }) }) };
  try {
    const artwork = await refreshMovieArtwork(env, db);
    assert.deepEqual(artwork.items.map(item => [item.id, item.tmdbId, item.posterPath, item.voteCount]), [
      ['matching-horror', 10, '/correct.jpg', 75],
      ['other-mommy', 1400837, '/other-mommy.jpg', 300]
    ]);
  } finally { globalThis.fetch = previous; }
});

test('artwork batch reserves requests for every poster lookup and caps enrichment before Cloudflare limits', async () => {
  const previous = globalThis.fetch; let calls = 0;
  const rows = Array.from({ length: 36 }, (_, i) => ({ id: `film-${i}`, title: `Film ${i}`, year: 2025 }));
  globalThis.fetch = async url => {
    calls++; const u = new URL(url);
    if (u.pathname.endsWith('/search/movie')) {
      const title = u.searchParams.get('query'); const number = Number(title.split(' ')[1]);
      return reply({ results: [{ id: number + 1, title, release_date: '2025-01-01', poster_path: `/film-${number}.jpg`, vote_count: 100, vote_average: 7 }] });
    }
    const id = Number(u.pathname.split('/').at(-1));
    return reply({ id, title: `Film ${id - 1}`, release_date: '2025-01-01', poster_path: `/film-${id - 1}.jpg`, vote_count: 100, vote_average: 7 });
  };
  const db = { prepare: () => ({ all: async () => ({ results: rows }) }) };
  try {
    const result = await refreshMovieArtwork(env, db);
    assert.equal(result.items.length, 36);
    assert.equal(calls, 40);
    assert.ok(result.items.every(item => item.posterPath));
  } finally { globalThis.fetch = previous; }
});
