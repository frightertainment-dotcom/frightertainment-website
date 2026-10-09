import test from 'node:test';
import assert from 'node:assert/strict';
import {
  averageReviews, buildAnnualRanking, findDuplicateFilms, refreshWithLastGood,
  snapshotFreshness, validateDataset
} from '../src/core.js';
import { testFilms, testReviews } from './fixtures/ranking.example.js';

test('normalizes numeric critic scales and averages equally', () => {
  const result = averageReviews(testReviews);
  assert.equal(result.status, 'ranked');
  assert.equal(result.criticCount, 3);
  assert.equal(result.average, 78); // (80 + 75 + 80) / 3 = 78.33
});

test('pending until three distinct verified professional critics qualify', () => {
  assert.equal(averageReviews(testReviews.slice(0, 2)).status, 'pending');
  assert.equal(averageReviews(testReviews.map(review => ({ ...review, permissionCleared: false }))).criticCount, 0);
  assert.equal(averageReviews(testReviews.map(review => ({ ...review, ratingKind: 'aggregator-positive-percentage' }))).status, 'pending');
});

test('a duplicate canonical review URL cannot contribute twice', () => {
  const duplicate = { ...testReviews[2], criticId: 'another-credit', reviewUrl: 'https://example.test/review/c?utm_source=copy#top' };
  const result = averageReviews([...testReviews, duplicate]);
  assert.equal(result.criticCount, 3);
});

test('a critic cannot add a second score for the same film and year through another outlet', () => {
  const repeat = { ...testReviews[0], reviewUrl: 'https://example.test/second-writeup', publishedAt: '2026-02-01', score: 1 };
  const result = averageReviews([...testReviews, repeat]);
  assert.equal(result.criticCount, 3);
});

test('duplicate film IDs and same-title year territory records are detected', () => {
  assert.equal(findDuplicateFilms([...testFilms, { ...testFilms[0] }]).length, 2);
});

test('annual ranking uses verified film year and reports movement from the previous valid snapshot', () => {
  const ranked = buildAnnualRanking(testFilms, testReviews, 2026, [{ filmId: 'fixture-film-a', position: 2 }]);
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].movementLabel, 'UP 1');
  assert.equal(buildAnnualRanking(testFilms, testReviews, 2026)[0].movementLabel, '—');
  assert.equal(buildAnnualRanking(testFilms, testReviews, 2025).length, 0);
  const territoryYearOnly = [{ ...testFilms[0], filmYear: 2025, releaseYear: 2026 }];
  assert.equal(buildAnnualRanking(territoryYearOnly, testReviews, 2026).length, 0);
  const correctFilmYearReviews = testReviews.map(review => ({ ...review, filmYear: 2025 }));
  assert.equal(buildAnnualRanking(territoryYearOnly, correctFilmYearReviews, 2025).length, 1);
});

test('release date claims must include an ISO date and territory', () => {
  const valid = { kind: 'coming-soon', country: 'GB', sourceName: 'Fixture', sourceUrl: 'https://example.test/feed', territory: 'GB', checkedAt: '2026-10-08', items: [{ id: 'x', title: 'Fixture', sourceName: 'Fixture', sourceUrl: 'https://example.test/x', territory: 'GB', releaseDate: '2026-11-01', releaseTerritory: 'GB', checkedAt: '2026-10-08' }] };
  assert.equal(validateDataset(valid), valid);
  assert.throws(() => validateDataset({ ...valid, items: [{ ...valid.items[0], releaseTerritory: '' }] }), /territory/);
  assert.throws(() => validateDataset({ ...valid, items: [{ ...valid.items[0], releaseTerritory: 'US' }] }), /territory/);
  assert.throws(() => validateDataset({ ...valid, territory: 'US' }), /country/);
  assert.throws(() => validateDataset({ ...valid, items: [{ ...valid.items[0], territory: 'US' }] }), /match/);
  assert.throws(() => validateDataset({ ...valid, items: [valid.items[0], valid.items[0]] }), /id/);
  assert.throws(() => validateDataset({ ...valid, country: 'UK' }), /alpha-2/);
});

test('expired feed snapshots are not called current', () => {
  assert.equal(snapshotFreshness({ updatedAt: '2026-10-01T00:00:00Z', maxAgeMs: 1000 }, Date.parse('2026-10-08T00:00:00Z')), 'stale');
  assert.equal(snapshotFreshness(null), 'unavailable');
});

test('provider failures keep the last valid snapshot and log failure', async () => {
  const previous = { items: ['last-good'] };
  let published = false;
  let logged = false;
  const result = await refreshWithLastGood({
    load: async () => { throw new Error('synthetic provider outage'); },
    validate: value => value,
    publish: async () => { published = true; },
    readLastGood: async () => previous,
    logFailure: async error => { logged = error.message === 'synthetic provider outage'; }
  });
  assert.equal(result.status, 'retained');
  assert.equal(result.dataset, previous);
  assert.equal(published, false);
  assert.equal(logged, true);
});
