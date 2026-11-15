import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGameStore} from '../js/core/gameState.js';
import {validateGameState,createSaveRepository} from '../js/core/saveSystems.js';
import {createStoryProgress,createBranchingEvent,getLifeThreads,recordBranchChoice,validateStoryProgress} from '../js/core/branchingStories.js';
const src=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
function newGame(){const g=createGameStore({interactiveChoices:true});assert.equal(g.startNewGame({name:'未来テスター',seed:23578,birth:{year:2000,month:2,day:29}}).ok,true);return g;}
function pending(g){return g.getState().pendingEvents.find(e=>e.type==='choice');}
function choose(g,i='1'){
  const event=pending(g);assert.ok(event,'人生イベントが存在する');
  const result=g.performAction('resolveChoice',{eventId:event.id,choice:i});
  assert.equal(result.ok,true,result.reason??'選択が成功する');return event;
}
function until(g,age){
  let attempts=0;
  while(g.getState().timeline.ageYears<age){
    if(pending(g))choose(g);
    const res=g.advanceTurn();assert.equal(res.ok,true,res.reason??'');
    assert.ok(++attempts<600,'ターン進行に上限を設ける');
  }
  assert.ok(pending(g));
  return pending(g);
}

test('6歳で選択した興味が12歳・18歳へ保存され、途中の方向転換が未来を変える',()=>{
  const g=newGame();
  let ev=until(g,6);
  assert.equal(ev.branch?.thread,'spark');assert.equal(ev.branch?.stage,1);
  choose(g,'1');
  let memory=g.getState().storyProgress;
  assert.equal(memory.threads.spark.path,'research');
  assert.equal(memory.scheduled.find(x=>x.thread==='spark').dueAge,12);
  assert.equal(memory.memories[0].choice,'小さな疑問を調べ始める');
  ev=until(g,12);
  assert.equal(ev.branch?.thread,'spark');assert.equal(ev.branch?.stage,2);
  assert.match(ev.title,/研究/);
  choose(g,'3');
  memory=g.getState().storyProgress;
  assert.equal(memory.threads.spark.path,'sport');
  ev=until(g,18);
  assert.equal(ev.branch?.thread,'spark');assert.equal(ev.branch?.stage,3);
  assert.match(ev.title,/スポーツ|進路/);
  assert.match(ev.description,/目を向ける/);
});

test('4本の独立した人生分岐が年齢で始まり、続きは選んだ道で変わる',()=>{
  let seen=0;
  for(const [thread,age,later] of [['spark',6,12],['bonds',13,19],['career',22,30],['values',40,53]]){
    const progress=createStoryProgress();
    const event=createBranchingEvent(progress,{year:2000+age,month:1},age*12,age);
    assert.equal(event.branch.thread,thread);
    assert.equal(event.options.length,3);
    assert.ok(event.options[0].impact);
    recordBranchChoice(progress,event,event.options[1],age);
    const reminder=progress.scheduled.find(x=>x.thread===thread);
    assert.equal(reminder.dueAge,later);
    const follow=createBranchingEvent(progress,{year:2000+later,month:1},later*12,later);
    assert.equal(follow.branch.thread,thread);assert.equal(follow.branch.stage,2);
    assert.match(follow.description,/前回は/);
    recordBranchChoice(progress,follow,follow.options[0],later);
    assert.equal(getLifeThreads(progress).length,1);
    assert.equal(validateStoryProgress(progress),true);
    seen++;
  }
  assert.equal(seen,4);
});

test('旧セーブデータを読み込んだ際に新フィールドを補完し、進行状態を維持する',()=>{
  const g=newGame();choose(g);
  const old=structuredClone(g.getState());delete old.storyProgress;
  assert.equal(validateGameState(old),true);
  const back=createGameStore({interactiveChoices:true});
  assert.equal(back.loadState(old).ok,true);
  assert.deepEqual(back.getState().storyProgress,createStoryProgress());
  assert.equal(back.getState().player.name,old.player.name);
  assert.deepEqual(back.getState().timeline,old.timeline);
  assert.equal(back.advanceTurn().ok,true);
});

test('セーブ・ロード後も分岐と予定イベントを維持し、同一イベントを連続生成しない',()=>{
  const g=newGame();until(g,6);choose(g,'2');
  const before=structuredClone(g.getState());
  const store=new Map();const storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
  const repo=createSaveRepository(storage);
  assert.equal(repo.save('手動保存1',before).ok,true);
  const loaded=repo.load('手動保存1');assert.equal(loaded.ok,true);
  const next=createGameStore({interactiveChoices:true});assert.equal(next.loadState(loaded.state).ok,true);
  assert.deepEqual(next.getState().storyProgress,before.storyProgress);
  assert.equal(next.getState().storyProgress.threads.spark.path,'sport');
  assert.equal(next.advanceTurn().ok,true);
  assert.equal(next.getState().storyProgress.threads.spark.stage,1);
  assert.ok(!pending(next).branch,'次のターンでは通常イベントになる');
});

test('破損した分岐データを拒否し、無効な選択では分岐を記録しない',()=>{
  const g=newGame();const initial=structuredClone(g.getState());
  assert.equal(g.performAction('resolveChoice',{eventId:pending(g).id,choice:'unknown'}).ok,false);
  assert.deepEqual(g.getState().storyProgress,initial.storyProgress);
  for(const damage of [
    p=>{p.scheduled.push({thread:'fake',stage:2,dueAge:12});},
    p=>{p.threads.spark={stage:1,path:'invalid',lastChoice:'test'};},
    p=>{p.memories=[{thread:'spark',age:-1,year:2020,choice:'x',path:'y'}];},
  ]){
    const bad=structuredClone(initial);damage(bad.storyProgress);
    assert.equal(validateGameState(bad),false);
  }
});

test('コンパクトな人生の記録に分岐情報を表示し、従来のボタン配置を維持',()=>{
  assert.match(src('js/ui/playDashboard.js'),/getLifeThreads/);
  assert.match(src('js/ui/playDashboard.js'),/過去の選択から続く物語/);
  assert.match(src('js/ui/playDashboard.js'),/play-life-paths/);
  assert.match(src('index.html'),/phase45\.css/);
  assert.match(src('package.json'),/"version": "4\.8\.0"/);
  assert.match(src('README.md'),/STEP 47/);
  assert.match(src('js/app.js'),/$('#' + 'advance-turn')|#advance-turn/);
});
