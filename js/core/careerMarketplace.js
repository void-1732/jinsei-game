/** Fictional employers beyond the six legacy balance-sheet companies.
 * Openings are calculated from the date: no mutable jobs are persisted.
 * Specialist careers require a path, credentials, or election milestones.
 */
export const CAREER_SECTORS=Object.freeze([
 '製造','IT','研究','医療','金融','出版','創作','飲食','スポーツ','政治','公共','建築','メディア','観光','小売','事務','福祉','企画'
]);
const posting=(id,company,job,sector,salary,minAge,threshold,focus,extras={})=>
 Object.freeze({id,company,job,sector,salary,minAge,threshold,focus,...extras});
export const EXTENDED_JOB_POSTINGS=Object.freeze([
 posting('heavyIndustry','東亜重工','大手製造技術職','製造',310000,18,66,'数学',{recommendation:true}),
 posting('automation','晴海ロボティクス','制御エンジニア','製造',295000,18,60,'数学',{recommendation:true}),
 posting('energy','東州エネルギー','設備保全技術者','製造',280000,18,55,'理科',{recommendation:true}),
 posting('precision','北星精密工業','精密機械技術者','製造',300000,18,64,'数学',{recommendation:true}),
 posting('civil','みらいインフラ建設','施工管理補助','建築',260000,18,53,'数学'),
 posting('architect','みなと都市設計','建築設計職','建築',300000,22,65,'数学',{degree:'bachelor'}),
 posting('software','青峰クラウド','ソフトウェアエンジニア','IT',325000,18,58,'数学'),
 posting('cyber','ひかり情報セキュリティ','セキュリティ技術者','IT',335000,18,66,'数学'),
 posting('gameDev','虹色ゲーム開発','ゲームプログラマー','IT',275000,18,55,'数学'),
 posting('research','南都先端研究所','研究開発職','研究',370000,24,73,'理科',{degree:'master'}),
 posting('laboratory','未来材料研究所','研究助手','研究',265000,18,53,'理科'),
 posting('doctor','青嶺総合病院','医師','医療',480000,24,75,'理科',{license:'医師',degree:'medicine'}),
 posting('dentist','そよかぜ歯科','歯科医師','医療',450000,24,74,'理科',{license:'歯科医師',degree:'dentistry'}),
 posting('medicalSupport','さくら医療センター','医療事務','医療',230000,18,48,'国語'),
 posting('analyst','光和証券','市場アナリスト','金融',350000,22,64,'数学',{degree:'bachelor'}),
 posting('trader','蒼海トレーディング','トレーダー','金融',300000,18,63,'数学'),
 posting('publisher','あけぼの出版','編集者','出版',265000,18,54,'国語'),
 posting('novelist','文苑書房','作家','創作',210000,18,62,'国語'),
 posting('manga','星空マンガ工房','漫画家','創作',205000,18,58,'国語'),
 posting('chef','銀杏レストラン','料理人','飲食',240000,18,48,'理科'),
 posting('pastry','紅葉菓子工房','パティシエ','飲食',225000,18,48,'理科'),
 posting('hotel','白波ホテル','ホテルスタッフ','観光',230000,18,46,'英語'),
 posting('athlete','未来スポーツクラブ','プロスポーツ選手','スポーツ',300000,18,68,'理科',{maxAge:35,athlete:true}),
 posting('coach','青葉体育協会','スポーツコーチ','スポーツ',245000,18,52,'理科'),
 posting('localPolitics','市民政策連盟','市区町村議員','政治',360000,25,53,'社会',{politicalRank:1}),
 posting('prefPolitics','広域政策連盟','都道府県議員','政治',460000,30,68,'社会',{politicalRank:2}),
 posting('nationalPolitics','未来政策会議','国会議員','政治',660000,30,80,'社会',{politicalRank:3}),
 posting('publicAdmin','地域公共サービス','行政職','公共',265000,18,52,'社会'),
 posting('journalist','新陽新聞社','記者','メディア',270000,18,55,'国語'),
 posting('video','七色映像制作','映像制作者','メディア',255000,18,54,'国語'),
]);
const monthKey=date=>date.year*12+date.month;
/** Stable per-month variation independent of rendering order and external time. */
export function employerOffer(post,date){
 const code=[...post.id].reduce((v,c)=>(v*33+c.charCodeAt(0))>>>0,5381);
 const cycle=(code+(monthKey(date)*7919))>>>0;
 const vacancies=(cycle%7===0||cycle%11===0)?0:1+(cycle%3);
 return {openings:vacancies,phase:vacancies===0?'募集休止':vacancies>=3?'積極採用':'通常募集'};
}
export function marketFocus(state){
 const career=state?.finances?.career??{};
 return career.targetSector??career.sector??null;
}
export function marketListings(state){
 const date=state.timeline,career=state.finances.career??{};
 const target=marketFocus(state);
 const internship=career.internships??{};
 const experience=career.sector??null;
 // Higher exposure improves DISCOVERY, not a firm's actual vacancies.
 const listings=EXTENDED_JOB_POSTINGS.map(post=>{
   const offer=employerOffer(post,date);
   const affinity=(post.sector===target?3:0)+(post.sector===experience?2:0)+Math.min(5,(internship[post.sector]??0)*2);
   const code=[...post.id].reduce((v,c)=>v+c.charCodeAt(0),0);
   const visible=((monthKey(date)*3+code)%8)<3+Math.min(4,affinity);
   return {...post,...offer,visible,affinity};
 });
 return listings.filter(p=>p.visible).sort((a,b)=>b.affinity-a.affinity||a.id.localeCompare(b.id));
}
export function postingIsVisible(state,id){
 return marketListings(state).some(p=>p.id===id&&p.openings>0);
}
export function careerEligibility(post,education,career,age){
 if(age<post.minAge)return `${post.minAge}歳から応募できます。`;
 if(post.maxAge&&age>post.maxAge)return `${post.maxAge}歳まで応募できます。`;
 const degree=education.degree??(education.graduated&&education.program?.years===4?'学士':null);
 const enoughBachelor=['学士','修士','医学課程修了','歯学課程修了'].includes(degree)||(education.graduated&&education.program?.years===4);
 if(post.degree==='bachelor'&&!enoughBachelor)return '大学等の学士課程修了が必要です。';
 if(post.degree==='master'&&degree!=='修士')return '大学院修士課程の修了が必要です。';
 if(post.degree==='medicine'&&degree!=='医学課程修了')return '6年制の医学課程を修了する必要があります。';
 if(post.degree==='dentistry'&&degree!=='歯学課程修了')return '6年制の歯学課程を修了する必要があります。';
 if(post.license&&!(education.licenses??[]).includes(post.license))return `${post.license}のゲーム内資格試験への合格が必要です。`;
 if(post.athlete&&(education.skills?.運動??0)<30)return 'スポーツ選手には運動技能30点以上が必要です。';
 if(post.politicalRank===2&&((career.politicalRank??0)<1||(career.politicalExperience??0)<24))return '市区町村議員として24か月以上の経験が必要です。';
 if(post.politicalRank===3&&((career.politicalRank??0)<2||(career.politicalExperience??0)<60))return '都道府県議員へのステップアップと通算60か月の議員経験が必要です。';
 return null;
}
export function schoolRecommendationBonus(education,post){
 const source=education.highSchoolTrack??'';
 const score=education.scores??{},mean=Object.values(score).reduce((a,b)=>a+b,0)/Math.max(1,Object.keys(score).length);
 if(!post.recommendation||mean<58)return 0;
 if(education.degree==='高専卒'||education.degree==='専攻科修了'||source==='高専')return 16;
 if(source==='工業高校')return 12;
 return 0;
}
export function validateCareerExpansion(career){
 if(!career||typeof career!=='object')return false;
 if(career.targetSector!==undefined&&career.targetSector!==null&&!CAREER_SECTORS.includes(career.targetSector))return false;
 if(career.sector!==undefined&&career.sector!==null&&!CAREER_SECTORS.includes(career.sector))return false;
 if(career.internships!==undefined&&(!career.internships||typeof career.internships!=='object'||Array.isArray(career.internships)||
    Object.entries(career.internships).some(([s,n])=>!CAREER_SECTORS.includes(s)||!Number.isInteger(n)||n<0||n>5)))return false;
 if(career.politicalRank!==undefined&&(!Number.isInteger(career.politicalRank)||career.politicalRank<0||career.politicalRank>3))return false;
 if(career.politicalExperience!==undefined&&(!Number.isInteger(career.politicalExperience)||career.politicalExperience<0||career.politicalExperience>2400))return false;
 if(career.reputation!==undefined&&(!Number.isInteger(career.reputation)||career.reputation<0||career.reputation>100))return false;
 return true;
}
