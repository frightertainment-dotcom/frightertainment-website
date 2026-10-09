(() => {
  'use strict';
  const country = document.querySelector('#home-country');
  if (!country) return;
  const rankingYear = new Date().getUTCFullYear();
  document.querySelector('[data-current-ranking-year]').textContent = String(rankingYear);
  document.querySelector('[data-current-ranking-link]').href = `/top-20/${rankingYear}/`;
  const kinds = ['rankings', 'theatrical-releases', 'streaming-releases', 'coming-soon', 'trending-horror'];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const safeUrl = value => { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; } };
  const search = document.querySelector('#home-search');
  let payloads = {};
  let rankingItems = [];
  function render() {
    const query = search.value.trim().toLocaleLowerCase();
    for (const kind of kinds) {
      const node = document.querySelector(`[data-home-list="${kind}"]`);
      const state = document.querySelector(`[data-home-state="${kind}"]`);
      const updated = document.querySelector(`[data-home-updated="${kind}"]`);
      let items = kind === 'rankings' ? rankingItems : payloads[kind]?.items || [];
      items = items.filter(item => `${item.title || ''} ${item.provider || ''}`.toLocaleLowerCase().includes(query)).slice(0, 4);
      node.innerHTML = items.map(item => {
        if (kind === 'rankings') {
          const links = (item.sources || []).map(source => safeUrl(source.url) ? `<a href="${escape(safeUrl(source.url))}" target="_blank" rel="noopener noreferrer">${escape(source.publication)} →</a>` : '').join(' ');
          const scoreLabel=payloads.previewRankings ?
            `Rotten Tomatoes positive critic percentage ${escape(item.averageScore)}% · ${escape(item.criticCount)} publisher reviews · manually checked` :
            `${escape(item.averageScore)}/100 · ${escape(item.criticCount)} verified professional critics · ${escape(item.movementLabel)}`;
          return `<article><strong>#${escape(item.position)} ${escape(item.title)}</strong><span>${scoreLabel}</span><small>${links}</small></article>`;
        }
        const date = item.releaseDate ? ` · ${escape(item.releaseDate)} (${escape(item.releaseTerritory || item.territory || '')})` : '';
        const extra = kind === 'streaming-releases' ? (item.releaseMode === 'unconfirmed' ? 'Release path unconfirmed' : escape(item.releaseMode)) : kind === 'trending-horror' ? (payloads[kind]?.status==='editorial'?'Recently added to UK horror streaming':'Weekly popularity · not a score') : '';
        const href = safeUrl(item.sourceUrl);
        return `<article><strong>${escape(item.title)}</strong><span>${escape(item.provider || item.status || extra)}${date}</span><small>${href ? `<a href="${escape(href)}" target="_blank" rel="noopener noreferrer">${escape(item.sourceName || 'Source')} →</a>` : ''} · ${escape(item.territory)} · checked ${escape(item.checkedAt)}</small></article>`;
      }).join('');
      if (updated) {
        const time = kind === 'rankings' ? payloads.rankingsUpdatedAt : payloads[kind]?.updatedAt;
        updated.textContent = time ? `Last updated: ${new Date(time).toLocaleString('en-GB')} · ${payloads[kind]?.status === 'stale' ? 'stale data' : 'verified snapshot'}` : 'Last updated: no verified data';
      }
      if(kind==='rankings' && payloads.previewRankings && state){
        state.textContent='Private comparison of manually checked publisher percentages — NOT an automatically licensed critic Top 20.';
      }
      if (items.length && state && payloads[kind]?.status==='editorial') {
        state.textContent='From UK release announcements, with dates and source links.';
      }
      if (!items.length && !query) {
        const empty = kind === 'rankings'
          ? 'More rated horror films will appear here.'
          : kind === 'theatrical-releases' ? 'No recent cinema listings here yet.'
          : kind === 'streaming-releases' ? 'No additional streaming listings yet.'
          : kind === 'coming-soon' ? 'No upcoming releases in this feed.'
          : 'No current popularity chart.';
        state.textContent = empty;
      } else if (items.length && state && payloads[kind]?.status!=='editorial' && !(kind==='rankings'&&payloads.previewRankings)) state.textContent = `${items.length} verified listing${items.length === 1 ? '' : 's'} for ${country.options[country.selectedIndex].text}.`;
    }
    const sources = [...new Set(kinds.flatMap(kind => (payloads[kind]?.items || []).map(item => item.sourceName).filter(Boolean)))];
    document.querySelector('#home-attribution').textContent = sources.length
      ? `Sources: ${sources.join(', ')}. Each listing links to its source and shows its territory and check date.`
      : 'Explore more horror and viewing options.';
  }

  // Provider APIs are optional. Source-checked release notices give UK visitors
  // useful current entries without suggesting a paid, live streaming feed exists.
  const ageDays=date=>(Date.now()-Date.parse(date+'T00:00:00Z'))/86400000;
  const isCurrent=x=>/^(?:19|20)\d{2}-\d{2}-\d{2}$/.test(x.date||'');
  const shapeRelease=x=>({
    title:x.title,provider:x.service,releaseDate:x.date,releaseTerritory:'GB',
    territory:'GB',sourceName:x.sourceName,sourceUrl:x.sourceUrl,checkedAt:x.checkedAt,
    status:x.date>new Date().toISOString().slice(0,10)?'scheduled-release':'announced-arrival',
    releaseMode:x.category==='streaming'?'Subscription streaming':'Cinema or rental information'
  });
  function populateEditorial(editorial){
    if(editorial?.country!=='GB' || !Array.isArray(editorial.items))return;
    const now=new Date().toISOString().slice(0,10);
    const base=editorial.items.filter(x=>x.country==='GB'&&x.sourceUrl?.startsWith('https://')&&isCurrent(x));
    const pick={
      'theatrical-releases':base.filter(x=>x.category==='cinema'&&x.date<=now&&ageDays(x.checkedAt)<=14),
      'streaming-releases':base.filter(x=>x.category==='streaming'&&x.date<=now&&ageDays(x.date)<=28),
      'coming-soon':base.filter(x=>x.category==='streaming'&&x.date>now&&ageDays(x.date)>=-30),
      // This is an editorial list of recent additions, not an unlicensed
      // view-count trend chart or popularity ranking.
      'trending-horror':base.filter(x=>x.category==='streaming'&&x.date<=now&&ageDays(x.date)<=28)
    };
    for(const [kind,items] of Object.entries(pick)){
      if(payloads[kind]?.items?.length)continue; // Never overwrite licensed verified data.
      const sorted=items.sort((a,b)=>
        kind==='coming-soon'?a.date.localeCompare(b.date):b.date.localeCompare(a.date));
      payloads[kind]={
        items:sorted.map(shapeRelease),updatedAt:editorial.updatedAt,
        checkedAt:editorial.updatedAt?.slice(0,10),status:'editorial'
      };
    }
  }
  async function load() {
    const query=encodeURIComponent(country.value);
    // Independent failures must not blank the other source-fed panels.
    const [discovery,rankings,editorial]=await Promise.all([
      fetch('/api/discovery?country='+query,{headers:{accept:'application/json'}})
        .then(r=>r.ok?r.json():null).catch(()=>null),
      fetch('/api/rankings?year='+rankingYear,{headers:{accept:'application/json'}})
        .then(r=>r.ok?r.json():null).catch(()=>null),
      fetch('/data/editorial-releases.json',{headers:{accept:'application/json'}})
        .then(r=>r.ok?r.json():null).catch(()=>null)
    ]);
    payloads=discovery?.datasets||{};
    rankingItems=Array.isArray(rankings?.items)?rankings.items:[];
    payloads.rankingsUpdatedAt=rankings?.updatedAt||null;
    populateEditorial(editorial);
    const preview=window.FrightertainmentPreviewRankings;
    if(!rankingItems.length&&preview?.preview){
      const local=preview.build(window.FR_MOVIES||[],rankingYear);
      rankingItems=local.ranked.map(item=>({
        title:item.title,position:item.position,averageScore:item.score,
        criticCount:item.reviewCount,movementLabel:'Manually checked publisher snapshot',
        sources:[{publication:'Rotten Tomatoes source',url:item.sourceUrl}]
      }));
      payloads.previewRankings=true;
      payloads.rankingsUpdatedAt=local.lastChecked;
    }
    render();
  }
  country.addEventListener('change', load);
  search.addEventListener('input', render);
  load();
})();
