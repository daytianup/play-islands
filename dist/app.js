import {projects,notes} from './projects.js';

const $ = selector => document.querySelector(selector);
const icons = {
  map:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16m6-14v16"/>',
  library:'<rect x="3" y="6" width="5" height="14" rx="1"/><path d="M6 3h5v17m3-16 4-1 4 16-4 1z"/>',
  note:'<path d="M4 4.5c3-1 5.5-1 8 .5 2.5-1.5 5-1.5 8-.5V20c-3-1-5.5-1-8 .5-2.5-1.5-5-1.5-8-.5zM12 5v15"/>',
  pointer:'<path d="m5 2.7 13.7 10-6 .7-3.3 6z"/>',
  wheel:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="m4 9 6 2m10-2-6 2m-2 3v6"/>',
  play:'<path d="m7 4 13 8-13 8z"/>',playfill:'<path d="m5 3 15 9-15 9z" fill="currentColor" stroke="none"/>',
  film:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16m10-16v16M3 8h4m-4 7h4m10-7h4m-4 7h4"/>',
  close:'<path d="m5 5 14 14M19 5 5 19"/>'
};
function paintIcons(root=document){for(const n of root.querySelectorAll('i[data-icon]')) n.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'+icons[n.dataset.icon]+'</svg>'}
paintIcons();
const get = id => projects.find(p=>p.id===id);
const time = seconds=>'0:'+String(seconds).padStart(2,'0');
const panel=$('#panel'), body=$('#panel-body'), pins=$('#pins'), announce=$('#announcement');
let screen='', near=null, world=null, driving=false, picked=projects[0], returnView=null;
let seen=new Set();
try {const saved=JSON.parse(localStorage.getItem('play-islands:watched:1')||'[]'); if(Array.isArray(saved))seen=new Set(saved.filter(id=>get(id)))}catch{}
$('#view-count').textContent=seen.size;
function markViewed(id){ if(seen.has(id))return;seen.add(id);$('#view-count').textContent=seen.size;try{localStorage.setItem('play-islands:watched:1',JSON.stringify([...seen]))}catch{}}
function setNav(active){document.querySelectorAll('nav button').forEach(b=>{const match=b.dataset.action===active;b.classList.toggle('nav-active',match);if(match)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')})}
function stopVideo(){const video=body.querySelector('video');if(video){video.pause();video.removeAttribute('src');video.load()}}
function show(kind,label,title,html){stopVideo();screen=kind;$('#eyebrow').textContent=label;$('#panel-title').textContent=title;body.innerHTML=html;paintIcons(body);setNav(kind==='notes'?'notes':'library');if(!panel.open)panel.showModal();panel.scrollTop=0;world?.releaseKeys();$('#close').focus({preventScroll:true})}
function hide(){if(panel.open)panel.close()}
panel.addEventListener('close',()=>{stopVideo();body.replaceChildren();screen='';returnView=null;setNav('home');world?.releaseKeys()});
panel.addEventListener('click',e=>{if(e.target===panel)hide()});$('#close').onclick=hide;
function collection(){returnView=null;show('library','Screening room','作品片单','<div class="filmgrid">'+projects.map(p=>'<button class="filmcard" data-watch="'+p.id+'"><span class="still"><img src="media/'+p.id+'.jpg" alt=""><em>'+time(p.seconds)+'</em></span><strong>'+p.name+'</strong><small>'+p.type+(seen.has(p.id)?' · 已看':'')+'</small></button>').join('')+'</div>')}
function notebook(){returnView=null;show('notes','Studio journal','创作手记','<div class="notes-list">'+notes.map(n=>'<article><img src="media/'+n.games[0]+'.jpg" alt=""><div><h3>'+n.title+'</h3><p>'+n.body+'</p><div class="note-links">'+n.games.map(id=>'<button class="chip" data-watch="'+id+'"><i data-icon="play"></i>'+ (get(id).short||get(id).name)+'</button>').join('')+'</div></div></article>').join('')+'</div>')}
function setFeature(p){picked=p;const f=$('#feature');f.setAttribute('aria-label','播放'+p.name);f.querySelector('img').src='media/'+p.id+'.jpg';f.querySelector('strong').textContent=p.short||p.name;f.querySelector('em').textContent=p.type+' / '+p.seconds+' 秒'}
function play(p){if(!p)return;if(screen==='library'||screen==='notes')returnView=screen;setFeature(p);const back=returnView==='notes'?'notes':'library';show('film',p.english+'  /  '+time(p.seconds),p.name,'<video class="film-player" controls playsinline preload="metadata" poster="media/'+p.id+'.jpg" src="media/'+p.id+'.mp4" aria-label="'+p.name+'实景宣传片"></video><p class="film-description">'+p.story+'</p><div class="film-options"><button class="chip" data-action="'+back+'"><i data-icon="'+(back==='notes'?'note':'library')+'"></i>'+(back==='notes'?'返回手记':'查看片单')+'</button><a class="chip" href="media/'+p.id+'.mp4">单独打开视频</a></div>');const v=body.querySelector('video');v.addEventListener('playing',()=>markViewed(p.id),{once:true});v.play().catch(()=>{})}
function proximity(p){near=p;$('#arrive').hidden=!(p&&driving);if(p)$('#arrive-name').textContent=p.short||p.name;for(const b of pins.children)b.classList.toggle('nearest',driving&&p?.id===b.dataset.pin)}
function mode(on){if(on&&!world){collection();return}driving=on;document.body.classList.toggle('driving',on);$('#drive-hud').hidden=!on;$('#touch-pad').hidden=!on;world?.setDrive(on);if(!on)proximity(null);else{$('#app').focus({preventScroll:true});world?.refreshNear();announce.textContent='已进入驾驶模式。使用方向键或 W A S D 行驶，靠近展馆按回车放映。'}}
document.addEventListener('click',e=>{const el=e.target.closest('[data-action],[data-watch],[data-pin]');if(!el)return;if(el.dataset.watch||el.dataset.pin){play(get(el.dataset.watch||el.dataset.pin));return}switch(el.dataset.action){case'home':hide();mode(false);break;case'drive':mode(true);break;case'library':collection();break;case'notes':notebook();break;case'play-near':play(near);break}});
$('#feature').onclick=()=>play(picked);
const pinMap=new Map();
for(const [i,p] of projects.entries()){const b=document.createElement('button');b.className='pin';b.type='button';b.hidden=true;b.dataset.pin=p.id;b.innerHTML='<i>'+String(i+1).padStart(2,'0')+'</i>'+(p.short||p.name);b.setAttribute('aria-label','播放'+p.name);pins.appendChild(b);pinMap.set(p.id,b)}
const keyMap={w:'ArrowUp',a:'ArrowLeft',s:'ArrowDown',d:'ArrowRight',ArrowUp:'ArrowUp',ArrowLeft:'ArrowLeft',ArrowDown:'ArrowDown',ArrowRight:'ArrowRight'};
document.addEventListener('keydown',e=>{if(!world||panel.open||e.ctrlKey||e.metaKey||e.altKey)return;const key=keyMap[e.key]||keyMap[e.key.toLowerCase()];if(key){e.preventDefault();if(!driving)mode(true);world.key(key,true)}else if(driving&&near&&(e.key==='Enter'||e.key.toLowerCase()==='e')&&!e.repeat&&!e.target.closest('button,a')){e.preventDefault();play(near)}else if(driving&&e.key==='Escape')mode(false)});
document.addEventListener('keyup',e=>{const key=keyMap[e.key]||keyMap[e.key.toLowerCase()];if(key)world?.key(key,false)});
window.addEventListener('blur',()=>world?.releaseKeys());document.addEventListener('visibilitychange',()=>{if(document.hidden)world?.releaseKeys()});
for(const b of document.querySelectorAll('[data-motion]')){b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);world?.key(b.dataset.motion,true)});for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>world?.key(b.dataset.motion,false))}
function fallback(){for(const b of pinMap.values())b.hidden=true;$('#world').classList.add('flat');$('#start').innerHTML='<i data-icon="library"></i>打开作品片单';$('#start').dataset.action='library';$('#intro p').textContent='从片单观看五部游戏实景宣传片，也可以翻阅创作手记。';paintIcons($('#start'));$('.operation').hidden=true;$('#compass').hidden=true;document.body.classList.add('fallback');setNav('home')}
try{const {createWorld}=await import('./world.js');world=createWorld({host:$('#world'),projects,pinMap,proximity,play,blocked:()=>panel.open,onContextLost:()=>{mode(false);world=null;fallback()}})}catch(error){console.warn('3D scene unavailable',error);fallback()}
