// Compare the two real production bundles on the same browser and viewport.
// Only API/analytics responses are isolated; CSS, fonts, images and JS are real.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

await mkdir('loading-evidence', { recursive:true });
const browser = await chromium.launch({ args:['--no-sandbox'] });
const results = [];
for (const width of [320,390,1440]) {
  const measurements = [];
  for (const [label,port] of [['before',4180],['after',4181]]) {
    const context = await browser.newContext({ viewport:{width,height:900}, reducedMotion:'reduce' });
    const page = await context.newPage();
    const failures = [], styles = [];
    page.on('pageerror', error => failures.push(error.message));
    page.on('request', request => { if(request.resourceType()==='stylesheet') styles.push(request.url()); });
    await page.route('**/api/**', route => route.fulfill({contentType:'application/json',body:JSON.stringify({status:'pending',items:[],year:2026,rankedFilms:0})}));
    await page.route('https://static.cloudflareinsights.com/**', route => route.abort());
    await page.goto(`http://127.0.0.1:${port}/`, {waitUntil:'networkidle'});
    await page.evaluate(() => document.fonts.ready);
    const layout = await page.evaluate(() => ({
      width:innerWidth, scrollWidth:document.documentElement.scrollWidth,
      elements:[...document.querySelectorAll('.hub-header,.fr-home-intro,.fr-home-intro h1,.fr-home-intro__motto,.fr-home-intro__copy>p,.fr-home-intro__actions,.frightnews__heading')].map(el => {
        const box=el.getBoundingClientRect(),css=getComputedStyle(el);
        return {text:el.textContent.trim(),x:box.x,y:box.y,width:box.width,height:box.height,font:css.font,fontFamily:css.fontFamily,color:css.color};
      }),
      brokenImages:[...document.images].filter(img=>{
        const box=img.getBoundingClientRect();
        return box.width>0&&box.height>0&&box.bottom>0&&box.top<900&&!img.hidden&&(!img.complete||!img.naturalWidth);
      }).map(img=>img.src),
      fonts:[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family+'|'+f.style+'|'+f.weight).sort()
    }));
    await page.screenshot({path:`loading-evidence/${label}-${width}.png`});
    await writeFile(`loading-evidence/${label}-${width}.json`,JSON.stringify({layout,styles},null,2));
    assert.ok(layout.scrollWidth<=width+2, label+' horizontal overflow at '+width);
    assert.deepEqual(failures,[],label+' JavaScript errors');
    assert.deepEqual(layout.brokenImages,[],label+' broken visible images');
    if(label==='after') {
      assert.equal(styles.length,2,'Only two local blocking stylesheets');
      assert.ok(styles.every(url=>url.startsWith('http://127.0.0.1:4181/')));
      assert.ok(layout.fonts.some(font=>font.startsWith('DM Sans|')),'Approved font actually loaded');
    }
    measurements.push({label,layout,styles});
    await context.close();
  }
  assert.deepEqual(measurements[1].layout,measurements[0].layout,'Approved typography and first-fold geometry changed at '+width);
  results.push({width,measurements});
}
await browser.close();
await writeFile('loading-evidence/geometry.json',JSON.stringify(results,null,2));
console.log('Production typography, first-fold geometry, images and JS verified at 320, 390 and 1440px.');
