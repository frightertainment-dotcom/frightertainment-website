(() => {
  const root=document.querySelector('#hub-ranking');
  if(!root)return;
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  fetch('/api/rankings?year=2026',{headers:{accept:'application/json'}}).then(async response=>{
    if(!response.ok)throw new Error('Ranking API is unavailable');
    return response.json();
  }).then(data=>{
    if(!Array.isArray(data.items)||!data.items.length)return;
    root.replaceChildren();
    const list=document.createElement('div');list.className='hub-chart-list';
    for(const item of data.items.slice(0,20)){
      if(!Number.isInteger(item.position)||typeof item.title!=='string'||typeof item.averageScore!=='number')continue;
      const row=document.createElement('div');row.className='hub-chart-row';
      const position=document.createElement('span');position.className='position';position.textContent='#'+item.position;
      const link=document.createElement('a');link.textContent=item.title;link.href=window.FR_MOVIES?.some(f=>f.id===item.filmId)?'/films/'+encodeURIComponent(item.filmId)+'/':'/film.html?id='+encodeURIComponent(item.filmId);
      const score=document.createElement('span');score.className='score';score.textContent=Math.round(item.averageScore)+'/100';
      row.append(position,link,score);list.append(row);
    }
    if(list.children.length)root.append(list);
  }).catch(()=>{ /* Pending state remains truthful and accessible. */ });
})();