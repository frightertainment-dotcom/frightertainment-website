import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet } from '../functions/api/frightnews.js';

class InMemoryD1 {
  constructor() {
    this.articles = new Map();
    this.state = { last_attempt_at:null,last_success_at:null,last_source_count:0,last_article_count:0 };
  }
  prepare(raw) {
    const sql = raw.replace(/\s+/g, ' ').trim();
    let params = [];
    const owner = this;
    return {
      bind(...values) { params = values;return this; },
      async first() {
        if (sql.startsWith('SELECT last_attempt_at,last_success_at FROM')) return {...owner.state};
        if (sql.startsWith('SELECT last_success_at,last_source_count FROM')) return {...owner.state};
        if (sql.startsWith('SELECT COUNT(*) AS total FROM')) {
          const archived = sql.includes('archived_at IS NOT NULL');
          return {total:[...owner.articles.values()].filter(v => Boolean(v.archived_at) === archived).length};
        }
        throw Error('Unsupported first SQL: '+sql);
      },
      async all() {
        if (!sql.startsWith('SELECT url,title,excerpt,category,source,published_at')) throw Error('Unsupported list SQL');
        const archived = sql.includes('archived_at IS NOT NULL');
        const results = [...owner.articles.values()]
          .filter(v => Boolean(v.archived_at) === archived)
          .sort((a,b)=>b.published_at.localeCompare(a.published_at)||a.url.localeCompare(b.url))
          .slice(Number(params[1]), Number(params[1])+Number(params[0]));
        return {results};
      },
      async run() {
        if (sql.startsWith('UPDATE frightnews_sync_state SET last_attempt_at=')) {
          const [stamp, cutoff] = params;
          if (owner.state.last_attempt_at && owner.state.last_attempt_at >= cutoff)
            return {meta:{changes:0}};
          owner.state.last_attempt_at=stamp;
          return {meta:{changes:1}};
        }
        if (sql.startsWith('INSERT OR IGNORE INTO frightnews_articles')) {
          const [url,title,excerpt,category,source,published_at] = params;
          if (!owner.articles.has(url))
            owner.articles.set(url,{url,title,excerpt,category,source,published_at,archived_at:null});
          return {meta:{changes:1}};
        }
        if (sql.startsWith('UPDATE frightnews_articles SET archived_at=')) {
          const [stamp,count] = params;
          [...owner.articles.values()].filter(x=>!x.archived_at)
            .sort((a,b)=>a.published_at.localeCompare(b.published_at)||a.url.localeCompare(b.url))
            .slice(0,Number(count)).forEach(x=>{x.archived_at=stamp;});
          return {meta:{changes:Number(count)}};
        }
        if (sql.startsWith('UPDATE frightnews_sync_state SET last_success_at=')) {
          [owner.state.last_success_at,owner.state.last_source_count,owner.state.last_article_count] = params;
          return {meta:{changes:1}};
        }
        throw Error('Unsupported run SQL: '+sql);
      }
    };
  }
  async batch(statements) { return Promise.all(statements.map(statement=>statement.run())); }
}
test('FrightNews adds new stories daily, retains earlier links, archives oldest 400 only at 500 and never deletes', async t => {
  const db=new InMemoryD1();
  const oldFetch=globalThis.fetch;
  const oldNow=Date.now;
  let day=0;
  const start=Date.parse('2026-10-16T07:00:00Z');
  Date.now=()=>start+day*24*3600*1000;
  t.after(()=>{globalThis.fetch=oldFetch;Date.now=oldNow;});
  const rss=(hostname)=>{
    const articles=Array.from({length:50},(_,i)=>{
      const published=new Date(start+day*24*3600*1000-(i+1)*60000).toUTCString();
      return '<item><title><![CDATA[Horror film story '+day+'-'+i+']]></title>'+
        '<link>https://'+hostname+'/articles/'+day+'/'+i+'/</link>'+
        '<pubDate>'+published+'</pubDate><description>New source-linked horror article.</description></item>';
    }).join('');
    return '<rss version="2.0"><channel>'+articles+'</channel></rss>';
  };
  globalThis.fetch=async url=>{
    if(day===2)throw Error('Publisher temporarily unavailable');
    return new Response(rss(new URL(url).hostname.replace(/^www\./,'')),
      {headers:{'content-type':'application/rss+xml'}});
  };
  const request=link=>onRequestGet({env:{DB:db},request:new Request('https://www.frightertainment.com'+link)});
  const first=await request('/api/frightnews');
  const initial=await first.json();
  assert.equal(first.status,200);
  assert.equal(initial.storageMode,'persistent');
  assert.equal(initial.total,250);
  assert.equal(initial.archiveTotal,0);
  assert.equal(db.articles.size,250);
  const emptyArchiveResponse = await request('/api/frightnews?archive=1');
  const emptyArchive = await emptyArchiveResponse.json();
  assert.equal(emptyArchiveResponse.status, 200);
  assert.equal(emptyArchive.status, 'empty');
  assert.equal(emptyArchive.total, 0);
  assert.equal(emptyArchive.archiveTotal, 0);
  assert.deepEqual(emptyArchive.items, []);

  day=1;
  const second=await request('/api/frightnews');
  const updated=await second.json();
  assert.equal(updated.total,100);
  assert.equal(updated.archiveTotal,400);
  assert.equal(db.articles.size,500);
  assert.equal([...db.articles.values()].filter(x=>x.archived_at!==null).length,400);
  assert.equal([...db.articles.values()].filter(x=>x.archived_at===null).length,100);
  assert.ok(updated.items.every(x=>x.publishedAt.startsWith('2026-10-17')));

  const archive=await (await request('/api/frightnews?archive=1')).json();
  assert.equal(archive.total,400);
  assert.equal(archive.items.length,120);
  assert.equal(archive.hasMore,true);
  assert.ok(archive.items.every(x=>x.publishedAt.startsWith('2026-10-16')||
    x.publishedAt.startsWith('2026-10-17')));
  const older=await (await request('/api/frightnews?archive=1&offset=360')).json();
  assert.equal(older.items.length,40);
  assert.equal(older.hasMore,false);

  day=2; // Source failure cannot erase any previously saved story.
  const down=await request('/api/frightnews');
  const retained=await down.json();
  assert.equal(down.status,200);
  assert.equal(retained.total,100);
  assert.equal(retained.archiveTotal,400);
  assert.equal(db.articles.size,500);
  assert.equal(retained.updatedAt,updated.updatedAt);
});
