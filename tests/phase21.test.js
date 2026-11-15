import test from 'node:test';
import assert from 'node:assert/strict';
import {createEconomyData,economyAction,advanceEconomy,projectLoanSchedule,EQUIPMENT_TYPES} from '../js/core/economySystems.js';
import {createGameStore} from '../js/core/gameState.js';
import {validateGameState} from '../js/core/saveSystems.js';
const context={age:30,date:{year:2030,month:1},education:{}};
const create=()=>{const e=createEconomyData();e.cash=1000000;assert.equal(economyAction(e,'startBusiness',{},context).ok,true);return e;};
test('契約別の返済計画と月次返済の実績が一致する',()=>{
 const e=create();economyAction(e,'businessLoan',{amount:120000},context);
 economyAction(e,'businessLoan',{amount:100000},context);
 assert.equal(economyAction(e,'setContractRepayment',{id:1,amount:20000},context).ok,true);
 assert.equal(economyAction(e,'setContractRepayment',{id:2,amount:10000},context).ok,true);
 const rows=projectLoanSchedule(e.business,context.date,1);
 assert.deepEqual(rows.map(x=>x.principal),[20000,10000]);
 const initial=e.business.loanBalance;
 advanceEconomy(e,context.date,1,{year:2000,month:1});
 assert.equal(initial-e.business.loanBalance,30000);
 assert.equal(e.business.loanPaymentHistory.reduce((a,x)=>a+x.amount,0),30000);
 assert.equal(e.business.loanContracts[0].monthlyTarget,20000);
});
test('返済予定表は参照専用で契約の実データを更新しない',()=>{
 const e=create();economyAction(e,'businessLoan',{amount:50000},context);
 economyAction(e,'setContractRepayment',{id:1,amount:20000},context);
 const before=structuredClone(e.business.loanContracts);
 const result=projectLoanSchedule(e.business,context.date,12);
 assert.equal(result[2].principal,10000);
 assert.equal(result[3],undefined);
 assert.deepEqual(e.business.loanContracts,before);
});
test('標準設備の旧償却を保ちつつ種別・耐用月数が変化する',()=>{
 const e=create();assert.equal(EQUIPMENT_TYPES['標準設備'],100);
 assert.equal(economyAction(e,'purchaseEquipment',{amount:100000,type:'車両'},context).ok,true);
 const asset=e.business.equipmentItems[0];assert.equal(asset.remainingMonths,72);
 advanceEconomy(e,context.date,1,{year:2000,month:1});
 assert.equal(asset.elapsedMonths,1);assert.equal(asset.bookValue,98611);
 const expected=Math.floor(asset.bookValue*.7*(1-.3/72));
 assert.equal(economyAction(e,'sellEquipmentItem',{id:asset.id},context).ok,true);
 assert.equal(e.business.businessLedger.at(-1).amount,expected);
});
test('不正な設備指定・返済予定は状態を変更しない',()=>{
 const e=create();const before=structuredClone(e.business);
 assert.equal(economyAction(e,'purchaseEquipment',{amount:100000,type:'不明'},context).ok,false);
 assert.equal(e.business.operatingCash,before.operatingCash);
 assert.equal(e.business.equipmentValue,before.equipmentValue);
 assert.equal(economyAction(e,'setContractRepayment',{id:1,amount:-1},context).ok,false);
});
test('第20段階の保存データと新しい契約・設備データの検証',()=>{
 const store=createGameStore();store.startNewGame();
 const old=structuredClone(store.getState());
 assert.equal(store.loadState(old).ok,true);
 const bad=structuredClone(store.getState());
 bad.finances.business.loanContracts=[{id:1,principal:100,original:100,borrowedIndex:0,dueIndex:0,overdueMonths:0,ratePermille:5,monthlyTarget:-1}];
 bad.finances.business.loanBalance=100;
 assert.equal(validateGameState(bad),false);
 const badAsset=structuredClone(store.getState());
 badAsset.finances.business.equipmentItems=[{id:1,name:'設備',bookValue:1000,originalValue:1000,remainingMonths:60,type:'不明'}];
 badAsset.finances.business.equipmentValue=1000;
 assert.equal(validateGameState(badAsset),false);
});
test('月次返済予定と実績の差額が資金不足時にも残る',()=>{
 const e=create();economyAction(e,'businessLoan',{amount:100000},context);
 economyAction(e,'setContractRepayment',{id:1,amount:20000},context);
 e.business.operatingCash=1000;
 advanceEconomy(e,context.date,1,{year:2000,month:1});
 const row=e.business.loanScheduleHistory[0];
 assert.equal(row.planned,20000);
 assert.ok(row.actual>=0&&row.actual<row.planned);
 assert.equal(e.business.loanPaymentHistory.reduce((a,x)=>a+x.amount,0),row.actual);
});
