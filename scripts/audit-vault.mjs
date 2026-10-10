import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root=new URL('../',import.meta.url);
const nowYear=new Date().getUTCFullYear();
const qid=/^Q[1-9]\d*$/, imdb=/^tt\d{7,10}$/, dated=/^\d{4}-\d{2}-\d{2}$/;
const secureUrl=value=>{
  if(typeof value!=='string')return false;
  try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!!u.hostname;}catch{return false;}
};
export async function auditVault(){
  const [snapshot,profileCache,filmSource]=await Promise.all([
    readFile(new URL('data/archive/horror-films.json',root),'utf8').then(JSON.parse),
    readFile(new URL('data/archive/profiles.json',root),'utf8').then(JSON.parse),
    readFile(new URL('data/movies.js',root),'utf8')
  ]);
  const ctx={window:{}};runInNewContext(filmSource,ctx,{timeout:5000});
  const manualFilms=Array.isArray(ctx.window.FR_MOVIES)?ctx.window.FR_MOVIES:[];
  const errors=[],warnings=[],records=[],seenQids=new Set(),yearTitles=new Map(),imdbRefs=new Map();
  const tally={sourceRows:0,excluded:0,validIMDB:0,withoutIMDB:0,archivedPosterPaths:0,archivedTrailerIds:0,manualSourceLinks:0,firstPartySources:0,firstPartyTrailers:0,firstPartyLicensedPosters:0};
  const archiveFilms=Array.isArray(snapshot.films)?snapshot.films:[];
  if(snapshot.schemaVersion!==1||!Array.isArray(snapshot.films)||!Array.isArray(snapshot.manual))
    errors.push('Missing/invalid full archive snapshot schema');
  if(archiveFilms.length<9772)errors.push('Archive record count has unexpectedly decreased below the known 9,772 record baseline');
  for(const [index,film] of archiveFilms.entries()){
    const id=film?.qid,title=film?.title,year=film?.year;
    if(!qid.test(id||''))errors.push('Invalid QID at record '+index);
    if(typeof title!=='string'||title.trim().length<2||title.length>240)errors.push('Invalid title for '+id);
    if(!Number.isInteger(year)||year<1896||year>nowYear+2)errors.push('Invalid film year for '+id);
    if(seenQids.has(id))errors.push('Duplicate Wikidata QID '+id);
    seenQids.add(id);
    if(typeof film?.source!=='string'||!film.source.includes('Wikidata'))errors.push('Missing Wikidata provenance for '+id);
    if(film.excludedFromMovieArchive)tally.excluded++;
    if(film.imdbId){
      if(!imdb.test(film.imdbId))errors.push('Malformed IMDb ID for '+id);
      else{tally.validIMDB++;const ids=imdbRefs.get(film.imdbId)||[];ids.push(id);imdbRefs.set(film.imdbId,ids);}
    }else tally.withoutIMDB++;
    if(film.poster||film.posterPath||film.posterUrl)tally.archivedPosterPaths++;
    if(film.trailer||film.trailerVideoId)tally.archivedTrailerIds++;
    const group=String(year)+'|'+String(title||'').trim().toLocaleLowerCase('en-GB');
    const dupe=yearTitles.get(group)||[];dupe.push(id);yearTitles.set(group,dupe);
    const sourceUrl='https://www.wikidata.org/wiki/'+id;
    if(!secureUrl(sourceUrl))errors.push('Unconstructable canonical Wikidata source URL '+id);
    tally.sourceRows++;
    records.push({qid:id,title,year,excluded:!!film.excludedFromMovieArchive,
      internalDetailUrl:'/archive-film.html?id='+encodeURIComponent(id),
      wikidataSourceUrl:sourceUrl,
      imdbId:imdb.test(film.imdbId||'')?film.imdbId:null,
      posterStatus:film.poster||film.posterPath?'recorded-in-snapshot':'tmdb-on-demand-not-http-verified',
      officialTrailerStatus:film.trailer?'recorded-in-snapshot':'not-stored-in-snapshot',
      originalSourceLiveHttpVerified:false});
  }
  const duplicateImdb=[...imdbRefs].filter(([,ids])=>ids.length>1).map(([imdbId,qids])=>({imdbId,qids}));
  const duplicateTitleYears=[...yearTitles].filter(([,ids])=>ids.length>1).map(([key,qids])=>({titleYear:key,qids}));
  if(duplicateImdb.length)warnings.push(duplicateImdb.length+' IMDb identifier collision(s) detected. The site suppresses ambiguous IMDb matches.');
  if(duplicateTitleYears.length)warnings.push(duplicateTitleYears.length+' matching title/year pairs may be remakes, alternate Wikidata entries or genuine duplicates; editorial review recommended.');
  const manualRows=[];
  for(const row of snapshot.manual||[]){
    if(!/^(?:manual:[a-z0-9-]+|wd:Q[1-9]\d*)$/.test(row.id||'')||typeof row.title!=='string'||
       !Number.isInteger(row.year)||row.year<1896||row.year>nowYear||!secureUrl(row.url))
      errors.push('Invalid manually verified source '+String(row.id));
    manualRows.push({id:row.id,title:row.title,year:row.year,url:row.url,urlSyntaxChecked:secureUrl(row.url),externalHttpChecked:false});
    tally.manualSourceLinks++;
  }
  const profileRecords=profileCache?.records&&typeof profileCache.records==='object'?profileCache.records:{};
  let validProfiles=0;
  for(const [key,profile]of Object.entries(profileRecords)){
    if(!qid.test(key)||!seenQids.has(key)||profile.qid!==key||
       profile.sourceUrl!=='https://www.wikidata.org/wiki/'+key){
      errors.push('Unmatched/incorrect profile source '+key);
    }else validProfiles++;
  }
  const firstParty=[];
  for(const movie of manualFilms){
    let claims=0;
    for(const claim of movie.claims||[]){
      if(!secureUrl(claim.source))errors.push('Missing/unsafe first-party evidence '+movie.id);
      else{claims++;tally.firstPartySources++;}
    }
    const trailer=movie.trailer||null;
    if(trailer){
      if(!/^[A-Za-z0-9_-]{11}$/.test(trailer.videoId||'')||!secureUrl(trailer.source))
        errors.push('Invalid first-party official trailer proof '+movie.id);
      else tally.firstPartyTrailers++;
    }
    if(movie.poster){
      if(movie.posterLicenceStatus!=='approved'||!secureUrl(movie.poster)||!secureUrl(movie.posterPermissionEvidence))
        errors.push('Missing poster reuse permission '+movie.id);
      else tally.firstPartyLicensedPosters++;
    }
    firstParty.push({id:movie.id,title:movie.title,editorialStatus:movie.editorialStatus,
      internalDetailUrl:'/films/'+encodeURIComponent(movie.id)+'/',
      structurallyValidSourceClaims:claims,
      officialTrailerId:trailer?.videoId||null,
      licensedLocalPoster:!!(movie.poster&&movie.posterLicenceStatus==='approved')});
  }
  for(const relative of ['all-horror-movies.html','archive-film.html','horror-archive.js','archive-film.js','media-ui.js']){
    try{await access(new URL(relative,root));}catch{errors.push('Required internal archive route or client asset missing: '+relative);}
  }
  const report={
    generatedAt:new Date().toISOString(),
    scope:'All archive rows and first-party curated film metadata; structural/source-provenance checks, not remote HTTP verification',
    summary:{archiveRecords:archiveFilms.length,archivedEligible:archiveFilms.length-tally.excluded,
      excludedRecords:tally.excluded,manualArchiveRecords:manualRows.length,
      uniqueWikidataQids:seenQids.size,syntacticallyVerifiableWikidataSourceLinks:tally.sourceRows,
      externallyFetchedSourcePages:0,validImdbIds:tally.validIMDB,missingImdbIds:tally.withoutIMDB,
      ambiguousImdbIds:duplicateImdb.length,duplicateTitleYearGroups:duplicateTitleYears.length,
      archivedStoredPosters:tally.archivedPosterPaths,archivedStoredOfficialTrailers:tally.archivedTrailerIds,
      linkedHistoricalProfiles:validProfiles,curatedFilmFiles:firstParty.length,
      curatedClaimSources:tally.firstPartySources,
      curatedSourcedOfficialVideoIds:tally.firstPartyTrailers,
      curatedLicensedLocalPosters:tally.firstPartyLicensedPosters},
    evidenceStatus:{internalDetailRoutes:'all archive link patterns verified locally; runtime checked separately in browser QA',
      externalSourceReachability:'not verified for all external Wikidata/IMDb/publisher pages',
      tmdbImageAvailability:'not verified for all 9,772; TMDB lookup only for exact on-demand matches',
      officialTrailerAvailability:'not guaranteed; titles without official matched trailers intentionally show no button',
      mediaCopyright:'archive QID/IMDb IDs do not grant poster/trailer rights'},
    warnings,errors,duplicateImdb,duplicateTitleYears:duplicateTitleYears.slice(0,100),
    manualSourceInventory:manualRows,curated: firstParty,
    records
  };
  return report;
}
export async function writeAudit(){
  const report=await auditVault();
  const dir=new URL('test-results/',root);
  await mkdir(dir,{recursive:true});
  await writeFile(new URL('vault-audit.json',dir),JSON.stringify(report,null,2)+'\n');
  const s=report.summary;
  const md=[
    '# Frightertainment full Horror Vault integrity audit',
    '',
    'Generated: '+report.generatedAt,
    '',
    '**Scope:** audited '+s.archiveRecords.toLocaleString('en-GB')+' source archive entries and '+s.curatedFilmFiles+' first-party film files.',
    '',
    '| Check | Result |','| --- | ---: |',
    ...Object.entries(s).map(([key,val])=>'| '+key+' | '+val.toLocaleString('en-GB')+' |'),
    '',
    '**Scope limitation:** An exact Wikidata QID generates a well-formed source URL but is not proof that a remote page was reachable at audit time. TMDB posters and YouTube trailers are supplied on demand, and the base Wikidata file stores neither; these are not advertised as 9,772 independently verified assets.',
    '',
    '## Issues and flags',
    'Structural errors: '+report.errors.length,
    ...report.errors.slice(0,30).map(x=>'- ERROR: '+x),
    ...report.warnings.map(x=>'- REVIEW: '+x),
    '',
    'The complete per-record source and media-availability manifest is in vault-audit.json. Neither report is copied into the public website.',
    ''
  ].join('\n');
  await writeFile(new URL('vault-audit.md',dir),md);
  console.log('Horror Vault full scan: '+s.archiveRecords+' records, '+s.uniqueWikidataQids+' unique source IDs, '+
    s.validImdbIds+' IMDb IDs, '+s.linkedHistoricalProfiles+' profile records, '+
    s.ambiguousImdbIds+' ambiguous IMDb ID groups, '+report.errors.length+' structural errors.');
  console.log('Media audit: base archive '+s.archivedStoredPosters+' saved posters, '+
    s.archivedStoredOfficialTrailers+' saved official trailers; optional on-demand TMDB matching is NOT exhaustively live-verified.');
  if(report.errors.length)process.exitCode=1;
  return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await writeAudit();
