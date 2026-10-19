import test from 'node:test';
import assert from 'node:assert/strict';
import {bank,buildSet} from '../src/chemistry.js';
const names=new Map(bank.map(m=>[m.id,m.smiles]));
test('50-question progressive R/S sets do not repeat a stereoisomer in a different orientation',()=>{
  for(let i=0;i<30;i++){
    const questions=buildSet({mode:'assign',difficulty:'progressive',count:50,perspectives:['line','fischer','newman']});
    assert.equal(new Set(questions.map(q=>names.get(q.a))).size,50);
  }
});
test('fixed difficulty uses all eligible stereoisomers before repetition, regardless of preferred perspective',()=>{
  for(const difficulty of ['1','2','3']){
    const eligible=bank.filter(m=>m.centers.length&&m.level<=Number(difficulty));
    for(let i=0;i<10;i++){
      const questions=buildSet({mode:'assign',difficulty,count:50,perspectives:['line','fischer','newman']});
      const first=questions.slice(0,Math.min(50,eligible.length));
      assert.equal(new Set(first.map(q=>names.get(q.a))).size,first.length);
    }
  }
});
