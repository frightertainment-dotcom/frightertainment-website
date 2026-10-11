/* Frightertainment: source-checked streaming horror, not a real-time provider stock feed. */
(() => {
  'use strict';
  const root=document.querySelector('#straight-to-stream');
  if(!root)return;
  const list=root.querySelector('[data-stream-list]');
  const yearChoice=root.querySelector('[data-stream-year]');
  const countryChoice=root.querySelector('[data-stream-country]');
  const stateText=root.querySelector('[data-stream-status]');
  const more=root.querySelector('[data-stream-more]');
  const chart=root.querySelector('[data-stream-chart]');
  const chartStatus=root.querySelector('[data-stream-chart-status]');
  const chartYear=root.querySelector('[data-stream-chart-year]');
  const tabs=[...root.querySelectorAll('[data-stream-access]')];
  const today=new Date().toISOString().slice(0,10);
  const yr=new Date().getUTCFullYear();
  const countryNames={GB:'UK',US:'US'};
  const accessLabels={
    subscription:'INCLUDED WITH SUBSCRIPTION',
    free:'FREE TO WATCH · ADS POSSIBLE',
    'rent-buy':'DIGITAL RENT / BUY'
  };
  const classLabels={
    'platform-original':'STREAMING ORIGINAL',
    'platform-exclusive':'STREAMING EXCLUSIVE',
    'new-to-platform':'NEW TO THIS SERVICE',
    'digital-premiere':'DIGITAL PREMIERE',
    'digital-home':'HOME RELEASE AFTER CINEMA'
  };
  let all=[],state={country:'GB',year:String(yr),access:'all',visible:8},requestNumber=0;
  const valid=e=>e&&/^[a-z0-9-]+$/.test(e.id||'')&&typeof e.title==='string'&&
    /^\d{4}-\d{2}-\d{2}$/.test(e.streamDate||'')&&Number.isInteger(e.filmYear)&&
    ['free','subscription','rent-buy'].includes(e.access)&&
    ['platform-original','platform-exclusive','new-to-platform','digital-premiere','digital-home'].includes(e.premiereKind)&&
    Array.isArray(e.countries)&&e.countries.every(x=>x==='GB'||x==='US')&&
    typeof e.sourceUrl==='string'&&e.sourceUrl.startsWith('https://');
  const node=(tag,cls,content)=>{
    const n=document.createElement(tag);if(cls)n.className=cls;
    if(content!==undefined)n.textContent=String(content);
    return n;
  };
  const link=(label,url,cls)=>{
    const a=node('a',cls,label);
    if(/^https:\/\/[^/\s]+/.test(url||'')){a.href=url;a.target='_blank';a.rel='noopener noreferrer';}
    else a.href='/all-horror-movies.html';
    return a;
  };
  const archiveId=e=>'manual:stream-'+e.id;
  const filmPage=e=>'/archive-film.html?id='+encodeURIComponent(archiveId(e));
  const fmt=date=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return date;
    return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})
      .format(new Date(date+'T12:00:00Z'));
  };
  const summary=e=>{
    if(e.premiereKind==='platform-original')return 'A streaming-service Original.';
    if(e.premiereKind==='platform-exclusive')return 'An exclusive streaming arrival, not necessarily the first public screening.';
    if(e.premiereKind==='digital-premiere')return 'A source-listed digital launch.';
    if(e.premiereKind==='digital-home')return 'Available on digital after an earlier or simultaneous cinema run.';
    return 'A new catalogue arrival — the film may have premiered elsewhere earlier.';
  };
  const card=e=>{
    const wrap=node('article','fr-stream__card');wrap.dataset.mediaType='movie';
    wrap.dataset.mediaTitle=e.title;wrap.dataset.mediaYear=String(e.filmYear);
    if(Number.isInteger(e.tmdbId)&&e.tmdbId>0)wrap.dataset.tmdbId=String(e.tmdbId);
    const art=node('a','fr-stream__art');art.href=filmPage(e);
    const image=node('img','fr-stream__poster');image.hidden=true;
    image.alt='Poster for '+e.title;image.loading='lazy';image.decoding='async';image.dataset.mediaField='poster';
    const fallback=node('span','fr-stream__poster-fallback');
    fallback.append(node('span','','FRIGHTERTAINMENT'),node('strong','','FILM FILE'));
    art.append(image,fallback);
    const content=node('div','fr-stream__body');
    const type=node('span','fr-stream__kind',classLabels[e.premiereKind]);
    const heading=node('h4','fr-stream__title');const title=node('a','',e.title);title.href=filmPage(e);heading.append(title);
    const meta=node('p','fr-stream__meta',e.platform+' · '+e.filmYear+' film');
    const access=node('p','fr-stream__access-label',accessLabels[e.access]);
    const when=e.dateBasis==='listed-by'?'SOURCE AVAILABILITY CHECKED BY '+fmt(e.streamDate)
      :e.streamDate>today?'ANNOUNCED FOR '+fmt(e.streamDate):'STREAM / DIGITAL RELEASE · '+fmt(e.streamDate);
    const date=node('p','fr-stream__release',when);
    const rating=node('span','fr-stream__rating','Checking TMDB rating…');rating.dataset.mediaField='rating';
    const description=node('p','fr-stream__summary',e.synopsis||summary(e));
    const actions=node('div','fr-stream__actions');
    const source=link('RELEASE SOURCE ↗',e.sourceUrl,'fr-stream__source');
    actions.append(source);
    if(e.watchUrl){
      actions.append(link(e.access==='rent-buy'?'CHECK DIGITAL STORE ↗':'CHECK '+e.platform.toUpperCase()+' ↗',
        e.watchUrl,'fr-stream__watch'));
    }
    const trailer=node('button','fr-trailer-button fr-stream__trailer','▶ TRAILER');
    trailer.type='button';trailer.hidden=true;trailer.dataset.mediaField='trailer';
    actions.append(trailer);
    content.append(type,heading,meta,access,date,rating,description,actions);
    wrap.append(art,content);
    return wrap;
  };
  const rankingCandidates=()=>all.filter(e=>e.filmYear===Number(state.year==='all'?yr:state.year)
      &&e.countries.includes(state.country)&&e.streamDate<=today&&e.chartEligible===true&&
      ['platform-original','digital-premiere'].includes(e.premiereKind));
  const norm=t=>String(t||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/^the\s+/,'').replace(/[^a-z0-9]+/g,' ').trim();
  async function renderChart(){
    const revision=++requestNumber;
    const year=Number(state.year==='all'?yr:state.year);
    chart.replaceChildren();
    chartYear.textContent=year+' · '+countryNames[state.country];
    const choices=rankingCandidates();
    if(!choices.length){chartStatus.textContent='No confirmed streaming-first premieres in this country and film year yet.';return;}
    if(!window.FRMedia?.get){chartStatus.textContent='Viewer ratings are temporarily unavailable.';return;}
    chartStatus.textContent='Checking TMDB viewer votes on the source-listed premieres…';
    const candidates=choices.filter((e,i,arr)=>arr.findIndex(x=>norm(x.title)===norm(e.title))===i).slice(0,14);
    const rated=await Promise.all(candidates.map(async e=>{
      const params={type:'movie'};
      if(Number.isInteger(e.tmdbId)&&e.tmdbId>0)params.id=String(e.tmdbId);
      else {params.title=e.title;params.year=String(e.filmYear);}
      try{
        const item=await window.FRMedia.get(params);
        if(!item||norm(item.title)!==norm(e.title)||!Number.isFinite(item.voteAverage)||
          item.voteAverage<=0||!Number.isInteger(item.voteCount)||item.voteCount<20)return null;
        return {item,e};
      }catch{return null;}
    }));
    if(revision!==requestNumber)return;
    const charted=rated.filter(Boolean).sort((a,b)=>b.item.voteAverage-a.item.voteAverage||
      b.item.voteCount-a.item.voteCount||a.e.title.localeCompare(b.e.title)).slice(0,5);
    for(let i=0;i<charted.length;i++){
      const {item,e}=charted[i];const li=node('li','fr-stream__rank-row');
      const number=node('span','fr-stream__rank-number',String(i+1).padStart(2,'0'));
      const detail=node('span','fr-stream__rank-info');
      const title=node('a','',e.title);title.href=filmPage(e);
      const note=node('small','',e.platform+' · '+new Intl.NumberFormat('en-GB').format(item.voteCount)+' votes');
      detail.append(title,note);
      const score=node('strong','fr-stream__rank-score',item.voteAverage.toFixed(1)+'/10');
      li.append(number,detail,score);chart.append(li);
    }
    chartStatus.textContent=charted.length
      ?'TMDB community scores · rated titles from '+candidates.length+' sourced premieres · refreshed on request.'
      :'No eligible film has 20 verified TMDB votes yet. Scores appear here as audiences rate them.';
  }
  function paint(){
    const matches=all.filter(e=>e.countries.includes(state.country)&&
      (state.year==='all'||e.filmYear===Number(state.year))&&
      (state.access==='all'||e.access===state.access))
      .sort((a,b)=>Number(b.streamDate<=today)-Number(a.streamDate<=today)||
        b.streamDate.localeCompare(a.streamDate)||a.title.localeCompare(b.title));
    const unique=[],used=new Set();
    for(const e of matches){const key=e.title.toLowerCase()+'|'+e.filmYear+'|'+e.access;
      if(used.has(key))continue;used.add(key);unique.push(e);}
    const showing=unique.slice(0,state.visible);
    list.replaceChildren(...showing.map(card));
    stateText.textContent=unique.length+' source-linked film'+(unique.length===1?'':'s')+
      ' · '+countryNames[state.country]+' · '+(state.year==='all'?'all film years':state.year+' films');
    if(!showing.length)list.append(node('p','fr-stream__empty',
      'No sourced releases match this selection yet. Try another viewing type, year or country.'));
    more.hidden=unique.length<=showing.length;
    if(!more.hidden)more.textContent='SHOW '+Math.min(8,unique.length-showing.length)+' MORE HORROR RELEASES ↓';
    window.FRMedia?.scan?.();
    renderChart();
  }
  const saved=(()=>{
    try{return localStorage.getItem('fr-cinema-country')||localStorage.getItem('fr-stream-country');}
    catch{return null;}
  })();
  if(saved==='GB'||saved==='US')state.country=saved;
  countryChoice.value=state.country;
  yearChoice.value=state.year;
  countryChoice.addEventListener('change',()=>{state.country=countryChoice.value;state.visible=8;paint();
    try{localStorage.setItem('fr-stream-country',state.country);}catch{}});
  yearChoice.addEventListener('change',()=>{state.year=yearChoice.value;state.visible=8;paint();});
  tabs.forEach(button=>button.addEventListener('click',()=>{
    state.access=button.dataset.streamAccess;state.visible=8;
    tabs.forEach(b=>{const active=b===button;b.classList.toggle('active',active);
      b.setAttribute('aria-pressed',String(active));});paint();
  }));
  more.addEventListener('click',()=>{state.visible+=8;paint();});
  fetch('/data/streaming-discovery.json',{headers:{accept:'application/json'}})
    .then(async response=>response.ok?response.json():null)
    .then(data=>{
      if(data?.schemaVersion!==1||!Array.isArray(data.entries))throw new Error('Streaming inventory missing');
      all=data.entries.filter(valid);paint();
    })
    .catch(()=>{
      stateText.textContent='Source-linked streaming releases are temporarily unavailable.';
      chartStatus.textContent='Annual streaming-film chart temporarily unavailable.';
      list.replaceChildren(node('p','fr-stream__empty',
        'Try the Movie Vault and check back soon for the streaming list.'));
    });
})();
