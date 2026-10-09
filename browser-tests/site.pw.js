import { test, expect } from '@playwright/test';

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
  await expect(page.locator('#hub-release-list .hub-release-row')).toHaveCount(8);
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

test('private 2026 scoreboard shows a six-film sourced partial chart instead of generic pending',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/top-20/2026/');
  await expect(page.locator('.hub-rt-chart__entry')).toHaveCount(6);
  await expect(page.locator('#ranking-status')).toContainText('6 scored films + 14 awaiting verified ratings');
  await expect(page.locator('#ranking-method')).toContainText('PRIVATE PREVIEW ONLY');
  await expect(page.locator('.hub-rt-chart__entry').first()).toContainText('Send Help');
  await expect(page.locator('.hub-rt-chart__entry').first()).toContainText('92%');
  await expect(page.locator('.hub-rt-chart__entry').nth(1)).toContainText('The Bone Temple');
  await expect(page.locator('.hub-rt-chart__entry').nth(1)).toContainText('91%');
  await expect(page.locator('.hub-rt-coverage__row')).toHaveCount(14);
  await expect(page.locator('.hub-rt-coverage')).toContainText('14 more tracked 2026 films');
  await expect(page.locator('.hub-rt-coverage')).not.toContainText('28 Weeks Later');
  await expect(page.locator('.hub-rt-chart')).not.toContainText('28 Weeks Later');
  await expect(page.locator('.hub-rt-chart__film').filter({hasText:/^28 Years Later$/})).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('homepage score panel shows a compact dated comparison without claiming it is live',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await expect(page.locator('#hub-ranking .hub-preview-chart__entry')).toHaveCount(5);
  await expect(page.locator('.hub-charts__top p')).toContainText('incomplete comparison');
  await expect(page.locator('.hub-preview-chart__note')).toContainText('Not licensed for public syndication');
  await expect(page.locator('#hub-ranking')).not.toContainText('RANKINGS PENDING');
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
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
  await page.goto('/all-horror-movies.html');
  const counter=page.locator('#archive-summary');
  await expect(counter).toContainText('indexed film links');
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
test('top twenty candidate pool uses 2026 horror archive and does not fabricate missing critic ranks',async({page})=>{
  await page.goto('/top-20/2026/');
  await expect(page.locator('.hub-rt-chart__entry')).toHaveCount(6);
  await expect(page.locator('.hub-rt-coverage__row')).toHaveCount(14);
  const scored=await page.locator('.hub-rt-chart__score').allTextContents();
  expect(scored).toEqual(['92%','91%','86%','75%','57%','30%']);
  const count=await page.locator('.hub-rt-chart__entry, .hub-rt-coverage__row').count();
  expect(count).toBe(20);
  await expect(page.locator('.hub-rt-coverage')).toContainText('Not ranked: no approved comparable critic score');
  const last=page.locator('.hub-rt-coverage__row').last().locator('a');
  await expect(last).toHaveAttribute('href',/^(\/archive-film\.html\?id=Q\d+|\/films\/[a-z0-9-]+\/)$/);
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
