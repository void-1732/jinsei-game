import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameStore} from '../js/core/gameState.js';
import {createEconomyData,economyAction,advanceEconomy,netWorth} from '../js/core/economySystems.js';
function goToAge(store,age){while(store.getState().timeline.ageYears<age)store.advanceTurn();}
test('初期残高、未成年の保護者負担、年齢制限',()=>{
 const g=createGameStore();g.startNewGame();assert.equal(g.getState().finances.cash,0);
 assert.equal(g.performAction('findJob',{job:'事務職'}).ok,false);
 goToAge(g,17);assert.equal(g.getState().finances.debt,0);
 assert.equal(g.performAction('sideJob',{active:true}).ok,false);
});
test('毎月の給料・生活費・税金の精算',()=>{
 const g=createGameStore();g.startNewGame();goToAge(g,18);
 assert.equal(g.performAction('findJob',{job:'事務職'}).ok,true);
 const before=g.getState().finances.cash;g.advanceTurn();const f=g.getState().finances;
 assert.equal(f.cash-before,235000-23500-85000-4000);
 assert.equal(f.totals.tax>=23500,true);
 assert.equal(f.career.experience,1);
});
test('副業、生活費変更、退職、再就職',()=>{
 const g=createGameStore();g.startNewGame();goToAge(g,18);
 assert.equal(g.performAction('sideJob',{active:true}).ok,true);
 assert.equal(g.performAction('setBudget',{amount:50000}).ok,true);
 assert.equal(g.performAction('setBudget',{amount:-1}).ok,false);
 const previousDebt=g.getState().finances.debt;g.advanceTurn();assert.equal(g.getState().finances.cash,0);
 assert.equal(g.getState().finances.debt-previousDebt,22500);
 g.performAction('findJob',{job:'販売スタッフ'});
 assert.equal(g.performAction('findJob',{job:'事務職'}).ok,false);
 assert.equal(g.performAction('resign').ok,true);
 assert.equal(g.performAction('findJob',{job:'事務職'}).ok,true);
});
test('投資と返済は残高チェックを行い純資産を保存',()=>{
 const g=createGameStore();g.startNewGame();goToAge(g,18);g.performAction('findJob',{job:'技術職'});
 for(let i=0;i<4;i++)g.advanceTurn();const a=g.getState().finances;
 assert.equal(g.performAction('buyInvestment',{amount:a.cash+1}).ok,false);
 assert.equal(g.performAction('buyInvestment',{amount:100000}).ok,true);
 const invested=g.getState().finances;assert.equal(netWorth(invested),netWorth(a));
 assert.equal(g.performAction('sellInvestment',{amount:999999}).ok,false);
 assert.equal(g.performAction('sellInvestment',{amount:20000}).ok,true);
});
test('会社設立には年齢と資金が必要、会計は月次で記録',()=>{
 const g=createGameStore();g.startNewGame();goToAge(g,18);
 assert.equal(g.performAction('startBusiness').ok,false);
 g.performAction('findJob',{job:'技術職'});goToAge(g,20);
 const before=g.getState().finances.cash;
 assert.equal(before>=300000,true);assert.equal(g.performAction('startBusiness').ok,true);
 assert.equal(g.performAction('startBusiness').ok,false);
 g.advanceTurn();const f=g.getState().finances;
 assert.equal(f.business.active,true);assert.equal(f.ledger.some(x=>x.label==='事業売上'),true);
 assert.equal(g.performAction('closeBusiness').ok,true);
});
test('3か月の暦月精算・決定性・状態の不変性',()=>{
 const e=createEconomyData();e.career.job='販売スタッフ';e.career.monthlySalary=195000;
 const notices=advanceEconomy(e,{year:2000,month:1},3,{year:1980,month:1});
 assert.equal(notices.length,0);assert.equal(e.career.experience,3);
 assert.equal(e.cash,3*(195000-19500-85000-4000));
 const a=createGameStore(),b=createGameStore();a.startNewGame();b.startNewGame();goToAge(a,18);goToAge(b,18);
 a.performAction('findJob',{job:'事務職'});b.performAction('findJob',{job:'事務職'});a.advanceTurn();b.advanceTurn();
 assert.deepEqual(a.getState(),b.getState());assert.equal(Object.isFrozen(a.getState().finances),true);
});
