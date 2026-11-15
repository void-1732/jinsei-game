import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameStore} from '../js/core/gameState.js';
import {createLivingData,advanceLiving,ensureMortgage,validateLiving,calculatePension,assessMortgage,medicalCoverageSummary} from '../js/core/livingSystems.js';
import {createEconomyData} from '../js/core/economySystems.js';
import {validateGameState} from '../js/core/saveSystems.js';
const adult=()=>{const s=createGameStore();s.startNewGame({name:'第31段階の検証'});while(s.getState().timeline.ageYears<18)s.advanceTurn();return s;};
test('第31段階：信用評価不足で住宅ローン拒否、状態を変更しない',()=>{
 const s=adult();const state=structuredClone(s.getState());state.finances.cash=6000000;state.finances.living.mortgageCredit=45;assert.equal(s.loadState(state).ok,true);
 const before=s.getState();const result=s.performAction('moveHome',{region:'香川・高松',housing:'持ち家',loan:true});
 assert.equal(result.ok,false);assert.match(result.reason,/信用評価/);assert.deepEqual(s.getState(),before);
});
test('第31段階：所得がない場合でも返済余力のある現金保有者は審査可',()=>{
 const f=createEconomyData();f.cash=6000000;const loan=800000;
 assert.equal(assessMortgage(f,1000000,loan).ok,true);
 f.debt=10000000;assert.equal(assessMortgage(f,1000000,loan).ok,false);
});
test('第31段階：免除と未納では課金されず年金加入月数を区別',()=>{
 const f=createEconomyData();f.cash=20000;
 f.living=createLivingData();f.living.pensionMode='免除';advanceLiving(f,{year:2025,month:1},25);
 assert.equal(f.living.pensionExemptMonths,1);assert.equal(f.living.pensionMonths,0);assert.equal(f.living.pensionCreditHalfUnits,1);
 f.living.pensionMode='未納';advanceLiving(f,{year:2025,month:2},25);
 assert.equal(f.living.pensionUnpaidMonths,1);assert.equal(f.living.pensionUnpaidRecords.length,1);
 assert.equal(f.living.pensionPremiumPaid,0);assert.equal(f.cash,20000);
});
test('第31段階：未納月数を現金から追納し受給見込へ反映',()=>{
 const s=adult();let x=structuredClone(s.getState());x.finances.cash=100000;assert.equal(s.loadState(x).ok,true);
 assert.equal(s.performAction('setPensionMode',{mode:'未納'}).ok,true);s.advanceTurn();
 const before=s.getState().finances;assert.equal(before.living.pensionUnpaidMonths,1);
 assert.equal(s.performAction('backPayPension',{months:1}).ok,true);
 const after=s.getState().finances;assert.equal(after.living.pensionUnpaidMonths,0);
 assert.equal(after.living.pensionBackPaidMonths,1);assert.equal(after.living.pensionCreditHalfUnits,before.living.pensionCreditHalfUnits+2);
 assert.equal(after.cash,before.cash-4000);assert.equal(after.living.pensionPremiumPaid,before.living.pensionPremiumPaid+4000);
});
test('第31段階：不正追納・資金不足を拒否',()=>{
 const s=adult();const before=s.getState();assert.equal(s.performAction('backPayPension',{months:1}).ok,false);
 assert.equal(s.performAction('setPensionMode',{mode:'不明'}).ok,false);assert.deepEqual(s.getState(),before);
});
test('第31段階：年金加入実績と医療保障の内訳',()=>{
 const l={...createLivingData(),pensionMonths:240,pensionCreditHalfUnits:480,insurance:'基本保障'};
 assert.equal(calculatePension(l),60000);
 l.pensionCreditHalfUnits=0; assert.equal(calculatePension(l),60000);
 const summary=medicalCoverageSummary(l);assert.deepEqual(summary,{standard:5000,publicSupport:1500,outOfPocket:3500,optionalBenefit:15000});
});
test('第31段階：旧保存データを読み込み、異常納付データを拒否',()=>{
 const s=adult();const old=structuredClone(s.getState());
 for(const key of ['pensionMode','pensionExemptMonths','pensionUnpaidMonths','pensionBackPaidMonths','pensionUnpaidRecords','pensionCreditHalfUnits','mortgageRejectedApplications'])delete old.finances.living[key];
 assert.equal(validateGameState(old),true);assert.equal(s.loadState(old).ok,true);
 assert.equal(s.getState().finances.living.pensionMode,'通常納付');
 const bad=structuredClone(s.getState());bad.finances.living.pensionMode='不正';assert.equal(validateLiving(bad.finances.living),false);
 bad.finances.living.pensionMode='通常納付';bad.finances.living.pensionUnpaidRecords=[{year:1999,month:1}];assert.equal(validateLiving(bad.finances.living),false);
});
