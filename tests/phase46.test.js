import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LIFE_EVENT_CATALOG,catalogStatistics,isEventEligible,selectCatalogEvent} from '../js/core/eventCatalog.js';
import {createGameStore} from '../js/core/gameState.js';
import {createStoryEvent,resolveStoryChoice,develop} from '../js/core/storyEvents.js';
import {createStoryProgress,recordBranchChoice} from '../js/core/branchingStories.js';
import {validateGameState,createSaveRepository} from '../js/core/saveSystems.js';

const game=()=>{const g=createGameStore({interactiveChoices:true});assert.equal(g.startNewGame({name:'イベント検証',seed:20261115,birth:{year:2000,month:3,day:17}}).ok,true);return g;};
const pending=g=>g.getState().pendingEvents.find(e=>e.type==='choice');
const choose=g=>{const e=pending(g);assert.ok(e);const outcome=g.performAction('resolveChoice',{eventId:e.id,choice:e.options[0].id});assert.equal(outcome.ok,true,outcome.reason);return e;};

// Every catalog entry is audited for actionable, save-compatible option payloads.
test('152の異なるイベントと456の選択肢を持ち、9つの年齢帯と状況を網羅',()=>{
  const stats=catalogStatistics();
  assert.equal(stats.total,152);assert.equal(stats.totalChoices,456);
  assert.equal(Object.keys(stats.byStage).length,13);
  assert.equal(new Set(LIFE_EVENT_CATALOG.map(e=>e.id)).size,152);
  for(const e of LIFE_EVENT_CATALOG){
    assert.match(e.id,/^[a-z0-9-]+$/);assert.ok(e.title.length>=3&&e.description.length>=8);
    assert.equal(e.options.length,3);assert.ok(e.min<=e.max);
    for(const o of e.options){
      assert.ok(o.label.length>=2&&o.result.length>=5);
      assert.ok(Object.keys(o.impact).some(k=>k!=='socialTarget'));
      for(const [key,value] of Object.entries(o.impact)){
        if(['skill','socialTarget'].includes(key)) assert.equal(typeof value,'string');
        else assert.ok(Number.isFinite(value),`${e.id}: bad impact ${key}`);
      }
    }
  }
});

test('年齢別に実際に発生する出来事が変わり、三択と効果が表示される',()=>{
  const progress=null; // Isolate age-based catalog tests from milestone priority.
  for(const [age,label] of [[0,'はじめての世界'],[4,'幼少期'],[8,'小学生'],[13,'中学生'],[16,'高校生'],[20,'自立への一歩'],[30,'仕事と暮らし'],[50,'人生の転機'],[74,'第二の人生']]){
    const e=createStoryEvent({year:2000+age,month:6},age*12,age,.64,progress);
    assert.ok(e.category===label||['思いがけない出来事','学校での思いがけない出来事','老後の思いがけない出来事'].includes(e.category),`age=${age}, category=${e.category}`);
    assert.equal(e.options.length,3);
    assert.ok(e.options.every(x=>x.hint&&x.impact&&x.result));
    assert.ok(e.catalogKey);
  }
});

test('直近12件と重なる通常イベントを避け、選択の再現性を保つ',()=>{
  const make=()=>({eventHistory:[],finances:{cash:20000,career:{job:null}},health:{energy:80,illness:null},education:{scores:{国語:50},skills:{}},people:[],storyProgress:createStoryProgress()});
  const simulate=()=>{
    const state=make(),names=[];
    for(let i=0;i<12;i++){
      const item=selectCatalogEvent(state,32,.27);
      assert.ok(item);
      names.push(item.id);
      state.eventHistory.push({story:true,catalogKey:item.id});
    }
    return names;
  };
  const one=simulate();assert.equal(new Set(one).size,12);assert.deepEqual(simulate(),one);
});

test('失業・就職・家族・恋人・病気・過去の分岐で出現可否が変わる',()=>{
  const g=game();const s=structuredClone(g.getState());
  const by=id=>LIFE_EVENT_CATALOG.find(e=>e.id===id);
  assert.equal(isEventEligible(by('ctx-unemployed'),s,25),true);
  assert.equal(isEventEligible(by('ctx-hasjob'),s,25),false);
  s.finances.career.job='販売スタッフ';
  assert.equal(isEventEligible(by('ctx-unemployed'),s,25),false);
  assert.equal(isEventEligible(by('ctx-hasjob'),s,25),true);
  assert.equal(isEventEligible(by('ctx-partner'),s,25),false);
  s.people.push({id:'PARTNER',role:'交際相手',relationship:80});
  assert.equal(isEventEligible(by('ctx-partner'),s,25),true);
  assert.equal(isEventEligible(by('ctx-children'),s,25),false);
  s.people.push({id:'CHILD',role:'子',relationship:80});
  assert.equal(isEventEligible(by('ctx-children'),s,25),true);
  assert.equal(isEventEligible(by('ctx-illness'),s,25),false);
  s.health.illness={name:'体調不良',months:0};
  assert.equal(isEventEligible(by('ctx-illness'),s,25),true);
  assert.equal(isEventEligible(by('ctx-research'),s,25),false);
  s.storyProgress.threads.spark={path:'research',stage:1,lastChoice:'研究を続ける'};
  assert.equal(isEventEligible(by('ctx-research'),s,25),true);
  assert.equal(isEventEligible(by('ctx-sports-path'),s,25),false);
});

test('選択肢に費用があるイベントは所持金不足で登場せず、不足支出を拒否',()=>{
  const by=id=>LIFE_EVENT_CATALOG.find(e=>e.id===id);
  const g=game();const s=structuredClone(g.getState());
  s.finances.cash=0;
  assert.equal(isEventEligible(by('chance-repairs'),s,30),false);
  s.finances.cash=4000;
  assert.equal(isEventEligible(by('chance-repairs'),s,30),true);
  s.finances.cash=0;
  const event=createStoryEvent({year:2001,month:1},101,30,.4,createStoryProgress(),s);
  assert.ok(event);
  const original=structuredClone(g.getState());
  original.finances.cash=100;
  original.pendingEvents=[{id:'T0-choice',type:'choice',story:true,options:[{id:'1',label:'支払う',impact:{cash:-500},result:'支払った'}]}];
  const before=structuredClone(original);
  const bad=resolveStoryChoice(original,'T0-choice','1');
  assert.equal(bad.ok,false);assert.deepEqual(original,before);
});

test('人間関係の変化は対象者に限定して、別の人物の値を変更しない',()=>{
  const g=game(),s=structuredClone(g.getState());
  s.people.push({id:'PARTNER',name:'相手',role:'配偶者',relationship:55});
  const parent=s.people.find(p=>p.role==='父');const old=parent.relationship;
  const event={id:'custom',type:'choice',story:true,options:[{id:'1',label:'話す',result:'仲が深まった',impact:{social:5,socialTarget:'partner'}}]};
  s.pendingEvents=[event];
  const result=resolveStoryChoice(s,'custom','1');
  assert.equal(result.ok,true);
  assert.equal(parent.relationship,old);
  assert.ok(s.people.find(p=>p.id==='PARTNER').relationship>55);
});

test('STEP45の重要な連続イベントが通常イベントより優先される',()=>{
  const progress=createStoryProgress();
  const start=createStoryEvent({year:2006,month:7},25,6,.55,progress);
  assert.equal(start.branch?.thread,'spark');
  recordBranchChoice(progress,start,start.options[0],6);
  const follow=createStoryEvent({year:2012,month:7},51,12,.55,progress);
  assert.equal(follow.branch?.thread,'spark');assert.equal(follow.branch.stage,2);
  const ordinary=createStoryEvent({year:2007,month:7},29,7,.55,progress);
  assert.equal(ordinary.branch,undefined);assert.ok(ordinary.catalogKey);
});

test('実プレイで新イベントを選択し保存・読込後も進行できる',()=>{
  const g=game();const selected=[];
  for(let i=0;i<33;i++){
    const event=choose(g);
    if(event.catalogKey)selected.push(event.catalogKey);
    assert.equal(g.advanceTurn().ok,true);
    assert.equal(validateGameState(g.getState()),true);
  }
  assert.ok(new Set(selected).size>=15);
  const data=new Map();const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
  const repo=createSaveRepository(storage);
  assert.equal(repo.save('手動保存1',g.getState()).ok,true);
  const loaded=repo.load('手動保存1');assert.equal(loaded.ok,true);
  const copy=createGameStore({interactiveChoices:true});assert.equal(copy.loadState(loaded.state).ok,true);
  assert.equal(copy.getState().timeline.turnsElapsed,33);
  assert.ok(pending(copy));choose(copy);assert.equal(copy.advanceTurn().ok,true);
});

test('上限付近の能力を鍛えても逆に能力が低下しない',()=>{
  assert.equal(develop(95,5),95);
  assert.equal(develop(100,5),100);
  assert.equal(develop(90,-5),85);
});

test('表示文言とバージョンをSTEP 47へ更新',()=>{
 const root=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
 assert.match(root('README.md'),/STEP 47/);assert.match(root('README.md'),/152/);
 assert.match(root('index.html'),/第47段階/);
 assert.match(root('package.json'),/"version": "4\.8\.0"/);
 assert.match(root('js/app.js'),/v4\.8\.0/);
});
