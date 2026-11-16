/** One equipment selector and one action area, regardless of fleet size. */
import {choiceButtons} from './choiceButtons.js';
import {EQUIPMENT_TYPES,estimateEquipmentReturns} from '../core/economySystems.js';
const el=(tag,klass='',text='')=>{const x=document.createElement(tag);x.className=klass;x.textContent=text;return x;};
const yen=n=>`${Number(n??0).toLocaleString('ja-JP')}円`;
let lastSelectedEquipmentId=null;
const button=(root,text,fn,disabled=false)=>{
 const b=el('button','button button-secondary phase5-action',text);
 b.type='button';b.disabled=disabled;b.dataset.actionScope='business';
 b.addEventListener('click',fn);root.append(b);return b;
};
export function renderBusinessEquipmentPanel(root,b,onAction,worldPhase='通常',allowOperations=true){
 const operate=(parent,text,fn,disabled=false)=>button(parent,text,fn,disabled||!allowOperations);
 const box=el('section','business-equipment-panel');
 box.append(el('h3','','設備管理'));
 const items=b.equipmentItems??[],funds=b.operatingCash??0;
 const active=items.filter(x=>!x.broken&&!(x.repairMonths>0)).length;
 const summary=el('p','business-equipment-summary',`${items.length}台保有 ／ 稼働${active}台 ／ 故障・修理中${items.length-active}台 ／ 設備評価額${yen(b.equipmentValue)} ／ 事業資金${yen(funds)}`);
 box.append(summary);
 const activity=el('p','muted small','対象の設備を1台選ぶと、状態と必要な操作だけを表示します。事業管理は1ターンに最大3回です。');
 box.append(activity);
 const selector=el('div','business-equipment-selector');
 const detail=el('div','business-equipment-details');
 if(items.length){
  const initial=items.some(x=>x.id===lastSelectedEquipmentId)?lastSelectedEquipmentId:items[0].id;
  const choices=choiceButtons('対象設備を選択',items.map(x=>({value:x.id,label:`#${x.id} ${x.name}${x.broken?'（故障）':''}`})),initial,id=>{lastSelectedEquipmentId=id;show(id);});
  choices.element.classList.add('business-machine-choice');
  selector.append(choices.element);
  const returns=estimateEquipmentReturns(b,worldPhase);
  function show(id){
   const item=items.find(x=>x.id===id);
   detail.replaceChildren();
   if(!item)return;
   const status=item.repairMonths>0?'修理中・翌月完了予定':item.broken?'故障・停止中':'稼働中';
   const repairCost=item.maintenance?10000:20000;
   detail.append(el('h4','',`${item.name} の状態`));
   const facts=el('div','business-machine-facts');
   for(const [key,value] of [
     ['稼働状況',status],['状態',`${item.condition??100}/100`],
     ['帳簿価額',yen(item.bookValue)],['残存期間',`${item.remainingMonths??0}か月`],
     ['保守契約',item.maintenance?'加入中（月2,000円）':'未加入'],
     ['修理費',yen(repairCost)]
   ]){const span=el('div','business-machine-fact');span.append(el('small','',key),el('strong','',value));facts.append(span);}
   detail.append(facts);
   const forecast=returns.find(x=>x.id===id);
   if(forecast)detail.append(el('p','muted small',`売上寄与の参考値：月${yen(forecast.monthlyContribution)} ／ 保守費：月${yen(forecast.monthlyMaintenance)}。あくまでゲーム内の概算です。`));
   if(item.broken&&!item.repairMonths)detail.append(el('p','business-equipment-warning','故障中です。「今すぐ修理」か「翌月修理」を選択してください。'));
   const controls=el('div','business-machine-actions');
   operate(controls,'点検 5,000円',()=>onAction?.('serviceEquipment',{id:item.id}),funds<5000||item.repairMonths>0);
   operate(controls,'今すぐ修理 20,000円',()=>onAction?.('repairEquipment',{id:item.id}),!item.broken||item.repairMonths>0||funds<20000);
   operate(controls,`保守を${item.maintenance?'終了':'開始'}`,()=>onAction?.('toggleEquipmentMaintenance',{id:item.id}));
   operate(controls,`翌月修理 ${yen(repairCost)}`,()=>onAction?.('scheduleEquipmentRepair',{id:item.id}),!item.broken||item.repairMonths>0||funds<repairCost);
   operate(controls,'選択設備を売却',()=>onAction?.('sellEquipmentItem',{id:item.id}));
   detail.append(controls);
  }
  show(initial);
 }else selector.append(el('p','muted small','設備は未購入です。下の購入操作から追加できます。'));
 box.append(selector,detail);
 const purchase=el('details','business-machine-purchase');
 purchase.append(el('summary','','設備を購入・買い替える'));
 const form=el('div','business-machine-purchase-inner');
 const type=choiceButtons('設備の種類',Object.entries(EQUIPMENT_TYPES).map(([name,months])=>({value:name,label:`${name}（${months}か月）`})),Object.keys(EQUIPMENT_TYPES)[0]);
 form.append(type.element);
 const amountLabel=el('label','business-cost-label','購入金額（円・上限20万円）');
 const amount=el('input','phase5-number');amount.type='number';amount.min='1';amount.max='200000';amount.step='1000';amount.value='50000';
 amountLabel.append(amount);form.append(amountLabel);
 const buttons=el('div','business-machine-actions');
 const getAmount=()=>Number(amount.value);
 operate(buttons,'新しい設備を購入',()=>onAction?.('purchaseEquipment',{amount:getAmount(),type:type.getValue()}),b.status!=='営業中');
 if(items.length){
   operate(buttons,'選択した設備を買い替える',()=>{
     const selected=selector.querySelector('.business-machine-choice [aria-pressed="true"]');
     onAction?.('replaceEquipment',{id:Number(selected?.dataset.value),amount:getAmount(),type:type.getValue()});
   },b.status!=='営業中');
 }
 form.append(buttons);purchase.append(form);box.append(purchase);
 root.append(box);
}
