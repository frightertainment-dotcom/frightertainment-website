/* Frightertainment PRIVATE PREVIEW comparison. No network access or data harvesting.
 * These are manually checked publisher snapshots, NOT the Fright Index,
 * NOT a licensed/automatically updated Rotten Tomatoes integration.
 * Never publish this comparison on the public domain without contractual clearance.
 */
(() => {
  'use strict';
  const preview = /(?:^|\.)frightertainment-private-preview\.pages\.dev$/.test(location.hostname) ||
    ['127.0.0.1','localhost'].includes(location.hostname);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const yearOf = film => {
    const claims = Array.isArray(film.claims) ? film.claims : [];
    const year = claims.find(c=>c.field==='filmYear'||c.field==='releaseYear')?.value ||
      claims.find(c=>c.field==='releaseDate')?.value?.slice(0,4);
    return /^\d{4}$/.test(String(year)) ? Number(year) : null;
  };
  const safeSource = raw => {
    try {
      const url=new URL(raw);
      return url.protocol==='https:' && url.hostname==='www.rottentomatoes.com' &&
        /^\/m\/[a-z0-9_]+$/.test(url.pathname) ? url.href : null;
    } catch { return null; }
  };
  const checkedSnapshot = film => {
    const items=Array.isArray(film.criticReferenceSnapshots)?film.criticReferenceSnapshots:[];
    return items.find(item =>
      item.source==='Rotten Tomatoes' &&
      item.kind==='positive-review-percentage' &&
      Number.isInteger(item.value) && item.value>=0 && item.value<=100 &&
      Number.isInteger(item.criticCount) && item.criticCount>0 &&
      /^\d{4}-\d{2}-\d{2}$/.test(item.checked||'') &&
      Date.parse(item.checked+'T00:00:00Z')<=Date.now() &&
      safeSource(item.url)) || null;
  };
  const build = (films,year) => {
    const relevant=(Array.isArray(films)?films:[]).filter(film =>
      film.editorialStatus==='approved' && yearOf(film)===Number(year));
    const ranked=relevant.flatMap(film => {
      const snapshot=checkedSnapshot(film);
      return snapshot?[{id:film.id,title:film.title,score:snapshot.value,reviewCount:snapshot.criticCount,
        sourceUrl:safeSource(snapshot.url),checkedAt:snapshot.checked}]:[];
    }).sort((a,b)=>b.score-a.score||b.reviewCount-a.reviewCount||a.title.localeCompare(b.title))
      .slice(0,20).map((row,i)=>({...row,position:i+1}));
    const unscored=relevant.filter(film=>!checkedSnapshot(film))
      .map(({id,title})=>({id,title})).sort((a,b)=>a.title.localeCompare(b.title));
    return {year:Number(year),ranked,unscored,eligible:relevant.length,
      lastChecked:ranked.map(x=>x.checkedAt).sort().at(-1)||null,preview};
  };
  window.FrightertainmentPreviewRankings={build,preview,esc};
})();
