(() => {
  'use strict';
  const movies = Array.isArray(window.FR_MOVIES) ? window.FR_MOVIES : [];
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const safeURL = value => { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; } };
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
  const recordYear = movie => Number(firstClaim(movie, 'releaseYear')?.value || firstClaim(movie, 'filmYear')?.value || releaseClaims(movie)[0]?.value?.slice(0,4)) || null;
  const scoreSnapshots = movie => Array.isArray(movie.criticReferenceSnapshots) ? movie.criticReferenceSnapshots : [];
  const externalScoreHTML = movie => {
    const entries = scoreSnapshots(movie).filter(item => item && /^https:\/\//.test(item.url) &&
      /^(positive-review-percentage|weighted-critic-score)$/.test(item.kind) && item.checked && Number.isFinite(item.value));
    if (!entries.length) return '<p class="external-score-empty">External critic scores not yet checked · <a href="/editorial-standards.html">How ratings work</a></p>';
    return '<div class="external-critic-scores"><div class="external-critic-scores__header">CRITIC SCORES AT PUBLISHER · SNAPSHOT '+
      escapeHTML(entries[0].checked)+'</div>'+
      entries.map(item=>'<a class="external-critic-scores__item" href="'+escapeHTML(safeURL(item.url))+
       '" target="_blank" rel="noopener noreferrer"><span>'+escapeHTML(item.source)+'</span><strong>'+escapeHTML(item.display)+'</strong><small>'+escapeHTML(item.kind==='positive-review-percentage'?'Critics giving positive reviews':'Weighted critic score')+' · '+escapeHTML(item.criticCount)+' reviews</small></a>').join('')+
      '</div><small class="score-explainer">Publisher ratings have different methods, can change and are not part of the Fright Index.</small>';
  };
  const cardRelease = movie => {
    const claims = releaseClaims(movie);
    if (claims.length === 1) return `${prettyDate(claims[0].value)} · ${claims[0].territory}`;
    if (claims.length > 1) return `${claims.length} territory-specific dates · see sources`;
    const year = firstClaim(movie, 'releaseYear') || firstClaim(movie, 'filmYear');
    return year ? `${escapeHTML(year.value)} · film year; local availability unconfirmed` : 'Release date and territory unconfirmed';
  };
  const cardMarkup = movie => {
    const score = frightIndex(movie);
    const dates = releaseClaims(movie);
    const displayYear = recordYear(movie) || 'TBC';
    const label = dates.length ? 'SOURCE-CHECKED RELEASE' : 'DATE NOT CONFIRMED';
    const genre = firstClaim(movie, 'genre')?.value || 'HORROR FILM';
    const synopsis = firstClaim(movie, 'synopsis')?.value || 'Verified film identity; further plot information has not been added.';
    const id = encodeURIComponent(movie.id);
    return `<article class="movie-card"><a class="movie-card__art" href="/films/${id}/" aria-label="Read ${escapeHTML(movie.title)} film details">${licensedPoster(movie) ? `<img class="licensed-poster" src="${escapeHTML(safeURL(movie.poster))}" alt="Licensed poster artwork for ${escapeHTML(movie.title)}" loading="lazy">` : `<div class="movie-card__poster-fill"><div class="movie-card__placeholder"><span class="poster-mini">FRIGHTERTAINMENT FILM FILE</span><strong>${escapeHTML(movie.title)}</strong><small>EDITORIAL ART · NOT OFFICIAL POSTER</small></div></div>`}<span class="movie-card__date"><strong>${escapeHTML(displayYear)}</strong><span>${escapeHTML(dates.length > 1 ? 'TERRITORY DATES' : dates.length === 1 ? prettyDate(dates[0].value).toUpperCase() : 'DATE TBC')}</span></span><span class="movie-card__overlay">FILM DETAILS <span aria-hidden="true">></span></span></a>
      <div class="movie-card__body"><div class="movie-card__eyebrow">${escapeHTML(genre)} <span style="color:#827773">/ ${escapeHTML(label)}</span></div><div class="movie-card__headline"><h3><a href="/films/${id}/">${escapeHTML(movie.title)}</a></h3>${score === null ? '<span class="movie-card__score movie-card__score--pending">FRIGHT<br>PENDING</span>' : `<span class="movie-card__score" aria-label="Fright Index ${score} out of 100">${score}<small>/100</small></span>`}</div><p class="movie-card__text">${escapeHTML(synopsis)}</p><div class="movie-card__footer"><span>${escapeHTML(cardRelease(movie))}</span><a href="/films/${id}/">DETAILS ></a></div>${externalScoreHTML(movie)}<div class="movie-card__official"><a href="${escapeHTML(safeURL(firstClaim(movie,'title')?.source||''))}" target="_blank" rel="noopener noreferrer">OFFICIAL FILM PAGE ↗</a>${licensedPoster(movie)? `<small>Poster © ${escapeHTML(movie.posterCredit)}</small>` : ''}</div></div></article>`;
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
        const hasScore = frightIndex(movie) !== null;
        const filterOK = state.filter === 'all' || (state.filter === 'date-tbc' && !dateKnown) ||
          (state.filter === 'reviewed' && (hasScore || scoreSnapshots(movie).length > 0));
        const year = recordYear(movie);
        const yearOK = state.year === 'all' || (state.year === 'older' ? year !== null && year < currentYear-1 :
          state.year === 'future' ? year !== null && year > new Date().getUTCFullYear() :
          year === Number(state.year));
        const searchText = [movie.title, ...claimList(movie).map(claim => claim.value)].join(' ').toLocaleLowerCase();
        return filterOK && yearOK && searchText.includes(state.query.trim().toLocaleLowerCase());
      });
      filtered.sort((a, b) => state.sort === 'date'
        ? (releaseClaims(a)[0]?.value || firstClaim(a, 'releaseYear')?.value || '9999').localeCompare(releaseClaims(b)[0]?.value || firstClaim(b, 'releaseYear')?.value || '9999') || a.title.localeCompare(b.title)
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
  }

  const trailerGrid = $('#trailer-grid');
  if (trailerGrid) {
    const verifiedTrailers = movies.filter(movie => movie.trailer && /^[A-Za-z0-9_-]{11}$/.test(movie.trailer.videoId || '') && safeURL(movie.trailer.source));
    trailerGrid.innerHTML = verifiedTrailers.length ? verifiedTrailers.map(movie => `<article class="verified-trailer"><div class="verified-trailer__screen"><button class="button button--red" type="button" data-play-video="${escapeHTML(movie.id)}">PLAY OFFICIAL ${escapeHTML(movie.trailer.kind)}</button><div class="verified-trailer__frame" id="home-trailer-${escapeHTML(movie.id)}" hidden></div></div><div class="verified-trailer__meta"><div><h3>${escapeHTML(movie.title)}</h3><p>OFFICIAL UPLOAD · ${escapeHTML(movie.trailer.channel)} · ${escapeHTML(movie.trailer.territory)}</p></div><a href="${escapeHTML(safeURL(movie.trailer.source))}" target="_blank" rel="noopener noreferrer">SOURCE ></a></div></article>`).join('') : '<div class="video-frame video-frame__empty-block"><div class="video-frame__empty">NO VERIFIED TRAILERS<span>Check back when an exact official studio or distributor upload has been confirmed.</span></div></div>';
    trailerGrid.addEventListener('click', event => {
      const button = event.target.closest('[data-play-video]');
      if (!button) return;
      const movie = movies.find(item => item.id === button.dataset.playVideo);
      const trailer = movie?.trailer;
      if (!movie || !trailer) return;
      const frame = $(`#home-trailer-${CSS.escape(movie.id)}`, trailerGrid);
      if (!frame || frame.querySelector('iframe')) return;
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${trailer.videoId}?autoplay=1&rel=0`;
      iframe.title = `Official ${movie.title} ${trailer.kind}`;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin'; iframe.allowFullscreen = true;
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
      const releaseYear = firstClaim(movie, 'releaseYear');
      const reviews = validReviews(movie);
      const score = frightIndex(movie);
      const trailer = movie.trailer && /^[A-Za-z0-9_-]{11}$/.test(movie.trailer.videoId || '') && safeURL(movie.trailer.source) ? movie.trailer : null;
      const sources = reviews.length ? reviews.map(review => `<li class="film-claim"><div><strong>${escapeHTML(review.source)}</strong><p>${escapeHTML(review.display || `${review.score}/${review.outOf}`)} · ${escapeHTML(review.type || 'Critic score')}</p><small>CHECKED ${escapeHTML(review.checked)} · ${escapeHTML(review.territory || 'Territory not stated')}</small></div><a href="${escapeHTML(safeURL(review.url))}" target="_blank" rel="noopener noreferrer">Review source ></a></li>`).join('') : '<li class="film-claim"><div><strong>No eligible critic scores</strong><p>No verified, permission-cleared critic ratings are available.</p></div></li>';
      const marketNote = dates.length ? dates.map(claim => `${prettyDate(claim.value)} (${claim.territory})`).join('; ') : releaseYear ? `Release year ${escapeHTML(releaseYear.value)}; ${escapeHTML(releaseYear.territory)}.` : 'A territory-specific release date has not been confirmed.';
      const synopsis = firstClaim(movie, 'synopsis');
      page.innerHTML = `<div class="eyebrow eyebrow--small"><span class="eyebrow__line"></span> PRIMARY-SOURCE FILM FILE</div><h1>${escapeHTML(movie.title)}</h1><p class="film-status">${escapeHTML(marketNote)} Facts below are linked individually to their source, territory scope and check date. A missing release date means the cited source did not confirm one for a stated market.</p>
        <section class="film-section"><h2>SOURCED FILM DETAILS</h2>${synopsis ? `<p class="film-page__synopsis">${escapeHTML(synopsis.value)}</p>` : ''}<ul class="source-list">${claims.map(claimMarkup).join('')}</ul></section>
        <section class="film-section"><h2>PUBLISHED CRITIC RATINGS</h2>${externalScoreHTML(movie)}<p>Separately attributed editorial snapshots from the linked publishers, not live updates or Frightertainment scores.</p></section>
        <section class="film-section"><h2>FRIGHT INDEX</h2><p class="film-score">${score === null ? '—' : `${score} / 100`}</p><p>Method: eligible critic scores are converted to /100, equally weighted, averaged and rounded to the nearest whole number. Only linked, dated scores with confirmed reuse approval are included. This comparison is not an independent critic verdict.</p><ul class="source-list">${sources}</ul></section>
        ${trailer ? `<section class="film-section"><h2>OFFICIAL TRAILER</h2><button class="button button--red" id="play-trailer">PLAY TRAILER</button><div class="video-frame" id="film-trailer" hidden></div><p>Official upload: ${escapeHTML(trailer.channel)}. <a href="${escapeHTML(safeURL(trailer.source))}" target="_blank" rel="noopener noreferrer">View primary trailer source ></a> · ${escapeHTML(trailer.territory)}</p></section>` : '<section class="film-section"><h2>TRAILER</h2><p>No exact official video upload is attached to this film record.</p></section>'}
        ${licensedPoster(movie) ? `<p class="film-credit">Artwork: ${escapeHTML(movie.posterCredit)} · ${escapeHTML(movie.posterPermission)}</p>` : ''}<p><a href="/movies.html#upcoming">← Back to film listings</a></p>`;
      document.title = `${movie.title} — Frightertainment`;
      const play = $('#play-trailer', page);
      if (play) play.addEventListener('click', () => {
        const frame = $('#film-trailer', page);
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube-nocookie.com/embed/${trailer.videoId}?autoplay=1&rel=0`;
        iframe.title = `Official ${movie.title} trailer`; iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'; iframe.referrerPolicy = 'strict-origin-when-cross-origin'; iframe.allowFullscreen = true;
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
