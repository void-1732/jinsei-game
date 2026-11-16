import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameStore} from '../js/core/gameState.js';
import {createLifeData} from '../js/core/lifeSystems.js';
import {createAcademicPractice,advanceAcademicPractice,recordAcademicStudy,validateAcademicPractice,academicPracticeSummary} from '../js/core/academicPractice.js';
import {ensureFamilyProgress,familyJourneyAction,familyEligibility} from '../js/core/familyJourney.js';
import {validateGameState} from '../js/core/saveSystems.js';

const date=(year,month)=>({year,month});
const education=()=>{
 const e=createLifeData('生徒').education;
 e.stage='高校';return e;
};
test('学校に在籍し3か月未復習の科目だけ1点低下し、同月の二重適用を防ぐ',()=>{
 const e=education(),baseline=e.scores.数学;
 advanceAcademicPractice(e,date(2020,1));
 recordAcademicStudy(e,date(2020,1),['数学']);
 for(let m=2;m<=4;m++)advanceAcademicPractice(e,date(2020,m));
 assert.equal(e.scores.数学,baseline-1);
 assert.equal(e.scores.国語,49);
 assert.equal(advanceAcademicPractice(e,date(2020,4)).applied,false);
 assert.equal(e.scores.数学,49);
 recordAcademicStudy(e,date(2020,4),['数学']);
 for(let m=5;m<=7;m++)advanceAcademicPractice(e,date(2020,m));
 assert.equal(e.scores.数学,48);
});
test('科目別復習は低下を止め、勉強再開で回復できる',()=>{
 const e=education();
 advanceAcademicPractice(e,date(2020,1));
 for(let m=2;m<=12;m++){
  if(m===3||m===6||m===9)recordAcademicStudy(e,date(2020,m),['理科']);
  advanceAcademicPractice(e,date(2020,m));
 }
 assert.equal(e.scores.理科,50);
 assert.ok(e.scores.国語<50);
 assert.ok(academicPracticeSummary(e,date(2020,12)).atRisk.includes('国語'));
});
test('小学生の低下は6か月に1回、学力は35以下に下がらず、卒業後は減少しない',()=>{
 const e=education();e.stage='小学校';e.scores.数学=36;
 advanceAcademicPractice(e,date(2008,1));
 for(let m=2;m<=12;m++)advanceAcademicPractice(e,date(2008,m));
 assert.equal(e.scores.数学,35);
 e.stage='卒業';
 const old={...e.scores};
 advanceAcademicPractice(e,date(2009,1));
 assert.deepEqual(e.scores,old);
});
test('旧v7セーブに学力維持欄がなくても受け付け、破損データを拒否する',()=>{
 const g=createGameStore({interactiveChoices:true});g.startNewGame();
 const legacy=structuredClone(g.getState());delete legacy.education.academicPractice;
 assert.equal(validateGameState(legacy),true);
 assert.equal(g.loadState(legacy).ok,true);
 assert.equal(validateAcademicPractice(undefined),true);
 const updated=structuredClone(g.getState());
 updated.education.academicPractice=createAcademicPractice(2020*12, Object.keys(updated.education.scores));
 assert.equal(validateGameState(updated),true);
 updated.education.academicPractice.lastStudied.英語=-10000;
 assert.equal(validateGameState(updated),false);
});
test('月単位で遊ぶモードは0歳から1か月、旧スクリプト用モードは3か月を維持',()=>{
 const game=createGameStore({interactiveChoices:true});
 game.startNewGame();const s=structuredClone(game.getState());s.pendingEvents=[];
 assert.equal(game.loadState(s).ok,true);
 assert.equal(game.advanceTurn().months,1);
 assert.equal(game.getState().timeline.month,2);
 const old=createGameStore();old.startNewGame();
 assert.equal(old.advanceTurn().months,3);
});
test('旧セーブの交際相手を読み込んでも同棲に進め、婚約歴は勝手に付与しない',()=>{
 const g=createGameStore({interactiveChoices:true});g.startNewGame();
 const s=structuredClone(g.getState());
 s.timeline={year:2027,month:5,ageYears:27,turnsElapsed:200,monthsElapsed:328};
 s.pendingEvents=[];
 s.finances.cash=500000;
 s.people.push({id:'FRIEND-001',name:'旧交際相手',role:'交際相手',birth:{year:2000,month:1,day:1},relationship:90});
 delete s.familyJourney.partnership;
 assert.equal(validateGameState(s),true);
 assert.equal(g.loadState(s).ok,true);
 const after=g.getState();
 assert.equal(after.familyJourney.partnership?.stage,'交際中');
 assert.equal(after.familyJourney.partnership.engagedSince,-1);
 assert.equal(familyEligibility(after,'cohabit','FRIEND-001'),null);
 assert.equal(g.performAction('cohabit',{personId:'FRIEND-001'}).ok,true);
});
test('友人の関係値が60を越えても話し合い2回が必要、面会で解除できる',()=>{
 const g=createGameStore({interactiveChoices:true});g.startNewGame();
 const s=structuredClone(g.getState());
 s.timeline={year:2027,month:5,ageYears:27,turnsElapsed:200,monthsElapsed:328};
 s.pendingEvents=[];
 s.people.push({id:'FRIEND-001',name:'友人',role:'友人',birth:{year:2000,month:1,day:1},relationship:90});
 s.familyJourney.connections['FRIEND-001']={knownSince:2027*12-12,datingSince:-1,futureTalks:0,lastTalk:-1,lastContact:-1};
 assert.equal(validateGameState(s),true);
 assert.equal(g.loadState(s).ok,true);
 assert.match(familyEligibility(g.getState(),'date','FRIEND-001'),/話を2回/);
 assert.equal(g.performAction('courtship',{personId:'FRIEND-001'}).ok,true);
 const changed=g.getState();
 assert.equal(changed.familyJourney.connections['FRIEND-001'].futureTalks,1);
});
