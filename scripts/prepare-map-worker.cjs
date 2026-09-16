const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),dest=path.join(root,'public/maps/worker');
fs.mkdirSync(dest,{recursive:true});
for(const file of ['maplibre-gl-worker.mjs','maplibre-gl-shared.mjs'])fs.copyFileSync(path.join(root,'node_modules/maplibre-gl/dist',file),path.join(dest,file));
fs.copyFileSync(path.join(root,'node_modules/maplibre-gl/LICENSE.txt'),path.join(dest,'LICENSE.txt'));
