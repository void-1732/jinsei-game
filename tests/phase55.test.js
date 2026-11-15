/** STEP 55: release-candidate end-to-end regression checks, not new gameplay. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameStore} from '../js/core/gameState.js';
import {createSaveRepository,validateGameState} from '../js/core/saveSystems.js';
import {serializePortableSave,parsePortableSave} from '../js/core/portableSaves.js';

function memoryRepository(){
 const items=new Map();return createSaveRepository({getItem:key=>items.get(key)??null,setItem:(key,value)=>items.set(key,value),removeItem:key=>items.delete(key)});
}
const priorities={
  learning:{study:5,skillValue:4,work:2,cash:.0002,physical:1,energy:.5,mental:.6,social:.2},
  recovery:{physical:5,mental:5,energy:4,social:1,study:.3,cash:.0003,work:.3},
  relationships:{social:6,mental:3,physical:1,energy:.7,study:.4,cash:.0004,work:.4},
};
function orderOptions(event,snapshot,style){
 const weights=priorities[style];return [...event.options].sort((a,b)=>{
  const score=opt=>Object.entries(weights).reduce((sum,[key,weight])=>sum+(Number(opt.impact?.[key])||0)*weight,0);
  return score(b)-score(a);
 });
}
function decide(game,style){
 const state=game.getState(),event=state.pendingEvents.find(e=>e.type==='choice');
 if(!event)return false;
 let selected=null, reasons=[];
 for(const opt of orderOptions(event,state,style)){
  const result=game.performAction('resolveChoice',{eventId:event.id,choice:opt.id});
  if(result.ok){selected=opt;break;}
  reasons.push(result.reason);
 }
 assert.ok(selected,`No valid option at ${state.timeline.year}/${state.timeline.month}, ${event.title}: ${reasons.join(', ')}`);
 assert.equal(game.getState().pendingEvents.some(e=>e.id===event.id),false,'Choice must clear after resolution');
 return true;
}
function checkInvariants(s,previous,style){
 const tag=`${style} at age ${s.timeline.ageYears} / ${s.timeline.year}-${s.timeline.month}`;
 assert.equal(validateGameState(s),true,`Invalid save state ${tag}`);
 assert.ok(s.timeline.monthsElapsed>previous.timeline.monthsElapsed,`No time progress ${tag}`);
 assert.ok(s.timeline.turnsElapsed>previous.timeline.turnsElapsed,`Turn stopped ${tag}`);
 assert.ok(s.finances.cash>=0&&s.finances.debt>=0,`Invalid finances ${tag}`);
 for(const field of ['physical','mental','energy'])assert.ok(s.health[field]>=0&&s.health[field]<=100,`Invalid ${field} ${tag}`);
 assert.ok(s.pendingEvents.length<=250&&s.eventHistory.length<=1200,`Unbounded events ${tag}`);
 assert.ok(s.daily54.fatigue>=0&&s.daily54.fatigue<=100,`Fatigue outside range ${tag}`);
 assert.ok(s.daily54.stress>=0&&s.daily54.stress<=100,`Stress outside range ${tag}`);
}
/** Reproduce three distinct full lives with both direct turns and fast-forward, and midlife recovery. */
for(const [style,seed,preferredPlan] of [
  ['learning',551010,'learning'],
  ['recovery',552020,'rest'],
  ['relationships',553030,'social']
]){
 test(`生誕から人生終了まで：${style}（長期イベント・経済・健康・保存・エンディング）`,{timeout:190000},()=>{
  let game=createGameStore({interactiveChoices:true});
  const birth={year:2000,month:style==='learning'?1:style==='recovery'?6:11,day:style==='learning'?1:style==='recovery'?13:28};
  assert.equal(game.startNewGame({name:`STEP55-${style}`,seed,birth}).ok,true);
  const repo=memoryRepository();
  let previous=game.getState(),turns=0,lastAge=-1,restores=0,usedFast=false,notifications=0,choiceCount=0;
  while(!game.getState().ending.dead){
    const before=game.getState();
    if(before.timeline.ageYears>110||turns>1800)throw Error('Did not reach an ending before max age / turns');
    if(decide(game,style))choiceCount++;
    let state=game.getState();
    if(state.timeline.ageYears>=6 && state.timeline.ageYears<8 && state.daily54.planId==='balanced'){
      const r=game.performAction('setTimePlan',{planId:preferredPlan});
      assert.equal(r.ok,true,r.reason);state=game.getState();
    }
    if(state.timeline.ageYears>=18 && state.timeline.ageYears<35 && !state.finances.career.job && turns%16===0){
      const r=game.performAction('jobSearch');
      if(r.ok){assert.equal(game.performAction('skill',{skill:'読書'}).ok,false,'Multiple actions in same turn');}
    }
    if(state.timeline.ageYears>=60 && state.timeline.ageYears<61 && !usedFast){
      const result=game.fastForward({focus:style==='recovery'?'health':style==='learning'?'learning':'relationships',maxMonths:6});
      assert.equal(result.ok,true,result.reason);usedFast=true;
    }else{
      const advanced=game.advanceTurn();assert.equal(advanced.ok,true,`${style} turn ${turns}: ${advanced.reason}`);
    }
    const next=game.getState();
    checkInvariants(next,before,style);
    if(next.timeline.ageYears!==lastAge){lastAge=next.timeline.ageYears;notifications+=next.pendingEvents.filter(e=>e.type!=='choice').length;}
    if([18,45,65].includes(next.timeline.ageYears) && !next.ending.dead && ![18,45,65].includes(before.timeline.ageYears)){
      assert.equal(repo.save('手動保存1',next).ok,true,`Local save failed age ${lastAge}`);
      const portable=serializePortableSave(next);assert.equal(portable.ok,true,portable.reason);
      const restored=parsePortableSave(portable.text);assert.equal(restored.ok,true,restored.reason);
      const fresh=createGameStore({interactiveChoices:true});const loaded=fresh.loadState(restored.state);
      assert.equal(loaded.ok,true,loaded.reason);
      assert.deepEqual(fresh.getState().random,next.random,'RNG seed not preserved');
      assert.deepEqual(fresh.getState().pendingEvents,next.pendingEvents,'Pending choices not preserved');
      assert.equal(fresh.getState().timeline.turnsElapsed,next.timeline.turnsElapsed);
      game=fresh;restores++;
    }
    turns++;
  }
  const last=game.getState();
  assert.equal(validateGameState(last),true,`Ending invalid: ${style}`);
  assert.ok(last.ending.date&&last.ending.inheritance,`No inheritance / ending: ${style}`);
  assert.ok(last.lifeGoal49?.ending,`No detailed ending: ${style}`);
  assert.ok(choiceCount>120,`Too few choices: ${choiceCount}`);
  assert.ok(turns>=180,`Life ended too early for balance QA: ${style} ${last.timeline.ageYears}`);
  assert.ok(restores>=1,`Failed to test checkpoint: ${style}`);
  assert.equal(game.advanceTurn().ok,false,'Life continued after ending');
  assert.equal(game.performAction('skill',{skill:'読書'}).ok,false,'Action performed after death');
  assert.equal(repo.save('人生記録',last).ok,true,'Ending record cannot be saved');
  console.log(`STEP55 ${style}: age=${last.ending.date.age},turns=${turns},choices=${choiceCount},restores=${restores},fast=${usedFast},notices=${notifications},cash=${last.finances.cash},debt=${last.finances.debt},score=${last.ending.score}`);
 });
}

test('過去バージョン相当の省略フィールドを復元しても新しい生活記録と重要選択を保持できる',()=>{
 const game=createGameStore({interactiveChoices:true});
 assert.equal(game.startNewGame({name:'旧セーブ',seed:551999}).ok,true);
 decide(game,'learning');
 const old=structuredClone(game.getState());
 for(const key of ['daily54','surprise53','legacy51','lifeGoal49','balance48'])delete old[key];
 assert.equal(validateGameState(old),true);
 const fresh=createGameStore({interactiveChoices:true});
 assert.equal(fresh.loadState(old).ok,true);
 assert.equal(validateGameState(fresh.getState()),true);
 assert.equal(fresh.getState().daily54.planId,'balanced');
 assert.equal(fresh.advanceTurn().ok,true);
 assert.equal(validateGameState(fresh.getState()),true);
});