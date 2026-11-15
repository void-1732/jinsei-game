import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGameStore} from '../js/core/gameState.js';
import {validateGameState,createSaveRepository} from '../js/core/saveSystems.js';
import {createSurpriseProgress,ensureSurpriseProgress,validateSurpriseProgress,prepareForSurprise,createSurpriseEvent,resolveSurpriseChoice,surpriseSummary} from '../js/core/surpriseSystems.js';
import {hasImportantTurnEvent} from '../js/core/balanceSystems.js';
import {createStoryEvent} from '../js/core/storyEvents.js';
import {consequenceHealthProtection} from '../js/core/consequenceSystems.js';
const start=(seed=521)=>{const g=createGameStore({interactiveChoices:true});assert.equal(g.startNewGame({name:'STEP53',seed,birth:{year:2000,month:1,day:1}}).ok,true);return g;};
const answer=g=>{const e=g.getState().pendingEvents.find(x=>x.type==='choice');if(!e)return null;const r=g.performAction('resolveChoice',{eventId:e.id,choice:e.options[0].id});assert.equal(r.ok,true,r.reason);return e;};
function aged(age=22,seed=521){
 const s=structuredClone(start(seed).getState());s.timeline={year:2000+age,month:1,ageYears:age,turnsElapsed:age*10,monthsElapsed:age*12};
 s.pendingEvents=[];s.finances.cash=250000;s.health.physical=75;s.health.mental=75;
 return s;
}
function eventFor(s,kind,turn=31){
 const k=['disaster','traffic','fraud','illness','luck'];
 // kind is selected from the eligible set by a fraction of .67; no external randomness.
 const possibilities=k.filter(x=>x!==s.surprise53.lastKind&&(s.timeline.ageYears>=18||!['fraud','luck'].includes(x))&&(x!=='illness'||!s.health.illness));
 const index=possibilities.indexOf(kind);assert.ok(index>=0);
 const roll=.67*(index+.25)/possibilities.length;
 const e=createSurpriseEvent(s,{year:s.timeline.year,month:s.timeline.month},turn,s.timeline.ageYears,roll);
 assert.equal(e.surpriseKind,kind);return e;
}
function memoryStorage(){const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}

test('5種類の出来事と5段階の備えは、旧セーブを変更せず読み込める',()=>{
 const p=createSurpriseProgress();assert.equal(validateSurpriseProgress(p),true);
 const g=start(),base=g.getState(),old=structuredClone(base);delete old.surprise53;
 assert.equal(validateGameState(old),true);
 assert.equal(g.loadState(old).ok,true);
 assert.deepEqual(g.getState().surprise53,createSurpriseProgress());
 const bad=structuredClone(base);bad.surprise53.prepared.security=999;
 assert.equal(validateGameState(bad),false);
 const bad2=structuredClone(base);bad2.surprise53.history=[{kind:'fraud',title:'偽',age:22}];
 assert.equal(validateGameState(bad2),false);
});

test('手動の備えは1ターン1回・所持金・年齢・最大値の制約を守る',()=>{
 const g=start();answer(g);
 assert.equal(g.performAction('safetyPrep',{area:'disaster'}).ok,false); // age 0
 // Make player old enough for preparing; state and timeline must be coherent.
 const s=aged(22),oldCash=s.finances.cash;
 assert.equal(prepareForSurprise(s,'disaster').ok,true);
 assert.equal(s.finances.cash,oldCash-2400);
 assert.equal(s.finances.totals.expenses,2400);
 assert.equal(s.surprise53.prepared.disaster,1);
 for(let i=0;i<4;i++)assert.equal(prepareForSurprise(s,'disaster').ok,true);
 assert.equal(prepareForSurprise(s,'disaster').ok,false);
 s.finances.cash=0;assert.equal(prepareForSurprise(s,'security').ok,false);
 assert.equal(s.finances.debt,0);
 assert.equal(validateSurpriseProgress(s.surprise53),true);
 const actual=start();const staged=aged(22);assert.equal(actual.loadState(staged).ok,true);
 assert.equal(actual.performAction('safetyPrep',{area:'security'}).ok,true);
 assert.equal(actual.performAction('safetyPrep',{area:'health'}).ok,false);
 assert.equal(actual.getState().turnActions.used,1);
});

test('直前の出来事を避け、条件外の詐欺や長期の連発を防ぐ',()=>{
 const s=aged(22);for(const kind of ['disaster','traffic','fraud','illness','luck']){
  const e=eventFor(s,kind);assert.equal(e.options.length,3);assert.equal(e.story,true);
  assert.equal(e.surprise53,true);assert.equal(hasImportantTurnEvent([e]),true);
 }
 const x=eventFor(s,'fraud');assert.equal(createSurpriseEvent(s,{year:2022,month:1},32,22,.1),null);
 assert.equal(createSurpriseEvent(s,{year:2022,month:1},31,22,.9),null);
 s.surprise53.lastKind='fraud';s.surprise53.lastTurn=30;
 assert.equal(createSurpriseEvent(s,{year:2022,month:1},31,22,.01),null);
 s.timeline.ageYears=12;
 for(let i=0;i<10;i++){
  const e=createSurpriseEvent(s,{year:2012,month:1},49,12,.67*(i+.5)/10);
  assert.notEqual(e?.surpriseKind,'fraud');assert.notEqual(e?.surpriseKind,'luck');
 }
 assert.equal(x.title,'不審な支払いの請求');
});

test('詐欺に遭っても支出を台帳へ一度だけ記録し、残額不足は負債にする',()=>{
 const s=aged(22);s.finances.cash=5000;
 const e=eventFor(s,'fraud');
 s.timeline.turnsElapsed=e.turn;s.pendingEvents=[e];
 const initial=s.finances.totals.expenses,old=s.finances.debt;
 const changes=resolveSurpriseChoice(s,e,e.options[1]);
 assert.equal(s.finances.cash,0);assert.equal(s.finances.debt,old+30000);
 assert.equal(s.finances.totals.expenses,initial+35000);
 assert.equal(s.surprise53.totalLoss,35000);
 assert.ok(changes.some(x=>x.includes('支出')));
 assert.equal(s.finances.ledger.at(-1).amount,-35000);
 assert.equal(s.surprise53.counts.fraud,1);
 assert.equal(validateGameState(s),true);
});

test('過去の防犯準備と社会的な助け合いは詐欺被害を抑え、健康の備えは事故を緩和',()=>{
 const base=aged(22);const prepared=structuredClone(base);
 prepared.surprise53.prepared.security=5;
 prepared.world.era52.choices.community=4;
 prepared.world.era52.choices.frugality=3;
 const a=eventFor(base,'fraud'),b=eventFor(prepared,'fraud');
 base.timeline.turnsElapsed=a.turn;prepared.timeline.turnsElapsed=b.turn;
 resolveSurpriseChoice(base,a,a.options[1]);resolveSurpriseChoice(prepared,b,b.options[1]);
 assert.ok(prepared.surprise53.totalLoss<base.surprise53.totalLoss);
 assert.ok(prepared.surprise53.history[0].prevented>0);
 const injury=aged(22),protectedState=structuredClone(injury);
 protectedState.surprise53.prepared.health=5;
 const x=eventFor(injury,'traffic'),y=eventFor(protectedState,'traffic');
 const startHealth=injury.health.physical;
 resolveSurpriseChoice(injury,x,x.options[1]);resolveSurpriseChoice(protectedState,y,y.options[1]);
 assert.ok(protectedState.health.physical>injury.health.physical);
 assert.ok(protectedState.health.physical<=startHealth);
});

test('幸運は仕事の謝礼を収入計上し、未成年の事故費用は本人負担にしない',()=>{
 const s=aged(22),oldCash=s.finances.cash,oldIncome=s.finances.totals.income;
 const e=eventFor(s,'luck');resolveSurpriseChoice(s,e,e.options[0]);
 assert.equal(s.finances.cash,oldCash+12000);
 assert.equal(s.finances.totals.income,oldIncome+12000);
 assert.equal(s.surprise53.totalGains,12000);
 assert.equal(s.finances.ledger.at(-1).label,'短期の仕事の謝礼');
 const child=aged(12),disaster=eventFor(child,'disaster');child.finances.cash=0;
 resolveSurpriseChoice(child,disaster,disaster.options[1]);
 assert.equal(child.finances.debt,0);assert.equal(child.surprise53.totalLoss,0);
 assert.equal(validateGameState(child),true);
});

test('怪我・体調不良の選択は健康に影響し、既存の自然回復・治療と矛盾しない',()=>{
 const s=aged(22);const e=eventFor(s,'illness');
 resolveSurpriseChoice(s,e,e.options[2]);
 assert.equal(s.health.illness.name,'体調不良');
 assert.ok(s.health.physical<75);
 assert.equal(createSurpriseEvent(s,{year:2022,month:1},49,22,.1)?.surpriseKind==='illness',false);
 assert.equal(validateGameState(s),true);
});

test('選択はSTEP51の将来への記憶として蓄積し、既存の目標と保存を維持する',()=>{
 const s=aged(22);const event=eventFor(s,'traffic');
 resolveSurpriseChoice(s,event,event.options[1]);
 assert.ok(s.legacy51.memories.some(x=>x.source==='surprise'));
 assert.equal(validateGameState(s),true);
 const g=start();answer(g);
 const repo=createSaveRepository(memoryStorage());assert.equal(repo.save('手動保存1',g.getState()).ok,true);
 const loaded=repo.load('手動保存1');assert.equal(loaded.ok,true);
 assert.deepEqual(loaded.state.surprise53,g.getState().surprise53);
});

test('ゲーム本体でも事故を手動選択するまで時間短縮できず、同じ出来事を2回適用できない',()=>{
 const g=start(836);answer(g);
 let seen=null,turns=0;
 for(;turns<390;turns++){
  const event=g.getState().pendingEvents.find(x=>x.type==='choice');
  if(event){if(event.surprise53){seen=event;break;}answer(g);}
  assert.equal(g.advanceTurn().ok,true);
 }
 assert.ok(seen,'新イベントを長期進行中に発見');
 assert.equal(g.fastForward({maxMonths:12}).ok,false);
 const prior=g.getState().surprise53.history.length;
 const result=g.performAction('resolveChoice',{eventId:seen.id,choice:seen.options[0].id});
 assert.equal(result.ok,true,result.reason);
 assert.equal(g.getState().surprise53.history.length,prior+1);
 assert.equal(g.performAction('resolveChoice',{eventId:seen.id,choice:seen.options[0].id}).ok,false);
 assert.equal(validateGameState(g.getState()),true);
});

test('STEP53のUI・設定・公開に必要なモジュールは揃っている',()=>{
 const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
 assert.match(read('package.json'),/"version": "5\.6\.0"/);
 assert.match(read('index.html'),/css\/phase53\.css/);
 assert.match(read('index.html'),/第56段階/);
 assert.match(read('js/ui/playDashboard.js'),/もしもの備えと人生の転機/);
 assert.match(read('js/ui/turnActivities.js'),/safetyPrep/);
 assert.match(read('js/core/storyEvents.js'),/createSurpriseEvent/);
 assert.match(read('.github/workflows/pages.yml'),/npm test/);
 assert.match(read('README.md'),/STEP 53/);
});
