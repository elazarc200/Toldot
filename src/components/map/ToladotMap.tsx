"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {Map as MapLibre,Marker,NavigationControl,ScaleControl,setWorkerUrl,setRTLTextPlugin,type StyleSpecification} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {atlas,sages,periods,emptyTime,matchesTime,validTime,placeContent,placeSize,pointsForPlaces,yearRangeForPeriod,yearRangeForSage,type TimeFilter,type AtlasPlace} from '@/domain/toladot-map';
import {calculatePlaceCentrality,effectiveLabelMinZoom,effectivePinMinZoom,pinSizeForTier} from '@/domain/map-centrality';
import {AtlasPlaceCard} from './AtlasPlaceCard';
import './atlas.css';

type Filters={time:TimeFilter;place:string;events:boolean;institutions:boolean;places:boolean;modern:boolean};
type Camera={center:[number,number];zoom:number};
const defaults:Filters={time:emptyTime,place:'',events:false,institutions:false,places:true,modern:false};
const defaultCamera:Camera={center:[34.75,32.1],zoom:7};
const MODERN_STYLE_URL='https://tiles.openfreemap.org/styles/positron';
const RTL_PLUGIN='https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.3.0/dist/mapbox-gl-rtl-text.js';
const ISOLATION_PX=110;

const historicalStyle:StyleSpecification={
 version:8,
 glyphs:'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
 sources:{
  land:{type:'geojson',data:'/maps/land.geojson'},
  lakes:{type:'geojson',data:'/maps/lakes.geojson'},
  levant:{type:'geojson',data:'/maps/levant-features.geojson'},
 },
 layers:[
  {id:'water',type:'background',paint:{'background-color':'#dce7e5'}},
  {id:'land',type:'fill',source:'land',paint:{'fill-color':'#f3f1e8'}},
  {id:'shore',type:'line',source:'land',paint:{'line-color':'#baccc7','line-width':1.2}},
  {id:'lakes',type:'fill',source:'lakes',paint:{'fill-color':'#dce7e5'}},
  {id:'levant-lakes',type:'fill',source:'levant',filter:['==',['get','kind'],'lake'],paint:{'fill-color':'#c9d9d6','fill-opacity':0.85}},
  {id:'levant-river',type:'line',source:'levant',filter:['==',['get','kind'],'river'],paint:{'line-color':'#9bb5b0','line-width':1.6,'line-opacity':0.9}},
  {id:'levant-labels',type:'symbol',source:'levant',filter:['==',['get','kind'],'region-label'],
   layout:{'text-field':['get','nameHe'],'text-size':12,'text-font':['Open Sans Regular','Arial Unicode MS Regular'],'text-allow-overlap':false},
   paint:{'text-color':'#7a8478','text-halo-color':'#f3f1e8','text-halo-width':1.4}},
 ],
};

const HEBREW_TEXT:unknown=[
 'case',
 ['all',['has','name:he'],['!=',['get','name:he'],'']],['get','name:he'],
 ['all',['has','name:he_IL'],['!=',['get','name:he_IL'],'']],['get','name:he_IL'],
 ['all',['has','name_he'],['!=',['get','name_he'],'']],['get','name_he'],
 '',
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
 const [styleEpoch,setStyleEpoch]=useState(0);
 const container=useRef<HTMLDivElement>(null),map=useRef<MapLibre|null>(null),markers=useRef<Marker[]>([]);
 const saved=useRef<{camera:Camera;filters:Filters}|null>(initialPerson?{camera:defaultCamera,filters:defaults}:null);
 const modernActive=useRef(false);
 const selectedSage=sages.find(p=>p.id===person),selectedPlace=atlas.places.find(p=>p.id===selected);

 const filtered=useMemo(()=>atlas.places.filter(place=>{
  if(filters.place&&place.id!==filters.place)return false;
  const content=placeContent(place.id,filters.time);
  if(person)return content.activities.some(r=>r.personId===person);
  if(filters.place===place.id)return true;
  return (filters.places&&content.activities.length>0)||(filters.events&&content.events.length>0)||(filters.institutions&&content.institutions.length>0);
 }),[filters,person]);

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
  const sage=sages.find(p=>p.id===id);
  const period=sage?.chronology?.period_id||'';
  setPerson(id);setSelected('');setSearch('');
  setFilters(f=>({
   ...f,
   place:'',
   places:true,
   time:{
    period:periods.some(p=>p.id===period)?period:f.time.period,
    from:years?.from||f.time.from,
    to:years?.to||f.time.to,
   },
  }));
  setFilterOpen(false);
 }
 function back(){setPerson('');setSelected('');if(saved.current){setFilters(saved.current.filters);map.current?.jumpTo(saved.current.camera);saved.current=null;}}
 function fit(places:AtlasPlace[]){const m=map.current,points=pointsForPlaces(places);if(!m||!points.length)return;
  if(points.length===1){m.jumpTo({center:points[0]!,zoom:9});return;}
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);m.fitBounds([[Math.min(...xs),Math.min(...ys)],[Math.max(...xs),Math.max(...ys)]],{padding:80,maxZoom:9,duration:0});
 }
 function openPlace(id:string){
  const place=atlas.places.find(p=>p.id===id);
  setSelected(id);setSearch('');
  update({place:id});
  if(place?.locations.length)fit([place]);
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
  m.on('load',()=>{setReady(true);setZoom(m.getZoom());});
  m.on('zoom',()=>setZoom(m.getZoom()));
  m.on('error',e=>{
   const msg=String(e.error?.message||e.error||'');
   if(/openfreemap|tile|style|modern/i.test(msg))setModernError(true);
  });
  const clearPlace=()=>setSelected('');
  const canvas=m.getCanvas();
  canvas.addEventListener('click',clearPlace);
  const onContainerClick=(ev:MouseEvent)=>{
   const t=ev.target;
   if(!(t instanceof Element))return;
   if(t.closest('.atlas-pin,.atlas-detail,.atlas-filters,.atlas-focus,.maplibregl-ctrl,.maplibregl-marker'))return;
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
    el.onclick=()=>setSelected(p.id);
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
    const point=m.project(marker.getLngLat()),size=el.offsetWidth||20,w=Math.max(label.offsetWidth,24),h=Math.max(label.offsetHeight,14);
    let placed=false;
    for(const [dx,dy] of [[0,size/2+7],[0,-size/2-h-7],[w/2+size/2+8,-h/2],[-w/2-size/2-8,-h/2],[0,size/2+30]]){
     const box={x:point.x+dx!-w/2,y:point.y+dy!,w,h,priority};
     if(boxes.some(b=>box.x<b.x+b.w+4&&box.x+box.w+4>b.x&&box.y<b.y+b.h+3&&box.y+box.h+3>b.y&&b.priority>=priority))continue;
     label.style.left=`${size/2+dx!}px`;label.style.top=`${size/2+dy!}px`;label.style.visibility='visible';boxes.push(box);placed=true;break;
    }
    if(!placed)label.style.visibility=priority>=100?'visible':'hidden';
   }
  };
  declutter();m.on('move',declutter);m.on('resize',declutter);
  return()=>{m.off('move',declutter);m.off('resize',declutter);};
 },[ready,styleEpoch,filtered,filters.modern,filters.events,filters.time,filters.place,person,selected,placeSearchHits,zoom,located]);

 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){if(selected)setSelected('');else if(filterOpen)setFilterOpen(false);else if(person)back();}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);});

 const sageResults=search.trim()?sages.filter(p=>p.name.includes(search.trim())).slice(0,12):[];
 const activeCount=Number(!!filters.time.period)+Number(!!filters.time.from||!!filters.time.to)+Number(!!filters.place)+Number(filters.events)+Number(filters.institutions);

 return <main className="atlas" dir="rtl">
  <header className="atlas-heading"><div><span className="atlas-eyebrow">אנשים · מקומות · זיכרון</span><h1>מפת תולדות<span>ההיסטוריה מקבלת מקום</span></h1></div><Link href="/knowledge">לעץ מסירת התורה ↗</Link></header>
  <div className="atlas-toolbar">
   <div className="atlas-search">
    <label htmlFor="atlas-sage">חיפוש במפה</label>
    <input id="atlas-sage" placeholder="חכם או מקום…" autoComplete="off" value={search} onChange={e=>setSearch(e.target.value)}/>
    {search&&<div className="atlas-search-results" aria-label="תוצאות חיפוש">
     {sageResults.map(p=><button key={p.id} onClick={()=>focus(p.id)}><strong>{p.name}</strong><span>{atlas.personPlaces.filter(r=>r.personId===p.id).length||'טרם מופו'} מקומות</span></button>)}
     {placeSearchHits.map(p=><button key={`place-${p.id}`} onClick={()=>openPlace(p.id)}><strong>{p.name}</strong><span>מקום · {calculatePlaceCentrality(p.id,filters.time).tier}</span></button>)}
     {!sageResults.length&&!placeSearchHits.length&&<p>לא נמצאו חכמים או מקומות בשם זה.</p>}
    </div>}
   </div>
   <button aria-expanded={filterOpen} aria-controls="atlas-filters" className={filterOpen?'active':''} onClick={()=>setFilterOpen(v=>!v)}>סינון ושכבות {activeCount>0&&<b>{activeCount}</b>} ☷</button>
   <label className="atlas-modern-toggle"><input type="checkbox" checked={filters.modern} onChange={e=>update({modern:e.target.checked})}/>הצג מפה עכשווית</label>
   <button onClick={()=>fit(filtered)} aria-label="התאמת המפה לכל המקומות המוצגים">התאמה למקומות ⛶</button>
  </div>
  <div className="atlas-stage">
   <div ref={container} className="atlas-canvas" role="region" aria-label="מפת תולדות האינטראקטיבית"/>
   {!ready&&!mapError&&<div className="atlas-loading" role="status">טוען את המפה…</div>}
   {mapError&&<div className="atlas-map-error" role="alert">הדפדפן לא הצליח להפעיל את המפה. אפשר לעיין במקומות ובמקורות ברשימה למטה.</div>}
   <div className="atlas-map-caption"><span className="atlas-eyebrow">אטלס חכמי פרקי אבות</span><p>{filters.time.period?periods.find(p=>p.id===filters.time.period)?.label:'כל תקופות הפיילוט'}<small>{located.length} מקומות על המפה · {links.length} קשרי חכם–מקום</small></p></div>
   {person&&<div className="atlas-focus"><button onClick={back}>← חזרה למפה</button><strong>מציג: {selectedSage?.name}</strong><button aria-label="ביטול התמקדות בחכם" onClick={back}>×</button>{!filtered.length&&<p>{atlas.personPlaces.some(r=>r.personId===person)?'אין מקומות במסגרת הסינון הנוכחית.':'טרם מופו מקומות פעילות לחכם זה. אין בכך קביעה שלא פעל במקומות אחרים.'}</p>}</div>}
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
     {([['places','מקומות פעילות'],['events','אירועים'],['institutions','מרכזי תורה / מוסדות']] as const).map(([key,label])=>
      <label className="atlas-check" key={key}><input type="checkbox" checked={filters[key]} onChange={e=>update({[key]:e.target.checked})}/>{label}</label>)}
    </fieldset>
    <button className="atlas-reset" onClick={()=>{setFilters(defaults);setSelected('');setPerson('');}}>איפוס הסינון</button>
   </aside>}
   {selectedPlace&&<aside className="atlas-detail"><AtlasPlaceCard key={selectedPlace.id+JSON.stringify(filters.time)} place={selectedPlace} time={filters.time} onClose={()=>setSelected('')} onSage={focus}/></aside>}
   <div className="atlas-legend"><span><i className="large"/>מרכז ראשי</span><span><i/>חשוב</span><span><i className="small"/>משני / אזכור</span><span><i className="dashed"/>זיהוי שנוי במחלוקת</span></div>
  </div>
  <footer className="atlas-footer">
   <p><b>{atlas.coverage.peopleWithPlaces}</b> מתוך {sages.length} חכמי הפיילוט עם מקומות מתועדים בשלב זה. <span>המיפוי מתרחב לפי המקורות.</span></p>
   {modernError&&<p role="status">לא ניתן לטעון מפה עכשווית בעברית כעת; המפה ההיסטורית עדיין מוצגת.</p>}
   <details><summary>המקומות בתצוגה · רשימה נגישה ({filtered.length})</summary>
    <div className="atlas-place-index">{filtered.map(p=><button key={p.id} onClick={()=>{openPlace(p.id);container.current?.scrollIntoView({block:'center',behavior:'smooth'});}}>{p.name}{!p.locations.length?' · ללא סיכה':''}</button>)}{!filtered.length&&<p>אין מקומות המתאימים לסינון.</p>}</div>
   </details>
   {unlocated.length>0&&<p className="atlas-muted">ללא מיקום מוכרע: {unlocated.map(p=>p.name).join(' · ')}. המקורות זמינים ברשימה.</p>}
  </footer>
 </main>;
}
