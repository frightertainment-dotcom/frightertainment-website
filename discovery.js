(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const safeURL = value => { try { const url = new URL(value, location.href); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; } };
  const filmHref = id => window.FR_MOVIES?.some(movie => movie.id === id) ? `/films/${encodeURIComponent(id)}/` : `/film.html?id=${encodeURIComponent(id)}`;
  const countrySelect = $('#discovery-country');
  if (!countrySelect) return;
  const names = { GB: 'United Kingdom', US: 'United States', CA: 'Canada', AU: 'Australia', NZ: 'New Zealand', IE: 'Ireland' };
  const localDate = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
  let data = {};
  let query = '';
  const kinds = ['coming-soon', 'streaming-availability', 'streaming-releases', 'theatrical-releases', 'trending-horror'];
  const setState = (kind, message) => { const node = $(`[data-state="${kind}"]`); if (node) node.textContent = message; };
  const sourceLink = item => { const url = safeURL(item.sourceUrl); return url ? `<a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(item.sourceName || 'Source')} ></a><small>${escapeHTML(item.territory || countrySelect.value)} · checked ${escapeHTML(item.checkedAt || 'date unavailable')}</small>` : ''; };
  const itemMarkup = (item, kind) => {
    const date = item.releaseDate ? ` · ${escapeHTML(item.releaseDate)} (${escapeHTML(item.releaseTerritory || item.territory || '')})` : '';
    const detail = kind === 'streaming-availability'
      ? `${escapeHTML(item.provider || 'Service')} · ${escapeHTML(item.availability || 'Availability')}${item.price == null ? '' : ` · ${escapeHTML(item.price)}`}`
      : kind === 'trending-horror' ? 'Weekly platform popularity · not a score'
      : kind === 'streaming-releases' ? `${item.releaseMode === 'unconfirmed' ? 'Release path unconfirmed' : escapeHTML(item.releaseMode)}${item.availabilityState === 'scheduled' ? ' · scheduled' : ' · confirmed available'}`
      : kind === 'theatrical-releases' ? escapeHTML(item.label || 'Recent theatrical release · showtimes unconfirmed')
      : item.status === 'scheduled-release' ? `Territorial release${date}` : 'Verified listing';
    const content = `<strong>${escapeHTML(item.title)}</strong><span>${detail}${kind === 'coming-soon' ? '' : date}</span>`;
    const filmId = item.filmId && /^[a-z0-9-]+$/.test(item.filmId) ? item.filmId : '';
    const titleMarkup = filmId ? `<a href="${escapeHTML(filmHref(filmId))}">${content}</a>` : `<div>${content}</div>`;
    const detailLink = filmId ? `<a href="${escapeHTML(filmHref(filmId))}">FILM FILE</a>` : '';
    return `<article class="discovery-item">${titleMarkup}<span class="discovery-item__source">${sourceLink(item)} ${detailLink}</span></article>`;
  };
  function render() {
    for (const kind of kinds) {
      const dataSet = data[kind];
      const list = $(`[data-list="${kind}"]`);
      const updated = $(`[data-updated="${kind}"]`);
      const items = (dataSet?.items || []).filter(item => `${item.title} ${item.provider || ''} ${item.availability || ''}`.toLocaleLowerCase().includes(query));
      if (list) list.innerHTML = items.map(item => itemMarkup(item, kind)).join('');
      if (updated) updated.textContent = dataSet?.updatedAt ? `Last updated: ${new Date(dataSet.updatedAt).toLocaleString('en-GB')} · ${dataSet.status === 'stale' ? 'stale data' : `source checked ${dataSet.checkedAt || 'date unavailable'}`}` : 'Last updated: no verified data';
      if (!dataSet || dataSet.status === 'unavailable') {
        const messages = {
          'coming-soon': 'No current release listings are available from a configured territory feed.',
          'streaming-availability': 'Subscription, rental and purchase services are unconfirmed for this territory.',
          'streaming-releases': 'Availability is unconfirmed: licensed territory data is not connected.',
          'theatrical-releases': 'No verified recent theatrical release dates are available for this territory.',
          'trending-horror': 'Popularity listings are unavailable until the commercial source is licensed.'
        };
        setState(kind, messages[kind]);
      } else if (dataSet.status === 'stale') setState(kind, `Showing last verified ${dataSet.checkedAt || 'unknown'} data; refresh failed and this information may have expired.`);
      else setState(kind, items.length ? kind === 'trending-horror' ? `${items.length} titles in the global weekly list (title language follows the selected region).` : `${items.length} verified ${items.length === 1 ? 'listing' : 'listings'} for ${names[countrySelect.value]}.` : 'No verified listings are available for this country and search.');
    }
    const sources = [...new Set(kinds.flatMap(kind => (data[kind]?.items || []).map(item => item.sourceName).filter(Boolean)))];
    $('#discovery-attribution').textContent = sources.length ? `Automated data sources: ${sources.join(', ')}. Every listing links to its source and states its territory and check date.` : 'No automated source data is currently published. Licensed source attribution will be shown alongside listings.';
  }
  async function load() {
    const country = countrySelect.value;
    for (const kind of kinds) setState(kind, 'Checking the territory-specific source…');
    try {
      const [feedResponse, rankingResponse] = await Promise.all([
        fetch(`/api/discovery?country=${encodeURIComponent(country)}`, { headers: { accept: 'application/json' } }),
        fetch('/api/rankings?year=2026', { headers: { accept: 'application/json' } })
      ]);
      if (!feedResponse.ok) throw new Error(`Discovery service returned ${feedResponse.status}`);
      const feed = await feedResponse.json();
      data = feed.datasets || {};
      const ranking = rankingResponse.ok ? await rankingResponse.json() : null;
      const panel = $('[data-list="rankings"]');
      if (panel) panel.innerHTML = ranking?.items?.length ? ranking.items.map(item => `<article class="discovery-item"><div><strong><span class="ranking-position">#${item.position}</span> <a href="${escapeHTML(filmHref(item.filmId))}">${escapeHTML(item.title)}</a></strong><span>${item.averageScore}/100 · ${item.criticCount} verified critic${item.criticCount === 1 ? '' : 's'} · ${escapeHTML(item.movementLabel)}</span></div><span class="discovery-item__source">${item.sources.map(source => { const url = safeURL(source.url); return url ? `<a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(source.publication)} ></a><small>${escapeHTML(source.territory)} · checked ${escapeHTML(source.checkedAt)}</small>` : ''; }).join(' ')}</span></article>`).join('') : '';
      setState('rankings', ranking?.items?.length ? `Calculated from approved critic data · this recalculation does not acquire reviews · ${ranking.updatedAt ? `updated ${ranking.updatedAt}` : 'no published calculation yet'} · ${ranking.pendingFilmCount || 0} eligible film records remain below the minimum.` : 'Rankings pending: automatic calculation does not acquire critic reviews. At least three distinct verified, permission-cleared professional numeric ratings are required for each film.');
      const rankingUpdated = $('[data-updated="rankings"]');
      if (rankingUpdated) rankingUpdated.textContent = ranking?.updatedAt ? `Last updated: ${ranking.updatedAt}` : 'Last updated: no verified ranking data';
      render();
    } catch {
      for (const kind of kinds) setState(kind, 'Automated listings are not active. Licensed data, credentials and service configuration are still required.');
      setState('rankings', 'Rankings pending: the verified review dataset is not connected.');
    }
  }
  countrySelect.addEventListener('change', () => {
    chosenPoint = null;
    cinemaFilms = [];
    $('#cinema-film-choice').hidden = true;
    $('#load-cinema').hidden = true;
    $('[data-list="cinema"]').replaceChildren();
    setState('cinema', 'Changing territory cleared the temporary location. Request showtimes again for the selected country.');
    load();
  });
  $('#discovery-search')?.addEventListener('input', event => { query = event.target.value.trim().toLocaleLowerCase(); render(); });
  load();

  const cinemaButton = $('#find-cinema');
  let chosenPoint = null;
  let cinemaFilms = [];
  cinemaButton?.addEventListener('click', async () => {
    const state = $('[data-state="cinema"]');
    if (!navigator.geolocation) { state.textContent = 'This browser does not provide location access. No location was sent.'; return; }
    state.textContent = 'Waiting for your location choice…';
    navigator.geolocation.getCurrentPosition(async position => {
      try {
        chosenPoint = { lat: position.coords.latitude, lon: position.coords.longitude };
        const country = countrySelect.value;
        const filmResponse = await fetch(`/api/cinema/films?country=${encodeURIComponent(country)}`);
        if (!filmResponse.ok) throw new Error('Cinema listings are not connected.');
        const payload = await filmResponse.json();
        cinemaFilms = payload.items || [];
        if (!cinemaFilms.length) { state.textContent = `No films with verified, licensed showtime coverage are configured for ${names[country]}.`; chosenPoint = null; return; }
        const select = $('#cinema-film');
        select.innerHTML = cinemaFilms.map(film => `<option value="${escapeHTML(film.id)}">${escapeHTML(film.title)} (${escapeHTML(film.releaseYear)})</option>`).join('');
        $('#cinema-film-choice').hidden = false;
        $('#load-cinema').hidden = false;
        state.textContent = `Location received for this request only. Choose a film to look up its current showtimes.`;
      } catch (error) { state.textContent = `${error.message} Location was not stored.`; chosenPoint = null; }
    }, error => { state.textContent = error.code === 1 ? 'Location permission was declined. No location was sent.' : 'Could not verify a location. No listing is shown.'; }, { maximumAge: 0, timeout: 12_000 });
  });
  $('#load-cinema')?.addEventListener('click', async () => {
    const state = $('[data-state="cinema"]');
    const film = cinemaFilms.find(item => item.id === $('#cinema-film').value);
    if (!film || !chosenPoint) { state.textContent = 'Choose a listed film and allow location access before requesting showtimes.'; return; }
    state.textContent = 'Requesting live showtimes…';
    try {
      const country = countrySelect.value;
      const response = await fetch(`/api/cinema?country=${encodeURIComponent(country)}`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, cache: 'no-store', body: JSON.stringify({ filmId: film.id, lat: chosenPoint.lat, lon: chosenPoint.lon, date: localDate() }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || payload.error || 'Showtimes are unavailable.');
      const list = $('[data-list="cinema"]');
      const source = safeURL(payload.sourceUrl);
      const attribution = source ? `<p class="discovery-attribution"><a href="${escapeHTML(source)}" target="_blank" rel="noopener noreferrer">${escapeHTML(payload.sourceName)} showtimes ></a> · checked ${escapeHTML(payload.checkedAt)} · ${escapeHTML(payload.country)}</p>` : '';
      const showings = payload.cinemas.flatMap(cinema => cinema.showings.map(showing => `<article class="discovery-item"><div><strong>${escapeHTML(cinema.name)} · ${escapeHTML(film.title)}</strong><span>${escapeHTML(showing.startTime)} · ${escapeHTML(showing.format)}</span></div>${safeURL(showing.bookingUrl) ? `<a href="${escapeHTML(safeURL(showing.bookingUrl))}" target="_blank" rel="noopener noreferrer">BOOKING ></a>` : ''}</article>`));
      list.innerHTML = attribution + showings.join('');
      state.textContent = showings.length ? `Live showtimes · ${payload.checkedAt} · ${payload.country}` : 'The licensed source returned no current showtimes near your location.';
    } catch (error) { state.textContent = `${error.message} Location was not stored.`; }
    finally { chosenPoint = null; }
  });
})();
