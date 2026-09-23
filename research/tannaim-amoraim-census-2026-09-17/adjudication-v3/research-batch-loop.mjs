import {execSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const from = Number(process.argv[2] || 4);
const to = Number(process.argv[3] || 8);

for (let b = from; b <= to; b++) {
  console.log('\n=== RESEARCH BATCH', b, '===');
  const phase = b >= 57 ? '--phase=2' : '';
  execSync(`node "${path.join(dir, 'research-run.mjs')}" ${phase} --batch=${b}`, {stdio: 'inherit'});
  execSync(`node "${path.join(dir, 'apply-research-batch.mjs')}" ${b}`, {stdio: 'inherit'});
  execSync(`node "${path.join(dir, 'validate.mjs')}"`, {stdio: 'inherit'});
  if (b % 5 === 0) {
    execSync(`node "${path.join(dir, 'enrich-evidence.mjs')}"`, {stdio: 'inherit'});
    execSync(`node "${path.join(dir, 'link-heiman-hyman.mjs')}"`, {stdio: 'inherit'});
  }
}

execSync(`node "${path.join(dir, 'build-profiles.mjs')}"`, {stdio: 'inherit'});
console.log('Batch loop complete', from, 'to', to);
