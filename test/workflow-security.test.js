import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('write-enabled archive workflows pass branch names through quoted environment variables', async () => {
  for (const file of ['.github/workflows/horror-archive-sync.yml', '.github/workflows/film-profile-sync.yml']) {
    const workflow = await readFile(file, 'utf8');
    assert.match(workflow, /TARGET_BRANCH:\s*\$\{\{\s*github\.ref_name\s*\}\}/, `${file} must expose the selected branch as an environment value`);
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
