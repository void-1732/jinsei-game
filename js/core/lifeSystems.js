import {evaluateSchool} from './socialSystems.js';
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
    education:{stage:'未就学',grade:0,school:'',scores:{国語:50,数学:50,英語:50,理科:50,社会:50},studyHours:0,attendance:100,skills:{},history:[],entrance:{status:'未実施',destination:null},examPreparation:0,schoolPreference:{高校:'自動',大学:'自動'},universityChoice:'進学',graduated:false},
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
  if(stage===oldStage && (stage==='高校'||stage==='大学') && education.school)school=education.school;
  if(stage==='大学' && education.universityChoice==='就職') [stage,grade,school]=['卒業',0,''];
  const notices=[];
  const changes=education.history;
  if(stage!==oldStage){
    if(oldStage!=='未就学' && oldStage!=='卒業') changes.push({year:next.year,month:next.month,text:`${oldStage}を修了`});
    if(stage!=='卒業'){
      const message=`${stage}に進みました`;
      changes.push({year:next.year,month:next.month,text:message});
      notices.push({type:'education',title:message,description:`${school} ${grade}年生になりました。`});
    } else if(oldStage!=='卒業') notices.push({type:'education',title:'学業課程を修了',description:'学校での学びを終えました。'});
  }else if(grade!==education.grade && stage!=='未就学' && stage!=='卒業'){
    notices.push({type:'education',title:`${stage}${grade}年生へ進級`,description:'新しい学年が始まりました。'});
  }
  if((stage==='高校' && grade===1 && oldStage==='中学校')||(stage==='大学' && grade===1 && oldStage==='高校')){
    const result=evaluateSchool(education.scores,stage);
    const preference=education.schoolPreference?.[stage]??'自動';
    const thresholds=stage==='高校'?{'進学校':75,'県立高校':55,'地域高校':0}:{'難関大学':80,'総合大学':60,'地域大学':0};
    const preparationBonus=Math.min(8,Math.max(0,(education.examPreparation??0)*2));
    const passed=preference==='自動'||result.average+preparationBonus>=thresholds[preference];
    school=passed&&preference!=='自動'?preference:result.school;
    education.entrance={status:passed?'合格':'第一志望不合格・代替進学',destination:school,average:result.average,preference};
    const message=passed?`${stage}入学：${school}`:`${preference}は不合格となり、${school}へ進学`;
    changes.push({year:next.year,month:next.month,text:message});
    notices.push({type:'education',title:'進学判定',description:message});
  }
  education.stage=stage;education.grade=grade;education.school=school;
  education.graduated=stage==='卒業';
  return notices;
}
export function study(education,subject,hours){
  if(!['小学校','中学校','高校','大学'].includes(education.stage))return {ok:false,reason:'在学中のみ学習できます。'};
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
  const options=stage==='高校'?['自動','進学校','県立高校','地域高校']:stage==='大学'?['自動','難関大学','総合大学','地域大学']:[];
  if(!options.includes(school))return {ok:false,reason:'志望校が不正です。'};
  if(stage==='高校'&&education.stage!=='中学校'||stage==='大学'&&education.stage!=='高校')return {ok:false,reason:'志望校を選択できる学年ではありません。'};
  education.schoolPreference??={高校:'自動',大学:'自動'};
  education.schoolPreference[stage]=school;
  return {ok:true,school};
}
