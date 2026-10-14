import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const sourceUrl = new URL('../data/cinema-screenings.json',import.meta.url);
const jsUrl = new URL('../cinema-diary.js',import.meta.url);
const territories=['GB','US','CA','AU','IE'];
const nextDay = offset => new Date(Date.now()+offset*86400000).toISOString().slice(0,10);

async function api(){
 const window={};
 runInNewContext(await readFile(jsUrl,'utf8'),{window,URL,Date,Intl});
 return window.FR_CINEMA_DIARY;
}

test('Cinema diary has evidence-backed, individually dated releases for every country',async()=>{
 const d=JSON.parse(await readFile(sourceUrl,'utf8'));
 assert.equal(d.schemaVersion,2);
 assert.equal(d.checkedAt,'2026-10-11');
 assert.deepEqual(Object.keys(d.territories).sort(),territories.slice().sort());
 assert.ok(d.territories.GB.screenings.length>=12);
 for(const country of territories){
   const x=d.territories[country];
   assert.ok(x.screenings.length>0, country+' has no verified screenings');
   for(const row of x.screenings){
     assert.match(row.id,/^[a-z0-9-]+$/);
     assert.match(row.date,/^20\d{2}-\d{2}-\d{2}$/);
     assert.ok(row.title&&row.filmYear>=1900);
     assert.ok(['general','limited'].includes(row.reach));
     assert.ok(['new','re-release'].includes(row.edition));
     assert.ok(['studio','special','independent'].includes(row.tier));
     assert.match(row.sourceUrl,/^https:\/\//);
     assert.notEqual(row.reach,'all-cinemas');
   }
 }
 assert.ok(d.territories.US.screenings.some(x=>x.title==='Clayface'&&x.date==='2026-10-23'));
 assert.ok(d.territories.CA.screenings.some(x=>x.title==='Clayface'&&x.date==='2026-10-23'));
 assert.ok(d.territories.AU.screenings.some(x=>x.title==='Clayface'&&x.date==='2026-10-22'));
 assert.ok(d.territories.IE.screenings.some(x=>x.title==='The Devils'&&x.edition==='re-release'));
 assert.ok(d.territories.GB.screenings.some(x=>x.id==='grip-terror-peckham-2026'));
 assert.equal(d.territories.GB.screenings.some(x=>x.id==='in-the-grip-of-terror-sale-2026'),false);
});

test('Only the selected country diary is used; no UK dates are reused abroad',async()=>{
 const diary=await api();
 const tomorrow=nextDay(1);
 const row={id:'region-test',title:'Regional Test',filmYear:2026,date:tomorrow,
  edition:'new',reach:'limited',tier:'independent',sourceUrl:'https://example.com/screening'};
 const ledger={schemaVersion:2,territories:{GB:{screenings:[row]},US:{screenings:[{...row,id:'us-test',title:'US Only'}]}}};
 assert.equal(diary.merge(ledger,[],'GB').length,1);
 assert.equal(diary.merge(ledger,[],'GB')[0].title,'Regional Test');
 assert.equal(diary.merge(ledger,[],'US').length,1);
 assert.equal(diary.merge(ledger,[],'US')[0].title,'US Only');
 assert.equal(diary.merge(ledger,[],'CA').length,0);
});

test('Already-released titles like Obsession are not mislabelled upcoming; unsourced reissues are suppressed',async()=>{
 const diary=await api();
 const tomorrow=nextDay(2),yesterday=nextDay(-1);
 const reported=[
  {title:'Obsession',filmYear:2026,releaseCountry:'US',theatricalDate:tomorrow,
    firstReleaseDate:yesterday,cinemaReleaseType:3},
  {title:'Old Film Reissue',filmYear:1980,releaseCountry:'US',theatricalDate:tomorrow,
    firstReleaseDate:tomorrow,cinemaReissue:true,cinemaReleaseType:2},
  {title:'Valid New Film',filmYear:2026,releaseCountry:'US',theatricalDate:tomorrow,
    firstReleaseDate:tomorrow,cinemaReleaseType:3}
 ];
 const results=diary.merge({schemaVersion:2,territories:{}},reported,'US');
 assert.equal(results.length,1);
 assert.equal(results[0].title,'Valid New Film');
 assert.equal(results[0].verified,false);
 assert.equal(results[0].edition,'new');
 assert.equal(diary.merge({schemaVersion:2,territories:{}},reported,'GB').length,0);
});

test('Source-backed re-releases can be listed explicitly, while past dates expire automatically',async()=>{
 const diary=await api(),tomorrow=nextDay(1),yesterday=nextDay(-1);
 const item={id:'classic-returns',title:'Classic Horror',filmYear:1973,date:tomorrow,
  edition:'re-release',reach:'limited',tier:'special',sourceUrl:'https://example.com/event'};
 const ledger={schemaVersion:2,territories:{IE:{screenings:[{...item,date:yesterday},item]}}};
 const rows=diary.merge(ledger,[],'IE');
 assert.equal(rows.length,1);
 assert.equal(rows[0].edition,'re-release');
 assert.equal(rows[0].verified,true);
});
