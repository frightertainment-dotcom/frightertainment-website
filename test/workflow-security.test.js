import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('write-enabled archive workflows target the current protected preview, never live', async () => {
  for (const file of ['.github/workflows/horror-archive-sync.yml', '.github/workflows/film-profile-sync.yml']) {
    const workflow = await readFile(file, 'utf8');
    const staging='codex/frightertainment-redesign-tmdb-preview';
    assert.ok(workflow.includes('TARGET_BRANCH: '+staging),file+' must stage only in the approved preview');
    assert.ok(workflow.includes('ref: '+staging),file+' must check out that preview');
    assert.match(workflow, /^on:\s*\n\s+workflow_dispatch:\s*\n\s+schedule:/m);
    assert.doesNotMatch(workflow, /^\s+push:/m,'no automatic write on every preview push');
    assert.doesNotMatch(workflow, /codex\/frightertainment-v1/,'old preview branch must not be used');
    assert.ok(!workflow.includes('TARGET_BRANCH: main'),file+' must not push to main');
    assert.doesNotMatch(workflow, /git\s+(?:fetch|rebase|push)[^\n]*\$\{\{/,'untrusted inline branch expression');
    assert.match(workflow, /git fetch origin "refs\/heads\/\$\{TARGET_BRANCH\}"/);
    assert.match(workflow, /git push origin "HEAD:refs\/heads\/\$\{TARGET_BRANCH\}"/);
  }
});

test('quality workflow has read-only repository permissions and no deployment command', async () => {
  const workflow = await readFile('.github/workflows/quality.yml', 'utf8');
  assert.match(workflow, /permissions:\s*\n\s+contents:\s+read/);
  assert.doesNotMatch(workflow, /wrangler\s+deploy(?![^\n]*--dry-run)|cloudflare-pages\s+deploy|pages deploy/i);
});
