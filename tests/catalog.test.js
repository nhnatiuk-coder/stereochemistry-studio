import test from 'node:test';
import assert from 'node:assert/strict';
import {bank,relations,relation} from '../src/chemistry.js';
import {problemCatalog,filterCatalog} from '../src/catalog.js';
const items=problemCatalog();
test('instructor catalog covers every assignment view, drawing prompt, and unordered molecule pair exactly once',()=>{
  assert.equal(new Set(items.map(q=>q.id)).size,items.length);
  for(const m of bank){
    assert.equal(items.filter(q=>q.task==='draw'&&q.a.id===m.id).length,m.centers.length?1:0);
    assert.equal(items.filter(q=>q.task==='assign'&&q.a.id===m.id).length,m.centers.length?m.views.length:0);
  }
  const pairs=items.filter(q=>q.task==='pairs');
  assert.equal(pairs.length,bank.length*(bank.length+1)/2);
  for(const q of pairs)assert.equal(q.answer,relation(q.a,q.b));
  for(const r of relations)assert.ok(pairs.some(q=>q.answer===r));
});
test('instructor filters retain only eligible projections and correctly combine search, relationship, and level',()=>{
  for(const perspective of ['line','newman','fischer']){
    for(const q of filterCatalog(items,{task:'pairs',perspective})){
      assert.ok(q.a.views.some(v=>v.kind===perspective));assert.ok(q.b.views.some(v=>v.kind===perspective));
    }
    assert.ok(filterCatalog(items,{task:'draw',perspective}).length>0);
  }
  const r=filterCatalog(items,{task:'pairs',relationship:'Enantiomers',level:'2'});
  assert.ok(r.length);assert.ok(r.every(q=>q.answer==='Enantiomers'&&Math.max(q.a.level,q.b.level)===2));
  const q=items.find(q=>q.task==='assign');
  assert.equal(filterCatalog(items,{task:'assign',search:q.id}).length,1);
});
