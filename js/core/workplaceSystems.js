/** 第11段階：職場交流・人事評価・事業の人材管理（架空のゲームモデル）。 */
const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,Math.round(v)));
const coworkers=Object.freeze([{role:'上司',name:'佐藤 真由',trust:50,personality:'慎重',skill:78},{role:'同僚',name:'田中 悠斗',trust:50,personality:'協調的',skill:64},{role:'同僚',name:'鈴木 葵',trust:50,personality:'積極的',skill:71}]);
export function resetWorkplacePeople(career){
 career.workplacePeople=coworkers.map((person,i)=>({...person,id:`WORK-${i+1}`}));
 career.workplaceIncidents=[];
}

export function ensureWorkplace(finances){
 const c=finances.career,b=finances.business;
 c.performance ??= 50;
 c.supervisorTrust ??= 50;
 c.coworkerTrust ??= 50;
 c.workplaceActions ??= 0;
 c.reviews ??= [];
 if(!Array.isArray(c.workplacePeople))resetWorkplacePeople(c);
 c.workplaceIncidents ??= [];
 c.monthlyRating ??= 50;
 b.staff ??= Array.from({length:b.employees??0},(_,i)=>({id:`STAFF-${i+1}`,name:`従業員${i+1}`,skill:45,morale:60,salary:45000}));
 b.nextStaffId ??= Math.max(0,...b.staff.map(x=>Number(x.id.split('-').at(-1))||0))+1;
 b.results ??= [];
 b.reputation ??= 50;
 b.marketHistory ??= [];
 b.employees=b.staff.length;
}
export function workplaceAction(finances,action,payload={},context={}){
 ensureWorkplace(finances);
 const c=finances.career,b=finances.business;
 const log=(label)=>{finances.ledger.push({year:context.year,month:context.month,kind:'記録',label,amount:0});if(finances.ledger.length>600)finances.ledger.shift();};
 if(['workHard','helpColleague','talkSupervisor','reviewPerformance','interactCoworker','resolveWorkIncident'].includes(action)){
  if(!c.job)return {ok:false,reason:'勤務先が必要です。'};
  if(action==='reviewPerformance'){
   if(c.experience<3)return {ok:false,reason:'勤続3か月以上で人事評価を受けられます。'};
   const score=clamp(c.performance*.6+c.supervisorTrust*.25+c.coworkerTrust*.15);
   const grade=score>=80?'優秀':score>=60?'良好':score>=40?'標準':'要改善';
   c.reviews.push({year:context.year,month:context.month,score,grade});if(c.reviews.length>24)c.reviews.shift();
   log(`人事評価：${grade}（${score}点）`);
   return {ok:true,message:`人事評価は「${grade}」（${score}点）でした。`};
  }
  if(action==='resolveWorkIncident'){
   const incident=c.workplaceIncidents.find(x=>x.id===payload.incidentId && !x.resolved);
   if(!incident)return {ok:false,reason:'対応できる職場イベントがありません。'};
   if(!['協力','対話'].includes(payload.choice))return {ok:false,reason:'対応方法を選択してください。'};
   incident.resolved=true;incident.choice=payload.choice;
   if(payload.choice==='協力'){c.performance=clamp(c.performance+4);c.coworkerTrust=clamp(c.coworkerTrust+5);}
   else {c.supervisorTrust=clamp(c.supervisorTrust+5);c.coworkerTrust=clamp(c.coworkerTrust+2);}
   log(`職場イベントに対応：${payload.choice}`);return {ok:true,message:'職場イベントへの対応を反映しました。'};
  }
  if(c.workplaceActions>=2)return {ok:false,reason:'職場行動は1ターンにつき2回までです。'};
  if(action==='interactCoworker'){
   const person=c.workplacePeople.find(p=>p.id===payload.personId);
   if(!person)return {ok:false,reason:'職場の人物を選択してください。'};
   c.workplaceActions++;person.trust=clamp(person.trust+8);
   if(person.role==='上司')c.supervisorTrust=clamp(c.supervisorTrust+5);
   else c.coworkerTrust=clamp(c.coworkerTrust+5);
   log(`${person.name}と交流`);return {ok:true,message:`${person.name}との信頼関係が深まりました。`};
  }
  c.workplaceActions++;
  if(action==='workHard'){c.performance=clamp(c.performance+7);c.supervisorTrust=clamp(c.supervisorTrust+2);}
  if(action==='helpColleague'){c.coworkerTrust=clamp(c.coworkerTrust+8);c.performance=clamp(c.performance+2);}
  if(action==='talkSupervisor'){c.supervisorTrust=clamp(c.supervisorTrust+7);}
  log(action==='workHard'?'業務に集中':action==='helpColleague'?'同僚を支援':'上司と面談');
  return {ok:true,message:'職場での行動を反映しました。'};
 }
 if(!b.active)return {ok:false,reason:'事業を開始してください。'};
 if(action==='trainStaff'||action==='dismissStaff'){
  const person=b.staff.find(p=>p.id===payload.staffId);
  if(!person)return {ok:false,reason:'従業員を選択してください。'};
  if(action==='dismissStaff'){
   b.staff=b.staff.filter(p=>p.id!==person.id);b.employees=b.staff.length;log(`${person.name}が退職`);return {ok:true,message:'従業員の登録を終了しました。'};
  }
  if(finances.cash<30000)return {ok:false,reason:'研修費用3万円が必要です。'};
  finances.cash-=30000;finances.totals.expenses+=30000;
  finances.ledger.push({year:context.year,month:context.month,kind:'支出',label:'従業員研修費',amount:-30000});
  person.skill=clamp(person.skill+12);person.morale=clamp(person.morale+5);
  return {ok:true,message:`${person.name}の技能を強化しました。`};
 }
 if(action==='staffCare'){
  if(!b.staff.length)return {ok:false,reason:'従業員がいません。'};
  for(const person of b.staff)person.morale=clamp(person.morale+6);
  b.reputation=clamp(b.reputation+2);log('従業員の働きやすさを改善');return {ok:true};
 }
 return {ok:false,reason:'未対応の職場操作です。'};
}
export function advanceWorkplace(finances, date){
 ensureWorkplace(finances);
 const c=finances.career,b=finances.business;
 c.workplaceActions=0;
 if(c.job){
  c.performance=clamp(Math.max(45,c.performance-1));c.coworkerTrust=clamp(Math.max(45,c.coworkerTrust-1));
  for(const person of c.workplacePeople){
   person.personality ??= person.role==='上司'?'慎重':'協調的';
   person.skill ??= 60;
   const influence=person.personality==='協調的'?1:person.personality==='積極的' && c.performance>=65?2:0;
   person.trust=clamp(Math.max(35,person.trust-1+influence));
   if(date.month===4)person.skill=clamp(person.skill+1);
  }
  c.monthlyRating=clamp(c.performance*.55+c.supervisorTrust*.3+c.coworkerTrust*.15);
  if(c.experience>0&&c.experience%6===0){
   const id=`INC-${date.year}-${date.month}`;
   if(!c.workplaceIncidents.some(x=>x.id===id))c.workplaceIncidents.push({id,title:c.experience%12===0?'部署間の調整':'共同作業の相談',year:date.year,month:date.month,resolved:false});
   if(c.workplaceIncidents.length>12)c.workplaceIncidents.shift();
  }
 }
 if(b.active){
  const revenueBase=b.monthlyRevenue||0;
  const averageSkill=b.staff.length?b.staff.reduce((s,p)=>s+p.skill,0)/b.staff.length:0;
  const averageMorale=b.staff.length?b.staff.reduce((s,p)=>s+p.morale,0)/b.staff.length:0;
  const result={year:date.year,month:date.month,employees:b.staff.length,averageSkill:Math.round(averageSkill),averageMorale:Math.round(averageMorale),baseRevenue:revenueBase,reputation:b.reputation};
  b.results.push(result);if(b.results.length>36)b.results.shift();
  for(const person of b.staff){
   person.monthsEmployed=(person.monthsEmployed??0)+1;
   if(person.monthsEmployed%12===0){person.skill=clamp(person.skill+3);person.salary=Math.min(1000000,person.salary+1000);}
   person.morale=clamp(person.morale-(b.policy==='成長'?2:1));
  }
  // 著しい低意欲が続いた従業員の離職。年月と従業員IDで決まり、再現可能。
  if(date.month===4){const leaving=b.staff.filter(p=>p.morale<20 && p.monthsEmployed>=12);
   if(leaving.length){b.staff=b.staff.filter(p=>!leaving.includes(p));b.employees=b.staff.length;b.reputation=clamp(b.reputation-2*leaving.length);}}
  b.marketHistory.push({year:date.year,month:date.month,employees:b.employees,baseRevenue:revenueBase,averageSkill:Math.round(averageSkill),averageMorale:Math.round(averageMorale)});
  if(b.marketHistory.length>36)b.marketHistory.shift();
 }
}
export function staffProductivity(business){
 const staff=business.staff;
 if(!Array.isArray(staff))return 1;
 return staff.length ? Math.max(.7,Math.min(1.3,staff.reduce((sum,p)=>sum+(p.skill*.6+p.morale*.4),0)/staff.length/50)) : 1;
}
