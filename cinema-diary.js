/* Frightertainment UK Cinema Diary: month-first source-backed release/screening ledger.
 * Availability dates are editorial evidence, not guaranteed current showtimes.
 */
(() => {
 'use strict';
 const today=()=>new Date().toISOString().slice(0,10);
 const month=date=>date.slice(0,7);
 const pretty=d=>new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(d+'T12:00:00Z'));
 const monthName=d=>new Intl.DateTimeFormat('en-GB',{year:'numeric',month:'long',timeZone:'UTC'}).format(new Date(d.slice(0,7)+'-01T12:00:00Z'));
 const key=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const priority=i=>i.verified===true?(i.tier==='studio'?0:i.tier==='special'?1:2):
   (i.majorProduction===true?3:4);
 const sourceSafe=u=>{try{const a=new URL(u);return a.protocol==='https:'&&!a.username&&!a.password?a.href:null}catch{return null}};
 const validate=e=>e&&/^[a-z0-9-]+$/.test(e.id||'')&&typeof e.title==='string'&&
   /^\d{4}-\d{2}-\d{2}$/.test(e.date||'')&&Number.isInteger(e.filmYear)&&
   ['new','re-release'].includes(e.edition)&&['general','limited','unconfirmed'].includes(e.reach)&&
   ['studio','special','independent'].includes(e.tier)&&sourceSafe(e.sourceUrl);
 const countryNames={GB:'United Kingdom',US:'United States',CA:'Canada',AU:'Australia',IE:'Ireland'};
 function merge(source,tmdb,country='GB'){
   const now=today(),out=[],known=new Set(),knownPremieres=new Set();
   if(!Object.hasOwn(countryNames,country))return out;
   // The source ledger is specific to one territory; never reuse UK dates abroad.
   const curated=source?.schemaVersion===2
     ? source.territories?.[country]?.screenings||[]
     : source?.schemaVersion===1&&source.territory===country ? source.screenings||[] : [];
   for(const e of curated){
     if(!validate(e)||e.date<now)continue;
     const identity=e.date+'|'+key(e.title)+'|'+e.edition+'|'+key(e.venue);
     if(known.has(identity))continue;
     out.push({...e,country,verified:true});known.add(identity);
     if(e.edition==='new')knownPremieres.add(month(e.date)+'|'+key(e.title));
   }
   for(const raw of tmdb||[]){
     const date=raw.theatricalDate;
     if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||date<now)continue;
     if(raw.releaseCountry!==country)continue;
     // TMDB reports release events, not independently verified first theatrical
     // bookings. Previously released films, suspected reissues and movies with
     // unknown first-release history require a linked editorial screening source.
     if(!/^\d{4}-\d{2}-\d{2}$/.test(raw.firstReleaseDate||'')||
       raw.firstReleaseDate<now||raw.cinemaReissue===true||raw.hasPriorLocalCinemaRelease===true)continue;
     const identity=month(date)+'|'+key(raw.title);
     if(knownPremieres.has(identity))continue;
     knownPremieres.add(identity);
     out.push({...raw,date,country,edition:'new',verified:false,
       reach:raw.cinemaReleaseType===2?'limited':'general',
       tier:'unverified',majorProduction:raw.majorProduction===true});
   }
   return out.sort((a,b)=>month(a.date).localeCompare(month(b.date))||
     priority(a)-priority(b)||a.date.localeCompare(b.date)||a.title.localeCompare(b.title));
 }
 const el=(tag,cls,str)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(str!==undefined)x.textContent=str;return x};
 function render(list,source,tmdb,tmdbCard,country='GB'){
   const all=merge(source,tmdb,country);list.replaceChildren();
   let active='';
   for(const row of all){
     const m=month(row.date);
     if(m!==active){active=m;list.append(el('h3','fr-cinema-month',monthName(row.date).toUpperCase()))}
     if(!row.verified){
       const shell=el('div','fr-cinema-diary__item fr-cinema-diary__item--unconfirmed');
       const card=document.createElement('div');card.innerHTML=tmdbCard(row);
       const inner=card.firstElementChild;
       if(!inner)continue;
       const badges=el('div','fr-cinema-flags');
       badges.append(el('span','fr-cinema-pill',row.reach==='limited'?'LIMITED CINEMAS':'GENERAL CINEMA RELEASE'));
       badges.append(el('span','fr-cinema-pill fr-cinema-pill--unverified','TMDB-REPORTED DATE · CHECK LOCAL CINEMA'));
       inner.prepend(badges);shell.append(inner);list.append(shell);continue;
     }
     const card=el('article','fr-cinema-diary__item fr-cinema-diary__item--verified');
     card.dataset.mediaType='movie';card.dataset.cinemaCountry=country;card.dataset.mediaTitle=row.title;card.dataset.mediaYear=String(row.filmYear);
     if(Number.isInteger(row.tmdbId)&&row.tmdbId>0)card.dataset.tmdbId=String(row.tmdbId);
     const title=el('h4','fr-cinema-diary__title',row.title);
     const date=el('span','fr-cinema-diary__date',pretty(row.date));
     const label=el('div','fr-cinema-flags');
     label.append(el('span','fr-cinema-pill',row.edition==='re-release'?'RE-RELEASE SCREENINGS':'NEW CINEMA RELEASE'));
     label.append(el('span','fr-cinema-pill fr-cinema-pill--reach',row.reach==='limited'?'LIMITED CINEMAS':row.reach==='unconfirmed'?'VENUES NOT YET CONFIRMED':'GENERAL RELEASE · VENUES VARY'));
     if(row.dateConfidence==='disputed'||row.dateConfidence==='provisional')label.append(el('span','fr-cinema-pill fr-cinema-pill--unverified',row.dateConfidence==='provisional'?'PROVISIONAL RELEASE · CHECK VENUES':'UK RELEASE DATE DISPUTED · CHECK VENUE'));
     const credits=el('p','fr-cinema-diary__credit',row.distributor||(countryNames[country]||'Regional')+' release listing');
     const note=el('p','fr-cinema-diary__note',row.note||'Check the screening source for confirmed venues.');
     const sourceLink=el('a','fr-cinema-diary__source','VIEW VERIFIED SCREENING SOURCE ↗');
     sourceLink.href=sourceSafe(row.sourceUrl);sourceLink.target='_blank';sourceLink.rel='noopener noreferrer';
     const media=el('div','fr-cinema-diary__media');
     const poster=el('img','fr-cinema-diary__poster');poster.dataset.mediaField='poster';poster.hidden=true;poster.alt='Poster for '+row.title;poster.loading='lazy';
     const fallback=el('span','fr-cinema-diary__placeholder','FRIGHTERTAINMENT · FILM FILE');media.append(poster,fallback);
     const copy=el('div','fr-cinema-diary__copy');copy.append(date,label,title,credits,note,sourceLink);
     const rating=el('span','fr-cinema-diary__rating','Not yet rated');rating.dataset.mediaField='rating';copy.append(rating);
     const trailer=el('button','fr-trailer-button','▶ TRAILER');trailer.type='button';trailer.dataset.mediaField='trailer';trailer.hidden=true;copy.append(trailer);
     card.append(media,copy);list.append(card);
   }
   if(!all.length)list.append(el('p','fr-cinema-diary__empty','No upcoming '+(countryNames[country]||'regional')+' cinema dates are listed yet. Check back after the next verified release update.'));
   return {count:all.length,curated:all.filter(x=>x.verified).length,reported:all.filter(x=>!x.verified).length,months:[...new Set(all.map(x=>month(x.date)))]};
 }
 let promise=null;
 const load=()=>promise||(promise=fetch('/data/cinema-screenings.json',{headers:{accept:'application/json'}})
   .then(r=>r.ok?r.json():null).catch(()=>null));
 window.FR_CINEMA_DIARY={merge,render,load,validate,countryNames};
})();
