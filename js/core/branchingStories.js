/** STEP 45: long-lived choice threads. Data lives in the game save, not in the UI.
 * A branch opens at a life stage; its consequence reappears years later.
 */
const isRecord=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const choice=(label,hint,result,impact,path)=>({label,hint,result,impact,path});
const threads=Object.freeze([
  {
    id:'spark',label:'子どもの頃の興味',ages:[6,12,18,27],start:'心に残る「好き」を見つける',
    introduction:'学校や家庭で、夢中になれることに出会った。どの道を選んでみる？',
    paths:[
      {id:'research',label:'探究',seed:'小さな疑問を調べ始める',scene:['自由研究を発表するチャンス','進学先から研究への誘い','社会で研究成果を生かす機会'],hook:['子どもの頃の疑問が、学校の研究発表につながった。','かつて続けた研究を、進学や仕事につなげる道が現れた。','昔から追いかけてきた疑問を、社会の課題解決に使えるかもしれない。'],impact:{study:4,skill:'パソコン',skillValue:3,energy:-2}},
      {id:'sport',label:'運動',seed:'体を動かすことを続ける',scene:['大会のメンバー選考','スポーツと将来の進路','運動で人を支える機会'],hook:['幼い頃から積み重ねた練習が、大会への挑戦につながった。','部活動での経験を、競技や将来の選択へ生かせそうだ。','自分が磨いた運動の力が、周囲の人を助けることにつながるかもしれない。'],impact:{physical:4,skill:'運動',skillValue:3,energy:-3}},
      {id:'creative',label:'創作',seed:'絵や物語を作ってみる',scene:['自分の作品を人に見せる日','作品づくりと進路の選択','創作を仕事や地域に生かす機会'],hook:['昔から作ってきた作品を、人に見てもらう機会がやってきた。','自分の表現を続けるか、別の道を考えるかの岐路に立った。','自分の作品で誰かを楽しませる可能性が見えてきた。'],impact:{mental:4,skill:'読書',skillValue:3,energy:-2}},
    ],
  },
  {
    id:'bonds',label:'大切な人との約束',ages:[13,19,29,45],start:'大切な人との分かれ道',
    introduction:'自分の時間も、周りの人との関係も大切になってきた。これから何を心掛ける？',
    paths:[
      {id:'friend',label:'友情',seed:'友だちの力になる',scene:['卒業後の友人との再会','友人から人生の相談','昔の友だちからの連絡'],hook:['かつて支えた友人と、進路が変わる時期に再会した。','10代の頃に大切にした友情が、再び力を発揮する時が来た。','長く続いた友情に、今までとは違う形で向き合う機会が生まれた。'],impact:{social:5,mental:2}},
      {id:'family',label:'家族',seed:'家族と向き合う時間を作る',scene:['家族との進路相談','家族からの頼みごと','家族と将来を話す日'],hook:['中学生の頃から大切にした家族との関係が、進路の相談に生きた。','家族の事情が変化し、あなたの時間と気持ちが試される。','年月を経て、家族との向き合い方を改めて考えることになった。'],impact:{social:4,mental:3}},
      {id:'independent',label:'自立',seed:'まずは自分の目標に集中する',scene:['一人で選ぶ進路','自立した暮らしの壁','これからの人間関係'],hook:['自分で決める力を磨いてきたが、進路選択には迷いもある。','自分の道を選んだ経験がある一方、誰かに頼ることも必要になった。','自立を大切にした人生で、今はどんな関係を築きたいだろう。'],impact:{study:2,mental:3,social:-1}},
    ],
  },
  {
    id:'career',label:'仕事と生き方',ages:[22,30,40],start:'社会に出て見つける道',
    introduction:'時間、収入、やりがいのどれも大切だ。今の自分は何を優先したい？',
    paths:[
      {id:'specialist',label:'専門性',seed:'専門知識を積み重ねる',scene:['専門職としての転機','専門性を次の世代へ'],hook:['20代から続けた学びが、専門家としての挑戦につながった。','長く培った専門知識をどう社会に還元するか問われている。'],impact:{work:4,study:3,energy:-3}},
      {id:'stability',label:'安定',seed:'無理のない安定した暮らしを選ぶ',scene:['安定した生活を見直す日','守りたい生活と新しい挑戦'],hook:['続けてきた安定した生活に、新しい役割が生まれた。','これまで守ってきた暮らしと、新しい可能性をどう両立させるか。'],impact:{mental:4,physical:2}},
      {id:'venture',label:'挑戦',seed:'新しい企画に挑んでみる',scene:['挑戦が試される時','経験を次の挑戦につなぐ'],hook:['社会に出たときに決めた挑戦が、責任の伴う局面を迎えた。','過去の成功や失敗を踏まえて、もう一度判断する時がきた。'],impact:{work:4,energy:-4,social:2}},
    ],
  },
  {
    id:'values',label:'後半生の価値観',ages:[40,53,67],start:'これからの人生で守るもの',
    introduction:'これまで積み上げたものがある。これからの時間を、何に使いたい？',
    paths:[
      {id:'community',label:'社会とのつながり',seed:'身近な人を支える活動をする',scene:['地域からの頼みごと','次の世代へ引き継ぐ役割'],hook:['周りの人を支えてきたことが、地域での新たな役割になった。','自分がつくったつながりを、次の世代へ渡す時期がきた。'],impact:{social:5,mental:2}},
      {id:'growth',label:'学び直し',seed:'新しいことを学び始める',scene:['人生後半の学びの成果','これまでの知識の使い道'],hook:['40代で始めた学び直しが、新しい可能性を開いた。','長く学び続けてきた経験が、誰かの助けになるかもしれない。'],impact:{study:4,skill:'読書',skillValue:2,energy:-2}},
      {id:'wellbeing',label:'心身のゆとり',seed:'健康と休息を大事にする',scene:['暮らしのペースを見直す','年齢とともに変わる暮らし'],hook:['無理のない暮らしを選んできたが、生活に変化が訪れた。','健康を大切にしてきた経験を、これからどう活かそうか。'],impact:{physical:4,mental:3}},
    ],
  },
  {
    // U7: the player's financial habits return at midlife and retirement.
    id:'financialFuture',label:'お金と暮らしの選択',ages:[24,35,50],
    start:'社会人としてのお金の使い方',
    introduction:'収入を得て、貯蓄・暮らし・仕事への投資を考えるようになった。最初に何を重視する？',
    paths:[
      {id:'save',label:'計画的な貯蓄',seed:'生活費を見直し、無理なく貯める',scene:['10年続けた家計の習慣','長く積み重ねた家計の選択'],
       hook:['若い頃に決めた支出の優先順位が、30代の暮らしにも影響している。','仕事と家庭の変化を経て、当時の貯蓄方針を続けるか見直す時期が来た。'],
       impact:{mental:3,study:2}},
      {id:'housing',label:'住まいの安定',seed:'長く暮らす住まいの計画を立てる',scene:['住まいと家計の折り合い','住まいを次の世代にどう残すか'],
       hook:['住まいを優先した考えが、将来の家族との暮らしにもつながっている。','住宅の維持費と将来設計を、もう一度考える場面が訪れた。'],
       impact:{social:3,mental:2}},
      {id:'challenge',label:'仕事への投資',seed:'仕事に役立つ技能を磨く',scene:['学びへの投資を振り返る','これまでの努力を次の挑戦へ'],
       hook:['20代から積み重ねた技能が、35歳で新しい働き方を考える材料になった。','過去に身につけた専門性を、次の世代へどう生かせるだろう。'],
       impact:{work:4,study:2,energy:-2}},
    ],
  },
  {
    // U7: relationships, work and belonging have consequences decades later.
    id:'adultBalance',label:'仕事と大切な人',ages:[28,42,58],
    start:'仕事と大切な人の時間',
    introduction:'働くこと、家族や友人との時間、地域でのつながり。今後の暮らしで何を大切にする？',
    paths:[
      {id:'relations',label:'人との時間',seed:'家族や友人との約束を優先する',scene:['大切な人との距離を考える','長く続いた人間関係の節目'],
       hook:['28歳で大切にした関係が、働き方の変化を経ても心の支えになっている。','積み重ねた交流が、後半生の時間の使い方を見つめ直すきっかけになった。'],
       impact:{social:5,mental:3}},
      {id:'career',label:'仕事への集中',seed:'今の仕事で成果を残す',scene:['仕事の成果と周囲との関係','次の世代へ仕事を引き継ぐ'],
       hook:['仕事を優先してきた経験が強みになった一方、身近な人との時間も改めて考えたい。','長く培った仕事の経験を、社会や家族にどう還元するか考える時が来た。'],
       impact:{work:5,energy:-3,mental:1}},
      {id:'community',label:'地域とのつながり',seed:'地域や友人と助け合う',scene:['地域で生まれた新しい役割','今までのつながりを後世へ'],
       hook:['若い頃の地域活動が、42歳で新たな仲間とのつながりを生んだ。','地域で育てた縁を、これからの世代へ伝える機会が来た。'],
       impact:{social:4,mental:2,physical:1}},
    ],
]);
const byId=Object.fromEntries(threads.map(t=>[t.id,t]));
const pathFor=(thread,id)=>thread.paths.find(p=>p.id===id)??thread.paths[0];
const safeString=(x,max)=>typeof x==='string'&&x.length>0&&x.length<=max;
export function createStoryProgress(){return {threads:{},scheduled:[],memories:[]};}
export function validateStoryProgress(value){
  if(!isRecord(value)||!isRecord(value.threads)||!Array.isArray(value.scheduled)||!Array.isArray(value.memories))return false;
  if(Object.keys(value.threads).length>threads.length||value.scheduled.length>threads.length||value.memories.length>64)return false;
  for(const [id,record] of Object.entries(value.threads)){
    const config=byId[id];
    if(!config||!isRecord(record)||!config.paths.some(p=>p.id===record.path)||!Number.isInteger(record.stage)||record.stage<1||record.stage>config.ages.length||!safeString(record.lastChoice,120))return false;
  }
  const pending=new Set();
  for(const job of value.scheduled){
    const config=byId[job?.thread];
    if(!config||!Number.isInteger(job.stage)||job.stage<2||job.stage>config.ages.length||job.dueAge!==config.ages[job.stage-1]||pending.has(job.thread)||value.threads[job.thread]?.stage!==job.stage-1)return false;
    pending.add(job.thread);
  }
  for(const memory of value.memories){
    if(!byId[memory?.thread]||!Number.isInteger(memory.age)||memory.age<0||memory.age>200||!Number.isInteger(memory.year)||memory.year<2000||memory.year>2200||!safeString(memory.choice,120)||!safeString(memory.path,60))return false;
  }
  return true;
}
/** Previous saves may not have the optional STEP 45 field. They retain progress. */
export function ensureStoryProgress(state){
  if(state.storyProgress===undefined)state.storyProgress=createStoryProgress();
  return state.storyProgress;
}
const toPublicEvent=(thread,stage,age,title,description,options,turn,date)=>({
  id:`T${turn}-choice`,type:'choice',story:true,blocking:true,branch:{thread:thread.id,stage},
  year:date.year,month:date.month,turn,category:`人生の分岐・${thread.label}`,
  title,description,options:options.map((o,i)=>({...o,id:String(i+1),impact:{...o.impact}})),
});
const nextPath=(thread,current)=>thread.paths[(thread.paths.indexOf(current)+1)%thread.paths.length];
function branchEvent(thread,stage,age,progress,turn,date){
  if(stage===1){
    const options=thread.paths.map(p=>choice(p.seed,`${p.label}の道へ`,`${p.label}を大切にする日々が始まった。`,p.impact,p.id));
    return toPublicEvent(thread,1,age,thread.start,thread.introduction,options,turn,date);
  }
  const record=progress.threads[thread.id];
  const path=pathFor(thread,record?.path);
  const alternative=nextPath(thread,path);
  const n=stage-2;
  const title=path.scene[n]??`${path.label}の歩みを振り返る`;
  const hook=path.hook[n]??`${path.label}の選択が、今のあなたにつながっている。`;
  const description=`${hook} 前回は「${record.lastChoice}」を選んだ。今度はどうする？`;
  const final=stage===thread.ages.length;
  const options=[
    choice(`${path.label}の道を深める`,final?'歩んできた道を形にする':'能力は上がるが、時間や体力が必要',`${path.label}を続けて、積み重ねてきた経験が形になった。`,path.impact,path.id),
    choice('周りの人と力を合わせる','人とのつながりを大切にする','過去の経験を話すと、協力してくれる人が見つかった。',{social:5,mental:3},path.id),
    choice(`${alternative.label}に目を向ける`,'方向転換には新しい学びが必要',`今までの道も無駄ではない。${alternative.label}という新しい可能性を探し始めた。`,{...alternative.impact,energy:-3},alternative.id),
  ];
  return toPublicEvent(thread,stage,age,title,description,options,turn,date);
}
/** Returns a due continuation first, then a once-only opening, otherwise null. */
export function createBranchingEvent(progress,date,turn,age){
  if(!progress)return null;
  const due=[...progress.scheduled].filter(p=>p.dueAge<=age).sort((a,b)=>a.dueAge-b.dueAge||a.thread.localeCompare(b.thread))[0];
  if(due)return branchEvent(byId[due.thread],due.stage,age,progress,turn,date);
  const starter=threads.find(t=>age>=t.ages[0]&&age<=t.ages[0]+2&&!progress.threads[t.id]);
  return starter?branchEvent(starter,1,age,progress,turn,date):null;
}
/** Called only after a valid story option has been applied to the state. */
export function recordBranchChoice(progress,event,option,age){
  if(!event.branch)return;
  const config=byId[event.branch.thread];
  if(!config)return;
  const stage=event.branch.stage;
  const path=pathFor(config,option.path);
  progress.threads[config.id]={path:path.id,stage,lastChoice:option.label};
  progress.scheduled=progress.scheduled.filter(j=>j.thread!==config.id);
  if(stage<config.ages.length)progress.scheduled.push({thread:config.id,stage:stage+1,dueAge:config.ages[stage]});
  progress.memories.push({thread:config.id,age,year:event.year,choice:option.label,path:path.label});
  if(progress.memories.length>64)progress.memories.shift();
}
export function getLifeThreads(progress){
  if(!progress)return [];
  return threads.filter(t=>progress.threads[t.id]).map(t=>{
    const record=progress.threads[t.id];
    const waiting=progress.scheduled.find(s=>s.thread===t.id);
    return {id:t.id,label:t.label,path:pathFor(t,record.path).label,stage:record.stage,
      nextAge:waiting?.dueAge??null,completed:record.stage===t.ages.length,lastChoice:record.lastChoice};
  });
}
