(() => {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const mediaType = item => item.mediaType === 'tv' || item.type === 'tv' ? 'tv' : 'movie';
  const id = item => Number(item.tmdbId || (/^\d+$/.test(String(item.id)) ? item.id : 0));
  const href = item => '/media.html?type=' + mediaType(item) + '&id=' + id(item) + (document.body.dataset.catalogueType === 'indie' ? '&section=indie' : '');
  const poster = item => /^\/[A-Za-z0-9_/-]+\.(?:jpg|png|webp)$/i.test(item.posterPath || '') ? 'https://image.tmdb.org/t/p/w500' + item.posterPath : '';
  const prettyDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('en-GB', {dateStyle:'medium',timeZone:'UTC'}).format(new Date(value + 'T12:00:00Z')) : '';
  const score = item => Number(item.voteCount) > 0 && Number(item.voteAverage) > 0 ? `<span class="movie-card__score" aria-label="TMDB viewer rating ${Number(item.voteAverage).toFixed(1)} out of 10 from ${Number(item.voteCount)} votes"><small>TMDB </small>${Number(item.voteAverage).toFixed(1)}<small>/10</small></span>` : '<span class="fr-media-unrated">Not yet rated</span>';
  const trailer = item => {
    const key = item.trailer?.key || item.trailerVideoId;
    const attr = /^[A-Za-z0-9_-]{11}$/.test(key || '') ? `data-trailer-video="${escape(key)}"` : `data-media-trailer data-media-type="${mediaType(item)}" data-tmdb-id="${id(item)}"`;
    return `<button type="button" class="fr-trailer-button" ${attr} data-trailer-title="${escape(item.title)}" aria-label="Play trailer for ${escape(item.title)}"><span aria-hidden="true">▶</span> PLAY TRAILER</button>`;
  };
  const card = (item, rank) => {
    const image = poster(item);
    const date = prettyDate(item.releaseDate || item.firstReleaseDate);
    const label = item.releaseCountry==='GB'?'UK release':mediaType(item)==='tv'?'First aired':'First release';
    return `<article class="movie-card fr-media-card" data-media-type="${mediaType(item)}" data-tmdb-id="${id(item)}"><a class="movie-card__art fr-media-card__poster" href="${href(item)}" aria-label="Explore ${escape(item.title)}">${image ? `<img class="tmdb-card-poster" src="${image}" alt="${escape(item.title)} poster" loading="lazy" decoding="async" width="500" height="750">` : `<div class="movie-card__poster-fill"><div class="movie-card__placeholder"><strong>${escape(item.title)}</strong><small>Poster unavailable</small></div></div>`}${rank ? `<span class="fr-chart-rank">${rank}</span>` : ''}</a><div class="movie-card__body fr-media-card__body"><div class="movie-card__headline"><h3><a href="${href(item)}">${escape(item.title)}</a></h3>${score(item)}</div><p class="fr-media-card__meta" data-media-field="date">${date ? `${escape(label)} · ${escape(date)}${item.releaseCountry ? ' · ' + escape(item.releaseCountry) : ''}` : 'Premiere date not announced'}</p><p class="movie-card__text">${escape(item.overview || 'Explore the title details and available trailer.')}</p><div class="fr-media-card__actions">${trailer(item)}<a href="${href(item)}">DETAILS →</a></div></div></article>`;
  };
  window.FR_CATALOGUE = {escape,mediaType,id,href,poster,prettyDate,score,trailer,card};

  // Catalogue responses carry safe public metadata; credentials remain on the server.
  const root = document.querySelector('[data-catalogue-type]');
  if (root) {
    const type = root.dataset.catalogueType;
    const thisYear = new Date().getFullYear();
    const url = new URL(location.href);
    const requestedYear = Number(url.searchParams.get('year'));
    for (const section of root.querySelectorAll('[data-catalogue-mode]')) {
      const mode = section.dataset.catalogueMode;
      const yearSelect = section.querySelector('[data-catalogue-year]');
      const form = section.querySelector('[data-catalogue-search]');
      const list = section.querySelector('[data-catalogue-list]');
      const status = section.querySelector('.fr-catalogue-status');
      const pagination = section.querySelector('[data-catalogue-pagination]');
      let page = 1;
      let history = [];
      let request = 0;
      let controller;
      let year = requestedYear >= 1888 && requestedYear <= thisYear ? requestedYear : thisYear;
      let query = '';
      if (yearSelect) {
        const firstYear = type === 'tv' ? 1940 : 1888;
        yearSelect.innerHTML = Array.from({length:thisYear - firstYear + 1}, (_, index) => `<option value="${thisYear - index}">${thisYear - index}</option>`).join('');
        yearSelect.value = String(year);
        yearSelect.addEventListener('change', () => { year = Number(yearSelect.value); page = 1; history = []; load(); });
      }
      form?.addEventListener('submit', event => {
        event.preventDefault();
        query = form.querySelector('input').value.trim();
        page = 1;
        history = [];
        load();
      });
      async function load() {
        const requestNumber = ++request;
        controller?.abort();
        controller = new AbortController();
        const signal = controller.signal;
        list.setAttribute('aria-busy', 'true');
        status.textContent = 'Loading titles…';
        pagination.replaceChildren();
        const params = new URLSearchParams({type, mode, page:String(page)});
        if (yearSelect) params.set('year', String(year));
        if (query) params.set('query', query);
        try {
          const response = await fetch('/api/catalogue?' + params, {headers:{accept:'application/json'}, signal});
          if (!response.ok) throw new Error('Catalogue unavailable');
          let data = await response.json();
          if (request !== requestNumber) return;
          if (!Array.isArray(data.items)) throw new Error('Catalogue unavailable');
          let items = data.items.filter(item => id(item) > 0 && item.title);
          if (type === 'indie' && mode === 'chart') {
            const collected = new Map(items.map(item => [id(item), item]));
            const seenPages = new Set([page]);
            let batches = 1;
            // Each server request screens 40 candidates. Continue past studio
            // titles, with a bounded client budget and cancellation on year changes.
            while (collected.size < 20 && Number(data.nextPage) > 0 && batches < 12) {
              const next = Number(data.nextPage);
              if (seenPages.has(next)) break;
              seenPages.add(next); batches++;
              status.textContent = `Finding independent horror… ${collected.size} qualifying films`;
              params.set('page', String(next));
              const continuation = await fetch('/api/catalogue?' + params, {headers:{accept:'application/json'}, signal});
              if (!continuation.ok) break;
              data = await continuation.json();
              if (request !== requestNumber) return;
              for (const item of data.items || []) if (id(item) > 0 && item.title && Number(item.voteCount) >= 50) collected.set(id(item),item);
            }
            items = [...collected.values()].sort((a,b) => Number(b.voteAverage)-Number(a.voteAverage) || Number(b.voteCount)-Number(a.voteCount) || a.title.localeCompare(b.title)).slice(0,20);
          }
          list.innerHTML = items.map((item, index) => card(item, mode === 'chart' ? index + 1 : null)).join('');
          if (mode === 'chart') {
            status.textContent = items.length ? `${year} · ${items.length} ${type === 'tv' ? 'shows' : 'films'} · TMDB viewer ratings · 50+ votes` : `No ${year} titles meet the 50-vote chart minimum yet. Explore another year or the archive.`;
          } else status.textContent = items.length ? `${items.length} ${type === 'tv' ? 'shows' : items.length === 1 ? 'film' : 'films'}${mode === 'archive' ? ' · ' + year : ''}${data.stale ? ' · Last available update' : ''}` : (mode === 'cinema' ? 'No upcoming UK theatrical dates are verified yet. Check back for new announcements.' : mode === 'upcoming' ? 'No upcoming premiere dates are listed yet. Check back for new announcements.' : 'No matching titles. Try another year or title.');
          const totalPages = Math.max(1, Math.min(500, Number(data.totalPages) || 1));
          if (mode !== 'chart' && totalPages > 1 && (mode !== 'cinema' || data.nextPage || history.length)) {
            const previous = document.createElement('button');
            previous.className = 'button button--outline'; previous.type = 'button'; previous.textContent = '← PREVIOUS'; previous.disabled = history.length === 0;
            previous.addEventListener('click', () => {page = history.pop() || 1; load(); section.scrollIntoView({block:'start'});});
            const count = document.createElement('span'); count.textContent = `Page ${page} of ${totalPages}`;
            const next = document.createElement('button');
            next.className = 'button button--outline'; next.type = 'button'; next.textContent = 'NEXT →'; const nextPage = data.nextPage === null ? null : Number(data.nextPage) || (page < totalPages ? page + 1 : null); next.disabled = !nextPage || nextPage > totalPages;
            next.addEventListener('click', () => {history.push(page); page = nextPage; load(); section.scrollIntoView({block:'start'});});
            pagination.append(previous, count, next);
          }
          if (items.length) window.dispatchEvent(new CustomEvent('fr:media-rendered', {detail:{root:list}}));
        } catch {
          if (request !== requestNumber) return;
          list.replaceChildren();
          status.textContent = 'Titles could not load. Please try again.';
          const retry = document.createElement('button'); retry.className = 'button button--outline'; retry.type = 'button'; retry.textContent = 'TRY AGAIN'; retry.addEventListener('click', load); pagination.append(retry);
        } finally { if (request === requestNumber) list.setAttribute('aria-busy', 'false'); }
      }
      load();
    }
  }
})();
