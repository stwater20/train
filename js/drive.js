/* drive.js — 貼近真實的駕駛流程：車掌發車信號、指差喚呼、乘車舒適度、平交道障礙（特殊信號） */
'use strict';

const DJP = !!(ROUTE.japan||ROUTE.jpSign);
const DUI = (()=>{ const b=document.createElement('button'); b.type='button'; b.className='callcue'; b.hidden=true; document.querySelector('.stage').appendChild(b);
  b.addEventListener('click',()=>driveCall()); return b; })();

/* 喚呼的內容（播出語言照路線：日本線日語，台灣線國語） */
const CALLS={
  dep:  ()=>({zh:'出發 進行！', ja:'出発進行！', en:'Departure — proceed!', pts:5}),
  lim:  v=>({zh:`限速 ${v}！`, ja:`制限 ${v}！`, en:`Limit ${v}!`, pts:3}),
  sig:  a=>({zh:{G:'號誌 綠燈 進行！',Y:'號誌 黃燈 注意！',R:'號誌 紅燈 停車！'}[a], ja:{G:'進行！',Y:'注意！',R:'停止！'}[a], en:{G:'Signal green — proceed!',Y:'Signal yellow — caution!',R:'Signal red — stop!'}[a], pts:5}),
  stop: ()=>({zh:'停車位置 好！', ja:'停止位置よし！', en:'Stop position — OK!', pts:3}),
  obs:  ()=>({zh:'障礙物 停車！', ja:'特発 停止！', en:'Obstruction — stop!', pts:5}),
};
const callText=c=> DJP ? (LANG==='en'?c.en:c.ja) : (LANG==='en'?c.en:LANG==='ja'?c.ja:c.zh);

function driveStart(){
  S.depOK = !!S.tut; S.depHold = S.tut?0:1.6; S.depPen=false;
  S.calls={ok:0,tot:0}; S.cue=null; S.cueSeen={};
  S.comfort=100; S.cmfNote=0; S._pa=0; S._pv=0; S.ebSeen=false;
  S.obs=null;
  if(!S.tut && CROSSINGS.length && Math.random()<0.3){
    const cand=CROSSINGS.map((c,i)=>({c,i})).filter(x=>x.c>700);
    if(cand.length){ const p=cand[(Math.random()*cand.length)|0]; S.obs={i:p.i, c:p.c, state:'wait', timer:0}; }
  }
  DUI.hidden=true;
}

/* 指差喚呼：顯示提示，在時間內按 C（或點提示）就加分 */
function cueShow(key,c,until){
  if(S.tut || S.cueSeen[key]) return; S.cueSeen[key]=true;
  S.cue={key,c,until}; S.calls.tot++;
  DUI.innerHTML=`<span class="ci">👉</span><span class="ct"><small>${L('指差喚呼','Point & call','指差喚呼')}</small><b>${callText(c)}</b></span><kbd>C</kbd>`;
  DUI.hidden=false; DUI.classList.remove('done');
}
function cueClear(){ S.cue=null; DUI.hidden=true; }
function driveCall(){
  if(S.phase!=='run' || S.paused) return;
  if(!S.cue){ return; }
  const c=S.cue.c; S.calls.ok++; S.score+=c.pts; S.bonus+=c.pts;
  DUI.classList.add('done'); DUI.querySelector('kbd').textContent='+'+c.pts;
  if(typeof voiceOn!=='undefined' && voiceOn && 'speechSynthesis' in window){ try{ speak(DJP?c.ja:c.zh, DJP?'ja-JP':'zh-TW'); }catch(e){} }
  if(typeof camClick==='function') try{ camClick(); }catch(e){}
  const k=S.cue.key; S.cue=null; setTimeout(()=>{ if(!S.cue) DUI.hidden=true; },900);
  if(S.calls.ok===S.calls.tot && S.calls.tot>=6 && typeof unlockAch==='function') unlockAch('calls');
  return k;
}

/* 發車：關門後要等車掌的發車信號（日本：發車蜂鳴器；台灣：車掌哨音） */
function driveCanPower(){
  if(S.depOK || S.v>1) return true;
  if(DIFF.guide){ toast(L('🔰 等車掌的發車信號再起步','🔰 Wait for the conductor’s departure signal','🔰 車掌の発車合図を待ちましょう')); return false; }
  if(!S.depPen){ S.depPen=true; penal(15,'dep',L('未等發車信號就起步','Moved off before the departure signal','発車合図の前に起動')); }
  S.depOK=true; return true;
}
function driveDoorsClosed(){ S.depOK=false; S.depHold=1.8+Math.random()*1.4; S.depPen=false; }
function departSignal(){
  S.depOK=true;
  toast(DJP?L('車掌發車信號（蜂鳴器）：可以發車','Conductor’s buzzer: clear to depart','車掌から発車合図（ブザー）'):L('車掌吹哨：可以發車','Conductor’s whistle: clear to depart','車掌の笛：発車できます'),'good');
  if(typeof sfxOn!=='undefined' && sfxOn){ try{ actx=actx||new (window.AudioContext||window.webkitAudioContext)(); const t=actx.currentTime, g=actx.createGain(); g.connect(actx.destination);
    if(DJP){ [0,0.32].forEach(d=>{ const o=actx.createOscillator(); o.type='square'; o.frequency.value=330; const og=actx.createGain(); og.gain.setValueAtTime(0,t+d); og.gain.linearRampToValueAtTime(0.035,t+d+0.01); og.gain.setValueAtTime(0.035,t+d+0.2); og.gain.linearRampToValueAtTime(0,t+d+0.22); o.connect(og); og.connect(g); o.start(t+d); o.stop(t+d+0.25); }); }
    else { const o=actx.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(2900,t); const lfo=actx.createOscillator(), ld=actx.createGain(); lfo.frequency.value=28; ld.gain.value=140; lfo.connect(ld); ld.connect(o.frequency);
      g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.05,t+0.03); g.gain.setValueAtTime(0.05,t+0.55); g.gain.linearRampToValueAtTime(0,t+0.62); o.connect(g); o.start(t); lfo.start(t); o.stop(t+0.65); lfo.stop(t+0.65); } }catch(e){} }
  cueShow('dep'+S.next, CALLS.dep(), {t:S.t+8, pos:S.pos+40});
}

/* 停妥後、開門前：喚呼「停車位置好」 */
function driveDoorsOpen(){ if(S.cue && S.cue.key.startsWith('stop')) cueClear(); }

/* 每個物理步驟呼叫一次 */
function driveStep(dt,prev){
  // 發車信號
  if(!S.depOK && !S.doors){ S.depHold-=dt; if(S.depHold<=0) departSignal(); }
  // 喚呼提示：過期就收起來
  if(S.cue){ const u=S.cue.until; if((u.t && S.t>u.t) || (u.pos && S.pos>u.pos) || (u.fn && u.fn())) cueClear(); }
  if(!S.cue && !S.doors){
    // 速限標
    const lim=currentLimit(); const Lm=LIMITS.find(x=>x.s>S.pos && x.s-S.pos<220 && x.s-S.pos>25 && x.v<lim);
    if(Lm) cueShow('lim'+Lm.s, CALLS.lim(Lm.v), {pos:Lm.s});
    // 號誌（花東線閉塞號誌）
    else if(SIGNAL_POS<1e8 && SIGNAL_POS-S.pos<450 && SIGNAL_POS-S.pos>30) cueShow('sig', CALLS.sig(S.sig.aspect), {pos:SIGNAL_POS});
    // 停車後
    else { const st=STATIONS[S.next]; if(st && S.v<0.01 && Math.abs(S.pos-st.pos)<15 && S.depOK) cueShow('stop'+S.next, CALLS.stop(), {fn:()=>S.doors}); }
  }
  // 乘車舒適度：急加減速、猛拉檔、停車衝擊都會扣
  if(S.v>0.3){ const jerk=Math.abs(S.acc-S._pa)/dt; if(jerk>1.6) S.comfort-=(jerk-1.6)*0.9*dt; if(S.acc<-1.12 && S.notch!==-9) S.comfort-=0.9*dt; }
  if(S.notch===-9 && S.v>2 && !S.ebSeen){ S.ebSeen=true; S.comfort-=8; } else if(S.notch!==-9) S.ebSeen=false;
  if(S._pv>0.05 && S.v===0){ const a=-S._pa; if(a>0.62){ const k=Math.min(10,(a-0.62)*14); S.comfort-=k; if(S.t-S.cmfNote>6){ S.cmfNote=S.t; toast(L('停車衝擊：停下來前把煞車放鬆到 B3 以下會更平順','Jolty stop: ease the brake to B3 or less just before stopping','停止時の衝動：止まる直前にブレーキを B3 以下へ緩めると滑らか'),'bad'); } } }
  S.comfort=Math.max(0,S.comfort); S._pa=S.acc; S._pv=S.v;
  // 平交道障礙物
  const O=S.obs; if(O){
    if(O.state==='wait' && S.pos>O.c-820){ O.state='active'; toast(DJP?L('⚠️ 特殊信號發光機閃爍：平交道上有車，立刻停車！','⚠️ Obstruction warning flashing: a car is stuck on the crossing — stop now!','⚠️ 特殊信号発光機 点滅：踏切支障、直ちに停止！'):L('⚠️ 平交道障礙警示燈閃爍：有車卡在平交道上，立刻停車！','⚠️ Crossing obstruction warning: a car is stuck — stop now!','⚠️ 踏切支障の警報：直ちに停止！'),'bad');
      cueShow('obs', CALLS.obs(), {t:S.t+7}); if(DIFF.guide) setTimeout(()=>{ if(S.obs&&S.obs.state==='active') toast(L('🔰 拉緊急煞車（E）！','🔰 Emergency brake (E)!','🔰 非常ブレーキ（E）！'),'good'); },1400); }
    else if(O.state==='active'){
      if(S.v<0.01 && S.pos<O.c-3){ O.state='stopped'; O.timer=7; toast(L('已在平交道前停車，等待障礙排除…','Stopped short of the crossing. Waiting for it to clear…','踏切手前で停止。支障の解除を待っています…'),'good'); }
      else if(S.pos>=O.c-4){ O.state='hit'; penal(200,'obs',L('撞上平交道上的車輛！','Hit the car on the crossing!','踏切支障物と衝突！')); S.notch=-9; renderLever(); }
    } else if(O.state==='stopped'){ O.timer-=dt; if(O.timer<=0){ O.state='clear'; S.score+=20; S.bonus+=20; toast(L('障礙排除，確認安全後再起步 +20','Crossing cleared — proceed with care +20','支障解除、安全を確認して運転再開 +20'),'good'); if(typeof unlockAch==='function') unlockAch('obstacle'); } }
  }
  // 障礙沒排除前不能前進
  if(O && O.state==='stopped' && S.notch>0){ S.notch=0; renderLever(); toast(L('障礙尚未排除，請等待','The crossing isn’t clear yet — wait','支障解除までお待ちください')); }
}

/* 結算：舒適度與喚呼 */
function driveEnd(){
  if(S.driveDone) return; S.driveDone=true;
  const cb=Math.round(Math.max(0,S.comfort-50)*0.8); S.comfortBonus=cb; S.score+=cb; S.bonus+=cb;
  if(S.comfort>=95 && typeof unlockAch==='function') unlockAch('smooth');
  cueClear();
}
function driveEndHTML(){
  const c=Math.round(S.comfort), face=c>=95?'😴':c>=85?'😊':c>=70?'😐':'😣';
  return `<div class="drivestats"><span>${face} ${L('乘車舒適度','Ride comfort','乗り心地')} <b>${c}</b> <em>+${S.comfortBonus||0}</em></span><span>👉 ${L('指差喚呼','Point & call','指差喚呼')} <b>${S.calls.ok}/${S.calls.tot}</b></span>${S.obs&&S.obs.state!=='wait'?`<span>🚧 ${L('平交道障礙','Crossing obstruction','踏切支障')} <b>${S.obs.state==='hit'?L('撞上','Hit','衝突'):L('安全停車','Stopped safely','安全に停止')}</b></span>`:''}</div>`;
}
/* 乘客評語：舒適度 */
function comfortSays(){
  const c=S.comfort;
  if(c<70) return [L('「煞車好急，我整個人往前撲。」','“Such sudden braking, I nearly fell over.”','「ブレーキが急で、前につんのめった。」'),L('站著滑手機的上班族','commuter standing with a phone','スマホを見ていた会社員')];
  if(c>=95) return [L('「好平穩，我差點睡著坐過站。」','“So smooth I almost dozed past my stop.”','「滑らかすぎて、寝過ごすところだった。」'),L('靠窗的高中生','high-schooler by the window','窓際の高校生')];
  return null;
}

/* 平交道障礙的畫面：車子停在軌道上、特殊信號閃爍 */
let obsLamp=null;
function driveRender(dt){
  const O=S.obs; if(!R3 || !O) { if(obsLamp) obsLamp.visible=false; return; }
  const T=THREE;
  if(!obsLamp){
    const c=document.createElement('canvas'); c.width=c.height=64; const x=c.getContext('2d'); const g=x.createRadialGradient(32,32,0,32,32,32); g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(0.25,'rgba(255,255,255,.6)'); g.addColorStop(1,'rgba(255,255,255,0)'); x.fillStyle=g; x.fillRect(0,0,64,64);
    const tx=new T.CanvasTexture(c);
    obsLamp=new T.Group();
    const post=new T.Mesh(new T.CylinderGeometry(0.07,0.07,3.6,8),new T.MeshStandardMaterial({color:0xe8e8e2})); post.position.y=1.8; obsLamp.add(post);
    const head=new T.Mesh(new T.BoxGeometry(0.9,0.9,0.18),new T.MeshStandardMaterial({color:0x151515})); head.position.y=3.6; obsLamp.add(head);
    obsLamp.userData.lamps=[]; [[-0.25,0.25],[0.25,0.25],[0,0],[-0.25,-0.25],[0.25,-0.25]].forEach(([dx,dy])=>{ const m=new T.Mesh(new T.CircleGeometry(0.09,12),new T.MeshBasicMaterial({color:0x3a1010})); m.position.set(dx,3.6+dy,0.1); obsLamp.add(m);
      const s=new T.Sprite(new T.SpriteMaterial({map:tx,color:0xff2a1a,blending:T.AdditiveBlending,depthWrite:false,transparent:true,fog:false})); s.scale.set(3.2,3.2,1); s.position.set(dx,3.6+dy,0.2); obsLamp.add(s); obsLamp.userData.lamps.push({m,s}); });
    R3.scene.add(obsLamp); place(obsLamp,O.c-70,-3.2,0,0);
  }
  const on=O.state==='active'||O.state==='stopped';
  obsLamp.visible=O.state!=='wait';
  const ph=Math.floor(S.t*3)%5;
  obsLamp.userData.lamps.forEach((L,k)=>{ const lit=on && ((k+ph)%5<2); L.m.material.color.setHex(lit?0xff3020:0x3a1010); L.s.visible=lit; });
  const X=R3.xings && R3.xings[O.i]; if(X && X.car){ if(on){ X.car.visible=true; place(X.car,X.c,0.6,0,-Math.PI/2+0.25); } else if(O.state==='clear' || O.state==='hit'){ X.car.visible=false; } }
}

/* 新成就 */
if(typeof ACHS!=='undefined'){
  ACHS.push(
    {id:'calls',    icon:'👉', name:L('指差喚呼達人','Point-and-call pro','指差喚呼の達人'), desc:L('一班車裡每次指差喚呼都做到（至少 6 次）','Make every point-and-call on a run (at least 6)','1回の運転で指差喚呼をすべて実施（6回以上）')},
    {id:'smooth',   icon:'😴', name:L('乘客睡著了','Lulled to sleep','乗客うとうと'), desc:L('乘車舒適度 95 以上開完一班','Finish a run with ride comfort 95 or higher','乗り心地 95 以上で完走')},
    {id:'obstacle', icon:'🚧', name:L('危機處理','Crisis averted','踏切支障に対応'), desc:L('平交道有障礙時及時停車','Stop in time for a car stuck on a crossing','踏切支障で手前に停止')},
  );
}
