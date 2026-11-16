/** 第26段階：保存されたゲーム状態から画面の設計項目へ値を投影する読み取り専用アダプター。
 * モデル未実装の住居・保険・地域などは値を捏造せず未接続のままにする。
 */
import {estateBreakdown} from './estateSystems.js';
const yen = n => `${Math.round(n).toLocaleString('ja-JP')}円`;
const number = n => `${Number(n).toLocaleString('ja-JP')}`;
const date = x => x ? `${x.year}年${x.month}月` : '記録なし';
const recent = (arr, limit=1) => (Array.isArray(arr) ? arr.slice(-limit) : []);
const shown = value => value == null || value === '' ? '記録なし' : String(value);
const map = (entries) => Object.fromEntries(entries);

export function getScreenFieldValues(id, state) {
  if (!state?.initialized) return Object.freeze({});
  const f=state.finances, e=state.education, h=state.health, w=state.world;
  const t=state.timeline, people=state.people??[], b=f?.business, c=f?.career;
  const ledger=f?.ledger??[], history=state.eventHistory??[];
  const last=ledger.at(-1), recentFinance=recent(ledger,12);
  const averageScore=e ? Math.round(Object.values(e.scores).reduce((a,v)=>a+v,0)/Math.max(1,Object.keys(e.scores).length)):null;
  const totalWealth=f?estateBreakdown(f).netAssets:0;
  const living=f?.living;
  const housingCost=living?.monthlyHousingCost??0;
  const portfolioValue=(living?.properties??[]).reduce((sum,p)=>sum+(p.value??0),0);
  const portfolioLoans=(living?.properties??[]).reduce((sum,p)=>sum+(p.loanBalance??0)+(p.arrears??0),0);
  const carValue=[f?.vehicle,...(f?.vehicles??[])].filter(Boolean).reduce((sum,v)=>sum+(v.value??0),0);
  const assetCount=(living?.housing==='持ち家'?1:0)+(living?.properties?.length??0);
  const insurancePremium=({未加入:0,基本保障:3000,充実保障:7000})[living?.insurance??'未加入']??0;
  const values={
    'LIFE-01':{'人生サマリー':`${state.player.name}・${t.ageYears}歳・${t.year}年${t.month}月`,'家族・仕事・家計・健康':`${people.length}人・${c.job??'無職'}・現金${yen(f.cash)}・健康${h.physical}点`,'重要イベント':`${state.pendingEvents?.length??0}件`},
    'LIFE-02':{'居住地域':living?.region??'未設定','住居種別':living?.housing??'実家','所有・賃貸':living?.housing==='持ち家'?'所有':living?.housing==='賃貸'?'賃貸':'実家','居住費':yen(housingCost),'引越し履歴':`${living?.moves?.length??0}件`,'住宅ローン':yen((living?.mortgageBalance??0)+portfolioLoans),'所有不動産':`${assetCount}件`,'所有車両':`${(f?.vehicle?1:0)+(f?.vehicles?.length??0)}台`},
    'LIFE-07':{'加入保険':living?.insurance??'未加入','保障内容':living?.insurance==='充実保障'?'体調不良の給付40,000円':living?.insurance==='基本保障'?'体調不良の給付15,000円':'任意保障なし','保険料':yen(insurancePremium),'給付見込み':living?.insurance==='未加入'?'給付なし':'病気発生時に請求可能'},
    'SOCIETY-06':{'地域名':living?.region??'未設定','人口規模':'未実装・未接続','物価・生活費':`${yen(housingCost)}（住居費）`,'雇用環境':'地域別就業係数を簡易設定','地域特性':'国内主要10地域から選択可能'},
    'LIFE-03':{'収入内訳':`給与${yen(c.monthlySalary)}・副業${yen(f.sideJob.active?f.sideJob.monthlyIncome:0)}`,'支出内訳':`基本生活費${yen(f.monthlyBudget)}・住居費${yen(housingCost)}・保険料${yen(insurancePremium)}・年金${yen(t.ageYears>=18&&t.ageYears<65&&(living?.pensionMode??'通常納付')==='通常納付'?4000:0)}`,'固定費':yen(f.monthlyBudget+housingCost+insurancePremium+(t.ageYears>=18&&t.ageYears<65&&(living?.pensionMode??'通常納付')==='通常納付'?4000:0)+(living?.mortgageBalance>0?(living?.mortgagePayment??0):0)),'家計履歴':`${ledger.length}件`,'当月収支':yen(recentFinance.filter(x=>x.year===t.year&&x.month===t.month).reduce((sum,x)=>sum+(x.amount??0),0))},
    'LIFE-04':{'現金':yen(f.cash),'預金残高':`未管理（現金${yen(f.cash)}）`,'資産構成':`現金${yen(f.cash)}・投資${yen(f.investment)}・住宅純資産${yen((living?.propertyValue??0)+portfolioValue-(living?.mortgageBalance??0)-portfolioLoans)}・車両${yen(carValue)}・個人借入${yen(f.debt)}`,'残高履歴':`${ledger.length}件の取引記録`},
    'LIFE-05':{'時価評価':yen(f.investment),'取引履歴':`${ledger.filter(x=>/投資/.test(x.label??'')).length}件`},
    'LIFE-06':{'残高':yen(f.debt),'返済予定':`事業融資${yen(b.loanBalance??0)}（個人借入とは別）`},
    'LIFE-08':{'資産推移':`${ledger.length}件の家計履歴`,'収支推移':`${ledger.length}件の家計取引`,'取引年表':shown(last?`${date(last)}：${last.label}`:null)},
    'PERSON-01':{'人物名':state.player.name,'年齢':`${t.ageYears}歳`,'関係性':`${people.length}人登録`,'人物一覧':people.map(p=>p.name).join('、')},
    'PERSON-02':{'氏名・生年月日':`${state.player.name}・2000年1月1日`,'人物ID':state.player.id,'関係・履歴':`${people.length}人の人物情報`},
    'PERSON-03':{'世帯構成':`${state.household?.memberIds?.length??0}人（登録世帯）`,'続柄':people.map(p=>p.role).join('・')},
    'PERSON-04':{'親子関係':`${people.filter(p=>['父','母','子'].includes(p.role)).length}人`,'婚姻関係':people.some(p=>p.role==='配偶者')?'配偶者あり':'配偶者なし'},
    'PERSON-05':{'友人':`${people.filter(p=>p.role==='友人').length}人`,'親密度':people.filter(p=>p.role==='友人').map(p=>`${p.name}：${p.relationship}点`).join('、')||'対象なし'},
    'PERSON-06':{'交際状況':people.some(p=>p.role==='交際相手')?'交際中':'交際相手なし','パートナー':people.find(p=>['交際相手','配偶者'].includes(p.role))?.name??'なし','婚姻状況':people.some(p=>p.role==='配偶者')?'既婚':'未婚'},
    'PERSON-07':{'人物の出来事':`${history.filter(x=>x.type==='action').length}件の行動履歴`,'期間':`${t.year}年${t.month}月現在`},
    'EDU-01':{'学校・学年':`${e.school||e.stage}${e.grade?`・${e.grade}年生`:''}`,'学習状況':`累計${e.studyHours}時間`,'進学予定':e.universityChoice,'直近の学業イベント':shown(e.history.at(-1)?.text)},
    'EDU-02':{'学校名':e.school||'在籍校なし','学校種別':e.stage,'学年・学期':e.grade?`${e.grade}年生`:'学年なし','出席':`${e.attendance}点（ゲーム内指標）`},
    'EDU-03':{'科目':Object.keys(e.scores).join('・'),'学習時間':`${e.studyHours}時間`,'学力・成績':`平均${averageScore}点`,'得意科目':Object.entries(e.scores).sort((a,z)=>z[1]-a[1])[0]?.[0]??'未記録'},
    'EDU-04':{'志望校・進路':e.universityChoice,'合否':e.entrance.status,'進学決定':e.entrance.destination??'未決定'},
    'EDU-05':{'技能':Object.entries(e.skills).map(([k,v])=>`${k}${v}点`).join('・')||'未習得','熟練度':`${Object.keys(e.skills).length}種類を記録`},
    'EDU-06':{'学歴年表':`${e.history.length}件`,'入学・卒業':shown(e.history.at(-1)?.text),'受験履歴':e.entrance.status,'学業イベント':`${e.history.length}件`},
    'WORK-01':{'雇用状況':c.job?'就業中':'無職','勤務先':c.company??'なし','職業':c.job??'なし','給与':yen(c.monthlySalary),'職歴サマリー':`勤続${c.experience}か月`},
    'WORK-02':{'応募状況':`${f.jobApplications?.length??0}件の記録`,'雇用条件':`現在の月給${yen(c.monthlySalary)}`,'転職履歴':`${c.jobChanges}回`},
    'WORK-03':{'企業名':c.company??'勤務先なし','従業員数':`${b.employees??0}人（自分の事業）`,'企業の状況':b.status??'未設立'},
    'WORK-04':{'副業':f.sideJob.active?'活動中':'停止中','事業内容':b.name??'未設立','売上':yen(b.monthlyRevenue),'費用':yen(b.monthlyCosts),'利益・経営状況':b.status},
    'WORK-05':{'昇進':`${c.promotions}回`,'転職':`${c.jobChanges}回`,'給与推移':`現在${yen(c.monthlySalary)}`,'事業履歴':`${b.cashFlowHistory?.length??0}か月`},
    'HEALTH-01':{'健康総合評価':`${h.physical}点`,'体力':`${h.energy}点`,'精神状態':`${h.mental}点`,'治療状況':h.illness?.name??'病気なし'},
    'HEALTH-02':{'身体状態':`${h.physical}点`,'体力':`${h.energy}点`,'身体変化':`${h.healthHistory.length}か月分`},
    'HEALTH-03':{'病気・けが':h.illness?.name??'なし','回復状況':h.illness?`経過${h.illness.months}か月`:'療養中の病気なし'},
    'HEALTH-04':{'受診状況':`${h.medicalVisits}回`,'診療・治療':h.illness?.name??'治療対象なし','医療費':'ゲーム内の本人負担は1回3,500円（簡易保障適用後）'},
    'HEALTH-05':{'精神状態':`${h.mental}点`,'変化履歴':`${h.healthHistory.length}件`},
    'HEALTH-06':{'運動':`${h.habits.運動}点`,'食生活':`${h.habits.食生活}点`,'生活習慣の傾向':`運動${h.habits.運動}・休養${h.habits.休養}・食生活${h.habits.食生活}`},
    'HEALTH-08':{'健康年表':`${h.healthHistory.length}件`,'健康指標推移':`身体${h.physical}・精神${h.mental}・体力${h.energy}`},
    'SOCIETY-01':{'社会情勢':w.phase,'日本経済':`ゲーム内景気指数${w.economyIndex}`,'最近のニュース':shown(w.news[0]?.title)},
    'SOCIETY-02':{'景気':w.phase,'物価':`${w.priceIndex}（架空指数）`,'雇用':`${w.employmentIndex}（架空指数）`,'経済動向':`${w.economyIndex}（架空指数）`},
    'SOCIETY-05':{'記事一覧':`${w.news.length}件`,'発生日':shown(w.news[0]?date(w.news[0]):null),'関連イベント':`${w.history.length}件`},
    'SOCIETY-08':{'西暦':`${t.year}年`,'年代別年表':`${w.history.length}件の架空ニュース履歴`},
    'EVENT-01':{'重要イベント':`${state.pendingEvents.length}件`,'選択待ち':`${state.pendingEvents.filter(x=>x.type==='choice').length}件`},
    'EVENT-02':{'選択中イベント':`${state.pendingEvents.filter(x=>x.type==='choice').length}件`},
    'EVENT-04':{'総合評価':state.ending.dead?`${state.ending.score}点`:'人生終了時に確定'},
    'EVENT-05':{'主な出来事':`${history.length}件`,'人生の記録':shown(history.at(-1)?.title)},
    'EVENT-06':{'終了した人生':state.ending.dead?'終了':'進行中','最終評価':state.ending.dead?`${state.ending.score}点`:'未確定'},
    'HISTORY-01':{'期間':`2000年～${t.year}年`,'出来事':`${history.length}件`,'人生年表':shown(history.at(-1)?.title)},
    'HISTORY-02':{'総資産':yen(totalWealth),'履歴一覧':`${ledger.length}件`},
    'HISTORY-03':{'勤務先':c.company??'なし','職種':c.job??'なし','給与変化':yen(c.monthlySalary)},
    'HISTORY-04':{'学校・資格':e.school||e.stage,'受験結果':e.entrance.status,'卒業':e.graduated?'学業課程修了':'未修了'},
    'HISTORY-05':{'健康状態':`身体${h.physical}点`,'健康イベント':`${h.healthHistory.length}件`},
    'HISTORY-06':{'相手':`${people.length}人登録`,'関係性':people.map(p=>p.role).join('・')},
    'HISTORY-07':{'人生一覧':state.ending.dead?'1件（現在の人生）':'終了済みの人生なし','人生評価':state.ending.dead?`${state.ending.score}点`:'未確定'},
    'SETTING-06':{'バージョン':'2.9.0','画面数':'61画面・9カテゴリ','動作環境':'パソコン向けブラウザ','実装段階':'第28段階（試作版）'},
  };
  return Object.freeze(values[id]??{});
}
export function getConnectedFieldCount(id,state,fields){
  const values=getScreenFieldValues(id,state);
  return fields.filter(field=>Object.hasOwn(values,field)).length;
}
