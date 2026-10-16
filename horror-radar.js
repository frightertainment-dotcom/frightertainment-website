/* Source-linked Frightertainment horror editorial radar. Never a licensed live availability feed. */
(() => {
  'use strict';
  const mounts=[...document.querySelectorAll('[data-fr-radar]')];
  if(!mounts.length)return;
  const validDay=x=>/^\d{4}-\d{2}-\d{2}$/.test(x||'')&&
    !Number.isNaN(Date.parse(x+'T12:00:00Z'));
  const categories=new Set(['tv','game','podcast','vod','streaming']);
  const safeUrl=u=>{
    try{const v=new URL(u);return v.protocol==='https:'&&!v.username&&!v.password?v.href:null}
    catch{return null}
  };
  const make=(tag,cls,txt)=>{
    const e=document.createElement(tag);
    if(cls)e.className=cls;
    if(txt!==undefined)e.textContent=txt;
    return e;
  };
  const format=d=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',
    timeZone:'UTC'}).format(new Date(d+'T12:00:00Z'));
  const statusText={
    'dated-premiere':'SOURCE-ANNOUNCED PREMIERE',
    'dated-release':'OFFICIAL RELEASE DATE',
    'dated-episode':'DATED EPISODE / PREMIERE',
    'announced-undated':'DIGITAL RELEASE · DATE TBC',
    'provider-spotlight':'PLATFORM EDITORIAL PICK'
  };
  const categoryLabels={tv:'TV & SERIES',game:'GAMES',podcast:'PODCASTS',
    vod:'BUY OR RENT',streaming:'STREAMING SPOTLIGHT'};
  const useful=x=>x&&typeof x.id==='string'&&/^[a-z0-9-]+$/.test(x.id)&&
    categories.has(x.category)&&typeof x.title==='string'&&x.title.length<160&&
    typeof x.summary==='string'&&x.summary.length<450&&safeUrl(x.sourceUrl)&&
    validDay(x.checkedAt)&&(x.date===null||validDay(x.date))&&
    Object.hasOwn(statusText,x.status)&&
    (x.date!==null||['announced-undated','provider-spotlight'].includes(x.status));
  const sort=(a,b)=>{
    const at=a.date||a.checkedAt,bt=b.date||b.checkedAt;
    return bt.localeCompare(at)||a.title.localeCompare(b.title);
  };
  const current=date=>date&&date>=new Date().toISOString().slice(0,10);
  const pick=(all,section)=>{
    if(section==='movies')return all.filter(x=>x.category==='streaming'||x.category==='vod')
      .sort((a,b)=>Number(current(b.date))-Number(current(a.date))||sort(a,b)).slice(0,8);
    if(section==='home'){
      const ordered=['game','tv','podcast','streaming','vod'];
      return ordered.flatMap(category=>all.filter(x=>x.category===category)
        .sort((a,b)=>Number(current(b.date))-Number(current(a.date))||sort(a,b)).slice(0,1)).slice(0,4);
    }
    return all.filter(x=>x.category===section).sort((a,b)=>
      Number(current(b.date))-Number(current(a.date))||sort(a,b)).slice(0,8);
  };
  function render(mount,data){
    const records=Array.isArray(data?.items)?data.items.filter(useful):[];
    const section=mount.dataset.frRadar;
    const items=pick(records,section);
    const box=mount.querySelector('[data-fr-radar-list]');
    const state=mount.querySelector('[data-fr-radar-state]');
    if(!box||!state)return;
    box.replaceChildren();
    if(!items.length){state.textContent='No recently source-checked updates for this section.';return;}
    state.textContent='Editorial source check '+(validDay(data.checkedAt)?format(data.checkedAt):'date unavailable')+
      ' · cinema and subscription availability may change.';
    for(const item of items){
      const card=make('article','fr-radar__card');
      const eyebrow=make('p','fr-radar__eyebrow',categoryLabels[item.category]+' · '+item.channel);
      const heading=make('h3','fr-radar__title',item.title);
      const subtitle=make('p','fr-radar__meta',
        (item.date?format(item.date)+' · ':'')+statusText[item.status]+
        (item.country==='GLOBAL'?' · WORLDWIDE ANNOUNCEMENT':' · UK SOURCE'));
      const summary=make('p','fr-radar__summary',item.summary);
      const note=make('small','fr-radar__checked','Source checked '+format(item.checkedAt));
      const link=make('a','fr-radar__source','CHECK ORIGINAL SOURCE →');
      link.href=safeUrl(item.sourceUrl);link.target='_blank';link.rel='noopener noreferrer';
      link.setAttribute('aria-label','Original publisher source for '+item.title);
      card.append(eyebrow,heading,subtitle,summary,note,link);
      box.append(card);
    }
  }
  fetch('/data/horror-radar.json',{headers:{accept:'application/json'}})
    .then(r=>r.ok?r.json():Promise.reject(new Error('Editorial feed missing')))
    .then(data=>mounts.forEach(m=>render(m,data)))
    .catch(()=>mounts.forEach(m=>{
      const state=m.querySelector('[data-fr-radar-state]');
      if(state)state.textContent='The publisher-linked radar is temporarily unavailable. Other sections remain open.';
    }));
})();