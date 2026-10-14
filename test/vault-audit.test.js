import test from 'node:test';
import assert from 'node:assert/strict';
import { auditVault } from '../scripts/audit-vault.mjs';

test('the complete historical Horror Vault has source identities and routes for every catalogue record',async()=>{
  const report=await auditVault();
  const summary=report.summary;
  assert.ok(summary.archiveRecords>=9772,'Do not accidentally truncate historical archive imports');
  assert.equal(summary.uniqueWikidataQids,summary.archiveRecords);
  assert.equal(summary.syntacticallyVerifiableWikidataSourceLinks,summary.archiveRecords);
  assert.equal(summary.externallyFetchedSourcePages,0,'Do not misreport external pages as HTTP-verified');
  assert.equal(report.records.length,summary.archiveRecords);
  assert.ok(report.records.every(row=>row.internalDetailUrl.startsWith('/archive-film.html?id=Q')));
  assert.equal(report.errors.length,0,report.errors.slice(0,10).join('\n'));
  assert.ok(summary.curatedFilmFiles>=24);
  assert.ok(summary.linkedHistoricalProfiles>=900);
  assert.ok(summary.validImdbIds>=9500);
});

test('ambiguous source IDs cannot be misrepresented as unambiguous IMDb movie matches',async()=>{
  const r=await auditVault();
  for(const collision of r.duplicateImdb){
    assert.ok(collision.qids.length>=2);
    assert.match(collision.imdbId,/^tt\d{7,10}$/);
    assert.ok(collision.qids.every(id=>r.records.some(x=>x.qid===id)));
  }
  assert.equal(r.evidenceStatus.externalSourceReachability,
    'not verified for all external Wikidata/IMDb/publisher pages');
});
