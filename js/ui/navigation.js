/** Backward-compatible signature with optional PHASE 1 category/search options. */
export function renderNavigation(container, groups, activeId, onNavigate, options = {}) {
  const activeCategory = options.activeCategory ?? groups.find(g => g.screens.some(s => s.id === activeId))?.category;
  const searchQuery = (options.searchQuery ?? '').trim().toLocaleLowerCase('ja');
  const fragment = document.createDocumentFragment();

  if (searchQuery) {
    const results = groups.flatMap(group => group.screens.filter(screen =>
      `${screen.title} ${screen.id} ${group.category}`.toLocaleLowerCase('ja').includes(searchQuery)));
    const resultLabel = document.createElement('div');
    resultLabel.className = 'navigation-section-label';
    resultLabel.textContent = `検索結果 ${results.length} / ${groups.reduce((count, group) => count + group.screens.length, 0)}`;
    fragment.append(resultLabel);
    for (const screen of results) fragment.append(makeScreenButton(screen, activeId, onNavigate));
    if (!results.length) {
      const empty = document.createElement('p');
      empty.className = 'nav-empty';
      empty.textContent = '一致する画面がありません。';
      fragment.append(empty);
    }
    container.replaceChildren(fragment);
    return;
  }

  for (const group of groups) {
    const expanded = group.category === activeCategory;
    const section = document.createElement('section');
    section.className = 'nav-group' + (expanded ? ' expanded' : '');
    const categoryButton = document.createElement('button');
    categoryButton.type = 'button';
    categoryButton.className = 'nav-category' + (expanded ? ' active' : '');
    categoryButton.setAttribute('aria-expanded', String(expanded));
    categoryButton.setAttribute('aria-label', `${group.category}、${group.screens.length}画面`);
    const icon = document.createElement('span');
    icon.className = 'category-symbol';
    icon.textContent = group.symbol ?? '•';
    const title = document.createElement('span');
    title.className = 'category-name';
    title.textContent = group.category;
    const count = document.createElement('span');
    count.className = 'category-count';
    count.textContent = String(group.screens.length);
    const caret = document.createElement('span');
    caret.className = 'category-caret';
    caret.textContent = expanded ? '▾' : '›';
    categoryButton.append(icon, title, count, caret);
    categoryButton.addEventListener('click', () => {
      if (options.onCategoryChange) options.onCategoryChange(group.category);
      else onNavigate(group.screens[0].id);
    });
    section.append(categoryButton);
    if (expanded) {
      const groupItems = document.createElement('div');
      groupItems.className = 'nav-screen-list';
      for (const screen of group.screens) groupItems.append(makeScreenButton(screen, activeId, onNavigate));
      section.append(groupItems);
    }
    fragment.append(section);
  }
  container.replaceChildren(fragment);
}

function makeScreenButton(screen, activeId, onNavigate) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'nav-link' + (screen.id === activeId ? ' active' : '');
  if (screen.id === activeId) button.setAttribute('aria-current', 'page');
  const dot = document.createElement('span');
  dot.className = 'nav-id';
  dot.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span');
  label.textContent = screen.title;
  label.className = 'nav-screen-title';
  button.append(dot, label);
  button.title = `${screen.title}（${screen.id}）`;
  button.setAttribute('aria-label',`${screen.title}へ移動`);
  button.addEventListener('click', () => onNavigate(screen.id));
  return button;
}
