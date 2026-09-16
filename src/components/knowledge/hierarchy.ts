type Person={id:string;name:string;chronology?:{order:number|null;label:string;period_id:string|null}};
type Edge={a:string;b:string;family:string};
export function hierarchy(people:Person[],edges:Edge[]){
 const ids=new Set(people.map(p=>p.id)),links=edges.filter(e=>e.family==='teacher_student'&&ids.has(e.a)&&ids.has(e.b));
 const unplaced=people.filter(p=>p.chronology?.order==null);
 const orders=[...new Set(people.flatMap(p=>p.chronology?.order==null?[]:[p.chronology.order]))].sort((a,b)=>a-b);
 const positions=new Map<string,{x:number;y:number;rank:number|null}>();let y=0;
 const bands:{y:number;label:string;id:string}[]=[];
 function place(rows:Person[],rank:number|null){
  // Teaching depth only affects rows WITHIN an independently sourced period.
  const localIds=new Set(rows.map(p=>p.id)),degree=new Map(rows.map(p=>[p.id,0])),depth=new Map(rows.map(p=>[p.id,0]));
  const localLinks=links.filter(e=>localIds.has(e.a)&&localIds.has(e.b));
  localLinks.forEach(e=>degree.set(e.b,degree.get(e.b)!+1));
  const queue=rows.filter(p=>degree.get(p.id)===0).map(p=>p.id);
  for(let i=0;i<queue.length;i++){const id=queue[i]!;for(const e of localLinks.filter(e=>e.a===id)){depth.set(e.b,Math.max(depth.get(e.b)!,depth.get(id)!+1));degree.set(e.b,degree.get(e.b)!-1);if(degree.get(e.b)===0)queue.push(e.b);}}
  const groups=[...new Set(rows.map(p=>depth.get(p.id)!))].sort((a,b)=>a-b);
  for(const level of groups){const row=rows.filter(p=>depth.get(p.id)===level);
   const center=(id:string)=>{const parents=links.filter(e=>e.b===id).flatMap(e=>positions.has(e.a)?[positions.get(e.a)!.x]:[]);return parents.length?parents.reduce((a,b)=>a+b,0)/parents.length:0;};
   row.sort((a,b)=>center(a.id)-center(b.id)||a.name.localeCompare(b.name,'he'));
   const cols=Math.min(7,row.length);row.forEach((p,i)=>positions.set(p.id,{x:((i%cols)-(cols-1)/2)*190,y:y+Math.floor(i/cols)*145,rank}));y+=Math.ceil(row.length/7)*145;
  }y+=70;
 }
 for(const order of orders){const rows=people.filter(p=>p.chronology?.order===order);bands.push({y:y-80,label:rows[0]!.chronology!.label,id:rows[0]!.chronology!.period_id!});place(rows,order);}
 if(unplaced.length){bands.push({y:y-80,label:'תקופה או זהות טעונות בירור · מחוץ לציר הדורות',id:'unassigned'});place(unplaced,null);}
 return{positions,bands,height:Math.max(300,y),width:Math.min(7,people.length)*190+180,unplaced:unplaced.map(p=>p.id)};
}
