/** Rare fictional life events. Annual chance, at least three years apart.
 * Independent of the existing minor surprise system (STEP 53).
 */
import {ensureSurpriseProgress} from './surpriseSystems.js';
import {PROPERTY_COVERAGE,propertyInsuranceBenefit} from './livingSystems.js';

const yen=n=>Math.round(n).toLocaleString('ja-JP')+'円';
const cap=(n,min=0,max=100)=>Math.max(min,Math.min(max,Math.round(n)));
const idx=d=>d.year*12+d.month-1;
export const RARE_EVENT_KINDS=Object.freeze(['fire','earthquake','flood','burglary','career','family','windfall']);
const DISASTER_KINDS=Object.freeze(['fire','earthquake','flood']);
const DEFINITIONS=Object.freeze({
 fire:{title:'住まいで火災が発生',category:'火災',description:'住まいの一部が火災で損傷しました。火災保険と防災の備えが被害に影響します。',loss:110000},
 earthquake:{title:'地震による住宅の被害',category:'地震',description:'地震により住まいや家財が損傷しました。防災対策と地震を含む保障で負担が変わります。',loss:135000},
 flood:{title:'洪水と浸水の被害',category:'洪水',description:'大雨による浸水が発生しました。避難の準備や水災保障の有無が重要です。',loss:105000},
 burglary:{title:'家財の盗難',category:'防犯',description:'留守中に盗難被害が発生しました。防犯の備えで損失を抑えられます。',loss:42000},
 career:{title:'思いがけない仕事の依頼',category:'仕事',description:'今後につながる新しい仕事の相談が舞い込みました。',loss:0},
 family:{title:'家族からの大切な相談',category:'人物・家族',description:'家族から生活や将来に関する相談を持ちかけられました。',loss:0},
 windfall:{title:'思いがけない臨時収入',category:'幸運',description:'以前の活動が評価され、臨時収入の機会が訪れました。',loss:0}
});
const OPTIONS=Object.freeze({
 fire:[['安全を確保して専門家へ依頼',.75,1],['家族と協力して応急対応',.85,2],['自分で復旧を急ぐ',1.10,5]],
 earthquake:[['安全な場所へ避難し専門家へ相談',.75,1],['地域と協力して復旧する',.85,2],['急いで自宅の片付けを進める',1.10,5]],
 flood:[['早めに避難し安全を確保',.70,1],['近隣と協力して復旧',.85,2],['荷物を守ろうと自宅に残る',1.15,6]],
 burglary:[['警察に相談し被害を確認',.75,1],['地域の防犯対策を見直す',.90,1],['すぐに自分だけで対応する',1.10,3]],
 career:[['仕事の依頼を引き受ける',0,0],['技能習得の機会にする',0,0],['家族との時間を優先する',0,0]],
 family:[['話を聞き協力する',0,0],['一緒に解決策を考える',0,0],['少し距離を置いて考える',0,0]],
 windfall:[['謝礼を受け取る',0,0],['学びに投資する',0,0],['家族と分かち合う',0,0]]
});
export function createRareLifeProgress(){return {lastMonth:-120,lastKind:null,counts:{fire:0,earthquake:0,flood:0,burglary:0,career:0,family:0,windfall:0},history:[]};}
export function ensureRareLifeProgress(state){state.rareLife??=createRareLifeProgress();return state.rareLife;}
export function validateRareLifeProgress(p){
 if(p===undefined)return true; // Older v7 saves
 if(!p||typeof p!=='object'||Array.isArray(p)||!Number.isInteger(p.lastMonth)||p.lastMonth< -120||p.lastMonth>26412||
  !(p.lastKind===null||RARE_EVENT_KINDS.includes(p.lastKind))||!p.counts||typeof p.counts!=='object')return false;
 if(!RARE_EVENT_KINDS.every(k=>Number.isInteger(p.counts[k])&&p.counts[k]>=0&&p.counts[k]<=1000))return false;
 if(!Array.isArray(p.history)||p.history.length>24)return false;
 return p.history.every(h=>h&&RARE_EVENT_KINDS.includes(h.kind)&&Number.isInteger(h.year)&&h.year>=2000&&h.year<=2200&&
  Number.isInteger(h.month)&&h.month>=1&&h.month<=12&&Number.isInteger(h.loss)&&h.loss>=0&&h.loss<=250000&&
  Number.isInteger(h.insured)&&h.insured>=0&&h.insured<=250000&&Number.isInteger(h.prevented)&&h.prevented>=0&&h.prevented<=250000);
}
export function rareEventEligible(state,date,age,random){
 const p=state?.rareLife??createRareLifeProgress();
 return Boolean(state?.initialized&&age>=18&&date.month===state.player.birth.month&&
  idx(date)-p.lastMonth>=36&&random<.48);
}
export function createRareLifeEvent(state,date,turn,age,random){
 if(!rareEventEligible(state,date,age,random))return null;
 const p=ensureRareLifeProgress(state);
 const allowed=RARE_EVENT_KINDS.filter(k=>k!==p.lastKind);
 // Use deterministic positioning; no extra PRNG draws.
 const kind=allowed[Math.min(allowed.length-1,Math.floor(random/.48*allowed.length))];
 const def=DEFINITIONS[kind];
 const prep=kind==='burglary'?(state.surprise53?.prepared?.security??0):(state.surprise53?.prepared?.disaster??0);
 const coverage=state.finances?.living?.propertyCoverage??'未加入';
 const preview=def.loss?Math.round(def.loss*(1-Math.min(.45,prep*.09))):0;
 return {id:`T${turn}-choice`,type:'choice',story:true,rareLife:true,rareKind:kind,blocking:true,
  year:date.year,month:date.month,turn,category:def.category,title:def.title,description:def.description,
  options:OPTIONS[kind].map(([label,multiplier,health],i)=>({
   id:String(i+1),label,result:`${label}を選びました。`,impact:{},rareChoice:i,
   hint:def.loss?`損失目安${yen(Math.round(preview*multiplier))}（防災・保険等で変動）／体力負担${health}。${coverage}の保障を確認`:
    '収入・技能・人間関係のいずれかに影響'
  }))};
}
function money(state,label,amount,income=false){
 if(!amount)return;
 const f=state.finances,d=state.timeline;
 if(income){f.cash+=amount;f.totals.income+=amount;}
 else{const cash=Math.min(f.cash,amount);f.cash-=cash;f.debt+=amount-cash;f.totals.expenses+=amount;}
 f.ledger.push({year:d.year,month:d.month,kind:income?'収入':'支出',label,amount:income?amount:-amount});
 if(f.ledger.length>600)f.ledger.shift();
}
export function resolveRareLifeChoice(state,event,option){
 if(!event?.rareLife)return [];
 const kind=event.rareKind,definition=DEFINITIONS[kind],n=Number(option.rareChoice);
 if(!definition||!Number.isInteger(n)||n<0||n>=OPTIONS[kind].length||option.id!==String(n+1))throw Error('選択内容が不正です');
 const progress=ensureRareLifeProgress(state),date=state.timeline,changes=[];
 const [,,physical]=OPTIONS[kind][n];
 let loss=0,insured=0,prevented=0;
 if(definition.loss){
  const shelter=state.finances.living.housing;
  const multiplier=shelter==='実家'?.25:shelter==='賃貸'?.5:1;
  const prep=kind==='burglary'?(state.surprise53?.prepared?.security??0):(state.surprise53?.prepared?.disaster??0);
  const raw=Math.round(definition.loss*multiplier*OPTIONS[kind][n][1]);
  const reduced=Math.round(raw*(1-Math.min(.45,prep*.09)));
  insured=DISASTER_KINDS.includes(kind)?propertyInsuranceBenefit(state.finances.living,kind,reduced):0;
  loss=Math.max(0,reduced-insured);
  prevented=raw-loss;
  if(loss){money(state,`${definition.category}の自己負担`,loss);changes.push(`自己負担 ${yen(loss)}`);}
  if(insured){money(state,`${definition.category}の保険給付`,insured,true);
   // Claims and property repair are settled at the same time. The payout is
   // immediately used for covered repairs, so it never becomes a cash windfall.
   money(state,`${definition.category}の保険対象修繕費`,insured);
   changes.push(`保険で修繕費${yen(insured)}を補償`);
  }
  if(prevented)changes.push(`防災・保障などで${yen(prevented)}軽減`);
  state.health.physical=cap(state.health.physical-physical);
 }else if(kind==='career'){
  if(n===0){money(state,'臨時の仕事の謝礼',22000,true);changes.push('謝礼 +22,000円');}
  else if(n===1){state.education.skills.パソコン=cap((state.education.skills.パソコン??0)+6);changes.push('パソコン技能 +6');}
  else{state.health.mental=cap(state.health.mental+5);changes.push('こころ +5');}
 }else if(kind==='family'){
  const person=state.people.find(x=>x.role==='配偶者'||x.role==='父'||x.role==='母'||x.role==='子');
  const delta=[8,6,-1][n];
  if(person){person.relationship=cap(person.relationship+delta);changes.push(`${person.name}との親密度 ${delta>=0?'+':''}${delta}`);}
  if(n===1){state.health.mental=cap(state.health.mental+3);changes.push('こころ +3');}
 }else if(kind==='windfall'){
  if(n===0){money(state,'予想外の謝礼',28000,true);changes.push('臨時収入 +28,000円');}
  else if(n===1){state.education.skills.読書=cap((state.education.skills.読書??0)+6);changes.push('読書技能 +6');}
  else{const person=state.people.find(x=>x.role==='父'||x.role==='母'||x.role==='配偶者');if(person){person.relationship=cap(person.relationship+6);changes.push('家族との親密度 +6');}}
 }
 progress.lastMonth=idx(date);progress.lastKind=kind;progress.counts[kind]++;
 progress.history.unshift({kind,year:date.year,month:date.month,loss,insured,prevented});
 if(progress.history.length>24)progress.history.length=24;
 return changes.length?changes:['対応を終えました'];
}
export function rareLifeSummary(state){
 const p=state.rareLife??createRareLifeProgress();
 return {total:RARE_EVENT_KINDS.reduce((n,k)=>n+p.counts[k],0),history:p.history.slice(0,4)};
}
