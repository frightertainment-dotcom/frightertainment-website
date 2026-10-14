import test from 'node:test';
import assert from 'node:assert/strict';
import { VERIFIED_INDIE_FILMS, INDIE_YEARS } from '../worker/verified-indie-films.js';

test('indie horror registry is film-specific, cited, and excludes unrelated studio franchises', () => {
  assert(VERIFIED_INDIE_FILMS.length >= 40, 'keep a meaningful independent-film selection');
  const keys = new Set();
  for (const film of VERIFIED_INDIE_FILMS) {
    assert.equal(typeof film.title, 'string');
    assert(Number.isInteger(film.year) && film.year >= 1888 && film.year <= new Date().getUTCFullYear());
    assert.match(film.sourceUrl, /^https:\/\/(?:www\.)?(?:sundance\.org|sxsw\.com|fantasiafestival\.com|brynchainey\.com|thefilmcatalogue\.com|glasseyepix\.com|ifccenter\.com)\//i);
    assert.equal(typeof film.sourceName, 'string');
    const identity = film.year + '|' + film.title.toLowerCase();
    assert(!keys.has(identity), 'duplicate independent film: '+identity);
    keys.add(identity);
  }
  assert(!VERIFIED_INDIE_FILMS.some(film => /^(?:Halloween|Insidious(?::|\s))/i.test(film.title)));
  assert(VERIFIED_INDIE_FILMS.some(film => film.title==='Horror in the High Desert'));
  assert(VERIFIED_INDIE_FILMS.some(film => film.title==='Horror in the High Desert 2: Minerva'));
  assert(VERIFIED_INDIE_FILMS.some(film => film.title==='The Innkeepers' && film.year===2011));
  assert.deepEqual(INDIE_YEARS,[...new Set(VERIFIED_INDIE_FILMS.map(film=>film.year))].sort((a,b)=>b-a));
});
