import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameStore} from '../js/core/gameState.js';
const next=(store,n)=>{for(let i=0;i<n;i++)assert.equal(store.advanceTurn().ok,true);};
test('家族3人の初期生成と状態の不変性',()=>{
 const g=createGameStore();g.startNewGame({name:'さくら',seed:32});const s=g.getState();
 assert.equal(s.people.length,3);assert.equal(s.people[0].name,'さくら');assert.equal(s.household.memberIds.length,3);
 assert.equal(Object.isFrozen(s.people[1]),true);
});
test('家族との交流と不正入力',()=>{
 const g=createGameStore();assert.equal(g.performAction('socialize',{personId:'FAMILY-001'}).ok,false);
 g.startNewGame();const t=g.getState().timeline.turnsElapsed;
 assert.equal(g.performAction('socialize',{personId:'FAMILY-001'}).ok,true);
 assert.equal(g.getState().people[1].relationship,68);assert.equal(g.getState().timeline.turnsElapsed,t);
 assert.equal(g.performAction('socialize',{personId:'bad'}).ok,false);
});
test('年度は4月から始まり6歳で小学校へ進む',()=>{
 const g=createGameStore();g.startNewGame();next(g,24); // 2006年1月
 assert.equal(g.getState().education.stage,'未就学');next(g,1); // 2006年4月
 assert.equal(g.getState().education.stage,'小学校');assert.equal(g.getState().education.grade,1);
 assert.ok(g.getState().pendingEvents.some(e=>e.type==='education'));
});
test('学習・技能操作、時間は進まない',()=>{
 const g=createGameStore();g.startNewGame();
 assert.equal(g.performAction('study',{subject:'数学',hours:2}).ok,false);
 next(g,25);const t=g.getState().timeline.turnsElapsed;
 assert.equal(g.performAction('study',{subject:'数学',hours:4}).ok,true);
 assert.equal(g.getState().education.scores['数学'],52);
 assert.equal(g.getState().education.studyHours,4);
 assert.equal(g.performAction('study',{subject:'数学',hours:99}).ok,false);
 assert.equal(g.performAction('skill',{skill:'パソコン'}).ok,true);
 assert.equal(g.getState().education.skills['パソコン'],5);
 assert.equal(g.getState().timeline.turnsElapsed,t);
});
test('2015年高校、2018年大学、2022年卒業',()=>{
 const g=createGameStore();g.startNewGame();next(g,60);
 assert.equal(g.getState().education.stage,'中学校');
 next(g,3);assert.equal(g.getState().education.stage,'高校');
 while(g.getState().timeline.year<2018||g.getState().timeline.month<4)g.advanceTurn();
 assert.equal(g.getState().education.stage,'大学');
 while(g.getState().timeline.year<2022||g.getState().timeline.month<4)g.advanceTurn();
 assert.equal(g.getState().education.stage,'卒業');
 assert.ok(g.getState().education.history.length>=6);
});
test('進路希望によって高校卒業後に就職を選べる',()=>{
 const g=createGameStore();g.startNewGame();next(g,65);
 assert.equal(g.performAction('university',{choice:'就職'}).ok,true);
 while(g.getState().timeline.year<2018||g.getState().timeline.month<4)g.advanceTurn();
 assert.equal(g.getState().education.stage,'卒業');
});
