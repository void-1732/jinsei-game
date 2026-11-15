import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameStore} from '../js/core/gameState.js';
import {createCompanyMarket,advanceCompanyMarket} from '../js/core/companySystems.js';
import {validateGameState} from '../js/core/saveSystems.js';

test('各社の初期業績と募集枠は独立している',()=>{
 const list=createCompanyMarket();assert.equal(list.length,6);
 assert.equal(new Set(list.map(c=>c.id)).size,6);
 list[0].performance=12;assert.notEqual(list[1].performance,12);
});
test('同じ年月と景気では企業業績が再現される',()=>{
 const left={companyMarket:createCompanyMarket()},right={companyMarket:createCompanyMarket()};
 for(let m=1;m<=24;m++){
  const date={year:2020+Math.floor((m-1)/12),month:(m-1)%12+1};
  advanceCompanyMarket(left,date,'不況');advanceCompanyMarket(right,date,'不況');
 }
 assert.deepEqual(left,right);assert.ok(left.companyMarket.every(c=>c.history.length===24));
});
test('深刻な業績悪化で求人が停止し、応募できない',()=>{
 const game=createGameStore();game.startNewGame();
 const snapshot=JSON.parse(JSON.stringify(game.getState()));
 snapshot.timeline={year:2018,month:1,ageYears:18,turnsElapsed:72,monthsElapsed:216};
 snapshot.finances.companyMarket[0].openings=0;
 assert.ok(validateGameState(snapshot));assert.ok(game.loadState(snapshot).ok);
 const result=game.performAction('applyJob',{postingId:'shop'});
 assert.equal(result.ok,false);assert.match(result.reason,/募集枠/);
});
test('旧形式保存データでは企業情報を補完する',()=>{
 const game=createGameStore();game.startNewGame();
 const old=JSON.parse(JSON.stringify(game.getState()));delete old.finances.companyMarket;
 assert.equal(validateGameState(old),true);
 assert.equal(game.loadState(old).ok,true);
 assert.equal(game.getState().finances.companyMarket.length,6);
});
test('月次進行で企業履歴が増加し、上司・同僚のプロフィールを維持する',()=>{
 const g=createGameStore();g.startNewGame();g.advanceTurn();
 const f=g.getState().finances;
 assert.equal(f.companyMarket[0].history.length,3);
 assert.ok(f.companyMarket[0].performance>=10);
 assert.ok(validateGameState(g.getState()));
});
test('企業業績の異常な保存値は拒否する',()=>{
 const g=createGameStore();g.startNewGame();
 const broken=JSON.parse(JSON.stringify(g.getState()));
 broken.finances.companyMarket[2].openings=999;
 assert.equal(validateGameState(broken),false);
 broken.finances.companyMarket[2].openings=2;
 broken.finances.companyMarket[1].history=[{year:2020,month:13,performance:50}];
 assert.equal(validateGameState(broken),false);
});
