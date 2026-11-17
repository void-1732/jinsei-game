import {screenGroups} from '../core/screenCatalog.js';
import {categoryActivities,hasFreeAction,categoryLanding} from './topicGroups.js';
import {actionBudget} from '../core/adultActionBudget.js';
import {renderTurnActivity} from './turnActivities.js';
import {renderDailySchedulePanel} from './dailySchedulePanel.js';
import {latestTurnRecap} from './turnRecap.js';
import {getLifeThreads} from '../core/branchingStories.js';
import {getConsequenceSummary} from '../core/consequenceSystems.js';
import {eraSummary} from '../core/eraSystems.js';
import {surpriseSummary,PREPARATION_LABELS} from '../core/surpriseSystems.js';
import {createOpportunityProgress} from '../core/opportunitySystems.js';
import {renderLifeGoalPanel,renderLifeReview} from './lifeGoalPanel.js';
import {renderLifeGuidancePanel} from './lifeGuidancePanel.js';
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
  const recap=latestTurnRecap(state);
  if(recap){
    const panel=el('section','play-card play-turn-recap');
    panel.setAttribute('aria-label','このターンの選択結果');
    panel.append(el('div','play-recap-kicker','✓ このターンの選択結果'),
      el('h3','',recap.title),
      el('p','',recap.description));
    root.append(panel);
  }
  root.append(renderDailySchedulePanel(state,handlers.onAction));
  // A single compact guidance area avoids duplicate warnings and long lists.
  if(!state.ending?.dead){
    const guidance=renderLifeGuidancePanel(state,handlers.onNavigate);
    if(guidance)root.append(guidance);
  }
  const era=eraSummary(state.world);
  if(era){
    const panel=el('section','play-card play-era52');
    panel.append(el('span','play-eyebrow','今月の社会情勢（架空モデル）'),el('h3','','時代の変化と暮らし'));
    const values=el('div','era52-metrics');
    for(const [name,value] of [['景気',state.world.phase],['物価',era.price],['雇用',era.labor],['技術',era.techLabel]]){
      const item=el('div','');item.append(el('small','',name),el('strong','',value));values.append(item);
    }
    panel.append(values,el('p','',`生活費：予算比${era.livingImpact>=0?'+':''}${era.livingImpact}% ／ 給与：基本給比${era.wageImpact>=0?'+':''}${era.wageImpact}%`));
    panel.append(quickButton('社会・ニュースを詳しく見る',()=>handlers.onNavigate?.('SOCIETY-01')));
    const fold=el('details','play-era-fold');
    fold.append(el('summary','','社会・物価・雇用の状況を見る'),panel);
    root.append(fold);
  }
  // A compact safety overview: preparation changes future results, without adding a wall of buttons.
  const safety=surpriseSummary(state);
  const safetyPanel=el('details','play-card play-safety53');
  safetyPanel.append(el('summary','','もしもの備えと人生の転機'));
  const safetyBody=el('div','safety53-body');
  const measures=el('div','safety53-measures');
  for(const [key,label] of Object.entries(PREPARATION_LABELS)){
    const item=el('div','');item.append(el('small','',label),el('strong','',`${safety.prepared[key]} / 5`));measures.append(item);
  }
  safetyBody.append(measures,el('p','',`経験した出来事：${safety.events}件 ／ 合計支出：${fmt(safety.totalLoss)}円 ／ 謝礼：${fmt(safety.totalGains)}円`));
  if(safety.latest)safetyBody.append(el('p','',`最近の出来事：${safety.latest.title} ― ${safety.latest.choice}（備えによる軽減 ${fmt(safety.latest.prevented)}円）`));
  safetyBody.append(el('p','', '備えは自由行動から選択できます。事故や詐欺の被害額は選択・過去の判断により変わります。架空のゲームモデルです。'));
  safetyPanel.append(safetyBody);root.append(safetyPanel);
  const personalGoal=renderLifeGoalPanel(state,handlers.onAction);
  if(personalGoal)root.append(personalGoal);
  if(state.ending?.dead){root.append(renderLifeReview(state,{expanded:true}));container.replaceChildren(root);return;}
  // One entry point instead of another set of repeated category pickers.
  const budget=actionBudget(state);
  const actions=el('section','play-card play-opportunities');
  actions.append(el('h3','','必要なときだけ行動する'),
    el('p','',`残り${budget.remaining}/${budget.limit}回。毎月3回使い切る必要はありません。生活方針や習慣は自動で続きます。`));
  const open=quickButton('今月の行動を一画面で管理',()=>handlers.onOpenActionCenter?.());
  open.classList.add('action-center-dashboard-open');
  actions.append(open);
  root.append(actions);
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
  const influence=getConsequenceSummary(state);
  if(influence.memories.length){
    const panel=el('details','play-life-paths consequence51-panel');
    panel.append(el('summary','',`選択の長期的な影響：記憶${influence.memories.length}件・再会${influence.echoes.length}件`));
    panel.append(el('p','', '昔の選択が5年後・15年後に新しい出来事として戻り、進学・採用・家計・健康にも影響します。'));
    const list=el('ul','play-life-path-list');
    for(const next of influence.upcoming.slice(0,5)){
      const item=el('li','');
      item.append(el('strong','',`${next.memory.age}歳：${next.memory.choice}`),el('span','',`${next.dueAge}歳頃に再び影響（${influence.labels[next.memory.domain]}）`));list.append(item);
    }
    if(!influence.upcoming.length)list.append(el('li','','予定されている続きはありません。'));
    panel.append(list);
    if(influence.echoes.length){const last=influence.echoes.at(-1);panel.append(el('p','',`直近の影響：${last.age}歳「${last.title}」で「${last.choice}」を選択`));}
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
  side.append(focus,skill,money);lower.append(storyCard,side);
  const archive=el('details','play-archive-fold');archive.append(el('summary','','人生の記録・技能・家計の詳細を見る'),lower);root.append(archive);
  container.replaceChildren(root);
}
