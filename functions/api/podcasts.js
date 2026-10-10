// Apple artwork is linked to the official Apple Podcasts page for each exact match.
// This is an editorial discovery list refreshed by the seven-day edge cache,
// not a claim about listener counts or Apple's ranking.
const names=['The NoSleep Podcast','The Magnus Archives','Knifepoint Horror','Old Gods of Appalachia','The Silt Verses','Lore','Unwell','I Am in Eskew','The White Vault','Malevolent','Spooked','Radio Rental'];
const normalize=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const headers={'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=3600','x-content-type-options':'nosniff'};
export async function onRequestGet({request}){
 const cache=caches.default,url=new URL(request.url),key=new Request(url.origin+url.pathname);
 const saved=await cache.match(key);if(saved)return saved;
 const items=[];
 for(let i=0;i<names.length;i+=3){
   const group=names.slice(i,i+3);
   const results=await Promise.all(group.map(async name=>{
     try{
       const u=new URL('https://itunes.apple.com/search');u.searchParams.set('term',name);u.searchParams.set('media','podcast');u.searchParams.set('entity','podcast');u.searchParams.set('country','GB');u.searchParams.set('limit','15');
       const response=await fetch(u,{signal:AbortSignal.timeout(5000)});if(!response.ok)return {title:name};
       const data=await response.json();const match=(data.results||[]).find(item=>normalize(item.collectionName||item.trackName)===normalize(name)&&item.kind==='podcast');
       if(!match)return {title:name};
       const art=match.artworkUrl600||match.artworkUrl100;
       return {title:name,artworkUrl:typeof art==='string'&&/^https:\/\/is\d+-ssl\.mzstatic\.com\//.test(art)?art:null,appleUrl:typeof match.collectionViewUrl==='string'&&/^https:\/\/podcasts\.apple\.com\//.test(match.collectionViewUrl)?match.collectionViewUrl:null};
     }catch{return {title:name};}
   }));items.push(...results);
 }
 const response=new Response(JSON.stringify({title:'Horror podcasts to explore',methodology:'Editorial discovery order; this is not a popularity or listener chart. Apple Podcasts artwork and links are refreshed no more than weekly.',checkedAt:new Date().toISOString().slice(0,10),items}),{headers:{...headers,'cache-control':'public, max-age=604800'}});
 await cache.put(key,response.clone());return response;
}
