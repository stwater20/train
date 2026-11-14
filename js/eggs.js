/* eggs.js — 彩蛋：京急黃色幸福列車、太魯閣號會車、阿里山獼猴、頭頂飛過的飛機、流星、噪音投訴、零誤差、駭客模式 */
'use strict';

if(typeof ACHS!=='undefined') ACHS.push(
  {id:'yellow',  icon:'💛', hidden:true, name:L('黃色幸福列車','Yellow Happy Train','イエローハッピートレイン'), desc:L('在京急線遇到黃色的幸福列車','Meet the yellow Happy Train on the Keikyū line','京急線で黄色い電車とすれ違う')},
  {id:'taroko',  icon:'🚄', hidden:true, name:L('太魯閣號會車','Taroko Express crossing','タロコ号と交換'), desc:L('在花東線和太魯閣號會車','Cross the Taroko Express on the Hualien line','花東線でタロコ号と行き違い')},
  {id:'monkey',  icon:'🐒', hidden:true, name:L('獼猴出沒','Macaque spotted','サル出没'), desc:L('在阿里山看到台灣獼猴','Spot a Formosan macaque at Alishan','阿里山でタイワンザルを見つける')},
  {id:'planeover', icon:'🛬', hidden:true, name:L('頭頂飛過','Right overhead','頭上を通過'), desc:L('降落的飛機從列車上方飛過','A landing plane passes right over your train','着陸機が列車の真上を通過')},
  {id:'wish',    icon:'🌠', hidden:true, name:L('許個願吧','Make a wish','願いごと'), desc:L('在晴朗的夜裡看到流星','See a shooting star on a clear night','晴れた夜に流れ星を見る')},
  {id:'noisy',   icon:'📢', hidden:true, name:L('噪音投訴','Noise complaint','騒音の苦情'), desc:L('10 秒內鳴笛 8 次','Sound the horn 8 times in 10 seconds','10 秒間に警笛 8 回')},
  {id:'zero',    icon:'🎯', hidden:true, name:L('神之一停','Dead centre','神の一停'), desc:L('停車誤差 0.00 m','Stop with an error of 0.00 m','停止誤差 0.00 m')},
  {id:'hacker',  icon:'💻', hidden:true, name:L('駭客司機','Hacker driver','ハッカー運転士'), desc:L('找到 SecTools.tw 的隱藏指令','Find the SecTools.tw secret command','SecTools.tw の隠しコマンドを発見')},
);

const EGG={yellowStream:null, taroko:null, monkey:null, monkeySeen:false, star:null, nextStar:0, horns:[], seenSpawn:-1};

/* ---------- 換色的列車材質（黃色幸福列車、太魯閣號） ---------- */
function liveryMats(top,body,stripe,stripe2,win){
  const T=THREE, mk=(w,h,draw)=>{ const c=document.createElement('canvas'); c.width=w; c.height=h; draw(c.getContext('2d'),w,h); const t=new T.CanvasTexture(c); t.encoding=T.sRGBEncoding; return t; };
  const side=mk(512,128,(x,w,h)=>{ x.fillStyle=top; x.fillRect(0,0,w,h*0.55); x.fillStyle=body; x.fillRect(0,h*0.55,w,h*0.45); x.fillStyle=stripe; x.fillRect(0,h*0.58,w,h*0.09); if(stripe2){ x.fillStyle=stripe2; x.fillRect(0,h*0.69,w,h*0.05); }
    x.fillStyle=win||'#24323b'; for(let i=0;i<7;i++) x.fillRect(18+i*70,h*0.18,52,h*0.3); x.fillStyle='rgba(0,0,0,.25)'; [w*0.22,w*0.62].forEach(dx=>x.fillRect(dx,h*0.15,40,h*0.8)); });
  const front=mk(256,256,(x,w,h)=>{ x.fillStyle=top; x.fillRect(0,0,w,h*0.55); x.fillStyle=body; x.fillRect(0,h*0.55,w,h*0.45); x.fillStyle=stripe; x.fillRect(0,h*0.6,w,h*0.07); x.fillStyle='#1b2329'; x.fillRect(w*0.1,h*0.14,w*0.8,h*0.34);
    x.fillStyle='#f6f2df'; [[0.2,0.78],[0.8,0.78]].forEach(([a,b])=>{ x.beginPath(); x.arc(w*a,h*b,12,0,7); x.fill(); }); });
  const std=o=>new T.MeshStandardMaterial(Object.assign({roughness:0.45,metalness:0.2},o));
  return [std({map:side}),std({map:side}),std({color:0x9aa1a6,roughness:0.6}),std({color:0x22272b}),std({color:new T.Color(body).getHex()}),std({map:front})];
}
function setLivery(cars,mats){ cars.forEach(g=>{ const b=g.children[0]; if(!b) return; if(!b.userData.orig) b.userData.orig=b.material; b.material=mats||b.userData.orig; }); }
let YELLOW=null, TAROKO=null;

/* ---------- 每班開始 ---------- */
function eggStart(){
  EGG.horns=[]; EGG.monkeySeen=false; EGG.seenSpawn=-1; EGG.nextStar=(S.t||0)+60+Math.random()*90;
  if(!R3) return;
  // 太魯閣號：花東線的會車列車偶爾是太魯閣號
  if(R3.meets && R3.meets.length && ROUTE.key==='hualien'){ TAROKO=TAROKO||liveryMats('#f4f5f6','#f4f5f6','#d8262e','#f08a1c','#1a1f24');
    R3.meets.forEach(m=>setLivery(m.cars,null)); EGG.taroko = Math.random()<0.25 ? R3.meets[(Math.random()*R3.meets.length)|0] : null; if(EGG.taroko) setLivery(EGG.taroko.cars,TAROKO); }
  // 阿里山獼猴：坐在山邊的石頭上
  if(ROUTE.key==='alishan' && R3.scene){ if(!EGG.monkey) EGG.monkey=makeMonkey(); EGG.monkey.visible=Math.random()<0.45; if(EGG.monkey.visible){ const s=400+Math.random()*2600; EGG.monkey.userData.s=s; place(EGG.monkey,s,3.4,0.05,-Math.PI/2); EGG.monkey.scale.setScalar(1.5); } }
}
function makeMonkey(){
  const T=THREE, g=new T.Group(), fur=new T.MeshStandardMaterial({color:0x7a6248,roughness:0.9}), face=new T.MeshStandardMaterial({color:0xd9a08a,roughness:0.8});
  const rock=new T.Mesh(new T.BoxGeometry(1.2,0.6,1.0),new T.MeshStandardMaterial({color:0x7d7a72,roughness:1})); rock.position.y=0.3; g.add(rock);
  const body=new T.Mesh(new T.BoxGeometry(0.36,0.42,0.3),fur); body.position.y=0.82; g.add(body);
  const head=new T.Mesh(new T.BoxGeometry(0.26,0.24,0.24),fur); head.position.y=1.15; g.add(head);
  const f=new T.Mesh(new T.BoxGeometry(0.18,0.14,0.02),face); f.position.set(0,1.13,0.13); g.add(f);
  const tail=new T.Mesh(new T.BoxGeometry(0.06,0.06,0.35),fur); tail.position.set(0,0.72,-0.28); tail.rotation.x=0.5; g.add(tail);
  g.traverse(o=>{ if(o.isMesh) o.castShadow=true; }); g.visible=false; R3.scene.add(g); return g;
}

/* ---------- 每一幀 ---------- */
function eggTick(dt){
  if(!R3 || S.phase!=='run') return;
  // 京急：剛出發的對向車有機會是黃色幸福列車
  if(ROUTE.key==='keikyu' && R3.streams && R3.lastSpawn!=null && R3.lastSpawn!==EGG.seenSpawn && R3.lastSpawn>0){
    EGG.seenSpawn=R3.lastSpawn; YELLOW=YELLOW||liveryMats('#f6d21c','#f6d21c','#ffffff',null,'#2a2a2a');
    const t=R3.streams.find(x=>x.front<S.pos+2500 && x.front>S.pos); R3.streams.forEach(x=>setLivery(x.cars,null));
    EGG.yellowStream = t && Math.random()<0.12 ? t : null; if(EGG.yellowStream) setLivery(t.cars,YELLOW); }
  const Y=EGG.yellowStream; if(Y && Y.passed && !Y.eggDone){ Y.eggDone=true; if(unlockAch('yellow')) toast(L('💛 是京急的黃色幸福列車！據說看到會有好運','💛 The Keikyū Yellow Happy Train! Seeing it is said to bring luck','💛 京急の黄色い電車！見ると幸せになれるとか'),'good'); }
  const Tk=EGG.taroko; if(Tk && Tk.passed && !Tk.eggDone){ Tk.eggDone=true; if(unlockAch('taroko')) toast(L('🚄 剛剛會車的是太魯閣號！','🚄 That was the Taroko Express!','🚄 今すれ違ったのはタロコ号！'),'good'); }
  // 阿里山獼猴
  const Mk=EGG.monkey; if(Mk && Mk.visible && !EGG.monkeySeen && Math.abs(Mk.userData.s-S.pos)<60 && Mk.userData.s>S.pos){ EGG.monkeySeen=true; Mk.rotation.y+=0; if(unlockAch('monkey')) toast(L('🐒 右邊石頭上有一隻台灣獼猴！','🐒 A Formosan macaque on the rock to your right!','🐒 右の岩にタイワンザル！'),'good'); else toast(L('🐒 獼猴又出現了','🐒 The macaque is back','🐒 またサルが'),''); }
  // 機場：降落的飛機從頭頂飛過
  const Lx=R3x && R3x.lander; if(Lx && Lx.g){ const cp=R3.cam.position, p=Lx.g.position; if(p.y-cp.y<170 && p.y-cp.y>15 && Math.hypot(p.x-cp.x,p.z-cp.z)<140 && !EGG.planeDone){ EGG.planeDone=true; if(unlockAch('planeover')) toast(L('🛬 飛機從頭頂飛過！','🛬 A plane right overhead!','🛬 飛行機が真上を通過！'),'good'); } }
  // 流星：晴朗的夜晚
  if(ENV.night && !ENV.rain && ENV.key!=='first' && S.t>EGG.nextStar && !EGG.star){ EGG.nextStar=S.t+90+Math.random()*120; shootingStar(); }
  if(EGG.star){ const st=EGG.star; st.k+=dt/1.1; const k=Math.min(1,st.k); st.m.position.copy(st.a).lerp(st.b,k); st.m.material.opacity=Math.sin(Math.PI*k); if(k>=1){ R3.scene.remove(st.m); EGG.star=null; } }
}
function shootingStar(){
  const T=THREE, cam=R3.cam, f=fr(S.pos), d=new T.Vector3(f.dx,0,f.dz), r=new T.Vector3(f.rx,0,f.rz);
  const base=cam.position.clone().addScaledVector(d,1800).add(new T.Vector3(0,700+Math.random()*300,0));
  const a=base.clone().addScaledVector(r,-500+Math.random()*300), b=a.clone().addScaledVector(r,520).add(new T.Vector3(0,-180,0));
  const g=new T.BoxGeometry(60,1.6,1.6); const m=new T.Mesh(g,new T.MeshBasicMaterial({color:0xfff6dc,transparent:true,opacity:0,fog:false,depthWrite:false}));
  m.lookAt(b.clone().sub(a).add(m.position)); m.rotation.y=Math.atan2(-(b.z-a.z),b.x-a.x); R3.scene.add(m); EGG.star={m,a,b,k:0};
  setTimeout(()=>{ if(S.phase==='run' && unlockAch('wish')) toast(L('🌠 流星！快許個願','🌠 A shooting star — make a wish!','🌠 流れ星！願いごとを'),'good'); },400);
}

/* ---------- 喇叭與停車 ---------- */
function eggHorn(){ if(S.phase!=='run') return; const now=performance.now(); EGG.horns=EGG.horns.filter(t=>now-t<10000); EGG.horns.push(now);
  if(EGG.horns.length>=8){ EGG.horns=[]; if(unlockAch('noisy')) toast(L('📢 附近居民打電話來投訴：「司機先生，可以不要一直按喇叭嗎？」','📢 A neighbour phoned in: “Could the driver please stop honking?”','📢 近隣住民から苦情：「運転士さん、警笛を鳴らしすぎです」'),'bad'); } }
function eggStop(err){ if(Math.abs(err)<0.005 && unlockAch('zero')) setTimeout(()=>toast(L('🎯 神之一停：誤差 0.00 m！','🎯 Dead centre: 0.00 m!','🎯 神の一停：誤差 0.00 m！'),'good'),900); }

/* ---------- 駭客模式：輸入 sectools（手機：連點時鐘 7 下） ---------- */
let HACK=false; try{ HACK=JSON.parse(localStorage.getItem('cabHack'))===true; }catch(e){}
window.HACK=HACK;
function toggleHack(){
  HACK=!HACK; window.HACK=HACK; try{ localStorage.setItem('cabHack',JSON.stringify(HACK)); }catch(e){}
  if(typeof R3!=='undefined' && R3 && R3.cabUI){ R3.cabUI.monKey=''; }
  document.body.classList.toggle('hack',HACK);
  if(HACK){ unlockAch('hacker'); toast(L('🟢 ACCESS GRANTED — 駕駛台已切換成終端機模式。這是 SecTools.tw 的小彩蛋，再輸入一次可關閉','🟢 ACCESS GRANTED — cab monitor switched to terminal mode. A little SecTools.tw easter egg; enter it again to turn off','🟢 ACCESS GRANTED — 運転台がターミナル表示に。SecTools.tw の小ネタです（もう一度で解除）'),'good'); }
  else toast(L('終端機模式已關閉','Terminal mode off','ターミナル表示を解除'));
}
{ let buf=''; window.addEventListener('keydown',e=>{ if(e.metaKey||e.ctrlKey||e.altKey||e.key.length!==1) return; buf=(buf+e.key.toLowerCase()).slice(-8); if(buf==='sectools') { buf=''; toggleHack(); } }); }
document.addEventListener('DOMContentLoaded',()=>{ document.body.classList.toggle('hack',HACK);
  const clk=document.getElementById('clock'); if(!clk) return; let n=0, t0=0; clk.style.cursor='default';
  clk.addEventListener('click',()=>{ const now=performance.now(); if(now-t0>1500) n=0; t0=now; if(++n>=7){ n=0; toggleHack(); } }); });
/* 終端機風格的駕駛台螢幕（給 render3d 的 drawMon 用） */
function drawHackMon(x,w,h){
  x.fillStyle='#020a04'; x.fillRect(0,0,w,h); x.fillStyle='#3dff7a'; x.font='600 21px ui-monospace,Menlo,monospace'; x.textBaseline='top'; x.textAlign='left';
  const nx=STATIONS[S.next], lines=[`root@cab:~$ ./drive --line ${ROUTE.key}`, `> time  ${fmtClock(BASE_CLOCK+(S.t||0))}`, `> next  ${nx?(nx.no?nx.no+' ':'')+(nx.en||''):'--'}`, `> speed ${Math.round(S.v*3.6)} km/h`, `> sectools.tw ▌`];
  lines.forEach((t,i)=>x.fillText(t,12,12+i*40));
}
