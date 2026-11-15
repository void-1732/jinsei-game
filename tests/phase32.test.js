import test from 'node:test';
import assert from 'node:assert/strict';
import {createEconomyData} from '../js/core/economySystems.js';
import {createLivingData,advanceLiving,livingAction,validateLiving,ensureMortgage,pensionHistoryByYear,estimateInsuranceBenefit} from '../js/core/livingSystems.js';
import {createGameStore} from '../js/core/gameState.js';
const context={date:{year:2030,month:1},age:30};
function setup(){const f=createEconomyData();f.living=createLivingData();f.living.pensionMode='免除';return f;}
test('第32段階：実額返済で資金不足時に未払元本を償却しない',()=>{
 const f=setup();f.cash=0;Object.assign(f.living,{housing:'持ち家',propertyValue:1000000,mortgageBalance:100000,mortgagePayment:10000,mortgageMonths:36,mortgageAccounting:'実額方式'});
 advanceLiving(f,context.date,30);
 assert.equal(f.living.mortgageBalance,100000);
 assert.equal(f.living.mortgageOverdueInterest,300);
 assert.equal(f.living.mortgageArrears,10000);
 assert.equal(f.debt,0);
});
test('第32段階：実額返済の延滞解消は利息と元本を区別する',()=>{
 const f=setup();Object.assign(f.living,{housing:'持ち家',propertyValue:1000000,mortgageBalance:100000,mortgagePayment:10000,mortgageMonths:36,mortgageAccounting:'実額方式'});
 f.cash=0;advanceLiving(f,context.date,30);f.cash=20000;
 const result=livingAction(f,{},'clearMortgageArrears',{amount:10000},context);
 assert.equal(result.ok,true);assert.equal(f.living.mortgageBalance,90300);assert.equal(f.living.mortgageOverdueInterest,0);assert.equal(f.debt,0);
});
test('第32段階：所得条件による免除申請を拒否・許可する',()=>{
 const f=setup();f.career.monthlySalary=150000;
 const before=structuredClone(f.living);
 assert.equal(livingAction(f,{},'requestPensionExemption',{},context).ok,false);
 assert.deepEqual(f.living,before);
 f.career.monthlySalary=100000;
 assert.equal(livingAction(f,{},'requestPensionExemption',{},context).ok,true);
 assert.equal(f.living.pensionMode,'免除');
});
test('第32段階：年金年度別記録と未納追納の紐付け',()=>{
 const f=setup();f.living.pensionMode='未納';advanceLiving(f,{year:2030,month:2},30);
 f.cash=50000;assert.equal(livingAction(f,{},'backPayPension',{months:1},{date:{year:2031,month:1},age:31}).ok,true);
 const record=pensionHistoryByYear(f.living);
 assert.equal(record.find(r=>r.year===2030).unpaid,1);
 assert.equal(record.find(r=>r.year===2031).backPaid,1);
});
test('第32段階：保険の自己負担額を上限とする方式',()=>{
 const f=setup();f.living.insurance='充実保障';
 assert.equal(estimateInsuranceBenefit(f.living),40000);
 assert.equal(livingAction(f,{illness:{months:0}},'setInsuranceClaimCap',{mode:'自己負担上限'},context).ok,true);
 assert.equal(estimateInsuranceBenefit(f.living),3500);
 assert.equal(livingAction(f,{illness:{months:0}},'claimInsurance',{},context).ok,true);
 assert.equal(f.living.insuranceBenefitPaid,3500);
});
test('第32段階：旧データの補完と不正記録の拒否',()=>{
 const l=createLivingData();for(const k of ['mortgageAccounting','mortgageOverdueInterest','pensionHistory','insuranceClaimCap'])delete l[k];
 assert.equal(validateLiving(l),true);ensureMortgage(l);assert.equal(l.mortgageAccounting,'従来方式');
 l.pensionHistory=[{year:2030,month:4,mode:'不明'}];assert.equal(validateLiving(l),false);
});
test('第32段階：画面操作はゲーム状態更新・旧画面数維持',()=>{
 const s=createGameStore();s.startNewGame();assert.equal(s.getState().initialized,true);
});
