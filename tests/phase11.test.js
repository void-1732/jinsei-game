import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameStore} from '../js/core/gameState.js';
import {validateGameState} from '../js/core/saveSystems.js';
import {businessMonthlyFigures} from '../js/core/careerSystems.js';
const ageTo=(game,age)=>{while(game.getState().timeline.ageYears<age)game.advanceTurn();};
test('職場での行動・月2回制限・月次復帰',()=>{
 const g=createGameStore();g.startNewGame();ageTo(g,18);g.performAction('applyJob',{postingId:'shop'});
 assert.equal(g.performAction('workHard').ok,true);
 assert.equal(g.performAction('helpColleague').ok,true);
 assert.equal(g.performAction('talkSupervisor').ok,false);
 assert.ok(g.getState().finances.career.coworkerTrust>50);
 g.advanceTurn();assert.equal(g.getState().finances.career.workplaceActions,0);
 assert.equal(g.performAction('talkSupervisor').ok,true);
});
test('人事評価の条件・保存互換性',()=>{
 const g=createGameStore();g.startNewGame();ageTo(g,18);g.performAction('applyJob',{postingId:'shop'});
 assert.equal(g.performAction('reviewPerformance').ok,false);
 for(let i=0;i<3;i++)g.advanceTurn();
 assert.equal(g.performAction('reviewPerformance').ok,true);
 const s=g.getState();assert.equal(s.finances.career.reviews.length,1);
 assert.equal(validateGameState(s),true);
 const old=JSON.parse(JSON.stringify(s));delete old.finances.career.performance;delete old.finances.career.reviews;
 assert.equal(g.loadState(old).ok,true);assert.equal(g.getState().finances.career.performance,50);
});
test('従業員研修・人件費・退職処理',()=>{
 const g=createGameStore();g.startNewGame();ageTo(g,18);g.performAction('findJob',{job:'技術職'});ageTo(g,20);
 assert.equal(g.performAction('startBusiness').ok,true);
 assert.equal(g.performAction('hireEmployee').ok,true);
 const before=g.getState(),id=before.finances.business.staff[0].id;
 const grossBefore=businessMonthlyFigures(before.finances.business,'通常').revenue;
 assert.equal(g.performAction('trainStaff',{staffId:id}).ok,true);
 const after=g.getState();assert.equal(after.finances.business.staff[0].skill,57);
 assert.ok(businessMonthlyFigures(after.finances.business,'通常').revenue>grossBefore);
 assert.equal(g.performAction('dismissStaff',{staffId:id}).ok,true);
 assert.equal(g.getState().finances.business.employees,0);
 assert.equal(validateGameState(g.getState()),true);
});
test('複数月の企業業績記録と不正データの拒否',()=>{
 const g=createGameStore();g.startNewGame();ageTo(g,18);g.performAction('findJob',{job:'技術職'});ageTo(g,20);g.performAction('startBusiness');g.performAction('hireEmployee');
 for(let i=0;i<40;i++)g.advanceTurn();
 const state=g.getState();assert.equal(state.finances.business.results.length,36);
 assert.equal(validateGameState(state),true);
 const broken=JSON.parse(JSON.stringify(state));broken.finances.business.staff[0].salary=-500;
 assert.equal(validateGameState(broken),false);
});
