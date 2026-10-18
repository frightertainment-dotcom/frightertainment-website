import { test, expect } from '@playwright/test';

// Owner-approved visual direction: simpler, genuinely horror, not AI scene art.
// These tests supplement feature and licensing contracts rather than replace them.
const mainDestinations = [
  ['/', 'home'], ['/movies.html', 'movies'], ['/tv-shows.html', 'tv'],
  ['/cinema.html', 'cinema'], ['/indie-movies.html', 'indie'],
  ['/podcasts.html', 'podcasts'], ['/games.html', 'games']
];

test('The original Frightertainment branding and seven destinations survive', async ({ page }) => {
  for (const [route, theme] of mainDestinations) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(route);
    await expect(page.locator('body')).toHaveAttribute('data-theme', theme);
    await expect(page.locator('.hub-brand img')).toHaveAttribute('src', '/assets/frightertainment-brand.png');
    await expect(page.locator('.hub-header .hub-brand img')).toBeVisible();
    await expect(page.locator('.hub-tabs a')).toHaveCount(7);
    await expect(page.locator('link[href="/fr-polish.css"]')).toHaveCount(1);
    const bg = await page.locator('.hub-page-intro, .fr-home-intro').first()
      .evaluate(node => getComputedStyle(node).backgroundImage);
    expect(bg).not.toContain('/assets/themes/');
  }
});

test('A small phone gets readable dock text and keeps its destination reachable', async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const [route] of mainDestinations) {
      await page.goto(route);
      const dock = page.locator('.fr-v5-mobile-dock');
      await expect(dock).toBeVisible();
      await expect(dock.locator('a')).toHaveCount(7);
      await expect(dock.locator('a[aria-current="page"]')).toHaveCount(1);
      const sizing = await dock.evaluate(nav => ({
        fontSize: parseFloat(getComputedStyle(nav.querySelector('small')).fontSize),
        rowCount: new Set([...nav.querySelectorAll('a')].map(a => Math.round(a.getBoundingClientRect().top))).size,
        width: document.documentElement.scrollWidth,
        viewport: innerWidth
      }));
      expect(sizing.fontSize).toBeGreaterThanOrEqual(10);
      expect(sizing.rowCount).toBe(1);
      expect(sizing.width).toBeLessThanOrEqual(sizing.viewport + 2);
      await dock.locator('a[href="/games.html"]').scrollIntoViewIfNeeded();
      await expect(dock.locator('a[href="/games.html"]')).toBeVisible();
    }
  }
});

test('Official posters remain DOM artwork; no fake picture is required for a title', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/movies.html');
  await expect(page.locator('.editorial-pick')).toBeVisible();
  await expect(page.locator('.editorial-pick__art-frame')).toBeVisible();
  const art = await page.locator('.editorial-pick__art-frame').evaluate(node => ({
    image: getComputedStyle(node).backgroundImage,
    title: node.querySelector('.editorial-pick__art-title')?.textContent || ''
  }));
  expect(art.image).not.toContain('/assets/themes/');
  await expect(page.locator('.hub-header .hub-brand img')).toBeVisible();
});
