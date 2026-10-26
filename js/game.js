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
/* 評價用語（內部用中文，顯示時翻譯） */
const WORDS={'完美':['Perfect','パーフェクト'],'優秀':['Excellent','優秀'],'良好':['Good','良好'],'普通':['Fair','普通'],'勉強':['Rough','ギリギリ'],'早到':['Early','早着'],'準點':['On time','定時'],'延誤':['Late','遅延']};
const trWord=w=> WORDS[w] ? L(w,WORDS[w][0],WORDS[w][1]) : w;
const toastEl=document.getElementById('toast'); let toastTimer=0;
function toast(msg, kind){ toastEl.textContent=msg; toastEl.className='toast'+(kind?' '+kind:''); toastEl.removeAttribute('data-off'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>toastEl.setAttribute('data-off',''), 2800); }
function penal(p,key,msg){ p=Math.round(p*DIFF.penK); S.score-=p; S.pens[key]=(S.pens[key]||0)+p; toast(msg+' −'+p,'bad'); }

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
  else if(sg.phase===1){ sg.timer-=dt; if(sg.timer<=0){ sg.aspect='Y'; sg.phase=2; sg.timer=18; toast(L('號誌轉為黃燈：注意運轉，限速 45 km/h','Signal turned yellow: caution, limit 45 km/h','信号が注意現示に：制限 45 km/h')); } }
  else if(sg.phase===2){ sg.timer-=dt; if(sg.timer<=0){ sg.aspect='G'; sg.phase=3; } }

  const lim=currentLimit(), kmh=S.v*3.6;
  let forced=0;
  if(S.spad){ forced=-9; if(S.v<0.01) S.spad=false; }
  else{
    if(!S.atpOver && kmh>lim+DIFF.atp){ S.atpOver=true; penal(30,'atp',L('ATP 介入：超過限速','ATP braking: overspeed','ATP作動：速度超過')); }
    if(S.atpOver){ if(kmh<=lim-1){ S.atpOver=false; toast(L('ATP 解除，恢復手動','ATP released, manual control restored','ATP解除、手動に復帰')); } else forced=-8; }
    if(sg.aspect==='R' && dSig>0 && dSig<700){
      const allow=Math.sqrt(Math.max(0,2*1.0*(dSig-10)));
      if(!S.atpSig && S.v>allow+0.6){ S.atpSig=true; penal(30,'atp',L('ATP 介入：前方紅燈','ATP braking: red signal ahead','ATP作動：前方停止信号')); }
    }
    if(S.atpSig){ if(S.v<0.01 || sg.aspect!=='R') S.atpSig=false; else forced=-9; }
  }
  if(kmh>lim+1){ if(!S.overOn){ S.overOn=true; if(!S.atpOver) toast(L('超過限速 ','Over the limit of ','制限速度超過 ')+lim+' km/h','bad'); } S.overT+=dt; while(S.overT>=1){ S.overT-=1; const q=2*DIFF.penK; S.score-=q; S.pens.over+=q; } }
  else S.overOn=false;

  let n=S.notch;
  if(forced){ n = S.notch<forced ? S.notch : forced; }
  if(S.doors && n>0) n=-4;
  S.eff=n;
  let target; S.slip=false;
  if(n>0){ const amax=ROUTE.power*n/5; target=amax*Math.min(1,9/Math.max(S.v,0.01));
    // 雨天軌面濕滑：低速大檔位容易空轉
    if(ENV.rain && DIFF.slip && n>=4 && S.v<12){ S.slip = Math.sin(S.t*5.3)+Math.sin(S.t*2.1)>0.6; target*=S.slip?0.55:0.8; } }
  else if(n===0) target=0;
  else target=-(n===-9?ROUTE.ebDecel:ROUTE.brakeStep*(-n))*(ENV.rain?0.85:1);
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
    if(sg.aspect==='R'){ S.spad=true; penal(150,'spad',L('冒進號誌！緊急停車','Passed a red signal! Emergency stop','信号冒進！非常停止')); }
    else if(sg.aspect==='Y'){ S.yellowUntil=SIGNAL_POS+400; }
  }
  CROSSINGS.forEach((c,i)=>{
    if(prev<c && S.pos>=c && !S.crossDone[i]){
      S.crossDone[i]=true;
      if(S.hornPos>=c-350 && S.hornPos<=c){ S.score+=10; S.bonus+=10; toast(L('平交道前鳴笛確認 +10','Horn before the crossing +10','踏切前で警笛 +10'),'good'); }
      else { const w=ROUTE.japan?'笛':'鳴'; toast(L('通過平交道：下次記得在「'+w+'」標附近鳴笛','Level crossing passed: sound the horn after the 「'+w+'」 board next time','踏切通過：次は「'+w+'」標識の後で警笛を')); }
    }
  });

  // 新手模式：該開始煞車時提醒一次
  if(DIFF.guide && !S.doors && S.phase==='run'){ const st=STATIONS[S.next]; if(st && S.cueAt!==S.next){ const d=st.pos-S.pos, need=S.v*S.v/(2*0.55)+25;
    if(S.v>3 && d>0 && d<need+20 && S.notch>=0){ S.cueAt=S.next; toast(L('🔰 現在開始煞車：拉到 B4 左右','🔰 Start braking now: about B4','🔰 ブレーキ開始：B4 くらいへ'),'good'); } } }
  if(S.doors){
    S.dwell-=dt;
    if(S.dwell<=0){
      S.doors=false; doorSound(false);
      if(S.next>=STATIONS.length-1){ endGame(); return; }
      S.next++; toast(L('車門關閉，可以發車','Doors closed, ready to depart','ドア閉、発車できます'),'good'); extrasDepart();
    }
  } else {
    const st=STATIONS[S.next];
    if(st && S.pos-st.pos>15){
      const mp=Math.round(60*DIFF.penK); S.score-=mp; S.pens.miss+=mp;
      S.log.push({name:st.name, miss:true, pp:0, tp:0, total:-mp});
      toast(L('過站！未停靠 ','Overran! Missed ','通過！停車せず ')+stName(st)+' −'+mp,'bad');
      if(S.next>=STATIONS.length-1){ endGame(); return; }
      S.next++; extrasDepart();
    }
  }
}

/* ---------- player actions ---------- */
function setNotch(n){
  if(S.phase!=='run' || S.paused) return;
  n=clamp(n,-9,5);
  if(n>0 && S.doors){ toast(L('車門開啟中，無法加速','Doors are open, cannot power','ドア開扉中は力行できません')); return; }
  if(n===-9 && S.notch!==-9 && S.v>2) penal(10,'eb',L('使用緊急煞車','Emergency brake used','非常ブレーキ使用'));
  S.notch=n; renderLever();
}
function action(){
  if(S.phase==='title'){ startGame(); return; }
  if(S.phase!=='run' || S.paused) return;
  if(S.doors){ toast(L('旅客上下車中…','Passengers boarding…','乗降中…')); return; }
  const st=STATIONS[S.next]; if(!st) return;
  const err=S.pos-st.pos;
  if(err<-15){ toast(err>-400 ? L('距停車位置還有 ','Stop mark is still ','停止位置まであと ')+(-err).toFixed(1)+' m'+L('',' ahead','') : L('還沒到 '+stName(st)+' 站','Not at '+stName(st)+' yet',stName(st)+'駅はまだです')); return; }
  if(S.v>0.01){ toast(L('列車尚未停妥','Train is not stopped yet','まだ停車していません')); return; }
  const ae=Math.abs(err); let pp, rank;
  if(ae<=0.5){pp=100;rank='完美';} else if(ae<=1){pp=80;rank='優秀';} else if(ae<=3){pp=55;rank='良好';} else if(ae<=8){pp=25;rank='普通';} else {pp=5;rank='勉強';}
  const late=S.t-st.arr; let tp, trank;
  if(late<-20 && !DIFF.guide){tp=20;trank='早到';} /* 新手模式早到也算準點 */ else if(late<=5){tp=40;trank='準點';} else {tp=Math.max(0,Math.round(40-(late-5)*1.5));trank='延誤';}
  S.score+=pp+tp;
  S.log.push({name:st.name, err, rank, pp, late, trank, tp, total:pp+tp});
  S.doors=true; doorSound(true); S.dwell = S.next>=STATIONS.length-1 ? 3 : 10; S.boarded[S.next]=S.t;
  if(S.notch>0) S.notch=-4;
  renderLever(); extrasStop(st,err);
  toast(stName(st)+L('｜誤差 ',' | error ','｜誤差 ')+fmtErr(err)+'・'+trWord(rank)+' +'+pp+'｜'+trWord(trank)+' +'+tp,'good');
}
let actx=null;
function horn(){
  if(S.phase==='run') S.hornPos=S.pos;
  if(TRAIN.sound==='steam'){ whistle(); return; }
  try{
    actx=actx||new (window.AudioContext||window.webkitAudioContext)();
    const t=actx.currentTime, g=actx.createGain(), lp=actx.createBiquadFilter();
    lp.type='lowpass'; lp.frequency.value=1700; lp.connect(g); g.connect(actx.destination);
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.14,t+0.05); g.gain.setValueAtTime(0.14,t+0.75); g.gain.linearRampToValueAtTime(0,t+0.95);
    [311,370,466].forEach(fr=>{ const o=actx.createOscillator(); o.type='sawtooth'; o.frequency.value=fr; o.connect(lp); o.start(t); o.stop(t+1); });
  }catch(e){}
}
/* 蒸汽汽笛：三個音加上氣流聲 */
function whistle(){
  try{
    actx=actx||new (window.AudioContext||window.webkitAudioContext)();
    const t=actx.currentTime, g=actx.createGain(); g.connect(actx.destination);
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.09,t+0.12); g.gain.setValueAtTime(0.09,t+1.1); g.gain.linearRampToValueAtTime(0,t+1.45);
    [440,554,659].forEach(fr=>{ const o=actx.createOscillator(); o.type='triangle'; o.frequency.setValueAtTime(fr*0.97,t); o.frequency.linearRampToValueAtTime(fr,t+0.15); o.connect(g); o.start(t); o.stop(t+1.5); });
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
  if(tut!==true && DIFF.guide && !tutSeen()) tut=true; // 新手模式：這條路線第一次開會自動帶教學
  S=fresh(); S.phase='run'; S.tut = tut===true; hideOverlay(); renderLever();
  extrasStart();
  if(S.tut) tutStart();
  else toast(fmtClock(BASE_CLOCK)+' '+L(STATIONS[0].name+'發車。把主控制器推到動力檔（W / ↑）','Departing '+stName(STATIONS[0])+'. Push the master controller into power (W / ↑)',stName(STATIONS[0])+'発車。マスコンを力行へ（W / ↑）'));
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
const HELP_ZH=`<div class="helphead"><div><p class="eyebrow">區間車司機手冊</p><h2>操作說明</h2></div><button class="btn" id="ovClose" type="button" aria-label="關閉操作說明">關閉</button></div>
<div class="help">
<section><h3>難度、車種與紀念章</h3>
  <ul>
    <li><b>🔰 新手</b>：時刻表寬鬆、扣分減半、不會空轉。該煞車時會提醒，誤差尺上的綠色三角形是預計停車位置。每條路線第一次開會自動帶教學，可以跳過。</li>
    <li><b>🎯 專業</b>：實際時刻表、扣分加重，ATP 超速 3 km/h 就介入，停車誤差尺只在最後 20 m 出現。</li>
    <li><b>車種</b>：每條路線都有一輛靠成就解鎖的車——花東線 A 評價解鎖 EMU900、祝山看日出解鎖蒸汽機車 SL-31、專業模式開完江之電解鎖 300 形。</li>
    <li><b>車站紀念章</b>：停車誤差 3 m 內就能蓋到那一站的紀念章，開完全程會蓋起點站的章。</li>
  </ul></section>
<section><h3>車內廣播</h3>
  <p>發車後會有歡迎廣播，快到站時提醒下車與開門方向，誤點時會致歉。臺鐵與林鐵播國語和英語，江之電播日語和英語；畫面下方會同步顯示字幕。📻 是行車調度的無線電，只出字幕。</p></section>
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
  <p>花東線志學到平和之間有一架第 32 號閉塞號誌，靠近時記得先減速。阿里山祝山線沒有這架號誌。</p></section>
<section><h3>江之電</h3>
  <ul>
    <li>江之電從稻村崎往江之島，左手邊是相模灣。站距短、平交道多，平交道前的「笛」標就是鳴笛標。</li>
    <li>腰越到江之島是<b>路面併用軌道</b>，電車和汽車共用道路，限速 25 km/h；進江之島站前的急彎限速 15 km/h。</li>
    <li>月台很短，只比列車長一點，停車位置要抓準。</li>
  </ul></section>
<section><h3>阿里山小火車</h3>
  <ul>
    <li>762 mm 窄軌、柴油機車，全線上坡，最陡 62‰。線路最高 30 km/h，急彎限速 15–20 km/h。</li>
    <li>上坡放 N 會很快停下來，進站可以晚一點再煞車；停在半路上要用 P3 以上才爬得動。</li>
    <li>急彎時會聽到車輪與鋼軌摩擦的尖銳聲，這是登山鐵道的特色。</li>
  </ul></section>
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
const nameOf = zh => { const st=STATIONS.find(x=>x.name===zh); return st?stName(st):zh; };
function langPickHTML(){
  return `<div class="langpick" role="radiogroup" aria-label="Language">${Object.entries(LANGS).map(([k,v])=>`<button type="button" role="radio" aria-checked="${k===LANG}" class="langbtn${k===LANG?' on':''}" data-lang="${k}" lang="${k==='zh'?'zh-Hant':k}">${v}</button>`).join('')}</div>`;
}
function showOverlay(kind){
  ov.hidden=false;
  curOv=kind;
  if(kind==='help'){
    ovCard.className='card wide'; ovCard.innerHTML=L(HELP_ZH,HELP_EN,HELP_JA);
    document.getElementById('ovGo').textContent = helpReturn==='run'||helpReturn==='pause' ? L('回到駕駛','Back to driving','運転に戻る') : L('回上一頁','Back','戻る');
    document.getElementById('ovGo').addEventListener('click',closeHelp);
    document.getElementById('ovClose').addEventListener('click',closeHelp);
    ov.scrollTop=0;
  } else if(kind==='title'){
    ovCard.className='card';
    const AL=ROUTE.key==='alishan', first=stName(STATIONS[0]), last=stName(STATIONS[STATIONS.length-1]), mids=STATIONS.slice(1,-1).map(stName).join(L('、',', ','、')), hhmm=fmtClock(BASE_CLOCK).slice(0,5);
    const JP=!!ROUTE.japan;
    const story = JP
      ? L(`你是${ENV.word} ${hhmm} 從稻村崎開往江之島的江之電司機。左手邊是相模灣，天氣好時前方看得到江之島和富士山。途經${mids}；腰越之後是和汽車共用道路的路面區間，速度要放慢。`,
          `You're driving the ${hhmm} Enoden train from Inamuragasaki to Enoshima ${ENV.word}. Sagami Bay is on your left, and on a clear day Enoshima and Mt Fuji rise ahead. You'll call at ${mids}; after Koshigoe the line runs down the middle of the street alongside cars, so take it slow.`,
          `${ENV.word} ${hhmm} 稲村ヶ崎発 江ノ島行きの江ノ電を運転します。左手には相模湾、晴れていれば前方に江の島と富士山。${mids}に停車し、腰越の先は車と道路を共有する併用軌道なので、速度を落として進みましょう。`)
      : AL
      ? L(`你是${ENV.word} ${hhmm} 從阿里山開出的祝山線列車司機，載著旅客上山。途經${mids}，終點是海拔 2,451 公尺、全台最高的祝山車站。全線上坡、彎道又急，要守住速限，也要把車停準。`,
          `You're driving the ${hhmm} Zhushan Line train out of Alishan ${ENV.word}, carrying passengers up the mountain via ${mids} to Zhushan, at 2,451 m the highest station in Taiwan. It's uphill all the way with tight curves: keep to the limits and stop on the mark.`,
          `${ENV.word} ${hhmm} 阿里山発の祝山線列車の運転士として、乗客を山の上へ運びます。${mids}を経て、終点は標高 2,451 m、台湾で最も高い祝山駅。ずっと上り勾配で急カーブも多いので、制限速度を守りつつ停止位置にぴたりと止めましょう。`)
      : L(`你是${ENV.word} ${hhmm} 從${first}開出的區間車司機。沿途停靠${mids}，終點${last}。把車頭停在月台上藍色「4」停車位置標前面，誤差越小分數越高，也別忘了趕上時刻表。`,
          `You're the driver of the ${hhmm} local train from ${first} ${ENV.word}, calling at ${mids} and terminating at ${last}. Stop the front of the train at the blue “4” board on each platform — the closer, the higher your score — and keep to the timetable.`,
          `${ENV.word} ${hhmm} ${first}発の区間車の運転士です。${mids}に停車し、終点は${last}。ホームの青い「4」停止位置目標に先頭を合わせて止めるほど高得点。時刻表も守りましょう。`);
    ovCard.innerHTML=`${langPickHTML()}
      <div class="routepick" role="radiogroup" aria-label="${L('選擇路線','Choose a route','路線を選ぶ')}">${Object.values(ROUTES).map(r=>`<button type="button" role="radio" aria-checked="${r===ROUTE}" class="routebtn${r===ROUTE?' on':''}" data-route="${r.key}"><b>${r.key==='alishan'?'🌲':r.japan?'🌊':'🚃'} ${r.name}</b><small>${stName(r.stations[0])} → ${stName(r.stations[r.stations.length-1])}</small></button>`).join('')}</div>
      <p class="eyebrow">${TRAIN.name} · ${first} → ${last} · ${L(STATIONS.length+' 站',STATIONS.length+' stations',STATIONS.length+' 駅')}</p>
      <h2>${ROUTE.title}</h2>
      <p>${story}</p>
      <ul class="howto">
        <li>${L('<kbd>W</kbd> <kbd>↑</kbd> 推向動力檔 P1–P5，<kbd>S</kbd> <kbd>↓</kbd> 拉向煞車檔 B1–B8','<kbd>W</kbd> <kbd>↑</kbd> toward power P1–P5, <kbd>S</kbd> <kbd>↓</kbd> toward brake B1–B8','<kbd>W</kbd> <kbd>↑</kbd> で力行 P1–P5、<kbd>S</kbd> <kbd>↓</kbd> でブレーキ B1–B8')}</li>
        <li>${L(`速限要等整列車尾端通過限速區才解除（列車長 ${TRAIN_LEN} m）`,`A limit ends only when the rear of the train (${TRAIN_LEN} m) has passed`,`制限は最後尾（列車長 ${TRAIN_LEN} m）が抜けるまで続きます`)}</li>
        <li>${JP ? L('最高 45 km/h，路面區間 25 km/h；鎌倉高校前站旁就是知名的平交道，記得鳴笛','Top speed 45 km/h, 25 km/h on the street section; the famous level crossing is right by Kamakura-Kōkōmae — sound the horn','最高 45 km/h、併用軌道は 25 km/h。鎌倉高校前駅のすぐ横に有名な踏切があるので警笛を')
             : AL ? L('全線上坡最陡 62‰，最高時速只有 30 km/h，超速 5 km/h 以上 ATP 會強制煞車','Uphill at up to 62‰ with a 30 km/h top speed; 5 km/h over and ATP brakes for you','最急 62‰ の上り勾配、最高 30 km/h。5 km/h 以上の超過で ATP が作動')
                 : L('紅燈前要停車，超速 5 km/h 以上 ATP 會強制煞車並扣分','Stop at red signals; 5 km/h over the limit and ATP brakes and deducts points','停止信号では停車。5 km/h 以上の超過で ATP が作動し減点')}</li>
        <li>${(w=>L('停妥後按 <kbd>空白鍵</kbd> 開門；經過「'+w+'」標時按 <kbd>H</kbd> 鳴笛有加分','Press <kbd>Space</kbd> to open the doors once stopped; press <kbd>H</kbd> after a 「'+w+'」 board to sound the horn for a bonus','停車後 <kbd>Space</kbd> でドア開扉。「'+w+'」標識の後で <kbd>H</kbd> の警笛を鳴らすと加点'))(JP?'笛':'鳴')}</li>
      </ul>
      <div class="btnrow three"><button class="btn big" id="ovHelp" type="button">${L('操作說明','How to drive','操作説明')}</button><button class="btn big tut" id="ovTut" type="button">🔰 ${L('新手教學','Tutorial','入門ガイド')}<small>${L('可隨時跳過','skippable','いつでもスキップ可')}</small></button><button class="btn door big" id="ovGo" type="button">${L('開始駕駛','Start driving','運転開始')}</button></div>
      ${titleExtrasHTML()}`;
    document.getElementById('ovGo').addEventListener('click',()=>startGame());
    document.getElementById('ovTut').addEventListener('click',startTutorial);
    document.querySelectorAll('.routebtn').forEach(b=>b.addEventListener('click',()=>{ if(b.dataset.route!==ROUTE.key) setRoute(b.dataset.route); }));
    document.querySelectorAll('.langbtn').forEach(b=>b.addEventListener('click',()=>{ if(b.dataset.lang!==LANG) setLang(b.dataset.lang); }));
    document.getElementById('ovHelp').addEventListener('click',openHelp);
    bindTitleExtras();
  } else if(kind==='pause'){
    ovCard.className='card';
    ovCard.innerHTML=`<p class="eyebrow">${L('暫停中','Paused','一時停止中')}</p><h2>${L('列車暫停','Train paused','列車停止中')}</h2><p>${L('時刻表也一起停住了。','The timetable is paused too.','時刻表も止まっています。')}</p><div class="btnrow"><button class="btn big" id="ovHelp" type="button">${L('操作說明','How to drive','操作説明')}</button><button class="btn door big" id="ovGo" type="button">${L('繼續駕駛','Resume','運転再開')}</button></div>`;
    document.getElementById('ovGo').addEventListener('click',togglePause);
    document.getElementById('ovHelp').addEventListener('click',openHelp);
  } else {
    ovCard.className='card';
    const max=(STATIONS.length-1)*140;
    const sc=S.score, g = sc>=max*0.86?'S':sc>=max*0.72?'A':sc>=max*0.54?'B':sc>=max*0.32?'C':'D';
    const rows=S.log.map(r=> r.miss
      ? `<tr><td>${nameOf(r.name)}</td><td class="num">${L('過站','Overran','通過')}</td><td>—</td><td>—</td><td class="num">${r.total}</td></tr>`
      : `<tr><td>${nameOf(r.name)}</td><td class="num">${fmtErr(r.err)}</td><td>${trWord(r.rank)}</td><td>${trWord(r.trank)} ${r.late>0?'+':'−'}${fmtDur(r.late)}</td><td class="num">+${r.total}</td></tr>`).join('');
    const P=S.pens, info=S.endInfo||(S.endInfo=extrasEnd(g));
    ovCard.innerHTML=`<p class="eyebrow">${L('本班次結束 · 抵達','Run complete · arrived at ','運行終了 · 到着 ')}${stName(STATIONS[STATIONS.length-1])} ${fmtClock(BASE_CLOCK+S.t)}</p>
      <div class="grade"><b>${g}</b><span>${Math.round(sc)} ${L('分','pts','点')}</span></div>
      <div class="tbl"><table><thead><tr><th>${L('站名','Station','駅')}</th><th class="num">${L('停車誤差','Stop error','停止誤差')}</th><th>${L('停車評價','Stop','停止評価')}</th><th>${L('時刻','Time','時刻')}</th><th class="num">${L('得分','Points','得点')}</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="pen"><span>${L('超速','Overspeed','速度超過')} <b>−${P.over}</b></span><span>${L('ATP 介入','ATP','ATP作動')} <b>−${P.atp}</b></span><span>${L('冒進號誌','Red signal','信号冒進')} <b>−${P.spad}</b></span><span>${L('緊急煞車','Emergency brake','非常ブレーキ')} <b>−${P.eb}</b></span><span>${L('平交道鳴笛','Crossing horn','踏切警笛')} <b>+${S.bonus}</b></span></div>
      <p>${L(`滿分約 ${max} 分（每站停車 100 + 準點 40），另有平交道鳴笛加分。`,`A perfect run is about ${max} points (100 for the stop + 40 for timing at each station), plus horn bonuses.`,`満点は約 ${max} 点（各駅 停止 100 ＋ 定時 40）、ほかに踏切警笛のボーナス。`)}</p>
      ${endExtrasHTML(info,g)}
      <div class="btnrow"><button class="btn big" id="ovShare" type="button">${L('分享成績','Share result','結果をシェア')}</button><button class="btn door big" id="ovGo" type="button">${L('再開一班','Drive again','もう一度運転')}</button></div>
      <button class="btn" id="ovTitle" type="button">${L('回標題畫面','Back to title','タイトルへ')}</button>`;
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
  b.setAttribute('aria-label',L('主控制器 ','Master controller ','マスコン ')+nLabel(n));
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
const stnEls=STATIONS.map((st,i)=>{ const d=document.createElement('div'); d.className='stn'; d.style.left=(st.pos/END*100)+'%'; d.innerHTML='<i></i><span>'+stName(st)+'</span>'; routeEl.appendChild(d); return d; });

