// Manual Cloudflare Web Analytics installation for the public production build only.
// The site token is a public beacon identifier, not a provider API credential.
export const CLOUDFLARE_WEB_ANALYTICS_SRC = 'https://static.cloudflareinsights.com/beacon.min.js';

export function injectWebAnalytics(html, siteToken) {
  if (typeof html !== 'string' || !/<\/head>/i.test(html)) {
    throw new Error('Analytics install requires a complete HTML head');
  }
  if (!/^[a-f0-9]{32}$/.test(siteToken)) {
    throw new Error('Invalid public Cloudflare Web Analytics site token');
  }
  if (html.includes('data-cf-beacon') || html.includes(CLOUDFLARE_WEB_ANALYTICS_SRC)) {
    throw new Error('Refusing duplicate Cloudflare Web Analytics beacon');
  }
  const snippet = '<!-- Cloudflare Web Analytics (manual production setup) -->' +
    '<script type="module" src="' + CLOUDFLARE_WEB_ANALYTICS_SRC +
    '" data-cf-beacon=' + String.fromCharCode(39) + '{"token":"' + siteToken + '"}' +
    String.fromCharCode(39) + '></script>';
  return html.replace(/<\/head>/i, snippet + '</head>');
}
