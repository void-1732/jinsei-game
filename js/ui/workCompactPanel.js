/** Compact side-job and entrepreneurship workspace.
 * Existing game actions/finances remain unchanged; only the presentation is grouped.
 */
import {PART_TIME_JOBS,projectLoanSchedule} from '../core/economySystems.js';
import {businessMonthlyFigures} from '../core/careerSystems.js';
import {businessActionsRemaining} from '../core/businessOperations.js';
import {categoryActionAvailable} from '../core/adultActionBudget.js';
import {choiceButtons} from './choiceButtons.js';
import {renderBusinessEquipmentPanel} from './businessEquipmentPanel.js';

const el=(tag,cls='',txt='')=>{const x=document.createElement(tag);if(cls)x.className=cls;x.textContent=txt;return x;};
const yen=n=>`${Math.round(Number(n)||0).toLocaleString('ja-JP')}円`;
const val=(n,s='')=>`${Number(n)||0}${s}`;
const action=(parent,text,fn,disabled=false,scope='business')=>{
 const b=el('button','button button-secondary work-compact-action',text);
 b.type='button';b.disabled=Boolean(disabled);
 b.dataset.actionScope=scope;
 b.addEventListener('click',fn);parent.append(b);return b;
};
const numberInput=(parent,title,value=50000,min=1,max=100000000)=>{
 const label=el('label','work-compact-amount',title);
 const field=el('input','phase5-number');
 field.type='number';field.inputMode='numeric';field.min=String(min);field.max=String(max);
 field.step='1000';field.value=String(value);
 field.setAttribute('aria-label',title);label.append(field);parent.append(label);
 return field;
};
function stats(root,entries){
 const grid=el('div','work-compact-stats');
 for(const [name,value] of entries){
  const cell=el('div','work-compact-stat');
  cell.append(el('small','',name),el('strong','',value));grid.append(cell);
 }
 root.append(grid);return grid;
}
const details=(root,label,cls='work-compact-fold')=>{
 const d=el('details',cls);d.append(el('summary','',label));root.append(d);return d;
};
const row=(root,label,value)=>{
 const r=el('div','work-compact-row');
 r.append(el('span','',label),el('strong','',String(value)));root.append(r);return r;
};
function denseRows(root,entries){
 const grid=el('div','work-compact-rows');
 for(const [key,value] of entries)row(grid,key,value);
 root.append(grid);return grid;
}
const cap=(n,max=12)=>Number.isInteger(n)?Math.max(0,n):0;

/** One selector plus one confirmation, rather than six tall job cards. */
export function renderSideJobWorkspace(section,game,onAction){
 const f=game.finances,s=f.sideJob,age=game.timeline.ageYears;
 section.replaceChildren();
 section.classList.add('work-compact','sidejob-workspace');
 section.append(el('h2','','アルバイト・副業'));
 section.append(el('p','work-compact-note','仕事を選んで「開始・切替」を押すと、翌月以降の月収に反映されます。'));
 const job=PART_TIME_JOBS.find(x=>x.id===s.jobId);
 stats(section,[
  ['現在の副業',s.active?(job?.name??'従来の副業'):'活動なし'],
  ['勤務時間',s.active?`${s.hours??0}時間/月`:'0時間/月'],
  ['副業の月収',yen(s.active?s.monthlyIncome:0)]
 ]);
 const card=el('div','work-compact-card');
 card.append(el('h3','','副業を選ぶ'));
 const options=choiceButtons('働きたい仕事を選択',PART_TIME_JOBS.map(j=>({value:j.id,label:j.name})),job?.id??PART_TIME_JOBS[0].id);
 options.element.classList.add('work-compact-choice');
 const preview=el('p','work-compact-preview');
 const start=action(card,'この仕事を開始・切替',()=>onAction?.('sideJob',{active:true,jobId:options.getValue()}),false,'life');
 const available=categoryActionAvailable(game,'仕事・経営');
 const update=()=>{
  const choice=PART_TIME_JOBS.find(x=>x.id===options.getValue())??PART_TIME_JOBS[0];
  preview.textContent=`月${choice.hours}時間・時給${yen(choice.hourlyWage)}・月収見込${yen(choice.hours*choice.hourlyWage)}`;
  start.disabled=age<18||!available||(s.active&&s.jobId===choice.id);
 };
 options.group.addEventListener('click',update);
 card.insertBefore(options.element,start);card.insertBefore(preview,start);
 update();
 const footer=el('div','work-compact-controls');
 action(footer,'副業を停止',()=>onAction?.('sideJob',{active:false}),!s.active||!available,'life');
 card.append(footer);
 section.append(card);
 section.append(el('p','work-compact-note',age<18?'アルバイト・副業は18歳から選べます。':'勤務と副業を併用できます。収入・税金・生活費は月次計算で反映します。'));
}
let selectedBusinessTab='management';
const TABS=Object.freeze([
 {id:'management',name:'経営・方針'},
 {id:'equipment',name:'設備'},
 {id:'finance',name:'融資・資金'},
 {id:'staff',name:'従業員'},
 {id:'history',name:'履歴・指標'}
]);
function setupTabs(section,contents){
 const nav=el('div','business-compact-tabs');nav.setAttribute('role','tablist');nav.setAttribute('aria-label','経営管理の項目');
 const panes=el('div','business-compact-panes');
 const idPrefix='business-compact-';
 const buttons=new Map(),panels=new Map();
 for(const tab of TABS){
  const b=el('button','business-compact-tab',tab.name);b.type='button';
  b.id=idPrefix+'tab-'+tab.id;b.setAttribute('role','tab');b.setAttribute('aria-controls',idPrefix+'pane-'+tab.id);
  const panel=el('div','business-compact-pane');
  panel.id=idPrefix+'pane-'+tab.id;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',b.id);
  panel.append(contents[tab.id]);
  b.addEventListener('click',()=>select(tab.id));
  nav.append(b);panes.append(panel);buttons.set(tab.id,b);panels.set(tab.id,panel);
 }
 const select=id=>{
  selectedBusinessTab=id;
  for(const [name,b] of buttons){const active=name===id;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;panels.get(name).hidden=!active;}
 };
 nav.addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  const current=TABS.findIndex(t=>t.id===selectedBusinessTab);
  let next=event.key==='Home'?0:event.key==='End'?TABS.length-1:(current+(event.key==='ArrowRight'?1:TABS.length-1))%TABS.length;
  event.preventDefault();select(TABS[next].id);buttons.get(TABS[next].id).focus();
 });
 section.append(nav,panes);select(buttons.has(selectedBusinessTab)?selectedBusinessTab:'management');
}
function monthlyProfit(b,phase){
 const figures=businessMonthlyFigures(b,phase);
 return {...figures,profit:figures.revenue-figures.costs};
}
function managementPane(game,onAction,allowedAdmin,allowedLife,fig){
 const f=game.finances,b=f.business;
 const root=el('section','business-subsection');root.append(el('h3','','経営状況と方針'));
 denseRows(root,[
  ['現在の経営方針',b.policy??'安定'],['社員数',`${b.employees??0}人`],
  ['企業の評判',`${b.reputation??50}点`],['連続赤字',`${b.lossMonths??0}か月`]
 ]);
 const selected=choiceButtons('経営方針',['安定','成長','節約'],b.policy??'安定');
 const control=el('div','work-compact-form');
 control.append(selected.element);
 const change=action(control,'選択した方針を反映',()=>onAction?.('businessPolicy',{policy:selected.getValue()}),false);
 const sync=()=>{change.disabled=!allowedAdmin||selected.getValue()===(b.policy??'安定');};
 selected.group.addEventListener('click',sync);sync();
 root.append(control);
 const actions=el('div','work-compact-controls');
 action(actions,'社員を1人採用',()=>onAction?.('hireEmployee',{}),!allowedAdmin||(b.employees??0)>=20||f.cash<100000);
 action(actions,'休業中の事業を再開',()=>onAction?.('restartBusiness',{}),!allowedAdmin||b.status!=='休業'||(b.operatingCash??0)<100000);
 action(actions,'事業を終了',()=>onAction?.('closeBusiness',{}),!allowedLife,'life');
 root.append(actions);
 const more=details(root,'売上・コストを詳しく見る');
 denseRows(more,[
  ['景気を反映した売上見込',yen(fig.revenue)],['人件費を含む経費見込',yen(fig.costs)],
  ['元の事業売上',yen(b.monthlyRevenue)],['元の事業経費',yen(b.monthlyCosts)],
  ['経費不足の累計',yen(b.operatingDebt)],['事業への累計個人引出し',yen(b.ownerDraws)]
 ]);
 return root;
}
function financePane(game,onAction,allowed){
 const b=game.finances.business,root=el('section','business-subsection');
 root.append(el('h3','','融資・運転資金'));
 denseRows(root,[
  ['融資の残高',yen(b.loanBalance)],['毎月の自動返済',yen(b.monthlyRepayment)],
  ['未払の事業経費',yen(b.operatingDebt)],['延滞',`${b.loanOverdueMonths??0}か月`]
 ]);
 const amountBox=el('div','work-compact-form');
 const amount=numberInput(amountBox,'取引・返済金額（円）',50000);
 const controls=el('div','work-compact-controls');
 const val=()=>Number(amount.value);
 action(controls,'融資を借りる',()=>onAction?.('businessLoan',{amount:val()}),!allowed);
 action(controls,'融資を返済',()=>onAction?.('repayBusinessLoan',{amount:val()}),!allowed||!(b.loanBalance>0));
 action(controls,'月額返済額を設定',()=>onAction?.('setLoanRepayment',{amount:val()}),!allowed||!(b.loanBalance>0));
 action(controls,'自動返済を解除',()=>onAction?.('setLoanRepayment',{amount:0}),!allowed||!(b.monthlyRepayment>0));
 action(controls,'未払金を精算',()=>onAction?.('settleBusinessPayable',{amount:val()}),!allowed||!(b.operatingDebt>0));
 action(controls,'延滞条件を見直す',()=>onAction?.('restructureBusinessDebt',{}),!allowed||!(b.loanOverdueMonths>0));
 action(controls,'個人から資金を追加',()=>onAction?.('businessFunding',{amount:val()}),!allowed);
 action(controls,'資金を個人へ移す',()=>onAction?.('ownerDraw',{amount:val()}),!allowed);
 amountBox.append(controls);root.append(amountBox);
 const active=(b.loanContracts??[]).filter(c=>c.principal>0);
 if(active.length){
  const contracts=details(root,`契約ごとの返済設定（${active.length}件）`);
  for(const c of active){
   const due=c.dueIndex>0?`${Math.floor(c.dueIndex/12)}年${c.dueIndex%12+1}月`:'期限未設定';
   const item=el('div','business-contract');
   item.append(el('strong','',`契約 #${c.id} ／ 残高${yen(c.principal)}`),
     el('p','work-compact-note',`借入額${yen(c.original)}・期限${due}・延滞${c.overdueMonths??0}か月`));
   const target=numberInput(item,'毎月の返済予定額（円）',c.monthlyTarget??10000,0,100000000);
   action(item,'この契約の返済予定を変更',()=>onAction?.('setContractRepayment',{id:c.id,amount:Number(target.value)}),!allowed);
   contracts.append(item);
  }
 }
 const forecast=projectLoanSchedule(b,{year:game.timeline.year,month:game.timeline.month});
 const summary=details(root,'12か月の返済予定・返済実績');
 const rows=el('div','work-compact-table');
 const payments=b.loanPaymentHistory??[];
 row(rows,'翌月の元本返済見込',yen(projectLoanSchedule(b,{year:game.timeline.year,month:game.timeline.month},1).reduce((sum,x)=>sum+x.principal,0)));
 row(rows,'これまでの元本返済額',yen(payments.reduce((sum,x)=>sum+x.amount,0)));
 for(const x of forecast.slice(0,36))row(rows,`${x.year}年${x.month}月 契約#${x.contractId}`,`元本 ${yen(x.principal)}／利息 ${yen(x.interest)}／残り ${yen(x.remaining)}${x.due?'（期限到来）':''}`);
 for(const x of (b.loanScheduleHistory??[]).slice(-12).reverse())
  row(rows,`${x.year}年${x.month}月 契約#${x.contractId}`,`予定 ${yen(x.planned)} ／ 実績 ${yen(x.actual)}`);
 for(const x of payments.slice(-8).reverse())row(rows,`${x.year}年${x.month}月 #${x.contractId} ${x.kind}`,yen(x.amount));
 summary.append(rows);
 const metrics=details(root,'融資の審査・設備価値');
 denseRows(metrics,[
  ['融資信用評価',`${b.creditScore??70}/100点`],['事業融資申請',`${b.loanApplications??0}回`],
  ['支払利息の累計',yen(b.loanInterestPaid)],['設備の帳簿価額',yen(b.equipmentValue)],
  ['設備の累計償却',yen(b.equipmentDepreciation)]
 ]);
 return root;
}
function staffPane(game,onAction,allowed){
 const b=game.finances.business,root=el('section','business-subsection');
 root.append(el('h3','','スタッフ・働く環境'));
 denseRows(root,[['社員数',`${b.staff?.length??0}人`],['評判',`${b.reputation??50}/100点`]]);
 if(b.staff?.length)action(root,'職場環境を改善',()=>onAction?.('staffCare',{}),!allowed);
 const cards=el('div','business-staff-grid');
 for(const staff of b.staff??[]){
  const card=el('div','business-staff-card');
  card.append(el('strong','',staff.name),el('p','work-compact-note',`技能${staff.skill}点・意欲${staff.morale}点・月給${yen(staff.salary)}`));
  const commands=el('div','work-compact-controls');
  action(commands,'研修（3万円）',()=>onAction?.('trainStaff',{staffId:staff.id}),!allowed||game.finances.cash<30000);
  action(commands,'退職処理',()=>onAction?.('dismissStaff',{staffId:staff.id}),!allowed);
  card.append(commands);cards.append(card);
 }
 if(b.staff?.length)root.append(cards);else root.append(el('p','work-compact-note','採用すると、社員の研修・退職・職場改善を管理できます。'));
 const history=details(root,'社員・企業業績の記録');
 for(const x of (b.marketHistory??[]).slice(-3).reverse())
  row(history,`${x.year}年${x.month}月 業績`,`従業員${x.employees}人／平均技能${x.averageSkill}／意欲${x.averageMorale}`);
 for(const x of (b.results??[]).slice(-6).reverse())
  row(history,`${x.year}年${x.month}月 人事`,`従業員${x.employees}人／技能${x.averageSkill}／意欲${x.averageMorale}`);
 return root;
}
function historyPane(game){
 const b=game.finances.business,root=el('section','business-subsection');
 root.append(el('h3','','事業の推移と取引履歴'));
 const recent=(b.cashFlowHistory??[]).slice(-6).reverse();
 if(recent.length){
  const cash=el('div','work-compact-rows');
  for(const x of recent)row(cash,`${x.year}年${x.month}月 ${x.status}`,`売上${yen(x.revenue)} ／ 経費${yen(x.costs)} ／ 利益${yen(x.profit)}`);
  root.append(cash);
 }else root.append(el('p','work-compact-note','月次売上の記録はまだありません。'));
 const history=details(root,'事業口座の取引明細を表示');
 const filter=choiceButtons('取引種別',['すべて','設備','融資','事業','点検・修理'],'すべて');
 history.append(filter.element);
 const query=el('input','phase5-number');query.type='search';query.placeholder='取引名を検索';
 query.setAttribute('aria-label','事業の取引名を検索');
 history.append(query);
 const results=el('div','work-compact-table');
 const update=()=>{
  results.replaceChildren();
  const type=filter.getValue(),search=query.value.trim();
  const list=(b.businessLedger??[]).filter(x=>
   (!search||x.label.includes(search))&&(type==='すべて'||
    (type==='設備'&&x.label.includes('設備'))||
    (type==='融資'&&/融資|契約|返済|利息/.test(x.label))||
    (type==='事業'&&/事業売上|事業経費|事業主/.test(x.label))||
    (type==='点検・修理'&&/点検|修理|故障/.test(x.label))));
  for(const x of list.slice(-12).reverse())row(results,`${x.year}年${x.month}月 ${x.label}`,yen(x.amount));
  if(!list.length)results.append(el('p','work-compact-note','条件に一致する履歴はありません。'));
 };
 filter.group.addEventListener('click',update);query.addEventListener('input',update);update();
 history.append(results);
 return root;
}
export function renderBusinessWorkspace(section,game,onAction){
 const f=game.finances,b=f.business,age=game.timeline.ageYears,phase=game.world?.phase??'通常';
 section.replaceChildren();section.classList.add('work-compact','business-compact','business-focused');
 section.append(el('h2','','起業・経営'));
 const top=el('div','business-compact-status');
 top.append(el('strong','',b.active?`${b.name??'個人事業'} ／ ${b.status??'営業中'}`:'まだ起業していません'));
 const adminRemaining=businessActionsRemaining(game);
 top.append(el('span','',`事業管理 ${adminRemaining}/3回`));section.append(top);
 if(!b.active){
  section.append(el('p','work-compact-note',age<20?'事業を開始できるのは20歳からです。':'起業には30万円が必要です。事業収支・社員・設備・融資を一か所で管理できます。'));
  const start=el('div','work-compact-controls');
  action(start,'30万円で事業を開始',()=>onAction?.('startBusiness',{}),age<20||f.cash<300000||!categoryActionAvailable(game,'仕事・経営'),'life');
  section.append(start);return;
 }
 const figures=monthlyProfit(b,phase);
 stats(section,[
  ['売上見込／月',yen(figures.revenue)],['経費見込／月',yen(figures.costs)],
  ['利益見込／月',yen(figures.profit)],['運転資金',yen(b.operatingCash)],
  ['事業融資の残高',yen(b.loanBalance)],['設備・社員',`${b.equipmentItems?.length??0}台／${b.staff?.length??0}人`]
 ]);
 const alerts=[];
 if(b.status==='休業')alerts.push('現在は休業中です。経営タブから再開できます。');
 if((b.operatingDebt??0)>0)alerts.push(`未払の事業経費 ${yen(b.operatingDebt)}`);
 if((b.loanOverdueMonths??0)>0)alerts.push(`融資の延滞 ${b.loanOverdueMonths}か月`);
 if(alerts.length)section.append(el('p','business-compact-alert',alerts.join(' ／ ')));
 const allowedAdmin=adminRemaining>0;
 const allowedLife=categoryActionAvailable(game,'仕事・経営');
 const equipment=el('section','business-subsection');
 renderBusinessEquipmentPanel(equipment,b,onAction,phase,allowedAdmin);
 setupTabs(section,{
  management:managementPane(game,onAction,allowedAdmin,allowedLife,figures),
  equipment,
  finance:financePane(game,onAction,allowedAdmin),
  staff:staffPane(game,onAction,allowedAdmin),
  history:historyPane(game)
 });
 section.append(el('p','work-compact-note','売上・経費・返済額はゲーム内の架空モデルです。設備・融資・人事の事業管理は通常の自由行動とは別に1ターン最大3回です。'));
}
