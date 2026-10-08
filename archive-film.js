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
    const label=make('p','archive-detail__label','HISTORICAL FILM RECORD · '+film.year);
    card.append(overline,heading(film.title),label);
    const info=make('div','archive-detail__facts');
    const year=make('div','archive-detail__fact');
    year.append(make('span','','ORIGINAL RELEASE YEAR'),make('strong','',String(film.year)));
    info.append(year);
    if(film.imdbId){
      const idFact=make('div','archive-detail__fact');
      idFact.append(make('span','','IMDb IDENTIFIER IN WIKIDATA'),make('strong','',film.imdbId));
      info.append(idFact);
    }
    card.append(info);
    const explanation=make('p','archive-detail__intro',
      'Explore this horror film using the available catalogue links. Its entry is stored in the Frightertainment archive and will remain there when new titles are added.');
    card.append(explanation);
    const buttons=make('div','archive-detail__actions');
    if(film.imdbId){
      buttons.append(link('OPEN IMDb TITLE ↗','https://www.imdb.com/title/'+film.imdbId+'/', 'archive-detail__link archive-detail__link--main'));
    }
    buttons.append(link('FIND MOVIE ON IMDb ↗',imdbSearch(film.title,film.year),
      film.imdbId?'archive-detail__link':'archive-detail__link archive-detail__link--main'));
    if(film.qid) buttons.append(link('WIKIDATA SOURCE ↗',sourceUrl(film.qid)));
    if(film.sourceUrl)buttons.append(link('FILM SOURCE ↗',film.sourceUrl));
    card.append(buttons);
    const note=make('p','archive-detail__disclaimer',
      'IMDb title IDs are provided by Wikidata and can become outdated, incorrect or unavailable in some regions. If the direct link does not work, use IMDb search or the source record above.');
    card.append(note);
    const bottom=make('div','archive-detail__footer');
    bottom.append(link('← ALL HORROR MOVIES','/all-horror-movies.html?year='+film.year,
      'archive-detail__return',false));
    card.append(bottom);
    target.replaceChildren(card);target.setAttribute('aria-busy','false');
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
  fetch('/data/archive/horror-films.json',{headers:{accept:'application/json'}})
    .then(async response=>{
      if(!response.ok)throw new Error('The film reference catalogue is temporarily unavailable');
      return response.json();
    })
    .then(data=>{
      if(id.startsWith('Q')){
        const row=(Array.isArray(data.films)?data.films:[]).find(x=>x.qid===id);
        if(!row || typeof row.title!=='string' || !Number.isInteger(row.year)){
          error('This record is not in the current archive. It might have been corrected. Try searching by year again.');return;
        }
        render({title:row.title,year:row.year,imdbId:safeImdb(row.imdbId),qid:row.qid});
        return;
      }
      const row=(Array.isArray(data.manual)?data.manual:[]).find(x=>x.id===id);
      if(!row || typeof row.title!=='string' || !Number.isInteger(row.year)){
        error('This manually sourced record is not in the current archive. Try searching by year again.');return;
      }
      let source;
      try{const url=new URL(row.url);if(url.protocol==='https:')source=url.href;}catch{}
      render({title:row.title,year:row.year,imdbId:safeImdb(row.imdbId),sourceUrl:source});
    })
    .catch(()=>error('The film reference catalogue could not be loaded. Please return to All Horror Movies and try again.'));
})();
