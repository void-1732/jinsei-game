/** STEP 56: calibration tests. No new gameplay system and no new save fields. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGameStore} from '../js/core/gameState.js';
import {createEconomyData,advanceEconomy,scheduledRaise,livingExpenseWithHardship,lateCareerWageFactor} from '../js/core/economySystems.js';
import {createHealthData,advanceHealth} from '../js/core/healthSystems.js';
import {createLifeData,advanceEducation} from '../js/core/lifeSystems.js';
import {createDailySchedule,advanceDailySchedule} from '../js/core/dailySchedule.js';
import {createBalanceProgress,balancedGrowth,estimateMonthlyBudget} from '../js/core/balanceSystems.js';
import {mortalityRisk} from '../js/core/gameState.js';
import {validateGameState} from '../js/core/saveSystems.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

const economy=()=>createEconomyData();
test('自動昇給は前半・中盤・後半で緩やかになり、給与上限を守る',()=>{
 assert.equal(scheduledRaise({experience:12,monthlySalary:195000}),0);
 assert.equal(scheduledRaise({experience:36,monthlySalary:195000}),10000);
 assert.equal(scheduledRaise({experience:180,monthlySalary:280000}),7000);
 assert.equal(scheduledRaise({experience:396,monthlySalary:300000}),4000);
 assert.equal(scheduledRaise({experience:396,monthlySalary:419000}),1000);
 assert.equal(scheduledRaise({experience:396,monthlySalary:420000}),0);
});
test('65歳以降の給与補正は段階的で、現役世代は変化しない',()=>{
 assert.equal(lateCareerWageFactor(64),1);
 assert.equal(lateCareerWageFactor(65),.85);
 assert.equal(lateCareerWageFactor(75),.70);
 assert.equal(lateCareerWageFactor(100),.70);
});
test('長期の無職状態では生活費を段階的に抑えるが、費用は消滅しない',()=>{
 const e=economy();
 assert.equal(livingExpenseWithHardship(e,20,1,0),85000);
 e.career.unemploymentMonths=13;
 assert.equal(livingExpenseWithHardship(e,20,1,0),79050);
 e.career.unemploymentMonths=36;
 assert.equal(livingExpenseWithHardship(e,20,1,0),73100);
 e.career.unemploymentMonths=72;
 assert.equal(livingExpenseWithHardship(e,20,1,0),66300);
 e.monthlyBudget=60000;
 assert.equal(livingExpenseWithHardship(e,20,1,800),59200);
 e.career.job='販売スタッフ';
 assert.equal(livingExpenseWithHardship(e,20,1,0),60000);
});
test('収支見積もりと月次生活費の軽減計算が一致する',()=>{
 const e=economy();e.career.unemploymentMonths=75;
 const s={initialized:true,finances:e,education:{stage:'卒業'},timeline:{ageYears:35},world:null,daily54:createDailySchedule()};
 const estimated=estimateMonthlyBudget(s);
 assert.equal(estimated.monthlyBudget,livingExpenseWithHardship(e,35,1,0));
 assert.equal(estimated.balance,-estimated.monthlyBudget);
});
test('低賃金・長期失業の改善前後モデルは順序と上限を守る',()=>{
 const base=economy();base.career.unemploymentMonths=72;
 const oldLifetime=85000*12*40;
 const adjusted=12*40*livingExpenseWithHardship(base,45,1,0);
 assert.ok(adjusted<oldLifetime*.85);
 assert.ok(adjusted>oldLifetime*.6);
 const employed=economy();employed.career.job='販売スタッフ';employed.career.monthlySalary=195000;
 advanceEconomy(employed,{year:2018,month:1},480,{year:2000,month:1});
 assert.ok(employed.career.monthlySalary<345000,'40年勤続の給与が旧モデルより抑制される');
 assert.ok(employed.career.monthlySalary>=195000);
});
test('試験準備の積み重ねが進学校の境界条件に反映される',()=>{
 const prepared=createLifeData('候補').education;
 Object.keys(prepared.scores).forEach(k=>prepared.scores[k]=72);
 prepared.examPreparation=2;prepared.stage='中学校';
 prepared.schoolPreference.高校='進学校';
 advanceEducation(prepared,{year:2014,month:12},{year:2015,month:4},1);
 assert.equal(prepared.entrance.status,'合格');
 const unprepared=createLifeData('候補').education;
 Object.keys(unprepared.scores).forEach(k=>unprepared.scores[k]=72);
 unprepared.schoolPreference.高校='進学校';unprepared.stage='中学校';
 advanceEducation(unprepared,{year:2014,month:12},{year:2015,month:4},1);
 assert.notEqual(unprepared.entrance.status,'合格');
});
test('生活時間を仕事重視にしても疲労・ストレスが100に固定されず、休養で回復する',()=>{
 const state={daily54:{...createDailySchedule(),planId:'career'},balance48:createBalanceProgress(),
  health:{physical:70,mental:70,energy:70},finances:{debt:0,career:{job:'事務職',performance:45}},
  education:{stage:'卒業',scores:{国語:60},skills:{}},people:[{id:'parent',name:'母',role:'母',relationship:60}]};
 for(let i=0;i<120;i++)advanceDailySchedule(state,{year:2025+Math.floor(i/12),month:i%12+1},25);
 assert.ok(state.daily54.fatigue>=30&&state.daily54.fatigue<80);
 assert.ok(state.daily54.stress>=30&&state.daily54.stress<80);
 const before=state.daily54.fatigue;
 state.daily54.planId='rest';
 for(let i=0;i<12;i++)advanceDailySchedule(state,{year:2035,month:i+1},35);
 assert.ok(state.daily54.fatigue<before);
 assert.ok(state.daily54.stress<30);
});
test('健康警告は初回と定期的な再通知に抑え、危険状態を隠さない',()=>{
 const h=createHealthData();h.physical=16;h.mental=18;
 let warning=0;
 for(let m=1;m<=12;m++)warning+=advanceHealth(h,{year:2050,month:m},50,.99,{balanced:true}).filter(x=>x.type==='health-warning').length;
 assert.ok(warning>=2&&warning<=5,`警告 ${warning} 回`);
});
test('健康と寿命の相関はあるが健康な人にも加齢リスクがある',()=>{
 const fit={physical:85,mental:85};const frail={physical:20,mental:15};
 assert.equal(mortalityRisk(35,fit),0);
 assert.ok(mortalityRisk(80,fit)>0);
 assert.ok(mortalityRisk(80,frail)>mortalityRisk(80,fit));
 assert.equal(mortalityRisk(110,fit),1);
});
test('高技能の成長鈍化は引き続き95点で停止する',()=>{
 const s={balance48:createBalanceProgress()};let v=90;
 for(let i=0;i<100;i++)v=balancedGrowth(s,'test:skill',v,1);
 assert.ok(v<=95&&v>90);
});
test('旧保存の項目を読み込んでも保存スキーマと一回行動が維持される',()=>{
 const a=createGameStore({interactiveChoices:true});assert.equal(a.startNewGame({name:'旧データ',seed:56}).ok,true);
 const legacy=structuredClone(a.getState());delete legacy.daily54;delete legacy.surprise53;delete legacy.legacy51;
 assert.equal(validateGameState(legacy),true);
 const b=createGameStore({interactiveChoices:true});assert.equal(b.loadState(legacy).ok,true);
 assert.equal(validateGameState(b.getState()),true);
 const event=b.getState().pendingEvents.find(x=>x.type==='choice');assert.ok(event);
 assert.equal(b.performAction('resolveChoice',{eventId:event.id,choice:event.options[0].id}).ok,true);
 assert.equal(b.advanceTurn().ok,true);
});
test('STEP 56は追加パネルを増やさず既存のゲーム構成と公開検証を維持',()=>{
 assert.match(read('package.json'),/"version": "6\.0\.0"/);
 const w=read('.github/workflows/pages.yml');
 assert.match(w,/npm test/);assert.match(w,/scripts\/qa-browser\.mjs/);
 assert.match(read('CHANGELOG.md'),/STEP 56/);
 assert.match(read('index.html'),/第58段階/);
});