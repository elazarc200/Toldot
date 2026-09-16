import {expect,it} from 'vitest';
import {straightLayout} from '@/components/knowledge/straight-layout';
import data from '@/components/knowledge/pilot.json';
it('keeps Nahum close to Akiva without moving him out of his generation',()=>{
 const g=straightLayout(data.people,data.edges);
 const pos=(slug:string)=>g.positions.get(data.people.find(p=>p.slug===slug)!.id)!;
 expect(Math.abs(pos('nahum-gamzu').x-pos('akiva').x)).toBeLessThanOrEqual(300);
 expect(pos('nahum-gamzu').rank).toBe(8);expect(pos('akiva').rank).toBe(9);
});
it('supports Yehuda’s teachers with rabbinic sources and retains real disputes',()=>{
 const id=(slug:string)=>data.people.find(p=>p.slug===slug)!.id;
 for(const teacher of ['akiva','tarfon']){
  const e=data.edges.find(e=>e.family==='teacher_student'&&e.a===id(teacher)&&e.b===id('yehuda-avot4'))!;
  expect(e.state).toBe('known');expect(e.citations.some(c=>data.citations.find(s=>s.id===c)?.text.includes('ברבי אלעאי'))).toBe(true);
 }
 for(const student of ['bar-kappara','yochanan-amora'])expect(data.edges.find(e=>e.family==='teacher_student'&&e.a===id('rebbi')&&e.b===id(student))!.state).toBe('disputed');
 expect(data.citations.find(c=>c.url.includes('Pirkei_Avot_2:8?'))?.label).toBe("פרקי אבות ב', ח'");
});
it('keeps straight edges away from unrelated nodes after population and relationship filtering',()=>{
 for(const scope of ['all','core','one_hop','review'])for(const family of ['all','teacher_student','parent_child','spouse','sibling','bar_plugta']){
  const people=data.people.filter(p=>scope==='all'||(scope==='review'?p.review:p.group===scope)),ids=new Set(people.map(p=>p.id)),edges=data.edges.filter(e=>ids.has(e.a)&&ids.has(e.b)&&(family==='all'||family===e.family));
  const g=straightLayout(people,edges,data.edges);
  for(const e of edges){const a=g.positions.get(e.a)!,b=g.positions.get(e.b)!,dx=b.x-a.x,dy=b.y-a.y;
   for(const p of people.filter(p=>p.id!==e.a&&p.id!==e.b)){const c=g.positions.get(p.id)!,t=Math.max(0,Math.min(1,((c.x-a.x)*dx+(c.y-a.y)*dy)/(dx*dx+dy*dy)));expect(Math.hypot(c.x-a.x-t*dx,c.y-a.y-t*dy),`${scope}/${family}: ${p.slug}`).toBeGreaterThan(38);}
  }
 }
},60000);
it('keeps Hillel and Shammai adjacent and distinguishes provisional placement',()=>{
 const g=straightLayout(data.people,data.edges.filter(e=>e.family==='teacher_student'));
 const id=(slug:string)=>data.people.find(p=>p.slug===slug)!.id;
 const a=g.positions.get(id('hillel'))!,b=g.positions.get(id('shammai'))!;
 expect(a.y).toBe(b.y);expect(Math.abs(a.x-b.x)).toBe(200);
 expect(g.positions.get(id('halafta-dosa'))!.provisional).toBe(true);
 expect(g.positions.get(id('halafta-dosa'))!.rank).toBeNull();
});
it('has a sourced biography for each core record and corrects Yanai without merging the amora',()=>{
 expect(data.people.filter(p=>p.group==='core')).toHaveLength(72);
 for(const p of data.people.filter(p=>p.group==='core')){expect(p.summary?.text.length).toBeGreaterThan(50);expect(p.summary?.citations.length).toBeGreaterThan(0);}
 const yanai=data.people.find(p=>p.slug==='yanai')!;
 expect(yanai.chronology.period_id).toBe('usha');expect(yanai.reading.some(r=>r.label.includes('ינאי (תנא)'))).toBe(true);
 expect(data.people.find(p=>p.slug==='yanai-rebbi')!.id).not.toBe(yanai.id);
});
