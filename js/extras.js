/* extras.js — 成就、最佳紀錄、車內廣播、開門音、旅客評語與分享 */
'use strict';

/* ---------- storage ---------- */
function load(key,def){ try{ const v=localStorage.getItem(key); return v==null?def:JSON.parse(v); }catch(e){ return def; } }
function save(key,v){ try{ localStorage.setItem(key,JSON.stringify(v)); }catch(e){} }

/* ---------- achievements ---------- */
const ACHS=[
  {id:'grad',    icon:'🎓', name:'新手畢業',   desc:'完成新手教學'},
  {id:'first',   icon:'🚃', name:'首航',       desc:'第一次開到壽豐'},
  {id:'perfect', icon:'🎯', name:'一公分都不差', desc:'任一站停車誤差 0.5 m 以內'},
  {id:'sniper',  icon:'📏', name:'人體尺規',   desc:'每一站停車誤差都在 1 m 以內'},
  {id:'ontime',  icon:'⏱️', name:'台灣之光準點', desc:'每一站都準點到達'},
  {id:'clean',   icon:'🧼', name:'零扣分',     desc:'一整班沒有任何扣分'},
  {id:'horn',    icon:'📯', name:'喇叭手',     desc:'三個平交道都有鳴笛'},
  {id:'gradeS',  icon:'🏆', name:'S 級司機員', desc:'拿到 S 評價'},
  {id:'redrun',  icon:'🚨', name:'紅燈戰士',   desc:'……闖過紅燈（不太光彩）'},
  {id:'skip',    icon:'💨', name:'過站不停',   desc:'錯過一個車站（旅客很錯愕）'},
];
let ACH=load('cabAch',{});
let lastNew=[];
function unlockAch(id){
  if(ACH[id]) return false;
  ACH[id]=Date.now(); save('cabAch',ACH); lastNew.push(id);
  const a=ACHS.find(x=>x.id===id);
  if(a && S.phase==='run') toast('解鎖成就 '+a.icon+' '+a.name,'good');
  return true;
}
function achGridHTML(highlight){
  return `<div class="achs">${ACHS.map(a=>`<div class="ach${ACH[a.id]?' on':''}${highlight&&highlight.includes(a.id)?' new':''}" title="${a.desc}">
    <span class="ai">${ACH[a.id]?a.icon:'🔒'}</span><span class="an">${a.name}</span><span class="ad">${a.desc}</span></div>`).join('')}</div>`;
}

/* ---------- sound & announcements ---------- */
let voiceOn=load('cabVoice',true);
function setVoice(on){ voiceOn=on; save('cabVoice',on); if(!on) try{ speechSynthesis.cancel(); }catch(e){} }
function announce(zh,en){
  if(!voiceOn || !('speechSynthesis' in window)) return;
  try{
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(zh); u.lang='zh-TW'; u.rate=0.95; speechSynthesis.speak(u);
    if(en){ const e=new SpeechSynthesisUtterance(en); e.lang='en-US'; e.rate=0.95; speechSynthesis.speak(e); }
  }catch(e){}
}
function chime(){
  try{
    actx=actx||new (window.AudioContext||window.webkitAudioContext)();
    const t0=actx.currentTime;
    [[659,0],[523,0.38]].forEach(([fr,dt])=>{
      const o=actx.createOscillator(), g=actx.createGain(); o.type='sine'; o.frequency.value=fr;
      o.connect(g); g.connect(actx.destination);
      g.gain.setValueAtTime(0,t0+dt); g.gain.linearRampToValueAtTime(0.12,t0+dt+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t0+dt+0.9);
      o.start(t0+dt); o.stop(t0+dt+1);
    });
  }catch(e){}
}

/* ---------- game hooks (game.js 會呼叫) ---------- */
function extrasStart(){
  lastNew=[];
  const st=STATIONS[1];
  announce('本列車開往壽豐。下一站，'+st.name+'。','Next station, '+st.en+'.');
}
function extrasStop(st,err){
  chime();
  if(Math.abs(err)<=0.5) unlockAch('perfect');
  const last=S.next>=STATIONS.length-1;
  announce(last?'壽豐到了，本列車終點站，謝謝搭乘。':st.name+'到了。', last?'This is the terminal station, '+st.en+'. Thank you.':st.en+'.');
}
function extrasDepart(){
  const st=STATIONS[S.next]; if(!st) return;
  const last=S.next===STATIONS.length-1;
  announce('下一站，'+st.name+(last?'，本列車終點站。':'。'),'Next station, '+st.en+'.');
}
function extrasEnd(grade){
  const log=S.log, P=S.pens;
  unlockAch('first');
  const stops=log.filter(r=>!r.miss);
  if(stops.length===STATIONS.length-1 && stops.every(r=>Math.abs(r.err)<=1)) unlockAch('sniper');
  if(stops.length===STATIONS.length-1 && stops.every(r=>r.trank==='準點')) unlockAch('ontime');
  if(!Object.values(P).some(v=>v>0)) unlockAch('clean');
  if(S.bonus>=CROSSINGS.length*10) unlockAch('horn');
  if(grade==='S') unlockAch('gradeS');
  if(P.spad>0) unlockAch('redrun');
  if(P.miss>0) unlockAch('skip');
  const best=load('cabBest',null), sc=Math.round(S.score);
  const isBest = !best || sc>best.score;
  if(isBest) save('cabBest',{score:sc, grade, at:Date.now()});
  const runs=load('cabRuns',0)+1; save('cabRuns',runs);
  return {isBest, best:isBest?{score:sc,grade}:best, runs};
}

/* ---------- passenger comments ---------- */
function passengerSays(grade){
  const P=S.pens, out=[];
  if(P.spad>0) out.push(['「剛剛那個是紅燈吧？我看到了喔。」','坐第一排的鐵道迷']);
  if(P.miss>0) out.push(['「欸欸欸我要下車啦——」','錯過站的阿姨']);
  if(P.eb>0) out.push(['「我的珍奶……整杯灑出來了。」','車廂裡的大學生']);
  const ok={
    S:['「停得比我停機車還準，這司機是機器人吧？」','通勤的高中生'],
    A:['「很穩，連咖啡都沒晃到。」','趕上班的工程師'],
    B:['「還可以啦，今天沒遲到就好。」','去市場的阿伯'],
    C:['「有點晃，但風景很漂亮。」','來花蓮玩的觀光客'],
    D:['「司機是不是第一天上班？」','抱著小孩的媽媽'],
  }[grade];
  out.push(ok);
  return out.slice(0,2).map(([q,who])=>`<blockquote class="say">${q}<cite>— ${who}</cite></blockquote>`).join('');
}

/* ---------- overlay fragments ---------- */
function titleExtrasHTML(){
  const best=load('cabBest',null), runs=load('cabRuns',0), n=ACHS.filter(a=>ACH[a.id]).length;
  return `<div class="recs"><span>最佳紀錄 <b>${best?best.score+' 分（'+best.grade+'）':'—'}</b></span><span>已開 <b>${runs}</b> 班</span><span>成就 <b>${n}/${ACHS.length}</b></span></div>
    <details class="achbox"><summary>查看成就徽章</summary>${achGridHTML()}</details>
    <div class="envpick" role="radiogroup" aria-label="天氣與時段">${Object.values(ENVS).map(e=>`<button type="button" role="radio" aria-checked="${e===ENV}" class="envbtn${e===ENV?' on':''}" data-env="${e.key}"><span>${e.icon}</span>${e.name}</button>`).join('')}</div>
    <div class="toggles"><label class="toggle"><input type="checkbox" id="sfxTog"${sfxOn?' checked':''}> 列車音效</label>
    <label class="toggle"><input type="checkbox" id="voiceTog"${voiceOn?' checked':''}> 車內語音廣播</label></div>`;
}
function bindTitleExtras(){
  const v=document.getElementById('voiceTog'); if(v) v.addEventListener('change',()=>setVoice(v.checked));
  const f=document.getElementById('sfxTog'); if(f) f.addEventListener('change',()=>setSfx(f.checked));
  document.querySelectorAll('.envbtn').forEach(b=>b.addEventListener('click',()=>{ setEnv(b.dataset.env); showOverlay('title'); const nb=document.querySelector('.envbtn[data-env="'+b.dataset.env+'"]'); if(nb) nb.focus({preventScroll:true}); }));
}
function endExtrasHTML(info,grade){
  const got=lastNew.map(id=>ACHS.find(a=>a.id===id)).filter(Boolean);
  return `${passengerSays(grade)}
    <div class="recs">${info.isBest?'<span class="nb">🎉 新紀錄！</span>':'<span>最佳紀錄 <b>'+info.best.score+' 分（'+info.best.grade+'）</b></span>'}<span>第 <b>${info.runs}</b> 班</span></div>
    ${got.length?`<div class="newach"><p class="eyebrow">本班解鎖成就</p>${achGridHTML(lastNew).replace('class="achs"','class="achs only-new"')}</div>`:''}`;
}
function shareText(grade){
  const rows=S.log.map(r=>r.miss?`${r.name} 過站`:`${r.name} ${fmtErr(r.err)} ${r.trank}`).join('\n');
  return `🚃 花東線駕駛室｜花蓮→壽豐（${ENV.name}）\n評價 ${grade}・${Math.round(S.score)} 分\n${rows}\n${location.href.split('#')[0]}`;
}
function bindEndExtras(grade){
  const b=document.getElementById('ovShare'); if(!b) return;
  b.addEventListener('click',async()=>{
    const txt=shareText(grade);
    try{
      if(navigator.share){ await navigator.share({text:txt}); return; }
      await navigator.clipboard.writeText(txt); b.firstChild.textContent='已複製成績！';
    }catch(e){ b.firstChild.textContent='複製失敗'; }
  });
}
