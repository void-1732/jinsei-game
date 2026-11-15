/** 自動発生する人生の選択イベント。選択操作があるまで保留。 */
export function createChoiceEvent(date,turn,age,randomValue){
 if(age<15||date.month!==4||randomValue>=0.24)return null;
 return {id:`T${turn}-choice`,type:'choice',year:date.year,month:date.month,turn,blocking:false,
  title:'人生の選択：新年度の過ごし方',description:'今年は何を大切に過ごしますか？',
  options:[{id:'rest',label:'心身の健康を優先する'},{id:'study',label:'学びを優先する'},{id:'social',label:'人との交流を優先する'}]};
}
export function resolveChoice(state,id,choice){
 const event=state.pendingEvents.find(e=>e.id===id&&e.type==='choice'&&Array.isArray(e.options));
 if(!event)return {ok:false,reason:'選択待ちのイベントがありません。'};
 if(!event.options.some(o=>o.id===choice))return {ok:false,reason:'無効な選択肢です。'};
 const clamp=n=>Math.max(0,Math.min(100,n));
 if(choice==='rest'){state.health.physical=clamp(state.health.physical+6);state.health.mental=clamp(state.health.mental+8);}
 else if(choice==='study'){for(const key of ['国語','数学'])state.education.scores[key]=clamp(state.education.scores[key]+3);}
 else if(choice==='social'){for(const person of state.people.filter(p=>p.role!=='本人'))person.relationship=clamp(person.relationship+4);}
 event.resolved=choice;
 state.pendingEvents=state.pendingEvents.filter(e=>e.id!==id);
 state.eventHistory.push({id:`${id}-result`,type:'choice-result',title:'人生の選択を確定',description:event.options.find(o=>o.id===choice).label,year:state.timeline.year,month:state.timeline.month,turn:state.timeline.turnsElapsed,blocking:false});
 return {ok:true};
}
