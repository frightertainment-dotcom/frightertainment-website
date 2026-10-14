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
 await expect(page.locator('.fr-v5-rack .fr-v5-poster')).toHaveCount(6);
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
    artBottom:art.bottom,textTop:text.top,artRight:art.right,textLeft:text.left,
    pageWidth:document.documentElement.scrollWidth,
    viewport:innerWidth,
    legacyOpen:document.querySelector('.fr-v5-deeper').open
   };
 });
 expect(visual.hero).toBeGreaterThanOrEqual(visual.intro-8);
 expect(visual.rack).toBeGreaterThan(visual.hero);
 expect(visual.lower).toBeGreaterThan(visual.rack);
 // Premium editorial allows side-by-side poster and text, or a stacked
 // composition where neither track covers the other at narrow widths.
 expect(visual.artBottom<=visual.textTop+4 || visual.artRight<=visual.textLeft+4).toBe(true);
 expect(visual.pageWidth).toBeLessThanOrEqual(visual.viewport+2);
 expect(visual.legacyOpen).toBe(false);

 // The full poster/copy composition is allowed to reflow before the rack.
 expect(visual.rack).toBeGreaterThan(visual.hero+300);
 const posterDimensions=await page.locator('.fr-v5-rack .fr-v5-poster__art').first().boundingBox();
 expect(posterDimensions.height/posterDimensions.width).toBeLessThan(1.8);

 await page.screenshot({path:'test-results/visual/v5-indie-mobile.png',fullPage:false});
});

test('V5 desktop Movies pairs editorial pick with the chart above eight posters',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/movies.html');
 await expect(page.locator('.fr-v5-front .fr-v5-feature-panels .fr-v5-panel')).toHaveCount(1);
 await expect(page.locator('.fr-v5-spotlight-row > .fr-v5-ranking')).toBeVisible();
 await expect(page.locator('.fr-v5-explore__tile')).toHaveCount(5);
 await expect(page.locator('.fr-v5-rack .fr-v5-poster')).toHaveCount(8);
 await expect(page.locator('.fr-v5-ranking__entry')).toHaveCount(10);
 await expect(page.locator('.fr-v5-deeper')).toBeVisible();
 await expect(page.locator('.fr-v5-deeper')).not.toHaveAttribute('open','');
 const layout=await page.evaluate(()=>{
  const box=s=>document.querySelector(s).getBoundingClientRect();
  const hero=box('.editorial-carousel'),chart=box('.fr-v5-spotlight-row > .fr-v5-ranking'),panel=box('.fr-v5-feature-panels'),rack=box('.fr-v5-rack');
  const arts=[...document.querySelectorAll('.fr-v5-feature-panels>.fr-v5-panel')].map(x=>x.getBoundingClientRect());
  return {posterNext:panel.top>hero.top,chartBeforeRack:chart.bottom<=rack.top+1,panelsOneRow:Math.max(...arts.map(a=>a.top))-Math.min(...arts.map(a=>a.top))<6,
   rackAfter:rack.top>=panel.bottom,pageWidth:document.documentElement.scrollWidth,viewport:innerWidth};
 });
 expect(layout.posterNext).toBe(true);
 expect(layout.chartBeforeRack).toBe(true);
 expect(layout.panelsOneRow).toBe(true);
 expect(layout.rackAfter).toBe(true);
 expect(layout.pageWidth).toBeLessThanOrEqual(layout.viewport+2);
 await page.screenshot({path:'test-results/visual/v5-movies-desktop.png',fullPage:false});
});

test('Original tools remain functional and accessible through the full discovery disclosure',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/movies.html');
 await expect(page.locator('.fr-v5-explore__tile')).toHaveCount(5);
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
 expect(metrics.rows).toBe(2);
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

test('V5 watchlist is real: adding in Movies, persisting on Home and removing',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/movies.html');
 const rack=page.locator('.fr-v5-rack');
 await expect(rack.locator('.fr-v5-poster')).toHaveCount(8);
 await expect(page.locator('.fr-v5-watchlist')).toHaveCount(0);
 const save=rack.locator('.fr-v5-watch-toggle').first();
 await expect(save).toHaveAttribute('aria-pressed','false');
 await save.click();
 await expect(save).toHaveAttribute('aria-pressed','true');
 const stored=await page.evaluate(()=>localStorage.getItem('frightertainment-v5-watchlist'));
 expect(JSON.parse(stored)).toHaveLength(1);
 await page.goto('/');
 await expect(page.locator('#my-watchlist [data-home-watch-count]')).toHaveText('1');
 await page.reload();
 await expect(page.locator('#my-watchlist .fr-home-watch-shelf__item')).toHaveCount(1);
 await page.locator('#my-watchlist .fr-home-watch-shelf__remove').click();
 await expect(page.locator('#my-watchlist [data-home-watch-count]')).toHaveText('0');
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


test('Editorial rotation keeps poster, full synopsis and controls legible without overlap',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/movies.html');
 const card=page.locator('.editorial-pick');
 await expect(card).toBeVisible();
 const originalHeight=await card.evaluate(node=>node.getBoundingClientRect().height);
 expect(originalHeight).toBeGreaterThan(420);
 const stage=page.locator('.editorial-carousel__stage');
 const next=page.locator('.editorial-carousel__nav[aria-label="Next editorial pick"]');
 for(let n=0;n<4;n++){
  await next.click();
  await expect(card).toBeVisible();
  const current=await stage.boundingBox();
  // Longer source-backed plots can grow rather than being cut at two lines.
  expect(current.height).toBeGreaterThan(340);
  expect(current.height).toBeLessThan(1300);
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
 expect(await card.evaluate(node=>node.getBoundingClientRect().height)).toBeGreaterThan(420);
 const legible=await page.evaluate(()=>{
  const title=document.querySelector('.editorial-pick__title');
  const synopsis=document.querySelector('.editorial-pick__synopsis');
  const action=document.querySelector('.editorial-pick__links a,.editorial-pick__links summary');
  return {title:parseFloat(getComputedStyle(title).fontSize),
    synopsis:parseFloat(getComputedStyle(synopsis).fontSize),
    action:action?parseFloat(getComputedStyle(action).fontSize):0,
    actionHeight:action?parseFloat(getComputedStyle(action).minHeight):0};
 });
 expect(legible.title).toBeGreaterThanOrEqual(17);
 expect(legible.synopsis).toBeGreaterThanOrEqual(12);
 expect(legible.action).toBeGreaterThanOrEqual(11);
 expect(legible.actionHeight).toBeGreaterThanOrEqual(34);
});

test('All seven editorial pages protect mobile dock clearance and real copy at 390px',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 for(const route of ['/','/movies.html','/tv-shows.html','/cinema.html','/indie-movies.html','/podcasts.html','/games.html']){
  await page.goto(route);
  await expect(page.locator('.fr-v5-mobile-dock')).toBeVisible();
  const metrics=await page.evaluate(()=>{
    const dock=document.querySelector('.fr-v5-mobile-dock');
    return {dock:Math.ceil(dock.getBoundingClientRect().height),
      bodyPadding:parseFloat(getComputedStyle(document.body).paddingBottom),
      overflow:document.documentElement.scrollWidth-innerWidth,
      tabs:[...document.querySelectorAll('.hub-tabs a')].map(x=>Math.round(x.getBoundingClientRect().height))};
  });
  expect(metrics.bodyPadding).toBeGreaterThanOrEqual(metrics.dock+10);
  expect(metrics.overflow).toBeLessThanOrEqual(2);
  expect(metrics.tabs.length).toBe(7);
  expect(Math.min(...metrics.tabs)).toBeGreaterThanOrEqual(38);
 }
});

test('Opening the editorial trailer can expand beyond a fixed carousel card',async({page})=>{
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:844});
  await page.goto('/movies.html');
  await expect(page.locator('.editorial-pick')).toBeVisible();
  const before=await page.locator('.editorial-pick').evaluate(node=>node.getBoundingClientRect().height);
  await page.locator('.editorial-pick__links').evaluate(node=>{
   const details=document.createElement('details');
   details.className='editorial-pick__trailer';
   details.open=true;
   const summary=document.createElement('summary');
   summary.textContent='Example expanded player for layout verification';
   const player=document.createElement('div');
   player.className='editorial-pick__video';
   player.style.height='260px';
   details.append(summary,player);
   node.append(details);
  });
  const measured=await page.locator('.editorial-pick').evaluate(node=>{
   const player=node.querySelector('.editorial-pick__video').getBoundingClientRect();
   const outer=node.getBoundingClientRect();
   return {height:outer.height,playerBottom:player.bottom,outerBottom:outer.bottom};
  });
  expect(measured.height).toBeGreaterThan(before);
  expect(measured.playerBottom).toBeLessThanOrEqual(measured.outerBottom+1);
 }
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

test('Capture every approved section at phone and desktop widths for owner comparison',async({page})=>{
 test.setTimeout(150_000);
 const pages=[['/','home'],['/movies.html','movies'],['/tv-shows.html','tv'],['/cinema.html','cinema'],
  ['/indie-movies.html','indie'],['/podcasts.html','podcasts'],['/games.html','games']];
 for(const [route,name] of pages){
  for(const [size,width,height] of [['mobile',390,844],['desktop',1440,900]]){
   await page.setViewportSize({width,height});
   await page.goto(route,{waitUntil:'domcontentloaded'});
   if(name==='home')await expect(page.locator('.hub-feature')).toBeVisible();
   else if(name==='cinema')await expect(page.locator('.fr-cinema-concept__card').first()).toBeVisible();
   else await expect(page.locator('.fr-v5-front')).toBeVisible();
   await page.screenshot({path:`test-results/visual/concept-${name}-${size}.png`,fullPage:false});
   await page.screenshot({path:`test-results/visual/concept-${name}-${size}.jpg`,type:'jpeg',quality:35,fullPage:false});
  }
 }
});

test('original editorial fallback is art-directed and clearly not an official poster',async({page})=>{
 for(const route of ['/movies.html','/tv-shows.html','/indie-movies.html','/podcasts.html','/games.html']){
  await page.setViewportSize({width:390,height:844});
  await page.goto(route);
  const art=page.locator('.editorial-pick__art-frame');
  await expect(art).toBeVisible();
  // Matched real posters have their own licensed UI, and must never be covered by a fallback.
  if(await art.evaluate(node=>node.classList.contains('editorial-pick__art-frame--poster')))continue;
  await expect(art).toHaveAttribute('aria-label',/not an official film poster/i);
  const info=await art.evaluate(node=>({
    background:getComputedStyle(node).backgroundImage,
    title:node.querySelector('.editorial-pick__art-title')?.textContent?.trim()||'',
    width:node.getBoundingClientRect().width,
    overflow:document.documentElement.scrollWidth-innerWidth
  }));
  expect(info.background).toContain('/assets/themes/');
  expect(info.title.length).toBeGreaterThan(3);
  expect(info.width).toBeGreaterThan(70);
  expect(info.overflow).toBeLessThanOrEqual(2);
 }
});

test('Movies mobile discovery has five readable illustrated links',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/movies.html');
 const cards=page.locator('.fr-v5-explore__tile');
 await expect(cards).toHaveCount(5);
 const layout=await cards.evaluateAll(nodes=>{
  const a=nodes.map(n=>n.getBoundingClientRect());
  return {
    heights:a.map(r=>r.height),
    tops:a.map(r=>r.top),
    images:nodes.map(n=>getComputedStyle(n).backgroundImage),
    hrefs:nodes.map(n=>n.getAttribute('href')),
    overflow:document.documentElement.scrollWidth-innerWidth,
    center:Math.abs((a[3].left+a[4].right)/2 - (a[0].left+a[2].right)/2)
  };
 });
 expect(layout.heights.every(h=>h>=85)).toBe(true);
 expect(layout.images.every(s=>s.includes('/assets/themes/'))).toBe(true);
 expect(layout.hrefs.every(h=>h?.startsWith('/'))).toBe(true);
 expect(Math.abs(layout.tops[0]-layout.tops[1])).toBeLessThanOrEqual(2);
 expect(layout.tops[2]).toBeGreaterThan(layout.tops[0]+10);
 expect(Math.abs(layout.tops[2]-layout.tops[3])).toBeLessThanOrEqual(2);
 expect(layout.tops[4]).toBeGreaterThan(layout.tops[3]+10);
 expect(layout.overflow).toBeLessThanOrEqual(2);
});

test('Cinema has stable first-paint sections and does not relocate the country picker on a nudge',async({page})=>{
 // A static HTML test catches the original problem even before deferred JS runs.
 const response=await page.request.get('/cinema.html');
 expect(response.ok()).toBe(true);
 const html=await response.text();
 expect(html).toContain('class="fr-cinema-concept"');
 expect(html).toContain('data-cinema-concept-cards');
 expect(html).toContain('class="fr-cinema-concept__region"');
 expect(html).toContain('data-cinema-country');

 await page.setViewportSize({width:390,height:844});
 await page.goto('/cinema.html');
 const region=page.locator('.fr-cinema-concept__region');
 const selector=page.locator('#cinema-country');
 await expect(selector).toBeVisible();
 await expect(region.locator('#cinema-country')).toHaveCount(1);
 await expect(page.locator('.fr-cinema-concept')).toHaveCount(1);
 const before=await page.evaluate(()=>{
  const feature=document.querySelector('.fr-cinema-concept');
  const diary=document.querySelector('#upcoming-cinema');
  const picker=document.querySelector('#cinema-country');
  return {feature:feature.getBoundingClientRect().height,diaryY:diary.getBoundingClientRect().y+scrollY,
   pickerParent:picker.closest('.fr-cinema-concept__region')!==null};
 });
 await page.evaluate(()=>window.scrollTo({top:3,behavior:'instant'}));
 await page.waitForTimeout(80);
 await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
 const after=await page.evaluate(()=>({
  feature:document.querySelector('.fr-cinema-concept').getBoundingClientRect().height,
  diaryY:document.querySelector('#upcoming-cinema').getBoundingClientRect().y+scrollY,
  pickerParent:document.querySelector('#cinema-country').closest('.fr-cinema-concept__region')!==null,
  overflow:document.documentElement.scrollWidth-innerWidth
 }));
 expect(after.pickerParent).toBe(true);
 expect(before.pickerParent).toBe(true);
 expect(Math.abs(after.diaryY-before.diaryY)).toBeLessThanOrEqual(2);
 expect(Math.abs(after.feature-before.feature)).toBeLessThanOrEqual(2);
 expect(after.overflow).toBeLessThanOrEqual(2);
});

test('Saving a movie shows a discoverable watchlist on the homepage with a working details link',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 const shelf=page.locator('#my-watchlist');
 await expect(shelf).toBeVisible();
 await expect(shelf.locator('[data-home-watch-count]')).toHaveText('0');
 await expect(shelf.locator('[data-home-watch-items]')).toBeHidden();
 await page.goto('/movies.html');
 const first=page.locator('.fr-v5-rack .fr-v5-poster-card').first();
 await expect(first).toBeVisible();
 await first.locator('.fr-v5-watch-toggle').click();
 await expect(first.locator('.fr-v5-watch-toggle')).toHaveAttribute('aria-pressed','true');
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('frightertainment-v5-watchlist')||'[]'));
 expect(stored.length).toBe(1);
 await page.goto('/');
 await expect(shelf.locator('[data-home-watch-count]')).toHaveText('1');
 const a=shelf.locator('.fr-home-watch-shelf__movie').first();
 await expect(a).toBeVisible();
 await expect(a).toHaveAttribute('href',new RegExp('^/media\\.html\\?type=movie&id='+stored[0].tmdbId));
 await expect(shelf).toContainText(stored[0].title);
 await a.click();
 await expect(page).toHaveURL(new RegExp('/media\\.html\\?type=movie&id='+stored[0].tmdbId));
 await page.goto('/');
 await shelf.locator('.fr-home-watch-shelf__remove').click();
 await expect(shelf.locator('[data-home-watch-count]')).toHaveText('0');
 await expect(shelf.locator('[data-home-watch-items]')).toBeHidden();
});

test('Home editorial content stays inside its fixed frame with extra-long film metadata',async({page})=>{
 for(const width of [320,360,390,430,768,1440]){
  await page.setViewportSize({width,height:844});
  await page.goto('/');
  const feature=page.locator('.hub-feature');
  await expect(feature).toBeVisible();
  await feature.evaluate(tile=>{
   tile.querySelector('.hub-kicker').textContent='RECENT HORROR RELEASE · OFFICIAL FILM FILE WITH VERIFIED SCREENING SOURCES';
   tile.querySelector('h3').textContent='The Midnight Children Who Never Came Home from the Haunted House';
   tile.querySelector('p').textContent='An independent story about a very long chain of frightening events taking place inside an abandoned haunted family home with no safe way out. Nobody who enters returns to tell what happened.';
   let rating=tile.querySelector('.hub-feature__rating');
   if(!rating){
    rating=document.createElement('span');rating.className='hub-feature__rating';
    tile.querySelector('p').before(rating);
   }
   rating.textContent='TMDB 9.1/10';
   let trailer=tile.querySelector('.fr-trailer-button');
   if(!trailer){
    trailer=document.createElement('button');trailer.className='fr-trailer-button';
    tile.querySelector('.hub-tile__content').append(trailer);
   }
   trailer.hidden=false;
   trailer.textContent='▶ PLAY TRAILER';
  });
  const bounds=await feature.evaluate(tile=>{
   const rect=tile.getBoundingClientRect();
   const labels=[tile.querySelector('.hub-kicker'),tile.querySelector('h3'),
    tile.querySelector('.hub-feature__rating'),tile.querySelector('p'),
    tile.querySelector('.hub-tile__link'),tile.querySelector('.fr-trailer-button')];
   const items=labels.map(node=>{
    const r=node.getBoundingClientRect();
    return {text:(node.textContent||'').slice(0,35),top:r.top,bottom:r.bottom,left:r.left,right:r.right};
   });
   const c=tile.querySelector('.hub-tile__content').getBoundingClientRect();
   return {items,height:rect.height,top:rect.top,bottom:rect.bottom,left:rect.left,right:rect.right,
    contentBottom:c.bottom,contentTop:c.top,overflow:document.documentElement.scrollWidth-innerWidth};
  });
  expect(bounds.height).toBeGreaterThanOrEqual(width<=700?265:345);
  for(const item of bounds.items){
   expect(item.top, item.text+' top at '+width).toBeGreaterThanOrEqual(bounds.top+3);
   expect(item.bottom, item.text+' bottom at '+width).toBeLessThanOrEqual(bounds.bottom-3);
   expect(item.left, item.text+' left at '+width).toBeGreaterThanOrEqual(bounds.left+3);
   expect(item.right, item.text+' right at '+width).toBeLessThanOrEqual(bounds.right-3);
  }
  expect(bounds.contentTop).toBeGreaterThanOrEqual(bounds.top);
  expect(bounds.contentBottom).toBeLessThanOrEqual(bounds.bottom+1);
  expect(bounds.overflow).toBeLessThanOrEqual(2);
 }
});

test('Saved watchlist poster titles stay within their fixed tiles on 320 and 390 phones',async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('frightertainment-v5-watchlist',JSON.stringify([
   {tmdbId:1856631,title:'Insidious: Out of the Further and Beyond the Long Hallway',type:'movie',posterPath:'',year:2026},
   {tmdbId:1689001,title:'Resident Evil: Welcome to Raccoon City with an Extra Long Title',type:'movie',posterPath:'',year:2021}
  ]));
 });
 for(const width of [320,390]){
  await page.setViewportSize({width,height:844});
  await page.goto('/');
  const shelf=page.locator('#my-watchlist');
  await expect(shelf.locator('.fr-home-watch-shelf__movie')).toHaveCount(2);
  const state=await shelf.evaluate(root=>{
   const tiles=[...root.querySelectorAll('.fr-home-watch-shelf__item')];
   const results=tiles.map(tile=>{
    const movie=tile.querySelector('.fr-home-watch-shelf__movie');
    const title=tile.querySelector('.fr-home-watch-shelf__movie-title');
    const outer=tile.getBoundingClientRect();
    const text=title.getBoundingClientRect();
    const style=getComputedStyle(title);
    return {name:title.textContent,tileBottom:outer.bottom,titleBottom:text.bottom,
      tileHeight:outer.height,titleHeight:text.height,titleClamp:style.webkitLineClamp,
      link:movie.getAttribute('href'),label:movie.getAttribute('aria-label')};
   });
   return {results,overflow:document.documentElement.scrollWidth-innerWidth};
  });
  expect(state.overflow).toBeLessThanOrEqual(2);
  for(const result of state.results){
   expect(result.tileHeight).toBeGreaterThanOrEqual(145);
   expect(result.tileHeight).toBeLessThanOrEqual(200);
   expect(result.titleHeight).toBeLessThanOrEqual(43);
   expect(result.titleBottom).toBeLessThanOrEqual(result.tileBottom+1);
   expect(result.titleClamp).toBe('2');
   expect(result.label).toContain(result.name);
   expect(result.link).toMatch(/^\/media\.html\?type=movie&id=\d+$/);
  }
 }
});


test('cinematic surfaces are borderless but remain structured and keyboard navigable',async({page})=>{
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:900});
  for(const route of ['/', '/movies.html', '/tv-shows.html', '/cinema.html', '/indie-movies.html', '/podcasts.html', '/games.html']){
   await page.goto(route);
   await expect(page.locator('.hub-header')).toBeVisible();
   const selector=route==='/'?'.hub-feature':route==='/cinema.html'?'.fr-cinema-concept__features':'.editorial-pick';
   const feature=page.locator(selector);
   await expect(feature).toBeVisible();
   const geometry=await feature.evaluate(el=>{
    const rect=el.getBoundingClientRect();
    const css=getComputedStyle(el);
    return {width:rect.width,height:rect.height,
      borderTop:parseFloat(css.borderTopWidth),borderRight:parseFloat(css.borderRightWidth),
      borderBottom:parseFloat(css.borderBottomWidth),borderLeft:parseFloat(css.borderLeftWidth),
      shadow:css.boxShadow,
      viewportOverflow:document.documentElement.scrollWidth-innerWidth};
   });
   expect(geometry.height).toBeGreaterThan(125);
   expect(geometry.width).toBeGreaterThan(220);
   expect(geometry.borderTop).toBe(0);
   expect(geometry.borderRight).toBe(0);
   expect(geometry.borderBottom).toBe(0);
   expect(geometry.borderLeft).toBe(0);
   expect(geometry.shadow).not.toBe('none');
   expect(geometry.viewportOverflow).toBeLessThanOrEqual(2);
   if(route==='/'){
    const chart=page.locator('.hub-charts');
    await expect(chart).toBeVisible();
    const chartBorder=await chart.evaluate(el=>getComputedStyle(el).borderTopWidth);
    expect(chartBorder).toBe('0px');
    const tiles=await page.locator('.hub-showcase__bottom .hub-tile').evaluateAll(xs=>xs.map(x=>({
      border:getComputedStyle(x).borderTopWidth,
      art:getComputedStyle(x,'::before').backgroundImage
    })));
    expect(tiles).toHaveLength(5);
    expect(tiles.every(x=>x.border==='0px')).toBe(true);
    expect(tiles.every(x=>x.art.includes('assets/'))).toBe(true);
   }
  }
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
