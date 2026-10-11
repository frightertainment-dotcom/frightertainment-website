const BASE = 'https://api.themoviedb.org/3';
const today = () => new Date().toISOString().slice(0, 10);
const date = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value : null;
const text = (value, max = 4000) => typeof value === 'string' ? value.slice(0, max) : '';
export const normalizeTitle = value => text(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim();
export const safePoster = value => /^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\.(?:jpg|png|webp)$/i.test(value || '') ? value : null;
export async function tmdbRequest(env, path, parameters = {}) {
  if (env.TMDB_NONCOMMERCIAL_USE_APPROVED !== 'true' || env.TMDB_ATTRIBUTION_READY !== 'true' || !env.TMDB_READ_ACCESS_TOKEN) throw new Error('TMDB access is not configured');
  const url = new URL(BASE + path);
  for (const [key, value] of Object.entries(parameters)) if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  const response = await fetch(url, { headers: { Authorization: `Bearer ${env.TMDB_READ_ACCESS_TOKEN}`, accept: 'application/json' }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`TMDB request failed (${response.status})`);
  return response.json();
}
export function officialTrailer(videos) {
  const video = (videos?.results || []).filter(v => v.site === 'YouTube' && v.official === true && /^(Trailer|Teaser)$/.test(v.type) && /^[A-Za-z0-9_-]{11}$/.test(v.key || ''))
    .sort((a, b) => (b.type === 'Trailer') - (a.type === 'Trailer') || (b.iso_639_1 === 'en') - (a.iso_639_1 === 'en') || String(b.published_at || '').localeCompare(a.published_at || ''))[0];
  return video ? { key: video.key, videoId: video.key, name: text(video.name, 240), type: video.type, url: `https://www.youtube.com/watch?v=${video.key}`, embedUrl: `https://www.youtube-nocookie.com/embed/${video.key}`, source: 'TMDB official video listing' } : null;
}
export function sanitizeMedia(raw, type, country = 'GB') {
  if (!Number.isInteger(raw?.id) || raw.id <= 0 || raw.adult === true) return null;
  const title = text(raw.title || raw.name || raw.original_title || raw.original_name, 240);
  if (!title) return null;
  const firstReleaseDate = date(type === 'tv' ? raw.first_air_date : raw.release_date);
  const regional = type === 'movie' ? (raw.release_dates?.results || []).find(row => row.iso_3166_1 === country) : null;
  const regionalDates = (regional?.release_dates || []).filter(row => [2, 3, 4, 5, 6].includes(row.type) && date(String(row.release_date || '').slice(0, 10))).sort((a, b) => a.release_date.localeCompare(b.release_date));
  const releaseDate = regionalDates.length ? regionalDates[0].release_date.slice(0, 10) : firstReleaseDate;
  const releaseCountry = regionalDates.length ? country : type === 'tv' ? 'Original broadcast' : 'Global';
  const trailer = officialTrailer(raw.videos);
  const posterPath = safePoster(raw.poster_path);
  const voteCount = Number.isInteger(raw.vote_count) && raw.vote_count >= 0 ? raw.vote_count : 0;
  const voteAverage = voteCount > 0 && Number.isFinite(raw.vote_average) && raw.vote_average >= 0 && raw.vote_average <= 10 ? raw.vote_average : null;
  return { id: `tmdb-${type}-${raw.id}`, tmdbId: raw.id, type, mediaType: type, title, overview: text(raw.overview), posterPath, posterUrl: posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : null,
    voteAverage, voteCount, ratingKind: 'tmdb-community', releaseDate, firstReleaseDate, releaseCountry, releaseTerritory: releaseCountry,
    releaseLabel: releaseDate ? `${releaseCountry === 'Global' ? 'First release' : releaseCountry === 'Original broadcast' ? 'First aired' : `${country} release`}: ${releaseDate}` : 'Release date unavailable',
    releaseStatus: releaseDate ? releaseDate <= today() ? 'released' : 'upcoming' : 'unknown',
    genres: (raw.genres || []).map(g => ({ id: g.id, name: text(g.name, 80) })), genreIds: raw.genre_ids || (raw.genres || []).map(g => g.id),
    trailer, trailerVideoId: trailer?.key || null, sourceName: 'TMDB', sourceUrl: `https://www.themoviedb.org/${type}/${raw.id}`, territory: 'Global', checkedAt: today() };
}
export async function fetchMedia(env, options) {
  const type = options.type === 'tv' ? 'tv' : 'movie';
  let mediaId = Number(options.id) || null;
  if (!mediaId && options.imdb) {
    const result = await tmdbRequest(env, `/find/${options.imdb}`, { external_source: 'imdb_id', language: 'en-GB' });
    const matches = result[type === 'tv' ? 'tv_results' : 'movie_results'] || [];
    if (matches.length !== 1) return null;
    mediaId = matches[0].id;
  }
  if (!mediaId) {
    const result = await tmdbRequest(env, `/search/${type}`, { query: options.title, include_adult: false, language: 'en-GB' });
    const matches = (result.results || []).filter(item => {
      const titleMatches = [item.title, item.original_title, item.name, item.original_name].some(t => normalizeTitle(t) === normalizeTitle(options.title));
      const year = Number(String(type === 'tv' ? item.first_air_date : item.release_date).slice(0, 4));
      return titleMatches && (!options.year || year === Number(options.year));
    });
    // Never guess between remakes or similarly named films.
    if (matches.length !== 1) return null;
    mediaId = matches[0].id;
  }
  const raw = await tmdbRequest(env, `/${type}/${mediaId}`, { language: 'en-US', append_to_response: type === 'tv' ? 'videos,keywords' : 'videos,release_dates,keywords' });
  return sanitizeMedia(raw, type, options.country || 'GB');
}
const MAJOR_PRODUCERS = /\b(warner bros|walt disney|disney pictures|marvel studios|lucasfilm|universal pictures|paramount pictures|columbia pictures|20th century|twentieth century|new line cinema|sony pictures|screen gems|tristar pictures|tri star pictures|lionsgate|summit entertainment|netflix studios|amazon studios|amazon mgm studios|dreamworks|metro goldwyn mayer|mgm pictures)\b/i;
export function independentAssessment(raw) {
  const companies = (raw.production_companies || []).map(c => text(c.name, 240)).filter(Boolean);
  const majorProduction = companies.some(name => MAJOR_PRODUCERS.test(name.replace(/[^a-z0-9]+/gi, ' ')));
  const highBudget = Number(raw.budget) >= 30_000_000;
  // Distribution is not a production credit. A major distributor does not automatically disqualify an independent production.
  return { independent: companies.length > 0 && !majorProduction && !highBudget, classification: companies.length ? majorProduction ? 'major-studio-production' : highBudget ? 'large-budget-production' : 'independent-production-candidate' : 'production-unconfirmed', productionCompanies: companies, budget: Number(raw.budget) > 0 ? Number(raw.budget) : null, budgetKnown: Number(raw.budget) > 0, marketingBudgetVerified: false };
}
export const INDIE_POLICY = 'Independent production candidates: TMDB horror films with named production companies, no listed major studio producer, and no reported budget of US$30 million or more. Major distribution alone does not exclude a film. Unknown budgets and marketing spend are not treated as verified; TMDB does not certify independent status.';
const TV_POLICY = 'Horror television tagged with the exact horror or horror anthology keyword in TMDB. Popularity indicates trending within this catalogue, not a platform viewing chart. Archive years refer to first broadcast, not every season.';
async function horrorKeywords(env) {
  const replies = await Promise.all(['horror', 'horror anthology'].map(query => tmdbRequest(env, '/search/keyword', { query })));
  const ids = replies.flatMap((reply, index) => (reply.results || []).filter(k => k.name?.toLowerCase() === ['horror', 'horror anthology'][index]).map(k => k.id)).filter(Number.isInteger);
  if (!ids.length) throw new Error('Horror television classification is unavailable');
  return [...new Set(ids)];
}
async function mapBounded(items, fn) {
  const results = new Array(items.length); const errors = []; let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, items.length) }, async () => {
    while (next < items.length) { const index = next++; try { results[index] = await fn(items[index]); } catch (error) { results[index] = null; if (!String(error.message).includes('(404)')) errors.push(error); } }
  }));
  if (errors.length) throw new Error('TMDB catalogue detail refresh incomplete');
  return results.filter(Boolean);
}
// Watching offers are NOT proof that the film first premiered on a streaming platform.
export async function fetchStreamingAvailability(env,options) {
  const region=options.country==='US'?'US':'GB';
  const access=['subscription','free','rent-buy'].includes(options.access)?options.access:'all';
  const kinds={
    all:['flatrate','free','ads','rent','buy'],
    subscription:['flatrate'],
    free:['free','ads'],
    'rent-buy':['rent','buy']
  };
  const page=Number(options.page)||1,year=Number(options.year);
  const query={
    language:'en-GB',include_adult:false,include_video:false,page,
    with_genres:27,watch_region:region,
    with_watch_monetization_types:kinds[access].join('|'),
    sort_by:'popularity.desc','primary_release_date.lte':today()
  };
  if(Number.isInteger(year)&&year>=1888&&year<=new Date().getUTCFullYear()){
    query['primary_release_date.gte']=year+'-01-01';
    query['primary_release_date.lte']=year+'-12-31'<today()?year+'-12-31':today();
  }
  const discovered=await tmdbRequest(env,'/discover/movie',query);
  const candidates=(discovered.results||[]).filter(x=>x.adult!==true&&
    Number.isInteger(x.id)&&Array.isArray(x.genre_ids)&&x.genre_ids.includes(27));
  const verified=await mapBounded(candidates.slice(0,20),async raw=>{
    const data=await tmdbRequest(env,'/movie/'+raw.id+'/watch/providers');
    const local=data.results?.[region];
    if(!local)return null;
    const groups={
      subscription:local.flatrate||[],
      free:[...(local.free||[]),...(local.ads||[])],
      'rent-buy':[...(local.rent||[]),...(local.buy||[])]
    };
    const accessTypes=Object.entries(groups).filter(([,options])=>options.length)
      .map(([kind])=>kind);
    if(!accessTypes.length||(access!=='all'&&!accessTypes.includes(access)))return null;
    const active=access==='all'?Object.values(groups).flat():groups[access];
    const providerNames=[...new Set((active||[]).filter(x=>typeof x.provider_name==='string')
      .map(x=>x.provider_name.slice(0,60)))].slice(0,6);
    let watchLink=null;
    try{
      const u=new URL(local.link);
      if(u.protocol==='https:'&&u.hostname==='www.themoviedb.org'&&!u.username&&!u.password)
        watchLink=u.href;
    }catch{}
    const item=sanitizeMedia(raw,'movie',region);
    return item?{...item,providerNames,accessTypes,watchLink,
      providerSourceName:'TMDB / JustWatch',providerRegion:region,
      providerCheckedAt:today(),streamingPremiereVerified:false}:null;
  });
  const seen=new Set();
  const items=verified.filter(x=>!seen.has(x.tmdbId)&&seen.add(x.tmdbId));
  const totalPages=Math.min(500,Math.max(1,Number(discovered.total_pages)||1));
  return {items,page,nextPage:page<totalPages?page+1:null,totalPages,
    country:region,year:Number.isInteger(year)&&year>=1888?year:null,access,
    mode:'streaming-watch',providerSourceName:'TMDB / JustWatch',checkedAt:today(),
    methodology:'Regional watching offers from TMDB powered by JustWatch. These do not establish first premiere or theatrical history. Free/ad-supported, subscription and digital rent/buy are distinct; check providers for current rights and prices.'};
}

export async function fetchCatalogue(env, options) {
  if(options.mode==='streaming-watch')return fetchStreamingAvailability(env,options);
  const kind = options.type; const type = kind === 'tv' ? 'tv' : 'movie';
  const mode = options.mode === 'chart' ? 'top' : options.mode;
  const year = Number(options.year); const page = Number(options.page) || 1;
  const chart = mode === 'top'; const cinema = ['cinema','cinema-recent'].includes(mode); const recentCinema = mode === 'cinema-recent';
  const recentFrom = new Date(Date.now() - 90 * 86400000).toISOString().slice(0,10);
  const end = `${year}-12-31` < today() ? `${year}-12-31` : today();
  const keywordIds = type === 'tv' ? await horrorKeywords(env) : [];
  const parameters = { language: 'en-GB', include_adult: false, include_video: false, page,
    sort_by: chart ? 'vote_average.desc' : recentCinema ? 'release_date.desc' : mode === 'cinema' ? 'release_date.asc' : mode === 'upcoming' ? type === 'tv' ? 'first_air_date.asc' : 'primary_release_date.asc' : 'popularity.desc',
    ...(type === 'tv' ? { with_keywords: keywordIds.join('|'), include_null_first_air_dates: false } : { with_genres: 27 }) };
  const field = type === 'tv' ? 'first_air_date' : 'primary_release_date';
  if (['archive', 'top'].includes(mode)) { parameters[`${field}.gte`] = `${year}-01-01`; parameters[`${field}.lte`] = chart ? end : `${year}-12-31`; }
  if (mode === 'upcoming' || mode === 'cinema') { const releaseField = mode === 'cinema' ? 'release_date' : field; parameters[`${releaseField}.gte`] = new Date(Date.now() + 86400000).toISOString().slice(0, 10); parameters[`${releaseField}.lte`] = `${new Date().getUTCFullYear() + 2}-12-31`; }
  if (cinema) { parameters.region = options.country || 'GB'; parameters.with_release_type = '3|2'; }
  if (recentCinema) { parameters['release_date.gte'] = recentFrom; parameters['release_date.lte'] = today(); }
  if (mode === 'trending') parameters[`${field}.lte`] = today();
  if (chart) parameters['vote_count.gte'] = 50;
  if (mode === 'trending') parameters['vote_count.gte'] = 5;
  const search = !!options.query;
  if (search) { parameters.query = options.query; delete parameters.with_genres; delete parameters.with_keywords; }
  const path = search ? `/search/${type}` : `/discover/${type}`;
  const first = await tmdbRequest(env, path, parameters);
  const totalPages = Math.min(500, Number(first.total_pages) || 1);
  // Both independent status and UK theatrical dates need detail verification.
  // Screen a bounded two-page pool so a page of false candidates is not shown as empty.
  const extra = (kind === 'indie' || cinema) && !search && page < totalPages ? await tmdbRequest(env, path, { ...parameters, page: page + 1 }) : null;
  let candidates = [...(first.results || []), ...(extra?.results || [])].filter(raw => raw.adult !== true && safePoster(raw.poster_path) && Number.isInteger(raw.id));
  if (type === 'movie') candidates = candidates.filter(raw => raw.genre_ids?.includes(27));
  if (search && ['archive', 'top'].includes(mode)) candidates = candidates.filter(raw => Number(String(type === 'tv' ? raw.first_air_date : raw.release_date).slice(0, 4)) === year);
  let items;
  if (kind === 'indie' || (type === 'tv' && search) || cinema) {
    items = await mapBounded(candidates.slice(0, 40), async candidate => {
      const raw = await tmdbRequest(env, `/${type}/${candidate.id}`, { language: 'en-US', append_to_response: type === 'tv' ? 'videos,keywords' : 'videos,release_dates' });
      if (cinema) {
        const region = options.country || 'GB';
        const dates = raw.release_dates?.results?.find(entry => entry.iso_3166_1 === region);
        const matches = (dates?.release_dates || []).filter(entry => {
          const released = date(String(entry.release_date || '').slice(0,10));
          return [2,3].includes(entry.type) && released &&
            (recentCinema ? released >= recentFrom && released <= today() : released > today());
        }).sort((a,b) => recentCinema
          ? String(b.release_date).localeCompare(String(a.release_date))
          : String(a.release_date).localeCompare(String(b.release_date)));
        const theatrical = matches[0];
        return theatrical ? {...sanitizeMedia(raw,type,region),releaseDate:theatrical.release_date.slice(0,10),
          releaseCountry:region,theatricalDate:theatrical.release_date.slice(0,10),
          cinemaReleaseType:theatrical.type,
          // Re-release requires a real previous release date, not simply old production year.
          cinemaReissue:(dates?.release_dates||[]).some(other=>[2,3].includes(other.type)&&
            String(other.release_date||'').slice(0,10)<theatrical.release_date.slice(0,10)&&
            Number(String(other.release_date||'').slice(0,4))<Number(theatrical.release_date.slice(0,4))),
          majorProduction:independentAssessment(raw).classification==='major-studio-production'} : null;
      }
      if (kind === 'indie') {
        const assessment = independentAssessment(raw);
        return assessment.independent ? { ...sanitizeMedia(raw, type, options.country), ...assessment } : null;
      }
      const keywords = raw.keywords?.results || raw.keywords?.keywords || [];
      return keywords.some(k => keywordIds.includes(k.id)) ? sanitizeMedia(raw, type, options.country) : null;
    });
  } else items = candidates.map(raw => sanitizeMedia(raw, type, options.country)).filter(Boolean);
  if (chart) items = items.filter(item => item.voteCount >= 50 && item.voteAverage !== null && item.firstReleaseDate <= end && Number(item.firstReleaseDate?.slice(0, 4)) === year)
    .sort((a, b) => b.voteAverage - a.voteAverage || b.voteCount - a.voteCount).slice(0, 20).map((item, i) => ({ ...item, position: i + 1, averageScore: Math.round(item.voteAverage * 10) }));
  const seen = new Set(); items = items.filter(item => !seen.has(item.id) && seen.add(item.id));
  if (cinema) items.sort((a,b) => recentCinema ? b.theatricalDate.localeCompare(a.theatricalDate) : a.theatricalDate.localeCompare(b.theatricalDate));
  const continuation = extra ? page + 2 : page + 1;
  return { items, page, nextPage: continuation <= totalPages ? continuation : null, screeningComplete: continuation > totalPages || (chart && items.length >= 20), totalPages, totalResults: Number(first.total_results) || 0,
    filteredResults: items.length, countIsCandidateTotal: kind === 'indie' || search, firstYear: type === 'tv' ? 1940 : 1888,
    year, type: kind, mode: options.mode, ratingKind: 'tmdb-community', minimumVotes: chart ? 50 : null,
    classification: kind === 'indie' ? 'independent-production-candidates' : type === 'tv' ? 'tmdb-horror-keyword' : 'tmdb-horror-genre',
    methodology: `${cinema ? `${recentCinema ? 'Recent (past 90 days)' : 'Upcoming'} ${options.country || 'GB'} limited or general theatrical dates verified against TMDB release-date details. Dates can change.` : kind === 'indie' ? INDIE_POLICY : type === 'tv' ? TV_POLICY : 'Horror genre entries from TMDB.'}${chart ? ' Ranked by TMDB community score with at least 50 votes, among released titles in the selected first-release year. Fewer entries are shown if the screened pool has fewer qualifying titles.' : ''}`,
    screeningLimit: kind === 'indie' || cinema ? 40 : null };
}
