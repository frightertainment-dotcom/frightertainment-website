import test from 'node:test';
import assert from 'node:assert/strict';
import { injectWebAnalytics, CLOUDFLARE_WEB_ANALYTICS_SRC } from '../scripts/web-analytics-beacon.mjs';

const TOKEN = 'f8adaba13e524ed7ab5d523a2fe2120f';
const base = '<!doctype html><html><head><title>Horror</title></head><body><h1>Frightertainment</h1></body></html>';

test('manual Cloudflare beacon is injected exactly once inside the HTML head', () => {
  const html = injectWebAnalytics(base, TOKEN);
  assert.ok(html.includes('<script type="module" src="' + CLOUDFLARE_WEB_ANALYTICS_SRC + '"'));
  assert.ok(html.includes('data-cf-beacon=' + String.fromCharCode(39) + '{"token":"' + TOKEN + '"}'));
  assert.equal(html.split('data-cf-beacon').length - 1, 1);
  assert.ok(html.indexOf('data-cf-beacon') < html.indexOf('</head>'));
  assert.ok(html.includes('<h1>Frightertainment</h1>'));
});

test('duplicate tracking code, invalid identifiers and missing HTML head fail closed', () => {
  assert.throws(() => injectWebAnalytics(injectWebAnalytics(base, TOKEN), TOKEN), /duplicate/);
  assert.throws(() => injectWebAnalytics(base, 'invalid-token'), /Invalid public/);
  assert.throws(() => injectWebAnalytics('<body>no head</body>', TOKEN), /complete HTML head/);
});
