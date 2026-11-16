import {REGIONAL_FACTORS} from './livingSystems.js';
import {employmentQualificationBonus,canApplyUniversityRole} from './educationPaths.js';
import {getCompany} from './companySystems.js';
import {jobMarketAdjustment} from './worldSystems.js';
import {eraHiringAdjustment} from './eraSystems.js';
import {ensureWorkplace,staffProductivity,resetWorkplacePeople} from './workplaceSystems.js';
import {EXTENDED_JOB_POSTINGS,CAREER_SECTORS,careerEligibility,postingIsVisible,schoolRecommendationBonus} from './careerMarketplace.js';
/** 第10段階：求人・採用・企業経営のゲーム専用モデル。実在企業・賃金を表さない。 */
export const JOB_POSTINGS=Object.freeze([
  {id:'shop',company:'みらい販売',job:'販売スタッフ',salary:195000,minAge:18,threshold:35,focus:'社会'},
  {id:'office',company:'さくら事務サービス',job:'事務職',salary:235000,minAge:18,threshold:48,focus:'国語'},
  {id:'tech',company:'東都技術研究所',job:'技術職',salary:290000,minAge:18,threshold:62,focus:'数学'},
  {id:'pro',company:'日本総合開発',job:'専門職',salary:360000,minAge:22,threshold:73,focus:'英語',university:true},
  {id:'creative',company:'北星企画',job:'企画職',salary:260000,minAge:18,threshold:55,focus:'国語'},
  {id:'care',company:'青葉生活支援',job:'生活支援職',salary:215000,minAge:18,threshold:40,focus:'理科'},
  ...EXTENDED_JOB_POSTINGS,
]);
export const CAREER_TRAINING=Object.freeze([
  {id:'shop',name:'接客・販売',skill:'接客力'},
  {id:'office',name:'事務・会計',skill:'事務力'},
  {id:'tech',name:'情報技術',skill:'技術力'},
  {id:'pro',name:'専門研究',skill:'専門力'},
  {id:'creative',name:'企画・デザイン',skill:'企画力'},
  {id:'care',name:'生活支援',skill:'支援力'},
]);
const integer=(n,min=0,max=1000000)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
export const CAREER_PLANS=Object.freeze([
 {id:'balanced',name:'安定重視',description:'成果・健康・職場の信頼をバランスよく伸ばす'},
 {id:'specialist',name:'専門性重視',description:'業務成果を重視し技術・専門職として経験を積む'},
 {id:'leadership',name:'管理職を目指す',description:'上司と同僚の信頼を高め昇進を目指す'},
]);
export function careerStage(career){
 if(!career?.job)return {name:'就職準備',next:'求人応募・面接準備'};
 const months=career.experience??0,rank=career.rank??1;
 if(career.sector==='政治')return {name:career.politicalRank===3?'国政':career.politicalRank===2?'都道府県政':'市区町村政',next:'地域活動・政策実績と次の選挙への準備'};
 if(career.sector==='スポーツ')return {name:'競技キャリア',next:'練習・実績を積み、引退後は指導職も選べる'};
 if(['創作','出版','飲食','金融'].includes(career.sector))return {name:'専門キャリア',next:'作品・技術・実績で評価を高める'};
 if(rank>=4)return {name:'管理職',next:'人材育成・組織の成果'};
 if(rank>=2)return {name:'リーダー',next:'次の昇進審査・人事評価'};
 if(months<3)return {name:'試用期間',next:`初回評価まで残り${3-months}か月`};
 if(months<12)return {name:'業務習得期',next:`昇進審査の資格まで残り${12-months}か月`};
 if(months<36)return {name:'中堅社員',next:'実績・面接・専門技能を磨いて昇進'};
 return {name:'ベテラン社員',next:'管理職への昇進・専門分野の深化'};
}

export function employmentScore(education,posting,experience=0){
 const scores=education?.scores??{};const all=Object.values(scores).filter(Number.isFinite);
 const average=all.length?all.reduce((a,b)=>a+b,0)/all.length:0;
 const related=Number(scores[posting.focus]??0);
 const skill=Math.max(0,...Object.values(education?.skills??{}).filter(Number.isFinite));
 const course=CAREER_TRAINING.find(item=>item.id===posting.id);
 const trained=course?Number(education?.skills?.[course.skill]??0):0;
 const certified=course && (education?.qualifications??[]).includes(`${course.name}技能認定（ゲーム内）`);
 return Math.max(0,Math.min(100,Math.round(average*.45+related*.40+skill*.1+Math.min(experience,60)*.2+employmentQualificationBonus(education,posting.id)+Math.min(8,trained*.12)+(certified?4:0)+schoolRecommendationBonus(education,posting))));
}
export function careerAction(finances,action,payload,context){
 ensureWorkplace(finances);
 const career=finances.career,date=context.date;
 const record=(message)=>{finances.ledger.push({year:date.year,month:date.month,kind:'記録',label:message,amount:0});if(finances.ledger.length>600)finances.ledger.shift();};
 if(action==='setCareerTarget'){
  if(!CAREER_SECTORS.includes(payload.sector))return {ok:false,reason:'希望業種を選んでください。'};
  if(career.targetSector===payload.sector)return {ok:false,reason:'その業種を既に希望しています。'};
  career.targetSector=payload.sector;
  record(`志望業種：${payload.sector}`);
  return {ok:true,message:`${payload.sector}業界の求人を優先的に探します。`};
 }
 if(action==='internship'){
  if(context.age<16||context.age>35)return {ok:false,reason:'インターンは16～35歳向けです。'};
  if(career.job)return {ok:false,reason:'インターンは就職前・求職中に利用できます。'};
  if(!CAREER_SECTORS.includes(payload.sector))return {ok:false,reason:'インターンの業界を選んでください。'};
  career.internships??={};
  const old=career.internships[payload.sector]??0;
  if(old>=5)return {ok:false,reason:'この業界の実習経験は上限に達しました。'};
  career.internships[payload.sector]=old+1;
  career.targetSector=payload.sector;
  const field=payload.sector==='製造'||payload.sector==='IT'?'数学':payload.sector==='医療'||payload.sector==='研究'?'理科':'社会';
  context.education.scores[field]=Math.min(100,context.education.scores[field]+2);
  record(`${payload.sector}分野のインターン・実務体験`);
  return {ok:true,message:`${payload.sector}の実習${old+1}回。関連求人が見つかりやすくなり、採用適性にも反映されます。`};
 }
 if(action==='professionalExam'){
  const license=payload.license;
  const expected={'医師':'医学課程修了','歯科医師':'歯学課程修了'}[license];
  if(!expected)return {ok:false,reason:'ゲーム内の国家試験を選んでください。'};
  if(context.education.degree!==expected)return {ok:false,reason:`${expected}が受験条件です。`};
  context.education.licenses??=[];
  if(context.education.licenses.includes(license))return {ok:false,reason:'この資格は取得済みです。'};
  const testScore=Math.round((context.education.scores.理科+context.education.scores.数学)/2)+(context.education.examPreparation??0)*2;
  if(testScore<60)return {ok:false,reason:`試験準備が不足しています（評価${testScore}点）。学習や研修で再挑戦できます。`};
  context.education.licenses.push(license);
  record(`${license}のゲーム内資格試験に合格`);
  return {ok:true,message:`${license}のゲーム内資格を取得しました。該当する求人に応募できます。`};
 }
 if(action==='careerProject'){
  if(!career.job)return {ok:false,reason:'仕事に就いてから挑戦できます。'};
  if(!['創作','出版','飲食','金融','スポーツ','政治'].includes(career.sector))return {ok:false,reason:'現在の仕事は通常の職場活動を利用してください。'};
  career.reputation=Math.min(100,(career.reputation??0)+7);
  const label={創作:'作品を制作・発表',出版:'編集企画',飲食:'新メニューの開発',金融:'市場分析の研鑽',スポーツ:'競技の練習',政治:'政策・地域活動'}[career.sector];
  record(`${label}（実績${career.reputation}）`);
  return {ok:true,message:`${label}を行いました。実績${career.reputation}/100。`};
 }
 if(action==='careerTraining'){
  if(context.age<15)return {ok:false,reason:'職業別の研修は15歳からです。'};
  const course=CAREER_TRAINING.find(p=>p.id===payload.postingId);
  if(!course)return {ok:false,reason:'研修分野を選んでください。'};
  const education=context.education;
  const old=Number(education.skills[course.skill]??0);
  if(old>=100)return {ok:false,reason:'この分野は習得済みです。'};
  education.skills[course.skill]=Math.min(100,old+12);
  const qualification=`${course.name}技能認定（ゲーム内）`;
  education.qualifications??=[];
  let certified=false;
  if(education.skills[course.skill]>=40 && !education.qualifications.includes(qualification) && education.qualifications.length<5){
   education.qualifications.push(qualification);certified=true;
  }
  record(`${course.name}の研修${certified?'・資格取得':''}`);
  return {ok:true,message:`${course.name}の技能 ${education.skills[course.skill]}/100${certified?'、ゲーム内資格を取得':''}`};
 }
 if(action==='applyJob'){
  const post=JOB_POSTINGS.find(p=>p.id===payload.postingId);
  if(!post)return {ok:false,reason:'求人を選択してください。'};
  const employer=getCompany(finances,post.id);
  if(employer?.status==='営業停止')return {ok:false,reason:'この企業は営業を停止しています。'};
  if(employer?.openings===0)return {ok:false,reason:'現在、この企業に募集枠はありません。'};
  if(!employer && !postingIsVisible(context.marketState??{timeline:date,finances},post.id))
    return {ok:false,reason:'この企業の求人は現在公開されていません。次のターンやインターン後に再確認してください。'};
  if(context.age<post.minAge)return {ok:false,reason:`${post.minAge}歳から応募できます。`};
  if(post.university&&!canApplyUniversityRole(context.education))return {ok:false,reason:'この求人には4年制大学の修了が必要です。'};
  const eligibility=careerEligibility(post,context.education,career,context.age);
  if(eligibility)return {ok:false,reason:eligibility};
  const regionalScore= Math.round(((REGIONAL_FACTORS[finances.living?.region]?.jobs??1)-1)*20);
  const score=Math.max(0,Math.min(100,employmentScore(context.education,post,career.experience)+(career.searchEffort??0)*3+regionalScore+jobMarketAdjustment(context.world)+eraHiringAdjustment(context.world,post.id)+(context.interviewBonus??0)+Math.min(12,(career.internships?.[post.sector]??0)*3)+(post.sector&&career.sector===post.sector?7:0)+(post.sector&&career.targetSector===post.sector?2:0)+(career.reputation??0)*.04));
  career.applications=Array.isArray(career.applications)?career.applications:[];
  const passed=score>=post.threshold+(employer?.performance<40?3:0);
  career.applications.push({year:date.year,month:date.month,company:post.company,job:post.job,score,passed});
  if(career.applications.length>40)career.applications.shift();
  record(`${post.company}の採用選考：${passed?'合格':'不合格'}`);
  if(!passed)return {ok:true,passed:false,message:`採用見送り（評価${score}点／基準${post.threshold}点）。成績や技能を上げて再挑戦できます。`};
  const changing=Boolean(career.job);
  career.job=post.job;career.company=post.company;career.sector=post.sector??null;
  if(post.politicalRank)career.politicalRank=post.politicalRank;
  career.monthlySalary=post.salary+employmentQualificationBonus(context.education,post.id)*1000;
  career.experience=0;career.unemploymentMonths=0;career.benefitMonths=0;career.insuredMonths=0;career.previousSalary=0;career.searchEffort=0;career.rank=1;career.performance=50;career.supervisorTrust=50;career.coworkerTrust=50;career.workplaceActions=0;career.reviews=[];resetWorkplacePeople(career);career.promotions=career.promotions??0;career.jobChanges=(career.jobChanges??0)+1;
  record(`${post.company}に${changing?'転職':'就職'}`);
  return {ok:true,passed:true,message:`${post.company}に${changing?'転職':'就職'}しました。`};
 }
 if(action==='setCareerPlan'){
  if(!career.job)return {ok:false,reason:'働き方の方針は就職後に選べます。'};
  const plan=CAREER_PLANS.find(p=>p.id===payload.plan);
  if(!plan)return {ok:false,reason:'働き方の方針が不正です。'};
  if((career.plan??'balanced')===plan.id)return {ok:false,reason:'すでに選択中の働き方です。'};
  career.plan=plan.id;record(`働き方の方針を「${plan.name}」へ変更`);
  return {ok:true,message:`${plan.name}を選びました。今後の職場評価の伸び方が変化します。`};
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
