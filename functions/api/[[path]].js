import worker from '../../worker/index.js';

// This is the only public-facing integration point in the Pages preview.
// The routing rule limits execution to /api/*, while Cloudflare Access
// protects all preview hostnames. No API credentials or database IDs are sent
// to the browser.
export async function onRequest(context) {
  if (!context.env.DB) {
    return new Response(JSON.stringify({error:{code:'not_configured',message:'Discovery database is not connected to this environment'}}),{
      status:503,headers:{'content-type':'application/json','cache-control':'no-store'}
    });
  }
  return worker.fetch(context.request, context.env, context);
}
