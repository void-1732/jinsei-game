import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameStore} from '../js/core/gameState.js';
import {jobMarketAdjustment,updateLaborMarket,createWorldData} from '../js/core/worldSystems.js';
import {validateGameState} from '../js/core/saveSystems.js';
const ageTo=(game,year,month=1)=>{let steps=0;while(true){const t=game.getState().timeline;if(t.year>year||(t.year===year&&t.month>=month))break;assert.equal(game.advanceTurn().ok,true);if(++steps>1000)throw Error('進行が上限を超えました');}};
test('第35段階：景気による求人評価補正は±5点以内、標準時は0点',()=>{
 assert.equal(jobMarketAdjustment({employmentIndex:100}),0);
 assert.equal(jobMarketAdjustment({employmentIndex:75}),-5);
 assert.equal(jobMarketAdjustment({employmentIndex:125}),5);
 assert.equal(jobMarketAdjustment(null),0);
});
test('第35段階：失業中の職業相談は3か月間隔・最大3段階',()=>{
 const game=createGameStore();game.startNewGame();ageTo(game,2018);
 const first=game.performAction('employmentSupport');assert.equal(first.ok,true);
 assert.equal(game.getState().finances.career.searchEffort,1);
 assert.equal(game.performAction('employmentSupport').ok,false);
 ageTo(game,2018,4);assert.equal(game.performAction('employmentSupport').ok,true);
 ageTo(game,2018,7);assert.equal(game.performAction('employmentSupport').ok,true);
 ageTo(game,2018,10);assert.equal(game.performAction('employmentSupport').ok,false);
 assert.equal(game.getState().world.employmentSupport.sessions,3);
 assert.ok(validateGameState(game.getState()));
});
test('第35段階：未成年には職業相談を拒否し状態不変',()=>{
 const game=createGameStore();game.startNewGame();const before=game.getState();
 assert.equal(game.performAction('employmentSupport').ok,false);
 assert.deepEqual(game.getState(),before);
});
test('第35段階：求人枠の大幅変動だけをニュース化し履歴を限定',()=>{
 const world=createWorldData();const firms=[{openings:2,status:'通常'},{openings:2,status:'通常'}];
 assert.equal(updateLaborMarket(world,firms,{year:2020,month:1}),null);
 firms[0].openings=1;
 assert.equal(updateLaborMarket(world,firms,{year:2020,month:2}),null);
 firms[1].openings=0;firms[0].openings=0;
 // 3枠の変化は通知なし
 assert.equal(updateLaborMarket(world,firms,{year:2020,month:3}),null);
 firms.push({openings:4,status:'通常'});
 const notice=updateLaborMarket(world,firms,{year:2020,month:4});
 assert.equal(notice.type,'labor-market');assert.match(notice.title,/増加/);
 assert.equal(world.news.length,1);
});
test('第35段階：旧保存形式に社会支援情報がなくても読み込める',()=>{
 const g=createGameStore();g.startNewGame();const old=structuredClone(g.getState());
 delete old.world.employmentSupport;delete old.world.laborMarket;
 assert.equal(validateGameState(old),true);
 assert.equal(g.loadState(old).ok,true);
 assert.equal(g.getState().world.employmentSupport.sessions,0);
 const invalid=structuredClone(g.getState());invalid.world.employmentSupport.sessions=-2;
 assert.equal(validateGameState(invalid),false);
});
