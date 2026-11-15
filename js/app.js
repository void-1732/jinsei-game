import {createSaveRepository} from './core/saveSystems.js';
import { screenGroups, findScreen } from './core/screenCatalog.js';
import { createGameStore } from './core/gameState.js';
import { createUiStore } from './ui/uiState.js';
import { renderNavigation } from './ui/navigation.js';
import { renderScreen } from './ui/screenRenderer.js';

const gameStore = createGameStore();
let saveRepository=null;
try {saveRepository=createSaveRepository(window.localStorage);} catch { /* プライベートモード等では保存を無効化 */ }
let saveFeedback='';
let actionFeedback='';
let lastScreenId=null;
if(saveRepository){
 const loaded=saveRepository.load('自動保存');
 if(loaded.ok){gameStore.loadState(loaded.state);saveFeedback=loaded.recovered?'予備データから復旧しました。':'自動保存から再開しました。';}
}
 // isolated mutable domain store
const uiStore = createUiStore();      // independent mutable presentation state
const $ = selector => document.querySelector(selector);
const dom = {
  navigation: $('#main-navigation'),
  screenRoot: $('#screen-root'),
  pageTitle: $('#page-title'),
  screenId: $('#screen-id'),
  breadcrumbs: $('#breadcrumbs'),
  categoryLabel: $('#category-label'),
  systemMessage: $('#system-message'),
  backButton: $('#nav-back'),
  forwardButton: $('#nav-forward'),
  searchInput: $('#screen-search'),
  helpDialog: $('#help-dialog'),
  relatedTitle: $('#related-screen-title'),
  relatedDescription: $('#related-description'),
  relatedScreenId: $('#related-screen-id'),
};

function render(state) {
  const gameState = gameStore.getState();
  const screen = findScreen(state.activeScreenId);
  if (!screen) return;
  if (lastScreenId !== screen.id) { actionFeedback=''; lastScreenId=screen.id; }
  dom.pageTitle.textContent = screen.title;
  dom.screenId.textContent = screen.id;
  dom.breadcrumbs.textContent = `画面一覧 / ${screen.category} / ${screen.title}`;
  dom.categoryLabel.textContent = screen.category;
  dom.backButton.disabled = state.historyIndex <= 0;
  dom.forwardButton.disabled = state.historyIndex >= state.history.length - 1;
  if (dom.searchInput.value !== state.searchQuery) dom.searchInput.value = state.searchQuery;
  dom.relatedTitle.textContent = screen.title;
  dom.relatedScreenId.textContent = screen.id;
  dom.relatedDescription.textContent = `${screen.category}カテゴリの画面です。利用できる機能は各画面の操作パネルに表示されます。`; 
  renderNavigation(dom.navigation, screenGroups, screen.id, id => uiStore.navigateTo(id), {
    activeCategory: state.activeCategory,
    searchQuery: state.searchQuery,
    onCategoryChange: category => uiStore.openCategory(category),
  });
  renderScreen(dom.screenRoot, screen, gameState, {
    filter: state.fieldFilters[screen.id] ?? '',
    onFilterChange: value => uiStore.setFieldFilter(screen.id, value),
    onNavigate: id => uiStore.navigateTo(id),
    onAction: (action,payload) => { const result=gameStore.performAction(action,payload);actionFeedback=result.message??(result.ok?'操作を反映しました。':result.reason);dom.systemMessage.textContent=actionFeedback; },
  });
  dom.systemMessage.textContent = actionFeedback || `${screen.id} を表示中 · ${gameState.initialized ? `${gameState.timeline.turnsElapsed}ターン経過` : '人生開始前'}`;
  const wantsDialog = state.helpOpen;
  if (wantsDialog && !dom.helpDialog.open) dom.helpDialog.showModal();
  if (!wantsDialog && dom.helpDialog.open) dom.helpDialog.close();
}

function renderGameStatus(snapshot) {
  const t = snapshot.timeline;
  $('#date-label').textContent = `${t.year}年${t.month}月`;
  $('#age-label').textContent = `${t.ageYears}歳`;
  $('#profile-label').textContent = snapshot.initialized ? snapshot.player.name : 'プレイヤー未作成';
  $('#save-status').textContent = saveRepository ? (saveFeedback || '自動保存有効') : '保存不可';
  $('#version-label').textContent = 'v4.2.0 · 第41段階';
  $('#catalog-count').textContent = `${screenGroups.length}カテゴリ / ${screenGroups.reduce((sum, g) => sum + g.screens.length, 0)}画面`;
  $('#start-game').disabled = snapshot.initialized;
  $('#player-name').disabled = snapshot.initialized;
  $('#advance-turn').disabled = !snapshot.initialized || snapshot.ending?.dead || t.year >= 2200;
  $('#save-game').disabled = !saveRepository || !snapshot.initialized || ($('#save-slot').value==='人生記録' && !snapshot.ending?.dead);
  $('#load-game').disabled = !saveRepository;
  $('#save-details').textContent = saveFeedback || '時間進行・操作・イベント確認のたびに自動保存します。人生記録は死亡後に保存されます。';
  $('#turn-length').textContent = snapshot.initialized ? `次のターン：${t.ageYears < 15 ? '3か月' : '1か月'}` : '開始後に時間進行できます';
  $('#turn-count').textContent = `${t.turnsElapsed} ターン経過`;
  const events = $('#pending-event-list');
  events.replaceChildren();
  if (!snapshot.pendingEvents.length) {
    const message = document.createElement('p');
    message.className = 'muted small';
    message.textContent = '対応待ちの時間イベントはありません。';
    events.append(message);
  }
  for (const event of snapshot.pendingEvents) {
    const entry = document.createElement('div');
    entry.className = 'phase3-event';
    const heading = document.createElement('strong'); heading.textContent = event.title;
    const description = document.createElement('p'); description.textContent = event.description;
    const acknowledge = document.createElement('button');
    acknowledge.type = 'button'; acknowledge.className = 'button button-secondary';
    if(event.type==='choice' && event.options){
      for(const option of event.options){const choice=document.createElement('button');choice.type='button';choice.className='button button-secondary';choice.textContent=option.label;
        choice.addEventListener('click',()=>gameStore.performAction('resolveChoice',{eventId:event.id,choice:option.id}));entry.append(choice);}
    }else{acknowledge.textContent='確認済みにする';acknowledge.addEventListener('click',()=>gameStore.acknowledgeEvent(event.id));entry.append(acknowledge);}
    entry.prepend(heading,description);events.append(entry);
  }
  $('#notification-button .notification-count')?.replaceChildren(document.createTextNode(String(snapshot.pendingEvents.length)));
  document.querySelector('.time-static').textContent = snapshot.initialized ? '手動進行' : '進行停止中';
}

uiStore.subscribe(render);
gameStore.subscribe(snapshot => {
  if(saveRepository && snapshot.initialized){
    const saved=saveRepository.save('自動保存',snapshot);
    if(!saved.ok) saveFeedback=saved.reason;
    if(snapshot.ending?.dead)saveRepository.save('人生記録',snapshot);
  }
  renderGameStatus(snapshot); render(uiStore.getState());
});
renderGameStatus(gameStore.getState());
render(uiStore.getState());
$('#save-slot').addEventListener('change',()=>renderGameStatus(gameStore.getState()));
$('#save-game').addEventListener('click',()=>{
 if(!saveRepository)return;
 if($('#save-slot').value==='人生記録' && !gameStore.getState().ending?.dead){saveFeedback='人生記録は死亡後に保存できます。';renderGameStatus(gameStore.getState());return;}
 const result=saveRepository.save($('#save-slot').value,gameStore.getState());
 saveFeedback=result.ok?'手動保存しました。':result.reason;
 renderGameStatus(gameStore.getState());dom.systemMessage.textContent=saveFeedback;
});
$('#load-game').addEventListener('click',()=>{
 if(!saveRepository)return;
 const result=saveRepository.load($('#save-slot').value);
 if(!result.ok){saveFeedback=result.reason;}else{
   gameStore.loadState(result.state);
   saveFeedback=result.recovered?'保存データが破損していたため予備から復旧しました。':'保存データを読み込みました。';
 }
 renderGameStatus(gameStore.getState());dom.systemMessage.textContent=saveFeedback;
});
$('#restart-game').addEventListener('click',()=>{
 if(gameStore.getState().initialized && !window.confirm('現在の人生を終了し、新しい人生を始めますか？ 保存していない進行は失われます。'))return;
 gameStore.restart();
 saveRepository?.clear('自動保存');
 saveFeedback='新しい人生を開始できます。';
 renderGameStatus(gameStore.getState());dom.systemMessage.textContent=saveFeedback;
});
$('#start-game').addEventListener('click', () => {
  const result = gameStore.startNewGame({ name: $('#player-name').value.trim() || 'プレイヤー' });
  if (!result.ok) dom.systemMessage.textContent = result.reason;
});
$('#advance-turn').addEventListener('click', () => {
  const result = gameStore.advanceTurn();
  if (!result.ok) dom.systemMessage.textContent = result.reason;
});
dom.backButton.addEventListener('click', () => uiStore.back());
dom.forwardButton.addEventListener('click', () => uiStore.forward());
dom.searchInput.addEventListener('input', event => uiStore.setSearchQuery(event.target.value));
$('#help-button').addEventListener('click', () => uiStore.setHelpOpen(true));
$('#close-help').addEventListener('click', () => uiStore.setHelpOpen(false));
dom.helpDialog.addEventListener('close', () => {
  if (uiStore.getState().helpOpen) uiStore.setHelpOpen(false);
});
$('#notification-button').addEventListener('click', () => {
  dom.systemMessage.textContent = `${gameStore.getState().pendingEvents.length}件の時間イベントがあります。右側の重要イベント欄で確認できます。`;
});

// Only user-interface history is affected by keyboard navigation.
document.addEventListener('keydown', event => {
  if (!(event.ctrlKey && event.altKey) || event.repeat) return;
  if (event.key === 'ArrowLeft') { event.preventDefault(); uiStore.back(); }
  if (event.key === 'ArrowRight') { event.preventDefault(); uiStore.forward(); }
});
