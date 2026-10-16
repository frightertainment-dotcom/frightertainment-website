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
    // FrightNews must not replace, cover, or lock away the existing homepage.
    await expect(page.locator('#editorial-picks')).toBeVisible();
    await expect(page.locator('#home-showcase .hub-feature')).toBeVisible();
    await expect(page.locator('#home-showcase .hub-charts')).toBeVisible();
    await expect(page.locator('#home-showcase .hub-showcase__bottom .hub-tile')).toHaveCount(5);
    await expect(page.locator('#latest-horror')).toBeAttached();
    await expect(page.locator('#live-discovery')).toBeAttached();
    const layout = await rail.locator('.frightnews__row').first().evaluate(row => {
      const art = row.querySelector('.frightnews__thumb').getBoundingClientRect();
      const copy = row.querySelector('.frightnews__copy').getBoundingClientRect();
      return {artLeft:art.left,artRight:art.right,artWidth:art.width,copyLeft:copy.left,copyWidth:copy.width};
    });
    expect(layout.artWidth).toBeGreaterThanOrEqual(60);
    expect(layout.artWidth).toBeLessThanOrEqual(140);
    expect(layout.artRight).toBeLessThanOrEqual(layout.copyLeft + 2);
    expect(layout.copyWidth).toBeGreaterThan(75);
    const thumbnails = await rail.locator('.frightnews__thumb img').count();
    expect(thumbnails).toBe(40);
    await expect(rail.locator('.frightnews__thumb img').first()).toHaveAttribute('src',/\/assets\/(?:themes|worlds)\//);
    const scrollBehaviour = await rail.locator('[data-frightnews-viewport]').evaluate(node => getComputedStyle(node).overscrollBehaviorY);
    expect(scrollBehaviour).not.toBe('contain');
    await rail.locator('.frightnews__continue').click();
    await expect(page.locator('#editorial-picks')).toBeInViewport();
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
    await expect(page.locator('#home-showcase .hub-feature')).toBeVisible();
    await page.locator('.fr-v5-header-news-icon').click();
    await expect(page).toHaveURL(/\/frightnews\.html$/);
    await expect(page.locator('[data-frightnews="page"] .frightnews__row')).toHaveCount(40);
    await expect(page.locator('.frightnews__load-more')).toBeVisible();
    await page.locator('.frightnews__load-more').click();
    await expect(page.locator('[data-frightnews="page"] .frightnews__row')).toHaveCount(45);
    if(width<701) await expect(page.locator('.fr-v5-mobile-dock a')).toHaveCount(7);
  });
}

test('FrightNews stays useful when publisher RSS is down without inventing publish times', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.route('**/api/frightnews', route => route.fulfill({
    status:503,contentType:'application/json',
    body:JSON.stringify({status:'unavailable',items:[]})
  }));
  await page.goto('/');
  const rail = page.locator('[data-frightnews="home"]');
  await expect(rail.locator('.frightnews__row')).toHaveCount(40);
  await expect(rail.locator('[data-frightnews-state]')).toContainText('SOURCE-CHECKED');
  await expect(rail.locator('.frightnews__time').first()).toContainText('SOURCE CHECKED');
  await expect(rail.locator('.frightnews__thumb-img').first()).toHaveAttribute('src',/\/assets\/(?:themes|worlds)\//);
  await expect(page.locator('#editorial-picks')).toBeVisible();
  await expect(page.locator('#home-showcase .hub-charts')).toBeVisible();
  await rail.locator('.frightnews__continue').click();
  await expect(page.locator('#editorial-picks')).toBeInViewport();
});