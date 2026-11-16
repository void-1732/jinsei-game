/** Optional monthly routines and one-off adult activities.
 * Recurring plans spend money automatically in a capped, deterministic monthly loop.
 * Choosing or stopping a plan consumes the corresponding category action once.
 */
import {balancedGrowth} from './balanceSystems.js';
export const MONTHLY_PLANS=Object.freeze({
 health:Object.freeze([
  {id:'off',name:'設定しない',cost:0,description:'自動的な健康習慣を停止'},
  {id:'walks',name:'毎月のウォーキング',cost:1000,description:'体力・元気を緩やかに維持'},
  {id:'gym',name:'ジムに通う',cost:8000,description:'体力向上と疲労の軽減'},
  {id:'mindfulness',name:'心のケア・瞑想',cost:3500,description:'こころ・ストレスの改善'}
 ]),
 relationships:Object.freeze([
  {id:'off',name:'設定しない',cost:0,description:'自動的な交流を停止'},
  {id:'call',name:'家族に連絡する',cost:1000,description:'家族との関係を少しずつ深める'},
  {id:'meet',name:'友人と月1回会う',cost:6000,description:'友人とのつながりを継続'},
  {id:'family',name:'家族で食事する',cost:9000,description:'家族との時間・こころを育てる'}
 ]),
 learning:Object.freeze([
  {id:'off',name:'設定しない',cost:0,description:'自動的な学習を停止'},
  {id:'reading',name:'読書を続ける',cost:1500,description:'読書の技能を少しずつ伸ばす'},
  {id:'online',name:'オンライン講座',cost:4500,description:'パソコン技能・学習経験を増やす'},
  {id:'language',name:'英語を勉強する',cost:7000,description:'英語の学力をゆっくり伸ばす'}
 ])
});
export const MONTHLY_DOMAIN_LABELS=Object.freeze({health:'健康',relationships:'人物・家族',learning:'学業'});
export const ONE_OFF_ACTIVITIES=Object.freeze([
 {id:'gym-class',name:'フィットネス講座',category:'健康',cost:3000,description:'体力+3・元気-2'},
 {id:'mindfulness',name:'メンタルケア講座',category:'健康',cost:2500,description:'こころ+4・ストレス軽減'},
 {id:'medical-screening',name:'健康診断',category:'健康',cost:4500,description:'体調を見直し心の安心を得る'},
 {id:'family-dinner',name:'家族で外食',category:'人物・家族',cost:9000,description:'家族との関係+4'},
 {id:'friends-outing',name:'友人との外出',category:'人物・家族',cost:6500,description:'友人との関係+4'},
 {id:'online-course',name:'オンライン講座を受ける',category:'学業',cost:5000,description:'パソコン技能を磨く'},
 {id:'reading-workshop',name:'読書・教養講座',category:'学業',cost:3500,description:'読書技能を磨く'},
 {id:'job-networking',name:'キャリア交流会',category:'仕事・経営',cost:6000,description:'仕事探し・職場人脈の準備'}
]);
const clamp=n=>Math.max(0,Math.min(100,Math.round(n)));
const monthIndex=date=>date.year*12+date.month-1;
export const makeMonthlyRoutines=()=>({plans:{health:'off',relationships:'off',learning:'off'},lastMonthIndex:-1,monthsApplied:0,totalSpent:0,lastResults:[]});
export function ensureMonthlyRoutines(state){state.monthlyRoutines??=makeMonthlyRoutines();return state.monthlyRoutines;}
export function validateMonthlyRoutines(s){
 if(!s||typeof s!=='object'||Array.isArray(s)||!s.plans||typeof s.plans!=='object')return false;
 if(Object.keys(s.plans).length!==3)return false;
 for(const [key,options]of Object.entries(MONTHLY_PLANS))if(!options.some(o=>o.id===s.plans[key]))return false;
 if(!Number.isInteger(s.lastMonthIndex)||s.lastMonthIndex< -1||s.lastMonthIndex>26412)return false;
 if(!Number.isSafeInteger(s.monthsApplied)||s.monthsApplied<0||s.monthsApplied>4000)return false;
 if(!Number.isSafeInteger(s.totalSpent)||s.totalSpent<0||s.totalSpent>1000000000)return false;
 return Array.isArray(s.lastResults)&&s.lastResults.length<=3&&s.lastResults.every(r=>typeof r==='string'&&r.length<=140);
}
export function setMonthlyRoutine(state,{domain,planId}={}){
 if(state.timeline.ageYears<18)return {ok:false,reason:'継続習慣の設定は18歳から利用できます。'};
 const plans=MONTHLY_PLANS[domain],selected=plans?.find(p=>p.id===planId);
 if(!selected)return {ok:false,reason:'継続プランが不正です。'};
 const routine=ensureMonthlyRoutines(state);
 if(routine.plans[domain]===planId)return {ok:false,reason:'すでに同じ継続プランが設定されています。'};
 routine.plans[domain]=planId;
 return {ok:true,message:`${MONTHLY_DOMAIN_LABELS[domain]}：${selected.name}を設定しました。毎月${selected.cost.toLocaleString('ja-JP')}円（支払可能な月のみ）が適用されます。`};
}
const familyTarget=state=>state.people.find(p=>p.role==='配偶者')??state.people.find(p=>p.role==='子')??state.people.find(p=>p.role==='母'||p.role==='父');
const friendTarget=state=>state.people.find(p=>p.role==='友人'||p.role==='交際相手');
export function advanceMonthlyRoutines(state,date,age){
 const s=ensureMonthlyRoutines(state),index=monthIndex(date);
 if(index<=s.lastMonthIndex||age<18)return {applied:false};
 const results=[],f=state.finances,h=state.health,e=state.education;
 for(const [domain,planId] of Object.entries(s.plans)){
  const plan=MONTHLY_PLANS[domain]?.find(p=>p.id===planId);
  if(!plan||plan.id==='off')continue;
  const target=domain==='relationships'?(planId==='meet'?friendTarget(state):familyTarget(state)):null;
  if(domain==='relationships'&&!target){results.push(`${plan.name}：対象者がいないため保留`);continue;}
  if(f.cash<plan.cost){results.push(`${plan.name}：資金不足で今月は保留`);continue;}
  f.cash-=plan.cost;f.totals.expenses+=plan.cost;s.totalSpent=Math.min(1000000000,s.totalSpent+plan.cost);
  f.ledger.push({year:date.year,month:date.month,kind:'支出',label:`継続習慣：${plan.name}`,amount:-plan.cost});
  if(f.ledger.length>600)f.ledger.shift();
  if(domain==='health'){
    if(planId==='walks'){h.physical=clamp(h.physical+1);h.energy=clamp(h.energy+1);}
    if(planId==='gym'){h.physical=clamp(h.physical+2);h.energy=clamp(h.energy-1);if(state.daily54)state.daily54.fatigue=clamp(state.daily54.fatigue-1);}
    if(planId==='mindfulness'){h.mental=clamp(h.mental+2);if(state.daily54)state.daily54.stress=clamp(state.daily54.stress-2);}
  }else if(domain==='relationships'){
    target.relationship=clamp(target.relationship+1);
    if(planId==='family')h.mental=clamp(h.mental+1);
  }else if(domain==='learning'){
    const skill=planId==='reading'?'読書':'パソコン';
    if(planId==='language'&&e.scores?.英語!==undefined)
      e.scores.英語=balancedGrowth(state,'score:英語',e.scores.英語,1);
    else if(planId!=='language'||!('英語' in (e.scores??{})))
      e.skills[skill]=balancedGrowth(state,`skill:${skill}`,e.skills[skill]??0,1);
  }
  results.push(`${plan.name}：${plan.cost.toLocaleString('ja-JP')}円・継続`);
 }
 s.lastMonthIndex=index;s.monthsApplied++;s.lastResults=results;
 return {applied:true,results};
}
export function takeAdultActivity(state,{id}={}){
 if(state.timeline.ageYears<18)return {ok:false,reason:'この活動は18歳から利用できます。'};
 const action=ONE_OFF_ACTIVITIES.find(a=>a.id===id);
 if(!action)return {ok:false,reason:'活動内容が不正です。'};
 const f=state.finances,h=state.health,e=state.education;
 if(f.cash<action.cost)return {ok:false,reason:`${action.cost.toLocaleString('ja-JP')}円の現金が必要です。`};
 let person;
 if(id==='family-dinner')person=familyTarget(state);
 if(id==='friends-outing')person=friendTarget(state);
 if((id==='family-dinner'||id==='friends-outing')&&!person)return {ok:false,reason:'交流できる相手がいません。'};
 f.cash-=action.cost;f.totals.expenses+=action.cost;
 f.ledger.push({year:state.timeline.year,month:state.timeline.month,kind:'支出',label:action.name,amount:-action.cost});
 if(f.ledger.length>600)f.ledger.shift();
 if(id==='gym-class'){h.physical=clamp(h.physical+3);h.energy=clamp(h.energy-2);}
 if(id==='mindfulness'){h.mental=clamp(h.mental+4);if(state.daily54)state.daily54.stress=clamp(state.daily54.stress-3);}
 if(id==='medical-screening'){h.mental=clamp(h.mental+2);}
 if(person)person.relationship=clamp(person.relationship+4);
 if(id==='online-course')e.skills.パソコン=(e.skills.パソコン??0)+Math.min(2,Math.max(0,95-(e.skills.パソコン??0)));
 if(id==='reading-workshop')e.skills.読書=(e.skills.読書??0)+Math.min(2,Math.max(0,95-(e.skills.読書??0)));
 if(id==='job-networking')state.opportunity47.career.interviewPrep=Math.min(6,(state.opportunity47.career.interviewPrep??0)+1);
 return {ok:true,message:`${action.name}を実行しました。費用：${action.cost.toLocaleString('ja-JP')}円。`};
}
