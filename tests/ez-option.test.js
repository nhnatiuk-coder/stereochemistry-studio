import test from 'node:test';
import assert from 'node:assert/strict';
import {bank,buildSet,relations} from '../src/chemistry.js';
const lookup=new Map(bank.map(m=>[m.id,m]));
test('disabling E/Z excludes alkene records in every task, difficulty, and projection combination',()=>{
  for(const mode of ['mixed','assign','draw','pairs'])for(const difficulty of ['1','2','3','progressive'])for(const perspectives of [['line'],['fischer'],['newman'],['line','newman','fischer']]){
    const qs=buildSet({mode,difficulty,perspectives,count:50,includeEZ:false});
    assert.equal(qs.length,50);
    for(const q of qs){assert.ok(!lookup.get(q.a).alkene);if(q.b)assert.ok(!lookup.get(q.b).alkene);assert.notEqual(q.answer,'E/Z isomers');assert.ok(!q.explanation.includes('(E)')&&!q.explanation.includes('(Z)'));}
  }
});
test('enabled and legacy settings retain all relationship categories; disabling retains the other five',()=>{
  for(const includeEZ of [true,undefined,false]){
    const qs=buildSet({mode:'pairs',difficulty:'progressive',perspectives:['line','fischer','newman'],count:50,includeEZ});
    assert.deepEqual(new Set(qs.map(q=>q.answer)),new Set(relations.filter(r=>includeEZ!==false||r!=='E/Z isomers')));
  }
});
