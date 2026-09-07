/* ══════════════════════════════════════════════════════════════
   22-table3d.js — THE VIEWPORT. Ported from proto/table-gm.html's
   fifth script, which existed ONLY inside that baked file — it is
   not in proto-src.tgz. Keeping it here means it cannot go missing
   again.

   Drag the wood to pan, wheel to zoom, drag a prop's title bar to
   move that piece of the table. Double right-click locks a scene
   in: the table lays flat and the scene fills the view.

   Changed from proto, and only these:
   · wrapped in an IIFE. proto declared `vp`, `tbl`, `T`, `fit`,
     `apply`, `lock` as top-level consts; in this app's single
     concatenated build those would collide with the shell's own
     names (`fit` especially). Nothing leaks now but `Table3D`.
   · #vp is inside #table-surface, so it measures against that
     element rather than the window.
   · the demo's chat box and its `S`/`render()` calls are gone.
   · the field rungs (window.__field) are left in place but
     guarded — scene.js is a later port, and until it lands the
     ladder simply stops at "locked flat".
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const TW = 2400, TH = 1560, TILT3D = 22, SLAB_TH = 82;

let vp = null, tbl = null, zl = null;
let TILT = TILT3D;
let T = { x: 0, y: 0, k: 0.6 };
let zTop = 200, dg = null;
let lock = null, before = null, anim = null, lockK = 1;

/* the piece layer mirrors this angle, so it has to be readable live */
root.__tilt = () => TILT * Math.PI / 180;

function apply() {
  if (!tbl) return;
  tbl.style.transform =
    `translate(${T.x}px,${T.y}px) scale(${T.k}) rotateX(${TILT}deg)`;
  if (zl) zl.textContent = Math.round(T.k * 100) + '%';
  if (root.__onView) root.__onView();
}

/* where a prop sits on the wood: its own units, its own lift off the surface */
function placeProp(p) {
  p.style.transform =
    `translate3d(${p.dataset.x || 0}px,${p.dataset.y || 0}px,${p.dataset.z || 8}px) ` +
    `rotate(${p.dataset.r || 0}deg)`;
}

/* Fit against the VIEWPORT element, not the window: the shell's rails are
   fixed at the screen edge and #vp stops short of them. And MEASURE the
   result rather than predicting it — perspective magnifies the near half of
   the table, so a flat cos() estimate always ran the front edge off the
   bottom of the screen. (proto's note, and its fix) */
function fitTable() {
  if (!vp) return;
  const VW = vp.clientWidth, VH = vp.clientHeight;
  const c = Math.cos(TILT * Math.PI / 180);
  if (!VW || !VH) return;
  /* Proto's margins were 120/190 because its viewport stopped short of a
     300px chat dock. Full-bleed here, those numbers fill the screen with
     wood: perspective magnifies the near edge, so the slab runs past the
     bottom and both sides and the table stops reading as an OBJECT in a
     room. Leave it room to be one. */
  T = { k: Math.min(VW / (TW + 520), VH / (TH * c + 560)), x: 0, y: 0 };
  apply();
  const slab = doc.querySelector('#tbl .slab');
  if (!slab) return;
  const r = slab.getBoundingClientRect();
  const vr = vp.getBoundingClientRect();
  const eh = SLAB_TH * T.k * Math.sin(TILT * Math.PI / 180);  /* the front edge hangs below */
  T.x += (VW - r.width) / 2 - (r.left - vr.left);
  T.y += (VH - (r.height + eh)) / 2 - (r.top - vr.top);
  apply();
}

/* ══ LOCKING A SCENE IN ═══════════════════════════════════════
   Double right-click a scene and the table lays flat, squares up and fills
   the view — no tilt, no perspective to read around, which is what you
   actually want while running the fight. A gesture, not a button.

   Locked is not frozen: you can still move about and zoom in. Pull far
   enough away and the table tips back into 3D where you left it.        */
function viewFor(prop) {
  const save = { x: T.x, y: T.y, k: T.k, tilt: TILT };
  const VW = vp.clientWidth, VH = vp.clientHeight;
  /* offsetWidth/Height are untransformed table units, so this is measured,
     not predicted — the same trick fitTable() uses, for the same reason. */
  TILT = 0;
  T.k = Math.min(VW / (prop.offsetWidth + 80), VH / (prop.offsetHeight + 80));
  T.x = 0; T.y = 0; apply();
  const r = prop.getBoundingClientRect(), vr = vp.getBoundingClientRect();
  const out = { x: T.x + (VW - r.width) / 2 - (r.left - vr.left),
                y: T.y + (VH - r.height) / 2 - (r.top - vr.top), k: T.k, tilt: 0 };
  T.x = save.x; T.y = save.y; T.k = save.k; TILT = save.tilt; apply();
  return out;
}
function glide(to, done) {
  const from = { x: T.x, y: T.y, k: T.k, tilt: TILT }, t0 = performance.now(), DUR = 420;
  anim = {};
  (function step(now) {
    if (!anim) return;
    const u = Math.min(1, (now - t0) / DUR);
    const e = u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    T.x = from.x + (to.x - from.x) * e; T.y = from.y + (to.y - from.y) * e;
    T.k = from.k + (to.k - from.k) * e; TILT = from.tilt + (to.tilt - from.tilt) * e;
    apply();
    if (u < 1) requestAnimationFrame(step); else { anim = null; if (done) done(); }
  })(t0);
}
/* Coming out of a lock while you are still dragging has to leave the pan
   alone, or the glide and the drag fight each other over T every frame. */
function glideTilt(to) {
  const from = TILT, t0 = performance.now(), DUR = 420;
  anim = { tiltOnly: 1 };
  (function step(now) {
    if (!anim || !anim.tiltOnly) return;
    const u = Math.min(1, (now - t0) / DUR);
    const e = u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    TILT = from + (to - from) * e; apply();
    if (u < 1) requestAnimationFrame(step); else anim = null;
  })(t0);
}

function lockIn(prop) {
  if (lock === prop) return;
  before = { x: T.x, y: T.y, k: T.k, tilt: TILT };
  lock = prop; doc.body.classList.add('locked-in'); prop.classList.add('locked');
  const to = viewFor(prop); lockK = to.k;
  glide(to);
}
function unlock(inPlace) {
  if (!lock) return;
  if (root.__field && root.__field.on()) root.__field.set(false);
  lock.classList.remove('locked'); doc.body.classList.remove('locked-in');
  const back = before || { x: T.x, y: T.y, k: T.k, tilt: TILT3D };
  lock = null; before = null;
  if (inPlace) glideTilt(TILT3D); else glide(back);
}

/* how far past the locked fit you push before you stop looking at the board
   and start standing in it — see proto's note on why this is 3.6 and not 1.5 */
const FIELD_IN = 3.60, OUT_ZOOM = 0.62;
function enterField() {
  if (!lock || !root.__field || root.__field.on()) return;
  root.__field.cam.zoom = 1; root.__field.cam.pan = 0;
  root.__field.set(true);
}
function leaveField() {
  if (!root.__field || !root.__field.on()) return;
  root.__field.set(false);
  T.k = lockK * (FIELD_IN - 0.15); apply();   /* land below the threshold, not on it */
}

const outsideLock = t =>
  lock && !lock.contains(t) && !(t.closest && t.closest('.t3-hud'));
function inBounds() {
  if (!lock) return true;
  if (T.k < lockK * OUT_ZOOM) return false;
  const r = lock.getBoundingClientRect();
  const mx = r.width * 0.35 + 60, my = r.height * 0.35 + 60;
  const vr = vp.getBoundingClientRect();
  const cx = vr.left + vp.clientWidth / 2, cy = vr.top + vp.clientHeight / 2;
  return cx > r.left - mx && cx < r.right + mx && cy > r.top - my && cy < r.bottom + my;
}
function checkBounds() { if (lock && !anim && !inBounds()) unlock(true); }

function grabProp(p, e) {
  p.setPointerCapture(e.pointerId);
  p.classList.add('lift'); p.style.zIndex = ++zTop;
  p.dataset.z = 30; placeProp(p);
  dg = { p, sx: e.clientX, sy: e.clientY, ox: +p.dataset.x, oy: +p.dataset.y };
  e.preventDefault();
}
function startPan(e) {
  vp.classList.add('grabbing');
  dg = { pan: 1, sx: e.clientX, sy: e.clientY, ox: T.x, oy: T.y };
  e.preventDefault();
}

let rc = { t: 0, x: 0, y: 0, p: null };

function mount(host) {
  if (!host || doc.getElementById('vp')) return;

  vp = doc.createElement('div');
  vp.id = 'vp';
  vp.innerHTML =
    `<div id="tbl">
       <div class="floor" style="width:${TW}px;height:${TH}px"></div>
       <div class="slab" style="width:${TW}px;height:${TH}px;--th:${SLAB_TH}px">
         <div class="edge f" style="--th:${SLAB_TH}px"></div>
         <div class="edge b" style="--th:${SLAB_TH}px"></div>
         <div class="edge l" style="--th:${SLAB_TH}px"></div>
         <div class="edge r" style="--th:${SLAB_TH}px"></div>
       </div>
     </div>`;
  host.appendChild(vp);

  const hudL = doc.createElement('div');
  hudL.className = 't3-hud tl';
  hudL.innerHTML = 'The Table<em>drag the wood to pan · wheel to zoom · ' +
                   'drag a title bar to move that piece of the table</em>';
  host.appendChild(hudL);

  const hudR = doc.createElement('div');
  hudR.className = 't3-hud br';
  hudR.innerHTML = `<span class="t3-zl" id="t3-zl">100%</span>
                    <button id="t3-fit">Fit table</button>`;
  host.appendChild(hudR);

  tbl = doc.getElementById('tbl');
  zl = doc.getElementById('t3-zl');

  doc.getElementById('t3-fit').addEventListener('click', () => {
    if (lock) {
      anim = null; lock.classList.remove('locked');
      doc.body.classList.remove('locked-in');
      lock = null; before = null; TILT = TILT3D;
    }
    fitTable();
  });

  wire();
  fitTable();
  /* the shell's rails collapse and re-open, which changes #vp's size without
     a window resize — observe the element, not the window */
  if (typeof root.ResizeObserver === 'function') {
    let first = true;
    new root.ResizeObserver(() => { if (first) { first = false; return; } fitTable(); }).observe(vp);
  }
  root.addEventListener('resize', fitTable);
}

/* Everything but the lock gesture works with the LEFT button alone, because a
   right-click or a middle-drag can be eaten by whatever is hosting the page.
     · drag the wood            -> pan the table
     · drag a prop's title bar  -> pick the prop up and move it
     · double right-click       -> lock that scene in, or release it   */
function wire() {
  vp.addEventListener('contextmenu', e => e.preventDefault());
  vp.addEventListener('auxclick', e => e.preventDefault());

  vp.addEventListener('pointerdown', e => {
    if (anim && !anim.tiltOnly) return;
    /* pressing anywhere off the locked scene lets go of it, whatever you were
       about to do next — which then happens normally, in 3D */
    if (outsideLock(e.target)) { unlock(true); rc = { t: 0, x: 0, y: 0, p: null }; }
    if (e.button === 1) { startPan(e); return; }
    if (e.button === 2) {
      const p = e.target.closest('.prop');
      /* a second right-click on the same scene, in the same spot, shortly
         after the first is the lock gesture; a single one still picks the
         prop up. The window is generous because this is the only way in. */
      const now = performance.now();
      if (p && p === rc.p && now - rc.t < 650 &&
          Math.hypot(e.clientX - rc.x, e.clientY - rc.y) < 12) {
        rc.t = 0; rc.p = null;
        (lock === p) ? unlock(false) : lockIn(p);
        e.preventDefault(); return;
      }
      rc = { t: now, x: e.clientX, y: e.clientY, p };
      if (lock) startPan(e);              /* locked: right-drag moves the camera */
      else if (p) grabProp(p, e);
      return;
    }
    if (e.button !== 0) return;
    const grip = e.target.closest('.grip');
    if (grip && !lock) { const p = grip.closest('.prop'); if (p) { grabProp(p, e); return; } }
    if (!e.target.closest('.prop,.t3-hud')) startPan(e);
  });

  root.addEventListener('pointermove', e => {
    if (!dg) return;
    if (dg.pan) {
      T.x = dg.ox + (e.clientX - dg.sx); T.y = dg.oy + (e.clientY - dg.sy);
      apply(); checkBounds(); return;
    }
    /* the wood is tilted, so vertical pointer travel covers more table than
       horizontal does — divide it back out or the prop lags the cursor */
    const c = Math.max(0.2, Math.cos(TILT * Math.PI / 180));
    dg.p.dataset.x = dg.ox + (e.clientX - dg.sx) / T.k;
    dg.p.dataset.y = dg.oy + (e.clientY - dg.sy) / (T.k * c);
    placeProp(dg.p);
    if (root.TableProps) root.TableProps.dragging(dg.p, e);
  });

  root.addEventListener('pointerup', e => {
    if (dg && dg.p) {
      dg.p.classList.remove('lift');
      dg.p.dataset.z = 8; placeProp(dg.p);
      if (root.TableProps) root.TableProps.dropped(dg.p, e);
    }
    vp.classList.remove('grabbing'); dg = null;
  });

  root.addEventListener('keydown', e => { if (e.key === 'Escape' && lock) unlock(false); });

  vp.addEventListener('wheel', e => {
    e.preventDefault();
    if (root.__field && root.__field.on()) {
      const c = root.__field.cam;
      c.zoom = Math.min(2.8, Math.max(.40, c.zoom * (e.deltaY < 0 ? 1.11 : 1 / 1.11)));
      if (c.zoom <= .42) { leaveField(); return; }
      root.__field.place(); return;
    }
    /* the ceiling leaves room ABOVE the field threshold, or the gesture that
       enters the field is also the gesture that hits the stop */
    const k = Math.min(lock ? 5.2 : 1.8, Math.max(.18, T.k * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
    const vr = vp.getBoundingClientRect();
    const px = e.clientX - vr.left, py = e.clientY - vr.top;
    T.x = px - (px - T.x) * (k / T.k); T.y = py - (py - T.y) * (k / T.k); T.k = k;
    apply();
    if (lock && k >= lockK * FIELD_IN) { enterField(); return; }
    checkBounds();
  }, { passive: false });
}

/* the middle of the wood you are looking at, in table units — so a thing
   taken out of the box lands where you are looking, not at the origin */
function middle() {
  if (!vp) return { x: TW / 2, y: TH / 2 };
  const c = Math.max(0.2, Math.cos(TILT * Math.PI / 180));
  return { x: Math.round((vp.clientWidth / 2 - T.x) / T.k),
           y: Math.round((vp.clientHeight / 2 - T.y) / (T.k * c)) };
}

root.Table3D = { mount, fit: fitTable, place: placeProp, middle,
                 lockIn, unlock, get tilt() { return TILT; } };

})(window, document);
