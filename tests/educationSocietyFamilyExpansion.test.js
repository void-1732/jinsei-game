import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameStore} from '../js/core/gameState.js';
import {validateGameState} from '../js/core/saveSystems.js';
import {academicAssessment,admissionsForecast,schoolCareerImpact} from '../js/core/schoolCompetition.js';
import {civicAction,communityEffects,advanceCivicMonth,validateCivicProgress} from '../js/core/civicSystems.js';
import {socialAction} from '../js/core/socialSystems.js';
import {availableCenterOptions} from '../js/ui/actionCenter.js';

function adult(){
 const game=createGameStore({interactiveChoices:true});
 assert.equal(game.startNewGame().ok,true);
 const s=structuredClone(game.getState());
 s.pendingEvents=[];s.timeline={year:2028,month:5,ageYears:28,turnsElapsed:101,monthsElapsed:340};
 s.turnActions={turn:101,used:0,lastAction:null,categories:[]};s.finances.cash=600000;
 assert.equal(game.loadState(s).ok,true);
 return game;
}
test('家族行事と関係修復は対象を指定し、費用と信頼を反映する',()=>{
 const s=structuredClone(adult().getState()),parent=s.people.find(p=>p.role==='母');
 parent.relationship=40;
 const cash=s.finances.cash;
 const event=socialAction(s,'familyBond',{personId:parent.id,activity:'家族行事'});
 assert.equal(event.ok,true);
 assert.equal(s.finances.cash,cash-15000);
 assert.equal(parent.relationship,49);
 const repair=socialAction(s,'familyBond',{personId:parent.id,activity:'関係を修復'});
 assert.equal(repair.ok,true);
 assert.equal(parent.relationship,56);
 assert.equal(socialAction(s,'familyBond',{personId:'invalid',activity:'家族行事'}).ok,false);
 assert.equal(validateGameState(s),true);
});
test('学校ごとに難易度・学費・出席率と準備が評価に反映される',()=>{
 const s=structuredClone(adult().getState()),e=s.education;
 const before=admissionsForecast(e,'大学','難関大学');
 assert.equal(before.ok,true);
 assert.ok(before.threshold>admissionsForecast(e,'大学','地域大学').threshold);
 assert.ok(before.tuition>admissionsForecast(e,'大学','地域大学').tuition);
 e.examPreparation+=5;
 const after=admissionsForecast(e,'大学','難関大学');
 assert.ok(after.entranceScore>=before.entranceScore);
 assert.ok(academicAssessment(e).attendance>=0);
 assert.ok(Number.isInteger(schoolCareerImpact(e).hiringBonus));
 assert.equal(validateGameState(s),true);
});
test('地域活動は自由行動・信頼・支出に反映し、同じ月の二重行動を拒否',()=>{
 const g=adult();
 assert.equal(availableCenterOptions(g.getState(),'社会').some(x=>x.action==='civicActivity'),true);
 assert.equal(g.performAction('civicActivity',{id:'volunteer'}).ok,true);
 const s=g.getState();
 assert.equal(s.world.civicProgress.reputation,45);
 assert.equal(g.performAction('civicActivity',{id:'neighborhood'}).ok,false);
 assert.equal(validateCivicProgress(s.world.civicProgress),true);
 assert.equal(validateGameState(s),true);
});
test('地域政策は同一月を再実行しても不変、旧セーブには新フィールド不要',()=>{
 const s=structuredClone(adult().getState());
 assert.equal(validateGameState(s),true);
 assert.equal(advanceCivicMonth(s,{year:2028,month:4}).length,1);
 const p=s.world.civicProgress.policy;
 assert.equal(advanceCivicMonth(s,{year:2028,month:4}).length,0);
 assert.equal(communityEffects(s).policy,p);
 assert.equal(validateGameState(s),true);
 const old=structuredClone(s);delete old.world.civicProgress;
 assert.equal(validateGameState(old),true);
});
