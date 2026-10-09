import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const feed=JSON.parse(await readFile(new URL('../data/editorial-releases.json',import.meta.url),'utf8'));
test('UK release notices are independently sourced and never a paid-live service claim',()=>{
  assert.equal(feed.schemaVersion,1);
  assert.equal(feed.country,'GB');
  assert(feed.items.length>=29);
  const ids=new Set();
  for(const x of feed.items){
    assert(!ids.has(x.id));ids.add(x.id);
    assert(x.title.length>1);
    assert(['streaming','cinema','vod'].includes(x.category));
    assert.match(x.date,/^20\d{2}-\d{2}-\d{2}$/);
    assert.match(x.checkedAt,/^20\d{2}-\d{2}-\d{2}$/);
    assert(x.sourceUrl.startsWith('https://'));
    assert.equal(x.country,'GB');
    assert.equal(x.rating,undefined);
    assert.equal(x.poster,undefined);
    assert(x.availability==='announced-arrival'||x.availability==='release-listing'||x.availability==='listed-now');
  }
});
test('shudder UK arrivals include dates before and after October 9, cinema and VOD are distinct',()=>{
  const streaming=feed.items.filter(x=>x.category==='streaming');
  assert(streaming.some(x=>x.title==='V/H/S/Mixtape'&&x.date==='2026-10-09'));
  assert(streaming.some(x=>x.title==='Hunting Matthew Nichols'&&x.date==='2026-10-31'));
  assert(feed.items.some(x=>x.category==='cinema'&&x.title==='Other Mommy'&&x.date==='2026-10-09'));
  assert(feed.items.some(x=>x.category==='vod'&&x.title==='28 Years Later: The Bone Temple'));
});
