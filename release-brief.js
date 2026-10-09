/* Source-checked horror releases. This is an editorial bulletin, NOT a licensed
 * live subscription catalogue, not a claim that a film remains available.
 * Dates age out automatically; a missing feed is never replaced by invented titles.
 */
(() => {
  'use strict';
  const panels=[...document.querySelectorAll('[data-release-brief]')];
  if(!panels.length)return;
  const now=new Date().toISOString().slice(0,10);
  const daysAgo=iso=>(Date.parse(now+'T00:00:00Z')-Date.parse(iso+'T00:00:00Z'))/86400000;
  const fmt=iso=>new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',day:'numeric',month:'short'}).format(new Date(iso+'T12:00:00Z'));
  const make=(name,cls,txt)=>{const el=document.createElement(name);if(cls)el.className=cls;if(txt!==undefined)el.textContent=txt;return el;};
  const modes=[
    {id:'streaming',text:'NEW ON STREAMING'},
    {id:'cinema',text:'IN CINEMAS'},
    {id:'vod',text:'BUY OR RENT'},
    {id:'coming',text:'COMING NEXT'}
  ];
  const valid=x=>x && ['cinema','streaming','vod'].includes(x.category) &&
    typeof x.title==='string' && x.title.length>1 && x.title.length<180 &&
    x.country==='GB' && /^20\d{2}-\d{2}-\d{2}$/.test(x.date||'') &&
    /^20\d{2}-\d{2}-\d{2}$/.test(x.checkedAt||'') &&
    /^https:\/\//.test(x.sourceUrl||'');
  const summarise=(items,mode)=>{
    if(mode==='coming')return items.filter(x=>x.category==='streaming'&&x.date>now && daysAgo(x.date)>=-30)
      .sort((a,b)=>a.date.localeCompare(b.date));
    if(mode==='streaming')return items.filter(x=>x.category==='streaming'&&x.date<=now&&daysAgo(x.date)<=28)
      .sort((a,b)=>b.date.localeCompare(a.date)||a.title.localeCompare(b.title));
    return items.filter(x=>x.category===mode&&x.date<=now&&daysAgo(x.checkedAt)<=14)
      .sort((a,b)=>b.checkedAt.localeCompare(a.checkedAt));
  };
  const detailMessage=(item,mode)=>{
    if(mode==='streaming')return 'Added '+fmt(item.date)+' · '+item.service+' UK';
    if(mode==='coming')return 'Announced for '+fmt(item.date)+' · '+item.service+' UK';
    return item.dateIsSourceCheck ? item.service+' · source checked '+fmt(item.checkedAt) :
      item.service+' · release '+fmt(item.date);
  };
  function paint(root,items,checked){
    const selected={value:'streaming'};
    const head=make('div','release-brief__head');
    head.append(make('div','release-brief__heading','THE HORROR DROP'));
    const asof=make('span','release-brief__checked','UK · '+(checked?'checked '+fmt(checked):'edition unavailable'));
    head.append(asof);
    const tabs=make('div','release-brief__tabs');tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Filter verified horror releases');
    const content=make('div','release-brief__items');content.setAttribute('aria-live','polite');
    const note=make('p','release-brief__note');
    const buttons=[];
    for(const mode of modes){
      const btn=make('button','release-brief__tab',mode.text);btn.type='button';
      btn.dataset.mode=mode.id;btn.setAttribute('aria-pressed',String(mode.id==='streaming'));
      btn.addEventListener('click',()=>{selected.value=mode.id;render();});
      tabs.append(btn);buttons.push(btn);
    }
    function render(){
      for(const btn of buttons){const active=btn.dataset.mode===selected.value;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));}
      const rows=summarise(items,selected.value).slice(0,4);
      content.replaceChildren();
      for(const item of rows){
        const row=make('article','release-brief__item');
        const main=make('div','release-brief__item-main');
        const href=item.filmId&&/^[a-z0-9-]+$/.test(item.filmId)?
          '/films/'+encodeURIComponent(item.filmId)+'/':null;
        const title=make(href?'a':'strong','release-brief__title',item.title);
        if(href)title.href=href;
        main.append(title,make('span','release-brief__subtitle',detailMessage(item,selected.value)));
        const src=make('a','release-brief__source','SOURCE ↗');src.href=item.sourceUrl;src.target='_blank';src.rel='noopener noreferrer';
        src.setAttribute('aria-label','Read original source for '+item.title);
        row.append(main,src);content.append(row);
      }
      if(!rows.length)content.append(make('p','release-brief__empty','No recent verified listings in this category.'));
      const stale=checked&&daysAgo(checked)>14;
      note.textContent=stale?
        'Last verified '+checked+'. New arrivals are awaiting the next editorial check.':
        'Source-linked announcements · streaming catalogues may change · check the provider before watching.';
    }
    root.replaceChildren(head,tabs,content,note);render();
  }
  fetch('/data/editorial-releases.json',{headers:{accept:'application/json'}})
    .then(async r=>r.ok?await r.json():null)
    .then(data=>{
      const items=Array.isArray(data?.items)?data.items.filter(valid):[];
      const checked=typeof data?.updatedAt==='string'?data.updatedAt.slice(0,10):null;
      for(const root of panels)paint(root,items,checked);
    }).catch(()=>{
      for(const root of panels)paint(root,[],null);
    });
})();
