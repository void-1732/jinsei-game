"""実HTTPでの動作に依存しないDOMテスト。画面操作の実行経路も検証。"""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
html=(R/'index.html').read_text()
html=re.sub(r'<link\s+rel="stylesheet"[^>]+>','',html)
html=re.sub(r'<script\s+type="module"[^>]*></script>','',html)
css='\n'.join((R/x).read_text() for x in ['css/common.css','css/layout.css','css/components.css','css/dark-layout.css','css/phase2.css','css/phase3.css','css/phase4.css'])
paths=['js/core/screenRegistry.js','js/core/screenCatalog.js','js/core/lifeSystems.js','js/core/gameState.js','js/core/screenDetails.js','js/ui/uiState.js','js/ui/navigation.js','js/ui/lifePanels.js','js/ui/screenRenderer.js','js/app.js']
parts=[]
for x in paths:
 s=(R/x).read_text();s=re.sub(r'(?ms)^import\s+.*?\s+from\s+[\'\"][^\'\"]+[\'\"];\s*','',s);s=re.sub(r'(?m)^export\s+','',s)
 if x=='js/core/screenRegistry.js':s=s.replace('const screenGroups =','const legacyGroups =',1)
 parts.append(s)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':900})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html);page.add_style_tag(content=css);page.add_script_tag(content='\n'.join(parts))
 page.locator('#start-game').click()
 assert page.locator('.phase4-panel').count()==1
 page.locator('#main-navigation').get_by_role('button',name='人物・家族、7画面').click()
 page.get_by_role('button',name='人物一覧').click()
 assert page.locator('#screen-id').inner_text()=='PERSON-01'
 page.locator('.phase4-action').first.click()
 assert '68' in page.locator('.phase4-panel').inner_text()
 # 25ターン=2006年4月
 for _ in range(25):page.locator('#advance-turn').click()
 page.get_by_role('button',name='学業、6画面').click()
 page.get_by_role('button',name='学習・成績').click()
 assert '小学校' in page.locator('.phase4-panel').inner_text()
 page.locator('.phase4-select').first.select_option(label='数学')
 page.locator('.phase4-select').nth(1).select_option('4')
 page.get_by_role('button',name='選んだ科目を学習').click()
 assert '52 / 100' in page.locator('.phase4-panel').inner_text()
 assert not errors,errors
 print('PASS: 人物交流・進級・学習ボタンの操作と表示更新')
 b.close()
