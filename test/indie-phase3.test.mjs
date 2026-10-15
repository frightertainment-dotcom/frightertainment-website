import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { VERIFIED_INDIE_FILMS, INDIE_YEARS } from '../worker/verified-indie-films.js';
import { fetchCatalogue } from '../worker/tmdb-media.js';

const staticIndex = JSON.parse(await readFile(new URL('../data/indie-archive.json',import.meta.url),'utf8'));
const query = (year, extra = {}) => fetchCatalogue({}, {
  type:'indie',mode:'archive',year,page:1,sourceOnly:true,...extra
});

test('published fallback and source-reviewed registry stay in agreement', () => {
  assert.equal(staticIndex.schemaVersion,1);
  assert.equal(staticIndex.items.length,VERIFIED_INDIE_FILMS.length);
  assert.deepEqual(staticIndex.availableYears,INDIE_YEARS);
  assert.equal(VERIFIED_INDIE_FILMS.length,86);
  assert.equal(INDIE_YEARS.at(-1),1922);
  assert.equal(INDIE_YEARS[0],2026);
  assert.ok(staticIndex.items.every((film,index) => film.title===VERIFIED_INDIE_FILMS[index].title &&
    film.originalYear===VERIFIED_INDIE_FILMS[index].year &&
    film.indieSourceUrl===VERIFIED_INDIE_FILMS[index].sourceUrl &&
    /^https:\/\//.test(film.indieSourceUrl)));
  assert.equal(new Set(staticIndex.items.map(x=>x.title.toLowerCase()+'|'+x.originalYear)).size,staticIndex.items.length);
});

test('all-year indie archive paginates, with no invented poster or viewer ratings',async()=>{
  const result=await query(null);
  assert.equal(result.totalResults,86);
  assert.equal(result.items.length,9);
  assert.equal(result.nextPage,2);
  assert.equal(result.totalPages,10);
  assert.equal(result.year,null);
  assert.ok(result.items.every(x=>x.indieVerified && !x.posterPath &&
    !x.trailer && !x.voteAverage && x.indieSourceUrl.startsWith('https://')));
});

test('historical original years, decades and cross-year search work', async()=>{
  const [sixties,seventies,blair,twentyTwenty,firstFilm]=await Promise.all([
    query(null,{decade:1960}),query(null,{decade:1970}),
    query(null,{query:'Blair'}),query(2020),query(1922)
  ]);
  assert.deepEqual(sixties.items.map(x=>x.title).sort(),['Carnival of Souls','Night of the Living Dead']);
  const [twenties,thirties,fifties] = await Promise.all([
    query(null,{decade:1920}),query(null,{decade:1930}),query(null,{decade:1950})
  ]);
  assert.deepEqual(twenties.items.map(x=>x.title),['Nosferatu']);
  assert.deepEqual(thirties.items.map(x=>x.title).sort(),['Vampyr','White Zombie']);
  assert.deepEqual(fifties.items.map(x=>x.title),['The Blob']);
  assert.equal(seventies.totalResults,3);
  assert.deepEqual(blair.items.map(x=>x.title),['The Blair Witch Project']);
  assert.ok(twentyTwenty.items.some(x=>x.title==='Host'));
  assert.equal(firstFilm.items[0].indieOriginalYear,1922);
});

test('source-only mode refuses to fabricate annual ratings or upcoming premieres',async()=>{
  const [chart,upcoming]=await Promise.all([
    fetchCatalogue({}, {type:'indie',mode:'chart',year:2026,page:1,sourceOnly:true}),
    fetchCatalogue({}, {type:'indie',mode:'upcoming',year:2026,page:1,sourceOnly:true})
  ]);
  assert.equal(chart.items.length,0);
  assert.equal(upcoming.items.length,0);
});
