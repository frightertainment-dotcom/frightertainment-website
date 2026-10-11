/* Current watching offers from TMDB/JustWatch — NOT first-premiere evidence. */
(() => {
'use strict';
const root=document.querySelector('#straight-to-stream .fr-watch');if(!root)return;
const section=document.querySelector('#straight-to-stream');
const country=section.querySelector('[data-stream-country]');
const year=section.querySelector('[data-stream-year]');
const tabs=[...section.querySelectorAll('[data-stream-access]')];
const action=root.querySelector('[data-watch-trigger]');
const status=root.querySelector('[data-watch-status]');
const list=root.querySelector('[data-watch-list]');
const pager=root.querySelector('[data-watch-pagination]');
const labels={subscription:'INCLUDED WITH SUBSCRIPTION',free:'FREE / AD-SUPPORTED','rent-buy':'DIGITAL RENT / BUY'};
let active=false,page=1,history=[],revision=0,controller=null;
const node=(tag,cls,label)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(label!==undefined)el.textContent=String(label);return el};
const safe=u=>{try{const x=new URL(u);return x.protocol==='https:'&&!x.username&&!x.password?x.href:null}catch{return null}};
const choice=()=>tabs.find(x=>x.classList.contains('active'))?.dataset.streamAccess||'all';
const load=async()=>{
 if(!active)return;
 const seq=++revision;
 controller?.abort();controller=new AbortController();
 const args=new URLSearchParams({mode:'streaming-watch',type:'movie',page:String(page),
   country:country.value,year:year.value,access:choice()});
 action.disabled=true;
 status.textContent='Checking '+(country.value==='GB'?'UK':'US')+' horror watching options…';
 list.replaceChildren();pager.replaceChildren();
 try{
  const response=await fetch('/api/catalogue?'+args,{signal:controller.signal,headers:{accept:'application/json'}});
  if(!response.ok)throw Error('Provider service unavailable');
  const result=await response.json();if(seq!==revision)return;
  if(!Array.isArray(result.items))throw Error('Invalid provider list');
  for(const item of result.items){
   const card=node('article','fr-watch__card');
   const frame=node('div','fr-watch__image');
   const poster=node('img');poster.alt='Poster for '+item.title;poster.loading='lazy';poster.decoding='async';
   const fallback=node('span','fr-watch__fallback','FRIGHTERTAINMENT FILM FILE');
   frame.append(fallback);
   if(/^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\.(?:jpg|png|webp)$/i.test(item.posterPath||'')){
    poster.src='https://image.tmdb.org/t/p/w342'+item.posterPath;
    poster.addEventListener('load',()=>{fallback.hidden=true},{once:true});
    poster.addEventListener('error',()=>{poster.hidden=true;fallback.hidden=false},{once:true});
    frame.append(poster);
   }
   const info=node('div','fr-watch__content');
   const title=node('h4');const link=node('a','',item.title);
   link.href='/media.html?type=movie&id='+encodeURIComponent(item.tmdbId);title.append(link);
   const badges=node('div','fr-watch__labels');
   for(const kind of item.accessTypes||[])if(labels[kind])badges.append(node('span','',labels[kind]));
   const providers=node('p','fr-watch__summary',(item.providerNames||[]).join(' · ')||'Check regional providers');
   const filmYear=String(item.firstReleaseDate||item.releaseDate||'').slice(0,4);
   const rating=node('p','fr-watch__rating',(Number(item.voteCount)>0&&Number(item.voteAverage)>0?
     'TMDB '+Number(item.voteAverage).toFixed(1)+'/10':'Not yet rated')+(filmYear?' · FILM YEAR '+filmYear:''));
   const links=node('div','fr-watch__actions');
   if(safe(item.watchLink)){
    const store=node('a','','SEE WATCHING OPTIONS ↗');store.href=safe(item.watchLink);
    store.target='_blank';store.rel='noopener noreferrer';links.append(store);
   }
   const detail=node('a','','FILM DETAILS →');detail.href=link.href;links.append(detail);
   info.append(title,badges,providers,rating,links);
   card.append(frame,info);list.append(card);
  }
  status.textContent=result.items.length+' horror films · '+(country.value==='GB'?'UK':'US')+
    ' provider options · '+(year.value==='all'?'all film years':year.value+' film year')+
    ' · checked '+(result.checkedAt||'recently')+(result.stale?' · cached result':'');
  if(!result.items.length)list.append(node('p','fr-watch__status','No matches. Try another year or viewing type.'));
  const prev=node('button','','← PREVIOUS');prev.disabled=!history.length;
  prev.addEventListener('click',()=>{page=history.pop()||1;load();});
  const next=node('button','','NEXT PROVIDERS →');next.disabled=!Number(result.nextPage);
  next.addEventListener('click',()=>{history.push(page);page=Number(result.nextPage);load();});
  pager.append(prev,node('span','','PAGE '+page),next);
 }catch{
  if(seq!==revision)return;
  status.textContent='Provider listings could not be loaded. Try again shortly.';
  list.replaceChildren();
 }finally{if(seq===revision)action.disabled=false;}
};
action.addEventListener('click',()=>{active=true;page=1;history=[];load();});
country.addEventListener('change',()=>{if(active){page=1;history=[];load();}});
year.addEventListener('change',()=>{if(active){page=1;history=[];load();}});
tabs.forEach(b=>b.addEventListener('click',()=>{if(active){page=1;history=[];load();}}));
})();