/** STEP 51 — choices with durable, delayed consequences.
 * These game mechanics are fictional. No external data is needed for deterministic replay.
 * Save schema remains v7: legacy51 is an optional, strictly validated extension.
 */
const domains=Object.freeze({
 learning:{label:'学びと進路',tag:'learning',title:'過去に学んだことが役立つ日',detail:'進学や技能に向き合った経験が、再び選択肢を広げている。'},
 career:{label:'仕事と挑戦',tag:'career',title:'かつての挑戦が戻ってきた',detail:'仕事や挑戦について下した決断に、次の機会が訪れた。'},
 bonds:{label:'人とのつながり',tag:'bonds',title:'懐かしい縁からの知らせ',detail:'大切にしてきた人間関係が、違う形であなたの前に現れた。'},
 finance:{label:'お金と暮らし',tag:'finance',title:'あの時のお金の使い方',detail:'以前の家計やお金の選択を、今の暮らしに生かす時が来た。'},
 health:{label:'健康と生き方',tag:'health',title:'続けてきた習慣の意味',detail:'昔の体調管理や休息の選択が、これからの生活につながっている。'},
});
const all=Object.keys(domains);
const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const int=(x,lo,hi)=>Number.isSafeInteger(x)&&x>=lo&&x<=hi;
const text=(x,n)=>typeof x==='string'&&x.length>0&&x.length<=n;
const cap=(n,min,max)=>Math.max(min,Math.min(max,n));
export const createConsequenceProgress=()=>({nextId:1,memories:[],scheduled:[],resolved:[],influence:{learning:0,career:0,bonds:0,finance:0,health:0}});
export function validateConsequenceProgress(x){
 if(!record(x)||!int(x.nextId,1,10000)||!Array.isArray(x.memories)||x.memories.length>48||!Array.isArray(x.scheduled)||x.scheduled.length>96||!Array.isArray(x.resolved)||x.resolved.length>96||!record(x.influence)||Object.keys(x.influence).sort().join(',')!==[...all].sort().join(','))return false;
 if(!all.every(key=>int(x.influence[key],0,20)))return false;
 const ids=new Set();
 for(const m of x.memories){
  if(!record(m)||!int(m.id,1,9999)||ids.has(m.id)||!all.includes(m.domain)||!int(m.age,6,100)||!int(m.year,2000,2200)||!int(m.month,1,12)||!text(m.title,120)||!text(m.choice,140)||!['choice','branch','action','surprise'].includes(m.source))return false;
  ids.add(m.id);
 }
 if(x.memories.length && Math.max(...ids)>=x.nextId)return false;
 const jobs=new Set();
 for(const job of x.scheduled){
  if(!record(job)||!ids.has(job.memoryId)||![1,2].includes(job.stage)||!int(job.dueAge,7,115)||jobs.has(`${job.memoryId}-${job.stage}`))return false;
  jobs.add(`${job.memoryId}-${job.stage}`);
  const m=x.memories.find(v=>v.id===job.memoryId);
  if(job.dueAge!==m.age+(job.stage===1?5:15))return false;
 }
 const completed=new Set();
 for(const e of x.resolved){
  if(!record(e)||!int(e.memoryId,1,9999)||![1,2].includes(e.stage)||!int(e.age,6,115)||!int(e.year,2000,2200)||!text(e.title,120)||!text(e.choice,140)||!all.includes(e.domain)||completed.has(`${e.memoryId}-${e.stage}`))return false;
  completed.add(`${e.memoryId}-${e.stage}`);
 }
 return x.scheduled.every(j=>!completed.has(`${j.memoryId}-${j.stage}`));
}
/** Import at most the latest old branching memory per thread, without repeating past rewards. */
export function ensureConsequenceProgress(state){
 if(state.legacy51!==undefined)return state.legacy51;
 const progress=createConsequenceProgress();
 const mapped={spark:'learning',career:'career',bonds:'bonds',values:'health'};
 const seen=new Set();
 const previous=[...(state.storyProgress?.memories??[])].reverse();
 for(const old of previous){
  if(seen.has(old.thread)||!mapped[old.thread]||old.age<6||old.age>85)continue;
  seen.add(old.thread);
  const memory={id:progress.nextId++,domain:mapped[old.thread],title:'以前の人生の分岐',choice:old.choice,age:old.age,year:old.year,month:1,source:'branch'};
  progress.memories.push(memory);
  for(const [stage,delay] of [[1,5],[2,15]])if(old.age+delay>state.timeline.ageYears)progress.scheduled.push({memoryId:memory.id,stage,dueAge:old.age+delay});
 }
 state.legacy51=progress;
 return progress;
}
function impactDomain(impact={},branch){
 if(branch){return {spark:'learning',career:'career',bonds:'bonds',values:'health'}[branch.thread]??null;}
 const weighted={learning:Math.abs(impact.study??0)+Math.abs(impact.skillValue??0),career:Math.abs(impact.work??0)*2+(impact.careerPortfolio??0),bonds:Math.abs(impact.social??0),finance:Math.abs(impact.cash??0)/1200+Math.abs(impact.budgetHabit??0),health:Math.abs(impact.physical??0)+Math.abs(impact.mental??0)+Math.abs(impact.energy??0)*.5};
 const ranked=Object.entries(weighted).sort((a,b)=>b[1]-a[1]);
 return ranked[0][1]>=2?ranked[0][0]:null;
}
/** Record a meaningful decision, at most once per domain in eight years. */
export function rememberConsequence(state,event,option,{source='choice',forceDomain=null}={}){
 if(!state?.initialized||state.ending?.dead)return null;
 const age=state.timeline.ageYears;
 if(age<6||age>85||!text(option?.label,140))return null;
 const progress=ensureConsequenceProgress(state);
 const domain=forceDomain??impactDomain(option.impact,event.branch);
 if(!domains[domain])return null;
 const last=progress.memories.filter(m=>m.domain===domain).at(-1);
 if(last && age-last.age<8)return null;
 // Avoid unbounded scheduled events and preserve evidence for later inspection.
 if(progress.memories.length>=48)return null;
 const memory={id:progress.nextId++,domain,title:String(event.title).slice(0,120),choice:option.label.slice(0,140),age,year:state.timeline.year,month:state.timeline.month,source};
 progress.memories.push(memory);
 for(const [stage,delay] of [[1,5],[2,15]])if(age+delay<=110)progress.scheduled.push({memoryId:memory.id,stage,dueAge:age+delay});
 return memory;
}
function choice(label,result,impact,direction){return {label,result,impact,direction};}
/** A scheduled follow-up can only appear when the player reaches its age. */
export function createConsequenceEvent(state,date,turn,age){
 const progress=state?.legacy51;
 if(!progress?.scheduled?.length)return null;
 const next=progress.scheduled.filter(j=>j.dueAge<=age).sort((a,b)=>a.dueAge-b.dueAge||a.memoryId-b.memoryId||a.stage-b.stage)[0];
 if(!next)return null;
 const memory=progress.memories.find(m=>m.id===next.memoryId);
 if(!memory)return null;
 const d=domains[memory.domain];
 const due=next.stage===1?'数年が過ぎた今':'長い年月が過ぎた今';
 const description=`${memory.age}歳の時、あなたは「${memory.title}」で「${memory.choice}」を選んだ。${due}、${d.detail} 現在の状況を踏まえてどうする？`;
 const family=state.people?.some(p=>['友人','交際相手','配偶者','子'].includes(p.role));
 const job=Boolean(state.finances?.career?.job);
 const choices={
  learning:[choice('学んだことを磨き直す','経験を生かして学びと専門性を伸ばした。',{study:3,skill:'パソコン',skillValue:2,energy:-2},'continue'),choice('周囲に教える','知識を共有し、人とのつながりを深めた。',{social:3,mental:2},'balance'),choice('別の得意分野を探す','過去にとらわれず新しい技能を身に付けた。',{skill:'読書',skillValue:3},'change')],
  career:[choice(job?'今の仕事で経験を生かす':'再挑戦に向けて準備する','これまでの挑戦を次の仕事に生かした。',{work:3,study:2,energy:-2},'continue'),choice('仲間の挑戦を支える','培った経験を周囲へ還元した。',{social:3,mental:2},'balance'),choice('働き方を見直す','無理を減らして新しい方向を考えた。',{mental:3,energy:3},'change')],
  bonds:[choice(family?'懐かしい人に連絡する':'身近な家族と話す','昔の縁を大切にし、信頼関係を深めた。',{social:4,mental:2},'continue'),choice('これまでの経験を分かち合う','対話から学び直す機会を得た。',{study:2,social:2},'balance'),choice('自分の時間も大切にする','心に余裕を持ち、関係を見つめ直した。',{mental:4},'change')],
  finance:[choice('家計の習慣を見直す','生活費の使い方を整理し、今後の負担を減らした。',{mental:2},'continue'),choice('家族と暮らしを相談する','一人で抱えずに暮らしの課題を話し合った。',{social:3,mental:2},'balance'),choice('新しい収入のために学ぶ','経験を踏まえて仕事の可能性を広げた。',{study:3,work:2,energy:-2},'change')],
  health:[choice('今後も健康習慣を続ける','過去の気づきを生かして心身を整えた。',{physical:3,mental:2},'continue'),choice('大切な人と過ごす','休息と交流のバランスを見つけた。',{social:3,energy:2},'balance'),choice('無理のない働き方を考える','長い目で見た生活の形を選び直した。',{mental:3,energy:3},'change')],
 }[memory.domain];
 return {id:`T${turn}-choice`,type:'choice',story:true,blocking:true,important:true,consequence:{memoryId:memory.id,stage:next.stage,domain:memory.domain},year:date.year,month:date.month,turn,category:`過去の選択・${d.label}`,title:next.stage===1?d.title:`${d.label}：15年前の選択の続き`,description,options:choices.map((o,i)=>({...o,id:String(i+1),hint:memory.domain==='finance'&&o.direction==='continue'?'家計支出を軽減 / 心＋2':`${d.label}に新しい影響`,impact:{...o.impact}}))};
}
/** Apply real, bounded effects: employability, living costs, health and relationships. */
export function resolveConsequence(state,event,option){
 if(!event.consequence)return null;
 const p=ensureConsequenceProgress(state),key=event.consequence;
 const job=p.scheduled.find(x=>x.memoryId===key.memoryId&&x.stage===key.stage);
 if(!job)return null;
 const domain=key.domain;
 const focus=option.direction==='change'?(domain==='health'?'career':domain==='finance'?'learning':'health'):domain;
 const gain=option.direction==='continue'?3:option.direction==='balance'?2:1;
 p.influence[focus]=cap(p.influence[focus]+gain,0,20);
 const effects=[];
 if(domain==='finance'&&option.direction==='continue'){
  const before=state.finances.monthlyBudget;
  state.finances.monthlyBudget=Math.max(Math.min(10000,before),before-1000);
  const diff=before-state.finances.monthlyBudget;
  if(diff)effects.push(`今後の生活費が月${diff.toLocaleString('ja-JP')}円軽減`);
 }
 if(domain==='career'&&option.direction==='continue'&&state.finances.career.job&&state.finances.career.performance>=60){
  const previous=state.finances.career.monthlySalary;
  state.finances.career.monthlySalary=Math.max(previous,Math.min(2000000,previous+3000));
  if(state.finances.career.monthlySalary>previous)effects.push('実務経験が月給に反映');
 }
 p.scheduled=p.scheduled.filter(x=>!(x.memoryId===job.memoryId&&x.stage===job.stage));
 p.resolved.push({memoryId:job.memoryId,stage:job.stage,age:state.timeline.ageYears,year:state.timeline.year,title:event.title.slice(0,120),choice:option.label.slice(0,140),domain});
 if(p.resolved.length>96)p.resolved.shift();
 return effects;
}
/** Matured memories affect real hiring scores without overriding job requirements. */
export function consequenceHiringBonus(state){const p=state.legacy51?.influence;return p?Math.min(6,Math.floor((p.learning+p.career)/2)):0;}
/** Earlier commitment to wellbeing can modestly reduce illness risk. */
export function consequenceHealthProtection(state){return Math.min(.35,(state.legacy51?.influence?.health??0)*.025);}
export function getConsequenceSummary(state){
 const p=state?.legacy51??createConsequenceProgress();
 const future=p.scheduled.map(j=>({...j,memory:p.memories.find(m=>m.id===j.memoryId)})).filter(j=>j.memory).sort((a,b)=>a.dueAge-b.dueAge||a.memoryId-b.memoryId);
 return {memories:p.memories,upcoming:future,echoes:p.resolved,influence:p.influence,labels:Object.fromEntries(Object.entries(domains).map(([k,v])=>[k,v.label]))};
}
