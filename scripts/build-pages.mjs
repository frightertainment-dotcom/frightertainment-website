import { readFile, mkdir, readdir, writeFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const context = { window: {} };
runInNewContext(await readFile(new URL('../data/movies.js', import.meta.url), 'utf8'), context);
const movies = context.window.FR_MOVIES;
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const base = 'https://www.frightertainment.com';
const currentYear = new Date().getUTCFullYear();
const claimMarkup = claim => `<li class="film-claim"><div><strong>${escapeHTML(claim.label)}</strong><p>${escapeHTML(claim.value)}</p><small>TERRITORY: ${escapeHTML(claim.territory)} · CHECKED ${escapeHTML(claim.checked)}</small></div><a href="${escapeHTML(claim.source)}" target="_blank" rel="noopener noreferrer">${escapeHTML(claim.sourceName)} ></a></li>`;


function decorateHubLayout(html) {
  const sectionTabs = [['/', 'HOME'], ['/movies.html','MOVIES'], ['/tv-shows.html','TV SHOWS'],
    ['/indie-movies.html','INDIE MOVIES'], ['/podcasts.html','PODCASTS'], ['/games.html','GAMES']]
    .map(([href,label]) => '<a href="' + href + '">' + label + '</a>').join('');
  if (!html.includes('class="skip-link"')) {
    html = html.replace(/<body([^>]*)>/, '<body$1><a class="skip-link" href="#main-content">Skip to main content</a>');
    html = html.replace('<main class="shell film-page"', '<main id="main-content" class="shell film-page"');
  }
  return html
    .replace(/<nav class="nav"[^>]*>[\s\S]*?<\/nav>/,
      '<nav class="hub-tabs" aria-label="Main site sections">' + sectionTabs + '</nav>')
    .replace(/<nav class="mobile-nav"[^>]*>[\s\S]*?<\/nav>/,
      '<nav class="mobile-nav hub-extra-nav" id="mobile-nav" aria-label="Additional navigation" hidden><a href="/top-20/2026/">TOP 20 HORROR</a><a href="/editorial-standards.html">EDITORIAL STANDARDS</a></nav>')
    .replace('<header class="header">','<header class="header hub-header">')
    .replace('<div class="shell header__inner">','<div class="shell hub-header__inside">')
    .replace('<a class="brand"','<a class="brand hub-brand"')
    .replace('<button class="menu-toggle"','<button class="menu-toggle hub-menu-toggle"')
    .replace(/<a class="header__action"[^>]*>[\s\S]*?<\/a>/,'')
    .replace('</head>', '<link rel="stylesheet" href="/hub.css"></head>');
}

for (const movie of movies) {
  const directory = new URL(`../films/${movie.id}/`, import.meta.url);
  await mkdir(directory, { recursive: true });
  const synopsis = movie.claims.find(claim => claim.field === 'synopsis');
  const description = synopsis?.value || `Source-linked film information for ${movie.title}. Release territory and date are shown only where confirmed.`;
  const slug = `/films/${movie.id}/`;
  const claims = movie.claims.map(claimMarkup).join('\n');
  const html = `<!doctype html>
<html lang="en-GB"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark"><meta name="theme-color" content="#090909">
<meta name="description" content="${escapeHTML(description)}"><meta property="og:type" content="article"><meta property="og:title" content="${escapeHTML(movie.title)} — Frightertainment"><meta property="og:description" content="${escapeHTML(description)}"><meta property="og:url" content="${base}${slug}">
<link rel="canonical" href="${base}${slug}"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/styles.css"><title>${escapeHTML(movie.title)} — Frightertainment</title>
</head><body data-film-id="${escapeHTML(movie.id)}"><div class="red-thread" aria-hidden="true"></div>
<header class="header"><div class="shell header__inner"><a class="brand" href="/" aria-label="Frightertainment homepage"><img src="/assets/frightertainment-brand.png" alt="Frightertainment"></a><nav class="nav" aria-label="Main navigation"><a href="/movies.html#discovery">DISCOVERY</a><a href="/top-20/${currentYear}/">TOP 20</a><a href="/movies.html#upcoming">FILMS</a><a href="/#horror-tv">TV & AUDIO</a><a href="/editorial-standards.html">STANDARDS</a></nav><a class="header__action" href="/">HOME <span aria-hidden="true">></span></a><button class="menu-toggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-nav"><span></span><span></span><span></span></button></div><nav class="mobile-nav" id="mobile-nav" aria-label="Mobile navigation" hidden><a href="/movies.html#discovery">HORROR DISCOVERY</a><a href="/top-20/${currentYear}/">TOP 20 OF ${currentYear}</a><a href="/movies.html#upcoming">FILM LISTINGS</a><a href="/#horror-tv">TV & AUDIO</a><a href="/editorial-standards.html">EDITORIAL STANDARDS</a></nav></header>
<main class="shell film-page"><div class="film-page__inner" id="film-detail"><div class="eyebrow eyebrow--small"><span class="eyebrow__line"></span> PRIMARY-SOURCE FILM FILE</div><h1>${escapeHTML(movie.title)}</h1><p class="film-status">${escapeHTML(description)}</p><section class="film-section"><h2>SOURCED FILM DETAILS</h2>${synopsis ? `<p class="film-page__synopsis">${escapeHTML(synopsis.value)}</p>` : ''}<ul class="source-list">${claims}</ul></section><section class="film-section"><h2>FRIGHT INDEX</h2><p class="film-score">—</p><p>Method: eligible critic scores are converted to /100, equally weighted, averaged and rounded to the nearest whole number. Each included source must be linked, dated and cleared for score reuse. This comparison is not an independent critic verdict.</p><ul class="source-list"><li class="film-claim"><div><strong>No eligible critic scores</strong><p>No verified, permission-cleared critic ratings are available.</p></div></li></ul></section><section class="film-section"><h2>TRAILER</h2>${movie.trailer ? `<p>Official ${escapeHTML(movie.trailer.kind)} upload from ${escapeHTML(movie.trailer.channel)}. ${escapeHTML(movie.trailer.territory)} · checked ${escapeHTML(movie.trailer.checked)}.</p><p><a href="${escapeHTML(movie.trailer.source)}" target="_blank" rel="noopener noreferrer">Open the official ${escapeHTML(movie.trailer.kind)} source ></a></p>` : '<p>No exact official video upload is attached to this film record.</p>'}</section><p><a href="/movies.html#upcoming">← Back to film listings</a></p><noscript><p>All published film facts, official video source links and their territories are listed above. Interactive score and embedded video features require JavaScript.</p></noscript></div></main>
<footer class="footer"><div class="shell footer__bottom"><span>FRIGHTERTAINMENT · INDEPENDENT HORROR EDITORIAL</span><a href="/editorial-standards.html">EDITORIAL STANDARDS ></a></div></footer><script src="/data/movies.js"></script><script src="/app.js"></script></body></html>`;
  await writeFile(new URL('index.html', directory), decorateHubLayout(html));
}

const archiveDirectory = new URL('../top-20/', import.meta.url);
await mkdir(archiveDirectory, { recursive: true });
const archivedYears = (await readdir(archiveDirectory, { withFileTypes: true })).filter(entry => entry.isDirectory() && /^\d{4}$/.test(entry.name)).map(entry => Number(entry.name));
const rankingYears = [...new Set([...Array.from({ length: 4 }, (_, index) => currentYear - index), currentYear + 1, ...archivedYears])].sort((a, b) => b - a);
const archiveLinks = rankingYears.map(year => `<li><a href="/top-20/${year}/">Top 20 Horror Films of ${year} ></a><span>Annual critic ranking · source-linked and territory-aware</span></li>`).join('\n');
const archiveHtml = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark"><meta name="description" content="Annual Frightertainment Top 20 horror film rankings, with transparent critic sources and scoring method."><link rel="canonical" href="${base}/top-20/"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/styles.css"><title>Top 20 Horror Films · Frightertainment</title></head><body><a class="skip-link" href="#ranking-archive">Skip to annual rankings</a><div class="red-thread" aria-hidden="true"></div><header class="header"><div class="shell header__inner"><a class="brand" href="/" aria-label="Frightertainment homepage"><img src="/assets/frightertainment-brand.png" alt="Frightertainment"></a><nav class="nav" aria-label="Main navigation"><a href="/movies.html#discovery">DISCOVERY</a><a href="/top-20/">TOP 20</a><a href="/movies.html#upcoming">FILMS</a><a href="/#horror-tv">TV & AUDIO</a><a href="/editorial-standards.html">STANDARDS</a></nav><button class="menu-toggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-nav"><span></span><span></span><span></span></button></div><nav class="mobile-nav" id="mobile-nav" aria-label="Mobile navigation" hidden><a href="/movies.html#discovery">HORROR DISCOVERY</a><a href="/top-20/">TOP 20 ARCHIVE</a><a href="/movies.html#upcoming">FILM LISTINGS</a><a href="/#horror-tv">TV & AUDIO</a><a href="/editorial-standards.html">EDITORIAL STANDARDS</a></nav></header><main class="shell film-page" id="ranking-archive"><div class="film-page__inner"><div class="eyebrow eyebrow--small"><span class="eyebrow__line"></span> FRIGHTERTAINMENT ANNUAL RANKINGS</div><h1>TOP 20 <em>ARCHIVE.</em></h1><p>Every annual page keeps its publication date, previous positions and source links. A private preview may show a dated and incomplete publisher-score comparison. The independent Fright Index requires permission-cleared reviews.</p><ul class="source-list ranking-archive">${archiveLinks}</ul><p><a href="/">← Frightertainment homepage</a></p></div></main><footer class="footer"><div class="shell footer__bottom"><span>FRIGHTERTAINMENT · INDEPENDENT HORROR EDITORIAL</span><a href="/editorial-standards.html">EDITORIAL STANDARDS ></a></div></footer><script src="/app.js"></script></body></html>`;
await writeFile(new URL('index.html', archiveDirectory), decorateHubLayout(archiveHtml));
const yearLocations = [];
for (const year of rankingYears) {
  const directory = new URL(`../top-20/${year}/`, import.meta.url);
  await mkdir(directory, { recursive: true });
  const slug = `/top-20/${year}/`;
  yearLocations.push(`${base}${slug}`);
  const html = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark"><meta name="description" content="Frightertainment Top 20 Horror Films of ${year}: verified professional critic ratings, source links and daily movement."><meta property="og:type" content="article"><meta property="og:title" content="Top 20 Horror Films of ${year} — Frightertainment"><meta property="og:description" content="A transparent annual horror film ranking based on verified, permission-cleared professional critic ratings."><meta property="og:url" content="${base}${slug}"><link rel="canonical" href="${base}${slug}"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/styles.css"><title>Top 20 Horror Films of ${year} — Frightertainment</title></head><body data-ranking-year="${year}"><a class="skip-link" href="#ranking-content">Skip to ranking</a><div class="red-thread" aria-hidden="true"></div><header class="header"><div class="shell header__inner"><a class="brand" href="/" aria-label="Frightertainment homepage"><img src="/assets/frightertainment-brand.png" alt="Frightertainment"></a><nav class="nav" aria-label="Main navigation"><a href="/movies.html#discovery">DISCOVERY</a><a href="/top-20/">TOP 20</a><a href="/movies.html#upcoming">FILMS</a><a href="/#horror-tv">TV & AUDIO</a><a href="/editorial-standards.html">STANDARDS</a></nav><a class="header__action" href="/top-20/">ARCHIVE <span aria-hidden="true">></span></a><button class="menu-toggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-nav"><span></span><span></span><span></span></button></div><nav class="mobile-nav" id="mobile-nav" aria-label="Mobile navigation" hidden><a href="/movies.html#discovery">HORROR DISCOVERY</a><a href="/top-20/">TOP 20 ARCHIVE</a><a href="/movies.html#upcoming">FILM LISTINGS</a><a href="/#horror-tv">TV & AUDIO</a><a href="/editorial-standards.html">EDITORIAL STANDARDS</a></nav></header><main class="shell film-page" id="ranking-content"><div class="film-page__inner"><p><a href="/top-20/">← Annual ranking archive</a></p><div class="eyebrow eyebrow--small"><span class="eyebrow__line"></span> DAILY · VERIFIED · SOURCE-LINKED</div><h1>TOP 20 HORROR FILMS<br><em>OF ${year}.</em></h1><p id="ranking-method">Equal-weight average of distinct, verified, permission-cleared professional critic scores normalized to /100 and rounded to the nearest whole point. Audience ratings, weighted scores and aggregator positive-review percentages are excluded. Automatic recalculation does not acquire reviews.</p><p id="ranking-status" class="film-status" aria-live="polite">Checking sourced critic ratings and available verified film records…</p><p id="ranking-updated">Last updated: no verified ranking data.</p><div id="ranking-list" class="ranking-list" aria-live="polite"></div><p><a href="/editorial-standards.html">Read the source and scoring standards ></a></p></div></main><footer class="footer"><div class="shell footer__bottom"><span>FRIGHTERTAINMENT · INDEPENDENT HORROR EDITORIAL</span><a href="/editorial-standards.html">EDITORIAL STANDARDS ></a></div></footer><script src="/data/movies.js"></script><script src="/app.js"></script><script src="/rankings-preview.js" defer></script><script src="/top20.js" defer></script></body></html>`;
  await writeFile(new URL('index.html', directory), html);
}

// Roll the global navigation and homepage chart into the next year automatically.
for (const filename of ['index.html','movies.html','all-horror-movies.html','tv-shows.html','indie-movies.html','podcasts.html','games.html','film.html','editorial-standards.html']) {
  const file = new URL('../' + filename, import.meta.url);
  let source = await readFile(file, 'utf8');
  source = source.replace(/\/top-20\/20\d{2}\//g, '/top-20/' + currentYear + '/')
    .replace(/TOP 20 HORROR FILMS? · 20\d{2}/g, 'TOP 20 HORROR FILMS · ' + currentYear);
  await writeFile(file, source);
}
const homepagePath = new URL('../index.html', import.meta.url);
let homepage = await readFile(homepagePath, 'utf8');
homepage = homepage.replace(/\/top-20\/\d{4}\//g, `/top-20/${currentYear}/`)
  .replace(/TOP 20 OF \d{4}/g, `TOP 20 OF ${currentYear}`)
  .replace(/OF \d{4}/g, `OF ${currentYear}`);
await writeFile(homepagePath, homepage);

const locations = [`${base}/`, ...['movies.html','all-horror-movies.html','tv-shows.html','indie-movies.html','podcasts.html','games.html'].map(file => `${base}/${file}`), `${base}/editorial-standards.html`, `${base}/top-20/`, ...yearLocations, ...movies.map(movie => `${base}/films/${movie.id}/`)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${locations.map(location => `  <url><loc>${location}</loc></url>`).join('\n')}\n</urlset>\n`;
await writeFile(new URL('../sitemap.xml', import.meta.url), sitemap);
