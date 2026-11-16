import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameStore} from '../js/core/gameState.js';
import {validateGameState} from '../js/core/saveSystems.js';
import {socialAction} from '../js/core/socialSystems.js';
import {healthAction,checkupGuidance} from '../js/core/healthSystems.js';
import {careerAction,employmentScore,JOB_POSTINGS} from '../js/core/careerSystems.js';
import {createLifeData} from '../js/core/lifeSystems.js';
import {createEconomyData} from '../js/core/economySystems.js';
import {readFileSync} from 'node:fs';

test('U8: 6歳未満は友人登録不可・6歳で解放される',()=>{
 const g=createGameStore();g.startNewGame();
 assert.match(g.performAction('meetFriend').reason,/6歳/);
 for(let i=0;i<24;i++)g.advanceTurn();
 assert.equal(g.getState().timeline.ageYears,6);
 assert.equal(g.performAction('meetFriend').ok,true);
 const ui=readFileSync(new URL('../js/ui/lifePanels.js',import.meta.url),'utf8');
 assert.match(ui,/あと.*6-age/);
 assert.match(ui,/meet.disabled=age<6/);
});
test('U9: 家族との会話・贈り物・旅行で親密度と費用が変わる',()=>{
 const g=createGameStore();g.startNewGame();const loaded=structuredClone(g.getState());loaded.finances.cash=50000;assert.equal(g.loadState(loaded).ok,true);const before=g.getState().finances.cash;
 assert.equal(g.performAction('familyBond',{personId:'FAMILY-001',activity:'会話'}).ok,true);
 assert.equal(g.getState().people[1].relationship,69);
 assert.equal(g.performAction('familyBond',{personId:'FAMILY-001',activity:'贈り物'}).ok,true);
 assert.equal(g.getState().finances.cash,before-2000);
 assert.equal(g.performAction('familyBond',{personId:'FAMILY-001',activity:'旅行'}).ok,true);
 assert.equal(g.getState().people[1].relationship,89);
 assert.equal(validateGameState(g.getState()),true);
});
test('U12: 交際前の交流は本人と相手が18歳以上であること',()=>{
 const g=createGameStore();g.startNewGame();
 assert.equal(g.performAction('meetFriend').ok,false);
 const s=structuredClone(g.getState());
 s.timeline={year:2018,month:1,ageYears:18,turnsElapsed:72,monthsElapsed:216};
 s.people.push({id:'FRIEND-001',name:'友人',birth:{year:2000,month:1,day:1},role:'友人',relationship:55});
 const r=socialAction(s,'courtship',{personId:'FRIEND-001'});
 assert.equal(r.ok,true);assert.equal(s.people.at(-1).relationship,63);
 assert.equal(socialAction(s,'date',{personId:'FRIEND-001'}).ok,true);
});
test('U11: 職種別研修で採用評価が上がり、資格は重複しない',()=>{
 const education=createLifeData('検証').education,finance=createEconomyData();
 const posting=JOB_POSTINGS.find(p=>p.id==='tech');
 const original=employmentScore(education,posting);
 const context={age:18,date:{year:2018,month:4},education};
 for(let i=0;i<4;i++)assert.equal(careerAction(finance,'careerTraining',{postingId:'tech'},context).ok,true);
 assert.ok(employmentScore(education,posting)>original);
 assert.equal(education.qualifications.filter(q=>q.includes('情報技術')).length,1);
 assert.equal(careerAction(finance,'careerTraining',{postingId:'invalid'},context).ok,false);
});
test('U13: 年齢別の診断・費用・同月再診禁止',()=>{
 assert.notEqual(checkupGuidance(5),checkupGuidance(70));
 const g=createGameStore();g.startNewGame();const loaded=structuredClone(g.getState());loaded.finances.cash=50000;assert.equal(g.loadState(loaded).ok,true);const before=g.getState().finances.cash;
 assert.equal(g.performAction('checkup').ok,true);
 assert.equal(g.getState().finances.cash,before-1000);
 assert.equal(g.performAction('checkup').ok,false);
 assert.equal(validateGameState(g.getState()),true);
});
