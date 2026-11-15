import test from 'node:test';
import assert from 'node:assert/strict';
import {createEconomyData,economyAction,estimateEquipmentReturns,advanceEconomy} from '../js/core/economySystems.js';
import {createGameStore} from '../js/core/gameState.js';
import {validateGameState} from '../js/core/saveSystems.js';
const ctx={age:30,date:{year:2030,month:1},education:{}};
function fixture(){const e=createEconomyData();e.cash=1000000;assert.equal(economyAction(e,'startBusiness',{},ctx).ok,true);assert.equal(economyAction(e,'purchaseEquipment',{amount:100000,type:'標準設備'},ctx).ok,true);return e;}
test('第24段階：未設立・設備なしの試算は空',()=>{assert.deepEqual(estimateEquipmentReturns(createEconomyData().business),[]);const e=fixture();e.business.equipmentItems=[];assert.deepEqual(estimateEquipmentReturns(e.business),[]);});
test('第24段階：設備の参考試算は決定的で、元データを変更しない',()=>{const e=fixture();const before=structuredClone(e.business);const a=estimateEquipmentReturns(e.business);assert.deepEqual(a,estimateEquipmentReturns(e.business));assert.deepEqual(e.business,before);assert.equal(a.length,1);assert.ok(a[0].monthlyContribution>0);assert.ok(a[0].estimatedRecoveryMonths>0);});
test('第24段階：保守契約は毎月の差額に反映',()=>{const e=fixture();const base=estimateEquipmentReturns(e.business)[0];assert.equal(economyAction(e,'toggleEquipmentMaintenance',{id:e.business.equipmentItems[0].id},ctx).ok,true);const now=estimateEquipmentReturns(e.business)[0];assert.equal(now.monthlyMaintenance,2000);assert.equal(now.monthlyNet,base.monthlyNet-2000);});
test('第24段階：故障と修理中は追加売上寄与を見込まない',()=>{const e=fixture(),item=e.business.equipmentItems[0];item.broken=true;assert.equal(estimateEquipmentReturns(e.business)[0].monthlyContribution,0);item.repairMonths=1;assert.equal(estimateEquipmentReturns(e.business)[0].status,'修理中');});
test('第24段階：24か月進行後も試算と旧セーブ構造が有効',()=>{const e=fixture();advanceEconomy(e,{year:2030,month:1},24,{year:2000,month:1},{phase:'通常'});const a=estimateEquipmentReturns(e.business);assert.ok(a[0].monthlyNet<=100000000);const store=createGameStore();store.startNewGame();assert.equal(validateGameState(store.getState()),true);});
