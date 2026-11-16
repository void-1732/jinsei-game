/** Fictional education and credentials. Program years/fees are game rules, not real institutions. */
export const EDUCATION_PROGRAMS=Object.freeze({
 '難関大学':{years:4,tuition:48000,type:'4年制大学'},
 '総合大学':{years:4,tuition:36000,type:'4年制大学'},
 '地域大学':{years:4,tuition:36000,type:'4年制大学'},
 '国公立大学':{years:4,tuition:28000,type:'4年制大学'},
 '私立大学':{years:4,tuition:52000,type:'4年制大学'},
 '短期大学':{years:2,tuition:24000,type:'短期大学'},
 '専門学校':{years:2,tuition:30000,type:'専門学校'},
 '高等専門学校':{years:5,tuition:18000,type:'5年制高専'},
 '高専専攻科':{years:2,tuition:22000,type:'高専専攻科'},
 '高専編入大学':{years:2,tuition:36000,type:'大学編入'},
 '大学院修士課程':{years:2,tuition:50000,type:'修士課程'},
 '医学部':{years:6,tuition:75000,type:'6年制医学課程'},
 '歯学部':{years:6,tuition:73000,type:'6年制歯学課程'},
});
export const STUDY_MAJORS=Object.freeze([
 {id:'general',name:'総合教養',focus:'国語',credential:'教養課程修了（ゲーム内）',jobs:['office','shop','pro']},
 {id:'it',name:'情報・IT',focus:'数学',credential:'IT基礎認定（ゲーム内）',jobs:['tech','pro']},
 {id:'business',name:'経営・会計',focus:'社会',credential:'ビジネス実務認定（ゲーム内）',jobs:['office','shop','creative']},
 {id:'care',name:'福祉・医療補助',focus:'理科',credential:'生活支援基礎認定（ゲーム内）',jobs:['care']},
 {id:'creative',name:'デザイン・企画',focus:'国語',credential:'デザイン基礎認定（ゲーム内）',jobs:['creative']},
]);
export const programFor=school=>EDUCATION_PROGRAMS[school]??EDUCATION_PROGRAMS['地域大学'];
export const majorFor=id=>STUDY_MAJORS.find(m=>m.id===id)||STUDY_MAJORS[0];
export function assignProgram(education,school,year){
 const def=programFor(school);
 education.program={school,years:def.years,tuition:def.tuition,type:def.type,startYear:year};
 education.major='general';education.credentialIds=[];education.qualifications=[];
 return education.program;
}
export function chooseMajor(education,majorId){
 if(!['大学','高専','高専専攻科','大学院'].includes(education.stage))return {ok:false,reason:'専攻は在学中に選べます。'};
 if(!STUDY_MAJORS.some(m=>m.id===majorId))return {ok:false,reason:'専攻が不正です。'};
 if(education.major===majorId)return {ok:false,reason:'現在の専攻と同じです。'};
 education.major=majorId;
 return {ok:true,message:`${majorFor(majorId).name}を専攻にしました。卒業時の認定や仕事の適性に反映します。`};
}
export function graduateProgram(education){
 const major=majorFor(education.major);
 education.credentialIds??=[];education.qualifications??=[];
 if(!education.credentialIds.includes(major.id)){
  education.credentialIds.push(major.id);
  education.qualifications.push(major.credential);
 }
}
export function employmentQualificationBonus(education,postingId){
 if(!education?.graduated||!education.program)return 0;
 const major=majorFor(education.major);
 let bonus=major.jobs.includes(postingId)?8:0;
 if((education.credentialIds??[]).includes(major.id)&&major.jobs.includes(postingId))bonus+=5;
 return bonus;
}
export function canApplyUniversityRole(education){
 if(!education?.graduated||education.universityChoice!=='進学')return false;
 if(education.degree)return ['学士','修士','医学課程修了','歯学課程修了'].includes(education.degree);
 // Old saves never included program; preserve their historical university eligibility.
 return !education.program||education.program.years===4;
}
export function validateEducationPath(education){
 if(education.program!==undefined&&education.program!==null){
  const p=education.program,known=EDUCATION_PROGRAMS[p.school];
  if(!known||p.years!==known.years||p.tuition!==known.tuition||p.type!==known.type||
    !Number.isInteger(p.startYear)||p.startYear<(p.school==='高等専門学校'?2015:2018)||p.startYear>2200)return false;
 }
 if(education.major!==undefined&&!STUDY_MAJORS.some(m=>m.id===education.major))return false;
 if(education.credentialIds!==undefined&&(!Array.isArray(education.credentialIds)||education.credentialIds.length>5||
  new Set(education.credentialIds).size!==education.credentialIds.length||
  education.credentialIds.some(id=>!STUDY_MAJORS.some(m=>m.id===id))))return false;
 if(education.qualifications!==undefined&&(!Array.isArray(education.qualifications)||education.qualifications.length>5||
  education.qualifications.some(x=>typeof x!=='string'||x.length>60)))return false;
 return true;
}
