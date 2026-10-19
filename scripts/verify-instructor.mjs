import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
let server;
if(process.env.TEST_BUILD){
  const {createServer:serve}=await import('node:http');
  const {readFileSync}=await import('node:fs');
  const {resolve,extname}=await import('node:path');
  const root=resolve('dist');
  server=serve((req,res)=>{try{const path=resolve(root,'.'+(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));if(!path.startsWith(root+'/'))throw Error();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm'})[extname(path)]||'application/octet-stream');res.end(readFileSync(path))}catch{res.statusCode=404;res.end()}});
  await new Promise(r=>server.listen(5191,'127.0.0.1',r));
}else{server=await createServer({server:{host:'127.0.0.1',port:5191}});await server.listen();}
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--js-flags=--wasm-num-compilation-tasks=2 --no-wasm-tier-up']});
try{
  const page=await browser.newPage({viewport:{width:1360,height:1000}}),errors=[];page.setDefaultTimeout(120000);page.setDefaultNavigationTimeout(120000);
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5191/#/student',{waitUntil:'domcontentloaded'});
  await page.getByRole('heading',{name:'Set up your stereochemistry practice.'}).waitFor();
  assert.equal(await page.getByRole('checkbox',{name:/Instructor preview/}).count(),0);
  await page.getByRole('radio',{name:'5',exact:true}).check();await page.getByRole('button',{name:'Start 5 questions'}).click();
  console.log('Student practice opened.');await page.goto('http://127.0.0.1:5191/#/instructor',{waitUntil:'domcontentloaded'});
  await page.getByRole('heading',{name:'Preview the complete problem bank.'}).waitFor();
  assert.equal(await page.locator('article[data-problem-id]').count(),12);console.log('Catalog cards displayed.');
  await page.getByRole('combobox',{name:'Projection',exact:true}).selectOption('newman');
  assert.equal(await page.locator('.catalog-problem .view-label').first().innerText(),'Newman projection');
  await page.getByRole('button',{name:/Draw from a Name \(55\)/}).click();
  assert.equal(await page.locator('article[data-problem-id]').count(),12);
  await page.getByRole('checkbox',{name:'Show answers and explanations'}).uncheck();
  assert.equal(await page.getByRole('heading',{name:'Instructor answer',exact:true}).count(),0);
  await page.getByRole('checkbox',{name:'Show answers and explanations'}).check();
  await page.getByRole('button',{name:/Compare Compounds \(2850\)/}).click();
  await page.getByRole('combobox',{name:'Projection',exact:true}).selectOption('all');
  for(const r of ['Same compound','Not isomers','Constitutional isomers','Diastereomers','Enantiomers','E/Z isomers']){
    await page.getByRole('combobox',{name:'Relationship',exact:true}).selectOption(r);
    assert.ok(await page.locator('.catalog-problem').count()>0);
    assert.equal(await page.locator('.solution b').first().innerText(),r);
  }
  await page.getByRole('combobox',{name:'Relationship',exact:true}).selectOption('Same compound');
  const picker=page.getByRole('combobox',{name:'Compound B',exact:true}).first();
  const options=await picker.locator('option').all();
  if(options.length>1)await picker.selectOption(await options.at(-1).getAttribute('value'));
  await page.getByRole('combobox',{name:'Relationship',exact:true}).selectOption('all');
  await page.getByRole('button',{name:'Next page',exact:true}).first().click();
  assert.match(await page.locator('.catalog-pagination').first().innerText(),/Page 2 of/);
  const id=await page.locator('article[data-problem-id]').first().getAttribute('data-problem-id');
  await page.getByRole('searchbox',{name:'Search problems'}).fill(id);
  assert.equal(await page.locator('article[data-problem-id]').count(),1);
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:'/tmp/stereo-instructor-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'Preview set',exact:true}).click();
  assert.equal(await page.getByRole('checkbox',{name:/Instructor preview/}).isChecked(),true);
  await page.getByRole('radio',{name:'5',exact:true}).check();await page.getByRole('button',{name:'Start 5 questions'}).click();
  await page.getByRole('heading',{name:'Instructor solution'}).waitFor();
  await page.getByRole('link',{name:'Student page →'}).click();
  await page.getByRole('heading',{name:/Question 1/}).waitFor();
  assert.equal(await page.getByRole('heading',{name:'Instructor solution'}).count(),0);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('stereochemistry-studio-v1')).settings.teacher),false);
  assert.deepEqual(errors,[]);
  console.log('PASS: full bank, projection and relationship filters, all answer categories, search, pagination, mobile layout, and separate student/instructor sessions.');
}finally{await browser.close();await server.close();}
