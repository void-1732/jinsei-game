/** STEP 47: a single compact status card for education, work and economy.
 * Primary actions remain in the shared one-action-per-turn selector above.
 */
import {createOpportunityProgress,opportunityOptions} from '../core/opportunitySystems.js';
const el=(tag,cls='',text='')=>{const node=document.createElement(tag);node.className=cls;node.textContent=text;return node;};
const yen=n=>Math.round(n??0).toLocaleString('ja-JP')+'円';
export function renderOpportunityPanel(state,category){
 if(!state?.initialized||!['学業','仕事・経営','生活・資産'].includes(category))return null;
 const p=state.opportunity47??createOpportunityProgress(),e=p.education,c=p.career,f=state.finances;
 const box=el('section','opportunity-panel');
 box.append(el('div','opportunity-eyebrow','STEP 47 · これまでの選択が将来に影響'));
 const title=category==='学業'?'進学と学費の見通し':category==='仕事・経営'?'仕事とキャリアの見通し':'家計・負債の見通し';
 box.append(el('h3','',title));
 const dl=el('dl','opportunity-facts');
 const row=(key,value)=>{const item=el('div','');item.append(el('dt','',key),el('dd','',value));dl.append(item);};
 if(category==='学業'){
  row('学校・進路',`${state.education.stage}・${state.education.school||'未定'}`);
  row('奨学金',e.scholarship==='採用'?`採用（毎月${yen(e.grantMonthly)}）`:e.scholarship);
  row('学費補助の累計',yen(e.scholarshipPaid));
  row('大学の学費',`毎月${yen(36_000)}（在学中）`);
  row('学費の支払い方法',e.funding==='loan'?'教育ローン':'現金優先・不足分は未払い');
  row('教育費の残債',yen(e.loanBalance+e.unpaidTuition));
 }else if(category==='仕事・経営'){
  row('現在の仕事',f.career.job??'求職中');
  row('月額給与',yen(f.career.monthlySalary));
  row('面接の準備',`${c.interviewPrep}/6`);
  row('技能・実績',`${c.portfolio}/12`);
  row('今までの応募',String(f.career.applications?.length??0)+'回');
 }else{
  row('現金',yen(f.cash));
  row('毎月の生活費',yen(f.monthlyBudget));
  row('全体の負債',yen(f.debt));
  row('うち教育費',yen(e.loanBalance+e.unpaidTuition));
  row('教育費の返済済額',yen(e.repayTotal));
 }
 box.append(dl);
 const actions=opportunityOptions(state,category);
 const pending=state.pendingEvents.some(e=>e.type==='choice');
 const used=state.turnActions?.turn===state.timeline.turnsElapsed&&state.turnActions.used>=1;
 const guidance=pending?'先に「次のターンへ進む」から人生イベントを選択してください。':used?'今のターンの自由行動は実行済みです。次のターンで新しい行動を選べます。':actions.length?`このカテゴリで選べる進路・仕事・家計の判断は${actions.length}件です。上の行動欄から1件選べます。`:'新しい選択は条件を満たしたときに表示されます。人生イベントも将来の選択肢に影響します。';
 box.append(el('p','opportunity-guidance',guidance));
 if(p.history.length){const last=p.history.at(-1);box.append(el('p','opportunity-last',`最近の決断：${last.title}（${last.year}年${last.month}月）`));}
 return box;
}
