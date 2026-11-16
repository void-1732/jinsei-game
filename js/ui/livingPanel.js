import {REGIONS, HOME_OPTIONS, INSURANCE_PLANS, REGIONAL_FACTORS, getHousingEquity, mortgageSchedule,assessMortgage,calculatePension,medicalCoverageSummary,estimateInsuranceBenefit,pensionHistoryByYear,auditLivingAccounts} from '../core/livingSystems.js';
import {renderPropertyPortfolio} from './propertyPortfolioPanel.js';
import {choiceButtons} from './choiceButtons.js';
const make=(tag,text,cls='')=>{const x=document.createElement(tag);x.textContent=text;x.className=cls;return x;};
const yen=n=>`${Number(n).toLocaleString('ja-JP')}円`;
function field(root,label,value){const line=make('div','','field-list-item');line.append(make('strong',label),make('span',String(value)));root.append(line);}
function selector(root,label,values,selected){const wrap=make('label',label+'　','phase27-label'),sel=make('select','','phase27-select');for(const value of values){const option=make('option',value);option.value=value;sel.append(option);}sel.value=selected;wrap.append(sel);root.append(wrap);return sel;}
function button(root,label,fn,disabled){const b=make('button',label,'button button-secondary');b.type='button';b.disabled=disabled;b.addEventListener('click',fn);root.append(b);}
export function renderLivingPanel(container,screen,game,handlers={}){
 if(!['LIFE-02','LIFE-07','SOCIETY-06'].includes(screen.id))return false;
 const panel=make('section','','content-card phase4-panel phase27-panel');panel.append(make('h2',screen.id==='LIFE-02'?'住居・住宅':screen.id==='LIFE-07'?'保険・年金':'居住地域の経済指標'));
 if(!game?.initialized){panel.append(make('p','人生を開始すると住居・保障を確認できます。','muted'));container.prepend(panel);return true;}
 const l=game.finances.living??{region:'東京・東京23区',housing:'実家',monthlyHousingCost:0,propertyValue:0,insurance:'未加入',moves:[],claims:[]};
 const age=game.timeline.ageYears;
 if(screen.id==='LIFE-02'){field(panel,'居住地域',l.region);field(panel,'住居',l.housing);if(l.housing==='持ち家')field(panel,'購入した物件',HOME_OPTIONS.find(h=>h.id===(l.homeType??'standard'))?.name??'標準的な住宅');field(panel,'住居費（月額）',yen(l.monthlyHousingCost));
 field(panel,'持ち家の参考評価額',yen(l.propertyValue));field(panel,'住宅ローン残高',yen(l.mortgageBalance??0));field(panel,'住宅純資産',yen(getHousingEquity(l)));field(panel,'住宅ローン毎月返済',yen(l.mortgagePayment??0));field(panel,'返済不足累計',yen(l.mortgageArrears??0));field(panel,'延滞月数',`${l.mortgageLateMonths??0}か月`);field(panel,'ローン計算方式',l.mortgageAccounting??'従来方式');field(panel,'未払利息',yen(l.mortgageOverdueInterest??0));const audit=auditLivingAccounts(game.finances);field(panel,'会計整合性',audit.ok?'確認済み':`要確認：${audit.issues.join('／')}`);field(panel,'住宅ローン信用評価',`${l.mortgageCredit??70}点`);}
 if(screen.id==='LIFE-07'){field(panel,'任意保障',l.insurance);field(panel,'月額保険料',yen(INSURANCE_PLANS[l.insurance]?.premium??0));}
 if(screen.id==='LIFE-02'){
   const form=make('div','','phase27-form');form.append(make('h3','地域と住まいを変更'));
   const region=selector(form,'居住地域',REGIONS.map(r=>r.name),l.region);
   const housing=selector(form,'住居区分',['実家','賃貸','持ち家'],l.housing);
   const house=selector(form,'購入する住宅の種類',HOME_OPTIONS.map(h=>h.name),HOME_OPTIONS.find(h=>h.id===(l.homeType??'standard'))?.name??'標準的な住宅');
   const costPreview=make('p','','muted small');
   const updatePreview=()=>{
     const regionData=REGIONS.find(r=>r.name===region.value);
     const model=HOME_OPTIONS.find(h=>h.name===house.value);
     house.parentElement.hidden=housing.value!=='持ち家';
     const estimated= Math.round((regionData?.rent??0)*180*(model?.priceFactor??1));
     costPreview.textContent=housing.value==='持ち家'?`参考購入価格：${yen(estimated)}（別途諸費用・頭金）`:'持ち家を選ぶと物件別の価格を比較できます。';
   };
   region.addEventListener('change',updatePreview);housing.addEventListener('change',updatePreview);house.addEventListener('change',updatePreview);
   updatePreview();form.append(costPreview);
   const financing=selector(form,'持ち家の支払方法',['現金購入','住宅ローン（頭金20%）'],'現金購入');
   const cost=make('p','賃貸は家賃2か月分の契約費用、持ち家は購入額と諸費用が必要です。','muted small');form.append(cost);
   button(form,'引越し・住居変更を確定',()=>handlers.onAction?.('moveHome',{region:region.value,housing:housing.value,loan:financing.value.startsWith('住宅ローン'),homeType:HOME_OPTIONS.find(h=>h.name===house.value)?.id??'standard'}),age<18);
   panel.append(form);
   const price=(REGIONS.find(r=>r.name===region.value)?.rent??0)*180;
   field(panel,'住宅ローンの審査目安','信用評価55点以上・負債と返済余力を確認');
   field(panel,'融資申請で却下された回数',`${l.mortgageRejectedApplications??0}回`);
   if(l.housing==='持ち家'&&(l.mortgageBalance??0)>0){
     const mortgageControls=make('div','','asset-action-row');
     const preset=choiceButtons('繰上返済の金額を選択',[10000,50000,100000].filter(n=>n<=l.mortgageBalance).map(n=>({label:`${yen(n)}`,value:n})).concat({value:l.mortgageBalance,label:'残額を全額'}),Math.min(10000,l.mortgageBalance));
     const repayment=make('input','','phase5-number');repayment.type='number';repayment.inputMode='numeric';repayment.min='1';repayment.max=String(l.mortgageBalance);repayment.step='1000';repayment.value=String(Math.min(10000,l.mortgageBalance));
     repayment.setAttribute('aria-label','自宅ローンの任意繰上返済額（円）');
     preset.group.addEventListener('click',()=>{repayment.value=String(preset.getValue());});
     const repayLabel=make('label','自分で繰上返済額を決める（円）','asset-money-label');repayLabel.append(repayment);
     mortgageControls.append(preset.element,repayLabel);
     button(mortgageControls,'指定額を繰上返済',()=>handlers.onAction?.('repayMortgage',{amount:Number(repayment.value)}),age<18||game.finances.cash<=0);
     const monthly=make('input','','phase5-number');monthly.type='number';monthly.inputMode='numeric';monthly.min='1';monthly.max='1000000';monthly.step='1000';monthly.value=String(l.mortgagePayment??0);monthly.setAttribute('aria-label','自宅の毎月の住宅ローン返済額（円）');
     const monthlyLabel=make('label','毎月の返済金額を変更（円）','asset-money-label');monthlyLabel.append(monthly);mortgageControls.append(monthlyLabel);
     button(mortgageControls,'毎月の返済額を設定',()=>handlers.onAction?.('setMortgagePayment',{amount:Number(monthly.value)}),age<18);
     panel.append(mortgageControls);
   }
   if((l.mortgageArrears??0)>0){
     const values=[10000,50000,100000,l.mortgageArrears].filter((n,i,a)=>n<=l.mortgageArrears&&a.indexOf(n)===i).map(String);
     const arrears=selector(panel,'延滞解消額',values,values[0]);
     button(panel,'延滞した住宅ローンを清算',()=>handlers.onAction?.('clearMortgageArrears',{amount:Number(arrears.value)}),age<18||game.finances.cash<Number(arrears.value));
   }
   if(l.housing==='持ち家'&&(l.mortgageBalance??0)>0&&(l.mortgageAccounting??'従来方式')==='従来方式')button(panel,'住宅ローンを実額返済方式へ変更',()=>handlers.onAction?.('enableAccurateMortgage',{}),(l.mortgageArrears??0)>0);
   if(l.housing==='持ち家'){
     field(panel,'住宅の経過月数',`${l.propertyAgeMonths??0}か月`);
     field(panel,'修繕回数',`${l.repairCount??0}回`);field(panel,'定期維持費の累計',yen(l.homeMaintenancePaid??0));
     button(panel,'住宅を修繕する（50,000円）',()=>handlers.onAction?.('repairHome',{}),age<18);
     panel.append(make('h3','住宅ローン返済予定（今後12か月）'));
     for(const r of mortgageSchedule(l))field(panel,`${r.month}か月後`,`返済 ${yen(r.payment)} ／ 利息 ${yen(r.interest)} ／ 残高 ${yen(r.balance)}`);
     panel.append(make('h3','実際の返済履歴'));
     for(const r of (l.mortgageHistory??[]).slice(-6).reverse())field(panel,`${r.year}年${r.month}月`,`予定 ${yen(r.scheduled)} ／ 支払 ${yen(r.paid)} ／ 不足 ${yen(r.shortage)}`);
   }
   renderPropertyPortfolio(panel,game,handlers.onAction);
   panel.append(make('h3','引越しの履歴'));
   for(const m of (l.moves??[]).slice(-5).reverse())field(panel,`${m.year}年${m.month}月`,`${m.region}／${m.housing}・費用${yen(m.cost)}`);
 }
 if(screen.id==='LIFE-07'){
   const form=make('div','','phase27-form');form.append(make('h3','任意保障の加入・変更・解約'));
   const plan=selector(form,'保障プラン',Object.keys(INSURANCE_PLANS),l.insurance);
   button(form,'保障内容を確定',()=>handlers.onAction?.('setInsurance',{plan:plan.value}),age<18);
   button(form,'体調不良の給付を請求',()=>handlers.onAction?.('claimInsurance',{}),age<18||!game.health?.illness||l.insurance==='未加入');
   panel.append(form);field(panel,'給付履歴',`${l.claims?.length??0}件`);
   field(panel,'公的医療保障による累計軽減額',yen(l.medicalSubsidyPaid??0));field(panel,'任意保障の累計給付',yen(l.insuranceBenefitPaid??0));
   const coverage=selector(panel,'任意保険給付方式',['定額','自己負担上限'],l.insuranceClaimCap??'定額');button(panel,'給付方式を変更',()=>handlers.onAction?.('setInsuranceClaimCap',{mode:coverage.value}),age<18);
   const medical=medicalCoverageSummary(l);field(panel,'診療費の標準額',yen(medical.standard));field(panel,'簡易公的医療保障',yen(medical.publicSupport));field(panel,'治療時の本人負担',yen(medical.outOfPocket));field(panel,'任意保障の給付額（別途請求）',yen(medical.optionalBenefit));field(panel,'設定に応じた給付見込み',yen(estimateInsuranceBenefit(l)));
   panel.append(make('p','保険は任意加入のゲーム独自の制度です。簡易老齢年金は65歳以降、加入120か月以上で支給します。加入期間が長い場合は簡易加算があります。治療費にはゲーム独自の簡易医療保障が適用されます。現実の公的医療保険制度とは異なります。','muted small'));
 }
 if(screen.id==='SOCIETY-06'){field(panel,'居住地域',l.region);const r=REGIONAL_FACTORS[l.region];field(panel,'生活費の地域係数',`${Math.round((r?.living??1)*100)}%`);field(panel,'就業環境の参考係数',`${Math.round((r?.jobs??1)*100)}%`);}
 if(screen.id==='LIFE-07'){field(panel,'老齢年金の累計受給',yen(l.pensionPaid??0));field(panel,'年金加入月数',`${l.pensionMonths??0}か月`);field(panel,'年金加入記録',`${l.pensionContributions??l.pensionMonths??0}か月`);field(panel,'年金保険料の累計',yen(l.pensionPremiumPaid??0));
   field(panel,'年金の納付区分',l.pensionMode??'通常納付');field(panel,'免除月数',`${l.pensionExemptMonths??0}か月`);
   field(panel,'未納月数',`${l.pensionUnpaidMonths??0}か月`);field(panel,'追納可能な未納記録',`${l.pensionUnpaidRecords?.length??0}か月`);field(panel,'追納済み月数',`${l.pensionBackPaidMonths??0}か月`);
   field(panel,'受給見込（月額）',yen(calculatePension(l)));
   const mode=selector(panel,'次月以降の納付区分',['通常納付','免除','未納'],l.pensionMode??'通常納付');
   button(panel,'所得条件を確認して免除申請',()=>handlers.onAction?.('requestPensionExemption',{}),age<18||age>=65);
   button(panel,'年金の納付区分を変更',()=>handlers.onAction?.('setPensionMode',{mode:mode.value}),age<18||age>=65);
   panel.append(make('h3','年金の年度別記録'));for(const r of pensionHistoryByYear(l).slice(0,12))field(panel,`${r.year}年`,`納付${r.paid}・免除${r.exempt}・未納${r.unpaid}・追納${r.backPaid}か月`);
   if((l.pensionUnpaidRecords?.length??0)>0){
     const count=selector(panel,'追納する月数',Array.from({length:Math.min(12,l.pensionUnpaidRecords.length)},(_,i)=>String(i+1)),'1');
     button(panel,'未納保険料を追納する',()=>handlers.onAction?.('backPayPension',{months:Number(count.value)}),age<18);
   }
 }
 
 container.prepend(panel);return true;
}
