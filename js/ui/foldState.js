/** UI-only fold preferences: independent of game saves and schema v7.
 * Persists by screen/detail ID, not by turn; storage failure is harmless.
 */
const STORAGE_KEY='gls:ui-folds:v1';
const MAX_FOLDS=300;
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
function storage(){
 try{return typeof window==='undefined'?null:window.localStorage;}catch{return null;}
}
function keyOf(detail,screenId){
 const summary=detail.querySelector(':scope > summary')?.textContent?.trim().slice(0,72)??'';
 const hint=detail.dataset.foldKey??`${detail.className}:${summary}`;
 const scope=detail.closest('[data-rendered-screen-id]')?.dataset.renderedScreenId??screenId;
 return `${scope}::${hint}`;
}
export function createFoldState(store=storage()){
 const states=new Map();
 try{
  const raw=store?.getItem(STORAGE_KEY);
  const saved=raw?JSON.parse(raw):{};
  if(saved&&typeof saved==='object'&&!Array.isArray(saved)){
   for(const [key,opened]of Object.entries(saved).slice(-MAX_FOLDS)){
    if(key.length<220&&typeof opened==='boolean')states.set(key,opened);
   }
  }
 }catch{/* unavailable or malformed preferences */}
 const save=()=>{
  try{store?.setItem(STORAGE_KEY,JSON.stringify(Object.fromEntries([...states].slice(-MAX_FOLDS))));}catch{}
 };
 const put=(key,opened,persist=true)=>{
  if(states.has(key))states.delete(key);
  states.set(key,Boolean(opened));
  while(states.size>MAX_FOLDS)states.delete(states.keys().next().value);
  if(persist)save();
 };
 const detailsOf=root=>root?[...root.querySelectorAll('details')]:[];
 return {
  /** Snapshot before a screen is replaced, including closed nested details. */
  capture(root,screenId){
   if(!root||!screenId)return;
   detailsOf(root).forEach(detail=>put(keyOf(detail,screenId),detail.open,false));
   save();
  },
  /** Restore and observe user toggles. Safe to call on each re-render. */
  restore(root,screenId){
   if(!root||!screenId)return;
   detailsOf(root).forEach(detail=>{
    const key=keyOf(detail,screenId);
    if(states.has(key))detail.open=states.get(key);
    detail.addEventListener('toggle',()=>put(key,detail.open));
   });
  },
  get(screenId,hint){return states.get(`${screenId}::${hint}`);}
 };
}
export const foldState=createFoldState();
