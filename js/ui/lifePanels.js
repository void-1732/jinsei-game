/** 第4段階：実ゲームデータに接続した人物・学業パネル。DOM生成はテキスト限定。 */
const lifeEl=(tag,cls='',text='')=>{const n=document.createElement(tag);n.className=cls;n.textContent=text;return n;};
function line(root,key,value){const row=lifeEl('div','field-list-item');row.append(lifeEl('strong','',key),lifeEl('span','',String(value)));root.append(row);}
function action(root,label,callback){const b=lifeEl('button','button button-secondary phase4-action',label);b.type='button';b.addEventListener('click',callback);root.append(b);return b;}
export function renderLifePanel(container,screen,game,handlers={}){
  if(!screen.id.startsWith('PERSON-')&&!screen.id.startsWith('EDU-')&&screen.id!=='LIFE-01')return false;
  const section=lifeEl('section','content-card phase4-panel');section.append(lifeEl('h2','','人物・家族・学業の状況'));
  if(!game?.initialized){section.append(lifeEl('p','muted','「人生を開始」すると、家族や学業の情報が表示されます。'));container.prepend(section);return true;}
  const t=game.timeline,e=game.education,people=game.people;
  if(screen.id.startsWith('PERSON-')||screen.id==='LIFE-01'){
    const heading=lifeEl('h3','','家族・人物');section.append(heading);
    for(const p of people){const age=t.year-p.birth.year-(t.month<p.birth.month?1:0);line(section,`${p.role}：${p.name}`,`${age}歳 / 関係値 ${p.relationship}${p.role==='子'?` / ${p.lifeStage??'未就学'}`:''}`);}
    if(screen.id==='PERSON-05'||screen.id==='PERSON-06'||screen.id==='PERSON-01'){
      const controls=lifeEl('div','phase4-actions');
      for(const p of people.filter(v=>v.role!=='本人')) action(controls,`${p.role}と交流する`,()=>handlers.onAction?.('socialize',{personId:p.id}));
      section.append(controls);
    }
    if(['PERSON-01','PERSON-04','PERSON-05','PERSON-06'].includes(screen.id)){
      const controls=lifeEl('div','phase4-actions');
      action(controls,'新しい友人と知り合う',()=>handlers.onAction?.('meetFriend',{}));
      const candidates=people.filter(p=>p.role==='友人'||p.role==='交際相手');
      for(const p of candidates){
        if(p.role==='友人')action(controls,`${p.name}と交際する（親密度60以上）`,()=>handlers.onAction?.('date',{personId:p.id}));
        if(p.role==='交際相手')action(controls,`${p.name}と結婚する（親密度80以上）`,()=>handlers.onAction?.('marry',{personId:p.id}));
      }
      section.append(controls);
    }
    if(['PERSON-01','PERSON-02','PERSON-03'].includes(screen.id)){
      const spouse=people.find(p=>p.role==='配偶者');
      if(spouse){
        const controls=lifeEl('div','phase4-actions');const name=lifeEl('input','phase4-select');name.placeholder='子どもの名前';name.maxLength=20;name.setAttribute('aria-label','子どもの名前');
        controls.append(name);action(controls,'子どもを迎える',()=>handlers.onAction?.('haveChild',{name:name.value}));
        for(const child of people.filter(p=>p.role==='子')){
          action(controls,`${child.name}と過ごす`,()=>handlers.onAction?.('familyCare',{personId:child.id}));
          action(controls,`${child.name}と勉強する`,()=>handlers.onAction?.('familyActivity',{personId:child.id,activity:'勉強を手伝う'}));
        }
        section.append(controls);
      }
    }
    if(screen.id==='PERSON-07')for(const record of game.eventHistory.filter(v=>v.type==='action'&&v.title==='交流').slice(-12).reverse())line(section,`${record.year}年${record.month}月`,'家族と交流');
  }
  if(screen.id.startsWith('EDU-')||screen.id==='LIFE-01'){
    section.append(lifeEl('h3','','学業・学校'));
    line(section,'在学状況',e.stage==='未就学'?'未就学':e.stage==='卒業'?'学業課程修了':`${e.school} / ${e.grade}年生`);
    line(section,'累計学習時間',`${e.studyHours}時間`);
    line(section,'進路方針',e.universityChoice);
    if(e.schoolPreference)line(section,'志望校',`${e.schoolPreference.高校??'自動'}／${e.schoolPreference.大学??'自動'}`);
    if(screen.id==='EDU-03'||screen.id==='EDU-01'){
      const scoreArea=lifeEl('div','phase4-scores');
      for(const [name,score] of Object.entries(e.scores))line(scoreArea,name,`${score} / 100`);
      section.append(scoreArea);
      const controls=lifeEl('div','phase4-actions');
      const subject=lifeEl('select','phase4-select');for(const key of Object.keys(e.scores)){const opt=lifeEl('option','',key);opt.value=key;subject.append(opt);}
      const hours=lifeEl('select','phase4-select');for(const n of [1,2,4,8]){const opt=lifeEl('option','',`${n}時間`);opt.value=n;hours.append(opt);}
      controls.append(subject,hours);action(controls,'選んだ科目を学習',()=>handlers.onAction?.('study',{subject:subject.value,hours:Number(hours.value)}));section.append(controls);
    }
    if(screen.id==='EDU-04'){
      line(section,'受験準備の回数',`${e.examPreparation??0}回`);
      line(section,'受験結果',`${e.entrance.status}${e.entrance.destination?`：${e.entrance.destination}`:''}`);
      const controls=lifeEl('div','phase4-actions');
      if(['中学校','高校'].includes(e.stage)){
        const stage=e.stage==='中学校'?'高校':'大学';
        const select=lifeEl('select','phase4-select');
        for(const school of stage==='高校'?['自動','進学校','県立高校','地域高校']:['自動','難関大学','総合大学','地域大学']){
          const option=lifeEl('option','',school);option.value=school;select.append(option);
        }
        select.value=e.schoolPreference?.[stage]??'自動';controls.append(select);
        action(controls,'志望校を設定',()=>handlers.onAction?.('chooseSchool',{stage,school:select.value}));
      }
      action(controls,'受験対策をする（全科目＋2）',()=>handlers.onAction?.('prepareExam',{}));
      action(controls,'大学進学を希望',()=>handlers.onAction?.('university',{choice:'進学'}));
      action(controls,'高校卒業後の就職を希望',()=>handlers.onAction?.('university',{choice:'就職'}));section.append(controls);
    }
    if(screen.id==='EDU-05'){
      for(const [name,val]of Object.entries(e.skills))line(section,name,`習熟度 ${val}`);
      const controls=lifeEl('div','phase4-actions');for(const skill of ['読書','パソコン','運動'])action(controls,`${skill}を練習`,()=>handlers.onAction?.('skill',{skill}));section.append(controls);
    }
    if(screen.id==='EDU-06'){
      if(!e.history.length)section.append(lifeEl('p','muted','学業履歴はまだありません。'));
      for(const entry of e.history.slice(-25).reverse())line(section,`${entry.year}年${entry.month}月`,entry.text);
    }
  }
  container.prepend(section);return true;
}
