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
          return `<article><strong>#${escape(item.position)} ${escape(item.title)}</strong><span>${escape(item.averageScore)}/100 · ${escape(item.criticCount)} verified critics · ${escape(item.movementLabel)}</span><small>${links}</small></article>`;
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
      if (!items.length && !query) {
        const empty = kind === 'rankings'
          ? 'Rankings pending: films need at least three distinct, permission-cleared professional numeric critic ratings.'
          : kind === 'theatrical-releases' ? 'No recent territorial release dates are verified. A release date alone does not confirm showtimes.'
          : kind === 'streaming-releases' ? 'No licensed digital release data is available for this country.'
          : kind === 'coming-soon' ? 'No licensed upcoming release data is available for this country.'
          : 'No licensed weekly trend data is available.';
        state.textContent = empty;
      } else if (items.length && state) state.textContent = `${items.length} verified listing${items.length === 1 ? '' : 's'} for ${country.options[country.selectedIndex].text}.`;
    }
    const sources = [...new Set(kinds.flatMap(kind => (payloads[kind]?.items || []).map(item => item.sourceName).filter(Boolean)))];
    document.querySelector('#home-attribution').textContent = sources.length
      ? `Automated sources: ${sources.join(', ')}. Each listing links to its source and shows its territory and check date.`
      : 'No automatic data is active. Source attribution and check dates will appear with verified listings.';
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
