import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { londonDayIndex, selectEditorialPick } from '../editorial-spotlight.mjs';
const root=new URL('../', import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');
test('London calendar day index changes at local midnight through DST',()=>{
 assert.equal(londonDayIndex('2026-10-25T23:59:00Z')+1,londonDayIndex('2026-10-26T00:00:00Z'));
 assert.equal(londonDayIndex('2026-03-29T22:59:59Z')+1,londonDayIndex('2026-03-29T23:00:00Z'));
});
test('Daily editorial rotation is stable in same day and differs on next day',()=>{
 const pool=Array.from({length:20},(_,i)=>({id:'title-'+i,title:'Film '+i,sourceUrl:'https://example.com/'+i}));
 const a=selectEditorialPick(pool,100,2),b=selectEditorialPick(pool,100,2),c=selectEditorialPick(pool,101,2);
 assert.equal(a.item.id,b.item.id);assert.notEqual(a.item.id,c.item.id);
 assert.notEqual(a.item.id,selectEditorialPick(pool,102,2).item.id);
});
test('Owner overrides only eligible published items',()=>{
 const pool=[{id:'approved',title:'Approved title',sourceUrl:'https://example.com'}];
 assert.equal(selectEditorialPick(pool,100,0,'approved').overridden,true);
 assert.equal(selectEditorialPick(pool,100,0,'unknown').overridden,false);
 assert.equal(selectEditorialPick([{id:'blank',title:'',sourceUrl:''}],100),null);
});
test('Actual section-title logo assets and editorial module both retained',async()=>{
 for(const path of ['movies.html','tv-shows.html','indie-movies.html','podcasts.html','games.html']){
  const h=await read(path);
  assert.match(h,/page-title-(?:movies|tv-shows|indie-movies|podcasts|games)\.png/,path);
  assert.match(h,/editorial-spotlight\.mjs/,path);
  assert.match(h,/cinematic-redesign\.css/,path);
  assert.match(h,/editorial-spotlight\.css/,path);
 }
 assert.match(await read('index.html'),/frightertainment-brand\.png/);
});
test('Public and preview builds include the vetted editorial asset and data files',async()=>{
 for(const path of ['scripts/build-preview.mjs','scripts/build-production.mjs']){
  const s=await read(path);
  for(const token of ['editorial-spotlight.mjs','editorial-spotlight.css','cinematic-redesign.css','data/editorial.json','data/editorial-spotlight-overrides.json'])assert.ok(s.includes(token),path+' missing '+token);
 }
});
test('Show no fabricated Fright Rating and gate official poster reuse on permission',async()=>{
 const js=await read('editorial-spotlight.mjs');
 assert.match(js,/ratingEvidence\?\.approved === true/);
 assert.match(js,/posterLicenceStatus === 'approved'/);
 assert.match(js,/posterPermissionEvidence/);
});
