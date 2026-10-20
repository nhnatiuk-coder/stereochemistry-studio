import {chromium} from '@playwright/test';
import {createServer} from 'vite';
import {bank} from '../src/chemistry.js';
import assert from 'node:assert/strict';
const server=await createServer({server:{host:'127.0.0.1',port:5192}});await server.listen();
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--js-flags=--wasm-num-compilation-tasks=2 --no-wasm-tier-up']});
try{
  const page=await browser.newPage({viewport:{width:1200,height:900}}),errors=[];
  page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5192/#/student',{waitUntil:'domcontentloaded',timeout:120000});
  const current=()=>page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('stereochemistry-studio-v1'));return s.questions[s.index]});
  async function choose(q,correct){
    if(q.task==='assign')for(const c of bank.find(m=>m.id===q.a).centers){
      const value=correct?c.value:c.value==='R'?'S':'R';
      await page.locator(`input[name="center${c.locant}"]`).locator('..').filter({hasText:value}).getByRole('radio').check();
    }else await page.getByRole('radio',{name:correct?q.answer:q.answer==='Same compound'?'Not isomers':'Same compound',exact:true}).check();
  }
  for(const [task,title] of [['assign','Assign R/S'],['pairs','Compare Compounds']]){
    if(task==='pairs')await page.getByRole('button',{name:'Practice settings',exact:true}).click();
    await page.getByRole('radio',{name:title,exact:false}).check();await page.getByRole('radio',{name:'5',exact:true}).check();await page.getByRole('button',{name:'Start 5 questions'}).click();
    assert.equal(await page.locator('.correct-answer').count(),0);
    let q=await current();await choose(q,true);await page.getByRole('button',{name:'Check answer',exact:true}).click();
    await page.getByRole('heading',{name:'Correct answer',exact:true}).waitFor();
    const answer=q.task==='assign'?bank.find(m=>m.id===q.a).centers.map(c=>`Carbon ${c.locant}: ${c.value}`).join('; '):q.answer;
    assert.equal(await page.locator('.correct-answer').innerText(),answer);
    await page.getByRole('button',{name:'Next question →',exact:true}).click();q=await current();
    for(let attempt=1;attempt<=3;attempt++){
      await choose(q,false);await page.getByRole('button',{name:'Check answer',exact:true}).click();
      await page.waitForFunction(n=>{const s=JSON.parse(localStorage.getItem('stereochemistry-studio-v1'));return s.questions[s.index].attempts.length===n},attempt);
      if(attempt<3)assert.equal(await page.locator('.correct-answer').count(),0);
    }
    await page.getByRole('heading',{name:'Correct answer',exact:true}).waitFor();
    assert.equal(await page.locator('.correct-answer').innerText(),q.task==='assign'?bank.find(m=>m.id===q.a).centers.map(c=>`Carbon ${c.locant}: ${c.value}`).join('; '):q.answer);
  }
  await page.getByRole('button',{name:'Practice settings',exact:true}).click();
  await page.getByRole('radio',{name:'Draw from a Name',exact:false}).check();await page.getByRole('button',{name:'Start 5 questions'}).click();
  const q=await current(),m=bank.find(m=>m.id===q.a);
  assert.equal(await page.locator('.correct-answer').count(),0);
  await page.getByRole('button',{name:'Skip and review',exact:true}).click();
  assert.equal(await page.locator('.correct-answer').innerText(),m.name);
  await page.getByRole('img',{name:'Correct structure for '+m.name,exact:true}).waitFor();
  assert.deepEqual(errors,[]);
  console.log('PASS: correct answers appear after success or three failures, stay hidden during retries, and drawing solutions include the named structure.');
}finally{await browser.close();await server.close();}
