import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('static responses use a restrictive CSP compatible with approved local assets, fonts, and privacy-enhanced trailer embeds', async () => {
  const headers = await readFile(new URL('../_headers', import.meta.url), 'utf8');
  for (const directive of [
    "default-src 'self'", "base-uri 'self'", "object-src 'none'", "frame-ancestors 'none'",
    "script-src 'self'", "style-src 'self' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com", "img-src 'self' data:",
    "connect-src 'self'", 'frame-src https://www.youtube-nocookie.com'
  ]) assert.ok(headers.includes(directive), `CSP is missing ${directive}`);
  assert.match(headers, /X-Content-Type-Options:\s*nosniff/i);
  assert.match(headers, /X-Frame-Options:\s*DENY/i);
  assert.match(headers, /Referrer-Policy:\s*strict-origin-when-cross-origin/i);
  assert.match(headers, /Strict-Transport-Security:\s*max-age=31536000/i);
  assert.match(headers, /Cache-Control:\s*no-cache, must-revalidate/i);
  assert.doesNotMatch(headers, /Access-Control-Allow-Origin:\s*\*/i);
  const previewBuild = await readFile(new URL('../scripts/build-preview.mjs', import.meta.url), 'utf8');
  assert.match(previewBuild, /sharedHeaders\s*=\s*await readFile/);
  assert.match(previewBuild, /X-Robots-Tag: noindex/);
  assert.match(previewBuild, /Cache-Control: no-store/);
});

test('shared static security headers set isolation and disallow cross-domain embedding',async()=>{
  const headers=await readFile(new URL('../_headers',import.meta.url),'utf8');
  for(const expected of ['Cross-Origin-Opener-Policy: same-origin','Cross-Origin-Resource-Policy: same-site','X-Permitted-Cross-Domain-Policies: none']){
    assert.ok(headers.includes(expected),expected);
  }
  assert.doesNotMatch(headers,/script-src[^\n]*'unsafe-inline'/);
  assert.doesNotMatch(headers,/script-src[^\n]*'unsafe-eval'/);
});
test('podcast JSON API is not frameable and does not grant third-party CORS access',async()=>{
 const source=await readFile(new URL('../functions/api/podcasts.js',import.meta.url),'utf8');
 for(const control of ["'x-frame-options':'DENY'","'referrer-policy':'no-referrer'","'content-security-policy':\"default-src 'none'; frame-ancestors 'none'\"","'cross-origin-resource-policy':'same-origin'"])
  assert.ok(source.includes(control),'Podcast response is missing '+control);
 assert.doesNotMatch(source,/access-control-allow-origin/i);
});


test('Cloudflare automatic Web Analytics beacon is allowed by the shared CSP without broadening script access', async () => {
  const headers = await readFile(new URL('../_headers', import.meta.url), 'utf8');
  const csp = headers.split(String.fromCharCode(10)).find(line => line.trim().startsWith('Content-Security-Policy:'));
  assert.ok(csp, 'Missing shared Content-Security-Policy header');
  const policy = csp.slice(csp.indexOf('Content-Security-Policy:') + 'Content-Security-Policy:'.length).trim();
  const directives = new Map(policy.split(';').map(part => part.trim()).filter(Boolean).map(part => {
    const space = part.indexOf(' ');
    return [space < 0 ? part : part.slice(0, space), space < 0 ? '' : part.slice(space + 1)];
  }));
  assert.equal(directives.get('script-src'), "'self' https://static.cloudflareinsights.com/beacon.min.js");
  assert.equal(directives.get('connect-src'), "'self'", 'Automatic Web Analytics reports to same-origin /cdn-cgi/rum');
  assert.equal(directives.get('object-src'), "'none'");
  assert.equal(directives.get('frame-ancestors'), "'none'");
  assert.doesNotMatch(csp, /'unsafe-inline'|'unsafe-eval'/);
});
