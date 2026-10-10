(async () => {
  'use strict';
  const root = document.querySelector('#media-detail');
  const ui = window.FR_CATALOGUE;
  if (!root || !ui) return;
  const params = new URLSearchParams(location.search);
  const type = params.get('type') === 'tv' ? 'tv' : 'movie';
  const id = params.get('id');
  const back = type === 'tv' ? '/tv-shows.html' : '/movies.html';
  const escape = ui.escape;
  if (!/^\d{1,10}$/.test(id || '')) {
    root.innerHTML = `<h1>TITLE NOT FOUND</h1><p>This title link is incomplete. <a href="${back}">Browse ${type === 'tv' ? 'TV shows' : 'horror films'} →</a></p>`;
    root.setAttribute('aria-busy','false');
    return;
  }
  async function load() {
    root.setAttribute('aria-busy','true');
    try {
      const response = await fetch('/api/media?' + new URLSearchParams({type,id}), {headers:{accept:'application/json'}});
      if (!response.ok) throw new Error('Title unavailable');
      const data = await response.json();
      const item = data.item;
      if (!item?.title || !Number(item.tmdbId)) throw new Error('Title unavailable');
      document.title = item.title + ' | Frightertainment';
      document.body.dataset.theme = type === 'tv' ? 'tv' : 'movies';
      const image = ui.poster(item);
      const date = ui.prettyDate(item.releaseDate || item.firstReleaseDate);
      const key = item.trailer?.key || item.trailerVideoId;
      const source = `https://www.themoviedb.org/${type}/${Number(item.tmdbId)}`;
      const genres = (item.genres || []).map(genre => typeof genre === 'string' ? genre : genre.name).filter(Boolean).join(' · ');
      root.innerHTML = `<a class="fr-media-back" href="${back}">← ${type === 'tv' ? 'HORROR TV' : 'HORROR MOVIES'}</a><div class="fr-media-detail__hero"><div class="fr-media-detail__poster">${image ? `<img src="${image}" alt="${escape(item.title)} poster" width="500" height="750">` : `<div class="fr-media-detail__placeholder">${escape(item.title)}<small>Poster unavailable</small></div>`}</div><div class="fr-media-detail__copy"><span class="hub-eyebrow">${type === 'tv' ? 'HORROR SERIES' : 'FILM FILE'}</span><h1>${escape(item.title)}</h1>${genres ? `<p class="fr-media-detail__genres">${escape(genres)}</p>` : ''}<p class="fr-media-detail__date">${date ? `${escape(item.releaseCountry==='GB'?'UK release':type==='tv'?'First aired':'First release')} · ${escape(date)}${item.releaseCountry ? ' · ' + escape(item.releaseCountry) : ''}` : 'Premiere date not announced'}</p><div class="fr-media-detail__score">${ui.score(item)}${Number(item.voteCount) > 0 ? `<span>${Number(item.voteCount).toLocaleString('en-GB')} viewer votes</span>` : ''}</div><p>${escape(item.overview || 'A synopsis is not available for this title yet.')}</p><div class="fr-media-card__actions">${/^[A-Za-z0-9_-]{11}$/.test(key || '') ? ui.trailer(item) : '<span class="fr-media-unrated">No official trailer available yet</span>'}<a href="${source}" target="_blank" rel="noopener noreferrer">TITLE ON TMDB ↗</a></div></div></div><p class="tmdb-notice">Posters, synopses and viewer ratings via TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB. <a href="/credits.html">Credits and attribution</a>.</p>`;
    } catch {
      root.innerHTML = `<h1>TITLE UNAVAILABLE</h1><p>We could not load this title right now.</p><button class="button button--outline" type="button" id="media-retry">TRY AGAIN</button> <a href="${back}">Browse ${type === 'tv' ? 'TV shows' : 'films'} →</a>`;
      root.querySelector('#media-retry')?.addEventListener('click',load);
    } finally { root.setAttribute('aria-busy','false'); }
  }
  load();
})();
