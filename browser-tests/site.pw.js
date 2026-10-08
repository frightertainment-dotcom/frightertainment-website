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
  ['/films/28-days-later/', '28 Days Later'],
  ['/films/28-weeks-later/', '28 Weeks Later'],
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
  await expect(page.locator('#results-count')).toContainText('6 films');
  await expect(page.locator('[data-filter="date-tbc"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-filter="reviewed"]').click();
  await expect(page.locator('#results-count')).toContainText('6 films');
  await expect(page.locator('.external-critic-scores')).toHaveCount(6);
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

test('navigation works between all main sections and official movie source', async ({ page }) => {
  await page.goto('/');
  await page.locator('.hub-tabs a[href="/movies.html"]').click();
  await expect(page).toHaveURL(/movies\.html$/);
  await expect(page.locator('#movie-grid .movie-card')).toHaveCount(8);
  await page.locator('#movie-more').click();
  await expect(page.locator('#movie-grid .movie-card')).toHaveCount(11);
  const official = page.locator('.movie-card__official a').first();
  await expect(official).toHaveAttribute('href', /^https:\/\//);
  await page.locator('.hub-tabs a[href="/podcasts.html"]').click();
  await expect(page).toHaveURL(/podcasts\.html$/);
  await expect(page.locator('main .hub-tile')).toHaveCount(9);
  await page.locator('.hub-tabs a[href="/indie-movies.html"]').click();
  await expect(page.locator('main .hub-catalog .hub-tile')).toHaveCount(9);
  await expect(page.locator('main')).not.toContainText('DETAILS TO BE ANNOUNCED');
});
test('compact dashboard remains navigable at 320px and 768px', async ({ browser }) => {
  for (const width of [320, 768]) {
    const page = await browser.newPage({viewport:{width,height:820}});
    await page.goto('/');
    await expect(page.locator('.hub-brand img')).toBeVisible();
    await expect(page.locator('.hub-tabs a')).toHaveCount(6);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.close();
  }
});
test('film and Top 20 pages offer main-content skip links', async ({ page }) => {
  await page.goto('/films/clayface/');
  await expect(page.locator('.skip-link')).toHaveAttribute('href', '#main-content');
  await expect(page.locator('#main-content')).toBeVisible();
  await page.goto('/top-20/2026/');
  await expect(page.locator('.skip-link')).toHaveCount(1);
});
test('homepage artwork is first-party and movie posters are not copied without permission', async ({ page }) => {
  await page.goto('/');
  const artURL = await page.locator('.hub-feature').evaluate(el => getComputedStyle(el).backgroundImage);
  expect(artURL).toContain('/assets/hub-haunted.svg');
  await page.goto('/movies.html');
  await expect(page.locator('.movie-card__art img.licensed-poster')).toHaveCount(0);
  await expect(page.locator('.movie-card__official a')).toHaveCount(8);
});

test('expanded TV, podcast, game and indie listings have source-linked cards', async ({page})=>{
  for(const route of ['/tv-shows.html','/podcasts.html','/games.html','/indie-movies.html']){
    await page.goto(route);
    await expect(page.locator('.hub-editorial-more .hub-tile')).toHaveCount(6);
    await expect(page.locator('.hub-editorial-more a[href]')).toHaveCount(6);
  }
});

test('release calendar uses source claims and does not invent live UK showtimes',async({page})=>{
  await page.goto('/movies.html');
  await expect(page.locator('#hub-release-list .hub-release-row')).toHaveCount(7);
  const urls=await page.locator('#hub-release-list a.hub-release-source').evaluateAll(a=>a.map(x=>x.getAttribute('href')));
  expect(urls.every(x=>x.startsWith('https://'))).toBe(true);
  await expect(page.locator('#hub-release-list')).toContainText('No UK availability inferred');
});

test('2026 is default and earlier films are under their actual original years', async ({page})=>{
  await page.goto('/movies.html');
  await expect(page.locator('#movie-year')).toHaveValue('2026');
  await expect(page.locator('#results-count')).toContainText('11 films');
  await expect(page.locator('#movie-grid')).toContainText('28 Years Later: The Bone Temple');
  await expect(page.locator('#movie-grid')).not.toContainText('28 Weeks Later');
  await expect(page.locator('#movie-grid')).not.toContainText('28 Years Later</');
  await page.selectOption('#movie-year', '2025');
  await expect(page.locator('#results-count')).toContainText('7 films');
  await expect(page.locator('#movie-grid')).toContainText('28 Years Later');
  await page.selectOption('#movie-year', 'older');
  await expect(page.locator('#results-count')).toContainText('5 films');
  await expect(page.locator('#movie-grid')).toContainText('28 Weeks Later');
  await page.selectOption('#movie-year', 'all');
  await expect(page.locator('#results-count')).toContainText('24 films');
});

test('Bone Temple has manually sourced external critic metrics and does not invent a Fright Index',async({page})=>{
  await page.goto('/movies.html');
  const card=page.locator('.movie-card').filter({has:page.getByRole('heading',{name:'28 Years Later: The Bone Temple'})});
  await expect(card).toBeVisible();
  await expect(card.locator('.external-critic-scores')).toContainText('91%');
  await expect(card.locator('.external-critic-scores')).toContainText('81/100');
  await expect(card.locator('.movie-card__score')).toContainText('FRIGHT');
  await card.getByRole('link',{name:'28 Years Later: The Bone Temple'}).first().click();
  await expect(page).toHaveURL(/films\/28-years-later-bone-temple\//);
  await expect(page.locator('#film-detail')).toContainText('PUBLISHED CRITIC RATINGS');
  await expect(page.locator('#film-detail')).toContainText('91%');
});

test('four franchise instalments link to historically correct film pages',async({page})=>{
  await page.goto('/movies.html');
  const links=page.locator('.hub-series__items a');
  await expect(links).toHaveCount(4);
  await expect(links.nth(0)).toContainText('2002');
  await expect(links.nth(1)).toContainText('2007');
  await expect(links.nth(2)).toContainText('2025');
  await expect(links.nth(3)).toContainText('2026');
});
