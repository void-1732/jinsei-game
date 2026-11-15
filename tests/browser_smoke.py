"""Visual/in-browser smoke test for constrained environments.

The test harness loads production HTML/CSS into an about:blank page and
concatenates the same ES-module sources in import order. This tests runtime
UI behavior but does NOT replace an HTTP-server ES-module integration test.
"""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SCREENSHOT = ROOT / 'docs' / 'implementation' / 'phase4-desktop-preview.png'

html = (ROOT / 'index.html').read_text()
html = re.sub(r'<link\s+rel="stylesheet"[^>]+>', '', html)
html = re.sub(r'<script\s+type="module"[^>]*></script>', '', html)
css = '\n'.join((ROOT / rel).read_text() for rel in
  ['css/common.css','css/layout.css','css/components.css','css/dark-layout.css','css/phase2.css','css/phase3.css','css/phase4.css'])
js_files = ['js/core/screenRegistry.js', 'js/core/screenCatalog.js',
            'js/core/lifeSystems.js','js/core/gameState.js', 'js/core/screenDetails.js', 'js/ui/uiState.js', 'js/ui/navigation.js',
            'js/ui/lifePanels.js','js/ui/screenRenderer.js', 'js/app.js']
modules = []
for path in js_files:
    source = (ROOT / path).read_text()
    source = re.sub(r'(?ms)^import\s+.*?\s+from\s+[\'\"][^\'\"]+[\'\"];\s*', '', source)
    source = re.sub(r'(?m)^export\s+', '', source)
    if path == 'js/core/screenRegistry.js':
        source = source.replace('const screenGroups =', 'const legacyGroups =', 1)
    modules.append(source)
bundled_js = '\n'.join(modules)

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path='/usr/bin/chromium',
                                         headless=True, args=['--no-sandbox'])
    for width, height in [(1200, 800), (1440, 900), (1920, 1080)]:
        page = browser.new_page(viewport={'width': width, 'height': height}, device_scale_factor=1)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.set_content(html)
        page.add_style_tag(content=css)
        page.add_script_tag(content=bundled_js)
        assert page.locator('#screen-id').inner_text() == 'LIFE-01'
        assert page.locator('#advance-turn').is_disabled()
        page.locator('#player-name').fill('太郎')
        page.locator('#start-game').click()
        assert page.locator('#profile-label').inner_text() == '太郎'
        page.locator('#advance-turn').click()
        assert page.locator('#date-label').inner_text() == '2000年4月'
        assert page.locator('#turn-count').inner_text() == '1 ターン経過'
        assert page.locator('#start-game').is_disabled()
        assert page.locator('.nav-category').count() == 9
        assert page.locator('body').evaluate('(el) => getComputedStyle(el).backgroundColor') == 'rgb(11, 17, 28)'
        assert not page.evaluate('document.documentElement.scrollWidth > window.innerWidth'), width
        page.get_by_role('button', name='学業、6画面').click()
        assert page.locator('#screen-id').inner_text() == 'EDU-01'
        page.get_by_role('button', name='学習・成績').click()
        assert page.locator('#screen-id').inner_text() == 'EDU-03'
        assert page.locator('.planned-fields .field-list-item').count() >= 4
        page.locator('#field-filter').fill('学力')
        assert page.locator('.planned-fields .field-list-item:visible').count() == 1
        page.locator('#field-filter').fill('')
        page.locator('.detail-link').first.click()
        assert page.locator('#screen-id').inner_text() == 'EDU-04'
        page.locator('#nav-back').click()
        assert page.locator('#screen-id').inner_text() == 'EDU-03'
        page.locator('#screen-search').fill('HEALTH-08')
        assert page.locator('.nav-link').count() == 1
        page.locator('.nav-link').click()
        assert page.locator('#screen-id').inner_text() == 'HEALTH-08'
        page.locator('#nav-back').click()
        assert page.locator('#screen-id').inner_text() == 'EDU-03'
        assert page.locator('#screen-search').input_value() == ''
        page.locator('#help-button').click()
        assert page.locator('#help-dialog').evaluate('(el) => el.open')
        page.locator('#close-help').click()
        assert not page.locator('#help-dialog').evaluate('(el) => el.open')
        page.get_by_role('button', name='人生、7画面').click()
        assert page.locator('#screen-id').inner_text() == 'LIFE-01'
        assert not errors, f'JavaScript errors: {errors}'
        if width == 1440:
            # Exercise all 61 registered screen routes with a real DOM renderer.
            catalog = page.evaluate('allScreens.map(s => ({id:s.id,title:s.title,category:s.category}))')
            assert len(catalog) == 61
            for item in catalog:
                category_button = page.locator('.nav-category').filter(has=page.locator('.category-name', has_text=item['category']))
                if category_button.get_attribute('aria-expanded') == 'false':
                    category_button.click()
                page.locator('.nav-link', has_text=item['title']).click()
                assert page.locator('#screen-id').inner_text() == item['id'], item['id']
                assert page.locator('#page-title').inner_text() == item['title'], item['id']
                assert page.locator('#screen-root').inner_text().strip(), item['id']
                assert page.locator('.planned-fields .field-list-item').count() >= 4, item['id']
                assert page.locator('.detail-link').count() >= 1, item['id']
            print('PASS: all 61 screens rendered without errors')
            page.get_by_role('button', name='人生、7画面').click()
            for _ in range(59):
                page.locator('#advance-turn').click()
            assert page.locator('#date-label').inner_text() == '2015年1月'
            assert page.locator('#age-label').inner_text() == '15歳'
            assert '1か月' in page.locator('#turn-length').inner_text()
            assert page.locator('.phase3-event').count() > 0
            page.screenshot(path=str(SCREENSHOT), full_page=True)
        print(f'PASS: {width}x{height} | category/search/history/dialog/dashboard | JS errors: 0')
        page.close()
    browser.close()
print('Browser DOM smoke checks: 3 viewports passed')
