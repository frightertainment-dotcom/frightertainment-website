(() => {
  const root = document.querySelector('#hub-ranking');
  if (!root) return;

  const year = new Date().getUTCFullYear();
  const heading = document.querySelector('.hub-charts h2 em');
  if (heading) heading.textContent = 'FILMS · ' + year;
  const fullChart = document.querySelector('.hub-charts__all');
  if (fullChart) fullChart.href = '/top-20/' + year + '/';

  const isCompact = matchMedia('(max-width: 900px)').matches;
  const previewLimit = isCompact ? 5 : 10;

  function createState(title, description, modifier = 'pending') {
    const state = document.createElement('div');
    state.className = 'hub-ranking__state hub-ranking__state--' + modifier;
    state.setAttribute('role', 'status');
    const strong = document.createElement('strong');
    strong.textContent = title;
    const detail = document.createElement('p');
    detail.textContent = description;
    state.append(strong, detail);
    return state;
  }

  function renderState(title, description, modifier = 'pending') {
    root.replaceChildren(createState(title, description, modifier));
  }

  function showPreviewComparison() {
    const helper = window.FrightertainmentPreviewRankings;
    if (!helper?.preview) return false;
    const data = helper.build(window.FR_MOVIES, year);
    if (!data.ranked.length) return false;

    const title = document.querySelector('.hub-charts .hub-eyebrow');
    if (title) title.textContent = 'PUBLISHER CRITIC SCORE COMPARISON · PRIVATE PREVIEW';
    const description = document.querySelector('.hub-charts__top p');
    if (description) {
      description.textContent = data.ranked.length + ' of ' + data.eligible +
        ' tracked ' + year + ' films have checked critic percentages. This is a dated, incomplete comparison — not a live Top 20 or Fright Index.';
    }

    const list = document.createElement('div');
    list.className = 'hub-preview-chart';
    for (const item of data.ranked.slice(0, previewLimit)) {
      const row = document.createElement('div');
      row.className = 'hub-chart-row hub-preview-chart__entry';
      const rank = document.createElement('span');
      rank.className = 'position';
      rank.textContent = '#' + item.position;
      const film = document.createElement('a');
      film.href = '/films/' + encodeURIComponent(item.id) + '/';
      film.textContent = item.title;
      const score = document.createElement('span');
      score.className = 'score';
      score.textContent = item.score + '%';
      score.setAttribute('aria-label', 'RT critics ' + item.score + ' percent');
      row.append(rank, film, score);
      list.append(row);
    }

    const note = document.createElement('p');
    note.className = 'hub-preview-chart__note';
    note.textContent = 'Rotten Tomatoes editorial snapshots checked ' + data.lastChecked +
      ' · Not licensed for public syndication · View source links on annual chart.';
    root.replaceChildren(list, note);
    const action = document.querySelector('.hub-charts__all');
    if (action) action.textContent = 'VIEW CHECKED FILM SCORES →';
    const footer = document.querySelector('.hub-charts__foot');
    if (footer) footer.textContent = 'NOT A LICENSED LIVE FEED · NO FRIGHT INDEX SCORE';
    return true;
  }

  function finish() {
    root.setAttribute('aria-busy', 'false');
  }

  fetch('/api/rankings?year=' + year, { headers: { accept: 'application/json' } })
    .then(async response => {
      if (!response.ok) throw new Error('Ranking API unavailable');
      return response.json();
    })
    .then(data => {
      const items = Array.isArray(data?.items) ? data.items : [];
      if (!items.length) {
        if (!showPreviewComparison()) {
          if (data?.stale === true) {
            renderState('Ranking data may be out of date', 'No current verified ranking is available.', 'stale');
          } else {
            renderState('Critic ranking pending', 'Verified critic scores are not yet available.');
          }
        }
        return;
      }

      const list = document.createElement('div');
      list.className = 'hub-chart-list';
      for (const item of items.slice(0, previewLimit)) {
        if (!Number.isInteger(item.position) || typeof item.title !== 'string' ||
            !Number.isFinite(item.averageScore) || item.averageScore < 0 || item.averageScore > 100 ||
            typeof item.filmId !== 'string' || !item.filmId) continue;
        const row = document.createElement('div');
        row.className = 'hub-chart-row';
        const position = document.createElement('span');
        position.className = 'position';
        position.textContent = '#' + item.position;
        const link = document.createElement('a');
        link.textContent = item.title;
        link.href = window.FR_MOVIES?.some(film => film.id === item.filmId)
          ? '/films/' + encodeURIComponent(item.filmId) + '/'
          : '/film.html?id=' + encodeURIComponent(item.filmId);
        const score = document.createElement('span');
        score.className = 'score';
        score.textContent = Math.round(item.averageScore) + '/100';
        row.append(position, link, score);
        list.append(row);
      }
      if (list.children.length) {
        root.replaceChildren(list);
        if (data?.stale === true) {
          root.append(createState('Ranking data may be out of date', 'Showing the last valid ranking while its sources are reviewed.', 'stale'));
        }
      } else if (!showPreviewComparison()) {
        if (data?.stale === true) {
          renderState('Ranking data may be out of date', 'No current verified ranking is available.', 'stale');
        } else {
          renderState('Critic ranking pending', 'Verified critic scores are not yet available.');
        }
      }
    })
    .catch(() => {
      if (!showPreviewComparison()) {
        renderState('Ranking unavailable', 'Verified critic scores could not be refreshed. Please try again later.', 'unavailable');
      }
    })
    .finally(finish);
})();
