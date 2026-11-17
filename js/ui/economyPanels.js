import {SPENDING_STYLES,spendingPreview} from '../core/householdSpending.js';
import {householdSummary} from '../core/householdExtension.js';
import {hardshipSummary} from '../core/householdHardship.js';
import {REGIONAL_FACTORS} from '../core/livingSystems.js';
import {getCompany,ensureCompanyMarket} from '../core/companySystems.js';
import {CAREER_SECTORS,EXTENDED_JOB_POSTINGS,marketListings,careerEligibility} from '../core/careerMarketplace.js';
import {JOB_POSTINGS,employmentScore,businessMonthlyFigures,CAREER_PLANS,careerStage} from '../core/careerSystems.js';
import {choiceButtons} from './choiceButtons.js';
import {jobQualificationInfo,hiringProbability} from '../core/qualificationSystems.js';
import {renderQualificationPanel} from './qualificationPanel.js';
import {renderBusinessEquipmentPanel} from './businessEquipmentPanel.js';
import {renderSideJobWorkspace,renderBusinessWorkspace} from './workCompactPanel.js';
import {renderAssetPulse} from './assetPulsePanel.js';
import {employmentQualificationBonus,canApplyUniversityRole,majorFor} from '../core/educationPaths.js';
import {netWorth,projectLoanSchedule,EQUIPMENT_TYPES,estimateEquipmentReturns,PART_TIME_JOBS,INVESTMENT_PRODUCTS,VEHICLE_OPTIONS} from '../core/economySystems.js';
/** 仕事・家計の実データ操作パネル。入力はユーザー操作時のみ反映。 */
const econEl=(tag,cls='',text='')=>{const n=document.createElement(tag);n.className=cls;n.textContent=text;return n;};
const yen=n=>`${Number(n).toLocaleString('ja-JP')}円`;
let selectedVehicleFleetId=null;
function line(root,key,value){const r=econEl('div','field-list-item');r.append(econEl('strong','',key),econEl('span','',String(value)));root.append(r);}
function action(root,label,handler,disabled=false){const b=econEl('button','button button-secondary phase5-action',label);b.type='button';b.disabled=disabled;b.addEventListener('click',handler);root.append(b);return b;}
function businessAction(root,label,handler,disabled=false){const b=action(root,label,handler,disabled);b.dataset.actionScope='business';return b;}

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
  if(screen.id==='LIFE-03'){
    renderAssetPulse(section,game,handlers.onAction);
    const monthly=[...new Map(game.finances.ledger.filter(x=>x.kind==='収入'||x.kind==='支出').map(x=>[`${x.year}-${x.month}`,{year:x.year,month:x.month}])).values()];
    for(const x of monthly)x.balance=game.finances.ledger.filter(y=>y.year===x.year&&y.month===x.month&&(y.kind==='収入'||y.kind==='支出')).reduce((sum,y)=>sum+y.amount,0);
    const timeline=econEl('details','asset-pulse-fold');
    timeline.append(econEl('summary','','過去12か月の収支推移'));
    graph(timeline,'家計の月次収支推移',monthly,'balance');
    section.append(timeline);
    container.prepend(section);return true;
  }
  if(screen.id==='WORK-03'){
    renderSideJobWorkspace(section,game,handlers.onAction);
    container.prepend(section);return true;
  }
  if(screen.id==='WORK-04'){
    renderBusinessWorkspace(section,game,handlers.onAction);
    container.prepend(section);return true;
  }
  const work=screen.id.startsWith('WORK-')&&screen.id!=='WORK-04';
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
  if(screen.id==='WORK-01'){
    section.append(econEl('h3','','求人・採用選考'));
    const choices=econEl('div','phase10-job-grid');
    for(const post of JOB_POSTINGS.filter(p=>!EXTENDED_JOB_POSTINGS.some(e=>e.id===p.id))){
      const item=econEl('div','phase10-job');
      const score=employmentScore(game.education,post,job.experience);
      const company=getCompany(f,post.id);
      item.append(econEl('strong','',`${post.company} ／ ${post.job}`));
      item.append(econEl('p','muted small',`企業評価 ${company?.performance??'―'}点／募集 ${company?.openings??0}枠／${company?.status??'通常'}`));
      const qualification=employmentQualificationBonus(game.education,post.id);
      item.append(econEl('p','muted small',`給与：${yen(post.salary)}／月・応募${post.minAge}歳以上・選考基準${post.threshold}点・現在の評価${score}点`));
      const qualificationInfo=jobQualificationInfo(game.education,post.id);
      if(qualificationInfo.preferred.length)item.append(econEl('p','muted small',`評価される資格：${qualificationInfo.preferred.map(q=>q.name).join('・')} ／取得済み${qualificationInfo.matched.length}件`));
      if(qualification)item.append(econEl('p','muted small',`専攻・資格の適性加点 +${qualification}点／採用時の月給加算 ${yen(qualification*1000)}（${majorFor(game.education.major).name}）`));
      if(post.university&&!canApplyUniversityRole(game.education))item.append(econEl('p','muted small','応募条件：4年制大学の修了が必要です。'));
      action(item,job.job?'応募して転職':'採用選考を受ける',()=>handlers.onAction?.('applyJob',{postingId:post.id}),age<post.minAge||(post.university&&!canApplyUniversityRole(game.education))||company?.openings===0||company?.status==='営業停止');
      choices.append(item);
    }
    section.append(choices);
    const market=econEl('details','phase4-extra career-market');
    market.append(econEl('summary','','今月の追加求人・職種別キャリア（毎ターン更新）'));
    market.append(econEl('p','muted small',`掲載企業${marketListings(game).length}社／追加登録企業${EXTENDED_JOB_POSTINGS.length}社。希望業種・インターン・前職の経験で表示が変わります。`));
    const marketControls=econEl('div','phase4-actions');
    const industry=econEl('label','career-sector-label','希望業種・求人の絞り込み');
    const sectorSelect=econEl('select','phase4-select career-sector-select');
    const any=econEl('option','','全業種');any.value='';sectorSelect.append(any);
    for(const sector of CAREER_SECTORS){const opt=econEl('option','',sector);opt.value=sector;sectorSelect.append(opt);}
    sectorSelect.value=job.targetSector??'';
    industry.append(sectorSelect);marketControls.append(industry);
    const listingLabel=econEl('label','career-posting-label','今月応募できる会社');
    const listingSelect=econEl('select','phase4-select career-posting-select');
    listingLabel.append(listingSelect);marketControls.append(listingLabel);
    const status=econEl('p','muted small career-posting-status');
    const apply=action(marketControls,'選んだ求人へ応募',()=>handlers.onAction?.('applyJob',{postingId:listingSelect.value}));
    const target=action(marketControls,'この業種を志望',()=>handlers.onAction?.('setCareerTarget',{sector:sectorSelect.value}));
    const intern=action(marketControls,'この業種でインターン',()=>handlers.onAction?.('internship',{sector:sectorSelect.value}));
    const update=()=>{
      listingSelect.replaceChildren();
      const listings=marketListings(game).filter(p=>!sectorSelect.value||p.sector===sectorSelect.value);
      for(const item of listings){
        const opt=econEl('option','',`${item.company}／${item.job}（${item.openings}枠）`);
        opt.value=item.id;listingSelect.append(opt);
      }
      const selected=EXTENDED_JOB_POSTINGS.find(p=>p.id===listingSelect.value);
      const offer=listings.find(p=>p.id===listingSelect.value);
      const eligibility=selected?careerEligibility(selected,game.education,job,age):'この条件の求人はありません。';
      const qual=selected?jobQualificationInfo(game.education,selected.id):null;
      const hiringScore=selected?Math.min(100,employmentScore(game.education,selected,job.experience)+Math.min(12,(job.internships?.[selected.sector]??0)*3)+(job.sector===selected.sector?7:0)):0;
      const chance=selected?hiringProbability(hiringScore,selected.threshold):0;
      status.textContent=selected?`${selected.job}｜月給${yen(selected.salary)}｜選考の目安${selected.threshold}点｜${eligibility??'応募条件を満たしています'}｜${offer?.phase??'募集中'}｜内定見込み約${chance}%（ゲーム内推定）｜必須資格：${qual?.required.map(q=>q.name).join('・')||'なし'}｜評価される資格：${qual?.preferred.map(q=>q.name).join('・')||'なし'}（取得済み${qual?.matched.length??0}）`:'この条件の求人はありません。';
      apply.disabled=!selected||!offer?.openings||Boolean(eligibility);
      target.disabled=!sectorSelect.value||job.targetSector===sectorSelect.value;
      intern.disabled=!sectorSelect.value||Boolean(job.job)||age<16||age>35||(job.internships?.[sectorSelect.value]??0)>=5;
    };
    listingSelect.addEventListener('change',update);
    sectorSelect.addEventListener('change',update);
    market.append(marketControls,status);
    // Unified qualification exam panel supersedes the old, easier medical exam button.
    if(['医学課程修了','歯学課程修了'].includes(game.education.degree))
      market.append(renderQualificationPanel(game,handlers.onAction,{career:true}));
    section.append(market);
    update();
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
  if(screen.id==='WORK-02'){
    const milestone=careerStage(job);
    section.append(renderQualificationPanel(game,handlers.onAction,{career:true}));
    if(job.sector)line(section,'現在の業界',job.sector);
    if(job.targetSector)line(section,'希望する業界',job.targetSector);
    if(job.politicalRank)line(section,'政治キャリア',`${job.politicalRank===3?'国会':job.politicalRank===2?'都道府県':'市区町村'}議員／議員経験${job.politicalExperience??0}か月`);
    if(job.reputation)line(section,'業界での実績',`${job.reputation}/100`);
    if(['創作','出版','飲食','金融','スポーツ','政治'].includes(job.sector)){
      const projects=econEl('details','phase4-extra');projects.append(econEl('summary','','職業固有の実績を積む'));
      action(projects,'作品・専門技能・実績を高める',()=>handlers.onAction?.('careerProject',{}));
      section.append(projects);
    }
    section.append(econEl('h3','','社会人キャリアの段階'));
    line(section,'現在の段階',milestone.name);
    line(section,'次に目指すこと',milestone.next);
    line(section,'勤続',`${job.experience??0}か月`);
    line(section,'人事評価',`${job.monthlyRating??50}点`);
    if(job.job){
      const plan=choiceButtons('これからの働き方',CAREER_PLANS.map(x=>({value:x.id,label:x.name})),job.plan??'balanced');
      const current=econEl('p','muted small',CAREER_PLANS.find(x=>x.id===(job.plan??'balanced'))?.description??'');
      plan.group.addEventListener('click',()=>{current.textContent=CAREER_PLANS.find(x=>x.id===plan.getValue())?.description??'';});
      const careerActions=econEl('div','career-development-actions');
      careerActions.append(plan.element,current);
      action(careerActions,'働き方を決定',()=>handlers.onAction?.('setCareerPlan',{plan:plan.getValue()}));
      section.append(careerActions);
    }
    const controls=econEl('div','phase4-actions');
    action(controls,'退職する',()=>handlers.onAction?.('resign',{}),!f.career.job);section.append(controls);
    line(section,'役職',`${job.rank??1}級`);
    const promote=econEl('div','phase4-actions');action(promote,'昇進審査を受ける',()=>handlers.onAction?.('promotionExam',{}),!job.job||job.experience<12);section.append(promote);
  }
  if(['LIFE-03','LIFE-04','LIFE-08'].includes(screen.id)){
    section.append(econEl('h3','','家計・資産状況'));
    line(section,'個人家計と事業会計は別管理',b.active?'事業売上は個人収入へ直接加算されません':'現在は事業なし');line(section,'毎月の基本生活費（自動計算）',yen(spendingPreview(game).adjusted));line(section,'これまでの収入',yen(f.totals.income));line(section,'これまでの支出',yen(f.totals.expenses));line(section,'税金・社会保険相当累計',yen(f.totals.tax));
  }
  if(screen.id==='LIFE-03'){
    const preview=spendingPreview(game);
     line(section,'自動計算の条件',`${preview.age}歳／${preview.region}／${game.finances.living?.housing??'実家'}`);
     line(section,'地域・家計方針適用後',yen(preview.adjusted));
     section.append(econEl('p','muted small',preview.note));
     const factors=REGIONAL_FACTORS[preview.region]??{living:1,jobs:1};
     line(section,'地域の暮らしと就職',`生活費係数${Math.round(factors.living*100)}%・求人倍率係数${Math.round(factors.jobs*100)}%（ゲーム内）`);
     const spouse=householdSummary(game);
     if(spouse.spouse)line(section,'配偶者の家計負担金',`${spouse.lastContribution.toLocaleString('ja-JP')}円／月・${spouse.description}`);
     const hardship=hardshipSummary(game);
     line(section,'家計再建の状態',`${hardship.status}（資金不足の継続${hardship.shortageMonths}か月）`);
     if(hardship.status!=='安定'){
       const recovery=econEl('details','phase4-extra');
       recovery.append(econEl('summary','','資金不足への対策・生活再建'));
       recovery.append(econEl('p','muted small','支出・住居費・就業状況を確認してください。引越しは既存の住まい画面から行えます。'));
       action(recovery,'生活再建支援を申請（架空制度）',()=>handlers.onAction?.('requestHouseholdRelief',{}),age<18);
       section.append(recovery);
     }
     const controls=econEl('div','phase4-actions');
     controls.append(econEl('h3','','お金の使い方（毎月継続）'));
     const spending=choiceButtons('家計方針',SPENDING_STYLES.map(x=>({label:x.name,value:x.id})),preview.style.id);
     const hint=econEl('p','muted small',preview.style.note);
     spending.group.addEventListener('click',()=>{hint.textContent=SPENDING_STYLES.find(x=>x.id===spending.getValue())?.note??'';});
     controls.append(spending.element,hint);
     action(controls,'この使い方を続ける',()=>handlers.onAction?.('setSpendingStyle',{styleId:spending.getValue()}),game.timeline.ageYears<18);
     section.append(controls);
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
    const fleet=[f.vehicle,...(f.vehicles??[])].filter(Boolean);
    line(section,'所有車',`${fleet.length}/5台`);
    line(section,'車両の合計評価額',yen(fleet.reduce((sum,v)=>sum+v.value,0)));
    line(section,'車両維持費（月額）',yen(fleet.reduce((sum,v)=>sum+(VEHICLE_OPTIONS.find(m=>m.id===v.id)?.monthlyCost??0),0)));
    if(fleet.length){
      const activeIndex=fleet.findIndex(v=>(v.fleetId??-1)===selectedVehicleFleetId);
      const fleetChoice=choiceButtons('管理する車',fleet.map((v,i)=>({value:i,label:`#${v.fleetId??i+1} ${VEHICLE_OPTIONS.find(m=>m.id===v.id)?.name??'車'}`})),activeIndex>=0?activeIndex:0,i=>{selectedVehicleFleetId=fleet[Number(i)]?.fleetId??-1;});
      const ownedActions=econEl('div','asset-action-row');
      ownedActions.append(fleetChoice.element);
      action(ownedActions,'選んだ車を売却',()=>handlers.onAction?.('sellVehicle',{fleetId:fleet[Number(fleetChoice.getValue())]?.fleetId}),false);
      section.append(ownedActions);
    }
    const models=choiceButtons('購入する車種',VEHICLE_OPTIONS.map(m=>({value:m.id,label:`${m.name}（${yen(m.price)}）`})),VEHICLE_OPTIONS[0].id);
    const purchase=econEl('div','asset-action-row');purchase.append(models.element);
    action(purchase,'選択した車を購入',()=>handlers.onAction?.('buyVehicle',{vehicleId:models.getValue()}),age<18||fleet.length>=5);
    section.append(purchase);
    section.append(econEl('p','muted small','車は5台まで所有でき、1台ごとに売却できます。購入費用・維持費・価値の減少はそれぞれの車に反映されます。'));
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
