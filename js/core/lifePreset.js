/** One-time household plan bundle: reuses existing monthly effects and costs. */
import {MONTHLY_PLANS,ensureMonthlyRoutines} from './monthlyRoutines.js';
import {TIME_PLANS,ensureDailySchedule} from './dailySchedule.js';
export const LIFE_PRESETS=Object.freeze([
 {id:'balanced',name:'無理なく続ける',schedule:'balanced',health:'walks',learning:'reading',note:'運動・読書を継続。仕事と家族の時間を残す'},
 {id:'career',name:'仕事と家計を優先',schedule:'career',health:'walks',learning:'online',note:'仕事と技能を伸ばす。疲労には注意'},
 {id:'learning',name:'学びを優先',schedule:'learning',health:'walks',learning:'language',note:'学習に時間を割く。受講費が毎月かかる'},
 {id:'health',name:'健康を優先',schedule:'rest',health:'gym',learning:'off',note:'休息と健康を優先。習い事の費用がかかる'},
 ]);
export function lifePresetSummary(state){
 const p=state?.monthlyRoutines?.plans??{},schedule=state?.daily54?.planId;
 const current=LIFE_PRESETS.find(x=>x.schedule===schedule&&x.health===p.health&&x.learning===p.learning)??null;
 return {current,monthlyCost:((MONTHLY_PLANS.health.find(x=>x.id===p.health)?.cost??0)+(MONTHLY_PLANS.learning.find(x=>x.id===p.learning)?.cost??0))};
}
export function configureLifePreset(state,{presetId}={}){
 if(state.timeline.ageYears<18)return {ok:false,reason:'生活方針の一括設定は18歳から利用できます。'};
 const preset=LIFE_PRESETS.find(p=>p.id===presetId);
 if(!preset)return {ok:false,reason:'生活方針を選択してください。'};
 const schedule=ensureDailySchedule(state),routines=ensureMonthlyRoutines(state);
 if(schedule.planId===preset.schedule&&routines.plans.health===preset.health&&routines.plans.learning===preset.learning)
  return {ok:false,reason:'この生活方針はすでに設定されています。'};
 if(!TIME_PLANS.some(p=>p.id===preset.schedule))return {ok:false,reason:'生活時間の設定が不正です。'};
 schedule.planId=preset.schedule;
 routines.plans.health=preset.health;routines.plans.learning=preset.learning;
 const healthCost=MONTHLY_PLANS.health.find(p=>p.id===preset.health).cost;
 const learningCost=MONTHLY_PLANS.learning.find(p=>p.id===preset.learning).cost;
 // Do not silently change who receives family calls; user picks that person independently.
 return {ok:true,message:`生活方針を「${preset.name}」に設定。健康・学びの習慣を毎月継続（合計月${(healthCost+learningCost).toLocaleString('ja-JP')}円、資金不足なら保留）。家族への連絡相手は変更しません。`};
}
