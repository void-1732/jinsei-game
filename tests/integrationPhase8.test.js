import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameStore} from '../js/core/gameState.js';
import {createSaveRepository,validateGameState} from '../js/core/saveSystems.js';
import {screenGroups} from '../js/core/screenCatalog.js';
const memory=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k),map};};
test('既存61画面は9カテゴリに所属し画面IDの重複がない',()=>{
 const ids=screenGroups.flatMap(g=>g.screens.map(s=>s.id));
 assert.equal(screenGroups.length,9);assert.equal(ids.length,61);assert.equal(new Set(ids).size,61);
});
test('保存データは金銭・健康の非有限値と暦の不整合を拒否する',()=>{
 const g=createGameStore();g.startNewGame();const base=g.getState();
 for(const mutation of [s=>s.finances.cash=Infinity,s=>s.finances.debt=-1,s=>s.health.energy=NaN,s=>s.timeline.monthsElapsed=42,s=>s.timeline.ageYears=25]){
  const state=structuredClone(base);mutation(state);assert.equal(validateGameState(state),false);
 }
});
test('連続操作で履歴上限を超えても保存できる',()=>{
 const g=createGameStore();g.startNewGame();for(let i=0;i<1220;i++)assert.equal(g.performAction('skill',{skill:'読書'}).ok,true);
 assert.equal(g.getState().eventHistory.length,1200);
 const repo=createSaveRepository(memory());assert.equal(repo.save('自動保存',g.getState()).ok,true);
});
test('人生開始から死亡までの月次処理と保存復元を検証する',()=>{
 const g=createGameStore();g.startNewGame({name:'長期テスト',seed:19});
 const repository=createSaveRepository(memory());let previousMonth=0,checked=0;
 while(!g.getState().ending.dead && checked<1500){
  const before=g.getState(),result=g.advanceTurn();assert.equal(result.ok,true);
  const after=g.getState();const diff=after.timeline.monthsElapsed-before.timeline.monthsElapsed;
  assert.equal(diff,before.timeline.ageYears<15?3:1);
  assert.equal(after.timeline.monthsElapsed,(after.timeline.year-2000)*12+after.timeline.month-1);
  assert.ok(after.timeline.monthsElapsed>previousMonth);previousMonth=after.timeline.monthsElapsed;
  if(++checked%100===0){assert.equal(repository.save('手動保存2',after).ok,true);const replay=createGameStore();assert.equal(replay.loadState(repository.load('手動保存2').state).ok,true);assert.deepEqual(replay.getState(),after);}
 }
 assert.ok(checked<1500,'死亡判定まで到達');assert.equal(g.getState().ending.dead,true);
 assert.equal(repository.save('人生記録',g.getState()).ok,true);
 assert.equal(g.advanceTurn().ok,false);
});
