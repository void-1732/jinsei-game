/** Household recovery after sustained cash shortages. General loans are not doubled. */
const idx=d=>d.year*12+d.month-1;
const clamp=n=>Math.min(100,Math.max(0,Math.round(n)));
export function validateHardship(data){
 if(data===undefined)return true;
 return data&&typeof data==='object'&&!Array.isArray(data)&&['shortageMonths','reliefMonths','lastMonth','lastReliefMonth'].every(k=>Number.isInteger(data[k])&&data[k]>=-1&&data[k]<=26412)&&
 data.shortageMonths>=0&&data.reliefMonths>=0&&['安定','注意','困窮','再建中'].includes(data.status);
}
export function hardshipSummary(state){return state.hardship??{shortageMonths:0,reliefMonths:0,lastMonth:-1,lastReliefMonth:-1,status:'安定'};}
export function advanceHardship(state,date){
 const h=state.hardship??={shortageMonths:0,reliefMonths:0,lastMonth:-1,lastReliefMonth:-1,status:'安定'};
 const i=idx(date);if(h.lastMonth>=i)return [];
 h.lastMonth=i;
 const f=state.finances,base=f.monthlyBudget??0;
 const shortage=state.timeline.ageYears>=18&&f.cash<Math.max(15000,base*.4)&&f.debt>Math.max(10000,base);
 h.shortageMonths=shortage?Math.min(1200,h.shortageMonths+1):Math.max(0,h.shortageMonths-1);
 h.status=h.shortageMonths>=3?'困窮':h.shortageMonths>=1?'注意':h.reliefMonths>0?'再建中':'安定';
 if(h.shortageMonths>=3&&i%2===0)state.health.mental=clamp(state.health.mental-1);
 if(h.shortageMonths===3)return [{type:'finance',title:'家計が困窮しています',description:'支払いに不足が続いています。就業・家計方針・住居・生活再建支援を検討してください。'}];
 if(h.shortageMonths===0&&h.reliefMonths>0)return [{type:'finance',title:'家計の再建が進みました',description:'生活を立て直し、資金の余裕が戻り始めました。'}];
 return [];
}
export function requestHouseholdRelief(state){
 if(state.timeline.ageYears<18)return {ok:false,reason:'世帯支援は18歳から申請できます。'};
 const h=state.hardship??={shortageMonths:0,reliefMonths:0,lastMonth:-1,lastReliefMonth:-1,status:'安定'};
 const now=idx(state.timeline);
 if(now-h.lastReliefMonth<6&&h.lastReliefMonth>=0)return {ok:false,reason:'支援の再申請には6か月必要です。'};
 const salary=state.finances.career.monthlySalary??0;
 if(h.shortageMonths<2&&!(salary===0&&state.finances.cash<50000&&state.finances.debt>30000))return {ok:false,reason:'2か月以上の資金不足など、支援条件を満たしていません。'};
 const grant=25000;
 state.finances.cash+=grant;state.finances.totals.income+=grant;
 state.finances.ledger.push({year:state.timeline.year,month:state.timeline.month,kind:'収入',label:'生活再建支援（架空制度）',amount:grant});
 if(state.finances.ledger.length>600)state.finances.ledger.shift();
 h.lastReliefMonth=now;h.reliefMonths=Math.min(1200,h.reliefMonths+1);h.status='再建中';
 return {ok:true,message:'架空の生活再建支援25,000円を受け取りました。転職・家計見直し・住居変更と合わせて再建してください。'};
}
