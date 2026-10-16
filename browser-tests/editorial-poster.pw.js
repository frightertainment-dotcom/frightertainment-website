import {test,expect} from '@playwright/test';

const identities = {
  '1226578': ['Longlegs', 2024],
  '1302916': ['Heart Eyes', 2025],
  '1138194': ['Heretic', 2024],
  '1124620': ['The Monkey', 2025],
  '426063': ['Nosferatu', 2024]
};
const override = id => ({schemaVersion:1,overrides:{movies:{id,approved:true,starts:'2026-01-01',ends:'2027-01-01'},indie:{id:id==='longlegs'?'indie-movies-0':'indie-movies-1',approved:true,starts:'2026-01-01',ends:'2027-01-01'}},notes:{}});
async function pin(page,id) {
  const selection=override(id);
  // Owner approvals now ship inside the source-backed first-paint bootstrap.
  // Override exactly that public release payload, instead of waiting for a
  // separate JSON request that the fast startup no longer needs.
  await page.addInitScript(fixture => {
    let value;
    Object.defineProperty(window,'FR_EDITORIAL_BOOTSTRAP',{
      configurable:true,enumerable:true,
      get(){return value;},
      set(payload){
        value=Object.freeze({...payload,settings:{
          ...payload.settings,
          overrides:{...payload.settings.overrides,...fixture.overrides},
          notes:{...payload.settings.notes,...fixture.notes}
        }});
      }
    });
  }, selection);
  // This also checks the former fetch route for non-built local development.
  await page.route('**/data/editorial-spotlight-overrides.json',route=>route.fulfill({json:selection}));
}
function media(id, title, year, posterPath='/sample.jpg') {
  return {item:{type:'movie',tmdbId:Number(id),title,firstReleaseDate:year+'-01-01',sourceUrl:'https://www.themoviedb.org/movie/'+id,posterPath,voteAverage:7.2,voteCount:123,ratingKind:'tmdb-community',trailer:{source:'TMDB official video listing',url:'https://www.youtube.com/watch?v=abcdefghijk'}}};
}
const testArt='<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750"><rect width="500" height="750" fill="#3b1722"/><text x="250" y="375" fill="white" font-size="30" text-anchor="middle">TEST IMAGE</text></svg>';

test('A pinned film gets only its exact TMDB identity, labelled score and trailer',async({page})=>{
 await pin(page,'longlegs');
 await page.route('**/api/media?**',route=>{
  const id=new URL(route.request().url()).searchParams.get('id');
  route.fulfill({json:media(id,...(identities[id]||['Unknown',2024]))});
 });
 await page.route('https://image.tmdb.org/**',route=>route.fulfill({contentType:'image/svg+xml',body:testArt}));
 await page.goto('/movies.html');
 const card=page.locator('.editorial-pick');
 await expect(card).toHaveAttribute('data-feature-id','longlegs');
 await expect(card.locator('.editorial-pick__poster')).toBeVisible();
 await expect(card.locator('.editorial-pick__poster')).toHaveAttribute('alt',/Longlegs \(2024\)/);
 await expect(card.locator('.editorial-pick__score')).toContainText('TMDB audience');
 await expect(card.locator('.editorial-pick__score')).toContainText('7.2/10');
 await expect(card.getByRole('link',{name:/WATCH OFFICIAL TRAILER/})).toHaveAttribute('href','https://www.youtube.com/watch?v=abcdefghijk');
 await expect(card.locator('.editorial-pick__art-credit')).toContainText('Longlegs (2024)');
});

test('A title collision or wrong release year never paints a poster',async({page})=>{
 await pin(page,'heart-eyes');
 await page.route('**/api/media?**',route=>route.fulfill({json:media('1302916','Heart Eyes',1981)}));
 await page.goto('/movies.html');
 const card=page.locator('.editorial-pick');
 await expect(card).toHaveAttribute('data-feature-id','heart-eyes');
 await expect(card.locator('.editorial-pick__poster')).toHaveCount(0);
 await expect(card.locator('.editorial-pick__art-sub')).toContainText('ORIGINAL FRIGHTERTAINMENT ART');
 await expect(card.locator('.editorial-pick__art-frame')).toHaveAttribute('aria-label',/not an official film poster/i);
});

test('Broken images retain original display art and rapid navigation does not restore a previous poster',async({page})=>{
 await pin(page,'longlegs');
 await page.route('**/api/media?**',async route=>{
  const id=new URL(route.request().url()).searchParams.get('id');
  if(id==='1226578') await new Promise(resolve=>setTimeout(resolve,350));
  await route.fulfill({json:media(id,...(identities[id]||['Unknown',2024]))});
 });
 await page.route('https://image.tmdb.org/**',route=>route.fulfill({status:404}));
 await page.goto('/movies.html');
 const carousel=page.locator('.editorial-carousel');
 await expect(carousel).toHaveAttribute('data-feature-id','longlegs');
 await carousel.getByRole('button',{name:'Next editorial pick'}).click();
 const newId=await carousel.getAttribute('data-feature-id');
 await page.waitForTimeout(600);
 await expect(carousel).toHaveAttribute('data-feature-id',newId);
 await expect(carousel.locator('.editorial-pick__poster')).toHaveCount(0);
 await expect(carousel.locator('.editorial-pick__art-sub')).toBeVisible();
 await expect(carousel.locator('.editorial-carousel__pause')).toBeHidden();
});

test('Longlegs fallback keeps its single word on one line at phone and desktop sizes',async({page})=>{
 await pin(page,'longlegs');
 await page.route('**/api/media?**',route=>route.fulfill({status:503}));
 for(const width of [320,360,375,390,430,768,1024,1440,1920]){
  await page.setViewportSize({width,height:900});
  await page.goto('/movies.html');
  await expect(page.locator('.editorial-pick')).toHaveAttribute('data-feature-id','longlegs');
  const result=await page.locator('.editorial-pick__art-title').evaluate(el=>{
   const text=el.firstChild, tops=new Set();
   for(let i=0;i<text.length;i++){const range=document.createRange();range.setStart(text,i);range.setEnd(text,i+1);tops.add(Math.round(range.getBoundingClientRect().top));}
   return {lines:tops.size,wrap:getComputedStyle(el).overflowWrap,wordBreak:getComputedStyle(el).wordBreak,pageWidth:document.documentElement.scrollWidth,viewport:innerWidth};
  });
  expect(result.lines,width+'px').toBe(1);
  expect(result.wordBreak).toBe('normal');
  expect(result.pageWidth,width+'px overflow').toBeLessThanOrEqual(result.viewport+2);
 }
});

for(const [room,path,wordmark] of [
 ['movies','/movies.html','page-title-movies.png'],['tv','/tv-shows.html','page-title-tv-shows.png'],
 ['indie','/indie-movies.html','page-title-indie-movies.png'],['podcasts','/podcasts.html','page-title-podcasts.png'],
 ['games','/games.html','page-title-games.png']]) {
 test(room+' reflows across nine viewports without clipped carousel or missing controls',async({page})=>{
  await page.route('**/api/media?**',route=>route.fulfill({status:503}));
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  for(const width of [320,360,375,390,430,768,1024,1440,1920]){
   await page.setViewportSize({width,height:900});await page.goto(path);
   const carousel=page.locator('.editorial-carousel');
   await expect(carousel).toBeVisible();
   await expect(page.locator('.hub-brand img[src="/assets/frightertainment-brand.png"]')).toBeVisible();
   await expect(page.locator('.hub-page-intro img[src="/assets/'+wordmark+'"]')).toBeVisible();
   await expect(carousel.locator('.editorial-carousel__dot')).toHaveCount(5);
   const box=await carousel.boundingBox();
   expect(box.width).toBeLessThanOrEqual(width+2);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+2);
   const art=await carousel.locator('.editorial-pick__art-frame').boundingBox();
   expect(art.width).toBeGreaterThan(115);
   const ratio=art.height/art.width;
   if(room==='podcasts') expect(ratio).toBeGreaterThanOrEqual(.95);
   else if(room==='games') { expect(ratio).toBeGreaterThan(.58); expect(ratio).toBeLessThan(.72); }
   else expect(ratio).toBeGreaterThan(1.35);
   if(room==='podcasts') expect(ratio).toBeLessThanOrEqual(1.05);
   await expect(carousel.getByRole('button',{name:'Next editorial pick'})).toBeVisible();
  }
  expect(errors).toEqual([]);
 });
}


test('Seven tabs and editorial art/copy remain in their responsive tracks', async ({page}) => {
  await pin(page,'longlegs');
  await page.route('**/api/media?**',route=>route.fulfill({status:503}));
  for(const width of [320,390,1440]) {
    await page.setViewportSize({width,height:900});
    await page.goto('/movies.html');
    await expect(page.locator('.editorial-pick')).toBeVisible();
    const result=await page.evaluate(()=>{
      const mobile=innerWidth<=700;
      const headerNav=document.querySelector('.hub-header .hub-tabs');
      const dock=document.querySelector('.fr-v5-mobile-dock');
      const tabs=[...(mobile?dock:headerNav).querySelectorAll('a')];
      const poster=document.querySelector('.editorial-pick__art').getBoundingClientRect();
      const copy=document.querySelector('.editorial-pick__content').getBoundingClientRect();
      return {
        tabs:tabs.length,
        headerHidden:mobile?getComputedStyle(headerNav).display==='none':true,
        navRows:new Set(tabs.map(a=>Math.round(a.getBoundingClientRect().top))).size,
        sideBySide:poster.right<=copy.left+2 && poster.left<copy.left && Math.max(poster.top,copy.top)<Math.min(poster.bottom,copy.bottom),
        stacked:poster.bottom<=copy.top+2,
        width:document.documentElement.scrollWidth,
        viewport:innerWidth
      };
    });
    expect(result.tabs).toBe(7);
    expect(result.navRows).toBe(1);
    expect(result.headerHidden).toBe(true);
    // At 320px the editorial poster/copy stacks, but the fixed seven-link
    // mobile dock remains one row; at 390px the editorial story uses two tracks.
    if(width===320) expect(result.stacked).toBe(true);
    else expect(result.sideBySide).toBe(true);
    expect(result.width).toBeLessThanOrEqual(result.viewport+2);
  }
});

test('Indie discovery presents the poster-led selections before its long charts',async({page})=>{
  await page.setViewportSize({width:390,height:900});
  await page.goto('/indie-movies.html');
  await expect(page.locator('.editorial-pick')).toBeVisible();
  const positions=await page.evaluate(()=>({
    editorial:document.querySelector('.editorial-carousel').getBoundingClientRect(),
    magazine:document.querySelector('.fr-v5-front').getBoundingClientRect(),
    full:document.querySelector('.fr-v5-deeper').getBoundingClientRect(),
    originals:[...['#trending','#upcoming','#chart','#archive']].every(s=>document.querySelector('.fr-v5-deeper').querySelector(s))
  }));
  expect(positions.editorial.bottom).toBeLessThanOrEqual(positions.magazine.top+4);
  expect(positions.magazine.bottom).toBeLessThanOrEqual(positions.full.top+4);
  expect(positions.originals).toBe(true);
});
