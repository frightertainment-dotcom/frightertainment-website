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
    await expect(page.locator('link[href="/fr-premium.css"]')).toHaveCount(1);
    await expect(page.locator('script[src="/fr-ambient.js"]')).toHaveCount(1);
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
  const expected = ['The Devils', 'Clayface', 'Godzilla Minus Zero', 'Victorian Psycho'];
  await expect(page.locator('.fr-cinema-concept__title')).toHaveText(expected);
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
    })));
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
  await expect(page.locator('.fr-atmosphere')).toHaveAttribute('aria-hidden','true');
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
