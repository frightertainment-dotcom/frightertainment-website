(() => {
  const root=document.querySelector('#hub-ranking');
  if(!root)return;
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const year=new Date().getUTCFullYear();
  const heading=document.querySelector('.hub-charts h2 em');
  if (heading) heading.textContent='FILMS · '+year;
  const fullChart=document.querySelector('.hub-charts__all');
  if (fullChart) fullChart.href='/top-20/'+year+'/';
  const previewLimit=matchMedia('(max-width: 900px)').matches?5:10;
  // This is a separate, unranked 2026 film watchlist, never a critic chart.
  const awaiting=()=>{
    const films=(window.FR_MOVIES||[]).filter(film=>{
      const year=(film.claims||[]).find(c=>['releaseYear','filmYear'].includes(c.field))?.value ||
        (film.claims||[]).find(c=>c.field==='releaseDate')?.value?.slice(0,4);
      return Number(year)===yearToDisplay() && film.editorialStatus==='approved';
    }).sort((a,b)=>(Number(Boolean(b.criticReferenceSnapshots?.length))-Number(Boolean(a.criticReferenceSnapshots?.length)))||a.title.localeCompare(b.title)).slice(0,5);
    if (!films.length)return;
    const section=document.createElement('section');section.className='hub-unranked';
    const label=document.createElement('p');label.textContent='SOURCE-VERIFIED FILMS · UNRANKED · EXTERNAL SCORES WHEN AVAILABLE';
    section.append(label);
    for(const film of films){
      const row=document.createElement('div');row.className='hub-unranked__row';
      const link=document.createElement('a');link.href='/films/'+encodeURIComponent(film.id)+'/';link.textContent=film.title;
      const waiting=document.createElement('span');
      const refs=Array.isArray(film.criticReferenceSnapshots)?film.criticReferenceSnapshots:[];
      waiting.textContent=refs.length?refs.map(item=>item.source==='Rotten Tomatoes'?'RT '+item.display:item.source==='Metacritic'?'MC '+item.display:item.display).join(' · '):'FRIGHT INDEX PENDING';
      row.append(link,waiting);section.append(row);
    }
    root.append(section);
  };
  const yearToDisplay=()=>new Date().getUTCFullYear();

  function showPreviewComparison(){
    const helper=window.FrightertainmentPreviewRankings;
    if(!helper?.preview)return false;
    const data=helper.build(window.FR_MOVIES,year);
    if(!data.ranked.length)return false;
    const title=document.querySelector('.hub-charts .hub-eyebrow');
    if(title)title.textContent='PUBLISHER CRITIC SCORE COMPARISON · PRIVATE PREVIEW';
    const description=document.querySelector('.hub-charts__top p');
    if(description) description.textContent=data.ranked.length+' of '+data.eligible+
      ' tracked '+year+' films have checked critic percentages. This is a dated, incomplete comparison — not a live Top 20 or Fright Index.';
    const ul=document.createElement('div');ul.className='hub-preview-chart';
    for(const item of data.ranked.slice(0,previewLimit)){
      const row=document.createElement('div');row.className='hub-chart-row hub-preview-chart__entry';
      const rank=document.createElement('span');rank.className='position';rank.textContent='#'+item.position;
      const film=document.createElement('a');film.href='/films/'+encodeURIComponent(item.id)+'/';film.textContent=item.title;
      const score=document.createElement('span');score.className='score';score.textContent=item.score+'%';
      score.setAttribute('aria-label','RT critics '+item.score+' percent');
      row.append(rank,film,score);ul.append(row);
    }
    const note=document.createElement('p');note.className='hub-preview-chart__note';
    note.textContent='Rotten Tomatoes editorial snapshots checked '+data.lastChecked+
      ' · Not licensed for public syndication · View source links on annual chart.';
    root.replaceChildren(ul,note);
    const action=document.querySelector('.hub-charts__all');
    if(action)action.textContent='VIEW CHECKED FILM SCORES ↗';
    const footer=document.querySelector('.hub-charts__foot');
    if(footer)footer.textContent='NOT A LICENSED LIVE FEED · NO FRIGHT INDEX SCORE';
    return true;
  }


  fetch('/api/rankings?year='+year,{headers:{accept:'application/json'}}).then(async response=>{
    if(!response.ok)throw new Error('Ranking API is unavailable');
    return response.json();
  }).then(data=>{
    if(!Array.isArray(data.items)||!data.items.length){if(!showPreviewComparison())awaiting();return;}
    root.replaceChildren();
    const list=document.createElement('div');list.className='hub-chart-list';
    for(const item of data.items.slice(0,previewLimit)){
      if(!Number.isInteger(item.position)||typeof item.title!=='string'||typeof item.averageScore!=='number')continue;
      const row=document.createElement('div');row.className='hub-chart-row';
      const position=document.createElement('span');position.className='position';position.textContent='#'+item.position;
      const link=document.createElement('a');link.textContent=item.title;link.href=window.FR_MOVIES?.some(f=>f.id===item.filmId)?'/films/'+encodeURIComponent(item.filmId)+'/':'/film.html?id='+encodeURIComponent(item.filmId);
      const score=document.createElement('span');score.className='score';score.textContent=Math.round(item.averageScore)+'/100';
      row.append(position,link,score);list.append(row);
    }
    if(list.children.length)root.append(list);
  }).catch(()=>{ if(!showPreviewComparison())awaiting(); /* Pending state remains truthful and accessible. */ });
})();