"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {Map as MapLibre,Marker,NavigationControl,ScaleControl,setWorkerUrl,type StyleSpecification} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {atlas,sages,periods,emptyTime,matchesTime,validTime,placeContent,placeSize,pointsForPlaces,regimeAt,type TimeFilter,type AtlasPlace} from '@/domain/toladot-map';
import {AtlasPlaceCard} from './AtlasPlaceCard';
import {AtlasSources} from './AtlasSources';
import './atlas.css';
import modernCities from './modern-settlements.json';
type Filters={time:TimeFilter;place:string;events:boolean;institutions:boolean;places:boolean;modern:boolean;borders:boolean};
type Camera={center:[number,number];zoom:number};
const defaults:Filters={time:emptyTime,place:'',events:false,institutions:false,places:true,modern:false,borders:false};
const defaultCamera:Camera={center:[34.75,32.1],zoom:7};
const style:StyleSpecification={version:8,sources:{land:{type:'geojson',data:'/maps/land.geojson'},lakes:{type:'geojson',data:'/maps/lakes.geojson'},modern:{type:'raster',tiles:['https://basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors · © CARTO'}},layers:[{id:'water',type:'background',paint:{'background-color':'#dce7e5'}},{id:'land',type:'fill',source:'land',paint:{'fill-color':'#f3f1e8'}},{id:'shore',type:'line',source:'land',paint:{'line-color':'#baccc7','line-width':1.2}},{id:'lakes',type:'fill',source:'lakes',paint:{'fill-color':'#dce7e5'}},{id:'modern',type:'raster',source:'modern',layout:{visibility:'none'},paint:{'raster-opacity':.55,'raster-saturation':-.8}}]};
export default function ToladotMap({initialPerson='',initialPlace='',initialPeriod=''}:{initialPerson?:string;initialPlace?:string;initialPeriod?:string}){
 const [filters,setFilters]=useState<Filters>({...defaults,time:{...emptyTime,period:periods.some(p=>p.id===initialPeriod)?initialPeriod:''}});
 const [person,setPerson]=useState(sages.some(p=>p.id===initialPerson)?initialPerson:'');
 const [selected,setSelected]=useState(atlas.places.find(p=>p.id===initialPlace||p.slug===initialPlace)?.id||'');
 const [search,setSearch]=useState(''),[filterOpen,setFilterOpen]=useState(false),[ready,setReady]=useState(false),[mapError,setMapError]=useState(false),[modernError,setModernError]=useState(false);
 const container=useRef<HTMLDivElement>(null),map=useRef<MapLibre|null>(null),markers=useRef<Marker[]>([]);
 const saved=useRef<{camera:Camera;filters:Filters}|null>(initialPerson?{camera:defaultCamera,filters:defaults}:null);
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
 function focus(id:string){
  if(!id){back();return;}
  if(!person){const m=map.current;saved.current={filters,camera:m?{center:m.getCenter().toArray() as [number,number],zoom:m.getZoom()}:defaultCamera};}
  setPerson(id);setSelected('');setSearch('');setFilters(f=>({...f,place:'',places:true}));setFilterOpen(false);
 }
 function back(){setPerson('');setSelected('');if(saved.current){setFilters(saved.current.filters);map.current?.jumpTo(saved.current.camera);saved.current=null;}}
 function fit(places:AtlasPlace[]){const m=map.current,points=pointsForPlaces(places);if(!m||!points.length)return;
  if(points.length===1){m.jumpTo({center:points[0]!,zoom:9});return;}
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);m.fitBounds([[Math.min(...xs),Math.min(...ys)],[Math.max(...xs),Math.max(...ys)]],{padding:80,maxZoom:9,duration:0});
 }
 useEffect(()=>{
  if(!container.current)return;
  setWorkerUrl('/maps/worker/maplibre-gl-worker.mjs');
  let m:MapLibre;
  try{m=new MapLibre({container:container.current,style,...defaultCamera,attributionControl:{compact:true,customAttribution:'Natural Earth · נחלת הכלל'},minZoom:2,maxZoom:12,locale:{'NavigationControl.ZoomIn':'התקרבות','NavigationControl.ZoomOut':'התרחקות','NavigationControl.ResetBearing':'איפוס כיוון','AttributionControl.ToggleAttribution':'מקורות המפה'}});}catch{setMapError(true);return;}
  map.current=m;m.addControl(new NavigationControl({showCompass:false}),'bottom-left');m.addControl(new ScaleControl({unit:'metric'}),'bottom-left');
  m.on('load',()=>setReady(true));m.on('error',e=>{if(e.error?.message?.includes('carto'))setModernError(true);});
  const resize=new ResizeObserver(()=>m.resize());resize.observe(container.current);
  return()=>{resize.disconnect();markers.current.forEach(p=>p.remove());m.remove();map.current=null;};
 },[]);
 useEffect(()=>{if(ready&&person)fit(filtered);},[ready,person,filtered]);
 useEffect(()=>{if(!ready||!initialPlace||person)return;const place=atlas.places.find(p=>p.id===initialPlace||p.slug===initialPlace);if(place)fit([place]);},[ready,initialPlace,person]);
 useEffect(()=>{if(ready)map.current?.setLayoutProperty('modern','visibility',filters.modern?'visible':'none');},[ready,filters.modern]);
 useEffect(()=>{
  const m=map.current;if(!m||!ready)return;
  markers.current.forEach(p=>p.remove());markers.current=[];
  for(const p of filtered)for(const location of p.locations){
   const el=document.createElement('button');el.type='button';el.className='atlas-pin'+(location.disputed?' disputed':'')+(selected===p.id?' selected':'');
   el.setAttribute('aria-label',`פתיחת ${p.name}${location.disputed?' — זיהוי מוצע':''}`);
   el.style.setProperty('--pin-size',`${person?placeSize(p.id,person,filters.time):22}px`);
   const dot=document.createElement('span');dot.className='atlas-pin-dot';dot.setAttribute('aria-hidden','true');el.appendChild(dot);
   const label=document.createElement('span');label.className='atlas-pin-label';label.textContent=filters.modern&&p.slug==='bnei-brak'?'בני ברק העתיקה':p.name;el.appendChild(label);
   if(filters.events&&placeContent(p.id,filters.time).events.length){el.classList.add('has-event');}
   el.onclick=()=>setSelected(p.id);markers.current.push(new Marker({element:el,anchor:'center'}).setLngLat([location.lng!,location.lat!]).addTo(m));
  }
  if(filters.modern){
   // Only a distinct modern settlement gets a second name; historical cities are not duplicated.
   const el=document.createElement('span');el.className='atlas-modern-label';el.textContent='בני ברק';markers.current.push(new Marker({element:el}).setLngLat([34.835,32.084]).addTo(m));
   for(const city of modernCities){const label=document.createElement('span');label.className='atlas-modern-label';label.textContent=city.name;markers.current.push(new Marker({element:label}).setLngLat(city.coordinates as [number,number]).addTo(m));}
  }
  const water=document.createElement('span');water.className='atlas-sea-label';water.textContent='הים התיכון';markers.current.push(new Marker({element:water}).setLngLat([33.85,32.3]).addTo(m));
  const declutter=()=>{
   const boxes:{x:number;y:number;w:number;h:number}[]=[];
   for(const marker of markers.current){
    const el=marker.getElement(),label=el.querySelector<HTMLElement>('.atlas-pin-label');if(!label)continue;
    const point=m.project(marker.getLngLat()),size=el.offsetWidth,w=label.offsetWidth,h=label.offsetHeight;
    let placed=false;
    for(const [dx,dy] of [[0,size/2+7],[0,-size/2-h-7],[w/2+size/2+8,-h/2],[-w/2-size/2-8,-h/2],[0,size/2+30]]){
     const box={x:point.x+dx!-w/2,y:point.y+dy!,w,h};
     if(boxes.some(b=>box.x<b.x+b.w+5&&box.x+box.w+5>b.x&&box.y<b.y+b.h+4&&box.y+box.h+4>b.y))continue;
     label.style.left=`${size/2+dx!}px`;label.style.top=`${size/2+dy!}px`;label.style.visibility='visible';boxes.push(box);placed=true;break;
    }if(!placed)label.style.visibility='hidden';
   }
  };
  declutter();m.on('move',declutter);m.on('resize',declutter);return()=>{m.off('move',declutter);m.off('resize',declutter);};
 },[ready,filtered,filters.modern,filters.events,filters.time,person,selected]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){if(selected)setSelected('');else if(filterOpen)setFilterOpen(false);else if(person)back();}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);});
 const results=search.trim()?sages.filter(p=>p.name.includes(search.trim())).slice(0,12):[];
 const activeCount=Number(!!filters.time.period)+Number(!!filters.time.from||!!filters.time.to)+Number(!!filters.place)+Number(filters.events)+Number(filters.institutions)+Number(filters.borders);
 return <main className="atlas" dir="rtl"><header className="atlas-heading"><div><span className="atlas-eyebrow">אנשים · מקומות · זיכרון</span><h1>מפת תולדות<span>ההיסטוריה מקבלת מקום</span></h1></div><Link href="/knowledge">לעץ מסירת התורה ↗</Link></header>
 <div className="atlas-toolbar"><div className="atlas-search"><label htmlFor="atlas-sage">חיפוש חכם במפה</label><input id="atlas-sage" placeholder="בעקבות איזה חכם נצא?" autoComplete="off" value={search} onChange={e=>setSearch(e.target.value)}/>{search&&<div className="atlas-search-results" aria-label="תוצאות חיפוש חכמים">{results.map(p=><button key={p.id} onClick={()=>focus(p.id)}><strong>{p.name}</strong><span>{atlas.personPlaces.filter(r=>r.personId===p.id).length||'טרם מופו'} מקומות</span></button>)}{!results.length&&<p>לא נמצאו חכמים בשם זה.</p>}</div>}</div><button aria-expanded={filterOpen} aria-controls="atlas-filters" className={filterOpen?'active':''} onClick={()=>setFilterOpen(v=>!v)}>סינון ושכבות {activeCount>0&&<b>{activeCount}</b>} ☷</button><label className="atlas-modern-toggle"><input type="checkbox" checked={filters.modern} onChange={e=>update({modern:e.target.checked})}/>הצג מפה עכשווית</label><button onClick={()=>fit(filtered)} aria-label="התאמת המפה לכל המקומות המוצגים">התאמה למקומות ⛶</button></div>
 <div className="atlas-stage"><div ref={container} className="atlas-canvas" role="region" aria-label="מפת תולדות האינטראקטיבית"/>
 {!ready&&!mapError&&<div className="atlas-loading" role="status">טוען את המפה…</div>}{mapError&&<div className="atlas-map-error" role="alert">הדפדפן לא הצליח להפעיל את המפה. אפשר לעיין במקומות ובמקורות ברשימה למטה.</div>}
 <div className="atlas-map-caption"><span className="atlas-eyebrow">אטלס חכמי פרקי אבות</span><p>{filters.time.period?periods.find(p=>p.id===filters.time.period)?.label:'כל תקופות הפיילוט'}<small>{located.length} מקומות על המפה · {links.length} קשרי חכם–מקום</small></p></div>
 {person&&<div className="atlas-focus"><button onClick={back}>← חזרה למפה</button><strong>מציג: {selectedSage?.name}</strong><button aria-label="ביטול התמקדות בחכם" onClick={back}>×</button>{!filtered.length&&<p>{atlas.personPlaces.some(r=>r.personId===person)?'אין מקומות במסגרת הסינון הנוכחית.':'טרם מופו מקומות פעילות לחכם זה. אין בכך קביעה שלא פעל במקומות אחרים.'}</p>}</div>}
 {filterOpen&&<aside className="atlas-filters" id="atlas-filters" aria-label="סינון המפה"><header><h2>מבט ממוקד</h2><button onClick={()=>setFilterOpen(false)} aria-label="סגירת הסינון">×</button></header><label>תקופה<select value={filters.time.period} onChange={e=>update({time:{...filters.time,period:e.target.value}})}><option value="">כל התקופות</option>{periods.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></label><fieldset><legend>שנה / טווח שנים</legend><div className="atlas-years"><label>משנה<input type="number" value={filters.time.from} placeholder="למשל 70" onChange={e=>update({time:{...filters.time,from:e.target.value}})}/></label><label>עד שנה<input type="number" value={filters.time.to} placeholder="למשל 200" onChange={e=>update({time:{...filters.time,to:e.target.value}})}/></label></div><small>מספר שלילי מציין לפני הספירה. לשנה יחידה הזינו אותה בשני השדות. הטווחים ההיסטוריים משוערים.</small>{!validTime(filters.time)&&<p role="alert">יש להזין טווח תקין, ללא שנת אפס.</p>}</fieldset><label>חכם<select value={person} onChange={e=>focus(e.target.value)}><option value="">כל חכמי הפיילוט</option>{sages.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>מקומות<select value={filters.place} onChange={e=>update({place:e.target.value})}><option value="">כל המקומות</option>{atlas.places.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><fieldset><legend>שכבות מידע</legend>{([['places','מקומות פעילות'],['events','אירועים'],['institutions','מרכזי תורה / מוסדות'],['borders','שלטונות וגבולות']] as const).map(([key,label])=><label className="atlas-check" key={key}><input type="checkbox" checked={filters[key]} onChange={e=>update({[key]:e.target.checked})}/>{label}</label>)}</fieldset><button className="atlas-reset" onClick={()=>{setFilters(defaults);setSelected('');}}>איפוס הסינון</button></aside>}
 {filters.borders&&<aside className="atlas-regimes"><span className="atlas-eyebrow">שלטונות וגבולות · שכבת הקשר</span><h3>{regimeAt(filters.time)}</h3><p>ההקשר מתייחס לארץ ישראל. גבולות שלטון משתנים לאורך התקופה. בגרסה זו טרם הוזנו תחומי גבול מתועדים, ולכן אין קו גבול מדומה.</p><AtlasSources ids={atlas.regimeSourceIds}/></aside>}
 {selectedPlace&&<aside className="atlas-detail"><AtlasPlaceCard key={selectedPlace.id+JSON.stringify(filters.time)} place={selectedPlace} time={filters.time} onClose={()=>setSelected('')} onSage={focus}/></aside>}
 <div className="atlas-legend"><span><i className="large"/>מקום מרכזי</span><span><i/>פעילות</span><span><i className="small"/>אזכור</span><span><i className="dashed"/>זיהוי שנוי במחלוקת</span></div>
 </div>
 <footer className="atlas-footer"><p><b>{atlas.coverage.peopleWithPlaces}</b> מתוך {sages.length} חכמי הפיילוט עם מקומות מתועדים בשלב זה. <span>המיפוי מתרחב לפי המקורות.</span></p>{modernError&&<p role="status">הרקע העכשווי אינו זמין כעת; המפה ההיסטורית עדיין מוצגת.</p>}<details><summary>המקומות בתצוגה · רשימה נגישה ({filtered.length})</summary><div className="atlas-place-index">{filtered.map(p=><button key={p.id} onClick={()=>{setSelected(p.id);if(p.locations.length)fit([p]);container.current?.scrollIntoView({block:'center',behavior:'smooth'});}}>{p.name}{!p.locations.length?' · ללא סיכה':''}</button>)}{!filtered.length&&<p>אין מקומות המתאימים לסינון.</p>}</div></details>{unlocated.length>0&&<p className="atlas-muted">ללא מיקום מוכרע: {unlocated.map(p=>p.name).join(' · ')}. המקורות זמינים ברשימה.</p>}</footer>
 </main>;
}
