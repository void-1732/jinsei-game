/** STEP 48: slower skill growth and intentional, bounded time advancement.
 * Saves remain schema v7. Unattended progress never commits a milestone choice.
 */
export const TIME_FOCUSES=Object.freeze(['balanced','health','learning','relationships','finances']);
export const FOCUS_LABELS=Object.freeze({balanced:'バランス重視',health:'健康・休養重視',learning:'勉強・技能重視',relationships:'人間関係重視',finances:'家計・仕事重視'});
export function createBalanceProgress(){return {focus:'balanced',skippedChoices:0,fastRuns:0,lastSummary:null,practice:{}};}
export function ensureBalanceProgress(s){s.balance48??=createBalanceProgress();return s.balance48;}
export function validateBalanceProgress(x){
 if(!x||typeof x!=='object'||Array.isArray(x)||!TIME_FOCUSES.includes(x.focus))return false;
 if(!Number.isSafeInteger(x.skippedChoices)||x.skippedChoices<0||x.skippedChoices>30000||!Number.isSafeInteger(x.fastRuns)||x.fastRuns<0||x.fastRuns>30000)return false;
 if(x.lastSummary!==null&&(!x.lastSummary||typeof x.lastSummary!=='object'||!Number.isInteger(x.lastSummary.turns)||x.lastSummary.turns<1||x.lastSummary.turns>12||!Number.isInteger(x.lastSummary.auto)||x.lastSummary.auto<0||x.lastSummary.auto>12||typeof x.lastSummary.reason!=='string'||x.lastSummary.reason.length>120))return false;
 if(!x.practice||typeof x.practice!=='object'||Array.isArray(x.practice)||Object.keys(x.practice).length>100)return false;
 return Object.entries(x.practice).every(([key,n])=>key.length>0&&key.length<=50&&Number.isInteger(n)&&n>=0&&n<20);
}
/** Each high-level point requires increasingly more meaningful practice. */
export function balancedGrowth(state,key,value,delta){
 const start=Math.max(0,Math.min(100,Math.round(value)));
 if(!Number.isFinite(delta)||delta<=0)return Math.max(0,Math.min(100,Math.round(start+delta)));
 if(start>=95)return start;
 if(start<75)return Math.min(95,start+Math.max(1,Math.ceil(delta*.7)));
 const progress=ensureBalanceProgress(state).practice;
 const threshold=start>=90?12:start>=85?8:5;
 const points=Math.min(19,(progress[key]??0)+Math.max(1,Math.round(delta)));
 const earned=Math.min(95-start,Math.floor(points/threshold));
 progress[key]=points-earned*threshold;
 return start+earned;
}
const VALUE_WEIGHT=Object.freeze({physical:1.2,mental:1.5,energy:1,study:1,skillValue:1,social:1.2,work:1.1,cash:1/5000});
export function chooseRoutineOption(event,state,focus='balanced'){
 if(!event?.options?.length||!TIME_FOCUSES.includes(focus))return null;
 const cash=state.finances?.cash??0;
 const eligible=event.options.filter(o=>(o.impact?.cash??0)>=-cash);
 if(!eligible.length)return null;
 const focusFactors={
   balanced:{physical:1.1,mental:1.1,energy:1.1,study:1.1,skillValue:1.1,social:1.1,work:1.1,cash:1.1},
   health:{physical:3,mental:3,energy:2.5,study:.5,skillValue:.4,social:.7,work:.4,cash:.5},
   learning:{physical:.8,mental:.9,energy:.8,study:3,skillValue:3,social:.6,work:1.2,cash:.8},
   relationships:{physical:.8,mental:1.5,energy:.8,study:.5,skillValue:.5,social:3.5,work:.6,cash:.6},
   finances:{physical:.7,mental:.8,energy:.8,study:1,skillValue:1.5,social:.5,work:2,cash:3},
 }[focus];
 let best=eligible[0],bestScore=-Infinity;
 for(const option of eligible){
   const impact=option.impact??{};
   let score=0;
   for(const [key,weight] of Object.entries(VALUE_WEIGHT)){
     const v=impact[key];if(!Number.isFinite(v))continue;
     const impactValue=key==='cash'?Math.max(-20000,Math.min(20000,v)):v;
     score+=impactValue*weight*focusFactors[key];
   }
   if(focus==='balanced'){
     if(state.health?.physical<45)score+=(impact.physical??0)*1.5;
     if(state.health?.mental<45)score+=(impact.mental??0)*1.5;
     if(cash<50000&&impact.cash<0)score+=impact.cash/1000;
   }
   if(score>bestScore){best=option;bestScore=score;}
 }
 return best;
}
export function hasImportantTurnEvent(events){
 const serious=new Set(['birthday','education','job-loss','death','illness','health-warning','promotion','new-stage','entrance','graduation','retirement']);
 return events.some(e=>e?.branch||serious.has(e?.type)||e?.type==='choice'&&!e.catalogKey);
}

/** A transparent forecast, not an invented gain of money. Housing/loans may add costs. */
export function estimateMonthlyBudget(state){
 if(!state?.initialized)return null;
 const f=state.finances,p=state.opportunity47;
 const gross=Math.max(0,(f.career.job?f.career.monthlySalary:0)+(f.sideJob?.active?f.sideJob.monthlyIncome:0));
 const tax=Math.floor(gross*.10);
 const tuition=state.education.stage==='大学'?Math.max(0,36000-(p?.education.grantMonthly??0)):0;
 const borrowing=state.education.stage==='大学'&&p?.education.funding==='loan'?tuition:0;
 const outflow=f.monthlyBudget+tuition-borrowing;
 const balance=gross-tax-outflow;
 return {gross,tax,monthlyBudget:f.monthlyBudget,tuition,borrowing,balance,debt:f.debt,
   warning:f.debt>0&&balance<0?'赤字と負債が重なる見込みです。仕事・家計・奨学金を確認してください。':balance<0?'生活費が収入を上回る見込みです。':null};
}
