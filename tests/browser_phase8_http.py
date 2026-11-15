"""実HTTP/Chromium・localStorageのリロードを含む統合試験。"""
from pathlib import Path
import subprocess,time,socket,contextlib
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
with socket.socket() as sock:
 sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
server=subprocess.Popen(['python','-m','http.server',str(port),'--bind','127.0.0.1'],cwd=R,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
try:
 for _ in range(50):
  with socket.socket() as sock:
   if sock.connect_ex(('127.0.0.1',port))==0:break
  time.sleep(.1)
 else:raise RuntimeError('HTTPサーバーの起動失敗')
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--no-proxy-server'])
  for width,height in [(1200,800),(1440,900),(1920,1080)]:
   context=browser.new_context(viewport={'width':width,'height':height});page=context.new_page();errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(f'http://127.0.0.1:{port}/',wait_until='networkidle')
   page.locator('#start-game').click();page.locator('#advance-turn').click()
   assert page.locator('#date-label').inner_text()=='2000年4月'
   page.locator('#save-slot').select_option('手動保存1');page.locator('#save-game').click()
   page.locator('#advance-turn').click();assert page.locator('#date-label').inner_text()=='2000年7月'
   page.locator('#load-game').click();assert page.locator('#date-label').inner_text()=='2000年4月'
   page.reload(wait_until='networkidle');assert page.locator('#date-label').inner_text()=='2000年4月'
   assert page.locator('#profile-label').inner_text()=='プレイヤー'
   assert page.locator('#save-status').inner_text()!='保存不可'
   page.locator('#save-slot').select_option('人生記録');assert page.locator('#save-game').is_disabled()
   page.locator('#screen-search').fill('HISTORY-01')
   page.locator('#main-navigation button[title="HISTORY-01"]').click()
   assert '人生年表・記録' in page.locator('.phase7-history').inner_text()
   page.locator('#screen-search').fill('')
   # オリジナルのES Modulesを実際のHTTP経由で検証
   result=page.evaluate("""async () => {const {allScreens}=await import('./js/core/screenCatalog.js'); const {screenDetails}=await import('./js/core/screenDetails.js');return {count:allScreens.length,details:allScreens.every(s=>!!screenDetails[s.id])}}""")
   assert result=={'count':61,'details':True},result
   assert not errors,errors
   if width==1440:page.screenshot(path=str(R/'docs/implementation/phase8-desktop-preview.png'),full_page=True)
   print(f'成功 {width}×{height}: HTTP起動・実保存・再読込・61画面登録・例外なし')
   context.close()
  browser.close()
finally:server.terminate();server.wait(timeout=10)
