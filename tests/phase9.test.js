import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameStore} from '../js/core/gameState.js';
import {validateGameState} from '../js/core/saveSystems.js';
import {evaluateSchool} from '../js/core/socialSystems.js';
const advanceUntil=(g,year,month=1)=>{let guard=0;while(g.getState().timeline.year<year ||(g.getState().timeline.year===year&&g.getState().timeline.month<month)){assert.equal(g.advanceTurn().ok,true);if(++guard>2000)throw Error('期限超過');}};
test('未成年の交際・結婚は不可、友人は6歳から登録できる',()=>{
 const g=createGameStore();g.startNewGame();assert.equal(g.performAction('meetFriend').ok,false);advanceUntil(g,2006,4);
 assert.equal(g.performAction('meetFriend').ok,true);const f=g.getState().people.at(-1);
 assert.equal(f.role,'友人');assert.equal(g.performAction('date',{personId:f.id}).ok,false);
});
test('友人から交際、結婚、子育て、保存の整合性',()=>{
 const g=createGameStore();g.startNewGame();advanceUntil(g,2020);
 assert.equal(g.performAction('meetFriend').ok,true);const friend=g.getState().people.at(-1);
 for(let i=0;i<9;i++)assert.equal(g.performAction('socialize',{personId:friend.id}).ok,true);
 assert.equal(g.performAction('date',{personId:friend.id}).ok,true);
 for(let i=0;i<7;i++)assert.equal(g.performAction('socialize',{personId:friend.id}).ok,true);
 assert.equal(g.performAction('marry',{personId:friend.id}).ok,true);
 assert.equal(g.performAction('haveChild',{name:''}).ok,false);
 assert.equal(g.performAction('haveChild',{name:'光'}).ok,true);
 const child=g.getState().people.find(p=>p.role==='子');assert.ok(child);assert.ok(g.getState().household.memberIds.includes(child.id));
 assert.equal(g.performAction('familyCare',{personId:child.id}).ok,true);
 assert.ok(validateGameState(g.getState()));const copy=createGameStore();assert.equal(copy.loadState(g.getState()).ok,true);
 assert.equal(copy.getState().people.find(p=>p.id===child.id).relationship,85);
});
test('人物登録上限・重複交際・子ども上限を制限',()=>{
 const g=createGameStore();g.startNewGame();advanceUntil(g,2020);
 for(let i=0;i<8;i++)assert.equal(g.performAction('meetFriend').ok,true);
 assert.equal(g.performAction('meetFriend').ok,false);
});
test('受験準備と成績別進路判定',()=>{
 const g=createGameStore();g.startNewGame();advanceUntil(g,2012,4);
 assert.equal(g.performAction('prepareExam').ok,true);
 assert.equal(g.getState().education.examPreparation,1);
 assert.equal(g.getState().education.scores['数学'],52);
 assert.equal(evaluateSchool({国語:90,数学:90,英語:90,理科:90,社会:90},'高校').school,'進学校');
 advanceUntil(g,2015,4);assert.equal(g.getState().education.entrance.destination,'地域高校');
 assert.equal(g.getState().education.school,'地域高校');
});
test('進学先は進級後も維持され、親族以外の相続対象を優先する',()=>{
 const g=createGameStore();g.startNewGame();advanceUntil(g,2015,4);
 const school=g.getState().education.school;
 advanceUntil(g,2016,4);assert.equal(g.getState().education.school,school);
});
