type Person={id:string;name:string;slug?:string;chronology?:{order:number|null;label:string;period_id:string|null}};
type Edge={a:string;b:string;family:string};
type Position={x:number;y:number;rank:number|null;provisional?:boolean};
export function straightLayout(people:Person[],edges:Edge[],contextEdges:Edge[]=edges){
 const ids=new Set(people.map(p=>p.id)),links=edges.filter(e=>ids.has(e.a)&&ids.has(e.b));
 const teaching=links.filter(e=>e.family==='teacher_student');
 const order=new Map(people.map(p=>[p.id,p.chronology?.order??null]));
 const anchors=new Map<string,string>();
 for(const p of people.filter(p=>order.get(p.id)===null)){
  const link=contextEdges.find(e=>ids.has(e.a)&&ids.has(e.b)&&((e.a===p.id&&order.get(e.b)!=null)||(e.b===p.id&&order.get(e.a)!=null)));
  if(link){const anchor=link.a===p.id?link.b:link.a;anchors.set(p.id,anchor);order.set(p.id,order.get(anchor)!);}
 }
 const positions=new Map<string,Position>(),bands:{y:number;label:string;id:string}[]=[],rows:string[][]=[];
 const orders=[...new Set([...order.values()].filter((x):x is number=>x!==null))].sort((a,b)=>a-b);
 let y=0;
 const pairs=[['hillel','shammai'],['shemaya','avtalyon'],['yose-yoezer','yose-yochanan'],['yehoshua-perachya','nittai'],['yehuda-tabbai','shimon-shetach']];
 const partner=new Map<string,string>();for(const pair of pairs){const a=people.find(p=>p.slug===pair[0]),b=people.find(p=>p.slug===pair[1]);if(a&&b){partner.set(a.id,b.id);partner.set(b.id,a.id);}}
 function place(group:Person[]){
  const local=new Set(group.map(p=>p.id)),depth=new Map(group.map(p=>[p.id,0]));
  for(let round=0;round<group.length;round++){let changed=false;for(const e of links.filter(e=>e.family==='teacher_student'||e.family==='parent_child'))if(local.has(e.a)&&local.has(e.b)&&depth.get(e.b)!<=depth.get(e.a)!){depth.set(e.b,Math.min(group.length,depth.get(e.a)!+1));changed=true;}if(!changed)break;}
  for(const level of [...new Set(depth.values())].sort((a,b)=>a-b)){
   const row=group.filter(p=>depth.get(p.id)===level);
   const center=(id:string)=>{const parents=teaching.filter(e=>e.b===id&&positions.has(e.a));return parents.length?parents.reduce((s,e)=>s+positions.get(e.a)!.x,0)/parents.length:10000;};
   row.sort((a,b)=>center(a.id)-center(b.id)||a.name.localeCompare(b.name,'he'));
   for(let i=0;i<row.length;i++){const other=partner.get(row[i]!.id),j=row.findIndex(p=>p.id===other);if(j>i+1){const [p]=row.splice(j,1);row.splice(i+1,0,p!);}}
   const spacing=people.length<25?260:200;
   row.forEach((p,i)=>positions.set(p.id,{x:(i-(row.length-1)/2)*spacing,y,rank:p.chronology?.order??null,provisional:anchors.has(p.id)}));rows.push(row.map(p=>p.id));y+=210;
  }y+=90;
 }
 for(const rank of orders){const group=people.filter(p=>order.get(p.id)===rank),dated=group.find(p=>p.chronology?.order===rank)!;bands.push({y:y-90,label:dated.chronology!.label,id:dated.chronology!.period_id!});place(group);}
 const unplaced=people.filter(p=>order.get(p.id)===null);if(unplaced.length){bands.push({y:y-90,label:'תקופה או זהות טעונות בירור · ללא עוגן מתועד',id:'unassigned'});place(unplaced);}
 const nodeRows=new Map(rows.flatMap(row=>row.map(id=>[id,row] as const)));
 const distanceToLine=(p:Position,a:Position,b:Position)=>{const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);};
 const collisions=()=>links.flatMap(e=>{const a=positions.get(e.a)!,b=positions.get(e.b)!;return people.filter(p=>p.id!==e.a&&p.id!==e.b&&distanceToLine(positions.get(p.id)!,a,b)<58).map(p=>({edge:e,node:p.id}));});
 // Move whole pair blocks or single nodes horizontally; generation coordinates never change.
 for(let iteration=0;iteration<180;iteration++){
  const bad=collisions();if(!bad.length)break;
  const candidates=[...new Set(bad.flatMap(c=>[c.node,c.edge.a,c.edge.b]))];
  let best:{block:string[];delta:number;score:number}|undefined;
  for(const id of candidates){const row=nodeRows.get(id)!,pair=partner.get(id),block=pair&&row.includes(pair)?[id,pair]:[id];
   const before=block.map(k=>positions.get(k)!.x);
   for(const delta of [-1600,-1200,-800,-600,-400,-200,-100,100,200,400,600,800,1200,1600]){
    if(block.some(k=>row.some(other=>!block.includes(other)&&Math.abs(positions.get(k)!.x+delta-positions.get(other)!.x)<180)))continue;
    // Do not insert a singleton between a preserved pair.
    if(block.length===1&&row.some(k=>partner.has(k)&&row.includes(partner.get(k)!)&&positions.get(id)!.x+delta>Math.min(positions.get(k)!.x,positions.get(partner.get(k)!)!.x)&&positions.get(id)!.x+delta<Math.max(positions.get(k)!.x,positions.get(partner.get(k)!)!.x)))continue;
    block.forEach(k=>positions.get(k)!.x+=delta);
    const count=collisions().length;
    const length=links.reduce((s,e)=>s+Math.abs(positions.get(e.a)!.x-positions.get(e.b)!.x),0);
    const width=Math.max(...[...positions.values()].map(p=>p.x))-Math.min(...[...positions.values()].map(p=>p.x));
    const score=count*1e8+width*10+length;
    if(count<bad.length&&(!best||score<best.score))best={block,delta,score};
    block.forEach((k,i)=>positions.get(k)!.x=before[i]!);
   }
  }
  if(!best)break;best.block.forEach(k=>positions.get(k)!.x+=best.delta);
 }
 // Rare same-band family triangles cannot be drawn on one perfectly straight row.
 // Small vertical offsets stay inside the same generation band.
 const originalY=new Map([...positions].map(([id,p])=>[id,p.y]));
 for(let pass=0;pass<80;pass++){
  const bad=collisions();if(!bad.length)break;let moved=false;
  for(const id of [...new Set(bad.flatMap(c=>[c.node,c.edge.a,c.edge.b]))]){
   if(partner.has(id))continue;const p=positions.get(id)!,old={...p};
   for(const dx of [0,-200,200,-400,400,-800,800,-1600,1600]){
    p.x=old.x+dx;
    if(nodeRows.get(id)!.some(other=>other!==id&&Math.abs(positions.get(other)!.x-p.x)<180)){p.x=old.x;continue;}
    const separatesPair=nodeRows.get(id)!.some(k=>partner.has(k)&&nodeRows.get(id)!.includes(partner.get(k)!)&&p.x>Math.min(positions.get(k)!.x,positions.get(partner.get(k)!)!.x)&&p.x<Math.max(positions.get(k)!.x,positions.get(partner.get(k)!)!.x));if(separatesPair){p.x=old.x;continue;}
    for(const dy of [-65,65,-40,40,0]){p.y=originalY.get(id)!+dy;if(collisions().length<bad.length){moved=true;break;}p.y=old.y;}
    if(moved)break;p.x=old.x;
   }
   if(moved)break;
  }if(!moved)break;
 }
 for(let pass=0;pass<40;pass++){
  const bad=collisions();if(!bad.length)break;let moved=false;
  for(const id of [...new Set(bad.flatMap(c=>[c.node,c.edge.a,c.edge.b]))]){
   if(partner.has(id))continue;const a=positions.get(id)!;
   for(const other of nodeRows.get(id)!){if(other===id||partner.has(other))continue;const b=positions.get(other)!;const ax=a.x,ay=a.y;a.x=b.x;a.y=b.y;b.x=ax;b.y=ay;
    if(collisions().length<bad.length){moved=true;break;}b.x=a.x;b.y=a.y;a.x=ax;a.y=ay;
   }if(moved)break;
  }if(!moved)break;
 }
 const penalty=()=>collisions().reduce((sum,c)=>sum+(59-distanceToLine(positions.get(c.node)!,positions.get(c.edge.a)!,positions.get(c.edge.b)!))**2,0);
 for(let pass=0;pass<100;pass++){
  const bad=collisions();if(!bad.length)break;const oldScore=penalty();let best:{id:string;x:number;y:number;score:number}|undefined;
  for(const id of [...new Set(bad.flatMap(c=>[c.node,c.edge.a,c.edge.b]))]){
   if(partner.has(id))continue;const p=positions.get(id)!,old={...p},row=nodeRows.get(id)!;
   for(const dx of [-1600,-800,-400,-200,-100,0,100,200,400,800,1600])for(const dy of [-75,-50,-25,0,25,50,75]){
    p.x=old.x+dx;p.y=originalY.get(id)!+dy;
    if(row.some(k=>k!==id&&Math.abs(positions.get(k)!.x-p.x)<180)||row.some(k=>partner.has(k)&&row.includes(partner.get(k)!)&&p.x>Math.min(positions.get(k)!.x,positions.get(partner.get(k)!)!.x)&&p.x<Math.max(positions.get(k)!.x,positions.get(partner.get(k)!)!.x)))continue;
    const score=penalty();if(score<oldScore-.01&&(!best||score<best.score))best={id,x:p.x,y:p.y,score};
   }p.x=old.x;p.y=old.y;
  }if(!best)break;Object.assign(positions.get(best.id)!,{x:best.x,y:best.y});
 }
 // Compact connected families after obstacle resolution. Include swaps so an
 // occupied column does not strand a teacher at the far end of a generation.
 const horizontalLength=()=>teaching.reduce((sum,e)=>sum+Math.abs(positions.get(e.a)!.x-positions.get(e.b)!.x),0);
 for(let pass=0;pass<12;pass++){
  let improved=false;
  for(const id of people.map(p=>p.id)){
   if(partner.has(id))continue;
   const p=positions.get(id)!,row=nodeRows.get(id)!,oldX=p.x;
   const neighbors=teaching.filter(e=>e.a===id||e.b===id).map(e=>positions.get(e.a===id?e.b:e.a)!.x);
   if(!neighbors.length)continue;
   const baseline=horizontalLength(),before=collisions().length;
   let bestX=oldX,bestOther:string|undefined,bestScore=baseline;
   const candidates=[...new Set(neighbors.flatMap(x=>[x,x-200,x+200]))];
   for(const x of candidates){
    if(row.some(k=>k!==id&&Math.abs(positions.get(k)!.x-x)<180))continue;
    if(row.some(k=>partner.has(k)&&row.includes(partner.get(k)!)&&x>Math.min(positions.get(k)!.x,positions.get(partner.get(k)!)!.x)&&x<Math.max(positions.get(k)!.x,positions.get(partner.get(k)!)!.x)))continue;
    p.x=x;const score=horizontalLength();if(score<bestScore-1&&collisions().length<=before){bestX=x;bestOther=undefined;bestScore=score;}p.x=oldX;
   }
   for(const other of row){
    if(other===id||partner.has(other))continue;const q=positions.get(other)!,qx=q.x;p.x=qx;q.x=oldX;
    const score=horizontalLength();if(score<bestScore-1&&collisions().length<=before){bestX=qx;bestOther=other;bestScore=score;}p.x=oldX;q.x=qx;
   }
   if(bestScore<baseline-1){p.x=bestX;if(bestOther)positions.get(bestOther)!.x=oldX;improved=true;}
  }if(!improved)break;
 }
 const min=Math.min(0,...[...positions.values()].map(p=>p.x)),max=Math.max(0,...[...positions.values()].map(p=>p.x));
 const offset=(min+max)/2;positions.forEach(p=>p.x-=offset);
 return {positions,bands,height:Math.max(300,y),width:Math.max(1200,max-min+240),unplaced:unplaced.map(p=>p.id),anchors,collisionDetails:collisions(),collisions:collisions().length};
}
