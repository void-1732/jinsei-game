import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameStore} from '../js/core/gameState.js';
import {validateGameState} from '../js/core/saveSystems.js';
const advanceUntil=(store,y,m)=>{let steps=0;while(true){const t=store.getState().timeline;if(t.year>y||t.year===y&&t.month>=m)break;assert.equal(store.advanceTurn().ok,true);if(++steps>1000)throw Error('進行できません');}};
test('第34段階：中学在学中に志望校を選べ、条件未達なら代替進学',()=>{
 const g=createGameStore();g.startNewGame();advanceUntil(g,2014,1);
 assert.equal(g.performAction('chooseSchool',{stage:'高校',school:'進学校'}).ok,true);
 assert.equal(g.performAction('chooseSchool',{stage:'高校',school:'不明'}).ok,false);
 advanceUntil(g,2015,4);
 assert.equal(g.getState().education.school,'地域高校');
 assert.equal(g.getState().education.entrance.status,'第一志望不合格・代替進学');
 assert.equal(g.getState().education.entrance.preference,'進学校');
});
test('第34段階：成績条件を満たす志望校を選択した場合は合格',()=>{
 const g=createGameStore();g.startNewGame();advanceUntil(g,2014,1);
 for(let i=0;i<13;i++)assert.equal(g.performAction('prepareExam').ok,true);
 assert.equal(g.performAction('chooseSchool',{stage:'高校',school:'進学校'}).ok,true);
 advanceUntil(g,2015,4);assert.equal(g.getState().education.school,'進学校');assert.equal(g.getState().education.entrance.status,'合格');
});
test('第34段階：子どもの学年段階が進み、子育て支援は保存可能',()=>{
 const g=createGameStore();g.startNewGame();advanceUntil(g,2020,1);
 g.performAction('meetFriend');const id=g.getState().people.at(-1).id;
 for(let i=0;i<16;i++)g.performAction('socialize',{personId:id});
 assert.equal(g.performAction('date',{personId:id}).ok,true);
 assert.equal(g.performAction('marry',{personId:id}).ok,true);
 assert.equal(g.performAction('haveChild',{name:'未来'}).ok,true);
 const child=g.getState().people.find(p=>p.role==='子');
 assert.equal(g.performAction('familyActivity',{personId:child.id,activity:'勉強を手伝う'}).ok,true);
 assert.equal(g.getState().people.find(p=>p.id===child.id).learningSupport,3);
 assert.ok(validateGameState(g.getState()));
 const restored=createGameStore();assert.equal(restored.loadState(g.getState()).ok,true);
 advanceUntil(restored,2026,4);
 assert.equal(restored.getState().people.find(p=>p.id===child.id).lifeStage,'小学校');
});
test('第34段階：不正な家族行動を拒否',()=>{
 const g=createGameStore();g.startNewGame();assert.equal(g.performAction('familyActivity',{personId:'NONE',activity:'遊ぶ'}).ok,false);
});
test('第34段階：旧形式の学業データを補完して読み込み',()=>{
 const g=createGameStore();g.startNewGame();const old=structuredClone(g.getState());delete old.education.schoolPreference;
 assert.equal(g.loadState(old).ok,true);assert.deepEqual(g.getState().education.schoolPreference,{高校:'自動',大学:'自動'});
});
