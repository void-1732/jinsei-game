import test from 'node:test';
import assert from 'node:assert/strict';
import {createCompanyMarket,advanceCompanyMarket} from '../js/core/companySystems.js';
import {createGameStore} from '../js/core/gameState.js';
import {createEconomyData,economyAction,advanceEconomy} from '../js/core/economySystems.js';
import {validateGameState} from '../js/core/saveSystems.js';

test('営業停止後12か月で外部再建され、求人が復帰する',()=>{
 const finances={companyMarket:createCompanyMarket()};const company=finances.companyMarket[0];
 company.status='営業停止';company.cash=0;company.staffCount=0;company.openings=0;
 for(let month=1;month<=11;month++)advanceCompanyMarket(finances,{year:2030,month},'通常');
 assert.equal(company.status,'営業停止');assert.equal(company.openings,0);
 advanceCompanyMarket(finances,{year:2030,month:12},'通常');
 assert.equal(company.status,'通常');assert.ok(company.openings>0);assert.equal(company.recoveries,1);
});
test('営業停止した勤務先から失業し、給与は次月から停止する',()=>{
 const game=createGameStore();game.startNewGame();const state=structuredClone(game.getState());
 state.timeline={year:2018,month:1,ageYears:18,turnsElapsed:72,monthsElapsed:216};
 Object.assign(state.finances.career,{job:'販売スタッフ',company:'みらい販売',monthlySalary:195000,experience:8});
 const company=state.finances.companyMarket[0];Object.assign(company,{cash:0,staffCount:300,performance:10,distressMonths:5,status:'経営危機'});
 assert.equal(game.loadState(state).ok,true);
 game.advanceTurn();const after=game.getState();
 assert.equal(after.finances.companyMarket[0].status,'営業停止');
 assert.equal(after.finances.career.job,null);
 assert.equal(after.finances.career.unemploymentCount,1);
 assert.ok(after.pendingEvents.some(e=>e.type==='job-loss'));
 const payroll=after.finances.totals.income;
 game.advanceTurn();assert.equal(game.getState().finances.totals.income-payroll,97500); // 給与は停止、前職給与の半額を簡易給付
});
test('事業の運転資金追加・赤字による休業・資金注入後の再開',()=>{
 const e=createEconomyData(),date={year:2025,month:1},context={age:25,date,education:{}};
 e.cash=1000000;
 assert.equal(economyAction(e,'startBusiness',{},context).ok,true);
 assert.equal(e.business.operatingCash,300000);
 e.business.monthlyRevenue=0;e.business.monthlyCosts=300000;
 for(let month=1;month<=3;month++)advanceEconomy(e,{year:2025,month},1,{year:2000,month:1},{phase:'通常'});
 assert.equal(e.business.status,'休業');assert.ok(e.business.operatingDebt>0);
 assert.equal(economyAction(e,'restartBusiness',{},context).ok,false);
 e.cash=500000;
 assert.equal(economyAction(e,'businessFunding',{amount:150000},context).ok,true);
 assert.equal(economyAction(e,'restartBusiness',{},context).ok,true);
 assert.equal(e.business.status,'営業中');
 assert.equal(e.business.cashFlowHistory.length,3);
});
test('旧形式の読込は保持、新しい不正値を拒否',()=>{
 const game=createGameStore();game.startNewGame();const old=structuredClone(game.getState());
 for(const key of ['operatingCash','operatingDebt','lossMonths','status','cashFlowHistory'])delete old.finances.business[key];
 for(const company of old.finances.companyMarket){delete company.haltedMonths;delete company.recoveries;}
 assert.equal(validateGameState(old),true);assert.equal(game.loadState(old).ok,true);
 const invalid=structuredClone(game.getState());invalid.finances.business.operatingDebt=-1;
 assert.equal(validateGameState(invalid),false);
 invalid.finances.business.operatingDebt=0;invalid.finances.companyMarket[0].recoveries=-2;
 assert.equal(validateGameState(invalid),false);
});
test('企業再建と事業収支は同一入力で決定論的',()=>{
 const a={companyMarket:createCompanyMarket()},b={companyMarket:createCompanyMarket()};
 for(let i=0;i<30;i++){const date={year:2030+Math.floor(i/12),month:i%12+1};advanceCompanyMarket(a,date,'通常');advanceCompanyMarket(b,date,'通常');}
 assert.deepEqual(a,b);
});
