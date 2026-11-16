import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameStore} from '../js/core/gameState.js';
import {createLifeData,advanceEducation,chooseSchool,chooseFurtherEducation} from '../js/core/lifeSystems.js';
import {validateGameState} from '../js/core/saveSystems.js';
import {createEconomyData} from '../js/core/economySystems.js';
import {careerAction,employmentScore,JOB_POSTINGS,ALL_JOB_POSTINGS} from '../js/core/careerSystems.js';
import {createCompanyMarket} from '../js/core/companySystems.js';
import {EXTENDED_JOB_POSTINGS,employerOffer,marketListings,careerEligibility,schoolRecommendationBonus,postingIsVisible} from '../js/core/careerMarketplace.js';

const ed=()=>{const e=createLifeData('生徒').education;for(const key of Object.keys(e.scores))e.scores[key]=90;return e;};
const progress=(e,start,end)=>advanceEducation(e,{year:start,month:3},{year:end,month:4},0);
const post=id=>EXTENDED_JOB_POSTINGS.find(p=>p.id===id);

test('既存6社を維持したまま医療・政治・スポーツ・創作など30の新規求人を提供',()=>{
 assert.equal(createCompanyMarket().length,6);
 assert.equal(EXTENDED_JOB_POSTINGS.length,30);
 assert.equal(JOB_POSTINGS.length,6);
 assert.equal(ALL_JOB_POSTINGS.length,36);
 assert.ok(['医師','歯科医師','トレーダー','漫画家','作家','料理人','プロスポーツ選手','市区町村議員','都道府県議員','国会議員'].every(name=>ALL_JOB_POSTINGS.some(p=>p.job===name)));
 assert.equal(new Set(ALL_JOB_POSTINGS.map(p=>p.id)).size,36);
});
test('中学卒業後の高専は5年制、高専卒業後は2年の専攻科または大学編入が可能',()=>{
 const e=ed();e.stage='中学校';e.grade=3;e.school='市立中学校';
 assert.equal(chooseSchool(e,'高校','高等専門学校').ok,true);
 progress(e,2015,2015);
 assert.equal(e.stage,'高専');assert.equal(e.program.years,5);
 assert.equal(e.highSchoolTrack,'高専');
 assert.equal(chooseFurtherEducation(e,'高専専攻科').ok,true);
 progress(e,2020,2020);
 assert.equal(e.stage,'高専専攻科');assert.equal(e.degree,'高専卒');
 assert.equal(e.program.years,2);
 progress(e,2022,2022);
 assert.equal(e.stage,'卒業');assert.equal(e.degree,'専攻科修了');
 const transfer=ed();transfer.stage='中学校';transfer.school='市立中学校';transfer.grade=3;
 chooseSchool(transfer,'高校','高等専門学校');progress(transfer,2015,2015);
 chooseFurtherEducation(transfer,'高専編入大学');progress(transfer,2020,2020);
 assert.equal(transfer.stage,'大学');
 progress(transfer,2022,2022);
 assert.equal(transfer.degree,'学士');
});
test('大学4年修了から修士2年へ進学し、研究開発求人の応募条件を満たす',()=>{
 const e=ed();e.stage='高校';e.grade=3;e.school='県立高校';
 progress(e,2018,2018);
 assert.equal(e.stage,'大学');assert.equal(e.program.years,4);
 assert.equal(chooseFurtherEducation(e,'大学院修士課程').ok,true);
 progress(e,2022,2022);
 assert.equal(e.stage,'大学院');assert.equal(e.degree,'学士');assert.equal(e.program.years,2);
 progress(e,2024,2024);
 assert.equal(e.stage,'卒業');assert.equal(e.degree,'修士');
 assert.equal(careerEligibility(post('research'),e,{},24),null);
});
test('6年制の医・歯学課程とゲーム内資格試験は別の関門になる',()=>{
 for(const [course,id,license]of [['医学部','doctor','医師'],['歯学部','dentist','歯科医師']]){
  const e=ed();e.stage='高校';e.grade=3;e.school='県立高校';
  chooseSchool(e,'大学',course);
  progress(e,2018,2018);
  assert.equal(e.stage,'大学');assert.equal(e.program.years,6);
  progress(e,2022,2022);
  assert.equal(e.stage,'大学');
  progress(e,2024,2024);
  assert.equal(e.stage,'卒業');
  assert.match(careerEligibility(post(id),e,{},24),/ゲーム内資格試験/);
  e.skills.専門力=65;e.skills.技術力=65;e.skills.支援力=65;
  const finance=createEconomyData();
  const passed=careerAction(finance,'professionalExam',{license},{age:24,date:{year:2024,month:5},education:e});
  assert.equal(passed.ok,true,passed.reason);
  assert.equal(careerEligibility(post(id),e,{},24),null);
 }
});
test('工業高校・高専卒業生の大手製造業推薦は採用評価を高めるが合格保証ではない',()=>{
 const e=ed();const p=post('heavyIndustry');
 assert.equal(schoolRecommendationBonus(e,p),0);
 e.highSchoolTrack='工業高校';
 assert.equal(schoolRecommendationBonus(e,p),12);
 e.degree='高専卒';
 assert.equal(schoolRecommendationBonus(e,p),16);
 for(const name of Object.keys(e.scores))e.scores[name]=40;
 assert.equal(schoolRecommendationBonus(e,p),0);
});
test('毎ターン求人が入れ替わり、インターンと転職経験で希望業種の掲載が増える',()=>{
 const game=createGameStore();game.startNewGame();const state=structuredClone(game.getState());
 state.timeline={year:2026,month:5,ageYears:26,turnsElapsed:100,monthsElapsed:316};
 const prior=marketListings(state);
 assert.deepEqual(prior,marketListings(state));
 state.timeline.month=6;
 const following=marketListings(state);
 assert.notDeepEqual(prior.map(p=>p.id),following.map(p=>p.id));
 state.timeline.month=5;
 const before=marketListings(state).filter(p=>p.sector==='医療').length;
 state.finances.career.internships={医療:3};state.finances.career.targetSector='医療';
 const after=marketListings(state).filter(p=>p.sector==='医療').length;
 assert.ok(after>=before);
 state.finances.career.sector='医療';
 assert.ok(marketListings(state).filter(p=>p.sector==='医療').length>=after);
 assert.ok([0,1,2,3].includes(employerOffer(post('doctor'),state.timeline).openings));
});
test('政治職は市区町村から都道府県、国政へ、在職実績が必要',()=>{
 const local=post('localPolitics'),pref=post('prefPolitics'),nation=post('nationalPolitics'),e=ed();
 assert.equal(careerEligibility(local,e,{},25),null);
 assert.match(careerEligibility(pref,e,{},30),/市区町村/);
 assert.equal(careerEligibility(pref,e,{politicalRank:1,politicalExperience:24},30),null);
 assert.match(careerEligibility(nation,e,{politicalRank:1,politicalExperience:60},35),/都道府県/);
 assert.equal(careerEligibility(nation,e,{politicalRank:2,politicalExperience:60},35),null);
});
test('既存スキーマv7の古いセーブを読み込み、職業拡張項目も検証',()=>{
 const game=createGameStore();game.startNewGame();
 const legacy=structuredClone(game.getState());
 delete legacy.education.degree;delete legacy.education.highSchoolTrack;delete legacy.education.nextProgram;
 delete legacy.finances.career.internships;
 assert.equal(validateGameState(legacy),true);
 assert.equal(game.loadState(legacy).ok,true);
 const newState=structuredClone(game.getState());
 newState.finances.career.internships={IT:2};
 newState.finances.career.targetSector='IT';
 newState.education.degree='高専卒';
 newState.education.licenses=[];
 assert.equal(validateGameState(newState),true);
 const invalid=structuredClone(newState);invalid.finances.career.internships.IT=10000;
 assert.equal(validateGameState(invalid),false);
});
