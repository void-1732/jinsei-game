/** STEP 55: Chrome DevTools Protocol browser smoke checks without third-party packages. */
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtemp, rm, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, extname, resolve, sep} from 'node:path';
import {existsSync} from 'node:fs';
import {createServer as createTcpServer} from 'node:net';

const root=resolve(process.cwd());
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'};
function server(){return createServer(async(req,res)=>{
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
  const local=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!(local===root||local.startsWith(root+sep))){res.writeHead(403).end();return;}
  try{const bytes=await readFile(local);res.writeHead(200,{'Content-Type':types[extname(local)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);}
  catch{res.writeHead(404).end('Not found');}
});}
async function port(){const s=createTcpServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label,timeout=17000){const end=Date.now()+timeout;let err;while(Date.now()<end){try{const value=await fn();if(value)return value;}catch(e){err=e;}await sleep(150);}throw Error(`Timeout: ${label} ${err||''}`);}
function cdpsocket(url){return new Promise((resolveSocket,reject)=>{
 const ws=new WebSocket(url);const pending=new Map();let num=0;const exceptions=[];
 ws.addEventListener('open',()=>resolveSocket({
   exceptions,
   send(method,params={}){return new Promise((res,rej)=>{const id=++num;pending.set(id,{res,rej});ws.send(JSON.stringify({id,method,params}));setTimeout(()=>{if(pending.has(id)){pending.delete(id);rej(Error('CDP timeout '+method));}},15000);});},
   close(){ws.close();}
 }));
 ws.addEventListener('error',reject);
 ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data);if(m.method==='Runtime.exceptionThrown')exceptions.push(m.params?.exceptionDetails?.text||'uncaught error');if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.rej(Error(m.error.message)):p.res(m.result);}});
});}
async function runViewport(binary,width){
 const profile=await mkdtemp(join(tmpdir(),'jinsei-qa-'));
 const debugPort=await port();
 const child=spawn(binary,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check',`--user-data-dir=${profile}`,`--remote-debugging-port=${debugPort}`,'about:blank'],{stdio:'ignore'});
 let client;
 try{
  const pages=await until(async()=>{const response=await fetch(`http://127.0.0.1:${debugPort}/json/list`);return response.ok?response.json():null;},'Chrome CDP connect');
  const page=pages.find(p=>p.type==='page');if(!page)throw Error('Chrome page target missing');
  client=await cdpsocket(page.webSocketDebuggerUrl);
  const send=client.send;
  await send('Page.enable');await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<600});
  const serverPort=process.env.JINSEI_TEST_SERVER_PORT;
  await send('Page.navigate',{url:`http://127.0.0.1:${serverPort}/`});
  async function evaluate(expression){const x=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(x.exceptionDetails)throw Error(x.exceptionDetails.text||'Evaluation error');return x.result?.value;}
  const get=expr=>evaluate(`(()=>(${expr}))()`);
  const click=expr=>evaluate(`(()=>{${expr}.click();return true})()`);
  await until(async()=>get("document.querySelector('#start-game') && document.querySelector('#category-dock button') && document.querySelector('#start-game').disabled===false"),'game initialized',30000);
  const initial=await get("({width:document.documentElement.scrollWidth,viewport:innerWidth,categoryCount:document.querySelectorAll('#category-dock button').length})");
  if(initial.categoryCount!==9||initial.width>initial.viewport+3)throw Error(`Initial layout invalid ${JSON.stringify(initial)}`);
  await evaluate("document.querySelector('#player-name').value='STEP55ブラウザ確認'");
  await click("document.querySelector('#start-game')");
  await until(async()=>get("document.querySelector('#start-game').disabled===true && document.querySelector('#advance-turn').disabled===false"),'new life started');
  await click("document.querySelector('#advance-turn')");
  await until(async()=>get("document.querySelector('#story-dialog').open && document.querySelectorAll('#story-content .story-choices button').length>=3"),'story popup opened');
   const modalAccessible=await get("document.activeElement?.id==='story-title' && !!document.querySelector('#story-action-error[role=alert]')");
   if(!modalAccessible)throw Error('Dialog heading focus / inline error status missing');
  await click("document.querySelector('#story-content .story-choices button')");
  await until(async()=>get("!document.querySelector('#story-dialog').open && document.querySelector('#choice-feedback').textContent.length>15"),'popup completed');
   const summaryVisible=await get("!!document.querySelector('.play-turn-recap') && document.activeElement?.id==='choice-feedback'");
   if(!summaryVisible)throw Error('Current-turn result card or accessible focus missing');
   const clearable=await get("!!document.querySelector('#pending-event-list .hub-clear-notices')");
   if(clearable){
     await click("document.querySelector('#pending-event-list .hub-clear-notices')");
     await until(async()=>get("document.querySelector('#event-count').textContent==='0'"),'notices acknowledged');
   }
  await click("document.querySelector('#category-dock button:nth-child(4)')");
  const expanded=await get("document.querySelector('#category-dock button:nth-child(4)').getAttribute('aria-expanded')==='true'");
  if(!expanded)throw Error('Category failed to expand');
  await click("document.querySelector('#category-dock button:nth-child(4)')");
  const collapsed=await get("document.querySelector('#category-dock button:nth-child(4)').getAttribute('aria-expanded')==='false'");
  if(!collapsed)throw Error('Category failed to collapse');
  await click("document.querySelector('#open-settings')");
  await until(async()=>get("document.querySelector('#settings-dialog').open"),'settings opened');
  if(!(await get("!!document.querySelector('#export-game') && !!document.querySelector('#import-game-file')")))throw Error('Backup controls missing');
  await click("document.querySelector('#close-settings')");
  await until(async()=>get("!document.querySelector('#settings-dialog').open"),'settings closed');

  // STEP 58 release gate: guide, real UI manual save/load and browser restart.
  await click("document.querySelector('#help-button')");
  await until(async()=>get("document.querySelector('#help-dialog').open"),'beginner guide opened');
  await click("document.querySelector('#close-help')");
  await until(async()=>get("!document.querySelector('#help-dialog').open"),'beginner guide closed');
  await click("document.querySelector('#open-settings')");
  await evaluate("document.querySelector('#save-slot').value='手動保存1'");
  await click("document.querySelector('#save-game')");
  const saveConfirmed=await get("document.querySelector('#save-details').textContent.includes('保存しました。')");
  if(!saveConfirmed)throw Error('Manual save UI did not confirm success');
  await click("document.querySelector('#close-settings')");
  const savedTurn=Number(await get("document.querySelector('#turn-count').textContent"));
  await click("document.querySelector('#advance-turn')");
  await until(async()=>get("document.querySelector('#story-dialog').open"),'next event for restore test');
  await click("document.querySelector('#story-content .story-choices button')");
  await until(async()=>get("!document.querySelector('#story-dialog').open"),'second event resolved');
  if(Number(await get("document.querySelector('#turn-count').textContent"))<=savedTurn)throw Error('Time did not advance before loading');
  await click("document.querySelector('#open-settings')");
  await evaluate("document.querySelector('#save-slot').value='手動保存1'");
  await click("document.querySelector('#load-game')");
  await until(async()=>get("!document.querySelector('#settings-dialog').open && Number(document.querySelector('#turn-count').textContent)===${savedTurn}"),'manual load restored original turn');
  await send('Page.reload',{ignoreCache:true});
  await until(async()=>get("document.readyState==='complete' && document.querySelector('#start-game')?.disabled===true && Number(document.querySelector('#turn-count')?.textContent)===${savedTurn}"),'autosave survived browser reload',30000);
  
  const final=await get("({width:document.documentElement.scrollWidth,viewport:innerWidth,turn:document.querySelector('#turn-count').textContent,started:document.querySelector('#start-game').disabled})");
  if(final.width>final.viewport+3||!final.started)throw Error('Layout or game state invalid '+JSON.stringify(final));
  if(client.exceptions.length)throw Error(`Browser errors: ${client.exceptions.join('; ')}`);
  console.log(`PASS browser ${width}px: 9 categories; focused event choice; result recap; notification clear; guide; manual save/load; reload; no overflow`);
 }finally{
  client?.close();child.kill('SIGKILL');await rm(profile,{recursive:true,force:true,maxRetries:2,retryDelay:250});
 }
}
const chrome=process.env.CHROME_PATH||['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(existsSync);
if(!chrome)throw Error('Chrome/Chromium is required for browser QA');
const app=server();await new Promise(r=>app.listen(0,'127.0.0.1',r));process.env.JINSEI_TEST_SERVER_PORT=String(app.address().port);
try{for(const width of [1440,390])await runViewport(chrome,width);}finally{await new Promise(r=>app.close(r));}