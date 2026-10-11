/* All Horror Movies archive detail: reliable first-party destination.
 * This page never trusts arbitrary URLs or user-provided film metadata.
 * A Wikidata ID is a catalogue identity, not proof that an external IMDb page still exists.
 */
(() => {
  'use strict';
  const target=document.getElementById('archive-film-detail');
  if(!target)return;
  const crumb=document.getElementById('archive-film-crumb');
  const id=new URLSearchParams(location.search).get('id')||'';
  const validId=/^Q[1-9]\d*$/.test(id)||/^manual:[a-z0-9-]+$/.test(id);
  const sourceUrl=qid=>'https://www.wikidata.org/wiki/'+qid;
  const imdbSearch=(title,year)=>'https://www.imdb.com/find/?q='+encodeURIComponent(title+' '+year)+'&s=tt';
  const make=(tag,className,text)=>{
    const el=document.createElement(tag);
    if(className)el.className=className;
    if(text!==undefined)el.textContent=text;
    return el;
  };
  const link=(label,url,className='archive-detail__link',external=true)=>{
    const a=make('a',className,label);a.href=url;
    if(external){a.target='_blank';a.rel='noopener noreferrer';}
    return a;
  };
  const safeImdb=value=>typeof value==='string'&&/^tt\d{7,10}$/.test(value)?value:null;
  const heading=title=>{
    const heading=make('h1','archive-detail__title',title);
    document.title=title+' — Horror Film Archive | Frightertainment';
    if(crumb)crumb.textContent=title;
    return heading;
  };
  const render=(film)=>{
    const card=make('div','archive-detail__content');
    const overline=make('span','hub-eyebrow','FRIGHTERTAINMENT · ALL HORROR MOVIES');
    const label=make('p','archive-detail__label',
      (film.streaming?'STREAMING HORROR · ORIGINAL FILM YEAR ':'HISTORICAL FILM RECORD · ')+film.year);
    card.append(overline,heading(film.title),label);
    const media=make('div','archive-detail__media');
    media.dataset.mediaType='movie';media.dataset.mediaTitle=id==='manual:le-manoir-du-diable-1896'?'Le Manoir du diable':film.title;
    media.dataset.mediaYear=String(film.year);media.dataset.mediaEager='true';
    if(film.imdbId)media.dataset.mediaImdb=film.imdbId;
    if(Number.isInteger(film.tmdbId)&&film.tmdbId>0)media.dataset.tmdbId=String(film.tmdbId);
    const art=make('div','archive-detail__art');
    const poster=make('img','archive-detail__poster');
    poster.alt=film.title+' poster';poster.dataset.mediaField='poster';poster.hidden=true;poster.decoding='async';
    const fallback=make('span','archive-detail__poster-fallback','Poster loading…');fallback.dataset.mediaField='poster-status';
    art.append(poster,fallback);
    const copy=make('div','archive-detail__media-copy');
    const rating=make('p','archive-detail__rating','TMDB rating loading…');rating.dataset.mediaField='rating';
    const date=make('p','archive-detail__release','Release date loading…');date.dataset.mediaField='date';
    const overview=make('p','archive-detail__intro','Synopsis loading…');overview.dataset.mediaField='overview';
    const trailer=make('button','archive-detail__link archive-detail__link--main','▶ PLAY TRAILER');
    trailer.type='button';trailer.dataset.mediaField='trailer';trailer.hidden=true;
    const trailerStatus=make('p','archive-detail__disclaimer','Trailer loading…');trailerStatus.dataset.mediaField='trailer-status';
    copy.append(rating,date,overview,trailer,trailerStatus);media.append(art,copy);card.append(media);
    const info=make('div','archive-detail__facts');
    const year=make('div','archive-detail__fact');
    year.append(make('span','','ORIGINAL RELEASE YEAR'),make('strong','',String(film.year)));
    info.append(year);
    if(film.imdbId){
      const idFact=make('div','archive-detail__fact');
      idFact.append(make('span','','IMDb'),make('strong','',film.imdbId));
      info.append(idFact);
    }
    if(film.streaming){
      const platform=make('div','archive-detail__fact');
      platform.append(make('span','','STREAMING / DIGITAL SERVICE'),make('strong','',film.platform));
      const access=make('div','archive-detail__fact');
      access.append(make('span','','VIEWING OPTION'),make('strong','',
        film.access==='free'?'Free to watch (adverts possible)':
        film.access==='rent-buy'?'Digital rent or purchase':'Included with paid subscription'));
      const date=make('div','archive-detail__fact');
      const pretty=new Intl.DateTimeFormat('en-GB',{dateStyle:'long',timeZone:'UTC'})
        .format(new Date(film.streamDate+'T12:00:00Z'));
      date.append(make('span','',
        film.dateBasis==='listed-by'?'PROVIDER AVAILABILITY CHECKED BY':'SOURCE-LINKED PLATFORM RELEASE'),
        make('strong','',pretty));
      info.append(platform,access,date);
      const text=make('p','archive-detail__intro',film.synopsis||
        'This horror film has a source-linked streaming or digital release. Availability may change; check the provider.');
      card.append(text);
    }
    card.append(info);

    const buttons=make('div','archive-detail__actions');
    if(film.imdbId){
      buttons.append(link('OPEN IMDb TITLE →','https://www.imdb.com/title/'+film.imdbId+'/', 'archive-detail__link archive-detail__link--main'));
    }
    buttons.append(link('FIND MOVIE ON IMDb →',imdbSearch(film.title,film.year),
      film.imdbId?'archive-detail__link':'archive-detail__link archive-detail__link--main'));
    if(film.qid) buttons.append(link('WIKIDATA SOURCE →',sourceUrl(film.qid)));
    if(film.sourceUrl)buttons.append(link(film.streaming?'PLATFORM RELEASE SOURCE →':'FILM SOURCE →',film.sourceUrl));
    if(film.streaming&&film.watchUrl)buttons.append(link('CHECK WATCHING OPTIONS →',film.watchUrl));
    card.append(buttons);

    const bottom=make('div','archive-detail__footer');
    bottom.append(link('← ALL HORROR MOVIES','/all-horror-movies.html?year='+film.year,
      'archive-detail__return',false));
    card.append(bottom);
    target.replaceChildren(card);target.setAttribute('aria-busy','false');
  };
  const addExtras = (archiveData,film)=>{
    // Source-driven discoveries, never a claimed review, recommendation or
    // release-platform availability. Shows older film pages are not dead ends.
    const other=(Array.isArray(archiveData.films)?archiveData.films:[])
      .filter(x=>!x.excludedFromMovieArchive && x.year===film.year && x.qid!==film.qid &&
        typeof x.title==='string' && /^Q[1-9]\d*$/.test(x.qid||''))
      .sort((a,b)=>a.title.localeCompare(b.title,'en',{numeric:true,sensitivity:'base'}))
      .slice(0,6);
    const related=make('section','archive-detail__related');
    const sub=make('h2','','MORE HORROR FROM '+film.year);
    related.append(sub);
    if(other.length){
      const list=make('div','archive-detail__related-list');
      const imdbCounts=new Map();
      for(const item of (archiveData.films||[]))if(item.imdbId)imdbCounts.set(item.imdbId,(imdbCounts.get(item.imdbId)||0)+1);
      for(const item of other){
        const filmLink=link(item.title,'/archive-film.html?id='+encodeURIComponent(item.qid),
          'archive-detail__related-link',false);
        filmLink.dataset.mediaType='movie';filmLink.dataset.mediaTitle=item.title;filmLink.dataset.mediaYear=String(item.year);
        if(safeImdb(item.imdbId)&&imdbCounts.get(item.imdbId)===1)filmLink.dataset.mediaImdb=item.imdbId;
        filmLink.replaceChildren();
        const poster=make('img','archive-media__poster');poster.alt=item.title+' poster';poster.loading='lazy';poster.hidden=true;poster.dataset.mediaField='poster';
        const copy=make('span','archive-media__copy');
        const rating=make('span','archive-media__rating','TMDB rating loading…');rating.dataset.mediaField='rating';
        copy.append(make('strong','',item.title),rating);filmLink.append(poster,copy);list.append(filmLink);
      }
      related.append(list);
    }else{
      related.append(make('p','','Browse another year to discover more horror films.'));
    }
    const seeAll=link('BROWSE ALL '+film.year+' HORROR →','/all-horror-movies.html?year='+film.year,
      'archive-detail__return',false);
    related.append(seeAll);
    target.append(related);

    if(!film.qid)return;
    fetch('/data/archive/profiles.json',{headers:{accept:'application/json'}})
      .then(async r=>r.ok?await r.json():null)
      .then(data=>{
        const profile=data?.records?.[film.qid];
        if(!profile || profile.qid!==film.qid)return;
        const section=make('section','archive-detail__metadata');
        section.append(make('span','hub-eyebrow','CAST & CREDITS'),
          make('h2','','BEHIND THE FEAR.'));
        if(profile.description){
          const line=make('p','archive-detail__description',
            profile.description);
          section.append(line);
        }
        const fields=[
          ['DIRECTED BY',profile.directors],
          ['SELECTED CAST',profile.cast],
          ['GENRE TAGS',profile.genres],
          ['PRODUCTION COUNTRY',profile.countries]
        ];
        const grid=make('div','archive-detail__metadata-grid');
        for(const [title,values] of fields){
          if(!Array.isArray(values)||!values.length)continue;
          const panel=make('div','archive-detail__metadata-item');
          panel.append(make('h3','',title));
          for(const p of values.filter(x=>x && typeof x.name==='string' &&
               /^Q[1-9]\d*$/.test(x.qid||''))){
            const a=link(p.name,'https://www.wikidata.org/wiki/'+p.qid,
              'archive-detail__metadata-person');
            panel.append(a);
          }
          grid.append(panel);
        }
        if(Number.isInteger(profile.runtimeMinutes)&&profile.runtimeMinutes>=1&&profile.runtimeMinutes<=500){
          const panel=make('div','archive-detail__metadata-item');
          panel.append(make('h3','','CATALOGUED RUNTIME'),
            make('strong','',profile.runtimeMinutes+' minutes'));grid.append(panel);
        }
        if(grid.children.length)section.append(grid);
        const check=make('p','archive-detail__metadata-credit',
          'Film credits: Wikidata');
        section.append(check,link('OPEN ORIGINAL WIKIDATA FILM RECORD →',
          'https://www.wikidata.org/wiki/'+film.qid));
        related.before(section);
      }).catch(()=>{/* Film link and essential record remain usable without enrichment. */});
  };
  const error=(message)=>{
    const panel=make('div','archive-detail__content');
    panel.append(make('span','hub-eyebrow','FRIGHTERTAINMENT · FILM VAULT'),heading('FILM RECORD UNAVAILABLE'),
      make('p','archive-detail__intro',message),
      link('← RETURN TO ALL HORROR MOVIES','/all-horror-movies.html','archive-detail__return',false));
    target.replaceChildren(panel);target.setAttribute('aria-busy','false');
  };
  if(!validId){
    error('That film identifier is invalid. Browse the archive and choose a title.');
    return;
  }
  Promise.all([
    fetch('/data/archive/horror-films.json',{headers:{accept:'application/json'}})
      .then(async response=>{
        if(!response.ok)throw new Error('The film reference catalogue is temporarily unavailable');
        return response.json();
      }),
    id.startsWith('manual:stream-')
      ? fetch('/data/streaming-discovery.json',{headers:{accept:'application/json'}})
          .then(async r=>r.ok?r.json():null).catch(()=>null)
      : Promise.resolve(null)
  ])
    .then(([data,streaming])=>{
      if(id.startsWith('manual:stream-')){
        const wanted=id.slice('manual:stream-'.length);
        const entry=streaming?.schemaVersion===1&&Array.isArray(streaming.entries)
          ?streaming.entries.find(x=>x.id===wanted):null;
        if(!entry||typeof entry.title!=='string'||!Number.isInteger(entry.filmYear)||
           entry.filmYear<1896||entry.filmYear>new Date().getUTCFullYear()+2||
           !/^d{4}-d{2}-d{2}$/.test(entry.streamDate||'')||
           !/^https://[^/s]+/.test(entry.sourceUrl||'')){
          error('That streaming film is not in the current source-checked inventory.');return;
        }
        const page={
          title:entry.title,year:entry.filmYear,sourceUrl:entry.sourceUrl,
          watchUrl:/^https://[^/s]+/.test(entry.watchUrl||'')?entry.watchUrl:null,
          platform:entry.platform,access:entry.access,streamDate:entry.streamDate,dateBasis:entry.dateBasis,
          synopsis:entry.synopsis,tmdbId:entry.tmdbId,streaming:true
        };
        render(page);
        addExtras(data,page);
        return;
      }
      // Wikidata can occasionally give two different films the same IMDb ID.
      // Such identifiers cannot safely be presented as exact links.
      const imdbCounts=new Map();
      for(const candidate of (Array.isArray(data.films)?data.films:[])){
        const candidateId=safeImdb(candidate.imdbId);
        if(candidateId) imdbCounts.set(candidateId,(imdbCounts.get(candidateId)||0)+1);
      }
      const reliableImdb=id=>id && imdbCounts.get(id)===1?id:null;
      if(id.startsWith('Q')){
        const row=(Array.isArray(data.films)?data.films:[]).find(x=>x.qid===id && !x.excludedFromMovieArchive);
        if(!row || typeof row.title!=='string' || !Number.isInteger(row.year)){
          error('This record is not in the current archive. It might have been corrected. Try searching by year again.');return;
        }
        const film={title:row.title,year:row.year,imdbId:reliableImdb(safeImdb(row.imdbId)),qid:row.qid};
        render(film);addExtras(data,film);
        return;
      }
      const row=(Array.isArray(data.manual)?data.manual:[]).find(x=>x.id===id);
      if(!row || typeof row.title!=='string' || !Number.isInteger(row.year)){
        error('This manually sourced record is not in the current archive. Try searching by year again.');return;
      }
      let source;
      try{const url=new URL(row.url);if(url.protocol==='https:')source=url.href;}catch{}
      const film={title:row.title,year:row.year,imdbId:safeImdb(row.imdbId),sourceUrl:source};
      render(film);addExtras(data,film);
    })
    .catch(()=>error('The film reference catalogue could not be loaded. Please return to All Horror Movies and try again.'));
})();
