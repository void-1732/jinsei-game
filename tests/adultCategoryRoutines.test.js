import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGameStore} from '../js/core/gameState.js';
import {validateGameState,createSaveRepository} from '../js/core/saveSystems.js';
import {actionBudget,categoryActionAvailable,turnActionCategory} from '../js/core/adultActionBudget.js';
import {MONTHLY_PLANS,ONE_OFF_ACTIVITIES,setMonthlyRoutine,advanceMonthlyRoutines,validateMonthlyRoutines} from '../js/core/monthlyRoutines.js';

function adult(){
 const g=createGameStore({interactiveChoices:true});
 assert.equal(g.startNewGame().ok,true);
 const s=structuredClone(g.getState());
 s.pendingEvents=[];
 s.timeline={year:2026,month:5,ageYears:26,turnsElapsed:101,monthsElapsed:316};
 s.turnActions={turn:101,used:0,lastAction:null,categories:[]};
 s.finances.cash=300000;
 assert.equal(validateGameState(s),true);
 assert.equal(g.loadState(s).ok,true);
 return g;
}
test('18歳以降、異なる3カテゴリの自由行動をそれぞれ1回だけ行える',()=>{
 const g=adult();
 assert.equal(actionBudget(g.getState()).limit,3);
 assert.equal(g.performAction('habit',{habit:'運動'}).ok,true);
 assert.equal(g.performAction('habit',{habit:'休養'}).ok,false,'同じ健康カテゴリは再行動できない');
 const person=g.getState().people.find(p=>p.role==='母'||p.role==='父');
 assert.equal(g.performAction('socialize',{personId:person.id}).ok,true);
 assert.equal(g.performAction('setBudget',{amount:70000}).ok,true);
 const budget=actionBudget(g.getState());
 assert.equal(budget.remaining,0);
 assert.deepEqual(budget.categories,['健康','人物・家族','生活・資産']);
 assert.equal(g.performAction('skill',{skill:'パソコン'}).ok,false);
 assert.equal(validateGameState(g.getState()),true);
});
test('カテゴリが空いていても4回目は不可、失敗は回数を消費しない',()=>{
 const g=adult();
 const wrong=g.performAction('adultActivity',{id:'not-exist'});
 assert.equal(wrong.ok,false);assert.equal(actionBudget(g.getState()).remaining,3);
 const spending=g.performAction('adultActivity',{id:'online-course'});
 assert.equal(spending.ok,true);
 assert.equal(g.performAction('skill',{skill:'読書'}).ok,false);
 assert.equal(g.performAction('adultActivity',{id:'family-dinner'}).ok,true);
 assert.equal(g.performAction('adultActivity',{id:'gym-class'}).ok,true);
 assert.equal(g.performAction('setTimePlan',{planId:'rest'}).ok,false);
 assert.equal(actionBudget(g.getState()).remaining,0);
});
test('カテゴリ分類は健康、友人、学業、住まい、仕事、社会に重複せず対応',()=>{
 assert.equal(turnActionCategory('skill',{skill:'運動'}),'健康');
 assert.equal(turnActionCategory('skill',{skill:'読書'}),'学業');
 assert.equal(turnActionCategory('safetyPrep',{area:'health'}),'健康');
 assert.equal(turnActionCategory('safetyPrep',{area:'security'}),'生活・資産');
 assert.equal(turnActionCategory('setMonthlyRoutine',{domain:'relationships'}),'人物・家族');
 assert.equal(turnActionCategory('buyProperty',{}),'生活・資産');
 assert.equal(turnActionCategory('adultActivity',{id:'job-networking'}),'仕事・経営');
 assert.equal(ONE_OFF_ACTIVITIES.length,8);
});
test('成年前の1ターン1回は維持される',()=>{
 const g=createGameStore({interactiveChoices:true});
 g.startNewGame();let s=structuredClone(g.getState());s.pendingEvents=[];
 assert.equal(g.loadState(s).ok,true);
 assert.equal(actionBudget(g.getState()).limit,1);
 assert.equal(g.performAction('skill',{skill:'読書'}).ok,true);
 assert.equal(g.performAction('habit',{habit:'運動'}).ok,false);
 assert.equal(validateGameState(g.getState()),true);
});
test('継続習慣は選択したカテゴリ枠だけ消費、次月から自動で続く',()=>{
 const g=adult();
 const state=structuredClone(g.getState()),person=state.people.find(p=>p.role==='配偶者')??state.people.find(p=>p.role==='子')??state.people.find(p=>p.role==='母'||p.role==='父');
 assert.equal(g.performAction('setMonthlyRoutine',{domain:'health',planId:'walks'}).ok,true);
 assert.equal(g.performAction('setMonthlyRoutine',{domain:'health',planId:'gym'}).ok,false);
 assert.equal(g.performAction('setMonthlyRoutine',{domain:'relationships',planId:'call'}).ok,true);
 assert.equal(g.performAction('setMonthlyRoutine',{domain:'learning',planId:'reading'}).ok,true);
 assert.equal(actionBudget(g.getState()).remaining,0);
 const snapshot=structuredClone(g.getState()),before=snapshot.finances.cash;
 const prior=person.relationship,oldHealth=snapshot.health.physical;
 assert.equal(advanceMonthlyRoutines(snapshot,{year:2026,month:6},26).applied,true);
 assert.equal(snapshot.finances.cash,before-3500);
 assert.ok(snapshot.health.physical>=oldHealth);
 assert.equal(snapshot.people.find(p=>p.id===person.id).relationship,Math.min(100,prior+1));
 assert.equal(advanceMonthlyRoutines(snapshot,{year:2026,month:6},26).applied,false);
 assert.equal(snapshot.finances.cash,before-3500);
 assert.equal(validateMonthlyRoutines(snapshot.monthlyRoutines),true);
});
test('資金がなければ毎月の会費は発生せず継続プランを保持する',()=>{
 const s=structuredClone(adult().getState());
 s.monthlyRoutines.plans.health='gym';
 s.finances.cash=500;
 const before=s.health.physical;
 const r=advanceMonthlyRoutines(s,{year:2026,month:6},26);
 assert.equal(r.applied,true);
 assert.equal(s.finances.cash,500);
 assert.equal(s.health.physical,before);
 assert.equal(s.monthlyRoutines.plans.health,'gym');
 assert.match(s.monthlyRoutines.lastResults[0],/資金不足/);
});
test('旧セーブの単発行動を復元しても残り回数は破損せず、継続習慣なしで開始',()=>{
 const g=adult(),old=structuredClone(g.getState());
 old.turnActions={turn:101,used:1,lastAction:'skill'};
 delete old.monthlyRoutines;
 assert.equal(validateGameState(old),true);
 assert.equal(g.loadState(old).ok,true);
 assert.equal(actionBudget(g.getState()).remaining,2);
 assert.deepEqual(g.getState().turnActions.categories,['以前の行動']);
 assert.equal(g.getState().monthlyRoutines.plans.health,'off');
 assert.equal(validateGameState(g.getState()),true);
});
test('繰り返しプランの不正な金額・種類・履歴は保存時に拒否',()=>{
 const g=adult(),s=structuredClone(g.getState());
 s.monthlyRoutines.plans.health='invalid';
 assert.equal(validateGameState(s),false);
 s.monthlyRoutines.plans.health='off';s.turnActions.used=3;s.turnActions.categories=['健康','健康','学業'];
 assert.equal(validateGameState(s),false);
 s.turnActions.used=0;s.turnActions.categories=[];s.monthlyRoutines.totalSpent=-1;
 assert.equal(validateGameState(s),false);
});
test('3か月の継続設定はロード・セーブ後も再現され、二重請求しない',()=>{
 const g=adult();
 assert.equal(g.performAction('setMonthlyRoutine',{domain:'health',planId:'walks'}).ok,true);
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const repo=createSaveRepository(storage);
 assert.equal(repo.save('手動保存1',g.getState()).ok,true);
 const restored=createGameStore({interactiveChoices:true});
 assert.equal(restored.loadState(repo.load('手動保存1').state).ok,true);
 const s=structuredClone(restored.getState());
 const initial=s.finances.cash;
 for(let m=6;m<=8;m++)assert.equal(advanceMonthlyRoutines(s,{year:2026,month:m},26).applied,true);
 assert.equal(s.finances.cash,initial-3000);
 assert.equal(advanceMonthlyRoutines(s,{year:2026,month:8},26).applied,false);
 assert.equal(validateGameState(s),true);
});
test('18歳以降の自由行動表示はボタンとカテゴリ別残数に対応',()=>{
 const paths=['js/ui/turnActivities.js','js/ui/topicPage.js','js/ui/categoryDock.js','js/ui/monthlyRoutinePanel.js','js/ui/screenRenderer.js'];
 const src=Object.fromEntries(paths.map(p=>[p,readFileSync(new URL('../'+p,import.meta.url),'utf8')]));
 assert.match(src[paths[0]],/choiceButtons/);
 assert.match(src[paths[1]],/budget\.remaining/);
 assert.match(src[paths[2]],/hasFreeAction\(gameState,group\.category\)/);
 assert.match(src[paths[3]],/MONTHLY_PLANS/);
 assert.match(src[paths[4]],/categoryActionAvailable/);
});
