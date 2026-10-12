/* Frightertainment V5: structural magazine modules based on owner-approved
   Indie mobile and Movies desktop concept art. No fabricated reviews, dates,
   watchlists, ranking values, video links or third-party poster rights. */
(() => {
 'use strict';
 const theme=location.pathname.endsWith('/cinema.html')?'cinema':document.body?.dataset.theme;
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
  const foot=el('div','fr-v5-poster__bottom');
  foot.append(el('strong','',x.title));
  const year=Number(String(x.firstReleaseDate||x.releaseDate||'').slice(0,4));
  if(year>=1888&&year<=2100) foot.append(el('small','',String(year)));
  a.append(art,foot);
  a.setAttribute('aria-label','Explore '+x.title+' details');
  return a;
 };
 const valid=x=>x&&typeof x.title==='string'&&x.title.trim()&&itemId(x)>0;
 const fetchList=async(type,mode)=>{
  const query=new URLSearchParams({type,mode,page:'1'});if(mode==='cinema')query.set('country','GB');
  const url='/api/catalogue?'+query;
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),10000);
  try {
   const response=await fetch(url,{headers:{accept:'application/json'},signal:controller.signal});
   if(!response.ok)throw new Error('Catalogue unavailable');
   const data=await response.json();
   if(!Array.isArray(data.items))throw new Error('Catalogue response invalid');
   return data.items.filter(valid);
  } finally {clearTimeout(timeout);}
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
 const showPosterRack=async(config,host)=>{
  const p=panel('fr-v5-rack',config.heading,config.tagline,config.href);
  const grid=el('div','fr-v5-poster-grid');
  grid.setAttribute('aria-live','polite');
  grid.append(el('p','fr-v5-loading','Finding source-linked releases…'));
  p.append(grid);host.append(p);
  try{
   const data=await fetchList(config.type,config.mode);
   if(!data.length) return mockFreeState(grid,'No verified titles are available in this selection yet. Explore the complete catalogue below.');
   grid.replaceChildren(...data.slice(0,config.type==='indie'?3:8).map(x=>poster(x,config.type)));
  }catch{mockFreeState(grid,'The live catalogue is unavailable right now. The full catalogue and archive remain below.');}
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
  const p=panel('fr-v5-ranking','TOP 20 HORROR','TMDB community rankings, where available.','/top-20/'+new Date().getFullYear()+'/');
  const list=el('ol','fr-v5-ranking__list');p.append(list);parent.append(p);
  list.append(el('li','fr-v5-loading','Loading verified annual scores…'));
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
    const score=el('span','fr-v5-ranking__score',(x.averageScore/10).toFixed(1));
    li.append(position,item,score);list.append(li);
   }
  } catch{mockFreeState(list,'The live rankings could not be loaded. Open the annual ranking page to retry.');}
 };
 const addTrailer=async(parent,type)=>{
  const p=panel('fr-v5-trailer','LATEST TRAILERS','Play an official film trailer, when verified.',type==='indie'?'#trending':'#upcoming');
  const node=el('div','fr-v5-trailer__content');
  node.append(el('p','fr-v5-loading','Checking official trailers…'));p.append(node);parent.append(p);
  try{
   const data=await fetchList(type,'trending');
   const featured=data.find(x=>/^[A-Za-z0-9_-]{11}$/.test(mediaKey(x)));
   if(!featured){mockFreeState(node,'No verified trailer is attached to this selection. Browse the films for official video sources.');return;}
   const a=link('',filmHref(featured,type),'fr-v5-trailer__film');
   a.append(image(featured,type),el('strong','',featured.title));
   const play=link('▶  WATCH OFFICIAL TRAILER','#','fr-v5-trailer__play');
   if(!guard(play,mediaKey(featured))){mockFreeState(node,'No verified video available.');return;}
   node.replaceChildren(a,play);
  }catch{mockFreeState(node,'Trailers could not be checked. Find source-linked films in the catalogue below.');}
 };
 const addUpcoming=async(parent,type)=>{
  const p=panel('fr-v5-announced','NEWLY ANNOUNCED','Upcoming horror worth watching.',type==='indie'?'#upcoming':'#upcoming');
  const node=el('div','fr-v5-announced__content', 'Looking for verified premieres…');p.append(node);parent.append(p);
  try{
   const data=await fetchList(type,'upcoming');
   const film=data.find(x=>x&&valid(x));
   if(!film){mockFreeState(node,'No confirmed upcoming entry is available at the moment.');return;}
   const a=link('',filmHref(film,type),'fr-v5-announced__row');
   a.append(image(film,type));
   const copy=el('div','fr-v5-announced__copy');
   copy.append(el('strong','',film.title));
   const released=film.releaseDate||film.firstReleaseDate;
   if(/^\d{4}-\d{2}-\d{2}$/.test(released||''))copy.append(el('small','',released+' · Release details'));
   copy.append(el('span','',String(film.overview||'Explore the title and its source-linked release details.').slice(0,150)));
   a.append(copy,el('span','fr-v5-announced__arrow','›'));node.replaceChildren(a);
  }catch{mockFreeState(node,'New release information could not be loaded. Check the catalogue below.');}
 };
 const addEditorialList=async(config,host)=>{
  const p=panel('fr-v5-rack',config.heading,config.tagline,config.href);
  const grid=el('div','fr-v5-editorial-grid');p.append(grid);host.append(p);
  try{
   const response=await fetch('/data/editorial.json');
   if(!response.ok)throw Error('Editorial feed unavailable');
   const data=await response.json();
   const entries=(Array.isArray(data[config.editorial])?data[config.editorial]:[]).filter(x=>typeof x.title==='string'&&/^https:\/\//.test(x.sourceUrl||'')).slice(0,6);
   if(!entries.length)return mockFreeState(grid,'No source-checked recommendations are available.');
   const backdrop=config.editorial==='games'?'/assets/worlds/games-control-room.webp':'/assets/worlds/podcast-studio.webp';
   grid.replaceChildren(...entries.map(x=>{
    const a=link('',x.sourceUrl,'fr-v5-editorial-tile');
    a.target='_blank';a.rel='noopener noreferrer';
    a.style.setProperty('--fr-v5-tile-image','url("'+backdrop+'")');
    a.append(el('span','fr-v5-editorial-tile__eyebrow',x.category||config.editorial),el('strong','',x.title),el('small','',x.sourceName||'Publisher source'),el('span','fr-v5-editorial-tile__go','EXPLORE  ›'));
    return a;
   }));
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
  main.dataset.frV5Ready='true';
  mobileDock();
  if(theme==='home')return;
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
  }else{
   const upper=el('div','fr-v5-feature-panels');
   if(theme==='movies'){
    jobs.push(addNotices(upper));
    jobs.push(addRanking(upper));
    jobs.push(addTrailer(upper,'movie'));
    showcase.append(upper);
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
   const original=[...main.children].filter(node=>node!==intro&&node!==showcase&&node!==main.querySelector('.editorial-carousel')&&node.tagName!=='SCRIPT'&&!node.classList.contains('fr-v5-deeper'));
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
 if(theme==='home'){build();return;}
 if(main.querySelector('.editorial-carousel')){build();return;}
 const observer=new MutationObserver(()=>{
  if(main.querySelector('.editorial-carousel')){
   observer.disconnect();build();
  }
 });
 observer.observe(main,{childList:true,subtree:false});
 setTimeout(()=>{observer.disconnect();build();},7500);
})();