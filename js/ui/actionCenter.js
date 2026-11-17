/** One action dashboard shared by all screens.
 * The authoritative per-category rules live in adultActionBudget.js.
 * A click on an option only selects; executing always requires confirmation.
 */
import {ACTION_CATEGORIES,actionBudget,categoryActionAvailable,turnActionCategory} from '../core/adultActionBudget.js';
import {categoryActivities,categoryLanding} from './topicGroups.js';
import {TIME_PLANS} from '../core/dailySchedule.js';
import {CIVIC_ACTIVITIES} from '../core/civicSystems.js';
import {MONTHLY_PLANS,routineContactCandidates} from '../core/monthlyRoutines.js';

const el=(tag,cls='',text='')=>{
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 node.textContent=text;
 return node;
};
const routines={健康:'health','人物・家族':'relationships',学業:'learning'};
/** For actions requiring full forms, show a direct destination instead of pretending the simple list executes them. */
const detailRoutes={
 '人生':[['生活時間を調整','LIFE-01']],
 '生活・資産':[['お金の使い方・生活費','LIFE-03'],['住居・引越し','LIFE-02'],['投資・貯金・負債','LIFE-05'],['保険・年金','LIFE-07']],
 '人物・家族':[['家族に連絡・交流','PERSON-01'],['恋愛・同棲・結婚','PERSON-04'],['子育て・教育方針','PERSON-02']],
 '学業':[['学校・科目別の学習','EDU-01'],['進学・志望校','EDU-04'],['資格・検定・試験','EDU-04'],['講習・職業技能研修','EDU-05']],
 '仕事・経営':[['求人・転職・応募','WORK-01'],['職業訓練・資格','WORK-02'],['職場の行動・昇進','WORK-03'],['事業・経営','WORK-04']],
 '健康':[['通院・健診・健康習慣','HEALTH-01']],
 '社会':[['地域・ボランティア・公共活動','SOCIETY-01'],['経済・ニュース・地域環境','SOCIETY-05']]
};
const identity=option=>option.action+':'+JSON.stringify(option.payload??{});
export function availableCenterOptions(state,category){
 if(!state?.initialized||!ACTION_CATEGORIES.includes(category))return [];
 const options=categoryActivities(state,category);
 if(category==='社会')for(const a of CIVIC_ACTIVITIES){if(state.timeline.ageYears>=a.age&&(a.id!=='vote'||state.timeline.year%4===0))options.push({title:a.name,hint:`地域の信頼が${a.gain}点上昇・費用${a.cost}円`,action:'civicActivity',payload:{id:a.id}});}
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
   if(current===plan.id&&domain!=='relationships')continue;
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
 heading.append(el('h3','','今月の行動目標・自由行動'),el('p','',`残り ${budget.remaining} / ${budget.limit} 回`));
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
  if(!options.length)card.append(el('p','action-center-empty','直接実行できる行動はありません。下の詳しい操作から選択できます。'));
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
  const guide=el('div','action-center-detail-links');
  for(const [label,target] of detailRoutes[category]??[]){
    const jump=el('button','action-center-open-detail',label+' →');
    jump.type='button';
    jump.addEventListener('click',()=>handlers.onNavigate?.(target));
    guide.append(jump);
  }
  card.append(guide);
  const link=el('button','action-center-open-detail','カテゴリ全体を見る');
  link.type='button';
  link.addEventListener('click',()=>handlers.onNavigate?.(categoryLanding(category)));
  card.append(link);
  const fold=el('details','action-center-category-fold');
  const label=budget.pending?'選択待ち':used?'今月は済':budget.remaining===0?'上限到達':allowed?'行動可':'利用不可';
  const heading=el('summary','action-center-fold-summary',`${category}　｜　${label}`);
  fold.append(heading,card);
  const priority=state.timeline.ageYears<18?'学業':state.health?.illness?'健康':!state.finances?.career?.job?'仕事・経営':'生活・資産';
  fold.open=category===priority&&allowed;
  grid.append(fold);
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
