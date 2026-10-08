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
