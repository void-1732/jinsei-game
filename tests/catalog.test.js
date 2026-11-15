import test from 'node:test';
import assert from 'node:assert/strict';
import { screenGroups as legacyGroups } from '../js/core/screenRegistry.js';
import {
  screenGroups, allScreens, LEGACY_SCREEN_IDS, ACADEMIC_SCREEN_IDS,
  CATEGORY_NAMES, findScreen, assertCatalogIntegrity,
} from '../js/core/screenCatalog.js';
import { createUiStore } from '../js/ui/uiState.js';
import { getGameSnapshot } from '../js/core/gameState.js';

test('55 legacy IDs and titles are preserved', () => {
  const originals = legacyGroups.flatMap(group => group.screens);
  assert.equal(originals.length, 55);
  assert.equal(LEGACY_SCREEN_IDS.length, 55);
  for (const old of originals) {
    const current = findScreen(old.id);
    assert.ok(current);
    assert.equal(current.title, old.title);
  }
});

test('9 categories / 61 unique screens / 6 education screens', () => {
  assert.equal(assertCatalogIntegrity(), true);
  assert.equal(screenGroups.length, 9);
  assert.equal(CATEGORY_NAMES.length, 9);
  assert.equal(allScreens.length, 61);
  assert.equal(new Set(allScreens.map(screen => screen.id)).size, 61);
  assert.deepEqual(ACADEMIC_SCREEN_IDS, ['EDU-01', 'EDU-02', 'EDU-03', 'EDU-04', 'EDU-05', 'EDU-06']);
  assert.equal(screenGroups.find(group => group.category === '学業').screens.length, 6);
  assert.equal(findScreen('INVALID'), null);
  assert.ok(allScreens.every(s => s.category && s.title));
});

test('UI navigation does not modify game-state snapshot', () => {
  const before = JSON.stringify(getGameSnapshot());
  const store = createUiStore();
  const changes = [];
  const stop = store.subscribe(s => changes.push(s.activeScreenId));
  assert.equal(store.navigateTo('EDU-03'), true);
  assert.equal(store.getState().activeCategory, '学業');
  assert.equal(store.navigateTo('NO-SUCH-SCREEN'), false);
  assert.equal(store.back(), true);
  assert.equal(store.getState().activeScreenId, 'LIFE-01');
  assert.equal(store.forward(), true);
  assert.equal(store.getState().activeScreenId, 'EDU-03');
  assert.equal(store.openCategory('健康'), true);
  assert.equal(store.getState().activeScreenId, 'HEALTH-01');
  assert.equal(store.forward(), false); // forward history cleared after new navigation
  assert.deepEqual(changes, ['EDU-03', 'LIFE-01', 'EDU-03', 'HEALTH-01']);
  stop();
  assert.equal(JSON.stringify(getGameSnapshot()), before);
  assert.equal(Object.isFrozen(getGameSnapshot().timeline), true);
});

test('UI search and dialogue state are UI-only', () => {
  const store = createUiStore();
  store.setSearchQuery('edu');
  store.setHelpOpen(true);
  store.setRailTab('related');
  assert.equal(store.getState().searchQuery, 'edu');
  assert.equal(store.getState().helpOpen, true);
  assert.equal(store.getState().railTab, 'related');
  assert.equal(store.openCategory('unavailable'), false);
  assert.throws(() => createUiStore('BAD-ID'), /初期画面/);
});
