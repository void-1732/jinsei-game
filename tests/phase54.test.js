import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGameStore} from '../js/core/gameState.js';
import {validateGameState,createSaveRepository} from '../js/core/saveSystems.js';
import {createBalanceProgress} from '../js/core/balanceSystems.js';
import {TIME_PLANS,createDailySchedule,ensureDailySchedule,validateDailySchedule,setDailySchedule,advanceDailySchedule,monthlyHouseholdDiscount} from '../js/core/dailySchedule.js';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
function playToAge(target){
 const g=createGameStore({interactiveChoices:true});
 assert.equal(g.startNewGame({name:'時間のテスト',seed:543210,birth:{year:2000,month:1,day:15}}).ok,true);
 let count=0;
 while(g.getState().timeline.ageYears<target){
  const event=g.getState().pendingEvents.find(e=>e.type==='choice');
  if(event)assert.equal(g.performAction('resolveChoice',{eventId:event.id,choice:event.options[0].id}).ok,true);
  assert.equal(g.advanceTurn().ok,true);
  if(++count>500)throw new Error('Expected age not reached');
 }
 const pending=g.getState().pendingEvents.find(e=>e.type==='choice');
 if(pending)assert.equal(g.performAction('resolveChoice',{eventId:pending.id,choice:pending.options[0].id}).ok,true);
 return g;
}
function simpleState(id){return {daily54:{...createDailySchedule(),planId:id},balance48:createBalanceProgress(),health:{physical:70,mental:60,energy:60},finances:{debt:0,career:{job:'会社員',performance:50}},education:{stage:'小学校',scores:{国語:50,数学:50},skills:{}},people:[{name:'親',role:'父',relationship:50}]};}

test('6つの生活プランは5カテゴリ合計100%で固定される',()=>{
 assert.equal(TIME_PLANS.length,6);
 for(const p of TIME_PLANS){assert.equal(p.shares.length,5);assert.equal(p.shares.reduce((a,b)=>a+b),100);assert.ok(p.shares.every(n=>Number.isInteger(n)&&n>=0));}
 assert.equal(validateDailySchedule(createDailySchedule()),true);
});
test('不正な生活プランや範囲外の保存フィールドを拒否する',()=>{
 const state=simpleState('balanced');state.timeline={ageYears:20};
 assert.equal(setDailySchedule(state,'does-not-exist').ok,false);
 assert.equal(validateDailySchedule({...createDailySchedule(),fatigue:101}),false);
 assert.equal(validateDailySchedule({...createDailySchedule(),studyPoints:240}),false);
 assert.equal(validateDailySchedule({...createDailySchedule(),lastEffect:{year:2020,month:5,summary:'x'.repeat(181)}}),false);
});
test('6歳未満は生活プランを使えない、失敗しても自由行動枠は減らない',()=>{
 const g=createGameStore({interactiveChoices:true});g.startNewGame({name:'幼児'});
 const event=g.getState().pendingEvents[0];g.performAction('resolveChoice',{eventId:event.id,choice:event.options[0].id});
 const x=g.performAction('setTimePlan',{planId:'rest'});
 assert.equal(x.ok,false);assert.equal(g.getState().turnActions.used,0);
 assert.equal(g.getState().daily54.planId,'balanced');
});
test('プラン変更は1ターンの自由行動1回を使う。重複・選択前の操作は拒否',()=>{
 const g=playToAge(6);
 assert.equal(g.performAction('setTimePlan',{planId:'balanced'}).ok,false);
 assert.equal(g.getState().turnActions.used,0);
 assert.equal(g.performAction('setTimePlan',{planId:'learning'}).ok,true);
 assert.equal(g.performAction('setTimePlan',{planId:'rest'}).ok,false);
 assert.equal(g.performAction('skill',{skill:'読書'}).ok,false);
 assert.equal(g.getState().daily54.planId,'learning');
 assert.equal(g.advanceTurn().ok,true);
 assert.equal(g.performAction('setTimePlan',{planId:'rest'}).ok,false);
 const pending=g.getState().pendingEvents.find(e=>e.type==='choice');
 g.performAction('resolveChoice',{eventId:pending.id,choice:pending.options[0].id});
 assert.equal(g.performAction('setTimePlan',{planId:'rest'}).ok,true);
});
test('月次処理は同じ月に二重適用されず、時間配分がセーブ可能',()=>{
 const state=simpleState('learning');
 const r=advanceDailySchedule(state,{year:2025,month:5},25);
 assert.equal(r.applied,true);
 assert.equal(advanceDailySchedule(state,{year:2025,month:5},25).applied,false);
 assert.equal(state.daily54.monthsApplied,1);
 assert.equal(validateDailySchedule(state.daily54),true);
 const g=playToAge(6);assert.equal(g.performAction('setTimePlan',{planId:'learning'}).ok,true);
 const memory=new Map();const repo=createSaveRepository({getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)});
 assert.equal(repo.save('手動保存1',g.getState()).ok,true);
 const restored=createGameStore({interactiveChoices:true});assert.equal(restored.loadState(repo.load('手動保存1').state).ok,true);
 assert.equal(restored.getState().daily54.planId,'learning');
 assert.equal(validateGameState(restored.getState()),true);
});
test('保存データ互換：旧セーブにdaily54がなくても補完できる',()=>{
 const g=playToAge(6);const old=structuredClone(g.getState());delete old.daily54;
 assert.equal(validateGameState(old),true);
 const loaded=createGameStore({interactiveChoices:true});assert.equal(loaded.loadState(old).ok,true);
 assert.equal(loaded.getState().daily54.planId,'balanced');
});
test('学習型は遅く着実に成長し、仕事偏重では疲労とストレスがたまる',()=>{
 const learn=simpleState('learning'),work=simpleState('career');
 for(let m=1;m<=12;m++){
  advanceDailySchedule(learn,{year:2022,month:m},22);
  advanceDailySchedule(work,{year:2022,month:m},22);
 }
 assert.ok(learn.education.scores.国語>50||learn.education.scores.数学>50);
 assert.ok(work.daily54.fatigue>learn.daily54.fatigue);
 assert.ok(work.daily54.stress>learn.daily54.stress);
 assert.ok(work.finances.career.performance>50);
 assert.equal(validateDailySchedule(work.daily54),true);
});
test('休養型に切り替えると疲労・ストレスを回復できる',()=>{
 const state=simpleState('career');
 for(let m=1;m<=12;m++)advanceDailySchedule(state,{year:2022,month:m},25);
 const before=state.daily54.fatigue,stress=state.daily54.stress;
 state.daily54.planId='rest';for(let m=1;m<=6;m++)advanceDailySchedule(state,{year:2023,month:m},25);
 assert.ok(state.daily54.fatigue<before);assert.ok(state.daily54.stress<stress);
});
test('家事に集中すると成人後の生活費の請求が減り、未成年の負担はない',()=>{
 const state=simpleState('household');
 assert.equal(monthlyHouseholdDiscount(state,{year:2020,month:1},17),0);
 assert.equal(monthlyHouseholdDiscount(state,{year:2020,month:1},18),800);
 assert.equal(monthlyHouseholdDiscount(simpleState('balanced'),{year:2020,month:1},18),0);
});
test('交流型は対象人物1名だけにゆっくり作用する',()=>{
 const state=simpleState('social');
 state.people.push({name:'別の人',role:'友人',relationship:33});
 for(let m=1;m<=8;m++)advanceDailySchedule(state,{year:2020,month:m},20);
 assert.ok(state.people[0].relationship>50);
 assert.equal(state.people[1].relationship,33);
});
test('時間プランは通常の自由行動を省略する時間短縮でも毎月適用される',()=>{
 const g=playToAge(18);
 assert.equal(g.performAction('setTimePlan',{planId:'household'}).ok,true);
 const before=g.getState().daily54.monthsApplied;
 const result=g.fastForward({focus:'balanced',maxMonths:3});
 assert.equal(result.ok,true,result.reason);
 assert.ok(g.getState().daily54.monthsApplied>before);
 assert.equal(validateGameState(g.getState()),true);
});
test('画面はコンパクト・操作制限・レスポンシブ、公開に必要なファイルを含む',()=>{
 const html=read('index.html'),source=read('js/ui/dailySchedulePanel.js');
 assert.match(html,/phase54\.css/);assert.match(html,/第54段階/);
 assert.match(source,/daily54-select/);assert.match(source,/planId/);assert.match(source,/onAction/);
 assert.match(source,/pending\|\|used/);
 assert.match(read('package.json'),/"version": "5\.5\.0"/);
 assert.match(read('.github/workflows/pages.yml'),/npm test/);
 assert.match(read('README.md'),/STEP 54/);
});
