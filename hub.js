(() => {
  // A rotating, sourced feature: prefer a film actually released recently, then
  // the closest verified upcoming release. No fabricated availability or score.
  const feature=document.querySelector('.hub-feature');
  const films=Array.isArray(window.FR_MOVIES)?window.FR_MOVIES:[];
  if(feature&&films.length){
    const today=new Date().toISOString().slice(0,10);
    const recent=new Date(Date.now()-30*86400000).toISOString().slice(0,10);
    const future=new Date(Date.now()+45*86400000).toISOString().slice(0,10);
    const releases=films.flatMap(film=>(film.claims||[])
      .filter(c=>c.field==='releaseDate'&&/^\d{4}-\d{2}-\d{2}$/.test(c.value||'')&&
        /^https:\/\//.test(c.source||'')&&/theatrical|cinema/i.test(c.label||''))
      .map(claim=>({film,claim})));
    const sortRecent=(a,b)=>b.claim.value.localeCompare(a.claim.value)||
      a.film.title.localeCompare(b.film.title);
    const sortUpcoming=(a,b)=>a.claim.value.localeCompare(b.claim.value)||
      a.film.title.localeCompare(b.film.title);
    const latest=releases.filter(x=>x.claim.value<=today&&x.claim.value>=recent).sort(sortRecent)[0];
    const upcoming=releases.filter(x=>x.claim.value>today&&x.claim.value<=future).sort(sortUpcoming)[0];
    const chosen=latest||upcoming;
    if(chosen&&/^[a-z0-9-]+$/.test(chosen.film.id)){
      const kicker=feature.querySelector('.hub-kicker');
      const title=feature.querySelector('h3');
      const description=feature.querySelector('.hub-tile__content p');
      const link=feature.querySelector('.hub-tile__link');
      if(kicker&&title&&description&&link){
        const synopsis=(chosen.film.claims||[]).find(x=>x.field==='synopsis')?.value;
        kicker.textContent=latest?'RECENT HORROR RELEASE · OFFICIAL FILM FILE':'COMING HORROR · OFFICIAL FILM FILE';
        title.textContent=chosen.film.title;
        description.textContent=typeof synopsis==='string'&&synopsis.length>15?
          synopsis:'Enter the latest film file and explore its official release announcement.';
        link.href='/films/'+encodeURIComponent(chosen.film.id)+'/';
        link.setAttribute('aria-label','Explore '+chosen.film.title+' film details');
      }
    }
  }
  const root = document.querySelector('#hub-ranking');
  if (!root) return;

  const year = new Date().getUTCFullYear();
  const heading = document.querySelector('.hub-charts h2 em');
  if (heading) heading.textContent = 'FILMS · ' + year;
  const chartFoot = document.querySelector('.hub-charts__foot');
  if (chartFoot) chartFoot.textContent = year + ' · SOURCE-LINKED RANKINGS';
  const fullChart = document.querySelector('.hub-charts__all');
  if (fullChart) fullChart.href = '/top-20/' + year + '/';
  const isCompact = matchMedia('(max-width: 900px)').matches;
  const previewLimit = isCompact ? 5 : 10;
  const safeSource = value => {
    try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; }
    catch { return ''; }
  };
  const filmHref = id => {
    if (!/^[a-z0-9-]{1,80}$/.test(id || '')) return '/movies.html';
    return window.FR_MOVIES?.some(film => film.id === id)
      ? '/films/' + encodeURIComponent(id) + '/'
      : '/film.html?id=' + encodeURIComponent(id);
  };
  const formatDate = value => {
    const date = new Date(value);
    return Number.isFinite(date.valueOf())
      ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(date) + ' UTC'
      : '';
  };

  function createState(title, description, modifier = 'pending') {
    const state = document.createElement('div');
    state.className = 'hub-ranking__state hub-ranking__state--' + modifier;
    state.setAttribute('role', 'status');
    const strong = document.createElement('strong');
    strong.textContent = title;
    const detail = document.createElement('p');
    detail.textContent = description;
    state.append(strong, detail);
    return state;
  }

  function renderUnranked(year, rankedIds = new Set()) {
    const films = (window.FR_MOVIES || []).filter(film => {
      const filmYear = (film.claims || []).find(claim => claim.field === 'filmYear');
      return film.editorialStatus === 'approved' && Number(filmYear?.value) === year && !rankedIds.has(film.id);
    }).sort((a, b) => a.title.localeCompare(b.title, 'en', { sensitivity: 'base' }));
    if (!films.length) return null;

    const disclosure = document.createElement('details');
    disclosure.className = 'hub-unranked';
    const summary = document.createElement('summary');
    summary.textContent = `${films.length} verified ${year} ${films.length === 1 ? 'film' : 'films'} awaiting eligible critic reviews`;
    const list = document.createElement('div');
    list.className = 'hub-unranked__list';
    for (const film of films) {
      const item = document.createElement('div');
      item.className = 'hub-unranked__item';
      const title = document.createElement('a');
      title.href = filmHref(film.id);
      title.textContent = film.title;
      const claim = film.claims.find(value => value.field === 'filmYear');
      const sourceUrl = safeSource(claim?.source);
      const source = document.createElement('small');
      if (sourceUrl) {
        const link = document.createElement('a');
        link.href = sourceUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = claim.sourceName || 'Film-year source';
        source.append(link);
      } else source.textContent = 'Source link unavailable';
      item.append(title, source);
      list.append(item);
    }
    disclosure.append(summary, list);
    return disclosure;
  }

  function setupScroll(list, controls, button) {
    const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let previousTime = 0;
    let animationPosition = list.scrollTop;
    let manualPause = motionPreference.matches;
    let transientPause = false;
    let inViewport = !('IntersectionObserver' in window);
    let reachedEnd = false;
    const updateControl = () => {
      button.disabled = motionPreference.matches;
      button.setAttribute('aria-pressed', String(!manualPause && !reachedEnd && !motionPreference.matches));
      button.textContent = motionPreference.matches ? 'Slow scroll off (reduced motion)' : reachedEnd ? 'Restart slow chart scroll' : manualPause ? 'Start slow chart scroll' : 'Pause chart scroll';
    };
    const stop = () => { if (frame) cancelAnimationFrame(frame); frame = 0; previousTime = 0; };
    const step = time => {
      if (manualPause || transientPause || !inViewport || document.hidden || reachedEnd || motionPreference.matches) { stop(); return; }
      if (list.scrollHeight - list.clientHeight <= 2) { controls.hidden = true; stop(); return; }
      controls.hidden = false;
      if (previousTime) {
        // Keep fractional progress outside scrollTop: Chromium can quantize its readback,
        // which otherwise discards each sub-pixel increment and stalls this slow scroll.
        const elapsed = Math.min(Math.max(0, time - previousTime), 100);
        animationPosition = Math.min(animationPosition + elapsed * 0.006, Math.max(0, list.scrollHeight - list.clientHeight));
        list.scrollTop = animationPosition;
      }
      previousTime = time;
      const atEnd = list.scrollTop + list.clientHeight >= list.scrollHeight - 2;
      if (atEnd) { reachedEnd = true; stop(); updateControl(); return; }
      frame = requestAnimationFrame(step);
    };
    const play = () => {
      if (motionPreference.matches || !inViewport || document.hidden) return;
      if (reachedEnd) { list.scrollTop = 0; animationPosition = 0; reachedEnd = false; }
      else animationPosition = list.scrollTop;
      manualPause = false;
      updateControl();
      stop();
      frame = requestAnimationFrame(step);
    };
    const pause = () => { manualPause = true; stop(); updateControl(); };
    controls.hidden = true;
    button.addEventListener('click', () => manualPause || reachedEnd ? play() : pause());
    list.addEventListener('pointerenter', () => { transientPause = true; stop(); });
    list.addEventListener('pointerleave', () => { transientPause = false; if (!manualPause && !reachedEnd) play(); });
    list.addEventListener('focusin', () => { transientPause = true; stop(); });
    list.addEventListener('focusout', event => {
      if (event.relatedTarget && list.contains(event.relatedTarget)) return;
      transientPause = false;
      if (!manualPause && !reachedEnd) play();
    });
    button.addEventListener('focusin', () => { transientPause = true; stop(); });
    button.addEventListener('focusout', () => {
      transientPause = false;
      if (!manualPause && !reachedEnd) play();
    });
    list.addEventListener('wheel', pause, { passive: true });
    list.addEventListener('touchstart', pause, { passive: true, once: true });
    list.addEventListener('pointerdown', pause, { passive: true });
    list.addEventListener('keydown', event => {
      if (['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key)) pause();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else if (!manualPause && !transientPause && inViewport && !reachedEnd) play();
    });
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        inViewport = entries[0]?.isIntersecting === true;
        if (!inViewport) stop();
        else if (!manualPause && !transientPause && !document.hidden && !reachedEnd) play();
      }, { threshold: 0.15 });
      observer.observe(list);
    }
    motionPreference.addEventListener?.('change', event => {
      if (event.matches) { manualPause = true; stop(); }
      else { manualPause = false; if (inViewport && !document.hidden) play(); }
      updateControl();
    });
    updateControl();
    if (motionPreference.matches) controls.setAttribute('data-reduced-motion', 'true');
    else play();
  }

  function renderRows(items) {
    const seenFilms = new Set();
    const seenPositions = new Set();
    const valid = items.filter(item => {
      const ok = item && /^[a-z0-9-]{1,80}$/.test(item.filmId || '') &&
        typeof item.title === 'string' && item.title.trim().length > 0 && item.title.length <= 240 &&
        Number.isInteger(item.position) && item.position >= 1 && item.position <= 20 && !seenPositions.has(item.position) &&
        Number.isInteger(item.averageScore) && item.averageScore >= 0 && item.averageScore <= 100 &&
        Number.isInteger(item.criticCount) && item.criticCount >= 3 && !seenFilms.has(item.filmId);
      if (ok) { seenFilms.add(item.filmId); seenPositions.add(item.position); }
      return ok;
    }).sort((a, b) => a.position - b.position).slice(0, previewLimit);
    if (!valid.length) return { node: null, ids: new Set(), count: 0 };

    const list = document.createElement('div');
    list.className = 'hub-chart-list';
    list.id = 'hub-chart-results';
    list.setAttribute('role', 'list');
    for (const item of valid) {
      const row = document.createElement('div');
      row.className = 'hub-chart-row';
      row.setAttribute('role', 'listitem');
      const movementText = /^(?:NEW|—|UP \d+|DOWN \d+)$/.test(item.movementLabel || '') ? item.movementLabel : '—';
      if (movementText !== '—') row.classList.add('is-changed');
      const movement = document.createElement('span');
      movement.className = 'movement';
      const kind = movementText === 'NEW' ? 'new' : movementText.startsWith('UP') ? 'up' : movementText.startsWith('DOWN') ? 'down' : 'same';
      movement.dataset.kind = kind;
      movement.textContent = movementText === '—' ? 'UNCHANGED' : movementText;
      movement.setAttribute('aria-label', movementText === '—' ? 'Position unchanged' : `Position movement ${movementText.toLowerCase()}`);
      const position = document.createElement('span');
      position.className = 'position';
      position.textContent = '#' + item.position;
      const title = document.createElement('a');
      title.textContent = item.title;
      title.href = filmHref(item.filmId);
      const score = document.createElement('span');
      score.className = 'score';
      score.textContent = (item.averageScore / 10).toFixed(1) + '/10';
      const meta = document.createElement('div');
      meta.className = 'chart-meta';
      const count = document.createElement('span');
      count.textContent = `${item.criticCount} distinct critics`;
      meta.append(count);
      const sources = (Array.isArray(item.sources) ? item.sources : []).slice(0, 4);
      for (const source of sources) {
        const href = safeSource(source?.url);
        if (!href) continue;
        const link = document.createElement('a');
        link.href = href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = source.publication || source.critic || 'Review source';
        link.title = `${source.territory || 'Territory not stated'} · checked ${source.checkedAt || 'date not stated'}`;
        meta.append(link);
      }
      row.append(position, title, score, movement, meta);
      list.append(row);
    }
    const ids = new Set(valid.map(item => item.filmId));
    if (valid.length >= 8 && !isCompact) {
      const controls = document.createElement('div');
      controls.className = 'hub-chart-motion';
      const note = document.createElement('span');
      note.textContent = 'SLOW SCROLL · PAUSES ON HOVER, FOCUS OR MANUAL SCROLL';
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-controls', list.id);
      controls.append(note, button);
      setupScroll(list, controls, button);
      list.classList.add('hub-chart-list--scrolling');
      return { node: [list, controls], ids, count: valid.length };
    }
    return { node: list, ids, count: valid.length };
  }

  function finish() { root.setAttribute('aria-busy', 'false'); }
  function setResult(data) {
    const dataItems = Array.isArray(data?.items) ? data.items : [];
    const rendered = renderRows(dataItems);
    const content = [];
    if (rendered.node) {
      if (Array.isArray(rendered.node)) content.push(...rendered.node);
      else content.push(rendered.node);
      const updated = document.createElement('p');
      updated.className = 'hub-ranking__updated';
      updated.textContent = formatDate(data?.updatedAt) ? `Last published ranking snapshot: ${formatDate(data.updatedAt)}` : 'Last published ranking snapshot: not available';
      content.push(updated);
      if (data?.stale === true) content.push(createState('Ranking data may be out of date', 'Showing the last valid ranking while its sources are reviewed.', 'stale'));
    } else if (data?.stale === true) {
      content.push(createState('Ranking data may be out of date', 'No current verified ranking is available.', 'stale'));
    } else {
      content.push(createState('Critic ranking pending', 'Verified critic scores are not yet available.'));
    }
    const unranked = renderUnranked(year, rendered.ids);
    if (unranked) content.push(unranked);
    root.replaceChildren(...content);
  }

  fetch('/api/rankings?year=' + year, { headers: { accept: 'application/json' } })
    .then(async response => {
      if (!response.ok) throw new Error('Ranking API unavailable');
      return response.json();
    })
    .then(setResult)
    .catch(() => {
      root.replaceChildren(createState('Ranking unavailable', 'The annual chart could not be refreshed. Please try again later.', 'unavailable'));
      const unranked = renderUnranked(year);
      if (unranked) root.append(unranked);
    })
    .finally(finish);
})();
