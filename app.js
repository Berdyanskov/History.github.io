(() => {
'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={1:'Flag of the Guji Detachment of the Chinese Yimin Red Army',2:'Gutian Conference Resolution · Yan’an Edition',3:'The Central Archives and the August 7 Meeting Manuscript',4:'Chongsi Building, Xuhui High School',5:'Xuzhou Railway Station and Railways',6:'Painting of the Anyang Railway Workers’ Strike',7:'Copper Ink Box Commemorating the Andong Salt Workers’ Uprising'};
const items=window.EXHIBITS.slice().sort((a,b)=>a.id-b.id).map(e=>({...e,en:names[e.id]}));
let current=-1,busy=false,museum=null,fallback=false,detailIndex=0,lastFocus=null,qrURL=null,toastTimer;
let saved=null,visited=new Set();
let fallbackReason='';
try{saved=JSON.parse(localStorage.getItem('hometown-tour-v2'));if(saved&&Number.isInteger(saved.index)&&saved.index>=0&&saved.index<=7){visited=new Set((saved.visited||[]).filter(n=>Number.isInteger(n)&&n>=0&&n<7));$('#resume').hidden=false;$('#resume').textContent=saved.index===7?'重温上次的展览结语 →':`继续上次的游览 · 第 ${saved.index+1} 件 →`;}else saved=null;}catch{}
let reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,low=false;
function notify(text){clearTimeout(toastTimer);$('#toast').textContent=text;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,4200);}
function remember(){try{localStorage.setItem('hometown-tour-v2',JSON.stringify({index:current,visited:[...visited]}));}catch{}}
function controls(disabled){$('#next').disabled=disabled;$('#previous').disabled=disabled;$('#start').disabled=disabled;$('#resume').disabled=disabled;document.querySelectorAll('#route-dots button').forEach(b=>b.disabled=disabled);}
function renderDirectory(){
 $('#map-list').innerHTML=items.map((e,i)=>`<button class="map-item ${current===i?'active':''}" data-visit="${i}"><img src="${e.image}" alt="${esc(e.title)}"><span><small>CHAPTER ${String(i+1).padStart(2,'0')} · ${esc(e.year)}</small><strong>${esc(e.title)}</strong></span>${visited.has(i)?'<em>已读</em>':''}</button>`).join('');
}
function render(){
 const entrance=current===-1,end=current===7,tour=!entrance&&!end;
 document.body.dataset.view=entrance?'entrance':end?'ending':'tour';
 $('#entrance').hidden=!entrance;$('#entrance-note').hidden=!entrance;$('#entrance-footer').hidden=!entrance;$('#tour-footer').hidden=entrance;$('#chapter').hidden=!tour;$('#ending').hidden=!end;
 $('#artifact-hotspot').hidden=!tour||fallback||busy;$('#flat-artifact').hidden=!tour||!fallback;
 if(tour){const e=items[current];$('#chapter-kicker').textContent=`CHAPTER ${String(current+1).padStart(2,'0')} / 07 · ${e.category}`;$('#chapter-title').textContent=e.title;$('#chapter-en').textContent=e.en;$('#chapter-meta').innerHTML=`<span>${e.year}</span><span>${e.place}</span><span>${e.kind}</span>`;$('#flat-image').src=e.image;$('#flat-image').alt=e.title;}
 $('#route-caption').textContent=end?'七件物件 · 一段共同的记忆':'参观路线 · 点击节点跳转';$('#route-count').textContent=end?'07 / 07':`${String(current+1).padStart(2,'0')} / 07`;
 $('#next').innerHTML=end?'返回入口 <span>↗</span>':current===6?'走向展览结语 <span>→</span>':'翻开下一篇章 <span>→</span>';
 $('#previous').textContent=current===0?'← 返回入口':'← 上一篇章';
 document.querySelectorAll('#route-dots button').forEach((b,i)=>{b.classList.toggle('active',current===i);b.classList.toggle('visited',visited.has(i));b.setAttribute('aria-current',current===i?'step':'false');});
 renderDirectory();
}
async function go(index,{instant=false,hash=true}={}){
 if(busy||index< -1||index>7)return false;
 busy=true;controls(true);$('#artifact-hotspot').hidden=true;$('#chapter').hidden=true;$('#ending').hidden=true;
 if(index>=0)$('#entrance').hidden=true;
 if(!instant&&!reduced&&!fallback)$('#move-status').hidden=false;
 try{if(museum?.available){if(index===-1||index===7)await museum.setHome(instant);else await museum.visit(index,instant);}}
 catch{enableFallback();}
 current=index;busy=false;$('#move-status').hidden=true;controls(false);render();
 if(hash)history.replaceState(null,'',index<0?'#entrance':index===7?'#ending':`#chapter-${items[index].id}`);
 if(index>=0)remember();return true;
}
async function next(){if(busy)return;await go(current===7?-1:current+1);}
function openDialog(dialog){lastFocus=document.activeElement;dialog.showModal();if(museum)museum.paused=true;}
function closeDialog(dialog){dialog.close();}
document.querySelectorAll('dialog').forEach(d=>{
 d.querySelector('.close').addEventListener('click',()=>closeDialog(d));
 d.addEventListener('close',()=>{if(museum)museum.paused=!!document.querySelector('dialog[open]');if(d.id==='detail'&&location.hash.startsWith('#exhibit-'))history.replaceState(null,'',current===7?'#ending':`#chapter-${items[Math.max(0,current)].id}`);lastFocus?.focus({preventScroll:true});});
 d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});
});
$('#start').onclick=()=>go(0);$('#resume').onclick=()=>go(saved?.index??0);$('#home').onclick=()=>go(-1);$('#restart').onclick=()=>go(0);$('#next').onclick=next;$('#previous').onclick=()=>go(current-1);
$('#route-dots').innerHTML=items.map((e,i)=>`<button data-visit="${i}" aria-label="走近第 ${i+1} 件：${esc(e.title)}" title="${esc(e.title)}"></button>`).join('');
$('#route-dots').onclick=e=>{const b=e.target.closest('[data-visit]');if(b)go(Number(b.dataset.visit));};
$('#open-map').onclick=()=>{if(busy)return;renderDirectory();openDialog($('#map-dialog'));};
$('#map-list').onclick=e=>{const b=e.target.closest('[data-visit]');if(b){$('#map-dialog').close();go(Number(b.dataset.visit));}};
$('#map-ending').onclick=()=>{$('#map-dialog').close();go(7);};
$('#ending-artifacts').innerHTML=items.map((e,i)=>`<button class="ending-item" data-detail="${i}"><img src="${e.image}" alt="${esc(e.title)}"><span>${String(i+1).padStart(2,'0')} / ${esc(e.title)}</span></button>`).join('');
$('#ending-artifacts').onclick=e=>{const b=e.target.closest('[data-detail]');if(b)openDetail(Number(b.dataset.detail));};
const fileViewURLs=new Map();
function viewURL(value){
 if(!value.startsWith('data:'))return value;
 if(!fileViewURLs.has(value)){const [header,base64]=value.split(',');const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));fileViewURLs.set(value,URL.createObjectURL(new Blob([bytes],{type:header.slice(5).replace(';base64','')})));}
 return fileViewURLs.get(value);
}
function openDetail(index){
 if(busy||index<0||index>=7)return;
 detailIndex=index;const e=items[index];visited.add(index);remember();renderDirectory();
 $('#detail-image').src=e.image;$('#detail-image').alt=e.title;$('#original-image').href=viewURL(e.image);
 $('#detail-number').textContent=`CHAPTER ${String(index+1).padStart(2,'0')} / 07 · ${e.category}`;$('#detail-title').textContent=e.title;$('#detail-en').textContent=e.en;
 $('#detail-meta').innerHTML=`<span>${e.kind}</span><span>·</span><span>${e.place}</span>`;$('#date-note').textContent=e.dateNote;$('#detail-text').textContent=e.text;$('#source-link').href=viewURL(e.source);
 $('#detail-next').textContent=index===6?'走向展览结语 →':'翻开下一篇章 →';
 resetZoom();openDialog($('#detail'));$('.detail-copy').scrollTop=0;
}
$('#artifact-hotspot').onclick=()=>openDetail(current);$('#flat-open').onclick=()=>openDetail(current);$('#return-gallery').onclick=()=>$('#detail').close();$('#detail-next').onclick=()=>{$('#detail').close();go(detailIndex+1);};
// Image viewer: bounded zoom, drag-to-pan, pinch and reset work on the unmodified original.
let zoom=1,panX=0,panY=0,pinchDistance=0;const pointers=new Map();const stage=$('#zoom-stage');
function drawZoom(){const r=stage.getBoundingClientRect();const maxX=Math.max(0,r.width*(zoom-1)/2),maxY=Math.max(0,r.height*(zoom-1)/2);panX=Math.max(-maxX,Math.min(maxX,panX));panY=Math.max(-maxY,Math.min(maxY,panY));$('#detail-image').style.transform=`translate(${panX}px,${panY}px) scale(${zoom})`;$('#zoom-value').textContent=Math.round(zoom*100)+'%';$('#zoom-in').disabled=zoom>=6;$('#zoom-out').disabled=zoom<=.5;}
function changeZoom(factor){zoom=Math.min(6,Math.max(.5,zoom*factor));drawZoom();}
function resetZoom(){zoom=1;panX=panY=0;pointers.clear();pinchDistance=0;drawZoom();}
$('#zoom-in').onclick=()=>changeZoom(1.25);$('#zoom-out').onclick=()=>changeZoom(.8);$('#zoom-reset').onclick=resetZoom;
stage.addEventListener('wheel',e=>{e.preventDefault();changeZoom(e.deltaY<0?1.12:1/1.12);},{passive:false});
const distance=()=>{const a=[...pointers.values()];return a.length===2?Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y):0;};
stage.addEventListener('pointerdown',e=>{e.preventDefault();stage.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});pinchDistance=distance();});
stage.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const old=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const d=distance();if(pinchDistance)changeZoom(d/pinchDistance);pinchDistance=d;}else{panX+=e.clientX-old.x;panY+=e.clientY-old.y;drawZoom();}});
['pointerup','pointercancel','lostpointercapture'].forEach(ev=>stage.addEventListener(ev,e=>{pointers.delete(e.pointerId);pinchDistance=distance();}));
stage.addEventListener('dblclick',()=>zoom===1?changeZoom(2):resetZoom());
window.addEventListener('resize',drawZoom);
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else notify('当前浏览器不支持全屏，可使用横屏浏览。');}catch{notify('全屏未能开启，可使用浏览器全屏或横屏浏览。');}}
$('#fullscreen').onclick=fullscreen;document.addEventListener('fullscreenchange',()=>$('#fullscreen').setAttribute('aria-label',document.fullscreenElement?'退出全屏':'切换全屏'));
$('#open-help').onclick=()=>openDialog($('#help'));
function updateSettings(){$('#motion-toggle').textContent=`减少镜头动画：${reduced?'开':'关'}`;$('#motion-toggle').setAttribute('aria-pressed',String(reduced));$('#quality-toggle').textContent=`流畅模式：${low?'开':'关'}`;$('#quality-toggle').setAttribute('aria-pressed',String(low));}
$('#motion-toggle').onclick=()=>{reduced=!reduced;if(museum)museum.reduced=reduced;updateSettings();};
$('#quality-toggle').onclick=()=>{low=!low;if(museum?.available)museum.setLow(low);updateSettings();};
document.addEventListener('keydown',e=>{
 if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
 if($('#detail').open){if(e.key==='+'||e.key==='='){e.preventDefault();changeZoom(1.25);}if(e.key==='-'){e.preventDefault();changeZoom(.8);}return;}
 if(document.querySelector('dialog[open]'))return;
 if(e.key==='ArrowRight'||e.code==='Space'&&!/BUTTON|A/.test(e.target.tagName)){e.preventDefault();next();}
 else if(e.key==='ArrowLeft'){e.preventDefault();go(Math.max(-1,current-1));}
 else if(e.key.toLowerCase()==='f')fullscreen();else if(e.key.toLowerCase()==='m')$('#open-map').click();else if(e.key==='Enter'&&current>=0&&current<7&&!/BUTTON|A/.test(e.target.tagName))openDetail(current);
});
function share(){
 const local=location.protocol==='file:'||['localhost','127.0.0.1','0.0.0.0'].includes(location.hostname);
 const url=local?'https://berdyanskov.github.io/History.github.io/':location.href.split('#')[0].split('?')[0];$('#share-url').value=url;$('#share-status').textContent=local?'二维码指向已发布的线上展厅。':'';
 const qr=qrcode(0,'M');qr.addData(url);qr.make();const svg=qr.createSvgTag({cellSize:6,margin:24,scalable:true});$('#qr').innerHTML=svg;if(qrURL)URL.revokeObjectURL(qrURL);qrURL=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));$('#download-qr').href=qrURL;openDialog($('#share'));
}
$('#share-start').onclick=share;$('#share-end').onclick=share;
$('#copy-url').onclick=async()=>{try{await navigator.clipboard.writeText($('#share-url').value);$('#share-status').textContent='展览链接已复制。';}catch{$('#share-url').select();$('#share-status').textContent='请长按或按 Ctrl/Cmd+C 复制已选中的网址。';}};
$('#retry-3d').onclick=()=>location.reload();
function enableFallback(reason='三维画面初始化失败'){fallbackReason=reason;fallback=true;$('#mode-notice').textContent=`已切换图文模式：${reason}。可点击下方按钮重新尝试。`;$('#retry-3d').hidden=false;$('#world').style.background='radial-gradient(ellipse at 70% 30%,#475244,#121b16 75%)';if(museum?.renderer)museum.renderer.domElement.style.display='none';$('#mode-notice').hidden=false;if(museum)museum.available=false;render();}
async function routeHash(instant=false){const m=location.hash.match(/^#(?:chapter|exhibit)-(\d+)$/);if(m){const index=items.findIndex(e=>e.id===Number(m[1]));if(index>=0){await go(index,{instant,hash:false});if(location.hash.startsWith('#exhibit-'))openDetail(index);}}else if(location.hash==='#ending')await go(7,{instant,hash:false});else if(location.hash==='#entrance')await go(-1,{instant,hash:false});}
window.addEventListener('hashchange',()=>{if(!busy)routeHash();});
async function init(){
 render();controls(true);updateSettings();
 if(window.MUSEUM_OFFLINE)document.querySelectorAll('[href="downloads/hometown-museum.zip"]').forEach(a=>a.hidden=true);
 try{
   museum=new HistoryMuseum($('#world'),items,{progress:n=>$('#load-progress').textContent=`正在布置文物 ${n} / 7`,select:async i=>{if(busy)return;if(current!==i)await go(i);openDetail(i);},project:(x,y,visible)=>{if(current<0||current>6||busy||fallback)return;const el=$('#artifact-hotspot');el.hidden=!visible;el.style.left=`${Math.max(135,Math.min(innerWidth-135,x))}px`;el.style.top=`${Math.max(290,Math.min(innerHeight-(innerWidth<600?150:125),y))}px`;},lost:()=>{enableFallback('浏览器中断了图形渲染，可能是设备资源不足');notify('可点击重新尝试 3D，或在系统浏览器中打开。');}});
   museum.reduced=reduced;await museum.init();low=museum.low;updateSettings();
 }catch(error){console.warn('Gallery fallback:',error.message);enableFallback(error.message||'初始化失败');}
 $('#loading').classList.add('ready');setTimeout(()=>$('#loading').hidden=true,650);controls(false);await routeHash(true);document.body.dataset.ready='true';
}
init();
// Read-only test/diagnostic state, useful for classroom setup and browser checks.
window.galleryState=()=>({current,busy,fallback,fallbackReason,webglVersion:museum?.webglVersion,imageStatus:museum?.imageStatus,visited:[...visited],zoom,position:museum?.camera?.position.toArray(),renderer:museum?.renderer?.info.render});
})();
