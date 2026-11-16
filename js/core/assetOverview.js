/** U4: Read-only personal balance sheet and cash-flow baseline.
 * This is a projection, never a mutation or a prediction of prices/returns.
 * Business operating money remains outside the player's household cash flow.
 */
import {estateBreakdown} from './estateSystems.js';
import {INSURANCE_PLANS,REGIONAL_FACTORS,calculatePension} from './livingSystems.js';
import {VEHICLE_OPTIONS,livingExpenseWithHardship,lateCareerWageFactor} from './economySystems.js';
import {eraEconomicEffects} from './eraSystems.js';
import {MONTHLY_PLANS} from './monthlyRoutines.js';
const nonnegative=n=>Number.isFinite(n)?Math.max(0,Math.round(n)):0;
const floor=n=>Math.floor(nonnegative(n));
const total=a=>a.reduce((sum,n)=>sum+nonnegative(n),0);
const yen=n=>`${Math.round(n).toLocaleString('ja-JP')}円`;
function loanDue(principal,payment){
 if(!principal)return 0;
 const interest=Math.floor(principal*.003);
 return Math.min(principal+interest,Math.max(payment||0,interest+1));
}
export function cashflowBaseline(state){
 const f=state?.finances,l=f?.living??{},age=state?.timeline?.ageYears??0;
 if(!f||age<18)return {available:false};
 const era=eraEconomicEffects(state.world);
 const wage= f.career?.job?nonnegative(f.career.monthlySalary*era.wage*lateCareerWageFactor(age)):0;
 const side=f.sideJob?.active?nonnegative(f.sideJob.monthlyIncome):0;
 const rent=total((l.properties??[]).filter(p=>p.use==='賃貸運用').map(p=>p.rentIncome));
 const pension=age>=65?nonnegative(calculatePension(l)):0;
 const benefit=(!f.career?.job&&f.career?.previousSalary>0&&f.career?.benefitEligible!==false&&(f.career?.benefitMonths??0)<6)
   ?Math.min(100000,Math.floor(f.career.previousSalary*.5)):0;
 const income=wage+side+rent+pension+benefit;
 const salaryTax=Math.floor((wage+side)*.10);
 const base=nonnegative(livingExpenseWithHardship(f,age,era.living));
 const regional=Math.round(nonnegative(f.monthlyBudget)*((REGIONAL_FACTORS[l.region]?.living??1)-1));
 const householdCost=Math.max(0,base+regional);
 const housing=nonnegative(l.monthlyHousingCost);
 const insurance=nonnegative(INSURANCE_PLANS[l.insurance]?.premium);
 const pensionPremium=age<65&&l.pensionMode!=='免除'&&l.pensionMode!=='未納'?4000:0;
 const vehicles=total([f.vehicle,...(f.vehicles??[])].filter(Boolean).map(v=>VEHICLE_OPTIONS.find(x=>x.id===v.id)?.monthlyCost));
 const propertyMaintenance=total((l.properties??[]).map(p=>p.monthlyCost));
 const homeRepairReserve=l.housing==='持ち家'?1000:0; // yearly 12,000, averaged across 12 months
 const rentalTaxReserve=total((l.properties??[]).map(p=>Math.floor(nonnegative(p.value)*.0005/12)));
 const mortgage=loanDue(nonnegative(l.mortgageBalance),nonnegative(l.mortgagePayment));
 const propertyLoans=total((l.properties??[]).map(p=>loanDue(nonnegative(p.loanBalance),nonnegative(p.loanPayment))));
 const routines=total(Object.entries(state.monthlyRoutines?.plans??{}).map(([key,id])=>MONTHLY_PLANS[key]?.find(x=>x.id===id)?.cost));
 const parts=[
  {label:'基本生活費・地域補正',amount:householdCost},
  {label:'家賃・住宅の維持費',amount:housing+homeRepairReserve},
  {label:'住宅・物件ローン返済',amount:mortgage+propertyLoans},
  {label:'車両維持費',amount:vehicles},
  {label:'投資物件の維持費・年次費用引当',amount:propertyMaintenance+rentalTaxReserve},
  {label:'任意保険・年金保険料',amount:insurance+pensionPremium},
  {label:'継続習慣の月額費用',amount:routines},
  {label:'給与・副業の簡易税負担',amount:salaryTax},
 ];
 const outflow=total(parts.map(p=>p.amount));
 const net=income-outflow;
 return {available:true,income,outflow,net,parts,
  incomes:[['本業給与',wage],['副業',side],['投資物件の賃料',rent],['年金・失業給付',pension+benefit]],
  mortgagePayment:mortgage+propertyLoans,liquidCash:nonnegative(f.cash),
  // Treat prices, wages, property occupancy and loan installments as constant.
  // No investment returns, salary raises or business revenue are assumed.
  forecast:[1,3,12].map(months=>({months,estimatedCash:Math.max(0,Math.round(f.cash+net*months)),
   balance:Math.round(f.cash+net*months)})),
  runway:net>=0?null:Math.floor(nonnegative(f.cash)/Math.abs(net)),
  assumptions:'今の収入・固定支出が変わらない場合の概算です。税・学費・病気・空室・相場・景気・金利・臨時出費・将来の返済完了は予測しません。',
 };
}
export function assetOverview(state){
 if(!state?.initialized)return null;
 const f=state.finances,l=f.living??{},estate=estateBreakdown(f);
 const householdLoans=nonnegative(f.debt)+nonnegative(estate.mortgage);
 const propertyCount=(l.housing==='持ち家'?1:0)+(l.properties?.length??0);
 const cars=[f.vehicle,...(f.vehicles??[])].filter(Boolean);
 return {
  assets:estate.grossAssets,debts:estate.liabilities,netWorth:estate.netAssets,
  cash:nonnegative(f.cash),investment:nonnegative(f.investment),
  propertyValue:estate.home,vehicleValue:nonnegative(estate.vehicle),
  propertyCount,vehicleCount:cars.length,personalDebt:householdLoans,
  businessAssets:nonnegative(estate.businessCash)+nonnegative(estate.businessEquipment),
  businessLiabilities:nonnegative(estate.businessDebt)+nonnegative(estate.businessLoans),
  monthly:cashflowBaseline(state)
 };
}
