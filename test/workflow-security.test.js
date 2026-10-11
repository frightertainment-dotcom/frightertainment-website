import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('write-enabled archive workflows target protected staging and never push directly to main', async () => {
  for (const file of ['.github/workflows/horror-archive-sync.yml', '.github/workflows/film-profile-sync.yml']) {
    const workflow = await readFile(file, 'utf8');
    assert.ok(workflow.includes('TARGET_BRANCH: codex/frightertainment-redesign-tmdb-preview'), `${file} must commit into protected staging`);
    assert.ok(workflow.includes('ref: codex/frightertainment-redesign-tmdb-preview'), `${file} must check out staging`);
    assert.match(workflow, /^on:\\s*\\n\\s+workflow_dispatch:\\s*\\n\\s+schedule:/m, `${file} must run on a deliberate dispatch or Monday schedule`);
    assert.doesNotMatch(workflow, /^\\s+push:/m, `${file} must not trigger writes on every preview push`);
    assert.doesNotMatch(workflow, /codex\\/frightertainment-v1/, `${file} must not update the abandoned preview branch`);
    assert.ok(!workflow.includes('TARGET_BRANCH: main'), `${file} must not target main`);
    assert.doesNotMatch(workflow, /git\s+(?:fetch|rebase|push)[^\n]*\$\{\{/, `${file} must not interpolate the branch expression inside git shell commands`);
    assert.match(workflow, /git fetch origin "refs\/heads\/\$\{TARGET_BRANCH\}"/);
    assert.match(workflow, /git push origin "HEAD:refs\/heads\/\$\{TARGET_BRANCH\}"/);
  }
});

test('quality workflow has read-only repository permissions and no deployment command', async () => {
  const workflow = await readFile('.github/workflows/quality.yml', 'utf8');
  assert.match(workflow, /permissions:\s*\n\s+contents:\s+read/);
  assert.doesNotMatch(workflow, /wrangler\s+deploy(?![^\n]*--dry-run)|cloudflare-pages\s+deploy|pages deploy/i);
});
