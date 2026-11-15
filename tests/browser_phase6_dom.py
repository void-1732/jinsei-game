"""HTTPがブロックされた環境向けのブラウザDOM統合検証。"""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
html=(R/'index.html').read_text()
html=re.sub(r'<link\s+rel="stylesheet"[^>]+>','',html)
html=re.sub(r'<script\s+type="module"[^>]*></script>','',html)
css='\n'.join((R/x).read_text() for x in ['css/common.css','css/layout.css','css/components.css','css/dark-layout.css','css/phase2.css','css/phase3.css','css/phase4.css','css/phase5.css','css/phase6.css'])
paths=['js/core/screenRegistry.js','js/core/screenCatalog.js','js/core/lifeSystems.js','js/core/economySystems.js','js/core/healthSystems.js','js/core/worldSystems.js','js/core/eventSystems.js','js/core/gameState.js','js/core/screenDetails.js','js/ui/uiState.js','js/ui/navigation.js','js/ui/lifePanels.js','js/ui/economyPanels.js','js/ui/worldPanels.js','js/ui/screenRenderer.js','js/app.js']
parts=[]
for path in paths:
 s=(R/path).read_text();s=re.sub(r'(?ms)^import\s+.*?\s+from\s+[\'\"][^\'\"]+[\'\"];\s*','',s);s=re.sub(r'(?m)^export\s+','',s)
 if path=='js/core/screenRegistry.js':s=s.replace('const screenGroups =','const legacyGroups =',1)
 parts.append(s)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width,height in [(1200,800),(1440,900),(1920,1080)]:
  page=browser.new_page(viewport={'width':width,'height':height});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html);page.add_style_tag(content=css);page.add_script_tag(content='\n'.join(parts));page.locator('#start-game').click()
  page.evaluate('for(let i=0;i<132;i++)gameStore.advanceTurn()')
  assert page.locator('#age-label').inner_text()=='21歳'
  def open_screen(id):
   page.locator('#screen-search').fill(id)
   page.locator(f'#main-navigation button[title="{id}"]').click()
   assert page.locator('#screen-id').inner_text()==id
  open_screen('WORK-01');page.locator('.phase5-panel select').select_option('事務職');page.get_by_role('button',name='選択した職種に就職').click()
  assert '事務職' in page.locator('.phase5-panel').inner_text()
  page.locator('#advance-turn').click()
  assert '235,000円' in page.locator('.phase5-panel').inner_text()
  open_screen('LIFE-05');page.locator('.phase5-number').fill('10000');page.get_by_role('button',name='投資商品を購入').click()
  assert '10,000円' in page.locator('.phase5-panel').inner_text()
  open_screen('HEALTH-01')
  assert '身体の健康' in page.locator('.phase6-panel').inner_text()
  page.get_by_role('button',name='休養を改善').click()
  assert '休養の習慣' in page.locator('.phase6-panel').inner_text()
  open_screen('SOCIETY-01')
  assert '景気指数' in page.locator('.phase6-panel').inner_text()
  if width==1440:
   page.screenshot(path=str(R/'docs/implementation/phase6-desktop-preview.png'),full_page=True)
  open_screen('EVENT-01')
  assert '人生イベント' in page.locator('.phase6-panel').inner_text()
  page.evaluate('for(const x of allScreens)uiStore.navigateTo(x.id)')
  assert page.locator('#screen-root .page-body').count()==1
  assert not errors,errors
  print(f'PASS {width}×{height}: 61画面・就職・給与・投資・健康・社会・イベント・ブラウザ例外なし')
  page.close()
 browser.close()
