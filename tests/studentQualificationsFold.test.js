import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGameStore} from '../js/core/gameState.js';
import {createEconomyData} from '../js/core/economySystems.js';
import {createLifeData} from '../js/core/lifeSystems.js';
import {qualificationPreview,qualificationAction,STUDENT_QUALIFICATIONS} from '../js/core/qualificationSystems.js';
import {careerAction,careerTrainingPreview,employmentScore,JOB_POSTINGS} from '../js/core/careerSystems.js';
import {createFoldState} from '../js/ui/foldState.js';
import {turnActionCategory} from '../js/core/adultActionBudget.js';
import {validateGameState} from '../js/core/saveSystems.js';

const skill=(track,age=16)=>{
 const g=createGameStore();g.startNewGame();
 const s=structuredClone(g.getState());
 s.timeline={year:2016,month:5,ageYears:age,turnsElapsed:65,monthsElapsed:196};
 s.education.stage=track==='高専'?'高専':'高校';
 s.education.school=track==='高専'?'高等専門学校':track;
 s.education.highSchoolTrack=track;
 s.finances.cash=120000;
 s.pendingEvents=[];
 assert.equal(validateGameState(s),true);
 assert.equal(g.loadState(s).ok,true);
 return g;
};

test('工業高校・商業高校・高専は15～17歳で専攻に合った資格の受験・対策が可能',()=>{
 for(const [track,id] of [['工業高校','industrial'],['商業高校','bookkeeping3'],['高専','industrialAdvanced']]){
  const g=skill(track);
  const preview=qualificationPreview(g.getState().education,id,16);
  if(id==='industrialAdvanced')assert.match(preview.requirement,/ものづくり技能認定/);
  else assert.equal(preview.requirement,null);
  const target=id==='industrialAdvanced'?'industrial':id;
  const result=g.performAction('prepareQualification',{id:target});
  assert.equal(result.ok,true,result.reason);
  assert.equal(g.getState().education.qualificationTrack.preparation[target],10);
  assert.equal(g.performAction('takeQualificationExam',{id:target}).ok,true);
  assert.equal(validateGameState(g.getState()),true);
 }
 assert.equal(turnActionCategory('takeQualificationExam'), '学業');
 assert.equal(turnActionCategory('prepareQualification'), '学業');
 assert.deepEqual(STUDENT_QUALIFICATIONS['商業高校'].slice(0,2),['bookkeeping3','bookkeeping2']);
});
test('普通高校・年齢14歳・専門免許は未成年の自由受験が不可',()=>{
 const g=skill('普通高校');
 assert.match(qualificationPreview(g.getState().education,'itEntry',16).requirement,/18歳/);
 assert.equal(g.performAction('takeQualificationExam',{id:'itEntry'}).ok,false);
 const younger=skill('工業高校',14);
 assert.equal(younger.performAction('prepareQualification',{id:'industrial'}).ok,false);
 const technical=skill('高専');
 assert.match(qualificationPreview(technical.getState().education,'physician',16).requirement,/24歳/);
 assert.equal(technical.performAction('takeQualificationExam',{id:'physician'}).ok,false);
});
test('職業研修で技能・認定条件・求人採用点の実際の変化が可視化される',()=>{
 const e=createLifeData('技能試験').education,f=createEconomyData(),context={age:16,date:{year:2016,month:5},education:e};
 const before=careerTrainingPreview(e,'tech');
 assert.equal(before.now,0);assert.equal(before.next,12);assert.equal(before.gain,12);
 assert.equal(before.relatedJob,'技術職');assert.ok(before.hiringGain>=0);
 const oldEmployment=employmentScore(e,JOB_POSTINGS.find(x=>x.id==='tech'));
 for(let i=0;i<4;i++)assert.equal(careerAction(f,'careerTraining',{postingId:'tech'},context).ok,true);
 const after=careerTrainingPreview(e,'tech');
 assert.equal(after.now,48);assert.equal(after.already,true);
 assert.ok(e.qualifications.some(q=>q.includes('情報技術技能認定')));
 assert.ok(employmentScore(e,JOB_POSTINGS.find(x=>x.id==='tech'))>oldEmployment);
 assert.ok(!after.awarded);
 assert.equal(qualificationPreview(e,'itEntry',16).earned,false);
});
function fakeDetail(open,foldKey='career-training'){
 const handlers={};
 return {open,dataset:{foldKey},className:'phase4-extra',
  querySelector(sel){return sel===':scope > summary'?{textContent:'職業別研修・技能認定'}:null;},
  closest(){return null;},
  addEventListener(type,cb){handlers[type]=cb;},
  trigger(){handlers.toggle?.();}};
}
test('ターン再描画とページ移動をまたいで折りたたみの開閉・選択画面を維持',()=>{
 const cache=new Map(),storage={getItem:key=>cache.get(key)??null,setItem:(key,v)=>cache.set(key,v)};
 const folds=createFoldState(storage);
 const current=fakeDetail(true);
 const root={querySelectorAll:()=>[current]};
 folds.capture(root,'EDU-05');
 const next=fakeDetail(false);
 folds.restore({querySelectorAll:()=>[next]},'EDU-05');
 assert.equal(next.open,true);
 next.open=false;next.trigger();
 const reload=createFoldState(storage);
 const closed=fakeDetail(true);
 reload.restore({querySelectorAll:()=>[closed]},'EDU-05');
 assert.equal(closed.open,false);
 const other=fakeDetail(true);
 reload.restore({querySelectorAll:()=>[other]},'EDU-04');
 assert.equal(other.open,true);
 const topic=readFileSync(new URL('../js/ui/topicPage.js',import.meta.url),'utf8');
 assert.match(topic,/selectedByTopic/);
 assert.match(topic,/foldState\.capture/);
 const app=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
 assert.match(app,/lastRenderedFoldScreen/);
});
