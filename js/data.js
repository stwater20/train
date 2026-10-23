/* data.js — 路線資料（車站、速限、曲線、平交道、號誌）與共用小工具 */
'use strict';

/* ---------- route data ---------- */
const TRAIN_LEN = 80;
const STATIONS = [
  {name:'花蓮', en:'Hualien',  pos:0},
  {name:'吉安', en:"Ji'an",    pos:1150, leg:95},
  {name:'志學', en:'Zhixue',   pos:2650, leg:120},
  {name:'平和', en:'Pinghe',   pos:3850, leg:115},
  {name:'壽豐', en:'Shoufeng', pos:5550, leg:135},
];
(function(){ let t=0; STATIONS[0].dep=0; for(let i=1;i<STATIONS.length;i++){ t+=STATIONS[i].leg; STATIONS[i].arr=t; t+=15; STATIONS[i].dep=t; } })();
const END = STATIONS[STATIONS.length-1].pos;
const LINE_MAX = 90;
const LIMITS = [
  {s:0,    e:300,  v:45},
  {s:1700, e:2050, v:65},
  {s:2650, e:2900, v:50},
  {s:4300, e:4750, v:70},
  {s:5300, e:5600, v:60},
];
const CURVES = [
  {s:850,  e:1050, k:0.0016},
  {s:1700, e:2050, k:0.0032},
  {s:2250, e:2450, k:-0.0020},
  {s:3150, e:3400, k:0.0018},
  {s:4300, e:4750, k:-0.0030},
  {s:5000, e:5200, k:0.0012},
];
const CROSSINGS = [780, 3120, 4920];
const SIGNAL_POS = 3480;
/* 坡度（‰，正值為上坡）。車站一帶保持水平 */
const GRADES = [
  {s:-800, e:200,  g:0},
  {s:200,  e:900,  g:5},
  {s:900,  e:1250, g:0},
  {s:1250, e:2100, g:8},
  {s:2100, e:2700, g:0},
  {s:2700, e:3300, g:-6},
  {s:3300, e:3950, g:0},
  {s:3950, e:4800, g:10},
  {s:4800, e:5150, g:-4},
  {s:5150, e:END+1200, g:0},
];
function gradeAt(p){ for(const G of GRADES) if(p>=G.s && p<G.e) return G.g; return 0; }
/* 列車平均坡度：取車頭到車尾幾個點平均 */
function trainGrade(p){ let t=0; for(let k=0;k<5;k++) t+=gradeAt(p-k*TRAIN_LEN/4); return t/5; }

/* 天氣與時段 */
const ENVS = {
  morning:{key:'morning', name:'晴天早晨', icon:'☀️', clock:8*3600+12*60,  word:'今天早上'},
  dusk:   {key:'dusk',    name:'黃昏',     icon:'🌇', clock:17*3600+32*60, word:'傍晚'},
  night:  {key:'night',   name:'夜間',     icon:'🌙', clock:20*3600+12*60, word:'今晚', night:true},
  rain:   {key:'rain',    name:'雨天',     icon:'🌧️', clock:8*3600+12*60,  word:'下雨的早上', rain:true},
};
let ENV = ENVS.morning;
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

