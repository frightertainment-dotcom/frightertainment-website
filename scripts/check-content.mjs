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
  if (Object.hasOwn(movie, 'criticReferenceSnapshots')) errors.push(`Unlicensed publisher score data must not be shipped in the public film catalogue: ${movie.id}`);
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
  if (movie.poster && (!goodURL(movie.poster) || !movie.posterCredit || !movie.posterPermission || movie.posterLicenceStatus !== 'approved' || !goodURL(movie.posterSourcePage) || !goodURL(movie.posterPermissionEvidence) || !movie.posterUsageScope)) errors.push(`Poster artwork requires approved documented permission, evidence, source page and usage scope: ${movie.id}`);
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
  for (const required of ['id="mobile-nav"', 'aria-controls="mobile-nav"', 'menu-toggle']) if (!html.includes(required)) errors.push(`${file} is missing responsive navigation wiring: ${required}`);
  if (!html.includes(`href="top-20/${currentYear}/"`) && !html.includes(`href="/top-20/${currentYear}/"`) && !html.includes('href="top-20/"')) errors.push(`${file} is missing the annual Top 20 link`);
  for (const [, ref] of html.matchAll(/(?:src|href)="(assets\/[^"?#]+)/g)) {
    try { await access(new URL(ref, root)); } catch { errors.push(`${file} refers to missing ${ref}`); }
  }
}
for (const f of ['index.html','editorial-standards.html','movies.html','tv-shows.html','podcasts.html','indie-movies.html','games.html']) {
  const html = await readFile(new URL(f,root),'utf8');
  if (!html.includes('src="/app.js"') && !html.includes('src="app.js"')) errors.push(f+' is missing shared JavaScript');
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

const homepageEditorial = await readFile(new URL('index.html', root), 'utf8');
if (!homepageEditorial.includes('href="/tv-shows.html"') || !homepageEditorial.includes('href="/podcasts.html"')) errors.push('Homepage must link to television and podcast pages');
if (/FRIGHTERTAINMENT ORIGINALS|DETAILS TO BE ANNOUNCED|id="originals"|href="#originals"/i.test(homepageEditorial)) errors.push('Unannounced production/promotional claims must not appear on homepage');


for (const page of ['movies.html','tv-shows.html','indie-movies.html','podcasts.html','games.html']) {
  const markup = await readFile(new URL(page,root),'utf8');
  for (const needed of ['class="hub-tabs"', 'src="/app.js"', 'id="mobile-nav"', 'href="/hub.css"'])
    if (!markup.includes(needed)) errors.push(page + ' missing required navigation or styling: ' + needed);
}
for (const [page, theme] of Object.entries({
  'index.html':'home','movies.html':'movies','all-horror-movies.html':'movies','archive-film.html':'movies',
  'film.html':'movies','tv-shows.html':'tv','indie-movies.html':'indie','podcasts.html':'podcasts','games.html':'games'
})) {
  const markup = await readFile(new URL(page, root), 'utf8');
  if (!markup.includes(`data-theme="${theme}"`)) errors.push(`${page} is missing its ${theme} theme token`);
}
for (const path of ['top-20/2026/index.html','films/28-years-later-bone-temple/index.html']) {
  const markup = await readFile(new URL(path, root), 'utf8');
  if (!markup.includes('data-theme="movies"')) errors.push(`${path} must use the Movies environment`);
}
const movieYearsMarkup = await readFile(new URL('movies.html',root),'utf8');
for (const required of ['id="movie-year"', 'value="older"', 'value="2025"', 'value="2026"']) {
  if (!movieYearsMarkup.includes(required)) errors.push('Movie year filter missing '+required);
}
if(!movies.some(movie=>movie.id==='28-weeks-later' && movie.claims.some(claim=>claim.field==='releaseYear' && claim.value==='2007')))
  errors.push('28 Weeks Later must remain in the 2007 archive, never 2026');
if(!movies.some(movie=>movie.id==='28-years-later-bone-temple' && Array.isArray(movie.reviews)))
  errors.push('Bone Temple film record must retain its independent Fright Index review list');
const homeHub = await readFile(new URL('index.html',root),'utf8');
if (homeHub.includes('hero-wordmark') || homeHub.includes('FRIGHTERTAINMENT ORIGINALS') || !homeHub.includes('id="hub-ranking"')) errors.push('Homepage must be compact without duplicate wordmark or unannounced productions');
const buildSource = await readFile(new URL('scripts/build-preview.mjs',root),'utf8');
for (const page of ['movies.html','tv-shows.html','indie-movies.html','podcasts.html','games.html'])
  if (!buildSource.includes("'" + page + "'")) errors.push('Preview must include ' + page);

const editorialData = JSON.parse(await readFile(new URL('data/editorial.json', root), 'utf8'));
for (const kind of ['tv-shows','podcasts','games','indie-movies']) {
  const entries = editorialData[kind];
  if (!Array.isArray(entries) || entries.length < 6) errors.push(kind + ': insufficient sourced editorial recommendations');
  const ids = new Set();
  for (const record of entries || []) {
    if (ids.has(record.id)) errors.push(kind + ': duplicate entry '+record.id);
    ids.add(record.id);
    if (!record.title || !record.description || !record.category || !record.sourceName ||
        !validDay(record.checkedAt) || !(/^(https:\/\/[^\s]+|\/films\/[a-z0-9-]+\/)$/).test(record.sourceUrl||''))
      errors.push(kind + ': incomplete editorial record '+record.id);
  }
  const html = await readFile(new URL(kind+'.html',root),'utf8');
  for (const record of entries || []) if (!html.includes(escapeHTML(record.title))) errors.push(kind + ': generated content missing '+record.title);
}

const calendarClient = await readFile(new URL('release-calendar.js',root),'utf8');
if(!calendarClient.includes("claim.field==='releaseDate'")) errors.push('Source-based release calendar wiring is missing');
if(!(await readFile(new URL('movies.html',root),'utf8')).includes('id="hub-release-list"')) errors.push('Release calendar is missing from the Movies page');
// No private publisher-score payload or fallback renderer may enter public assets.
for (const file of ['data/movies.js','app.js','hub.js','home-discovery.js','discovery.js','top20.js','index.html','movies.html','scripts/build-pages.mjs','scripts/build-preview.mjs']) {
  const source = await readFile(new URL(file, root), 'utf8');
  if (source.includes('criticReferenceSnapshots') || source.includes('FrightertainmentPreviewRankings'))
    errors.push(`${file} still contains a private publisher-score payload or renderer`);
}
const rankingPreviewPath = new URL('rankings-preview.js', root);
try { await access(rankingPreviewPath); errors.push('Private publisher-score comparison module must not ship with the public website'); }
catch {}

// The long-lived horror catalogue MUST be additive and separate from the weekly charts.
const vault = JSON.parse(await readFile(new URL('data/archive/horror-films.json',root),'utf8'));
const vaultHTML = await readFile(new URL('all-horror-movies.html',root),'utf8');
const vaultJS = await readFile(new URL('horror-archive.js',root),'utf8');
const vaultUpdater = await readFile(new URL('scripts/sync-horror-archive.mjs',root),'utf8');
const vaultWorkflow = await readFile(new URL('.github/workflows/horror-archive-sync.yml',root),'utf8');
const previewBuild=await readFile(new URL('scripts/build-preview.mjs',root),'utf8');
const schemaSeen=new Set();
if(vault.schemaVersion!==1 || !Array.isArray(vault.films) || !Array.isArray(vault.manual))
  errors.push('Archive must have a valid, cumulative CC0 snapshot schema');
for(const entry of vault.films||[]){
  if (!/^Q[1-9][0-9]*$/.test(entry.qid||'') || !entry.title ||
      entry.title.length>240 || !Number.isInteger(entry.year) ||
      entry.year<1896 || entry.year>new Date().getUTCFullYear()+2 ||
      (entry.imdbId&&!/^tt\d{7,10}$/.test(entry.imdbId)))
    errors.push('Invalid archive film entry '+entry.qid);
  if(schemaSeen.has(entry.qid)) errors.push('Duplicate archive Wikidata item '+entry.qid);
  schemaSeen.add(entry.qid);
}
for(const need of ['id="archive-years"','id="archive-jump"','src="/horror-archive.js"','ALL HORROR MOVIES'])
  if(!vaultHTML.includes(need))errors.push('Year-by-year film archive HTML missing '+need);
if(!vaultJS.includes('renderYearContents')||!vaultJS.includes("type='search'")&&!vaultJS.includes("search.type='search'"))
  errors.push('All Horror Movies must lazily render A–Z results and provide per-year searches');
if(!vaultUpdater.includes('existing=new Map')||!vaultUpdater.includes('Insufficient complete response'))
  errors.push('Long-lived archive updater must preserve prior records and reject partial import');
if(!vaultWorkflow.includes('contents: write')||!vaultWorkflow.includes('refresh-request.json'))
  errors.push('Archive weekly workflow and prompt-friendly refresh trigger are missing');
if(!previewBuild.includes("'all-horror-movies.html'")||!previewBuild.includes("'horror-archive.js'")||
   !previewBuild.includes('data/archive/horror-films.json'))
  errors.push('Archive missing from private Pages deployment bundle');
const homeForArchive=await readFile(new URL('index.html',root),'utf8');
const moviesForArchive=await readFile(new URL('movies.html',root),'utf8');
if(!homeForArchive.includes('href="/all-horror-movies.html"')||
   !moviesForArchive.includes('href="/all-horror-movies.html"'))
  errors.push('All Horror Movies must be accessible as a Movies subtab and homepage link');
const siteMapArchive=await readFile(new URL('sitemap.xml',root),'utf8');
if(!siteMapArchive.includes('/all-horror-movies.html'))errors.push('Sitemap missing all-year horror archive');
const archiveDetailHtml = await readFile(new URL('archive-film.html',root),'utf8');
const archiveDetailJs = await readFile(new URL('archive-film.js',root),'utf8');
const archivePageJs = await readFile(new URL('horror-archive.js',root),'utf8');
const stagingBundle = await readFile(new URL('scripts/build-preview.mjs',root),'utf8');
for(const file of ['archive-film.html','archive-film.js']){
  if(!stagingBundle.includes("'"+file+"'")) errors.push('Private Pages bundle missing '+file);
}
if(!archiveDetailHtml.includes('id="archive-film-detail"') ||
   !archiveDetailHtml.includes('src="/archive-film.js"'))
  errors.push('First-party horror film detail entrypoint missing');
if(!archivePageJs.includes("'/archive-film.html?id='") ||
   !archivePageJs.includes("li.append(link)") ||
   !archivePageJs.includes("link.append(node('span','horror-year__film-title'"))
  errors.push('Archive films must use whole-card internal links rather than relying on third-party pages');
if(!archiveDetailJs.includes("https://www.wikidata.org/wiki/") ||
   !archiveDetailJs.includes("https://www.imdb.com/find/") ||
   !archiveDetailJs.includes("imdbCounts"))
  errors.push('Archive detail must offer source fallback, IMDb search and ambiguous-ID handling');
// The homepage discovery panel is optional but must be present and functional
// in the protected preview. A missing JS asset silently breaks its filters.
const homePanelHtml = await readFile(new URL('index.html',root),'utf8');
const homePanelBundler = await readFile(new URL('scripts/build-preview.mjs',root),'utf8');
const homePanelClient = await readFile(new URL('home-discovery.js',root),'utf8');
if(!homePanelHtml.includes('src="/home-discovery.js"') ||
   !homePanelHtml.includes('<details class="home-discovery-wrap"') ||
   !homePanelHtml.includes('id="home-search"') ||
   !homePanelHtml.includes('id="home-country"'))
  errors.push('Compact homepage discovery drawer or working client is missing');
if(!homePanelBundler.includes("'home-discovery.js'"))
  errors.push('Static private preview must include homepage discovery client');
if(!homePanelClient.includes("'/api/discovery") &&
   !homePanelClient.includes("`/api/discovery"))
  errors.push('Homepage discovery client is not wired to the API');

// CC0 profile expansion and the twenty-film eligible-score distinction.
const profileCache=JSON.parse(await readFile(new URL('data/archive/profiles.json',root),'utf8'));
const profileBundler=await readFile(new URL('scripts/build-preview.mjs',root),'utf8');
const yearChart=await readFile(new URL('top20.js',root),'utf8');
const profileScript=await readFile(new URL('archive-film.js',root),'utf8');
const curatedFilmRenderer=await readFile(new URL('scripts/build-pages.mjs',root),'utf8');
if(profileCache.schemaVersion!==1||!profileCache.records||typeof profileCache.records!=='object')
  errors.push('Cumulative CC0 profile store is unavailable');
for(const [qid,entry] of Object.entries(profileCache.records||{})){
  if(!/^Q[1-9]\d*$/.test(qid)||entry.qid!==qid||
     entry.sourceUrl!=='https://www.wikidata.org/wiki/'+qid ||
     !validDay(entry.checkedAt))
    errors.push('Invalid sourced profile '+qid);
  for(const kind of ['directors','cast','genres','countries']){
    if(!entry[kind])continue;
    if(!Array.isArray(entry[kind])||entry[kind].some(x=>!x.name||!/^Q[1-9]\d*$/.test(x.qid||'')))
      errors.push('Invalid CC0 property '+qid+'/'+kind);
  }
}
if(!profileBundler.includes('data/archive/profiles.json') ||
   !profileScript.includes('data/archive/profiles.json'))
  errors.push('Source-enriched horror profiles missing from archive reader or private Pages bundle');
if(!yearChart.includes('showUnrankedVerifiedFilms')||!yearChart.includes("label.textContent = 'UNRANKED'"))
  errors.push('Annual chart must keep unranked, source-verified films separate from earned ranking positions');
if(!curatedFilmRenderer.includes('filmHeroMarkup(movie)'))
  errors.push('Source-backed cinematic film hero must render even without JavaScript');

// Source-checked editorial release bulletin is distinct from paid provider feeds.
const drop=JSON.parse(await readFile(new URL('data/editorial-releases.json',root),'utf8'));
const dropClient=await readFile(new URL('release-brief.js',root),'utf8');
const dropBundler=await readFile(new URL('scripts/build-preview.mjs',root),'utf8');
const dropHome=await readFile(new URL('index.html',root),'utf8');
const dropMovies=await readFile(new URL('movies.html',root),'utf8');
if(drop.schemaVersion!==1 || drop.country!=='GB' || !Array.isArray(drop.items) ||
   drop.items.length<20) errors.push('UK release bulletin missing source-verified horror announcements');
const dropIds=new Set();
for(const item of drop.items||[]){
  if(!item.id||dropIds.has(item.id))errors.push('Missing or duplicate UK release id '+item.id);
  dropIds.add(item.id);
  if(!['cinema','streaming','vod'].includes(item.category) || !item.title ||
     !validDay(item.date) || !validDay(item.checkedAt) || item.country!=='GB' ||
     !item.service || !item.sourceName || !goodURL(item.sourceUrl) ||
     !['announced-arrival','release-listing','listed-now'].includes(item.availability))
    errors.push('Invalid source-checked UK release listing '+item.id);
}
if(!dropClient.includes('daysAgo(x.date)<=28') ||
   !dropClient.includes('sourceUrl') ||
   !dropClient.includes('advanced-discovery'))errors.push('UK release bulletin filters or deep-linking missing');
if(!dropBundler.includes("'release-brief.js'")||
   !dropBundler.includes("'data/editorial-releases.json'"))errors.push('Release bulletin assets not bundled in Cloudflare preview');
if(!dropHome.includes('data-release-brief')||!dropMovies.includes('data-release-brief'))
  errors.push('Release bulletin missing from homepage or Movies tab');

if (errors.length) { console.error(errors.map(error => `ERROR ${error}`).join('\n')); process.exitCode = 1; }
else console.log(`Content checks passed: ${movies.length} sourced film records, claim citations, responsive page navigation, generated pages, sitemap and local asset paths.`);
