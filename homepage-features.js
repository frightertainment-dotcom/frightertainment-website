/* Weekly source-backed Frightertainment homepage selections.
   Background artwork remains first-party; no third-party poster licence is implied. */
(() => {
  'use strict';
  const root=document.querySelector('#home-showcase');
  if(!root)return;
  const selector={movie:'.hub-feature',tv:'.hub-tv',indie:'.hub-indie',podcast:'.hub-podcast',games:'.hub-games'};
  const cta={movie:'EXPLORE FILM',tv:'EXPLORE SHOWS',indie:'EXPLORE FILM',podcast:'LISTEN TO PODCAST',games:'EXPLORE GAME'};
  const safeURL=value=>{
    if(typeof value!=='string')return '';
    if(/^\/(?!\/)[a-z0-9\/_?#=&.-]+$/i.test(value))return value;
    try{const uri=new URL(value);return uri.protocol==='https:'&&!uri.username&&!uri.password?uri.href:''}catch{return ''}
  };
  const apply=(key,feature)=>{
    const article=root.querySelector(selector[key]);
    if(!article || !feature || typeof feature.title!=='string' || typeof feature.description!=='string')return;
    const href=safeURL(feature.href),source=safeURL(feature.sourceUrl);
    if(!href)return;
    const title=article.querySelector('h3'),description=article.querySelector('.hub-tile__content p');
    const link=article.querySelector('.hub-tile__link');
    if(!title||!description||!link)return;
    title.textContent=feature.title.toLocaleUpperCase('en-GB');
    description.textContent=feature.description;
    link.href=href;
    link.replaceChildren(document.createTextNode(cta[key]+'  '),document.createTextNode('→'));
    link.setAttribute('aria-label',cta[key]+' — '+feature.title);
    if(href.startsWith('https://')){link.target='_blank';link.rel='noopener noreferrer'}
    else {link.removeAttribute('target');link.removeAttribute('rel')}
    if(key==='movie')article.dataset.editorialCurated='true';
    if(key==='tv'||key==='indie'){
      article.dataset.mediaTitle=feature.title;
      if(Number.isInteger(feature.year))article.dataset.mediaYear=String(feature.year);
      const poster=article.querySelector('.hub-editorial-poster');
      if(poster)poster.alt=feature.title+' poster';
    }
    const existing=article.querySelector('.fr-home-feature-source');
    if(existing)existing.remove();
    if(source){
      const credit=document.createElement('a');
      credit.className='fr-home-feature-source';
      credit.href=source;credit.textContent='SOURCE: '+String(feature.sourceName||'Official source');
      if(source.startsWith('https://')){credit.target='_blank';credit.rel='noopener noreferrer'}
      article.querySelector('.hub-tile__content').append(credit);
    }
  };
  fetch('/data/homepage-features.json',{headers:{accept:'application/json'}})
    .then(response=>{if(!response.ok)throw Error('Unavailable');return response.json()})
    .then(payload=>{
      if(payload?.schemaVersion!==1||!payload.features)return;
      for(const key of Object.keys(selector))apply(key,payload.features[key]);
    })
    .catch(()=>{/* Keep the current sourced HTML editorial fallbacks. */});
})();
