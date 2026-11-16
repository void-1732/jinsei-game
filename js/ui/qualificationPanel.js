/** Compact, reusable qualification summary and exam controls.
 * EDU-04/EDU-05 and WORK-02 reuse this; no new page or save scheme.
 */
import {QUALIFICATION_CATALOG,qualificationPreview,qualificationDifficulty,recommendedQualifications,qualificationCost} from '../core/qualificationSystems.js';
const el=(tag,cls='',content='')=>{const n=document.createElement(tag);if(cls)n.className=cls;n.textContent=content;return n;};
const fmt=n=>Number(n).toLocaleString('ja-JP');
export function renderQualificationPanel(state,onAction,{career=false}={}){
 const e=state.education,age=state.timeline.ageYears;
 const root=el('details','phase4-extra qualification-panel');
 root.dataset.foldKey=career?'qualifications-career':'qualifications-school';
 root.append(el('summary','','資格・能力・受験難易度'));
 const result=el('div','qualification-body');
 const degree=e.degree??(e.stage==='卒業'?'学歴記録を確認':'在学中');
 const score=Object.entries(e.scores??{}).map(([k,v])=>`${k}${v}`).join('・');
 const skills=Object.entries(e.skills??{}).map(([k,v])=>`${k}${v}`).join('・')||'未習得';
 const earned=QUALIFICATION_CATALOG.filter(q=>qualificationPreview(e,q.id,age).earned);
 const legacy=[...(e.qualifications??[])].filter(x=>!earned.some(q=>q.name===x));
 result.append(el('p','muted small',`学歴：${degree} ／ 学科：${score}`));
 result.append(el('p','muted small',`技能：${skills}`));
 result.append(el('p','muted small',`取得資格：${[...earned.map(q=>q.name),...(e.licenses??[]).filter(x=>!earned.some(q=>q.license===x)),...legacy].join('・')||'まだありません'}`));
 const recommend=recommendedQualifications(e);
 result.append(el('p','muted small',`現在の学歴・専攻でおすすめ：${recommend.map(q=>q.name).join('・')}`));
 const label=el('label','qualification-picker-label','確認・挑戦する資格');
 const select=el('select','phase4-select qualification-picker');
 const available=QUALIFICATION_CATALOG.filter(q=>!qualificationPreview(e,q.id,age).earned);
 for(const q of available){
  const option=el('option','',`${q.name}　${qualificationDifficulty(q)}`);
  option.value=q.id;select.append(option);
 }
 const recommended=recommend.find(q=>available.some(item=>item.id===q.id));
 if(recommended)select.value=recommended.id;
 if(!available.length){
   select.disabled=true;
   const done=el('option','','すべて取得済みです');done.value='';select.append(done);
 }
 label.append(select);
 result.append(label);
 const description=el('p','muted small qualification-preview');
 const controls=el('div','phase4-actions');
 const prepare=el('button','button button-secondary phase5-action','この資格を勉強する（2,000円）');
 const exam=el('button','button button-secondary phase5-action','この資格の試験を受ける');
 prepare.type='button';exam.type='button';
 controls.append(prepare,exam);
 const feedback=el('p','muted small qualification-feedback');feedback.setAttribute('role','status');
 const refresh=()=>{
  const p=qualificationPreview(e,select.value,age),q=p.q;
  if(!p.ok){description.textContent='すべての資格を取得済みです。';prepare.disabled=true;exam.disabled=true;return;}
  const cost=qualificationCost(e,q,age);
  const allActionsBlocked=Boolean(state.pendingEvents?.some(x=>x.type==='choice'))||
    !state.initialized||Boolean(state.ending?.dead);
  const budget=state.turnActions?.turn===state.timeline.turnsElapsed?state.turnActions:null;
  const limit=age<18?1:3;
  const actionSpent=Boolean(budget?.categories?.includes('学業')||(!budget?.categories&&budget?.used>0)||
    (budget?.used??0)>=limit);
  const ageReason=p.requirement??p.barrier??(p.earned?'取得済み':'');
  const fundsReason=state.finances.cash<cost.exam?`所持金不足（残高${fmt(state.finances.cash)}円・必要${fmt(cost.exam)}円）`:'';
  description.textContent=`${q.name}｜難易度：${p.difficulty}（基準${q.threshold}点）｜${q.focus}${p.focused}点・関連技能${p.relevantSkill}点（${p.skillNames.join('・')}）・総合能力${p.readiness}点｜ゲーム内合格見込み${p.chance}%｜受験料${cost.subsidized?'学校支援で無料':fmt(cost.exam)+'円'}｜${p.earned?'取得済み':p.requirement?'受験不可：'+p.requirement:p.barrier?'能力不足：'+p.barrier:'受験条件を満たしています'}。 ${q.description}`;
  prepare.disabled=p.earned||Boolean(p.requirement)||p.preparation>=30||state.finances.cash<cost.preparation||allActionsBlocked||actionSpent;
  exam.disabled=p.earned||Boolean(p.requirement)||Boolean(p.barrier)||state.finances.cash<cost.exam||allActionsBlocked||actionSpent;
  prepare.textContent=`この資格を勉強する（${cost.subsidized?'学校支援で無料':fmt(cost.preparation)+'円'}）`;
  feedback.textContent=allActionsBlocked?'現在は行動できません（未処理の出来事・ゲーム終了など）。':actionSpent?'このターンの学業行動は使用済みです。次のターンで実行できます。':p.barrier?'受験に必要な能力：'+p.barrier:fundsReason||'';
 };
 select.addEventListener('change',refresh);
 prepare.addEventListener('click',()=>{const r=onAction?.('prepareQualification',{id:select.value});feedback.textContent=r?.message??r?.reason??'操作できませんでした。';});
 exam.addEventListener('click',()=>{const r=onAction?.('takeQualificationExam',{id:select.value});feedback.textContent=r?.message??r?.reason??'操作できませんでした。';});
 result.append(description,controls,feedback);
 if(!career)result.append(el('p','muted small','工業高校・商業高校・高専では15歳から対応資格に挑戦できます。その他の資格は原則18歳以降で、専門課程などの受験条件は維持されます。'));
 root.append(result);refresh();return root;
}
