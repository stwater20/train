/* data.js — 路線資料（車站、速限、曲線、平交道、號誌）與共用小工具 */
'use strict';

/* ---------- 語言：?lang=zh|en|ja，其次是上次選擇，再其次看瀏覽器語言 ---------- */
const LANGS={zh:'中文',en:'English',ja:'日本語'};
const LANG=(()=>{ try{ if(LANGS[window.FORCE_LANG]){ localStorage.setItem('cabLang',window.FORCE_LANG); return window.FORCE_LANG; }
  const q=new URLSearchParams(location.search).get('lang'); if(LANGS[q]){ localStorage.setItem('cabLang',q); return q; }
  const s=localStorage.getItem('cabLang'); if(LANGS[s]) return s; }catch(e){}
  const n=(navigator.language||'zh').toLowerCase(); return n.startsWith('ja')?'ja' : n.startsWith('zh')?'zh' : 'en'; })();
document.documentElement.lang = LANG==='zh'?'zh-Hant':LANG;
/* 依語言挑字串：L('中文','English','日本語') */
const L=(zh,en,ja)=> LANG==='en'?en : LANG==='ja'?(ja??en) : zh;
/* 每個語言有自己的網址：/、/en/、/ja/（方便搜尋引擎收錄） */
const LANG_PATH={zh:'/',en:'/en/',ja:'/ja/'};
function setLang(l){ try{ localStorage.setItem('cabLang',l); }catch(e){} location.href=pagePath(l, window.FORCE_ROUTE||null); }
const stName = st => L(st.name, st.en, st.ja||st.name);
/* 停車位置牌上的數字＝這班車的輛數 */
const CARS = () => String(ROUTE.cars||4);

/* ---------- route data ---------- */
/* 兩條路線：花東線區間車、阿里山林業鐵路祝山線。用 localStorage 記住選擇，切換時重新載入頁面 */
const ROUTES = {
  hualien:{
    key:'hualien', cars:4, name:L('花東線','Hualien–Taitung Line','花東線'), title:L('花東線駕駛室','Hualien Line Cab','花東線運転台'), train:L('區間車 4 輛編成','4-car local EMU','区間車 4両編成'), desc:L('單線電化區間','single-track electrified','単線電化区間'),
    trainLen:80, lineMax:90, gauge:1.067, electric:true, elev0:20, elevScale:1, railLen:25,
    power:0.95, ebDecel:1.45, brakeStep:0.13,
    envs:['morning','dusk','night','rain'],
    stations:[
      {name:'花蓮', en:'Hualien', ja:'花蓮', pos:0},
      {name:'吉安', en:"Ji'an", ja:'吉安', pos:1150, leg:125},
      {name:'志學', en:'Zhixue', ja:'志学', pos:2650, leg:135},
      {name:'平和', en:'Pinghe', ja:'平和', pos:3850, leg:135},
      {name:'壽豐', en:'Shoufeng', ja:'寿豊', pos:5550, leg:140},
    ],
    limits:[ {s:0,e:300,v:45}, {s:1700,e:2050,v:65}, {s:2650,e:2900,v:50}, {s:4300,e:4750,v:70}, {s:5300,e:5600,v:60} ],
    curves:[ {s:850,e:1050,k:0.0016}, {s:1700,e:2050,k:0.0032}, {s:2250,e:2450,k:-0.0020}, {s:3150,e:3400,k:0.0018}, {s:4300,e:4750,k:-0.0030}, {s:5000,e:5200,k:0.0012} ],
    crossings:[780, 3120, 4920],
    loops:[{s:2440, e:2820, st:2}],
    signal:3480,
    grades:[ {s:-800,e:200,g:0}, {s:200,e:900,g:5}, {s:900,e:1250,g:0}, {s:1250,e:2100,g:8}, {s:2100,e:2700,g:0}, {s:2700,e:3300,g:-6}, {s:3300,e:3950,g:0}, {s:3950,e:4800,g:10}, {s:4800,e:5150,g:-4}, {s:5150,e:99999,g:0} ],
  },
  alishan:{
    key:'alishan', cars:4, name:L('阿里山祝山線','Alishan Zhushan Line','阿里山祝山線'), title:L('阿里山小火車','Alishan Forest Railway','阿里山森林鉄道'), train:L('柴油機車 + 3 節客車','diesel loco + 3 coaches','ディーゼル機関車＋客車3両'), desc:L('762 mm 窄軌登山鐵道','762 mm narrow-gauge mountain railway','762 mm 軌間の登山鉄道'),
    trainLen:52, lineMax:30, gauge:0.762, electric:false, elev0:2216, elevScale:1.475, railLen:12,
    power:0.9, ebDecel:1.25, brakeStep:0.13,
    envs:['dawn','clear','mist'],
    stations:[
      {name:'阿里山', en:'Alishan', ja:'阿里山', pos:0},
      {name:'對高岳', en:'Duigaoyue', ja:'対高岳', pos:2500, leg:450},
      {name:'祝山', en:'Zhushan', ja:'祝山', pos:3600, leg:225},
    ],
    limits:[ {s:0,e:220,v:15}, {s:520,e:760,v:20}, {s:1180,e:1420,v:18}, {s:1900,e:2120,v:20}, {s:2380,e:2560,v:20}, {s:2860,e:3080,v:18}, {s:3420,e:3700,v:15} ],
    curves:[ {s:300,e:420,k:0.004}, {s:520,e:760,k:-0.0065}, {s:900,e:1050,k:0.004}, {s:1180,e:1420,k:0.0055}, {s:1560,e:1700,k:-0.004}, {s:1900,e:2120,k:-0.0065},
             {s:2700,e:2800,k:0.004}, {s:2860,e:3080,k:0.0065}, {s:3200,e:3330,k:-0.005} ],
    crossings:[1640],
    loops:[{s:2318, e:2670, st:1}],
    signal:null,
    grades:[ {s:-800,e:150,g:0}, {s:150,e:900,g:45}, {s:900,e:1500,g:60}, {s:1500,e:2300,g:50}, {s:2300,e:2600,g:0}, {s:2600,e:3400,g:62}, {s:3400,e:99999,g:0} ],
  },
  enoden:{
    key:'enoden', cars:4, name:L('江之電','Enoden','江ノ電'), title:L('江之電駕駛室','Enoden Cab','江ノ電運転台'), train:L('江之電 4 輛編成','4-car Enoden EMU','江ノ電 4両編成'), desc:L('沿海單線・路面併用軌道','coastal single track with street running','海沿いの単線・併用軌道'),
    trainLen:50, lineMax:45, gauge:1.067, electric:true, elev0:5, elevScale:1, railLen:25,
    power:0.9, ebDecel:1.4, brakeStep:0.13, platLen:95, japan:true,
    envs:['morning','dusk','night','rain'],
    stations:[
      {name:'稻村崎',   en:'Inamuragasaki',    ja:'稲村ヶ崎',   pos:0},
      {name:'七里濱',   en:'Shichirigahama',   ja:'七里ヶ浜',   pos:1100, leg:150},
      {name:'鎌倉高校前', en:'Kamakura-Kōkōmae', ja:'鎌倉高校前', pos:2000, leg:118},
      {name:'腰越',     en:'Koshigoe',         ja:'腰越',       pos:3000, leg:128},
      {name:'江之島',   en:'Enoshima',         ja:'江ノ島',     pos:3750, leg:158},
    ],
    limits:[ {s:0,e:160,v:25}, {s:560,e:800,v:35}, {s:1880,e:2080,v:30}, {s:2880,e:3080,v:30}, {s:3120,e:3600,v:25}, {s:3600,e:3780,v:15} ],
    curves:[ {s:560,e:800,k:-0.0035}, {s:1450,e:1650,k:0.0025}, {s:2350,e:2550,k:-0.003}, {s:3600,e:3700,k:0.008} ],
    crossings:[450, 1380, 2045, 2640],
    loops:[{s:920, e:1265, st:1}, {s:2820, e:3110, st:3}],
    street:{s:3120, e:3600},
    signal:null,
    grades:[ {s:-800,e:250,g:0}, {s:250,e:850,g:-6}, {s:850,e:1250,g:0}, {s:1250,e:1800,g:5}, {s:1800,e:2200,g:0}, {s:2200,e:2800,g:-4}, {s:2800,e:99999,g:0} ],
  },
  tamsui:{
    key:'tamsui', cars:6, name:L('捷運淡水信義線','Taipei Metro Tamsui Line','台北MRT淡水信義線'), title:L('台北捷運駕駛室','Taipei Metro Cab','台北MRT運転台'), train:L('捷運 6 節編成','6-car metro train','MRT 6両編成'), desc:L('雙線・第三軌供電','double track, third rail','複線・第三軌条'),
    trainLen:141, lineMax:80, gauge:1.435, electric:true, thirdRail:true, double:true, elev0:10, elevScale:1, railLen:120,
    power:1.1, ebDecel:1.4, brakeStep:0.14, platLen:170, sunFlip:true,
    envs:['morning','dusk','night','rain'],
    stations:[
      {name:'北投',   en:'Beitou',     ja:'北投',   pos:0},
      {name:'復興崗', en:'Fuxinggang', ja:'復興崗', pos:900,  leg:106},
      {name:'忠義',   en:'Zhongyi',    ja:'忠義',   pos:1700, leg:88},
      {name:'關渡',   en:'Guandu',     ja:'関渡',   pos:2500, leg:86},
      {name:'竹圍',   en:'Zhuwei',     ja:'竹囲',   pos:3500, leg:98},
      {name:'紅樹林', en:'Hongshulin', ja:'紅樹林', pos:4400, leg:91},
      {name:'淡水',   en:'Tamsui',     ja:'淡水',   pos:5400, leg:102},
    ],
    limits:[ {s:0,e:200,v:45}, {s:2300,e:2620,v:60}, {s:5200,e:5450,v:35} ],
    curves:[ {s:1150,e:1400,k:-0.002}, {s:2300,e:2620,k:0.0028}, {s:3800,e:4100,k:-0.0022}, {s:4850,e:5150,k:0.0018} ],
    crossings:[],
    signal:null,
    grades:[ {s:-800,e:950,g:0}, {s:950,e:1450,g:10}, {s:1450,e:1750,g:0}, {s:1750,e:2250,g:-12}, {s:2250,e:2550,g:0}, {s:2550,e:3250,g:6}, {s:3250,e:3550,g:0}, {s:3550,e:4150,g:-5}, {s:4150,e:4450,g:0}, {s:4450,e:5150,g:4}, {s:5150,e:99999,g:0} ],
  },
  keiyo:{
    key:'keiyo', cars:10, name:L('JR 京葉線','JR Keiyō Line','JR京葉線'), title:L('京葉線駕駛室','Keiyō Line Cab','京葉線運転台'), train:L('E233 系 10 輛','10-car E233','E233系 10両'), desc:L('高架雙線・沿東京灣','elevated double track along Tokyo Bay','高架複線・東京湾沿い'),
    trainLen:200, lineMax:100, gauge:1.067, electric:true, double:true, elevated:true, jpSign:true, continues:true, dest:{ja:'蘇我',name:'蘇我',en:'Soga'}, oppDest:'東京', elev0:12, elevScale:1, railLen:100,
    power:1.05, ebDecel:1.45, brakeStep:0.14, platLen:215, sunMap:'east',
    envs:['morning','dusk','night','rain'],
    stations:[
      {name:'新木場',     en:'Shin-Kiba',         ja:'新木場',     pos:0},
      {name:'葛西臨海公園', en:'Kasai-Rinkai-Kōen', ja:'葛西臨海公園', pos:1800, leg:140},
      {name:'舞濱',       en:'Maihama',           ja:'舞浜',       pos:2900, leg:99},
      {name:'新浦安',     en:'Shin-Urayasu',      ja:'新浦安',     pos:4100, leg:103},
      {name:'市川鹽濱',   en:'Ichikawashiohama',  ja:'市川塩浜',   pos:5200, leg:99},
    ],
    limits:[ {s:0,e:260,v:55}, {s:2650,e:3060,v:75}, {s:5000,e:5240,v:70} ],
    curves:[ {s:450,e:800,k:0.0014}, {s:2650,e:3000,k:-0.0024}, {s:4350,e:4700,k:0.0014} ],
    crossings:[],
    signal:null,
    grades:[ {s:-800,e:300,g:0}, {s:300,e:650,g:6}, {s:650,e:1050,g:0}, {s:1050,e:1450,g:-6}, {s:1450,e:2050,g:0}, {s:2050,e:2350,g:5}, {s:2350,e:2650,g:-5}, {s:2650,e:99999,g:0} ],
  },
};
let ROUTE = LANG==='ja' ? ROUTES.enoden : ROUTES.hualien; // 日文版預設先開江之電
try{ const k=JSON.parse(localStorage.getItem('cabRoute')); if(ROUTES[k]) ROUTE=ROUTES[k]; }catch(e){}
/* 路線專屬網頁（例如 /ja/enoden/）會指定路線 */
if(ROUTES[window.FORCE_ROUTE]){ ROUTE=ROUTES[window.FORCE_ROUTE]; try{ localStorage.setItem('cabRoute',JSON.stringify(ROUTE.key)); }catch(e){} }
function pagePath(lang,route){ return (lang==='zh'?'/':'/'+lang+'/')+(route?route+'/':''); }
function setRoute(key){ try{ localStorage.setItem('cabRoute',JSON.stringify(key)); }catch(e){} if(window.FORCE_ROUTE) location.href=pagePath(LANG,key); else location.reload(); }

const TRAIN_LEN = ROUTE.trainLen;
const STATIONS = ROUTE.stations;
/* 時刻表：依難度模式放寬或收緊 */
function buildSchedule(k){ let t=0; STATIONS[0].dep=0; for(let i=1;i<STATIONS.length;i++){ t+=Math.round(STATIONS[i].leg*k); STATIONS[i].arr=t; t+=15; STATIONS[i].dep=t; } }
buildSchedule(1);
const END = STATIONS[STATIONS.length-1].pos;
const LINE_MAX = ROUTE.lineMax;
const LIMITS = ROUTE.limits;
const CURVES = ROUTE.curves;
const CROSSINGS = ROUTE.crossings;
const SIGNAL_POS = ROUTE.signal==null ? 1e9 : ROUTE.signal;
/* 坡度（‰，正值為上坡）。車站一帶保持水平 */
const GRADES = ROUTE.grades;
function gradeAt(p){ for(const G of GRADES) if(p>=G.s && p<G.e) return G.g; return 0; }
/* 列車平均坡度：取車頭到車尾幾個點平均 */
function trainGrade(p){ let t=0; for(let k=0;k<5;k++) t+=gradeAt(p-k*TRAIN_LEN/4); return t/5; }
/* 軌道高程（公尺，相對起點）；花東線畫面保持平地，阿里山線真的爬升 */
const EL_STEP=2, EL_MIN=-800, EL_N=Math.ceil((END+2000-EL_MIN)/EL_STEP)+2, ELEV=new Float32Array(EL_N);
(function(){ const i0=-EL_MIN/EL_STEP; for(let i=i0+1;i<EL_N;i++) ELEV[i]=ELEV[i-1]+gradeAt(EL_MIN+(i-0.5)*EL_STEP)/1000*EL_STEP; for(let i=i0-1;i>=0;i--) ELEV[i]=ELEV[i+1]-gradeAt(EL_MIN+(i+0.5)*EL_STEP)/1000*EL_STEP; })();
function elevAt(p){ const x=clamp((p-EL_MIN)/EL_STEP,0,EL_N-1.001), i=Math.floor(x); return ELEV[i]+(ELEV[i+1]-ELEV[i])*(x-i); }
const visElev = p => ROUTE.key==='alishan' ? elevAt(p) : 0;
/* 顯示用海拔（遊戲距離有壓縮，阿里山線依比例換算成真實高差 2216 → 2451 m） */
const altitude = p => Math.round(ROUTE.elev0 + elevAt(p)*ROUTE.elevScale);

/* 天氣與時段 */
const ENVS = {
  morning:{key:'morning', name:L('晴天早晨','Sunny morning','晴れの朝'), icon:'☀️', clock:8*3600+12*60,  word:L('今天早上','this morning','今朝')},
  dusk:   {key:'dusk',    name:L('黃昏','Dusk','夕暮れ'), icon:'🌇', clock:17*3600+32*60, word:L('傍晚','this evening','夕方')},
  night:  {key:'night',   name:L('夜間','Night','夜'), icon:'🌙', clock:20*3600+12*60, word:L('今晚','tonight','今夜'), night:true},
  rain:   {key:'rain',    name:L('雨天','Rain','雨'), icon:'🌧️', clock:8*3600+12*60,  word:L('下雨的早上','on a rainy morning','雨の朝'), rain:true},
  dawn:   {key:'dawn',    name:L('日出列車','Sunrise train','ご来光列車'), icon:'🌄', clock:4*3600+50*60,  word:L('清晨','before dawn','早朝'), night:true},
  clear:  {key:'clear',   name:L('晴朗','Clear','快晴'), icon:'🌲', clock:9*3600+30*60,  word:L('早上','this morning','朝')},
  mist:   {key:'mist',    name:L('雲霧','Mist','霧'), icon:'🌫️', clock:14*3600+10*60, word:L('起霧的午後','on a misty afternoon','霧の午後')},
};
let ENV = ENVS[ROUTE.envs[0]];

/* ---------- 畫面風格：方塊（預設）或寫實 ---------- */
let STYLE='block';
try{ const k=JSON.parse(localStorage.getItem('cabStyle')); if(k==='block'||k==='smooth') STYLE=k; }catch(e){}
function setStyle(k){ try{ localStorage.setItem('cabStyle',JSON.stringify(k)); }catch(e){} location.reload(); }

/* ---------- 難度模式 ---------- */
const DIFFS = {
  easy:{key:'easy', icon:'🔰', name:L('新手','Beginner','初心者'), desc:L('時刻表寬鬆、扣分減半、提示煞車點與預計停車位置，不會空轉','Relaxed timetable, half penalties, braking cues and predicted stop point, no wheel slip','ゆとりダイヤ・減点半分・ブレーキ開始の合図と停止予測あり・空転なし'),
        timeK:1.15, penK:0.5, atp:5, guide:true, gauge:80, slip:false},
  pro: {key:'pro', icon:'🎯', name:L('專業','Pro','上級'), desc:L('實際時刻表、扣分加重、ATP 超速 3 km/h 就介入，停車誤差尺只在最後 20 m 出現','Real timetable, heavier penalties, ATP at +3 km/h, stop gauge only in the last 20 m','実ダイヤ・減点増・ATP は +3 km/h で作動・停止誤差ゲージは最後の 20 m だけ'),
        timeK:1.0, penK:1.5, atp:3, guide:false, gauge:20, slip:true},
};
let DIFF = DIFFS.easy;
try{ const k=JSON.parse(localStorage.getItem('cabDiff')); if(DIFFS[k]) DIFF=DIFFS[k]; }catch(e){}
function setDiff(k){ DIFF=DIFFS[k]||DIFFS.easy; try{ localStorage.setItem('cabDiff',JSON.stringify(DIFF.key)); }catch(e){} buildSchedule(DIFF.timeK); }
buildSchedule(DIFF.timeK);

/* ---------- 車種：每條路線一輛預設、一輛靠成就解鎖 ---------- */
const TRAINS = {
  hualien:[
    {key:'emu800', name:L('EMU800 型區間車','EMU800 local train','EMU800形 区間車'), power:0.95, brakeStep:0.13, ebDecel:1.45, sound:'vvvf', pitch:1.0, frame:'#0d1215'},
    {key:'emu900', name:L('EMU900 型區間車','EMU900 local train','EMU900形 区間車'), power:1.12, brakeStep:0.145, ebDecel:1.55, sound:'vvvf', pitch:1.25, frame:'#10161c',
     req:'gradeA_hualien', reqText:L('花東線拿到 A 以上評價','Get an A or better on the Hualien line','花東線で A 以上の評価')},
  ],
  alishan:[
    {key:'dl', name:L('柴油機車','Diesel locomotive','ディーゼル機関車'), power:0.9, brakeStep:0.13, ebDecel:1.25, sound:'diesel', frame:'#0d1215'},
    {key:'sl31', name:L('蒸汽機車 SL-31（Shay 型）','Steam loco SL-31 (Shay)','蒸気機関車 SL-31（シェイ式）'), power:0.82, brakeStep:0.12, ebDecel:1.15, sound:'steam', frame:'#1a1410',
     req:'sunrise', reqText:L('解鎖成就「祝山看日出」','Unlock “Sunrise at Zhushan”','実績「祝山のご来光」を解除')},
  ],
  tamsui:[
    {key:'c381', name:L('C381 型電聯車','Type C381 train','C381形 電車'), power:1.1, brakeStep:0.14, ebDecel:1.4, sound:'vvvf', pitch:1.2, frame:'#0d1215'},
    {key:'c301', name:L('C301 型電聯車（第一代）','Type C301 train (first generation)','C301形 電車（初代）'), power:0.95, brakeStep:0.13, ebDecel:1.35, sound:'resistor', pitch:0.8, frame:'#141a20',
     req:'gradeA_tamsui', reqText:L('淡水線拿到 A 以上評價','Get an A or better on the Tamsui Line','淡水線で A 以上の評価')},
  ],
  keiyo:[
    {key:'e233', name:L('E233 系 5000 番台','E233-5000 series','E233系5000番台'), power:1.05, brakeStep:0.14, ebDecel:1.45, sound:'vvvf', pitch:1.1, frame:'#0d1215'},
    {key:'k209', name:L('209 系 500 番台','209-500 series','209系500番台'), power:0.95, brakeStep:0.135, ebDecel:1.4, sound:'vvvf', pitch:0.92, frame:'#11161a',
     req:'gradeA_keiyo', reqText:L('京葉線拿到 A 以上評價','Get an A or better on the Keiyō Line','京葉線で A 以上の評価')},
  ],
  enoden:[
    {key:'e1000', name:L('江之電 1000 形','Enoden Type 1000','江ノ電 1000形'), power:0.9, brakeStep:0.13, ebDecel:1.4, sound:'vvvf', pitch:0.9, frame:'#0d1215'},
    {key:'e300', name:L('江之電 300 形（305 編成）','Enoden Type 300 (set 305)','江ノ電 300形（305編成）'), power:0.78, brakeStep:0.12, ebDecel:1.3, sound:'resistor', pitch:0.7, frame:'#16201a',
     req:'pro_enoden', reqText:L('用專業模式把江之電開到江之島','Finish the Enoden in Pro mode','上級モードで江ノ電を完走')},
  ],
};
let TRAIN = TRAINS[ROUTE.key][0];
try{ const k=JSON.parse(localStorage.getItem('cabTrain_'+ROUTE.key)); const t=TRAINS[ROUTE.key].find(x=>x.key===k); if(t) TRAIN=t; }catch(e){}
Object.assign(ROUTE,{power:TRAIN.power, brakeStep:TRAIN.brakeStep, ebDecel:TRAIN.ebDecel});
/* 車站附近的觀光景點指示牌 */
const SIGHTS = {
  '吉安':['慶修院 →'], '志學':['東華大學 →'], '壽豐':['鯉魚潭 →','雲山水 →'],
  '阿里山':['神木群 →'], '祝山':['觀日平台 →'],
  '北投':['北投溫泉 →'], '關渡':['關渡宮 →','關渡自然公園 →'], '紅樹林':['紅樹林保護區 →'], '淡水':['淡水老街 →','漁人碼頭 →'],
  '七里濱':['七里ヶ浜海岸 →'], '鎌倉高校前':['踏切 撮影はマナーを守って'], '腰越':['腰越漁港 →'], '江之島':['江の島 →','江島神社 →'],
};
let BASE_CLOCK = ENV.clock;

function kAt(p){ let k=0; for(const c of CURVES){ if(p>c.s && p<c.e){ k+=c.k*Math.min(1,(p-c.s)/40,(c.e-p)/40); } } return k; }
const HSTEP=5, HN=Math.ceil((END+800)/HSTEP)+2, HEAD=new Float32Array(HN);
for(let i=1;i<HN;i++) HEAD[i]=HEAD[i-1]+kAt((i-0.5)*HSTEP)*HSTEP;
function headAt(p){ const x=Math.max(0,Math.min(HN-1.001,p/HSTEP)); const i=Math.floor(x); return HEAD[i]+(HEAD[i+1]-HEAD[i])*(x-i); }
function rnd(i){ let x=Math.imul((i|0)^0x9e3779b9,0x85ebca6b); x^=x>>>13; x=Math.imul(x,0xc2b2ae35); x^=x>>>16; return (x>>>0)/4294967296; }
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,x)=>{ const t=clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); };
const nLabel=n=> n>0?'P'+n : n===0?'N' : n===-9?'EB' : 'B'+(-n);
const pad=n=>String(n).padStart(2,'0');
function fmtClock(sec){ const s=((Math.floor(sec)%86400)+86400)%86400; return pad(Math.floor(s/3600))+':'+pad(Math.floor(s/60)%60)+':'+pad(s%60); }
function fmtDur(sec){ const s=Math.round(Math.abs(sec)); return pad(Math.floor(s/60))+':'+pad(s%60); }
function fmtErr(e){ return (e>=0?'+':'−')+Math.abs(e).toFixed(1)+' m'; }

