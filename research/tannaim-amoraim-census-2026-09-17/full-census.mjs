import {spawnSync} from 'node:child_process';import {root} from './lib.mjs';
const collect=process.argv.includes('--collect');
const steps=[...(collect?['collect.mjs','download.mjs','corpus.mjs','wikipedia.mjs','topic-details.mjs','heiman.mjs','heiman-text.mjs']:[]),'hyman-entries.mjs','identities.mjs','hyman-augment.mjs','wiki-citations.mjs','hyman-citations.mjs','scan.mjs','resolve.mjs','validate.mjs','reports.mjs'];
for(const step of steps){console.log('\nRunning '+step);const result=spawnSync(process.execPath,['--max-old-space-size=4096',step],{cwd:root,stdio:'inherit',windowsHide:true});if(result.status!==0){console.error('Stopped after failed step:',step);process.exit(result.status||1);}}
