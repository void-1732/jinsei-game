import test from 'node:test';
import assert from 'node:assert/strict';
import {createLifeData,advanceEducation,chooseMajor} from '../js/core/lifeSystems.js';
import {assignProgram,STUDY_MAJORS,programFor,employmentQualificationBonus,canApplyUniversityRole} from '../js/core/educationPaths.js';
import {employmentScore,careerAction} from '../js/core/careerSystems.js';
import {createEconomyData} from '../js/core/economySystems.js';
import {ensureCompanyMarket} from '../js/core/companySystems.js';
import {createWorldData} from '../js/core/worldSystems.js';
import {createGameStore} from '../js/core/gameState.js';
import {validateGameState} from '../js/core/saveSystems.js';
import {advanceOpportunityMonth} from '../js/core/opportunitySystems.js';

function enroll(school){
 const e=createLifeData('test').education;e.stage='高校';e.school='県立高校';e.grade=3;
 e.schoolPreference.大学=school;
 for(const key in e.scores)e.scores[key]=100;
 advanceEducation(e,{year:2018,month:3},{year:2018,month:4},75);
 assert.equal(e.school,school);assert.equal(e.stage,'大学');
 return e;
}
test('短期大学と専門学校は2年、4年制大学は4年で卒業し資格を取得する',()=>{
 for(const school of ['専門学校','短期大学','国公立大学','私立大学']){
  const edu=enroll(school);
  const years=programFor(school).years;
  assert.equal(edu.program.years,years);
  assert.equal(chooseMajor(edu,'it').ok,true);
  const graduation=2018+years;
  for(let year=2019;year<=graduation;year++)
   advanceEducation(edu,{year,month:3},{year,month:4},100);
  assert.equal(edu.stage,'卒業');
  assert.equal(edu.graduated,true);
  assert.ok(edu.qualifications.includes('IT基礎認定（ゲーム内）'));
  assert.equal(edu.history.some(h=>h.text==='大学を修了'),true);
 }
});
test('旧セーブは4年制進行を維持、短期課程の大学専門職への応募資格は分離',()=>{
 const e=enroll('専門学校');
 assert.equal(canApplyUniversityRole(e),false);
 advanceEducation(e,{year:2020,month:3},{year:2020,month:4},80);
 assert.equal(e.stage,'卒業');
 assert.equal(canApplyUniversityRole(e),false);
 const four=enroll('国公立大学');
 advanceEducation(four,{year:2022,month:3},{year:2022,month:4},90);
 assert.equal(canApplyUniversityRole(four),true);
 const legacy=structuredClone(four);
 delete legacy.program;delete legacy.major;delete legacy.credentialIds;delete legacy.qualifications;
 assert.equal(canApplyUniversityRole(legacy),true);
 const oldCurrent=createLifeData().education;oldCurrent.stage='大学';oldCurrent.school='専門学校';oldCurrent.grade=2;
 advanceEducation(oldCurrent,{year:2020,month:3},{year:2020,month:4},85);
 assert.equal(oldCurrent.stage,'大学','旧保存は意図せず早期卒業しない');
});
test('専攻とゲーム内資格は採用点に反映され、専攻変更だけで資格は即時発行されない',()=>{
 const e=enroll('専門学校');
 const post={id:'tech',focus:'数学'};
 const before=employmentScore(e,post);
 assert.equal(chooseMajor(e,'it').ok,true);
 assert.deepEqual(e.qualifications,[]);
 assert.equal(chooseMajor(e,'unknown').ok,false);
 assert.equal(chooseMajor(e,'it').ok,false);
 advanceEducation(e,{year:2020,month:3},{year:2020,month:4},100);
 assert.equal(employmentQualificationBonus(e,'tech'),13);
 assert.equal(employmentQualificationBonus(e,'shop'),0);
 assert.equal(employmentScore(e,post),Math.min(100,before+13));
 assert.equal(STUDY_MAJORS.length,5);
});
test('学校別学費で現金を減らし教育ローンの二重計上は発生しない',()=>{
 const store=createGameStore({interactiveChoices:true});assert.equal(store.startNewGame().ok,true);
 const base=structuredClone(store.getState());base.pendingEvents=[];base.education.stage='大学';
 assignProgram(base.education,'専門学校',2018);base.education.grade=1;
 base.finances.cash=100000;
 const amount=base.education.program.tuition;
 const oldCash=base.finances.cash;
 advanceOpportunityMonth(base,{year:2018,month:5});
 assert.equal(base.finances.cash,oldCash-amount);
 assert.equal(base.finances.debt,0);
 assert.equal(base.opportunity47.education.tuitionCharged,amount);
 assert.equal(validateGameState(base),true);
});
test('旧セーブデータの学校欄欠落を受け入れ不正な課程は拒否する',()=>{
 const g=createGameStore({interactiveChoices:true});g.startNewGame();
 const legacy=structuredClone(g.getState());
 for(const k of ['program','major','qualifications','credentialIds'])delete legacy.education[k];
 assert.equal(validateGameState(legacy),true);
 assert.equal(g.loadState(legacy).ok,true);
 const v=structuredClone(g.getState());
 assignProgram(v.education,'短期大学',2018);
 assert.equal(validateGameState(v),true);
 v.education.program.years=100;assert.equal(validateGameState(v),false);
});
test('キャリアの大学専攻ルートでは2年制の専門職応募を拒否し4年制は審査する',()=>{
 const f=createEconomyData();ensureCompanyMarket(f);const date={year:2022,month:5},world=createWorldData();
 const short=enroll('専門学校');advanceEducation(short,{year:2020,month:3},{year:2020,month:4},90);
 const blocked=careerAction(structuredClone(f),'applyJob',{postingId:'pro'},{age:22,education:short,date,world});
 assert.equal(blocked.ok,false);
 const long=enroll('国公立大学');advanceEducation(long,{year:2022,month:3},{year:2022,month:4},90);
 const applied=careerAction(structuredClone(f),'applyJob',{postingId:'pro'},{age:22,education:long,date,world});
 assert.equal(applied.ok,true);
 const tech=enroll('専門学校');chooseMajor(tech,'it');
 advanceEducation(tech,{year:2020,month:3},{year:2020,month:4},90);
 const qualifiedFinance=structuredClone(f);
 const qualified=careerAction(qualifiedFinance,'applyJob',{postingId:'tech'},{age:20,education:tech,date,world,interviewBonus:40});
 assert.equal(qualified.ok,true);assert.equal(qualified.passed,true);
 assert.equal(qualifiedFinance.career.monthlySalary,290000+13000);
});
