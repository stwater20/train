/* main.js — 主迴圈與啟動 */
'use strict';

/* ---------- loop ---------- */
let last=performance.now(), accum=0;
function frame(now){
  const dt=Math.min(0.1,(now-last)/1000); last=now;
  if(S.phase==='run' && !S.paused && !S.coachHold){ accum+=dt; while(accum>=1/60){ step(1/60); accum-=1/60; if(S.phase!=='run') break; } }
  else accum=0;
  tutTick(); audioTick(dt); render(dt); hud(now);
  requestAnimationFrame(frame);
}
function boot(data){
  if(data && data.S && typeof data.S==='object'){ S=Object.assign(fresh(),data.S); }
  document.title=ROUTE.title; document.getElementById('hTitle').textContent=ROUTE.title;
  document.getElementById('hSub').textContent=ROUTE.train+' · '+STATIONS[0].name+' → '+STATIONS[STATIONS.length-1].name+' · '+ROUTE.desc;
  let autoTut=false; try{ autoTut=localStorage.getItem('cabAutoTut')==='1'; localStorage.removeItem('cabAutoTut'); }catch(e){}
  if(autoTut && ROUTE.key==='hualien') startTutorial();
  else if(S.phase==='title') showOverlay('title');
  else if(S.phase==='end') showOverlay('end');
  else if(S.paused) showOverlay('pause');
  else hideOverlay();
  resize(); renderLever();
  const go=()=>{ try{ init3D(); }catch(e){ console.error(e); toast('3D 場景建立失敗','bad'); } };
  // 3D 招牌是畫在 canvas 上的，要先把會用到的中文字形載入，不然會用到系統字型而跑版
  const glyphs=STATIONS.map(s=>s.name+s.en).join('')+Object.values(SIGHTS).flat().join('')+'車站鳴◀▶→‰L0123456789.';
  const fl=document.fonts ? Promise.all(['700 100px "Noto Sans TC"','500 30px "Noto Sans TC"'].map(f=>document.fonts.load(f,glyphs))).then(()=>document.fonts.ready) : Promise.resolve();
  Promise.race([fl, new Promise(r=>setTimeout(r,3000))]).then(go,go);
  requestAnimationFrame(t=>{ last=t; frame(t); });
}
boot({});
