import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameStore} from '../js/core/gameState.js';
import {netWorth} from '../js/core/economySystems.js';
import {REGIONAL_FACTORS,getHousingEquity} from '../js/core/livingSystems.js';
import {validateGameState} from '../js/core/saveSystems.js';
import {getScreenFieldValues} from '../js/core/screenFieldValues.js';
function adult(){const s=createGameStore();s.startNewGame({name:'住宅検証',seed:222});while(s.getState().timeline.ageYears<18)s.advanceTurn();return s;}
function funded(s,cash=10000000){const g=structuredClone(s.getState());g.finances.cash=cash;assert.equal(s.loadState(g).ok,true);}
test('第28段階：ローン購入は頭金と元本を区別し、住宅純資産に反映する',()=>{
 const s=adult();funded(s);const before=netWorth(s.getState().finances);
 assert.equal(s.performAction('moveHome',{region:'香川・高松',housing:'持ち家',loan:true}).ok,true);
 const f=s.getState().finances,l=f.living,price=62000*180;
 assert.equal(l.propertyValue,price);assert.equal(l.mortgageBalance,price-Math.ceil(price*.2));assert.ok(l.mortgagePayment>0);
 assert.equal(getHousingEquity(l),Math.ceil(price*.2));
 assert.equal(netWorth(f),before-Math.floor(price*.03));
 assert.match(getScreenFieldValues('LIFE-02',s.getState())['住宅ローン'],/円/);
});
test('第28段階：元利返済・繰上返済と返済額の入力検証',()=>{
 const s=adult();funded(s);s.performAction('moveHome',{region:'新潟・新潟',housing:'持ち家',loan:true});
 const prev=s.getState().finances.living.mortgageBalance;s.advanceTurn();
 assert.ok(s.getState().finances.living.mortgageBalance<prev);
 assert.equal(s.performAction('repayMortgage',{amount:-1}).ok,false);
 const now=s.getState().finances.living.mortgageBalance;
 assert.equal(s.performAction('repayMortgage',{amount:10000}).ok,true);
 assert.equal(s.getState().finances.living.mortgageBalance,now-10000);
});
test('第28段階：旧家屋の売却でローンが精算され、新しい家賃へ切り替わる',()=>{
 const s=adult();funded(s,20000000);s.performAction('moveHome',{region:'香川・高松',housing:'持ち家',loan:true});
 const old=s.getState().finances.living;
 assert.equal(s.performAction('moveHome',{region:'宮城・仙台',housing:'賃貸'}).ok,true);
 const l=s.getState().finances.living;
 assert.equal(l.mortgageBalance,0);assert.equal(l.propertyValue,0);assert.equal(l.rent,76000);
 assert.ok(old.mortgageBalance>0);
});
test('第28段階：地域係数・年金の条件と長期進行の整合性',()=>{
 assert.equal(Object.keys(REGIONAL_FACTORS).length,10);
 const s=adult();const initial=s.getState().finances.living;
 assert.equal(initial.pensionPaid,0);
 for(let i=0;i<12;i++)s.advanceTurn();
 assert.ok(s.getState().finances.living.pensionMonths>=12);
 const old=structuredClone(s.getState());old.timeline.ageYears=65;old.timeline.year=2065;old.timeline.month=1;old.timeline.monthsElapsed=780;
 old.finances.living.pensionMonths=200;assert.equal(s.loadState(old).ok,true);
 s.advanceTurn();assert.equal(s.getState().finances.living.pensionPaid,60000);
});
test('第28段階：旧保存データ補完・ローン異常値を拒否',()=>{
 const s=adult();const old=structuredClone(s.getState());for(const k of ['mortgageBalance','mortgagePayment','mortgageMonths','pensionMonths','pensionPaid'])delete old.finances.living[k];
 assert.equal(validateGameState(old),true);assert.equal(s.loadState(old).ok,true);
 assert.equal(s.getState().finances.living.mortgageBalance,0);
 const bad=structuredClone(s.getState());bad.finances.living.mortgageBalance=50000;
 assert.equal(validateGameState(bad),false);
});
