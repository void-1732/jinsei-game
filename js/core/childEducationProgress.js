/** Optional per-child education progress; owned by familyJourney.childStudies. */
const idx=d=>d.year*12+d.month-1;
const clamp=n=>Math.max(0,Math.min(100,Math.round(n)));
const age=(d,p)=>d.year-p.birth.year-(d.month<p.birth.month?1:0);
const level=a=>a<6?'未就学':a<12?'小学校':a<15?'中学校':a<18?'高校':a<20?'進路準備':'成人';
export function childEducationSummary(state,child){
 const p=state.familyJourney?.childStudies?.[child.id];
 const years=age(state.timeline,child);
 return {age:years,stage:level(years),score:p?.score??50,attendance:p?.attendance??95,school:p?.school??'未定',lastResult:p?.lastResult??'未判定',
  plan:state.familyJourney?.educationPlans?.[child.id]??'公立中心',support:child.learningSupport??0};
}
export function validateChildStudies(data){
 if(data===undefined)return true;
 if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).length>5)return false;
 return Object.entries(data).every(([id,p])=>id.length<=35&&p&&typeof p==='object'&&!Array.isArray(p)&&
  Number.isInteger(p.score)&&p.score>=0&&p.score<=100&&Number.isInteger(p.attendance)&&p.attendance>=0&&p.attendance<=100&&
  Number.isInteger(p.lastMonth)&&p.lastMonth>=0&&p.lastMonth<=26412&&typeof p.school==='string'&&p.school.length<=28&&
  typeof p.lastResult==='string'&&p.lastResult.length<=70);
}
export function advanceChildEducation(state,date){
 const progress=state.familyJourney;
 progress.childStudies??={};
 const notices=[];
 for(const child of state.people.filter(x=>x.role==='子')){
  const a=age(date,child);if(a<3||a>20)continue;
  const existing=progress.childStudies[child.id];
  const x=existing??{score:50,attendance:95,lastMonth:idx(date)-1,school:'未定',lastResult:'未判定'};
  if(x.lastMonth>=idx(date))continue;
  const plan=progress.educationPlans?.[child.id]??'公立中心';
  const support=child.learningSupport??0;
  const effort=plan==='私立中心'?2:plan==='学習支援'?2:0;
  const lapse=x.score>35&&idx(date)%4===0?1:0;
  const gain=effort&&idx(date)%3===0?1:0;
  const extra=support>=35&&idx(date)%4===0?1:0;
  x.score=clamp(x.score-lapse+gain+extra);
  x.attendance=clamp(x.attendance+(idx(date)%6===0?1:0));
  if(date.month===4){
   const stage=level(a);
   if(a===6||a===12||a===15||a===18){
    const result=a===15?(x.score>=70?'進学校':x.score>=50?'地域高校':'進路指導を受け地域高校へ'):a===18?(x.score>=75?'大学等へ進学':x.score>=55?'専門学校へ進学':'就職・職業訓練を検討'):stage+'に進級';
    x.lastResult=result;x.school=result;
    notices.push({type:'family',title:child.name+'の進路',description:result+'。年齢・学力・教育方針が影響しました。'});
   }else if(a>=6&&a<18)x.school=stage;
  }
  x.lastMonth=idx(date);progress.childStudies[child.id]=x;
 }
 return notices;
}
