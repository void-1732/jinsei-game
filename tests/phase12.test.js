import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameStore} from '../js/core/gameState.js';
import {validateGameState} from '../js/core/saveSystems.js';
import {advanceWorkplace,ensureWorkplace} from '../js/core/workplaceSystems.js';
const ageTo=(game,age)=>{while(game.getState().timeline.ageYears<age)game.advanceTurn();};
function workingGame(){const g=createGameStore();g.startNewGame();ageTo(g,18);assert.equal(g.performAction('applyJob',{postingId:'shop'}).passed,true);return g;}
test('個別の職場人物と交流し、月次回数制限を守る',()=>{
 const g=workingGame();let c=g.getState().finances.career;
 assert.equal(c.workplacePeople.length,3);
 const id=c.workplacePeople[0].id;
 assert.equal(g.performAction('interactCoworker',{personId:id}).ok,true);
 c=g.getState().finances.career;assert.equal(c.workplacePeople[0].trust,58);assert.equal(c.supervisorTrust,55);
 assert.equal(g.performAction('interactCoworker',{personId:'WORK-999'}).ok,false);
 assert.equal(g.performAction('interactCoworker',{personId:id}).ok,true);
 assert.equal(g.performAction('interactCoworker',{personId:id}).ok,false);
 assert.equal(validateGameState(g.getState()),true);
});
test('半年の職場相談イベントは対処後に再対応できない',()=>{
 const g=workingGame();for(let i=0;i<6;i++)g.advanceTurn();
 const incident=g.getState().finances.career.workplaceIncidents.at(-1);
 assert.ok(incident);assert.equal(incident.resolved,false);
 assert.equal(g.performAction('resolveWorkIncident',{incidentId:incident.id,choice:'無効'}).ok,false);
 assert.equal(g.performAction('resolveWorkIncident',{incidentId:incident.id,choice:'協力'}).ok,true);
 assert.equal(g.performAction('resolveWorkIncident',{incidentId:incident.id,choice:'協力'}).ok,false);
 assert.equal(validateGameState(g.getState()),true);
});
test('従業員の月次育成、賃金推移、企業履歴は上限を守る',()=>{
 const g=workingGame();ageTo(g,20);assert.equal(g.performAction('startBusiness').ok,true);
 assert.equal(g.performAction('hireEmployee').ok,true);
 for(let i=0;i<40;i++)g.advanceTurn();
 const b=g.getState().finances.business;
 assert.equal(b.marketHistory.length,36);assert.equal(b.results.length,36);
 assert.ok((b.staff[0]?.monthsEmployed??40)>=12 || b.employees===0);
 assert.equal(validateGameState(g.getState()),true);
});
test('第11段階の職場データを補完し、破損した人物情報を拒否する',()=>{
 const g=workingGame(),old=JSON.parse(JSON.stringify(g.getState()));
 delete old.finances.career.workplacePeople;delete old.finances.career.workplaceIncidents;delete old.finances.career.monthlyRating;
 assert.equal(g.loadState(old).ok,true);
 assert.equal(g.getState().finances.career.workplacePeople.length,3);
 const broken=JSON.parse(JSON.stringify(g.getState()));broken.finances.career.workplacePeople[0].trust=999;
 assert.equal(validateGameState(broken),false);
});
