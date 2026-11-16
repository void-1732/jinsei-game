import {estateBreakdown} from './estateSystems.js';
import {getHousingEquity} from './livingSystems.js';
import {advanceLiving} from './livingSystems.js';
import {businessMonthlyFigures} from './careerSystems.js';
import {canApplyUniversityRole} from './educationPaths.js';
import {eraEconomicEffects} from './eraSystems.js';
/** 第5段階：すべて整数円で扱う簡易経済システム。現実の税制・相場を再現しない。 */
export const PART_TIME_JOBS=Object.freeze([
  {id:'retail',name:'店舗スタッフ',hours:32,hourlyWage:1150,minAge:18},
  {id:'cafe',name:'カフェ接客',hours:40,hourlyWage:1200,minAge:18},
  {id:'tutor',name:'家庭教師',hours:24,hourlyWage:1900,minAge:18},
  {id:'delivery',name:'配送補助',hours:40,hourlyWage:1350,minAge:18},
  {id:'remote',name:'在宅データ入力',hours:36,hourlyWage:1250,minAge:18},
  {id:'design',name:'デザイン制作',hours:28,hourlyWage:1700,minAge:18},
]);
export const INVESTMENT_PRODUCTS=Object.freeze([
  {id:'deposit',name:'定期預金型',monthlyRate:0.0002,risk:'低'},
  {id:'bond',name:'債券型',monthlyRate:0.001,risk:'低〜中'},
  {id:'index',name:'株式インデックス型',monthlyRate:0.002,risk:'中'},
  {id:'stock',name:'個別株型',monthlyRate:0.003,risk:'高'},
  {id:'reit',name:'不動産投資信託型',monthlyRate:0.0016,risk:'中〜高'},
]);
export const VEHICLE_OPTIONS=Object.freeze([
  {id:'compact',name:'軽自動車',price:850000,monthlyCost:12000},
  {id:'economy',name:'コンパクトカー',price:1550000,monthlyCost:18000},
  {id:'family',name:'ファミリーカー',price:2850000,monthlyCost:26000},
  {id:'hybrid',name:'ハイブリッド車',price:3500000,monthlyCost:21000},
]);
const JOBS=Object.freeze({
  '販売スタッフ':{salary:195000,age:18,academic:'不問'},
  '事務職':{salary:235000,age:18,academic:'不問'},
  '技術職':{salary:290000,age:18,academic:'不問'},
  '専門職':{salary:360000,age:22,academic:'大学'},
});
export const jobOptions=Object.freeze(Object.entries(JOBS).map(([name,job])=>Object.freeze({name,...job})));
/** STEP 56: automatic raises taper with years worked, negotiated raises remain separate. */
export function scheduledRaise(career){
 const months=career?.experience??0;
 if(!Number.isInteger(months)||months<=0||months%36!==0)return 0;
 const step=months<=144?10000:months<=360?7000:4000;
 return Math.max(0,Math.min(step,420000-(career?.monthlySalary??0)));
}
export function lateCareerWageFactor(age){return age>=75?.70:age>=65?.85:1;}
/** Prolonged unemployment lowers real spending, not debt itself. Existing budgets apply. */
export function livingExpenseWithHardship(finances,age,priceMultiplier=1,discount=0){
 const full=Math.max(0,Math.round((finances?.monthlyBudget??0)*priceMultiplier));
 const months=age>=18&&!finances?.career?.job?Math.max(0,finances?.career?.unemploymentMonths??0):0;
 const factor=months>=72?.78:months>=36?.86:months>=12?.93:1;
 const floor=Math.round(Math.min(finances?.monthlyBudget??0,60000)*priceMultiplier);
 return Math.max(0,Math.max(floor,Math.round(full*factor))-Math.max(0,Math.round(discount)));
}
export function createEconomyData(){return {
  cash:0,investment:0,debt:0,monthlyBudget:85000,
  career:{job:null,company:null,monthlySalary:0,experience:0,promotions:0,jobChanges:0,unemploymentMonths:0,benefitMonths:0,previousSalary:0,searchEffort:0,benefitEligible:true,insuredMonths:0},
  sideJob:{active:false,monthlyIncome:35000},investmentHoldings:[],vehicle:null,business:{active:false,name:null,monthlyRevenue:0,monthlyCosts:0,capitalSpent:0,operatingCash:0,operatingDebt:0,lossMonths:0,status:'未設立',cashFlowHistory:[],ownerDraws:0,loanBalance:0,loanInterestPaid:0,equipmentValue:0,businessLedger:[],monthlyRepayment:0,equipmentDepreciation:0,loanApplications:0,loanDueIndex:0,loanOverdueMonths:0,creditScore:70,equipmentItems:[],nextEquipmentId:1,loanContracts:[],nextLoanId:1,loanPaymentHistory:[],loanScheduleHistory:[]},
  ledger:[],totals:{income:0,expenses:0,tax:0},
};}
export const EQUIPMENT_TYPES=Object.freeze({'標準設備':100,'事務機器':60,'製造機械':120,'車両':72,'店舗設備':96});
export const EQUIPMENT_DURABILITY=Object.freeze({'標準設備':1,'事務機器':1.2,'製造機械':.8,'車両':1.4,'店舗設備':.9});
const maintenanceFee=2000;
const equipmentIndex=(b,id)=>(b.equipmentItems??[]).findIndex(x=>x.id===id);

/** 設備投資の参考試算。独立した経営結果の因果予測ではなく、既存の生産性補正を台数で按分した目安。 */
export function estimateEquipmentReturns(b,worldPhase='通常'){
  const items=b?.equipmentItems??[];
  if(!b?.active||!items.length)return [];
  const base=Math.max(0,businessMonthlyFigures(b,worldPhase).revenue);
  return items.map(item=>{
    const condition=Math.max(0,Math.min(100,item.condition??100));
    const operative=!item.broken&&(item.repairMonths??0)===0;
    const monthlyContribution=operative?Math.floor(base*.12*(condition/100)/items.length):0;
    const upkeep=item.maintenance?maintenanceFee:0;
    const monthlyNet=monthlyContribution-upkeep;
    const investment=Math.max(0,item.originalValue??item.bookValue??0);
    return {id:item.id,name:item.name,monthlyContribution,monthlyMaintenance:upkeep,
      monthlyNet,estimatedRecoveryMonths:monthlyNet>0?Math.ceil(investment/monthlyNet):null,
      status:item.repairMonths>0?'修理中':item.broken?'故障中':'稼働中'};
  });
}


/** 現在の契約ごとの元本返済予定。利息は参考値であり元本返済とは別に月次精算する。 */
export function projectLoanSchedule(b,from,months=12){
  const contracts=(b.loanContracts??[]).filter(c=>c.principal>0).map(c=>({...c}));
  const rows=[];const horizon=Math.max(0,Math.min(60,months));
  for(let m=1;m<=horizon;m++){
    const index=from.year*12+from.month-1+m;let globalLeft=b.monthlyRepayment??0;
    for(const c of contracts.sort((a,z)=>a.dueIndex-z.dueIndex||a.id-z.id)){
      if(!c.principal)continue;
      const opening=c.principal;const interest=Math.max(1,Math.floor(opening*c.ratePermille/1000));
      const expected=Math.min(opening,c.monthlyTarget??0);c.principal-=expected;
      const extra=Math.min(c.principal,globalLeft);c.principal-=extra;globalLeft-=extra;
      rows.push({year:Math.floor(index/12),month:index%12+1,contractId:c.id,principal:expected+extra,interest,remaining:c.principal,due:index>=c.dueIndex&&c.dueIndex>0});
    }
  }return rows;
}
const validAmount=n=>Number.isSafeInteger(n)&&n>0&&n<=100000000;
function log(e,date,kind,label,amount){e.ledger.push({year:date.year,month:date.month,kind,label,amount});if(e.ledger.length>600)e.ledger.shift();}
function businessLog(b,date,label,amount){b.businessLedger??=[];b.businessLedger.push({year:date.year,month:date.month,label,amount});if(b.businessLedger.length>240)b.businessLedger.shift();}
/** 複数契約の元本合計を従来の loanBalance と同期する。旧データは一契約に変換。 */
function ensureLoanContracts(b){
  if(!Array.isArray(b.loanContracts))b.loanContracts=[];
  b.nextLoanId??=1;b.loanPaymentHistory??=[];b.loanScheduleHistory??=[];
  if(b.loanContracts.length===0 && b.loanBalance>0){
    b.loanContracts.push({id:b.nextLoanId++,principal:b.loanBalance,original:b.loanBalance,
      borrowedIndex:0,dueIndex:b.loanDueIndex||0,overdueMonths:b.loanOverdueMonths||0,ratePermille:5});
  }
  b.nextLoanId=Math.max(b.nextLoanId,1,...b.loanContracts.map(x=>x.id+1));
  b.loanBalance=b.loanContracts.reduce((sum,c)=>sum+c.principal,0);
  b.loanDueIndex=Math.max(0,...b.loanContracts.filter(c=>c.principal>0).map(c=>c.dueIndex));
}
function recordLoanPayment(b,date,contract,amount,kind){
  b.loanPaymentHistory.push({year:date.year,month:date.month,contractId:contract.id,amount,kind});
  if(b.loanPaymentHistory.length>120)b.loanPaymentHistory.shift();
}
function payLoanPrincipal(b,date,amount,kind){
  let remaining=amount;
  for(const c of [...b.loanContracts].sort((a,z)=>a.dueIndex-z.dueIndex||a.id-z.id)){
    const paid=Math.min(c.principal,remaining);if(paid<=0)continue;
    c.principal-=paid;remaining-=paid;recordLoanPayment(b,date,c,paid,kind);
    if(remaining===0)break;
  }
  b.operatingCash-=amount-remaining;
  ensureLoanContracts(b);
  if(b.loanBalance===0){b.monthlyRepayment=0;b.loanOverdueMonths=0;b.creditScore=Math.min(100,(b.creditScore??70)+5);}
  return amount-remaining;
}
function credit(e,date,label,amount){e.cash+=amount;e.totals.income+=amount;log(e,date,'収入',label,amount);}
function debit(e,date,label,amount){if(amount<=0)return;e.totals.expenses+=amount;if(e.cash>=amount)e.cash-=amount;else{e.debt+=amount-e.cash;e.cash=0;}log(e,date,'支出',label,-amount);}
export function economyAction(e,action,payload,context){
  const age=context.age,stage=context.education?.stage,date=context.date;
  switch(action){
    case 'findJob':{
      const job=JOBS[payload.job];
      if(!job)return {ok:false,reason:'職種を選択してください。'};
      if(age<job.age)return {ok:false,reason:`${job.age}歳から応募できます。`};
      if(job.academic==='大学' && !canApplyUniversityRole(context.education))return {ok:false,reason:'この職種には大学課程修了が必要です。'};
      if(e.career.job)return {ok:false,reason:'転職する場合は先に退職してください。'};
      e.career.job=payload.job;e.career.company=`${payload.job}の勤務先`;e.career.monthlySalary=job.salary;e.career.experience=0;e.career.jobChanges++;e.career.performance=50;e.career.supervisorTrust=50;e.career.coworkerTrust=50;e.career.workplaceActions=0;e.career.reviews=[];
      log(e,date,'記録',`${payload.job}に就職`,0);return {ok:true};
    }
    case 'resign':if(!e.career.job)return {ok:false,reason:'現在の勤務先はありません。'};
      log(e,date,'記録',`${e.career.job}を退職`,0);e.career.previousSalary=0;e.career.benefitMonths=0;e.career.unemploymentMonths=0;e.career.job=null;e.career.company=null;e.career.monthlySalary=0;e.career.experience=0;return {ok:true};
    case 'sideJob':{
      if(age<18)return {ok:false,reason:'アルバイトは18歳から利用できます。'};
      if(payload.active===false){e.sideJob.active=false;return {ok:true,message:'アルバイト・副業を停止しました。'};}
      const selected=PART_TIME_JOBS.find(x=>x.id===payload.jobId);
      if(payload.jobId!==undefined&&!selected)return {ok:false,reason:'アルバイトの種類が不正です。'};
      const job=selected??PART_TIME_JOBS[0];
      e.sideJob.active=true;e.sideJob.jobId=job.id;
      e.sideJob.hours=job.hours;e.sideJob.hourlyWage=job.hourlyWage;
      e.sideJob.monthlyIncome=payload.jobId===undefined?e.sideJob.monthlyIncome:job.hours*job.hourlyWage;
      return {ok:true,message:`${job.name}を開始しました（月${job.hours}時間・月収見込${e.sideJob.monthlyIncome.toLocaleString('ja-JP')}円）。`};
    }
    case 'startBusiness':if(age<20)return {ok:false,reason:'起業は20歳から利用できます。'};
      if(e.business.active)return {ok:false,reason:'すでに事業を経営しています。'};
      if(e.cash<300000)return {ok:false,reason:'起業資金30万円が必要です。'};
      e.cash-=300000;log(e,date,'資産移動','事業への創業出資',-300000);
      e.business={active:true,name:'個人事業',monthlyRevenue:190000,monthlyCosts:120000,capitalSpent:300000,employees:0,policy:'安定',operatingCash:300000,operatingDebt:0,lossMonths:0,status:'営業中',cashFlowHistory:[],ownerDraws:0,loanBalance:0,loanInterestPaid:0,equipmentValue:0,businessLedger:[],monthlyRepayment:0,equipmentDepreciation:0,loanApplications:0,loanDueIndex:0,loanOverdueMonths:0,creditScore:70,equipmentItems:[],nextEquipmentId:1,loanContracts:[],nextLoanId:1,loanPaymentHistory:[],loanScheduleHistory:[]};return {ok:true};
    case 'closeBusiness':{
      const b=e.business;
      if(!b.active)return {ok:false,reason:'経営中の事業がありません。'};
      if((b.loanBalance??0)>0)return {ok:false,reason:'事業融資の残高があります。融資を返済してから廃業してください。'};
      if((b.equipmentValue??0)>0)return {ok:false,reason:'事業設備が残っています。設備を売却してから廃業してください。'};
      const residual=b.operatingCash??0,shortage=b.operatingDebt??0;
      e.cash+=residual;
      e.debt+=shortage;
      b.operatingCash=0;b.operatingDebt=0;b.active=false;b.status='廃業';
      log(e,date,'資産移動','廃業時の事業残金精算',residual);
      if(shortage)log(e,date,'記録','廃業時の未払金を個人負債へ移管',shortage);
      businessLog(b,date,'廃業時の精算',-residual);
      return {ok:true,message:'事業の残金と未払金を精算しました。'};
    }
    case 'ownerDraw':{
      const b=e.business,amount=payload.amount;
      if(!b.active)return {ok:false,reason:'営業中または休業中の事業が必要です。'};
      if(!validAmount(amount)||amount>(b.operatingCash??0))return {ok:false,reason:'引き出し額または事業資金残高が不正です。'};
      b.operatingCash-=amount;b.ownerDraws=(b.ownerDraws??0)+amount;e.cash+=amount;
      log(e,date,'資産移動','事業資金から個人へ引き出し',amount);businessLog(b,date,'事業主引出し',-amount);
      return {ok:true,message:'事業資金を個人の現金へ移しました。'};
    }
    case 'jobSearch':{
      const c=e.career;
      if(age<18||c.job)return {ok:false,reason:'18歳以上の失業中に利用できます。'};
      if((c.searchEffort??0)>=3)return {ok:false,reason:'就職活動は最大3段階までです。'};
      c.searchEffort=(c.searchEffort??0)+1;
      log(e,date,'記録','再就職活動',0);
      return {ok:true,message:'採用評価の準備点が上がりました。'};
    }
    case 'businessFunding':{
      const b=e.business;
      if(!b.active)return {ok:false,reason:'事業を開始してください。'};
      if(!validAmount(payload.amount)||e.cash<payload.amount)return {ok:false,reason:'追加資金の額または現金残高を確認してください。'};
      e.cash-=payload.amount;b.operatingCash=(b.operatingCash??0)+payload.amount;
      log(e,date,'資産移動','事業の運転資金を追加',-payload.amount);businessLog(b,date,'事業主からの追加出資',payload.amount);
      return {ok:true,message:'事業の運転資金を追加しました。'};
    }
    case 'businessLoan':{
      const b=e.business,amount=payload.amount;
      if(!b.active || b.status==='廃業')return {ok:false,reason:'事業を開始してください。'};
      if(!validAmount(amount)||amount>500000||((b.loanBalance??0)+amount)>2000000)return {ok:false,reason:'融資額は1回50万円、残高合計200万円以内です。'};
      // 借入審査：既存負債と運転資金を考慮する簡易審査。信用履歴は新規借入を記録。
      const creditLimit=Math.min(2000000,Math.max(500000,Math.floor(((b.operatingCash??0)+Math.max(0,b.monthlyRevenue??0)*6)/100000)*100000));
      if((b.loanBalance??0)+amount>creditLimit || (b.operatingDebt??0)>500000)return {ok:false,reason:'融資審査に通りませんでした。事業資金・未払金・借入残高を確認してください。'};
      if((b.creditScore??70)<35 || (b.loanOverdueMonths??0)>0)return {ok:false,reason:'延滞または信用評価の不足により融資を利用できません。'};
      ensureLoanContracts(b);
      b.loanApplications=(b.loanApplications??0)+1;
      b.loanBalance=(b.loanBalance??0)+amount;b.operatingCash=(b.operatingCash??0)+amount;
      const nowIndex=date.year*12+date.month-1;
      b.loanContracts.push({id:b.nextLoanId++,principal:amount,original:amount,borrowedIndex:nowIndex,dueIndex:nowIndex+36,overdueMonths:0,ratePermille:5});
      ensureLoanContracts(b);
      businessLog(b,date,'事業融資の借入れ',amount);
      return {ok:true,message:'事業口座へ融資金を入金しました。月利0.5%の簡易融資です。'};
    }
    case 'repayBusinessLoan':{
      const b=e.business,amount=payload.amount;
      if(!b.active||!validAmount(amount)||amount>(b.loanBalance??0)||amount>(b.operatingCash??0))return {ok:false,reason:'返済額、融資残高、事業資金を確認してください。'};
      ensureLoanContracts(b);payLoanPrincipal(b,date,amount,'手動返済');businessLog(b,date,'融資元本の返済',-amount);
      return {ok:true,message:'事業融資を返済しました。'};
    }
    case 'setContractRepayment':{
      const b=e.business,id=payload.id,amount=payload.amount;ensureLoanContracts(b);
      const contract=b.loanContracts.find(c=>c.id===id&&c.principal>0);
      if(!b.active||!contract||!Number.isSafeInteger(amount)||amount<0||amount>500000)return {ok:false,reason:'融資契約と返済金額（0～50万円）を確認してください。'};
      contract.monthlyTarget=amount;businessLog(b,date,`契約${id}の月額返済予定を変更`,0);
      return {ok:true,message:'契約別の返済予定額を更新しました。'};
    }
    case 'setLoanRepayment':{
      const b=e.business,amount=payload.amount;
      if(!b.active||!Number.isSafeInteger(amount)||amount<0||amount>500000)return {ok:false,reason:'月額返済は0～50万円で設定してください。'};
      if(amount>0 && (b.loanBalance??0)===0)return {ok:false,reason:'事業融資残高がありません。'};
      b.monthlyRepayment=amount;businessLog(b,date,amount?'融資の月次返済計画を設定':'融資の月次返済計画を解除',0);
      return {ok:true,message:amount?'翌月から毎月自動返済します。':'自動返済を停止しました。'};
    }
    case 'restructureBusinessDebt':{
      const b=e.business;
      if(!b.active||(b.loanBalance??0)<=0 || (b.loanOverdueMonths??0)===0)return {ok:false,reason:'延滞している融資がありません。'};
      if((b.creditScore??70)<10)return {ok:false,reason:'信用評価が低すぎるため返済条件を変更できません。'};
      ensureLoanContracts(b);
      for(const c of b.loanContracts)if(c.principal>0){c.dueIndex=date.year*12+date.month-1+12;c.overdueMonths=0;}
      ensureLoanContracts(b);b.loanOverdueMonths=0;
      b.creditScore=Math.max(0,(b.creditScore??70)-10);
      businessLog(b,date,'融資返済条件の変更',0);
      return {ok:true,message:'返済期限を12か月延長しました。信用評価が低下します。'};
    }
    case 'settleBusinessPayable':{
      const b=e.business,amount=payload.amount;
      if(!b.active||!validAmount(amount)||amount>(b.operatingDebt??0)||amount>(b.operatingCash??0))return {ok:false,reason:'未払金と事業資金の残高を確認してください。'};
      b.operatingDebt-=amount;b.operatingCash-=amount;businessLog(b,date,'事業未払金の精算',-amount);
      return {ok:true,message:'事業未払金を精算しました。'};
    }
    case 'purchaseEquipment':{
      const b=e.business,amount=payload.amount;
      if(!b.active||b.status!=='営業中'||!validAmount(amount)||amount>200000||(b.operatingCash??0)<amount)return {ok:false,reason:'購入額は20万円以内、営業中かつ資金残高以内です。'};
      b.operatingCash-=amount;b.equipmentValue=(b.equipmentValue??0)+amount;
      b.equipmentItems??=[];b.nextEquipmentId??=1;
      const type=payload.type??'標準設備';if(!Object.hasOwn(EQUIPMENT_TYPES,type)){b.operatingCash+=amount;b.equipmentValue-=amount;return {ok:false,reason:'設備種別を選択してください。'};}
      const months=payload.usefulMonths??EQUIPMENT_TYPES[type];
      if(!Number.isSafeInteger(months)||months<12||months>240){b.operatingCash+=amount;b.equipmentValue-=amount;return {ok:false,reason:'耐用月数は12～240か月です。'};}
      b.equipmentItems.push({id:b.nextEquipmentId++,name:`${type}${b.nextEquipmentId-1}`,type,bookValue:amount,originalValue:amount,remainingMonths:months,usefulMonths:months,elapsedMonths:0,condition:100,broken:false,serviceCount:0,maintenance:false,repairMonths:0});
      businessLog(b,date,'事業設備の購入',-amount);
      return {ok:true,message:'事業設備を購入しました。'};
    }
    case 'serviceEquipment':{
      const b=e.business,id=payload.id;
      if(!b.active||!Number.isSafeInteger(id))return {ok:false,reason:'点検する設備を選択してください。'};
      const item=(b.equipmentItems??[]).find(x=>x.id===id);
      if(!item)return {ok:false,reason:'設備が見つかりません。'};
      const cost=5000;
      if((b.operatingCash??0)<cost)return {ok:false,reason:'点検費用5,000円が不足しています。'};
      b.operatingCash-=cost;item.condition=Math.min(100,(item.condition??100)+25);
      item.serviceCount=(item.serviceCount??0)+1;
      businessLog(b,date,`${item.name}の定期点検`,-cost);
      return {ok:true,message:'設備を点検しました。故障中の設備は修理が必要です。'};
    }
    case 'repairEquipment':{
      const b=e.business,id=payload.id;
      if(!b.active||!Number.isSafeInteger(id))return {ok:false,reason:'修理する設備を選択してください。'};
      const item=(b.equipmentItems??[]).find(x=>x.id===id);
      if(!item||!item.broken)return {ok:false,reason:'故障した設備を選択してください。'};
      const cost=20000;
      if((b.operatingCash??0)<cost)return {ok:false,reason:'修理費用20,000円が不足しています。'};
      b.operatingCash-=cost;item.condition=80;item.broken=false;item.repairMonths=0;
      businessLog(b,date,`${item.name}の修理`,-cost);
      return {ok:true,message:'設備を修理しました。'};
    }
    case 'toggleEquipmentMaintenance':{
      const b=e.business,id=payload.id;
      if(!b.active||!Number.isSafeInteger(id))return {ok:false,reason:'対象設備を指定してください。'};
      const item=(b.equipmentItems??[]).find(x=>x.id===id);
      if(!item)return {ok:false,reason:'設備が見つかりません。'};
      item.maintenance=!Boolean(item.maintenance);
      businessLog(b,date,`${item.name}の保守契約${item.maintenance?'開始':'終了'}`,0);
      return {ok:true,message:item.maintenance?'月額保守契約を開始しました。':'保守契約を終了しました。'};
    }
    case 'scheduleEquipmentRepair':{
      const b=e.business,id=payload.id;
      if(!b.active||!Number.isSafeInteger(id))return {ok:false,reason:'対象設備を指定してください。'};
      const item=(b.equipmentItems??[]).find(x=>x.id===id);
      if(!item||!item.broken||item.repairMonths>0)return {ok:false,reason:'修理依頼できる故障設備がありません。'};
      const cost=item.maintenance?10000:20000;
      if(b.operatingCash<cost)return {ok:false,reason:'修理費用が不足しています。'};
      b.operatingCash-=cost;item.repairMonths=1;
      businessLog(b,date,`${item.name}の修理依頼`,-cost);
      return {ok:true,message:'修理を依頼しました。翌月の時間進行時に完了します。'};
    }
    case 'replaceEquipment':{
      const b=e.business,id=payload.id,amount=payload.amount;
      if(!b.active||b.status!=='営業中'||!Number.isSafeInteger(id)||!validAmount(amount)||amount>200000)return {ok:false,reason:'営業中に設備番号と20万円以内の購入額を指定してください。'};
      const ix=equipmentIndex(b,id);if(ix<0)return {ok:false,reason:'設備が見つかりません。'};
      const old=b.equipmentItems[ix];const type=payload.type??old.type??'標準設備';
      if(!Object.hasOwn(EQUIPMENT_TYPES,type))return {ok:false,reason:'設備種別が不正です。'};
      const months=payload.usefulMonths??EQUIPMENT_TYPES[type];
      if(!Number.isSafeInteger(months)||months<12||months>240)return {ok:false,reason:'耐用月数が不正です。'};
      const ageFactor=old.usefulMonths?Math.max(.4,1-(old.elapsedMonths??0)/old.usefulMonths*.3):1;
      const sale=Math.floor(old.bookValue*.7*ageFactor);
      if(b.operatingCash+sale<amount)return {ok:false,reason:'買い替え資金が不足しています。'};
      b.operatingCash+=sale-amount;b.equipmentValue+=amount-old.bookValue;
      b.equipmentItems.splice(ix,1,{id:b.nextEquipmentId++,name:`${type}${b.nextEquipmentId-1}`,type,bookValue:amount,originalValue:amount,remainingMonths:months,usefulMonths:months,elapsedMonths:0,condition:100,broken:false,serviceCount:0,maintenance:false,repairMonths:0});
      businessLog(b,date,`${old.name}の買い替え売却`,sale);
      businessLog(b,date,`${type}への買い替え購入`,-amount);
      return {ok:true,message:`設備を買い替えました。旧設備の売却額は${sale.toLocaleString('ja-JP')}円です。`};
    }
    case 'sellEquipmentItem':{
      const b=e.business,id=payload.id;
      if(!b.active||!Number.isSafeInteger(id))return {ok:false,reason:'売却する設備を選択してください。'};
      const ix=(b.equipmentItems??[]).findIndex(item=>item.id===id);
      if(ix<0)return {ok:false,reason:'指定された設備が見つかりません。'};
      const item=b.equipmentItems[ix];const ageFactor=item.usefulMonths?Math.max(.4,1-(item.elapsedMonths??0)/item.usefulMonths*.3):1;const price=Math.floor(item.bookValue*.7*ageFactor);
      b.equipmentItems.splice(ix,1);b.equipmentValue-=item.bookValue;b.operatingCash+=price;
      businessLog(b,date,`${item.name}の売却`,price);
      return {ok:true,message:`設備を${price.toLocaleString('ja-JP')}円で売却しました。`};
    }
    case 'sellEquipment':{
      const b=e.business;
      if(!b.active||!(b.equipmentValue>0))return {ok:false,reason:'売却できる設備がありません。'};
      const value=Math.floor(b.equipmentValue*.7);
      b.equipmentValue=0;b.equipmentItems=[];b.operatingCash=(b.operatingCash??0)+value;
      businessLog(b,date,'事業設備の売却',value);
      return {ok:true,message:`設備を${value.toLocaleString('ja-JP')}円で売却しました。`};
    }
    case 'restartBusiness':{
      const b=e.business;
      if(!b.active||b.status!=='休業')return {ok:false,reason:'再開できる休業中の事業がありません。'};
      if((b.operatingCash??0)<100000)return {ok:false,reason:'営業再開には運転資金10万円が必要です。'};
      b.status='営業中';b.lossMonths=0;log(e,date,'記録','事業を再開',0);
      return {ok:true,message:'事業の営業を再開しました。'};
    }
    case 'setBudget':if(!validAmount(payload.amount)||payload.amount>500000)return {ok:false,reason:'生活費は1～50万円の整数円で設定してください。'};
      e.monthlyBudget=payload.amount;return {ok:true};
    case 'buyInvestment':{
      if(age<18)return {ok:false,reason:'投資は18歳から利用できます。'};
      if(!validAmount(payload.amount)||e.cash<payload.amount)return {ok:false,reason:'投資額が不正か現金が不足しています。'};
      const product=payload.productId===undefined?null:INVESTMENT_PRODUCTS.find(p=>p.id===payload.productId);
      if(payload.productId!==undefined&&!product)return {ok:false,reason:'投資商品の種類が不正です。'};
      if(product){
        e.investmentHoldings??=[];
        const existing=e.investmentHoldings.find(p=>p.id===product.id);
        if(existing)existing.value+=payload.amount;
        else e.investmentHoldings.push({id:product.id,value:payload.amount});
      }
      e.cash-=payload.amount;e.investment+=payload.amount;
      log(e,date,'資産移動',product?`${product.name}を購入`:'投資商品を購入',-payload.amount);
      return {ok:true,message:product?`${product.name}を購入しました。`:'投資商品を購入しました。'};
    }
    case 'sellInvestment':{
      if(!validAmount(payload.amount)||e.investment<payload.amount)return {ok:false,reason:'売却額が不正か投資残高が不足しています。'};
      const holdings=e.investmentHoldings??=[];
      if(payload.productId!==undefined&&!INVESTMENT_PRODUCTS.some(p=>p.id===payload.productId))return {ok:false,reason:'投資商品の種類が不正です。'};
      const selected=payload.productId?holdings.find(p=>p.id===payload.productId):null;
      if(selected&&selected.value<payload.amount)return {ok:false,reason:'指定した商品の保有額が足りません。'};
      if(payload.productId&&!selected)return {ok:false,reason:'指定した商品を保有していません。'};
      let remaining=payload.amount;
      for(const row of (selected?[selected]:holdings)){
        const used=Math.min(remaining,row.value);row.value-=used;remaining-=used;
        if(remaining===0)break;
      }
      // Legacy saves may contain unallocated investment value. Sell from it last.
      e.investment-=payload.amount;e.cash+=payload.amount;
      e.investmentHoldings=holdings.filter(p=>p.value>0);
      log(e,date,'資産移動','投資商品を売却',payload.amount);
      return {ok:true};
    }
    case 'buyVehicle':{
      if(age<18)return {ok:false,reason:'車の購入は18歳から利用できます。'};
      const option=VEHICLE_OPTIONS.find(v=>v.id===payload.vehicleId);
      if(!option)return {ok:false,reason:'車種を選択してください。'};
      if(e.vehicle)return {ok:false,reason:'先に現在の車を売却してください。'};
      if(e.cash<option.price)return {ok:false,reason:'購入費用が不足しています。'};
      e.cash-=option.price;e.vehicle={id:option.id,value:option.price,months:0};
      log(e,date,'資産移動',`${option.name}を購入`,-option.price);
      return {ok:true,message:`${option.name}を購入しました。月額維持費${option.monthlyCost.toLocaleString('ja-JP')}円。`};
    }
    case 'sellVehicle':{
      if(!e.vehicle)return {ok:false,reason:'所有している車がありません。'};
      const value=e.vehicle.value;
      e.cash+=value;e.vehicle=null;log(e,date,'資産移動','車を売却',value);
      return {ok:true,message:`${value.toLocaleString('ja-JP')}円で車を売却しました。`};
    }
    case 'repayDebt':if(!validAmount(payload.amount)||e.debt<payload.amount||e.cash<payload.amount)return {ok:false,reason:'返済額または返済可能残高を確認してください。'};
      e.debt-=payload.amount;e.cash-=payload.amount;log(e,date,'資産移動','借入金を返済',-payload.amount);return {ok:true};
    default:return {ok:false,reason:'未対応の経済操作です。'};
  }
}
/** 3か月ターンでも暦月ごとに精算。各月の状態は同じ初期職業状態を使用。 */
export function advanceEconomy(e,from,months,playerBirth,world=null,options={}){
  const notices=[];
  for(let step=1;step<=months;step++){
    const index=from.year*12+from.month-1+step;
    const date={year:Math.floor(index/12),month:index%12+1};
    const age=date.year-playerBirth.year-(date.month<playerBirth.month?1:0);
    if(age<18)continue; // 未成年の生活費は保護者負担とする
    const era=eraEconomicEffects(world);
    let gross=0;
    if(!e.career.job){
      e.career.unemploymentMonths=(e.career.unemploymentMonths??0)+1;
      const prev=e.career.previousSalary??0;
      if(prev>0&&e.career.benefitEligible!==false&&(e.career.benefitMonths??0)<6){
        const benefit=Math.min(100000,Math.floor(prev*.5));
        credit(e,date,'簡易失業給付',benefit);
        e.career.benefitMonths=(e.career.benefitMonths??0)+1;
        if(e.career.benefitMonths===6)e.career.benefitEligible=false;
      }
    }
    if(e.career.job){e.career.unemploymentMonths=0;e.career.insuredMonths=(e.career.insuredMonths??0)+1;if(e.career.insuredMonths>=12)e.career.benefitEligible=true;e.career.experience++;const raise=scheduledRaise(e.career);if(raise){e.career.promotions++;e.career.monthlySalary+=raise;notices.push({type:'promotion',title:'昇給',description:`月額給与が${e.career.monthlySalary.toLocaleString('ja-JP')}円になりました。`});}
      const pay=Math.max(0,Math.round(e.career.monthlySalary*era.wage*lateCareerWageFactor(age)));
      gross+=pay;credit(e,date,'給与',pay);}
    if(e.sideJob.active){gross+=e.sideJob.monthlyIncome;credit(e,date,'副業収入',e.sideJob.monthlyIncome);}
    if(e.business.active){
      const b=e.business;
      b.operatingCash??=b.capitalSpent??0;b.operatingDebt??=0;b.lossMonths??=0;
      if(b.loanContracts?.length===1 && b.loanDueIndex>0 && b.loanDueIndex<b.loanContracts[0].dueIndex)b.loanContracts[0].dueIndex=b.loanDueIndex;
      ensureLoanContracts(b);
      b.status??='営業中';b.cashFlowHistory??=[];
      // 融資利息は事業口座から先に支払い、不足分は未払金へ計上。
      if((b.loanBalance??0)>0){
        const interest=b.loanContracts.reduce((total,c)=>total+(c.principal>0?Math.max(1,Math.floor(c.principal*c.ratePermille/1000)):0),0);
        const paid=Math.min(b.operatingCash,interest);
        b.operatingCash-=paid;b.operatingDebt+=interest-paid;
        b.loanInterestPaid=(b.loanInterestPaid??0)+interest;
        businessLog(b,date,'融資利息',-interest);
      }
      const expectedPayments=projectLoanSchedule(b,{year:Math.floor((index-1)/12),month:(index-1)%12+1},1);
      const paymentsBefore=b.loanPaymentHistory.length;
      // 契約別の月額返済を優先して処理。資金不足の場合は可能な額だけ返済。
      for(const c of [...b.loanContracts].sort((a,z)=>a.dueIndex-z.dueIndex||a.id-z.id)){
        const payment=Math.min(c.monthlyTarget??0,c.principal,b.operatingCash);
        if(payment>0){c.principal-=payment;b.operatingCash-=payment;recordLoanPayment(b,date,c,payment,'自動返済');businessLog(b,date,`契約${c.id}の予定返済`,-payment);}
      }
      ensureLoanContracts(b);
      // 元本の定額自動返済は計画設定時だけ実施する。
      if((b.monthlyRepayment??0)>0 && (b.loanBalance??0)>0){
        const installment=Math.min(b.monthlyRepayment,b.loanBalance,b.operatingCash);
        if(installment>0){payLoanPrincipal(b,date,installment,'自動返済');businessLog(b,date,'計画による融資元本返済',-installment);}
        
      }
      for(const expected of expectedPayments){
        const paid=b.loanPaymentHistory.slice(paymentsBefore).filter(x=>x.contractId===expected.contractId).reduce((sum,x)=>sum+x.amount,0);
        b.loanScheduleHistory.push({year:date.year,month:date.month,contractId:expected.contractId,planned:expected.principal,actual:paid});
      }
      if(b.loanScheduleHistory.length>120)b.loanScheduleHistory.splice(0,b.loanScheduleHistory.length-120);
      // 保守契約の費用と修理完了は事業口座で扱う。契約料金を払えない月は保守効果なし。
      for(const item of b.equipmentItems??[]){
        item.maintenance??=false;item.repairMonths??=0;
        item.maintainedThisMonth=false;
        if(item.maintenance && b.status==='営業中' && b.operatingCash>=maintenanceFee){
          b.operatingCash-=maintenanceFee;item.maintainedThisMonth=true;
          businessLog(b,date,`${item.name}の月額保守費`,-maintenanceFee);
        }
        if(item.repairMonths>0){
          item.repairMonths--;
          if(item.repairMonths===0){item.broken=false;item.condition=80;
            notices.push({type:'finance',title:'設備の修理完了',description:`${item.name}が稼働を再開しました。`});}
        }
      }
      // 個別設備は残耐用月数で均等償却。旧データだけは従来の月次1%を維持。
      if((b.equipmentItems??[]).length){
        let sum=0,depTotal=0;
        for(const item of b.equipmentItems){
          if(item.remainingMonths>0 && item.bookValue>0){
            const dep=Math.min(item.bookValue,Math.ceil(item.bookValue/item.remainingMonths));
            item.bookValue-=dep;item.remainingMonths--;item.elapsedMonths=(item.elapsedMonths??0)+1;depTotal+=dep;
          }
          sum+=item.bookValue;
        }
        b.equipmentValue=sum;b.equipmentDepreciation=(b.equipmentDepreciation??0)+depTotal;
        if(depTotal)businessLog(b,date,'設備の減価償却（非現金）',-depTotal);
      }else if((b.equipmentValue??0)>0){
        const dep=Math.max(1,Math.floor(b.equipmentValue*.01));
        b.equipmentValue-=dep;b.equipmentDepreciation=(b.equipmentDepreciation??0)+dep;
        businessLog(b,date,'設備の減価償却（旧資産）',-dep);
      }
      // 設備状態は月単位で更新。故障は再現可能な年・月・設備番号の規則で判定。
      for(const item of b.equipmentItems??[]){
        const wear=Math.max(1,Math.round(((item.elapsedMonths??0)>12?2:1)*(EQUIPMENT_DURABILITY[item.type]??1)));
        item.condition=Math.max(0,(item.condition??100)-(item.maintainedThisMonth?Math.max(0,wear-1):wear));
        item.broken??=false;item.serviceCount??=0;
        if(!item.broken&&item.condition<=30&&(index+item.id*7)%(item.maintainedThisMonth?8:4)===0){
          item.broken=true;notices.push({type:'finance',title:'事業設備の故障',description:`${item.name}が故障しました。事業画面から修理できます。`});
          businessLog(b,date,`${item.name}が故障`,0);
        }
      }
      // 期日以降の未返済元本は延滞として記録。期限は現実の融資を模したものではない。
      // 契約別の延滞判定。同一月内の信用低下は最大3点に限定。
      // 単一契約の旧APIで変更された期日は互換処理として尊重する。
      if(b.loanContracts.length===1 && b.loanDueIndex>0 && b.loanDueIndex<b.loanContracts[0].dueIndex)b.loanContracts[0].dueIndex=b.loanDueIndex;
      let overdue=false;
      for(const c of b.loanContracts){
        if(c.principal>0 && c.dueIndex>0 && index>=c.dueIndex){
          c.overdueMonths=Math.min(1200,c.overdueMonths+1);overdue=true;
        }
      }
      b.loanOverdueMonths=Math.max(0,...b.loanContracts.map(c=>c.overdueMonths));
      if(overdue){
        b.creditScore=Math.max(0,(b.creditScore??70)-3);
        if(b.loanOverdueMonths===1)notices.push({type:'finance',title:'事業融資の返済期限',description:'返済期限を過ぎた事業融資があります。契約一覧で確認してください。'});
      }
      ensureLoanContracts(b);

      if(b.status==='営業中'){
        const baseFigures=businessMonthlyFigures(b,world?.phase);
        const assets=b.equipmentItems??[];
        const operational=assets.filter(x=>!x.broken).length;
        // 設備がない従来の事業は現状維持。故障設備1台につき売上を15%減額（最大60%）。
        const reliability=assets.length?Math.max(.4,1-(assets.length-operational)*.15):1;
        const avgCondition=assets.length?assets.reduce((sum,item)=>sum+(item.broken?0:(item.condition??100)),0)/assets.length:0;
        const productivity=assets.length?1+Math.min(.12,avgCondition/100*.12):1;
        const revenue=Math.floor(baseFigures.revenue*reliability*productivity*era.businessTech);
        const costs=Math.floor(baseFigures.costs*era.businessCost);
        // 事業売上・経費は事業口座だけで精算し、個人収支には加算しない。
        log(e,date,'事業記録','事業売上',revenue);businessLog(b,date,'事業売上',revenue);
        log(e,date,'事業記録','事業経費',-costs);businessLog(b,date,'事業経費',-costs);
        const net=revenue-costs;
        const cashBefore=b.operatingCash;
        b.operatingCash=Math.max(0,cashBefore+net);
        b.lossMonths=net<0?b.lossMonths+1:Math.max(0,b.lossMonths-1);
        if(net<0 && b.operatingCash===0)b.operatingDebt=Math.min(1000000000,b.operatingDebt+Math.max(0,-net-cashBefore));
        if(b.lossMonths>=3 && b.operatingCash<100000)b.status='休業';
        b.cashFlowHistory.push({year:date.year,month:date.month,revenue,costs,profit:net,cash:b.operatingCash,status:b.status,productivity:Math.round(productivity*100),workingEquipment:operational});
      }else{
        b.cashFlowHistory.push({year:date.year,month:date.month,revenue:0,costs:0,profit:0,cash:b.operatingCash,status:b.status});
      }
      if(b.cashFlowHistory.length>24)b.cashFlowHistory.shift();
    }
    const tax=Math.floor(gross*0.10);if(tax){debit(e,date,'簡易税金・社会保険',tax);e.totals.tax+=tax;}
    const livingCost=livingExpenseWithHardship(e,age,era.living,options.livingDiscount??0);
    debit(e,date,'生活費',livingCost);
    advanceLiving(e,date,age);
    if(e.vehicle){
      const option=VEHICLE_OPTIONS.find(v=>v.id===e.vehicle.id);
      if(option)debit(e,date,'車の維持費',option.monthlyCost);
      e.vehicle.months=(e.vehicle.months??0)+1;
      e.vehicle.value=Math.max(0,Math.floor(e.vehicle.value*0.992));
    }
    const holdings=e.investmentHoldings??[];
    const tracked=holdings.reduce((sum,row)=>sum+row.value,0);
    const legacy=Math.max(0,e.investment-tracked);
    let gains=0;
    if(legacy>0)gains+=Math.floor(legacy*0.002);
    for(const h of holdings){
      const product=INVESTMENT_PRODUCTS.find(p=>p.id===h.id);
      const base=product?.monthlyRate??0.002;
      // A deterministic, bounded swing; product risk changes monthly volatility.
      const variance=product?.risk==='高'?0.035:product?.risk==='中〜高'?0.020:product?.risk==='中'?0.012:0;
      const wave=variance?Math.sin((index+h.id.length*13)*0.37)*variance:0;
      const previous=h.value;const gain=Math.floor(previous*(base+wave));
      h.value=Math.max(0,previous+gain);gains+=h.value-previous;
    }
    e.investment=Math.max(0,legacy+Math.floor(legacy*0.002)+holdings.reduce((sum,row)=>sum+row.value,0));
    if(gains)log(e,date,'評価増減','投資商品の評価増減',gains);
  }
  return notices;
}
export function netWorth(e){return estateBreakdown(e).netAssets;}
