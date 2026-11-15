import test from 'node:test';
import assert from 'node:assert/strict';
import {createEconomyData,economyAction,advanceEconomy,netWorth} from '../js/core/economySystems.js';
import {createGameStore} from '../js/core/gameState.js';
import {validateGameState} from '../js/core/saveSystems.js';
const ctx={age:30,date:{year:2030,month:1},education:{}};
function setup(){const e=createEconomyData();e.cash=1000000;assert.equal(economyAction(e,'startBusiness',{},ctx).ok,true);return e;}
test('融資審査は事業未払金が過大な場合に借入を拒否する',()=>{
 const e=setup();e.business.operatingDebt=600000;
 assert.equal(economyAction(e,'businessLoan',{amount:100000},ctx).ok,false);
 assert.equal(e.business.loanBalance,0);
});
test('返済計画は明示設定した場合だけ自動実行する',()=>{
 const e=setup();economyAction(e,'businessLoan',{amount:120000},ctx);
 assert.equal(economyAction(e,'setLoanRepayment',{amount:30000},ctx).ok,true);
 advanceEconomy(e,{year:2030,month:1},1,{year:2000,month:1});
 assert.equal(e.business.loanBalance,90000);
 assert.equal(e.business.monthlyRepayment,30000);
 assert.ok(e.business.businessLedger.some(x=>x.label==='計画による融資元本返済'));
});
test('設備は月次償却され、非現金費用として純資産が減少する',()=>{
 const e=setup();economyAction(e,'purchaseEquipment',{amount:100000},ctx);
 const before=netWorth(e);
 advanceEconomy(e,{year:2030,month:1},1,{year:2000,month:1});
 assert.equal(e.business.equipmentValue,99000);
 assert.equal(e.business.equipmentDepreciation,1000);
 assert.equal(e.business.businessLedger.some(x=>x.label.includes('減価償却')),true);
 assert.ok(netWorth(e)<before+70000);
});
test('事業未払金の精算は個人口座に影響を与えない',()=>{
 const e=setup(),cash=e.cash;e.business.operatingDebt=60000;
 assert.equal(economyAction(e,'settleBusinessPayable',{amount:20000},ctx).ok,true);
 assert.equal(e.business.operatingDebt,40000);assert.equal(e.cash,cash);
 assert.equal(economyAction(e,'settleBusinessPayable',{amount:50000},ctx).ok,false);
});
test('旧保存データには新フィールドを補完し不正な計画値を拒否する',()=>{
 const store=createGameStore();store.startNewGame();const old=structuredClone(store.getState());
 for(const key of ['monthlyRepayment','equipmentDepreciation','loanApplications'])delete old.finances.business[key];
 assert.equal(validateGameState(old),true);assert.equal(store.loadState(old).ok,true);
 assert.equal(store.getState().finances.business.monthlyRepayment,0);
 const broken=structuredClone(store.getState());broken.finances.business.monthlyRepayment=-1;
 assert.equal(validateGameState(broken),false);
});
