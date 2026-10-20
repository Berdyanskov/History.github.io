const exhibits = window.EXHIBITS;
const $ = (s) => document.querySelector(s);
let filter = '全部';
let lastTrigger;
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render() {
  const term = $('#search').value.trim().toLowerCase();
  const found = exhibits.filter(e => (filter === '全部' || e.category === filter) && [e.title,e.year,e.place,e.summary,e.text].join(' ').toLowerCase().includes(term));
  $('#result-count').textContent = `正在展出 ${String(found.length).padStart(2,'0')} / 07 组素材`;
  $('#empty').hidden = found.length !== 0;
  $('#exhibits').innerHTML = found.map(e => `<button class="exhibit" data-id="${e.id}" aria-label="查看${escapeHTML(e.title)}详情"><div class="exhibit-image"><img src="${e.image}" alt="${escapeHTML(e.title)}" loading="lazy" width="600" height="600"><span class="item-number">NO. ${String(e.id).padStart(2,'0')}</span></div><div class="card-meta"><span>${e.category}</span><span>${e.year}</span></div><h3>${e.headline}</h3><p class="summary">${e.summary}</p><div class="card-bottom"><span>${e.title}</span><span aria-hidden="true">↗</span></div></button>`).join('');
}
function showDetail(id) {
 const e=exhibits.find(e=>e.id===Number(id)); if(!e)return;
 const i=exhibits.indexOf(e);
 $('#detail-content').innerHTML=`<div class="detail-layout"><div class="detail-visual"><img src="${e.image}" alt="${escapeHTML(e.title)}"><a href="${e.image}" target="_blank" rel="noopener">查看完整原图 ↗</a></div><article class="detail-copy"><p class="eyebrow">EXHIBIT ${String(e.id).padStart(2,'0')} / ${e.category}</p><h2 id="detail-title">${e.title}</h2><p class="detail-meta">${e.kind} · ${e.place}</p><p class="date-note">${e.dateNote}</p><p class="source-label">素材说明 · 依据所提供文字整理，重复段落已合并</p><div class="source-text">${escapeHTML(e.text)}</div><div class="question"><strong>观展思考</strong>${e.question}</div><a class="source-link" href="${e.source}" target="_blank" rel="noopener">查阅原始文字材料 ↗</a><div class="detail-nav"><button data-next="${exhibits[(i+6)%7].id}">← 上一件</button><span>${i+1} / 7</span><button data-next="${exhibits[(i+1)%7].id}">下一件 →</button></div></article></div>`;
 if(!$('#detail').open){lastTrigger=document.activeElement;$('#detail').showModal();document.body.classList.add('modal-open');}
 $('#detail').scrollTop=0;
}
function openExhibit(id){location.hash=`exhibit-${id}`;if(location.hash===`#exhibit-${id}`)showDetail(id);}
function onHash(){const m=location.hash.match(/^#exhibit-(\d+)$/);if(m)showDetail(m[1]);else if($('#detail').open)$('#detail').close();}
$('#exhibits').addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(b)openExhibit(b.dataset.id);});
$('#detail-content').addEventListener('click',e=>{const b=e.target.closest('[data-next]');if(b)openExhibit(b.dataset.next);});
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',x===b?'true':'false');});render();}));
$('#search').addEventListener('input',render);
const timelineIds=[4,6,7,3,1,2];
$('#timeline-items').innerHTML=timelineIds.map(id=>{const e=exhibits.find(e=>e.id===id);return `<button class="time-item" data-id="${id}" aria-label="${e.year}，${e.title}"><strong>${e.year}</strong><span>${e.title} ↗</span></button>`;}).join('');
$('#timeline-items').addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(b)openExhibit(b.dataset.id);});
let qrObjectURL;
function share(){
 lastTrigger=document.activeElement;
 const url=new URL(location.href);url.hash='';url.search='';
 const local=['localhost','127.0.0.1','0.0.0.0'].includes(url.hostname)||url.protocol==='file:';
 const shareURL=local?'https://berdyanskov.github.io/History.github.io/':url.href;
 $('#share-url').value=shareURL;
 $('#share-status').textContent=local?'本地预览：二维码指向预定发布地址，GitHub Pages 上线后才能访问。':'';
 const qr=qrcode(0,'M');qr.addData(shareURL);qr.make();
 const svg=qr.createSvgTag({cellSize:6,margin:24,scalable:true});$('#qr').innerHTML=svg;
 if(qrObjectURL)URL.revokeObjectURL(qrObjectURL);
 qrObjectURL=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));$('#download-qr').href=qrObjectURL;
 $('#share').showModal();document.body.classList.add('modal-open');
}
document.querySelectorAll('.share-trigger').forEach(b=>b.addEventListener('click',share));
$('#copy-url').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#share-url').value);$('#share-status').textContent='链接已复制。';}catch{$('#share-url').focus();$('#share-url').select();$('#share-status').textContent='请长按或按 Ctrl/Cmd+C 复制已选中的网址。';}});
document.querySelectorAll('dialog').forEach(d=>{
 d.querySelector('.close').addEventListener('click',()=>d.close());
 d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});
 d.addEventListener('close',()=>{document.body.classList.remove('modal-open');if(d.id==='detail'&&location.hash.startsWith('#exhibit-'))history.replaceState(null,'',location.pathname+location.search+'#collection');lastTrigger?.focus();});
});
window.addEventListener('hashchange',onHash);render();onHash();
