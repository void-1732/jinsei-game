/** One focused summary per topic; legacy screen IDs and all tools remain reachable. */
import {getTopic,categoryActivities,hasFreeAction} from './topicGroups.js';
import {getScreenFieldValues} from '../core/screenFieldValues.js';
import {findScreen} from '../core/screenCatalog.js';
import {renderScreen} from './screenRenderer.js';
import {renderOpportunityPanel} from './opportunityPanel.js';
import {renderLifeReview} from './lifeGoalPanel.js';
import {choiceButtons} from './choiceButtons.js';

const el=(tag,klass='',text='')=>{const e=document.createElement(tag);if(klass)e.className=klass;e.textContent=text;return e;};
// UI-only state; reopening the page defaults to expanded unless explicitly collapsed.
const expandedByTopic=new Map();

function actionBox(state,category,onAction){
  const actions=categoryActivities(state,category);
  if(!actions.length)return null;
  const box=el('section','topic-action');
  box.append(el('span','topic-action-kicker','このカテゴリでできること'));
  const pending=state.pendingEvents.some(e=>e.type==='choice');
  const canAct=hasFreeAction(state);
  box.append(el('h2','','今のターンの自由行動'));
  if(!canAct){
    box.append(el('p','',pending?'先に「次のターンへ進む」で出来事を選択してください。':'このターンの自由行動は完了しています。次のターンで再び行えます。'));
    return box;
  }
  const form=el('div','topic-action-form');
  const choices=choiceButtons(`残り1回：${category}の行動を選ぶ`,
    actions.map((a,i)=>({label:a.title,value:String(i)})),'0');
  choices.element.classList.add('topic-action-choices');
  const run=el('button','button button-primary','選択した行動を実行');run.type='button';
  run.addEventListener('click',()=>{const picked=actions[Number(choices.getValue())];if(picked)onAction?.(picked.action,picked.payload);});
  form.append(choices.element,run);box.append(form,el('p','topic-action-foot','自由行動は全カテゴリ共通で1ターン1回です。'));
  return box;
}
function compactValues(state,ids){
  const entries=[];const seenLabels=new Set();const seenPairs=new Set();
  for(const id of ids){
    for(const [label,value] of Object.entries(getScreenFieldValues(id,state))){
      if(value===undefined||value===null||value==='')continue;
      const display=String(value);
      const pair=`${label}:${display}`;
      if(seenLabels.has(label)||seenPairs.has(pair))continue;
      seenLabels.add(label);seenPairs.add(pair);
      entries.push([label,display]);
      if(entries.length>=8)return entries;
    }
  }
  return entries;
}
/** Show one overview, then one selected legacy detail panel on demand. */
export function renderTopicPage(container,screen,state,handlers={}){
  const topic=getTopic(screen.id);
  if(!topic)return renderScreen(container,screen,state,handlers);
  const root=el('div','topic-page topic-compact');
  const leading=el('div','topic-leading');
  const intro=el('header','topic-intro');
  intro.append(el('span','topic-eyebrow',screen.category),
    el('h2','',topic.title),
    el('p','','詳細は見出しから開閉できます。'));
  leading.append(intro);root.append(leading);
  const businessFocus=screen.id==='WORK-04';
  if(screen.category==='履歴'&&state?.initialized)root.append(renderLifeReview(state,{expanded:Boolean(state.ending?.dead)}));
  const actions=state?.initialized?actionBox(state,screen.category,handlers.onAction):null;
  if(actions){
    if(businessFocus){
      const secondary=el('details','topic-secondary-panel');secondary.append(el('summary','','今月の自由行動（必要な場合に開く）'),actions);root.append(secondary);
    }else{leading.classList.add('has-actions');leading.append(actions);}
  }
  const featured=renderOpportunityPanel(state,screen.category,handlers.onAction);
  if(featured){
    if(businessFocus){const secondary=el('details','topic-secondary-panel');secondary.append(el('summary','','仕事・家計の見通し（詳細）'),featured);root.append(secondary);}
    else{leading.classList.add('has-context');featured.classList.add('topic-context');leading.append(featured);}
  }
  if(screen.category==='設定'){
    const button=el('button','button button-primary topic-settings-button','保存・読み込み・新しい人生');
    button.type='button';button.addEventListener('click',()=>handlers.onSettings?.());root.append(button);
  }
  const card=el('section','topic-summary-card');
  const overview=el('div','topic-overview');
  overview.append(el('h3','','現在の状況'));
  const entries=state?.initialized?compactValues(state,topic.screenIds):[];
  if(!state?.initialized)overview.append(el('p','topic-no-data','人生を開始すると、ここに状況が表示されます。'));
  else if(!entries.length)overview.append(el('p','topic-no-data','進行や選択によって記録が増えていきます。'));
  else{
    const values=el('dl','topic-values');
    for(const [key,value]of entries){const line=el('div','topic-value');line.append(el('dt','',key),el('dd','',value));values.append(line);}
    overview.append(values);
  }
  const details=el('details','topic-detail');
  const topicKey=topic.screenIds[0];
  details.open=expandedByTopic.get(topicKey)??true;
  details.append(el('summary','','詳細・個別操作を見る（クリックで閉じる／開く）'));
  const body=el('div','topic-detail-content');
  const full=el('div','topic-legacy-detail');
  const show=(selectedId=screen.id)=>{
    const target=findScreen(selectedId);full.replaceChildren();
    renderScreen(full,target,state,{...handlers,embedded:true,filter:'',onFilterChange:()=>{}});
  };
  // Detailed screen navigation is now rendered only in the persistent top topic strip.
  details.addEventListener('toggle',()=>{
    expandedByTopic.set(topicKey,details.open);
    overview.hidden=details.open;
    if(details.open)show();
  });
  overview.hidden=details.open;
  body.append(full);details.append(body);card.append(overview,details);
  show();
  root.append(card);
  container.replaceChildren(root);
}
