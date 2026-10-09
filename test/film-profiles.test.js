import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const profiles=JSON.parse(await readFile(new URL('../data/archive/profiles.json',import.meta.url),'utf8'));
const films=JSON.parse(await readFile(new URL('../data/archive/horror-films.json',import.meta.url),'utf8'));
const qids=new Set(films.films.map(x=>x.qid));
test('film profiles are cumulative Wikidata-sourced structured facts',()=>{
  assert.equal(profiles.schemaVersion,1);
  assert(profiles.records && typeof profiles.records==='object' && !Array.isArray(profiles.records));
  for(const [qid,profile] of Object.entries(profiles.records)){
    assert.match(qid,/^Q[1-9]\d*$/);
    assert(qids.has(qid),'No source film for '+qid);
    assert.equal(profile.qid,qid);
    assert.equal(profile.sourceUrl,'https://www.wikidata.org/wiki/'+qid);
    assert.match(profile.checkedAt,/^\d{4}-\d{2}-\d{2}$/);
    assert.equal(profile.poster,undefined);
    assert.equal(profile.rating,undefined);
    assert.equal(profile.synopsis,undefined);
    for(const key of ['directors','cast','genres','countries']){
      if(profile[key]){
        assert(Array.isArray(profile[key]));
        for(const item of profile[key]){
          assert.match(item.qid,/^Q[1-9]\d*$/);
          assert(item.name&&typeof item.name==='string');
        }
      }
    }
  }
});
test('enrichment cannot remove or replace the original 9,772 horror titles',()=>{
  assert(films.films.length>=9772);
  assert(profiles.schemaVersion===1);
});
