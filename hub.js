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
        if (data?.stale === true) {
          renderState('Ranking data may be out of date', 'No current verified ranking is available.', 'stale');
        } else {
          renderState('Critic ranking pending', 'Verified critic scores are not yet available.');
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
      } else {
        if (data?.stale === true) {
          renderState('Ranking data may be out of date', 'No current verified ranking is available.', 'stale');
        } else {
          renderState('Critic ranking pending', 'Verified critic scores are not yet available.');
        }
      }
    })
    .catch(() => {
      renderState('Ranking unavailable', 'Verified critic scores could not be refreshed. Please try again later.', 'unavailable');
    })
    .finally(finish);
})();
