/** Optional, deterministic family journey for the interactive game.
 * Older scripted/legacy social actions remain available unchanged.
 * This is simplified fiction, not a model of fertility, medical care, adoption law or family eligibility.
 */
import {socialAction,advanceFamily,familyActivity} from './socialSystems.js';
import {advanceChildEducation,validateChildStudies} from './childEducationProgress.js';
import {advanceParentWellbeing,validateParentWellbeing} from './parentWellbeing.js';
const index=date=>date.year*12+date.month-1;
const ageAt=(date,p)=>date.year-p.birth.year-(date.month<p.birth.month?1:0);
const clamp=n=>Math.min(100,Math.max(0,Math.round(n)));
const money=n=>Math.round(n).toLocaleString('ja-JP')+'円';
export function createFamilyProgress(){
 return {connections:{},plan:null,lastBirthMonth:-120,totalChildExpenses:0,monthsParenting:0,lastFamilyTime:-1,history:[],partnership:null,educationPlans:{},lastAppliedMonth:-1};
}
export function ensureFamilyProgress(state){
 state.familyJourney??=createFamilyProgress();
 const progress=state.familyJourney;
 const partner=state.people?.find(p=>p.role==='交際相手'||p.role==='配偶者');
 if(partner&&(!progress.partnership||progress.partnership.personId!==partner.id)){
   const now=index(state.timeline),c=progress.connections[partner.id];
   progress.partnership={personId:partner.id,
     stage:partner.role==='配偶者'?'結婚済み':'交際中',
     datingSince:c?.datingSince>=0?c.datingSince:Math.max(0,now-12),
     cohabitingSince:-1,engagedSince:-1,weddingMonth:-1,weddingStyle:'未定'};
 }
 return progress;
}
export function validateFamilyProgress(p){
 if(p===undefined)return true;
 if(!p||typeof p!=='object'||Array.isArray(p)||!p.connections||typeof p.connections!=='object'||Array.isArray(p.connections))return false;
 const entries=Object.entries(p.connections);
 if(entries.length>500||entries.some(([id,v])=>id.length>35||!v||typeof v!=='object'||!['knownSince','datingSince','futureTalks','lastTalk','lastContact'].every(k=>Number.isInteger(v[k])&&v[k]>=-240&&v[k]<=26412)||v.futureTalks>30))return false;
 if(!Number.isInteger(p.lastBirthMonth)||p.lastBirthMonth< -120||p.lastBirthMonth>26412||
  !Number.isSafeInteger(p.totalChildExpenses)||p.totalChildExpenses<0||p.totalChildExpenses>1e10||
  !Number.isInteger(p.monthsParenting)||p.monthsParenting<0||p.monthsParenting>2600||
  !Number.isInteger(p.lastFamilyTime)||p.lastFamilyTime< -1||p.lastFamilyTime>26412)return false;
 if(p.plan!==null&&p.plan!==undefined){
  const x=p.plan;
  if(!x||!['birth','adopt'].includes(x.mode)||!['準備中','妊娠中','手続き中'].includes(x.stage)||typeof x.name!=='string'||!x.name.trim()||
   x.name.length>20||!Number.isInteger(x.started)||x.started<0||x.started>26412||
   !(x.due===null||Number.isInteger(x.due)&&x.due>=x.started&&x.due<=26412)||
   !Number.isInteger(x.waited)||x.waited<0||x.waited>24)return false;
 }
 if(p.partnership!==undefined&&p.partnership!==null){
  const c=p.partnership;
  if(!c||typeof c.personId!=='string'||c.personId.length>35||
   !['交際中','同棲中','婚約中','結婚済み'].includes(c.stage)||
   !Number.isInteger(c.datingSince)||c.datingSince<0||c.datingSince>26412||
   !Number.isInteger(c.cohabitingSince)||c.cohabitingSince< -1||c.cohabitingSince>26412||
   !Number.isInteger(c.engagedSince)||c.engagedSince< -1||c.engagedSince>26412||
   !Number.isInteger(c.weddingMonth)||c.weddingMonth< -1||c.weddingMonth>26412||
   !['未定','小規模','標準'].includes(c.weddingStyle))return false;
 }
 if(p.educationPlans!==undefined&&(!p.educationPlans||typeof p.educationPlans!=='object'||
  Array.isArray(p.educationPlans)||Object.entries(p.educationPlans).length>5||
  Object.entries(p.educationPlans).some(([id,plan])=>id.length>35||!['公立中心','私立中心','学習支援'].includes(plan))))return false;
 if(p.lastAppliedMonth!==undefined&&(!Number.isInteger(p.lastAppliedMonth)||p.lastAppliedMonth< -1||p.lastAppliedMonth>26412))return false;
  if(!validateChildStudies(p.childStudies)||!validateParentWellbeing(p.parentWellbeing))return false;
 if(!Array.isArray(p.history)||p.history.length>24||p.history.some(h=>!h||typeof h.title!=='string'||h.title.length>90||
  !Number.isInteger(h.year)||h.year<2000||h.year>2200||!Number.isInteger(h.month)||h.month<1||h.month>12))return false;
 return true;
}
const connection=(progress,p,now)=>{
 progress.connections[p.id]??={knownSince:now-6,datingSince:p.role==='交際相手'?now-12:-1,
  futureTalks:p.role==='交際相手'?2:0,lastTalk:-1,lastContact:-1};
 return progress.connections[p.id];
};
const record=(state,date,title)=>{
 const p=ensureFamilyProgress(state);
 p.history.unshift({year:date.year,month:date.month,title});
 if(p.history.length>24)p.history.length=24;
};
const debit=(state,date,label,amount)=>{
 if(!amount)return;
 const f=state.finances;
 const cash=Math.min(f.cash,amount);
 f.cash-=cash;f.debt+=amount-cash;f.totals.expenses+=amount;
 f.ledger.push({year:date.year,month:date.month,kind:'支出',label,amount:-amount});
 if(f.ledger.length>600)f.ledger.shift();
};
const addChild=(state,date,name,adopted)=>{
 const children=state.people.filter(p=>p.role==='子');
 if(children.length>=5)return false;
 const id=`CHILD-${String(children.length+1).padStart(3,'0')}`;
 state.people.push({id,name,birth:{year:date.year,month:date.month,day:1},role:'子',relationship:82,lifeStage:'未就学',
  ...(adopted?{adopted:true}:{})});
 state.household.memberIds.push(id);
 return true;
};
const randomFraction=(seed,date,key)=>{
 let h=(Number(seed)>>>0)^Math.imul(index(date),2654435761);
 for(const char of String(key))h=Math.imul(h^char.charCodeAt(0),16777619)>>>0;
 return (h>>>0)/4294967296;
};
/** Existing saves may contain a spouse/partner without new stage metadata. */
function partnershipFor(state,person){
 const progress=ensureFamilyProgress(state),now=index(state.timeline);
 if(!person)return null;
 if(progress.partnership?.personId===person.id)return progress.partnership;
 const c=progress.connections[person.id];
 progress.partnership={personId:person.id,stage:person.role==='配偶者'?'結婚済み':'交際中',
  datingSince:c?.datingSince>=0?c.datingSince:Math.max(0,now-12),
  cohabitingSince:-1,engagedSince:-1,weddingMonth:-1,weddingStyle:'未定'};
 return progress.partnership;
}
export const FAMILY_COSTS=Object.freeze({cohabitationMonthly:25000,engagement:30000,
 weddingSmall:160000,weddingStandard:420000,marriagePaperwork:40000,
 prenatalMonthly:6500,medicalPreparation:50000});
export function parentingMonthlyCost(age,plan='公立中心'){
 const base=age<0||age>=20?0:age<6?16000:age<12?22000:age<18?28000:12000;
 return base+(age>=3&&age<20?(plan==='私立中心'?age<6?14000:age<12?30000:age<18?43000:50000:
   plan==='学習支援'?age<6?5000:age<12?9000:age<18?14000:12000:0):0);
}
/** Available courtship/partnership milestones: user-facing messages use these same requirements. */
export function familyEligibility(state,action,personId=null){
 const age=state.timeline.ageYears,date=state.timeline,now=index(date);
 const p=state.people.find(p=>p.id===personId),progress=state.familyJourney??createFamilyProgress();
 const c=p?progress.connections[p.id]:null;
 const since=c?.knownSince??now-6,dating=c?.datingSince??now-12;
 if(action==='courtship'||action==='date'){
  if(age<18||!p||p.role!=='友人'||ageAt(date,p)<18)return '18歳以上の友人との関係が必要です';
  if(state.people.some(x=>['配偶者','交際相手'].includes(x.role)))return 'すでに交際相手・配偶者がいます';
  if(now-since<3)return `出会いから最低3か月が必要（あと${3-(now-since)}か月）`;
  if(action==='date'&&p.relationship<60)return '親密度60以上が必要です';
  if(action==='date'&&(c?.futureTalks??0)<2)return '相手と将来の話を2回以上する必要があります';
 }else if(['discussFuture','cohabit','engage','holdWedding','marry'].includes(action)){
  if(age<18||!p||p.role!=='交際相手'||ageAt(date,p)<18)return '18歳以上の交際相手が必要です';
  if(action==='cohabit'){
   if(now-dating<6)return '同棲には交際6か月以上が必要です';
   if(p.relationship<70)return '親密度70以上が必要です';
   if(state.finances.cash<70000)return '同棲の引越し資金70,000円が必要です';
   if(progress.partnership?.cohabitingSince>=0)return 'すでに同棲しています';
  }
  if(action==='engage'){
   if(now-dating<12)return '婚約には交際12か月以上が必要です';
   if(p.relationship<82)return '婚約には親密度82以上が必要です';
   if((c?.futureTalks??2)<2)return '生活と将来の話し合い2回が必要です';
   if(progress.partnership?.engagedSince>=0)return 'すでに婚約しています';
   if(state.finances.cash<120000)return '婚約の準備に120,000円以上の現金が必要です';
   if(state.finances.debt>Math.max(200000,(state.finances.career.monthlySalary??0)*6))return '借金を減らしてから婚約してください';
  }
  if(action==='holdWedding'){
   if(progress.partnership?.engagedSince<0||!progress.partnership)return '先に婚約してください';
   if(now-progress.partnership.engagedSince<3)return '婚約から結婚式の準備に3か月必要です';
   if(progress.partnership.weddingMonth>=0)return '結婚式はすでに実施しました';
   if(state.finances.cash<FAMILY_COSTS.weddingSmall)return '結婚式には最低160,000円必要です';
  }
  if(action==='marry'){
   if(now-dating<12)return `交際12か月以上が必要（あと${12-(now-dating)}か月）`;
   if(p.relationship<80)return '親密度80以上が必要です';
   if((c?.futureTalks??2)<2)return '将来の生活について2回以上話し合う必要があります';
   if(!progress.partnership||progress.partnership.engagedSince<0)return '先に婚約してください';
   if(now-progress.partnership.engagedSince<3)return '婚約から3か月後に結婚できます';
   if(state.finances.cash<150000)return '結婚の生活準備金150,000円が必要です';
   const salary=state.finances.career.monthlySalary??0;
   if(state.finances.debt>Math.max(150000,salary*6))return '借入れが多いため、家計を安定させてください';
  }
 }else if(action==='haveChild'){
  const spouse=state.people.find(p=>p.role==='配偶者');
  if(age<20||!spouse)return '20歳以上で配偶者が必要です';
  if(spouse.relationship<60)return '夫婦関係60以上が必要です';
  if(progress.plan)return 'すでに子どもを迎える準備を進めています';
  if(state.people.filter(p=>p.role==='子').length>=5)return '子どもは最大5人までです';
  if(now-progress.lastBirthMonth<12)return '前回子どもを迎えてから12か月空けてください';
  if(state.finances.cash+(state.finances.career.monthlySalary??0)<150000)return '育児開始には150,000円の資金余力が必要です';
 }
 return null;
}
export function familyJourneyAction(state,action,payload={}){
 const date=state.timeline,now=index(date),p=state.people.find(x=>x.id===payload.personId&&x.role!=='本人');
 const progress=ensureFamilyProgress(state);
 if(action==='meetFriend'){
  const result=socialAction(state,action,payload);
  if(result.ok){const friend=state.people.find(p=>p.id===result.personId);
   if(friend)progress.connections[friend.id]={knownSince:now,datingSince:-1,futureTalks:0,lastTalk:-1,lastContact:now};}
  return result;
 }
 if(action==='familyBond'||action==='socialize'){
  const result=action==='familyBond'?socialAction(state,action,payload):socialAction(state,'familyBond',{personId:payload.personId,activity:'会話'});
  if(result.ok){
   if(p&&['配偶者','交際相手'].includes(p.role))connection(progress,p,now).lastContact=now;
   progress.lastFamilyTime=now;
  }
  return result;
 }
 if(action==='familyCare'||action==='familyActivity'){
  const child=p?.role==='子'?p:null;
  if(!child)return {ok:false,reason:'子どもを選んでください'};
  if(action==='familyCare')child.relationship=clamp(child.relationship+4);
  else{
   const r=familyActivity(state,payload);if(!r.ok)return r;
  }
  progress.lastFamilyTime=now;
  return {ok:true,message:`${child.name}と過ごしました。家庭の信頼関係が深まります。`};
 }
 if(['courtship','date','cohabit','engage','holdWedding','marry','discussFuture','haveChild'].includes(action)){
  const reason=familyEligibility(state,action,payload.personId);
  if(reason)return {ok:false,reason};
 }
 if(action==='courtship'){
  const c=connection(progress,p,now);
  if(c.lastTalk===now)return {ok:false,reason:'この月はすでに将来の話をしました'};
  c.futureTalks=Math.min(30,c.futureTalks+1);c.lastTalk=now;c.lastContact=now;
  p.relationship=clamp(p.relationship+5);
  return {ok:true,message:`${p.name}と会話しました。親密度${p.relationship}、話し合い${c.futureTalks}/2。`};
 }
 if(action==='date'){
  const c=connection(progress,p,now);
  p.role='交際相手';c.datingSince=now;c.lastContact=now;
  progress.partnership={personId:p.id,stage:'交際中',datingSince:now,cohabitingSince:-1,engagedSince:-1,weddingMonth:-1,weddingStyle:'未定'};
  return {ok:true,message:`${p.name}と交際を始めました。結婚までは最低12か月の交際期間があります。`};
 }
 if(action==='discussFuture'){
  const c=connection(progress,p,now);
  if(c.lastTalk===now)return {ok:false,reason:'今月はすでに将来について話しました'};
  c.futureTalks=Math.min(30,c.futureTalks+1);c.lastTalk=now;c.lastContact=now;
  p.relationship=clamp(p.relationship+5);
  return {ok:true,message:`住まい・お金・家族の希望について話し合いました（話し合い${c.futureTalks}/2）。`};
 }
 if(action==='cohabit'){
  const ps=partnershipFor(state,p);
  debit(state,date,'同棲の引越し・生活準備',70000);
  ps.cohabitingSince=now;ps.stage='同棲中';
  record(state,date,`${p.name}との同棲を開始`);
  return {ok:true,message:'同棲を始めました。家賃・生活費は毎月25,000円増え、家庭での時間が関係に影響します。'};
 }
 if(action==='engage'){
  const ps=partnershipFor(state,p);
  debit(state,date,'婚約・顔合わせの準備',FAMILY_COSTS.engagement);
  ps.stage='婚約中';ps.engagedSince=now;
  record(state,date,`${p.name}と婚約`);
  return {ok:true,message:'婚約しました。結婚には少なくとも3か月の準備期間が必要です。'};
 }
 if(action==='holdWedding'){
  const style=payload.style??'小規模';
  if(!['小規模','標準'].includes(style))return {ok:false,reason:'挙式プランを選んでください'};
  const amount=style==='標準'?FAMILY_COSTS.weddingStandard:FAMILY_COSTS.weddingSmall;
  if(state.finances.cash<amount)return {ok:false,reason:`挙式費用${money(amount)}が必要です`};
  const ps=partnershipFor(state,p);ps.weddingStyle=style;ps.weddingMonth=now;
  debit(state,date,'結婚式・披露宴',amount);
  p.relationship=clamp(p.relationship+3);
  record(state,date,`${p.name}と${style}の結婚式`);
  return {ok:true,message:`${style}の結婚式を挙げました。費用${money(amount)}。`};
 }
 if(action==='marry'){
  debit(state,date,'結婚に向けた手続き・準備',FAMILY_COSTS.marriagePaperwork);
  p.role='配偶者';
  const ps=partnershipFor(state,p);ps.stage='結婚済み';
  if(!state.household.memberIds.includes(p.id))state.household.memberIds.push(p.id);
  connection(progress,p,now).lastContact=now;
  record(state,date,`${p.name}と結婚`);
  return {ok:true,message:`${p.name}と結婚しました。今後は家計と家族の時間が関係に影響します。`};
 }
 if(action==='setChildEducation'){
  const child=state.people.find(x=>x.id===payload.personId&&x.role==='子');
  if(!child)return {ok:false,reason:'子どもを選んでください'};
  if(!['公立中心','私立中心','学習支援'].includes(payload.plan))return {ok:false,reason:'教育方針を選択してください'};
  const age=ageAt(date,child);
  if(age<3||age>=20)return {ok:false,reason:'教育方針を変更できるのは3～19歳です'};
  if(progress.educationPlans?.[child.id]===payload.plan)return {ok:false,reason:'すでにこの教育方針です'};
  progress.educationPlans??={};
  progress.educationPlans[child.id]=payload.plan;
  record(state,date,`${child.name}の教育方針を${payload.plan}へ変更`);
  return {ok:true,message:`${child.name}の教育方針を${payload.plan}へ変更しました。毎月の費用・学習支援が変わります。`};
 }
 if(action==='haveChild'){
  const name=String(payload.name??'').trim(),mode=payload.mode??'birth';
  if(!name||name.length>20)return {ok:false,reason:'子どもの名前を1～20文字で入力してください'};
  if(!['birth','adopt'].includes(mode))return {ok:false,reason:'家族を迎える方法が不正です'};
  if(mode==='birth'&&state.timeline.ageYears>=50)return {ok:false,reason:'このゲームの出産希望ルートは20～49歳です。養子縁組ルートを検討できます'};
  if(mode==='adopt'&&state.timeline.ageYears>=60)return {ok:false,reason:'このゲームの養子縁組ルートは20～59歳です'};
  if(mode==='adopt'){
   debit(state,date,'養子縁組の準備費',20000);
  }
  const due=mode==='adopt'?now+12+Math.floor(randomFraction(state.random?.seed,date,name)*8):null;
  progress.plan={mode,name,stage:mode==='adopt'?'手続き中':'準備中',started:now,due,waited:0};
  record(state,date,`子どもを迎える計画（${mode==='birth'?'妊娠・出産':'養子縁組'}）`);
  return {ok:true,message:mode==='birth'?'家族計画を始めました。妊娠の成立には個人差があり、すぐに出産するわけではありません。':
   '養子縁組の手続きを始めました。家族を迎えるまでに一定の時間がかかります。'};
 }
 return {ok:false,reason:'未対応の家族操作です'};
}
export function advanceFamilyJourney(state,date){
 const out=[],progress=ensureFamilyProgress(state),now=index(date);
 const spouse=state.people.find(p=>p.role==='配偶者');
 const plan=progress.plan;
 if(plan){
  if(plan.stage==='準備中'){
   const waited=now-plan.started;
   if(waited>=24){
    progress.plan=null;
    out.push({type:'family',title:'家族計画を見直す時期',description:'希望どおりに進まなかったため、家族と相談して計画を見直せます。'});
   }else if(waited>0){
    const health=state.health.physical??70,age=state.timeline.ageYears;
    const chance=Math.max(.015,Math.min(.12,(age>=45?.035:age>=35?.065:.10)*(health<50?.6:1)*(spouse?.relationship<70?.65:1)));
    if(randomFraction(state.random?.seed,date,plan.name+plan.started)<chance){
     plan.stage='妊娠中';plan.due=now+9;
     out.push({type:'family',title:'家族が増える準備',description:'妊娠の経過を見守ります。約9か月後の出産予定です。'});
    }else plan.waited=Math.min(24,plan.waited+1);
   }
  }else if(plan.due!==null&&now>=plan.due){
   if(addChild(state,date,plan.name,plan.mode==='adopt')){
    const label=plan.mode==='adopt'?'養子縁組':'出産';
    debit(state,date,plan.mode==='adopt'?'受け入れ時の生活準備':'出産・育児の準備',plan.mode==='adopt'?40000:35000);
    progress.lastBirthMonth=now;progress.plan=null;
    record(state,date,`${plan.name}を家族に迎えた（${label}）`);
    out.push({type:'family',title:'新しい家族を迎えました',description:`${plan.name}が家族になりました。育児と生活費が毎月の家計に反映されます。`});
   }
  }
 }
 let monthlyChildExpense=0;
 for(const child of state.people.filter(p=>p.role==='子')){
  const age=ageAt(date,child);
  if(age>=0&&age<20){
   const educationPlan=progress.educationPlans?.[child.id]??'公立中心';
   monthlyChildExpense+=parentingMonthlyCost(age,educationPlan);
   if(date.month===4&&age>=6&&age<19&&educationPlan==='私立中心')debit(state,date,'新学年の教育準備',65000);
   if(age>=3&&now%6===0&&['学習支援','私立中心'].includes(educationPlan))child.learningSupport=Math.min(100,(child.learningSupport??0)+(educationPlan==='私立中心'?3:2));
   if(now%4===0&&progress.lastFamilyTime<now-2)child.relationship=clamp(child.relationship-1);
  }
 }
 const ps=progress.partnership;
 if(ps?.cohabitingSince>=0&&ps.personId===state.people.find(x=>['交際相手','配偶者'].includes(x.role))?.id)
  debit(state,date,'同棲・二人暮らしの生活費',FAMILY_COSTS.cohabitationMonthly);
 if(plan?.stage==='妊娠中')debit(state,date,'妊娠中の通院・生活準備',FAMILY_COSTS.prenatalMonthly);
 if(monthlyChildExpense){
  debit(state,date,'子どもの養育・教育費',monthlyChildExpense);
  progress.totalChildExpenses+=monthlyChildExpense;
  progress.monthsParenting=Math.min(2600,progress.monthsParenting+1);
  if(state.finances.debt>150000&&state.health.mental>3)state.health.mental=clamp(state.health.mental-1);
 }
 if(spouse){
  const c=connection(progress,spouse,now);
  const salary=state.finances.career.monthlySalary??0;
  const strained=state.finances.debt>Math.max(200000,salary*9)||
    (state.finances.cash<10000&&monthlyChildExpense>0);
  if(now%3===0&&progress.lastFamilyTime<now-2){
   spouse.relationship=clamp(spouse.relationship-(strained?3:1));
  }
  if(spouse.relationship<40&&now%6===0)out.push({type:'family',title:'夫婦の時間を考える',description:'生活の負担が増えています。話し合いや家計の見直しが関係に役立ちます。'});
 }
 return [...out,...advanceChildEducation(state,date),...advanceParentWellbeing(state,date),...advanceFamily(state,date)];
}
export function familyProgressSummary(state){
 const p=state.familyJourney??createFamilyProgress();
 const spouse=state.people?.find(x=>x.role==='配偶者');
 return {plan:p.plan,spouse,partnership:p.partnership,educationPlans:p.educationPlans??{},monthlyCost:state.people?.filter(x=>x.role==='子').reduce((sum,c)=>{
  const age=ageAt(state.timeline,c);return sum+parentingMonthlyCost(age,p.educationPlans?.[c.id]);
 },0)??0,totalChildExpenses:p.totalChildExpenses,history:p.history.slice(0,4)};
}
