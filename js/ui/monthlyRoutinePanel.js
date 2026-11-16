/** Persistent monthly routines: one compact panel on each relevant category. */
import {MONTHLY_PLANS,MONTHLY_DOMAIN_LABELS} from '../core/monthlyRoutines.js';
import {categoryActionAvailable} from '../core/adultActionBudget.js';
import {choiceButtons} from './choiceButtons.js';
const el=(tag,cls='',txt='')=>{const x=document.createElement(tag);x.className=cls;x.textContent=txt;return x;};
const domains=Object.freeze({'健康':'health','人物・家族':'relationships','学業':'learning'});
export function renderMonthlyRoutinePanel(state,category,onAction){
 const domain=domains[category];
 if(!domain||state?.timeline?.ageYears<18)return null;
 const options=MONTHLY_PLANS[domain],current=state.monthlyRoutines?.plans?.[domain]??'off';
 const active=options.find(o=>o.id===current)??options[0];
 const box=el('details','monthly-routine-panel');
 box.open=Boolean(document.querySelector(`[data-routine-domain="${domain}"]`)?.open);
 box.dataset.routineDomain=domain;
 box.append(el('summary','',`毎月続ける習慣 ｜ ${active.name}${active.cost?`・月${active.cost.toLocaleString('ja-JP')}円`:''}`));
 const content=el('div','monthly-routine-body');
 content.append(el('p','muted small','一度選ぶと翌月以降も継続します。変更するときだけ、このカテゴリの自由行動を1回使います。'));
 const choices=choiceButtons(`${MONTHLY_DOMAIN_LABELS[domain]}の継続プラン`,options.map(o=>({value:o.id,label:`${o.name}${o.cost?`（月${o.cost.toLocaleString('ja-JP')}円）`:''}`})),current);
 const hint=el('p','muted small');
 const select=()=>{const value=choices.getValue();const plan=options.find(o=>o.id===value);hint.textContent=plan?.description??'';};
 choices.group.addEventListener('click',select);select();
 const button=el('button','button button-primary','選択した習慣を設定');button.type='button';
 const allowed=categoryActionAvailable(state,category);
 button.disabled=!allowed;
 button.addEventListener('click',()=>onAction?.('setMonthlyRoutine',{domain,planId:choices.getValue()}));
 content.append(choices.element,hint,button);
 if(!allowed)content.append(el('p','muted small','このカテゴリの行動枠がないか、重要な出来事が未選択です。次のターンで変更できます。'));
 if(state.monthlyRoutines?.lastResults?.length){
  const result=state.monthlyRoutines.lastResults.find(x=>options.some(p=>x.startsWith(p.name+'：')));
  if(result)content.append(el('p','muted small',`直近の結果：${result}`));
 }
 box.append(content);
 return box;
}
