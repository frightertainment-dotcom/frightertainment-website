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
          const links = (item.sources || []).map(source => safeUrl(source.url) ? `<a href="${escape(safeUrl(source.url))}" target="_blank" rel="noopener noreferrer">${escape(source.publication)} ↗</a>` : '').join(' ');
          const scoreLabel=payloads.previewRankings ?
            `Rotten Tomatoes positive critic percentage ${escape(item.averageScore)}% · ${escape(item.criticCount)} publisher reviews · manually checked` :
            `${escape(item.averageScore)}/100 · ${escape(item.criticCount)} verified professional critics · ${escape(item.movementLabel)}`;
          return `<article><strong>#${escape(item.position)} ${escape(item.title)}</strong><span>${scoreLabel}</span><small>${links}</small></article>`;
        }
        const date = item.releaseDate ? ` · ${escape(item.releaseDate)} (${escape(item.releaseTerritory || item.territory || '')})` : '';
        const extra = kind === 'streaming-releases' ? (item.releaseMode === 'unconfirmed' ? 'Release path unconfirmed' : escape(item.releaseMode)) : kind === 'trending-horror' ? 'Weekly popularity · not a score' : '';
        const href = safeUrl(item.sourceUrl);
        return `<article><strong>${escape(item.title)}</strong><span>${escape(item.provider || item.status || extra)}${date}</span><small>${href ? `<a href="${escape(href)}" target="_blank" rel="noopener noreferrer">${escape(item.sourceName || 'Source')} ↗</a>` : ''} · ${escape(item.territory)} · checked ${escape(item.checkedAt)}</small></article>`;
      }).join('');
      if (updated) {
        const time = kind === 'rankings' ? payloads.rankingsUpdatedAt : payloads[kind]?.updatedAt;
        updated.textContent = time ? `Last updated: ${new Date(time).toLocaleString('en-GB')} · ${payloads[kind]?.status === 'stale' ? 'stale data' : 'verified snapshot'}` : 'Last updated: no verified data';
      }
      if(kind==='rankings' && payloads.previewRankings && state){
        state.textContent='Private comparison of manually checked publisher percentages — NOT an automatically licensed critic Top 20.';
      }
      if (!items.length && !query) {
        const empty = kind === 'rankings'
          ? 'More rated horror films will appear here.'
          : kind === 'theatrical-releases' ? 'No recent cinema listings here yet.'
          : kind === 'streaming-releases' ? 'No additional streaming listings yet.'
          : kind === 'coming-soon' ? 'No upcoming releases in this feed.'
          : 'No current popularity chart.';
        state.textContent = empty;
      } else if (items.length && state && !(kind==='rankings'&&payloads.previewRankings)) state.textContent = `${items.length} verified listing${items.length === 1 ? '' : 's'} for ${country.options[country.selectedIndex].text}.`;
    }
    const sources = [...new Set(kinds.flatMap(kind => (payloads[kind]?.items || []).map(item => item.sourceName).filter(Boolean)))];
    document.querySelector('#home-attribution').textContent = sources.length
      ? `Sources: ${sources.join(', ')}. Each listing links to its source and shows its territory and check date.`
      : 'Explore more horror and viewing options.';
  }
  async function load() {
    const query = encodeURIComponent(country.value);
    try {
      const [discoveryResponse, rankingResponse] = await Promise.all([
        fetch(`/api/discovery?country=${query}`, { headers: { accept: 'application/json' } }),
        fetch(`/api/rankings?year=${rankingYear}`, { headers: { accept: 'application/json' } })
      ]);
      if (!discoveryResponse.ok) throw new Error('Discovery unavailable');
      const discovery = await discoveryResponse.json();
      payloads = discovery.datasets || {};
      const ranking = rankingResponse.ok ? await rankingResponse.json() : null;
      rankingItems = ranking?.items || [];
      payloads.rankingsUpdatedAt = ranking?.updatedAt || null;
      // Protected preview comparison is distinct from the licensed critic service.
      // No automated RT data collection or mixed score calculations occur here.
      const preview=window.FrightertainmentPreviewRankings;
      if(!rankingItems.length && preview?.preview){
        const local=preview.build(window.FR_MOVIES||[],rankingYear);
        rankingItems=local.ranked.map(item=>({
          title:item.title,position:item.position,averageScore:item.score,
          criticCount:item.reviewCount,movementLabel:'Manually checked publisher snapshot',
          sources:[{publication:'Rotten Tomatoes source',url:item.sourceUrl}]
        }));
        payloads.previewRankings=true;
        payloads.rankingsUpdatedAt=local.lastChecked;
      }
      if (!rankingItems.length && ranking?.updatedAt) document.querySelector('[data-home-updated="rankings"]').textContent = `Last updated: ${ranking.updatedAt} · ranking remains pending`;
    } catch {
      payloads = {};
      rankingItems = [];
    }
    render();
  }
  country.addEventListener('change', load);
  search.addEventListener('input', render);
  load();
})();
