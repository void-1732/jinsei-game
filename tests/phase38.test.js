import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameStore} from '../js/core/gameState.js';
import {createSaveRepository,SAVE_PREFIX} from '../js/core/saveSystems.js';
import {auditGameIntegrity} from '../js/core/integrationAudit.js';
import {screenGroups} from '../js/core/screenCatalog.js';
const storage=()=>{const map=new Map();return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)}};
const begin=(seed=17)=>{const g=createGameStore();assert.equal(g.startNewGame({name:'統合検査',seed}).ok,true);return g};
test('第38段階：61画面と9カテゴリの登録は維持',()=>{
 const ids=screenGroups.flatMap(g=>g.screens.map(s=>s.id));
 assert.equal(screenGroups.length,9);assert.equal(ids.length,61);assert.equal(new Set(ids).size,61);
});
test('第38段階：統合診断は読み取り専用で初期状態を検査',()=>{
 const g=begin(),state=g.getState(),before=JSON.stringify(state);
 assert.deepEqual(auditGameIntegrity(state),{ok:true,issues:[]});
 assert.equal(JSON.stringify(state),before);
});
test('第38段階：事業融資と設備の不一致を検出',()=>{
 const s=structuredClone(begin().getState());s.finances.business.loanContracts=[{id:1,principal:100,original:100,borrowedIndex:0,dueIndex:12,overdueMonths:0,ratePermille:5}];
 assert.equal(auditGameIntegrity(s).ok,false);
 assert.ok(auditGameIntegrity(s).issues.some(x=>x.includes('融資')));
});
test('第38段階：保存破損時に予備へ復旧し復旧前の状態を保持',()=>{
 const g=begin(),s=storage(),repo=createSaveRepository(s);
 assert.equal(repo.save('手動保存1',g.getState()).ok,true);
 const original=g.getState();g.advanceTurn();assert.equal(repo.save('手動保存1',g.getState()).ok,true);
 s.setItem(SAVE_PREFIX+'手動保存1','破損した保存内容');
 const restored=repo.load('手動保存1');assert.equal(restored.ok,true);assert.equal(restored.recovered,true);
 assert.deepEqual(restored.state,original);assert.equal(auditGameIntegrity(restored.state).ok,true);
 assert.equal(repo.load('手動保存1',{recover:false}).ok,false);
});
test('第38段階：乱数の異なる3人生を死亡まで進め、定期的に保存と復元を照合',()=>{
 for(const seed of [19,2026,4294967295]){
  const g=begin(seed),s=storage(),repo=createSaveRepository(s);let turns=0;
  while(!g.getState().ending.dead&&turns<1500){
   const before=g.getState();assert.equal(g.advanceTurn().ok,true);turns++;
   const current=g.getState();assert.equal(current.timeline.monthsElapsed-before.timeline.monthsElapsed,before.timeline.ageYears<15?3:1);
   if(turns%120===0){
    assert.deepEqual(auditGameIntegrity(current),{ok:true,issues:[]});
    assert.equal(repo.save('手動保存2',current).ok,true);
    const reloaded=createGameStore();assert.equal(reloaded.loadState(repo.load('手動保存2').state).ok,true);
    assert.deepEqual(reloaded.getState(),current);
   }
  }
  assert.equal(g.getState().ending.dead,true,`seed=${seed}`);
  assert.deepEqual(auditGameIntegrity(g.getState()),{ok:true,issues:[]},`seed=${seed}`);
  assert.equal(g.advanceTurn().ok,false);
 }
});
test('第38段階：任意の画面移動に依存せず同じ乱数で同じ人生結果',()=>{
 const a=begin(31),b=begin(31);
 for(let i=0;i<210;i++){assert.equal(a.advanceTurn().ok,true);assert.equal(b.advanceTurn().ok,true);}
 assert.deepEqual(a.getState(),b.getState());
});
