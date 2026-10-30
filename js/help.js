/* help.js — 操作說明的英文與日文版（中文版在 game.js） */
'use strict';

const HELP_EN=`<div class="helphead"><div><p class="eyebrow">Driver's handbook</p><h2>How to drive</h2></div><button class="btn" id="ovClose" type="button" aria-label="Close the handbook">Close</button></div>
<div class="help">
<section><h3>Difficulty, trains and stamps</h3>
  <ul>
    <li><b>🔰 Beginner</b>: relaxed timetable, half penalties, no wheel slip. You get a cue when to brake, and a green triangle on the gauge shows your predicted stop. Your first run on each route starts with a skippable tutorial.</li>
    <li><b>🎯 Pro</b>: real timetable, heavier penalties, ATP steps in at +3 km/h, and the stop gauge only appears in the last 20 m.</li>
    <li><b>Trains</b>: each route has a train to unlock — an A on the Hualien line unlocks the EMU900, the sunrise achievement unlocks steam loco SL-31, and finishing the Enoden in Pro mode unlocks the Type 300.</li>
    <li><b>Station stamps</b>: stop within 3 m to collect that station’s stamp; finishing a route stamps the starting station.</li>
  </ul></section>
<section><h3>Onboard announcements</h3>
  <p>After departure you’ll hear a welcome, an arrival notice before each stop and an apology if you’re running late. Taiwan Railway and the Alishan line announce in Mandarin and English, the Enoden in Japanese and English, with captions on screen. 📻 marks dispatcher radio (captions only).</p></section>
<section><h3>Master controller</h3>
  <div class="chips"><i class="p">P5</i><i class="p">P4</i><i class="p">P3</i><i class="p">P2</i><i class="p">P1</i><i class="n">N</i><i class="b">B1</i><i class="b">B2</i><i class="b">…</i><i class="b">B8</i><i class="e">EB</i></div>
  <ul>
    <li><b>P1–P5 power</b>: higher numbers accelerate harder. Start with P5, then return to N to coast near the limit.</li>
    <li><b>N neutral</b>: no power, no brake. The train slowly loses speed.</li>
    <li><b>B1–B8 brake</b>: higher numbers brake harder. Brakes take about half a second to bite, so start early.</li>
    <li><b>EB emergency brake</b>: the strongest brake. Using it while moving costs 10 points.</li>
  </ul></section>
<section><h3>Controls</h3>
  <div class="tbl"><table><thead><tr><th>Action</th><th>Keyboard</th><th>Touch</th></tr></thead><tbody>
    <tr><td>One notch toward power</td><td><kbd>W</kbd> or <kbd>↑</kbd></td><td>▲ Power</td></tr>
    <tr><td>One notch toward brake (up to B8)</td><td><kbd>S</kbd> or <kbd>↓</kbd></td><td>▼ Brake</td></tr>
    <tr><td>Back to neutral</td><td><kbd>N</kbd></td><td>Neutral</td></tr>
    <tr><td>Emergency brake</td><td><kbd>E</kbd></td><td>Emergency</td></tr>
    <tr><td>Open doors once stopped</td><td><kbd>Space</kbd></td><td>Doors</td></tr>
    <tr><td>Horn</td><td><kbd>H</kbd></td><td>Horn</td></tr>
    <tr><td>Pause</td><td><kbd>P</kbd></td><td>Pause</td></tr>
    <tr><td>Open this handbook</td><td><kbd>?</kbd></td><td>Help</td></tr>
  </tbody></table></div>
  <p>You can also tap a notch on the controller, e.g. tap <b>B4</b> to jump straight to B4.</p></section>
<section><h3>Stopping at a station</h3>
  <ol>
    <li>Watch the “Distance to stop” readout. The platform is on the left.</li>
    <li>Judge your braking distance: from 90 km/h, B8 needs about 300 m and B4 about 600 m.</li>
    <li>From 80 m out, the stop-error gauge appears. The yellow triangle is the front of the train; the blue line is the stop mark.</li>
    <li>Use B1–B2 for the last few metres so the front stops at the blue “${CARS()}” board on the platform.</li>
    <li>Once fully stopped, press <kbd>Space</kbd> to open the doors. They close by themselves after 10 seconds.</li>
  </ol>
  <p>Stop within 0.5 m for <b>+100</b>, 1 m +80, 3 m +55, 8 m +25, 15 m +5. Running more than 15 m past the mark is an <b>overrun, −60</b>. Stopping more than 15 m short means the doors won't open; creep forward.</p></section>
<section><h3>Speed limits</h3>
  <ul>
    <li>White boards with black numbers are <b>speed limits</b>; boards with a diagonal stripe <b>end the limit</b>. Unmarked track allows the line maximum.</li>
    <li>A limit only ends once the <b>rear of the whole train</b> has passed the end board. The panel counts down the remaining metres.</li>
    <li>More than 1 km/h over costs 2 points per second. More than 5 km/h over and the <b>ATP brakes for you and takes 30 points</b>.</li>
  </ul></section>
<section><h3>Signals</h3>
  <ul>
    <li><b>Green</b>: proceed normally.</li>
    <li><b>Yellow</b>: caution, 45 km/h until Pinghe.</li>
    <li><b>Red</b>: a train is ahead. Stop before the signal and wait for it to change. Approaching too fast triggers ATP (−30); passing it costs 150.</li>
  </ul>
  <p>On the Hualien line there is block signal No. 32 between Zhixue and Pinghe. The Alishan line has no signal.</p></section>
<section><h3>JR Keiyō Line</h3>
  <ul>
    <li>Shin-Kiba to Ichikawashiohama on elevated double track along Tokyo Bay. The train actually runs on to Soga — your shift hands over at Ichikawashiohama.</li>
    <li>Ten cars, 200 m long, top speed 100 km/h. The E233 accelerates hard, so brake early. The sea and the Kasai Ferris wheel are on your right.</li>
  </ul></section>
<section><h3>Taipei Metro Tamsui Line</h3>
  <ul>
    <li>Beitou to Tamsui on double track with third-rail power — no overhead wires and no level crossings. In real service it runs automatically; here you drive it in manual mode.</li>
    <li>Six cars, 141 m long, with long platforms. Top speed 80 km/h, 35 km/h into Tamsui. Oncoming trains pass on your right.</li>
  </ul></section>
<section><h3>Enoden</h3>
  <ul>
    <li>The Enoden runs from Inamuragasaki to Enoshima with Sagami Bay on your left. Stations are close together and there are many level crossings; the 「笛」 board is the whistle board.</li>
    <li>From Koshigoe to Enoshima the line runs <b>down the street</b>, sharing the road with cars at 25 km/h; the sharp curve into Enoshima is 15 km/h.</li>
    <li>Platforms are short — barely longer than the train — so stop precisely.</li>
  </ul></section>
<section><h3>Alishan Forest Railway</h3>
  <ul>
    <li>762 mm narrow gauge, diesel locomotive, uphill all the way at up to 62‰. Top speed 30 km/h; sharp curves 15–20 km/h.</li>
    <li>Uphill, coasting in N slows you quickly, so you can brake later for stations. Restarting on a slope needs P3 or more.</li>
    <li>On tight curves you'll hear the wheel flanges squeal against the rail, a classic mountain-railway sound.</li>
  </ul></section>
<section><h3>Gradients</h3>
  <ul>
    <li>Gradient posts on the right show per-mille (‰): 8‰ means 8 m of climb per 1000 m. “Ahead” also warns of changes.</li>
    <li><b>Uphill</b> slows acceleration and coasting; <b>downhill</b> speeds you up even in N, so brake earlier.</li>
  </ul></section>
<section><h3>Weather and time of day</h3>
  <ul>
    <li>Pick the weather and time on the title screen. At night, rely on the headlight to see signals and boards.</li>
    <li><b>Wet rails</b> in the rain: about 15% less braking, and P4–P5 at low speed causes <b>wheel slip</b>. Start with P2–P3.</li>
  </ul></section>
<section><h3>Timekeeping</h3>
  <p>Each station has a scheduled arrival time. Within 5 seconds late is on time, <b>+40</b>; after that you lose 1.5 points per second. Arriving more than 20 seconds early gives only +20.</p></section>
<section><h3>Level crossings</h3>
  <p>300 m before each crossing is a whistle board marked 「鳴」. Press <kbd>H</kbd> between the board and the crossing for <b>+10</b>.</p></section>
<section><h3>Reading the dashboard</h3>
  <ul>
    <li><b>Next station / Distance to stop</b>: where you stop next and how far the front of the train is from the stop mark.</li>
    <li><b>Speed limit</b>: the speed you must keep to now; the red arc on the speedometer is overspeed.</li>
    <li><b>Signal / Ahead</b>: the next signal's aspect and upcoming limits, crossings and gradients.</li>
    <li><b>Master controller</b>: an “actual” notch in brackets means the ATP is braking for you.</li>
    <li><b>Acceleration</b>: blue to the right is accelerating, red to the left is braking.</li>
  </ul></section>
<button class="btn door big" id="ovGo" type="button">Back to driving</button>
</div>`;

const HELP_JA=`<div class="helphead"><div><p class="eyebrow">運転士ハンドブック</p><h2>操作説明</h2></div><button class="btn" id="ovClose" type="button" aria-label="操作説明を閉じる">閉じる</button></div>
<div class="help">
<section><h3>難易度・車両・駅スタンプ</h3>
  <ul>
    <li><b>🔰 初心者</b>：ゆとりダイヤ・減点半分・空転なし。ブレーキ開始の合図が出て、ゲージの緑の三角が停止予測位置を示します。各路線の初回はチュートリアル付き（スキップ可）。</li>
    <li><b>🎯 上級</b>：実ダイヤ・減点増、ATP は +3 km/h で作動、停止誤差ゲージは最後の 20 m だけ表示。</li>
    <li><b>車両</b>：各路線に実績で解除できる車両があります。花東線で A 評価なら EMU900、「祝山のご来光」で蒸気機関車 SL-31、上級モードで江ノ電を完走すると 300形。</li>
    <li><b>駅スタンプ</b>：停止誤差 3 m 以内でその駅のスタンプを獲得。完走すると始発駅のスタンプも押せます。</li>
  </ul></section>
<section><h3>車内放送</h3>
  <p>発車後の案内、到着前の「まもなく」放送、遅れたときのお詫びが流れます。台湾鉄道と阿里山線は中国語と英語、江ノ電は日本語と英語で、画面に字幕も出ます。📻 は指令の無線（字幕のみ）です。</p></section>
<section><h3>マスコン</h3>
  <div class="chips"><i class="p">P5</i><i class="p">P4</i><i class="p">P3</i><i class="p">P2</i><i class="p">P1</i><i class="n">N</i><i class="b">B1</i><i class="b">B2</i><i class="b">…</i><i class="b">B8</i><i class="e">EB</i></div>
  <ul>
    <li><b>P1–P5 力行</b>：数字が大きいほど強く加速。起動は P5、制限速度が近づいたら N で惰行。</li>
    <li><b>N 中立</b>：力行もブレーキもなし。列車は惰性でゆっくり減速します。</li>
    <li><b>B1–B8 ブレーキ</b>：数字が大きいほど強く減速。効き始めまで約0.5秒、早めに操作を。</li>
    <li><b>EB 非常ブレーキ</b>：最も強いブレーキ。走行中に使うと −10 点。</li>
  </ul></section>
<section><h3>操作キー</h3>
  <div class="tbl"><table><thead><tr><th>操作</th><th>キーボード</th><th>タッチ</th></tr></thead><tbody>
    <tr><td>力行側へ1段</td><td><kbd>W</kbd> / <kbd>↑</kbd></td><td>▲ 力行</td></tr>
    <tr><td>ブレーキ側へ1段（B8まで）</td><td><kbd>S</kbd> / <kbd>↓</kbd></td><td>▼ ブレーキ</td></tr>
    <tr><td>中立に戻す</td><td><kbd>N</kbd></td><td>N に戻す</td></tr>
    <tr><td>非常ブレーキ</td><td><kbd>E</kbd></td><td>非常ブレーキ</td></tr>
    <tr><td>停車後にドアを開ける</td><td><kbd>Space</kbd></td><td>ドア</td></tr>
    <tr><td>警笛</td><td><kbd>H</kbd></td><td>警笛</td></tr>
    <tr><td>一時停止</td><td><kbd>P</kbd></td><td>一時停止</td></tr>
    <tr><td>この説明を開く</td><td><kbd>?</kbd></td><td>操作説明</td></tr>
  </tbody></table></div>
  <p>マスコンの段を直接タップしても切り替えられます（例：<b>B4</b> をタップ）。</p></section>
<section><h3>駅での停車</h3>
  <ol>
    <li>「停止位置まで」の距離を確認。ホームは左側です。</li>
    <li>制動距離の目安：90 km/h から B8 で約 300 m、B4 で約 600 m。</li>
    <li>残り 80 m で停止誤差ゲージが出ます。黄色の三角が先頭、青い線が停止位置目標です。</li>
    <li>最後の数メートルは B1–B2 で微調整し、ホームの青い「${CARS()}」標識に先頭を合わせます。</li>
    <li>完全に止まったら <kbd>Space</kbd> でドアを開扉。10 秒後に自動で閉まります。</li>
  </ol>
  <p>誤差 0.5 m 以内 <b>+100</b>、1 m 以内 +80、3 m 以内 +55、8 m 以内 +25、15 m 以内 +5。15 m 以上行き過ぎると<b>通過扱いで −60</b>。15 m 以上手前ではドアが開かないので、少しずつ前進してください。</p></section>
<section><h3>速度制限</h3>
  <ul>
    <li>白地に黒数字の標識が<b>速度制限</b>、斜線入りが<b>制限解除</b>です。標識のない区間は線区の最高速度。</li>
    <li>制限は<b>列車の最後尾</b>が解除標識を過ぎるまで続きます。残り距離はパネルに表示されます。</li>
    <li>1 km/h 超過で毎秒 −2 点。5 km/h 以上超過すると <b>ATP が自動でブレーキをかけ −30 点</b>。</li>
  </ul></section>
<section><h3>信号</h3>
  <ul>
    <li><b>青（進行）</b>：通常どおり運転。</li>
    <li><b>黄（注意）</b>：平和駅まで 45 km/h 以下。</li>
    <li><b>赤（停止）</b>：前方に列車あり。信号の手前で停車して変わるのを待ちます。速すぎると ATP 作動（−30）、冒進は −150。</li>
  </ul>
  <p>花東線の志学〜平和間に第32号閉塞信号機があります。阿里山線には信号機はありません。</p></section>
<section><h3>JR京葉線</h3>
  <ul>
    <li>新木場から市川塩浜まで、東京湾沿いの高架複線。列車は蘇我行きで、市川塩浜で乗務員交代です。</li>
    <li>10両・全長 200 m、最高 100 km/h。E233系は加速が良いので早めのブレーキを。右手に海と葛西臨海公園の観覧車。</li>
  </ul></section>
<section><h3>台北MRT 淡水信義線</h3>
  <ul>
    <li>北投から淡水へ。複線・第三軌条集電で、架線も踏切もありません。実際は自動運転ですが、ここでは手動運転モードで運転します。</li>
    <li>6両・全長 141 m、ホームも長めです。最高 80 km/h、淡水駅手前は 35 km/h。対向列車が右側を通過します。</li>
  </ul></section>
<section><h3>江ノ電</h3>
  <ul>
    <li>江ノ電は稲村ヶ崎から江ノ島へ、左手に相模湾を見ながら走ります。駅間が短く踏切が多いので、「笛」標識で警笛を。</li>
    <li>腰越〜江ノ島は<b>併用軌道</b>。車と道路を共有し 25 km/h、江ノ島駅手前の急カーブは 15 km/h。</li>
    <li>ホームは列車よりわずかに長いだけなので、停止位置は正確に。</li>
  </ul></section>
<section><h3>阿里山森林鉄道</h3>
  <ul>
    <li>軌間 762 mm、ディーゼル機関車。終点まで上り勾配で最急 62‰。最高 30 km/h、急カーブは 15–20 km/h。</li>
    <li>上り坂では N にするとすぐ減速するので、駅へのブレーキは少し遅めでも大丈夫。坂の途中から発車するには P3 以上が必要です。</li>
    <li>急カーブではフランジがレールと擦れるキーンという音がします。登山鉄道ならではの音です。</li>
  </ul></section>
<section><h3>勾配</h3>
  <ul>
    <li>右側の勾配標は千分率（‰）。8‰ は 1000 m 進んで 8 m 上ることを示します。「前方」にも勾配の変化が出ます。</li>
    <li><b>上り坂</b>は加速が鈍り惰行でもすぐ減速、<b>下り坂</b>は N でも加速するので早めにブレーキを。</li>
  </ul></section>
<section><h3>天気と時間帯</h3>
  <ul>
    <li>タイトル画面で天気と時間帯を選べます。夜は前照灯を頼りに信号や標識を確認します。</li>
    <li><b>雨でレールが濡れている</b>と、ブレーキ力が約 15% 低下し、低速で P4–P5 を使うと<b>空転</b>します。起動は P2–P3 で。</li>
  </ul></section>
<section><h3>定時運転</h3>
  <p>各駅に到着予定時刻があります。遅れ 5 秒以内は定時で <b>+40</b>、それ以降は 1 秒ごとに −1.5 点。20 秒以上の早着は +20 のみです。</p></section>
<section><h3>踏切</h3>
  <p>踏切の 300 m 手前に「鳴」の汽笛標識があります。標識を過ぎてから踏切までに <kbd>H</kbd> を押すと <b>+10</b>。</p></section>
<section><h3>計器の見方</h3>
  <ul>
    <li><b>次の駅／停止位置まで</b>：次の停車駅と、先頭から停止位置目標までの距離。</li>
    <li><b>制限速度</b>：いま守るべき速度。速度計の赤い範囲が超過域です。</li>
    <li><b>信号／前方</b>：次の信号の現示と、この先の制限・踏切・勾配。</li>
    <li><b>マスコン</b>：括弧内の「実際」の段は ATP がブレーキをかけていることを示します。</li>
    <li><b>加減速度</b>：右の青は加速、左の赤は減速です。</li>
  </ul></section>
<button class="btn door big" id="ovGo" type="button">運転に戻る</button>
</div>`;
