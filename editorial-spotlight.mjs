/* Frightertainment editorial spotlight: source-backed daily selection.
   A change of selection is not a claim that news, sources, or ratings were updated.
   Production publication and editorial overrides remain controlled by the release process. */

export function londonDayIndex(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError('Invalid feature date');
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const number = type => Number(parts.find(part => part.type === type)?.value);
  return Math.floor(Date.UTC(number('year'), number('month') - 1, number('day')) / 86400000);
}

export function selectEditorialPick(items, dayIndex, offset = 0, requestedId = '') {
  if (!Array.isArray(items) || !items.length) return null;
  const eligible = items.filter(item => item && typeof item.id === 'string' && item.id &&
    typeof item.title === 'string' && item.title.trim() && item.sourceUrl);
  if (!eligible.length) return null;
  const override = eligible.find(item => item.id === requestedId);
  if (override) return { item: override, overridden: true };
  const index = ((dayIndex + offset) % eligible.length + eligible.length) % eligible.length;
  return { item: eligible[index], overridden: false };
}

const categoryMap = {
  movies: { title: 'MOVIES', offset: 0, label: 'THE FEATURE PRESENTATION' },
  tv: { title: 'TV SHOWS', collection: 'tv-shows', offset: 2, label: 'TONIGHT’S SERIES' },
  indie: { title: 'INDIE MOVIES', collection: 'indie-movies', offset: 4, label: 'THE INDEPENDENT CUT' },
  podcasts: { title: 'PODCASTS', collection: 'podcasts', offset: 1, label: 'LISTEN AFTER DARK' },
  games: { title: 'GAMES', collection: 'games', offset: 3, label: 'ENTER IF YOU DARE' }
};

const httpUrl = value => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password ? parsed.href : '';
  } catch { return ''; }
};
const safeDestination = value => {
  if (/^\/films\/[a-z0-9-]+\/$/.test(value || '')) return value;
  return httpUrl(value);
};
const claim = (movie, field) => movie.claims?.find(item => item.field === field);
const filmSource = movie => claim(movie, 'title')?.source || claim(movie, 'synopsis')?.source || '';
const getFilmCandidates = (overviewData = {}) => (window.FR_MOVIES || [])
  .filter(movie => movie.editorialStatus === 'approved' && movie.id && movie.title &&
    httpUrl(filmSource(movie)) && (claim(movie, 'synopsis')?.value ||
    (overviewData[movie.id]?.description?.length >= 100 && httpUrl(overviewData[movie.id]?.sourceUrl))))
  .map(movie => ({
    id: movie.id, title: movie.title,
    category: claim(movie, 'genre')?.value || 'SOURCE-CHECKED HORROR',
    description: claim(movie, 'synopsis')?.value || overviewData[movie.id]?.description,
    overviewSource: claim(movie, 'synopsis')?.source || overviewData[movie.id]?.sourceUrl || '',
    sourceName: claim(movie, 'title')?.sourceName || 'Official film source',
    sourceUrl: '/films/' + encodeURIComponent(movie.id) + '/',
    externalSource: filmSource(movie),
    checkedAt: claim(movie, 'synopsis')?.checked || (overviewData[movie.id]?.description ? '2026-10-12' : claim(movie, 'title')?.checked) || '',
    year: claim(movie, 'filmYear')?.value || claim(movie, 'releaseYear')?.value || '',
    trailer: movie.trailer,
    poster: movie.poster, posterCredit: movie.posterCredit,
    posterPermission: movie.posterPermission,
    posterLicenceStatus: movie.posterLicenceStatus,
    posterSourcePage: movie.posterSourcePage,
    posterPermissionEvidence: movie.posterPermissionEvidence,
    posterUsageScope: movie.posterUsageScope,
    // Do not borrow ratings from unrelated publishers or fabricate an audience review.
    frightRating: null
  }))
  .sort((a, b) => a.id.localeCompare(b.id, 'en'));

function make(tag, className, value) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (value !== undefined) el.textContent = String(value);
  return el;
}
function addLink(parent, label, destination, className) {
  const link = safeDestination(destination);
  if (!link) return null;
  const a = make('a', className, label);
  a.href = link;
  if (link.startsWith('https://')) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
  parent.append(a);
  return a;
}
function verifiedTrailer(item) {
  const trailer = item.trailer;
  if (!trailer || !['trailer', 'teaser'].includes(trailer.kind)) return null;
  if (!/^[A-Za-z0-9_-]{11}$/.test(trailer.videoId || '')) return null;
  if (!httpUrl(trailer.source) || !trailer.channel || !/^\d{4}-\d{2}-\d{2}$/.test(trailer.checked || '')) return null;
  // For movies, the matched claim provides evidence of the official upload identity.
  if (item.externalSource && !trailer.claimMatched) return null;
  return trailer;
}
function artHasRights(item) {
  return httpUrl(item.poster) && item.posterLicenceStatus === 'approved' &&
    item.posterCredit && item.posterPermission && item.posterUsageScope &&
    httpUrl(item.posterSourcePage) && httpUrl(item.posterPermissionEvidence);
}
function dateLabel(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return '';
  const parsed = new Date(date + 'T12:00:00Z');
  return Number.isFinite(parsed.valueOf()) ?
    new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(parsed) : '';
}
function appendVideo(parent, trailer, title) {
  const details = make('details', 'editorial-pick__trailer');
  const summary = make('summary', '', 'Watch official ' + trailer.kind);
  const area = make('div', 'editorial-pick__video');
  const placeholder = make('p', '', 'Open to play the official studio upload. If playback is restricted, use the source link.');
  area.append(placeholder);
  details.append(summary, area);
  details.addEventListener('toggle', () => {
    if (!details.open || area.querySelector('iframe')) return;
    const iframe = make('iframe');
    iframe.title = 'Official ' + trailer.kind + ' for ' + title;
    iframe.loading = 'lazy';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.src = 'https://www.youtube-nocookie.com/embed/' + trailer.videoId;
    area.replaceChildren(iframe);
  });
  parent.append(details);
  addLink(parent, 'Open official upload ↗', trailer.source, 'editorial-pick__source');
}
function createSpotlight(config, item, dayIndex, overridden, extraText = '') {
  const feature = make('section', 'editorial-pick');
  feature.setAttribute('aria-label', config.title + ' daily editorial pick');
  feature.dataset.dayIndex = String(dayIndex);
  feature.dataset.featureId = item.id;

  const art = make('div', 'editorial-pick__art');
  const card = make('div', 'editorial-pick__art-frame');
  if (artHasRights(item)) {
    const img = make('img', 'editorial-pick__poster');
    img.src = httpUrl(item.poster);
    img.alt = 'Licensed promotional poster for ' + item.title;
    img.loading = 'eager';
    img.decoding = 'async';
    card.append(img);
    card.append(make('small', 'editorial-pick__art-credit', 'Artwork © ' + item.posterCredit));
  } else {
    card.append(make('span', 'editorial-pick__art-eyebrow', 'FRIGHTERTAINMENT · SELECTS'));
    card.append(make('strong', 'editorial-pick__art-title', item.title));
    card.append(make('span', 'editorial-pick__art-sub', 'FRIGHTERTAINMENT ORIGINAL DISPLAY ART · NOT AN OFFICIAL POSTER'));
  }
  art.append(card);

  const content = make('div', 'editorial-pick__content');
  const eyebrow = make('div', 'editorial-pick__eyebrow');
  eyebrow.append(make('span', 'editorial-pick__pulse'));
  eyebrow.append(make('span', '', overridden ? 'OWNER-SELECTED SPOTLIGHT' : 'FRIGHTERTAINMENT EDITORIAL PICK'));
  content.append(eyebrow);
  content.append(make('span', 'editorial-pick__series', config.label));
  content.append(make('h2', 'editorial-pick__title', item.title));
  content.append(make('div', 'editorial-pick__genre', [item.category, item.year].filter(Boolean).join(' · ')));
  content.append(make('p', 'editorial-pick__synopsis', item.description));
  if (extraText) content.append(make('p', 'editorial-pick__why', extraText));
  const meta = make('div', 'editorial-pick__meta');
  // A missing licensed Fright Rating is not a numerical zero.
  meta.append(make('span', 'editorial-pick__score', typeof item.frightRating === 'number' &&
    item.frightRating >= 0 && item.frightRating <= 10 && item.ratingEvidence?.approved === true ?
    'FRIGHT RATING ' + item.frightRating.toFixed(1) + '/10' : 'FRIGHT RATING · AWAITING VERIFIED SCORES'));
  const checked = dateLabel(item.checkedAt);
  if (checked) meta.append(make('span', '', 'SOURCE CHECKED ' + checked));
  content.append(meta);
  const links = make('div', 'editorial-pick__links');
  addLink(links, item.sourceUrl.startsWith('/films/') ? 'EXPLORE FILM FILE →' : 'EXPLORE OFFICIAL PAGE →',
    item.sourceUrl, 'editorial-pick__cta');
  const trailer = verifiedTrailer(item);
  if (!trailer && item.externalSource) addLink(links, 'OFFICIAL SOURCE ↗', item.externalSource, 'editorial-pick__source');
  if (item.overviewSource && item.overviewSource !== item.externalSource)
    addLink(links, 'SYNOPSIS SOURCE ↗', item.overviewSource, 'editorial-pick__source');
  if (trailer) appendVideo(links, trailer, item.title);
  content.append(links);
  feature.append(art, content);
  return feature;
}

async function start() {
  const theme = document.body?.dataset.theme;
  const config = categoryMap[theme];
  const intro = document.querySelector('.hub-page-intro');
  if (!config || !intro) return;

  try {
    const sources = await Promise.all([
      theme === 'movies' ? Promise.resolve(null) : fetch('/data/editorial.json').then(response => {
        if (!response.ok) throw new Error('Editorial source not reachable');
        return response.json();
      }),
      fetch('/data/editorial-spotlight-overrides.json').then(response => response.ok ? response.json() : { overrides: {}, notes: {} })
        .catch(() => ({ overrides: {}, notes: {} })),
      theme === 'movies' ? fetch('/data/movie-editorial-overviews.json').then(r => {
        if (!r.ok) throw new Error('Film overview sources unavailable');
        return r.json();
      }).catch(() => ({ items: [] })) : Promise.resolve({ items: [] })
    ]);
    const data = sources[0];
    const settings = sources[1] || {};
    const primaryOverviews = Object.fromEntries((sources[2]?.items || []).filter(x =>
      typeof x.id === 'string' && typeof x.description === 'string' && x.description.length >= 100 && httpUrl(x.sourceUrl)
    ).map(x => [x.id, x]));
    const list = theme === 'movies' ? getFilmCandidates(primaryOverviews) :
      (data?.[config.collection] || []).filter(x => safeDestination(x.sourceUrl));
    const override = settings.overrides?.[theme] || {};
    // Overrides are a publisher-controlled feature and must be dated and explicitly approved.
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const activeOverride = override.approved === true &&
      /^\d{4}-\d{2}-\d{2}$/.test(override.starts || '') &&
      /^\d{4}-\d{2}-\d{2}$/.test(override.ends || '') &&
      date >= override.starts && date <= override.ends;
    const dayIndex = londonDayIndex();
    const selection = selectEditorialPick(list, dayIndex, config.offset, activeOverride ? override.id : '');
    if (!selection) throw new Error('No verified editorial candidates');
    const picked = { ...selection.item };
    if (theme === 'movies' && picked.trailer) picked.trailer = {
      ...picked.trailer, claimMatched: (window.FR_MOVIES || []).some(film =>
        film.id === picked.id && film.claims?.some(c =>
          c.field === 'trailer' && c.source === picked.trailer.source && c.checked === picked.trailer.checked))
    };
    const note = settings.notes?.[theme]?.[picked.id] || '';
    const feature = createSpotlight(config, picked, dayIndex, selection.overridden, note);
    // Place directly below section title/logo, before existing category content.
    intro.insertAdjacentElement('afterend', feature);
  } catch (error) {
    // Failure is visible and honest, without showing fabricated or stale recommendations.
    const unavailable = make('p', 'editorial-pick__unavailable',
      'Today’s editorial spotlight is temporarily unavailable. Explore the sourced recommendations below.');
    unavailable.setAttribute('role', 'status');
    intro.insertAdjacentElement('afterend', unavailable);
    console.warn('Frightertainment editorial pick:', error);
  }
}
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else void start();
}
