/** 第9段階：友人、交際、結婚、子育て。現実の法律や人口動態を完全再現しない。 */
const ageAt=(t,p)=>t.year-p.birth.year-(t.month<p.birth.month?1:0);
const socialClamp=n=>Math.max(0,Math.min(100,n));
const acquaintances=['葵','悠斗','美咲','蓮','陽菜','結衣','大翔','凛'];
export function socialAction(state,action,payload={}){
  const {people,timeline:t,household}=state;
  const partner=people.find(p=>p.id===payload.personId && p.role!=='本人');
  if(action==='meetFriend'){
    if(t.ageYears<6)return {ok:false,reason:'友人との交流は6歳からです。'};
    const existing=people.filter(p=>p.role==='友人'||p.role==='配偶者'||p.role==='交際相手').length;
    if(existing>=8)return {ok:false,reason:'現在の知人登録は8人までです。'};
    const next=people.filter(p=>p.id.startsWith('FRIEND-')).length+1;
    const id=`FRIEND-${String(next).padStart(3,'0')}`;
    const person={id,name:acquaintances[(next-1)%acquaintances.length],birth:{year:2000+(next%3)-1,month:1+(next%11),day:1},role:'友人',relationship:35};
    people.push(person);return {ok:true,personId:id};
  }
  if(action==='date'){
    if(t.ageYears<18)return {ok:false,reason:'交際は18歳から選択できます。'};
    if(!partner||partner.role!=='友人'||partner.relationship<60||ageAt(t,partner)<18)return {ok:false,reason:'18歳以上で関係値60以上の友人を選んでください。'};
    if(people.some(p=>['配偶者','交際相手'].includes(p.role)))return {ok:false,reason:'すでに交際相手または配偶者がいます。'};
    partner.role='交際相手';return {ok:true};
  }
  if(action==='marry'){
    if(t.ageYears<18||!partner||partner.role!=='交際相手'||partner.relationship<80||ageAt(t,partner)<18)return {ok:false,reason:'双方18歳以上、交際中で関係値80以上が必要です。'};
    partner.role='配偶者';household.memberIds.push(partner.id);return {ok:true};
  }
  if(action==='haveChild'){
    if(t.ageYears<18||t.ageYears>=60||!people.some(p=>p.role==='配偶者'))return {ok:false,reason:'18～59歳で配偶者がいる場合に子どもを迎えられます。'};
    const children=people.filter(p=>p.role==='子').length;
    if(children>=5)return {ok:false,reason:'子どもは5人まで登録できます。'};
    const id=`CHILD-${String(children+1).padStart(3,'0')}`;
    const name=typeof payload.name==='string'?payload.name.trim():'';
    if(!name||name.length>20)return {ok:false,reason:'子どもの名前を1～20文字で入力してください。'};
    people.push({id,name,birth:{year:t.year,month:t.month,day:1},role:'子',relationship:80});
    household.memberIds.push(id);return {ok:true,personId:id};
  }
  if(action==='familyCare'){
    if(!partner||partner.role!=='子')return {ok:false,reason:'子どもを選択してください。'};
    partner.relationship=socialClamp(partner.relationship+5);return {ok:true};
  }
  return {ok:false,reason:'未対応の人物操作です。'};
}
export function evaluateSchool(scores,stage){
  const avg=Math.round(Object.values(scores).reduce((a,b)=>a+b,0)/Object.values(scores).length);
  if(stage==='高校')return {average:avg,school:avg>=75?'進学校':avg>=55?'県立高校':'地域高校'};
  if(stage==='大学')return {average:avg,school:avg>=80?'難関大学':avg>=60?'総合大学':'地域大学'};
  return {average:avg,school:null};
}

/** 家族の状況を年次で更新。既存の親族データを消さない。 */
export function advanceFamily(state,date){
  const events=[];
  for(const person of state.people){
    if(person.role!=='子')continue;
    const age=ageAt(date,person);
    const yearInSchool=date.year-(date.month<4?1:0);
    const schoolAge=yearInSchool-person.birth.year;
    const stage=schoolAge<6?'未就学':schoolAge<12?'小学校':schoolAge<15?'中学校':schoolAge<18?'高校':'成人';
    const old=person.lifeStage;
    person.lifeStage=stage;
    if(old!==undefined&&old!==stage){
      const title=`${person.name}の成長：${stage}`;
      events.push({type:'family',title,description:`${person.name}は${stage}になりました。`});
    }
    if(date.month===4&&age>=1&&age<18)person.relationship=socialClamp(person.relationship-1);
  }
  return events;
}
export function familyActivity(state,payload={}){
  const child=state.people.find(p=>p.id===payload.personId&&p.role==='子');
  if(!child)return {ok:false,reason:'子どもを選んでください。'};
  if(state.timeline.ageYears<18)return {ok:false,reason:'保護者としての行動は18歳からです。'};
  const activity=payload.activity;
  if(!['遊ぶ','勉強を手伝う'].includes(activity))return {ok:false,reason:'家族行動を選んでください。'};
  child.relationship=socialClamp(child.relationship+(activity==='遊ぶ'?5:3));
  if(activity==='勉強を手伝う')child.learningSupport=Math.min(100,(child.learningSupport??0)+3);
  return {ok:true,relationship:child.relationship};
}
