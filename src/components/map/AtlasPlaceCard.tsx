import Link from 'next/link';
import {useState} from 'react';
import {type AtlasPlace,type Activity,type TimeFilter,emptyTime,timeActive,placeContent,placeSummary,placeCitationIds,activityBelonging,sages,periods,importanceLabels} from '@/domain/toladot-map';
import {AtlasSources} from './AtlasSources';
import {CitationPreview} from '@/components/citations/CitationPreview';
const relationshipTypeLabels:Record<string,string>={lived:'מגורים',studied:'לימוד',taught:'הוראה',served:'כהונה / הנהגה',visited:'ביקור',event:'אירוע',documented_presence:'נוכחות מתועדת',other:'אחר'};
export function AtlasPlaceCard({place,time,onClose,onSage,fullEntry=false}:{place:AtlasPlace;time:TimeFilter;onClose?:()=>void;onSage?:(id:string)=>void;fullEntry?:boolean}){
 const [full,setFull]=useState(fullEntry);const limited=timeActive(time)&&!full;
 const content=placeContent(place.id,limited?time:emptyTime);
 const periodIds=[...new Set([...content.activities,...content.events,...content.institutions].flatMap(r=>r.periodIds))];
 const community=content.activities.filter(r=>activityBelonging(r)==='community');
 const visitors=content.activities.filter(r=>activityBelonging(r)==='visit');
 const mentionIds=placeCitationIds(place.id,limited?time:emptyTime).slice(0,16);
 function activityDetails(r:Activity){
  const sage=sages.find(s=>s.id===r.personId)!;
  const rel=String((r as {relationshipType?:string}).relationshipType||'');
  return <details className="atlas-activity" key={r.id}><summary><strong>{sage.name}</strong><span>{r.activity}</span></summary>
   <p>{r.note}</p>
   <p className="atlas-muted">{importanceLabels[r.importance as keyof typeof importanceLabels]} · {r.importanceNote}</p>
   {rel?<p className="atlas-muted">סוג קשר: {relationshipTypeLabels[rel]||rel}</p>:null}
   <p className="atlas-muted">{r.timeNote}</p>
   <AtlasSources ids={r.sourceIds} context={r.note}/>
   <div className="atlas-inline-links">{onSage?<button onClick={()=>onSage(sage.id)}>התמקדות בחכם במפה</button>:<Link href={`/map?person=${sage.id}`}>התמקדות במפה</Link>}<Link href={`/knowledge?person=${sage.id}`}>כרטיס החכם בעץ ↗</Link></div>
  </details>;
 }
 return <article className="atlas-card" aria-label={`ערך המקום ${place.name}`}><header><div><span className="atlas-eyebrow">מקום בתולדות</span><h2>{place.name}</h2></div>{onClose&&<button onClick={onClose} aria-label="סגירת כרטיס המקום">×</button>}</header>
 {limited?<div className="atlas-time-notice">ערך זה מוגבל לתקופת הזמן שנבחרה<button onClick={()=>setFull(true)}>הצג את הערך המלא</button></div>:<>
  <p className="atlas-overview">{placeSummary(place)}</p>
  {placeSummary(place)!==place.overview&&<details className="atlas-overview-note"><summary>הערת תיעוד וזיהוי</summary><p>{place.overview}</p></details>}
 </>}
 {full&&timeActive(time)&&!fullEntry&&<button className="atlas-text-button" onClick={()=>setFull(false)}>חזרה לערך המסונן</button>}
 {place.identification!=='identified'&&<p className="atlas-warning">זיהוי המקום שנוי במחלוקת</p>}{place.identificationNote&&<p className="atlas-muted">{place.identificationNote}</p>}
 {periodIds.length>0&&<div className="atlas-tags">{periodIds.map(id=><span key={id}>{periods.find(p=>p.id===id)?.label||id}</span>)}</div>}
 <h3>חכמים שפעלו במקום</h3>
 {content.activities.length?<div className="atlas-sage-groups">
  <details className="atlas-sage-folder" open><summary><strong>בני המקום והקהילה</strong><span>{community.length}</span></summary>
   {community.length?community.map(activityDetails):<p className="atlas-muted">לא תועד חכם שהשתייך לקהילת המקום במסגרת זו.</p>}</details>
  <details className="atlas-sage-folder"><summary><strong>מבקרים ואורחים</strong><span>{visitors.length}</span></summary>
   {visitors.length?visitors.map(activityDetails):<p className="atlas-muted">לא תועדו ביקורים במסגרת זו.</p>}</details>
 </div>:<p className="atlas-muted">לא תועדו חכמים במקום במסגרת הזמן שנבחרה.</p>}
 {content.events.length>0&&<><h3>אירועים מרכזיים</h3>{content.events.map(e=><details key={e.id}><summary>{e.name}</summary><p>{e.text}</p><AtlasSources ids={e.sourceIds} context={e.text}/></details>)}</>}
 {content.institutions.length>0&&<><h3>מרכזי תורה ומוסדות</h3>{content.institutions.map(e=><details key={e.id}><summary>{e.name}</summary><p>{e.text}</p><AtlasSources ids={e.sourceIds} context={e.text}/></details>)}</>}
 {mentionIds.length>0&&<><h3>מקורות על המקום</h3>
  <p className="atlas-muted">מקורות ששייכים לערך המקום עצמו (סקירה, אירועים ומוסדות). מקורות של חכם במקום מופיעים אצלו בתיקייה למעלה.</p>
  <div className="atlas-mentions"><CitationPreview ids={mentionIds} variant="atlas"/></div></>}
 <h3>המקום כיום</h3><p>{place.today}</p>
 {!fullEntry&&<Link className="atlas-entry-link" href={`/map/place/${place.slug}`}>לערך המלא בתולדות ←</Link>}
 </article>;
}
