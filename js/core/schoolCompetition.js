/** School competition forecasts derived from current records; no new screen or mandatory save fields. */
import {EDUCATION_PROGRAMS} from './educationPaths.js';
export const SCHOOL_THRESHOLDS=Object.freeze({
 高校:Object.freeze({'進学校':75,'県立高校':55,'地域高校':0,'工業高校':48,'商業高校':45,'通信制高校':0,'高等専門学校':60}),
 大学:Object.freeze({'難関大学':80,'総合大学':60,'地域大学':0,'国公立大学':72,'私立大学':55,'短期大学':38,'専門学校':35,'医学部':82,'歯学部':78})
});
const clamp=x=>Math.max(0,Math.min(100,Math.round(x)));
const avg=values=>Math.round(values.reduce((s,n)=>s+n,0)/Math.max(1,values.length));
/** School performance combines subject scores, attendance and sustained study. */
export function academicAssessment(education){
 const scores=Object.values(education?.scores??{}).filter(Number.isFinite);
 const knowledge=avg(scores);
 const attendance=clamp(education?.attendance??100);
 const preparation=Math.min(8,Math.max(0,(education?.examPreparation??0)*2));
 const persistence=Math.min(5,Math.floor((education?.studyHours??0)/120));
 const record=clamp(knowledge*.75+attendance*.2+persistence);
 const entranceScore=clamp(knowledge+preparation+Math.floor((attendance-80)/10));
 return {knowledge,attendance,record,entranceScore,preparation,persistence};
}
export function admissionsForecast(education,level,school){
 const threshold=SCHOOL_THRESHOLDS[level]?.[school];
 if(threshold===undefined)return {ok:false,reason:'学校の種類を選んでください。'};
 const a=academicAssessment(education);
 const margin=a.entranceScore-threshold;
 const tuition=level==='大学'?EDUCATION_PROGRAMS[school]?.tuition??36000:school==='高等専門学校'?18000:school==='通信制高校'?12000:school==='進学校'?15000:school==='工業高校'||school==='商業高校'?10000:6000;
 return {...a,ok:true,school,level,threshold,margin,tuition,competition:margin>=10?'余裕あり':margin>=0?'基準付近':margin>=-8?'挑戦校':'現状では厳しい',
  chance:clamp(50+margin*4),amountPerYear:tuition*12};
}
export function schoolCareerImpact(education){
 const a=academicAssessment(education);
 const recordBonus=a.record>=85?4:a.record>=70?2:a.record<40?-2:0;
 const campus=education?.school??'';
 const specialized=['高等専門学校','工業高校','商業高校'].includes(campus)?3:0;
 return {record:a.record,hiringBonus:recordBonus+specialized,attendance:a.attendance};
}
