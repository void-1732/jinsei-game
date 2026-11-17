import {eraSummary,eraEconomicEffects} from '../core/eraSystems.js';
import {checkupGuidance} from '../core/healthSystems.js';
import {CIVIC_ACTIVITIES,communityEffects} from '../core/civicSystems.js';
import {rareLifeSummary} from '../core/rareLifeEvents.js';
/** 第6段階の状態・操作パネル。ゲーム状態はhandlers経由でのみ更新。 */
const node=(tag,cls='',label='')=>{const n=document.createElement(tag);n.className=cls;n.textContent=label;return n;};
function line(root,k,v){const r=node('div','field-list-item');r.append(node('strong','',k),node('span','',String(v)));root.append(r);}
function button(root,label,act,disabled=false){const b=node('button','button button-secondary phase6-action',label);b.type='button';b.disabled=disabled;b.addEventListener('click',act);root.append(b);return b;}
export function renderWorldPanel(container,screen,game,handlers={}){
 const health=screen.id.startsWith('HEALTH-'),society=screen.id.startsWith('SOCIETY-'),events=screen.id.startsWith('EVENT-');
 if(!health&&!society&&!events&&screen.id!=='LIFE-01')return false;
 const section=node('section','content-card phase4-panel phase6-panel', '');
 section.append(node('h2','',health?'健康・医療':society?'社会・経済・ニュース':events?'人生イベント':'健康・社会状況'));
 if(!game?.initialized){section.append(node('p','muted','人生を開始すると情報が表示されます。'));container.prepend(section);return true;}
 const h=game.health,w=game.world;
 if(health||screen.id==='LIFE-01'){
   line(section,'身体の健康',`${h.physical} / 100`);line(section,'精神の健康',`${h.mental} / 100`);line(section,'体力',`${h.energy} / 100`);
   line(section,'現在の病気',h.illness?.name??'なし');line(section,'診療回数',`${h.medicalVisits}回`);
   if(health){for(const [key,val]of Object.entries(h.habits))line(section,`${key}の習慣`,`${val} / 100`);
     const controls=node('div','phase4-actions');for(const habit of ['運動','休養','食生活'])button(controls,`${habit}を改善`,()=>handlers.onAction?.('habit',{habit}),h.lastActionMonth===`${game.timeline.year}-${game.timeline.month}`);
     button(controls,'病気を治療する（自己負担3,500円）',()=>handlers.onAction?.('treatment',{}),!h.illness);
     const month=`${game.timeline.year}-${game.timeline.month}`;
     button(controls,`${checkupGuidance(game.timeline.ageYears)}（1,000円）`,()=>handlers.onAction?.('checkup',{}),h.lastCheckupMonth===month);
     section.append(controls);
     if(screen.id==='HEALTH-08'||screen.id==='HEALTH-01'){
       section.append(node('h3','','最近の健康履歴'));
       for(const entry of h.healthHistory.slice(-6).reverse())line(section,`${entry.year}年${entry.month}月`, `身体 ${entry.physical}・精神 ${entry.mental}${entry.illness?'・'+entry.illness:''}`);
     }
   }
 }
 if(society||screen.id==='LIFE-01'){
   line(section,'景気の状態',w.phase);line(section,'景気指数',w.economyIndex);line(section,'雇用指数',w.employmentIndex);line(section,'物価指数',w.priceIndex);
   if(society){
     const era=eraSummary(w);
     if(era){
       section.append(node('h3','','いまの社会の変化と生活への影響'));
       line(section,'技術の広がり',`${era.tech}/100 ・ ${era.techLabel}`);
       line(section,'社会のつながり',`${era.social}/100`);
       line(section,'暮らしの価格環境',era.price);
       line(section,'雇用の状況',era.labor);
       line(section,'月額生活費の変化',`${era.livingImpact>=0?'+':''}${era.livingImpact}%（家計予算比）`);
       line(section,'月額給与の変化',`${era.wageImpact>=0?'+':''}${era.wageImpact}%（基本給比）`);
       if(era.latest)section.append(node('p','muted small',`社会ニュース：${era.latest.title}`));
       line(section,'社会への対応',`学び${era.choices.learning} / 助け合い${era.choices.community} / 節約${era.choices.frugality}`);
     }
     const companies=game.finances?.companyMarket??[];
     if(companies.length){
       line(section,'企業6社の求人枠合計',`${companies.reduce((sum,c)=>sum+(c.status==='営業停止'?0:c.openings),0)}枠`);
       const firms=node('details','phase4-extra');firms.append(node('summary','','企業別の求人状況'));
       for(const c of companies)line(firms,c.name,`${c.status==='営業停止'?0:c.openings}枠 ／ 業績 ${c.performance}点 ／ ${c.status}`);
     }
     const support=w.employmentSupport??{sessions:0,lastIndex:-1};
     line(section,'職業相談の利用回数',`${support.sessions}回`);
     const age=game.timeline.ageYears,career=game.finances?.career;
     const now=game.timeline.year*12+game.timeline.month-1;
     button(section,'失業者向けの職業相談を受ける',()=>handlers.onAction?.('employmentSupport',{}),age<18||Boolean(career?.job)||(career?.searchEffort??0)>=3||now-support.lastIndex<3);
     const news=node('details','phase4-extra');news.append(node('summary','',`ゲーム内ニュース（${Math.min(10,w.news.length)}件）`));
     if(!w.news.length)news.append(node('p','muted','ニュースはまだありません。時間を進めると追加されます。'));
     for(const item of w.news.slice(0,10)){const x=node('div','phase6-news');x.append(node('strong','',`${item.year}年${item.month}月　${item.title}`),node('p','muted small',item.description));news.append(x);}section.append(news);
   }
 }
 if(events){
   const pending=game.pendingEvents.filter(x=>x.type==='choice');line(section,'未回答の選択イベント',`${pending.length}件`);
   for(const e of pending){const wrap=node('div','phase6-choice');wrap.append(node('h3','',e.title),node('p','',e.description));const controls=node('div','phase4-actions');
     if(e.story){
       wrap.append(node('p','muted small','この出来事の選択は、右側の「次のターンへ進む」から行います。'));
     } else {
       for(const option of e.options)button(controls,option.label,()=>handlers.onAction?.('resolveChoice',{eventId:e.id,choice:option.id}));
       wrap.append(controls);
     }
     section.append(wrap);
   }
   const rare=rareLifeSummary(game);
   line(section,'数年に一度の特別イベント',`${rare.total}回`);
   if(rare.history.length){
     const special=node('details','phase4-extra');
     special.append(node('summary','','火災・災害・転機の履歴'));
     for(const h of rare.history)line(special,`${h.year}年${h.month}月・${h.kind}`,
       `自己負担${h.loss.toLocaleString('ja-JP')}円／保険${h.insured.toLocaleString('ja-JP')}円／軽減${h.prevented.toLocaleString('ja-JP')}円`);
     section.append(special);
   }
   section.append(node('h3','','最近の人生イベント'));
   for(const e of game.eventHistory.filter(x=>['choice','choice-result','illness','recovery','society'].includes(x.type)).slice(-12).reverse())line(section,`${e.year}年${e.month}月・${e.title}`,e.description);
 }
 section.append(node('p','muted small','健康・医療費・景気・ニュースはゲーム用の架空モデルです。現実の診療、経済統計、ニュースではありません。'));
 container.prepend(section);return true;
}
