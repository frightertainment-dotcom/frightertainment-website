import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const pages = [
  ['/', 'WELCOME'],
  ['/movies.html','HORROR'],
  ['/all-horror-movies.html','ALL HORROR'],
  ['/archive-film.html?id=Q166385','A Terrible Night'],
  ['/archive-film.html?id=Q203560','1408'],
  ['/tv-shows.html','HORROR'],
  ['/indie-movies.html','INDIE'],
  ['/podcasts.html','HORROR'],
  ['/games.html','HORROR'],
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

test('verified trailers load privacy-enhanced YouTube playback only after the visitor presses play', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/movies.html#trailers');
  const card = page.locator('.verified-trailer').filter({ hasText: 'Other Mommy' });
  await expect(card).toBeVisible();
  await expect(card.locator('iframe')).toHaveCount(0);
  await expect(card.locator('.verified-trailer__meta p')).toContainText('OFFICIAL UPLOAD');
  await expect(card.locator('.verified-trailer__meta p')).toContainText(/territory/i);
  await expect(card.locator('.verified-trailer__meta a')).toHaveAttribute('href', /^https:\/\//);
  await card.locator('.verified-trailer__screen').screenshot({ path: 'test-results/design-refinement/sections/trailer-preview-desktop.png' });
  await card.locator('[data-play-video="other-mommy"]').click();
  const player = card.locator('iframe');
  await expect(player).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/bEpTgowZ1dI?autoplay=1&rel=0&playsinline=1');
  await expect(player).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  await expect(player).toHaveAttribute('allowfullscreen', '');
  await expect(card.locator('[data-play-video]')).toHaveCount(0);
  await card.locator('.verified-trailer__screen').screenshot({ path: 'test-results/design-refinement/sections/trailer-active-desktop.png' });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/movies.html#trailers');
  const mobileCard = page.locator('.verified-trailer').filter({ hasText: 'Clayface' });
  await expect(mobileCard.locator('iframe')).toHaveCount(0);
  await mobileCard.locator('.verified-trailer__screen').screenshot({ path: 'test-results/design-refinement/sections/trailer-preview-mobile-390.png' });
  await mobileCard.locator('[data-play-video="clayface"]').click();
  const mobilePlayer = mobileCard.locator('iframe');
  await expect(mobilePlayer).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/6IxPD-jNdwM?autoplay=1&rel=0&playsinline=1');
  const playerBox = await mobilePlayer.boundingBox();
  expect(playerBox.width).toBeLessThanOrEqual(390);
  expect(Math.abs(playerBox.width / playerBox.height - 16 / 9)).toBeLessThan(0.05);
  await mobileCard.locator('.verified-trailer__screen').screenshot({ path: 'test-results/design-refinement/sections/trailer-active-mobile-390.png' });
});

test('dynamic film records escape hostile text and reject credential-bearing source links', async ({ page }) => {
  await page.addInitScript(() => { window.__filmXssRan = false; });
  await page.route('**/api/films/security-fixture', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      film: { id: 'security-fixture', title: '<img src=x onerror="window.__filmXssRan=true">', territory: '<svg onload="window.__filmXssRan=true">', checkedAt: '2026-10-09' },
      claims: [{ label: '<script>window.__filmXssRan=true</script>', value: '<iframe srcdoc=x>', territory: 'GB', checked: '2026-10-09', sourceName: 'Untrusted source', source: 'https://user:password@example.test/film' }]
    })
  }));
  await page.goto('/film.html?id=security-fixture');
  await expect(page.locator('#dynamic-film h1')).toHaveText('<img src=x onerror="window.__filmXssRan=true">');
  await expect(page.locator('#dynamic-film img, #dynamic-film script, #dynamic-film iframe')).toHaveCount(0);
  await expect(page.locator('#dynamic-film a[target="_blank"]')).toHaveCount(0);
  expect(await page.evaluate(() => window.__filmXssRan)).toBe(false);
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
  await expect(page.locator('main .hub-tile')).toHaveCount(12);
  await page.locator('.hub-tabs a[href="/indie-movies.html"]').click();
  await expect(page.locator('main .hub-catalog .hub-tile')).toHaveCount(12);
  await expect(page.locator('main')).not.toContainText('DETAILS TO BE ANNOUNCED');
});
test('compact dashboard remains navigable at 320px and 768px', async ({ browser }) => {
  for (const width of [320, 768]) {
    const page = await browser.newPage({viewport:{width,height:820}});
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.hub-brand img')).toBeVisible();
    await expect(page.locator('.hub-tabs a')).toHaveCount(6);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.close();
  }
});
test('all six section themes and navigation fit the requested viewport widths', async ({ browser }) => {
  test.setTimeout(120_000);
  const themes = [
    ['/', 'home'], ['/movies.html', 'movies'], ['/tv-shows.html', 'tv'],
    ['/indie-movies.html', 'indie'], ['/podcasts.html', 'podcasts'], ['/games.html', 'games']
  ];
  const widths = [320, 360, 390, 430, 768, 1024, 1440, 1920];
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  for (const [route, theme] of themes) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toHaveAttribute('data-theme', theme);
    await expect(page.locator('.hub-tabs a')).toHaveCount(6);
    await expect(page.locator('.hub-tabs a[aria-current="page"]')).toHaveCount(1);
    for (const width of widths) {
      await page.setViewportSize({ width, height: 844 });
      const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
      expect(fits, `${route} overflows at ${width}px`).toBe(true);
      await expect(page.locator('.hub-tabs a[href="/games.html"]')).toBeVisible();
    }
  }
  await page.close();
});
test('TV, indie, podcast and games landings use distinct desktop compositions', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const route of ['/tv-shows.html', '/podcasts.html']) {
    await page.goto(route);
    const cards = page.locator('.hub-catalog:not(.hub-catalog--expanded) > .hub-tile');
    await expect(cards.first()).toBeVisible();
    const boxes = await cards.evaluateAll(nodes => nodes.map(node => {
      const { x, y, width, height } = node.getBoundingClientRect();
      return { x, y, width, height };
    }));
    expect(boxes.length).toBe(3);
    expect(boxes[0].width).toBeGreaterThan(boxes[1].width);
    expect(boxes[0].height).toBeGreaterThan(boxes[1].height);
    expect(Math.abs(boxes[1].x - boxes[2].x), `${route} secondary cards should stack in one column`).toBeLessThan(2);
    expect(boxes[2].y).toBeGreaterThan(boxes[1].y);
  }
  await page.goto('/games.html');
  const gameBoxes = await page.locator('.hub-catalog:not(.hub-catalog--expanded) > .hub-tile').evaluateAll(nodes => nodes.map(node => {
    const { x, y, width, height } = node.getBoundingClientRect();
    return { x, y, width, height };
  }));
  expect(gameBoxes).toHaveLength(2);
  expect(gameBoxes[0].width).toBeGreaterThan(gameBoxes[1].width);
  expect(gameBoxes[0].height).toBeGreaterThan(gameBoxes[1].height);
  expect(gameBoxes[1].x).toBeGreaterThan(gameBoxes[0].x);
  await page.goto('/indie-movies.html');
  const indieBoxes = await page.locator('.hub-catalog:not(.hub-catalog--expanded) > .hub-tile').evaluateAll(nodes => nodes.map(node => {
    const { x, y, width, height } = node.getBoundingClientRect();
    return { x, y, width, height };
  }));
  expect(indieBoxes).toHaveLength(3);
  expect(Math.max(...indieBoxes.map(box => box.width)) - Math.min(...indieBoxes.map(box => box.width))).toBeLessThan(2);
  expect(indieBoxes[1].y).toBeGreaterThan(indieBoxes[0].y + 15);
  expect(indieBoxes[1].height).toBeGreaterThan(indieBoxes[0].height);
});
test('narrow section cards keep readable copy, natural titles and visible external-link icons', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/tv-shows.html', '/indie-movies.html', '/podcasts.html', '/games.html']) {
    await page.goto(route);
    const paragraphs = page.locator('main > .hub-catalog:not(.hub-catalog--expanded) .hub-tile p');
    for (const paragraph of await paragraphs.all()) {
      expect(await paragraph.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
    }
    const titles = page.locator('main > .hub-catalog:not(.hub-catalog--expanded) .hub-tile h3');
    for (const title of await titles.all()) {
      const metrics = await title.evaluate(el => ({ scroll: el.scrollWidth, client: el.clientWidth, right: el.getBoundingClientRect().right }));
      expect(metrics.scroll).toBeLessThanOrEqual(metrics.client + 1);
      expect(metrics.right).toBeLessThanOrEqual(390);
    }
    const external = page.locator('main > .hub-catalog:not(.hub-catalog--expanded) a[target="_blank"]').first();
    if (await external.count()) {
      const icon = await external.evaluate(el => ({ content: getComputedStyle(el, '::before').content, mask: getComputedStyle(el, '::before').maskImage }));
      expect(icon.content).toBe('""');
      expect(icon.mask).toContain('data:image/svg+xml');
    }
    const externalTileAction = page.locator('main > .hub-catalog:not(.hub-catalog--expanded) .hub-tile__link[target="_blank"]').first();
    if (await externalTileAction.count()) {
      expect(await externalTileAction.evaluate(el => getComputedStyle(el, '::after').position)).toBe('absolute');
      expect(await externalTileAction.evaluate(el => getComputedStyle(el, '::after').inset)).toBe('0px');
    }
  }
  await page.goto('/movies.html');
  await expect(page.locator('#movie-grid .movie-card')).toHaveCount(8);
  expect(await page.locator('#movie-grid .movie-card__text').first().evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
});
test('mobile homepage keeps the featured film before the chart and supporting cards after it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const order = await page.locator('.hub-dashboard > *').evaluateAll(nodes => nodes.map(node =>
    node.classList.contains('hub-feature') ? 'feature' : node.classList.contains('hub-charts') ? 'chart' : 'support'));
  expect(order).toEqual(['feature', 'chart', 'support']);
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
  const artURL = await page.locator('.hub-feature').evaluate(el => getComputedStyle(el, '::before').backgroundImage);
  expect(artURL).toContain('/assets/hub-haunted.svg');
  await page.goto('/movies.html');
  await expect(page.locator('.movie-card__art img.licensed-poster')).toHaveCount(0);
  await expect(page.locator('.movie-card__official a')).toHaveCount(8);
});

test('expanded TV, podcast, game and indie listings have source-linked cards', async ({page})=>{
  for(const [route,count] of [['/tv-shows.html',8],['/podcasts.html',9],['/games.html',9],['/indie-movies.html',9]]){
    await page.goto(route);
    await expect(page.locator('.hub-editorial-more .hub-tile')).toHaveCount(count);
    await expect(page.locator('.hub-editorial-more a[href]')).toHaveCount(count);
  }
  await page.goto('/podcasts.html');
  await expect(page.locator('a[href="https://podcasts.apple.com/gb/podcast/knifepoint-horror/id406250030"]')).toHaveText(/LISTEN ON APPLE PODCASTS/);
  await page.goto('/tv-shows.html');
  await expect(page.locator('a[href="https://www.netflix.com/gb/title/80209229"]')).toBeVisible();
  await expect(page.locator('a[href="https://qr.netflix.com/gb/title/80209229"]')).toHaveCount(0);
});

test('upcoming release calendar excludes historical and already released films',async({page})=>{
  await page.goto('/movies.html');
  const calendar=page.locator('#hub-release-list');
  await expect(calendar.locator('.hub-release-row').first()).toBeVisible();
  const rows=await calendar.locator('.hub-release-row').evaluateAll(nodes=>
    nodes.map(row=>({title:row.querySelector('div>a')?.textContent||'',date:row.querySelector('time')?.getAttribute('datetime')||'',url:row.querySelector('.hub-release-source')?.getAttribute('href')||''})));
  const today=new Date().toISOString().slice(0,10);
  expect(rows.length).toBeGreaterThan(0);
  expect(rows.every(row=>row.date>today&&row.url.startsWith('https://'))).toBe(true);
  expect(rows.map(row=>row.title)).not.toContain('28 Weeks Later');
  expect(rows.map(row=>row.title)).not.toContain('28 Years Later: The Bone Temple');
  await expect(calendar).not.toContainText('DATE PASSED');
  await expect(calendar).not.toContainText('2007');
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

test('public film pages expose no private publisher snapshots and keep the Fright Rating pending',async({page})=>{
  await page.goto('/movies.html');
  const card=page.locator('.movie-card').filter({has:page.getByRole('heading',{name:'28 Years Later: The Bone Temple'})});
  await expect(card).toBeVisible();
  await expect(card.locator('.movie-card__score')).toContainText('FRIGHT');
  await expect(card.locator('.movie-card__score')).not.toContainText('%');
  const catalogue=await page.request.get('/data/movies.js');
  expect(await catalogue.text()).not.toContain('criticReferenceSnapshots');
  await card.getByRole('link',{name:'28 Years Later: The Bone Temple'}).first().click();
  await expect(page).toHaveURL(/films\/28-years-later-bone-temple\//);
  await expect(page.locator('#film-detail')).toContainText('FRIGHT RATING');
  await expect(page.locator('#film-detail')).toContainText('PENDING /10');
  await expect(page.locator('#film-detail')).not.toContainText('91%');
});

test('Movies page does not promote one franchise at the expense of the horror archive',async({page})=>{
  await page.goto('/movies.html');
  await expect(page.locator('.hub-series')).toHaveCount(0);
  await expect(page.locator('.hub-vault-portal')).toHaveCount(1);
  await expect(page.locator('.hub-vault-portal a[href="/all-horror-movies.html"]')).toBeVisible();
});

test('2026 chart shows only eligible rankings and factual unranked films',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.route('**/api/rankings?year=*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'pending',minimumCritics:3,items:[]})}));
  await page.goto('/top-20/2026/');
  await expect(page.locator('#ranking-status')).toContainText('Critic ranking pending');
  await expect(page.locator('.ranking-row')).toHaveCount(0);
  await expect(page.locator('.hub-ranking-watchlist__item')).toHaveCount(7);
  await expect(page.locator('.hub-ranking-watchlist')).toContainText('Verified 2026 films awaiting eligible critic reviews');
  await expect(page.locator('.hub-ranking-watchlist__item').first()).toContainText('UNRANKED');
  await expect(page.locator('.hub-ranking-watchlist')).not.toContainText('92%');
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('homepage score panel shows a compact pending state without unlicensed comparison data',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.route('**/api/rankings?year=*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'pending',items:[]})}));
  await page.goto('/');
  await expect(page.locator('#hub-ranking')).toContainText('Critic ranking pending');
  await expect(page.locator('#hub-ranking')).not.toContainText('%');
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('Movies leads clearly to the complete 9,700-film vault rather than presenting 24 as the whole library',async({page})=>{
  await page.goto('/movies.html');
  await expect(page.getByRole('heading',{name:/EVERY YEAR/})).toBeVisible();
  await expect(page.locator('.hub-vault-portal a[href="/all-horror-movies.html"]')).toBeVisible();
  await expect(page.locator('#review-index')).toHaveCount(0);
  await expect(page.locator('.hub-series')).toHaveCount(0);
  await page.locator('.hub-vault-portal a[href="/all-horror-movies.html"]').click();
  await expect(page).toHaveURL(/all-horror-movies\.html$/);
  await expect(page.locator('#archive-summary')).toContainText('9,');
});

test('global horror vault search finds historical titles without opening every year',async({page})=>{
  await page.goto('/all-horror-movies.html');
  const search=page.locator('#archive-global-search');
  await expect(search).toBeVisible();
  await search.fill('28 Weeks Later');
  const results=page.locator('#archive-global-results');
  await expect(results).toContainText('28 Weeks Later');
  await expect(results).toContainText('2007');
  await expect(results.locator('a').first()).toHaveAttribute('href','/films/28-weeks-later/');
  await page.locator('#archive-global-clear').click();
  await expect(results).toBeHidden();
});

test('All Horror Movies offers years 1896 through current year as initially closed accordions',async({page})=>{
  await page.goto('/all-horror-movies.html');
  const year=new Date().getUTCFullYear();
  await expect(page.locator('.horror-year')).toHaveCount(year-1896+1);
  await expect(page.locator('#horror-year-1896')).toBeVisible();
  await expect(page.locator('#horror-year-'+year)).toBeVisible();
  await expect(page.locator('.horror-year[open]')).toHaveCount(0);
  await expect(page.locator('.horror-year__search')).toHaveCount(0);
  await expect(page.getByRole('link',{name:/ALL HORROR MOVIES/}).first()).toBeVisible();
});

test('opened year has own A–Z films and searchable links, other years remain closed',async({page})=>{
  await page.goto('/all-horror-movies.html');
  const y=page.locator('#horror-year-2026');
  await y.locator('summary').click();
  await expect(y).toHaveAttribute('open','');
  const search=y.locator('.horror-year__search');
  await expect(search).toBeVisible();
  expect(await y.locator('.horror-year__film').count()).toBeGreaterThanOrEqual(11);
  await search.fill('bone temple');
  await expect(y.locator('.horror-year__film:visible')).toHaveCount(1);
  await expect(y).toContainText('28 Years Later: The Bone Temple');
  await expect(page.locator('#horror-year-2007')).not.toHaveAttribute('open','');
  const link=y.locator('.horror-year__film:visible a').first();
  await expect(link).toHaveAttribute('href','/films/28-years-later-bone-temple/');
});

test('franchise archive spans 2002, 2007, 2025 and 2026 without erasing history',async({page})=>{
  await page.goto('/all-horror-movies.html');
  for(const [year,title] of [[2002,'28 Days Later'],[2007,'28 Weeks Later'],[2025,'28 Years Later'],[2026,'28 Years Later: The Bone Temple']]){
    const y=page.locator('#horror-year-'+year);
    await y.locator('summary').click();
    await expect(y.locator('.horror-year__film-link',{hasText:title}).first()).toBeVisible();
    await y.locator('summary').click();
  }
  const earliest=page.locator('#horror-year-1896');
  await earliest.locator('summary').click();
  await expect(earliest).toContainText('Le Manoir du diable');
  await expect(earliest.locator('a[href="/archive-film.html?id=manual%3Ale-manoir-du-diable-1896"]')).toBeVisible();
  await expect(page.locator('.horror-archive__notes a[href*="bfi.org.uk"]')).toBeVisible();
});

test('year jump expands target section and search is scoped to it',async({page})=>{
  await page.goto('/all-horror-movies.html');
  await page.selectOption('#archive-jump','2007');
  await expect(page.locator('#horror-year-2007')).toHaveAttribute('open','');
  await expect(page.locator('#horror-year-2007 .horror-year__search')).toBeVisible();
  await expect(page.locator('#horror-year-2026')).not.toHaveAttribute('open','');
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('all horror movie navigation is a sub-tab under main Movies tab',async({page})=>{
  await page.goto('/movies.html');
  await page.locator('.hub-subtabs a[href="/all-horror-movies.html"]').click();
  await expect(page).toHaveURL(/all-horror-movies\.html$/);
  await expect(page.locator('.hub-subtabs a[aria-current="page"]')).toHaveText('ALL HORROR MOVIES');
  await expect(page.locator('.hub-tabs a[href="/movies.html"]')).toHaveClass(/active/);
});

test('imported horror vault retains thousands of indexed records and every year in mobile UI',async({page})=>{
  await page.goto('/all-horror-movies.html', { waitUntil: 'domcontentloaded' });
  const counter=page.locator('#archive-summary');
  await expect(counter).toContainText('indexed film links', { timeout: 15000 });
  const count=await counter.evaluate(el=>Number((el.textContent.match(/[0-9,]+/)||['0'])[0].replaceAll(',','')));
  expect(count).toBeGreaterThanOrEqual(9772);
  const year=page.locator('#horror-year-2007');
  await year.locator('summary').click();
  await expect.poll(()=>year.locator('.horror-year__film').count()).toBeGreaterThan(300);
  await expect(year.locator('.horror-year__search')).toBeVisible();
  await year.locator('.horror-year__search').fill('28 Weeks');
  await expect(year.locator('.horror-year__film:visible')).toHaveCount(1);
  await expect(year.locator('a[href="/films/28-weeks-later/"]')).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('archive rows are full-size clickable links, opening reliable first-party details', async ({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/all-horror-movies.html?year=2007');
  const year=page.locator('#horror-year-2007');
  await expect(year).toHaveAttribute('open','');
  const search=year.locator('input[type="search"]');
  await search.fill('1408');
  await expect(year.locator('.horror-year__film:visible')).toHaveCount(1);
  const fullLink=year.locator('.horror-year__film-link:visible');
  await expect(fullLink).toHaveAttribute('href','/archive-film.html?id=Q203560');
  await expect(fullLink).toContainText('FILM DETAILS');
  await fullLink.click();
  await expect(page).toHaveURL(/archive-film\.html\?id=Q203560$/);
  await expect(page.locator('.archive-detail__title')).toHaveText('1408');
  await expect(page.locator('.archive-detail__fact')).toContainText(['2007','tt0450385']);
  await expect(page.getByRole('link',{name:'OPEN IMDb TITLE'})).toHaveAttribute('href','https://www.imdb.com/title/tt0450385/');
  await expect(page.getByRole('link',{name:'FIND MOVIE ON IMDb'})).toHaveAttribute('href',/https:\/\/www\.imdb\.com\/find\/\?/);
  await expect(page.getByRole('link',{name:'WIKIDATA SOURCE'})).toHaveAttribute('href','https://www.wikidata.org/wiki/Q203560');
  await page.getByRole('link',{name:'← ALL HORROR MOVIES'}).click();
  await expect(page).toHaveURL(/all-horror-movies\.html\?year=2007/);
  await expect(page.locator('#horror-year-2007')).toHaveAttribute('open','');
});
test('Wikidata film without an IMDb ID still has searchable IMDb and source links',async({page})=>{
  await page.goto('/archive-film.html?id=Q4849038');
  await expect(page.locator('.archive-detail__title')).toHaveText('Bakchha');
  await expect(page.getByRole('link',{name:'FIND MOVIE ON IMDb'})).toBeVisible();
  await expect(page.getByRole('link',{name:'OPEN IMDb TITLE'})).toHaveCount(0);
  await expect(page.getByRole('link',{name:'WIKIDATA SOURCE'})).toHaveAttribute('href','https://www.wikidata.org/wiki/Q4849038');
});
test('historical and manually checked films both open Frightertainment pages with exits',async({page})=>{
  await page.goto('/all-horror-movies.html?year=1896');
  await page.locator('#horror-year-1896 .horror-year__film-link').filter({hasText:'Le Manoir du diable'}).click();
  await expect(page).toHaveURL(/archive-film\.html\?id=manual%3Ale-manoir-du-diable-1896/);
  await expect(page.locator('.archive-detail__title')).toContainText('Le Manoir du diable');
  await expect(page.getByRole('link',{name:'FILM SOURCE'})).toHaveAttribute('href',/bfi\.org\.uk/);
  await expect(page.getByRole('link',{name:'FIND MOVIE ON IMDb'})).toBeVisible();
});
test('conflicting IMDb metadata never confidently links two different films to the same IMDb ID',async({page})=>{
  await page.goto('/archive-film.html?id=Q21015393');
  await expect(page.locator('.archive-detail__title')).toHaveText('Zane');
  await expect(page.getByRole('link',{name:'OPEN IMDb TITLE'})).toHaveCount(0);
  await expect(page.getByRole('link',{name:'FIND MOVIE ON IMDb'})).toBeVisible();
  await expect(page.getByRole('link',{name:'WIKIDATA SOURCE'})).toBeVisible();
});
test('invalid or unknown archive film IDs display recovery links rather than broken pages',async({page})=>{
  for(const path of ['/archive-film.html?id=not-valid','/archive-film.html?id=Q9999999999999']){
    await page.goto(path);
    await expect(page.locator('.archive-detail__title')).toContainText('FILM RECORD UNAVAILABLE');
    await expect(page.getByRole('link',{name:'← RETURN TO ALL HORROR MOVIES'})).toHaveAttribute('href','/all-horror-movies.html');
  }
});

test('homepage retains compact horror dashboard and hides optional source feeds until expanded',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  const drawer=page.locator('.home-discovery-wrap');
  await expect(drawer).toBeVisible();
  await expect(drawer).not.toHaveAttribute('open','');
  await expect(page.locator('.hub-dashboard')).toBeVisible();
  await expect(page.locator('.hub-showcase .hub-tile')).toHaveCount(5);
  await expect(page.locator('.home-discovery__grid')).toBeHidden();
  await drawer.locator('summary').click();
  await expect(drawer).toHaveAttribute('open','');
  await expect(page.locator('#home-search')).toBeVisible();
  await expect(page.locator('#home-country')).toHaveValue('GB');
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('optional live data drawer searches attributed verified feed results when APIs provide them',async({page})=>{
  const datasets={
    'theatrical-releases':{
      items:[{title:'Test Haunted House Film',provider:'UK cinema',territory:'GB',
        sourceName:'Sample Studio',sourceUrl:'https://example.com/haunted',
        releaseDate:'2026-10-11',releaseTerritory:'GB',checkedAt:'2026-10-08'}],
      updatedAt:'2026-10-08T12:00:00.000Z',status:'current'
    },
    'streaming-releases':{
      items:[{title:'Test Fright Stream',provider:'UK streaming',territory:'GB',
        sourceName:'Sample Distributor',sourceUrl:'https://example.com/stream',
        releaseMode:'unconfirmed',checkedAt:'2026-10-08'}],
      updatedAt:'2026-10-08T12:00:00.000Z',status:'current'
    }
  };
  await page.route('**/api/discovery?country=GB',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify({country:'GB',datasets})
  }));
  await page.route('**/api/rankings?year=*',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify({items:[],updatedAt:null})
  }));
  await page.goto('/');
  await page.locator('.home-discovery-wrap summary').click();
  await expect(page.locator('[data-home-list="theatrical-releases"]')).toContainText('Test Haunted House Film');
  await expect(page.locator('[data-home-list="streaming-releases"]')).toContainText('Test Fright Stream');
  await expect(page.locator('[data-home-updated="theatrical-releases"]')).toContainText('Last updated');
  await expect(page.locator('#home-attribution')).toContainText('Sample Studio');
  await page.locator('#home-search').fill('fright stream');
  await expect(page.locator('[data-home-list="theatrical-releases"] article')).toHaveCount(0);
  await expect(page.locator('[data-home-list="streaming-releases"] article')).toHaveCount(1);
  await page.locator('#home-search').fill('');
  await expect(page.locator('[data-home-list="theatrical-releases"] article')).toHaveCount(1);
});

test('sourced archive film page includes six same-year discoveries and optional CC0 film biography',async({page})=>{
  await page.route('**/data/archive/profiles.json',route=>route.fulfill({status:200,
    contentType:'application/json',body:JSON.stringify({schemaVersion:1,records:{
      Q203560:{qid:'Q203560',title:'1408',year:2007,description:'2007 American supernatural horror film',
        checkedAt:'2026-10-09',runtimeMinutes:104,sourceUrl:'https://www.wikidata.org/wiki/Q203560',
        directors:[{name:'Mikael Håfström',qid:'Q255247'}],
        cast:[{name:'John Cusack',qid:'Q10450'}],
        genres:[{name:'horror film',qid:'Q200092'}],countries:[{name:'United States',qid:'Q30'}]
      }
    }})
  }));
  await page.goto('/archive-film.html?id=Q203560');
  await expect(page.locator('.archive-detail__title')).toHaveText('1408');
  await expect(page.locator('.archive-detail__metadata')).toContainText('BEHIND THE FEAR');
  await expect(page.locator('.archive-detail__metadata')).toContainText('Mikael Håfström');
  await expect(page.locator('.archive-detail__metadata')).toContainText('John Cusack');
  await expect(page.locator('.archive-detail__metadata')).toContainText('104 minutes');
  await expect(page.locator('.archive-detail__related-link')).toHaveCount(6);
  await expect(page.locator('.archive-detail__related')).toContainText('MORE HORROR FROM 2007');
});
test('curated studio films have atmospheric original poster artwork, crew and sourced synopsis on mobile',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/films/victorian-psycho/');
  await expect(page.locator('.fr-movie-hero')).toBeVisible();
  await expect(page.locator('.fr-movie-hero__art')).toContainText('Victorian Psycho');
  await expect(page.locator('.fr-movie-hero__art')).toContainText('FRIGHTERTAINMENT ARTWORK');
  await expect(page.locator('.fr-movie-hero__facts')).toContainText('DIRECTED BY');
  await expect(page.locator('.fr-movie-hero__facts')).toContainText('FEATURED CAST');
  await expect(page.locator('.fr-movie-hero__browse')).toHaveAttribute('href','/all-horror-movies.html?year=2026');
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('Top 20 leaves unreviewed archive candidates unnumbered and does not pad the verified catalogue',async({page})=>{
  await page.route('**/api/rankings?year=*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'pending',minimumCritics:3,items:[]})}));
  await page.goto('/top-20/2026/');
  await expect(page.locator('.ranking-row')).toHaveCount(0);
  await expect(page.locator('.hub-ranking-watchlist__item')).toHaveCount(7);
  const filmLinks = await page.locator('.hub-ranking-watchlist__item > a').evaluateAll(links => links.map(link => link.getAttribute('href')));
  expect(filmLinks.every(href => /^\/films\/[a-z0-9-]+\/$/.test(href || ''))).toBe(true);
  await expect(page.locator('.hub-ranking-watchlist')).not.toContainText('#12');
});

test('verified UK horror release bulletin shows new streaming dates and source links',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  const bulletin=page.locator('[data-release-brief]').first();
  await expect(bulletin.locator('.release-brief__item')).toHaveCount(4);
  await expect(bulletin).toContainText('V/H/S/Mixtape');
  await expect(bulletin).toContainText('Shudder UK');
  await expect(bulletin.locator('a.release-brief__source').first()).toHaveAttribute('href',/letterboxd/);
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('UK release bulletin separates cinema and home-media listings from streaming',async({page})=>{
  await page.goto('/movies.html');
  const widget=page.locator('[data-release-brief]');
  await widget.getByRole('button',{name:'IN CINEMAS'}).click();
  await expect(widget).toContainText('Other Mommy');
  await expect(widget).toContainText('Resident Evil');
  await expect(widget).not.toContainText('Shudder UK');
  await widget.getByRole('button',{name:'BUY OR RENT'}).click();
  await expect(widget).toContainText('28 Years Later: The Bone Temple');
  await expect(widget).toContainText('Insidious: Out of the Further');
  await widget.getByRole('button',{name:'COMING NEXT'}).click();
  await expect(widget).toContainText('Jitters');
  await expect(widget.locator('.release-brief__item')).toHaveCount(4);
});
test('release bulletin never invents current streaming entries after data becomes stale',async({page})=>{
  await page.route('**/data/editorial-releases.json',route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({updatedAt:'2026-01-01T12:00:00Z',items:[
      {id:'old-1',category:'streaming',title:'Old UK Film',year:2025,country:'GB',
       service:'Shudder',date:'2026-01-01',checkedAt:'2026-01-01',
       sourceName:'Shudder UK',sourceUrl:'https://example.com/old'}
    ]})
  }));
  await page.goto('/');
  const bulletin=page.locator('[data-release-brief]').first();
  await expect(bulletin).not.toContainText('Old UK Film');
  await expect(bulletin).toContainText('No recent verified listings');
  await expect(bulletin).toContainText('awaiting the next editorial check');
});

test('Movies has a compact secondary tools drawer, deep-linked cinema tools expand',async({page})=>{
  await page.goto('/movies.html');
  const drawer=page.locator('.movie-advanced');
  await expect(drawer).toBeVisible();
  await expect(drawer).not.toHaveAttribute('open','');
  await expect(page.locator('.release-brief--movies')).toBeVisible();
  await expect(page.locator('#cinema-panel')).toBeHidden();
  await page.goto('/movies.html#cinema-panel');
  await expect(drawer).toHaveAttribute('open','');
  await expect(page.locator('#cinema-panel')).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('optional homepage discovery still shows real UK editorial release notices with provider APIs offline',async({page})=>{
  await page.route('**/api/discovery?country=GB',route=>route.fulfill({status:503,body:'Unavailable'}));
  await page.route('**/api/rankings?year=*',route=>route.fulfill({status:503,body:'Unavailable'}));
  await page.goto('/');
  await page.locator('.home-discovery-wrap summary').click();
  await expect(page.locator('[data-home-list="streaming-releases"] article')).toHaveCount(4);
  await expect(page.locator('[data-home-list="streaming-releases"]')).toContainText('Shudder');
  await expect(page.locator('[data-home-list="theatrical-releases"]')).toContainText('Other Mommy');
  await expect(page.locator('[data-home-list="coming-soon"]')).toContainText('Jitters');
  await expect(page.locator('[data-home-list="trending-horror"]')).toContainText('Shudder');
  await expect(page.locator('[data-home-state="trending-horror"]')).toContainText('UK release announcements');
  await expect(page.locator('#home-attribution')).toContainText('Shudder UK release calendar');
});
test('opened Movies discovery links source-checked current and future horror even if licensed feeds are disabled',async({page})=>{
  await page.route('**/api/discovery?country=GB',route=>route.fulfill({status:503,body:'Unavailable'}));
  await page.route('**/api/rankings?year=*',route=>route.fulfill({status:503,body:'Unavailable'}));
  await page.goto('/movies.html#discovery');
  await expect(page.locator('.movie-advanced')).toHaveAttribute('open','');
  await expect(page.locator('[data-list="streaming-releases"]')).toContainText('Shudder');
  await expect(page.locator('[data-list="theatrical-releases"]')).toContainText('Other Mommy');
  await expect(page.locator('[data-list="coming-soon"]')).toContainText('Jitters');
  await expect(page.locator('[data-list="trending-horror"]')).toContainText('Shudder');
  await expect(page.locator('[data-state="rankings"]')).toContainText('Critic ranking pending');
});


test('homepage composition stays ordered and usable across the approved viewport widths', async ({ browser }) => {
  test.setTimeout(120_000);
  for (const width of [320, 360, 390, 430, 768, 1024, 1440, 1920]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('.hub-tabs a')).toHaveCount(6);
    for (let index = 0; index < 6; index++) await expect(page.locator('.hub-tabs a').nth(index)).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const layout = await page.evaluate(() => {
      const feature = document.querySelector('.hub-feature').getBoundingClientRect();
      const chart = document.querySelector('.hub-charts').getBoundingClientRect();
      const support = document.querySelector('.hub-showcase__bottom').getBoundingClientRect();
      return {
        featureTop: feature.top,
        featureLeft: feature.left,
        featureBottom: feature.bottom,
        chartTop: chart.top,
        chartBottom: chart.bottom,
        chartLeft: chart.left,
        supportTop: support.top,
        desktopColumns: getComputedStyle(document.querySelector('.hub-dashboard')).gridTemplateColumns,
        supportColumns: getComputedStyle(document.querySelector('.hub-showcase__bottom')).gridTemplateColumns
      };
    });
    if (width <= 900) {
      expect(layout.featureTop).toBeLessThan(layout.chartTop);
      expect(layout.chartTop).toBeLessThan(layout.supportTop);
    } else {
      expect(Math.abs(layout.featureTop - layout.chartTop)).toBeLessThan(2);
      expect(layout.featureLeft).toBeLessThan(layout.chartLeft);
      expect(layout.supportTop).toBeLessThan(layout.chartBottom);
      expect(layout.supportTop - layout.featureBottom).toBeLessThanOrEqual(20);
    }
    if (width <= 360) expect(layout.supportColumns.trim().split(/\s+/)).toHaveLength(1);
    if (width >= 390 && width <= 900) expect(layout.supportColumns.trim().split(/\s+/)).toHaveLength(2);
    if (width === 390) {
      expect(layout.featureTop).toBeGreaterThanOrEqual(300);
      expect(layout.featureTop).toBeLessThanOrEqual(420);
      await expect(page.locator('.hub-feature h3')).toBeInViewport();
      await expect(page.locator('.hub-feature .hub-tile__link')).toBeInViewport();
    }
    await page.close();
  }
});

test('homepage ranking loading resolves to a clear pending state when no eligible data exists', async ({ page }) => {
  await page.route('**/api/rankings?year=*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) }));
  await page.goto('/');
  const ranking = page.locator('#hub-ranking');
  await expect(ranking).toHaveAttribute('aria-busy', 'false');
  await expect(ranking).not.toContainText('Loading critic ranking');
  await expect(ranking).toContainText('Critic ranking pending');
  await expect(ranking).toContainText('Verified critic scores are not yet available.');
});

test('homepage slow chart scroll uses only validated ranking rows and pauses for keyboard focus', async ({ page }) => {
  const items = Array.from({ length: 10 }, (_, index) => ({
    filmId: `fixture-film-${index + 1}`, title: `Fixture Horror ${index + 1}`, position: index + 1,
    averageScore: 90 - index, criticCount: 3, movementLabel: index === 0 ? 'NEW' : '—',
    sources: [{ publication: 'Fixture Review Source', url: `https://example.test/review/${index + 1}`, territory: 'GB', checkedAt: '2026-10-08' }]
  }));
  await page.route('**/api/rankings?year=*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ year: 2026, items, updatedAt: '2026-10-08T04:00:00.000Z' }) }));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const list = page.locator('#hub-chart-results');
  const control = page.getByRole('button', { name: 'Pause chart scroll' });
  await expect(list.locator('.hub-chart-row')).toHaveCount(10);
  await expect(list.locator('.hub-chart-row .movement').first()).toHaveAttribute('aria-label', 'Position movement new');
  await expect(control).toBeVisible();
  const scrollRange = await list.evaluate(element => element.scrollHeight - element.clientHeight);
  expect(scrollRange).toBeGreaterThanOrEqual(80);
  const before = await list.evaluate(element => element.scrollTop);
  await expect.poll(() => list.evaluate(element => element.scrollTop)).toBeGreaterThan(before + 2);
  await control.focus();
  const paused = await list.evaluate(element => element.scrollTop);
  await page.waitForTimeout(150);
  expect(await list.evaluate(element => element.scrollTop)).toBeLessThanOrEqual(paused + 2);
  await control.click();
  await expect(page.getByRole('button', { name: 'Start slow chart scroll' })).toHaveAttribute('aria-pressed', 'false');
  const manuallyPaused = await list.evaluate(element => element.scrollTop);
  await page.waitForTimeout(150);
  expect(await list.evaluate(element => element.scrollTop)).toBeLessThanOrEqual(manuallyPaused + 2);
});

test('annual chart rejects duplicate canonical films from an invalid API response', async ({ page }) => {
  const items = [
    { filmId: 'clayface', title: 'Fixture Film A', position: 1, averageScore: 80, criticCount: 3, sources: [] },
    { filmId: 'clayface', title: 'Fixture Film Duplicate', position: 2, averageScore: 79, criticCount: 3, sources: [] },
    { filmId: 'other-mommy', title: 'Fixture Film B', position: 3, averageScore: 78, criticCount: 3, sources: [] }
  ];
  await page.route('**/api/rankings?year=*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ranked', updatedAt: '2026-10-08T04:00:00.000Z', items }) }));
  await page.goto('/top-20/2026/');
  await expect(page.locator('.ranking-row')).toHaveCount(2);
  const displayedTitles = await page.locator('.ranking-row h2').allTextContents();
  expect(displayedTitles).not.toContain('Fixture Film Duplicate');
});

test('stale rankings retain the last valid rows and label their status', async ({ page }) => {
  await page.route('**/api/rankings?year=*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ stale: true, items: [{ filmId: 'clayface', title: 'Last Verified Horror', position: 1, averageScore: 77, criticCount: 3 }] }) }));
  await page.goto('/');
  const ranking = page.locator('#hub-ranking');
  await expect(ranking).toHaveAttribute('aria-busy', 'false');
  await expect(ranking.locator('.hub-chart-row')).toContainText('Last Verified Horror');
  await expect(ranking).toContainText('Showing the last valid ranking');
  await expect(ranking).toContainText('out of date');
});

test('homepage ranking failure resolves to a clear unavailable state', async ({ page }) => {
  await page.route('**/api/rankings?year=*', route => route.fulfill({ status: 503, body: 'Unavailable' }));
  await page.goto('/');
  const ranking = page.locator('#hub-ranking');
  await expect(ranking).toHaveAttribute('aria-busy', 'false');
  await expect(ranking).not.toContainText('Loading critic ranking');
  await expect(ranking).toContainText('Ranking unavailable');
  await expect(ranking).toContainText('could not be refreshed');
});

test('direct page loads declare the shared Frightertainment typefaces', async ({ page }) => {
  for (const path of ['/', '/movies.html', '/tv-shows.html', '/indie-movies.html', '/podcasts.html', '/games.html', '/films/clayface/', '/top-20/2026/', '/all-horror-movies.html']) {
    await page.goto(path);
    const fontHref = await page.locator('link[rel="stylesheet"][href*="fonts.googleapis.com/css2"]').getAttribute('href');
    expect(fontHref).toContain('Barlow+Condensed');
    expect(fontHref).toContain('DM+Sans');
  }
  await page.goto('/movies.html');
  await expect.poll(() => page.locator('.hub-page-intro h1').evaluate(el => getComputedStyle(el).fontFamily)).toContain('Cormorant Garamond');
});

test('reduced-motion preference disables homepage transitions and artwork zoom', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const transitionDuration = await page.locator('.hub-feature').evaluate(el => getComputedStyle(el, '::before').transitionDuration);
  expect(transitionDuration.split(',').every(value => parseFloat(value) === 0)).toBe(true);
});

test('homepage review screenshots use the same verified pending data state', async ({ browser }) => {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await desktop.route('**/api/rankings?year=*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'pending',items:[]})}));
  await desktop.goto('/');
  await expect(desktop.locator('#hub-ranking')).toContainText('Critic ranking pending');
  await desktop.screenshot({ path: 'test-results/design-refinement/after-desktop-first.png' });
  await desktop.screenshot({ path: 'test-results/design-refinement/after-desktop-full.png', fullPage: true });
  await desktop.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await mobile.route('**/api/rankings?year=*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'pending',items:[]})}));
  await mobile.goto('/');
  await expect(mobile.locator('#hub-ranking')).toContainText('Critic ranking pending');
  await mobile.screenshot({ path: 'test-results/design-refinement/after-mobile-first.png' });
  await mobile.screenshot({ path: 'test-results/design-refinement/after-mobile-full.png', fullPage: true });
  await mobile.close();

  const narrow = await browser.newPage({ viewport: { width: 320, height: 844 }, reducedMotion: 'reduce' });
  await narrow.route('**/api/rankings?year=*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'pending',items:[]})}));
  await narrow.goto('/');
  await narrow.screenshot({ path: 'test-results/design-refinement/after-mobile-320.png', fullPage: true });
  await narrow.close();
});

test('pending ranking review screenshot contains no synthetic public score rows', async ({ page }) => {
  await page.route('**/api/rankings?year=*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) }));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('#hub-ranking')).toContainText('Critic ranking pending');
  await page.screenshot({ path: 'test-results/design-refinement/after-ranking-pending.png', fullPage: true });
});

test('six themed environments and review pages have desktop and mobile browser evidence', async ({ browser }) => {
  test.setTimeout(240_000);
  const out = 'test-results/design-refinement/sections';
  mkdirSync(out, { recursive: true });
  const routes = [
    ['home', '/'], ['movies', '/movies.html'], ['tv-shows', '/tv-shows.html'],
    ['indie-movies', '/indie-movies.html'], ['podcasts', '/podcasts.html'], ['games', '/games.html']
  ];
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.route('**/api/rankings?year=*', request => request.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'pending', items: [] }) }));
  for (const [name, route] of routes) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await page.locator('main').waitFor();
    if (name === 'home') await expect(page.locator('#hub-ranking')).toContainText('Critic ranking pending');
    await page.screenshot({ path: `${out}/${name}-desktop-first.png` });
    await page.screenshot({ path: `${out}/${name}-desktop-full.png`, fullPage: true });
    if (name === 'home') await page.locator('.hub-charts').screenshot({ path: `${out}/homepage-chart-desktop.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `${out}/${name}-mobile-first.png` });
    await page.screenshot({ path: `${out}/${name}-mobile-full.png`, fullPage: true });
    if (name === 'home') await page.locator('.hub-charts').screenshot({ path: `${out}/homepage-chart-mobile.png` });
  }
  for (const [name, route] of [['annual-chart-2026', '/top-20/2026/'], ['movie-archive', '/all-horror-movies.html']]) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await page.locator('main').waitFor();
    if (name === 'movie-archive') await expect(page.locator('#archive-summary')).toContainText('indexed film links', { timeout: 15000 });
    await page.screenshot({ path: `${out}/${name}-desktop-first.png` });
    await page.screenshot({ path: `${out}/${name}-desktop-full.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `${out}/${name}-mobile-first.png` });
    await page.screenshot({ path: `${out}/${name}-mobile-full.png`, fullPage: true });
  }
  await context.close();
});

test('mobile copy, display headings and active navigation meet AA contrast in all six themes', async ({ page }) => {
  const routes = [
    ['/', 'home'], ['/movies.html', 'movies'], ['/tv-shows.html', 'tv'],
    ['/indie-movies.html', 'indie'], ['/podcasts.html', 'podcasts'], ['/games.html', 'games']
  ];
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [route, theme] of routes) {
    await page.goto(route);
    const result = await page.evaluate(theme => {
      const channels = color => {
        const hex = color.match(/^#([a-f0-9]{3}|[a-f0-9]{6})$/i)?.[1];
        if (hex) {
          const expanded = hex.length === 3 ? [...hex].map(part => part + part).join('') : hex;
          return expanded.match(/.{2}/g).map(part => parseInt(part, 16));
        }
        return (color.match(/[\d.]+/g) || []).slice(0, 3).map(Number).map(value => value <= 1 ? value * 255 : value);
      };
      const luminance = color => channels(color).map(value => {
        const channel = value / 255;
        return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
      }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
      const contrast = (foreground, background) => {
        const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
        return (values[0] + .05) / (values[1] + .05);
      };
      const body = getComputedStyle(document.body);
      const heading = document.querySelector(theme === 'home' ? '.hub-intro h1' : '.hub-page-intro h1');
      const copy = document.querySelector(theme === 'home' ? '.hub-intro>p' : '.hub-page-intro>p');
      const active = document.querySelector('.hub-tabs a[aria-current="page"]');
      const base = body.getPropertyValue('--world').trim();
      return {
        theme: document.body.dataset.theme,
        copy: contrast(getComputedStyle(copy).color, base),
        heading: contrast(getComputedStyle(heading).color, base),
        accent: contrast(getComputedStyle(heading.querySelector('em') || heading).color, base),
        activeNav: contrast(getComputedStyle(active).color, getComputedStyle(active).backgroundColor)
      };
    }, theme);
    expect(result.theme).toBe(theme);
    expect(result.copy, `${theme} paragraph contrast`).toBeGreaterThanOrEqual(4.5);
    expect(result.heading, `${theme} heading contrast`).toBeGreaterThanOrEqual(4.5);
    expect(result.accent, `${theme} accent contrast`).toBeGreaterThanOrEqual(4.5);
    expect(result.activeNav, `${theme} active navigation contrast`).toBeGreaterThanOrEqual(4.5);
  }
});


test('removed Editorial Standards page is not served and public navigation has no stale links', async ({ page }) => {
  const response = await page.goto('/editorial-standards.html');
  expect(response?.status()).toBe(404);
  for (const pathname of ['/', '/movies.html', '/tv-shows.html', '/indie-movies.html', '/podcasts.html', '/games.html', '/films/other-mommy/', '/top-20/2026/']) {
    await page.goto(pathname);
    await expect(page.locator('a[href$="editorial-standards.html"]')).toHaveCount(0);
  }
});
