import assert from 'node:assert/strict';
import test from 'node:test';
import { onRequestPost } from '../functions/api/contact.js';

const ORIGIN = 'https://www.frightertainment.com';
const makeRequest = (message = 'Private diagnostic fixture, not an actual email.') =>
  new Request(ORIGIN + '/api/contact', {
    method: 'POST',
    headers: {
      origin: ORIGIN,
      'content-type': 'application/json',
      'cf-ray': 'a48aff36eb9beb19-LHR'
    },
    body: JSON.stringify({nickname:'Fixture',message})
  });

test('a missing delivery binding emits a safe correlatable 503 event', async () => {
  const oldError = console.error;
  const logs = [];
  console.error = (...args) => logs.push(args);
  try {
    const response = await onRequestPost({request:makeRequest(),env:{}});
    assert.equal(response.status,503);
    const body = await response.json();
    assert.equal(body.code,'FT-NO-DELIVERY-BINDING');
    assert.equal(logs.length,1);
    assert.equal(logs[0][0],'frightertainment_contact_http_5xx');
    assert.deepEqual(logs[0][1],{status:503,code:body.code,ray:'a48aff36eb9beb19-LHR'});
    assert.doesNotMatch(JSON.stringify(logs),/Private diagnostic fixture|Fixture|frightertainment@gmail.com/);
  } finally {
    console.error=oldError;
  }
});

test('a rejected service send produces categorized private logs and a 503, never message content', async () => {
  const oldError = console.error;
  const logs = [];
  console.error = (...args) => logs.push(args);
  try {
    const response = await onRequestPost({
      request:makeRequest('Sensitive fixture that must never enter logs.'),
      env:{CONTACT_DELIVERY:{fetch:async()=>new Response(JSON.stringify({
        code:'FT-WORKER-NO-ACCEPTANCE'
      }),{status:503,headers:{'content-type':'application/json'}})}}
    });
    assert.equal(response.status,503);
    assert.equal((await response.json()).code,'FT-WORKER-NO-ACCEPTANCE');
    assert.ok(logs.some(entry=>entry[0]==='frightertainment_contact_http_5xx'
      && entry[1].code==='FT-WORKER-NO-ACCEPTANCE'));
    assert.doesNotMatch(JSON.stringify(logs),/Sensitive fixture|frightertainment@gmail.com/);
  } finally {
    console.error=oldError;
  }
});

test('accepted mock send stays 200 without any failure log or real email', async () => {
  const oldError=console.error;
  const logs=[];
  console.error=(...args)=>logs.push(args);
  try {
    const response=await onRequestPost({
      request:makeRequest(),
      env:{CONTACT_DELIVERY:{fetch:async()=>new Response(JSON.stringify({ok:true}),{
        status:200,headers:{'content-type':'application/json'}
      })}}
    });
    assert.equal(response.status,200);
    assert.deepEqual(await response.json(),{ok:true,delivered:true});
    assert.equal(logs.length,0);
  } finally { console.error=oldError; }
});
