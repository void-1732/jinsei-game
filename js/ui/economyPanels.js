import {getCompany,ensureCompanyMarket} from '../core/companySystems.js';
import {JOB_POSTINGS,employmentScore,businessMonthlyFigures} from '../core/careerSystems.js';
import {netWorth,projectLoanSchedule,EQUIPMENT_TYPES,estimateEquipmentReturns,PART_TIME_JOBS,INVESTMENT_PRODUCTS,VEHICLE_OPTIONS} from '../core/economySystems.js';
/** 仕事・家計の実データ操作パネル。入力はユーザー操作時のみ反映。 */
const econEl=(tag,cls='',text='')=>{const n=document.createElement(tag);n.className=cls;n.textContent=text;return n;};
const yen=n=>`${Number(n).toLocaleString('ja-JP')}円`;
function line(root,key,value){const r=econEl('div','field-list-item');r.append(econEl('strong','',key),econEl('span','',String(value)));root.append(r);}
function action(root,label,handler,disabled=false){const b=econEl('button','button button-secondary phase5-action',label);b.type='button';b.disabled=disabled;b.addEventListener('click',handler);root.append(b);return b;}
function graph(root,heading,items,key){
  if(!items?.length)return;
  const block=econEl('div','phase18-graph');block.append(econEl('h3','',heading));
  const series=items.slice(-12);const peak=Math.max(1,...series.map(x=>Math.abs(Number(x[key])||0)));
  const bars=econEl('div','phase18-bars');
  for(const x of series){const value=Number(x[key])||0;const column=econEl('div','phase18-column');
    const bar=econEl('div','phase18-bar');bar.style.height=`${Math.max(3,Math.abs(value)/peak*100)}%`;if(value<0)bar.classList.add('phase18-negative');
    bar.title=`${x.year}年${x.month}月：${yen(value)}`;
    column.append(bar,econEl('span','',`${x.month}月`));bars.append(column);
  }
  block.append(bars);root.append(block);
}
function input(root,value,aria){const x=econEl('input','phase5-number');x.type='number';x.min='1';x.max='100000000';x.step='1000';x.value=String(value);x.setAttribute('aria-label',aria);root.append(x);return x;}
export function renderEconomyPanel(container,screen,game,handlers={}){
  if(!screen.id.startsWith('WORK-')&&!['LIFE-02','LIFE-03','LIFE-04','LIFE-05','LIFE-06','LIFE-08'].includes(screen.id))return false;
  const section=econEl('section','content-card phase4-panel phase5-panel');
  const headings={'LIFE-02':'車の購入・所有','LIFE-03':'家計簿・収支','LIFE-04':'資産・預金','LIFE-05':'投資','LIFE-06':'借入・返済','LIFE-08':'収支・取引の履歴'};
  section.append(econEl('h2','',headings[screen.id]??'仕事・家計・資産'));
  if(!game?.initialized){section.append(econEl('p','muted','人生を開始すると仕事・資産の情報が表示されます。'));container.prepend(section);return true;}
  const f=game.finances,job=f.career,b=f.business,age=game.timeline.ageYears;
  const work=screen.id.startsWith('WORK-');
  if(work||['LIFE-04','LIFE-05','LIFE-06'].includes(screen.id)){
    line(section,'現金',yen(f.cash));line(section,'投資評価額',yen(f.investment));line(section,'借入残高',yen(f.debt));line(section,'純資産（事業資金を含む）',yen(netWorth(f)));
  }
  if(work||screen.id==='LIFE-01'){
    section.append(econEl('h3','','勤務・副業・事業'));
    line(section,'現在の職業',job.job??'無職');line(section,'勤務先',job.company??'勤務先なし');line(section,'月額給与（額面）',yen(job.monthlySalary));
    line(section,'勤務月数',`${job.experience}か月`);
    if(!job.job&&age>=18){
      line(section,'失業期間',`${job.unemploymentMonths??0}か月`);
      line(section,'簡易失業給付の受給月数',`${job.benefitMonths??0} / 6か月`);line(section,'再受給の資格',job.benefitEligible===false?'再就職後12か月の勤務が必要':'対象（勤務先都合の失業時）');line(section,'再受給に向けた勤務実績',`${job.insuredMonths??0}か月`);
      line(section,'再就職準備',`${job.searchEffort??0} / 3段階`);
      if(work)action(section,'再就職活動を行う',()=>handlers.onAction?.('jobSearch',{}),(job.searchEffort??0)>=3);
    }line(section,'勤務先都合の失業',`${job.unemploymentCount??0}回`);line(section,'昇給回数',`${job.promotions}回`);

    if(job.job && work){
      section.append(econEl('h3','','職場の関係・人事評価（第11段階）'));
      line(section,'業務成果',`${job.performance??50}点`);
      line(section,'上司の信頼',`${job.supervisorTrust??50}点`);
      line(section,'同僚との関係',`${job.coworkerTrust??50}点`);
      line(section,'今月の職場行動',`${job.workplaceActions??0} / 2回`);
      const controls=econEl('div','phase4-actions');
      const limited=(job.workplaceActions??0)>=2;
      action(controls,'仕事に集中する',()=>handlers.onAction?.('workHard',{}),limited);
      action(controls,'同僚を手伝う',()=>handlers.onAction?.('helpColleague',{}),limited);
      action(controls,'上司と面談する',()=>handlers.onAction?.('talkSupervisor',{}),limited);
      action(controls,'人事評価を確認',()=>handlers.onAction?.('reviewPerformance',{}),job.experience<3);
      section.append(controls);
      section.append(econEl('h3','','職場の人物（第12段階）'));
      for(const person of job.workplacePeople??[]){
        const entry=econEl('div','phase11-staff');
        entry.append(econEl('strong','',`${person.role}：${person.name}（${person.personality??'協調的'}／技能${person.skill??60}点）`),econEl('span','',`信頼度 ${person.trust}点`));
        action(entry,'交流する',()=>handlers.onAction?.('interactCoworker',{personId:person.id}),limited);
        section.append(entry);
      }
      line(section,'直近の月次勤務評価',`${job.monthlyRating??50}点`);
      for(const incident of (job.workplaceIncidents??[]).filter(x=>!x.resolved).slice(-2)){
        section.append(econEl('h3','',`職場の相談：${incident.title}`));
        const choices=econEl('div','phase4-actions');
        action(choices,'協力して解決',()=>handlers.onAction?.('resolveWorkIncident',{incidentId:incident.id,choice:'協力'}));
        action(choices,'対話して解決',()=>handlers.onAction?.('resolveWorkIncident',{incidentId:incident.id,choice:'対話'}));
        section.append(choices);
      }
      for(const entry of (job.reviews??[]).slice(-3).reverse())line(section,`${entry.year}年${entry.month}月 人事評価`,`${entry.grade}・${entry.score}点`);
    }
    line(section,'副業',f.sideJob.active?'活動中':'停止中');line(section,'自分の事業',b.active?`${b.name}（営業中）`:'未設立・終了');
  }
  if(screen.id==='WORK-01'||screen.id==='WORK-02'){
    section.append(econEl('h3','','求人・採用選考（第10段階）'));
    const choices=econEl('div','phase10-job-grid');
    for(const post of JOB_POSTINGS){
      const item=econEl('div','phase10-job');
      const score=employmentScore(game.education,post,job.experience);
      const company=getCompany(f,post.id);
      item.append(econEl('strong','',`${post.company} ／ ${post.job}`));
      item.append(econEl('p','muted small',`企業評価 ${company?.performance??'―'}点／募集 ${company?.openings??0}枠／${company?.status??'通常'}`));
      item.append(econEl('p','muted small',`給与：${yen(post.salary)}／月・応募${post.minAge}歳以上・選考基準${post.threshold}点・現在の評価${score}点`));
      action(item,job.job?'応募して転職':'採用選考を受ける',()=>handlers.onAction?.('applyJob',{postingId:post.id}),age<post.minAge||company?.openings===0||company?.status==='営業停止');
      choices.append(item);
    }
    section.append(choices);
    section.append(econEl('h3','','企業別の財務・求人状況（第14段階）'));
    for(const firm of ensureCompanyMarket(f)){
      const entry=econEl('div','phase11-staff');
      entry.append(econEl('strong','',`${firm.name} ／ ${firm.status}`));
      entry.append(econEl('span','',`業績${firm.performance}点・従業員${firm.staffCount}人・募集${firm.openings}枠`));
      entry.append(econEl('span','',`売上 ${yen(firm.revenue)} ／ 経費 ${yen(firm.costs)} ／ 利益 ${yen(firm.profit)} ／ 資金残高 ${yen(firm.cash)}`));
      if(firm.status==='営業停止')action(entry,'再建を支援する（50万円・寄付）',()=>handlers.onAction?.('supportRebuilding',{companyId:firm.id}),f.cash<500000||(firm.haltedMonths??0)<3);
      section.append(entry);
    }
    const records=job.applications??[];
    section.append(econEl('h3','','最近の採用選考'));
    if(!records.length)section.append(econEl('p','muted','応募記録はありません。'));
    for(const entry of records.slice(-5).reverse())line(section,`${entry.year}年${entry.month}月 ${entry.company}`,`${entry.passed?'合格':'不合格'}・${entry.score}点`);
  }
  if(screen.id==='WORK-01'||screen.id==='WORK-02'){
    const controls=econEl('div','phase4-actions');
    action(controls,'退職する',()=>handlers.onAction?.('resign',{}),!f.career.job);section.append(controls);
    line(section,'役職',`${job.rank??1}級`);
    const promote=econEl('div','phase4-actions');action(promote,'昇進審査を受ける',()=>handlers.onAction?.('promotionExam',{}),!job.job||job.experience<12);section.append(promote);
  }
  if(screen.id==='WORK-03'){
    section.append(econEl('h3','','アルバイト・副業を選ぶ'));
    const current=PART_TIME_JOBS.find(x=>x.id===f.sideJob?.jobId);
    line(section,'現在のアルバイト',f.sideJob.active?(current?.name??'従来の副業'):'なし');
    line(section,'月間勤務時間',`${f.sideJob?.active?(f.sideJob.hours??0):0}時間`);
    line(section,'副業月収（額面）',yen(f.sideJob?.active?f.sideJob.monthlyIncome:0));
    const choices=econEl('div','phase10-job-grid');
    for(const job of PART_TIME_JOBS){
      const card=econEl('div','phase10-job');
      card.append(econEl('strong','',job.name),
        econEl('p','muted small',`月${job.hours}時間 ／ 時給${yen(job.hourlyWage)} ／ 月収見込${yen(job.hours*job.hourlyWage)}`));
      action(card,f.sideJob?.active&&current?.id===job.id?'選択中':'この仕事を始める',
        ()=>handlers.onAction?.('sideJob',{active:true,jobId:job.id}),
        age<18||(f.sideJob?.active&&current?.id===job.id));
      choices.append(card);
    }
    section.append(choices);
    action(section,'アルバイト・副業を停止',()=>handlers.onAction?.('sideJob',{active:false}),!f.sideJob?.active);
    section.append(econEl('p','muted small','就職中でも併用可能です。収入は毎月精算され、税金・生活費にも反映されます。時間と給与はゲーム用の架空モデルです。'));
  }
  if(screen.id==='WORK-04'||screen.id==='WORK-05'){
    section.append(econEl('h3','','会社・事業経営（簡易版）'));
    line(section,'事業売上／月',yen(b.monthlyRevenue));line(section,'事業経費／月',yen(b.monthlyCosts));
    const controls=econEl('div','phase4-actions');action(controls,'30万円で事業を開始',()=>handlers.onAction?.('startBusiness',{}),b.active||age<20);
    action(controls,'事業を終了',()=>handlers.onAction?.('closeBusiness',{}),!b.active);section.append(controls);
    if(b.active){
      const figures=businessMonthlyFigures(b,game.world?.phase);
      line(section,'従業員数',`${b.employees??0}人`);
      line(section,'営業状態',b.status??'営業中');
      line(section,'運転資金残高（管理指標）',yen(b.operatingCash??b.capitalSpent??0));
      line(section,'累積資金不足（参考）',yen(b.operatingDebt??0));
      line(section,'個人への累計引出し',yen(b.ownerDraws??0));
      line(section,'連続赤字月数',`${b.lossMonths??0}か月`);
      line(section,'月額自動返済',yen(b.monthlyRepayment??0));line(section,'累計設備減価償却',yen(b.equipmentDepreciation??0));line(section,'融資審査の申請回数',`${b.loanApplications??0}回`);line(section,'事業融資残高',yen(b.loanBalance??0));line(section,'支払・未払利息累計',yen(b.loanInterestPaid??0));line(section,'事業設備の帳簿価額',yen(b.equipmentValue??0));
      line(section,'融資の信用評価',`${b.creditScore??70} / 100点`);
      line(section,'融資の延滞期間',`${b.loanOverdueMonths??0}か月`);
      if((b.loanDueIndex??0)>0){const i=b.loanDueIndex;line(section,'融資返済期限',`${Math.floor(i/12)}年${i%12+1}月`);}
      section.append(econEl('h3','','融資契約ごとの返済状況'));
      for(const c of (b.loanContracts??[]).filter(x=>x.principal>0)){
        const due=c.dueIndex>0?`${Math.floor(c.dueIndex/12)}年${c.dueIndex%12+1}月`:'期限未設定';
        line(section,`契約${c.id}・期限 ${due}・延滞${c.overdueMonths}か月`, `元本${yen(c.principal)}／借入額${yen(c.original)}／月額予定${yen(c.monthlyTarget??0)}`);
        const row=econEl('div','phase4-actions');const planned=input(row,c.monthlyTarget??10000,`契約${c.id}の毎月の返済予定額（円）`);planned.min='0';
        action(row,`契約${c.id}の返済額を設定`,()=>handlers.onAction?.('setContractRepayment',{id:c.id,amount:Number(planned.value)}));section.append(row);
      }
      section.append(econEl('h3','','今後12か月の返済予定（資金不足は考慮しない）'));
      const projections=projectLoanSchedule(b,{year:game.timeline.year,month:game.timeline.month});
      for(const r of projections.slice(0,36))line(section,`${r.year}年${r.month}月 契約${r.contractId}`,`元本予定 ${yen(r.principal)}／利息見込 ${yen(r.interest)}／予定残高 ${yen(r.remaining)}${r.due?'（期限到来）':''}`);
      section.append(econEl('h3','','月別の返済予定と実績'));
      for(const r of (b.loanScheduleHistory??[]).slice(-12).reverse())line(section,`${r.year}年${r.month}月 契約${r.contractId}`,`予定 ${yen(r.planned)}／実績 ${yen(r.actual)}／差額 ${yen(r.actual-r.planned)}`);
      section.append(econEl('h3','','融資の返済実績（直近）'));
      const recent=(b.loanPaymentHistory??[]).slice(-12);
      const scheduled=projectLoanSchedule(b,{year:game.timeline.year,month:game.timeline.month},1);
      line(section,'翌月の元本返済予定合計',yen(scheduled.reduce((sum,r)=>sum+r.principal,0)));
      line(section,'これまでの元本返済実績',yen((b.loanPaymentHistory??[]).reduce((sum,r)=>sum+r.amount,0)));
      for(const r of (b.loanPaymentHistory??[]).slice(-8).reverse())line(section,`${r.year}年${r.month}月 契約${r.contractId} ${r.kind}`,yen(r.amount));

      section.append(econEl('h3','','設備投資の費用対効果（参考試算）'));
      const returns=estimateEquipmentReturns(b,game.world?.economy?.phase??game.world?.phase??'通常');
      if(!returns.length)section.append(econEl('p','muted','試算対象の設備はありません。'));
      else {
        for(const result of returns){
          line(section,`${result.name}・${result.status}の月次目安`,
            `売上寄与 ${yen(result.monthlyContribution)} ／ 保守費 ${yen(result.monthlyMaintenance)} ／ 差額 ${yen(result.monthlyNet)}`);
          line(section,`${result.name}の投資回収目安`,result.estimatedRecoveryMonths===null?'算出不可':`${result.estimatedRecoveryMonths}か月`);
        }
      }
      section.append(econEl('p','muted small','参考試算は既存の設備生産性補正を設備台数で按分したものです。故障による売上減少、税金、資金調達、将来の売上変動を含まず、実際の利益・回収期間を保証しません。'));
      section.append(econEl('h3','','事業設備の個別管理'));
      const latest=b.cashFlowHistory?.at(-1);if(latest?.productivity!==undefined){line(section,'前月の設備生産性',`${latest.productivity}%`);line(section,'前月の稼働設備',`${latest.workingEquipment}台`);}
      for(const item of (b.equipmentItems??[]).slice(-12)){
        line(section,`${item.name}（設備番号${item.id}・${item.type??'旧設備'}・残り${item.remainingMonths}か月・経過${item.elapsedMonths??0}か月）`,yen(item.bookValue));
        const single=econEl('div','phase4-actions');
        line(section,`設備番号${item.id}の稼働状態`,item.repairMonths>0?'修理中・翌月完了予定':item.broken?'故障・停止中':`稼働中（状態 ${item.condition??100}/100）`);
        line(section,`設備番号${item.id}の保守契約`,item.maintenance?'加入中（月額2,000円）':'未加入');
        action(single,`設備番号${item.id}を点検（5,000円）`,()=>handlers.onAction?.('serviceEquipment',{id:item.id}),(b.operatingCash??0)<5000);
        action(single,`設備番号${item.id}を修理（20,000円）`,()=>handlers.onAction?.('repairEquipment',{id:item.id}),!item.broken||(b.operatingCash??0)<20000);
        action(single,`設備番号${item.id}の保守契約を${item.maintenance?'終了':'開始'}`,()=>handlers.onAction?.('toggleEquipmentMaintenance',{id:item.id}));
        action(single,`設備番号${item.id}の修理を依頼（翌月完了）`,()=>handlers.onAction?.('scheduleEquipmentRepair',{id:item.id}),!item.broken||item.repairMonths>0||(b.operatingCash??0)<(item.maintenance?10000:20000));
        action(single,`設備番号${item.id}を売却`,()=>handlers.onAction?.('sellEquipmentItem',{id:item.id}));
        section.append(single);
      }
      const financing=econEl('div','phase4-actions');const financingAmount=input(financing,50000,'事業融資・返済・設備購入の金額（円）');
      action(financing,'事業融資を借りる',()=>handlers.onAction?.('businessLoan',{amount:Number(financingAmount.value)}));
      action(financing,'事業融資を返済',()=>handlers.onAction?.('repayBusinessLoan',{amount:Number(financingAmount.value)}),(b.loanBalance??0)===0);
      action(financing,'毎月の融資返済額を設定',()=>handlers.onAction?.('setLoanRepayment',{amount:Number(financingAmount.value)}),(b.loanBalance??0)===0);
      action(financing,'自動返済を解除',()=>handlers.onAction?.('setLoanRepayment',{amount:0}),(b.monthlyRepayment??0)===0);
      action(financing,'事業未払金を精算',()=>handlers.onAction?.('settleBusinessPayable',{amount:Number(financingAmount.value)}),(b.operatingDebt??0)===0);
      const equipmentType=econEl('select','phase4-select');equipmentType.setAttribute('aria-label','設備種別');
      for(const [name,months] of Object.entries(EQUIPMENT_TYPES)){const opt=econEl('option','',`${name}（${months}か月）`);opt.value=name;equipmentType.append(opt);}financing.append(equipmentType);
      action(financing,'選択した種別の設備を購入',()=>handlers.onAction?.('purchaseEquipment',{amount:Number(financingAmount.value),type:equipmentType.value}),b.status!=='営業中');
      const replaceId=econEl('select','phase4-select');replaceId.setAttribute('aria-label','買い替える設備');
      for(const item of b.equipmentItems??[]){const opt=econEl('option','',`設備番号${item.id}：${item.name}`);opt.value=String(item.id);replaceId.append(opt);}financing.append(replaceId);
      action(financing,'選択した設備を買い替える',()=>handlers.onAction?.('replaceEquipment',{id:Number(replaceId.value),amount:Number(financingAmount.value),type:equipmentType.value}),!b.equipmentItems?.length||b.status!=='営業中');
      action(financing,'事業設備を売却',()=>handlers.onAction?.('sellEquipment',{}),(b.equipmentValue??0)===0);
      action(financing,'延滞融資の返済条件を変更',()=>handlers.onAction?.('restructureBusinessDebt',{}),(b.loanOverdueMonths??0)===0);
      section.append(financing);
      section.append(econEl('h3','','事業口座の取引履歴'));
      const ledgerControls=econEl('div','phase4-actions');
      const historyFilter=econEl('select','phase4-select');historyFilter.setAttribute('aria-label','事業の取引履歴の絞り込み');
      for(const name of ['すべて','設備','融資','事業','点検・修理']){const opt=econEl('option','',name);opt.value=name;historyFilter.append(opt);}ledgerControls.append(historyFilter);
      const ledgerSearch=econEl('input','phase5-number');ledgerSearch.type='search';ledgerSearch.placeholder='取引名を検索';ledgerSearch.setAttribute('aria-label','事業取引の文字検索');ledgerControls.append(ledgerSearch);
      const ledgerResults=econEl('div','');
      const refreshLedger=()=>{ledgerResults.replaceChildren();const needle=historyFilter.value;
        const filtered=(b.businessLedger??[]).filter(entry=>(!ledgerSearch.value.trim()||entry.label.includes(ledgerSearch.value.trim()))&&(needle==='すべて'||(needle==='設備'&&entry.label.includes('設備'))||(needle==='融資'&&(/融資|契約|返済|利息/.test(entry.label)))||(needle==='事業'&&(/事業売上|事業経費|事業主/.test(entry.label)))||(needle==='点検・修理'&&(/点検|修理|故障/.test(entry.label)))));
        for(const entry of filtered.slice(-12).reverse())line(ledgerResults,`${entry.year}年${entry.month}月 ${entry.label}`,yen(entry.amount));
        if(!filtered.length)ledgerResults.append(econEl('p','muted','該当する取引記録はありません。'));
      };
      historyFilter.addEventListener('change',refreshLedger);ledgerSearch.addEventListener('input',refreshLedger);refreshLedger();section.append(ledgerControls,ledgerResults);
      const funding=econEl('div','phase4-actions');
      const fundingAmount=input(funding,100000,'事業へ追加する運転資金（円）');
      action(funding,'運転資金を追加',()=>handlers.onAction?.('businessFunding',{amount:Number(fundingAmount.value)}));
      action(funding,'休業中の事業を再開',()=>handlers.onAction?.('restartBusiness',{}),b.status!=='休業'||(b.operatingCash??0)<100000);
      const draw=input(funding,50000,'個人へ引き出す事業資金（円）');
      action(funding,'事業資金を個人へ移す',()=>handlers.onAction?.('ownerDraw',{amount:Number(draw.value)}));
      section.append(funding);
      graph(section,'事業の月次利益推移',b.cashFlowHistory,'profit');
      for(const cash of (b.cashFlowHistory??[]).slice(-3).reverse())line(section,`${cash.year}年${cash.month}月 事業収支`, `売上${yen(cash.revenue)}・経費${yen(cash.costs)}・利益${yen(cash.profit)}（${cash.status}）`);line(section,'経営方針',b.policy??'安定');
      line(section,'景気反映後の見込売上',yen(figures.revenue));line(section,'従業員費を含む見込経費',yen(figures.costs));
      const management=econEl('div','phase4-actions');action(management,'従業員を1人採用',()=>handlers.onAction?.('hireEmployee',{}),(b.employees??0)>=20||f.cash<100000);
      const policy=econEl('select','phase4-select');policy.setAttribute('aria-label','経営方針');for(const name of ['安定','成長','節約']){const opt=econEl('option','',name);opt.value=name;policy.append(opt);}policy.value=b.policy??'安定';management.append(policy);
      action(management,'経営方針を変更',()=>handlers.onAction?.('businessPolicy',{policy:policy.value}));section.append(management);
      section.append(econEl('h3','','従業員・企業業績（第11段階）'));
      line(section,'企業の評判',`${b.reputation??50}点`);
      for(const staff of b.staff??[]){
        const row=econEl('div','phase11-staff');
        row.append(econEl('strong','',staff.name),econEl('span','',`技能${staff.skill}点／意欲${staff.morale}点／月額人件費 ${yen(staff.salary)}`));
        action(row,'研修する（3万円）',()=>handlers.onAction?.('trainStaff',{staffId:staff.id}),f.cash<30000);
        action(row,'退職処理',()=>handlers.onAction?.('dismissStaff',{staffId:staff.id}));
        section.append(row);
      }
      if((b.staff??[]).length)action(section,'職場環境を改善',()=>handlers.onAction?.('staffCare',{}));
      section.append(econEl('h3','','企業業績の記録（第12段階）'));
      line(section,'現在の採用人数',`${(b.staff??[]).length}人`);
      for(const item of (b.marketHistory??[]).slice(-3).reverse())line(section,`${item.year}年${item.month}月 事業指標`, `従業員${item.employees}人／平均技能${item.averageSkill}点／意欲${item.averageMorale}点`);
      for(const result of (b.results??[]).slice(-6).reverse())line(section,`${result.year}年${result.month}月`,`${result.employees}人／平均技能${result.averageSkill}点／平均意欲${result.averageMorale}点`);

    }
  }
  if(['LIFE-03','LIFE-04','LIFE-08'].includes(screen.id)){
    section.append(econEl('h3','','家計・資産状況'));
    line(section,'個人家計と事業会計は別管理',b.active?'事業売上は個人収入へ直接加算されません':'現在は事業なし');line(section,'毎月の生活費設定',yen(f.monthlyBudget));line(section,'これまでの収入',yen(f.totals.income));line(section,'これまでの支出',yen(f.totals.expenses));line(section,'税金・社会保険相当累計',yen(f.totals.tax));
  }
  if(screen.id==='LIFE-03'){
    const controls=econEl('div','phase4-actions');const value=input(controls,f.monthlyBudget,'毎月の生活費（円）');action(controls,'生活費を設定',()=>handlers.onAction?.('setBudget',{amount:Number(value.value)}));section.append(controls);
  }
  if(screen.id==='LIFE-05'){
    section.append(econEl('h3','','商品を選んで投資'));
    const controls=econEl('div','phase4-actions');
    const value=input(controls,10000,'取引金額（円）');
    const product=econEl('select','phase4-select');
    product.setAttribute('aria-label','投資商品');
    for(const item of INVESTMENT_PRODUCTS){
      const option=econEl('option','',`${item.name}（リスク：${item.risk}）`);
      option.value=item.id;product.append(option);
    }
    controls.append(product);
    action(controls,'購入',()=>handlers.onAction?.('buyInvestment',{amount:Number(value.value),productId:product.value}),age<18);
    action(controls,'売却',()=>handlers.onAction?.('sellInvestment',{amount:Number(value.value),productId:product.value}));

    section.append(controls);
    for(const item of f.investmentHoldings??[]){
      const definition=INVESTMENT_PRODUCTS.find(x=>x.id===item.id);
      line(section,definition?.name??item.id, yen(item.value));
    }
    const tracked=(f.investmentHoldings??[]).reduce((sum,x)=>sum+x.value,0);
    if(f.investment>tracked)line(section,'以前の投資残高',yen(f.investment-tracked));
    section.append(econEl('p','muted small','商品ごとに利回りと変動幅が異なります。旧セーブの投資残高はそのまま保護されます。'));
  }
  if(screen.id==='LIFE-06'){
    section.append(econEl('h3','','個人借入金の返済'));
    line(section,'現在の借入残高',yen(f.debt));
    const controls=econEl('div','phase4-actions');
    const amount=input(controls,Math.min(10000,Math.max(1,f.debt)),'借入金の返済額（円）');
    action(controls,'借入金を返済',()=>handlers.onAction?.('repayDebt',{amount:Number(amount.value)}),f.debt<=0||f.cash<=0);
    section.append(controls);
  }
  if(screen.id==='LIFE-02'){
    section.append(econEl('h3','','マイカーの購入・売却'));
    const owned=VEHICLE_OPTIONS.find(v=>v.id===f.vehicle?.id);
    line(section,'所有車',owned?.name??'なし');
    if(owned){line(section,'現在の車両評価額',yen(f.vehicle.value));line(section,'維持費（月額）',yen(owned.monthlyCost));}
    const vehicles=econEl('div','phase10-job-grid');
    for(const model of VEHICLE_OPTIONS){
      const card=econEl('div','phase10-job');
      card.append(econEl('strong','',model.name),
        econEl('p','muted small',`購入費${yen(model.price)} ／ 維持費${yen(model.monthlyCost)}/月`));
      action(card,'購入',()=>handlers.onAction?.('buyVehicle',{vehicleId:model.id}),age<18||Boolean(f.vehicle)||f.cash<model.price);
      vehicles.append(card);
    }
    section.append(vehicles);
    action(section,'現在の車を売却する',()=>handlers.onAction?.('sellVehicle',{}),!f.vehicle);
    section.append(econEl('p','muted small','車両価値は毎月減価し、維持費は家計に反映されます。'));
  }
  if(['LIFE-03','LIFE-08'].includes(screen.id)){
    const monthly=[...new Map(f.ledger.filter(x=>x.kind==='収入'||x.kind==='支出').map(x=>[`${x.year}-${x.month}`,{year:x.year,month:x.month}])).values()];
    for(const x of monthly){x.balance=f.ledger.filter(y=>y.year===x.year&&y.month===x.month&&(y.kind==='収入'||y.kind==='支出')).reduce((sum,y)=>sum+y.amount,0);}
    graph(section,'家計の月次収支推移',monthly,'balance');
  }
  if(['LIFE-08','WORK-05','LIFE-01'].includes(screen.id)){
    section.append(econEl('h3','','最近の取引記録'));
    if(!f.ledger.length)section.append(econEl('p','muted','取引記録はまだありません。'));
    for(const x of f.ledger.slice(-12).reverse())line(section,`${x.year}年${x.month}月・${x.label}`,x.amount===0?'記録':`${x.amount>0?'+':''}${yen(x.amount)}`);
  }
  section.append(econEl('p','muted small','収支・税額・投資利回りはゲーム用の簡易モデルです。現実の制度や市場価格とは異なります。'));
  container.prepend(section);return true;
}
