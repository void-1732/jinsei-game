import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGameStore} from '../js/core/gameState.js';
import {LIFE_EVENT_CATALOG,isEventEligible,selectCatalogEvent} from '../js/core/eventCatalog.js';
import {latestTurnRecap} from '../js/ui/turnRecap.js';
import {validateGameState} from '../js/core/saveSystems.js';
import {serializePortableSave,parsePortableSave} from '../js/core/portableSaves.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function begin(){
  const game=createGameStore({interactiveChoices:true});
  assert.equal(game.startNewGame({name:'操作検証',seed:57157,birth:{year:2000,month:12,day:6}}).ok,true);
  return game;
}
function resolve(game){
  const ev=game.getState().pendingEvents.find(x=>x.type==='choice');
  assert.ok(ev);
  const result=game.performAction('resolveChoice',{eventId:ev.id,choice:ev.options[0].id});
  assert.equal(result.ok,true,result.reason);
}
test('通知の一括確認は選択待ちを削除せず、自由行動や乱数を消費しない',()=>{
  const game=begin();resolve(game);
  assert.equal(game.advanceTurn().ok,true);
  const before=game.getState();
  const ordinary=before.pendingEvents.filter(e=>e.type!=='choice');
  const choices=before.pendingEvents.filter(e=>e.type==='choice');
  assert.ok(ordinary.some(e=>e.type==='new-year'),'年越し通知を確認');
  assert.equal(choices.length,1);
  assert.equal(game.acknowledgeNotifications(),ordinary.length);
  const after=game.getState();
  assert.deepEqual(after.pendingEvents,choices);
  assert.deepEqual(after.random,before.random);
  assert.deepEqual(after.turnActions,before.turnActions);
  assert.equal(game.acknowledgeNotifications(),0,'2回押しても二重操作にならない');
  assert.equal(game.advanceTurn().ok,false,'選択イベントは依然として必須');
  assert.equal(validateGameState(after),true);
});
test('最近の20イベントを候補がある限り再出現させない',()=>{
  const game=begin();
  const state=structuredClone(game.getState());
  state.finances.cash=1000000;
  const eligible=LIFE_EVENT_CATALOG.filter(e=>isEventEligible(e,state,32));
  assert.ok(eligible.length>21,`イベント候補が不足: ${eligible.length}`);
  const seen=eligible.slice(0,20).map((e,i)=>({story:true,catalogKey:e.id,year:2025,month:1,turn:i+1}));
  state.eventHistory=[...seen];
  for(const random of [0,.12,.4,.74,.9999]){
    const picked=selectCatalogEvent(state,32,random);
    assert.ok(picked);
    assert.ok(!seen.some(e=>e.catalogKey===picked.id),`最近のイベントが重複: ${picked.id}`);
  }
  assert.equal(selectCatalogEvent({...state,eventHistory:[]},32,.4)?.id,selectCatalogEvent({...state,eventHistory:[]},32,.4)?.id,'同一状態・乱数で決定的に選択');
});
test('今ターンの選択のみを表示し、旧セーブ読み込みでは架空の結果を捏造しない',()=>{
  const game=begin();
  assert.equal(latestTurnRecap(game.getState()),null);
  resolve(game);
  const snap=game.getState();
  const summary=latestTurnRecap(snap);
  assert.ok(summary?.title&&summary?.description);
  assert.equal(summary.year,2000);
  assert.equal(summary.month,12);
  const portable=serializePortableSave(snap);
  assert.equal(portable.ok,true,portable.reason);
  const restored=parsePortableSave(portable.text);
  assert.equal(restored.ok,true,restored.reason);
  assert.deepEqual(latestTurnRecap(restored.state),summary);
  assert.equal(game.advanceTurn().ok,true);
  assert.equal(latestTurnRecap(game.getState()),null,'新しいターンの結果に混同しない');
  assert.equal(latestTurnRecap({...snap,eventHistory:[]}),null);
  assert.equal(validateGameState(game.getState()),true);
});
test('PC・スマホの操作改善、ダイアログエラー、保存互換性を静的検査',()=>{
  const app=read('js/app.js'),index=read('index.html'),css=read('css/phase57.css');
  const dash=read('js/ui/playDashboard.js');
  const browser=read('scripts/qa-browser.mjs');
  assert.match(app,/acknowledgeNotifications\(\)/);
  assert.match(app,/story-action-error/);
  assert.match(app,/\.focus\(\{preventScroll:true\}\)/);
  assert.match(index,/choice-feedback[^>]*tabindex="-1"/);
  assert.match(index,/phase57\.css/);
  assert.match(dash,/latestTurnRecap/);
  assert.match(dash,/play-turn-recap/);
  assert.match(css,/prefers-reduced-motion/);
  assert.match(css,/focus-visible/);
  assert.match(browser,/story-action-error/);
  assert.match(browser,/play-turn-recap/);
  assert.match(read('package.json'),/"version": "6\.0\.0"/);
});