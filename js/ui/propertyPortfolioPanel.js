/** Compact real estate portfolio UI with fictional registration records. */
import {REGIONS,HOME_OPTIONS} from '../core/livingSystems.js';
import {propertyCount,propertyPrice,portfolioTotals} from '../core/propertyPortfolio.js';
import {choiceButtons} from './choiceButtons.js';
const el=(tag,cls='',value='')=>{const x=document.createElement(tag);x.className=cls;x.textContent=value;return x;};
const yen=n=>`${Number(n??0).toLocaleString('ja-JP')}円`;
let selectedPropertyId=null;
function command(root,title,fn,disabled=false){const b=el('button','button button-secondary',title);b.type='button';b.disabled=disabled;b.addEventListener('click',fn);root.append(b);return b;}
function money(root,label,value,min=1,max=100000000){
 const w=el('label','asset-money-label',label),i=el('input','phase5-number');
 i.type='number';i.inputMode='numeric';i.step='1000';i.min=String(min);i.max=String(max);i.value=String(value);
 w.append(i);root.append(w);return i;
}
export function renderPropertyPortfolio(panel,game,onAction){
 const living=game.finances.living,properties=living.properties??[],cash=game.finances.cash;
 const root=el('section','asset-portfolio');
 root.append(el('h3','','所有不動産・ゲーム内登記台帳'));
 const totals=portfolioTotals(living);
 root.append(el('p','muted small',`所有${propertyCount(living)}/5件 ／ 追加物件評価${yen(totals.assetValue)} ／ 追加ローン残高${yen(totals.loanBalance)}`));
 if(living.housing==='持ち家'){
  const main=el('div','asset-registration-card');
  main.append(el('strong','','現在の自宅'),el('p','muted small',`地域：${living.region} ／ 評価額：${yen(living.propertyValue)} ／ ローン：${yen(living.mortgageBalance)}`));
  main.append(el('p','muted small',living.primaryRegistration?.registryId?
   `登記番号：${living.primaryRegistration.registryId}（ゲーム内のみ）`:'旧セーブからの住宅：ゲーム内登記を作成できます'));
  if(!living.primaryRegistration)command(main,'自宅をゲーム内登記',()=>onAction?.('registerHome',{}));
  root.append(main);
 }
 const details=el('div','asset-property-details');
 if(properties.length){
  const initial=properties.some(p=>p.id===selectedPropertyId)?selectedPropertyId:properties[0].id;
  const choice=choiceButtons('管理する物件を選ぶ',properties.map(p=>({value:p.id,label:`#${p.id} ${p.region}`})),initial,id=>{selectedPropertyId=id;show(id);});
  root.append(choice.element);
  const show=(id)=>{
   const p=properties.find(x=>x.id===id);
   details.replaceChildren();if(!p)return;
   details.append(el('h4','',`物件 #${p.id}：${HOME_OPTIONS.find(x=>x.id===p.homeType)?.name??'住宅'}`));
   const stats=el('div','asset-property-stats');
   for(const [key,value] of [['登記番号',p.registration.registryId],['用途',p.use],['取得価格',yen(p.acquisitionPrice)],['現在評価額',yen(p.value)],['ローン残高',yen(p.loanBalance)],['月額返済',yen(p.loanPayment)],['月額維持費',yen(p.monthlyCost)],['賃料収入見込',p.use==='賃貸運用'?yen(p.rentIncome):'なし'],['延滞残高',yen(p.arrears)]]){
    const box=el('div','asset-property-fact');box.append(el('small','',key),el('strong','',value));stats.append(box);
   }details.append(stats);
   details.append(el('p','muted small',`所有者：${p.registration.owner} ／ 登録：${p.registration.registeredYear}年${p.registration.registeredMonth}月（ゲーム内台帳）`));
   const controls=el('div','asset-action-row');
   const use=choiceButtons('用途の切り替え',['賃貸運用','別荘'],p.use);
   controls.append(use.element);
   command(controls,'用途を変更',()=>onAction?.('setPropertyUse',{id:p.id,use:use.getValue()}),p.use===use.getValue()&&false);
   if(p.loanBalance>0){
    const monthly=money(controls,'毎月の返済額を指定（円）',p.loanPayment,1,1000000);
    command(controls,'月額返済を変更',()=>onAction?.('setPropertyPayment',{id:p.id,amount:Number(monthly.value)}));
    const repayment=money(controls,'繰上返済額を自由に指定（円）',Math.min(50000,p.loanBalance),1,p.loanBalance);
    command(controls,'指定額を繰上返済',()=>onAction?.('repayPropertyLoan',{id:p.id,amount:Number(repayment.value)}),cash<=0);
   }
   if(p.arrears>0){
    const amount=money(controls,'延滞清算額（円）',Math.min(p.arrears,10000),1,p.arrears);
    command(controls,'延滞を清算',()=>onAction?.('clearPropertyArrears',{id:p.id,amount:Number(amount.value)}),cash<=0);
   }
   command(controls,'この物件を売却',()=>onAction?.('sellProperty',{id:p.id}),Math.floor(p.value*.9)<p.loanBalance+p.arrears);
   details.append(controls);
  };
  show(initial);
 }else root.append(el('p','muted small','追加物件はありません。居住用の家とは別に、賃貸運用や別荘を所有できます。'));
 root.append(details);
 const buy=el('details','asset-purchase');
 buy.append(el('summary','','不動産を購入する（現金・住宅ローン）'));
 const form=el('div','asset-purchase-form');
 const region=choiceButtons('購入地域',REGIONS.map(x=>x.name),living.region);
 const kind=choiceButtons('物件タイプ',HOME_OPTIONS.map(x=>({value:x.id,label:x.name})),'standard');
 const use=choiceButtons('用途',['賃貸運用','別荘'],'賃貸運用');
 const financing=choiceButtons('支払い方法',[{value:'cash',label:'現金一括'},{value:'loan',label:'ローン（頭金20%）'}],'cash');
 form.append(region.element,kind.element,use.element,financing.element);
 const preview=el('p','muted small');
 const refresh=()=>{const price=propertyPrice(region.getValue(),kind.getValue());preview.textContent=`参考価格：${yen(price)} ／ 諸費用：${yen(Math.floor(price*.03))} ／ 選択した支払いの初期必要額：${yen(Math.floor(price*.03)+(financing.getValue()==='loan'?Math.ceil(price*.2):price))}`;};
 form.addEventListener('click',refresh);refresh();form.append(preview);
 command(form,'この条件で購入',()=>onAction?.('buyProperty',{region:region.getValue(),homeType:kind.getValue(),use:use.getValue(),loan:financing.getValue()==='loan'}),propertyCount(living)>=5);
 buy.append(form);root.append(buy);
 root.append(el('p','muted small','登録番号・所有権・賃料はゲーム内の管理情報です。実際の不動産登記・不動産取引を行いません。賃料は架空モデルで毎月精算します。'));
 panel.append(root);
}
