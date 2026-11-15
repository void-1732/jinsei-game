/** STEP 44 consolidated pages: information from related screens stays on one page. */
import {getTopic,categoryActivities,hasFreeAction} from './topicGroups.js';
import {getScreenFieldValues} from '../core/screenFieldValues.js';
import {findScreen} from '../core/screenCatalog.js';
import {renderScreen} from './screenRenderer.js';
import {renderOpportunityPanel} from './opportunityPanel.js';

const el=(tag,klass='',text='')=>{const e=document.createElement(tag);if(klass)e.className=klass;e.textContent=text;return e;};

function actionBox(state,category,onAction){
  const actions=categoryActivities(state,category);
  if(!actions.length)return null;
  const box=el('section','topic-action');
  box.append(el('span','topic-action-kicker','このカテゴリでできること'));
  const pending=state.pendingEvents.some(e=>e.type==='choice');
  const canAct=hasFreeAction(state);
  const name=el('h2','','今のターンの自由行動');box.append(name);
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
  run.addEventListener('click',()=>{
    const picked=actions[Number(select.value)];if(picked)onAction?.(picked.action,picked.payload);
  });
  form.append(label,run);box.append(form,el('p','topic-action-foot','自由行動は全カテゴリ共通で1ターン1回です。'));
  return box;
}
/** Related screens render as one compact, scannable topic page. Deeper tools are lazy. */
export function renderTopicPage(container,screen,state,handlers={}){
  const topic=getTopic(screen.id);
  if(!topic||topic.screenIds.length<2)return renderScreen(container,screen,state,handlers);
  const root=el('div','topic-page');
  const intro=el('header','topic-intro');
  intro.append(el('span','topic-eyebrow',`${screen.category}・まとめて確認`),
    el('h2','',topic.title),
    el('p','',`関連する${topic.screenIds.length}項目を1ページにまとめました。必要な操作だけを開いて使えます。`));
  root.append(intro);
  const action=state?.initialized?actionBox(state,screen.category,handlers.onAction):null;
  if(action)root.append(action);
  const featured=renderOpportunityPanel(state,screen.category,handlers.onAction);
  if(featured)root.append(featured);
  if(screen.category==='設定'){
    const settings=el('button','button button-primary topic-settings-button','保存・読み込み・新しい人生');
    settings.type='button';settings.addEventListener('click',()=>handlers.onSettings?.());root.append(settings);
  }
  const grid=el('div','topic-card-grid');
  for(const id of topic.screenIds){
    const target=findScreen(id);
    const card=el('section','topic-summary-card');
    card.append(el('h3','',target.title));
    const entries=Object.entries(getScreenFieldValues(id,state)).filter(([,v])=>v!==undefined&&v!==null&&v!=='').slice(0,4);
    if(!state?.initialized){card.append(el('p','topic-no-data','人生を開始すると、この情報を確認できます。'));}
    else if(!entries.length){card.append(el('p','topic-no-data','進行や選択によって記録が増えていきます。'));}
    else{
      const values=el('dl','topic-values');
      for(const [key,value] of entries){const row=el('div','topic-value');row.append(el('dt','',key),el('dd','',String(value)));values.append(row);}
      card.append(values);
    }
    // Optional advanced controls; loading on expansion avoids dozens of buttons and a long page.
    const details=el('details','topic-detail');
    details.append(el('summary','','詳細・個別操作を見る'));
    const body=el('div','topic-detail-content');details.append(body);
    details.addEventListener('toggle',()=>{
      if(!details.open||body.dataset.loaded==='true')return;
      const full=el('div','topic-legacy-detail');
      renderScreen(full,target,state,{
        ...handlers,filter:'',onFilterChange:()=>{},
      });
      body.append(full);body.dataset.loaded='true';
    });
    card.append(details);grid.append(card);
  }
  root.append(grid);container.replaceChildren(root);
}
