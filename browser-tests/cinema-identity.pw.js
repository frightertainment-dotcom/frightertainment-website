import { test, expect } from '@playwright/test';

async function stubCatalogue(page) {
  await page.route('**/api/catalogue?**', route => route.fulfill({
    json: { items: [], page: 1, totalPages: 1, status: 'ready' }
  }));
}

async function expectCinemaShell(page) {
  // A misidentified extensionless Cinema page inserts the Movies front after
  // the editorial-carousel wait expires, so observe its completed init first.
  await expect(page.locator('#main')).toHaveAttribute('data-fr-v5-ready', 'true', { timeout: 10_000 });
  await expect(page.locator('.fr-v5-front, .fr-v5-explore, .fr-v5-deeper')).toHaveCount(0);
  await expect(page.locator('body')).toHaveAttribute('data-page', 'cinema');
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'cinema');
  await expect(page.locator('#main > .hub-page-intro')).toContainText('THE BIG SCREEN AWAITS');
  await expect(page.locator('#main > .fr-cinema-concept')).toHaveCount(1);
  await expect(page.locator('#main > #upcoming-cinema')).toHaveCount(1);
  await expect(page.locator('#main > #recent-cinema')).toHaveCount(1);
  await expect(page.locator('.fr-cinema-concept__region #cinema-country')).toHaveCount(1);
  await expect(page.getByRole('navigation', { name: 'Explore horror movies' })).toHaveCount(0);
  await expect(page.locator('.fr-v5-mobile-dock a[aria-current="page"]')).toHaveAttribute('href', '/cinema.html');
}

test('Cinema identity survives a Pages-style extensionless route and late data', async ({ page }) => {
  await stubCatalogue(page);
  const html = await (await page.request.get('/cinema.html')).body();
  // Python's local server cannot reproduce Cloudflare Pages extensionless HTML
  // resolution, so serve the same actual HTML at the alternate browser URL.
  await page.route('**/cinema', route => route.fulfill({ body: html, contentType: 'text/html' }));
  await page.route('**/data/cinema-screenings.json', async route => {
    await new Promise(resolve => setTimeout(resolve, 300));
    await route.continue();
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/cinema');
  await expectCinemaShell(page);
  await expect(page.locator('[data-cinema-concept-cards]')).not.toContainText('Checking verified release dates');
  await page.evaluate(() => scrollTo(0, 120));
  await page.setViewportSize({ width: 430, height: 780 });
  await expectCinemaShell(page);
  await page.reload();
  await expectCinemaShell(page);
});

test('Cinema remains Cinema through internal links, country changes, and history', async ({ page }) => {
  await stubCatalogue(page);
  await page.goto('/movies.html');
  await page.locator('.fr-v5-mobile-dock a[href="/cinema.html"]:visible, .hub-tabs a[href="/cinema.html"]:visible').first().click();
  await expect(page).toHaveURL(/\/cinema\.html$/);
  await expectCinemaShell(page);
  await expect(page.locator('[data-cinema-concept-cards]')).not.toContainText('Checking verified release dates');
  await page.evaluate(() => {
    const original = window.FR_CINEMA_DIARY.merge;
    window.cinemaMergeCalls = 0;
    window.FR_CINEMA_DIARY.merge = (...args) => {
      window.cinemaMergeCalls++;
      return original(...args);
    };
  });
  await page.addScriptTag({ url: '/cinema-concept.js' });
  await page.locator('#cinema-country').selectOption('US');
  await expect(page.locator('#cinema-heading')).toHaveText('US CINEMA RELEASE DIARY.');
  // The concept calls the public merge method once; an accidental second
  // script initialization would register another country-change listener.
  await expect.poll(() => page.evaluate(() => window.cinemaMergeCalls)).toBeGreaterThan(0);
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.cinemaMergeCalls)).toBe(1);
  await expectCinemaShell(page);
  await page.goBack();
  await expect(page).toHaveURL(/\/movies\.html$/);
  await page.goForward();
  await expectCinemaShell(page);
});
