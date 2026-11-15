import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGameStore} from '../js/core/gameState.js';
import {validateGameState,createSaveRepository} from '../js/core/saveSystems.js';
import {develop} from '../js/core/storyEvents.js';
import {turnActivityOptions} from '../js/ui/turnActivities.js';

function game() {
  const g=createGameStore({interactiveChoices:true});
  assert.equal(g.startNewGame({seed:912,birth:{year:2000,month:2,day:29},name:'人生テスター'}).ok,true);
  return g;
}
function choose(g,choice='1') {
  const ev=g.getState().pendingEvents.find(e=>e.type==='choice');
  assert.ok(ev);
  return g.performAction('resolveChoice',{eventId:ev.id,choice});
}

test('選択が済むまで自由行動不可、選択は上限消費なし、自由行動は1ターンに1回',()=>{
  const g=game();
  assert.match(g.performAction('skill',{skill:'読書'}).reason,/先に/);
  assert.equal(choose(g).ok,true);
  assert.equal(g.getState().turnActions.used,0);
  assert.equal(g.performAction('skill',{skill:'読書'}).ok,true);
  assert.equal(g.getState().turnActions.used,1);
  const s=g.getState();
  for(const [action,payload] of [['skill',{skill:'運動'}],['socialize',{personId:'FAMILY-001'}],['habit',{habit:'休養'}]]){
    const r=g.performAction(action,payload);
    assert.equal(r.ok,false);
    assert.match(r.reason,/自由行動/);
  }
  assert.deepEqual(g.getState(),s,'拒否された再行動ではゲーム状態が変化しない');
  assert.equal(g.advanceTurn().ok,true);
  assert.equal(g.getState().turnActions.used,0);
  assert.equal(g.getState().turnActions.turn,1);
  assert.equal(choose(g,'2').ok,true);
  assert.equal(g.performAction('skill',{skill:'運動'}).ok,true);
});

test('失敗した自由行動は回数を消費しない',()=>{
  const g=game();choose(g);
  assert.equal(g.performAction('study',{subject:'国語',hours:8}).ok,false);
  assert.equal(g.getState().turnActions.used,0);
  assert.equal(g.performAction('skill',{skill:'読書'}).ok,true);
  assert.equal(g.getState().turnActions.used,1);
});

test('能力上昇は高能力で頭打ち、下落はそのまま適用',()=>{
  assert.equal(develop(50,5),55);
  assert.equal(develop(70,5),74);
  assert.equal(develop(85,5),87);
  assert.equal(develop(94,5),95);
  assert.equal(develop(95,5),95);
  assert.equal(develop(95,-4),91);
  const g=game();choose(g);
  const s=structuredClone(g.getState());
  s.education.skills.読書=94;
  assert.equal(g.loadState(s).ok,true);
  assert.equal(g.performAction('skill',{skill:'読書'}).ok,true);
  assert.equal(g.getState().education.skills.読書,95);
});

test('前バージョンのセーブは回数制限を補完し、不正な回数を拒否',()=>{
  const g=game();choose(g);
  const old=structuredClone(g.getState());delete old.turnActions;
  assert.equal(validateGameState(old),true);
  assert.equal(g.loadState(old).ok,true);
  assert.deepEqual(g.getState().turnActions,{turn:0,used:0,lastAction:null});
  const bad=structuredClone(g.getState());bad.turnActions.used=7;
  assert.equal(validateGameState(bad),false);
});

test('ターン内の自由行動消費は保存・読込後も保持',()=>{
  const g=game();choose(g);g.performAction('skill',{skill:'パソコン'});
  const map=new Map();const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
  const repo=createSaveRepository(storage);
  assert.equal(repo.save('手動保存1',g.getState()).ok,true);
  const restored=createGameStore({interactiveChoices:true});
  assert.equal(restored.loadState(repo.load('手動保存1').state).ok,true);
  assert.equal(restored.getState().turnActions.used,1);
  assert.equal(restored.performAction('skill',{skill:'運動'}).ok,false);
});

test('人生画面の自由行動プルダウンは年齢と状況に応じて変化',()=>{
  const g=game();
  assert.ok(turnActivityOptions(g.getState()).some(x=>x.action==='skill'));
  assert.ok(!turnActivityOptions(g.getState()).some(x=>x.action==='jobSearch'));
  const adult=structuredClone(g.getState());adult.timeline.ageYears=21;
  assert.ok(turnActivityOptions(adult).some(x=>x.action==='jobSearch'));
});

test('カテゴリ開閉と一画面化、手動クリック時だけ開くポップアップが実装されている',()=>{
  const nav=readFileSync(new URL('../js/ui/navigation.js',import.meta.url),'utf8');
  const app=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(nav,/Object\.hasOwn\(options, 'activeCategory'\)/);
  assert.match(nav,/nav-screen-select/);
  assert.match(app,/function advanceTurn\(\)[\s\S]+?renderStoryDialog\(\);/);
  assert.match(app,/dom\.storyDialog\.close\(\)/);
  assert.doesNotMatch(app,/gameStore\.subscribe\(snapshot=>\{[\s\S]*?render\(uiStore\.getState\(\)\);\s*renderStoryDialog\(\);/);
  assert.match(html,/id="choice-feedback"/);
  assert.doesNotMatch(html,/id="open-event"/);
});
