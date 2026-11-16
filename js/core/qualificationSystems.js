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
 item('networkBasic','ネットワーク基礎認定',2,'数学',56,4200,{description:'ネットワーク構築と運用'}),
 item('cyberSkills','情報セキュリティ実務認定',4,'数学',79,11000,{description:'システムの安全設計',prerequisite:'itFundamental'}),
 item('dataScience','データ分析実務認定',3,'数学',68,9000,{description:'データ集計・統計分析'}),
 item('robotics','ロボット制御認定',4,'数学',80,13000,{description:'工場・ロボット制御',prerequisite:'industrial'}),
 item('electrical','電気設備基礎認定',2,'理科',58,5400,{description:'電気設備の保守基礎。公的免許ではありません'}),
 item('cad','CAD製図技能認定',3,'数学',70,8000,{description:'設計・製図ソフトウェア'}),
 item('quality','品質管理技能認定',3,'数学',69,7500,{description:'検査・品質改善'}),
 item('commercialPractical','商業実務認定',2,'社会',59,5200,{description:'商取引・流通の基礎'}),
 item('marketing','マーケティング技能認定',3,'社会',68,7500,{description:'市場調査・販売計画'}),
 item('officeTools','ビジネスPC実務認定',2,'国語',57,4800,{description:'文書・表計算の仕事術'}),
 item('logistics','物流管理技能認定',3,'社会',68,7700,{description:'在庫・物流の計画'}),
 item('tax','税務会計基礎認定',4,'社会',79,12500,{description:'税務・経理の応用',prerequisite:'bookkeeping2'}),
 item('english','ビジネス英語認定',3,'英語',70,7500,{description:'海外顧客との実務会話'}),
 item('tourism','観光サービス技能認定',2,'英語',59,5500,{description:'観光・接客の基本'}),
 item('videoEdit','動画編集技能認定',3,'国語',70,8000,{description:'映像編集・企画'}),
 item('digitalArt','デジタル作画技能認定',3,'国語',69,8500,{description:'デジタルイラスト制作'}),
 item('nutrition','栄養・衛生基礎認定',2,'理科',58,5500,{description:'食と衛生の基礎。管理栄養士免許ではありません'}),
 item('businessManagement','経営計画技能認定',4,'社会',78,12000,{description:'経営計画・組織運営'}),

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
  (q.license&&(education.licenses??[]).includes(q.license))||
  (education.qualifications??[]).some(name=>name===q.name||name===`${q.name}（ゲーム内）`)));
}
/** 15–17歳の職業系高校・高専生は対応するゲーム内技能資格に挑戦できる。
 * 医師免許などの専門免許や高学歴必須資格には適用しない。 */
export const STUDENT_QUALIFICATIONS=freeze({
 '工業高校':freeze(['itEntry','itFundamental','industrial','industrialAdvanced','building','electrical','cad','quality','robotics','networkBasic']),
 '商業高校':freeze(['bookkeeping3','bookkeeping2','itEntry','itFundamental','commercialPractical','marketing','officeTools','logistics','english','tax']),
 '高専':freeze(['itEntry','itFundamental','industrial','industrialAdvanced','building','electrical','cad','quality','robotics','networkBasic','cyberSkills','dataScience']),
});
export function eligibleStudentQualification(education,q,age){
 if(!q||!Number.isInteger(age)||age<15||age>=18)return false;
 const school=education?.stage==='高専'?'高専':
  education?.stage==='高校'?(education.highSchoolTrack??education.school):null;
 return Boolean(school&&STUDENT_QUALIFICATIONS[school]?.includes(q.id)&&!q.license&&!q.degree);
}
export function qualificationRequirements(q,education,age){
 if(age<q.minAge&&!eligibleStudentQualification(education,q,age))return `${q.minAge}歳以上で受験できます（工業高校・商業高校・高専では一部の資格が15歳から受験可能）`;
 if(q.degree==='学士相当'&&!qualifiedBachelor(education))return '大学卒業相当の学歴が必要';
 if(q.degree&&q.degree!=='学士相当'&&education.degree!==q.degree)return `${q.degree}が必要`;
 if(q.prerequisite&&!hasQualification(education,q.prerequisite))return `${byId(q.prerequisite).name}の取得が必要`;
 return null;
}
/** Skill relevance differs by qualification; an unrelated high skill no longer gives a large bonus. */
export const QUALIFICATION_SKILLS=freeze({
 itEntry:['パソコン','技術力'],itFundamental:['技術力','パソコン'],itAdvanced:['技術力','パソコン'],
 networkBasic:['技術力','パソコン'],cyberSkills:['技術力','パソコン'],dataScience:['技術力','パソコン'],
 bookkeeping3:['事務力','パソコン'],bookkeeping2:['事務力','パソコン'],tax:['事務力','パソコン'],
 commercialPractical:['事務力','接客力'],marketing:['企画力','接客力'],officeTools:['事務力','パソコン'],
 logistics:['事務力','企画力'],businessManagement:['企画力','事務力'],
 industrial:['技術力','パソコン'],industrialAdvanced:['技術力','パソコン'],
 robotics:['技術力','パソコン'],electrical:['技術力','専門力'],cad:['技術力','パソコン'],
 quality:['技術力','事務力'],building:['技術力','企画力'],
 medicalAdmin:['事務力','支援力'],care:['支援力','専門力'],nutrition:['専門力','支援力'],
 cooking:['専門力','支援力'],pastry:['専門力','企画力'],
 finance:['事務力','パソコン'],financeAdvanced:['事務力','専門力'],
 design:['企画力','パソコン'],digitalArt:['企画力','パソコン'],videoEdit:['企画力','パソコン'],
 manga:['企画力','パソコン'],writing:['読書','企画力'],
 sport:['運動','専門力'],public:['事務力','読書'],research:['専門力','技術力'],
 physician:['専門力','支援力'],dentist:['専門力','技術力'],
 english:['接客力','読書'],tourism:['接客力','支援力']
});
export function qualificationAbility(education,q){
 const values=Object.values(education?.scores??{}).filter(Number.isFinite);
 const average=values.length?values.reduce((a,b)=>a+b,0)/values.length:0;
 const focused=Number(education?.scores?.[q.focus]??0);
 const skillNames=QUALIFICATION_SKILLS[q.id]??['専門力','パソコン'];
 const relevantSkill=Math.max(0,...skillNames.map(key=>Number(education?.skills?.[key]??0)).filter(Number.isFinite));
 const prep=Math.min(30,Math.max(0,Number(education?.qualificationTrack?.preparation?.[q.id]??0)));
 const study=Math.min(5,Math.floor((education?.studyHours??0)/70));
 const degreeBoost=q.level>=4&&qualifiedBachelor(education)?3:0;
 const skillWeight=q.level>=4?.45:.30;
 const readiness=cap(average*.22+focused*(.78-skillWeight)+relevantSkill*skillWeight+prep*.35+study+degreeBoost);
 return {average:cap(average),focused:cap(focused),relevantSkill:cap(relevantSkill),
  skillNames,readiness,preparation:prep};
}
/** Entry prerequisites for advanced exams; independent of eligibility by age/degree. */
export function qualificationAbilityBarrier(education,q){
 if(q.level<4)return null;
 const ability=qualificationAbility(education,q);
 const minimumSkill=q.level>=5?55:35;
 const minimumSubject=q.level>=5?70:55;
 if(ability.focused<minimumSubject)return `${q.focus}の学力が${minimumSubject}点以上必要（現在${ability.focused}点）`;
 if(ability.relevantSkill<minimumSkill)return `${ability.skillNames.join('・')}の専門技能が${minimumSkill}点以上必要（現在${ability.relevantSkill}点）`;
 return null;
}
/** Zero-fee school support applies only to eligible technical/vocational students. */
export function qualificationCost(education,q,age){
 const subsidized=eligibleStudentQualification(education,q,age);
 return {subsidized,preparation:subsidized?0:2000,exam:subsidized?0:q.fee};
}
/** Probability is a fictional game estimate and not an official exam pass rate. */
export function qualificationPreview(education,id,age){
 const q=byId(id);if(!q)return {ok:false,reason:'未登録の資格です。'};
 const earned=hasQualification(education,id);
 const requirement=qualificationRequirements(q,education,age);
 const ability=qualificationAbility(education,q);
 const barrier=qualificationAbilityBarrier(education,q);
 const chance=earned?100:requirement||barrier?0:cap(45+(ability.readiness-q.threshold)*2.4,4,95);
 return {ok:true,q,earned,requirement,barrier,readiness:ability.readiness,
  relevantSkill:ability.relevantSkill,skillNames:ability.skillNames,focused:ability.focused,
  chance,difficulty:qualificationDifficulty(q),preparation:ability.preparation};
}
export function recommendedQualifications(education){
 const school=education.program?.school??education.school??'';
 const major=education.major??'general',track=education.highSchoolTrack??'';
 const ids=school==='医学部'||education.degree==='医学課程修了'?['physician','medicalAdmin']:
 school==='歯学部'||education.degree==='歯学課程修了'?['dentist','medicalAdmin']:
 school==='大学院修士課程'||education.degree==='修士'?['research','itAdvanced','financeAdvanced']:
 /高専/.test(school)||track==='高専'||track==='工業高校'||school==='工業高校'?['industrial','electrical','cad','quality','industrialAdvanced','itFundamental','building']:
 track==='商業高校'||school==='商業高校'?['bookkeeping3','officeTools','commercialPractical','bookkeeping2','marketing','logistics']:
 major==='it'?['itEntry','itFundamental','networkBasic','dataScience','itAdvanced']:
 major==='business'?['bookkeeping3','bookkeeping2','commercialPractical','finance','marketing']:
 major==='care'?['medicalAdmin','care']:
 major==='creative'?['design','manga','digitalArt','videoEdit','writing']:
 ['bookkeeping3','itEntry','public'];
 return ids.map(byId).filter(Boolean);
}
export const JOB_QUALIFICATION_RULES=freeze({
 tech:{preferred:['itFundamental','industrial','networkBasic']},
 pro:{preferred:['research','itAdvanced']},
 office:{preferred:['bookkeeping3','bookkeeping2','officeTools','tax']},
 shop:{preferred:['bookkeeping3']},
 creative:{preferred:['design','writing']},
 care:{preferred:['care','medicalAdmin']},
 heavyIndustry:{preferred:['industrial','industrialAdvanced','quality']},
 automation:{preferred:['industrialAdvanced','itFundamental']},
 energy:{preferred:['industrial','industrialAdvanced']},
 precision:{preferred:['industrialAdvanced']},
 civil:{preferred:['building','industrial']},
 architect:{preferred:['building']},
 software:{preferred:['itFundamental','itAdvanced']},
 cyber:{required:['itFundamental'],preferred:['itAdvanced','cyberSkills']},
 gameDev:{preferred:['itFundamental','design','digitalArt']},
 research:{preferred:['research']},
 laboratory:{preferred:['research']},
 doctor:{required:['physician']},
 dentist:{required:['dentist']},
 medicalSupport:{preferred:['medicalAdmin']},
 analyst:{preferred:['bookkeeping2','financeAdvanced','dataScience']},
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
 video:{preferred:['design','videoEdit']},
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
 if(t.ageYears<18&&!eligibleStudentQualification(e,q,t.ageYears))return {ok:false,reason:'この資格は18歳からです。職業系高校・高専の対応資格は15歳から利用できます。'};
 const preview=qualificationPreview(e,q.id,t.ageYears);
 const costs=qualificationCost(e,q,t.ageYears);
 if(preview.earned)return {ok:false,reason:'この資格は取得済みです。'};
 if(preview.requirement)return {ok:false,reason:preview.requirement};
 const track=e.qualificationTrack??{earned:[],preparation:{},attempts:{}};
 if(action==='prepareQualification'){
   const previous=track.preparation[q.id]??0;
   if(previous>=30)return {ok:false,reason:'この資格の対策は十分です。受験に進んでください。'};
   if(f.cash<costs.preparation)return {ok:false,reason:`試験対策費${costs.preparation.toLocaleString('ja-JP')}円が必要です。`};
   e.qualificationTrack=track;
   f.cash-=costs.preparation;f.totals.expenses+=costs.preparation;
   track.preparation[q.id]=Math.min(30,previous+10);
   // Exams also train the specific practical skill, not only abstract test prep.
   const skill=QUALIFICATION_SKILLS[q.id]?.[0];
   if(skill)e.skills[skill]=Math.min(100,Number(e.skills?.[skill]??0)+5);
   h.energy=Math.max(0,h.energy-3);
   record(state,`${q.name}の受験対策${costs.subsidized?'（学校支援）':''}`,-costs.preparation);
   return {ok:true,message:`${q.name}の対策を進めました（準備${track.preparation[q.id]}/30）。合格見込みが改善します。`};
 }
 if(action!=='takeQualificationExam')return {ok:false,reason:'未対応の資格操作です。'};
 if(preview.barrier)return {ok:false,reason:`この資格は受験できません：${preview.barrier}。実習・職業研修で専門技能を高めてください。`};
 if(f.cash<costs.exam)return {ok:false,reason:`受験費用${costs.exam.toLocaleString('ja-JP')}円が必要です。`};
 const prev=track.attempts[q.id]??{count:0,lastMonth:0};
 if(prev.lastMonth===ym(t))return {ok:false,reason:'同じ資格の試験は1か月に1回までです。'};
 const rand=hiringRoll(q,t,prev.count,Number(state.random?.seed??0));
 const passed=rand<preview.chance;
 e.qualificationTrack=track;
 f.cash-=costs.exam;f.totals.expenses+=costs.exam;h.energy=Math.max(0,h.energy-5);
 track.attempts[q.id]={count:prev.count+1,lastMonth:ym(t)};
 if(passed){
   track.earned.push(q.id);
   if(q.license){
     e.licenses??=[];
     if(!e.licenses.includes(q.license))e.licenses.push(q.license);
   }
 }
 record(state,`${q.name}の試験：${passed?'合格':'不合格'}${costs.subsidized?'（学校支援）':''}`,-costs.exam);
 return {ok:true,passed,chance:preview.chance,message:passed?
   `${q.name}に合格しました。求人の応募資格・採用評価に反映されます。`:
   `${q.name}は不合格でした（挑戦時のゲーム内合格見込み${preview.chance}%）。準備して再挑戦できます。`};
}
