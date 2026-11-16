/** 第4段階：実ゲームデータに接続した人物・学業パネル。DOM生成はテキスト限定。 */
import {choiceButtons} from './choiceButtons.js';
import {STUDY_MAJORS,programFor,majorFor} from '../core/educationPaths.js';
import {CAREER_TRAINING,careerTrainingPreview} from '../core/careerSystems.js';
import {renderQualificationPanel} from './qualificationPanel.js';
import {familyEligibility,familyProgressSummary} from '../core/familyJourney.js';
import {familyDepthSummary,familyDepthEligibility,childEducationSummary,CHILD_EDUCATION_MODES,WEDDING_STYLES} from '../core/familyDepth.js';
import {renderStudentBalancePanel} from './studentBalancePanel.js';
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
    const age=t.ageYears;
    if(age<6){
      heading.textContent=`家族・人物（現在${age}歳／友人は6歳から、あと${6-age}歳）`;
    }else if(age<18){
      heading.textContent=`家族・人物（${age}歳／交際は18歳から、あと${18-age}歳）`;
    }

    for(const p of people){const age=t.year-p.birth.year-(t.month<p.birth.month?1:0);line(section,`${p.role}：${p.name}`,`${age}歳 / 関係値 ${p.relationship}${p.role==='子'?` / ${p.lifeStage??'未就学'}`:''}`);}
    if(['PERSON-01','PERSON-02','PERSON-03','PERSON-04','PERSON-05','PERSON-06'].includes(screen.id)){
      const summary=familyProgressSummary(game);
      const spouse=people.find(p=>p.role==='配偶者');
      const partner=people.find(p=>p.role==='交際相手');
      const friends=people.filter(p=>p.role==='友人'&&t.year-p.birth.year-(t.month<p.birth.month?1:0)>=18);
      const children=people.filter(p=>p.role==='子');
      const wrap=lifeEl('details','phase4-extra family-journey');
      wrap.dataset.foldKey='family-journey';
      wrap.append(lifeEl('summary','','交際・結婚・子育て（生活に合わせた進路）'));
      const guide=lifeEl('p','muted small',spouse?'結婚生活：家計・夫婦関係・育児費用に注意':
        partner?'交際中：時間を重ね、将来の生活を相談しましょう':'出会いと信頼関係を育てると交際できます');
      wrap.append(guide);
      if(summary.plan)wrap.append(lifeEl('p','muted small',`家族計画：${summary.plan.mode==='birth'?'妊娠・出産':'養子縁組'}／${summary.plan.stage}。子どもを迎えるまで経過を見守ります。`));
      if(children.length){const cost=children.reduce((total,c)=>total+childEducationSummary(game,c).monthlyCost,0);
        wrap.append(lifeEl('p','muted small',`子ども${children.length}人／養育費目安${cost.toLocaleString('ja-JP')}円・月（家計へ自動反映）`));}
      const controls=lifeEl('div','phase4-actions');
      if(!spouse&&!partner){
        const meet=action(controls,'新しい人と知り合う',()=>handlers.onAction?.('meetFriend',{}));
        meet.disabled=age<6;
      }
      const candidates=partner?[partner]:spouse?[spouse]:friends;
      if(candidates.length){
        const target=choiceButtons('相手',candidates.map(p=>({value:p.id,label:p.name})),candidates[0].id);
        wrap.append(target.element);
        const status=lifeEl('p','muted small family-eligibility');
        const update=()=>{
          const id=target.getValue();
          const selected=people.find(p=>p.id===id);
          const depth=familyDepthSummary(game,selected);
          const step=selected?.role==='友人'?(selected.relationship>=60?'date':'courtship'):
            selected?.role==='交際相手'?(depth?.engagedSince>=0?'marry':depth?.datingMonths>=12?'propose':depth?.datingMonths>=6&&depth?.cohabitingSince<0?'startCohabitation':'discussFuture'):'familyBond';
          const reason=['startCohabitation','propose','marry'].includes(step)?familyDepthEligibility(game,step,id):familyEligibility(game,step,id);
          status.textContent=`${selected?.name??''}：親密度${selected?.relationship??0}/100${depth?`・信頼度${depth.trust}/100・交際${depth.datingMonths}か月`:''}。 ${reason??(step==='date'?'交際を始められます':step==='marry'?'入籍の準備が整いました':'次の段階へ進めます')}`;
          if(nextButton)nextButton.textContent=({date:'交際を申し込む',marry:'入籍する',propose:'婚約する',startCohabitation:'同棲を始める',courtship:'将来について話す',discussFuture:'将来について話す',familyBond:'会話する'})[step]??'関係を進める';
          if(nextButton)nextButton.disabled=Boolean(reason);
          return step;
        };
        let nextButton=null;
        nextButton=action(controls,'関係を進める',()=>{
          const step=update();
          handlers.onAction?.(step==='familyBond'?'familyBond':step,step==='familyBond'?
            {personId:target.getValue(),activity:'会話'}:{personId:target.getValue()});
        });
        if(partner){
          const talk=action(controls,'将来の暮らしを相談する',()=>handlers.onAction?.('discussFuture',{personId:target.getValue()}));
          talk.disabled=age<18;
        }
        target.group.addEventListener('click',update);
        wrap.append(status);
        update();
      }
      if(spouse){
        const depth=familyDepthSummary(game,spouse);
        wrap.append(lifeEl('p','muted small',`結婚生活：信頼度${depth?.trust??spouse.relationship}/100・意見の食い違い${depth?.conflict??0}/100・同棲${depth?.cohabitingSince>=0?'あり':'なし'}`));
        if(depth?.weddingMonth<0){
          const weddingSelect=lifeEl('select','phase4-select family-wedding-style');
          weddingSelect.setAttribute('aria-label','結婚式の形式');
          for(const [id,style] of Object.entries(WEDDING_STYLES)){
            const o=lifeEl('option','',`${style.name}（${style.cost.toLocaleString('ja-JP')}円）`);o.value=id;weddingSelect.append(o);
          }
          wrap.append(weddingSelect);
          const wedding=action(controls,'結婚式を開く',()=>handlers.onAction?.('holdWedding',{personId:spouse.id,style:weddingSelect.value}));
          const updateWedding=()=>{wedding.disabled=Boolean(familyDepthEligibility(game,'holdWedding',spouse.id,{style:weddingSelect.value}));};
          weddingSelect.addEventListener('change',updateWedding);updateWedding();
        }
        const bond=action(controls,'夫婦で会話する',()=>handlers.onAction?.('familyBond',{personId:spouse.id,activity:'会話'}));
        bond.disabled=age<18;
        if(!summary.plan){
          const form=lifeEl('div','phase27-form');
          const name=lifeEl('input','phase4-select');name.placeholder='子どもの名前';name.maxLength=20;name.setAttribute('aria-label','子どもの名前');
          const mode=lifeEl('select','phase4-select family-plan-mode');
          for(const [val,label] of [['birth','妊娠・出産を希望'],['adopt','養子縁組を希望']]){
            const o=lifeEl('option','',label);o.value=val;mode.append(o);
          }
          mode.setAttribute('aria-label','家族の迎え方');
          form.append(name,mode);
          const plan=action(form,'家族計画を始める',()=>handlers.onAction?.('haveChild',{name:name.value,mode:mode.value}));
          plan.disabled=age<20||children.length>=5;
          wrap.append(form);
          const reason=familyEligibility(game,'haveChild');
          if(reason)wrap.append(lifeEl('p','muted small',`家族計画の条件：${reason}`));
        }
      }
      if(children.length){
        const childChoice=choiceButtons('子ども',children.map(p=>({value:p.id,label:p.name})),children[0].id);
        wrap.append(childChoice.element);
        const childInfo=lifeEl('p','muted small family-child-education-summary');
        const educationMode=lifeEl('select','phase4-select family-child-education');
        educationMode.setAttribute('aria-label','子どもの教育方針');
        for(const [key,choice] of Object.entries(CHILD_EDUCATION_MODES)){
          const o=lifeEl('option','',`${choice.label}（追加${choice.cost.toLocaleString('ja-JP')}円／月）`);o.value=key;educationMode.append(o);
        }
        const educationCheck=()=>{
          const kid=people.find(x=>x.id===childChoice.getValue());
          if(!kid)return;
          const data=childEducationSummary(game,kid);
          educationMode.value=data.mode;
          childInfo.textContent=`${kid.name}：${data.age}歳／教育${data.label}／学習${data.learning}・自信${data.confidence}・自立${data.independence}。月額養育費${data.monthlyCost.toLocaleString('ja-JP')}円。`;
        };
        childChoice.group.addEventListener('click',educationCheck);
        wrap.append(childInfo,educationMode);
        const childButtons=lifeEl('div','phase4-actions');
        action(childButtons,'教育方針を変更',()=>handlers.onAction?.('setChildEducation',{personId:childChoice.getValue(),mode:educationMode.value}));
        educationCheck();
        action(childButtons,'子どもと過ごす',()=>handlers.onAction?.('familyCare',{personId:childChoice.getValue()}));
        action(childButtons,'勉強を手伝う',()=>handlers.onAction?.('familyActivity',{personId:childChoice.getValue(),activity:'勉強を手伝う'}));
        wrap.append(childButtons);
      }
      wrap.append(controls);
      section.append(wrap);
      if(screen.id==='PERSON-01'){
        const bonds=lifeEl('details','phase4-extra');bonds.dataset.foldKey='family-bond';
        bonds.append(lifeEl('summary','','会話・贈り物・旅行'));
        const others=people.filter(p=>p.role!=='本人');
        if(others.length){
          const person=choiceButtons('相手',others.map(p=>({value:p.id,label:p.name})),others[0].id);
          const activity=choiceButtons('交流方法',['会話','贈り物','旅行'],'会話');
          bonds.append(person.element,activity.element);
          action(bonds,'交流する',()=>handlers.onAction?.('familyBond',{personId:person.getValue(),activity:activity.getValue()}));
        }
        section.append(bonds);
      }
    }
    if(screen.id==='PERSON-07')for(const record of game.eventHistory.filter(v=>v.type==='action'&&v.title==='交流').slice(-12).reverse())line(section,`${record.year}年${record.month}月`,'家族と交流');
  }
  if(screen.id.startsWith('EDU-')||screen.id==='LIFE-01'){
    section.append(lifeEl('h3','','学業・学校'));
    line(section,'在学状況',e.stage==='未就学'?'未就学':e.stage==='卒業'?'学業課程修了':`${e.school} / ${e.grade}年生`);
    line(section,'累計学習時間',`${e.studyHours}時間`);
    line(section,'進路方針',e.universityChoice);
    if(e.degree)line(section,'最終学歴',e.degree);
    if(e.nextProgram&&e.nextProgram!=='就職')line(section,'卒業後の進路',e.nextProgram);
    if(e.highSchoolTrack)line(section,'中等教育の出身校',e.highSchoolTrack);
    if(e.program){
      line(section,'課程・修業年限',`${e.program.type}・${e.program.years}年間`);
      line(section,'学費（月額・基本）',`${e.program.tuition.toLocaleString('ja-JP')}円`);
      line(section,'専攻分野',majorFor(e.major).name);
    }
    if((e.qualifications??[]).length)line(section,'取得したゲーム内資格',e.qualifications.join('、'));
    if((e.licenses??[]).length)line(section,'専門資格',e.licenses.join('・'));
    if(e.schoolPreference)line(section,'志望校',`${e.schoolPreference.高校??'自動'}／${e.schoolPreference.大学??'自動'}`);
    if(screen.id==='EDU-03'||screen.id==='EDU-01'){
      if(screen.id==='EDU-01')section.append(renderStudentBalancePanel(game,handlers.onAction));
      const scoreArea=lifeEl('div','phase4-scores');
      for(const [name,score] of Object.entries(e.scores))line(scoreArea,name,`${score} / 100`);
      section.append(scoreArea);
      const controls=lifeEl('details','phase4-actions phase4-choice-actions');
      controls.append(lifeEl('summary','','従来の科目別学習（個別操作）'));
      const subject=choiceButtons('勉強する科目',Object.keys(e.scores),Object.keys(e.scores)[0]);
      const hours=choiceButtons('学習時間',[1,2,4,8].map(n=>({value:n,label:`${n}時間`})),1);
      controls.append(subject.element,hours.element);
      action(controls,'選んだ科目を学習',()=>handlers.onAction?.('study',{subject:subject.getValue(),hours:hours.getValue()}));
      section.append(controls);
    }
    if(screen.id==='EDU-04'){
      if(['大学','大学院','高専','高専専攻科'].includes(e.stage)){
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
      if(e.stage==='高校')section.append(lifeEl('p','muted small','学費・卒業までの期間・進路に応じて求人の応募条件が変化します。'));
      const controls=lifeEl('div','phase4-actions');
      if(['中学校','高校'].includes(e.stage)){
        const stage=e.stage==='中学校'?'高校':'大学';
        const schools=stage==='高校'?['自動','進学校','県立高校','地域高校','工業高校','商業高校','通信制高校','高等専門学校']:['自動','難関大学','総合大学','地域大学','国公立大学','私立大学','短期大学','専門学校','医学部','歯学部'];
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
      const furtherOptions=e.stage==='高専'?['就職','高専専攻科','高専編入大学']:
        e.stage==='大学'&&e.program?.years===4?['就職','大学院修士課程']:null;
      if(furtherOptions){
        const further=lifeEl('details','phase4-extra');
        further.append(lifeEl('summary','','卒業後の進路・進学を計画'));
        const select=choiceButtons('卒業後の希望',furtherOptions,e.nextProgram??'就職');
        further.append(select.element);
        action(further,'この進路を希望',()=>handlers.onAction?.('chooseFurtherEducation',{choice:select.getValue()}));
        controls.append(further);
      }
      if(e.stage==='高校'){
        action(controls,'大学進学を希望',()=>handlers.onAction?.('university',{choice:'進学'}));
        action(controls,'高校卒業後の就職を希望',()=>handlers.onAction?.('university',{choice:'就職'}));
      }
      section.append(controls);
    }
    if(['EDU-04','EDU-05'].includes(screen.id))section.append(renderQualificationPanel(game,handlers.onAction));
    if(screen.id==='EDU-05'){
      for(const [name,val]of Object.entries(e.skills))line(section,name,`習熟度 ${val}`);
      const controls=lifeEl('div','phase4-actions');for(const skill of ['読書','パソコン','運動'])action(controls,`${skill}を練習`,()=>handlers.onAction?.('skill',{skill}));
      if(t.ageYears>=15){
        const courses=choiceButtons('職業別研修',CAREER_TRAINING.map(c=>({value:c.id,label:c.name})),CAREER_TRAINING[0].id);
        const extra=lifeEl('details','phase4-extra');
        extra.dataset.foldKey='career-training';
        extra.append(lifeEl('summary','','職業別研修・技能認定'));
        extra.append(courses.element);
        const effect=lifeEl('p','muted small career-training-effect');
        const updateEffect=()=>{
          const p=careerTrainingPreview(e,courses.getValue(),game.finances?.career?.experience??0);
          effect.textContent=!p.ok?p.reason:
            `${p.course.name}：${p.course.skill} ${p.now}→${p.next}（+${p.gain}） ／
              ${p.relatedJob}の採用評価 ${p.hiringBefore}→${p.hiringAfter}点（+${p.hiringGain}） ／
              ${p.awarded?'今回の研修でゲーム内技能認定を取得':p.already?'技能認定取得済み':p.next<40?'技能40点で認定の対象':'技能認定の登録枠が上限'}`;
        };
        courses.group.addEventListener('click',updateEffect);
        updateEffect();
        extra.append(effect);
        action(extra,'選んだ職業技能を研修',()=>handlers.onAction?.('careerTraining',{postingId:courses.getValue()}));
        controls.append(extra);
      }
      section.append(controls);
    }
    if(screen.id==='EDU-06'){
      if(!e.history.length)section.append(lifeEl('p','muted','学業履歴はまだありません。'));
      for(const entry of e.history.slice(-25).reverse())line(section,`${entry.year}年${entry.month}月`,entry.text);
    }
  }
  container.prepend(section);return true;
}
