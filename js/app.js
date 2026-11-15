import {createSaveRepository} from './core/saveSystems.js';
import {serializePortableSave,parsePortableSave,MAX_PORTABLE_CHARS} from './core/portableSaves.js';
import { screenGroups, findScreen } from './core/screenCatalog.js';
import { createGameStore, createRandomBirthday } from './core/gameState.js';
import { createUiStore } from './ui/uiState.js';
import { renderNavigation } from './ui/navigation.js';
import { renderScreen } from './ui/screenRenderer.js';
import {renderTopicPage} from './ui/topicPage.js';
import {renderCategoryDock} from './ui/categoryDock.js';
import {categoryLanding,getTopic} from './ui/topicGroups.js';

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
  settingsDialog: $('#settings-dialog'), categoryDock: $('#category-dock'),topicStrip:$('#topic-strip'),
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
  $('#sidebar').classList.remove('open');
  $('#toggle-nav').setAttribute('aria-expanded','false');
}
function render(state){
  const gameState=gameStore.getState();
  const screen=findScreen(state.activeScreenId);
  if(!screen)return;
  if(lastScreenId!==screen.id){actionFeedback='';lastScreenId=screen.id;}
  const mergedTopic=getTopic(screen.id);
  dom.pageTitle.textContent=mergedTopic?.screenIds.length>1?mergedTopic.title:screen.title;
  dom.screenId.textContent=mergedTopic?.screenIds.length>1?`${mergedTopic.screenIds.length}項目`:screen.id;
  dom.breadcrumbs.textContent=`カテゴリ / ${screen.category} / ${mergedTopic?.title??screen.title}`;
  dom.categoryLabel.textContent=screen.category;
  dom.backButton.disabled=state.historyIndex<=0;
  dom.forwardButton.disabled=state.historyIndex>=state.history.length-1;
  if(dom.searchInput.value!==state.searchQuery)dom.searchInput.value=state.searchQuery;
  renderNavigation(dom.navigation,screenGroups,screen.id,navigateTo,{
    activeCategory:state.activeCategory, searchQuery:state.searchQuery,
    onCategoryChange:category=>uiStore.openCategory(category),
  });
  renderCategoryDock(dom.categoryDock,dom.topicStrip,screen,state,gameState,{
    onCategory:category=>{
      if(category===screen.category)uiStore.openCategory(category);
      else navigateTo(categoryLanding(category));
    },
    onTopic:navigateTo,
  });
  const screenHandlers={
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
  };
  if(getTopic(screen.id)?.screenIds.length>1)renderTopicPage(dom.screenRoot,screen,gameState,screenHandlers);
  else renderScreen(dom.screenRoot,screen,gameState,screenHandlers);
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
  if(!event){if(dom.storyDialog.open)dom.storyDialog.close();return;}
  dom.storyContent.replaceChildren();
  const eyebrow=document.createElement('p');eyebrow.className='story-eyebrow';
  eyebrow.textContent=`${event.year}年${event.month}月 · ${event.category??'人生の選択'} · TURN ${event.turn}`;
  const heading=document.createElement('h2');heading.id='story-title';heading.textContent=event.title;
  const description=document.createElement('p');description.id='story-description';description.className='story-prompt';description.textContent=event.description;
  const hint=document.createElement('p');hint.className='story-hint';hint.textContent='いずれか1つを選ぶと画面に戻ります。選択結果はダッシュボードと人生の履歴に残ります。';
  heading.tabIndex=-1;
  const error=document.createElement('p');error.id='story-action-error';error.className='story-action-error';error.setAttribute('role','alert');
  const choices=document.createElement('div');choices.className='story-choices';
  for(const option of event.options??[]){
    const item=button('','story-option');
    const label=document.createElement('strong');label.textContent=option.label;
    const summary=document.createElement('span');summary.textContent=option.hint??'この行動を選ぶ';
    const arrow=document.createElement('span');arrow.className='story-arrow';arrow.textContent='→';
    item.append(label,summary,arrow);
    item.addEventListener('click',()=>{
      item.disabled=true;
      const result=gameStore.performAction('resolveChoice',{eventId:event.id,choice:option.id});
      if(result.ok){
        storyResult={message:result.message??'人生の選択を記録しました。',changes:result.changes??[],title:event.title};
        if(dom.storyDialog.open)dom.storyDialog.close();
        renderGameStatus(gameStore.getState());
        $('#choice-feedback').focus({preventScroll:true});
        dom.systemMessage.textContent=`選択完了：${storyResult.message}`;
      }else{item.disabled=false;error.textContent=result.reason;error.focus();dom.systemMessage.textContent=result.reason;}
    });
    choices.append(item);
  }
  const defer=button('今は閉じる（選択は後で）');
  defer.classList.add('story-defer');defer.addEventListener('click',()=>dom.storyDialog.close());
  dom.storyContent.append(eyebrow,heading,description,hint,choices,error,defer);
  if(!dom.storyDialog.open)dom.storyDialog.showModal();
  heading.focus({preventScroll:true});
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
  next.textContent='次のターンへ進む →';
  $('#fast-forward-turn').disabled=!gameInProgress||snapshot.ending?.dead||Boolean(queued)||t.year>=2200;
  $('#fast-forward-focus').value=snapshot.balance48?.focus??'balanced';
  const fastSummary=snapshot.balance48?.lastSummary;
  $('#fast-forward-feedback').textContent=fastSummary?`${fastSummary.turns}ターン進行・通常選択${fastSummary.auto}件を自動処理。${fastSummary.reason}`:'';
  $('#turn-length').textContent=gameInProgress?(queued?'次のターンのボタンを押して、出来事を選択してください。':`次は${t.ageYears<15?'3か月':'1か月'}後へ進みます`):'人生を開始すると進行できます。';
  $('#save-status').textContent=saveRepository?(saveFeedback||'自動保存ON'):'保存不可';
  $('#save-game').disabled=!saveRepository||!gameInProgress||($('#save-slot').value==='人生記録'&&!snapshot.ending?.dead);
  $('#load-game').disabled=!saveRepository;
  $('#save-details').textContent=saveFeedback||'ターン進行・選択のたびに自動保存します。';
  $('#version-label').textContent='v5.7.0 · 操作性と体験の改善版';
  $('#export-game').disabled=!gameInProgress;
  $('#catalog-count').textContent=`${screenGroups.length}カテゴリ / ${screenGroups.reduce((sum,g)=>sum+g.screens.length,0)}画面`;
  $('#event-count').textContent=String(snapshot.pendingEvents.length);
  $('#hub-event-message').textContent=queued?queued.title:(gameInProgress?'次の出来事を待っています。':'まずは人生を始めてみましょう。');
  $('#action-budget').textContent=gameInProgress?`自由行動：${snapshot.turnActions?.turn===t.turnsElapsed&&snapshot.turnActions.used?'実行済み':'あと1回'}`:'自由行動：未開始';
  $('#choice-feedback').textContent=storyResult?`【${storyResult.title}】${storyResult.message}${storyResult.changes?.length?' ／ '+storyResult.changes.join('・'):''}`:queued?'今の出来事を選ぶと、結果をここで確認できます。':'出来事の結果はここに表示されます。';
  const eventContainer=$('#pending-event-list');eventContainer.replaceChildren();
  const allNotices=snapshot.pendingEvents.filter(e=>e.type!=='choice');
  const notices=allNotices.slice(-3).reverse();
  if(allNotices.length){
    const clear=button(`通知をすべて確認済みにする（${allNotices.length}件）`);
    clear.classList.add('hub-clear-notices');
    clear.addEventListener('click',()=>gameStore.acknowledgeNotifications());
    eventContainer.append(clear);
  }
  if(!notices.length){const p=document.createElement('p');p.className='muted small';p.textContent='未確認のお知らせはありません。';eventContainer.append(p);}
  for(const event of notices){
    const row=document.createElement('div');row.className='phase3-event';
    const heading=document.createElement('strong');heading.textContent=event.title;
    const desc=document.createElement('p');desc.textContent=event.description;
    const done=button('確認済みにする');done.addEventListener('click',()=>gameStore.acknowledgeEvent(event.id));
    row.append(heading,desc,done);eventContainer.append(row);
  }
  if(allNotices.length>3){
    const older=document.createElement('p');older.className='hub-hidden-notices';
    older.textContent=`さらに${allNotices.length-3}件の通知があります。上のボタンでまとめて確認できます。`;
    eventContainer.append(older);
  }
  $('#event-count').textContent=String(allNotices.length);
  $('.time-static').textContent=gameInProgress?'手動進行':'進行停止中';
}
function advanceTurn(){
  const pending=storyEvent(gameStore.getState());
  if(pending){renderStoryDialog();return;}
  storyResult=null;
  const result=gameStore.advanceTurn();
  if(!result.ok){dom.systemMessage.textContent=result.reason;return;}
  // Only this explicit button opens a story event, never a state subscriber.
  renderStoryDialog();
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
});
renderGameStatus(gameStore.getState());
render(uiStore.getState());
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
// File backups are optional; they also work when localStorage is disabled.
$('#export-game').addEventListener('click',()=>{
  const backup=serializePortableSave(gameStore.getState());
  if(!backup.ok){dom.systemMessage.textContent=backup.reason;return;}
  const blob=new Blob([backup.text],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;link.download=`jinsei-save-${new Date().toISOString().slice(0,10)}.json`;
  document.body.append(link);link.click();link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),2000);
  saveFeedback='保存ファイルを書き出しました。';
  renderGameStatus(gameStore.getState());
});
$('#import-game-file').addEventListener('change',async event=>{
  const input=event.currentTarget;
  const file=input.files?.[0];
  if(!file)return;
  try{
    if(file.size>MAX_PORTABLE_CHARS*4){saveFeedback='保存ファイルが大きすぎます。';return;}
    const parsed=parsePortableSave(await file.text());
    if(!parsed.ok){saveFeedback=parsed.reason;return;}
    const current=gameStore.getState();
    const person=parsed.state.player.name;
    if(current.initialized&&!window.confirm(`現在の人生を「${person}」の保存データに置き換えますか？\n現在の進行を残したい場合は先にバックアップしてください。`)){
      saveFeedback='読み込みをキャンセルしました。';return;
    }
    const loaded=gameStore.loadState(parsed.state);
    if(!loaded.ok){saveFeedback=loaded.reason;return;}
    storyResult=null;
    saveFeedback=saveRepository?'ファイルから復元しました。自動保存も更新されました。':'ファイルから復元しました。ブラウザ保存は利用できません。';
    dom.settingsDialog.close();navigateTo('LIFE-01');
  }catch{saveFeedback='保存ファイルを読み込めませんでした。';}
  finally{
    input.value='';
    renderGameStatus(gameStore.getState());
    dom.systemMessage.textContent=saveFeedback;
  }
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
$('#fast-forward-turn').addEventListener('click',()=>{
  storyResult=null;
  const result=gameStore.fastForward({focus:$('#fast-forward-focus').value,maxMonths:12});
  if(!result.ok){dom.systemMessage.textContent=result.reason;return;}
  actionFeedback=`${result.months}か月進行：通常選択${result.auto}件を自動処理。${result.reason}`;
  if(result.important)renderStoryDialog();
  else dom.systemMessage.textContent=actionFeedback;
});
dom.storyDialog.addEventListener('cancel',()=>{
  // Esc can dismiss an undecided event; the next-turn button reopens it.
});
$('#open-settings').addEventListener('click',openSettings);
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
document.addEventListener('keydown',event=>{
  if(!(event.ctrlKey&&event.altKey)||event.repeat)return;
  if(event.key==='ArrowLeft'){event.preventDefault();uiStore.back();}
  if(event.key==='ArrowRight'){event.preventDefault();uiStore.forward();}
});
