import test from 'node:test';
import assert from 'node:assert/strict';
import {sendPrivateContact} from '../worker/contact-mailer.js';
const base={title:'Site visitor',email:'visitor@example.com',subject:'Film suggestion',message:'Please feature this film.'};
const req=(data=base,url='https://frightertainment-contact-mailer.internal/send')=>new Request(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
test('private contact mailer sends a fixed-address message with safe replyTo',async()=>{
  let saved;
  const response=await sendPrivateContact(req({...base,to:'attacker@example.invalid'}),{EMAIL:{send:async x=>{saved=x;}}});
  assert.equal(response.status,200);
  assert.equal(saved.to,'Frightertainment@gmail.com');
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
