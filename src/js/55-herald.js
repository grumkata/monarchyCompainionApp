/* ══════════════════════════════════════════════════════════════
   55-herald.js — THE HERALD. Blazon's motion, in one place.

   Persona 5 is as recognisable in motion as it is in a still: the same
   slash, the same splash, the same slam, every time something matters.
   This is Monarchy's version, and every piece of it is heraldry:

     wipe(mid)       THE BEND. Going between the hall and a table, a cloth
                     in your livery is drawn across the screen on the
                     diagonal, with a DANCETTY (zig-zag) gilt edge — a
                     heraldic line of partition — and taken off the same
                     way. While it covers the screen the next place is
                     built behind it, and a sun IN SPLENDOUR turns behind
                     the name of where you are going. A shader, because a
                     zig-zag edge with woven cloth and a diaper lattice
                     behind it is one line of maths per pixel and a
                     nightmare in DOM.
     proclaim(t, o)  THE CRY. A Sable band slammed across the screen on a
                     bend, the words in engraved capitals with an
                     illuminated initial, the splendour turning behind it.
                     For the moments a table should look up: a new round,
                     whose turn it is, a natural twenty.
     burst(x, y)     GILT. Lozenges of gold leaf thrown off a wax seal.

   Everything reads its colours from Blazon's tokens (20-shell.css), so the
   cloth is YOUR livery the moment 42-shell.js has set it.

   Watchers at the bottom connect this to the rest of the app by watching
   the DOM, not by editing other files' logic: the dice log, the combat
   sheet's round and phase, and every wax seal. That is this project's
   normal way of talking across files (PROJECT.md 2.2).

   Reduced motion: a wipe becomes an instant cut and a cry becomes a still
   card that comes and goes without moving.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const reduced = () => root.matchMedia &&
  root.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const easeIn  = t => t * t;          /* quad: the cloth must be moving from the first frame */
const easeOut = t => 1 - Math.pow(1 - t, 3);

/* a token's colour as 0..1 rgb. Custom properties come back from
   getComputedStyle with their var()s already substituted. */
function rgb(v) {
  let m = /^#([0-9a-f]{3})$/i.exec(v);
  if (m) return m[1].split('').map(c => parseInt(c + c, 16) / 255);
  m = /^#([0-9a-f]{6})$/i.exec(v);
  if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255);
  m = /rgba?\(([^)]+)\)/i.exec(v);
  if (m) return m[1].split(',').slice(0, 3).map(n => parseFloat(n) / 255);
  return null;
}
function tok(name, fallback) {
  const v = getComputedStyle(doc.documentElement).getPropertyValue(name).trim();
  return rgb(v) || rgb(fallback);
}

/* ══ THE GL LAYER ══════════════════════════════════════════════
   One canvas, one program, two pictures (the bend and the splendour),
   drawn with a single full-screen triangle. It is made the first time it
   is wanted and kept; if WebGL is not there, a CSS cloth stands in. */
const VS = `
attribute vec2 a;
void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

const FS = `
precision mediump float;
uniform vec2  uRes;
uniform float uT;      /* seconds, for the things that turn */
uniform float uP;      /* progress of the cloth, 0..1 */
uniform float uDir;    /* +1 drawing across, -1 drawing off */
uniform float uMode;   /* 0 the bend, 1 the splendour alone */
uniform float uMark;   /* how much splendour shows behind the name */
uniform vec2  uSpan;   /* where the diagonal starts and ends on this screen */
uniform vec2  uC;      /* the centre, in the same units as p */
uniform vec3  uHouse, uOr, uOrHi, uSable;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

/* A SUN IN SPLENDOUR: rays round a centre, straight and wavy by turns —
   the heraldic rayonny, not a starburst. Returns premultiplied Or. */
vec4 splendour(vec2 p, float amt){
  vec2 q = p - uC;
  float r = length(q);
  float a = atan(q.y, q.x) / 6.28318 + uT * 0.018;
  float n = 22.0;
  float k = fract(a * n);
  float wavy = mod(floor(a * n), 2.0);
  float w = 0.16 + wavy * (0.05 + 0.05 * sin(r * 70.0 - uT * 5.0));
  float ray = smoothstep(w + 0.03, w, abs(k - 0.5));
  float fall = smoothstep(1.25, 0.10, r) * smoothstep(0.05, 0.16, r);
  float al = ray * fall * 0.27 * amt;
  vec3 col = mix(uOr, uOrHi, wavy * 0.6);
  return vec4(col * al, al);
}

vec4 bend(vec2 p){
  const vec2 A = vec2(0.8480, -0.5300);        /* down the bend: dexter chief to sinister base */
  vec2 N = vec2(0.5300, 0.8480);
  float u = (dot(p, A) - uSpan.x) / (uSpan.y - uSpan.x);
  float along = dot(p, N);
  /* DANCETTY: the edge is a zig-zag, a heraldic line, never a straight cut */
  float zig = abs(fract(along * 6.0) - 0.5) * 2.0;
  float edge = zig * 0.05;
  float d;
  if (uDir > 0.0) d = mix(-0.03, 1.30, uP) - (u + edge);
  else            d = (u + edge) - mix(-0.34, 1.12, uP);
  if (d < 0.0) return vec4(0.0);

  /* the cloth: Sable, woven, with a faint diaper of lozenges */
  vec3 col = uSable;
  vec2 q = p * 16.0;
  vec2 g = abs(fract(vec2(q.x + q.y, q.x - q.y) * 0.5) - 0.5);
  col += uOr * smoothstep(0.035, 0.0, min(g.x, g.y)) * 0.07;
  col *= 0.92 + 0.08 * hash(floor(gl_FragCoord.xy / 2.0));
  col *= 0.96 + 0.04 * sin(gl_FragCoord.x * 1.7) * sin(gl_FragCoord.y * 1.7);

  /* behind the edge: a band of your livery, then gilt on the edge itself */
  float house = step(0.024, d) * (1.0 - step(0.19, d));
  vec3 hc = uHouse * (0.86 + 0.14 * sin(along * 90.0));
  col = mix(col, hc, house);
  float gilt = 1.0 - step(0.024, d);
  vec3 gc = mix(uOr, uOrHi, 0.5 + 0.5 * sin(along * 40.0 + uT * 7.0));
  col = mix(col, gc, gilt);

  vec4 o = vec4(col, 1.0) * smoothstep(0.0, 0.003, d);
  if (uMark > 0.0) {
    vec4 s = splendour(p, uMark);
    o.rgb = o.rgb * (1.0 - s.a) + s.rgb;
  }
  return o;
}

void main(){
  vec2 p = gl_FragCoord.xy / uRes.y;
  if (uMode < 0.5) { gl_FragColor = bend(p); return; }
  vec4 s = splendour(p, uP * 0.75);   /* over a lit table the rays need less */
  /* a veil, so the rays read over a bright table */
  float veil = 0.5 * uP * smoothstep(1.5, 0.15, length(p - uC));
  vec4 v = vec4(uSable * veil, veil);
  gl_FragColor = s + v * (1.0 - s.a);
}`;

let gl, canvas, U = {}, glReady = false;
function glUp() {
  if (glReady) return gl;
  if (gl === null) return null;
  canvas = doc.createElement('canvas');
  canvas.id = 'herald-gl';
  canvas.setAttribute('aria-hidden', 'true');
  doc.body.appendChild(canvas);
  gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true,
                                    antialias: false, depth: false }) || null;
  if (!gl) return null;
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
      throw new Error('herald shader: ' + gl.getShaderInfoLog(s));
    return s;
  };
  try {
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    gl.useProgram(pr);
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['uRes', 'uT', 'uP', 'uDir', 'uMode', 'uMark', 'uSpan', 'uC',
     'uHouse', 'uOr', 'uOrHi', 'uSable'].forEach(n => { U[n] = gl.getUniformLocation(pr, n); });
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  } catch (e) {
    console.error(e); gl = null; canvas.remove(); return null;
  }
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); gl = null; glReady = false; });
  glReady = true;
  return gl;
}

/* The cloth is drawn at no more than 1280 px across: it is soft woven
   colour, and a full-resolution pass on a 4K screen buys nothing. */
function fit() {
  const k = Math.min(1, 1280 / Math.max(1, root.innerWidth));
  const w = Math.round(root.innerWidth * k), h = Math.round(root.innerHeight * k);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  gl.viewport(0, 0, w, h);
  return { w, h };
}

function draw(mode, p, dir, mark) {
  if (!glReady) return;
  const { w, h } = fit();
  const asp = w / h;
  /* where the diagonal runs on THIS screen: s = x*0.848 - y*0.530 at the corners */
  const s = [[0, 0], [asp, 0], [0, 1], [asp, 1]].map(([x, y]) => x * 0.848 - y * 0.530);
  gl.uniform2f(U.uRes, w, h);
  gl.uniform1f(U.uT, performance.now() / 1000);
  gl.uniform1f(U.uP, p);
  gl.uniform1f(U.uDir, dir);
  gl.uniform1f(U.uMode, mode);
  gl.uniform1f(U.uMark, mark || 0);
  gl.uniform2f(U.uSpan, Math.min.apply(null, s), Math.max.apply(null, s));
  gl.uniform2f(U.uC, asp / 2, 0.5);
  gl.uniform3fv(U.uHouse, tok('--m-house', '#a3232b'));
  gl.uniform3fv(U.uOr,    tok('--m-or', '#c9a227'));
  gl.uniform3fv(U.uOrHi,  tok('--m-or-hi', '#ecd27a'));
  gl.uniform3fv(U.uSable, tok('--m-sable', '#171310'));
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
function clear() { if (glReady) { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); } }

/* ══ THE DOM LAYER ═════════════════════════════════════════════ */
let host;
function hostUp() {
  if (host) return host;
  host = doc.createElement('div');
  host.id = 'herald';
  host.setAttribute('aria-live', 'polite');
  host.innerHTML = '<div class="hr-veil"></div><div class="hr-card"><b></b><i></i></div>' +
                   '<div class="hr-cry"></div><div class="hr-sparks"></div>';
  doc.body.appendChild(host);
  return host;
}

/* ══ THE BEND ══════════════════════════════════════════════════
   `mid` runs when the screen is fully covered. Its TIMING is set by
   setTimeout, not by animation frames, so a slow or hidden page still
   switches on time — the picture is decoration, the switch is not. */
const COVER = 380, HOLD = 300, UNCOVER = 560;
let wiping = null;
function wipe(mid, o) {
  o = o || {};
  if (reduced() || !doc.body) { mid(); return Promise.resolve(); }
  if (wiping) { wiping.mid = mid; wiping.o = o; return wiping.done; }  /* latest wins */
  const job = wiping = { mid, o };
  const h = hostUp();
  const g = glUp();
  h.classList.add('wiping');
  if (!g) h.classList.add('nogl');
  if (canvas) canvas.classList.add('on');

  let phase = 'cover', t0 = performance.now(), raf = 0;
  const frame = now => {
    const e = now - t0;
    if (phase === 'cover')     draw(0, easeIn(clamp01(e / COVER)), 1, 0);
    else if (phase === 'hold') draw(0, 1, 1, easeOut(clamp01(e / HOLD)));
    else                       draw(0, easeOut(clamp01(e / UNCOVER)), -1,
                                    1 - clamp01(e / (UNCOVER * 0.5)));
    raf = root.requestAnimationFrame(frame);
  };
  if (g) raf = root.requestAnimationFrame(frame);

  job.done = new Promise(res => {
    setTimeout(() => {
      phase = 'hold'; t0 = performance.now();
      const card = h.querySelector('.hr-card');
      card.querySelector('b').textContent = job.o.title || '';
      card.querySelector('i').textContent = job.o.sub || '';
      h.classList.add('carded');
      try { job.mid(); } catch (e) { console.error(e); }
      setTimeout(() => {
        phase = 'off'; t0 = performance.now();
        h.classList.remove('carded');
        h.classList.add('lifting');
        setTimeout(() => {
          root.cancelAnimationFrame(raf); clear();
          if (canvas) canvas.classList.remove('on');
          h.classList.remove('wiping', 'lifting', 'nogl');
          wiping = null;
          res();
        }, UNCOVER + 40);
      }, HOLD);
    }, COVER);
  });
  return job.done;
}

/* ══ THE CRY ═══════════════════════════════════════════════════
   One at a time; a second waits for the first. `tone` is the colour of
   the band's hem: 'house' (your livery), or any tincture name. */
const queue = [];
function proclaim(title, o) {
  if (!title) return;
  queue.push({ title: String(title), o: o || {} });
  if (queue.length === 1) cry();
}
function cry() {
  const it = queue[0]; if (!it) return;
  const h = hostUp(), o = it.o;
  const hold = o.hold || 900;
  const tone = o.tone && o.tone !== 'house' ? 'var(--m-' + o.tone + ')' : 'var(--m-house)';
  const c = h.querySelector('.hr-cry');
  c.innerHTML = '';
  const band = doc.createElement('div');
  band.className = 'hr-band' + (reduced() ? ' still' : '');
  band.style.setProperty('--tone', tone);
  band.style.setProperty('--hold', hold + 'ms');
  const t = doc.createElement('div'); t.className = 'hr-title'; t.textContent = it.title;
  band.appendChild(t);
  if (o.sub) { const s = doc.createElement('div'); s.className = 'hr-sub'; s.textContent = o.sub; band.appendChild(s); }
  c.appendChild(band);
  h.classList.add('crying');

  const total = 380 + hold + 340;
  let raf = 0;
  const g = !wiping && !reduced() && glUp();
  if (g) {
    canvas.classList.add('on');
    const t0 = performance.now();
    const frame = now => {
      const e = now - t0;
      const amt = e < 300 ? easeOut(e / 300) : e > total - 320 ? clamp01((total - e) / 320) : 1;
      draw(1, amt, 1, 0);
      raf = root.requestAnimationFrame(frame);
    };
    raf = root.requestAnimationFrame(frame);
  }
  setTimeout(() => {
    if (raf) root.cancelAnimationFrame(raf);
    if (g && !wiping) { clear(); canvas.classList.remove('on'); }
    h.classList.remove('crying');
    c.innerHTML = '';
    queue.shift();
    cry();
  }, total);
}

/* ══ GILT ══════════════════════════════════════════════════════ */
function burst(x, y, n) {
  if (reduced()) return;
  const box = hostUp().querySelector('.hr-sparks');
  n = n || 16;
  for (let i = 0; i < n; i++) {
    const s = doc.createElement('i');
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.6;
    const r = 46 + Math.random() * 70;
    const size = 4 + Math.random() * 6;
    s.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px`;
    box.appendChild(s);
    const dx = Math.cos(a) * r, dy = Math.sin(a) * r;
    const an = s.animate([
      { transform: 'translate(-50%,-50%) rotate(45deg) scale(1)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 18}px)) rotate(${225 + Math.random() * 180}deg) scale(.2)`, opacity: 0 }
    ], { duration: 520 + Math.random() * 380, easing: 'cubic-bezier(.16,.84,.24,1)' });
    an.onfinish = () => s.remove();
  }
}
function burstOn(el, n) {
  const r = el.getBoundingClientRect();
  if (r.width) burst(r.left + r.width / 2, r.top + r.height / 2, n);
}

/* ══ WATCHERS ══════════════════════════════════════════════════ */

/* every wax seal throws gilt when it is pressed into */
doc.addEventListener('click', e => {
  const seal = e.target.closest && e.target.closest('.seal, .dicebar .droll');
  if (seal) burstOn(seal, seal.classList.contains('droll') ? 12 : 18);
}, true);

/* the dice: a natural twenty or a natural one is cried aloud */
function watchDice() {
  const cb = doc.getElementById('chat-body');
  if (!cb || !root.MutationObserver) return;
  new MutationObserver(list => list.forEach(m => m.addedNodes.forEach(n => {
    if (!n.classList || !n.classList.contains('roll')) return;
    if (n.querySelector('.rdice i.hi'))
      proclaim('Fortune', { sub: 'a natural twenty', tone: 'or', hold: 800 });
    else if (n.querySelector('.rdice i.lo'))
      proclaim('Ill Omen', { sub: 'a natural one', tone: 'gules', hold: 800 });
    const tot = n.querySelector('.rtot');
    if (tot) setTimeout(() => burstOn(tot, 8), 180);
  }))).observe(cb, { childList: true });
}

/* the fight: a new round, and whose turn it is.
   32-combat-app.js writes #round and the .ph classes on every render, so
   this compares against what it last saw and cries only on a real step
   forward — a repaint that changes nothing says nothing. */
const PHASE_TONE = { players: 'house', allies: 'azure', enemies: 'gules' };
function watchCombat() {
  const prop = doc.getElementById('combat-prop');
  const round = doc.getElementById('round');
  if (!prop || !round || !root.MutationObserver) return;
  let seen = null;
  const now = () => {
    const ph = prop.querySelector('.phases .ph.now');
    return { r: parseInt(round.textContent, 10) || 0, p: ph ? ph.textContent.trim() : '' };
  };
  const live = () => doc.body.classList.contains('at-table') && prop.style.display !== 'none';
  const check = () => {
    const n = now();
    if (!seen || !live()) { seen = n; return; }
    if (n.r === seen.r && n.p === seen.p) return;
    const stepped = n.r === seen.r + 1 || (n.r === seen.r && n.p !== seen.p);
    const was = seen; seen = n;
    if (!stepped || !n.p) return;
    const tone = PHASE_TONE[n.p.toLowerCase()] || 'house';
    if (n.r !== was.r)
      proclaim('Round ' + String(n.r).padStart(2, '0'), { sub: n.p.toLowerCase() + ' act first', tone: 'or' });
    else
      proclaim(n.p + ' Act', { sub: 'round ' + n.r, tone, hold: 700 });
  };
  const mo = new MutationObserver(check);
  mo.observe(round, { childList: true, characterData: true, subtree: true });
  const phs = prop.querySelector('.phases');
  if (phs) mo.observe(phs, { attributes: true, subtree: true, attributeFilter: ['class'] });
  /* A scene put down or taken away is not a turn: take what the sheet says
     NOW as the starting point. Not `seen = null` — this observer's callback
     runs AFTER the one above in the same batch (the scene's first render
     lands with its display change), so nulling here threw away the state
     that had just been read, and the first End Turn only re-read it.
     Only the DISPLAY counts — panning rewrites this element's transform
     every frame, and resetting on each of those would do the same. */
  let shown = prop.style.display;
  new MutationObserver(() => {
    if (prop.style.display !== shown) { shown = prop.style.display; seen = now(); }
  }).observe(prop, { attributes: true, attributeFilter: ['style'] });
}

/* the hall's cloth drifts against the pointer: --mx/--my, -1..1, set on
   #screen ALONE (a custom property set on the root would restyle the whole
   document on every mouse move), once per frame at most, and only while a
   cloth is actually down */
function watchDrift() {
  const scr = doc.getElementById('screen');
  if (!scr || reduced()) return;
  let x = 0, y = 0, queued = false;
  root.addEventListener('pointermove', e => {
    if (!scr.classList.contains('on') || scr.classList.contains('paper')) return;
    x = (e.clientX / root.innerWidth) * 2 - 1;
    y = (e.clientY / root.innerHeight) * 2 - 1;
    if (queued) return;
    queued = true;
    root.requestAnimationFrame(() => {
      queued = false;
      scr.style.setProperty('--mx', x.toFixed(3));
      scr.style.setProperty('--my', y.toFixed(3));
    });
  }, { passive: true });
}

function start() { hostUp(); watchDice(); watchCombat(); watchDrift(); }
if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start);
else start();

root.Herald = { wipe, proclaim, burst, burstOn, get busy() { return !!wiping; } };

})(window, document);
