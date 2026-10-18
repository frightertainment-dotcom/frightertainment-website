import {test,expect} from '@playwright/test';

test('Homepage is a compact cinematic dashboard on a phone, not a giant feed',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 await expect(page.locator('.fr-home-intro')).toBeVisible();
 await expect(page.locator('#home-showcase .hub-feature')).toBeVisible();
 await expect(page.locator('#home-showcase .hub-charts')).toBeVisible();
 await expect(page.locator('#home-showcase .hub-showcase__bottom .hub-tile')).toHaveCount(4);
 await expect(page.locator('#home-showcase .fr-home-cinema-note__diary')).toHaveAttribute('href','/cinema.html');
 await expect(page.locator('link[href^="/fr-design-system.css"]')).toHaveCount(1);
 const sizes=await page.evaluate(()=>{
  const rect=selector=>document.querySelector(selector).getBoundingClientRect();
  const intro=rect('.fr-home-intro'),featured=rect('.hub-feature'),rank=rect('.hub-charts'),support=rect('.hub-showcase__bottom');
  const tabs=[...document.querySelectorAll('.hub-tabs a')];
  return {introHeight:intro.height,featuredTop:featured.top,featuredBottom:featured.bottom,
    rankedTop:rank.top,rankedBottom:rank.bottom,supportTop:support.top,
    tabs:tabs.length,pageWidth:document.documentElement.scrollWidth,viewport:window.innerWidth};
 });
 expect(sizes.introHeight).toBeGreaterThanOrEqual(200);
 expect(sizes.introHeight).toBeLessThan(330);
 expect(sizes.featuredTop).toBeLessThan(sizes.rankedTop);
 expect(sizes.supportTop).toBeGreaterThan(sizes.rankedBottom);
 expect(sizes.tabs).toBe(7);
 expect(sizes.pageWidth).toBeLessThanOrEqual(sizes.viewport+2);
 const releases=page.locator('details.fr-home-updates');
 await expect(releases).not.toHaveAttribute('open','');
 await expect(releases.locator('[data-release-brief]')).not.toBeVisible();
 await releases.locator('summary').click();
 await expect(releases.locator('[data-release-brief]')).toBeVisible();
 await page.screenshot({path:'test-results/fr-home-concept-mobile.png',fullPage:true});
});

test('Homepage gives the film spotlight and Top 20 adjacent desktop panels',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/');
 const measures=await page.evaluate(()=>{
  const featured=document.querySelector('#home-showcase .hub-feature').getBoundingClientRect();
  const rank=document.querySelector('#home-showcase .hub-charts').getBoundingClientRect();
  const cards=[...document.querySelectorAll('.hub-showcase__bottom .hub-tile')];
  return {feature:{top:featured.top,right:featured.right},ranking:{top:rank.top,left:rank.left},
    categories:cards.length,cardRows:new Set(cards.map(c=>Math.round(c.getBoundingClientRect().top))).size,
    pageWidth:document.documentElement.scrollWidth,viewport:window.innerWidth};
 });
 expect(measures.categories).toBe(4);
 expect(Math.abs(measures.feature.top-measures.ranking.top)).toBeLessThan(6);
 expect(measures.feature.right).toBeLessThan(measures.ranking.left);
 expect(measures.cardRows).toBe(1);
 expect(measures.pageWidth).toBeLessThanOrEqual(measures.viewport+2);
 await page.screenshot({path:'test-results/fr-home-concept-desktop.png',fullPage:true});
});
