import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGameStore} from '../js/core/gameState.js';
import {createWorldData,updateWorld} from '../js/core/worldSystems.js';
import {createEconomyData,advanceEconomy} from '../js/core/economySystems.js';
import {createCompanyMarket,advanceCompanyMarket} from '../js/core/companySystems.js';
import {careerAction,JOB_POSTINGS} from '../js/core/careerSystems.js';
import {createOpportunityProgress,opportunityAction} from '../js/core/opportunitySystems.js';
import {createEraProgress,ensureEraProgress,advanceEra,validateEraProgress,eraEconomicEffects,eraHiringAdjustment,eraScholarshipAdjustment,createEraChoiceEvent,recordEraChoice} from '../js/core/eraSystems.js';
import {createStoryEvent} from '../js/core/storyEvents.js';
import {estimateMonthlyBudget,hasImportantTurnEvent} from '../js/core/balanceSystems.js';
import {serializePortableSave,parsePortableSave} from '../js/core/portableSaves.js';
import {validateGameState} from '../js/core/saveSystems.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
function start(seed=3254){
 const store=createGameStore({interactiveChoices:true});
 assert.ok(store.startNewGame({name:'時代を生きる',seed,birth:{year:2000,month:1,day:1}}).ok);
 return store;
}
function answer(store,i=0){
 const event=store.getState().pendingEvents.find(x=>x.type==='choice');
 assert.ok(event,'未解決の選択イベントが必要');
 const option=event.options[i];
 const result=store.performAction('resolveChoice',{eventId:event.id,choice:option.id});
 assert.ok(result.ok,result.reason);return event;
}
function ageState(age=25){
 const store=start(),state=structuredClone(store.getState());
 state.timeline={year:2000+age,month:1,ageYears:age,monthsElapsed:age*12,turnsElapsed:age*4};
 state.pendingEvents=[];state.education.stage='卒業';state.education.graduated=true;
 state.finances.cash=500000;
 return state;
}

test('新旧セーブ: STEP 52の社会データは省略可能で、読み込み時に補完する',()=>{
 const g=start();const first=g.getState();
 assert.ok(first.world.era52);assert.equal(validateEraProgress(first.world.era52),true);
 const old=structuredClone(first);delete old.world.era52;
 assert.equal(validateGameState(old),true);
 assert.ok(g.loadState(old).ok);assert.equal(validateEraProgress(g.getState().world.era52),true);
 const save=serializePortableSave(g.getState());const load=parsePortableSave(save.text);
 assert.equal(load.ok,true);assert.equal(load.state.world.era52.techIndex,16);
 const bad=structuredClone(g.getState());bad.world.era52.choices.learning=10000;
 assert.equal(validateGameState(bad),false);assert.equal(g.loadState(bad).ok,false);
 const tampered=structuredClone(first);tampered.world.era52.headlines=[{year:2025,month:3,title:'悪意',description:'x'.repeat(1000)}];
 assert.equal(validateGameState(tampered),false);
});

test('社会の時代指数は同じ入力で再現でき、技術とニュースは制限内',()=>{
 const a=createWorldData(),b=createWorldData();ensureEraProgress(a);ensureEraProgress(b);
 let notable=0;
 for(let month=0;month<12*95;month++){
  const date={year:2000+Math.floor(month/12),month:month%12+1};
  const draw=((month*7919)%101)/101;
  updateWorld(a,date,draw);updateWorld(b,date,draw);
  const news=advanceEra(a,date,draw);advanceEra(b,date,draw);
  notable+=news.length;
  assert.equal(a.era52.techIndex,b.era52.techIndex);
  assert.equal(a.era52.socialIndex,b.era52.socialIndex);
  assert.ok(validateEraProgress(a.era52));
 }
 assert.ok(a.era52.techIndex>65);assert.ok(notable>3);
 assert.ok(a.era52.headlines.length<=36);assert.ok(a.news.length<=48);
 const before=structuredClone(a.era52);
 assert.deepEqual(advanceEra(a,{year:2094,month:12},.7),[]);
 assert.deepEqual(a.era52,before);
});

test('価格・雇用の変化は一時的な倍率で反映し、基本給と予算を改変しない',()=>{
 const oldWorld=createWorldData();const world=createWorldData();ensureEraProgress(world);
 world.priceIndex=143;world.employmentIndex=119;world.phase='好況';world.era52.techIndex=60;
 const old=createEconomyData(),modern=createEconomyData();
 for(const e of [old,modern]){
  e.career.job='事務職';e.career.monthlySalary=235000;e.monthlyBudget=85000;
 }
 const base={year:2030,month:2};const birth={year:2000,month:1,day:1};
 advanceEconomy(old,base,1,birth,oldWorld);
 advanceEconomy(modern,base,1,birth,world);
 const expense=e=>e.ledger.find(x=>x.label==='生活費')?.amount;
 const wage=e=>e.ledger.find(x=>x.label==='給与')?.amount;
 assert.ok(-expense(modern)>-expense(old));assert.ok(wage(modern)>wage(old));
 assert.equal(modern.career.monthlySalary,235000);assert.equal(modern.monthlyBudget,85000);
 const impact=eraEconomicEffects(world);
 assert.equal(-expense(modern),Math.round(85000*impact.living));
 assert.equal(wage(modern),Math.round(235000*impact.wage));
 assert.ok(impact.living>1&&impact.wage>1);
});

test('学習・節約を選ぶほど将来の費用や採用へ有界な影響が残る',()=>{
 const world=createWorldData(),e=ensureEraProgress(world);
 world.priceIndex=139;world.employmentIndex=90;e.techIndex=70;
 const base=eraEconomicEffects(world),baseHire=eraHiringAdjustment(world,'tech');
 for(let i=0;i<12;i++)recordEraChoice({world,timeline:{year:2025,month:1}}, {eraStory:true,title:'時代への対応'}, {eraFocus:i%2?'learning':'frugality'});
 assert.equal(e.choices.learning,6);assert.equal(e.choices.frugality,6);
 assert.equal(e.decisions.length,12);
 assert.ok(eraEconomicEffects(world).living<base.living);
 assert.ok(eraEconomicEffects(world).wage>base.wage);
 assert.ok(eraHiringAdjustment(world,'tech')>baseHire);
 assert.ok(eraHiringAdjustment(world,'shop')<=6);
 for(let i=0;i<40;i++)recordEraChoice({world,timeline:{year:2026,month:1}}, {eraStory:true,title:'再挑戦'}, {eraFocus:'learning'});
 assert.equal(e.choices.learning,8);assert.equal(e.decisions.length,20);
 assert.equal(validateEraProgress(e),true);
});

test('産業ごとの採用環境は個別に変化し、旧ワールドは変更しない',()=>{
 const w=createWorldData();assert.equal(eraHiringAdjustment(w,'tech'),0);
 const e=ensureEraProgress(w);e.techIndex=90;e.socialIndex=35;
 assert.ok(eraHiringAdjustment(w,'tech')>eraHiringAdjustment(w,'shop'));
 assert.ok(eraHiringAdjustment(w,'care')>=0);
 assert.ok(eraScholarshipAdjustment(w)>=2);
 assert.ok(eraHiringAdjustment(w,'tech')<=6);
});

test('社会に合わせた専用イベントには3択があり、過去の分岐・イベントと衝突しない',()=>{
 const state=ageState(26),world=state.world;
 world.phase='不況';world.priceIndex=120;
 world.era52.techIndex=62;world.era52.techStage=2;
 const e=createEraChoiceEvent(state,{year:2026,month:5},108,26);
 assert.ok(e);assert.equal(e.eraStory,true);assert.equal(e.options.length,3);
 assert.ok(e.options.every(o=>['learning','community','frugality'].includes(o.eraFocus)));
 assert.equal(e.id,'T108-choice');assert.equal(hasImportantTurnEvent([e]),true);
 assert.equal(createEraChoiceEvent(state,{year:2026,month:6},109,26),null);
 // Earlier branches/consequences have precedence over the optional era scenes.
 const unrelated=createStoryEvent({year:2026,month:6},109,26,.5,state.storyProgress,state);
 assert.ok(unrelated);assert.ok(Array.isArray(unrelated.options));
});

test('進路支援は技術の広がりや学習した選択を採用判定へ反映する',()=>{
 const s=ageState(22);s.education.stage='大学';
 for(const key of Object.keys(s.education.scores))s.education.scores[key]=65;
 const old=structuredClone(s);delete old.world.era52;
 assert.equal(opportunityAction(old,'applyScholarship').passed,false);
 s.world.era52.techIndex=65;s.world.era52.socialIndex=65;s.world.era52.choices.learning=3;
 assert.equal(opportunityAction(s,'applyScholarship').passed,true);
 assert.equal(validateGameState(s),true);
 const world=s.world;
 const scoreDiff=eraHiringAdjustment(world,JOB_POSTINGS.find(x=>x.id==='tech').id);
 assert.ok(scoreDiff>=1);
});

test('企業の採用・売上・費用は技術と物価に反応し、好況補正を二重計上しない',()=>{
 const base=createCompanyMarket(),altered=structuredClone(base),world=createWorldData();
 world.phase='好況';world.priceIndex=143;ensureEraProgress(world).techIndex=80;
 advanceCompanyMarket({companyMarket:base},{year:2030,month:3},'好況');
 advanceCompanyMarket({companyMarket:altered},{year:2030,month:3},world);
 assert.ok(altered.find(c=>c.id==='tech').revenue>base.find(c=>c.id==='tech').revenue);
 assert.ok(altered.find(c=>c.id==='shop').costs>base.find(c=>c.id==='shop').costs);
 assert.equal(altered.length,base.length);
 assert.ok(altered.every(c=>c.cash>=0));
});

test('長期プレイで時代選択を経てもセーブが壊れず、時間短縮は重要場面で停止する',()=>{
 const game=start(456);answer(game);
 let found=false,stops=0;
 for(let i=0;i<380&&!found;i++){
  const snap=game.getState();
  const pending=snap.pendingEvents.find(e=>e.type==='choice');
  if(pending){if(pending.eraStory){found=true;break;}answer(game);continue;}
  const r=game.fastForward({focus:'balanced',maxMonths:12});
  if(!r.ok){const a=game.advanceTurn();assert.ok(a.ok,a.reason);}
  else{stops++;}
  if(i%20===0)assert.ok(validateGameState(game.getState()));
 }
 assert.ok(found,'時代イベントに遭遇する');
 const state=game.getState();assert.equal(state.pendingEvents.filter(e=>e.type==='choice').length,1);
 const event=state.pendingEvents.find(e=>e.type==='choice');assert.equal(event.eraStory,true);
 answer(game,1);
 assert.ok(game.getState().world.era52.decisions.length>=1);
 const backup=serializePortableSave(game.getState());const parsed=parsePortableSave(backup.text);
 assert.equal(parsed.ok,true);
 const next=start(789);assert.ok(next.loadState(parsed.state).ok);
 assert.deepEqual(next.getState().world.era52,game.getState().world.era52);
 assert.ok(stops>0);
});

test('家計予測の金額と実際の月次精算が同じ倍率を用いる',()=>{
 const s=ageState(30);s.finances.career.job='販売スタッフ';s.finances.career.monthlySalary=195000;
 s.world.priceIndex=126;s.world.employmentIndex=105;
 const estimate=estimateMonthlyBudget(s);
 const expected=eraEconomicEffects(s.world);
 assert.equal(estimate.monthlyBudget,Math.round(s.finances.monthlyBudget*expected.living));
 assert.equal(estimate.gross,Math.round(195000*expected.wage));
 assert.equal(estimate.balance,estimate.gross-estimate.tax-estimate.monthlyBudget);
});

test('社会UIは操作を増やし過ぎず、社会指数と生活・給与の影響を案内する',()=>{
 assert.match(read('index.html'),/css\/phase52\.css/);
 assert.match(read('js/ui/worldPanels.js'),/社会の変化と生活への影響/);
 assert.match(read('js/ui/playDashboard.js'),/時代の変化と暮らし/);
 assert.match(read('js/core/gameState.js'),/advanceEra/);
 assert.match(read('js/core/saveSystems.js'),/validateEraProgress/);
 assert.match(read('package.json'),/"version": "5\.6\.0"/);
 assert.match(read('.github/workflows/pages.yml'),/npm test/);
 assert.match(read('README.md'),/STEP 52/);
});
