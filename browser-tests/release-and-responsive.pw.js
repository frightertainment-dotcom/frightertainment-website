import {test,expect} from '@playwright/test';

const sizes=[
  {width:320,height:720},{width:390,height:844},
  {width:768,height:1024},{width:1440,height:900}
];
const sections=['/','/movies.html','/tv-shows.html','/cinema.html',
 '/indie-movies.html','/podcasts.html','/games.html'];

for(const viewport of sizes){
 test('seven-page navigation and responsive layout '+viewport.width,async({page})=>{
  await page.setViewportSize(viewport);
  for(const pathname of sections){
   await page.goto(pathname,{waitUntil:'domcontentloaded'});
   await expect(page.locator('nav.hub-tabs a')).toHaveCount(7);
   await expect(page.locator('main')).toHaveCount(1);
   await expect(page.locator('h1').first()).toBeAttached();
   await expect(page.locator('a.skip-link')).toBeAttached();
   await expect(page.locator('img[alt="Frightertainment"]').first()).toBeAttached();
   const dimensions=await page.evaluate(()=>({
     width:document.documentElement.scrollWidth,viewport:window.innerWidth
   }));
   expect(dimensions.width,pathname+' overflow at '+viewport.width+'px').toBeLessThanOrEqual(dimensions.viewport+3);
  }
 });
}

test('UK source diary populates, marks disputed dates, and preserves distinct venues',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/cinema.html',{waitUntil:'domcontentloaded'});
 const diary=page.locator('[data-cinema-concept-cards]');
 await expect(diary).toContainText('Clayface',{timeout:15000});
 await expect(diary).toContainText('DATE UNDER REVIEW');
 const list=page.locator('#upcoming-cinema [data-catalogue-list]');
 await expect(list).toContainText('Spoiling You',{timeout:15000});
 await expect(list).toContainText('Mr Whispers');
 await expect(list).toContainText('The Exorcist: Martyrs',{timeout:15000});
 await page.locator('#cinema-country').selectOption('US');
 await expect(list).toContainText('Werwulf',{timeout:15000});
});

test('homepage release brief shares vetted cinema dates and retains streaming announcements',async({page})=>{
 await page.goto('/',{waitUntil:'domcontentloaded'});
 const panel=page.locator('[data-release-brief]').first();
 await expect(panel.locator('button[data-mode="cinema"]')).toBeVisible({timeout:15000});
 await panel.locator('button[data-mode="cinema"]').click();
 await expect(panel).toContainText('Clayface',{timeout:15000});
 await expect(panel).toContainText('DATE CONFLICT');
 await panel.locator('button[data-mode="streaming"]').click();
 await expect(panel).toContainText('Shudder',{timeout:15000});
});

test('data files expose source-correct territory dates',async({request})=>{
 const [res,screenings]=await Promise.all([
   request.get('/data/editorial-releases.json'),request.get('/data/cinema-screenings.json')
 ]);
 expect(res.ok()).toBeTruthy(); expect(screenings.ok()).toBeTruthy();
 const [news,diary]=await Promise.all([res.json(),screenings.json()]);
 expect(news.items.find(x=>x.id==='cinema-resident-evil-2026').date).toBe('2026-09-18');
 expect(diary.territories.GB.screenings.find(x=>x.id==='clayface-2026-uk').dateConfidence).toBe('disputed');
 expect(diary.territories.GB.screenings.some(x=>x.title==='The Exorcist: Martyrs')).toBeTruthy();
});
