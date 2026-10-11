// Integrity check for source-checked streaming horror (not live provider HTTP availability).
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root=new URL('../',import.meta.url);
const now=new Date().toISOString().slice(0,10);
const checkDay=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'') &&
  !Number.isNaN(Date.parse(value+'T00:00:00Z')) &&
  new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const goodUrl=value=>{
  if(typeof value!=='string')return false;
  try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false}
};
export async function auditStreaming(){
  const json=JSON.parse(await readFile(new URL('data/streaming-discovery.json',root),'utf8'));
  const errors=[],seen=new Set(),counts={subscription:0,free:0,'rent-buy':0};
  if(json.schemaVersion!==1||!checkDay(json.checkedAt)||!Array.isArray(json.entries)||json.entries.length<40)
    errors.push('Missing/undersized sourced streaming inventory');
  for(const [i,e] of (json.entries||[]).entries()){
    if(!e||!/^[a-z0-9-]{5,100}$/.test(e.id||'')||seen.has(e.id))errors.push('Missing/duplicate record id at '+i);
    seen.add(e?.id);
    if(typeof e?.title!=='string'||e.title.trim().length<2||e.title.length>180)
      errors.push('Invalid title: '+e?.id);
    if(!Number.isInteger(e?.filmYear)||e.filmYear<1896||e.filmYear>new Date().getUTCFullYear()+2)
      errors.push('Invalid original film year: '+e?.id);
    if(!checkDay(e?.streamDate)||!checkDay(json.checkedAt))
      errors.push('Invalid stream / verified listing date: '+e?.id);
    if(!['subscription','free','rent-buy'].includes(e?.access))
      errors.push('Unknown viewing cost: '+e?.id);
    else counts[e.access]++;
    if(!Array.isArray(e?.countries)||!e.countries.length||e.countries.some(c=>!['GB','US'].includes(c)))
      errors.push('Unknown service territory: '+e?.id);
    if(!['platform-original','platform-exclusive','new-to-platform','digital-premiere','digital-home'].includes(e?.premiereKind))
      errors.push('Unsupported service release classification: '+e?.id);
    if(!e?.platform||!e?.sourceName||!goodUrl(e?.sourceUrl))
      errors.push('Missing/unsafe release source: '+e?.id);
    if(e.watchUrl&&!goodUrl(e.watchUrl))errors.push('Bad watching link: '+e?.id);
    if(e.tmdbId&&(!Number.isInteger(e.tmdbId)||e.tmdbId<1))errors.push('Invalid pinned TMDB ID: '+e?.id);
    if(e.imdbId&&(!/^tt[0-9]{7,10}$/.test(e.imdbId)||
      e.imdbSourceUrl!=='https://www.imdb.com/title/'+e.imdbId+'/'))
      errors.push('Invalid or unsourced IMDb identity: '+e?.id);
    if(e.dateBasis&&!['listed-by','original-platform-premiere'].includes(e.dateBasis))errors.push('Unsupported date semantics: '+e?.id);
    if(e.chartEligible&&!['platform-original','digital-premiere'].includes(e.premiereKind))
      errors.push('Unverified original/digital premiere in streaming mini chart: '+e?.id);
  }
  const inventory=json.entries||[];
  const infirmary=inventory.filter(x=>x.title==='Infirmary'&&x.filmYear===2026&&x.platform==='Shudder');
  if(!infirmary.some(x=>x.access==='subscription'&&x.countries.includes('GB')&&x.streamDate==='2026-10-02'&&x.premiereKind==='platform-original'))
    errors.push('Infirmary 2026 Shudder UK Original is missing or misclassified');
  if(!inventory.some(x=>x.title==='Buzzkill'&&x.access==='free'&&x.countries.includes('GB')))
    errors.push('UK ad-supported Tubi original missing');
  if(!inventory.some(x=>x.access==='rent-buy'&&x.countries.includes('GB')))
    errors.push('Verified UK rent/buy film missing');
  const shifted=inventory.filter(x=>x.filmYear<2025 && x.streamDate.startsWith('2026-10'));
  if(!shifted.length)errors.push('No older-film new-arrival distinction to test');
  if(!inventory.some(x=>x.filmYear===2025&&x.streamDate.startsWith('2026')))
    errors.push('Missing original-year vs streaming-year distinction');
  if(inventory.some(x=>x.access==='free'&&x.platform==='Shudder'))
    errors.push('Shudder subscription must never be described as free');
  const archiveJS=await readFile(new URL('horror-archive.js',root),'utf8');
  const detailJS=await readFile(new URL('archive-film.js',root),'utf8');
  const streamed=await readFile(new URL('straight-to-stream.js',root),'utf8');
  const movies=await readFile(new URL('movies.html',root),'utf8');
  const preview=await readFile(new URL('scripts/build-preview.mjs',root),'utf8');
  const prod=await readFile(new URL('scripts/build-production.mjs',root),'utf8');
  if(!movies.includes('id="straight-to-stream"')||!movies.includes('src="/straight-to-stream.js"'))
    errors.push('Straight to Stream is not navigable from Movies');
  if(!streamed.includes("'data/streaming-discovery.json'")&&!streamed.includes("'/data/streaming-discovery.json'"))
    errors.push('Streaming feed is not loaded by its new section');
  if(!archiveJS.includes('addStreamingSupplement')||!archiveJS.includes('e.filmYear')||
    !detailJS.includes("manual:stream-"))
    errors.push('Archive/detail path does not preserve original streaming film years');
  for(const [label,source] of [['preview',preview],['production',prod]]){
    if(!source.includes("'straight-to-stream.js'")||!source.includes("'data/streaming-discovery.json'"))
      errors.push('Streaming assets missing from '+label+' release bundle');
  }
  return {checkedAt:now,records:inventory.length,sourceEntries:seen.size,accessBreakdown:counts,
    filmYears:[...new Set(inventory.map(x=>x.filmYear))].sort((a,b)=>a-b),
    countries:[...new Set(inventory.flatMap(x=>x.countries))].sort(),
    errors,scope:'Every streaming inventory record is source/provenance and schema-checked; live provider/rights endpoints are not guaranteed.'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const report=await auditStreaming();
  console.log('Straight to Stream audit:',report.records+' source listings, '+JSON.stringify(report.accessBreakdown),'errors:',report.errors.length);
  if(report.errors.length){console.error(report.errors.join('\n'));process.exitCode=1;}
}
