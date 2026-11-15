import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameStore} from '../js/core/gameState.js';
import {validateGameState} from '../js/core/saveSystems.js';
import {REGIONS,validateLiving} from '../js/core/livingSystems.js';
import {getScreenFieldValues} from '../js/core/screenFieldValues.js';
const begin=()=>{const s=createGameStore();assert.equal(s.startNewGame({name:'生活検証',seed:12}).ok,true);return s;};
const adult=s=>{while(s.getState().timeline.ageYears<18)s.advanceTurn();};
test('第27段階：日本国内10地域、初期住居と日本語画面の値',()=>{
 assert.equal(REGIONS.length,10);assert.equal(new Set(REGIONS.map(x=>x.name)).size,10);
 const s=begin(),g=s.getState();assert.equal(g.finances.living.housing,'実家');
 assert.equal(getScreenFieldValues('LIFE-02',g)['居住地域'],'東京・東京23区');
 assert.equal(getScreenFieldValues('LIFE-07',g)['加入保険'],'未加入');
 assert.equal(validateGameState(g),true);
});
test('第27段階：18歳未満は変更不可、成年後の地域変更と家賃・基本生活費を分離',()=>{
 const s=begin();assert.equal(s.performAction('moveHome',{region:'香川・高松',housing:'賃貸'}).ok,false);
 adult(s);const loaded=structuredClone(s.getState());loaded.finances.cash=200000;assert.equal(s.loadState(loaded).ok,true);const before=s.getState().finances;
 assert.equal(s.performAction('moveHome',{region:'香川・高松',housing:'賃貸'}).ok,true);
 const changed=s.getState().finances;assert.equal(changed.living.monthlyHousingCost,62000);
 assert.equal(changed.monthlyBudget,before.monthlyBudget);
 assert.equal(changed.cash,before.cash-124000);
 const prev=changed.totals.expenses;s.advanceTurn();const now=s.getState().finances;
 assert.equal(now.totals.expenses-prev>=147000,true);
 assert.ok(now.ledger.some(x=>x.label==='住居費'&&x.amount===-62000));
});
test('第27段階：持ち家は資産計上し売却時の入金は給与・収入総額と区別',()=>{
 const s=begin();adult(s);
 const raw=structuredClone(s.getState());raw.finances.cash=40000000;assert.equal(s.loadState(raw).ok,true);
 assert.equal(s.performAction('moveHome',{region:'鹿児島・鹿児島',housing:'持ち家'}).ok,true);
 const value=s.getState().finances.living.propertyValue;assert.equal(value,59000*180);
 const income=s.getState().finances.totals.income;
 assert.equal(s.performAction('moveHome',{region:'新潟・新潟',housing:'賃貸'}).ok,true);
 assert.equal(s.getState().finances.totals.income,income);
 assert.equal(s.getState().finances.living.propertyValue,0);
});
test('第27段階：保険料の月次処理と同一疾病の二重給付防止',()=>{
 const s=begin();adult(s);
 assert.equal(s.performAction('setInsurance',{plan:'基本保障'}).ok,true);
 const before=s.getState().finances.totals.expenses;s.advanceTurn();
 assert.ok(s.getState().finances.totals.expenses-before>=3000);
 const g=structuredClone(s.getState());g.health.illness={name:'体調不良',months:0};assert.equal(s.loadState(g).ok,true);
 const cash=s.getState().finances.cash;
 assert.equal(s.performAction('claimInsurance').ok,true);
 assert.equal(s.getState().finances.cash,cash+15000);
 assert.equal(s.performAction('claimInsurance').ok,false);
});
test('第27段階：旧セーブの補完と不正住居・保険値の拒否',()=>{
 const s=begin(),old=structuredClone(s.getState());delete old.finances.living;
 assert.equal(validateGameState(old),true);assert.equal(s.loadState(old).ok,true);
 assert.equal(s.getState().finances.living.insurance,'未加入');
 const bad=structuredClone(s.getState());bad.finances.living.monthlyHousingCost=-1;
 assert.equal(validateGameState(bad),false);assert.equal(s.loadState(bad).ok,false);
 assert.equal(validateLiving({...s.getState().finances.living,insurance:'無制限給付'}),false);
});
test('第27段階：同じ操作と乱数条件で進行が再現される',()=>{
 const a=begin(),b=begin();adult(a);adult(b);
 for(const s of [a,b]){s.performAction('moveHome',{region:'宮城・仙台',housing:'賃貸'});s.performAction('setInsurance',{plan:'充実保障'});}
 for(let i=0;i<24;i++){a.advanceTurn();b.advanceTurn();}
 assert.deepEqual(a.getState(),b.getState());
});
