import {screenGroups} from '../core/screenCatalog.js';
import {categoryActivities,hasFreeAction,categoryLanding} from './topicGroups.js';
import {renderTurnActivity} from './turnActivities.js';
import {getLifeThreads} from '../core/branchingStories.js';
import {createOpportunityProgress} from '../core/opportunitySystems.js';
import {renderLifeGoalPanel,renderLifeReview} from './lifeGoalPanel.js';
const el=(tag,klass='',text='')=>{
  const node=document.createElement(tag);if(klass)node.className=klass;
  if(text!==undefined&&text!==null)node.textContent=text;
  return node;
};
const average=values=>Math.round(values.reduce((sum,v)=>sum+v,0)/Math.max(1,values.length));
const fmt=n=>Math.round(n||0).toLocaleString('ja-JP');
function quickButton(label,callback){
  const node=el('button','button button-secondary dashboard-shortcut',label+' →');
  node.type='button';node.addEventListener('click',callback);return node;
}
function primaryAction(label,onClick){
  const node=el('button','button button-primary dashboard-primary',label);
  node.type='button';node.addEventListener('click',onClick);return node;
}
function goalFor(age,education,finance){
  if(age<6)return ['家族との絆を育てる','絵本や遊びから、毎ターン少しずつ力を身につけよう。'];
  if(age<15)return ['好きなことを見つける',`学力・友だち・体力のバランスを意識してみよう。現在は${education.stage}。`];
  if(age<20)return ['未来の選択肢を増やす','勉強と技能を磨き、進路に備えよう。'];
  if(age<65)return ['仕事と暮らしを築く',finance.career.job?'今の仕事と大切な人の時間、どちらも人生を形づくる。':'職業・転職の画面から仕事を探せます。'];
  return ['これまでの経験を未来へつなぐ','健康・家族・趣味の中で、自分らしい時間を選ぼう。'];
}
/** Only the actual play hub is shown on the landing screen, not developer field lists. */
export function renderPlayDashboard(container,state,handlers={}){
  const root=el('div','play-dashboard');
  const started=Boolean(state?.initialized);
  const queued=state?.pendingEvents?.find(e=>e.type==='choice');
  const hero=el('section','play-hero');
  const intro=el('div','play-hero-content');
  intro.append(el('span','play-eyebrow',started?'あなたの物語は続いている':'2000年、日本からはじまる'),
    el('h2','',started?`${state.player.name}の、次の物語。`:'人生は、選択で変わる。'),
    el('p','',started?`現在${state.timeline.ageYears}歳。${state.timeline.year}年${state.timeline.month}月。今、何を大切に生きますか？`:'誕生日も、選ぶ道も、人それぞれ。ひとつの正解のない人生を始めよう。'));
  const action=primaryAction(started?(queued?'今の出来事を選ぶ →':'次のターンへ進む →'):'プレイヤー名を入力してはじめる →',()=>handlers.onPlay?.());
  if(!started)intro.append(action);
  else intro.append(el('p','play-next-hint','右側の「次のターンへ進む」を押すと、出来事が表示されます。'));
  const ring=el('div','play-hero-ring');ring.append(el('span','','LIFE'),el('strong','',String(state?.timeline?.ageYears??0)),el('small','','years old'));
  hero.append(intro,ring);root.append(hero);
  if(!started){
    const message=el('div','play-welcome');
    message.append(el('h3','','このゲームでできること'),el('p','', '毎ターン現れる出来事から行動を選び、学力・技能・体力・心・人間関係を伸ばせます。選択は記録され、進学・仕事・家族・資産のシステムにもつながります。'));
    root.append(message);container.replaceChildren(root);return;
  }
  const education=state.education;
  const health=state.health;
  const finance=state.finances;
  const relations=state.people.filter(p=>p.role!=='本人').map(p=>p.relationship);
  const knowledge=average(Object.values(education.scores));
  const social=relations.length?average(relations):50;
  const metrics=el('div','play-stats');
  for(const [label,value,description,kind] of [
    ['学力',knowledge,'勉強や経験で成長','knowledge'],
    ['体力',health.physical,'無理はほどほどに','physical'],
    ['こころ',health.mental,'気持ちの健康','mind'],
    ['人とのつながり',social,'家族や友人との絆','relation']]){
    const card=el('article',`play-stat play-stat-${kind}`);
    const top=el('div','play-stat-top');top.append(el('span','',label),el('strong','',String(value)));
    const track=el('div','play-meter');const fill=el('span');fill.style.width=`${Math.min(100,Math.max(0,value))}%`;track.append(fill);
    card.append(top,track,el('small','',description));metrics.append(card);
  }
  root.append(metrics);
  const personalGoal=renderLifeGoalPanel(state,handlers.onAction);
  if(personalGoal)root.append(personalGoal);
  if(state.ending?.dead){root.append(renderLifeReview(state,{expanded:true}));container.replaceChildren(root);return;}
  // Show playable destinations at first glance, not only a next-turn button.
  const opportunities=el('section','play-card play-opportunities');
  const ready=hasFreeAction(state);
  opportunities.append(el('h3','',ready?'今できること — カテゴリから選ぼう':'人生を選んだら、カテゴリでも行動できます'));
  opportunities.append(el('p','',ready?'光っているカテゴリは行動できます。どこかで1回行動すると、そのターンの自由行動は終了します。':'「次のターンへ進む」で出来事を選択すると、カテゴリから自由行動ができるようになります。'));
  const choices=el('div','category-opportunities');
  for(const group of screenGroups){
    if(!categoryActivities(state,group.category).length)continue;
    const btn=el('button','',group.category+' →');btn.type='button';
    btn.addEventListener('click',()=>handlers.onNavigate?.(categoryLanding(group.category)));
    if(ready)btn.append(el('small','','● 行動可'));
    choices.append(btn);
  }
  opportunities.append(choices);root.append(opportunities);
  root.append(renderTurnActivity(state,handlers.onAction));
  const lower=el('div','play-lower');
  const storyCard=el('section','play-card play-story-card');
  const heading=el('div','play-card-heading');heading.append(el('h3','','人生の記録'),el('span','','最新の4件'));storyCard.append(heading);
  const recent=state.eventHistory.filter(e=>e.type==='choice-result'||['birthday','education','job-loss','death'].includes(e.type)).slice(-4).reverse();
  if(!recent.length)storyCard.append(el('p','play-empty','最初の選択から、あなただけの人生記録が始まります。'));
  for(const event of recent){
    const item=el('article','play-history-item');
    item.append(el('span','play-history-date',`${event.year}年${event.month}月`),el('strong','',event.title),el('p','',event.description));
    storyCard.append(item);
  }
  // Keep long-lived paths collapsed by default: visible feedback without adding a long action list.
  const paths=getLifeThreads(state.storyProgress);
  if(paths.length){
    const panel=el('details','play-life-paths');
    const active=paths.filter(p=>!p.completed).length;
    panel.append(el('summary','',`過去の選択から続く物語：${paths.length}件（進行中${active}件）`));
    const list=el('ul','play-life-path-list');
    for(const path of paths){
      const item=el('li','');
      item.append(el('strong','',`${path.label}：${path.path}`),el('span','',path.completed?'物語の一区切りを迎えました':`${path.nextAge}歳頃に続きが訪れます`));
      list.append(item);
    }
    panel.append(list);
    storyCard.append(panel);
  }
  const details=el('details','play-history-detail');const summary=el('summary','','過去の出来事を詳しく見る');details.append(summary);
  const link=quickButton('人生タイムラインを見る',()=>handlers.onNavigate?.('HISTORY-01'));details.append(link);storyCard.append(details);
  const side=el('div','play-lower-side');
  const goals=goalFor(state.timeline.ageYears,education,finance);
  const focus=el('section','play-card play-focus');focus.append(el('span','play-eyebrow','いまの人生のテーマ'),el('h3','',goals[0]),el('p','',goals[1]));
  const skill=el('section','play-card play-skills');skill.append(el('h3','','積み重ねた技能'));
  const skills=el('div','play-skill-tags');
  for(const name of ['読書','パソコン','運動'])skills.append(el('span','',`${name} ${education.skills[name]??0}`));
  skill.append(skills);
  const money=el('section','play-card play-money');money.append(el('h3','','くらしのお金'),el('p','',`現金：${fmt(finance.cash)} 円`));
  const op=state.opportunity47??createOpportunityProgress();
  if(op.education.loanBalance+op.education.unpaidTuition>0)money.append(el('p','',`教育費の残債：${fmt(op.education.loanBalance+op.education.unpaidTuition)}円`));
  if(education.stage==='大学')money.append(el('p','',`学費：月36,000円 ／ 奨学金：${fmt(op.education.grantMonthly)}円`));
  if(finance.career.job)money.append(el('p','',`月給：${fmt(finance.career.monthlySalary)}円`));
  const shortcuts=el('details','play-shortcuts');shortcuts.append(el('summary','','詳しい状況を見る'));
  const links=el('div','play-shortcut-links');
  links.append(quickButton('学業',()=>handlers.onNavigate?.('EDU-01')),quickButton('仕事',()=>handlers.onNavigate?.('WORK-01')),quickButton('健康',()=>handlers.onNavigate?.('HEALTH-01')));
  shortcuts.append(links);money.append(shortcuts);
  side.append(focus,skill,money);lower.append(storyCard,side);root.append(lower);
  container.replaceChildren(root);
}
