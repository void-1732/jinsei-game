/** Deterministic exam outcome with real variance and one annual transfer/re-exam opportunity. */
import {admissionsForecast} from './schoolCompetition.js';
import {assignProgram} from './educationPaths.js';
const index=d=>d.year*12+d.month-1;
const roll=(date,school,attempt,seed=0)=>{
 let h=(Math.imul(index(date),2654435761)^(seed>>>0)^Math.imul(attempt,2246822519))>>>0;
 for(const c of school)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;
 return (h>>>0)/4294967296;
};
export function examOdds(education,stage,school){
 const f=admissionsForecast(education,stage,school);
 if(!f.ok)return f;
 // A comfortably strong candidate passes; a weak one can rarely surprise.
 const chance=Math.max(5,Math.min(100,Math.round(50+(f.entranceScore-f.threshold)*4)));
 return {...f,chance};
}
export function takeEntranceDecision(education,stage,school,date,seed=0,attempt=1){
 const f=examOdds(education,stage,school);
 return {...f,passed:f.ok&&roll(date,school,attempt,seed)<f.chance/100,attempt};
}
export function retryUniversityEntrance(state,{school}={}){
 const e=state.education,t=state.timeline;
 if(e.stage!=='大学'||e.grade!==1||t.ageYears<18)return {ok:false,reason:'大学1年次に限り、他大学への再受験を選べます。'};
 if(e.entrance?.retryYear===t.year)return {ok:false,reason:'この年度の再受験はすでに実施しました。'};
 if(!school||school==='自動'||school===e.school)return {ok:false,reason:'現在とは異なる再受験先を選んでください。'};
 const result=takeEntranceDecision(e,'大学',school,t,state.random.seed,2);
 if(!result.ok)return {ok:false,reason:result.reason};
 const cost=12000;
 if(state.finances.cash<cost)return {ok:false,reason:'受験費用12,000円が必要です。'};
 state.finances.cash-=cost;state.finances.totals.expenses+=cost;
 state.finances.ledger.push({year:t.year,month:t.month,kind:'支出',label:'大学再受験費用',amount:-cost});
 if(state.finances.ledger.length>600)state.finances.ledger.shift();
 e.entrance={...e.entrance,retryYear:t.year,retrySchool:school,retryPassed:result.passed};
 if(result.passed){
  e.school=school;assignProgram(e,school,t.month>=4?t.year:t.year-1);
  // preserve first-year grade and reset time served to a full course.
  e.history.push({year:t.year,month:t.month,text:school+'へ再受験・転学'});
 }else e.history.push({year:t.year,month:t.month,text:school+'の再受験不合格。現在の学校を継続'});
 if(e.history.length>100)e.history.splice(0,e.history.length-100);
 return {ok:true,passed:result.passed,message:result.passed?
   `${school}の再受験に合格しました。転学後の学費と卒業予定が変わります。`:
   `${school}は再受験不合格でした（目安${result.chance}%）。現在の学校で学業を継続します。`};
}
