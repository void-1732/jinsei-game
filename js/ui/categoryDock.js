import {screenGroups,findScreen as groupScreen} from '../core/screenCatalog.js';
import {topicGroups,getTopic,categoryActivities,hasFreeAction} from './topicGroups.js';
import {actionBudget} from '../core/adultActionBudget.js';

function node(tag,cls='',text=''){
  const el=document.createElement(tag);if(cls)el.className=cls;el.textContent=text;return el;
}
/** Render persistent, immediately visible categories in the unused page-heading space. */
export function renderCategoryDock(container,strip,screen,uiState,gameState,handlers={}){
  const fragment=document.createDocumentFragment();
  const canAct=hasFreeAction(gameState);
  for(const group of screenGroups){
    const current=group.category===screen.category;
    const expanded=uiState.activeCategory===group.category;
    const usable=Boolean(categoryActivities(gameState,group.category).length);
    const available=hasFreeAction(gameState,group.category);
    const btn=node('button','dock-category'+(current?' current':'')+(expanded?' expanded':'')+(available&&usable?' actionable':''));
    btn.type='button';btn.setAttribute('aria-expanded',String(expanded));btn.setAttribute('aria-controls','topic-strip');
    const label=node('span','dock-name',group.category);
    btn.append(label);
    if(usable&&gameState?.initialized){
      const status=available?'行動可':gameState?.pendingEvents?.some(e=>e.type==='choice')?'選択後':'済';
      btn.append(node('span','dock-status'+(available?' available':''),status));
    }
    btn.title=current?(expanded?'もう一度押すと項目を閉じます':'項目を開く'):`${group.category}を開く`;
    btn.addEventListener('click',()=>handlers.onCategory?.(group.category));
    fragment.append(btn);
  }
  container.replaceChildren(fragment);
  const opened=uiState.activeCategory===screen.category;
  strip.hidden=!opened;
  strip.replaceChildren();
  if(!opened)return;
  const topic=getTopic(screen.id);
  const tabs=document.createDocumentFragment();
  for(const t of topicGroups[screen.category]??[]){
    const active=topic===t;
    const btn=node('button','topic-tab'+(active?' selected':''),t.title);
    btn.type='button';btn.setAttribute('aria-current',active?'page':'false');
    btn.addEventListener('click',()=>handlers.onTopic?.(t.screenIds[0]));
    tabs.append(btn);
  }
  strip.append(tabs);
  // Redundant per-screen tabs are replaced by a single detail selector inside the topic.
}
