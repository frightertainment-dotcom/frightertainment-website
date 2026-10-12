import {test, expect} from '@playwright/test';

/* Approved concept reference comparison: original Frightertainment wordmarks and
 * seven production tabs are preserved. These are LOCAL browser screenshots only.
 * Production poster success behind Cloudflare Access requires separate authorised QA. */
const pages = [
  {name:'movies',path:'/movies.html',logo:'page-title-movies.png',editorial:true},
  {name:'indie',path:'/indie-movies.html',logo:'page-title-indie-movies.png',editorial:true},
  {name:'tv',path:'/tv-shows.html',logo:'page-title-tv-shows.png',editorial:true},
  {name:'podcasts',path:'/podcasts.html',logo:'page-title-podcasts.png',editorial:true},
  {name:'games',path:'/games.html',logo:'page-title-games.png',editorial:true},
  {name:'cinema',path:'/cinema.html',logo:'page-title-cinema.png',editorial:false}
];

for (const entry of pages) {
  test('cinematic visual evidence: '+entry.name+' desktop and mobile',async({page})=>{
    test.setTimeout(90000);
    await page.route('**/api/media?**',route=>route.fulfill({status:503,body:'Provider unavailable in local visual QA'}));
    for (const width of [320,390,768,1440]) {
      await page.setViewportSize({width,height:900});
      await page.goto(entry.path,{waitUntil:'domcontentloaded'});
      await page.evaluate(()=>document.fonts.ready);
      await expect(page.locator('nav.hub-tabs a')).toHaveCount(7);
      await expect(page.locator('.hub-brand img')).toBeVisible();
      const mark=page.locator('.hub-page-intro img[src="/assets/'+entry.logo+'"]');
      await expect(mark).toBeVisible();
      await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
      const typography=await page.evaluate(()=>{
        const nav=[...document.querySelectorAll('nav.hub-tabs a')].map(a=>a.getBoundingClientRect());
        const mark=document.querySelector('.hub-page-wordmark').getBoundingClientRect();
        return {navInside:nav.every(x=>x.left>=-2 && x.right<=innerWidth+2),wordmarkInside:mark.left>=-2 && mark.right<=innerWidth+2};
      });
      expect(typography.navInside).toBe(true);
      expect(typography.wordmarkInside).toBe(true);
      if(entry.name==='movies' && width<=390) {
        const rows=await page.evaluate(()=>{
          const topSet=selector=>[...document.querySelectorAll(selector)].map(a=>Math.round(a.getBoundingClientRect().top));
          return {subtabs:topSet('.hub-page-intro .hub-subtabs a'),jumps:topSet('.hub-page-intro .hub-section-jumps a')};
        });
        expect(new Set(rows.subtabs).size,'Movies subsections should use one compact grid row').toBe(1);
        expect(new Set(rows.jumps).size,'Movies jump links should use one compact grid row').toBe(1);
      }

      if(entry.editorial) {
        const carousel=page.locator('.hub-page-intro + .editorial-carousel');
        await expect(carousel).toBeVisible();
        const hero=carousel.locator('.editorial-pick');
        await expect(hero.locator('.editorial-pick__art-frame')).toBeVisible();
        await expect(hero.locator('.editorial-pick__title')).toBeVisible();
        await expect(hero.locator('.editorial-pick__facts .editorial-pick__meta .editorial-pick__score')).toBeVisible();
        await expect(hero.locator('.editorial-pick__content .editorial-pick__meta')).toHaveCount(0);
        await expect(carousel.locator('.editorial-carousel__dot')).toHaveCount(5);
        const dims=await hero.evaluate(el=>{
          const cover=el.querySelector('.editorial-pick__art-frame').getBoundingClientRect();
          const content=el.querySelector('.editorial-pick__content').getBoundingClientRect();
          const host=el.getBoundingClientRect();
          return {coverW:cover.width,coverH:cover.height,contentW:content.width,hostW:host.width,hostRight:host.right};
        });
        expect(dims.coverW).toBeGreaterThan(150);
        expect(dims.coverH/dims.coverW).toBeGreaterThan(1.35);
        expect(dims.contentW).toBeGreaterThan(100);
        expect(dims.hostRight).toBeLessThanOrEqual(width+2);
        if ([390,1440].includes(width)) {
          await carousel.screenshot({path:'test-results/visual/fidelity-'+entry.name+'-'+width+'-local-fallback.png'});
        }
      }
      if([390,1440].includes(width)){
        await page.evaluate(()=>window.scrollTo(0,0));
        await page.screenshot({path:'test-results/visual/fidelity-'+entry.name+'-'+width+'-top.png',fullPage:false});
      }
    }
  });
}

test('homepage artwork and charts retain cinematic framing without extra products',async({page})=>{
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:900});
    await page.goto('/');
    await expect(page.locator('.hub-brand img')).toBeVisible();
    await expect(page.locator('nav.hub-tabs a')).toHaveCount(7);
    await expect(page.locator('.hub-feature')).toBeVisible();
    await expect(page.locator('.hub-charts')).toBeVisible();
    await expect(page.locator('section.ft-shop-promo')).toHaveCount(0);
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
    if([390,1440].includes(width)){
      await page.screenshot({path:'test-results/visual/fidelity-home-'+width+'-top.png',fullPage:false});
    }
  }
});
