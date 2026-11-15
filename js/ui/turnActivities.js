/** A compact optional action per turn. The store checks the limit independently. */
const E=(tag,cls='',text='')=>{const n=document.createElement(tag);n.className=cls;n.textContent=text;return n;};
const option=(title,action,payload)=>({title,action,payload});
export function turnActivityOptions(state){
  if(!state?.initialized)return [];
  const age=state.timeline.ageYears;
  const options=[option('読書を練習する','skill',{skill:'読書'}),option('運動を練習する','skill',{skill:'運動'}),option('パソコンを練習する','skill',{skill:'パソコン'}),option('休養を取る','habit',{habit:'休養'})];
  if(['小学校','中学校','高校','大学'].includes(state.education.stage))
    options.unshift(option('国語を1時間勉強する','study',{subject:'国語',hours:1}));
  if(age>=8){
    const prepared=state.surprise53?.prepared??{};
    for(const [area,title] of [['disaster','防災の備えを整える'],['security','詐欺への備えを学ぶ'],['health','応急対応を学ぶ']])
      if((prepared[area]??0)<5)options.push(option(title,'safetyPrep',{area}));
  }
  if(age>=6){
    const person=state.people.find(p=>p.role==='父'||p.role==='母');
    if(person)options.push(option('家族と交流する','socialize',{personId:person.id}));
  }
  if(state.health.illness)options.unshift(option('病気の治療を受ける','treatment',{}));
  if(age>=18&&!state.finances.career.job)options.push(option('仕事を探す','jobSearch',{}));
  return options;
}
export function renderTurnActivity(state,onAction){
  const box=E('section','play-card turn-activity');
  const heading=E('div','play-card-heading');heading.append(E('h3','','このターンの自由行動'),E('span','','任意・1回まで'));
  box.append(heading);
  const pending=state.pendingEvents.some(e=>e.type==='choice');
  const done=state.turnActions?.turn===state.timeline.turnsElapsed&&state.turnActions.used>=1;
  if(pending){box.append(E('p','turn-activity-note','まず「次のターンへ進む」から出来事を選んでください。'));return box;}
  if(done){box.append(E('p','turn-activity-note','今のターンの自由行動は完了しました。次のターンでまた行動できます。'));return box;}
  const form=E('div','turn-activity-form');
  const label=E('label','','行動を選ぶ');
  const select=E('select','turn-activity-select');
  const actions=turnActivityOptions(state);
  for(const item of actions){const entry=E('option','',item.title);entry.value=item.action+':'+actions.indexOf(item);select.append(entry);}
  label.append(select);
  const confirm=E('button','button button-secondary','行動する');confirm.type='button';
  confirm.addEventListener('click',()=>{const i=select.selectedIndex;if(i>=0)onAction?.(actions[i].action,actions[i].payload);});
  confirm.disabled=!actions.length;
  form.append(label,confirm);box.append(form,E('p','turn-activity-note','出来事の選択は自由行動に含みません。能力は高くなるほど伸びにくくなります。'));
  return box;
}
