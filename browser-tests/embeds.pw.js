import { navigateLegacy,openCompleteDiscovery } from './helpers/open-full-discovery.mjs';
import { test, expect } from '@playwright/test';

for (const {path, provider, minimum, host} of [
  {path:'/podcasts.html',provider:'apple',minimum:3,host:'embed.podcasts.apple.com'},
  {path:'/games.html',provider:'steam',minimum:7,host:'store.steampowered.com/widget/'}
]) {
  test(`external ${provider} embeds need a deliberate visitor click at ${path}`,async ({page}) => {
    const loaded=[];
    page.on('request',request=>{if(request.url().includes(host))loaded.push(request.url());});
    await page.route('**/'+host+'**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><body>Third-party player fixture</body></html>'}));
    await navigateLegacy(page,path,{waitUntil:'domcontentloaded'});
    const gates=page.locator('.fr-player-gate--'+provider);
    expect(await gates.count()).toBeGreaterThanOrEqual(minimum);
    await expect(page.locator('.fr-player-gate iframe')).toHaveCount(0);
    await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
    await page.waitForTimeout(150);
    expect(loaded).toHaveLength(0);
    await expect(gates.first().locator('a[href="/privacy.html"]')).toBeVisible();
    await gates.first().locator('button').click();
    await expect(gates.first().locator('iframe')).toHaveCount(1);
    const source=await gates.first().locator('iframe').getAttribute('src');
    expect(source).toContain(host);
    await expect.poll(()=>loaded.length).toBeGreaterThanOrEqual(1);
    await expect(page.locator('.fr-player-gate iframe')).toHaveCount(1);
    await expect(gates.nth(1).locator('iframe')).toHaveCount(0);
  });
}

test('visitor-activated media placeholders remain readable without sideways scrolling',async({browser})=>{
  for (const [path,provider] of [['/podcasts.html','apple'],['/games.html','steam']]) {
    const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
    await navigateLegacy(page,path,{waitUntil:'domcontentloaded'});
    const gate=page.locator('.fr-player-gate--'+provider).first();
    for (const width of [320,375,390,768,1440]) {
      await page.setViewportSize({width,height:844});
      await expect(gate.locator('button')).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),`${path} overflow at ${width}`).toBe(true);
    }
    await page.close();
  }
});


test('privacy notice is usable at phone and desktop sizes', async ({browser}) => {
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await navigateLegacy(page,'/privacy.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('h1')).toContainText('PRIVACY');
  await expect(page.locator('a[href="/contact.html"]').first()).toBeVisible();
  for(const width of [320,375,390,768,1440]){
    await page.setViewportSize({width,height:844});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),'Privacy page overflow at '+width).toBe(true);
  }
  await page.close();
});
