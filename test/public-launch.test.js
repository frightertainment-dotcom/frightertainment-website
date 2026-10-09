import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/api/[[path]].js';

test('public Pages without a D1 binding supplies an honest pending annual chart', async () => {
  const result = await onRequest({
    request: new Request('https://www.frightertainment.com/api/rankings?year=2026'), env: {}
  });
  assert.equal(result.status, 200);
  assert.equal(result.headers.get('cache-control'), 'no-store');
  const payload = await result.json();
  assert.equal(payload.year, 2026);
  assert.equal(payload.status, 'pending');
  assert.equal(payload.rankedFilms, 0);
  assert.equal(payload.updatedAt, null);
  assert.deepEqual(payload.items, []);
  assert.equal(payload.rankingSchemaStatus, 'awaiting-approved-reviews');
});

test('public Pages without D1 rejects invalid ranking-year requests', async () => {
  for (const year of ['nope', '0', '20269999', '1800', '9999']) {
    const response = await onRequest({
      request: new Request('https://www.frightertainment.com/api/rankings?year=' + year), env: {}
    });
    assert.equal(response.status, 400, 'Invalid year was accepted: ' + year);
  }
});

test('unconfigured live APIs cannot pretend provider data exists', async () => {
  for (const url of ['/api/health', '/api/discovery?country=GB', '/api/cinema/films']) {
    const response = await onRequest({
      request: new Request('https://www.frightertainment.com' + url), env: {}
    });
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal((await response.json()).error.code, 'not_configured');
  }
});
