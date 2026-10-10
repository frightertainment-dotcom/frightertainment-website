import { readFile, mkdir, readdir, writeFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const context = { window: {} };
runInNewContext(await readFile(new URL('../data/movies.js', import.meta.url), 'utf8'), context);
const movies = context.window.FR_MOVIES;
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const base = 'https://www.frightertainment.com';
const currentYear = new Date().getUTCFullYear();
const filmHeroMarkup=movie=>{
  const claim=key=>movie.claims.find(x=>x.field===key)?.value;
  const verifiedFilmYear=claim('filmYear');
  const year=verifiedFilmYear||'FILM YEAR UNCONFIRMED';
  const coverStyle=[...movie.id].reduce((sum,character)=>sum+character.charCodeAt(0),0)%6;
  const genre=claim('genre')||'Horror cinema';
  const director=claim('director');
  const cast=claim('cast');
  const synopsis=claim('synopsis')||
    'Details about this film are still being verified. Explore the cited sources below for confirmed information.';
  return '<section class="fr-movie-hero" aria-label="Film overview">'+
    '<div class="fr-movie-hero__art" data-cover-style="'+coverStyle+'" role="img" aria-label="Original Frightertainment editorial title artwork, not an official poster">'+
    '<span class="fr-movie-hero__studio">FRIGHTERTAINMENT · CINEMA FILE</span>'+
    '<span class="fr-movie-hero__year">'+escapeHTML(year)+'</span>'+
    '<strong>'+escapeHTML(movie.title)+'</strong>'+
    '<small>MOVIE POSTER</small></div>'+
    '<div class="fr-movie-hero__info"><span class="hub-eyebrow">FROM THE HORROR VAULT</span>'+
    '<h1>'+escapeHTML(movie.title)+'</h1>'+
    '<p class="fr-movie-hero__genre">'+escapeHTML(genre)+' · '+escapeHTML(year)+'</p>'+
    '<p class="fr-movie-hero__synopsis">'+escapeHTML(synopsis)+'</p>'+
    '<div class="fr-movie-hero__facts">'+
    (director?'<div><span>DIRECTED BY</span><strong>'+escapeHTML(director)+'</strong></div>':'')+
    (cast?'<div><span>FEATURED CAST</span><strong>'+escapeHTML(cast)+'</strong></div>':'')+
    '</div><a class="fr-movie-hero__browse" href="'+(verifiedFilmYear?'/all-horror-movies.html?year='+encodeURIComponent(verifiedFilmYear):'/all-horror-movies.html')+'">'+(verifiedFilmYear?'EXPLORE MORE HORROR FROM '+escapeHTML(verifiedFilmYear):'EXPLORE THE HORROR VAULT')+' →</a>'+
    '</div></section>';
};
const claimMarkup = claim => `<li class="film-claim"><div><strong>${escapeHTML(claim.label)}</strong><p>${escapeHTML(claim.value)}</p><small>TERRITORY: ${escapeHTML(claim.territory)} · CHECKED ${escapeHTML(claim.checked)}</small></div><a href="${escapeHTML(claim.source)}" target="_blank" rel="noopener noreferrer">${escapeHTML(claim.sourceName)}</a></li>`;


function decorateHubLayout(html) {
  const sectionTabs = [['/', 'HOME'], ['/movies.html','MOVIES'], ['/tv-shows.html','TV SHOWS'],
    ['/cinema.html','CINEMA'], ['/indie-movies.html','INDIE MOVIES'], ['/podcasts.html','PODCASTS'], ['/games.html','GAMES']]
    .map(([href,label]) => '<a href="' + href + '"' + (label === 'MOVIES' ? ' class="active" aria-current="page"' : '') + '>' + label + '</a>').join('');
  html = html.replace(/<body([^>]*)>/, (_match, attributes) => {
    let next = attributes;
    if (!/\bclass=/.test(next)) next += ' class="hub-body hub-section"';
    else next = next.replace(/\bclass=(['"])(.*?)\1/, (_all, quote, classes) => `class=${quote}${classes.includes('hub-body') ? classes : `${classes} hub-body`}${classes.includes('hub-section') ? '' : ' hub-section'}${quote}`);
    if (!/\bdata-theme=/.test(next)) next += ' data-theme="movies"';
    return '<body' + next + '>';
  });
  if (!html.includes('class="skip-link"')) {
    html = html.replace(/<body([^>]*)>/, '<body$1><a class="skip-link" href="#main-content">Skip to main content</a>');
    html = html.replace('<main class="shell film-page"', '<main id="main-content" class="shell film-page"');
  }
  return html
    .replace(/<nav class="nav"[^>]*>[\s\S]*?<\/nav>/,
      '<nav class="hub-tabs" aria-label="Main site sections">' + sectionTabs + '</nav>')
    .replace(/<nav class="mobile-nav"[^>]*>[\s\S]*?<\/nav>/, '')
    .replace('<header class="header">','<header class="header hub-header">')
    .replace('<div class="shell header__inner">','<div class="shell hub-header__inside">')
    .replace('<a class="brand"','<a class="brand hub-brand"')
    .replace(/<button class="menu-toggle"[^>]*>[\s\S]*?<\/button>/, '')
    .replace(/<a class="header__action"[^>]*>[\s\S]*?<\/a>/,'')
    .replace('</head>', '<link rel="stylesheet" href="/hub.css"></head>')
    .replace('</div></footer>', '<a href="/contact.html">CONTACT US</a></div></footer>')
    .replace('</body>', '<script src="/media-ui.js" defer></script></body>');
}

for (const movie of movies) {
  const directory = new URL(`../films/${movie.id}/`, import.meta.url);
  await mkdir(directory, { recursive: true });
  const synopsis = movie.claims.find(claim => claim.field === 'synopsis');
  const description = synopsis?.value || `Details about ${movie.title} are still being verified. Confirmed release information is linked below.`;
  const slug = `/films/${movie.id}/`;
  const synopsisClaim=movie.claims.find(claim=>claim.field==='synopsis');
  const synopsisSource=synopsisClaim?`<li class="film-claim"><div><strong>Synopsis source</strong><p>Summary shown above.</p><small>CHECKED ${escapeHTML(synopsisClaim.checked)} · ${escapeHTML(synopsisClaim.territory||'Territory not stated')}</small></div><a href="${escapeHTML(synopsisClaim.source)}" target="_blank" rel="noopener noreferrer">${escapeHTML(synopsisClaim.sourceName)}</a></li>`:'';
  const claims = movie.claims.filter(claim=>claim.field!=='synopsis').map(claimMarkup).join('\n')+synopsisSource;
  const html = `<!doctype html>
<html lang="en-GB"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark"><meta name="theme-color" content="#090909">
<meta name="description" content="${escapeHTML(description)}"><meta property="og:type" content="article"><meta property="og:title" content="${escapeHTML(movie.title)} — Frightertainment"><meta property="og:description" content="${escapeHTML(description)}"><meta property="og:url" content="${base}${slug}">
<link rel="canonical" href="${base}${slug}"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/styles.css"><title>${escapeHTML(movie.title)} — Frightertainment</title>
</head><body data-film-id="${escapeHTML(movie.id)}"><div class="red-thread" aria-hidden="true"></div>
<header class="header"><div class="shell header__inner"><a class="brand" href="/" aria-label="Frightertainment homepage"><img src="/assets/frightertainment-brand.png" alt="Frightertainment"></a><nav class="nav" aria-label="Main navigation"><a href="/movies.html#discovery">DISCOVERY</a><a href="/top-20/${currentYear}/">TOP 20</a><a href="/movies.html#upcoming">FILMS</a><a href="/#horror-tv">TV & AUDIO</a></nav><a class="header__action" href="/">HOME <span aria-hidden="true">></span></a><button class="menu-toggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-nav"><span></span><span></span><span></span></button></div><nav class="mobile-nav" id="mobile-nav" aria-label="Mobile navigation" hidden><a href="/movies.html#discovery">HORROR DISCOVERY</a><a href="/top-20/${currentYear}/">TOP 20 OF ${currentYear}</a><a href="/movies.html#upcoming">FILM LISTINGS</a><a href="/#horror-tv">TV & AUDIO</a></nav></header>
<main class="shell film-page"><div class="film-page__inner" id="film-detail">${filmHeroMarkup(movie)}<section class="film-section"><h2>FILM DETAILS</h2><ul class="source-list">${claims}</ul></section><section class="film-section"><h2>TRAILER</h2>${movie.trailer ? `<p>Official ${escapeHTML(movie.trailer.kind)} upload from ${escapeHTML(movie.trailer.channel)}. ${escapeHTML(movie.trailer.territory)} · checked ${escapeHTML(movie.trailer.checked)}.</p><p><a href="${escapeHTML(movie.trailer.source)}" target="_blank" rel="noopener noreferrer">Open the official ${escapeHTML(movie.trailer.kind)} source</a></p>` : '<p>No official trailer link is available for this film.</p>'}</section><p><a href="/movies.html#upcoming">← Back to film listings</a></p><noscript><p>Published film facts and their source links are listed above. Trailer playback requires JavaScript.</p></noscript></div></main>
<footer class="footer"><div class="shell footer__bottom"><span>FRIGHTERTAINMENT · INDEPENDENT HORROR EDITORIAL</span></div></footer><script src="/data/movies.js"></script><script src="/app.js"></script></body></html>`;
  await writeFile(new URL('index.html', directory), decorateHubLayout(html));
}

const archiveDirectory = new URL('../top-20/', import.meta.url);
await mkdir(archiveDirectory, { recursive: true });
const archivedYears = (await readdir(archiveDirectory, { withFileTypes: true })).filter(entry => entry.isDirectory() && /^\d{4}$/.test(entry.name)).map(entry => Number(entry.name));
const rankingYears = [...new Set([...Array.from({ length: 4 }, (_, index) => currentYear - index), currentYear + 1, ...archivedYears])].sort((a, b) => b - a);
const archiveLinks = rankingYears.map(year => `<li><a href="/top-20/${year}/">Top 20 Horror Films of ${year} ></a><span>Annual horror chart</span></li>`).join('\n');
const archiveHtml = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark"><meta name="description" content="Browse Frightertainment's annual horror film rankings by year."><link rel="canonical" href="${base}/top-20/"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/styles.css"><title>Top 20 Horror Films · Frightertainment</title></head><body data-theme="movies"><a class="skip-link" href="#ranking-archive">Skip to annual rankings</a><div class="red-thread" aria-hidden="true"></div><header class="header"><div class="shell header__inner"><a class="brand" href="/" aria-label="Frightertainment homepage"><img src="/assets/frightertainment-brand.png" alt="Frightertainment"></a><nav class="nav" aria-label="Main navigation"><a href="/movies.html#discovery">DISCOVERY</a><a href="/top-20/">TOP 20</a><a href="/movies.html#upcoming">FILMS</a><a href="/#horror-tv">TV & AUDIO</a></nav><button class="menu-toggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-nav"><span></span><span></span><span></span></button></div><nav class="mobile-nav" id="mobile-nav" aria-label="Additional navigation" hidden><a href="/top-20/">TOP 20 HORROR</a></nav></header><main class="shell film-page" id="ranking-archive"><div class="film-page__inner"><div class="eyebrow eyebrow--small"><span class="eyebrow__line"></span> FRIGHTERTAINMENT ANNUAL RANKINGS</div><h1>TOP 20 <em>ARCHIVE.</em></h1><p>Explore each year's horror chart and its score source.</p><ul class="source-list ranking-archive">${archiveLinks}</ul><p><a href="/">← Frightertainment homepage</a></p></div></main><footer class="footer"><div class="shell footer__bottom"><span>FRIGHTERTAINMENT · INDEPENDENT HORROR EDITORIAL</span></div></footer><script src="/app.js"></script></body></html>`;
await writeFile(new URL('index.html', archiveDirectory), decorateHubLayout(archiveHtml));
const yearLocations = [];
for (const year of rankingYears) {
  const directory = new URL(`../top-20/${year}/`, import.meta.url);
  await mkdir(directory, { recursive: true });
  const slug = `/top-20/${year}/`;
  yearLocations.push(`${base}${slug}`);
  const html = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark"><meta name="description" content="Frightertainment's annual horror film chart with clearly labelled source-linked scores."><meta property="og:type" content="article"><meta property="og:title" content="Top 20 Horror Films of ${year} — Frightertainment"><meta property="og:description" content="Explore the annual horror chart and its source-linked scores."><meta property="og:url" content="${base}${slug}"><link rel="canonical" href="${base}${slug}"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/styles.css"><title>Top 20 Horror Films of ${year} — Frightertainment</title></head><body data-theme="movies" data-ranking-year="${year}"><a class="skip-link" href="#ranking-content">Skip to ranking</a><div class="red-thread" aria-hidden="true"></div><header class="header"><div class="shell header__inner"><a class="brand" href="/" aria-label="Frightertainment homepage"><img src="/assets/frightertainment-brand.png" alt="Frightertainment"></a><nav class="nav" aria-label="Main navigation"><a href="/movies.html#discovery">DISCOVERY</a><a href="/top-20/" aria-current="page">TOP 20</a><a href="/movies.html#upcoming">FILMS</a><a href="/#horror-tv">TV & AUDIO</a></nav><a class="header__action" href="/top-20/">ARCHIVE <span aria-hidden="true">></span></a><button class="menu-toggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-nav"><span></span><span></span><span></span></button></div><nav class="mobile-nav" id="mobile-nav" aria-label="Additional navigation" hidden><a href="/top-20/">TOP 20 HORROR</a></nav></header><main class="shell film-page" id="ranking-content"><div class="film-page__inner"><p><a href="/top-20/">← Annual ranking archive</a></p><div class="eyebrow eyebrow--small"><span class="eyebrow__line"></span> SOURCE-LINKED · ANNUAL HORROR CHART</div><h1>TOP 20 HORROR FILMS<br><em>OF ${year}.</em></h1><details class="ranking-method"><summary>How the TMDB chart works</summary><p id="ranking-method">TMDB viewer scores out of 10. Each ranked film needs at least 50 votes. Release years follow the first release listed by TMDB.</p></details><p id="ranking-status" class="film-status" aria-live="polite">Checking the annual ranking…</p><p id="ranking-updated">Last successful ranking: none</p><p id="ranking-attribution" class="tmdb-notice" hidden>This product uses the TMDB API but is not endorsed or certified by TMDB. <a href="/credits.html">TMDB credits and attribution</a>.</p><div id="ranking-list" class="ranking-list" aria-live="polite"></div><div id="unranked-films"></div><p></p></div></main><footer class="footer"><div class="shell footer__bottom"><span>FRIGHTERTAINMENT · INDEPENDENT HORROR EDITORIAL</span></div></footer><script src="/data/movies.js"></script><script src="/app.js"></script><script src="/top20.js" defer></script></body></html>`;
  await writeFile(new URL('index.html', directory), decorateHubLayout(html));
}

// Roll the global navigation and homepage chart into the next year automatically.
for (const filename of ['index.html','movies.html','all-horror-movies.html','archive-film.html','tv-shows.html','indie-movies.html','podcasts.html','games.html','credits.html','film.html','media.html']) {
  const file = new URL('../' + filename, import.meta.url);
  let source = await readFile(file, 'utf8');
  source = source.replace(/\/top-20\/20\d{2}\//g, '/top-20/' + currentYear + '/')
    .replace(/TOP 20 HORROR FILMS? · 20\d{2}/g, 'TOP 20 HORROR FILMS · ' + currentYear);
  if(!source.includes('src="/media-ui.js"'))source=source.replace('</body>','<script src="/media-ui.js" defer></script></body>');
  await writeFile(file, source);
}
const homepagePath = new URL('../index.html', import.meta.url);
let homepage = await readFile(homepagePath, 'utf8');
homepage = homepage.replace(/\/top-20\/\d{4}\//g, `/top-20/${currentYear}/`)
  .replace(/TOP 20 OF \d{4}/g, `TOP 20 OF ${currentYear}`)
  .replace(/OF \d{4}/g, `OF ${currentYear}`);
await writeFile(homepagePath, homepage);

const locations = [`${base}/`, ...['movies.html','all-horror-movies.html','archive-film.html','tv-shows.html','indie-movies.html','podcasts.html','games.html','credits.html'].map(file => `${base}/${file}`), `${base}/top-20/`, ...yearLocations, ...movies.map(movie => `${base}/films/${movie.id}/`)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${locations.map(location => `  <url><loc>${location}</loc></url>`).join('\n')}\n</urlset>\n`;
await writeFile(new URL('../sitemap.xml', import.meta.url), sitemap);
