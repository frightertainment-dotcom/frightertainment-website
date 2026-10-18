/* TMDB audience scores are 0–10. The annual chart's averageScore is 0–100
   (voteAverage * 10, rounded) and is converted only by fromTmdbChart(). */
(() => {
  'use strict';

  const escape = value => String(value).replace(/[&<>"']/g, character =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const supportedSource = source => source === 'tmdb' || source === 'tmdb-community' || source === 'TMDB';
  const validVotes = count => Number.isSafeInteger(count) && count >= 0;
  const validScore = score => typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 10;
  const formatVotes = count => new Intl.NumberFormat('en-GB').format(count);

  function tmdbSourceUrl(value) {
    if (typeof value !== 'string') return '';
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.hostname !== 'www.themoviedb.org' ||
          !/^\/(movie|tv)\/[1-9]\d*\/?$/.test(url.pathname)) return '';
      return url.origin + url.pathname;
    } catch { return ''; }
  }

  function fromTmdbMedia(item, size = 'standard') {
    return {
      score: item?.voteAverage,
      source: item?.ratingKind,
      voteCount: item?.voteCount,
      sourceUrl: item?.sourceUrl,
      size
    };
  }

  function fromTmdbChart(item, size = 'standard') {
    const hundredPointScore = item?.averageScore;
    const score = Number.isInteger(hundredPointScore) &&
      hundredPointScore >= 0 && hundredPointScore <= 100 ? hundredPointScore / 10 : null;
    const tmdbId = Number(item?.tmdbId || String(item?.filmId || '').match(/^tmdb-(\d+)$/)?.[1]);
    const sourceUrl = item?.sourceUrl || (Number.isSafeInteger(tmdbId) && tmdbId > 0 ?
      `https://www.themoviedb.org/movie/${tmdbId}` : '');
    return { score, source: item?.ratingKind || 'tmdb-community', voteCount: item?.voteCount, sourceUrl, size };
  }

  function html({ score, source, voteCount, sourceUrl, size = 'standard', state } = {}) {
    if (!supportedSource(source)) throw new TypeError('Frightertainment rating badge requires a TMDB audience source');
    if (!['compact', 'standard', 'feature'].includes(size)) throw new TypeError('Unknown Frightertainment rating badge size');
    const url = tmdbSourceUrl(sourceUrl);
    const loading = state === 'loading';
    const rated = !loading && validVotes(voteCount) && voteCount > 0 && validScore(score);
    const zeroVotes = !loading && voteCount === 0;
    const status = loading ? 'loading' : rated ? 'rated' : zeroVotes ? 'unrated' : 'unavailable';
    const display = rated ? score.toFixed(1) : loading ? 'Checking rating…' : zeroVotes ? 'Not yet rated' : 'Rating unavailable';
    const spoken = rated ? `TMDB audience rating ${display} out of 10 from ${formatVotes(voteCount)} ${voteCount === 1 ? 'vote' : 'votes'}` :
      loading ? 'TMDB audience rating loading' : zeroVotes ? 'TMDB audience rating not yet available, zero votes' :
      'TMDB audience rating unavailable';
    const sourceLabel = url ? `<a class="fr-rating-badge__source" href="${escape(url)}" target="_blank" rel="noopener noreferrer" aria-label="TMDB audience source">TMDB audience</a>` :
      '<span class="fr-rating-badge__source">TMDB audience</span>';
    const voteLabel = rated ? `<span class="fr-rating-badge__votes" aria-hidden="true">· ${formatVotes(voteCount)} ${voteCount === 1 ? 'vote' : 'votes'}</span>` : '';
    return `<span class="fr-rating-badge fr-rating-badge--${size} fr-rating-badge--${status}" data-fr-rating-state="${status}" role="group" aria-label="${spoken}">` +
      '<span class="fr-rating-badge__seal" aria-hidden="true"><img src="/assets/frightertainment-f.png" alt="" width="205" height="389" decoding="async"></span>' +
      `<span class="fr-rating-badge__content"><span class="fr-rating-badge__value" aria-hidden="true">${escape(display)}${rated ? '<small>/10</small>' : ''}</span><span class="fr-rating-badge__attribution">${sourceLabel}${voteLabel}</span></span></span>`;
  }

  function create(options) {
    const wrapper = document.createElement('span');
    wrapper.innerHTML = html(options);
    return wrapper.firstElementChild;
  }

  function render(target, options) {
    const badge = create(options);
    target.replaceChildren(badge);
    return badge;
  }

  window.FRRatingBadge = Object.freeze({ html, create, render, fromTmdbMedia, fromTmdbChart });
})();
