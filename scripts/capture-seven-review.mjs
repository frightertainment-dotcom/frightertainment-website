// Reproducible local visual evidence. Run against the review worktree's static
// server with PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium node scripts/capture-seven-review.mjs.
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const origin = process.env.FR_CAPTURE_ORIGIN || 'http://127.0.0.1:4173';
const output = 'docs/evidence/after';
const routes = [
  ['home', '/'], ['movies', '/movies.html'], ['tv-shows', '/tv-shows.html'],
  ['cinema', '/cinema.html'], ['indie-movies', '/indie-movies.html'],
  ['podcasts', '/podcasts.html'], ['games', '/games.html']
];
const viewports = [['mobile390', 390, 844], ['desktop1440', 1440, 900]];
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox']
});
const captures = [];
await mkdir(output, { recursive: true });

async function capture(slug, route, label, width, height, detailSelector) {
  const context = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: 1,
    colorScheme: 'dark', reducedMotion: 'reduce'
  });
  const page = await context.newPage();
  const api = [];
  const errors = [];
  page.on('response', response => {
    if (response.url().includes('/api/')) api.push({
      path: new URL(response.url()).pathname, status: response.status()
    });
  });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin + route, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200);
  const metrics = await page.evaluate(() => {
    const rect = selector => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const r = element.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height,
        clientHeight: element.clientHeight, scrollHeight: element.scrollHeight };
    };
    const intro = document.querySelector('.hub-page-intro, .fr-home-intro');
    return {
      route: location.pathname, viewport: { width: innerWidth, height: innerHeight },
      visualScale: visualViewport?.scale ?? null,
      dpr: devicePixelRatio, fontStatus: document.fonts.status,
      fontDisplayLoaded: document.fonts.check('600 32px "Grenze Gotisch"'),
      documentWidth: document.documentElement.scrollWidth,
      bodyPage: document.body.dataset.page || null,
      theme: document.body.dataset.theme || null,
      introBackground: intro ? getComputedStyle(intro).backgroundImage : null,
      intro: rect('.hub-page-intro, .fr-home-intro'),
      editorial: rect('.editorial-pick'),
      synopsis: rect('.editorial-pick__synopsis'),
      chart: rect('#hub-chart-results'),
      country: rect('#cinema-country')
    };
  });
  const prefix = join(output, `${slug}-${label}`);
  if (!detailSelector) {
    await page.screenshot({ path: prefix + '-first.png', animations: 'disabled' });
    await page.screenshot({ path: prefix + '-full.png', fullPage: true, animations: 'disabled' });
  } else {
    const detail = page.locator(detailSelector).first();
    if (await detail.count()) await detail.screenshot({ path: prefix + '-detail.png', animations: 'disabled' });
  }
  captures.push({
    slug, requested: origin + route, final: page.url(), label, browser: browser.version(),
    metrics, api, errors, state: 'Local static fallback; no /api/ backend and empty watchlist',
    files: detailSelector ? [prefix + '-detail.png'] : [prefix + '-first.png', prefix + '-full.png']
  });
  await context.close();
}

for (const [slug, route] of routes) {
  for (const [label, width, height] of viewports)
    await capture(slug, route, label, width, height);
}
for (const [slug, route, selector] of [
  ['movies', '/movies.html', '.hub-page-intro'],
  ['indie-movies', '/indie-movies.html', '.editorial-pick'],
  ['podcasts', '/podcasts.html', '.editorial-pick']
]) {
  for (const width of slug === 'movies' ? [320, 980] : [768, 980])
    await capture(slug, route, `width${width}`, width, 844, selector);
}
await writeFile(join(output, 'capture-metadata.json'), JSON.stringify({
  capturedAt: new Date().toISOString(), origin, captures
}, null, 2) + '\n');
await browser.close();
