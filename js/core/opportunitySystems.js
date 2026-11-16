/** STEP 47: education funding, career preparation, and household decisions.
 * All amounts are fictional game yen; no real-world tuition, loan or tax schedule is implied.
 * Persistent data is optional, so a STEP 46 save can be loaded without resetting a life.
 */
import {JOB_POSTINGS} from './careerSystems.js';
import {canApplyUniversityRole} from './educationPaths.js';
import {eraEconomicEffects,eraScholarshipAdjustment} from './eraSystems.js';
const integer=(x,max=1_000_000_000)=>Number.isSafeInteger(x)&&x>=0&&x<=max;
const monthIndex=date=>date.year*12+date.month-1;
const avg=scores=>Math.round(Object.values(scores).reduce((a,b)=>a+b,0)/Math.max(1,Object.keys(scores).length));
const branch=(s,thread,path)=>s.storyProgress?.threads?.[thread]?.path===path;
const record=(state,date,label,amount=0,kind='記録')=>{
 const f=state.finances;
 f.ledger.push({year:date.year,month:date.month,kind,label,amount});
 if(f.ledger.length>600)f.ledger.shift();
};
export function createOpportunityProgress(){return {
 education:{funding:'self',scholarship:'未申請',grantMonthly:0,loanBalance:0,unpaidTuition:0,tuitionPaid:0,repayTotal:0,tuitionCharged:0,scholarshipPaid:0},
 career:{interviewPrep:0,portfolio:0,negotiatedIndex:-1,bonusReceived:0},
 budget:{lastReviewIndex:-1},lastSpecialTurn:-100,history:[],
};}
export function ensureOpportunityProgress(state){state.opportunity47??=createOpportunityProgress();return state.opportunity47;}
export function validateOpportunityProgress(p){
 if(!p||typeof p!=='object'||Array.isArray(p))return false;
 const e=p.education,c=p.career,b=p.budget;
 if(!e||!c||!b||!['self','loan'].includes(e.funding)||!['未申請','採用','不採用'].includes(e.scholarship))return false;
 if(!['grantMonthly','loanBalance','unpaidTuition','tuitionPaid','repayTotal','tuitionCharged','scholarshipPaid'].every(k=>integer(e[k])))return false;
 if(!integer(c.interviewPrep,6)||!integer(c.portfolio,12)||!integer(c.bonusReceived)||!integer(c.negotiatedIndex+1,30000))return false;
 if(!integer(b.lastReviewIndex+1,30000)||!Number.isInteger(p.lastSpecialTurn)||p.lastSpecialTurn< -100||p.lastSpecialTurn>30000)return false;
 return Array.isArray(p.history)&&p.history.length<=80&&p.history.every(h=>h&&typeof h.title==='string'&&h.title.length<=120&&Number.isInteger(h.year)&&h.year>=2000&&h.year<=2200&&Number.isInteger(h.month)&&h.month>=1&&h.month<=12);
}
const addHistory=(state,title)=>{
 const p=ensureOpportunityProgress(state);p.history.push({title,year:state.timeline.year,month:state.timeline.month});
 if(p.history.length>80)p.history.shift();
};
const eligibleScholarship=s=>avg(s.education.scores)+(branch(s,'spark','research')?10:0)+Math.min(8,(s.education.examPreparation??0)*2)+eraScholarshipAdjustment(s.world)>=68;
export const TUITION_PER_MONTH=36_000;
export const SCHOLARSHIP_PER_MONTH=18_000;
/** Monthly tuition and repayment are additional to the existing household cashflow. */
export function advanceOpportunityMonth(state,date){
 const p=ensureOpportunityProgress(state),e=p.education,f=state.finances;
 if(state.education.stage==='大学'){
   const tuition=Math.round((state.education.program?.tuition??TUITION_PER_MONTH)*eraEconomicEffects(state.world).tuition);
   const charged=Math.max(0,tuition-e.grantMonthly);
   p.education.tuitionCharged+=tuition;
   if(e.grantMonthly){e.scholarshipPaid+=e.grantMonthly;record(state,date,'給付奨学金を学費に直接充当',0,'記録');}
   if(charged){
     let paidThisMonth=0;
     if(e.funding==='loan'){
       e.loanBalance+=charged;f.debt+=charged;paidThisMonth=charged;
       record(state,date,'学費を教育ローンで支払い',0);
     }else{
       const paid=Math.min(f.cash,charged),short=charged-paid;
       f.cash-=paid;f.totals.expenses+=paid;paidThisMonth=paid;
       if(paid)record(state,date,'大学学費',-paid,'支出');
       if(short){e.unpaidTuition+=short;f.debt+=short;record(state,date,'学費未払いを負債として計上',0);}
     }
     e.tuitionPaid+=paidThisMonth;
   }
   if(e.grantMonthly)e.tuitionPaid+=e.grantMonthly;
 }else if(state.education.stage==='卒業'&&(e.loanBalance>0||e.unpaidTuition>0)){
   // A small payment after graduation, only if the account has genuine cash available.
   // Never borrow money to repay another loan automatically.
   const amount=Math.min(12_000,e.loanBalance+e.unpaidTuition,Math.max(0,f.cash-35_000));
   if(amount>0)repayEducationBalance(state,amount,date,'教育費の自動返済');
 }
}
function repayEducationBalance(state,amount,date,label){
 const p=ensureOpportunityProgress(state).education,f=state.finances;
 const due=p.loanBalance+p.unpaidTuition;
 if(!integer(amount,1_000_000)||amount===0||amount>due||amount>f.cash)return {ok:false,reason:'返済可能な金額を確認してください。'};
 const loan=Math.min(p.loanBalance,amount);p.loanBalance-=loan;p.unpaidTuition-=amount-loan;
 f.cash-=amount;f.debt=Math.max(0,f.debt-amount);p.repayTotal+=amount;
 // Liability repayment is a transfer, not a new expense or a new income.
 record(state,date,label,-amount,'資産移動');
 return {ok:true,message:`教育費の負債を${amount.toLocaleString('ja-JP')}円返済しました。`};
}
export function opportunityAction(state,action,payload={}){
 const p=ensureOpportunityProgress(state),f=state.finances,age=state.timeline.ageYears,date=state.timeline;
 const u=state.education.stage==='大学',employed=Boolean(f.career.job),idx=monthIndex(date);
 if(action==='applyScholarship'){
   if(!u)return {ok:false,reason:'奨学金の申請は大学在学中だけです。'};
   if(p.education.scholarship!=='未申請')return {ok:false,reason:'この進学での申請は完了しています。'};
   const passed=eligibleScholarship(state);
   p.education.scholarship=passed?'採用':'不採用';p.education.grantMonthly=passed?SCHOLARSHIP_PER_MONTH:0;
   addHistory(state,passed?'奨学金に採用。以後、毎月の学費を18,000円軽減':'奨学金は不採用。学業・進路の別の選択肢を考える');
   return {ok:true,passed,message:passed?'架空の給付奨学金に採用されました。以後、毎月18,000円を学費に充当します。':'今回の奨学金は不採用でした。成績や探究経験も審査に影響します。'};
 }
 if(action==='setEducationFunding'){
   if(!u||!['loan','self'].includes(payload.mode))return {ok:false,reason:'大学在学中に学費の支払い方法を選択してください。'};
   if(p.education.funding===payload.mode)return {ok:false,reason:'現在と同じ支払い方法です。'};
   p.education.funding=payload.mode;
   addHistory(state,payload.mode==='loan'?'学費を教育ローンで賄う方針に変更':'手元の現金から学費を支払う方針に変更');
   return {ok:true,message:payload.mode==='loan'?'翌月以降の学費不足分は教育ローンの負債になります。':'翌月以降は現金で学費を払い、不足額は未払い負債になります。'};
 }
 if(action==='repayEducation'){
   if(age<18)return {ok:false,reason:'教育費の返済は18歳以上です。'};
   const amount=Math.min(p.education.loanBalance+p.education.unpaidTuition,payload.amount??20_000);
   const result=repayEducationBalance(state,amount,date,'教育費の追加返済');
   if(result.ok)addHistory(state,'教育費の追加返済を実施');return result;
 }
 if(action==='prepareInterview'){
   if(age<17||employed)return {ok:false,reason:'面接の準備は17歳以上の求職者向けです。'};
   if(p.career.interviewPrep>=6)return {ok:false,reason:'面接準備は上限に達しました。応募に挑戦してください。'};
   p.career.interviewPrep=Math.min(6,p.career.interviewPrep+2);state.health.energy=Math.max(0,state.health.energy-4);
   addHistory(state,'面接練習をして応募の準備を進めた');
   return {ok:true,message:`面接準備が${p.career.interviewPrep}/6になりました。採用評価に反映されます。`};
 }
 if(action==='careerCertification'){
   if(age<18)return {ok:false,reason:'職業訓練は18歳以上が対象です。'};
   if(p.career.portfolio>=12)return {ok:false,reason:'職業資格・実績の基礎は十分に積み上がっています。'};
   if(f.cash<6_000)return {ok:false,reason:'受講費用6,000円が必要です。'};
   f.cash-=6_000;f.totals.expenses+=6_000;record(state,date,'職業訓練の費用',-6_000,'支出');
   p.career.portfolio=Math.min(12,p.career.portfolio+2);state.health.energy=Math.max(0,state.health.energy-3);
   addHistory(state,'費用を支払って職業訓練に参加');
   return {ok:true,message:'職業スキル実績が増えました。採用評価と給与交渉に活用できます。'};
 }
 if(action==='salaryNegotiation'){
   const career=f.career;
   if(!employed||career.experience<12)return {ok:false,reason:'給与交渉は勤続12か月以上からです。'};
   if(p.career.negotiatedIndex>=0&&idx-p.career.negotiatedIndex<12)return {ok:false,reason:'給与交渉は12か月に1度までです。'};
   const score=Math.round((career.performance??50)*.65+(career.supervisorTrust??50)*.2+p.career.portfolio*2+(branch(state,'career','specialist')?10:0));
   const success=score>=62;
   p.career.negotiatedIndex=idx;
   if(success){const raise=Math.min(30_000,8_000+Math.min(12_000,Math.floor(career.experience/12)*2_000)+p.career.portfolio*500);career.monthlySalary+=raise;record(state,date,'給与交渉が成立',0);addHistory(state,`給与交渉成功。月給が${raise.toLocaleString('ja-JP')}円増額`);return {ok:true,passed:true,message:`交渉成立。月給が${raise.toLocaleString('ja-JP')}円増え、翌月から給与に反映されます。`};}
   record(state,date,'給与交渉は見送り',0);addHistory(state,'給与交渉は不成立。実績を積んで再挑戦');
   return {ok:true,passed:false,message:'今回は昇給見送り。仕事評価、上司の信頼、専門性を高めて再挑戦できます。'};
 }
 if(action==='reviewBudget'){
   if(age<18)return {ok:false,reason:'家計の見直しは18歳からです。'};
   if(p.budget.lastReviewIndex>=0&&idx-p.budget.lastReviewIndex<12)return {ok:false,reason:'家計の見直しは12か月に1度までです。'};
   if(f.monthlyBudget<=60_000)return {ok:false,reason:'これ以上、必要な生活費を削減できません。'};
   const before=f.monthlyBudget;f.monthlyBudget=Math.max(60_000,Math.round(before*.94));p.budget.lastReviewIndex=idx;
   state.health.mental=Math.max(0,state.health.mental-2);
   addHistory(state,'毎月の生活費を見直した');
   return {ok:true,message:`毎月の生活費予算を${before.toLocaleString('ja-JP')}円から${f.monthlyBudget.toLocaleString('ja-JP')}円に変更しました。ゆとりと支出のトレードオフがあります。`};
 }
 return {ok:false,reason:'未対応の進学・職業・家計操作です。'};
}
/** Generic debt repayment reduces non-education debt first, then outstanding tuition balances. */
export function reconcileGenericDebtPayment(state,amount,beforeDebt){
 const edu=ensureOpportunityProgress(state).education;
 const educationDue=edu.loanBalance+edu.unpaidTuition;
 const otherDebt=Math.max(0,beforeDebt-educationDue);
 const educationPayment=Math.min(educationDue,Math.max(0,amount-otherDebt));
 const loanPart=Math.min(edu.loanBalance,educationPayment);
 edu.loanBalance-=loanPart;edu.unpaidTuition-=educationPayment-loanPart;
 edu.repayTotal+=educationPayment;
}

/** Choices matter to future employment even when they arose from the ordinary event catalog. */
export function reflectOpportunityStoryChoice(state,event,option){
 const p=ensureOpportunityProgress(state),impact=option.impact??{};
 if(state.timeline.ageYears>=12&&state.timeline.ageYears<=24&&impact.study>0&&p.career.portfolio<12){
   if(event.branch?.thread==='spark'&&option.path==='research')p.career.portfolio=Math.min(12,p.career.portfolio+2);
 }
 if(state.timeline.ageYears>=17&& !state.finances.career.job && impact.work>0)p.career.interviewPrep=Math.min(6,p.career.interviewPrep+1);
 if(state.finances.career.job&&impact.work>0)p.career.portfolio=Math.min(12,p.career.portfolio+1);
 if(impact.interviewPrep>0)p.career.interviewPrep=Math.min(6,p.career.interviewPrep+impact.interviewPrep);
 if(impact.careerPortfolio>0)p.career.portfolio=Math.min(12,p.career.portfolio+impact.careerPortfolio);
 if(impact.budgetHabit>0 && state.timeline.ageYears>=18){
   // Habit is useful only by changing real spending, never by generating cash.
   state.finances.monthlyBudget=Math.max(60_000,Math.round(state.finances.monthlyBudget*.99));
 }
}
export function interviewBonus(state){const p=ensureOpportunityProgress(state),edu=state.education;return Math.min(20,p.career.interviewPrep*3+Math.floor(p.career.portfolio/3)+(branch(state,'spark','research')?3:0)+(branch(state,'career','specialist')?2:0));}
export function afterJobApplication(state,passed){if(passed){ensureOpportunityProgress(state).career.interviewPrep=0;addHistory(state,'面接準備が実り、新しい勤務先が決まった');}}
export function opportunityOptions(state,category){
 if(!state?.initialized)return [];
 const p=state.opportunity47??createOpportunityProgress(),f=state.finances,age=state.timeline.ageYears,stage=state.education.stage;
 const out=[],add=(label,action,payload,description)=>out.push({label,action,payload,description});
 if(category==='学業'&&stage==='高校'&&age>=15){
   if(state.education.universityChoice==='進学')add('高校卒業後は就職を選ぶ','university',{choice:'就職'},'大学の学費を負わず働き始める。専門職の応募条件は変わる');
   else add('高校卒業後は大学進学を選ぶ','university',{choice:'進学'},'進学には将来の学費と資金計画が必要');
 }
 if(category==='学業'&&stage==='大学'){
   if(p.education.scholarship==='未申請')add('給付奨学金に申請','applyScholarship',{},'学力や幼少期の探究経験で審査。採用なら毎月18,000円を補助');
   if(p.education.funding==='self')add('学費を教育ローンに切替','setEducationFunding',{mode:'loan'},'今後の学費を負債に計上し、卒業後に返済');
   else add('学費を現金払いに戻す','setEducationFunding',{mode:'self'},'残るローンの返済は継続');
 }
 if(category==='学業'&&age>=18&&p.education.loanBalance+p.education.unpaidTuition>0&&f.cash>0)add('教育費を追加返済','repayEducation',{amount:20_000},'手持ち現金から上限20,000円を返済');
 if(category==='仕事・経営'&&age>=17){
   if(!f.career.job){
     if(p.career.interviewPrep<6)add('面接の練習','prepareInterview',{},'採用評価を上げる・疲労あり');
     if(age>=18)for(const job of JOB_POSTINGS){
       if(age>=job.minAge&&(!job.university||canApplyUniversityRole(state.education)))
         add(`${job.job}へ応募`,'applyJob',{postingId:job.id},`月給${job.salary.toLocaleString('ja-JP')}円・採用は能力と募集状況次第`);
     }
   }else if(f.career.experience>=12&&(p.career.negotiatedIndex<0||monthIndex(state.timeline)-p.career.negotiatedIndex>=12)){
     add('給与を交渉する','salaryNegotiation',{},'成果と信頼により昇給、失敗もあり・12か月ごと');
   }
   if(age>=18&&p.career.portfolio<12&&f.cash>=6000)add('資格・職業訓練','careerCertification',{},'費用6,000円・採用と給与交渉に役立つ');
 }
 if(category==='生活・資産'&&age>=18&&(p.budget.lastReviewIndex<0||monthIndex(state.timeline)-p.budget.lastReviewIndex>=12)&&f.monthlyBudget>60_000)
   add('家計を見直す','reviewBudget',{},'毎月の生活費を6%抑えるが心の余裕を少し消費');
 return out;
}
/** Milestone events complement, not replace, the STEP 46 catalog or STEP 45 threads. */
export function selectOpportunityEvent(state,age,turn,randomValue){
 if(!state||age<16||randomValue>=.23)return null;
 const p=ensureOpportunityProgress(state);
 if(turn-p.lastSpecialTurn<5)return null;
 const options=[];
 const custom=(title,description,choices)=>({title,description,choices});
 const job=state.finances.career.job,stage=state.education.stage;
 if(stage==='高校'&&age>=16)options.push(custom('卒業後の生活を考える','学費と収入の関係を知ると、進路の見え方が変わる。',[
  ['奨学金の条件を調べる','学びの準備を進めた',{study:3}],['働く先を調べる','職業の選択肢が見えた',{interviewPrep:2,study:1}],['家族と費用を話し合う','現実的な計画を立てた',{social:3,socialTarget:'family'}]]));
 if(stage==='大学')options.push(custom('大学の学費と将来','学費が積み重なる。学びとお金、どちらも考えよう。',[
  ['勉強に専念する','知識を積み上げた',{study:4,energy:-3}],['インターンの準備をする','社会で使える技能を磨いた',{careerPortfolio:2,energy:-3}],['家計簿を見直す','小さな支出が変わった',{budgetHabit:1,mental:-1}]]));
 if(age>=18&&!job)options.push(custom('採用選考への準備','応募先の人事担当者から選考の進め方を教わった。',[
  ['模擬面接を受ける','話し方を練習できた',{interviewPrep:2,energy:-3}],['過去の実績をまとめる','成果をわかりやすく整理した',{careerPortfolio:2}],['体調を整える','落ち着いて選考に臨めそうだ',{energy:5,mental:2}]]));
 if(age>=20&&job)options.push(custom('職場からの評価','これまでの働き方を振り返り、次の昇給や昇進を考える機会が来た。',[
  ['成果を資料にまとめる','仕事の経験を見える形に残した',{careerPortfolio:2,work:2,energy:-3}],['周囲と協力する','チームの成果が上がった',{work:3,social:2}],['働くペースを見直す','無理のない働き方を考えた',{mental:4,energy:3}]]));
 if(!options.length)return null;
 const selected=options[Math.floor(randomValue/.23*options.length)%options.length];
 p.lastSpecialTurn=turn;
 return {title:selected.title,description:selected.description,category:'進路・仕事・お金',options:selected.choices.map(([label,result,impact],i)=>({id:String(i+1),label,result,impact,hint:label}))};
}
