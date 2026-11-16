import {screenGroups,findScreen as groupScreen} from '../core/screenCatalog.js';
import {topicGroups,getTopic,categoryActivities,hasFreeAction} from './topicGroups.js';

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
    const btn=node('button','dock-category'+(current?' current':'')+(expanded?' expanded':'')+(canAct&&usable?' actionable':''));
    btn.type='button';btn.setAttribute('aria-expanded',String(expanded));btn.setAttribute('aria-controls','topic-strip');
    const label=node('span','dock-name',group.category);
    btn.append(label);
    if(usable&&gameState?.initialized){
      const status=canAct?'行動可':gameState?.pendingEvents?.some(e=>e.type==='choice')?'選択後':'済';
      btn.append(node('span','dock-status'+(canAct?' available':''),status));
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
  // Each underlying screen is selected from this single top-level navigation,
  // not via a second repeated switcher below the page's information.
  if(topic?.screenIds.length>1){
    const sub=node('div','topic-screen-tabs');
    sub.setAttribute('role','group');
    sub.setAttribute('aria-label',`${topic.title}の操作項目`);
    for(const id of topic.screenIds){
      const detail=groupScreen(id);
      const selected=screen.id===id;
      const btn=node('button','screen-tab'+(selected?' selected':''),detail.title);
      btn.type='button';
      btn.setAttribute('aria-pressed',String(selected));
      btn.addEventListener('click',()=>handlers.onTopic?.(id));
      sub.append(btn);
    }
    strip.append(sub);
  }
}
