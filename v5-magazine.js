/* Frightertainment V5: structural magazine modules based on owner-approved
   Indie mobile and Movies desktop concept art. No fabricated reviews, dates,
   watchlists, ranking values, video links or third-party poster rights. */
(() => {
 'use strict';
 // Page identity is explicit so alternate URLs and delayed work cannot turn
 // Cinema's movie catalogue into the Movies magazine layout. Other pages still
 // use their existing theme value until their markup declares data-page.
 const theme=document.body?.dataset.page||document.body?.dataset.theme;
 if (!['movies','indie','tv','podcasts','games','home','cinema'].includes(theme)) return;
 const main=document.querySelector('main');
 const intro=main?.querySelector('.hub-page-intro');
 if (!main) return;
 document.body.classList.add('fr-v5');
 const configs={
  cinema:{heading:'IN CINEMAS',tagline:'Source-linked theatrical horror releases.',href:'#upcoming-cinema',mode:'cinema',type:'movie',hash:'#upcoming-cinema'},
  movies:{heading:'FEATURED HORROR FILMS',tagline:'Explore films that haunt you.',href:'/all-horror-movies.html',mode:'trending',type:'movie',hash:'#upcoming'},
  indie:{heading:'MORE INDIE PICKS',tagline:'Small budgets. Big nightmares.',href:'#trending',mode:'trending',type:'indie',hash:'#upcoming'},
  tv:{heading:'HORROR SERIES TO WATCH',tagline:'Stories that stay with you.',href:'#trending',mode:'trending',type:'tv',hash:'#upcoming'},
  podcasts:{heading:'AFTER DARK LISTENING',tagline:'Horror you can hear.',href:'#podcast-chart-heading',editorial:'podcasts'},
  games:{heading:'NIGHTMARES YOU CAN PLAY',tagline:'Survival, terror and everything between.',href:'#games-chart',editorial:'games'}
 };
 const el=(tag,cls,text)=>{
  const node=document.createElement(tag);if(cls)node.className=cls;
  if(text!==undefined)node.textContent=String(text);return node;
 };
 const link=(text,href,cls='')=>{
  const a=el('a',cls,text);a.href=href;return a;
 };
 const title=(label,sub,href)=>{
  const h=el('div','fr-v5-panel__head');
  const copy=el('div','fr-v5-panel__head-copy');
  copy.append(el('h2','',label),el('p','',sub));
  h.append(copy);
  if(href)h.append(link('VIEW ALL  ›',href,'fr-v5-panel__all'));
  return h;
 };
 const panel=(cls,label,sub,href)=>{
  const p=el('section','fr-v5-panel '+cls);p.append(title(label,sub,href));return p;
 };
 const posterPath=x=>/^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\.(?:jpg|png|webp)$/i.test(x||'')?x:'';
 const itemId=x=>Number(x?.tmdbId||( /^\d+$/.test(String(x?.id||''))?x.id:0));
 const filmHref=(x,type)=>'/media.html?type='+(type==='tv'?'tv':'movie')+'&id='+itemId(x)+(type==='indie'?'&section=indie':'');
 const image=(x,type)=>{
  const frame=el('div','fr-v5-poster__art');
  const safe=posterPath(x.posterPath);
  if(safe){
   const img=el('img','fr-v5-poster__image');
   img.src='https://image.tmdb.org/t/p/w500'+safe;img.alt='Poster for '+x.title;
   img.loading='lazy';img.decoding='async';img.width=500;img.height=750;
   img.addEventListener('error',()=>{
    frame.replaceChildren(el('span','fr-v5-poster__fallback',x.title));
   },{once:true});
   frame.append(img);
  } else frame.append(el('span','fr-v5-poster__fallback',x.title));
  return frame;
 };
 const poster=(x,type)=>{
  const a=link('',filmHref(x,type),'fr-v5-poster');
  const art=image(x,type);
  const foot=link('',filmHref(x,type),'fr-v5-poster__bottom');
  foot.append(el('strong','',x.title));
  const year=Number(String(x.firstReleaseDate||x.releaseDate||'').slice(0,4));
  if(year>=1888&&year<=2100) foot.append(el('small','',String(year)));
  a.append(art);
  a.setAttribute('aria-label','Explore '+x.title+' details');
  const box=el('article','fr-v5-poster-card');
  const media=el('div','fr-v5-poster__media');
  media.append(a);
  box.append(media,foot);
  const source=link('SOURCE',`https://www.themoviedb.org/${type==='tv'?'tv':'movie'}/${itemId(x)}`,'fr-v5-poster__source');
  source.setAttribute('aria-label','TMDB source for '+x.title);
  source.target='_blank';source.rel='noopener noreferrer';
  media.append(source);
  if(x.ratingKind==='tmdb-community'&&Number.isFinite(x.voteAverage)&&Number.isInteger(x.voteCount)&&x.voteCount>0){
   const rating=el('span','fr-v5-poster__rating');
   rating.append(window.FRRatingBadge.create(window.FRRatingBadge.fromTmdbMedia(x,'compact')));
   media.append(rating);
  }
  const video=mediaKey(x);
  if(/^[A-Za-z0-9_-]{11}$/.test(video)){
   const play=el('button','fr-v5-poster__trailer','▶ TRAILER');
   play.type='button';play.dataset.trailerVideo=video;play.dataset.trailerTitle=x.title;
   play.setAttribute('aria-label','Play official trailer for '+x.title);
   media.append(play);
  }
  if(type==='movie' || type==='indie'){
   const year=Number(String(x.firstReleaseDate||x.releaseDate||'').slice(0,4));
   media.append(watchButton({tmdbId:itemId(x),title:x.title,posterPath:x.posterPath,year,type}));
  }
  return box;
 };
 const valid=x=>x&&typeof x.title==='string'&&x.title.trim()&&itemId(x)>0;
 const catalogueRequests=new Map();
 const fetchList=(type,mode)=>{
  const key=type+':'+mode;
  if(catalogueRequests.has(key))return catalogueRequests.get(key);
  const query=new URLSearchParams({type,mode,page:'1'});if(mode==='cinema')query.set('country','GB');
  const url='/api/catalogue?'+query;
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),10000);
  const promise=(async()=>{try {
   const response=await fetch(url,{headers:{accept:'application/json'},signal:controller.signal});
   if(!response.ok)throw new Error('Catalogue unavailable');
   const data=await response.json();
   if(!Array.isArray(data.items))throw new Error('Catalogue response invalid');
   return data.items.filter(valid);
  } finally {clearTimeout(timeout);}})();
  catalogueRequests.set(key,promise);
  return promise;
 };
 const mockFreeState=(node,copy)=>{
  node.replaceChildren(el('p','fr-v5-empty',copy));
 };
 const guard=(linkElement,video)=>{
  if(!/^[A-Za-z0-9_-]{11}$/.test(video||''))return false;
  linkElement.href='https://www.youtube.com/watch?v='+video;
  linkElement.rel='noopener noreferrer';linkElement.target='_blank';return true;
 };
 const mediaKey=x=>x.trailer?.key||x.trailerVideoId||'';

 const watchKey='frightertainment-v5-watchlist';
 const cleanWatch=x=> x && Number.isInteger(Number(x.tmdbId)) && Number(x.tmdbId)>0 &&
   typeof x.title==='string' && x.title.trim().length>0 && x.title.length<=160 &&
   ['movie','tv','indie'].includes(x.type) ?
   {tmdbId:Number(x.tmdbId),title:x.title.trim(),type:x.type,
    posterPath:posterPath(x.posterPath),year:Number(x.year)||null}:null;
 const savedWatch=()=>{
  try{const parsed=JSON.parse(localStorage.getItem(watchKey)||'[]');
   return (Array.isArray(parsed)?parsed:[]).map(cleanWatch).filter(Boolean).slice(0,80);
  }catch{return [];}
 };
 const writeWatch=arr=>{
  try{localStorage.setItem(watchKey,JSON.stringify(arr.slice(0,80)));}
  catch{return false;}
  document.dispatchEvent(new Event('fr-v5-watchlist-updated'));
  return true;
 };
 const watchIdentity=x=>x.type+':'+x.tmdbId;
 const toggleWatch=x=>{
  const record=cleanWatch(x);if(!record)return;
  const list=savedWatch(),where=list.findIndex(item=>watchIdentity(item)===watchIdentity(record));
  if(where>=0)list.splice(where,1);else list.unshift(record);
  writeWatch(list);
 };
 const watchButton=x=>{
  const button=el('button','fr-v5-watch-toggle');button.type='button';
  const update=()=>{
   const selected=savedWatch().some(item=>watchIdentity(item)===watchIdentity(x));
   button.textContent=selected?'✓':'＋';
   button.setAttribute('aria-label',(selected?'Remove from':'Add to')+' my watchlist: '+x.title);
   button.title=(selected?'Remove from':'Add to')+' my watchlist';
   button.setAttribute('aria-pressed',String(selected));
  };
  update();button.addEventListener('click',()=>toggleWatch(x));
  document.addEventListener('fr-v5-watchlist-updated',update);
  return button;
 };
 const mountHomeWatchlist=()=>{
  const section=document.querySelector('#my-watchlist');
  if(!section)return;
  const grid=section.querySelector('[data-home-watch-items]');
  const count=section.querySelector('[data-home-watch-count]');
  const description=section.querySelector('[data-home-watch-description]');
  if(!grid||!count||!description)return;
  const render=()=>{
   const items=savedWatch();
   count.textContent=String(items.length);
   section.dataset.hasItems=String(items.length>0);
   grid.hidden=items.length===0;
   if(!items.length){
    grid.replaceChildren();
    description.textContent='Save a horror film with + in Movies, then find it here.';
    return;
   }
   description.textContent='Tap a saved poster to see film details. Saved on this browser.';
   grid.replaceChildren(...items.map(item=>{
    const box=el('div','fr-home-watch-shelf__item');
    const a=link('',filmHref(item,item.type),'fr-home-watch-shelf__movie');
    a.setAttribute('aria-label','Open details for '+item.title);
    a.append(image(item,item.type),el('strong','fr-home-watch-shelf__movie-title',item.title));
    const remove=el('button','fr-home-watch-shelf__remove','×');
    remove.type='button';
    remove.setAttribute('aria-label','Remove '+item.title+' from my watchlist');
    remove.addEventListener('click',()=>toggleWatch(item));
    box.append(a,remove);
    return box;
   }));
  };
  document.addEventListener('fr-v5-watchlist-updated',render);
  window.addEventListener('storage',event=>{if(event.key===watchKey||event.key===null)render();});
  window.addEventListener('pageshow',render);
  render();
 };
 const installHeader=()=>{
  const head=document.querySelector('.hub-header__inside');
  if(!head || head.querySelector('.fr-v5-header-tools'))return;
  const actions=el('div','fr-v5-header-tools');
  const menu=el('details','fr-v5-header-menu');
  const menuButton=el('summary','fr-v5-icon-control','☰');
  menuButton.setAttribute('aria-label','Open horror section menu');
  const menuList=el('nav','fr-v5-menu-list');
  menuList.setAttribute('aria-label','All Frightertainment sections');
  for(const [name,url] of [
   ['HOME','/'],['MOVIES','/movies.html'],['TV SHOWS','/tv-shows.html'],
   ['CINEMA','/cinema.html'],['INDIE MOVIES','/indie-movies.html'],
   ['PODCASTS','/podcasts.html'],['GAMES','/games.html']
  ])menuList.append(link(name,url));
  menu.append(menuButton,menuList);
  const search=el('details','fr-v5-header-search');
  const searchButton=el('summary','fr-v5-icon-control','⌕');
  searchButton.setAttribute('aria-label','Search horror films');
  const form=el('form','fr-v5-search-form');
  form.action='/all-horror-movies.html';form.method='get';
  const label=el('label','','Search the Horror Vault');label.htmlFor='fr-v5-global-search';
  const input=el('input','');input.id='fr-v5-global-search';input.type='search';
  input.name='q';input.required=true;input.minLength=2;input.maxLength=100;
  input.placeholder='Search horror titles…';
  const submit=el('button','','SEARCH');submit.type='submit';
  form.append(label,input,submit);search.append(searchButton,form);
  search.addEventListener('toggle',()=>{if(search.open){menu.open=false;input.focus();}});
  menu.addEventListener('toggle',()=>{if(menu.open)search.open=false;});
  const contact=link('☠','/contact.html','fr-v5-contact-icon');
  contact.setAttribute('aria-label','Contact Frightertainment');
  actions.append(menu,search,contact);
  head.append(actions);
  document.addEventListener('keydown',event=>{
   if(event.key==='Escape'){menu.open=false;search.open=false;}
  });
 };

 /* An offline provider should never turn a premium editorial destination into
    a stack of retry boxes. Keep the live-feed limitation explicit, but use
    existing approved, source-linked editorial work for a real discovery shelf.
    This is not a substitute for live regional availability or rankings. */
 const curatedLink=value=>{
   if(/^\/films\/[a-z0-9-]+\/$/.test(String(value||'')))return value;
   try{
     const url=new URL(value);
     return url.protocol==='https:'&&!url.username&&!url.password?url.href:'';
   }catch{return '';}
 };
 const getCuratedFallback=async(type)=>{
   if(type==='movie'){
     return (Array.isArray(window.FR_MOVIES)?window.FR_MOVIES:[])
       .filter(x=>x&&x.editorialStatus==='approved'&&/^[a-z0-9-]+$/.test(x.id||'')
         &&typeof x.title==='string'&&x.claims?.some(claim=>claim.field==='title'&&curatedLink(claim.source)))
       .slice(0,6).map(x=>({
         title:x.title,
         category:x.claims?.find(c=>c.field==='genre')?.value||'SOURCE-CHECKED HORROR',
         description:x.claims?.find(c=>c.field==='synopsis')?.value||'Explore the verified film file and original studio sources.',
         sourceName:x.claims?.find(c=>c.field==='title')?.sourceName||'Official film source',
         sourceUrl:'/films/'+x.id+'/'
       }));
   }
   const key=type==='tv'?'tv-shows':type==='indie'?'indie-movies':'';
   if(!key)return [];
   const cached=window.FR_EDITORIAL_BOOTSTRAP?.editorial?.[key];
   if(Array.isArray(cached))return cached
     .filter(x=>x&&typeof x.title==='string'&&x.title.trim().length>0&&
       typeof x.description==='string'&&curatedLink(x.sourceUrl)).slice(0,6);
   const response=await fetch('/data/editorial.json',{headers:{accept:'application/json'}});
   if(!response.ok)throw Error('Curated recommendations unavailable');
   const data=await response.json();
   return (Array.isArray(data[key])?data[key]:[])
     .filter(x=>x&&typeof x.title==='string'&&x.title.trim().length>0&&
       typeof x.description==='string'&&curatedLink(x.sourceUrl))
     .slice(0,6);
 };
 const showCuratedFallback=async(panelNode,type)=>{
   try{
     const entries=await getCuratedFallback(type);
     if(!entries.length||!panelNode.isConnected)return;
     const gallery=el('div','fr-v5-curated-grid');
     gallery.setAttribute('aria-label','Verified Frightertainment editorial selections');
     const themeClass=type==='tv'?'series':type==='indie'?'independent':'film';
     gallery.dataset.kind=themeClass;
     const cards=entries.map((entry,index)=>{
       const href=curatedLink(entry.sourceUrl);
       const anchor=link('',href,'fr-v5-curated-card');
       anchor.dataset.curatedIndex=String(index+1);
       if(href.startsWith('https://')){anchor.target='_blank';anchor.rel='noopener noreferrer';}
       anchor.setAttribute('aria-label','Explore '+entry.title+' via '+(entry.sourceName||'verified source'));
       const number=el('span','fr-v5-curated-card__number',String(index+1).padStart(2,'0'));
       number.setAttribute('aria-hidden','true');
       const copy=el('span','fr-v5-curated-card__copy');
       copy.append(
         el('small','fr-v5-curated-card__kind',entry.category||'CURATED HORROR'),
         el('strong','fr-v5-curated-card__title',entry.title),
         el('span','fr-v5-curated-card__synopsis',String(entry.description).slice(0,180)),
         el('span','fr-v5-curated-card__action',href.startsWith('/')?'EXPLORE FILM FILE  ↗':'OFFICIAL SOURCE  ↗')
       );
       anchor.append(number,copy);
       return anchor;
     });
     gallery.append(...cards);
     const intro=el('p','fr-v5-curated-intro','FRIGHTERTAINMENT SELECTS · VERIFIED EDITORIAL DISCOVERY');
     panelNode.append(intro,gallery);
   }catch{/* No unverified placeholders or fabricated posters on fetch failure. */}
 };

 const showPosterRack=async(config,host)=>{
  const p=panel('fr-v5-rack',config.heading,config.tagline,config.href);
  const grid=el('div','fr-v5-poster-grid');
  grid.setAttribute('aria-live','polite');
  // Image-sized reserved slots keep the exact final shelf geometry. Do not
  // switch a visible editorial layout into a differently sized poster grid.
  const count=config.type==='indie'?6:8;
  const slots=Array.from({length:count},()=>{
   const card=el('div','fr-v5-poster-skeleton');
   card.setAttribute('aria-hidden','true');
   card.append(el('span','fr-v5-poster-skeleton__art'),
    el('span','fr-v5-poster-skeleton__title'));
   return card;
  });
  grid.replaceChildren(...slots);
  p.append(grid);host.append(p);
  try{
   const data=await fetchList(config.type,config.mode);
   if(!data.length){
    mockFreeState(grid,'Live catalogue has no qualifying titles yet. Explore our sourced editorial selections below.');
    await showCuratedFallback(p,config.type);
    return;
   }
   grid.replaceChildren(...data.slice(0,count).map(x=>poster(x,config.type)));
  }catch{
   mockFreeState(grid,'Live catalogue unavailable. The selections below are editorial recommendations, not current availability.');
   await showCuratedFallback(p,config.type);
  }
 };
 const addNotices=async(parent)=>{
  const p=panel('fr-v5-notices','LATEST HORROR DROPS','Source-checked UK release notices.','#straight-to-stream');
  const list=el('div','fr-v5-notices__list','Loading verified notices…');p.append(list);parent.append(p);
  try{
   const response=await fetch('/data/editorial-releases.json');
   if(!response.ok)throw Error('Notices unavailable');
   const data=await response.json();
   const entries=(Array.isArray(data.items)?data.items:[]).filter(x=>x&&typeof x.title==='string'&&/^https:\/\//.test(x.sourceUrl||'')&&['streaming','cinema','vod'].includes(x.category)).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).slice(0,5);
   if(!entries.length)return mockFreeState(list,'No recent source-checked notices are available.');
   list.replaceChildren(...entries.map(x=>{
    const a=link('',x.sourceUrl,'fr-v5-notices__row');a.target='_blank';a.rel='noopener noreferrer';
    const copy=el('span','fr-v5-notices__copy');
    copy.append(el('strong','',x.title),el('small','',x.service+' · '+x.date));
    a.append(copy,el('span','fr-v5-notices__arrow','↗'));
    return a;
   }));
   list.append(el('p','fr-v5-notices__warning','Announcements are not live availability guarantees.'));
  }catch{mockFreeState(list,'Release notices are temporarily unavailable. Use the complete discovery tools below.');}
 };
 const addRanking=async(parent)=>{
  const p=panel('fr-v5-ranking','TOP 20 HORROR','Verified viewer rankings.','/top-20/'+new Date().getFullYear()+'/');
  const list=el('ol','fr-v5-ranking__list');p.append(list);parent.append(p);
  // Reserve real row heights until sourced rankings arrive. Unlike the
  // former one-line loading label, replacing this ledger will not move
  // the poster shelves hundreds of pixels after first paint.
  list.setAttribute('aria-label','Source-backed annual horror rankings');
  list.append(...Array.from({length:10},()=>{
   const row=el('li','fr-v5-ranking__skeleton-entry');
   row.setAttribute('aria-hidden','true');
   row.append(el('span','fr-v5-ranking__skeleton-position'),
    el('span','fr-v5-ranking__skeleton-title'),
    el('span','fr-v5-ranking__skeleton-score'));
   return row;
  }));
  try {
   const response=await fetch('/api/rankings?year='+new Date().getFullYear(),{headers:{accept:'application/json'}});
   if(!response.ok)throw Error('ranking unavailable');
   const data=await response.json();
   const items=(Array.isArray(data.items)?data.items:[]).filter(x=>x&&typeof x.title==='string'&&Number.isInteger(x.position)&&Number.isInteger(x.averageScore)&&x.position>=1&&x.position<=20).sort((a,b)=>a.position-b.position).slice(0,10);
   if(!items.length){mockFreeState(list,'This year’s verified ranking is still being assembled.');return;}
   list.replaceChildren();
   const meta=el('small','fr-v5-ranking__source',data.ratingKind==='tmdb-community'?'TMDB COMMUNITY · /10':'VERIFIED PROFESSIONAL CRITICS · /10');
   list.before(meta);
   for(const x of items){
    const li=el('li','fr-v5-ranking__entry');
    const position=el('span','fr-v5-ranking__position',String(x.position).padStart(2,'0'));
    const item=link(x.title,x.tmdbId?'/media.html?type=movie&id='+Number(x.tmdbId):'/top-20/'+new Date().getFullYear()+'/','fr-v5-ranking__movie');
    const score=el('span','fr-v5-ranking__score');
    if(data.ratingKind==='tmdb-community')window.FRRatingBadge.render(score,window.FRRatingBadge.fromTmdbChart(x,'compact'));
    else score.textContent=(x.averageScore/10).toFixed(1);
    li.append(position,item,score);list.append(li);
   }
  } catch{mockFreeState(list,'The live rankings could not be loaded. Open the annual ranking page to retry.');}
 };
 const addTrailer=async(parent,type,{hideWhenUnavailable=false}={})=>{
  const p=panel('fr-v5-trailer',type==='indie'?'LATEST INDIE TRAILERS':'LATEST TRAILERS','Verified official trailers.',type==='indie'?'#trending':'#upcoming');
  const node=el('div','fr-v5-trailer__content');
  node.append(el('p','fr-v5-loading','Checking official trailers…'));p.append(node);parent.append(p);
  try{
   const data=await fetchList(type,'trending');
   const featured=data.find(x=>/^[A-Za-z0-9_-]{11}$/.test(mediaKey(x)));
   if(!featured){p.remove();return;}
   const a=link('',filmHref(featured,type),'fr-v5-trailer__film');
   a.append(image(featured,type),el('strong','',featured.title));
   const play=link('▶','#','fr-v5-trailer__play');
   play.setAttribute('aria-label','Watch official trailer for '+featured.title);
   if(!guard(play,mediaKey(featured))){mockFreeState(node,'No verified video available.');return;}
   node.replaceChildren(a,play);
  }catch{p.remove();}
 };
 const addUpcoming=async(parent,type)=>{
  const p=panel('fr-v5-announced','NEWLY ANNOUNCED','Upcoming horror worth watching.',type==='indie'?'#upcoming':'#upcoming');
  const node=el('div','fr-v5-announced__content', 'Looking for verified premieres…');p.append(node);parent.append(p);
  try{
   const data=await fetchList(type,'upcoming');
   const film=data.find(x=>x&&valid(x));
   if(!film){p.remove();return;}
   const a=link('',filmHref(film,type),'fr-v5-announced__row');
   a.append(image(film,type));
   const copy=el('div','fr-v5-announced__copy');
   copy.append(el('strong','',film.title));
   const released=film.releaseDate||film.firstReleaseDate;
   if(/^\d{4}-\d{2}-\d{2}$/.test(released||''))copy.append(el('small','',released+' · Release details'));
   copy.append(el('span','',String(film.overview||'Explore the title and its source-linked release details.').slice(0,150)));
   a.append(copy,el('span','fr-v5-announced__arrow','›'));node.replaceChildren(a);
  }catch{p.remove();}
 };
 const addEditorialList=async(config,host)=>{
  const p=panel('fr-v5-rack',config.heading,config.tagline,config.href);
  const grid=el('div','fr-v5-editorial-grid');p.append(grid);host.append(p);
  try{
   const cached=window.FR_EDITORIAL_BOOTSTRAP?.schemaVersion===1
     ?window.FR_EDITORIAL_BOOTSTRAP.editorial:null;
   const data=cached || await fetch('/data/editorial.json')
     .then(response=>{if(!response.ok)throw Error('Editorial feed unavailable');return response.json();});
   const entries=(Array.isArray(data[config.editorial])?data[config.editorial]:[]).filter(x=>typeof x.title==='string'&&/^https:\/\//.test(x.sourceUrl||'')).slice(0,6);
   if(!entries.length)return mockFreeState(grid,'No source-checked recommendations are available.');
   const backdrop=config.editorial==='games'?'/assets/worlds/games-control-room.webp':'/assets/worlds/podcast-studio.webp';
   grid.replaceChildren(...entries.map(x=>{
    const a=link('',x.sourceUrl,'fr-v5-editorial-tile');
    a.target='_blank';a.rel='noopener noreferrer';
    a.dataset.editorialTitle=x.title;
    a.style.setProperty('--fr-v5-tile-image','url("'+backdrop+'")');
    a.append(el('span','fr-v5-editorial-tile__eyebrow',x.category||config.editorial),el('strong','',x.title),el('small','',x.sourceName||'Publisher source'),el('span','fr-v5-editorial-tile__go','EXPLORE  ›'));
    return a;
   }));
   if(config.editorial==='podcasts'){
    // This route already supplies creator artwork. Match by exact title and
    // retain the house scene whenever an image is absent or fails to load.
    try{
     const response=await fetch('/api/podcasts',{headers:{accept:'application/json'}});
     if(response.ok){
      const shows=await response.json();
      const covers=new Map((Array.isArray(shows.items)?shows.items:[])
       .filter(x=>x&&typeof x.title==='string'&&typeof x.artworkUrl==='string')
       .map(x=>[x.title.trim().toLocaleLowerCase('en-GB'),x.artworkUrl]));
      for(const tile of grid.querySelectorAll('[data-editorial-title]')){
       const url=covers.get(tile.dataset.editorialTitle.trim().toLocaleLowerCase('en-GB'));
       if(!url)continue;
       try{
        const parsed=new URL(url);
        if(parsed.protocol!=='https:')continue;
        const art=new Image();
        art.onload=()=>tile.style.setProperty('--fr-v5-tile-image','url("'+parsed.href.replace(/"/g,'%22')+'")');
        art.src=parsed.href;
       }catch{}
      }
     }
    }catch{}
   }
  }catch{mockFreeState(grid,'Recommendations are unavailable. Explore the editorial selections below.');}
 };
 function mobileDock(){
  if(document.querySelector('.fr-v5-mobile-dock'))return;
  const nav=el('nav','fr-v5-mobile-dock');nav.setAttribute('aria-label','Quick horror sections');
  [
   ['⌂','HOME','/','home'],
   ['◉','MOVIES','/movies.html','movies'],
   ['♟','INDIE','/indie-movies.html','indie'],
   ['♫','PODCASTS','/podcasts.html','podcasts'],
   ['✦','GAMES','/games.html','games']
  ].forEach(([symbol,label,href,id])=>{
   const a=link('',href,theme===id?'active':'');
   a.append(el('span','fr-v5-dock-symbol',symbol),el('small','',label));
   if(theme===id)a.setAttribute('aria-current','page');
   nav.append(a);
  });document.body.append(nav);
 }
 function decorateHero(){
  const carousel=main.querySelector('.editorial-carousel');if(!carousel)return;
  const current=carousel.querySelector('.editorial-pick');
  if(current&&!current.querySelector('.fr-v5-rating-note')){
   const note=el('span','fr-v5-rating-note','Scores are displayed only when verified.');
   note.hidden=true;current.append(note);
  }
 }
 async function build(){
  if(main.dataset.frV5Ready)return;
  installHeader();
  main.dataset.frV5Ready='true';
  mobileDock();
  // Cinema stays in document order: never flash or relocate its diary after load.
  if(theme==='home'){mountHomeWatchlist();return;}
  if(theme==='cinema')return;
  decorateHero();
  const config=configs[theme];if(!config)return;
  const showcase=el('div','fr-v5-front');
  showcase.setAttribute('aria-label','Frightertainment featured horror discovery');
  const after=main.querySelector('.editorial-carousel')||intro;
  if(!after)return;
  after.insertAdjacentElement('afterend',showcase);
  const jobs=[];
  if(config.editorial){
   jobs.push(addEditorialList(config,showcase));
   // Keep the working chart accessible in the visible page composition.
   // Its order is editorial; it is not an invented audience rating.
   if(theme==='podcasts'){
    const chart=main.querySelector('.podcast-chart');
    if(chart){chart.classList.add('fr-v5-pinned');showcase.append(chart);}
   }
  }else{
   const upper=el('div','fr-v5-feature-panels');
   if(theme==='movies'){
    jobs.push(addRanking(upper));
    jobs.push(addTrailer(upper,'movie',{hideWhenUnavailable:true}));
    showcase.append(upper);
    const explore=el('nav','fr-v5-explore');
    explore.setAttribute('aria-label','Explore horror movies');
    explore.append(el('h2','','EXPLORE MOVIES'));
    for(const [label,href,art] of [
      ['2026 HORROR','/all-horror-movies.html?year=2026','all'],
      ['NEW RELEASES','/movies.html#straight-to-stream','new'],
      ['INDIE','/indie-movies.html','indie'],
      ['CULT CLASSICS','/all-horror-movies.html?year=1980','classics'],
      ['1978 HORROR','/all-horror-movies.html?year=1978','top']
    ]){
     const a=link(label+'  ›',href,'fr-v5-explore__tile');a.dataset.art=art;explore.append(a);
    }
    main.insertBefore(explore,showcase);
    // The approved desktop composition pairs the editorial film and the
    // working chart. Keep the source-backed chart after the hero on phones.
    const ranking=upper.querySelector('.fr-v5-ranking');
    const spotlight=el('div','fr-v5-spotlight-row');
    const wide=window.matchMedia('(min-width:1000px)');
    const arrange=()=>{
      if(wide.matches){
        main.insertBefore(spotlight,explore);
        spotlight.append(after,explore,ranking);
      }else{
        main.insertBefore(after,showcase);
        main.insertBefore(explore,showcase);
        upper.insertBefore(ranking,upper.children[1]||null);
        spotlight.remove();
      }
      // The editorial renderer owns stable-height measurement. Notify it
      // synchronously when the *container* changes, even without viewport resize.
      after.dispatchEvent(new Event('fr:editorial-layout-change'));
    };
    arrange();wide.addEventListener('change',arrange);
   }
   jobs.push(showPosterRack(config,showcase));
   if(theme==='indie'||theme==='tv'){
    const lower=el('div','fr-v5-secondary-panels');
    jobs.push(addUpcoming(lower,config.type));
    jobs.push(addTrailer(lower,config.type));
    showcase.append(lower);
   }
  }

  if(theme!=='home'&&document.querySelector('.fr-v5-front')){
   const original=[...main.children].filter(node=>node!==intro&&node!==showcase&&node!==main.querySelector('.editorial-carousel')&&!node.classList.contains('fr-v5-spotlight-row')&&!node.classList.contains('fr-v5-explore')&&node.tagName!=='SCRIPT'&&!node.classList.contains('fr-v5-deeper')&&!node.classList.contains('fr-v5-pinned'));
   if(original.length){
    const details=el('details','fr-v5-deeper');
    details.id='fr-v5-complete-discovery';
    const summary=el('summary','fr-v5-deeper__summary');
    const heading=el('span','fr-v5-deeper__heading','EXPLORE THE COMPLETE '+(theme==='indie'?'INDIE':theme==='tv'?'TV':theme==='cinema'?'CINEMA':theme==='movies'?'HORROR':'EDITORIAL')+' COLLECTION');
    const explain=el('small','','All original charts, release tools, archive controls and source-linked listings are preserved here.');
    const arrow=el('span','fr-v5-deeper__arrow','OPEN FULL DISCOVERY  ↓');
    const wrapper=el('span','fr-v5-deeper__text');wrapper.append(heading,explain);
    summary.append(wrapper,arrow);details.append(summary);
    for(const node of original)details.append(node);
    main.append(details);
    const reveal=()=>{
     const hash=location.hash.slice(1);
     if(hash && /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(hash) && details.querySelector('#'+CSS.escape(hash))){details.open=true;}
    };
    window.addEventListener('hashchange',reveal);
    document.addEventListener('click',event=>{
     const anchor=event.target.closest('a[href^="#"]');
     if(anchor&&/^#[a-zA-Z][a-zA-Z0-9_-]*$/.test(anchor.getAttribute('href')||'')&&details.querySelector(anchor.getAttribute('href'))){
      details.open=true;
     }
    });
    reveal();
   }
  }

  await Promise.allSettled(jobs);
 }
 // Keep editorial-spotlight.mjs as the carousel owner: place our page sections
 // only after its async insertion; preserve the original accessible catalogue.
 if(theme==='home'||theme==='cinema'){build();return;}
 if(main.querySelector('.editorial-carousel')){build();return;}
 const observer=new MutationObserver(()=>{
  if(main.querySelector('.editorial-carousel')){
   observer.disconnect();build();
  }
 });
 observer.observe(main,{childList:true,subtree:false});
 setTimeout(()=>{observer.disconnect();build();},7500);
})();
