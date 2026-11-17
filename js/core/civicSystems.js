/** Local community simulation (fictional): persistent reputation and deterministic policy shifts. */
export const CIVIC_ACTIVITIES=Object.freeze([
 {id:'volunteer',name:'地域のボランティア',cost:1200,gain:5,energy:2,age:12},
 {id:'neighborhood',name:'地域行事へ参加',cost:2500,gain:4,energy:1,age:6},
 {id:'publicMeeting',name:'地域の意見交換会',cost:0,gain:3,energy:1,age:18},
 {id:'vote',name:'選挙に投票する（架空制度）',cost:0,gain:2,energy:0,age:18}
]);
const clamp=v=>Math.max(0,Math.min(100,Math.round(v)));
const monthKey=d=>d.year*12+d.month-1;
export function createCivicProgress(){return {reputation:40,participations:0,lastActivityIndex:-1,policyMonth:-1,policy:'標準',history:[]};}
export function ensureCivicProgress(state){state.world.civicProgress??=createCivicProgress();return state.world.civicProgress;}
export function validateCivicProgress(x){
 if(x===undefined)return true;
 if(!x||typeof x!=='object'||Array.isArray(x))return false;
 return Number.isInteger(x.reputation)&&x.reputation>=0&&x.reputation<=100&&Number.isInteger(x.participations)&&x.participations>=0&&x.participations<=10000&&
 Number.isInteger(x.lastActivityIndex)&&x.lastActivityIndex>=-1&&x.lastActivityIndex<=26412&&Number.isInteger(x.policyMonth)&&x.policyMonth>=-1&&x.policyMonth<=26412&&
 ['標準','地域支援','公共投資','支出抑制'].includes(x.policy)&&Array.isArray(x.history)&&x.history.length<=24&&x.history.every(e=>e&&Number.isInteger(e.year)&&e.year>=2000&&e.year<=2200&&Number.isInteger(e.month)&&e.month>=1&&e.month<=12&&typeof e.label==='string'&&e.label.length<=80);
}
export function civicAction(state,{id}={}){
 const option=CIVIC_ACTIVITIES.find(a=>a.id===id);
 if(!option)return {ok:false,reason:'地域活動を選択してください。'};
 if(state.timeline.ageYears<option.age)return {ok:false,reason:`${option.age}歳から参加できます。`};
 const p=ensureCivicProgress(state),idx=monthKey(state.timeline);
 if(p.lastActivityIndex===idx)return {ok:false,reason:'地域活動は月に1件までです。'};
 if(state.finances.cash<option.cost)return {ok:false,reason:'参加費用が不足しています。'};
 if(option.id==='vote'&&state.timeline.year%4!==0)return {ok:false,reason:'このゲームの架空選挙は4年ごとに開催します。'};
 state.finances.cash-=option.cost;
 state.finances.totals.expenses+=option.cost;
 if(option.cost){
  state.finances.ledger.push({year:state.timeline.year,month:state.timeline.month,kind:'支出',label:option.name,amount:-option.cost});
  if(state.finances.ledger.length>600)state.finances.ledger.shift();
 }
 state.health.energy=clamp(state.health.energy-option.energy);
 p.reputation=clamp(p.reputation+option.gain);
 p.participations++;p.lastActivityIndex=idx;
 p.history.unshift({year:state.timeline.year,month:state.timeline.month,label:option.name});
 if(p.history.length>24)p.history.length=24;
 return {ok:true,message:`${option.name}に参加。地域での信頼 ${p.reputation}/100。`};
}
export function communityEffects(state){
 const p=state?.world?.civicProgress;
 const employment=state?.world?.employmentIndex??100;
 const price=state?.world?.priceIndex??100;
 const region=state?.finances?.living?.region??'東京・東京23区';
 const regionIndex=[...region].reduce((a,c)=>a+c.charCodeAt(0),0);
 const policy=p?.policy??'標準';
 const support=policy==='地域支援'?0.98:policy==='公共投資'?1.01:policy==='支出抑制'?1.02:1;
 const jobBonus=Math.min(4,Math.floor(Math.max(0,(p?.reputation??40)-40)/15));
 return {policy,priceIndex:price,employmentIndex:employment,reputation:p?.reputation??40,
  livingFactor:support,jobBonus,regionIndex};
}
export function advanceCivicMonth(state,date){
 if(!state?.initialized)return [];
 const p=ensureCivicProgress(state),idx=monthKey(date),out=[];
 if(date.month===4&&p.policyMonth!==idx){
  const cycle=(date.year+communityEffects(state).regionIndex)%3;
  p.policy=['地域支援','公共投資','支出抑制'][cycle];
  p.policyMonth=idx;
  out.push({type:'society',title:'地域の制度変更（架空）',description:`${state.finances.living?.region??'地域'}の施策が「${p.policy}」へ。生活費・採用環境に小さく影響します。`});
 }
 if(date.month===12&&p.lastActivityIndex<idx-11&&p.reputation>40)p.reputation--;
 return out;
}
