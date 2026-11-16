import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameStore} from '../js/core/gameState.js';
import {validateGameState} from '../js/core/saveSystems.js';
import {QUALIFICATION_CATALOG} from '../js/core/qualificationSystems.js';
import {createRareLifeEvent,resolveRareLifeChoice,createRareLifeProgress,rareEventEligible,validateRareLifeProgress} from '../js/core/rareLifeEvents.js';
import {PROPERTY_COVERAGE,propertyInsuranceBenefit,livingAction,advanceLiving,validateLiving} from '../js/core/livingSystems.js';
import {readFileSync} from 'node:fs';
const file=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const fixture=()=>{
 const g=createGameStore();g.startNewGame();
 const s=structuredClone(g.getState());
 s.timeline={year:2028,month:1,ageYears:28,turnsElapsed:190,monthsElapsed:336};
 s.finances.cash=400000;
 return s;
};
const eventFor=(s,random=.001)=>{
 const date={year:s.timeline.year,month:s.timeline.month};
 return createRareLifeEvent(s,date,s.timeline.turnsElapsed,s.timeline.ageYears,random);
};
test('取得済み資格は選択可能な一覧から除外し、取得済み一覧には残す',()=>{
 const panel=file('js/ui/qualificationPanel.js');
 assert.match(panel,/QUALIFICATION_CATALOG\.filter\(q=>!qualificationPreview\(e,q.id,age\).earned\)/);
 assert.match(panel,/取得資格/);
 assert.match(panel,/すべて取得済みです/);
 const q=QUALIFICATION_CATALOG.find(x=>x.id==='itEntry');
 assert.ok(q);
});
test('希少イベントは誕生日の年1回だけ抽選し、36か月以内には続発しない',()=>{
 const s=fixture();
 assert.equal(rareEventEligible(s,{year:2028,month:1},28,.30),true);
 assert.equal(rareEventEligible(s,{year:2028,month:2},28,.01),false);
 assert.equal(rareEventEligible(s,{year:2028,month:1},28,.90),false);
 const e=eventFor(s);assert.equal(e.rareLife,true);assert.equal(e.rareKind,'fire');
 resolveRareLifeChoice(s,e,e.options[0]);
 assert.equal(s.rareLife.counts.fire,1);
 assert.equal(eventFor(s,.001),null);
 s.timeline.year=2030;
 assert.equal(eventFor(s,.001),null);
 s.timeline.year=2031;
 assert.ok(eventFor(s,.001));
});
test('火災保険は火災損害を減らすが、火災保険単体では地震や洪水を補償しない',()=>{
 const l={propertyCoverage:'火災保険'};
 assert.equal(propertyInsuranceBenefit(l,'fire',100000),70000);
 assert.equal(propertyInsuranceBenefit(l,'earthquake',100000),0);
 assert.equal(propertyInsuranceBenefit(l,'flood',100000),0);
 assert.equal(propertyInsuranceBenefit({propertyCoverage:'総合災害保険'},'earthquake',100000),40000);
 assert.equal(propertyInsuranceBenefit({propertyCoverage:'火災・水災保険'},'flood',100000),60000);
});
test('防災準備+総合保険は地震・洪水の自己負担を減らし、保険は資金を不正に増やさない',()=>{
 for(const kindIndex of [[1,'earthquake'],[2,'flood']]){
  const [index,kind]=kindIndex;
  const random=index===1?.08:.16;
  const noCoverage=fixture();noCoverage.finances.living.propertyCoverage='未加入';
  const covered=structuredClone(noCoverage);covered.finances.living.propertyCoverage='総合災害保険';
  covered.surprise53.prepared.disaster=5;
  const e=eventFor(noCoverage,random),e2=eventFor(covered,random);
  assert.ok(e&&e2);assert.equal(e.rareKind,kind);assert.equal(e2.rareKind,kind);
  resolveRareLifeChoice(noCoverage,e,e.options[0]);
  resolveRareLifeChoice(covered,e2,e2.options[0]);
  assert.ok(covered.rareLife.history[0].loss<noCoverage.rareLife.history[0].loss);
  assert.ok(covered.rareLife.history[0].insured>0);
  assert.ok(covered.finances.cash<=400000);
  assert.ok(covered.rareLife.history[0].prevented>0);
 }
});
test('未加入・火災保険・総合災害保険で月額保険料と既存医療保険が独立する',()=>{
 const s=fixture(),l=s.finances.living;
 const before=s.finances.cash;
 assert.equal(livingAction(s.finances,s.health,'setPropertyCoverage',{plan:'火災保険'},{age:28,date:s.timeline}).ok,true);
 assert.equal(l.insurance,'未加入');
 advanceLiving(s.finances,{year:2028,month:1},28);
 assert.ok(s.finances.ledger.some(x=>x.label==='住宅・家財保険料'&&x.amount===-1300));
 assert.ok(s.finances.cash<before);
 assert.equal(livingAction(s.finances,s.health,'setPropertyCoverage',{plan:'総合災害保険'},{age:28,date:s.timeline}).ok,true);
 assert.equal(l.insurance,'未加入');
 assert.equal(validateLiving(l),true);
 assert.equal(livingAction(s.finances,s.health,'setPropertyCoverage',{plan:'不正'},{age:28,date:s.timeline}).ok,false);
 assert.equal(PROPERTY_COVERAGE['総合災害保険'].premium,2800);
});
test('旧セーブとの互換性、イベント履歴の上限と破損値検査',()=>{
 const s=fixture();
 delete s.rareLife;delete s.finances.living.propertyCoverage;
 assert.equal(validateGameState(s),true);
 assert.equal(validateRareLifeProgress(undefined),true);
 const g=createGameStore();assert.equal(g.loadState(s).ok,true);
 const p=createRareLifeProgress();assert.equal(validateRareLifeProgress(p),true);
 const broken=structuredClone(p);broken.counts.fire=-1;
 assert.equal(validateRareLifeProgress(broken),false);
 const badCoverage=structuredClone(s);badCoverage.finances.living.propertyCoverage='架空の偽保険';
 assert.equal(validateGameState(badCoverage),false);
});
