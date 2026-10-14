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

test('Historical film years are preserved and past Shudder premieres do not assert current availability',async()=>{
 const fs=await import('node:fs/promises');
 const d=JSON.parse(await fs.readFile(new URL('../data/streaming-discovery.json',import.meta.url),'utf8'));
 for(const year of [2021,2022,2023,2024,2025,2026])assert.ok(d.entries.some(e=>e.filmYear===year),'Missing '+year);
 const past=d.entries.filter(e=>e.availabilityStatus==='historical-premiere-check-current-service');
 assert.ok(past.length>=30);
 assert.ok(past.every(e=>e.countries.length===1&&e.countries[0]==='US'));
 assert.ok(past.every(e=>e.dateBasis==='original-platform-premiere'));
});