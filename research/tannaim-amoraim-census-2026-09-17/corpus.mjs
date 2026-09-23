import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import crypto from 'node:crypto';
const root=path.dirname(fileURLToPath(import.meta.url));const catalog=JSON.parse(fs.readFileSync(path.join(root,'raw/export-books.json')));
const base=catalog.books.filter(b=>b.language==='Hebrew'&&b.versionTitle==='merged');
const selected=base.filter(b=>{
 const c=b.categories,t=b.title;
 if(c.some(x=>/Commentary|Rishonim|Acharonim|Modern/.test(x))||/^(Footnotes|Notes and Corrections|Buber footnotes|Ein Yaakov)/.test(t))return false;
 return ['Mishnah','Tosefta','Talmud','Midrash'].includes(c[0])||/^(Avot DeRabbi Natan|Minor Tractates|Derekh Eretz|Semachot|Soferim|Kallah|Seder Olam)/.test(t);
});
fs.mkdirSync(path.join(root,'raw/corpus'),{recursive:true});
const jobs=selected.map(b=>({...b,key:crypto.createHash('sha256').update(b.title).digest('hex').slice(0,16)}));const manifest=[];
async function worker(){while(jobs.length){const b=jobs.shift(),dest=path.join(root,'raw/corpus',b.key+'.json');try{if(!fs.existsSync(dest)){const r=await fetch(b.cltk_flat_url,{signal:AbortSignal.timeout(90000)});if(!r.ok)throw Error('HTTP '+r.status);const txt=await r.text();JSON.parse(txt);fs.writeFileSync(dest,txt);}const bytes=fs.readFileSync(dest),d=JSON.parse(bytes);manifest.push({...b,status:'downloaded',sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,segments:Object.values(d.text||{}).filter(x=>typeof x==='string'&&x.trim()).length,retrieved:new Date().toISOString()});}catch(e){manifest.push({...b,status:'failed',error:String(e)});}if(manifest.length%20===0)console.log('books',manifest.length,'/',selected.length);}}
await Promise.all(Array.from({length:4},worker));fs.writeFileSync(path.join(root,'corpus-manifest.json'),JSON.stringify({catalog_generated_at:catalog.generated_at,books:manifest.sort((a,b)=>a.title.localeCompare(b.title)),exclusion_rule:'Modern commentaries and commentary categories excluded; base Midrash includes later compilations, to be distinguished during evidence assessment.'},null,2));console.log('completed',manifest.length,'failed',manifest.filter(b=>b.status==='failed').length);
