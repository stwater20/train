/* audio.js — 行車音效（Web Audio 即時合成，不用音檔）
   分層：輪軌滾動（低頻轟聲＋輪軌摩擦＋鋼軌高頻鳴音）、鋼軌接縫（低沉撞擊＋金屬喀聲）、
   馬達（VVVF：非同步載波 → 同步分段變調；電阻控制：隨車速上升的嗚聲＋凸輪切換喀聲）、柴油引擎、
   車內環境（冷氣、空壓機）、煞車排氣與摩擦、平交道警鈴、關門警示、ATP 警報、雨聲 */
'use strict';

let sfxOn=load('cabSfx',true);
const AU={ready:false};
function setSfx(on){ sfxOn=on; save('cabSfx',on); if(AU.master) AU.master.gain.value=on?1:0; }

function noiseBuf(ctx,sec,kind){
  const b=ctx.createBuffer(1,ctx.sampleRate*sec,ctx.sampleRate), d=b.getChannelData(0); let last=0, b0=0,b1=0,b2=0;
  for(let i=0;i<d.length;i++){ const w=Math.random()*2-1;
    if(kind==='brown'){ last=(last+0.02*w)/1.02; d[i]=last*3.5; }
    else if(kind==='pink'){ b0=0.99765*b0+w*0.0990460; b1=0.96300*b1+w*0.2965164; b2=0.57000*b2+w*1.0526913; d[i]=(b0+b1+b2+w*0.1848)*0.18; }
    else d[i]=w; }
  return b;
}
let DIESEL=TRAIN.sound==='diesel', STEAM=TRAIN.sound==='steam', RESIST=TRAIN.sound==='resistor';
function auRetune(){ DIESEL=TRAIN.sound==='diesel'; STEAM=TRAIN.sound==='steam'; RESIST=TRAIN.sound==='resistor'; }

function auInit(){
  if(AU.ready) return;
  try{ actx=actx||new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return; }
  const c=actx; AU.ready=true;
  if(c.state==='suspended') c.resume();
  AU.master=c.createGain(); AU.master.gain.value=sfxOn?1:0;
  // 一點點壓縮，讓很多層疊在一起時不會爆音
  const comp=c.createDynamicsCompressor(); comp.threshold.value=-18; comp.ratio.value=3; AU.master.connect(comp); comp.connect(c.destination);
  AU.white=noiseBuf(c,3,'white'); AU.brown=noiseBuf(c,4,'brown'); AU.pink=noiseBuf(c,4,'pink');
  const loop=(buf,filt,freq,q)=>{ const s=c.createBufferSource(); s.buffer=buf; s.loop=true; s.loopStart=Math.random(); const f=c.createBiquadFilter(); f.type=filt; f.frequency.value=freq; if(q) f.Q.value=q;
    const g=c.createGain(); g.gain.value=0; s.connect(f); f.connect(g); g.connect(AU.master); s.start(0,Math.random()*2); return {f,g}; };
  // 輪軌滾動：三層
  AU.rumble=loop(AU.brown,'lowpass',160);          // 車體低頻轟聲
  AU.roll=loop(AU.pink,'bandpass',600,0.9);        // 輪軌摩擦
  AU.sing=loop(AU.white,'bandpass',2600,6);        // 鋼軌高頻鳴音
  AU.sing2=loop(AU.white,'bandpass',3900,8);
  AU.wind=loop(AU.pink,'highpass',900);            // 風切
  AU.rain=loop(AU.white,'highpass',2500);          // 雨聲
  AU.hiss=loop(AU.white,'highpass',1800);          // 排氣
  AU.cab=loop(AU.pink,'lowpass',520);              // 車內冷氣風扇
  AU.comp=loop(AU.brown,'bandpass',140,3);         // 空壓機
  // 輪轉的週期起伏（加在滾動聲上）
  AU.flutter=c.createGain(); AU.flutter.gain.value=1; AU.roll.g.disconnect(); AU.roll.g.connect(AU.flutter); AU.flutter.connect(AU.master);
  AU.flutLfo=c.createOscillator(); AU.flutLfo.frequency.value=2; const flutDepth=c.createGain(); flutDepth.gain.value=0.18; AU.flutLfo.connect(flutDepth); flutDepth.connect(AU.flutter.gain); AU.flutLfo.start();

  // 馬達：載波（VVVF 的「嗡—」與分段變調）＋馬達磁聲（隨轉速）
  AU.motBus=c.createGain(); AU.motBus.gain.value=0;
  const motLP=c.createBiquadFilter(); motLP.type='lowpass'; motLP.frequency.value=3200; AU.motBus.connect(motLP); motLP.connect(AU.master); AU.motLP=motLP;
  AU.car=c.createOscillator(); AU.car.type='square'; AU.car.frequency.value=900;
  AU.carG=c.createGain(); AU.carG.gain.value=0.35; AU.car.connect(AU.carG); AU.carG.connect(AU.motBus); AU.car.start();
  AU.fmOsc=c.createOscillator(); AU.fmOsc.frequency.value=10; AU.fmDepth=c.createGain(); AU.fmDepth.gain.value=0; AU.fmOsc.connect(AU.fmDepth); AU.fmDepth.connect(AU.car.frequency); AU.fmOsc.start();
  AU.hum=c.createOscillator(); AU.hum.type='sawtooth'; AU.hum.frequency.value=60; const humBP=c.createBiquadFilter(); humBP.type='bandpass'; humBP.Q.value=1.2; AU.humBP=humBP;
  AU.humG=c.createGain(); AU.humG.gain.value=0.6; AU.hum.connect(humBP); humBP.connect(AU.humG); AU.humG.connect(AU.motBus); AU.hum.start();
  // 柴油引擎：點火脈衝（低頻鋸齒）＋渦輪
  AU.dsl=c.createOscillator(); AU.dsl.type='sawtooth'; AU.dsl.frequency.value=40; const dLP=c.createBiquadFilter(); dLP.type='lowpass'; dLP.frequency.value=380; dLP.Q.value=2;
  AU.dslG=c.createGain(); AU.dslG.gain.value=0; AU.dsl.connect(dLP); dLP.connect(AU.dslG); AU.dslG.connect(AU.master); AU.dsl.start(); AU.dLP=dLP;
  AU.dslAM=c.createOscillator(); AU.dslAM.frequency.value=7; const amD=c.createGain(); amD.gain.value=0.025; AU.dslAM.connect(amD); amD.connect(AU.dslG.gain); AU.dslAM.start();
  AU.turbo=c.createOscillator(); AU.turbo.type='sine'; AU.turbo.frequency.value=2200; AU.turboG=c.createGain(); AU.turboG.gain.value=0; AU.turbo.connect(AU.turboG); AU.turboG.connect(AU.master); AU.turbo.start();
  // 煞車與彎道摩擦尖音
  AU.sqG=c.createGain(); AU.sqG.gain.value=0; AU.sq=c.createOscillator(); AU.sq.type='triangle'; AU.sq.frequency.value=2650; AU.sq.connect(AU.sqG); AU.sqG.connect(AU.master); AU.sq.start();
  AU.lastPos=S.pos; AU.lastEff=S.eff; AU.bellT=0; AU.atpT=0; AU.buzzT=0; AU.hissUntil=0; AU.compT=40+Math.random()*30; AU.compOn=0;
}
['pointerdown','keydown','touchstart'].forEach(ev=>window.addEventListener(ev,auInit,{passive:true}));

const ramp=(p,v,t)=>p.setTargetAtTime(v,actx.currentTime,t||0.08);
/* 鋼軌接縫的一下：低沉撞擊（音高往下掉）＋短促的金屬喀聲；far=後面車廂傳來的，比較悶、比較小 */
function clack(vol,far){
  const c=actx, t=c.currentTime;
  const o=c.createOscillator(), og=c.createGain(); o.type='sine'; o.frequency.setValueAtTime(far?75:95,t); o.frequency.exponentialRampToValueAtTime(far?45:52,t+0.09);
  og.gain.setValueAtTime(0,t); og.gain.linearRampToValueAtTime(vol*(far?0.7:1),t+0.004); og.gain.exponentialRampToValueAtTime(0.0001,t+0.14); o.connect(og); og.connect(AU.master); o.start(t); o.stop(t+0.16);
  const s=c.createBufferSource(); s.buffer=AU.white; const f=c.createBiquadFilter(); f.type='bandpass'; f.frequency.value=(far?900:1800)+Math.random()*300; f.Q.value=2.2;
  const g=c.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol*(far?0.25:0.5),t+0.002); g.gain.exponentialRampToValueAtTime(0.0001,t+0.045);
  s.connect(f); f.connect(g); g.connect(AU.master); s.start(t,Math.random()*2,0.06);
}
function ping(freq,dur,vol,type,delay){
  const c=actx, t=c.currentTime+(delay||0), o=c.createOscillator(), g=c.createGain(); o.type=type||'sine'; o.frequency.value=freq;
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+0.005); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g); g.connect(AU.master); o.start(t); o.stop(t+dur+0.05);
}
function puff(dur,vol){ AU.hissUntil=actx.currentTime+dur; ramp(AU.hiss.g.gain,vol,0.03); }
function chuff(vol){ const c=actx, t=c.currentTime, s=c.createBufferSource(); s.buffer=AU.white; const f=c.createBiquadFilter(); f.type='lowpass'; f.frequency.value=700; const g=c.createGain();
  g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.22); s.connect(f); f.connect(g); g.connect(AU.master); s.start(t,Math.random()*1.5,0.3);
  const o=c.createOscillator(), og=c.createGain(); o.frequency.setValueAtTime(70,t); o.frequency.exponentialRampToValueAtTime(40,t+0.15); og.gain.setValueAtTime(vol*0.8,t); og.gain.exponentialRampToValueAtTime(0.0001,t+0.18); o.connect(og); og.connect(AU.master); o.start(t); o.stop(t+0.2); }
/* 電阻控制的凸輪切換「喀」 */
function camClick(){ const c=actx, t=c.currentTime, s=c.createBufferSource(); s.buffer=AU.white; const f=c.createBiquadFilter(); f.type='bandpass'; f.frequency.value=2400; f.Q.value=4; const g=c.createGain();
  g.gain.setValueAtTime(0.09,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.03); s.connect(f); f.connect(g); g.connect(AU.master); s.start(t,Math.random(),0.04); }

/* 鋼軌接縫：每節車兩個轉向架、每個轉向架兩根軸 → 「喀噠—喀噠」；駕駛室在第一節車的前轉向架上方 */
const RAIL=ROUTE.railLen, CARL=ROUTE.key==='alishan'?11:ROUTE.key==='enoden'?12.6:20, BOG=ROUTE.key==='alishan'?1.4:2.1;
const AXLES=[0,BOG, CARL-2.4-BOG,CARL-2.4, CARL,CARL+BOG];
/* VVVF：依馬達頻率決定聲音（非同步載波 → 同步分段 → 單脈衝） */
function vvvf(kmh,eff,braking){
  const fm=Math.max(0.5,kmh*1.55)*(TRAIN.pitch||1);   // 馬達電氣頻率（Hz）
  let carrier, fmDepth, hum=fm*6;
  if(fm<22){ carrier=(TRAIN.pitch||1)>1.05?1050:780; fmDepth=fm*2; }      // 起步：固定載波「嗡—」
  else if(fm<70){ const N=fm<35?27:fm<50?15:9; carrier=fm*N; fmDepth=fm*0.6; } // 同步模式：音高跟著速度往上，換段時往下掉
  else { carrier=fm*3; fmDepth=0; }                                          // 高速：單／三脈衝，主要是馬達聲
  AU.car.frequency.setTargetAtTime(carrier,actx.currentTime,0.04); AU.fmOsc.frequency.setTargetAtTime(fm*2,actx.currentTime,0.05); ramp(AU.fmDepth.gain,fmDepth,0.05);
  AU.hum.frequency.setTargetAtTime(hum,actx.currentTime,0.05); AU.humBP.frequency.setTargetAtTime(Math.min(4000,hum*1.4),actx.currentTime,0.05);
  ramp(AU.carG.gain, fm<70?0.32:0.08, 0.2); ramp(AU.humG.gain, 0.25+Math.min(0.5,fm/120), 0.2);
  const vol = eff>0 ? 0.035+0.01*eff : braking ? 0.03 : 0;
  ramp(AU.motBus.gain, vol, eff>0||braking?0.08:0.25);
}
function resistorMotor(kmh,eff,braking){
  const f=40+kmh*9*(TRAIN.pitch||1);
  AU.car.frequency.setTargetAtTime(f*2,actx.currentTime,0.08); ramp(AU.fmDepth.gain,0,0.1); ramp(AU.carG.gain,0.05,0.2);
  AU.hum.frequency.setTargetAtTime(f,actx.currentTime,0.08); AU.humBP.frequency.setTargetAtTime(f*1.6,actx.currentTime,0.08); ramp(AU.humG.gain,0.8,0.2);
  ramp(AU.motBus.gain, kmh>1 ? (eff>0?0.04+0.006*eff:0.022) : 0, 0.15);   // 電阻車滑行時齒輪聲還在
}

function audioTick(dt){
  if(!AU.ready || !sfxOn) return;
  const run=S.phase==='run' && !S.paused && !S.coachHold, v=run?S.v:0, kmh=v*3.6, eff=run?S.eff:0;
  // 輪軌滾動
  const k=Math.min(1,v/25);
  ramp(AU.rumble.g.gain, v>0.05 ? 0.06+0.22*k : 0, 0.25); AU.rumble.f.frequency.value=110+v*5;
  ramp(AU.roll.g.gain, v>0.3 ? 0.05+0.22*Math.pow(k,1.2) : 0, 0.25); AU.roll.f.frequency.value=380+v*22;
  ramp(AU.sing.g.gain, v>4 ? 0.012+0.035*k : 0, 0.4); ramp(AU.sing2.g.gain, v>8 ? 0.02*k : 0, 0.4);
  AU.flutLfo.frequency.value=Math.max(0.3, v/2.7);           // 車輪轉一圈的週期（輪徑約 0.86 m）
  ramp(AU.wind.g.gain, Math.min(0.08,k*k*0.08), 0.3);
  ramp(AU.rain.g.gain, (ENV.rain? (run?0.04+k*0.05:0.03) : 0), 0.4);
  // 車內環境：冷氣一直在、空壓機每隔一陣子打一下（停車時最明顯）
  const elec=!DIESEL && !STEAM;
  ramp(AU.cab.g.gain, run&&elec ? 0.03 : 0, 0.6);
  if(run && elec){ AU.compT-=dt; if(AU.compT<=0){ if(AU.compOn<=0){ AU.compOn=10+Math.random()*6; AU.compT=AU.compOn; } else { AU.compOn=0; AU.compT=50+Math.random()*40; } } }
  ramp(AU.comp.g.gain, run&&elec&&AU.compOn>0 ? 0.06 : 0, 0.5);

  // 動力
  const braking = eff<0 && eff>-9 && v>2;
  if(STEAM){
    ramp(AU.motBus.gain,0,0.2); ramp(AU.dslG.gain,0,0.3); ramp(AU.turboG.gain,0,0.3);
    if(run && v>0.15){ AU.chuffT=(AU.chuffT||0)-dt; if(AU.chuffT<=0){ AU.chuffT=1/(1.4+v*1.7); chuff(eff>0? 0.12+0.025*eff : 0.035); } }
    if(run) ramp(AU.hiss.g.gain, Math.max(0.008, actx.currentTime<AU.hissUntil?0.06:0.008), 0.3);
  } else if(DIESEL){
    ramp(AU.motBus.gain,0,0.2);
    const rpm=run ? 600+Math.max(0,eff)*240 : 0, fire=rpm/60*4;   // 8 汽缸四行程：每轉 4 次點火
    if(run){ AU.dsl.frequency.setTargetAtTime(fire,actx.currentTime,0.6); AU.dslAM.frequency.setTargetAtTime(rpm/120,actx.currentTime,0.6); AU.dLP.frequency.setTargetAtTime(220+rpm*0.25,actx.currentTime,0.6); }
    ramp(AU.dslG.gain, run ? 0.07+Math.max(0,eff)*0.012 : 0, 0.5);
    AU.turbo.frequency.setTargetAtTime(1600+rpm*1.2,actx.currentTime,0.8); ramp(AU.turboG.gain, run ? 0.002+Math.max(0,eff)*0.0022 : 0, 0.8);
  } else {
    ramp(AU.dslG.gain,0,0.3); ramp(AU.turboG.gain,0,0.3);
    if(RESIST){ resistorMotor(kmh,eff,braking); if(run && eff>0 && eff!==AU.lastEff) camClick(); }
    else vvvf(kmh,eff,braking);
  }

  // 煞車排氣
  if(run && eff!==AU.lastEff){
    if(eff<AU.lastEff && eff<0) puff(0.25,0.05);
    else if(eff>AU.lastEff && AU.lastEff<0) puff(eff>=0?0.7:0.35, eff>=0?0.09:0.05);
    if(eff===-9 && AU.lastEff!==-9) puff(1.6,0.16);
  }
  AU.lastEff=eff;
  if(actx.currentTime>AU.hissUntil && !STEAM) ramp(AU.hiss.g.gain,0,0.15);

  // 低速煞車摩擦、急彎輪緣摩擦
  let sq = run && S.curF<-0.25 && v>0.15 && v<4 ? 0.012*(1-v/4)+0.004 : 0, sqF=2600;
  const kk=Math.abs(kAt(S.pos));
  if(run && kk>0.0052 && v>1.2){ sq=Math.max(sq, 0.01+0.012*Math.min(1,(kk-0.0052)/0.002)*(0.6+0.4*Math.sin(S.t*7.3))); sqF=3300; }
  ramp(AU.sqG.gain, sq, 0.1); AU.sq.frequency.value=sqF+Math.sin(S.t*23)*40;

  // 鋼軌接縫
  if(run && v>0.8){
    const p0=AU.lastPos, p1=S.pos, vol=Math.min(0.42,0.06+v/25*0.36);
    AXLES.forEach((o,i)=>{ const a=Math.floor((p0-o)/RAIL), b=Math.floor((p1-o)/RAIL); if(b>a) clack(vol*(i<2?1:i<4?0.55:0.35), i>=2); });
  }
  AU.lastPos=S.pos;

  // 平交道警鈴：日本是電子音「カンカン」，台灣是鐘聲「噹噹」
  const near=CROSSINGS.map(c=>({c,d:Math.abs(S.pos-c)})).find(x=>S.pos>x.c-450 && S.pos<x.c+TRAIN_LEN+5);
  if(run && near){ AU.bellT-=dt; if(AU.bellT<=0){ const vol=0.14/(1+near.d/90);
    if(ROUTE.japan){ AU.bellT=0.42; ping(760,0.22,vol,'square'); ping(1520,0.1,vol*0.25,'sine'); }
    else { AU.bellT=0.5; ping(1250,0.5,vol,'triangle'); ping(2510,0.25,vol*0.3,'sine'); ping(3760,0.12,vol*0.12,'sine'); } } }

  // ATP 警報
  if(run && (S.atpOver||S.atpSig||S.spad)){ AU.atpT-=dt; if(AU.atpT<=0){ AU.atpT=0.5; ping(1000,0.14,0.06,'square'); ping(800,0.14,0.06,'square',0.17); } } else AU.atpT=0;
  // 關門警示（關門前 3 秒）
  if(run && S.doors && S.dwell<3.2){ AU.buzzT-=dt; if(AU.buzzT<=0){ AU.buzzT=0.6; ping(660,0.35,0.05,'square'); } } else AU.buzzT=0;
}
/* 開關門：氣壓聲＋門碰到底的悶響 */
function doorSound(open){ if(!AU.ready||!sfxOn) return; puff(open?0.5:0.4,0.07); ping(open?140:110,0.25,0.12,'sine',open?0.35:0.3); }

/* 錯車：一陣風切聲 */
function whoosh(k){
  if(!AU.ready || !sfxOn || k<0.15) return;
  const c=actx, t=c.currentTime, s=c.createBufferSource(); s.buffer=AU.pink; const f=c.createBiquadFilter(); f.type='bandpass'; f.frequency.setValueAtTime(400,t); f.frequency.linearRampToValueAtTime(1200,t+0.4); f.frequency.linearRampToValueAtTime(300,t+1.6);
  const g=c.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.3*k,t+0.25); g.gain.exponentialRampToValueAtTime(0.0001,t+1.8);
  s.connect(f); f.connect(g); g.connect(AU.master); s.start(t,Math.random(),2);
}
/* 對向車發車前的短鳴笛 */
function passToot(){
  if(!AU.ready || !sfxOn) return;
  [0,0.45].forEach(d=>{ [330,440].forEach(fr=>ping(fr,0.3,0.03,'triangle',d)); });
}
