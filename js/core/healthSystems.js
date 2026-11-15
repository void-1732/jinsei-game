/** 第6段階：健康・生活習慣・治療。すべてゲーム内の架空モデル。 */
const healthClamp=(n,lower=0,upper=100)=>Math.max(lower,Math.min(upper,Math.round(n)));
const HABITS=['運動','休養','食生活'];
export function createHealthData(){return {physical:85,mental:80,energy:85,habits:{運動:0,休養:0,食生活:0},illness:null,medicalVisits:0,healthHistory:[],lastActionMonth:null};}
export function advanceHealth(h,date,age,randomValue,{balanced=false,financialStress=false}={}){
 const notes=[];
 const aging=age>=65?2:age>=45?1:0;
 // The original simulation stays unchanged. The playable mode ages gradually
 // rather than removing 1-3 health points on every single month.
 const gradualLoss=age>=80?1:age>=65?(date.month%2===0?1:0):age>=45?(date.month%4===0?1:0):age>=18?(date.month===1?1:0):0;
 const exercise=h.habits.運動,rest=h.habits.休養,food=h.habits.食生活;
 h.physical=healthClamp(h.physical-(balanced?gradualLoss:(age>=18?1:0)+aging)+Math.floor((exercise+food)/40));
 h.mental=healthClamp(h.mental-(balanced?(financialStress&&date.month%3===0?1:0):(age>=18?1:0))+Math.floor(rest/25));
 h.energy=healthClamp(h.energy+2-(h.illness?5:0)+Math.floor(rest/20));
 for(const habit of HABITS)h.habits[habit]=Math.max(0,h.habits[habit]-2);
 if(h.illness){h.illness.months++;h.physical=healthClamp(h.physical-3);h.energy=healthClamp(h.energy-3);
   // 自然治癒。治療により直ちに治すことも可能。
   if(h.illness.months>=3){notes.push({type:'recovery',title:'体調が回復',description:'病気から自然に回復しました。'});h.illness=null;}
 }else if(age>=5 && randomValue < (h.physical<45?0.055:0.012)){
   h.illness={name:'体調不良',months:0};h.physical=healthClamp(h.physical-8);h.energy=healthClamp(h.energy-10);
   notes.push({type:'illness',title:'体調不良',description:'体調を崩しました。健康画面から治療できます。'});
 }
 // Playable-mode quality fix: illness should not make lifelong physical decline
 // irreversible, especially during childhood. Recovery has an age-dependent
 // ceiling; daily actions and treatment still matter for reaching higher values.
 if(balanced && !h.illness){
   const recoveryLimit=age<18?85:age<65?70:age<80?55:40;
   const recovery=age<18?2:age<65?1:(date.month%2===0?1:0);
   if(h.physical<recoveryLimit)h.physical=healthClamp(Math.min(recoveryLimit,h.physical+recovery));
 }
 if(h.physical<=30||h.mental<=25)notes.push({type:'health-warning',title:'健康状態に注意',description:'体調や精神状態が低下しています。生活習慣を見直してください。'});
 h.healthHistory.push({year:date.year,month:date.month,physical:h.physical,mental:h.mental,energy:h.energy,illness:h.illness?.name??null});
 if(h.healthHistory.length>240)h.healthHistory.shift();
 return notes;
}
export function healthAction(h,action,payload,date,finance){
 const thisMonth=`${date.year}-${date.month}`;
 if(action==='habit'){
   if(!HABITS.includes(payload.habit))return {ok:false,reason:'生活習慣の種類が不正です。'};
   if(h.lastActionMonth===thisMonth)return {ok:false,reason:'生活習慣の改善は1か月に1回です。'};
   h.habits[payload.habit]=healthClamp(h.habits[payload.habit]+15);
   h.physical=healthClamp(h.physical+(payload.habit==='運動'?3:payload.habit==='食生活'?2:0));
   h.mental=healthClamp(h.mental+(payload.habit==='休養'?5:1));
   h.energy=healthClamp(h.energy+(payload.habit==='休養'?8:0));
   h.lastActionMonth=thisMonth;return {ok:true};
 }
 if(action==='treatment'){
   if(!h.illness)return {ok:false,reason:'現在、治療対象の病気はありません。'};
   // 第29段階：簡易公的医療保障。本人負担は7割、差額は保障負担（架空制度）。
   const fullCost=5000;
   const cost=3500;
   if(finance){if(finance.cash>=cost)finance.cash-=cost;else{finance.debt+=cost-finance.cash;finance.cash=0;}
     finance.totals.expenses+=cost;
     finance.ledger.push({year:date.year,month:date.month,kind:'支出',label:'診療費（ゲーム内）',amount:-cost});
     if(finance.ledger.length>600)finance.ledger.shift();}
   if(finance?.living)finance.living.medicalSubsidyPaid=(finance.living.medicalSubsidyPaid??0)+(fullCost-cost);
   h.medicalVisits++;h.illness=null;h.physical=healthClamp(h.physical+12);h.energy=healthClamp(h.energy+10);
   return {ok:true,cost};
 }
 return {ok:false,reason:'未対応の健康操作です。'};
}
