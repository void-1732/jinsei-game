/** The student decision lives in the existing school page; no new screen ID. */
import {previewStudentDay,STUDENT_HOUR_CHOICES,STUDENT_TIME_BUDGET,STUDENT_STAGES} from '../core/studentBalance.js';
const el=(tag,cls='',text='')=>{const n=document.createElement(tag);if(cls)n.className=cls;n.textContent=text;return n;};
function choice(labelText,options,value){
  const label=el('label','student-balance-label',labelText);
  const select=el('select','student-balance-select');
  for(const opt of options){const o=el('option','',opt.label??String(opt.value));o.value=String(opt.value);select.append(o);}
  select.value=String(value);label.append(select);
  return {label,select};
}
export function renderStudentBalancePanel(state,onAction){
  const box=el('section','student-balance-panel');
  box.append(el('h3','','学生生活の時間配分'));
  if(!STUDENT_STAGES.includes(state.education.stage)){
    box.append(el('p','student-balance-help','学校に入学すると、勉強・遊び・休息を配分できるようになります。'));
    return box;
  }
  box.append(el('p','student-balance-help','このターンの自由時間8時間を配分。勉強しすぎ・休息不足は健康に影響します。'));
  const subjects=choice('勉強する科目',Object.keys(state.education.scores).map(x=>({value:x,label:x})),Object.keys(state.education.scores)[0]);
  const studies=choice('勉強',STUDENT_HOUR_CHOICES.map(v=>({value:v,label:v+'時間'})),2);
  const plays=choice('遊び',STUDENT_HOUR_CHOICES.map(v=>({value:v,label:v+'時間'})),2);
  const fields=el('div','student-balance-controls');fields.append(subjects.label,studies.label,plays.label);
  box.append(fields);
  const bar=el('div','student-time-bar');
  bar.setAttribute('role','img');
  const studyBar=el('span','student-time-study');
  const playBar=el('span','student-time-play');
  const restBar=el('span','student-time-rest');
  bar.append(studyBar,playBar,restBar);
  const rest=el('p','student-balance-rest');
  const impact=el('p','student-balance-impact');
  const feedback=el('p','student-balance-feedback');feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
  const submit=el('button','button button-primary student-balance-submit','この時間配分で過ごす');submit.type='button';
  const update=()=>{
    const plan=previewStudentDay(state,{subject:subjects.select.value,studyHours:Number(studies.select.value),playHours:Number(plays.select.value)});
    submit.disabled=!plan.ok;
    const study=plan.ok?plan.studyHours:Number(studies.select.value),play=plan.ok?plan.playHours:Number(plays.select.value),sleep=plan.ok?plan.restHours:0;
    studyBar.style.width=(study/STUDENT_TIME_BUDGET*100)+'%';
    playBar.style.width=(play/STUDENT_TIME_BUDGET*100)+'%';
    restBar.style.width=(sleep/STUDENT_TIME_BUDGET*100)+'%';
    bar.setAttribute('aria-label',`勉強${study}時間、遊び${play}時間、休息${sleep}時間`);
    rest.textContent=plan.ok?`勉強 ${study}h ／ 遊び ${play}h ／ 休息 ${sleep}h`:plan.reason;
    impact.textContent=plan.ok?`見込み：学力+${plan.scoreGain}、心${plan.mentalChange>=0?'+':''}${plan.mentalChange}、体力${plan.energyChange>=0?'+':''}${plan.energyChange}`:'時間配分を調整してください。';
    feedback.textContent='';
  };
  for(const select of [subjects.select,studies.select,plays.select])select.addEventListener('change',update);
  submit.addEventListener('click',()=>{
    const result=onAction?.('studentDay',{subject:subjects.select.value,studyHours:Number(studies.select.value),playHours:Number(plays.select.value)});
    feedback.textContent=result?.message??result?.reason??'結果を確認できませんでした。';
  });
  box.append(bar,rest,impact,submit,feedback);
  const record=state.education.studentBalance;
  if(record?.sessions)box.append(el('p','student-balance-help',`これまでの配分：${record.sessions}回、遊び${record.playHours}時間、休息${record.restHours}時間`));
  update();
  return box;
}
