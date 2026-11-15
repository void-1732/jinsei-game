/** STEP 49. Player-defined dreams, persistent achievements and narrative life review.
 * Evaluation uses observable simulation state only; scores aren't a measure of a person's worth.
 */
import {estateBreakdown} from './estateSystems.js';
const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,Math.round(v||0)));
const avg=a=>a.length?a.reduce((s,n)=>s+n,0)/a.length:0;
const goal=(id,title,description,steps)=>({id,title,description,steps});
const milestone=(id,label,test)=>({id,label,test});
const netWorth=s=>estateBreakdown(s.finances).netAssets;
const relationships=s=>s.people?.filter(p=>p.role!=='本人')??[];
const spouse=s=>s.people?.some(p=>p.role==='配偶者')??false;
const children=s=>s.people?.filter(p=>p.role==='子')?.length??0;
const academic=s=>avg(Object.values(s.education?.scores??{}).filter(Number.isFinite));
const maxSkill=s=>Math.max(0,...Object.values(s.education?.skills??{}).filter(Number.isFinite));
const career=s=>s.finances?.career??{};
const health=s=>s.health??{};
export const DREAMS=Object.freeze([
  goal('knowledge','学びを究める','好きな分野を学び続け、知識を人生の力にする。',[
    milestone('study70','学力平均70に到達する',s=>academic(s)>=70),
    milestone('skill65','得意技能を65まで伸ばす',s=>maxSkill(s)>=65),
    milestone('study100','累計100時間学習する',s=>(s.education?.studyHours??0)>=100),
  ]),
  goal('career','仕事で道を切り開く','働く経験を重ね、自分の仕事に誇りを持つ。',[
    milestone('employment','社会に出て働く',s=>Boolean(career(s).job)||(career(s).jobChanges??0)>0),
    milestone('experienced','24か月の実務経験を積む',s=>(career(s).experience??0)>=24),
    milestone('promotion','昇進する',s=>(career(s).promotions??0)>=1),
  ]),
  goal('family','大切な人と生きる','出会いを育て、長く続く信頼関係を築く。',[
    milestone('meet','家族以外の友人・知人と出会う',s=>relationships(s).some(p=>['友人','交際相手','配偶者'].includes(p.role))),
    milestone('trust','大切な人との信頼を80まで育てる',s=>relationships(s).some(p=>p.relationship>=80)),
    milestone('lifelong','30歳以降も絆を築き続ける',s=>s.timeline.ageYears>=30 && relationships(s).some(p=>p.relationship>=65)),
  ]),
  goal('wealth','安定した暮らしを築く','経済的な不安を減らし、将来に備える。',[
    milestone('saving','純資産30万円を築く',s=>netWorth(s)>=300000),
    milestone('million','純資産100万円を築く',s=>netWorth(s)>=1000000),
    milestone('safety','30歳以降に負債を抑えて暮らす',s=>s.timeline.ageYears>=30&&netWorth(s)>=2000000&&(s.finances?.debt??0)<=100000),
  ]),
  goal('wellness','健やかに自分らしく','健康や心のゆとり、趣味を大切にする。',[
    milestone('hobby','趣味・技能を40まで育てる',s=>maxSkill(s)>=40),
    milestone('health35','35歳以降も体力70を保つ',s=>s.timeline.ageYears>=35&&(health(s).physical??0)>=70),
    milestone('peace50','50歳以降も心の状態70を保つ',s=>s.timeline.ageYears>=50&&(health(s).mental??0)>=70),
  ]),
]);
export const DREAM_IDS=Object.freeze(DREAMS.map(x=>x.id));
export const DREAM_CATALOG=Object.freeze(Object.fromEntries(DREAMS.map(d=>[d.id,{id:d.id,title:d.title,description:d.description,steps:d.steps.map(x=>({id:x.id,label:x.label}))}])));
const ACHIEVEMENTS=Object.freeze([
 ['first-choice','最初の決断',s=>s.eventHistory?.some(e=>e.type==='choice-result')],
 ['first-school','学校生活の始まり',s=>s.timeline.ageYears>=6],
 ['first-teen','15歳の節目',s=>s.timeline.ageYears>=15],
 ['adult','大人への一歩',s=>s.timeline.ageYears>=18],
 ['graduate','進学・学業の歩み',s=>['高校','大学','卒業'].includes(s.education?.stage)],
 ['learned','知識を深めた',s=>academic(s)>=75],
 ['specialist','磨かれた技能',s=>maxSkill(s)>=70],
 ['life-path','物語の分かれ道',s=>(s.storyProgress?.memories?.length??0)>=2],
 ['first-job','仕事との出会い',s=>Boolean(career(s).job)||(career(s).jobChanges??0)>0],
 ['promotion','努力が評価された',s=>(career(s).promotions??0)>=1],
 ['entrepreneur','自分の事業',s=>Boolean(s.finances?.business?.active)],
 ['saving','100万円の積み重ね',s=>netWorth(s)>=1000000],
 ['trust','かけがえのない信頼',s=>relationships(s).some(p=>p.relationship>=85)],
 ['marriage','人生の伴侶',s=>spouse(s)],
 ['parent','家族の新しい命',s=>children(s)>0],
 ['middle','折り返しを越えて',s=>s.timeline.ageYears>=50],
 ['long-life','長寿の記録',s=>s.timeline.ageYears>=80],
]);
const awardLookup=Object.fromEntries(ACHIEVEMENTS.map(([id,title])=>[id,title]));
const deathTypes={
 knowledge:['知の探究者','学び続けた経験が、あなたらしい人生を形づくりました。'],
 career:['仕事に刻んだ足跡','仕事を通じて挑戦し、経験を積み重ねた人生でした。'],
 family:['絆に恵まれた人生','人と向き合い、ともに過ごす時間を大切にしました。'],
 wealth:['暮らしを築いた人生','経済の浮き沈みを経験しながら、生活の土台を築きました。'],
 wellness:['自分らしさを大切にした人生','心身の声を聞き、人生の楽しみを大切にしました。'],
 ordinary:['選択を重ねた人生','大きな成功だけでなく、日々の選択も人生の一部でした。'],
};
export function createLifeGoalProgress(){return {dream:null,lastChangeMonths:null,completed:{},achievements:[],highlights:[],ending:null};}
export function ensureLifeGoalProgress(state){state.lifeGoal49??=createLifeGoalProgress();return state.lifeGoal49;}
const validPoint=p=>record(p)&&Number.isInteger(p.year)&&p.year>=2000&&p.year<=2200&&Number.isInteger(p.month)&&p.month>=1&&p.month<=12&&Number.isInteger(p.age)&&p.age>=0&&p.age<=200;
const validText=(s,max)=>typeof s==='string'&&s.length<=max;
export function validateLifeGoalProgress(x){
 if(!record(x)||!(x.dream===null||DREAM_IDS.includes(x.dream))||!(x.lastChangeMonths===null||Number.isInteger(x.lastChangeMonths)&&x.lastChangeMonths>=0&&x.lastChangeMonths<=25000))return false;
 if(!record(x.completed)||Object.keys(x.completed).length>DREAMS.length||!Array.isArray(x.achievements)||x.achievements.length>ACHIEVEMENTS.length||!Array.isArray(x.highlights)||x.highlights.length>64)return false;
 for(const [key,list] of Object.entries(x.completed)){
  const dream=DREAMS.find(d=>d.id===key);
  if(!dream||!Array.isArray(list)||list.length>3||new Set(list).size!==list.length||list.some(id=>!dream.steps.some(s=>s.id===id)))return false;
 }
 const ids=new Set();for(const a of x.achievements){if(!validPoint(a)||!awardLookup[a.id]||ids.has(a.id))return false;ids.add(a.id);}
 for(const h of x.highlights){if(!validPoint(h)||!validText(h.title,100)||!validText(h.description,280)||!['dream','life','branch','achievement','choice','work','ending'].includes(h.kind))return false;}
 if(x.ending!==null){const e=x.ending;if(!record(e)||!Object.keys(deathTypes).includes(e.type)||!validText(e.title,100)||!validText(e.description,300)||!Number.isInteger(e.score)||e.score<0||e.score>100||!Array.isArray(e.breakdown)||e.breakdown.length!==5||!e.breakdown.every(b=>record(b)&&validText(b.label,30)&&Number.isInteger(b.score)&&b.score>=0&&b.score<=20)||!Array.isArray(e.moments)||e.moments.length>20||!e.moments.every(h=>validPoint(h)&&validText(h.title,100)&&validText(h.description,280)&&typeof h.kind==='string')||!Number.isInteger(e.goalsEarned)||e.goalsEarned<0||e.goalsEarned>3||!Number.isInteger(e.awards)||e.awards<0||e.awards>ACHIEVEMENTS.length)return false;}
 return true;
}
function moment(state,kind,title,description){
 const g=ensureLifeGoalProgress(state),t=state.timeline;
 const item={year:t.year,month:t.month,age:t.ageYears,kind,title:String(title).slice(0,100),description:String(description).slice(0,280)};
 if(g.highlights.some(h=>h.year===item.year&&h.month===item.month&&h.kind===kind&&h.title===item.title))return;
 g.highlights.push(item);
 if(g.highlights.length>64)g.highlights.splice(8,1); // Keep birth and early milestones for the epilogue.
}
function addHistory(state,kind,title,description){
 const t=state.timeline;
 state.eventHistory.push({id:`G49-${t.turnsElapsed}-${state.eventHistory.length}`,type:kind,title,description,year:t.year,month:t.month,turn:t.turnsElapsed,blocking:false});
 if(state.eventHistory.length>1200)state.eventHistory.splice(0,state.eventHistory.length-1200);
}
export function chooseLifeDream(state,id){
 if(!DREAM_IDS.includes(id))return {ok:false,reason:'夢の種類が不正です。'};
 if(state.timeline.ageYears<6)return {ok:false,reason:'人生の夢は6歳から選べます。'};
 const g=ensureLifeGoalProgress(state);
 if(g.dream===id)return {ok:false,reason:'現在選択中の夢です。'};
 if(g.lastChangeMonths!==null&&state.timeline.monthsElapsed-g.lastChangeMonths<36)return {ok:false,reason:'夢の変更は前回の選択から3年後に可能です。'};
 g.dream=id;g.lastChangeMonths=state.timeline.monthsElapsed;
 const info=DREAM_CATALOG[id];
 moment(state,'dream','人生の夢を決めた',info.title);
 addHistory(state,'life-goal','人生の夢を決めた',info.title);
 return {ok:true,message:`人生の夢を「${info.title}」に設定しました。`};
}
export function evaluateDream(state){
 const g=state.lifeGoal49??createLifeGoalProgress(),dream=DREAMS.find(d=>d.id===g.dream);
 if(!dream)return null;
 const earned=new Set(g.completed[dream.id]??[]);
 const steps=dream.steps.map(s=>({id:s.id,label:s.label,done:earned.has(s.id)||Boolean(s.test(state))}));
 return {id:dream.id,title:dream.title,description:dream.description,steps,done:steps.filter(s=>s.done).length,total:steps.length,completed:steps.every(s=>s.done)};
}
export function getAchievements(state){const acquired=new Set(state.lifeGoal49?.achievements?.map(a=>a.id)??[]);return ACHIEVEMENTS.map(([id,title])=>({id,title,earned:acquired.has(id),date:state.lifeGoal49?.achievements?.find(a=>a.id===id)??null}));}
export function observeLifeGoals(state,{events=[],action=null,quiet=false}={}){
 if(!state.initialized)return;
 const g=ensureLifeGoalProgress(state),t=state.timeline;
 for(const ev of events){
  if(ev.type==='birthday'&&[6,12,15,18,20,30,40,50,60,65,70,80,90,100].includes(t.ageYears))moment(state,'life',`${t.ageYears}歳の節目`,ev.description);
  if(['job-loss','education','death'].includes(ev.type))moment(state,ev.type==='job-loss'?'work':'life',ev.title,ev.description);
 }
 if(action?.type==='choice'&&action.branch)moment(state,'branch',action.title,action.label);
 if(action?.type==='personal'&&['marry','haveChild','applyJob','startBusiness','promotionExam'].includes(action.name))moment(state,'work',action.title,action.description);
 if(g.dream){
  const d=DREAMS.find(x=>x.id===g.dream);const completed=g.completed[d.id]??=[];
  for(const m of d.steps){if(!completed.includes(m.id)&&m.test(state)){
    completed.push(m.id);
    moment(state,'achievement','目標を達成',`${d.title}：${m.label}`);
    if(!quiet)addHistory(state,'goal-milestone','人生の目標を達成',`${d.title}：${m.label}`);
  }}
 }
 const achieved=new Set(g.achievements.map(x=>x.id));
 for(const [id,title,test] of ACHIEVEMENTS){
  if(!achieved.has(id)&&test(state)){
   achieved.add(id);g.achievements.push({id,year:t.year,month:t.month,age:t.ageYears});
   moment(state,'achievement',`実績：${title}`,'人生で積み重ねた出来事が、新たな実績になりました。');
   if(!quiet)addHistory(state,'achievement',`実績を獲得：${title}`,'人生の歩みが記録されました。');
  }
 }
}
const eraFor=age=>age<12?'幼少期':age<20?'学生時代':age<40?'若年期':age<65?'壮年期':'人生後半';
/** Sampling preserves first/last memories and broad age coverage rather than just last events. */
function selectMoments(highlights){
 if(highlights.length<=16)return highlights.map(x=>({...x}));
 const initial=highlights.slice(0,4),end=highlights.slice(-4),middle=highlights.slice(4,-4);
 const perEra=[];for(const era of ['幼少期','学生時代','若年期','壮年期','人生後半']){
  const found=middle.filter(h=>eraFor(h.age)===era);
  if(found.length)perEra.push(found[Math.floor(found.length/2)]);
 }
 const chosen=new Set([...initial,...perEra,...end]);
 for(const h of middle){if(chosen.size>=16)break;chosen.add(h);}
 return [...chosen].sort((a,b)=>a.year-b.year||a.month-b.month).slice(0,16).map(h=>({...h}));
}
/** Final result is immutable historical data: future UI redraws do not change the outcome. */
export function finalizeLifeGoals(state){
 const g=ensureLifeGoalProgress(state);
 if(!state.ending?.dead)return null;
 if(g.ending)return g.ending;
 observeLifeGoals(state,{quiet:false});
 const d=evaluateDream(state);const awards=g.achievements.length;
 const age=state.timeline.ageYears;
 const h=health(state),people=relationships(state);
 const net=netWorth(state);
 const relation=avg(people.map(x=>x.relationship));
 const pieces=[
  {label:'人生の歩み',score:clamp(age/100*20,0,20)},
  {label:'夢への取り組み',score:clamp((d?.done??0)/3*20,0,20)},
  {label:'実績',score:clamp(awards/12*20,0,20)},
  {label:'人とのつながり',score:clamp(relation/100*20,0,20)},
  {label:'生活の土台',score:clamp((net+500000)/5500000*20,0,20)},
 ];
 const score=pieces.reduce((sum,v)=>sum+v.score,0);
 const rich=net>=5000000,connected=spouse(state)||people.filter(p=>p.relationship>=75).length>=2;
 let type='ordinary';
 if(d?.completed)type=d.id;
 else if(rich)type='wealth';
 else if(academic(state)>=80||maxSkill(state)>=80)type='knowledge';
 else if((career(state).promotions??0)>=1 || (career(state).experience??0)>=120)type='career';
 else if(connected&&relation>=65)type='family';
 else if((h.mental??0)>=70&&maxSkill(state)>=45)type='wellness';
 const [title,description]=deathTypes[type];
 moment(state,'ending',`${age}歳で人生を終えた`,state.ending.cause??'人生の節目');
 const ending={type,title,description,score,breakdown:pieces,goalsEarned:d?.done??0,awards,moments:selectMoments(g.highlights)};
 g.ending=ending;
 state.ending.score=score;
 state.ending.legacy=[...state.ending.legacy,{year:state.timeline.year,month:state.timeline.month,title,description:`${description} 夢：${d?.title??'まだ決めていない'}。実績${awards}件。`}].slice(-10);
 return ending;
}
export function getLifeReview(state){
 const g=state.lifeGoal49??createLifeGoalProgress(),d=evaluateDream(state);
 return {dream:d,achievements:getAchievements(state),moments:g.ending?.moments??selectMoments(g.highlights??[]),ending:g.ending??null,netAssets:netWorth(state),personName:state.player?.name??'',birth:state.player?.birth??null,death:state.ending?.date??null};
}
