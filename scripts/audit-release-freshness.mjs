/* Daily Frightertainment release-source freshness gate.
 * Read-only: flags stale evidence without auto-publishing unverified claims.
 */
import {readFile,appendFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const load=async p=>JSON.parse(await readFile(new URL(p,root),'utf8'));
const strict=process.argv.includes('--strict');
const today=new Date().toISOString().slice(0,10);
const start=Date.parse(today+'T00:00:00Z');
const day=iso=>{
 if(typeof iso!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(iso))return NaN;
 const v=Date.parse(iso+'T00:00:00Z');
 return Number.isFinite(v)&&new Date(v).toISOString().slice(0,10)===iso?v:NaN;
};
const age=iso=>Math.round((start-day(iso))/86400000);
const url=u=>{try{const t=new URL(u);return t.protocol==='https:'&&!t.username&&!t.password}catch{return false}};
const errors=[],warnings=[],fail=s=>errors.push(s),warn=s=>warnings.push(s);
const ledger=await load('data/cinema-screenings.json'),bulletin=await load('data/editorial-releases.json');
if(ledger.schemaVersion!==2||!ledger.territories?.GB?.screenings)fail('GB cinema diary missing or unsupported');
if(!Number.isFinite(day(ledger.checkedAt)))fail('Cinema checkedAt invalid');
else if(age(ledger.checkedAt)>14)fail('Cinema diary review is '+age(ledger.checkedAt)+' days old (>14)');
if(!Number.isFinite(day(bulletin.updatedAt?.slice(0,10))))fail('Release bulletin updatedAt invalid');
else if(age(bulletin.updatedAt.slice(0,10))>21)fail('Release bulletin update is over 21 days old');
let upcomingGB=0,uk2027=0;
for(const [country,v] of Object.entries(ledger.territories||{})){
 const ids=new Set(),events=new Set();
 for(const x of v.screenings||[]){
  const ref=country+': '+x.id;
  if(ids.has(x.id))fail('Duplicate cinema ID: '+ref);ids.add(x.id);
  if(!Number.isFinite(day(x.date)))fail('Invalid date: '+ref);
  if(!url(x.sourceUrl))fail('Invalid source link: '+ref);
  if(!['new','re-release'].includes(x.edition)||!['general','limited','unconfirmed'].includes(x.reach))
   fail('Invalid release type/reach: '+ref);
  if(x.dateConfidence==='disputed'&&!/conflict|disput|differ/i.test(x.note||''))fail('Disputed date lacks caveat: '+ref);
  if(Number.isFinite(day(x.checkedAt||ledger.checkedAt))&&age(x.checkedAt||ledger.checkedAt)>28&&x.date>=today)
   warn('Recheck source of upcoming screening: '+ref);
  const k=[country,x.title.toLowerCase(),x.date,x.edition,(x.venue||'').toLowerCase()].join('|');
  if(events.has(k))fail('Duplicate date/venue record: '+ref);events.add(k);
  if(country==='GB'&&x.date>=today){upcomingGB++;if(x.date.startsWith('2027-'))uk2027++;}
 }
}
if(upcomingGB<3)fail('Fewer than three dated upcoming GB screenings');
if(today<'2027-01-01'&&uk2027<1)fail('No sourced 2027 GB horror entries');
const ids=new Set();
for(const x of bulletin.items||[]){
 if(ids.has(x.id))fail('Duplicate release bulletin ID: '+x.id);ids.add(x.id);
 if(!Number.isFinite(day(x.date))||!Number.isFinite(day(x.checkedAt))||!url(x.sourceUrl))
  fail('Release bulletin invalid date/source: '+x.id);
 if(age(x.checkedAt)>35&&x.date>=today)warn('Upcoming UK streaming notice needs recheck: '+x.title);
}
const resident=(bulletin.items||[]).find(x=>x.id==='cinema-resident-evil-2026');
if(!resident||resident.date!=='2026-09-18'||!resident.sourceUrl.includes('sonypictures.co.uk/'))
 fail('Resident Evil UK date must be Sony-confirmed 18 Sep 2026');
const lines=['# Release-source audit', 'Date: '+today,'Upcoming GB events: '+upcomingGB,
 '2027 GB events: '+uk2027,'Cinema last reviewed: '+ledger.checkedAt,
 'Bulletin updated: '+bulletin.updatedAt,'Errors: '+errors.length+', review notes: '+warnings.length,
 ...errors.map(x=>'- ERROR: '+x),...warnings.map(x=>'- REVIEW: '+x)];
console.log(lines.join('\n'));
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,lines.join('\n')+'\n');
if(strict&&errors.length)process.exitCode=1;
