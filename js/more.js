/* more.js — 更多成就與解鎖：隱藏時段（黃金時刻、首班車）、主任司機員車種、連勝與全線挑戰 */
'use strict';

/* 時段解鎖 */
function envUnlocked(e){ if(!e || !e.req) return true; if(e.req.startsWith('rank')) return rankOf(load('cabXP',0))+1>=+e.req.slice(4); return !!ACH[e.req] || !!FLAGS[e.req]; }

if(typeof ACHS!=='undefined') ACHS.push(
  {id:'perfect3', icon:'🤌', name:L('神之手','Golden hands','神の手'), desc:L('一班車裡有 3 站停車誤差 0.5 m 以內','Three stops within 0.5 m on one run','1回の運転で 3 駅を誤差 0.5 m 以内に')},
  {id:'streak3',  icon:'🔥', name:L('連勝司機','Hot streak','連勝運転士'), desc:L('連續 3 班拿到 A 以上','Get an A or better three runs in a row','3 回連続で A 以上'), prog:()=>[Math.min(3,load('cabStreak',0)),3]},
  {id:'sgold',    icon:'🥇', name:L('金牌司機','Gold medallist','金メダル運転士'), desc:L('在 3 條不同路線拿到 S','Get an S on three different lines','3 路線で S 評価'), prog:()=>[Math.min(3,ROUTE_KEYS.filter(k=>FLAGS['S_'+k]).length),3]},
  {id:'sall',     icon:'🌟', name:L('全線金牌','Gold on every line','全路線で S'), desc:L('每條路線都拿到 S','Get an S on every line','全路線で S 評価'), prog:()=>[ROUTE_KEYS.filter(k=>FLAGS['S_'+k]).length,ROUTE_KEYS.length]},
  {id:'allweather', icon:'🌦️', name:L('四季司機','All-weather driver','オールシーズン'), desc:L('同一條路線在早晨、黃昏、夜間、雨天都開完','Finish one line in morning, dusk, night and rain','同じ路線を朝・夕方・夜・雨で完走')},
  {id:'century',  icon:'💯', name:L('時速百公里','Ton-up','時速 100 km'), desc:L('開到時速 99 km/h 以上','Reach 99 km/h or more','時速 99 km 以上に到達')},
  {id:'stamproute', icon:'🗂️', name:L('集章入門','Stamp starter','スタンプ入門'), desc:L('集滿任一條路線的車站紀念章','Collect every station stamp on one line','いずれかの路線のスタンプをすべて集める')},
  {id:'goldenrun', icon:'🌅', name:L('黃金時刻','Golden hour','ゴールデンアワー'), desc:L('在解鎖的「黃金時刻」開完一班','Finish a run in the unlocked Golden hour','解除した「ゴールデンアワー」で完走')},
  {id:'firstrun', icon:'🌄', name:L('首班車司機','First-train driver','始発の運転士'), desc:L('在解鎖的「首班車」開完一班','Finish a run on the unlocked First train','解除した「始発」で完走')},
);

/* 結算時呼叫（在 extrasEnd 裡、判斷新車種之前） */
function moreEnd(grade, stops){
  if(stops.filter(r=>Math.abs(r.err)<=0.5).length>=3) unlockAch('perfect3');
  const good=grade==='S'||grade==='A'; const st=good?load('cabStreak',0)+1:0; save('cabStreak',st); if(st>=3) unlockAch('streak3');
  if(grade==='S'){ setFlag('S_'+ROUTE.key); if(ROUTE_KEYS.filter(k=>FLAGS['S_'+k]).length>=3) unlockAch('sgold'); if(ROUTE_KEYS.every(k=>FLAGS['S_'+k])) unlockAch('sall'); }
  const ed=load('cabEnvDone',{}); ed[ROUTE.key]=ed[ROUTE.key]||{}; ed[ROUTE.key][ENV.key]=1; save('cabEnvDone',ed);
  if(['morning','dusk','night','rain'].every(k=>ed[ROUTE.key][k])) unlockAch('allweather');
  if((S.maxV||0)*3.6>=99) unlockAch('century');
  if(ROUTE.stations.every(s=>STAMPS[s.name])) unlockAch('stamproute');
  if(ENV.key==='golden') unlockAch('goldenrun');
  if(ENV.key==='first') unlockAch('firstrun');
  // 新解鎖的時段
  S.newEnvs=Object.values(ENVS).filter(e=>e.req && envUnlocked(e) && !load('cabEnvSeen_'+e.key,false));
  S.newEnvs.forEach(e=>save('cabEnvSeen_'+e.key,true));
}
function newEnvHTML(){
  const n=S.newEnvs||[]; if(!n.length) return '';
  return `<div class="unlock">🎉 ${L('解鎖新時段','New time of day unlocked','新しい時間帯を解除')}<b>${n.map(e=>e.icon+' '+e.name).join('、')}</b><small>${L('在「出發」頁的天氣與時段選擇','Pick it under Weather and time on the Depart tab','「出発」の天気と時間帯で選べます')}</small></div>`;
}
