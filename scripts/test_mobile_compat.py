from playwright.sync_api import sync_playwright
import time
EXE='/root/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell'
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=EXE,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 ctx=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce')
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script("const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:original.call(this,type,...args)};")
 page.goto('http://127.0.0.1:4173/');page.wait_for_function('document.body.dataset.ready==="true"',timeout=90000)
 assert page.evaluate('galleryState().webglVersion')==1
 assert not page.evaluate('galleryState().fallback')
 page.locator('#start').click();page.wait_for_function('galleryState().current===0');page.locator('#artifact-hotspot').click();assert page.locator('#detail').is_visible()
 print('PASS: WebGL 1-only mobile renders and opens artifact details',flush=True)
 assert not errors,errors
 page.close()
 page=ctx.new_page();page.route('**/assets/2.png',lambda route:route.abort())
 page.goto('http://127.0.0.1:4173/');page.wait_for_function('document.body.dataset.ready==="true"',timeout=90000)
 assert not page.evaluate('galleryState().fallback')
 assert page.evaluate('galleryState().imageStatus[1]')=='failed'
 print('PASS: image failure no longer disables 3D',flush=True)
 page.close()
 page=ctx.new_page()
 # Hold a texture request until the gallery has initialized; then deliver it.
 held=[]
 page.route('**/assets/3.png',lambda route:held.append(route))
 page.goto('http://127.0.0.1:4173/',wait_until='domcontentloaded');page.wait_for_function('document.body.dataset.ready==="true"',timeout=90000)
 assert not page.evaluate('galleryState().fallback')
 assert page.evaluate('galleryState().imageStatus[2]')=='loading'
 for route in held:route.continue_()
 page.wait_for_function('galleryState().imageStatus[2]==="loaded"',timeout=30000)
 assert not page.evaluate('galleryState().fallback')
 print('PASS: late image loads into an already running 3D scene',flush=True)
 b.close()
