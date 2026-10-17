import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');

test('Movies-only FrightWatch has exactly one blank, non-playable film slot', async () => {
  const html = await read('frightwatch.html');
  assert.match(html, /<nav class="fw-nav"/);
  const nav = html.match(/<nav class="fw-nav"[^>]*>([\s\S]*?)<\/nav>/)?.[1] || '';
  assert.equal((nav.match(/<a\b/g) || []).length, 1);
  assert.match(nav, />Movies<\/a>/);
  assert.equal((html.match(/class="fw-film"/g) || []).length, 1);
  assert.match(html, /data-frightwatch-slot="first-film"/);
  assert.match(html, /data-rights-status="pending"/);
  assert.match(html, /POSTER ARTWORK/);
  assert.match(html, /no obligation/i);
  assert.match(html, /unpaid screening agreements/i);
  assert.doesNotMatch(html, /<\b(?:button|video|iframe)\b/i);
  for(const missing of ['Continue Watching','Trending Now','FrightWatch Originals','The Hollowing','Terrifier','The Conjuring','My List','data-demo']) {
    assert.equal(html.includes(missing), false, 'Example content not removed: ' + missing);
  }
  const script = await read('frightwatch.js');
  assert.doesNotMatch(script, /The Hollowing|openDemo|originalTitles|demo-title|playback/i);
  const catalogue = JSON.parse(await read('data/frightwatch-catalogue.json'));
  assert.deepEqual(catalogue.films, []);
});

test('private preview includes FrightWatch and banner without adding banner to FrightWatch', async () => {
  const preview = await read('scripts/build-preview.mjs');
  for(const name of ['frightwatch.html','frightwatch.css','frightwatch.js','frightwatch-banner.js','frightwatch-banner.css','frightwatch-catalogue.json'])
    assert.ok(preview.includes(name), 'Preview missing ' + name);
  assert.match(preview,/entry\.name !== 'frightwatch\.html'/);
  assert.match(preview,/entry\.name !== 'frightwatch\.html' &&/);
});

test('production allowlist still excludes all FrightWatch assets', async () => {
  const production = await read('scripts/build-production.mjs');
  const list = production.slice(production.indexOf('const publicFiles = ['),production.indexOf('const publicDirectories = ['));
  assert.doesNotMatch(list, /frightwatch/i);
  assert.match(production, /Unreleased FrightWatch catalogue or artwork must never ship/);
  assert.match(production, /'frightwatch\.html'/);
});

test('global banner links to private FrightWatch without duplicating on page', async () => {
  const promo = await read('frightwatch-banner.js');
  assert.match(promo,/frightwatch\.html/);
  assert.match(promo,/header\.insertAdjacentElement\('afterend',link\)/);
});
