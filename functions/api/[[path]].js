import worker from '../../worker/index.js';

// Routes /api/* for both protected preview and production.
// Each environment must provide its own D1 binding; production deliberately
// starts without review-source credentials or a database.
// Never send provider secrets or database identifiers to the browser.
export async function onRequest(context) {
  if (!context.env.DB) {
    const headers = {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'referrer-policy': 'no-referrer',
      'strict-transport-security': 'max-age=31536000',
      'content-security-policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      'permissions-policy': 'camera=(), microphone=(), geolocation=()'
    };
    const url = new URL(context.request.url);
    if (context.request.method === 'GET' && url.pathname === '/api/rankings') {
      const requested = url.searchParams.get('year') || String(new Date().getUTCFullYear());
      const year = Number(requested);
      if (!/^\\d{4}$/.test(requested) || !Number.isInteger(year) ||
          year < 1888 || year > new Date().getUTCFullYear() + 2) {
        return new Response(JSON.stringify({ error: 'Invalid ranking year' }), { status: 400, headers });
      }
      // Honest public holding state: never fabricate rated film positions,
      // a successful import timestamp, or a critic count when no D1 is bound.
      return new Response(JSON.stringify({
        year, status: 'pending', minimumCritics: 3, updatedAt: null,
        rankedFilms: 0, items: [], rankingSchemaStatus: 'awaiting-approved-reviews',
        methodology: 'The Fright Rating uses an equal-weight composite of distinct, permission-cleared numeric professional critic reviews. At least three qualifying critics are required.'
      }), { status: 200, headers });
    }
    return new Response(JSON.stringify({
      error: { code: 'not_configured', message: 'This data source is not yet available.' }
    }), { status: 503, headers });
  }
  return worker.fetch(context.request, context.env, context);
}
