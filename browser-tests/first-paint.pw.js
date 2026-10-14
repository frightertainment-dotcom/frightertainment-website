import { test, expect } from '@playwright/test';

/* The final visual skin is owner approved. Avoid showing unstyled/legacy
 * catalogue sections while the editorial composition is still assembling. */
for (const route of ['/movies.html','/tv-shows.html','/indie-movies.html','/games.html','/podcasts.html']) {
  test('No legacy layout flash while the feature source is pending: '+route, async ({page}) => {
    await page.route('**/data/editorial-spotlight-overrides.json', async request => {
      await new Promise(resolve=>setTimeout(resolve,900));
      await request.continue();
    });
    await page.setViewportSize({width:390,height:850});
    await page.goto(route,{waitUntil:'domcontentloaded'});
    await expect(page.locator('.hub-page-intro')).toBeVisible();
    const pending=await page.evaluate(() => {
      const main=document.querySelector('main');
      const original=[...main.children].filter(node=>
        !node.matches('.hub-page-intro,.editorial-carousel,script'));
      return {
        initialized: main.dataset.frV5Ready==='true',
        leaking:original.filter(node=>getComputedStyle(node).display!=='none'),
        skinLoaded:!!document.querySelector('style#fr-flash-prevention'),
        theme:document.body.dataset.theme
      };
    });
    expect(pending.skinLoaded).toBe(true);
    if(!pending.initialized)expect(pending.leaking.length).toBe(0);
    await expect(page.locator('.fr-v5-front')).toBeVisible({timeout:15000});
    await expect(page.locator('main')).toHaveAttribute('data-fr-v5-ready','true');
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
  });
}
test('Priority assets are discoverable from document head without blocking font imports',async({page})=>{
  for (const route of ['/','/movies.html','/tv-shows.html','/cinema.html','/indie-movies.html','/podcasts.html','/games.html']) {
    await page.goto(route);
    const state=await page.evaluate(()=>{
      const head=document.head;
      const theme=document.body.dataset.theme;
      const css=head.querySelector('link[href="/fr-premium.css"]');
      return {scene:head.querySelectorAll('link[rel="preload"][as="image"]').length,
        fonts:head.querySelectorAll('link[href*="Cormorant+Garamond"]').length,
        earlyStyle:!!head.querySelector('#fr-flash-prevention'),
        css:!!css,theme};
    });
    expect(state.scene).toBe(2);
    expect(state.fonts).toBe(1);
    expect(state.earlyStyle).toBe(true);
    expect(state.css).toBe(true);
  }
});

test('Verified editorial bootstraps on first paint without three blocking JSON fetches',async({page})=>{
  for(const route of ['/movies.html','/tv-shows.html','/indie-movies.html','/podcasts.html','/games.html']){
    const hits=[];
    await page.route('**/data/editorial*.json', async request=>{
      hits.push(request.request().url());
      await new Promise(resolve=>setTimeout(resolve,1400));
      await request.continue();
    });
    await page.route('**/data/movie-editorial-overviews.json', async request=>{
      hits.push(request.request().url());
      await new Promise(resolve=>setTimeout(resolve,1400));
      await request.continue();
    });
    await page.goto(route,{waitUntil:'domcontentloaded'});
    await expect(page.locator('.editorial-carousel')).toBeVisible({timeout:5000});
    await expect(page.locator('.fr-v5-front')).toBeVisible({timeout:5000});
    expect(hits,'No start-up editorial JSON fetches required on '+route).toEqual([]);
    await expect(page.locator('.fr-v5-curated-card').first()).toBeVisible();
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
  }
});
