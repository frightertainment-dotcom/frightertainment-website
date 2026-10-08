/* All Horror Movies: indexed year-by-year titles from first-party film files
 * and the growing CC0 Wikidata reference snapshot. No licensed artwork/ratings.
 * Rows render when a year is expanded, even for very large historic catalogues.
 */
(() => {
  'use strict';
  const archive=document.getElementById('archive-years');
  if (!archive) return;
  const jump=document.getElementById('archive-jump');
  const summary=document.getElementById('archive-summary');
  const currentYear=new Date().getUTCFullYear();
  const startYear=1896;
  const collator=new Intl.Collator('en-GB',{numeric:true,sensitivity:'base'});
  const titleKey=s=>String(s||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-GB');
  const filmYear=film=>{
    const claims=Array.isArray(film.claims)?film.claims:[];
    const year=claims.find(c=>['releaseYear','filmYear'].includes(c.field))?.value ||
      claims.find(c=>c.field==='releaseDate')?.value?.slice(0,4);
    return /^\d{4}$/.test(String(year))?Number(year):null;
  };
  const officialLocal=(window.FR_MOVIES||[]).filter(f=>f.editorialStatus==='approved')
    .map(f=>({
      id:'local:'+f.id,
      title:f.title,
      year:filmYear(f),
      href:'/films/'+encodeURIComponent(f.id)+'/',
      linkLabel:'FILM DETAILS',
      source:'Frightertainment verified film file',
      local:true
    })).filter(f=>f.year>=startYear&&f.year<=currentYear);
  const validRecord=x=>x && /^Q[1-9][0-9]*$/.test(x.qid||'') &&
    typeof x.title==='string' && x.title.trim().length>1 && x.title.length<=240 &&
    Number.isInteger(x.year) && x.year>=startYear && x.year<=currentYear+2 &&
    (!x.imdbId || /^tt\d{7,10}$/.test(x.imdbId));
  const normalizeWikidata=x=>({
    id:'wd:'+x.qid,
    title:x.title.trim(),
    year:x.year,
    href:x.imdbId?'https://www.imdb.com/title/'+x.imdbId+'/':'https://www.wikidata.org/wiki/'+x.qid,
    linkLabel:x.imdbId?'IMDb PAGE ↗':'WIKIDATA RECORD ↗',
    source:'Wikidata CC0',
    local:false
  });
  const manualRecord=x=>x && /^(?:manual:[a-z0-9-]+|wd:Q[1-9][0-9]*)$/.test(x.id||'') &&
    typeof x.title==='string' && x.title.trim().length>1 &&
    Number.isInteger(x.year) && x.year>=startYear && x.year<=currentYear &&
    /^https:\/\//.test(x.url||'');
  const normalizeManual=x=>({id:x.id,title:x.title.trim(),year:x.year,href:x.url,
    linkLabel:x.sourceName||'SOURCE PAGE ↗',source:'Manually checked source',local:false});
  const years=Array.from({length:currentYear-startYear+1},(_,index)=>currentYear-index);
  const grouped=new Map(years.map(y=>[y,[]]));
  const selectSource=raw=>{
    const records=new Map();
    for(const record of (raw?.films||[])){
      if(validRecord(record)) records.set('wd:'+record.qid,normalizeWikidata(record));
    }
    for(const record of (raw?.manual||[])){
      if(manualRecord(record))records.set(record.id,normalizeManual(record));
    }
    // First-party film pages take priority when a title/year appears in Wikidata.
    const localKeys=new Set(officialLocal.map(x=>x.year+'|'+titleKey(x.title)));
    for(const record of records.values()){
      if(record.year>currentYear || localKeys.has(record.year+'|'+titleKey(record.title)))continue;
      grouped.get(record.year)?.push(record);
    }
    for(const record of officialLocal)grouped.get(record.year)?.push(record);
    for(const entries of grouped.values()){
      entries.sort((a,b)=>collator.compare(a.title,b.title)||collator.compare(a.id,b.id));
    }
  };
  const node=(tag,className,text)=>{
    const n=document.createElement(tag);
    if(className)n.className=className;
    if(text!==undefined)n.textContent=text;
    return n;
  };
  function renderYearContents(year,container){
    const items=grouped.get(year)||[];
    const panel=node('div','horror-year__panel');
    const searchLabel=node('label','horror-year__search-label','SEARCH '+year+' MOVIES');
    const search=node('input','horror-year__search');
    search.type='search';search.autocomplete='off';search.placeholder='Search titles released in '+year+'…';
    search.setAttribute('aria-label','Search horror movies from '+year);
    searchLabel.append(search);
    const tally=node('p','horror-year__tally');
    const list=node('ul','horror-year__films');
    const rendered=items.map(item=>{
      const li=node('li','horror-year__film');
      const link=node('a','horror-year__film-link',item.title);
      link.href=item.href;
      if(!item.local){link.target='_blank';link.rel='noopener noreferrer';}
      const type=node('span','horror-year__film-type',item.linkLabel);
      li.append(link,type);
      list.append(li);
      return {li,key:titleKey(item.title)};
    });
    const nothing=node('p','horror-year__empty','No matched films in this year. Try a different search.');
    nothing.hidden=true;
    if(!items.length){
      nothing.textContent='No films have been catalogued for '+year+' yet. This does not mean no horror films were released that year.';
    }
    let debounce=0;
    function filter(){
      const needle=titleKey(search.value);
      let count=0;
      for(const row of rendered){const show=row.key.includes(needle);row.li.hidden=!show;if(show)count++;}
      tally.textContent=count+' of '+items.length+' catalogued films'+(needle?' match this search':'')+' · A–Z';
      nothing.hidden=count!==0;
    }
    search.addEventListener('input',()=>{window.clearTimeout(debounce);debounce=window.setTimeout(filter,75);});
    panel.append(searchLabel,tally,list,nothing);container.append(panel);filter();
    container.dataset.rendered='true';
  }
  function showArchive(raw){
    selectSource(raw);
    const total=Array.from(grouped.values()).reduce((n,entries)=>n+entries.length,0);
    const yearsWithFilms=Array.from(grouped.values()).filter(entries=>entries.length).length;
    const stamp=typeof raw?.updatedAt==='string'&&/^\d{4}-\d{2}-\d{2}/.test(raw.updatedAt)?
      ' · Wikidata snapshot '+raw.updatedAt.slice(0,10):' · starter catalogue';
    summary.textContent=total.toLocaleString('en-GB')+' indexed film links across '+yearsWithFilms+
      ' years · 1896–'+currentYear+stamp+' · archive grows as verified records are added';
    archive.replaceChildren();jump.replaceChildren();
    for(const year of years){
      const option=node('option','',String(year));option.value=String(year);jump.append(option);
    }
    let lastDecade;
    for(const year of years){
      const decade=Math.floor(year/10)*10;
      if(lastDecade!==decade){
        lastDecade=decade;
        const label=node('h3','horror-archive__decade',String(decade)+'s');archive.append(label);
      }
      const details=node('details','horror-year');
      details.id='horror-year-'+year;details.dataset.year=String(year);
      const header=node('summary','horror-year__header');
      header.append(node('span','horror-year__year',String(year)));
      const count=grouped.get(year)?.length||0;
      header.append(node('span','horror-year__count',count.toLocaleString('en-GB')+
        (count===1?' FILM': ' FILMS')+(count?'':' · NOT YET CATALOGUED')));
      header.append(node('span','horror-year__chevron','⌄'));
      details.append(header);
      details.addEventListener('toggle',()=>{
        if(details.open&&!details.dataset.rendered)renderYearContents(year,details);
      });
      archive.append(details);
    }
    jump.addEventListener('change',()=>{
      const section=document.getElementById('horror-year-'+jump.value);
      if(!section)return;
      section.open=true;
      section.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
      section.querySelector('summary')?.focus({preventScroll:true});
    });
    const fragment=new URLSearchParams(location.search).get('year');
    if(fragment&&/^\d{4}$/.test(fragment)&&Number(fragment)>=startYear&&Number(fragment)<=currentYear){
      jump.value=fragment;
      const section=document.getElementById('horror-year-'+fragment);
      if(section){section.open=true;section.scrollIntoView({block:'start'});}
    }
  }
  fetch('/data/archive/horror-films.json',{headers:{accept:'application/json'}})
    .then(async response=>{
      if(!response.ok)throw new Error('Archive snapshot unavailable');
      return response.json();
    }).then(showArchive).catch(()=>{
      showArchive({updatedAt:null,films:[],manual:[]});
      const note=node('p','horror-archive__offline','Archive sync is temporarily unavailable. Existing Frightertainment film files remain accessible; try again shortly.');
      summary.after(note);
    });
})();
