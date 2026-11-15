import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameStore} from '../js/core/gameState.js';
import {mortgageSchedule, validateLiving, ensureMortgage} from '../js/core/livingSystems.js';
import {createHealthData, healthAction,advanceHealth} from '../js/core/healthSystems.js';
import {createEconomyData} from '../js/core/economySystems.js';
import {validateGameState} from '../js/core/saveSystems.js';
function adult(){const s=createGameStore();s.startNewGame({name:'生活検証',seed:123});while(s.getState().timeline.ageYears<18)s.advanceTurn();const state=structuredClone(s.getState());state.finances.cash=25000000;assert.equal(s.loadState(state).ok,true);return s;}
function house(s){assert.equal(s.performAction('moveHome',{region:'香川・高松',housing:'持ち家',loan:true}).ok,true);}
test('第29段階：住宅ローン返済予定表は元本・利息・残高が整合する',()=>{
 const s=adult();house(s);const l=s.getState().finances.living,rows=mortgageSchedule(l,12);
 assert.equal(rows.length,12);assert.equal(rows[0].principal+rows[0].interest,rows[0].payment);
 assert.equal(rows[0].balance,l.mortgageBalance-rows[0].principal);
 assert.ok(rows.every(r=>r.principal>0&&r.balance>=0));
});
test('第29段階：住宅ローン返済の資金不足は延滞履歴に記録',()=>{
 const s=adult();house(s);const state=structuredClone(s.getState());state.finances.cash=0;state.finances.monthlyBudget=0;
 assert.equal(s.loadState(state).ok,true);s.advanceTurn();
 const l=s.getState().finances.living;
 assert.equal(l.mortgageLateMonths,1);assert.ok(l.mortgageArrears>0);
 assert.equal(l.mortgageHistory.at(-1).scheduled,l.mortgageHistory.at(-1).paid+l.mortgageHistory.at(-1).shortage);
});
test('第29段階：住宅の修繕費と評価額改善・現金不足時の拒否',()=>{
 const s=adult();house(s);const before=s.getState().finances;
 assert.equal(s.performAction('repairHome',{}).ok,true);
 assert.equal(s.getState().finances.cash,before.cash-50000);
 assert.equal(s.getState().finances.living.propertyValue,before.living.propertyValue+30000);
 const state=structuredClone(s.getState());state.finances.cash=0;assert.equal(s.loadState(state).ok,true);
 assert.equal(s.performAction('repairHome',{}).ok,false);
});
test('第29段階：地域別住宅価格と年金加入実績は月次で更新',()=>{
 const s=adult();house(s);const before=s.getState().finances.living;s.advanceTurn();
 const after=s.getState().finances.living;
 assert.ok(after.propertyValue<before.propertyValue);
 assert.equal(after.propertyAgeMonths,before.propertyAgeMonths+1);
 assert.equal(after.pensionContributions,before.pensionContributions+1);
});
test('第29段階：簡易医療保障は費用軽減と累計額を記録',()=>{
 const f=createEconomyData();f.living=ensureMortgage({});f.cash=10000;
 const h=createHealthData();advanceHealth(h,{year:2010,month:1},10,0);
 assert.equal(healthAction(h,'treatment',{}, {year:2010,month:1},f).cost,3500);
 assert.equal(f.cash,6500);assert.equal(f.living.medicalSubsidyPaid,1500);
});
test('第29段階：新規項目を省略した旧セーブを補完し異常履歴は拒否',()=>{
 const s=adult(),old=structuredClone(s.getState());
 for(const key of ['mortgageHistory','mortgageArrears','mortgageLateMonths','propertyAgeMonths','repairCount','pensionContributions','medicalSubsidyPaid'])delete old.finances.living[key];
 assert.equal(validateGameState(old),true);assert.equal(s.loadState(old).ok,true);
 assert.deepEqual(s.getState().finances.living.mortgageHistory,[]);
 const bad=structuredClone(s.getState());bad.finances.living.mortgageHistory=[{year:2030,month:1,scheduled:1000,paid:400,shortage:100,balance:10000}];
 assert.equal(validateLiving(bad.finances.living),false);
});
test('第29段階：年金は長期加入で簡易加算される',()=>{
 const {living}=createEconomyData();
 const f=createEconomyData();f.living=ensureMortgage({housing:'実家',region:'東京・東京23区',monthlyHousingCost:0,insurance:'未加入',pensionMonths:360});
 // 65歳以降の加算額は、加入360か月では月額70,000円となる。
 assert.equal(60000+Math.min(24000,Math.floor(Math.max(0,f.living.pensionMonths-240)/12)*1000),70000);
});
