import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameStore} from '../js/core/gameState.js';
import {validateGameState} from '../js/core/saveSystems.js';
import {QUALIFICATION_CATALOG,qualificationPreview,qualificationCost,qualificationAbility,qualificationAbilityBarrier,
 QUALIFICATION_SKILLS,eligibleStudentQualification,qualificationAction} from '../js/core/qualificationSystems.js';

function student(track='工業高校',cash=0,age=16){
 const g=createGameStore();g.startNewGame();
 const data=structuredClone(g.getState());
 data.timeline={year:2000+age,month:5,ageYears:age,turnsElapsed:age*4+1,monthsElapsed:age*12+4};
 data.education.stage=track==='高専'?'高専':'高校';
 data.education.highSchoolTrack=track;
 data.education.school=track==='高専'?'高等専門学校':track;
 data.finances.cash=cash;
 data.pendingEvents=[];
 assert.equal(validateGameState(data),true);
 assert.equal(g.loadState(data).ok,true);
 return g;
}
test('資格を40件に拡張し、商業・工業・高専向けの科目も含める',()=>{
 assert.equal(QUALIFICATION_CATALOG.length,40);
 assert.ok(['networkBasic','cyberSkills','robotics','quality','commercialPractical','officeTools','dataScience','marketing','digitalArt','tax'].every(id=>QUALIFICATION_CATALOG.some(q=>q.id===id)));
 assert.equal(new Set(QUALIFICATION_CATALOG.map(q=>q.id)).size,40);
});
test('画像再現: 16歳の工業高校生は所持金0円でも学校支援で学習と受験ができる',()=>{
 const g=student('工業高校',0);
 const e=g.getState().education,q=QUALIFICATION_CATALOG.find(x=>x.id==='itEntry');
 assert.equal(eligibleStudentQualification(e,q,16),true);
 assert.deepEqual(qualificationCost(e,q,16),{subsidized:true,preparation:0,exam:0});
 assert.equal(qualificationPreview(e,'itEntry',16).requirement,null);
 const before=qualificationAbility(e,q).relevantSkill;
 assert.equal(g.performAction('prepareQualification',{id:'itEntry'}).ok,true);
 assert.equal(g.getState().finances.cash,0);
 assert.ok(qualificationAbility(g.getState().education,q).relevantSkill>before);
 const nextTurn=structuredClone(g.getState());
 nextTurn.timeline.month=6;nextTurn.timeline.turnsElapsed+=1;nextTurn.timeline.monthsElapsed+=1;
 assert.equal(qualificationAction(nextTurn,'takeQualificationExam',{id:'itEntry'}).ok,true);
 assert.equal(validateGameState(nextTurn),true);
});
test('16歳の商業高校・高専では専門分野に合う新資格の受験条件を満たす',()=>{
 for(const [track,id] of [['商業高校','officeTools'],['高専','electrical'],['工業高校','quality']]){
  const g=student(track,0),p=qualificationPreview(g.getState().education,id,16);
  assert.equal(p.requirement,null,track+':'+id);
  assert.equal(qualificationCost(g.getState().education,p.q,16).exam,0);
 }
 const normal=student('県立高校',0);
 const q=qualificationPreview(normal.getState().education,'itEntry',16);
 assert.match(q.requirement,/18歳/);
 assert.equal(qualificationCost(normal.getState().education,q.q,16).exam,2500);
});
test('高難易度には科目の学力と関連技能の下限が必要で、対策学習で技能を伸ばせる',()=>{
 const g=student('高専',100000),data=structuredClone(g.getState());
 const high=qualificationPreview(data.education,'robotics',16);
 assert.ok(high.barrier);
 assert.equal(high.chance,0);
 const rejected=g.performAction('takeQualificationExam',{id:'robotics'});
 assert.equal(rejected.ok,false);
 assert.match(rejected.reason,/受験できません|必要/);
 const e=structuredClone(data.education);
 e.qualificationTrack={earned:['industrial'],preparation:{robotics:30},attempts:{}};
 e.scores.数学=96;
 e.skills.技術力=50;
 const open=qualificationPreview(e,'robotics',16);
 assert.equal(open.barrier,null);
 assert.ok(open.chance>0);
 const low=e;low.skills.技術力=0;
 assert.ok(qualificationAbilityBarrier(low,open.q));
 assert.equal(qualificationPreview(low,'robotics',16).chance,0);
});
test('資格能力は該当する専門技能で変わり、無関係な運動能力で有利にならない',()=>{
 const g=student('工業高校',100000),e=structuredClone(g.getState().education);
 const q=QUALIFICATION_CATALOG.find(x=>x.id==='industrial');
 const base=qualificationPreview(e,q.id,16);
 e.skills.運動=100;
 const unrelated=qualificationPreview(e,q.id,16);
 assert.equal(unrelated.readiness,base.readiness);
 e.skills.技術力=80;
 const trained=qualificationPreview(e,q.id,16);
 assert.ok(trained.readiness>base.readiness);
 assert.ok(trained.chance>base.chance);
 assert.ok(QUALIFICATION_SKILLS.industrial.includes('技術力'));
});
test('社会人の受験には費用が必要で、残高不足なら保存状態を変えない',()=>{
 const g=student('県立高校',0,18),before=structuredClone(g.getState());
 assert.equal(g.performAction('takeQualificationExam',{id:'itEntry'}).ok,false);
 assert.deepEqual(g.getState(),before);
});
