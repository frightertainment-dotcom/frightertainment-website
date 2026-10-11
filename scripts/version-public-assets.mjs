// Keep staging and production assets in sync without stale mobile browser caches.
// Every output HTML page references its exact bundled JS/CSS bytes by fingerprint.
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const assetTag = /(<(?:script|link)\b[^>]*?\b(?:src|href)=["'])(\/[a-z0-9_./-]+\.(?:js|css))(["'])/gi;

export function addVersionToTags(html, fingerprints) {
  return html.replace(assetTag, (whole, before, pathname, after) => {
    const sha = fingerprints.get(pathname);
    if (!sha || !/^[a-f0-9]{12}$/.test(sha)) {
      throw new Error('Missing versioned public asset: ' + pathname);
    }
    return before + pathname + '?v=' + sha + after;
  });
}

async function collectHtml(dir, files = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) await collectHtml(absolute, files);
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(absolute);
  }
  return files;
}

export async function versionBundle(bundleRoot = root) {
  const files = await collectHtml(bundleRoot);
  const pages = await Promise.all(files.map(async file => [file, await readFile(file, 'utf8')]));
  const targets = new Set();
  for (const [, html] of pages) {
    for (const [, , pathname] of html.matchAll(assetTag)) {
      if (pathname.includes('..')) throw new Error('Unsafe public asset path: ' + pathname);
      targets.add(pathname);
    }
  }
  const fingerprints = new Map();
  for (const pathname of targets) {
    const file = path.resolve(bundleRoot, '.' + pathname);
    if (!file.startsWith(bundleRoot + path.sep)) throw new Error('Asset path escapes output bundle');
    const contents = await readFile(file);
    fingerprints.set(pathname, createHash('sha256').update(contents).digest('hex').slice(0, 12));
  }
  for (const [file, html] of pages) {
    const versioned = addVersionToTags(html, fingerprints);
    if ([...versioned.matchAll(assetTag)].length) {
      throw new Error('An unversioned asset reference remains in ' + file);
    }
    await writeFile(file, versioned);
  }
  console.log('Versioned ' + fingerprints.size + ' public CSS/JS assets in ' + files.length + ' HTML pages.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await versionBundle();
}
