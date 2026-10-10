(() => {
  'use strict';
  const root=document.getElementById('hub-release-list');
  if(!root)return;
  const today=new Date().toISOString().slice(0,10);
  const horizonDate=new Date();
  horizonDate.setUTCMonth(horizonDate.getUTCMonth()+18);
  const horizon=horizonDate.toISOString().slice(0,10);
  const theatrical=x=>/cinema|theatrical|international release/i.test(String(x.label||''));
  const validDate=value=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return false;
    const date=new Date(value+'T12:00:00Z');
    return Number.isFinite(date.valueOf())&&date.toISOString().slice(0,10)===value;
  };
  const entries=(Array.isArray(window.FR_MOVIES)?window.FR_MOVIES:[]).flatMap(film=>
    (film.claims||[]).filter(claim=>claim.field==='releaseDate' &&
      validDate(claim.value) &&
      claim.value>today && claim.value<=horizon &&
      /^https:\/\//.test(claim.source||'') && claim.territory &&
      theatrical(claim)).map(claim=>({film,claim}))
  ).sort((a,b)=>a.claim.value.localeCompare(b.claim.value) ||
      a.film.title.localeCompare(b.film.title));
  if(!entries.length){
    const state=document.createElement('p');
    state.className='hub-release-meta';
    state.textContent='New cinema announcements will appear here. Explore the Horror Vault while you wait.';
    root.replaceChildren(state);return;
  }
  const intro=document.createElement('p');
  intro.className='hub-release-meta';
  intro.textContent=entries.length+' upcoming cinema release date'+(entries.length===1?'':'s')+' · Dates vary by region';
  root.replaceChildren(intro);
  const fmt=iso=>new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',day:'numeric',month:'short',year:'numeric'}).format(new Date(iso+'T12:00:00Z'));
  const byFilm=new Map();
  for(const entry of entries){
    const key=entry.film.id;
    if(!byFilm.has(key))byFilm.set(key,{film:entry.film,claims:[]});
    const group=byFilm.get(key);
    const claimKey=entry.claim.value+'|'+entry.claim.territory+'|'+entry.claim.source;
    if(!group.claims.some(claim=>claim.value+'|'+claim.territory+'|'+claim.source===claimKey))group.claims.push(entry.claim);
  }
  for(const {film,claims} of byFilm.values()){
    claims.sort((a,b)=>a.value.localeCompare(b.value)||a.territory.localeCompare(b.territory));
    const row=document.createElement('article');row.className='hub-release-row';
    const dateList=document.createElement('div');dateList.className='hub-release-row__dates';
    for(const claim of claims){
      const dateLine=document.createElement('span');dateLine.className='hub-release-row__date';
      const date=document.createElement('time');date.dateTime=claim.value;date.textContent=fmt(claim.value);
      const territory=document.createElement('small');territory.textContent=claim.territory;
      dateLine.append(date,territory);dateList.append(dateLine);
    }
    const detail=document.createElement('div');
    const title=document.createElement('a');title.href='/films/'+encodeURIComponent(film.id)+'/';title.textContent=film.title;
    detail.append(title);
    const status=document.createElement('span');status.className='hub-release-state';status.textContent='COMING SOON';
    const sources=document.createElement('div');sources.className='hub-release-row__sources';
    for(const claim of claims){
      const source=document.createElement('a');source.href=claim.source;source.className='hub-release-source';
      source.target='_blank';source.rel='noopener noreferrer';source.textContent=claim.territory+' SOURCE →';
      source.setAttribute('aria-label','Check official '+claim.territory+' release announcement for '+film.title);
      sources.append(source);
    }
    row.append(dateList,detail,status,sources);root.append(row);
  }
})();
