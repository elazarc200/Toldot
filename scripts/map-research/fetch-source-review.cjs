// Read-only remote research; raw responses are retained for reproducible excerpts.
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'../..');
const pilot=require(path.join(root,'src/components/knowledge/pilot.json'));
const cache=path.join(root,'docs/research/source-cache');fs.mkdirSync(cache,{recursive:true});
const ids=new Set(pilot.geography.personPlaces.flatMap(r=>r.sourceIds));
const refs=[...new Set(pilot.citations.filter(c=>ids.has(c.id)&&c.url.includes('sefaria.org/')).map(c=>decodeURIComponent(new URL(c.url).pathname.slice(1)).replace(/_/g,' ')).concat(['Jerusalem Talmud Sheviit 9:1','Shabbat 33b','Shabbat 34a','Pirkei Avot 6:9','Rosh Hashanah 31b','Bava Metzia 84b']))];
async function get(ref){
 const file=path.join(cache,Buffer.from(ref).toString('base64url')+'.json');if(fs.existsSync(file))return;
 try{const res=await fetch('https://www.sefaria.org/api/texts/'+encodeURIComponent(ref)+'?context=0&commentary=0&pad=0',{signal:AbortSignal.timeout(30000)});const data=await res.json();if(!res.ok||data.error)throw Error(data.error||res.status);fs.writeFileSync(file,JSON.stringify({requested:ref,...data}));console.log('OK '+ref);}catch(e){console.log('FAILED '+ref+' '+e.message);}
}
(async()=>{for(let i=0;i<refs.length;i+=4)await Promise.all(refs.slice(i,i+4).map(get));
const res=await fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_lakes.geojson');if(!res.ok)throw Error('lakes '+res.status);const data=await res.json();const features=data.features.filter(f=>/Galilee|Tiberias|Kinneret/i.test(JSON.stringify(f.properties)));if(!features.length)throw Error('Galilee missing');fs.writeFileSync(path.join(cache,'galilee-natural-earth.json'),JSON.stringify({source:'Natural Earth 1:10m lakes, public domain',features}));console.log('GALILEE '+features.length);
})();
