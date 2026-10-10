// Staging-only build: publish public website assets, never repository or Worker files.
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const destination = new URL('../dist/', import.meta.url);
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });

const publicFiles = [
  'index.html', 'movies.html', 'cinema.html', 'contact.html', 'contact.js', 'podcasts.js', 'credits.html', 'all-horror-movies.html', 'archive-film.html', 'tv-shows.html', 'indie-movies.html', 'podcasts.html', 'games.html', 'film.html',
  'media.html', 'media-ui.js', 'catalogue.js', 'media-detail.js', 'app.js', 'discovery.js', 'home-discovery.js', 'dynamic-film.js', 'top20.js', 'hub.js', 'release-calendar.js', 'release-brief.js', 'horror-archive.js', 'archive-film.js',
  'styles.css', 'hub.css', 'sitemap.xml'
];
for (const file of publicFiles) {
  await cp(new URL(file, root), new URL(file, destination));
}
for (const directory of ['assets', 'films', 'top-20']) {
  await cp(new URL(directory + '/', root), new URL(directory + '/', destination), { recursive: true });
}
await mkdir(new URL('data/', destination));
await cp(new URL('data/movies.js', root), new URL('data/movies.js', destination));
await cp(new URL('data/editorial-releases.json', root), new URL('data/editorial-releases.json', destination));
await mkdir(new URL('data/archive/', destination), {recursive:true});
await cp(new URL('data/archive/horror-films.json', root), new URL('data/archive/horror-films.json', destination));
await cp(new URL('data/archive/profiles.json', root), new URL('data/archive/profiles.json', destination));

// Prevent any staging page from being indexed, including generated film and ranking pages.
async function markHtmlNoIndex(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    if (entry.isDirectory()) {
      await markHtmlNoIndex(file);
    } else if (entry.name.endsWith('.html')) {
      const html = await readFile(file, 'utf8');
      if (!/<head(?:\s|>)/i.test(html)) throw new Error('HTML head missing in ' + file.href);
      await writeFile(file, html.replace(/<head(\s[^>]*)?>/i,
        match => match + '<meta name="robots" content="noindex,nofollow,noarchive">'));
    }
  }
}
await markHtmlNoIndex(destination);

await writeFile(new URL('robots.txt', destination),
  'User-agent: *\nDisallow: /\n');
const sharedHeaders = await readFile(new URL('_headers', root), 'utf8');
if (!sharedHeaders.startsWith('/*')) throw new Error('Shared security headers are missing the Pages _headers rule');
await writeFile(new URL('_headers', destination), sharedHeaders.replace('/*',
  '/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n  Cache-Control: no-store'));
// Keep static pages free of Functions invocation charges.
await writeFile(new URL('_routes.json', destination), JSON.stringify({
  version:1, include:['/api/*'], exclude:[]
}));
await cp(new URL('_redirects', root), new URL('_redirects', destination));
console.log('Private-preview static bundle prepared in dist/ (no provider credentials, Worker code, or test data).');
