/* Country-aware cinema feature drawn only from the existing screened ledger. */
(() => {
 'use strict';
 const main=document.querySelector('body.fr-v5 #main');
 const intro=main?.querySelector('.hub-page-intro');
 const country=document.querySelector('[data-cinema-country]');
 if(!main||!intro||!country)return;
 // The featured cards and region picker live in cinema.html before scripts run.
 // Never move the country control or insert an entire section after first paint:
 // that caused the owner-reported Cinema layout jump on mobile.
 const section=main.querySelector('.fr-cinema-concept');
 if(!section)return;
 const cards=section.querySelector('[data-cinema-concept-cards]');
 const label=section.querySelector('[data-cinema-concept-country]');
 if(!cards||!label||section.dataset.frCinemaConceptReady)return;
 section.dataset.frCinemaConceptReady='true';
 const make=(tag,className,value)=>{
  const node=document.createElement(tag);node.className=className;
  if(value!==undefined)node.textContent=value;return node;
 };
 let edition=0;
 async function render(){
  const current=++edition;
  const code=country.value;
  label.textContent=country.selectedOptions[0]?.textContent||code;
  const diary=window.FR_CINEMA_DIARY;
  const source=await diary?.load();
  if(current!==edition)return;
  const upcoming=diary?.merge(source,[],code).slice(0,4)||[];
  cards.replaceChildren();
  if(!upcoming.length){
   cards.append(make('p','fr-cinema-concept__empty','No confirmed upcoming cinema dates for this country yet. Check the release diary for updates.'));
   return;
  }
  for(const row of upcoming){
   const card=make('article','fr-cinema-concept__card');
   const art=make('div','fr-cinema-concept__art');
   art.setAttribute('role','img');art.setAttribute('aria-label','Frightertainment cinema illustration, not an official film poster');
   const copy=make('div','fr-cinema-concept__copy');
   copy.append(make('strong','',row.title),make('small','',new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(row.date+'T12:00:00Z'))));
   const a=make('a','','VIEW SCREENING SOURCE');a.href=row.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';
   copy.append(a);card.append(art,copy);cards.append(card);
   if(Number.isInteger(row.tmdbId)&&row.tmdbId>0){
    fetch('/api/media?type=movie&id='+row.tmdbId).then(response=>response.ok?response.json():null).then(data=>{
     if(current!==edition||!card.isConnected)return;
     const item=data?.item;
     if(item?.tmdbId!==row.tmdbId||!/^\/[a-zA-Z0-9_/-]+\.(?:jpg|png|webp)$/.test(item.posterPath||''))return;
     const image=new Image();image.alt='Official poster for '+row.title;image.loading='lazy';
     image.onload=()=>{art.replaceChildren(image);art.removeAttribute('role');art.removeAttribute('aria-label')};
     image.src='https://image.tmdb.org/t/p/w342'+item.posterPath;
    }).catch(()=>{});
   }
  }
 }
 country.addEventListener('change',render);
 render();
})();
