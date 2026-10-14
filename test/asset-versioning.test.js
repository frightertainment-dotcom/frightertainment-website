import test from 'node:test';
import assert from 'node:assert/strict';
import { addVersionToTags } from '../scripts/version-public-assets.mjs';

test('public preview and production HTML get identical content-addressed local asset references', () => {
  const html = '<link rel="stylesheet" href="/hub.css"><script defer src="/release-calendar.js"></script><script src="/app.js"></script><a href="/movies.html">MOVIES</a>';
  const fingerprints = new Map([
    ['/hub.css', '0123456789ab'],
    ['/release-calendar.js', 'abc123def456'],
    ['/app.js', 'abcdef123456']
  ]);
  const output = addVersionToTags(html, fingerprints);
  assert.ok(output.includes('href="/hub.css?v=0123456789ab"'));
  assert.ok(output.includes('src="/release-calendar.js?v=abc123def456"'));
  assert.ok(output.includes('src="/app.js?v=abcdef123456"'));
  assert.ok(output.includes('href="/movies.html"'));
  assert.doesNotMatch(output, /<script\b[^>]*src="\/release-calendar\.js"/);
});
test('asset versioning refuses to publish HTML with missing or malformed asset fingerprints', () => {
  assert.throws(() => addVersionToTags('<script src="/release-calendar.js"></script>', new Map()), /Missing versioned public asset/);
  assert.throws(() => addVersionToTags('<link href="/hub.css">', new Map([['/hub.css', 'bad']])), /Missing versioned public asset/);
});
