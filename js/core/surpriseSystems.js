/** STEP 53: Original fictional setbacks and fortunate turns. No real disaster predictions.
 * One event/turn. Risks and costs are capped; preparation and earlier choices matter.
 */
import {consequenceHealthProtection,rememberConsequence} from './consequenceSystems.js';

const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,Math.round(v)));
const yen=n=>Math.round(n).toLocaleString('ja-JP')+'円';
export const PREPARATION_AREAS=Object.freeze(['disaster','security','health']);
export const PREPARATION_LABELS=Object.freeze({disaster:'防災',security:'防犯',health:'応急対応'});
const AREA_COST=Object.freeze({disaster:2400,security:1000,health:1500});
export function createSurpriseProgress(){return {prepared:{disaster:0,security:0,health:0},lastTurn:-100,
  lastKind:null,totalLoss:0,totalGains:0,counts:{disaster:0,traffic:0,fraud:0,illness:0,luck:0},history:[]};}
export function ensureSurpriseProgress(state){state.surprise53??=createSurpriseProgress();return state.surprise53;}
export function validateSurpriseProgress(p){
 if(!p||typeof p!=='object'||Array.isArray(p)||!p.prepared||typeof p.prepared!=='object'||Array.isArray(p.prepared))return false;
 if(!PREPARATION_AREAS.every(k=>Number.isInteger(p.prepared[k])&&p.prepared[k]>=0&&p.prepared[k]<=5))return false;
 const kinds=['disaster','traffic','fraud','illness','luck'];
 if(!(p.lastKind===null||kinds.includes(p.lastKind))||!Number.isInteger(p.lastTurn)||p.lastTurn< -100||p.lastTurn>24000)return false;
 if(!p.counts||!kinds.every(k=>Number.isInteger(p.counts[k])&&p.counts[k]>=0&&p.counts[k]<=3000))return false;
 if(!Number.isSafeInteger(p.totalLoss)||p.totalLoss<0||p.totalLoss>1e11||!Number.isSafeInteger(p.totalGains)||p.totalGains<0||p.totalGains>1e11)return false;
 if(!Array.isArray(p.history)||p.history.length>32)return false;
 return p.history.every(h=>h&&kinds.includes(h.kind)&&Number.isInteger(h.age)&&h.age>=0&&h.age<=200
  &&Number.isInteger(h.year)&&h.year>=2000&&h.year<=2200&&Number.isInteger(h.month)&&h.month>=1&&h.month<=12
  &&typeof h.title==='string'&&h.title.length<=100&&typeof h.choice==='string'&&h.choice.length<=100
  &&Number.isSafeInteger(h.loss)&&h.loss>=0&&h.loss<=100000&&Number.isSafeInteger(h.gain)&&h.gain>=0&&h.gain<=30000
  &&Number.isInteger(h.prevented)&&h.prevented>=0&&h.prevented<=100000);
}
function moneyOut(state,label,amount){
 if(!amount)return;
 const finance=state.finances,date=state.timeline;
 finance.totals.expenses+=amount;
 const paid=Math.min(finance.cash,amount);
 finance.cash-=paid;finance.debt+=amount-paid;
 finance.ledger.push({year:date.year,month:date.month,kind:'支出',label,amount:-amount});
 if(finance.ledger.length>600)finance.ledger.shift();
}
function moneyIn(state,label,amount){
 if(!amount)return;
 const finance=state.finances,date=state.timeline;
 finance.cash+=amount;finance.totals.income+=amount;
 finance.ledger.push({year:date.year,month:date.month,kind:'収入',label,amount});
 if(finance.ledger.length>600)finance.ledger.shift();
}
/** A regular manual action, governed by the store's one-action-per-turn budget. */
export function prepareForSurprise(state,area){
 if(!PREPARATION_AREAS.includes(area))return {ok:false,reason:'備えの種類を選んでください。'};
 if(state.timeline.ageYears<8)return {ok:false,reason:'安全の備えは8歳から利用できます。'};
 const progress=ensureSurpriseProgress(state);
 if(progress.prepared[area]>=5)return {ok:false,reason:'この備えは最大5段階です。'};
 const cost=state.timeline.ageYears<18?0:AREA_COST[area];
 if(state.finances.cash<cost)return {ok:false,reason:`${PREPARATION_LABELS[area]}には${yen(cost)}が必要です。所持金を確認してください。`};
 moneyOut(state,`${PREPARATION_LABELS[area]}への備え`,cost);
 progress.prepared[area]++;
 return {ok:true,message:`${PREPARATION_LABELS[area]}の備えを${progress.prepared[area]}段階にしました。`};
}
const kindText=Object.freeze({
 disaster:{tag:'災害',title:'大雨で生活に影響が出た',description:'大雨で交通や住まいに影響が出た。どう対応する？',area:'disaster'},
 traffic:{tag:'事故',title:'移動中の思いがけない事故',description:'移動中にけがをしてしまった。安全を優先するか、予定を続けるか。',area:'health'},
 fraud:{tag:'防犯',title:'不審な支払いの請求',description:'心当たりのない請求が届いた。急いで払うように書かれている。',area:'security'},
 illness:{tag:'健康',title:'見過ごせない体調の変化',description:'数日続く不調を感じている。今日はどう対応する？',area:'health'},
 luck:{tag:'思いがけない幸運',title:'思いがけない協力の申し出',description:'以前の活動を覚えている人から声をかけられた。どんな機会にする？',area:null},
});
const options={
 disaster:[
  ['安全な場所へ避難する','安全を優先し、被害を抑えた。',6000,1,2,0,1],
  ['自分で片付けを急ぐ','早く片付いたが、負担も大きかった。',24000,5,4,0,0],
  ['地域の人と協力する','助け合いながら片付けを進めた。',12000,2,2,3,0],
 ],
 traffic:[
  ['受診して休む','診察を受けて体調を整えた。',10000,2,1,0,1],
  ['予定を優先する','先延ばしにした負担が残った。',3000,10,4,0,0],
  ['周囲に助けを求める','助けを受けて安全に帰宅できた。',6000,4,2,3,0],
 ],
 fraud:[
  ['請求元を確認し送金しない','事実確認して不審な請求を防いだ。',0,0,1,0,1],
  ['慌てて請求に応じる','確認しなかったため損害が出てしまった。',35000,0,5,0,0],
  ['信頼できる人に相談する','相談したことで被害を小さくできた。',1000,0,1,3,1],
 ],
 illness:[
  ['早めに受診する','早期対応で悪化を抑えた。',8500,2,1,0,1],
  ['しっかり休養する','休むことを選び、回復を目指した。',0,5,1,0,0],
  ['無理して予定を続ける','体調を崩してしまった。',0,12,5,0,0],
 ],
 luck:[
  ['短期の仕事を引き受ける','仕事を手伝った謝礼を受け取った。',0,0,1,0,0],
  ['人との縁を大切にする','新しいつながりができた。',0,0,0,5,0],
  ['学ぶ機会にする','新しい技能に触れることができた。',0,0,0,0,0],
 ],
};
/** Select one eligible fiction event after story milestones; no occurrence without a choice. */
export function createSurpriseEvent(state,date,turn,age,randomValue){
 if(!state?.initialized||age<8||turn%9!==4||randomValue>=.67)return null;
 const p=ensureSurpriseProgress(state);
 if(turn-p.lastTurn<18)return null;
 const kinds=['disaster','traffic','fraud','illness','luck'].filter(kind=>
  kind!==p.lastKind && (age>=18||!['fraud','luck'].includes(kind)) && (kind!=='illness'||!state.health.illness));
 if(!kinds.length)return null;
 const kind=kinds[Math.min(kinds.length-1,Math.floor((randomValue/.67)*kinds.length))];
 const definition=kindText[kind];
 return {id:`T${turn}-choice`,type:'choice',story:true,surprise53:true,surpriseKind:kind,blocking:true,
  year:date.year,month:date.month,turn,category:definition.tag,title:definition.title,description:definition.description,
  options:options[kind].map(([label,result,loss,physical,mental,social,prepared],i)=>({
   id:String(i+1),label,result,impact:{},safetyChoice:i,
   hint:kind==='luck'?'謝礼・人間関係・技能のいずれかが変化':`${age<18?'本人負担なし':`支出目安 ${yen(loss)}（備えで軽減）`}／体力への影響は最大${physical}`,
  }))};
}
/** Safe money accounting: cost not exceeding a cap, even with no cash; deficit becomes debt. */
export function resolveSurpriseChoice(state,event,option){
 if(!event?.surprise53)return [];
 const p=ensureSurpriseProgress(state),kind=event.surpriseKind,chosen=options[kind]?.[option.safetyChoice];
 if(!chosen||option.id!==String(option.safetyChoice+1))throw Error('選択内容が不正です。');
 const [,result,baseLoss,basePhysical,baseMental,baseSocial,prepBoost]=chosen;
 const age=state.timeline.ageYears;
 const area=kindText[kind].area;
 const preparation=area?p.prepared[area]:0;
 const socialAid=state.world?.era52?.choices?.community??0;
 const livingAid=state.world?.era52?.choices?.frugality??0;
 const healthAid=consequenceHealthProtection(state);
 // Protective effects are intentionally capped. Health decisions cannot cancel all harm.
 const reduction=Math.min(.60,preparation*.09+socialAid*.015+livingAid*.01+(kind==='illness'?healthAid*.3:0));
 const planned=Math.max(0,Math.round(baseLoss*(1-reduction)));
 const loss=age<18?0:planned;
 const physicalLoss=Math.max(0,Math.round(basePhysical*(1-Math.min(.55,preparation*.07+healthAid*.5))));
 const changes=[];
 if(loss){moneyOut(state,`予期せぬ出来事：${event.title}`,loss);p.totalLoss+=loss;changes.push(`支出 ${yen(loss)}${state.finances.debt>0?'（不足分は負債）':''}`);}
 const gain=kind==='luck'&&option.safetyChoice===0?12000:0;
 if(gain){moneyIn(state,'短期の仕事の謝礼',gain);p.totalGains+=gain;changes.push(`謝礼 +${yen(gain)}`);}
 if(physicalLoss){state.health.physical=clamp(state.health.physical-physicalLoss);changes.push(`体力 -${physicalLoss}`);}
 if(baseMental){state.health.mental=clamp(state.health.mental-baseMental);changes.push(`こころ -${baseMental}`);}
 if(kind==='illness' && option.safetyChoice===2 && !state.health.illness){state.health.illness={name:'体調不良',months:0};changes.push('治療が必要な体調不良');}
 if(baseSocial){
  const person=state.people.find(x=>x.role==='友人')??state.people.find(x=>x.role==='父'||x.role==='母');
  if(person){person.relationship=clamp(person.relationship+baseSocial);changes.push(`${person.name}との親密度 +${baseSocial}`);}
 }
 if(kind==='luck'&&option.safetyChoice===2){
  const skill=state.education.skills.パソコン??0;
  state.education.skills.パソコン=clamp(Math.max(skill,Math.min(95,skill+3)));changes.push('パソコン技能 +3');
 }
 if(prepBoost && area){p.prepared[area]=Math.min(5,p.prepared[area]+prepBoost);changes.push(`${PREPARATION_LABELS[area]}の備え +${prepBoost}`);}
 p.lastTurn=state.timeline.turnsElapsed;p.lastKind=kind;p.counts[kind]++;
 const prevented=age<18?0:baseLoss-loss;
 p.history.unshift({kind,age,year:state.timeline.year,month:state.timeline.month,title:event.title,choice:option.label,loss,gain,prevented});
 if(p.history.length>32)p.history.length=32;
 // The existing STEP 51 five-/fifteen-year consequence system remembers the relevant choice.
 const impact=kind==='fraud'?{cash:option.safetyChoice===1?-loss:0,budgetHabit:option.safetyChoice!==1?2:0}
  :kind==='luck'?{social:baseSocial,skillValue:option.safetyChoice===2?3:0,cash:gain}
  :{physical:-physicalLoss,mental:-baseMental,social:baseSocial};
 rememberConsequence(state,event,{label:option.label,impact},{source:'surprise'});
 if(prevented)changes.push(`備えなどで軽減 ${yen(prevented)}`);
 return changes.length?changes:[result];
}
export function surpriseSummary(state){
 const p=state?.surprise53??createSurpriseProgress();
 return {prepared:{...p.prepared},events:Object.values(p.counts).reduce((a,b)=>a+b,0),
  totalLoss:p.totalLoss,totalGains:p.totalGains,latest:p.history[0]??null};
}
