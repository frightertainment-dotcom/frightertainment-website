import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestPost,onRequest} from '../functions/api/contact.js';

const make = (data,headers={}) => new Request('https://frightertainment.com/api/contact',{
  method:'POST',
  headers:{'content-type':'application/json','origin':'https://frightertainment.com',...headers},
  body:typeof data==='string'?data:JSON.stringify(data)
});
const good={title:'Viewer',subject:'Film suggestion',message:'Please consider this film for the site.',company:''};

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
  assert.ok(!JSON.stringify(await result.json()).includes(good.message));
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
