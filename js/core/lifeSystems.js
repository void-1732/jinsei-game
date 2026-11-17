import {evaluateSchool} from './socialSystems.js';
import {academicAssessment,SCHOOL_THRESHOLDS} from './schoolCompetition.js';
import {assignProgram,chooseMajor as selectMajor,graduateProgram} from './educationPaths.js';
/** 人物・学業の独立したドメイン規則。全データはシリアライズ可能。 */
const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,v));
export function createLifeData(name){
  return {
    people:[
      {id:'PLAYER-001',name,birth:{year:2000,month:1,day:1},role:'本人',relationship:100},
      {id:'FAMILY-001',name:'父',birth:{year:1973,month:6,day:1},role:'父',relationship:65},
      {id:'FAMILY-002',name:'母',birth:{year:1975,month:9,day:1},role:'母',relationship:70},
    ],
    relationships:[],
    education:{stage:'未就学',grade:0,school:'',scores:{国語:50,数学:50,英語:50,理科:50,社会:50},studyHours:0,attendance:100,skills:{},history:[],entrance:{status:'未実施',destination:null},examPreparation:0,schoolPreference:{高校:'自動',大学:'自動'},universityChoice:'進学',graduated:false,program:null,major:'general',credentialIds:[],qualifications:[]},
  };
}
function academicStage(year,month){
  const schoolYear=year-(month<4?1:0);
  if(schoolYear<2006)return ['未就学',0,''];
  if(schoolYear<2012)return ['小学校',schoolYear-2005,'市立小学校'];
  if(schoolYear<2015)return ['中学校',schoolYear-2011,'市立中学校'];
  if(schoolYear<2018)return ['高校',schoolYear-2014,'県立高校'];
  if(schoolYear<2022)return ['大学',schoolYear-2017,'地域大学'];
  return ['卒業',0,''];
}
export function advanceEducation(education,previous,next,turn){
  const oldStage=education.stage;
  let [stage,grade,school]=academicStage(next.year,next.month);
  const schoolYear=next.year-(next.month<4?1:0);
  const oldProgram=education.program;
  const notices=[],changes=education.history;
  const add=(title,description)=>notices.push({type:'education',title,description});
  // Existing saves keep the historic high-school -> university route.
  // Alternative programs track their own enrollment year and duration.
  if(oldProgram && schoolYear>=oldProgram.startYear){
    const elapsed=schoolYear-oldProgram.startYear;
    const kind=oldProgram.school;
    if(['高等専門学校','高専専攻科','高専編入大学','大学院修士課程','医学部','歯学部'].includes(kind)
       ||oldProgram.startYear>=2018){
      if(elapsed<oldProgram.years){
        stage=kind==='高等専門学校'?'高専':kind==='高専専攻科'?'高専専攻科':
          kind==='大学院修士課程'?'大学院': '大学';
        grade=elapsed+1;school=kind;
      }else [stage,grade,school]=['卒業',0,''];
    }
  }
  if(stage==='大学'&&education.universityChoice==='就職'&&oldStage==='高校'){
    [stage,grade,school]=['卒業',0,''];
  }
  // On leaving a program, first record its earned credential, then optionally
  // continue to a separate advanced course without skipping a graduation.
  if(oldProgram&&stage==='卒業'&&oldStage!=='卒業'){
    if(oldStage==='高専'){
      education.degree='高専卒';
      if(education.nextProgram==='高専専攻科'||education.nextProgram==='高専編入大学'){
        stage=education.nextProgram==='高専専攻科'?'高専専攻科':'大学';
        grade=1;school=education.nextProgram;
        assignProgram(education,school,schoolYear);
      }
    }else if(oldStage==='高専専攻科')education.degree='専攻科修了';
    else if(oldStage==='大学院')education.degree='修士';
    else if(oldStage==='大学'){
      education.degree=oldProgram.school==='医学部'?'医学課程修了':oldProgram.school==='歯学部'?'歯学課程修了':
        oldProgram.school==='高専編入大学'?'学士':oldProgram.years===2?'短大卒':'学士';
      if(education.nextProgram==='大学院修士課程'&&oldProgram.years===4){
        stage='大学院';grade=1;school='大学院修士課程';
        const currentMajor=education.major;
        assignProgram(education,school,schoolYear);
        education.major=currentMajor;
      }
    }
    if(oldStage==='大学'||oldStage==='大学院'||oldStage==='高専'||oldStage==='高専専攻科'){
      graduateProgram(education);
      add('卒業・修了認定',`${oldProgram.school}を修了しました。学歴・技能が進路の応募条件に反映されます。`);
    }
    education.nextProgram='就職';
  }else if(oldStage==='高校'&&stage==='卒業'){
    education.degree='高卒';
  }else if(oldStage==='大学'&&stage==='卒業'&&!oldProgram&&education.universityChoice==='進学'){
    education.degree='学士';
  }
  if(stage===oldStage&&(stage==='高校'||stage==='大学'||stage==='高専'||stage==='大学院')&&education.school){
    school=education.school;
  }
  // Entrance decisions occur in April and never guarantee a first choice.
  const enteringSecondary=stage==='高校'&&grade===1&&oldStage==='中学校';
  const enteringUniversity=stage==='大学'&&grade===1&&oldStage==='高校';
  if(enteringSecondary||enteringUniversity){
    const phase=enteringSecondary?'高校':'大学';
    const result=evaluateSchool(education.scores,phase);
    const preference=education.schoolPreference?.[phase]??'自動';
    const thresholds=phase==='高校'?{'進学校':75,'県立高校':55,'地域高校':0,'工業高校':48,'商業高校':45,'通信制高校':0,'高等専門学校':60}:
      {'難関大学':80,'総合大学':60,'地域大学':0,'国公立大学':72,'私立大学':55,'短期大学':38,'専門学校':35,'医学部':82,'歯学部':78};
    const preparationBonus=Math.min(8,Math.max(0,(education.examPreparation??0)*2));
    const passed=preference==='自動'||academicAssessment(education).entranceScore>=(thresholds[preference]??100);
    school=passed&&preference!=='自動'?preference:result.school;
    if(enteringSecondary){
      education.highSchoolTrack=school==='高等専門学校'?'高専':school;
      if(school==='高等専門学校'){
        stage='高専';
        assignProgram(education,'高等専門学校',schoolYear);
      }
    }
    if(enteringUniversity)assignProgram(education,school,schoolYear);
    education.entrance={status:passed?'合格':'第一志望不合格・代替進学',destination:school,average:result.average,preference};
    const message=passed?`${school}へ入学`:`${preference}は不合格となり、${school}へ進学`;
    changes.push({year:next.year,month:next.month,text:message});
    add('進学判定',message);
  }
  if(stage!==oldStage){
    if(oldStage!=='未就学'&&oldStage!=='卒業')changes.push({year:next.year,month:next.month,text:`${oldStage}を修了`});
    if(stage!=='卒業'){
      changes.push({year:next.year,month:next.month,text:`${stage}に進みました`});
      add(`${stage}に進みました`,`${school} ${grade}年生になりました。`);
    }else if(oldStage!=='卒業')add('学業課程を修了','学校での学びを終えました。');
  }else if(grade!==education.grade&&stage!=='未就学'&&stage!=='卒業'){
    add(`${stage}${grade}年生へ進級`,'新しい学年が始まりました。');
  }
  education.stage=stage;education.grade=grade;education.school=school;
  education.graduated=stage==='卒業';
  return notices;
}
export function chooseFurtherEducation(education,choice){
  const target=education.stage==='高専'?['就職','高専専攻科','高専編入大学']:
    education.stage==='大学'&&education.program?.years===4?['就職','大学院修士課程']:[];
  if(!target.includes(choice))return {ok:false,reason:'現在の在学課程では、その進学先を選べません。'};
  if(education.nextProgram===choice)return {ok:false,reason:'既に選択中の進路です。'};
  education.nextProgram=choice;
  return {ok:true,message:`卒業後の進路を「${choice}」に設定しました。進級・卒業時に反映します。`};
}
export function study(education,subject,hours){
  if(!['小学校','中学校','高校','高専','高専専攻科','大学','大学院'].includes(education.stage))return {ok:false,reason:'在学中のみ学習できます。'};
  if(!Object.hasOwn(education.scores,subject))return {ok:false,reason:'科目が不正です。'};
  if(!Number.isInteger(hours)||hours<1||hours>8)return {ok:false,reason:'学習時間は1～8時間です。'};
  education.scores[subject]=clamp(education.scores[subject]+Math.max(1,Math.floor(hours/2)));
  education.studyHours+=hours;
  return {ok:true,score:education.scores[subject]};
}
export function socialize(people,personId){
  const person=people.find(p=>p.id===personId&&p.role!=='本人');
  if(!person)return {ok:false,reason:'交流相手を選択してください。'};
  person.relationship=clamp(person.relationship+3);
  return {ok:true,relationship:person.relationship};
}
export function gainSkill(education,name){
  if(!['読書','パソコン','運動'].includes(name))return {ok:false,reason:'技能を選択してください。'};
  education.skills[name]=clamp((education.skills[name]??0)+5);
  return {ok:true,level:education.skills[name]};
}

export function prepareExam(education){
  if(!['中学校','高校'].includes(education.stage))return {ok:false,reason:'受験準備は中学生・高校生のみ利用できます。'};
  for(const subject of Object.keys(education.scores))education.scores[subject]=clamp(education.scores[subject]+2);
  education.examPreparation=(education.examPreparation??0)+1;
  return {ok:true,preparations:education.examPreparation};
}

/** 志望校は進学先を保証しない。成績基準に未達の場合は従来の自動進学先へ進む。 */
export function chooseSchool(education,stage,school){
  const options=stage==='高校'?['自動','進学校','県立高校','地域高校','工業高校','商業高校','通信制高校','高等専門学校']:stage==='大学'?['自動','難関大学','総合大学','地域大学','国公立大学','私立大学','短期大学','専門学校','医学部','歯学部']:[];
  if(!options.includes(school))return {ok:false,reason:'志望校が不正です。'};
  if(stage==='高校'&&education.stage!=='中学校'||stage==='大学'&&education.stage!=='高校')return {ok:false,reason:'志望校を選択できる学年ではありません。'};
  education.schoolPreference??={高校:'自動',大学:'自動'};
  education.schoolPreference[stage]=school;
  return {ok:true,school};
}

/** A major is picked with a single explicit button confirmation. */
export const chooseMajor=selectMajor;
