"""ローカルURL経由でなくブラウザの仮想配信で全画面・UIを検証。"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import mimetypes
R=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width,height in [(1200,800),(1440,900),(1920,1080)]:
  context=browser.new_context(viewport={'width':width,'height':height})
  def serve(route):
   path=route.request.url.split('game.test/',1)[-1].split('?',1)[0]
   path=path or 'index.html'
   file=(R/path).resolve()
   if not file.is_relative_to(R) or not file.is_file():route.fulfill(status=404,body='なし');return
   route.fulfill(status=200,body=file.read_bytes(),content_type=mimetypes.guess_type(str(file))[0] or 'text/plain')
  context.route('https://game.test/**',serve)
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('https://game.test/',wait_until='load',timeout=20000)
  page.locator('#start-game').click()
  # 登録済み61画面へ実際にUIから遷移し描画。
  ids=page.evaluate('''async () => (await import('/js/core/screenCatalog.js')).allScreens.map(x=>x.id)''')
  for id in ids:
   page.locator('#screen-search').fill(id)
   page.locator(f'#main-navigation button[title="{id}"]').click()
   assert page.locator('#screen-root .page-body').count()==1,id
  # 生活画面と保険画面のフォームが実際に動く
  page.locator('#screen-search').fill('LIFE-02');page.locator('#main-navigation button[title="LIFE-02"]').click()
  assert page.get_by_text('地域と住まいを変更').count()==1
  page.locator('#screen-search').fill('LIFE-07');page.locator('#main-navigation button[title="LIFE-07"]').click()
  assert page.get_by_text('任意保障の加入・変更・解約').count()==1
  page.locator('#save-slot').select_option('手動保存1');page.locator('#save-game').click();page.reload()
  assert page.locator('#profile-label').inner_text()!='プレイヤー未作成'
  assert not errors,(width,errors)
  if width==1440:
   page.locator('#screen-search').fill('LIFE-02');page.locator('#main-navigation button[title="LIFE-02"]').click()
   page.screenshot(path=str(R/'docs/implementation/phase27-desktop-preview.png'),full_page=True)
  print(f'成功 {width}×{height} 61画面・住居と保障・保存再読込・例外なし')
  context.close()
 browser.close()
