// Deterministic repository census. API-fed imagery and hosted rendering are separate checks.
import { readFile, writeFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const json = async path => JSON.parse(await readFile(path, 'utf8'));
const archive = (await json('data/archive/horror-films.json')).films;
const profiles = (await json('data/archive/profiles.json')).records;
const indie = (await json('data/indie-archive.json')).items;
const editorial = await json('data/editorial.json');
const context = { window: {} };
runInNewContext(await readFile('data/movies.js', 'utf8'), context, { timeout: 1000 });
const manual = Array.from(context.window.FR_MOVIES || []);
const yearCounts = (items, field) => Object.fromEntries(
  [...items.reduce((map, item) => map.set(String(item[field] || 'unknown'), (map.get(String(item[field] || 'unknown')) || 0) + 1), new Map())]
    .sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true }))
);
const directArt = items => items.filter(item => typeof item.poster === 'string' && item.poster &&
  typeof item.posterCredit === 'string' && item.posterCredit &&
  typeof item.posterPermission === 'string' && item.posterPermission).length;
const result = {
  scope: 'Repository snapshot only; direct permission-documented artwork fields. Hosted TMDB, podcast feeds and Cloudflare D1 are excluded.',
  archive: {
    records: archive.length,
    uniqueQids: new Set(archive.map(x => x.qid)).size,
    byOriginalYear: yearCounts(archive, 'year'),
    enrichedProfiles: Object.keys(profiles).length,
    profileCoveragePercent: Math.round(Object.keys(profiles).length / archive.length * 1000) / 10
  },
  manualFilms: { records: manual.length, directLicensedPosters: directArt(manual), generatedDetailRoutes: manual.length },
  indieArchive: { records: indie.length, byOriginalYear: yearCounts(indie, 'originalYear'), directLicensedPosters: directArt(indie) },
  editorial: Object.fromEntries(['tv-shows', 'podcasts', 'games', 'indie-movies'].map(key => [key, {
    records: (editorial[key] || []).length,
    directArtworkUrls: (editorial[key] || []).filter(x => x.artworkUrl || x.poster || x.coverUrl).length,
    officialSteamWidgets: key === 'games' ? (editorial[key] || []).filter(x => Number.isInteger(x.steamId)).length : undefined
  }]))
};
await writeFile('docs/premium-overhaul/media-coverage.json', JSON.stringify(result, null, 2) + '\n');
console.log(`V2 source census: ${archive.length} archive films, ${Object.keys(profiles).length} profiles, ${manual.length} manual films, ${indie.length} indie records; output docs/premium-overhaul/media-coverage.json`);
