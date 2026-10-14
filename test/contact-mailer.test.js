import test from 'node:test';
import assert from 'node:assert/strict';
import {sendPrivateContact} from '../worker/contact-mailer.js';
const base={title:'Site visitor',email:'visitor@example.com',subject:'Film suggestion',message:'Please feature this film.'};
const req=(data=base,url='https://frightertainment-contact-mailer.internal/send')=>new Request(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
test('private contact mailer sends a fixed-address message with safe replyTo',async()=>{
  let saved;
  const response=await sendPrivateContact(req({...base,to:'attacker@example.invalid'}),{EMAIL:{send:async x=>{saved=x;return{messageId:'mock-message-1'};}}});
  assert.equal(response.status,200);
  assert.equal(saved.to,'frightertainment@gmail.com');
  assert.equal(saved.from,'contact@frightertainment.com');
  assert.equal(saved.replyTo,'visitor@example.com');
  assert.match(saved.text,/Please feature this film/);
});
test('private mailer rejects arbitrary routes, unsafe headers, oversized bodies and missing binding',async()=>{
  const env={EMAIL:{send:async()=>{throw Error('must not send');}}};
  assert.equal((await sendPrivateContact(req(base,'https://frightertainment-contact-mailer.internal/hack'),env)).status,404);
  assert.equal((await sendPrivateContact(req({...base,subject:'Film\r\nBcc: attacker@example.invalid'}),env)).status,400);
  assert.equal((await sendPrivateContact(req({...base,message:'A'.repeat(7500)}),env)).status,413);
  assert.equal((await sendPrivateContact(req(),{})).status,503);
});
test('upstream send failure does not claim delivery',async()=>{
  const r=await sendPrivateContact(req(),{EMAIL:{send:async()=>{throw Error('provider down');}}});
  assert.equal(r.status,503);
  assert.equal((await r.json()).ok,undefined);
});

test('mailer only marks delivery accepted when Cloudflare supplies messageId',async()=>{
  const response=await sendPrivateContact(req(),{EMAIL:{send:async()=>({})}});
  assert.equal(response.status,503);
  assert.equal((await response.json()).code,'FT-WORKER-NO-ACCEPTANCE');
});
test('mailer identifies Cloudflare delivery rejections without exposing customer data',async()=>{
  const cases=[
    ['E_SENDER_NOT_VERIFIED','FT-WORKER-SENDER'],
    ['E_RECIPIENT_NOT_ALLOWED','FT-WORKER-RECIPIENT'],
    ['E_RATE_LIMIT_EXCEEDED','FT-WORKER-RATE-LIMIT'],
    ['E_VALIDATION_ERROR','FT-WORKER-VALIDATION'],
    ['Unrecognised upstream failure','FT-WORKER-SEND-FAILED']
  ];
  for(const [code,expected] of cases){
    const response=await sendPrivateContact(req(),{EMAIL:{send:async()=>{
      const error=new Error(code+' secret provider detail');
      error.code=code; throw error;
    }}});
    assert.equal(response.status,503);
    const data=await response.json();
    assert.equal(data.code,expected);
    assert.equal(data.ok,undefined);
    assert.ok(!JSON.stringify(data).includes(base.message));
    assert.ok(!JSON.stringify(data).includes('secret provider detail'));
  }
});
test('mailer binding absence produces a safe, distinct error',async()=>{
  const response=await sendPrivateContact(req(),{});
  assert.equal(response.status,503);
  assert.equal((await response.json()).code,'FT-WORKER-NO-EMAIL');
});
test('the Cloudflare restricted mailer binding targets the verified lower-case destination',async()=>{
  const {readFile}=await import('node:fs/promises');
  const config=JSON.parse(await readFile(new URL('../wrangler.contact-mailer.jsonc',import.meta.url),'utf8'));
  assert.equal(config.workers_dev,false);
  assert.equal(config.send_email[0].destination_address,'frightertainment@gmail.com');
  assert.deepEqual(config.send_email[0].allowed_sender_addresses,['contact@frightertainment.com']);
});

const anonymousRoute='https://frightertainment-contact-mailer.internal/send-anonymous';
const anonymousReq=(body={nickname:'',message:'I found a creepy short film.'},url=anonymousRoute)=>
  new Request(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
test('new private message route sends optional nickname without storing a reply address',async()=>{
  let sent;
  const r=await sendPrivateContact(anonymousReq({nickname:'Night Owl',message:'Here is my horror suggestion.'}),
    {EMAIL:{send:async data=>{sent=data;return{messageId:'accepted-test'};}}});
  assert.equal(r.status,200);
  assert.deepEqual(await r.json(),{ok:true});
  assert.equal(sent.to,'frightertainment@gmail.com');
  assert.equal(sent.from,'contact@frightertainment.com');
  assert.equal(sent.subject,'Frightertainment private message');
  assert.equal(sent.replyTo,undefined);
  assert.equal(sent.text,'Nickname: Night Owl\n\nHere is my horror suggestion.');
});
test('anonymous Worker uses default Anonymous nickname when no nickname field is sent',async()=>{
  let sent;
  const r=await sendPrivateContact(anonymousReq({message:'I have a new horror movie recommendation.'}),
    {EMAIL:{send:async data=>{sent=data;return{messageId:'accepted-test'};}}});
  assert.equal(r.status,200);
  assert.equal(sent.text,'Nickname: Anonymous\n\nI have a new horror movie recommendation.');
  assert.equal(sent.replyTo,undefined);
});
test('private anonymous route rejects identity fields, malicious headers and extra body keys',async()=>{
  let sends=0;
  const env={EMAIL:{send:async()=>{sends++;return{messageId:'should-not-send'};}}};
  for(const bad of [
    {nickname:'G',message:'Legitimate-looking message',email:'visitor@example.com'},
    {nickname:'G',message:'Legitimate-looking message',replyTo:'reply@example.com'},
    {nickname:'G',message:'Legitimate-looking message',title:'Real name'},
    {nickname:'G',message:'Legitimate-looking message',subject:'Chosen subject'},
    {nickname:'G',message:'Legitimate-looking message',to:'attacker@example.com'},
    {nickname:'G\r\nBcc: attacker@example.com',message:'Legitimate-looking message'},
    {nickname:'X'.repeat(61),message:'Legitimate-looking message'},
    {nickname:null,message:'Legitimate-looking message'},
    {nickname:'G',message:'tiny'},
    {nickname:'G',message:'X'.repeat(5100)}
  ]) {
    const res=await sendPrivateContact(anonymousReq(bad),env);
    assert.ok([400,413].includes(res.status),'bad input accepted: '+JSON.stringify(bad).slice(0,90));
    assert.equal((await res.json()).ok,undefined);
  }
  assert.equal(sends,0);
});
test('anonymous Worker failure does not confirm delivery or disclose visitor text',async()=>{
  const body={nickname:'Hidden',message:'A private message that must not leak.'};
  const acceptedWithoutReceipt=await sendPrivateContact(anonymousReq(body),{EMAIL:{send:async()=>({})}});
  assert.equal(acceptedWithoutReceipt.status,503);
  assert.equal((await acceptedWithoutReceipt.json()).code,'FT-WORKER-NO-ACCEPTANCE');
  const rejected=await sendPrivateContact(anonymousReq(body),{EMAIL:{send:async()=>{throw Error('E_RECIPIENT_NOT_ALLOWED');}}});
  assert.equal(rejected.status,503);
  const json=await rejected.json();
  assert.equal(json.code,'FT-WORKER-RECIPIENT');
  assert.ok(!JSON.stringify(json).includes(body.message));
  assert.ok(!JSON.stringify(json).includes(body.nickname));
});
test('older private /send endpoint remains backwards compatible until production migration',async()=>{
  let sent;
  const res=await sendPrivateContact(req(base),{EMAIL:{send:async data=>{sent=data;return{messageId:'legacy-confirmed'};}}});
  assert.equal(res.status,200);
  assert.equal(sent.replyTo,base.email);
  assert.match(sent.subject,/^Frightertainment contact:/);
});
