(() => {
  'use strict';
  const root = document.querySelector('#dynamic-film');
  const params = new URLSearchParams(location.search);
  const id = params.get('id') || '';
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeURL = value => { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; } };
  const claimHTML = claim => {
    const source = safeURL(claim.source);
    return `<li class="film-claim"><div><strong>${escapeHTML(claim.label)}</strong><p>${escapeHTML(claim.value)}</p><small>TERRITORY: ${escapeHTML(claim.territory)} · CHECKED ${escapeHTML(claim.checked)}</small></div>${source ? `<a href="${escapeHTML(source)}" target="_blank" rel="noopener noreferrer">${escapeHTML(claim.sourceName)} ></a>` : ''}</li>`;
  };
  const common = '<section class="film-section"><h2>FRIGHT INDEX</h2><p class="film-score">—</p><p>Automatic ranking calculation does not acquire critic reviews. No score is published until three distinct, professional, permission-cleared numeric critic ratings are verified.</p></section>';
  if (!/^[a-z0-9-]{1,100}$/.test(id)) { root.innerHTML = '<h1>FILM FILE</h1><p class="film-status">A valid approved film link is required.</p><p><a href="/">← Frightertainment homepage</a></p>'; return; }
  const curated = window.FR_MOVIES?.find(movie => movie.id === id);
  if (curated) { location.replace(`/films/${encodeURIComponent(id)}/`); return; }
  fetch(`/api/films/${encodeURIComponent(id)}`, { headers: { accept: 'application/json' } }).then(async response => {
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'This film has no public approved record.');
    const film = payload.film;
    document.title = `${film.title} — Frightertainment`;
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = `${location.origin}/film.html?id=${encodeURIComponent(id)}`;
    const socialTitle = document.querySelector('meta[property="og:title"]');
    if (socialTitle) socialTitle.content = document.title;
    root.innerHTML = `<div class="eyebrow eyebrow--small"><span class="eyebrow__line"></span> APPROVED HORROR FILM FILE</div><h1>${escapeHTML(film.title)}</h1><p class="film-status">Approved canonical film record · ${escapeHTML(film.territory)} · checked ${escapeHTML(film.checkedAt)}</p><section class="film-section"><h2>VERIFIED DETAILS</h2><ul class="source-list">${payload.claims.map(claimHTML).join('')}</ul><p>Exact theatrical release dates, cast, synopsis, trailer and licensed artwork are unconfirmed unless listed above.</p></section>${common}<p><a href="/#discovery">← Back to horror discovery</a></p>`;
  }).catch(error => { root.innerHTML = `<div class="eyebrow eyebrow--small"><span class="eyebrow__line"></span> FILM FILE</div><h1>DETAILS UNAVAILABLE</h1><p class="film-status">${escapeHTML(error.message)} The link remains valid; check back when the approved record service is available.</p><p><a href="/#discovery">← Back to horror discovery</a></p>`; });
})();
