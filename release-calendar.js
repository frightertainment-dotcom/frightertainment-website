(() => {
  'use strict';
  const root=document.getElementById('hub-release-list');
  if(!root)return;
  const today=new Date().toISOString().slice(0,10);
  const horizonDate=new Date();
  horizonDate.setUTCMonth(horizonDate.getUTCMonth()+18);
  const horizon=horizonDate.toISOString().slice(0,10);
  const theatrical=x=>/cinema|theatrical|international release/i.test(String(x.label||''));
  const entries=(Array.isArray(window.FR_MOVIES)?window.FR_MOVIES:[]).flatMap(film=>
    (film.claims||[]).filter(claim=>claim.field==='releaseDate' &&
      /^\d{4}-\d{2}-\d{2}$/.test(claim.value||'') &&
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
  const seen=new Set();
  for(const {film,claim} of entries){
    const key=film.id+'|'+claim.value+'|'+claim.territory;
    if(seen.has(key))continue;seen.add(key);
    const row=document.createElement('article');row.className='hub-release-row';
    const date=document.createElement('time');date.dateTime=claim.value;date.textContent=fmt(claim.value);
    const detail=document.createElement('div');
    const title=document.createElement('a');title.href='/films/'+encodeURIComponent(film.id)+'/';title.textContent=film.title;
    const territory=document.createElement('small');territory.textContent=claim.territory;
    detail.append(title,territory);
    const status=document.createElement('span');status.className='hub-release-state';status.textContent='COMING SOON';
    const source=document.createElement('a');source.href=claim.source;source.className='hub-release-source';
    source.target='_blank';source.rel='noopener noreferrer';source.textContent='OFFICIAL SOURCE →';
    source.setAttribute('aria-label','Check official release announcement for '+film.title);
    row.append(date,detail,status,source);root.append(row);
  }
})();
