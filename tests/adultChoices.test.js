import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createEconomyData,economyAction,advanceEconomy,netWorth,PART_TIME_JOBS,INVESTMENT_PRODUCTS,VEHICLE_OPTIONS} from '../js/core/economySystems.js';
import {createLivingData,INSURANCE_PLANS,validateLiving} from '../js/core/livingSystems.js';
import {createLifeData,chooseSchool} from '../js/core/lifeSystems.js';
import {createGameStore} from '../js/core/gameState.js';
import {validateGameState} from '../js/core/saveSystems.js';
import {serializePortableSave,parsePortableSave} from '../js/core/portableSaves.js';
const ctx={age:18,date:{year:2018,month:5},education:{stage:'高校'}};
const action=(f,name,payload)=>economyAction(f,name,payload,ctx);

test('18歳から6種類のアルバイトを選べる・勤務時間と給与が整合する',()=>{
  assert.equal(PART_TIME_JOBS.length,6);
  const f=createEconomyData();
  assert.equal(economyAction(f,'sideJob',{active:true,jobId:'cafe'},{...ctx,age:17}).ok,false);
  const chosen=PART_TIME_JOBS.find(x=>x.id==='cafe');
  assert.equal(action(f,'sideJob',{active:true,jobId:'cafe'}).ok,true);
  assert.equal(f.sideJob.monthlyIncome,chosen.hours*chosen.hourlyWage);
  assert.equal(f.sideJob.hours,chosen.hours);
  assert.equal(action(f,'sideJob',{active:false}).ok,true);
  assert.equal(f.sideJob.active,false);
  assert.equal(action(f,'sideJob',{active:true,jobId:'invalid'}).ok,false);
});
test('投資商品5種類の売買と旧投資残高は会計上二重計上しない',()=>{
  assert.equal(INVESTMENT_PRODUCTS.length,5);
  const f=createEconomyData();f.cash=200000;
  assert.equal(action(f,'buyInvestment',{amount:20000}).ok,true);
  assert.equal(f.investmentHoldings.length,0,'旧操作の投資残高は従来型を維持');
  assert.equal(action(f,'buyInvestment',{amount:30000,productId:'bond'}).ok,true);
  assert.equal(f.investment,50000);
  assert.equal(netWorth(f),200000);
  assert.equal(action(f,'sellInvestment',{amount:35000,productId:'bond'}).ok,false);
  assert.equal(action(f,'sellInvestment',{amount:10000,productId:'bond'}).ok,true);
  assert.equal(f.investment,40000);
  advanceEconomy(f,{year:2018,month:5},1,{year:2000,month:1});
  assert.equal(f.investmentHoldings.length,1);
  assert.equal(f.investment,20000+Math.floor(20000*.002)+f.investmentHoldings[0].value);
});
test('車4種類の購入・売却、減価、維持費と資産評価',()=>{
  assert.equal(VEHICLE_OPTIONS.length,4);
  const f=createEconomyData();f.cash=3000000;
  assert.equal(action(f,'buyVehicle',{vehicleId:'compact'}).ok,true);
  assert.equal(netWorth(f),3000000);
  assert.equal(action(f,'buyVehicle',{vehicleId:'family'}).ok,false);
  const original=f.vehicle.value;
  advanceEconomy(f,{year:2018,month:5},1,{year:2000,month:1});
  assert.ok(f.vehicle.value<original);
  assert.ok(f.ledger.some(x=>x.label==='車の維持費'));
  assert.equal(action(f,'sellVehicle',{}).ok,true);
  assert.equal(f.vehicle,null);
});
test('進学・保険の選択肢が増えても従来選択は利用可能',()=>{
  const education=createLifeData().education;
  education.stage='高校';
  assert.equal(chooseSchool(education,'大学','専門学校').ok,true);
  assert.equal(chooseSchool(education,'大学','国公立大学').ok,true);
  assert.equal(chooseSchool(education,'大学','地域大学').ok,true);
  assert.equal(validateLiving(createLivingData()),true);
  for(const name of ['基本保障','充実保障','医療重点','がん・重病重点','生活防衛'])
    assert.ok(INSURANCE_PLANS[name].premium>0);
});
test('旧保存の拡張欄欠落を補完、拡張後はJSONで往復可能',()=>{
  const g=createGameStore();
  assert.equal(g.startNewGame().ok,true);
  const older=structuredClone(g.getState());
  delete older.finances.investmentHoldings;delete older.finances.vehicle;
  assert.equal(validateGameState(older),true);
  assert.equal(g.loadState(older).ok,true);
  const newer=g.getState();
  assert.deepEqual(newer.finances.investmentHoldings,[]);
  assert.equal(newer.finances.vehicle,null);
  const saved=serializePortableSave(newer);
  assert.equal(saved.ok,true,saved.reason);
  const reloaded=parsePortableSave(saved.text);
  assert.equal(reloaded.ok,true,reloaded.reason);
  assert.equal(validateGameState(reloaded.state),true);
});
test('統合画面は情報サマリー1つ、詳細描画1つに限定される',()=>{
  const text=readFileSync(new URL('../js/ui/topicPage.js',import.meta.url),'utf8');
  assert.match(text,/compactValues/);
  assert.match(text,/topic-tool-select/);
  assert.ok(!text.includes('for(const id of topic.screenIds){\n    const target=findScreen(id);\n    const card='));
});
