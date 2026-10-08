(() => {
  const year = document.body.dataset.rankingYear;
  const status = document.querySelector('#ranking-status');
  const updated = document.querySelector('#ranking-updated');
  const list = document.querySelector('#ranking-list');
  const filmHref = id => window.FR_MOVIES?.some(movie => movie.id === id) ? `/films/${encodeURIComponent(id)}/` : `/film.html?id=${encodeURIComponent(id)}`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  fetch(`/api/rankings?year=${encodeURIComponent(year)}`, { headers: { accept: 'application/json' } }).then(async response => {
    if (!response.ok) throw new Error('Ranking service is not configured.');
    return response.json();
  }).then(result => {
    status.textContent = result.items.length ? `${result.rankedFilms} eligible films ranked. ${result.pendingFilmCount} verified film records remain below the minimum critic threshold.` : `Pending: fewer than ${result.minimumCritics} distinct, verified and permission-cleared professional critic ratings are available per eligible film.`;
    updated.textContent = result.updatedAt ? `Last updated: ${result.updatedAt} · daily movement is compared with the prior published ranking.` : 'Last updated: no verified ranking data.';
    list.innerHTML = result.items.map(film => `<article class="ranking-row"><div class="ranking-row__place"><strong>#${film.position}</strong><span>${esc(film.movementLabel)}</span></div><div class="ranking-row__film"><h2><a href="${esc(filmHref(film.filmId))}">${esc(film.title)}</a></h2><p>${film.criticCount} distinct critic${film.criticCount === 1 ? '' : 's'} · ${film.sources.map(source => { try { const url = new URL(source.url); return url.protocol === 'https:' ? `<span><a href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">${esc(source.publication)} ></a> · ${esc(source.territory)} · checked ${esc(source.checkedAt)}</span>` : ''; } catch { return ''; } }).join(' · ')}</p></div><div class="ranking-row__score"><strong>${film.averageScore}</strong><span>/100</span></div></article>`).join('');
  }).catch(() => { status.textContent = 'Pending: automatic ranking recalculation does not acquire reviews. A verified, permission-cleared critic dataset is not connected. No ranking has been fabricated.'; });
})();
