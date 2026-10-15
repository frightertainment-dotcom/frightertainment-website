(() => {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const mediaType = item => item.mediaType === 'tv' || item.type === 'tv' ? 'tv' : 'movie';
  const id = item => Number(item.tmdbId || (/^\d+$/.test(String(item.id)) ? item.id : 0));
  const indieEvidence = item => /^https:\/\/(?:www\.)?(?:sundance\.org|sxsw\.com|fantasiafestival\.com|brynchainey\.com|thefilmcatalogue\.com|glasseyepix\.com|ifccenter\.com|bfi\.org\.uk|criterion\.com|tshaonline\.org)\//i.test(item?.indieSourceUrl || '') ? item.indieSourceUrl : '';
  const href = item => !id(item) && item.indieVerified && indieEvidence(item) ? indieEvidence(item) : '/media.html?type=' + mediaType(item) + '&id=' + id(item) + (document.body.dataset.catalogueType === 'indie' ? '&section=indie' : '');
  const poster = item => /^\/[A-Za-z0-9_/-]+\.(?:jpg|png|webp)$/i.test(item.posterPath || '') ? 'https://image.tmdb.org/t/p/w500' + item.posterPath : '';
  const prettyDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('en-GB', {dateStyle:'medium',timeZone:'UTC'}).format(new Date(value + 'T12:00:00Z')) : '';
  // /api/catalogue is TMDB-backed and exposes voteAverage on the 0–10 scale.
  const score = item => item?.ratingKind === 'tmdb-community' ?
    window.FRRatingBadge.html(window.FRRatingBadge.fromTmdbMedia(item, 'compact')) :
    '<span class="fr-media-unrated">Rating unavailable</span>';
  const trailer = item => {
    const key = item.trailer?.key || item.trailerVideoId;
    const verified = /^[A-Za-z0-9_-]{11}$/.test(key || '');
    const attr = verified ? `data-trailer-video="${escape(key)}"` : `data-media-trailer data-media-type="${mediaType(item)}" data-tmdb-id="${id(item)}"`;
    return `<button type="button" class="fr-trailer-button" ${attr} data-trailer-title="${escape(item.title)}" aria-label="Play trailer for ${escape(item.title)}"><span aria-hidden="true">▶</span> ${verified ? "PLAY OFFICIAL TRAILER" : "CHECK OFFICIAL TRAILER"}</button>`;
  };
  const card = (item, rank) => {
    const image = poster(item);
    const key = item.trailer?.key || item.trailerVideoId;
    const hasTrailer = /^[A-Za-z0-9_-]{11}$/.test(key || '');
    const rating = item.ratingKind === 'tmdb-community' && Number.isInteger(item.voteCount) && item.voteCount > 0 &&
      Number.isFinite(item.voteAverage) ? score(item) : '';
    const source = id(item) ? `https://www.themoviedb.org/${mediaType(item)}/${id(item)}` : indieEvidence(item);
    const external = !id(item) && item.indieVerified ? ' target="_blank" rel="noopener noreferrer"' : '';
    const indieCredit = item.indieVerified && indieEvidence(item) ? `<p class="fr-media-card__meta"><a href="${escape(indieEvidence(item))}" target="_blank" rel="noopener noreferrer">INDIE SOURCE: ${escape(item.indieSourceName || 'Festival')}</a></p>` : '';
    const date = prettyDate(item.releaseDate || item.firstReleaseDate);
    const originalYear = item.indieVerified && Number.isInteger(item.indieOriginalYear) ? `FILM YEAR ${item.indieOriginalYear} · ` : '';
    const theatrical = !!item.theatricalDate;
    const places = { GB:'UK', US:'US', CA:'Canada', AU:'Australia', IE:'Ireland' };
    const label = theatrical ? (places[item.releaseCountry] || item.releaseCountry || 'Regional') + ' cinema release'
      : mediaType(item)==='tv' ? 'First aired' : item.releaseCountry==='GB' ? 'UK release' : 'First release';
    return `<article class="movie-card fr-media-card" data-media-type="${mediaType(item)}" data-tmdb-id="${id(item)}"><div class="fr-media-card__artwork"><a class="movie-card__art fr-media-card__poster" href="${href(item)}"${external} aria-label="Explore ${escape(item.title)}">${image ? `<img class="tmdb-card-poster" src="${image}" alt="${escape(item.title)} poster" loading="lazy" decoding="async" width="500" height="750">` : `<div class="movie-card__poster-fill"><div class="movie-card__placeholder"><strong>${escape(item.title)}</strong><small>Poster unavailable</small></div></div>`}${rank ? `<span class="fr-chart-rank">${rank}</span>` : ''}</a><a class="fr-media-card__source" href="${escape(source)}" target="_blank" rel="noopener noreferrer" aria-label="Source for ${escape(item.title)}">SOURCE</a>${rating ? `<span class="fr-media-card__rating">${rating}</span>` : ''}${hasTrailer ? `<button type="button" class="fr-media-card__trailer" data-trailer-video="${escape(key)}" data-trailer-title="${escape(item.title)}" aria-label="Play official trailer for ${escape(item.title)}">▶ TRAILER</button>` : ''}</div><div class="movie-card__body fr-media-card__body"><div class="movie-card__headline"><h3><a href="${href(item)}"${external}>${escape(item.title)}</a></h3></div><p class="fr-media-card__meta" data-media-field="date">${date ? `${originalYear}${escape(label)} · ${escape(date)}${item.releaseCountry && !theatrical ? ' · ' + escape(item.releaseCountry) : ''}` : (item.indieVerified && item.indieOriginalYear ? `FILM YEAR · ${item.indieOriginalYear} · FESTIVAL RECORD` : 'Premiere date not announced')}</p>${indieCredit}<p class="movie-card__text">${escape(item.overview || 'Explore the title details and available trailer.')}</p><div class="fr-media-card__actions">${hasTrailer || !id(item) ? '' : trailer(item)}<a href="${href(item)}"${external}>${id(item) ? 'DETAILS' : 'FILM SOURCE'} →</a></div></div></article>`;
  };
  window.FR_CATALOGUE = {escape,mediaType,id,href,poster,prettyDate,score,trailer,card};

  // Catalogue responses carry safe public metadata; credentials remain on the server.
  const root = document.querySelector('[data-catalogue-type]');
  if (root) {
    const type = root.dataset.catalogueType;
    const thisYear = new Date().getFullYear();
    const url = new URL(location.href);
    const cinemaCountryNames = Object.freeze({GB:'UNITED KINGDOM',US:'UNITED STATES',CA:'CANADA',AU:'AUSTRALIA',IE:'IRELAND'});
    const cinemaPicker = root.querySelector('[data-cinema-country]');
    let cinemaCountry = 'GB';
    if(cinemaPicker){
      try{const previous=localStorage.getItem('frightertainment-cinema-country');if(Object.hasOwn(cinemaCountryNames,previous))cinemaCountry=previous;}catch{}
      cinemaPicker.value=cinemaCountry;
    }
    const updateCinemaLabels=()=>{
      if(!cinemaPicker)return;
      document.querySelectorAll('[data-cinema-country-label]').forEach(element=>element.textContent=cinemaCountryNames[cinemaCountry]);
      const headings={GB:'UK CINEMA',US:'US CINEMA',CA:'CANADIAN CINEMA',AU:'AUSTRALIAN CINEMA',IE:'IRISH CINEMA'};
      const prefix=root.querySelector('[data-cinema-diary-prefix]');
      const suffix=root.querySelector('[data-cinema-diary-suffix]');
      if(prefix)prefix.textContent=headings[cinemaCountry];
      if(suffix)suffix.textContent='RELEASE DIARY.';
      const intro=root.querySelector('.fr-cinema-diary__intro');
      if(intro)intro.hidden=false;
    };
    updateCinemaLabels();
    const requestedYear = Number(url.searchParams.get('year'));
    for (const section of root.querySelectorAll('[data-catalogue-mode]')) {
      const mode = section.dataset.catalogueMode;
      const yearSelect = section.querySelector('[data-catalogue-year]');
      const form = section.querySelector('[data-catalogue-search]');
      const decadeNav = type === 'indie' && mode === 'archive' ? section.querySelector('[data-indie-decades]') : null;
      const list = section.querySelector('[data-catalogue-list]');
      const status = section.querySelector('.fr-catalogue-status');
      const pagination = section.querySelector('[data-catalogue-pagination]');
      let page = 1;
      let history = [];
      let request = 0;
      let controller;
      const archiveYear = Number(url.searchParams.get('archiveYear'));
      let year = type === 'indie' && mode === 'archive'
        ? (archiveYear >= 1888 && archiveYear <= thisYear ? archiveYear : 'all')
        : requestedYear >= 1888 && requestedYear <= thisYear ? requestedYear : thisYear;
      let decade = null;
      let query = '';
      const syncDecades = () => decadeNav?.querySelectorAll('[data-indie-decade]').forEach(button => {
        const selected = decade === null ? button.dataset.indieDecade === 'all' && year === 'all'
          : Number(button.dataset.indieDecade) === decade;
        button.setAttribute('aria-pressed', String(selected));
      });
      if (yearSelect) {
        const firstYear = type === 'tv' ? 1940 : 1888;
        yearSelect.innerHTML = (type === 'indie' && mode === 'archive' ? '<option value="all">ALL YEARS</option>' : '') +
          Array.from({length:thisYear - firstYear + 1}, (_, index) => `<option value="${thisYear - index}">${thisYear - index}</option>`).join('');
        yearSelect.value = String(year);
        const headingYear=section.querySelector('[data-catalogue-chart-year]');
        if(headingYear)headingYear.textContent=String(year);
        yearSelect.addEventListener('change', () => {
          year = yearSelect.value === 'all' ? 'all' : Number(yearSelect.value);
          decade = null; syncDecades();
          const headingYear = section.querySelector('[data-catalogue-chart-year]');
          if (headingYear) headingYear.textContent = String(year);
          page = 1; history = []; load();
        });
      }
      decadeNav?.querySelectorAll('[data-indie-decade]').forEach(button => button.addEventListener('click', () => {
        decade = button.dataset.indieDecade === 'all' ? null : Number(button.dataset.indieDecade);
        year = 'all';
        if (yearSelect) yearSelect.value = 'all';
        syncDecades(); page = 1; history = []; load();
      }));
      syncDecades();
      if((mode==='cinema'||mode==='cinema-recent') && cinemaPicker) cinemaPicker.addEventListener('change',()=>{
        if(!Object.hasOwn(cinemaCountryNames,cinemaPicker.value))return;
        cinemaCountry=cinemaPicker.value;
        try{localStorage.setItem('frightertainment-cinema-country',cinemaCountry);}catch{}
        updateCinemaLabels();page=1;history=[];load();
      });
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
        if(mode==='cinema'||mode==='cinema-recent')params.set('country',cinemaCountry);
        if (yearSelect) params.set('year', String(year));
        if (decade !== null && mode === 'archive') params.set('decade', String(decade));
        if (query) params.set('query', query);
        try {
          const response = await fetch('/api/catalogue?' + params, {headers:{accept:'application/json'}, signal});
          if (!response.ok) throw new Error('Catalogue unavailable');
          let data = await response.json();
          if (request !== requestNumber) return;
          if (!Array.isArray(data.items)) throw new Error('Catalogue unavailable');
          let items = data.items.filter(item => item.title && (type === 'indie' ? item.indieVerified === true && (id(item) > 0 || indieEvidence(item)) : id(item) > 0));
          if (type === 'indie' && Array.isArray(data.availableYears) && yearSelect) {
            const verifiedYears = data.availableYears.filter(y => Number.isInteger(y) && y >= 1888 && y <= thisYear);
            if (verifiedYears.length) {
              const values = [...new Set(verifiedYears)].sort((a,b) => b-a);
              const nextOptions = (mode === 'archive' ? '<option value="all">ALL YEARS</option>' : '') +
                values.map(y => `<option value="${y}">${y}</option>`).join('');
              if (yearSelect.innerHTML !== nextOptions) yearSelect.innerHTML = nextOptions;
              if ([...yearSelect.options].some(option => option.value === String(year)))
                yearSelect.value = String(year);
            }
          }
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
              for (const item of data.items || []) if (id(item) > 0 && item.indieVerified && Number(item.voteCount) >= 50) collected.set(id(item),item);
            }
            items = [...collected.values()].sort((a,b) => Number(b.voteAverage)-Number(a.voteAverage) || Number(b.voteCount)-Number(a.voteCount) || a.title.localeCompare(b.title)).slice(0,20);
          }
          if(mode==='cinema'&&window.FR_CINEMA_DIARY){
            // Show curated premieres once, not repeated on every TMDB page.
            const curated=page===1?await window.FR_CINEMA_DIARY.load():null;
            if(request!==requestNumber)return;
            const merged=window.FR_CINEMA_DIARY.render(list,curated,items,card,cinemaCountry);
            items=Array.from({length:merged.count},(_,i)=>({title:'screening-'+i,tmdbId:i+1}));
            status.textContent=cinemaCountryNames[cinemaCountry]+' · '+merged.curated+
              ' source-checked cinema dates · '+merged.reported+
              ' TMDB-reported future openings (check local cinema)';
          }else{
            list.innerHTML=items.map((item,index)=>card(item,mode==='chart'?index+1:null)).join('');
          }
          if (mode === 'chart') {
            status.textContent = items.length ? `${year} · ${items.length} ${type === 'tv' ? 'shows' : 'films'} · TMDB viewer ratings · 50+ votes` : `No ${year} titles meet the 50-vote chart minimum yet. Explore another year or the archive.`;
          } else if (type === 'indie' && mode === 'archive') {
            const total = Number.isInteger(data.totalResults) ? data.totalResults : items.length;
            const period = decade !== null ? decade + 's' : year === 'all' ? 'all available film years' : year;
            status.textContent = `${total} source-checked indie films · ${period}` +
              (data.status === 'source-only' ? ' · source records only; live posters and viewer scores unavailable' : '') +
              (data.stale ? ' · Last available update' : '');
          } else if(!(mode==='cinema'&&window.FR_CINEMA_DIARY)) status.textContent = (mode==='cinema'||mode==='cinema-recent' ? cinemaCountryNames[cinemaCountry]+' · ' : '') + (items.length ? `${items.length} ${type === 'tv' ? 'shows' : items.length === 1 ? 'film' : 'films'}${mode === 'archive' ? ' · ' + year : ''}${data.stale ? ' · Last available update' : ''}` : (mode === 'cinema' ? 'No upcoming cinema dates listed for this country yet.' : mode === 'cinema-recent' ? 'No recent cinema releases matched for this country. Try another date or check back soon.' : mode === 'upcoming' ? 'No upcoming premiere dates are listed yet. Check back for new announcements.' : 'No matching titles. Try another year or title.'));
          const totalPages = Math.max(1, Math.min(500, Number(data.totalPages) || 1));
          if (mode !== 'chart' && totalPages > 1 && (!['cinema','cinema-recent'].includes(mode) || data.nextPage || history.length)) {
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
          // A failed live provider must not erase independently sourced
          // theatrical dates. The cinema diary ledger is territorial, dated,
          // and explicitly NOT a live showtimes/tickets guarantee.
          if (mode === 'cinema' && page === 1 && window.FR_CINEMA_DIARY) {
            try {
              const ledger = await window.FR_CINEMA_DIARY.load();
              if (request !== requestNumber) return;
              const shown = window.FR_CINEMA_DIARY.render(list, ledger, [], card, cinemaCountry);
              if (shown.curated > 0) {
                pagination.replaceChildren();
                status.textContent = cinemaCountryNames[cinemaCountry] + ' · ' +
                  shown.curated + ' source-checked upcoming cinema dates · ' +
                  'Live catalogue temporarily unavailable. Check individual screening sources and venues.';
                window.dispatchEvent(new CustomEvent('fr:media-rendered', {detail:{root:list}}));
                return;
              }
            } catch {/* Fall back to transparent provider-unavailable state. */}
          }
          // Indie is an editorial archive first; loss of the enrichment API
          // must not make decades of verified source records disappear.
          if (type === 'indie') {
            try {
              const response = await fetch('/data/indie-archive.json', {
                headers:{accept:'application/json'}, signal
              });
              if (!response.ok) throw new Error('Indie source index unavailable');
              const ledger = await response.json();
              if (request !== requestNumber) return;
              if (!Array.isArray(ledger.items)) throw new Error('Invalid source index');
              const needle = String(query || '').trim().toLowerCase();
              const verified = ledger.items.filter(entry =>
                entry && typeof entry.title === 'string' && entry.title &&
                Number.isInteger(entry.originalYear) &&
                indieEvidence({indieSourceUrl:entry.indieSourceUrl}));
              const all = verified.filter(entry =>
                (!needle || entry.title.toLowerCase().includes(needle)) &&
                (mode !== 'archive' || (
                  (year === 'all' || entry.originalYear === year) &&
                  (decade === null || (entry.originalYear >= decade && entry.originalYear < decade + 10))
                )));
              if (yearSelect && Array.isArray(ledger.availableYears)) {
                const years = ledger.availableYears.filter(y => Number.isInteger(y) && y >= 1888 && y <= thisYear);
                yearSelect.innerHTML = (mode === 'archive' ? '<option value="all">ALL YEARS</option>' : '') +
                  years.map(y => `<option value="${y}">${y}</option>`).join('');
                yearSelect.value = String(year);
              }
              if (mode === 'archive') {
                const perPage = 9, pages = Math.max(1,Math.ceil(all.length/perPage));
                page = Math.min(page,pages);
                const entries = all.slice((page-1)*perPage,page*perPage).map(entry => ({
                  id:'indie-source-'+entry.originalYear+'-'+entry.title.toLowerCase().replace(/[^a-z0-9]+/g,'-'),
                  title:entry.title, indieVerified:true,indieOriginalYear:entry.originalYear,
                  indieSourceName:entry.indieSourceName,indieSourceUrl:entry.indieSourceUrl,
                  overview:'Independently sourced horror film. Follow the credited source for original film information.',
                  posterPath:null,tmdbId:null,ratingKind:null,releaseDate:null
                }));
                list.innerHTML = entries.map(item => card(item,null)).join('');
                status.textContent = `${all.length} source-checked films · ${decade !== null ? decade + 's' : year === 'all' ? 'all available original years' : year} · film database temporarily unavailable; original sources remain available.`;
                if (pages > 1) {
                  const prev=document.createElement('button');prev.type='button';prev.className='button button--outline';
                  prev.textContent='← PREVIOUS';prev.disabled=page===1;
                  prev.addEventListener('click',()=>{page--;load();section.scrollIntoView({block:'start'});});
                  const middle=document.createElement('span');middle.textContent=`Page ${page} of ${pages}`;
                  const next=document.createElement('button');next.type='button';next.className='button button--outline';
                  next.textContent='NEXT →';next.disabled=page>=pages;
                  next.addEventListener('click',()=>{page++;load();section.scrollIntoView({block:'start'});});
                  pagination.append(prev,middle,next);
                }
                if(entries.length) window.dispatchEvent(new CustomEvent('fr:media-rendered',{detail:{root:list}}));
                return;
              }
              list.replaceChildren();
              status.textContent = mode === 'chart' ? 'TMDB viewer ratings are currently unavailable. Browse the source-checked indie archive instead.'
                : mode === 'trending' ? 'Live indie popularity data is currently unavailable. Browse the independent film archive by year.'
                : 'Future indie premieres will appear once independently confirmed; no dates are being guessed.';
              return;
            } catch {
              if (request !== requestNumber) return;
              // If both services fail, leave a transparent recoverable state.
            }
          }
          list.replaceChildren();
          status.textContent = 'Live listings are temporarily unavailable. Please try again.';
          const retry = document.createElement('button'); retry.className = 'button button--outline'; retry.type = 'button'; retry.textContent = 'TRY AGAIN'; retry.addEventListener('click', load); pagination.append(retry);
        } finally { if (request === requestNumber) list.setAttribute('aria-busy', 'false'); }
      }
      load();
    }
  }
})();
