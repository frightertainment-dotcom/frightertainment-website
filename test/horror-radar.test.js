import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const data=JSON.parse(await readFile(new URL('data/horror-radar.json',root),'utf8'));
const b=JSON.parse(await readFile(new URL('data/editorial-releases.json',root),'utf8'));
const date=x=>/^\d{4}-\d{2}-\d{2}$/.test(x||'')&&
 Number.isFinite(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
test('Radar stories have individually source-checked dates and country/provider attribution',()=>{
 assert.equal(data.schemaVersion,1);assert.ok(date(data.checkedAt));assert.ok(data.items.length>=14);
 const ids=new Set();for(const x of data.items){
  assert(!ids.has(x.id));ids.add(x.id);
  assert.match(x.id,/^[a-z0-9-]+$/);
  assert.ok(['tv','game','podcast','vod','streaming'].includes(x.category));
  assert.ok(['GB','GLOBAL'].includes(x.country));
  assert.ok(x.title&&x.summary&&x.channel);
  assert.ok(date(x.checkedAt));
  if(x.date===null)assert.ok(['provider-spotlight','announced-undated','available-now'].includes(x.status));
  else assert.ok(date(x.date));
  assert.match(x.sourceUrl,/^https:\/\/[^\/]+/);
  assert.equal(x.rating,undefined);assert.equal(x.poster,undefined);
 }
});
test('Premieres, platforms and undated UK digital rentals stay separate',()=>{
 assert(data.items.some(x=>x.category==='tv'&&x.title==='Carrie'&&x.date==='2026-10-07'&&x.channel==='Prime Video UK'));
 assert(data.items.some(x=>x.category==='game'&&x.title==='Until Dawn 2'&&x.date==='2027-01-28'));
 assert(data.items.some(x=>x.category==='podcast'&&x.title==='Heart'&&x.date==='2026-10-19'));
 assert(data.items.some(x=>x.category==='vod'&&x.date===null));
 assert(data.items.some(x=>x.category==='streaming'&&x.date===null));
 for(const id of ['prime-insidious-further-digital','disney-ready-or-not-2-uk','disney-predator-badlands-uk'])
  assert.equal(data.items.find(x=>x.id===id)?.status,'available-now','Source-confirmed current UK availability must not appear as Date TBC');
 assert.equal(data.items.find(x=>x.id==='prime-practical-magic2-digital')?.status,'announced-undated','Keep unsupported UK date claims unconfirmed');
 const p=b.items.filter(x=>x.category==='streaming').map(x=>x.service);
 assert(p.includes('Shudder'));assert(p.includes('Disney+'));
 for(const x of b.items.filter(x=>x.service==='Disney+'))
  assert.equal(x.dateIsSourceCheck,true,'Provider spotlight must not be misrepresented as platform arrival');
});
test('All five new radar landing pages and preview + production bundle include every asset',async()=>{
 const pages=['index.html','movies.html','tv-shows.html','games.html','podcasts.html'];
 for(const page of pages){
  const html=await readFile(new URL(page,root),'utf8');
  for(const expected of ['data-fr-radar=','href="/horror-radar.css"','src="/horror-radar.js"','FR RADAR START'])
   assert(html.includes(expected),page+' missing '+expected);
 }
 for(const script of ['scripts/build-preview.mjs','scripts/build-production.mjs']){
  const content=await readFile(new URL(script,root),'utf8');
  for(const asset of ['horror-radar.css','horror-radar.js','data/horror-radar.json'])
   assert(content.includes(asset),script+' missing '+asset);
 }
});
