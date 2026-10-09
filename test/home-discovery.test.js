import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

test('homepage exposes all five automated horror discovery panels and safe pending copy', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  const script = await readFile(new URL('home-discovery.js', root), 'utf8');
  for (const kind of ['rankings', 'theatrical-releases', 'streaming-releases', 'coming-soon', 'trending-horror']) {
    assert.match(html, new RegExp(`data-home-list="${kind}"`));
    assert.match(html, new RegExp(`data-home-state="${kind}"`));
    assert.match(html, new RegExp(`data-home-updated="${kind}"`));
  }
  assert.match(html, /id="home-country"/);
  assert.match(html, /id="home-search"/);
  assert.match(html, /home-discovery\.js/);
  assert.match(script, /api\/discovery\?country=/);
  assert.match(script, /api\/rankings\?year=/);
  assert.match(script, /Critic ranking pending: verified critic scores are not yet available/);
  assert.match(script, /Release path unconfirmed/);
  assert.match(script, /safeUrl/);
});
