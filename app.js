'use strict';
const $=s=>document.querySelector(s);
const SC={10:'1',20:'2',30:'3',40:'4',45:'5弱',50:'5強',55:'6弱',60:'6強',70:'7'};
const sc=v=>SC[v]??'不明';
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const CITIES={'久留米 (福岡)':'400040','福岡':'400010','東京':'130010','大阪':'270000','名古屋':'230010','静岡':'220010','札幌':'016010'};
const cfg={city:'400040',...JSON.parse(localStorage.getItem('cfg')||'{}')};
const data={};
const load=async n=>data[n]??=await (await fetch(`data/${n}.json`)).json();
const pad=n=>String(n).padStart(2,'0');
const doy=d=>Math.floor((d-new Date(d.getFullYear(),0,0))/864e5);
let eq=null, wx=null, wxAt=0;

/* ---------- 左の時計 (アナログ+デジタル) ---------- */
$('#ticks').innerHTML=[...Array(12)].map((_,i)=>`<line x1="0" y1="-89" x2="0" y2="-93" transform="rotate(${i*30})"/>`).join('');
let tk='',calKey='';
const T=new URLSearchParams(location.search).get('tod');/* ?tod=day|eve|night でテスト */
const tod=d=>T||(d.getHours()>=5&&d.getHours()<16?'day':d.getHours()>=16&&d.getHours()<19?'eve':'night');
const greet=h=>h>=4&&h<10?'おはようございます':h>=10&&h<17?'こんにちは':h>=17&&h<23?'こんばんは':'おやすみなさい';
const BARS=['今日','今月','今年'];
$('#bars').innerHTML=BARS.map(n=>`<div class="bar"><div class="bh"><span>${n}</span><b>--</b></div><div class="track"><div class="fill"></div></div></div>`).join('');
$('#stars').innerHTML=[...Array(36)].map(()=>`<b style="left:${Math.random()*100}%;top:${Math.random()*70}%;animation-delay:${Math.random()*4}s"></b>`).join('');
function info(d){
 $('#sky').dataset.tod=tod(d);
 if(!document.body.classList.contains('big'))return;
 $('#greet').textContent=greet(d.getHours());
 const y=d.getFullYear(),f=(d.getHours()*3600+d.getMinutes()*60+d.getSeconds())/86400,
  mo=new Date(y,d.getMonth()+1,0).getDate(),tot=(new Date(y+1,0,1)-new Date(y,0,1))/864e5;
 [f,(d.getDate()-1+f)/mo,(doy(d)-1+f)/tot].forEach((p,i)=>{const r=document.querySelectorAll('.bar')[i];
  r.querySelector('.fill').style.width=(p*100)+'%';r.querySelector('b').textContent='残り '+((1-p)*100).toFixed(1)+'%'});
 const k=`${y}-${d.getMonth()}-${d.getDate()}`;
 if(k!==calKey){calKey=k;const first=new Date(y,d.getMonth(),1).getDay();
  $('#cal').innerHTML='<div class="cal">'+[...'日月火水木金土'].map(w=>`<span class="w">${w}</span>`).join('')+'<span></span>'.repeat(first)+
  [...Array(mo)].map((_,i)=>`<i class="${i+1<d.getDate()?'past':i+1===d.getDate()?'now':''}"></i>`).join('')+'</div>'}}
function shoot(){const sk=$('#sky');if(document.body.classList.contains('big')&&sk.dataset.tod==='night'){
 const s=document.createElement('i');s.className='shoot';s.style.cssText=`top:${Math.random()*35}cqh;left:${45+Math.random()*50}cqw`;
 s.onanimationend=()=>s.remove();$('#stars').append(s)}setTimeout(shoot,3000+Math.random()*6000)}
shoot();
function tick(){const d=new Date(),s=d.getSeconds()+d.getMilliseconds()/1000,m=d.getMinutes()+s/60,h=d.getHours()%12+m/60;
 const t=`${pad(d.getHours())}<span class="c">:</span>${pad(d.getMinutes())}`;if(t!==tk){tk=t;$('#time').innerHTML=t}
 $('#date').textContent=d.toLocaleDateString('ja-JP',{month:'long',day:'numeric',weekday:'short'});
 $('#hh').setAttribute('transform',`rotate(${h*30})`);
 $('#mh').setAttribute('transform',`rotate(${m*6})`);
 $('#sd').setAttribute('transform',`rotate(${s*6})`);info(d);}
setInterval(tick,100);tick();

/* ---------- 右のパネル ---------- */
async function getWeather(){
 if(wx&&Date.now()-wxAt<18e5)return wx;
 try{wx=await (await fetch(`https://weather.tsukumijima.net/api/forecast/city/${cfg.city}`)).json();wxAt=Date.now()}catch{}
 return wx;}
const panels=[
 ['地震情報',async()=>{if(!eq)return'<div class="sm">地震情報を取得中…</div>';
   return `<div class="sm">最大震度</div><div class="big">${sc(eq.scale)}</div>
   <div class="mid">${esc(eq.name||'調査中')}</div><div>${eq.mag>0?'M'+eq.mag.toFixed(1):'M不明'}</div><small>${esc(eq.time)}</small>`}],
 ['豆知識',async()=>`<div class="q">${esc(pick(await load('trivia'),doy(new Date())+Math.floor(Date.now()/12e5)))}</div>`],
 ['今日はなんの日？',async()=>{const d=new Date(),t=await load('today'),l=t[`${pad(d.getMonth()+1)}-${pad(d.getDate())}`];
   return `<div class="sm">${d.getMonth()+1}月${d.getDate()}日</div><div class="mid">${esc(l?l.join('・'):'(登録なし)')}</div>`}],
 ['天気',async()=>{const w=await getWeather();const f=w&&w.forecasts&&w.forecasts[0];
   if(!f)return'<div class="sm">天気を取得できません</div>';
   const t=f.temperature.max.celsius??f.temperature.min.celsius;
   return `<img src="${esc(f.image.url)}" alt="${esc(f.telop)}"><div class="big">${t==null?'--':esc(t)}°</div>
   <div>${esc(f.telop)}</div><small>${esc(w.location.city)}・今日の${f.temperature.max.celsius!=null?'最高':'最低'}気温</small>`}],
 ['365日の名言',async()=>{const q=pick(await load('quotes'),doy(new Date())-1);return `<div class="q">「${esc(q.text)}」</div><small>${esc(q.by)}</small>`}],
 ['今日の色',async()=>{const c=pick(await load('colors'),doy(new Date())-1);
   const [r,g,b]=[1,3,5].map(i=>parseInt(c.hex.substr(i,2),16));const dark=(r*299+g*587+b*114)/1000<140;
   return `<div style="background:${c.hex};color:${dark?'#fff':'#111'};padding:5vh 6vw;border-radius:2vh"><div class="mid">${esc(c.name)}</div><small style="color:inherit;opacity:.7">${c.hex}</small></div>`}],
 ['今年の残り',async()=>{const d=new Date(),y=d.getFullYear(),tot=(new Date(y+1,0,1)-new Date(y,0,1))/864e5,n=doy(d),left=tot-n;
   return `<div class="sm">${y}年 あと</div><div class="big">${left}<span class="mid">日</span></div><div class="mid">${(left/tot*100).toFixed(1)}%</div>`}],
 ['一行詩',async()=>`<div class="q" style="text-align:center">${esc(pick(await load('poems'),Math.floor(Math.random()*999)))}</div>`],
 ['clock',async()=>'']
];
const pick=(a,i)=>a[((i%a.length)+a.length)%a.length];
let idx=0,timer;
const dots=$('#dots');panels.forEach(()=>dots.append(document.createElement('b')));
async function show(i,dir=1){
 idx=(i+panels.length)%panels.length;const [k,fn]=panels[idx];
 const big=k==='clock';document.body.classList.toggle('big',big);
 [...dots.children].forEach((b,j)=>b.classList.toggle('on',j===idx));
 $('#label').textContent=big?'':k;
 const st=$('#stage');st.style.setProperty('--dy',dir>0?'5cqh':'-5cqh');
 try{st.innerHTML=await fn()}catch{st.innerHTML='<div class="sm">読み込みエラー</div>'}
 st.classList.remove('in');void st.offsetWidth;st.classList.add('in');
 clearTimeout(timer);timer=setTimeout(()=>show(idx+1,1),20000);}
dots.onclick=e=>{e.stopPropagation();const j=[...dots.children].indexOf(e.target);if(j>=0)show(j,j>idx?1:-1)};
/* 上下スワイプで切替 (上へ=次 / 下へ=前) */
let sx=0,sy=0,sOk=false;
document.addEventListener('pointerdown',e=>{sx=e.clientX;sy=e.clientY;
 sOk=!e.target.closest('dialog,#eew,#start')&&(!!e.target.closest('#right')||document.body.classList.contains('big'))});
document.addEventListener('pointerup',e=>{let dx=e.clientX-sx,dy=e.clientY-sy;
 if(matchMedia('(orientation:portrait)').matches)[dx,dy]=[dy,-dx];/* 縦画面で回転表示中は座標を回転 */
 
 if(sOk&&Math.abs(dy)>50&&Math.abs(dy)>Math.abs(dx)*1.3){const d=dy<0?1:-1;show(idx+d,d)}sOk=false});

/* ---------- 設定 ---------- */
const sel=$('#preset');
Object.entries(CITIES).forEach(([n,c])=>sel.add(new Option(n,c)));
$('#gear').onclick=e=>{e.stopPropagation();$('#city').value=cfg.city;sel.value=CITIES[Object.keys(CITIES).find(k=>CITIES[k]===cfg.city)]??'';$('#dlg').show()};
sel.onchange=()=>$('#city').value=sel.value;
$('#save').onclick=()=>{const c=$('#city').value.trim();if(c){cfg.city=c;localStorage.setItem('cfg',JSON.stringify(cfg));wx=null}};

/* ---------- 地震 (P2P地震情報) ---------- */
async function loadEq(){try{const r=await (await fetch('https://api.p2pquake.net/v2/history?codes=551&limit=1')).json();if(r[0])setEq(r[0])}catch{}}
function setEq(m){const e=m.earthquake;eq={scale:e.maxScale,name:e.hypocenter?.name,mag:e.hypocenter?.magnitude??-1,time:e.time};
 if(panels[idx][0]==='地震情報')show(idx)}
const seen=new Map();let beepTimer,actx;
function beep(){if(!actx)return;const o=actx.createOscillator(),g=actx.createGain();o.frequency.value=880;g.gain.value=.3;o.connect(g).connect(actx.destination);o.start();o.stop(actx.currentTime+.4)}
function onEEW(m){
 if(m.cancelled||m.test)return;
 const e=m.earthquake,h=e.hypocenter||{},areas=m.areas||[];
 const max=Math.max(0,...areas.map(a=>a.scaleTo===99?0:a.scaleTo));
 const id=m.issue?.eventId||m.id,prev=seen.get(id);
 if(prev&&prev.ack&&max<=prev.max)return;
 seen.set(id,{ack:false,max});
 const top=areas.filter(a=>a.scaleTo===max).slice(0,4).map(a=>esc(a.name)).join('・');
 $('#eewbody').innerHTML=`<div>予想最大震度</div><div class="big">${max?sc(max):'不明'}</div>
  <div>震源 ${esc(h.name||'推定中')}　M${h.magnitude>0?h.magnitude:'不明'}</div><div class="sm" style="color:#f3c9c9">${top}</div>`;
 $('#eew').hidden=false;$('#eew').dataset.id=id;
 clearInterval(beepTimer);beep();beepTimer=setInterval(beep,1500);}
$('#ack').onclick=()=>{const s=seen.get($('#eew').dataset.id);if(s)s.ack=true;$('#eew').hidden=true;clearInterval(beepTimer)};
function onMsg(m){if(m.code===556)onEEW(m);else if(m.code===551)setEq(m)}
let ws,wait=3000;
function connect(){ws=new WebSocket('wss://api.p2pquake.net/v2/ws');
 ws.onopen=()=>{wait=3000;$('#conn').classList.add('ok');loadEq()};
 ws.onmessage=e=>{try{onMsg(JSON.parse(e.data))}catch{}};
 ws.onclose=()=>{$('#conn').classList.remove('ok');setTimeout(connect,wait);wait=Math.min(wait*2,30000)};
 ws.onerror=()=>ws.close();}

/* ---------- 起動 ---------- */
$('#start').onclick=async()=>{$('#start').classList.add('gone');setTimeout(()=>$('#start').hidden=true,600);
 try{await document.documentElement.requestFullscreen()}catch{}
 try{await navigator.wakeLock.request('screen')}catch{}
 try{await screen.orientation.lock('landscape')}catch{}
 try{actx=new AudioContext()}catch{}};
document.addEventListener('visibilitychange',async()=>{if(!document.hidden)try{await navigator.wakeLock.request('screen')}catch{}});
loadEq();connect();show(0);
if(location.search.includes('test=eew'))setTimeout(()=>onEEW({cancelled:false,id:'t',earthquake:{hypocenter:{name:'茨城県南部',magnitude:6.7}},
 areas:[{name:'茨城県南部',scaleTo:50},{name:'千葉県北西部',scaleTo:50},{name:'東京都２３区',scaleTo:50}],issue:{eventId:'t'}}),1500);