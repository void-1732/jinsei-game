/** One action dashboard shared by all screens.
 * The authoritative per-category rules live in adultActionBudget.js.
 * A click on an option only selects; executing always requires confirmation.
 */
import {ACTION_CATEGORIES,actionBudget,categoryActionAvailable,turnActionCategory} from '../core/adultActionBudget.js';
import {categoryActivities,categoryLanding} from './topicGroups.js';
import {TIME_PLANS} from '../core/dailySchedule.js';
import {MONTHLY_PLANS,MONTHLY_DOMAIN_LABELS} from '../core/monthlyRoutines.js';

const el=(tag,cls='',text='')=>{
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 node.textContent=text;
 return node;
};
const routines={健康:'health','人物・家族':'relationships',学業:'learning'};
const identity=option=>option.action+':'+JSON.stringify(option.payload??{});
export function availableCenterOptions(state,category){
 if(!state?.initialized||!ACTION_CATEGORIES.includes(category))return [];
 const options=categoryActivities(state,category);
 if(category==='人生'&&state.timeline.ageYears>=6){
  for(const plan of TIME_PLANS){
   if(plan.id===state.daily54?.planId)continue;
   options.push({title:`生活プラン：${plan.name}`,hint:plan.note,action:'setTimePlan',payload:{planId:plan.id}});
  }
 }
 const domain=routines[category];
 if(domain&&state.timeline.ageYears>=18){
  const current=state.monthlyRoutines?.plans?.[domain]??'off';
  for(const plan of MONTHLY_PLANS[domain]){
   if(current===plan.id)continue;
   options.push({title:`毎月：${plan.name}${plan.cost?`（${plan.cost.toLocaleString('ja-JP')}円/月）`:''}`,
     hint:plan.description,action:'setMonthlyRoutine',payload:{domain,planId:plan.id}});
  }
 }
 const seen=new Set();
 return options.filter(option=>{
  const id=identity(option);
  if(turnActionCategory(option.action,option.payload)!==category||seen.has(id))return false;
  seen.add(id);return true;
 });
}
export function renderActionCenter(content,state,handlers={}){
 const budget=actionBudget(state);
 content.replaceChildren();
 const heading=el('div','action-center-heading');
 heading.append(el('h3','','今月の自由行動'),el('p','',`残り ${budget.remaining} / ${budget.limit} 回`));
 const meter=el('div','action-center-meter');
 meter.setAttribute('role','group');meter.setAttribute('aria-label','今月の自由行動枠');
 for(let i=0;i<budget.limit;i++){
  const slot=el('span',i<budget.used?'used':'available',i<budget.used?'使用済み':'未使用');
  meter.append(slot);
 }
 heading.append(meter);content.append(heading);
 const detail=el('p','action-center-description',budget.blocked?
   budget.pending?'重要な出来事を選択すると操作できます。':'現在は自由行動できません。':
   budget.remaining===0?'今月の自由行動はすべて終了しました。次のターンで再び行えます。':
   budget.limit===3?'異なるカテゴリで最大3回。同じカテゴリは月1回です。':'18歳になるまでは1ターン1回です。');
 content.append(detail);
 const grid=el('div','action-center-grid');
 let selected=null;
 const optionButtons=[];
 const confirm=el('button','button button-primary action-center-confirm','行動を選んでください');
 confirm.type='button';confirm.disabled=true;
 const feedback=el('p','action-center-feedback');
 feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
 const selectedText=el('p','action-center-selected','選択した行動：なし');
 const select=(option,category,button)=>{
  selected={option,category};
  for(const b of optionButtons)b.setAttribute('aria-pressed',String(b===button));
  selectedText.textContent=`選択した行動：${category} ／ ${option.title}`;
  confirm.textContent='この行動を実行';
  confirm.disabled=false;
  feedback.textContent='';
 };
 for(const category of ACTION_CATEGORIES){
  const allowed=categoryActionAvailable(state,category);
  const used=budget.categories.includes(category);
  const card=el('section','action-center-category');
  card.dataset.category=category;
  if(!allowed)card.classList.add('is-closed');
  const top=el('div','action-center-category-heading');
  top.append(el('h4','',category),el('span','action-center-category-status',budget.pending?'選択待ち':used?'今月は済':budget.remaining===0?'上限到達':allowed?'行動可':'利用不可'));
  card.append(top);
  const options=availableCenterOptions(state,category);
  if(!options.length)card.append(el('p','action-center-empty','このカテゴリの簡単な行動はありません。詳細操作は下のボタンから確認できます。'));
  const opts=el('div','action-center-options');
  const add=(target,option)=>{
   const b=el('button','action-center-option',option.title);
   b.type='button';b.dataset.action=option.action;b.dataset.category=category;
   b.setAttribute('aria-pressed','false');
   if(option.hint)b.title=option.hint;
   b.disabled=!allowed;
   b.addEventListener('click',()=>select(option,category,b));
   optionButtons.push(b);target.append(b);
  };
  for(const option of options.slice(0,3))add(opts,option);
  card.append(opts);
  if(options.length>3){
   const additional=el('details','action-center-more');
   additional.append(el('summary','',`ほかの候補 ${options.length-3}件`));
   const rest=el('div','action-center-options');
   for(const option of options.slice(3))add(rest,option);
   additional.append(rest);card.append(additional);
  }
  const link=el('button','action-center-open-detail','このカテゴリの詳しい操作を見る');
  link.type='button';
  link.addEventListener('click',()=>handlers.onNavigate?.(categoryLanding(category)));
  card.append(link);
  grid.append(card);
 }
 content.append(grid);
 const footer=el('div','action-center-footer');
 footer.append(selectedText,confirm,feedback);
 content.append(footer);
 confirm.addEventListener('click',()=>{
  if(!selected||!categoryActionAvailable(state,selected.category))return;
  confirm.disabled=true;
  const result=handlers.onAction?.(selected.option.action,selected.option.payload);
  if(!result){feedback.textContent='操作結果を確認できません。';return;}
  feedback.textContent=result.ok?result.message??'行動を反映しました。':result.reason??'操作を実行できませんでした。';
  if(!result.ok)confirm.disabled=false;
  if(result.ok)handlers.onSuccessfulAction?.(feedback.textContent);
 });
}
