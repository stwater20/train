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
/* 頁面上固定的文字：[選擇器, 屬性, English, 日本語] */
const STATIC_TEXT=[
  ['#bHelp','html','How to drive <kbd>?</kbd>','操作説明 <kbd>?</kbd>'],
  ['.meter:nth-child(2) .lab','text','Time','時刻'], ['.meter:nth-child(3) .lab','text','Score','得点'],
  ['#view','aria-label','View from the cab','運転台からの前方視界'],
  ['.hud-dist small','text','Stop mark','停止位置'], ['#route','aria-label','Route progress','路線の進捗'],
  ['#gauge','aria-label','Speedometer','速度計'], ['.accbar .lab','text','Acceleration m/s²','加減速度 m/s²'],
  ['#roDist','prev','Distance to stop','停止位置まで'], ['#roLimit','prev','Speed limit','制限速度'], ['#roSig','prev','Signal','信号'],
  ['#roAhead','prev','Ahead','前方'], ['#roSched','prev','Scheduled arrival','到着予定'],
  ['#lever','aria-label','Master controller','マスコン'],
  ['#bUp','html','▲ Power<kbd>W / ↑</kbd>','▲ 力行<kbd>W / ↑</kbd>'], ['#bDown','html','▼ Brake<kbd>S / ↓</kbd>','▼ ブレーキ<kbd>S / ↓</kbd>'],
  ['#bDoor','html','Doors<kbd>Space</kbd>','ドア開<kbd>Space</kbd>'], ['#bEB','html','Emergency<kbd>E</kbd>','非常ブレーキ<kbd>E</kbd>'],
  ['#bHorn','html','Horn<kbd>H</kbd>','警笛<kbd>H</kbd>'], ['#bPause','html','Pause<kbd>P</kbd>','一時停止<kbd>P</kbd>'], ['#bN','html','Neutral<kbd>N</kbd>','N に戻す<kbd>N</kbd>'],
  ['.keys','html','Keys: <kbd>W</kbd>/<kbd>↑</kbd> power　<kbd>S</kbd>/<kbd>↓</kbd> brake　<kbd>N</kbd> neutral　<kbd>E</kbd> emergency　<kbd>Space</kbd> doors　<kbd>H</kbd> horn　<kbd>P</kbd> pause　<kbd>?</kbd> help',
                   'キー：<kbd>W</kbd>/<kbd>↑</kbd> 力行　<kbd>S</kbd>/<kbd>↓</kbd> ブレーキ　<kbd>N</kbd> 中立　<kbd>E</kbd> 非常　<kbd>Space</kbd> ドア　<kbd>H</kbd> 警笛　<kbd>P</kbd> 一時停止　<kbd>?</kbd> 説明'],
  ['.foot','html','Made and maintained by <a href="https://sectools.tw/?utm_source=train-game&amp;utm_medium=referral" target="_blank" rel="noopener">SecTools.tw</a> · distances and gradients are stylised',
                   '制作・運営：<a href="https://sectools.tw/?utm_source=train-game&amp;utm_medium=referral" target="_blank" rel="noopener">SecTools.tw</a> · 距離と勾配はゲーム用に簡略化しています'],
];
function applyStaticText(){
  if(LANG==='zh') return;
  const k=LANG==='en'?2:3;
  STATIC_TEXT.forEach(r=>{ const el=document.querySelector(r[0]); if(!el) return;
    if(r[1]==='html') el.innerHTML=r[k]; else if(r[1]==='text') el.textContent=r[k];
    else if(r[1]==='prev'){ const lab=el.parentElement.querySelector('.lab'); if(lab) lab.textContent=r[k]; }
    else el.setAttribute(r[1],r[k]); });
  const err=document.getElementById('roErr'); if(err){ const lab=err.parentElement; lab.firstChild.textContent=L('','Stop error ','停止誤差 '); }
  const md=document.querySelector('meta[name="description"]'); if(md) md.content=L('', '3D cab-view train driving game set in Taiwan: a Hualien local train and the Alishan Forest Railway, with a tutorial. Score on stopping accuracy and punctuality.','台湾を舞台にした運転台視点の3D列車運転ゲーム。花蓮の区間車と阿里山森林鉄道、チュートリアル付き。停止精度と定時運転で得点。');
}
function boot(data){
  applyStaticText();
  if(data && data.S && typeof data.S==='object'){ S=Object.assign(fresh(),data.S); }
  document.getElementById('hTitle').textContent=ROUTE.title;
  document.getElementById('hSub').textContent=ROUTE.train+' · '+stName(STATIONS[0])+' → '+stName(STATIONS[STATIONS.length-1])+' · '+ROUTE.desc;
  let autoTut=false; try{ autoTut=localStorage.getItem('cabAutoTut')==='1'; localStorage.removeItem('cabAutoTut'); }catch(e){}
  if(autoTut && ROUTE.key==='hualien') startTutorial();
  else if(S.phase==='title') showOverlay('title');
  else if(S.phase==='end') showOverlay('end');
  else if(S.paused) showOverlay('pause');
  else hideOverlay();
  resize(); renderLever();
  const go=()=>{ try{ init3D(); }catch(e){ console.error(e); toast(L('3D 場景建立失敗','Could not build the 3D scene','3Dシーンを作成できませんでした'),'bad'); } };
  // 3D 招牌是畫在 canvas 上的，要先把會用到的中文字形載入，不然會用到系統字型而跑版
  const glyphs=STATIONS.map(s=>s.name+s.en).join('')+Object.values(SIGHTS).flat().join('')+'車站鳴◀▶→‰L0123456789.';
  const fl=document.fonts ? Promise.all(['700 100px "Noto Sans TC"','500 30px "Noto Sans TC"'].map(f=>document.fonts.load(f,glyphs))).then(()=>document.fonts.ready) : Promise.resolve();
  Promise.race([fl, new Promise(r=>setTimeout(r,3000))]).then(go,go);
  requestAnimationFrame(t=>{ last=t; frame(t); });
}
boot({});
