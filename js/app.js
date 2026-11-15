import {createSaveRepository} from './core/saveSystems.js';
import { screenGroups, findScreen } from './core/screenCatalog.js';
import { createGameStore, createRandomBirthday } from './core/gameState.js';
import { createUiStore } from './ui/uiState.js';
import { renderNavigation } from './ui/navigation.js';
import { renderScreen } from './ui/screenRenderer.js';

const gameStore = createGameStore({interactiveChoices:true});
let saveRepository = null;
try { saveRepository=createSaveRepository(window.localStorage); } catch { /* private browsing */ }
let saveFeedback = '';
let actionFeedback = '';
let storyResult = null;
let lastScreenId = null;
const $ = selector => document.querySelector(selector);
const uiStore = createUiStore();
const dom = {
  navigation: $('#main-navigation'), screenRoot: $('#screen-root'),
  pageTitle: $('#page-title'), screenId: $('#screen-id'), breadcrumbs: $('#breadcrumbs'),
  categoryLabel: $('#category-label'), systemMessage: $('#system-message'),
  backButton: $('#nav-back'), forwardButton: $('#nav-forward'), searchInput: $('#screen-search'),
  helpDialog: $('#help-dialog'), storyDialog: $('#story-dialog'), storyContent: $('#story-content'),
  settingsDialog: $('#settings-dialog'),
};
if(saveRepository){
  const loaded = saveRepository.load('自動保存');
  if(loaded.ok){
    gameStore.loadState(loaded.state);
    saveFeedback=loaded.recovered?'予備データから復旧しました。':'自動保存から再開しました。';
  }
}

function openSettings(){
  if(!dom.settingsDialog.open)dom.settingsDialog.showModal();
}
function navigateTo(id){
  uiStore.navigateTo(id);
  if(id==='SETTING-01')openSettings();
  $('#sidebar').classList.remove('open');
  $('#toggle-nav').setAttribute('aria-expanded','false');
}
function render(state){
  const gameState=gameStore.getState();
  const screen=findScreen(state.activeScreenId);
  if(!screen)return;
  if(lastScreenId!==screen.id){actionFeedback='';lastScreenId=screen.id;}
  dom.pageTitle.textContent=screen.title;
  dom.screenId.textContent=screen.id;
  dom.breadcrumbs.textContent=`画面一覧 / ${screen.category} / ${screen.title}`;
  dom.categoryLabel.textContent=screen.category;
  dom.backButton.disabled=state.historyIndex<=0;
  dom.forwardButton.disabled=state.historyIndex>=state.history.length-1;
  if(dom.searchInput.value!==state.searchQuery)dom.searchInput.value=state.searchQuery;
  renderNavigation(dom.navigation,screenGroups,screen.id,navigateTo,{
    activeCategory:state.activeCategory, searchQuery:state.searchQuery,
    onCategoryChange:category=>uiStore.openCategory(category),
  });
  renderScreen(dom.screenRoot,screen,gameState,{
    filter:state.fieldFilters[screen.id]??'',
    onFilterChange:value=>uiStore.setFieldFilter(screen.id,value),
    onNavigate:navigateTo,
    onPlay:()=>{
      if(gameState.pendingEvents.some(e=>e.type==='choice'))renderStoryDialog();
      else if(gameState.initialized)advanceTurn();
      else $('#player-name').focus();
    },
    onSettings:openSettings,
    onAction:(action,payload)=>{
      const result=gameStore.performAction(action,payload);
      actionFeedback=result.message??(result.ok?'操作を反映しました。':result.reason);
      dom.systemMessage.textContent=actionFeedback;
    },
  });
  dom.systemMessage.textContent=actionFeedback||`${screen.id} を表示中 · ${gameState.initialized?`${gameState.timeline.turnsElapsed}ターン経過`:'人生開始前'}`;
  if(state.helpOpen&&!dom.helpDialog.open)dom.helpDialog.showModal();
  if(!state.helpOpen&&dom.helpDialog.open)dom.helpDialog.close();
}
function button(label, className='button button-secondary'){
  const b=document.createElement('button');b.type='button';b.className=className;b.textContent=label;return b;
}
function storyEvent(snapshot){return snapshot.pendingEvents.find(event=>event.type==='choice');}
function renderStoryDialog(){
  const event=storyEvent(gameStore.getState());
  dom.storyContent.replaceChildren();
  if(!event&&!storyResult){
    if(dom.storyDialog.open)dom.storyDialog.close();
    return;
  }
  if(storyResult){
    const eyebrow=document.createElement('p');eyebrow.className='story-eyebrow';eyebrow.textContent='YOUR DECISION';
    const heading=document.createElement('h2');heading.id='story-title';heading.textContent='選択の結果';
    const desc=document.createElement('p');desc.id='story-description';desc.className='story-prompt';desc.textContent=storyResult.message;
    const impacts=document.createElement('div');impacts.className='story-impact-list';
    for(const text of storyResult.changes??[]){const span=document.createElement('span');span.textContent=text;impacts.append(span);}
    const nav=document.createElement('div');nav.className='story-result-actions';
    const close=button('人生画面へ戻る');close.addEventListener('click',()=>{storyResult=null;renderStoryDialog();navigateTo('LIFE-01');});
    const next=button('次のターンへ進む →','button button-primary');
    next.addEventListener('click',()=>{storyResult=null;advanceTurn();});
    nav.append(close,next);
    dom.storyContent.append(eyebrow,heading,desc,impacts,nav);
  }else{
    const eyebrow=document.createElement('p');eyebrow.className='story-eyebrow';
    eyebrow.textContent=`${event.year}年${event.month}月 · ${event.category??'人生の選択'} · TURN ${event.turn}`;
    const heading=document.createElement('h2');heading.id='story-title';heading.textContent=event.title;
    const description=document.createElement('p');description.id='story-description';description.className='story-prompt';description.textContent=event.description;
    const hint=document.createElement('p');hint.className='story-hint';hint.textContent='どう行動する？ 選んだ結果は能力や人生記録に残ります。';
    const choices=document.createElement('div');choices.className='story-choices';
    for(const option of event.options??[]){
      const item=button('','story-option');
      const label=document.createElement('strong');label.textContent=option.label;
      const summary=document.createElement('span');summary.textContent=option.hint??'この行動を選ぶ';
      const arrow=document.createElement('span');arrow.className='story-arrow';arrow.textContent='→';
      item.append(label,summary,arrow);
      item.addEventListener('click',()=>{
        const result=gameStore.performAction('resolveChoice',{eventId:event.id,choice:option.id});
        if(result.ok){storyResult={message:result.message??'人生の選択を記録しました。',changes:result.changes??[]};renderStoryDialog();}
        else dom.systemMessage.textContent=result.reason;
      });
      choices.append(item);
    }
    dom.storyContent.append(eyebrow,heading,description,hint,choices);
  }
  if(!dom.storyDialog.open)dom.storyDialog.showModal();
}
function renderGameStatus(snapshot){
  const t=snapshot.timeline;
  const gameInProgress=snapshot.initialized;
  const queued=storyEvent(snapshot);
  $('#date-label').textContent=`${t.year}年${t.month}月`;
  $('#age-label').textContent=`${t.ageYears}歳`;
  $('#profile-label').textContent=gameInProgress?snapshot.player.name:'プレイヤー未作成';
  $('#hub-name').textContent=gameInProgress?snapshot.player.name:'人生を始めよう';
  $('#hub-age').innerHTML=`${t.ageYears}<span>歳</span>`;
  $('#hub-birthday').textContent=gameInProgress?`誕生日：2000年${snapshot.player.birth.month}月${snapshot.player.birth.day}日`:'2000年生まれ。誕生日はランダム。';
  $('#turn-count').textContent=String(t.turnsElapsed);
  $('#player-setup').hidden=gameInProgress;
  $('#start-game').disabled=gameInProgress;
  $('#player-name').disabled=gameInProgress;
  const next=$('#advance-turn');
  next.disabled=!gameInProgress||snapshot.ending?.dead||t.year>=2200;
  next.textContent=queued?'人生の選択をする →':'次のターンへ進む →';
  $('#turn-length').textContent=gameInProgress?(queued?'選択を確定すると時間を進められます':`次のターンは${t.ageYears<15?'3か月':'1か月'}後`):'人生を開始すると進行できます。';
  $('#save-status').textContent=saveRepository?(saveFeedback||'自動保存ON'):'保存不可';
  $('#save-game').disabled=!saveRepository||!gameInProgress||($('#save-slot').value==='人生記録'&&!snapshot.ending?.dead);
  $('#load-game').disabled=!saveRepository;
  $('#save-details').textContent=saveFeedback||'ターン進行・選択のたびに自動保存します。';
  $('#version-label').textContent='v4.3.0 · 選択イベント版';
  $('#catalog-count').textContent=`${screenGroups.length}カテゴリ / ${screenGroups.reduce((sum,g)=>sum+g.screens.length,0)}画面`;
  $('#event-count').textContent=String(snapshot.pendingEvents.length);
  $('#hub-event-message').textContent=queued?queued.title:(gameInProgress?'次の出来事を待っています。':'まずは人生を始めてみましょう。');
  $('#open-event').disabled=!queued;
  const eventContainer=$('#pending-event-list');eventContainer.replaceChildren();
  const notices=snapshot.pendingEvents.filter(e=>e.type!=='choice').slice(-3).reverse();
  if(!notices.length){const p=document.createElement('p');p.className='muted small';p.textContent='未確認のお知らせはありません。';eventContainer.append(p);}
  for(const event of notices){
    const row=document.createElement('div');row.className='phase3-event';
    const heading=document.createElement('strong');heading.textContent=event.title;
    const desc=document.createElement('p');desc.textContent=event.description;
    const done=button('確認済みにする');done.addEventListener('click',()=>gameStore.acknowledgeEvent(event.id));
    row.append(heading,desc,done);eventContainer.append(row);
  }
  $('#notification-button .notification-count').textContent=String(snapshot.pendingEvents.length);
  $('.time-static').textContent=gameInProgress?'手動進行':'進行停止中';
}
function advanceTurn(){
  const pending=storyEvent(gameStore.getState());
  if(pending){storyResult=null;renderStoryDialog();return;}
  const result=gameStore.advanceTurn();
  if(!result.ok)dom.systemMessage.textContent=result.reason;
}
uiStore.subscribe(render);
gameStore.subscribe(snapshot=>{
  if(saveRepository&&snapshot.initialized){
    const saved=saveRepository.save('自動保存',snapshot);
    if(!saved.ok)saveFeedback=saved.reason;
    if(snapshot.ending?.dead)saveRepository.save('人生記録',snapshot);
  }
  renderGameStatus(snapshot);
  render(uiStore.getState());
  renderStoryDialog();
});
renderGameStatus(gameStore.getState());
render(uiStore.getState());
renderStoryDialog();
$('#save-slot').addEventListener('change',()=>renderGameStatus(gameStore.getState()));
$('#save-game').addEventListener('click',()=>{
  if(!saveRepository)return;
  if($('#save-slot').value==='人生記録'&&!gameStore.getState().ending?.dead){saveFeedback='人生記録は死亡後に保存できます。';renderGameStatus(gameStore.getState());return;}
  const result=saveRepository.save($('#save-slot').value,gameStore.getState());
  saveFeedback=result.ok?'保存しました。':result.reason;
  renderGameStatus(gameStore.getState());dom.systemMessage.textContent=saveFeedback;
});
$('#load-game').addEventListener('click',()=>{
  if(!saveRepository)return;
  const result=saveRepository.load($('#save-slot').value);
  if(!result.ok)saveFeedback=result.reason;
  else {storyResult=null;gameStore.loadState(result.state);saveFeedback=result.recovered?'予備から復旧しました。':'保存データを読み込みました。';}
  dom.settingsDialog.close();renderGameStatus(gameStore.getState());dom.systemMessage.textContent=saveFeedback;
});
$('#restart-game').addEventListener('click',()=>{
  if(gameStore.getState().initialized&&!window.confirm('現在の人生を終了し、新しい人生を始めますか？ 自動保存の進行は失われます。'))return;
  storyResult=null;gameStore.restart();saveRepository?.clear('自動保存');
  saveFeedback='新しい人生を開始できます。';
  dom.settingsDialog.close();navigateTo('LIFE-01');renderGameStatus(gameStore.getState());
});
$('#start-game').addEventListener('click',()=>{
  const randomSeed=typeof window.crypto?.getRandomValues==='function'?window.crypto.getRandomValues(new Uint32Array(1))[0]:Math.floor(Math.random()*4294967296);
  const birth=createRandomBirthday(randomSeed);
  const result=gameStore.startNewGame({name:$('#player-name').value.trim()||'プレイヤー',seed:randomSeed,birth});
  if(!result.ok)dom.systemMessage.textContent=result.reason;
});
$('#advance-turn').addEventListener('click',advanceTurn);
$('#open-event').addEventListener('click',()=>{storyResult=null;renderStoryDialog();});
dom.storyDialog.addEventListener('cancel',event=>{
  if(storyEvent(gameStore.getState()))event.preventDefault();
  else storyResult=null;
});
$('#open-settings').addEventListener('click',openSettings);
$('#hub-settings').addEventListener('click',openSettings);
$('#close-settings').addEventListener('click',()=>dom.settingsDialog.close());
$('#toggle-nav').addEventListener('click',()=>{
  const opened=$('#sidebar').classList.toggle('open');
  $('#toggle-nav').setAttribute('aria-expanded',String(opened));
});
dom.backButton.addEventListener('click',()=>uiStore.back());
dom.forwardButton.addEventListener('click',()=>uiStore.forward());
dom.searchInput.addEventListener('input',event=>uiStore.setSearchQuery(event.target.value));
$('#help-button').addEventListener('click',()=>uiStore.setHelpOpen(true));
$('#close-help').addEventListener('click',()=>uiStore.setHelpOpen(false));
dom.helpDialog.addEventListener('close',()=>{if(uiStore.getState().helpOpen)uiStore.setHelpOpen(false);});
$('#notification-button').addEventListener('click',()=>{
  if(storyEvent(gameStore.getState()))renderStoryDialog();
  else dom.systemMessage.textContent='未確認のお知らせは右側の「過去の通知を確認」から見られます。';
});
document.addEventListener('keydown',event=>{
  if(!(event.ctrlKey&&event.altKey)||event.repeat)return;
  if(event.key==='ArrowLeft'){event.preventDefault();uiStore.back();}
  if(event.key==='ArrowRight'){event.preventDefault();uiStore.forward();}
});
