import {test,expect} from '@playwright/test';

/* These are real interior routes, not just the seven marketing mastheads.
   Source claims, search results and form controls must remain functional while
   the shared horror publication art direction is applied. */
const interiors = [
  '/all-horror-movies.html','/archive-film.html','/media.html',
  '/film.html','/contact.html','/credits.html','/privacy.html',
  '/top-20/','/top-20/2026/','/films/other-mommy/'
];

test('Every supporting page carries the AFTER DARK identity and brand without sideways overflow',async({page})=>{
  for(const width of [390,1440]){
    await page.setViewportSize({width,height:900});
    for(const path of interiors){
      await page.goto(path);
      await expect(page.locator('link[href="/fr-inner.css"]')).toHaveCount(1);
      await expect(page.locator('.hub-brand img[src="/assets/frightertainment-brand.png"]')).toBeVisible();
      await expect(page.locator('.hub-tabs a')).toHaveCount(7);
      const state=await page.evaluate(()=>({
        width:innerWidth, document:document.documentElement.scrollWidth,
        font:getComputedStyle(document.body).getPropertyValue('--inner-ui').trim()
      }));
      expect(state.font,path).toContain('DM Sans');
      expect(state.document,path+' '+width+'px horizontal overflow').toBeLessThanOrEqual(state.width+2);
    }
  }
});

test('Horror Vault uses a dense readable year grid and preserves year filtering and source links',async({page})=>{
  for(const width of [320,390,900,1440]){
    await page.setViewportSize({width,height:900});
    await page.goto('/all-horror-movies.html');
    const years=page.locator('#archive-years details.horror-year');
    await expect(years.first()).toBeVisible();
    expect(await years.count()).toBeGreaterThan(90);
    const state=await page.evaluate(()=>{
      const grid=document.getElementById('archive-years');
      return {columns:getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length,
        root:document.documentElement.scrollWidth, viewport:innerWidth};
    });
    expect(state.columns,width+' year grid columns').toBe(width<=700?2:width<=1000?3:4);
    expect(state.root,width+' year grid overflow').toBeLessThanOrEqual(state.viewport+2);
    await page.locator('#archive-jump').selectOption('2026');
    await expect(page.locator('#horror-year-2026')).toHaveAttribute('open','');
    await expect(page.locator('#horror-year-2026 .horror-year__film-link').first()).toBeVisible();
    expect(await page.locator('#horror-year-2026 .horror-year__film-link').count()).toBeGreaterThan(40);
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
  }
});

test('Film dossiers preserve their cited source claims and premium reading layout',async({page})=>{
  for(const width of [390,1440]){
    await page.setViewportSize({width,height:900});
    await page.goto('/films/other-mommy/');
    const film=page.locator('.fr-movie-hero');
    await expect(film).toBeVisible();
    await expect(film.locator('h1')).toHaveText('Other Mommy');
    await expect(page.locator('.film-claim a').first()).toHaveAttribute('href',/^https:\/\//);
    await expect(page.locator('.film-claim')).not.toHaveCount(0);
    const state=await film.evaluate(el=>({
      font:getComputedStyle(el.querySelector('h1')).fontFamily,
      width:document.documentElement.scrollWidth,viewport:innerWidth,
      columns:getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length
    }));
    expect(state.font).toContain('Cormorant');
    expect(state.width).toBeLessThanOrEqual(state.viewport+2);
    expect(state.columns).toBe(width<700?1:2);
  }
});

test('Contact, annual rankings and attribution retain their distinct functionality',async({page})=>{
  await page.setViewportSize({width:390,height:900});
  await page.goto('/contact.html');
  await expect(page.locator('#contact-message')).toBeVisible();
  await expect(page.locator('#contact-form button[type="submit"]')).toBeVisible();
  await expect(page.locator('a[href^="mailto:"]')).not.toHaveCount(0);
  await page.goto('/top-20/2026/');
  await expect(page.locator('#ranking-status')).toBeVisible();
  await expect(page.locator('.ranking-method summary')).toBeVisible();
  await page.goto('/credits.html');
  await expect(page.locator('#tmdb-credit')).toContainText('The Movie Database');
  await expect(page.locator('a[href="https://www.themoviedb.org/"]').first()).toBeVisible();
});

test('Capture real supporting-page screenshots for visual sign-off',async({page})=>{
  for(const [name,path] of [['vault','/all-horror-movies.html'],['rankings','/top-20/2026/'],
    ['film','/films/other-mommy/'],['contact','/contact.html']]){
    for(const width of [390,1440]){
      await page.setViewportSize({width,height:900});
      await page.goto(path);
      if(name==='vault')await expect(page.locator('#archive-years .horror-year').first()).toBeVisible();
      await page.screenshot({path:`test-results/premium-interior/${name}-${width}.png`,fullPage:false,animations:'disabled'});
    }
  }
});
