/* tour.js — 觀光模式：自動駕駛、沿線景點解說、左右看風景、2 倍速，不計分 */
'use strict';

/* 沿線景點（位置為示意；side：L 左、R 右、F 前方） */
const TOUR_POI={
  hualien:[
    [200,'R',L('中央山脈','Central Mountain Range','中央山脈'),L('右手邊是台灣的屋脊，3,000 公尺以上的高山連綿不斷。','On your right is the spine of Taiwan, peak after peak over 3,000 m.','右手は台湾の背骨。3,000 m 級の山々が連なります。')],
    [700,'L',L('海岸山脈','Coastal Mountain Range','海岸山脈'),L('左邊較低的山脈另一側就是太平洋，花東縱谷就夾在兩座山脈之間。','Beyond the lower range on your left lies the Pacific; the East Rift Valley runs between the two ranges.','左の低い山並みの向こうは太平洋。花東縦谷は二つの山脈に挟まれています。')],
    [1320,'L',L('慶修院','Qingxiu Temple','慶修院'),L('日治時期吉野移民村留下的日式佛寺。','A Japanese-style temple left from the Yoshino immigrant village of the colonial era.','日本統治時代の吉野移民村に残る日本式の寺院。')],
    [2100,'R',L('稻田與白鷺鷥','Rice paddies and egrets','田んぼと白鷺'),L('縱谷的稻田裡常看到白鷺鷥跟著農機覓食。','Egrets often follow the tractors through the valley’s paddies.','縦谷の田んぼでは、白鷺が農機の後をついて餌を探します。')],
    [2760,'R',L('東華大學','National Dong Hwa University','国立東華大学'),L('志學一帶是東華大學的校園，校地非常遼闊。','The vast campus of National Dong Hwa University surrounds Zhixue.','志学一帯は広大な東華大学のキャンパスです。')],
    [5300,'R',L('鯉魚潭方向','Towards Liyu Lake','鯉魚潭方面'),L('壽豐往西是鯉魚潭，花蓮最大的內陸湖。','West of Shoufeng is Liyu Lake, Hualien’s largest inland lake.','寿豊の西には花蓮最大の湖、鯉魚潭があります。')],
  ],
  alishan:[
    [300,'R',L('檜木森林','Cypress forest','ヒノキの森'),L('阿里山的紅檜、扁柏林，日治時期就是靠這條鐵路運下山。','Alishan’s red cypress and hinoki forests were once hauled down the mountain by this railway.','阿里山のベニヒとヒノキ。かつてはこの鉄道で山から運ばれました。')],
    [1500,'R',L('急彎與陡坡','Sharp curves and steep grades','急カーブと急勾配'),L('762 mm 窄軌，最陡 62‰，彎道時輪緣會發出尖叫聲。','762 mm narrow gauge with grades up to 62‰ — listen for the flanges squealing on the curves.','762 mm の狭軌、最急 62‰。カーブではフランジがきしみます。')],
    [2500,'L',L('對高岳','Duigaoyue','対高岳'),L('祝山線途中唯一的車站，海拔約 2,350 公尺。','The only intermediate station on the Zhushan Line, at about 2,350 m.','祝山線の途中で唯一の駅、標高約 2,350 m。')],
    [3100,'F',L('玉山','Yushan (Jade Mountain)','玉山'),L('前方偏左的遠方就是東北亞最高峰玉山，3,952 公尺。','Far ahead to the left is Yushan, at 3,952 m the highest peak in Northeast Asia.','前方左の遠くに東北アジア最高峰の玉山（3,952 m）。')],
    [3500,'F',L('祝山觀日平台','Zhushan sunrise viewpoint','祝山の展望台'),L('全台海拔最高的車站，清晨在這裡看雲海日出。','Taiwan’s highest station — watch the sun rise over a sea of clouds.','台湾最高所の駅。早朝は雲海のご来光が見られます。')],
  ],
  enoden:[
    [300,'L',L('相模灣','Sagami Bay','相模湾'),L('左手邊一整片都是相模灣，常看到衝浪的人。','Sagami Bay fills the view on your left, often dotted with surfers.','左手一面に相模湾。サーファーの姿もよく見られます。')],
    [1500,'F',L('江之島與富士山','Enoshima and Mt Fuji','江の島と富士山'),L('天氣好時，前方左邊是江之島、右邊遠方是富士山。','On a clear day, Enoshima is ahead on the left and Mt Fuji far off to the right.','晴れていれば前方左に江の島、右の遠くに富士山。')],
    [2045,'L',L('鎌倉高校前平交道','Kamakura-Kōkōmae crossing','鎌倉高校前の踏切'),L('《灌籃高手》片頭裡的平交道，總是有人在這裡拍照。','The crossing from the opening of “Slam Dunk” — there are always people taking photos.','「SLAM DUNK」のオープニングの踏切。いつも撮影する人がいます。')],
    [2400,'L',L('國道 134 號','Route 134','国道134号'),L('江之電緊貼著沿海的 134 號國道，另一邊就是海灘。','The Enoden hugs coastal Route 134, with the beach on the other side.','江ノ電は海沿いの国道134号に寄り添って走ります。')],
    [3150,'F',L('腰越的路面區間','Street running at Koshigoe','腰越の併用軌道'),L('電車和汽車共用道路，兩邊就是商店和住家。','The train shares the street with cars, between shops and houses.','電車と車が道路を共用。両側は商店や民家です。')],
  ],
  tamsui:[
    [600,'R',L('大屯山','Mt Datun','大屯山'),L('右手邊是陽明山國家公園的大屯山群。','On your right are the Datun peaks of Yangmingshan National Park.','右手は陽明山国家公園の大屯山群。')],
    [2300,'L',L('關渡宮與關渡平原','Guandu Temple and plain','関渡宮と関渡平原'),L('河邊的關渡宮是北台灣歷史悠久的媽祖廟，旁邊是關渡自然公園濕地。','Guandu Temple by the river is one of northern Taiwan’s oldest Mazu temples, beside the Guandu Nature Park wetlands.','川沿いの関渡宮は北台湾屈指の古い媽祖廟。隣は関渡自然公園の湿地です。')],
    [2700,'L',L('關渡大橋','Guandu Bridge','関渡大橋'),L('左邊紅色的拱橋橫跨淡水河。','The red arch bridge on your left spans the Tamsui River.','左手の赤いアーチ橋が淡水河をまたぎます。')],
    [3600,'L',L('觀音山','Mt Guanyin','観音山'),L('河對岸的觀音山，遠看像側躺的觀音。','Across the river, Mt Guanyin is said to look like Guanyin lying on her side.','対岸の観音山は、横たわる観音様に見えると言われます。')],
    [4400,'L',L('紅樹林','Mangroves','マングローブ'),L('淡水河口的水筆仔紅樹林自然保留區。','The Kandelia mangrove reserve at the mouth of the Tamsui River.','淡水河口のマングローブ自然保留区。')],
  ],
  airport:[
    [100,'R',L('林口長庚醫院','Linkou Chang Gung Hospital','林口長庚病院'),L('林口台地上最大的醫學中心，直達車也會停這站。','The largest medical centre on the Linkou plateau — express trains stop here too.','林口台地最大の医療センター。直達車も停車します。')],
    [600,'R',L('國道一號','National Freeway 1','国道1号'),L('右手邊並行的是中山高速公路。','Running alongside on your right is the Sun Yat-sen Freeway.','右手に並走するのは中山高速道路。')],
    [1500,'L',L('三井 OUTLET PARK 林口','Mitsui Outlet Park Linkou','三井アウトレットパーク林口'),L('林口站旁的大型購物中心。','A big shopping centre right by Linkou station.','林口駅すぐ横の大型ショッピングモール。')],
    [1900,'F',L('林口台地下坡','Down the Linkou plateau','林口台地の下り坂'),L('從台地一路往下，最陡約 40‰；天氣好時左前方看得到桃園平原。','The line drops off the plateau at up to 40‰; on a clear day the Taoyuan plain opens up ahead left.','台地から一気に下ります（最急約 40‰）。晴れた日は左前方に桃園平野。')],
    [3300,'L',L('桃園的埤塘','Taoyuan’s ponds','桃園のため池'),L('平原上一塊塊的水面是灌溉用的埤塘，桃園因此被稱為「千塘之鄉」。','The patches of water across the plain are irrigation ponds — Taoyuan is the “land of a thousand ponds”.','平野に点在する水面は灌漑用のため池。桃園は「千の溜め池の郷」と呼ばれます。')],
    [4500,'L',L('桃園國際機場','Taoyuan International Airport','桃園国際空港'),L('左前方是機場跑道和塔台，運氣好會看到飛機降落。','The runways and control tower are ahead on the left — with luck you’ll see a plane landing.','左前方に滑走路と管制塔。運が良ければ着陸する飛行機も。')],
    [5260,'F',L('進入地下','Going underground','地下へ'),L('列車鑽進隧道，第一航廈站就在航廈正下方。','The train dives into the tunnel — Terminal 1 station is right under the terminal.','トンネルに入ります。第一ターミナル駅はターミナルの真下です。')],
  ],
  keiyo:[
    [820,'R',L('荒川','Arakawa River','荒川'),L('跨越荒川河口，右邊就是東京灣。','Crossing the mouth of the Arakawa, with Tokyo Bay on your right.','荒川の河口を渡ります。右手は東京湾。')],
    [1700,'R',L('葛西臨海公園摩天輪','Kasai Rinkai Park Ferris wheel','葛西臨海公園の大観覧車'),L('日本最大級的摩天輪之一，晚上會點燈。','One of Japan’s biggest Ferris wheels, lit up at night.','日本最大級の観覧車。夜はライトアップされます。')],
    [2800,'R',L('舞濱的度假區','The Maihama resort','舞浜のリゾート'),L('舞濱一帶是主題樂園與度假飯店。','Maihama is home to theme parks and resort hotels.','舞浜一帯はテーマパークとリゾートホテル。')],
    [3500,'F',L('舊江戶川','Old Edo River','旧江戸川'),L('過了舊江戶川就進入千葉縣浦安市。','Across the Old Edo River you enter Urayasu in Chiba.','旧江戸川を渡ると千葉県浦安市。')],
    [4200,'R',L('新浦安與幕張天際線','Shin-Urayasu and Makuhari','新浦安と幕張の街並み'),L('海埔新生地上的高樓，遠方是幕張新都心。','Towers on reclaimed land, with the Makuhari skyline in the distance.','埋立地の高層住宅、遠くに幕張新都心。')],
  ],
  keikyu:[
    [300,'R',L('八ツ山橋','Yatsuyama Bridge','八ツ山橋'),L('鋼樑橋下是 JR 的一大片軌道，也是東海道的起點附近。','Beneath the steel bridge lies a sea of JR tracks, near the start of the old Tōkaidō.','鉄橋の下は JR の線路群。旧東海道の起点近くです。')],
    [650,'L',L('品川宿','Shinagawa-juku','品川宿'),L('東海道第一個宿場，北品川一帶還留著老街的氣氛。','The first post town on the Tōkaidō — Kita-shinagawa still has an old-street feel.','東海道の最初の宿場。北品川には今も旧街道の雰囲気が残ります。')],
    [1330,'R',L('品川神社','Shinagawa Shrine','品川神社'),L('新馬場旁的神社，有石造鳥居和長長的石階。','A shrine by Shimbamba with a stone torii and a long flight of steps.','新馬場のそばの神社。石の鳥居と長い石段があります。')],
    [1480,'F',L('目黑川','Meguro River','目黒川'),L('目黑川在這附近流入東京灣。','The Meguro River meets Tokyo Bay near here.','目黒川はこの近くで東京湾に注ぎます。')],
    [2800,'R',L('鮫洲的待避','Overtake at Samezu','鮫洲の待避'),L('普通車在這裡等紅色快特從旁邊呼嘯而過。','Locals wait here while red limited expresses roar past.','普通列車はここで赤い快特の通過を待ちます。')],
    [3620,'R',L('濱川砲台遺址','Hamagawa Battery','浜川砲台跡'),L('幕末為了防禦黑船而建的砲台，現在有大砲複製品。','A battery built to face Perry’s Black Ships, now with a replica cannon.','黒船に備えて築かれた砲台。大砲のレプリカがあります。')],
  ],
};

let tourSpeed=1, tourSeen={}, tourCapEl=null, tourBar=null;
function tourUI(){
  if(tourBar) return;
  tourCapEl=document.createElement('div'); tourCapEl.className='tourcap'; tourCapEl.hidden=true; document.querySelector('.stage').appendChild(tourCapEl);
  tourBar=document.createElement('div'); tourBar.className='tourbar'; tourBar.hidden=true;
  tourBar.innerHTML=`<button type="button" class="btn" data-yaw="-1">◀ ${L('看左邊','Left','左')}</button><button type="button" class="btn" data-yaw="0">${L('前方','Ahead','前')}</button><button type="button" class="btn" data-yaw="1">${L('看右邊','Right','右')} ▶</button>
    <button type="button" class="btn" id="tourSpd">⏩ 1×</button><button type="button" class="btn" id="tourShot">📷</button><button type="button" class="btn" id="tourExit">${L('結束觀光','End tour','観光をやめる')}</button>`;
  document.querySelector('.stage').appendChild(tourBar);
  tourBar.querySelectorAll('[data-yaw]').forEach(b=>b.addEventListener('click',()=>tourLook(+b.dataset.yaw)));
  tourBar.querySelector('#tourSpd').addEventListener('click',()=>{ tourSpeed=tourSpeed===1?2:tourSpeed===2?4:1; tourBar.querySelector('#tourSpd').textContent='⏩ '+tourSpeed+'×'; });
  tourBar.querySelector('#tourShot').addEventListener('click',()=>{ if(typeof openPhoto==='function') openPhoto(); });
  tourBar.querySelector('#tourExit').addEventListener('click',()=>{ tourStop(); S=fresh(); renderLever(); setPlaying(false); showOverlay('title'); });
}
function tourLook(d){ R3x.yawT = d*1.15; tourBar && tourBar.querySelectorAll('[data-yaw]').forEach(b=>b.classList.toggle('on',+b.dataset.yaw===d)); }

function startTour(){
  window.__tourNext=true; tourSpeed=1; tourSeen={};
  startGame();
}
function tourBegin(){
  tourUI(); document.body.classList.add('tour'); tourBar.hidden=false; tourLook(0);
  tourBar.querySelector('#tourSpd').textContent='⏩ 1×';
  toast(L('🌄 觀光模式：列車會自動行駛，按「看左邊／看右邊」欣賞風景','🌄 Sightseeing mode: the train drives itself — use Left / Right to look around','🌄 観光モード：自動運転です。「左／右」で景色を眺めましょう'),'good');
  if(typeof unlockAch==='function') unlockAch('tourist');
}
function tourStop(){ document.body.classList.remove('tour'); if(tourBar) tourBar.hidden=true; if(tourCapEl) tourCapEl.hidden=true; R3x.yawT=0; }

/* 自動駕駛：照速限跑，提早煞車，準確停在停車位置 */
function tourDrive(){
  if(!S.tour || S.phase!=='run' || S.paused) return;
  const st=STATIONS[S.next], d=st?st.pos-S.pos:1e9, lim=currentLimit()/3.6;
  let vt=lim-1.2;
  for(const Lm of LIMITS){ if(Lm.s>S.pos){ const dd=Lm.s-S.pos; vt=Math.min(vt,Math.sqrt(Math.max(0,(Lm.v/3.6-1.2))**2+2*0.5*Math.max(0,dd-25))); } }
  if(SIGNAL_POS<1e8 && S.sig.aspect==='R' && SIGNAL_POS>S.pos) vt=Math.min(vt,Math.sqrt(2*0.5*Math.max(0,SIGNAL_POS-S.pos-25)));
  if(st && !S.doors) vt=Math.min(vt, Math.max(0.5, Math.sqrt(2*0.5*Math.max(0,d-3.6))));
  let n;
  if(S.doors || !S.depOK) n=-4;
  else if(st && d<0.9) n=-5;
  else if(S.v>vt+0.25) n=Math.max(-7,-Math.ceil((S.v-vt)*3));
  else if(S.v<vt-0.8) n= S.v<3?3:5;
  else n=0;
  if(S.notch!==n){ S.notch=n; renderLever(); }
  if(st && !S.doors && S.v<0.01 && Math.abs(d)<4 && S.depOK) action();
}
/* 景點解說 */
function tourTickPOI(){
  if(!S.tour) return;
  (TOUR_POI[ROUTE.key]||[]).forEach((p,i)=>{ if(tourSeen[i]) return; if(S.pos>p[0]-260 && S.pos<p[0]+80){ tourSeen[i]=true; tourCaption(p); } });
}
let tourCapTimer=0;
function tourCaption([s,side,name,desc]){
  const arrow=side==='L'?L('◀ 左手邊','◀ On your left','◀ 左手'):side==='R'?L('右手邊 ▶','On your right ▶','右手 ▶'):L('▲ 前方','▲ Ahead','▲ 前方');
  tourCapEl.innerHTML=`<small>${arrow}</small><b>${name}</b><span>${desc}</span>`; tourCapEl.hidden=false; tourCapEl.classList.remove('in'); void tourCapEl.offsetWidth; tourCapEl.classList.add('in');
  clearTimeout(tourCapTimer); tourCapTimer=setTimeout(()=>{ if(tourCapEl) tourCapEl.hidden=true; }, 9000/Math.sqrt(tourSpeed));
  S.tourSeenN=(S.tourSeenN||0)+1;
}
/* 結束畫面 */
function tourEnd(){
  tourStop(); setPlaying(false); S.phase='end'; S.doors=false;
  ov.hidden=false; curOv='tourend'; ov.classList.remove('is-title'); document.body.classList.remove('menu');
  const seen=S.tourSeenN||0, all=(TOUR_POI[ROUTE.key]||[]).length;
  const done=load('cabTours',{}); done[ROUTE.key]=Date.now(); save('cabTours',done);
  if(ROUTE_KEYS.every(k=>done[k]) && typeof unlockAch==='function') unlockAch('tourall');
  ovCard.className='card';
  ovCard.innerHTML=`<p class="eyebrow">${L('觀光行程結束','Sightseeing trip complete','観光ルート終了')}</p><h2>🌄 ${ROUTE.name}</h2>
    <p>${L(`從${stName(STATIONS[0])}到${stName(STATIONS[STATIONS.length-1])}，一路看了 ${seen}/${all} 個景點。`,`From ${stName(STATIONS[0])} to ${stName(STATIONS[STATIONS.length-1])}, you saw ${seen} of ${all} sights.`,`${stName(STATIONS[0])}から${stName(STATIONS[STATIONS.length-1])}まで、${all} か所中 ${seen} か所の名所を見ました。`)}</p>
    <p class="sub">${L('想自己開開看？換成一般模式挑戰停車準度與時刻表吧。','Want to drive yourself? Switch to normal mode and take on the stopping and timetable challenge.','自分で運転したくなったら、通常モードで停止位置と時刻表に挑戦しよう。')}</p>
    ${typeof rideRealHTML==='function'?rideRealHTML():''}
    <div class="btnrow"><button class="btn big" id="tourAgain" type="button">🌄 ${L('再坐一次','Ride again','もう一度乗る')}</button><button class="btn door big" id="ovGo" type="button">${L('換我來開','Drive it myself','自分で運転')}</button></div>
    <button class="btn" id="ovTitle" type="button">${L('回標題畫面','Back to title','タイトルへ')}</button>
    ${typeof promoHTML==='function'?promoHTML(true):''}
    ${typeof adHTML==='function'?adHTML('tour'):''}`;
  if(typeof adFill==='function') setTimeout(adFill,400);
  document.getElementById('tourAgain').onclick=()=>startTour();
  document.getElementById('ovGo').onclick=()=>startGame();
  document.getElementById('ovTitle').onclick=()=>{ S=fresh(); renderLever(); setPlaying(false); showOverlay('title'); };
}
if(typeof ACHS!=='undefined') ACHS.push(
  {id:'tourist', icon:'🌄', name:L('觀光客','Sightseer','観光客'), desc:L('第一次搭觀光列車','Take your first sightseeing trip','初めての観光モード')},
  {id:'tourall', icon:'🧳', name:L('鐵道旅人','Rail traveller','鉄道旅人'), desc:L('每條路線都坐完一趟觀光列車','Take the sightseeing trip on every line','全路線で観光モードを完走'), prog:()=>{ const d=load('cabTours',{}); return [ROUTE_KEYS.filter(k=>d[k]).length, ROUTE_KEYS.length]; }},
);
