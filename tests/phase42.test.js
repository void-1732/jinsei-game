import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameStore,createRandomBirthday} from '../js/core/gameState.js';
import {createSaveRepository,validateGameState} from '../js/core/saveSystems.js';
import {createUiStore} from '../js/ui/uiState.js';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(root,p),'utf8');

test('2000年の月・日がシードで決まり、うるう年の暦内',()=>{
  const dates=[123,1000,20000101,0,0xffffffff].map(createRandomBirthday);
  assert.ok(new Set(dates.map(x=>`${x.month}-${x.day}`)).size>1);
  for(const date of dates){
    assert.equal(date.year,2000);
    assert.ok(date.month>=1&&date.month<=12);
    assert.ok(date.day>=1&&date.day<=new Date(Date.UTC(2000,date.month,0)).getUTCDate());
  }
  assert.deepEqual(createRandomBirthday(123),createRandomBirthday(123));
});

test('ランダムな誕生日で開始月・年齢と保存形式が一致',()=>{
  const g=createGameStore({interactiveChoices:true});
  const birth={year:2000,month:10,day:21};
  assert.equal(g.startNewGame({name:'春香',seed:33,birth}).ok,true);
  const s=g.getState();
  assert.deepEqual(s.player.birth,birth);
  assert.deepEqual(s.people.find(p=>p.role==='本人').birth,birth);
  assert.equal(s.timeline.month,10);
  assert.equal(s.timeline.ageYears,0);
  assert.equal(s.timeline.monthsElapsed,9);
  assert.equal(validateGameState(s),true);
  assert.equal(g.advanceTurn().ok,false);
  const first=s.pendingEvents.find(e=>e.type==='choice');
  assert.ok(first.story);
  assert.equal(g.performAction('resolveChoice',{eventId:first.id,choice:first.options[0].id}).ok,true);
  assert.equal(g.advanceTurn().ok,true);
  assert.equal(g.getState().timeline.month,11);
  assert.equal(g.getState().timeline.ageYears,0);
  assert.equal(validateGameState(g.getState()),true);
  assert.equal(g.startNewGame({birth:{year:2000,month:2,day:30}}).ok,false);
});

test('毎ターン必ず選択が発生、選ぶまで進行しない',()=>{
  const g=createGameStore({interactiveChoices:true});
  g.startNewGame({seed:123,birth:{year:2000,month:6,day:2}});
  for(let i=0;i<12;i++){
    const old=g.getState();
    const pending=old.pendingEvents.filter(e=>e.type==='choice');
    assert.equal(pending.length,1);
    assert.equal(pending[0].options.length,3);
    assert.equal(g.advanceTurn().ok,false);
    assert.equal(g.performAction('resolveChoice',{eventId:pending[0].id,choice:'non-existent'}).ok,false);
    const selection=g.performAction('resolveChoice',{eventId:pending[0].id,choice:pending[0].options[i%3].id});
    assert.equal(selection.ok,true);
    assert.ok(selection.message);
    assert.ok(g.getState().eventHistory.some(e=>e.type==='choice-result'));
    assert.equal(g.performAction('resolveChoice',{eventId:pending[0].id,choice:pending[0].options[0].id}).ok,false);
    assert.equal(g.advanceTurn().ok,true);
    assert.equal(g.getState().timeline.turnsElapsed,i+1);
    assert.equal(validateGameState(g.getState()),true);
  }
});

test('選択の結果が学力・技能・健康・人間関係に反映',()=>{
 const g=createGameStore({interactiveChoices:true});g.startNewGame({seed:4});
 const e=g.getState().pendingEvents[0];
 const before=g.getState();
 const o=e.options.find(o=>o.impact.study||o.impact.physical||o.impact.mental||o.impact.social||o.impact.skill);
 assert.ok(o);
 const r=g.performAction('resolveChoice',{eventId:e.id,choice:o.id});
 assert.equal(r.ok,true);
 const after=g.getState();
 assert.ok(JSON.stringify(after.health)!==JSON.stringify(before.health)||JSON.stringify(after.education)!==JSON.stringify(before.education)||JSON.stringify(after.people)!==JSON.stringify(before.people));
 assert.equal(after.eventHistory.at(-1).type,'choice-result');
});

test('乱数シードで選択イベントと結果が再現する',()=>{
  const a=createGameStore({interactiveChoices:true});const b=createGameStore({interactiveChoices:true});
  for(const g of [a,b])g.startNewGame({name:'太郎',seed:777,birth:createRandomBirthday(777)});
  for(let i=0;i<16;i++){
    for(const g of [a,b]){
      const e=g.getState().pendingEvents.find(e=>e.type==='choice');
      assert.equal(g.performAction('resolveChoice',{eventId:e.id,choice:e.options[i%3].id}).ok,true);
      assert.equal(g.advanceTurn().ok,true);
    }
  }
  assert.deepEqual(a.getState(),b.getState());
});

test('選択待ちの状態も保存・読込して続きから再開できる',()=>{
  const g=createGameStore({interactiveChoices:true});g.startNewGame({name:'蘭',seed:42,birth:{year:2000,month:12,day:28}});
  const map=new Map();const storage={getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)};
  const repo=createSaveRepository(storage);
  assert.equal(repo.save('手動保存1',g.getState()).ok,true);
  const loaded=repo.load('手動保存1');assert.equal(loaded.ok,true);
  const copy=createGameStore({interactiveChoices:true});assert.equal(copy.loadState(loaded.state).ok,true);
  const e=copy.getState().pendingEvents.find(e=>e.type==='choice');
  assert.equal(copy.advanceTurn().ok,false);
  assert.equal(copy.performAction('resolveChoice',{eventId:e.id,choice:e.options[0].id}).ok,true);
  assert.equal(copy.advanceTurn().ok,true);
});

test('開いているカテゴリを閉じられ、現在画面は変わらない',()=>{
  const store=createUiStore();
  const initial=store.getState().activeScreenId;
  assert.equal(store.getState().activeCategory,'人生');
  store.openCategory('人生');assert.equal(store.getState().activeCategory,null);
  assert.equal(store.getState().activeScreenId,initial);
  store.openCategory('健康');assert.equal(store.getState().activeCategory,'健康');
  assert.equal(store.getState().activeScreenId,initial);
});

test('ダッシュボード、進行ハブ、保存設定、ダイアログの要素を備える',()=>{
  const html=read('index.html');const app=read('js/app.js');
  for(const id of ['player-name','start-game','advance-turn','hub-name','hub-age','turn-count','story-dialog','settings-dialog','save-game','load-game','restart-game','toggle-nav'])assert.match(html,new RegExp(`id="${id}"`));
  assert.match(app,/interactiveChoices:true/);
  assert.match(app,/createRandomBirthday/);
  assert.match(read('js/ui/screenRenderer.js'),/renderPlayDashboard/);
  assert.match(read('js/ui/navigation.js'),/aria-expanded/);
});
