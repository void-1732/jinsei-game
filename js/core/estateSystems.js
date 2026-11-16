/** 第36段階：死亡時の財産明細。年金受給権・過去の年金受取額は資産化しない。
 * 住宅ローン未払利息は、個人借入金に計上済みの延滞額と重複させない。
 * 実在の日本の相続税制度・法定相続分を表すものではない。 */
import {calculatePension} from './livingSystems.js';
const amount = n => Number.isSafeInteger(n) && n >= 0 ? n : 0;
export function estateBreakdown(finances){
  const f=finances??{}, l=f.living??{}, b=f.business??{};
  const home=l.housing==='持ち家'?amount(l.propertyValue):0;
  const mortgage=l.housing==='持ち家'?amount(l.mortgageBalance):0;
  // 事業を所有する場合のみ事業口座、設備と債務を引き継ぐ。廃業済みの資金は個人会計に清算済み。
  const ownsBusiness=Boolean(b.active);
  const entries={cash:amount(f.cash),investments:amount(f.investment),home,vehicle:amount(f.vehicle?.value),
    businessCash:ownsBusiness?amount(b.operatingCash):0,
    businessEquipment:ownsBusiness?amount(b.equipmentValue):0,
    personalDebt:amount(f.debt),mortgage,
    businessDebt:ownsBusiness?amount(b.operatingDebt):0,
    businessLoans:ownsBusiness?amount(b.loanBalance):0};
  const grossAssets=entries.cash+entries.investments+entries.home+entries.vehicle+entries.businessCash+entries.businessEquipment;
  const liabilities=entries.personalDebt+entries.mortgage+entries.businessDebt+entries.businessLoans;
  const netAssets=grossAssets-liabilities;
  return {...entries,grossAssets,liabilities,netAssets,distributableBase:Math.max(0,netAssets),
    estimatedMonthlyPension:calculatePension(l)};
}
export function calculateInheritance(finances,people=[]){
 const breakdown=estateBreakdown(finances);
 const net=breakdown.distributableBase;
 const tax=Math.floor(net*.1);const distributed=net-tax;
 const family=people.filter(p=>p.role==='配偶者'||p.role==='子');
 const heirs=(family.length?family:people.filter(p=>p.role==='父'||p.role==='母'))
  .map(p=>({id:p.id,name:p.name}));
 const allocations=heirs.map((p,i)=>({...p,amount:Math.floor(distributed/heirs.length)+(i===0?distributed%heirs.length:0)}));
 return {netAssets:net,simplifiedTax:tax,distributed,heirs:allocations,breakdown};
}
/** 保存・ロード後の読み取り専用検証。旧保存では breakdown が省略可能。 */
export function validateInheritance(inheritance){
 if(!inheritance || typeof inheritance!=='object')return false;
 const money=v=>Number.isSafeInteger(v)&&v>=0&&v<=1e12;
 if(!['netAssets','simplifiedTax','distributed'].every(k=>money(inheritance[k])))return false;
 if(inheritance.simplifiedTax+inheritance.distributed!==inheritance.netAssets)return false;
 if(!Array.isArray(inheritance.heirs)||inheritance.heirs.length>100||!inheritance.heirs.every(h=>h&&typeof h.id==='string'&&typeof h.name==='string'&&money(h.amount)))return false;
 if(inheritance.heirs.length&&inheritance.heirs.reduce((n,h)=>n+h.amount,0)!==inheritance.distributed)return false;
 if(inheritance.breakdown!==undefined){
  const b=inheritance.breakdown;
  if(!b||!['cash','investments','home','businessCash','businessEquipment','personalDebt','mortgage','businessDebt','businessLoans','grossAssets','liabilities','distributableBase','estimatedMonthlyPension'].every(k=>money(b[k]))||!Number.isSafeInteger(b.netAssets)||Math.abs(b.netAssets)>1e12)return false;
  if(b.vehicle!==undefined&&!money(b.vehicle))return false;
  if(b.grossAssets!==b.cash+b.investments+b.home+(b.vehicle??0)+b.businessCash+b.businessEquipment)return false;
  if(b.liabilities!==b.personalDebt+b.mortgage+b.businessDebt+b.businessLoans)return false;
  if(b.netAssets!==b.grossAssets-b.liabilities||b.distributableBase!==Math.max(0,b.netAssets)||b.distributableBase!==inheritance.netAssets)return false;
 }
 return true;
}
