import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet } from '../functions/api/frightnews.js';

const fakeFeed = (host, count = 30) => {
  const current = Date.now();
  const items = Array.from({length:count},(_,index) => {
    const published = new Date(current - (index+1) * 60000).toUTCString();
    return '<item><title><![CDATA[Nightmare ' + index +
      ' &amp; Another Trailer]]></title><link>https://' + host +
      '/news/' + index + '/</link><pubDate>' + published + '</pubDate>' +
      '<description><![CDATA[<p>Publisher update ' + index +
      ' &amp; some frightening details.</p>]]></description></item>';
  }).join('');
  return '<rss version="2.0"><channel>' + items + '</channel></rss>';
};
test('Frightertainment news combines verified-source links, normalises RSS and sorts dates', async t => {
  const previousFetch = globalThis.fetch;
  t.after(() => {globalThis.fetch = previousFetch;});
  globalThis.fetch = async url => {
    const { hostname } = new URL(url);
    const host = hostname.replace(/^www\./, '');
    return new Response(fakeFeed(host,30), {
      headers:{'content-type':'application/rss+xml'}
    });
  };
  const request = new Request('https://www.frightertainment.com/api/frightnews');
  const response = await onRequestGet({request});
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(data.status, 'ok');
  assert.equal(data.sourceCount, 5);
  assert.equal(data.items.length, 120);
  assert.match(data.items[0].title,/Nightmare \d+ & Another Trailer/);
  assert.match(data.items[0].excerpt,/& some frightening details/);
  assert.equal(new URL(data.items[0].url).protocol, 'https:');
  assert.equal(data.items.every((item,index) =>
    index === 0 || Date.parse(item.publishedAt) <= Date.parse(data.items[index-1].publishedAt)),true);
});
test('The source feed rejects links to unrelated domains and never publishes them', async t => {
  const oldFetch = globalThis.fetch;
  t.after(() => {globalThis.fetch = oldFetch;});
  globalThis.fetch = async () => new Response('<rss version="2.0"><channel><item>' +
    '<title>Suspicious Story</title><link>https://unrelated.example/redirect</link><pubDate>' +
    new Date(Date.now()-60000).toUTCString() + '</pubDate><description>Ignore</description>' +
    '</item></channel></rss>');
  const response = await onRequestGet({request:new Request('https://www.frightertainment.com/api/frightnews')});
  const data = await response.json();
  assert.equal(response.status, 503);
  assert.equal(data.items.length, 0);
});
test('The feed shows unavailable when publishers cannot be reached', async t => {
  const previousFetch = globalThis.fetch;
  t.after(() => {globalThis.fetch = previousFetch;});
  globalThis.fetch = async () => {throw new Error('RSS unavailable');};
  const response = await onRequestGet({request:new Request('https://www.frightertainment.com/api/frightnews')});
  const data = await response.json();
  assert.equal(response.status, 503);
  assert.equal(data.status, 'unavailable');
  assert.equal(data.updatedAt, null);
  assert.equal(data.total, 0);
});