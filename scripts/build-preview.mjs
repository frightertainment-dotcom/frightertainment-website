// Staging-only build: publish public website assets, never repository or Worker files.
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const destination = new URL('../dist/', import.meta.url);
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });

const publicFiles = [
  'index.html', 'movies.html', 'tv-shows.html', 'indie-movies.html', 'podcasts.html', 'games.html', 'film.html', 'editorial-standards.html',
  'app.js', 'discovery.js', 'dynamic-film.js', 'top20.js', 'hub.js', 'release-calendar.js',
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
await writeFile(new URL('_headers', destination),
  '/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n  Cache-Control: no-store\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: SAMEORIGIN\n  Permissions-Policy: camera=(), microphone=(), geolocation=(self)\n');
// Keep static pages free of Functions invocation charges.
await writeFile(new URL('_routes.json', destination), JSON.stringify({
  version:1, include:['/api/*'], exclude:[]
}));
console.log('Private-preview static bundle prepared in dist/ (no provider credentials, Worker code, or test data).');
