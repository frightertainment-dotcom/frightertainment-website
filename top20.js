(() => {
  const year = Number(document.body.dataset.rankingYear);
  const status = document.querySelector('#ranking-status');
  const updated = document.querySelector('#ranking-updated');
  const list = document.querySelector('#ranking-list');
  if (!status || !updated || !list || !Number.isInteger(year)) return;

  const eligibleFilmYear = film => {
    const claims = Array.isArray(film.claims) ? film.claims : [];
    const claim = claims.find(item => item.field === 'filmYear') || claims.find(item => item.field === 'releaseYear');
    const value = claim?.value;
    return /^\d{4}$/.test(String(value || '')) ? Number(value) : null;
  };
  const safeHttps = value => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' ? url.href : '';
    } catch { return ''; }
  };
  const filmHref = id => {
    if (!/^[a-z0-9-]{1,80}$/.test(id || '')) return '/movies.html';
    return window.FR_MOVIES?.some(movie => movie.id === id)
      ? `/films/${encodeURIComponent(id)}/`
      : `/film.html?id=${encodeURIComponent(id)}`;
  };
  const formatDate = value => {
    const date = new Date(value);
    return Number.isFinite(date.valueOf())
      ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(date) + ' UTC'
      : '';
  };

  function showUnrankedVerifiedFilms() {
    const films = (window.FR_MOVIES || [])
      .filter(film => film.editorialStatus === 'approved' && eligibleFilmYear(film) === year)
      .sort((a, b) => a.title.localeCompare(b.title, 'en', { sensitivity: 'base' }))
      .slice(0, 20);
    if (!films.length) return;

    const section = document.createElement('section');
    section.className = 'hub-ranking-watchlist';
    const heading = document.createElement('h2');
    heading.textContent = `Verified ${year} films awaiting eligible critic reviews`;
    section.append(heading);

    for (const film of films) {
      const item = document.createElement('p');
      item.className = 'hub-ranking-watchlist__item';
      const title = document.createElement('a');
      title.href = filmHref(film.id);
      title.textContent = film.title;
      const label = document.createElement('span');
      label.textContent = 'UNRANKED';
      item.append(title, label);

      const titleSource = (film.claims || []).find(claim => claim.field === 'title');
      const sourceUrl = safeHttps(titleSource?.source);
      if (sourceUrl) {
        const source = document.createElement('small');
        source.className = 'hub-ranking-watchlist__refs';
        source.append(document.createTextNode('Film identity source: '));
        const link = document.createElement('a');
        link.href = sourceUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = titleSource.sourceName || 'Source';
        source.append(link);
        item.append(source);
      }
      section.append(item);
    }
    list.replaceChildren(section);
    return films.length;
  }

  function validRankingItem(item) {
    return item && /^[a-z0-9-]{1,80}$/.test(item.filmId || '') &&
      typeof item.title === 'string' && item.title.trim().length > 0 && item.title.length <= 240 &&
      Number.isInteger(item.position) && item.position >= 1 && item.position <= 20 &&
      Number.isInteger(item.averageScore) && item.averageScore >= 0 && item.averageScore <= 100 &&
      Number.isInteger(item.criticCount) && item.criticCount >= 3 &&
      Array.isArray(item.sources);
  }

  function renderRanking(items) {
    const chart = document.createElement('div');
    chart.className = 'ranking-list__items';
    const seenPositions = new Set();
    const valid = items.filter(item => {
      if (!validRankingItem(item) || seenPositions.has(item.position)) return false;
      seenPositions.add(item.position);
      return true;
    }).sort((a, b) => a.position - b.position).slice(0, 20);

    for (const film of valid) {
      const row = document.createElement('article');
      row.className = 'ranking-row';
      const place = document.createElement('div');
      place.className = 'ranking-row__place';
      const position = document.createElement('strong');
      position.textContent = `#${film.position}`;
      const movement = document.createElement('span');
      movement.textContent = /^(?:NEW|—|UP \d+|DOWN \d+)$/.test(film.movementLabel || '') ? film.movementLabel : '—';
      place.append(position, movement);

      const details = document.createElement('div');
      details.className = 'ranking-row__film';
      const heading = document.createElement('h2');
      const title = document.createElement('a');
      title.href = filmHref(film.filmId);
      title.textContent = film.title;
      heading.append(title);
      const sourceList = document.createElement('p');
      sourceList.append(document.createTextNode(`${film.criticCount} distinct professional critics`));
      for (const source of film.sources.slice(0, 12)) {
        const href = safeHttps(source?.url);
        if (!href) continue;
        sourceList.append(document.createTextNode(' · '));
        const link = document.createElement('a');
        link.href = href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = `${String(source.publication || 'Review source').slice(0, 100)} · ${String(source.territory || 'Territory not stated').slice(0, 60)} · checked ${String(source.checkedAt || 'date unavailable').slice(0, 10)}`;
        sourceList.append(link);
      }
      details.append(heading, sourceList);

      const score = document.createElement('div');
      score.className = 'ranking-row__score';
      const value = document.createElement('strong');
      value.textContent = String(film.averageScore);
      const scale = document.createElement('span');
      scale.textContent = '/100';
      score.append(value, scale);
      row.append(place, details, score);
      chart.append(row);
    }
    list.replaceChildren(chart);
    return valid.length;
  }

  fetch(`/api/rankings?year=${encodeURIComponent(year)}`, { headers: { accept: 'application/json' } })
    .then(async response => {
      if (!response.ok) throw new Error('Ranking service unavailable');
      return response.json();
    })
    .then(result => {
      const candidates = Array.isArray(result?.items) ? result.items : [];
      const count = renderRanking(candidates);
      const lastPublished = formatDate(result?.updatedAt);
      updated.textContent = lastPublished ? `Last published ranking snapshot: ${lastPublished}` : 'Last successful ranking: none';

      if (!count) {
        const filmCount = showUnrankedVerifiedFilms() || 0;
        status.textContent = result?.stale === true
          ? 'Ranking snapshot is stale. No current verified ranking is available.'
          : `Critic ranking pending. Verified critic scores are not yet available.${filmCount ? ` ${filmCount} source-verified film records are listed below without ranking positions.` : ''}`;
        return;
      }

      const rankedFilms = Number.isInteger(result?.rankedFilms) ? result.rankedFilms : count;
      const minimumCritics = Number.isInteger(result?.minimumCritics) ? result.minimumCritics : 3;
      status.textContent = result?.stale === true
        ? `Ranking data is stale. Showing the last valid published chart of ${count} film${count === 1 ? '' : 's'}.`
        : `${rankedFilms} eligible film${rankedFilms === 1 ? '' : 's'} ranked. At least ${minimumCritics} distinct, verified critics are required per film.`;
    })
    .catch(() => {
      status.textContent = 'Ranking unavailable. Verified ranking data could not be loaded; no score or position has been added.';
      updated.textContent = 'Last successful ranking: unavailable';
      showUnrankedVerifiedFilms();
    });
})();
