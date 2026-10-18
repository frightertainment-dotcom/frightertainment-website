(() => {
  'use strict';
  const cache = new Map(), queue = [];
  // TMDB-derived public metadata is not personal data. A short-lived session
  // cache avoids refetching the same posters when visitors change sections.
  // Fail closed if browser storage is disabled; the live API remains canonical.
  const sessionPrefix='fr-media-v2:';
  const sessionTtl=15*60*1000;
  const readSession=key=>{
    try {
      const raw=sessionStorage.getItem(sessionPrefix+key);
      if(!raw)return undefined;
      const value=JSON.parse(raw);
      if(!value||!Number.isFinite(value.saved)||Date.now()-value.saved>sessionTtl){
        sessionStorage.removeItem(sessionPrefix+key);return undefined;
      }
      return value.item||null;
    }catch{return undefined;}
  };
  const saveSession=(key,item)=>{
    if(!item||!Number.isInteger(item.tmdbId)||!item.sourceUrl)return;
    try {
      sessionStorage.setItem(sessionPrefix+key,JSON.stringify({saved:Date.now(),item}));
    }catch{/* Browsers may restrict session storage. */}
  };
  let active = 0;
  const keyFor = params => new URLSearchParams(params).toString();
  function drain() {
    while (active < 4 && queue.length) {
      const task = queue.shift(); active++;
      task().finally(() => { active--; drain(); });
    }
  }
  function get(params) {
    const key = keyFor(params);
    if (!cache.has(key)) {
      const warm=readSession(key);
      if(warm!==undefined){cache.set(key,Promise.resolve(warm));return cache.get(key);}
      cache.set(key, new Promise(resolve => {
      queue.push(async () => {
        try {
          const response = await fetch('/api/media?' + key, {headers:{accept:'application/json'}});
          const data = response.ok ? await response.json() : null;
          const item=data?.item||null;
          saveSession(key,item);
          resolve(item);
        } catch { resolve(null); }
      }); drain();
    }));
    }
    return cache.get(key);
  }
  const prettyDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') ?
    new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z')) : '';
  const safePoster = item => /^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\.(jpg|png|webp)$/i.test(item?.posterPath || '') ?
    'https://image.tmdb.org/t/p/w500'+item.posterPath : '';
  function apply(root,item) {
    if (!root.isConnected) return;
    root.dataset.mediaStatus = item ? 'ready' : 'unavailable';
    if (!item) {
      root.querySelectorAll('[data-media-field="rating"]').forEach(node => {
        window.FRRatingBadge.render(node,{score:null,source:'tmdb-community',voteCount:null,size:'compact'});
      });
      for(const [field,label] of Object.entries({'poster-status':'Poster unavailable','trailer-status':'No official trailer available','date':'Release date unavailable','overview':'A synopsis is not available for this title.'}))root.querySelectorAll(`[data-media-field="${field}"]`).forEach(node=>{node.textContent=label;});
      return;
    }
    root.dataset.resolvedTmdbId = String(item.tmdbId);
    for (const node of root.querySelectorAll('[data-media-field]')) {
      switch (node.dataset.mediaField) {
        case 'poster': {
          const url = safePoster(item); if (!url) break;
          if(node.getAttribute('role')==='img')node.setAttribute('aria-label','Poster for '+item.title);
          let img = node.matches('img') ? node : node.querySelector('img');
          if (!img) {img=document.createElement('img');node.prepend(img);}
          const nearTop=root.dataset.mediaEager==='true' || root.getBoundingClientRect().top<innerHeight+350;
          img.alt = 'Poster for '+item.title;
          img.loading=nearTop?'eager':'lazy';
          if(nearTop)img.fetchPriority='high';
          img.decoding='async'; img.hidden=false;
          img.addEventListener('load',()=> {img.hidden=false; node.classList.add('has-tmdb-poster'); img.parentElement.classList.add('has-tmdb-poster');root.querySelectorAll('[data-media-field="poster-status"]').forEach(n=>n.hidden=true);}, {once:true});
          img.addEventListener('error',()=> {img.hidden=true; node.classList.remove('has-tmdb-poster');img.parentElement.classList.remove('has-tmdb-poster');root.querySelectorAll('[data-media-field="poster-status"]').forEach(n=>{n.hidden=false;n.textContent='Poster unavailable';});}, {once:true});
          img.src=url; if(img.complete && img.naturalWidth>0) {img.hidden=false;node.classList.add('has-tmdb-poster');img.parentElement.classList.add('has-tmdb-poster');}
          break;
        }
        case 'rating': {
          if (item.ratingKind === 'tmdb-community')
            window.FRRatingBadge.render(node,window.FRRatingBadge.fromTmdbMedia(item,'compact'));
          else node.textContent = 'Rating unavailable';
          break;
        }
        case 'votes':node.textContent=item.voteCount>0?new Intl.NumberFormat('en-GB').format(item.voteCount)+' viewer votes':'';break;
        case 'date': {
          const date=prettyDate(item.releaseDate || item.firstReleaseDate);
          node.textContent=date?date+' · '+(item.releaseCountry==='GB'?'UK release':item.releaseCountry==='Original broadcast'?'First aired':'First release')+' · TMDB':'Release date unavailable';
          break;
        }
        case 'year':node.textContent=(item.firstReleaseDate || item.releaseDate || '').slice(0,4);break;
        case 'overview':node.textContent=item.overview || 'A synopsis is not available for this title.';break;
        case 'poster-status':node.textContent=safePoster(item)?'Poster loading…':'Poster unavailable';break;
        case 'trailer-status':node.textContent=item.trailer?.key?'':'No official trailer available';node.hidden=!!item.trailer?.key;break;
        case 'trailer': {
          const video=item.trailer?.key;
          if(/^[A-Za-z0-9_-]{11}$/.test(video || '')) {node.hidden=false;node.dataset.trailerVideo=video;node.dataset.trailerTitle=item.title;node.textContent='▶ PLAY TRAILER';}
          else if(!node.dataset.trailerVideo) node.hidden=true;
          break;
        }
        case 'source':node.href=item.sourceUrl;node.textContent='TMDB';break;
      }
    }
    root.dispatchEvent(new CustomEvent('mediaready',{detail:item}));
  }
  const observed = new WeakMap();
  function paramsFor(root) {
    const params={type:root.dataset.mediaType || 'movie'};
    if(/^\d+$/.test(root.dataset.tmdbId || '')) params.id=root.dataset.tmdbId;
    else if(/^tt\d+$/.test(root.dataset.mediaImdb || '')) params.imdb=root.dataset.mediaImdb;
    else {params.title=root.dataset.mediaTitle || '';if(/^\d{4}$/.test(root.dataset.mediaYear || ''))params.year=root.dataset.mediaYear;}
    return params;
  }
  function hydrate(root) {const params=paramsFor(root);if(!params.id&&!params.imdb&&!params.title)return;get(params).then(item=>apply(root,item));}
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){observer.unobserve(entry.target);hydrate(entry.target);}}),{rootMargin:'850px 0px'});
  function scan() {
    document.querySelectorAll('[data-media-type]').forEach(root=>{
      const key=keyFor(paramsFor(root));if(observed.get(root)===key)return;observed.set(root,key);
      if(root.dataset.mediaEager==='true')hydrate(root);else observer.observe(root);
    });
  }
  let scheduled=false;
  new MutationObserver(()=>{if(!scheduled){scheduled=true;queueMicrotask(()=>{scheduled=false;scan();});}}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['data-tmdb-id','data-media-title','data-media-year','data-media-imdb']});
  let dialog, previousFocus;
  function closeTrailer() {if(!dialog?.open)return;dialog.close();dialog.querySelector('iframe').removeAttribute('src');document.body.classList.remove('trailer-open');previousFocus?.focus();}
  function openTrailer(key,title) {
    if(!/^[A-Za-z0-9_-]{11}$/.test(key || ''))return;
    if(!dialog){
      dialog=document.createElement('dialog');dialog.className='trailer-dialog';dialog.setAttribute('aria-label','Trailer player');
      dialog.innerHTML='<div class="trailer-dialog__bar"><strong></strong><button type="button" aria-label="Close trailer">✕</button></div><div class="trailer-dialog__screen"><iframe title="Official trailer" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div><a class="trailer-dialog__source" target="_blank" rel="noopener noreferrer">Watch on YouTube ↗</a>';
      document.body.append(dialog);dialog.querySelector('button').addEventListener('click',closeTrailer);
      dialog.addEventListener('cancel',event=>{event.preventDefault();closeTrailer();});
      dialog.addEventListener('click',event=>{if(event.target===dialog)closeTrailer();});
    }
    previousFocus=document.activeElement;dialog.querySelector('strong').textContent=title || 'Official trailer';
    dialog.querySelector('iframe').src='https://www.youtube-nocookie.com/embed/'+key+'?autoplay=1&rel=0&playsinline=1';
    dialog.querySelector('a').href='https://www.youtube.com/watch?v='+key;
    dialog.showModal();document.body.classList.add('trailer-open');
  }
  document.addEventListener('click',async event=>{
    const button=event.target.closest('[data-trailer-video],[data-media-trailer]');if(!button)return;
    event.preventDefault();
    if(button.dataset.trailerVideo)openTrailer(button.dataset.trailerVideo,button.dataset.trailerTitle);
    else {
      const root=button.closest('[data-media-type]') || button;
      button.disabled=true;
      const item=await get(paramsFor(root));button.disabled=false;
      if(item?.trailer?.key)openTrailer(item.trailer.key,item.title);
      else {button.textContent='Trailer unavailable';button.disabled=true;}
    }
  });
  window.FRMedia={get,apply,hydrate,scan,openTrailer,prettyDate};scan();
})();
