/* FrightNews: real first-party scene thumbnails; exact-title TMDB posters where verified. */
(() => {
  const roots = [...document.querySelectorAll('[data-frightnews]')];
  if (!roots.length) return;
  const el = (tag, cls, value) => {
    const x = document.createElement(tag);
    if (cls) x.className = cls;
    if (value !== undefined) x.textContent = value;
    return x;
  };
  const timeAgo = value => {
    const n = Date.parse(value);
    if (!Number.isFinite(n)) return '';
    const minutes = Math.max(0, Math.floor((Date.now() - n) / 60000));
    if (minutes < 2) return 'JUST NOW';
    if (minutes < 60) return minutes + ' MIN AGO';
    if (minutes < 1440) return Math.floor(minutes / 60) + ' HOURS AGO';
    if (minutes < 10080) return Math.floor(minutes / 1440) + ' DAYS AGO';
    return new Date(n).toLocaleDateString('en-GB').toUpperCase();
  };
  const moodImages = {
    movies:['/assets/themes/movies-mobile.webp','/assets/themes/cinema-mobile.webp','/assets/themes/indie-mobile.webp','/assets/worlds/movies-vault.webp'],
    tv:['/assets/themes/tv-mobile.webp','/assets/themes/tv-wide.webp'],
    games:['/assets/themes/games-mobile.webp','/assets/themes/games-wide.webp'],
    podcasts:['/assets/themes/podcasts-mobile.webp','/assets/worlds/podcast-studio.webp'],
    paranormal:['/assets/themes/home-mobile.webp','/assets/themes/home-wide.webp']
  };
  function moodImage(item, category) {
    const kind = category.includes('GAME') ? 'games' : category.includes('PODCAST') ? 'podcasts' :
      category.includes('PARANORMAL') ? 'paranormal' : category.includes('TV') ? 'tv' : 'movies';
    const scenes = moodImages[kind];
    const hash = String(item.title || '').split('').reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 37);
    return scenes[hash % scenes.length];
  }
  const normalTitle = text => String(text || '').normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g,' ').trim();
  let matchedPosters = [];
  function setVerifiedArtwork(scope) {
    if (!matchedPosters.length) return;
    const rows = [...scope.querySelectorAll('.frightnews__row[data-news-title]')];
    for (const row of rows) {
      const headline = ' ' + normalTitle(row.dataset.newsTitle) + ' ';
      const best = matchedPosters.find(item => headline.includes(' ' + item.normal + ' '));
      if (!best) continue;
      const frame = row.querySelector('.frightnews__thumb');
      const image = row.querySelector('.frightnews__thumb-img');
      if (!frame || !image || frame.dataset.hasPoster === 'yes') continue;
      frame.dataset.hasPoster = 'yes';
      const original = image.getAttribute('src');
      image.classList.add('frightnews__thumb-img--poster');
      image.title = 'Movie poster: ' + best.title + ' · source TMDB';
      image.onerror = () => {
        image.onerror = null;
        image.classList.remove('frightnews__thumb-img--poster');
        image.removeAttribute('title');
        frame.removeAttribute('data-has-poster');
        image.src = original;
      };
      image.src = 'https://image.tmdb.org/t/p/w185' + best.posterPath;
    }
  }
  function loadVerifiedPosters() {
    fetch('/api/movie-artwork', {headers:{accept:'application/json'}, signal:AbortSignal.timeout(8500)})
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (!data || !Array.isArray(data.items)) return;
        matchedPosters = data.items.filter(item => item && typeof item.title === 'string' &&
          /^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\.(?:jpg|png|webp)$/i.test(item.posterPath || ''))
          .map(item => ({title:item.title,normal:normalTitle(item.title),posterPath:item.posterPath}))
          .filter(item => item.normal.length >= 8)
          .sort((a,b)=>b.normal.length-a.normal.length);
        roots.forEach(setVerifiedArtwork);
      }).catch(() => { /* Keep real, first-party horror artwork when a poster is unavailable. */ });
  }
  function makeRow(item) {
    let url;
    try { url = new URL(item.url); } catch { return null; }
    if (url.protocol !== 'https:' || !item.title || url.username || url.password) return null;
    const category = String(item.category || 'MOVIE NEWS').slice(0, 40);
    const source = String(item.source || 'Original publisher').slice(0, 80);
    const link = el('a', 'frightnews__row');
    link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer';
    link.dataset.newsTitle = String(item.title).slice(0, 220);
    link.setAttribute('aria-label', item.title + ' — ' + source + ' (opens a new tab)');
    const image = el('span', 'frightnews__thumb');
    image.setAttribute('aria-hidden', 'true');
    image.dataset.kind = category.toLowerCase().replace(/[^a-z]+/g, '-');
    const thumbnail = el('img', 'frightnews__thumb-img');
    thumbnail.src = moodImage(item, category);
    thumbnail.alt = '';
    thumbnail.loading = 'lazy';
    thumbnail.decoding = 'async';
    thumbnail.width = 144; thumbnail.height = 90;
    thumbnail.onerror = () => {
      thumbnail.onerror = null;
      thumbnail.src = '/assets/themes/home-mobile.webp';
    };
    image.append(thumbnail);
    const copy = el('span', 'frightnews__copy');
    const meta = el('span', 'frightnews__meta');
    meta.append(el('span', 'frightnews__category', category), el('span', 'frightnews__bullet', ' • '), el('span', 'frightnews__publisher', source));
    const when = el('time', '', timeAgo(item.publishedAt));
    if (Number.isFinite(Date.parse(item.publishedAt))) when.dateTime = item.publishedAt;
    const foot = el('span', 'frightnews__time');
    foot.append(when, el('span', 'frightnews__outlink', 'READ STORY ↗'));
    copy.append(meta, el('strong', 'frightnews__headline', item.title),
      el('span', 'frightnews__excerpt', item.excerpt || 'Read the original publisher report.'), foot);
    link.append(image, copy);
    return link;
  }
  function fail(root) {
    const list = root.querySelector('[data-frightnews-list]');
    const state = root.querySelector('[data-frightnews-state]');
    if (list) list.replaceChildren(el('p', 'frightnews__empty',
      'Latest publisher-linked horror headlines are temporarily unavailable. Please try again shortly.'));
    if (state) state.textContent = 'FEED TEMPORARILY UNAVAILABLE';
  }
  fetch('/api/frightnews', {headers:{accept:'application/json'},cache:'no-store',
    signal:AbortSignal.timeout(13000)})
    .then(r => r.ok ? r.json() : Promise.reject(new Error('News unavailable')))
    .then(data => {
      if (data.status !== 'ok' || !Array.isArray(data.items)) throw Error('Invalid feed');
      const rows = data.items.map(makeRow).filter(Boolean);
      if (!rows.length) throw Error('Empty feed');
      roots.forEach(root => {
        const list = root.querySelector('[data-frightnews-list]');
        const end = root.querySelector('[data-frightnews-end]');
        const state = root.querySelector('[data-frightnews-state]');
        if (!list || !end) return;
        const home = root.dataset.frightnews === 'home';
        let visible = 0;
        const show = () => {
          const until = Math.min(visible + 40, rows.length);
          list.append(...rows.slice(visible, until).map(row => row.cloneNode(true)));
          visible = until;
          setVerifiedArtwork(list);
        };
        list.replaceChildren(); show(); end.replaceChildren(); end.hidden = false;
        if (home) {
          const all = el('a', 'frightnews__all-link', 'VIEW ALL FRIGHTNEWS  →');
          all.href = '/frightnews.html';
          end.append(el('span', 'frightnews__end-note', 'THERE IS ALWAYS MORE IN THE DARK'), all);
        } else if (visible < rows.length) {
          const more = el('button', 'frightnews__load-more', 'SHOW 40 MORE STORIES  ↓');
          more.type = 'button';
          more.addEventListener('click', () => {
            show();
            if (visible >= rows.length) more.replaceWith(el('span', 'frightnews__end-note', 'END OF THE LATEST HEADLINES'));
          });
          end.append(more);
        } else end.append(el('span', 'frightnews__end-note', 'END OF THE LATEST HEADLINES'));
        if (state) state.textContent = rows.length + ' SOURCE-LINKED STORIES · UPDATED ' + timeAgo(data.updatedAt);
      });
      loadVerifiedPosters();
    }).catch(() => roots.forEach(fail));
})();