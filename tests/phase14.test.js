import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameStore} from '../js/core/gameState.js';
import {advanceCompanyMarket,createCompanyMarket,ensureCompanyMarket} from '../js/core/companySystems.js';
import {validateGameState} from '../js/core/saveSystems.js';

test('各社の財務データと月次利益を独立して記録',()=>{
 const f={companyMarket:createCompanyMarket()};
 advanceCompanyMarket(f,{year:2020,month:2},'通常');
 assert.equal(f.companyMarket.length,6);
 for(const c of f.companyMarket){assert.equal(c.profit,c.revenue-c.costs);assert.equal(c.financeHistory.length,1);assert.equal(c.financeHistory[0].cash,c.cash);}
 assert.notEqual(f.companyMarket[0].cash,f.companyMarket[1].cash);
});
test('資金不足が続くと経営危機を経て営業停止、募集を中止',()=>{
 const f={companyMarket:createCompanyMarket()};const c=f.companyMarket[0];
 c.cash=0;c.staffCount=300;c.performance=10;
 for(let m=1;m<=6;m++)advanceCompanyMarket(f,{year:2020,month:m},'不況');
 assert.equal(c.status,'営業停止');assert.equal(c.openings,0);assert.equal(c.staffCount,0);assert.equal(c.financeHistory.length,6);
 const old=c.cash;advanceCompanyMarket(f,{year:2020,month:7},'好況');assert.equal(c.cash,old);
});
test('財務状態の同一条件・同一年月で決定性がある',()=>{
 const left={companyMarket:createCompanyMarket()},right={companyMarket:createCompanyMarket()};
 for(let m=1;m<=24;m++){const date={year:2020+Math.floor((m-1)/12),month:(m-1)%12+1};advanceCompanyMarket(left,date,'通常');advanceCompanyMarket(right,date,'通常');}
 assert.deepEqual(left,right);assert.ok(left.companyMarket.every(c=>c.financeHistory.length===24));
});
test('旧保存データの財務欠落は補完し、異常データは拒否',()=>{
 const g=createGameStore();g.startNewGame();const old=structuredClone(g.getState());
 for(const c of old.finances.companyMarket)for(const key of ['cash','revenue','costs','profit','distressMonths','status','financeHistory'])delete c[key];
 assert.equal(validateGameState(old),true);assert.equal(g.loadState(old).ok,true);
 assert.ok(g.getState().finances.companyMarket.every(c=>Number.isSafeInteger(c.cash)));
 const bad=structuredClone(g.getState());bad.finances.companyMarket[0].cash=-1;assert.equal(validateGameState(bad),false);
 bad.finances.companyMarket[0].cash=100;bad.finances.companyMarket[0].financeHistory=[{year:2020,month:14,revenue:0,costs:0,profit:0,cash:0,status:'通常'}];assert.equal(validateGameState(bad),false);
});
test('通常の年月進行で企業財務が更新され、保存検証可能',()=>{
 const g=createGameStore();g.startNewGame();g.advanceTurn();const s=g.getState();
 assert.equal(s.finances.companyMarket[0].financeHistory.length,3);
 assert.equal(validateGameState(s),true);
});
