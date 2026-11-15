import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameStore} from '../js/core/gameState.js';
import {JOB_POSTINGS,employmentScore,businessMonthlyFigures} from '../js/core/careerSystems.js';
import {validateGameState} from '../js/core/saveSystems.js';
const ageTo=(game,age)=>{while(game.getState().timeline.ageYears<age)game.advanceTurn();};
test('求人データは6社でIDが重複しない',()=>{
 assert.equal(JOB_POSTINGS.length,6);assert.equal(new Set(JOB_POSTINGS.map(p=>p.id)).size,6);
 assert.equal(employmentScore({scores:{国語:50,数学:50,英語:50,理科:50,社会:50},skills:{}},JOB_POSTINGS[0]),43);
});
test('求人選考・評価不足・企業ごとの転職・応募記録',()=>{
 const game=createGameStore();game.startNewGame();ageTo(game,18);
 const rejected=game.performAction('applyJob',{postingId:'pro'});
 assert.equal(rejected.ok,false);assert.equal(game.getState().finances.career.job,null);
 const passed=game.performAction('applyJob',{postingId:'shop'});
 assert.equal(passed.ok,true);assert.equal(passed.passed,true);
 assert.equal(game.getState().finances.career.company,'みらい販売');
 const missed=game.performAction('applyJob',{postingId:'tech'});
 assert.equal(missed.ok,true);assert.equal(missed.passed,false);
 assert.equal(game.getState().finances.career.company,'みらい販売');
 assert.equal(game.getState().finances.career.applications.length,2);
 assert.equal(game.performAction('applyJob',{postingId:'none'}).ok,false);
});
test('昇進審査と勤続条件',()=>{
 const game=createGameStore();game.startNewGame();ageTo(game,18);
 game.performAction('applyJob',{postingId:'shop'});
 assert.equal(game.performAction('promotionExam').ok,false);
 for(let i=0;i<12;i++)game.advanceTurn();
 const decision=game.performAction('promotionExam');
 assert.equal(decision.ok,true);
 const state=game.getState();assert.equal(state.finances.career.rank,2);
 assert.equal(state.finances.career.monthlySalary,215000);
});
test('従業員数・経営方針・毎月の収支に反映',()=>{
 const game=createGameStore();game.startNewGame();ageTo(game,18);game.performAction('findJob',{job:'技術職'});ageTo(game,20);
 assert.equal(game.performAction('startBusiness').ok,true);
 assert.equal(game.performAction('hireEmployee').ok,true);
 assert.equal(game.performAction('businessPolicy',{policy:'成長'}).ok,true);
 assert.equal(game.performAction('businessPolicy',{policy:'不正'}).ok,false);
 const before=game.getState().finances;
 assert.equal(before.business.employees,1);assert.equal(before.business.policy,'成長');
 const predicted=businessMonthlyFigures(before.business,game.getState().world.phase);
 assert.ok(predicted.revenue>before.business.monthlyRevenue);
 game.advanceTurn();const after=game.getState().finances;
 assert.equal(after.ledger.some(row=>row.label==='事業売上'),true);
 assert.equal(after.ledger.some(row=>row.label==='事業経費'),true);
 assert.equal(validateGameState(game.getState()),true);
});
test('第9段階形式の保存データとの互換性',()=>{
 const game=createGameStore();game.startNewGame();ageTo(game,18);
 const old=JSON.parse(JSON.stringify(game.getState()));
 assert.equal(old.finances.career.applications,undefined);
 assert.equal(validateGameState(old),true);
 assert.equal(game.loadState(old).ok,true);
 assert.equal(game.performAction('applyJob',{postingId:'shop'}).ok,true);
 assert.equal(validateGameState(game.getState()),true);
});
