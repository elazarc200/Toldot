import Link from 'next/link';
import {atlas,sageActivities} from '@/domain/toladot-map';
import {AtlasSources} from './AtlasSources';
export function PlacesOfActivity({personId}:{personId:string}){
 const rows=sageActivities(personId);
 return <section className="sage-places"><h3>מקומות פעילות</h3>{rows.length?<><p className="kg-muted">{rows.length} מקומות מתועדים · <Link href={`/map?person=${personId}`}>הצג במפת תולדות ↗</Link></p>{rows.map(r=><details key={r.id}><summary>{atlas.places.find(p=>p.id===r.placeId)?.name} · {r.activity}</summary><p>{r.note}</p><AtlasSources ids={r.sourceIds}/></details>)}</>:<p className="kg-muted">טרם מופו מקומות פעילות במקורות שנבדקו. <Link href={`/map?person=${personId}`}>פתיחה במפה ↗</Link></p>}</section>;
}
