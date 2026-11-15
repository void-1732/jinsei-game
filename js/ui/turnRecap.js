/** STEP 57: a read-only view of the most recent decision, derived from existing history.
 * No persistent state, extra actions, or RNG draws. Historical saves remain valid.
 */
export function latestTurnRecap(state){
  if(!state?.initialized || !state.timeline || !Array.isArray(state.eventHistory))return null;
  const turn=state.timeline.turnsElapsed;
  const event=state.eventHistory.findLast(item=>item?.type==='choice-result' && item.turn===turn);
  if(!event)return null;
  return {title:event.title,description:event.description,year:event.year,month:event.month};
}