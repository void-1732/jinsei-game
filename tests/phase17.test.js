import test from 'node:test';
import assert from 'node:assert/strict';
import {createEconomyData,economyAction,advanceEconomy,netWorth} from '../js/core/economySystems.js';
import {createGameStore} from '../js/core/gameState.js';
import {validateGameState} from '../js/core/saveSystems.js';
const ctx={age:25,date:{year:2025,month:1},education:{}};
function business(){const e=createEconomyData();e.cash=1000000;assert.equal(economyAction(e,'startBusiness',{},ctx).ok,true);return e;}
test('融資の借入れと返済は個人現金を変えず純資産も変えない',()=>{
 const e=business(),prior=netWorth(e),personal=e.cash;
 assert.equal(economyAction(e,'businessLoan',{amount:200000},ctx).ok,true);
 assert.equal(e.business.operatingCash,500000);assert.equal(e.business.loanBalance,200000);
 assert.equal(netWorth(e),prior);assert.equal(e.cash,personal);
 assert.equal(economyAction(e,'repayBusinessLoan',{amount:50000},ctx).ok,true);
 assert.equal(e.business.loanBalance,150000);assert.equal(netWorth(e),prior);
 assert.equal(economyAction(e,'repayBusinessLoan',{amount:200000},ctx).ok,false);
});
test('月次利息は融資残高に対して事業口座から精算される',()=>{
 const e=business();economyAction(e,'businessLoan',{amount:200000},ctx);
 advanceEconomy(e,{year:2025,month:1},1,{year:2000,month:1});
 assert.equal(e.business.loanInterestPaid,1000);
 assert.equal(e.business.operatingCash,569000);
 assert.ok(e.business.businessLedger.some(x=>x.label==='融資利息'&&x.amount===-1000));
});
test('事業設備は帳簿価額で計上し、売却損と廃業制限が反映される',()=>{
 const e=business(),before=netWorth(e);
 assert.equal(economyAction(e,'purchaseEquipment',{amount:100000},ctx).ok,true);
 assert.equal(netWorth(e),before);
 assert.equal(economyAction(e,'closeBusiness',{},ctx).ok,false);
 assert.equal(economyAction(e,'sellEquipment',{},ctx).ok,true);
 assert.equal(netWorth(e),before-30000);
 assert.equal(economyAction(e,'closeBusiness',{},ctx).ok,true);
});
test('受給終了後の再受給には12か月の新規勤務が必要',()=>{
 const e=createEconomyData();e.career.previousSalary=240000;
 for(let i=0;i<6;i++)advanceEconomy(e,{year:2025,month:i+1},1,{year:2000,month:1});
 assert.equal(e.career.benefitEligible,false);assert.equal(e.totals.income,600000);
 e.career.job='事務職';e.career.monthlySalary=240000;
 for(let i=0;i<11;i++)advanceEconomy(e,{year:2026,month:i+1},1,{year:2000,month:1});
 assert.equal(e.career.benefitEligible,false);
 advanceEconomy(e,{year:2026,month:12},1,{year:2000,month:1});
 assert.equal(e.career.benefitEligible,true);
});
test('第16段階の旧保存データ補完と融資台帳の異常値拒否',()=>{
 const g=createGameStore();g.startNewGame();const old=structuredClone(g.getState());
 for(const k of ['loanBalance','loanInterestPaid','equipmentValue','businessLedger'])delete old.finances.business[k];
 delete old.finances.career.benefitEligible;delete old.finances.career.insuredMonths;
 assert.equal(validateGameState(old),true);assert.equal(g.loadState(old).ok,true);
 const loaded=g.getState();assert.equal(loaded.finances.business.loanBalance,0);assert.deepEqual(loaded.finances.business.businessLedger,[]);
 const bad=structuredClone(loaded);bad.finances.business.loanBalance=-1;
 assert.equal(validateGameState(bad),false);
 bad.finances.business.loanBalance=0;bad.finances.business.businessLedger=[{year:2025,month:16,label:'利息',amount:-100}];
 assert.equal(validateGameState(bad),false);
});
