import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { createHash } from 'node:crypto';

const context = { window: {} };
runInNewContext(await readFile(new URL('../data/movies.js', import.meta.url), 'utf8'), context);
const films = context.window.FR_MOVIES;
if (films.length !== 6 || films.some(film => film.editorialStatus !== 'approved')) throw new Error('Expected all six manually approved Frightertainment film records.');
for (const film of films) {
  if (!Array.isArray(film.claims) || !film.claims.length || film.claims.some(claim => !/^https:\/\//.test(claim.source) || !claim.checked || !claim.territory)) throw new Error(`Claim provenance check failed: ${film.id}`);
}
const payload = JSON.stringify({ films });
const summary = films.map(film => ({ id: film.id, claimCount: film.claims.length, sha256: createHash('sha256').update(JSON.stringify(film)).digest('hex') }));

if (!process.argv.includes('--apply')) {
  console.log(JSON.stringify({ mode: 'dry-run', records: summary, action: 'Review the source record diff, then pass --apply to sync to an authenticated Worker.' }, null, 2));
  process.exit(0);
}
const base = process.env.FR_API_BASE;
const token = process.env.ADMIN_TOKEN;
if (!base || !token) throw new Error('Set FR_API_BASE and ADMIN_TOKEN in the process environment; credentials are never written to files.');
const response = await fetch(new URL('/api/admin/sync-manual-films', base), {
  method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'application/json' }, body: payload
});
if (!response.ok) throw new Error(`Manual film sync failed (${response.status}): ${(await response.text()).slice(0, 300)}`);
console.log(JSON.stringify({ mode: 'applied', result: await response.json() }, null, 2));
