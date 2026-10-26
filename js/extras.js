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
  {id:'sunrise', icon:'🌄', name:L('祝山看日出','Sunrise at Zhushan','祝山のご来光'), desc:L('開日出列車準點抵達祝山','Reach Zhushan on time with the sunrise train','ご来光列車で祝山に定時到着')},
  {id:'perfect', icon:'🎯', name:L('一公分都不差','Spot on','ピタ止め'), desc:L('任一站停車誤差 0.5 m 以內','Stop within 0.5 m at any station','どこかの駅で誤差 0.5 m 以内')},
  {id:'sniper',  icon:'📏', name:L('人體尺規','Human ruler','人間定規'),   desc:L('每一站停車誤差都在 1 m 以內','Stop within 1 m at every station','全駅で誤差 1 m 以内')},
  {id:'ontime',  icon:'⏱️', name:L('台灣之光準點','Like clockwork','定時運転'), desc:L('每一站都準點到達','Arrive on time at every station','全駅に定時到着')},
  {id:'clean',   icon:'🧼', name:L('零扣分','Clean sheet','減点ゼロ'),     desc:L('一整班沒有任何扣分','A whole run with no penalties','一度も減点なしで完走')},
  {id:'horn',    icon:'📯', name:L('喇叭手','Horn master','警笛マスター'),     desc:L('三個平交道都有鳴笛','Sound the horn at all three crossings','3か所の踏切すべてで警笛')},
  {id:'gradeS',  icon:'🏆', name:L('S 級司機員','S-rank driver','Sランク運転士'), desc:L('拿到 S 評價','Get an S grade','S評価を獲得')},
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
/* 中文版播國語＋英語，英文版只播英語，日文版播日語＋英語 */
function announce(zh,en,ja){
  if(!voiceOn || !('speechSynthesis' in window)) return;
  const say=(txt,lang)=>{ const u=new SpeechSynthesisUtterance(txt); u.lang=lang; u.rate=0.95; speechSynthesis.speak(u); };
  try{
    speechSynthesis.cancel();
    if(LANG==='zh') say(zh,'zh-TW'); else if(LANG==='ja' && ja) say(ja,'ja-JP');
    if(en) say(en,'en-US');
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
  const last=STATIONS[STATIONS.length-1];
  announce('本列車開往'+last.name+'。下一站，'+st.name+'。','This train is bound for '+last.en+'. Next station, '+st.en+'.','この列車は'+last.ja+'行きです。次は'+st.ja+'です。');
}
function extrasStop(st,err){
  chime();
  if(Math.abs(err)<=0.5) unlockAch('perfect');
  const last=S.next>=STATIONS.length-1;
  announce(last?st.name+'到了，本列車終點站，謝謝搭乘。':st.name+'到了。', last?'This is the terminal station, '+st.en+'. Thank you.':st.en+'.', last?st.ja+'、終点です。ご乗車ありがとうございました。':st.ja+'です。');
  showFact(st);
}
function extrasDepart(){
  const st=STATIONS[S.next]; if(!st) return;
  const last=S.next===STATIONS.length-1;
  announce('下一站，'+st.name+(last?'，本列車終點站。':'。'),'Next station, '+st.en+'.','次は'+st.ja+(last?'、終点です。':'です。'));
}
function extrasEnd(grade){
  const log=S.log, P=S.pens;
  const stopsAll=S.log.filter(r=>!r.miss);
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
  const bk=bestKey(), best=load(bk,null), sc=Math.round(S.score);
  const isBest = !best || sc>best.score;
  if(isBest) save(bk,{score:sc, grade, at:Date.now()});
  const runs=load('cabRuns',0)+1; save('cabRuns',runs);
  return {isBest, best:isBest?{score:sc,grade}:best, runs};
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
  const AL=ROUTE.key==='alishan', JPR=!!ROUTE.japan, k=JPR?'enoden':AL?'afrch':'tra';
  return `<a class="promo ride" href="${linkOf(k)}" target="_blank" rel="noopener"><span>${JPR?'🌊':AL?'🌄':'🚉'}</span>
    <span><b>${L('到現場搭一次！','Ride it for real','実際に乗ってみよう')}</b><small>${JPR?L('江之電的路線、車票與沿線景點','Enoden routes, tickets and sights','江ノ電の路線・きっぷ・沿線観光'):AL?L('阿里山林鐵的時刻與訂票','Alishan Forest Railway timetables and tickets','阿里山林業鉄道の時刻表ときっぷ'):L('臺鐵花東線的時刻與訂票','Taiwan Railway timetables and tickets','台湾鉄道の時刻表ときっぷ')}</small></span><span aria-hidden="true">↗</span></a>`;
}

/* ---------- overlay fragments ---------- */
function titleExtrasHTML(){
  const best=load(bestKey(),null), runs=load('cabRuns',0), n=ACHS.filter(a=>ACH[a.id]).length;
  return `<div class="recs"><span>${L('最佳紀錄','Best','ベスト')} <b>${best?best.score+L(' 分（',' pts (',' 点（')+best.grade+L('）',')','）'):'—'}</b></span><span>${L('已開 ','Runs ','運転回数 ')}<b>${runs}</b>${L(' 班','','')}</span><span>${L('成就','Achievements','実績')} <b>${n}/${ACHS.length}</b></span></div>
    <details class="achbox"><summary>${L('查看成就徽章','Achievement badges','実績バッジを見る')}</summary>${achGridHTML()}</details>
    ${sightsHTML()}
    <div class="envpick" role="radiogroup" aria-label="${L('天氣與時段','Weather and time','天気と時間帯')}">${ROUTE.envs.map(k=>ENVS[k]).map(e=>`<button type="button" role="radio" aria-checked="${e===ENV}" class="envbtn${e===ENV?' on':''}" data-env="${e.key}"><span>${e.icon}</span>${e.name}</button>`).join('')}</div>
    <div class="toggles"><label class="toggle"><input type="checkbox" id="sfxTog"${sfxOn?' checked':''}> ${L('列車音效','Train sounds','走行音')}</label>
    <label class="toggle"><input type="checkbox" id="voiceTog"${voiceOn?' checked':''}> ${L('車內語音廣播','Onboard announcements','車内放送')}</label></div>
    ${promoHTML()}`;
}
function bindTitleExtras(){
  const v=document.getElementById('voiceTog'); if(v) v.addEventListener('change',()=>setVoice(v.checked));
  const f=document.getElementById('sfxTog'); if(f) f.addEventListener('change',()=>setSfx(f.checked));
  document.querySelectorAll('.envbtn').forEach(b=>b.addEventListener('click',()=>{ setEnv(b.dataset.env); showOverlay('title'); const nb=document.querySelector('.envbtn[data-env="'+b.dataset.env+'"]'); if(nb) nb.focus({preventScroll:true}); }));
}
function endExtrasHTML(info,grade){
  const got=lastNew.map(id=>ACHS.find(a=>a.id===id)).filter(Boolean);
  return `${passengerSays(grade)}
    <div class="recs">${info.isBest?`<span class="nb">🎉 ${L('新紀錄！','New best!','自己ベスト更新！')}</span>`:`<span>${L('最佳紀錄','Best','ベスト')} <b>${info.best.score}${L(' 分（',' pts (',' 点（')}${info.best.grade}${L('）',')','）')}</b></span>`}<span>${L('第 ','Run #','')}<b>${info.runs}</b>${L(' 班','',' 回目')}</span></div>
    ${got.length?`<div class="newach"><p class="eyebrow">${L('本班解鎖成就','Unlocked this run','今回解除した実績')}</p>${achGridHTML(lastNew).replace('class="achs"','class="achs only-new"')}</div>`:''}
    ${rideRealHTML()}
    ${promoHTML()}`;
}
function shareText(grade){
  const rows=S.log.map(r=>r.miss?`${nameOf(r.name)} ${L('過站','overran','通過')}`:`${nameOf(r.name)} ${fmtErr(r.err)} ${trWord(r.trank)}`).join('\n');
  return `${ROUTE.key==='alishan'?'🌲':ROUTE.japan?'🌊':'🚃'} ${ROUTE.title}｜${stName(STATIONS[0])}→${stName(STATIONS[STATIONS.length-1])}（${ENV.name}）\n${L('評價','Grade','評価')} ${grade}・${Math.round(S.score)} ${L('分','pts','点')}\n${rows}\nhttps://train.sectools.tw${LANG_PATH[LANG]}`;
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
function promoHTML(){
  return `<a class="promo" href="https://sectools.tw/?utm_source=train-game&utm_medium=referral" target="_blank" rel="noopener">
    <span>🛡️</span><span><small>${L('本遊戲由','This game is','このゲームは')}</small><b>${L('SecTools.tw 製作與維護','made and maintained by SecTools.tw','SecTools.tw が制作・運営')}</b><small>${L('也來看看我們的線上資安工具','Check out our free online security tools','無料のオンラインセキュリティツールもどうぞ')}</small></span><span aria-hidden="true">↗</span></a>`;
}
