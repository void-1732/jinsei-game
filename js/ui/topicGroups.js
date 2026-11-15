/** STEP 44: group related legacy screens into focused, playable topic pages.
 * All 61 screen IDs remain available for saves, cross-links and historic tests.
 */
import {screenGroups,findScreen} from '../core/screenCatalog.js';
import {turnActivityOptions} from './turnActivities.js';
import {opportunityOptions} from '../core/opportunitySystems.js';

const ids=(prefix,from,to)=>Array.from({length:to-from+1},(_,i)=>`${prefix}-${String(from+i).padStart(2,'0')}`);
const specs={
  '人生':[
    ['人生ダッシュボード',['LIFE-01']],
    ['出来事と運勢',ids('EVENT',1,3)],
    ['人生の選択と節目',ids('EVENT',4,6)],
  ],
  '生活・資産':[
    ['住まい・日常',ids('LIFE',2,4)],
    ['家計・資産',ids('LIFE',5,6)],
    ['暮らしの備え',ids('LIFE',7,8)],
  ],
  '人物・家族':[
    ['家族・親族',ids('PERSON',1,3)],
    ['友人・恋愛',ids('PERSON',4,5)],
    ['人間関係・記録',ids('PERSON',6,7)],
  ],
  '学業':[
    ['学校・学習',ids('EDU',1,3)],
    ['進学・資格・履歴',ids('EDU',4,6)],
  ],
  '仕事・経営':[
    ['仕事・転職',ids('WORK',1,2)],
    ['職場・経営',ids('WORK',3,5)],
  ],
  '健康':[
    ['体調・治療',ids('HEALTH',1,4)],
    ['心と生活習慣',ids('HEALTH',5,8)],
  ],
  '社会':[
    ['社会と地域',ids('SOCIETY',1,4)],
    ['経済・ニュース',ids('SOCIETY',5,8)],
  ],
  '履歴':[
    ['人生の歩み',ids('HISTORY',1,3)],
    ['記録・振り返り',ids('HISTORY',4,7)],
  ],
  '設定':[
    ['保存・ゲーム設定',ids('SETTING',1,3)],
    ['管理・情報',ids('SETTING',4,6)],
  ],
};
export const topicGroups=Object.freeze(Object.fromEntries(Object.entries(specs).map(([category,items])=>[
  category,Object.freeze(items.map(([title,screenIds])=>Object.freeze({title,category,screenIds:Object.freeze(screenIds)})))
])));
const index=new Map(Object.values(topicGroups).flat().flatMap(topic=>topic.screenIds.map(id=>[id,topic])));
export const getTopic=id=>index.get(id)??null;
export const categoryLanding=category=>topicGroups[category]?.[0]?.screenIds[0]??'LIFE-01';
// The short action list is shared across the dashboard and every related category.
const actionCategory={
  study:'学業',skill:null,habit:'健康',treatment:'健康',socialize:'人物・家族',jobSearch:'仕事・経営',safetyPrep:null,
};
export function categoryActivities(state,category){
  const options=[...turnActivityOptions(state),...opportunityOptions(state,category).map(x=>({title:x.label,action:x.action,payload:x.payload}))];
  return options.filter(item=>{
    if(item.action==='safetyPrep')return item.payload.area==='health'?category==='健康':category==='生活・資産';
    if(item.action==='skill'){
      if(item.payload.skill==='運動')return category==='健康';
      if(item.payload.skill==='パソコン')return category==='仕事・経営'||category==='学業';
      return category==='学業';
    }
    return opportunityOptions(state,category).some(x=>x.action===item.action&&JSON.stringify(x.payload)===JSON.stringify(item.payload))||actionCategory[item.action]===category;
  });
}
export function hasFreeAction(state){
  return Boolean(state?.initialized&&!state.ending?.dead
    &&!state.pendingEvents.some(e=>e.type==='choice')
    &&!(state.turnActions?.turn===state.timeline.turnsElapsed&&state.turnActions.used>=1));
}
// Catch inadvertent gaps in the category-to-topic map during development.
export function assertTopics(){
  const expected=screenGroups.flatMap(g=>g.screens.map(s=>s.id));
  const included=Object.values(topicGroups).flat().flatMap(topic=>topic.screenIds);
  if(included.length!==expected.length||new Set(included).size!==expected.length||expected.some(id=>!index.has(id)))throw new Error('統合カテゴリの画面IDが不足・重複しています');
  for(const [category,topics]of Object.entries(topicGroups))for(const t of topics)for(const id of t.screenIds){
    if(findScreen(id)?.category!==category)throw new Error(`カテゴリが一致しません: ${id}`);
  }
  return true;
}
assertTopics();
