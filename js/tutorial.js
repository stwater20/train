/* tutorial.js — 新手教學：依目前路線，帶玩家從起點開到第一站。可以隨時跳過 */
'use strict';

const kmhNow=()=>S.v*3.6;
const distJian=()=>STATIONS[1].pos-S.pos;
/* 每一步：when() 成立才出現（出現時暫停時間並顯示說明），cond() 成立就進下一步 */
let TUT_STEPS=[];
function buildTut(){
  const s0=stName(STATIONS[0]), s1=stName(STATIONS[1]), sEnd=stName(STATIONS[STATIONS.length-1]);
  const L0=LIMITS.find(x=>x.s<=0), lim0=L0?L0.v:LINE_MAX, e0=L0?L0.e:0, coastAt=Math.max(10,lim0-5);
  const c1=CROSSINGS.find(c=>c<STATIONS[1].pos), w=(ROUTE.japan||ROUTE.jpSign)?'笛':'鳴';
  const AL=ROUTE.key==='alishan', JP=!!ROUTE.japan;
  const steps=[
  {title:L('歡迎來到駕駛室','Welcome to the cab','運転台へようこそ'), hi:[],
   text:L(`這是新手教學，會帶你從<b>${s0}</b>開到下一站<b>${s1}</b>。每出現一個新提示，時間會先停住，看完按「繼續」再操作。不想看可以按右上角「跳過教學」。`,
          `This tutorial takes you from <b>${s0}</b> to the next station, <b>${s1}</b>. Each time a new tip appears, time stops; read it, then press “Continue”. You can skip it any time with “Skip tutorial”.`,
          `このチュートリアルでは<b>${s0}</b>から次の<b>${s1}</b>まで運転します。新しいヒントが出るたびに時間が止まるので、読んだら「続ける」を押してください。右上の「スキップ」でいつでも終了できます。`),
   cond:()=>true},
  {title:L('起步：推動力檔','Pull away: apply power','発車：力行'), hi:['#lever','#bUp'],
   text:L('按 <kbd>W</kbd> 或 <kbd>↑</kbd>（手機點「▲ 動力」）把主控制器從 B8 一格一格推到 <b>P3 以上</b>。推過 N 之後才會開始加速。',
          'Press <kbd>W</kbd> or <kbd>↑</kbd> (or tap “▲ Power”) to move the controller notch by notch from B8 to <b>P3 or higher</b>. The train only accelerates once you pass N.',
          '<kbd>W</kbd> か <kbd>↑</kbd>（スマホは「▲ 力行」）でマスコンを B8 から1段ずつ <b>P3 以上</b>へ。N を越えると加速し始めます。'),
   doing:()=>L('主控制器目前 '+nLabel(S.notch)+'，推到 P3 以上','Controller at '+nLabel(S.notch)+' — go to P3 or higher','マスコン '+nLabel(S.notch)+'、P3 以上へ'),
   cond:()=>S.notch>=3},
  {title:L('看限速，回中立滑行','Watch the limit, then coast','制限を見て惰行'), hi:['#roLimit','#hLim'], when:()=>kmhNow()>=lim0*0.5,
   text:L(`出站這段<b>限速 ${lim0} km/h</b>，看「目前限速」那格；速度表上紅色區段就是超速。快到 ${coastAt} km/h 時按 <kbd>N</kbd>（或「回 N 檔」）回中立，讓列車靠慣性滑行。${AL?'這裡是上坡，放 N 會很快掉速，掉太多再推一下動力檔。':''}`,
          `Leaving the station the <b>limit is ${lim0} km/h</b> — see the “Speed limit” box; the red arc on the speedometer is overspeed. Near ${coastAt} km/h press <kbd>N</kbd> (or “Neutral”) and coast.${AL?' This is uphill, so you’ll slow quickly in N — add a little power if you drop too much.':''}`,
          `駅を出てすぐは<b>制限 ${lim0} km/h</b>。「制限速度」欄を確認し、速度計の赤い範囲は超過域です。${coastAt} km/h 近くで <kbd>N</kbd>（「N に戻す」）を押して惰行します。${AL?'上り坂なので N ではすぐ減速します。落ちすぎたら少し力行を。':''}`),
   doing:()=>L('目前 '+Math.round(kmhNow())+' km/h，接近 '+coastAt+' 時按 N','Now '+Math.round(kmhNow())+' km/h — press N near '+coastAt,'現在 '+Math.round(kmhNow())+' km/h、'+coastAt+' 付近で N'),
   cond:()=>(S.notch===0 && kmhNow()>=lim0*0.35) || S.pos>e0+TRAIN_LEN},
  {title:L('解除標：等車尾通過','End of limit: wait for the rear','解除標識：最後尾を待つ'), hi:['#roLimit'], when:()=>S.pos>=e0-10,
   text:L(`路旁畫斜線的牌子是<b>解除標</b>。但列車有 ${TRAIN_LEN} m 長，要等<b>車尾</b>也通過才能加速，「目前限速」下面會倒數剩幾公尺。限速變高之後，再推動力檔加速。`,
          `The board with a diagonal stripe <b>ends the limit</b>. But the train is ${TRAIN_LEN} m long, so wait until the <b>rear</b> has passed too — the countdown is under “Speed limit”. Once the limit goes up, apply power.`,
          `斜線の標識が<b>制限解除</b>です。ただし列車は ${TRAIN_LEN} m あるので、<b>最後尾</b>が過ぎるまで加速は待ちます。残り距離は「制限速度」の下に表示。制限が上がったら力行へ。`),
   doing:()=>currentLimit()<=lim0 && S.pos<=e0+TRAIN_LEN ? L('等車尾通過…','Waiting for the rear to clear…','最後尾の通過待ち…') : L('限速解除了！推動力檔加速','Limit lifted — apply power','制限解除！力行で加速'),
   cond:()=>S.pos>e0+TRAIN_LEN && S.notch>0},
  ];
  if(c1!=null) steps.push(
  {title:L('平交道：記得鳴笛','Level crossing: sound the horn','踏切：警笛を鳴らす'), hi:['#bHorn','#roAhead'], when:()=>S.pos>=c1-310,
   text:L(`前方有<b>平交道</b>。路旁寫著「${w}」的鳴笛標過了之後、到平交道之前，按 <kbd>H</kbd>（或「鳴笛」）提醒路人，通過時 +10 分。`,
          `A <b>level crossing</b> is ahead. After the whistle board marked 「${w}」 and before the crossing, press <kbd>H</kbd> (or “Horn”) to warn people. +10 when you pass.`,
          `前方に<b>踏切</b>があります。「${w}」の標識を過ぎてから踏切までに <kbd>H</kbd>（「警笛」）を押すと、通過時に +10 点。`),
   doing:()=>L('按 H 鳴笛（平交道還有 ','Press H (crossing in ','H で警笛（踏切まで ')+Math.max(0,Math.round(c1-S.pos))+L(' m）',' m)',' m）'),
   cond:()=>S.hornPos>=c1-300 || S.pos>c1});
  steps.push(
  {title:L('準備進站：開始煞車','Approaching: start braking','駅接近：ブレーキ開始'), hi:['#roDist','#bDown'],
   when:()=>distJian()<=Math.max(200, S.v*S.v/(2*0.45)+70),
   text:L(`${s1}站快到了！看「距停車位置」的數字。按 <kbd>S</kbd> 或 <kbd>↓</kbd> 把主控制器拉到<b>煞車檔 B3–B5</b>。煞車有半秒反應時間，寧可早一點煞。${DIFF.guide?'新手模式下，誤差尺上的<b>綠色三角形</b>是照現在煞車力道預計會停的位置。':''}`,
          `${s1} is coming up! Watch “Distance to stop”. Press <kbd>S</kbd> or <kbd>↓</kbd> to bring the controller to <b>B3–B5</b>. Brakes take half a second, so start early.${DIFF.guide?' In Beginner mode the <b>green triangle</b> on the gauge shows where you’ll stop at the current braking.':''}`,
          `${s1}駅が近づきました。「停止位置まで」を見ながら <kbd>S</kbd> か <kbd>↓</kbd> で<b>ブレーキ B3–B5</b> へ。効き始めまで0.5秒あるので早めに。${DIFF.guide?'初心者モードではゲージの<b>緑の三角</b>が、今のブレーキで止まる予測位置です。':''}`),
   doing:()=>L('距停車位置 ','Distance to stop ','停止位置まで ')+Math.round(distJian())+L(' m，拉到煞車檔',' m — apply the brake',' m、ブレーキを'),
   cond:()=>S.notch<0 || S.next>1},
  {title:L('微調：對準停車位置','Fine-tune: hit the mark','微調整：停止位置に合わせる'), hi:['.stopscale'], when:()=>distJian()<Math.min(80,DIFF.gauge) || S.next>1,
   text:L('下方的「停車誤差」量尺：<b>黃色三角形</b>是車頭，中間<b>藍線</b>是月台上藍色「'+CARS()+'」停車位置標。快停時改用 <b>B1–B2</b> 輕輕煞，停在藍線上分數最高，3 m 內還能蓋到車站紀念章。',
          'The stop-error gauge: the <b>yellow triangle</b> is the front of the train and the <b>blue line</b> is the blue “'+CARS()+'” board. Ease off to <b>B1–B2</b> as you stop; landing on the line scores highest, and within 3 m you collect the station stamp.',
          '停止誤差ゲージ：<b>黄色の三角</b>が先頭、<b>青い線</b>がホームの青い「'+CARS()+'」標識です。止まる直前は <b>B1–B2</b> に緩め、線の上で止まると高得点。3 m 以内なら駅スタンプももらえます。'),
   doing:()=>{ const d=distJian(); if(S.v<0.01 && d>15) return L('停太前面了，推 P1 慢慢往前，再拉煞車','Stopped short — creep forward on P1, then brake','手前すぎ。P1 で少し進んでからブレーキ'); return L('還有 ','',' あと ')+d.toFixed(1)+L(' m，慢慢煞停',' m to go — ease to a stop',' m、ゆっくり停車'); },
   cond:()=>(S.v<0.01 && Math.abs(distJian())<=15) || S.next>1},
  {title:L('停妥，開門！','Stopped — open the doors','停車、ドア開！'), hi:['#bDoor'],
   text:L('列車停穩了。按 <kbd>空白鍵</kbd>（或「開門」）讓旅客上下車，10 秒後會自動關門。','The train has stopped. Press <kbd>Space</kbd> (or “Doors”) to let passengers on and off. The doors close by themselves after 10 seconds.','停車しました。<kbd>Space</kbd>（「ドア開」）で乗降させます。10 秒後に自動でドアが閉まります。'),
   doing:()=>L('按空白鍵開門','Press Space to open the doors','Space でドア開'),
   cond:()=>S.doors || S.next>1},
  {title:L('新手教學完成 🎉','Tutorial complete 🎉','チュートリアル完了 🎉'), hi:[],
   text: ROUTE.key==='keikyu' ? L(`接下來自己開到<b>${sEnd}</b>換手吧。北品川一帶是地面區間、平交道很多；鮫洲停車時會等快特從右邊超車。想複習隨時按 <kbd>?</kbd>。`,
                `Drive on to <b>${sEnd}</b>, where your shift hands over. Around Kita-shinagawa you run at street level over many level crossings, and at Samezu you wait while an express overtakes on the right. Press <kbd>?</kbd> any time for the handbook.`,
                `このまま<b>${sEnd}</b>まで運転して交代です。北品川付近は地上区間で踏切が多く、鮫洲では快特の通過待ちをします。<kbd>?</kbd> でいつでも操作説明を。`)
        : ROUTE.key==='keiyo' ? L(`接下來自己開到<b>${sEnd}</b>換手吧。高架雙線、對向列車會從右邊開過；E233 系加速快，記得提早煞車。想複習隨時按 <kbd>?</kbd>。`,
                `Drive on to <b>${sEnd}</b>, where your shift hands over. Elevated double track with oncoming trains on your right; the E233 accelerates hard, so brake early. Press <kbd>?</kbd> any time for the handbook.`,
                `このまま<b>${sEnd}</b>まで運転して交代です。高架複線で対向列車が右側を通過します。E233系は加速が良いので早めのブレーキを。<kbd>?</kbd> でいつでも操作説明を。`)
        : ROUTE.key==='tamsui' ? L(`接下來自己開到終點<b>${sEnd}</b>吧。這是雙線區間，對向列車會從右邊開過；捷運加速快，記得提早煞車，淡水站前限速 35 km/h。想複習隨時按 <kbd>?</kbd>。`,
                `Drive on to <b>${sEnd}</b>. This is double track, so oncoming trains pass on your right. The metro accelerates quickly — brake early, and it’s 35 km/h into Tamsui. Press <kbd>?</kbd> any time for the handbook.`,
                `このまま終点の<b>${sEnd}</b>へ。複線なので対向列車が右側を通過します。加速が良いので早めのブレーキを。淡水駅手前は 35 km/h。<kbd>?</kbd> でいつでも操作説明を。`)
        : JP ? L(`接下來自己開到終點<b>${sEnd}</b>吧。腰越之後是<b>路面併用軌道</b>：電車和汽車共用道路，限速 25 km/h，進江之島前的急彎只有 15 km/h。想複習隨時按 <kbd>?</kbd>。`,
                `Drive on to <b>${sEnd}</b>. After Koshigoe comes <b>street running</b>: you share the road with cars at 25 km/h, and the sharp curve into Enoshima is 15 km/h. Press <kbd>?</kbd> any time for the handbook.`,
                `このまま終点の<b>${sEnd}</b>へ。腰越の先は<b>併用軌道</b>で、車と道路を共有し 25 km/h、江ノ島手前の急カーブは 15 km/h です。<kbd>?</kbd> でいつでも操作説明を。`)
        : AL ? L(`接下來自己開到終點<b>${sEnd}</b>吧。全線都是上坡：停在半路要用 <b>P3 以上</b>才爬得動；急彎會聽到車輪摩擦的尖聲。想複習隨時按 <kbd>?</kbd>。`,
                `Drive on to <b>${sEnd}</b>. It’s uphill all the way: restarting on the slope needs <b>P3 or more</b>, and you’ll hear the wheels squeal on tight curves. Press <kbd>?</kbd> any time for the handbook.`,
                `このまま終点の<b>${sEnd}</b>へ。ずっと上り勾配なので、坂の途中から発車するには <b>P3 以上</b>が必要。急カーブではフランジのきしみ音がします。<kbd>?</kbd> でいつでも操作説明を。`)
        : L(`接下來自己開到終點<b>${sEnd}</b>吧。提醒：志學到平和之間有一架<b>閉塞號誌</b>，紅燈一定要停。想複習隨時按 <kbd>?</kbd> 看操作說明。`,
            `Drive on to the terminus at <b>${sEnd}</b>. Note: there is a <b>block signal</b> between Zhixue and Pinghe — always stop at red. Press <kbd>?</kbd> any time for the handbook.`,
            `このまま終点の<b>${sEnd}</b>まで。志学〜平和間には<b>閉塞信号機</b>があり、赤なら必ず停車。<kbd>?</kbd> でいつでも操作説明を開けます。`),
   cond:()=>true, last:true});
  return steps;
}

const T_={i:0, state:'off'}; // state: off | wait(等 when) | hold(說明卡) | doing
const coachEl=document.createElement('div');
coachEl.className='coach'; coachEl.hidden=true; coachEl.setAttribute('role','status');
document.querySelector('.stage').appendChild(coachEl);

function tutStart(){ TUT_STEPS=buildTut(); T_.i=0; T_.state='wait'; tutTick(); }
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
  coachEl.innerHTML=`<div class="coach-top"><span class="eyebrow">${L('新手教學','Tutorial','チュートリアル')} ${T_.i+1} / ${TUT_STEPS.length}</span>
    <button class="coach-skip" type="button" id="coachSkip">${L('跳過教學','Skip tutorial','スキップ')}</button></div>
    <h3>${st.title}</h3><p>${st.text}</p>
    <div class="coach-dots">${TUT_STEPS.map((_,k)=>`<i class="${k<T_.i?'d':k===T_.i?'c':''}"></i>`).join('')}</div>
    <button class="btn door" type="button" id="coachGo">${st.last?L('開始自由駕駛','Drive on','自由に運転'):L('繼續','Continue','続ける')}<kbd>Enter</kbd></button>`;
  document.getElementById('coachGo').addEventListener('click',tutContinue);
  document.getElementById('coachSkip').addEventListener('click',()=>{ tutStop(); tutMarkDone(); toast(L('已跳過新手教學','Tutorial skipped','チュートリアルをスキップしました')); });
  setTimeout(()=>{ try{ document.getElementById('coachGo').focus({preventScroll:true}); }catch(e){} },30);
}
function tutContinue(){
  if(T_.state!=='hold') return;
  const st=TUT_STEPS[T_.i];
  S.coachHold=false;
  if(st.last){ tutStop(); tutMarkDone(); if(typeof unlockAch==='function') unlockAch('grad'); return; }
  T_.state='doing'; coachEl.className='coach mini'; tutTick();
}
function tutTick(){
  if(T_.state==='off' || S.phase!=='run' || !S.tut) return;
  const st=TUT_STEPS[T_.i];
  if(T_.state==='wait'){ if(!st.when || st.when()) tutShowHold(); return; }
  if(T_.state==='hold') return;
  if(st.cond()){ T_.i++; T_.state='wait'; tutHi([]); coachEl.hidden=true; tutTick(); return; }
  const msg=st.doing ? st.doing() : st.title;
  if(coachEl.dataset.msg!==msg){ coachEl.dataset.msg=msg; coachEl.hidden=false; coachEl.innerHTML=`<span class="eyebrow">${L('教學','Tutorial','チュートリアル')} ${T_.i+1}/${TUT_STEPS.length}</span><b>${msg}</b>`; }
}

/* 每條路線的教學看過（或跳過）一次之後，新手模式就不再自動開始 */
function tutMarkDone(){ try{ localStorage.setItem('cabTut_'+ROUTE.key,'1'); }catch(e){} }
function tutSeen(){ try{ return localStorage.getItem('cabTut_'+ROUTE.key)==='1'; }catch(e){ return true; } }
