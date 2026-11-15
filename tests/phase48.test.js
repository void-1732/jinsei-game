import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGameStore} from '../js/core/gameState.js';
import {advanceHealth,createHealthData} from '../js/core/healthSystems.js';
import {createSaveRepository,validateGameState} from '../js/core/saveSystems.js';
import {createBalanceProgress,validateBalanceProgress,balancedGrowth,chooseRoutineOption,hasImportantTurnEvent,estimateMonthlyBudget} from '../js/core/balanceSystems.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf-8');
const newGame=()=>{const g=createGameStore({interactiveChoices:true});assert.equal(g.startNewGame({name:'48試験',seed:358,birth:{year:2000,month:2,day:1}}).ok,true);return g;};
const pending=g=>g.getState().pendingEvents.find(x=>x.type==='choice');
const choose=(g,n='1')=>{const event=pending(g);assert.ok(event);const result=g.performAction('resolveChoice',{eventId:event.id,choice:n});assert.equal(result.ok,true,result.reason);return event;};
const mem=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};

test('年齢30歳で36か月の健康変化は対話版で緩やか、旧健康APIの仕様は不変',()=>{
 const old=createHealthData(),next=createHealthData();
 for(let i=0;i<36;i++){
  const date={year:2030+Math.floor(i/12),month:i%12+1};
  advanceHealth(old,date,30,1);advanceHealth(next,date,30,1,{balanced:true});
 }
 assert.ok(old.physical<next.physical-25);
 assert.ok(next.physical>=80&&next.mental>=75);
 const aging=createHealthData();advanceHealth(aging,{year:2080,month:2},80,1,{balanced:true});
 assert.ok(aging.physical<85);
 const stress=createHealthData();advanceHealth(stress,{year:2030,month:3},30,1,{balanced:true,financialStress:true});
 assert.equal(stress.mental,79);
});

test('能力75以上の成長は積み重ね式・95点上限で、学習途中を保存できる',()=>{
 const s={balance48:createBalanceProgress()};let n=92;
 for(let i=0;i<8;i++)n=balancedGrowth(s,'skill:読書',n,3);
 assert.ok(n>=93&&n<=95);assert.ok(n<100);
 assert.equal(balancedGrowth(s,'skill:読書',95,500),95);
 assert.equal(balancedGrowth(s,'skill:読書',88,-5),83);
 assert.equal(validateBalanceProgress(s.balance48),true);
 assert.equal(validateBalanceProgress({...s.balance48,focus:'danger'}),false);
 assert.equal(validateBalanceProgress({...s.balance48,practice:{'score:x':-1}}),false);
});

test('自動処理の方針は実際に選択を変え、持ち金を超える選択肢を除外する',()=>{
 const event={options:[
  {id:'1',impact:{study:5,energy:-4,cash:-40000}},
  {id:'2',impact:{physical:4,mental:2}},
  {id:'3',impact:{social:6,energy:-1}},
 ]};
 const state={finances:{cash:120000},health:{physical:90,mental:80}};
 assert.equal(chooseRoutineOption(event,state,'learning').id,'1');
 assert.equal(chooseRoutineOption(event,state,'health').id,'2');
 assert.equal(chooseRoutineOption(event,state,'relationships').id,'3');
 state.finances.cash=0;assert.notEqual(chooseRoutineOption(event,state,'learning').id,'1');
 assert.equal(chooseRoutineOption(event,state,'invalid'),null);
});

test('通常イベントの自動選択は重要な出来事と長期分岐を絶対に飛ばさない',()=>{
 assert.equal(hasImportantTurnEvent([{type:'choice',catalogKey:'school-test'}]),false);
 for(const item of [{type:'birthday'},{type:'choice',branch:{thread:'spark'}},{type:'choice',category:'奨学金'},{type:'illness'}])assert.equal(hasImportantTurnEvent([item]),true);
 const g=newGame();
 assert.equal(g.fastForward().ok,false,'最初の選択待ちは進めない');
 choose(g);
 const r=g.fastForward({focus:'health'});
 assert.equal(r.ok,true);assert.ok(r.turns>=1&&r.turns<=4);
 assert.ok(g.getState().timeline.turnsElapsed>=1);
 assert.equal(g.getState().balance48.focus,'health');
 assert.ok(g.getState().balance48.fastRuns>=1);
 assert.ok(pending(g),'年齢節目では選択ポップアップを残す');
 assert.equal(g.fastForward().ok,false,'重要な選択待ちはさらに進めない');
 assert.equal(validateGameState(g.getState()),true);
});

test('12か月の進行上限・無効な方針・旧セーブは安全に拒否または補完',()=>{
 const g=newGame();choose(g);
 for(const req of [{maxMonths:0},{maxMonths:100},{focus:'impossible'},{maxMonths:2.5}])assert.equal(g.fastForward(req).ok,false);
 const old=structuredClone(g.getState());delete old.balance48;
 assert.equal(validateGameState(old),true);
 const g2=newGame();assert.equal(g2.loadState(old).ok,true);
 assert.deepEqual(g2.getState().balance48,createBalanceProgress());
 const bad=structuredClone(g2.getState());bad.balance48.skippedChoices=-1;
 assert.equal(validateGameState(bad),false);
});

test('連続進行・お金・学費・イベント分岐・セーブを統合検証',()=>{
 const game=newGame();const repo=createSaveRepository(mem());let loops=0,auto=0,seenBranch=false;
 // Several decades can be covered without overwriting mandatory choices.
 while(game.getState().timeline.ageYears<24 && ++loops<160){
   const event=pending(game);
   if(event){if(event.branch)seenBranch=true;choose(game);}
   if(game.getState().ending.dead)break;
   const result=game.fastForward({focus:loops%3?'learning':'finances'});
   assert.equal(result.ok,true,result.reason);
   auto+=result.auto;
   assert.equal(validateGameState(game.getState()),true);
 }
 assert.ok(loops<160,'Time-saving progress avoids infinite loop');
 assert.ok(seenBranch,'Important long-term life thread still appears');
 assert.ok(auto>0,'Ordinary choices were auto-processed');
 assert.ok(game.getState().timeline.turnsElapsed>35);
 assert.equal(repo.save('手動保存1',game.getState()).ok,true);
 const loaded=repo.load('手動保存1');assert.equal(loaded.ok,true);
 const continued=createGameStore({interactiveChoices:true});assert.equal(continued.loadState(loaded.state).ok,true);
 assert.deepEqual(continued.getState().balance48,game.getState().balance48);
 assert.deepEqual(continued.getState().opportunity47,game.getState().opportunity47);
 assert.deepEqual(continued.getState().storyProgress,game.getState().storyProgress);
});

test('画面内の時間短縮UIは保存を邪魔せずブラウザ操作へ接続されている',()=>{
 const html=read('index.html'),app=read('js/app.js'),css=read('css/phase48.css');
 for(const id of ['fast-forward-focus','fast-forward-turn','fast-forward-feedback'])assert.match(html,new RegExp(`id="${id}"`));
 assert.match(app,/gameStore\.fastForward/);assert.match(css,/hub-fast-forward/);
 assert.match(read('package.json'),/"version": "5\.6\.0"/);
});

test('家計見通しは架空の追加収入を発生させず、学費と負債を判断する目安になる',()=>{
 const g=newGame();const s=structuredClone(g.getState());
 s.timeline.year=2020;s.timeline.month=1;s.timeline.ageYears=19;s.timeline.monthsElapsed=240;s.timeline.turnsElapsed=75;
 s.education.stage='大学';s.finances.career.job='技術職';s.finances.career.monthlySalary=290000;s.finances.monthlyBudget=110000;
 s.opportunity47.education.grantMonthly=18000;
 const before=JSON.stringify(s);
 const x=estimateMonthlyBudget(s);
 assert.equal(x.gross,290000);assert.equal(x.tax,29000);assert.equal(x.tuition,18000);assert.equal(x.balance,133000);
 assert.equal(JSON.stringify(s),before,'Read-only forecast');
 s.finances.career.job=null;s.finances.career.monthlySalary=0;s.finances.debt=300000;
 assert.match(estimateMonthlyBudget(s).warning,/赤字/);
});
