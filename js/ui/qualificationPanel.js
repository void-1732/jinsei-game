/** Compact, reusable qualification summary and exam controls.
 * EDU-04/EDU-05 and WORK-02 reuse this; no new page or save scheme.
 */
import {QUALIFICATION_CATALOG,qualificationPreview,qualificationDifficulty,recommendedQualifications} from '../core/qualificationSystems.js';
const el=(tag,cls='',content='')=>{const n=document.createElement(tag);if(cls)n.className=cls;n.textContent=content;return n;};
const fmt=n=>Number(n).toLocaleString('ja-JP');
export function renderQualificationPanel(state,onAction,{career=false}={}){
 const e=state.education,age=state.timeline.ageYears;
 const root=el('details','phase4-extra qualification-panel');
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
 for(const q of QUALIFICATION_CATALOG){
  const option=el('option','',`${q.name}　${qualificationDifficulty(q)}`);
  option.value=q.id;select.append(option);
 }
 const recommended=recommend.find(q=>!qualificationPreview(e,q.id,age).earned);
 if(recommended)select.value=recommended.id;
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
  if(!p.ok)return;
  description.textContent=`${q.name}｜難易度：${p.difficulty}（基準${q.threshold}点）｜現在の能力${p.readiness}点｜ゲーム内合格見込み${p.chance}%｜受験料${fmt(q.fee)}円｜${p.earned?'取得済み':p.requirement?'受験不可：'+p.requirement:'受験可能'}。 ${q.description}`;
  prepare.disabled=p.earned||Boolean(p.requirement)||age<18||p.preparation>=30||state.finances.cash<2000;
  exam.disabled=p.earned||Boolean(p.requirement)||age<18||state.finances.cash<q.fee;
  feedback.textContent='';
 };
 select.addEventListener('change',refresh);
 prepare.addEventListener('click',()=>{const r=onAction?.('prepareQualification',{id:select.value});feedback.textContent=r?.message??r?.reason??'操作できませんでした。';});
 exam.addEventListener('click',()=>{const r=onAction?.('takeQualificationExam',{id:select.value});feedback.textContent=r?.message??r?.reason??'操作できませんでした。';});
 result.append(description,controls,feedback);
 if(!career)result.append(el('p','muted small','社会人の資格受験は18歳以上で利用できます。学歴と専門課程による受験制限は残ります。'));
 root.append(result);refresh();return root;
}
