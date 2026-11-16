import {REGIONAL_FACTORS} from './livingSystems.js';
import {employmentQualificationBonus,canApplyUniversityRole} from './educationPaths.js';
import {getCompany} from './companySystems.js';
import {jobMarketAdjustment} from './worldSystems.js';
import {eraHiringAdjustment} from './eraSystems.js';
import {ensureWorkplace,staffProductivity,resetWorkplacePeople} from './workplaceSystems.js';
/** 第10段階：求人・採用・企業経営のゲーム専用モデル。実在企業・賃金を表さない。 */
export const JOB_POSTINGS=Object.freeze([
  {id:'shop',company:'みらい販売',job:'販売スタッフ',salary:195000,minAge:18,threshold:35,focus:'社会'},
  {id:'office',company:'さくら事務サービス',job:'事務職',salary:235000,minAge:18,threshold:48,focus:'国語'},
  {id:'tech',company:'東都技術研究所',job:'技術職',salary:290000,minAge:18,threshold:62,focus:'数学'},
  {id:'pro',company:'日本総合開発',job:'専門職',salary:360000,minAge:22,threshold:73,focus:'英語',university:true},
  {id:'creative',company:'北星企画',job:'企画職',salary:260000,minAge:18,threshold:55,focus:'国語'},
  {id:'care',company:'青葉生活支援',job:'生活支援職',salary:215000,minAge:18,threshold:40,focus:'理科'},
]);
const integer=(n,min=0,max=1000000)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
export function employmentScore(education,posting,experience=0){
 const scores=education?.scores??{};const all=Object.values(scores).filter(Number.isFinite);
 const average=all.length?all.reduce((a,b)=>a+b,0)/all.length:0;
 const related=Number(scores[posting.focus]??0);
 const skill=Math.max(0,...Object.values(education?.skills??{}).filter(Number.isFinite));
 return Math.max(0,Math.min(100,Math.round(average*.45+related*.40+skill*.1+Math.min(experience,60)*.2+employmentQualificationBonus(education,posting.id))));
}
export function careerAction(finances,action,payload,context){
 ensureWorkplace(finances);
 const career=finances.career,date=context.date;
 const record=(message)=>{finances.ledger.push({year:date.year,month:date.month,kind:'記録',label:message,amount:0});if(finances.ledger.length>600)finances.ledger.shift();};
 if(action==='applyJob'){
  const post=JOB_POSTINGS.find(p=>p.id===payload.postingId);
  if(!post)return {ok:false,reason:'求人を選択してください。'};
  const employer=getCompany(finances,post.id);
  if(employer?.status==='営業停止')return {ok:false,reason:'この企業は営業を停止しています。'};
  if(employer?.openings===0)return {ok:false,reason:'現在、この企業に募集枠はありません。'};
  if(context.age<post.minAge)return {ok:false,reason:`${post.minAge}歳から応募できます。`};
  if(post.university&&!canApplyUniversityRole(context.education))return {ok:false,reason:'この求人には4年制大学の修了が必要です。'};
  const regionalScore= Math.round(((REGIONAL_FACTORS[finances.living?.region]?.jobs??1)-1)*20);
  const score=Math.max(0,Math.min(100,employmentScore(context.education,post,career.experience)+(career.searchEffort??0)*3+regionalScore+jobMarketAdjustment(context.world)+eraHiringAdjustment(context.world,post.id)+(context.interviewBonus??0)));
  career.applications=Array.isArray(career.applications)?career.applications:[];
  const passed=score>=post.threshold+(employer?.performance<40?3:0);
  career.applications.push({year:date.year,month:date.month,company:post.company,job:post.job,score,passed});
  if(career.applications.length>40)career.applications.shift();
  record(`${post.company}の採用選考：${passed?'合格':'不合格'}`);
  if(!passed)return {ok:true,passed:false,message:`採用見送り（評価${score}点／基準${post.threshold}点）。成績や技能を上げて再挑戦できます。`};
  const changing=Boolean(career.job);
  career.job=post.job;career.company=post.company;career.monthlySalary=post.salary+employmentQualificationBonus(context.education,post.id)*1000;
  career.experience=0;career.unemploymentMonths=0;career.benefitMonths=0;career.insuredMonths=0;career.previousSalary=0;career.searchEffort=0;career.rank=1;career.performance=50;career.supervisorTrust=50;career.coworkerTrust=50;career.workplaceActions=0;career.reviews=[];resetWorkplacePeople(career);career.promotions=career.promotions??0;career.jobChanges=(career.jobChanges??0)+1;
  record(`${post.company}に${changing?'転職':'就職'}`);
  return {ok:true,passed:true,message:`${post.company}に${changing?'転職':'就職'}しました。`};
 }
 if(action==='promotionExam'){
  if(!career.job)return {ok:false,reason:'就業していません。'};
  if(career.experience<12)return {ok:false,reason:'昇進審査には勤続12か月以上が必要です。'};
  if(!integer(career.rank??1,1,5)||career.rank>=5)return {ok:false,reason:'これ以上昇進できません。'};
  const score=employmentScore(context.education,{focus:'国語'},career.experience);
  if(score<45)return {ok:false,reason:'昇進には評価45点以上が必要です。'};
  if(career.performance<40||career.supervisorTrust<35)return {ok:false,reason:'勤務成績と上司からの信頼が不足しています。'};
  career.rank=(career.rank??1)+1;career.promotions++;career.monthlySalary+=20000;
  record(`役職が${career.rank}級に上昇`);return {ok:true,message:'昇進審査に合格しました。'};
 }
 if(action==='hireEmployee'){
  if(!finances.business.active)return {ok:false,reason:'事業の開始が必要です。'};
  const business=finances.business;business.employees=business.employees??0;
  if(business.employees>=20)return {ok:false,reason:'従業員は最大20人です。'};
  if(finances.cash<100000)return {ok:false,reason:'採用には運転資金10万円が必要です。'};
  const id=business.nextStaffId++;business.staff.push({id:`STAFF-${id}`,name:`従業員${id}`,skill:45,morale:60,salary:45000,monthsEmployed:0});business.employees=business.staff.length;record('従業員を1人採用');return {ok:true};
 }
 if(action==='businessPolicy'){
  if(!finances.business.active)return {ok:false,reason:'事業を開始してください。'};
  if(!['安定','成長','節約'].includes(payload.policy))return {ok:false,reason:'経営方針を選択してください。'};
  finances.business.policy=payload.policy;record(`経営方針：${payload.policy}`);return {ok:true};
 }
 return {ok:false,reason:'未対応の職業操作です。'};
}
export function businessMonthlyFigures(business,phase){
 const employees=Math.max(0,Math.min(20,business.employees??0));
 const policy=business.policy??'安定';
 const modifier=phase==='好況'?1.05:phase==='不況'?.90:1;
 const revenue=Math.floor((business.monthlyRevenue+employees*65000*staffProductivity(business))*(policy==='成長'?1.18:policy==='節約'?.92:1)*modifier);
 const costs=Math.floor(business.monthlyCosts+(Array.isArray(business.staff)?business.staff.reduce((sum,p)=>sum+p.salary,0):employees*45000)+(policy==='成長'?30000:policy==='節約'?-12000:0));
 return {revenue:Math.max(0,revenue),costs:Math.max(0,costs)};
}
