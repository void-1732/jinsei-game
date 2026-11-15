import test from 'node:test';
import assert from 'node:assert/strict';
import { allScreens, LEGACY_SCREEN_IDS } from '../js/core/screenCatalog.js';
import { screenDetails, assertDetails } from '../js/core/screenDetails.js';
import { createUiStore } from '../js/ui/uiState.js';
import { getGameSnapshot } from '../js/core/gameState.js';

test('all 61 unique detailed screen contracts have fields and valid links', () => {
  assert.equal(assertDetails(), true);
  assert.equal(Object.keys(screenDetails).length, 61);
  assert.equal(new Set(allScreens.map(s => s.id)).size, 61);
  assert.equal(LEGACY_SCREEN_IDS.length, 55);
  for (const {id} of allScreens) {
    assert.ok(screenDetails[id].fields.length >= 4);
    assert.ok(screenDetails[id].related.length > 0);
    assert.ok(screenDetails[id].plannedActions.length > 0);
  }
});
test('field filters stay in UI state, never mutate game state', () => {
  const gameBefore = JSON.stringify(getGameSnapshot());
  const store = createUiStore();
  assert.equal(store.setFieldFilter('EDU-03', '学力'), true);
  assert.equal(store.setFieldFilter('NO-SCREEN', 'x'), false);
  store.navigateTo('EDU-03');
  assert.equal(store.getState().fieldFilters['EDU-03'], '学力');
  assert.equal(store.getState().activeScreenId, 'EDU-03');
  assert.equal(JSON.stringify(getGameSnapshot()), gameBefore);
});
