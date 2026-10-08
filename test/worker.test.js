import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.js';

test('health endpoint returns JSON without a data binding', async () => {
  const response = await worker.fetch(new Request('https://site.test/api/health'), {});
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, 'ok');
});

test('admin endpoints reject requests without an owner secret', async () => {
  const response = await worker.fetch(new Request('https://site.test/api/admin/review-queue'), { DB: {} });
  assert.equal(response.status, 401);
});

test('unsupported country is rejected before database access', async () => {
  const response = await worker.fetch(new Request('https://site.test/api/discovery?country=ZZ'), { DEFAULT_COUNTRY: 'GB', DB: {} });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error.message, /Unsupported country/);
});

test('cinema API applies the per-client quota before spending another MovieGlu request', async () => {
  let calls = 0;
  let count = 0;
  const DB = { prepare(sql) {
    let values = [];
    return { bind(...args) { values = args; return this; },
      async first() {
        if (sql.includes('FROM canonical_films')) return { film_id: 'approved-fixture', title: 'Test fixture', movieglu_id: 123 };
        count = values[1] > 0 ? count + 1 : count;
        return { request_count: count };
      } };
  } };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { calls++; return new Response(JSON.stringify({ cinemas: [] }), { status: 200 }); };
  try {
    const env = { DB, DEFAULT_COUNTRY: 'GB', CINEMA_RATE_LIMIT_SALT: 'test-only-salt', MOVIEGLU_LICENSE_APPROVED: 'true',
      MOVIEGLU_API_KEY: 'fixture', MOVIEGLU_AUTHORIZATION: 'fixture', MOVIEGLU_CLIENT: 'fixture', MOVIEGLU_API_VERSION: 'v200' };
    const makeRequest = () => new Request('https://site.test/api/cinema?country=GB', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': '192.0.2.1' },
      body: JSON.stringify({ filmId: 'approved-fixture', lat: 51.5, lon: -0.1, date: new Date().toISOString().slice(0, 10) }) });
    for (let index = 0; index < 10; index++) assert.equal((await worker.fetch(makeRequest(), env)).status, 200);
    assert.equal((await worker.fetch(makeRequest(), env)).status, 429);
    assert.equal(calls, 10);
  } finally { globalThis.fetch = originalFetch; }
});

test('approved horror film detail API returns source claims and hides unapproved records', async () => {
  const record = { id: 'approved-fixture', title: 'Test fixture', releaseYear: 2026, territory: 'GB', primarySourceName: 'Fixture source',
    primarySourceUrl: 'https://example.invalid/film', checkedAt: '2026-10-08', horrorSourceUrl: 'https://example.invalid/genre', releaseMode: 'unconfirmed', releaseModeSourceUrl: null };
  let current = record;
  const DB = { prepare() { return { bind() { return this; }, first: async () => current }; } };
  const response = await worker.fetch(new Request('https://site.test/api/films/approved-fixture'), { DB });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.film.title, 'Test fixture');
  assert.equal(result.claims[0].source, 'https://example.invalid/film');
  assert.deepEqual(result.unconfirmed, ['Territorial release date', 'Cast and crew', 'Synopsis', 'Official trailer', 'Promotional artwork']);
  current = null;
  assert.equal((await worker.fetch(new Request('https://site.test/api/films/pending-fixture'), { DB })).status, 404);
});
