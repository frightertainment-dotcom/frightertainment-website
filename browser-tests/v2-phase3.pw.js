import { test, expect } from '@playwright/test';

test('Home cinema note selects a future sourced UK date and expires old entries', async ({ page }) => {
  await page.route('**/data/cinema-screenings.json', route => route.fulfill({ json: {
    territories: { GB: { screenings: [
      { id: 'expired', title: 'Expired showing', date: '2000-01-01', reach: 'general', sourceUrl: 'https://example.org/old' },
      { id: 'next', title: 'The Next Screening', date: '2099-03-15', reach: 'limited', tier: 'special', sourceUrl: 'https://example.org/next' },
      { id: 'later-studio', title: 'A Studio Release', date: '2099-03-20', reach: 'general', tier: 'studio', sourceUrl: 'https://example.org/studio' }
    ] } }
  } }));
  await page.goto('/');
  const note = page.locator('.fr-home-cinema-note');
  await expect(note).toHaveAttribute('data-screening-id', 'later-studio');
  await expect(note.locator('h3')).toHaveText('A Studio Release');
  await expect(note.locator('p')).toContainText('UK cinema release from 20 March 2099');
  await expect(note.locator('.fr-home-cinema-note__source')).toHaveAttribute('href', 'https://example.org/studio');
  await expect(note.locator('.fr-home-cinema-note__diary')).toHaveAttribute('href', '/cinema.html#upcoming-cinema');
  await expect(note).not.toContainText('Expired showing');
});

test('Home cinema note remains useful when the diary is unavailable', async ({ page }) => {
  await page.route('**/data/cinema-screenings.json', route => route.fulfill({ status: 503 }));
  await page.goto('/');
  const note = page.locator('.fr-home-cinema-note');
  await expect(note.locator('h3')).toHaveText("WHAT'S ON SCREEN");
  await expect(note.locator('.fr-home-cinema-note__source')).toBeHidden();
  await expect(note.locator('.fr-home-cinema-note__diary')).toHaveAttribute('href', '/cinema.html#upcoming-cinema');
});

test('Home cinema diary stays reachable with JavaScript disabled', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4173/');
    const note = page.locator('.fr-home-cinema-note');
    await expect(note.locator('h3')).toHaveText("WHAT'S ON SCREEN");
    await expect(note.locator('.fr-home-cinema-note__source')).toBeHidden();
    await expect(note.locator('.fr-home-cinema-note__diary')).toHaveAttribute('href', '/cinema.html#upcoming-cinema');
  } finally {
    await context.close();
  }
});

for (const [name, route, archive] of [
  ['TV Shows', '/tv-shows.html', /BROWSE SERIES/],
  ['Indie Movies', '/indie-movies.html', /BROWSE THE ARCHIVE/]
]) {
  test(`${name} gives the source-backed title the mobile first fold and keeps archive access`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto(route);
    await expect(page.locator('.editorial-pick__title')).toBeVisible();
    const positions = await page.evaluate(() => ({
      title: document.querySelector('.editorial-pick__title').getBoundingClientRect().bottom,
      art: document.querySelector('.editorial-pick__art').getBoundingClientRect().top,
      dock: document.querySelector('.fr-v5-mobile-dock').getBoundingClientRect().top,
      width: document.documentElement.scrollWidth
    }));
    expect(positions.title).toBeLessThan(positions.dock);
    expect(positions.title).toBeLessThan(positions.art);
    expect(positions.width).toBe(320);
    await page.locator('.hub-section-jumps').getByRole('link', { name: archive }).click();
    await expect(page.locator('.fr-v5-deeper')).toHaveAttribute('open', '');
    await expect(page.locator('#archive')).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('The indie film label does not repeat its source year', async ({ page }) => {
  await page.goto('/indie-movies.html');
  await expect(page.locator('.editorial-pick__genre')).toHaveText('SOURCE-CHECKED INDIE · 2026');
  await expect(page.locator('#chart-heading')).toContainText('INDIE VIEWER CHART');
});
