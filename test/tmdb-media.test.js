import test from 'node:test';
import assert from 'node:assert/strict';
import { officialTrailer, sanitizeMedia, fetchMedia, fetchCatalogue, independentAssessment } from '../worker/tmdb-media.js';
const env = { TMDB_NONCOMMERCIAL_USE_APPROVED: 'true', TMDB_ATTRIBUTION_READY: 'true', TMDB_READ_ACCESS_TOKEN: 'private-fixture' };
const reply = body => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });

test('only official YouTube trailers and teasers with safe video ids can be embedded', () => {
  const videos = { results: [
    { official: false, site: 'YouTube', type: 'Trailer', key: 'abcdef12345' },
    { official: true, site: 'YouTube', type: 'Trailer', key: '<script>' },
    { official: true, site: 'Vimeo', type: 'Trailer', key: 'abcdef12345' },
    { official: true, site: 'YouTube', type: 'Teaser', key: 'abcde123456' },
    { official: true, site: 'YouTube', type: 'Trailer', key: 'official123', iso_639_1: 'en' }
  ] };
  assert.equal(officialTrailer(videos).key, 'official123');
  assert.equal(officialTrailer({ results: videos.results.slice(0, 3) }), null);
});

test('regional dates are explicit and first releases never masquerade as UK release dates', () => {
  const raw = { id: 1, title: 'Film', release_date: '2025-01-01', poster_path: 'https://evil.example/poster.jpg', vote_average: 9.9, vote_count: 0 };
  const first = sanitizeMedia(raw, 'movie', 'GB');
  assert.equal(first.releaseCountry, 'Global'); assert.equal(first.releaseLabel, 'First release: 2025-01-01');
  assert.equal(first.posterPath, null); assert.equal(first.voteAverage, null);
  const regional = sanitizeMedia({ ...raw, release_dates: { results: [{ iso_3166_1: 'GB', release_dates: [{ type: 3, release_date: '2025-03-02T00:00:00Z' }] }] } }, 'movie', 'GB');
  assert.equal(regional.releaseDate, '2025-03-02'); assert.equal(regional.releaseCountry, 'GB');
});

test('independent classification requires production credits and excludes major production and large reported budgets', () => {
  assert.equal(independentAssessment({ production_companies: [{ name: 'Small Independent Films' }], budget: 500000 }).independent, true);
  assert.equal(independentAssessment({ production_companies: [{ name: 'Warner Bros. Pictures' }] }).independent, false);
  assert.equal(independentAssessment({ production_companies: [{ name: 'Independent Films' }], budget: 30000000 }).independent, false);
  assert.equal(independentAssessment({}).independent, false);
});

test('title lookup rejects ambiguous remakes and mismatched years without fetching arbitrary details', async () => {
  const previous = globalThis.fetch; let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++; assert.equal(options.headers.Authorization, 'Bearer private-fixture');
    return reply({ results: [{ id: 1, title: 'Same Title', release_date: '1980-01-01' }, { id: 2, title: 'Same Title', release_date: '2020-01-01' }] });
  };
  try {
    assert.equal(await fetchMedia(env, { type: 'movie', title: 'Same Title' }), null);
    assert.equal(await fetchMedia(env, { type: 'movie', title: 'Same Title', year: 1990 }), null);
    assert.equal(calls, 2);
  } finally { globalThis.fetch = previous; }
});

test('historical chart keeps the year boundary and excludes major producers from indie rankings', async () => {
  const previous = globalThis.fetch; const urls = [];
  globalThis.fetch = async url => {
    const u = new URL(url); urls.push(u);
    if (u.pathname.includes('/discover/')) return reply({ total_pages: 1, total_results: 2, results: [
      { id: 1, title: 'Independent', genre_ids: [27], poster_path: '/a.jpg', release_date: '2025-03-01' },
      { id: 2, title: 'Major', genre_ids: [27], poster_path: '/b.jpg', release_date: '2025-03-01' }
    ] });
    const id = Number(u.pathname.split('/').at(-1));
    return reply({ id, title: id === 1 ? 'Independent' : 'Major', release_date: '2025-03-01', poster_path: '/a.jpg', vote_average: 8, vote_count: 100,
      production_companies: [{ name: id === 1 ? 'Tiny Film Company' : 'Universal Pictures' }] });
  };
  try {
    const result = await fetchCatalogue(env, { type: 'indie', mode: 'chart', year: 2025, page: 1, country: 'GB' });
    assert.equal(urls[0].searchParams.get('primary_release_date.lte'), '2025-12-31');
    assert.deepEqual(result.items.map(item => item.tmdbId), [1]);
    assert.equal(result.items[0].position, 1); assert.equal(result.minimumVotes, 50);
    assert.equal(JSON.stringify(result).includes('private-fixture'), false);
  } finally { globalThis.fetch = previous; }
});

test('cinema screens the next batch and only shows future UK theatrical dates', async () => {
  const previous = globalThis.fetch; const urls = [];
  const future = `${new Date().getUTCFullYear() + 1}-10-05`;
  globalThis.fetch = async url => {
    const u = new URL(url); urls.push(u);
    if (u.pathname.includes('/discover/')) {
      const second = u.searchParams.get('page') === '2';
      return reply({ total_pages: 2, total_results: 2, results: [{ id: second ? 2 : 1, title: second ? 'UK Cinema' : 'US Only', genre_ids: [27], poster_path: '/film.jpg', release_date: future }] });
    }
    const id = Number(u.pathname.split('/').at(-1));
    return reply({ id, title: id === 2 ? 'UK Cinema' : 'US Only', release_date: future, poster_path: '/film.jpg', release_dates: { results: [{ iso_3166_1: id === 2 ? 'GB' : 'US', release_dates: [{ type: 3, release_date: future + 'T00:00:00Z' }] }] } });
  };
  try {
    const result = await fetchCatalogue(env, { type: 'movie', mode: 'cinema', year: new Date().getUTCFullYear(), page: 1, country: 'GB' });
    assert.equal(urls[0].searchParams.get('region'), 'GB');
    assert.equal(urls[0].searchParams.get('with_release_type'), '3|2');
    assert.equal(urls[0].searchParams.get('release_date.gte') !== null, true);
    assert.deepEqual(result.items.map(item => item.title), ['UK Cinema']);
    assert.equal(result.items[0].releaseCountry, 'GB');
    assert.equal(result.nextPage, null);
  } finally { globalThis.fetch = previous; }
});

test('TV discovery resolves exact horror keywords rather than treating all fantasy shows as horror', async () => {
  const previous = globalThis.fetch; const urls = [];
  globalThis.fetch = async url => {
    const u = new URL(url); urls.push(u);
    if (u.pathname.endsWith('/search/keyword')) return reply({ results: [{ id: u.searchParams.get('query') === 'horror' ? 10 : 20, name: u.searchParams.get('query') }, { id: 30, name: 'not horror' }] });
    return reply({ total_pages: 1, results: [{ id: 5, name: 'Horror TV', first_air_date: '2025-03-01', poster_path: '/tv.jpg', vote_count: 60, vote_average: 8.1 }] });
  };
  try {
    const result = await fetchCatalogue(env, { type: 'tv', mode: 'chart', year: 2025, page: 1 });
    assert.equal(urls.find(u => u.pathname.includes('/discover/')).searchParams.get('with_keywords'), '10|20');
    assert.equal(result.items[0].type, 'tv'); assert.equal(result.classification, 'tmdb-horror-keyword');
  } finally { globalThis.fetch = previous; }
});

test('media endpoint keeps a last-good snapshot on a failed refresh and never returns credentials', async () => {
  const { default: worker } = await import('../worker/index.js');
  const previous = globalThis.fetch;
  globalThis.fetch = async () => new Response('unavailable', { status: 503 });
  const item = sanitizeMedia({ id: 1, title: 'Cached Film', release_date: '2025-01-01', poster_path: '/safe.jpg', vote_average: 7.5, vote_count: 100 }, 'movie');
  const DB = { prepare() { return { bind() { return this; }, first: async () => ({ payload_json: JSON.stringify({ items: [item] }), updated_at: '2025-01-01T00:00:00Z', expires_at: '2025-01-02T00:00:00Z' }), run: async () => ({}) }; } };
  try {
    const response = await worker.fetch(new Request('https://site.test/api/media?type=movie&id=1'), { ...env, DB, DEFAULT_COUNTRY: 'GB' });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.item.title, 'Cached Film'); assert.equal(payload.stale, true);
    assert.equal(JSON.stringify(payload).includes('private-fixture'), false);
    assert.equal((await worker.fetch(new Request('https://site.test/api/media?type=movie&id=1'), { ...env, DB, TMDB_READ_ACCESS_TOKEN: '' })).status, 404);
    assert.equal((await worker.fetch(new Request('https://site.test/api/media?type=movie&id=1'), { ...env, DB, TMDB_NONCOMMERCIAL_USE_APPROVED: 'false' })).status, 404);
    assert.equal((await worker.fetch(new Request('https://site.test/api/media?type=movie&id=1'), { ...env, DB, TMDB_ATTRIBUTION_READY: 'false' })).status, 404);
  } finally { globalThis.fetch = previous; }
});

test('cinema discovery verifies the selected Canadian theatrical release instead of UK or US',async()=>{
  const previous=globalThis.fetch;const requests=[];const upcoming=`${new Date().getUTCFullYear()+1}-08-21`;
  globalThis.fetch=async url=>{
    const parsed=new URL(url);requests.push(parsed);
    if(parsed.pathname.includes('/discover/'))return reply({total_pages:1,total_results:2,results:[
      {id:11,title:'Canada Screening',genre_ids:[27],poster_path:'/a.jpg',release_date:upcoming},
      {id:12,title:'US Screening',genre_ids:[27],poster_path:'/b.jpg',release_date:upcoming}
    ]});
    const id=Number(parsed.pathname.split('/').at(-1));
    return reply({id,title:id===11?'Canada Screening':'US Screening',release_date:upcoming,poster_path:'/a.jpg',
      release_dates:{results:[{iso_3166_1:id===11?'CA':'US',release_dates:[{type:3,release_date:upcoming+'T00:00:00Z'}]}]}});
  };
  try{
    const result=await fetchCatalogue(env,{type:'movie',mode:'cinema',page:1,country:'CA',year:new Date().getUTCFullYear()});
    assert.equal(requests[0].searchParams.get('region'),'CA');
    assert.deepEqual(result.items.map(item=>item.title),['Canada Screening']);
    assert.equal(result.items[0].releaseCountry,'CA');
  }finally{globalThis.fetch=previous;}
});
test('recent cinema uses the chosen territory and only returns its theatrical releases from the past 90 days',async()=>{
  const oldFetch=globalThis.fetch,urls=[],now=Date.now();
  const recent=new Date(now-12*86400000).toISOString().slice(0,10);
  const outdated=new Date(now-140*86400000).toISOString().slice(0,10);
  globalThis.fetch=async url=>{
    const u=new URL(url);urls.push(u);
    if(u.pathname.includes('/discover/'))return reply({total_pages:1,total_results:3,results:[
      {id:11,title:'Australian Cinema',genre_ids:[27],poster_path:'/a.jpg',release_date:recent},
      {id:12,title:'US Cinema Only',genre_ids:[27],poster_path:'/b.jpg',release_date:recent},
      {id:13,title:'Old Australian Cinema',genre_ids:[27],poster_path:'/c.jpg',release_date:recent}
    ]});
    const id=Number(u.pathname.split('/').at(-1));
    return reply({id,title:id===11?'Australian Cinema':id===12?'US Cinema Only':'Old Australian Cinema',
      release_date:recent,poster_path:'/a.jpg',
      release_dates:{results:[{iso_3166_1:id===12?'US':'AU',
        release_dates:[{type:3,release_date:(id===13?outdated:recent)+'T00:00:00Z'}]}]}});
  };
  try{
    const d=await fetchCatalogue(env,{type:'movie',mode:'cinema-recent',page:1,year:new Date().getUTCFullYear(),country:'AU'});
    assert.equal(urls[0].searchParams.get('region'),'AU');
    assert.equal(urls[0].searchParams.get('sort_by'),'release_date.desc');
    assert.equal(urls[0].searchParams.get('release_date.lte'),new Date().toISOString().slice(0,10));
    assert.deepEqual(d.items.map(x=>x.title),['Australian Cinema']);
    assert.equal(d.items[0].theatricalDate,recent);
    assert.equal(d.items[0].releaseCountry,'AU');
  }finally{globalThis.fetch=oldFetch;}
});
test('cinema data carries explicit limited-versus-general screening types without claiming universal coverage',async()=>{
 const orig=globalThis.fetch;
 const dt=new Date(Date.now()+17*86400000).toISOString().slice(0,10);
 globalThis.fetch=async url=>{
  const u=new URL(url);if(u.pathname.includes('/discover/'))return reply({total_pages:1,total_results:2,results:[
    {id:111,title:'General Studio Horror',release_date:dt,genre_ids:[27],poster_path:'/general.jpg'},
    {id:112,title:'Tiny Independent Horror',release_date:dt,genre_ids:[27],poster_path:'/indie.jpg'}
  ]});
  const id=Number(u.pathname.split('/').at(-1));
  return reply({id,title:id===111?'General Studio Horror':'Tiny Independent Horror',release_date:dt,
    poster_path:'/cover.jpg',genre_ids:[27],production_companies:id===111?[{name:'Warner Bros Pictures'}]:[{name:'Independent Workshop'}],
    release_dates:{results:[{iso_3166_1:'GB',release_dates:[{type:id===111?3:2,release_date:dt+'T00:00:00Z'}]}]}});
 };
 try{
  const r=await fetchCatalogue(env,{type:'movie',mode:'cinema',page:1,country:'GB',year:new Date().getUTCFullYear()});
  assert.equal(r.items.length,2);
  assert.equal(r.items[0].cinemaReleaseType,3);
  assert.equal(r.items[0].majorProduction,true);
  assert.equal(r.items[1].cinemaReleaseType,2);
  assert.equal(r.items[1].majorProduction,false);
  assert.equal(r.items.every(x=>x.cinemaReissue===false),true);
 }finally{globalThis.fetch=orig}
});