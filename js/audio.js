/* audio.js — 行車音效：輪軌聲、鋼軌接縫、馬達聲、排氣、煞車摩擦、平交道警鈴、關門警示、ATP 警報、雨聲 */
'use strict';

let sfxOn=load('cabSfx',true);
const AU={ready:false};
function setSfx(on){ sfxOn=on; save('cabSfx',on); if(AU.master) AU.master.gain.value=on?1:0; }

function noiseBuf(ctx,sec,brown){
  const b=ctx.createBuffer(1,ctx.sampleRate*sec,ctx.sampleRate), d=b.getChannelData(0); let last=0;
  for(let i=0;i<d.length;i++){ const w=Math.random()*2-1; if(brown){ last=(last+0.02*w)/1.02; d[i]=last*3.5; } else d[i]=w; }
  return b;
}
function auInit(){
  if(AU.ready) return;
  try{ actx=actx||new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return; }
  const c=actx; AU.ready=true;
  if(c.state==='suspended') c.resume();
  AU.master=c.createGain(); AU.master.gain.value=sfxOn?1:0; AU.master.connect(c.destination);
  AU.white=noiseBuf(c,2,false); AU.brown=noiseBuf(c,4,true);
  const loop=(buf,filt,freq,q)=>{ const s=c.createBufferSource(); s.buffer=buf; s.loop=true; const f=c.createBiquadFilter(); f.type=filt; f.frequency.value=freq; if(q) f.Q.value=q;
    const g=c.createGain(); g.gain.value=0; s.connect(f); f.connect(g); g.connect(AU.master); s.start(); return {f,g}; };
  AU.rumble=loop(AU.brown,'lowpass',140);       // 輪軌滾動低頻
  AU.wind=loop(AU.white,'bandpass',900,0.6);   // 風切
  AU.rain=loop(AU.white,'highpass',2500);       // 雨聲
  AU.hiss=loop(AU.white,'highpass',1800);       // 排氣聲（煞車缸）
  // VVVF 馬達：兩個鋸齒波經帶通
  AU.motG=c.createGain(); AU.motG.gain.value=0; const mf=c.createBiquadFilter(); mf.type='bandpass'; mf.frequency.value=900; mf.Q.value=0.8;
  AU.mot=[0,1].map(k=>{ const o=c.createOscillator(); o.type='sawtooth'; o.frequency.value=200; o.connect(mf); o.start(); return o; });
  mf.connect(AU.motG); AU.motG.connect(AU.master); AU.motF=mf;
  // 煞車摩擦尖音
  AU.sqG=c.createGain(); AU.sqG.gain.value=0; AU.sq=c.createOscillator(); AU.sq.type='triangle'; AU.sq.frequency.value=2650; AU.sq.connect(AU.sqG); AU.sqG.connect(AU.master); AU.sq.start();
  AU.lastPos=S.pos; AU.lastEff=S.eff; AU.bellT=0; AU.atpT=0; AU.buzzT=0; AU.hissUntil=0;
}
['pointerdown','keydown','touchstart'].forEach(ev=>window.addEventListener(ev,auInit,{passive:true}));

const ramp=(p,v,t)=>p.setTargetAtTime(v,actx.currentTime,t||0.08);
function clack(delay,vol){
  const c=actx, t=c.currentTime+delay, s=c.createBufferSource(); s.buffer=AU.white;
  const f=c.createBiquadFilter(); f.type='bandpass'; f.frequency.value=380+Math.random()*80; f.Q.value=1.4;
  const g=c.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+0.004); g.gain.exponentialRampToValueAtTime(0.0001,t+0.09);
  s.connect(f); f.connect(g); g.connect(AU.master); s.start(t,Math.random()*1.5,0.12);
}
function ping(freq,dur,vol,type,delay){
  const c=actx, t=c.currentTime+(delay||0), o=c.createOscillator(), g=c.createGain(); o.type=type||'sine'; o.frequency.value=freq;
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+0.005); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g); g.connect(AU.master); o.start(t); o.stop(t+dur+0.05);
}
function puff(dur,vol){ AU.hissUntil=actx.currentTime+dur; ramp(AU.hiss.g.gain,vol,0.03); }

/* 鋼軌每 25 m 一個接縫；駕駛室在第一節車的前轉向架上方，聽到的是一輪一輪的「喀噠—喀噠」 */
const RAIL=25, AXLES=[0,2.1,15.9,18.0, 20+0,20+2.1, 20+15.9,20+18.0];
function audioTick(dt){
  if(!AU.ready || !sfxOn) return;
  const run=S.phase==='run' && !S.paused && !S.coachHold, v=run?S.v:0, kmh=v*3.6;
  ramp(AU.rumble.g.gain, v>0.05 ? 0.10+Math.min(0.32,v/25*0.32) : 0, 0.2);
  AU.rumble.f.frequency.value=90+v*9;
  ramp(AU.wind.g.gain, Math.min(0.10,(v/25)**2*0.10), 0.3);
  AU.wind.f.frequency.value=600+v*30;
  ramp(AU.rain.g.gain, (ENV.rain? (run?0.05+v/25*0.05:0.04) : 0), 0.4);

  // 馬達：加速時明顯，回生煞車時較小
  const eff=run?S.eff:0;
  const motVol = eff>0 ? 0.025+0.012*eff : (eff<0 && eff>-9 && v>2 ? 0.02 : 0);
  ramp(AU.motG.gain, motVol, 0.12);
  const base=120+kmh*14; AU.mot[0].frequency.value=base; AU.mot[1].frequency.value=base*1.5+3; AU.motF.frequency.value=500+kmh*20;

  // 煞車排氣：加大煞車或鬆開煞車時「噗嘶」
  if(run && eff!==AU.lastEff){
    if(eff<AU.lastEff && eff<0) puff(0.25,0.05);
    else if(eff>AU.lastEff && AU.lastEff<0) puff(eff>=0?0.7:0.35, eff>=0?0.09:0.05);
    if(eff===-9 && AU.lastEff!==-9) puff(1.6,0.16);
  }
  AU.lastEff=eff;
  if(actx.currentTime>AU.hissUntil) ramp(AU.hiss.g.gain,0,0.15);

  // 低速煞車摩擦聲
  const sq = run && S.curF<-0.25 && v>0.15 && v<4 ? 0.012*(1-v/4)+0.004 : 0;
  ramp(AU.sqG.gain, sq, 0.1); AU.sq.frequency.value=2600+Math.sin(S.t*23)*40;

  // 鋼軌接縫
  if(run && v>0.8){
    const p0=AU.lastPos, p1=S.pos, vol=Math.min(0.5,0.08+v/25*0.4);
    AXLES.forEach(o=>{ const a=Math.floor((p0-o)/RAIL), b=Math.floor((p1-o)/RAIL); if(b>a) clack(0,vol*(o<5?1:0.55)); });
  }
  AU.lastPos=S.pos;

  // 平交道警鈴
  const near=CROSSINGS.map(c=>({c,d:Math.abs(S.pos-c)})).find(x=>S.pos>x.c-450 && S.pos<x.c+TRAIN_LEN+5);
  if(run && near){ AU.bellT-=dt; if(AU.bellT<=0){ AU.bellT=0.38; const vol=0.16/(1+near.d/90); ping(1480,0.32,vol,'triangle'); ping(2960,0.12,vol*0.3,'sine'); } }

  // ATP 警報
  if(run && (S.atpOver||S.atpSig||S.spad)){ AU.atpT-=dt; if(AU.atpT<=0){ AU.atpT=0.5; ping(1000,0.14,0.06,'square'); ping(800,0.14,0.06,'square',0.17); } } else AU.atpT=0;

  // 關門警示蜂鳴（關門前 3 秒）
  if(run && S.doors && S.dwell<3.2){ AU.buzzT-=dt; if(AU.buzzT<=0){ AU.buzzT=0.6; ping(660,0.35,0.05,'square'); } } else AU.buzzT=0;
}
/* 開關門時的氣壓聲 */
function doorSound(open){ if(!AU.ready||!sfxOn) return; puff(open?0.5:0.4,0.07); ping(open?140:110,0.25,0.12,'sine',open?0.35:0.3); }
