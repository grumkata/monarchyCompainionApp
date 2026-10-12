/* ══════════════════════════════════════════════════════════════
   27-doom.js — THE DOOM CD.

   grumkata: "make it so when you click the doom cd your camera gets sucked
   in play a few cool animations and run the first level of doom".

   The CD case among the goblin's treasure (27-goblin.js) calls
   DoomCD.enter with where it is on the screen. Then:

     the pull     the dark closes in round the case, streaks of hellfire
                  rush down into it in a spiral, and the case shudders;
     the plunge   you fall through the cover, the streaks tear past you, and
                  the cover fills the screen in a white-hot flash;
     the title    the cover holds, smouldering, while Doom starts behind it;
     the melt     it melts away the way Doom melts one screen into the next,
                  and you are standing in E1M1.

   Leaving (the button, or Quit Game in Doom's own menu) melts Doom down off
   the screen onto the tavern again.

   The game is id Software's own DOOM source (linuxdoom 1.10, GPL-2.0)
   compiled to WebAssembly by Cornelius Diekmann (wasm-fizzbuzz), with the
   free shareware episode built in. It is 6.8 MB, so it is not in the page:
   it is fetched the first time the case is opened, from assets/doom/, as a
   script (a page opened from disk cannot fetch a file). Doom starts on its
   title like it always did; the overlay walks its menu for you (New Game,
   Knee-Deep in the Dead, Hurt Me Plenty) while the cover is still up.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const GW = 640, GH = 400;                    /* the port draws Doom's 320 x 200 at twice the size */
const now = () => performance.now() / 1000;
const clamp = k => Math.max(0, Math.min(1, k));
const easeIn = k => k * k * k, easeOut = k => 1 - Math.pow(1 - k, 3);
const rnd = (a, b) => a + Math.random() * (b - a);
const PULL = 0.95, PLUNGE = 0.55, FLASH = 0.22, TITLE_MIN = 0.8;

/* ══ THE ENGINE ════════════════════════════════════════════════ */
let mod = null;
function load() {
  if (mod) return Promise.resolve(mod);
  return new Promise((ok, no) => {
    const go = () => {
      const b64 = root.__DOOM_WASM;
      if (!b64) { no(new Error('the Doom file is not there')); return; }
      const s = atob(b64), bin = new Uint8Array(s.length);
      for (let i = 0; i < s.length; i++) bin[i] = s.charCodeAt(i);
      root.__DOOM_WASM = null;                                   /* 9 MB of text, not kept */
      WebAssembly.compile(bin).then(m => ok(mod = m), no);
    };
    if (root.__DOOM_WASM) { go(); return; }
    const s = doc.createElement('script');
    s.src = 'assets/doom/doom-wasm.js';
    s.onload = go; s.onerror = () => no(new Error('the Doom file is not there'));
    doc.head.appendChild(s);
  });
}
/* everything the game can reach: a clock, somewhere to draw, somewhere to say things. Nothing else. */
function boot(r) {
  const memory = new WebAssembly.Memory({ initial: 108 });
  const dec = new TextDecoder();
  const say = (p, n) => dec.decode(new Uint8Array(memory.buffer, p, n));
  const imports = {
    js: {
      js_console_log: () => {}, js_stdout: () => {},
      /* it talks a good deal about the sound it has not got; only a real failure is worth hearing about */
      js_stderr: (p, n) => { const m = say(p, n).trim(); if (/error/i.test(m)) console.warn('[doom]', m); },
      js_draw_screen: p => draw(r, memory, p),
      js_milliseconds_since_start: () => (performance.now() - r.ms0),
    },
    env: { memory },
  };
  r.ms0 = performance.now();
  return WebAssembly.instantiate(mod, imports).then(inst => {
    if (run !== r) return;
    r.x = inst.exports;
    r.x.main();
    r.alive = true; r.boot = now() - r.t0;
    /* through its menu, a press at a time, while the cover is still up — and once in, the view made full width
       (Doom starts it a size down, in a frame of green stone) */
    r.script = [[27, 0.25], [13, 0.55], [13, 0.85], [13, 1.15], [61, 1.9]].map(([k, at]) => [k, r.boot + at]);
    r.ready = r.boot + 2.4;                                      /* its own melt into the level done */
  });
}
function draw(r, memory, p) {
  const px = new Uint8ClampedArray(memory.buffer, p, GW * GH * 4);
  r.img.data.set(px);
  if (r.img.data[3] === 0) for (let i = 3; i < r.img.data.length; i += 4) r.img.data[i] = 255;
  r.g.putImageData(r.img, 0, 0);
}

/* ══ GOING IN ══════════════════════════════════════════════════ */
let run = null;
function enter(box, cover, back) {
  if (run) return;
  const el = doc.createElement('div');
  el.id = 'doom-cd';
  el.innerHTML = '<canvas class="dc-game" width="' + GW + '" height="' + GH + '"></canvas><canvas class="dc-fx"></canvas>' +
    '<button class="dc-leave" type="button">Back to the tavern</button>' +
    '<div class="dc-keys"><span><b>Arrows</b> or <b>WASD</b> move</span><span><b>Ctrl</b> or <b>click</b> fires</span>' +
    '<span><b>Space</b> opens doors</span><span><b>Shift</b> runs</span><span><b>Esc</b> is Doom’s own menu</span></div>' +
    '<div class="dc-note"></div>';
  doc.body.appendChild(el);
  const fx = el.querySelector('.dc-fx'), game = el.querySelector('.dc-game');
  const r = run = {
    el, fx, f: fx.getContext('2d'), game, g: game.getContext('2d'), img: null, box, back,
    t0: now(), last: now(), phase: 'pull', cover: new Image(), streaks: [], held: new Set(), script: [], keyUps: [],
  };
  r.img = r.g.createImageData(GW, GH);
  r.cover.src = cover;
  size(r);
  const cx = (box.left + box.right) / 2, cy = (box.top + box.bottom) / 2;
  r.c = { x: cx, y: cy, s: Math.max(24, Math.max(box.right - box.left, box.bottom - box.top)) };
  for (let i = 0; i < 190; i++) r.streaks.push(streak(r, true));
  el.querySelector('.dc-leave').addEventListener('click', () => leave());
  el.addEventListener('pointerdown', e => {
    if (e.target.closest('.dc-leave')) return;
    e.preventDefault();
    if (r.phase === 'play' && e.button === 0) press(r, 157, 0);
  });
  el.addEventListener('pointerup', e => { if (r.phase === 'play' && e.button === 0) press(r, 157, 1); });
  el.addEventListener('wheel', e => { e.preventDefault(); e.stopPropagation(); }, { passive: false });
  el.addEventListener('contextmenu', e => e.preventDefault());
  load().then(() => boot(r)).catch(err => { if (run === r) { r.fail = String(err && err.message || err); } });
  requestAnimationFrame(loop);
}
function size(r) {
  const d = Math.min(root.devicePixelRatio || 1, 2), W = root.innerWidth, H = root.innerHeight;
  r.d = d; r.W = W; r.H = H;
  r.fx.width = Math.round(W * d); r.fx.height = Math.round(H * d);
  /* Doom's own 4:3, as large as it goes */
  const gh = Math.min(H, W * 3 / 4), gw = gh * 4 / 3;
  r.rect = { x: (W - gw) / 2, y: (H - gh) / 2, w: gw, h: gh };
  Object.assign(r.game.style, { left: r.rect.x + 'px', top: r.rect.y + 'px', width: gw + 'px', height: gh + 'px' });
}
root.addEventListener('resize', () => { if (run) size(run); });

/* a streak of fire: on the way in, spiralling down into the case; on the way through, tearing out past you */
function streak(r, fresh) {
  const diag = Math.hypot(r.W, r.H);
  return { a: rnd(0, Math.PI * 2), r: diag * (fresh ? rnd(0.12, 1.05) : rnd(0.75, 1.1)), v: rnd(60, 160), len: rnd(0.06, 0.2),
           w: rnd(0.8, 2.6), hue: Math.random(), spin: rnd(0.6, 1.4) };
}
const FIRE = ['255,236,200', '255,180,90', '255,110,40', '255,70,20'];

function loop() {
  const r = run;
  if (!r) return;
  requestAnimationFrame(loop);
  /* __doomSlow: for looking at it frame by frame (a test sets it; nothing else does) */
  const slow = root.__doomSlow || 1, t = (now() - r.t0) / slow, dt = Math.min(0.05, now() - r.last) / slow;
  r.last = now();
  /* the game runs from the moment it is up, behind the cover, so its menu can be walked */
  if (r.alive) {
    while (r.script.length && t >= r.script[0][1]) { const [k] = r.script.shift(); press(r, k, 0); r.keyUps.push([k, t + 0.08]); }
    while (r.keyUps.length && t >= r.keyUps[0][1]) press(r, r.keyUps.shift()[0], 1);
    try { r.x.doom_loop_step(); } catch (e) { r.alive = false; if (r.phase === 'play') leave(); }
  }
  paint(r, t, dt);
}

/* ══ WHAT IS ON THE SCREEN ═════════════════════════════════════ */
function paint(r, t, dt) {
  const f = r.f, d = r.d, W = r.W, H = r.H;
  f.setTransform(d, 0, 0, d, 0, 0);
  f.clearRect(0, 0, W, H);
  f.imageSmoothingEnabled = false;
  const T = r.rect, title = { x: T.x, y: T.y, s: T.w };           /* the cover, square, across the width of Doom's screen */

  if (r.phase === 'pull') {
    const k = clamp(t / PULL), e = easeIn(k), m = 1 - Math.pow(1 - k, 2), C = r.c;
    /* the dark closing in on the case, from the first moment */
    const diag = Math.hypot(W, H), ro = diag * 0.9 * (1 - m) + C.s * 1.6 * m, ri = ro * (0.18 + 0.3 * (1 - m));
    const gr = f.createRadialGradient(C.x, C.y, ri, C.x, C.y, ro);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,' + (0.45 + 0.55 * clamp(k * 1.6)).toFixed(3) + ')');
    f.fillStyle = gr; f.fillRect(0, 0, W, H);
    if (k > 0.55) { f.fillStyle = 'rgba(0,0,0,' + ((k - 0.55) / 0.45 * 0.9).toFixed(3) + ')'; f.beginPath(); f.rect(0, 0, W, H); f.arc(C.x, C.y, ro * 0.9, 0, Math.PI * 2, true); f.fill(); }
    /* the hellfire glow round it */
    glow(f, C.x, C.y, C.s * (1.2 + 2.2 * e), 0.35 + 0.5 * k);
    /* fire spiralling down into it, faster and faster */
    f.globalCompositeOperation = 'lighter';
    for (const s of r.streaks) {
      s.v += (900 + 2600 * e) * dt;
      s.r -= s.v * dt;
      s.a += s.spin * dt * (1.2 + 260 / Math.max(30, s.r));
      if (s.r < C.s * 0.35) Object.assign(s, streak(r, false));
      line(f, C.x, C.y, s, 1, k);
    }
    f.globalCompositeOperation = 'source-over';
    /* and the case shuddering, swelling */
    const sh = (2 + 9 * e) * (0.5 + 0.5 * Math.sin(t * 61));
    const s = C.s * (1 + 0.3 * e);
    cover(r, C.x - s / 2 + rnd(-sh, sh) * 0.5, C.y - s / 2 + rnd(-sh, sh) * 0.5, s, 1);
    if (k >= 1) { r.phase = 'plunge'; r.p0 = t; }
  } else if (r.phase === 'plunge') {
    const k = clamp((t - r.p0) / PLUNGE), e = easeIn(k), C = r.c;
    f.fillStyle = '#000'; f.fillRect(0, 0, W, H);
    /* through: the streaks come back out of the middle and tear past */
    const vx = C.x + (W / 2 - C.x) * e, vy = C.y + (H / 2 - C.y) * e;
    f.globalCompositeOperation = 'lighter';
    for (const s of r.streaks) {
      if (!s.out) { s.out = true; s.r = rnd(5, 60); s.v = rnd(300, 900); }
      s.v += 5200 * dt; s.r += s.v * dt;
      line(f, vx, vy, s, -1, 1);
    }
    f.globalCompositeOperation = 'source-over';
    /* the cover rushing up to fill the screen, turning square to you as it comes */
    const s0 = C.s * 1.35, s = s0 + (title.s - s0) * e;
    const x = (C.x - s0 / 2) + (title.x - (C.x - s0 / 2)) * e, y = (C.y - s0 / 2) + (title.y - (C.y - s0 / 2)) * e;
    f.save(); f.translate(x + s / 2, y + s / 2); f.rotate((1 - e) * -0.35); f.translate(-(x + s / 2), -(y + s / 2));
    cover(r, x, y, s, 1);
    f.restore();
    if (k >= 1) { r.phase = 'title'; r.p0 = t; }
  } else if (r.phase === 'title') {
    const k = t - r.p0;
    titleCard(r, f, t, k);
    /* white-hot, then red, then gone */
    if (k < FLASH * 2.5) {
      const a = 1 - clamp(k / (FLASH * 2.5));
      f.fillStyle = k < FLASH ? 'rgba(255,248,235,' + a.toFixed(3) + ')' : 'rgba(255,60,20,' + (a * 0.8).toFixed(3) + ')';
      f.fillRect(0, 0, W, H);
    }
    if (r.fail) {
      if (!r.failAt) { r.failAt = t; note(r, 'Doom would not start: ' + r.fail + '.'); }
      if (t - r.failAt > 2.6) leave();
    } else if (r.ready && t >= r.ready && k >= TITLE_MIN) {
      /* snapshot the cover as it is, and melt it */
      const snap = doc.createElement('canvas'); snap.width = r.fx.width; snap.height = r.fx.height;
      snap.getContext('2d').drawImage(r.fx, 0, 0);
      r.melt = melt(snap); r.phase = 'melt'; r.game.style.visibility = 'visible'; r.el.classList.add('dark');
    }
  } else if (r.phase === 'melt' || r.phase === 'out') {
    if (stepMelt(r, f, dt)) {
      if (r.phase === 'melt') { r.phase = 'play'; r.el.classList.add('play'); r.game.focus && r.game.focus(); }
      else finish();
    }
  }
}
/* the cover, drawn square at x, y and s across, with its edge of plastic */
function cover(r, x, y, s, a) {
  const f = r.f;
  f.globalAlpha = a;
  if (r.cover.complete && r.cover.naturalWidth) f.drawImage(r.cover, x, y, s, s);
  else { f.fillStyle = '#5a1206'; f.fillRect(x, y, s, s); }
  f.globalAlpha = 1;
}
function glow(f, x, y, rad, a) {
  const g = f.createRadialGradient(x, y, 0, x, y, rad);
  g.addColorStop(0, 'rgba(255,90,30,' + a.toFixed(3) + ')'); g.addColorStop(0.45, 'rgba(200,30,10,' + (a * 0.45).toFixed(3) + ')');
  g.addColorStop(1, 'rgba(120,0,0,0)');
  f.globalCompositeOperation = 'lighter'; f.fillStyle = g; f.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  f.globalCompositeOperation = 'source-over';
}
function line(f, cx, cy, s, way, k) {
  const ca = Math.cos(s.a), sa = Math.sin(s.a), tail = s.r * s.len * (way > 0 ? 1 : 1.6) + 6;
  const x0 = cx + ca * s.r, y0 = cy + sa * s.r, x1 = cx + ca * (s.r + tail * way), y1 = cy + sa * (s.r + tail * way);
  const c = FIRE[Math.floor(s.hue * FIRE.length)];
  const g = f.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, 'rgba(' + c + ',' + (0.85 * Math.min(1, 0.3 + k)).toFixed(2) + ')'); g.addColorStop(1, 'rgba(' + c + ',0)');
  f.strokeStyle = g; f.lineWidth = s.w; f.lineCap = 'round';
  f.beginPath(); f.moveTo(x0, y0); f.lineTo(x1, y1); f.stroke();
}
/* the cover held on Doom's screen while the game gets going behind it: drifting in, smouldering at the edges */
function titleCard(r, f, t, k) {
  const T = r.rect, W = r.W, H = r.H;
  f.fillStyle = '#000'; f.fillRect(0, 0, W, H);
  f.save();
  f.beginPath(); f.rect(T.x, T.y, T.w, T.h); f.clip();
  const z = 1 + 0.04 * clamp(k / 4), s = T.w * z;
  cover(r, T.x + (T.w - s) / 2, T.y - (s - T.w) * 0.15, s, 1);
  /* the bottom of it burning */
  const g = f.createLinearGradient(0, T.y + T.h * 0.55, 0, T.y + T.h);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.85)');
  f.fillStyle = g; f.fillRect(T.x, T.y, T.w, T.h);
  f.restore();
  glow(f, T.x + T.w / 2, T.y + T.h * 1.05, T.w * 0.6, 0.25 + 0.08 * Math.sin(t * 7) + 0.05 * Math.sin(t * 17));
  /* embers rising off it */
  if (!r.embers) r.embers = [];
  if (Math.random() < 0.6) r.embers.push({ x: rnd(T.x, T.x + T.w), y: T.y + T.h, v: rnd(30, 90), w: rnd(-20, 20), l: rnd(1, 2.2), b: now() });
  f.globalCompositeOperation = 'lighter';
  r.embers = r.embers.filter(e => {
    const a = (now() - e.b) / e.l;
    if (a >= 1) return false;
    const y = e.y - e.v * a * e.l, x = e.x + Math.sin(a * 6 + e.w) * 8 + e.w * a;
    f.fillStyle = 'rgba(255,' + Math.round(120 + 80 * (1 - a)) + ',40,' + ((1 - a) * 0.9).toFixed(2) + ')';
    f.fillRect(x, y, 2, 2);
    return true;
  });
  f.globalCompositeOperation = 'source-over';
}

/* ══ THE MELT ══════════════════════════════════════════════════
   Doom's own screen wipe (f_wipe.c, wipe_doMelt): the old screen cut into
   160 columns, each starting a moment apart from its neighbour, falling
   slowly at first and then fast, at 35 ticks a second, until the new one
   behind is all there is. */
function melt(src) {
  const n = 160, y = new Float32Array(n);
  y[0] = -Math.floor(Math.random() * 16);
  for (let i = 1; i < n; i++) y[i] = Math.max(-15, Math.min(0, y[i - 1] + Math.floor(Math.random() * 3) - 1));
  return { src, y, n, acc: 0 };
}
function stepMelt(r, f, dt) {
  const m = r.melt;
  m.acc += dt * 35;
  let all = true;
  while (m.acc >= 1) {
    m.acc -= 1;
    for (let i = 0; i < m.n; i++) {
      if (m.y[i] < 0) m.y[i]++;
      else if (m.y[i] < 200) m.y[i] = Math.min(200, m.y[i] + (m.y[i] < 16 ? m.y[i] + 1 : 8));
    }
  }
  const W = r.W, H = r.H, cw = m.src.width / m.n;
  f.setTransform(1, 0, 0, 1, 0, 0);
  f.clearRect(0, 0, r.fx.width, r.fx.height);
  for (let i = 0; i < m.n; i++) {
    const dy = Math.max(0, m.y[i]) / 200 * m.src.height;
    if (m.y[i] < 200) all = false;
    if (dy < m.src.height) f.drawImage(m.src, Math.floor(i * cw), 0, Math.ceil(cw), m.src.height - dy, Math.floor(i * cw), dy, Math.ceil(cw), m.src.height - dy);
  }
  return all;
}

/* ══ KEYS ══════════════════════════════════════════════════════
   All of them are Doom's while it is up: nothing on the table hears a key.
   Doom's own controls, plus WASD for the hands that expect it (sent as well
   as the letter, so the cheats still type). */
const SPECIAL = { ArrowLeft: 172, ArrowUp: 173, ArrowRight: 174, ArrowDown: 175, Enter: 13, Escape: 27, Tab: 9, Backspace: 127,
                  ' ': 32, Control: 157, Alt: 184, Shift: 182, '-': 45, '=': 61, '+': 61, ',': 44, '.': 46, Pause: 255 };
const WASD = { w: 173, s: 175, a: 44, d: 46 };
function codes(e) {
  const k = e.key;
  if (SPECIAL[k] != null) return [SPECIAL[k]];
  const fk = /^F(\d{1,2})$/.exec(k);
  if (fk && +fk[1] <= 12) return [186 + +fk[1]];
  if (k.length === 1) { const c = k.toLowerCase(); return WASD[c] ? [c.charCodeAt(0), WASD[c]] : [c.charCodeAt(0)]; }
  return [];
}
function press(r, k, up) {
  if (!r.alive) return;
  if (up) { if (!r.held.has(k)) return; r.held.delete(k); } else r.held.add(k);
  try { r.x.add_browser_event(up ? 1 : 0, k); } catch (e) { r.alive = false; }
}
function onKey(e) {
  const r = run;
  if (!r) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (r.phase !== 'play' || e.repeat) return;
  codes(e).forEach(k => press(r, k, e.type === 'keyup'));
}
root.addEventListener('keydown', onKey, true);
root.addEventListener('keyup', onKey, true);
/* nothing left held down when the window loses the keyboard */
root.addEventListener('blur', () => { const r = run; if (r) [...r.held].forEach(k => press(r, k, 1)); });

/* ══ COMING BACK OUT ═══════════════════════════════════════════ */
function leave() {
  const r = run;
  if (!r || r.phase === 'out') return;
  [...r.held].forEach(k => press(r, k, 1));
  r.alive = false;
  /* the screen as it is now, melted down off the tavern */
  const snap = doc.createElement('canvas'); snap.width = r.fx.width; snap.height = r.fx.height;
  const s = snap.getContext('2d');
  s.fillStyle = '#000'; s.fillRect(0, 0, snap.width, snap.height);
  if (r.phase === 'play' || r.phase === 'melt') {
    s.imageSmoothingEnabled = false;
    s.drawImage(r.game, r.rect.x * r.d, r.rect.y * r.d, r.rect.w * r.d, r.rect.h * r.d);
  } else s.drawImage(r.fx, 0, 0);
  r.melt = melt(snap); r.phase = 'out';
  r.el.classList.remove('play', 'dark'); r.el.classList.add('out');
  r.game.style.visibility = 'hidden';
}
function finish() {
  const r = run;
  run = null;
  r.el.remove();
  if (r.back) r.back();
}
function note(r, text) { const n = r.el.querySelector('.dc-note'); n.textContent = text; n.classList.add('on'); }

root.DoomCD = { enter, leave, get on() { return !!run; } };

})(window, document);
