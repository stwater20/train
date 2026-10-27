/* render3d.js — three.js 3D 場景：軌道、景物、車站、號誌、平交道與駕駛室視角 */
'use strict';

/* ---------- 3D cab view (three.js) ---------- */
const cv=document.getElementById('view'), fx=document.getElementById('fx'), fctx=fx.getContext('2d');
const RT=0.52, PT=RT+1.15, CAMX=-0.55, CAMH=2.9;
let W=0,H=0, R3=null;

/* track centreline integrated from curvature: s → (x,z,heading) */
const PMIN=-700, PMAX=END+1000, PN=PMAX-PMIN+1;
const PXa=new Float64Array(PN), PZa=new Float64Array(PN), PTa=new Float64Array(PN), PYa=new Float64Array(PN);
const AL = ROUTE.key==='alishan', JP = !!ROUTE.japan, TS = ROUTE.key==='tamsui', PL = ROUTE.platLen||215;
const signName = st => JP ? st.ja : st.name;
/* 會車用的側線：在右側 4.2 m，兩端 45 m 漸漸併回主線 */
const LOOP_LAT=4.2;
function loopLat(s){ for(const L of (ROUTE.loops||[])){ if(s>L.s && s<L.e) return LOOP_LAT*smooth(L.s,L.s+45,s)*(1-smooth(L.e-45,L.e,s)); } return ROUTE.double?LOOP_LAT:0; }
const inLoop=(s,pad)=> ROUTE.double || (ROUTE.loops||[]).some(L=>s>L.s-(pad||0) && s<L.e+(pad||0));
/* 阿里山線地形：左側是往上的山壁，右側是往下的山谷；車站一帶整平 */
function terrainH(s,lat){
  let d=1e9; for(const st of STATIONS){ const a=st.pos-260, b=st.pos+90; d=Math.min(d, s<a?a-s : s>b?s-b : 0); }
  const fl=3.2+21*(1-smooth(0,90,d));
  if(lat<-fl){ const x=-lat-fl, n=Math.min(1,x/40); return Math.min(220, x*0.4 + n*(Math.sin(s*0.021)*3+Math.sin(lat*0.09+s*0.007)*5)); }
  const r0=inLoop(s,60)?8.5:3.6;
  if(lat>r0){ const x=lat-r0, n=Math.min(1,x/40); return -Math.min(190, x*0.78) + n*Math.sin(s*0.017+lat*0.05)*4; }
  return 0;
}
(function(){
  const i0=-PMIN;
  for(let i=i0+1;i<PN;i++){ const s=i+PMIN; PTa[i]=PTa[i-1]+kAt(s-0.5); const m=(PTa[i]+PTa[i-1])/2; PXa[i]=PXa[i-1]+Math.sin(m); PZa[i]=PZa[i-1]-Math.cos(m); }
  for(let i=i0-1;i>=0;i--){ PTa[i]=PTa[i+1]; PXa[i]=PXa[i+1]-Math.sin(PTa[i]); PZa[i]=PZa[i+1]+Math.cos(PTa[i]); }
  for(let i=0;i<PN;i++) PYa[i]=visElev(i+PMIN);
})();
const FR={x:0,y:0,z:0,th:0,dx:0,dz:-1,rx:1,rz:0};
function fr(s){ const u=clamp(s-PMIN,0,PN-1.0001), i=Math.floor(u), t=u-i;
  FR.x=PXa[i]+(PXa[i+1]-PXa[i])*t; FR.y=PYa[i]+(PYa[i+1]-PYa[i])*t; FR.z=PZa[i]+(PZa[i+1]-PZa[i])*t; FR.th=PTa[i]+(PTa[i+1]-PTa[i])*t;
  FR.dx=Math.sin(FR.th); FR.dz=-Math.cos(FR.th); FR.rx=Math.cos(FR.th); FR.rz=Math.sin(FR.th); return FR; }

function place(obj,s,lat,h,ry){ const f=fr(s); obj.position.set(f.x+f.rx*lat,h+f.y+(AL?terrainH(s,lat):0),f.z+f.rz*lat); obj.rotation.set(0,-f.th+(ry||0),0); return obj; }
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
  fctx.fillStyle=TRAIN.frame||'#0d1215';
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
  if(!window.THREE){ toast(L('3D 引擎載入失敗，請重新整理頁面','3D engine failed to load, please reload','3Dエンジンを読み込めません。再読み込みしてください'),'bad'); return; }
  const T=THREE;
  if(T.ColorManagement) T.ColorManagement.legacyMode=false;
  let renderer;
  try{ renderer=new T.WebGLRenderer({canvas:cv, antialias:true, powerPreference:'high-performance'}); }
  catch(e){ toast(L('這個瀏覽器無法啟用 3D 畫面','This browser cannot show 3D','このブラウザでは3D表示ができません'),'bad'); return; }
  renderer.outputEncoding=T.sRGBEncoding;
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping; renderer.toneMappingExposure=1.12;
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
  if(TS){ M.roof.color.setHex(0xe9ecef); M.building.color.setHex(0xdfe3e6); M.tileRoof.color.setHex(0x8a9298); }
  if(AL){ M.building.color.setHex(0x8a5f3c); M.tileRoof.color.setHex(0x3e4a44); M.roof.color.setHex(0x4a3a2c); M.concrete.color.setHex(0x8f8a80); }

  /* geometry helpers */
  function ribbon(s0,s1,step,prof,mat,o){
    o=o||{}; const ns=Math.max(2,Math.ceil((s1-s0)/step)+1), np=prof.length, segs=o.closed?np:np-1;
    const pos=[],uv=[],idx=[]; let vi=0; const L=[0];
    for(let j=1;j<=segs;j++){ const a=prof[j-1], b=prof[j%np]; L.push(L[j-1]+Math.hypot(b[0]-a[0],b[1]-a[1])); }
    for(let j=0;j<segs;j++){
      const a=prof[j], b=prof[(j+1)%np], base=vi;
      for(let i=0;i<ns;i++){ const s=s0+(s1-s0)*i/(ns-1), f=fr(s);
        pos.push(f.x+f.rx*a[0],a[1]+f.y,f.z+f.rz*a[0], f.x+f.rx*b[0],b[1]+f.y,f.z+f.rz*b[0]);
        uv.push(L[j]*(o.u||1),s*(o.v||1), L[j+1]*(o.u||1),s*(o.v||1)); vi+=2; }
      for(let i=0;i<ns-1;i++){ const k=base+i*2; idx.push(k,k+2,k+1,k+1,k+2,k+3); }
    }
    if(o.caps){ for(const s of [s0,s1]){ const f=fr(s), base=vi; for(const p of prof){ pos.push(f.x+f.rx*p[0],p[1]+f.y,f.z+f.rz*p[0]); uv.push(0,0); vi++; } for(let j=1;j<np-1;j++) idx.push(base,base+j,base+j+1); } }
    const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(pos,3)); g.setAttribute('uv',new T.Float32BufferAttribute(uv,2)); g.setIndex(idx); g.computeVertexNormals();
    if(!mat.side || mat.side===T.FrontSide){ mat.side=T.DoubleSide; }
    const m=new T.Mesh(g,mat); m.receiveShadow=o.receive!==false; m.castShadow=!!o.cast; scene.add(m); return m;
  }
  const dummy=new T.Object3D(), tmpC=new T.Color();
  function inst(geo,mat,list,o){
    o=o||{}; if(!list.length) return null;
    const m=new T.InstancedMesh(geo,mat,list.length);
    list.forEach((it,i)=>{ const f=fr(it.s); dummy.position.set(f.x+f.rx*it.lat,(it.h||0)+f.y+(AL&&it.terr?terrainH(it.s,it.lat):0),f.z+f.rz*it.lat); dummy.rotation.set(it.ax||0,-f.th+(it.ry||0),it.az||0);
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

  /* ---------- 江之電沿線：相模灣、海灘、134 號國道、日式民宅、電線桿、路面併用軌道、富士山與江之島 ---------- */
  function buildJapan(){
    const S0=PMIN+30, S1=PMAX-30, mid={...fr(END/2)}, st=ROUTE.street;
    // 海：一大片海面，陸地蓋在上面
    const waveTex=tex(256,256,(x,w,h)=>{ x.fillStyle='#3f7fa6'; x.fillRect(0,0,w,h); speck(x,w,h,2600,['#5592b8','#3a7398','#6aa3c4','#2f6a8f'],2,6); x.strokeStyle='rgba(255,255,255,.18)'; x.lineWidth=2; for(let i=0;i<14;i++){ const y=Math.random()*h; x.beginPath(); x.moveTo(0,y); x.bezierCurveTo(w*0.3,y-6,w*0.6,y+6,w,y); x.stroke(); } },true);
    waveTex.repeat.set(160,160); const seaM=std({map:waveTex,roughness:0.25,metalness:0.15}); M.sea=seaM;
    const seaMesh=new T.Mesh(new T.PlaneGeometry(26000,26000),seaM); seaMesh.rotation.x=-Math.PI/2; seaMesh.position.set(mid.x,-0.35,mid.z); seaMesh.receiveShadow=true; scene.add(seaMesh);
    // 陸地：右側（北）一路延伸，遠處是鎌倉的丘陵
    const landTex=tex(256,256,(x,w,h)=>{ x.fillStyle='#7d9a62'; x.fillRect(0,0,w,h); speck(x,w,h,4000,['#6f8d55','#8aa66c','#9a9a86','#7a8a68'],1,4); },true);
    const landM=std({map:landTex}); landM.side=T.DoubleSide;
    const hill=(lat)=> lat>260 ? Math.min(140,(lat-260)*0.22) : 0;
    const mesh=(lats,hfn,mat,uvk)=>{ const step=4, ns=Math.ceil((S1-S0)/step)+1, nl=lats.length, pos=[], uv=[], idx=[];
      for(let i=0;i<ns;i++){ const sv=S0+i*step; let km=0; for(let q=-200;q<=200;q+=10) km=Math.max(km,Math.abs(kAt(sv+q)));
        const lim=km>0.0005?0.8/km:1e9, kin=kAt(sv)+kAt(sv-60)+kAt(sv+60), f=fr(sv);
        for(let j=0;j<nl;j++){ let Lt=lats[j]; if((kin>0&&Lt>0)||(kin<0&&Lt<0)) Lt=Math.sign(Lt)*Math.min(Math.abs(Lt),lim); pos.push(f.x+f.rx*Lt, f.y+hfn(Lt), f.z+f.rz*Lt); uv.push(Lt*(uvk||0.08), sv*(uvk||0.08)); } }
      for(let i=0;i<ns-1;i++) for(let j=0;j<nl-1;j++){ const k=i*nl+j; idx.push(k,k+nl,k+1, k+1,k+nl,k+nl+1); }
      const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(pos,3)); g.setAttribute('uv',new T.Float32BufferAttribute(uv,2)); g.setIndex(idx); g.computeVertexNormals();
      const m=new T.Mesh(g,mat); m.receiveShadow=true; scene.add(m); return m; };
    mesh([-13,-6,-2.6,2.6,6,12,20,40,80,160,260,400,700,1100],L=>hill(L)+0.01,landM);
    // 134 號國道、海堤、沙灘
    ribbon(S0,S1,4,[[-22.5,0.03],[-13.5,0.03]],M.road,{u:1/9,v:1/12});
    ribbon(S0,S1,4,[[-24.5,0.9],[-22.5,0.9]],M.concrete,{}); ribbon(S0,S1,4,[[-24.5,-0.2],[-24.5,0.9]],M.concrete,{});
    const sandTex=tex(256,256,(x,w,h)=>{ x.fillStyle='#d9c7a0'; x.fillRect(0,0,w,h); speck(x,w,h,3000,['#cdb98f','#e6d6b2','#bfa97d'],1,3); },true);
    ribbon(S0,S1,4,[[-62,-0.6],[-24.5,-0.15]],std({map:sandTex}),{u:0.1,v:0.1});
    // 浪花
    ribbon(S0,S1,4,[[-52,-0.32],[-49,-0.32]],new T.MeshBasicMaterial({color:0xf4f8fa,transparent:true,opacity:0.7}),{});
    // 電線桿與電線（右側）
    const jp=[], ja=[]; for(let s=Math.ceil(S0/32)*32; s<S1; s+=32){ if(CROSSINGS.some(c=>Math.abs(c-s)<8)) continue; jp.push({s,lat:7.5,h:4.5}); ja.push({s,lat:7.5,h:8.4}); }
    inst(new T.CylinderGeometry(0.13,0.17,9,7),M.pole,jp,{cast:true}); inst(new T.BoxGeometry(1.4,0.1,0.1),M.pole,ja,{cast:true});
    for(const lat of [6.9,8.1]){ const pts=[]; for(let s=S0;s<=S1;s+=4){ const f=fr(s), u=((s%32)+32)%32/32, sag=0.45*4*u*(1-u); pts.push(new T.Vector3(f.x+f.rx*lat,8.45-sag+f.y,f.z+f.rz*lat)); } line(pts); }
    // 日式民宅：右側一排排，屋頂是深灰瓦
    const hs=[], rf=[], pines=[], ptops=[];
    const nearSt=p=>STATIONS.some(x=>p>x.pos-PL-10 && p<x.pos+40);
    const inStreet=p=>st && p>st.s-20 && p<st.e+20;
    for(let c=Math.floor(S0/11); c*11<S1; c++) for(let row=0; row<6; row++){
      const key=c*13+row*7+3; if(rnd(key)<(row<2?0.12:0.3)) continue;
      const s=c*11+rnd(key+1)*5, lat=row===0?11.5+rnd(key+2)*3 : 16+row*13+rnd(key+2)*8;
      if(row===0 && (nearSt(s) || CROSSINGS.some(x=>Math.abs(x-s)<12))) continue;
      const w=6+rnd(key+3)*4, d=6+rnd(key+4)*3, two=rnd(key+5)<0.55;
      hs.push({s,lat,h:0,sx:d,sy:two?5.6:3.2,sz:w,c:[0xf1ece2,0xe6dfd2,0xd9d4c8,0xefe7d6,0xc9c2b4][(rnd(key+6)*5)|0]});
      rf.push({s,lat,h:two?5.6:3.2,sx:d+0.9,sy:1.5,sz:w+0.8,c:[0x3b4248,0x4a5058,0x5a4b42,0x34404a][(rnd(key+7)*4)|0]});
    }
    // 路面併用軌道：兩側緊貼的商店、柏油路面
    if(st){
      ribbon(st.s,st.e,2,[[-7.5,RT-0.015],[7.5,RT-0.015]],M.asphalt,{});
      for(const e of [-7.2,7.2]) ribbon(st.s,st.e,2,[[e-0.08,RT-0.01],[e+0.08,RT-0.01]],M.white,{});
      for(const g of [-ROUTE.gauge/2,ROUTE.gauge/2]) ribbon(st.s,st.e,2,[[g-0.07,RT-0.012],[g+0.07,RT-0.012]],M.dark,{});
      for(let s=st.s+6; s<st.e-6; s+=9) for(const sd of [-1,1]){ const key=Math.round(s)*3+(sd>0?1:0);
        hs.push({s,lat:sd*(10.5+rnd(key)*1.5),h:0,sx:7,sy:5.4+rnd(key+1)*2,sz:8.4,c:[0xf3efe6,0xe2dccf,0xd8cfbf,0xece4d0][(rnd(key+2)*4)|0]});
        rf.push({s,lat:sd*(10.5+rnd(key)*1.5),h:5.4+rnd(key+1)*2,sx:7.6,sy:1.0,sz:8.8,c:0x3e454b}); }
    }
    // 海岸邊的黑松
    for(let s=Math.ceil(S0/18)*18; s<S1; s+=18){ const key=s|0; if(rnd(key)<0.35 || inStreet(s)) continue; const h=7+rnd(key+1)*5, lat=-26-rnd(key+2)*3;
      pines.push({s,lat,h:0,sy:h}); ptops.push({s,lat,h:h-0.6,sx:2.4+rnd(key+3),sy:1.6,sz:2.2,ry:rnd(key+4)*6,c:[0x2f4a32,0x34503a,0x2a4430][(rnd(key+5)*3)|0]}); }
    const hg=new T.BoxGeometry(1,1,1); hg.translate(0,0.5,0); inst(hg,M.wall,hs,{cast:true,receive:true});
    const rm=M.metalRoof.clone(); rm.side=T.DoubleSide; rm.roughness=0.75; inst(roofG2(),rm,rf,{cast:true});
    const tg=new T.CylinderGeometry(0.16,0.26,1,6); tg.translate(0,0.5,0); inst(tg,M.trunk,pines,{cast:true});
    const pg=new T.IcosahedronGeometry(1,0); inst(pg,M.crown,ptops,{cast:true});
    // 遠山（右側）
    const segs=360, pos=[], col=[], idx=[], hz=new T.Color(HAZE);
    for(let i=0;i<=segs;i++){ const a=i/segs*Math.PI*2, dx=Math.cos(a), dz=Math.sin(a); const side=dx*mid.rx+dz*mid.rz; const k=smooth(0.05,0.5,side);
      const r=2600, h=k*(120+90*Math.abs(Math.sin(a*9+1.3))+60*Math.abs(Math.sin(a*23))), x=mid.x+dx*r, z=mid.z+dz*r;
      pos.push(x,-5,z, x,h,z); const c=new T.Color(0x7d9a86).lerp(hz,0.5); col.push(hz.r,hz.g,hz.b,c.r,c.g,c.b);
      if(i<segs){ const q=i*2; idx.push(q,q+2,q+1,q+1,q+2,q+3); } }
    const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(pos,3)); g.setAttribute('color',new T.Float32BufferAttribute(col,3)); g.setIndex(idx);
    const hm=new T.MeshBasicMaterial({vertexColors:true,fog:false,side:T.DoubleSide}); jpMounts.push(hm); scene.add(new T.Mesh(g,hm));
    // 富士山：前方偏右的遠方
    const end={...fr(END)}; const fd={x:end.dx,z:end.dz}, fr2={x:end.rx,z:end.rz};
    const FH=1300, FR2=3600; const fuG=new T.ConeGeometry(FR2,FH,40,6); const fp=fuG.attributes.position, fc=[]; const blue=new T.Color(0x6f86a8), snow=new T.Color(0xf4f7fa);
    for(let i=0;i<fp.count;i++){ const y=(fp.getY(i)+FH/2)/FH; let rr=Math.hypot(fp.getX(i),fp.getZ(i)); const shape=Math.pow(1-y,1.6)*FR2+ (y>0.97?60:0); const k2=rr>0?shape/rr:0; fp.setX(i,fp.getX(i)*k2); fp.setZ(i,fp.getZ(i)*k2);
      const c=blue.clone().lerp(hz,0.45*(1-y)); if(y>0.62) c.lerp(snow,Math.min(1,(y-0.62)*4+0.3*Math.sin(i*2.7)+0.2)); fc.push(c.r,c.g,c.b); }
    fuG.setAttribute('color',new T.Float32BufferAttribute(fc,3));
    const fm=new T.MeshBasicMaterial({vertexColors:true,fog:false}); jpMounts.push(fm);
    const fuji=new T.Mesh(fuG,fm); fuji.position.set(end.x+fd.x*9500+fr2.x*3800, FH/2-40, end.z+fd.z*9500+fr2.z*3800); scene.add(fuji);
    // 江之島：前方偏左的小島，島頂有展望燈塔
    const ex=end.x+fd.x*900-fr2.x*780, ez=end.z+fd.z*900-fr2.z*780;
    const isl=new T.Mesh(new T.SphereGeometry(420,28,12,0,Math.PI*2,0,Math.PI/2),std({color:0x5f8576,fog:false})); isl.scale.set(1.3,0.15,1); jpFar.push(isl.material); isl.position.set(ex,-2,ez); isl.castShadow=true; scene.add(isl);
    const cliff=new T.Mesh(new T.CylinderGeometry(540,560,8,28),std({color:0xa59d8c,fog:false})); cliff.position.set(ex,-3,ez); jpFar.push(cliff.material); cliff.scale.set(1.0,1,0.78); scene.add(cliff);
    const tower=new T.Mesh(new T.CylinderGeometry(3.2,4.5,46,10),std({color:0xe9ecef,roughness:0.5,fog:false})); tower.position.set(ex,58+23,ez); jpFar.push(tower.material); tower.castShadow=true; scene.add(tower);
    const deck=new T.Mesh(new T.CylinderGeometry(9,6,5,12),std({color:0xd8dde2,fog:false})); deck.position.set(ex,58+46,ez); jpFar.push(deck.material); scene.add(deck);
    const lamp=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:0xfff2c0,blending:T.AdditiveBlending,depthWrite:false,transparent:true})); lamp.position.set(ex,58+49,ez); lamp.scale.set(40,40,1); lamp.visible=false; scene.add(lamp); jpLamp=lamp;
    // 江之島弁天橋
    const br=new T.Mesh(new T.BoxGeometry(8,1,1),std({color:0xbdb6a8})); const bx=(end.x+ex)/2, bz=(end.z+ez)/2; br.position.set(bx,0.6,bz); br.lookAt(ex,0.6,ez); br.scale.set(1,1,Math.hypot(ex-end.x,ez-end.z)*0.55); scene.add(br);
  }
  const jpMounts=[], jpFar=[]; let jpLamp=null;

  /* ---------- 淡水線：淡水河、紅樹林、觀音山、大屯山、關渡大橋、公寓、圍籬、第三軌 ---------- */
  function buildTamsui(){
    const S0=PMIN+30, S1=PMAX-30, mid={...fr(END/2)}, hz=new T.Color(HAZE);
    const band=(lats,hfn,mat,uvk,s0,s1)=>{ s0=s0??S0; s1=s1??S1; const step=4, ns=Math.ceil((s1-s0)/step)+1, nl=lats.length, pos=[], uv=[], idx=[];
      for(let i=0;i<ns;i++){ const sv=s0+i*step; let km=0; for(let q=-250;q<=250;q+=10) km=Math.max(km,Math.abs(kAt(sv+q)));
        const lim=km>0.0005?0.8/km:1e9, kin=kAt(sv)+kAt(sv-80)+kAt(sv+80), f=fr(sv);
        for(let j=0;j<nl;j++){ let Lt=lats[j]; if((kin>0&&Lt>0)||(kin<0&&Lt<0)) Lt=Math.sign(Lt)*Math.min(Math.abs(Lt),lim); pos.push(f.x+f.rx*Lt, f.y+hfn(Lt,sv), f.z+f.rz*Lt); uv.push(Lt*(uvk||0.08), sv*(uvk||0.08)); } }
      for(let i=0;i<ns-1;i++) for(let j=0;j<nl-1;j++){ const k=i*nl+j; idx.push(k,k+nl,k+1, k+1,k+nl,k+nl+1); }
      const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(pos,3)); g.setAttribute('uv',new T.Float32BufferAttribute(uv,2)); g.setIndex(idx); g.computeVertexNormals();
      const m=new T.Mesh(g,mat); m.receiveShadow=true; scene.add(m); return m; };
    // 大片綠地（對岸）＋河面
    { const g=new T.PlaneGeometry(GS,GS); g.rotateX(-Math.PI/2); const m=new T.Mesh(g,std({map:grassTex,color:0x9ab07a})); m.material.map.repeat.set(GS/30,GS/30); m.position.set(mid.x,-0.6,mid.z); m.receiveShadow=true; scene.add(m); }
    const riverTex=tex(256,256,(x,w,h)=>{ x.fillStyle='#5f8a92'; x.fillRect(0,0,w,h); speck(x,w,h,2200,['#6f9aa2','#557f88','#7aa4aa'],2,6); x.strokeStyle='rgba(255,255,255,.12)'; for(let i=0;i<12;i++){ const y=Math.random()*h; x.beginPath(); x.moveTo(0,y); x.bezierCurveTo(w*0.3,y-5,w*0.6,y+5,w,y); x.stroke(); } },true);
    const riverM=std({map:riverTex,roughness:0.22,metalness:0.12}); M.sea=riverM; riverM.side=T.DoubleSide;
    band([-75,-160,-320,-560,-820,-1100],()=>-0.25,riverM,0.03);
    // 河岸這一側的陸地（右側有公寓與道路）
    const landTex=tex(256,256,(x,w,h)=>{ x.fillStyle='#86a067'; x.fillRect(0,0,w,h); speck(x,w,h,4000,['#7a955c','#93ad72','#9b9d86','#6f8a55'],1,4); },true);
    const landM=std({map:landTex}); landM.side=T.DoubleSide;
    band([-75,-62,-40,-20,-8,-3,3,LOOP_LAT+3,14,30,60,120,240,420,700],(L)=>L<-62?-0.5:0.01,landM);
    // 關渡一帶的濕地草澤（黃綠色）
    const reedTex=tex(256,256,(x,w,h)=>{ x.fillStyle='#a8ad62'; x.fillRect(0,0,w,h); speck(x,w,h,5000,['#b8b86e','#93984f','#c4bf7a','#7f8a48'],1,4); },true);
    band([-70,-40,-12],()=>0.03,std({map:reedTex}),0.1,1800,3100);
    // 右側道路
    ribbon(S0,S1,4,[[16,0.03],[23,0.03]],M.road,{u:1/7,v:1/12});
    // 軌道兩側的圍籬
    const fenceTex=tex(64,64,(x,w,h)=>{ x.clearRect(0,0,w,h); x.strokeStyle='#3e5a49'; x.lineWidth=3; for(let i=0;i<=4;i++){ x.beginPath(); x.moveTo(i*16,0); x.lineTo(i*16,h); x.stroke(); x.beginPath(); x.moveTo(0,i*16); x.lineTo(w,i*16); x.stroke(); } },true);
    const fenceM=new T.MeshStandardMaterial({map:fenceTex,transparent:true,alphaTest:0.4,side:T.DoubleSide,roughness:0.8});
    const nearSt=p=>STATIONS.some(x=>p>x.pos-PL-8 && p<x.pos+30);
    for(const fl of [-3.3, LOOP_LAT+3.3]){ let a=null; for(let sv=S0; sv<=S1; sv+=10){ const ns=nearSt(sv); if(!ns && a==null) a=sv; if((ns||sv+10>S1) && a!=null){ ribbon(a,sv,2,[[fl,0],[fl,1.7]],fenceM,{u:0.6,v:0.6,receive:false}); a=null; } } }
    // 第三軌（在兩條軌道外側）
    for(const l3 of [-1.3, LOOP_LAT+1.3]) ribbon(S0,S1,1,[[l3-0.06,0.42],[l3+0.06,0.42],[l3+0.06,0.52],[l3-0.06,0.52]],std({color:0x8c8f86,roughness:0.6}),{closed:true});
    // 公寓大樓
    const aptTex=tex(128,256,(x,w,h)=>{ x.fillStyle='#d9d4c6'; x.fillRect(0,0,w,h); for(let r=0;r<12;r++) for(let c=0;c<4;c++){ x.fillStyle=Math.random()<0.15?'#e8d9a8':'#56636b'; x.fillRect(8+c*30,8+r*20,20,12); x.fillStyle='#bdb7a8'; x.fillRect(4+c*30,22+r*20,28,3); } });
    const aptGlow=tex(128,256,(x,w,h)=>{ x.fillStyle='#000'; x.fillRect(0,0,w,h); for(let r=0;r<12;r++) for(let c=0;c<4;c++){ if(Math.random()<0.45){ x.fillStyle='#ffd68a'; x.fillRect(8+c*30,8+r*20,20,12); } } });
    const aptM=std({map:aptTex,emissiveMap:aptGlow,emissive:0x000000}); M.apt=aptM;
    const apts=[], trees=[], ttr=[];
    const wet=sv=>sv>1800 && sv<3150;
    for(let c=Math.floor(S0/16); c*16<S1; c++) for(let row=0; row<5; row++){ const key=c*11+row*5+1; const sv=c*16+rnd(key)*8;
      if(rnd(key+1)<(wet(sv)?0.85:0.3)) continue; const lat=28+row*34+rnd(key+2)*14;
      const hgt=(row===0?10:14)+rnd(key+3)*(row>1?40:22); apts.push({s:sv,lat,h:0,sx:12+rnd(key+4)*8,sy:hgt,sz:14+rnd(key+5)*10,c:[0xffffff,0xf1ece2,0xe4e7ea,0xefe6d8][(rnd(key+6)*4)|0]}); }
    // 淡水站一帶左側也有房子
    for(let sv=4700; sv<S1; sv+=18){ const key=Math.round(sv); if(rnd(key)<0.3) continue; apts.push({s:sv,lat:-14-rnd(key+1)*16,h:0,sx:10,sy:8+rnd(key+2)*16,sz:12,c:0xf1ece2}); }
    const ag=new T.BoxGeometry(1,1,1); ag.translate(0,0.5,0); inst(ag,aptM,apts,{cast:true,receive:true});
    // 行道樹
    for(let sv=Math.ceil(S0/14)*14; sv<S1; sv+=14){ const key=Math.round(sv)*3; if(rnd(key)<0.3) continue; for(const lat of [14.5,24.5]){ ttr.push({s:sv,lat,h:0,sy:2.6}); trees.push({s:sv,lat,h:3.6,sx:2.1,sy:1.8,sz:2.1,ry:rnd(key+lat)*6,c:[0x4f8a42,0x5b9550,0x467c3c][(rnd(key+lat+1)*3)|0]}); } }
    // 紅樹林（水筆仔）：竹圍到淡水之間的河岸
    const mang=[]; for(let sv=3300; sv<5300; sv+=4){ const key=Math.round(sv*3); for(let q=0;q<3;q++){ if(rnd(key+q)<0.25) continue; mang.push({s:sv+rnd(key+q+5)*4,lat:-46-rnd(key+q+9)*30,h:-0.3,sx:2.2+rnd(key+q)*1.4,sy:1.3+rnd(key+q+2),sz:2.2,ry:rnd(key+q+4)*6,c:[0x3c6a3a,0x335f33,0x46753f][(rnd(key+q+6)*3)|0]}); } }
    const tg=new T.CylinderGeometry(0.16,0.24,1,6); tg.translate(0,0.5,0); inst(tg,M.trunk,ttr,{cast:true});
    const cg=new T.IcosahedronGeometry(1,1); inst(cg,M.crown,trees,{cast:true}); inst(cg,M.crown,mang,{receive:true});
    // 關渡大橋：紅色雙拱橋，橫跨淡水河
    { const bs=3150, f0={...fr(bs)}; const P=(lat,h)=>new T.Vector3(f0.x+f0.rx*lat, h, f0.z+f0.rz*lat);
      const deck=new T.Mesh(new T.BoxGeometry(1,1.4,18),std({color:0xbfb8aa})); const a=P(-300,12), b=P(-980,12); deck.position.copy(a.clone().add(b).multiplyScalar(0.5)); deck.lookAt(b); deck.rotateY(Math.PI/2); deck.scale.set(a.distanceTo(b),1,1); deck.castShadow=true; scene.add(deck);
      const red=std({color:0xc8322b,roughness:0.5});
      for(const off of [-7,7]){ const pts=[]; for(let i=0;i<=24;i++){ const u=i/24; const lat=-430+(-420)*u; pts.push(new T.Vector3(f0.x+f0.rx*lat+f0.dx*off, 12+58*Math.sin(Math.PI*u), f0.z+f0.rz*lat+f0.dz*off)); }
        const tube=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),48,2.0,8,false),red); tube.castShadow=true; scene.add(tube);
        for(let i=2;i<24;i+=2){ const u=i/24, lat=-430-420*u, top=12+58*Math.sin(Math.PI*u); const h=new T.Mesh(new T.CylinderGeometry(0.18,0.18,top-12,5),red); h.position.set(f0.x+f0.rx*lat+f0.dx*off,12+(top-12)/2,f0.z+f0.rz*lat+f0.dz*off); scene.add(h); } }
      for(let i=0;i<=8;i++){ const lat=-330-80*i; const pr=new T.Mesh(new T.CylinderGeometry(2.2,2.6,13,10),std({color:0xa8a296})); pr.position.copy(P(lat,5.5)); scene.add(pr); } }
    // 觀音山（河對岸）與大屯山（右側遠方）
    const mountain=(cx,cz,r,h,base,top,seed)=>{ const g=new T.ConeGeometry(r,h,48,8); const pp=g.attributes.position, cc=[]; const b=new T.Color(base), t=new T.Color(top);
      for(let i=0;i<pp.count;i++){ const y=(pp.getY(i)+h/2)/h, ang=Math.atan2(pp.getZ(i),pp.getX(i)); const k=1+0.16*Math.sin(ang*3+seed)+0.08*Math.sin(ang*7+seed*2); pp.setX(i,pp.getX(i)*k); pp.setZ(i,pp.getZ(i)*k); pp.setY(i,pp.getY(i)*(0.92+0.1*Math.sin(ang*5+seed)));
        const c=b.clone().lerp(t,y).lerp(hz,0.35*(1-y)+0.15); cc.push(c.r,c.g,c.b); }
      g.setAttribute('color',new T.Float32BufferAttribute(cc,3)); const m=new T.MeshBasicMaterial({vertexColors:true,fog:false}); jpMounts.push(m); const mesh=new T.Mesh(g,m); mesh.position.set(cx,h/2-30,cz); scene.add(mesh); };
    { const f={...fr(END)}; mountain(f.x-f.rx*2700+f.dx*1100, f.z-f.rz*2700+f.dz*1100, 1600, 620, 0x4f7360, 0x5f7f92, 1.3); }
    { const f=fr(2400); mountain(f.x+f.rx*5200, f.z+f.rz*5200, 2600, 1050, 0x5a7d62, 0x7b97a8, 2.1); }
    { const f=fr(4800); mountain(f.x+f.rx*5600-f.dx*600, f.z+f.rz*5600-f.dz*600, 2200, 820, 0x5a7d62, 0x7b97a8, 3.7); }
  }
  const roofG2=()=>{ const g=new T.BufferGeometry(); const v=[-0.5,0,-0.5, 0.5,0,-0.5, 0,1,-0.5, -0.5,0,0.5, 0.5,0,0.5, 0,1,0.5];
    const ix=[0,2,1, 3,4,5, 0,3,5, 0,5,2, 1,2,5, 1,5,4]; g.setAttribute('position',new T.Float32BufferAttribute(v,3)); g.setIndex(ix); const ng=g.toNonIndexed(); ng.computeVertexNormals(); return ng; };

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
  if(!JP && !TS) (function(){
    const mid={...fr(END/2)}; const BY=AL?mid.y-320:0, HS=AL?1.8:1; const segs=900, pos=[], col=[], idx=[]; const c=new T.Color(), hz=new T.Color(HAZE);
    const ridgeN=a=> (Math.sin(a*7+1.3)*0.5+0.5)*0.45 + (Math.sin(a*19+0.4)*0.5+0.5)*0.3 + (Math.sin(a*41+2.2)*0.5+0.5)*0.17 + Math.abs(Math.sin(a*97+0.9))*0.05;
    for(let i=0;i<=segs;i++){
      const a=i/segs*Math.PI*2, dx=Math.cos(a), dz=Math.sin(a), w=smooth(-0.25,0.55,dx), e=smooth(-0.25,0.55,-dx);
      const r=3600+3600*w-400*e, n=ridgeN(a);
      const h=w*(700+1100*n) + e*(260+520*ridgeN(a*1.7+3)) + (1-Math.min(1,w+e))*(140+200*n);
      const x=mid.x+dx*r, z=mid.z+dz*r;
      pos.push(x,BY-60,z, x,BY+h*0.45*HS,z, x,BY+h*HS,z);
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
      const x=mid.x+dx*r, z=mid.z+dz*r; p2.push(x,BY-20,z, x,BY+h*(AL?2.2:1),z); const t=fh.clone().lerp(hz,0.55); c2.push(hz.r,hz.g,hz.b, t.r,t.g,t.b);
      if(i<segs){ const k=i*2; i2.push(k,k+2,k+1,k+1,k+2,k+3); } }
    const g2=new T.BufferGeometry(); g2.setAttribute('position',new T.Float32BufferAttribute(p2,3)); g2.setAttribute('color',new T.Float32BufferAttribute(c2,3)); g2.setIndex(i2);
    const mm2=new T.MeshBasicMaterial({vertexColors:true,fog:false,side:T.DoubleSide}); mountMats.push(mm2); scene.add(new T.Mesh(g2,mm2));
    if(AL){
      /* 玉山：東邊遠方最高的山峰 */
      const pk=new T.ConeGeometry(3200,2300,10,4); const pc=[], hz2=new T.Color(HAZE), top=new T.Color(0x6f86a0), snow=new T.Color(0xe8eef4);
      const pp=pk.attributes.position; for(let i=0;i<pp.count;i++){ const y=(pp.getY(i)+1150)/2300; const c=top.clone().lerp(hz2,0.5*(1-y)); if(y>0.86) c.lerp(snow,0.35); pp.setX(i,pp.getX(i)*(1+Math.sin(i*1.7)*0.08)); pc.push(c.r,c.g,c.b); }
      pk.setAttribute('color',new T.Float32BufferAttribute(pc,3));
      const pm=new T.MeshBasicMaterial({vertexColors:true,fog:false}); mountMats.push(pm);
      const peak=new T.Mesh(pk,pm); peak.position.set(mid.x-8200,BY+1150-80,mid.z-5200); scene.add(peak);
      const pk2=peak.clone(); pk2.scale.set(0.8,0.75,0.8); pk2.position.set(mid.x-6900,BY+860-80,mid.z-7400); scene.add(pk2);
    }
  })();

  /* ground */
  const S0=PMIN+30, S1=PMAX-30;
  if(JP){ buildJapan(); }
  else if(TS){ buildTamsui(); }
  else if(!AL){
  { const mid=fr(END/2); const g=new T.PlaneGeometry(GS,GS); g.rotateX(-Math.PI/2); const m=new T.Mesh(g,M.ground); m.position.set(mid.x,0,mid.z); m.receiveShadow=true; scene.add(m); }
  ribbon(S0,S1,2,[[-9,0.015],[-2.7,0.015]],M.grass,{u:0.25,v:0.25});
  ribbon(S0,S1,2,[[2.7,0.015],[12,0.015]],M.grass,{u:0.25,v:0.25});
  ribbon(S0,S1,2,[[9.6,0.03],[10.8,0.03]],M.water,{});
  ribbon(S0,S1,2,[[9.4,0.25],[9.6,0.03]],M.concrete,{}); ribbon(S0,S1,2,[[10.8,0.03],[11.0,0.25]],M.concrete,{});
  } else {
    /* 山坡地形網格：沿著軌道，每個橫向取樣點的高度由 terrainH 決定 */
    const forestTex=tex(256,256,(x,w,h)=>{ x.fillStyle='#4d6b3a'; x.fillRect(0,0,w,h); speck(x,w,h,5000,['#3f5b30','#5a7a44','#6b5a3e','#36502a','#7a8a50'],1,4); },true);
    const forestM=std({map:forestTex}); forestM.side=T.DoubleSide;
    const terr=(lats)=>{ const step=4, ns=Math.ceil((S1-S0)/step)+1, nl=lats.length, pos=[], uv=[], idx=[];
      for(let i=0;i<ns;i++){ const sv=S0+i*step; let km=0; for(let q=-200;q<=200;q+=10) km=Math.max(km,Math.abs(kAt(sv+q)));
        const lim=km>0.0005 ? 0.8/km : 1e9, kin=kAt(sv)+kAt(sv-60)+kAt(sv+60); const f=fr(sv);
        for(let j=0;j<nl;j++){ let L=lats[j]; if((kin>0 && L>0) || (kin<0 && L<0)) L=Math.sign(L)*Math.min(Math.abs(L),lim); pos.push(f.x+f.rx*L, f.y+terrainH(sv,L)-0.02, f.z+f.rz*L); uv.push(L*0.08, sv*0.08); } }
      for(let i=0;i<ns-1;i++) for(let j=0;j<nl-1;j++){ const k=i*nl+j; idx.push(k,k+nl,k+1, k+1,k+nl,k+nl+1); }
      const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(pos,3)); g.setAttribute('uv',new T.Float32BufferAttribute(uv,2)); g.setIndex(idx); g.computeVertexNormals();
      const m=new T.Mesh(g,forestM); m.receiveShadow=true; scene.add(m); };
    terr([-700,-420,-260,-170,-110,-75,-52,-38,-28,-21,-15,-10,-6,-3.2,-2.0]);
    terr([2.0,3.6,5,7,10,14,20,30,45,70,110,170,260,420,700]);
  }

  /* track */
  const BW=AL?0.72:1; ribbon(S0,S1,1,[[-2.8*BW,0.0],[-1.9*BW,0.3],[1.9*BW,0.3],[2.8*BW,0.0]],M.ballast,{u:0.6,v:0.6});
  const sl=[]; for(let k=Math.ceil(S0/0.6); k*0.6<S1; k++){ const s=k*0.6; if(CROSSINGS.some(c=>Math.abs(c-s)<4.3)) continue; sl.push({s,lat:0,h:0.34,c:(rnd(k)>0.5?0xb8b6af:0xaba9a2)}); }
  if(AL) sl.forEach((it,k)=>it.c=[0x5a4636,0x4e3d2f,0x63503d][k%3]);
  inst(new T.BoxGeometry(AL?1.45:2.0,0.13,0.24),std({color:0xffffff}),sl,{receive:true});
  for(const g of [-ROUTE.gauge/2,ROUTE.gauge/2]){
    ribbon(S0,S1,1,[[g-0.04,RT-0.012],[g+0.04,RT-0.012],[g+0.04,0.38],[g-0.04,0.38]],M.rust,{closed:true});
    ribbon(S0,S1,1,[[g-0.034,RT],[g+0.034,RT]],M.steel,{});
  }
  /* 會車側線（或雙線）的軌道 */
  if(ROUTE.loops || ROUTE.double){
    const segs = ROUTE.double ? [{s:S0,e:S1}] : ROUTE.loops;
    const ribbonL=(s0,s1,prof,mat,o)=>{ o=o||{}; const step=1, ns=Math.max(2,Math.ceil((s1-s0)/step)+1), pos=[], uv=[], idx=[]; let vi=0;
      for(let j=0;j<prof.length-1;j++){ const a=prof[j], b=prof[j+1], base=vi;
        for(let i=0;i<ns;i++){ const sv=s0+(s1-s0)*i/(ns-1), f=fr(sv), L=loopLat(sv); pos.push(f.x+f.rx*(a[0]+L),a[1]+f.y,f.z+f.rz*(a[0]+L), f.x+f.rx*(b[0]+L),b[1]+f.y,f.z+f.rz*(b[0]+L)); uv.push(j,sv*(o.v||0.6),j+1,sv*(o.v||0.6)); vi+=2; }
        for(let i=0;i<ns-1;i++){ const k=base+i*2; idx.push(k,k+2,k+1,k+1,k+2,k+3); } }
      const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(pos,3)); g.setAttribute('uv',new T.Float32BufferAttribute(uv,2)); g.setIndex(idx); g.computeVertexNormals();
      const m=new T.Mesh(g,mat); m.receiveShadow=true; scene.add(m); };
    const sl2=[];
    segs.forEach(L=>{
      ribbonL(L.s,L.e,[[-1.9*BW,0.0],[-1.6*BW,0.29],[1.6*BW,0.29],[2.4*BW,0.0]],M.ballast);
      for(const g of [-ROUTE.gauge/2,ROUTE.gauge/2]){ ribbonL(L.s,L.e,[[g-0.04,0.38],[g-0.04,RT-0.012],[g+0.04,RT-0.012],[g+0.04,0.38]],M.rust); ribbonL(L.s,L.e,[[g-0.034,RT],[g+0.034,RT]],M.steel); }
      for(let sv=Math.ceil(L.s/0.6)*0.6; sv<L.e; sv+=0.6){ if(CROSSINGS.some(c=>Math.abs(c-sv)<4.3)) continue; const lt=loopLat(sv); if(lt<2.2) continue; sl2.push({s:sv,lat:lt,h:0.34,c:AL?0x55432f:0xb0aea7}); }
    });
    inst(new T.BoxGeometry(AL?1.45:2.0,0.13,0.24),std({color:0xffffff}),sl2,{receive:true});
  }

  /* catenary */
  if(ROUTE.electric && !ROUTE.thirdRail){
  const masts=[], arms=[], feet=[];
  for(let s=Math.ceil(S0/50)*50; s<S1; s+=50){ if(CROSSINGS.some(c=>Math.abs(c-s)<8)) continue;
    const ml=inLoop(s,10)?7.4:3.05, aw=ml/3.05;
    masts.push({s,lat:ml,h:3.9}); arms.push({s,lat:ml/2-0.1,h:RT+6.25,sx:aw}); arms.push({s,lat:ml/2,h:RT+6.95,az:0.18/aw,sx:0.95*aw}); feet.push({s,lat:ml,h:0.2}); }
  inst(new T.BoxGeometry(0.3,7.8,0.3),M.mast,masts,{cast:true});
  inst(new T.BoxGeometry(3.4,0.08,0.08),M.mast,arms,{cast:true});
  inst(new T.BoxGeometry(0.8,0.4,0.8),M.concrete,feet,{receive:true});
  const wl=(lat,h,step)=>{ const pts=[]; for(let s=S0;s<=S1;s+=step){ const f=fr(s); pts.push(new T.Vector3(f.x+f.rx*lat,h+f.y,f.z+f.rz*lat)); } line(pts); };
  wl(0,RT+5.45,4); wl(0,RT+6.3,4); wl(3.3,RT+7.7,4);
  }

  /* provincial highway on the east side, with utility poles */
  if(!AL && !JP && !TS){
  ribbon(S0,S1,4,[[-42,0.05],[-34,0.05]],M.road,{u:1/8,v:1/12});
  const poles=[], parms=[];
  for(let s=Math.ceil(S0/40)*40; s<S1; s+=40){ poles.push({s,lat:-44.5,h:5}); parms.push({s,lat:-44.5,h:9.3}); }
  inst(new T.CylinderGeometry(0.12,0.16,10,7),M.pole,poles,{cast:true});
  inst(new T.BoxGeometry(1.6,0.1,0.1),M.pole,parms,{cast:true});
  for(const lat of [-45.2,-43.8]){ const pts=[]; for(let s=S0;s<=S1;s+=5){ const f=fr(s), u=((s%40)+40)%40/40, sag=0.5*4*u*(1-u); pts.push(new T.Vector3(f.x+f.rx*lat,9.35-sag,f.z+f.rz*lat)); } line(pts); }
  }

  /* scenery */
  const nearStn=p=>STATIONS.some(st=>p>st.pos-230 && p<st.pos+60);
  const palms=[], palmTops=[], trunks=[], crowns=[], houses=[], roofs=[];
  const conifers=[], ctrunks=[];
  if(AL){
    const nearSt=(p,w)=>STATIONS.some(st=>p>st.pos-260-w && p<st.pos+90+w);
    for(let c=Math.floor(S0/7); c*7<S1; c++) for(const sd of [-1,1]) for(const layer of [0,1,2]){
      const key=c*8+(sd>0?1:0)+layer*2+7; if(rnd(key)<(layer===0?0.25:0.15)) continue;
      const s=c*7+rnd(key*7+3)*7, r1=rnd(key*31+7);
      const lat=sd*(layer===0? 4.5+rnd(key*13+5)*22 : layer===1? 26+rnd(key*13+5)*90 : 116+rnd(key*13+5)*300);
      if(CROSSINGS.some(x=>Math.abs(x-s)<10) && Math.abs(lat)<30) continue;
      if(inLoop(s,40) && lat>0 && lat<11) continue;
      if(nearSt(s,0) && lat>-26 && lat<9){
        // 車站旁種櫻花
        if(lat<-8 || lat>5){ const sc=1.6+r1*1.2; trunks.push({s,lat,h:0,sy:1.8+r1,terr:true}); crowns.push({s,lat,h:1.8+r1+sc*0.7,ry:r1*9,sx:sc*1.2,sy:sc*0.85,sz:sc*1.15,c:[0xf4b6c8,0xf7c6d3,0xec9db5,0xfad4de][(r1*4)|0],terr:true}); }
        continue;
      }
      const H=12+r1*16+(layer?6:0), R=H*(0.16+rnd(key+9)*0.06);
      conifers.push({s,lat,h:H*0.18,sx:R,sy:H*0.82,sz:R,ry:r1*6,c:[0x2f4a2c,0x35532f,0x2a4228,0x3d5a34,0x2c4632][(r1*5)|0],terr:true});
      ctrunks.push({s,lat,h:0,sx:R*0.12,sy:H*0.3,sz:R*0.12,terr:true});
    }
  }
  if(!AL && !JP && !TS) for(let c=Math.floor(S0/14); c*14<S1; c++){
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
  if(AL){
    const cone=(r,y0,y1)=>{ const g=new T.ConeGeometry(r,y1-y0,8); g.translate(0,(y0+y1)/2,0); return g; };
    inst(mergeGeos([cone(1,0,0.55),cone(0.78,0.28,0.8),cone(0.52,0.55,1.0)]),M.crown,conifers,{cast:true});
    const ct=new T.CylinderGeometry(1,1.3,1,6); ct.translate(0,0.5,0); inst(ct,M.trunk,ctrunks,{});
  }

  /* 軌道旁的花草：江之電是紫陽花，花東線是野花，阿里山是蕨類 */
  {
    const nearStnX=p=>STATIONS.some(st=>p>st.pos-PL-5 && p<st.pos+35);
    const loopAt=p=>(ROUTE.loops||[]).some(L=>p>L.s-20 && p<L.e+20) || !!ROUTE.double;
    const bush=[], bloom=[];
    const FLW = JP ? [0x6f7fd6,0x8a6fd0,0x5f9fe0,0xc58ad8,0xe7a1c4] : AL ? null : [0xf3d34a,0xffffff,0xf29bb8,0xe8664f,0xb59be6];
    for(let s=Math.ceil(S0/3.2)*3.2; s<S1; s+=3.2){ const k=Math.round(s*7);
      for(const sd of [-1,1]){ const key=k*2+(sd>0?1:0); if(rnd(key)<0.45) continue;
        if(nearStnX(s) && sd<0) continue; if(CROSSINGS.some(c=>Math.abs(c-s)<9)) continue; if(ROUTE.street && s>ROUTE.street.s-10 && s<ROUTE.street.e+10) continue;
        if(sd>0 && loopAt(s)) continue;
        const lat=sd*(3.3+rnd(key+3)*2.6), sc=0.35+rnd(key+5)*0.45;
        bush.push({s,lat,h:0.15,sx:sc*1.3,sy:sc*(AL?1.3:0.9),sz:sc*1.2,ry:rnd(key+7)*6,c:AL?[0x3f6b34,0x4c7a3a,0x58873f][key%3]:[0x4f7f3a,0x5c8a44,0x6a9548][key%3],terr:true});
        if(FLW && rnd(key+9)<(JP?0.8:0.55)) for(let q=0;q<(JP?3:2);q++) bloom.push({s:s+(rnd(key+11+q)-0.5)*0.9,lat:lat+(rnd(key+13+q)-0.5)*0.9,h:0.15+sc*(JP?0.75:0.6),sx:JP?0.32:0.12,sy:JP?0.28:0.12,sz:JP?0.32:0.12,c:FLW[(rnd(key+17+q)*FLW.length)|0],terr:true});
      } }
    inst(new T.IcosahedronGeometry(1,0),std({color:0xffffff,flatShading:true}),bush,{cast:false,receive:true});
    if(bloom.length) inst(new T.IcosahedronGeometry(1,0),std({color:0xffffff,roughness:0.7}),bloom,{});
  }

  /* signs */
  const numTex=(txt,bg,fg,border)=>signTex(256,200,(x,w,h)=>{ x.fillStyle=border||bg; x.fillRect(0,0,w,h); x.fillStyle=bg; x.fillRect(14,14,w-28,h-28); x.fillStyle=fg; x.font='700 128px '+FONT; x.textAlign='center'; x.textBaseline='middle'; x.fillText(txt,w/2,h/2+8); });
  function signAt(s,lat,hBoard,w,h,map){ const g=new T.Group(); g.add(postMesh(hBoard,0.045)); const b=board(w,h,0.05,map); b.position.y=hBoard+h/2; b.castShadow=true; g.add(b); place(g,s,lat,0); scene.add(g); return g; }
  LIMITS.forEach(Lm=>{ if(Lm.s>0) signAt(Lm.s,-2.5,2.4,0.8,0.62,numTex(String(Lm.v),'#fbfbf6','#151515','#151515'));
    signAt(Lm.e,-2.5,2.4,0.62,0.62,signTex(128,128,(x,w,h)=>{ x.fillStyle='#fbfbf6'; x.fillRect(0,0,w,h); x.strokeStyle='#151515'; x.lineWidth=18; x.beginPath(); x.moveTo(0,h); x.lineTo(w,0); x.stroke(); x.lineWidth=8; x.strokeRect(4,4,w-8,h-8); })); });
  const whistle=signTex(128,128,(x,w,h)=>{ x.fillStyle='#fbfbf6'; x.fillRect(0,0,w,h); x.strokeStyle='#151515'; x.lineWidth=8; x.strokeRect(4,4,w-8,h-8); x.fillStyle='#151515'; x.font='700 88px '+FONT; x.textAlign='center'; x.textBaseline='middle'; x.fillText(JP?'笛':'鳴',w/2,h/2+6); });
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
  const sig={lamps:{},glows:{}}; if(ROUTE.signal!=null){ const g=new T.Group(); g.add(postMesh(4.3,0.09,M.mast));
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
    const XW=AL?22:160;
    ribbon(c-4,c+4,0.5,[[-XW,0.06],[-2.8,0.06]],M.asphalt,{}); ribbon(c-4,c+4,0.5,[[2.8,0.06],[XW,0.06]],M.asphalt,{});
    ribbon(c-4,c+4,0.5,[[-2.8,0.06],[-2.8,RT-0.015],[2.8,RT-0.015],[2.8,0.06]],M.gray,{closed:true,caps:true});
    ribbon(c-0.12,c+0.12,0.24,[[-XW,0.07],[-7,0.07]],M.yellow,{}); ribbon(c-0.12,c+0.12,0.24,[[7,0.07],[XW,0.07]],M.yellow,{});
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
      const f=fr(s); piv.position.set(f.x+f.rx*lat,1.05+f.y,f.z+f.rz*lat);
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
    const a=st.pos-(PL-25), b=st.pos+25;
    ribbon(a,b,2,[[-1.75,0],[-1.75,PT],[-9,PT],[-9,0]],M.concrete,{closed:true,caps:true,cast:true});
    ribbon(a,b,2,[[-9,PT+0.004],[-2.45,PT+0.004]],M.tile,{u:0.5,v:0.5});
    ribbon(a,b,2,[[-2.45,PT+0.005],[-2.25,PT+0.005]],M.tact,{u:5,v:5});
    ribbon(a,b,2,[[-2.25,PT+0.004],[-1.88,PT+0.004]],M.gray,{});
    ribbon(a,b,2,[[-1.88,PT+0.006],[-1.75,PT+0.006]],M.white,{});
    if(ROUTE.double){ const o=LOOP_LAT;
      ribbon(a,b,2,[[o+1.75,0],[o+1.75,PT],[o+9,PT],[o+9,0]],M.concrete,{closed:true,caps:true,cast:true});
      ribbon(a,b,2,[[o+2.45,PT+0.004],[o+9,PT+0.004]],M.tile,{u:0.5,v:0.5});
      ribbon(a,b,2,[[o+2.25,PT+0.005],[o+2.45,PT+0.005]],M.tact,{u:5,v:5});
      ribbon(a,b,2,[[o+1.75,PT+0.006],[o+1.88,PT+0.006]],M.white,{});
      ribbon(st.pos-(PL-45),st.pos-10,2,[[o+2.3,PT+3.5],[o+8.7,PT+3.3],[o+8.7,PT+3.5],[o+2.3,PT+3.68]],M.roof,{closed:true,caps:true,cast:true}); }
    ribbon(st.pos-(PL-45),st.pos-10,2,[[-8.7,PT+3.3],[-2.3,PT+3.5],[-2.3,PT+3.68],[-8.7,PT+3.5]],M.roof,{closed:true,caps:true,cast:true});
    const cp=[]; for(let s=st.pos-(PL-49); s<=st.pos-14; s+=12) cp.push({s,lat:-5.6,h:PT+1.7});
    inst(new T.CylinderGeometry(0.11,0.11,3.4,8),M.post,cp,{cast:true});
    ribbon(st.pos-(PL-49),st.pos-14,4,[[-4.2,PT+3.28],[-3.9,PT+3.3]],M.lampStrip,{receive:false});
    const pl=new T.PointLight(0xfff0d0,0,70,1.6); place(pl,st.pos-PL*0.42,-4.5,PT+3.0); scene.add(pl); stLights.push(pl);
    // station building
    const bld=new T.Group();
    const bx=new T.Mesh(new T.BoxGeometry(9,5,24),M.building); bx.position.y=2.5; bx.castShadow=bx.receiveShadow=true; bld.add(bx);
    const rf=new T.Mesh(roofG,M.tileRoof); rf.scale.set(10.4,2.6,25.5); rf.position.y=5; rf.castShadow=true; bld.add(rf);
    for(let k=-2;k<=2;k++){ const wdw=new T.Mesh(new T.PlaneGeometry(1.6,1.6),M.win); wdw.rotation.y=Math.PI/2; wdw.position.set(4.52,2.6,k*4.4); bld.add(wdw); }
    const bsign=board(0.1,1.0,4.6,null); bsign.material[0]=new T.MeshStandardMaterial({map:signTex(512,112,(x,w,h)=>{ x.fillStyle=AL?'#5a3a22':JP?'#2f6b45':TS?'#d71f26':'#1d3f6e'; x.fillRect(0,0,w,h); x.fillStyle='#fff'; x.font='700 76px '+FONT; x.textAlign='center'; x.textBaseline='middle'; x.fillText(signName(st)+(JP?'駅':TS?'站':'車站'),w/2,h/2+4); }),roughness:0.6});
    bsign.material[0].map.center.set(0.5,0.5); bsign.position.set(4.56,4.1,0); bld.add(bsign);
    place(bld,st.pos-PL*0.44,JP?-12:-17,0); if(JP) bld.scale.set(0.6,0.75,0.45); scene.add(bld);
    // name board
    const prev=STATIONS[i-1], nxt=STATIONS[i+1];
    const nb=signTex(760,230,(x,w,h)=>{ x.fillStyle=AL?'#f3e6cf':'#f5f4ef'; x.fillRect(0,0,w,h); x.fillStyle=AL?'#5a3a22':JP?'#2f6b45':TS?'#d71f26':'#1d3f6e'; x.fillRect(0,h-62,w,62);
      x.fillStyle='#141414'; x.textAlign='center'; x.textBaseline='middle'; x.font=(signName(st).length>4?'700 76px ':'700 104px ')+FONT; x.fillText(signName(st),w/2,70); x.font='500 30px '+FONT; x.fillStyle='#3a3a3a'; x.fillText(st.en,w/2,138);
      x.fillStyle='#fff'; x.font='500 32px '+FONT; if(prev){ x.textAlign='left'; x.fillText('◀ '+signName(prev),22,h-31); } if(nxt){ x.textAlign='right'; x.fillText(signName(nxt)+' ▶',w-22,h-31); } });
    const ng=new T.Group(); [-1.5,1.5].forEach(dx=>{ const p=postMesh(1.0,0.05); p.position.x=dx; ng.add(p); }); const nbm=board(3.8,1.15,0.06,nb); nbm.position.y=1.0+0.575; nbm.castShadow=true; ng.add(nbm);
    place(ng,st.pos-PL*0.37,-4.6,PT); scene.add(ng);
    // stop position marker "4"
    const sm=new T.Group(); sm.add(postMesh(1.3,0.035,M.white)); const smb=board(0.55,0.55,0.04,numTex('4','#1f5fbf','#ffffff','#ffffff')); smb.position.y=1.3+0.275; sm.add(smb);
    place(sm,st.pos,-2.05,PT); scene.add(sm);
    // 觀光景點指示牌（咖啡底白字）
    (SIGHTS[st.name]||[]).forEach((txt,k)=>{ const t=signTex(420,110,(x,w,h)=>{ x.fillStyle='#6b3f22'; x.fillRect(0,0,w,h); x.strokeStyle='#fff'; x.lineWidth=5; x.strokeRect(7,7,w-14,h-14); x.fillStyle='#fff'; x.font='700 52px '+FONT; x.textAlign='center'; x.textBaseline='middle'; x.fillText(txt,w/2,h/2+3); });
      const g=new T.Group(); [-0.8,0.8].forEach(dx=>{ const p=postMesh(2.0,0.05); p.position.x=dx; g.add(p); }); const b=board(2.3,0.6,0.05,t); b.position.y=2.0+0.3+k*0.7; b.castShadow=true; g.add(b);
      place(g,st.pos+42+k*14,-5.5,0); scene.add(g); });
    ribbon(st.pos-0.07,st.pos+0.07,0.14,[[-2.25,PT+0.008],[-1.75,PT+0.008]],M.white,{});
    // 月台設施
    if(i>=0){
      const benchM=std({color:AL?0x7a5233:JP?0x3f6f8f:0x5f7f9a}), legM=M.post;
      for(let k=0;k<3;k++){ const bs=st.pos-PL*0.25-k*PL*0.18; const b=new T.Group();
        const seat=new T.Mesh(new T.BoxGeometry(0.5,0.08,1.8),benchM); seat.position.y=0.45; const back=new T.Mesh(new T.BoxGeometry(0.06,0.45,1.8),benchM); back.position.set(-0.24,0.7,0);
        [-0.75,0.75].forEach(z=>{ const l=new T.Mesh(new T.BoxGeometry(0.4,0.45,0.06),legM); l.position.set(0,0.22,z); b.add(l); }); b.add(seat,back); b.children.forEach(m=>m.castShadow=true);
        place(b,bs,-6.6,PT,0); scene.add(b); }
      // LED 列車資訊看板（掛在雨棚下）
      const nextSt=STATIONS[Math.min(i+1,STATIONS.length-1)], dest=STATIONS[STATIONS.length-1];
      const ledT=signTex(512,96,(x,w,h)=>{ x.fillStyle='#0b0b0b'; x.fillRect(0,0,w,h); x.fillStyle='#ffa31a'; x.font='700 40px '+FONT; x.textBaseline='middle';
        x.textAlign='left'; x.fillText((JP?'各停 ':TS?'往 ':'區間 ')+signName(dest)+(JP?' 行':''),14,h/2+2); x.textAlign='right'; x.fillStyle='#7dff7a'; x.font='700 30px '+FONT; x.fillText(JP?'まもなく':TS?'即將進站':L('即將進站','Arriving','まもなく'),w-14,h/2+2); });
      const led=board(0.08,0.42,2.3,null,M.dark); led.material[0]=new T.MeshBasicMaterial({map:ledT}); led.material[1]=led.material[0];
      const lg=new T.Group(); led.position.y=PT+2.65; lg.add(led); [-0.9,0.9].forEach(z=>{ const r=new T.Mesh(new T.BoxGeometry(0.03,0.55,0.03),M.post); r.position.set(0,PT+3.1,z); lg.add(r); });
      place(lg,st.pos-PL*0.55,-4.1,0,0); scene.add(lg);
      // 時鐘
      const clkT=signTex(128,128,(x,w,h)=>{ x.fillStyle='#fbfbf6'; x.beginPath(); x.arc(64,64,60,0,7); x.fill(); x.strokeStyle='#222'; x.lineWidth=6; x.stroke(); x.lineCap='round';
        for(let q=0;q<12;q++){ const a=q/12*Math.PI*2; x.lineWidth=q%3?3:6; x.beginPath(); x.moveTo(64+Math.sin(a)*46,64-Math.cos(a)*46); x.lineTo(64+Math.sin(a)*54,64-Math.cos(a)*54); x.stroke(); }
        const t=(BASE_CLOCK/3600)%12, mm=(BASE_CLOCK/60)%60; x.lineWidth=7; x.beginPath(); x.moveTo(64,64); x.lineTo(64+Math.sin(t/12*Math.PI*2)*28,64-Math.cos(t/12*Math.PI*2)*28); x.stroke();
        x.lineWidth=4; x.beginPath(); x.moveTo(64,64); x.lineTo(64+Math.sin(mm/60*Math.PI*2)*42,64-Math.cos(mm/60*Math.PI*2)*42); x.stroke(); });
      const clk=new T.Mesh(new T.CylinderGeometry(0.32,0.32,0.06,24),[M.dark,new T.MeshStandardMaterial({map:clkT}),M.dark]); clk.rotation.z=-Math.PI/2;
      const cg=new T.Group(); clk.position.y=PT+2.75; cg.add(clk); place(cg,st.pos-PL*0.75,-4.1,0,0); scene.add(cg);
      // 江之電月台的自動販賣機
      if(JP) for(let k=0;k<2;k++){ const vm=new T.Group(); const vt=signTex(128,256,(x,w,h)=>{ x.fillStyle=['#d8262e','#1f6fc4'][k]; x.fillRect(0,0,w,h); x.fillStyle='#f4f4f0'; x.fillRect(10,20,w-20,h*0.55);
          for(let r=0;r<3;r++) for(let c2=0;c2<4;c2++){ x.fillStyle=['#e94b3c','#2f8f4e','#f2c14e','#3f7fd6','#ffffff'][(r*4+c2)%5]; x.fillRect(16+c2*26,30+r*44,18,34); } x.fillStyle='#222'; x.fillRect(20,h*0.72,w-40,22); });
        const body=new T.Mesh(new T.BoxGeometry(0.75,1.8,1.0),[std({color:0xdddddd}),new T.MeshStandardMaterial({map:vt,emissive:0x222222,emissiveMap:vt}),std({color:0xdddddd}),std({color:0xdddddd}),std({color:0xdddddd}),std({color:0xdddddd})]);
        body.position.y=PT+0.9; body.castShadow=true; vm.add(body); place(vm,st.pos-PL*0.62+k*1.1,-8.3,0,0); scene.add(vm); }
    }
    // passengers
    const pax=[];
    if(i>0) for(let j=0;j<9;j++){
      // 在地旅客：學校旁的站多是穿制服的學生，江之電海邊有衝浪客，阿里山是背著背包的登山客
      const student=['志學','鎌倉高校前'].includes(st.name) && j%2===0, surfer=['稻村崎','七里濱','腰越'].includes(st.name) && j%3===0, hiker=AL && j%2===1;
      const g=new T.Group(); const col=std({color:student?0x1f2a44:PAXC[(rnd(i*7+j*3)*PAXC.length)|0],roughness:0.8});
      const lg=new T.Mesh(paxLegs,legsM); lg.position.y=0.42; const bd=new T.Mesh(paxBody,col); bd.position.y=1.2; const hd=new T.Mesh(paxHead,skin); hd.position.y=1.68; const hr=new T.Mesh(paxHead,hair); hr.position.set(0,1.73,-0.02); hr.scale.set(1.05,0.8,1.05);
      [lg,bd,hd,hr].forEach(m=>{ m.castShadow=true; g.add(m); });
      if(surfer){ const sb=new T.Mesh(new T.BoxGeometry(0.5,2.0,0.07),std({color:[0xf2c14e,0x4fb3d9,0xe86a5c,0xf4f4f0][j%4],roughness:0.4})); sb.position.set(0.42,1.0,0.05); sb.rotation.z=-0.12; sb.castShadow=true; g.add(sb); }
      if(hiker){ const bp=new T.Mesh(new T.BoxGeometry(0.34,0.46,0.2),std({color:[0x2f6b45,0xb3492f,0x2f4f7f][j%3]})); bp.position.set(0,1.2,-0.2); bp.castShadow=true; g.add(bp); }
      const p={g,s:st.pos-PL*0.7+rnd(i*31+j)*PL*0.63,lat:-3.1-rnd(i*17+j)*3.4,face:(rnd(i*5+j)-0.5)*1.5+Math.PI/2};
      place(g,p.s,p.lat,PT,p.face); scene.add(g); pax.push(p);
    }
    return {pax};
  });

  /* traffic on the highway */
  const cars=[]; const carCols=[0xf2f2f2,0x2c3e50,0xb33a2f,0x8a9aa6,0xe0b03a,0x355f4a];
  for(let i=0;i<(AL?0:JP?14:10);i++){ const g=new T.Group(); const col=carCols[i%carCols.length];
    const big=i%4===0; const body=new T.Mesh(new T.BoxGeometry(1.8,big?2.2:0.8,big?7.5:4.3),std({color:col,roughness:0.35,metalness:0.3})); body.position.y=big?1.5:0.62; body.castShadow=true; g.add(body);
    if(!big){ const cb=new T.Mesh(new T.BoxGeometry(1.6,0.6,2.2),std({color:0x1f272b,roughness:0.15})); cb.position.set(0,1.3,0.1); g.add(cb); }
    scene.add(g); const dir=i%2?1:-1; cars.push({g,s:rnd(700+i)*END,v:(JP?(9+rnd(710+i)*5):(14+rnd(710+i)*8))*dir,lat:JP?(dir>0?-16.5:-20):TS?(dir>0?17.5:21.5):(dir>0?-36:-40)}); }

  /* 雲海（阿里山線）：山谷裡一大片會反光的雲 */
  let sea=null;
  if(AL){ const seaTex=tex(512,512,(x,w,h)=>{ x.fillStyle='rgba(255,255,255,0.0)'; x.fillRect(0,0,w,h);
      for(let i=0;i<260;i++){ const cx=Math.random()*w, cy=Math.random()*h, r=30+Math.random()*90; for(const ox of [-w,0,w]) for(const oy of [-h,0,h]){ const g=x.createRadialGradient(cx+ox,cy+oy,0,cx+ox,cy+oy,r); g.addColorStop(0,'rgba(255,255,255,.55)'); g.addColorStop(1,'rgba(255,255,255,0)'); x.fillStyle=g; x.fillRect(cx+ox-r,cy+oy-r,r*2,r*2); } } },true);
    seaTex.repeat.set(26,26);
    const mid=fr(END/2); sea=new T.Mesh(new T.PlaneGeometry(26000,26000),new T.MeshBasicMaterial({map:seaTex,transparent:true,depthWrite:false,color:0xffffff}));
    sea.rotation.x=-Math.PI/2; sea.position.set(mid.x,-125,mid.z); scene.add(sea);
    const base=new T.Mesh(new T.PlaneGeometry(26000,26000),new T.MeshBasicMaterial({color:0xeef2f5})); base.rotation.x=-Math.PI/2; base.position.set(mid.x,-140,mid.z); scene.add(base); sea.userData.base=base; }
  /* 對向列車：每條路線不同塗裝 */
  const LIVERY = AL ? {body:'#b3262b', top:'#b3262b', stripe:'#f2e6c8', cars:4, len:13, w:2.3, h:2.7}
               : JP ? {body:'#2f7d4f', top:'#efe6c6', stripe:'#2f7d4f', cars:2, len:12.6, w:2.5, h:3.0}
               : ROUTE.key==='tamsui' ? {body:'#c9cfd4', top:'#c9cfd4', stripe:'#2457a6', cars:6, len:23.5, w:3.1, h:3.3}
               : {body:'#e6e9ec', top:'#e6e9ec', stripe:'#2f6fb6', cars:4, len:20, w:2.9, h:3.2};
  const sideTex=tex(512,128,(x,w,h)=>{ x.fillStyle=LIVERY.top; x.fillRect(0,0,w,h*0.55); x.fillStyle=LIVERY.body; x.fillRect(0,h*0.55,w,h*0.45);
    x.fillStyle=LIVERY.stripe; x.fillRect(0,h*0.58,w,h*0.09); x.fillStyle='#24323b'; for(let i=0;i<7;i++) x.fillRect(18+i*70,h*0.18,52,h*0.3);
    x.fillStyle='rgba(0,0,0,.28)'; [w*0.22,w*0.62].forEach(dx=>x.fillRect(dx,h*0.15,40,h*0.8)); x.fillStyle='rgba(0,0,0,.25)'; x.fillRect(0,h-6,w,6); });
  const frontTex=tex(256,256,(x,w,h)=>{ x.fillStyle=LIVERY.top; x.fillRect(0,0,w,h*0.55); x.fillStyle=LIVERY.body; x.fillRect(0,h*0.55,w,h*0.45); x.fillStyle=LIVERY.stripe; x.fillRect(0,h*0.6,w,h*0.07);
    x.fillStyle='#1b2329'; x.fillRect(w*0.1,h*0.14,w*0.8,h*0.34); x.fillStyle='#111'; x.fillRect(w*0.3,h*0.04,w*0.4,h*0.08); x.fillStyle='#ffa31a'; x.font='700 22px '+FONT; x.textAlign='center'; x.textBaseline='middle'; x.fillText(signName(STATIONS[0]),w/2,h*0.08);
    x.fillStyle='#f6f2df'; [[0.2,0.78],[0.8,0.78]].forEach(([a,b])=>{ x.beginPath(); x.arc(w*a,h*b,12,0,7); x.fill(); }); });
  const trainMats=[std({map:sideTex,roughness:0.45,metalness:0.2}),std({map:sideTex,roughness:0.45,metalness:0.2}),std({color:0x9aa1a6,roughness:0.6}),std({color:0x22272b}),std({color:new T.Color(LIVERY.body).getHex()}),std({map:frontTex,roughness:0.4})];
  function makeTrain(){
    const cars=[];
    for(let k=0;k<LIVERY.cars;k++){ const g=new T.Group(); const b=new T.Mesh(new T.BoxGeometry(LIVERY.w,LIVERY.h,LIVERY.len-0.7),trainMats); b.position.y=RT+0.35+LIVERY.h/2; b.castShadow=true; g.add(b);
      const bg=new T.Mesh(new T.BoxGeometry(LIVERY.w*0.8,0.5,2.4),M.dark); [-1,1].forEach(z=>{ const c=bg.clone(); c.position.set(0,RT+0.25,z*(LIVERY.len/2-2.4)); g.add(c); });
      if(k===0){ [-0.85,0.85].forEach(xx=>{ const gl=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:0xfff6d8,blending:T.AdditiveBlending,depthWrite:false,transparent:true,fog:false})); gl.position.set(xx*LIVERY.w/2.9,RT+1.1,-(LIVERY.len-0.7)/2-0.1); gl.scale.set(1.8,1.8,1); g.add(gl); }); }
      if(k===LIVERY.cars-1){ [-0.85,0.85].forEach(xx=>{ const gl=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:0xff3020,blending:T.AdditiveBlending,depthWrite:false,transparent:true,fog:false})); gl.position.set(xx*LIVERY.w/2.9,RT+1.1,(LIVERY.len-0.7)/2+0.1); gl.scale.set(0.9,0.9,1); g.add(gl); }); }
      g.visible=false; scene.add(g); cars.push(g); }
    return cars;
  }
  /* 單線會車：對向車先在側線等，我們到站後它出發、從右邊錯車而過 */
  const meets=(ROUTE.loops||[]).map(L=>({L, cars:makeTrain(), front:STATIONS[L.st].pos-15, v:0, state:'wait', st:L.st, tooted:false, passed:false}));
  /* 雙線：對向列車一班接一班從對面開過來 */
  const streams = ROUTE.double ? [0,1].map(()=>({cars:makeTrain(), front:1e9, v:0, wait:0})) : [];

  /* 鳥群：幾群 V 字形的鳥慢慢飛過 */
  const birds=[];
  for(let f=0;f<4;f++){ const g=new T.Group(); const n=5+((rnd(800+f)*5)|0);
    for(let b=0;b<n;b++){ const geo=new T.BufferGeometry().setFromPoints([new T.Vector3(-0.9,0.25,0),new T.Vector3(0,0,0),new T.Vector3(0.9,0.25,0)]); const l=new T.Line(geo,new T.LineBasicMaterial({color:0x2a2f33})); const side=b%2?1:-1, row=Math.ceil(b/2); l.position.set(side*row*2.2,0,row*2.6); g.add(l); }
    const mid=fr(END*(0.2+f*0.25)); g.position.set(mid.x+(rnd(810+f)-0.5)*500, 60+rnd(820+f)*70+mid.y, mid.z+(rnd(830+f)-0.5)*500); g.userData={vx:(rnd(840+f)-0.5)*14, vz:(rnd(850+f)-0.5)*14, ph:rnd(860+f)*6};
    scene.add(g); birds.push(g); }
  /* 低層雲：讓天空有層次 */
  for(let i=0;i<14;i++){ const sp=new T.Sprite(new T.SpriteMaterial({map:cloudTex,fog:false,depthWrite:false,transparent:true,opacity:0.7}));
    const a=rnd(900+i)*Math.PI*2, d=1300+rnd(910+i)*1800, mid=fr(END*rnd(920+i));
    sp.position.set(mid.x+Math.cos(a)*d, 260+rnd(930+i)*300+mid.y, mid.z+Math.sin(a)*d); const sc=500+rnd(940+i)*700; sp.scale.set(sc,sc*0.38,1); scene.add(sp); clouds.push(sp); }
  /* 太陽光暈 */
  const glare=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:0xfff1d6,blending:T.AdditiveBlending,depthWrite:false,depthTest:false,transparent:true,fog:false,opacity:0.55}));
  glare.scale.set(1400,1400,1); glare.renderOrder=5; scene.add(glare);
  /* 櫻花瓣（阿里山車站附近） */
  let petals=null;
  if(AL){ const PN2=260, pp=new Float32Array(PN2*3); for(let i=0;i<PN2;i++){ pp[i*3]=(Math.random()-0.5)*30; pp[i*3+1]=Math.random()*12-3; pp[i*3+2]=-Math.random()*30; }
    const pg=new T.BufferGeometry(); pg.setAttribute('position',new T.BufferAttribute(pp,3));
    petals=new T.Points(pg,new T.PointsMaterial({color:0xf7c6d3,size:0.12,transparent:true,opacity:0.9,depthWrite:false})); petals.frustumCulled=false; cam.add(petals); }

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
    hemi,skyMat,clouds,mountMats:mountMats.concat(jpMounts),M,head,stars,rain,rainSeed,stLights,sea,jpLamp,jpFar,birds,glare,petals,meets,streams,LIVERY};
  applyEnv(); resize();
}

/* ---------- 天氣與時段 ---------- */
const LOOKS={
  morning:{top:0x4f8fcf,mid:0xa9cbe2,hor:0xd9e5e6,sunK:[1,0.93,0.78],sunDir:[-0.72,0.55,-0.25],sunC:0xfff0d8,sunI:1.35,hs:0xdce9f4,hg:0x56653a,hI:0.78,fog:[0xd9e5e6,140,2300],mt:0xffffff,mtO:1,cl:0xffffff,clO:0.85,head:0,lamps:0,stars:false,rain:false},
  dusk:   {top:0x3a5a8c,mid:0xc9a27a,hor:0xf1c48e,sunK:[1.3,0.75,0.4],sunDir:[0.86,0.12,-0.35],sunC:0xffc58a,sunI:1.0,hs:0xc9cdd6,hg:0x4a4436,hI:0.62,fog:[0xc4ab95,260,2800],mt:0xa89ca8,mtO:1,cl:0xffc9a0,clO:0.8,head:0.6,lamps:0.4,stars:false,rain:false},
  night:  {top:0x040914,mid:0x0b152a,hor:0x18243a,sunK:[0.5,0.55,0.7],sunDir:[0.35,0.55,-0.5],sunC:0x7f95d8,sunI:0.14,hs:0x2c3d5c,hg:0x0c0c0c,hI:0.2,fog:[0x101928,50,850],mt:0x1a2335,mtO:1,cl:0x1d2638,clO:0.4,head:2.6,lamps:1.6,stars:true,rain:false},
  dawn0:  {top:0x0a1430,mid:0x1c2a52,hor:0x4a4a6a,sunK:[0.6,0.4,0.3],sunDir:[-0.62,-0.04,-0.78],sunC:0x8090c0,sunI:0.12,hs:0x3a4a70,hg:0x101418,hI:0.3,fog:[0x2a3350,120,1800],mt:0x3a4868,mtO:1,cl:0x404a70,clO:0.5,head:2.2,lamps:1.4,stars:true,rain:false,sea:0x6a7698,seaO:0.9},
  dawn1:  {top:0x3e6ab0,mid:0xe0a070,hor:0xffc890,sunK:[1.5,0.9,0.5],sunDir:[-0.62,0.1,-0.78],sunC:0xffc080,sunI:1.1,hs:0xe8d0c0,hg:0x40402c,hI:0.65,fog:[0xe9c2a0,300,3200],mt:0x9a8fb0,mtO:1,cl:0xffd0b0,clO:0.8,head:0.3,lamps:0.2,stars:false,rain:false,sea:0xfff0e0,seaO:0.95},
  clear:  {top:0x3d7fd0,mid:0x9cc4e8,hor:0xd6e6f0,sunK:[1,0.95,0.85],sunDir:[-0.5,0.7,-0.5],sunC:0xfff4e0,sunI:1.3,hs:0xdde9f4,hg:0x40502c,hI:0.8,fog:[0xd6e3ea,250,3500],mt:0xffffff,mtO:1,cl:0xffffff,clO:0.9,head:0,lamps:0,stars:false,rain:false,sea:0xffffff,seaO:0.95},
  mist:   {top:0xb8c2c8,mid:0xc6ced2,hor:0xd2d8da,sunK:[0,0,0],sunDir:[-0.3,0.8,-0.3],sunC:0xeef2f4,sunI:0.35,hs:0xd8dee2,hg:0x50584a,hI:0.95,fog:[0xcfd5d8,15,260],mt:0xd0d6d8,mtO:0.1,cl:0xc8ced2,clO:1,head:0.8,lamps:0.3,stars:false,rain:false,sea:0xffffff,seaO:0.6},
  rain:   {top:0x6d7780,mid:0x8c959c,hor:0xa9b2b8,sunK:[0,0,0],sunDir:[-0.5,0.8,-0.2],sunC:0xdfe6ec,sunI:0.32,hs:0xc8d0d8,hg:0x4a5040,hI:0.9,fog:[0xa3acb2,30,650],mt:0x9aa4aa,mtO:0.25,cl:0x8d949a,clO:1,head:0.8,lamps:0.3,stars:false,rain:true},
};
function setEnv(key){
  ENV=ENVS[key]||ENVS[ROUTE.envs[0]]; BASE_CLOCK=ENV.clock; try{ localStorage.setItem('cabEnv_'+ROUTE.key,JSON.stringify(ENV.key)); }catch(e){}
  applyEnv(); drawFrame();
}
/* 兩組外觀之間插值（日出列車用：天色隨行車時間從藍調變成日出） */
const LCOLS=['top','mid','hor','sunC','hs','hg','mt','cl','sea'];
function lerpLook(a,b,k){
  const o={}, ca=new THREE.Color(), cb=new THREE.Color();
  for(const key in a){ const x=a[key], y=b[key];
    if(LCOLS.includes(key)) o[key]=ca.setHex(x).lerp(cb.setHex(y),k).getHex();
    else if(key==='fog') o.fog=[ca.setHex(x[0]).lerp(cb.setHex(y[0]),k).getHex(), x[1]+(y[1]-x[1])*k, x[2]+(y[2]-x[2])*k];
    else if(Array.isArray(x)) o[key]=x.map((v,i)=>v+(y[i]-v)*k);
    else if(typeof x==='number') o[key]=x+(y-x)*k;
    else o[key]= k<0.5?x:y; }
  return o;
}
function dawnK(){ const T=STATIONS[STATIONS.length-1].arr; return S.phase==='title' ? 0 : S.phase==='end' ? 1 : smooth(0.05,0.95,S.t/T); }
function applyEnv(){
  if(!R3) return;
  const T=THREE, L= ENV.key==='dawn' ? lerpLook(LOOKS.dawn0,LOOKS.dawn1,dawnK()) : LOOKS[ENV.key], u=R3.skyMat.uniforms, v3=h=>new T.Vector3(((h>>16)&255)/255,((h>>8)&255)/255,(h&255)/255);
  u.top.value=v3(L.top); u.mid.value=v3(L.mid); u.hor.value=v3(L.hor); u.sunK.value.set(...L.sunK);
  R3.SUNDIR.set(...L.sunDir); if(ROUTE.sunFlip) R3.SUNDIR.set(-R3.SUNDIR.x, R3.SUNDIR.y, -R3.SUNDIR.z); if(JP) R3.SUNDIR.set(R3.SUNDIR.z, R3.SUNDIR.y, -R3.SUNDIR.x); R3.SUNDIR.normalize();
  R3.sun.color.setHex(L.sunC); R3.sun.intensity=L.sunI; R3.sun.castShadow=L.sunI>0.5;
  R3.hemi.color.setHex(L.hs); R3.hemi.groundColor.setHex(L.hg); R3.hemi.intensity=L.hI;
  R3.scene.fog.color.setHex(L.fog[0]); R3.scene.fog.near=L.fog[1]; R3.scene.fog.far=L.fog[2];
  R3.mountMats.forEach(m=>{ m.color.setHex(L.mt); m.transparent=L.mtO<1; m.opacity=L.mtO; m.needsUpdate=true; });
  R3.clouds.forEach(c=>{ c.material.color.setHex(L.cl); c.material.opacity=L.clO; });
  R3.head.intensity=L.head; R3.rain.visible=L.rain;
  if(ENV.key==='dawn'){ const k=dawnK(); R3.stars.visible=k<0.7; R3.stars.material.opacity=0.85*(1-k/0.7); } else { R3.stars.visible=L.stars; R3.stars.material.opacity=0.85; }
  if(R3.sea){ R3.sea.material.color.setHex(L.sea); R3.sea.material.opacity=L.seaO; R3.sea.userData.base.material.color.setHex(L.sea).multiplyScalar(0.92); }
  R3.stLights.forEach(l=>l.intensity=L.lamps); if(R3.jpLamp) R3.jpLamp.visible=L.lamps>0.5;
  if(R3.M.apt) R3.M.apt.emissive.setHex(L.lamps>0.5?0xffffff:0);
  if(R3.jpFar) R3.jpFar.forEach(m=>{ if(m.userData.base==null) m.userData.base=m.color.getHex(); m.color.setHex(m.userData.base).multiply(new T.Color(L.mt)); if(L.mtO<1) m.color.lerp(new T.Color(L.fog[0]),0.8); });
  if(R3.M.sea) R3.M.sea.color.setHex(ENV.key==='night'?0x223344:ENV.key==='dusk'?0xd8b8a0:ENV.key==='rain'?0x9aa4aa:0xffffff);
  const glow=L.lamps>0.5;
  R3.M.lampStrip.emissive.setHex(L.lamps>0?0xfff3d6:0); R3.M.lampStrip.emissiveIntensity=Math.min(1,L.lamps);
  R3.M.win.emissive.setHex(glow?0xffc873:0); R3.M.wall.emissive.setHex(glow?0xffffff:0);
  R3.M.steel.roughness = L.rain?0.12:0.28; R3.M.ballast.color.setHex(L.rain?0x9a958c:0xffffff);
  document.body.dataset.env=ENV.key;
}
try{ const k=JSON.parse(localStorage.getItem('cabEnv_'+ROUTE.key)); if(ENVS[k] && ROUTE.envs.includes(k)){ ENV=ENVS[k]; BASE_CLOCK=ENV.clock; } }catch(e){}

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

/* ---------- 蒸汽機車的煙：從前方煙囪冒出，往後飄過駕駛室上方 ---------- */
const PUFFS=[]; let puffT=0;
function drawSteam(dt){
  const run=S.phase==='run' && !S.paused && !S.coachHold;
  if(run){ puffT-=dt; if(puffT<=0){ puffT= S.v>0.15 ? 1/(1.4+S.v*1.7)*2 : 0.9;
    const pow=Math.max(0,S.eff)/5; PUFFS.push({x:W*(0.5+(Math.random()-0.5)*0.03), y:H*0.3, r:H*(0.045+pow*0.03), a:0.55+pow*0.35, vx:(Math.random()-0.5)*W*0.05, vy:-H*(0.12+S.v*0.02)}); } }
  for(let i=PUFFS.length-1;i>=0;i--){ const p=PUFFS[i]; if(run){ p.x+=p.vx*dt; p.y+=p.vy*dt; p.r+=H*0.09*dt*(1+S.v*0.05); p.a-=dt*0.28; } if(p.a<=0 || p.y+p.r<0) PUFFS.splice(i,1); }
  fctx.save();
  for(const p of PUFFS){ const g=fctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r); g.addColorStop(0,'rgba(235,235,232,'+p.a+')'); g.addColorStop(1,'rgba(220,220,215,0)'); fctx.fillStyle=g; fctx.fillRect(p.x-p.r,p.y-p.r,p.r*2,p.r*2); }
  fctx.restore();
}

function render(dt){
  if(!R3){ return; }
  const {renderer,scene,cam,sun,sky,SUNDIR,sig,xings,stations,cars}=R3;
  const f=fr(S.pos), th=f.th, dx=f.dx, dz=f.dz, cx=f.x+f.rx*CAMX, cz=f.z+f.rz*CAMX;
  const vibA=Math.min(1,S.v/18), bob=S.v>0.3?(Math.sin(S.t*31)*0.006+Math.sin(S.t*9.7)*0.012)*vibA:0;
  let jolt=0; for(const o of [0,2.1]){ const d=((S.pos-o)%25+25)%25; if(d<0.35) jolt+=(1-d/0.35)*0.012*vibA; }
  const cy=RT+CAMH+bob-jolt+f.y;
  cam.position.set(cx,cy,cz);
  cam.lookAt(cx+dx*20,cy-1.05+(visElev(S.pos+20)-f.y),cz+dz*20);
  cam.rotateZ((Math.sin(S.t*1.7)*0.002+Math.sin(S.t*0.6)*0.0015)*vibA - kAt(S.pos)*S.v*S.v*0.002);
  sky.position.copy(cam.position); R3.stars.position.copy(cam.position);
  if(ENV.key==='dawn'){ R3.envT=(R3.envT||0)+dt; if(R3.envT>0.3){ R3.envT=0; applyEnv(); } }
  if(R3.head.intensity>0){ R3.head.position.set(f.x+dx*1.2,RT+1.4+f.y,f.z+dz*1.2); const g=fr(S.pos+90); R3.head.target.position.set(g.x,0.3+g.y,g.z); R3.head.target.updateMatrixWorld(); }
  // 對向列車
  const placeTrain=(cars,front)=>{ cars.forEach((g,k)=>{ const sc=front+k*R3.LIVERY.len+R3.LIVERY.len/2; g.visible=sc>S.pos-600 && sc<S.pos+1600; if(g.visible) place(g,sc,loopLat(sc),0,Math.PI); }); };
  R3.meets.forEach(m=>{
    const st=STATIONS[m.st];
    if(m.state==='wait'){ const arrived=S.boarded[m.st]!==undefined && S.t-S.boarded[m.st]>3, passed=S.pos>st.pos+25 || S.next>m.st+1 || S.phase==='end';
      if((arrived||passed) && S.phase!=='title'){ m.state='go'; if(typeof passToot==='function') passToot(); } }
    else if(m.state==='go'){ m.v=Math.min(13,m.v+0.75*dt); const prev=m.front; m.front-=m.v*dt;
      const mid=m.front+R3.LIVERY.len*R3.LIVERY.cars/2; if(!m.passed && prev>S.pos-10 && m.front<=S.pos-10){ m.passed=true; if(typeof whoosh==='function') whoosh(Math.min(1,(m.v+S.v)/20)); }
      if(m.front<m.L.s-500) m.state='gone'; }
    if(S.phase==='title'){ m.state='wait'; m.front=st.pos-15; m.v=0; m.passed=false; }
    if(m.state==='gone'){ m.cars.forEach(g=>g.visible=false); return; }
    placeTrain(m.cars,m.front);
  });
  R3.streams.forEach((t,i)=>{
    if(S.phase!=='run'){ t.cars.forEach(g=>g.visible=false); t.front=1e9; t.wait=i*45+10; return; }
    if(t.front>S.pos+5000 || t.front<S.pos-700){ t.wait-=dt; if(t.wait<=0){ t.front=S.pos+1500+Math.random()*400; t.v=17; t.passed=false; } else { t.cars.forEach(g=>g.visible=false); return; } }
    // 接近對面月台時減速（看起來像要進站）
    let target=19; for(const st of STATIONS){ const d=t.front-(st.pos-PL+20); if(d>-40 && d<220) target=Math.min(target,Math.max(8,d*0.08+8)); }
    t.v+=(target-t.v)*Math.min(1,dt*0.6); const prev=t.front; t.front-=t.v*dt;
    if(!t.passed && prev>S.pos-10 && t.front<=S.pos-10){ t.passed=true; if(typeof whoosh==='function') whoosh(Math.min(1,(t.v+S.v)/22)); }
    if(t.front<S.pos-700){ t.wait=25+Math.random()*30; }
    placeTrain(t.cars,t.front);
  });
  // 鳥群飛行與拍翅
  R3.birds.forEach(g=>{ const u=g.userData; g.position.x+=u.vx*dt; g.position.z+=u.vz*dt; g.rotation.y=Math.atan2(u.vx,u.vz); u.ph+=dt*7; g.children.forEach((l,k)=>{ l.scale.y=0.4+Math.abs(Math.sin(u.ph+k*0.6)); }); });
  // 太陽光暈：只在太陽夠亮、在地平線上時出現
  { const sunUp=R3.SUNDIR.y>-0.02 && R3.sun.intensity>0.6; R3.glare.visible=sunUp; if(sunUp){ R3.glare.position.copy(cam.position).addScaledVector(R3.SUNDIR,5000); R3.glare.material.color.copy(R3.sun.color); } }
  // 櫻花瓣：只在阿里山車站附近飄
  if(R3.petals){ let near=false; for(const st of STATIONS){ if(Math.abs(S.pos-st.pos+PL*0.4)<PL*0.8+60) near=true; } R3.petals.visible=near && ENV.key!=='mist';
    if(R3.petals.visible){ const P=R3.petals.geometry.attributes.position.array; for(let i=0;i<P.length;i+=3){ P[i+1]-=dt*0.9; P[i]+=Math.sin(S.t*1.3+i)*dt*0.6; P[i+2]+=S.v*dt*0.6; if(P[i+1]<-4||P[i+2]>-1){ P[i]=(Math.random()-0.5)*30; P[i+1]=8+Math.random()*4; P[i+2]=-2-Math.random()*30; } } R3.petals.geometry.attributes.position.needsUpdate=true; } }
  if(R3.rain.visible){ const P=R3.rain.geometry.attributes.position.array, Sd=R3.rainSeed, fall=13*dt, rush=S.v*dt;
    for(let i=0;i<Sd.length/3;i++){ let y=Sd[i*3+1]-fall, z=Sd[i*3+2]+rush; if(y<-8||z>-1.5){ y=14; z=-6-Math.random()*44; Sd[i*3]=(Math.random()-0.5)*36; } Sd[i*3+1]=y; Sd[i*3+2]=z;
      const x=Sd[i*3], k=i*6; P[k]=x; P[k+1]=y; P[k+2]=z; P[k+3]=x; P[k+4]=y+0.55; P[k+5]=z-0.06-S.v*0.03; }
    R3.rain.geometry.attributes.position.needsUpdate=true; }
  const steam=TRAIN.sound==='steam';
  if(ENV.rain || steam){ drawFrame(); if(ENV.rain) drawRain(dt); if(steam) drawSteam(dt); R3.fxDirty=true; }
  else if(R3.fxDirty || DROPS.length){ DROPS.length=0; PUFFS.length=0; drawFrame(); R3.fxDirty=false; }
  sun.target.position.set(cx+dx*35,f.y,cz+dz*35); sun.position.copy(sun.target.position).addScaledVector(SUNDIR,200); sun.target.updateMatrixWorld();

  if(sig.lamps.G) ['G','Y','R'].forEach(k=>{ const on=S.sig.aspect===k; sig.lamps[k].m.material.color.setHex(on?sig.lamps[k].col:0x2b2f30); sig.glows[k].visible=on; });

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

