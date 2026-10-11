// Dedicated private Cloudflare Worker, invoked ONLY by a Cloudflare Pages
// Service binding. No workers.dev URL or public route is configured.
// The destination and permitted sender are fixed in code and Cloudflare bindings.
const RECIPIENT='frightertainment@gmail.com';
const SENDER='contact@frightertainment.com';
const safeHeader=s=>typeof s==='string'&&s.length>0&&!/[\x00-\x1f\x7f]/.test(s);
const emailPattern=/^[^\s@\x00-\x1f\x7f]+@[^\s@\x00-\x1f\x7f]+\.[A-Za-z]{2,}$/;
const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers:{
  'content-type':'application/json; charset=utf-8','cache-control':'no-store',
  'x-content-type-options':'nosniff','cross-origin-resource-policy':'same-origin',
  'content-security-policy':"default-src 'none'; frame-ancestors 'none'"
}});


const classifySendFailure=error=>{
  // Only return a fixed, non-sensitive category. Never log or reveal message content.
  const hint=String(error?.code||'')+' '+String(error?.message||'');
  if(/E_SENDER_NOT_VERIFIED/.test(hint))return 'FT-WORKER-SENDER';
  if(/E_RECIPIENT_(?:NOT_ALLOWED|SUPPRESSED)/.test(hint))return 'FT-WORKER-RECIPIENT';
  if(/E_(?:RATE_LIMIT_EXCEEDED|DAILY_LIMIT_EXCEEDED)/.test(hint))return 'FT-WORKER-RATE-LIMIT';
  if(/E_VALIDATION_ERROR/.test(hint))return 'FT-WORKER-VALIDATION';
  return 'FT-WORKER-SEND-FAILED';
};

export async function sendPrivateContact(request,env){
  const path=new URL(request.url).pathname;
  if(request.method!=='POST'||!['/send','/send-anonymous'].includes(path))return reply(404,{error:'Not found'});
  if(!env.EMAIL)return reply(503,{error:'Email service unavailable',code:'FT-WORKER-NO-EMAIL'});
  const declared=Number(request.headers.get('content-length')||0);
  if(declared>7000||Number.isNaN(declared))return reply(413,{error:'Message too long'});
  let body;
  try{
    const buffer=await request.arrayBuffer();
    if(buffer.byteLength>7000)return reply(413,{error:'Message too long'});
    body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(buffer));
  }catch{return reply(400,{error:'Invalid message'});}
  if(path==='/send-anonymous'){
    // The anonymous path must not accept identifying fields or a reply destination.
    if(!body||typeof body!=='object'||Array.isArray(body)||
      !Object.keys(body).every(key=>['nickname','message'].includes(key))) {
      return reply(400,{error:'Invalid private message'});
    }
    const {nickname='',message}=body;
    if(typeof nickname!=='string'||nickname.trim().length>60||
      /[\x00-\x1f\x7f]/.test(nickname)||typeof message!=='string'||
      message.trim().length<5||message.trim().length>5000||
      message.includes('\x00'))return reply(400,{error:'Invalid private message'});
    try{
      const accepted=await env.EMAIL.send({
        to:RECIPIENT,from:SENDER,
        subject:'Frightertainment private message',
        text:'Nickname: '+(nickname.trim()||'Anonymous')+'\n\n'+message.trim()
      });
      if(!accepted?.messageId)return reply(503,{error:'Delivery not confirmed',code:'FT-WORKER-NO-ACCEPTANCE'});
      return reply(200,{ok:true});
    }catch(error){
      const code=classifySendFailure(error);
      console.error('frightertainment_private_message_delivery_failed',{code});
      return reply(503,{error:'Delivery failed',code});
    }
  }
  const {title,email,subject,message}=body||{};
  if(!safeHeader(title)||title.length>100||!safeHeader(subject)||subject.length>140||
    typeof email!=='string'||email.length>254||!emailPattern.test(email)||
    typeof message!=='string'||message.length<5||message.length>5000||message.includes('\x00'))
    return reply(400,{error:'Invalid contact details'});
  try{
    const accepted=await env.EMAIL.send({
      to:RECIPIENT,from:SENDER,replyTo:email,
      subject:'Frightertainment contact: '+subject,
      text:'From: '+title+'\nReply email: '+email+'\nSubject: '+subject+'\n\n'+message
    });
    if(!accepted?.messageId)return reply(503,{error:'Delivery not confirmed',code:'FT-WORKER-NO-ACCEPTANCE'});
    return reply(200,{ok:true});
  }catch(error){
    const code=classifySendFailure(error);
    console.error('frightertainment_mailer_delivery_failed',{code});
    return reply(503,{error:'Delivery failed',code});
  }
}
export default {fetch:sendPrivateContact};
