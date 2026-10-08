import { test, expect } from '@playwright/test';

const pages = [
  ['/', 'WELCOME'],
  ['/movies.html','HORROR'],
  ['/tv-shows.html','HORROR'],
  ['/indie-movies.html','INDIE'],
  ['/podcasts.html','HORROR'],
  ['/games.html','HORROR'],
  ['/editorial-standards.html', 'EDITORIAL'],
  ['/top-20/', 'TOP 20'],
  ['/top-20/2026/', 'TOP 20 HORROR FILMS'],
  ['/films/other-mommy/', 'Other Mommy'],
  ['/films/crawlers/', 'Crawlers'],
  ['/films/clayface/', 'Clayface'],
  ['/films/victorian-psycho/', 'Victorian Psycho'],
  ['/films/werwulf/', 'Werwulf'],
  ['/films/exorcist-2027/', 'The Exorcist: Martyrs'],
  ['/film.html?id=approved-fixture', 'Test Fixture Horror']
];

for (const [path, heading] of pages) {
  test(`mobile layout and keyboard navigation: ${path}`, async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    if (path.startsWith('/film.html?')) await page.route('**/api/films/approved-fixture', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({
        film: { id: 'approved-fixture', title: 'Test Fixture Horror', territory: 'GB', checkedAt: '2026-10-08' },
        claims: [{ label: 'Film year', value: '2026', territory: 'GB', sourceName: 'Fixture source', source: 'https://example.invalid/film', checked: '2026-10-08' }]
      })
    }));
    await page.goto(path);
    await expect(page.locator('h1').first()).toContainText(heading, { ignoreCase: true });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.evaluate(async () => { for (const image of document.images) image.loading = 'eager'; });
    await page.waitForTimeout(100);
    const brokenImages = await page.locator('img').evaluateAll(images => images.filter(image => !image.complete || image.naturalWidth === 0).map(image => image.src));
    expect(brokenImages).toEqual([]);
    const toggle = page.locator('.menu-toggle');
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.locator('#mobile-nav')).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(page.locator('#mobile-nav')).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await page.screenshot({ path: `test-results/visual/mobile-${path.replace(/[^a-z0-9]+/gi, '-') || 'home'}.png`, fullPage: true });
    await page.close();
  });
}

test('no-JavaScript film pages retain the verified Other Mommy and Clayface trailer source links', async ({ browser }) => {
  for (const [path, expected] of [['/films/other-mommy/', 'bEpTgowZ1dI'], ['/films/clayface/', '6IxPD-jNdwM']]) {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(path);
    await expect(page.locator(`a[href*="${expected}"]`).first()).toBeVisible();
    await expect(page.locator('h1')).not.toBeEmpty();
    await context.close();
  }
});

for (const [path, heading] of [['/', 'WELCOME'], ['/top-20/2026/', 'TOP 20 HORROR FILMS']]) {
  test(`desktop visual layout: ${path}`, async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    await page.goto(path);
    await expect(page.locator('h1').first()).toContainText(heading, { ignoreCase: true });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.screenshot({ path: `test-results/visual/desktop-${path.replace(/[^a-z0-9]+/gi, '-') || 'home'}.png`, fullPage: true });
    await page.close();
  });
}

test('homepage film search produces an accessible empty state', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/movies.html');
  await page.locator('#movie-search').fill('zz-no-match');
  await expect(page.locator('#empty-state')).toBeVisible();
  await expect(page.locator('#results-count')).toContainText('0 films');
});

test('homepage date and verified-score filters report truthful result counts', async ({ page }) => {
  await page.goto('/movies.html');
  await page.locator('[data-filter="date-tbc"]').click();
  await expect(page.locator('#results-count')).toContainText('2 films');
  await expect(page.locator('[data-filter="date-tbc"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-filter="reviewed"]').click();
  await expect(page.locator('#results-count')).toContainText('0 films');
  await expect(page.locator('#empty-state')).toBeVisible();
});


test('homepage recommendations do not advertise unannounced productions', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.hub-showcase .hub-tv')).toBeVisible();
  await expect(page.locator('#hub-ranking')).toBeVisible();
  await expect(page.locator('.hub-tabs a[href="/podcasts.html"]')).toBeVisible();
  await expect(page.locator('#originals')).toHaveCount(0);
  await expect(page.locator('.hub-podcast a[href="/podcasts.html"]')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('FRIGHTERTAINMENT ORIGINALS');
  await expect(page.locator('body')).not.toContainText('DETAILS TO BE ANNOUNCED');
});

test('homepage is compact, branded and links into distinct pages', async ({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await expect(page.locator('.hub-brand img')).toBeVisible();
  await expect(page.locator('.hub-tabs a')).toHaveCount(6);
  await expect(page.locator('.hero-wordmark')).toHaveCount(0);
  await expect(page.locator('.hub-showcase .hub-tile')).toHaveCount(5);
  await expect(page.locator('#movie-grid')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('FRIGHTERTAINMENT ORIGINALS');
});
