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
    }).sort((a,b)=>a.title.localeCompare(b.title)).slice(0,5);
    if (!films.length)return;
    const section=document.createElement('section');section.className='hub-unranked';
    const label=document.createElement('p');label.textContent='SOURCE-VERIFIED FILMS · NOT RANKED';
    section.append(label);
    for(const film of films){
      const row=document.createElement('div');row.className='hub-unranked__row';
      const link=document.createElement('a');link.href='/films/'+encodeURIComponent(film.id)+'/';link.textContent=film.title;
      const waiting=document.createElement('span');waiting.textContent='NO CRITIC SCORE';
      row.append(link,waiting);section.append(row);
    }
    root.append(section);
  };
  const yearToDisplay=()=>new Date().getUTCFullYear();

  fetch('/api/rankings?year='+year,{headers:{accept:'application/json'}}).then(async response=>{
    if(!response.ok)throw new Error('Ranking API is unavailable');
    return response.json();
  }).then(data=>{
    if(!Array.isArray(data.items)||!data.items.length){awaiting();return;}
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
  }).catch(()=>{ awaiting(); /* Pending state remains truthful and accessible. */ });
})();