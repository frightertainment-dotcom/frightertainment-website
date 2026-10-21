/* Public, source-attributed FrightNews headlines. No scraped article bodies or third-party images.
   The source RSS feeds are read on demand, filtered and cached at the edge. */
const SOURCES = [
  { name: 'Bloody Disgusting', url: 'https://bloody-disgusting.com/feed/', host: 'bloody-disgusting.com' },
  { name: 'Dread Central', url: 'https://www.dreadcentral.com/feed/', host: 'dreadcentral.com' },
  { name: 'FANGORIA', url: 'https://www.fangoria.com/feed/', host: 'fangoria.com' },
  { name: 'JoBlo Horror', url: 'https://www.joblo.com/horror-movies/news/feed/', host: 'joblo.com' },
  { name: 'Horror News Network', url: 'https://www.horrornewsnetwork.net/feed/', host: 'horrornewsnetwork.net' }
];

const MIME = 'application/json; charset=utf-8';
const BROWSER_HEADERS = {
  'content-type': MIME,
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin'
};
const NAMED_ENTITIES = {
  amp:'&', lt:'<', gt:'>', quot:'"', apos:"'", nbsp:' ',
  rsquo:'’', lsquo:'‘', rdquo:'”', ldquo:'“', hellip:'…',
  ndash:'–', mdash:'—', bull:'•', trade:'™', copy:'©', reg:'®',
  rsquor:'’', laquo:'«', raquo:'»'
};
function decodeEntities(input) {
  return String(input || '').replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (whole, entity) => {
    const key = entity.toLowerCase();
    if (key[0] === '#') {
      const code = key[1] === 'x' ? parseInt(key.slice(2), 16) : parseInt(key.slice(1), 10);
      return code >= 32 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ?
        String.fromCodePoint(code) : ' ';
    }
    return Object.hasOwn(NAMED_ENTITIES, key) ? NAMED_ENTITIES[key] : whole;
  });
}
function tag(xml, name) {
  const escaped = name.replace(/[.*+?^$()|[\]{}]/g, '\\$&');
  const found = xml.match(new RegExp('<' + escaped + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + escaped + '>', 'i'));
  return found ? found[1] : '';
}
function tidy(raw, limit = 210) {
  const text = decodeEntities(
    String(raw || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
  ).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length <= limit) return text;
  const clipped = text.slice(0, limit - 1);
  return clipped.slice(0, Math.max(clipped.lastIndexOf(' '), limit - 30)).trimEnd() + '…';
}
function verifiedSourceLink(raw, source) {
  try {
    const url = new URL(decodeEntities(raw.trim()));
    const hostname = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || url.username || url.password ||
        (hostname !== source.host && !hostname.endsWith('.' + source.host))) return null;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
    }
    return url.href;
  } catch { return null; }
}
function category(title, label) {
  const value = (title + ' ' + label).toLowerCase();
  if (/\b(review|reviewed|review:)\b/.test(value)) return 'REVIEW';
  if (/\b(trailer|teaser|clip|first look)\b/.test(value)) return 'TRAILER';
  if (/\b(video games?|gaming|gameplay|playstation|xbox)\b/.test(value)) return 'GAMES';
  if (/\b(podcast|audio drama|audio series)\b/.test(value)) return 'PODCASTS';
  if (/\b(tv|television|tv series|series premiere|episode|season \d)\b/.test(value)) return 'TV NEWS';
  if (/\b(indie|independent cinema|independent horror)\b/.test(value)) return 'INDIE';
  if (/\b(paranormal|haunted|ghost hunters?)\b/.test(value)) return 'PARANORMAL';
  return 'MOVIE NEWS';
}
function parseFeed(xml, source, now) {
  if (!/(<rss\b|<rdf:RDF\b)/i.test(xml) || !/<item\b/i.test(xml)) return [];
  const items = [];
  for (const match of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    const entry = match[1];
    const title = tidy(tag(entry, 'title'), 185);
    const url = verifiedSourceLink(tidy(tag(entry, 'link'), 2500), source);
    const published = tag(entry, 'pubDate') || tag(entry, 'dc:date');
    const stamp = Date.parse(tidy(published, 120));
    const excerpt = tidy(tag(entry, 'description'), 158);
    const classification = tidy(tag(entry, 'category'), 100);
    if (!title || !url || !Number.isFinite(stamp) || stamp > now + 300000) continue;
    if (stamp < now - 1000 * 60 * 60 * 24 * 120) continue;
    items.push({
      title, url, excerpt: excerpt || 'Read the original publisher report.',
      category: category(title, classification),
      source: source.name, publishedAt: new Date(stamp).toISOString()
    });
    if (items.length >= 70) break;
  }
  return items;
}
async function readFeed(source, now) {
  const response = await fetch(source.url, {
    headers: { accept: 'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8' },
    signal: AbortSignal.timeout(5500)
  });
  if (!response.ok) throw new Error('Source unavailable: ' + source.name);
  const declaredSize = Number(response.headers.get('content-length') || 0);
  if (declaredSize > 2500000) throw new Error('Source too large');
  const xml = await response.text();
  if (xml.length > 2500000) throw new Error('Source too large');
  return parseFeed(xml, source, now);
}
function responseJson(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: BROWSER_HEADERS });
}
async function legacyLiveFeed(context) {
  const request = context.request;
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const cacheKey = new Request(new URL('/api/frightnews', request.url), { method: 'GET' });
  if (cache) {
    const saved = await cache.match(cacheKey);
    if (saved) return responseJson(await saved.json());
  }
  const now = Date.now();
  const results = await Promise.allSettled(SOURCES.map(source => readFeed(source, now)));
  const deduped = new Map();
  let successfulSources = 0;
  results.forEach(result => {
    if (result.status !== 'fulfilled') return;
    successfulSources++;
    for (const item of result.value) if (!deduped.has(item.url)) deduped.set(item.url, item);
  });
  const items = [...deduped.values()]
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || a.title.localeCompare(b.title))
    .slice(0, 120);
  if (!items.length) {
    return responseJson({
      status: 'unavailable', updatedAt: null, total: 0, items: [],
      message: 'Latest horror headlines are temporarily unavailable. Please try again soon.'
    }, 503);
  }
  const payload = {
    status: 'ok', updatedAt: new Date(now).toISOString(),
    total: items.length, sourceCount: successfulSources, items
  };
  if (cache && typeof context.waitUntil === 'function') {
    const edgeCopy = new Response(JSON.stringify(payload), {
      headers: { 'content-type': MIME, 'cache-control': 'public, max-age=900' }
    });
    context.waitUntil(cache.put(cacheKey, edgeCopy).catch(() => {}));
  }
  return responseJson(payload);
}

// Durable daily headline index: NEVER delete existing items; archived links
// remain browsable. Failed publisher feeds leave prior headlines untouched.
const RETRY_AFTER_MS = 60 * 60 * 1000;
const REFRESH_AFTER_MS = 20 * 60 * 60 * 1000;
const ROLLING_LIMIT = 500;
const ARCHIVE_BATCH = 400;
const LIST_PAGE_SIZE = 120;

async function refreshArchive(db) {
  const row = await db.prepare(
    'SELECT last_attempt_at,last_success_at FROM frightnews_sync_state WHERE id=1'
  ).first();
  if (!row) throw new Error('FrightNews database migration required');
  const now = Date.now();
  const lastSuccess = Date.parse(row.last_success_at || '');
  if (Number.isFinite(lastSuccess) && now - lastSuccess < REFRESH_AFTER_MS) return;
  const lastAttempt = Date.parse(row.last_attempt_at || '');
  if (Number.isFinite(lastAttempt) && now - lastAttempt < RETRY_AFTER_MS) return;
  const attemptAt = new Date(now).toISOString();
  const leaseCutoff = new Date(now - RETRY_AFTER_MS).toISOString();
  const locked = await db.prepare(
    'UPDATE frightnews_sync_state SET last_attempt_at=? WHERE id=1 ' +
    'AND (last_attempt_at IS NULL OR last_attempt_at < ?)'
  ).bind(attemptAt, leaseCutoff).run();
  if (!locked.meta?.changes) return;

  const feeds = await Promise.allSettled(SOURCES.map(source => readFeed(source, now)));
  const incoming = new Map();
  let sourceCount = 0;
  for (const result of feeds) {
    if (result.status !== 'fulfilled' || !result.value.length) continue;
    sourceCount++;
    for (const item of result.value) if (!incoming.has(item.url)) incoming.set(item.url, item);
  }
  if (!incoming.size) return; // Previous articles remain; later refresh retries.

  const items = [...incoming.values()];
  for (let offset = 0; offset < items.length; offset += 40) {
    const statements = items.slice(offset, offset + 40).map(item =>
      db.prepare('INSERT OR IGNORE INTO frightnews_articles ' +
        '(url,title,excerpt,category,source,published_at) VALUES (?,?,?,?,?,?)')
        .bind(item.url, item.title, item.excerpt, item.category, item.source, item.publishedAt));
    await db.batch(statements);
  }

  // At 500 active articles, label the oldest 400 archived. This does not
  // remove rows or links; at each threshold, another 400 are archived.
  const active = await db.prepare(
    'SELECT COUNT(*) AS total FROM frightnews_articles WHERE archived_at IS NULL'
  ).first();
  if (Number(active?.total || 0) >= ROLLING_LIMIT) {
    await db.prepare(
      'UPDATE frightnews_articles SET archived_at=? WHERE url IN ' +
      '(SELECT url FROM frightnews_articles WHERE archived_at IS NULL ' +
      'ORDER BY published_at ASC, url ASC LIMIT ?)'
    ).bind(attemptAt, ARCHIVE_BATCH).run();
  }
  await db.prepare('UPDATE frightnews_sync_state SET last_success_at=?, ' +
    'last_source_count=?,last_article_count=? WHERE id=1')
    .bind(attemptAt,sourceCount,items.length).run();
}

async function storedNews(context) {
  const requestUrl = new URL(context.request.url);
  const db = context.env.DB;
  const archive = requestUrl.searchParams.get('archive') === '1';
  const rawOffset = requestUrl.searchParams.get('offset') || '0';
  const offset = /^\d{1,7}$/.test(rawOffset) ? Number(rawOffset) : NaN;
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1000000)
    return responseJson({error:'Invalid FrightNews page offset'},400);

  if (!archive && offset === 0) await refreshArchive(db);

  const where = archive ? 'archived_at IS NOT NULL' : 'archived_at IS NULL';
  const [count, archivedCount, state, articles] = await Promise.all([
    db.prepare('SELECT COUNT(*) AS total FROM frightnews_articles WHERE '+where).first(),
    db.prepare('SELECT COUNT(*) AS total FROM frightnews_articles WHERE archived_at IS NOT NULL').first(),
    db.prepare('SELECT last_success_at,last_source_count FROM frightnews_sync_state WHERE id=1').first(),
    db.prepare('SELECT url,title,excerpt,category,source,published_at ' +
      'FROM frightnews_articles WHERE '+where+
      ' ORDER BY published_at DESC,url ASC LIMIT ? OFFSET ?')
      .bind(LIST_PAGE_SIZE,offset).all()
  ]);
  const total = Number(count?.total||0);
  const items = (articles.results||[]).map(entry => ({
    url:entry.url,title:entry.title,excerpt:entry.excerpt,
    category:entry.category,source:entry.source,publishedAt:entry.published_at
  }));
  const hasSavedFeed = Boolean(state?.last_success_at);
  return responseJson({
    status: total ? 'ok' : hasSavedFeed ? 'empty' : 'unavailable',
    updatedAt:state?.last_success_at||null,
    sourceCount:Number(state?.last_source_count||0),
    storageMode:'persistent', archive, total, archiveTotal:Number(archivedCount?.total||0),
    offset, hasMore:offset+items.length<total,items,
    ...(total ? {} : {message:archive ? 'No headlines have reached the preserved archive yet.' : 'No saved publisher articles are available yet.'})
  },total || hasSavedFeed ? 200 : 503);
}

export async function onRequestGet(context) {
  if (!context.env?.DB) return legacyLiveFeed(context);
  try { return await storedNews(context); }
  catch (_error) {
    // Never silently replace durable storage with an ephemeral feed.
    return responseJson({
      status:'unavailable',items:[],total:0,archiveTotal:0,
      error:'The FrightNews archive is temporarily unavailable. Saved articles have not been deleted.'
    },503);
  }
}
