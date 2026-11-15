import test from 'node:test';
import assert from 'node:assert/strict';
import {createLivingData,createLivingData as newLiving, auditLivingAccounts, livingAction, advanceLiving, validateLiving} from '../js/core/livingSystems.js';
import {createEconomyData} from '../js/core/economySystems.js';
import {createGameStore} from '../js/core/gameState.js';
const ctx={date:{year:2033,month:4},age:33};
const setup=()=>{const f=createEconomyData(); f.living=createLivingData();return f;};
test('第33段階：初期家計の会計照合は読み取り専用',()=>{
 const f=setup(),before=structuredClone(f);
 const result=auditLivingAccounts(f);assert.equal(result.ok,true);assert.deepEqual(f,before);
});
test('第33段階：実額方式の未払利息が延滞残高を超えると検知',()=>{
 const f=setup();Object.assign(f.living,{housing:'持ち家',propertyValue:1000000,mortgageBalance:100000,mortgageAccounting:'実額方式',mortgageArrears:100,mortgageOverdueInterest:200});
 const result=auditLivingAccounts(f);assert.equal(result.ok,false);assert.match(result.issues.join(''),/未払利息/);
});
test('第33段階：返済不足の実額方式で債務額と照合が一致',()=>{
 const f=setup();f.living.pensionMode='未納';Object.assign(f.living,{housing:'持ち家',propertyValue:1000000,mortgageBalance:100000,mortgagePayment:10000,mortgageMonths:36,mortgageAccounting:'実額方式'});
 advanceLiving(f,ctx.date,33);assert.equal(f.living.mortgageOverdueInterest,300);assert.equal(auditLivingAccounts(f).ok,true);
});
test('第33段階：追納記録の整合性を検知',()=>{
 const f=setup();f.living.pensionUnpaidMonths=0;f.living.pensionUnpaidRecords=[{year:2030,month:1}];assert.equal(auditLivingAccounts(f).ok,false);
});
test('第33段階：保険給付見込みがゼロの病気で請求しない',()=>{
 const f=setup(),h={illness:{months:0}};f.living.insurance='基本保障';
 f.living.insuranceClaimCap='自己負担上限';
 assert.equal(livingAction(f,h,'claimInsurance',{},ctx).ok,true);
 assert.equal(livingAction(f,h,'claimInsurance',{},ctx).ok,false);
 assert.equal(f.living.insuranceBenefitPaid,3500);
});
test('第33段階：新旧ゲームの保存情報に新しい必須フィールドを要求しない',()=>{
 const s=createGameStore();s.startNewGame();const state=structuredClone(s.getState());
 delete state.finances.living.mortgageOverdueInterest;
 assert.equal(s.loadState(state).ok,true);assert.equal(auditLivingAccounts(s.getState().finances).ok,true);
});
