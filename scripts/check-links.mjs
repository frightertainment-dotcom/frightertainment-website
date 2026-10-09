import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const excluded = new Set(['.git', 'node_modules', 'dist', '.wrangler', 'test-results', 'playwright-report']);
const files = [];

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excluded.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(absolute);
    else if (entry.isFile()) files.push(absolute);
  }
}

await collect(root);
const htmlFiles = files.filter(file => file.endsWith('.html'));
const htmlByFile = new Map();
for (const file of htmlFiles) htmlByFile.set(file, await readFile(file, 'utf8'));

const errors = [];
let internalLinks = 0;
let externalLinks = 0;
const decodeEntities = value => value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'");
const localFile = (pathname, fromFile) => {
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return null; }
  const candidate = path.resolve(root, decoded.startsWith('/') ? `.${decoded}` : path.relative(root, path.resolve(path.dirname(fromFile), decoded)));
  if (candidate !== root && !candidate.startsWith(root + path.sep)) return null;
  return candidate;
};
const resolvePage = (candidate, pathname) => {
  const choices = pathname.endsWith('/')
    ? [path.join(candidate, 'index.html')]
    : [candidate, path.join(candidate, 'index.html')];
  return choices.find(file => htmlByFile.has(file)) || null;
};

for (const [file, html] of htmlByFile) {
  const attributes = [...html.matchAll(/\b(?:href|src)\s*=\s*(["'])(.*?)\1/gi)];
  for (const match of attributes) {
    const value = decodeEntities(match[2].trim());
    if (!value) continue;
    if (value === '#') { errors.push(`${path.relative(root, file)} has a no-op # link`); continue; }
    let url;
    try { url = new URL(value, `https://frightertainment.test/${path.relative(root, file).split(path.sep).join('/')}`); }
    catch { errors.push(`${path.relative(root, file)} has an invalid link: ${value}`); continue; }
    if (url.protocol === 'javascript:') {
      errors.push(`${path.relative(root, file)} has an executable javascript: link`);
      continue;
    }
    if (url.origin !== 'https://frightertainment.test') {
      if (/^(?:https?:|mailto:|tel:|sms:)$/.test(url.protocol)) externalLinks++;
      else errors.push(`${path.relative(root, file)} uses an unsupported link protocol: ${value}`);
      continue;
    }
    internalLinks++;
    const candidate = localFile(url.pathname, file);
    if (!candidate) { errors.push(`${path.relative(root, file)} has an unsafe local path: ${value}`); continue; }
    const isPage = url.pathname.endsWith('/') || url.pathname.endsWith('.html') || !path.extname(url.pathname);
    const targetPage = isPage ? resolvePage(candidate, url.pathname) : null;
    const targetFile = targetPage || (files.includes(candidate) ? candidate : null);
    if (!targetFile) {
      errors.push(`${path.relative(root, file)} points to a missing local destination: ${value}`);
      continue;
    }
    if (url.hash && targetPage) {
      const targetMarkup = htmlByFile.get(targetPage) || '';
      let id;
      try { id = decodeURIComponent(url.hash.slice(1)); } catch { id = url.hash.slice(1); }
      const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (!new RegExp(`\\b(?:id|name)=["']${escaped}["']`).test(targetMarkup))
        errors.push(`${path.relative(root, file)} points to a missing anchor ${url.hash} in ${path.relative(root, targetPage)}`);
    }
  }
}

const sitemap = await readFile(path.join(root, 'sitemap.xml'), 'utf8');
for (const match of sitemap.matchAll(/<loc>(.*?)<\/loc>/g)) {
  const url = new URL(match[1]);
  if (url.origin !== 'https://www.frightertainment.com') continue;
  const candidate = localFile(url.pathname, path.join(root, 'sitemap.xml'));
  if (!candidate || !resolvePage(candidate, url.pathname)) errors.push(`Sitemap points to a missing local route: ${url.pathname}`);
}

if (errors.length) {
  console.error(errors.map(error => `BROKEN ${error}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Internal link check passed: ${htmlFiles.length} HTML files, ${internalLinks} internal references, ${externalLinks} external links left for independent availability checks, and sitemap routes.`);
}
