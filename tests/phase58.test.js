/** STEP 58: final publication documentation and playable save compatibility checks. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {createGameStore} from '../js/core/gameState.js';
import {validateGameState} from '../js/core/saveSystems.js';
import {serializePortableSave,parsePortableSave} from '../js/core/portableSaves.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(resolve(root,path),'utf8');

test('正式版のREADME・日本語説明書・更新履歴・検証記録はリンク切れがない',()=>{
 const docs=['README.md','操作説明書.md','CHANGELOG.md','docs/implementation/PHASE-57-REPORT.md','docs/implementation/PHASE-58-REPORT.md'];
 for(const d of docs)assert.equal(existsSync(resolve(root,d)),true,d);
 for(const d of docs){
  const source=read(d);
  for(const [,href] of source.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)){
   const link=href.split('#')[0];
   if(!link||/^(https?:|mailto:)/.test(link))continue;
   assert.ok(existsSync(resolve(root,dirname(d),decodeURIComponent(link))),`${d}: ${link}`);
  }
 }
});

test('正式版の画面、アプリ、説明書、CIで版数が一貫する',()=>{
 const pkg=JSON.parse(read('package.json'));
 assert.equal(pkg.version,'6.0.0');
 assert.match(read('index.html'),/v6\.0\.0 · 第58段階/);
 assert.match(read('index.html'),/<title>人生シミュレーション v6\.0\.0 — 正式版<\/title>/);
 assert.match(read('js/app.js'),/v6\.0\.0/);
 assert.match(read('README.md'),/正式版 v6\.0\.0/);
 assert.match(read('CHANGELOG.md'),/v6\.0\.0 — 正式版/);
 const w=read('.github/workflows/pages.yml');
 for(const phrase of ['npm test','scripts/qa-browser.mjs','scripts/check-pages.mjs','scripts/check-release.mjs'])assert.ok(w.includes(phrase),phrase);
});

test('初心者のゲーム開始、3択、任意の自由行動、次ターンのルールを維持する',()=>{
 const game=createGameStore({interactiveChoices:true});
 assert.equal(game.startNewGame({name:'正式版検証',seed:581234,birth:{year:2000,month:5,day:12}}).ok,true);
 const before=game.getState();
 assert.equal(before.schemaVersion,7);
 const pending=before.pendingEvents.find(e=>e.type==='choice');
 assert.ok(pending);
 assert.equal(pending.options.length,3);
 assert.equal(game.advanceTurn().ok,false,'未選択の出来事を飛ばせない');
 assert.equal(game.performAction('resolveChoice',{eventId:pending.id,choice:pending.options[0].id}).ok,true);
 assert.equal(game.performAction('skill',{skill:'読書'}).ok,true);
 assert.equal(game.performAction('skill',{skill:'読書'}).ok,false,'自由行動は1回だけ');
 assert.equal(game.advanceTurn().ok,true);
 assert.equal(validateGameState(game.getState()),true);
});

test('JSONの書き出し・復元ではターン・イベント・乱数・保存スキーマが変わらない',()=>{
 const game=createGameStore({interactiveChoices:true});
 assert.equal(game.startNewGame({name:'保存検証',seed:582345,birth:{year:2000,month:10,day:17}}).ok,true);
 const pending=game.getState().pendingEvents.find(e=>e.type==='choice');
 game.performAction('resolveChoice',{eventId:pending.id,choice:pending.options[1].id});
 game.advanceTurn();
 const original=game.getState();
 const serialized=serializePortableSave(original);
 assert.equal(serialized.ok,true,serialized.reason);
 const decoded=parsePortableSave(serialized.text);
 assert.equal(decoded.ok,true,decoded.reason);
 const loaded=createGameStore({interactiveChoices:true});
 assert.equal(loaded.loadState(decoded.state).ok,true);
 const state=loaded.getState();
 assert.equal(state.schemaVersion,7);
 assert.deepEqual(state.timeline,original.timeline);
 assert.deepEqual(state.random,original.random);
 assert.deepEqual(state.pendingEvents,original.pendingEvents);
 assert.equal(validateGameState(state),true);
});

test('旧セーブの省略フィールドを補完し、壊れたセーブは拒否する',()=>{
 const game=createGameStore({interactiveChoices:true});
 assert.equal(game.startNewGame({name:'互換性検証',seed:589900}).ok,true);
 const legacy=structuredClone(game.getState());
 for(const key of ['daily54','surprise53','legacy51','lifeGoal49','balance48'])delete legacy[key];
 assert.equal(validateGameState(legacy),true);
 const fresh=createGameStore({interactiveChoices:true});
 assert.equal(fresh.loadState(legacy).ok,true);
 assert.equal(fresh.getState().daily54.planId,'balanced');
 assert.equal(validateGameState(fresh.getState()),true);
 const invalid=structuredClone(fresh.getState());
 invalid.schemaVersion=100;
 assert.equal(fresh.loadState(invalid).ok,false);
 assert.equal(validateGameState(fresh.getState()),true);
});

test('ブラウザ公開検査に保存・復元・再読込・モバイルの確認が含まれる',()=>{
 const qa=read('scripts/qa-browser.mjs');
 for(const term of ['1440','390','save-game','load-game','Page.reload','story-dialog','choice-feedback'])assert.ok(qa.includes(term),term);
 assert.match(read('index.html'),/lang="ja"/);
 assert.match(read('index.html'),/aria-labelledby="story-title"/);
 assert.match(read('index.html'),/id="choice-feedback"[^>]*tabindex="-1"/);
});