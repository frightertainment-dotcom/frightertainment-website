// Local fixture-only watchlist geometry and interaction check. No preview data
// or browser saves are modified outside this temporary Playwright context.
import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const origin = process.env.FR_CAPTURE_ORIGIN || 'http://127.0.0.1:4173';
const titles = [
  'Longlegs', 'The Monkey', 'Heretic', 'Heart Eyes', 'Nosferatu',
  'Together', 'Bring Her Back', 'Talk to Me', 'Hereditary', 'Saint Maud',
  "Five Nights at Freddy's 2", 'The Fall of the House of Usher'
];
const ids = [1226578, 1124620, 1138194, 1302916, 426063];
const records = titles.map((title, index) => ({
  tmdbId: ids[index] || 2000000 + index, title,
  type: index === 11 ? 'tv' : 'movie', posterPath: '', year: 2025
}));
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox']
});
const results = [];
for (const width of [320, 390, 1440]) {
  const context = await browser.newContext({ viewport: { width, height: 844 },
    deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(origin + '/');
  for (const size of [0, 1, 5, 12]) {
    await page.evaluate(items => localStorage.setItem('frightertainment-v5-watchlist', JSON.stringify(items)), records.slice(0, size));
    await page.reload();
    const result = await page.locator('#my-watchlist').evaluate((shelf, expected) => {
      const grid = shelf.querySelector('[data-home-watch-items]');
      const items = [...grid.querySelectorAll('.fr-home-watch-shelf__item')];
      const rect = shelf.getBoundingClientRect();
      return {
        expected, displayed: items.length,
        count: Number(shelf.querySelector('[data-home-watch-count]').textContent),
        shelfHeight: rect.height, gridWidth: grid.clientWidth,
        gridScrollWidth: grid.scrollWidth,
        documentWidth: document.documentElement.scrollWidth,
        viewport: innerWidth,
        separateActions: items.every(item => {
          const link = item.querySelector('a.fr-home-watch-shelf__movie');
          const remove = item.querySelector('button.fr-home-watch-shelf__remove');
          return link && remove && !link.contains(remove);
        }),
        titleContained: items.every(item => {
          const tile = item.getBoundingClientRect();
          const title = item.querySelector('.fr-home-watch-shelf__movie-title').getBoundingClientRect();
          return title.right <= tile.right + 1 && title.bottom <= tile.bottom + 1;
        })
      };
    }, size);
    if (result.displayed !== size || result.count !== size ||
        result.documentWidth > width + 2 || !result.separateActions || !result.titleContained ||
        result.shelfHeight > 310) throw new Error(JSON.stringify({ width, ...result }));
    results.push({ width, ...result });
    if (size === 12 && width !== 320) {
      await page.locator('#my-watchlist').screenshot({
        path: `docs/evidence/after/watchlist-12-fixture-${width === 390 ? 'mobile390' : 'desktop1440'}.png`
      });
    }
  }
  if (width === 390) {
    await page.locator('.fr-home-watch-shelf__movie').first().click();
    if (new URL(page.url()).pathname !== '/media.html') throw new Error('Watchlist detail link failed');
    await page.goBack();
    await page.locator('.fr-home-watch-shelf__remove').first().click();
    const afterRemove = await page.evaluate(() => JSON.parse(localStorage.getItem('frightertainment-v5-watchlist') || '[]').length);
    await page.reload();
    const afterReload = await page.locator('.fr-home-watch-shelf__item').count();
    if (afterRemove !== 11 || afterReload !== 11) throw new Error('Watchlist removal/reload failed');
    results.push({ width, action: 'open details, return, remove first save, reload', afterRemove, afterReload });
  }
  await context.close();
}
await browser.close();
await writeFile('docs/evidence/after/watchlist-states-fixture.json', JSON.stringify({
  capturedAt: new Date().toISOString(), origin, fixture: true,
  note: 'Only the first five TMDB IDs are from existing verified test identities; the additional IDs are local geometry fixtures and never enter the deployed catalogue.',
  results
}, null, 2) + '\n');
console.log(`${results.length} fixture watchlist observations passed`);
