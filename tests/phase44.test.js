import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {screenGroups} from '../js/core/screenCatalog.js';
import {createGameStore} from '../js/core/gameState.js';
import {topicGroups,categoryLanding,getTopic,categoryActivities,hasFreeAction,assertTopics} from '../js/ui/topicGroups.js';

const read=name=>readFileSync(new URL(`../${name}`,import.meta.url),'utf8');
function newGame(){const game=createGameStore({interactiveChoices:true});assert.equal(game.startNewGame({name:'UI44',seed:412}).ok,true);return game;}

test('61の旧画面を漏れなく重複なく9カテゴリ・まとめページに編成',()=>{
  assert.equal(assertTopics(),true);
  const names=Object.keys(topicGroups);assert.equal(names.length,9);
  assert.deepEqual(names,screenGroups.map(c=>c.category));
  const ids=Object.values(topicGroups).flatMap(ts=>ts.flatMap(t=>t.screenIds));
  assert.equal(ids.length,61);assert.equal(new Set(ids).size,61);
  assert.equal(categoryLanding('学業'),'EDU-01');
  assert.deepEqual(getTopic('EDU-02')?.screenIds,['EDU-01','EDU-02','EDU-03']);
  assert.equal(getTopic('EDU-05')?.title,'進学・資格・履歴');
});

test('選択前はカテゴリで自由行動ができず、選択後はできる場所が判別できる',()=>{
  const g=newGame();const before=g.getState();
  assert.equal(hasFreeAction(before),false);
  const event=before.pendingEvents.find(e=>e.type==='choice');
  assert.equal(g.performAction('resolveChoice',{eventId:event.id,choice:event.options[0].id}).ok,true);
  const state=g.getState();
  assert.equal(hasFreeAction(state),true);
  assert.ok(categoryActivities(state,'学業').some(x=>x.action==='skill'));
  assert.ok(categoryActivities(state,'健康').some(x=>x.action==='habit'));
  assert.ok(categoryActivities(state,'仕事・経営').some(x=>x.action==='skill'));
  assert.equal(categoryActivities(state,'履歴').length,0);
  assert.equal(g.performAction('skill',{skill:'読書'}).ok,true);
  assert.equal(hasFreeAction(g.getState()),false);
});

test('上部カテゴリとまとめ画面はプルダウン不要、詳細は折りたたみで保持',()=>{
  const html=read('index.html'),app=read('js/app.js');
  assert.match(html,/id="category-dock"/);assert.match(html,/id="topic-strip"/);
  assert.match(html,/css\/phase44\.css/);
  assert.match(app,/renderCategoryDock/);assert.match(app,/renderTopicPage/);
  const page=read('js/ui/topicPage.js');
  assert.match(page,/getScreenFieldValues/);assert.match(page,/topic-summary-card/);
  assert.match(page,/詳細・個別操作を見る/);
  assert.match(read('js/ui/categoryDock.js'),/if\(!opened\)return/);
  assert.match(read('js/ui/categoryDock.js'),/aria-expanded/);
});

test('画面統合は最新版でも維持される',()=>{
  assert.match(read('package.json'),/"version": "5\.0\.0"/);
  assert.match(read('README.md'),/STEP 49/);
  assert.match(read('操作説明書.md'),/行動可/);
  assert.match(read('index.html'),/第49段階/);
});
