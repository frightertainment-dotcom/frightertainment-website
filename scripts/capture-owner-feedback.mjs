import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const phase = process.argv[2];
if (phase !== 'after') throw new Error('Only after captures are generated here; owner uploads are the before evidence');
const output = `docs/evidence/owner-feedback-2026-10-14/${phase}`;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
const names = ['Resident Evil', 'Insidious: Out of the Further', 'Resident Dead', 'Resident Evil: Welcome to Raccoon City', "Don’t Leave the Kids Alone", 'Other Mommy', 'Pinocchio: Unstrung', 'Obsession'];
const catalogue = names.map((title, index) => ({ tmdbId: 1700001 + index, type: 'movie', mediaType: 'movie', title,
  posterPath: null, voteAverage: 7.8 - index * .1, voteCount: 500 + index * 31,
  trailer: index === 0 ? { key: 'abcdefghijk' } : null,
  ratingKind: 'tmdb-community', sourceUrl: `https://www.themoviedb.org/movie/${1700001 + index}`,
  releaseDate: '2026-10-05', overview: 'Source-backed discovery fixture for layout review.' }));
for (const width of [390, 980, 1440]) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await context.route('**/api/catalogue?**', route => route.fulfill({ json: { items: catalogue, page: 1, totalPages: 1 } }));
  await context.route('**/api/rankings?**', route => route.fulfill({ json: { ratingKind: 'tmdb-community', updatedAt: '2026-10-14T03:50:00Z',
    items: ['Obsession', 'Colony', "Lee Cronin’s The Mummy", 'Buddy', 'Insidious: Out of the Further'].map((title, index) => ({
      title, position: index + 1, tmdbId: 1800001 + index, filmId: `tmdb-${1800001 + index}`,
      averageScore: 82 - index, voteCount: 500 + index * 31
    })) } }));
  await context.route('**/api/media?**', route => {
    const query = new URL(route.request().url()).searchParams;
    const title = query.get('title');
    if (!['From', 'Longlegs'].includes(title)) return route.fulfill({ json: { item: null, status: 'unavailable' } });
    const tv = title === 'From';
    const tmdbId = tv ? 120001 : 120002;
    return route.fulfill({ json: { item: { title, tmdbId, type: tv ? 'tv' : 'movie',
      ratingKind: 'tmdb-community', voteAverage: 7.6, voteCount: 1287,
      sourceUrl: `https://www.themoviedb.org/${tv ? 'tv' : 'movie'}/${tmdbId}`,
      trailer: { key: 'abcdefghijk' }, posterPath: null } } });
  });
  const page = await context.newPage();
  for (const [name, path] of [['home', '/'], ['movies', '/movies.html'], ['indie', '/indie-movies.html'], ['cinema', '/cinema.html']]) {
    await page.goto(`http://127.0.0.1:4173${path}`, { waitUntil: 'domcontentloaded' });
    await page.locator('body').evaluate(async () => { await document.fonts.ready; });
    if (name === 'home') await page.locator('#hub-ranking .hub-chart-row').first().waitFor();
    if (name === 'home' && phase === 'after') {
      const indie = page.locator('.hub-showcase__bottom .hub-indie');
      await indie.scrollIntoViewIfNeeded();
      await indie.locator('.fr-rating-badge').waitFor();
      await page.evaluate(() => scrollTo(0, 0));
    }
    if (name === 'cinema') await page.locator('.fr-cinema-concept__card').first().waitFor();
    if (name === 'movies' || name === 'indie') await page.locator('.fr-v5-rack .fr-v5-poster').first().waitFor();
    await page.screenshot({ path: `${output}/${name}-${width}-viewport.png` });
    await page.screenshot({ path: `${output}/${name}-${width}-full.png`, fullPage: true });
    if (width <= 980 && (name === 'movies' || name === 'indie')) {
      await page.locator('.fr-v5-rack .fr-v5-poster-card').first().screenshot({ path: `${output}/${name}-${width}-poster-controls.png` });
    }
  }
  await context.close();
}
await browser.close();
