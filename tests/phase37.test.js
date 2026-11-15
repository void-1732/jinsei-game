import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {allScreens,LEGACY_SCREEN_IDS,ACADEMIC_SCREEN_IDS,screenGroups} from '../js/core/screenCatalog.js';
import {createUiStore} from '../js/ui/uiState.js';
const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
test('第40段階：既存55画面と学業6画面、9カテゴリを維持',()=>{
 assert.equal(allScreens.length,61);assert.equal(LEGACY_SCREEN_IDS.length,55);assert.equal(ACADEMIC_SCREEN_IDS.length,6);assert.equal(screenGroups.length,9);
 assert.equal(new Set(allScreens.map(s=>s.id)).size,61);
});
test('第40段階：履歴操作と検索はゲーム状態と分離',()=>{
 const ui=createUiStore();const next=allScreens[1];
 assert.equal(ui.navigateTo(next.id),true);assert.equal(ui.getState().activeScreenId,next.id);
 ui.setSearchQuery('学業');ui.setFieldFilter(next.id,'年齢');
 assert.equal(ui.back(),true);assert.equal(ui.getState().activeScreenId,'LIFE-01');
 assert.equal(ui.forward(),true);assert.equal(ui.getState().activeScreenId,next.id);
 assert.equal(ui.getState().fieldFilters[next.id],'年齢');
});
test('第40段階：画面操作の結果が再描画直後に消えない',()=>{
 const source=read('js/app.js');assert.match(source,/actionFeedback=result\.message/);
 assert.match(source,/actionFeedback\|\|`\$\{screen\.id\}/);
 assert.match(source,/if\(lastScreenId!==screen\.id\)/);
});
test('第40段階：表示項目の名称・値で絞り込み、接続数を保持',()=>{
 const source=read('js/ui/screenRenderer.js');
 assert.match(source,/row\.dataset\.value=String\(fieldValues\[field\]/);
 assert.match(source,/row\.dataset\.field} \$\{row\.dataset\.value}/);
 assert.match(source,/const count = 0|let count = 0/);
 assert.doesNotMatch(source,/第28段階 · データ接続状況/);
});
test('第40段階：日本語表示・キーボード移動・視認性',()=>{
 const page=read('index.html');const css=read('css/phase37.css');
 assert.match(page,/lang="ja"/);assert.match(page,/本文へ移動/);assert.match(page,/第48段階/);
 assert.match(page,/aria-atomic="true"/);assert.match(css,/:focus-visible/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(read('package.json'),/"version": "4\.9\.0"/);
});
