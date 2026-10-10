import { readFile, writeFile } from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const source=JSON.parse(await readFile(new URL('data/editorial.json',root),'utf8'));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const markers={start:'<!-- EDITORIAL GENERATED START -->',end:'<!-- EDITORIAL GENERATED END -->'};
const collections=['tv-shows','podcasts','indie-movies','games'];
for (const category of collections) {
  const entries=source[category];
  if (!Array.isArray(entries) || !entries.length) throw Error('Empty editorial collection: '+category);
  const unique=new Set();
  let index=0;
  const arts=['hub-tv','hub-podcast','hub-indie','hub-games','hub-feature'];
  const cards=entries.map(item=>{
    if (!item.title || !item.category || !item.description || !item.sourceName ||
        !/^\d{4}-\d{2}-\d{2}$/.test(item.checkedAt||'') ||
        !item.sourceUrl || !(/^(https:\/\/[^\s]+|\/films\/[a-z0-9-]+\/)$/).test(item.sourceUrl))
      throw Error('Incomplete editorial card: '+item.id);
    if (unique.has(item.id)) throw Error('Duplicate editorial item: '+item.id);
    unique.add(item.id);
    const variant=arts[(index++)%arts.length];
    const external=item.sourceUrl.startsWith('https://');
    const longTitle=item.title.length>24?' hub-tile--long-title':'';
    const media=(category==='tv-shows'||category==='indie-movies')?' data-media-type="'+(category==='tv-shows'?'tv':'movie')+'" data-media-title="'+esc(item.title)+'"':'';
    const mediaArt=media?'<img class="hub-editorial-poster" data-media-field="poster" alt="'+esc(item.title)+' poster" hidden>':'';
    return '<article class="hub-tile '+variant+longTitle+'"'+media+'>'+mediaArt+'<div class="hub-tile__wash" aria-hidden="true"></div>'+
      '<div class="hub-tile__content"><span class="hub-kicker">'+esc(item.category)+'</span><h3>'+esc(item.title)+'</h3>'+
      '<p>'+esc(item.description)+'</p>'+(media?'<span class="hub-feature__rating" data-media-field="rating"></span><button type="button" class="fr-trailer-button" data-media-field="trailer" hidden>▶ PLAY TRAILER</button>':'')+'<a class="hub-tile__link" href="'+esc(item.sourceUrl)+'"'+
      (external?' target="_blank" rel="noopener noreferrer"':'')+'>SOURCE: '+esc(item.sourceName)+'</a></div></article>';
  }).join('\n');
  const destination={
    'tv-shows':['AFTER THE FINAL EPISODE','Stories that linger after the screen goes dark.'],
    'podcasts':['KEEP THE LIGHTS OFF','Dark stories selected for late-night listening.'],
    'indie-movies':['THE FESTIVAL CUT','Independent nightmares with a voice of their own.'],
    'games':['MORE WORLDS AFTER DARK','Further descents into survival horror.']
  }[category];
  const words=destination[0].split(' ');
  const section=markers.start+'\n<section class="hub-editorial-more" aria-label="More verified '+esc(category)+' recommendations"><div class="hub-editorial-more__head"><h2>'+esc(words.slice(0,-1).join(' '))+' <em>'+esc(words.at(-1))+'.</em></h2><p>'+esc(destination[1])+'</p></div>'+
  '<div class="hub-catalog hub-catalog--expanded">'+cards+'</div></section>\n'+markers.end;
  const file=new URL(category+'.html',root);
  let html=await readFile(file,'utf8');
  const start=html.indexOf(markers.start);
  if (start!==-1) {
    const end=html.indexOf(markers.end,start);
    if(end===-1)throw Error('Missing generated end marker in '+category);
    html=html.slice(0,start)+section+html.slice(end+markers.end.length);
  } else {
    const position=html.indexOf('<p class="hub-rights-note">');
    if(position===-1)throw Error('No editorial insertion anchor for '+category);
    html=html.slice(0,position)+section+'\n'+html.slice(position);
  }
  await writeFile(file,html);
  console.log('Editorial '+category+': '+entries.length+' additional sourced entries');
}
