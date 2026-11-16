/** Administrative business operations use their own three-action monthly budget.
 * This avoids consuming the single life decision for ordinary equipment management.
 */
export const BUSINESS_OPERATIONS=Object.freeze([
 'serviceEquipment','repairEquipment','toggleEquipmentMaintenance','scheduleEquipmentRepair',
 'sellEquipmentItem','replaceEquipment','purchaseEquipment','sellEquipment',
 'setContractRepayment','setLoanRepayment','restructureBusinessDebt',
 'settleBusinessPayable','businessLoan','repayBusinessLoan','businessFunding','ownerDraw',
 'businessPolicy','hireEmployee','trainStaff','dismissStaff','staffCare','restartBusiness',
]);
const set=new Set(BUSINESS_OPERATIONS);
export const isBusinessOperation=action=>set.has(action);
export function businessActionsRemaining(state){
 if(!state?.initialized||state?.ending?.dead||state.pendingEvents?.some(e=>e.type==='choice'))return 0;
 return Math.max(0,3-(state.businessTurn?.turn===state.timeline.turnsElapsed?state.businessTurn.used:0));
}
export function validateBusinessTurn(turn,maxTurn){
 return turn&&Number.isInteger(turn.turn)&&turn.turn>=0&&turn.turn<=maxTurn
  &&Number.isInteger(turn.used)&&turn.used>=0&&turn.used<=3;
}
