import test from 'node:test';
import assert from 'node:assert/strict';
import {createEconomyData,economyAction,advanceEconomy,netWorth} from '../js/core/economySystems.js';
import {createGameStore} from '../js/core/gameState.js';
import {validateGameState} from '../js/core/saveSystems.js';
import {supportRebuilding,createCompanyMarket} from '../js/core/companySystems.js';
const ctx={age:25,date:{year:2025,month:1},education:{}};
test('個人と事業の口座は分離され、事業利益は自動的に個人現金へ移らない',()=>{
 const e=createEconomyData();e.cash=1000000;
 assert.equal(economyAction(e,'startBusiness',{},ctx).ok,true);
 assert.equal(e.cash,700000);
 const personalBefore=e.cash,beforeNet=netWorth(e);
 advanceEconomy(e,{year:2025,month:1},1,{year:2000,month:1},{phase:'通常'});
 assert.equal(e.business.operatingCash,370000);
 assert.equal(e.cash,personalBefore-85000-4000);
 assert.equal(e.totals.income,0);
 assert.equal(e.totals.tax,0);
 assert.equal(netWorth(e),beforeNet+70000-85000-4000);
 assert.ok(e.ledger.some(x=>x.label==='事業売上'));
});
test('明示的な事業資金移動、引出し、廃業清算は二重計上しない',()=>{
 const e=createEconomyData();e.cash=1000000;
 economyAction(e,'startBusiness',{},ctx);
 assert.equal(economyAction(e,'ownerDraw',{amount:400000},ctx).ok,false);
 assert.equal(economyAction(e,'ownerDraw',{amount:100000},ctx).ok,true);
 assert.equal(e.cash,800000);assert.equal(e.business.operatingCash,200000);
 assert.equal(economyAction(e,'businessFunding',{amount:50000},ctx).ok,true);
 assert.equal(e.business.operatingCash,250000);
 e.business.operatingDebt=75000;
 const before=netWorth(e);
 assert.equal(economyAction(e,'closeBusiness',{},ctx).ok,true);
 assert.equal(e.cash,1000000);assert.equal(e.debt,75000);
 assert.equal(e.business.status,'廃業');assert.equal(netWorth(e),before);
});
test('失業給付は解雇後6か月を上限に計上し、自主退職は対象外',()=>{
 const e=createEconomyData();e.career.previousSalary=240000;e.career.job=null;
 for(let m=1;m<=8;m++)advanceEconomy(e,{year:2025,month:m},1,{year:2000,month:1});
 assert.equal(e.career.unemploymentMonths,8);assert.equal(e.career.benefitMonths,6);
 assert.equal(e.totals.income,600000);
 const f=createEconomyData();Object.assign(f.career,{job:'事務職',monthlySalary:240000});
 economyAction(f,'resign',{},ctx);
 advanceEconomy(f,{year:2025,month:1},1,{year:2000,month:1});
 assert.equal(f.totals.income,0);
});
test('再就職活動は上限があり就職後は初期化される',()=>{
 const e=createEconomyData();
 for(let i=0;i<3;i++)assert.equal(economyAction(e,'jobSearch',{},ctx).ok,true);
 assert.equal(economyAction(e,'jobSearch',{},ctx).ok,false);
 const g=createGameStore();g.startNewGame();const state=structuredClone(g.getState());
 state.timeline={year:2025,month:1,ageYears:25,turnsElapsed:156,monthsElapsed:300};
 state.finances.career.searchEffort=3;
 assert.equal(g.loadState(state).ok,true);
 // 学歴・技能に関わらず、旧データの検証と上限を維持
 assert.equal(g.getState().finances.career.searchEffort,3);
});
test('営業停止企業は条件を満たすと支援金で早期再建できる',()=>{
 const e=createEconomyData();e.companyMarket=createCompanyMarket();e.cash=800000;
 const c=e.companyMarket[0];Object.assign(c,{status:'営業停止',haltedMonths:3,openings:0,staffCount:0,cash:0});
 assert.equal(supportRebuilding(e,c.id,{year:2030,month:1}).ok,true);
 assert.equal(c.status,'通常');assert.ok(c.openings>0);
 assert.equal(e.cash,300000);assert.equal(e.totals.expenses,500000);
 assert.equal(supportRebuilding(e,c.id,{year:2030,month:1}).ok,false);
});
test('旧保存形式を補完し、新規会計・雇用項目の不正値を拒否',()=>{
 const g=createGameStore();g.startNewGame();const old=structuredClone(g.getState());
 for(const k of ['unemploymentMonths','benefitMonths','previousSalary','searchEffort'])delete old.finances.career[k];
 delete old.finances.business.ownerDraws;
 assert.equal(validateGameState(old),true);assert.equal(g.loadState(old).ok,true);
 assert.equal(g.getState().finances.business.ownerDraws,0);
 const bad=structuredClone(g.getState());bad.finances.career.benefitMonths=7;
 assert.equal(validateGameState(bad),false);
 bad.finances.career.benefitMonths=0;bad.finances.business.ownerDraws=-1;
 assert.equal(validateGameState(bad),false);
});
