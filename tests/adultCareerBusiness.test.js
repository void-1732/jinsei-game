import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGameStore} from '../js/core/gameState.js';
import {createEconomyData,economyAction} from '../js/core/economySystems.js';
import {careerAction,careerStage,CAREER_PLANS} from '../js/core/careerSystems.js';
import {advanceWorkplace} from '../js/core/workplaceSystems.js';
import {validateGameState} from '../js/core/saveSystems.js';
import {businessActionsRemaining,isBusinessOperation} from '../js/core/businessOperations.js';
const json=x=>structuredClone(x);

function adultBusiness(){
 const store=createGameStore({interactiveChoices:true});
 assert.equal(store.startNewGame().ok,true);
 const state=json(store.getState());state.pendingEvents=[];
 state.timeline={year:2025,month:5,ageYears:25,turnsElapsed:100,monthsElapsed:304};
 state.finances.cash=1_000_000;
 assert.equal(economyAction(state.finances,'startBusiness',{}, {age:25,date:state.timeline,education:state.education}).ok,true);
 assert.equal(validateGameState(state),true);
 assert.equal(store.loadState(state).ok,true);
 return store;
}
test('事業設備の操作はゲームストアに接続し3回の独立枠を消費する',()=>{
 const g=adultBusiness();
 assert.equal(businessActionsRemaining(g.getState()),3);
 assert.equal(g.performAction('purchaseEquipment',{amount:50000,type:'製造機械'}).ok,true);
 assert.equal(g.performAction('serviceEquipment',{id:1}).ok,true);
 assert.equal(g.performAction('toggleEquipmentMaintenance',{id:1}).ok,true);
 assert.equal(g.getState().businessTurn.used,3);
 assert.equal(g.performAction('sellEquipmentItem',{id:1}).ok,false);
 assert.match(g.performAction('sellEquipmentItem',{id:1}).reason,/3回/);
 assert.equal(g.getState().turnActions.used,0);
 assert.equal(g.performAction('setBudget',{amount:70000}).ok,true);
 assert.equal(g.getState().turnActions.used,1);
 assert.equal(validateGameState(g.getState()),true);
});
test('自由行動を消費しても設備の点検・修理操作が妨げられない',()=>{
 const g=adultBusiness();const state=g.getState();
 assert.equal(g.performAction('setBudget',{amount:75000}).ok,true);
 assert.equal(g.performAction('purchaseEquipment',{amount:50000,type:'標準設備'}).ok,true);
 assert.equal(g.performAction('toggleEquipmentMaintenance',{id:1}).ok,true);
 assert.equal(g.getState().finances.business.equipmentItems[0].maintenance,true);
 assert.equal(isBusinessOperation('serviceEquipment'),true);
 assert.equal(isBusinessOperation('resign'),false);
 assert.equal(validateGameState(g.getState()),true);
});
test('必要費用・対象設備が不正な操作は回数を消費しない',()=>{
 const g=adultBusiness();
 const before=g.getState().businessTurn.used;
 assert.equal(g.performAction('repairEquipment',{id:999}).ok,false);
 assert.equal(g.getState().businessTurn.used,before);
 assert.equal(g.performAction('purchaseEquipment',{amount:250000,type:'標準設備'}).ok,false);
 assert.equal(g.getState().businessTurn.used,before);
});
test('旧データは事業管理枠を補完し不正な枠は保存できない',()=>{
 const g=adultBusiness(),legacy=json(g.getState());
 delete legacy.businessTurn;
 assert.equal(validateGameState(legacy),true);
 assert.equal(g.loadState(legacy).ok,true);
 assert.equal(g.getState().businessTurn.used,0);
 const invalid=json(g.getState());invalid.businessTurn.used=4;
 assert.equal(validateGameState(invalid),false);
});
test('社会人の各段階と将来方針は勤続・役職と連動する',()=>{
 assert.equal(CAREER_PLANS.length,3);
 const c=createEconomyData().career;
 assert.equal(careerStage(c).name,'就職準備');
 c.job='技術職';c.experience=1;c.rank=1;
 assert.equal(careerStage(c).name,'試用期間');
 c.experience=4;assert.equal(careerStage(c).name,'業務習得期');
 c.experience=12;assert.equal(careerStage(c).name,'中堅社員');
 c.rank=2;assert.equal(careerStage(c).name,'リーダー');
 c.rank=4;assert.equal(careerStage(c).name,'管理職');
});
test('キャリア方針は実際の仕事評価の進行を変え旧セーブを維持する',()=>{
 const f=createEconomyData();f.career.job='技術職';f.career.experience=16;
 const context={date:{year:2025,month:5},education:{scores:{国語:70}},age:25};
 assert.equal(careerAction(f,'setCareerPlan',{plan:'specialist'},context).ok,true);
 assert.equal(careerAction(f,'setCareerPlan',{plan:'invalid'},context).ok,false);
 const old=json(f),newF=json(f);
 delete old.career.plan;
 newF.career.performance=50;old.career.performance=50;
 advanceWorkplace(old,{year:2025,month:6});
 advanceWorkplace(newF,{year:2025,month:6});
 assert.ok(newF.career.performance>old.career.performance);
});
test('設備選択は一か所で、重複のある画面下部の切替を表示しない',()=>{
 const panel=readFileSync(new URL('../js/ui/businessEquipmentPanel.js',import.meta.url),'utf8');
 const economy=readFileSync(new URL('../js/ui/economyPanels.js',import.meta.url),'utf8');
 const topic=readFileSync(new URL('../js/ui/topicPage.js',import.meta.url),'utf8');
 const dock=readFileSync(new URL('../js/ui/categoryDock.js',import.meta.url),'utf8');
 assert.match(panel,/対象設備を選択/);
 assert.match(panel,/serviceEquipment/);
 assert.match(economy,/renderBusinessEquipmentPanel/);
 assert.ok(!economy.includes("section.append(econEl('h3','','事業設備の個別管理'))"));
 assert.ok(!topic.includes("choiceButtons('操作する項目'"));
 assert.match(dock,/topic-screen-tabs/);
});
