import { test, expect } from '@playwright/test';

const titles = ['Resident Evil', 'Insidious: Out of the Further', 'Resident Dead',
  'Resident Evil: Welcome to Raccoon City', "Don’t Leave the Kids Alone", 'Other Mommy',
  'Pinocchio: Unstrung', 'Obsession'];
const items = titles.map((title, index) => ({ indieVerified:true,tmdbId: 1700001 + index, type: 'movie',
  mediaType: 'movie', title, posterPath: '/fixture.jpg', ratingKind: 'tmdb-community',
  voteAverage: 7.8 - index * .1, voteCount: 500 + index * 31,
  trailer: { key: 'abcdefghijk' }, firstReleaseDate: '2026-10-05' }));

test.beforeEach(async ({ page }) => {
  await page.route('**/api/catalogue?**', route => {
    const type = new URL(route.request().url()).searchParams.get('type') === 'tv' ? 'tv' : 'movie';
    return route.fulfill({ json: { items: items.map(item => ({ ...item, type, mediaType: type })), page: 1, totalPages: 1 } });
  });
  await page.route('**/api/rankings?**', route => route.fulfill({ json: {
    ratingKind: 'tmdb-community', updatedAt: '2026-10-14T03:50:00Z',
    items: ['Obsession', 'Colony', "Lee Cronin’s The Mummy", 'Buddy',
      'Insidious: Out of the Further'].map((title, index) => ({ title,
      position: index + 1, tmdbId: 1800001 + index, filmId: `tmdb-${1800001 + index}`, averageScore: 82 - index,
      voteCount: 500 + index * 31 }))
  } }));
  await page.route('https://image.tmdb.org/**', route => route.fulfill({ status: 404 }));
});

test('Home places saved films under the feature and keeps destination headings and chart values contained', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('frightertainment-v5-watchlist', JSON.stringify([
    { tmdbId: 1700001, title: 'Resident Evil', type: 'movie', posterPath: '', year: 2026 }
  ])));
  for (const width of [320, 360, 390, 430, 460, 480, 980, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('#hub-ranking .hub-chart-row')).toHaveCount(5);
    await expect(page.locator('#my-watchlist [data-home-watch-count]')).toHaveText('1');
    const boxes = await page.evaluate(() => {
      const r = selector => document.querySelector(selector).getBoundingClientRect();
      const rows = [...document.querySelectorAll('#hub-ranking .hub-chart-row')];
      const tileTitles = [...document.querySelectorAll('.hub-showcase__bottom h3')];
      const longlegs = document.querySelector('.hub-indie h3').firstChild;
      const lines = new Set();
      for (let index = 0; index < longlegs.length; index++) {
        const range = document.createRange();range.setStart(longlegs,index);range.setEnd(longlegs,index+1);
        lines.add(Math.round(range.getBoundingClientRect().top));
      }
      return { feature: r('.hub-feature'), watch: r('#my-watchlist'), chart: r('.hub-charts'),
        editorialTitle: r('.fr-home-dashboard-heading h2'), editorialLink: r('.fr-home-dashboard-heading>a'),
        editorialLineHeight: parseFloat(getComputedStyle(document.querySelector('.fr-home-dashboard-heading h2')).lineHeight),
        tiles: tileTitles.map(title => title.getBoundingClientRect()), longlegsLines: lines.size,
        actions: [...document.querySelectorAll('.hub-showcase__bottom .hub-tile__link')].map(link => link.getBoundingClientRect()),
        rows: rows.map(row => ({ title: row.querySelector('a').getBoundingClientRect(),
          score: row.querySelector('.score').getBoundingClientRect(), row: row.getBoundingClientRect() })),
        scrollWidth: document.documentElement.scrollWidth, viewport: innerWidth };
    });
    expect(boxes.watch.top, `${width}px`).toBeGreaterThanOrEqual(boxes.feature.bottom - 1);
    expect(boxes.watch.top - boxes.feature.bottom, `${width}px`).toBeLessThanOrEqual(26);
    expect(boxes.editorialTitle.height, `${width}px`).toBeLessThanOrEqual(boxes.editorialLineHeight + 1);
    expect(boxes.editorialLink.height, `${width}px`).toBeLessThan(21);
    if (width <= 460) expect(boxes.editorialTitle.bottom).toBeLessThanOrEqual(boxes.editorialLink.top);
    else expect(boxes.editorialTitle.right).toBeLessThanOrEqual(boxes.editorialLink.left + 1);
    expect(boxes.longlegsLines, `${width}px`).toBe(1);
    for (const row of boxes.rows) {
      expect(row.title.right, `${width}px`).toBeLessThanOrEqual(row.score.left + 1);
      expect(row.score.right, `${width}px`).toBeLessThanOrEqual(row.row.right + 1);
    }
    if (width >= 980) {
      const tops = boxes.tiles.map(box => box.top);
      expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(2);
      const actionTops = boxes.actions.map(box => box.top);
      const actionHeights = boxes.actions.map(box => box.height);
      expect(Math.max(...actionTops) - Math.min(...actionTops)).toBeLessThanOrEqual(2);
      expect(Math.max(...actionHeights) - Math.min(...actionHeights)).toBeLessThanOrEqual(2);
    }
    expect(boxes.scrollWidth).toBeLessThanOrEqual(boxes.viewport + 2);
  }
});

test('Poster actions occupy separate corners and the Movies watchlist lives on Home', async ({ page }) => {
  for (const width of [320, 390, 980]) {
    for (const path of ['/movies.html', '/indie-movies.html', '/tv-shows.html']) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await expect(page.locator('.fr-v5-rack .fr-v5-poster-card').first()).toBeVisible();
      const card = page.locator('.fr-v5-rack .fr-v5-poster-card').first();
      await expect(card.locator('.fr-v5-poster__source')).toHaveAttribute('href', /^https:\/\/www\.themoviedb\.org\//);
      await expect(card.locator('.fr-v5-poster__rating .fr-rating-badge')).toHaveAttribute('data-fr-rating-state', 'rated');
      await expect(card.locator('.fr-v5-poster__trailer')).toHaveAttribute('data-trailer-video', 'abcdefghijk');
      const places = await card.evaluate(node => {
        const r = selector => node.querySelector(selector).getBoundingClientRect();
        return { art: r('.fr-v5-poster__art'), source: r('.fr-v5-poster__source'),
          rating: r('.fr-v5-poster__rating'), trailer: r('.fr-v5-poster__trailer') };
      });
      expect(places.source.left, `${path} ${width}px`).toBeGreaterThanOrEqual(places.art.left);
      const sourceRatingOverlap = places.source.left < places.rating.right - 1 &&
        places.source.right > places.rating.left + 1 && places.source.top < places.rating.bottom - 1 &&
        places.source.bottom > places.rating.top + 1;
      expect(sourceRatingOverlap, `${path} ${width}px`).toBe(false);
      expect(places.rating.right, `${path} ${width}px`).toBeLessThanOrEqual(places.art.right + 1);
      expect(places.trailer.right, `${path} ${width}px`).toBeLessThanOrEqual(places.art.right + 1);
      expect(places.trailer.bottom, `${path} ${width}px`).toBeLessThanOrEqual(places.art.bottom + 1);
      if (path === '/movies.html') await expect(page.locator('.fr-v5-watchlist')).toHaveCount(0);
      if (path === '/indie-movies.html') await expect(page.locator('.fr-v5-rack .fr-v5-poster-card')).toHaveCount(6);
    }
  }
});

test('Home destination copy stays level when real media fields arrive later', async ({ page }) => {
  await page.route('**/api/media?**', route => {
    const request = new URL(route.request().url());
    const tv = request.searchParams.get('type') === 'tv';
    return route.fulfill({ json: { item: { title: tv ? 'From' : 'Longlegs',
      tmdbId: tv ? 120001 : 120002, type: tv ? 'tv' : 'movie',
      ratingKind: 'tmdb-community', voteAverage: 7.6, voteCount: 1287,
      sourceUrl: `https://www.themoviedb.org/${tv ? 'tv' : 'movie'}/${tv ? 120001 : 120002}`,
      trailer: { key: 'abcdefghijk' }, posterPath: null } } });
  });
  for (const width of [390, 980]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const indie = page.locator('.hub-showcase__bottom .hub-indie');
    await indie.scrollIntoViewIfNeeded();
    await expect(indie.locator('.fr-rating-badge')).toBeVisible();
    await expect(indie.locator('.fr-trailer-button')).toBeVisible();
    const layout = await indie.evaluate(tile => {
      const r = selector => tile.querySelector(selector).getBoundingClientRect();
      return { tile: tile.getBoundingClientRect(), title: r('h3'), copy: r('p'),
        rating: r('.hub-feature__rating'), trailer: r('.fr-trailer-button'),
        link: r('.hub-tile__link') };
    });
    expect(layout.title.bottom).toBeLessThanOrEqual(layout.copy.top + 1);
    expect(layout.copy.bottom).toBeLessThanOrEqual(layout.rating.top + 1);
    expect(layout.rating.bottom).toBeLessThanOrEqual(layout.trailer.top + 1);
    expect(layout.trailer.bottom).toBeLessThanOrEqual(layout.link.top + 1);
    expect(layout.link.bottom).toBeLessThanOrEqual(layout.tile.bottom + 1);
  }
});

test('Full catalogue poster keeps source, badge and verified trailer separate from details', async ({ page }) => {
  await page.setViewportSize({ width: 980, height: 900 });
  await page.goto('/tv-shows.html');
  await page.locator('.fr-v5-deeper > summary').click();
  const card = page.locator('.fr-catalogue-section .fr-media-card').first();
  await expect(card).toBeVisible();
  await expect(card.locator('.fr-media-card__source')).toHaveAttribute('href', /^https:\/\/www\.themoviedb\.org\/tv\//);
  await expect(card.locator('.fr-media-card__rating .fr-rating-badge')).toHaveAttribute('data-fr-rating-state', 'rated');
  await expect(card.locator('.fr-media-card__trailer')).toHaveAttribute('data-trailer-video', 'abcdefghijk');
  await expect(card.locator('.fr-media-card__poster')).toHaveAttribute('href', /\/media\.html\?type=tv&id=/);
  await card.locator('.fr-media-card__trailer').click();
  await expect(page.locator('.trailer-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.trailer-dialog')).toBeHidden();
});

test('Movies uses the available width when no sourced trailer accompanies a short chart', async ({ page }) => {
  await page.route('**/api/catalogue?**', route => route.fulfill({ json: {
    items: items.map(item => ({ ...item, trailer: null, trailerVideoId: null })), page: 1, totalPages: 1
  } }));
  await page.setViewportSize({ width: 980, height: 900 });
  await page.goto('/movies.html');
  await expect(page.locator('.fr-v5-ranking__entry')).toHaveCount(5);
  await expect(page.locator('.fr-v5-trailer')).toHaveCount(0);
  const layout = await page.evaluate(() => {
    const parent = document.querySelector('.fr-v5-feature-panels').getBoundingClientRect();
    const chart = document.querySelector('.fr-v5-ranking').getBoundingClientRect();
    const entries = [...document.querySelectorAll('.fr-v5-ranking__entry')].map(node => node.getBoundingClientRect());
    const scores = [...document.querySelectorAll('.fr-v5-ranking__score .fr-rating-badge')].map(node => node.getBoundingClientRect());
    return { parent, chart, entries, scores };
  });
  expect(layout.chart.width).toBeGreaterThan(layout.parent.width * .9);
  for (let index = 1; index < layout.entries.length; index++) {
    expect(layout.entries[index].top).toBeGreaterThanOrEqual(layout.entries[index - 1].bottom - 1);
  }
  for (let index = 0; index < layout.entries.length; index++) {
    expect(layout.scores[index].right).toBeLessThanOrEqual(layout.entries[index].right + 1);
  }
});

test('Cinema board pairs each sourced title with its territory date without moving the picker', async ({ page }) => {
  for (const width of [320, 390, 980, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/cinema.html');
    await expect(page.locator('.fr-cinema-concept__card')).toHaveCount(4);
    await expect(page.locator('.fr-cinema-concept__region #cinema-country')).toHaveCount(1);
    const rows = await page.locator('.fr-cinema-concept__card').evaluateAll(cards => cards.map(card => ({
      title: card.querySelector('.fr-cinema-concept__title').getBoundingClientRect(),
      date: card.querySelector('.fr-cinema-concept__date').getBoundingClientRect(),
      card: card.getBoundingClientRect(), source: card.querySelector('a').href,
      dateTime: card.querySelector('time').dateTime
    })));
    for (const row of rows) {
      expect(row.title.right, `${width}px`).toBeLessThanOrEqual(row.date.left + 1);
      expect(row.date.right, `${width}px`).toBeLessThanOrEqual(row.card.right + 1);
      expect(row.dateTime).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(row.source).toMatch(/^https:\/\//);
    }
    await page.locator('#cinema-country').selectOption('US');
    await expect(page.locator('.fr-cinema-concept__region')).toContainText('UNITED STATES');
    await expect(page.locator('.fr-cinema-concept__card')).not.toHaveCount(0);
  }
});
