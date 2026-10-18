import { test, expect } from '@playwright/test';

test('Home gives the sourced feature and chart priority over news at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  await expect(page.locator('#home-showcase .hub-feature h3')).not.toBeEmpty();
  await expect(page.locator('#home-showcase .hub-feature .hub-tile__link')).toHaveAttribute('href', /^\/films\/[a-z0-9-]+\/$/);
  const positions = await page.evaluate(() => Object.fromEntries(
    ['home-showcase', 'frightnews-home-heading'].map(id => [id, document.getElementById(id)?.getBoundingClientRect().top])
  ));
  expect(positions['home-showcase']).toBeLessThan(positions['frightnews-home-heading']);
  expect(await page.locator('#home-showcase .hub-showcase__bottom > .hub-tile').count()).toBe(4);
  await expect(page.locator('#home-showcase .fr-home-cinema-note__diary')).toHaveAttribute('href', '/cinema.html');
  await page.getByRole('link', { name: /today's film pick/i }).click();
  await expect(page).toHaveURL(/#home-showcase$/);
  expect(await page.evaluate(() => document.body.scrollWidth)).toBe(320);
});

test('Movies keeps the film visible through repeated responsive rearrangement', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/movies.html');
  await expect(page.locator('.editorial-pick__title')).toBeVisible();
  const titleTop = await page.locator('.editorial-pick__title').evaluate(node => node.getBoundingClientRect().top);
  const dockTop = await page.locator('.fr-v5-mobile-dock').evaluate(node => node.getBoundingClientRect().top);
  expect(titleTop).toBeLessThan(dockTop);
  await expect(page.locator('.editorial-pick__art-frame[role="img"]')).toHaveAttribute('aria-label', /not? official poster|no official poster/i);
  for (const width of [1440, 320, 1440, 320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator('.editorial-carousel')).toHaveCount(1);
    await expect(page.locator('.fr-v5-ranking')).toHaveCount(1);
  }
  expect(errors).toEqual([]);
});

test('An empty TMDB response keeps verified film files open without inventing scores', async ({ page }) => {
  await page.route('**/api/rankings?year=*', route => route.fulfill({ json: {
    status: 'pending', ratingKind: 'tmdb-community', items: []
  } }));
  await page.goto('/');
  await expect(page.locator('#hub-ranking')).toContainText('TMDB community chart pending');
  await expect(page.locator('#hub-ranking .hub-chart-row')).toHaveCount(0);
  await expect(page.locator('#hub-ranking .hub-unranked')).toHaveAttribute('open', '');
  await expect(page.locator('#hub-ranking .hub-unranked__item').first().locator('a').first()).toHaveAttribute('href', /^\/films\//);
});

test('The cancelled streaming routes stay absent from the local preview bundle', async ({ page }) => {
  for (const route of ['/frightwatch/', '/frightscreen/']) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(404);
  }
  await page.goto('/');
  await expect(page.locator('.hub-tabs a')).toHaveCount(7);
  await expect(page.locator('a[href*="frightwatch"], a[href*="frightscreen"]')).toHaveCount(0);
});
