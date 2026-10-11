import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const root = new URL('../', import.meta.url);
const filmSource = await readFile(new URL('data/movies.js', root), 'utf8');
const context = { window: {} };
runInNewContext(filmSource, context);
const films = context.window.FR_MOVIES;

test('public movie catalogue contains no private publisher snapshots', () => {
  assert.equal(filmSource.includes('criticReferenceSnapshots'), false);
  assert(films.length > 0);
  assert(films.every(film => !Object.hasOwn(film, 'criticReferenceSnapshots')));
});

test('verified 2026 film records remain separate from the critic ranking', () => {
  const eligible = films.filter(film => {
    const claim = (film.claims || []).find(item => item.field === 'filmYear') ||
      (film.claims || []).find(item => item.field === 'releaseYear');
    return Number(claim?.value) === 2026 && film.editorialStatus === 'approved';
  });
  assert.equal(eligible.length, 7);
  assert.deepEqual(Array.from(eligible, film => film.id).sort(), [
    '28-years-later-bone-temple', 'backrooms', 'insidious-out-of-the-further', 'ready-or-not-2',
    'scream-7', 'send-help', 'victorian-psycho'
  ]);
  for (const film of eligible) {
    assert((film.claims || []).some(claim => claim.field === 'title' && claim.source));
    assert((film.claims || []).some(claim => ['filmYear', 'releaseYear'].includes(claim.field) && claim.value === '2026' && claim.source));
  }
  const territoryOnly2026 = films.filter(film =>
    film.claims?.some(claim => claim.field === 'releaseDate' && claim.value.startsWith('2026-') &&
      !film.claims.some(yearClaim => ['filmYear', 'releaseYear'].includes(yearClaim.field))));
  assert(territoryOnly2026.length >= 4);
  assert(territoryOnly2026.every(film => !eligible.includes(film)));
  for (const filmId of ['crawlers', 'clayface', 'werwulf', 'other-mommy']) {
    const film = films.find(item => item.id === filmId);
    assert(film?.claims.some(claim => claim.field === 'releaseDate' && claim.value.startsWith('2026-')));
    assert(!film.claims.some(claim => claim.field === 'filmYear' && claim.value === '2026'));
  }
});

test('staging 2026 release-year identities are not promoted without a separate film-year source', async () => {
  const migration = await readFile(new URL('worker/migrations/0003_explicit_film_year_and_review_provenance.sql', root), 'utf8');
  const operations = await readFile(new URL('STAGING_AUTOMATION.md', root), 'utf8');
  const migrationPlan = await readFile(new URL('STAGING_MIGRATION_0003_PLAN.md', root), 'utf8');
  assert.match(operations, /including 10 with `release_year=2026`/);
  assert.match(operations, /Seven identities agree exactly/);
  assert.match(operations, /their 2026 dates are territory-specific release dates/);
  const sourcedFilmYearIds = [
    '28-years-later-bone-temple', 'backrooms', 'send-help', 'scream-7',
    'insidious-out-of-the-further', 'ready-or-not-2', 'victorian-psycho'
  ];
  for (const id of sourcedFilmYearIds) assert.match(migration, new RegExp(`film_id\\s*=\\s*['"]${id}['"]`));
  for (const id of ['clayface', 'crawlers', 'werwulf']) assert.doesNotMatch(migration, new RegExp(`film_id\\s*=\\s*['"]${id}['"]`));
  assert.match(migrationPlan, /2024 \| 3 \| `heretic`, `longlegs`, `nosferatu`/);
  assert.match(migrationPlan, /2025 \| 7 \| `28-years-later`, `black-phone-2`, `bring-her-back`/);
  assert.match(migrationPlan, /2026 \| 7 \| `28-years-later-bone-temple`, `backrooms`/);
  assert.match(migrationPlan, /no `d1_migrations` table/);
  assert.match(migrationPlan, /all three migration files/);
  for (const id of ['clayface', 'crawlers', 'werwulf']) assert.match(migrationPlan, new RegExp(`\\b${id}\\b`));
});

test('public homepage, chart, and film clients contain no publisher-preview scoring path', async () => {
  for (const file of ['index.html', 'movies.html', 'app.js', 'hub.js', 'home-discovery.js', 'discovery.js', 'top20.js', 'scripts/build-pages.mjs', 'scripts/build-preview.mjs']) {
    const source = await readFile(new URL(file, root), 'utf8');
    assert.equal(source.includes('FrightertainmentPreviewRankings'), false, file);
    assert.equal(source.includes('criticReferenceSnapshots'), false, file);
  }
  await assert.rejects(access(new URL('rankings-preview.js', root)));
});
