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

test('all directly served HTML pages declare the shared display and body fonts', async () => {
  const files = await htmlFiles(process.cwd());
  assert.ok(files.length > 0);
  for (const file of files) {
    const html = await readFile(file, 'utf8');
    assert.match(html, /fonts\.googleapis\.com\/css2\?family=Barlow\+Condensed/, `${file} must load Barlow Condensed directly`);
    assert.match(html, /family=Bebas\+Neue/, `${file} must load the OFL-licensed display face directly`);
    assert.match(html, /family=Cormorant\+Garamond:wght@500;600;700/, `${file} must load the cinematic display face directly`);
    assert.match(html, /family=DM\+Sans/, `${file} must load DM Sans directly`);
  }
});

test('section and film display typography uses the licensed horror display face with a safe fallback', async () => {
  const css = await readFile(join(process.cwd(), 'hub.css'), 'utf8');
  assert.match(css, /--font-horror:'Cormorant Garamond',Georgia,serif/);
  assert.match(css, /--font-room:'Grenze Gotisch',Georgia,serif/, 'Movies and indie horror rooms use the licensed Gothic display');
  assert.match(css, /\.hub-intro h1,\.hub-page-intro h1[^\n]*font-family:var\(--font-room,var\(--font-horror,var\(--font-display\)\)\)/);
  assert.match(css, /\.hub-section \.fr-movie-hero__info h1\{font-family:var\(--font-room,var\(--font-horror,var\(--font-display\)\)\)/);
  assert.match(css, /\.hub-chart-row a\{font:700 16px\/1\.1 var\(--font-room,var\(--font-horror,var\(--font-display\)\)\)/);
});

test('Cormorant Garamond license and fallback behavior are documented', async () => {
  const docs = await readFile(join(process.cwd(), 'TYPOGRAPHY.md'), 'utf8');
  assert.match(docs, /SIL Open Font License 1\.1/);
  assert.match(docs, /Georgia/);
  assert.match(docs, /Cormorant Garamond/);
});

test('generated film detail templates present a synopsis once and retain the sourced claim list', async () => {
  const files = (await htmlFiles(join(process.cwd(), 'films'))).filter(file => file.endsWith('index.html'));
  assert.ok(files.length > 0);
  for (const file of files) {
    const html = await readFile(file, 'utf8');
    assert.equal((html.match(/class="fr-movie-hero__synopsis"/g) || []).length, 1, `${file} should show its overview once`);
    assert.doesNotMatch(html, /class="film-page__synopsis"/, `${file} should not repeat its synopsis in a second prominent block`);
    assert.match(html, /class="source-list"/, `${file} must retain the sourced claim list`);
    assert.match(html, /at least three distinct professional critics have eligible, verified reviews/, `${file} must retain Fright Rating eligibility requirements`);
  }
});
