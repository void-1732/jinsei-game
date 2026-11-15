import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGameStore} from '../js/core/gameState.js';
import {allScreens,assertCatalogIntegrity} from '../js/core/screenCatalog.js';
import {screenDetails} from '../js/core/screenDetails.js';
import {getScreenFieldValues,getConnectedFieldCount} from '../js/core/screenFieldValues.js';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const store=()=>{const x=createGameStore();assert.equal(x.startNewGame({name:'検証者'}).ok,true);return x;};
test('第26段階：61画面の実データ投影は読み取り専用で例外なく実行できる',()=>{
  assertCatalogIntegrity();const x=store();const before=JSON.stringify(x.getState());
  for(const screen of allScreens){const v=getScreenFieldValues(screen.id,x.getState());assert.equal(typeof v,'object');assert.ok(Object.isFrozen(v));for(const field of Object.keys(v)){assert.ok(screenDetails[screen.id].fields.includes(field),`${screen.id}: ${field}`);assert.equal(typeof v[field],'string');}}
  assert.equal(JSON.stringify(x.getState()),before);assert.equal(allScreens.length,61);
});
test('第26段階：家計・人物・学業・健康・社会の値を現在のゲーム状態から得る',()=>{
  const x=store(),s=x.getState();
  assert.match(getScreenFieldValues('LIFE-03',s)['収入内訳'],/給与0円/);
  assert.equal(getScreenFieldValues('PERSON-01',s)['人物名'],'検証者');
  assert.match(getScreenFieldValues('EDU-03',s)['学力・成績'],/50点/);
  assert.equal(getScreenFieldValues('HEALTH-01',s)['体力'],'85点');
  assert.equal(getScreenFieldValues('SOCIETY-02',s)['景気'],'通常');
  assert.match(getScreenFieldValues('SETTING-06',s)['画面数'],/61画面/);
});
test('第26段階の読み取り規約：住居・保険は第27段階の実データを使用し現実の世界経済は捏造しない',()=>{
  const x=store(),s=x.getState();
  assert.equal(getConnectedFieldCount('LIFE-02',s,screenDetails['LIFE-02'].fields),6);
  assert.equal(getConnectedFieldCount('LIFE-07',s,screenDetails['LIFE-07'].fields),4);
  assert.deepEqual(getScreenFieldValues('SOCIETY-03',s),{});
  assert.equal(Object.keys(getScreenFieldValues('LIFE-03',s)).length>0,true);
});
test('第26段階：未開始時には値を返さず、時間進行で現在年月が変わる',()=>{
  const x=createGameStore();assert.deepEqual(getScreenFieldValues('PERSON-01',x.getState()),{});
  x.startNewGame({name:'進行者'});const old=getScreenFieldValues('LIFE-01',x.getState())['人生サマリー'];x.advanceTurn();const now=getScreenFieldValues('LIFE-01',x.getState())['人生サマリー'];assert.notEqual(old,now);
});
test('第26段階：画面では実データと未接続項目を区別し、版数を更新する',()=>{
  const src=read('js/ui/screenRenderer.js');assert.match(src,/getScreenFieldValues/);assert.match(src,/未実装・未接続/);assert.match(src,/field-connected/);assert.match(read('index.html'),/lang="ja"/);assert.match(read('package.json'),/"version": "4\.3\.0"/);
});
