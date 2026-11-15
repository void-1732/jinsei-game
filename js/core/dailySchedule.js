/** STEP 54: a single persistent weekly time plan, expressed as shares of 100.
 * Fictional gameplay model. Changing plans uses one optional action; ongoing
 * effects are applied once per simulated calendar month, including fast-forward.
 */
import {balancedGrowth} from './balanceSystems.js';
const freeze=x=>Object.freeze(x);
export const SCHEDULE_FIELDS=freeze(['work','study','home','rest','social']);
export const SCHEDULE_LABELS=freeze({work:'仕事・準備',study:'勉強',home:'家事',rest:'休養',social:'交流'});
export const TIME_PLANS=freeze([
  freeze({id:'balanced',name:'バランス型',shares:freeze([20,20,20,20,20]),note:'仕事・勉強・家事・休養・交流を均等に'}),
  freeze({id:'career',name:'仕事に集中',shares:freeze([40,15,15,15,15]),note:'仕事の評価を伸ばしやすいが、疲れがたまりやすい'}),
  freeze({id:'learning',name:'学びに集中',shares:freeze([15,40,15,15,15]),note:'学力や技能を伸ばしやすいが、休養が減る'}),
  freeze({id:'household',name:'暮らしを整える',shares:freeze([15,15,40,20,10]),note:'家事で成人後の生活費を抑えやすい'}),
  freeze({id:'rest',name:'健康・休養を優先',shares:freeze([10,10,15,50,15]),note:'疲労・ストレスの回復を重視'}),
  freeze({id:'social',name:'人とのつながり',shares:freeze([10,10,15,20,45]),note:'特定の相手と交流し、関係を育む'}),
]);
const LIMIT=100;
const clamp=(x,lower=0,upper=100)=>Math.min(upper,Math.max(lower,Math.round(x)));
export const getTimePlan=id=>TIME_PLANS.find(p=>p.id===id)??TIME_PLANS[0];
export function createDailySchedule(){return {planId:'balanced',fatigue:0,stress:0,monthsApplied:0,lastAppliedMonth:-1,savedTotal:0,studyPoints:0,workPoints:0,socialPoints:0,lastEffect:null};}
export function ensureDailySchedule(state){state.daily54??=createDailySchedule();return state.daily54;}
export function validateDailySchedule(x){
 if(!x||typeof x!=='object'||Array.isArray(x)||!TIME_PLANS.some(p=>p.id===x.planId))return false;
 if(!['fatigue','stress'].every(k=>Number.isInteger(x[k])&&x[k]>=0&&x[k]<=LIMIT))return false;
 if(!Number.isSafeInteger(x.monthsApplied)||x.monthsApplied<0||x.monthsApplied>3000)return false;
 if(!Number.isSafeInteger(x.lastAppliedMonth)||x.lastAppliedMonth< -1||x.lastAppliedMonth>26412)return false;
 if(!Number.isSafeInteger(x.savedTotal)||x.savedTotal<0||x.savedTotal>1000000000)return false;
 if(!['studyPoints','workPoints','socialPoints'].every(k=>Number.isInteger(x[k])&&x[k]>=0&&x[k]<240))return false;
 const e=x.lastEffect;
 return e===null||(e&&typeof e==='object'&&!Array.isArray(e)&&Number.isInteger(e.year)&&e.year>=2000&&e.year<=2200&&Number.isInteger(e.month)&&e.month>=1&&e.month<=12&&typeof e.summary==='string'&&e.summary.length<=180);
}
export function setDailySchedule(state,planId){
 if(state.timeline.ageYears<6)return {ok:false,reason:'生活プランは6歳から選べます。'};
 if(!TIME_PLANS.some(p=>p.id===planId))return {ok:false,reason:'生活プランを選択してください。'};
 const s=ensureDailySchedule(state);
 if(s.planId===planId)return {ok:false,reason:'すでにこのプランを選択しています。'};
 s.planId=planId;
 return {ok:true,message:`「${getTimePlan(planId).name}」に変更しました。次に進む月から反映されます。`};
}
/** Monthly benefit must not be added as free money. This discount reduces the
 * living-expense debit at the source of the existing economy calculation. */
export function monthlyHouseholdDiscount(state,date,age){
 if(age<18||!state?.daily54)return 0;
 const plan=getTimePlan(state.daily54.planId);
 const home=plan.shares[2];
 return Math.max(0,Math.min(1600,Math.floor((home-20)*40)));
}
/** Called once for each calendar month; does not consume the one manual action.
 * Does not change salary directly (existing payroll already pays the full job).
 */
export function advanceDailySchedule(state,date,age,discount=0){
 const schedule=ensureDailySchedule(state);
 const index=date.year*12+date.month-1;
 if(index<=schedule.lastAppliedMonth||age<6)return {applied:false};
 const plan=getTimePlan(schedule.planId);
 const [work,study,home,rest,social]=plan.shares;
 const formerFatigue=schedule.fatigue,formerStress=schedule.stress;
 schedule.fatigue=clamp(schedule.fatigue+(work>=35?3:work>=20?1:0)+(study>=35?2:0)-(rest>=40?7:rest>=20?2:1));
 schedule.stress=clamp(schedule.stress+(work>=35?3:0)+(study>=35?2:0)+(state.finances?.debt>300000?1:0)-(rest>=40?6:rest>=20?2:1)-(social>=40?1:0));
 const h=state.health,changes=[];
 if(schedule.fatigue>=65){h.energy=clamp(h.energy-1);changes.push('疲労で元気−1');}
 if(schedule.stress>=65){h.mental=clamp(h.mental-1);changes.push('ストレスで心−1');}
 if(schedule.fatigue>=85)h.physical=clamp(h.physical-1);
 if(rest>=40){h.energy=clamp(h.energy+1);if(schedule.stress<40)h.mental=clamp(h.mental+1);}
 schedule.studyPoints+=study;
 if(schedule.studyPoints>=200){
   schedule.studyPoints-=200;
   if(state.education){
     const inSchool=['小学校','中学校','高校','大学'].includes(state.education.stage);
     if(inSchool){
       const keys=Object.keys(state.education.scores);
       const key=keys[schedule.monthsApplied%keys.length];
       state.education.scores[key]=balancedGrowth(state,`score:${key}`,state.education.scores[key],1);
       changes.push(`${key}の学習`);
     }else{
       const key='パソコン';const old=state.education.skills[key]??0;
       state.education.skills[key]=balancedGrowth(state,`skill:${key}`,old,1);
       changes.push('技能を磨いた');
     }
   }
 }
 schedule.workPoints+=work;
 if(schedule.workPoints>=240){
   schedule.workPoints-=240;
   if(age>=18&&state.finances?.career?.job){
     const c=state.finances.career;
     if(Number.isFinite(c.performance)&&schedule.fatigue<70)c.performance=Math.min(90,c.performance+1);
     changes.push('仕事の経験が増えた');
   }
 }
 schedule.socialPoints+=social;
 if(schedule.socialPoints>=180){
   schedule.socialPoints-=180;
   const other=state.people.find(p=>p.role==='配偶者')??state.people.find(p=>p.role==='交際相手')??state.people.find(p=>['父','母','子','友人'].includes(p.role));
   if(other){other.relationship=Math.min(95,other.relationship+1);changes.push(`${other.name}と交流`);}
 }
 schedule.savedTotal=Math.min(1000000000,schedule.savedTotal+discount);
 if(discount)changes.push(`家事で生活費−${discount.toLocaleString('ja-JP')}円`);
 if(schedule.fatigue>formerFatigue)changes.push(`疲労+${schedule.fatigue-formerFatigue}`);
 if(schedule.stress>formerStress)changes.push(`ストレス+${schedule.stress-formerStress}`);
 schedule.monthsApplied++;
 schedule.lastAppliedMonth=index;
 schedule.lastEffect={year:date.year,month:date.month,summary:changes.slice(0,5).join('・')||'生活リズムを維持'};
 return {applied:true,discount,changes};
}
