import {eraEconomicEffects} from './eraSystems.js';
/** 第13段階：6社の独立業績。架空・決定論的なゲームモデル。 */
export const COMPANY_DEFINITIONS=Object.freeze([
 {id:'shop',name:'みらい販売',sector:'小売'}, {id:'office',name:'さくら事務サービス',sector:'事務'},
 {id:'tech',name:'東都技術研究所',sector:'技術'}, {id:'pro',name:'日本総合開発',sector:'開発'},
 {id:'creative',name:'北星企画',sector:'企画'}, {id:'care',name:'青葉生活支援',sector:'生活支援'}
]);
const bound=(n,a=0,b=100)=>Math.max(a,Math.min(b,Math.round(n)));
const money=n=>Math.max(0,Math.min(1000000000,Math.round(n)));
// 金額は架空のゲーム内円。旧保存データにも同じ初期状態を付与する。
function initialFinance(i){return {cash:18000000+i*3000000,revenue:0,costs:0,profit:0,distressMonths:0,status:'通常',haltedMonths:0,recoveries:0,financeHistory:[]};}
export function ensureCompanyFinance(company,index=0){
 const defaults=initialFinance(index);
 for(const [key,value] of Object.entries(defaults))if(company[key]===undefined)company[key]=Array.isArray(value)?[]:value;
 return company;
}
export function createCompanyMarket(){return COMPANY_DEFINITIONS.map((c,i)=>({...c,performance:55+i*3,staffCount:24+i*8,openings:2,trend:'横ばい',history:[],...initialFinance(i)}));}
export function ensureCompanyMarket(finances){
 if(!Array.isArray(finances.companyMarket))finances.companyMarket=createCompanyMarket();
 finances.companyMarket.forEach(ensureCompanyFinance);
 return finances.companyMarket;
}
export function advanceCompanyMarket(finances,date,world='通常'){
 const companies=ensureCompanyMarket(finances);
 const phase=typeof world==='string'?world:world?.phase??'通常';
 const era=eraEconomicEffects(typeof world==='string'?null:world);
 const phaseEffect=phase==='好況'?3:phase==='不況'?-4:0;
 for(let i=0;i<companies.length;i++){
  const c=companies[i];
  ensureCompanyFinance(c,i);
  // 月・企業番号により異なる変動。実在データや予測ではない。
  const cycle=((date.year*12+date.month+i*7)%9)-4;
  const previous=c.performance;
  c.performance=bound(previous+phaseEffect+Math.sign(cycle)*2-1,10,95);
  c.trend=c.performance>previous?'成長':c.performance<previous?'縮小':'横ばい';
  if(c.status!=='営業停止'&&date.month%3===0){c.staffCount=Math.max(5,Math.min(500,c.staffCount+(c.performance>=65?2:c.performance<35?-2:0)));}
  // 売上は業績と景気、人件費は雇用人数に依存。赤字時は現金を取り崩す。
  if(c.status!=='営業停止'){
   const demand=phase==='好況'?1.12:phase==='不況'?.86:1;
   // The existing boom/recession modifier is applied once; technology and prices are separate pressures.
   const sectorTech=(c.sector==='技術'||c.sector==='開発')?era.businessTech:1;
   c.revenue=money((9000000+c.performance*160000+i*360000)*demand*sectorTech);
   c.costs=money((2800000+c.staffCount*240000+i*120000)*era.businessCost);
   c.profit=c.revenue-c.costs;
   c.cash=money(c.cash+c.profit);
   c.distressMonths=c.profit<0&&c.cash<4000000?c.distressMonths+1:Math.max(0,c.distressMonths-1);
   c.status=c.distressMonths>=6?'営業停止':c.distressMonths>=3?'経営危機':'通常';
   if(c.status==='営業停止'){c.staffCount=0;c.openings=0;c.haltedMonths=0;}
  }else{
   c.revenue=0;c.costs=0;c.profit=0;c.openings=0;
   c.haltedMonths=(c.haltedMonths??0)+1;
   // 営業停止から12か月後に外部資金による簡易再建を実施。
   if(c.haltedMonths>=12){
    c.status='通常';c.cash=6000000;c.staffCount=12;c.performance=Math.max(45,c.performance);
    c.distressMonths=0;c.haltedMonths=0;c.recoveries=(c.recoveries??0)+1;
   }
  }
  if(c.status!=='営業停止')c.openings=c.status==='経営危機'?0:c.performance<28?0:c.performance<45?1:c.performance>=75?4:2;
  c.financeHistory.push({year:date.year,month:date.month,revenue:c.revenue,costs:c.costs,profit:c.profit,cash:c.cash,status:c.status});
  if(c.financeHistory.length>24)c.financeHistory.shift();
  c.history.push({year:date.year,month:date.month,performance:c.performance,staffCount:c.staffCount,openings:c.openings});
  if(c.history.length>24)c.history.shift();
 }
 return companies;
}
export function getCompany(finances,postingId){return ensureCompanyMarket(finances).find(c=>c.id===postingId);}

/** 営業停止した企業への任意再建支援。プレイヤーの現金を寄付（返金なし）する。 */
export function supportRebuilding(finances,companyId,date){
 const company=ensureCompanyMarket(finances).find(c=>c.id===companyId);
 if(!company||company.status!=='営業停止')return {ok:false,reason:'再建支援できる営業停止企業を選択してください。'};
 if(company.haltedMonths<3)return {ok:false,reason:'営業停止から3か月経過後に支援できます。'};
 if(finances.cash<500000)return {ok:false,reason:'再建支援には個人現金50万円が必要です。'};
 finances.cash-=500000;finances.totals.expenses+=500000;
 company.cash=6000000;company.status='通常';company.staffCount=12;
 company.performance=Math.max(45,company.performance);company.distressMonths=0;company.haltedMonths=0;
 company.openings=2;company.recoveries=(company.recoveries??0)+1;
 finances.ledger.push({year:date.year,month:date.month,kind:'支出',label:`${company.name}の再建支援`,amount:-500000});
 if(finances.ledger.length>600)finances.ledger.shift();
 return {ok:true,message:`${company.name}の再建を支援しました。`};
}
