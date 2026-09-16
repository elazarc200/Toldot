import pilot from '@/components/knowledge/pilot.json';
export const atlas=pilot.geography;
export const sages=pilot.people;
export const periods=pilot.periods;
export type AtlasPlace=typeof atlas.places[number];
export type Activity=typeof atlas.personPlaces[number];
export type TimeFilter={period:string;from:string;to:string};
export type DatedRecord={periodIds:string[];start:number|null;end:number|null};
export const emptyTime:TimeFilter={period:'',from:'',to:''};
/** Estimated year windows for pilot periods (BCE negative). Schematic, for filter sync only. */
export const periodYearRange:Record<string,{from:number;to:number}>={
 shimon:{from:-350,to:-280},
 antigonos:{from:-280,to:-200},
 zug1:{from:-200,to:-160},
 zug2:{from:-160,to:-120},
 zug3:{from:-120,to:-80},
 zug4:{from:-80,to:-40},
 zug5:{from:-40,to:10},
 early:{from:10,to:70},
 yavne:{from:70,to:110},
 akiva:{from:110,to:135},
 usha:{from:135,to:180},
 rebbi:{from:180,to:220},
 transition:{from:220,to:250},
 amora2:{from:250,to:320},
};
export function timeActive(f:TimeFilter){return !!(f.period||f.from||f.to);}
export function validTime(f:TimeFilter){return (!f.from||Number.isInteger(Number(f.from)))&&(!f.to||Number.isInteger(Number(f.to)))&&(!f.from||!f.to||Number(f.from)<=Number(f.to))&&f.from!=='0'&&f.to!=='0';}
export function matchesTime(row:DatedRecord,f:TimeFilter){
 if(!validTime(f))return false;
 if(f.period&&!row.periodIds.includes(f.period))return false;
 // Undated rows still participate when a year window is set (common for pilot sources).
 if(row.start===null||row.end===null)return true;
 return (!f.from||row.end>=Number(f.from))&&(!f.to||row.start<=Number(f.to));
}
/** Year range implied by a selected period (and optional sage activity span). */
export function yearRangeForPeriod(periodId:string):{from:string;to:string}|null{
 const r=periodYearRange[periodId];
 if(!r)return null;
 return {from:String(r.from),to:String(r.to)};
}
export function yearRangeForSage(personId:string):{from:string;to:string}|null{
 const rows=atlas.personPlaces.filter(p=>p.personId===personId&&p.start!=null&&p.end!=null);
 if(rows.length){
  const from=Math.min(...rows.map(r=>r.start!));
  const to=Math.max(...rows.map(r=>r.end!));
  return {from:String(from),to:String(to)};
 }
 const sage=sages.find(p=>p.id===personId);
 const periodId=sage?.chronology?.period_id;
 if(periodId)return yearRangeForPeriod(periodId);
 return null;
}
export const importanceSize={central:30,meaningful:22,minor:15};
export const importanceLabels={central:'מקום מרכזי',meaningful:'פעילות משמעותית',minor:'אזכור או ביקור'};
export function sageActivities(personId:string,time:TimeFilter=emptyTime){return atlas.personPlaces.filter(p=>p.personId===personId&&matchesTime(p,time));}
export function placeContent(placeId:string,time:TimeFilter=emptyTime){return {activities:atlas.personPlaces.filter(p=>p.placeId===placeId&&matchesTime(p,time)),events:atlas.events.filter(p=>p.placeId===placeId&&matchesTime(p,time)),institutions:atlas.institutions.filter(p=>p.placeId===placeId&&matchesTime(p,time))};}
export function placeSize(placeId:string,personId:string,time:TimeFilter){const rows=atlas.personPlaces.filter(p=>p.placeId===placeId&&(!personId||p.personId===personId)&&matchesTime(p,time));return Math.max(15,...rows.map(r=>importanceSize[r.importance as keyof typeof importanceSize]));}
export function pointsForPlaces(places:AtlasPlace[]){return places.flatMap(p=>p.locations.map(l=>[l.lng!,l.lat!] as [number,number]));}
export function regimeAt(time:TimeFilter){
 const year=time.from?Number(time.from):time.to?Number(time.to):null;
 if(year!==null){if(year< -332||year>640)return 'אין עדיין הקשר שלטוני מתועד לשנים אלה בפיילוט';if(time.from&&time.to&&((Number(time.from)< -63&&Number(time.to)>=-63)||(Number(time.from)<324&&Number(time.to)>=324)))return 'טווח השנים חוצה תקופות שלטון';if(year< -63)return 'התקופה ההלניסטית והחשמונאית';if(year<324)return 'התקופה הרומית';return 'התקופה הביזנטית';}
 const order=periods.find(p=>p.id===time.period)?.order;
 return order===undefined?'בחרו תקופה או שנה להצגת הקשר שלטוני':order<4?'התקופה ההלניסטית והחשמונאית':order<6?'סוף התקופה החשמונאית וראשית ההשפעה הרומית':'התקופה הרומית';
}
