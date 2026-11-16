/** 第4段階：実ゲームデータに接続した人物・学業パネル。DOM生成はテキスト限定。 */
import {choiceButtons} from './choiceButtons.js';
import {STUDY_MAJORS,programFor,majorFor} from '../core/educationPaths.js';
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
    if(e.program){
      line(section,'課程・修業年限',`${e.program.type}・${e.program.years}年間`);
      line(section,'学費（月額・基本）',`${e.program.tuition.toLocaleString('ja-JP')}円`);
      line(section,'専攻分野',majorFor(e.major).name);
    }
    if((e.qualifications??[]).length)line(section,'取得したゲーム内資格',e.qualifications.join('、'));
    if(e.schoolPreference)line(section,'志望校',`${e.schoolPreference.高校??'自動'}／${e.schoolPreference.大学??'自動'}`);
    if(screen.id==='EDU-03'||screen.id==='EDU-01'){
      const scoreArea=lifeEl('div','phase4-scores');
      for(const [name,score] of Object.entries(e.scores))line(scoreArea,name,`${score} / 100`);
      section.append(scoreArea);
      const controls=lifeEl('div','phase4-actions phase4-choice-actions');
      const subject=choiceButtons('勉強する科目',Object.keys(e.scores),Object.keys(e.scores)[0]);
      const hours=choiceButtons('学習時間',[1,2,4,8].map(n=>({value:n,label:`${n}時間`})),1);
      controls.append(subject.element,hours.element);
      action(controls,'選んだ科目を学習',()=>handlers.onAction?.('study',{subject:subject.getValue(),hours:hours.getValue()}));
      section.append(controls);
    }
    if(screen.id==='EDU-04'){
      if(e.stage==='大学'){
        section.append(lifeEl('h3','','専攻を選んで将来の仕事につなげる'));
        const courses=choiceButtons('学ぶ分野を選ぶ',
          STUDY_MAJORS.map(major=>({value:major.id,label:major.name})),e.major??'general');
        const summary=lifeEl('p','muted small');
        const describe=()=>{
          const selected=majorFor(courses.getValue());
          const posts={tech:'技術職',pro:'専門職',office:'事務職',shop:'販売スタッフ',creative:'企画職',care:'生活支援職'};
          summary.textContent=`得意分野：${selected.focus} ／ 卒業時：${selected.credential} ／ 関連職：${selected.jobs.map(id=>posts[id]).join('・')}`;
        };
        courses.group.addEventListener('click',describe);
        describe();
        const majorControls=lifeEl('div','phase4-actions');
        majorControls.append(courses.element,summary);
        action(majorControls,'この専攻に決める',()=>handlers.onAction?.('chooseMajor',{majorId:courses.getValue()}));
        section.append(majorControls);
      }
      line(section,'受験準備の回数',`${e.examPreparation??0}回`);
      line(section,'受験結果',`${e.entrance.status}${e.entrance.destination?`：${e.entrance.destination}`:''}`);
      if(e.stage==='高校')section.append(lifeEl('p','muted small','進学先により2年制・4年制、毎月の学費、卒業後の求人条件が変化します。'));
      const controls=lifeEl('div','phase4-actions');
      if(['中学校','高校'].includes(e.stage)){
        const stage=e.stage==='中学校'?'高校':'大学';
        const schools=stage==='高校'?['自動','進学校','県立高校','地域高校','工業高校','商業高校','通信制高校']:['自動','難関大学','総合大学','地域大学','国公立大学','私立大学','短期大学','専門学校'];
        const select=choiceButtons('志望校を選ぶ',schools,e.schoolPreference?.[stage]??'自動');
        controls.append(select.element);
        if(stage==='大学'){
          const preview=lifeEl('p','muted small');
          const update=()=>{const school=select.getValue();const p=programFor(school==='自動'?'地域大学':school);preview.textContent=`参考：${p.type}・${p.years}年間 ／ 学費 月${p.tuition.toLocaleString('ja-JP')}円（ゲーム内基本額）`;};
          select.group.addEventListener('click',update);update();controls.append(preview);
        }
        action(controls,'志望校を設定',()=>handlers.onAction?.('chooseSchool',{stage,school:select.getValue()}));
      }
      if(['中学校','高校'].includes(e.stage))
        action(controls,'受験対策をする（全科目＋2）',()=>handlers.onAction?.('prepareExam',{}));
      if(e.stage==='高校'){
        action(controls,'大学進学を希望',()=>handlers.onAction?.('university',{choice:'進学'}));
        action(controls,'高校卒業後の就職を希望',()=>handlers.onAction?.('university',{choice:'就職'}));
      }
      section.append(controls);
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
