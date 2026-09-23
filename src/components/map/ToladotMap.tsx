"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {Map as MapLibre,Marker,NavigationControl,ScaleControl,setWorkerUrl,setRTLTextPlugin,type GeoJSONSource,type StyleSpecification} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {atlas,sages,periods,emptyTime,matchesTime,validTime,placeContent,placeSize,placeSummary,pointsForPlaces,regimeAt,yearRangeForPeriod,yearRangeForSage,type TimeFilter,type AtlasPlace} from '@/domain/toladot-map';
import {calculatePlaceCentrality,effectiveLabelMinZoom,effectivePinMinZoom,pinSizeForTier} from '@/domain/map-centrality';
import {territoryMatchesTime,type TerritoryProps} from '@/domain/historical-territories';
import {AtlasPlaceCard} from './AtlasPlaceCard';
import {AtlasBurialCard} from './AtlasBurialCard';
import {AtlasSources} from './AtlasSources';
import {burialMatchesTime} from '@/domain/toladot-map';
import './atlas.css';

type Filters={time:TimeFilter;place:string;events:boolean;institutions:boolean;places:boolean;modern:boolean;borders:boolean;burials:boolean;roads:boolean};
type BurialDisplay='icons'|'labels';
type Camera={center:[number,number];zoom:number};
const defaults:Filters={time:emptyTime,place:'',events:false,institutions:false,places:true,modern:false,borders:false,burials:false,roads:false};
type TerritoryFeature={type:'Feature';id?:string;properties:TerritoryProps&{id?:string};geometry:GeoJSON.Geometry};
const defaultCamera:Camera={center:[34.75,32.1],zoom:7};
const MODERN_STYLE_URL='https://tiles.openfreemap.org/styles/positron';
const RTL_PLUGIN='/maps/mapbox-gl-rtl-text.js';
const ISOLATION_PX=110;
const tierLabels={major:'מרכז ראשי',important:'מרכז חשוב',secondary:'מקום משני',minor:'אזכור מתועד'} as const;
const teaser=(text:string,limit=180)=>text.length<=limit?text:text.slice(0,limit).replace(/\s+\S*$/,'')+'…';

const historicalStyle:StyleSpecification={
 version:8,
 glyphs:'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
 sources:{
  land:{type:'geojson',data:'/maps/land.geojson'},
  lakes:{type:'geojson',data:'/maps/lakes.geojson'},
  levant:{type:'geojson',data:'/maps/levant-features.geojson'},
  territories:{type:'geojson',data:{type:'FeatureCollection',features:[]}},
 },
 layers:[
  {id:'water',type:'background',paint:{'background-color':'#dce7e5'}},
  {id:'land',type:'fill',source:'land',paint:{'fill-color':'#f3f1e8'}},
  {id:'shore',type:'line',source:'land',paint:{'line-color':'#baccc7','line-width':1.2}},
  {id:'lakes',type:'fill',source:'lakes',paint:{'fill-color':'#dce7e5'}},
  {id:'levant-lakes',type:'fill',source:'levant',filter:['==',['get','kind'],'lake'],paint:{'fill-color':'#c9d9d6','fill-opacity':0.85}},
  {id:'levant-river',type:'line',source:'levant',filter:['==',['get','kind'],'river'],paint:{'line-color':'#9bb5b0','line-width':1.6,'line-opacity':0.9}},
  {id:'territories-fill',type:'fill',source:'territories',paint:{'fill-color':'#ac8d50','fill-opacity':0.08}},
  {id:'territories-line',type:'line',source:'territories',paint:{'line-color':'#8a7348','line-width':1.1,'line-opacity':0.55,'line-dasharray':[2,2]}},
  {id:'levant-labels',type:'symbol',source:'levant',filter:['==',['get','kind'],'region-label'],
   layout:{'text-field':['get','nameHe'],'text-size':12,'text-font':['Open Sans Regular','Arial Unicode MS Regular'],'text-allow-overlap':false},
   paint:{'text-color':'#7a8478','text-halo-color':'#f3f1e8','text-halo-width':1.4}},
 ],
};

const HEBREW_TEXT:unknown=[
 'let','hebrewName',[
 'case',
 ['all',['has','name:he'],['!=',['get','name:he'],'']],['get','name:he'],
 ['all',['has','name:he_IL'],['!=',['get','name:he_IL'],'']],['get','name:he_IL'],
 ['all',['has','name_he'],['!=',['get','name_he'],'']],['get','name_he'],
 '',
 ],
 // Editorial terminology for the modern map; do not alter source geography.
 ['case',
  ['in',['var','hebrewName'],['literal',['השטחים הפלסטיניים','השטחים הפלסטינים','הרשות הפלסטינית','פלסטין','יהודה ושומרון','הגדה המערבית']]],'יהודה ושומרון',
  ['any',['in','פלסט',['var','hebrewName']],['in','פלשת',['var','hebrewName']]],'',
  ['var','hebrewName'],
 ],
];

function hebrewOnlyStyle(raw:StyleSpecification):StyleSpecification{
 const style=structuredClone(raw);
 for(const layer of style.layers||[]){
  if(layer.type!=='symbol')continue;
  const layout=layer.layout||(layer.layout={});
  (layout as Record<string,unknown>)['text-field']=HEBREW_TEXT;
  // Soften modern look toward Toladot paper palette where possible.
  if(!layer.paint)layer.paint={};
  const paint=layer.paint as Record<string,unknown>;
  if(paint['text-color']==null)paint['text-color']='#3d4f45';
  if(paint['text-halo-color']==null)paint['text-halo-color']='#f7f5ef';
 }
 return style;
}

export default function ToladotMap({initialPerson='',initialPlace='',initialPeriod=''}:{initialPerson?:string;initialPlace?:string;initialPeriod?:string}){
 const initialPeriodId=periods.some(p=>p.id===initialPeriod)?initialPeriod:'';
 const initialYears=initialPeriodId?yearRangeForPeriod(initialPeriodId):null;
 const [filters,setFilters]=useState<Filters>({...defaults,time:{
  period:initialPeriodId,
  from:initialYears?.from||'',
  to:initialYears?.to||'',
 }});
 const [person,setPerson]=useState(sages.some(p=>p.id===initialPerson)?initialPerson:'');
 const [selected,setSelected]=useState(atlas.places.find(p=>p.id===initialPlace||p.slug===initialPlace)?.id||'');
 const [search,setSearch]=useState(''),[filterOpen,setFilterOpen]=useState(false),[ready,setReady]=useState(false),[mapError,setMapError]=useState(false),[modernError,setModernError]=useState(false);
 const [zoom,setZoom]=useState(defaultCamera.zoom);
 const [burialDisplay,setBurialDisplay]=useState<BurialDisplay>('icons');
 const [hover,setHover]=useState<{id:string;x:number;y:number;size:number}|null>(null);
 const [territoryCatalog,setTerritoryCatalog]=useState<TerritoryFeature[]>([]);
 const [activeTerritoryNames,setActiveTerritoryNames]=useState<string[]>([]);
 const [styleEpoch,setStyleEpoch]=useState(0);
 const container=useRef<HTMLDivElement>(null),map=useRef<MapLibre|null>(null),markers=useRef<Marker[]>([]);
 const saved=useRef<{camera:Camera;filters:Filters}|null>(initialPerson?{camera:defaultCamera,filters:defaults}:null);
 const modernActive=useRef(false);
 const ignoreMapClick=useRef(false);
 const hoverHideTimer=useRef<number|null>(null);
 const selectedSage=sages.find(p=>p.id===person),selectedPlace=atlas.places.find(p=>p.id===selected);

 const filtered=useMemo(()=>atlas.places.filter(place=>{
  if(filters.place&&place.id!==filters.place)return false;
  const content=placeContent(place.id,filters.time);
  if(person)return content.activities.some(r=>r.personId===person);
  if(filters.place===place.id)return true;
  return (filters.places&&content.activities.length>0)||(filters.events&&content.events.length>0)||(filters.institutions&&content.institutions.length>0);
 }),[filters,person]);
 const [selectedBurial,setSelectedBurial]=useState('');
 const visibleBurials=useMemo(()=>filters.burials?atlas.burials.filter(b=>(!person||b.personIds.includes(person))&&burialMatchesTime(b,filters.time)):[],[filters.burials,filters.time,person]);
 const burialSearchHits=useMemo(()=>search.trim()?atlas.burials.filter(b=>b.name.includes(search.trim())||b.personIds.some(id=>sages.find(s=>s.id===id)?.name.includes(search.trim()))).slice(0,8):[],[search]);
 const burial=atlas.burials.find(b=>b.id===selectedBurial);
 function openBurial(id:string){const b=atlas.burials.find(b=>b.id===id);if(!b)return;setSelected('');setSelectedBurial(id);setSearch('');setFilterOpen(false);setPerson('');setFilters(f=>({...f,burials:true,time:emptyTime}));map.current?.jumpTo({center:[b.location.lng,b.location.lat],zoom:12});}

 const located=filtered.filter(p=>p.locations.length),unlocated=filtered.filter(p=>!p.locations.length);
 const links=atlas.personPlaces.filter(r=>(!person||r.personId===person)&&matchesTime(r,filters.time));
 const update=(patch:Partial<Filters>)=>{setFilters(f=>({...f,...patch}));};

 const placeSearchHits=useMemo(()=>{
  const q=search.trim();
  if(!q)return [] as AtlasPlace[];
  return atlas.places.filter(p=>p.name.includes(q)).slice(0,8);
 },[search]);

 function setPeriod(period:string){
  const years=period?yearRangeForPeriod(period):null;
  update({time:{period,from:years?.from||'',to:years?.to||''}});
 }

 function focus(id:string){
  if(!id){back();return;}
  if(!person){const m=map.current;saved.current={filters,camera:m?{center:m.getCenter().toArray() as [number,number],zoom:m.getZoom()}:defaultCamera};}
  const years=yearRangeForSage(id);
  setPerson(id);setSelected('');setSelectedBurial('');setSearch('');
  // A sage focus must show every place documented for him, so no period filter is applied here;
  // the year inputs still follow his documented activity span.
  setFilters(f=>({
   ...f,
   place:'',
   places:true,
   time:{period:'',from:years?.from||'',to:years?.to||''},
  }));
  setFilterOpen(false);
 }
 function back(){setPerson('');setSelected('');if(saved.current){setFilters(saved.current.filters);map.current?.jumpTo({...saved.current.camera,padding:{top:0,bottom:0,left:0,right:0}});saved.current=null;}}
 function fit(places:AtlasPlace[]){const m=map.current,points=pointsForPlaces(places);if(!m||!points.length)return;
  // Keep places clear of the focus banner, the period panel on the right and the legend below it.
  const pad={top:130,bottom:110,left:80,right:230};
  if(points.length===1){m.easeTo({center:points[0]!,zoom:8.5,padding:pad,duration:0});return;}
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);m.fitBounds([[Math.min(...xs),Math.min(...ys)],[Math.max(...xs),Math.max(...ys)]],{padding:pad,maxZoom:8.5,duration:0});
 }
 function cancelHoverHide(){
  if(hoverHideTimer.current){clearTimeout(hoverHideTimer.current);hoverHideTimer.current=null;}
 }
 function selectPlace(id:string){
  cancelHoverHide();
  // Pin/hover clicks also reach the MapLibre canvas; skip the empty-map closer for this gesture.
  ignoreMapClick.current=true;
  window.setTimeout(()=>{ignoreMapClick.current=false;},80);
  setSelectedBurial('');
  setSelected(id);
  setHover(null);
 }
 function openPlace(id:string){
  const place=atlas.places.find(p=>p.id===id);
  selectPlace(id);setSearch('');
  // A place whose site is undecided cannot be pointed at, so the map keeps its view and its
  // neighbours rather than emptying itself while the entry is open.
  if(place?.locations.length){update({place:id});fit([place]);}
  else update({place:''});
 }

 useEffect(()=>{
  if(!container.current)return;
  setWorkerUrl('/maps/worker/maplibre-gl-worker.mjs');
  void setRTLTextPlugin(RTL_PLUGIN,true).catch(()=>{/* RTL optional if CDN blocked */});
  let m:MapLibre;
  try{
   m=new MapLibre({
    container:container.current,style:historicalStyle,...defaultCamera,
    attributionControl:{compact:true,customAttribution:'Natural Earth · תולדות'},
    minZoom:2,maxZoom:12,
    locale:{'NavigationControl.ZoomIn':'התקרבות','NavigationControl.ZoomOut':'התרחקות','NavigationControl.ResetBearing':'איפוס כיוון','AttributionControl.ToggleAttribution':'מקורות המפה'},
   });
  }catch{setMapError(true);return;}
  map.current=m;
  m.addControl(new NavigationControl({showCompass:false}),'bottom-left');
  m.addControl(new ScaleControl({unit:'metric'}),'bottom-left');
  m.on('load',()=>{
   setReady(true);setZoom(m.getZoom());
   fetch('/maps/historical-territories.geojson')
    .then(r=>r.json())
    .then((fc:{features:TerritoryFeature[]})=>{
     setTerritoryCatalog(fc.features.map(f=>({
      ...f,
      properties:{...f.properties,id:String(f.id||f.properties.nameHe)},
     })));
    })
    .catch(()=>{/* territories optional if asset missing */});
  });
  // Zoom is sampled at the end of a gesture (and quantised) so pins are not rebuilt frame by frame.
  const sampleZoom=()=>setZoom(Math.round(m.getZoom()*4)/4);
  m.on('zoomend',sampleZoom);
  m.on('moveend',sampleZoom);
  m.on('movestart',()=>setHover(null));
  m.on('error',e=>{
   const msg=String(e.error?.message||e.error||'');
   if(/openfreemap|tile|style|modern/i.test(msg))setModernError(true);
  });
  const clearPlace=()=>{if(ignoreMapClick.current)return;setSelected('');};
  const canvas=m.getCanvas();
  canvas.addEventListener('click',clearPlace);
  const onContainerClick=(ev:MouseEvent)=>{
   const t=ev.target;
   if(!(t instanceof Element))return;
   if(t.closest('.atlas-pin,.atlas-hover-card,.atlas-detail,.atlas-filters,.atlas-focus,.atlas-regimes,.maplibregl-ctrl,.maplibregl-marker'))return;
   if(t===canvas||t.classList.contains('maplibregl-canvas')||t.closest('.maplibregl-canvas-container'))clearPlace();
  };
  container.current.addEventListener('click',onContainerClick);
  const resize=new ResizeObserver(()=>m.resize());resize.observe(container.current);
  return()=>{canvas.removeEventListener('click',clearPlace);container.current?.removeEventListener('click',onContainerClick);resize.disconnect();markers.current.forEach(p=>p.remove());m.remove();map.current=null;};
 },[]);

 useEffect(()=>{if(ready&&person)fit(filtered);},[ready,person,filtered]);
 useEffect(()=>{if(!ready||!initialPlace||person)return;const place=atlas.places.find(p=>p.id===initialPlace||p.slug===initialPlace);if(place)fit([place]);},[ready,initialPlace,person]);

 // Modern comparison: OpenFreeMap Positron with Hebrew-only labels (no English fallback).
 useEffect(()=>{
  const m=map.current;if(!m||!ready)return;
  // Already on historical style at startup — don't reload until leaving modern mode.
  if(!filters.modern&&!modernActive.current)return;
  let cancelled=false;
  const camera={center:m.getCenter(),zoom:m.getZoom(),bearing:m.getBearing(),pitch:m.getPitch()};
  (async()=>{
   try{
    if(filters.modern){
     const res=await fetch(MODERN_STYLE_URL);
     if(!res.ok)throw new Error('modern style fetch failed');
     const raw=await res.json() as StyleSpecification;
     if(cancelled)return;
     modernActive.current=true;
     m.setStyle(hebrewOnlyStyle(raw));
    }else{
     modernActive.current=false;
     m.setStyle(historicalStyle);
    }
    m.once('style.load',()=>{
     if(cancelled)return;
     m.jumpTo(camera);
     setZoom(m.getZoom());
     setStyleEpoch((n)=>n+1);
     setModernError(false);
    });
   }catch{
    if(!cancelled){
     setModernError(true);
     modernActive.current=false;
    }
   }
  })();
  return()=>{cancelled=true;};
 },[ready,filters.modern]);

 useEffect(()=>{
  const m=map.current;if(!m||!ready||!m.isStyleLoaded())return;
  if(!m.getSource('territories'))return;
  const src=m.getSource('territories') as GeoJSONSource;
  const show=filters.borders&&!filters.modern&&validTime(filters.time)&&(!!filters.time.period||!!filters.time.from||!!filters.time.to);
  if(!show){
   src.setData({type:'FeatureCollection',features:[]});
   setActiveTerritoryNames([]);
   return;
  }
  const matched=territoryCatalog.filter(f=>territoryMatchesTime(f.properties,filters.time));
  const political=matched.filter(f=>f.properties.entityType!=='region');
  const regions=matched.filter(f=>f.properties.entityType==='region');
  const features=political.length?political:regions;
  src.setData({type:'FeatureCollection',features});
  setActiveTerritoryNames(features.map(f=>f.properties.nameHe));
  const conf=features[0]?.properties.geometryConfidence||'approximate';
  if(m.getLayer('territories-line')){
   m.setPaintProperty('territories-line','line-dasharray',conf==='established'?[1,0]:conf==='uncertain'?[1,2.5]:[2,2]);
   m.setPaintProperty('territories-fill','fill-opacity',conf==='uncertain'?0.05:0.08);
  }
 },[ready,styleEpoch,filters.borders,filters.modern,filters.time,territoryCatalog]);

 useEffect(()=>{
  const m=map.current;if(!m||!ready||!m.isStyleLoaded())return;
  const data:GeoJSON.FeatureCollection={type:'FeatureCollection',features:atlas.roads.filter(r=>filters.roads&&matchesTime(r,filters.time)).map(r=>({type:'Feature',properties:{name:r.name},geometry:{type:'LineString',coordinates:r.coordinates}}))};
  if(m.getLayer('ancient-road-lines'))m.removeLayer('ancient-road-lines');
  if(m.getSource('ancient-roads'))m.removeSource('ancient-roads');
  m.addSource('ancient-roads',{type:'geojson',data});
  m.addLayer({id:'ancient-road-lines',type:'line',source:'ancient-roads',paint:{'line-color':'#a77740','line-width':2.5,'line-dasharray':[3,2],'line-opacity':0.8}});
 },[ready,styleEpoch,filters.roads,filters.time]);

 useEffect(()=>{
  const m=map.current;if(!m||!ready)return;
  const pins=visibleBurials.map(b=>{const el=document.createElement('button');el.type='button';el.className=`atlas-burial-pin atlas-burial-pin--${burialDisplay}`;el.setAttribute('aria-label',`פתיחת ${b.name} — מסורת קבורה`);el.title=b.name;const mark=document.createElement('span');mark.className='atlas-burial-mark';mark.textContent=burialDisplay==='icons'?'⌂':'';mark.setAttribute('aria-hidden','true');el.appendChild(mark);const label=document.createElement('span');label.className='atlas-burial-label';label.textContent=b.name;el.appendChild(label);el.addEventListener('pointerdown',e=>e.stopPropagation());el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();ignoreMapClick.current=true;window.setTimeout(()=>{ignoreMapClick.current=false;},80);setSelected('');setSelectedBurial(b.id);});const marker=new Marker({element:el,anchor:'center'}).setLngLat([b.location.lng,b.location.lat]).addTo(m);return {id:b.id,marker,label};});
  let frame=0;
  const layoutLabels=()=>{
   if(burialDisplay!=='labels')return;
   const boxes:{x:number;y:number;w:number;h:number}[]=[];
   const ordered=[...pins].sort((a,b)=>Number(b.id===selectedBurial)-Number(a.id===selectedBurial));
   for(const {id,marker,label} of ordered){
    label.style.visibility='hidden';
    const point=m.project(marker.getLngLat()),w=label.offsetWidth,h=label.offsetHeight;
    const box={x:point.x-w/2,y:point.y+11,w,h};
    const overlaps=boxes.some(other=>box.x<other.x+other.w+5&&box.x+box.w+5>other.x&&box.y<other.y+other.h+3&&box.y+box.h+3>other.y);
    if(!overlaps||id===selectedBurial){label.style.visibility='visible';boxes.push(box);}
   }
  };
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(layoutLabels);};
  schedule();m.on('moveend',schedule);m.on('zoomend',schedule);m.on('resize',schedule);
  return()=>{cancelAnimationFrame(frame);m.off('moveend',schedule);m.off('zoomend',schedule);m.off('resize',schedule);pins.forEach(({marker})=>marker.remove());};
 },[ready,visibleBurials,burialDisplay,selectedBurial]);

 useEffect(()=>{
  const m=map.current;if(!m||!ready)return;
  markers.current.forEach(p=>p.remove());markers.current=[];
  const forced=new Set<string>();
  if(selected)forced.add(selected);
  if(filters.place)forced.add(filters.place);
  if(person)filtered.forEach(p=>forced.add(p.id));
  placeSearchHits.forEach(p=>forced.add(p.id));

  const points=located.flatMap(p=>p.locations.map(l=>({id:p.id,lng:l.lng!,lat:l.lat!})));

  const ranked=[...filtered].sort((a,b)=>{
   const ca=calculatePlaceCentrality(a.id,filters.time).score;
   const cb=calculatePlaceCentrality(b.id,filters.time).score;
   return cb-ca;
  });

  for(const p of ranked){
   for(const location of p.locations){
    const centrality=calculatePlaceCentrality(p.id,filters.time);
    const force=forced.has(p.id);
    const others=points.filter(pt=>!(pt.id===p.id&&pt.lng===location.lng&&pt.lat===location.lat));
    const here=m.project([location.lng!,location.lat!]);
    let nearest=Infinity;
    for(const o of others){
     const q=m.project([o.lng,o.lat]);
     nearest=Math.min(nearest,Math.hypot(here.x-q.x,here.y-q.y));
    }
    const isolated=others.length===0||nearest>=ISOLATION_PX;
    const pinZoom=effectivePinMinZoom(centrality.tier,isolated);
    if(!force&&zoom<pinZoom)continue;

    const el=document.createElement('button');
    el.type='button';
    el.className='atlas-pin'+(location.disputed?' disputed':'')+(selected===p.id?' selected':'')+` tier-${centrality.tier}`;
    el.dataset.priority=String({major:4,important:3,secondary:2,minor:1}[centrality.tier]);
    el.dataset.force=force?'1':'0';
    el.dataset.showLabel=(force||zoom>=effectiveLabelMinZoom(centrality.tier,isolated))?'1':'0';
    el.setAttribute('aria-label',`פתיחת ${p.name}${location.disputed?' — זיהוי מוצע':''}`);
    const size=person
     ?placeSize(p.id,person,filters.time)
     :pinSizeForTier(centrality.tier,force);
    el.style.setProperty('--pin-size',`${size}px`);
    const dot=document.createElement('span');dot.className='atlas-pin-dot';dot.setAttribute('aria-hidden','true');el.appendChild(dot);
    const label=document.createElement('span');label.className='atlas-pin-label';
    label.textContent=p.name;
    if(el.dataset.showLabel!=='1')label.style.visibility='hidden';
    el.appendChild(label);
    if(filters.events&&placeContent(p.id,filters.time).events.length)el.classList.add('has-event');
    el.addEventListener('pointerdown',e=>{e.stopPropagation();if(e.button===0)selectPlace(p.id);});
    el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();selectPlace(p.id);});
    const preview=()=>{cancelHoverHide();const point=m.project([location.lng!,location.lat!]);setHover({id:p.id,x:point.x,y:point.y,size});};
    el.addEventListener('mouseenter',preview);
    el.addEventListener('focus',preview);
    el.addEventListener('mouseleave',()=>{hoverHideTimer.current=window.setTimeout(()=>setHover(h=>h&&h.id===p.id?null:h),160);});
    el.addEventListener('blur',()=>setHover(h=>h&&h.id===p.id?null:h));
    markers.current.push(new Marker({element:el,anchor:'center'}).setLngLat([location.lng!,location.lat!]).addTo(m));
   }
  }

  if(!filters.modern){
   const water=document.createElement('span');water.className='atlas-sea-label';water.textContent='הים התיכון';
   markers.current.push(new Marker({element:water}).setLngLat([33.85,32.3]).addTo(m));
   const galilee=document.createElement('span');galilee.className='atlas-sea-label';galilee.textContent='ים כנרת';
   markers.current.push(new Marker({element:galilee}).setLngLat([35.58,32.82]).addTo(m));
   const dead=document.createElement('span');dead.className='atlas-sea-label';dead.textContent='ים המלח';
   markers.current.push(new Marker({element:dead}).setLngLat([35.48,31.5]).addTo(m));
  }

  /**
   * Labels are laid out once per settled view, not per animation frame, and each label first tries
   * the side it already used. Without that hysteresis the names swap sides while zooming.
   */
  const declutter=()=>{
   const boxes:{x:number;y:number;w:number;h:number;priority:number}[]=[];
   const items=markers.current
    .map(marker=>{
     const el=marker.getElement();
     const label=el.querySelector<HTMLElement>('.atlas-pin-label');
     if(!label)return null;
     if(el.dataset.showLabel==='0'&&el.dataset.force!=='1'){label.style.visibility='hidden';return null;}
     const priority=Number(el.dataset.priority||1);
     const force=el.dataset.force==='1';
     return {marker,el,label,priority:force?100:priority};
    })
    .filter(Boolean)
    .sort((a,b)=>b!.priority-a!.priority) as {marker:Marker;el:HTMLElement;label:HTMLElement;priority:number}[];

   for(const item of items){
    const {marker,el,label,priority}=item;
    const point=m.project(marker.getLngLat()),size=el.offsetWidth||16,w=Math.max(label.offsetWidth,24),h=Math.max(label.offsetHeight,12);
    const sides:Record<string,[number,number]>={
     below:[0,size/2+4],
     above:[0,-size/2-h-4],
     start:[w/2+size/2+6,-h/2],
     end:[-w/2-size/2-6,-h/2],
    };
    const order=['below','start','end','above'];
    const previous=el.dataset.side;
    const tries=previous&&sides[previous]?[previous,...order.filter(s=>s!==previous)]:order;
    let placed=false;
    for(const side of tries){
     const [dx,dy]=sides[side]!;
     const box={x:point.x+dx-w/2,y:point.y+dy,w,h,priority};
     if(boxes.some(b=>box.x<b.x+b.w+3&&box.x+box.w+3>b.x&&box.y<b.y+b.h+2&&box.y+box.h+2>b.y&&b.priority>=priority))continue;
     label.style.left=`${size/2+dx}px`;label.style.top=`${size/2+dy}px`;label.style.visibility='visible';
     el.dataset.side=side;boxes.push(box);placed=true;break;
    }
    if(!placed)label.style.visibility=priority>=100?'visible':'hidden';
   }
  };
  let frame=0;
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(declutter);};
  schedule();
  m.on('moveend',schedule);m.on('zoomend',schedule);m.on('resize',schedule);
  return()=>{cancelAnimationFrame(frame);m.off('moveend',schedule);m.off('zoomend',schedule);m.off('resize',schedule);};
 },[ready,styleEpoch,filtered,filters.modern,filters.events,filters.time,filters.place,person,selected,placeSearchHits,zoom,located]);

 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){if(selected)setSelected('');else if(filterOpen)setFilterOpen(false);else if(person)back();}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);});

 const sageResults=search.trim()?sages.filter(p=>p.name.includes(search.trim())).slice(0,12):[];
 const hoverPlace=hover?atlas.places.find(p=>p.id===hover.id):undefined;
 const hoverContent=hoverPlace?placeContent(hoverPlace.id,filters.time):null;
 const hoverCentrality=hoverPlace?calculatePlaceCentrality(hoverPlace.id,filters.time):null;
 const activeCount=Number(!!filters.time.period)+Number(!!filters.time.from||!!filters.time.to)+Number(!!filters.place)+Number(filters.events)+Number(filters.institutions)+Number(filters.borders)+Number(filters.burials)+Number(filters.roads);

 return <main className="atlas" dir="rtl">
  <header className="atlas-heading"><div><span className="atlas-eyebrow">אנשים · מקומות · זיכרון</span><h1>מפת תולדות<span>ההיסטוריה מקבלת מקום</span></h1></div><Link href="/knowledge">לעץ מסירת התורה ↗</Link></header>
  <div className="atlas-toolbar">
   <div className="atlas-search">
    <label htmlFor="atlas-sage">חיפוש במפה</label>
    <input id="atlas-sage" placeholder="חכם, מקום או קבר…" autoComplete="off" value={search} onChange={e=>setSearch(e.target.value)}/>
    {search&&<div className="atlas-search-results" aria-label="תוצאות חיפוש">
     {sageResults.map(p=><button key={p.id} onClick={()=>focus(p.id)}><strong>{p.name}</strong><span>{atlas.personPlaces.filter(r=>r.personId===p.id).length||'טרם מופו'} מקומות</span></button>)}
     {placeSearchHits.map(p=><button key={`place-${p.id}`} onClick={()=>openPlace(p.id)}><strong>{p.name}</strong><span>מקום · {calculatePlaceCentrality(p.id,filters.time).tier}</span></button>)}
     {burialSearchHits.map(b=><button key={b.id} onClick={()=>openBurial(b.id)}><strong>{b.name}</strong><span>מסורת קבורה</span></button>)}
     {!sageResults.length&&!placeSearchHits.length&&!burialSearchHits.length&&<p>לא נמצאו חכמים, מקומות או קברים בשם זה.</p>}
    </div>}
   </div>
   <button aria-expanded={filterOpen} aria-controls="atlas-filters" className={filterOpen?'active':''} onClick={()=>setFilterOpen(v=>!v)}>סינון ושכבות {activeCount>0&&<b>{activeCount}</b>} ☷</button>
   <label className="atlas-modern-toggle"><input type="checkbox" checked={filters.modern} onChange={e=>update({modern:e.target.checked})}/>הצג מפה עכשווית</label>
   <button className={filters.burials?'active':''} aria-pressed={filters.burials} onClick={()=>{setSelected('');setSelectedBurial('');setPerson('');update({burials:!filters.burials,places:filters.burials,events:false,institutions:false,place:''});}}>קברי צדיקים</button>
   {filters.burials&&<div className="atlas-burial-display" role="group" aria-label="אופן הצגת קברי צדיקים">
    <button type="button" className={burialDisplay==='icons'?'active':''} aria-pressed={burialDisplay==='icons'} onClick={()=>setBurialDisplay('icons')}>סמלים</button>
    <button type="button" className={burialDisplay==='labels'?'active':''} aria-pressed={burialDisplay==='labels'} onClick={()=>setBurialDisplay('labels')}>נקודה ושם</button>
   </div>}
   <button onClick={()=>fit(filtered)} aria-label="התאמת המפה לכל המקומות המוצגים">התאמה למקומות ⛶</button>
  </div>
  <div className="atlas-stage">
   <div ref={container} className="atlas-canvas" role="region" aria-label="מפת תולדות האינטראקטיבית"/>
   {!ready&&!mapError&&<div className="atlas-loading" role="status">טוען את המפה…</div>}
   {mapError&&<div className="atlas-map-error" role="alert">הדפדפן לא הצליח להפעיל את המפה. אפשר לעיין במקומות ובמקורות ברשימה למטה.</div>}
   <div className="atlas-map-caption"><span className="atlas-eyebrow">אטלס חכמי פרקי אבות</span><p>{filters.time.period?periods.find(p=>p.id===filters.time.period)?.label:'כל תקופות הפיילוט'}<small>{located.length} מקומות על המפה · {links.length} קשרי חכם–מקום</small></p></div>
   {person&&<div className="atlas-focus"><button onClick={back}>← חזרה למפה</button><strong>מציג: {selectedSage?.name}</strong><button aria-label="ביטול התמקדות בחכם" onClick={back}>×</button>{!filtered.length&&<p>{atlas.personPlaces.some(r=>r.personId===person)?'אין מקומות במסגרת הסינון הנוכחית.':'טרם מופו מקומות פעילות לחכם זה. אין בכך קביעה שלא פעל במקומות אחרים.'}</p>}
    {unlocated.length>0&&<p className="atlas-focus-unlocated">מקומות מתועדים שמיקומם לא הוכרע: {unlocated.map(u=><button key={u.id} onClick={()=>openPlace(u.id)}>{u.name}</button>)}</p>}</div>}
   {filterOpen&&<aside className="atlas-filters" id="atlas-filters" aria-label="סינון המפה">
    <header><h2>מבט ממוקד</h2><button onClick={()=>setFilterOpen(false)} aria-label="סגירת הסינון">×</button></header>
    <label>תקופה<select value={filters.time.period} onChange={e=>setPeriod(e.target.value)}><option value="">כל התקופות</option>{periods.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
    <fieldset><legend>שנה / טווח שנים</legend>
     <div className="atlas-years"><label>משנה<input type="number" value={filters.time.from} placeholder="למשל 70" onChange={e=>update({time:{...filters.time,from:e.target.value}})}/></label><label>עד שנה<input type="number" value={filters.time.to} placeholder="למשל 200" onChange={e=>update({time:{...filters.time,to:e.target.value}})}/></label></div>
     <small>הטווח מתמלא אוטומטית לפי תקופה או חכם שנבחרו, וניתן לערוך ידנית. מספר שלילי = לפני הספירה.</small>
     {!validTime(filters.time)&&<p role="alert">יש להזין טווח תקין, ללא שנת אפס.</p>}
    </fieldset>
    <label>חכם<select value={person} onChange={e=>focus(e.target.value)}><option value="">כל חכמי הפיילוט</option>{sages.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <label>מקומות<select value={filters.place} onChange={e=>{const id=e.target.value;if(!id){update({place:''});setSelected('');}else openPlace(id);}}><option value="">כל המקומות</option>{atlas.places.map(p=><option key={p.id} value={p.id}>{p.name}{!p.locations.length?' · ללא סיכה':''}</option>)}</select></label>
    <fieldset><legend>שכבות מידע</legend>
     {([['places','מקומות פעילות'],['events','אירועים'],['institutions','מרכזי תורה / מוסדות'],['borders','שלטונות וגבולות'],['burials','קברי צדיקים — מסורות זיהוי'],['roads','דרכים עתיקות — צירים סכמטיים']] as const).map(([key,label])=>
      <label className="atlas-check" key={key}><input type="checkbox" checked={filters[key]} onChange={e=>update({[key]:e.target.checked})}/>{label}</label>)}
    </fieldset>
    {filters.roads&&<div className="atlas-road-note"><p>קווי הדרכים מחברים תחנות המתועדות במחקר. הם אינם תוואי מדוד או מסלול ניווט.</p><AtlasSources ids={[...new Set(atlas.roads.flatMap(r=>r.sourceIds))]}/></div>}
    <button className="atlas-reset" onClick={()=>{setFilters(defaults);setSelected('');setPerson('');}}>איפוס הסינון</button>
   </aside>}
   {filters.borders&&!filters.modern&&<aside className="atlas-regimes">
    <span className="atlas-eyebrow">שלטונות וגבולות · שכבת הקשר</span>
    <h3>{regimeAt(filters.time)}</h3>
    {activeTerritoryNames.length
     ?<p>מוצג תיחום סכמטי משוער: <b>{activeTerritoryNames.join(' · ')}</b>. קו מקווקו מסמן שחזור משוער — לא גבול מדיני מדויק.</p>
     :<p>{(filters.time.period||filters.time.from||filters.time.to)?'אין תיחום מתועד לתקופה/שנה שנבחרו בפיילוט זה.':'בחרו תקופה או שנה כדי להציג תיחום שלטוני משוער.'}</p>}
    <p className="atlas-muted">גבולות מודרניים אינם מוצגים במצב ההיסטורי. מקורות השחזור מופיעים להלן.</p>
    <AtlasSources ids={atlas.regimeSourceIds}/>
   </aside>}
   {hoverPlace&&!selectedPlace&&<button type="button" className="atlas-hover-card" aria-label={`פתיחת ערך ${hoverPlace.name}`} style={{left:`${hover!.x}px`,top:`${hover!.y-hover!.size/2-8}px`}} onMouseEnter={cancelHoverHide} onMouseLeave={()=>{hoverHideTimer.current=window.setTimeout(()=>setHover(null),160);}} onClick={e=>{e.stopPropagation();selectPlace(hover!.id);}}>
    <strong>{hoverPlace.name}</strong>
    <span className="atlas-hover-meta">{tierLabels[hoverCentrality!.tier]}{hoverContent!.activities.length?` · ${hoverContent!.activities.length} חכמים`:''}{hoverContent!.institutions.length?` · ${hoverContent!.institutions.length} מוסדות`:''}</span>
    <p>{teaser(placeSummary(hoverPlace))}</p>
    <span className="atlas-hover-hint">לחיצה לפתיחת הערך המלא</span>
   </button>}
   {selectedPlace&&<aside className="atlas-detail"><AtlasPlaceCard key={selectedPlace.id+JSON.stringify(filters.time)} place={selectedPlace} time={filters.time} onClose={()=>setSelected('')} onSage={focus}/></aside>}
   {burial&&<aside className="atlas-detail"><AtlasBurialCard burial={burial} onClose={()=>setSelectedBurial('')}/></aside>}
   <div className="atlas-legend"><span><i className="large"/>מרכז ראשי</span><span><i/>חשוב</span><span><i className="small"/>משני / אזכור</span><span><i className="dashed"/>זיהוי שנוי במחלוקת</span></div>
  </div>
  <footer className="atlas-footer">
   {filters.burials&&<details open><summary>קברי צדיקים בתצוגה ({visibleBurials.length}) · מסורות זיהוי</summary><div className="atlas-place-index">{visibleBurials.map(b=><button key={b.id} onClick={()=>openBurial(b.id)}>{b.name}</button>)}{!visibleBurials.length&&<p>לא נמצאו ציונים במסגרת הסינון. אפשר לאפס את התקופה להצגת כל הציונים המתועדים.</p>}</div></details>}
   {filters.roads&&<p>קו חום מקווקו: דרך עתיקה — חיבור סכמטי של תחנות, לא תוואי מדוד.</p>}
   <p><b>{atlas.coverage.peopleWithPlaces}</b> מתוך {sages.length} חכמי הפיילוט עם מקומות מתועדים בשלב זה. <span>המיפוי מתרחב לפי המקורות.</span></p>
   {modernError&&<p role="status">לא ניתן לטעון מפה עכשווית בעברית כעת; המפה ההיסטורית עדיין מוצגת.</p>}
   <details><summary>המקומות בתצוגה · רשימה נגישה ({filtered.length})</summary>
    <div className="atlas-place-index">{filtered.map(p=><button key={p.id} onClick={()=>{openPlace(p.id);container.current?.scrollIntoView({block:'center',behavior:'smooth'});}}>{p.name}{!p.locations.length?' · ללא סיכה':''}</button>)}{!filtered.length&&<p>אין מקומות המתאימים לסינון.</p>}</div>
   </details>
   {unlocated.length>0&&<p className="atlas-muted">ללא מיקום מוכרע: {unlocated.map(p=>p.name).join(' · ')}. המקורות זמינים ברשימה.</p>}
  </footer>
 </main>;
}
