import {chromium} from '@playwright/test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const bank=JSON.parse(readFileSync(new URL('../src/bank.json',import.meta.url)));
const views=bank.flatMap(m=>m.views.filter(v=>v.kind!=='line').map((v,i)=>({name:`${m.name} ${v.kind} ${i}`,svg:v.svg})));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
try{
  const page=await browser.newPage({viewport:{width:1680,height:1000}});
  await page.setContent('<style>body{display:grid;grid-template-columns:repeat(4,400px)}svg{width:400px;height:320px}</style>'+views.map(v=>`<article>${v.svg}</article>`).join(''));
  const failures=await page.evaluate(()=>[...document.querySelectorAll('svg')].flatMap((svg,index)=>{
    const result=[];
    const boxes=[...svg.querySelectorAll('text')].map(t=>({text:t.textContent,box:t.getBBox()}));
    for(const {text,box:b} of boxes)if(b.x<0||b.y<0||b.x+b.width>400||b.y+b.height>320)result.push({index,text,reason:'clipped label'});
    for(const path of svg.querySelectorAll('path')){
      const length=path.getTotalLength();
      for(let d=0;d<=length;d+=1){const p=path.getPointAtLength(d);for(const {text,box:b} of boxes){
        if(p.x>b.x&&p.x<b.x+b.width&&p.y>b.y&&p.y<b.y+b.height){result.push({index,text,reason:'bond passes through label'});d=length+1;break;}
      }}
    }
    return result;
  }));
  assert.deepEqual(failures.map(f=>({...f,view:views[f.index].name})),[]);
  console.log(`PASS: ${views.length} Fischer/Newman views have no clipped labels or bonds passing through text.`);
}finally{await browser.close();}
