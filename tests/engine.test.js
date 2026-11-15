import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameStore, getGameSnapshot, nextRandom } from '../js/core/gameState.js';

test('not initialized until explicitly started, advancement guarded', () => {
  const store = createGameStore();
  assert.equal(store.getState().initialized, false);
  assert.equal(store.advanceTurn().ok, false);
  assert.equal(store.startNewGame({ name: '花子' }).ok, true);
  assert.equal(store.getState().player.name, '花子');
  assert.equal(store.startNewGame({ name: '二人目' }).ok, false);
  assert.equal(store.getState().player.name, '花子');
});
test('quarterly progression until 15, monthly afterwards', () => {
  const store = createGameStore(); store.startNewGame();
  for (let n = 0; n < 59; n++) assert.equal(store.advanceTurn().months, 3);
  let t = store.getState().timeline;
  assert.deepEqual([t.year,t.month,t.ageYears,t.turnsElapsed,t.monthsElapsed], [2014,10,14,59,177]);
  let result = store.advanceTurn();
  assert.equal(result.months, 3);
  assert.deepEqual(result.events.map(e=>e.type).filter(type=>['birthday','new-year','monthly-turns'].includes(type)), ['birthday','new-year','monthly-turns']);
  t = store.getState().timeline;
  assert.deepEqual([t.year,t.month,t.ageYears,t.turnsElapsed,t.monthsElapsed],[2015,1,15,60,180]);
  result = store.advanceTurn();
  assert.equal(result.months, 1);
  assert.deepEqual([store.getState().timeline.year,store.getState().timeline.month],[2015,2]);
});
test('snapshots immutable, seed stable and independent stores deterministic', () => {
  const a = createGameStore(), b = createGameStore();
  a.startNewGame({name:'A',seed:123}); b.startNewGame({name:'A',seed:123});
  const old = a.getState();
  assert.equal(Object.isFrozen(old.player.birth), true);
  assert.throws(()=>{old.player.name='changed'},TypeError);
  for(let i=0;i<10;i++){ a.advanceTurn();b.advanceTurn(); }
  assert.deepEqual(a.getState(),b.getState());
  assert.equal(old.timeline.turnsElapsed,0);
  assert.equal(a.getState().random.draws,90);
  assert.equal(a.getState().random.seed,Array.from({length:90}).reduce(seed=>nextRandom(seed).seed,123));
  assert.equal(getGameSnapshot().initialized,false);
});
test('event acknowledgements do not undo history or advance time', () => {
  const store=createGameStore(); store.startNewGame();
  for(let i=0;i<4;i++)store.advanceTurn();
  const events=store.getState().pendingEvents;
  assert.ok(events.length>=2);
  assert.equal(store.acknowledgeEvent(events[0].id),true);
  assert.equal(store.acknowledgeEvent(events[0].id),false);
  assert.equal(store.getState().eventHistory.length,events.length);
  assert.equal(store.getState().timeline.turnsElapsed,4);
});
test('subscriptions and invalid seeds and names', () => {
  const store=createGameStore();let calls=0;
  const unsub=store.subscribe(()=>calls++);
  assert.equal(store.startNewGame({name:'  '}).ok,false);
  assert.throws(()=>store.startNewGame({seed:-1}),RangeError);
  store.startNewGame({name:' 太郎 '});
  unsub();store.advanceTurn();
  assert.equal(calls,1);
  assert.equal(store.getState().player.name,'太郎');
});
