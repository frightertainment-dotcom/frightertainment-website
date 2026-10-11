/* All Horror Movies: indexed year-by-year titles from first-party film files
 * and the growing CC0 Wikidata reference snapshot, enriched through TMDB.
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
    // Only the source-verified original film-year claim belongs in the year
    // archive. Territory release years and dates are separate facts.
    const year=claims.find(c=>c.field==='filmYear')?.value;
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
  const validRecord=x=>x && !x.excludedFromMovieArchive && /^Q[1-9][0-9]*$/.test(x.qid||'') &&
    typeof x.title==='string' && x.title.trim().length>1 && x.title.length<=240 &&
    Number.isInteger(x.year) && x.year>=startYear && x.year<=currentYear+2 &&
    (!x.imdbId || /^tt\d{7,10}$/.test(x.imdbId));
  const normalizeWikidata=x=>({
    id:'wd:'+x.qid,
    title:x.title.trim(),
    year:x.year,imdbId:x.imdbId,
    // Always land on our own reliable detail page first. External IMDb records
    // can disappear, block access, or contain stale/mismatched Wikidata IDs.
    href:'/archive-film.html?id='+encodeURIComponent(x.qid),
    linkLabel:'FILM DETAILS',
    source:'Wikidata CC0',
    local:true
  });
  const manualRecord=x=>x && /^(?:manual:[a-z0-9-]+|wd:Q[1-9][0-9]*)$/.test(x.id||'') &&
    typeof x.title==='string' && x.title.trim().length>1 &&
    Number.isInteger(x.year) && x.year>=startYear && x.year<=currentYear &&
    /^https:\/\//.test(x.url||'');
  const normalizeManual=x=>({
    id:x.id,title:x.title.trim(),year:x.year,imdbId:x.imdbId,
    href:'/archive-film.html?id='+encodeURIComponent(x.id),
    linkLabel:'FILM DETAILS',
    source:'Manually checked source',local:true
  });
  const years=Array.from({length:currentYear-startYear+1},(_,index)=>currentYear-index);
  const grouped=new Map(years.map(y=>[y,[]]));
  const selectSource=raw=>{
    const records=new Map();
    const imdbCounts=new Map();
    for(const item of (raw?.films||[]))if(item.imdbId)imdbCounts.set(item.imdbId,(imdbCounts.get(item.imdbId)||0)+1);
    for(const record of (raw?.films||[])){
      if(validRecord(record)) records.set('wd:'+record.qid,normalizeWikidata(record));
    }
    for(const record of (raw?.manual||[])){
      if(manualRecord(record))records.set(record.id,normalizeManual(record));
    }
    // The BFI's 1896 Le Manoir du diable is also catalogued under
    // the English title The Haunted Castle (Wikidata Q153603).
    // Collapse the two references to one film in the displayed year.
    if(records.has('manual:le-manoir-du-diable-1896'))records.delete('wd:Q153603');
    // First-party film pages take priority when a title/year appears in Wikidata.
    const localKeys=new Set(officialLocal.map(x=>x.year+'|'+titleKey(x.title)));
    for(const record of records.values()){
      if(record.imdbId&&imdbCounts.get(record.imdbId)>1)delete record.imdbId;
      if(record.year>currentYear || localKeys.has(record.year+'|'+titleKey(record.title)))continue;
      grouped.get(record.year)?.push(record);
    }
    for(const record of officialLocal)grouped.get(record.year)?.push(record);
    for(const entries of grouped.values()){
      entries.sort((a,b)=>collator.compare(a.title,b.title)||collator.compare(a.id,b.id));
    }
  };

  // Source-verified streaming-first records fill gaps in the 2025/2026 Horror Vault.
  // Streaming availability never rewrites a film's original release year.
  function addStreamingSupplement(source){
    const today=new Date().toISOString().slice(0,10);
    const entries=source?.schemaVersion===1&&Array.isArray(source.entries)?source.entries:[];
    const known=new Set([...grouped.values()].flat().map(x=>x.year+'|'+titleKey(x.title)));
    for(const e of entries){
      if(!e||!/^[a-z0-9-]+$/.test(e.id||'')||
        typeof e.title!=='string'||e.title.trim().length<2||
        !Number.isInteger(e.filmYear)||e.filmYear<2025||e.filmYear>currentYear||
        !/^\d{4}-\d{2}-\d{2}$/.test(e.streamDate||'')||e.streamDate>today||
        !/^https:\/\/[^/\s]+/.test(e.sourceUrl||''))continue;
      const key=e.filmYear+'|'+titleKey(e.title);
      if(known.has(key))continue;
      known.add(key);
      grouped.get(e.filmYear)?.push({
        id:'manual:stream-'+e.id,title:e.title.trim(),year:e.filmYear,
        imdbId:/^tt[0-9]{7,10}$/.test(e.imdbId||'')?e.imdbId:null,
        href:'/archive-film.html?id='+encodeURIComponent('manual:stream-'+e.id),
        linkLabel:'STREAMING FILM DETAILS',
        source:'Source-checked '+e.platform+' film release',local:true
      });
    }
    for(const rows of grouped.values()){
      rows.sort((a,b)=>collator.compare(a.title,b.title)||collator.compare(a.id,b.id));
    }
  }
  function enableVaultSearch(){
    const field=document.getElementById('archive-global-search');
    const results=document.getElementById('archive-global-results');
    const status=document.getElementById('archive-global-status');
    const clear=document.getElementById('archive-global-clear');
    if(!field||!results||!status||!clear)return;
    const all=Array.from(grouped.values()).flat();
    let timer=0;
    const render=()=>{
      const q=titleKey(field.value);
      clear.hidden=!q;
      results.replaceChildren();
      if(q.length<2){results.hidden=true;status.textContent=q?'Type at least two characters to search.':'Or select any year below for an A–Z list.';return;}
      const matches=all.filter(x=>titleKey(x.title).includes(q)).sort((a,b)=>collator.compare(a.title,b.title)||b.year-a.year);
      const limit=75;
      const shown=matches.slice(0,limit);
      status.textContent=matches.length.toLocaleString('en-GB')+' matching film'+(matches.length===1?'':'s')+
        (matches.length>limit?' · Showing the first '+limit.toString():'');
      results.hidden=false;
      for(const film of shown){
        const a=document.createElement('a');
        a.href=film.href;
        a.className='horror-vault-search__result';
        addMedia(a,film,node('strong','',film.title),film.year+' · FILM DETAILS →');
        results.append(a);
      }
      if(!matches.length)results.append(node('p','horror-year__empty','No matching film found. Try an alternative title.'));
    };
    field.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(render,90);});
    clear.addEventListener('click',()=>{field.value='';render();field.focus();});
  }
  const node=(tag,className,text)=>{
    const n=document.createElement(tag);
    if(className)n.className=className;
    if(text!==undefined)n.textContent=text;
    return n;
  };
  function addMedia(container,film,title,detail){
    container.dataset.mediaType='movie';
    container.dataset.mediaTitle=film.id==='manual:le-manoir-du-diable-1896'?'Le Manoir du diable':film.title;
    container.dataset.mediaYear=String(film.year);
    if(film.imdbId)container.dataset.mediaImdb=film.imdbId;
    const poster=node('img','archive-media__poster');
    poster.alt=film.title+' poster';poster.loading='lazy';poster.decoding='async';poster.hidden=true;
    poster.dataset.mediaField='poster';
    const copy=node('span','archive-media__copy');
    const rating=node('span','archive-media__rating','TMDB rating loading…');rating.dataset.mediaField='rating';
    copy.append(title,rating,node('span','horror-year__film-type',detail));
    container.append(poster,copy);
  }
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
      const link=node('a','horror-year__film-link');
      link.href=item.href;
      if(!item.local){link.target='_blank';link.rel='noopener noreferrer';}
      link.setAttribute('aria-label','View film information for '+item.title+' ('+year+')');
      addMedia(link,item,node('span','horror-year__film-title',item.title),item.linkLabel);
      // Entire card, including the right-hand FILM DETAILS label, is clickable.
      li.append(link);
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
    panel.append(tally,list,nothing);container.append(searchLabel,panel);filter();
    container.dataset.rendered='true';
  }
  function showArchive(raw,streaming){
    selectSource(raw);
    addStreamingSupplement(streaming);
    enableVaultSearch();
    const total=Array.from(grouped.values()).reduce((n,entries)=>n+entries.length,0);
    const yearsWithFilms=Array.from(grouped.values()).filter(entries=>entries.length).length;
    summary.textContent=total.toLocaleString('en-GB')+' horror films across '+yearsWithFilms+' years · 1896–'+currentYear;
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
    const selectYear=(value,{scroll=true,focus=false}={})=>{
      if(!/^\d{4}$/.test(String(value))||Number(value)<startYear||Number(value)>currentYear)return;
      jump.value=String(value);
      const section=document.getElementById('horror-year-'+jump.value);
      if(!section)return;
      archive.querySelectorAll('.horror-year[open]').forEach(openYear=>{
        if(openYear!==section)openYear.open=false;
      });
      section.open=true;
      if(scroll)section.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
      if(focus)section.querySelector('summary')?.focus({preventScroll:true});
    };
    jump.addEventListener('change',()=>{
      const value=jump.value;
      selectYear(value,{focus:true});
      history.pushState({year:value},'',`${location.pathname}?year=${encodeURIComponent(value)}`);
    });
    const fragment=new URLSearchParams(location.search).get('year');
    if(fragment&&/^\d{4}$/.test(fragment)&&Number(fragment)>=startYear&&Number(fragment)<=currentYear){
      selectYear(fragment,{scroll:true});
    }
    window.addEventListener('popstate',()=>{
      const value=new URLSearchParams(location.search).get('year');
      if(value&&/^\d{4}$/.test(value))selectYear(value,{scroll:true});
      else{
        jump.value='';
        archive.querySelectorAll('.horror-year[open]').forEach(openYear=>{openYear.open=false;});
      }
    });
  }
  Promise.all([
    fetch('/data/archive/horror-films.json',{headers:{accept:'application/json'}})
      .then(async response=>{
        if(!response.ok)throw new Error('Archive snapshot unavailable');
        return response.json();
      }),
    fetch('/data/streaming-discovery.json',{headers:{accept:'application/json'}})
      .then(async response=>response.ok?response.json():null).catch(()=>null)
  ]).then(([archiveData,streamingData])=>showArchive(archiveData,streamingData)).catch(()=>{
      showArchive({updatedAt:null,films:[],manual:[]},null);
      const note=node('p','horror-archive__offline','Archive sync is temporarily unavailable. Existing Frightertainment film files remain accessible; try again shortly.');
      summary.after(note);
    });
})();
