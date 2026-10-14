// Local static browser resource observations, not a Core Web Vitals score.
// PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium node scripts/measure-theme-requests.mjs
import { chromium } from '@playwright/test';
import { stat, writeFile } from 'node:fs/promises';

const origin = process.env.FR_CAPTURE_ORIGIN || 'http://127.0.0.1:4173';
const routes = [['home', '/'], ['movies', '/movies.html'], ['tv', '/tv-shows.html'],
  ['cinema', '/cinema.html'], ['indie', '/indie-movies.html'],
  ['podcasts', '/podcasts.html'], ['games', '/games.html']];
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox']
});
const observations = [];
for (const [name, route] of routes) {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.goto(origin + route, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(650);
    const paths = await page.evaluate(() => [...new Set(performance.getEntriesByType('resource')
      .map(entry => new URL(entry.name).pathname)
      .filter(path => path.startsWith('/assets/themes/')))]);
    const assets = await Promise.all(paths.map(async path => ({ path, bytes: (await stat(`.${path}`)).size })));
    observations.push({ page: name, width, assets, totalThemeBytes: assets.reduce((sum, asset) => sum + asset.bytes, 0) });
    await context.close();
  }
}
await browser.close();
const legacy = await Promise.all(['assets/horror-wall-wide.webp', 'assets/worlds/movies-vault.webp']
  .map(async path => ({ path, bytes: (await stat(path)).size })));
await writeFile('docs/evidence/after/theme-requests.json', JSON.stringify({
  capturedAt: new Date().toISOString(), origin, state: 'Local static fallback',
  observations, legacyFileSizeReferences: legacy,
  caveat: 'File sizes and browser resource names are measured; old-page network transfer and live-preview speed were not measured.'
}, null, 2) + '\n');
console.log(observations.map(item => `${item.page} ${item.width}: ${item.assets.length} themes, ${item.totalThemeBytes} bytes`).join('\n'));
