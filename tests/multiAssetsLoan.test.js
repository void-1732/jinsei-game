import test from 'node:test';
import assert from 'node:assert/strict';
import {createEconomyData,economyAction,advanceEconomy,VEHICLE_OPTIONS,netWorth} from '../js/core/economySystems.js';
import {createLivingData,livingAction,advanceLiving,validateLiving} from '../js/core/livingSystems.js';
import {propertyCount,portfolioTotals,propertyAction,advanceProperties,validatePropertyPortfolio} from '../js/core/propertyPortfolio.js';
import {estateBreakdown} from '../js/core/estateSystems.js';
import {createGameStore} from '../js/core/gameState.js';
import {validateGameState} from '../js/core/saveSystems.js';
import {readFileSync} from 'node:fs';
const date={year:2026,month:6},context={age:26,date};
function assets(cash=150000000){
 const f=createEconomyData();f.living=createLivingData();f.cash=cash;return f;
}
test('車を最大5台購入し任意の一台だけ売却できる',()=>{
 const f=assets(30000000);
 for(let i=0;i<5;i++)assert.equal(economyAction(f,'buyVehicle',{vehicleId:VEHICLE_OPTIONS[i%4].id},context).ok,true);
 assert.equal(f.vehicles.length,4);
 assert.equal(economyAction(f,'buyVehicle',{vehicleId:'compact'},context).ok,false);
 const id=f.vehicles[1].fleetId,prev=f.vehicles[1].value;
 assert.equal(economyAction(f,'sellVehicle',{fleetId:id},context).ok,true);
 assert.equal(f.vehicles.some(v=>v.fleetId===id),false);
 assert.equal(f.vehicle!==null,true);
 assert.equal(f.vehicles.length,3);
 assert.equal(economyAction(f,'sellVehicle',{fleetId:999999},context).ok,false);
 assert.ok(prev>0);
});
test('車ごとの維持費と減価を毎月反映、全車の純資産を反映',()=>{
 const f=assets(30000000);
 for(const vehicleId of ['compact','hybrid'])economyAction(f,'buyVehicle',{vehicleId},context);
 const before=estateBreakdown(f);
 assert.equal(before.vehicle,850000+3500000);
 assert.equal(netWorth(f),before.netAssets);
 const first=f.vehicle.value,second=f.vehicles[0].value;
 advanceEconomy(f,{year:2026,month:6},1,{year:2000,month:1},null,{});
 assert.ok(f.vehicle.value<first&&f.vehicles[0].value<second);
 assert.equal(f.vehicle.months,1);assert.equal(f.vehicles[0].months,1);
 assert.ok(f.ledger.some(e=>e.label==='車の維持費'));
});
test('不動産は自宅を含め最大5件、購入時はゲーム内登記が記録される',()=>{
 const f=assets();
 assert.equal(livingAction(f,{},'moveHome',{region:'香川・高松',housing:'持ち家',homeType:'small'},context).ok,true);
 assert.equal(f.living.primaryRegistration.registryId,'GAME-H-000');
 for(let i=0;i<4;i++){
  const result=propertyAction(f,'buyProperty',{region:'鹿児島・鹿児島',homeType:'small',use:'賃貸運用',loan:false},context);
  assert.equal(result.ok,true);
 }
 assert.equal(propertyCount(f.living),5);
 assert.equal(f.living.properties.length,4);
 assert.equal(new Set(f.living.properties.map(p=>p.registration.registryId)).size,4);
 assert.equal(propertyAction(f,'buyProperty',{region:'香川・高松',homeType:'standard',use:'別荘',loan:false},context).ok,false);
 assert.equal(validateLiving(f.living),true);
 assert.equal(portfolioTotals(f.living).count,5);
});
test('購入した物件の用途変更、賃料・維持費、売却は重複集計しない',()=>{
 const f=assets();
 assert.equal(propertyAction(f,'buyProperty',{region:'鹿児島・鹿児島',homeType:'small',use:'賃貸運用',loan:false},context).ok,true);
 const p=f.living.properties[0],originalValue=p.value;
 assert.equal(propertyAction(f,'setPropertyUse',{id:p.id,use:'別荘'},context).ok,true);
 const cash=f.cash;
 advanceProperties(f,{year:2026,month:7});
 assert.ok(f.cash<cash);
 assert.ok(f.living.properties[0].value<=originalValue);
 const before=netWorth(f);
 assert.equal(propertyAction(f,'sellProperty',{id:p.id},context).ok,true);
 assert.equal(f.living.properties.length,0);
 assert.ok(netWorth(f)<before);
});
test('投資物件ローンは返済額を自由に設定でき、繰上返済と残債売却を検証する',()=>{
 const f=assets(20000000);
 f.career.job='事務職';f.career.monthlySalary=500000;
 const purchased=propertyAction(f,'buyProperty',{region:'香川・高松',homeType:'small',use:'賃貸運用',loan:true},context);
 assert.equal(purchased.ok,true,purchased.reason);
 const p=f.living.properties[0];
 const start=p.loanBalance;
 assert.equal(propertyAction(f,'setPropertyPayment',{id:p.id,amount:40000},context).ok,true);
 assert.equal(p.loanPayment,40000);
 assert.equal(propertyAction(f,'repayPropertyLoan',{id:p.id,amount:12345},context).ok,true);
 assert.equal(p.loanBalance,start-12345);
 assert.equal(propertyAction(f,'setPropertyPayment',{id:p.id,amount:1},context).ok,false);
 const balance=p.loanBalance,first=f.cash;
 advanceProperties(f,{year:2026,month:7});
 assert.ok(p.loanBalance<balance);
 assert.ok(f.cash<first+p.rentIncome);
 assert.equal(validatePropertyPortfolio(f.living),true);
});
test('自宅ローンの月額返済額を任意設定し、既存の繰上返済額を自由に指定できる',()=>{
 const f=assets(20000000);
 f.career.job='事務職';f.career.monthlySalary=500000;
 const bought=livingAction(f,{},'moveHome',{region:'香川・高松',housing:'持ち家',loan:true,homeType:'small'},context);
 assert.equal(bought.ok,true,bought.reason);
 const start=f.living.mortgageBalance;
 assert.equal(livingAction(f,{},'setMortgagePayment',{amount:34567},context).ok,true);
 assert.equal(f.living.mortgagePayment,34567);
 assert.equal(livingAction(f,{},'repayMortgage',{amount:12345},context).ok,true);
 assert.equal(f.living.mortgageBalance,start-12345);
 assert.equal(livingAction(f,{},'setMortgagePayment',{amount:1},context).ok,false);
});
test('旧セーブの単一車・住宅データを移行し新形式の不正な所有情報を拒否する',()=>{
 const g=createGameStore({interactiveChoices:true});assert.equal(g.startNewGame().ok,true);
 const old=structuredClone(g.getState());old.pendingEvents=[];
 old.finances.vehicle={id:'compact',value:700000,months:15};
 delete old.finances.vehicles;delete old.finances.nextVehicleId;
 delete old.finances.living.properties;delete old.finances.living.nextPropertyId;
 assert.equal(validateGameState(old),true);
 assert.equal(g.loadState(old).ok,true);
 assert.deepEqual(g.getState().finances.vehicles,[]);
 assert.equal(g.getState().finances.vehicle.value,700000);
 const invalid=structuredClone(g.getState());
 invalid.finances.vehicles=Array.from({length:5},(_,i)=>({id:'compact',value:10000,months:1,fleetId:i+1}));
 assert.equal(validateGameState(invalid),false);
 const invalidHouse=structuredClone(g.getState());
 invalidHouse.finances.living.properties=[{id:1,registration:{registryId:'INVALID'}}];
 assert.equal(validateGameState(invalidHouse),false);
});
test('住居・車の多重管理は新しい画面ではなく既存カテゴリのボタンから操作できる',()=>{
 const housing=readFileSync(new URL('../js/ui/livingPanel.js',import.meta.url),'utf8');
 const fleet=readFileSync(new URL('../js/ui/economyPanels.js',import.meta.url),'utf8');
 const registry=readFileSync(new URL('../js/ui/propertyPortfolioPanel.js',import.meta.url),'utf8');
 assert.match(housing,/setMortgagePayment/);
 assert.match(housing,/renderPropertyPortfolio/);
 assert.match(fleet,/管理する車/);
 assert.match(registry,/管理する物件を選ぶ/);
 assert.match(registry,/購入地域/);
});
