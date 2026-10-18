import { test, expect } from '@playwright/test';

/* Owner-rejected layouts used to pass tests that only checked file existence.
 * These checks exercise actual rendered text, source-linked data, pointer-safe
 * visual enhancement, and both small phone and desktop geometry.
 * A screenshot is evidence to review, never a claim of aesthetic approval. */

const rooms = [
  ['/movies.html', 'movies'], ['/tv-shows.html', 'tv'],
  ['/cinema.html', 'cinema'], ['/indie-movies.html', 'indie'],
  ['/podcasts.html', 'podcasts'], ['/games.html', 'games']
];

test('AFTER DARK CSS and site-owned brand remain present on every destination', async ({ page }) => {
  for (const [path, theme] of [['/', 'home'], ...rooms]) {
    await page.setViewportSize({width:1440,height:900});
    await page.goto(path);
    await expect(page.locator('body')).toHaveAttribute('data-theme', theme);
    await expect(page.locator('link[href^="/fr-premium.css"]')).toHaveCount(1);
    await expect(page.locator('script[src^="/fr-ambient.js"]')).toHaveCount(1);
    await expect(page.locator('.hub-header .hub-brand img')).toHaveAttribute('src', '/assets/frightertainment-brand.png');
    await expect(page.locator('.hub-header .hub-brand img')).toBeVisible();
    const themed = await page.evaluate(() => {
      const body = getComputedStyle(document.body);
      return {
        heading: body.getPropertyValue('--premium-heading').trim(),
        ui: body.getPropertyValue('--premium-ui').trim(),
        siteWidth: document.documentElement.scrollWidth,
        viewport: innerWidth
      };
    });
    expect(themed.heading, path).toContain('Cormorant');
    expect(themed.ui, path).toContain('DM Sans');
    expect(themed.siteWidth, path).toBeLessThanOrEqual(themed.viewport + 2);
  }
});

test('Cinema release marquee stays country-specific, source-linked and legible at 320–1440px', async ({ page }) => {
  await page.goto('/cinema.html');
  await page.locator('#cinema-country').selectOption('US');
  await expect(page.locator('.fr-cinema-concept__card')).toHaveCount(4);
  // As today's date passes a confirmed screening, it must disappear from
  // upcoming releases; the marquee should use four *current* sourced titles.
  const currentTitles = await page.locator('.fr-cinema-concept__title').allTextContents();
  expect(currentTitles).toHaveLength(4);
  expect(new Set(currentTitles).size).toBe(4);
  expect(currentTitles.every(title => title.trim().length > 0)).toBe(true);
  for (const width of [320, 375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({width,height:900});
    const checks = await page.locator('.fr-cinema-concept__card').evaluateAll(elements => ({
      windowWidth:innerWidth,
      scrollWidth:document.documentElement.scrollWidth,
      cards:elements.map(el => {
        const title=el.querySelector('.fr-cinema-concept__title');
        const date=el.querySelector('.fr-cinema-concept__date');
        const source=el.querySelector('.fr-cinema-concept__source');
        const container=el.getBoundingClientRect();
        const t=title.getBoundingClientRect(),d=date.getBoundingClientRect();
        return {
          title:title.textContent, date:date.dateTime, source:source?.href,
          titleAndDateSeparated:t.right<=d.left+2 || t.bottom<=d.top+2,
          dateInside:d.right<=container.right+1,
          titleInside:t.left>=container.left-1,
          height:container.height
        };
      })
    }));
    expect(checks.scrollWidth, String(width)).toBeLessThanOrEqual(checks.windowWidth+2);
    for (const card of checks.cards) {
      expect(card.titleAndDateSeparated, String(width)+' '+card.title).toBeTruthy();
      expect(card.dateInside, String(width)+' '+card.title).toBeTruthy();
      expect(card.titleInside, String(width)+' '+card.title).toBeTruthy();
      expect(card.height, String(width)+' '+card.title).toBeGreaterThanOrEqual(55);
      expect(card.source, String(width)+' '+card.title).toMatch(/^https:\/\//);
      expect(card.date, String(width)+' '+card.title).toMatch(/^2026-/);
    }
  }
  await page.locator('#cinema-country').selectOption('GB');
  await expect(page.locator('[data-cinema-concept-country]')).toHaveText('UNITED KINGDOM');
  await expect(page.locator('.fr-cinema-concept__card').first().locator('.fr-cinema-concept__title')).toContainText('Clayface');
});

test('Editorial synopsis uses the available reading space, not two-line clipping', async ({ page }) => {
  for (const [path] of [['/movies.html'], ['/tv-shows.html'], ['/indie-movies.html'], ['/podcasts.html'], ['/games.html']]) {
    await page.goto(path);
    await expect(page.locator('.editorial-pick__synopsis')).toBeVisible();
    for (const width of [320,390,768,1440]) {
      await page.setViewportSize({width,height:900});
      const geometry = await page.locator('.editorial-pick__synopsis').evaluate(el => ({
        textLength:el.textContent.trim().length,
        textClient:el.clientHeight, textScroll:el.scrollHeight,
        overflow:getComputedStyle(el).overflow,
        lineClamp:getComputedStyle(el).webkitLineClamp,
        titleScroll:document.documentElement.scrollWidth,
        viewport:innerWidth
      }));
      expect(geometry.textLength, path).toBeGreaterThan(45);
      expect(geometry.textScroll, path+' '+width).toBeLessThanOrEqual(geometry.textClient+2);
      expect(geometry.lineClamp, path+' '+width).toMatch(/^(none|unset)$/);
      expect(geometry.titleScroll, path+' '+width).toBeLessThanOrEqual(geometry.viewport+2);
    }
  }
});

test('Ambient enhancement is decorative, pausable and respects reduced-motion settings', async ({ page }) => {
  await page.goto('/cinema.html');
  await expect(page.locator('.hub-page-intro>.fr-atmosphere')).toHaveCount(1);
  await expect(page.locator('.fr-atmosphere').first()).toHaveAttribute('aria-hidden','true');
  const toggle = page.locator('.fr-motion-toggle');
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(page.locator('body')).toHaveClass(/fr-motion-paused/);
  await expect(toggle).toHaveAttribute('aria-pressed','true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed','false');
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.locator('body')).toHaveClass(/fr-motion-paused/);
  await expect(toggle).toBeHidden();
  await expect(page.locator('.fr-cinema-concept__card')).not.toHaveCount(0);
});

test('Desktop Movies fills the space beside its chart with useful routes', async ({ page }) => {
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/movies.html');
  await expect(page.locator('.fr-v5-spotlight-row>.editorial-carousel')).toBeVisible();
  await expect(page.locator('.fr-v5-spotlight-row>.fr-v5-ranking')).toBeVisible();
  await expect(page.locator('.fr-v5-spotlight-row>.fr-v5-explore')).toBeVisible();
  const positions = await page.evaluate(() => {
    const find = selector=>document.querySelector(selector).getBoundingClientRect();
    return {editorial:find('.fr-v5-spotlight-row>.editorial-carousel'),
      links:find('.fr-v5-spotlight-row>.fr-v5-explore'),
      chart:find('.fr-v5-spotlight-row>.fr-v5-ranking')};
  });
  expect(positions.links.top).toBeGreaterThanOrEqual(positions.editorial.bottom-5);
  expect(positions.chart.left).toBeGreaterThan(positions.editorial.right-5);
  expect(positions.chart.top).toBeLessThanOrEqual(positions.links.top);
  expect(positions.links.width).toBeGreaterThan(300);
});

test('Capture premium-design visual evidence for human review, not pixel auto-approval', async ({ page }) => {
  for (const [path,label] of [['/','home'],['/movies.html','movies'],['/tv-shows.html','tv'],['/cinema.html','cinema']]) {
    for (const width of [390,1440]) {
      await page.setViewportSize({width,height:950});
      await page.goto(path);
      await page.screenshot({path:`test-results/premium-redesign/${label}-${width}.png`,fullPage:true,animations:'disabled'});
    }
  }
});


test('Cinema prioritises real coming-attractions rows above the desktop fold', async ({ page }) => {
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/cinema.html');
  await expect(page.locator('.fr-cinema-concept__card').first()).toBeVisible();
  const visual = await page.evaluate(() => {
    const intro=document.querySelector('.hub-page-intro').getBoundingClientRect();
    const first=document.querySelector('.fr-cinema-concept__card').getBoundingClientRect();
    const board=document.querySelector('.fr-cinema-concept__features').getBoundingClientRect();
    return {introHeight:intro.height,boardTop:board.top,firstTop:first.top,
      firstHeight:first.height,windowHeight:innerHeight,
      horizontalOverflow:document.documentElement.scrollWidth-innerWidth};
  });
  expect(visual.introHeight).toBeLessThan(405);
  expect(visual.boardTop).toBeLessThan(500);
  expect(visual.firstTop).toBeLessThan(790);
  expect(visual.firstHeight).toBeGreaterThan(62);
  expect(visual.horizontalOverflow).toBeLessThanOrEqual(2);
});

test('Mobile editorial story and art occupy a deliberate readable composition', async ({ page }) => {
  await page.setViewportSize({width:390,height:900});
  for (const route of ['/movies.html','/tv-shows.html','/indie-movies.html','/podcasts.html']) {
    await page.goto(route);
    await expect(page.locator('.editorial-pick__synopsis')).toBeVisible();
    const layout = await page.evaluate(() => {
      const bounds=selector=>document.querySelector(selector).getBoundingClientRect();
      const host=document.querySelector('.editorial-pick');
      const grid=getComputedStyle(host).gridTemplateColumns.split(' ').filter(Boolean).length;
      return {grid,poster:bounds('.editorial-pick__art-frame'),
        content:bounds('.editorial-pick__content'),
        synopsis:bounds('.editorial-pick__synopsis'),
        article:host.getBoundingClientRect(),
        viewport:innerWidth,overflow:document.documentElement.scrollWidth};
    });
    const typeFirst = route === '/tv-shows.html' || route === '/indie-movies.html';
    expect(layout.grid, route).toBe(typeFirst ? 1 : 2);
    expect(layout.poster.width, route).toBeGreaterThan(115);
    if (typeFirst) {
      expect(layout.content.bottom, route).toBeLessThanOrEqual(layout.poster.top + 2);
      expect(layout.synopsis.top, route).toBeLessThan(550);
    } else {
      expect(layout.content.top, route).toBeLessThan(layout.poster.bottom);
      expect(layout.synopsis.top, route).toBeLessThan(layout.poster.bottom + 55);
    }
    expect(layout.synopsis.right, route).toBeLessThanOrEqual(layout.article.right + 1);
    expect(layout.overflow, route).toBeLessThanOrEqual(layout.viewport + 2);
  }
});


test('An offline catalogue keeps real Frightertainment editorial discovery visible', async ({ page }) => {
  await page.route('**/api/catalogue?**', route => route.fulfill({status:503,body:'Unavailable'}));
  for (const [path,sourceType] of [
    ['/movies.html','local'],
    ['/tv-shows.html','remote'],
    ['/indie-movies.html','mixed']
  ]) {
    for (const width of [390,1440]) {
      await page.setViewportSize({width,height:900});
      await page.goto(path);
      const shelf = page.locator('.fr-v5-rack');
      const curated = shelf.locator('.fr-v5-curated-card');
      await expect(curated).toHaveCount(6);
      await expect(shelf.locator('.fr-v5-empty')).toContainText('Live catalogue');
      const links = await curated.evaluateAll(nodes => nodes.map(node => ({
        href:node.getAttribute('href'),
        title:node.querySelector('.fr-v5-curated-card__title')?.textContent,
        excerpt:node.querySelector('.fr-v5-curated-card__synopsis')?.textContent,
        score:!!node.querySelector('.fr-rating-badge'),
        scrollWidth:node.scrollWidth,
        clientWidth:node.clientWidth
      })));
      for (const link of links) {
        expect(link.title?.length,path).toBeGreaterThan(2);
        expect(link.excerpt?.length,path).toBeGreaterThan(22);
        expect(link.score,path+' has no invented audience score').toBe(false);
        expect(link.scrollWidth,path+' tile overflow').toBeLessThanOrEqual(link.clientWidth+1);
        expect(link.href,path).toMatch(/^(https:\/\/|\/films\/)/);
      }
      if (sourceType === 'local') expect(links.every(x=>x.href.startsWith('/films/'))).toBe(true);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
      if (sourceType!=='local') {
        await expect(page.locator('.fr-v5-announced, .fr-v5-trailer')).toHaveCount(0);
      }
    }
  }
});

test('Cinema diary retains genuine territory-verified releases when live feed fails', async ({ page }) => {
  await page.route('**/api/catalogue?**', route => route.fulfill({status:503,body:'Unavailable'}));
  await page.setViewportSize({width:390,height:844});
  await page.goto('/cinema.html');
  const section=page.locator('#upcoming-cinema');
  await expect(section.locator('.fr-cinema-diary__item--verified').first()).toBeVisible();
  await expect(section.locator('.fr-catalogue-status')).toContainText('source-checked upcoming cinema dates');
  await expect(section.locator('.fr-catalogue-status')).toContainText('Live catalogue temporarily unavailable');
  const firstSource=section.locator('.fr-cinema-diary__source').first();
  await expect(firstSource).toHaveAttribute('href',/^https:\/\//);
  await page.locator('#cinema-country').selectOption('US');
  await expect(section.locator('.fr-catalogue-status')).toContainText('UNITED STATES');
  await expect(section.locator('.fr-cinema-diary__item--verified').first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
});
