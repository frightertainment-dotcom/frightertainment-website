import { test, expect } from '@playwright/test';

const stamp = new Date('2026-10-16T08:30:00.000Z').toISOString();
const articles = Array.from({ length:45 }, (_,i) => ({
  title:'Horror update headline ' + String(i+1),
  excerpt:'Confirmed horror release coverage from the original publisher.',
  category:i%5===0?'TV NEWS':'MOVIE NEWS',
  source:'Example Source',
  publishedAt:stamp,
  url:'https://bloody-disgusting.com/article/' + String(i+1) + '/'
}));
async function stubNews(page) {
  await page.route('**/api/frightnews', route => route.fulfill({
    status:200,
    contentType:'application/json',
    body:JSON.stringify({status:'ok',updatedAt:stamp,total:45,items:articles})
  }));
}
for (const width of [320,390,1280]) {
  test('FrightNews preserves a ten-row scroll viewport at ' + width + 'px', async ({page}) => {
    await page.setViewportSize({width,height:850});
    await stubNews(page);
    await page.goto('/');
    const rail = page.locator('[data-frightnews="home"]');
    await expect(rail.locator('.frightnews__row')).toHaveCount(40);
    await expect(page.locator('.fr-v5-header-news-icon')).toBeVisible();
    const metrics = await rail.locator('[data-frightnews-viewport]').evaluate(viewport => ({
      clientHeight:viewport.clientHeight,scrollHeight:viewport.scrollHeight,
      rowHeight:viewport.querySelector('.frightnews__row')?.getBoundingClientRect().height || 0,
      boxWidth:viewport.getBoundingClientRect().width
    }));
    expect(Math.abs(metrics.clientHeight - metrics.rowHeight*10)).toBeLessThanOrEqual(3);
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
    expect(metrics.boxWidth).toBeLessThanOrEqual(width);
    await rail.locator('[data-frightnews-viewport]').evaluate(node => node.scrollTop = node.scrollHeight);
    await expect(rail.locator('a.frightnews__all-link')).toBeVisible();
    await page.locator('.fr-v5-header-news-icon').click();
    await expect(page).toHaveURL(/\/frightnews\.html$/);
    await expect(page.locator('[data-frightnews="page"] .frightnews__row')).toHaveCount(40);
    await expect(page.locator('.frightnews__load-more')).toBeVisible();
    await page.locator('.frightnews__load-more').click();
    await expect(page.locator('[data-frightnews="page"] .frightnews__row')).toHaveCount(45);
    if(width<701) await expect(page.locator('.fr-v5-mobile-dock a')).toHaveCount(7);
  });
}