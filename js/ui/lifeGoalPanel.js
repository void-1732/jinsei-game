import {DREAMS,getLifeReview} from '../core/lifeGoals.js';
import {seniorClearAssessment,SENIOR_CLEAR_AGE} from '../core/seniorClear.js';
const el=(tag,cls='',text='')=>{const n=document.createElement(tag);n.className=cls;n.textContent=text;return n;};
const yen=n=>`${Math.round(n).toLocaleString('ja-JP')}円`;
export function renderLifeGoalPanel(state,onAction){
 if(!state?.initialized)return null;
 const data=getLifeReview(state),progress=state.lifeGoal49;
 const box=el('section','play-card goal49-panel');
 box.append(el('div','goal49-eyebrow','STEP 49 / 人生の夢と実績'));
 const head=el('div','goal49-heading');
 head.append(el('h3','',data.dream?.title??'あなたの人生の夢を決めよう'),
   el('span','goal49-progress',`${progress?.achievements?.length??0}個の実績`));
 box.append(head);
 if(!state.ending.dead){
  const picker=el('div','goal49-picker');
  if(state.timeline.ageYears<6)picker.append(el('p','goal49-note','6歳から、自分の夢を選べるようになります。'));
  else {
   const remain=progress?.lastChangeMonths===null?0:Math.max(0,36-(state.timeline.monthsElapsed-progress.lastChangeMonths));
   const form=el('label','goal49-picker-label','これから目指すこと');
   const select=el('select','goal49-select');select.setAttribute('aria-label','人生の夢を選ぶ');
   for(const dream of DREAMS){const opt=el('option','',dream.title);opt.value=dream.id;select.append(opt);}
   select.value=progress?.dream??DREAMS[0].id;
   const button=el('button','button button-secondary',progress?.dream?'夢を変更':'この夢を目指す');button.type='button';
   const can=remain===0;button.disabled=!can;
   button.addEventListener('click',()=>onAction?.('setLifeDream',{id:select.value}));
   form.append(select);picker.append(form,button);
   if(!can)picker.append(el('small','goal49-note',`次の変更まであと${remain}か月。今の夢で達成した目標は保存されます。`));
   else picker.append(el('small','goal49-note','夢の選択は自由行動を消費しません。変更後は3年間同じ夢に取り組みます。'));
  }
  box.append(picker);
 }
 if(data.dream){
  box.append(el('p','goal49-description',data.dream.description));
  const score=el('div','goal49-summary');
  score.append(el('strong','',`目標 ${data.dream.done} / ${data.dream.total} 達成`));
  const meter=el('progress','goal49-meter');meter.max=3;meter.value=data.dream.done;meter.setAttribute('aria-label','人生の夢の達成度');score.append(meter);box.append(score);
  const list=el('ul','goal49-milestones');
  for(const step of data.dream.steps)list.append(el('li',step.done?'earned':'',`${step.done?'✓':'○'} ${step.label}`));
  box.append(list);
 }else if(state.timeline.ageYears>=6)box.append(el('p','goal49-note','5つの夢から一つ選んでください。進学・仕事・家庭など、実際のプレイ状態で達成度が変化します。'));
 const details=el('details','goal49-awards');
 const earned=data.achievements.filter(x=>x.earned);
 details.append(el('summary','',`実績一覧を見る（${earned.length} / ${data.achievements.length}）`));
 const list=el('ul','goal49-awards-list');
 for(const a of data.achievements)list.append(el('li',a.earned?'earned':'',`${a.earned?'✓':'○'} ${a.title}${a.date?`（${a.date.age}歳）`:''}`));
 details.append(list);box.append(details);
 if(state.timeline.ageYears>=50 || state.seniorClear){
   const status=seniorClearAssessment(state);
   const section=el('div','goal49-senior-clear');
   const label=state.seniorClear?'総合クリア達成':status.eligible?'60歳からの総合クリア判定':'60歳からの総合クリア';
   section.append(el('h3','',label));
   const score=state.seniorClear?.score??status.score;
   section.append(el('p','goal49-note',state.seniorClear?
     `${state.seniorClear.age}歳に${score}/100点で達成。人生はそのまま続行できます。`:
     `現在${status.score}/100点 ／ 目標60点以上・5分野中3分野で10点以上。${status.eligible?'各月の生活が次の評価に反映されます。':`判定開始まであと${Math.max(0,SENIOR_CLEAR_AGE-state.timeline.ageYears)}歳。`}`));
   const details=el('details','goal49-senior-detail');
   details.append(el('summary','','仕事・資産・健康・人間関係・夢の評価内訳'));
   for(const part of (state.seniorClear?.breakdown??status.breakdown)){
     const row=el('div','goal49-score-row');
     row.append(el('span','',part.label),el('strong','',`${part.score}/20`));
     details.append(row);
   }
   section.append(details);box.append(section);
 }
 return box;
}
export function renderLifeReview(state,{expanded=false}={}){
 if(!state?.initialized)return null;
 const report=getLifeReview(state);
 const wrapper=el('section','play-card goal49-review');
 wrapper.append(el('div','goal49-eyebrow','人生の記録 / 振り返り'));
 const title=el('h2','',report.ending?'あなたの人生の結末':'これまで歩んできた道');wrapper.append(title);
 if(report.ending){
  const epilogue=el('div','goal49-epilogue');
  epilogue.append(el('strong','goal49-end-title',report.ending.title),el('p','',report.ending.description),
    el('p','',`${report.personName}さんの人生：${report.death?.age??state.timeline.ageYears}歳まで。選んだ夢：${report.dream?.title??'未設定'}。`),
    el('p','','人生評価：'+report.ending.score+'点（ゲーム内での5項目の記録。人生の価値や幸福の優劣を表すものではありません）。'));
  wrapper.append(epilogue);
  const summary=el('details','goal49-scoring');summary.open=expanded;
  summary.append(el('summary','','人生評価の内訳を表示'));
  const rows=el('div','goal49-score-rows');
  for(const item of report.ending.breakdown){const row=el('div','goal49-score-row');row.append(el('span','',item.label),el('strong','',`${item.score} / 20`));rows.append(row);}
  summary.append(rows);wrapper.append(summary);
 }
 const metrics=el('div','goal49-recap');metrics.append(el('span','',`実績 ${report.achievements.filter(x=>x.earned).length}件`),el('span','',`純資産 ${yen(report.netAssets)}`));
 if(report.dream)metrics.append(el('span','',`目標 ${report.dream.done}/3 達成`));wrapper.append(metrics);
 const details=el('details','goal49-timeline');details.open=expanded||Boolean(report.ending);
 details.append(el('summary','',`人生の節目を振り返る（${report.moments.length}件）`));
 const timeline=el('ol','goal49-timeline-list');
 for(const entry of report.moments){const row=el('li','');row.append(el('time','',`${entry.age}歳　${entry.year}年${entry.month}月`),el('strong','',entry.title),el('p','',entry.description));timeline.append(row);}
 if(!report.moments.length)timeline.append(el('li','','これからの選択が人生の記録に加わります。'));
 details.append(timeline);wrapper.append(details);
 if(report.ending){
  const earned=report.achievements.filter(x=>x.earned);
  const reviewAchievements=el('details','goal49-achievement-summary');reviewAchievements.open=expanded;
  reviewAchievements.append(el('summary','',`人生で獲得した実績（${earned.length}件）`));
  const list=el('ul','goal49-awards-list');for(const item of earned)list.append(el('li','earned',`${item.title} — ${item.date.age}歳`));
  reviewAchievements.append(list);wrapper.append(reviewAchievements);
 }
 return wrapper;
}
