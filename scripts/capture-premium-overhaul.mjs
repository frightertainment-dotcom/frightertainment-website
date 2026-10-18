// Capture bounded local-build evidence. Run against `dist/` on port 4173.
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const phase = process.argv[2];
if (!['before', 'after'].includes(phase)) {
  throw new Error('Usage: node scripts/capture-premium-overhaul.mjs before|after');
}

const routes = [
  ['home', '/'], ['movies', '/movies.html'], ['tv', '/tv-shows.html'],
  ['cinema', '/cinema.html'], ['indie', '/indie-movies.html'],
  ['podcasts', '/podcasts.html'], ['games', '/games.html']
];
const output = `docs/premium-overhaul/evidence/${phase}`;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  args: ['--no-sandbox']
});
const observations = [];
try {
  for (const [width, height] of [[320, 740], [1440, 900]]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    for (const [name, route] of routes) {
      const page = await context.newPage();
      const errors = [];
      const failedRequests = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('requestfailed', request => failedRequests.push({ url: request.url(), failure: request.failure()?.errorText }));
      const response = await page.goto(`http://127.0.0.1:4173${route}`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${output}/${name}-${width}-first.jpg`, type: 'jpeg', quality: 76 });
      if (name === 'home' || name === 'movies') {
        await page.screenshot({ path: `${output}/${name}-${width}-full.jpg`, type: 'jpeg', quality: 68, fullPage: true });
      }
      const layout = await page.evaluate(() => ({
        title: document.title,
        bodyWidth: document.body.scrollWidth,
        viewportWidth: innerWidth,
        firstHeading: document.querySelector('main h1')?.textContent?.trim(),
        mainNav: [...document.querySelectorAll('nav[aria-label="Main site sections"] a')].map(a => ({ text: a.textContent.trim(), href: a.getAttribute('href'), current: a.getAttribute('aria-current') })),
        visibleImages: [...document.images].filter(img => img.getBoundingClientRect().top < innerHeight && img.getBoundingClientRect().bottom > 0).map(img => ({ alt: img.alt, src: img.currentSrc, loaded: img.complete && img.naturalWidth > 0 })).slice(0, 12)
      }));
      observations.push({ name, route, width, status: response?.status(), ...layout, errors, failedRequests: failedRequests.slice(0, 10) });
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
}
await writeFile(`${output}/observations.json`, JSON.stringify({ capturedAt: new Date().toISOString(), environment: 'headless Chromium against local dist; not hosted preview', observations }, null, 2) + '\n');
console.log(`${observations.length} local Chromium captures saved to ${output}`);
