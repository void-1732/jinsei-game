import test from 'node:test';
import assert from 'node:assert/strict';
import {estateBreakdown,calculateInheritance,validateInheritance} from '../js/core/estateSystems.js';
import {netWorth} from '../js/core/economySystems.js';
import {createGameStore} from '../js/core/gameState.js';
import {createSaveRepository,validateGameState} from '../js/core/saveSystems.js';
const example=()=>({cash:300000,investment:150000,debt:50000,living:{housing:'持ち家',propertyValue:2000000,mortgageBalance:1200000,pensionMonths:240,pensionCreditHalfUnits:480},business:{active:true,operatingCash:220000,equipmentValue:80000,operatingDebt:40000,loanBalance:90000}});
test('第36段階：現金・住宅・事業を一度だけ集計し、年金受給見込みは含めない',()=>{
 const f=example(),b=estateBreakdown(f);
 assert.equal(b.grossAssets,2750000);assert.equal(b.liabilities,1380000);assert.equal(b.netAssets,1370000);
 assert.equal(netWorth(f),b.netAssets);assert.equal(b.estimatedMonthlyPension,60000);
});
test('第36段階：廃業済みの事業口座を相続財産に二重計上しない',()=>{
 const f=example();f.business.active=false;
 const b=estateBreakdown(f);
 assert.equal(b.businessCash,0);assert.equal(b.businessEquipment,0);assert.equal(b.businessDebt,0);assert.equal(b.businessLoans,0);
 assert.equal(b.netAssets,1200000);
});
test('第36段階：配偶者・子の相続、税額、端数配分の一致',()=>{
 const i=calculateInheritance(example(),[{id:'a',name:'配偶者',role:'配偶者'},{id:'b',name:'子',role:'子'},{id:'c',name:'父',role:'父'}]);
 assert.equal(i.netAssets,1370000);assert.equal(i.simplifiedTax,137000);assert.equal(i.distributed,1233000);
 assert.deepEqual(i.heirs.map(x=>x.name),['配偶者','子']);assert.equal(i.heirs.reduce((s,x)=>s+x.amount,0),i.distributed);
 assert.equal(validateInheritance(i),true);
});
test('第36段階：債務超過では負の純資産を残し分配額は0円',()=>{
 const f=example();f.debt=3000000;const b=estateBreakdown(f);
 assert.ok(b.netAssets<0);const i=calculateInheritance(f,[]);
 assert.equal(i.netAssets,0);assert.equal(i.distributed,0);assert.equal(validateInheritance(i),true);
});
test('第36段階：相続財産明細の改ざんを保存検証で拒否、旧形式は読込可',()=>{
 const g=createGameStore();g.startNewGame({seed:1});let turns=0;
 while(!g.getState().ending.dead && turns++<1300)g.advanceTurn();
 const state=structuredClone(g.getState());assert.equal(state.ending.dead,true);
 assert.equal(validateGameState(state),true);assert.equal(validateInheritance(state.ending.inheritance),true);
 const map=new Map(),store={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const repo=createSaveRepository(store);assert.equal(repo.save('人生記録',state).ok,true);
 assert.equal(repo.load('人生記録').ok,true);
 const old=structuredClone(state);delete old.ending.inheritance.breakdown;
 assert.equal(validateGameState(old),true);
 const bad=structuredClone(state);bad.ending.inheritance.breakdown.grossAssets+=100;
 assert.equal(validateGameState(bad),false);
});
