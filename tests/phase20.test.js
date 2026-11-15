import test from 'node:test';
import assert from 'node:assert/strict';
import {createEconomyData,economyAction,advanceEconomy} from '../js/core/economySystems.js';
import {createGameStore} from '../js/core/gameState.js';
import {validateGameState} from '../js/core/saveSystems.js';
const context={age:30,date:{year:2030,month:1},education:{}};
function setup(){const e=createEconomyData();e.cash=1000000;assert.equal(economyAction(e,'startBusiness',{},context).ok,true);return e;}
test('複数融資は独立した期限と契約番号を持つ',()=>{
 const e=setup();economyAction(e,'businessLoan',{amount:120000},context);
 const later={...context,date:{year:2031,month:2}};
 economyAction(e,'businessLoan',{amount:100000},later);
 assert.equal(e.business.loanContracts.length,2);
 assert.notEqual(e.business.loanContracts[0].dueIndex,e.business.loanContracts[1].dueIndex);
 assert.equal(e.business.loanContracts.reduce((a,c)=>a+c.principal,0),e.business.loanBalance);
});
test('返済は期限の早い契約から充当される',()=>{
 const e=setup();economyAction(e,'businessLoan',{amount:120000},context);
 economyAction(e,'businessLoan',{amount:100000},{...context,date:{year:2031,month:1}});
 assert.equal(economyAction(e,'repayBusinessLoan',{amount:130000},context).ok,true);
 assert.equal(e.business.loanContracts[0].principal,0);
 assert.equal(e.business.loanContracts[1].principal,90000);
 assert.equal(e.business.loanPaymentHistory.reduce((a,x)=>a+x.amount,0),130000);
});
test('自動返済も契約別に記録され元本整合性を維持する',()=>{
 const e=setup();economyAction(e,'businessLoan',{amount:100000},context);economyAction(e,'setLoanRepayment',{amount:10000},context);
 advanceEconomy(e,{year:2030,month:1},1,{year:2000,month:1});
 assert.equal(e.business.loanBalance,90000);
 assert.equal(e.business.loanPaymentHistory[0].kind,'自動返済');
});
test('個別設備売却はほかの設備を維持する',()=>{
 const e=setup();economyAction(e,'purchaseEquipment',{amount:100000},context);economyAction(e,'purchaseEquipment',{amount:50000},context);
 assert.equal(economyAction(e,'sellEquipmentItem',{id:1},context).ok,true);
 assert.equal(e.business.equipmentItems.length,1);assert.equal(e.business.equipmentValue,50000);
 assert.equal(economyAction(e,'sellEquipmentItem',{id:1},context).ok,false);
});
test('旧保存データは契約を補完し、契約残高改ざんは拒否する',()=>{
 const g=createGameStore();g.startNewGame();const old=structuredClone(g.getState());
 delete old.finances.business.loanContracts;delete old.finances.business.nextLoanId;delete old.finances.business.loanPaymentHistory;
 assert.equal(g.loadState(old).ok,true);
 const bad=structuredClone(g.getState());bad.finances.business.loanContracts=[{id:1,principal:100,original:100,borrowedIndex:0,dueIndex:0,overdueMonths:0,ratePermille:5}];
 assert.equal(validateGameState(bad),false);
});
