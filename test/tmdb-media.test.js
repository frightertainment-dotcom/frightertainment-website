import test from 'node:test';
import assert from 'node:assert/strict';
import { officialTrailer, sanitizeMedia, fetchMedia, fetchCatalogue, independentAssessment } from '../worker/tmdb-media.js';
const env = { TMDB_NONCOMMERCIAL_USE_APPROVED: 'true', TMDB_ATTRIBUTION_READY: 'true', TMDB_READ_ACCESS_TOKEN: 'private-fixture' };
const reply = body => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });

test('only official YouTube trailers and teasers with safe video ids can be embedded', () => {
  const videos = { results: [
    { official: false, site: 'YouTube', type: 'Trailer', key: 'abcdef12345' },
    { official: true, site: 'YouTube', type: 'Trailer', key: '<script>' },
    { official: true, site: 'Vimeo', type: 'Trailer', key: 'abcdef12345' },
    { official: true, site: 'YouTube', type: 'Teaser', key: 'abcde123456' },
    { official: true, site: 'YouTube', type: 'Trailer', key: 'official123', iso_639_1: 'en' }
  ] };
  assert.equal(officialTrailer(videos).key, 'official123');
  assert.equal(officialTrailer({ results: videos.results.slice(0, 3) }), null);
});

test('regional dates are explicit and first releases never masquerade as UK release dates', () => {
  const raw = { id: 1, title: 'Film', release_date: '2025-01-01', poster_path: 'https://evil.example/poster.jpg', vote_average: 9.9, vote_count: 0 };
  const first = sanitizeMedia(raw, 'movie', 'GB');
  assert.equal(first.releaseCountry, 'Global'); assert.equal(first.releaseLabel, 'First release: 2025-01-01');
  assert.equal(first.posterPath, null); assert.equal(first.voteAverage, null);
  const regional = sanitizeMedia({ ...raw, release_dates: { results: [{ iso_3166_1: 'GB', release_dates: [{ type: 3, release_date: '2025-03-02T00:00:00Z' }] }] } }, 'movie', 'GB');
  assert.equal(regional.releaseDate, '2025-03-02'); assert.equal(regional.releaseCountry, 'GB');
});

test('independent classification requires production credits and excludes major production and large reported budgets', () => {
  assert.equal(independentAssessment({ production_companies: [{ name: 'Small Independent Films' }], budget: 500000 }).independent, true);
  assert.equal(independentAssessment({ production_companies: [{ name: 'Warner Bros. Pictures' }] }).independent, false);
  assert.equal(independentAssessment({ production_companies: [{ name: 'Independent Films' }], budget: 30000000 }).independent, false);
  assert.equal(independentAssessment({}).independent, false);
});

test('title lookup rejects ambiguous remakes and mismatched years without fetching arbitrary details', async () => {
  const previous = globalThis.fetch; let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++; assert.equal(options.headers.Authorization, 'Bearer private-fixture');
    return reply({ results: [{ id: 1, title: 'Same Title', release_date: '1980-01-01' }, { id: 2, title: 'Same Title', release_date: '2020-01-01' }] });
  };
  try {
    assert.equal(await fetchMedia(env, { type: 'movie', title: 'Same Title' }), null);
    assert.equal(await fetchMedia(env, { type: 'movie', title: 'Same Title', year: 1990 }), null);
    assert.equal(calls, 2);
  } finally { globalThis.fetch = previous; }
});

test('historical chart keeps the year boundary and excludes major producers from indie rankings', async () => {
  const previous = globalThis.fetch; const urls = [];
  globalThis.fetch = async url => {
    const u = new URL(url); urls.push(u);
    if (u.pathname.includes('/discover/')) return reply({ total_pages: 1, total_results: 2, results: [
      { id: 1, title: 'Independent', genre_ids: [27], poster_path: '/a.jpg', release_date: '2025-03-01' },
      { id: 2, title: 'Major', genre_ids: [27], poster_path: '/b.jpg', release_date: '2025-03-01' }
    ] });
    const id = Number(u.pathname.split('/').at(-1));
    return reply({ id, title: id === 1 ? 'Independent' : 'Major', release_date: '2025-03-01', poster_path: '/a.jpg', vote_average: 8, vote_count: 100,
      production_companies: [{ name: id === 1 ? 'Tiny Film Company' : 'Universal Pictures' }] });
  };
  try {
    const result = await fetchCatalogue(env, { type: 'indie', mode: 'chart', year: 2025, page: 1, country: 'GB' });
    assert.equal(urls[0].searchParams.get('primary_release_date.lte'), '2025-12-31');
    assert.deepEqual(result.items.map(item => item.tmdbId), [1]);
    assert.equal(result.items[0].position, 1); assert.equal(result.minimumVotes, 50);
    assert.equal(JSON.stringify(result).includes('private-fixture'), false);
  } finally { globalThis.fetch = previous; }
});

test('TV discovery resolves exact horror keywords rather than treating all fantasy shows as horror', async () => {
  const previous = globalThis.fetch; const urls = [];
  globalThis.fetch = async url => {
    const u = new URL(url); urls.push(u);
    if (u.pathname.endsWith('/search/keyword')) return reply({ results: [{ id: u.searchParams.get('query') === 'horror' ? 10 : 20, name: u.searchParams.get('query') }, { id: 30, name: 'not horror' }] });
    return reply({ total_pages: 1, results: [{ id: 5, name: 'Horror TV', first_air_date: '2025-03-01', poster_path: '/tv.jpg', vote_count: 60, vote_average: 8.1 }] });
  };
  try {
    const result = await fetchCatalogue(env, { type: 'tv', mode: 'chart', year: 2025, page: 1 });
    assert.equal(urls.find(u => u.pathname.includes('/discover/')).searchParams.get('with_keywords'), '10|20');
    assert.equal(result.items[0].type, 'tv'); assert.equal(result.classification, 'tmdb-horror-keyword');
  } finally { globalThis.fetch = previous; }
});

test('media endpoint keeps a last-good snapshot on a failed refresh and never returns credentials', async () => {
  const { default: worker } = await import('../worker/index.js');
  const previous = globalThis.fetch;
  globalThis.fetch = async () => new Response('unavailable', { status: 503 });
  const item = sanitizeMedia({ id: 1, title: 'Cached Film', release_date: '2025-01-01', poster_path: '/safe.jpg', vote_average: 7.5, vote_count: 100 }, 'movie');
  const DB = { prepare() { return { bind() { return this; }, first: async () => ({ payload_json: JSON.stringify({ items: [item] }), updated_at: '2025-01-01T00:00:00Z', expires_at: '2025-01-02T00:00:00Z' }), run: async () => ({}) }; } };
  try {
    const response = await worker.fetch(new Request('https://site.test/api/media?type=movie&id=1'), { ...env, DB, TMDB_PREVIEW_ON_DEMAND: 'true', DEFAULT_COUNTRY: 'GB' });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.item.title, 'Cached Film'); assert.equal(payload.stale, true);
    assert.equal(JSON.stringify(payload).includes('private-fixture'), false);
    assert.equal((await worker.fetch(new Request('https://site.test/api/media?type=movie&id=1'), { ...env, DB })).status, 404);
  } finally { globalThis.fetch = previous; }
});
