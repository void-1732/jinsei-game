import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameStore} from '../js/core/gameState.js';
import {createFamilyProgress,familyEligibility,familyJourneyAction,advanceFamilyJourney,parentingMonthlyCost,validateFamilyProgress,FAMILY_COSTS} from '../js/core/familyJourney.js';
import {validateGameState} from '../js/core/saveSystems.js';
const now=s=>s.timeline.year*12+s.timeline.month-1;
const shift=(s,n=1)=>{
 const i=now(s)+n;s.timeline.year=Math.floor(i/12);s.timeline.month=i%12+1;
 s.timeline.ageYears=s.timeline.year-2000-(s.timeline.month<s.player.birth.month?1:0);
 s.timeline.monthsElapsed+=n;s.timeline.turnsElapsed+=n;
};
function state(){
 const g=createGameStore({interactiveChoices:true});g.startNewGame({name:'実験',birth:{year:2000,month:1,day:1},seed:42});
 const s=structuredClone(g.getState());
 s.timeline={year:2027,month:5,ageYears:27,monthsElapsed:328,turnsElapsed:130};
 s.finances.cash=900000;s.finances.career.monthlySalary=280000;s.pendingEvents=[];
 return s;
}
const partner=(s,role='交際相手')=>{
 const p={id:'FRIEND-001',name:'相手',birth:{year:2000,month:1,day:1},role,relationship:92};
 s.people.push(p);s.familyJourney.connections[p.id]={knownSince:now(s)-20,datingSince:now(s)-15,futureTalks:3,lastTalk:-1,lastContact:-1};
 s.familyJourney.partnership={personId:p.id,stage:role==='配偶者'?'結婚済み':'交際中',datingSince:now(s)-15,cohabitingSince:-1,engagedSince:-1,weddingMonth:-1,weddingStyle:'未定'};
 if(role==='配偶者')s.household.memberIds.push(p.id);
 return p;
};
test('交際 → 同棲 → 婚約 → 挙式 → 結婚は実際の資金と数か月の時間を必要とする',()=>{
 const s=state(),p=partner(s);
 const original=s.finances.cash;
 assert.equal(familyJourneyAction(s,'cohabit',{personId:p.id}).ok,true);
 assert.equal(s.finances.cash,original-70000);
 assert.equal(familyJourneyAction(s,'cohabit',{personId:p.id}).ok,false);
 assert.equal(familyJourneyAction(s,'engage',{personId:p.id}).ok,true);
 assert.match(familyEligibility(s,'marry',p.id),/3か月/);
 assert.equal(familyJourneyAction(s,'holdWedding',{personId:p.id,style:'標準'}).ok,false);
 shift(s,3);
 assert.equal(familyJourneyAction(s,'holdWedding',{personId:p.id,style:'標準'}).ok,true);
 assert.equal(s.finances.cash,original-70000-30000-420000);
 assert.equal(familyJourneyAction(s,'marry',{personId:p.id}).ok,true);
 assert.equal(p.role,'配偶者');
 assert.equal(s.familyJourney.partnership.stage,'結婚済み');
 assert.equal(s.familyJourney.partnership.weddingStyle,'標準');
 assert.equal(validateGameState(s),true);
});
test('毎月の同棲生活費は1回だけ請求される。家計難易度を高める',()=>{
 const s=state(),p=partner(s);
 assert.equal(familyJourneyAction(s,'cohabit',{personId:p.id}).ok,true);
 const afterSetup=s.finances.cash;
 shift(s);
 advanceFamilyJourney(s,s.timeline);
 assert.equal(afterSetup-s.finances.cash,FAMILY_COSTS.cohabitationMonthly);
 assert.equal(validateGameState(s),true);
});
test('育児費の年代差と公立・学習支援・私立の選択が月次支出に反映される',()=>{
 assert.ok(parentingMonthlyCost(8,'私立中心')>parentingMonthlyCost(8,'学習支援'));
 assert.ok(parentingMonthlyCost(8,'学習支援')>parentingMonthlyCost(8,'公立中心'));
 const s=state();partner(s,'配偶者');
 s.people.push({id:'CHILD-001',name:'子',birth:{year:2019,month:1,day:1},role:'子',relationship:78});
 s.household.memberIds.push('CHILD-001');
 const publicCost=parentingMonthlyCost(8);
 assert.equal(familyJourneyAction(s,'setChildEducation',{personId:'CHILD-001',plan:'私立中心'}).ok,true);
 const after=s.finances.cash;
 advanceFamilyJourney(s,s.timeline);
 assert.equal(after-s.finances.cash,parentingMonthlyCost(8,'私立中心'));
 assert.ok(parentingMonthlyCost(8,'私立中心')>publicCost);
 assert.equal(validateGameState(s),true);
});
test('婚約と結婚は資金・負債と人間関係の条件を必要とする',()=>{
 const s=state(),p=partner(s);
 s.finances.cash=100000;
 assert.match(familyEligibility(s,'engage',p.id),/120,000円/);
 assert.equal(familyJourneyAction(s,'engage',{personId:p.id}).ok,false);
 s.finances.cash=500000;
 s.finances.debt=3000000;
 assert.match(familyEligibility(s,'engage',p.id),/借金/);
});
test('家族の新フィールドは旧v7セーブの読み込みを維持し、破損フィールドは拒否',()=>{
 const s=state();
 assert.equal(validateGameState(s),true);
 const legacy=structuredClone(s);delete legacy.familyJourney.partnership;delete legacy.familyJourney.educationPlans;delete legacy.familyJourney.lastAppliedMonth;
 assert.equal(validateGameState(legacy),true);
 const g=createGameStore({interactiveChoices:true});assert.equal(g.loadState(legacy).ok,true);
 const invalid=structuredClone(s);invalid.familyJourney.partnership={personId:'X',stage:'婚約中',datingSince:12,cohabitingSince:0,engagedSince:20,weddingMonth:40,weddingStyle:'偽'};
 assert.equal(validateGameState(invalid),false);
 const invalidPlan=structuredClone(s);invalidPlan.familyJourney.educationPlans={'CHILD-001':'存在しない'};
 assert.equal(validateGameState(invalidPlan),false);
 assert.equal(validateFamilyProgress(createFamilyProgress()),true);
});
