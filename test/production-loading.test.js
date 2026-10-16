import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

test('production home preserves the complete CSS cascade with two local blocking stylesheets', async () => {
  execFileSync(process.execPath, ['scripts/build-production.mjs'], { stdio: 'pipe' });
  const html = await readFile('dist/index.html', 'utf8');
  const links = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)].map(x => x[0]);
  assert.equal(links.length, 2, 'First-paint contract and complete home cascade are the only blocking stylesheets');
  assert.ok(links.every(x => /href="\//.test(x)), 'No third-party stylesheet delays first paint');
  const bundle = await readFile('dist/fr-home-core.css', 'utf8');
  const files = ['styles.css','hub.css','v5-magazine.css','fr-design-system.css','fr-page-themes.css','fr-rating-badge.css','fr-premium.css','horror-radar.css','frightnews.css'];
  let end = -1;
  for (const file of files) {
    const css = await readFile(file, 'utf8');
    const at = bundle.indexOf(css);
    assert.ok(at > end, file + ' must be present verbatim and in cascade order');
    end = at + css.length - 1;
  }
  assert.match(bundle, /font-family: 'DM Sans'/);
  assert.doesNotMatch(bundle, /url\(https:\/\/fonts\./);
  assert.match(html, /<script src="\/fr-rating-badge\.js" defer>/);
  assert.match(html, /href="\/assets\/frightertainment-brand\.png" fetchpriority="high"/);
  assert.match(html, /imagesrcset="\/assets\/frightertainment-brand-640\.webp 640w, \/assets\/frightertainment-brand-1280\.webp 1280w"/);
  assert.equal((html.match(/srcset="\/assets\/frightertainment-brand-640\.webp/g)||[]).length, 3,
    'Logo preload and both logo images must request the same responsive files');
  assert.match(html, /href="\/assets\/themes\/home-mobile\.webp" media="\(max-width:700px\)" fetchpriority="high"/);
  const news = await readFile('dist/frightnews.js', 'utf8');
  assert.doesNotMatch(news, /\/assets\/(?:themes|worlds)\//, 'Tiny news artwork must not download full scene files');
  for(const url of new Set(news.match(/\/assets\/news-thumbs\/[a-z0-9-]+\.webp/g))) {
    assert.ok((await readFile('dist'+url)).length<40000, 'News thumbnail exceeds its byte budget: '+url);
  }
});
