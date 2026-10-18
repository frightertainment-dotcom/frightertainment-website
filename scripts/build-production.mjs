// Production-only release bundle: intentionally distinct from the Access-protected preview.
// Ship only public website files. Never copy source code, fixtures, Worker code, keys or reviews.
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { injectWebAnalytics } from './web-analytics-beacon.mjs';
import { useLocalFonts } from './use-local-fonts.mjs';

const root = new URL('../', import.meta.url);
const destination = new URL('../dist/', import.meta.url);
const publicFiles = [
  'index.html', 'frightnews.html', 'frightnews.js', 'frightnews.css', 'movies.html', 'cinema.html', 'contact.html', 'contact.js', 'podcasts.js', 'credits.html', 'privacy.html', 'all-horror-movies.html', 'archive-film.html',
  'tv-shows.html', 'indie-movies.html', 'podcasts.html', 'games.html',
  'film.html',
  'media.html', 'media-ui.js', 'embed-consent.js', 'catalogue.js', 'media-detail.js', 'app.js', 'discovery.js', 'home-discovery.js', 'home-cinema-note.js', 'homepage-features.js', 'dynamic-film.js', 'top20.js',
  'hub.js', 'release-calendar.js', 'release-brief.js', 'horror-radar.js', 'horror-radar.css', 'cinema-diary.js', 'cinema-concept.js', 'straight-to-stream.js', 'streaming-watch.js',
  'horror-archive.js', 'archive-film.js', 'styles.css', 'hub.css', 'cinematic-redesign.css', 'v5-magazine.css', 'fr-design-system.css', 'fr-page-themes.css', 'fr-rating-badge.css', 'fr-rating-badge.js', 'fr-first-paint.css', 'fr-premium.css', 'fr-polish.css', 'indie-phase3.css', 'fr-inner.css', 'fr-ambient.js', 'v5-magazine.js', 'editorial-spotlight.css', 'editorial-spotlight.mjs', 'editorial-bootstrap.js', 'sitemap.xml'
];
const publicDirectories = ['assets', 'films', 'top-20'];
const publicDataFiles = [
  'data/movies.js', 'data/horror-radar.json', 'data/editorial-releases.json', 'data/editorial.json', 'data/homepage-features.json', 'data/editorial-spotlight-overrides.json', 'data/movie-editorial-overviews.json', 'data/cinema-screenings.json', 'data/streaming-discovery.json', 'data/indie-archive.json',
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

// Keep the approved cascade byte-for-byte, including its final theme layers.
// Self-host the identical licensed fonts to remove the blocking Google CSS
// connection. Subsets remain demand-loaded by the browser's unicode ranges.
const homeCoreCss = ['styles.css','hub.css','v5-magazine.css','fr-design-system.css','fr-page-themes.css','fr-rating-badge.css'];
const homeFinalCss = ['fr-premium.css','horror-radar.css','frightnews.css','fr-polish.css'];
const homeFile = new URL('index.html', destination);
let home = await readFile(homeFile, 'utf8');
const originalLinks = homeCoreCss.map(file => '<link rel="stylesheet" href="/' + file + '">').join('');
if (!home.includes(originalLinks)) throw new Error('Homepage core CSS links unexpectedly changed');
const allHomeCss = [...homeCoreCss, ...homeFinalCss];
const homeCssContents = await Promise.all(allHomeCss.map(file => readFile(new URL(file, destination), 'utf8')));
const fontCss = await readFile(new URL('assets/fonts/fr-fonts.css', destination), 'utf8');
await writeFile(new URL('fr-home-core.css', destination),
  fontCss + '\n' + homeCssContents.map((css, index) => '/* '+allHomeCss[index]+' */\n' + css).join('\n\n'));
home = home.replace(originalLinks, '<link rel="stylesheet" href="/fr-home-core.css">');
for (const file of homeFinalCss) {
  const link = '<link rel="stylesheet" href="/' + file + '">';
  if (!home.includes(link)) throw new Error('Homepage final CSS link unexpectedly changed: ' + file);
  home = home.replace(link, '');
}
home = home.replace(/<link\b[^>]*href="https:\/\/fonts\.(?:googleapis|gstatic)\.com[^>]*>/g, '');
home = home.replace('<script src="/fr-rating-badge.js"></script>', '<script src="/fr-rating-badge.js" defer></script>');
// Serve smaller lossless encodings of the original logo at the sizes actually
// painted by the browser. Keep the original PNG as the fallback and social art.
const logoSet = '/assets/frightertainment-brand-640.webp 640w, /assets/frightertainment-brand-1280.webp 1280w';
const logoSizes = '(max-width:700px) 320px, 540px';
home = home.replace('href="/assets/frightertainment-brand.png" fetchpriority="high"',
  'href="/assets/frightertainment-brand.png" fetchpriority="high" imagesrcset="'+logoSet+'" imagesizes="'+logoSizes+'"');
home = home.replaceAll('src="/assets/frightertainment-brand.png"',
  'src="/assets/frightertainment-brand.png" srcset="'+logoSet+'" sizes="'+logoSizes+'"');
await writeFile(homeFile, home);

// News thumbnails used to download entire 940–1400px scene files. Only the
// news script uses these 320px derivatives; full scene artwork stays intact.
const newsFile = new URL('frightnews.js', destination);
const news = await readFile(newsFile, 'utf8');
await writeFile(newsFile, news.replace(/\/assets\/(?:themes|worlds)\/([a-z0-9-]+\.webp)/g,
  '/assets/news-thumbs/$1'));

// Explicit production instrumentation. Preview remains untracked so editorial QA
// and owner-only checks never inflate public visitor analytics.
const publicWebAnalyticsSiteToken = 'f8adaba13e524ed7ab5d523a2fe2120f';
async function instrumentPublicHtml(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const current = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    if (entry.isDirectory()) { await instrumentPublicHtml(current); continue; }
    if (!entry.name.endsWith('.html')) continue;
    let html = await readFile(current, 'utf8');
    if (!/<body[^>]*class=["'][^"']*\bfr-v5\b/i.test(html) && !html.includes('href="/fr-inner.css"'))
      html = html.replace('</head>', '<link rel="stylesheet" href="/fr-inner.css"></head>');
    await writeFile(current, injectWebAnalytics(useLocalFonts(html), publicWebAnalyticsSiteToken));
  }
}
await instrumentPublicHtml(destination);


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
