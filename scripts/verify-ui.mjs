import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const bank=JSON.parse(readFileSync(new URL('../src/bank.json',import.meta.url)));
const file=new URL('../Stereochemistry-Studio.html',import.meta.url).href;
let server;
if(process.env.TEST_DEV){const {createServer}=await import('vite');server=await createServer({root:new URL('..',import.meta.url).pathname,server:{host:'127.0.0.1',port:5190}});await server.listen();}
if(process.env.TEST_HOST){const {createServer}=await import('node:http');const {resolve,extname}=await import('node:path');const root=resolve(new URL('../release/website',import.meta.url).pathname);server=createServer((req,res)=>{try{const p=resolve(root,'.'+(req.url==='/'?'/index.html':req.url.split('?')[0]));if(!p.startsWith(root+'/'))throw Error();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm'})[extname(p)]||'application/octet-stream');res.end(readFileSync(p));}catch{res.statusCode=404;res.end()}});await new Promise(r=>server.listen(5190,'127.0.0.1',r));}
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--js-flags=--wasm-num-compilation-tasks=2 --no-wasm-tier-up']});
try{
 globalThis.testPage=await browser.newPage({viewport:{width:1360,height:1000}});const page=globalThis.testPage;const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.stack)});
 const entry=server?'http://127.0.0.1:5190/':file;
 const session=()=>page.evaluate(()=>JSON.parse(localStorage.getItem(location.hash==='#/instructor'?'stereochemistry-studio-v1-instructor':'stereochemistry-studio-v1')));
 async function readyEditor(){await page.locator('[data-testid="open-file-button"]:visible').waitFor({timeout:120000});await page.waitForFunction(()=>{const el=document.querySelector('main');let f=el?.[Object.keys(el||{}).find(k=>k.startsWith('__reactFiber$'))];while(f&&f.type?.name!=='App')f=f.return;for(let h=f?.memoizedState;h;h=h.next)if(typeof h.memoizedState?.current?.setMolecule==='function')return true;return false},{},{timeout:120000});}
 async function importAnswer(smiles){
   await readyEditor();
   // Seed an absolute stereoisomer through Ketcher's own API. The fixture finds
   // the editor ref in the pinned React 18 build; assertions test user behavior.
   await page.evaluate(async text=>{const el=document.querySelector('main');let f=el[Object.keys(el).find(k=>k.startsWith('__reactFiber$'))];while(f&&f.type?.name!=='App')f=f.return;for(let h=f?.memoizedState;h;h=h.next){const k=h.memoizedState?.current;if(typeof k?.setMolecule==='function'){await k.setMolecule(text);return}}throw Error('Ketcher editor unavailable');},smiles);
 }
 async function correctCurrent(){
   const s=await session(),q=s.questions[s.index],m=bank.find(m=>m.id===q.a);
   if(q.task==='draw')await importAnswer(q.answer);
   else if(q.task==='pairs')await page.getByRole('radio',{name:q.answer,exact:true}).check();
   else for(const c of m.centers)await page.locator(`input[name="center${c.locant}"]`).locator('..').filter({hasText:c.value}).getByRole('radio').check();
   await page.getByRole('button',{name:'Check answer',exact:true}).click();
   await page.getByRole('button',{name:/Next question|Finish and view report/}).waitFor({timeout:60000});
   const updated=await session();assert.equal(updated.questions[updated.index].correct,true,`Correct answer rejected: ${m.name}`);
   await page.getByRole('button',{name:/Next question|Finish and view report/}).click();
 }
 await page.goto(entry,{waitUntil:'domcontentloaded',timeout:120000});
 await page.getByRole('heading',{name:'Set up your stereochemistry practice.'}).waitFor({timeout:60000});console.log('Setup opened.');
 await page.getByRole('radio',{name:'Draw from a Name',exact:false}).check();await page.getByRole('radio',{name:'5',exact:true}).check();await page.getByRole('button',{name:'Start 5 questions'}).click();
 let state=await session();await importAnswer(state.questions[0].answer);
 await page.waitForFunction(()=>{let s=JSON.parse(localStorage.getItem(location.hash==='#/instructor'?'stereochemistry-studio-v1-instructor':'stereochemistry-studio-v1'));return s.questions[0].draft?.includes('V3000')},{},{timeout:30000});
 await page.reload({waitUntil:'domcontentloaded',timeout:120000});await readyEditor();await page.waitForTimeout(1500);await page.getByRole('button',{name:'Check answer',exact:true}).click();await page.getByRole('button',{name:'Next question →'}).waitFor({timeout:60000});
 state=await session();assert.equal(state.questions[0].correct,true,'Restored Ketcher drawing must grade correctly');await page.getByRole('button',{name:'Next question →'}).click();
 for(let i=1;i<5;i++)await correctCurrent();
 await page.getByRole('heading',{name:'Your stereochemistry report.'}).waitFor();assert.equal((await session()).questions.filter(q=>q.correct).length,5);console.log('PASS: offline Ketcher, V3000 stereo grading, draft restore, drawing set, and report.');
 await page.goto(entry+'#/instructor');await page.getByRole('button',{name:'Preview set',exact:true}).click();await page.getByRole('radio',{name:'5',exact:true}).check();await page.getByRole('radio',{name:'Assign R/S',exact:false}).check();await page.getByRole('radio',{name:'Intro',exact:false}).check();await page.getByRole('checkbox',{name:'Instructor preview',exact:false}).check();await page.getByRole('button',{name:'Start 5 questions'}).click();
 state=await session();const molecule=bank.find(m=>m.id===state.questions[0].a);await page.getByRole('button',{name:'Show hint',exact:true}).click();
 for(let attempt=0;attempt<3;attempt++){
   for(const c of molecule.centers)await page.locator(`input[name="center${c.locant}"]`).locator('..').filter({hasText:c.value==='R'?'S':'R'}).getByRole('radio').check();
   await page.getByRole('button',{name:'Check answer',exact:true}).click();await page.waitForFunction(n=>JSON.parse(localStorage.getItem(location.hash==='#/instructor'?'stereochemistry-studio-v1-instructor':'stereochemistry-studio-v1')).questions[0].attempts.length===n,attempt+1);
 }
 await page.getByRole('button',{name:'Next question →'}).click();for(let i=1;i<5;i++)await correctCurrent();
 state=await session();assert.equal(state.complete,true);assert.equal(state.questions.filter(q=>q.correct).length,4);assert.equal(state.questions[0].attempts.length,3);assert.equal(state.questions[0].hint,true);assert.equal(state.settings.teacher,true);console.log('PASS: three attempts, hints, R/S grading, and instructor report.');
 await page.getByRole('button',{name:'Start another set'}).click();await page.getByRole('radio',{name:'Compare Compounds',exact:false}).check();await page.getByRole('radio',{name:'Advanced',exact:false}).check();await page.getByRole('radio',{name:'10',exact:true}).check();await page.getByRole('checkbox',{name:'Instructor preview',exact:false}).uncheck();await page.getByRole('button',{name:'Start 10 questions'}).click();
 state=await session();assert.equal(new Set(state.questions.map(q=>q.answer)).size,6);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/stereo-mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false,'Mobile page must not overflow horizontally');await page.setViewportSize({width:1360,height:1000});
 for(let i=0;i<10;i++)await correctCurrent();state=await session();assert.equal(state.questions.filter(q=>q.correct).length,10);
 await page.screenshot({path:'/tmp/stereo-report.png',fullPage:true});
 const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Export results (JSON)'}).click();const download=await downloading;const data=JSON.parse(readFileSync(await download.path(),'utf8'));assert.equal(data.questions.length,10);assert.equal(data.complete,true);
 assert.equal((await session()).complete,true);
 assert.deepEqual(errors,[]);console.log('PASS: all six pair relationships, mobile layout, JSON export, persistent results, and zero browser errors.');
}catch(e){console.log('FAILURE STATE',await globalThis.testPage?.evaluate(()=>({text:document.body.innerText,session:JSON.parse(localStorage.getItem(location.hash==='#/instructor'?'stereochemistry-studio-v1-instructor':'stereochemistry-studio-v1'))})).catch(()=>null));throw e;}finally{await browser.close();await server?.close();}
