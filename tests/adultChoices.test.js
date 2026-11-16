import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createEconomyData,economyAction,advanceEconomy,netWorth,PART_TIME_JOBS,INVESTMENT_PRODUCTS,VEHICLE_OPTIONS} from '../js/core/economySystems.js';
import {createLivingData,INSURANCE_PLANS,HOME_OPTIONS,validateLiving,livingAction} from '../js/core/livingSystems.js';
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
  assert.match(text,/topic-tool-buttons/);
  assert.match(text,/choiceButtons/);
  assert.ok(!text.includes('for(const id of topic.screenIds){\n    const target=findScreen(id);\n    const card='));
});

test('物件3種類は価格・維持費が異なり従来の標準物件を維持',()=>{
  assert.equal(HOME_OPTIONS.length,3);
  const finances=createEconomyData();finances.cash=50000000;
  assert.equal(livingAction(finances,{},'moveHome',{region:'香川・高松',housing:'持ち家',homeType:'small'},{age:18,date:{year:2018,month:5}}).ok,true);
  assert.equal(finances.living.propertyValue,Math.round(62000*180*.65));
  assert.equal(finances.living.homeType,'small');
  assert.equal(validateLiving(finances.living),true);
  assert.equal(livingAction(finances,{},'moveHome',{region:'新潟・新潟',housing:'持ち家',homeType:'invalid'},{age:18,date:{year:2018,month:6}}).ok,false);
});

test('表示先を1か所に限定し、実操作は初期表示・折りたたみ可能',()=>{
 const topics=readFileSync(new URL('../js/ui/topicGroups.js',import.meta.url),'utf8');
 const compact=readFileSync(new URL('../js/ui/topicPage.js',import.meta.url),'utf8');
 const details=readFileSync(new URL('../js/ui/screenRenderer.js',import.meta.url),'utf8');
 const finance=readFileSync(new URL('../js/ui/economyPanels.js',import.meta.url),'utf8');
 const living=readFileSync(new URL('../js/ui/livingPanel.js',import.meta.url),'utf8');
 assert.match(topics,/\['住まい・車',\['LIFE-02'\]\]/);
 assert.match(topics,/\['保険・年金',\['LIFE-07'\]\]/);
 assert.match(compact,/expandedByTopic/);
 assert.match(compact,/overview\.hidden=details\.open/);
 assert.match(compact,/embedded:true/);
 assert.match(details,/detail\.open=Boolean\(handlers\.embedded\)/);
 assert.match(details,/if\(!handlers\.embedded\)container\.prepend\(quick\)/);
 assert.match(finance,/if\(screen\.id==='LIFE-05'\)/);
 assert.match(finance,/if\(screen\.id==='LIFE-06'\)/);
 assert.match(living,/if\(screen\.id==='LIFE-07'\)/);
 assert.ok(!living.includes("['LIFE-02','SOCIETY-06'].includes(screen.id)"));
});

test('詳細の切替と学業操作はボタン式で、実行操作は確認ボタンからだけ発火する',()=>{
 const page=readFileSync(new URL('../js/ui/topicPage.js',import.meta.url),'utf8');
 const life=readFileSync(new URL('../js/ui/lifePanels.js',import.meta.url),'utf8');
 const control=readFileSync(new URL('../js/ui/choiceButtons.js',import.meta.url),'utf8');
 assert.match(page,/topic-tool-buttons/);
 assert.match(page,/choiceButtons\('操作する項目'/);
 assert.match(page,/choices\.getValue\(\)/);
 assert.match(life,/choiceButtons\('勉強する科目'/);
 assert.match(life,/choiceButtons\('学習時間'/);
 assert.match(life,/choiceButtons\('志望校を選ぶ'/);
 assert.ok(!life.includes("lifeEl('select','phase4-select')"));
 assert.match(control,/aria-pressed/);
 assert.match(control,/onChange\(value\)/);
 assert.match(control,/button\.type='button'/);
});
