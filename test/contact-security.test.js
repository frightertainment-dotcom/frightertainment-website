import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestPost,onRequest} from '../functions/api/contact.js';
import {sendPrivateContact} from '../worker/contact-mailer.js';

const payload={nickname:'Night Owl',message:'Please consider this independent horror film.',ft_trap_blank:''};
const request=(data=payload,headers={})=>new Request('https://frightertainment.com/api/contact',{
  method:'POST',
  headers:{'content-type':'application/json','origin':'https://frightertainment.com',...headers},
  body:typeof data==='string'?data:JSON.stringify(data)
});
const service=({onSend=async()=>({messageId:'accepted-test'})}={})=>{
  const sent=[];
  const env={CONTACT_DELIVERY:{fetch:(url,opts)=>{
    const workerEnv={EMAIL:{send:async value=>{sent.push(value);return onSend(value);}}};
    return sendPrivateContact(new Request(url,opts),workerEnv);
  }}};
  return {env,sent};
};

test('private form accepts an optional nickname, not an email or real-name field',async()=>{
  const {env,sent}=service();
  const response=await onRequestPost({request:request(payload,{'sec-fetch-site':'same-origin'}),env});
  assert.equal(response.status,200);
  assert.equal((await response.json()).delivered,true);
  assert.equal(sent.length,1);
  assert.equal(sent[0].to,'frightertainment@gmail.com');
  assert.equal(sent[0].from,'contact@frightertainment.com');
  assert.equal(sent[0].subject,'Frightertainment private message');
  assert.equal(sent[0].replyTo,undefined,'Anonymous visitor is never assigned an email reply address');
  assert.equal(sent[0].text,'Nickname: Night Owl\n\nPlease consider this independent horror film.');
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal(response.headers.get('x-content-type-options'),'nosniff');
  assert.equal(response.headers.get('cross-origin-resource-policy'),'same-origin');
  assert.equal(response.headers.get('access-control-allow-origin'),null);
});

test('omitting the optional nickname still sends under Anonymous, without a Reply-To',async()=>{
  const {env,sent}=service();
  const response=await onRequestPost({request:request({message:'A recommendation without a nickname.'}),env});
  assert.equal(response.status,200);
  assert.equal((await response.json()).delivered,true);
  assert.equal(sent[0].text,'Nickname: Anonymous\n\nA recommendation without a nickname.');
  assert.equal(sent[0].replyTo,undefined);
});

test('stray email, name, subject and destination fields are not accepted or forwarded',async()=>{
  const {env,sent}=service();
  for(const extra of [{email:'name@example.test'},{title:'Real name'},{subject:'Test'},
    {to:'attacker@example.test'},{replyTo:'attacker@example.test'},{company:'spam'}]){
    const r=await onRequestPost({request:request({...payload,...extra}),env});
    assert.equal(r.status,400,JSON.stringify(extra));
    assert.equal((await r.json()).delivered,undefined);
  }
  assert.equal(sent.length,0);
});

test('malicious origins and cross-site submissions are rejected before calling mailer',async()=>{
  const {env,sent}=service();
  const bad=await onRequestPost({request:request(payload,{origin:'https://evil.invalid'}),env});
  assert.equal(bad.status,403);
  const cross=await onRequestPost({request:request(payload,{'sec-fetch-site':'cross-site'}),env});
  assert.equal(cross.status,403);
  assert.equal(sent.length,0);
});

test('message bounds and nickname header safety are enforced',async()=>{
  const {env,sent}=service();
  for(const invalid of [
    {...payload,message:'    '},
    {...payload,message:'tiny'},
    {...payload,message:'X'.repeat(5001)},
    {...payload,nickname:'X'.repeat(61)},
    {...payload,nickname:'Spammer\r\nBcc: attacker@example.com'},
    {...payload,nickname:null},
    {...payload,message:{oops:'object'}},
    {...payload,message:'Hello\u0000World'}
  ]){
    const r=await onRequestPost({request:request(invalid),env});
    assert.ok([400,413].includes(r.status),r.status+' '+JSON.stringify(invalid).slice(0,50));
    assert.equal((await r.json()).delivered,undefined);
  }
  const tooBig=JSON.stringify({...payload,message:'X'.repeat(10000)});
  assert.equal((await onRequestPost({request:request(tooBig),env})).status,413);
  const streamed=request(tooBig);streamed.headers.delete('content-length');
  assert.equal((await onRequestPost({request:streamed,env})).status,413);
  assert.equal(sent.length,0);
});

test('anti-spam hidden trap is silent and cannot report message delivery',async()=>{
  const {env,sent}=service();
  const r=await onRequestPost({request:request({...payload,ft_trap_blank:'bot filled this'}),env});
  assert.equal(r.status,200);
  assert.deepEqual(await r.json(),{ok:true});
  assert.equal(sent.length,0);
});

test('missing service binding fails closed and other methods are refused',async()=>{
  const r=await onRequestPost({request:request(payload),env:{}});
  assert.equal(r.status,503);
  assert.equal((await r.json()).code,'FT-NO-DELIVERY-BINDING');
  assert.equal((await onRequest({})).status,405);
});

test('Pages sends only nickname/message to private Worker, never client IP, email or session data',async()=>{
  let forwarded,endpoint;
  const env={CONTACT_DELIVERY:{fetch:async (url,opts)=>{
    endpoint=String(url);
    forwarded=JSON.parse(opts.body);
    return new Response(JSON.stringify({ok:true}),{status:200,headers:{'content-type':'application/json'}});
  }}};
  const r=await onRequestPost({request:request(payload,{'cf-connecting-ip':'192.0.2.7'}),env});
  assert.equal(r.status,200);
  assert.equal((await r.json()).delivered,true);
  assert.equal(endpoint,'https://frightertainment-contact-mailer.internal/send-anonymous');
  assert.deepEqual(forwarded,{nickname:payload.nickname,message:payload.message});
});

test('service exceptions and rejections do not claim delivery or leak message text',async()=>{
  const statuses=[
    [{fetch:async()=>new Response('Unavailable',{status:503})},'FT-MAILER-503'],
    [{fetch:async()=>new Response('Unexpected HTML',{status:200,headers:{'content-type':'text/html'}})},'FT-MAILER-NONJSON'],
    [{fetch:async()=>new Response(JSON.stringify({ok:false}),{status:200,headers:{'content-type':'application/json'}})},'FT-MAILER-UNCONFIRMED'],
    [{fetch:async()=>{throw new Error('secret visitor details');}},'FT-MAILER-CONNECTION'],
    [{fetch:async()=>new Response(JSON.stringify({code:'FT-WORKER-RECIPIENT'}),{status:503,headers:{'content-type':'application/json'}})},'FT-WORKER-RECIPIENT']
  ];
  for(const [binding,expected] of statuses){
    const r=await onRequestPost({request:request(payload),env:{CONTACT_DELIVERY:binding}});
    assert.equal(r.status,503);
    const json=await r.json();
    assert.equal(json.code,expected);
    assert.equal(json.delivered,undefined);
    assert.ok(!JSON.stringify(json).includes(payload.message));
    assert.ok(!JSON.stringify(json).includes('secret visitor details'));
  }
  const hostile={CONTACT_DELIVERY:{fetch:async()=>new Response(JSON.stringify({
    ok:false,code:'FT-WORKER-SENSITIVE-EMAIL',private:'secret'
  }),{status:503,headers:{'content-type':'application/json'}})}};
  const response=await onRequestPost({request:request(payload),env:hostile});
  assert.equal((await response.json()).code,'FT-MAILER-503');
});

test('only an explicit Worker messageId confirms successful delivery',async()=>{
  const {env}=service({onSend:async()=>({})});
  const r=await onRequestPost({request:request(payload),env});
  assert.equal(r.status,503);
  assert.equal((await r.json()).code,'FT-WORKER-NO-ACCEPTANCE');
});
