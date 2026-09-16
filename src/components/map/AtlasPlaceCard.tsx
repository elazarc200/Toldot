import Link from 'next/link';
import {useState} from 'react';
import {type AtlasPlace,type TimeFilter,emptyTime,timeActive,placeContent,sages,periods,importanceLabels} from '@/domain/toladot-map';
import {AtlasSources} from './AtlasSources';
export function AtlasPlaceCard({place,time,onClose,onSage,fullEntry=false}:{place:AtlasPlace;time:TimeFilter;onClose?:()=>void;onSage?:(id:string)=>void;fullEntry?:boolean}){
 const [full,setFull]=useState(fullEntry);const limited=timeActive(time)&&!full;
 const content=placeContent(place.id,limited?time:emptyTime);
 const refs=[...content.activities.flatMap(r=>r.sourceIds),...content.events.flatMap(r=>r.sourceIds),...content.institutions.flatMap(r=>r.sourceIds)];
 const periodIds=[...new Set([...content.activities,...content.events,...content.institutions].flatMap(r=>r.periodIds))];
 return <article className="atlas-card" aria-label={`ערך המקום ${place.name}`}><header><div><span className="atlas-eyebrow">מקום בתולדות</span><h2>{place.name}</h2></div>{onClose&&<button onClick={onClose} aria-label="סגירת כרטיס המקום">×</button>}</header>
 {limited?<div className="atlas-time-notice">ערך זה מוגבל לתקופת הזמן שנבחרה<button onClick={()=>setFull(true)}>הצג את הערך המלא</button></div>:<p className="atlas-overview">{place.overview}</p>}
 {full&&timeActive(time)&&!fullEntry&&<button className="atlas-text-button" onClick={()=>setFull(false)}>חזרה לערך המסונן</button>}
 {place.identification!=='identified'&&<p className="atlas-warning">זיהוי המקום שנוי במחלוקת</p>}{place.identificationNote&&<p className="atlas-muted">{place.identificationNote}</p>}
 {periodIds.length>0&&<div className="atlas-tags">{periodIds.map(id=><span key={id}>{periods.find(p=>p.id===id)?.label||id}</span>)}</div>}
 <h3>חכמים שפעלו במקום</h3>{content.activities.length?content.activities.map(r=>{const sage=sages.find(s=>s.id===r.personId)!;return <details className="atlas-activity" key={r.id}><summary><strong>{sage.name}</strong><span>{r.activity}</span></summary><p>{r.note}</p><p className="atlas-muted">{importanceLabels[r.importance as keyof typeof importanceLabels]} · {r.importanceNote}</p><p className="atlas-muted">{r.timeNote}</p><AtlasSources ids={r.sourceIds}/><div className="atlas-inline-links">{onSage?<button onClick={()=>onSage(sage.id)}>התמקדות בחכם במפה</button>:<Link href={`/map?person=${sage.id}`}>התמקדות במפה</Link>}<Link href={`/knowledge?person=${sage.id}`}>כרטיס החכם בעץ ↗</Link></div></details>;}):<p className="atlas-muted">לא תועדו חכמים במקום במסגרת הזמן שנבחרה.</p>}
 {content.events.length>0&&<><h3>אירועים מרכזיים</h3>{content.events.map(e=><details key={e.id}><summary>{e.name}</summary><p>{e.text}</p><AtlasSources ids={e.sourceIds}/></details>)}</>}
 {content.institutions.length>0&&<><h3>מרכזי תורה ומוסדות</h3>{content.institutions.map(e=><details key={e.id}><summary>{e.name}</summary><p>{e.text}</p><AtlasSources ids={e.sourceIds}/></details>)}</>}
 <h3>המקום כיום</h3><p>{place.today}</p><AtlasSources ids={place.sourceIds}/>
 {refs.length>0&&<details className="atlas-all-sources"><summary>כל המקורות למסגרת המוצגת</summary><AtlasSources ids={refs}/></details>}
 {!fullEntry&&<Link className="atlas-entry-link" href={`/map/place/${place.slug}`}>לערך המלא בתולדות ←</Link>}
 </article>;
}
