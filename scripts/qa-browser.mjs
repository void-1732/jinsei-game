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
  // Visual regression: a focused topic renders one relevant panel, open by default.
  await click("document.querySelector('#category-dock button:nth-child(2)')");
  await until(async()=>get("document.querySelector('#page-title')?.textContent==='住まい・車'"),'housing category opened');
  const housing=await get("({open:document.querySelector('.topic-detail')?.open,panels:document.querySelectorAll('.topic-legacy-detail .phase27-panel').length,finance:document.querySelectorAll('.topic-legacy-detail .phase5-panel').length,duplicateOverview:document.querySelectorAll('.topic-legacy-detail .quick-overview').length,diagnostics:document.querySelectorAll('.topic-legacy-detail .advanced-details').length,scroll:document.documentElement.scrollWidth,viewport:innerWidth})");
  if(!housing.open||housing.panels!==1||housing.finance!==1||housing.duplicateOverview!==0||housing.diagnostics!==0||housing.scroll>housing.viewport+3)throw Error('Housing focus has duplicate or hidden panels '+JSON.stringify(housing));
  const compact=await get("(()=>{const root=document.querySelector('.topic-compact'),lead=root?.querySelector('.topic-leading'),stats=root?.querySelector('.topic-stat-grid'),intro=lead?.querySelector('.topic-intro'),action=lead?.querySelector('.topic-action');return {rootWidth:root?.getBoundingClientRect().width,mainWidth:document.querySelector('.main-content')?.getBoundingClientRect().width,columns:getComputedStyle(lead).gridTemplateColumns.split(' ').length,statCards:stats?.children.length??0,hasIntro:!!intro,hasAction:!!action,overflow:document.documentElement.scrollWidth>innerWidth+3}})()");
  if(compact.overflow||!compact.hasIntro||compact.statCards<2||compact.rootWidth<compact.mainWidth*.72)throw Error('Compact responsive layout missing '+JSON.stringify(compact));
  if(width>=1000&&compact.columns<2)throw Error('Desktop header did not use horizontal space '+JSON.stringify(compact));
  if(width<=600&&compact.columns!==1)throw Error('Mobile header did not stack '+JSON.stringify(compact));
  await click("document.querySelector('.topic-detail > summary')");
  if(!(await get("document.querySelector('.topic-detail')?.open===false && document.querySelector('.topic-overview')?.hidden===false")))throw Error('Housing details failed to collapse into overview');
  await click("document.querySelector('.topic-detail > summary')");
  if(!(await get("document.querySelector('.topic-detail')?.open===true && document.querySelector('.topic-overview')?.hidden===true")))throw Error('Housing details failed to expand');
  await click("document.querySelector('#topic-strip .topic-tab:nth-child(2)')");
  await until(async()=>get("document.querySelector('#page-title')?.textContent==='家計・資産'"),'finance topic opened');
  const money=await get("({open:document.querySelector('.topic-detail')?.open,housing:document.querySelectorAll('.topic-legacy-detail .phase27-panel').length,finance:document.querySelectorAll('.topic-legacy-detail .phase5-panel').length})");
  if(!money.open||money.housing!==0||money.finance!==1)throw Error('Finance repeats housing or is not expanded '+JSON.stringify(money));
  await click("document.querySelector('#topic-strip .topic-tab:nth-child(3)')");
  await until(async()=>get("document.querySelector('#page-title')?.textContent==='保険・年金'"),'insurance topic opened');
  const insurance=await get("({open:document.querySelector('.topic-detail')?.open,insurance:document.querySelectorAll('.topic-legacy-detail .phase27-panel').length,finance:document.querySelectorAll('.topic-legacy-detail .phase5-panel').length})");
  if(!insurance.open||insurance.insurance!==1||insurance.finance!==0)throw Error('Insurance topic is duplicated '+JSON.stringify(insurance));
  // Button-first selection: navigation changes the displayed tool without executing actions.
  await click("document.querySelector('#category-dock button:nth-child(4)')");
  await until(async()=>get("document.querySelector('#page-title')?.textContent==='学校・学習'"),'academic category opened');
  const studyButtons=await get("({count:document.querySelectorAll('#topic-strip .topic-screen-tabs .screen-tab').length,selected:document.querySelectorAll('#topic-strip .screen-tab[aria-pressed=true]').length,duplicate:document.querySelectorAll('.topic-tool-buttons').length})");
  if(studyButtons.count!==3||studyButtons.selected!==1||studyButtons.duplicate!==0)throw Error('Top academic screen buttons missing or duplicated '+JSON.stringify(studyButtons));
  await click("document.querySelectorAll('#topic-strip .topic-screen-tabs .screen-tab')[2]");
  await until(async()=>get("document.querySelector('.phase4-choice-actions .choice-button-group')?.children.length>=4"),'study subject buttons opened');
  const academic=await get("({groupCount:document.querySelectorAll('.phase4-choice-actions .choice-button-group').length,subjectCount:document.querySelectorAll('.phase4-choice-actions .choice-button-group')[0]?.children.length,hourCount:document.querySelectorAll('.phase4-choice-actions .choice-button-group')[1]?.children.length,selected:document.querySelectorAll('.phase4-choice-actions .choice-button[aria-pressed=true]').length,dropdowns:document.querySelectorAll('.phase4-choice-actions select').length,overflow:document.documentElement.scrollWidth>innerWidth+3})");
  if(academic.groupCount!==2||academic.subjectCount<4||academic.hourCount!==4||academic.selected!==2||academic.dropdowns!==0||academic.overflow)throw Error('Academic choice groups invalid '+JSON.stringify(academic));
  await click("document.querySelectorAll('.phase4-choice-actions .choice-button-group')[0].children[1]");
  await click("document.querySelectorAll('.phase4-choice-actions .choice-button-group')[1].children[2]");
  if(!(await get("document.querySelectorAll('.phase4-choice-actions .choice-button[aria-pressed=true]').length===2")))throw Error('Selected button state not updated');
  if(!(await get("document.querySelectorAll('#topic-strip .screen-tab[aria-pressed=true]').length===1")))throw Error('Top screen state not updated');
  // Use a detached scenario to verify that a real equipment button works after
  // the ordinary life action was spent. This must not modify the player's save.
  const machine=await evaluate(`(async()=>{
    const [{createGameStore},{economyAction},{renderFocusedScreen}]=await Promise.all([
      import('./js/core/gameState.js'),import('./js/core/economySystems.js'),import('./js/ui/screenRenderer.js')
    ]);
    const store=createGameStore({interactiveChoices:true});
    store.startNewGame();
    const snapshot=structuredClone(store.getState());
    snapshot.pendingEvents=[];
    snapshot.timeline={year:2025,month:5,ageYears:25,turnsElapsed:100,monthsElapsed:304};
    snapshot.finances.cash=1000000;
    const context={age:25,date:snapshot.timeline,education:snapshot.education};
    economyAction(snapshot.finances,'startBusiness',{},context);
    economyAction(snapshot.finances,'purchaseEquipment',{amount:50000,type:'標準設備'},context);
    if(!store.loadState(snapshot).ok)return {error:'failed to load fixture'};
    if(!store.performAction('setBudget',{amount:70000}).ok)return {error:'life action not spent'};
    const host=document.createElement('div');
    host.className='business-browser-scenario';
    host.style.width='min(90%,900px)';
    document.body.append(host);
    let actionResult;
    renderFocusedScreen(host,{id:'WORK-04'},store.getState(),{
      onAction:(name,payload)=>{actionResult=store.performAction(name,payload);}
    });
    const equipment=host.querySelector('.business-equipment-panel');
    const selector=host.querySelector('.business-machine-choice');
    const target=[...host.querySelectorAll('button')].find(x=>x.textContent.includes('点検 5,000円'));
    const unblocked=Boolean(target&&!target.disabled);
    target?.click();
    const result={equipment:!!equipment,selector:!!selector,unblocked,
      operation:actionResult?.ok,adminUsed:store.getState().businessTurn.used,
      lifeUsed:store.getState().turnActions.used,
      noDuplicate:host.querySelectorAll('.business-equipment-panel').length===1,
      overflow:document.documentElement.scrollWidth>innerWidth+3};
    host.remove();return result;
  })()`);
  if(machine.error||!machine.equipment||!machine.selector||!machine.unblocked||
     !machine.operation||machine.adminUsed!==1||machine.lifeUsed!==1||!machine.noDuplicate||machine.overflow)
    throw Error('Business equipment action is missing, blocked or duplicated '+JSON.stringify(machine));
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
  await until(async()=>!(await get("document.querySelector('#settings-dialog').open")) && Number(await get("document.querySelector('#turn-count').textContent"))===savedTurn,'manual load restored original turn');
  await send('Page.reload',{ignoreCache:true});
  await until(async()=>Boolean(await get("document.readyState==='complete' && document.querySelector('#start-game')?.disabled===true")) && Number(await get("document.querySelector('#turn-count')?.textContent"))===savedTurn,'autosave survived browser reload',30000);
  
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