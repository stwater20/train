/* share.js — 推廣用：成績分享圖、挑戰連結、社群分享按鈕、社群預覽圖（OG）截圖模式 */
'use strict';

const SITE_URL='https://train.sectools.tw';
const SHARE_FONT='"Noto Sans TC","PingFang TC","Hiragino Sans","Microsoft JhengHei",sans-serif';
const LINE_COLOR={airport:'#8246af',hualien:'#2f6fb6',alishan:'#b3262b',tamsui:'#d9282f',keiyo:'#c9252f',keikyu:'#c8222c',enoden:'#2f7d4f'};
const RNAME=()=>ROUTE.name||ROUTE.title;
const ROUTE_ICON={airport:'✈️',hualien:'🚃',alishan:'🌲',tamsui:'🚇',keiyo:'🎡',keikyu:'🔴',enoden:'🌊'};

/* ---------- 連結 ---------- */
function shareUrl(params){
  const u=new URL(SITE_URL+pagePath(LANG,ROUTE.key));
  Object.entries(params||{}).forEach(([k,v])=>u.searchParams.set(k,v));
  return u.toString();
}
/* 朋友傳來的挑戰：?vs=652A 代表在這條路線拿到 652 分、A 評價 */
const CHALLENGE=(()=>{ try{ const m=/^(\d{1,5})([SABCD])$/.exec(new URLSearchParams(location.search).get('vs')||''); return m?{score:+m[1],grade:m[2]}:null; }catch(e){ return null; } })();

function challengeHTML(){
  if(!CHALLENGE) return '';
  return `<div class="challenge">⚔️ <span>${L(`朋友在${RNAME()}拿到 <b>${CHALLENGE.grade}</b>（${CHALLENGE.score} 分），你能超越嗎？`,
    `A friend scored <b>${CHALLENGE.grade}</b> (${CHALLENGE.score} pts) on ${RNAME()}. Can you beat it?`,
    `友だちが${RNAME()}で <b>${CHALLENGE.grade}</b>（${CHALLENGE.score} 点）。超えられる？`)}</span></div>`;
}
function challengeResultHTML(score){
  if(!CHALLENGE) return '';
  const d=Math.round(score)-CHALLENGE.score;
  return `<div class="challenge ${d>=0?'win':'lose'}">${d>=0?'🏆':'💪'} <span>${d>=0
    ? L(`挑戰成功！比朋友多 <b>${d}</b> 分，把成績傳回去吧`,`You beat your friend by <b>${d}</b> pts — send it back!`,`挑戦成功！友だちより <b>${d}</b> 点上。送り返そう`)
    : L(`還差 <b>${-d}</b> 分就超越朋友了，再開一班！`,`<b>${-d}</b> pts short of your friend — one more run!`,`あと <b>${-d}</b> 点で友だち超え。もう一回！`)}</span></div>`;
}

/* ---------- 成績分享圖（1200×630，社群預覽的標準比例） ---------- */
function snap3D(){
  const cv=document.getElementById('view');
  try{ if(typeof render==='function' && R3){ window.__snap=true; render(0); } }catch(e){}
  return cv;
}
function roundRect(x,X,Y,w,h,r){ x.beginPath(); x.moveTo(X+r,Y); x.arcTo(X+w,Y,X+w,Y+h,r); x.arcTo(X+w,Y+h,X,Y+h,r); x.arcTo(X,Y+h,X,Y,r); x.arcTo(X,Y,X+w,Y,r); x.closePath(); }
function makeShareCard(grade,score){
  const W=1200,H=630, c=document.createElement('canvas'); c.width=W; c.height=H; const x=c.getContext('2d');
  x.fillStyle='#0d1215'; x.fillRect(0,0,W,H);
  const v=snap3D();
  if(v && v.width){ const k=Math.max(W/v.width,H/v.height), w=v.width*k, h=v.height*k; try{ x.drawImage(v,(W-w)/2,(H-h)/2-H*0.06,w,h); }catch(e){} }
  // 左側壓暗，放文字
  let g=x.createLinearGradient(0,0,W*0.75,0); g.addColorStop(0,'rgba(8,11,13,.92)'); g.addColorStop(0.55,'rgba(8,11,13,.62)'); g.addColorStop(1,'rgba(8,11,13,0)');
  x.fillStyle=g; x.fillRect(0,0,W,H);
  g=x.createLinearGradient(0,H-120,0,H); g.addColorStop(0,'rgba(8,11,13,0)'); g.addColorStop(1,'rgba(8,11,13,.9)'); x.fillStyle=g; x.fillRect(0,H-120,W,120);
  const LC=LINE_COLOR[ROUTE.key]||'#ffb23e';
  x.fillStyle=LC; x.fillRect(0,0,12,H);
  x.textBaseline='alphabetic'; x.textAlign='left';
  // 路線名
  x.fillStyle='#ffb23e'; x.font=`700 26px ${SHARE_FONT}`; x.fillText(L('火車駕駛模擬','TRAIN DRIVING SIMULATOR','電車運転シミュレーター'),64,86);
  x.fillStyle='#fff'; x.font=`900 58px ${SHARE_FONT}`; x.fillText(RNAME(),64,156);
  x.fillStyle='#c9d3d6'; x.font=`500 28px ${SHARE_FONT}`; x.fillText(`${stName(STATIONS[0])} → ${stName(STATIONS[STATIONS.length-1])}　${ENV.icon} ${ENV.name}　${DIFF.key==='pro'?L('專業','Pro','上級'):L('新手','Beginner','初級')}`,64,202);
  // 評價
  const gc={S:'#ffd23e',A:'#7fe0a0',B:'#7fc4ff',C:'#c9d3d6',D:'#ff8a7a'}[grade]||'#fff';
  x.fillStyle=gc; x.font=`900 210px ${SHARE_FONT}`; x.fillText(grade,58,420);
  const gw=x.measureText(grade).width;
  x.fillStyle='#fff'; x.font=`800 72px ${SHARE_FONT}`; const sTxt=`${Math.round(score)}`; x.fillText(sTxt,92+gw,418); const sw=x.measureText(sTxt).width;
  x.fillStyle='#9fb0b8'; x.font=`600 30px ${SHARE_FONT}`; x.fillText(L('分','pts','点'),104+gw+sw,418);
  if(CHALLENGE){ x.fillStyle=Math.round(score)>=CHALLENGE.score?'#7fe0a0':'#ff8a7a'; x.font=`700 26px ${SHARE_FONT}`; x.fillText(Math.round(score)>=CHALLENGE.score?L('⚔️ 挑戰成功','⚔️ Challenge won','⚔️ 挑戦成功'):L('⚔️ 挑戰中','⚔️ Challenge','⚔️ 挑戦中'),96+gw,340); }
  // 統計
  const stops=S.log.filter(r=>!r.miss), avg=stops.length?stops.reduce((a,r)=>a+Math.abs(r.err),0)/stops.length:0, ontime=stops.filter(r=>r.trank==='準點').length;
  const chips=[L(`平均停車誤差 ${avg.toFixed(2)} m`,`Avg stop error ${avg.toFixed(2)} m`,`平均停止誤差 ${avg.toFixed(2)} m`), L(`準點 ${ontime}/${STATIONS.length-1} 站`,`On time ${ontime}/${STATIONS.length-1}`,`定時 ${ontime}/${STATIONS.length-1} 駅`)];
  let cx=64; x.font=`600 24px ${SHARE_FONT}`;
  chips.forEach(t=>{ const w=x.measureText(t).width+36; x.fillStyle='rgba(255,255,255,.1)'; roundRect(x,cx,456,w,48,24); x.fill(); x.strokeStyle='rgba(255,255,255,.22)'; x.lineWidth=1.5; x.stroke(); x.fillStyle='#e6ebe9'; x.fillText(t,cx+18,488); cx+=w+14; });
  // 頁尾：網址與製作者
  x.fillStyle='#fff'; x.font=`800 32px ${SHARE_FONT}`; x.fillText('train.sectools.tw',64,H-44);
  x.fillStyle='#9fb0b8'; x.font=`500 22px ${SHARE_FONT}`; x.textAlign='right';
  x.fillText(L('免安裝・瀏覽器直接玩　由 SecTools.tw 製作','Free in your browser · made by SecTools.tw','インストール不要・ブラウザで遊べる　制作 SecTools.tw'),W-48,H-46);
  return c;
}
const canvasBlob=c=>new Promise(r=>{ try{ c.toBlob(b=>r(b),'image/png'); }catch(e){ r(null); } });

/* ---------- 結算畫面的分享面板 ---------- */
function shareMsg(grade,score){
  return L(`我在「${RNAME()}」拿到 ${grade} 評價（${Math.round(score)} 分）！你能把車停得比我準嗎？`,
           `I got an ${grade} (${Math.round(score)} pts) driving the ${RNAME()}! Can you stop more precisely than me?`,
           `「${RNAME()}」で ${grade} 評価（${Math.round(score)} 点）！もっとピタッと止められる？`);
}
function sharePanelHTML(){
  return `<div class="sharebox" id="shareBox" hidden>
    <img id="shareImg" alt="${L('成績分享圖','Result card','結果画像')}">
    <div class="sharebtns">
      <button class="btn share-native" id="shNative" type="button">📤 ${L('分享圖片','Share image','画像をシェア')}</button>
      <a class="btn share-line" id="shLine" target="_blank" rel="noopener">LINE</a>
      <a class="btn share-x" id="shX" target="_blank" rel="noopener">𝕏</a>
      <a class="btn share-fb" id="shFb" target="_blank" rel="noopener">Facebook</a>
      <button class="btn" id="shCopy" type="button">🔗 ${L('複製挑戰連結','Copy challenge link','挑戦リンクをコピー')}</button>
      <button class="btn" id="shSave" type="button">⬇️ ${L('下載圖片','Save image','画像を保存')}</button>
    </div>
    <p class="sharehint">${L('朋友打開連結，就會看到你的成績並接受挑戰。','Friends who open the link see your score and can try to beat it.','リンクを開いた友だちにスコアが表示され、挑戦できます。')}</p>
  </div>`;
}
async function openShare(grade,score){
  const box=document.getElementById('shareBox'); if(!box) return;
  box.hidden=false; box.scrollIntoView({block:'nearest',behavior:'smooth'});
  const url=shareUrl({vs:Math.round(score)+grade, utm_source:'share', utm_medium:'social'}), msg=shareMsg(grade,score);
  const card=makeShareCard(grade,score), img=document.getElementById('shareImg'); window.__snap=false;
  try{ img.src=card.toDataURL('image/jpeg',0.86); }catch(e){ img.hidden=true; }
  const enc=encodeURIComponent;
  document.getElementById('shLine').href=`https://social-plugins.line.me/lineit/share?url=${enc(url)}&text=${enc(msg)}`;
  document.getElementById('shX').href=`https://twitter.com/intent/tweet?text=${enc(msg)}&url=${enc(url)}&hashtags=${enc(L('火車駕駛模擬','TrainSim','電車運転'))}`;
  document.getElementById('shFb').href=`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`;
  const blob=await canvasBlob(card), file=blob?new File([blob],`train-${ROUTE.key}-${grade}.png`,{type:'image/png'}):null;
  const nb=document.getElementById('shNative');
  const canFile=file && navigator.canShare && navigator.canShare({files:[file]});
  if(!navigator.share) nb.hidden=true;
  nb.onclick=async()=>{ try{ if(canFile) await navigator.share({files:[file],text:msg+'\n'+url}); else await navigator.share({text:msg,url}); }catch(e){} };
  document.getElementById('shCopy').onclick=async e=>{ const b=e.currentTarget; try{ await navigator.clipboard.writeText(msg+'\n'+url); b.textContent='✅ '+L('已複製','Copied','コピーしました'); }catch(err){ b.textContent=L('複製失敗','Copy failed','コピー失敗'); } };
  document.getElementById('shSave').onclick=()=>{ if(!blob) return; const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=file.name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1000); };
}

/* ---------- 標題畫面：推薦給朋友 ---------- */
function bindShareTitle(){
  const b=document.getElementById('ovShareSite'); if(!b) return;
  b.addEventListener('click',async()=>{
    const url=shareUrl({utm_source:'share',utm_medium:'invite'}), msg=L(`免安裝的 3D 火車駕駛遊戲：${RNAME()}，來比誰停得準！`,`A free 3D train driving game in your browser: ${RNAME()}. Who can stop more precisely?`,`ブラウザで遊べる 3D 電車運転ゲーム：${RNAME()}。どっちがピタッと止められる？`);
    try{ if(navigator.share){ await navigator.share({title:document.title,text:msg,url}); return; } await navigator.clipboard.writeText(msg+'\n'+url); b.textContent='✅ '+L('連結已複製','Link copied','リンクをコピーしました'); }catch(e){}
  });
}

/* ---------- 社群預覽圖（OG）截圖模式：?og=1 ---------- */
const OG_MODE=(()=>{ try{ return new URLSearchParams(location.search).get('og')==='1'; }catch(e){ return false; } })();
const OG_POS={airport:2250,hualien:1500,alishan:900,enoden:2500,tamsui:2600,keiyo:1300,keikyu:560};
if(OG_MODE){
  document.documentElement.classList.add('og');
  const home=!window.FORCE_ROUTE;
  window.addEventListener('DOMContentLoaded',()=>{
    const t=document.title.split(/｜| \| /), d=document.createElement('div'); d.className='ogcard';
    d.innerHTML=`<i class="ogbar" style="background:${LINE_COLOR[ROUTE.key]}"></i><p class="ogeye">${L('免安裝・瀏覽器直接玩','FREE · PLAY IN YOUR BROWSER','インストール不要・ブラウザで遊べる')}</p>
      <h1>${home?L('火車駕駛模擬','Train Driving Simulator','電車運転シミュレーター'):(t[0]||ROUTE.title)}</h1>
      <p class="ogsub">${home?L('花東線・阿里山・淡水線・機場捷運・江之電・京葉線・京急','Taiwan & Japan: 7 real lines','台湾と日本の 7 路線'):(t[1]||'')}</p>
      <p class="ogurl">train.sectools.tw</p>`;
    document.body.appendChild(d);
    // 標題太長就縮小字，中日文維持一行、英文最多兩行
    const h1=d.querySelector('h1'), lines=LANG==='en'?2:1; let fs=70;
    const fit=()=>{ while(fs>40 && h1.getBoundingClientRect().height>fs*1.12*lines+6){ fs-=2; h1.style.fontSize=fs+'px'; } };
    fit(); if(document.fonts) document.fonts.ready.then(fit);
  });
}
const OG_ENV={alishan:'clear'};
let ogEnvDone=false;
function ogTick(){ if(!OG_MODE) return; if(!ogEnvDone && typeof R3!=='undefined' && R3){ ogEnvDone=true; const w=OG_ENV[ROUTE.key]||'morning'; if(ENV.key!==w && ENVS[w] && typeof setEnv==='function') setEnv(w); } S.phase='title'; S.pos=OG_POS[ROUTE.key]||800; S.v=0; }

/* ---------- 駕駛中拍照分享（📷 按鈕／K 鍵） ---------- */
function makePhoto(){
  const v=snap3D(); window.__snap=false;
  const W=1280, H=720, c=document.createElement('canvas'); c.width=W; c.height=H; const x=c.getContext('2d');
  x.fillStyle='#0d1215'; x.fillRect(0,0,W,H);
  if(v && v.width){ const k=Math.max(W/v.width,H/v.height), w=v.width*k, h=v.height*k; try{ x.drawImage(v,(W-w)/2,(H-h)/2,w,h); }catch(e){} }
  const g=x.createLinearGradient(0,H-170,0,H); g.addColorStop(0,'rgba(8,11,13,0)'); g.addColorStop(1,'rgba(8,11,13,.88)'); x.fillStyle=g; x.fillRect(0,H-170,W,170);
  const LC=LINE_COLOR[ROUTE.key]||'#ffb23e', J=ROUTE.japan||ROUTE.jpSign;
  x.fillStyle=LC; x.fillRect(40,H-104,8,64);
  x.textAlign='left'; x.textBaseline='alphabetic';
  x.fillStyle='#fff'; x.font=`800 38px ${SHARE_FONT}`; x.fillText(RNAME(),64,H-70);
  const nx=STATIONS[S.next], dst=ROUTE.dest?(LANG==='en'?ROUTE.dest.en:J?ROUTE.dest.ja:ROUTE.dest.name):stName(STATIONS[STATIONS.length-1]);
  x.fillStyle='#c9d3d6'; x.font=`500 24px ${SHARE_FONT}`;
  x.fillText(`${L('往','for','行先')} ${dst}　${nx?L('下一站 ','Next ','次 ')+stName(nx):''}　${fmtClock(BASE_CLOCK+(S.t||0)).slice(0,5)}　${ENV.icon} ${ENV.name}`,64,H-38);
  x.textAlign='right'; x.fillStyle='#fff'; x.font=`800 28px ${SHARE_FONT}`; x.fillText('train.sectools.tw',W-40,H-70);
  x.fillStyle='#9fb0b8'; x.font=`500 18px ${SHARE_FONT}`; x.fillText(L('由 SecTools.tw 製作的免費 3D 火車駕駛遊戲','A free 3D train game by SecTools.tw','SecTools.tw 制作の無料 3D 電車ゲーム'),W-40,H-40);
  return c;
}
let photoWasRunning=false;
async function openPhoto(){
  if(!R3) return;
  const c=makePhoto();
  photoWasRunning = S.phase==='run' && !S.paused; if(photoWasRunning) S.paused=true;
  let m=document.getElementById('photoModal'); if(m) m.remove();
  m=document.createElement('div'); m.id='photoModal'; m.className='photomodal';
  const url=shareUrl({utm_source:'photo',utm_medium:'social'}), msg=L(`在「${RNAME()}」駕駛室拍的照片 📷 免安裝、瀏覽器就能開的 3D 火車駕駛遊戲`,`Snapped from the cab of the ${RNAME()} 📷 A free 3D train driving game in your browser`,`「${RNAME()}」の運転台から 📷 ブラウザで遊べる無料 3D 電車運転ゲーム`), enc=encodeURIComponent;
  m.innerHTML=`<div class="pm-card"><div class="pm-head"><b>📷 ${L('駕駛室照片','Cab photo','運転台フォト')}</b><button class="btn" id="pmClose" type="button">${L('繼續駕駛','Back to driving','運転に戻る')}</button></div>
    <img id="pmImg" alt="${L('駕駛室照片','Cab photo','運転台フォト')}">
    <div class="sharebtns"><button class="btn share-native" id="pmShare" type="button">📤 ${L('分享照片','Share photo','写真をシェア')}</button><button class="btn" id="pmSave" type="button">⬇️ ${L('下載','Save','保存')}</button>
      <a class="btn share-line" target="_blank" rel="noopener" href="https://social-plugins.line.me/lineit/share?url=${enc(url)}&text=${enc(msg)}">LINE</a>
      <a class="btn share-x" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=${enc(msg)}&url=${enc(url)}">𝕏</a>
      <a class="btn share-fb" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${enc(url)}">Facebook</a></div>
    <p class="sharehint">${L('LINE／X／Facebook 會分享遊戲連結；要附上照片請用「分享照片」或先下載。','LINE / X / Facebook share the game link; use “Share photo” or Save to attach the picture.','LINE／X／Facebook はリンクのみ。写真は「写真をシェア」か保存してから。')}</p></div>`;
  document.body.appendChild(m);
  try{ m.querySelector('#pmImg').src=c.toDataURL('image/jpeg',0.88); }catch(e){}
  const blob=await canvasBlob(c), file=blob?new File([blob],`train-${ROUTE.key}-photo.png`,{type:'image/png'}):null;
  const sb=m.querySelector('#pmShare'); if(!navigator.share) sb.hidden=true;
  sb.onclick=async()=>{ try{ if(file && navigator.canShare && navigator.canShare({files:[file]})) await navigator.share({files:[file],text:msg+'\n'+url}); else await navigator.share({text:msg,url}); }catch(e){} };
  m.querySelector('#pmSave').onclick=()=>{ if(!blob) return; const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=file.name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1000); };
  const close=()=>{ m.remove(); if(photoWasRunning && S.phase==='run'){ S.paused=false; } };
  m.querySelector('#pmClose').onclick=close; m.addEventListener('click',e=>{ if(e.target===m) close(); });
  if(typeof unlockAch==='function') unlockAch('photo');
}
if(typeof ACHS!=='undefined') ACHS.push({id:'photo', icon:'📷', name:L('鐵道攝影師','Rail photographer','鉄道カメラマン'), desc:L('在駕駛室拍一張照片','Take a photo from the cab','運転台から写真を撮る')});
document.addEventListener('DOMContentLoaded',()=>{ const b=document.getElementById('bShot'); if(b) b.addEventListener('click',openPhoto); });
window.addEventListener('keydown',e=>{ if(e.metaKey||e.ctrlKey||e.altKey) return; if(e.key.toLowerCase()==='k' && !e.repeat && document.activeElement?.tagName!=='INPUT'){ const m=document.getElementById('photoModal'); if(m) m.remove(); else openPhoto(); } });
