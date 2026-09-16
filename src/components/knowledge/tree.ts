type Edge={a:string;b:string;family:string};
/** Include documented branches attached to the root, including a student's other teachers. */
export function connectedTree(edges:Edge[],root:string){
 const adjacent=new Map<string,string[]>();
 for(const e of edges){if(e.family!=='teacher_student')continue;adjacent.set(e.a,[...(adjacent.get(e.a)||[]),e.b]);adjacent.set(e.b,[...(adjacent.get(e.b)||[]),e.a]);}
 const found=new Set<string>([root]),queue=[root];
 for(let i=0;i<queue.length;i++)for(const id of adjacent.get(queue[i]!)||[])if(!found.has(id)){found.add(id);queue.push(id);}
 return found;
}
