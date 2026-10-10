(() => {
  'use strict';
  const movies = Array.isArray(window.FR_MOVIES) ? window.FR_MOVIES : [];
  const artByFilm = new Map();
  const communityScore = movie => {
    const item = artByFilm.get(movie.id);
    return Number.isFinite(item?.voteAverage) && item.voteAverage > 0 &&
      Number.isInteger(item?.voteCount) && item.voteCount >= 50 ? item : null;
  };
  const tmdbArtwork = movie => {
    const path = artByFilm.get(movie.id)?.posterPath;
    return /^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\.(?:jpg|png|webp)$/i.test(path || '') ?
      'https://image.tmdb.org/t/p/w500' + path : '';
  };
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const safeURL = value => { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; } catch { return ''; } };
  const licensedPoster = movie => movie.posterLicenceStatus === 'approved' &&
    Boolean(safeURL(movie.poster) && safeURL(movie.posterSourcePage) &&
    safeURL(movie.posterPermissionEvidence) && movie.posterCredit &&
    movie.posterPermission && movie.posterUsageScope);
  const claimList = movie => Array.isArray(movie.claims) ? movie.claims : [];
  const claimsFor = (movie, field) => claimList(movie).filter(claim => claim.field === field);
  const firstClaim = (movie, field) => claimsFor(movie, field)[0] || null;
  const releaseClaims = movie => claimsFor(movie, 'releaseDate');
  const prettyDate = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return '';
    const date = new Date(`${value}T12:00:00Z`);
    return Number.isNaN(date.valueOf()) ? '' : new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(date);
  };
  const normalise = review => typeof review.score === 'number' && typeof review.outOf === 'number' && review.outOf > 0 && review.score >= 0 && review.score <= review.outOf && safeURL(review.url) && review.source && review.checked && review.permission === "approved" ? review.score * 100 / review.outOf : null;
  const validReviews = movie => {
    const used = new Set();
    return (movie.reviews || []).filter(review => {
      const key = String(review.criticId || review.criticName || review.source || '')+'|'+String(review.url || '');
      if (!review.professionalVerified || normalise(review) === null || used.has(key)) return false;
      used.add(key);
      return true;
    });
  };
  const frightIndex = movie => {
    const scores = validReviews(movie).map(normalise);
    return scores.length >= 3 ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null;
  };
  const recordHasDate = movie => releaseClaims(movie).length > 0;
  const recordYear = movie => Number(firstClaim(movie, 'filmYear')?.value) || null;
  const listingYear = movie => recordYear(movie) || Number(firstClaim(movie, 'releaseYear')?.value || releaseClaims(movie)[0]?.value?.slice(0,4)) || null;
  const cardRelease = movie => {
    const claims = releaseClaims(movie);
    if (claims.length === 1) return `${prettyDate(claims[0].value)} · ${claims[0].territory}`;
    if (claims.length > 1) return `${claims.length} territory-specific dates · see sources`;
    const year = firstClaim(movie, 'filmYear');
    if (year) return `${escapeHTML(year.value)} film year · market date unconfirmed`;
    const territoryYear = firstClaim(movie, 'releaseYear');
    return territoryYear ? `Territory release year ${escapeHTML(territoryYear.value)} · ${escapeHTML(territoryYear.territory || 'territory not stated')}` : 'Release year and territory unconfirmed';
  };
  const movieHeroMarkup = movie => {
    const year=recordYear(movie)||'FILM YEAR UNCONFIRMED';
    const coverStyle = [...movie.id].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 6;
    const genre=firstClaim(movie,'genre')?.value||'Horror cinema';
    const director=firstClaim(movie,'director')?.value;
    const cast=firstClaim(movie,'cast')?.value;
    const synopsis=firstClaim(movie,'synopsis')?.value ||
      'Explore the verified film information and original source links below. Additional story details will appear after editorial checks.';
    return '<section class="fr-movie-hero" aria-label="Film overview">'+
      '<div class="fr-movie-hero__art" data-cover-style="'+coverStyle+'" role="img" aria-label="Original Frightertainment title artwork, not an official movie poster">'+
      '<span class="fr-movie-hero__studio">FRIGHTERTAINMENT · CINEMA FILE</span>'+
      '<span class="fr-movie-hero__year">'+escapeHTML(year)+'</span>'+
      '<strong>'+escapeHTML(movie.title)+'</strong>'+
      '<small>FRIGHTERTAINMENT ARTWORK</small></div>'+
      '<div class="fr-movie-hero__info"><span class="hub-eyebrow">WELCOME TO THE HORROR FILE</span>'+
      '<h1>'+escapeHTML(movie.title)+'</h1>'+
      '<p class="fr-movie-hero__genre">'+escapeHTML(genre)+' · '+escapeHTML(year)+'</p>'+
      '<p class="fr-movie-hero__synopsis">'+escapeHTML(synopsis)+'</p>'+
      '<div class="fr-movie-hero__facts">'+
      (director?'<div><span>DIRECTED BY</span><strong>'+escapeHTML(director)+'</strong></div>':'')+
      (cast?'<div><span>FEATURED CAST</span><strong>'+escapeHTML(cast)+'</strong></div>':'')+
      '</div><a class="fr-movie-hero__browse" href="'+(recordYear(movie)?'/all-horror-movies.html?year='+encodeURIComponent(year):'/all-horror-movies.html')+'">'+(recordYear(movie)?'EXPLORE MORE HORROR FROM '+escapeHTML(year):'EXPLORE THE HORROR VAULT')+' →</a>'+
      '</div></section>';
  };
  const cardMarkup = movie => {
    const score = frightIndex(movie);
    const community = communityScore(movie);
    const dates = releaseClaims(movie);
    const displayYear = recordYear(movie) || 'YEAR UNCONFIRMED';
    const label = dates.length ? 'SOURCE-CHECKED RELEASE' : 'DATE NOT CONFIRMED';
    const genre = firstClaim(movie, 'genre')?.value || 'HORROR FILM';
    const synopsis = firstClaim(movie, 'synopsis')?.value || 'Verified film identity; further plot information has not been added.';
    const id = encodeURIComponent(movie.id);
    const coverStyle = [...movie.id].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 6;
    return `<article class="movie-card"><a class="movie-card__art" href="/films/${id}/" aria-label="Read ${escapeHTML(movie.title)} film details">${licensedPoster(movie) ? `<img class="licensed-poster" src="${escapeHTML(safeURL(movie.poster))}" alt="Licensed poster artwork for ${escapeHTML(movie.title)}" loading="lazy">` : `<div class="movie-card__poster-fill"><div class="movie-card__placeholder" data-cover-style="${coverStyle}"><span class="poster-mini">FRIGHTERTAINMENT FILM FILE</span><strong>${escapeHTML(movie.title)}</strong><small>FRIGHTERTAINMENT ART</small></div></div>${tmdbArtwork(movie) ? `<img class="tmdb-card-poster" src="${escapeHTML(tmdbArtwork(movie))}" alt="TMDB poster for ${escapeHTML(movie.title)}" loading="lazy" decoding="async">` : ''} `}<span class="movie-card__date"><strong>${escapeHTML(displayYear)}</strong><span>${escapeHTML(dates.length > 1 ? 'TERRITORY DATES' : dates.length === 1 ? prettyDate(dates[0].value).toUpperCase() : 'DATE TBC')}</span></span><span class="movie-card__overlay">FILM DETAILS <span aria-hidden="true">></span></span></a>
      <div class="movie-card__body"><div class="movie-card__eyebrow">${escapeHTML(genre)} <span class="movie-card__release-label">/ ${escapeHTML(label)}</span></div><div class="movie-card__headline"><h3><a href="/films/${id}/">${escapeHTML(movie.title)}</a></h3>${score !== null ? `<span class="movie-card__score" aria-label="Fright Rating ${(score / 10).toFixed(1)} out of 10">${(score / 10).toFixed(1)}<small>/10</small></span>` :
        community ? `<span class="movie-card__score" aria-label="TMDB community rating ${community.voteAverage.toFixed(1)} out of 10 from ${community.voteCount} votes"><small>TMDB </small>${community.voteAverage.toFixed(1)}<small>/10</small></span>` : ''}</div><p class="movie-card__text">${escapeHTML(synopsis)}</p><div class="movie-card__footer"><span>${escapeHTML(cardRelease(movie))}</span><a href="/films/${id}/">DETAILS ></a></div><div class="movie-card__official"><a href="${escapeHTML(safeURL(firstClaim(movie,'title')?.source||''))}" target="_blank" rel="noopener noreferrer">OFFICIAL FILM PAGE →</a>${licensedPoster(movie)? `<small>Poster © ${escapeHTML(movie.posterCredit)}</small>` : ''}</div></div></article>`;
  };
  const grid = $('#movie-grid');
  if (grid) {
    const currentYear=new Date().getUTCFullYear();
    const state = { filter: 'all', query: '', sort: 'title', visible: 8, year: String(currentYear) };
    const yearMenu=$('#movie-year');
    if(yearMenu){
      const options=[
        {value:String(currentYear),label:currentYear+' RELEASES'},
        {value:String(currentYear-1),label:(currentYear-1)+' RELEASES'},
        {value:'older',label:'BEFORE '+(currentYear-1)+' · ARCHIVE'},
        {value:'future',label:(currentYear+1)+' ONWARDS'},
        {value:'all',label:'ALL RELEASE YEARS'}
      ];
      yearMenu.replaceChildren(...options.map(item=>{
        const opt=document.createElement('option');opt.value=item.value;opt.textContent=item.label;
        return opt;
      }));
      yearMenu.value=state.year;
    }
    const render = () => {
      const filtered = movies.filter(movie => {
        const dateKnown = recordHasDate(movie);
        const hasScore = frightIndex(movie) !== null || communityScore(movie) !== null;
        const filterOK = state.filter === 'all' || (state.filter === 'date-tbc' && !dateKnown) ||
          (state.filter === 'reviewed' && hasScore);
        const year = listingYear(movie);
        const yearOK = state.year === 'all' || (state.year === 'older' ? year !== null && year < currentYear-1 :
          state.year === 'future' ? year !== null && year > new Date().getUTCFullYear() :
          year === Number(state.year));
        const searchText = [movie.title, ...claimList(movie).map(claim => claim.value)].join(' ').toLocaleLowerCase();
        return filterOK && yearOK && searchText.includes(state.query.trim().toLocaleLowerCase());
      });
      filtered.sort((a, b) => state.sort === 'date'
        ? (releaseClaims(a)[0]?.value || firstClaim(a, 'filmYear')?.value || firstClaim(a, 'releaseYear')?.value || '9999').localeCompare(releaseClaims(b)[0]?.value || firstClaim(b, 'filmYear')?.value || firstClaim(b, 'releaseYear')?.value || '9999') || a.title.localeCompare(b.title)
        : a.title.localeCompare(b.title));
      grid.innerHTML = filtered.slice(0,state.visible).map(cardMarkup).join('');
      const more = $('#movie-more');
      if (more) { more.hidden = filtered.length <= state.visible; more.textContent = `SHOW MORE FILMS (${Math.min(8, filtered.length-state.visible)} NEXT)`; }
      const shown = $('#movie-shown');
      if(shown) shown.textContent = `Showing ${Math.min(state.visible,filtered.length)} of ${filtered.length}`;
      $('#empty-state').hidden = filtered.length > 0;
      $('#results-count').textContent = `${filtered.length} ${filtered.length === 1 ? 'film' : 'films'}`;
      $('#total-count').textContent = String(movies.length).padStart(2, '0');
      const scope=$('#movie-year-title');
      if (scope) scope.textContent=state.year==='all'?'ALL FILM YEARS':state.year==='older'?'BEFORE '+(currentYear-1):state.year==='future'?'FUTURE FILMS':state.year+' HORROR FILMS';
    };
    document.addEventListener('click', event => {
      const chip = event.target.closest('[data-filter]');
      if (!chip) return;
      state.filter = chip.dataset.filter;
      state.visible = 8;
      $$('[data-filter]').forEach(button => { const active = button === chip; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
      render();
    });
    $('#movie-search').addEventListener('input', event => { state.query = event.target.value; state.visible = 8; render(); });
    $('#movie-sort').addEventListener('change', event => { state.sort = event.target.value; state.visible = 8; render(); });
    $('#movie-year')?.addEventListener('change', event => { state.year = event.target.value; state.visible = 8; render(); });
    $('#movie-more')?.addEventListener('click', () => { state.visible += 8; render(); });
    render();
    grid.addEventListener('error', event => {
      if (event.target?.matches('img.tmdb-card-poster')) event.target.classList.add('is-broken');
    }, true);
    fetch('/api/movie-artwork', { headers: { accept: 'application/json' } })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        for (const item of data?.items || []) {
          if (/^[a-z0-9-]{1,80}$/.test(item.id || '')) artByFilm.set(item.id, item);
        }
        const scoreFilter = document.querySelector('[data-filter="reviewed"]');
        if (scoreFilter) scoreFilter.textContent = 'WITH CHECKED SCORES';
        render();
      }).catch(() => { /* Keep original film artwork if TMDB is unavailable. */ });
  }

  const filmHero = document.querySelector('.fr-movie-hero__art');
  const filmPageId = document.body.dataset.filmId;
  if (filmHero && /^[a-z0-9-]{1,80}$/.test(filmPageId || '')) {
    fetch('/api/movie-artwork', { headers: { accept: 'application/json' } })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        const item = data?.items?.find(value => value.id === filmPageId);
        if (!/^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\.(?:jpg|png|webp)$/i.test(item?.posterPath || '')) return;
        const image = document.createElement('img');
        image.className = 'fr-movie-hero__poster';
        image.src = 'https://image.tmdb.org/t/p/w500' + item.posterPath;
        image.alt = '';
        image.addEventListener('error', () => image.remove(), { once: true });
        filmHero.prepend(image);
        filmHero.setAttribute('aria-label', 'TMDB poster artwork and Frightertainment film information for ' + item.title);
        const label = filmHero.querySelector('small');
        if (label) label.textContent = 'POSTER VIA TMDB';
        const notice = document.createElement('p');
        notice.className = 'tmdb-notice';
        notice.textContent = 'Poster via TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB. ';
        const credits = document.createElement('a');
        credits.href = '/credits.html';
        credits.textContent = 'TMDB credits and attribution';
        notice.append(credits);
        filmHero.closest('.fr-movie-hero')?.after(notice);
        if (Number.isFinite(item.voteAverage) && item.voteAverage > 0 &&
            Number.isInteger(item.voteCount) && item.voteCount >= 50) {
          const section = document.createElement('section');
          section.className = 'film-section';
          const heading = document.createElement('h2');
          heading.textContent = 'TMDB COMMUNITY RATING';
          const rating = document.createElement('p');
          rating.className = 'film-score';
          rating.textContent = item.voteAverage.toFixed(1) + '/10';
          const note = document.createElement('p');
          note.textContent = item.voteCount + ' TMDB viewer votes. This is not a professional critic or Fright Rating.';
          const source = document.createElement('a');
          source.href = safeURL(item.sourceUrl);
          source.textContent = 'View rating source on TMDB →';
          source.target = '_blank';
          source.rel = 'noopener noreferrer';
          section.append(heading, rating, note, source);
          const frightSection = [...document.querySelectorAll('.film-section')]
            .find(value => value.querySelector('h2')?.textContent === 'FRIGHT RATING');
          frightSection?.before(section);
        }
      }).catch(() => {});
  }

  const trailerGrid = $('#trailer-grid');
  if (trailerGrid) {
    const verifiedTrailers = movies.filter(movie => movie.trailer && /^[A-Za-z0-9_-]{11}$/.test(movie.trailer.videoId || '') && safeURL(movie.trailer.source));
    trailerGrid.innerHTML = verifiedTrailers.length ? verifiedTrailers.map(movie => `<article class="verified-trailer" data-film-id="${escapeHTML(movie.id)}"><div class="verified-trailer__screen"><div class="verified-trailer__type" aria-hidden="true"><span>FRIGHTERTAINMENT · VIDEO FILE</span><strong>${escapeHTML(movie.title)}</strong><small>OFFICIAL ${escapeHTML(movie.trailer.kind.toUpperCase())}</small></div><button class="button button--red" type="button" aria-label="Play official ${escapeHTML(movie.trailer.kind)}: ${escapeHTML(movie.title)}" data-play-video="${escapeHTML(movie.id)}">PLAY OFFICIAL ${escapeHTML(movie.trailer.kind)}</button><div class="verified-trailer__frame" id="home-trailer-${escapeHTML(movie.id)}" hidden></div></div><div class="verified-trailer__meta"><div><h3>${escapeHTML(movie.title)}</h3><p>OFFICIAL UPLOAD · ${escapeHTML(movie.trailer.channel)} · ${escapeHTML(movie.trailer.territory)}</p></div><a href="${escapeHTML(safeURL(movie.trailer.source))}" target="_blank" rel="noopener noreferrer">OFFICIAL VIDEO SOURCE →</a></div></article>`).join('') : '<div class="video-frame video-frame__empty-block"><div class="video-frame__empty">NO VERIFIED TRAILERS<span>Check back when an exact official studio or distributor upload has been confirmed.</span></div></div>';
    trailerGrid.addEventListener('click', event => {
      const button = event.target.closest('[data-play-video]');
      if (!button) return;
      const movie = movies.find(item => item.id === button.dataset.playVideo);
      const trailer = movie?.trailer;
      if (!movie || !trailer) return;
      const frame = $(`#home-trailer-${CSS.escape(movie.id)}`, trailerGrid);
      if (!frame || frame.querySelector('iframe')) return;
      button.closest('.verified-trailer__screen')?.classList.add('is-playing');
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${trailer.videoId}?autoplay=1&rel=0&playsinline=1`;
      iframe.title = `Official ${movie.title} ${trailer.kind}`;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin'; iframe.allowFullscreen = true; iframe.loading = 'lazy';
      frame.replaceChildren(iframe); frame.hidden = false; button.remove();
    });
  }

  const claimMarkup = claim => {
    const source = safeURL(claim.source);
    return `<li class="film-claim"><div><strong>${escapeHTML(claim.label)}</strong><p>${escapeHTML(claim.value)}</p><small>TERRITORY: ${escapeHTML(claim.territory)} · CHECKED ${escapeHTML(claim.checked)}</small></div><a href="${escapeHTML(source)}" target="_blank" rel="noopener noreferrer">${escapeHTML(claim.sourceName)} ></a></li>`;
  };
  const filmId = document.body.dataset.filmId;
  if (filmId) {
    const movie = movies.find(item => item.id === filmId);
    const page = $('#film-detail');
    if (movie && page) {
      const claims = claimList(movie);
      const dates = releaseClaims(movie);
      const territoryReleaseYear = firstClaim(movie, 'releaseYear');
      const filmYear = firstClaim(movie, 'filmYear');
      const reviews = validReviews(movie);
      const score = frightIndex(movie);
      const trailer = movie.trailer && /^[A-Za-z0-9_-]{11}$/.test(movie.trailer.videoId || '') && safeURL(movie.trailer.source) ? movie.trailer : null;
      const sources = reviews.map(review => `<li class="film-claim"><div><strong>${escapeHTML(review.source)}</strong><p>${escapeHTML(review.display || `${review.score}/${review.outOf}`)} · ${escapeHTML(review.type || 'Critic score')}</p><small>CHECKED ${escapeHTML(review.checked)} · ${escapeHTML(review.territory || 'Territory not stated')}</small></div><a href="${escapeHTML(safeURL(review.url))}" target="_blank" rel="noopener noreferrer">Review source ></a></li>`).join('');
      const marketNote = dates.length ? dates.map(claim => `${prettyDate(claim.value)} (${claim.territory})`).join('; ') : territoryReleaseYear ? `Territory release year ${escapeHTML(territoryReleaseYear.value)}; ${escapeHTML(territoryReleaseYear.territory)}.` : filmYear ? `Film year ${escapeHTML(filmYear.value)}; source: ${escapeHTML(filmYear.sourceName)}.` : 'A territory-specific release date has not been confirmed.';
      const synopsis = firstClaim(movie, 'synopsis');
      const synopsisSource = synopsis ? `<li class="film-claim"><div><strong>Synopsis source</strong><p>Summary shown above.</p><small>CHECKED ${escapeHTML(synopsis.checked)} · ${escapeHTML(synopsis.territory || 'Territory not stated')}</small></div><a href="${escapeHTML(safeURL(synopsis.source))}" target="_blank" rel="noopener noreferrer">${escapeHTML(synopsis.sourceName)} ></a></li>` : '';
      page.innerHTML = `${movieHeroMarkup(movie)}<p class="film-status">${escapeHTML(marketNote)}</p>
        <section class="film-section"><h2>FILM DETAILS</h2><ul class="source-list">${claims.filter(claim => claim.field !== 'synopsis').map(claimMarkup).join('')}${synopsisSource}</ul></section>
        <section class="film-section"><h2>FRIGHT RATING</h2><p class="film-score${score === null ? ' film-score--pending' : ''}">${score === null ? 'Not rated yet.' : `${(score / 10).toFixed(1)} / 10`}</p>${sources ? `<ul class="source-list">${sources}</ul>` : ''}</section>
        ${trailer ? `<section class="film-section"><h2>OFFICIAL TRAILER</h2><button class="button button--red" id="play-trailer">PLAY TRAILER</button><div class="video-frame" id="film-trailer" hidden></div><p>Official upload: ${escapeHTML(trailer.channel)}. <a href="${escapeHTML(safeURL(trailer.source))}" target="_blank" rel="noopener noreferrer">View primary trailer source ></a> · ${escapeHTML(trailer.territory)}</p></section>` : '<section class="film-section"><h2>TRAILER</h2><p>No official trailer linked yet.</p></section>'}
        ${licensedPoster(movie) ? `<p class="film-credit">Artwork: ${escapeHTML(movie.posterCredit)} · ${escapeHTML(movie.posterPermission)}</p>` : ''}<p><a href="/movies.html#upcoming">← Back to film listings</a></p>`;
      document.title = `${movie.title} — Frightertainment`;
      const play = $('#play-trailer', page);
      if (play) play.addEventListener('click', () => {
        const frame = $('#film-trailer', page);
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube-nocookie.com/embed/${trailer.videoId}?autoplay=1&rel=0&playsinline=1`;
        iframe.title = `Official ${movie.title} trailer`; iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'; iframe.referrerPolicy = 'strict-origin-when-cross-origin'; iframe.allowFullscreen = true; iframe.loading = 'lazy';
        frame.replaceChildren(iframe); frame.hidden = false; play.remove();
      });
    }
  }

  const menu = $('.menu-toggle');
  if (menu) {
    menu.addEventListener('click', () => { const nav = $('#mobile-nav'); nav.hidden = !nav.hidden; menu.setAttribute('aria-expanded', String(!nav.hidden)); menu.setAttribute('aria-label', nav.hidden ? 'Open menu' : 'Close menu'); });
    $$('#mobile-nav a').forEach(link => link.addEventListener('click', () => { $('#mobile-nav').hidden = true; menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'Open menu'); }));
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && $('#mobile-nav') && !$('#mobile-nav').hidden) { $('#mobile-nav').hidden = true; menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'Open menu'); menu.focus(); } });
  }
  const year = $('#year'); if (year) year.textContent = String(new Date().getFullYear());
  window.Frightertainment = { count: movies.length, frightIndex };
})();
