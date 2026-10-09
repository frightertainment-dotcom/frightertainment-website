(() => {
  'use strict';
  const root=document.getElementById('hub-release-list');
  if (!root) return;
  const movies=Array.isArray(window.FR_MOVIES)?window.FR_MOVIES:[];
  const checked=new Date().toISOString().slice(0,10);
  const raw=movies.flatMap(film=>(film.claims||[])
    .filter(claim=>claim.field==='releaseDate' && /^\d{4}-\d{2}-\d{2}$/.test(claim.value||'') && claim.source && claim.territory)
    .map(claim=>({film,claim})));
  raw.sort((a,b)=>a.claim.value.localeCompare(b.claim.value)||a.film.title.localeCompare(b.film.title));
  if(!raw.length){root.textContent='No territory-specific dates have been verified yet.';return;}
  const intro=document.createElement('p');
  intro.className='hub-release-meta';
  intro.textContent=raw.length+' sourced release date'+(raw.length===1?'':'s')+' · Updated by calendar date ('+checked+' UTC) · No UK availability inferred';
  root.replaceChildren(intro);
  for(const {film,claim} of raw) {
    const article=document.createElement('article');article.className='hub-release-row';
    const date=document.createElement('time');date.dateTime=claim.value;
    date.textContent=new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',day:'numeric',month:'short',year:'numeric'}).format(new Date(claim.value+'T12:00:00Z'));
    const details=document.createElement('div');
    const link=document.createElement('a');link.href='/films/'+encodeURIComponent(film.id)+'/';link.textContent=film.title;
    const scope=document.createElement('small');scope.textContent=claim.territory;
    details.append(link,scope);
    const status=document.createElement('span');status.className='hub-release-state';status.textContent=claim.value<checked?'DATE PASSED':claim.value===checked?'DATED TODAY':'FUTURE DATE';
    const source=document.createElement('a');source.href=claim.source;source.target='_blank';source.rel='noopener noreferrer';source.className='hub-release-source';source.textContent='SOURCE →';source.setAttribute('aria-label','View official source for '+film.title+' release date');
    article.append(date,details,status,source);root.append(article);
  }
})();
