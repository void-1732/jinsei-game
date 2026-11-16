import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGameStore} from '../js/core/gameState.js';
import {previewStudentDay,validateStudentBalance,performStudentDay} from '../js/core/studentBalance.js';
import {validateGameState} from '../js/core/saveSystems.js';
import {allScreens} from '../js/core/screenCatalog.js';
import {topicGroups} from '../js/ui/topicGroups.js';

const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function student(){
 const game=createGameStore();game.startNewGame({name:'学生テスト'});
 for(let i=0;i<25;i++)assert.equal(game.advanceTurn().ok,true);
 assert.equal(game.getState().education.stage,'小学校');
 return game;
}
test('学習・遊び・休息が同じ8時間予算を使い、プレビューは状態を変更しない',()=>{
 const game=student(),state=game.getState(),before=JSON.stringify(state);
 const balanced=previewStudentDay(state,{subject:'数学',studyHours:2,playHours:2});
 assert.equal(balanced.ok,true);assert.equal(balanced.restHours,4);
 assert.ok(balanced.mentalChange>0);assert.ok(balanced.scoreGain>0);
 const cramming=previewStudentDay(state,{subject:'数学',studyHours:6,playHours:0});
 assert.equal(cramming.restHours,2);
 assert.ok(cramming.mentalChange<balanced.mentalChange);
 assert.equal(previewStudentDay(state,{subject:'数学',studyHours:6,playHours:6}).ok,false);
 assert.equal(JSON.stringify(state),before);
});
test('学生生活の行動を1度実行すると学業と健康と交流に影響し、二重実行はできない',()=>{
 const game=student(),before=game.getState();
 const out=game.performAction('studentDay',{subject:'数学',studyHours:2,playHours:2});
 assert.equal(out.ok,true,out.reason);
 const state=game.getState();
 assert.ok(state.education.scores.数学>before.education.scores.数学);
 assert.equal(state.education.studyHours,before.education.studyHours+2);
 assert.ok(state.health.mental>before.health.mental);
 assert.ok(state.people[1].relationship>before.people[1].relationship);
 assert.equal(game.performAction('studentDay',{subject:'数学',studyHours:2,playHours:2}).ok,false);
 assert.equal(validateGameState(state),true);
});
test('休息不足の詰め込み学習は体力に不利益を生む',()=>{
 const game=student(),s=structuredClone(game.getState());
 const result=performStudentDay(s,{subject:'国語',studyHours:6,playHours:2});
 assert.equal(result.ok,true);
 assert.equal(result.plan.restHours,0);
 assert.ok(s.health.energy<game.getState().health.energy);
 assert.ok(s.health.mental<game.getState().health.mental);
});
test('学齢外と不正な時間は拒否し、過去のデータ形式と保存互換性を保つ',()=>{
 const game=createGameStore();game.startNewGame();
 assert.equal(game.performAction('studentDay',{subject:'数学',studyHours:2,playHours:2}).ok,false);
 const s=structuredClone(student().getState());
 assert.equal(s.education.studentBalance,undefined);
 assert.equal(validateGameState(s),true);
 const restored=createGameStore();assert.equal(restored.loadState(s).ok,true);
 assert.equal(restored.performAction('studentDay',{subject:'数学',studyHours:2,playHours:2}).ok,true);
 assert.equal(validateGameState(restored.getState()),true);
 const bad=structuredClone(restored.getState());bad.education.studentBalance.restHours=-1;
 assert.equal(validateGameState(bad),false);
 assert.equal(validateStudentBalance(undefined,10),true);
});
test('画面IDは61件を保持しつつ、重複する画面タブを統合する',()=>{
 assert.equal(allScreens.length,61);
 assert.equal(Object.keys(topicGroups).length,9);
 const dock=file('js/ui/categoryDock.js');
 const topic=file('js/ui/topicPage.js');
 const nav=file('js/ui/navigation.js');
 assert.ok(!dock.includes("const sub=node('div','topic-screen-tabs')"));
 assert.match(topic,/topic-detail-picker/);
 assert.match(nav,/topicGroups\[group.category\]/);
 assert.match(file('js/ui/lifePanels.js'),/renderStudentBalancePanel/);
 assert.match(file('index.html'),/student-balance.css/);
});
