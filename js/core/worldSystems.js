/** 第6段階: 現実の統計・予報ではない架空の社会経済モデル。 */
const worldClamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));
export function createWorldData(){return {economyIndex:100,phase:'通常',employmentIndex:100,priceIndex:100,news:[],history:[],lastDate:null,employmentSupport:{lastIndex:-1,sessions:0},laborMarket:{openings:0,previousOpenings:null}};}
export function updateWorld(world,date,randomValue){
 const previous=world.phase;
 // 連続性のある決定的な簡易景気循環。現在の日本の指標ではない。
 const monthIndex=(date.year-2000)*12+date.month-1;
 const drift=Math.sin(monthIndex/18)*1.6 + (randomValue-.5)*2.2;
 world.economyIndex=worldClamp(Math.round(world.economyIndex+drift),65,135);
 world.phase=world.economyIndex>=108?'好況':world.economyIndex<=92?'不況':'通常';
 world.employmentIndex=worldClamp(Math.round(100+(world.economyIndex-100)*.65),75,125);
 world.priceIndex=worldClamp(Math.round(100+Math.max(0,monthIndex)*.025+(world.economyIndex-100)*.12),85,180);
 world.lastDate={...date};
 const events=[];
 if(previous!==world.phase){
   const item={year:date.year,month:date.month,title:`景気が「${world.phase}」へ変化`,description:'ゲーム内の架空の経済指標が変化しました。'};
   world.news.unshift(item);world.history.push(item);events.push({type:'society',...item});
 }
 if(date.month===1){
   const item={year:date.year,month:1,title:`${date.year}年の社会経済見通し`,description:`景気：${world.phase}／景気指数：${world.economyIndex}。この数値はゲーム内の架空指標です。`};
   world.news.unshift(item);world.history.push(item);events.push({type:'news',...item});
 }
 world.news.length=Math.min(world.news.length,48);
 world.history.length=Math.min(world.history.length,360);
 return events;
}
export function incomeMultiplier(world){return world.phase==='好況'?1.05:world.phase==='不況'?0.9:1;}

/** 第35段階：景気・求人・雇用支援を結びつける簡易制度。 */
export function jobMarketAdjustment(world){
 const index=world?.employmentIndex;
 return Number.isFinite(index)?Math.max(-5,Math.min(5,Math.round((index-100)/5))):0;
}
export function requestEmploymentSupport(world,career,date,age){
 if(age<18)return {ok:false,reason:'18歳から職業相談を利用できます。'};
 if(career.job)return {ok:false,reason:'就業中は失業者向けの職業相談を利用できません。'};
 const support=world.employmentSupport??(world.employmentSupport={lastIndex:-1,sessions:0});
 const current=date.year*12+date.month-1;
 if(current-support.lastIndex<3)return {ok:false,reason:'職業相談は3か月に1回利用できます。'};
 if((career.searchEffort??0)>=3)return {ok:false,reason:'就職活動の準備は最大段階に達しています。'};
 career.searchEffort=(career.searchEffort??0)+1;
 support.lastIndex=current;support.sessions++;
 return {ok:true,message:'職業相談を受け、応募時の評価に使う準備度が上がりました。'};
}
export function updateLaborMarket(world,companies,date){
 const market=world.laborMarket??(world.laborMarket={openings:0,previousOpenings:null});
 const current=companies.reduce((sum,c)=>sum+(c.status==='営業停止'?0:(c.openings??0)),0);
 const old=market.previousOpenings;
 market.openings=current;market.previousOpenings=current;
 if(old===null || Math.abs(current-old)<4)return null;
 const news={year:date.year,month:date.month,title:current>old?'求人募集が増加':'求人募集が減少',description:`架空の求人企業6社の募集枠が${old}枠から${current}枠に変化しました。`};
 world.news.unshift(news);world.news.length=Math.min(world.news.length,48);
 world.history.push(news);world.history.length=Math.min(world.history.length,360);
 return {type:'labor-market',...news};
}
