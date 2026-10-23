/* game.js — 遊戲狀態、列車物理、ATP、號誌、進站計分、操作與畫面切換 */
'use strict';

/* ---------- state ---------- */
function fresh(){
  return {phase:'title', paused:false, t:0, pos:0, v:0, acc:0, curF:0, notch:-8, eff:-8,
    next:1, doors:false, dwell:0, score:0, log:[], pens:{over:0,atp:0,spad:0,eb:0,miss:0}, bonus:0,
    overT:0, overOn:false, atpOver:false, atpSig:false, spad:false,
    sig:{aspect:'R', phase:0, timer:0}, yellowUntil:-1, hornPos:-9999, crossDone:[], boarded:{}, tut:false, coachHold:false};
}
let S = fresh();

/* ---------- messages ---------- */
const toastEl=document.getElementById('toast'); let toastTimer=0;
function toast(msg, kind){ toastEl.textContent=msg; toastEl.className='toast'+(kind?' '+kind:''); toastEl.removeAttribute('data-off'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>toastEl.setAttribute('data-off',''), 2800); }
function penal(p,key,msg){ S.score-=p; S.pens[key]=(S.pens[key]||0)+p; toast(msg+' −'+p,'bad'); }

/* ---------- simulation ---------- */
function currentLimit(){
  let lim=LINE_MAX; const p=S.pos;
  for(const L of LIMITS) if(p>=L.s && p<=L.e+TRAIN_LEN) lim=Math.min(lim,L.v);
  if(S.yellowUntil>0 && p<S.yellowUntil) lim=Math.min(lim,45);
  return lim;
}
function step(dt){
  S.t+=dt;
  const prev=S.pos, sg=S.sig, dSig=SIGNAL_POS-S.pos;
  // block signal: a preceding train is still clearing the block toward 平和
  if(sg.phase===0 && dSig>0 && dSig<700 && (dSig<280 || (S.v<0.1 && S.pos>2700))){ sg.phase=1; sg.timer=12; }
  else if(sg.phase===1){ sg.timer-=dt; if(sg.timer<=0){ sg.aspect='Y'; sg.phase=2; sg.timer=18; toast('號誌轉為黃燈：注意運轉，限速 45 km/h'); } }
  else if(sg.phase===2){ sg.timer-=dt; if(sg.timer<=0){ sg.aspect='G'; sg.phase=3; } }

  const lim=currentLimit(), kmh=S.v*3.6;
  let forced=0;
  if(S.spad){ forced=-9; if(S.v<0.01) S.spad=false; }
  else{
    if(!S.atpOver && kmh>lim+5){ S.atpOver=true; penal(30,'atp','ATP 介入：超過限速'); }
    if(S.atpOver){ if(kmh<=lim-1){ S.atpOver=false; toast('ATP 解除，恢復手動'); } else forced=-8; }
    if(sg.aspect==='R' && dSig>0 && dSig<700){
      const allow=Math.sqrt(Math.max(0,2*1.0*(dSig-10)));
      if(!S.atpSig && S.v>allow+0.6){ S.atpSig=true; penal(30,'atp','ATP 介入：前方紅燈'); }
    }
    if(S.atpSig){ if(S.v<0.01 || sg.aspect!=='R') S.atpSig=false; else forced=-9; }
  }
  if(kmh>lim+1){ if(!S.overOn){ S.overOn=true; if(!S.atpOver) toast('超過限速 '+lim+' km/h','bad'); } S.overT+=dt; while(S.overT>=1){ S.overT-=1; S.score-=2; S.pens.over+=2; } }
  else S.overOn=false;

  let n=S.notch;
  if(forced){ n = S.notch<forced ? S.notch : forced; }
  if(S.doors && n>0) n=-4;
  S.eff=n;
  let target; S.slip=false;
  if(n>0){ const amax=0.95*n/5; target=amax*Math.min(1,9/Math.max(S.v,0.01));
    // 雨天軌面濕滑：低速大檔位容易空轉
    if(ENV.rain && n>=4 && S.v<12){ S.slip = Math.sin(S.t*5.3)+Math.sin(S.t*2.1)>0.6; target*=S.slip?0.55:0.8; } }
  else if(n===0) target=0;
  else target=-(n===-9?1.45:0.13*(-n))*(ENV.rain?0.85:1);
  S.curF += (target-S.curF)*Math.min(1, dt/(target<S.curF?0.45:0.7));
  const res = S.v>0.01 ? 0.015+0.0005*S.v+0.00009*S.v*S.v : 0;
  S.grade=trainGrade(S.pos);
  const gravity = 9.81*S.grade/1000;
  // 靜止時只要有煞車就不會溜動
  const held = S.v<0.01 && S.curF<=0.02 && (n<0 || gravity>0);
  let a = held ? 0 : S.curF-res-gravity;
  if(held) S.v=0;
  S.v+=a*dt; if(S.v<0){ S.v=0; }
  if(S.v===0 && a<0) a=0;
  S.acc=a; S.pos+=S.v*dt;

  if(prev<SIGNAL_POS && S.pos>=SIGNAL_POS){
    if(sg.aspect==='R'){ S.spad=true; penal(150,'spad','冒進號誌！緊急停車'); }
    else if(sg.aspect==='Y'){ S.yellowUntil=SIGNAL_POS+400; }
  }
  CROSSINGS.forEach((c,i)=>{
    if(prev<c && S.pos>=c && !S.crossDone[i]){
      S.crossDone[i]=true;
      if(S.hornPos>=c-350 && S.hornPos<=c){ S.score+=10; S.bonus+=10; toast('平交道前鳴笛確認 +10','good'); }
      else toast('通過平交道：下次記得在「鳴」標附近鳴笛');
    }
  });

  if(S.doors){
    S.dwell-=dt;
    if(S.dwell<=0){
      S.doors=false; doorSound(false);
      if(S.next>=STATIONS.length-1){ endGame(); return; }
      S.next++; toast('車門關閉，可以發車','good'); extrasDepart();
    }
  } else {
    const st=STATIONS[S.next];
    if(st && S.pos-st.pos>15){
      S.score-=60; S.pens.miss+=60;
      S.log.push({name:st.name, miss:true, pp:0, tp:0, total:-60});
      toast('過站！未停靠 '+st.name+' −60','bad');
      if(S.next>=STATIONS.length-1){ endGame(); return; }
      S.next++; extrasDepart();
    }
  }
}

/* ---------- player actions ---------- */
function setNotch(n){
  if(S.phase!=='run' || S.paused) return;
  n=clamp(n,-9,5);
  if(n>0 && S.doors){ toast('車門開啟中，無法加速'); return; }
  if(n===-9 && S.notch!==-9 && S.v>2) penal(10,'eb','使用緊急煞車');
  S.notch=n; renderLever();
}
function action(){
  if(S.phase==='title'){ startGame(); return; }
  if(S.phase!=='run' || S.paused) return;
  if(S.doors){ toast('旅客上下車中…'); return; }
  const st=STATIONS[S.next]; if(!st) return;
  const err=S.pos-st.pos;
  if(err<-15){ toast(err>-400 ? '距停車位置還有 '+(-err).toFixed(1)+' m' : '還沒到 '+st.name+' 站'); return; }
  if(S.v>0.01){ toast('列車尚未停妥'); return; }
  const ae=Math.abs(err); let pp, rank;
  if(ae<=0.5){pp=100;rank='完美';} else if(ae<=1){pp=80;rank='優秀';} else if(ae<=3){pp=55;rank='良好';} else if(ae<=8){pp=25;rank='普通';} else {pp=5;rank='勉強';}
  const late=S.t-st.arr; let tp, trank;
  if(late<-20){tp=20;trank='早到';} else if(late<=5){tp=40;trank='準點';} else {tp=Math.max(0,Math.round(40-(late-5)*1.5));trank='延誤';}
  S.score+=pp+tp;
  S.log.push({name:st.name, err, rank, pp, late, trank, tp, total:pp+tp});
  S.doors=true; doorSound(true); S.dwell = S.next>=STATIONS.length-1 ? 3 : 10; S.boarded[S.next]=S.t;
  if(S.notch>0) S.notch=-4;
  renderLever(); extrasStop(st,err);
  toast(st.name+'｜誤差 '+fmtErr(err)+'・'+rank+' +'+pp+'｜'+trank+' +'+tp,'good');
}
let actx=null;
function horn(){
  if(S.phase==='run') S.hornPos=S.pos;
  try{
    actx=actx||new (window.AudioContext||window.webkitAudioContext)();
    const t=actx.currentTime, g=actx.createGain(), lp=actx.createBiquadFilter();
    lp.type='lowpass'; lp.frequency.value=1700; lp.connect(g); g.connect(actx.destination);
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.14,t+0.05); g.gain.setValueAtTime(0.14,t+0.75); g.gain.linearRampToValueAtTime(0,t+0.95);
    [311,370,466].forEach(fr=>{ const o=actx.createOscillator(); o.type='sawtooth'; o.frequency.value=fr; o.connect(lp); o.start(t); o.stop(t+1); });
  }catch(e){}
}
function togglePause(){
  if(S.phase!=='run') return;
  if(curOv==='help'){ closeHelp(); return; }
  S.paused=!S.paused;
  if(S.paused) showOverlay('pause'); else hideOverlay();
}
function startGame(tut){
  tutStop();
  S=fresh(); S.phase='run'; S.tut = tut===true; hideOverlay(); renderLever();
  extrasStart();
  if(S.tut) tutStart();
  else toast(fmtClock(BASE_CLOCK)+' 花蓮發車。把主控制器推到動力檔（W / ↑）');
}
const startTutorial=()=>startGame(true);
function endGame(){ tutStop(); S.phase='end'; S.doors=false; showOverlay('end'); }

/* ---------- overlay ---------- */
const ov=document.getElementById('ov'), ovCard=document.getElementById('ovCard');
let curOv=null, helpReturn=null;
function hideOverlay(){ ov.hidden=true; curOv=null; }
function openHelp(){
  if(curOv==='help') return;
  if(S.phase==='run'){ helpReturn = S.paused ? 'pause' : 'run'; S.paused=true; }
  else helpReturn=S.phase;
  showOverlay('help');
}
function closeHelp(){
  if(helpReturn==='run'){ S.paused=false; hideOverlay(); }
  else showOverlay(helpReturn||'title');
}
const HELP_HTML=`<div class="helphead"><div><p class="eyebrow">區間車司機手冊</p><h2>操作說明</h2></div><button class="btn" id="ovClose" type="button" aria-label="關閉操作說明">關閉</button></div>
<div class="help">
<section><h3>主控制器</h3>
  <div class="chips"><i class="p">P5</i><i class="p">P4</i><i class="p">P3</i><i class="p">P2</i><i class="p">P1</i><i class="n">N</i><i class="b">B1</i><i class="b">B2</i><i class="b">…</i><i class="b">B8</i><i class="e">EB</i></div>
  <ul>
    <li><b>P1–P5 動力檔</b>：數字越大加速越快。起步用 P5，接近限速時退回 N 滑行。</li>
    <li><b>N 中立</b>：不加速也不煞車，列車會靠慣性慢慢減速。</li>
    <li><b>B1–B8 煞車檔</b>：數字越大煞得越猛。煞車大約有半秒的反應時間，要提早拉。</li>
    <li><b>EB 緊急煞車</b>：最強的煞車。列車行駛中使用會扣 10 分，只在來不及時用。</li>
  </ul></section>
<section><h3>按鍵</h3>
  <div class="tbl"><table><thead><tr><th>動作</th><th>鍵盤</th><th>觸控</th></tr></thead><tbody>
    <tr><td>往動力推一格</td><td><kbd>W</kbd> 或 <kbd>↑</kbd></td><td>▲ 動力</td></tr>
    <tr><td>往煞車拉一格（最多到 B8）</td><td><kbd>S</kbd> 或 <kbd>↓</kbd></td><td>▼ 煞車</td></tr>
    <tr><td>直接回中立</td><td><kbd>N</kbd></td><td>回 N 檔</td></tr>
    <tr><td>緊急煞車</td><td><kbd>E</kbd></td><td>緊急煞車</td></tr>
    <tr><td>停妥後開門</td><td><kbd>空白鍵</kbd></td><td>開門</td></tr>
    <tr><td>鳴笛</td><td><kbd>H</kbd></td><td>鳴笛</td></tr>
    <tr><td>暫停</td><td><kbd>P</kbd></td><td>暫停</td></tr>
    <tr><td>打開這份說明</td><td><kbd>?</kbd></td><td>操作說明</td></tr>
  </tbody></table></div>
  <p>也可以直接點主控制器上的檔位，例如點 <b>B4</b> 就直接切到 B4。</p></section>
<section><h3>進站停車</h3>
  <ol>
    <li>看「距停車位置」的數字，月台在列車左側。</li>
    <li>估好煞車距離再開始煞：從 90 km/h 用 B8 大約要 300 m，用 B4 大約要 600 m。</li>
    <li>剩 80 m 時下方會出現「停車誤差」量尺，黃色三角形是車頭位置，藍線是停車位置標。</li>
    <li>最後幾公尺改用 B1–B2 微調，讓車頭停在月台上藍色「4」標前面。</li>
    <li>完全停住後按 <kbd>空白鍵</kbd> 開門，旅客上車 10 秒後自動關門，就能再出發。</li>
  </ol>
  <p>停車誤差在 0.5 m 內 <b>+100</b>，1 m 內 +80，3 m 內 +55，8 m 內 +25，15 m 內 +5。衝過停車位置 15 m 以上算<b>過站，−60</b>。停太前面（還差 15 m 以上）則不能開門，要再慢慢往前移。</p></section>
<section><h3>速限</h3>
  <ul>
    <li>路旁白底黑字的數字牌是<b>限速標</b>，畫斜線的牌子是<b>解除標</b>。沒有標示的路段限速 90 km/h。</li>
    <li>過了解除標還不能馬上加速：要等<b>整列車尾端</b>也通過才解除，列車長 80 m。「目前限速」下方會顯示還剩幾公尺。</li>
    <li>超速 1 km/h 以上，每秒扣 2 分。超速 5 km/h 以上，<b>ATP 會強制煞車並扣 30 分</b>，降到限速以下才會交還控制。</li>
  </ul></section>
<section><h3>號誌</h3>
  <ul>
    <li><b>綠燈</b>：正常行駛。</li>
    <li><b>黃燈</b>：注意運轉，通過後限速 45 km/h，一直到平和站。</li>
    <li><b>紅燈</b>：前方有列車，必須在號誌前停車等待，燈號會轉黃。衝太快時 ATP 會緊急煞車並扣 30 分，闖過紅燈扣 150 分。</li>
  </ul>
  <p>志學到平和之間有一架第 32 號閉塞號誌，靠近時記得先減速。</p></section>
<section><h3>坡度</h3>
  <ul>
    <li>右側路旁的<b>坡度標</b>寫著千分比（‰），例如 8‰ 代表每走 1000 m 升高 8 m。「前方」也會提醒坡度變化。</li>
    <li><b>上坡</b>加速變慢、滑行會很快掉速；<b>下坡</b>放 N 也會越跑越快，進站要提早煞車。</li>
  </ul></section>
<section><h3>天氣與時段</h3>
  <ul>
    <li>標題畫面可以選晴天、黃昏、夜間或雨天。夜間要靠頭燈看前方號誌與標誌。</li>
    <li><b>雨天軌面濕滑</b>：煞車力約少 15%，低速時用 P4–P5 容易<b>空轉</b>（儀表會亮「空轉」），起步改用 P2–P3 比較順。</li>
  </ul></section>
<section><h3>準點</h3>
  <p>每一站都有預定到達時刻，顯示在「預定到達」。晚 5 秒以內算準點 <b>+40</b>，之後每晚 1 秒少 1.5 分；提早 20 秒以上到站只有 +20。</p></section>
<section><h3>平交道</h3>
  <p>平交道前 300 m 有寫著「鳴」的鳴笛標。過了鳴笛標、到平交道之前按 <kbd>H</kbd> 鳴笛，通過時 <b>+10</b>。</p></section>
<section><h3>儀表怎麼看</h3>
  <ul>
    <li><b>下一站 / 距停車位置</b>：下一個要停的站，以及車頭距離停車位置標還有多遠。</li>
    <li><b>目前限速</b>：現在要遵守的速度；速度表上紅色的區段就是超速範圍。</li>
    <li><b>號誌 / 前方</b>：前方號誌的燈色，以及接下來會遇到的限速、平交道和距離。</li>
    <li><b>主控制器</b>：括號裡的「實際」檔位表示 ATP 正在代替你煞車。</li>
    <li><b>加減速度</b>：藍色往右是在加速，紅色往左是在減速。</li>
  </ul></section>
<button class="btn door big" id="ovGo" type="button">回到駕駛</button>
</div>`;
function showOverlay(kind){
  ov.hidden=false;
  curOv=kind;
  if(kind==='help'){
    ovCard.className='card wide'; ovCard.innerHTML=HELP_HTML;
    document.getElementById('ovGo').textContent = helpReturn==='run'||helpReturn==='pause' ? '回到駕駛' : '回上一頁';
    document.getElementById('ovGo').addEventListener('click',closeHelp);
    document.getElementById('ovClose').addEventListener('click',closeHelp);
    ov.scrollTop=0;
  } else if(kind==='title'){
    ovCard.className='card';
    ovCard.innerHTML=`<p class="eyebrow">區間車 · 花蓮 → 壽豐 · 5.55 km · 4 站</p>
      <h2>花東線駕駛室</h2>
      <p>你是${ENV.word} ${fmtClock(BASE_CLOCK).slice(0,5)} 從花蓮開出的區間車司機。沿途停靠吉安、志學、平和，終點壽豐。把車頭停在月台上藍色「4」停車位置標前面，誤差越小分數越高，也別忘了趕上時刻表。</p>
      <ul class="howto">
        <li><kbd>W</kbd> <kbd>↑</kbd> 推向動力檔 P1–P5，<kbd>S</kbd> <kbd>↓</kbd> 拉向煞車檔 B1–B8</li>
        <li>速限要等整列車尾端通過限速區才解除（列車長 80 m）</li>
        <li>紅燈前要停車，超速 5 km/h 以上 ATP 會強制煞車並扣分</li>
        <li>停妥後按 <kbd>空白鍵</kbd> 開門；經過「鳴」標時按 <kbd>H</kbd> 鳴笛有加分</li>
      </ul>
      <div class="btnrow three"><button class="btn big" id="ovHelp" type="button">操作說明</button><button class="btn big tut" id="ovTut" type="button">🔰 新手教學</button><button class="btn door big" id="ovGo" type="button">開始駕駛</button></div>
      ${titleExtrasHTML()}`;
    document.getElementById('ovGo').addEventListener('click',()=>startGame());
    document.getElementById('ovTut').addEventListener('click',startTutorial);
    document.getElementById('ovHelp').addEventListener('click',openHelp);
    bindTitleExtras();
  } else if(kind==='pause'){
    ovCard.className='card';
    ovCard.innerHTML=`<p class="eyebrow">暫停中</p><h2>列車暫停</h2><p>時刻表也一起停住了。</p><div class="btnrow"><button class="btn big" id="ovHelp" type="button">操作說明</button><button class="btn door big" id="ovGo" type="button">繼續駕駛</button></div>`;
    document.getElementById('ovGo').addEventListener('click',togglePause);
    document.getElementById('ovHelp').addEventListener('click',openHelp);
  } else {
    ovCard.className='card';
    const max=(STATIONS.length-1)*140;
    const sc=S.score, g = sc>=max*0.86?'S':sc>=max*0.72?'A':sc>=max*0.54?'B':sc>=max*0.32?'C':'D';
    const rows=S.log.map(r=> r.miss
      ? `<tr><td>${r.name}</td><td class="num">過站</td><td>—</td><td>—</td><td class="num">−60</td></tr>`
      : `<tr><td>${r.name}</td><td class="num">${fmtErr(r.err)}</td><td>${r.rank}</td><td>${r.trank} ${r.late>0?'+':'−'}${fmtDur(r.late)}</td><td class="num">+${r.total}</td></tr>`).join('');
    const P=S.pens, info=S.endInfo||(S.endInfo=extrasEnd(g));
    ovCard.innerHTML=`<p class="eyebrow">本班次結束 · 抵達壽豐 ${fmtClock(BASE_CLOCK+S.t)}</p>
      <div class="grade"><b>${g}</b><span>${Math.round(sc)} 分</span></div>
      <div class="tbl"><table><thead><tr><th>站名</th><th class="num">停車誤差</th><th>停車評價</th><th>時刻</th><th class="num">得分</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="pen"><span>超速 <b>−${P.over}</b></span><span>ATP 介入 <b>−${P.atp}</b></span><span>冒進號誌 <b>−${P.spad}</b></span><span>緊急煞車 <b>−${P.eb}</b></span><span>平交道鳴笛 <b>+${S.bonus}</b></span></div>
      <p>滿分約 ${max} 分（每站停車 100 + 準點 40），另有平交道鳴笛加分。</p>
      ${endExtrasHTML(info,g)}
      <div class="btnrow"><button class="btn big" id="ovShare" type="button">分享成績</button><button class="btn door big" id="ovGo" type="button">再開一班</button></div>
      <button class="btn" id="ovTitle" type="button">回標題畫面</button>`;
    document.getElementById('ovGo').addEventListener('click',()=>startGame());
    document.getElementById('ovTitle').addEventListener('click',()=>{ S=fresh(); renderLever(); showOverlay('title'); });
    bindEndExtras(g);
  }
  const b=document.getElementById('ovGo'); if(b) setTimeout(()=>{ try{b.focus({preventScroll:true});}catch(e){} },30);
}

/* ---------- controls ---------- */
const NOTCHES=[5,4,3,2,1,0,-1,-2,-3,-4,-5,-6,-7,-8,-9];
const leverEl=document.getElementById('lever');
NOTCHES.forEach(n=>{
  const b=document.createElement('button'); b.type='button';
  b.className='notch '+(n===-9?'eb':n>0?'p':n<0?'b':'n'); b.textContent=nLabel(n); b.dataset.n=n;
  b.setAttribute('aria-label','主控制器 '+nLabel(n));
  b.addEventListener('click',()=>setNotch(n)); leverEl.appendChild(b);
});
function renderLever(){
  leverEl.querySelectorAll('.notch').forEach(b=>{ const n=+b.dataset.n; b.classList.toggle('on',n===S.notch); b.classList.toggle('forced', S.phase==='run' && n===S.eff && S.eff!==S.notch); });
}
const notchUp=()=>setNotch(S.notch===-9?-8:S.notch+1);
const notchDown=()=>setNotch(S.notch===-9?-9:Math.max(-8,S.notch-1));
document.getElementById('bUp').addEventListener('click',notchUp);
document.getElementById('bDown').addEventListener('click',notchDown);
document.getElementById('bDoor').addEventListener('click',action);
document.getElementById('bEB').addEventListener('click',()=>setNotch(-9));
document.getElementById('bHorn').addEventListener('click',horn);
document.getElementById('bPause').addEventListener('click',togglePause);
document.getElementById('bN').addEventListener('click',()=>setNotch(0));
document.getElementById('bHelp').addEventListener('click',openHelp);
window.addEventListener('keydown',e=>{
  if(e.metaKey||e.ctrlKey||e.altKey) return;
  const k=e.key.toLowerCase();
  if(k==='?'||e.key==='F1'){ e.preventDefault(); if(curOv==='help') closeHelp(); else openHelp(); return; }
  if(curOv==='help'){ if(k==='escape'){ e.preventDefault(); closeHelp(); } return; }
  if(S.phase!=='run'){ if((k===' '||k==='enter') && S.phase==='title' && document.activeElement===document.body){ e.preventDefault(); startGame(); } return; }
  if(S.coachHold && !S.paused){ if(k===' '||k==='enter'){ e.preventDefault(); if(!e.repeat) tutContinue(); } return; }
  if(k==='p'||k==='escape'){ e.preventDefault(); togglePause(); return; }
  if(S.paused) return;
  if(k==='arrowup'||k==='w'){ e.preventDefault(); if(!e.repeat) notchUp(); }
  else if(k==='arrowdown'||k==='s'){ e.preventDefault(); if(!e.repeat) notchDown(); }
  else if(k==='e'){ e.preventDefault(); setNotch(-9); }
  else if(k==='n'){ e.preventDefault(); setNotch(0); }
  else if(k===' '||k==='enter'){ e.preventDefault(); if(!e.repeat) action(); }
  else if(k==='h'){ e.preventDefault(); if(!e.repeat) horn(); }
});

/* ---------- route strip ---------- */
const routeEl=document.getElementById('route');
const stnEls=STATIONS.map((st,i)=>{ const d=document.createElement('div'); d.className='stn'; d.style.left=(st.pos/END*100)+'%'; d.innerHTML='<i></i><span>'+st.name+'</span>'; routeEl.appendChild(d); return d; });

