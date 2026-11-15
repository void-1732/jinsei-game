import test from 'node:test';
import assert from 'node:assert/strict';
import {createEconomyData,economyAction,advanceEconomy} from '../js/core/economySystems.js';
import {createGameStore} from '../js/core/gameState.js';
import {validateGameState} from '../js/core/saveSystems.js';
const ctx={age:30,date:{year:2030,month:1},education:{}};
function setup(){const e=createEconomyData();e.cash=1000000;assert.equal(economyAction(e,'startBusiness',{},ctx).ok,true);return e;}
test('融資の返済期限は借入から36か月後に設定される',()=>{const e=setup();assert.equal(economyAction(e,'businessLoan',{amount:100000},ctx).ok,true);assert.equal(e.business.loanDueIndex,2030*12+36);});
test('延滞すると信用評価が下がり、借入が制限される',()=>{const e=setup();economyAction(e,'businessLoan',{amount:200000},ctx);e.business.loanDueIndex=2030*12+1;e.business.monthlyRepayment=0;advanceEconomy(e,{year:2030,month:1},1,{year:2000,month:1});assert.equal(e.business.loanOverdueMonths,1);assert.equal(e.business.creditScore,67);assert.equal(economyAction(e,'businessLoan',{amount:10000},ctx).ok,false);});
test('延滞融資を条件変更すると期限が延長される',()=>{const e=setup();economyAction(e,'businessLoan',{amount:100000},ctx);e.business.loanOverdueMonths=2;assert.equal(economyAction(e,'restructureBusinessDebt',{},ctx).ok,true);assert.equal(e.business.loanOverdueMonths,0);assert.equal(e.business.loanDueIndex,2030*12+12);});
test('設備は個別台帳に登録され月次償却と残高が一致する',()=>{const e=setup();economyAction(e,'purchaseEquipment',{amount:100000},ctx);economyAction(e,'purchaseEquipment',{amount:50000},ctx);assert.equal(e.business.equipmentItems.length,2);advanceEconomy(e,{year:2030,month:1},1,{year:2000,month:1});assert.equal(e.business.equipmentItems[0].bookValue,99000);assert.equal(e.business.equipmentValue,148500);});
test('旧セーブは追加項目を補完し異常な信用点を拒否する',()=>{const g=createGameStore();g.startNewGame();const old=structuredClone(g.getState());for(const k of ['loanDueIndex','loanOverdueMonths','creditScore','equipmentItems','nextEquipmentId'])delete old.finances.business[k];assert.equal(g.loadState(old).ok,true);assert.equal(g.getState().finances.business.creditScore,70);const bad=structuredClone(g.getState());bad.finances.business.creditScore=110;assert.equal(validateGameState(bad),false);});
