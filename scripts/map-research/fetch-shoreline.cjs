const fs=require('fs');
(async()=>{
 const query='[out:json][timeout:40];relation["natural"="water"]["name:en"="Sea of Galilee"];out geom;';
 const r=await fetch('https://overpass.kumi.systems/api/interpreter?data='+encodeURIComponent(query),{signal:AbortSignal.timeout(55000)});if(!r.ok)throw Error(r.status);const d=await r.json();fs.writeFileSync('docs/research/source-cache/galilee-osm.json',JSON.stringify(d));console.log(d.elements.map(e=>({id:e.id,tags:e.tags,members:e.members?.length})));
})();
