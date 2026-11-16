import {validateInheritance} from './estateSystems.js';
import {validateBusinessTurn} from './businessOperations.js';
import {validateTurnActionBudget} from './adultActionBudget.js';
import {validateMonthlyRoutines} from './monthlyRoutines.js';
import {validateEducationPath} from './educationPaths.js';
import {validateLiving} from './livingSystems.js';
import {validateStoryProgress} from './branchingStories.js';
import {validateOpportunityProgress} from './opportunitySystems.js';
import {validateBalanceProgress} from './balanceSystems.js';
import {validateLifeGoalProgress} from './lifeGoals.js';
import {validateConsequenceProgress} from './consequenceSystems.js';
import {validateEraProgress} from './eraSystems.js';
import {validateSurpriseProgress} from './surpriseSystems.js';
import {validateDailySchedule} from './dailySchedule.js';
import {validateStudentBalance} from './studentBalance.js';
/** 第7段階：ローカル保存。外部送信なし。保存データは実行可能コードとして扱わない。 */
export const SAVE_PREFIX = 'gls:v7:';
export const SLOT_IDS = Object.freeze(['自動保存','手動保存1','手動保存2','手動保存3','人生記録']);
const copy = value => JSON.parse(JSON.stringify(value));
export function checksum(text) {
  let hash=2166136261;
  for(let i=0;i<text.length;i++){hash=Math.imul(hash^text.charCodeAt(i),16777619)>>>0;}
  return hash.toString(16).padStart(8,'0');
}
export function validateGameState(s) {
  if(!s || typeof s!=='object' || Array.isArray(s) || s.schemaVersion!==7 || typeof s.initialized!=='boolean') return false;
  const t=s.timeline;
  if(!t || !Number.isInteger(t.year) || t.year<2000 || t.year>2200 || !Number.isInteger(t.month) || t.month<1 || t.month>12 || !Number.isInteger(t.turnsElapsed) || t.turnsElapsed<0 || !Number.isInteger(t.ageYears) || t.ageYears<0 || t.ageYears>200) return false;
  if(s.turnActions!==undefined&&!validateTurnActionBudget(s.turnActions,t))return false;
  if(s.monthlyRoutines!==undefined&&!validateMonthlyRoutines(s.monthlyRoutines))return false;
  if(s.businessTurn!==undefined&&!validateBusinessTurn(s.businessTurn,t.turnsElapsed))return false;
  if(s.storyProgress!==undefined && !validateStoryProgress(s.storyProgress))return false;
  if(s.opportunity47!==undefined && !validateOpportunityProgress(s.opportunity47))return false;
  if(s.balance48!==undefined && !validateBalanceProgress(s.balance48))return false;
  if(s.lifeGoal49!==undefined && !validateLifeGoalProgress(s.lifeGoal49))return false;
  if(s.legacy51!==undefined && !validateConsequenceProgress(s.legacy51))return false;
  if(s.surprise53!==undefined && !validateSurpriseProgress(s.surprise53))return false;
  if(s.daily54!==undefined && !validateDailySchedule(s.daily54))return false;
  if(!s.initialized) return true;
  if(!s.player || typeof s.player.name!=='string' || !s.player.name.trim() || s.player.name.length>30 || s.player.birth?.year!==2000 || !Number.isInteger(s.player.birth?.month) || s.player.birth.month<1 || s.player.birth.month>12 || !Number.isInteger(s.player.birth?.day) || s.player.birth.day<1 || s.player.birth.day>new Date(Date.UTC(2000,s.player.birth.month,0)).getUTCDate() || !s.finances || !s.health || !s.world || !s.education || !Array.isArray(s.people) || !Array.isArray(s.pendingEvents) || !Array.isArray(s.eventHistory)) return false;
  if(!s.random || !Number.isSafeInteger(s.random.seed) || s.random.seed<0 || s.random.seed>0xffffffff) return false;
  const finite = value => typeof value==='number' && Number.isFinite(value);
  if(!['cash','investment','debt','monthlyBudget'].every(k=>finite(s.finances[k]) && s.finances[k]>=0)) return false;
  if(!validateLiving(s.finances.living))return false;
  if(s.finances.vehicle!==undefined&&s.finances.vehicle!==null){
    const v=s.finances.vehicle;
    if(!v||!['compact','economy','family','hybrid'].includes(v.id)||!Number.isSafeInteger(v.value)||v.value<0||v.value>100000000||!Number.isSafeInteger(v.months)||v.months<0||v.months>3000)return false;
  }
  if(s.finances.vehicles!==undefined){
    const all=[s.finances.vehicle,...s.finances.vehicles].filter(Boolean);
    if(!Array.isArray(s.finances.vehicles)||all.length>5||new Set(all.map(v=>v.fleetId)).size!==all.length)return false;
    if(!all.every(v=>v&&['compact','economy','family','hybrid'].includes(v.id)&&Number.isSafeInteger(v.value)&&v.value>=0&&v.value<=100000000&&Number.isSafeInteger(v.months)&&v.months>=0&&v.months<=3000&&
      (v.fleetId===undefined||(Number.isSafeInteger(v.fleetId)&&v.fleetId>=1&&v.fleetId<=1000000))))return false;
  }
  if(s.finances.nextVehicleId!==undefined&&(!Number.isSafeInteger(s.finances.nextVehicleId)||s.finances.nextVehicleId<1||s.finances.nextVehicleId>1000000||
    s.finances.nextVehicleId<=Math.max(0,...[s.finances.vehicle,...(s.finances.vehicles??[])].filter(Boolean).map(v=>v.fleetId??0))))return false;
  if(s.finances.investmentHoldings!==undefined){
    const list=s.finances.investmentHoldings;
    if(!Array.isArray(list)||list.length>5||new Set(list.map(x=>x?.id)).size!==list.length||!list.every(x=>x&&['deposit','bond','index','stock','reit'].includes(x.id)&&Number.isSafeInteger(x.value)&&x.value>=0&&x.value<=1000000000))return false;
    if(list.reduce((sum,x)=>sum+x.value,0)>s.finances.investment)return false;
  }
  if(s.finances.sideJob?.jobId!==undefined){
    const j=s.finances.sideJob;
    if(!['retail','cafe','tutor','delivery','remote','design'].includes(j.jobId)||!Number.isSafeInteger(j.hours)||j.hours<0||j.hours>240||!Number.isSafeInteger(j.hourlyWage)||j.hourlyWage<0||j.hourlyWage>50000)return false;
  }
  if(s.world.era52!==undefined&&!validateEraProgress(s.world.era52))return false;
  if(s.world.employmentSupport!==undefined){
    const x=s.world.employmentSupport;
    if(!x||!Number.isSafeInteger(x.lastIndex)||x.lastIndex< -1||x.lastIndex>26412||!Number.isSafeInteger(x.sessions)||x.sessions<0||x.sessions>10000)return false;
  }
  if(s.world.laborMarket!==undefined){
    const x=s.world.laborMarket;
    if(!x||!Number.isSafeInteger(x.openings)||x.openings<0||x.openings>24||!(x.previousOpenings===null||Number.isSafeInteger(x.previousOpenings)&&x.previousOpenings>=0&&x.previousOpenings<=24))return false;
  }
  const career=s.finances.career,business=s.finances.business;
  if(!career || !business || typeof career!=='object' || typeof business!=='object')return false;
  if(s.finances.companyMarket!==undefined && (!Array.isArray(s.finances.companyMarket)||s.finances.companyMarket.length!==6||!s.finances.companyMarket.every(c=>c&&typeof c.id==='string'&&typeof c.name==='string'&&typeof c.sector==='string'&&Number.isInteger(c.performance)&&c.performance>=0&&c.performance<=100&&Number.isInteger(c.staffCount)&&c.staffCount>=0&&c.staffCount<=500&&Number.isInteger(c.openings)&&c.openings>=0&&c.openings<=4&&['成長','縮小','横ばい'].includes(c.trend)&&Array.isArray(c.history)&&c.history.length<=24&&c.history.every(h=>Number.isInteger(h.year)&&Number.isInteger(h.month)&&h.month>=1&&h.month<=12&&Number.isInteger(h.performance)&&h.performance>=0&&h.performance<=100))))return false;
  // 第14段階の新形式は厳格に検証。旧形式の財務項目がない場合は読込時に補完。
  if(s.finances.companyMarket?.some(c=>{
    const financeKeys=['cash','revenue','costs','profit','distressMonths','status','financeHistory'];
    const present=financeKeys.filter(k=>c[k]!==undefined);
    if(present.length===0)return false;
    if(present.length!==financeKeys.length)return true;
    if(!['cash','revenue','costs'].every(k=>Number.isSafeInteger(c[k])&&c[k]>=0&&c[k]<=1000000000))return true;
    if(!Number.isSafeInteger(c.profit)||c.profit< -1000000000||c.profit>1000000000)return true;
    if(!Number.isInteger(c.distressMonths)||c.distressMonths<0||c.distressMonths>10000)return true;
    if(!['通常','経営危機','営業停止'].includes(c.status))return true;
    if(!Array.isArray(c.financeHistory)||c.financeHistory.length>24)return true;
    return !c.financeHistory.every(h=>h&&Number.isInteger(h.year)&&h.year>=2000&&h.year<=2200&&Number.isInteger(h.month)&&h.month>=1&&h.month<=12&&['revenue','costs','cash'].every(k=>Number.isSafeInteger(h[k])&&h[k]>=0&&h[k]<=1000000000)&&Number.isSafeInteger(h.profit)&&Math.abs(h.profit)<=1000000000&&['通常','経営危機','営業停止'].includes(h.status));
  }))return false;
  if(career.workplacePeople!==undefined&&career.workplacePeople.some(p=>(p.personality!==undefined&&!['慎重','協調的','積極的'].includes(p.personality))||(p.skill!==undefined&&(!Number.isInteger(p.skill)||p.skill<0||p.skill>100))))return false;
  if(career.rank!==undefined && (!Number.isInteger(career.rank)||career.rank<1||career.rank>5))return false;
  if(career.plan!==undefined&&!['balanced','specialist','leadership'].includes(career.plan))return false;
  if(career.applications!==undefined && (!Array.isArray(career.applications)||career.applications.length>40||!career.applications.every(a=>a&&typeof a.company==='string'&&typeof a.job==='string'&&Number.isInteger(a.score)&&a.score>=0&&a.score<=100&&typeof a.passed==='boolean')))return false;
  if(career.workplacePeople!==undefined&&(!Array.isArray(career.workplacePeople)||career.workplacePeople.length>10||!career.workplacePeople.every(p=>p&&/^WORK-[0-9]+$/.test(p.id)&&typeof p.name==='string'&&p.name.length<=30&&['上司','同僚'].includes(p.role)&&Number.isInteger(p.trust)&&p.trust>=0&&p.trust<=100)))return false;
  if(career.workplaceIncidents!==undefined&&(!Array.isArray(career.workplaceIncidents)||career.workplaceIncidents.length>12||!career.workplaceIncidents.every(p=>p&&typeof p.id==='string'&&p.id.length<=60&&typeof p.title==='string'&&p.title.length<=80&&typeof p.resolved==='boolean')))return false;
  if(career.monthlyRating!==undefined&&(!Number.isInteger(career.monthlyRating)||career.monthlyRating<0||career.monthlyRating>100))return false;
  for(const key of ['unemploymentMonths','benefitMonths','previousSalary','searchEffort']){
    if(career[key]!==undefined&&(!Number.isSafeInteger(career[key])||career[key]<0||career[key]>(key==='previousSalary'?100000000:10000)))return false;
  }
  if(career.benefitMonths!==undefined&&career.benefitMonths>6)return false;
  if(career.benefitEligible!==undefined&&typeof career.benefitEligible!=='boolean')return false;
  if(career.insuredMonths!==undefined&&(!Number.isInteger(career.insuredMonths)||career.insuredMonths<0||career.insuredMonths>10000))return false;
  for(const k of ['loanBalance','loanInterestPaid','equipmentValue','monthlyRepayment','equipmentDepreciation','loanApplications'])if(business[k]!==undefined&&(!Number.isSafeInteger(business[k])||business[k]<0||business[k]>1000000000))return false;
  for(const k of ['loanDueIndex','loanOverdueMonths','nextEquipmentId'])if(business[k]!==undefined&&(!Number.isSafeInteger(business[k])||business[k]<0||business[k]>1000000))return false;
  if(business.nextLoanId!==undefined&&(!Number.isSafeInteger(business.nextLoanId)||business.nextLoanId<1||business.nextLoanId>1000000))return false;
  if(business.loanContracts!==undefined){
    if(!Array.isArray(business.loanContracts)||business.loanContracts.length>100)return false;
    const ids=new Set();
    for(const c of business.loanContracts){
      if(!c||!['id','principal','original','borrowedIndex','dueIndex','overdueMonths','ratePermille'].every(k=>Number.isSafeInteger(c[k])&&c[k]>=0&&c[k]<=1000000000)||c.id<1||c.ratePermille>100||c.principal>c.original||ids.has(c.id))return false;
      if(c.monthlyTarget!==undefined&&(!Number.isSafeInteger(c.monthlyTarget)||c.monthlyTarget<0||c.monthlyTarget>500000))return false;
      ids.add(c.id);
    }
    if(business.loanBalance!==undefined&&business.loanContracts.reduce((sum,c)=>sum+c.principal,0)!==business.loanBalance)return false;
  }
  if(business.loanPaymentHistory!==undefined&&(!Array.isArray(business.loanPaymentHistory)||business.loanPaymentHistory.length>120||!business.loanPaymentHistory.every(x=>x&&Number.isInteger(x.year)&&x.year>=2000&&x.year<=2200&&Number.isInteger(x.month)&&x.month>=1&&x.month<=12&&Number.isSafeInteger(x.contractId)&&x.contractId>0&&Number.isSafeInteger(x.amount)&&x.amount>0&&x.amount<=2000000&&['手動返済','自動返済'].includes(x.kind))))return false;
  if(business.loanScheduleHistory!==undefined&&(!Array.isArray(business.loanScheduleHistory)||business.loanScheduleHistory.length>120||!business.loanScheduleHistory.every(x=>x&&Number.isSafeInteger(x.year)&&x.year>=2000&&x.year<=2200&&Number.isSafeInteger(x.month)&&x.month>=1&&x.month<=12&&Number.isSafeInteger(x.contractId)&&x.contractId>0&&['planned','actual'].every(k=>Number.isSafeInteger(x[k])&&x[k]>=0&&x[k]<=2000000))))return false;
  if(business.creditScore!==undefined&&(!Number.isInteger(business.creditScore)||business.creditScore<0||business.creditScore>100))return false;
  if(business.equipmentItems!==undefined&&(!Array.isArray(business.equipmentItems)||business.equipmentItems.length>100||!business.equipmentItems.every(x=>x&&Number.isSafeInteger(x.id)&&x.id>0&&typeof x.name==='string'&&x.name.length<=80&&['bookValue','originalValue','remainingMonths'].every(k=>Number.isSafeInteger(x[k])&&x[k]>=0&&x[k]<=100000000))))return false;
  if(business.equipmentItems?.some(x=> (x.type!==undefined&&!['標準設備','事務機器','製造機械','車両','店舗設備'].includes(x.type))|| ['usefulMonths','elapsedMonths'].some(k=>x[k]!==undefined&&(!Number.isSafeInteger(x[k])||x[k]<0||x[k]>240)) || (x.usefulMonths!==undefined&&x.usefulMonths<12)))return false;
  if(business.equipmentItems?.some(x=>(x.condition!==undefined&&(!Number.isSafeInteger(x.condition)||x.condition<0||x.condition>100))||(x.broken!==undefined&&typeof x.broken!=='boolean')||(x.serviceCount!==undefined&&(!Number.isSafeInteger(x.serviceCount)||x.serviceCount<0||x.serviceCount>100000))||(x.maintenance!==undefined&&typeof x.maintenance!=='boolean')||(x.repairMonths!==undefined&&(!Number.isSafeInteger(x.repairMonths)||x.repairMonths<0||x.repairMonths>12))))return false;
  if(business.equipmentItems?.length && business.equipmentItems.reduce((sum,x)=>sum+x.bookValue,0)!==business.equipmentValue)return false;
  if(business.businessLedger!==undefined&&(!Array.isArray(business.businessLedger)||business.businessLedger.length>240||!business.businessLedger.every(x=>x&&Number.isInteger(x.year)&&x.year>=2000&&x.year<=2200&&Number.isInteger(x.month)&&x.month>=1&&x.month<=12&&typeof x.label==='string'&&x.label.length<=100&&Number.isSafeInteger(x.amount)&&Math.abs(x.amount)<=1000000000)))return false;
  if(career.searchEffort!==undefined&&career.searchEffort>3)return false;
  if(business.ownerDraws!==undefined&&(!Number.isSafeInteger(business.ownerDraws)||business.ownerDraws<0||business.ownerDraws>1000000000))return false;
  if(career.unemploymentCount!==undefined&&(!Number.isSafeInteger(career.unemploymentCount)||career.unemploymentCount<0||career.unemploymentCount>1000))return false;
  if(s.finances.companyMarket?.some(c=>
    (c.haltedMonths!==undefined&&(!Number.isInteger(c.haltedMonths)||c.haltedMonths<0||c.haltedMonths>12))||
    (c.recoveries!==undefined&&(!Number.isInteger(c.recoveries)||c.recoveries<0||c.recoveries>500))
  ))return false;
  if(business.operatingCash!==undefined&&(!Number.isSafeInteger(business.operatingCash)||business.operatingCash<0||business.operatingCash>1000000000))return false;
  if(business.operatingDebt!==undefined&&(!Number.isSafeInteger(business.operatingDebt)||business.operatingDebt<0||business.operatingDebt>1000000000))return false;
  if(business.lossMonths!==undefined&&(!Number.isInteger(business.lossMonths)||business.lossMonths<0||business.lossMonths>10000))return false;
  if(business.status!==undefined&&!['未設立','営業中','休業','廃業'].includes(business.status))return false;
  if(business.cashFlowHistory!==undefined&&(!Array.isArray(business.cashFlowHistory)||business.cashFlowHistory.length>24||!business.cashFlowHistory.every(h=>h&&Number.isInteger(h.year)&&h.year>=2000&&h.year<=2200&&Number.isInteger(h.month)&&h.month>=1&&h.month<=12&&['revenue','costs','cash'].every(k=>Number.isSafeInteger(h[k])&&h[k]>=0&&h[k]<=1000000000)&&Number.isSafeInteger(h.profit)&&Math.abs(h.profit)<=1000000000&&['営業中','休業'].includes(h.status))))return false;
  if(business.marketHistory!==undefined&&(!Array.isArray(business.marketHistory)||business.marketHistory.length>36))return false;
  if(business.employees!==undefined && (!Number.isInteger(business.employees)||business.employees<0||business.employees>20))return false;
  if(business.policy!==undefined && !['安定','成長','節約'].includes(business.policy))return false;
  if(['performance','supervisorTrust','coworkerTrust'].some(k=>career[k]!==undefined&&(!Number.isInteger(career[k])||career[k]<0||career[k]>100)))return false;
  if(career.workplaceActions!==undefined&&(!Number.isInteger(career.workplaceActions)||career.workplaceActions<0||career.workplaceActions>2))return false;
  if(career.reviews!==undefined&&(!Array.isArray(career.reviews)||career.reviews.length>24||!career.reviews.every(r=>r&&Number.isInteger(r.score)&&r.score>=0&&r.score<=100&&typeof r.grade==='string')))return false;
  if(business.staff!==undefined&&(!Array.isArray(business.staff)||business.staff.length>20||business.staff.length!==(business.employees??0)||!business.staff.every(p=>p&&/^STAFF-[0-9]+$/.test(p.id)&&typeof p.name==='string'&&p.name.length<=30&&['skill','morale'].every(k=>Number.isInteger(p[k])&&p[k]>=0&&p[k]<=100)&&Number.isSafeInteger(p.salary)&&p.salary>=0&&p.salary<=1000000&&(p.monthsEmployed===undefined||(Number.isInteger(p.monthsEmployed)&&p.monthsEmployed>=0&&p.monthsEmployed<=2400)))))return false;
  if(business.results!==undefined&&(!Array.isArray(business.results)||business.results.length>36))return false;
  if(business.nextStaffId!==undefined&&(!Number.isSafeInteger(business.nextStaffId)||business.nextStaffId<1))return false;
  if(business.reputation!==undefined&&(!Number.isInteger(business.reputation)||business.reputation<0||business.reputation>100))return false;
  if(!['physical','mental','energy'].every(k=>finite(s.health[k]) && s.health[k]>=0 && s.health[k]<=100)) return false;
  if(!Number.isInteger(t.monthsElapsed) || t.monthsElapsed<0 || (t.year-2000)*12+t.month-1!==t.monthsElapsed) return false;
  if(t.ageYears!==t.year-2000-(t.month<s.player.birth.month?1:0) || t.turnsElapsed>t.monthsElapsed) return false;
  if(!s.education.scores || !Array.isArray(s.education.history) || !Array.isArray(s.finances.ledger))return false;
  if(!validateEducationPath(s.education)||!validateStudentBalance(s.education.studentBalance,t.turnsElapsed))return false;
  if(s.finances.ledger.length>600 || s.education.history.length>1000 || s.people.length>500) return false;
  if(!s.people.every(p=>p && typeof p.id==='string' && typeof p.name==='string' && p.name.length<=30 && typeof p.role==='string' && Number.isFinite(p.relationship) && p.relationship>=0 && p.relationship<=100 && Number.isInteger(p.birth?.year) && Number.isInteger(p.birth?.month) && p.birth.month>=1 && p.birth.month<=12))return false;
  if(!s.household || !Array.isArray(s.household.memberIds) || !s.household.memberIds.every(id=>typeof id==='string'))return false;
  if(!s.pendingEvents.every(e=>e && typeof e.id==='string' && typeof e.title==='string' && typeof e.type==='string'))return false;
  if(!s.eventHistory.every(e=>e && typeof e.id==='string' && typeof e.title==='string' && typeof e.type==='string'))return false;
  if(s.pendingEvents.length>250 || s.eventHistory.length>1200) return false;
  if(!s.ending || typeof s.ending.dead!=='boolean' || !Array.isArray(s.ending.legacy)) return false;
  if(s.ending.dead && !validateInheritance(s.ending.inheritance)) return false;
  return true;
}
export function createSaveRepository(storage) {
  if(!storage || typeof storage.getItem!=='function' || typeof storage.setItem!=='function') throw new Error('ブラウザ保存機能が使用できません。');
  const key = slot => {if(!SLOT_IDS.includes(slot)) throw new Error('保存枠が不正です。');return SAVE_PREFIX+slot;};
  const parse = raw => {
    if(!raw) return {ok:false,reason:'保存データがありません。'};
    try {
      const data=JSON.parse(raw);
      if(typeof data.payload!=='string' || checksum(data.payload)!==data.checksum) return {ok:false,reason:'保存データの整合性エラーです。'};
      const state=JSON.parse(data.payload);
      if(!validateGameState(state))return {ok:false,reason:'保存データの形式が不正か、対応外のバージョンです。'};
      return {ok:true,state:copy(state),savedAt:data.savedAt};
    }catch{return {ok:false,reason:'保存データを読み込めません。'};}
  };
  function save(slot,state) {
    if(!validateGameState(state)) return {ok:false,reason:'保存できないゲーム状態です。'};
    try {
      const id=key(slot),payload=JSON.stringify(state),savedAt=new Date().toISOString();
      const previous=storage.getItem(id);
      if(previous && parse(previous).ok) storage.setItem(id+':予備',previous);
      storage.setItem(id,JSON.stringify({version:7,savedAt,checksum:checksum(payload),payload}));
      return {ok:true,savedAt};
    }catch{return {ok:false,reason:'保存に失敗しました。ブラウザの保存容量や設定を確認してください。'};}
  }
  function load(slot,{recover=true}={}) {
    try {
      const id=key(slot),primary=parse(storage.getItem(id));
      if(primary.ok) return {...primary,recovered:false};
      if(recover){const spare=parse(storage.getItem(id+':予備'));if(spare.ok)return {...spare,recovered:true};}
      return primary;
    }catch{return {ok:false,reason:'保存データを読み込めません。'};}
  }
  function clear(slot) {try {const id=key(slot);storage.removeItem(id);storage.removeItem(id+':予備');return {ok:true};}catch{return {ok:false,reason:'保存枠を消去できません。'};}}
  function list() {return SLOT_IDS.map(slot=>{const entry=load(slot);return {slot,available:entry.ok,savedAt:entry.ok?entry.savedAt:null,recovered:entry.recovered??false};});}
  return Object.freeze({save,load,list,clear});
}
