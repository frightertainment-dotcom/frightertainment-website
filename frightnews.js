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
    const sourceCheck = item.verifiedOnly && /^\d{4}-\d{2}-\d{2}$/.test(item.sourceCheckedAt || '');
    const when = el('time', '', sourceCheck
      ? 'SOURCE CHECKED ' + new Date(item.sourceCheckedAt + 'T12:00:00Z').toLocaleDateString('en-GB', {day:'numeric',month:'short',timeZone:'UTC'}).toUpperCase()
      : timeAgo(item.publishedAt));
    if (sourceCheck) when.dateTime = item.sourceCheckedAt;
    else if (Number.isFinite(Date.parse(item.publishedAt))) when.dateTime = item.publishedAt;
    const foot = el('span', 'frightnews__time');
    foot.append(when, el('span', 'frightnews__outlink', item.verifiedOnly ? 'VIEW SOURCE ↗' : 'READ STORY ↗'));
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
  // Static, independently source-checked editorial notices provide a truthful
  // fallback when external publishers are blocked or temporarily unavailable.
  // Their check dates must NEVER be passed off as story publication dates.
  async function sourceCheckedFallback() {
    const files = ['/data/horror-radar.json', '/data/editorial-releases.json'];
    const results = await Promise.allSettled(files.map(path => fetch(path, {cache:'no-store'})
      .then(response => response.ok ? response.json() : null)));
    const [radar, releases] = results.map(outcome => outcome.status === 'fulfilled' ? outcome.value : null);
    const entries = [];
    const validUrl = value => {
      try {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
      } catch { return null; }
    };
    const isDay = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') &&
      Number.isFinite(Date.parse(value + 'T12:00:00Z'));
    for (const item of Array.isArray(radar?.items) ? radar.items : []) {
      const url = validUrl(item.sourceUrl);
      if (!url || !item.title || !item.summary || !isDay(item.checkedAt)) continue;
      const category = item.category === 'game' ? 'GAMES' :
        item.category === 'podcast' ? 'PODCASTS' : item.category === 'tv' ? 'TV NEWS' :
        item.category === 'streaming' ? 'STREAMING' : 'MOVIE NEWS';
      entries.push({
        title:item.title, excerpt:item.summary, category,
        source:item.channel || 'Original announcement', url,
        sourceCheckedAt:item.checkedAt, publishedAt:item.checkedAt + 'T12:00:00Z',
        verifiedOnly:true
      });
    }
    for (const item of Array.isArray(releases?.items) ? releases.items : []) {
      const url = validUrl(item.sourceUrl);
      if (!url || !item.title || !isDay(item.checkedAt)) continue;
      const type = item.category === 'cinema' ? 'CINEMA UPDATE' :
        item.category === 'streaming' ? 'STREAMING' : 'MOVIE UPDATE';
      const releaseDate = isDay(item.date) ?
        new Date(item.date+'T12:00:00Z').toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}) : '';
      entries.push({
        title:item.title + ' — ' + (item.service || 'release') + ' update',
        excerpt:(item.sourceName || 'The official source') + ' lists this title' +
          (releaseDate ? ' for ' + releaseDate : '') + '. Check the linked source for current details.',
        category:type, source:item.sourceName || item.service || 'Source-checked release', url,
        sourceCheckedAt:item.checkedAt, publishedAt:item.checkedAt + 'T12:00:00Z',
        verifiedOnly:true
      });
    }
    return entries.sort((a,b)=>b.sourceCheckedAt.localeCompare(a.sourceCheckedAt) ||
      a.title.localeCompare(b.title)).slice(0,120);
  }
  const viewingArchive = roots.some(root => root.dataset.frightnews === 'page') &&
    new URLSearchParams(location.search).get('archive') === '1';
  const newsNavigation = document.querySelectorAll('.frightnews__browse-nav a');
  for (const a of newsNavigation) {
    if ((a.getAttribute('href')||'').includes('?archive=1') === viewingArchive)
      a.setAttribute('aria-current','page');
  }
  if (viewingArchive) {
    const description = document.querySelector('.frightnews--page .frightnews__heading p');
    if (description) description.textContent = 'The FrightNews archive preserves older horror headlines and links once the active news library reaches 500 stories.';
  }
  fetch('/api/frightnews' + (viewingArchive ? '?archive=1' : ''), {headers:{accept:'application/json'},cache:'no-store',
    signal:AbortSignal.timeout(9000)})
    .then(r => r.ok ? r.json() : {status:'unavailable',items:[]})
    .catch(() => ({status:'unavailable',items:[]}))
    .then(async data => {
      const live = data.status === 'ok' && Array.isArray(data.items) ? data.items : [];
      if (viewingArchive) return {...data,status:'ok',mode:'archive'};
      if (live.length >= 10) return {...data,mode:'live'};
      const fallback = await sourceCheckedFallback();
      if (!fallback.length) return {...data,items:live,mode:'live'};
      const seen = new Set(live.map(item => item.title?.trim().toLowerCase()));
      const supplements = fallback.filter(item => !seen.has(item.title.trim().toLowerCase()));
      return {...data,status:'ok',mode:live.length ? 'mixed' : 'source-checked',
        items:[...live,...supplements].slice(0,120)};
    })
    .then(data => {
      if (data.status !== 'ok' || !Array.isArray(data.items)) throw Error('Invalid feed');
      let rows = data.items.map(makeRow).filter(Boolean);
      if (!rows.length && !viewingArchive) throw Error('Empty feed');
      roots.forEach(root => {
        const list = root.querySelector('[data-frightnews-list]');
        const end = root.querySelector('[data-frightnews-end]');
        const state = root.querySelector('[data-frightnews-state]');
        if (!list || !end) return;
        const home = root.dataset.frightnews === 'home';
        if (viewingArchive && !rows.length) {
          list.replaceChildren(el('p','frightnews__empty','No articles have been archived yet. Older articles remain in the main FrightNews collection until it reaches 500.'));
          end.hidden = true;
          if (state) state.textContent = 'ARCHIVE: 0 ARTICLES';
          return;
        }
        let visible = 0;
        const total = Number.isInteger(data.total) && data.total >= rows.length ? data.total : rows.length;
        const archiveLink = document.querySelector('.frightnews__browse-nav a[href="/frightnews.html?archive=1"]');
        if (archiveLink && Number(data.archiveTotal) > 0)
          archiveLink.textContent = 'PRESERVED ARCHIVE (' + Number(data.archiveTotal) + ')';
        const canLoadMore = () => visible < rows.length || (data.storageMode === 'persistent' && rows.length < total);
        let loading = false;
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
        } else if (canLoadMore()) {
          const more = el('button', 'frightnews__load-more', 'SHOW 40 MORE STORIES  ↓');
          more.type = 'button';
          more.addEventListener('click', async () => {
            if (loading) return;
            loading = true;
            more.disabled = true;
            const previousText = more.textContent;
            more.textContent = 'LOADING MORE STORIES…';
            try {
              if (visible >= rows.length && data.storageMode === 'persistent' && rows.length < total) {
                const next = '/api/frightnews?offset=' + rows.length + (viewingArchive ? '&archive=1' : '');
                const response = await fetch(next, {headers:{accept:'application/json'}});
                if (!response.ok) throw Error('Older stories unavailable');
                const payload = await response.json();
                if (!Array.isArray(payload.items)) throw Error('Invalid story page');
                rows.push(...payload.items.map(makeRow).filter(Boolean));
              }
              show();
              if (!canLoadMore()) more.replaceWith(el('span','frightnews__end-note','END OF THE ' + (viewingArchive ? 'ARCHIVE' : 'LATEST HEADLINES')));
              else more.textContent = previousText;
            } catch {
              more.textContent = 'RETRY LOADING STORIES  ↻';
            } finally { more.disabled = false;loading = false; }
          });
          end.append(more);
        } else end.append(el('span', 'frightnews__end-note', 'END OF THE LATEST HEADLINES'));
        if (state) {
          const live = data.items.filter(item => !item.verifiedOnly).length;
          const checked = data.items.length - live;
          state.textContent = viewingArchive ? 'ARCHIVE · ' + total + ' PRESERVED STORIES' : data.mode === 'source-checked'
            ? checked + ' SOURCE-CHECKED RELEASE UPDATES · LIVE NEWS TEMPORARILY UNAVAILABLE'
            : checked ? live + ' NEWS STORIES · ' + checked + ' SOURCE-CHECKED UPDATES'
            : total + ' SOURCE-LINKED ARTICLES · UPDATED ' + timeAgo(data.updatedAt);
        }
      });
      // Extra TMDB poster lookup is only needed on the full FrightNews page.
      // Do not load another provider endpoint on every homepage visit.
      if (roots.some(root => root.dataset.frightnews === 'page')) loadVerifiedPosters();
    }).catch(() => roots.forEach(fail));
})();