/* extras.js — 成就、最佳紀錄、車內廣播、開門音、旅客評語與分享 */
'use strict';

/* ---------- storage ---------- */
function load(key,def){ try{ const v=localStorage.getItem(key); return v==null?def:JSON.parse(v); }catch(e){ return def; } }
function save(key,v){ try{ localStorage.setItem(key,JSON.stringify(v)); }catch(e){} }

/* ---------- achievements ---------- */
const ACHS=[
  {id:'grad',    icon:'🎓', name:L('新手畢業','Graduate','卒業'),   desc:L('完成新手教學','Finish the tutorial','チュートリアルを完了')},
  {id:'first',   icon:'🚃', name:L('首航','Maiden run','初乗務'),       desc:L('第一次把花東線開到壽豐','Drive the Hualien line all the way to Shoufeng','花東線で寿豊まで走り切る')},
  {id:'zhushan', icon:'⛰️', name:L('登上祝山','Summit','祝山到達'),   desc:L('把阿里山小火車開到海拔 2,451 m 的祝山','Take the Alishan train up to Zhushan at 2,451 m','阿里山の列車で標高 2,451 m の祝山へ')},
  {id:'enoshima', icon:'🌊', name:L('抵達江之島','Made it to Enoshima','江ノ島到着'), desc:L('把江之電開到江之島','Drive the Enoden all the way to Enoshima','江ノ電で江ノ島まで走り切る')},
  {id:'tamsui', icon:'🚇', name:L('抵達淡水','Made it to Tamsui','淡水到着'), desc:L('把捷運開到淡水','Drive the metro all the way to Tamsui','MRTで淡水まで走り切る')},
  {id:'keiyo', icon:'🎡', name:L('灣岸通勤','Bayside commuter','ベイエリア通勤'), desc:L('把京葉線開到市川鹽濱','Drive the Keiyō Line to Ichikawashiohama','京葉線で市川塩浜まで走り切る')},
  {id:'sunrise', icon:'🌄', name:L('祝山看日出','Sunrise at Zhushan','祝山のご来光'), desc:L('開日出列車準點抵達祝山','Reach Zhushan on time with the sunrise train','ご来光列車で祝山に定時到着')},
  {id:'perfect', icon:'🎯', name:L('一公分都不差','Spot on','ピタ止め'), desc:L('任一站停車誤差 0.5 m 以內','Stop within 0.5 m at any station','どこかの駅で誤差 0.5 m 以内')},
  {id:'sniper',  icon:'📏', name:L('人體尺規','Human ruler','人間定規'),   desc:L('每一站停車誤差都在 1 m 以內','Stop within 1 m at every station','全駅で誤差 1 m 以内')},
  {id:'ontime',  icon:'⏱️', name:L('台灣之光準點','Like clockwork','定時運転'), desc:L('每一站都準點到達','Arrive on time at every station','全駅に定時到着')},
  {id:'clean',   icon:'🧼', name:L('零扣分','Clean sheet','減点ゼロ'),     desc:L('一整班沒有任何扣分','A whole run with no penalties','一度も減点なしで完走')},
  {id:'horn',    icon:'📯', name:L('喇叭手','Horn master','警笛マスター'),     desc:L('三個平交道都有鳴笛','Sound the horn at all three crossings','3か所の踏切すべてで警笛')},
  {id:'gradeS',  icon:'🏆', name:L('S 級司機員','S-rank driver','Sランク運転士'), desc:L('拿到 S 評價','Get an S grade','S評価を獲得')},
  {id:'proS',    icon:'💎', name:L('專業司機員','Pro driver','プロ運転士'), desc:L('專業模式拿到 S 評價','Get an S grade in Pro mode','上級モードで S 評価')},
  {id:'stamps',  icon:'📮', name:L('集章達人','Stamp collector','スタンプラリー達人'), desc:L('集滿全部車站紀念章','Collect every station stamp','全駅のスタンプを集める')},
  {id:'redrun',  icon:'🚨', name:L('紅燈戰士','Red-light runner','信号無視'),   desc:L('……闖過紅燈（不太光彩）','…passed a red signal (not proud of it)','……赤信号を冒進（自慢にならない）')},
  {id:'skip',    icon:'💨', name:L('過站不停','Express service','通過列車'),   desc:L('錯過一個車站（旅客很錯愕）','Miss a station (passengers were not amused)','駅を通過してしまう（乗客びっくり）')},
];
let ACH=load('cabAch',{});
let lastNew=[];
function unlockAch(id){
  if(ACH[id]) return false;
  ACH[id]=Date.now(); save('cabAch',ACH); lastNew.push(id);
  const a=ACHS.find(x=>x.id===id);
  if(a && S.phase==='run') toast(L('解鎖成就 ','Achievement ','実績解除 ')+a.icon+' '+a.name,'good');
  return true;
}
function achGridHTML(highlight){
  return `<div class="achs">${ACHS.map(a=>`<div class="ach${ACH[a.id]?' on':''}${highlight&&highlight.includes(a.id)?' new':''}" title="${a.desc}">
    <span class="ai">${ACH[a.id]?a.icon:'🔒'}</span><span class="an">${a.name}</span><span class="ad">${a.desc}</span></div>`).join('')}</div>`;
}

/* ---------- sound & announcements ---------- */
let voiceOn=load('cabVoice',true);
function setVoice(on){ voiceOn=on; save('cabVoice',on); if(!on) try{ speechSynthesis.cancel(); }catch(e){} }
/* ---------- 車內廣播：語音照路線的當地語言（臺鐵、林鐵說國語，江之電說日語）再加英語；字幕照介面語言 ---------- */
const NATIVE = (ROUTE.japan||ROUTE.jpSign) ? 'ja' : 'zh';
const annEl=document.createElement('div'); annEl.className='ann'; annEl.hidden=true; annEl.setAttribute('aria-live','polite');
document.querySelector('.stage').appendChild(annEl);
let annTimer=0;
function caption(icon,txt){
  annEl.innerHTML=`<span class="ai">${icon}</span><span>${txt}</span>`; annEl.hidden=false;
  clearTimeout(annTimer); annTimer=setTimeout(()=>annEl.hidden=true, 2500+txt.length*(LANG==='en'?55:130));
}
/* m = {zh, en, ja}；radio=true 表示行車調度無線電，只出字幕不播語音 */
function annSay(m, radio){
  caption(radio?'📻':'📢', LANG==='en'?m.en : LANG==='ja'?(m.ja||m.en) : m.zh);
  if(radio || !voiceOn || !('speechSynthesis' in window)) return;
  const say=(txt,lang)=>{ const u=new SpeechSynthesisUtterance(txt); u.lang=lang; u.rate=0.95; speechSynthesis.speak(u); };
  try{ speechSynthesis.cancel(); if(NATIVE==='ja') say(m.ja,'ja-JP'); else say(m.zh,'zh-TW'); if(m.en) say(m.en,'en-US'); }catch(e){}
}
const nm = st => ({zh:st.name, en:st.en, ja:st.ja||st.name});
const ANN = {
  welcome(){ const n=nm(STATIONS[1]), t=nm(STATIONS[STATIONS.length-1]);
    if(ROUTE.japan) return {ja:`本日も江ノ電をご利用いただきまして、ありがとうございます。この電車は${t.ja}行きです。次は${n.ja}です。`, en:`Thank you for riding the Enoden. This train is bound for ${t.en}. The next station is ${n.en}.`, zh:`感謝您今天搭乘江之電。本列車開往${t.zh}，下一站${n.zh}。`};
    if(ROUTE.key==='keiyo') return {ja:`本日もJR東日本をご利用いただきまして、ありがとうございます。この電車は京葉線、各駅停車、蘇我行きです。次は${n.ja}です。`, en:`This is the Keiyō Line local train bound for Soga. The next station is ${n.en}.`, zh:`感謝搭乘 JR 東日本。本列車為京葉線各站停車，開往蘇我，下一站${n.zh}。`};
    if(ROUTE.key==='tamsui') return {zh:`歡迎搭乘台北捷運，本列車開往${t.zh}，下一站${n.zh}。`, en:`Welcome aboard the Taipei Metro. This train is bound for ${t.en}. The next station is ${n.en}.`, ja:`台北MRTをご利用いただきありがとうございます。この電車は${t.ja}行きです。次は${n.ja}です。`};
    if(ROUTE.key==='alishan') return {zh:`歡迎搭乘阿里山林業鐵路祝山線${ENV.key==='dawn'?'日出列車':''}。沿途坡陡彎多，請坐穩扶好；山上氣溫低，請注意保暖。下一站${n.zh}。`, en:`Welcome aboard the Alishan Forest Railway Zhushan Line. The line is steep and curvy, so please stay seated, and keep warm in the mountain air. The next station is ${n.en}.`, ja:`阿里山森林鉄道 祝山線にご乗車ありがとうございます。急勾配と急カーブが続きますので、お席にお掛けください。山の上は冷えますので暖かくしてお過ごしください。次は${n.ja}です。`};
    return {zh:`各位旅客您好，歡迎搭乘臺鐵區間車。本列車開往${t.zh}，下一站${n.zh}。車門關閉時請勿強行上下車。`, en:`Welcome aboard this Taiwan Railway local train to ${t.en}. The next station is ${n.en}.`, ja:`台湾鉄道の区間車をご利用いただきありがとうございます。この列車は${t.ja}行きです。次は${n.ja}です。`}; },
  next(st,last){ const n=nm(st); if(ROUTE.continues) last=false;
    if(ROUTE.key==='keiyo') return {ja:`次は${n.ja}、${n.ja}。`, en:`The next station is ${n.en}.`, zh:`下一站，${n.zh}。`};
    if(ROUTE.japan) return {ja:`次は${last?'終点、':''}${n.ja}です。`, en:`The next station is ${n.en}${last?', the last stop':''}.`, zh:`下一站，${last?'終點':''}${n.zh}。`};
    return {zh:`下一站，${n.zh}${last?'，本列車終點站':''}。`, en:`The next station is ${n.en}${last?', the terminal station':''}.`, ja:`次は${last?'終点、':''}${n.ja}です。`}; },
  approach(st,last){ const n=nm(st);
    if(ROUTE.key==='keiyo') return {ja:`まもなく、${n.ja}、${n.ja}。お出口は左側です。${st.name==='新木場'?'':''}`, en:`We will soon arrive at ${n.en}. The doors on the left side will open.`, zh:`即將抵達${n.zh}，左側車門開啟。`};
    if(ROUTE.japan) return last
      ? {ja:`まもなく終点、${n.ja}です。湘南モノレールはお乗り換えです。お出口は左側です。お忘れ物のないようご注意ください。`, en:`We will soon arrive at ${n.en}, the last stop. Please change here for the Shonan Monorail. The doors on the left side will open. Please take all your belongings with you.`, zh:`即將抵達終點${n.zh}，轉乘湘南單軌電車的旅客請在本站下車。左側車門開啟，請別忘了隨身物品。`}
      : {ja:`まもなく、${n.ja}です。お出口は左側です。`, en:`We will soon arrive at ${n.en}. The doors on the left side will open.`, zh:`即將抵達${n.zh}，左側車門開啟。`};
    if(ROUTE.key==='tamsui') return last
      ? {zh:`終點站${n.zh}到了，請全部旅客下車，別忘了您的隨身物品。`, en:`This is the terminal station, ${n.en}. All passengers please leave the train, and remember your belongings.`, ja:`終点、${n.ja}です。お忘れ物のないようご注意ください。`}
      : {zh:`${n.zh}站到了，下車時請小心月台間隙。`, en:`Arriving at ${n.en}. Please mind the gap when you exit the train.`, ja:`まもなく${n.ja}です。お降りの際は足元にご注意ください。`};
    if(ROUTE.key==='alishan' && last) return {zh:`祝山站快到了，海拔 2,451 公尺，是全台最高的火車站。下車後步行就能到觀日平台，請小心腳步。`, en:`We are arriving at Zhushan, 2,451 m above sea level — the highest station in Taiwan. The sunrise viewing platform is a short walk away. Please watch your step.`, ja:`まもなく祝山です。標高 2,451 m、台湾で最も高い駅です。展望台へは歩いてすぐです。足元にお気をつけください。`};
    return last
      ? {zh:`本列車即將抵達終點站${n.zh}，請帶好隨身行李，下車時請注意月台間隙，謝謝搭乘。`, en:`We are arriving at ${n.en}, the terminal station. Please take all your belongings and mind the gap. Thank you for travelling with us.`, ja:`まもなく終点${n.ja}です。お忘れ物のないよう、また足元にご注意ください。ご乗車ありがとうございました。`}
      : {zh:`${n.zh}站快到了，要下車的旅客請準備，下車時請注意月台間隙。`, en:`We are now arriving at ${n.en}. Please mind the gap when leaving the train.`, ja:`まもなく${n.ja}です。お降りの際は足元にご注意ください。`}; },
  late(min){ return {zh:`本列車目前延誤約 ${min} 分鐘，造成您的不便，敬請見諒。`, en:`This train is running about ${min} minute${min>1?'s':''} late. We apologise for the inconvenience.`, ja:`ただいまこの電車は約${min}分遅れております。ご迷惑をおかけしております。`}; },
  altitude(m){ return {zh:`列車目前在海拔約 ${m.toLocaleString()} 公尺的地方。`, en:`We are now at about ${m.toLocaleString()} m above sea level.`, ja:`ただいま標高およそ ${m.toLocaleString()} m を走行中です。`}; },
};
/* 每個畫格呼叫：歡迎廣播、即將到站、延誤致歉、海拔、無線電 */
function extrasTick(dt){
  if(S.phase!=='run' || S.paused || S.coachHold) return;
  const A=S.ann||(S.ann={t:0, welcomed:false, appr:{}, alt:{}, lateSaid:-999, sig:0, street:false});
  A.t+=dt;
  if(!A.welcomed && A.t>4){ A.welcomed=true; annSay(ANN.welcome()); }
  const st=STATIONS[S.next];
  if(st && !S.doors && !A.appr[S.next]){ const d=st.pos-S.pos; if(S.v>1 && d>0 && d<Math.max(150,S.v*22)){ A.appr[S.next]=true; annSay(ANN.approach(st, S.next===STATIONS.length-1)); } }
  if(ROUTE.key==='alishan') [2300,2400].forEach(m=>{ if(!A.alt[m] && altitude(S.pos)>=m){ A.alt[m]=true; annSay(ANN.altitude(m)); } });
  if(ROUTE.signal!=null && S.sig.phase===1 && A.sig===0){ A.sig=1; annSay({zh:'【行車調度】32 號號誌前方區間還有列車沒有出清，請在號誌前停車等候。',en:'[Dispatcher] The block beyond signal 32 is still occupied. Stop before the signal and wait.',ja:'【指令】32号信号機の先に列車が在線しています。信号の手前で停車して待機してください。'},true); }
  if(ROUTE.street && !A.street && S.pos>ROUTE.street.s-250){ A.street=true; annSay({zh:'【司機提醒】前方進入路面併用軌道，和汽車共用道路，限速 25 km/h，注意行人。',en:'[Driver note] Street running ahead: sharing the road with cars at 25 km/h. Watch for pedestrians.',ja:'【運転メモ】この先は併用軌道。車と道路を共有し 25 km/h、歩行者に注意。'},true); }
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

}
function extrasStop(st,err){
  chime();
  if(Math.abs(err)<=0.5) unlockAch('perfect');
  if(Math.abs(err)<=3) giveStamp(st);
  const last=S.next>=STATIONS.length-1;
  if(voiceOn && 'speechSynthesis' in window) try{ speechSynthesis.cancel(); }catch(e){}
  showFact(st);
}
function extrasDepart(){
  const st=STATIONS[S.next]; if(!st) return;
  const last=S.next===STATIONS.length-1, A=S.ann||{};
  annSay(ANN.next(st,last));
  const prev=STATIONS[S.next-1], late=S.t-(prev?prev.dep:0);
  if(late>60 && S.t-(A.lateSaid||-999)>150){ A.lateSaid=S.t; setTimeout(()=>{ if(S.phase==='run') annSay(ANN.late(Math.max(1,Math.round(late/60)))); },7000); }
}
function extrasEnd(grade){
  const log=S.log, P=S.pens;
  const stopsAll=S.log.filter(r=>!r.miss);
  giveStamp(STATIONS[0]);
  if(ROUTE.key==='keiyo'){ unlockAch('keiyo'); if(grade==='S'||grade==='A') setFlag('gradeA_keiyo'); }
  if(ROUTE.key==='tamsui'){ unlockAch('tamsui'); if(grade==='S'||grade==='A') setFlag('gradeA_tamsui'); }
  if(ROUTE.japan) unlockAch('enoshima');
  else if(ROUTE.key==='alishan'){ unlockAch('zhushan'); const z=stopsAll.find(r=>r.name==='祝山'); if(ENV.key==='dawn' && z && z.trank!=='延誤') unlockAch('sunrise'); }
  else unlockAch('first');
  const stops=log.filter(r=>!r.miss);
  if(stops.length===STATIONS.length-1 && stops.every(r=>Math.abs(r.err)<=1)) unlockAch('sniper');
  if(stops.length===STATIONS.length-1 && stops.every(r=>r.trank==='準點')) unlockAch('ontime');
  if(!Object.values(P).some(v=>v>0)) unlockAch('clean');
  if(S.bonus>=CROSSINGS.length*10) unlockAch('horn');
  if(grade==='S') unlockAch('gradeS');
  if(P.spad>0) unlockAch('redrun');
  if(P.miss>0) unlockAch('skip');
  if(ROUTE.key==='hualien' && (grade==='S'||grade==='A')) setFlag('gradeA_hualien');
  if(ROUTE.key==='enoden' && DIFF.key==='pro') setFlag('pro_enoden');
  if(DIFF.key==='pro' && grade==='S') unlockAch('proS');
  const newTrains=Object.values(TRAINS).flat().filter(t=>t.req && trainUnlocked(t) && !load('cabTrainSeen_'+t.key,false));
  newTrains.forEach(t=>save('cabTrainSeen_'+t.key,true));
  const bk=bestKey(), best=load(bk,null), sc=Math.round(S.score);
  const isBest = !best || sc>best.score;
  if(isBest) save(bk,{score:sc, grade, at:Date.now()});
  const runs=load('cabRuns',0)+1; save('cabRuns',runs);
  return {isBest, best:isBest?{score:sc,grade}:best, runs, newTrains};
}

/* ---------- passenger comments ---------- */
function passengerSays(grade){
  const P=S.pens, out=[];
  if(P.spad>0) out.push([L('「剛剛那個是紅燈吧？我看到了喔。」','“That was a red light, wasn’t it? I saw that.”','「今の赤信号だったよね？見てたよ。」'),L('坐第一排的鐵道迷','railfan in the front row','最前列の鉄道ファン')]);
  if(P.miss>0) out.push([L('「欸欸欸我要下車啦——」','“Hey, hey, hey — that was my stop!”','「ちょっと、降りるんですけど——！」'),L('錯過站的阿姨','auntie who missed her stop','降り損ねたおばさん')]);
  if(P.eb>0) out.push([L('「我的珍奶……整杯灑出來了。」','“My bubble tea… it’s everywhere.”','「タピオカミルクティーが……全部こぼれた。」'),L('車廂裡的大學生','university student','車内の大学生')]);
  const AL=ROUTE.key==='alishan';
  const ok={
    S:[L('「停得比我停機車還準，這司機是機器人吧？」','“Parks better than I park my scooter. Is the driver a robot?”','「バイクの駐輪より正確。運転士ってロボット？」'),L('通勤的高中生','commuting high-schooler','通学中の高校生')],
    A:[L('「很穩，連咖啡都沒晃到。」','“So smooth my coffee didn’t even ripple.”','「すごく滑らか。コーヒーも揺れなかった。」'),L('趕上班的工程師','engineer on the way to work','出勤中のエンジニア')],
    B:[L('「還可以啦，今天沒遲到就好。」','“Not bad. At least I’m not late today.”','「まあまあかな。遅刻しなかったし。」'),L('去市場的阿伯','uncle heading to the market','市場へ行くおじさん')],
    C:[L('「有點晃，但風景很漂亮。」','“A bit bumpy, but what a view.”','「ちょっと揺れたけど、景色は最高。」'), AL?L('上山看日出的背包客','backpacker heading up for the sunrise','ご来光目当てのバックパッカー'):L('來花蓮玩的觀光客','tourist visiting Hualien','花蓮観光の旅行者')],
    D:[L('「司機是不是第一天上班？」','“Is it the driver’s first day?”','「運転士さん、今日が初日？」'),L('抱著小孩的媽媽','mum holding a toddler','子連れのお母さん')],
  }[grade];
  out.push(ok);
  return out.slice(0,2).map(([q,who])=>`<blockquote class="say">${q}<cite>— ${who}</cite></blockquote>`).join('');
}

/* ---------- 在地推薦：官方觀光網站（依語言） ---------- */
const LINKS={
  hualien:{zh:'https://hualien.travel/zh-tw/', en:'https://eng.taiwan.net.tw/', ja:'https://jp.taiwan.net.tw/', name:L('花蓮觀光資訊網','Taiwan Tourism','台湾観光')},
  erv:    {zh:'https://www.erv-nsa.gov.tw/', en:'https://www.erv-nsa.gov.tw/en/', ja:'https://www.erv-nsa.gov.tw/ja/', name:L('花東縱谷國家風景區','East Rift Valley National Scenic Area','花東縦谷国家風景区')},
  ndhu:   {zh:'https://www.ndhu.edu.tw/', en:'https://www.ndhu.edu.tw/', ja:'https://www.ndhu.edu.tw/', name:L('國立東華大學','National Dong Hwa University','国立東華大学')},
  alinsa: {zh:'https://www.ali-nsa.net/', en:'https://www.ali-nsa.net/en/', ja:'https://www.ali-nsa.net/ja/', name:L('阿里山國家風景區','Alishan National Scenic Area','阿里山国家風景区')},
  afrch:  {zh:'https://afrch.forest.gov.tw/', en:'https://afrch.forest.gov.tw/En', ja:'https://afrch.forest.gov.tw/Ja', name:L('阿里山林業鐵路及文化資產管理處','Alishan Forest Railway','阿里山林業鉄道')},
  jreast: {zh:'https://www.jreast.co.jp/multi/zh-CHT/', en:'https://www.jreast.co.jp/multi/en/', ja:'https://www.jreast.co.jp/', name:L('JR 東日本','JR East','JR東日本')},
  gotokyo:{zh:'https://www.gotokyo.org/tc/', en:'https://www.gotokyo.org/en/', ja:'https://www.gotokyo.org/jp/', name:L('東京觀光官方網站','GO TOKYO','東京の観光公式サイト')},
  kasai:  {zh:'https://www.tokyo-park.or.jp/park/kasairinkai/', en:'https://www.tokyo-park.or.jp/park/kasairinkai/', ja:'https://www.tokyo-park.or.jp/park/kasairinkai/', name:L('葛西臨海公園','Kasai Rinkai Park','葛西臨海公園')},
  metro:  {zh:'https://www.metro.taipei/', en:'https://english.metro.taipei/', ja:'https://english.metro.taipei/', name:L('台北捷運','Taipei Metro','台北MRT')},
  newtaipei:{zh:'https://newtaipei.travel/zh-tw', en:'https://newtaipei.travel/en', ja:'https://newtaipei.travel/ja', name:L('新北市觀光旅遊網','New Taipei City Travel','新北市観光旅遊網')},
  enoden: {zh:'https://www.enoden.co.jp/tc/', en:'https://www.enoden.co.jp/en/', ja:'https://www.enoden.co.jp/', name:L('江之電官方網站','Enoden official site','江ノ電 公式サイト')},
  kamakura:{zh:'https://www.japan.travel/tw/', en:'https://www.japan.travel/en/', ja:'https://www.trip-kamakura.com/', name:L('日本國家旅遊局','Japan National Tourism Organization','鎌倉市観光協会')},
  fujisawa:{zh:'https://www.japan.travel/tw/', en:'https://www.japan.travel/en/', ja:'https://www.fujisawa-kanko.jp/', name:L('日本國家旅遊局','Japan National Tourism Organization','藤沢市観光協会')},
  tra:    {zh:'https://www.railway.gov.tw/', en:'https://www.railway.gov.tw/tra-tip-web/tip?lang=en_US', ja:'https://www.railway.gov.tw/tra-tip-web/tip?lang=en_US', name:L('臺鐵','Taiwan Railway','台湾鉄道')},
};
const linkOf=k=>LINKS[k][LANG]||LINKS[k].zh;

/* ---------- 到站小知識與沿線景點 ---------- */
const FACTS={
  '花蓮':{link:'hualien', t:L('花蓮的扁食、麻糬都是在地名產，從花蓮往北就是太魯閣。','Hualien is known for its wontons and mochi, and Taroko Gorge lies just to the north.','花蓮名物はワンタン（扁食）とお餅。北へ行けば太魯閣渓谷です。')},
  '吉安':{link:'hualien', t:L('吉安舊稱「七腳川」，日治時期在這裡設立吉野移民村。附近的慶修院是當年留下的日式佛寺。','Ji’an was once called Chikasuan. In the Japanese era the Yoshino immigrant village was founded here; nearby Qingxiu Temple is a Japanese-style temple from that time.','吉安は旧名を「七脚川」といい、日本統治時代に吉野移民村が置かれました。近くの慶修院は当時の日本式寺院です。')},
  '志學':{link:'ndhu', t:L('國立東華大學的校園就在志學一帶。','The campus of National Dong Hwa University is right around Zhixue.','志学駅の周辺には国立東華大学のキャンパスがあります。')},
  '平和':{link:'erv', t:L('壽豐鄉的小站，四周是稻田，往西望就是中央山脈。','A small station in Shoufeng Township surrounded by rice paddies, with the Central Mountain Range to the west.','寿豊郷の小さな駅。周りは田んぼで、西には中央山脈が見えます。')},
  '壽豐':{link:'erv', t:L('壽豐鄉有鯉魚潭、雲山水，還有以黃金蜆出名的立川漁場。','Shoufeng Township is home to Liyu Lake, the Yunshanshui ponds and Lichuan Aquafarm, famous for golden clams.','寿豊郷には鯉魚潭や雲山水、黄金シジミで知られる立川漁場があります。')},
  '新木場':{link:'gotokyo', t:L('新木場一帶是木材批發的集散地，站名就是從「木場」來的。可以在這裡轉乘有樂町線和臨海線。','Shin-Kiba grew up around the timber trade — hence “kiba”, lumberyard. Change here for the Yūrakuchō and Rinkai lines.','新木場は材木問屋が集まる街で、駅名もそこから。有楽町線・りんかい線に乗り換えられます。')},
  '葛西臨海公園':{link:'kasai', t:L('站前就是葛西臨海公園，有高 117 公尺的「鑽石與花大摩天輪」和葛西臨海水族園。','Right outside is Kasai Rinkai Park, with the 117 m Diamond and Flower Ferris Wheel and the Tokyo Sea Life Park aquarium.','駅前は葛西臨海公園。高さ 117 m の「ダイヤと花の大観覧車」や葛西臨海水族園があります。')},
  '舞濱':{link:'gotokyo', t:L('舞濱站是東京迪士尼度假區的最近車站，月台上常見拿著紀念品的遊客。','Maihama is the nearest station to Tokyo Disney Resort, and the platforms are full of visitors carrying souvenirs.','舞浜駅は東京ディズニーリゾートの最寄り駅。お土産を持った人たちでにぎわいます。')},
  '新浦安':{link:'gotokyo', t:L('新浦安是填海造地發展起來的住宅區，高樓公寓沿著東京灣排開。','Shin-Urayasu is a residential district built on reclaimed land, its tower blocks lined up along Tokyo Bay.','新浦安は埋め立て地に広がる住宅街。高層マンションが東京湾沿いに並びます。')},
  '市川鹽濱':{link:'jreast', t:L('市川鹽濱位在東京灣邊的臨海地區，附近倉庫與物流中心林立。列車繼續開往蘇我，你的班在這裡換手。','Ichikawashiohama sits in the bayside logistics district. The train continues to Soga — your shift hands over here.','市川塩浜は倉庫や物流センターが並ぶ臨海部の駅。列車は蘇我へ向かい、ここで乗務員交代です。')},
  '北投':{link:'metro', t:L('北投以溫泉聞名，從北投站轉新北投支線一站就到溫泉區。','Beitou is famous for its hot springs — change here for the one-stop Xinbeitou branch line.','北投は温泉で有名。北投駅で新北投支線に乗り換えて一駅で温泉街です。')},
  '復興崗':{link:'metro', t:L('站名來自旁邊的復興崗校區（國防大學政治作戰學院）。','The station is named after the neighbouring Fuxinggang campus of National Defense University.','駅名は隣接する国防大学の復興崗キャンパスに由来します。')},
  '忠義':{link:'metro', t:L('忠義站附近有忠義山親山步道，爬上去可以眺望關渡平原和淡水河。','Near Zhongyi is the Zhongyi Mountain trail, with views over the Guandu plain and the Tamsui River.','忠義駅の近くには忠義山の登山道があり、関渡平原と淡水河を見渡せます。')},
  '關渡':{link:'metro', t:L('關渡有關渡宮和關渡自然公園，紅色的關渡大橋就橫跨在淡水河上。','Guandu has Guandu Temple and Guandu Nature Park, and the red Guandu Bridge spans the Tamsui River.','関渡には関渡宮と関渡自然公園があり、赤い関渡大橋が淡水河に架かっています。')},
  '竹圍':{link:'newtaipei', t:L('從竹圍到淡水，沿著淡水河有河濱自行車道，對岸就是觀音山。','From Zhuwei to Tamsui a riverside bike path follows the Tamsui River, with Guanyin Mountain across the water.','竹囲から淡水まで淡水河沿いにサイクリングロードが続き、対岸には観音山がそびえます。')},
  '紅樹林':{link:'newtaipei', t:L('車站旁就是淡水河紅樹林自然保留區，可以看到成片的水筆仔。','Right by the station is the Tamsui River Mangrove Nature Reserve, with wide stands of mangroves.','駅のすぐ横は淡水河マングローブ自然保留区。一面のマングローブが見られます。')},
  '淡水':{link:'newtaipei', t:L('淡水老街、紅毛城和漁人碼頭都在附近，淡水河口的夕陽非常有名。','Tamsui Old Street, Fort San Domingo and Fisherman’s Wharf are nearby, and the sunset over the river mouth is famous.','淡水老街、紅毛城、漁人碼頭がすぐ近く。淡水河口の夕日はとても有名です。')},
  '稻村崎':{link:'kamakura', t:L('稻村崎是突出海面的岬角，從這裡隔著相模灣可以望見江之島，天氣好時還有富士山，夕陽很有名。','Inamuragasaki is a cape jutting into the sea. From here you look across Sagami Bay to Enoshima — and Mt Fuji on clear days. Famous for sunsets.','稲村ヶ崎は海に突き出た岬。相模湾越しに江の島、晴れた日には富士山も見え、夕日の名所です。')},
  '七里濱':{link:'kamakura', t:L('七里濱有一整片長長的沙灘，衝浪的人很多。江之電和臺鐵平溪線在 2013 年簽了觀光合作協定，後來也升級為友好協定。','Shichirigahama is a long beach popular with surfers. Enoden and Taiwan’s Pingxi Line signed a tourism partnership in 2013, later upgraded to a friendship agreement.','七里ヶ浜は長い砂浜でサーファーに人気。江ノ電と台湾の平渓線は2013年に観光連携協定を結び、のちに友好協定へと発展しました。')},
  '鎌倉高校前':{link:'enoden', t:L('車站旁的平交道因為《灌籃高手》動畫片頭而出名，月台就面對大海。拍照時請注意安全、別擋到交通。','The level crossing by this station became famous from the Slam Dunk anime opening, and the platform faces the sea. If you take photos, stay safe and keep clear of traffic.','駅横の踏切はアニメ『SLAM DUNK』のオープニングで有名に。ホームは海に面しています。撮影は安全と交通マナーを守って。')},
  '腰越':{link:'fujisawa', t:L('腰越漁港以魩仔魚（しらす）出名。從這站往江之島，電車會開進大街和汽車一起走。','Koshigoe fishing port is known for shirasu (whitebait). From here to Enoshima the train runs right down the street with the cars.','腰越漁港はしらすで有名。ここから江ノ島までは、電車が道路の真ん中を車と一緒に走ります。')},
  '江之島':{link:'fujisawa', t:L('走過弁天橋就是江之島，可以參拜江島神社、登上江之島展望燈塔（Sea Candle）。','Cross the Benten Bridge to Enoshima island for Enoshima Shrine and the Sea Candle observation tower.','弁天橋を渡れば江の島。江島神社への参拝や、展望灯台「シーキャンドル」へどうぞ。')},
  '阿里山':{link:'alinsa', t:L('阿里山車站海拔 2,216 公尺，是前往森林遊樂區、巨木群與春天賞櫻的起點。','Alishan station (2,216 m) is the gateway to the forest recreation area, the giant trees and the spring cherry blossoms.','標高 2,216 m の阿里山駅は、森林遊楽区や巨木群、春の桜めぐりの起点です。')},
  '對高岳':{link:'afrch', t:L('對高岳在祝山線上，四周是高大的柳杉和紅檜林，空氣裡都是木頭香。','Duigaoyue sits on the Zhushan Line among tall cedars and Taiwan red cypress — the air smells of wood.','対高岳は祝山線の駅。スギやタイワンベニヒノキの森に囲まれ、木の香りが漂います。')},
  '祝山':{link:'alinsa', t:L('祝山車站海拔 2,451 公尺，是全台灣海拔最高的火車站。天氣好時可以在觀日平台看玉山日出與雲海。','At 2,451 m, Zhushan is Taiwan’s highest railway station. On clear mornings the viewing platform looks over a sea of clouds to sunrise above Yushan.','標高 2,451 m の祝山駅は台湾で最も高い駅。晴れた朝は展望台から雲海と玉山のご来光が望めます。')},
};
const factEl=document.createElement('div'); factEl.className='fact'; factEl.hidden=true; factEl.setAttribute('role','status');
document.querySelector('.stage').appendChild(factEl);
let factTimer=0;
function factLink(f){ return `<a href="${linkOf(f.link)}" target="_blank" rel="noopener">${LINKS[f.link].name} ↗</a>`; }
function showFact(st){
  const f=FACTS[st.name]; if(!f) return;
  factEl.innerHTML=`<span class="eyebrow">${L('到站小知識','Station notes','駅の豆知識')} · ${stName(st)}</span><p>${f.t}</p><p class="more">${factLink(f)}</p>`;
  factEl.hidden=false; clearTimeout(factTimer); factTimer=setTimeout(()=>factEl.hidden=true, 10000);
}
/* 標題畫面：沿線景點清單 */
function sightsHTML(){
  const rows=STATIONS.filter(st=>FACTS[st.name]).map(st=>{ const f=FACTS[st.name]; return `<li><b>${stName(st)}</b><span>${f.t}</span>${factLink(f)}</li>`; }).join('');
  return `<details class="achbox sights"><summary>${L('沿線景點與在地推薦','Along the line: places to visit','沿線の見どころ')}</summary><ul>${rows}</ul></details>`;
}
/* 結算畫面：去現場搭一次 */
function rideRealHTML(){
  const AL=ROUTE.key==='alishan', JPR=!!ROUTE.japan, TS=ROUTE.key==='tamsui', KY=ROUTE.key==='keiyo', k=KY?'jreast':TS?'metro':JPR?'enoden':AL?'afrch':'tra';
  return `<a class="promo ride" href="${linkOf(k)}" target="_blank" rel="noopener"><span>${KY?'🎡':TS?'🚇':JPR?'🌊':AL?'🌄':'🚉'}</span>
    <span><b>${L('到現場搭一次！','Ride it for real','実際に乗ってみよう')}</b><small>${KY?L('JR 東日本的路線與車票','JR East routes and tickets','JR東日本の路線ときっぷ'):TS?L('台北捷運的路線圖與票價','Taipei Metro maps and fares','台北MRTの路線図と運賃'):JPR?L('江之電的路線、車票與沿線景點','Enoden routes, tickets and sights','江ノ電の路線・きっぷ・沿線観光'):AL?L('阿里山林鐵的時刻與訂票','Alishan Forest Railway timetables and tickets','阿里山林業鉄道の時刻表ときっぷ'):L('臺鐵花東線的時刻與訂票','Taiwan Railway timetables and tickets','台湾鉄道の時刻表ときっぷ')}</small></span><span aria-hidden="true">↗</span></a>`;
}

/* ---------- overlay fragments ---------- */
/* 標題畫面分成三個分頁：出發、收藏、設定 */
function departPicksHTML(){
  return `${diffPickHTML()}
    ${trainPickHTML()}
    <div class="pickrow"><span class="lab">${L('天氣與時段','Weather and time','天気と時間帯')}</span><div class="envpick" role="radiogroup">${ROUTE.envs.map(k=>ENVS[k]).map(e=>`<button type="button" role="radio" aria-checked="${e===ENV}" class="envbtn${e===ENV?' on':''}" data-env="${e.key}"><span>${e.icon}</span>${e.name}</button>`).join('')}</div></div>`;
}
function collectHTML(){
  const best=load(bestKey(),null), runs=load('cabRuns',0), n=ACHS.filter(a=>ACH[a.id]).length, all=allStations(), ns=all.filter(x=>STAMPS[x.st.name]).length;
  return `<div class="statgrid">
      <div><small>${L('最佳紀錄','Best','ベスト')}</small><b>${best?best.score:'—'}</b><span>${best?best.grade:''}</span></div>
      <div><small>${L('開過的班次','Runs','運転回数')}</small><b>${runs}</b></div>
      <div><small>${L('成就','Achievements','実績')}</small><b>${n}<i>/${ACHS.length}</i></b></div>
      <div><small>${L('紀念章','Stamps','スタンプ')}</small><b>${ns}<i>/${all.length}</i></b></div>
    </div>
    <h3 class="sect">${L('成就徽章','Achievement badges','実績バッジ')}</h3>${achGridHTML()}
    <h3 class="sect">${L('車站紀念章','Station stamps','駅スタンプ帳')}</h3>${Object.values(ROUTES).map(r=>`<p class="eyebrow">${r.name}</p><div class="stampgrid">${r.stations.map(stampHTML).join('')}</div>`).join('')}
    ${sightsHTML()}`;
}
function settingsHTML(){
  return `<div class="pickrow"><span class="lab">${L('畫面風格','Visual style','グラフィック')}</span><div class="diffpick" role="radiogroup">${[['block','🧱',L('方塊','Blocky','ブロック'),L('像積木一樣的方塊世界','A chunky, blocky world','積み木のようなブロックの世界')],['smooth','🌄',L('寫實','Realistic','リアル'),L('比較接近真實的山和樹','Smoother hills and trees','なめらかな山や木')]].map(([k,ic,n,d])=>`<button type="button" role="radio" aria-checked="${STYLE===k}" class="stylebtn diffbtn${STYLE===k?' on':''}" data-style="${k}"><b>${ic} ${n}</b><small>${d}</small></button>`).join('')}</div></div>
    <div class="pickrow"><span class="lab">${L('聲音','Sound','サウンド')}</span><div class="toggles"><label class="toggle"><input type="checkbox" id="sfxTog"${sfxOn?' checked':''}> ${L('列車音效','Train sounds','走行音')}</label>
    <label class="toggle"><input type="checkbox" id="voiceTog"${voiceOn?' checked':''}> ${L('車內語音廣播','Onboard announcements','車内放送')}</label></div></div>
    <div class="pickrow"><span class="lab">${L('語言','Language','言語')}</span>${langPickHTML()}</div>
    <div class="pickrow"><span class="lab">${L('其他','More','その他')}</span><div class="btnrow"><button class="btn" id="ovHelp2" type="button">${L('操作說明','How to drive','操作説明')}</button>${('standalone' in navigator || window.matchMedia)?`<button class="btn" id="ovInstall" type="button" hidden>${L('📲 安裝到主畫面','📲 Install app','📲 ホーム画面に追加')}</button>`:''}</div></div>
    ${promoHTML()}`;
}
function titleExtrasHTML(){ return ''; }
function bindTitleExtras(){
  const v=document.getElementById('voiceTog'); if(v) v.addEventListener('change',()=>setVoice(v.checked));
  const f=document.getElementById('sfxTog'); if(f) f.addEventListener('change',()=>setSfx(f.checked));
  document.querySelectorAll('.diffbtn:not(.stylebtn)').forEach(b=>b.addEventListener('click',()=>{ setDiff(b.dataset.diff); showOverlay('title'); }));
  document.querySelectorAll('.stylebtn').forEach(b=>b.addEventListener('click',()=>{ if(b.dataset.style!==STYLE) setStyle(b.dataset.style); }));
  document.querySelectorAll('.trainbtn').forEach(b=>b.addEventListener('click',()=>{ const t=TRAINS[ROUTE.key].find(x=>x.key===b.dataset.train); if(!t || !trainUnlocked(t)) return; pickTrain(t); showOverlay('title'); }));
  document.querySelectorAll('.envbtn').forEach(b=>b.addEventListener('click',()=>{ setEnv(b.dataset.env); showOverlay('title'); const nb=document.querySelector('.envbtn[data-env="'+b.dataset.env+'"]'); if(nb) nb.focus({preventScroll:true}); }));
}
function endExtrasHTML(info,grade){
  const got=lastNew.map(id=>ACHS.find(a=>a.id===id)).filter(Boolean);
  return `${passengerSays(grade)}
    <div class="recs">${info.isBest?`<span class="nb">🎉 ${L('新紀錄！','New best!','自己ベスト更新！')}</span>`:`<span>${L('最佳紀錄','Best','ベスト')} <b>${info.best.score}${L(' 分（',' pts (',' 点（')}${info.best.grade}${L('）',')','）')}</b></span>`}<span>${L('第 ','Run #','')}<b>${info.runs}</b>${L(' 班','',' 回目')}</span></div>
    ${(info.newTrains||[]).map(t=>`<div class="unlock">🎉 ${L('解鎖新列車：','New train unlocked: ','新しい車両を解除：')}<b>${t.name}</b><small>${L('回標題畫面就能選','Pick it on the title screen','タイトル画面で選べます')}</small></div>`).join('')}
    ${got.length?`<div class="newach"><p class="eyebrow">${L('本班解鎖成就','Unlocked this run','今回解除した実績')}</p>${achGridHTML(lastNew).replace('class="achs"','class="achs only-new"')}</div>`:''}
    ${rideRealHTML()}
    ${promoHTML(true)}`;
}
function shareText(grade){
  const rows=S.log.map(r=>r.miss?`${nameOf(r.name)} ${L('過站','overran','通過')}`:`${nameOf(r.name)} ${fmtErr(r.err)} ${trWord(r.trank)}`).join('\n');
  return `${ROUTE.key==='alishan'?'🌲':ROUTE.japan?'🌊':ROUTE.key==='tamsui'?'🚇':ROUTE.key==='keiyo'?'🎡':'🚃'} ${ROUTE.title}｜${stName(STATIONS[0])}→${stName(STATIONS[STATIONS.length-1])}（${ENV.name}）\n${L('評價','Grade','評価')} ${grade}・${Math.round(S.score)} ${L('分','pts','点')}\n${rows}\nhttps://train.sectools.tw${LANG_PATH[LANG]}`;
}
function bindEndExtras(grade){
  const b=document.getElementById('ovShare'); if(!b) return;
  b.addEventListener('click',async()=>{
    const txt=shareText(grade);
    try{
      if(navigator.share){ await navigator.share({text:txt}); return; }
      await navigator.clipboard.writeText(txt); b.firstChild.textContent=L('已複製成績！','Copied!','コピーしました！');
    }catch(e){ b.firstChild.textContent=L('複製失敗','Copy failed','コピー失敗'); }
  });
}

/* ---------- 每條路線各自的最佳紀錄（舊紀錄屬於花東線） ---------- */
function bestKey(){ return ROUTE.key==='hualien' ? 'cabBest' : 'cabBest_'+ROUTE.key; }

/* ---------- 製作與維護 ---------- */
function promoHTML(after){
  const url='https://sectools.tw/?utm_source=train-game&utm_medium=referral&utm_campaign='+(after?'end':'title');
  if(after) return `<a class="promo cta" href="${url}" target="_blank" rel="noopener">
    <span>🛡️</span><span><b>${L('由 SecTools.tw 製作與維護','Made and maintained by SecTools.tw','制作・運営：SecTools.tw')}</b><small>${L('我們也做免費的線上資安工具，有空可以看看','We also build free online security tools — have a look sometime','無料のオンラインセキュリティツールも作っています')}</small></span><span aria-hidden="true">↗</span></a>`;
  return `<a class="promo" href="${url}" target="_blank" rel="noopener">
    <span>🛡️</span><span><small>${L('本遊戲由','This game is','このゲームは')}</small><b>${L('SecTools.tw 製作與維護','made and maintained by SecTools.tw','SecTools.tw が制作・運営')}</b><small>${L('也來看看我們的線上資安工具','Check out our free online security tools','無料のオンラインセキュリティツールもどうぞ')}</small></span><span aria-hidden="true">↗</span></a>`;
}

/* ---------- 解鎖旗標與車種 ---------- */
let FLAGS=load('cabFlags',{});
function setFlag(k){ if(!FLAGS[k]){ FLAGS[k]=Date.now(); save('cabFlags',FLAGS); } }
function trainUnlocked(t){ return !t.req || !!FLAGS[t.req] || !!ACH[t.req]; }
function pickTrain(t){ TRAIN=t; const hs=document.getElementById('hSub'); if(hs) hs.textContent=t.name+' · '+stName(STATIONS[0])+' → '+stName(STATIONS[STATIONS.length-1])+' · '+ROUTE.desc; Object.assign(ROUTE,{power:t.power, brakeStep:t.brakeStep, ebDecel:t.ebDecel}); save('cabTrain_'+ROUTE.key,t.key); if(typeof drawFrame==='function') drawFrame(); if(typeof auRetune==='function') auRetune(); }
function diffPickHTML(){
  return `<div class="pickrow"><span class="lab">${L('難度','Difficulty','難易度')}</span><div class="diffpick" role="radiogroup">${Object.values(DIFFS).map(d=>`<button type="button" role="radio" aria-checked="${d===DIFF}" class="diffbtn${d===DIFF?' on':''}" data-diff="${d.key}"><b>${d.icon} ${d.name}</b><small>${d.desc}</small></button>`).join('')}</div></div>`;
}
function trainPickHTML(){
  return `<div class="pickrow"><span class="lab">${L('車種','Train','車両')}</span><div class="trainpick" role="radiogroup">${TRAINS[ROUTE.key].map(t=>{ const ok=trainUnlocked(t);
    return `<button type="button" role="radio" aria-checked="${t===TRAIN}" class="trainbtn${t===TRAIN?' on':''}${ok?'':' locked'}" data-train="${t.key}"${ok?'':' aria-disabled="true"'}><b>${ok?'':'🔒 '}${t.name}</b><small>${ok?(t.req?L('已解鎖','Unlocked','解除済み'):L('標準車種','Standard','標準車両')):t.reqText}</small></button>`; }).join('')}</div></div>`;
}

/* ---------- 車站紀念章（在地特色） ---------- */
const STAMP_ART={'新木場':'🪵','葛西臨海公園':'🎡','舞濱':'🎢','新浦安':'🏙️','市川鹽濱':'⚓','北投':'♨️','復興崗':'🎖️','忠義':'⛰️','關渡':'🌉','竹圍':'🚲','紅樹林':'🌿','淡水':'🌇','花蓮':'🏞️','吉安':'⛩️','志學':'🎓','平和':'🌾','壽豐':'🐚','阿里山':'🌸','對高岳':'🌲','祝山':'🌄','稻村崎':'🌅','七里濱':'🏄','鎌倉高校前':'🏀','腰越':'🐟','江之島':'🗼'};
let STAMPS=load('cabStamps',{});
function allStations(){ return Object.values(ROUTES).flatMap(r=>r.stations.map(st=>({st,route:r}))); }
function giveStamp(st){
  if(STAMPS[st.name]) return false;
  STAMPS[st.name]=Date.now(); save('cabStamps',STAMPS);
  toast(L('📮 蓋到「','📮 Stamp collected: ','📮 スタンプ獲得：「')+stName(st)+L('」車站紀念章！','','」'),'good');
  if(allStations().every(x=>STAMPS[x.st.name])) unlockAch('stamps');
  return true;
}
function stampHTML(st){
  const got=!!STAMPS[st.name], d=got?new Date(STAMPS[st.name]):null;
  return `<div class="stamp${got?' got':''}" title="${stName(st)}"><span class="sa">${got?STAMP_ART[st.name]||'🚉':'？'}</span><span class="sn">${stName(st)}</span><span class="sd">${got?(d.getFullYear()+'.'+(d.getMonth()+1)+'.'+d.getDate()):L('停車誤差 3 m 內蓋章','stop within 3 m','誤差 3 m 以内で押印')}</span></div>`;
}
function stampBookHTML(){
  const all=allStations(), n=all.filter(x=>STAMPS[x.st.name]).length;
  return `<details class="achbox stamps"><summary>${L('車站紀念章','Station stamps','駅スタンプ帳')} ${n}/${all.length}</summary>
    ${Object.values(ROUTES).map(r=>`<p class="eyebrow">${r.name}</p><div class="stampgrid">${r.stations.map(stampHTML).join('')}</div>`).join('')}</details>`;
}

/* ---------- 視覺回饋：停車結果、結算分數與彩帶 ---------- */
const RANK_STYLE={'完美':['#ffd34d','PERFECT'],'優秀':['#46d483','GREAT'],'良好':['#7fb8ff','GOOD'],'普通':['#c6d0d3','OK'],'勉強':['#ff8a70','CLOSE']};
function stopFX(rank,pp,trank,tp,err){
  const st=document.querySelector('.stage'); const el=document.createElement('div'); const [col,en]=RANK_STYLE[rank]||['#fff',''];
  el.className='stopfx'; el.style.setProperty('--c',col);
  el.innerHTML=`<small>${en}</small><b>${trWord(rank)}</b><span>${fmtErr(err)} · +${pp}　${trWord(trank)} +${tp}</span>`;
  st.appendChild(el); setTimeout(()=>el.remove(),2300);
}
function endFX(grade,score){
  const g=document.querySelector('.grade span'); if(g && !matchMedia('(prefers-reduced-motion: reduce)').matches){ const t0=performance.now(), unit=g.textContent.replace(/^-?\d+/,'');
    const tick=now=>{ const k=Math.min(1,(now-t0)/1100), e=1-Math.pow(1-k,3); g.textContent=Math.round(score*e)+unit; if(k<1) requestAnimationFrame(tick); }; requestAnimationFrame(tick); }
  const gb=document.querySelector('.grade b'); if(gb){ gb.classList.add('pop'); gb.dataset.g=grade; }
  if((grade==='S'||grade==='A') && !matchMedia('(prefers-reduced-motion: reduce)').matches){
    const box=document.createElement('div'); box.className='confetti'; const cols=['#ffb23e','#46d483','#7fb8ff','#ff8a70','#ffd34d','#e07aa0'];
    for(let i=0;i<(grade==='S'?90:45);i++){ const p=document.createElement('i'); p.style.left=Math.random()*100+'%'; p.style.background=cols[i%cols.length]; p.style.animationDelay=(Math.random()*0.6)+'s'; p.style.animationDuration=(1.8+Math.random()*1.4)+'s'; p.style.setProperty('--x',(Math.random()*160-80)+'px'); p.style.setProperty('--r',(Math.random()*720-360)+'deg'); box.appendChild(p); }
    document.getElementById('ov').appendChild(box); setTimeout(()=>box.remove(),4200);
  }
}
