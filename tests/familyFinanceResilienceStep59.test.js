import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameStore} from '../js/core/gameState.js';
import {validateGameState,createSaveRepository} from '../js/core/saveSystems.js';
import {ensureHouseholdExtension,advanceHouseholdMonth,changeHouseholdRole,setSpouseLeave,householdSummary} from '../js/core/householdExtension.js';
import {advanceChildEducation,childEducationSummary} from '../js/core/childEducationProgress.js';
import {advanceParentWellbeing,parentSummary} from '../js/core/parentWellbeing.js';
import {advanceHardship,requestHouseholdRelief,hardshipSummary} from '../js/core/householdHardship.js';
import {takeEntranceDecision,retryUniversityEntrance,examOdds} from '../js/core/examRetake.js';
import {assignProgram} from '../js/core/educationPaths.js';
import {turnActionCategory} from '../js/core/adultActionBudget.js';

function adult(){
 const g=createGameStore({interactiveChoices:true});assert.equal(g.startNewGame().ok,true);
 const s=structuredClone(g.getState());s.pendingEvents=[];s.timeline={year:2026,month:5,ageYears:26,turnsElapsed:101,monthsElapsed:316};s.turnActions={turn:101,used:0,lastAction:null,categories:[]};s.finances.cash=600000;
 assert.equal(validateGameState(s),true);assert.equal(g.loadState(s).ok,true);
 return g;
}
function family(){
 const s=structuredClone(adult().getState());
 const spouse={id:'FRIEND-001',name:'配偶者',birth:{year:2000,month:1,day:1},role:'配偶者',relationship:85};
 s.people.push(spouse);s.household.memberIds.push(spouse.id);
 const child={id:'CHILD-001',name:'子ども',birth:{year:2025,month:7,day:1},role:'子',relationship:80};
 s.people.push(child);s.household.memberIds.push(child.id);return s;
}
test('Q1 配偶者家計負担は一か月一回で保存され、育休と家事分担は利用できる',()=>{
 const s=family(),date={year:2026,month:6};const before=s.finances.cash;
 assert.equal(changeHouseholdRole(s,{division:'spouseMain'}).ok,true);
 assert.equal(advanceHouseholdMonth(s,date).length,0);
 const paid=s.finances.cash-before;assert.ok(paid>0);
 assert.equal(advanceHouseholdMonth(s,date).length,0);assert.equal(s.finances.cash-before,paid);
 assert.equal(setSpouseLeave(s).ok,true);
 const next=advanceHouseholdMonth(s,{year:2026,month:7});assert.ok(Array.isArray(next));
 assert.equal(householdSummary(s).employment,'leave');
 assert.equal(validateGameState(s),true);
});
test('Q2 子どもの成績と教育方針・進学は年齢別、同月二重処理しない',()=>{
 const s=family(),child=s.people.find(p=>p.role==='子');child.birth.year=2011;child.birth.month=1;
 s.familyJourney.educationPlans[child.id]='学習支援';s.timeline.month=3;
 const event=advanceChildEducation(s,{year:2026,month:4});
 assert.equal(event.length,1);
 assert.equal(advanceChildEducation(s,{year:2026,month:4}).length,0);
 const result=childEducationSummary(s,child);
 assert.equal(result.stage,'高校');assert.ok(result.score>=35);
 assert.equal(validateGameState(s),true);
});
test('Q3 試験難易度と運は確率に反映、再受験は年一回・旧コース保持',()=>{
 const s=structuredClone(adult().getState()),e=s.education;
 const tough=examOdds(e,'大学','難関大学'),easy=examOdds(e,'大学','地域大学');
 assert.ok(tough.chance<easy.chance);
 assert.deepEqual(takeEntranceDecision(e,'大学','難関大学',s.timeline,33),takeEntranceDecision(e,'大学','難関大学',s.timeline,33));
 e.stage='大学';e.grade=1;e.school='地域大学';assignProgram(e,'地域大学',2026);
 const r=retryUniversityEntrance(s,{school:'難関大学'});
 assert.equal(r.ok,true);assert.equal(retryUniversityEntrance(s,{school:'総合大学'}).ok,false);
 assert.equal(validateGameState(s),true);
});
test('Q4 困窮が続くと状態変化、支援は間隔制限・家計へ一度だけ加算',()=>{
 const s=structuredClone(adult().getState());s.finances.cash=0;s.finances.debt=200000;s.finances.career.monthlySalary=0;
 for(const month of [6,7,8])advanceHardship(s,{year:2026,month});
 assert.equal(hardshipSummary(s).status,'困窮');
 const before=s.finances.cash,first=requestHouseholdRelief(s);
 assert.equal(first.ok,true);assert.equal(s.finances.cash-before,25000);
 assert.equal(requestHouseholdRelief(s).ok,false);
 assert.equal(validateGameState(s),true);
});
test('Q5 親の健康推移は年齢・誕生月を反映、保存できる',()=>{
 const s=structuredClone(adult().getState()),parent=s.people.find(p=>p.role==='父');
 const first=advanceParentWellbeing(s,{year:2026,month:6});
 assert.ok(Array.isArray(first));
 const status=parentSummary(s,parent);
 assert.ok(status.health>=15&&status.health<=100);
 assert.equal(advanceParentWellbeing(s,{year:2026,month:6}).length,0);
 assert.equal(validateGameState(s),true);
});
test('旧セーブの任意フィールドを欠いた状態から新機能を開始できる',()=>{
 const g=adult(),s=structuredClone(g.getState());
 delete s.householdExtension;delete s.hardship;delete s.familyJourney.childStudies;delete s.familyJourney.parentWellbeing;
 assert.equal(validateGameState(s),true);
 const map=new Map(),storage={getItem:key=>map.get(key)??null,setItem:(key,val)=>map.set(key,val),removeItem:key=>map.delete(key)};
 const save=createSaveRepository(storage);assert.equal(save.save('手動保存1',s).ok,true);
 const restored=createGameStore({interactiveChoices:true});assert.equal(restored.loadState(save.load('手動保存1').state).ok,true);
 assert.equal(turnActionCategory('changeHouseholdRole'),'人物・家族');
 assert.equal(turnActionCategory('requestHouseholdRelief'),'生活・資産');
 assert.equal(turnActionCategory('retryUniversityEntrance'),'学業');
});
