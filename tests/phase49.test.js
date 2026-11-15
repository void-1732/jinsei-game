import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGameStore} from '../js/core/gameState.js';
import {validateGameState,createSaveRepository} from '../js/core/saveSystems.js';
import {calculateInheritance} from '../js/core/estateSystems.js';
import {DREAMS,DREAM_IDS,DREAM_CATALOG,validateLifeGoalProgress,createLifeGoalProgress,evaluateDream,getLifeReview,observeLifeGoals,finalizeLifeGoals} from '../js/core/lifeGoals.js';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const game=()=>{const g=createGameStore({interactiveChoices:true});assert.equal(g.startNewGame({name:'目標テスト',seed:1234,birth:{year:2000,month:2,day:1}}).ok,true);return g;};
const choose=g=>{const e=g.getState().pendingEvents.find(x=>x.type==='choice');if(e){assert.equal(g.performAction('resolveChoice',{eventId:e.id,choice:e.options[0].id}).ok,true);return e;}return null;};
const storage=()=>{const m=new Map();return {getItem:x=>m.get(x)??null,setItem:(x,v)=>m.set(x,v),removeItem:x=>m.delete(x)};};
function adult(g,age=18){
 let n=0;while(g.getState().timeline.ageYears<age&&n++<500){choose(g);const r=g.advanceTurn();assert.equal(r.ok,true,r.reason);}
 assert.ok(n<500);choose(g);
}

test('5つの夢と3段階の目標を定義し、実績は固有IDで識別',()=>{
 assert.equal(DREAMS.length,5);assert.equal(new Set(DREAM_IDS).size,5);
 for(const d of DREAMS){assert.equal(d.steps.length,3);assert.equal(new Set(d.steps.map(x=>x.id)).size,3);assert.equal(DREAM_CATALOG[d.id].steps.length,3);}
 assert.equal(validateLifeGoalProgress(createLifeGoalProgress()),true);
});
test('6歳までは夢を選べない。夢の変更は3年間隔だが自由行動回数を消費しない',()=>{
 const g=game();assert.equal(g.performAction('setLifeDream',{id:'career'}).ok,false);
 adult(g,6);const a=g.performAction('setLifeDream',{id:'knowledge'});assert.equal(a.ok,true,a.reason);
 assert.equal(g.getState().turnActions.used,0);
 assert.equal(g.performAction('setLifeDream',{id:'wealth'}).ok,false);
 assert.equal(g.performAction('setLifeDream',{id:'fake'}).ok,false);
 adult(g,9);const b=g.performAction('setLifeDream',{id:'family'});assert.equal(b.ok,true,b.reason);
 assert.equal(g.getState().lifeGoal49.dream,'family');
 assert.equal(validateGameState(g.getState()),true);
});
test('夢の目標は実データの変化から達成し、一度得た実績は後に失っても保持する',()=>{
 const g=game();adult(g,9);
 assert.equal(g.performAction('setLifeDream',{id:'knowledge'}).ok,true);
 const s=structuredClone(g.getState());for(const k of Object.keys(s.education.scores))s.education.scores[k]=72;
 s.education.skills['読書']=71;s.education.studyHours=110;
 observeLifeGoals(s);
 assert.equal(evaluateDream(s).done,3);assert.equal(getLifeReview(s).achievements.find(a=>a.id==='learned')?.earned,true);
 s.education.studyHours=0;for(const k of Object.keys(s.education.scores))s.education.scores[k]=30;
 assert.equal(evaluateDream(s).done,3,'Previous fulfilled milestones remain recorded');
 assert.equal(validateLifeGoalProgress(s.lifeGoal49),true);
});
test('実績が重複しない・履歴に人生の節目が保存される',()=>{
 const g=game();adult(g,18);const s=structuredClone(g.getState());
 const previous=s.lifeGoal49.achievements.length;
 observeLifeGoals(s);observeLifeGoals(s);assert.equal(s.lifeGoal49.achievements.length,previous);
 assert.ok(s.lifeGoal49.achievements.some(a=>a.id==='adult'));
 assert.ok(s.lifeGoal49.highlights.some(a=>a.kind==='life'));
 assert.equal(validateGameState(s),true);
});
test('仕事・進学・経済の現在値に基づく複数エンディングと内訳が生成される',()=>{
 const g=game();adult(g,20);
 const seed=structuredClone(g.getState());
 function finish(kind){
  const s=structuredClone(seed);
  s.ending={dead:true,date:{year:s.timeline.year,month:s.timeline.month,age:s.timeline.ageYears},cause:'テスト',score:0,inheritance:calculateInheritance(s.finances,s.people),legacy:[]};
  s.lifeGoal49=createLifeGoalProgress();
  if(kind==='wealth'){s.finances.cash=12_000_000;s.ending.inheritance=calculateInheritance(s.finances,s.people);}
  if(kind==='knowledge'){for(const k of Object.keys(s.education.scores))s.education.scores[k]=90;s.education.skills['読書']=90;}
  const result=finalizeLifeGoals(s);
  assert.ok(result);assert.equal(result.breakdown.length,5);assert.equal(result.breakdown.reduce((a,b)=>a+b.score,0),result.score);
  assert.equal(validateLifeGoalProgress(s.lifeGoal49),true);
  assert.equal(validateGameState(s),true);
  return {result,s};
 }
 const rich=finish('wealth');const study=finish('knowledge');
 assert.equal(rich.result.type,'wealth');assert.equal(study.result.type,'knowledge');
 assert.notEqual(rich.result.title,study.result.title);
 const cached=finalizeLifeGoals(rich.s);assert.deepEqual(cached,rich.result,'Death report must be stable');
});
test('旧セーブを破壊せずに新目標の領域を補完し、セーブを再読込可能',()=>{
 const g=game();adult(g,10);const old=structuredClone(g.getState());delete old.lifeGoal49;
 assert.equal(validateGameState(old),true);
 const copy=createGameStore({interactiveChoices:true});assert.equal(copy.loadState(old).ok,true);
 assert.equal(validateLifeGoalProgress(copy.getState().lifeGoal49),true);
 assert.equal(copy.performAction('setLifeDream',{id:'family'}).ok,true);
 const repo=createSaveRepository(storage());assert.equal(repo.save('手動保存1',copy.getState()).ok,true);
 const restored=createGameStore({interactiveChoices:true});assert.equal(restored.loadState(repo.load('手動保存1').state).ok,true);
 assert.deepEqual(restored.getState().lifeGoal49,copy.getState().lifeGoal49);
});
test('不正な実績・壊れた目標・改ざんしたエンディングは検証で拒否',()=>{
 for(const patch of [{dream:'fake'},{achievements:[{id:'hack',year:2020,month:1,age:20}]},{highlights:[{kind:'html',title:'a',description:'b',year:2010,month:1,age:10}]},{completed:{career:['invalid']}},{lastChangeMonths:-5}]){
  assert.equal(validateLifeGoalProgress({...createLifeGoalProgress(),...patch}),false);
 }
 const s=structuredClone(game().getState());s.lifeGoal49.dream='fake';assert.equal(validateGameState(s),false);
});
test('時間短縮中も夢・実績の状態を更新し、節目・選択を保持',()=>{
 const g=game();adult(g,9);assert.equal(g.performAction('setLifeDream',{id:'wellness'}).ok,true);
 const before=g.getState().lifeGoal49.achievements.length;
 for(let i=0;i<8;i++){
  choose(g);const r=g.fastForward({focus:'health',maxMonths:12});assert.equal(r.ok,true,r.reason);
  assert.equal(validateGameState(g.getState()),true);
 }
 assert.ok(g.getState().lifeGoal49.achievements.length>=before);
 assert.equal(g.getState().lifeGoal49.dream,'wellness');
});
test('人生画面・履歴の振り返り・GitHub公開対象がつながっている',()=>{
 const dash=read('js/ui/playDashboard.js'),topic=read('js/ui/topicPage.js'),ui=read('js/ui/lifeGoalPanel.js');
 assert.match(dash,/renderLifeGoalPanel/);assert.match(dash,/renderLifeReview/);
 assert.match(topic,/screen\.category==='履歴'.*renderLifeReview/);
 assert.match(ui,/夢を変更/);assert.match(ui,/目標/);assert.match(ui,/人生の節目/);
 assert.match(read('index.html'),/phase49\.css/);
 assert.match(read('package.json'),/"version": "5\.7\.0"/);
});
