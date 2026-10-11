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
