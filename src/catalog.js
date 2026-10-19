import {bank,relation,explanation} from './chemistry.js';

// Deterministic catalog of the entire generator pool, rather than a random set.
export function problemCatalog(){
  const items=[];
  for(const m of bank){
    if(!m.centers.length)continue;
    for(const [va,view] of m.views.entries())items.push({id:`RS-${m.id}-${va+1}`,task:'assign',a:m,va,kind:view.kind,answer:m.centers.map(c=>`C${c.locant}: ${c.value}`).join('; ')});
    items.push({id:`DRAW-${m.id}`,task:'draw',a:m,answer:m.name});
  }
  for(let i=0;i<bank.length;i++)for(let j=i;j<bank.length;j++){
    const a=bank[i],b=bank[j],answer=relation(a,b);
    items.push({id:`PAIR-${a.id}-${b.id}`,task:'pairs',a,b,answer,explanation:explanation(a,b,answer)});
  }
  return items;
}

export function filterCatalog(items,{task='assign',level='all',perspective='all',relationship='all',search=''}={}){
  const query=search.trim().toLowerCase();
  return items.filter(q=>q.task===task&&(level==='all'||Math.max(q.a.level,q.b?.level||0)===Number(level))&&
    (relationship==='all'||task!=='pairs'||q.answer===relationship)&&
    (perspective==='all'||task==='draw'||(task==='assign'?q.kind===perspective:q.a.views.some(v=>v.kind===perspective)&&q.b.views.some(v=>v.kind===perspective)))&&
    (!query||[q.id,q.a.name,q.b?.name,q.a.formula,q.answer].filter(Boolean).join(' ').toLowerCase().includes(query)));
}
