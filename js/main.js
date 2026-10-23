/* main.js — 主迴圈與啟動 */
'use strict';

/* ---------- loop ---------- */
let last=performance.now(), accum=0;
function frame(now){
  const dt=Math.min(0.1,(now-last)/1000); last=now;
  if(S.phase==='run' && !S.paused && !S.coachHold){ accum+=dt; while(accum>=1/60){ step(1/60); accum-=1/60; if(S.phase!=='run') break; } }
  else accum=0;
  tutTick(); render(dt); hud(now);
  requestAnimationFrame(frame);
}
function boot(data){
  if(data && data.S && typeof data.S==='object'){ S=Object.assign(fresh(),data.S); }
  if(S.phase==='title') showOverlay('title');
  else if(S.phase==='end') showOverlay('end');
  else if(S.paused) showOverlay('pause');
  else hideOverlay();
  resize(); renderLever();
  const go=()=>{ try{ init3D(); }catch(e){ console.error(e); toast('3D 場景建立失敗','bad'); } };
  Promise.race([document.fonts?document.fonts.ready:Promise.resolve(), new Promise(r=>setTimeout(r,1500))]).then(go);
  requestAnimationFrame(t=>{ last=t; frame(t); });
}
boot({});
