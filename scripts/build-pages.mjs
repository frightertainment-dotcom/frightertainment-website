import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const context = { window: {} };
runInNewContext(await readFile(new URL('../data/movies.js', import.meta.url), 'utf8'), context);
const movies = context.window.FR_MOVIES;
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const base = 'https://www.frightertainment.com';
const claimMarkup = claim => `<li class="film-claim"><div><strong>${escapeHTML(claim.label)}</strong><p>${escapeHTML(claim.value)}</p><small>TERRITORY: ${escapeHTML(claim.territory)} · CHECKED ${escapeHTML(claim.checked)}</small></div><a href="${escapeHTML(claim.source)}" target="_blank" rel="noopener noreferrer">${escapeHTML(claim.sourceName)} ↗</a></li>`;

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
<header class="header"><div class="shell header__inner"><a class="brand" href="/" aria-label="Frightertainment homepage"><img src="/assets/frightertainment-brand.png" alt="Frightertainment"></a><nav class="nav" aria-label="Main navigation"><a href="/#upcoming">FILMS</a><a href="/#review-index">FRIGHT INDEX</a><a href="/#originals">ORIGINALS</a><a href="/editorial-standards.html">STANDARDS</a></nav><a class="header__action" href="/">HOME <span aria-hidden="true">↗</span></a><button class="menu-toggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-nav"><span></span><span></span><span></span></button></div><nav class="mobile-nav" id="mobile-nav" aria-label="Mobile navigation" hidden><a href="/#upcoming">FILM LISTINGS</a><a href="/#review-index">FRIGHT INDEX</a><a href="/#originals">ORIGINALS</a><a href="/editorial-standards.html">EDITORIAL STANDARDS</a></nav></header>
<main class="shell film-page"><div class="film-page__inner" id="film-detail"><div class="eyebrow eyebrow--small"><span class="eyebrow__line"></span> PRIMARY-SOURCE FILM FILE</div><h1>${escapeHTML(movie.title)}</h1><p class="film-status">${escapeHTML(description)}</p><section class="film-section"><h2>SOURCED FILM DETAILS</h2>${synopsis ? `<p class="film-page__synopsis">${escapeHTML(synopsis.value)}</p>` : ''}<ul class="source-list">${claims}</ul></section><section class="film-section"><h2>FRIGHT INDEX</h2><p class="film-score">—</p><p>Method: eligible critic scores are converted to /100, equally weighted, averaged and rounded to the nearest whole number. Each included source must be linked, dated and cleared for score reuse. This comparison is not an independent critic verdict.</p><ul class="source-list"><li class="film-claim"><div><strong>No eligible critic scores</strong><p>No verified, permission-cleared critic ratings are available.</p></div></li></ul></section><section class="film-section"><h2>TRAILER</h2><p>No exact official video upload is attached to this film record.</p></section><p><a href="/#upcoming">← Back to film listings</a></p><noscript><p>All published film facts and their source links are listed above. Interactive score and video features require JavaScript.</p></noscript></div></main>
<footer class="footer"><div class="shell footer__bottom"><span>FRIGHTERTAINMENT · INDEPENDENT HORROR EDITORIAL</span><a href="/editorial-standards.html">EDITORIAL STANDARDS ↗</a></div></footer><script src="/data/movies.js"></script><script src="/app.js"></script></body></html>`;
  await writeFile(new URL('index.html', directory), html);
}

const locations = [`${base}/`, `${base}/editorial-standards.html`, ...movies.map(movie => `${base}/films/${movie.id}/`)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${locations.map(location => `  <url><loc>${location}</loc></url>`).join('\n')}\n</urlset>\n`;
await writeFile(new URL('../sitemap.xml', import.meta.url), sitemap);
