// Dedicated private Cloudflare Worker, invoked ONLY by a Cloudflare Pages
// Service binding. No workers.dev URL or public route is configured.
// The destination and permitted sender are fixed in code and Cloudflare bindings.
const RECIPIENT='Frightertainment@gmail.com';
const SENDER='contact@frightertainment.com';
const safeHeader=s=>typeof s==='string'&&s.length>0&&!/[\x00-\x1f\x7f]/.test(s);
const emailPattern=/^[^\s@\x00-\x1f\x7f]+@[^\s@\x00-\x1f\x7f]+\.[A-Za-z]{2,}$/;
const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers:{
  'content-type':'application/json; charset=utf-8','cache-control':'no-store',
  'x-content-type-options':'nosniff','cross-origin-resource-policy':'same-origin',
  'content-security-policy':"default-src 'none'; frame-ancestors 'none'"
}});

export async function sendPrivateContact(request,env){
  if(request.method!=='POST'||new URL(request.url).pathname!=='/send')return reply(404,{error:'Not found'});
  if(!env.EMAIL)return reply(503,{error:'Email service unavailable'});
  const declared=Number(request.headers.get('content-length')||0);
  if(declared>7000||Number.isNaN(declared))return reply(413,{error:'Message too long'});
  let body;
  try{
    const buffer=await request.arrayBuffer();
    if(buffer.byteLength>7000)return reply(413,{error:'Message too long'});
    body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(buffer));
  }catch{return reply(400,{error:'Invalid message'});}
  const {title,email,subject,message}=body||{};
  if(!safeHeader(title)||title.length>100||!safeHeader(subject)||subject.length>140||
    typeof email!=='string'||email.length>254||!emailPattern.test(email)||
    typeof message!=='string'||message.length<5||message.length>5000||message.includes('\x00'))
    return reply(400,{error:'Invalid contact details'});
  try{
    await env.EMAIL.send({
      to:RECIPIENT,from:SENDER,replyTo:email,
      subject:'Frightertainment contact: '+subject,
      text:'From: '+title+'\nReply email: '+email+'\nSubject: '+subject+'\n\n'+message
    });
    return reply(200,{ok:true});
  }catch{return reply(503,{error:'Delivery failed'});}
}
export default {fetch:sendPrivateContact};
