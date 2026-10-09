import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const archive=JSON.parse(await readFile(new URL('../data/archive/horror-films.json',import.meta.url),'utf8'));
test('source archive is cumulative and contains historical thousands, not just current releases',()=>{
  assert.equal(archive.schemaVersion,1);
  assert(Array.isArray(archive.films));
  assert(archive.films.length>=9772,'Current historical snapshot must never be replaced by a small weekly list');
  const years=new Set(archive.films.map(item=>item.year));
  assert(years.has(1896));
  assert(years.has(2007));
  assert(years.has(2025));
  assert(years.has(2026));
  assert(years.size>=128);
});
test('Wikidata stable IDs deduplicate records and IMDb IDs are checked before forming direct links',()=>{
  const ids=new Set();
  for(const movie of archive.films){
    assert.match(movie.qid,/^Q[1-9][0-9]*$/);
    assert(!ids.has(movie.qid),'Repeated title id '+movie.qid);
    ids.add(movie.qid);
    assert(movie.title.length>=2&&movie.title.length<=240);
    assert(Number.isInteger(movie.year)&&movie.year>=1896);
    if(movie.imdbId)assert.match(movie.imdbId,/^tt\d{7,10}$/);
    assert.equal(movie.poster,undefined);
    assert.equal(movie.rating,undefined);
  }
});
test('manually verified opening 1896 horror film is always retained',()=>{
  assert(archive.manual.some(x=>x.year===1896&&x.id==='manual:le-manoir-du-diable-1896'&&x.url.includes('bfi.org.uk')));
});
