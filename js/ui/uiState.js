/** UI-only store. No import of gameState and no game-world mutation. */
import { findScreen, screenGroups } from '../core/screenCatalog.js';

export function createUiStore(initialScreenId = 'LIFE-01') {
  const start = findScreen(initialScreenId);
  if (!start) throw new Error(`初期画面が見つかりません: ${initialScreenId}`);

  let state = {
    activeScreenId: start.id,
    activeCategory: start.category,
    searchQuery: '',
    helpOpen: false,
    railTab: 'events',
    fieldFilters: {},
    history: [start.id],
    historyIndex: 0,
  };
  const listeners = new Set();
  function getState() {
    return Object.freeze({ ...state, history: Object.freeze([...state.history]), fieldFilters: Object.freeze({ ...state.fieldFilters }) });
  }
  function update(changes) {
    state = { ...state, ...changes };
    for (const listener of listeners) listener(getState());
  }
  function navigateTo(id) {
    const next = findScreen(id);
    if (!next) return false;
    if (id === state.activeScreenId) return true;
    const history = [...state.history.slice(0, state.historyIndex + 1), id];
    update({ activeScreenId: id, activeCategory: next.category, history, historyIndex: history.length - 1 });
    return true;
  }
  function openCategory(category) {
    const group = screenGroups.find(item => item.category === category);
    if (!group) return false;
    // Categories are independent accordion controls: clicking the opened one closes it.
    update({activeCategory: state.activeCategory === category ? null : category, searchQuery: ''});
    return true;
  }
  function travelTo(index) {
    if (index < 0 || index >= state.history.length) return false;
    const id = state.history[index];
    const next = findScreen(id);
    update({ activeScreenId: id, activeCategory: next.category, historyIndex: index, searchQuery: '' });
    return true;
  }
  return Object.freeze({
    getState,
    navigateTo,
    openCategory,
    back: () => travelTo(state.historyIndex - 1),
    forward: () => travelTo(state.historyIndex + 1),
    setFieldFilter: (screenId, query) => {
      if (!findScreen(screenId)) return false;
      // No UI rerender while typing: preserve input focus and caret.
      state = { ...state, fieldFilters: { ...state.fieldFilters, [screenId]: String(query).slice(0, 80) } };
      return true;
    },
    setSearchQuery: query => update({ searchQuery: String(query).slice(0, 80) }),
    setHelpOpen: value => update({ helpOpen: Boolean(value) }),
    setRailTab: tab => { if (['events', 'related'].includes(tab)) update({ railTab: tab }); },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  });
}
