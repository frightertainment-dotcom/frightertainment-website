import test from 'node:test';
import assert from 'node:assert/strict';
import { importLicensedReviews, parseLicensedReviewFeed } from '../worker/review-ingestion.js';

const record = overrides => ({
  providerReviewId: 'provider-review-001', filmId: 'fixture-film-a', filmYear: 2026,
  criticId: 'critic-a', criticName: 'Fixture Critic', publication: 'Fixture Journal',
  publicationUrl: 'https://journal.example.test/about', reviewUrl: 'https://journal.example.test/review/001',
  score: 4, scoreOutOf: 5, ratingKind: 'numeric-professional-review', territory: 'GB',
  publishedAt: '2026-09-01', checkedAt: '2026-10-09', permissionCleared: true,
  professionalVerified: true, permissionEvidenceUrl: 'https://provider.example.test/licence/record-001',
  ...overrides
});

test('licensed review feed validates normalized numeric reviews and retains source permission evidence', () => {
  const parsed = parseLicensedReviewFeed({ providerId: 'licensed-test', reviews: [record()] }, 'licensed-test');
  assert.equal(parsed.reviews.length, 1);
  assert.equal(parsed.reviews[0].normalizedScore, 80);
  assert.equal(parsed.reviews[0].filmYear, 2026);
  assert.equal(parsed.reviews[0].permissionEvidenceUrl, 'https://provider.example.test/licence/record-001');
  assert.equal(parsed.questionable.length, 0);
});

test('licensed review feed rejects incompatible scores, missing rights evidence, unsafe URLs and duplicates for editorial review', () => {
  const parsed = parseLicensedReviewFeed({ providerId: 'licensed-test', reviews: [
    record({ providerReviewId: 'percentage', ratingKind: 'aggregator-positive-percentage', score: 91, scoreOutOf: 100 }),
    record({ providerReviewId: 'no-rights', permissionEvidenceUrl: '' }),
    record({ providerReviewId: 'unsafe-url', reviewUrl: 'https://user:secret@journal.example.test/review' }),
    record(), record()
  ] }, 'licensed-test');
  assert.equal(parsed.reviews.length, 1);
  assert.equal(parsed.questionable.length, 4);
  assert(parsed.questionable.some(item => /permission evidence/.test(item.reason)));
  assert(parsed.questionable.some(item => /Duplicate provider review ID/.test(item.reason)));
});

test('feed schema rejects provider mismatches and unbounded records', () => {
  assert.throws(() => parseLicensedReviewFeed({ providerId: 'other', reviews: [] }, 'licensed-test'), /configured providerId/);
  assert.throws(() => parseLicensedReviewFeed({ providerId: 'licensed-test', reviews: Array(3001).fill(record()) }, 'licensed-test'), /at most 3000/);
});

test('licensed ingestion remains disabled without provider configuration and makes no request', async () => {
  let called = false;
  const result = await importLicensedReviews({}, {}, async () => { called = true; throw Error('must not call provider'); });
  assert.deepEqual(result, { status: 'disabled', imported: 0, queued: 0, revisions: 0 });
  assert.equal(called, false);
});

test('licensed ingestion fails closed on unapproved licensing and disallowed feed hosts', async () => {
  await assert.rejects(importLicensedReviews({ REVIEW_FEED_ENABLED: 'true' }, {}, async () => {}), /commercial reuse approval/);
  const config = {
    REVIEW_FEED_ENABLED: 'true', REVIEW_FEED_LICENSE_APPROVED: 'true', REVIEW_FEED_PROVIDER_ID: 'licensed-test',
    REVIEW_FEED_API_KEY: 'test-secret', REVIEW_FEED_URL: 'https://not-allowlisted.example.test/reviews', REVIEW_FEED_ALLOWED_HOSTS: 'reviews.example.test'
  };
  await assert.rejects(importLicensedReviews(config, {}, async () => {}), /not in REVIEW_FEED_ALLOWED_HOSTS/);
});

test('licensed ingestion stages a validated review for an exact canonical film without publishing it', async () => {
  const writes = [];
  const DB = {
    prepare(sql) {
      const statement = { sql, values: [], bind(...values) { this.values = values; return this; },
        async all() { return { results: [{ film_id: 'fixture-film-a', title: 'Fixture Film', film_year: 2026 }] }; },
        async first() { return null; } };
      return statement;
    },
    async batch(statements) { writes.push(...statements); }
  };
  const config = {
    REVIEW_FEED_ENABLED: 'true', REVIEW_FEED_LICENSE_APPROVED: 'true', REVIEW_FEED_PROVIDER_ID: 'licensed-test',
    REVIEW_FEED_API_KEY: 'server-only-fixture-secret', REVIEW_FEED_URL: 'https://reviews.example.test/api/v1', REVIEW_FEED_ALLOWED_HOSTS: 'reviews.example.test'
  };
  const response = new Response(JSON.stringify({ providerId: 'licensed-test', reviews: [record()] }), { headers: { 'content-type': 'application/json' } });
  const result = await importLicensedReviews(config, DB, async (url, options) => {
    assert.equal(url.hostname, 'reviews.example.test');
    assert.equal(options.headers.authorization, 'Bearer server-only-fixture-secret');
    return response;
  });
  assert.deepEqual(result, { status: 'staged', imported: 1, queued: 0, revisions: 0 });
  assert.equal(writes.length, 1);
  assert.match(writes[0].sql, /VALUES\(\?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, 1, \?, 1, 'pending', 'licensed-provider'/);
  assert.equal(writes[0].values.at(-1), 'provider-review-001');
});

test('oversized provider bodies stop at the streaming byte cap before JSON parsing', async () => {
  const config = {
    REVIEW_FEED_ENABLED: 'true', REVIEW_FEED_LICENSE_APPROVED: 'true', REVIEW_FEED_PROVIDER_ID: 'licensed-test',
    REVIEW_FEED_API_KEY: 'fixture', REVIEW_FEED_URL: 'https://reviews.example.test/api/v1', REVIEW_FEED_ALLOWED_HOSTS: 'reviews.example.test'
  };
  const DB = { prepare() { throw new Error('oversized response must be rejected before D1 access'); } };
  const body = 'x'.repeat(2_000_001);
  await assert.rejects(importLicensedReviews(config, DB, async () => new Response(body, { headers: { 'content-type': 'application/json' } })), /2 MB safety limit/);
});

test('questionable feed rows are allowlisted before administrative review storage', async () => {
  const writes = [];
  const DB = {
    prepare(sql) { return { sql, values: [], bind(...values) { this.values = values; return this; }, async all() { return { results: [] }; }, async first() { return null; } }; },
    async batch(statements) { writes.push(...statements); }
  };
  const config = {
    REVIEW_FEED_ENABLED: 'true', REVIEW_FEED_LICENSE_APPROVED: 'true', REVIEW_FEED_PROVIDER_ID: 'licensed-test',
    REVIEW_FEED_API_KEY: 'fixture', REVIEW_FEED_URL: 'https://reviews.example.test/api/v1', REVIEW_FEED_ALLOWED_HOSTS: 'reviews.example.test'
  };
  const invalid = record({ criticId: 'bad\u0000identity', permissionEvidenceUrl: '', secret: 'DO_NOT_STORE' });
  const response = new Response(JSON.stringify({ providerId: 'licensed-test', reviews: [invalid] }), { headers: { 'content-type': 'application/json' } });
  const result = await importLicensedReviews(config, DB, async () => response);
  assert.equal(result.queued, 1);
  const payload = writes[0].values[4];
  assert.equal(payload.includes('DO_NOT_STORE'), false);
  assert.deepEqual(Object.keys(JSON.parse(payload)).sort(), [
    'checkedAt', 'criticId', 'criticName', 'filmId', 'filmYear', 'permissionCleared', 'permissionEvidenceUrl',
    'professionalVerified', 'publication', 'publicationUrl', 'providerReviewId', 'publishedAt', 'ratingKind', 'reviewUrl',
    'score', 'scoreOutOf', 'territory'
  ].sort());
});
