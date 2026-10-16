/* FrightWatch PRIVATE catalogue: no playable title without verifiable rights. */
(() => {
'use strict';
const logo=document.querySelector('#fr-watch-logo');
if(logo){
 const configured=logo.getAttribute('data-frightwatch-logo');
 if(configured){const img=new Image();
 img.addEventListener('load',()=>{logo.src=configured;logo.hidden=false;const heading=document.querySelector('#watch-title');heading.classList.add('sr-only');});
 img.src=configured;
 }
}
const destination=document.querySelector('#fr-watch-catalogue');
const empty=document.querySelector('#fr-watch-empty');
const search=document.querySelector('#fr-watch-search');
const buttons=[...document.querySelectorAll('[data-watch-format]')];
if(!destination||!empty||!search)return;
let items=[];let currentFormat='all';
const validUrl=v=>{try{const u=new URL(v,location.origin);return u.origin===location.origin&&u.pathname.startsWith('/assets/frightwatch/')&&!u.search&&!u.hash?u.pathname:null;}catch{return null;}};
const validRecord=(item,now)=>{
 if(!item||item.status!=='approved'||!item.editorialApproval||!item.verifiedPlayback||!item.rights)return false;
 const r=item.rights;
 return /^[a-z0-9-]+$/.test(item.id||'')&&typeof item.title==='string'&&item.title.length>0&&
 ['feature','short','series','documentary','paranormal'].includes(item.format)&&
 typeof item.synopsis==='string'&&item.synopsis.length>0&&
 typeof item.rightsholder==='string'&&item.rightsholder.trim().length>0&&
 typeof r.writtenGrantEvidence==='string'&&r.writtenGrantEvidence.trim().length>0&&
 r.permission==='approved'&&r.freeStreamingAllowed===true&&r.artworkAllowed===true&&
 Array.isArray(r.territories)&&r.territories.includes('GB')&&
 /^\d{4}-\d{2}-\d{2}$/.test(r.startsAt||'')&&
 /^\d{4}-\d{2}-\d{2}$/.test(r.expiresAt||'')&&r.startsAt<=now&&r.expiresAt>=now&&
 Boolean(validUrl(item.poster))&&Boolean(validUrl(item.playbackFile));
};
function element(tag,cls,txt){const el=document.createElement(tag);if(cls)el.className=cls;if(txt!==undefined)el.textContent=String(txt);return el;}
function card(item){
 const article=element('article','fr-watch-film');
 const img=element('img','fr-watch-film__poster');img.src=validUrl(item.poster);img.loading='lazy';img.decoding='async';img.alt='Poster for '+item.title;
 const meta=element('div','fr-watch-film__meta');meta.append(element('h3','',item.title),element('p','',item.format.toUpperCase()+' · '+(item.year||'Year not listed')));
 const a=element('a','','MORE INFORMATION →');a.href='/frightwatch.html#submit';a.setAttribute('aria-label','More information about FrightWatch availability');
 meta.append(a);article.append(img,meta);return article;
}
function paint(){
 const q=search.value.trim().toLocaleLowerCase();
 const list=items.filter(item=>(currentFormat==='all'||item.format===currentFormat)&&(!q||item.title.toLocaleLowerCase().includes(q)||item.synopsis.toLocaleLowerCase().includes(q)));
 destination.replaceChildren(...list.map(card));
 empty.hidden=list.length>0;
 if(!list.length){
  const h=empty.querySelector('h3');const p=empty.querySelector('p');
  h.textContent=q?'NO FILMS MATCH THIS SEARCH.':'THE FIRST NIGHTMARES ARE ON THEIR WAY.';
  p.textContent=q?'Try another search or browse one of the other categories. We only list films approved for screening.':'No full films are available to play yet. We\'re inviting independent creators to be part of FrightWatch. Every title will be shared with permission and properly credited.';
 }
}
buttons.forEach(b=>b.addEventListener('click',()=>{currentFormat=b.dataset.watchFormat;buttons.forEach(x=>{const active=x===b;x.classList.toggle('is-active',active);x.setAttribute('aria-pressed',String(active));});paint();}));
search.addEventListener('input',paint);
fetch('/data/frightwatch-catalogue.json',{cache:'no-store',headers:{Accept:'application/json'}}).then(r=>r.ok?r.json():null).then(json=>{
 if(!json||json.version!==1||!Array.isArray(json.films))return;
 const now=new Date().toISOString().slice(0,10);
 // Client filter is a defensive display guard, NOT a media authorisation boundary.
 // Private preview has no playable media. A future playback API must enforce rights server-side.
 items=json.films.filter(f=>validRecord(f,now));paint();
}).catch(()=>{paint();});
})();
