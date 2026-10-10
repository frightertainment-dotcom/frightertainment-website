import {test,expect} from '@playwright/test';
const film = {tmdbId:123,mediaType:'movie',title:'Independent Nightmare',posterPath:'/nightmare.jpg',overview:'A verified horror synopsis.',releaseDate:'2026-01-02',releaseLabel:'First release',voteAverage:7.8,voteCount:120,trailer:{key:'abcdefghijk',name:'Official trailer'}};
const series = {...film,tmdbId:456,mediaType:'tv',title:'Haunted Series'};
test('indie charts and paged archive use TMDB metadata and year changes',async({page})=>{
 await page.route('**/api/catalogue?**',route=>{const query=new URL(route.request().url()).searchParams;route.fulfill({json:{items:[film],page:Number(query.get('page')),totalPages:query.get('mode')==='archive'?2:1,totalResults:2,status:'ready'}});});
 await page.goto('/indie-movies.html');
 await expect(page.locator('#chart .fr-media-card')).toHaveCount(1);
 await expect(page.locator('#chart')).toContainText('7.8');
 await expect(page.locator('#chart img')).toHaveAttribute('src','https://image.tmdb.org/t/p/w500/nightmare.jpg');
 await expect(page.locator('#chart [data-trailer-video]')).toHaveAttribute('data-trailer-video','abcdefghijk');
 const changed=page.waitForRequest(req=>req.url().includes('/api/catalogue?')&&req.url().includes('year=2025')&&req.url().includes('mode=chart'));
 await page.locator('#chart select').selectOption('2025');await changed;
 await expect(page.locator('#chart .fr-catalogue-status')).toContainText('2025');
 await page.locator('#archive button').filter({hasText:'NEXT'}).click();
 await expect(page.locator('#archive .fr-catalogue-pagination')).toContainText('Page 2 of 2');
});
test('TV sections and internal detail render series metadata without Fright Rating',async({page})=>{
 await page.route('**/api/catalogue?**',route=>route.fulfill({json:{items:[series],page:1,totalPages:1,status:'ready'}}));
 await page.route('**/api/media?**',route=>route.fulfill({json:{item:series,status:'ready'}}));
 await page.goto('/tv-shows.html');
 for(const section of ['chart','trending','upcoming','archive'])await expect(page.locator('#'+section+' .fr-media-card')).toHaveCount(1);
 await page.locator('#chart h3 a').click();
 await expect(page.locator('#media-detail h1')).toHaveText('Haunted Series');
 await expect(page.locator('#media-detail img')).toHaveAttribute('src','https://image.tmdb.org/t/p/w500/nightmare.jpg');
 await expect(page.locator('#media-detail')).toContainText('120 viewer votes');
 await expect(page.locator('#media-detail')).not.toContainText('FRIGHT RATING');
});

test('archive film hydrates poster, viewer score, release date and trailer dialog',async({page})=>{
 const tinyPng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Yk4zh8AAAAASUVORK5CYII=','base64');
 await page.route('**/image.tmdb.org/**',route=>route.fulfill({contentType:'image/png',body:tinyPng}));
 await page.route('**/api/media?**',route=>route.fulfill({json:{item:{...film,tmdbId:3021,title:'1408',releaseDate:'2007-06-22',releaseCountry:'GB'},status:'ready'}}));
 await page.goto('/archive-film.html?id=Q203560');
 await expect(page.locator('.archive-detail__title')).toHaveText('1408');
 await expect(page.locator('.archive-detail__poster')).toBeVisible();
 await expect(page.locator('.archive-detail__poster')).toHaveAttribute('src','https://image.tmdb.org/t/p/w500/nightmare.jpg');
 await expect(page.locator('.archive-detail__rating')).toContainText('7.8/10');
 await expect(page.locator('.archive-detail__release')).toContainText('22 Jun 2007');
 await expect(page.locator('.archive-detail__release')).toContainText('UK release');
 await page.screenshot({path:'test-results/catalogue-review/archive-detail-desktop.png',fullPage:true});
 await page.setViewportSize({width:375,height:812});
 await page.screenshot({path:'test-results/catalogue-review/archive-detail-mobile.png',fullPage:true});
 await page.locator('.archive-detail__media [data-trailer-video]').click();
 const dialog=page.locator('.trailer-dialog');
 await expect(dialog).toBeVisible();
 await expect(dialog.locator('iframe')).toHaveAttribute('src',/youtube-nocookie\.com\/embed\/abcdefghijk/);
 await page.keyboard.press('Escape');
 await expect(dialog).toBeHidden();
 await expect(dialog.locator('iframe')).not.toHaveAttribute('src',/.+/);
});

test('375px catalogue layouts keep posters, readable long titles and all features',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 const long={...film,title:'The Extraordinary Haunting of the Forgotten House in the Woods'};
 await page.route('**/api/catalogue?**',route=>route.fulfill({json:{items:[long,{...film,tmdbId:124}],page:1,totalPages:2,status:'ready'}}));
 await page.route('**/api/media?**',route=>route.fulfill({json:{item:long,status:'ready'}}));
 for(const route of ['/indie-movies.html','/tv-shows.html']){
  await page.goto(route);
  await expect(page.locator('#chart .fr-media-card')).toHaveCount(2);
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const section of ['chart','trending','upcoming','archive'])await expect(page.locator('#'+section+' h2')).toBeVisible();
  const title=page.locator('#chart .fr-media-card h3').first();
  const metrics=await title.evaluate(el=>({font:parseFloat(getComputedStyle(el).fontSize),scroll:el.scrollWidth,client:el.clientWidth}));
  expect(metrics.font).toBeGreaterThanOrEqual(16);
  expect(metrics.scroll).toBeLessThanOrEqual(metrics.client+1);
  await expect(page.locator('#archive form')).toBeVisible();
  await expect(page.locator('#archive .fr-catalogue-pagination')).toContainText('NEXT');
  const name=route.includes('indie')?'indie':'tv';
  await page.screenshot({path:`test-results/catalogue-review/${name}-mobile-first.png`});
  await page.screenshot({path:`test-results/catalogue-review/${name}-mobile-full.png`,fullPage:true});
 }
});

test('indie chart continues past studio-heavy pages, deduplicates and stops at 20',async({page})=>{
 const candidates=Array.from({length:20},(_,index)=>({...film,tmdbId:index+1,title:'Independent Film '+(index+1),voteAverage:9-index/10}));
 const requested=[];
 await page.route('**/api/catalogue?**',route=>{
  const query=new URL(route.request().url()).searchParams;
  const chart=query.get('mode')==='chart';
  const number=Number(query.get('page'));
  if(chart)requested.push(number);
  return route.fulfill({json:{items:chart?(number===1?candidates.slice(0,4):[candidates[0],...candidates.slice(4)]):[],page:number,nextPage:chart?(number===1?3:5):null,totalPages:5,status:'ready'}});
 });
 await page.goto('/indie-movies.html');
 await expect(page.locator('#chart .fr-media-card')).toHaveCount(20);
 expect(requested).toEqual([1,3]);
 await expect(page.locator('#chart h3').first()).toHaveText('Independent Film 1');
 await expect(page.locator('#chart .fr-catalogue-status')).toContainText('20 films');
});
