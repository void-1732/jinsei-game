/** Fictional automatic household spending model. Existing saves retain monthlyBudget for compatibility. */
import {REGIONAL_FACTORS} from './livingSystems.js';
import {communityEffects} from './civicSystems.js';
export const SPENDING_STYLES=Object.freeze([
 {id:'standard',name:'標準',factor:1,note:'必要な支出を確保。健康への追加ペナルティなし'},
 {id:'saving',name:'節約',factor:0.82,note:'生活費を18%削減。継続すると食生活・休養に負担が生じる'},
 {id:'comfort',name:'ゆとり',factor:1.12,note:'生活費を12%増加。こころの負担を緩やかに軽減'}
]);
const styleFor=state=>SPENDING_STYLES.find(x=>x.id===state?.finances?.spendingStyle)??SPENDING_STYLES[0];
const ageAt=(state,date)=>date.year-state.player.birth.year-(date.month<state.player.birth.month?1:0);
/** Child-rearing and established cohabitation expenses are charged by familyJourney; never charge them twice. */
export function baseHouseholdBudget(state,date=state.timeline){
 if(!state?.initialized)return 0;
 const age=ageAt(state,date);
 if(age<18)return 0;
 const housing=state.finances?.living?.housing??'実家';
 let base=age<23?82000:age<30?90000:age<65?100000:86000;
 if(housing==='実家')base=age<25?48000:62000;
 const partner=state.people?.find(x=>x.role==='配偶者');
 const cohabiting=Boolean(state.familyJourney?.partnership?.cohabitingSince>=0);
 // A married couple without an explicit cohabitation plan still shares daily household costs.
 if(partner&&!cohabiting)base+=16000;
 return base;
}
export function spendingPreview(state,date=state?.timeline){
 const age=state?.initialized?ageAt(state,date):0;
 const base=baseHouseholdBudget(state,date);
 const region=state?.finances?.living?.region??'東京・東京23区';
 const regionFactor=REGIONAL_FACTORS[region]?.living??1;
 const style=styleFor(state);
 const adjusted=Math.max(0,Math.round(base*style.factor*regionFactor*communityEffects(state).livingFactor));
 return {age,base,region,regionFactor,style,adjusted,
  housingCost:state?.finances?.living?.monthlyHousingCost??0,
  note:age<18?'18歳未満の基本生活費は保護者負担。育児費は保護者側に計上します。':'子どもの養育・教育費、同棲費、家賃・ローン等は既存の別会計で加算します。'};
}
export function setSpendingStyle(state,{styleId}={}){
 const style=SPENDING_STYLES.find(x=>x.id===styleId);
 if(!style)return {ok:false,reason:'お金の使い方が不正です。'};
 if(state.timeline.ageYears<18)return {ok:false,reason:'家計方針は18歳から変更できます。'};
 if(styleFor(state).id===style.id)return {ok:false,reason:'すでに選択している家計方針です。'};
 state.finances.spendingStyle=style.id;
 state.finances.monthlyBudget=Math.round(baseHouseholdBudget(state)*style.factor);
 return {ok:true,message:`「${style.name}」を継続設定しました。翌月以降の基本生活費と健康に影響します。`};
}
export function refreshAutomaticBudget(state,date){
 if(!state?.initialized||!state.finances)return 0;
 const monthly=Math.round(baseHouseholdBudget(state,date)*styleFor(state).factor*communityEffects(state).livingFactor);
 state.finances.monthlyBudget=monthly;
 return monthly;
}
const clamp=n=>Math.max(0,Math.min(100,Math.round(n)));
export function applySpendingHealthImpact(state,date){
 if(!state?.initialized||ageAt(state,date)<18)return;
 const mode=styleFor(state).id,index=date.year*12+date.month;
 const health=state.health;
 if(mode==='saving'){
  if(index%2===0){health.physical=clamp(health.physical-1);health.energy=clamp(health.energy-1);}
  if(index%3===0)health.mental=clamp(health.mental-1);
 }else if(mode==='comfort'&&index%3===0&&state.finances.debt<100000){
  health.mental=clamp(health.mental+1);
 }
}
