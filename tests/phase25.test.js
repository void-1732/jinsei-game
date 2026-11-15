import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {getScreenCoverage,createCoverageReport} from '../js/core/screenCoverage.js';
import {allScreens, LEGACY_SCREEN_IDS, ACADEMIC_SCREEN_IDS} from '../js/core/screenCatalog.js';
import {screenDetails} from '../js/core/screenDetails.js';
const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
test('第25段階：55画面と学業6画面の名称・分類を変えず全画面を棚卸し',()=>{
 const report=createCoverageReport();
 assert.equal(report.totalScreens,61);
 assert.equal(report.categories,9);
 assert.equal(report.connectedScreens,61);
 assert.equal(LEGACY_SCREEN_IDS.length,55);
 assert.equal(ACADEMIC_SCREEN_IDS.length,6);
 assert.equal(report.rows.reduce((n,x)=>n+x.screens,0),61);
 for(const s of allScreens)assert.equal(getScreenCoverage(s.id).title,s.title);
});
test('第25段階：予定操作を正確に集計、原本には干渉しない',()=>{
 const before=JSON.stringify(screenDetails);
 const report=createCoverageReport();
 assert.equal(report.pendingActionLabels,Object.values(screenDetails).reduce((n,x)=>n+x.plannedActions.length,0));
 assert.equal(report.rows.reduce((n,x)=>n+x.plannedActions,0),report.pendingActionLabels);
 assert.equal(JSON.stringify(screenDetails),before);
 assert.equal(getScreenCoverage('NO-SCREEN'),null);
});
test('第25段階：状態表示は日本語で、予定操作を無効化した折りたたみ領域へ分離',()=>{
 const src=read('js/ui/screenRenderer.js');
 assert.match(src,/createElement\('details'\)/);
 assert.match(src,/今後追加する予定の操作/);
 assert.match(src,/disabled = true/);
 assert.match(src,/field-unavailable/);
 assert.doesNotMatch(src,/第11段階 · 機能連携状況/);
 assert.match(src,/画面機能の接続状況/);
});
test('第25段階：画面版数と日本語の案内を更新',()=>{
 assert.match(read('index.html'),/第52段階/);
 assert.match(read('js/app.js'),/v5\.3\.0 · 社会情勢と時代の変化版/);
 assert.match(read('package.json'),/"version": "5\.3\.0"/);
 assert.match(read('index.html'),/lang="ja"/);
});
test('第25段階：人生の月間収入に事業口座の売上を混入させない',()=>{
 const src=read('js/ui/screenRenderer.js');
 const monthly=src.match(/const amount=name==='総資産'[\s\S]*?;metric\.append/);
 assert.ok(monthly);
 assert.doesNotMatch(monthly[0],/monthlyRevenue/);
});
