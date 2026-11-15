import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameStore} from '../js/core/gameState.js';
import {createHealthData,advanceHealth,healthAction} from '../js/core/healthSystems.js';
import {createEconomyData} from '../js/core/economySystems.js';
import {createWorldData,updateWorld,incomeMultiplier} from '../js/core/worldSystems.js';
import {createChoiceEvent} from '../js/core/eventSystems.js';
const toAge=(g,age)=>{while(g.getState().timeline.ageYears<age)g.advanceTurn();};
test('健康初期値、ターン更新、行動の月次上限',()=>{
 const g=createGameStore();g.startNewGame();assert.equal(g.getState().health.physical,85);
 assert.equal(g.performAction('habit',{habit:'休養'}).ok,true);
 assert.equal(g.performAction('habit',{habit:'運動'}).ok,false);
 g.advanceTurn();assert.equal(g.performAction('habit',{habit:'運動'}).ok,true);
 assert.equal(g.getState().health.healthHistory.length,3);
});
test('病気の発症、自然治癒、診療費と診療回数',()=>{
 const h=createHealthData();advanceHealth(h,{year:2010,month:1},10,0);assert.equal(h.illness.name,'体調不良');
 const money=createEconomyData();
 const result=healthAction(h,'treatment',{}, {year:2010,month:1},money);
 assert.equal(result.ok,true);assert.equal(money.debt,3500);assert.equal(h.illness,null);assert.equal(h.medicalVisits,1);
 assert.equal(healthAction(h,'treatment',{}, {year:2010,month:1},money).ok,false);
 const other=createHealthData();advanceHealth(other,{year:2010,month:1},10,0);
 for(let i=0;i<3;i++)advanceHealth(other,{year:2010,month:i+2},10,1);
 assert.equal(other.illness,null);
});
test('景気とニュースは再現可能、範囲制限がある',()=>{
 const a=createWorldData(),b=createWorldData();
 for(let i=0;i<400;i++){
  const d={year:2000+Math.floor(i/12),month:i%12+1};const val=(i%7)/7;
  assert.deepEqual(updateWorld(a,d,val),updateWorld(b,d,val));
 }
 assert.deepEqual(a,b);assert.ok(a.news.length<=48);assert.ok(a.history.length<=360);
 assert.ok(a.economyIndex>=65&&a.economyIndex<=135);
 assert.equal(incomeMultiplier({phase:'不況'}),0.9);
});
test('選択イベントの不正入力を拒否し、選択は一度だけ反映',()=>{
 const g=createGameStore();g.startNewGame();toAge(g,15);
 const state=g.getState();const event=createChoiceEvent({year:2015,month:4},100,15,0);
 assert.ok(event?.options.length===3);
 while(!g.getState().pendingEvents.some(e=>e.type==='choice') && g.getState().timeline.year<2060)g.advanceTurn();
 const e=g.getState().pendingEvents.find(e=>e.type==='choice');assert.ok(e);
 assert.equal(g.acknowledgeEvent(e.id),false);
 assert.equal(g.performAction('resolveChoice',{eventId:e.id,choice:'fake'}).ok,false);
 const before=g.getState().health.mental;
 assert.equal(g.performAction('resolveChoice',{eventId:e.id,choice:'rest'}).ok,true);
 assert.equal(g.performAction('resolveChoice',{eventId:e.id,choice:'rest'}).ok,false);
 assert.ok(g.getState().health.mental>=before);
});
test('第5段階経済との接続と決定性',()=>{
 const a=createGameStore(),b=createGameStore();a.startNewGame({seed:12});b.startNewGame({seed:12});
 toAge(a,20);toAge(b,20);
 a.performAction('findJob',{job:'事務職'});b.performAction('findJob',{job:'事務職'});
 for(let i=0;i<14;i++){a.advanceTurn();b.advanceTurn();}
 assert.deepEqual(a.getState(),b.getState());
 assert.ok(a.getState().finances.ledger.length>0);assert.ok(a.getState().world.news.length>0);
});
