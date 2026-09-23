const fs=require('fs');
const t=fs.readFileSync('docs/research/source-cache/holy-rashbi.html','utf8');
const i=t.indexOf('[{"post_id"');const j=t.indexOf('}]',i)+2;
if(i<0||j<2)throw Error('Public map dataset not found');
const rows=JSON.parse(t.slice(i,j));
fs.writeFileSync('docs/research/source-cache/holy-sites.json',JSON.stringify(rows,null,2));
console.log(rows.map(r=>r.post_id+' '+r.title+' '+r.lat+','+r.lng).join('\n'));
