import {renderLivingPanel} from './livingPanel.js';
import {getScreenFieldValues} from '../core/screenFieldValues.js';
import {renderHistoryPanel} from './historyPanels.js';
import { renderWorldPanel } from './worldPanels.js';
import { renderEconomyPanel } from './economyPanels.js';
import { renderLifePanel } from './lifePanels.js';
import { screenDetails } from '../core/screenDetails.js';
import { findScreen } from '../core/screenCatalog.js';
import {getScreenCoverage,createCoverageReport} from '../core/screenCoverage.js';
/** Render only domain snapshots; all interactive filters are UI-local. */
export function renderScreen(container, screen, gameState = null, handlers = {}) {
  const detail = screenDetails[screen.id];
  const fieldValues = getScreenFieldValues(screen.id, gameState);
  const connectedFields = detail.fields.filter(field => Object.hasOwn(fieldValues, field)).length;
  const coverage = getScreenCoverage(screen.id);
  const fragment = document.createDocumentFragment();
  const body = el('div', 'page-body');
  const intro = el('section', 'feature-intro');
  intro.append(el('span', 'feature-status', coverage.state), el('h2', '', screen.title),
    el('p', '', `${coverage.connectedDescription}を表示します。下の「今後追加する予定の項目」は完成済みの機能ではありません。`));
  const toolbar = el('div', 'detail-toolbar');
  const searchLabel = el('label', 'visually-hidden', '表示項目を絞り込む');
  const search = document.createElement('input');
  search.type = 'search'; search.className = 'detail-filter'; search.placeholder = 'この画面の項目を検索';
  search.id = 'field-filter'; searchLabel.htmlFor = search.id; search.setAttribute('aria-controls','screen-field-list');
  search.value = handlers.filter ?? '';
  search.addEventListener('input', () => {
    const q = search.value.trim().toLocaleLowerCase('ja');
    const rows = fields.querySelectorAll('.field-list-item');
    let count = 0;
    for (const row of rows) { const match = `${row.dataset.field} ${row.dataset.value}`.toLocaleLowerCase('ja').includes(q); row.hidden = !match; if (match) count++; }
    matches.textContent = `${count} / ${detail.fields.length} 項目`;
    noResults.hidden = count > 0;
    handlers.onFilterChange?.(search.value);
  });
  const matches = el('span', 'detail-count', `${detail.fields.length} / ${detail.fields.length} 項目`);
  toolbar.append(searchLabel, search, matches);
  const grid = el('div', 'feature-grid detail-grid');
  const information = el('section', 'content-card planned-fields');
  information.append(el('h2', '', '画面別のデータ項目'), el('p', 'muted small', `保存済みデータから${connectedFields} / ${detail.fields.length}項目を表示しています。未実装のデータは値を補完しません。`)); 
  const fields = el('div', 'field-list'); fields.id='screen-field-list';
  for (const field of detail.fields) {
    const row = el('div', 'field-list-item'); row.dataset.field = field; row.dataset.value=String(fieldValues[field]??'');
    const connected=Object.hasOwn(fieldValues,field);
    row.append(el('span', '', field), el('span', connected?'field-connected':'field-unavailable', connected?fieldValues[field]:(gameState?.initialized?'未実装・未接続':'人生開始後に確認')));
    fields.append(row);
  }
  const noResults = el('p', 'muted small', '該当する表示項目がありません。'); noResults.hidden = true;
  information.append(fields, noResults);
  const side = el('div', 'detail-side');
  const links = el('section', 'content-card');
  links.append(el('h2', '', '関連画面へ移動'));
  const linkList = el('div', 'detail-links');
  for (const link of detail.related) {
    const target = findScreen(link.target);
    const button = el('button', 'button button-secondary detail-link', `${link.label} →`);
    button.type = 'button'; button.title = `${target.title} (${target.id})`;
    button.addEventListener('click', () => handlers.onNavigate?.(link.target));
    linkList.append(button);
  }
  links.append(linkList);
  const actions = el('section', 'content-card');
  const future = document.createElement('details');
  future.className='planned-actions-details';
  future.append(el('summary', '', `今後追加する予定の操作（${detail.plannedActions.length}件）`));
  future.append(el('p', 'muted small', '以下のボタンは開発予定の案内です。操作してもゲーム状態は変化しません。'));
  for (const action of detail.plannedActions) {
    const disabled = el('button', 'button button-secondary detail-disabled', action);
    disabled.disabled = true; disabled.type = 'button'; disabled.title = '開発予定・現在は操作できません';
    future.append(disabled);
  }
  actions.append(future);
  const state = el('section', 'content-card');
  state.append(el('h2', '', '接続状況'), el('span', 'pill pill-neutral', 'データ接続状況'),
    el('p', 'muted small', `現在のプレイヤー: ${gameState?.initialized ? `${gameState.player.name}（${gameState.timeline.ageYears}歳 / ${gameState.timeline.year}年${gameState.timeline.month}月 / ${gameState.timeline.turnsElapsed}ターン）` : '未生成'}。接続済み：${coverage.connectedDescription}。画面別データ：${connectedFields}/${detail.fields.length}項目。予定操作：${coverage.plannedActions}件。`));
  side.append(links, actions, state);
  grid.append(information, side);
  body.append(intro, toolbar, grid);
  if(screen.id==='SETTING-06'){
    const audit=createCoverageReport();
    const panel=el('section','content-card phase25-audit');
    panel.append(el('h2','','画面機能の接続状況'),el('p','muted small',
      `登録済み${audit.totalScreens}画面・${audit.categories}カテゴリ。各画面に基本情報パネルを接続していますが、個別の設計項目や予定操作がすべて完成したわけではありません。`));
    const table=el('table','phase25-table');
    const head=document.createElement('thead');const hr=document.createElement('tr');
    for(const name of ['カテゴリ','画面数','基本パネル','実データ項目','予定操作'])hr.append(el('th','',name));
    head.append(hr);table.append(head);
    const tbody=document.createElement('tbody');
    for(const row of audit.rows){const tr=document.createElement('tr');
      for(const value of [row.category,`${row.screens}画面`,`${row.connected}画面`,`${screenDetailsForCategory(row.category, gameState)}項目`,`${row.plannedActions}件`])tr.append(el('td','',value));
      tbody.append(tr);
    }
    table.append(tbody);panel.append(table);
    panel.append(el('p','muted small','基本パネル接続数は画面の完成率を示すものではありません。詳細な未接続項目は各画面の下部に表示されます。'));
    body.append(panel);
  }
  if (screen.id === 'LIFE-01') {
    const summary = el('div', 'metric-grid');
    for (const [name, note] of [['総資産','家計データ接続'],['月間収入','仕事データ接続'],['健康','健康データ接続'],['幸福度','人物未生成']]) {
      const metric = el('article', 'metric-card');
      const f=gameState?.finances;const amount=name==='総資産'&&f?f.cash+f.investment-f.debt:name==='月間収入'&&f?f.career.monthlySalary+(f.sideJob.active?f.sideJob.monthlyIncome:0):null;metric.append(el('div', 'metric-label', name), el('div', 'metric-value', name==='健康'&&gameState?.health?`${gameState.health.physical} / 100`:amount===null?'—':`${amount.toLocaleString('ja-JP')}円`), el('div', 'metric-note', note)); summary.append(metric);
    }
    body.insertBefore(summary, toolbar);
  }
  fragment.append(body); container.replaceChildren(fragment);
  const historyConnected=renderHistoryPanel(container,screen,gameState);
  const worldConnected=renderWorldPanel(container,screen,gameState,handlers);
  const economyConnected=renderEconomyPanel(container,screen,gameState,handlers);
  const livingConnected=renderLivingPanel(container,screen,gameState,handlers);
  const connected=renderLifePanel(container,screen,gameState,handlers);
  if(historyConnected){intro.querySelector('p').textContent='人生履歴・保存データの基本情報を表示します。保存・読込操作は画面上部にあります。未接続の項目は下部にまとめています。';}
  if(connected){intro.querySelector('p').textContent='人物・家族・学業の基本データと操作を上部に表示します。下部の予定項目はまだ全件実装されていません。';}
  if(economyConnected){intro.querySelector('p').textContent='仕事・家計の基本データと操作は上部パネルにあります。下部の予定項目は将来の拡張対象です。';}
  if(livingConnected){intro.querySelector('p').textContent='住居・居住地域・任意保障の情報と操作を上部に表示します。';}
  if(worldConnected){intro.querySelector('p').textContent='健康・社会・イベントの基本データと操作を上部に表示します。下部の予定項目は今後の拡張対象です。';}
  if (search.value) search.dispatchEvent(new Event('input'));
}
function screenDetailsForCategory(category, state) {
  return Object.entries(screenDetails).filter(([id]) => findScreen(id)?.category === category).reduce((sum,[id, detail]) => {
    const data=getScreenFieldValues(id,state);
    return sum+detail.fields.filter(field=>Object.hasOwn(data,field)).length;
  },0);
}
function el(tag, className = '', content = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content) node.textContent = content;
  return node;
}
