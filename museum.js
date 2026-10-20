/* A real-time, locally bundled Three.js gallery. All historical images come from assets/. */
window.HistoryMuseum = class HistoryMuseum {
  constructor(host, exhibits, hooks={}) {
    this.host=host;this.exhibits=exhibits;this.hooks=hooks;this.available=false;this.current=-1;this.moving=false;this.paused=false;this.mobile=matchMedia('(pointer: coarse)').matches||innerWidth<700;this.low=this.mobile;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.positions=exhibits.map((_,i)=>-19.2+i*6.4);this.targets=[];this.imageMeshes=[];this.textures=[];this.look=new THREE.Vector3(0,2.8,-5);this.offset={x:0,y:0};this.goalOffset={x:0,y:0};this.lastTime=0;this.needsRender=true;
  }
  async init() {
    const T=THREE;
    const canvas=document.createElement('canvas');
    const options={antialias:!this.mobile,alpha:false,powerPreference:'default',stencil:false};
    const context=canvas.getContext('webgl2',options)||canvas.getContext('webgl',options)||canvas.getContext('experimental-webgl',options);
    if(!context)throw new Error('浏览器未提供 WebGL，请在系统浏览器中重试');
    this.renderer=new T.WebGLRenderer({...options,canvas,context});
    this.webglVersion=this.renderer.capabilities.isWebGL2?2:1;
    if(this.webglVersion===1)this.low=true;
    this.renderer.setPixelRatio(this.low?1:Math.min(devicePixelRatio,2));this.renderer.setSize(innerWidth,innerHeight);
    this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;
    this.host.appendChild(this.renderer.domElement);
    this.scene=new T.Scene();this.scene.background=new T.Color('#171b1b');this.scene.fog=new T.FogExp2('#181c1b',.012);
    this.camera=new T.PerspectiveCamera(innerWidth<650?64:56,innerWidth/innerHeight,.08,150);
    if(!this.low){const pm=new T.PMREMGenerator(this.renderer);this.env=pm.fromScene(new T.RoomEnvironment(),.03);this.scene.environment=this.env.texture;pm.dispose();}
    this.scene.add(new T.HemisphereLight(0xdce2de,0x24221e,.85));this.scene.add(new T.AmbientLight(0xffe8c3,.2));
    const key=new T.DirectionalLight(0xf4dfb8,1.1);key.position.set(4,9,9);this.scene.add(key);
    const fill=new T.DirectionalLight(0xc1d2d0,.5);fill.position.set(-20,5,5);this.scene.add(fill);
    // Slow or failed downloads must not disable an otherwise working 3D gallery.
    this.imageStatus=this.exhibits.map(()=> 'loading');
    const dimensions={1:[801,1000],2:[1600,2400],3:[600,827],4:[1080,690],5:[1937,1280],6:[1044,1145],7:[388,383]};
    await Promise.all(this.exhibits.map((e,i)=>new Promise(resolve=>{
      const [w,h]=dimensions[e.id];
      const tx=this.canvasTexture(512,Math.round(512*h/w),(c,cw,ch)=>{c.fillStyle='#222a26';c.fillRect(0,0,cw,ch);c.fillStyle='#cbb58a';c.textAlign='center';c.font='20px sans-serif';c.fillText('文物图片正在载入',cw/2,ch/2);});
      this.textures[i]=tx;
      const img=new Image();this.imageStatus[i]='loading';
      const timer=setTimeout(resolve,5000);
      img.onload=()=>{
        clearTimeout(timer);this.imageStatus[i]='loaded';
        // Bound GPU texture memory while keeping the original in the detail viewer.
        const limit=this.mobile?1024:2048;const scale=Math.min(1,limit/Math.max(img.width,img.height));
        const source=document.createElement('canvas');source.width=Math.round(img.width*scale);source.height=Math.round(img.height*scale);source.getContext('2d').drawImage(img,0,0,source.width,source.height);
        tx.image=source;tx.needsUpdate=true;
        if(this.monitorTextures){this.monitorTextures[i].dispose();this.caseTextures[i].dispose();this.monitorTextures[i]=this.letterbox(tx,16/9);this.caseTextures[i]=this.letterbox(tx,1.6/.66);if(this.caseMeshes?.[i])this.caseMeshes[i].material.map=this.caseTextures[i];this.monitorIndex=-1;}
        this.needsRender=true;this.hooks.progress?.(this.imageStatus.filter(s=>s==='loaded').length);resolve();
      };
      img.onerror=()=>{clearTimeout(timer);this.imageStatus[i]='failed';const c=tx.image.getContext('2d');c.fillStyle='#222a26';c.fillRect(0,0,tx.image.width,tx.image.height);c.fillStyle='#cbb58a';c.textAlign='center';c.font='18px sans-serif';c.fillText('图片暂未加载 · 点击查看原图',tx.image.width/2,tx.image.height/2);tx.needsUpdate=true;this.needsRender=true;resolve();};
      img.src=e.image;
    })));
    this.monitorTextures=this.textures.map(t=>this.letterbox(t,16/9));this.caseTextures=this.textures.map(t=>this.letterbox(t,1.6/.66));this.build();this.setLow(this.low);this.available=true;this.setHome(true);this.events();this.animate(0);return this;
  }
  canvasTexture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;}
  letterbox(texture,aspect){return this.canvasTexture(1024,Math.round(1024/aspect),(c,w,h)=>{c.fillStyle='#1a201d';c.fillRect(0,0,w,h);const img=texture.image;const k=Math.min(w/img.width,h/img.height);c.drawImage(img,(w-img.width*k)/2,(h-img.height*k)/2,img.width*k,img.height*k);});}
  mat(color,roughness=.7,metalness=.05){return new THREE.MeshStandardMaterial({color,roughness,metalness});}
  box(w,h,d,x,y,z,mat,parent=this.scene){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);parent.add(m);return m;}
  plane(w,h,x,y,z,mat,parent=this.scene){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);m.position.set(x,y,z);parent.add(m);return m;}
  text(text,w,h,x,y,z,size=80,color='#d8c6a3',parent=this.scene,align='center'){
    const texture=this.canvasTexture(1024,Math.max(128,Math.round(1024*h/w)),(c,cw,ch)=>{c.fillStyle=color;c.textAlign=align;c.textBaseline='middle';c.font=`${size}px "Noto Serif CJK SC", "Songti SC", SimSun, serif`;const lines=text.split('\n');lines.forEach((l,i)=>c.fillText(l,align==='left'?15:cw/2,ch/2+(i-(lines.length-1)/2)*size*1.55,cw-30));});
    return this.plane(w,h,x,y,z,new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false,side:THREE.DoubleSide}),parent);
  }
  glow(w,h,x,y,z,color='#e7c784',opacity=.25,parent=this.scene){
    if(!this.glowTexture)this.glowTexture=this.canvasTexture(128,128,(c)=>{const g=c.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,255,255,.65)');g.addColorStop(.3,'rgba(255,255,255,.25)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,128,128);});
    return this.plane(w,h,x,y,z,new THREE.MeshBasicMaterial({map:this.glowTexture,color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false}),parent);
  }
  build(){
    const T=THREE;let seed=71;const rand=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
    const grain=this.canvasTexture(256,256,(c,w,h)=>{const a=c.createImageData(w,h);for(let i=0;i<a.data.length;i+=4){const v=140+rand()*35;a.data[i]=a.data[i+1]=a.data[i+2]=v;a.data[i+3]=255;}c.putImageData(a,0,0);});grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.repeat.set(8,8);
    const wall=this.mat('#343937',.95);wall.bumpMap=grain;wall.bumpScale=.018;const black=this.mat('#141718',.7,.2);const bronze=this.mat('#8d7750',.32,.7);const stone=this.mat('#41443e',.5,.2);const gold=new T.MeshBasicMaterial({color:'#ebc98b',toneMapped:false});const light=new T.MeshBasicMaterial({color:'#fff0ce',toneMapped:false});
    this.box(55,.4,40,0,-.24,6,black);this.box(55,.3,40,0,8.2,6,this.mat('#242826',.9));this.box(55,8,.6,0,4,-12.6,wall);this.box(.5,8,40,-27.5,4,6,wall);this.box(.5,8,40,27.5,4,6,wall);
    // A planar reflection under a fine-grain transparent epoxy surface.
    this.mirror=new T.Reflector(new T.PlaneGeometry(54,39),{color:0x626860,textureWidth:innerWidth<700?512:1024,textureHeight:innerWidth<700?512:1024,clipBias:.003,multisample:0});this.mirror.rotation.x=-Math.PI/2;this.mirror.position.set(0,-.018,6);this.scene.add(this.mirror);
    const floorMat=new T.MeshStandardMaterial({color:'#3c4542',roughness:.3,metalness:.15,transparent:true,opacity:.68,bumpMap:grain,bumpScale:.025,depthWrite:false});const fl=this.plane(54,39,0,-.008,6,floorMat);fl.rotation.x=-Math.PI/2;
    // Fine expansion joints and long warm ceiling slots establish scale and depth.
    const seam=this.mat('#202724',.6);
    for(let x=-24;x<=24;x+=6)this.box(.014,.005,39,x,.003,6,seam);
    for(let z=-12;z<=24;z+=6)this.box(54,.005,.014,0,.004,z,seam);
    for(let x=-24;x<=24;x+=8){this.box(.18,.1,36,x,7.98,5,black);this.box(.045,.015,35,x,7.91,5,light);}
    for(let z=-9;z<=19;z+=7){this.box(53,.13,.17,0,7.78,z,black);for(let x=-21;x<=21;x+=7){const can=this.box(.16,.35,.32,x,7.57,z,black);can.rotation.x=.28;this.box(.12,.025,.18,x,7.38,z+.03,light);}}
    this.box(53,.06,.08,0,6.8,-12.13,gold);this.box(53,.24,.35,0,7,-12.12,black);this.glow(54,4,0,6.55,-12.24,'#f4d29a',.3);
    this.box(53,.035,.035,0,.18,-12.23,gold);
    this.text('家 乡 的 物 件     /     近 现 代 史 记 忆',25,.75,0,7.4,-12.22,56,'#ded3bd');
    // Seven original photographic exhibits on the continuous narrative wall.
    this.caseMeshes=[];
    this.exhibits.forEach((e,i)=>{
      const x=this.positions[i];const image=this.textures[i].image;const ratio=image.width/image.height;let h=2.85,w=h*ratio;if(w>3.8){w=3.8;h=w/ratio;}
      this.box(6.2,5.8,.12,x,3.5,-12.21,i%2?this.mat('#242728',.94):this.mat('#202424',.92));
      this.text(`${String(i+1).padStart(2,'0')}   /   ${e.year}`,5.4,.55,x,5.85,-12.1,68,'#cdb891');
      this.box(w+.20,h+.20,.17,x,3.9,-12.02,bronze);this.box(w+.12,h+.12,.18,x,3.9,-11.91,black);
      const photo=this.plane(w,h,x,3.9,-11.80,new T.MeshBasicMaterial({map:this.textures[i],toneMapped:false}));photo.userData.index=i;this.imageMeshes.push(photo);
      this.targets.push(new T.Vector3(x,3.5,-11.8));
      this.text(e.title,5.6,.45,x,1.96,-12.05,54,'#eee8da');
      this.text(e.en,5.5,.28,x,1.57,-12.04,32,'#a8b3a8');
      this.box(5.9,.16,1.35,x,.9,-11.45,stone);this.box(5.8,.03,1.25,x,.8,-11.45,gold);this.box(5.2,.36,.8,x,.55,-11.7,black);
      // Recessed vitrines display the provided images as documentary facsimiles.
      const frame=this.box(2,.10,.8,x,.99,-11.35,black);const mini=this.plane(1.6,.66,x,1.055,-11.35,new T.MeshBasicMaterial({map:this.caseTextures[i],toneMapped:false}));mini.rotation.x=-Math.PI/2;this.caseMeshes[i]=mini;
      this.box(2.1,.28,.88,x,1.15,-11.35,new T.MeshPhysicalMaterial({color:'#b3c9c1',transparent:true,opacity:.10,roughness:.15,metalness:.1,depthWrite:false}));
      this.text('图像档案  /  DOCUMENTARY DISPLAY',2.5,.15,x+1.45,1.15,-10.75,29,'#d1c4aa');
      this.glow(6,3,x,5.7,-12.03,'#edc992',.16);
      if(!this.low){const spot=new T.SpotLight(0xffe4b6,40,13,.65,.85,1.5);spot.position.set(x,7.4,-8);spot.target.position.set(x,3.5,-12);this.scene.add(spot,spot.target);}
    });
    // Left: a luminous circular calligraphic installation on a dark sculptural base.
    const ringGroup=new T.Group();ringGroup.position.set(-14,0,3);ringGroup.rotation.y=.28;this.scene.add(ringGroup);
    this.box(6,.25,1.9,0,.16,0,stone,ringGroup);this.box(.1,2,.12,-1.35,1.1,0,bronze,ringGroup);this.box(.1,2,.12,1.35,1.1,0,bronze,ringGroup);
    const ring=new T.Mesh(new T.TorusGeometry(2.25,.045,12,128),light);ring.position.set(0,3.3,0);ringGroup.add(ring);
    const outer=new T.Mesh(new T.TorusGeometry(2.34,.025,8,128),bronze);outer.position.set(0,3.3,-.08);ringGroup.add(outer);
    this.text('家乡',3.6,1.7,0,3.55,.08,320,'#dfcba7',ringGroup);this.text('记忆有形  ·  精神无界',3.6,.5,0,2.35,.08,70,'#ddd2b8',ringGroup);
    this.glow(6.8,6.8,0,3.3,-.1,'#d5bb7a',.16,ringGroup);
    const ringLight=new T.PointLight('#f5cc8a',40,10,2);ringLight.position.set(-14,3.2,3.3);this.scene.add(ringLight);
    // Central rammed-earth stratigraphy panel: visual strata, not invented archaeological evidence.
    const earthTex=this.canvasTexture(512,1024,(c,w,h)=>{c.fillStyle='#7a6952';c.fillRect(0,0,w,h);for(let y=0;y<h;y+=2){let shade=70+Math.sin(y*.042)*13+rand()*16;c.fillStyle=`rgb(${shade+44},${shade+23},${shade})`;c.fillRect(0,y,w,2);}for(let i=0;i<25000;i++){const v=rand()>.5?230:30;c.fillStyle=`rgba(${v},${v},${v},.08)`;c.fillRect(rand()*w,rand()*h,rand()*3,1);}});
    const earthMat=new T.MeshStandardMaterial({map:earthTex,bumpMap:earthTex,bumpScale:.09,roughness:1});
    const earth=new T.Group();earth.position.set(-3.8,0,2.2);earth.rotation.y=-.17;this.scene.add(earth);
    this.box(4.3,4.8,.48,0,2.4,0,earthMat,earth);this.box(4.55,.2,1.25,0,.12,0,black,earth);
    this.text('时代的层理',3.8,.65,0,4,.26,100,'#f5ead1',earth);this.text('LAYERS OF HISTORY',3.8,.25,0,3.48,.26,40,'#e5d3b5',earth);
    ['近代教育 / EDUCATION','交通与社会 / SOCIETY','革命与守护 / MEMORY'].forEach((t,i)=>{this.text(t,3.5,.35,0,2.8-i*.73,.26,50,'#f2e4c9',earth);this.box(3.35,.012,.015,0,2.5-i*.73,.27,bronze,earth);});
    // Right-central illuminated silk panel with restrained ink-wash landscape.
    const ink=this.canvasTexture(1024,1024,(c,w,h)=>{c.fillStyle='#a7b7ae';c.fillRect(0,0,w,h);for(let l=0;l<6;l++){c.beginPath();c.moveTo(0,h);for(let x=0;x<=w;x+=8){const y=400+l*80+Math.sin(x*.006+l*2)*70+Math.sin(x*.017+l)*25;c.lineTo(x,y);}c.lineTo(w,h);c.fillStyle=`rgba(54,79,73,${.055+l*.023})`;c.fill();}for(let y=0;y<h;y+=3){c.fillStyle='rgba(255,255,255,.035)';c.fillRect(0,y,w,1);}});
    const silk=new T.Group();silk.position.set(4.3,0,.2);silk.rotation.y=-.20;this.scene.add(silk);
    this.box(5.2,5.8,.14,0,2.9,0,new T.MeshStandardMaterial({map:ink,emissive:'#a6bfb0',emissiveMap:ink,emissiveIntensity:.25,roughness:.6,transparent:true,opacity:.91}),silk);
    [-2.65,2.65].forEach(x=>this.box(.06,5.9,.16,x,2.95,0,black,silk));this.box(5.4,.06,.16,0,5.9,0,bronze,silk);this.box(5.4,.035,.18,0,5.82,.02,light,silk);
    this.text('山河有记',4.6,.9,0,4.55,.1,150,'#293f36',silk);this.text('THE LAND REMEMBERS',4.6,.32,0,3.87,.1,44,'#41554a',silk);
    this.text('刘伯承',1.4,.35,-1.1,2.7,.1,100,'#41564b',silk);this.text('小叶丹',1.4,.35,.9,2.15,.1,100,'#41564b',silk);this.text('邓小平',1.4,.35,-.45,1.3,.1,100,'#41564b',silk);
    this.box(5.5,.15,1.25,0,.1,0,black,silk);
    // Tall chronology tower and a working documentary image screen.
    const tower=new T.Group();tower.position.set(15,0,5.5);tower.rotation.y=-.35;this.scene.add(tower);
    this.box(3.1,6.9,.6,0,3.45,0,this.mat('#684c3b',.8),tower);this.box(3.45,.18,1.6,0,.1,0,black,tower);
    this.text('近代 · 中国',2.8,.5,0,6.15,.32,100,'#e8d4ac',tower);this.text('MODERN CHINA',2.8,.3,0,5.65,.32,56,'#cbb897',tower);
    this.text('1917',2.7,.8,0,4.75,.33,210,'#c8b085',tower);this.text('—',2,.4,0,4.08,.33,100,'#b8a17a',tower);this.text('1949',2.7,.8,0,3.4,.33,210,'#c8b085',tower);
    this.box(2.5,1.55,.15,0,1.82,.4,black,tower);this.monitor=this.plane(2.3,1.32,0,1.82,.49,new T.MeshBasicMaterial({map:this.monitorTextures[4],toneMapped:false}),tower);
    this.text('历史影像 / VISUAL ARCHIVE',2.5,.23,0,.78,.33,40,'#cbb897',tower);
    // Frosted introduction partitions with slim metal frames.
    const partition=new T.Group();partition.position.set(22,0,1.7);partition.rotation.y=-.55;this.scene.add(partition);
    this.box(4.4,5.1,.08,0,2.55,0,new T.MeshPhysicalMaterial({color:'#91aaa3',transparent:true,opacity:.37,roughness:.85,metalness:.05,depthWrite:false}),partition);
    [-2.25,2.25].forEach(x=>this.box(.06,5.25,.12,x,2.62,0,black,partition));this.box(4.55,.07,.12,0,5.24,0,black,partition);
    this.text('前\n言',.6,2.4,1.45,3.4,.08,190,'#dbd8c6',partition);this.text('由\n物\n入\n史',.6,3,.25,2.9,.08,155,'#c6cdbb',partition);this.text('以\n史\n观\n今',.6,3,-.75,2.9,.08,155,'#c6cdbb',partition);
    this.text('PREFACE · OBJECTS AND MEMORIES',3.8,.25,0,.5,.08,34,'#d3c9b0',partition);
    // Two quiet, stylized visitors provide scale, never competing with artifacts.
    const human=this.mat('#333b36',1);const person=(x,z,scale)=>{const g=new T.Group();g.position.set(x,0,z);g.scale.setScalar(scale);this.scene.add(g);const head=new T.Mesh(new T.SphereGeometry(.11,12,8),human);head.position.y=1.64;g.add(head);const body=new T.Mesh(new T.CapsuleGeometry(.16,.62,4,8),human);body.position.y=1.15;g.add(body);[-.09,.09].forEach(xx=>{const leg=new T.Mesh(new T.CylinderGeometry(.065,.05,.68,8),human);leg.position.set(xx,.38,0);g.add(leg);});};person(10,-5,1);person(10.65,-5.4,.95);
    // Floor wayfinding markers.
    for(let i=0;i<7;i++){const t=this.text(String(i+1).padStart(2,'0'),.7,.45,this.positions[i],.015,-6,220,'#b6a583');t.rotation.x=-Math.PI/2;}
  }
  homePose(){return {pos:new THREE.Vector3(innerWidth<650?10:12,innerWidth<650?3.3:3.5,innerWidth<650?23:20),look:new THREE.Vector3(1,2.9,-4)};}
  stationPose(i){const x=this.positions[i];return {pos:new THREE.Vector3(x,3.25,innerWidth<650?-5.15:-5.6),look:new THREE.Vector3(x,innerWidth<650?4.05:3.5,-11.8)};}
  setHome(instant=false){this.current=-1;const p=this.homePose();return this.move(p.pos,p.look,instant,2600);}
  visit(i,instant=false){this.current=i;const p=this.stationPose(i);return this.move(p.pos,p.look,instant,2100);}
  move(pos,look,instant=false,duration=2000){
    if(!this.camera)return Promise.resolve();
    this.goalOffset={x:0,y:0};this.offset={x:0,y:0};this.needsRender=true;
    if(instant||this.reduced){this.camera.position.copy(pos);this.look.copy(look);this.camera.lookAt(this.look);this.moving=false;return Promise.resolve();}
    return new Promise(resolve=>{this.moving=true;const from=this.camera.position.clone();const oldLook=this.look.clone();const path=new THREE.CatmullRomCurve3([from,from.clone().lerp(pos,.35).add(new THREE.Vector3(0,-.1,this.current>=0&&from.z<0?1.15:0)),pos]);this.transition={start:performance.now(),duration,from,oldLook,pos,look,path,resolve};});
  }
  setLow(on){this.needsRender=true;this.low=on;this.mirror.visible=!on;this.renderer.setPixelRatio(on?1:Math.min(devicePixelRatio,innerWidth<700?1.5:2));}
  events(){
    const c=this.renderer.domElement;let down=null;this.ray=new THREE.Raycaster();
    c.addEventListener('pointerdown',e=>{if(this.moving||this.paused)return;down={x:e.clientX,y:e.clientY,ox:this.goalOffset.x,oy:this.goalOffset.y,moved:false};c.setPointerCapture(e.pointerId);});
    c.addEventListener('pointermove',e=>{if(!down||this.paused)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;if(Math.abs(dx)+Math.abs(dy)>5)down.moved=true;this.goalOffset.x=Math.max(-1,Math.min(1,down.ox-dx/500));this.goalOffset.y=Math.max(-.4,Math.min(.4,down.oy+dy/650));});
    c.addEventListener('pointerup',e=>{if(down&&!down.moved&&!this.moving&&!this.paused){this.ray.setFromCamera(new THREE.Vector2(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1),this.camera);const hits=this.ray.intersectObjects(this.imageMeshes);if(hits.length)this.hooks.select?.(hits[0].object.userData.index);}down=null;});
    c.addEventListener('pointercancel',()=>down=null);
    c.addEventListener('webglcontextlost',e=>{e.preventDefault();this.available=false;if(this.transition){this.transition.resolve();this.transition=null;this.moving=false;}this.hooks.lost?.();});
    window.addEventListener('resize',()=>{this.needsRender=true;this.camera.aspect=innerWidth/innerHeight;this.camera.fov=innerWidth<650?64:56;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);if(!this.moving){const p=this.current<0?this.homePose():this.stationPose(this.current);this.camera.position.copy(p.pos);this.look.copy(p.look);}});
  }
  animate(time){
    if(!this.available)return;this.raf=requestAnimationFrame(t=>this.animate(t));
    if(document.hidden||this.paused)return;
    if(time-this.lastTime<32)return;this.lastTime=time;
    let redraw=this.needsRender||!!this.transition||Math.abs(this.goalOffset.x-this.offset.x)>.001||Math.abs(this.goalOffset.y-this.offset.y)>.001;
    if(this.transition){const tr=this.transition;let t=Math.min(1,(performance.now()-tr.start)/tr.duration);const k=t*t*(3-2*t);this.camera.position.copy(tr.path.getPoint(k));this.look.copy(tr.oldLook).lerp(tr.look,k);if(t===1){this.transition=null;this.moving=false;tr.resolve();}}
    this.offset.x+=(this.goalOffset.x-this.offset.x)*.08;this.offset.y+=(this.goalOffset.y-this.offset.y)*.08;
    const view=this.look.clone();const range=this.current<0?5:1.7;view.x+=this.offset.x*range;view.y+=this.offset.y*range;this.camera.lookAt(view);
    if(this.monitor){const n=Math.floor(time/6500)%7;if(n!==this.monitorIndex){this.monitor.material.map=this.monitorTextures[n];this.monitorIndex=n;redraw=true;}}
    if(!redraw)return;this.needsRender=false;
    this.renderer.render(this.scene,this.camera);
    if(this.current>=0&&!this.moving){const p=new THREE.Vector3(this.positions[this.current],1.55,-11.6).project(this.camera);this.hooks.project?.((p.x+1)*innerWidth/2,(-p.y+1)*innerHeight/2,p.z<1);}
  }
};
