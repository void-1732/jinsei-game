/** In-game real-estate ledger, not legal registration or real market prices. */
import {REGIONS,HOME_OPTIONS,assessMortgage} from './livingSystems.js';
export const PROPERTY_LIMIT=5;
const validAmount=n=>Number.isSafeInteger(n)&&n>=0&&n<=100000000;
const push=(f,date,label,amount,kind='資産移動')=>{
 f.ledger.push({year:date.year,month:date.month,kind,label,amount});
 if(f.ledger.length>600)f.ledger.shift();
};
const regionOf=name=>REGIONS.find(r=>r.name===name);
const homeOf=id=>HOME_OPTIONS.find(h=>h.id===id);
export const propertyPrice=(region,type)=>{
 const r=regionOf(region),h=homeOf(type);
 return r&&h?Math.round(r.rent*180*h.priceFactor):null;
};
export const mortgageInstallment=(balance,months=360,rate=.003)=>{
 if(!balance)return 0;
 return Math.ceil(balance*rate/(1-Math.pow(1+rate,-months)));
};
export function ensurePropertyPortfolio(living){
 living.properties??=[];
 living.nextPropertyId??=Math.max(1,...living.properties.map(p=>p.id+1));
 return living;
}
export function propertyCount(living){
 return (living?.housing==='持ち家'?1:0)+(living?.properties?.length??0);
}
export function portfolioTotals(living){
 const assets=living?.properties??[];
 return {
  count:propertyCount(living),assetValue:assets.reduce((a,x)=>a+x.value,0),
  loanBalance:assets.reduce((a,x)=>a+x.loanBalance,0),
  arrears:assets.reduce((a,x)=>a+x.arrears,0),
  monthlyIncome:assets.reduce((a,x)=>a+(x.use==='賃貸運用'?x.rentIncome:0),0),
  monthlyCost:assets.reduce((a,x)=>a+x.monthlyCost,0),
 };
}
export const createRegistration=(id,date)=>({
 registryId:id,owner:'本人',registeredYear:date.year,
 registeredMonth:date.month,status:'ゲーム内登記済み'
});
export function propertyAction(f,action,payload={},context={}){
 const living=ensurePropertyPortfolio(f.living),date=context.date,age=context.age;
 if(age<18)return {ok:false,reason:'不動産の操作は18歳から利用できます。'};
 if(action==='registerHome'){
  if(living.housing!=='持ち家')return {ok:false,reason:'登記できる自宅がありません。'};
  if(living.primaryRegistration)return {ok:false,reason:'自宅はゲーム内台帳に登録済みです。'};
  living.primaryRegistration=createRegistration('GAME-H-000',date);
  push(f,date,'自宅のゲーム内登記',0,'記録');
  return {ok:true,message:'自宅をゲーム内不動産台帳へ登録しました。'};
 }
 if(action==='buyProperty'){
  if(propertyCount(living)>=PROPERTY_LIMIT)return {ok:false,reason:'所有物件は自宅を含め最大5件までです。'};
  const price=propertyPrice(payload.region,payload.homeType);
  if(price===null)return {ok:false,reason:'地域または物件の種類が不正です。'};
  if(!['賃貸運用','別荘'].includes(payload.use))return {ok:false,reason:'物件の用途を選択してください。'};
  const loan=payload.loan===true,head=loan?Math.ceil(price*.2):price;
  const fee=Math.floor(price*.03);
  if(f.cash<head+fee)return {ok:false,reason:`頭金・物件費用・諸費用の合計${(head+fee).toLocaleString('ja-JP')}円が不足しています。`};
  const principal=loan?price-head:0;
  if(loan){
   const approved=assessMortgage(f,price,principal);
   if(!approved.ok)return {ok:false,reason:approved.reason};
   const monthlyIncome=(f.career?.monthlySalary??0)+(f.sideJob?.active?(f.sideJob.monthlyIncome??0):0);
   const existing=(living.housing==='持ち家'?living.mortgagePayment:0)+living.properties.reduce((a,p)=>a+p.loanPayment,0);
   if(monthlyIncome>0&&existing+approved.payment>monthlyIncome*.5)
    return {ok:false,reason:'保有する住宅ローン全体の月額返済が給与の50%を超えます。'};
  }
  const id=living.nextPropertyId++,region=regionOf(payload.region),home=homeOf(payload.homeType);
  const item={id,region:region.name,homeType:home.id,use:payload.use,
   acquisitionPrice:price,value:price,ageMonths:0,
   loanBalance:principal,loanPayment:mortgageInstallment(principal),arrears:0,
   monthlyCost:Math.round(region.rent*.12*home.maintenanceFactor),
   rentIncome:Math.round(region.rent*.8),registration:createRegistration(`GAME-P-${String(id).padStart(4,'0')}`,date),
   purchasedYear:date.year,purchasedMonth:date.month};
  f.cash-=head+fee;f.totals.expenses+=fee;
  push(f,date,`不動産${id}の取得・頭金`,-head);
  push(f,date,`不動産${id}の取得諸費用`,-fee,'支出');
  living.properties.push(item);
  return {ok:true,message:`${region.name}に${home.name}を取得しました（所有${propertyCount(living)}/5件）。ゲーム内登記を作成しました。`};
 }
 const item=living.properties.find(x=>x.id===payload.id);
 if(!item)return {ok:false,reason:'対象の所有物件を選択してください。'};
 if(action==='setPropertyUse'){
  if(!['賃貸運用','別荘'].includes(payload.use)||item.use===payload.use)return {ok:false,reason:'変更先の用途を選択してください。'};
  item.use=payload.use;push(f,date,`物件${item.id}の用途変更`,0,'記録');
  return {ok:true,message:`物件${item.id}の用途を${item.use}に変更しました。`};
 }
 if(action==='setPropertyPayment'){
  const amount=payload.amount,interest=Math.floor(item.loanBalance*.003);
  if(!item.loanBalance||!Number.isSafeInteger(amount)||amount<=interest||amount>1000000)
   return {ok:false,reason:`月額返済額は利息${interest.toLocaleString('ja-JP')}円より大きく、100万円以下で設定してください。`};
  item.loanPayment=amount;push(f,date,`物件${item.id}の月額返済設定`,0,'記録');
  return {ok:true,message:`物件${item.id}の毎月の返済を${amount.toLocaleString('ja-JP')}円にしました。`};
 }
 if(action==='repayPropertyLoan'){
  const amount=payload.amount;
  if(!validAmount(amount)||amount===0||amount>item.loanBalance||amount>f.cash)return {ok:false,reason:'繰上返済額は未返済元本と現金残高以内で指定してください。'};
  item.loanBalance-=amount;f.cash-=amount;
  if(!item.loanBalance)item.loanPayment=0;
  push(f,date,`物件${item.id}のローン繰上返済`,-amount);
  return {ok:true,message:`物件${item.id}のローンを${amount.toLocaleString('ja-JP')}円繰上返済しました。`};
 }
 if(action==='clearPropertyArrears'){
  const amount=payload.amount;
  if(!validAmount(amount)||amount===0||amount>item.arrears||amount>f.cash)return {ok:false,reason:'延滞額と現金残高を確認してください。'};
  item.arrears-=amount;f.cash-=amount;f.totals.expenses+=amount;
  push(f,date,`物件${item.id}のローン延滞解消`,-amount,'支出');
  return {ok:true,message:`物件${item.id}の延滞を${amount.toLocaleString('ja-JP')}円清算しました。`};
 }
 if(action==='sellProperty'){
  const proceeds=Math.floor(item.value*.9);
  if(proceeds<item.loanBalance+item.arrears)return {ok:false,reason:'売却見込額ではローン残高・延滞を完済できません。'};
  f.cash+=proceeds-item.loanBalance-item.arrears;
  push(f,date,`不動産${item.id}の売却・債務精算`,proceeds-item.loanBalance-item.arrears);
  living.properties=living.properties.filter(p=>p.id!==item.id);
  return {ok:true,message:`物件${item.id}を売却し、ローン精算後の${(proceeds-item.loanBalance-item.arrears).toLocaleString('ja-JP')}円を受け取りました。`};
 }
 return {ok:false,reason:'未対応の不動産操作です。'};
}
export function advanceProperties(f,date){
 const l=ensurePropertyPortfolio(f.living);
 for(const p of l.properties){
  p.ageMonths=Math.min(10000,p.ageMonths+1);
  if(p.use==='賃貸運用'){
   f.cash+=p.rentIncome;f.totals.income+=p.rentIncome;
   push(f,date,`物件${p.id}の賃料収入`,p.rentIncome,'収入');
  }
  const cost=p.monthlyCost+(p.ageMonths%12===0?Math.floor(p.value*.0005):0);
  const cashSpent=Math.min(f.cash,cost);f.cash-=cashSpent;f.debt+=cost-cashSpent;
  f.totals.expenses+=cost;push(f,date,`物件${p.id}の維持費・税相当`,-cost,'支出');
  if(p.loanBalance>0){
   const interest=Math.floor(p.loanBalance*.003);
   const payment=Math.min(p.loanBalance+interest,Math.max(p.loanPayment,interest+1));
   const paid=Math.min(f.cash,payment);
   const interestPaid=Math.min(paid,interest);
   f.cash-=paid;f.totals.expenses+=interestPaid;
   p.loanBalance=Math.max(0,p.loanBalance-(paid-interestPaid));
   // Only unpaid interest becomes arrears; unpaid principal stays in loanBalance.
   // This prevents charging missed principal a second time when arrears are cleared.
   p.arrears=Math.min(100000000,p.arrears+interest-interestPaid);
   push(f,date,`物件${p.id}の住宅ローン返済`,-paid);
   if(!p.loanBalance)p.loanPayment=0;
  }
  const growth={'東京・東京23区':.0001,'埼玉・さいたま':.00005,'大阪・大阪':.00004}[p.region]??-.00015;
  p.value=Math.max(1,Math.min(100000000,Math.round(p.value*(1+growth-.0001))));
 }
}
export function validatePropertyPortfolio(l){
 if(l.properties!==undefined){
  if(!Array.isArray(l.properties)||l.properties.length>PROPERTY_LIMIT||propertyCount(l)>PROPERTY_LIMIT)return false;
  const seen=new Set();
  for(const p of l.properties){
   if(!p||!Number.isSafeInteger(p.id)||p.id<1||p.id>1000000||seen.has(p.id))return false;
   seen.add(p.id);
   if(!regionOf(p.region)||!homeOf(p.homeType)||!['賃貸運用','別荘'].includes(p.use))return false;
   if(!['acquisitionPrice','value','loanBalance','loanPayment','arrears','monthlyCost','rentIncome'].every(k=>validAmount(p[k])))return false;
   if(!Number.isInteger(p.ageMonths)||p.ageMonths<0||p.ageMonths>10000)return false;
   if(!Number.isInteger(p.purchasedYear)||p.purchasedYear<2000||p.purchasedYear>2200||!Number.isInteger(p.purchasedMonth)||p.purchasedMonth<1||p.purchasedMonth>12)return false;
   if(!validRegistration(p.registration)||p.loanBalance===0&&p.loanPayment!==0)return false;
  }
 }
 if(l.primaryRegistration!==undefined&&l.primaryRegistration!==null&&!validRegistration(l.primaryRegistration))return false;
 if(l.nextPropertyId!==undefined&&(!Number.isSafeInteger(l.nextPropertyId)||l.nextPropertyId<=Math.max(0,...(l.properties??[]).map(x=>x.id))||l.nextPropertyId>1000000))return false;
 return true;
}
function validRegistration(r){return Boolean(r&&typeof r.registryId==='string'&&/^GAME-[HP]-[0-9]{3,6}$/.test(r.registryId)&&r.owner==='本人'&&r.status==='ゲーム内登記済み'&&Number.isInteger(r.registeredYear)&&r.registeredYear>=2000&&r.registeredYear<=2200&&Number.isInteger(r.registeredMonth)&&r.registeredMonth>=1&&r.registeredMonth<=12);}
