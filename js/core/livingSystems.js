/** 第27段階：日本国内の架空の生活費・住居・任意保険制度。現実の税・保障制度ではない。 */
export const REGIONS=Object.freeze([
 ['北海道・札幌',72000],['宮城・仙台',76000],['新潟・新潟',65000],['埼玉・さいたま',94000],
 ['東京・東京23区',125000],['愛知・名古屋',88000],['大阪・大阪',98000],['香川・高松',62000],
 ['福岡・福岡',79000],['鹿児島・鹿児島',59000]
].map(([name,rent])=>Object.freeze({name,rent})));
export const HOME_OPTIONS=Object.freeze([
 {id:'small',name:'小さな戸建て・中古物件',priceFactor:0.65,maintenanceFactor:0.8},
 {id:'standard',name:'標準的な住宅',priceFactor:1,maintenanceFactor:1},
 {id:'large',name:'広い戸建て・大型物件',priceFactor:1.6,maintenanceFactor:1.4},
]);
export const INSURANCE_PLANS=Object.freeze({
 '未加入':{premium:0,benefit:0},'基本保障':{premium:3000,benefit:15000},'充実保障':{premium:7000,benefit:40000},
 '医療重点':{premium:4500,benefit:28000},'がん・重病重点':{premium:6200,benefit:50000},'生活防衛':{premium:8500,benefit:65000}
});
export const REGIONAL_FACTORS=Object.freeze({'北海道・札幌':{living:0.94,jobs:0.98},'宮城・仙台':{living:0.96,jobs:1},'新潟・新潟':{living:0.92,jobs:0.97},'埼玉・さいたま':{living:1,jobs:1.02},'東京・東京23区':{living:1,jobs:1},'愛知・名古屋':{living:0.98,jobs:1.03},'大阪・大阪':{living:1,jobs:1.02},'香川・高松':{living:0.9,jobs:0.95},'福岡・福岡':{living:0.96,jobs:1},'鹿児島・鹿児島':{living:0.9,jobs:0.95}});
export function createLivingData(){return {region:'東京・東京23区',housing:'実家',rent:0,propertyValue:0,monthlyHousingCost:0,insurance:'未加入',homeType:'standard',lastClaimKey:null,moves:[],claims:[],mortgageBalance:0,mortgagePayment:0,mortgageMonths:0,pensionMonths:0,pensionPaid:0,mortgageArrears:0,mortgageLateMonths:0,mortgageHistory:[],propertyAgeMonths:0,repairCount:0,pensionContributions:0,medicalSubsidyPaid:0,mortgageCredit:70,mortgageArrearsPaid:0,homeMaintenancePaid:0,pensionPremiumPaid:0,insuranceBenefitPaid:0,pensionMode:'通常納付',pensionExemptMonths:0,pensionUnpaidMonths:0,pensionBackPaidMonths:0,pensionUnpaidRecords:[],pensionCreditHalfUnits:0,mortgageRejectedApplications:0,mortgageAccounting:'従来方式',mortgageOverdueInterest:0,pensionExemptionApplications:0,insuranceClaimCap:'定額',pensionHistory:[]};}
export function ensureMortgage(l){l.mortgageBalance??=0;l.mortgagePayment??=0;l.mortgageMonths??=0;l.pensionMonths??=0;l.pensionPaid??=0;l.mortgageArrears??=0;l.mortgageLateMonths??=0;l.mortgageHistory??=[];l.propertyAgeMonths??=0;l.repairCount??=0;l.pensionContributions??=0;l.medicalSubsidyPaid??=0;l.mortgageCredit??=70;l.mortgageArrearsPaid??=0;l.homeMaintenancePaid??=0;l.pensionPremiumPaid??=0;l.insuranceBenefitPaid??=0;l.pensionMode??='通常納付';l.pensionExemptMonths??=0;l.pensionUnpaidMonths??=0;l.pensionBackPaidMonths??=0;l.pensionUnpaidRecords??=[];l.pensionCreditHalfUnits??=(l.pensionMonths??0)*2;l.mortgageRejectedApplications??=0;l.mortgageAccounting??='従来方式';l.mortgageOverdueInterest??=0;l.pensionExemptionApplications??=0;l.insuranceClaimCap??='定額';l.pensionHistory??=[];return l;}
/** 第31段階：家計の信用と手元資金を使うゲーム独自の住宅ローン簡易審査。 */
export function assessMortgage(f,price,loan){
 const l=ensureMortgage(ensureLiving(f));
 const payment=Math.ceil(loan*.003/(1-Math.pow(1.003,-360)));
 const monthlyIncome=(f.career?.monthlySalary??0)+(f.sideJob?.active?(f.sideJob.monthlyIncome??0):0);
 if(l.mortgageCredit<55)return {ok:false,reason:'住宅ローン審査：信用評価55点以上が必要です。',payment};
 if(f.debt>Math.max(3000000,monthlyIncome*24))return {ok:false,reason:'住宅ローン審査：既存の個人負債が多すぎます。',payment};
 if(monthlyIncome>0&&payment>monthlyIncome*.45)return {ok:false,reason:'住宅ローン審査：月額返済が収入の45%を超えています。',payment};
 if(monthlyIncome===0&&f.cash<Math.ceil(price*.2)+payment*6)return {ok:false,reason:'住宅ローン審査：無収入の場合は頭金に加え6か月分の返済余力が必要です。',payment};
 return {ok:true,payment};
}
/** 満額24か月以上相当の加入実績から、納付記録に応じた受給額を計算する。 */
export function calculatePension(l){
 const months=Math.floor(Math.max(l.pensionCreditHalfUnits??0,(l.pensionMonths??0)*2)/2);
 if(months<120)return 0;
 return Math.max(0,Math.min(84000,60000+Math.floor(Math.max(0,months-240)/12)*1000));
}
/** 簡易医療保障と任意保障を分けた説明用の見積もり。 */
export function medicalCoverageSummary(l,base=5000){
 const subsidy=Math.min(base,Math.floor(base*.3));
 return {standard:base,publicSupport:subsidy,outOfPocket:base-subsidy,optionalBenefit:INSURANCE_PLANS[l.insurance]?.benefit??0};
}
/** 年度別の納付実績。旧データでは記録のある年度だけを表示する。 */
export function pensionHistoryByYear(l){
 const groups=new Map();
 for(const r of l?.pensionHistory??[]){
  const row=groups.get(r.year)??{year:r.year,paid:0,exempt:0,unpaid:0,backPaid:0};
  if(r.mode==='通常納付')row.paid++;
  else if(r.mode==='免除')row.exempt++;
  else if(r.mode==='未納')row.unpaid++;
  else if(r.mode==='追納')row.backPaid++;
  groups.set(r.year,row);
 }
 return [...groups.values()].sort((a,b)=>b.year-a.year);
}
/** 治療費を上限とする実費型オプションの見積もり。定額保障は従来どおり。 */
export function estimateInsuranceBenefit(l,base=5000){
 const medical=medicalCoverageSummary(l,base);
 return l?.insuranceClaimCap==='自己負担上限' ? Math.min(medical.outOfPocket,medical.optionalBenefit):medical.optionalBenefit;
}
/** 第33段階：保存データを変更しない会計照合。旧方式の債務は混合しない。 */
export function auditLivingAccounts(f){
 const l=f?.living;
 if(!l)return {ok:true,issues:[],summary:null};
 const issues=[];
 const unpaid=l.pensionUnpaidRecords?.length??0;
 if(unpaid>(l.pensionUnpaidMonths??0))issues.push('未納記録数が未納月数を超過しています');
 if((l.pensionBackPaidMonths??0)>(l.pensionContributions??0))issues.push('追納済み月数が加入記録を超過しています');
 if(l.housing!=='持ち家' && ((l.mortgageBalance??0)>0||(l.mortgageOverdueInterest??0)>0))issues.push('持ち家以外に住宅ローン債務が残っています');
 if((l.mortgageAccounting??'従来方式')==='実額方式'){
  if((l.mortgageArrears??0)<(l.mortgageOverdueInterest??0))issues.push('延滞残額より未払利息が大きくなっています');
  if((l.mortgageBalance??0)===0&&(l.mortgageOverdueInterest??0)>0)issues.push('元本完済後の未払利息が残っています');
 }
 return {ok:issues.length===0,issues,summary:{
  mortgagePrincipal:l.mortgageBalance??0,
  overdueInterest:l.mortgageOverdueInterest??0,
  arrears:l.mortgageArrears??0,
  outstandingPensionMonths:unpaid,
  pensionCreditMonths:(l.pensionCreditHalfUnits??(l.pensionMonths??0)*2)/2,
  medicalSubsidy:l.medicalSubsidyPaid??0,
  privateBenefits:l.insuranceBenefitPaid??0
 }};
}
export function getHousingEquity(l){return l?.housing==='持ち家' ? (l.propertyValue??0)-(l.mortgageBalance??0):0;}
export function mortgageSchedule(l,months=12){
 if(!l||l.housing!=='持ち家'||!(l.mortgageBalance>0))return [];
 const rows=[];let balance=l.mortgageBalance;
 for(let i=1;i<=Math.min(120,Math.max(0,months));i++){
  if(balance<=0)break;
  const interest=Math.floor(balance*.003);
  const payment=Math.min(balance+interest,Math.max(l.mortgagePayment??0,interest+1));
  const principal=payment-interest;
  balance-=principal;
  rows.push({month:i,payment,interest,principal,balance});
 }
 return rows;
}
export function ensureLiving(f){f.living??=createLivingData();return f.living;}
const validMoney=n=>Number.isSafeInteger(n)&&n>=0&&n<=100000000;
const findRegion=name=>REGIONS.find(r=>r.name===name);
const transfer=(f,date,label,amount,income=false)=>{
 if(!validMoney(amount))throw new Error('金額が不正です');
 if(income){f.cash+=amount;f.totals.income+=amount;}
 else {f.totals.expenses+=amount;const paid=Math.min(f.cash,amount);f.cash-=paid;f.debt+=amount-paid;}
 f.ledger.push({year:date.year,month:date.month,kind:income?'収入':'支出',label,amount:income?amount:-amount});
 if(f.ledger.length>600)f.ledger.shift();
};
export function livingAction(f,h,action,payload,context){
 const living=ensureMortgage(ensureLiving(f)),date=context.date,age=context.age;
 if(age<18)return {ok:false,reason:'住居変更・保険加入は18歳から利用できます。'};
 if(action==='moveHome'){
   const region=findRegion(payload.region),housing=payload.housing;
   if(!region||!['実家','賃貸','持ち家'].includes(housing))return {ok:false,reason:'居住地域または住居種別が不正です。'};
   if(living.region===region.name&&living.housing===housing)return {ok:false,reason:'現在と同じ住居です。'};
   const rent= housing==='賃貸'?region.rent:0;
   const home=HOME_OPTIONS.find(h=>h.id===(payload.homeType??'standard'));
   if(housing==='持ち家'&&!home)return {ok:false,reason:'物件の種類が不正です。'};
   const price=housing==='持ち家'?Math.round(region.rent*180*home.priceFactor):0;
   const fee=housing==='賃貸'?rent*2:housing==='持ち家'?Math.floor(price*.03):20000;
   const loanWanted=payload.loan===true && housing==='持ち家';
   const downPayment=loanWanted?Math.ceil(price*.2):price;
   const loanAmount=price-downPayment;
   if(loanWanted){const approval=assessMortgage(f,price,loanAmount);if(!approval.ok)return {ok:false,reason:approval.reason};}
   const cost=fee+downPayment;
   const oldDebt=living.mortgageBalance??0;
   const oldProceeds=living.housing==='持ち家'?Math.floor(living.propertyValue*.9)-oldDebt-(living.mortgageOverdueInterest??0):0;
   if(oldProceeds<0)return {ok:false,reason:'旧住居の売却代金では住宅ローンを完済できません。'};
   if(f.cash+oldProceeds<cost)return {ok:false,reason:`引越し・購入費用として${cost.toLocaleString('ja-JP')}円の資金が必要です。`};
   // 旧持ち家を売却する場合は、購入費用の前に資金化する。簡易評価額の90%。
   const proceeds=oldProceeds;
   if(f.cash+proceeds<cost)return {ok:false,reason:'引越し費用が不足しています。'};
   if(proceeds){f.cash+=proceeds;f.ledger.push({year:date.year,month:date.month,kind:'資産移動',label:'旧住居売却',amount:proceeds});if(f.ledger.length>600)f.ledger.shift();}
   transfer(f,date,'引越し・契約費用',fee);
   if(price) {f.cash-=downPayment;f.ledger.push({year:date.year,month:date.month,kind:'資産移動',label:loanWanted?'持ち家頭金':'持ち家購入',amount:-downPayment});if(f.ledger.length>600)f.ledger.shift();}
   living.region=region.name;living.housing=housing;living.homeType=housing==='持ち家'?home.id:'standard';living.rent=rent;living.propertyValue=price;
   living.mortgageArrears=0;living.mortgageOverdueInterest=0;living.mortgageAccounting='従来方式';living.mortgageCredit=70;living.mortgageLateMonths=0;living.mortgageHistory=[];living.propertyAgeMonths=0;living.mortgageBalance=loanAmount;living.mortgageMonths=loanWanted?360:0;
   living.mortgagePayment=loanWanted?Math.ceil(loanAmount*0.003/(1-Math.pow(1.003,-360))):0;
   living.monthlyHousingCost=housing==='賃貸'?rent:housing==='持ち家'?Math.round(region.rent*.12*home.maintenanceFactor):0;
   living.moves.push({year:date.year,month:date.month,region:region.name,housing,cost});
   if(living.moves.length>80)living.moves.shift();
   return {ok:true,message:`${region.name}の${housing}へ引越しました。`};
 }
 if(action==='requestPensionExemption'){
   const monthlyIncome=(f.career?.monthlySalary??0)+(f.sideJob?.active?(f.sideJob.monthlyIncome??0):0);
   if(age>=65)return {ok:false,reason:'65歳以降は免除申請できません。'};
   if(monthlyIncome>120000)return {ok:false,reason:'月額収入が12万円を超えるため簡易免除の対象外です。'};
   living.pensionMode='免除';living.pensionExemptionApplications++;
   return {ok:true,message:'所得条件を確認し、翌月以降の年金保険料を免除しました。'};
 }
 if(action==='setInsuranceClaimCap'){
   if(!['定額','自己負担上限'].includes(payload.mode))return {ok:false,reason:'保険給付方式が不正です。'};
   living.insuranceClaimCap=payload.mode;
   return {ok:true,message:`保険給付方式を「${payload.mode}」に変更しました。`};
 }
 if(action==='enableAccurateMortgage'){
   if(living.housing!=='持ち家'||living.mortgageBalance<=0)return {ok:false,reason:'切替対象の住宅ローンがありません。'};
   if(living.mortgageArrears>0)return {ok:false,reason:'従来方式での延滞を解消してから切り替えてください。'};
   if(living.mortgageAccounting==='実額方式')return {ok:false,reason:'すでに実額方式です。'};
   living.mortgageAccounting='実額方式';living.mortgageOverdueInterest=0;
   return {ok:true,message:'住宅ローンを実額方式に変更しました。元本は実際の返済額に応じて減少します。'};
 }
 if(action==='setPensionMode'){
   if(!['通常納付','免除','未納'].includes(payload.mode))return {ok:false,reason:'年金の納付区分が不正です。'};
   if(age>=65)return {ok:false,reason:'65歳以降は年金納付区分を変更できません。'};
   living.pensionMode=payload.mode;
   return {ok:true,message:`年金の納付区分を「${payload.mode}」へ変更しました。`};
 }
 if(action==='backPayPension'){
   const months=payload.months;
   if(!Number.isSafeInteger(months)||months<1||months>12||months>living.pensionUnpaidRecords.length)return {ok:false,reason:'追納月数は未納記録の範囲で1～12か月を指定してください。'};
   const amount=months*4000;
   if(f.cash<amount)return {ok:false,reason:'追納する現金が不足しています。'};
   f.cash-=amount;f.totals.expenses+=amount;living.pensionPremiumPaid+=amount;
   living.pensionBackPaidMonths+=months;living.pensionMonths+=months;living.pensionCreditHalfUnits+=months*2;
   living.pensionUnpaidMonths-=months;const cleared=living.pensionUnpaidRecords.splice(0,months);for(const r of cleared)living.pensionHistory.push({year:date.year,month:date.month,mode:'追納',targetYear:r.year,targetMonth:r.month});if(living.pensionHistory.length>600)living.pensionHistory.splice(0,living.pensionHistory.length-600);
   f.ledger.push({year:date.year,month:date.month,kind:'支出',label:'簡易年金の追納',amount:-amount});if(f.ledger.length>600)f.ledger.shift();
   return {ok:true,message:`${months}か月分の年金保険料を追納しました。`};
 }
 if(action==='repayMortgage'){
   if(living.housing!=='持ち家'||living.mortgageBalance===0)return {ok:false,reason:'返済する住宅ローンがありません。'};
   const amount=payload.amount;
   if(!Number.isSafeInteger(amount)||amount<=0||amount>living.mortgageBalance||amount>f.cash)return {ok:false,reason:'返済額または現金残高が不正です。'};
   living.mortgageBalance-=amount;f.cash-=amount;
   f.ledger.push({year:date.year,month:date.month,kind:'資産移動',label:'住宅ローン繰上返済',amount:-amount});
   if(f.ledger.length>600)f.ledger.shift();
   if(!living.mortgageBalance){living.mortgagePayment=0;living.mortgageMonths=0;}
   return {ok:true,message:'住宅ローンを繰上返済しました。'};
 }
 if(action==='clearMortgageArrears'){
   const amount=payload.amount;
   if(!Number.isSafeInteger(amount)||amount<=0||amount>living.mortgageArrears||amount>f.cash)return {ok:false,reason:'延滞解消額または現金残高が不正です。'};
   // 実額方式では未払い利息→未返済元本の順に充当する。
   if(living.mortgageAccounting==='実額方式'){const toInterest=Math.min(amount,living.mortgageOverdueInterest);living.mortgageOverdueInterest-=toInterest;living.mortgageBalance=Math.max(0,living.mortgageBalance-(amount-toInterest));}
   f.cash-=amount;if(living.mortgageAccounting!=='実額方式')f.debt=Math.max(0,f.debt-amount);
   living.mortgageArrears-=amount;living.mortgageArrearsPaid+=amount;
   if(!living.mortgageArrears){living.mortgageLateMonths=0;living.mortgageCredit=Math.min(100,living.mortgageCredit+2);}
   f.ledger.push({year:date.year,month:date.month,kind:'資産移動',label:'住宅ローン延滞分の清算',amount:-amount});
   if(f.ledger.length>600)f.ledger.shift();
   return {ok:true,message:'住宅ローンの延滞分を清算しました。'};
 }
 if(action==='repairHome'){
   if(living.housing!=='持ち家')return {ok:false,reason:'持ち家だけ修繕できます。'};
   if(living.propertyValue<=0)return {ok:false,reason:'住宅評価額がありません。'};
   const cost=50000;
   if(f.cash<cost)return {ok:false,reason:'修繕費用の現金が不足しています。'};
   transfer(f,date,'住宅修繕費',cost);
   living.propertyValue=Math.min(100000000,living.propertyValue+30000);
   living.repairCount++;
   return {ok:true,message:'住宅を修繕しました。住宅評価額が一部回復しました。'};
 }
 if(action==='setInsurance'){
   if(!Object.hasOwn(INSURANCE_PLANS,payload.plan))return {ok:false,reason:'保障プランが不正です。'};
   if(living.insurance===payload.plan)return {ok:false,reason:'現在と同じ保障プランです。'};
   living.insurance=payload.plan;return {ok:true,message:`保障を「${payload.plan}」に変更しました。`};
 }
 if(action==='claimInsurance'){
   if(living.insurance==='未加入'||!h.illness)return {ok:false,reason:'給付の対象となる病気または加入保障がありません。'};
   // 同じ継続中の病気については、発症年月をキーにして二重請求を防ぐ。
   const current=date.year*12+date.month-1;
   const key=String(current-(h.illness.months??0));
   if(living.lastClaimKey===key)return {ok:false,reason:'この病気の給付は受領済みです。'};
   const benefit=estimateInsuranceBenefit(living);
   if(benefit<=0)return {ok:false,reason:'この保障の給付対象となる金額がありません。'};
   transfer(f,date,'簡易保険給付',benefit,true);
   living.lastClaimKey=key;living.insuranceBenefitPaid+=benefit;
   living.claims.push({year:date.year,month:date.month,amount:benefit,key});
   if(living.claims.length>80)living.claims.shift();
   return {ok:true,message:`簡易保険給付${benefit.toLocaleString('ja-JP')}円を受け取りました。`};
 }
 return {ok:false,reason:'未対応の住居・保障操作です。'};
}
export function advanceLiving(f,date,age){
 const living=ensureMortgage(ensureLiving(f));
 if(age<18)return;
 if(living.housing==='持ち家'&&living.mortgageBalance>0){
   const interest=Math.floor(living.mortgageBalance*.003);
   const payment=Math.min(living.mortgageBalance+interest,Math.max(living.mortgagePayment,interest+1));
   const principal=payment-interest;
   const accurate=living.mortgageAccounting==='実額方式';
   const affordable=Math.min(f.cash,payment);
   const shortage=payment-affordable;
   if(accurate){
     const interestPaid=Math.min(affordable,interest);
     living.mortgageOverdueInterest+=interest-interestPaid;
     living.mortgageBalance-=Math.max(0,affordable-interestPaid);
     f.cash-=affordable;
     f.totals.expenses+=interestPaid;
     f.ledger.push({year:date.year,month:date.month,kind:'資産移動',label:'住宅ローン実額返済',amount:-affordable});
     if(f.ledger.length>600)f.ledger.shift();
   }else{
     living.mortgageBalance-=principal;
     transfer(f,date,'住宅ローン返済',payment);
   }
   living.mortgageMonths=Math.max(0,living.mortgageMonths-1);
   living.mortgageArrears=Math.min(100000000,living.mortgageArrears+shortage);
   living.mortgageLateMonths=shortage?Math.min(10000,living.mortgageLateMonths+1):(living.mortgageArrears>0?living.mortgageLateMonths:0);
   living.mortgageCredit=Math.max(0,Math.min(100,living.mortgageCredit+(shortage?-3:living.mortgageArrears===0?1:0)));
   living.mortgageHistory.push({year:date.year,month:date.month,scheduled:payment,paid:affordable,shortage,balance:living.mortgageBalance});
   if(living.mortgageHistory.length>60)living.mortgageHistory.shift();
   if(!living.mortgageBalance){living.mortgagePayment=0;living.mortgageMonths=0;}
 }
 if(living.housing==='持ち家'){
   living.propertyAgeMonths=Math.min(10000,living.propertyAgeMonths+1);
   // 1年ごとに簡易的な定期維持費を計上。通常の月額住宅維持費とは別の修繕積立支出。
   if(living.propertyAgeMonths%12===0){const maintenance=12000;transfer(f,date,'住宅定期維持費',maintenance);living.homeMaintenancePaid+=maintenance;}
   // 地域別の架空の価格変動。月次の小幅な変化を確定的に適用する。
   const regionGrowth={'東京・東京23区':0.0001,'埼玉・さいたま':0.00005,'大阪・大阪':0.00004}[living.region]??-0.00015;
   living.propertyValue=Math.max(1,Math.min(100000000,Math.round(living.propertyValue*(1+regionGrowth-0.0001))));
 }
 if(age<65){
   living.pensionContributions=Math.min(10000,living.pensionContributions+1);
   const monthMode=living.pensionMode;living.pensionHistory.push({year:date.year,month:date.month,mode:monthMode});if(living.pensionHistory.length>600)living.pensionHistory.shift();
   if(living.pensionMode==='免除'){
     living.pensionExemptMonths++;living.pensionCreditHalfUnits+=1;
   }else if(living.pensionMode==='未納'){
     living.pensionUnpaidMonths++;
     living.pensionUnpaidRecords.push({year:date.year,month:date.month});
     if(living.pensionUnpaidRecords.length>480)living.pensionUnpaidRecords.shift();
   }else{
     living.pensionMonths=Math.min(10000,living.pensionMonths+1);
     living.pensionCreditHalfUnits+=2;
     const premium=4000;transfer(f,date,'簡易年金保険料',premium);living.pensionPremiumPaid+=premium;
   }
 }
 if(age>=65 && calculatePension(living)>0){
   const pension=calculatePension(living);
   transfer(f,date,'簡易老齢年金',pension,true);
   living.pensionPaid+=pension;
 }
 const factor=REGIONAL_FACTORS[living.region]?.living??1;
 const regionalAdjustment=Math.round(f.monthlyBudget*(factor-1));
 if(regionalAdjustment>0)transfer(f,date,'地域生活費補正',regionalAdjustment);
 if(regionalAdjustment<0)transfer(f,date,'地域生活費差額',-regionalAdjustment,true);
 if(living.monthlyHousingCost)transfer(f,date,'住居費',living.monthlyHousingCost);
 const premium=INSURANCE_PLANS[living.insurance]?.premium??0;
 if(premium)transfer(f,date,'任意保険料',premium);
}
export function validateLiving(l){
 if(l===undefined)return true; // 第26段階以前のセーブとの互換性
 if(!l||!findRegion(l.region)||!['実家','賃貸','持ち家'].includes(l.housing)||!Object.hasOwn(INSURANCE_PLANS,l.insurance))return false;
 if(l.homeType!==undefined&&!HOME_OPTIONS.some(h=>h.id===l.homeType))return false;
 if(!['rent','propertyValue','monthlyHousingCost'].every(k=>validMoney(l[k])))return false;
 if(l.housing==='実家'&&(l.rent!==0||l.monthlyHousingCost!==0||l.propertyValue!==0))return false;
 if(l.housing==='賃貸'&&(l.rent!==l.monthlyHousingCost||l.propertyValue!==0))return false;
 if(l.housing==='持ち家'&&l.rent!==0)return false;
 for(const k of ['mortgageBalance','mortgagePayment','mortgageMonths','pensionMonths','pensionPaid','mortgageArrears','mortgageLateMonths','propertyAgeMonths','repairCount','pensionContributions','medicalSubsidyPaid','mortgageArrearsPaid','homeMaintenancePaid','pensionPremiumPaid','insuranceBenefitPaid','pensionExemptMonths','pensionUnpaidMonths','pensionBackPaidMonths','pensionCreditHalfUnits','mortgageRejectedApplications','mortgageOverdueInterest','pensionExemptionApplications'])if(l[k]!==undefined&&!validMoney(l[k]))return false;
 if(l.mortgageAccounting!==undefined&&!['従来方式','実額方式'].includes(l.mortgageAccounting))return false;
 if(l.insuranceClaimCap!==undefined&&!['定額','自己負担上限'].includes(l.insuranceClaimCap))return false;
 if(l.pensionHistory!==undefined&&(!Array.isArray(l.pensionHistory)||l.pensionHistory.length>600||!l.pensionHistory.every(r=>r&&Number.isInteger(r.year)&&r.year>=2000&&r.year<=2200&&Number.isInteger(r.month)&&r.month>=1&&r.month<=12&&['通常納付','免除','未納','追納'].includes(r.mode))))return false;
 if(l.pensionMode!==undefined&&!['通常納付','免除','未納'].includes(l.pensionMode))return false;
 if(l.pensionUnpaidRecords!==undefined&&(!Array.isArray(l.pensionUnpaidRecords)||l.pensionUnpaidRecords.length>480||!l.pensionUnpaidRecords.every(r=>r&&Number.isInteger(r.year)&&r.year>=2000&&r.year<=2200&&Number.isInteger(r.month)&&r.month>=1&&r.month<=12)||l.pensionUnpaidRecords.length>(l.pensionUnpaidMonths??0)))return false;
 if(l.mortgageCredit!==undefined&&(!Number.isInteger(l.mortgageCredit)||l.mortgageCredit<0||l.mortgageCredit>100))return false;
 if(l.mortgageHistory!==undefined&&(!Array.isArray(l.mortgageHistory)||l.mortgageHistory.length>60||!l.mortgageHistory.every(r=>r&&Number.isInteger(r.year)&&r.year>=2000&&r.year<=2200&&Number.isInteger(r.month)&&r.month>=1&&r.month<=12&&['scheduled','paid','shortage','balance'].every(k=>validMoney(r[k]))&&r.paid+r.shortage===r.scheduled)))return false;
 if(l.housing!=='持ち家'&&(l.mortgageBalance??0)!==0)return false;
 // 住宅価格が下落した場合の担保割れは有効なゲーム状態。売却時に残債を確認する。
 if(l.lastClaimKey!==null&&(typeof l.lastClaimKey!=='string'||!/^[0-9]{1,6}$/.test(l.lastClaimKey)))return false;
 if(!Array.isArray(l.moves)||l.moves.length>80||!l.moves.every(m=>m&&Number.isInteger(m.year)&&m.year>=2000&&m.year<=2200&&Number.isInteger(m.month)&&m.month>=1&&m.month<=12&&!!findRegion(m.region)&&['実家','賃貸','持ち家'].includes(m.housing)&&validMoney(m.cost)))return false;
 return Array.isArray(l.claims)&&l.claims.length<=80&&l.claims.every(c=>c&&Number.isInteger(c.year)&&c.year>=2000&&c.year<=2200&&Number.isInteger(c.month)&&c.month>=1&&c.month<=12&&validMoney(c.amount)&&typeof c.key==='string'&&/^[0-9]{1,6}$/.test(c.key));
}
