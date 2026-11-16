/** Compact dashboard activity picker. The store validates all actions independently. */
import {choiceButtons} from './choiceButtons.js';
import {ONE_OFF_ACTIVITIES} from '../core/monthlyRoutines.js';
import {actionBudget,turnActionCategory,categoryActionAvailable} from '../core/adultActionBudget.js';
const E=(tag,cls='',text='')=>{const n=document.createElement(tag);n.className=cls;n.textContent=text;return n;};
const option=(title,action,payload)=>({title,action,payload});
export function turnActivityOptions(state){
  if(!state?.initialized)return [];
  const age=state.timeline.ageYears;
  const options=[option('読書を練習する','skill',{skill:'読書'}),option('運動を練習する','skill',{skill:'運動'}),option('パソコンを練習する','skill',{skill:'パソコン'}),option('休養を取る','habit',{habit:'休養'})];
  if(['小学校','中学校','高校','高専','高専専攻科','大学','大学院'].includes(state.education.stage))
    options.unshift(option('国語を1時間勉強する','study',{subject:'国語',hours:1}));
  if(age>=8){
    const prepared=state.surprise53?.prepared??{};
    for(const [area,title] of [['disaster','防災の備えを整える'],['security','詐欺への備えを学ぶ'],['health','応急対応を学ぶ']])
      if((prepared[area]??0)<5)options.push(option(title,'safetyPrep',{area}));
  }
  if(age>=6){
    const person=state.people.find(p=>p.role==='父'||p.role==='母');
    if(person)options.push(option('家族と交流する','socialize',{personId:person.id}));
  }
  if(state.health.illness)options.unshift(option('病気の治療を受ける','treatment',{}));
  if(age>=18&&!state.finances.career.job)options.push(option('仕事を探す','jobSearch',{}));
  if(age>=18)for(const a of ONE_OFF_ACTIVITIES){
    if(a.id==='friends-outing'&&!state.people.some(p=>p.role==='友人'||p.role==='交際相手'))continue;
    options.push(option(`${a.name}（${a.cost.toLocaleString('ja-JP')}円）`,'adultActivity',{id:a.id}));
  }
  return options;
}
export function renderTurnActivity(state,onAction){
 const box=E('details','play-card turn-activity');
 box.open=Boolean(document.querySelector('.turn-activity')?.open);
 const budget=actionBudget(state);
 const heading=E('summary','',`自由行動の候補をまとめて選ぶ ｜ 残り${budget.remaining}/${budget.limit}回`);
 box.append(heading);
 const pending=budget.pending;
 if(pending){box.append(E('p','turn-activity-note','まず現在の重要な出来事を選択してください。'));return box;}
 if(!budget.remaining){box.append(E('p','turn-activity-note','このターンの自由行動は完了です。'));return box;}
 const options=turnActivityOptions(state).filter(a=>categoryActionAvailable(state,turnActionCategory(a.action,a.payload)));
 if(!options.length){box.append(E('p','turn-activity-note','利用できる自由行動はありません。'));return box;}
 const choices=choiceButtons('候補から選択',options.map((a,i)=>({value:i,label:a.title})),0);
 choices.element.classList.add('turn-activity-buttons');
 const confirm=E('button','button button-secondary','選んだ行動を実行');confirm.type='button';
 confirm.addEventListener('click',()=>{
  const a=options[Number(choices.getValue())];if(a)onAction?.(a.action,a.payload);
 });
 const group=E('div','turn-activity-form');
 group.append(choices.element,confirm);
 box.append(group,E('p','turn-activity-note','18歳以降は異なるカテゴリで3回まで。重要な出来事の選択と事業管理は別枠です。'));
 return box;
}
