(() => {
  'use strict';
  const movies = Array.isArray(window.FR_MOVIES) ? window.FR_MOVIES : [];
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const grid = $('#movie-grid');
  const dialog = $('#movie-dialog');
  const dialogInner = $('#dialog-inner');
  const current = {filter:'all',query:'',sort:'date',focusReturn:null};
  const escapeHTML = (text) => String(text ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const safeURL = (url) => {try {let p=new URL(url);return ['https:','http:'].includes(p.protocol)?p.href:''} catch{return ''}};
  const cleanID = id => /^[A-Za-z0-9_-]{11}$/.test(id||'') ? id : '';
  const dayDate = date => new Date(`${date}T12:00:00Z`);
  const niceDate = (date) => new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(dayDate(date));
  const compactDate = (date) => new Intl.DateTimeFormat('en-GB',{month:'short',timeZone:'UTC'}).format(dayDate(date)).toUpperCase();
  const normalise = r => (typeof r.score === 'number' && typeof r.outOf === 'number' && r.outOf > 0 && r.score >= 0 && r.score <= r.outOf && safeURL(r.url)) ? 100 * r.score / r.outOf : null;
  const validReviews = movie => (movie.reviews || []).filter(r => normalise(r) !== null);
  const frightIndex = movie => {
    const ratings = validReviews(movie).map(normalise);
    if(!ratings.length) return null;
    return Math.round(ratings.reduce((a,b)=>a+b,0) / ratings.length);
  };
  const posterMarkup = (movie, className) => {
    const url = safeURL(movie.poster);
    const words = escapeHTML(movie.title).replace(/ /g, '<wbr> ');
    const placeholder = `<div class="movie-card__placeholder movie-card__placeholder--${escapeHTML(movie.posterTheme || 'other')}">${words}</div>`;
    return `<div class="${className}" aria-label="Poster for ${escapeHTML(movie.title)}">${placeholder}${url ? `<img loading="lazy" decoding="async" referrerpolicy="no-referrer" src="${escapeHTML(url)}" alt="Promotional artwork for ${escapeHTML(movie.title)}" onerror="this.classList.add('is-broken')">`:''}</div>`;
  };
  const cardMarkup = (movie) => {
    const [year,month,day] = movie.release.split('-');
    const score=frightIndex(movie);
    const shortText = escapeHTML(movie.teaser||movie.synopsis);
    return `<article class="movie-card">
      <button class="movie-card__art" data-open-movie="${escapeHTML(movie.id)}" aria-label="Explore ${escapeHTML(movie.title)}">
        ${posterMarkup(movie,'movie-card__poster-fill')}
        <span class="movie-card__date"><strong>${day}</strong><span>${compactDate(movie.release)} '${year.slice(-2)}</span></span>
        <span class="movie-card__overlay">EXPLORE THIS FILM <span aria-hidden="true">↗</span></span>
      </button>
      <div class="movie-card__body"><div class="movie-card__eyebrow">${escapeHTML(movie.genre)} <span style="color:#5f5350">/ ${escapeHTML(movie.year)}</span></div>
      <div class="movie-card__headline"><h3>${escapeHTML(movie.title)}</h3>${score===null?'<span class="movie-card__score movie-card__score--pending">AWAITING<br>REVIEWS</span>':`<span title="Frightertainment Fright Index" class="movie-card__score">${score}<small>/100</small></span>`}</div>
      <p class="movie-card__text">${shortText}</p><div class="movie-card__footer"><span>${niceDate(movie.release)}</span><button data-open-movie="${escapeHTML(movie.id)}" aria-label="Details for ${escapeHTML(movie.title)}">DETAILS ↗</button></div></div>
    </article>`;
  };
  function render(){
    const filtered=movies.filter(m => {
      const matchesFilter=current.filter === 'all' || (current.filter==='rated' ? frightIndex(m)!==null : String(m.year)===current.filter);
      const q = current.query.toLowerCase().trim();
      const matchesSearch=!q || [m.title,m.genre,m.director,m.studio].some(s=>String(s||'').toLowerCase().includes(q));
      return matchesFilter && matchesSearch;
    });
    filtered.sort((a,b)=>current.sort==='title'?a.title.localeCompare(b.title):current.sort==='score'?(frightIndex(b)??-1)-(frightIndex(a)??-1)||a.release.localeCompare(b.release):a.release.localeCompare(b.release));
    grid.innerHTML=filtered.map(cardMarkup).join('');
    $('#empty-state').hidden=filtered.length!==0;
    $('#total-count').textContent=String(movies.length).padStart(2,'0');
  }
  function renderReviews(m){
    const reviews=validReviews(m);
    const score=frightIndex(m);
    const scoreLabel=score===null?'AWAITING REVIEWS':`${score}<small>/100</small>`;
    const reviewList=reviews.length?reviews.map(r=>`<div class="review-source"><div><div class="review-source__brand">${escapeHTML(r.source)}</div><div class="review-source__detail">${escapeHTML(r.type||'Critic rating')} · checked ${escapeHTML(r.checked||'manually')}</div></div><div class="review-source__right"><strong>${escapeHTML(r.display||`${r.score}/${r.outOf}`)}</strong><a target="_blank" rel="noopener noreferrer" href="${escapeHTML(safeURL(r.url))}">SOURCE ↗</a></div></div>`).join(''):
      `<p class="dialog-pending">No verified critic scores have been entered for this film yet. The Fright Index stays blank until an attributable, published score can be provided. We never invent or predict reviewers' verdicts.</p>`;
    return `<section class="dialog-reviews" aria-label="Critic review scores"><div class="eyebrow eyebrow--small"><span class="eyebrow__line"></span> SOURCED SCORES</div><h4>THE FRIGHT INDEX</h4><div class="dialog-score-line"><span>FRIGHTERTAINMENT AVERAGE<br><small>${reviews.length} VERIFIED ${reviews.length===1?'SOURCE':'SOURCES'}</small></span><strong>${scoreLabel}</strong></div>${reviewList}<p class="dialog-method">Method: selected critics' scores are scaled to /100 and averaged equally, then rounded. Rotten Tomatoes' positive-review percentage and Metacritic's weighted critic score are different measurements. Scores may change; references are dated snapshots, not a live feed. Editorial display is subject to each provider's content and licensing requirements.</p></section>`;
  }
  function renderTrailer(m){
    const id = cleanID(m.trailerId);
    return `<section class="dialog-trailer-area"><div class="eyebrow eyebrow--small"><span class="eyebrow__line"></span> OFFICIAL VIDEO</div><h4>${id?'WATCH THE TRAILER':'TRAILER NOT YET ATTACHED'}</h4><div class="video-frame" id="video-frame">${id?`<button class="button button--red" data-load-iframe="${id}" aria-label="Load the ${escapeHTML(m.title)} trailer">▶ PLAY OFFICIAL TRAILER</button>`:`<div class="video-frame__empty">STAY TUNED<span>Only confirmed, official trailers are added.</span></div>`}</div>${id?`<p class="dialog-method">Official upload: ${escapeHTML(m.trailerChannel)} · Video served by YouTube once you press play. <a href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener noreferrer" style="color:#e9b3b5">Open on YouTube ↗</a></p>`:''}</section>`;
  }
  function openMovie(id, autoTrailer=false){
    const m=movies.find(movie=>movie.id===id);
    if(!m)return;
    current.focusReturn=document.activeElement;
    dialogInner.innerHTML=`<div class="dialog-header"><span>FRIGHTERTAINMENT / FILM FILE / ${escapeHTML(m.year)}</span><button class="dialog-close" data-close-dialog aria-label="Close movie details">×</button></div><div class="dialog-content"><div>${posterMarkup(m,'dialog-poster')}</div><div><div class="dialog-eyebrow">${escapeHTML(m.genre)} / ${escapeHTML(m.studio)}</div><h2 class="dialog-title">${escapeHTML(m.title)}</h2><div class="dialog-facts"><span>${niceDate(m.release)}</span><span>DIRECTOR: ${escapeHTML(m.director)}</span><span>${escapeHTML(m.country)}</span></div><p class="dialog-overview">${escapeHTML(m.synopsis)}</p><div class="dialog-controls">${m.trailerId?`<button class="button button--red" data-scroll-trailer>▶ WATCH TRAILER</button>`:''}${safeURL(m.official)?`<a class="button button--outline" target="_blank" rel="noopener noreferrer" href="${escapeHTML(safeURL(m.official))}">OFFICIAL FILM PAGE ↗</a>`:''}</div><p class="dialog-method">Release information: <a class="dialog-film-source" href="${escapeHTML(safeURL(m.dateSource)||safeURL(m.official))}" rel="noopener noreferrer" target="_blank">CHECK RELEASE SOURCE ↗</a>${m.posterCredit?`<br>Poster artwork © ${escapeHTML(m.posterCredit)} / respective rights holders.`:''}</p></div></div>${renderTrailer(m)}${renderReviews(m)}`;
    dialog.showModal();
    document.body.classList.add('dialog-open');
    $('[data-close-dialog]',dialog).focus();
    if(autoTrailer && cleanID(m.trailerId)) setTimeout(()=>{const btn=$('[data-load-iframe]',dialog);if(btn)btn.scrollIntoView({block:'center',behavior:'smooth'});},80);
  }
  function closeMovie(){
    dialog.close();
  }
  function loadIframe(id){
    const safe=cleanID(id);if(!safe)return;
    const frame=$('#video-frame',dialog);if(!frame)return;
    frame.replaceChildren();
    const iframe=document.createElement('iframe');
    iframe.src=`https://www.youtube-nocookie.com/embed/${safe}?autoplay=1&rel=0`;
    iframe.title='Official film trailer';
    iframe.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.referrerPolicy='strict-origin-when-cross-origin';
    iframe.allowFullscreen=true;
    frame.appendChild(iframe);
  }
  document.addEventListener('click',(e)=>{
    const open=e.target.closest('[data-open-movie]');
    if(open){openMovie(open.dataset.openMovie);return;}
    const watch=e.target.closest('[data-watch]');
    if(watch){openMovie(watch.dataset.watch,true);return;}
    if(e.target.closest('[data-close-dialog]')){closeMovie();return;}
    if(e.target.closest('[data-scroll-trailer]')){$('.dialog-trailer-area',dialog)?.scrollIntoView({behavior:'smooth',block:'center'});return;}
    const load=e.target.closest('[data-load-iframe]');
    if(load){loadIframe(load.dataset.loadIframe);return;}
    const chip=e.target.closest('[data-filter]');
    if(chip){current.filter=chip.dataset.filter;$$('[data-filter]').forEach(b=>{b.classList.toggle('active',b===chip);b.setAttribute('aria-pressed',b===chip?'true':'false')});render();return;}
  });
  dialog.addEventListener('click',e=>{if(e.target===dialog)closeMovie()});
  dialog.addEventListener('close',()=>{document.body.classList.remove('dialog-open');dialogInner.replaceChildren();current.focusReturn?.focus?.()});
  $('#movie-search').addEventListener('input',e=>{current.query=e.target.value;render()});
  $('#movie-sort').addEventListener('change',e=>{current.sort=e.target.value;render()});
  const menu=$('.menu-toggle');
  menu.addEventListener('click',()=>{const nav=$('#mobile-nav');nav.hidden=!nav.hidden;menu.setAttribute('aria-expanded',String(!nav.hidden))});
  $$('#mobile-nav a').forEach(a=>a.addEventListener('click',()=>{$('#mobile-nav').hidden=true;menu.setAttribute('aria-expanded','false')}));
  $('#year').textContent=String(new Date().getFullYear());
  const rated=movies.find(m=>m.id==='victorian-psycho');
  const demoScore=frightIndex(rated);
  if(demoScore!==null){$('#demo-score').textContent=demoScore;$('#demo-index').textContent=`${demoScore} / 100`;$('.score-dial').style.background=`conic-gradient(var(--red) 0 ${demoScore}%, #312326 ${demoScore}%)`}
  render();
  // Read-only, useful during deployment smoke tests in browser developer tools.
  window.Frightertainment={count:movies.length,frightIndex,openMovie};
})();
