import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGameStore} from '../js/core/gameState.js';
import {checksum,validateGameState,createSaveRepository} from '../js/core/saveSystems.js';
import {serializePortableSave,parsePortableSave,PORTABLE_FORMAT,MAX_PORTABLE_CHARS} from '../js/core/portableSaves.js';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const game=seed=>{const g=createGameStore({interactiveChoices:true});const x=g.startNewGame({name:'STEP50進行確認',seed,birth:{year:2000,month:7,day:17}});assert.equal(x.ok,true);return g;};
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
function settle(g,n){
 let s=g.getState();const event=s.pendingEvents.find(e=>e.type==='choice');
 if(!event)return;
 const available=event.options.filter(o=>(o.impact?.cash??0)>=-s.finances.cash);
 assert.ok(available.length,`選択肢がすべて所持金不足: ${event.title}`);
 const chosen=available[n%available.length];
 const result=g.performAction('resolveChoice',{eventId:event.id,choice:chosen.id});
 assert.equal(result.ok,true,result.reason);
}

test('開始前はファイル書き出し不可。正常な人生はチェックサム付きで安全に往復できる',()=>{
 const g=createGameStore({interactiveChoices:true});
 assert.equal(serializePortableSave(g.getState()).ok,false);
 g.startNewGame({name:'書き出しテスト',seed:456});settle(g,0);
 const state=g.getState();const packed=serializePortableSave(state,'2026-11-15T00:00:00.000Z');
 assert.equal(packed.ok,true,packed.reason);
 const json=JSON.parse(packed.text);
 assert.equal(json.format,PORTABLE_FORMAT);assert.equal(json.player,state.player.name);
 assert.equal(json.checksum,checksum(json.payload));
 const loaded=parsePortableSave(packed.text);assert.equal(loaded.ok,true,loaded.reason);
 assert.deepEqual(loaded.state,state);
});

test('偽のファイル・破損・改ざん・巨大ファイル・非ゲームデータを拒否する',()=>{
 const g=game(2468);const good=serializePortableSave(g.getState());assert.equal(good.ok,true);
 const src=JSON.parse(good.text);
 for(const text of [
  '{', '[]', JSON.stringify({...src,format:'unknown'}),JSON.stringify({...src,version:999}),
  JSON.stringify({...src,checksum:'deadbeef'}),JSON.stringify({...src,payload:'{}'}),
  'a'.repeat(MAX_PORTABLE_CHARS+1),
  JSON.stringify({...src,payload:JSON.stringify({...g.getState(),schemaVersion:55})}),
 ]) assert.equal(parsePortableSave(text).ok,false);
 const badState={...g.getState(),player:{name:'偽の人生',birth:null}};
 const payload=JSON.stringify(badState);
 assert.equal(parsePortableSave(JSON.stringify({...src,payload,checksum:checksum(payload)})).ok,false);
});

test('ブラウザ内手動保存、ファイル復元、旧版フィールドの移行が共存する',()=>{
 const original=game(801);let s=original.getState();
 const choice=s.pendingEvents.find(e=>e.type==='choice');
 original.performAction('resolveChoice',{eventId:choice.id,choice:choice.options[0].id});
 for(let i=0;i<45;i++){settle(original,i);assert.equal(original.advanceTurn().ok,true);}
 s=original.getState();assert.ok(validateGameState(s));
 const stored=createSaveRepository(storage());
 assert.equal(stored.save('手動保存1',s).ok,true);
 const backup=serializePortableSave(s);
 const other=game(99);settle(other,0);other.advanceTurn();
 assert.equal(other.loadState(parsePortableSave(backup.text).state).ok,true);
 assert.equal(other.getState().timeline.turnsElapsed,s.timeline.turnsElapsed);
 assert.deepEqual(other.getState().random,s.random);
 const fromManual=stored.load('手動保存1');assert.equal(fromManual.ok,true);
 const older=structuredClone(fromManual.state);
 for(const k of ['lifeGoal49','balance48','opportunity47','storyProgress'])delete older[k];
 const oldPayload=serializePortableSave(older);
 assert.equal(oldPayload.ok,true,oldPayload.reason);
 assert.equal(other.loadState(parsePortableSave(oldPayload.text).state).ok,true);
 assert.ok(other.getState().lifeGoal49&&other.getState().balance48);
 settle(other,9);assert.equal(other.advanceTurn().ok,true);
 assert.ok(validateGameState(other.getState()));
});

test('年齢・収支・自由行動・進行制限を横断した長期プレイの整合性',()=>{
 for(const seed of [50,777,3007]){
  const g=game(seed);let previous=0;
  for(let i=0;i<165;i++){
   const state=g.getState();assert.equal(state.timeline.turnsElapsed,i);
   settle(g,i+seed);
   if(i===75){
    const first=g.performAction('skill',{skill:'読書'});
    assert.equal(first.ok,true,first.reason);
    const second=g.performAction('skill',{skill:'運動'});
    assert.equal(second.ok,false,'同じターンで自由行動が重複した');
   }
   const r=g.advanceTurn();assert.equal(r.ok,true,r.reason);
   const s=g.getState();
   assert.ok(s.timeline.monthsElapsed>previous);
   previous=s.timeline.monthsElapsed;
   assert.ok(s.finances.cash>=0&&s.finances.debt>=0);
   for(const n of ['physical','mental','energy'])assert.ok(s.health[n]>=0&&s.health[n]<=100);
   assert.ok(validateGameState(s),`save invalid for seed ${seed} at turn ${i}`);
  }
  const backup=serializePortableSave(g.getState());assert.equal(backup.ok,true);
  const restored=createGameStore({interactiveChoices:true});
  assert.equal(restored.loadState(parsePortableSave(backup.text).state).ok,true);
  settle(restored,3);assert.equal(restored.advanceTurn().ok,true);
 }
});

test('時間短縮中は重要イベントを自動決定せず、戻って手動選択・保存できる',()=>{
 const g=game(7821);settle(g,0);
 let sawMilestone=false,turns=0;
 for(let i=0;i<40;i++){
  const r=g.fastForward({focus:'balanced',maxMonths:12});
  assert.equal(r.ok,true,r.reason);turns+=r.turns;
  const s=g.getState();assert.ok(validateGameState(s));
  if(r.important){sawMilestone=true;assert.ok(s.pendingEvents.some(e=>e.type==='choice'));settle(g,i);}
  if(s.timeline.ageYears>=17)break;
 }
 assert.ok(turns>=20);assert.ok(sawMilestone);
 const save=serializePortableSave(g.getState());assert.equal(parsePortableSave(save.text).ok,true);
});

test('ゲーム設定画面・公開設定・バージョン案内がSTEP 50に揃っている',()=>{
 const html=read('index.html'),app=read('js/app.js'),workflow=read('.github/workflows/pages.yml');
 for(const id of ['export-game','import-game-file','save-game','load-game','restart-game'])assert.match(html,new RegExp(`id="${id}"`));
 assert.match(html,/phase50\.css/);
 assert.match(app,/serializePortableSave/);assert.match(app,/parsePortableSave/);
 assert.match(app,/window\.confirm/);assert.match(app,/window\.setTimeout/);
 assert.match(workflow,/npm test/);assert.match(workflow,/STEP 52/);
 assert.match(read('package.json'),/"version": "5\.3\.0"/);
 assert.match(read('README.md'),/STEP 50/);
});

test('病後の体力がゼロに固定されない・年齢が上がるほど自然回復は弱い',async()=>{
 const {createHealthData,advanceHealth}=await import('../js/core/healthSystems.js');
 const young=createHealthData();young.physical=0;
 for(let y=2020;y<2029;y++)for(let m=1;m<=12;m++)
   advanceHealth(young,{year:y,month:m},20,0.99,{balanced:true});
 assert.ok(young.physical>=65&&young.physical<=75,`成人の体力=${young.physical}`);
 const old=createHealthData();old.physical=0;
 for(let m=1;m<=12;m++)advanceHealth(old,{year:2080,month:m},80,0.99,{balanced:true});
 assert.ok(old.physical<young.physical/2);
 const legacy=createHealthData();legacy.physical=0;
 advanceHealth(legacy,{year:2025,month:1},25,0.99);
 assert.equal(legacy.physical,0,'従来のシミュレーションAPIに変更を加えない');
});

test('家計・体調の重大な問題を人生画面から解決できるよう案内する',()=>{
 const dash=read('js/ui/playDashboard.js');
 assert.match(dash,/play-attention/);
 assert.match(dash,/finance\.debt>=150_000/);
 assert.match(dash,/health\.physical<=35/);
 assert.match(read('css/phase50.css'),/play-attention-item/);
});
