import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGameStore} from '../js/core/gameState.js';
import {validateGameState} from '../js/core/saveSystems.js';
import {isBusinessOperation} from '../js/core/businessOperations.js';
import {PART_TIME_JOBS,economyAction} from '../js/core/economySystems.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('副業UIは6候補・1つの選択エリアと月間収入要約にまとめられている',()=>{
 const layout=read('js/ui/workCompactPanel.js');
 assert.match(layout,/function renderSideJobWorkspace|export function renderSideJobWorkspace/);
 assert.match(layout,/choiceButtons\('働きたい仕事を選択'/);
 assert.match(layout,/副業の月収/);
 assert.match(layout,/この仕事を開始・切替/);
 assert.match(layout,/副業を停止/);
 assert.equal(PART_TIME_JOBS.length,6);
 const finance=read('js/ui/economyPanels.js');
 assert.match(finance,/renderSideJobWorkspace\(section,game,handlers.onAction\)/);
 assert.ok(!finance.includes("if(screen.id==='WORK-03'){\n    section.append(econEl('h3'"));
});
test('経営UIは主要指標を6枚だけ表示し管理用5タブに分割する',()=>{
 const layout=read('js/ui/workCompactPanel.js');
 assert.match(layout,/const TABS=Object.freeze/);
 for(const tab of ['経営・方針','設備','融資・資金','従業員','履歴・指標'])
  assert.match(layout,new RegExp(tab));
 assert.match(layout,/role','tablist/);
 assert.match(layout,/role','tabpanel/);
 assert.match(layout,/\['利益見込／月'/);
 assert.match(layout,/business-compact-pane/);
 assert.match(layout,/panel\.hidden=!active/);
 const finance=read('js/ui/economyPanels.js');
 assert.match(finance,/renderBusinessWorkspace\(section,game,handlers.onAction\)/);
});
test('重要な事業操作はすべて元のゲーム処理へ接続し別枠の操作制限を維持',()=>{
 const layout=read('js/ui/workCompactPanel.js');
 const actions=[...new Set([...layout.matchAll(/onAction\?\.\('([^']+)'/g)].map(m=>m[1]))];
 for(const action of ['sideJob','startBusiness','closeBusiness','businessPolicy','hireEmployee','restartBusiness',
  'businessLoan','repayBusinessLoan','setLoanRepayment','settleBusinessPayable','restructureBusinessDebt',
  'businessFunding','ownerDraw','setContractRepayment','staffCare','trainStaff','dismissStaff'])
  assert.ok(actions.includes(action),`不足している操作: ${action}`);
 for(const action of actions.filter(a=>a!=='sideJob'&&a!=='startBusiness'&&a!=='closeBusiness'))
  assert.equal(isBusinessOperation(action),true,`別枠に登録されていない事業管理: ${action}`);
 assert.match(layout,/businessActionsRemaining\(game\)/);
 assert.match(layout,/categoryActionAvailable\(game,'仕事・経営'\)/);
});
test('旧データの副業と事業データ・自由行動3回の保存形式は変更しない',()=>{
 const g=createGameStore({interactiveChoices:true});g.startNewGame();
 const s=structuredClone(g.getState());s.pendingEvents=[];
 s.timeline={year:2026,month:5,ageYears:26,turnsElapsed:101,monthsElapsed:316};
 s.turnActions={turn:101,used:0,lastAction:null,categories:[]};s.finances.cash=2000000;
 assert.equal(economyAction(s.finances,'sideJob',{active:true,jobId:'design'},{age:26,date:s.timeline,education:s.education}).ok,true);
 assert.equal(economyAction(s.finances,'startBusiness',{}, {age:26,date:s.timeline,education:s.education}).ok,true);
 assert.equal(validateGameState(s),true);
 assert.equal(g.loadState(s).ok,true);
 assert.equal(g.getState().finances.sideJob.jobId,'design');
 assert.equal(g.getState().finances.business.active,true);
 assert.equal(g.performAction('businessFunding',{amount:50000}).ok,true);
 assert.equal(g.getState().businessTurn.used,1);
 assert.equal(g.getState().turnActions.used,0);
 assert.equal(validateGameState(g.getState()),true);
});
test('事業タブを切り替えても設備ボタンが一括で無効にならない',()=>{
 const code=read('js/ui/businessEquipmentPanel.js');
 assert.match(code,/allowOperations=true/);
 assert.match(code,/disabled\|\|!allowOperations/);
 const css=read('css/phase66.css');
 assert.match(css,/business-compact-pane\[hidden\]/);
 assert.match(css,/@media\(max-width:760px\)/);
 const topic=read('js/ui/topicPage.js');
 assert.match(topic,/\['WORK-03','WORK-04'\]/);
});
