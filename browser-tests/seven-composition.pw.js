import { test, expect } from '@playwright/test';

test('Movies masthead keeps its wordmark, eyebrow and final route visible at 320 and 980 pixels', async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  for (const width of [320, 980]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto('/movies.html');
    await expect(page.locator('.hub-page-wordmark')).toBeVisible();
    const measure = () => page.evaluate(() => {
      const intro = document.querySelector('.hub-page-intro').getBoundingClientRect();
      const header = document.querySelector('.hub-header').getBoundingClientRect();
      const targets = [document.querySelector('.hub-page-intro .hub-eyebrow'),
        document.querySelector('.hub-page-wordmark'),
        ...document.querySelectorAll('.hub-page-intro .hub-section-jumps a')];
      return { intro, header, children: targets.map(node => node.getBoundingClientRect()),
        scrollWidth: document.documentElement.scrollWidth, viewport: innerWidth };
    });
    for (const state of [await measure(), await (async () => { await page.waitForTimeout(1100); return measure(); })()]) {
      expect(state.intro.top).toBeGreaterThanOrEqual(state.header.bottom - 1);
      expect(state.children.length).toBeGreaterThan(3);
      for (const child of state.children) {
        expect(child.left).toBeGreaterThanOrEqual(state.intro.left - 1);
        expect(child.right).toBeLessThanOrEqual(state.intro.right + 1);
        expect(child.top).toBeGreaterThanOrEqual(state.intro.top - 1);
        expect(child.bottom).toBeLessThanOrEqual(state.intro.bottom + 1);
      }
      expect(state.scrollWidth).toBeLessThanOrEqual(state.viewport + 2);
    }
  }
});

test('Indie synopsis and portrait, and Podcasts synopsis and square cover, fit at intermediate widths', async ({ page }) => {
  for (const [route, shape] of [['/indie-movies.html', 1.5], ['/podcasts.html', 1]]) {
    for (const width of [768, 980]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);
      await expect(page.locator('.editorial-pick__synopsis')).toBeVisible();
      const result = await page.evaluate(() => {
        const host = document.querySelector('.editorial-pick').getBoundingClientRect();
        const art = document.querySelector('.editorial-pick__art-frame').getBoundingClientRect();
        const synopsis = document.querySelector('.editorial-pick__synopsis');
        const links = document.querySelector('.editorial-pick__links').getBoundingClientRect();
        return { host, art, synopsisHeight: synopsis.clientHeight,
          synopsisLine: parseFloat(getComputedStyle(synopsis).lineHeight), links,
          scrollWidth: document.documentElement.scrollWidth, viewport: innerWidth };
      });
      expect(result.synopsisHeight).toBeGreaterThanOrEqual(result.synopsisLine - 1);
      expect(result.art.height / result.art.width).toBeGreaterThan(shape - .08);
      expect(result.art.height / result.art.width).toBeLessThan(shape + .08);
      expect(result.art.bottom).toBeLessThanOrEqual(result.host.bottom + 1);
      expect(result.links.bottom).toBeLessThanOrEqual(result.host.bottom + 1);
      expect(result.links.left).toBeGreaterThanOrEqual(result.host.left - 1);
      expect(result.scrollWidth).toBeLessThanOrEqual(result.viewport + 2);
    }
  }
});

test('Five TMDB fixture rankings form one readable Home group without an inner scroller', async ({ page }) => {
  const items = Array.from({ length: 5 }, (_, i) => ({ filmId: `tmdb-${1700001 + i}`,
    tmdbId: 1700001 + i, title: `An Extended Horror Film Title ${i + 1}`,
    position: i + 1, averageScore: 86 - i * 2, voteCount: 80 + i * 30 }));
  await page.route('**/api/rankings?year=*', route => route.fulfill({ json: {
    status: 'ranked', ratingKind: 'tmdb-community', items,
    updatedAt: '2026-10-12T09:00:00Z' } }));
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.locator('#hub-ranking .hub-chart-row')).toHaveCount(5);
    const state = await page.evaluate(() => {
      const chart = document.querySelector('.hub-charts').getBoundingClientRect();
      const list = document.querySelector('#hub-ranking');
      const rows = [...list.querySelectorAll('.hub-chart-row')].map(node => node.getBoundingClientRect());
      const link = document.querySelector('.hub-charts__all').getBoundingClientRect();
      return { chart, rows, link, scrollHeight: list.scrollHeight, clientHeight: list.clientHeight,
        scrollWidth: document.documentElement.scrollWidth, viewport: innerWidth };
    });
    expect(state.scrollHeight).toBeLessThanOrEqual(state.clientHeight + 1);
    for (let i = 1; i < state.rows.length; i++) expect(state.rows[i].top).toBeGreaterThanOrEqual(state.rows[i - 1].bottom - 1);
    expect(state.link.top).toBeGreaterThanOrEqual(state.rows.at(-1).bottom - 1);
    expect(state.link.bottom).toBeLessThanOrEqual(state.chart.bottom + 1);
    expect(state.scrollWidth).toBeLessThanOrEqual(state.viewport + 2);
  }
});

test('Game fallback artwork keeps its title clear of the credit at mobile and desktop widths', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [320, 390, 768, 980, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/games.html');
    const dots = page.locator('.editorial-carousel__dot');
    await expect(dots).toHaveCount(5);
    for (let index = 0; index < 5; index++) {
      const dot = dots.nth(index);
      await dot.click();
      const title = await page.locator('.editorial-pick__art-title').first().textContent();
      expect(await dot.getAttribute('aria-label')).toContain(title);
      const state = await page.locator('.editorial-pick__art-frame').first().evaluate(frame => {
        const artTitle = frame.querySelector('.editorial-pick__art-title');
        const credit = frame.querySelector('.editorial-pick__art-sub');
        return { frame: frame.getBoundingClientRect(), title: artTitle.getBoundingClientRect(),
          credit: credit.getBoundingClientRect(), lineHeight: parseFloat(getComputedStyle(artTitle).lineHeight) };
      });
      expect(state.title.height).toBeGreaterThanOrEqual(state.lineHeight - 1);
      expect(state.title.top).toBeGreaterThanOrEqual(state.frame.top);
      expect(state.title.bottom).toBeLessThanOrEqual(state.credit.top);
      expect(state.credit.bottom).toBeLessThanOrEqual(state.frame.bottom);
    }
  }
});

test('Unavailable film and series shelves use compact full-width messages', async ({ page }) => {
  await page.route('**/api/catalogue?**', route => route.fulfill({ status: 503, body: 'Unavailable' }));
  for (const route of ['/movies.html', '/tv-shows.html', '/indie-movies.html']) {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);
      const shelf = page.locator('.fr-v5-poster-grid').first();
      const message = shelf.locator('.fr-v5-empty').first();
      await expect(message).toBeVisible();
      const state = await shelf.evaluate(node => ({
        parent: node.getBoundingClientRect(), child: node.querySelector('.fr-v5-empty').getBoundingClientRect()
      }));
      expect(state.child.width).toBeGreaterThan(state.parent.width * .8);
      expect(state.parent.height).toBeLessThan(120);
    }
  }
});

test('Home lower discovery summaries keep their text and action in separate tracks', async ({ page }) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    for (const selector of ['.fr-home-updates > summary', '.home-discovery-wrap__summary']) {
      const state = await page.locator(selector).evaluate(summary => {
        const [copy, action] = summary.children;
        return { summary: summary.getBoundingClientRect(), copy: copy.getBoundingClientRect(),
          action: action.getBoundingClientRect() };
      });
      if (width <= 380) expect(state.copy.bottom).toBeLessThanOrEqual(state.action.top + 1);
      else expect(state.copy.right).toBeLessThanOrEqual(state.action.left + 1);
      expect(state.action.right).toBeLessThanOrEqual(state.summary.right + 1);
      expect(state.copy.bottom).toBeLessThanOrEqual(state.summary.bottom + 1);
    }
  }
});

test('Each destination requests its own correctly composed scene for the viewport', async ({ page }) => {
  const routes = [['home', '/'], ['movies', '/movies.html'], ['tv', '/tv-shows.html'],
    ['cinema', '/cinema.html'], ['indie', '/indie-movies.html'],
    ['podcasts', '/podcasts.html'], ['games', '/games.html']];
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [name, route] of routes) {
      await page.goto(route);
      const selected = width < 700 ? 'mobile' : 'wide';
      const unused = width < 700 ? 'wide' : 'mobile';
      await expect.poll(() => page.evaluate(name => performance.getEntriesByType('resource')
        .some(entry => entry.name.includes(`/assets/themes/${name}-${innerWidth < 700 ? 'mobile' : 'wide'}.webp`)), name)).toBe(true);
      const resources = await page.evaluate(() => performance.getEntriesByType('resource').map(entry => entry.name));
      expect(resources.some(url => url.includes(`/assets/themes/${name}-${selected}.webp`))).toBe(true);
      expect(resources.some(url => url.includes(`/assets/themes/${name}-${unused}.webp`))).toBe(false);
    }
  }
});

test('Podcast feed failure replaces its loading label while curated listening remains available', async ({ page }) => {
  await page.route('**/api/podcasts', route => route.fulfill({ status: 503, body: 'Unavailable' }));
  await page.goto('/podcasts.html');
  await expect(page.locator('#podcast-chart-checked')).toContainText('Podcast list unavailable');
  await expect(page.locator('#podcast-chart')).toContainText('temporarily unavailable');
  await expect(page.locator('#podcast-chart-checked')).not.toContainText('Checking');
  await expect(page.locator('.fr-v5-editorial-tile').first()).toBeVisible();
});

test('Ordinary editorial rotations keep a stable page-specific footprint at each breakpoint', async ({ page }) => {
  test.setTimeout(180_000);
  for (const width of [320, 390, 700, 701, 800, 801, 1024, 1100, 1101, 1440, 1920]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ['/movies.html', '/tv-shows.html', '/indie-movies.html', '/podcasts.html', '/games.html']) {
      await page.goto(route);
      await expect(page.locator('.editorial-pick')).toBeVisible();
      const count = await page.locator('.editorial-carousel__dot').count();
      const heights = [];
      for (let index = 0; index < count; index++) {
        heights.push(await page.locator('.editorial-carousel__stage').evaluate(node => node.getBoundingClientRect().height));
        if (index < count - 1) await page.getByRole('button', { name: 'Next editorial pick' }).click();
      }
      expect(Math.max(...heights) - Math.min(...heights), `${route} at ${width}px`).toBeLessThanOrEqual(2);
    }
  }
});
