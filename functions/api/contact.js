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
    return reply(403,{error:'This form can only be sent from Frightertainment.'});
  }
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return reply(415,{error:'Use the contact form.'});
  }
  const {parsed,tooLarge,invalid} = await readLimitedJSON(request);
  if (tooLarge) return reply(413,{error:'Message is too long.'});
  if (invalid || !parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return reply(400,{error:'Invalid message.'});
  }
  if (parsed.company) return reply(200,{ok:true}); // Honeypot: no email is sent.
  const {title,email,subject,message} = parsed;
  if (typeof title !== 'string' || typeof email !== 'string' ||
      typeof subject !== 'string' || typeof message !== 'string') {
    return reply(400,{error:'Complete your name, email, subject and message.'});
  }
  const name=title.trim(), replyEmail=email.trim(), topic=subject.trim(), text=message.trim();
  if (!name || name.length>100 || !topic || topic.length>140 ||
      replyEmail.length>254 || !/^[^\\s@\\x00-\\x1f\\x7f]+@[^\\s@\\x00-\\x1f\\x7f]+\\.[A-Za-z]{2,}$/.test(replyEmail) ||
      text.length<5 || text.length>5000 ||
      /[\x00-\x1f\x7f]/.test(name) || /[\x00-\x1f\x7f]/.test(topic) || /\x00/.test(text)) {
    return reply(400,{error:'Complete your name, valid email, subject and message.'});
  }
  if (!env.CONTACT_DELIVERY && !env.EMAIL) return reply(503,{error:'Contact form delivery is temporarily unavailable. Use the direct email link.'});
  try {
    if(env.CONTACT_DELIVERY){
      const delivery=await env.CONTACT_DELIVERY.fetch('https://frightertainment-contact-mailer.internal/send',{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({title:name,email:replyEmail,subject:topic,message:text})
      });
      if(!delivery.ok)throw new Error('Delivery service declined request');
    }else{
      await env.EMAIL.send({
        to:'Frightertainment@gmail.com',from:'contact@frightertainment.com',
        replyTo:replyEmail,subject:'Frightertainment contact: '+topic,
        text:'From: '+name+'\nReply email: '+replyEmail+'\nSubject: '+topic+'\n\n'+text
      });
    }
    return reply(200,{ok:true,delivered:true});
  }catch{
    return reply(503,{error:'Delivery is temporarily unavailable. Use the direct email link.'});
  }
}
export function onRequest(){return reply(405,{error:'Method not allowed.'});}
