/** 第25段階：表示と操作の接続状況の棚卸し。ゲーム状態は変更しない。 */
import {allScreens, screenGroups} from './screenCatalog.js';
import {screenDetails} from './screenDetails.js';

const presentation = Object.freeze([
  {prefix:'LIFE-', label:'家計・資産', panel:'家計・資産の基本情報と一部操作'},
  {prefix:'PERSON-', label:'人物・家族', panel:'人物・家族の基本情報と一部操作'},
  {prefix:'EDU-', label:'学業', panel:'学業の基本情報と一部操作'},
  {prefix:'WORK-', label:'仕事・経営', panel:'仕事・企業の基本情報と一部操作'},
  {prefix:'HEALTH-', label:'健康', panel:'健康・医療の基本情報と一部操作'},
  {prefix:'SOCIETY-', label:'社会', panel:'社会・経済の基本情報'},
  {prefix:'EVENT-', label:'人生イベント', panel:'イベントの基本情報・一部操作'},
  {prefix:'HISTORY-', label:'人生履歴', panel:'人生履歴の基本情報'},
  {prefix:'SETTING-', label:'設定', panel:'保存・読込の案内（操作は画面上部）'},
]);
export function getScreenCoverage(id){
  const screen=allScreens.find(s=>s.id===id);
  if(!screen)return null;
  const domain=presentation.find(x=>id.startsWith(x.prefix));
  const spec=screenDetails[id];
  return Object.freeze({id,title:screen.title,category:screen.category,
    connected:!!domain,connectedDescription:domain?.panel??'接続済みの個別パネルなし',
    plannedFields:spec.fields.length,plannedActions:spec.plannedActions.length,
    relatedScreens:spec.related.length,
    state:'一部接続（開発中）'});
}
export function createCoverageReport(){
  const screens=allScreens.map(s=>getScreenCoverage(s.id));
  return Object.freeze({screens, totalScreens:screens.length, categories:screenGroups.length,
    connectedScreens:screens.filter(x=>x.connected).length,
    pendingActionLabels:screens.reduce((sum,x)=>sum+x.plannedActions,0),
    rows:screenGroups.map(group=>Object.freeze({category:group.category,
      screens:group.screens.length,
      connected:group.screens.filter(s=>getScreenCoverage(s.id).connected).length,
      plannedActions:group.screens.reduce((n,s)=>n+getScreenCoverage(s.id).plannedActions,0)}))});
}
