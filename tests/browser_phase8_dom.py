"""HTTPがブロックされた環境向けのブラウザDOM統合検証。"""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
html=(R/'index.html').read_text()
html=re.sub(r'<link\s+rel="stylesheet"[^>]+>','',html)
html=re.sub(r'<script\s+type="module"[^>]*></script>','',html)
css='\n'.join((R/x).read_text() for x in ['css/common.css','css/layout.css','css/components.css','css/dark-layout.css','css/phase2.css','css/phase3.css','css/phase4.css','css/phase5.css','css/phase6.css','css/phase7.css'])
paths=['js/core/screenRegistry.js','js/core/screenCatalog.js','js/core/lifeSystems.js','js/core/economySystems.js','js/core/healthSystems.js','js/core/worldSystems.js','js/core/eventSystems.js','js/core/saveSystems.js','js/core/gameState.js','js/core/screenDetails.js','js/ui/uiState.js','js/ui/navigation.js','js/ui/lifePanels.js','js/ui/economyPanels.js','js/ui/worldPanels.js','js/ui/historyPanels.js','js/ui/screenRenderer.js','js/app.js']
parts=[]
for path in paths:
 s=(R/path).read_text();s=re.sub(r'(?ms)^import\s+.*?\s+from\s+[\'\"][^\'\"]+[\'\"];\s*','',s);s=re.sub(r'(?m)^export\s+','',s)
 if path=='js/core/screenRegistry.js':s=s.replace('const screenGroups =','const legacyGroups =',1)
 parts.append(s)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width,height in [(1200,800),(1440,900),(1920,1080)]:
  page=browser.new_page(viewport={'width':width,'height':height});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('about:blank');page.set_content(html);
  page.evaluate("""() => {const db=new Map(); Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,String(v)),removeItem:k=>db.delete(k)}})}""");page.add_style_tag(content=css);page.add_script_tag(content='\n'.join(parts));page.locator('#start-game').click()
  page.locator('#advance-turn').click()
  assert page.locator('#date-label').inner_text()=='2000年4月'
  page.locator('#save-slot').select_option('人生記録')
  assert page.locator('#save-game').is_disabled()
  page.locator('#save-slot').select_option('手動保存1')
  page.locator('#save-game').click()
  page.locator('#advance-turn').click()
  assert page.locator('#date-label').inner_text()=='2000年7月'
  page.locator('#load-game').click()
  assert page.locator('#date-label').inner_text()=='2000年4月'
  page.locator('#screen-search').fill('HISTORY-01')
  page.locator('#main-navigation button[title="HISTORY-01"]').click()
  assert '人生年表・記録' in page.locator('.phase7-history').inner_text()
  page.locator('#screen-search').fill('')
  page.evaluate('for(const x of allScreens)uiStore.navigateTo(x.id)')
  assert page.locator('#screen-root .page-body').count()==1
  assert not errors,errors
  if width==1440:page.screenshot(path=str(R/'docs/implementation/phase8-desktop-preview.png'),full_page=True)
  print(f'成功 {width}×{height}: 61画面・時間進行・保存・読込・年表・例外なし')
  page.close()
 browser.close()
