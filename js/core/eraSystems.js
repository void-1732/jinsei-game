/** STEP 52: fictional, deterministic changes in society and technology.
 * This is game data, not historical news or a simulation of real-world statistics.
 * Earlier worlds without era52 retain their previous calculations until migrated.
 */
const clamp=(value,min,max)=>Math.max(min,Math.min(max,Math.round(value)));
const eraIndex=date=>(date.year-2000)*12+date.month-1;
const TECH_LABELS=['日常への普及','技術の転換期','デジタル社会','高度な技術社会'];
export const ERA_CHOICES=Object.freeze(['learning','community','frugality']);
export function createEraProgress(){return {
 techIndex:16,socialIndex:54,techStage:0,priceBand:'安定',laborBand:'安定',socialBand:'安定',
 lastIndex:-1,headlines:[],choices:{learning:0,community:0,frugality:0},decisions:[],
};}
export function ensureEraProgress(world){
 if(!world.era52)world.era52=createEraProgress();
 return world.era52;
}
export function validateEraProgress(p){
 if(!p||typeof p!=='object'||Array.isArray(p))return false;
 if(!['techIndex','socialIndex'].every(k=>Number.isInteger(p[k])&&p[k]>=0&&p[k]<=100))return false;
 if(!Number.isInteger(p.techStage)||p.techStage<0||p.techStage>3)return false;
 if(!['安定','物価高','価格低下'].includes(p.priceBand)||!['安定','求人増加','採用難'].includes(p.laborBand)||!['安定','交流活発','不安'].includes(p.socialBand))return false;
 if(!Number.isInteger(p.lastIndex)||p.lastIndex< -1||p.lastIndex>2411)return false;
 if(!p.choices||typeof p.choices!=='object'||Array.isArray(p.choices)||Object.keys(p.choices).length!==3||!ERA_CHOICES.every(k=>Number.isInteger(p.choices[k])&&p.choices[k]>=0&&p.choices[k]<=8))return false;
 if(!Array.isArray(p.headlines)||p.headlines.length>36||!p.headlines.every(x=>x&&Number.isInteger(x.year)&&x.year>=2000&&x.year<=2200&&Number.isInteger(x.month)&&x.month>=1&&x.month<=12&&typeof x.title==='string'&&x.title.length<=100&&typeof x.description==='string'&&x.description.length<=250))return false;
 if(!Array.isArray(p.decisions)||p.decisions.length>20||!p.decisions.every(x=>x&&Number.isInteger(x.year)&&x.year>=2000&&x.year<=2200&&Number.isInteger(x.month)&&x.month>=1&&x.month<=12&&ERA_CHOICES.includes(x.focus)&&typeof x.title==='string'&&x.title.length<=100))return false;
 return true;
}
const techStage=n=>n>=70?3:n>=48?2:n>=28?1:0;
const priceBand=n=>n>=111?'物価高':n<=94?'価格低下':'安定';
const laborBand=n=>n>=108?'求人増加':n<=92?'採用難':'安定';
const socialBand=n=>n>=62?'交流活発':n<=43?'不安':'安定';
/** Called once after the existing economic cycle is updated for a month. */
export function advanceEra(world,date,randomValue=.5){
 const era=ensureEraProgress(world),idx=eraIndex(date);
 if(idx<=era.lastIndex)return [];
 const old={techStage:era.techStage,priceBand:era.priceBand,laborBand:era.laborBand,socialBand:era.socialBand};
 // Long-term technology moves forward, but progress comes in uneven waves.
 era.techIndex=clamp(16+idx*.075+Math.sin(idx/27)*5,12,95);
 era.socialIndex=clamp(54+Math.sin(idx/17)*10+(world.employmentIndex-100)*.32+(randomValue-.5)*5,25,78);
 era.techStage=techStage(era.techIndex);
 era.priceBand=priceBand(world.priceIndex);
 era.laborBand=laborBand(world.employmentIndex);
 era.socialBand=socialBand(era.socialIndex);
 era.lastIndex=idx;
 const news=[];
 function publish(title,description){
  const item={year:date.year,month:date.month,title,description};
  era.headlines.unshift(item);era.headlines.length=Math.min(era.headlines.length,36);
  world.news.unshift(item);world.news.length=Math.min(world.news.length,48);
  world.history.push(item);if(world.history.length>360)world.history.shift();
  news.push({type:'era52',...item});
 }
 if(era.techStage>old.techStage)publish(`技術が「${TECH_LABELS[era.techStage]}」へ`, '技能・採用の重視点が変化し、仕事や学び方に新しい選択が生まれました。');
 if(era.priceBand!==old.priceBand)publish(`暮らしの価格環境：${era.priceBand}`, '生活費への負担が変化しました。家計画面で毎月の実支出を確認できます。');
 if(era.laborBand!==old.laborBand)publish(`働く環境：${era.laborBand}`, '採用の難しさや賃金の状況が変化しています。');
 if(era.socialBand!==old.socialBand&&date.month===1)publish(`地域と社会のつながり：${era.socialBand}`, '人々の交流や支え合いの機会が変わっています。');
 return news;
}
/** Neutral without STEP 52 data; never apply existing recession bonuses a second time. */
export function eraEconomicEffects(world){
 const e=world?.era52;
 if(!e)return {living:1,wage:1,businessTech:1,businessCost:1,tuition:1};
 const price=clamp(world.priceIndex??100,85,180);
 const jobs=clamp(world.employmentIndex??100,75,125);
 const living= Math.max(.94,Math.min(1.62,1+(price-100)*.008-e.choices.frugality*.006));
 const wage=Math.max(.89,Math.min(1.20,1+(jobs-100)*.0017+(price-100)*.001+e.choices.learning*.002));
 const businessTech=Math.max(.94,Math.min(1.12,.98+(e.techIndex-16)*.0013));
 const businessCost=Math.max(.96,Math.min(1.50,1+(price-100)*.006));
 const tuition=Math.max(.95,Math.min(1.32,1+(price-100)*.005));
 return {living,wage,businessTech,businessCost,tuition};
}
/** Specific industries respond differently to new skills; overall hiring pressure is handled elsewhere. */
export function eraHiringAdjustment(world,postingId){
 const e=world?.era52;
 if(!e)return 0;
 const tech=Math.max(0,e.techIndex-28);
 const sector={tech:Math.floor(tech/14),pro:Math.floor(tech/20),office:-Math.floor(tech/24),creative:Math.floor(tech/25),shop:-Math.floor(tech/30),care:Math.floor((55-e.socialIndex)/12)}[postingId]??0;
 return clamp(sector+e.choices.learning, -4, 6);
}
export function eraScholarshipAdjustment(world){
 const e=world?.era52;
 if(!e)return 0;
 return clamp((e.techIndex>=45?2:0)+(e.choices.learning>=2?2:0)+(e.socialIndex>=60?1:0),0,5);
}
/** Events remain optional and are selected among ordinary life events, never replace a milestone. */
export function createEraChoiceEvent(state,date,turn,age){
 if(age<9||!state?.world?.era52||turn%9!==0)return null;
 const e=state.world.era52,phase=state.world.phase;
 const scenes=[];
 if(age<=24)scenes.push({tag:'技術と学び',title:'時代が変わる教室',description:'授業や仕事で必要な技術が変わってきた。自分はどう取り組む？',options:[
   ['新しい技能を学ぶ','技能＋4 / 元気－3','新しい道具を使いこなす練習を始めた。',{skill:'パソコン',skillValue:4,energy:-3},'learning'],
   ['仲間と教え合う','人間関係＋4 / 学力＋2','違う得意分野を持つ仲間と学べた。',{social:4,study:2},'community'],
   ['使える道具を工夫する','学力＋2 / 心＋2','限られたものでも学ぶ方法を見つけた。',{study:2,mental:2},'frugality'],
 ]});
 if(age>=18&&state.world.priceIndex>=104)scenes.push({tag:'暮らしと物価',title:'毎月の支出が気になる',description:'生活用品やサービスの価格が上がり、家計に余裕がなくなってきた。',options:[
   ['家計を整理する','心－1 / お金＋0','不要な支出を見直す習慣が身についた。',{mental:-1},'frugality'],
   ['技能を磨いて収入増を目指す','技能＋3 / 元気－3','今後の収入につながる準備を始めた。',{skill:'パソコン',skillValue:3,energy:-3},'learning'],
   ['身近な人と助け合う','人間関係＋5 / 心＋2','一人で抱え込まない暮らし方を選んだ。',{social:5,mental:2},'community'],
 ]});
 if(age>=18&&phase==='不況')scenes.push({tag:'働き方の変化',title:'景気が冷え込む街',description:'身近な職場でも採用や収入への不安が広がっている。',options:[
   ['新しい資格を調べる','学力＋2 / 元気－2','別の仕事へ進むための知識を得た。',{study:2,energy:-2},'learning'],
   ['人とのつながりを強くする','人間関係＋4','知り合いの経験がヒントになった。',{social:4},'community'],
   ['支出を整理する','心＋2','無理のない家計を優先することにした。',{mental:2},'frugality'],
 ]});
 if(age>=20&&e.techStage>=1)scenes.push({tag:'技術革新',title:'新しい技術が仕事を変える',description:'便利な技術が普及する一方、今までの働き方も見直されている。',options:[
   ['研修へ参加する','パソコン＋5 / 元気－3','新しい技術を使った仕事に挑戦できそうだ。',{skill:'パソコン',skillValue:5,energy:-3},'learning'],
   ['人間にしかできない強みを磨く','人間関係＋4 / 心＋2','人を支える力にも価値があると実感した。',{social:4,mental:2},'community'],
   ['生活と仕事の負担を見直す','心＋3','道具を使いすぎず、暮らしを整えることにした。',{mental:3},'frugality'],
 ]});
 if(age>=30&&e.socialBand!=='安定')scenes.push({tag:'社会と地域',title:'変わりゆく地域のつながり',description:'地域の生活や働き方が変わり、人と人との関係にも変化が生じている。',options:[
   ['地域活動に参加する','人間関係＋5 / 元気－2','新しい知人とのつながりが生まれた。',{social:5,energy:-2},'community'],
   ['新しい交流方法を試す','パソコン＋3 / 心＋2','離れた人ともつながれる方法が増えた。',{skill:'パソコン',skillValue:3,mental:2},'learning'],
   ['自分の生活を丁寧に守る','心＋3','長く続けられる生活のペースを選んだ。',{mental:3},'frugality'],
 ]});
 if(!scenes.length)return null;
 // Vary by era and player seed but keep every story fully serializable in a save.
 const index=(turn+e.techStage+e.choices.community)%scenes.length;
 const chosen=scenes[index];
 const options=chosen.options.map(([label,hint,result,impact,focus],i)=>({id:String(i+1),label,hint,result,impact,eraFocus:focus}));
 return {id:`T${turn}-choice`,type:'choice',story:true,eraStory:true,blocking:true,
  year:date.year,month:date.month,turn,category:chosen.tag,title:chosen.title,description:chosen.description,options};
}
export function recordEraChoice(state,event,option){
 if(!event?.eraStory||!state.world?.era52||!ERA_CHOICES.includes(option.eraFocus))return;
 const era=state.world.era52;
 era.choices[option.eraFocus]=Math.min(8,era.choices[option.eraFocus]+1);
 era.decisions.push({year:state.timeline.year,month:state.timeline.month,focus:option.eraFocus,title:event.title});
 if(era.decisions.length>20)era.decisions.shift();
}
export function eraSummary(world){
 const e=world?.era52;
 if(!e)return null;
 const effects=eraEconomicEffects(world);
 return {tech:e.techIndex,techLabel:TECH_LABELS[e.techStage],social:e.socialIndex,price:e.priceBand,labor:e.laborBand,
  livingImpact:Math.round((effects.living-1)*100),wageImpact:Math.round((effects.wage-1)*100),
  choices:{...e.choices},latest:e.headlines[0]??null};
}
