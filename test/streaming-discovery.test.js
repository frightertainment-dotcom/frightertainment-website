import test from 'node:test';
import assert from 'node:assert/strict';
import { auditStreaming } from '../scripts/check-streaming-discovery.mjs';

test('research inventory preserves evidence, film-year identity and correct access pricing for every entry',async()=>{
  const result=await auditStreaming();
  assert.equal(result.errors.length,0,result.errors.join('\n'));
  assert.ok(result.records>=50);
  assert.ok(result.sourceEntries===result.records);
  assert.ok(result.accessBreakdown.subscription>=20);
  assert.ok(result.accessBreakdown.free>=4);
  assert.ok(result.accessBreakdown['rent-buy']>=4);
  assert.deepEqual(result.countries,['GB','US']);
});
