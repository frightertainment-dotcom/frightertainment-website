// Production-only release bundle: intentionally distinct from the Access-protected preview.
// Ship only public website files. Never copy source code, fixtures, Worker code, keys or reviews.
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const destination = new URL('../dist/', import.meta.url);
const publicFiles = [
  'index.html', 'movies.html', 'cinema.html', 'contact.html', 'contact.js', 'podcasts.js', 'credits.html', 'all-horror-movies.html', 'archive-film.html',
  'tv-shows.html', 'indie-movies.html', 'podcasts.html', 'games.html',
  'film.html',
  'media.html', 'media-ui.js', 'catalogue.js', 'media-detail.js', 'app.js', 'discovery.js', 'home-discovery.js', 'dynamic-film.js', 'top20.js',
  'hub.js', 'release-calendar.js', 'release-brief.js', 'cinema-diary.js', 'straight-to-stream.js', 'streaming-watch.js',
  'horror-archive.js', 'archive-film.js', 'styles.css', 'hub.css', 'sitemap.xml'
];
const publicDirectories = ['assets', 'films', 'top-20'];
const publicDataFiles = [
  'data/movies.js', 'data/editorial-releases.json', 'data/cinema-screenings.json', 'data/streaming-discovery.json',
  'data/archive/horror-films.json', 'data/archive/profiles.json'
];

async function copyFile(relative) {
  const to = new URL(relative, destination);
  const components = relative.split('/');
  if (components.length > 1) await mkdir(new URL(components.slice(0, -1).join('/') + '/', destination), { recursive: true });
  await cp(new URL(relative, root), to);
}

async function validateHtml(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const current = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    if (entry.isDirectory()) { await validateHtml(current); continue; }
    if (!entry.name.endsWith('.html')) continue;
    const html = await readFile(current, 'utf8');
    if (!/<head(?:\s|>)/i.test(html)) throw new Error('HTML head missing: ' + current.pathname);
    if (/<meta\s+[^>]*name\s*=\s*["']robots["'][^>]*noindex/i.test(html) ||
        /<meta\s+[^>]*content\s*=\s*["'][^"']*noindex/i.test(html)) {
      throw new Error('Private noindex directive would escape into production: ' + current.pathname);
    }
    if (!html.includes('frightertainment.com')) throw new Error('Expected canonical production metadata missing: ' + current.pathname);
  }
}

await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
for (const file of publicFiles) await copyFile(file);
for (const directory of publicDirectories) {
  await cp(new URL(directory + '/', root), new URL(directory + '/', destination), { recursive: true });
}
for (const file of publicDataFiles) await copyFile(file);

const movieData = await readFile(new URL('data/movies.js', destination), 'utf8');
if (/criticReferenceSnapshots|frightertainment-private-preview|TEST_FIXTURE_RANKINGS/.test(movieData)) {
  throw new Error('Private/licence-restricted critic reference data detected in public catalogue');
}
await validateHtml(destination);

const robots = await readFile(new URL('robots.txt', root), 'utf8');
if (!/^User-agent:\s*\*/im.test(robots) ||
    /Disallow:\s*\//i.test(robots) ||
    !robots.includes('https://www.frightertainment.com/sitemap.xml')) {
  throw new Error('Production robots.txt is not public and canonical');
}
await writeFile(new URL('robots.txt', destination), robots);
const headers = await readFile(new URL('_headers', root), 'utf8');
if (!headers.startsWith('/*') || !headers.includes('Content-Security-Policy:') ||
    !headers.includes('Strict-Transport-Security:') ||
    /X-Robots-Tag:\s*noindex/i.test(headers)) {
  throw new Error('Missing security headers or preview-only search restriction in production');
}
await writeFile(new URL('_headers', destination), headers);

// Pages Functions are available only at /api/* and use environment-specific
// approved D1 and API secret bindings. No provider credentials enter dist/.
await writeFile(new URL('_routes.json', destination), JSON.stringify({
  version: 1, include: ['/api/*'], exclude: []
}));
for (const forbidden of ['worker', 'scripts', 'test', '.github', 'API_LICENSING.md', 'STAGING_AUTOMATION.md', 'rankings-preview.js']) {
  const entries = await readdir(destination);
  if (entries.includes(forbidden)) throw new Error('Internal development file leaked into production: ' + forbidden);
}
await cp(new URL('_redirects', root), new URL('_redirects', destination));
console.log('Production bundle ready: public pages, restricted source data, public robots, security headers and API-only Function routing.');
