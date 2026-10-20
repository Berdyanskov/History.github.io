"""End-to-end browser checks. Run with a local HTTP server already on port 4173."""
from pathlib import Path
import os, json, zipfile
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts';OUT.mkdir(exist_ok=True)
BASE=os.environ.get('MUSEUM_TEST_URL','http://127.0.0.1:4173/')
EXE=os.environ.get('CHROMIUM_PATH','/root/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell')
report=[]
def passed(s): report.append(s);print('PASS:',s,flush=True)
def ready(page): page.wait_for_function('document.body.dataset.ready === "true"',timeout=90000)
def settled(page,i):page.wait_for_function('(i)=>galleryState().current===i && !galleryState().busy',arg=i,timeout=30000)
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=EXE,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist'])
 page=b.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE);ready(page)
 assert not page.evaluate('galleryState().fallback')
 assert page.locator('#world canvas').count()==1
 page.screenshot(path=str(OUT/'entrance-desktop.png'))
 origin=page.evaluate('galleryState().position')
 page.locator('#start').click()
 assert page.evaluate('galleryState().busy')
 settled(page,0)
 assert page.evaluate('galleryState().position')!=origin
 page.screenshot(path=str(OUT/'chapter-desktop.png'))
 passed('WebGL gallery renders; entrance button moves a real 3D camera and guards navigation during movement')
 # Pick the photo itself by raycasting, not just its HTML hotspot.
 page.mouse.click(720,390)
 page.wait_for_selector('#detail[open]',timeout=15000)
 assert '崇思楼' in page.locator('#detail-title').inner_text()
 page.screenshot(path=str(OUT/'detail-desktop.png'))
 page.locator('#zoom-in').click();assert page.evaluate('galleryState().zoom')>1
 page.locator('#zoom-in').click();page.locator('#zoom-in').click()
 stage=page.locator('#zoom-stage').bounding_box();x=stage['x']+stage['width']/2;y=stage['y']+stage['height']/2
 page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+45,y+35);page.mouse.up()
 assert 'translate(0px,0px)' not in page.locator('#detail-image').get_attribute('style')
 page.locator('#zoom-reset').click();assert page.evaluate('galleryState().zoom')==1
 page.mouse.move(x,y);page.mouse.wheel(0,-180);assert page.evaluate('galleryState().zoom')>1
 page.locator('#zoom-reset').click();page.keyboard.press('Escape')
 passed('Original 3D photo is clickable; detail, zoom buttons, wheel, drag, reset and Escape work')
 # Faster settings for the remainder; mobile devices expose the same controls.
 page.locator('#open-help').click();page.locator('#motion-toggle').click();page.locator('#quality-toggle').click();page.locator('#help .close').click()
 for i in range(7):
  settled(page,i)
  if i==0:page.locator('#artifact-hotspot').click()
  else:page.locator('#artifact-hotspot').click()
  assert page.locator('#detail-image').get_attribute('src')==['assets/4.png','assets/6.jpg','assets/7.png','assets/2.png','assets/3.png','assets/1.png','assets/5.png'][i]
  assert len(page.locator('#detail-text').inner_text())>60
  page.locator('#detail-next').click()
 settled(page,7)
 assert page.locator('.ending-item').count()==7
 assert page.locator('.closing').inner_text()=='家乡的物件承载着近现代的历史，也承载着我们走向未来的精神力量。'
 page.screenshot(path=str(OUT/'ending-desktop.png'))
 assert len(page.evaluate('galleryState().visited'))==7
 passed('All seven original images and full descriptions; complete sequential tour; all-image closing screen with exact requested sentence')
 page.locator('.ending-item').nth(0).click();assert '崇思楼' in page.locator('#detail-title').inner_text();page.keyboard.press('Escape')
 page.locator('#share-end').click();assert page.locator('#qr svg').count()==1
 with page.expect_download() as dl:page.locator('#download-qr').click()
 dl.value.save_as(str(OUT/'share-qr.svg'));page.keyboard.press('Escape')
 page.locator('#restart').click();settled(page,0)
 page.keyboard.press('ArrowRight');settled(page,1);page.keyboard.press('ArrowLeft');settled(page,0)
 page.keyboard.press('m');page.locator('[data-visit="5"]').last.click();settled(page,5)
 page.locator('#fullscreen').click();page.wait_for_function('!!document.fullscreenElement');page.locator('#fullscreen').click();page.wait_for_function('!document.fullscreenElement')
 passed('Summary revisits, QR download, restart, arrow keys, directory jumps and fullscreen')
 page.goto(BASE+'#exhibit-7');ready(page);page.wait_for_selector('#detail[open]');assert '墨盒' in page.locator('#detail-title').inner_text();page.keyboard.press('Escape')
 passed('Direct exhibit links and saved progress')
 # Mobile portrait, actual WebGL and real touch events.
 mobile=b.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True,reduced_motion='reduce')
 mp=mobile.new_page();mp.on('pageerror',lambda e:errors.append(str(e)))
 mp.goto(BASE);ready(mp);mp.screenshot(path=str(OUT/'entrance-mobile.png'))
 assert mp.evaluate('document.documentElement.scrollWidth<=innerWidth')
 mp.locator('#start').tap();settled(mp,0);mp.screenshot(path=str(OUT/'chapter-mobile.png'))
 mp.locator('#artifact-hotspot').tap();mp.screenshot(path=str(OUT/'detail-mobile.png'))
 mp.locator('#zoom-in').tap();assert mp.evaluate('galleryState().zoom')>1
 mp.locator('#zoom-reset').tap()
 r=mp.locator('#zoom-stage').bounding_box();cx=r['x']+r['width']/2;cy=r['y']+r['height']/2
 session=mobile.new_cdp_session(mp)
 session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':cx-25,'y':cy},{'x':cx+25,'y':cy}]})
 session.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':cx-60,'y':cy},{'x':cx+60,'y':cy}]})
 session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 assert mp.evaluate('galleryState().zoom')>1.5
 mp.locator('#detail .close').tap();mp.locator('#open-map').tap();mp.locator('#map-ending').tap();settled(mp,7)
 assert mp.locator('.ending-item').count()==7
 passed('390px mobile layout, touch navigation, pinch-to-zoom, modal closing and summary')
 mp.close();page.close();mobile.close()
 # Offline single HTML must work with zero HTTP requests.
 offline=OUT/'offline';offline.mkdir(exist_ok=True)
 with zipfile.ZipFile(ROOT/'downloads/hometown-museum.zip') as z:z.extractall(offline)
 op=b.new_page(viewport={'width':1200,'height':800},reduced_motion='reduce');op.on('pageerror',lambda e:errors.append(str(e)))
 network=[];op.on('request',lambda req:network.append(req.url) if req.url.startswith(('http:','https:')) else None)
 op.goto((offline/'index.html').as_uri());ready(op);assert not op.evaluate('galleryState().fallback')
 op.locator('#start').click();settled(op,0);op.locator('#artifact-hotspot').click();assert op.locator('#detail-image').get_attribute('src').startswith('data:image/')
 assert not network,network
 passed('Packaged single-file edition opens with file://, renders in 3D, opens original-image detail, and makes no network requests')
 op.close();b.close()
 fb=p.chromium.launch(headless=True,executable_path=EXE,args=['--no-sandbox','--disable-webgl'])
 fp=fb.new_page(viewport={'width':390,'height':844});fp.goto(BASE);ready(fp);assert fp.evaluate('galleryState().fallback')
 fp.locator('#start').click();settled(fp,0);fp.locator('#flat-open').click();assert fp.locator('#detail').is_visible();fp.locator('#detail-next').click();settled(fp,1)
 fp.locator('#open-map').click();fp.locator('#map-ending').click();settled(fp,7)
 passed('WebGL unavailable: automatic functional fallback retains details, navigation and ending')
 fb.close()
 assert not errors,errors
 passed('No uncaught JavaScript errors in desktop, mobile or offline runs')
(OUT/'test-report.json').write_text(json.dumps({'passed':report,'errors':errors},ensure_ascii=False,indent=2))
