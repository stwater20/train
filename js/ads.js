/* ads.js — Google AdSense：只在「休息的時候」顯示（結算畫面、觀光結束、標題的收藏／設定頁、頁面下方說明區）
   駕駛中、暫停畫面、教學中一律不顯示，避免誤觸與遮住操作按鈕。
   發布商 ID 與廣告單元 ID 在 tools/build_pages.py 的 ADSENSE_CLIENT／ADSENSE_SLOT 設定，建置時寫入 window.ADS。 */
'use strict';

const ADCFG = window.ADS || {client:'', slot:''};
const adsOn = () => !!(ADCFG.client && ADCFG.slot) && !(typeof OG_MODE!=='undefined' && OG_MODE);

/* 廣告位置的 HTML；where 用來區分版位（方便之後在 AdSense 後台看成效） */
function adHTML(where){
  if(!adsOn()) return '';
  const slot=(ADCFG.slots && ADCFG.slots[where]) || ADCFG.slot;
  return `<div class="adbox" data-ad="${where}"><small class="adlab">${L('廣告','Advertisement','広告')}</small>
    <ins class="adsbygoogle" style="display:block" data-ad-client="${ADCFG.client}" data-ad-slot="${slot}" data-ad-format="auto" data-full-width-responsive="true"></ins></div>`;
}
/* 新放進畫面、而且看得到（寬度 > 0）的廣告才請求，避免 AdSense 的「availableWidth=0」錯誤 */
function adFill(){
  if(!adsOn()) return;
  if(S && S.phase==='run') return;   // 保險：駕駛中不請求
  document.querySelectorAll('.adbox ins.adsbygoogle:not([data-adsbygoogle-status]):not([data-req])').forEach(el=>{
    if(el.offsetWidth>0){ el.setAttribute('data-req','1'); try{ (window.adsbygoogle=window.adsbygoogle||[]).push({}); }catch(e){} }
  });
}
/* 頁面下方的說明區（不在駕駛中顯示） */
if(adsOn()) document.addEventListener('DOMContentLoaded',()=>{
  const ab=document.querySelector('.about'); if(!ab) return;
  ab.insertAdjacentHTML('afterend', adHTML('about'));
  setTimeout(adFill,1200);
});
