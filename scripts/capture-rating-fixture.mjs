// Visual check of the shared rating component with labelled fixture values.
// PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium node scripts/capture-rating-fixture.mjs
import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 840, height: 650 }, deviceScaleFactor: 1 });
await page.goto((process.env.FR_CAPTURE_ORIGIN || 'http://127.0.0.1:4173') + '/movies.html');
await page.evaluate(() => {
  const sourceUrl = 'https://www.themoviedb.org/movie/123';
  const rows = [
    ['Compact, rated fixture', { score: 7.2, voteCount: 1234, source: 'tmdb-community', sourceUrl, size: 'compact' }],
    ['Standard, zero score fixture', { score: 0, voteCount: 1, source: 'tmdb-community', sourceUrl, size: 'standard' }],
    ['Feature, ten score fixture', { score: 10, voteCount: 99999, source: 'tmdb-community', sourceUrl, size: 'feature' }],
    ['Missing score fixture', { score: null, voteCount: null, source: 'tmdb-community', size: 'standard' }]
  ];
  const board = document.createElement('section');
  board.id = 'rating-fixture-board';
  board.style.cssText = 'width:780px;padding:24px;display:grid;gap:20px;background:#100e13;color:#fff;font:15px system-ui,sans-serif';
  board.innerHTML = '<h1 style="margin:0;font:600 23px system-ui,sans-serif">Component visual fixture — not published scores</h1>' +
    rows.map(([label, config]) => `<div style="display:grid;gap:8px"><strong>${label}</strong>${window.FRRatingBadge.html(config)}</div>`).join('');
  document.body.replaceChildren(board);
});
await page.locator('#rating-fixture-board img').first().waitFor({ state: 'visible' });
await page.locator('#rating-fixture-board').screenshot({ path: 'docs/evidence/after/rating-badge-variants-fixture.png' });
await writeFile('docs/evidence/after/rating-fixture-metadata.json', JSON.stringify({
  capturedAt: new Date().toISOString(), status: 'fixture-only',
  sourceAsset: 'assets/frightertainment-f.png', values: ['7.2/10', '0.0/10', '10.0/10', 'unavailable'],
  warning: 'Values and TMDB URL are controlled test fixtures, not editorial or live preview data.'
}, null, 2) + '\n');
await browser.close();
