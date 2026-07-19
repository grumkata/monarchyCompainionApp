(function(){
'use strict';

/* ══ CANVAS PARTICLES ══ */
const cvs = document.getElementById('fx-canvas');
const cx2 = cvs.getContext('2d');
let pts = [], raf2 = null;
function resz(){ cvs.width=innerWidth; cvs.height=innerHeight; }
resz(); addEventListener('resize',resz);

function spwn(x,y,o={}){
  const {n=12,cols=['#c8a85a','#8b1a1a','#deca9a'],sp=[1,5],lf=[400,900],sz=[1.5,6]}=o;
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2,s=sp[0]+Math.random()*(sp[1]-sp[0]);
    pts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-Math.random()*1.5,
      sz:sz[0]+Math.random()*(sz[1]-sz[0]),
      col:cols[Math.floor(Math.random()*cols.length)],
      li:1,dc:1/(lf[0]+Math.random()*(lf[1]-lf[0]))*16,
      rot:Math.random()*Math.PI*2,rs:(Math.random()-.5)*.18,g:.06+Math.random()*.07,
      sh:Math.random()>.5?'c':'d'});
  }
  if(!raf2) tick2();
}
function spwnInk(x,y,col='rgba(22,16,10,0.55)'){
  for(let i=0;i<7;i++){
    const a=Math.random()*Math.PI*2,d=4+Math.random()*35;
    pts.push({x:x+Math.cos(a)*d*.3,y:y+Math.sin(a)*d*.3,
      vx:Math.cos(a)*d/16,vy:Math.sin(a)*d/16,
      sz:3+Math.random()*9,col,li:1,dc:.024,rot:Math.random()*Math.PI*2,rs:0,g:.012,sh:'b',sx:.5+Math.random(),sy:.5+Math.random()});
  }
  if(!raf2) tick2();
}
function tick2(){
  cx2.clearRect(0,0,cvs.width,cvs.height);
  pts=pts.filter(p=>p.li>0);
  for(const p of pts){
    p.x+=p.vx;p.y+=p.vy;p.vy+=p.g;p.vx*=.98;p.li-=p.dc;p.rot+=p.rs;
    cx2.save();cx2.globalAlpha=Math.max(0,p.li);cx2.translate(p.x,p.y);cx2.rotate(p.rot);cx2.fillStyle=p.col;
    if(p.sh==='d'){cx2.beginPath();cx2.moveTo(0,-p.sz);cx2.lineTo(p.sz*.6,0);cx2.lineTo(0,p.sz);cx2.lineTo(-p.sz*.6,0);cx2.closePath();cx2.fill();}
    else if(p.sh==='b'){cx2.scale(p.sx||1,p.sy||1);cx2.beginPath();cx2.ellipse(0,0,p.sz,p.sz*.7,0,0,Math.PI*2);cx2.fill();}
    else{cx2.beginPath();cx2.arc(0,0,p.sz,0,Math.PI*2);cx2.fill();}
    cx2.restore();
  }
  raf2=pts.length?requestAnimationFrame(tick2):null;
}

/* ══ FLASH ══ */
function flash(x,y,col,ms=150){
  const el=document.createElement('div');
  el.style.cssText=`position:fixed;inset:0;pointer-events:none;z-index:9995;opacity:1;background:radial-gradient(ellipse at ${(x/innerWidth*100).toFixed(1)}% ${(y/innerHeight*100).toFixed(1)}%,${col} 0%,transparent 55%);transition:opacity ${ms}ms;`;
  document.body.appendChild(el);
  requestAnimationFrame(()=>el.style.opacity='0');
  setTimeout(()=>el.remove(),ms+60);
}

/* ══ AUDIO ══ */
(function() {
  var SOUNDS = {

  };
  var VOL = { pageturn:0.55, clank:0.5, crumble:0.65, hit:0.7, success:0.45, stamp:0.5, candle:0.6, scribble:0.5 };
  var _muted = (_ls.get("monarchy_sfx_muted") === "1");
  var _cache = {};
  function _get(name) {
    if (!_cache[name]) { _cache[name] = new Audio(SOUNDS[name]); _cache[name].volume = VOL[name] !== undefined ? VOL[name] : 0.6; }
    return _cache[name];
  }
  window.sfx = function(name) {
    if (_muted || !SOUNDS[name]) return;
    try { var a = _get(name); a.currentTime = 0; a.play().catch(function(){}); } catch(e) {}
  };
  window.sfxToggleMute = function() {
    _muted = !_muted;
    _ls.set("monarchy_sfx_muted", _muted ? "1" : "0");
    var btn = document.getElementById("sfx-mute-btn");
    if (btn) { btn.textContent = _muted ? "SFX OFF" : "SFX ON"; btn.style.color = _muted ? "#8b1a1a" : "#6b5530"; }
  };
  function injectBtn() {
    var btn = document.createElement("button");
    btn.id = "sfx-mute-btn";
    btn.textContent = _muted ? "SFX OFF" : "SFX ON";
    btn.onclick = window.sfxToggleMute;
    btn.style.cssText = "position:fixed;top:82px;left:14px;z-index:150;background:#1a1208;border:2px solid #2a1c0a;color:" + (_muted ? "#8b1a1a" : "#6b5530") + ";font-family:'Cinzel',serif;font-size:9px;font-weight:700;letter-spacing:.1em;padding:6px 10px;cursor:pointer;transition:all .15s;white-space:nowrap;";
    btn.addEventListener("mouseenter", function(){ this.style.color="#c8a85a"; this.style.borderColor="#c8a85a"; });
    btn.addEventListener("mouseleave", function(){ this.style.color=(_muted?"#8b1a1a":"#6b5530"); this.style.borderColor="#2a1c0a"; });
    document.body.appendChild(btn);
  }
  // Disabled: this button floated on top of the new title screen/table
  // UI and did nothing audible (SOUNDS above has no entries configured).
  // Re-enable by uncommenting below once real SFX are added back.
  // if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", injectBtn); } else { injectBtn(); }
})();

/* ══ EVENTS ══ */
document.addEventListener("click", function(e) {
  var btn = e.target.closest("button"); if (!btn) return;
  if (btn.id === "quicksave-btn") {
    sfx("success");
  } else if (btn.classList.contains("tab-btn")) {
    sfx("pageturn");
  } else if (btn.id === "darkmode-btn") {
    sfx("candle");
  } else if (btn.classList.contains("hp-adj-btn") || btn.classList.contains("vbar-adj-btn")) {
    if (btn.classList.contains("dmg")) { sfx("hit"); } else { sfx("success"); }
  } else if (btn.classList.contains("rm-light") || btn.classList.contains("cond-rm") || btn.classList.contains("bg-opt-rm") || btn.textContent.includes("×") || btn.textContent.includes("✕")) {
    sfx("crumble");
  } else if (btn.classList.contains("add-btn") || btn.classList.contains("add-slot-btn") || btn.classList.contains("add-primary-btn") || btn.classList.contains("pb-confirm-btn") || btn.classList.contains("pb-add-btn")) {
    sfx("scribble");
  } else {
    sfx("pageturn");
  }
});
document.addEventListener("click", function(e) {
  if (e.target.closest(".exh-pip") || e.target.closest(".cond-toggle")) { sfx("stamp"); }
  if (e.target.closest(".bg-pgroup-option")) { sfx("stamp"); }
  if (e.target.closest(".add-primary-btn")) { sfx("scribble"); }
  if (e.target.closest(".skill-btn-light")) { sfx("scribble"); }
  if (e.target.closest(".armor-equip-radio")) { sfx("clank"); }
});
document.addEventListener("input", function(e) {
  if ((e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") &&
      e.target.closest(".skill-prim-score, .skill-sec-score, .skill-ter-score")) {
    sfx("scribble");
  }
});
document.addEventListener("change", function(e) { if (e.target.tagName === "SELECT") sfx("pageturn"); });

/* ══ DUST MOTES ══ */
function mote(){
  const el=document.createElement('div');el.className='dust-mote';
  const sz=1+Math.random()*3,dur=16+Math.random()*22;
  el.style.cssText=`width:${sz}px;height:${sz}px;left:${Math.random()*100}vw;top:${20+Math.random()*75}vh;--dx:${(Math.random()-.5)*180}px;--dy:${-(60+Math.random()*180)}px;--ds:${.3+Math.random()*.7};animation-duration:${dur}s;animation-delay:${Math.random()*-18}s;`;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),(dur+1)*1000);
}
setInterval(mote,1100); for(let i=0;i<10;i++) mote();

/* ══ TRANSFORM .sec ELEMENTS , wrap content in .sec-inner ══ */
function wrapSec(){
  document.querySelectorAll('.sec').forEach(sec=>{
    if(sec.querySelector('.sec-inner')) return; // already done
    const inner=document.createElement('span');
    inner.className='sec-inner';
    // Move all children into inner
    while(sec.firstChild) inner.appendChild(sec.firstChild);
    sec.appendChild(inner);
  });
}
wrapSec();

/* ══ INJECT HEADER ORNAMENT ══ */
document.querySelectorAll('.sheet-header').forEach(h=>{
  if(h.querySelector('.sheet-header-ornament')) return;
  const orn=document.createElement('div');
  orn.className='sheet-header-ornament';
  orn.innerHTML='<div class="header-line"></div><span>✦</span><span>❧</span><span>✦</span><div class="header-line"></div>';
  h.appendChild(orn);
});

/* ══ INJECT SVG ribbon banner behind each sheet header ══ */
function injectHeaderRibbon(){
  document.querySelectorAll('.sheet-header').forEach(h=>{
    if(h.querySelector('.header-ribbon-svg')) return;
    const svgNS='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(svgNS,'svg');
    svg.setAttribute('viewBox','0 0 700 50');
    svg.setAttribute('preserveAspectRatio','none');
    svg.style.cssText='position:relative;z-index:2;width:100%;max-width:700px;display:block;margin:0 auto;opacity:0.55;';
    svg.classList.add('header-ribbon-svg');
    // Ribbon shape
    const path=document.createElementNS(svgNS,'path');
    path.setAttribute('d','M0,25 L30,8 L670,8 L700,25 L670,42 L30,42 Z');
    path.setAttribute('fill','none');
    path.setAttribute('stroke','var(--ink)');
    path.setAttribute('stroke-width','1.5');
    // Inner ribbon line
    const path2=document.createElementNS(svgNS,'path');
    path2.setAttribute('d','M20,25 L40,13 L660,13 L680,25 L660,37 L40,37 Z');
    path2.setAttribute('fill','none');
    path2.setAttribute('stroke','rgba(200,168,90,0.4)');
    path2.setAttribute('stroke-width','0.8');
    // Corner stars
    ['120,25','350,25','580,25'].forEach(pos=>{
      const c=document.createElementNS(svgNS,'text');
      c.setAttribute('x',pos.split(',')[0]);c.setAttribute('y',pos.split(',')[1]);
      c.setAttribute('text-anchor','middle');c.setAttribute('dominant-baseline','middle');
      c.setAttribute('font-size','8');c.setAttribute('fill','rgba(200,168,90,0.5)');
      c.textContent='✦';
      svg.appendChild(c);
    });
    svg.appendChild(path);svg.appendChild(path2);
    h.appendChild(svg);
  });
}
injectHeaderRibbon();

/* ══ SCROLL REVEAL ══ */
function initSR(){
  document.querySelectorAll('.attr-group:not(.sr),.deriv-wrap:not(.sr),.bg-card:not(.sr),.abil-slot:not(.sr),.weapon-card:not(.sr),.armor-card:not(.sr),.bf-wrap:not(.sr),.session-wrap:not(.sr)').forEach(el=>{
    el.classList.add('sr');
    const obs=new IntersectionObserver(en=>{en.forEach(e=>{if(e.isIntersecting){e.target.classList.add('vis');obs.unobserve(e.target);}});},{threshold:.08});
    obs.observe(el);
  });
}
initSR();

/* ══ TAB SWITCH ══ */
const _st=window.showTab;
if(_st) window.showTab=function(){const r=_st.apply(this,arguments);setTimeout(()=>{wrapSec();injectHeaderRibbon();initSR();},60);return r;};

/* ══ INTERCEPTS ══ */
const _qs=window.quickSave;
if(_qs) window.quickSave=function(){sfx('success');return _qs.apply(this,arguments);};
const _td=window.toggleDarkMode;
if(_td) window.toggleDarkMode=function(){sfx('candle');return _td.apply(this,arguments);};

/* ══ LOAD BURST ══ */
setTimeout(()=>{
  spwn(innerWidth/2,90,{n:60,cols:['#ffd700','#ffb84a','#ff8c2a','#fff0b0','#8b1a1a','#ff4444'],sp:[2,12],lf:[1000,2000]});
  flash(innerWidth/2,90,'rgba(255,200,80,0.45)',800);
  sfx("success");
},300);

/* continuous ambient sparkle */
setInterval(()=>{
  if(Math.random()>.6) spwn(Math.random()*innerWidth, Math.random()*innerHeight*.5,
    {n:2,cols:['rgba(255,215,0,0.9)','rgba(255,180,60,0.8)','rgba(255,255,180,1)'],sp:[.1,1.2],lf:[500,1200],sz:[.4,2]});
},350);

/* ══ QoL: KEYBOARD SHORTCUTS ══ */
document.addEventListener('keydown', e => {
  // Ctrl+Z already handled by undo system
  // Ctrl+D = toggle dark mode
  if ((e.ctrlKey||e.metaKey) && e.key === 'd') { e.preventDefault(); if(window.toggleDarkMode) toggleDarkMode(); }
  // Escape = close any open modal/menu
  if (e.key === 'Escape') { if(window.closeMenu) closeMenu(); if(window.closeSaveModal) closeSaveModal(); if(window.closePbModal) closePbModal(); }
  // Ctrl+N = new sheet
  if ((e.ctrlKey||e.metaKey) && e.key === 'n') { e.preventDefault(); if(window.newSheet) newSheet(); }
});

/* ══ QoL: HP DANGER FLASH ══ */
function checkHpDanger() {
  const cur = parseInt(document.getElementById('c-hp-cur')?.value) || 0;
  const max = parseInt(document.getElementById('c-hp-max')?.value) || 0;
  const combatWin = document.querySelector('[data-window-id="combat"]');
  const hpCell = document.querySelector('.vbar-cell');
  if (max > 0 && cur / max <= 0.25 && cur > 0) {
    combatWin && combatWin.classList.add('hp-crit');
    hpCell && hpCell.classList.add('hp-crit-cell');
    document.getElementById('c-hp-cur')?.closest('.vbar-cell')?.classList.add('hp-crit-cell');
  } else {
    combatWin && combatWin.classList.remove('hp-crit');
    document.querySelectorAll('.hp-crit-cell').forEach(el => el.classList.remove('hp-crit-cell'));
  }
}
// Watch the HP fields (current HP lives only in the Combat window now)
['c-hp-cur','c-hp-max'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', checkHpDanger);
});
// Also hook into adjVal, since button clicks don't fire a native 'input' event
const _av = window.adjVal;
if (_av) window.adjVal = function() { const r = _av.apply(this, arguments); setTimeout(checkHpDanger, 50); return r; };
checkHpDanger();

/* ══ QoL: NUMBER INPUT , click to select all ══ */
document.addEventListener('focus', e => {
  if (e.target.type === 'number') setTimeout(() => e.target.select(), 10);
}, true);

/* ══ QoL: AUTO-SAVE indicator update (visual feedback that it's working) ══ */
const dot = document.getElementById('autosave-dot');
if (dot) {
  const _orig = window._triggerAutoSave || window.autoSave;
  // Pulse dot green briefly on any input
  let _dotTimer;
  document.addEventListener('input', () => {
    if (!dot) return;
    clearTimeout(_dotTimer);
    dot.style.background = '#4a9a2a';
    dot.style.boxShadow = '0 0 8px rgba(74,154,42,0.8)';
    _dotTimer = setTimeout(() => {
      dot.style.background = '';
      dot.style.boxShadow = '';
    }, 1200);
  });
}

/* ══ QoL: TOAST for keyboard shortcut hints ══ */
const _origToast = window.showToast;

/* ══ FIX: Move WARD into exh-bar, hide from vitals ══ */
function moveWardToExhBar() {
  const exhBar = document.querySelector('.exh-bar');
  if (!exhBar || exhBar.querySelector('.exh-ward-inline')) return;
  const wardVal = document.getElementById('ward-val');
  const wardType = document.getElementById('ward-type');
  if (!wardVal || !wardType) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'exh-ward-inline';
  wrapper.innerHTML = '<span style="font-family:\'Cinzel\',serif;font-size:7px;letter-spacing:.18em;text-transform:uppercase;opacity:.5;white-space:nowrap;">WARD</span>';

  // Clone the inputs (keep originals hidden in vitals, mirror to exh-bar)
  const vWard = wardVal.closest('.vbar-cell');

  // Actually just move the real inputs
  const valWrap = document.createElement('div');
  valWrap.className = 'vbar-ward-val';
  valWrap.appendChild(wardVal);
  wardType.style.maxWidth = '70px';
  wrapper.appendChild(valWrap);
  wrapper.appendChild(wardType);
  exhBar.appendChild(wrapper);
}

/* ══ FIX: Reflow abil-head , name gets its own line ══ */
function reflowAbilHeads() {
  document.querySelectorAll('.abil-head').forEach(head => {
    if (head.dataset.reflowed) return;
    head.dataset.reflowed = '1';

    // Collect existing children
    const lbl    = head.querySelector('.abil-slot-lbl');
    const nameIn = head.querySelector('input[type=text]');
    const typeSel= head.querySelector('.abil-type-sel');
    const costLbl= head.querySelector('.abil-cost-lbl');
    const rmBtn  = head.querySelector('.abil-rm-slot');

    if (!nameIn) return;

    // Row 1: type selector + cost + remove
    const row1 = document.createElement('div');
    row1.className = 'abil-head-row1';
    if (typeSel) row1.appendChild(typeSel);
    if (costLbl) row1.appendChild(costLbl);
    if (rmBtn)   { rmBtn.style.marginLeft='auto'; row1.appendChild(rmBtn); }

    // Row 2: name input full width
    const row2 = document.createElement('div');
    row2.className = 'abil-head-row2';
    row2.appendChild(nameIn);

    // Clear and rebuild
    head.innerHTML = '';
    head.appendChild(row1);
    head.appendChild(row2);
  });
}

// Run after DOM and after dynamic additions
setTimeout(() => { moveWardToExhBar(); reflowAbilHeads(); }, 200);

// Also patch addAbilSlot to reflow new slots
const _aas = window.addAbilSlot;
if (_aas) window.addAbilSlot = function() {
  const r = _aas.apply(this, arguments);
  setTimeout(reflowAbilHeads, 50);
  return r;
};

})();
