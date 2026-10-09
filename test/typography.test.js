import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'test-results' || entry.name === 'playwright-report' || entry.name === '.git') continue;
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
    assert.match(html, /family=DM\+Sans/, `${file} must load DM Sans directly`);
  }
});

test('section and film display typography uses the licensed horror display face with a safe fallback', async () => {
  const css = await readFile(join(process.cwd(), 'hub.css'), 'utf8');
  assert.match(css, /--font-horror:'Bebas Neue',var\(--font-display\)/);
  assert.match(css, /\.hub-section \.hub-page-intro h1[^\n]*font-family:var\(--font-horror,var\(--font-display\)\)/);
  assert.match(css, /\.film-page \.fr-movie-hero__info h1[^\n]*font-family:var\(--font-horror,var\(--font-display\)\)/);
});

test('generated film detail templates present a synopsis once and retain the sourced claim list', async () => {
  const files = (await htmlFiles(join(process.cwd(), 'films'))).filter(file => file.endsWith('index.html'));
  assert.ok(files.length > 0);
  for (const file of files) {
    const html = await readFile(file, 'utf8');
    assert.equal((html.match(/class="fr-movie-hero__synopsis"/g) || []).length, 1, `${file} should show its overview once`);
    assert.doesNotMatch(html, /class="film-page__synopsis"/, `${file} should not repeat its synopsis in a second prominent block`);
    assert.match(html, /class="source-list"/, `${file} must retain the sourced claim list`);
    assert.match(html, /at least three distinct professional critics and reuse permission are verified/, `${file} must retain Fright Index eligibility requirements`);
  }
});
