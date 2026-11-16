/** U5: non-intrusive guidance, limited to four compact items. */
import {lifeGuidance} from '../core/lifeGuidance.js';
const node=(tag,cls='',txt='')=>{const e=document.createElement(tag);e.className=cls;e.textContent=txt;return e;};
export function renderLifeGuidancePanel(state,onNavigate){
 const guidance=lifeGuidance(state);
 const notes=[...guidance.warnings,...guidance.suggestions];
 if(!notes.length)return null;
 const card=node('section','play-card life-guidance-card');
 card.append(node('h3','','今月のおすすめ・注意点'));
 const list=node('div','life-guidance-list');
 for(const item of [...guidance.warnings.slice(0,2),...guidance.suggestions]){
  const row=node('div','life-guidance-item'+(item.level==='high'?' is-warning':''));
  const description=node('div','life-guidance-copy');
  const header=node('strong','',item.title);
  description.append(header,node('p','',item.description));
  const open=node('button','button button-secondary life-guidance-link','確認する');
  open.type='button';
  open.setAttribute('aria-label',`${item.title}を確認する`);
  open.addEventListener('click',()=>onNavigate?.(item.destination));
  row.append(description,open);list.append(row);
 }
 card.append(list);
 if(guidance.warnings.length>2){
  const extra=node('details','life-guidance-extra');
  extra.append(node('summary','',`その他の注意点（${guidance.warnings.length-2}件）`));
  const extraList=node('div','life-guidance-list');
  for(const item of guidance.warnings.slice(2)){
   const row=node('div','life-guidance-item is-warning');
   const copy=node('div','life-guidance-copy');
   copy.append(node('strong','',item.title),node('p','',item.description));
   const open=node('button','button button-secondary life-guidance-link','確認する');
   open.type='button';open.addEventListener('click',()=>onNavigate?.(item.destination));
   row.append(copy,open);extraList.append(row);
  }
  extra.append(extraList);card.append(extra);
 }
 card.append(node('p','life-guidance-hint',guidance.pending?
  '先に重要な出来事を選択してください。おすすめ画面の確認は可能です。':
  `残り自由行動：${guidance.remaining}回。おすすめの表示だけでは行動回数を消費しません。`));
 return card;
}
