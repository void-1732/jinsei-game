/** U4: one compact personal balance-sheet and fixed-cost outlook. */
import {assetOverview} from '../core/assetOverview.js';
import {choiceButtons} from './choiceButtons.js';
const el=(name,klass='',text='')=>{const x=document.createElement(name);x.className=klass;x.textContent=text;return x;};
const yen=n=>`${Math.round(n||0).toLocaleString('ja-JP')}円`;
function item(root,title,value){
 const cell=el('div','asset-pulse-item');
 cell.append(el('small','',title),el('strong','',value));root.append(cell);
}
function group(root,title,rows){
 const details=el('details','asset-pulse-fold');
 details.append(el('summary','',title));
 const grid=el('div','asset-pulse-rows');
 for(const [name,value] of rows){
  const row=el('div','asset-pulse-row');
  row.append(el('span','',name),el('strong','',value));grid.append(row);
 }
 details.append(grid);root.append(details);return details;
}
export function renderAssetPulse(section,state,onAction){
 const f=state.finances,o=assetOverview(state),monthly=o.monthly;
 section.replaceChildren();section.classList.add('asset-pulse');
 section.append(el('h2','','家計と資産のまとめ'));
 section.append(el('p','asset-pulse-hint','資産・ローン・毎月の収支をここでまとめて確認できます。詳しい取引は既存の各画面から操作できます。'));
 const metrics=el('div','asset-pulse-metrics');
 for(const [name,value] of [
  ['現金',yen(o.cash)],['投資',yen(o.investment)],
  ['不動産',`${o.propertyCount}件・${yen(o.propertyValue)}`],
  ['車',`${o.vehicleCount}台・${yen(o.vehicleValue)}`],
  ['負債合計',yen(o.debts)],['純資産',yen(o.netWorth)]
 ])item(metrics,name,value);
 section.append(metrics);
 if(monthly.available){
  const flow=el('div','asset-pulse-flow');
  for(const [name,value] of [
   ['月の収入見込',monthly.income],['月の固定支出見込',monthly.outflow],['月の差額見込',monthly.net]
  ])item(flow,name,yen(value));
  section.append(flow);
  const forecast=el('div','asset-pulse-forecast');
  forecast.append(el('h3','','将来の現金残高（固定条件の概算）'));
  const periods=choiceButtons('予測する期間',[
   {value:1,label:'1か月先'},{value:3,label:'3か月先'},{value:12,label:'1年先'}
  ],3);
  const result=el('strong','asset-pulse-result');
  const summary=el('p','asset-pulse-hint');
  const refresh=()=>{
   const row=monthly.forecast.find(x=>x.months===periods.getValue());
   const shortfall=row.balance<0;
   result.textContent=yen(row.balance);
   result.classList.toggle('negative',shortfall);
   summary.textContent=shortfall?'今の固定条件のままだと資金不足になる可能性があります。':'今の収入と固定費が維持される場合の残高です。';
  };
  periods.group.addEventListener('click',refresh);
  forecast.append(periods.element,result,summary);refresh();section.append(forecast);
  group(section,'毎月の収入の内訳',monthly.incomes.map(([k,v])=>[k,yen(v)]));
  group(section,'固定費・返済の内訳',monthly.parts.map(x=>[x.label,yen(x.amount)]));
  if(monthly.runway!==null&&monthly.runway<12)
   section.append(el('p','asset-pulse-warning',`資金余力：約${monthly.runway}か月分（固定条件で計算）`));
  section.append(el('p','asset-pulse-disclaimer',monthly.assumptions));
 }else section.append(el('p','asset-pulse-hint','18歳以降に月次の収入・支出の予測を表示します。'));
 const editor=el('details','asset-pulse-fold');
 editor.append(el('summary','','家計の設定・累計記録'));
 const box=el('div','asset-pulse-budget');
 const label=el('label','', '毎月の基本生活費（円）');
 const field=el('input','phase5-number');
 field.type='number';field.inputMode='numeric';field.min='60000';field.max='100000000';
 field.step='1000';field.value=String(f.monthlyBudget);
 field.setAttribute('aria-label','毎月の基本生活費（円）');
 label.append(field);
 const button=el('button','button button-secondary','生活費を変更');
 button.type='button';
 button.addEventListener('click',()=>onAction?.('setBudget',{amount:Number(field.value)}));
 box.append(label,button);
 editor.append(box);
 const totals=el('div','asset-pulse-rows');
 for(const [k,v] of [['これまでの収入',f.totals.income],['これまでの支出',f.totals.expenses],['税・社会保険相当の累計',f.totals.tax]]){
  const row=el('div','asset-pulse-row');row.append(el('span','',k),el('strong','',yen(v)));totals.append(row);
 }
 editor.append(totals);section.append(editor);
 const navigate=el('p','asset-pulse-hint','住宅や車の売買、投資、任意の返済額設定、取引明細などの個別操作は、上部の「住まい・車」「投資」「借入・返済」「履歴」から引き続き利用できます。');
 section.append(navigate);
}
