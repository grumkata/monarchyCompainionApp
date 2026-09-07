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
   · the slab, the HUD and the combat sheet are markup in the page
     and dressed by proto's own stylesheet, rather than being built
     here — this file went back to being only the viewport.
   · the demo's chat box is gone.
   · the field rungs (window.__field) are left in place but
     guarded — scene.js is a later port, and until it lands the
     ladder simply stops at "locked flat".
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

/* THE SLAB. proto's was 2400x1560, sized before the combat sheet was measured:
   that sheet is 1180 x 1426, so it filled the table edge to edge with 67px to
   spare and hung off in every view. The table is the room the game needs, so
   it grew. The three boards still meet at 1/3 and 2/3 of the width. */
/* THE TABLE IS ROUND. A square coordinate space with the table inscribed in
   it — so the middle of the space is the middle of the table, which a circle
   very much has and a 2900x2000 rectangle did not. Everything that positions
   a piece still works in these units; only what you SEE changed. */
const TW = 2600, TH = 2600, TILT3D = 22, SLAB_TH = 82;
const CX = TW / 2, CY = TH / 2, RAD = TW / 2;
/* #vp's own perspective, mirrored here because screenToTable has to invert it.
   These two numbers are also in the stylesheet and in the piece layer; all
   three have to agree or pieces land where the pointer is not. */
const PERSP = 2400, ORIGIN_Y = 0.42;

let vp = null, tbl = null, zl = null;
let TILT = TILT3D;
let T = { x: 0, y: 0, k: 0.6 };
let zTop = 200, dg = null, fdrag = null;
let lock = null, before = null, anim = null, lockK = 1;

/* the piece layer mirrors this angle, so it has to be readable live */
root.__tilt = () => TILT * Math.PI / 180;

function apply() {
  if (!tbl) return;
  const m = `translate(${T.x}px,${T.y}px) scale(${T.k}) rotateX(${TILT}deg)`;
  tbl.style.transform = m;
  /* the floor rides with the wood, from its own layer under the table */
  const under = doc.getElementById('tblu');
  if (under) under.style.transform = m;
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
  /* proto's numbers, and they are correct. I widened these to 520/560 on the
     theory that the table should "read as an object in a room" — which shrank
     it to a postage stamp floating in black. #vp already stops short of the
     chat dock (right:300px), so the table gets the room it needs from the
     layout, not from padding the fit. */
  /* ROOM. The fit used to put the slab edge-to-edge with the viewport, so the
     table filled the screen and you never once saw where it ended — which is
     most of what "it doesn't look 3d, it's flat and boring, not like a real
     table you're playing on" was describing. A table you can see the edges of
     is a table; a table that reaches every edge of the screen is a texture. */
  const ROOM = 0.86;
  T = { k: Math.min(VW / (TW + 120), VH / (TH * c + 190)) * ROOM, x: 0, y: 0 };
  apply();
  const slab = doc.querySelector('#tbl .slab');
  if (!slab) return;
  /* MEASURE AND CORRECT, twice: perspective magnifies the near half, so a
     first guess always runs the front edge wider and lower than predicted and
     one pass of centring cannot take that back. */
  const eh = () => SLAB_TH * T.k * Math.sin(TILT * Math.PI / 180);
  for (let i = 0; i < 3; i++) {
    const b = slab.getBoundingClientRect();
    const over = Math.max(b.width / (VW * ROOM), (b.height + eh()) / (VH * ROOM));
    if (over <= 1.002) break;
    T.k /= over; apply();
  }
  const r = slab.getBoundingClientRect();
  const vr = vp.getBoundingClientRect();
  T.x += (VW - r.width) / 2 - (r.left - vr.left);
  T.y += (VH - (r.height + eh())) / 2 - (r.top - vr.top);
  apply();
}

/* Fit the camera so a given prop is fully in view, WITHOUT laying the table
   flat. Locking in is a deliberate gesture and stays one; this is just "the
   thing I put down is on screen", which is what was missing when a scene was
   fitted to the slab and the slab overflows the viewport by design. */
function frame(prop, pad) {
  if (!vp || !prop) return;
  pad = pad == null ? 70 : pad;
  const VW = vp.clientWidth, VH = vp.clientHeight;
  const c = Math.cos(TILT * Math.PI / 180);

  /* MEASURE, DO NOT PREDICT — the same lesson fit() already carries. A first
     guess from offsetHeight * cos(tilt) is always short, because perspective
     magnifies the near half of the table, so the far edge of a tall sheet
     ended up off the top of the screen. Guess, measure what it really is,
     correct by the ratio. Converges in one pass. */
  T.k = Math.min(VW / (prop.offsetWidth + pad * 2),
                 VH / (prop.offsetHeight * c + pad * 2));
  T.x = 0; T.y = 0; apply();

  for (let i = 0; i < 2; i++) {
    const r = prop.getBoundingClientRect();
    const over = Math.max(r.width / (VW - pad * 2), r.height / (VH - pad * 2));
    if (over <= 1.001) break;
    T.k /= over; apply();
  }

  const r = prop.getBoundingClientRect(), vr = vp.getBoundingClientRect();
  T.x += (VW - r.width) / 2 - (r.left - vr.left);
  T.y += (VH - r.height) / 2 - (r.top - vr.top);
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
const FIELD_IN = 3.60, OUT_ZOOM = 0.44;
function enterField() {
  if (!lock || !root.__field || root.__field.on()) return;
  const c = root.__field.cam;
  c.zoom = 1; c.pan = 0; c.look = -1.0;   /* arrive facing down the line, every time */
  root.__field.set(true);
}
function leaveField() {
  if (!root.__field || !root.__field.on()) return;
  root.__field.set(false);
  T.k = lockK * (FIELD_IN - 0.15); apply();   /* land below the threshold, not on it */
}

/* ── ARE WE STANDING IN IT ────────────────────────────────────
   The immersive field is a full-screen canvas that is NOT inside the locked
   scene's element, so every single pointerdown on it satisfied outsideLock
   and unlocked — which calls __field.set(false). Touch anything and you were
   thrown out of the view you had just walked into. Nothing about the field
   was broken; the table's own "you pressed off the locked scene" rule simply
   did not know the field existed. */
const inField = () => !!(root.__field && root.__field.on());

/* ── LOCKED IS NOT FROZEN, AND IT IS NOT FRAGILE EITHER ───────
   grumkata: "when you go interactive on the combat map any movement
   immediately boots you which sucks".

   Two rules were doing it, and both were written as if looking away from the
   board meant you had finished with it:

     · PRESSING OFF THE SCENE UNLOCKED. Once you are locked in and zoomed
       into a fight, most of the screen IS off the scene — so pressing the
       wood to pan, which is the first thing anyone does, threw you straight
       back out to the 3D table. That rule is gone. Pressing the wood pans,
       the way it does everywhere else.

     · STAYING IN VIEW WAS A CONDITION. inBounds() required the middle of the
       viewport to stay within a third of the locked sheet's own rect, so
       panning far enough to look at the other end of a twelve-wide
       battlefield ejected you mid-drag.

   Leaving is a deliberate act now, and there are three of them: the same
   double right-click that got you in, Escape, and pulling right back out
   past OUT_ZOOM — all three are things you do on purpose. */
function inBounds() {
  if (!lock) return true;
  /* the only automatic way out: you have pulled the camera right back, which
     is not something that happens by accident while you are reading a board */
  return T.k >= lockK * OUT_ZOOM;
}
function checkBounds() { if (lock && !anim && !inBounds()) unlock(true); }

/* Furniture and anything the model says is locked stays put. `.fixed` is the
   chest and the bin — part of the table — and `data-locked` is a scene that has
   been fitted to the slab and not yet deliberately unpinned. */
const nailed = p => p.classList.contains('fixed') || p.dataset.locked === '1';

function grabProp(p, e) {
  if (nailed(p)) return;
  p.setPointerCapture(e.pointerId);
  p.classList.add('lift'); p.style.zIndex = ++zTop;
  /* lifted clear of wherever it was resting, not to a fixed height — a token
     already stands at 44 and a flat 30 would have posted it back down */
  p.dataset.z = (+p.dataset.rest || 8) + 26;
  placeProp(p);
  /* where on the piece you took hold of it, in table units, so it does not
     jump to centre itself under the pointer the moment you move */
  const g = screenToTable(e.clientX, e.clientY);
  dg = { p, sx: e.clientX, sy: e.clientY, ox: +p.dataset.x, oy: +p.dataset.y,
         gx: g.x - (+p.dataset.x || 0), gy: g.y - (+p.dataset.y || 0) };
  e.preventDefault();
}
function startPan(e) {
  /* preventDefault below stops the browser moving focus, so a note you were
     writing in kept the caret after you clicked away onto bare wood — and
     never fired the blur that saves it. Let go of it explicitly. */
  const a = doc.activeElement;
  if (a && a !== doc.body && !a.closest('.t3-hud, .chatdock')) a.blur();

  vp.classList.add('grabbing');
  dg = { pan: 1, sx: e.clientX, sy: e.clientY, ox: T.x, oy: T.y };
  e.preventDefault();
}

let rc = { t: 0, x: 0, y: 0, p: null };

function mount() {
  vp  = doc.getElementById('vp');
  tbl = doc.getElementById('tbl');
  zl  = doc.getElementById('zl');
  if (!vp || !tbl) return;

  const fitBtn = doc.getElementById('fit');
  if (fitBtn) fitBtn.addEventListener('click', () => {
    if (lock) {
      anim = null; lock.classList.remove('locked');
      doc.body.classList.remove('locked-in');
      lock = null; before = null; TILT = TILT3D;
    }
    fitTable();
  });
  const themeBtn = doc.getElementById('theme');
  if (themeBtn) themeBtn.addEventListener('click',
    () => doc.body.classList.toggle('dark'));

  doc.querySelectorAll('.prop').forEach((p, i) => {
    p.style.zIndex = 10 + i; placeProp(p);
  });
  /* the two markers the GL layer measures the round table against. They are
     not props — nothing drags them and nothing paints them — so they have to
     be placed here or they sit at the plane's origin, on top of each other,
     and the table comes out with no width at all. */
  doc.querySelectorAll('#tbl .tmark').forEach(placeProp);

  wire();
  fitTable();
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
    /* IN THE FIELD, THE POINTER MOVES THE CAMERA — never the table under it,
       and never the lock. Dragging walks along the line; a press that does
       not travel is a click on whatever you pressed. */
    if (inField()) {
      if (e.target.closest('.t3-hud, .chatdock, .sc-opts, .hb')) return;
      const c = root.__field.cam;
      fdrag = { sx: e.clientX, sy: e.clientY, pan: c.pan, look: c.look, moved: 0 };
      vp.setPointerCapture && vp.setPointerCapture(e.pointerId);
      vp.classList.add('grabbing');
      e.preventDefault();
      return;
    }
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
    /* A CONTROL ON A PIECE IS A CONTROL. Now that whole pieces are handles,
       the few real controls that live ON one — a name you can rename, the pip
       that turns a counter over, a note you are already writing on — have to
       be able to take a press without the piece sliding out from under it. */
    if (e.target.closest(
      'input,textarea,select,button,[data-rename],[data-side-of],[contenteditable="true"]'))
      return;
    const grip = e.target.closest('.grip');
    if (grip && !lock) {
      const p = grip.closest('.prop');
      if (p && !nailed(p)) { grabProp(p, e); return; }
    }
    /* bare wood pans, locked in or not */
    if (!e.target.closest('.prop,.t3-hud')) startPan(e);
  });

  root.addEventListener('pointermove', e => {
    if (fdrag) {
      const dx = e.clientX - fdrag.sx, dy = e.clientY - fdrag.sy;
      fdrag.moved = Math.max(fdrag.moved, Math.hypot(dx, dy));
      const c = root.__field.cam;
      /* sideways walks the line; up and down looks along it. Both are damped
         by the zoom, so leaning in does not make the view skittish. */
      c.pan  = Math.max(-26, Math.min(26, fdrag.pan  - dx * 0.055 / c.zoom));
      c.look = Math.max(-9,  Math.min(7,  fdrag.look + dy * 0.030 / c.zoom));
      root.__field.place();
      return;
    }
    if (!dg) return;
    if (dg.pan) {
      T.x = dg.ox + (e.clientX - dg.sx); T.y = dg.oy + (e.clientY - dg.sy);
      apply(); checkBounds(); return;
    }
    /* ── THE PIECE GOES WHERE THE POINTER IS ───────────────────
       This used to be `delta / k`, with a cos(tilt) fudge on the vertical to
       account for the table lying away from you. That is only right at the
       exact centre of the view: under perspective the SAME screen delta
       covers less table near the front edge than at the back, so a piece
       dragged anywhere else fell behind the cursor and then ran ahead of it
       on the way back — which is what "you drag faster than it moves and
       it's hard to use" is. There is no scale factor that fixes it, because
       it is not a scale error.

       screenToTable inverts the real matrix, so the answer is exact
       everywhere: hold the grab offset, and the piece is always under the
       point of it you picked up. */
    const at = screenToTable(e.clientX, e.clientY);
    dg.p.dataset.x = Math.round(at.x - dg.gx);
    dg.p.dataset.y = Math.round(at.y - dg.gy);
    placeProp(dg.p);
    if (root.TableProps) root.TableProps.dragging(dg.p, e);
  });

  root.addEventListener('pointerup', e => {
    if (fdrag) {
      /* a press that did not travel is a click: pick whatever is under it and
         select it, which is the same selection the sheet is showing */
      if (fdrag.moved < 5 && root.__field.pick) {
        const id = root.__field.pick(e.clientX, e.clientY);
        if (typeof S !== 'undefined') {
          S.sel = id || null;
          if (typeof render === 'function') render();
        }
      }
      fdrag = null; vp.classList.remove('grabbing');
      return;
    }
    if (dg && dg.p) {
      dg.p.classList.remove('lift');
      dg.p.dataset.z = (+dg.p.dataset.rest || 8);
      placeProp(dg.p);
      if (root.TableProps) root.TableProps.dropped(dg.p, e);
    }
    vp.classList.remove('grabbing'); dg = null;
  });

  root.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    /* one step at a time: out of the field, then out of the lock */
    if (inField()) { leaveField(); return; }
    if (lock) unlock(false);
  });

  vp.addEventListener('wheel', e => {
    e.preventDefault();
    if (root.__field && root.__field.on()) {
      const c = root.__field.cam;
      c.zoom = Math.min(2.8, Math.max(.40, c.zoom * (e.deltaY < 0 ? 1.11 : 1 / 1.11)));
      if (c.zoom <= .42) { leaveField(); return; }
      root.__field.place(); return;
    }
    /* ── THE WHEEL OVER A PIECE RESIZES THAT PIECE ────────────
       grumkata: "3d models should be scaleable". TableModel.scaleTo has
       existed since the model was written and nothing has ever called it —
       there was no gesture for it at all, on any kind of piece.

       The wheel, because it is the gesture you already have your hand on
       and because size is a continuous thing: a tree that wants to be a
       little bigger does not want a dialog with a number in it. Over the
       bare wood it still zooms the table, which is the same gesture meaning
       the same thing one level out. */
    if (scaleUnder(e)) return;
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

/* ── RESIZE WHATEVER THE POINTER IS OVER ──────────────────────
   Returns true when it took the gesture. Only THINGS resize: the chest and
   the bin are furniture and a scene is fitted to the table by the rules of
   scenes, so neither answers to this.

   A piece you are holding does not either — you are choosing where to put
   it, and pulling it out from under your own cursor mid-place is not a
   size control. */
function scaleUnder(e) {
  const M = root.TableModel;
  if (!M || (root.Hand && root.Hand.held)) return false;
  const hit = doc.elementFromPoint(e.clientX, e.clientY);
  const p = hit && hit.closest && hit.closest('.prop.t3-thing');
  if (!p || !p.dataset.id) return false;
  const t = M.get(p.dataset.id);
  if (!t || t.kind === 'scene') return false;
  const was = t.scale || 1;
  /* the same 1.12 the table zooms by, so the two feel like one control */
  const want = was * (e.deltaY < 0 ? 1.12 : 1 / 1.12);
  M.scaleTo(t.id, want);
  const now = (M.get(t.id) || {}).scale || 1;
  size(t.name || 'That', now);
  return true;
}

/* the readout, in the toast the table already owns — no new furniture on
   screen for something you only look at while your hand is moving */
let sizeT = 0;
function size(name, k) {
  const el = doc.getElementById('toast');
  if (!el) return;
  el.textContent = name + '  ' + Math.round(k * 100) + '%';
  el.classList.add('on');
  clearTimeout(sizeT);
  sizeT = setTimeout(() => el.classList.remove('on'), 1100);
}

/* ── WHERE ON THE WOOD IS THAT POINT ON THE SCREEN ────────────
   The one piece of maths that makes "put it where the cursor is" possible,
   and therefore the one piece that turns the table into something you place
   things ON rather than a picture you configure from a menu.

   Derived by hand twice and wrong both times — first about the wrong
   transform-origin, then with rotateX's depth negated — with the error
   growing the further you got from the middle of the view, which is exactly
   the shape of mistake that looks fine in the one spot you test.

   So it does not re-derive the transform at all. It reads the browser's OWN
   computed matrix for #tbl, which already carries the translate, the scale,
   the rotation and the origin, and applies #vp's perspective divide on top.
   A point on the board is (X, Y, 0), so

       v = X*col0 + Y*col1 + col3

   and the perspective divide about (cx,cy) gives two equations linear in X
   and Y. One 2x2 solve. Exact, and it cannot drift out of step with the
   stylesheet the way a hand-copied constant can.                          */
function tblMatrix() {
  const m = root.getComputedStyle(tbl).transform;
  if (!m || m === 'none') return null;
  const n = m.match(/matrix3?d?\(([^)]+)\)/);
  if (!n) return null;
  const v = n[1].split(',').map(parseFloat);
  if (v.length === 6) {          /* 2D matrix(a,b,c,d,e,f), column-major 3x2 */
    return [v[0], v[1], 0, 0,  v[2], v[3], 0, 0,  0, 0, 1, 0,  v[4], v[5], 0, 1];
  }
  return v.length === 16 ? v : null;
}

function screenToTable(sx, sy) {
  if (!vp || !tbl) return { x: TW / 2, y: TH / 2 };
  const m = tblMatrix();
  if (!m) return { x: TW / 2, y: TH / 2 };

  const vr = vp.getBoundingClientRect();
  const px = sx - vr.left, py = sy - vr.top;
  const P = PERSP;
  const cx = vp.clientWidth * 0.5, cy = vp.clientHeight * ORIGIN_Y;

  /* columns of the 4x4, column-major as CSS reports it */
  const a = m[0],  c = m[1],  g = m[2];      /* col 0 -> x,y,z */
  const b = m[4],  d = m[5],  h = m[6];      /* col 1 */
  const e = m[12], f = m[13], i = m[14];     /* col 3 (translation) */

  /* (px-cx)(P - vz) = P(vx - cx)  and the same in y, with
     vx = aX + bY + e,  vy = cX + dY + f,  vz = gX + hY + i          */
  const qx = px - cx, qy = py - cy;
  const A1 = P * a + qx * g, B1 = P * b + qx * h;
  const C1 = qx * (P - i) - P * (e - cx);
  const A2 = P * c + qy * g, B2 = P * d + qy * h;
  const C2 = qy * (P - i) - P * (f - cy);

  const det = A1 * B2 - A2 * B1;
  if (Math.abs(det) < 1e-9) return { x: TW / 2, y: TH / 2 };
  return { x: Math.round((C1 * B2 - C2 * B1) / det),
           y: Math.round((A1 * C2 - A2 * C1) / det) };
}

/* the middle of the wood you are looking at, in table units — so a thing
   taken out of the box lands where you are looking, not at the origin */
function middle() {
  if (!vp) return { x: TW / 2, y: TH / 2 };
  const c = Math.max(0.2, Math.cos(TILT * Math.PI / 180));
  return { x: Math.round((vp.clientWidth / 2 - T.x) / T.k),
           y: Math.round((vp.clientHeight / 2 - T.y) / (T.k * c)) };
}

root.Table3D = { mount, fit: fitTable, frame, place: placeProp, middle,
                 screenToTable, TW, TH, get tiltDeg() { return TILT; }, get k() { return T.k; },
                 lockIn, unlock, get tilt() { return TILT; } };

})(window, document);
