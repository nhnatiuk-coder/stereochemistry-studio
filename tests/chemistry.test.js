import test from 'node:test';
import assert from 'node:assert/strict';
import initRDKit from '@rdkit/rdkit';
import {bank,relation,relations,buildSet,gradeDrawing,canonicalize} from '../src/chemistry.js';
const rdkit=await initRDKit();
const find=name=>bank.find(m=>m.name===name);
test('all stored molecules canonicalize with the runtime engine',()=>{for(const m of bank)assert.equal(canonicalize(rdkit,m.smiles),m.smiles,m.name)});
test('relationship cases include symmetry, mirror images, and connectivity',()=>{
 const rr=find('(2R,3R)-2,3-dibromobutane'), ss=bank.find(m=>m.smiles===rr.mirror), meso=bank.find(m=>m.baseName==='2,3-dibromobutane'&&m.smiles===m.mirror);
 assert.equal(relation(rr,ss),'Enantiomers');assert.equal(relation(rr,meso),'Diastereomers');assert.equal(relation(meso,meso),'Same compound');
 assert.equal(relation(find('(2R)-butan-2-ol'),find('butan-1-ol')),'Constitutional isomers');
 assert.equal(relation(find('(2R)-butan-2-ol'),find('propane')),'Not isomers');
 assert.equal(relation(find('(E)-but-2-ene'),find('(Z)-but-2-ene')),'E/Z isomers');
});
test('draw checker accepts graph-equivalent orientations and rejects inversion and missing wedges',()=>{
 for(const m of bank.filter(m=>m.centers.length)){
   assert.equal(gradeDrawing(rdkit,m.smiles,m.smiles).correct,true,m.name);
   const mol=rdkit.get_mol(m.smiles); const block=mol.get_molblock();mol.delete();
   assert.equal(gradeDrawing(rdkit,block,m.smiles).correct,true,m.name+' molblock');
   assert.equal(gradeDrawing(rdkit,m.connectivity,m.smiles).correct,false,m.name+' missing stereo');
   if(m.mirror!==m.smiles)assert.equal(gradeDrawing(rdkit,m.mirror,m.smiles).correct,false,m.name+' inverse');
 }
 assert.match(gradeDrawing(rdkit,'CCCO',find('(2R)-butan-2-ol').smiles).message,/skeleton/);
});
test('randomized sets complete with every selected task and no inaccessible views',()=>{
 for(const mode of ['mixed','assign','draw','pairs'])for(const perspectives of [['line'],['fischer'],['newman'],['line','newman','fischer']])for(const difficulty of ['1','2','3','progressive']){
  const qs=buildSet({mode,perspectives,difficulty,count:50});assert.equal(qs.length,50);
  if(mode==='mixed')assert.equal(new Set(qs.map(q=>q.task)).size,3);
  for(const q of qs){const a=bank.find(m=>m.id===q.a);assert.ok(perspectives.includes(a.views[q.va].kind));if(q.b){const b=bank.find(m=>m.id===q.b);assert.equal(q.answer,relation(a,b));assert.ok(perspectives.includes(b.views[q.vb].kind))}}
 }
});
test('pair coverage and random openings',()=>{
 const settings={mode:'pairs',perspectives:['line','newman','fischer'],difficulty:'3',count:50};
 const qs=buildSet(settings);assert.deepEqual(new Set(qs.map(q=>q.answer)),new Set(relations));
 const starts=new Set(Array.from({length:20},()=>buildSet({...settings,mode:'mixed',count:10})[0].a));assert.ok(starts.size>3);
});
test('projection carbon labels agree with stored R/S assignments, including meso compounds',()=>{
 for(const m of bank)for(const view of m.views){
  if(!view.centers)continue;
  assert.deepEqual(view.centers.map(c=>[c.locant,c.value]).sort(),m.centers.map(c=>[c.locant,c.value]).sort(),m.name+' '+view.kind);
 }
});
