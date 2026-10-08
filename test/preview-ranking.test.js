import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

const script = await readFile(new URL('../rankings-preview.js',import.meta.url),'utf8');
const filmData = await readFile(new URL('../data/movies.js',import.meta.url),'utf8');
const filmsCtx={window:{}};
runInNewContext(filmData, filmsCtx);
const films=filmsCtx.window.FR_MOVIES;
const load = hostname => {
  const context = {window:{}, location:{hostname}, Date, URL};
  runInNewContext(script, context);
  return context.window.FrightertainmentPreviewRankings;
};

test('2026 private preview comparison ranks only six sourced 2026 Tomatometer snapshots',()=>{
  const helper=load('codex-frightertainment-v1.frightertainment-private-preview.pages.dev');
  assert.equal(helper.preview,true);
  const result=helper.build(films,2026);
  assert.equal(result.eligible,11);
  assert.equal(result.ranked.length,6);
  assert.deepEqual(Array.from(result.ranked,x=>x.title),[
    'Send Help','28 Years Later: The Bone Temple','Backrooms',
    'Ready or Not 2: Here I Come','Insidious: Out of the Further','Scream 7'
  ]);
  assert.deepEqual(Array.from(result.ranked,x=>x.score),[92,91,86,75,57,30]);
  assert.equal(result.unscored.length,5);
  assert(result.ranked.every(row=>row.sourceUrl.startsWith('https://www.rottentomatoes.com/m/')));
  assert(result.ranked.every(row=>row.checkedAt==='2026-10-08'));
  assert(!result.ranked.some(row=>row.title.includes('28 Weeks Later') || row.title==='28 Years Later'));
});

test('past films remain in their original year, never included in current chart',()=>{
  const helper=load('127.0.0.1');
  assert.equal(helper.build(films,2025).ranked.find(x=>x.id==='28-years-later')?.score,88);
  assert.equal(helper.build(films,2007).ranked[0]?.id,'28-weeks-later');
  assert.equal(helper.build(films,2002).ranked[0]?.id,'28-days-later');
});

test('invalid / untrusted aggregator source records are excluded, not published as scores',()=>{
  const helper=load('localhost');
  const bad={editorialStatus:'approved',id:'bad',title:'Bad',claims:[{field:'releaseYear',value:'2026'}],
    criticReferenceSnapshots:[{source:'Rotten Tomatoes',kind:'positive-review-percentage',value:101,
      criticCount:10,checked:'2026-10-08',url:'https://example.invalid/score'}]};
  const result=helper.build([bad],2026);
  assert.equal(result.ranked.length,0);
  assert.equal(result.unscored.length,1);
});

test('scoreboard is gated off on the public website, including other unrelated pages.dev domains',()=>{
  assert.equal(load('www.frightertainment.com').preview,false);
  assert.equal(load('frightertainment.com').preview,false);
  assert.equal(load('other-project.pages.dev').preview,false);
  assert.equal(load('frightertainment-private-preview.pages.dev').preview,true);
});
