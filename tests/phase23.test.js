import test from 'node:test';
import assert from 'node:assert/strict';
import {createEconomyData,economyAction,advanceEconomy} from '../js/core/economySystems.js';
import {createGameStore} from '../js/core/gameState.js';
import {validateGameState} from '../js/core/saveSystems.js';
const ctx={age:30,date:{year:2030,month:1},education:{}};
function setup(){const e=createEconomyData();e.cash=1000000;assert.equal(economyAction(e,'startBusiness',{},ctx).ok,true);assert.equal(economyAction(e,'purchaseEquipment',{amount:100000},ctx).ok,true);return e;}
test('保守契約の加入と月額費用は事業口座のみから精算する',()=>{
 const e=setup(),b=e.business,id=b.equipmentItems[0].id,personal=e.cash;
 assert.equal(economyAction(e,'toggleEquipmentMaintenance',{id},ctx).ok,true);
 const cash=b.operatingCash;advanceEconomy(e,{year:2030,month:1},1,{phase:'通常'});
 assert.ok(b.businessLedger.some(x=>x.label.includes('月額保守費')&&x.amount===-2000));
 assert.equal(e.cash,personal-85000);assert.equal(b.equipmentItems[0].maintenance,true);
 assert.equal(economyAction(e,'toggleEquipmentMaintenance',{id},ctx).ok,true);
 assert.equal(b.equipmentItems[0].maintenance,false);
});
test('修理依頼は資金を引き落とし翌月に復旧する',()=>{
 const e=setup(),b=e.business,item=b.equipmentItems[0];item.broken=true;item.condition=10;
 const cash=b.operatingCash;
 assert.equal(economyAction(e,'scheduleEquipmentRepair',{id:item.id},ctx).ok,true);
 assert.equal(item.broken,true);assert.equal(item.repairMonths,1);assert.equal(b.operatingCash,cash-20000);
 assert.equal(economyAction(e,'scheduleEquipmentRepair',{id:item.id},ctx).ok,false);
 advanceEconomy(e,{year:2030,month:1},1,{phase:'通常'});
 assert.equal(item.broken,false);assert.equal(item.repairMonths,0);assert.ok(item.condition>=79);
});
test('設備買い替えは残高・台帳・設備価額を整合させる',()=>{
 const e=setup(),b=e.business,old=b.equipmentItems[0];const previous=b.operatingCash;
 assert.equal(economyAction(e,'replaceEquipment',{id:old.id,amount:120000,type:'製造機械'},ctx).ok,true);
 assert.equal(b.equipmentItems.length,1);assert.equal(b.equipmentItems[0].type,'製造機械');
 assert.equal(b.equipmentItems[0].remainingMonths,120);assert.equal(b.equipmentValue,120000);
 assert.equal(b.operatingCash,previous+70000-120000);
 assert.equal(b.businessLedger.at(-1).amount,-120000);
});
test('不正な買い替えと資金不足は状態を変更しない',()=>{
 const e=setup(),b=e.business,id=b.equipmentItems[0].id;
 const before=structuredClone(b);
 assert.equal(economyAction(e,'replaceEquipment',{id,amount:999999},ctx).ok,false);
 assert.equal(economyAction(e,'replaceEquipment',{id:9999,amount:10000},ctx).ok,false);
 assert.equal(economyAction(e,'replaceEquipment',{id,amount:10000,type:'存在しない設備'},ctx).ok,false);
 assert.deepEqual(b,before);
 b.equipmentItems[0].broken=true;b.operatingCash=0;
 assert.equal(economyAction(e,'scheduleEquipmentRepair',{id},ctx).ok,false);
});
test('設備の種類別劣化と生産性は同じ入力で再現可能',()=>{
 const a=setup(), b=structuredClone(a);
 advanceEconomy(a,{year:2030,month:1},1,{phase:'通常'});
 advanceEconomy(b,{year:2030,month:1},1,{phase:'通常'});
 assert.deepEqual(a.business.cashFlowHistory,b.business.cashFlowHistory);
 assert.ok(a.business.cashFlowHistory[0].productivity>=100);
 assert.ok(a.business.cashFlowHistory[0].workingEquipment>=0);
});
test('旧データを読み込み、新規フィールド異常を拒否する',()=>{
 const store=createGameStore();store.startNewGame();const old=structuredClone(store.getState());
 old.finances.business.equipmentItems=[{id:1,name:'標準設備1',type:'標準設備',bookValue:10000,originalValue:10000,remainingMonths:100,usefulMonths:100,elapsedMonths:0,condition:100,broken:false,serviceCount:0}];
 old.finances.business.equipmentValue=10000;
 assert.equal(store.loadState(old).ok,true);
 const restored=store.getState().finances.business.equipmentItems[0];
 assert.equal(restored.maintenance,false);assert.equal(restored.repairMonths,0);
 const bad=structuredClone(store.getState());bad.finances.business.equipmentItems[0].repairMonths=-1;
 assert.equal(validateGameState(bad),false);
});
