import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (['node_modules', 'test-results', 'playwright-report', 'dist', '.wrangler', '.git'].includes(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(path));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(path);
  }
  return files;
}

test('all directly served HTML pages load the shared typography stylesheet', async () => {
  const files = await htmlFiles(process.cwd());
  assert.ok(files.length > 0);
  for (const file of files) {
    const html = await readFile(file, 'utf8');
    assert.match(html, /stylesheet[^>]+styles\.css/, `${file} must load the shared typography stylesheet`);
  }
});

test('site-wide typography uses readable Times New Roman and the supplied page wordmarks', async () => {
  const css = await readFile(join(process.cwd(), 'hub.css'), 'utf8');
  const baseCss = await readFile(join(process.cwd(), 'styles.css'), 'utf8');
  assert.match(baseCss, /--font-display:'Times New Roman',Georgia,serif;--font-body:'Times New Roman',Georgia,serif/);
  assert.doesNotMatch(baseCss, /UnifrakturMaguntia/);
  assert.match(css, /--font-horror:'Times New Roman',Georgia,serif/);
  assert.match(css, /--font-room:'Times New Roman',Georgia,serif/);
  assert.match(css, /font-family:"Times New Roman",Times,serif!important/);
  assert.doesNotMatch(css, /UnifrakturMaguntia/);
  for (const [page, image] of [['movies.html','page-title-movies.png'],['all-horror-movies.html','page-title-movies.png'],['tv-shows.html','page-title-tv-shows.png'],['cinema.html','page-title-cinema.png'],['indie-movies.html','page-title-indie-movies.png'],['podcasts.html','page-title-podcasts.png'],['games.html','page-title-games.png']]) {
    const html = await readFile(join(process.cwd(), page), 'utf8');
    assert.match(html, /class="hub-page-title hub-page-title--wordmark" aria-label=/);
    assert.match(html, new RegExp('/assets/' + image.replaceAll('.', '\\.')));
    assert.match(html, /class="sr-only"/);
  }
});

test('Times New Roman and accessible section wordmarks are documented', async () => {
  const docs = await readFile(join(process.cwd(), 'TYPOGRAPHY.md'), 'utf8');
  assert.match(docs, /Times New Roman/);
  assert.match(docs, /accessible text heading/);
});

test('generated film detail templates present a synopsis once and retain the sourced claim list', async () => {
  const files = (await htmlFiles(join(process.cwd(), 'films'))).filter(file => file.endsWith('index.html'));
  assert.ok(files.length > 0);
  for (const file of files) {
    const html = await readFile(file, 'utf8');
    assert.equal((html.match(/class="fr-movie-hero__synopsis"/g) || []).length, 1, `${file} should show its overview once`);
    assert.doesNotMatch(html, /class="film-page__synopsis"/, `${file} should not repeat its synopsis in a second prominent block`);
    assert.match(html, /class="source-list"/, `${file} must retain the sourced claim list`);
    assert.doesNotMatch(html, /<h2>FRIGHT RATING<\/h2>/, `${file} must omit the retired Fright Rating section`);
    assert.doesNotMatch(html, /DAILY · VERIFIED|Updated by calendar date|permission-cleared reviews are not available/i, `${file} should not expose operational copy`);
  }
});
