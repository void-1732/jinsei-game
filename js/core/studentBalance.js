/** Student free-time allocation. One decision uses the existing 学業 action slot.
 * Eight hours are a fictional flexible-time budget, not a clinical schedule.
 * Legacy study(), skills and action history are preserved.
 */
export const STUDENT_TIME_BUDGET=8;
export const STUDENT_HOUR_CHOICES=Object.freeze([0,2,4,6]);
export const STUDENT_STAGES=Object.freeze(['小学校','中学校','高校','大学']);
const clamp=value=>Math.max(0,Math.min(100,Math.round(value)));
const validHours=value=>STUDENT_HOUR_CHOICES.includes(value);

/** Read-only preview shared by the game engine and UI. */
export function previewStudentDay(state,payload={}){
  if(!STUDENT_STAGES.includes(state?.education?.stage))return {ok:false,reason:'学校に在籍している期間のみ利用できます。'};
  const {subject,studyHours,playHours}=payload;
  if(!Object.hasOwn(state.education.scores,subject))return {ok:false,reason:'勉強する科目を選んでください。'};
  if(!validHours(studyHours)||!validHours(playHours))return {ok:false,reason:'勉強・遊びの時間は0・2・4・6時間から選んでください。'};
  if(studyHours+playHours>STUDENT_TIME_BUDGET)return {ok:false,reason:'勉強と遊びを合わせて8時間以内にしてください。'};
  const restHours=STUDENT_TIME_BUDGET-studyHours-playHours;
  const scoreGain=studyHours?Math.max(1,Math.floor(studyHours/2)):0;
  const mentalChange=(playHours>=2?Math.floor(playHours/2)+1:-2)+(restHours>=4?2:restHours===0?-5:restHours===2?0:-2)-(studyHours>=6?3:0);
  const energyChange=restHours>=4?3:restHours===2?0:-6;
  const physicalChange=restHours===0?-2:playHours>=4?1:0;
  const relationGain=playHours>=2?Math.floor(playHours/2)+1:0;
  return {ok:true,studyHours,playHours,restHours,scoreGain,mentalChange,energyChange,physicalChange,relationGain};
}
export function performStudentDay(state,payload={}){
  const plan=previewStudentDay(state,payload);
  if(!plan.ok)return plan;
  const education=state.education,turn=state.timeline.turnsElapsed;
  const prior=education.studentBalance??{sessions:0,lastTurn:-1,playHours:0,restHours:0};
  if(prior.lastTurn===turn)return {ok:false,reason:'学生生活の時間配分は、このターンですでに決定しています。'};
  education.studentBalance={
    sessions:Math.min(10000,prior.sessions+1),
    lastTurn:turn,
    playHours:Math.min(10000,prior.playHours+plan.playHours),
    restHours:Math.min(10000,prior.restHours+plan.restHours),
  };
  education.scores[payload.subject]=clamp(education.scores[payload.subject]+plan.scoreGain);
  education.studyHours+=plan.studyHours;
  state.health.mental=clamp(state.health.mental+plan.mentalChange);
  state.health.energy=clamp(state.health.energy+plan.energyChange);
  state.health.physical=clamp(state.health.physical+plan.physicalChange);
  if(plan.relationGain){
    const companion=state.people.find(p=>p.role==='友人'||p.role==='交際相手')??state.people.find(p=>p.role==='父'||p.role==='母');
    if(companion)companion.relationship=clamp(companion.relationship+plan.relationGain);
  }
  if(plan.playHours>=4){
    education.skills.運動=clamp((education.skills.運動??0)+1);
  }
  return {ok:true,message:`勉強${plan.studyHours}時間・遊び${plan.playHours}時間・休息${plan.restHours}時間を過ごしました。学力+${plan.scoreGain}、心${plan.mentalChange>=0?'+':''}${plan.mentalChange}、体力${plan.energyChange>=0?'+':''}${plan.energyChange}。`,plan};
}

/** New saves may contain this optional field; earlier v7 saves remain valid. */
export function validateStudentBalance(value,turnsElapsed){
  if(value===undefined)return true;
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  for(const key of ['sessions','playHours','restHours']){
    if(!Number.isInteger(value[key])||value[key]<0||value[key]>10000)return false;
  }
  return Number.isInteger(value.lastTurn)&&value.lastTurn>=-1&&value.lastTurn<=turnsElapsed;
}
