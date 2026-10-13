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

 // First-fold parity: the hero cannot consume the entire phone screen.
 expect(visual.rack).toBeLessThan(535);
 const posterDimensions=await page.locator('.fr-v5-rack .fr-v5-poster__art').first().boundingBox();
 expect(posterDimensions.height/posterDimensions.width).toBeLessThan(1.8);

 await page.screenshot({path:'test-results/visual/v5-indie-mobile.png',fullPage:false});
});

test('V5 desktop Movies pairs editorial pick with the chart above eight posters',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/movies.html');
 await expect(page.locator('.fr-v5-front .fr-v5-feature-panels .fr-v5-panel')).toHaveCount(2);
 await expect(page.locator('.fr-v5-spotlight-row > .fr-v5-ranking')).toBeVisible();
 await expect(page.locator('.fr-v5-rack .fr-v5-poster')).toHaveCount(8);
 await expect(page.locator('.fr-v5-ranking__entry')).toHaveCount(10);
 await expect(page.locator('.fr-v5-deeper')).toBeVisible();
 await expect(page.locator('.fr-v5-deeper')).not.toHaveAttribute('open','');
 const layout=await page.evaluate(()=>{
  const box=s=>document.querySelector(s).getBoundingClientRect();
  const hero=box('.editorial-carousel'),chart=box('.fr-v5-spotlight-row > .fr-v5-ranking'),panel=box('.fr-v5-feature-panels'),rack=box('.fr-v5-rack');
  const arts=[...document.querySelectorAll('.fr-v5-feature-panels>.fr-v5-panel')].map(x=>x.getBoundingClientRect());
  return {posterNext:panel.top>hero.top,chartAlongside:Math.abs(hero.top-chart.top)<6,panelsOneRow:Math.max(...arts.map(a=>a.top))-Math.min(...arts.map(a=>a.top))<6,
   rackAfter:rack.top>=panel.bottom,pageWidth:document.documentElement.scrollWidth,viewport:innerWidth};
 });
 expect(layout.posterNext).toBe(true);
 expect(layout.chartAlongside).toBe(true);
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


test('V5 owner-concept header is usable on mobile and keeps seven real tabs',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/indie-movies.html');
 const header=page.locator('.hub-header');
 await expect(header.locator('.fr-v5-header-menu summary')).toBeVisible();
 await expect(header.locator('.fr-v5-header-search summary')).toBeVisible();
 await expect(header.locator('.fr-v5-contact-icon')).toHaveAttribute('href','/contact.html');
 const metrics=await header.evaluate(el=>{
  const tabs=[...el.querySelectorAll('.hub-tabs a')].map(x=>x.getBoundingClientRect());
  return {count:tabs.length,rows:new Set(tabs.map(r=>Math.round(r.y))).size,
    widths:tabs.map(r=>r.width),overflow:document.documentElement.scrollWidth-innerWidth};
 });
 expect(metrics.count).toBe(7);
 expect(metrics.rows).toBe(1);
 expect(Math.min(...metrics.widths)).toBeGreaterThan(35);
 expect(metrics.overflow).toBeLessThanOrEqual(2);
 await header.locator('.fr-v5-header-menu summary').click();
 await expect(header.locator('.fr-v5-menu-list a')).toHaveCount(7);
 await header.locator('.fr-v5-header-search summary').click();
 await expect(header.locator('.fr-v5-header-menu')).not.toHaveAttribute('open','');
 await header.locator('#fr-v5-global-search').fill('Longlegs');
 await header.locator('.fr-v5-search-form button').click();
 await expect(page).toHaveURL(/all-horror-movies\.html\?q=Longlegs/);
 await expect(page.locator('#archive-global-search')).toHaveValue('Longlegs');
 await expect(page.locator('#archive-global-results')).toBeVisible();
});

test('V5 watchlist is real: adding, persisting and removing a sourced movie',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/movies.html');
 const rack=page.locator('.fr-v5-rack');
 await expect(rack.locator('.fr-v5-poster')).toHaveCount(8);
 const watch=page.locator('.fr-v5-watchlist');
 await expect(watch).toContainText('Nothing saved yet');
 const save=rack.locator('.fr-v5-watch-toggle').first();
 await expect(save).toHaveAttribute('aria-pressed','false');
 await save.click();
 await expect(save).toHaveAttribute('aria-pressed','true');
 await expect(watch.locator('.fr-v5-watchlist__saved')).toHaveCount(1);
 const stored=await page.evaluate(()=>localStorage.getItem('frightertainment-v5-watchlist'));
 expect(JSON.parse(stored)).toHaveLength(1);
 await page.reload();
 await expect(page.locator('.fr-v5-watchlist__saved')).toHaveCount(1);
 await page.locator('.fr-v5-watchlist__saved .fr-v5-watch-toggle').click();
 await expect(page.locator('.fr-v5-watchlist__saved')).toHaveCount(0);
 await expect(page.locator('.fr-v5-watchlist')).toContainText('Nothing saved yet');
});

test('V5 concept stays readable at 320px without site-wide horizontal scroll',async({page})=>{
 await page.setViewportSize({width:320,height:750});
 await page.goto('/movies.html');
 await expect(page.locator('.editorial-carousel')).toBeVisible();
 await expect(page.locator('.fr-v5-header-tools .fr-v5-icon-control')).toHaveCount(2);
 const x=await page.evaluate(()=>({
  document:document.documentElement.scrollWidth,viewport:innerWidth,
  poster:document.querySelector('.editorial-pick__art-frame').getBoundingClientRect().width,
  content:document.querySelector('.editorial-pick__content').getBoundingClientRect().width,
  header:document.querySelector('.hub-header').getBoundingClientRect().width
 }));
 expect(x.document).toBeLessThanOrEqual(x.viewport+2);
 expect(x.poster).toBeGreaterThan(70);
 expect(x.content).toBeGreaterThan(125);
 expect(x.header).toBeLessThanOrEqual(x.viewport+2);
});


test('Editorial Picks geometry stays fixed for every rotating film title and poster',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/movies.html');
 const card=page.locator('.editorial-pick');
 await expect(card).toBeVisible();
 await expect(card).toHaveCSS('height','180px');
 const stage=page.locator('.editorial-carousel__stage');
 const first=await stage.boundingBox();
 const next=page.locator('.editorial-carousel__nav[aria-label="Next editorial pick"]');
 for(let n=0;n<4;n++){
  await next.click();
  await expect(card).toBeVisible();
  const current=await stage.boundingBox();
  expect(Math.abs(current.height-first.height)).toBeLessThanOrEqual(1);
  const contained=await page.evaluate(()=>{
   const host=document.querySelector('.editorial-pick').getBoundingClientRect();
   const img=document.querySelector('.editorial-pick__art-frame').getBoundingClientRect();
   const title=document.querySelector('.editorial-pick__title').getBoundingClientRect();
   const links=document.querySelector('.editorial-pick__links').getBoundingClientRect();
   return {poster:img.right<=host.right+1,title:title.right<=host.right+1,links:links.bottom<=host.bottom+2};
  });
  expect(contained.poster).toBe(true);
  expect(contained.title).toBe(true);
  expect(contained.links).toBe(true);
 }
 await expect(page.locator('.editorial-pick')).toHaveCSS('height','180px');
});

test('All seven concept pages bundle their supplied wordmarks and fit a narrow phone',async({page})=>{
 const pages=[
  ['/',null],['/movies.html','page-title-movies.png'],['/tv-shows.html','page-title-tv-shows.png'],
  ['/cinema.html','page-title-cinema.png'],['/indie-movies.html','page-title-indie-movies.png'],
  ['/podcasts.html','page-title-podcasts.png'],['/games.html','page-title-games.png']
 ];
 await page.setViewportSize({width:320,height:750});
 for(const [path,title] of pages){
  const missing=[];
  page.on('response',response=>{if(response.url().includes('/concept-2026.css')&&response.status()!==200)missing.push(response.status());});
  await page.goto(path);
  await expect(page.locator('body.fr-v5')).toBeVisible();
  await expect(page.locator('.hub-brand img')).toHaveAttribute('src','/assets/frightertainment-brand.png');
  if(title)await expect(page.locator('.hub-page-wordmark')).toHaveAttribute('src','/assets/'+title);
  expect(missing,path+' stylesheet').toEqual([]);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  expect(overflow,path+' horizontal overflow').toBeLessThanOrEqual(2);
 }
});

test('Cinema renders with V5 at first paint and retains the release diary in document order',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/cinema.html');
 await expect(page.locator('body')).toHaveClass(/fr-v5/);
 await expect(page.locator('#upcoming-cinema')).toBeVisible();
 await expect(page.locator('.fr-cinema-concept__card')).toHaveCount(4);
 await expect(page.locator('.fr-cinema-concept__region')).toContainText('UNITED KINGDOM');
 await expect(page.locator('#recent-cinema')).toBeVisible();
 await expect(page.locator('.fr-v5-deeper')).toHaveCount(0);
 const stable=await page.evaluate(()=>{
  const intro=document.querySelector('.hub-page-intro');
  const diary=document.querySelector('#upcoming-cinema');
  const recent=document.querySelector('#recent-cinema');
  return {ordered:intro.compareDocumentPosition(diary)&Node.DOCUMENT_POSITION_FOLLOWING,
   recent:diary.compareDocumentPosition(recent)&Node.DOCUMENT_POSITION_FOLLOWING,
   width:document.documentElement.scrollWidth,viewport:innerWidth};
 });
 expect(Boolean(stable.ordered)).toBe(true);
 expect(Boolean(stable.recent)).toBe(true);
 expect(stable.width).toBeLessThanOrEqual(stable.viewport+2);
 await page.screenshot({path:'test-results/visual/v5-cinema-mobile.png',fullPage:false});
});

test('Cinema highlights follow the selected country and link to the screened source',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/cinema.html');
 await expect(page.locator('.fr-cinema-concept__card')).toHaveCount(4);
 await page.locator('#cinema-country').selectOption('US');
 await expect(page.locator('.fr-cinema-concept__region')).toContainText('UNITED STATES');
 const count=await page.locator('.fr-cinema-concept__card').count();
 expect(count).toBeGreaterThan(0);
 const link=page.locator('.fr-cinema-concept__card a').first();
 await expect(link).toHaveAttribute('href',/^https:\/\//);
 await expect(link).toHaveAttribute('rel','noopener noreferrer');
});

test('TV editorial requests title and original air year and displays exact matched TMDB poster',async({page})=>{
 const img=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64');
 const queries=[];
 await page.route('**/api/media?**',route=>{
  const p=new URL(route.request().url()).searchParams;
  queries.push(Object.fromEntries(p));
  if(p.get('type')!=='tv'||!p.get('year')||!p.get('title'))return route.fulfill({status:404});
  return route.fulfill({json:{item:{
   type:'tv',tmdbId:1234,title:p.get('title'),firstReleaseDate:p.get('year')+'-01-01',
   posterPath:'/verified.png',sourceUrl:'https://www.themoviedb.org/tv/1234',
   voteAverage:7.5,voteCount:95
  }}});
 });
 await page.route('https://image.tmdb.org/**',route=>route.fulfill({status:200,contentType:'image/png',body:img}));
 await page.setViewportSize({width:390,height:844});
 await page.goto('/tv-shows.html');
 await expect(page.locator('.editorial-pick__poster')).toBeVisible();
 await expect(page.locator('.editorial-pick__art-credit')).toContainText('Poster via TMDB');
 expect(queries.some(q=>q.type==='tv'&&q.title&&/^20[0-2][0-9]$/.test(q.year))).toBe(true);
});
