(() => {
  const year = document.body.dataset.rankingYear;
  const status = document.querySelector('#ranking-status');
  const updated = document.querySelector('#ranking-updated');
  const list = document.querySelector('#ranking-list');
  const filmHref = id => window.FR_MOVIES?.some(movie => movie.id === id) ? `/films/${encodeURIComponent(id)}/` : `/film.html?id=${encodeURIComponent(id)}`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function pendingFilmWatchlist(){
    const films=(window.FR_MOVIES||[]).filter(film=>{
      const value=(film.claims||[]).find(c=>c.field==='filmYear'||c.field==='releaseYear')?.value ||
        (film.claims||[]).find(c=>c.field==='releaseDate')?.value?.slice(0,4);
      return String(value)===String(year) && film.editorialStatus==='approved';
    }).sort((a,b)=>a.title.localeCompare(b.title)).slice(0,20);
    if(!films.length)return;
    const section=document.createElement('section');section.className='hub-ranking-watchlist';
    const heading=document.createElement('h2');heading.textContent='Source-verified films awaiting a Fright Index ranking (unranked)';
    section.append(heading);
    for(const film of films){
      const card=document.createElement('p');card.className='hub-ranking-watchlist__item';
      const a=document.createElement('a');a.href=filmHref(film.id);a.textContent=film.title;
      const badge=document.createElement('span');
      const refs=Array.isArray(film.criticReferenceSnapshots)?film.criticReferenceSnapshots:[];
      badge.textContent=refs.length ? 'FRIGHT INDEX PENDING' : 'NO VERIFIED FRIGHT INDEX';
      card.append(a,badge);
      if(refs.length){
        const sources=document.createElement('small');sources.className='hub-ranking-watchlist__refs';
        sources.textContent='Publisher scores checked '+refs[0].checked+': ';
        for(const item of refs){
          const rating=document.createElement('a');rating.href=item.url;rating.textContent=item.source+' '+item.display;
          rating.target='_blank';rating.rel='noopener noreferrer';sources.append(rating);
        }
        card.append(sources);
      }
      section.append(card);
    }
    list.replaceChildren(section);
  }

  // A dated editorial comparison is permitted in the ACCESS-PROTECTED development preview.
  // The public version still requires proper RT data reuse rights or independently approved reviews.
  function showPreviewComparison() {
    const helper=window.FrightertainmentPreviewRankings;
    if(!helper?.preview) return false;
    const data=helper.build(window.FR_MOVIES,year);
    if(!data.ranked.length) return false;
    const formatDate=iso=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})
      .format(new Date(iso+'T12:00:00Z'));
    status.textContent=data.ranked.length+' of '+data.eligible+' tracked '+year+
      ' films have checked Rotten Tomatoes critic percentages. Only scored films appear here; this is NOT a complete Top 20.';
    updated.textContent='Private editorial comparison · last manual score check '+formatDate(data.lastChecked)+
      ' · no automatic Rotten Tomatoes feed.';
    const method=document.querySelector('#ranking-method');
    if(method) method.textContent='PRIVATE PREVIEW ONLY: films below are ordered from highest to lowest by source-reported Rotten Tomatoes Tomatometer percentages captured during manual editorial checks. These are not a Frightertainment score or licensed live ratings feed. Same-score ties use published critic review count, then alphabetical title. Metacritic weighted scores are excluded. No ranking is published publicly without the necessary permission.';
    const chart=document.createElement('ol');chart.className='hub-rt-chart';
    for(const film of data.ranked) {
      const item=document.createElement('li');item.className='hub-rt-chart__entry';
      const rank=document.createElement('span');rank.className='hub-rt-chart__rank';rank.textContent='#'+film.position;
      const details=document.createElement('div');details.className='hub-rt-chart__details';
      const link=document.createElement('a');link.className='hub-rt-chart__film';link.href=filmHref(film.id);link.textContent=film.title;
      const sub=document.createElement('span');sub.className='hub-rt-chart__sub';
      sub.textContent=film.reviewCount+' critic reviews · manually checked '+formatDate(film.checkedAt);
      details.append(link,sub);
      const score=document.createElement('span');score.className='hub-rt-chart__score';
      score.textContent=film.score+'%';score.setAttribute('aria-label','Rotten Tomatoes Tomatometer '+film.score+' percent');
      const source=document.createElement('a');source.className='hub-rt-chart__source';
      source.textContent='RT SOURCE ↗';source.href=film.sourceUrl;source.target='_blank';
      source.rel='noopener noreferrer';source.setAttribute('aria-label','View Rotten Tomatoes source for '+film.title);
      item.append(rank,details,score,source);chart.append(item);
    }
    list.replaceChildren(chart);
    // Build a 20-film watchlist around the actually rated films. The fourteen
    // additional titles are NEVER given false scores or numbered rank positions.
    // This uses our cumulative CC0 archive, so weekly film imports expand rather
    // than erase the pool and previously scored films keep their place.
    const titleKey = t => String(t||'').normalize('NFKC').toLocaleLowerCase('en-GB').replace(/[^a-z0-9]/g,'');
    const already=new Set(data.ranked.map(item=>titleKey(item.title)));
    const unscored=data.unscored.filter(x=>!already.has(titleKey(x.title))).map(item=>({
      id:item.id,title:item.title,href:filmHref(item.id),source:'Frightertainment studio-verified film file'
    }));
    fetch('/data/archive/horror-films.json',{headers:{accept:'application/json'}})
      .then(async response=>response.ok ? response.json():null)
      .then(archive=>{
        const candidates=Array.isArray(archive?.films)?archive.films:[];
        const pending=[...unscored];
        const seen=new Set([...already,...unscored.map(x=>titleKey(x.title))]);
        const extra=candidates.filter(x=>x.year===Number(year) && typeof x.title==='string' &&
            /^Q[1-9]\d*$/.test(x.qid||'') && (!x.imdbId || /^tt\d{7,10}$/.test(x.imdbId)))
          .sort((a,b)=>a.title.localeCompare(b.title,'en',{numeric:true,sensitivity:'base'}));
        for(const film of extra){
          if(pending.length>=Math.max(0,20-data.ranked.length)) break;
          const key=titleKey(film.title);
          if(!key||seen.has(key))continue;
          seen.add(key);
          pending.push({id:film.qid,title:film.title,
            href:'/archive-film.html?id='+encodeURIComponent(film.qid),source:'Wikidata CC0 film identity · IMDb link on film page'});
        }
        const other=document.createElement('section');other.className='hub-rt-unscored hub-rt-coverage';
        const header=document.createElement('h2');header.textContent='AWAITING A VERIFIED CRITIC SCORE';
        const note=document.createElement('p');
        note.textContent=pending.length+' more tracked '+year+
          ' films. Not ranked: no approved comparable critic score is available. Their inclusion is not a rating or recommendation.';
        other.append(header,note);
        const extraList=document.createElement('ul');
        for(const item of pending){
          const li=document.createElement('li');li.className='hub-rt-coverage__row';
          const link=document.createElement('a');link.href=item.href;link.textContent=item.title;
          const desc=document.createElement('span');desc.textContent='— AWAITING SCORE · '+item.source;
          li.append(link,desc);extraList.append(li);
        }
        other.append(extraList);
        list.querySelector('.hub-rt-coverage')?.remove();
        list.append(other);
        status.textContent=data.ranked.length+' scored films + '+pending.length+
          ' awaiting verified ratings · '+(data.ranked.length+pending.length)+
          ' tracked '+year+' horror titles. Only the scored films have ranking positions.';
        updated.textContent+=' · Film candidate pool updated from cumulative horror archive.';
      }).catch(()=>{
        status.textContent+=' Other films are temporarily unavailable from the archive.';
      });
    return true;
  }

  fetch(`/api/rankings?year=${encodeURIComponent(year)}`, { headers: { accept: 'application/json' } }).then(async response => {
    if (!response.ok) throw new Error('Ranking service is not configured.');
    return response.json();
  }).then(result => {
    status.textContent = result.items.length ? `${result.rankedFilms} eligible films ranked. ${result.pendingFilmCount} verified film records remain below the minimum critic threshold.` : `Pending: fewer than ${result.minimumCritics} distinct, verified and permission-cleared professional critic ratings are available per eligible film.`;
    updated.textContent = result.updatedAt ? `Last updated: ${result.updatedAt} · daily movement is compared with the prior published ranking.` : 'Last updated: no verified ranking data.';
    if (!result.items.length) {if(!showPreviewComparison())pendingFilmWatchlist();return;}
    list.innerHTML = result.items.map(film => `<article class="ranking-row"><div class="ranking-row__place"><strong>#${film.position}</strong><span>${esc(film.movementLabel)}</span></div><div class="ranking-row__film"><h2><a href="${esc(filmHref(film.filmId))}">${esc(film.title)}</a></h2><p>${film.criticCount} distinct critic${film.criticCount === 1 ? '' : 's'} · ${film.sources.map(source => { try { const url = new URL(source.url); return url.protocol === 'https:' ? `<span><a href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">${esc(source.publication)} ></a> · ${esc(source.territory)} · checked ${esc(source.checkedAt)}</span>` : ''; } catch { return ''; } }).join(' · ')}</p></div><div class="ranking-row__score"><strong>${film.averageScore}</strong><span>/100</span></div></article>`).join('');
  }).catch(() => { status.textContent = 'Pending: automatic ranking recalculation does not acquire reviews. A verified, permission-cleared critic dataset is not connected. No ranking has been fabricated.'; if(!showPreviewComparison())pendingFilmWatchlist(); });
})();
