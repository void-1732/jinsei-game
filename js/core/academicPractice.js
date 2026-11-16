/** Optional monthly academic retention. Saves remain v7-compatible.
 * School attendance gives foundational learning; optional self-study preserves
 * subjects and makes exam preparation meaningful without punishing graduates.
 */
export const ACADEMIC_SUBJECTS=Object.freeze(['国語','数学','英語','理科','社会']);
export const ACTIVE_SCHOOL_STAGES=Object.freeze(['小学校','中学校','高校','高専','高専専攻科','大学','大学院']);
export const monthIndex=d=>d.year*12+d.month-1;
const clamp=n=>Math.min(100,Math.max(0,Math.round(n)));
export function createAcademicPractice(month,subjects=ACADEMIC_SUBJECTS){
 return {lastMonth:month,lastStudied:Object.fromEntries(subjects.map(name=>[name,month])),
   totalDeclines:0,lastDeclineMonth:-1};
}
export function validateAcademicPractice(value){
 if(value===undefined)return true;
 if(!value||typeof value!=='object'||Array.isArray(value)||
  !Number.isInteger(value.lastMonth)||value.lastMonth<0||value.lastMonth>26412||
  !value.lastStudied||typeof value.lastStudied!=='object'||Array.isArray(value.lastStudied)||
  Object.keys(value.lastStudied).some(k=>!ACADEMIC_SUBJECTS.includes(k))||
  Object.values(value.lastStudied).some(n=>!Number.isInteger(n)||n<0||n>26412)||
  !Number.isInteger(value.totalDeclines)||value.totalDeclines<0||value.totalDeclines>30000||
  !Number.isInteger(value.lastDeclineMonth)||value.lastDeclineMonth< -1||value.lastDeclineMonth>26412)return false;
 return true;
}
function ensurePractice(education,date){
 const idx=monthIndex(date);
 education.academicPractice??=createAcademicPractice(idx,Object.keys(education.scores??{}));
 return education.academicPractice;
}
/** No retroactive penalty when opening an old save. Register only successful study. */
export function recordAcademicStudy(education,date,subjects){
 if(!ACTIVE_SCHOOL_STAGES.includes(education.stage))return;
 const p=ensurePractice(education,date),idx=monthIndex(date);
 for(const name of subjects)if(Object.hasOwn(education.scores,name))p.lastStudied[name]=idx;
}
/** Drop 1 point per subject every 3 unstudied months (6 in primary school),
 * never below 35. Repeated calls in a month are idempotent.
 */
export function advanceAcademicPractice(education,date){
 if(!ACTIVE_SCHOOL_STAGES.includes(education?.stage))return {applied:false,lost:[],reason:'学校外'};
 const p=ensurePractice(education,date),idx=monthIndex(date);
 if(idx<=p.lastMonth)return {applied:false,lost:[],reason:'同じ月は重複処理しません'};
 const lost=[],period=education.stage==='小学校'?6:3;
 for(const [subject,score] of Object.entries(education.scores??{})){
  const last=p.lastStudied[subject]??p.lastMonth;
  const inactive=idx-last;
  if(inactive>=period&&inactive%period===0&&score>35){
   education.scores[subject]=clamp(score-1);lost.push(subject);
  }
 }
 p.lastMonth=idx;
 if(lost.length){p.totalDeclines=Math.min(30000,p.totalDeclines+lost.length);p.lastDeclineMonth=idx;}
 return {applied:true,lost,reason:lost.length?'未復習による緩やかな学力低下':'学力を維持'};
}
export function academicPracticeSummary(education,date){
 if(!ACTIVE_SCHOOL_STAGES.includes(education?.stage))return null;
 const current=monthIndex(date),p=education.academicPractice;
 const period=education.stage==='小学校'?6:3;
 const atRisk=Object.keys(education.scores??{}).filter(subject=>{
  const since=current-(p?.lastStudied?.[subject]??p?.lastMonth??current);
  return since>=period-1&&(education.scores[subject]??0)>35;
 });
 return {period,atRisk,totalDeclines:p?.totalDeclines??0};
}
