import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestPost,onRequest} from '../functions/api/contact.js';

const make = (data,headers={}) => new Request('https://frightertainment.com/api/contact',{
  method:'POST',
  headers:{'content-type':'application/json','origin':'https://frightertainment.com',...headers},
  body:typeof data==='string'?data:JSON.stringify(data)
});
const good={title:'Viewer',email:'viewer@example.com',subject:'Film suggestion',message:'Please consider this film for the site.',company:''};

test('contact submissions go only to the fixed publisher inbox and reject foreign origins',async()=>{
  let count=0,sent;
  const env={EMAIL:{send:async payload=>{count++;sent=payload;}}};
  const bad=await onRequestPost({request:make(good,{origin:'https://attacker.invalid'}),env});
  assert.equal(bad.status,403);
  const crossSite=await onRequestPost({request:make(good,{'sec-fetch-site':'cross-site'}),env});
  assert.equal(crossSite.status,403);
  assert.equal(count,0);
  const result=await onRequestPost({request:make(good,{'sec-fetch-site':'same-origin'}),env});
  assert.equal(result.status,200);
  assert.equal(count,1);
  assert.equal(sent.to,'Frightertainment@gmail.com');
  assert.equal(sent.from,'contact@frightertainment.com');
  assert.equal(sent.replyTo,'viewer@example.com');
  const submitted=await result.json();
  assert.equal(submitted.delivered,true);
  assert.ok(!JSON.stringify(submitted).includes(good.message));
  assert.equal(result.headers.get('cache-control'),'no-store');
  assert.equal(result.headers.get('x-content-type-options'),'nosniff');
  assert.equal(result.headers.get('cross-origin-resource-policy'),'same-origin');
  assert.equal(result.headers.get('access-control-allow-origin'),null);
});

test('contact endpoint limits both declared and undeclared request sizes and sanitizes email headings',async()=>{
  let sends=0;const env={EMAIL:{send:async()=>{sends++;}}};
  const tooBig=JSON.stringify({...good,message:'A'.repeat(10000)});
  assert.equal((await onRequestPost({request:make(tooBig),env})).status,413);
  const streamed=make(tooBig);
  streamed.headers.delete('content-length');
  assert.equal((await onRequestPost({request:streamed,env})).status,413);
  assert.equal((await onRequestPost({request:make({...good,subject:'Hello\r\nBcc: visitor@example.invalid'}),env})).status,400);
  assert.equal((await onRequestPost({request:make({...good,title:'Name\nInjected'}),env})).status,400);
  assert.equal((await onRequestPost({request:make({...good,subject:{bad:'object'}}),env})).status,400);
  assert.equal(sends,0);
});

test('honeypot never sends and missing mail provider fails safely',async()=>{
  let sends=0;const env={EMAIL:{send:async()=>{sends++;}}};
  assert.equal((await onRequestPost({request:make({...good,company:'filled'}),env})).status,200);
  assert.equal(sends,0);
  assert.equal((await onRequestPost({request:make(good),env:{}})).status,503);
  assert.equal((await onRequest({})).status,405);
});

test('contact requires a safe reply email and rejects header injection and invalid shapes',async()=>{
  const env={EMAIL:{send:async()=>{throw Error('Should not send invalid submissions');}}};
  for(const email of ['','x','nobody@local','bad @domain.com','visitor@example.com\\r\\nBcc: attacker@example.com']){
    const result=await onRequestPost({request:make({...good,email}),env});
    assert.equal(result.status,400,'Unsafe email: '+email);
  }
  assert.equal((await onRequestPost({request:make({...good,email:{value:'viewer@example.com'}}),env})).status,400);
});
test('Pages contact form uses the private mailer service and never lets visitors choose the destination',async()=>{
  let saved,called=0;
  const env={CONTACT_DELIVERY:{fetch:async(url,opts)=>{
    called++;saved={url:String(url),method:opts.method,body:JSON.parse(opts.body)};
    return new Response(JSON.stringify({ok:true}),{status:200});
  }}};
  const response=await onRequestPost({request:make({...good,to:'attacker@example.invalid'}),env});
  assert.equal(response.status,200);
  assert.equal((await response.json()).delivered,true);
  assert.equal(called,1);
  assert.equal(saved.url,'https://frightertainment-contact-mailer.internal/send');
  assert.equal(saved.method,'POST');
  assert.deepEqual(saved.body,{title:good.title,email:good.email,subject:good.subject,message:good.message});
});
test('mailer rejection fails closed without claiming delivery',async()=>{
  const env={CONTACT_DELIVERY:{fetch:async()=>new Response('No delivery',{status:503})}};
  const response=await onRequestPost({request:make(good),env});
  assert.equal(response.status,503);
  assert.equal((await response.json()).ok,undefined);
});
