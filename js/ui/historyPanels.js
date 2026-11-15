/** 第7段階：履歴・死亡・保存状況の読み取り専用パネル。 */
const historyEl=(tag,cls='',value='')=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value)n.textContent=value;return n;};
export function renderHistoryPanel(root,screen,state){
 if(!screen.id.startsWith('HISTORY-') && !screen.id.startsWith('SETTING-') && !['EVENT-05','EVENT-06'].includes(screen.id))return false;
 const section=historyEl('section','content-card phase7-history');section.append(historyEl('h2','',screen.id.startsWith('SETTING-')?'保存・読込の案内':'人生年表・記録'));
 if(!state?.initialized){section.append(historyEl('p','muted','人生を開始すると記録が表示されます。'));root.prepend(section);return true;}
 const ending=state.ending;
 if(ending?.dead){
  section.append(historyEl('h3','','人生の終了'),historyEl('p','',`${ending.date.year}年${ending.date.month}月、${ending.date.age}歳で人生を終えました。理由：${ending.cause}`),historyEl('p','',`人生評価：${ending.score}点（ゲーム独自の簡易評価）`));
  const inheritance=ending.inheritance;
  if(inheritance){section.append(historyEl('h3','','簡易相続'),historyEl('p','',`正味資産：${inheritance.netAssets.toLocaleString('ja-JP')}円 ／ 仮の相続税：${inheritance.simplifiedTax.toLocaleString('ja-JP')}円`));if(inheritance.breakdown){
    const b=inheritance.breakdown;
    const yen=n=>`${n.toLocaleString('ja-JP')}円`;
    section.append(historyEl('h3','','死亡時の財産内訳'));
    for(const [label,value] of [['現金',b.cash],['投資評価額',b.investments],['住宅評価額',b.home],['事業運転資金',b.businessCash],['事業設備',b.businessEquipment],['個人負債',-b.personalDebt],['住宅ローン残高',-b.mortgage],['事業未払金',-b.businessDebt],['事業融資残高',-b.businessLoans],['資産合計',b.grossAssets],['債務合計',-b.liabilities],['負債控除後の純資産',b.netAssets]])section.append(historyEl('p','',`${label}：${yen(value)}`));
    section.append(historyEl('p','muted','老齢年金の受給見込みは相続財産に含めていません。相続税・分配はゲーム独自の簡易計算です。'));
  }
  for(const heir of inheritance.heirs)section.append(historyEl('p','',`${heir.name}：${heir.amount.toLocaleString('ja-JP')}円`));}
 }
 const events=state.eventHistory.slice(-70).reverse();
 section.append(historyEl('h3','',`主な人生記録（最新${events.length}件）`));
 if(!events.length)section.append(historyEl('p','muted','まだ記録はありません。'));
 for(const event of events){const line=historyEl('div','phase7-history-item');line.append(historyEl('strong','',`${event.year}年${event.month}月　${event.title}`),historyEl('p','muted small',event.type==='action'?'プレイヤーの操作を記録しました。':event.description??''));section.append(line);}
 root.prepend(section);return true;
}
