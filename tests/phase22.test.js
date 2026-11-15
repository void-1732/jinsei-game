import test from 'node:test';
import assert from 'node:assert/strict';
import {createEconomyData,economyAction,advanceEconomy} from '../js/core/economySystems.js';
import {createGameStore} from '../js/core/gameState.js';
import {validateGameState} from '../js/core/saveSystems.js';
const ctx={age:30,date:{year:2030,month:1},education:{}};
function setup(){const e=createEconomyData();e.cash=1000000;assert.equal(economyAction(e,'startBusiness',{},ctx).ok,true);assert.equal(economyAction(e,'purchaseEquipment',{amount:100000},ctx).ok,true);return e;}
test('設備点検は事業口座から費用を払い状態を回復する',()=>{
 const e=setup(),b=e.business,a=b.equipmentItems[0];a.condition=40;
 const cash=b.operatingCash,personal=e.cash;
 assert.equal(economyAction(e,'serviceEquipment',{id:a.id},ctx).ok,true);
 assert.equal(a.condition,65);assert.equal(b.operatingCash,cash-5000);assert.equal(e.cash,personal);
 assert.equal(b.businessLedger.at(-1).amount,-5000);
});
test('設備の故障・修理は状態と売上に連動する',()=>{
 const e=setup(),b=e.business,a=b.equipmentItems[0];a.condition=0;
 // 固定年月を利用した再現可能な故障判定
 for(let i=0;i<4&&!a.broken;i++)advanceEconomy(e,{year:2030,month:i+1},i+1,{phase:'通常'});
 assert.equal(a.broken,true);
 const cash=b.operatingCash;
 assert.equal(economyAction(e,'repairEquipment',{id:a.id},ctx).ok,true);
 assert.equal(a.broken,false);assert.equal(a.condition,80);assert.equal(b.operatingCash,cash-20000);
});
test('修理・点検の対象不正と資金不足を拒否する',()=>{
 const e=setup(),b=e.business,a=b.equipmentItems[0];
 assert.equal(economyAction(e,'repairEquipment',{id:a.id},ctx).ok,false);
 assert.equal(economyAction(e,'serviceEquipment',{id:99999},ctx).ok,false);
 b.operatingCash=0;
 assert.equal(economyAction(e,'serviceEquipment',{id:a.id},ctx).ok,false);
 assert.equal(a.condition,100);
});
test('旧保存データを補完し設備状態の異常値は拒否する',()=>{
 const store=createGameStore();store.startNewGame();
 const old=structuredClone(store.getState());
 assert.equal(store.loadState(old).ok,true);
 const invalid=structuredClone(store.getState());
 invalid.finances.business.equipmentItems=[{id:1,name:'標準設備',bookValue:100,originalValue:100,remainingMonths:100,condition:101}];
 invalid.finances.business.equipmentValue=100;
 assert.equal(validateGameState(invalid),false);
});
test('設備の月次劣化は再現可能で故障のない期間の従来処理と整合する',()=>{
 const a=setup(),b=structuredClone(a);
 advanceEconomy(a,{year:2030,month:1},1,{phase:'通常'});
 advanceEconomy(b,{year:2030,month:1},1,{phase:'通常'});
 assert.deepEqual(a.business.equipmentItems,b.business.equipmentItems);
 assert.equal(a.business.equipmentItems[0].condition,99);
});
