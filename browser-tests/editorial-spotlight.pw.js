import {test,expect} from '@playwright/test';
const routes=[
 ['movies','/movies.html','page-title-movies.png'],
 ['tv','/tv-shows.html','page-title-tv-shows.png'],
 ['indie','/indie-movies.html','page-title-indie-movies.png'],
 ['podcasts','/podcasts.html','page-title-podcasts.png'],
 ['games','/games.html','page-title-games.png']
];
for(const [room,path,wordmark] of routes){
 for(const [name,width,height] of [['mobile',390,844],['desktop',1440,1000]]){
  test(room+' '+name+': genuine brand, editorial hero, no overflow',async({page})=>{
   const missingAssets=[];
   page.on('response',response=>{
    if(response.status()===404 && response.url().includes('127.0.0.1:4173') &&
      /\.(?:css|mjs|png|webp|json)(?:\?|$)/.test(response.url())) missingAssets.push(response.url());
   });
   await page.setViewportSize({width,height});
   await page.goto(path,{waitUntil:'domcontentloaded'});
   await expect(page.locator('.hub-brand img[src="/assets/frightertainment-brand.png"]')).toBeVisible();
   await expect(page.locator('.hub-page-intro img[src="/assets/'+wordmark+'"]')).toBeVisible();
   const hero=page.locator('.hub-page-intro + .editorial-pick');
   await expect(hero).toBeVisible({timeout:10000});
   await expect(hero.locator('.editorial-pick__title')).not.toBeEmpty();
   await expect(hero.locator('.editorial-pick__synopsis')).not.toBeEmpty();
   await expect(hero.locator('.editorial-pick__score')).toContainText('FRIGHT RATING');
   const filmID=await hero.getAttribute('data-feature-id');
   expect(filmID).toBeTruthy();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth+3))
     .toBeTruthy();
   expect(missingAssets).toEqual([]);
   await page.screenshot({path:'test-results/cinematic-'+room+'-'+name+'.png',fullPage:false});
  });
 }
}
test('Editorial card does not invent scores, rights, or a film trailer',async({page})=>{
 await page.goto('/indie-movies.html');
 const hero=page.locator('.editorial-pick');
 await expect(hero).toBeVisible();
 await expect(hero.locator('.editorial-pick__score')).toContainText('AWAITING VERIFIED SCORES');
 const img=hero.locator('img.editorial-pick__poster');
 if(await img.count()){
   await expect(hero.locator('.editorial-pick__art-credit')).toBeVisible();
 }else{
   await expect(hero.locator('.editorial-pick__art-sub')).toContainText('NOT AN OFFICIAL POSTER');
 }
});
