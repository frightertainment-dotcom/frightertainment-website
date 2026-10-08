import { readFile, access } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const root = new URL('../', import.meta.url);
const currentYear = new Date().getUTCFullYear();
const context = { window: {} };
runInNewContext(await readFile(new URL('data/movies.js', root), 'utf8'), context);
const movies = context.window.FR_MOVIES;
const errors = [];
const ids = new Set();
const goodURL = value => { try { return new URL(value).protocol === 'https:'; } catch { return false; } };
const validDay = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
};
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

for (const movie of movies) {
  if (!movie.id || !/^[a-z0-9-]+$/.test(movie.id)) errors.push(`Invalid film id: ${movie.id}`);
  if (ids.has(movie.id)) errors.push(`Duplicate film id: ${movie.id}`);
  ids.add(movie.id);
  if (!movie.title?.trim()) errors.push(`Missing title: ${movie.id}`);
  if (!Array.isArray(movie.claims) || movie.claims.length === 0) errors.push(`No claim evidence: ${movie.id}`);
  const titles = (movie.claims || []).filter(claim => claim.field === 'title');
  if (!titles.some(claim => claim.value === movie.title)) errors.push(`Title lacks matching source claim: ${movie.id}`);
  for (const claim of movie.claims || []) {
    if (!claim.field || !claim.label || !String(claim.value || '').trim()) errors.push(`Incomplete claim: ${movie.id}/${claim.field || 'unknown'}`);
    if (!claim.sourceName || !goodURL(claim.source)) errors.push(`Claim needs an HTTPS source: ${movie.id}/${claim.field}`);
    if (!claim.territory?.trim()) errors.push(`Claim needs a territory scope or explicit unknown: ${movie.id}/${claim.field}`);
    if (!validDay(claim.checked)) errors.push(`Claim needs a valid check date: ${movie.id}/${claim.field}`);
    if (claim.field === 'releaseDate' && (!validDay(claim.value) || /^(?:territory|release territory) (?:not stated|unconfirmed|unspecified)/i.test(claim.territory))) errors.push(`Release date needs an ISO date and a stated territory: ${movie.id}`);
    if (claim.field === 'releaseYear' && !/^20\d{2}$/.test(claim.value)) errors.push(`Release year must be a four-digit year: ${movie.id}`);
  }
  if (movie.poster && (!goodURL(movie.poster) || !movie.posterCredit || !movie.posterPermission)) errors.push(`Artwork needs a source, credit and permission record: ${movie.id}`);
  if (movie.trailer) {
    if (!/^[A-Za-z0-9_-]{11}$/.test(movie.trailer.videoId || '') || !['trailer', 'teaser'].includes(movie.trailer.kind) || !movie.trailer.channel || !goodURL(movie.trailer.source) || !movie.trailer.territory || !validDay(movie.trailer.checked)) errors.push(`Trailer needs an exact official upload, source, channel, territory and checked date: ${movie.id}`);
    if (!(movie.claims || []).some(claim => claim.field === 'trailer' && claim.source === movie.trailer.source && claim.checked === movie.trailer.checked)) errors.push(`Trailer needs a matching claim-level source record: ${movie.id}`);
  }
  for (const review of movie.reviews || []) {
    if (!review.source || !goodURL(review.url) || !review.checked || !review.permission || !review.territory) errors.push(`Review needs source, link, check date, territory and permission record: ${movie.id}`);
    if (typeof review.score !== 'number' || typeof review.outOf !== 'number' || review.outOf <= 0 || review.score < 0 || review.score > review.outOf) errors.push(`Invalid review score scale: ${movie.id}`);
  }
  const detailURL = new URL(`films/${movie.id}/index.html`, root);
  try {
    const html = await readFile(detailURL, 'utf8');
    for (const claim of movie.claims || []) if (!html.includes(escapeHTML(claim.value))) errors.push(`Detail page is stale or missing claim ${movie.id}/${claim.field}`);
    for (const required of ['id="mobile-nav"', 'aria-controls="mobile-nav"', 'src="/app.js"', `data-film-id="${movie.id}"`, `<link rel="canonical" href="https://www.frightertainment.com/films/${movie.id}/">`]) if (!html.includes(required)) errors.push(`Detail page is missing ${required}: ${movie.id}`);
  } catch { errors.push(`Missing generated detail page: ${movie.id}`); }
}

for (const file of ['index.html', 'editorial-standards.html']) {
  const html = await readFile(new URL(file, root), 'utf8');
  if (/Assets\//.test(html)) errors.push(`${file} contains an uppercase Assets/ path`);
  for (const required of ['id="mobile-nav"', 'aria-controls="mobile-nav"', 'menu-toggle', 'src="app.js"']) if (!html.includes(required)) errors.push(`${file} is missing responsive navigation wiring: ${required}`);
  if (!html.includes(`href="top-20/${currentYear}/"`) && !html.includes(`href="/top-20/${currentYear}/"`) && !html.includes('href="top-20/"')) errors.push(`${file} is missing the annual Top 20 link`);
  for (const [, ref] of html.matchAll(/(?:src|href)="(assets\/[^"?#]+)/g)) {
    try { await access(new URL(ref, root)); } catch { errors.push(`${file} refers to missing ${ref}`); }
  }
}
const top20Archive = await readFile(new URL('top-20/index.html', root), 'utf8');
for (const required of ['id="mobile-nav"', 'aria-controls="mobile-nav"', `href="/top-20/${currentYear}/"`, 'href="/editorial-standards.html"']) if (!top20Archive.includes(required)) errors.push(`Top 20 archive is missing ${required}`);
const rankingPages = (await import('node:fs/promises')).readdir;
const rankingDirectories = (await rankingPages(new URL('top-20/', root), { withFileTypes: true })).filter(entry => entry.isDirectory());
for (const directory of rankingDirectories) {
  if (!/^\d{4}$/.test(directory.name)) continue;
  const file = `top-20/${directory.name}/index.html`;
  const html = await readFile(new URL(file, root), 'utf8');
  for (const required of ['id="mobile-nav"', 'aria-controls="mobile-nav"', `data-ranking-year="${directory.name}"`, 'src="/top20.js"', 'canonical']) if (!html.includes(required)) errors.push(`${file} is missing ${required}`);
}
const dynamicFilm = await readFile(new URL('film.html', root), 'utf8');
const dynamicFilmScript = await readFile(new URL('dynamic-film.js', root), 'utf8');
if (!dynamicFilm.includes('id="mobile-nav"') || !dynamicFilm.includes('src="/dynamic-film.js"') || !dynamicFilmScript.includes('/api/films/${encodeURIComponent(id)}')) errors.push('Dynamic approved-film detail route is missing its navigation or API wiring');
for (const movie of movies.filter(record => record.trailer)) {
  const detailHTML = await readFile(new URL(`films/${movie.id}/index.html`, root), 'utf8');
  if (!detailHTML.includes(`href="${escapeHTML(movie.trailer.source)}"`)) errors.push(`No-JavaScript detail page is missing the official trailer source link: ${movie.id}`);
}
const manualSync = await readFile(new URL('scripts/sync-manual-films.mjs', root), 'utf8');
if (!manualSync.includes('--apply') || !manualSync.includes('FR_API_BASE') || !manualSync.includes('ADMIN_TOKEN')) errors.push('Protected manual-film synchronization support is missing');
const discoveryScript = await readFile(new URL('discovery.js', root), 'utf8');
if (discoveryScript.includes('test/fixtures')) errors.push('Production discovery client must not import test fixtures');
const workerSource = await readFile(new URL('worker/index.js', root), 'utf8');
if (/https?:\/\/[^\s"']*(?:API_KEY|TOKEN)=/i.test(workerSource)) errors.push('Possible provider credential embedded in Worker source');
const apiLicensing = await readFile(new URL('API_LICENSING.md', root), 'utf8');
for (const provider of ['TMDB', 'Watchmode', 'MovieGlu', 'Rotten Tomatoes', 'Cloudflare']) if (!apiLicensing.includes(provider)) errors.push(`API licensing notes missing ${provider}`);
const sitemap = await readFile(new URL('sitemap.xml', root), 'utf8');
for (const movie of movies) if (!sitemap.includes(`/films/${movie.id}/`)) errors.push(`Film missing from sitemap: ${movie.id}`);
if (!sitemap.includes('/editorial-standards.html')) errors.push('Editorial standards page missing from sitemap');
if (!sitemap.includes(`/top-20/${currentYear}/`)) errors.push(`${currentYear} annual Top 20 page missing from sitemap`);
if (!sitemap.includes('/top-20/')) errors.push('Annual ranking archive missing from sitemap');
if (errors.length) { console.error(errors.map(error => `ERROR ${error}`).join('\n')); process.exitCode = 1; }
else console.log(`Content checks passed: ${movies.length} sourced film records, claim citations, responsive page navigation, generated pages, sitemap and local asset paths.`);
