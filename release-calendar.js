(() => {
  'use strict';
  const root=document.getElementById('hub-release-list');if(!root)return;
  const run=async()=>{
    const today=new Date().toISOString().slice(0,10);
    const films=Array.isArray(window.FR_MOVIES)?window.FR_MOVIES:[];
    let artwork=[];try{const r=await fetch('/api/movie-artwork');if(r.ok)artwork=(await r.json()).items||[];}catch{}
    const art=new Map(artwork.map(x=>[x.id,x]));
    const candidates=films.map(film=>{
      const media=art.get(film.id);
      const sourceDates=(film.claims||[]).filter(c=>c.field==='releaseDate'&&/^\d{4}-\d{2}-\d{2}$/.test(c.value||''));
      const date=media?.releaseDate || sourceDates.find(c=>/United Kingdom|\bUK\b/.test(c.territory))?.value || sourceDates[0]?.value;
      return {film,media,date,sourceDates};
    }).filter(x=>x.date&&x.date>today).sort((a,b)=>a.date.localeCompare(b.date));
    root.replaceChildren();
    const summary=document.getElementById('hub-release-summary');if(summary)summary.textContent=candidates.length+' upcoming films · dates shown by territory';
    for(const {film,media,date,sourceDates} of candidates){
      const row=document.createElement('article');row.className='hub-release-row';row.dataset.mediaType='movie';row.dataset.mediaTitle=film.title;
      if(media?.tmdbId)row.dataset.tmdbId=String(media.tmdbId);
      const poster=document.createElement('img');poster.dataset.mediaField='poster';poster.hidden=true;
      const dates=document.createElement('div');dates.className='hub-release-row__dates';
      const when=document.createElement('time');when.dateTime=date;when.textContent=new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
      const territory=document.createElement('small');territory.textContent=media?.releaseCountry==='GB'?'UK · TMDB':media?'First release · TMDB':sourceDates.find(c=>c.value===date)?.territory || 'See source';dates.append(when,territory);
      const detail=document.createElement('div');const title=document.createElement('a');title.href='/films/'+encodeURIComponent(film.id)+'/';title.textContent=film.title;
      const rating=document.createElement('span');rating.dataset.mediaField='rating';rating.className='archive-media__rating';detail.append(title,rating);
      const sources=document.createElement('div');sources.className='hub-release-row__sources';
      const trailer=document.createElement('button');trailer.type='button';trailer.className='fr-trailer-button';trailer.dataset.mediaField='trailer';trailer.hidden=true;sources.append(trailer);
      const source=document.createElement('a');source.href=media?.sourceUrl || sourceDates.find(c=>c.value===date)?.source || sourceDates[0]?.source;source.target='_blank';source.rel='noopener noreferrer';source.textContent='Release source ↗';sources.append(source);
      row.append(poster,dates,detail,sources);root.append(row);
    }
    if(!candidates.length){const p=document.createElement('p');p.textContent='Explore upcoming releases in Horror Discovery.';root.append(p);}
  };
  run();
})();
