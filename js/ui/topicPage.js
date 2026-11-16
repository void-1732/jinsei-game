/** One focused summary per topic; legacy screen IDs and all tools remain reachable. */
import {getTopic,categoryActivities,hasFreeAction} from './topicGroups.js';
import {getScreenFieldValues} from '../core/screenFieldValues.js';
import {findScreen} from '../core/screenCatalog.js';
import {renderScreen} from './screenRenderer.js';
import {renderOpportunityPanel} from './opportunityPanel.js';
import {renderLifeReview} from './lifeGoalPanel.js';

const el=(tag,klass='',text='')=>{const e=document.createElement(tag);if(klass)e.className=klass;e.textContent=text;return e;};

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
  const label=el('label','',`残り1回：${category}の行動を選ぶ`);
  const select=el('select','topic-action-select');
  select.setAttribute('aria-label',`${category}の自由行動`);
  actions.forEach((a,i)=>{const opt=el('option','',a.title);opt.value=String(i);select.append(opt);});
  label.append(select);
  const run=el('button','button button-primary','この行動をする');run.type='button';
  run.addEventListener('click',()=>{const picked=actions[Number(select.value)];if(picked)onAction?.(picked.action,picked.payload);});
  form.append(label,run);box.append(form,el('p','topic-action-foot','自由行動は全カテゴリ共通で1ターン1回です。'));
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
  if(!topic||topic.screenIds.length<2)return renderScreen(container,screen,state,handlers);
  const root=el('div','topic-page topic-compact');
  const intro=el('header','topic-intro');
  intro.append(el('span','topic-eyebrow',screen.category),
    el('h2','',topic.title),
    el('p','','必要な情報はここに集約しました。詳しい操作だけを下から選べます。'));
  root.append(intro);
  if(screen.category==='履歴'&&state?.initialized)root.append(renderLifeReview(state,{expanded:Boolean(state.ending?.dead)}));
  const actions=state?.initialized?actionBox(state,screen.category,handlers.onAction):null;
  if(actions)root.append(actions);
  const featured=renderOpportunityPanel(state,screen.category,handlers.onAction);
  if(featured)root.append(featured);
  if(screen.category==='設定'){
    const button=el('button','button button-primary topic-settings-button','保存・読み込み・新しい人生');
    button.type='button';button.addEventListener('click',()=>handlers.onSettings?.());root.append(button);
  }
  const card=el('section','topic-summary-card');
  card.append(el('h3','','現在の状況'));
  const entries=state?.initialized?compactValues(state,topic.screenIds):[];
  if(!state?.initialized)card.append(el('p','topic-no-data','人生を開始すると、ここに状況が表示されます。'));
  else if(!entries.length)card.append(el('p','topic-no-data','進行や選択によって記録が増えていきます。'));
  else{
    const values=el('dl','topic-values');
    for(const [key,value]of entries){const line=el('div','topic-value');line.append(el('dt','',key),el('dd','',value));values.append(line);}
    card.append(values);
  }
  const details=el('details','topic-detail');
  details.append(el('summary','','詳細・個別操作を見る'));
  const body=el('div','topic-detail-content');
  const label=el('label','topic-tool-label','操作する項目');
  const select=el('select','topic-tool-select');
  select.setAttribute('aria-label','詳細操作の項目を選択');
  for(const id of topic.screenIds){
    const target=findScreen(id);const option=el('option','',target.title);option.value=id;select.append(option);
  }
  // A requested legacy link selects that tool, while ordinary navigation starts with the first.
  select.value=screen.id;
  label.append(select);body.append(label);
  const full=el('div','topic-legacy-detail');
  const show=()=>{
    const target=findScreen(select.value);full.replaceChildren();
    renderScreen(full,target,state,{...handlers,filter:'',onFilterChange:()=>{}});
  };
  select.addEventListener('change',show);
  details.addEventListener('toggle',()=>{if(details.open)show();});
  body.append(full);details.append(body);card.append(details);
  root.append(card);
  container.replaceChildren(root);
}
