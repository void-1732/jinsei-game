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
  // Persistent action center is available from the header without navigation.
  await click("document.querySelector('#open-action-center')");
  await until(async()=>get("document.querySelector('#action-center-dialog')?.open && document.querySelectorAll('#action-center-content .action-center-category').length===7"),'action center opened');
  const centerInitial=await get("({choices:document.querySelectorAll('#action-center-content .action-center-option').length,disabled:document.querySelector('#action-center-content .action-center-confirm')?.disabled,overflow:document.documentElement.scrollWidth>innerWidth+3})");
  if(centerInitial.choices<3||!centerInitial.disabled||centerInitial.overflow)throw Error('Action center initial layout invalid '+JSON.stringify(centerInitial));
  await click("document.querySelector('#close-action-center')");
  if(await get("document.querySelector('#action-center-dialog').open"))throw Error('Action center could not be closed');
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
  const assets=await get("({ledger:document.querySelectorAll('.asset-portfolio').length,purchase:!!document.querySelector('.asset-purchase'),vehicle:!!document.querySelector('.asset-action-row .choice-button-field'),detailSelectors:document.querySelectorAll('.topic-tool-buttons').length,overflow:document.documentElement.scrollWidth>innerWidth+3})");
  if(assets.ledger!==1||!assets.purchase||!assets.vehicle||assets.detailSelectors!==0||assets.overflow)
    throw Error('Property and multi-vehicle controls are missing or duplicated '+JSON.stringify(assets));
  await click("document.querySelector('.asset-purchase > summary')");
  const propertyControls=await get("({open:document.querySelector('.asset-purchase')?.open,regionButtons:document.querySelectorAll('.asset-purchase .choice-button-group')[0]?.children.length,homeTypes:document.querySelectorAll('.asset-purchase .choice-button-group')[1]?.children.length,overflow:document.documentElement.scrollWidth>innerWidth+3})");
  if(!propertyControls.open||propertyControls.regionButtons!==10||propertyControls.homeTypes!==3||propertyControls.overflow)
    throw Error('Property purchase button controls failed '+JSON.stringify(propertyControls));
  await click("document.querySelector('.asset-purchase > summary')");
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
  const studyNavigation=await get("({legacyTabs:document.querySelectorAll('#topic-strip .topic-screen-tabs .screen-tab').length,pickers:document.querySelectorAll('.topic-detail-picker select').length,details:document.querySelectorAll('.topic-detail-picker select option').length,overflow:document.documentElement.scrollWidth>innerWidth+3})");
  if(studyNavigation.legacyTabs!==0||studyNavigation.pickers!==1||studyNavigation.details!==3||studyNavigation.overflow)
    throw Error('Academic topics were not consolidated '+JSON.stringify(studyNavigation));
  await evaluate("(()=>{const picker=document.querySelector('.topic-detail-picker select');picker.value='EDU-03';picker.dispatchEvent(new Event('change',{bubbles:true}));return true})()");
  await until(async()=>get("document.querySelector('.phase4-choice-actions .choice-button-group')?.children.length>=4"),'legacy study tool retained in detail selector');
  const academic=await get("({groupCount:document.querySelectorAll('.phase4-choice-actions .choice-button-group').length,subjectCount:document.querySelectorAll('.phase4-choice-actions .choice-button-group')[0]?.children.length,hourCount:document.querySelectorAll('.phase4-choice-actions .choice-button-group')[1]?.children.length,selected:document.querySelectorAll('.phase4-choice-actions .choice-button[aria-pressed=true]').length,picker:document.querySelector('.topic-detail-picker select')?.value,overflow:document.documentElement.scrollWidth>innerWidth+3})");
  if(academic.groupCount!==2||academic.subjectCount<4||academic.hourCount!==4||academic.selected!==2||academic.picker!=='EDU-03'||academic.overflow)
    throw Error('Academic legacy controls were not retained '+JSON.stringify(academic));
  await click("document.querySelectorAll('.phase4-choice-actions .choice-button-group')[0].children[1]");
  await click("document.querySelectorAll('.phase4-choice-actions .choice-button-group')[1].children[2]");
  if(!(await get("document.querySelectorAll('.phase4-choice-actions .choice-button[aria-pressed=true]').length===2")))
    throw Error('Legacy study selections no longer respond');
  const studentPlanner=await evaluate(`(async()=>{
    const [{createGameStore},{renderStudentBalancePanel}]=await Promise.all([
      import('./js/core/gameState.js'),import('./js/ui/studentBalancePanel.js')
    ]);
    const game=createGameStore();game.startNewGame();
    for(let i=0;i<25;i++)game.advanceTurn();
    const host=document.createElement('div');host.style.width='min(95%,900px)';document.body.append(host);
    host.append(renderStudentBalancePanel(game.getState(),(action,payload)=>game.performAction(action,payload)));
    const selectors=[...host.querySelectorAll('.student-balance-select')];
    const initial=host.querySelector('.student-balance-rest')?.textContent;
    selectors[1].value='6';selectors[1].dispatchEvent(new Event('change',{bubbles:true}));
    selectors[2].value='6';selectors[2].dispatchEvent(new Event('change',{bubbles:true}));
    const blocked=host.querySelector('.student-balance-submit')?.disabled;
    selectors[2].value='2';selectors[2].dispatchEvent(new Event('change',{bubbles:true}));
    const valid=!host.querySelector('.student-balance-submit')?.disabled;
    const before=game.getState().health.energy;
    host.querySelector('.student-balance-submit')?.click();
    const after=game.getState().health.energy;
    const message=host.querySelector('.student-balance-feedback')?.textContent;
    const overflow=document.documentElement.scrollWidth>innerWidth+3;
    host.remove();
    return {count:selectors.length,initial,blocked,valid,healthCost:after<before,message,overflow};
  })()`);
  if(studentPlanner.count!==3||!studentPlanner.initial?.includes('休息 4h')||!studentPlanner.blocked||
      !studentPlanner.valid||!studentPlanner.healthCost||!studentPlanner.message||studentPlanner.overflow)
    throw Error('Student balance browser interaction invalid '+JSON.stringify(studentPlanner));
  // Extended labor market is visible through one collapsed tool, not a wall of 30 cards.
  const careerExpansion=await evaluate(`(async()=>{
    const [{createGameStore},{renderEconomyPanel},{EXTENDED_JOB_POSTINGS,marketListings}]=await Promise.all([
      import('./js/core/gameState.js'),import('./js/ui/economyPanels.js'),import('./js/core/careerMarketplace.js')
    ]);
    const game=createGameStore();game.startNewGame();
    const state=structuredClone(game.getState());
    state.timeline={year:2026,month:5,ageYears:26,turnsElapsed:101,monthsElapsed:316};
    state.finances.cash=1000000;
    const host=document.createElement('div');host.style.width='min(95%,900px)';document.body.append(host);
    renderEconomyPanel(host,{id:'WORK-01'},state,{onAction:()=>({ok:true})});
    const drawer=host.querySelector('.career-market');
    const sectors=host.querySelector('.career-sector-select');
    const jobs=host.querySelector('.career-posting-select');
    const original=jobs?.options.length??0;
    const count=marketListings(state).length;
    if(sectors){sectors.value='IT';sectors.dispatchEvent(new Event('change',{bubbles:true}));}
    const filtered=[...jobs?.options??[]].every(o=>o.textContent.includes('エンジニア')||o.textContent.includes('技術')||o.textContent.includes('ゲーム')||o.textContent.includes('情報'));
    const after=jobs?.options.length??0;
    const overflow=document.documentElement.scrollWidth>innerWidth+3;
    host.remove();
    return {drawer:!!drawer,closed:drawer?.open===false,registered:EXTENDED_JOB_POSTINGS.length,
      original,count,after,filtered,overflow};
  })()`);
  if(!careerExpansion.drawer||!careerExpansion.closed||careerExpansion.registered!==30||
     !careerExpansion.original||!careerExpansion.count||!careerExpansion.after||!careerExpansion.filtered||careerExpansion.overflow)
    throw Error('Expanded job market browser UI failed '+JSON.stringify(careerExpansion));
  // Qualification system: interactive preview, degree gates, compact layout,
  // and safe controls tested at both PC and mobile viewport widths.
  const qualificationQA=await evaluate(`(async()=>{
    const [{createGameStore},{renderQualificationPanel},{QUALIFICATION_CATALOG}]=await Promise.all([
      import('./js/core/gameState.js'),import('./js/ui/qualificationPanel.js'),import('./js/core/qualificationSystems.js')
    ]);
    const g=createGameStore();g.startNewGame();
    const state=structuredClone(g.getState());
    state.timeline={year:2026,month:5,ageYears:26,turnsElapsed:110,monthsElapsed:316};
    state.finances.cash=200000;
    const host=document.createElement('div');host.style.width='min(95%,900px)';document.body.append(host);
    host.append(renderQualificationPanel(state,(action,payload)=>({ok:true,message:action+' '+payload.id})));
    const root=host.querySelector('.qualification-panel');
    const selected=host.querySelector('.qualification-picker');
    const original=host.querySelector('.qualification-preview')?.textContent??'';
    selected.value='physician';selected.dispatchEvent(new Event('change',{bubbles:true}));
    const doctor=host.querySelector('.qualification-preview')?.textContent??'';
    const examDisabled=[...host.querySelectorAll('.qualification-panel button')].at(-1)?.disabled;
    selected.value='itEntry';selected.dispatchEvent(new Event('change',{bubbles:true}));
    const examEnabled=![...host.querySelectorAll('.qualification-panel button')].at(-1)?.disabled;
    const earned=host.querySelector('.qualification-body')?.textContent?.includes('取得資格');
    const overflow=document.documentElement.scrollWidth>innerWidth+3;
    host.remove();
    return {count:QUALIFICATION_CATALOG.length,root:!!root,closed:root?.open===false,original,
      doctor,examDisabled,examEnabled,earned,overflow};
  })()`);
  if(qualificationQA.count!==40||!qualificationQA.root||!qualificationQA.closed||
     !qualificationQA.original?.includes('難易度')||!qualificationQA.doctor.includes('医学課程修了')||
     !qualificationQA.examDisabled||!qualificationQA.examEnabled||!qualificationQA.earned||qualificationQA.overflow)
    throw Error('Qualification UI broken at this viewport '+JSON.stringify(qualificationQA));
  // Industrial/commercial/technical students: age-16 exams; training effect;
  // open/closed preferences survive re-render at both tested widths.
  const youthCareerQA=await evaluate(`(async()=>{
    const [{createGameStore},{renderQualificationPanel},{renderLifePanel},{createFoldState}]=await Promise.all([
      import('./js/core/gameState.js'),import('./js/ui/qualificationPanel.js'),
      import('./js/ui/lifePanels.js'),import('./js/ui/foldState.js')
    ]);
    const g=createGameStore();g.startNewGame();
    const state=structuredClone(g.getState());
    state.timeline={year:2016,month:5,ageYears:16,turnsElapsed:65,monthsElapsed:196};
    state.education.stage='高校';state.education.school='工業高校';
    state.education.highSchoolTrack='工業高校';state.finances.cash=150000;
    const host=document.createElement('div');host.style.width='min(95%,900px)';document.body.append(host);
    host.append(renderQualificationPanel(state,()=>({ok:true})));
    let picker=host.querySelector('.qualification-picker');picker.value='industrial';
    picker.dispatchEvent(new Event('change',{bubbles:true}));
    const allowed=!host.querySelector('.qualification-panel button:last-child')?.disabled;
    state.education.school='普通高校';state.education.highSchoolTrack='普通高校';
    host.replaceChildren(renderQualificationPanel(state,()=>({ok:true})));
    picker=host.querySelector('.qualification-picker');picker.value='industrial';
    picker.dispatchEvent(new Event('change',{bubbles:true}));
    const ordinaryBlocked=host.querySelector('.qualification-panel button:last-child')?.disabled;
    state.education.stage='高専';state.education.school='高等専門学校';
    state.education.highSchoolTrack='高専';
    host.replaceChildren();
    renderLifePanel(host,{id:'EDU-05'},state,{onAction:()=>({ok:true})});
    const training=host.querySelector('details[data-fold-key="career-training"]');
    const effect=host.querySelector('.career-training-effect')?.textContent??'';
    const keys=new Map(),store={getItem:key=>keys.get(key)??null,setItem:(key,value)=>keys.set(key,value)};
    const folds=createFoldState(store);
    training.open=true;folds.capture(host,'EDU-05');
    host.replaceChildren();
    renderLifePanel(host,{id:'EDU-05'},state,{onAction:()=>({ok:true})});
    const after=host.querySelector('details[data-fold-key="career-training"]');
    folds.restore(host,'EDU-05');
    const retainedOpen=after.open;
    after.open=false;folds.capture(host,'EDU-05');
    const fromStorage=createFoldState(store);
    host.replaceChildren();renderLifePanel(host,{id:'EDU-05'},state,{onAction:()=>({ok:true})});
    fromStorage.restore(host,'EDU-05');
    const retainedClosed=!host.querySelector('details[data-fold-key="career-training"]').open;
    const overflow=document.documentElement.scrollWidth>innerWidth+3;
    host.remove();
    return {allowed,ordinaryBlocked,training:!!training,effect,retainedOpen,retainedClosed,overflow};
  })()`);
  if(!youthCareerQA.allowed||!youthCareerQA.ordinaryBlocked||!youthCareerQA.training||
      !youthCareerQA.effect.includes('採用評価')||!youthCareerQA.effect.includes('技能')||
      !youthCareerQA.retainedOpen||!youthCareerQA.retainedClosed||youthCareerQA.overflow)
    throw Error('Student qualification, training preview or fold persistence invalid '+JSON.stringify(youthCareerQA));
  // U4/U5/U7: isolated adult fixture checks the real responsive game panels
  // and long-term event generation without touching the browser's save slots.
  const newFeatures=await evaluate(`(async()=>{
    const [
      {createGameStore},{renderFocusedScreen},{renderLifeGuidancePanel},
      {createStoryProgress,createBranchingEvent,recordBranchChoice}
    ]=await Promise.all([
      import('./js/core/gameState.js'),
      import('./js/ui/screenRenderer.js'),
      import('./js/ui/lifeGuidancePanel.js'),
      import('./js/core/branchingStories.js')
    ]);
    const store=createGameStore({interactiveChoices:true});store.startNewGame();
    const snapshot=structuredClone(store.getState());snapshot.pendingEvents=[];
    snapshot.timeline={year:2026,month:5,ageYears:26,turnsElapsed:101,monthsElapsed:316};
    snapshot.turnActions={turn:101,used:0,lastAction:null,categories:[]};
    snapshot.finances.cash=1000000;
    snapshot.finances.career.job='事務職';snapshot.finances.career.monthlySalary=300000;
    if(!store.loadState(snapshot).ok)return {error:'adult fixture did not load'};
    const host=document.createElement('div');host.style.width='min(95%,900px)';document.body.append(host);
    renderFocusedScreen(host,{id:'LIFE-03'},store.getState(),{onAction:()=>{}});
    const overview=host.querySelector('.asset-pulse');
    const metrics=host.querySelectorAll('.asset-pulse-metrics .asset-pulse-item').length;
    const flows=host.querySelectorAll('.asset-pulse-flow .asset-pulse-item').length;
    const choices=[...host.querySelectorAll('.asset-pulse-forecast .choice-button')];
    const previous=host.querySelector('.asset-pulse-result')?.textContent;
    choices.find(b=>b.dataset.value==='12')?.click();
    const later=host.querySelector('.asset-pulse-result')?.textContent;
    const forecastChanged=previous!==later;
    const original=JSON.stringify(store.getState());
    const budget=host.querySelector('.asset-pulse-budget button');
    const chart=host.querySelector('.asset-pulse-fold .phase18-graph');
    host.replaceChildren();
    let destination=null;
    const risk=structuredClone(store.getState());
    risk.health.physical=20;risk.health.mental=20;risk.finances.cash=100;
    risk.finances.career.job=null;
    const guidance=renderLifeGuidancePanel(risk,id=>{destination=id;});
    host.append(guidance);
    const alerts=host.querySelectorAll('.life-guidance-item.is-warning').length;
    const more=host.querySelector('.life-guidance-extra');
    host.querySelector('.life-guidance-link')?.click();
    const adviceWorking=Boolean(destination);
    const progress=createStoryProgress();
    const opening=createBranchingEvent(progress,{year:2025,month:2},200,25);
    recordBranchChoice(progress,opening,opening.options[0],25);
    const sequel=createBranchingEvent(progress,{year:2035,month:2},350,35);
    const result={overview:!!overview,metrics,flows,forecastButtons:choices.length,
      forecastChanged,budget:!!budget,chart:!!chart,
      readOnly:original===JSON.stringify(store.getState()),
      guidance:!!guidance,alerts,more:!!more,adviceWorking,
      story:opening?.branch?.thread,sequel:sequel?.branch?.stage,
      overflow:document.documentElement.scrollWidth>innerWidth+3};
    host.remove();return result;
  })()`);
  if(newFeatures.error||!newFeatures.overview||newFeatures.metrics!==6||newFeatures.flows!==3||
    newFeatures.forecastButtons!==3||!newFeatures.forecastChanged||!newFeatures.budget||
    !newFeatures.readOnly||!newFeatures.guidance||newFeatures.alerts<2||
    !newFeatures.more||!newFeatures.adviceWorking||newFeatures.story!=='financialFuture'||
    newFeatures.sequel!==2||newFeatures.overflow)
    throw Error('U4/U5/U7 adult asset, guidance or branching browser QA failed '+JSON.stringify(newFeatures));
  const jobLayout=await evaluate(`(async()=>{
    const [{createGameStore},{renderFocusedScreen}]=await Promise.all([
      import('./js/core/gameState.js'),import('./js/ui/screenRenderer.js')
    ]);
    const store=createGameStore({interactiveChoices:true});store.startNewGame();
    const snapshot=structuredClone(store.getState());snapshot.pendingEvents=[];
    snapshot.timeline={year:2026,month:5,ageYears:26,turnsElapsed:101,monthsElapsed:316};
    snapshot.turnActions={turn:101,used:0,lastAction:null,categories:[]};
    snapshot.finances.cash=300000;
    if(!store.loadState(snapshot).ok)return {error:'fixture loading'};
    const host=document.createElement('div');host.className='sidejob-browser-scenario';
    host.style.width='min(90%,900px)';document.body.append(host);
    let result;
    renderFocusedScreen(host,{id:'WORK-03'},store.getState(),{
      onAction:(action,payload)=>{result=store.performAction(action,payload);}
    });
    const buttons=[...host.querySelectorAll('.work-compact-choice .choice-button')];
    const start=host.querySelector('.sidejob-workspace .work-compact-card .work-compact-action');
    const oldPreview=host.querySelector('.work-compact-preview')?.textContent;
    buttons[1]?.click();
    const newPreview=host.querySelector('.work-compact-preview')?.textContent;
    start?.click();
    const outcome={stats:host.querySelectorAll('.work-compact-stat').length,
      options:buttons.length,legacyCards:host.querySelectorAll('.phase10-job').length,
      previewChanged:oldPreview!==newPreview,started:store.getState().finances.sideJob.active,
      result:result?.ok,spent:store.getState().turnActions.used,
      overflow:document.documentElement.scrollWidth>innerWidth+3};
    host.remove();return outcome;
  })()`);
  if(jobLayout.error||jobLayout.stats!==3||jobLayout.options!==6||jobLayout.legacyCards!==0||
    !jobLayout.previewChanged||!jobLayout.started||!jobLayout.result||jobLayout.spent!==1||jobLayout.overflow)
    throw Error('Compact side-job UI and actions failed '+JSON.stringify(jobLayout));
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
    const tabs=[...host.querySelectorAll('.business-compact-tab')];
    const visible=()=>[...host.querySelectorAll('.business-compact-pane')].filter(x=>!x.hidden);
    const overview=host.querySelectorAll('.work-compact-stat').length;
    const financeTab=tabs.find(x=>x.textContent==='融資・資金');
    financeTab?.click();
    const financeVisible=visible().length===1&&visible()[0].querySelectorAll('button[data-action-scope="business"]').length>=5;
    const equipmentTab=tabs.find(x=>x.textContent==='設備');
    equipmentTab?.click();
    const equipmentVisible=visible().length===1&&visible()[0].querySelector('.business-equipment-panel')!==null;
    const equipment=host.querySelector('.business-equipment-panel');
    const selector=host.querySelector('.business-machine-choice');
    const target=[...host.querySelectorAll('button')].find(x=>x.textContent.includes('点検 5,000円'));
    const unblocked=Boolean(target&&!target.disabled);
    target?.click();
    const result={equipment:!!equipment,selector:!!selector,unblocked,
      tabs:tabs.length,overview,financeVisible,equipmentVisible,visiblePaneCount:visible().length,
      operation:actionResult?.ok,adminUsed:store.getState().businessTurn.used,
      lifeUsed:store.getState().turnActions.used,
      noDuplicate:host.querySelectorAll('.business-equipment-panel').length===1,
      overflow:document.documentElement.scrollWidth>innerWidth+3};
    host.remove();return result;
  })()`);
  if(machine.error||!machine.equipment||!machine.selector||!machine.unblocked||
     machine.tabs!==5||machine.overview!==6||!machine.financeVisible||!machine.equipmentVisible||machine.visiblePaneCount!==1||
     !machine.operation||machine.adminUsed!==1||machine.lifeUsed!==1||!machine.noDuplicate||machine.overflow)
    throw Error('Business equipment action is missing, blocked or duplicated '+JSON.stringify(machine));
  // Exercise the actual adult store: three distinct category actions, one each,
  // plus monthly recurring settings. The detached fixture never touches the save.
  const adultBudget=await evaluate(`(async()=>{
    const [{createGameStore},{renderMonthlyRoutinePanel},{renderTurnActivity}]=await Promise.all([
      import('./js/core/gameState.js'),import('./js/ui/monthlyRoutinePanel.js'),import('./js/ui/turnActivities.js')
    ]);
    const store=createGameStore({interactiveChoices:true});store.startNewGame();
    const snapshot=structuredClone(store.getState());snapshot.pendingEvents=[];
    snapshot.timeline={year:2026,month:5,ageYears:26,turnsElapsed:101,monthsElapsed:316};
    snapshot.turnActions={turn:101,used:0,lastAction:null,categories:[]};
    snapshot.finances.cash=300000;
    if(!store.loadState(snapshot).ok)return {error:'fixture not loaded'};
    const host=document.createElement('section');host.style.width='min(90%,850px)';document.body.append(host);
    host.append(renderMonthlyRoutinePanel(store.getState(),'健康',(a,p)=>store.performAction(a,p)));
    const habit=host.querySelector('.monthly-routine-panel');
    if(!habit)return {error:'monthly health panel missing'};
    habit.open=true;
    const options=[...host.querySelectorAll('.monthly-routine-panel .choice-button')];
    options.find(x=>x.dataset.value==='walks')?.click();
    host.querySelector('.monthly-routine-body >button')?.click();
    const one=store.getState().turnActions.used;
    const second=store.performAction('setMonthlyRoutine',{domain:'relationships',planId:'call'});
    const third=store.performAction('adultActivity',{id:'online-course'});
    const fourth=store.performAction('adultActivity',{id:'gym-class'});
    const result={first:one,second:second.ok,third:third.ok,fourth:fourth.ok,
      remaining:3-store.getState().turnActions.used,unique:new Set(store.getState().turnActions.categories).size,
      mobileOverflow:document.documentElement.scrollWidth>innerWidth+3,buttonCount:options.length};
    host.remove();return result;
  })()`);
  if(adultBudget.error||adultBudget.first!==1||!adultBudget.second||!adultBudget.third||
     adultBudget.fourth||adultBudget.remaining!==0||adultBudget.unique!==3||
     adultBudget.buttonCount!==4||adultBudget.mobileOverflow)
    throw Error('Adult three-category and recurring button test failed '+JSON.stringify(adultBudget));
  // Use a detached adult store to exercise three actual actions through the
  // same buttons, including re-render and category-usage lockout.
  const centerAdult=await evaluate(`(async()=>{
    const [{createGameStore},{renderActionCenter}]=await Promise.all([
      import('./js/core/gameState.js'),import('./js/ui/actionCenter.js')
    ]);
    const store=createGameStore({interactiveChoices:true});store.startNewGame();
    const snapshot=structuredClone(store.getState());snapshot.pendingEvents=[];
    snapshot.timeline={year:2026,month:5,ageYears:26,turnsElapsed:101,monthsElapsed:316};
    snapshot.turnActions={turn:101,used:0,lastAction:null,categories:[]};
    snapshot.finances.cash=300000;
    if(!store.loadState(snapshot).ok)return {error:'fixture failed'};
    const host=document.createElement('div');host.style.width='min(95%,920px)';
    document.body.append(host);
    let successful=0,attempts=0;
    const draw=()=>renderActionCenter(host,store.getState(),{
      onAction:(a,p)=>{attempts++;return store.performAction(a,p)},
      onSuccessfulAction:()=>{successful++;draw()},
      onNavigate:()=>{}
    });
    draw();
    const clickAction=(action,category)=>{
      const button=[...host.querySelectorAll('.action-center-option')].find(b=>b.dataset.action===action&&b.dataset.category===category&&!b.disabled);
      if(!button)return false;
      button.click();host.querySelector('.action-center-confirm')?.click();return true;
    };
    const first=clickAction('adultActivity','健康');
    const usedHealth=[...host.querySelectorAll('.action-center-category')].find(c=>c.dataset.category==='健康');
    const disabledAfter=usedHealth?.querySelector('.action-center-option')?.disabled;
    const second=clickAction('adultActivity','人物・家族');
    const third=clickAction('adultActivity','学業');
    const fourth=[...host.querySelectorAll('.action-center-option')].some(b=>!b.disabled);
    const result={first,second,third,disabledAfter,remaining:3-store.getState().turnActions.used,
      used:store.getState().turnActions.used,success:successful,attempts,fourth,overflow:document.documentElement.scrollWidth>innerWidth+3};
    host.remove();return result;
  })()`);
  if(centerAdult.error||!centerAdult.first||!centerAdult.second||!centerAdult.third||
    !centerAdult.disabledAfter||centerAdult.remaining!==0||centerAdult.used!==3||
    centerAdult.success!==3||centerAdult.attempts!==3||centerAdult.fourth||centerAdult.overflow)
    throw Error('Adult action center buttons failed '+JSON.stringify(centerAdult));
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