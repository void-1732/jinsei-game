import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameStore} from '../js/core/gameState.js';
import {createSaveRepository, validateGameState} from '../js/core/saveSystems.js';
function storage(){const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k),map};}
test('開始前・開始後の保存データを検証できる',()=>{
 const store=createGameStore();assert.equal(validateGameState(store.getState()),true);
 store.startNewGame({name:'花子',seed:7});store.advanceTurn();assert.equal(validateGameState(store.getState()),true);
});
test('手動保存・読込で乱数状態とイベント履歴も再現する',()=>{
 const repo=createSaveRepository(storage());const a=createGameStore();a.startNewGame({seed:100});for(let i=0;i<20;i++)a.advanceTurn();
 assert.equal(repo.save('手動保存1',a.getState()).ok,true);const b=createGameStore();assert.equal(b.loadState(repo.load('手動保存1').state).ok,true);
 assert.deepEqual(a.getState(),b.getState());for(let i=0;i<10;i++){a.advanceTurn();b.advanceTurn();}assert.deepEqual(a.getState(),b.getState());
});
test('壊れた現行データから予備に復旧する',()=>{
 const s=storage(),repo=createSaveRepository(s),g=createGameStore();g.startNewGame();repo.save('自動保存',g.getState());g.advanceTurn();repo.save('自動保存',g.getState());
 s.setItem('gls:v7:自動保存','破損');const loaded=repo.load('自動保存');assert.equal(loaded.ok,true);assert.equal(loaded.recovered,true);assert.equal(loaded.state.timeline.turnsElapsed,0);
});
test('壊れた保存枠と異なるスキーマを拒否する',()=>{
 const s=storage(),repo=createSaveRepository(s);s.setItem('gls:v7:手動保存1','破損');assert.equal(repo.load('手動保存1').ok,false);
 const g=createGameStore();g.startNewGame();const old=structuredClone(g.getState());old.schemaVersion=5;assert.equal(repo.save('手動保存1',old).ok,false);
 assert.equal(g.loadState(old).ok,false);assert.equal(g.getState().initialized,true);
});
test('40歳未満では死亡しない・寿命終了後は進行停止',()=>{
 const g=createGameStore();g.startNewGame({seed:1});while(g.getState().timeline.ageYears<40)g.advanceTurn();
 assert.equal(g.getState().ending.dead,false);
 let tries=0;while(!g.getState().ending.dead && tries++<900)g.advanceTurn();
 const e=g.getState().ending;assert.equal(e.dead,true);assert.ok(e.date.age>=40);assert.ok(e.date.age<=110);
 assert.ok(e.inheritance.netAssets>=0);assert.equal(g.advanceTurn().ok,false);assert.equal(g.performAction('skill',{skill:'読書'}).ok,false);
 assert.equal(validateGameState(g.getState()),true);
});
test('死亡後データも保存でき、新しい人生を開始できる',()=>{
 const g=createGameStore();g.startNewGame({seed:2});let i=0;while(!g.getState().ending.dead && i++<1200)g.advanceTurn();
 const repo=createSaveRepository(storage());assert.equal(repo.save('人生記録',g.getState()).ok,true);
 assert.equal(g.restart().ok,true);assert.equal(g.getState().initialized,false);assert.equal(g.startNewGame({name:'次の世代'}).ok,true);
 assert.equal(repo.load('人生記録').state.ending.dead,true);
});
test('保存先削除で自動復旧しない',()=>{
 const repo=createSaveRepository(storage()),g=createGameStore();g.startNewGame();repo.save('自動保存',g.getState());repo.clear('自動保存');assert.equal(repo.load('自動保存').ok,false);
});
