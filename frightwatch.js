/* Private visual concept. No playback endpoints or real availability assertions. */
(() => {
  'use strict';
  const crops = [
    {id:'terrifier-3',title:'Terrifier 3',kind:'movie'},
    {id:'the-nun',title:'The Nun',kind:'movie'},
    {id:'smile',title:'Smile',kind:'movie'},
    {id:'the-exorcist',title:'The Exorcist',kind:'movie'},
    {id:'it',title:'It',kind:'movie'},
    {id:'longlegs',title:'Longlegs',kind:'movie'},
    {id:'blair-witch',title:'The Blair Witch Project',kind:'movie'},
    {id:'a-quiet-place',title:'A Quiet Place',kind:'movie'},
    {id:'saw',title:'Saw',kind:'movie'},
    {id:'pearl',title:'Pearl',kind:'movie'},
    {id:'the-ring',title:'The Ring',kind:'movie'},
    {id:'ring',title:'The Ring (concept alternate)',kind:'movie'}
  ];
  const continueTitles=['Hereditary','The Conjuring','Evil Dead','Talk to Me','Midsommar'];
  const originalTitles=['The Hollowing','Blackwell','The Last Ritual','Nightshifts','Buried Things'];
  const releases=['Talk to Me','A Quiet Place','Saw','The Ring','Evil Dead'];
  const watched=new Set();
  const track=(name)=>document.querySelector('[data-track="'+name+'"]');
  const searchInput=document.querySelector('#fw-search-input');
  const modal=document.querySelector('.fw-modal');
  const modalTitle=document.querySelector('#fw-modal-title');
  const modalDescription=document.querySelector('[data-modal-description]');
  const saveDemo=document.querySelector('[data-save-demo]');
  let currentView='home';
  let selectedId='the-hollowing';
  let selectedTitle='The Hollowing';
  const allTiles=[];
  const normalize=v=>String(v||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'');
  const safeLabel=t=>String(t).slice(0,90);
  function art(id){ return crops.findIndex(item=>item.id===id); }
  function tile(cfg) {
    const button=document.createElement('button');button.className='fw-tile';button.type='button';button.dataset.title=cfg.title;button.dataset.kind=cfg.kind||'movie';button.dataset.id=cfg.id;
    button.setAttribute('aria-label',safeLabel(cfg.title)+' — private visual demonstration only, not available to stream');
    const image=document.createElement('span');image.className='fw-tile__art fw-tile__art--'+cfg.style;image.setAttribute('aria-hidden','true');
    let x=0,y=0;
    if(cfg.style==='portrait'){
      x=(42+cfg.index*123)/(1536-113)*100;y=581/(864-135)*100;
    } else if(cfg.style==='continue'||cfg.style==='new'){
      x=([45,337,629,919,1211][cfg.index%5])/(1536-280)*100;y=440/(864-98)*100;
    } else {
      x=([46,336,625,912,1206][cfg.index%5])/(1536-282)*100;y=756/(864-84)*100;
    }
    image.style.setProperty('--crop-x', x.toFixed(3)+'%');image.style.setProperty('--crop-y', y.toFixed(3)+'%');
    const caption=document.createElement('span');caption.className='fw-tile__title';caption.textContent=cfg.title;
    button.append(image,caption);
    button.addEventListener('click',()=>openDemo(cfg));
    allTiles.push(button);
    return button;
  }
  function insert(target,items){const parent=track(target);if(parent)parent.replaceChildren(...items.map(tile));}
  insert('continue',continueTitles.map((title,index)=>({id:'continue-'+index,title,kind:'movie',index,style:'continue'})));
  insert('trending',crops.map((item,index)=>({...item,index,style:'portrait'})));
  insert('originals',originalTitles.map((title,index)=>({id:'original-'+index,title,kind:'original',index,style:'originals'})));
  insert('new',releases.map((title,index)=>({id:'new-'+index,title,kind:'movie',index,style:'new'})));
  function openDemo({id,title}){
    selectedId=id;selectedTitle=title;
    modalTitle.textContent=title;
    modalDescription.textContent='This is private design-reference artwork. '+title+' is not confirmed as licensed or available on FrightWatch. The streaming catalogue will contain only films with verified written screening permission.';
    saveDemo.textContent=watched.has(id)?'★ Remove demo from My List':'☆ Save demo to My List';
    if(typeof modal.showModal==='function')modal.showModal();
    else modal.setAttribute('open','');
  }
  function closeDemo(){if(typeof modal.close==='function'&&modal.open)modal.close();else modal.removeAttribute('open');}
  document.querySelectorAll('[data-close-modal]').forEach(button=>button.addEventListener('click',closeDemo));
  modal?.addEventListener('click',event=>{if(event.target===modal)closeDemo();});
  document.querySelectorAll('[data-demo-title]').forEach(button=>button.addEventListener('click',()=>openDemo({id:'the-hollowing',title:button.dataset.demoTitle||'The Hollowing'})));
  saveDemo?.addEventListener('click',()=>{if(watched.has(selectedId))watched.delete(selectedId);else watched.add(selectedId);saveDemo.textContent=watched.has(selectedId)?'★ Remove demo from My List':'☆ Save demo to My List';update();});
  const noResults=document.querySelector('[data-no-results]');
  const submit=document.querySelector('#submissions');
  const hero=document.querySelector('.fw-hero');
  function update(){
    const query=normalize(searchInput?.value.trim());
    document.querySelectorAll('[data-shelf]').forEach(shelf=>{
      const category=shelf.dataset.shelf;
      const allowed=(currentView==='home'||(shelf.dataset.filters||'').split(' ').includes(currentView)||currentView==='list');
      if(category==='genres'){shelf.hidden=!!query||!allowed||currentView==='list';return;}
      let visible=0;
      shelf.querySelectorAll('.fw-tile').forEach(item=>{
        let ok=allowed&&(!query||normalize(item.dataset.title).includes(query));
        if(currentView==='list')ok=ok&&watched.has(item.dataset.id);
        else if(currentView==='series')ok=ok&&(category==='new'||category==='originals');
        else if(currentView==='originals')ok=ok&&category==='originals';
        item.hidden=!ok;if(ok)visible++;
      });
      shelf.hidden=!visible;
    });
    const anyVisible=[...document.querySelectorAll('[data-shelf]')].some(section=>!section.hidden);
    noResults.hidden=anyVisible;
    hero.hidden=(currentView!=='home'||!!query);
    if(submit)submit.hidden=false;
    document.querySelectorAll('[data-view]').forEach(button=>{
      const active=button.dataset.view===currentView;
      button.toggleAttribute('aria-current',active);
      if(active)button.setAttribute('aria-current','page');
    });
  }
  document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{
    currentView=button.dataset.view;
    searchInput.value='';
    document.querySelector('.fw-header').classList.remove('fw-search-open');
    document.querySelector('.fw-search-toggle')?.setAttribute('aria-expanded','false');
    update();window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }));
  searchInput?.addEventListener('input',()=>{if(searchInput.value.trim())currentView='home';update();});
  document.querySelector('.fw-search-toggle')?.addEventListener('click',function(){
    const opened=document.querySelector('.fw-header').classList.toggle('fw-search-open');this.setAttribute('aria-expanded',String(opened));if(opened)searchInput.focus();
  });
  document.querySelectorAll('[data-scroll]').forEach(button=>button.addEventListener('click',()=>{
    const el=track(button.dataset.scroll);if(el)el.scrollBy({left:Math.max(el.clientWidth*.75,250),behavior:'smooth'});
  }));
  document.querySelectorAll('[data-demo-genre]').forEach(button=>button.addEventListener('click',()=>openDemo({id:'genre-'+normalize(button.dataset.demoGenre),title:button.dataset.demoGenre+' Collection'})));
  update();
})();