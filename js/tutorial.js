/* tutorial.js — 新手教學：一步步帶玩家從花蓮開到吉安 */
'use strict';

const kmhNow=()=>S.v*3.6;
const distJian=()=>STATIONS[1].pos-S.pos;
/* 每一步：when() 成立才出現（出現時暫停時間並顯示說明），cond() 成立就進下一步 */
const TUT_STEPS=[
  {title:'歡迎來到駕駛室', hi:[],
   text:'這是新手教學，會帶你把區間車從<b>花蓮</b>開到下一站<b>吉安</b>。每出現一個新提示，時間會先停住，看完按「繼續」再操作。',
   cond:()=>true},
  {title:'起步：推動力檔', hi:['#lever','#bUp'],
   text:'按 <kbd>W</kbd> 或 <kbd>↑</kbd>（手機點「▲ 動力」）把主控制器從 B8 一格一格推到 <b>P3 以上</b>。推過 N 之後才會開始加速。',
   doing:()=>'主控制器目前 '+nLabel(S.notch)+'，推到 P3 以上',
   cond:()=>S.notch>=3},
  {title:'看限速，回中立滑行', hi:['#roLimit','#hLim'], when:()=>kmhNow()>=22,
   text:'出站這段<b>限速 45 km/h</b>，看「目前限速」那格；速度表上紅色區段就是超速。快到 40 km/h 時按 <kbd>N</kbd>（或「回 N 檔」）回中立，讓列車靠慣性滑行。',
   doing:()=>'目前 '+Math.round(kmhNow())+' km/h，接近 40 時按 N',
   cond:()=>(S.notch===0 && kmhNow()>=15) || S.pos>380},
  {title:'解除標：等車尾通過', hi:['#roLimit'], when:()=>S.pos>=290,
   text:'路旁畫斜線的牌子是<b>解除標</b>。但列車有 80 m 長，要等<b>車尾</b>也通過才能加速，「目前限速」下面會倒數剩幾公尺。限速變成 90 之後，再推動力檔加速。',
   doing:()=>currentLimit()<LINE_MAX ? '等車尾通過…' : '限速解除了！推動力檔加速',
   cond:()=>S.pos>380 && S.notch>0},
  {title:'平交道：記得鳴笛', hi:['#bHorn','#roAhead'], when:()=>S.pos>=470,
   text:'前方有<b>平交道</b>。路旁寫著「鳴」的鳴笛標過了之後、到平交道之前，按 <kbd>H</kbd>（或「鳴笛」）提醒路人，通過時 +10 分。',
   doing:()=>'按 H 鳴笛（平交道還有 '+Math.max(0,Math.round(780-S.pos))+' m）',
   cond:()=>S.hornPos>=480 || S.pos>780},
  {title:'準備進站：開始煞車', hi:['#roDist','#bDown'],
   when:()=>distJian()<=Math.max(260, S.v*S.v/(2*0.45)+90),
   text:'吉安站快到了！看「距停車位置」的數字。按 <kbd>S</kbd> 或 <kbd>↓</kbd> 把主控制器拉到<b>煞車檔 B3–B5</b>。煞車有半秒反應時間，寧可早一點煞。',
   doing:()=>'距停車位置 '+Math.round(distJian())+' m，拉到煞車檔',
   cond:()=>S.notch<0 || S.next>1},
  {title:'微調：對準停車位置', hi:['.stopscale'], when:()=>distJian()<80 || S.next>1,
   text:'下方出現「停車誤差」量尺：<b>黃色三角形</b>是車頭，中間<b>藍線</b>是月台上藍色「4」停車位置標。快停時改用 <b>B1–B2</b> 輕輕煞，停在藍線上分數最高。',
   doing:()=>{ const d=distJian(); if(S.v<0.01 && d>15) return '停太前面了，推 P1 慢慢往前，再拉煞車'; return '還有 '+d.toFixed(1)+' m，慢慢煞停'; },
   cond:()=>(S.v<0.01 && Math.abs(distJian())<=15) || S.next>1},
  {title:'停妥，開門！', hi:['#bDoor'],
   text:'列車停穩了。按 <kbd>空白鍵</kbd>（或「開門」）讓旅客上下車，10 秒後會自動關門。',
   doing:()=>'按空白鍵開門',
   cond:()=>S.doors || S.next>1},
  {title:'新手教學完成 🎉', hi:[],
   text:'你已經學會起步、遵守限速、鳴笛和進站停車了！接下來自己開到終點<b>壽豐</b>吧。提醒：志學到平和之間有一架<b>閉塞號誌</b>，紅燈一定要停。想複習隨時按 <kbd>?</kbd> 看操作說明。',
   cond:()=>true, last:true},
];

const T_={i:0, state:'off'}; // state: off | wait(等 when) | hold(說明卡) | doing
const coachEl=document.createElement('div');
coachEl.className='coach'; coachEl.hidden=true; coachEl.setAttribute('role','status');
document.querySelector('.stage').appendChild(coachEl);

function tutStart(){ T_.i=0; T_.state='wait'; tutTick(); }
function tutStop(){
  T_.state='off'; S.coachHold=false; coachEl.hidden=true; tutHi([]);
}
function tutHi(list){
  document.querySelectorAll('.coach-hi').forEach(e=>e.classList.remove('coach-hi'));
  list.forEach(sel=>document.querySelectorAll(sel).forEach(e=>{ (e.closest('.ro')||e).classList.add('coach-hi'); }));
}
function tutShowHold(){
  const st=TUT_STEPS[T_.i];
  T_.state='hold'; S.coachHold=true; tutHi(st.hi);
  coachEl.hidden=false; coachEl.className='coach hold'; coachEl.dataset.msg='';
  coachEl.innerHTML=`<div class="coach-top"><span class="eyebrow">新手教學 ${T_.i+1} / ${TUT_STEPS.length}</span>
    <button class="coach-skip" type="button" id="coachSkip">跳過教學</button></div>
    <h3>${st.title}</h3><p>${st.text}</p>
    <div class="coach-dots">${TUT_STEPS.map((_,k)=>`<i class="${k<T_.i?'d':k===T_.i?'c':''}"></i>`).join('')}</div>
    <button class="btn door" type="button" id="coachGo">${st.last?'開始自由駕駛':'繼續'}<kbd>Enter</kbd></button>`;
  document.getElementById('coachGo').addEventListener('click',tutContinue);
  document.getElementById('coachSkip').addEventListener('click',()=>{ tutStop(); toast('已跳過新手教學'); });
  setTimeout(()=>{ try{ document.getElementById('coachGo').focus({preventScroll:true}); }catch(e){} },30);
}
function tutContinue(){
  if(T_.state!=='hold') return;
  const st=TUT_STEPS[T_.i];
  S.coachHold=false;
  if(st.last){ tutStop(); if(typeof unlockAch==='function') unlockAch('grad'); return; }
  T_.state='doing'; coachEl.className='coach mini'; tutTick();
}
function tutTick(){
  if(T_.state==='off' || S.phase!=='run' || !S.tut) return;
  const st=TUT_STEPS[T_.i];
  if(T_.state==='wait'){ if(!st.when || st.when()) tutShowHold(); return; }
  if(T_.state==='hold') return;
  if(st.cond()){ T_.i++; T_.state='wait'; tutHi([]); coachEl.hidden=true; tutTick(); return; }
  const msg=st.doing ? st.doing() : st.title;
  if(coachEl.dataset.msg!==msg){ coachEl.dataset.msg=msg; coachEl.hidden=false; coachEl.innerHTML=`<span class="eyebrow">教學 ${T_.i+1}/${TUT_STEPS.length}</span><b>${msg}</b>`; }
}
