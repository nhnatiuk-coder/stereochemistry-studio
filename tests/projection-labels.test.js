import test from 'node:test';
import assert from 'node:assert/strict';
import {bank} from '../src/chemistry.js';
test('every Fischer and Newman group anchors its bonded atom independently of the rest of the label',()=>{
  let checked=0;
  for(const m of bank)for(const view of m.views){
    if(view.kind==='line')continue;
    const groups=[...view.svg.matchAll(/<g data-attachment-atom="([^"]+)" data-attachment-x="([^"]+)" data-attachment-y="([^"]+)" data-group="([^"]+)">([\s\S]*?)<\/g>/g)];
    assert.equal(groups.length,view.kind==='newman'?6+groups.filter(g=>g[4]==='CH₂').length:2+2*m.centers.length,m.name);
    for(const [,atom,x,y,label,body] of groups){
      const texts=[...body.matchAll(/<text x="([^"]+)" y="([^"]+)"[^>]*>([^<]+)<\/text>/g)];
      assert.equal(texts[0][1],x);assert.equal(texts[0][2],y);assert.equal(texts[0][3],atom);
      if(label.startsWith('CH')){assert.equal(atom,'C');assert.equal(texts[1][3],label.slice(1));assert.ok(view.kind==='newman'?Number(texts[1][1])!==Number(x):Number(texts[1][1])>Number(x));}
      if(label==='OH'){
        assert.equal(atom,'O');assert.equal(texts[1][3],'H');
        if(view.kind==='fischer')assert.ok(Number(x)<200?Number(texts[1][1])<Number(x):Number(texts[1][1])>Number(x));
      }
      checked++;
    }
  }
  assert.ok(checked>500);
});

test('Newman bond rays point exactly at the attached atom center',()=>{
  let rays=0;
  for(const m of bank)for(const view of m.views.filter(v=>v.kind==='newman')){
    const matches=[...view.svg.matchAll(/<path data-newman-ray="true" data-atom-x="([^"]+)" data-atom-y="([^"]+)" d="M([^,]+),([^ ]+) L([^,]+),([^"]+)"/g)];
    assert.equal(matches.length,6);
    for(const match of matches){
      const [ax,ay,sx,sy,ex,ey]=match.slice(1).map(Number);
      const dx=ex-sx,dy=ey-sy;
      assert.ok(Math.abs(dx*(ay-sy)-dy*(ax-sx))<1e-6,'Bond must point at the attached atom');
      const gap=Math.hypot(ax-ex,ay-ey);
      assert.ok(gap>=10&&gap<=20,'Bond should stop just short of the atom glyph');
      assert.ok((ax-ex)*dx+(ay-ey)*dy>0);
      rays++;
    }
  }
  assert.equal(rays,594);
});
