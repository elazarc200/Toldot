import fs from 'node:fs';
import path from 'node:path';
const root=path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/,'$1'));
const targets={topics:'https://www.sefaria.org/api/topics?limit=0&minify=0',index:'https://www.sefaria.org/api/index',sefaria_data_tree:'https://api.github.com/repos/Sefaria/Sefaria-Data/git/trees/master?recursive=1'};
for(const [key,url] of Object.entries(targets)){
 const dest=path.join(root,'raw',key+'.json');if(fs.existsSync(dest)){console.log('cached',key);continue;}
 const res=await fetch(url,{headers:{'User-Agent':'Toladot-research-census/1.0'},signal:AbortSignal.timeout(120000)});
 if(!res.ok)throw Error(key+' HTTP '+res.status);
 const data=await res.json();fs.writeFileSync(dest,JSON.stringify(data));console.log(key,Array.isArray(data)?data.length:Object.keys(data));
}
