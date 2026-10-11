import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('source-backed UK cinema diary never labels an unknown cinema rollout as nationwide',async()=>{
 const d=JSON.parse(await readFile(new URL('../data/cinema-screenings.json',import.meta.url),'utf8'));
 assert.equal(d.schemaVersion,1);
 assert.equal(d.territory,'GB');
 assert.ok(d.screenings.length>=12);
 for(const x of d.screenings){
   assert.match(x.id,/^[a-z0-9-]+$/);
   assert.match(x.date,/^20\d{2}-\d{2}-\d{2}$/);
   assert.ok(x.title&&x.filmYear>=1900);
   assert.ok(['general','limited'].includes(x.reach));
   assert.ok(['new','re-release'].includes(x.edition));
   assert.match(x.sourceUrl,/^https:\/\//);
   assert.notEqual(x.reach,'all-cinemas');
 }
 assert.ok(d.screenings.some(x=>x.title==='Clayface'&&x.tier==='studio'));
 assert.ok(d.screenings.some(x=>x.filmYear===1973&&x.edition==='re-release'));
 assert.ok(d.screenings.some(x=>x.tier==='independent'&&x.reach==='limited'));
});

test('Cinema editorial diary does not invent a particular day out of a multi-day screening window',async()=>{
 const d=JSON.parse(await readFile(new URL('../data/cinema-screenings.json',import.meta.url),'utf8'));
 assert.equal(d.screenings.some(x=>x.id==='in-the-grip-of-terror-sale-2026'),false);
 assert.ok(d.screenings.some(x=>x.id==='grip-terror-peckham-2026'&&x.date==='2026-11-02'));
});
