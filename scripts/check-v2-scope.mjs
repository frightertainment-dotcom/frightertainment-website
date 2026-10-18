// Guard the seven active destinations in source and the generated bundle.
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const bundle = process.argv.includes('--dist');
const root = process.cwd();
const entries = bundle ? ['dist'] : [
  ...((await readdir(root)).filter(name => /\.(?:html|js|mjs|css|xml)$/.test(name) || name === '_redirects')),
  'data', 'films', 'top-20', 'functions', 'worker'
];
const sourcePattern = /fright[\s_-]*(?:watch|screen)/i;
const files = [];
async function visit(path) {
  const items = await readdir(path, { withFileTypes: true });
  for (const item of items) {
    const file = join(path, item.name);
    if (item.isDirectory()) await visit(file);
    else if (/\.(?:html|js|mjs|css|json|xml)$/.test(item.name) || item.name === '_redirects') files.push(file);
  }
}
for (const entry of entries) {
  const path = join(root, entry);
  if (entry.includes('.' ) || entry === '_redirects') files.push(path);
  else await visit(path);
}
const matches = [];
for (const file of files) {
  if (sourcePattern.test(await readFile(file, 'utf8'))) matches.push(file.slice(root.length + 1));
}
if (matches.length) throw new Error('Cancelled product found in active ' + (bundle ? 'bundle' : 'source') + ': ' + matches.join(', '));
const html = await readFile(join(root, bundle ? 'dist/index.html' : 'index.html'), 'utf8');
const expected = ['/', '/movies.html', '/tv-shows.html', '/cinema.html', '/indie-movies.html', '/podcasts.html', '/games.html'];
const nav = html.match(/<nav class="hub-tabs"[^>]*>(.*?)<\/nav>/s)?.[1] || '';
for (const href of expected) {
  if (!nav.includes(`href="${href}"`)) throw new Error('Primary destination missing: ' + href);
}
console.log(`V2 scope check passed: seven primary destinations, no cancelled service in ${files.length} ${bundle ? 'bundle' : 'source'} files.`);
