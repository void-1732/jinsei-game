/** STEP 54: one compact control for an entire recurring life rhythm. */
import {TIME_PLANS,SCHEDULE_FIELDS,SCHEDULE_LABELS,getTimePlan} from '../core/dailySchedule.js';
import {categoryActionAvailable} from '../core/adultActionBudget.js';
import {LIFE_PRESETS,lifePresetSummary} from '../core/lifePreset.js';
const el=(tag,cls='',text='')=>{const x=document.createElement(tag);if(cls)x.className=cls;x.textContent=text;return x;};
export function renderDailySchedulePanel(state,onAction){
  if(!state?.initialized)return null;
  const progress=state.daily54;
  const plan=getTimePlan(progress?.planId);
  const root=el('details','play-card daily54');
  root.open=Boolean(document.querySelector('.daily54')?.open);
  const heading=el('summary','daily54-summary',`日常の時間配分 ｜ ${plan.name}`);
  const signals=el('span','daily54-signal',`疲労 ${progress?.fatigue??0} ・ ストレス ${progress?.stress??0}`);
  heading.append(signals);root.append(heading);
  const body=el('div','daily54-body');
  body.append(el('p','daily54-note', '選んだ生活プランは翌月以降も継続します。変更時だけ「人生」カテゴリの自由行動を1回使用します。'));
  const line=el('div','daily54-bar');line.setAttribute('role','img');
  line.setAttribute('aria-label',SCHEDULE_FIELDS.map((k,i)=>`${SCHEDULE_LABELS[k]} ${plan.shares[i]}%`).join('、'));
  for(let i=0;i<SCHEDULE_FIELDS.length;i++){
    const fill=el('span',`daily54-segment daily54-${SCHEDULE_FIELDS[i]}`);fill.style.width=`${plan.shares[i]}%`;line.append(fill);
  }
  body.append(line);
  const values=el('div','daily54-values');
  for(let i=0;i<SCHEDULE_FIELDS.length;i++){
    values.append(el('span','',`${SCHEDULE_LABELS[SCHEDULE_FIELDS[i]]} ${plan.shares[i]}%`));
  }
  body.append(values);
  if(state.timeline.ageYears<6){body.append(el('p','daily54-note','6歳になると生活プランを選べます。'));}
  else if(!state.ending?.dead){
    const form=el('div','daily54-form');
    const label=el('label','','生活プランを選ぶ');const select=el('select','daily54-select');
    select.setAttribute('aria-label','生活時間のプラン');
    TIME_PLANS.forEach(p=>{const op=el('option','',`${p.name} ― ${p.note}`);op.value=p.id;select.append(op);});
    select.value=plan.id;label.append(select);
    const hint=el('p','daily54-note', '仕事・勉強の優先は疲れやすく、休養は回復、家事は成人後の支出削減、交流は人間関係に影響します。');
    const button=el('button','button button-secondary','プランを変更する');button.type='button';
    const pending=state.pendingEvents.some(e=>e.type==='choice');
    const used=!categoryActionAvailable(state,'人生');
    const update=()=>{button.disabled=pending||used||select.value===plan.id;};
    select.addEventListener('change',update);update();
    button.addEventListener('click',()=>onAction?.('setTimePlan',{planId:select.value}));
    form.append(label,button);body.append(form,hint);
    // Adult recurring routines are chosen once. The existing monthly executor
    // still charges their costs, applies fatigue and allows missed payments.
    if(state.timeline.ageYears>=18){
      const current=lifePresetSummary(state);
      const preset=el('details','daily54-preset');
      preset.append(el('summary','','健康・学習も一度に継続設定'));
      preset.append(el('p','daily54-note',`現在の継続習慣：月${current.monthlyCost.toLocaleString('ja-JP')}円。方針変更は「人生」の行動枠1回のみ。`));
      const selectPlan=el('select','daily54-select');selectPlan.setAttribute('aria-label','生活・習慣の一括設定');
      for(const p of LIFE_PRESETS){const op=el('option','',`${p.name}：${p.note}`);op.value=p.id;selectPlan.append(op);}
      selectPlan.value=current.current?.id??'balanced';
      const apply=el('button','button button-secondary','この生活方針を継続する');
      apply.type='button';
      const refresh=()=>{apply.disabled=pending||used||current.current?.id===selectPlan.value;};
      selectPlan.addEventListener('change',refresh);refresh();
      apply.addEventListener('click',()=>onAction?.('configureLifePreset',{presetId:selectPlan.value}));
      preset.append(selectPlan,apply);
      body.append(preset);
    }
    if(pending||used)body.append(el('p','daily54-note',pending?'現在の出来事を選択すると変更できます。':'「人生」カテゴリの行動は今月使えません。次のターンで変更できます。'));
  }
  if(progress?.lastEffect)body.append(el('p','daily54-last',`${progress.lastEffect.year}年${progress.lastEffect.month}月：${progress.lastEffect.summary}`));
  if(progress)body.append(el('p','daily54-note',`これまでの生活費軽減：${progress.savedTotal.toLocaleString('ja-JP')}円（架空のゲーム計算）`));
  root.append(body);return root;
}
