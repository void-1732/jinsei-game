import {balancedGrowth} from './balanceSystems.js';
import {createBranchingEvent,recordBranchChoice} from './branchingStories.js';
import {selectCatalogEvent} from './eventCatalog.js';
import {createConsequenceEvent,rememberConsequence,resolveConsequence} from './consequenceSystems.js';
import {selectOpportunityEvent,reflectOpportunityStoryChoice} from './opportunitySystems.js';
import {createEraChoiceEvent,recordEraChoice} from './eraSystems.js';
/**
 * PHASE 42: player-led life scenes. All options are serializable so saves remain portable.
 * This is an original, fictional choice system; it does not replicate any branded board game.
 */
const clamp = value => Math.min(100, Math.max(0, Math.round(value)));
export function develop(value, delta) {
  if (!Number.isFinite(delta) || delta<=0) return clamp(value+delta);
  const step=value>=90?1:value>=80?Math.max(1,Math.ceil(delta*.4)):value>=65?Math.max(1,Math.ceil(delta*.65)):Math.round(delta);
  return Math.max(clamp(value),Math.min(95,value+step));
}
const choice = (label, hint, result, impact) => ({label,hint,result,impact});
const scene = (title, description, options) => ({title,description,options: options.map((item,i)=>({...item,id:String(i+1)}))});
const pools = [
  {max:2, tag:'はじめての世界', list:[
    scene('おうちの小さな冒険','身の回りのものが、何でも不思議に見える。今日はどう過ごす？',[
      choice('絵本を読んでもらう','学力＋3 / 親密度＋2','ページをめくるたびに新しい言葉を覚えた。',{study:3,social:2}),
      choice('公園で元気に遊ぶ','体力＋4 / 運動＋2','転んでも立ち上がる強さが育った。',{physical:4,skill:'運動',skillValue:2}),
      choice('ゆっくりお昼寝','元気＋7 / 心＋2','たっぷり眠って、明日が楽しみになった。',{energy:7,mental:2}),
    ]),
    scene('小さな発見','手を伸ばせば新しい発見がある。何に夢中になる？',[
      choice('積み木で形をつくる','学力＋4','考える楽しさの芽が出た。',{study:4}),
      choice('家族の歌に合わせて踊る','心＋4 / 親密度＋2','笑い声で部屋がいっぱいになった。',{mental:4,social:2}),
      choice('外の音を探しに行く','体力＋3 / 元気－2','少し疲れたけれど、世界が広がった。',{physical:3,energy:-2}),
    ])
  ]},
  {max:5, tag:'幼少期', list:[
    scene('友だちとのおもちゃ','友だちが、あなたの好きなおもちゃを使いたそうにしている。',[
      choice('一緒に遊ぼうと誘う','親密度＋5 / 心＋2','新しい友だちができたような気がした。',{social:5,mental:2}),
      choice('自分の順番を守る','心＋2 / 親密度－2','少し気まずいけれど、自分の気持ちも大切にした。',{mental:2,social:-2}),
      choice('別のおもちゃを探す','学力＋2 / 元気＋2','いつもと違う遊びを発明した。',{study:2,energy:2}),
    ]),
    scene('休日の過ごし方','一日自由に使える。何をする？',[
      choice('絵を描いてみる','学力＋3 / 心＋3','自分だけの作品が生まれた。',{study:3,mental:3}),
      choice('外で走り回る','体力＋5 / 元気－3','泥だらけになって帰ってきた。',{physical:5,energy:-3}),
      choice('家族と料理を手伝う','親密度＋5 / 心＋2','食卓でみんなが笑っていた。',{social:5,mental:2}),
    ])
  ]},
  {max:11, tag:'小学生', list:[
    scene('放課後の分かれ道','宿題は残っている。でも、友だちから遊びに誘われた。',[
      choice('宿題を先に終わらせる','学力＋5 / 元気－2','難しい問題を自分で解けた。',{study:5,energy:-2}),
      choice('友だちと遊ぶ','親密度＋5 / 心＋3','一緒に笑った時間が宝物になった。',{social:5,mental:3}),
      choice('運動の練習をする','運動＋5 / 体力＋2','昨日できなかったことができた。',{skill:'運動',skillValue:5,physical:2}),
    ]),
    scene('新しいクラブ活動','学校でいろんな活動を募集している。何に参加する？',[
      choice('科学・パソコンクラブ','パソコン＋6 / 学力＋2','小さな実験に夢中になった。',{skill:'パソコン',skillValue:6,study:2}),
      choice('運動クラブ','運動＋6 / 元気－3','練習は大変だけど仲間ができた。',{skill:'運動',skillValue:6,energy:-3,social:2}),
      choice('図書委員','読書＋6 / 心＋2','知らない物語の扉を開いた。',{skill:'読書',skillValue:6,mental:2}),
    ]),
    scene('小さな失敗','みんなの前で失敗してしまった。どうする？',[
      choice('もう一度やってみる','学力＋3 / 心＋3','うまくいかない経験も力になった。',{study:3,mental:3}),
      choice('友だちに助けを求める','親密度＋5 / 心＋2','助けてと言えることも勇気だ。',{social:5,mental:2}),
      choice('少し休んで考える','元気＋5 / 学力＋1','落ち着いたら次の方法が見えた。',{energy:5,study:1}),
    ])
  ]},
  {max:14, tag:'中学生', list:[
    scene('テスト前の週末','大事なテストが近い。今日は何を優先する？',[
      choice('集中して勉強','学力＋6 / 元気－5','努力の積み重ねが自信になった。',{study:6,energy:-5}),
      choice('友人と勉強会','学力＋3 / 親密度＋4','教え合うと理解が深まった。',{study:3,social:4}),
      choice('体調を整える','体力＋4 / 元気＋5','万全の体調で勝負できそうだ。',{physical:4,energy:5}),
    ]),
    scene('部活の大事な試合','練習を続けてきた仲間との大一番。',[
      choice('全力で挑む','運動＋5 / 元気－5','悔しさも喜びも次の力になる。',{skill:'運動',skillValue:5,energy:-5,social:2}),
      choice('仲間を支える','親密度＋6 / 心＋3','チームからの信頼を得た。',{social:6,mental:3}),
      choice('勉強を優先する','学力＋5 / 親密度－2','目標に向けて一歩進んだ。',{study:5,social:-2}),
    ])
  ]},
  {max:18, tag:'高校生', list:[
    scene('進路を考える夜','将来の選択肢が増えた分、迷いも増えた。',[
      choice('受験勉強を進める','学力＋6 / 元気－4','希望の進路が少し近くなった。',{study:6,energy:-4}),
      choice('興味のある技能を磨く','パソコン＋6 / 心＋2','好きなことが得意なことになり始めた。',{skill:'パソコン',skillValue:6,mental:2}),
      choice('身近な人に相談する','親密度＋5 / 心＋4','一人で答えを出さなくてもいいと知った。',{social:5,mental:4}),
    ]),
    scene('放課後の誘惑','やるべきことと、やりたいこと。どちらを選ぶ？',[
      choice('資格の勉強に挑戦','学力＋4 / 読書＋3','積み重ねが形になっていく。',{study:4,skill:'読書',skillValue:3}),
      choice('友人と街へ出かける','親密度＋5 / 心＋4 / お金－1000円','思い出がまたひとつ増えた。',{social:5,mental:4,cash:-1000}),
      choice('アルバイトの準備','パソコン＋3 / 元気－2','社会で働くことを想像した。',{skill:'パソコン',skillValue:3,energy:-2}),
    ])
  ]},
  {max:24, tag:'自立への一歩', list:[
    scene('はじめての大きな決断','自分の時間とお金をどう使うか、選択が未来に響く。',[
      choice('将来のために学ぶ','学力＋4 / パソコン＋3 / 元気－4','続けてきた学びが自信につながった。',{study:4,skill:'パソコン',skillValue:3,energy:-4}),
      choice('人との出会いを大切に','親密度＋5 / 心＋4 / お金－3000円','新しい縁が生まれた。',{social:5,mental:4,cash:-3000}),
      choice('節約して貯金する','お金＋5000円 / 心－2','少しずつ生活の土台が整った。',{cash:5000,mental:-2}),
    ]),
    scene('進みたい道を探す','今の自分でできることは何だろう。',[
      choice('専門スキルを伸ばす','パソコン＋7 / 元気－4','得意分野が見えてきた。',{skill:'パソコン',skillValue:7,energy:-4}),
      choice('新しい仲間をつくる','親密度＋6 / 心＋2','頼れる相手ができた。',{social:6,mental:2}),
      choice('心身の健康を整える','体力＋6 / 元気＋5','長い人生を歩く準備ができた。',{physical:6,energy:5}),
    ])
  ]},
  {max:39, tag:'仕事と暮らし', list:[
    scene('チャンスと余裕','大きな仕事の話が来た。でも生活との両立は簡単ではない。',[
      choice('挑戦を引き受ける','仕事力＋5 / お金＋12000円 / 元気－6','苦労もあったが、新しい経験が積めた。',{work:5,cash:12000,energy:-6}),
      choice('生活の余裕を優先する','心＋5 / 体力＋3','大切なものを見失わずに済んだ。',{mental:5,physical:3}),
      choice('仲間と協力して挑む','仕事力＋3 / 親密度＋4','力を合わせて乗り切った。',{work:3,social:4}),
    ]),
    scene('まとまったお金の使い道','臨時収入の一部を使うなら？',[
      choice('学びに投資する','パソコン＋6 / お金－8000円','新しい技術に触れることができた。',{skill:'パソコン',skillValue:6,cash:-8000}),
      choice('家族や友人と過ごす','親密度＋6 / 心＋4 / お金－5000円','思い出はお金では買えない。',{social:6,mental:4,cash:-5000}),
      choice('貯蓄に回す','お金＋8000円 / 心－1','万一への備えが増えた。',{cash:8000,mental:-1}),
    ]),
    scene('疲れがたまった週末','今週は忙しかった。心身の声にどう応える？',[
      choice('思いきって休む','元気＋9 / 心＋4','回復したらまた前を向けた。',{energy:9,mental:4}),
      choice('運動でリフレッシュ','体力＋5 / 運動＋4 / 元気－2','汗をかいて気持ちが切り替わった。',{physical:5,skill:'運動',skillValue:4,energy:-2}),
      choice('予定を詰め込む','お金＋6000円 / 体力－4','成果は出たが、無理のしすぎには注意。',{cash:6000,physical:-4}),
    ])
  ]},
  {max:64, tag:'人生の転機', list:[
    scene('これからの働き方','経験は増えた。今後は何を大事にしたい？',[
      choice('新しい仕事に挑む','仕事力＋6 / 元気－5','年齢ではなく挑戦が自分を変えた。',{work:6,energy:-5}),
      choice('後輩を育てる','親密度＋5 / 心＋3','誰かの成長に喜びを見つけた。',{social:5,mental:3}),
      choice('健康を最優先にする','体力＋6 / 元気＋4','無理を減らしたことで余裕ができた。',{physical:6,energy:4}),
    ]),
    scene('家族との時間','今だからこそ、伝えたいことがある。',[
      choice('一緒に出かける','親密度＋7 / お金－6000円','忘れられない時間になった。',{social:7,cash:-6000}),
      choice('自分の夢に時間を使う','読書＋5 / 心＋5','長く温めた想いを少し形にした。',{skill:'読書',skillValue:5,mental:5}),
      choice('堅実に将来へ備える','お金＋8000円 / 心－1','これからの暮らしを考える機会になった。',{cash:8000,mental:-1}),
    ])
  ]},
  {max:200, tag:'第二の人生', list:[
    scene('新しい日々の楽しみ','今までと違う時間の使い方ができるようになった。',[
      choice('地域の活動に参加する','親密度＋6 / 心＋4','暮らしの中に新しい居場所ができた。',{social:6,mental:4}),
      choice('趣味に没頭する','読書＋5 / 心＋5','時間を忘れるほど夢中になった。',{skill:'読書',skillValue:5,mental:5}),
      choice('散歩を習慣にする','体力＋5 / 運動＋3','いつもの道が新鮮に見えた。',{physical:5,skill:'運動',skillValue:3}),
    ]),
    scene('大切な人への贈り物','誰かに今の気持ちを伝えるなら？',[
      choice('会いに行く','親密度＋7 / 元気－2','一緒に話すだけで心が温まった。',{social:7,energy:-2}),
      choice('手紙を書く','読書＋3 / 心＋5','言葉にして初めて分かる気持ちがあった。',{skill:'読書',skillValue:3,mental:5}),
      choice('自分の健康を守る','体力＋6 / 元気＋4','元気な姿を見せることも贈り物だ。',{physical:6,energy:4}),
    ])
  ]}
];

/** STEP 46: context-sensitive encounter first, but a scheduled STEP 45 continuation wins. */
function impactHint(impact){
  const labels={study:'学力',physical:'体力',mental:'心',energy:'元気',social:'人間関係',cash:'お金',work:'仕事評価',interviewPrep:'面接準備',careerPortfolio:'職業実績',budgetHabit:'家計習慣'};
  const text=[];
  for(const [key,label] of Object.entries(labels)){
    const value=impact[key];if(typeof value!=='number'||!value)continue;
    const suffix=key==='cash'?'円':'';
    text.push(`${label}${value>0?'+':''}${value.toLocaleString('ja-JP')}${suffix}`);
  }
  if(impact.skill&&Number.isFinite(impact.skillValue))text.push(`${impact.skill}+${impact.skillValue}`);
  return text.join(' / ')||'経験を積む';
}
export function createStoryEvent(date, turn, age, randomValue, storyProgress=null, gameState=null) {
  const branch=createBranchingEvent(storyProgress,date,turn,age);
  if(branch)return branch;
  const echo=createConsequenceEvent(gameState,date,turn,age);
  if(echo)return echo;
  const milestone=selectOpportunityEvent(gameState,age,turn,randomValue);
  if(milestone)return {id:`T${turn}-choice`,type:'choice',story:true,blocking:true,year:date.year,month:date.month,turn,...milestone,options:milestone.options.map(o=>({...o,hint:impactHint(o.impact)}))};
  const era=createEraChoiceEvent(gameState,date,turn,age);
  if(era)return era;
  const selected=selectCatalogEvent(gameState,age,randomValue);
  if(selected){
    return {
      id:`T${turn}-choice`,type:'choice',story:true,blocking:true,
      year:date.year,month:date.month,turn,category:selected.tag,catalogKey:selected.id,
      title:selected.title,description:selected.description,
      options:selected.options.map((option,i)=>({
        id:String(i+1),label:option.label,hint:impactHint(option.impact),result:option.result,
        impact:{...option.impact},
      })),
    };
  }
  // Legacy fallback for unusual direct callers (including ages outside a normal lifespan).
  const group=pools.find(item=>age<=item.max)??pools.at(-1);
  const item=group.list[(turn+Math.floor(randomValue*group.list.length))%group.list.length];
  return {id:`T${turn}-choice`,type:'choice',story:true,blocking:true,
    year:date.year,month:date.month,turn,category:group.tag,
    title:item.title,description:item.description,
    options:item.options.map(option=>({...option,impact:{...option.impact}}))};
}

export function resolveStoryChoice(state, id, choiceId) {
  const event = state.pendingEvents.find(e => e.id === id && e.type === 'choice' && e.story === true);
  if (!event) return {ok:false,reason:'選択待ちの出来事がありません。'};
  const option = event.options.find(o=>o.id===choiceId);
  if (!option) return {ok:false,reason:'選択肢が不正です。'};
  const impacts=option.impact ?? {};
  if(Number.isFinite(impacts.cash)&&impacts.cash<0&&state.finances.cash< -impacts.cash)
    return {ok:false,reason:'この選択には所持金が足りません。別の選択肢を選んでください。'};
  const changes=[];
  const effects=[['physical','体力',state.health],['mental','心',state.health],['energy','元気',state.health]];
  for(const [key,name,object] of effects){
    if(!Number.isFinite(impacts[key]))continue;
    const was=object[key];object[key]=clamp(was+impacts[key]);
    const delta=object[key]-was;
    if(delta)changes.push(`${name}${delta>0?'+':''}${delta}`);
  }
  if(Number.isFinite(impacts.study)){
    const before=Object.values(state.education.scores).reduce((a,b)=>a+b,0);
    for(const key of Object.keys(state.education.scores))state.education.scores[key]=balancedGrowth(state,`score:${key}`,state.education.scores[key],impacts.study);
    const delta=Math.round((Object.values(state.education.scores).reduce((a,b)=>a+b,0)-before)/Object.keys(state.education.scores).length);
    if(delta)changes.push(`学力${delta>0?'+':''}${delta}`);
  }
  if(impacts.skill && Number.isFinite(impacts.skillValue)){
    const name=impacts.skill;
    const was=state.education.skills[name]??0;
    state.education.skills[name]=balancedGrowth(state,`skill:${name}`,was,impacts.skillValue);
    const delta=state.education.skills[name]-was;
    if(delta)changes.push(`${name}${delta>0?'+':''}${delta}`);
  }
  if(Number.isFinite(impacts.social)){
    const candidates=state.people.filter(p=>p.role!=='本人');
    const target=impacts.socialTarget;
    let targets=target==='family'?candidates.filter(p=>['父','母','配偶者','子'].includes(p.role))
      :target==='partner'?candidates.filter(p=>['交際相手','配偶者'].includes(p.role))
      :target==='child'?candidates.filter(p=>p.role==='子')
      :[candidates.find(p=>p.role==='友人')??candidates[0]].filter(Boolean);
    const before=targets.reduce((sum,p)=>sum+p.relationship,0);
    for(const person of targets)person.relationship=balancedGrowth(state,`relation:${person.id}`,person.relationship,impacts.social);
    const delta=targets.length?Math.round((targets.reduce((sum,p)=>sum+p.relationship,0)-before)/targets.length):0;
    if(delta)changes.push(`人間関係${delta>0?'+':''}${delta}`);
  }
  if(Number.isFinite(impacts.cash)){
    const previous=state.finances.cash;
    state.finances.cash=Math.max(0,Math.round(previous+impacts.cash));
    const delta=state.finances.cash-previous;
    if(delta)changes.push(`所持金${delta>0?'+':''}${delta.toLocaleString('ja-JP')}円`);
  }
  if(Number.isFinite(impacts.work)){
    const career=state.finances.career;
    if(Number.isFinite(career.performance)){
      const was=career.performance; career.performance=balancedGrowth(state,'career:performance',was,impacts.work);
      const delta=career.performance-was;if(delta)changes.push(`仕事評価${delta>0?'+':''}${delta}`);
    } else {
      const was=state.education.skills.パソコン??0;
      state.education.skills.パソコン=balancedGrowth(state,'skill:パソコン',was,impacts.work);
      const delta=state.education.skills.パソコン-was;if(delta)changes.push(`仕事スキル${delta>0?'+':''}${delta}`);
    }
  }
  reflectOpportunityStoryChoice(state,event,option);
  recordEraChoice(state,event,option);
  if(event.branch)recordBranchChoice(state.storyProgress,event,option,state.timeline.ageYears);
  const longEffects=event.consequence?resolveConsequence(state,event,option):null;
  if(!event.consequence)rememberConsequence(state,event,option,{source:event.branch?'branch':'choice'});
  if(longEffects?.length)changes.push(...longEffects);
  state.pendingEvents=state.pendingEvents.filter(e=>e.id!==id);
  const detail=changes.length?changes.join(' / '):'新しい経験を得た';
  state.eventHistory.push({id:`${id}-result`,type:'choice-result',title:`${event.title}：${option.label}`,description:`${option.result}（${detail}）`,year:state.timeline.year,month:state.timeline.month,turn:state.timeline.turnsElapsed,blocking:false});
  if(state.eventHistory.length>1200)state.eventHistory.splice(0,state.eventHistory.length-1200);
  return {ok:true, message: option.result, changes, choice:option.label};
}
