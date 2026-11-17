/** Parent aging and occasional wellbeing events, optional per-person state. */
const idx=d=>d.year*12+d.month-1;
const age=(d,p)=>d.year-p.birth.year-(d.month<p.birth.month?1:0);
export function validateParentWellbeing(data){
 if(data===undefined)return true;
 if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).length>2)return false;
 return Object.entries(data).every(([id,p])=>id.length<=35&&p&&typeof p==='object'&&
 Number.isInteger(p.health)&&p.health>=0&&p.health<=100&&Number.isInteger(p.lastMonth)&&p.lastMonth>=0&&p.lastMonth<=26412&&
 Number.isInteger(p.events)&&p.events>=0&&p.events<=1000);
}
export function parentSummary(state,parent){
 const ageYears=age(state.timeline,parent),h=state.familyJourney?.parentWellbeing?.[parent.id];
 return {age:ageYears,health:h?.health??Math.max(30,90-Math.max(0,ageYears-50)),events:h?.events??0};
}
export function advanceParentWellbeing(state,date){
 const progress=state.familyJourney;progress.parentWellbeing??={};
 const out=[];
 for(const parent of state.people.filter(p=>p.role==='父'||p.role==='母')){
  const a=age(date,parent);const x=progress.parentWellbeing[parent.id]??{health:Math.max(30,90-Math.max(0,a-50)),lastMonth:idx(date)-1,events:0};
  if(x.lastMonth>=idx(date))continue;
  if(date.month===parent.birth.month){
   x.health=Math.max(15,x.health-(a>=85?3:a>=70?2:a>=55?1:0));
   if(a>=65&&x.events<1000){
    x.events++;
    out.push({type:'family',title:parent.name+'の健康と近況',description:parent.name+'は'+a+'歳。現在の体調目安'+x.health+'/100。会話や交流で関係を維持できます。'});
   }
  }
  x.lastMonth=idx(date);progress.parentWellbeing[parent.id]=x;
 }
 return out;
}
