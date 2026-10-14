// Verify browser/client and Worker JavaScript parses before slow quality/browser tests.
// Exclude artifacts, dependency installs and generated build output.
import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ignore=new Set(['node_modules','dist','.git','.wrangler','test-results','playwright-report','audit-results','.next','.cache']);
const targets=[];
async function walk(dir){
  const entries=await readdir(dir,{withFileTypes:true});
  for(const entry of entries){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()&&!ignore.has(entry.name))await walk(full);
    else if(entry.isFile()&&/\.(?:js|mjs|cjs)$/.test(entry.name))targets.push(full);
  }
}
await walk(root);
const failures=[];
for(const file of targets.sort()){
  const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8',timeout:15000});
  if(result.status!==0)failures.push(path.relative(root,file)+': '+(result.stderr||result.error||'Invalid JavaScript syntax').toString().trim());
}
if(failures.length){
  console.error('JavaScript syntax checks FAILED:\n'+failures.join('\n'));
  process.exitCode=1;
}else{
  console.log('JavaScript syntax check passed: '+targets.length+' source and test JS files.');
}
