/** STEP family depth: hard-mode relationship and childcare consequences.
 * All values are fictional game rules, not real-life medical/legal probabilities.
 * Optional fields preserve all old v7 saves and legacy scenarios.
 */
const month=d=>d.year*12+d.month-1;
const ageAt=(d,p)=>d.year-p.birth.year-(d.month<p.birth.month?1:0);
const clamp=n=>Math.max(0,Math.min(100,Math.round(n)));
const asMoney=n=>Math.round(n).toLocaleString('ja-JP')+'円';
const MODES=Object.freeze({public:{label:'標準',cost:0},lessons:{label:'習い事・学習支援',cost:12000},private:{label:'手厚い教育',cost:28000}});
export const CHILD_EDUCATION_MODES=MODES;
export const WEDDING_STYLES=Object.freeze({small:{name:'家族中心の式',cost:120000},standard:{name:'一般的な披露宴',cost:350000}});
export function childBaseMonthlyCost(age){
 return age<0||age>=20?0:age<6?24000:age<12?34000:age<18?44000:30000;
}
function depthStore(state){
 const journey=state.familyJourney;
 journey.relationshipDepth??={};journey.childEducation??={};journey.lastDepthMonth??=-1;
 return journey;
}
function depthFor(state,p){
 const value=state.familyJourney?.relationshipDepth?.[p?.id]??null;
 return {
  cohabitingSince:value?.cohabitingSince??-1,
  engagedSince:value?.engagedSince??-1,
  marriedSince:value?.marriedSince??(p?.role==='配偶者'?month(state.timeline)-12:-1),
  weddingMonth:value?.weddingMonth??-1,
  weddingStyle:value?.weddingStyle??null,
  trust:value?.trust??(p?.relationship??60),conflict:value?.conflict??0
 };
}
const ensureDepth=(state,p)=>{
 const store=depthStore(state);
 store.relationshipDepth[p.id]??=depthFor(state,p);
 return store.relationshipDepth[p.id];
};
function childFor(state,child){
 const journey=depthStore(state);
 journey.childEducation[child.id]??={mode:'public',learning:30,confidence:65,independence:30,lastMonth:-1};
 return journey.childEducation[child.id];
}
export function familyDepthSummary(state,p){
 const current=p?depthFor(state,p):null;
 const now=month(state.timeline);
 return current?{...current,
  datingMonths:Math.max(0,now-(state.familyJourney?.connections?.[p.id]?.datingSince??now-12)),
  cohabitingMonths:current.cohabitingSince<0?0:Math.max(0,now-current.cohabitingSince),
  engagedMonths:current.engagedSince<0?0:Math.max(0,now-current.engagedSince)}:null;
}
export function childEducationSummary(state,child){
 const age=ageAt(state.timeline,child);
 const saved=state.familyJourney?.childEducation?.[child.id];
 const mode=MODES[saved?.mode]?saved.mode:'public';
 return {age,mode,label:MODES[mode].label,extraCost:age>=4&&age<20?MODES[mode].cost:0,
  monthlyCost:childBaseMonthlyCost(age)+(age>=4&&age<20?MODES[mode].cost:0),
  learning:saved?.learning??30,confidence:saved?.confidence??65,independence:saved?.independence??30};
}
export function familyDepthEligibility(state,action,personId=null,payload={}){
 const p=state.people.find(x=>x.id===personId),t=state.timeline,now=month(t),age=t.ageYears;
 const c=p?state.familyJourney?.connections?.[p.id]:null;
 const depth=p?depthFor(state,p):null;
 const datingSince=c?.datingSince??(now-12);
 const cash=state.finances.cash,debt=state.finances.debt,salary=state.finances.career.monthlySalary??0;
 const monthsDating=Math.max(0,now-datingSince);
 if(action==='startCohabitation'||action==='propose'||action==='marry'){
  if(age<18||!p||p.role!=='交際相手'||ageAt(t,p)<18)return '成人の交際相手が必要です';
  if(action==='startCohabitation'){
   if(depth.cohabitingSince>=0)return 'すでに同棲しています';
   if(monthsDating<6)return `同棲には交際6か月が必要（あと${6-monthsDating}か月）`;
   if(p.relationship<72||depth.trust<70)return '親密度72・信頼度70以上が必要です';
   if(cash<140000)return '引っ越し・生活準備に140,000円の貯蓄が必要です';
   if(debt>Math.max(200000,salary*8))return '借入れを減らしてから同棲を考えてください';
  }else if(action==='propose'){
   if(depth.engagedSince>=0)return 'すでに婚約しています';
   if(monthsDating<12)return `婚約には交際12か月が必要（あと${12-monthsDating}か月）`;
   if((c?.futureTalks??2)<3)return '結婚後の生活について3回以上話し合ってください';
   if(p.relationship<82||depth.trust<75)return '親密度82・信頼度75以上が必要です';
   if(depth.conflict>35)return '最近の意見の食い違いを落ち着かせてください';
   if(cash<(depth.cohabitingSince>=0?160000:200000))return '婚約の準備に160,000～200,000円の貯蓄が必要です';
   if(debt>Math.max(300000,salary*9))return '返済負担が大きすぎます';
  }else{
   if(depth.engagedSince<0)return 'まず婚約してください';
   if(now-depth.engagedSince<3)return `婚約から3か月の準備期間が必要（あと${3-(now-depth.engagedSince)}か月）`;
   if(p.relationship<80||depth.trust<70)return '結婚には親密度80・信頼度70以上が必要です';
   if(cash<90000)return '結婚生活の準備に90,000円の資金が必要です';
  }
  return null;
 }
 if(action==='holdWedding'){
  if(!p||p.role!=='配偶者')return '結婚後に選択できます';
  if(depth.weddingMonth>=0)return '結婚式は実施済みです';
  if(now-depth.marriedSince<1)return '結婚から1か月以上たってから選択できます';
  const style=payload.style??'small',details=WEDDING_STYLES[style];
  if(!details)return '式の内容を選択してください';
  if(cash<details.cost+30000)return `${details.name}には式費用${asMoney(details.cost)}と生活予備費30,000円が必要です`;
  return null;
 }
 if(action==='setChildEducation'){
  if(age<18||!p||p.role!=='子')return '子どもの教育方針を選択してください';
  const childAge=ageAt(t,p),mode=payload.mode;
  if(childAge<4||childAge>=20)return '教育方針は子どもが4～19歳の間に変更できます';
  if(!Object.hasOwn(MODES,mode))return '教育方針が不正です';
  if((state.familyJourney?.childEducation?.[p.id]?.mode??'public')===mode)return 'すでに選択している教育方針です';
  if(mode==='private'&&(cash<180000||salary<150000||debt>Math.max(350000,salary*6)))
   return '手厚い教育には貯蓄180,000円・安定した仕事と返済余力が必要です';
  return null;
 }
 return null;
}
function debit(state,date,label,amount){
 if(!amount)return;
 const f=state.finances,paid=Math.min(f.cash,amount);
 f.cash-=paid;f.debt+=amount-paid;f.totals.expenses+=amount;
 f.ledger.push({year:date.year,month:date.month,kind:'支出',label,amount:-amount});
 if(f.ledger.length>600)f.ledger.shift();
}
function memory(state,date,title){
 state.familyJourney.history.unshift({year:date.year,month:date.month,title});
 if(state.familyJourney.history.length>24)state.familyJourney.history.length=24;
}
/** Handles new milestone actions; caller enforces the one-category-per-month budget. */
export function familyDepthAction(state,action,payload={}){
 const p=state.people.find(x=>x.id===payload.personId),reason=familyDepthEligibility(state,action,payload.personId,payload);
 if(reason)return {ok:false,reason};
 const t=state.timeline,now=month(t),d=action==='setChildEducation'?null:ensureDepth(state,p);
 if(action==='startCohabitation'){
  debit(state,t,'同棲開始・生活用品',65000);
  d.cohabitingSince=now;d.trust=clamp(d.trust+3);
  memory(state,t,`${p.name}と同棲を開始`);
  return {ok:true,message:'同棲を開始しました。毎月18,000円の追加生活費がかかり、時間・家計・信頼関係に影響します。'};
 }
 if(action==='propose'){
  debit(state,t,'婚約の準備',80000);
  d.engagedSince=now;d.trust=clamp(d.trust+3);
  memory(state,t,`${p.name}と婚約`);
  return {ok:true,message:'婚約しました。結婚まで最低3か月、住まい・家計・価値観を整えましょう。'};
 }
 if(action==='holdWedding'){
  const style=payload.style??'small';
  debit(state,t,'結婚式・披露宴',WEDDING_STYLES[style].cost);
  d.weddingMonth=now;d.weddingStyle=style;d.trust=clamp(d.trust+5);d.conflict=clamp(d.conflict-7);
  p.relationship=clamp(p.relationship+4);state.health.mental=clamp(state.health.mental+3);
  memory(state,t,`${p.name}と${WEDDING_STYLES[style].name}を実施`);
  return {ok:true,message:`${WEDDING_STYLES[style].name}を行いました（費用${asMoney(WEDDING_STYLES[style].cost)}）。家族の信頼が深まりました。`};
 }
 if(action==='setChildEducation'){
  const child=childFor(state,p);child.mode=payload.mode;
  memory(state,t,`${p.name}の教育方針：${MODES[child.mode].label}`);
  return {ok:true,message:`${p.name}の教育方針を「${MODES[child.mode].label}」に変更。毎月の費用と学習・自信の成長に反映します。`};
 }
 return {ok:false,reason:'不明な家族操作です'};
}
export function onRelationshipAction(state,action,payload,result){
 if(!result?.ok)return;
 const p=state.people.find(x=>x.id===payload.personId);
 if(!p)return;
 if(['discussFuture','courtship','familyBond','socialize','familyCare','familyActivity'].includes(action)){
  if(p.role==='交際相手'||p.role==='配偶者'){
   const d=ensureDepth(state,p);
   d.trust=clamp(d.trust+(action==='discussFuture'?5:action==='familyBond'?3:2));
   d.conflict=clamp(d.conflict-(action==='discussFuture'?6:3));
  }
  if(p.role==='子'&&['familyCare','familyActivity'].includes(action)){
   const c=childFor(state,p);c.confidence=clamp(c.confidence+3);
   if(action==='familyActivity')c.learning=clamp(c.learning+2);
  }
 }
 if(action==='marry'){
  const d=ensureDepth(state,p);d.marriedSince=month(state.timeline);
  d.trust=clamp(d.trust+4);
 }
}
export function advanceFamilyDepth(state,date){
 const journey=depthStore(state),now=month(date),events=[];
 if(now<=journey.lastDepthMonth)return events;
 journey.lastDepthMonth=now;
 const budgetStress=state.finances.debt>Math.max(240000,(state.finances.career.monthlySalary??0)*10);
 const schedule=state.daily54?.planId??'balanced';
 const partner=state.people.find(p=>p.role==='配偶者')??state.people.find(p=>p.role==='交際相手');
 if(partner){
  const d=ensureDepth(state,partner);
  if(d.cohabitingSince>=0){
   debit(state,date,'二人暮らしの追加生活費',18000);
   if(budgetStress){d.conflict=clamp(d.conflict+3);d.trust=clamp(d.trust-1);}
  }
  const lastContact=state.familyJourney.connections[partner.id]?.lastContact??now-3;
  if(now%3===0&&now-lastContact>=3){
   d.trust=clamp(d.trust-(budgetStress?3:1));
   d.conflict=clamp(d.conflict+(budgetStress?4:1));
  }
  if(schedule==='social'&&now%3===0)d.trust=clamp(d.trust+2);
  if(d.conflict>=55&&now%12===0)events.push({type:'family',title:'二人の生活を見直すとき',description:'家計と時間の負担が重なり、信頼が揺らいでいます。会話や生活費の見直しが必要です。'});
 }
 let addOn=0;
 for(const child of state.people.filter(x=>x.role==='子')){
  const age=ageAt(date,child),profile=childFor(state,child);
  if(age<0||age>=20)continue;
  if(age>=4)addOn+=MODES[profile.mode]?.cost??0;
  if(now%3===0&&profile.lastMonth!==now){
   const socialTime=journey.lastFamilyTime>=now-3;
   profile.learning=clamp(profile.learning+(profile.mode==='private'?3:profile.mode==='lessons'?2:1)+(socialTime?1:0));
   profile.confidence=clamp(profile.confidence+(socialTime?2:-1)-(budgetStress?1:0));
   profile.independence=clamp(profile.independence+(age>=6?1:0)+(socialTime?1:0));
   profile.lastMonth=now;
  }
 }
 if(addOn)debit(state,date,'子どもの習い事・教育費',addOn);
 if(state.familyJourney.plan?.stage==='妊娠中'){
  debit(state,date,'妊娠中の定期的な生活・検診準備',6500);
  if(state.health.energy>4&&state.daily54?.fatigue>75)state.health.energy=clamp(state.health.energy-1);
 }
 if(budgetStress&&state.people.some(p=>p.role==='子')&&now%3===0)state.health.mental=clamp(state.health.mental-1);
 return events;
}
export function validateFamilyDepth(progress){
 if(progress.relationshipDepth!==undefined){
  const rs=progress.relationshipDepth;
  if(!rs||typeof rs!=='object'||Array.isArray(rs)||Object.keys(rs).length>500)return false;
  for(const [id,r] of Object.entries(rs)){
   if(id.length>40||!r||typeof r!=='object'||Array.isArray(r))return false;
   for(const k of ['cohabitingSince','engagedSince','marriedSince','weddingMonth']){
    if(r[k]!==undefined&&(!Number.isInteger(r[k])||r[k]<-1||r[k]>26412))return false;
   }
   if(r.weddingStyle!==undefined&&r.weddingStyle!==null&&!Object.hasOwn(WEDDING_STYLES,r.weddingStyle))return false;
   for(const k of ['trust','conflict'])if(r[k]!==undefined&&(!Number.isInteger(r[k])||r[k]<0||r[k]>100))return false;
  }
 }
 if(progress.childEducation!==undefined){
  const rs=progress.childEducation;
  if(!rs||typeof rs!=='object'||Array.isArray(rs)||Object.keys(rs).length>500)return false;
  for(const [id,p] of Object.entries(rs)){
   if(id.length>40||!p||typeof p!=='object'||Array.isArray(p)||!Object.hasOwn(MODES,p.mode))return false;
   for(const key of ['learning','confidence','independence']){
    if(!Number.isInteger(p[key])||p[key]<0||p[key]>100)return false;
   }
   if(!Number.isInteger(p.lastMonth)||p.lastMonth<-1||p.lastMonth>26412)return false;
  }
 }
 return progress.lastDepthMonth===undefined||
  Number.isInteger(progress.lastDepthMonth)&&progress.lastDepthMonth>=-1&&progress.lastDepthMonth<=26412;
}
