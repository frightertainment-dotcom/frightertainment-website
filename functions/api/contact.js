// A fixed-destination, same-origin-only contact endpoint. Secrets remain in Cloudflare, never in the bundle.
const HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'cross-origin-resource-policy': 'same-origin',
  'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
  'permissions-policy': 'camera=(), microphone=(), geolocation=()'
};
const MAX_BYTES = 7000;
const reply = (status, data) => new Response(JSON.stringify(data), { status, headers: HEADERS });

async function readLimitedJSON(request) {
  const declared = request.headers.get('content-length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > MAX_BYTES)) return {tooLarge:true};
  if (!request.body) return {invalid:true};
  const reader = request.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const {done,value} = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BYTES) {
        await reader.cancel().catch(() => {});
        return {tooLarge:true};
      }
      chunks.push(value);
    }
    const buffer = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {buffer.set(chunk,offset);offset+=chunk.byteLength;}
    const content = new TextDecoder('utf-8', {fatal:true}).decode(buffer);
    const parsed = JSON.parse(content);
    return {parsed};
  } catch {return {invalid:true};}
}

export async function onRequestPost({request,env}) {
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  if ((origin && origin !== new URL(request.url).origin) ||
      (fetchSite && !['same-origin','none'].includes(fetchSite))) {
    return reply(403,{error:'This form can only be sent from Frightertainment.',code:'FT-ORIGIN'});
  }
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return reply(415,{error:'Use the contact form.',code:'FT-CONTENT-TYPE'});
  }
  const {parsed,tooLarge,invalid} = await readLimitedJSON(request);
  if (tooLarge) return reply(413,{error:'Message is too long.',code:'FT-PAYLOAD-LIMIT'});
  if (invalid || !parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return reply(400,{error:'Invalid message.',code:'FT-INVALID-JSON'});
  }
  // Do not accept even optional identity or reply-address fields.
  if(!Object.keys(parsed).every(key=>['nickname','message','ft_trap_blank'].includes(key))) {
    return reply(400,{error:'Only an optional nickname and message are accepted.',code:'FT-INVALID-FIELDS'});
  }
  if(parsed.ft_trap_blank) return reply(200,{ok:true}); // Anti-spam trap; no delivery claim.
  const nickname=parsed.nickname===undefined?'':parsed.nickname;
  const message=parsed.message;
  if(typeof nickname!=='string'||typeof message!=='string') {
    return reply(400,{error:'Enter your message.',code:'FT-INVALID-FIELDS'});
  }
  const alias=nickname.trim(),text=message.trim();
  if(alias.length>60||/[\x00-\x1f\x7f]/.test(alias)||
     text.length<5||text.length>5000||text.includes('\x00')) {
    return reply(400,{error:'Enter a valid message of 5 to 5000 characters.',code:'FT-INVALID-FIELDS'});
  }
  if(!env.CONTACT_DELIVERY) {
    return reply(503,{error:'Message delivery is temporarily unavailable. Use the direct email link.',code:'FT-NO-DELIVERY-BINDING'});
  }
  try {
    if (env.CONTACT_DELIVERY) {
      let delivery;
      try {
        delivery=await env.CONTACT_DELIVERY.fetch('https://frightertainment-contact-mailer.internal/send-anonymous',{
          method:'POST',
          headers:{'content-type':'application/json'},
          body:JSON.stringify({nickname:alias,message:text})
        });
      } catch (error) {
        console.error('frightertainment_contact_binding_failed',{type:String(error?.name||'UnknownError').slice(0,60)});
        return reply(503,{error:'Delivery is temporarily unavailable. Use the direct email link.',code:'FT-MAILER-CONNECTION'});
      }
      if (!delivery.ok) {
        // Worker failures have fixed, non-sensitive codes; never expose raw upstream errors.
        let code='FT-MAILER-'+delivery.status;
        if ((delivery.headers.get('content-type')||'').toLowerCase().includes('application/json')) {
          try {
            const failure=await delivery.json();
            if (typeof failure?.code === 'string' &&
                /^FT-WORKER-(?:NO-EMAIL|NO-ACCEPTANCE|SENDER|RECIPIENT|RATE-LIMIT|VALIDATION|SEND-FAILED)$/.test(failure.code)) {
              code=failure.code;
            }
          } catch {}
        }
        console.error('frightertainment_contact_mailer_rejected',{status:delivery.status,code});
        return reply(503,{error:'Delivery is temporarily unavailable. Use the direct email link.',code});
      }
      if (!(delivery.headers.get('content-type')||'').toLowerCase().includes('application/json')) {
        return reply(503,{error:'Delivery response unavailable. Use the direct email link.',code:'FT-MAILER-NONJSON'});
      }
      let confirmation;
      try { confirmation=await delivery.json(); }
      catch { return reply(503,{error:'Delivery response unavailable. Use the direct email link.',code:'FT-MAILER-BAD-JSON'}); }
      if (confirmation?.ok !== true) {
        return reply(503,{error:'Delivery response unavailable. Use the direct email link.',code:'FT-MAILER-UNCONFIRMED'});
      }
    }
    return reply(200,{ok:true,delivered:true});
  } catch (error) {
    console.error('frightertainment_contact_delivery_failed',{type:String(error?.name||'UnknownError').slice(0,60)});
    return reply(503,{error:'Delivery is temporarily unavailable. Use the direct email link.',code:'FT-DELIVERY-ERROR'});
  }
}
export function onRequest(){return reply(405,{error:'Method not allowed.'});}
