import {afterEach,expect,it} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {atlas,sages,emptyTime,matchesTime,validTime,placeContent,pointsForPlaces,placeSize} from '@/domain/toladot-map';
import pilot from '@/components/knowledge/pilot.json';
import {AtlasPlaceCard} from '@/components/map/AtlasPlaceCard';
import {PlacesOfActivity} from '@/components/map/PlacesOfActivity';
afterEach(cleanup);
it('uses existing sage IDs and resolvable evidence for every association',()=>{
 expect(sages).toHaveLength(100);
 for(const r of atlas.personPlaces){expect(sages.some(p=>p.id===r.personId)).toBe(true);expect(atlas.places.some(p=>p.id===r.placeId)).toBe(true);expect(r.sourceIds.length).toBeGreaterThan(0);for(const id of r.sourceIds){const c=pilot.citations.find(c=>c.id===id);expect(c?.url).toMatch(/^https:\/\//);expect(c?.text.length).toBeGreaterThan(10);}}
});
it('filters individual activities, events and institutions by period and overlapping years',()=>{
 const yavne=atlas.places.find(p=>p.slug==='yavne')!;
 const late=placeContent(yavne.id,{...emptyTime,period:'amora2'});
 expect(late.activities).toHaveLength(0);expect(late.events).toHaveLength(0);expect(late.institutions).toHaveLength(0);
 const r=atlas.personPlaces.find(r=>r.personId===sages.find(s=>s.slug==='akiva')!.id)!;
 expect(matchesTime(r,{...emptyTime,from:'100',to:'100'})).toBe(true);
 expect(matchesTime(r,{...emptyTime,from:'250',to:'300'})).toBe(false);
 expect(validTime({...emptyTime,from:'200',to:'100'})).toBe(false);expect(validTime({...emptyTime,from:'0'})).toBe(false);
});
it('expands a time-limited place card locally without changing its time filter',()=>{
 const time={...emptyTime,period:'amora2'},yavne=atlas.places.find(p=>p.slug==='yavne')!;
 render(<AtlasPlaceCard place={yavne} time={time}/>);
 expect(screen.getByText('ערך זה מוגבל לתקופת הזמן שנבחרה')).toBeInTheDocument();expect(screen.queryByText('רבן יוחנן בן זכאי')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'הצג את הערך המלא'}));expect(screen.getByText('רבן יוחנן בן זכאי')).toBeInTheDocument();expect(time.period).toBe('amora2');
 fireEvent.click(screen.getByRole('button',{name:'חזרה לערך המסונן'}));expect(screen.queryByText('רבן יוחנן בן זכאי')).not.toBeInTheDocument();
});
it('fits all known locations, including Rome, and gives editorial importance precedence',()=>{
 const akiva=sages.find(s=>s.slug==='akiva')!,rows=atlas.personPlaces.filter(r=>r.personId===akiva.id),places=atlas.places.filter(p=>rows.some(r=>r.placeId===p.id)),points=pointsForPlaces(places);
 expect(points.some(p=>p[0]<13)).toBe(true);expect(points.some(p=>p[0]>34)).toBe(true);
 const bnei=places.find(p=>p.slug==='bnei-brak')!,rome=places.find(p=>p.slug==='rome')!;
 expect(placeSize(bnei.id,akiva.id,emptyTime)).toBeGreaterThan(placeSize(rome.id,akiva.id,emptyTime));
});
it('keeps unresolved locations unplotted and supports every candidate when supplied',()=>{
 const p=atlas.places.find(p=>p.slug==='pekiin')!;expect(p.locations).toHaveLength(0);expect(p.identificationNote).toContain('שנוי במחלוקת');
 // Geometry behavior only: synthetic candidates never enter historical data.
 expect(pointsForPlaces([{...p,locations:[{id:'test-a',lng:34,lat:32,label:'בדיקה',disputed:true},{id:'test-b',lng:35,lat:33,label:'בדיקה',disputed:true}]}])).toHaveLength(2);
});
it('renders shared activity data in sage cards and exposes an empty state for unmapped sages',()=>{
 const akiva=sages.find(p=>p.slug==='akiva')!;render(<PlacesOfActivity personId={akiva.id}/>);expect(screen.getByRole('link',{name:'הצג במפת תולדות ↗'})).toHaveAttribute('href',`/map?person=${akiva.id}`);expect(screen.getByText('בני ברק · הוראה')).toBeInTheDocument();cleanup();
 const missing=sages.find(p=>!atlas.personPlaces.some(r=>r.personId===p.id))!;render(<PlacesOfActivity personId={missing.id}/>);expect(screen.getByText(/טרם מופו מקומות פעילות/)).toBeInTheDocument();
});
