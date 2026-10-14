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

/**
 * Stable daily starting point, followed by the rest of the verified editorial pool.
 * An approved owner selection leads the carousel without altering underlying source evidence.
 */
export function buildEditorialCarousel(items, dayIndex, offset = 0, requestedId = '') {
  const eligible = Array.isArray(items) ? items.filter(item => item &&
    typeof item.id === 'string' && item.id &&
    typeof item.title === 'string' && item.title.trim() && item.sourceUrl) : [];
  const selection = selectEditorialPick(eligible, dayIndex, offset, requestedId);
  if (!selection) return { slides: [], overridden: false };
  const chosen = eligible.findIndex(item => item.id === selection.item.id);
  const arranged = eligible.slice(chosen).concat(eligible.slice(0, chosen));
  // Keep each carousel compact: one daily lead plus four alternatives, from a larger verified pool.
  return { slides: arranged.slice(0, 5), overridden: selection.overridden };
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
// Exact identities reviewed against the named film, original year and the archive's
// IMDb identifiers (or the corresponding TMDB title page). Never search artwork by title.
export const filmMediaIdentities = Object.freeze({
  'longlegs': { id: 1226578, year: 2024 },
  'heart-eyes': { id: 1302916, year: 2025 },
  'heretic': { id: 1138194, year: 2024 },
  'nosferatu': { id: 426063, year: 2024 },
  'the-monkey': { id: 1124620, year: 2025 },
  '28-years-later': { imdb: 'tt10548174', year: 2025 },
  '28-years-later-bone-temple': { imdb: 'tt32141377', year: 2026 },
  'five-nights-at-freddys-2': { imdb: 'tt30274401', year: 2025 },
  'together': { imdb: 'tt31184028', year: 2025 },
  'bring-her-back': { imdb: 'tt32246771', year: 2025 },
  'scream-7': { imdb: 'tt27047903', year: 2026 },
  '28-weeks-later': { imdb: 'tt0463854', year: 2007 },
  '28-days-later': { imdb: 'tt0289043', year: 2002 }
});
// TV titles use exact title + original first-air year when requesting TMDB art.
// Ambiguous or non-matching records deliberately retain labelled first-party artwork.
const tvEditorialYears = Object.freeze({
  'tv-shows-0': 2019, // Marianne
  'tv-shows-1': 2022, // Archive 81
  'tv-shows-2': 2023, // The Fall of the House of Usher
  'tv-shows-3': 2020, // The Haunting of Bly Manor
  'tv-shows-4': 2019, // Kingdom
  'tv-shows-5': 2022, // Guillermo del Toro's Cabinet of Curiosities
  'tv-shows-expanded-6': 2021, // Yellowjackets
  'tv-shows-expanded-7': 2019 // Evil
});
const indieFilmIds = Object.freeze({
  'indie-movies-0':'longlegs', 'indie-movies-1':'the-monkey',
  'indie-movies-2':'together', 'indie-movies-3':'heretic',
  'indie-movies-4':'bring-her-back', 'indie-movies-5':'nosferatu'
});
export function matchedMedia(item, media) {
  const identity = item.mediaIdentity;
  if (!identity || !media || media.type !== (identity.type || 'movie') || (identity.id && media.tmdbId !== identity.id) ||
      !Number.isInteger(media.tmdbId) || !/^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\.(?:jpg|png|webp)$/i.test(media.posterPath || '')) return false;
  const normal = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  return normal(media.title) === normal(item.title) &&
    Number(String(media.firstReleaseDate || media.releaseDate || '').slice(0,4)) === identity.year &&
    Number(item.year) === identity.year &&
    media.sourceUrl === 'https://www.themoviedb.org/' + (identity.type || 'movie') + '/' + media.tmdbId;
}
const getFilmCandidates = (overviewData = {}) => (window.FR_MOVIES || [])
  .filter(movie => movie.editorialStatus === 'approved' && movie.id && movie.title &&
    httpUrl(filmSource(movie)) && (claim(movie, 'synopsis')?.value ||
    (overviewData[movie.id]?.description?.length >= 100 && httpUrl(overviewData[movie.id]?.sourceUrl))))
  .map(movie => ({
    id: movie.id, title: movie.title,
    category: claim(movie, 'genre')?.value || 'SOURCE-CHECKED HORROR',
    description: (claim(movie, 'synopsis')?.value || '').length >= 100 ?
      claim(movie, 'synopsis').value : overviewData[movie.id]?.description,
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
    mediaIdentity: filmMediaIdentities[movie.id],
    // Do not borrow ratings from unrelated publishers or fabricate an audience review.
    frightRating: null
  }))
  .filter(item => item.mediaIdentity && Number(item.year) === item.mediaIdentity.year &&
    item.description?.length >= 100)
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
export function artHasRights(item) {
  return Boolean(httpUrl(item.poster) && item.posterLicenceStatus === 'approved' &&
    item.posterCredit && item.posterPermission && item.posterUsageScope &&
    httpUrl(item.posterSourcePage) && httpUrl(item.posterPermissionEvidence));
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
  feature.setAttribute('aria-label', config.title + ' editorial selection');
  feature.dataset.dayIndex = String(dayIndex);
  feature.dataset.featureId = item.id;

  const art = make('div', 'editorial-pick__art');
  const card = make('div', 'editorial-pick__art-frame');
  card.dataset.artIdentity = item.id;
  if (artHasRights(item)) {
    const img = make('img', 'editorial-pick__poster');
    img.src = httpUrl(item.poster);
    img.alt = 'Licensed promotional poster for ' + item.title;
    img.loading = 'eager';
    img.decoding = 'async';
    img.addEventListener('error', () => {
      if (!card.isConnected) return;
      card.replaceChildren(
        make('span', 'editorial-pick__art-eyebrow', 'FRIGHTERTAINMENT · SELECTS'),
        make('strong', 'editorial-pick__art-title', item.title),
        make('span', 'editorial-pick__art-sub', 'ORIGINAL FRIGHTERTAINMENT ART')
      );
      card.setAttribute('aria-label', 'Original Frightertainment art, not an official film poster');
      card.classList.remove('editorial-pick__art-frame--poster');
    }, {once:true});
    card.append(img);
    card.append(make('small', 'editorial-pick__art-credit', 'Artwork © ' + item.posterCredit));
  } else {
    card.setAttribute('aria-label', 'Original Frightertainment art, not an official film poster');
    card.append(make('span', 'editorial-pick__art-eyebrow', 'FRIGHTERTAINMENT · SELECTS'));
    card.append(make('strong', 'editorial-pick__art-title', item.title));
    card.append(make('span', 'editorial-pick__art-sub', 'ORIGINAL FRIGHTERTAINMENT ART'));
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
  if (item.mediaIdentity && ['movie','tv'].includes(item.mediaIdentity.type || 'movie')) {
    const score = make('span', 'editorial-pick__score');
    window.FRRatingBadge.render(score, {score:null,source:'tmdb-community',voteCount:null,
      size:'standard',state:'loading'});
    meta.append(score);
  }
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
  const facts = make('aside', 'editorial-pick__facts');
  facts.append(make('span', 'editorial-pick__facts-label', 'THE FILE'));
  if (item.year) facts.append(make('strong', '', String(item.year)));
  facts.append(make('span', '', item.category));
  facts.append(make('small', '', 'SOURCE · ' + (item.sourceName || 'Official source')));
  feature.append(art, content, facts);
  return feature;
}
async function loadPoster(feature, item, isCurrent) {
  const card = feature.querySelector('.editorial-pick__art-frame');
  const score = feature.querySelector('.editorial-pick__score');
  const unavailable = () => {
    if (isCurrent() && score?.isConnected) window.FRRatingBadge.render(score,
      {score:null,source:'tmdb-community',voteCount:null,size:'standard'});
  };
  if (!item.mediaIdentity) return;
  const params = new URLSearchParams({type:item.mediaIdentity.type || 'movie'});
  if (item.mediaIdentity.id) params.set('id', item.mediaIdentity.id);
  else if (item.mediaIdentity.imdb) params.set('imdb', item.mediaIdentity.imdb);
  else if (item.mediaIdentity.type === 'tv' && item.mediaIdentity.year) {
    params.set('title', item.title);
    params.set('year', String(item.mediaIdentity.year));
  } else return;
  try {
    const response = await fetch('/api/media?' + params, {headers:{accept:'application/json'}});
    if (!response.ok) { unavailable(); return; }
    const media = (await response.json())?.item;
    if (!isCurrent()) return;
    if (!matchedMedia(item, media)) { unavailable(); return; }
    if (score?.isConnected) {
      if (media.ratingKind === 'tmdb-community')
        window.FRRatingBadge.render(score, window.FRRatingBadge.fromTmdbMedia(media, 'standard'));
      else unavailable();
    }
    if (artHasRights(item)) return;
    const image = new Image();
    image.alt = 'Poster for ' + item.title + ' (' + item.year + '), via TMDB';
    image.className = 'editorial-pick__poster';
    image.loading = 'eager';
    image.decoding = 'async';
    image.src = 'https://image.tmdb.org/t/p/w500' + media.posterPath;
    await image.decode();
    if (!isCurrent() || !card.isConnected) return;
    card.replaceChildren(image);
    card.classList.add('editorial-pick__art-frame--poster');
    card.append(make('small', 'editorial-pick__art-credit', 'Poster via TMDB · ' + item.title + ' (' + item.year + ')'));
    feature.querySelector('.editorial-pick__facts').append(make('small', 'editorial-pick__tmdb-credit',
      'Poster and optional audience score: TMDB. TMDB does not endorse this site. See Credits for attribution.'));
    if (media.trailer?.source === 'TMDB official video listing' &&
        /^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/.test(media.trailer.url || '')) {
      const links = feature.querySelector('.editorial-pick__links');
      if (!links.querySelector('.editorial-pick__media-trailer'))
        addLink(links, 'WATCH OFFICIAL TRAILER ↗', media.trailer.url, 'editorial-pick__source editorial-pick__media-trailer');
    }
  } catch {
    // Network and image failures retain the labelled original display art.
    unavailable();
  }
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
      ['movies','indie'].includes(theme) ? fetch('/data/movie-editorial-overviews.json').then(r => {
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
      (data?.[config.collection] || []).filter(x => safeDestination(x.sourceUrl)).map(x => {
        const filmId = theme === 'indie' ? indieFilmIds[x.id] : '';
        const identity = theme === 'tv' && tvEditorialYears[x.id] ? {type:'tv',year:tvEditorialYears[x.id]} : filmMediaIdentities[filmId];
        const overview = primaryOverviews[filmId];
        return identity ? {...x, year: identity.year, mediaIdentity: identity,
          description: overview?.description || x.description,
          overviewSource: overview?.sourceUrl || ''} : x;
      }).filter(x => theme !== 'indie' || x.mediaIdentity);
    const override = settings.overrides?.[theme] || {};
    // Overrides are a publisher-controlled feature and must be dated and explicitly approved.
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const activeOverride = override.approved === true &&
      /^\d{4}-\d{2}-\d{2}$/.test(override.starts || '') &&
      /^\d{4}-\d{2}-\d{2}$/.test(override.ends || '') &&
      date >= override.starts && date <= override.ends;
    const dayIndex = londonDayIndex();
    const { slides, overridden } = buildEditorialCarousel(
      list, dayIndex, config.offset, activeOverride ? override.id : ''
    );
    if (!slides.length) throw new Error('No verified editorial candidates');

    const host = make('section', 'editorial-carousel');
    host.setAttribute('role', 'region');
    host.setAttribute('aria-roledescription', 'carousel');
    host.setAttribute('aria-label', config.title + ' editorial picks');
    host.dataset.dayIndex = String(dayIndex);
    const stage = make('div', 'editorial-carousel__stage');
    const controls = make('div', 'editorial-carousel__controls');
    const previous = make('button', 'editorial-carousel__nav', '← PREVIOUS');
    previous.type = 'button';
    previous.setAttribute('aria-label', 'Previous editorial pick');
    const status = make('span', 'editorial-carousel__status');
    status.setAttribute('aria-live', 'off');
    status.setAttribute('aria-atomic', 'true');
    const dots = make('div', 'editorial-carousel__dots');
    dots.setAttribute('role', 'group');
    dots.setAttribute('aria-label', 'Choose editorial pick');
    const pause = make('button', 'editorial-carousel__pause', 'PAUSE');
    pause.type = 'button';
    pause.setAttribute('aria-label', 'Pause automatic editorial rotation');
    const next = make('button', 'editorial-carousel__nav', 'NEXT →');
    next.type = 'button';
    next.setAttribute('aria-label', 'Next editorial pick');
    controls.append(previous, dots, status, pause, next);
    host.append(stage, controls);
    let slideIndex = 0;
    let timer = null;
    let hovering = false;
    let focusing = false;
    let manuallyPaused = false;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    function prepareItem(item) {
      const picked = { ...item };
      if (theme === 'movies' && picked.trailer) picked.trailer = {
        ...picked.trailer, claimMatched: (window.FR_MOVIES || []).some(film =>
          film.id === picked.id && film.claims?.some(c =>
            c.field === 'trailer' && c.source === picked.trailer.source && c.checked === picked.trailer.checked))
      };
      return picked;
    }
    const dotButtons = slides.map((item, index) => {
      const dot = make('button', 'editorial-carousel__dot');
      dot.type = 'button';
      dot.setAttribute('aria-label', 'Show editorial pick ' + (index + 1) + ': ' + item.title);
      dot.addEventListener('click', () => { moveTo(index); freezeAutoplay(); });
      dots.append(dot);
      return dot;
    });
    let stableHeight = 0;
    function render() {
      const selected = prepareItem(slides[slideIndex]);
      const note = settings.notes?.[theme]?.[selected.id] || '';
      // The approved owner nomination keeps its editorial label only on that featured item.
      const feature = createSpotlight(config, selected, dayIndex, overridden && slideIndex === 0, note);
      stage.replaceChildren(feature);
      // The presentation uses the tallest approved synopsis as its measured
      // module height, so neither long titles nor carousel rotation cause
      // distracting page jumps or chop the end of a story.
      if (stableHeight > 0) {
        feature.style.setProperty('min-height', stableHeight + 'px', 'important');
        feature.style.setProperty('min-block-size', stableHeight + 'px', 'important');
      }
      void loadPoster(feature, selected, () => stage.firstElementChild === feature && host.dataset.featureId === selected.id);
      host.dataset.featureId = selected.id;
      host.dataset.slide = String(slideIndex + 1);
      status.textContent = (slideIndex + 1) + ' OF ' + slides.length;
      dotButtons.forEach((dot, index) => dot.setAttribute('aria-current', index === slideIndex ? 'true' : 'false'));
    }
    function moveTo(index) {
      status.setAttribute('aria-live', 'polite');
      slideIndex = (index + slides.length) % slides.length;
      render();
    }
    function stop() {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
    }
    function freezeAutoplay() {
      manuallyPaused = true;
      stop();
      pause.textContent = 'PLAY';
      pause.setAttribute('aria-label', 'Resume automatic editorial rotation');
    }
    function startAutoplay() {
      stop();
      // Automatic motion must not interrupt a reader, keyboard user, or owner-pinned title.
      if (slides.length <= 1 || overridden || manuallyPaused || reducedMotion.matches || document.hidden || hovering || focusing) return;
      timer = window.setInterval(() => { status.setAttribute('aria-live', 'off'); slideIndex = (slideIndex + 1) % slides.length; render(); }, 12000);
    }
    pause.addEventListener('click', () => {
      manuallyPaused = !manuallyPaused;
      pause.textContent = manuallyPaused ? 'PLAY' : 'PAUSE';
      pause.setAttribute('aria-label', manuallyPaused ? 'Resume automatic editorial rotation' : 'Pause automatic editorial rotation');
      if (manuallyPaused) stop(); else startAutoplay();
    });
    previous.addEventListener('click', () => { moveTo(slideIndex - 1); freezeAutoplay(); });
    next.addEventListener('click', () => { moveTo(slideIndex + 1); freezeAutoplay(); });
    host.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      moveTo(slideIndex + (event.key === 'ArrowRight' ? 1 : -1));
      freezeAutoplay();
    });
    host.addEventListener('mouseenter', () => { hovering = true; stop(); });
    host.addEventListener('mouseleave', () => { hovering = false; startAutoplay(); });
    host.addEventListener('focusin', () => { focusing = true; stop(); });
    host.addEventListener('focusout', event => {
      if (event.relatedTarget && host.contains(event.relatedTarget)) return;
      focusing = false;
      startAutoplay();
    });
    document.addEventListener('visibilitychange', startAutoplay);
    reducedMotion.addEventListener('change', () => { pause.hidden = overridden || reducedMotion.matches; startAutoplay(); });
    render();
    controls.hidden = slides.length <= 1;
    pause.hidden = overridden || reducedMotion.matches;
    // Place directly below each existing section-title logo without replacing any page structure.
    intro.insertAdjacentElement('afterend', host);

    function reserveEditorialSpace() {
      if (!host.isConnected || !stage.clientWidth) return;
      // Measure at the actual rendered viewport, with the same CSS as a live
      // slide. A temporary inert stage avoids polluting the accessible UI.
      const probe = make('div', 'editorial-carousel__stage');
      probe.setAttribute('aria-hidden', 'true');
      probe.inert = true;
      probe.style.setProperty('position', 'absolute', 'important');
      probe.style.setProperty('left', '0', 'important');
      probe.style.setProperty('top', '0', 'important');
      probe.style.setProperty('width', stage.getBoundingClientRect().width + 'px', 'important');
      probe.style.setProperty('visibility', 'hidden', 'important');
      probe.style.setProperty('pointer-events', 'none', 'important');
      probe.style.setProperty('height', 'auto', 'important');
      host.append(probe);
      let tallest = 0;
      for (const item of slides) {
        const prepared = prepareItem(item);
        const reason = settings.notes?.[theme]?.[prepared.id] || '';
        const candidate = createSpotlight(config, prepared, dayIndex, false, reason);
        candidate.style.setProperty('min-height', '0px', 'important');
        candidate.style.setProperty('min-block-size', '0px', 'important');
        candidate.style.setProperty('max-height', 'none', 'important');
        candidate.style.setProperty('max-block-size', 'none', 'important');
        candidate.style.setProperty('height', 'auto', 'important');
        candidate.style.setProperty('block-size', 'auto', 'important');
        if (theme === 'movies' && window.innerWidth >= 1600 && prepared.mediaIdentity && !artHasRights(prepared)) {
          candidate.querySelector('.editorial-pick__facts')?.append(make('small', 'editorial-pick__tmdb-credit', 'Poster and optional audience score: TMDB. TMDB does not endorse this site. See Credits for attribution.'));
          const extra = candidate.querySelector('.editorial-pick__links');
          if (extra && !extra.querySelector('.editorial-pick__media-trailer')) extra.append(make('span', 'editorial-pick__source editorial-pick__media-trailer', 'WATCH OFFICIAL TRAILER ↗'));
        }
        probe.replaceChildren(candidate);
        tallest = Math.max(tallest, Math.ceil(candidate.getBoundingClientRect().height));
      }
      probe.remove();
      stableHeight = tallest;
      if (tallest > 0) {
        stage.style.setProperty('min-height', tallest + 'px');
        const active = stage.querySelector('.editorial-pick');
        if (active) {
          active.style.setProperty('min-height', tallest + 'px', 'important');
          active.style.setProperty('min-block-size', tallest + 'px', 'important');
        }
      }
    }

    reserveEditorialSpace();
    let resizeFrame = 0;
    const resizeEditorial = () => {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(reserveEditorialSpace);
    };
    window.addEventListener('resize', resizeEditorial, {passive:true});
    // The V5 Movies page moves this carousel into a narrower desktop editorial
    // column after initial insertion. Its width changes without a window resize;
    // re-measure all slides at their *actual* column width before rotation.
    host.addEventListener('fr:editorial-layout-change', reserveEditorialSpace);
    let measuredWidth = host.getBoundingClientRect().width;
    const widthObserver = new ResizeObserver(entries => {
      const nextWidth = entries[0]?.contentRect.width || 0;
      if (nextWidth > 0 && Math.abs(nextWidth - measuredWidth) > 2) {
        measuredWidth = nextWidth;
        resizeEditorial();
      }
    });
    widthObserver.observe(host);
    window.addEventListener('pagehide', () => widthObserver.disconnect(), {once:true});
    document.fonts?.ready?.then(resizeEditorial).catch(() => {});
    startAutoplay();
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
