import {afterEach,beforeEach,expect,it} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {atlas,sages,emptyTime,matchesTime,validTime,placeContent,pointsForPlaces,placeSize,placeCitationIds} from '@/domain/toladot-map';
import pilot from '@/components/knowledge/pilot.json';
import {AtlasPlaceCard} from '@/components/map/AtlasPlaceCard';
import {PlacesOfActivity} from '@/components/map/PlacesOfActivity';
import {CitationPreview} from '@/components/citations/CitationPreview';
import {injectPilotCitations,resetPilotCitationCache} from '@/lib/citations/citation-store';
beforeEach(()=>{resetPilotCitationCache();injectPilotCitations(pilot.citations as never[]);});
afterEach(cleanup);
it('uses existing sage IDs and resolvable evidence for every association',()=>{
 expect(sages).toHaveLength(100);
 for(const r of atlas.personPlaces){expect(sages.some(p=>p.id===r.personId)).toBe(true);expect(atlas.places.some(p=>p.id===r.placeId)).toBe(true);
  // A sage-place row may have no displayable source after conservative verification.
  for(const id of r.sourceIds){const c=pilot.citations.find(c=>c.id===id) as {url?:string;text?:string;textKind?:string}|undefined;
   expect(c?.url).toMatch(/^https:\/\//);}}
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
it('does not flatten sage-place citations into generic place mentions',()=>{
 const jerusalem=atlas.places.find(p=>p.slug==='jerusalem')!;
 const mentionIds=placeCitationIds(jerusalem.id);
 const own=new Set([
  ...(jerusalem.sourceIds||[]),
  ...((jerusalem as {overviewSourceIds?:string[]}).overviewSourceIds||[]),
  ...atlas.events.filter(e=>e.placeId===jerusalem.id).flatMap(e=>e.sourceIds||[]),
  ...atlas.institutions.filter(e=>e.placeId===jerusalem.id).flatMap(e=>e.sourceIds||[]),
 ]);
 for(const id of mentionIds) expect(own.has(id)).toBe(true);
 const sageOnly=atlas.personPlaces.filter(r=>r.placeId===jerusalem.id).flatMap(r=>r.sourceIds||[]).filter(id=>!own.has(id));
 for(const id of sageOnly) expect(mentionIds.includes(id)).toBe(false);
});
it('keeps sage-place sources on the sage folder rather than as generic mentions',()=>{
 const socho=atlas.places.find(p=>p.slug==='socho')!;
 render(<AtlasPlaceCard place={socho} time={emptyTime}/>);
 expect(screen.getByText('אנטיגנוס איש סוכו')).toBeInTheDocument();
 expect(screen.queryByText('אזכורים במקורות חז״ל')).not.toBeInTheDocument();
 const mentionIds=placeCitationIds(socho.id);
 if(mentionIds.length) expect(screen.getByText('מקורות על המקום')).toBeInTheDocument();
 else expect(screen.queryByText('מקורות על המקום')).not.toBeInTheDocument();
});
it('deduplicates equivalent source URLs and limits previews to a relevant short excerpt',async()=>{
 // Segment-level citations of one daf are one source for the reader, however many records exist.
 const duplicateIds=pilot.citations.filter(c=>c.url.startsWith('https://www.sefaria.org/Shabbat_33b')).map(c=>c.id);
 expect(duplicateIds.length).toBeGreaterThan(2);
 const {container}=render(<CitationPreview ids={duplicateIds} explanations={Object.fromEntries(duplicateIds.map(id=>[id,'המקור מתאר הליכה אחר חכמים ומרכזי תורה.']))}/>);
 expect(await screen.findByText('עיון במקור ↗')).toBeInTheDocument();
 expect(container.querySelectorAll('details')).toHaveLength(1);
 cleanup();
 const longId='bc275921-9640-52d0-adfa-c55ba8200923';
 const rendered=render(<CitationPreview ids={[longId]} explanations={{[longId]:'המקור מסביר את דברי המשנה בהקשרם.'}}/>);
 await screen.findByText('עיון במקור ↗');
 const excerpt=rendered.container.querySelector('.citation-excerpt');
 expect(excerpt?.textContent?.length).toBeLessThanOrEqual(222);
 expect(screen.getByText('המקור מסביר את דברי המשנה בהקשרם.')).toBeInTheDocument();
 expect(rendered.container.querySelector('.citation-context')?.compareDocumentPosition(excerpt!))
  .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
});
