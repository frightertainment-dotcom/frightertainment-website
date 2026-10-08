/* Refresh the historical HORROR catalogue from CC0 Wikidata statements.
 * Search only: film genre = Q200092, original release date (P577), optional IMDb ID.
 * Append/update by Wikidata QID; NEVER delete old records on missing fresh results.
 * No scraping IMDb/RT, no downloaded posters, no streaming availability assertions.
 * Run by GH Actions with a polite bot User-Agent or locally on demand.
 */
import {readFile,writeFile} from 'node:fs/promises';
const target=new URL('../data/archive/horror-films.json',import.meta.url);
const archive=JSON.parse(await readFile(target,'utf8'));
const currentYear=new Date().getUTCFullYear();
const lastExclusive=currentYear+1;
const windows=[[1896,1920],[1920,1940],[1940,1960],[1960,1980],[1980,1990],[1990,2000],
  [2000,2010],[2010,2015],[2015,2020],[2020,2023],[2023,lastExclusive]]
  .filter(([start])=>start<lastExclusive).map(([start,end])=>[start,Math.min(lastExclusive,Math.max(start+1,end))]);
const existing=new Map((archive.films||[]).filter(x=>/^Q[1-9][0-9]*$/.test(x.qid||'')).map(x=>[x.qid,x]));
const detected=new Map();
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const userAgent='FrightertainmentHorrorArchive/0.1 (frightertainment@gmail.com; CC0 film metadata, weekly rate-limited sync)';
const q=([start,end])=>`PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT ?film ?date (SAMPLE(?enTitle) AS ?title) (SAMPLE(?imdb) AS ?imdbId)
WHERE {
  ?film wdt:P136 wd:Q200092 ; wdt:P577 ?date .
  FILTER(?date >= "${start}-01-01T00:00:00Z"^^xsd:dateTime &&
         ?date < "${end}-01-01T00:00:00Z"^^xsd:dateTime)
  OPTIONAL { ?film rdfs:label ?enTitle . FILTER(LANG(?enTitle) = "en") }
  OPTIONAL { ?film wdt:P345 ?imdb }
}
GROUP BY ?film ?date LIMIT 10000`;
const endpoint='https://query.wikidata.org/sparql';
async function getWindow(interval){
  const url=new URL(endpoint);url.searchParams.set('query',q(interval));url.searchParams.set('format','json');
  let failure;
  for(let attempt=0;attempt<3;attempt++){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),55_000);
    try{
      const response=await fetch(url,{headers:{'user-agent':userAgent,accept:'application/sparql-results+json','accept-encoding':'gzip, deflate'},signal:controller.signal});
      if(response.ok){
        const body=await response.json();
        if(!Array.isArray(body?.results?.bindings))throw Error('Unexpected response JSON');
        if(body.results.bindings.length>=10000)throw Error('Query limit exceeded: subdivide years before safe import');
        return body.results.bindings;
      }
      failure=Error('Wikidata query HTTP '+response.status);
      if(![429,500,502,503,504].includes(response.status))break;
      const retry=Number(response.headers.get('retry-after'));
      await delay(Number.isFinite(retry)&&retry>0 ? Math.min(60_000,retry*1000):6_000*(attempt+1));
    }catch(error){failure=error;await delay(5_000*(attempt+1));}
    finally{clearTimeout(timer);}
  }
  throw failure||Error('Failed to refresh interval '+interval.join('-'));
}
let completed=0,seen=0;
for(const interval of windows){
  const rows=await getWindow(interval);
  for(const x of rows){
    const qid=x.film?.value?.match(/\/entity\/(Q[1-9]\d*)$/)?.[1];
    const title=x.title?.value?.trim();
    const year=Number(x.date?.value?.slice(0,4));
    if(!qid||!title||title.length<2||title.length>240||!Number.isInteger(year)||year<1896||year>currentYear)continue;
    const id=x.imdbId?.value;
    const imdbId=/^tt\d{7,10}$/.test(id||'')?id:null;
    const candidate={qid,title,year,...(imdbId?{imdbId}:{}),source:'Wikidata P136=Q200092; P577 original date; P345 IMDb ID'};
    const old=detected.get(qid);
    if(!old||candidate.year<old.year||(candidate.year===old.year&&candidate.imdbId&&!old.imdbId))detected.set(qid,candidate);
  }
  completed++;seen+=rows.length;
  console.log('Wikidata '+interval.join('–')+': '+rows.length+' rows, '+detected.size+' unique horror titles so far');
  await delay(1800);
}
if(completed!==windows.length||detected.size<100)throw Error('Insufficient complete response; refusing to publish incomplete archive snapshot');
let added=0,corrected=0;
for(const [qid,item] of detected){
  const old=existing.get(qid);
  if(!old){existing.set(qid,item);added++;continue;}
  // Keep original entry and IMDb link unless an additional reliable field appears.
  // If an earlier P577 film release date is found, move to the corrected original year.
  if(item.year<old.year){old.year=item.year;corrected++;}
  if(!old.imdbId&&item.imdbId)old.imdbId=item.imdbId;
  if(!old.title||/^Q\d+$/.test(old.title))old.title=item.title;
}
const films=[...existing.values()].sort((a,b)=>a.year-b.year||a.title.localeCompare(b.title,'en',{sensitivity:'base'})||a.qid.localeCompare(b.qid));
archive.films=films;
archive.schemaVersion=1;
archive.updatedAt=new Date().toISOString();
archive.source='Wikidata CC0 structured data';
archive.sourceUrl='https://www.wikidata.org/wiki/Wikidata:Licensing';
archive.coverage='Known Wikidata horror-film genre records with published date and English label; not every global cinema, VOD or direct-to-video film';
archive.lastSync={windows:completed,rowsFetched:seen,matched:detected.size,added,corrected,total:films.length};
await writeFile(target,JSON.stringify(archive,null,2)+'\n');
console.log('Archive sync completed:',JSON.stringify(archive.lastSync));
