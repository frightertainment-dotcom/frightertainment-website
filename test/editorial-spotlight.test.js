import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { londonDayIndex, selectEditorialPick, buildEditorialCarousel, matchedMedia, artHasRights, filmMediaIdentities } from '../editorial-spotlight.mjs';
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
  assert.match(h,/fr-design-system\.css/,path);
  assert.match(h,/fr-page-themes\.css/,path);
  assert.match(h,/editorial-spotlight\.css/,path);
 }
 assert.match(await read('index.html'),/frightertainment-brand\.png/);
});
test('Public and preview builds include the vetted editorial asset and data files',async()=>{
 for(const path of ['scripts/build-preview.mjs','scripts/build-production.mjs']){
  const s=await read(path);
  for(const token of ['editorial-spotlight.mjs','editorial-spotlight.css','fr-design-system.css','fr-page-themes.css','fr-rating-badge.js','data/editorial.json','data/editorial-spotlight-overrides.json'])assert.ok(s.includes(token),path+' missing '+token);
 }
});
test('Only exact TMDB media identities receive audience badges; direct poster reuse needs permission',async()=>{
 const js=await read('editorial-spotlight.mjs');
 assert.match(js,/if \(item\.mediaIdentity && \['movie','tv'\]/);
 assert.match(js,/matchedMedia\(item, media\)/);
 assert.match(js,/FRRatingBadge\.fromTmdbMedia\(media/);
 assert.match(js,/posterLicenceStatus === 'approved'/);
 assert.match(js,/posterPermissionEvidence/);
});

test('Carousel uses all eligible entries once; an approved owner nomination leads',()=>{
 const pool=Array.from({length:6},(_,i)=>({id:'film-'+i,title:'Film '+i,sourceUrl:'https://example.com/'+i}));
 const today=buildEditorialCarousel(pool,100,2);
 assert.equal(today.slides.length,5);
 assert.equal(new Set(today.slides.map(s=>s.id)).size,5);
 assert.equal(today.slides[0].id,selectEditorialPick(pool,100,2).item.id);
 const nominated=buildEditorialCarousel(pool,100,2,'film-4');
 assert.equal(nominated.overridden,true);
 assert.equal(nominated.slides[0].id,'film-4');
 assert.equal(nominated.slides.length,5);
 const unknown=buildEditorialCarousel(pool,100,2,'not-a-film');
 assert.equal(unknown.overridden,false);
 assert.equal(unknown.slides[0].id,today.slides[0].id);
 assert.deepEqual(buildEditorialCarousel([],100).slides,[]);
});
test('Pinned poster identity rejects a remake, a title collision and a different TMDB film',()=>{
 const item={title:'Heretic',year:2024,mediaIdentity:filmMediaIdentities.heretic};
 const exact={type:'movie',tmdbId:1138194,title:'Heretic',firstReleaseDate:'2024-11-08',
   sourceUrl:'https://www.themoviedb.org/movie/1138194',posterPath:'/official.jpg'};
 assert.equal(matchedMedia(item,exact),true);
 assert.equal(matchedMedia(item,{...exact,firstReleaseDate:'2018-01-01'}),false);
 assert.equal(matchedMedia(item,{...exact,title:'The Heretic'}),false);
 assert.equal(matchedMedia(item,{...exact,tmdbId:502716,sourceUrl:'https://www.themoviedb.org/movie/502716'}),false);
 assert.equal(matchedMedia(item,{...exact,posterPath:'https://unapproved.example/poster.jpg'}),false);
});
test('A direct promotional poster requires documented rights, source and scope',()=>{
 const good={poster:'https://studio.example/poster.jpg',posterLicenceStatus:'approved',
  posterCredit:'Studio',posterPermission:'Written promotional use',posterUsageScope:'website spotlight',
  posterSourcePage:'https://studio.example/film',posterPermissionEvidence:'https://studio.example/permission'};
 assert.equal(artHasRights(good),true);
 assert.equal(artHasRights({...good,posterPermissionEvidence:''}),false);
 assert.equal(artHasRights({...good,posterUsageScope:''}),false);
 assert.equal(artHasRights({...good,posterLicenceStatus:'pending'}),false);
});
