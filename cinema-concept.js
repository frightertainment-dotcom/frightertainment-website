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
  for(const [index,row] of upcoming.entries()){
   const card=make('article','fr-cinema-concept__card');
   card.dataset.releaseDate=row.date;
   const order=make('span','fr-cinema-concept__order',String(index+1).padStart(2,'0'));
   order.setAttribute('aria-hidden','true');
   const title=make('strong','fr-cinema-concept__title',row.title);
   const date=make('time','fr-cinema-concept__date',new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(row.date+'T12:00:00Z')));
   date.dateTime=row.date;
   const details=make('span','fr-cinema-concept__details',(row.edition==='re-release'?'RE-RELEASE':'NEW RELEASE')+' · '+(row.reach==='limited'?'LIMITED CINEMAS':row.reach==='unconfirmed'?'VENUES UNCONFIRMED':'GENERAL RELEASE')+(row.dateConfidence==='disputed'?' · DATE UNDER REVIEW':''));
   const source=make('a','fr-cinema-concept__source','SOURCE');
   source.href=row.sourceUrl;source.target='_blank';source.rel='noopener noreferrer';
   source.setAttribute('aria-label','Verified screening source for '+row.title+' on '+date.textContent);
   card.append(order,title,date,details,source);cards.append(card);
  }
 }
 country.addEventListener('change',render);
 render();
})();
