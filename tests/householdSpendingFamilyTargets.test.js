import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameStore} from '../js/core/gameState.js';
import {validateGameState} from '../js/core/saveSystems.js';
import {baseHouseholdBudget,spendingPreview,refreshAutomaticBudget,applySpendingHealthImpact,SPENDING_STYLES} from '../js/core/householdSpending.js';
import {routineContactCandidates,setMonthlyRoutine,advanceMonthlyRoutines} from '../js/core/monthlyRoutines.js';
import {turnActionCategory} from '../js/core/adultActionBudget.js';

function adult(){
 const g=createGameStore({interactiveChoices:true});assert.equal(g.startNewGame().ok,true);
 const s=structuredClone(g.getState());
 s.pendingEvents=[];
 s.timeline={year:2026,month:5,ageYears:26,turnsElapsed:101,monthsElapsed:316};
 s.turnActions={turn:101,used:0,lastAction:null,categories:[]};
 s.finances.cash=500000;
 assert.equal(g.loadState(s).ok,true);
 return g;
}
test('家計の生活費は年齢・住まい・地域・家計方針で自動計算し、金額の手入力は不要',()=>{
 const g=adult(),s=structuredClone(g.getState());
 const parents=baseHouseholdBudget(s);
 assert.ok(parents>0);
 s.finances.living.housing='賃貸';
 assert.ok(baseHouseholdBudget(s)>parents);
 const tokyo=spendingPreview(s).adjusted;
 s.finances.living.region='香川・高松';
 assert.ok(spendingPreview(s).adjusted<tokyo);
 s.finances.spendingStyle='saving';
 const saving=spendingPreview(s).adjusted;
 assert.ok(saving<tokyo);
 assert.equal(refreshAutomaticBudget(s),Math.round(baseHouseholdBudget(s)*.82));
 assert.equal(validateGameState(s),true);
 assert.equal(SPENDING_STYLES.length,3);
});
test('節約方針は継続的に健康に負担をかけ、他方針には節約ペナルティを適用しない',()=>{
 const s=structuredClone(adult().getState());
 s.finances.spendingStyle='saving';
 const physical=s.health.physical,energy=s.health.energy;
 for(const month of [6,7,8])applySpendingHealthImpact(s,{year:2026,month});
 assert.ok(s.health.physical<physical||physical===0);
 assert.ok(s.health.energy<energy||energy===0);
});
test('継続連絡の対象者が明示され、保存・ロード後も維持される',()=>{
 const g=adult(),candidate=routineContactCandidates(g.getState(),'call')[0];
 assert.ok(candidate);
 assert.equal(g.performAction('setMonthlyRoutine',{domain:'relationships',planId:'call',personId:candidate.id}).ok,true);
 const s=structuredClone(g.getState());
 assert.equal(s.monthlyRoutines.relationshipsTargetId,candidate.id);
 const restored=createGameStore({interactiveChoices:true});
 assert.equal(restored.loadState(s).ok,true);
 const copy=structuredClone(restored.getState()),old=copy.people.find(p=>p.id===candidate.id).relationship;
 assert.equal(advanceMonthlyRoutines(copy,{year:2026,month:6},26).applied,true);
 assert.equal(copy.people.find(p=>p.id===candidate.id).relationship,Math.min(100,old+1));
 assert.match(copy.monthlyRoutines.lastResults.join(''),new RegExp(candidate.name));
});
test('旧セーブの連絡相手未登録は保留し、別の人物に勝手に連絡しない',()=>{
 const s=structuredClone(adult().getState());
 s.monthlyRoutines.plans.relationships='call';
 delete s.monthlyRoutines.relationshipsTargetId;
 const old=s.finances.cash;
 const relations=s.people.map(p=>p.relationship);
 assert.equal(advanceMonthlyRoutines(s,{year:2026,month:6},26).applied,true);
 assert.equal(s.finances.cash,old);
 assert.deepEqual(s.people.map(p=>p.relationship),relations);
 assert.match(s.monthlyRoutines.lastResults.join(''),/保留/);
});
test('家計方針の変更は自由行動を使い、旧セーブも読み込める',()=>{
 const g=adult();
 assert.equal(turnActionCategory('setSpendingStyle'),'生活・資産');
 assert.equal(g.performAction('setSpendingStyle',{styleId:'saving'}).ok,true);
 assert.equal(g.getState().finances.spendingStyle,'saving');
 assert.equal(g.performAction('setSpendingStyle',{styleId:'standard'}).ok,false);
 const old=structuredClone(g.getState());
 delete old.finances.spendingStyle;delete old.monthlyRoutines.relationshipsTargetId;
 assert.equal(validateGameState(old),true);
 assert.equal(createGameStore({interactiveChoices:true}).loadState(old).ok,true);
});
