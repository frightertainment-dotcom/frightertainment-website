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
    return '<article class="hub-tile '+variant+'"><div class="hub-tile__wash" aria-hidden="true"></div>'+
      '<div class="hub-tile__content"><span class="hub-kicker">'+esc(item.category)+'</span><h3>'+esc(item.title)+'</h3>'+
      '<p>'+esc(item.description)+'</p><a class="hub-tile__link" href="'+esc(item.sourceUrl)+'"'+
      (external?' target="_blank" rel="noopener noreferrer"':'')+'>SOURCE: '+esc(item.sourceName)+' ↗</a></div></article>';
  }).join('\n');
  const section=markers.start+'\n<section class="hub-editorial-more" aria-label="More verified '+esc(category)+' recommendations"><div class="hub-editorial-more__head"><h2>MORE TO <em>EXPLORE.</em></h2><p>More horror to discover.</p></div>'+
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
