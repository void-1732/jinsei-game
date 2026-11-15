import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGameStore} from '../js/core/gameState.js';
import {validateGameState} from '../js/core/saveSystems.js';
import {createHealthData,advanceHealth} from '../js/core/healthSystems.js';
import {createConsequenceProgress,validateConsequenceProgress,ensureConsequenceProgress,rememberConsequence,createConsequenceEvent,resolveConsequence,consequenceHiringBonus,consequenceHealthProtection,getConsequenceSummary} from '../js/core/consequenceSystems.js';
import {hasImportantTurnEvent} from '../js/core/balanceSystems.js';
import {serializePortableSave,parsePortableSave} from '../js/core/portableSaves.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
function begin(){const g=createGameStore({interactiveChoices:true});assert.ok(g.startNewGame({name:'STEP51テスト',seed:1234,birth:{year:2000,month:1,day:1}}).ok);return g;}
function choose(g,index=0){const e=g.getState().pendingEvents.find(e=>e.type==='choice');assert.ok(e,'選択待ちイベントが必要');const r=g.performAction('resolveChoice',{eventId:e.id,choice:e.options[index].id});assert.ok(r.ok,r.reason);return e;}
function goToAge(g,age){let steps=0;while(g.getState().timeline.ageYears<age){if(g.getState().pendingEvents.some(e=>e.type==='choice'))choose(g);const r=g.advanceTurn();assert.ok(r.ok,r.reason);if(++steps>900)throw Error('長期進行が停止しました');}return steps;}
test('STEP 51のデータ形式と破損・不正な連続イベントを拒否する',()=>{
 const p=createConsequenceProgress();assert.equal(validateConsequenceProgress(p),true);
 assert.equal(validateConsequenceProgress({...p,scheduled:[{memoryId:1,stage:1,dueAge:11}]}),false);
 assert.equal(validateConsequenceProgress({...p,influence:{...p.influence,career:21}}),false);
 const g=begin();const bad=structuredClone(g.getState());bad.legacy51.influence.health=-1;
 assert.equal(validateGameState(bad),false);assert.equal(g.loadState(bad).ok,false);
});
test('6歳の選択を記録し、5年後の重要イベントとして再登場させる',()=>{
 const g=begin();choose(g);goToAge(g,6);
 const opening=g.getState().pendingEvents.find(e=>e.type==='choice');assert.equal(opening.branch?.thread,'spark');choose(g);
 const p=g.getState().legacy51;
 const first=p.memories.find(m=>m.domain==='learning');assert.ok(first);assert.equal(first.age,6);
 assert.deepEqual(p.scheduled.filter(j=>j.memoryId===first.id).map(j=>j.dueAge),[11,21]);
 assert.ok(validateGameState(g.getState()));
 goToAge(g,11);const echo=g.getState().pendingEvents.find(e=>e.type==='choice');
 assert.equal(echo.consequence?.memoryId,first.id);assert.equal(echo.consequence.stage,1);
 assert.match(echo.description,/6歳の時/);assert.match(echo.description,/学/);
 assert.equal(hasImportantTurnEvent([echo]),true);
 assert.equal(g.performAction('resolveChoice',{eventId:echo.id,choice:'1'}).ok,true);
 assert.equal(g.getState().legacy51.influence.learning,3);
 assert.equal(g.getState().legacy51.resolved.filter(e=>e.memoryId===first.id).length,1);
 assert.equal(validateGameState(g.getState()),true);
});
test('15年後にも過去の選択が再登場し、既存の人生分岐・卒業・職歴と共存する',()=>{
 const g=begin();choose(g);goToAge(g,6);choose(g);
 const first=g.getState().legacy51.memories.find(m=>m.domain==='learning');assert.ok(first);
 const events=[];let steps=0;
 while(g.getState().timeline.ageYears<=21){
   const queued=g.getState().pendingEvents.find(e=>e.type==='choice');
   if(queued){if(queued.consequence?.memoryId===first.id)events.push(queued.consequence.stage);choose(g);}
   const r=g.advanceTurn();assert.ok(r.ok,r.reason);
   if(++steps>260)throw Error('長期進行が異常');
 }
 assert.deepEqual(events,[1,2]);
 const current=g.getState();assert.ok(current.storyProgress.memories.length>=2);
 assert.equal(validateGameState(current),true);
 const saved=serializePortableSave(current);const parsed=parsePortableSave(saved.text);assert.equal(parsed.ok,true);
 const loaded=begin();assert.equal(loaded.loadState(parsed.state).ok,true);
 assert.deepEqual(loaded.getState().legacy51,current.legacy51);
 assert.deepEqual(loaded.getState().storyProgress,current.storyProgress);
});
test('仕事・家計・健康へ、再会の選択結果が数値として反映される',()=>{
 const g=begin();const state=structuredClone(g.getState());state.timeline={...state.timeline,ageYears:25,year:2025,month:1,monthsElapsed:300,turnsElapsed:220};
 const p=ensureConsequenceProgress(state);
 rememberConsequence(state,{title:'節約への決断'},{label:'暮らしを整える',impact:{cash:-9000}});
 const memory=p.memories[0];assert.equal(memory.domain,'finance');
 const event=createConsequenceEvent(state,{year:2030,month:1},250,30);
 assert.equal(event.consequence.memoryId,memory.id);
 const oldBudget=state.finances.monthlyBudget;
 const result=resolveConsequence(state,event,event.options[0]);assert.ok(result);
 assert.equal(state.finances.monthlyBudget,Math.max(10000,oldBudget-1000));
 assert.equal(state.legacy51.influence.finance,3);
 assert.equal(createConsequenceEvent(state,{year:2040,month:1},370,40)?.consequence?.stage,2);
 assert.equal(validateConsequenceProgress(state.legacy51),true);
 state.legacy51.influence.learning=20;state.legacy51.influence.career=20;state.legacy51.influence.health=20;
 assert.equal(consequenceHiringBonus(state),6);
 assert.equal(consequenceHealthProtection(state),.35);
 const health=createHealthData();const unprotected=createHealthData();
 advanceHealth(unprotected,{year:2025,month:5},25,.01,{balanced:true,healthProtection:0});
 advanceHealth(health,{year:2025,month:5},25,.01,{balanced:true,healthProtection:.35});
 assert.ok(unprotected.illness);assert.equal(health.illness,null);
});
test('旧セーブの人生分岐を継承し、既に過ぎた未来イベントを遡って発生させない',()=>{
 const g=begin();choose(g);goToAge(g,6);choose(g);
 const old=structuredClone(g.getState());delete old.legacy51;
 assert.equal(validateGameState(old),true);
 const copy=begin();assert.equal(copy.loadState(old).ok,true);
 const migrated=copy.getState().legacy51;
 assert.ok(migrated.memories.some(m=>m.domain==='learning'));
 assert.ok(migrated.scheduled.some(x=>x.dueAge===11));
 assert.equal(validateGameState(copy.getState()),true);
});
test('STEP 51の新しいUI・セーブ・テスト・Pages対象を確認',()=>{
 assert.match(read('index.html'),/css\/phase51\.css/);
 assert.match(read('js/ui/playDashboard.js'),/getConsequenceSummary/);
 assert.match(read('js/core/storyEvents.js'),/createConsequenceEvent/);
 assert.match(read('js/core/gameState.js'),/consequenceHiringBonus/);
 assert.match(read('js/core/saveSystems.js'),/validateConsequenceProgress/);
 assert.match(read('package.json'),/"version": "5\.7\.0"/);
 assert.match(read('README.md'),/STEP 51/);
});
