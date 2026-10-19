import bank from './bank.json' with {type:'json'};
export {bank};
export const relations=['Same compound','Not isomers','Constitutional isomers','Diastereomers','Enantiomers','E/Z isomers'];
export const kindNames={line:'Line-angle',fischer:'Fischer projection',newman:'Newman projection'};
export function shuffle(a,rng=Math.random){a=[...a];for(let i=a.length-1;i>0;i--){let j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function relation(a,b){
  if(a.smiles===b.smiles)return 'Same compound';
  if(a.formula!==b.formula)return 'Not isomers';
  if(a.family!==b.family)return 'Constitutional isomers';
  if(a.alkene&&b.alkene&&a.alkene!==b.alkene)return 'E/Z isomers';
  // Isomer enumeration has collapsed symmetry-equivalent configurations. Use
  // the graph's mirror key, not a position-by-position CIP comparison (meso).
  if(a.mirror===b.smiles)return 'Enantiomers';
  return 'Diastereomers';
}
export function explanation(a,b,answer){
  const labels=r=>r.centers.length?r.centers.map(c=>`C${c.locant}: ${c.value}`).join(', '):r.alkene||'no tetrahedral stereocenters';
  const detail=`A is ${a.name} (${labels(a)}). B is ${b.name} (${labels(b)}). `;
  return detail+({'Same compound':'Connectivity and all stereochemical information match. Rotation, a change of projection, and rotation about a single bond do not make a new compound. A meso compound can also be identical to its mirror image.', 'Not isomers':`Their molecular formulas differ: ${a.formula} and ${b.formula}. Isomers must have the same molecular formula.`, 'Constitutional isomers':`Both have formula ${a.formula}, but their atoms are connected differently. Compare connectivity before stereochemistry.`, 'Enantiomers':'These are nonsuperimposable mirror images. Every stereogenic element is inverted, and no molecular symmetry makes the mirror image identical.', 'Diastereomers':'Connectivity is the same, but the configurations differ and the structures are not mirror images. In these examples, some, but not all, tetrahedral centers are inverted.', 'E/Z isomers':'The connectivity is the same and the double-bond configurations differ. E/Z isomers are a specific type of diastereomer; use the more specific E/Z choice in this activity.'}[answer]);
}
const pick=(a)=>a[Math.floor(Math.random()*a.length)];
function views(m,settings){return m.views.filter(v=>settings.perspectives.includes(v.kind));}
export function buildSet(settings){
  const modes=settings.mode==='mixed'?['assign','draw','pairs']:[settings.mode];
  const available=bank.filter(m=>views(m,settings).length);
  let used=new Set(), result=[];
  // Cycling shuffled coverage slots guarantees all enabled tasks, projections,
  // and eligible relationship types without fixing the opening question.
  const eligible=relations.filter(r=>available.some(a=>available.some(b=>relation(a,b)===r)));
  const categories=shuffle(eligible), perspectives=shuffle(settings.perspectives),tasks=shuffle(modes);
  for(let i=0;i<settings.count;i++){
    let task=tasks[i%tasks.length];
    let tier=settings.difficulty==='progressive'?Math.min(3,1+Math.floor(i*3/settings.count)):Number(settings.difficulty);
    let preferred=perspectives[result.filter(q=>q.task!=='draw').length%perspectives.length];
    let candidates=available.filter(m=>m.level<=tier);
    if(!candidates.length)candidates=available.filter(m=>m.level===Math.min(...available.map(m=>m.level)));
    let q;
    if(task==='pairs'){
      const pairIndex=result.filter(q=>q.task==='pairs').length;
      // Advanced pair types need two centers even at the start of a set.
      const target=categories[pairIndex%categories.length];
      let combos=[];
      let pool=candidates;
      if(!pool.some(a=>pool.some(b=>relation(a,b)===target)))pool=available;
      for(const a of pool)for(const b of pool){
        if(relation(a,b)!==target)continue;
        if(a.id>b.id&&target!=='Same compound')continue;
        let va=views(a,settings), vb=views(b,settings);
        if(va.length&&vb.length)combos.push([a,b]);
      }
      if(!combos.length){
        // Restricted projections cannot display alkenes, for example. The
        // coverage cycle only uses relation types available in that selection.
        for(const a of available)for(const b of available)if(views(a,settings).some(v=>v.kind===preferred))combos.push([a,b]);
      }
      let unused=combos.filter(([a,b])=>!used.has(`p${a.id}:${b.id}`));
      const [a,b]=pick(unused.length?unused:combos);used.add(`p${a.id}:${b.id}`);
      const va=pick(views(a,settings).filter(v=>v.kind===preferred))||pick(views(a,settings));
      const alternatives=views(b,settings).filter(v=>a.id!==b.id||v!==va);
      const vb=pick(alternatives.length?alternatives:views(b,settings));const answer=relation(a,b);
      q={task,a:a.id,b:b.id,va:a.views.indexOf(va),vb:b.views.indexOf(vb),answer,explanation:explanation(a,b,answer)};
    }else{
      let pool=candidates.filter(m=>m.centers.length);
      if(task==='assign'){
        let preferredPool=pool.filter(m=>views(m,settings).some(v=>v.kind===preferred));
        if(preferredPool.length)pool=preferredPool;
      }
      let unused=pool.filter(m=>!used.has(task+m.id));const m=pick(unused.length?unused:pool);used.add(task+m.id);
      const view=pick(views(m,settings).filter(v=>v.kind===preferred))||pick(views(m,settings));
      const answer=m.centers.map(c=>`${c.locant}${c.value}`).sort().join(', ');
      q={task,a:m.id,va:m.views.indexOf(view),answer:task==='draw'?m.smiles:answer,explanation:`${m.name}. ${m.centers.map(c=>`C${c.locant} is ${c.value}`).join('; ')}. Rank substituents using CIP rules: atomic number first, then the first point of difference. View the lowest-priority group away: clockwise 1 → 2 → 3 is R; counterclockwise is S. Fischer horizontal bonds point toward you, so reverse a result obtained with priority 4 on a horizontal bond.`};
    }
    result.push({...q,id:`q${i}`,attempts:[],hint:false,done:false,correct:false});
  }
  return result;
}
export function canonicalize(rdkit,input,isomeric=true){
  let m=rdkit.get_mol(input); if(!m)throw Error('The structure could not be read. Check atom valences and bonds.');
  try {return m.get_smiles(JSON.stringify({doIsomericSmiles:isomeric}));}finally{m.delete();}
}
export function gradeDrawing(rdkit,input,target){
  if(/MDLV30\/(STEREL|STERAC)/.test(input))return {correct:false,message:'Use absolute stereochemistry. Relative or racemic stereo groups do not specify the single named stereoisomer.',smiles:canonicalize(rdkit,input)};
  let got=canonicalize(rdkit,input), expected=canonicalize(rdkit,target);
  if(got===expected)return {correct:true,message:'Correct — connectivity and stereochemistry both match.',smiles:got};
  const skeleton=canonicalize(rdkit,input,false), wanted=canonicalize(rdkit,target,false);
  if(skeleton!==wanted)return {correct:false,message:'Check the carbon skeleton, substituent positions, and functional groups first.',smiles:got};
  if(!got.includes('@'))return {correct:false,message:'The connectivity matches. Specify each required stereocenter using wedge and dashed bonds.',smiles:got};
  return {correct:false,message:'The connectivity matches, but at least one stereocenter has the wrong or unspecified configuration. Recheck CIP priorities and wedge/dash directions.',smiles:got};
}
