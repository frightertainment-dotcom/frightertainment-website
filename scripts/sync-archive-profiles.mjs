/**
 * Cumulative CC0 horror film profile enrichment.
 * Reads the existing 9k+ movie identity archive; never resets old profile data.
 * Batches Wikidata Wikibase APIs, honors errors, and uses a deterministic 450-film
 * incremental cursor. Not an IMDb, TMDB, RT or commercial provider importer.
 */
import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const archive=JSON.parse(await readFile(new URL('data/archive/horror-films.json',root),'utf8'));
const target=new URL('data/archive/profiles.json',root);
const cache=JSON.parse(await readFile(target,'utf8'));
if(!cache.records || cache.schemaVersion!==1)throw Error('Profile cache schema mismatch');
const current=new Date().getUTCFullYear();
const all=(archive.films||[]).filter(x=>/^Q[1-9]\d*$/.test(x.qid||''));
const recent=all.filter(x=>x.year>=current-1).sort((a,b)=>b.year-a.year||a.qid.localeCompare(b.qid));
const older=all.filter(x=>x.year<current-1).sort((a,b)=>b.year-a.year||a.qid.localeCompare(b.qid));
const pending=[...recent.filter(x=>!cache.records[x.qid]),...older.filter(x=>!cache.records[x.qid])].slice(0,450);
if(!pending.length){console.log('All historical profiles already enriched');process.exit(0);}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const endpoint='https://www.wikidata.org/w/api.php';
const userAgent='FrightertainmentArchiveProfiles/0.1 (frightertainment@gmail.com; CC0 item metadata; weekly batch)';
async function getEntities(ids,props='labels|descriptions|claims'){
  const results={};
  for(let start=0;start<ids.length;start+=40){
    const batch=ids.slice(start,start+40);
    const url=new URL(endpoint);
    url.searchParams.set('action','wbgetentities');
    url.searchParams.set('ids',batch.join('|'));
    url.searchParams.set('props',props);
    url.searchParams.set('languages','en');
    url.searchParams.set('format','json');
    let json, failure;
    for(let attempt=0;attempt<3;attempt++){
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),35_000);
      try{
        const response=await fetch(url,{headers:{accept:'application/json','user-agent':userAgent},signal:controller.signal});
        if(!response.ok)throw Error('Wikidata HTTP '+response.status);
        json=await response.json();
        if(!json?.entities||json.error)throw Error('Wikidata malformed entity response');
        break;
      }catch(error){failure=error;await wait(2600*(attempt+1));}
      finally{clearTimeout(timer);}
    }
    if(!json)throw Error('Cannot verify profile batch: '+String(failure));
    Object.assign(results,json.entities);
    await wait(1500);
  }
  return results;
}
const idProp=(entity,prop,limit=6)=>[...(entity?.claims?.[prop]||[])]
  .filter(x=>x.rank!=='deprecated')
  .map(x=>x.mainsnak?.datavalue?.value?.id)
  .filter(x=>/^Q[1-9]\d*$/.test(x||'')).slice(0,limit);
const entities=await getEntities(pending.map(x=>x.qid));
const ids=new Set();
for(const entity of Object.values(entities)){
  for(const prop of ['P57','P161','P136','P495'])for(const id of idProp(entity,prop))ids.add(id);
}
const labels=await getEntities([...ids],'labels');
const enLabel=id=>labels[id]?.labels?.en?.value || '';
const toPeople=(entity,prop,limit)=>idProp(entity,prop,limit)
 .map(id=>({name:enLabel(id),qid:id}))
 .filter(x=>x.name&&!/^Q\d+$/.test(x.name)).slice(0,limit);
const generated={};const checked=new Date().toISOString().slice(0,10);
for(const film of pending){
  const entity=entities[film.qid];
  if(!entity||entity.missing!==undefined)continue;
  const description=entity.descriptions?.en?.value;
  const directors=toPeople(entity,'P57',4);
  const cast=toPeople(entity,'P161',5);
  const genres=toPeople(entity,'P136',4);
  const countries=toPeople(entity,'P495',3);
  const minutes=(entity.claims?.P2047||[]).map(x=>Number(x.mainsnak?.datavalue?.value?.amount))
    .find(n=>Number.isFinite(n)&&n>=1&&n<=500) || null;
  const item={
    qid:film.qid,title:film.title,year:film.year,
    ...(description&&description.length<=350 ? {description}:{}),
    ...(directors.length?{directors}:{}),
    ...(cast.length?{cast}:{}),
    ...(genres.length?{genres}:{}),
    ...(countries.length?{countries}:{}),
    ...(minutes?{runtimeMinutes:Math.round(minutes)}:{}),
    sourceUrl:'https://www.wikidata.org/wiki/'+film.qid,
    checkedAt:checked
  };
  generated[film.qid]=item;
}
if(!Object.keys(generated).length)throw Error('No valid source-profile records returned; refusing to overwrite cache');
cache.records={...cache.records,...generated};
cache.updatedAt=new Date().toISOString();
cache.lastSync={requested:pending.length,enriched:Object.keys(generated).length,total:Object.keys(cache.records).length};
await writeFile(target,JSON.stringify(cache,null,2)+'\n');
console.log('Cumulative CC0 film profiles enriched:',JSON.stringify(cache.lastSync));
