/** 学歴・能力・資格のゲーム内モデル。公式資格の制度・合格率・費用は再現しない。
 * 既存の education.qualifications / education.licenses を保持し、任意項目だけ追加。
 */
const freeze=Object.freeze;
const item=(id,name,level,focus,threshold,fee,extra={})=>freeze({
 id,name,level,focus,threshold,fee,minAge:18,description:'ゲーム内の能力認定',...extra
});
export const QUALIFICATION_CATALOG=freeze([
 item('itEntry','IT基礎認定',1,'数学',46,2500,{description:'ITの基本知識'}),
 item('itFundamental','情報技術者認定',3,'数学',65,7500,{description:'プログラミング・開発基礎'}),
 item('itAdvanced','高度情報技術認定',5,'数学',88,18000,{description:'設計・情報セキュリティ',prerequisite:'itFundamental'}),
 item('bookkeeping3','簿記基礎認定',1,'社会',48,3000,{description:'会計・経理の基礎'}),
 item('bookkeeping2','簿記実務認定',3,'社会',67,7500,{description:'財務諸表と経理実務'}),
 item('industrial','ものづくり技能認定',2,'数学',57,5000,{description:'製造・設備の技術'}),
 item('industrialAdvanced','高度製造技術認定',4,'数学',78,12000,{description:'制御・精密加工',prerequisite:'industrial'}),
 item('building','建築設計技能認定',3,'数学',69,8000,{description:'図面・施工技術。実際の建築士免許ではありません'}),
 item('medicalAdmin','医療事務技能認定',2,'国語',57,4500,{description:'医療分野の事務'}),
 item('care','福祉支援技能認定',2,'理科',56,4500,{description:'生活支援の知識'}),
 item('cooking','調理技能認定',2,'理科',59,5000,{description:'調理の基礎技術。調理師免許ではありません'}),
 item('pastry','製菓技能認定',3,'理科',67,6500,{description:'製菓の専門技術'}),
 item('finance','市場分析認定',3,'数学',67,9000,{description:'資産運用・分析。投資助言等の免許ではありません'}),
 item('financeAdvanced','高度金融分析認定',5,'数学',87,22000,{description:'市場調査・リスク管理',prerequisite:'finance'}),
 item('design','デザイン技能認定',2,'国語',57,4500,{description:'企画・デザイン'}),
 item('manga','漫画制作技能認定',3,'国語',66,5500,{description:'作画・物語制作'}),
 item('writing','創作文章技能認定',3,'国語',67,5500,{description:'文章構成・創作'}),
 item('sport','スポーツ指導技能認定',3,'理科',67,7500,{description:'競技指導の基礎'}),
 item('public','行政実務認定',3,'社会',68,7000,{description:'公務・社会制度の知識。採用試験の代替ではありません'}),
 item('research','研究開発技能認定',4,'理科',79,12000,{description:'研究計画・実験技術',degree:'学士相当'}),
 item('physician','医師免許（ゲーム内）',5,'理科',88,25000,{description:'医学部6年制課程の修了後、ゲーム内試験を受ける',degree:'医学課程修了',license:'医師',minAge:24}),
 item('dentist','歯科医師免許（ゲーム内）',5,'理科',87,25000,{description:'歯学部6年制課程の修了後、ゲーム内試験を受ける',degree:'歯学課程修了',license:'歯科医師',minAge:24}),
]);
export const getQualification=id=>QUALIFICATION_CATALOG.find(q=>q.id===id)??null;
const byId=id=>getQualification(id);
const cap=(n,min=0,max=100)=>Math.max(min,Math.min(max,Math.round(n)));
const ym=d=>d.year*12+d.month;
export const qualificationDifficulty=q=>['','★☆☆☆☆（入門）','★★☆☆☆（基礎）','★★★☆☆（実務）','★★★★☆（難関）','★★★★★（最難関）'][q.level];
const qualifiedBachelor=e=>['学士','修士','医学課程修了','歯学課程修了'].includes(e.degree)||
 Boolean(e.graduated&&e.program?.years===4&&!e.degree);
export function hasQualification(education,id){
 const q=byId(id);
 return Boolean(q&&((education.qualificationTrack?.earned??[]).includes(id)||
  (q.license&&(education.licenses??[]).includes(q.license))));
}
export function qualificationRequirements(q,education,age){
 if(age<q.minAge)return `${q.minAge}歳以上で受験できます`;
 if(q.degree==='学士相当'&&!qualifiedBachelor(education))return '大学卒業相当の学歴が必要';
 if(q.degree&&q.degree!=='学士相当'&&education.degree!==q.degree)return `${q.degree}が必要`;
 if(q.prerequisite&&!hasQualification(education,q.prerequisite))return `${byId(q.prerequisite).name}の取得が必要`;
 return null;
}
function ability(education,q){
 const values=Object.values(education.scores??{}).filter(Number.isFinite);
 const avg=values.length?values.reduce((s,n)=>s+n,0)/values.length:0;
 const focused=Number(education.scores?.[q.focus]??0);
 const skillValues=Object.values(education.skills??{}).filter(Number.isFinite);
 const skill=skillValues.length?Math.max(...skillValues):0;
 const prep=Math.min(30,Number(education.qualificationTrack?.preparation?.[q.id]??0));
 const study=Math.min(5,Math.floor((education.studyHours??0)/70));
 const degreeBoost=q.level>=4&&qualifiedBachelor(education)?3:0;
 return cap(avg*.22+focused*.68+skill*.10+prep*.70+study+degreeBoost);
}
/** Probability shown is a GAME estimate, not the qualification's real pass rate. */
export function qualificationPreview(education,id,age){
 const q=byId(id);if(!q)return {ok:false,reason:'未登録の資格です。'};
 const earned=hasQualification(education,id);
 const requirement=qualificationRequirements(q,education,age);
 const readiness=ability(education,q);
 const chance=earned?100:requirement?0:cap(45+(readiness-q.threshold)*2.4,4,95);
 return {ok:true,q,earned,requirement,readiness,chance,
  difficulty:qualificationDifficulty(q),preparation:education.qualificationTrack?.preparation?.[id]??0};
}
export function recommendedQualifications(education){
 const school=education.program?.school??education.school??'';
 const major=education.major??'general',track=education.highSchoolTrack??'';
 const ids=school==='医学部'||education.degree==='医学課程修了'?['physician','medicalAdmin']:
 school==='歯学部'||education.degree==='歯学課程修了'?['dentist','medicalAdmin']:
 school==='大学院修士課程'||education.degree==='修士'?['research','itAdvanced','financeAdvanced']:
 /高専/.test(school)||track==='高専'||track==='工業高校'?['industrial','industrialAdvanced','itFundamental','building']:
 major==='it'?['itEntry','itFundamental','itAdvanced']:
 major==='business'?['bookkeeping3','bookkeeping2','finance']:
 major==='care'?['medicalAdmin','care']:
 major==='creative'?['design','manga','writing']:
 ['bookkeeping3','itEntry','public'];
 return ids.map(byId).filter(Boolean);
}
export const JOB_QUALIFICATION_RULES=freeze({
 tech:{preferred:['itFundamental','industrial']},
 pro:{preferred:['research','itAdvanced']},
 office:{preferred:['bookkeeping3','bookkeeping2']},
 shop:{preferred:['bookkeeping3']},
 creative:{preferred:['design','writing']},
 care:{preferred:['care','medicalAdmin']},
 heavyIndustry:{preferred:['industrial','industrialAdvanced']},
 automation:{preferred:['industrialAdvanced','itFundamental']},
 energy:{preferred:['industrial','industrialAdvanced']},
 precision:{preferred:['industrialAdvanced']},
 civil:{preferred:['building','industrial']},
 architect:{preferred:['building']},
 software:{preferred:['itFundamental','itAdvanced']},
 cyber:{required:['itFundamental'],preferred:['itAdvanced']},
 gameDev:{preferred:['itFundamental','design']},
 research:{preferred:['research']},
 laboratory:{preferred:['research']},
 doctor:{required:['physician']},
 dentist:{required:['dentist']},
 medicalSupport:{preferred:['medicalAdmin']},
 analyst:{preferred:['bookkeeping2','financeAdvanced']},
 trader:{preferred:['finance','financeAdvanced']},
 publisher:{preferred:['writing','design']},
 novelist:{preferred:['writing']},
 manga:{preferred:['manga','design']},
 chef:{preferred:['cooking']},
 pastry:{preferred:['pastry','cooking']},
 athlete:{preferred:['sport']},
 coach:{preferred:['sport']},
 localPolitics:{preferred:['public']},
 prefPolitics:{preferred:['public']},
 nationalPolitics:{preferred:['public']},
 publicAdmin:{preferred:['public']},
 journalist:{preferred:['writing']},
 video:{preferred:['design']},
});
export function jobQualificationInfo(education,postingId){
 const rule=JOB_QUALIFICATION_RULES[postingId]??{};
 const required=(rule.required??[]).map(byId).filter(Boolean);
 const preferred=(rule.preferred??[]).map(byId).filter(Boolean);
 const missing=required.filter(q=>!hasQualification(education,q.id));
 const matched=preferred.filter(q=>hasQualification(education,q.id));
 const bonus=Math.min(18,matched.length*8);
 return {required,preferred,missing,matched,bonus};
}
export function hiringProbability(score,threshold,extraBonus=0){
 return cap(42+(score-threshold)*2.5+Math.min(8,extraBonus),3,96);
}
export function hiringRoll(post,date,attemptCount,seed=0){
 let h=2166136261;
 for(const c of `${post.id}:${date.year}:${date.month}:${attemptCount}:${seed}`){
   h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;
 }
 return h%100;
}
export function validateQualificationTrack(track){
 if(track===undefined)return true;
 if(!track||typeof track!=='object'||Array.isArray(track))return false;
 const earned=track.earned??[], prep=track.preparation??{}, attempts=track.attempts??{};
 if(!Array.isArray(earned)||earned.length>QUALIFICATION_CATALOG.length||
   new Set(earned).size!==earned.length||earned.some(id=>!byId(id)))return false;
 if(!prep||typeof prep!=='object'||Array.isArray(prep)||Object.entries(prep).some(([id,n])=>
   !byId(id)||!Number.isInteger(n)||n<0||n>30))return false;
 if(!attempts||typeof attempts!=='object'||Array.isArray(attempts)||Object.entries(attempts).some(([id,r])=>
   !byId(id)||!r||typeof r!=='object'||!Number.isInteger(r.count)||r.count<0||r.count>1000||
   !Number.isInteger(r.lastMonth)||r.lastMonth<0||r.lastMonth>26412))return false;
 return true;
}
const record=(s,label,amount=0)=>{
 const f=s.finances,t=s.timeline;
 f.ledger.push({year:t.year,month:t.month,kind:amount<0?'支出':'記録',label,amount});
 if(f.ledger.length>600)f.ledger.shift();
};
export function qualificationAction(state,action,payload={}){
 const q=byId(payload.id),t=state.timeline,e=state.education,h=state.health,f=state.finances;
 if(!q)return {ok:false,reason:'資格を選んでください。'};
 if(t.ageYears<18)return {ok:false,reason:'資格の自由受験・試験対策は18歳からです。'};
 const preview=qualificationPreview(e,q.id,t.ageYears);
 if(preview.earned)return {ok:false,reason:'この資格は取得済みです。'};
 if(preview.requirement)return {ok:false,reason:preview.requirement};
 e.qualificationTrack??={earned:[],preparation:{},attempts:{}};
 const track=e.qualificationTrack;
 if(action==='prepareQualification'){
   const previous=track.preparation[q.id]??0;
   if(previous>=30)return {ok:false,reason:'この資格の対策は十分です。受験に進んでください。'};
   if(f.cash<2000)return {ok:false,reason:'試験対策費2,000円が必要です。'};
   f.cash-=2000;f.totals.expenses+=2000;
   track.preparation[q.id]=Math.min(30,previous+10);
   h.energy=Math.max(0,h.energy-3);
   record(state,`${q.name}の受験対策`,-2000);
   return {ok:true,message:`${q.name}の対策を進めました（準備${track.preparation[q.id]}/30）。合格見込みが改善します。`};
 }
 if(action!=='takeQualificationExam')return {ok:false,reason:'未対応の資格操作です。'};
 if(f.cash<q.fee)return {ok:false,reason:`受験費用${q.fee.toLocaleString('ja-JP')}円が必要です。`};
 const prev=track.attempts[q.id]??{count:0,lastMonth:0};
 if(prev.lastMonth===ym(t))return {ok:false,reason:'同じ資格の試験は1か月に1回までです。'};
 const rand=hiringRoll(q,t,prev.count,Number(state.random?.seed??0));
 const passed=rand<preview.chance;
 f.cash-=q.fee;f.totals.expenses+=q.fee;h.energy=Math.max(0,h.energy-5);
 track.attempts[q.id]={count:prev.count+1,lastMonth:ym(t)};
 if(passed){
   track.earned.push(q.id);
   if(q.license){
     e.licenses??=[];
     if(!e.licenses.includes(q.license))e.licenses.push(q.license);
   }
 }
 record(state,`${q.name}の試験：${passed?'合格':'不合格'}`,-q.fee);
 return {ok:true,passed,chance:preview.chance,message:passed?
   `${q.name}に合格しました。求人の応募資格・採用評価に反映されます。`:
   `${q.name}は不合格でした（挑戦時のゲーム内合格見込み${preview.chance}%）。準備して再挑戦できます。`};
}
