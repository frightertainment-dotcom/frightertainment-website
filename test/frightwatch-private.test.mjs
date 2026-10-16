import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');

test('FrightWatch private landing has filmmaker invitation and no fabricated films', async () => {
  const html=await read('frightwatch.html');
  assert.match(html, /FrightWatch/);
  assert.match(html, /FRIGHTERTAINMENT PRESENTS/);
  assert.match(html, /SUBMIT YOUR PRODUCTION/);
  assert.match(html, /no obligation/i);
  assert.match(html, /unpaid streaming permissions/i);
  const catalogue=JSON.parse(await read('data/frightwatch-catalogue.json'));
  assert.equal(catalogue.version, 1);
  assert.deepEqual(catalogue.films, []);
});

test('private preview includes FrightWatch and sitewide banner', async () => {
  const preview=await read('scripts/build-preview.mjs');
  for (const name of ['frightwatch.html','frightwatch.css','frightwatch.js','frightwatch-banner.js','frightwatch-banner.css','frightwatch-catalogue.json'])
    assert.ok(preview.includes(name), 'Preview missing '+name);
  assert.match(preview, /entry\.name !== 'frightwatch\.html'/);
});

test('production build excludes and rejects FrightWatch files', async () => {
  const production=await read('scripts/build-production.mjs');
  const list=production.slice(production.indexOf('const publicFiles = ['),production.indexOf('const publicDirectories = ['));
  assert.doesNotMatch(list, /frightwatch/i);
  assert.match(production, /Unreleased FrightWatch catalogue or artwork must never ship/);
  assert.match(production, /'frightwatch\.html'/);
});

test('banner excludes FrightWatch and carries link to private landing', async () => {
  const promo=await read('frightwatch-banner.js');
  assert.match(promo,/frightwatch\.html/);
  assert.match(promo,/header\.insertAdjacentElement\('afterend',link\)/);
});
