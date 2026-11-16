/** U5: Ranked, explainable, read-only life advice.
 * Never performs actions automatically and never changes game balances.
 */
import {cashflowBaseline,assetOverview} from './assetOverview.js';
import {categoryActionAvailable,actionBudget} from './adultActionBudget.js';
const make=(id,title,description,destination,category,level='info')=>({id,title,description,destination,category,level});
export function lifeGuidance(state){
 if(!state?.initialized||state.ending?.dead)return {warnings:[],suggestions:[],remaining:0};
 const age=state.timeline.ageYears,f=state.finances,h=state.health;
 const budget=actionBudget(state),monthly=cashflowBaseline(state),wealth=assetOverview(state);
 const warnings=[],suggestions=[];
 if(h.illness)warnings.push(make('illness','体調不良が続いています','健康画面で治療や休養の選択肢を確認できます。','HEALTH-01','健康','high'));
 if(h.physical<=35||h.mental<=30)warnings.push(make('health-low','健康の状態に注意',`体力${h.physical}・こころ${h.mental}。休養・治療・毎月の習慣を見直しましょう。`,'HEALTH-01','健康','high'));
 if(age>=18&&age<65&&!f.career.job)warnings.push(make('unemployed','現在は仕事についていません','求人・就職準備を確認し、収入を確保する方法を検討できます。','WORK-01','仕事・経営','high'));
 if(age>=18&&monthly.available&&monthly.outflow>0&&monthly.liquidCash<monthly.outflow*2)
  warnings.push(make('cash-low','現金の余裕が少なくなっています',`現在の現金は${Math.round(monthly.liquidCash).toLocaleString('ja-JP')}円。固定支出の概算約${Math.round(monthly.outflow).toLocaleString('ja-JP')}円／月です。`,'LIFE-03','生活・資産','high'));
 if(age>=18&&monthly.available&&monthly.net<0)
  warnings.push(make('negative-flow','今の設定では毎月の家計が赤字見込み',`固定条件の概算で月${Math.abs(monthly.net).toLocaleString('ja-JP')}円の不足。支出や返済計画を確認してください。`,'LIFE-03','生活・資産','high'));
 if(age>=18&&(f.living?.mortgageArrears>0||(f.living?.properties??[]).some(p=>p.arrears>0)||f.business?.loanOverdueMonths>0))
  warnings.push(make('arrears','ローンの延滞を確認してください','自宅・投資物件・事業の返済条件と延滞残高を確認しましょう。','LIFE-06','生活・資産','high'));
 if(age<15)suggestions.push(make('child-study','得意なことを育てる','学習や技能、運動から今月の成長につながる行動を選べます。','EDU-03','学業'));
 else if(age<18)suggestions.push(make('future-study','進路・資格の準備','成績、進学条件、学習目標を確認しましょう。','EDU-04','学業'));
 else if(!f.career.job)suggestions.push(make('job-search','採用条件を比較する','求人の応募条件を確認できます。候補の比較は就職画面で行えます。','WORK-01','仕事・経営'));
 else if((f.career.experience??0)>=12)suggestions.push(make('career-review','キャリアの次の段階を考える','勤続経験を生かし、昇進・資格・勤務方針を確認できます。','WORK-02','仕事・経営'));
 else suggestions.push(make('career-start','仕事と副業の両立を考える','勤務経験と生活の余裕を確認して、副業や職場の方針を選べます。','WORK-03','仕事・経営'));
 if(age>=18&&wealth?.debts>0)suggestions.push(make('debt-review','返済計画を見直す','ローン残高と毎月の支払額を比較できます。','LIFE-03','生活・資産'));
 else if(age>=18)suggestions.push(make('household-review','将来の家計収支を確認','資産・固定費・1年先までの概算を1か所で確認できます。','LIFE-03','生活・資産'));
 if(age>=18&&(h.physical<=65||h.mental<=60))suggestions.push(make('monthly-health','毎月の健康習慣を整える','ウォーキング・ジム・心のケアなどの継続プランを選べます。','HEALTH-01','健康'));
 if(age>=18&&state.people.some(p=>p.role==='配偶者'||p.role==='子'))suggestions.push(make('family-time','家族との時間を確保','家族との交流や毎月の食事計画を確認できます。','PERSON-01','人物・家族'));
 return {
  warnings:warnings.slice(0,5),
  suggestions:suggestions.filter(s=>!warnings.some(w=>w.destination===s.destination)).slice(0,2)
    .map(s=>({...s,canAct:categoryActionAvailable(state,s.category)})),
  remaining:budget.remaining,
  pending:budget.pending,
 };
}
