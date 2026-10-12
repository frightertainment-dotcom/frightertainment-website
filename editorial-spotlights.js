/* Frightertainment editorial showcases: sourced content, no invented ratings or artwork. */
(() => {
  'use strict';
  const route = location.pathname.replace(/\/$/, '') || '/';
  const sections = {'/movies.html':'movies','/tv-shows.html':'tv-shows','/indie-movies.html':'indie-movies','/podcasts.html':'podcasts','/games.html':'games'};
  const section = sections[route];
  if (!section) return;
  const intro = document.querySelector('.hub-page-intro');
  if (!intro) return;
  const safeHref = value => {
    if (typeof value !== 'string') return null;
    if (/^\/films\/[a-z0-9-]+\/$/.test(value)) return value;
    try { const url = new URL(value); return url.protocol === 'https:' ? url.href : null; } catch { return null; }
  };
  const label = {'movies':'MOVIE','tv-shows':'TV SERIES','indie-movies':'INDIE HORROR','podcasts':'PODCAST','games':'HORROR GAME'}[section];
  const seed = Math.floor(Date.now()/86400000);
  let entries = [];
  let activeIndex = 0;
  let autoplayId = null;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const card = document.createElement('section');
  card.className = 'fr-editorial-hero';
  card.setAttribute('aria-label', 'Frightertainment daily editorial spotlight');
  const ribbon = document.createElement('div');
  ribbon.className = 'fr-editorial-hero__ribbon';
  ribbon.textContent = '✦ FRIGHTERTAINMENT EDITORIAL PICK · ' + label;
  const contentBox = document.createElement('div');
  contentBox.className = 'fr-editorial-hero__content';
  const artwork = document.createElement('div');
  artwork.className = 'fr-editorial-hero__art';
  artwork.setAttribute('role','img');
  artwork.setAttribute('aria-label','Frightertainment-designed atmospheric illustration, not an official poster');
  const artworkText = document.createElement('span');
  artworkText.className = 'fr-editorial-hero__art-title';
  artwork.append(artworkText);
  const detail = document.createElement('div');
  detail.className = 'fr-editorial-hero__detail';
  const kicker = document.createElement('p');
  kicker.className = 'fr-editorial-hero__kicker';
  const title = document.createElement('h2');
  const synopsis = document.createElement('p');
  synopsis.className = 'fr-editorial-hero__synopsis';
  const evidence = document.createElement('p');
  evidence.className = 'fr-editorial-hero__evidence';
  const actions = document.createElement('div');
  actions.className = 'fr-editorial-hero__actions';
  const link = document.createElement('a');
  link.className = 'fr-editorial-hero__link';
  link.textContent = section === 'podcasts' ? 'LISTEN / DETAILS  →' : section === 'games' ? 'GAME DETAILS  →' : 'EXPLORE THIS PICK  →';
  actions.append(link);
  detail.append(kicker,title,synopsis,evidence,actions);
  contentBox.append(artwork,detail);
  const controls = document.createElement('div');
  controls.className = 'fr-editorial-hero__controls';
  controls.setAttribute('aria-label','Editorial picks carousel');
  const previous = document.createElement('button');
  previous.type = 'button';
  previous.className = 'fr-editorial-hero__nav';
  previous.textContent = '← PREVIOUS';
  previous.setAttribute('aria-label','Previous editorial pick');
  const position = document.createElement('span');
  position.className = 'fr-editorial-hero__position';
  position.setAttribute('aria-live','polite');
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'fr-editorial-hero__nav';
  next.textContent = 'NEXT →';
  next.setAttribute('aria-label','Next editorial pick');
  controls.append(previous,position,next);
  card.append(ribbon,contentBox,controls);
  const render = () => {
    const pick = entries[activeIndex];
    if (!pick) return;
    artworkText.textContent = pick.title;
    kicker.textContent = pick.category || label;
    title.textContent = pick.title;
    synopsis.textContent = pick.description;
    evidence.textContent = 'SOURCE: ' + (pick.sourceName || 'Frightertainment') + ' · checked ' + (pick.checkedAt || 'date not available') + ' · no unverified rating';
    link.href = safeHref(pick.sourceUrl);
    if (link.href.startsWith('https://') && !link.href.startsWith(location.origin + '/')) {
      link.target='_blank'; link.rel='noopener noreferrer';
    } else {
      link.removeAttribute('target'); link.removeAttribute('rel');
    }
    card.dataset.pickId = pick.id || pick.title;
    card.dataset.rotationDay = new Date(seed * 86400000).toISOString().slice(0,10);
    position.textContent = (activeIndex + 1) + ' / ' + entries.length;
  };
  const move = step => { activeIndex = (activeIndex + step + entries.length) % entries.length; render(); };
  const stop = () => { if (autoplayId !== null) { clearInterval(autoplayId); autoplayId = null; } };
  const start = () => {
    stop();
    if (!reduceMotion.matches && entries.length > 1 && !document.hidden)
      autoplayId = setInterval(() => move(1), 9000);
  };
  previous.addEventListener('click', () => { move(-1); stop(); });
  next.addEventListener('click', () => { move(1); stop(); });
  card.addEventListener('mouseenter',stop);
  card.addEventListener('mouseleave',start);
  card.addEventListener('focusin',stop);
  card.addEventListener('focusout',event => { if (!card.contains(event.relatedTarget)) start(); });
  document.addEventListener('visibilitychange',() => { if (document.hidden) stop(); else start(); });
  reduceMotion.addEventListener('change',start);
  intro.insertAdjacentElement('afterend',card);
  fetch('/data/editorial-spotlights.json',{credentials:'same-origin'})
    .then(response => { if(!response.ok) throw new Error('Editorial source unavailable'); return response.json(); })
    .then(data => {
      entries = (data.categories?.[section] || []).filter(x => x && x.title && x.description && safeHref(x.sourceUrl));
      if (!entries.length) throw new Error('No source-checked entries');
      activeIndex = seed % entries.length;
      render();
      controls.hidden = entries.length < 2;
      start();
    })
    .catch(() => {
      card.remove();
    });
})();
