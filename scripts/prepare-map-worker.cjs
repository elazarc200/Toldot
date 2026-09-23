const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),dest=path.join(root,'public/maps/worker');
const mapsDir=path.join(root,'public/maps');
fs.mkdirSync(dest,{recursive:true});
for(const file of ['maplibre-gl-worker.mjs','maplibre-gl-shared.mjs'])fs.copyFileSync(path.join(root,'node_modules/maplibre-gl/dist',file),path.join(dest,file));
fs.copyFileSync(path.join(root,'node_modules/maplibre-gl/LICENSE.txt'),path.join(dest,'LICENSE.txt'));
const rtlSrc=path.join(root,'node_modules/@mapbox/mapbox-gl-rtl-text/dist/mapbox-gl-rtl-text.js');
if(fs.existsSync(rtlSrc))fs.copyFileSync(rtlSrc,path.join(mapsDir,'mapbox-gl-rtl-text.js'));
