import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGameStore} from '../js/core/gameState.js';
import {createEconomyData} from '../js/core/economySystems.js';
import {ensureCompanyMarket} from '../js/core/companySystems.js';
import {createWorldData} from '../js/core/worldSystems.js';
import {eraEconomicEffects} from '../js/core/eraSystems.js';
import {careerAction} from '../js/core/careerSystems.js';
import {validateGameState} from '../js/core/saveSystems.js';
import {
 createOpportunityProgress,ensureOpportunityProgress,validateOpportunityProgress,
 advanceOpportunityMonth,opportunityAction,opportunityOptions,
 reflectOpportunityStoryChoice,interviewBonus,afterJobApplication,selectOpportunityEvent,
 TUITION_PER_MONTH,SCHOLARSHIP_PER_MONTH,
} from '../js/core/opportunitySystems.js';

const clone=x=>structuredClone(x);
function game(){const g=createGameStore({interactiveChoices:true});assert.equal(g.startNewGame({name:'STEP47',seed:345,birth:{year:2000,month:1,day:1}}).ok,true);return g;}
function stateOf(age=18,stage='大学'){
 const g=game(),s=clone(g.getState());
 s.timeline.year=2000+age;s.timeline.month=5;s.timeline.ageYears=age;
 s.timeline.monthsElapsed=age*12+4;s.timeline.turnsElapsed=age*4;
 s.education.stage=stage;s.education.universityChoice='進学';s.education.graduated=stage==='卒業';
 s.finances.cash=140000;s.pendingEvents=[];
 return s;
}
const cashTotal=f=>({cash:f.cash,debt:f.debt,income:f.totals.income,expenses:f.totals.expenses});

test('STEP47の追加データは厳格に検証し、旧STEP46セーブを破損させない',()=>{
 const p=createOpportunityProgress();assert.equal(validateOpportunityProgress(p),true);
 const s=stateOf();assert.equal(validateGameState(s),true);
 const legacy=clone(s);delete legacy.opportunity47;
 assert.equal(validateGameState(legacy),true);
 const store=createGameStore({interactiveChoices:true});const loaded=store.loadState(legacy);
 assert.equal(loaded.ok,true);assert.equal(validateGameState(store.getState()),true);
 assert.deepEqual(store.getState().opportunity47,createOpportunityProgress());
 const bad=clone(s);bad.opportunity47.education.loanBalance=-1;assert.equal(validateGameState(bad),false);
 bad.opportunity47.education.loanBalance=1;bad.opportunity47.career.interviewPrep=100;assert.equal(validateGameState(bad),false);
});

test('学費は現金から正しく払われ、不足額だけが負債として残る',()=>{
 const s=stateOf();s.finances.cash=100000;
 advanceOpportunityMonth(s,{year:2018,month:5});
 assert.equal(TUITION_PER_MONTH,36000);
 assert.equal(s.finances.cash,64000);assert.equal(s.finances.debt,0);
 assert.equal(s.finances.totals.expenses,36000);
 assert.equal(s.opportunity47.education.tuitionPaid,36000);
 s.finances.cash=10000;
 advanceOpportunityMonth(s,{year:2018,month:6});
 assert.equal(s.finances.cash,0);assert.equal(s.finances.debt,26000);
 assert.equal(s.opportunity47.education.unpaidTuition,26000);
 assert.equal(s.opportunity47.education.tuitionPaid,46000);
 assert.equal(s.finances.totals.expenses,46000);
 assert.equal(validateGameState(s),true);
});

test('教育ローンは手元の現金を増やさず、学費と同額の債務を生む',()=>{
 const s=stateOf();s.finances.cash=50000;
 assert.equal(opportunityAction(s,'setEducationFunding',{mode:'loan'}).ok,true);
 const before=cashTotal(s.finances);
 advanceOpportunityMonth(s,{year:2018,month:5});
 assert.equal(s.finances.cash,before.cash);assert.equal(s.finances.totals.income,before.income);
 assert.equal(s.finances.debt,36000);assert.equal(s.opportunity47.education.loanBalance,36000);
 assert.equal(s.opportunity47.education.tuitionPaid,36000);
 assert.equal(opportunityAction(s,'setEducationFunding',{mode:'loan'}).ok,false);
});

test('奨学金は成績と過去の研究分岐で採否が変わり、同年度の複数申請を防ぐ',()=>{
 const fail=stateOf();assert.equal(opportunityAction(fail,'applyScholarship').passed,false);
 assert.equal(opportunityAction(fail,'applyScholarship').ok,false);
 const pass=stateOf();for(const key in pass.education.scores)pass.education.scores[key]=68;
 const accepted=opportunityAction(pass,'applyScholarship');assert.equal(accepted.passed,true);
 assert.equal(pass.opportunity47.education.grantMonthly,SCHOLARSHIP_PER_MONTH);
 pass.finances.cash=30000;advanceOpportunityMonth(pass,{year:2018,month:5});
 assert.equal(pass.finances.cash,12000);assert.equal(pass.finances.totals.income,0);
 assert.equal(pass.finances.totals.expenses,18000);
 assert.equal(pass.opportunity47.education.scholarshipPaid,18000);assert.equal(pass.opportunity47.education.tuitionCharged,36000);
 const research=stateOf();for(const key in research.education.scores)research.education.scores[key]=60;
 research.storyProgress.threads.spark={path:'research',stage:1,lastChoice:'科学が好き'};
 research.storyProgress.scheduled=[{thread:'spark',stage:2,dueAge:12}];
 assert.equal(opportunityAction(research,'applyScholarship').passed,true);
 assert.equal(validateGameState(research),true);
});

test('面接準備と専門実績は求人応募の評価に反映し、就職後は練習値をリセット',()=>{
 const s=stateOf(20,'卒業');s.finances=createEconomyData();s.finances.cash=10000;
 ensureCompanyMarket(s.finances);s.world=createWorldData();
 const post={id:'office',company:'さくら事務サービス',job:'事務職',salary:235000,minAge:18,threshold:48,focus:'国語'};
 const before=careerAction(clone(s.finances),'applyJob',{postingId:post.id},{age:20,education:s.education,date:s.timeline,world:s.world,interviewBonus:0});
 assert.equal(before.ok,true);assert.equal(before.passed,false);
 for(let i=0;i<3;i++)assert.equal(opportunityAction(s,'prepareInterview').ok,true);
 assert.equal(s.opportunity47.career.interviewPrep,6);
 assert.equal(opportunityAction(s,'prepareInterview').ok,false);
 assert.ok(interviewBonus(s)>=18);
 const after=careerAction(s.finances,'applyJob',{postingId:post.id},{age:20,education:s.education,date:s.timeline,world:s.world,interviewBonus:interviewBonus(s)});
 assert.equal(after.ok,true);assert.equal(after.passed,true);
 afterJobApplication(s,after.passed);
 assert.equal(s.finances.career.job,'事務職');assert.equal(s.opportunity47.career.interviewPrep,0);
});

test('給与交渉は勤続・評価・年間クールダウンが必要で、成功後の月給へ反映',()=>{
 const s=stateOf(30,'卒業'),c=s.finances.career;c.job='技術職';c.company='東都技術研究所';c.monthlySalary=290000;c.experience=18;c.performance=88;c.supervisorTrust=82;
 const result=opportunityAction(s,'salaryNegotiation');assert.equal(result.ok,true);assert.equal(result.passed,true);
 assert.ok(c.monthlySalary>290000);assert.equal(opportunityAction(s,'salaryNegotiation').ok,false);
 s.timeline.year++;s.timeline.ageYears++;s.timeline.monthsElapsed+=12;
 assert.equal(opportunityAction(s,'salaryNegotiation').ok,true);
 assert.equal(validateGameState(s),true);
});

test('給与交渉の失敗は無料の成功に変換されず、勤務と実績が必要',()=>{
 const s=stateOf(30,'卒業');assert.equal(opportunityAction(s,'salaryNegotiation').ok,false);
 const c=s.finances.career;c.job='販売スタッフ';c.company='みらい販売';c.experience=12;c.monthlySalary=195000;c.performance=40;c.supervisorTrust=30;
 assert.equal(opportunityAction(s,'salaryNegotiation').passed,false);
 assert.equal(c.monthlySalary,195000);
 assert.equal(opportunityAction(s,'salaryNegotiation').ok,false);
});

test('返済は現金と負債を同額減らす資産移動で、無からお金は生まれない',()=>{
 const s=stateOf(23,'卒業');s.opportunity47.education.loanBalance=65000;s.opportunity47.education.unpaidTuition=5000;
 s.finances.cash=75000;s.finances.debt=70000;
 const before=cashTotal(s.finances);
 const res=opportunityAction(s,'repayEducation',{amount:20000});assert.equal(res.ok,true);
 assert.equal(s.finances.cash,before.cash-20000);assert.equal(s.finances.debt,before.debt-20000);
 assert.equal(s.finances.totals.income,before.income);assert.equal(s.finances.totals.expenses,before.expenses);
 assert.equal(s.opportunity47.education.loanBalance,45000);
 advanceOpportunityMonth(s,{year:2023,month:6});
 assert.equal(s.finances.cash,43000);assert.equal(s.finances.debt,38000);
 assert.equal(s.opportunity47.education.repayTotal,32000);
 assert.equal(validateGameState(s),true);
});

test('生活費の見直しは節約と心の負担があり、12か月の頻度制限',()=>{
 const s=stateOf(24,'卒業');const before=s.finances.monthlyBudget,mental=s.health.mental;
 assert.equal(opportunityAction(s,'reviewBudget').ok,true);
 assert.equal(s.finances.monthlyBudget,Math.round(before*.94));assert.equal(s.health.mental,mental-2);
 assert.equal(opportunityAction(s,'reviewBudget').ok,false);
 s.timeline.year++;s.timeline.ageYears++;s.timeline.monthsElapsed+=12;
 assert.equal(opportunityAction(s,'reviewBudget').ok,true);
});

test('通常人生イベントの職業効果が長期の面接準備・職業実績に残る',()=>{
 const s=stateOf(18,'高校');s.finances.career.job=null;
 reflectOpportunityStoryChoice(s,{branch:null},{impact:{interviewPrep:2,careerPortfolio:2}});
 assert.equal(s.opportunity47.career.interviewPrep,2);
 assert.equal(s.opportunity47.career.portfolio,2);
 s.finances.career.job='販売スタッフ';reflectOpportunityStoryChoice(s,{}, {impact:{work:3}});
 assert.equal(s.opportunity47.career.portfolio,3);
});

test('STEP45の重要イベント優先を壊さずに、状況別イベントの連発を抑える',()=>{
 const s=stateOf(20,'大学');const event=selectOpportunityEvent(s,20,100,.10);
 assert.ok(event);assert.equal(event.options.length,3);
 assert.match(event.title,/学費|採用|職場/);
 assert.equal(selectOpportunityEvent(s,20,101,.10),null);
 assert.equal(selectOpportunityEvent(s,20,106,.50),null);
 assert.ok(selectOpportunityEvent(s,20,106,.10));
});

test('進学・就職・資産は同じカテゴリに集約され、自由行動は全カテゴリで1回',()=>{
 const s=stateOf(18,'大学');
 assert.ok(opportunityOptions(s,'学業').some(x=>x.action==='applyScholarship'));
 assert.ok(opportunityOptions(s,'仕事・経営').some(x=>x.action==='prepareInterview'));
 assert.ok(opportunityOptions(s,'生活・資産').some(x=>x.action==='reviewBudget'));
 const g=game();const loaded=g.loadState(s);assert.equal(loaded.ok,true);
 assert.equal(g.performAction('applyScholarship').ok,true);
 const second=g.performAction('reviewBudget');assert.equal(second.ok,false);
 assert.match(second.reason,/自由行動/);
});

test('STEP47のUI・版数・公開用ファイルが揃っている',()=>{
 const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
 assert.match(read('package.json'),/"version": "5\.6\.0"/);
 assert.match(read('README.md'),/STEP 49/);
 assert.match(read('index.html'),/phase47\.css/);
 assert.match(read('js/ui/topicPage.js'),/renderOpportunityPanel/);
 assert.match(read('js/ui/topicGroups.js'),/opportunityOptions/);
 assert.match(read('js/core/gameState.js'),/advanceOpportunityMonth/);
 assert.match(read('js/core/saveSystems.js'),/validateOpportunityProgress/);
});

test('旧「借金返済」画面でも教育費の残高を二重計上しない',()=>{
 const g=game(),s=stateOf(23,'卒業');
 s.finances.cash=120000;s.finances.debt=85000;
 s.opportunity47.education.loanBalance=45000;s.opportunity47.education.unpaidTuition=20000;
 assert.equal(g.loadState(s).ok,true);
 const result=g.performAction('repayDebt',{amount:50000});
 assert.equal(result.ok,true);
 const after=g.getState();
 assert.equal(after.finances.debt,35000);
 assert.equal(after.opportunity47.education.loanBalance,15000);
 assert.equal(after.opportunity47.education.unpaidTuition,20000);
 assert.equal(after.opportunity47.education.repayTotal,30000);
 assert.equal(after.finances.cash,70000);
 assert.equal(validateGameState(after),true);
});

test('旧来の一発就職と極端な生活費の変更は対話版で回避',()=>{
 const g=game(),s=stateOf(21,'卒業');s.finances.cash=200000;
 assert.equal(g.loadState(s).ok,true);
 const budget=g.performAction('setBudget',{amount:1});
 assert.equal(budget.ok,false);
 assert.equal(g.getState().finances.monthlyBudget,85000);
 // The old direct findJob shortcut now invokes the new evaluated application path.
 const result=g.performAction('findJob',{job:'事務職'});
 assert.equal(result.ok,true);
 assert.equal(result.passed,false);
 assert.equal(g.getState().finances.career.job,null);
 assert.equal(g.performAction('prepareInterview').ok,false);
});

test('実際のターン進行に学費の月次請求が連動し、既存の人生イベントは一つだけ発生',()=>{
 const g=game(),s=stateOf(19,'大学');s.finances.cash=250000;
 assert.equal(g.loadState(s).ok,true);
 const r=g.advanceTurn();assert.equal(r.ok,true);
 assert.equal(g.getState().opportunity47.education.tuitionCharged,Math.round(36000*eraEconomicEffects(g.getState().world).tuition));
 assert.ok(g.getState().pendingEvents.some(e=>e.type==='choice'));
 assert.equal(g.getState().pendingEvents.filter(e=>e.type==='choice').length,1);
 const ev=g.getState().pendingEvents.find(e=>e.type==='choice');
 assert.equal(g.performAction('resolveChoice',{eventId:ev.id,choice:ev.options[0].id}).ok,true);
 assert.equal(validateGameState(g.getState()),true);
});

test('30歳までの連続進行・分岐・学費と返済・保存状態が破綻しない',()=>{
 const store=game();let lastAge=0;let turn=0;
 while(store.getState().timeline.ageYears<30&&turn<400){
   const pending=store.getState().pendingEvents.find(e=>e.type==='choice');
   if(pending){
     const res=store.performAction('resolveChoice',{eventId:pending.id,choice:pending.options[0].id});
     assert.equal(res.ok,true,`選択失敗 ${turn}: ${res.reason}`);
   }
   const outcome=store.advanceTurn();assert.equal(outcome.ok,true,`進行失敗 ${turn}`);
   turn++;
   if(store.getState().timeline.ageYears>lastAge){
     const s=store.getState();assert.equal(validateGameState(s),true,`年齢${s.timeline.ageYears}の状態が不正`);
     assert.ok(s.finances.cash>=0&&s.finances.debt>=0);
     lastAge=s.timeline.ageYears;
   }
 }
 const current=store.getState();assert.equal(current.timeline.ageYears,30);
 assert.equal(current.education.stage,'卒業');assert.ok(current.opportunity47.education.tuitionCharged>1_000_000);
 const copyStore=createGameStore({interactiveChoices:true});
 assert.equal(copyStore.loadState(JSON.parse(JSON.stringify(current))).ok,true);
 assert.deepEqual(copyStore.getState().opportunity47,current.opportunity47);
});
