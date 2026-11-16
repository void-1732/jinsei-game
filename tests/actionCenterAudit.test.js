import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createGameStore} from '../js/core/gameState.js';
import {turnActionCategory,categoryActionAvailable,actionBudget,ACTION_CATEGORIES} from '../js/core/adultActionBudget.js';
import {isBusinessOperation} from '../js/core/businessOperations.js';
import {availableCenterOptions} from '../js/ui/actionCenter.js';
import {validateGameState} from '../js/core/saveSystems.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const dispatched=()=>{
 const source=read('js/core/gameState.js');
 const fragment=source.slice(source.indexOf('switch(action){'),source.indexOf('    if(result.ok){',source.indexOf('switch(action){')));
 return new Set([...fragment.matchAll(/case '([^']+)'/g)].map(x=>x[1]));
};
test('ゲームストアの全91操作がカテゴリ・事業管理・重要イベントのいずれかに登録されている',()=>{
 const actions=dispatched();
 assert.ok(actions.size>=90,'dispatch registry unexpectedly shrank');
 const exceptions=new Set(['resolveChoice']);
 for(const action of actions){
  if(exceptions.has(action)||isBusinessOperation(action))continue;
  const payload=action==='setMonthlyRoutine'?{domain:'health'}:action==='adultActivity'?{id:'gym-class'}:{};
  assert.ok(ACTION_CATEGORIES.includes(turnActionCategory(action,payload)),`操作が分類されていません: ${action}`);
 }
 assert.equal(isBusinessOperation('restartBusiness'),true);
 assert.equal(isBusinessOperation('serviceEquipment'),true);
 assert.equal(turnActionCategory('sideJob'),'仕事・経営');
 assert.equal(turnActionCategory('resign'),'仕事・経営');
 assert.equal(turnActionCategory('repayMortgage'),'生活・資産');
});
test('各画面から発火する操作ボタンに未対応・未分類アクションがない',()=>{
 const names=readdirSync(new URL('../js/ui/',import.meta.url)).filter(x=>x.endsWith('.js'));
 const dispatch=dispatched();
 for(const name of names){
  const src=read('js/ui/'+name);
  const matches=[...src.matchAll(/(?:handlers\.onAction\?|onAction\?|onAction|performAction)\s*\(\s*['"]([^'"]+)['"]/g)];
  for(const match of matches){
   const action=match[1];
   assert.ok(dispatch.has(action)||action==='setLifeDream',`未対応ボタン: ${name} ${action}`);
   if(action==='setLifeDream'||action==='resolveChoice')continue;
   const payload=action==='setMonthlyRoutine'?{domain:'health'}:action==='adultActivity'?{id:'gym-class'}:{};
   assert.ok(isBusinessOperation(action)||ACTION_CATEGORIES.includes(turnActionCategory(action,payload)),
    `未分類ボタン: ${name} ${action}`);
  }
 }
});
function adultFixture(){
 const g=createGameStore({interactiveChoices:true});g.startNewGame();
 const state=structuredClone(g.getState());
 state.pendingEvents=[];
 state.timeline={year:2026,month:5,ageYears:26,turnsElapsed:101,monthsElapsed:316};
 state.turnActions={turn:101,used:0,lastAction:null,categories:[]};
 state.finances.cash=300000;
 assert.equal(validateGameState(state),true);
 assert.equal(g.loadState(state).ok,true);
 return g;
}
test('共通行動画面の候補は各カテゴリに正しく登録され、7カテゴリすべてに詳細導線がある',()=>{
 const g=adultFixture(),state=g.getState();
 const categories=new Set();
 for(const category of ACTION_CATEGORIES){
  const actions=availableCenterOptions(state,category);
  for(const action of actions){
   assert.equal(turnActionCategory(action.action,action.payload),category);
   assert.ok(!categories.has(action.action+JSON.stringify(action.payload)),`候補が二重に出現: ${action.action}`);
   categories.add(action.action+JSON.stringify(action.payload));
  }
 }
 assert.equal(ACTION_CATEGORIES.length,7);
 assert.ok(availableCenterOptions(state,'生活・資産').length>0);
 assert.ok(availableCenterOptions(state,'健康').length>0);
 assert.ok(availableCenterOptions(state,'人物・家族').length>0);
 assert.ok(availableCenterOptions(state,'学業').length>0);
});
test('3回消費後の選択・表示状態と失敗時の枠保持、セーブ互換性',()=>{
 const g=adultFixture();
 const fail=g.performAction('adultActivity',{id:'invalid'});
 assert.equal(fail.ok,false);
 assert.equal(actionBudget(g.getState()).remaining,3);
 assert.equal(g.performAction('adultActivity',{id:'gym-class'}).ok,true);
 assert.equal(categoryActionAvailable(g.getState(),'健康'),false);
 assert.equal(g.performAction('adultActivity',{id:'family-dinner'}).ok,true);
 assert.equal(g.performAction('adultActivity',{id:'online-course'}).ok,true);
 assert.equal(actionBudget(g.getState()).remaining,0);
 assert.equal(g.performAction('adultActivity',{id:'medical-screening'}).ok,false);
 assert.equal(validateGameState(g.getState()),true);
});
test('自由行動が完了しても詳細画面の選択・ナビゲーションを一律に無効化しない',()=>{
 const renderer=read('js/ui/screenRenderer.js');
 assert.ok(!renderer.includes("querySelectorAll('button:not([disabled])')"));
 assert.ok(!renderer.includes("actionButton.disabled=true"));
 const hub=read('js/ui/playDashboard.js'),topic=read('js/ui/topicPage.js');
 assert.ok(hub.includes('onOpenActionCenter'));
 assert.ok(topic.includes('onOpenActionCenter'));
 assert.ok(!hub.includes('root.append(renderTurnActivity('));
 assert.ok(topic.includes('const actions=null;'));
 const app=read('js/app.js');
 assert.ok(app.includes("$('#open-action-center').addEventListener('click',openActionCenter)"));
});
