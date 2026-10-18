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
   const hero=page.locator('.editorial-carousel .editorial-pick');
   await expect(hero).toBeVisible({timeout:10000});
   await expect(hero.locator('.editorial-pick__title')).not.toBeEmpty();
   const carousel=page.locator('.editorial-carousel');
   await expect(carousel).toHaveAttribute('aria-roledescription','carousel');
   await expect(carousel.getByRole('button',{name:'Next editorial pick'})).toBeVisible();
   await expect(carousel.getByRole('button',{name:'Previous editorial pick'})).toBeVisible();
   await expect(carousel.locator('.editorial-carousel__dot')).toHaveCount(5);
   const before=await carousel.getAttribute('data-feature-id');
   await carousel.getByRole('button',{name:'Next editorial pick'}).click();
   await expect.poll(()=>carousel.getAttribute('data-feature-id')).not.toBe(before);
   await expect(page.locator('.editorial-carousel__status')).toContainText('OF');
   await expect(carousel).toBeVisible();
   await expect(carousel.getByRole('button',{name:'Resume automatic editorial rotation'})).toBeVisible();
   await carousel.getByRole('button',{name:'Resume automatic editorial rotation'}).click();
   await expect(carousel.getByRole('button',{name:'Pause automatic editorial rotation'})).toBeVisible();
   await expect(hero.locator('.editorial-pick__synopsis')).not.toBeEmpty();
   if (['movies', 'tv', 'indie'].includes(room)) {
     await expect(hero.locator('.editorial-pick__score')).toContainText('Rating unavailable');
     await expect(hero.locator('.editorial-pick__score')).toContainText('TMDB audience');
   } else {
     await expect(hero.locator('.editorial-pick__score')).toHaveCount(0);
   }
   const filmID=await hero.getAttribute('data-feature-id');
   expect(filmID).toBeTruthy();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth+3))
     .toBeTruthy();
   expect(missingAssets).toEqual([]);
   await page.evaluate(() => window.scrollTo(0,0));
   await page.screenshot({path:'test-results/cinematic-'+room+'-'+name+'.png',fullPage:false});
  });
 }
}
test('Editorial card does not invent scores, rights, or a film trailer',async({page})=>{
 await page.goto('/indie-movies.html');
 const hero=page.locator('.editorial-pick');
 await expect(hero).toBeVisible();
 await expect(hero.locator('.editorial-pick__score')).toContainText('Rating unavailable');
 const img=hero.locator('img.editorial-pick__poster');
 if(await img.count()){
   await expect(hero.locator('.editorial-pick__art-credit')).toBeVisible();
 }else{
   await expect(hero.locator('.editorial-pick__art-sub')).toContainText('POSTER NOT AVAILABLE');
    await expect(hero.locator('.editorial-pick__art-frame')).toHaveAttribute('aria-label',/not an official film poster/i);
 }
});

test('Movie editorial picks use a meaningful sourced synopsis, not a filler line',async({page})=>{
 await page.goto('/movies.html');
 const feature=page.locator('.editorial-pick');
 await expect(feature).toBeVisible();
 const synopsis=(await feature.locator('.editorial-pick__synopsis').innerText()).trim();
 expect(synopsis.length).toBeGreaterThan(100);
 expect(synopsis).not.toMatch(/Explore its sourced details|independently documented horror film/i);
 await expect(feature.getByRole('link',{name:/SYNOPSIS SOURCE|OFFICIAL SOURCE|EXPLORE FILM FILE/}).first()).toBeVisible();
});
