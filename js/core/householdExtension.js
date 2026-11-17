/** Optional household extension. Does not alter pre-existing spouse/person or save schema. */
import {REGIONAL_FACTORS} from './livingSystems.js';
const idx=d=>d.year*12+d.month-1;
const clamp=n=>Math.min(100,Math.max(0,Math.round(n)));
const ageAt=(d,p)=>d.year-p.birth.year-(d.month<p.birth.month?1:0);
const fraction=(date,key)=>{
 let h=Math.imul(idx(date)+1,2654435761)>>>0;
 for(const c of key)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;
 return (h>>>0)/4294967296;
};
export const HOUSEHOLD_ROLES=Object.freeze([
 {id:'shared',label:'家事・育児を分担'},
 {id:'spouseMain',label:'配偶者が家事・育児を多く担当'},
 {id:'playerMain',label:'本人が家事・育児を多く担当'}
]);
export function createHouseholdExtension(personId){return {personId,division:'shared',employment:'working',unemployedMonths:0,leaveMonths:0,workMonths:0,lastMonth:-1,lastContribution:0,lastGross:0};}
export function validateHouseholdExtension(p){
 if(p===undefined)return true;
 if(!p||typeof p!=='object'||Array.isArray(p)||typeof p.personId!=='string'||p.personId.length>35||!HOUSEHOLD_ROLES.some(x=>x.id===p.division)||!['working','unemployed','leave'].includes(p.employment))return false;
 return ['unemployedMonths','leaveMonths','workMonths','lastContribution','lastGross'].every(k=>Number.isSafeInteger(p[k])&&p[k]>=0&&p[k]<=1e9)&&
 Number.isInteger(p.lastMonth)&&p.lastMonth>=-1&&p.lastMonth<=26412;
}
export function ensureHouseholdExtension(state){
 const spouse=state.people?.find(p=>p.role==='配偶者');
 if(!spouse)return null;
 if(state.householdExtension?.personId!==spouse.id)state.householdExtension=createHouseholdExtension(spouse.id);
 return state.householdExtension;
}
export function householdSummary(state){
 const spouse=state.people?.find(p=>p.role==='配偶者'),p=spouse&&state.householdExtension?.personId===spouse.id?state.householdExtension:null;
 return {spouse,division:p?.division??'shared',employment:p?.employment??'working',lastContribution:p?.lastContribution??0,lastGross:p?.lastGross??0,
  description:HOUSEHOLD_ROLES.find(x=>x.id===(p?.division??'shared'))?.label??'家事・育児を分担'};
}
export function changeHouseholdRole(state,{division}={}){
 const p=ensureHouseholdExtension(state);
 if(!p)return {ok:false,reason:'配偶者がいる場合に設定できます。'};
 if(!HOUSEHOLD_ROLES.some(x=>x.id===division))return {ok:false,reason:'家事・育児の分担を選択してください。'};
 if(p.division===division)return {ok:false,reason:'すでにその分担方針です。'};
 p.division=division;
 return {ok:true,message:`家事・育児の方針を「${HOUSEHOLD_ROLES.find(x=>x.id===division).label}」に変更しました。仕事と家庭に毎月影響します。`};
}
export function setSpouseLeave(state){
 const spouse=state.people?.find(p=>p.role==='配偶者'),p=ensureHouseholdExtension(state);
 const child=state.people?.find(x=>x.role==='子'&&ageAt(state.timeline,x)>=0&&ageAt(state.timeline,x)<2);
 if(!spouse||!p)return {ok:false,reason:'育児休業には配偶者が必要です。'};
 if(!child)return {ok:false,reason:'2歳未満の子どもが必要です。'};
 if(p.employment!=='working')return {ok:false,reason:'配偶者が就業中のみ育児休業を始められます。'};
 p.employment='leave';p.leaveMonths=0;
 return {ok:true,message:'配偶者が育児休業を開始しました。休業中は収入が減り、子育ての負担が軽減します。'};
}
function record(state,date,label,amount){
 state.finances.cash+=amount;state.finances.totals.income+=amount;
 state.finances.ledger.push({year:date.year,month:date.month,kind:'収入',label,amount});
 if(state.finances.ledger.length>600)state.finances.ledger.shift();
}
export function advanceHouseholdMonth(state,date){
 const p=ensureHouseholdExtension(state);
 if(!p||p.lastMonth>=idx(date))return [];
 p.lastMonth=idx(date);
 const spouse=state.people.find(x=>x.id===p.personId);
 const age=ageAt(date,spouse),children=state.people.filter(x=>x.role==='子'&&ageAt(date,x)<18);
 const youngest=children.length?Math.min(...children.map(x=>ageAt(date,x))):99;
 const out=[];
 if(p.employment==='leave'){
  p.leaveMonths++;
  if(p.leaveMonths>=12||youngest>=2){p.employment='working';p.leaveMonths=0;out.push({type:'family',title:'配偶者が仕事に復帰',description:'育児休業を終えて仕事に復帰しました。'});}
 }else if(p.employment==='unemployed'){
  p.unemployedMonths++;
  if(p.unemployedMonths>=3&&fraction(date,p.personId+'recruit')<.28){
   p.employment='working';p.unemployedMonths=0;
   out.push({type:'family',title:'配偶者の再就職',description:'仕事探しが実り、配偶者が再就職しました。'});
  }
 }else if(age<65){
  p.workMonths=Math.min(1500,p.workMonths+1);
  // Low monthly risk, deterministic by date and spouse, never applied at age < 18.
  if(age>=18&&p.workMonths>=12&&fraction(date,p.personId+'loss')<.008){
   p.employment='unemployed';p.unemployedMonths=0;
   out.push({type:'family',title:'配偶者の失業',description:'世帯収入が減ります。配偶者の再就職と生活費の見直しが必要です。'});
  }
 }
 if(age>=65)p.employment='unemployed';
 const factor=REGIONAL_FACTORS[state.finances.living?.region]?.jobs??1;
 const gross=Math.round((age>=65?0:190000+Math.min(45,Math.max(0,age-18))*2300)*factor);
 const takeHome=p.employment==='working'?Math.round(gross*.76):p.employment==='leave'?Math.round(gross*.50):p.unemployedMonths<=3&&age<65?35000:0;
 // Spouse's own food, commute, insurance etc remain outside player ledger; only actual contribution enters shared cash.
 const spouseOwn=p.employment==='working'?92000:p.employment==='leave'?68000:35000;
 const contribution=Math.max(0,takeHome-spouseOwn);
 p.lastGross=p.employment==='working'?gross:0;p.lastContribution=contribution;
 if(contribution)record(state,date,'配偶者からの家計負担金',contribution);
 if(children.length){
  // Unequal housework leaves limited free time even when there is money.
  const burden=p.division==='playerMain'?2:p.division==='spouseMain'?0:1;
  if(idx(date)%2===0&&burden)state.health.energy=clamp(state.health.energy-burden);
  if(idx(date)%4===0&&p.division==='spouseMain'&&p.employment==='working')spouse.relationship=clamp(spouse.relationship-1);
 }else if(p.division==='playerMain'&&idx(date)%3===0)state.health.energy=clamp(state.health.energy-1);
 return out;
}
