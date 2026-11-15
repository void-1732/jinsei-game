/** 第38段階：ゲーム状態を変更しない統合診断。既存の保存形式は変更しない。 */
import {validateGameState} from './saveSystems.js';
import {auditLivingAccounts} from './livingSystems.js';
import {estateBreakdown,validateInheritance} from './estateSystems.js';

export function auditGameIntegrity(state){
 const issues=[];
 if(!validateGameState(state))issues.push('保存形式または基本ゲーム状態が不正です');
 if(!state?.initialized)return {ok:issues.length===0,issues};
 const f=state.finances;
 if(!f)return {ok:false,issues:[...issues,'家計データがありません']};
 const living=auditLivingAccounts(f);
 for(const issue of living.issues)issues.push(`住居・年金：${issue}`);
 const b=f.business??{};
 if(Array.isArray(b.loanContracts)){
  const sum=b.loanContracts.reduce((n,c)=>n+(c.principal??0),0);
  if(sum!==(b.loanBalance??0))issues.push('事業融資契約と融資残高が一致しません');
 }
 if(Array.isArray(b.equipmentItems) && b.equipmentItems.length){
  const sum=b.equipmentItems.reduce((n,c)=>n+(c.bookValue??0),0);
  if(sum!==(b.equipmentValue??0))issues.push('設備台帳と設備資産残高が一致しません');
 }
 if(state.ending?.dead){
  if(!validateInheritance(state.ending.inheritance))issues.push('相続明細が不正です');
  else if(state.ending.inheritance.breakdown){
   const current=estateBreakdown(f);
   const previous=state.ending.inheritance.breakdown;
   for(const key of ['grossAssets','liabilities','netAssets']){
    if(current[key]!==previous[key])issues.push(`死亡時の${key}と保存済み相続明細が一致しません`);
   }
  }
 }
 return {ok:issues.length===0,issues};
}
