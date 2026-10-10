const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers});
export async function onRequestPost({request,env}){
  if(request.headers.get('content-type')?.split(';')[0]!=='application/json')return reply(415,{error:'Use the contact form.'});
  if(Number(request.headers.get('content-length'))>7000)return reply(413,{error:'Message is too long.'});
  let input;try{input=await request.json();}catch{return reply(400,{error:'Invalid message.'});}
  if(input.company)return reply(200,{ok:true});
  const title=String(input.title||'').trim(),subject=String(input.subject||'').trim(),message=String(input.message||'').trim();
  if(!title||title.length>100||!subject||subject.length>140||message.length<5||message.length>5000)return reply(400,{error:'Complete the title, subject and message.'});
  if(!env.EMAIL)return reply(503,{error:'Direct delivery is not configured. Use the email link.'});
  try{
    await env.EMAIL.send({to:'Frightertainment@gmail.com',from:'contact@frightertainment.com',subject:'Frightertainment contact: '+subject,text:`Title: ${title}\nSubject: ${subject}\n\n${message}`});
    return reply(200,{ok:true});
  }catch{
    return reply(503,{error:'Delivery is temporarily unavailable. Use the email link.'});
  }
}
export function onRequest(){return reply(405,{error:'Method not allowed.'});}
