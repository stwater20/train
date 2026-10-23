/* render3d.js — three.js 3D 場景：軌道、景物、車站、號誌、平交道與駕駛室視角 */
'use strict';

/* ---------- 3D cab view (three.js) ---------- */
const cv=document.getElementById('view'), fx=document.getElementById('fx'), fctx=fx.getContext('2d');
const RT=0.52, PT=RT+1.15, CAMX=-0.55, CAMH=2.9;
let W=0,H=0, R3=null;

/* track centreline integrated from curvature: s → (x,z,heading) */
const PMIN=-700, PMAX=END+1000, PN=PMAX-PMIN+1;
const PXa=new Float64Array(PN), PZa=new Float64Array(PN), PTa=new Float64Array(PN);
(function(){
  const i0=-PMIN;
  for(let i=i0+1;i<PN;i++){ const s=i+PMIN; PTa[i]=PTa[i-1]+kAt(s-0.5); const m=(PTa[i]+PTa[i-1])/2; PXa[i]=PXa[i-1]+Math.sin(m); PZa[i]=PZa[i-1]-Math.cos(m); }
  for(let i=i0-1;i>=0;i--){ PTa[i]=PTa[i+1]; PXa[i]=PXa[i+1]-Math.sin(PTa[i]); PZa[i]=PZa[i+1]+Math.cos(PTa[i]); }
})();
const FR={x:0,z:0,th:0,dx:0,dz:-1,rx:1,rz:0};
function fr(s){ const u=clamp(s-PMIN,0,PN-1.0001), i=Math.floor(u), t=u-i;
  FR.x=PXa[i]+(PXa[i+1]-PXa[i])*t; FR.z=PZa[i]+(PZa[i+1]-PZa[i])*t; FR.th=PTa[i]+(PTa[i+1]-PTa[i])*t;
  FR.dx=Math.sin(FR.th); FR.dz=-Math.cos(FR.th); FR.rx=Math.cos(FR.th); FR.rz=Math.sin(FR.th); return FR; }

function place(obj,s,lat,h,ry){ const f=fr(s); obj.position.set(f.x+f.rx*lat,h,f.z+f.rz*lat); obj.rotation.set(0,-f.th+(ry||0),0); return obj; }
const MODES=['mosaic','chunky','hq'], MODE_LAB={mosaic:'馬賽克',chunky:'大馬賽克',hq:'高畫質'};
let MODE='hq'; try{ localStorage.removeItem('cabMode'); }catch(e){}
function pxSize(){ if(MODE==='hq') return 1; const b=Math.max(2,Math.round(W/300)); return MODE==='chunky'?b*2:b; }
function setMode(m){ MODE=m; try{ localStorage.setItem('cabMode',m); }catch(e){} document.getElementById('modeLab').textContent=MODE_LAB[m]; resize(); }
function resize(){
  W=cv.clientWidth; H=cv.clientHeight; if(!W||!H) return;
  const dpr=Math.min(window.devicePixelRatio||1, W<700?1.5:2), px=pxSize(), pix=MODE!=='hq';
  cv.classList.toggle('pix',pix); fx.classList.toggle('pix',pix);
  if(pix){ fx.width=Math.max(1,Math.round(W/px)); fx.height=Math.max(1,Math.round(H/px)); } else { fx.width=Math.round(W*dpr); fx.height=Math.round(H*dpr); }
  fctx.setTransform(fx.width/W,0,0,fx.height/H,0,0); fctx.imageSmoothingEnabled=!pix; drawFrame();
  if(R3){ R3.renderer.setPixelRatio(pix?1:dpr); R3.renderer.setSize(W,H,false);
    const rw=Math.max(1,Math.round(W/px)), rh=Math.max(1,Math.round(H/px));
    if(R3.rt.width!==rw||R3.rt.height!==rh){ R3.rt.dispose(); if(R3.rt.depthTexture) R3.rt.depthTexture.dispose(); R3.rt=R3.makeRT(rw,rh); R3.blitMat.uniforms.tDiffuse.value=R3.rt.texture; }
    R3.blitMat.uniforms.res.value.set(rw,rh); const asp=W/H; R3.cam.aspect=asp;
    R3.cam.fov=Math.max(40, 2*Math.atan(Math.tan(36*Math.PI/180)/asp)*180/Math.PI); R3.cam.updateProjectionMatrix(); }
}
new ResizeObserver(resize).observe(cv);

function drawFrame(){
  fctx.clearRect(0,0,W,H);
  fctx.fillStyle='#0d1215';
  fctx.beginPath(); fctx.moveTo(0,0); fctx.lineTo(W*0.05,0); fctx.lineTo(W*0.028,H); fctx.lineTo(0,H); fctx.closePath(); fctx.fill();
  fctx.beginPath(); fctx.moveTo(W,0); fctx.lineTo(W*0.95,0); fctx.lineTo(W*0.972,H); fctx.lineTo(W,H); fctx.closePath(); fctx.fill();
  fctx.fillRect(0,0,W,Math.max(6,H*0.028));
  const g=fctx.createLinearGradient(0,H*0.9,0,H); g.addColorStop(0,'#2a3740'); g.addColorStop(0.1,'#151c21'); g.addColorStop(1,'#0b1013');
  fctx.fillStyle=g; fctx.fillRect(0,H*0.915,W,H*0.09);
  const gl=fctx.createLinearGradient(0,0,W,H*0.9); gl.addColorStop(0,'rgba(255,255,255,0.06)'); gl.addColorStop(0.35,'rgba(255,255,255,0)'); gl.addColorStop(1,'rgba(255,255,255,0.025)');
  fctx.fillStyle=gl; fctx.fillRect(0,0,W,H*0.915);
  const vg=fctx.createRadialGradient(W/2,H*0.45,Math.min(W,H)*0.45,W/2,H*0.45,Math.max(W,H)*0.8); vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,0.28)');
  fctx.fillStyle=vg; fctx.fillRect(0,0,W,H);
}

function init3D(){
  if(!window.THREE){ toast('3D 引擎載入失敗，請重新整理頁面','bad'); return; }
  const T=THREE;
  if(T.ColorManagement) T.ColorManagement.legacyMode=false;
  let renderer;
  try{ renderer=new T.WebGLRenderer({canvas:cv, antialias:true, powerPreference:'high-performance'}); }
  catch(e){ toast('這個瀏覽器無法啟用 3D 畫面','bad'); return; }
  renderer.outputEncoding=T.sRGBEncoding;
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=T.PCFSoftShadowMap;
  const ANISO=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const scene=new T.Scene();
  const HAZE=0xd9e5e6;
  scene.fog=new T.Fog(HAZE,140,2300);
  const cam=new T.PerspectiveCamera(45,1,0.6,14000);

  /* lights: morning sun from the east (left of the train, heading south) */
  const SUNDIR=new T.Vector3(-0.72,0.55,-0.25).normalize();
  const hemi=new T.HemisphereLight(0xdce9f4,0x56653a,0.78); scene.add(hemi);
  const sun=new T.DirectionalLight(0xfff0d8,1.35);
  sun.castShadow=true; const ss=W<700?1024:2048; sun.shadow.mapSize.set(ss,ss);
  Object.assign(sun.shadow.camera,{left:-55,right:55,top:55,bottom:-55,near:5,far:420});
  sun.shadow.bias=-0.0006; sun.shadow.normalBias=0.03;
  scene.add(sun); scene.add(sun.target);

  /* textures */
  const tex=(w,h,draw,rep)=>{ const c=document.createElement('canvas'); c.width=w; c.height=h; draw(c.getContext('2d'),w,h);
    const t=new T.CanvasTexture(c); t.encoding=T.sRGBEncoding; t.anisotropy=ANISO; if(rep){ t.wrapS=t.wrapT=T.RepeatWrapping; } return t; };
  const speck=(x,w,h,n,cols,smin,smax)=>{ for(let i=0;i<n;i++){ x.fillStyle=cols[(Math.random()*cols.length)|0]; const s=smin+Math.random()*(smax-smin); x.fillRect(Math.random()*w,Math.random()*h,s,s); } };
  const groundTex=tex(1024,1024,(x,w,h)=>{
    const n=8, cs=w/n, pal=['#86b154','#9cc05e','#76a54b','#a9c46a','#6c9b45','#91b65b','#7fa391','#b2c579'];
    for(let i=0;i<n;i++) for(let j=0;j<n;j++){
      const c=pal[(Math.random()*pal.length)|0]; x.fillStyle=c; x.fillRect(i*cs,j*cs,cs,cs);
      x.strokeStyle='rgba(30,60,25,0.16)'; x.lineWidth=1.2; const hor=Math.random()<0.5;
      for(let k=5;k<cs;k+=6){ x.beginPath(); if(hor){ x.moveTo(i*cs+3,j*cs+k); x.lineTo(i*cs+cs-3,j*cs+k);} else { x.moveTo(i*cs+k,j*cs+3); x.lineTo(i*cs+k,j*cs+cs-3);} x.stroke(); }
      if(c==='#7fa391'){ x.fillStyle='rgba(225,240,245,0.25)'; x.fillRect(i*cs+4,j*cs+4,cs-8,cs*0.35); }
    }
    speck(x,w,h,9000,['rgba(40,70,25,.18)','rgba(255,255,210,.12)'],1,3);
    x.strokeStyle='#b6a679'; x.lineWidth=5;
    for(let i=0;i<=n;i++){ x.beginPath(); x.moveTo(i*cs,0); x.lineTo(i*cs,h); x.stroke(); x.beginPath(); x.moveTo(0,i*cs); x.lineTo(w,i*cs); x.stroke(); }
  },true);
  const GS=18000; groundTex.repeat.set(GS/160,GS/160);
  const ballastTex=tex(256,256,(x,w,h)=>{ x.fillStyle='#857e72'; x.fillRect(0,0,w,h); speck(x,w,h,2600,['#6c665c','#9c958a','#5a554d','#aaa397','#776f62'],2,5); },true);
  const grassTex=tex(256,256,(x,w,h)=>{ x.fillStyle='#6d9846'; x.fillRect(0,0,w,h); speck(x,w,h,4000,['#5c8a3a','#80a957','#4f7a33','#93b862'],1,3); },true);
  const tileTex=tex(256,256,(x,w,h)=>{ x.fillStyle='#c9c4b8'; x.fillRect(0,0,w,h); speck(x,w,h,1500,['#bdb7aa','#d4cfc4'],1,2); x.strokeStyle='#a9a396'; x.lineWidth=2; for(let i=0;i<=4;i++){ x.beginPath(); x.moveTo(i*64,0); x.lineTo(i*64,h); x.stroke(); x.beginPath(); x.moveTo(0,i*64); x.lineTo(w,i*64); x.stroke(); } },true);
  const tactTex=tex(64,64,(x,w,h)=>{ x.fillStyle='#e2b92c'; x.fillRect(0,0,w,h); x.fillStyle='#c79d1c'; for(let i=0;i<4;i++) for(let j=0;j<4;j++){ x.beginPath(); x.arc(8+i*16,8+j*16,4,0,7); x.fill(); } },true);
  const roadTex=tex(256,256,(x,w,h)=>{ x.fillStyle='#55595c'; x.fillRect(0,0,w,h); speck(x,w,h,3000,['#4a4e51','#63676a','#5c6063'],1,3);
    x.fillStyle='#ecebe4'; x.fillRect(w*0.04,0,4,h); x.fillRect(w*0.96-4,0,4,h); x.fillStyle='#e8c22e'; x.fillRect(w*0.485-5,0,4,h); x.fillRect(w*0.515+1,0,4,h); },true);
  const wallTex=tex(256,128,(x,w,h)=>{ x.fillStyle='#ffffff'; x.fillRect(0,0,w,h); speck(x,w,h,800,['#eeeeee','#f6f6f6','#e4e4e4'],2,6);
    x.fillStyle='#2f3a40'; for(let i=0;i<3;i++){ x.fillRect(20+i*80,40,44,36); } x.fillStyle='#6a5240'; x.fillRect(w-46,62,30,66);
    x.fillStyle='rgba(0,0,0,.12)'; x.fillRect(0,h-10,w,10); });
  const wallGlow=tex(256,128,(x,w,h)=>{ x.fillStyle='#000'; x.fillRect(0,0,w,h); x.fillStyle='#ffcf7a'; for(let i=0;i<3;i++){ if(i!==1) x.fillRect(20+i*80,40,44,36); } });
  const glowTex=tex(128,128,(x,w,h)=>{ const g=x.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(0.2,'rgba(255,255,255,.55)'); g.addColorStop(1,'rgba(255,255,255,0)'); x.fillStyle=g; x.fillRect(0,0,w,h); });
  const cloudTex=tex(512,256,(x,w,h)=>{ for(let i=0;i<22;i++){ const cx=80+Math.random()*350, cy=110+Math.random()*70, r=35+Math.random()*70; const g=x.createRadialGradient(cx,cy,0,cx,cy,r); g.addColorStop(0,'rgba(255,255,255,.9)'); g.addColorStop(0.6,'rgba(250,252,255,.45)'); g.addColorStop(1,'rgba(255,255,255,0)'); x.fillStyle=g; x.fillRect(0,0,w,h); } });
  const FONT='"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif';
  const signTex=(w,h,draw)=>tex(w,h,draw);

  /* materials */
  const std=(o)=>new T.MeshStandardMaterial(Object.assign({roughness:0.9,metalness:0},o));
  const M={
    ground:std({map:groundTex}), grass:std({map:grassTex}), ballast:std({map:ballastTex}),
    rust:std({color:0x6e4b3b,roughness:0.85}), steel:std({color:0xe3e8ec,roughness:0.28,metalness:0.35}),
    sleeper:std({color:0xb5b3ac}), concrete:std({color:0xa29b90}), tile:std({map:tileTex}), tact:std({map:tactTex}),
    white:std({color:0xf2f1ea}), gray:std({color:0x8f8d87}), roof:std({color:0x56656c,roughness:0.55,metalness:0.3}),
    post:std({color:0x6f777c,roughness:0.6,metalness:0.3}), mast:std({color:0x8a9095,roughness:0.6,metalness:0.4}),
    road:std({map:roadTex}), asphalt:std({color:0x55595c}), water:std({color:0x7d9fa3,roughness:0.15,metalness:0.1}),
    trunk:std({color:0x8b7b64}), leaf:std({color:0xffffff,side:T.DoubleSide,roughness:0.8}), crown:std({color:0xffffff,flatShading:true}),
    wall:std({map:wallTex,emissiveMap:wallGlow,emissive:0x000000}), win:std({color:0x151a1c,roughness:0.3,emissive:0x000000}), lampStrip:std({color:0xdddddd,emissive:0x000000}), metalRoof:std({color:0xffffff,roughness:0.55,metalness:0.25}), dark:std({color:0x151a1c,roughness:0.5}),
    yellow:std({color:0xf0c21a}), black:std({color:0x161616}), building:std({color:0xece4d4}), tileRoof:std({color:0x7a3d2f,roughness:0.7}),
    wire:new T.LineBasicMaterial({color:0x2a3034}), pole:std({color:0x8c8a84}),
  };
  M.ground.map.repeat.set(GS/160,GS/160);

  /* geometry helpers */
  function ribbon(s0,s1,step,prof,mat,o){
    o=o||{}; const ns=Math.max(2,Math.ceil((s1-s0)/step)+1), np=prof.length, segs=o.closed?np:np-1;
    const pos=[],uv=[],idx=[]; let vi=0; const L=[0];
    for(let j=1;j<=segs;j++){ const a=prof[j-1], b=prof[j%np]; L.push(L[j-1]+Math.hypot(b[0]-a[0],b[1]-a[1])); }
    for(let j=0;j<segs;j++){
      const a=prof[j], b=prof[(j+1)%np], base=vi;
      for(let i=0;i<ns;i++){ const s=s0+(s1-s0)*i/(ns-1), f=fr(s);
        pos.push(f.x+f.rx*a[0],a[1],f.z+f.rz*a[0], f.x+f.rx*b[0],b[1],f.z+f.rz*b[0]);
        uv.push(L[j]*(o.u||1),s*(o.v||1), L[j+1]*(o.u||1),s*(o.v||1)); vi+=2; }
      for(let i=0;i<ns-1;i++){ const k=base+i*2; idx.push(k,k+2,k+1,k+1,k+2,k+3); }
    }
    if(o.caps){ for(const s of [s0,s1]){ const f=fr(s), base=vi; for(const p of prof){ pos.push(f.x+f.rx*p[0],p[1],f.z+f.rz*p[0]); uv.push(0,0); vi++; } for(let j=1;j<np-1;j++) idx.push(base,base+j,base+j+1); } }
    const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(pos,3)); g.setAttribute('uv',new T.Float32BufferAttribute(uv,2)); g.setIndex(idx); g.computeVertexNormals();
    if(!mat.side || mat.side===T.FrontSide){ mat.side=T.DoubleSide; }
    const m=new T.Mesh(g,mat); m.receiveShadow=o.receive!==false; m.castShadow=!!o.cast; scene.add(m); return m;
  }
  const dummy=new T.Object3D(), tmpC=new T.Color();
  function inst(geo,mat,list,o){
    o=o||{}; if(!list.length) return null;
    const m=new T.InstancedMesh(geo,mat,list.length);
    list.forEach((it,i)=>{ const f=fr(it.s); dummy.position.set(f.x+f.rx*it.lat,it.h||0,f.z+f.rz*it.lat); dummy.rotation.set(it.ax||0,-f.th+(it.ry||0),it.az||0);
      dummy.scale.set(it.sx||1,it.sy||1,it.sz||1); dummy.updateMatrix(); m.setMatrixAt(i,dummy.matrix); if(it.c!==undefined){ tmpC.set(it.c); m.setColorAt(i,tmpC); } });
    m.instanceMatrix.needsUpdate=true; if(m.instanceColor) m.instanceColor.needsUpdate=true;
    m.frustumCulled=false; m.castShadow=!!o.cast; m.receiveShadow=!!o.receive; scene.add(m); return m;
  }
  function mergeGeos(list){ let n=0; const parts=list.map(g=>{ const ng=g.index?g.toNonIndexed():g; n+=ng.attributes.position.count; return ng; });
    const pos=new Float32Array(n*3); let o=0; parts.forEach(g=>{ pos.set(g.attributes.position.array,o); o+=g.attributes.position.array.length; });
    const g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(pos,3)); g.computeVertexNormals(); return g; }
  function line(points){ const g=new T.BufferGeometry().setFromPoints(points); const l=new T.Line(g,M.wire); scene.add(l); return l; }
  function board(w,h,d,map,frame){ const side=frame||M.white; return new T.Mesh(new T.BoxGeometry(w,h,d),[side,side,side,side,new T.MeshStandardMaterial({map,roughness:0.6}),side]); }
  function postMesh(h,r,mat){ const m=new T.Mesh(new T.CylinderGeometry(r,r,h,8),mat||M.post); m.position.y=h/2; m.castShadow=true; return m; }

  /* sky dome with sun */
  const hex3=h=>new T.Vector3(((h>>16)&255)/255,((h>>8)&255)/255,(h&255)/255);
  const skyMat=new T.ShaderMaterial({ side:T.BackSide, depthWrite:false, fog:false,
    uniforms:{top:{value:hex3(0x4f8fcf)},mid:{value:hex3(0xa9cbe2)},hor:{value:hex3(HAZE)},sunDir:{value:SUNDIR},sunK:{value:new T.Vector3(1,0.93,0.78)}},
    vertexShader:'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz-cameraPosition; gl_Position=projectionMatrix*viewMatrix*w; gl_Position.z=gl_Position.w; }',
    fragmentShader:'uniform vec3 top; uniform vec3 mid; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 sunK; varying vec3 vW; void main(){ vec3 d=normalize(vW); float h=max(d.y,0.0); vec3 c=mix(hor,mid,smoothstep(0.0,0.18,h)); c=mix(c,top,smoothstep(0.12,0.75,h)); float s=max(dot(d,sunDir),0.0); c+=sunK*(pow(s,900.0)*1.6+pow(s,24.0)*0.18+pow(s,4.0)*0.06); gl_FragColor=vec4(pow(c,vec3(2.2)),1.0);\n#include <encodings_fragment>\n}'
  });
  const sky=new T.Mesh(new T.SphereGeometry(11000,32,16),skyMat); sky.renderOrder=-10; scene.add(sky);

  /* clouds */
  const clouds=[];
  for(let i=0;i<16;i++){ const sp=new T.Sprite(new T.SpriteMaterial({map:cloudTex,fog:false,depthWrite:false,transparent:true,opacity:0.85}));
    const a=rnd(500+i)*Math.PI*2, d=3500+rnd(510+i)*4500, mid=fr(END/2);
    sp.position.set(mid.x+Math.cos(a)*d, 700+rnd(520+i)*1300, mid.z+Math.sin(a)*d); const sc=1200+rnd(530+i)*1500; sp.scale.set(sc,sc*0.45,1); scene.add(sp); clouds.push(sp); }

  /* mountains: Central Range to the west (+X, right of the train), Coastal Range to the east (−X) */
  const mountMats=[];
  (function(){
    const mid={...fr(END/2)}; const segs=900, pos=[], col=[], idx=[]; const c=new T.Color(), hz=new T.Color(HAZE);
    const ridgeN=a=> (Math.sin(a*7+1.3)*0.5+0.5)*0.45 + (Math.sin(a*19+0.4)*0.5+0.5)*0.3 + (Math.sin(a*41+2.2)*0.5+0.5)*0.17 + Math.abs(Math.sin(a*97+0.9))*0.05;
    for(let i=0;i<=segs;i++){
      const a=i/segs*Math.PI*2, dx=Math.cos(a), dz=Math.sin(a), w=smooth(-0.25,0.55,dx), e=smooth(-0.25,0.55,-dx);
      const r=3600+3600*w-400*e, n=ridgeN(a);
      const h=w*(700+1100*n) + e*(260+520*ridgeN(a*1.7+3)) + (1-Math.min(1,w+e))*(140+200*n);
      const x=mid.x+dx*r, z=mid.z+dz*r;
      pos.push(x,-60,z, x,h*0.45,z, x,h,z);
      const base=w>e?0x8aa3b6:0x8ea79a; c.setHex(base).lerp(hz,0.35+0.25*(r-3200)/4000);
      const top=c.clone(); const midc=c.clone().lerp(hz,0.45);
      col.push(hz.r,hz.g,hz.b, midc.r,midc.g,midc.b, top.r,top.g,top.b);
      if(i<segs){ const k=i*3; idx.push(k,k+3,k+1, k+1,k+3,k+4, k+1,k+4,k+2, k+2,k+4,k+5); }
    }
    const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(pos,3)); g.setAttribute('color',new T.Float32BufferAttribute(col,3)); g.setIndex(idx);
    const mm=new T.MeshBasicMaterial({vertexColors:true,fog:false,side:T.DoubleSide}); mountMats.push(mm); scene.add(new T.Mesh(g,mm));
    // nearer foothills, partly fogged
    const p2=[], c2=[], i2=[]; const fh=new T.Color(0x5f8a55);
    for(let i=0;i<=segs;i++){ const a=i/segs*Math.PI*2, dx=Math.cos(a), dz=Math.sin(a), r=1900+500*Math.sin(a*5+1), h=60+170*ridgeN(a*2.3+5)*(0.6+0.4*smooth(-0.3,0.5,dx));
      const x=mid.x+dx*r, z=mid.z+dz*r; p2.push(x,-20,z, x,h,z); const t=fh.clone().lerp(hz,0.55); c2.push(hz.r,hz.g,hz.b, t.r,t.g,t.b);
      if(i<segs){ const k=i*2; i2.push(k,k+2,k+1,k+1,k+2,k+3); } }
    const g2=new T.BufferGeometry(); g2.setAttribute('position',new T.Float32BufferAttribute(p2,3)); g2.setAttribute('color',new T.Float32BufferAttribute(c2,3)); g2.setIndex(i2);
    const mm2=new T.MeshBasicMaterial({vertexColors:true,fog:false,side:T.DoubleSide}); mountMats.push(mm2); scene.add(new T.Mesh(g2,mm2));
  })();

  /* ground */
  { const mid=fr(END/2); const g=new T.PlaneGeometry(GS,GS); g.rotateX(-Math.PI/2); const m=new T.Mesh(g,M.ground); m.position.set(mid.x,0,mid.z); m.receiveShadow=true; scene.add(m); }
  const S0=PMIN+30, S1=PMAX-30;
  ribbon(S0,S1,2,[[-9,0.015],[-2.7,0.015]],M.grass,{u:0.25,v:0.25});
  ribbon(S0,S1,2,[[2.7,0.015],[9,0.015]],M.grass,{u:0.25,v:0.25});
  ribbon(S0,S1,2,[[5.6,0.03],[6.8,0.03]],M.water,{});
  ribbon(S0,S1,2,[[5.4,0.25],[5.6,0.03]],M.concrete,{}); ribbon(S0,S1,2,[[6.8,0.03],[7.0,0.25]],M.concrete,{});

  /* track */
  ribbon(S0,S1,1,[[-2.8,0.0],[-1.9,0.3],[1.9,0.3],[2.8,0.0]],M.ballast,{u:0.6,v:0.6});
  const sl=[]; for(let k=Math.ceil(S0/0.6); k*0.6<S1; k++){ const s=k*0.6; if(CROSSINGS.some(c=>Math.abs(c-s)<4.3)) continue; sl.push({s,lat:0,h:0.34,c:(rnd(k)>0.5?0xb8b6af:0xaba9a2)}); }
  inst(new T.BoxGeometry(2.0,0.13,0.24),std({color:0xffffff}),sl,{receive:true});
  for(const g of [-0.5335,0.5335]){
    ribbon(S0,S1,1,[[g-0.04,RT-0.012],[g+0.04,RT-0.012],[g+0.04,0.38],[g-0.04,0.38]],M.rust,{closed:true});
    ribbon(S0,S1,1,[[g-0.034,RT],[g+0.034,RT]],M.steel,{});
  }
  /* catenary */
  const masts=[], arms=[], feet=[];
  for(let s=Math.ceil(S0/50)*50; s<S1; s+=50){ if(CROSSINGS.some(c=>Math.abs(c-s)<8)) continue;
    masts.push({s,lat:3.05,h:3.9}); arms.push({s,lat:1.4,h:RT+6.25}); arms.push({s,lat:1.5,h:RT+6.95,az:0.18,sx:0.95}); feet.push({s,lat:3.05,h:0.2}); }
  inst(new T.BoxGeometry(0.3,7.8,0.3),M.mast,masts,{cast:true});
  inst(new T.BoxGeometry(3.4,0.08,0.08),M.mast,arms,{cast:true});
  inst(new T.BoxGeometry(0.8,0.4,0.8),M.concrete,feet,{receive:true});
  const wl=(lat,h,step)=>{ const pts=[]; for(let s=S0;s<=S1;s+=step){ const f=fr(s); pts.push(new T.Vector3(f.x+f.rx*lat,h,f.z+f.rz*lat)); } line(pts); };
  wl(0,RT+5.45,4); wl(0,RT+6.3,4); wl(3.3,RT+7.7,4);

  /* provincial highway on the east side, with utility poles */
  ribbon(S0,S1,4,[[-42,0.05],[-34,0.05]],M.road,{u:1/8,v:1/12});
  const poles=[], parms=[];
  for(let s=Math.ceil(S0/40)*40; s<S1; s+=40){ poles.push({s,lat:-44.5,h:5}); parms.push({s,lat:-44.5,h:9.3}); }
  inst(new T.CylinderGeometry(0.12,0.16,10,7),M.pole,poles,{cast:true});
  inst(new T.BoxGeometry(1.6,0.1,0.1),M.pole,parms,{cast:true});
  for(const lat of [-45.2,-43.8]){ const pts=[]; for(let s=S0;s<=S1;s+=5){ const f=fr(s), u=((s%40)+40)%40/40, sag=0.5*4*u*(1-u); pts.push(new T.Vector3(f.x+f.rx*lat,9.35-sag,f.z+f.rz*lat)); } line(pts); }

  /* scenery */
  const nearStn=p=>STATIONS.some(st=>p>st.pos-230 && p<st.pos+60);
  const palms=[], palmTops=[], trunks=[], crowns=[], houses=[], roofs=[];
  for(let c=Math.floor(S0/14); c*14<S1; c++){
    for(const sd of [-1,1]) for(const layer of [0,1]){
      const key=c*4+(sd>0?1:0)+layer*2; if(rnd(key)<(layer?0.55:0.3)) continue;
      const s=c*14+rnd(key*7+3)*14;
      const lat=sd*(layer? 70+rnd(key*13+5)*260 : 8+rnd(key*13+5)*60);
      if(lat>-50 && lat<-27) continue;
      if(sd<0 && nearStn(s) && lat>-36) continue;
      if(sd>0 && lat<9) continue;
      if(CROSSINGS.some(x=>Math.abs(x-s)<9) && Math.abs(lat)<100) continue;
      const t=rnd(key*29+11), r1=rnd(key*31+7);
      if(t<0.42){ const h=8+r1*5; palms.push({s,lat,h:0,sy:h}); palmTops.push({s,lat,h:h-0.1,ry:r1*6,sx:0.85+r1*0.3,sy:0.85+r1*0.3,sz:0.85+r1*0.3,c:[0x3f7d36,0x4c8a3c,0x5a9642][(r1*3)|0]}); }
      else if(t<0.85){ const sc=1.8+r1*1.6; trunks.push({s,lat,h:0,sy:2.4+r1}); crowns.push({s,lat,h:2.4+r1+sc*0.75,ry:r1*9,sx:sc*1.15,sy:sc,sz:sc*1.1,c:[0x4a8540,0x5b9550,0x3f7340,0x6a9a48][(r1*4)|0]}); }
      else { const w=7+r1*4, d=6+rnd(key+4)*3; houses.push({s,lat,h:0,sx:d,sy:3.3,sz:w,c:[0xf2ede2,0xe2dccd,0xf0e9d6,0xd8dfe0][(r1*4)|0]}); roofs.push({s,lat,h:3.3,sx:d+0.8,sy:1.4,sz:w+0.6,c:[0x3a7ea6,0x2f8784,0xb0533c,0x7d8a92][(rnd(key+5)*4)|0]}); }
    }
  }
  const trunkG=new T.CylinderGeometry(0.13,0.2,1,7); trunkG.translate(0,0.5,0);
  inst(trunkG,M.trunk,palms,{cast:true});
  const fronds=[]; for(let k=0;k<10;k++){ const g=new T.PlaneGeometry(1.0,3.8,2,7); const p=g.attributes.position; const droop=0.13+rnd(k+40)*0.06;
    for(let i=0;i<p.count;i++){ let x=p.getX(i); const t=p.getY(i)+1.9; x*=1-t/3.8*0.85; p.setXYZ(i,x,0.6*t-droop*t*t+Math.abs(x)*0.45,t); }
    g.rotateY(k/10*Math.PI*2+rnd(k+60)*0.3); fronds.push(g); }
  inst(mergeGeos(fronds),M.leaf,palmTops,{cast:true});
  const tTrunk=new T.CylinderGeometry(0.16,0.24,1,6); tTrunk.translate(0,0.5,0);
  inst(tTrunk,M.trunk,trunks,{cast:true});
  const crownG=new T.IcosahedronGeometry(1,1); { const p=crownG.attributes.position; for(let i=0;i<p.count;i++){ const v=new T.Vector3().fromBufferAttribute(p,i); const k=1+((Math.sin(v.x*7.1+v.y*3.3)+Math.cos(v.z*5.7))*0.09); p.setXYZ(i,v.x*k,v.y*k,v.z*k); } crownG.computeVertexNormals(); }
  inst(crownG,M.crown,crowns,{cast:true});
  const houseG=new T.BoxGeometry(1,1,1); houseG.translate(0,0.5,0);
  inst(houseG,M.wall,houses,{cast:true,receive:true});
  const roofG=new T.BufferGeometry(); { const v=[-0.5,0,-0.5, 0.5,0,-0.5, 0,1,-0.5, -0.5,0,0.5, 0.5,0,0.5, 0,1,0.5];
    const ix=[0,2,1, 3,4,5, 0,3,5, 0,5,2, 1,2,5, 1,5,4]; roofG.setAttribute('position',new T.Float32BufferAttribute(v,3)); roofG.setIndex(ix); const ng=roofG.toNonIndexed(); ng.computeVertexNormals(); roofG.copy(ng); }
  const roofMat=M.metalRoof.clone(); roofMat.side=T.DoubleSide;
  inst(roofG,roofMat,roofs,{cast:true});

  /* signs */
  const numTex=(txt,bg,fg,border)=>signTex(256,200,(x,w,h)=>{ x.fillStyle=border||bg; x.fillRect(0,0,w,h); x.fillStyle=bg; x.fillRect(14,14,w-28,h-28); x.fillStyle=fg; x.font='700 128px '+FONT; x.textAlign='center'; x.textBaseline='middle'; x.fillText(txt,w/2,h/2+8); });
  function signAt(s,lat,hBoard,w,h,map){ const g=new T.Group(); g.add(postMesh(hBoard,0.045)); const b=board(w,h,0.05,map); b.position.y=hBoard+h/2; b.castShadow=true; g.add(b); place(g,s,lat,0); scene.add(g); return g; }
  LIMITS.forEach(Lm=>{ if(Lm.s>0) signAt(Lm.s,-2.5,2.4,0.8,0.62,numTex(String(Lm.v),'#fbfbf6','#151515','#151515'));
    signAt(Lm.e,-2.5,2.4,0.62,0.62,signTex(128,128,(x,w,h)=>{ x.fillStyle='#fbfbf6'; x.fillRect(0,0,w,h); x.strokeStyle='#151515'; x.lineWidth=18; x.beginPath(); x.moveTo(0,h); x.lineTo(w,0); x.stroke(); x.lineWidth=8; x.strokeRect(4,4,w-8,h-8); })); });
  const whistle=signTex(128,128,(x,w,h)=>{ x.fillStyle='#fbfbf6'; x.fillRect(0,0,w,h); x.strokeStyle='#151515'; x.lineWidth=8; x.strokeRect(4,4,w-8,h-8); x.fillStyle='#151515'; x.font='700 88px '+FONT; x.textAlign='center'; x.textBaseline='middle'; x.fillText('鳴',w/2,h/2+6); });
  CROSSINGS.forEach(c=>signAt(c-300,-2.5,2.1,0.6,0.6,whistle));
  for(let s=100; s<END+700; s+=100){ const t=signTex(128,88,(x,w,h)=>{ x.fillStyle='#f6f6f0'; x.fillRect(0,0,w,h); x.fillStyle='#151515'; x.font='700 60px '+FONT; x.textAlign='center'; x.textBaseline='middle'; x.fillText((s/1000).toFixed(1),w/2,h/2+4); });
    signAt(s,2.3,0.55,0.42,0.29,t); }
  /* 坡度標：坡度改變處，右側，寫千分比與坡向 */
  GRADES.forEach((G,k)=>{ if(k===0 || G.s<0 || G.s>END+300 || GRADES[k-1].g===G.g) return;
    const t=signTex(160,120,(x,w,h)=>{ x.fillStyle='#f6f6f0'; x.fillRect(0,0,w,h); x.strokeStyle='#151515'; x.lineWidth=6; x.strokeRect(3,3,w-6,h-6);
      x.lineWidth=7; x.beginPath(); const y0=G.g>0?h*0.62:G.g<0?h*0.32:h*0.47, y1=G.g>0?h*0.32:G.g<0?h*0.62:h*0.47; x.moveTo(14,y0); x.lineTo(w-14,y1); x.stroke();
      x.fillStyle='#151515'; x.font='700 38px '+FONT; x.textAlign='center'; x.textBaseline='middle'; x.fillText(G.g===0?'L':Math.abs(G.g)+'‰',w/2,G.g>0?h*0.8:h*0.18+4); });
    signAt(G.s,2.6,1.2,0.6,0.45,t); });

  /* block signal No.32 */
  const sig={}; { const g=new T.Group(); g.add(postMesh(4.3,0.09,M.mast));
    const head=new T.Mesh(new T.BoxGeometry(0.52,1.45,0.34),M.dark); head.position.y=4.45; head.castShadow=true; g.add(head);
    const plate=board(0.38,0.38,0.04,numTex('32','#f4f4ee','#151515','#151515')); plate.position.y=3.45; g.add(plate);
    sig.lamps={}; sig.glows={};
    [['G',4.9,0x4dff9a],['Y',4.45,0xffd23a],['R',4.0,0xff3b2f]].forEach(([k,y,col])=>{
      const l=new T.Mesh(new T.SphereGeometry(0.13,16,10),new T.MeshBasicMaterial({color:0x2b2f30})); l.position.set(0,y,0.15); g.add(l);
      const hood=new T.Mesh(new T.CylinderGeometry(0.17,0.17,0.22,16,1,true,0,Math.PI),M.dark); hood.rotation.x=Math.PI/2; hood.rotation.y=Math.PI; hood.position.set(0,y+0.02,0.25); g.add(hood);
      const gl=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:col,blending:T.AdditiveBlending,depthWrite:false,transparent:true,fog:false})); gl.position.set(0,y,0.3); gl.scale.set(2.4,2.4,1); g.add(gl);
      sig.lamps[k]={m:l,col}; sig.glows[k]=gl; });
    place(g,SIGNAL_POS,-2.6,0); scene.add(g); }

  /* level crossings */
  const xings=[];
  const buckTex=tex(256,256,(x,w,h)=>{ x.translate(w/2,h/2); for(const a of [0.62,-0.62]){ x.save(); x.rotate(a); x.fillStyle='#151515'; x.fillRect(-120,-20,240,40); x.fillStyle='#f2c418'; x.fillRect(-114,-14,228,28); x.restore(); } });
  const armTex=tex(256,16,(x,w,h)=>{ for(let i=0;i<8;i++){ x.fillStyle=i%2?'#151515':'#f2c418'; x.fillRect(i*32,0,32,h); } });
  const armMat=new T.MeshStandardMaterial({map:armTex,roughness:0.6});
  CROSSINGS.forEach(c=>{
    ribbon(c-4,c+4,0.5,[[-160,0.06],[-2.8,0.06]],M.asphalt,{}); ribbon(c-4,c+4,0.5,[[2.8,0.06],[160,0.06]],M.asphalt,{});
    ribbon(c-4,c+4,0.5,[[-2.8,0.06],[-2.8,RT-0.015],[2.8,RT-0.015],[2.8,0.06]],M.gray,{closed:true,caps:true});
    ribbon(c-0.12,c+0.12,0.24,[[-160,0.07],[-7,0.07]],M.yellow,{}); ribbon(c-0.12,c+0.12,0.24,[[7,0.07],[160,0.07]],M.yellow,{});
    ribbon(c-4,c,0.5,[[-7.4,0.07],[-7,0.07]],M.white,{}); ribbon(c,c+4,0.5,[[7,0.07],[7.4,0.07]],M.white,{});
    const X={c,gates:[],lamps:[],ang:1.45,car:null};
    [[c-4.6,-3.5,1],[c+4.6,3.5,-1]].forEach(([s,lat,dir])=>{
      const g=new T.Group(); g.add(postMesh(3.5,0.07,M.white));
      const bk=new T.Mesh(new T.PlaneGeometry(1.3,1.3),new T.MeshStandardMaterial({map:buckTex,transparent:true,alphaTest:0.5,side:T.DoubleSide})); bk.position.y=3.15; g.add(bk);
      const lb=new T.Mesh(new T.BoxGeometry(0.9,0.12,0.12),M.black); lb.position.y=2.35; g.add(lb);
      [-0.32,0.32].forEach(dx=>{ const l=new T.Mesh(new T.SphereGeometry(0.13,14,10),new T.MeshBasicMaterial({color:0x4a1c18})); l.position.set(dx,2.35,0.1); g.add(l);
        const gl=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:0xff3a2a,blending:T.AdditiveBlending,depthWrite:false,transparent:true,fog:false})); gl.position.set(dx,2.35,0.2); gl.scale.set(1.6,1.6,1); g.add(gl); X.lamps.push({m:l,gl}); });
      place(g,s,lat,0); scene.add(g);
      const piv=new T.Group(); const arm=new T.Mesh(new T.BoxGeometry(8.6,0.13,0.13),armMat); arm.position.x=4.3; arm.castShadow=true; piv.add(arm);
      const f=fr(s); piv.position.set(f.x+f.rx*lat,1.05,f.z+f.rz*lat);
      const outer=new T.Group(); outer.position.copy(piv.position); piv.position.set(0,0,0); outer.add(piv);
      outer.rotation.y = dir>0 ? Math.PI/2-f.th : -Math.PI/2-f.th; scene.add(outer); X.gates.push(piv);
    });
    const car=new T.Group(); const body=new T.Mesh(new T.BoxGeometry(1.75,0.75,4.2),std({color:0xc23b2f,roughness:0.4,metalness:0.3})); body.position.y=0.6; body.castShadow=true;
    const cab=new T.Mesh(new T.BoxGeometry(1.55,0.6,2.2),std({color:0x22292d,roughness:0.2})); cab.position.set(0,1.25,0.2); car.add(body,cab);
    place(car,c-2,-11,0,-Math.PI/2); car.visible=false; scene.add(car); X.car=car;
    xings.push(X);
  });

  /* stations */
  const PAXC=[0xd24b3c,0x3d6fb6,0xf0c040,0x5a8f4e,0xe7e2d6,0x7a4f9a,0x2e2e33,0xe07aa0];
  const paxBody=new T.CylinderGeometry(0.2,0.23,0.7,10), paxLegs=new T.CylinderGeometry(0.17,0.14,0.85,8), paxHead=new T.SphereGeometry(0.12,12,8);
  const skin=std({color:0xe2b893}), hair=std({color:0x1d1b1a}), legsM=std({color:0x2b2d33});
  const stLights=[];
  const stations=STATIONS.map((st,i)=>{
    const a=st.pos-190, b=st.pos+25;
    ribbon(a,b,2,[[-1.75,0],[-1.75,PT],[-9,PT],[-9,0]],M.concrete,{closed:true,caps:true,cast:true});
    ribbon(a,b,2,[[-9,PT+0.004],[-2.45,PT+0.004]],M.tile,{u:0.5,v:0.5});
    ribbon(a,b,2,[[-2.45,PT+0.005],[-2.25,PT+0.005]],M.tact,{u:5,v:5});
    ribbon(a,b,2,[[-2.25,PT+0.004],[-1.88,PT+0.004]],M.gray,{});
    ribbon(a,b,2,[[-1.88,PT+0.006],[-1.75,PT+0.006]],M.white,{});
    ribbon(st.pos-170,st.pos-10,2,[[-8.7,PT+3.3],[-2.3,PT+3.5],[-2.3,PT+3.68],[-8.7,PT+3.5]],M.roof,{closed:true,caps:true,cast:true});
    const cp=[]; for(let s=st.pos-166; s<=st.pos-14; s+=12) cp.push({s,lat:-5.6,h:PT+1.7});
    inst(new T.CylinderGeometry(0.11,0.11,3.4,8),M.post,cp,{cast:true});
    ribbon(st.pos-166,st.pos-14,4,[[-4.2,PT+3.28],[-3.9,PT+3.3]],M.lampStrip,{receive:false});
    const pl=new T.PointLight(0xfff0d0,0,70,1.6); place(pl,st.pos-90,-4.5,PT+3.0); scene.add(pl); stLights.push(pl);
    // station building
    const bld=new T.Group();
    const bx=new T.Mesh(new T.BoxGeometry(9,5,24),M.building); bx.position.y=2.5; bx.castShadow=bx.receiveShadow=true; bld.add(bx);
    const rf=new T.Mesh(roofG,M.tileRoof); rf.scale.set(10.4,2.6,25.5); rf.position.y=5; rf.castShadow=true; bld.add(rf);
    for(let k=-2;k<=2;k++){ const wdw=new T.Mesh(new T.PlaneGeometry(1.6,1.6),M.win); wdw.rotation.y=Math.PI/2; wdw.position.set(4.52,2.6,k*4.4); bld.add(wdw); }
    const bsign=board(0.1,1.0,4.6,null); bsign.material[0]=new T.MeshStandardMaterial({map:signTex(512,112,(x,w,h)=>{ x.fillStyle='#1d3f6e'; x.fillRect(0,0,w,h); x.fillStyle='#fff'; x.font='700 76px '+FONT; x.textAlign='center'; x.textBaseline='middle'; x.fillText(st.name+'車站',w/2,h/2+4); }),roughness:0.6});
    bsign.material[0].map.center.set(0.5,0.5); bsign.position.set(4.56,4.1,0); bld.add(bsign);
    place(bld,st.pos-95,-17,0); scene.add(bld);
    // name board
    const prev=STATIONS[i-1], nxt=STATIONS[i+1];
    const nb=signTex(760,230,(x,w,h)=>{ x.fillStyle='#f5f4ef'; x.fillRect(0,0,w,h); x.fillStyle='#1d3f6e'; x.fillRect(0,h-62,w,62);
      x.fillStyle='#141414'; x.textAlign='center'; x.textBaseline='middle'; x.font='700 104px '+FONT; x.fillText(st.name,w/2,70); x.font='500 30px '+FONT; x.fillStyle='#3a3a3a'; x.fillText(st.en,w/2,138);
      x.fillStyle='#fff'; x.font='500 32px '+FONT; if(prev){ x.textAlign='left'; x.fillText('◀ '+prev.name,22,h-31); } if(nxt){ x.textAlign='right'; x.fillText(nxt.name+' ▶',w-22,h-31); } });
    const ng=new T.Group(); [-1.5,1.5].forEach(dx=>{ const p=postMesh(1.0,0.05); p.position.x=dx; ng.add(p); }); const nbm=board(3.8,1.15,0.06,nb); nbm.position.y=1.0+0.575; nbm.castShadow=true; ng.add(nbm);
    place(ng,st.pos-80,-4.6,PT); scene.add(ng);
    // stop position marker "4"
    const sm=new T.Group(); sm.add(postMesh(1.3,0.035,M.white)); const smb=board(0.55,0.55,0.04,numTex('4','#1f5fbf','#ffffff','#ffffff')); smb.position.y=1.3+0.275; sm.add(smb);
    place(sm,st.pos,-2.05,PT); scene.add(sm);
    ribbon(st.pos-0.07,st.pos+0.07,0.14,[[-2.25,PT+0.008],[-1.75,PT+0.008]],M.white,{});
    // passengers
    const pax=[];
    if(i>0) for(let j=0;j<9;j++){
      const g=new T.Group(); const col=std({color:PAXC[(rnd(i*7+j*3)*PAXC.length)|0],roughness:0.8});
      const lg=new T.Mesh(paxLegs,legsM); lg.position.y=0.42; const bd=new T.Mesh(paxBody,col); bd.position.y=1.2; const hd=new T.Mesh(paxHead,skin); hd.position.y=1.68; const hr=new T.Mesh(paxHead,hair); hr.position.set(0,1.73,-0.02); hr.scale.set(1.05,0.8,1.05);
      [lg,bd,hd,hr].forEach(m=>{ m.castShadow=true; g.add(m); });
      const p={g,s:st.pos-150+rnd(i*31+j)*135,lat:-3.1-rnd(i*17+j)*3.4,face:(rnd(i*5+j)-0.5)*1.5+Math.PI/2};
      place(g,p.s,p.lat,PT,p.face); scene.add(g); pax.push(p);
    }
    return {pax};
  });

  /* traffic on the highway */
  const cars=[]; const carCols=[0xf2f2f2,0x2c3e50,0xb33a2f,0x8a9aa6,0xe0b03a,0x355f4a];
  for(let i=0;i<10;i++){ const g=new T.Group(); const col=carCols[i%carCols.length];
    const big=i%4===0; const body=new T.Mesh(new T.BoxGeometry(1.8,big?2.2:0.8,big?7.5:4.3),std({color:col,roughness:0.35,metalness:0.3})); body.position.y=big?1.5:0.62; body.castShadow=true; g.add(body);
    if(!big){ const cb=new T.Mesh(new T.BoxGeometry(1.6,0.6,2.2),std({color:0x1f272b,roughness:0.15})); cb.position.set(0,1.3,0.1); g.add(cb); }
    scene.add(g); const dir=i%2?1:-1; cars.push({g,s:rnd(700+i)*END,v:(14+rnd(710+i)*8)*dir,lat:dir>0?-36:-40}); }

  /* 頭燈（夜間） */
  const head=new T.SpotLight(0xfff4e0,0,260,0.3,0.55,1.2); scene.add(head); scene.add(head.target);
  /* 星空 */
  const starG=new T.BufferGeometry(), sp=[]; for(let i=0;i<900;i++){ const a=rnd(9000+i)*Math.PI*2, e=Math.asin(0.08+rnd(9100+i)*0.92); sp.push(Math.cos(a)*Math.cos(e)*9000, Math.sin(e)*9000, Math.sin(a)*Math.cos(e)*9000); }
  starG.setAttribute('position',new T.Float32BufferAttribute(sp,3));
  const stars=new T.Points(starG,new T.PointsMaterial({color:0xdfe8ff,size:2,sizeAttenuation:false,fog:false,transparent:true,opacity:0.85,depthWrite:false})); stars.visible=false; stars.renderOrder=-9; scene.add(stars);
  /* 雨絲：跟著攝影機的線段 */
  const RN=1400, rainPos=new Float32Array(RN*6), rainSeed=new Float32Array(RN*3);
  for(let i=0;i<RN;i++){ rainSeed[i*3]=(Math.random()-0.5)*36; rainSeed[i*3+1]=Math.random()*22-8; rainSeed[i*3+2]=-2-Math.random()*48; }
  const rainG=new T.BufferGeometry(); rainG.setAttribute('position',new T.BufferAttribute(rainPos,3));
  const rain=new T.LineSegments(rainG,new T.LineBasicMaterial({color:0xc4ccd2,transparent:true,opacity:0.35,fog:false,depthWrite:false})); rain.frustumCulled=false; rain.visible=false;
  cam.add(rain); scene.add(cam);
  const makeRT=(w,h)=>{ const r=new T.WebGLRenderTarget(w,h,{minFilter:T.NearestFilter,magFilter:T.NearestFilter,depthBuffer:true}); r.depthTexture=new T.DepthTexture(w,h); r.depthTexture.type=T.UnsignedIntType; return r; };
  const rt=makeRT(4,4);
  const blitMat=new T.ShaderMaterial({depthTest:false,depthWrite:false,
    uniforms:{tDiffuse:{value:rt.texture},res:{value:new T.Vector2(4,4)},levels:{value:7}},
    vertexShader:'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
    fragmentShader:`uniform sampler2D tDiffuse; uniform vec2 res; uniform float levels; varying vec2 vUv;
      float b2(vec2 a){ a=floor(a); return fract(a.x/2.0+a.y*a.y*0.75); }
      float b4(vec2 a){ return b2(0.5*a)*0.25+b2(a); }
      vec3 toS(vec3 c){ return mix(c*12.92,1.055*pow(c,vec3(1.0/2.4))-0.055,step(0.0031308,c)); }
      void main(){ vec3 c=toS(clamp(texture2D(tDiffuse,vUv).rgb,0.0,1.0));
        float l=dot(c,vec3(0.299,0.587,0.114)); c=mix(vec3(l),c,1.18);
        float d=b4(floor(vUv*res))-0.5;
        c=floor(clamp(c,0.0,1.0)*levels+0.5+d*0.85)/levels;
        gl_FragColor=vec4(clamp(c,0.0,1.0),1.0); }`});
  const blitScene=new T.Scene(), blitCam=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const bq=new T.Mesh(new T.PlaneGeometry(2,2),blitMat); bq.frustumCulled=false; blitScene.add(bq);
  R3={renderer,scene,cam,sun,sky,SUNDIR,sig,xings,stations,cars,rt,blitMat,blitScene,blitCam,makeRT,
    hemi,skyMat,clouds,mountMats,M,head,stars,rain,rainSeed,stLights};
  applyEnv(); resize();
}

/* ---------- 天氣與時段 ---------- */
const LOOKS={
  morning:{top:0x4f8fcf,mid:0xa9cbe2,hor:0xd9e5e6,sunK:[1,0.93,0.78],sunDir:[-0.72,0.55,-0.25],sunC:0xfff0d8,sunI:1.35,hs:0xdce9f4,hg:0x56653a,hI:0.78,fog:[0xd9e5e6,140,2300],mt:0xffffff,mtO:1,cl:0xffffff,clO:0.85,head:0,lamps:0,stars:false,rain:false},
  dusk:   {top:0x3a5a8c,mid:0xc9a27a,hor:0xf1c48e,sunK:[1.3,0.75,0.4],sunDir:[0.86,0.12,-0.35],sunC:0xffc58a,sunI:1.0,hs:0xc9cdd6,hg:0x4a4436,hI:0.62,fog:[0xc4ab95,260,2800],mt:0xa89ca8,mtO:1,cl:0xffc9a0,clO:0.8,head:0.6,lamps:0.4,stars:false,rain:false},
  night:  {top:0x040914,mid:0x0b152a,hor:0x18243a,sunK:[0.5,0.55,0.7],sunDir:[0.35,0.55,-0.5],sunC:0x7f95d8,sunI:0.14,hs:0x2c3d5c,hg:0x0c0c0c,hI:0.2,fog:[0x101928,50,850],mt:0x1a2335,mtO:1,cl:0x1d2638,clO:0.4,head:2.6,lamps:1.6,stars:true,rain:false},
  rain:   {top:0x6d7780,mid:0x8c959c,hor:0xa9b2b8,sunK:[0,0,0],sunDir:[-0.5,0.8,-0.2],sunC:0xdfe6ec,sunI:0.32,hs:0xc8d0d8,hg:0x4a5040,hI:0.9,fog:[0xa3acb2,30,650],mt:0x9aa4aa,mtO:0.25,cl:0x8d949a,clO:1,head:0.8,lamps:0.3,stars:false,rain:true},
};
function setEnv(key){
  ENV=ENVS[key]||ENVS.morning; BASE_CLOCK=ENV.clock; try{ localStorage.setItem('cabEnv',JSON.stringify(ENV.key)); }catch(e){}
  applyEnv(); drawFrame();
}
function applyEnv(){
  if(!R3) return;
  const L=LOOKS[ENV.key], T=THREE, u=R3.skyMat.uniforms, v3=h=>new T.Vector3(((h>>16)&255)/255,((h>>8)&255)/255,(h&255)/255);
  u.top.value=v3(L.top); u.mid.value=v3(L.mid); u.hor.value=v3(L.hor); u.sunK.value.set(...L.sunK);
  R3.SUNDIR.set(...L.sunDir).normalize();
  R3.sun.color.setHex(L.sunC); R3.sun.intensity=L.sunI; R3.sun.castShadow=L.sunI>0.5;
  R3.hemi.color.setHex(L.hs); R3.hemi.groundColor.setHex(L.hg); R3.hemi.intensity=L.hI;
  R3.scene.fog.color.setHex(L.fog[0]); R3.scene.fog.near=L.fog[1]; R3.scene.fog.far=L.fog[2];
  R3.mountMats.forEach(m=>{ m.color.setHex(L.mt); m.transparent=L.mtO<1; m.opacity=L.mtO; m.needsUpdate=true; });
  R3.clouds.forEach(c=>{ c.material.color.setHex(L.cl); c.material.opacity=L.clO; });
  R3.head.intensity=L.head; R3.stars.visible=L.stars; R3.rain.visible=L.rain;
  R3.stLights.forEach(l=>l.intensity=L.lamps);
  const glow=L.lamps>0.5;
  R3.M.lampStrip.emissive.setHex(L.lamps>0?0xfff3d6:0); R3.M.lampStrip.emissiveIntensity=Math.min(1,L.lamps);
  R3.M.win.emissive.setHex(glow?0xffc873:0); R3.M.wall.emissive.setHex(glow?0xffffff:0);
  R3.M.steel.roughness = L.rain?0.12:0.28; R3.M.ballast.color.setHex(L.rain?0x9a958c:0xffffff);
  document.body.dataset.env=ENV.key;
}
try{ const k=JSON.parse(localStorage.getItem('cabEnv')); if(ENVS[k]){ ENV=ENVS[k]; BASE_CLOCK=ENV.clock; } }catch(e){}

/* ---------- 擋風玻璃雨滴與雨刷 ---------- */
const DROPS=[]; const WIPE={ph:0, a:[Math.PI,Math.PI]};
function wiperAngle(ph){ const k=(1-Math.cos(ph))/2; return Math.PI-k*(Math.PI-0.25); }
function drawRain(dt){
  if(!ENV.rain) return;
  const glassH=H*0.915;
  const rate=(30+S.v*4)*dt*(W/900);
  for(let n=rate+Math.random(); n>=1; n--) DROPS.push({x:W*0.03+Math.random()*W*0.94, y:Math.random()*glassH, r:(1.2+Math.random()*3)*Math.max(1,W/900), vy:0});
  WIPE.ph+=dt*(Math.PI*2/2.6);
  const piv=[[W*0.27,glassH],[W*0.69,glassH]], len=Math.min(W*0.4,H*0.9);
  const a1=wiperAngle(WIPE.ph);
  for(let i=DROPS.length-1;i>=0;i--){ const d=DROPS[i];
    if(d.r>3.4*Math.max(1,W/900)){ d.vy+=dt*25; d.y+=d.vy*dt; } d.x-= S.v*0.02*(d.x-W/2)/W*dt*60*0.15;
    let gone=d.y>glassH;
    for(let k=0;k<2 && !gone;k++){ const dx=d.x-piv[k][0], dy=piv[k][1]-d.y; if(Math.hypot(dx,dy)<len){ const ad=Math.atan2(dy,dx), lo=Math.min(WIPE.a[k],a1), hi=Math.max(WIPE.a[k],a1); if(ad>=lo-0.03 && ad<=hi+0.03) gone=true; } }
    if(gone) DROPS.splice(i,1);
  }
  WIPE.a=[a1,a1];
  if(DROPS.length>900) DROPS.splice(0,DROPS.length-900);
  fctx.save();
  for(const d of DROPS){ fctx.fillStyle='rgba(40,52,60,0.32)'; fctx.beginPath(); fctx.arc(d.x,d.y+d.r*0.25,d.r,0,7); fctx.fill(); fctx.fillStyle='rgba(225,235,240,0.42)'; fctx.beginPath(); fctx.arc(d.x,d.y,d.r*0.85,0,7); fctx.fill();
    fctx.fillStyle='rgba(255,255,255,0.45)'; fctx.beginPath(); fctx.arc(d.x-d.r*0.3,d.y-d.r*0.3,d.r*0.35,0,7); fctx.fill(); }
  fctx.strokeStyle='#0d1215'; fctx.lineCap='round';
  for(const [px,py] of piv){ fctx.lineWidth=Math.max(3,W*0.006); fctx.beginPath(); fctx.moveTo(px,py); fctx.lineTo(px+Math.cos(a1)*len,py-Math.sin(a1)*len); fctx.stroke(); }
  fctx.restore();
}

function render(dt){
  if(!R3){ return; }
  const {renderer,scene,cam,sun,sky,SUNDIR,sig,xings,stations,cars}=R3;
  const f=fr(S.pos), th=f.th, dx=f.dx, dz=f.dz, cx=f.x+f.rx*CAMX, cz=f.z+f.rz*CAMX;
  const vibA=Math.min(1,S.v/18), bob=S.v>0.3?(Math.sin(S.t*31)*0.006+Math.sin(S.t*9.7)*0.012)*vibA:0;
  let jolt=0; for(const o of [0,2.1]){ const d=((S.pos-o)%25+25)%25; if(d<0.35) jolt+=(1-d/0.35)*0.012*vibA; }
  const cy=RT+CAMH+bob-jolt;
  cam.position.set(cx,cy,cz);
  cam.lookAt(cx+dx*20,cy-1.05,cz+dz*20);
  cam.rotateZ((Math.sin(S.t*1.7)*0.002+Math.sin(S.t*0.6)*0.0015)*vibA - kAt(S.pos)*S.v*S.v*0.002);
  sky.position.copy(cam.position); R3.stars.position.copy(cam.position);
  if(R3.head.intensity>0){ R3.head.position.set(f.x+dx*1.2,RT+1.4,f.z+dz*1.2); const g=fr(S.pos+90); R3.head.target.position.set(g.x,0.3,g.z); R3.head.target.updateMatrixWorld(); }
  if(R3.rain.visible){ const P=R3.rain.geometry.attributes.position.array, Sd=R3.rainSeed, fall=13*dt, rush=S.v*dt;
    for(let i=0;i<Sd.length/3;i++){ let y=Sd[i*3+1]-fall, z=Sd[i*3+2]+rush; if(y<-8||z>-1.5){ y=14; z=-6-Math.random()*44; Sd[i*3]=(Math.random()-0.5)*36; } Sd[i*3+1]=y; Sd[i*3+2]=z;
      const x=Sd[i*3], k=i*6; P[k]=x; P[k+1]=y; P[k+2]=z; P[k+3]=x; P[k+4]=y+0.55; P[k+5]=z-0.06-S.v*0.03; }
    R3.rain.geometry.attributes.position.needsUpdate=true; }
  if(ENV.rain){ drawFrame(); drawRain(dt); } else if(DROPS.length){ DROPS.length=0; drawFrame(); }
  sun.target.position.set(cx+dx*35,0,cz+dz*35); sun.position.copy(sun.target.position).addScaledVector(SUNDIR,200); sun.target.updateMatrixWorld();

  ['G','Y','R'].forEach(k=>{ const on=S.sig.aspect===k; sig.lamps[k].m.material.color.setHex(on?sig.lamps[k].col:0x2b2f30); sig.glows[k].visible=on; });

  const blink=Math.floor(S.t*2.6)%2;
  xings.forEach(X=>{
    const active=S.pos>X.c-450 && S.pos<X.c+TRAIN_LEN+5;
    const target=active?0:1.45; X.ang+=(target-X.ang)*Math.min(1,dt*1.6);
    X.gates.forEach(p=>{ p.rotation.z=X.ang; });
    X.lamps.forEach((L,k)=>{ const on=active && (k%2)===blink; L.m.material.color.setHex(on?0xff3a2a:0x4a1c18); L.gl.visible=on; });
    X.car.visible=active;
  });

  stations.forEach((st,i)=>{
    const bt=S.boarded[i];
    st.pax.forEach((p,j)=>{
      if(bt===undefined){ p.g.visible=true; place(p.g,p.s,p.lat,PT,p.face); return; }
      const el=S.t-bt-j*0.55;
      if(el<0){ p.g.visible=true; place(p.g,p.s,p.lat,PT,p.face); }
      else if(el<1.5){ const k=el/1.5; p.g.visible=true; place(p.g,p.s,p.lat+(-1.9-p.lat)*k,PT,Math.PI/2); p.g.position.y=PT+Math.abs(Math.sin(el*9))*0.04; }
      else p.g.visible=false;
    });
  });

  cars.forEach(c=>{ c.s+=c.v*dt; if(c.s>END+800) c.s=-400; if(c.s<-400) c.s=END+800; place(c.g,c.s,c.lat,0,c.v>0?0:Math.PI); });

  if(MODE==='hq'){ renderer.setRenderTarget(null); renderer.render(scene,cam); }
  else { R3.blitMat.uniforms.levels.value = MODE==='chunky'?5:7; renderer.setRenderTarget(R3.rt); renderer.render(scene,cam); renderer.setRenderTarget(null); renderer.render(R3.blitScene,R3.blitCam); }
}

