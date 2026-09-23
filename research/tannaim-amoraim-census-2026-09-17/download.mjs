import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
const root=path.dirname(fileURLToPath(import.meta.url));
const tree=JSON.parse(fs.readFileSync(path.join(root,'raw/sefaria_data_tree.json'))).tree;
const selected=tree.filter(x=>x.type==='blob'&&(/external_named_entities\/.*json$|pretagged_mentions\/sperling_mentions_(bavli|mishnah|tosefta)\.json$|ner_input\/ner_tagger_input_(bavli|mishnah|tosefta|yerushalmi)\.json$|\/bonayich_scripts\.py$|\/convert_sperling_data\.py$|\/import_yerushalmi_rabbis\.py$|research\/topics\/RabbisNames\.csv$/.test(x.path)));
const jobs=selected.map(x=>({key:x.path.split('/').at(-1),url:'https://raw.githubusercontent.com/Sefaria/Sefaria-Data/master/'+x.path,gitBlob:x.sha}));
jobs.push({key:'export-root.json',url:'https://api.github.com/repos/Sefaria/Sefaria-Export/contents/'},{key:'topic-akiva.json',url:'https://www.sefaria.org/api/topics/rabbi-akiva?with_refs=1&with_links=1'});
for(const group of ['talmudic-people','mishnaic-people'])jobs.push({key:'root-'+group+'.json',url:'https://www.sefaria.org/api/topics/'+group+'?with_refs=0&with_links=1'});
const log=[];
async function worker(){while(jobs.length){const j=jobs.shift();const dest=path.join(root,'raw',j.key);try{if(!fs.existsSync(dest)){const r=await fetch(j.url,{signal:AbortSignal.timeout(90000)});if(!r.ok)throw Error('HTTP '+r.status);fs.writeFileSync(dest,await r.text());}const b=fs.readFileSync(dest);log.push({...j,bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex'),retrieved:new Date().toISOString()});console.log(j.key,b.length);}catch(e){log.push({...j,error:String(e)});console.log(j.key,String(e));}}}
await Promise.all(Array.from({length:4},worker));fs.writeFileSync(path.join(root,'download-manifest.json'),JSON.stringify(log,null,2));
