import {test,expect} from '@playwright/test';

const items=Array.from({length:12},(_,i)=>({
 tmdbId:120000+i,mediaType:'movie',type:'movie',title:['Nightfall','The Abandoned','Hellbound','Blood Moon','Buried Alive','Cursed House','Deep Woods','Deadwater','The Witching','Basement','Night Watch','Reckoning'][i],
 posterPath:'/example'+i+'.jpg',voteAverage:7.3,voteCount:135,releaseDate:'2026-10-05',
 overview:'A source-linked horror title worth investigating.',trailerVideoId:'abcdefghijk'
}));

test.beforeEach(async({page})=>{
 await page.route('**/api/catalogue?**',route=>{
   const qs=new URL(route.request().url()).searchParams;
   const type=qs.get('type');
   return route.fulfill({json:{items:items.map(item=>({...item,mediaType:type==='tv'?'tv':'movie'})),page:1,totalPages:1,status:'ready'}});
 });
 await page.route('**/api/rankings?**',route=>route.fulfill({json:{ratingKind:'tmdb-community',items:items.slice(0,10).map((item,i)=>({title:item.title,position:i+1,tmdbId:item.tmdbId,averageScore:85-i,voteCount:135}))}}));
 await page.route('https://image.tmdb.org/**',route=>route.fulfill({status:404}));
});

test('V5 Indie mobile follows the approved editorial panel order and real catalogue fallback',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/indie-movies.html');
 await expect(page.locator('body')).toHaveClass(/fr-v5/);
 await expect(page.locator('.editorial-carousel')).toBeVisible();
 await expect(page.locator('.fr-v5-front .fr-v5-rack')).toBeVisible();
 await expect(page.locator('.fr-v5-front .fr-v5-announced')).toBeVisible();
 await expect(page.locator('.fr-v5-front .fr-v5-trailer')).toBeVisible();
 await expect(page.locator('.fr-v5-rack .fr-v5-poster')).toHaveCount(3);
 await expect(page.locator('.fr-v5-mobile-dock')).toBeVisible();
 await expect(page.locator('.hub-page-wordmark[src="/assets/page-title-indie-movies.png"]')).toBeVisible();
 await expect(page.locator('.hub-brand img[src="/assets/frightertainment-brand.png"]')).toBeVisible();
 await expect(page.locator('.hub-tabs a')).toHaveCount(7);
 const visual=await page.evaluate(()=>{
   const loc=s=>document.querySelector(s).getBoundingClientRect();
   const art=loc('.editorial-pick__art'),text=loc('.editorial-pick__content');
   return {
    intro:loc('.hub-page-intro').bottom,
    hero:loc('.editorial-carousel').top,
    rack:loc('.fr-v5-rack').top,
    lower:loc('.fr-v5-secondary-panels').top,
    artRight:art.right,textLeft:text.left,
    pageWidth:document.documentElement.scrollWidth,
    viewport:innerWidth,
    legacyOpen:document.querySelector('.fr-v5-deeper').open
   };
 });
 expect(visual.hero).toBeGreaterThanOrEqual(visual.intro-8);
 expect(visual.rack).toBeGreaterThan(visual.hero);
 expect(visual.lower).toBeGreaterThan(visual.rack);
 expect(visual.artRight).toBeLessThanOrEqual(visual.textLeft+4);
 expect(visual.pageWidth).toBeLessThanOrEqual(visual.viewport+2);
 expect(visual.legacyOpen).toBe(false);
 await page.screenshot({path:'test-results/visual/v5-indie-mobile.png',fullPage:false});
});

test('V5 desktop Movies matches three-panels-above-eight-posters layout',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/movies.html');
 await expect(page.locator('.fr-v5-front .fr-v5-feature-panels .fr-v5-panel')).toHaveCount(3);
 await expect(page.locator('.fr-v5-rack .fr-v5-poster')).toHaveCount(8);
 await expect(page.locator('.fr-v5-ranking__entry')).toHaveCount(10);
 await expect(page.locator('.fr-v5-deeper')).toBeVisible();
 await expect(page.locator('.fr-v5-deeper')).not.toHaveAttribute('open','');
 const layout=await page.evaluate(()=>{
  const box=s=>document.querySelector(s).getBoundingClientRect();
  const hero=box('.editorial-carousel'),panel=box('.fr-v5-feature-panels'),rack=box('.fr-v5-rack');
  const arts=[...document.querySelectorAll('.fr-v5-feature-panels>.fr-v5-panel')].map(x=>x.getBoundingClientRect());
  return {posterNext:panel.top>hero.top,panelsOneRow:Math.max(...arts.map(a=>a.top))-Math.min(...arts.map(a=>a.top))<6,
   rackAfter:rack.top>=panel.bottom,pageWidth:document.documentElement.scrollWidth,viewport:innerWidth};
 });
 expect(layout.posterNext).toBe(true);
 expect(layout.panelsOneRow).toBe(true);
 expect(layout.rackAfter).toBe(true);
 expect(layout.pageWidth).toBeLessThanOrEqual(layout.viewport+2);
 await page.screenshot({path:'test-results/visual/v5-movies-desktop.png',fullPage:false});
});

test('Original tools remain functional and accessible through the full discovery disclosure',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/movies.html');
 const details=page.locator('.fr-v5-deeper');
 await expect(details).toBeVisible();
 await expect(page.locator('#straight-to-stream')).not.toBeVisible();
 await details.locator(':scope > summary').click();
 await expect(page.locator('#straight-to-stream')).toBeVisible();
 await expect(page.locator('#movie-year')).toBeVisible();
 await expect(page.locator('#movie-grid')).toHaveCount(1);
 const hrefs=await page.locator('.hub-tabs a').evaluateAll(links=>links.map(a=>a.getAttribute('href')));
 expect(new Set(hrefs).size).toBe(7);
});

test('V5 phone reflow does not require sideways scrolling to read title and hero',async({page})=>{
 for(const width of [320,360,375,390,430]){
  await page.setViewportSize({width,height:850});
  await page.goto('/tv-shows.html');
  await expect(page.locator('.editorial-carousel')).toBeVisible();
  const result=await page.evaluate(()=>({
   viewport:innerWidth,document:document.documentElement.scrollWidth,
   nav:document.querySelectorAll('.hub-tabs a').length,
   framed:document.querySelector('.editorial-pick__art-frame').getBoundingClientRect().width,
   title:document.querySelector('.editorial-pick__title').getBoundingClientRect().width
  }));
  expect(result.document,width+'px').toBeLessThanOrEqual(result.viewport+2);
  expect(result.framed).toBeGreaterThan(72);
  expect(result.title).toBeGreaterThan(155);
  expect(result.nav).toBe(7);
 }
});

test('Home keeps authentic site logo and working chart with condensed presentation',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await expect(page.locator('body.fr-v5')).toBeVisible();
 await expect(page.locator('.fr-v5-mobile-dock')).toBeVisible();
 await expect(page.locator('.hub-brand img')).toHaveAttribute('src','/assets/frightertainment-brand.png');
 await expect(page.locator('#hub-ranking')).toBeVisible();
 await expect(page.locator('.hub-feature')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
 await page.screenshot({path:'test-results/visual/v5-home-mobile.png',fullPage:false});
});
