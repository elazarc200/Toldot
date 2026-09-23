import Link from 'next/link';
import {atlas,sages} from '@/domain/toladot-map';
import {AtlasSources} from './AtlasSources';
export function AtlasBurialCard({burial,onClose}:{burial:typeof atlas.burials[number];onClose:()=>void}){
 return <article className="atlas-card" aria-label={burial.name}><header><div><span className="atlas-eyebrow">קברי צדיקים · מסורת זיהוי</span><h2>{burial.name}</h2></div><button onClick={onClose} aria-label="סגירת כרטיס הקבר">×</button></header><p>{burial.area}</p><p>{burial.note}</p><h3>חכמי הפיילוט הקשורים לציון</h3>{burial.personIds.map(id=><p key={id}><Link href={`/knowledge?person=${id}`}>{sages.find(s=>s.id===id)?.name} ↗</Link></p>)}<h3>מקור המסורת והמיקום</h3><AtlasSources ids={burial.sourceIds}/><p className="atlas-muted">הסיכה מסמנת את הציון המפורסם כיום. סינון התקופה מתייחס לדור החכם, לא לתאריך הקמת הציון.</p></article>;
}
