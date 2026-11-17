/** Midlife completion is a separate milestone, not the death/end state. Saves remain v7. */
import {estateBreakdown} from './estateSystems.js';
import {evaluateDream,getAchievements} from './lifeGoals.js';
const clamp=(n,min=0,max=20)=>Math.max(min,Math.min(max,Math.round(n)));
const average=a=>a.length?a.reduce((sum,x)=>sum+x,0)/a.length:0;
export const SENIOR_CLEAR_AGE=60;
export const SENIOR_CLEAR_SCORE=60;
export function seniorClearAssessment(state){
 const age=state?.timeline?.ageYears??0;
 if(!state?.initialized)return {eligible:false,cleared:false,score:0,required:SENIOR_CLEAR_SCORE,breakdown:[],age};
 const f=state.finances??{},career=f.career??{},health=state.health??{};
 const experience=Math.max(career.experience??0,career.insuredMonths??0,(career.jobChanges??0)*18,(career.promotions??0)*36);
 const work=clamp((experience+(career.job||f.business?.active?24:0))/180*20);
 const net=estateBreakdown(f).netAssets;
 const financial=clamp((net+300000)/6000000*20);
 const wellness=clamp(((health.physical??0)+(health.mental??0))/2/100*20);
 const other=(state.people??[]).filter(p=>p.role!=='本人');
 const relation=clamp(average(other.map(p=>p.relationship))/100*20);
 const dream=evaluateDream(state),awards=getAchievements(state).filter(a=>a.earned).length;
 const achievement=clamp((dream?.done??0)/3*12+Math.min(1,awards/12)*8);
 const breakdown=[
  {label:'仕事・経験',score:work},{label:'家計・資産',score:financial},
  {label:'健康と心',score:wellness},{label:'人とのつながり',score:relation},
  {label:'夢と実績',score:achievement},
 ];
 const score=breakdown.reduce((sum,x)=>sum+x.score,0);
 const strongAreas=breakdown.filter(x=>x.score>=10).length;
 return {eligible:age>=SENIOR_CLEAR_AGE,cleared:Boolean(state.seniorClear),age,score,required:SENIOR_CLEAR_SCORE,
  strongAreas,breakdown,record:state.seniorClear??null,canClear:age>=SENIOR_CLEAR_AGE&&score>=SENIOR_CLEAR_SCORE&&strongAreas>=3,
  remainingYears:Math.max(0,SENIOR_CLEAR_AGE-age)};
}
export function recordSeniorClear(state){
 if(state.seniorClear||state.ending?.dead)return null;
 const assessment=seniorClearAssessment(state);
 if(!assessment.canClear)return null;
 const t=state.timeline;
 state.seniorClear={year:t.year,month:t.month,age:t.ageYears,score:assessment.score,breakdown:assessment.breakdown.map(x=>({...x}))};
 return state.seniorClear;
}
export function validateSeniorClear(x){
 if(x===undefined||x===null)return true;
 return x&&typeof x==='object'&&!Array.isArray(x)&&
  Number.isInteger(x.year)&&x.year>=2000&&x.year<=2200&&Number.isInteger(x.month)&&x.month>=1&&x.month<=12&&
  Number.isInteger(x.age)&&x.age>=60&&x.age<=200&&Number.isInteger(x.score)&&x.score>=60&&x.score<=100&&
  Array.isArray(x.breakdown)&&x.breakdown.length===5&&x.breakdown.every(b=>b&&typeof b.label==='string'&&b.label.length<=30&&Number.isInteger(b.score)&&b.score>=0&&b.score<=20)&&
  x.breakdown.reduce((sum,b)=>sum+b.score,0)===x.score;
}
