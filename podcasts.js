(() => {
 const root=document.querySelector('#podcast-chart');if(!root)return;
 const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 fetch('/api/podcasts',{headers:{accept:'application/json'}}).then(async r=>r.ok?r.json():null).then(data=>{
  if(!data?.items?.length)throw Error('No podcast list');
  const tileMap=new Map([...document.querySelectorAll('.hub-catalog .hub-tile')].map(tile=>[norm(tile.querySelector('h3')?.textContent),tile]));
  for(const item of data.items){
   const tile=tileMap.get(norm(item.title));
   if(tile&&item.artworkUrl){const art=document.createElement('img');art.className='hub-editorial-poster podcast-cover';art.alt='Cover for '+item.title;art.loading='lazy';art.src=item.artworkUrl;art.addEventListener('error',()=>art.remove(),{once:true});tile.prepend(art);tile.classList.add('has-podcast-cover');}
  }
  root.replaceChildren();
  data.items.forEach((item,index)=>{
   const card=document.createElement('article');card.className='podcast-chart__row';
   const no=document.createElement('span');no.className='podcast-chart__number';no.textContent=String(index+1).padStart(2,'0');
   const body=document.createElement('div');const title=document.createElement('strong');title.textContent=item.title;body.append(title);
   if(item.appleUrl){const link=document.createElement('a');link.href=item.appleUrl;link.target='_blank';link.rel='noopener noreferrer';link.textContent='LISTEN ON APPLE PODCASTS →';body.append(link);}
   if(item.artworkUrl){const img=document.createElement('img');img.src=item.artworkUrl;img.alt='';img.loading='lazy';img.addEventListener('error',()=>img.remove(),{once:true});card.append(img);}
   card.append(no,body);root.append(card);
  });
  document.querySelector('#podcast-chart-checked').textContent='Checked '+new Intl.DateTimeFormat('en-GB',{dateStyle:'medium'}).format(new Date(data.checkedAt+'T12:00:00Z'))+' · weekly refresh · editorial order';
 }).catch(()=>{root.textContent='Podcast cover information is temporarily unavailable. Browse the editor selections below.';});
})();
