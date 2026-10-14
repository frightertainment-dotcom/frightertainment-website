// Local static fallback matrix, including both sides of touched breakpoints.
// PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium node scripts/measure-seven-layouts.mjs
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const origin = process.env.FR_CAPTURE_ORIGIN || 'http://127.0.0.1:4173';
const routes = [
  ['home', '/'], ['movies', '/movies.html'], ['tv', '/tv-shows.html'],
  ['cinema', '/cinema.html'], ['indie', '/indie-movies.html'],
  ['podcasts', '/podcasts.html'], ['games', '/games.html']
];
const widths = [320, 359, 360, 379, 380, 381, 390, 430, 699, 700, 701,
  768, 799, 800, 801, 900, 980, 999, 1000, 1001, 1024, 1099,
  1100, 1101, 1280, 1440, 1920];
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox']
});
const observations = [];
for (const [name, route] of routes) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(origin + route, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  for (const width of widths) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForTimeout(70);
    const result = await page.evaluate(() => {
      const rect = selector => document.querySelector(selector)?.getBoundingClientRect().toJSON() ?? null;
      const intro = rect('.hub-page-intro,.fr-home-intro');
      const art = rect('.editorial-pick__art-frame');
      const title = rect('.editorial-pick__title');
      const synopsis = rect('.editorial-pick__synopsis');
      const links = rect('.editorial-pick__links');
      const host = rect('.editorial-pick');
      return {
        width: innerWidth, height: innerHeight, dpr: devicePixelRatio,
        zoom: visualViewport?.scale ?? null, theme: document.body.dataset.theme,
        route: location.pathname, documentWidth: document.documentElement.scrollWidth,
        intro, art, title, synopsis, links, host,
        chartRows: document.querySelectorAll('#hub-chart-results .hub-chart-row').length,
        chartInnerScroll: (() => { const list = document.querySelector('#hub-chart-results');
          return list ? list.scrollHeight > list.clientHeight + 1 : null; })()
      };
    });
    const issues = [];
    if (result.documentWidth > width + 2) issues.push('horizontal overflow');
    if (result.theme !== name) issues.push('wrong page identity');
    if (result.host && result.links && result.links.bottom > result.host.bottom + 1)
      issues.push('editorial actions outside feature');
    if (result.host && result.synopsis && result.synopsis.bottom > result.host.bottom + 1)
      issues.push('editorial synopsis outside feature');
    observations.push({ name, ...result, issues });
  }
  await context.close();
}

// Emulates Chrome's phone desktop-site viewport shape. A physical phone remains
// necessary to verify browser chrome changes and the actual OS setting.
const desktopSite = [];
await mkdir('docs/evidence/after', { recursive: true });
for (const [name, route] of routes) {
  const context = await browser.newContext({
    viewport: { width: 980, height: 844 }, screen: { width: 390, height: 844 },
    deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    reducedMotion: 'reduce'
  });
  const page = await context.newPage();
  await page.goto(origin + route, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  desktopSite.push(await page.evaluate(name => ({
    name, route: location.pathname, theme: document.body.dataset.theme,
    innerWidth, screenWidth: screen.width, dpr: devicePixelRatio,
    documentWidth: document.documentElement.scrollWidth,
    zoom: visualViewport?.scale ?? null,
    countryPresent: !!document.querySelector('#cinema-country')
  }), name));
  await page.screenshot({
    path: `docs/evidence/after/${name}-phone-desktop-site980-first.jpg`,
    type: 'jpeg', quality: 82
  });
  await context.close();
}
await browser.close();
await writeFile('docs/evidence/after/layout-matrix.json', JSON.stringify({
  capturedAt: new Date().toISOString(), origin, browser: browser.version(),
  state: 'Local static fallback; /api/ unavailable', widths, observations,
  desktopSite, physicalDeviceVerified: false
}, null, 2) + '\n');
const failed = observations.filter(item => item.issues.length);
const desktopSiteFailed = desktopSite.filter(item => item.innerWidth !== 980 ||
  item.screenWidth !== 390 || item.dpr !== 3 || item.documentWidth > item.innerWidth + 2 ||
  item.theme !== item.name || (item.name === 'cinema' && !item.countryPresent));
console.log(`${observations.length} viewport observations; ${failed.length} issue entries; ${desktopSite.length} emulated phone desktop-site observations; ${desktopSiteFailed.length} desktop-site issues`);
if (failed.length || desktopSiteFailed.length) {
  console.log(failed.slice(0, 12).map(item => `${item.name} ${item.width}: ${item.issues.join(', ')}`).join('\n'));
  console.log(desktopSiteFailed.map(item => `${item.name}: ${JSON.stringify(item)}`).join('\n'));
  process.exitCode = 1;
}
