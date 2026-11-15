import {calculateInheritance} from './estateSystems.js';
import {createLivingData, ensureLiving, ensureMortgage, livingAction, getHousingEquity} from './livingSystems.js';
import {ensureCompanyMarket,advanceCompanyMarket,supportRebuilding} from './companySystems.js';
import {ensureWorkplace,workplaceAction,advanceWorkplace} from './workplaceSystems.js';
import {careerAction} from './careerSystems.js';
import {socialAction,advanceFamily,familyActivity} from './socialSystems.js';
import {validateGameState} from './saveSystems.js';
import {createHealthData,advanceHealth,healthAction} from './healthSystems.js';
import {createWorldData,updateWorld,updateLaborMarket,requestEmploymentSupport} from './worldSystems.js';
import {createChoiceEvent,resolveChoice} from './eventSystems.js';
import {createStoryEvent,resolveStoryChoice} from './storyEvents.js';
import {createStoryProgress,ensureStoryProgress} from './branchingStories.js';
import { createEconomyData, advanceEconomy, economyAction } from './economySystems.js';
import { createLifeData, advanceEducation, study, socialize, gainSkill, prepareExam, chooseSchool } from './lifeSystems.js';
/** PHASE 3: game-domain store. Independent of presentation and navigation. */
const MAX_YEAR = 2200;
function freezeDeep(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}
const clone = value => JSON.parse(JSON.stringify(value));
function validateSeed(seed) {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) throw new RangeError('乱数シードは0～4294967295の整数が必要です');
  return seed >>> 0;
}
export function nextRandom(seed) {
  const nextSeed = (Math.imul(1664525, validateSeed(seed)) + 1013904223) >>> 0;
  return Object.freeze({ seed: nextSeed, value: nextSeed / 4294967296 });
}
// Reuse the same progression limit for optional development actions.
function modestProgress(value, amount) {
  if (amount <= 0) return Math.max(0,Math.min(100,value+amount));
  const gain=value>=90?1:value>=80?Math.max(1,Math.ceil(amount*.4)):value>=65?Math.max(1,Math.ceil(amount*.65)):amount;
  return Math.max(Math.min(100,value),Math.min(95,value+gain));
}
function yearsOld(year, month, birth) {
  return year - birth.year - (month < birth.month ? 1 : 0);
}
function freezeSnapshot(s) { return freezeDeep(clone(s)); }
export const initialGameState = freezeSnapshot({
  schemaVersion: 7,
  initialized: false,
  timeline: { year: 2000, month: 1, ageYears: 0, turnsElapsed: 0, monthsElapsed: 0 },
  player: { id: null, name: null, birth: null },
  household: null, finances: null, health: null, world: null, people: [], relationships: [], education: null,
  pendingEvents: [], eventHistory: [],
  turnActions: {turn: 0, used: 0, lastAction: null},
  storyProgress: createStoryProgress(),
  random: { seed: 20000101, draws: 0 },
  save: { available: false, lastSavedAt: null },
  ending: { dead: false, date: null, cause: null, score: null, inheritance: null, legacy: [] },
});
/** Browser game passes interactiveChoices:true; legacy scripted simulations stay compatible. */
export function createRandomBirthday(seed) {
  const a=nextRandom(seed), b=nextRandom(a.seed);
  const month=1+Math.floor(a.value*12);
  const days=new Date(Date.UTC(2000,month,0)).getUTCDate();
  return {year:2000,month,day:1+Math.floor(b.value*days)};
}
function validBirth(birth) {
  if(!birth || birth.year!==2000 || !Number.isInteger(birth.month) || birth.month<1 || birth.month>12 || !Number.isInteger(birth.day) || birth.day<1)return false;
  return birth.day<=new Date(Date.UTC(2000,birth.month,0)).getUTCDate();
}
export function createGameStore({interactiveChoices=false} = {}) {
  let state = clone(initialGameState);
  const subscribers = new Set();
  function getState() { return freezeSnapshot(state); }
  function emit() { const snapshot = getState(); for (const listener of subscribers) listener(snapshot); }
  function startNewGame({ name = 'プレイヤー', seed = 20000101, birth = null } = {}) {
    if (state.initialized) return { ok: false, reason: 'ゲームは開始済みです。' };
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 30) return { ok: false, reason: '名前は1～30文字で入力してください。' };
    const randomSeed = validateSeed(seed);
    if(birth !== null && !validBirth(birth))return {ok:false,reason:'誕生日は2000年の正しい日付で指定してください。'};
    const birthday = birth ? {...birth} : {year:2000,month:1,day:1};
    state = clone(initialGameState);
    state.initialized = true;
    state.player = { id: 'PLAYER-001', name: name.trim(), birth: birthday };
    state.timeline.month=birthday.month;
    state.timeline.monthsElapsed=birthday.month-1;
    state.random.seed = randomSeed;
    Object.assign(state,createLifeData(name.trim()));
    state.people.find(person=>person.role==='本人').birth={...birthday};
    state.finances=createEconomyData();
    state.finances.living=createLivingData();
    ensureCompanyMarket(state.finances);
    state.health=createHealthData();
    state.world=createWorldData();
    state.household={memberIds:['PLAYER-001','FAMILY-001','FAMILY-002']};
    if(interactiveChoices){
      const draw=nextRandom(state.random.seed);
      state.random.seed=draw.seed;state.random.draws++;
      const intro=createStoryEvent({year:2000,month:birthday.month},0,0,draw.value,state.storyProgress,state);
      state.pendingEvents.push(intro);state.eventHistory.push(intro);
    }
    emit();
    return { ok: true, snapshot: getState() };
  }
  function advanceTurn() {
    if (!state.initialized) return { ok: false, reason: '最初に人生を開始してください。' };
    if (state.ending.dead) return {ok:false,reason:'人生が終了しています。人生記録を確認してください。'};
    if(interactiveChoices && state.pendingEvents.some(event=>event.type==='choice'))return {ok:false,reason:'次へ進む前に、出来事の選択肢を選んでください。'};
    if (state.timeline.year >= MAX_YEAR) return { ok: false, reason: '時間進行の上限に達しました。' };
    const t = state.timeline;
    const months = t.ageYears < 15 ? 3 : 1;
    const index = t.year * 12 + (t.month - 1) + months;
    const year = Math.floor(index / 12);
    const month = index % 12 + 1;
    if (year > MAX_YEAR) return { ok: false, reason: '時間進行の上限に達しました。' };
    const previousAge = t.ageYears;
    const age = yearsOld(year, month, state.player.birth);
    const turn = t.turnsElapsed + 1;
    const newEvents = [];
    const makeEvent = (type, title, description) => ({
      id: `T${turn}-${type}-${newEvents.length}`, type, title, description, year, month, turn, blocking: false,
    });
    if (age > previousAge) newEvents.push(makeEvent('birthday', `${age}歳の誕生日`, `${state.player.name}は${age}歳になりました。`));
    if (year > t.year) newEvents.push(makeEvent('new-year', `${year}年が始まりました`, '新しい年に入りました。'));
    if (previousAge < 15 && age >= 15) newEvents.push(makeEvent('monthly-turns', '月次ターンへ切り替え', '次のターンから1か月ずつ進行します。'));
    if (state.education) {
      const educationEvents=advanceEducation(state.education,t,{year,month},turn);
      for (const item of educationEvents) newEvents.push(makeEvent(item.type,item.title,item.description));
    }
    if (state.finances) {
      for(let step=1;step<=months;step++){
        const idx=t.year*12+t.month-1+step;
        const date={year:Math.floor(idx/12),month:idx%12+1};
        const monthAge=yearsOld(date.year,date.month,state.player.birth);
        const worldDraw=nextRandom(state.random.seed);
        state.random.seed=worldDraw.seed;state.random.draws++;
        const worldEvents=updateWorld(state.world,date,worldDraw.value);
        for(const item of worldEvents)newEvents.push(makeEvent(item.type,item.title,item.description));
        const healthDraw=nextRandom(state.random.seed);
        state.random.seed=healthDraw.seed;state.random.draws++;
        const healthEvents=advanceHealth(state.health,date,monthAge,healthDraw.value);
        for(const item of healthEvents)newEvents.push(makeEvent(item.type,item.title,item.description));
        const prior={year:date.month===1?date.year-1:date.year,month:date.month===1?12:date.month-1};
        const financeEvents=advanceEconomy(state.finances,prior,1,state.player.birth,state.world);
        advanceWorkplace(state.finances,date);
        advanceCompanyMarket(state.finances,date,state.world?.phase);
        const jobNews=updateLaborMarket(state.world,state.finances.companyMarket,date);
        if(jobNews)newEvents.push(makeEvent(jobNews.type,jobNews.title,jobNews.description));
        const career=state.finances.career;
        const employer=state.finances.companyMarket.find(c=>c.name===career.company);
        if(career.job&&employer?.status==='営業停止'){
          const previousCompany=career.company;
          career.previousSalary=career.monthlySalary;career.benefitEligible=career.benefitEligible!==false;career.insuredMonths=0;career.unemploymentMonths=0;career.benefitMonths=0;career.searchEffort=0;career.job=null;career.company=null;career.monthlySalary=0;career.experience=0;
          career.unemploymentCount=(career.unemploymentCount??0)+1;
          const reason=`${previousCompany}が営業を停止したため失業しました。別の企業へ応募できます。`;
          state.finances.ledger.push({year:date.year,month:date.month,kind:'記録',label:reason,amount:0});
          if(state.finances.ledger.length>600)state.finances.ledger.shift();
          newEvents.push(makeEvent('job-loss','勤務先の営業停止',reason));
        }
        for(const item of financeEvents)newEvents.push(makeEvent(item.type,item.title,item.description));
        const choiceDraw=nextRandom(state.random.seed);
        state.random.seed=choiceDraw.seed;state.random.draws++;
        if(!interactiveChoices){
          const choice=createChoiceEvent(date,turn,monthAge,choiceDraw.value);
          if(choice)newEvents.push(choice);
        }
      }
    }
    for(const event of advanceFamily(state,{year,month}))newEvents.push(makeEvent(event.type,event.title,event.description));
    state.timeline = { year, month, ageYears: age, turnsElapsed: turn, monthsElapsed: t.monthsElapsed + months };
    state.turnActions = {turn,used:0,lastAction:null};
    // 40歳以降は健康・年齢に応じた死亡リスク。110歳時点で寿命終了。
    if(age>=40){
      const mortality=nextRandom(state.random.seed);
      state.random.seed=mortality.seed;state.random.draws++;
      const risk=age>=110?1:Math.min(.30,Math.pow(Math.max(0,age-39)/95,4)*.12+((state.health?.physical ?? 100)<30 ? .002 : 0));
      if(mortality.value<risk) {
        const cause=age>=110?'寿命':state.health?.physical<30?'健康状態の悪化':'加齢に伴う死亡';
        const inheritance=calculateInheritance(state.finances,state.people);
        const net=inheritance.netAssets;
        const score=Math.max(0,Math.round(age*.6 + (state.education?.studyHours??0)*.03 + Math.min(net/1000000,100) + (state.health?.mental??0)*.2));
        state.ending={dead:true,date:{year,month,age},cause,score,inheritance,legacy:[{year,month,title:`${state.player.name}の人生記録`,description:`${age}歳で人生を終えました。人生評価：${score}点。`}]};
        newEvents.push(makeEvent('death','人生の終了',`${age}歳で人生を終えました。人生記録と相続結果を確認できます。`));
      }
    }
    if(interactiveChoices && !state.ending.dead){
      const draw=nextRandom(state.random.seed);
      state.random.seed=draw.seed;state.random.draws++;
      newEvents.push(createStoryEvent({year,month},turn,age,draw.value,state.storyProgress,state));
      // Passive notifications remain in history but do not clutter the next turn.
      state.pendingEvents=state.pendingEvents.filter(event=>event.type==='choice');
    }
    // イベント生成順序と乱数状態を保存・再現します。
    state.pendingEvents.push(...newEvents);
    if(state.pendingEvents.length>250)state.pendingEvents.splice(0,state.pendingEvents.length-250);
    state.eventHistory.push(...newEvents);
    if(state.eventHistory.length>1200)state.eventHistory.splice(0,state.eventHistory.length-1200);
    emit();
    return { ok: true, months, events: freezeSnapshot(newEvents), snapshot: getState() };
  }
  function acknowledgeEvent(id) {
    const index = state.pendingEvents.findIndex(event => event.id === id);
    if (index < 0) return false;
    if(state.pendingEvents[index].type==='choice')return false;
    state.pendingEvents.splice(index, 1);
    emit();
    return true;
  }
  function performAction(action, payload={}) {
    if (!state.initialized) return {ok:false,reason:'人生を開始してください。'};
    if(state.ending.dead)return {ok:false,reason:'人生終了後は操作できません。'};
    // One optional manual decision per turn, in addition to the mandatory story choice.
    // Enforced in the store, not just by disabling UI controls: cannot be bypassed by clicks.
    if (interactiveChoices && action !== 'resolveChoice') {
      if (state.pendingEvents.some(e => e.type === 'choice'))
        return {ok:false,reason:'先に今の出来事を選んでください。'};
      if ((state.turnActions?.turn === state.timeline.turnsElapsed ? state.turnActions.used : 0) >= 1)
        return {ok:false,reason:'このターンの自由行動は終了しました。次のターンで再び行動できます。'};
    }
    const beforeDevelopment = interactiveChoices && action !== 'resolveChoice'
      ? {scores:{...state.education.scores},skills:{...state.education.skills},relations:Object.fromEntries(state.people.map(p=>[p.id,p.relationship]))} : null;
    let result;
    switch(action){
      case 'enableAccurateMortgage': case 'requestPensionExemption': case 'setInsuranceClaimCap': case 'setPensionMode': case 'backPayPension': case 'moveHome': case 'clearMortgageArrears': case 'repayMortgage': case 'setInsurance': case 'claimInsurance': case 'repairHome':
        result=livingAction(state.finances,state.health,action,payload,{age:state.timeline.ageYears,date:state.timeline});break;
      case 'employmentSupport': result=requestEmploymentSupport(state.world,state.finances.career,state.timeline,state.timeline.ageYears);break;
      case 'supportRebuilding': result=supportRebuilding(state.finances,payload.companyId,state.timeline);break;
      case 'applyJob': case 'promotionExam': case 'hireEmployee': case 'businessPolicy':
        result=careerAction(state.finances,action,payload,{age:state.timeline.ageYears,education:state.education,date:state.timeline,world:state.world});break;
      case 'interactCoworker': case 'resolveWorkIncident': case 'workHard': case 'helpColleague': case 'talkSupervisor': case 'reviewPerformance': case 'trainStaff': case 'dismissStaff': case 'staffCare':
        result=workplaceAction(state.finances,action,payload,state.timeline);break;
      case 'setLoanRepayment': case 'settleBusinessPayable': case 'businessLoan': case 'repayBusinessLoan': case 'purchaseEquipment': case 'sellEquipment': case 'findJob': case 'resign': case 'sideJob': case 'startBusiness': case 'closeBusiness': case 'businessFunding': case 'ownerDraw': case 'jobSearch': case 'restartBusiness': case 'setBudget': case 'buyInvestment': case 'sellInvestment': case 'repayDebt':
        result=economyAction(state.finances,action,payload,{age:state.timeline.ageYears,education:state.education,date:state.timeline});break;
      case 'habit': case 'treatment': result=healthAction(state.health,action,payload,state.timeline,state.finances);break;
      case 'resolveChoice': result=state.pendingEvents.some(e=>e.id===payload.eventId && e.story) ? resolveStoryChoice(state,payload.eventId,payload.choice) : resolveChoice(state,payload.eventId,payload.choice);break;
      case 'meetFriend':case 'date':case 'marry':case 'haveChild':case 'familyCare': result=socialAction(state,action,payload);break;
      case 'prepareExam': result=prepareExam(state.education);break;
      case 'chooseSchool': result=chooseSchool(state.education,payload.stage,payload.school);break;
      case 'familyActivity': result=familyActivity(state,payload);break;
      case 'study': result=study(state.education,payload.subject,payload.hours);break;
      case 'socialize': result=socialize(state.people,payload.personId);break;
      case 'skill': result=gainSkill(state.education,payload.skill);break;
      case 'university':
        if (state.timeline.ageYears<15 || state.education.stage==='卒業') result={ok:false,reason:'進路を選択できる期間ではありません。'};
        else if (!['進学','就職'].includes(payload.choice)) result={ok:false,reason:'進路の選択が不正です。'};
        else {state.education.universityChoice=payload.choice;result={ok:true};}
        break;
      default: result={ok:false,reason:'未対応の操作です。'};
    }
    if(result.ok){
      if (interactiveChoices && action !== 'resolveChoice') {
        // Less growth as proficiency rises; routine actions don't create perfect scores.
        for (const [key,oldValue] of Object.entries(beforeDevelopment.scores)) {
          const value=state.education.scores[key];
          if (Number.isFinite(value) && value > oldValue) state.education.scores[key] = modestProgress(oldValue,value-oldValue);
        }
        for (const [key,value] of Object.entries(state.education.skills)) {
          const oldValue=beforeDevelopment.skills[key]??0;
          if (Number.isFinite(value) && value>oldValue) state.education.skills[key] = modestProgress(oldValue,value-oldValue);
        }
        for (const person of state.people) {
          const oldValue=beforeDevelopment.relations[person.id];
          if (Number.isFinite(oldValue) && person.relationship > oldValue) person.relationship=modestProgress(oldValue,person.relationship-oldValue);
        }
        state.turnActions={turn:state.timeline.turnsElapsed,used:1,lastAction:action};
      }
      if(action!=='resolveChoice')state.eventHistory.push({id:`A${state.timeline.turnsElapsed}-${state.eventHistory.length}`,type:'action',title:action==='habit'?'生活習慣':action==='treatment'?'治療':action==='resolveChoice'?'人生選択':action==='study'?'学習':action==='socialize'?'交流':action==='skill'?'技能訓練':action==='university'?'進路選択':['meetFriend','date','marry','haveChild','familyCare'].includes(action)?'人物関係':action==='prepareExam'?'受験準備':action==='chooseSchool'?'志望校選択':action==='familyActivity'?'子育て':'経済操作',description:JSON.stringify(payload),year:state.timeline.year,month:state.timeline.month,turn:state.timeline.turnsElapsed,blocking:false});
      if(state.eventHistory.length>1200)state.eventHistory.splice(0,state.eventHistory.length-1200);
      emit();
    }
    return result;
  }
  function loadState(snapshot) {
    if(!validateGameState(snapshot))return {ok:false,reason:'保存データの形式が不正です。'};
    state=clone(snapshot);
    // Older v4.3.0 saves predate the action budget; migrate without wiping progress.
    if (!state.turnActions) state.turnActions={turn:state.timeline.turnsElapsed,used:0,lastAction:null};
    ensureStoryProgress(state);
    if(state.finances){
      const c=state.finances.career,b=state.finances.business;
      for(const [key,val] of Object.entries({unemploymentMonths:0,benefitMonths:0,previousSalary:0,searchEffort:0,insuredMonths:0,benefitEligible:true}))if(c[key]===undefined)c[key]=val;
      if(b.ownerDraws===undefined)b.ownerDraws=0;
      for(const [key,val] of Object.entries({loanBalance:0,loanInterestPaid:0,equipmentValue:0,businessLedger:[],monthlyRepayment:0,equipmentDepreciation:0,loanApplications:0,loanDueIndex:0,loanOverdueMonths:0,creditScore:70,equipmentItems:[],nextEquipmentId:1,loanContracts:[],nextLoanId:1,loanPaymentHistory:[],loanScheduleHistory:[]}))if(b[key]===undefined)b[key]=val;
      for(const item of b.equipmentItems){item.condition??=100;item.broken??=false;item.serviceCount??=0;item.maintenance??=false;item.repairMonths??=0;}
      if(b.loanContracts.length===0 && b.loanBalance>0){
        b.loanContracts=[{id:1,principal:b.loanBalance,original:b.loanBalance,borrowedIndex:0,dueIndex:b.loanDueIndex||0,overdueMonths:b.loanOverdueMonths||0,ratePermille:5}];
        b.nextLoanId=2;
      }
    }
    if(state.education)state.education.schoolPreference??={高校:'自動',大学:'自動'};
    if(state.world){
      state.world.employmentSupport??={lastIndex:-1,sessions:0};
      state.world.laborMarket??={openings:0,previousOpenings:null};
    }
    if(state.finances)ensureMortgage(ensureLiving(state.finances));
    if(state.finances)ensureWorkplace(state.finances);if(state.finances)ensureCompanyMarket(state.finances);emit();return {ok:true,snapshot:getState()};
  }
  function restart() {state=clone(initialGameState);emit();return {ok:true};}
  return Object.freeze({
    loadState, restart, getState, startNewGame, advanceTurn, acknowledgeEvent, performAction,
    subscribe(listener) { subscribers.add(listener); return () => subscribers.delete(listener); },
  });
}
// Initial compatibility snapshot is intentionally not a mutable singleton.
export function getGameSnapshot() { return initialGameState; }
