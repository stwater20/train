/* hud.js — 速度表與駕駛台儀表讀數 */
'use strict';

/* ---------- gauge ---------- */
const gcv=document.getElementById('gauge'), g=gcv.getContext('2d');
function drawGauge(lim){
  const s=gcv.clientWidth; if(!s) return;
  const dpr=Math.min(2,window.devicePixelRatio||1);
  if(gcv.width!==Math.round(s*dpr)){ gcv.width=gcv.height=Math.round(s*dpr); }
  g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,s,s);
  const cx=s/2, cy=s/2, R=s*0.46, A0=Math.PI*0.75, A1=Math.PI*2.25, GM=ROUTE.lineMax<=40?40:ROUTE.lineMax<=60?60:120, TS=GM===40?1:5, TM=GM===40?5:10, TL=GM===120?20:10, ang=v=>A0+(A1-A0)*clamp(v/GM,0,1);
  g.fillStyle='#0c1215'; g.beginPath(); g.arc(cx,cy,R,0,Math.PI*2); g.fill();
  g.strokeStyle='#2d3a42'; g.lineWidth=2; g.stroke();
  g.strokeStyle='rgba(255,74,61,0.85)'; g.lineWidth=R*0.07; g.beginPath(); g.arc(cx,cy,R*0.86,ang(lim),A1); g.stroke();
  for(let v=0; v<=GM; v+=TS){ const a=ang(v), major=v%TM===0, r1=R*0.92, r0=R*(major?0.78:0.84);
    g.strokeStyle= major?'#e6ebe9':'#7d8d94'; g.lineWidth= major?2:1;
    g.beginPath(); g.moveTo(cx+Math.cos(a)*r0,cy+Math.sin(a)*r0); g.lineTo(cx+Math.cos(a)*r1,cy+Math.sin(a)*r1); g.stroke();
    if(v%TL===0){ g.fillStyle='#c9d3d6'; g.font=(R*0.13).toFixed(1)+'px "Share Tech Mono",monospace'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(v,cx+Math.cos(a)*R*0.64,cy+Math.sin(a)*R*0.64); }
  }
  const kmh=S.v*3.6, a=ang(kmh);
  g.strokeStyle='#ffb23e'; g.lineWidth=3; g.lineCap='round'; g.beginPath(); g.moveTo(cx-Math.cos(a)*R*0.12,cy-Math.sin(a)*R*0.12); g.lineTo(cx+Math.cos(a)*R*0.82,cy+Math.sin(a)*R*0.82); g.stroke();
  g.fillStyle='#ffb23e'; g.beginPath(); g.arc(cx,cy,R*0.06,0,Math.PI*2); g.fill();
  g.fillStyle='#ffb23e'; g.font=(R*0.3).toFixed(1)+'px "Share Tech Mono",monospace'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(Math.round(kmh),cx,cy+R*0.48);
  g.fillStyle='#8b9ba2'; g.font=(R*0.1).toFixed(1)+'px "Share Tech Mono",monospace'; g.fillText('km/h',cx,cy+R*0.7);
}

/* ---------- readouts ---------- */
const $=id=>document.getElementById(id);
const el={clock:$('clock'),score:$('score'),next:$('roNext'),nextEn:$('roNextEn'),nextLab:$('roNextLab'),dist:$('roDist'),distSub:$('roDistSub'),
  limit:$('roLimit'),limitSub:$('roLimitSub'),sig:$('roSig'),sigSub:$('roSigSub'),ahead:$('roAhead'),sched:$('roSched'),slack:$('roSlack'),
  err:$('roErr'),ptr:$('errPtr'),pred:$('predPtr'),door:$('pDoor'),atp:$('pAtp'),pn:$('pNotch'),acc:$('accFill'),done:$('routeDone'),mark:$('trainMark'),
  hSpd:$('hSpd'),hLim:$('hLim'),hDist:$('hDist'),hNext:$('hNext'),hNextLab:$('hNextLab'),hNotch:$('hNotch'),hEta:$('hEta'),hEtaLab:$('hEtaLab'),hSlack:$('hSlack'),hNL:$('hNL'),hNLv:$('hNLv'),hNLd:$('hNLd'),hErr:$('hErr'),hPred:$('hPred'),hErrBox:$('hErrBox'),hDistLab:$('hDistLab'),bDoor:$('bDoor'),bc:$('pBc'),grade:$('pGrade'),slip:$('pSlip')};
const SIGNAME={G:L('綠燈','Green','進行'),Y:L('黃燈','Yellow','注意'),R:L('紅燈','Red','停止')};
let lastHud=0;
function hud(now){
  const lim=currentLimit();
  drawGauge(lim);
  if(now-lastHud<90) return; lastHud=now;
  el.clock.textContent=fmtClock(BASE_CLOCK+S.t);
  el.score.textContent=Math.round(S.score);
  const st=STATIONS[S.next];
  const dist=st ? st.pos-S.pos : 0;
  if(S.doors){ el.nextLab.textContent=L('停車中','Stopped at','停車中'); el.next.textContent=stName(st); el.nextEn.textContent=L('旅客上下車 · '+Math.ceil(S.dwell)+' 秒後關門','Boarding · doors close in '+Math.ceil(S.dwell)+' s','乗降中 · '+Math.ceil(S.dwell)+' 秒後にドア閉'); }
  else if(st){ el.nextLab.textContent=S.next===STATIONS.length-1?L('下一站（終點）','Next stop (terminus)','次は終点'):L('下一站','Next stop','次の駅'); el.next.textContent=stName(st); el.nextEn.textContent=LANG==='en'?st.name:st.en; }
  if(st){
    const txt = dist>=100 ? Math.round(dist)+' m' : dist>=-15 ? (dist>=0?'':'+')+Math.abs(dist).toFixed(1)+' m' : '—';
    el.dist.textContent=txt; el.dist.classList.toggle('warn',dist<0);
    el.distSub.textContent= dist<0 ? L('已超過停車位置','Past the stop mark','停止位置を超過') : dist<300 ? L('藍色「'+CARS()+'」停車位置標','Blue “'+CARS()+'” stop board','青い「'+CARS()+'」停止位置目標') : L('月台在左側','Platform on the left','ホームは左側');
    el.hDist.textContent=txt;
    const err=-dist;
    if(dist<DIFF.gauge && dist>-30){ el.ptr.hidden=false; el.ptr.style.left=((clamp(err,-15,15)+15)/30*100)+'%'; el.err.textContent=fmtErr(err); el.err.classList.add('num'); }
    else { el.ptr.hidden=true; el.err.textContent=DIFF.gauge<80?L('最後 20 m 顯示','shown in the last 20 m','残り 20 m で表示'):L('接近時顯示','shown near the mark','接近時に表示'); el.err.classList.remove('num'); }
    // 新手模式：預計停車位置（綠色三角形）與煞車提示
    const pe = (DIFF.guide && !S.doors && S.v>0.3 && S.acc<-0.05) ? S.pos + S.v*S.v/(2*-S.acc) - st.pos : null;
    if(pe!=null && dist<300){ el.pred.hidden=false; el.pred.style.left=((clamp(pe,-15,15)+15)/30*100)+'%';
      if(dist>=80) el.distSub.textContent=L('預計停在 ','Predicted stop ','停止予測 ')+fmtErr(pe); }
    else el.pred.hidden=true;
    el.sched.textContent=fmtClock(BASE_CLOCK+st.arr);
    const slack=st.arr-S.t;
    el.slack.textContent= slack>=0 ? L('尚有 ','Time left ','残り ')+fmtDur(slack) : L('已延誤 ','Late by ','遅れ ')+fmtDur(slack);
    el.slack.classList.toggle('warn',slack<0);
  }
  el.limit.textContent=lim; el.hLim.textContent=lim;
  let sub='km/h'; const p=S.pos;
  for(const Lm of LIMITS) if(p>Lm.e && p<=Lm.e+TRAIN_LEN && Lm.v===lim){ sub=L('尾端通過還需 ','Rear clears in ','最後尾通過まで ')+Math.ceil(Lm.e+TRAIN_LEN-p)+' m'; }
  if(S.yellowUntil>0 && p<S.yellowUntil && lim===45) sub=L('黃燈注意運轉','Yellow: caution','注意運転');
  el.limitSub.textContent=sub;
  el.limit.classList.toggle('warn',S.v*3.6>lim+1);
  const dSig=SIGNAL_POS-p;
  if(dSig>0 && dSig<1600){ el.sig.className='lamp '+S.sig.aspect; el.sig.lastChild.textContent=SIGNAME[S.sig.aspect]; el.sigSub.textContent=L('第 32 號閉塞號誌 · ','Block signal 32 · ','第32号閉塞信号 · ')+Math.round(dSig)+' m'; }
  else { el.sig.className='lamp'; el.sig.lastChild.textContent='—'; el.sigSub.textContent= dSig<=0 ? L('已通過','Passed','通過済み') : L('前方無號誌','No signal ahead','前方に信号なし'); }
  const items=[];
  LIMITS.forEach(Lm=>{ const d=Lm.s-p; if(Lm.s>0 && d>0 && d<900) items.push([d,L('限速 ','Limit ','制限 ')+Lm.v]); });
  if(dSig>0 && dSig<900) items.push([dSig,L('號誌 ','Signal ','信号 ')+SIGNAME[S.sig.aspect]]);
  CROSSINGS.forEach(c=>{ const d=c-p; if(d>0 && d<700) items.push([d,L('平交道','Level crossing','踏切')]); const dw=c-300-p; if(dw>0&&dw<500) items.push([dw,L('鳴笛標','Whistle board','汽笛標識')]); });
  GRADES.forEach((G,k)=>{ const d=G.s-p, pg=GRADES[k-1]; if(k>0 && d>0 && d<900 && pg.g!==G.g) items.push([d, G.g>0?L('上坡 ','Up ','上り ')+G.g+'‰':G.g<0?L('下坡 ','Down ','下り ')+(-G.g)+'‰':L('坡度變水平','Level track','平坦')]); });
  items.sort((a,b)=>a[0]-b[0]);
  el.ahead.innerHTML = items.length ? items.slice(0,2).map(([d,t])=>'<div>'+t+' · <span>'+Math.round(d)+' m</span></div>').join('') : '<div>'+L('線路淨空','Line clear','前方異常なし')+'</div>';
  el.door.textContent=L('車門 ','Doors ','ドア ')+(S.doors?L('開','open','開'):L('關','closed','閉')); el.door.classList.toggle('on',S.doors);
  const atp=S.atpOver||S.atpSig||S.spad; el.atp.textContent= atp ? L('ATP 介入','ATP active','ATP作動') : L('ATP 正常','ATP normal','ATP正常'); el.atp.classList.toggle('alert',atp);
  const bc=S.phase==='run'? Math.round(Math.max(0,-S.curF)/ROUTE.ebDecel*440) : 440; el.bc.textContent='BC '+bc+' kPa'; el.bc.classList.toggle('on',bc>20);
  const gr=gradeAt(p); el.grade.textContent=L('坡度 ','Grade ','勾配 ')+(gr>0?'↗ ':gr<0?'↘ ':'')+Math.abs(gr)+'‰'+(ROUTE.key==='alishan'?L(' · 海拔 ',' · alt. ',' · 標高 ')+altitude(p).toLocaleString()+' m':''); el.grade.classList.toggle('on',gr!==0);
  el.slip.hidden=!S.slip; el.slip.classList.toggle('alert',!!S.slip);
  el.pn.textContent=L('主控制器 ','Controller ','マスコン ')+nLabel(S.notch)+(S.eff!==S.notch && S.phase==='run' ? L('（實際 ',' (actual ','（実際 ')+nLabel(S.eff)+L('）',')','）'):'');
  const acc=clamp(S.acc,-1.5,1.0);
  if(acc>=0){ el.acc.style.left='60%'; el.acc.style.width=(acc/1.0*40)+'%'; el.acc.style.background='var(--power)'; }
  else { el.acc.style.width=(-acc/1.5*60)+'%'; el.acc.style.left=(60+acc/1.5*60)+'%'; el.acc.style.background='var(--brake)'; }
  const frac=clamp(S.pos/END,0,1);
  el.done.style.width=(frac*100)+'%'; el.mark.style.left=(frac*100)+'%';
  stnEls.forEach((d,i)=>{ d.classList.toggle('done', i<S.next || (i===S.next && S.doors) || S.phase==='end'); d.classList.toggle('next', i===S.next && !S.doors && S.phase==='run'); });
  el.hSpd.textContent=Math.round(S.v*3.6);
  // 下一個（比現在低的）速限與距離
  const nl=LIMITS.filter(Lm=>Lm.s>p && Lm.s-p<1200 && Lm.v<lim).sort((a,b)=>a.s-b.s)[0];
  el.hNL.hidden=!nl; if(nl){ el.hNLv.textContent=nl.v; el.hNLd.textContent=Math.round(nl.s-p)+' m'; }
  // 手機版畫面上的小儀表：下一站、檔位、停車誤差
  if(st){ el.hEta.textContent=fmtClock(BASE_CLOCK+st.arr).slice(0,5); el.hEtaLab.textContent=L('預定到達','Due','到着予定'); const sl=st.arr-S.t;
    el.hSlack.textContent= sl>=0 ? L('尚有 ','in ','あと ')+fmtDur(sl) : L('延誤 ','late ','遅れ ')+fmtDur(sl); el.hSlack.classList.toggle('warn',sl<0); }
  if(st){ el.hNext.textContent=stName(st); el.hNextLab.textContent=S.doors?L('停車中','Stopped','停車中'):L('下一站','Next','次駅'); }
  el.hNotch.textContent=nLabel(S.eff); el.hNotch.className='hud-notch '+(S.eff>0?'p':S.eff<0?(S.eff===-9?'e':'b'):'n');
  el.hErr.hidden=el.ptr.hidden; el.hErr.style.left=el.ptr.style.left; el.hPred.hidden=el.pred.hidden; el.hPred.style.left=el.pred.style.left;
  el.hErrBox.classList.toggle('on',!el.ptr.hidden || !el.pred.hidden);
  el.bDoor.firstChild.textContent = S.doors ? L('上下車中','Boarding','乗降中') : L('開門','Doors','ドア開');
  renderLever();
}

