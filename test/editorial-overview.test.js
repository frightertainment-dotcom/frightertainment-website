import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const root=new URL('../',import.meta.url);
test('Editorial movie source summaries are unique, substantial and traceable',async()=>{
 const raw=JSON.parse(await readFile(new URL('data/movie-editorial-overviews.json',root),'utf8'));
 assert.ok(raw.items.length>=14,'At least fourteen checked film candidates prevent short rotation');
 const seen=new Set();
 for(const row of raw.items){
  assert.match(row.id,/^[a-z0-9-]+$/);
  assert.ok(!seen.has(row.id),'Duplicate editorial movie: '+row.id); seen.add(row.id);
  assert.ok(row.description.length>100,'Plot description should not be generic: '+row.id);
  assert.match(row.sourceUrl,/^https:\/\//);
  assert.ok(!/Explore its sourced details|Lorem ipsum|Coming soon/i.test(row.description));
 }
});
