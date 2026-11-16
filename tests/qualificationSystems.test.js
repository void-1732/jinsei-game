import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGameStore} from '../js/core/gameState.js';
import {validateGameState} from '../js/core/saveSystems.js';
import {QUALIFICATION_CATALOG,qualificationPreview,qualificationAction,qualificationRequirements,
 jobQualificationInfo,hiringProbability,hasQualification,recommendedQualifications} from '../js/core/qualificationSystems.js';
import {employmentScore,ALL_JOB_POSTINGS,JOB_POSTINGS,careerAction} from '../js/core/careerSystems.js';
import {careerEligibility} from '../js/core/careerMarketplace.js';
const snippet=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function adult(){
 const g=createGameStore();g.startNewGame();
 const s=structuredClone(g.getState());
 s.timeline={year:2026,month:5,ageYears:26,turnsElapsed:110,monthsElapsed:316};
 s.finances.cash=500000;
 s.pendingEvents=[];s.education.stage='卒業';s.education.graduated=true;
 assert.equal(g.loadState(s).ok,true);
 return g;
}
test('資格40種類と5段階難易度、専攻・医学部などのおすすめを表示',()=>{
 assert.equal(QUALIFICATION_CATALOG.length,40);
 assert.ok(QUALIFICATION_CATALOG.some(q=>q.id==='physician'&&q.level===5));
 assert.ok(QUALIFICATION_CATALOG.some(q=>q.id==='dentist'&&q.level===5));
 assert.equal(new Set(QUALIFICATION_CATALOG.map(q=>q.id)).size,40);
 const e=structuredClone(adult().getState().education);
 e.program={school:'医学部',years:6,tuition:75000,type:'6年制医学課程',startYear:2018};
 assert.equal(recommendedQualifications(e)[0].id,'physician');
});
test('学歴制限・段階資格は満たさずに受験できない',()=>{
 const g=adult();
 const med=g.performAction('takeQualificationExam',{id:'physician'});
 assert.equal(med.ok,false);assert.match(med.reason,/医学課程修了/);
 const expert=g.performAction('takeQualificationExam',{id:'itAdvanced'});
 assert.equal(expert.ok,false);assert.match(expert.reason,/情報技術者認定/);
 assert.equal(g.getState().education.qualificationTrack,undefined);
});
test('成人は異なる資格の対策・受験に自由に挑戦できるが同月同資格は1回まで',()=>{
 const g=adult(),s=structuredClone(g.getState());
 for(const k of Object.keys(s.education.scores))s.education.scores[k]=75;
 assert.equal(g.loadState(s).ok,true);
 const before=g.getState().finances.cash;
 const prep=g.performAction('prepareQualification',{id:'itEntry'});
 assert.equal(prep.ok,true);assert.equal(g.getState().finances.cash,before-2000);
 const first=g.performAction('takeQualificationExam',{id:'itEntry'});
 assert.equal(first.ok,true);
 if(first.passed){
  assert.equal(hasQualification(g.getState().education,'itEntry'),true);
 }else{
  assert.equal(g.performAction('takeQualificationExam',{id:'itEntry'}).ok,false);
 }
 assert.equal(validateGameState(g.getState()),true);
});
test('資格取得で希望業種の採用評価が増え、必須資格の不足は応募できない',()=>{
 const g=adult();const e=structuredClone(g.getState().education);
 const tech=ALL_JOB_POSTINGS.find(p=>p.id==='cyber'),software=ALL_JOB_POSTINGS.find(p=>p.id==='software');
 assert.match(careerEligibility(tech,e,{},26),/必須資格/);
 const before=employmentScore(e,software);
 e.qualificationTrack={earned:['itFundamental','itAdvanced'],preparation:{},attempts:{}};
 assert.equal(careerEligibility(tech,e,{},26),null);
 assert.ok(employmentScore(e,software)>before);
 assert.equal(jobQualificationInfo(e,software.id).bonus,16);
 assert.ok(hiringProbability(80,60)>hiringProbability(60,60));
 assert.equal(JOB_POSTINGS.length,6);
});
test('医学部・歯学部修了後の資格は取得前の求人応募を防ぐ',()=>{
 const g=adult();const e=structuredClone(g.getState().education);
 e.degree='医学課程修了';
 const q=qualificationPreview(e,'physician',26);
 assert.equal(q.requirement,null);
 const doctor=ALL_JOB_POSTINGS.find(p=>p.id==='doctor');
 assert.match(careerEligibility(doctor,e,{},26),/ゲーム内資格試験/);
 e.licenses=['医師'];
 assert.equal(careerEligibility(doctor,e,{},26),null);
});
test('新しい資格台帳はセーブv7互換で、未知の資格・偽の値を拒否',()=>{
 const g=adult();const old=structuredClone(g.getState());
 delete old.education.qualificationTrack;
 assert.equal(validateGameState(old),true);
 const upgraded=structuredClone(old);
 upgraded.education.qualificationTrack={earned:['bookkeeping3'],preparation:{bookkeeping2:10},attempts:{bookkeeping2:{count:2,lastMonth:2026*12+5}}};
 assert.equal(validateGameState(upgraded),true);
 const restored=createGameStore();assert.equal(restored.loadState(upgraded).ok,true);
 const invalid=structuredClone(upgraded);invalid.education.qualificationTrack.earned=['fake-qualification'];
 assert.equal(validateGameState(invalid),false);
 const forged=structuredClone(upgraded);forged.education.qualificationTrack.preparation.bookkeeping2=900;
 assert.equal(validateGameState(forged),false);
});
test('UIは既存学業・仕事画面内で取得済み/能力/難易度/採用資格を表示',()=>{
 const panel=snippet('js/ui/qualificationPanel.js'),school=snippet('js/ui/lifePanels.js'),
 work=snippet('js/ui/economyPanels.js'),store=snippet('js/core/gameState.js');
 assert.match(panel,/取得資格/);assert.match(panel,/ゲーム内合格見込み/);
 assert.match(panel,/qualificationDifficulty/);assert.match(school,/renderQualificationPanel/);
 assert.match(work,/jobQualificationInfo/);assert.match(work,/renderQualificationPanel/);
 assert.match(store,/takeQualificationExam/);
});
