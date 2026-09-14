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
let PERSP = 2400;
const ORIGIN_Y = 0.42;

let vp = null, tbl = null, zl = null;
let TILT = TILT3D;
let YAW = 0;          /* which way you are facing, in degrees */
let PITCH = 0;        /* and how far up or down, as a delta on the tilt */
const YAW_MAX = 74;   /* a neck and a shoulder, not a turret */
/* ── AND ENOUGH OF IT TO BE WORTH HAVING ──────────────────────
   PITCH_UP was 15 and the ceiling was 86, but the seated tilt is already
   78 — so looking up bought you EIGHT DEGREES before it hit the stop, and
   grumkata's "for some reason you cant look up" is just an accurate
   description of eight degrees.

   The stop was drawn at 86 out of a worry about the wood going edge-on
   and then over. It does not go over: your eye is held above the table
   plane whatever the angle, so past ninety the wood simply drops out of
   the bottom of the frame, which is what looking up at a ceiling does.
   The ceiling is where the room actually ends. */
const PITCH_UP = 26, PITCH_DOWN = 24;
const TILT_CEIL = 102;
let T = { x: 0, y: 0, k: 0.6 };
let zTop = 200, dg = null, fdrag = null;
let lock = null, before = null, anim = null, lockK = 1;

/* the piece layer mirrors this angle, so it has to be readable live */
root.__tilt = () => TILT * Math.PI / 180;
root.__yaw  = () => yawNow() * Math.PI / 180;
/* how far back in the chair you are, 0 over the wood to 1 sitting back.
   The GL layer reads it rather than being told, so there is one answer. */
root.__viewU = () => viewU();

/* ══ WHERE YOUR EYE IS, IN THE TABLE'S OWN COORDINATES ═════════
   grumkata: "it doesn't feel like i'm seated and looking around ... if i
   turn too much i start moving in a weird way".

   He is describing an orbit, and he is right: YAW was a rotateZ about the
   table's own centre, so turning your head swung the whole room — and you
   with it — around a point in front of your face. That is a camera on a
   jib arm, not a person turning to look at the bar. Turning your head
   rotates the world about the vertical through YOUR HEAD, so the first
   thing needed is where your head is.

   The browser will not say, but it is derivable: the camera sits at #vp's
   perspective origin, PERSP in front of the screen plane, and the table's
   transform is a known translate, scale and tilt. Invert it.

   ONE TRAP, and it cost an afternoon. #tbl is a ZERO-SIZED box with its
   transform-origin at its own top-left corner — CX and CY are not the
   origin of the transform, they are a coordinate system for the things
   INSIDE it, and the middle of the wood is a point at (CX, CY) like any
   other. Treat CX/CY as the origin and every number that comes out is
   wrong by most of a table, self-consistently, which is the worst way to
   be wrong. Everything here is relative to the MIDDLE OF THE WOOD, and it
   gets there by going through the corner first. */
function eyeLocal() {
  if (!vp || !tbl) return { x: 0, y: 2400, z: 900 };
  const H = vp.clientHeight, W = vp.clientWidth;
  const ox = tbl.offsetLeft + T.x;
  const oy = tbl.offsetTop + T.y + seatDrop;
  const vx = (W * 0.5 - ox) / T.k;
  const vy = (H * ORIGIN_Y - oy) / T.k;
  const vz = PERSP / T.k;
  const t = TILT * Math.PI / 180, c = Math.cos(t), sn = Math.sin(t);
  return { x: vx - CX, y: vy * c + vz * sn - CY, z: -vy * sn + vz * c };
}
/* 27-table-gl.js calls the table 1.2m across, so half of it is what one
   table radius is worth and RAD units buy that many metres. */
const TABLE_M_HALF = 0.6;
const U_PER_M = RAD / TABLE_M_HALF;
root.__eye = () => { const e = eyeLocal();
  return { back: e.y / U_PER_M, up: e.z / U_PER_M, side: e.x / U_PER_M }; };

/* ── AND HOW TO CHANGE THE ANGLE WITHOUT MOVING IT ────────────
   Looking up is not the same as leaning back. Raise the tilt on its own
   and the eye swings up and over on an arc centred on the table, which is
   the same orbit in the other axis.

   Where the eye lands is set by three things — the tilt, the lens and
   where the table sits on screen — so fixing the first and solving the
   other two for a given eye is a two-by-two with one answer. Pitch
   therefore costs a new lens and a new offset, and pays for a head that
   stays where it is. */
function holdEye(E, deg) {
  const t = deg * Math.PI / 180, c = Math.cos(t), sn = Math.sin(t);
  const Y = E.y + CY;
  const vy = Y * c - E.z * sn;
  const vz = Y * sn + E.z * c;
  return {
    persp: Math.max(240, Math.round(vz * T.k)),
    drop: (vp ? vp.clientHeight : 900) * ORIGIN_Y
          - (tbl ? tbl.offsetTop : 0) - T.y - vy * T.k
  };
}

/* ── HOW FAR AWAY THE MIDDLE OF THE WOOD IS ───────────────────
   The GL layer finds the table by measuring two markers on its rim, which
   is a good measurement: it is the browser's own answer, it survives every
   transform in the chain, and it has been right through three rewrites of
   this file. What a screen rect cannot report is DEPTH, and GL assumed
   nought — so it drew the room at the screen plane and scaled it to the
   measured width.

   Turning your head about your own head moves the table off the optical
   axis and, with it, along the axis: the middle of the wood swings from in
   front of you to beside you, which in a flat perspective is nearer to the
   film. Scaled to the measured width from the screen plane, that came out
   half again too big at fifty degrees and the whole tavern swelled as you
   looked across it — the rest of "if i turn too much i start moving in a
   weird way".

   And the middle of the wood is never at nought even before you turn:
   tilted back it is already a third of the lens in front of the film,
   which is why this is `CY + dy` and not `dy`. (There were two of these
   functions for a while, an earlier one returning 0 at yaw nought and this
   one; they were declared in the same scope, so hoisting silently made
   this the only one that ever ran. The other is gone.)

   This is that number, and the measured midpoint and width get unprojected
   through it so the room ends up where it is rather than where it looked. */
function stageZ() {
  const a = yawNow() * Math.PI / 180;
  const t = TILT * Math.PI / 180;
  let dy = 0;
  if (a) { const E = eyeLocal();
           dy = E.y * (1 - Math.cos(a)) - E.x * Math.sin(a); }
  return T.k * (CY + dy) * Math.sin(t);
}
root.__stageZ = stageZ;
root.__persp = () => PERSP;

function apply() {
  if (!tbl) return;
  /* ── scale3d, NOT scale ──────────────────────────────────
     CSS `scale()` is TWO-DIMENSIONAL. It multiplies x and y and leaves z
     alone — and this is a 3D scene, so for years the table has been
     zoomed across and down while keeping its full, unzoomed DEPTH. The
     browser's own matrix said so:

         translate(...) scale(0.2358) rotateX(22deg)
         -> Y axis = (0, 0.21867, 0.37461)

     0.21867 is cos22 x 0.2358: scaled. 0.37461 is sin22: NOT scaled. So
     at 24% zoom the wood's far and near edges sat 487px apart in depth
     instead of 115 — four times too deep, and the factor is exactly 1/k,
     so it changed every time the zoom did.

     Everything followed from that. The GL layer builds a real table and
     scales it evenly, the way an object actually behaves, so the two
     halves of the picture drew different tables: pieces crept off the
     wood, and how far off depended on the zoom, which is why panning and
     resizing seemed to make them wander. The z-lifts went with it — a
     piece nominally 8px off the surface was really 34 table units up at
     this zoom, and the chest and bin at 60 were a quarter of the table
     in the air, which is why furniture never sat where its own dot was.

     scale3d scales the depth too, which is what "further away" means. */
  /* rotateZ AFTER rotateX means it is applied FIRST, in the element's own
     plane — so it spins the tabletop about its own normal rather than
     rolling the picture. That is what turning your head at a table does
     to what you see, and the room rides it for free. */
  /* ── AND THE TURN HAPPENS AT YOUR HEAD ────────────────────
     rotateZ still spins the scene about the table's normal, which is the
     right axis — but bracketed by a move to the eye and back, so the axis
     passes through YOU. Sit still and turn: the far wall sweeps past, the
     table swings out to your side the way a table does when you look away
     from it, and nothing orbits anything.

     With YAW at zero the two translates cancel exactly, so the view over
     the wood is untouched, to the pixel. */
  const yaw = yawNow();
  const E = yaw ? eyeLocal() : null;
  /* the pivot is a point INSIDE the table's coordinate system, so the eye —
     which is measured from the middle of the wood — has to be put back into
     the corner-based coordinates everything in here is written in */
  const px = E ? CX + E.x : 0, py = E ? CY + E.y : 0, pz = E ? E.z : 0;
  const turn = E
    ? ` translate3d(${px.toFixed(1)}px,${py.toFixed(1)}px,${pz.toFixed(1)}px)` +
      ` rotateZ(${yaw.toFixed(2)}deg)` +
      ` translate3d(${(-px).toFixed(1)}px,${(-py).toFixed(1)}px,${(-pz).toFixed(1)}px)`
    : '';
  const m = `translate(${T.x}px,${T.y + seatDrop}px) scale3d(${T.k},${T.k},${T.k}) ` +
            `rotateX(${TILT}deg)${turn}`;
  aimMarks();
  tbl.style.transform = m;
  restandProps();
  /* the floor rides with the wood, from its own layer under the table */
  const under = doc.getElementById('tblu');
  if (under) under.style.transform = m;
  if (zl) zl.textContent = Math.round(T.k * 100) + '%';
  /* the camera moved, so every model painted over the wood has to be
     redrawn — the GL layer rests when nothing has changed */
  if (root.TableGL && root.TableGL.invalidate) root.TableGL.invalidate(3);
  if (root.__onView) root.__onView();
}

/* ── KEEPING THE RULER SQUARE TO THE SCREEN ───────────────────
   27-table-gl.js sizes the wood by measuring the gap between two markers
   on the rim, which works because they sit on the horizontal diameter and
   a horizontal line across a tilted circle is the one chord that is not
   foreshortened. Turn your head and that stops being true: the pair swings
   round with the table, the projected gap shrinks by cos(tilt) as it goes,
   and the whole room would breathe in and out as you looked about.

   So the markers are moved round the rim by the opposite of the yaw. They
   are still on the circle — every point on it is — and they are still on
   the screen's horizontal, so the measurement means the same thing at
   every angle. */
function aimMarks() {
  const a = -yawNow() * Math.PI / 180, r = RAD;
  const dx = Math.cos(a) * r, dy = Math.sin(a) * r;
  const set = (id, x, y) => {
    const m = doc.getElementById(id);
    if (!m) return;
    m.dataset.x = Math.round(CX + x); m.dataset.y = Math.round(CY + y);
    m.style.transform = `translate3d(${Math.round(CX + x)}px,${Math.round(CY + y)}px,0px)`;
  };
  set('tm-l', -dx, -dy);
  set('tm-r',  dx,  dy);
}

/* where a prop sits on the wood: its own units, its own lift off the surface */
/* ── AND IT STANDS UP AS YOU SIT BACK ─────────────────────────
   grumkata: "when on seated view i cant see whats on the table even
   though that shouldnt dissapear".

   Not a bug so much as geometry. Your eye is 62cm above the wood, so
   anything LYING on it is seen at a grazing angle: a note four hundred
   pixels tall came out as a nineteen-pixel sliver. It was all still
   there, and all of it unreadable — which is exactly what a real table
   looks like from a chair, and exactly what an app must not do.

   So a piece on the wood behaves like a standee. It lies flat while you
   are working over the table, and as you lean back it hinges up off its
   near edge until it is square to your eye — the same trick the
   combatants use, and the same trick a paper figure at a real table uses,
   for the same reason. At the wood the angle is nought and this is the
   transform it has always been, to the character.

   Model anchors are left alone: a chest is a real object standing on the
   board's normal, it is already the right way up, and tipping its anchor
   would drag the model with it. */
const STANDS_ALONE = /\bt3-model\b|\btb-box\b|\btb-bin\b|\btmark\b/;
/* ── A PIECE THAT HAS JUST LANDED ─────────────────────────
   The squash itself is in 12-combat.css; this only fires it, because CSS
   has no selector for "stopped being dragged a moment ago" — :active is
   already gone by the time the piece is down.

   The class is removed on animationend rather than on a timer, so the two
   can never disagree about how long the animation is, and `once` means the
   listener cannot pile up over a long session of moving pieces around.
   Re-added after a forced reflow so that dropping the same piece twice in
   quick succession restarts the animation instead of being ignored — a
   class that is already present is not a change, and the browser will not
   replay an animation it thinks is still running. */
function settle(p) {
  if (!p) return;
  p.classList.remove('settling');
  void p.offsetWidth;                     /* reflow: makes the re-add count */
  p.classList.add('settling');
  p.addEventListener('animationend', () => p.classList.remove('settling'),
                     { once: true });
}

function placeProp(p) {
  /* the GL layer paints models over these anchors, so moving one is a
     reason for it to draw a frame — see the note on idling in 27-table-gl */
  if (root.TableGL && root.TableGL.invalidate) root.TableGL.invalidate(3);
  const base =
    `translate3d(${p.dataset.x || 0}px,${p.dataset.y || 0}px,${p.dataset.z || 8}px) ` +
    `rotate(${p.dataset.r || 0}deg)`;
  const u = camU;
  if (!u || STANDS_ALONE.test(p.className)) { p.style.transform = base; return; }
  /* hinged about the edge nearest you, so the foot of the card stays where
     it was put and the face comes up to meet the eye */
  const h = p.offsetHeight || 0;
  p.style.transform = base +
    ` translate3d(0,${(h / 2).toFixed(1)}px,0)` +
    ` rotateX(${(-TILT * u).toFixed(2)}deg)` +
    ` translate3d(0,${(-h / 2).toFixed(1)}px,0)`;
}
/* every piece has to be re-placed when the angle changes, which is what
   makes the standing-up continuous rather than a jump at the threshold */
let propU = 0;
function restandProps() {
  if (Math.abs(camU - propU) < 0.004) return;
  propU = camU;
  const list = doc.querySelectorAll('#tbl .prop');
  for (let i = 0; i < list.length; i++) placeProp(list[i]);
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
  lean = 0; seatCam();
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
function glide(to, done, toLens) {
  const from = { x: T.x, y: T.y, k: T.k, tilt: TILT, lens: PERSP };
  const L = toLens || PERSP;
  const t0 = performance.now(), DUR = 420;
  anim = {};
  (function step(now) {
    if (!anim) return;
    const u = Math.min(1, (now - t0) / DUR);
    const e = u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    T.x = from.x + (to.x - from.x) * e; T.y = from.y + (to.y - from.y) * e;
    T.k = from.k + (to.k - from.k) * e; TILT = from.tilt + (to.tilt - from.tilt) * e;
    PERSP = Math.round(from.lens + (L - from.lens) * e);
    if (vp) vp.style.perspective = PERSP + 'px';
    if (root.TableGL && root.TableGL.lens) root.TableGL.lens(PERSP);
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

/* ══ ONE VIEW, NOT TWO ════════════════════════════════════════
   I built this as two scenes twice and grumkata told me twice that it is
   one. Writing the correction down so it stops being re-learned:

     "these are still 2 separate scenes ... you should always be in this
      scene and zoom out"

   You are ALWAYS in the tavern. Nothing switches on, nothing is entered,
   there is no seated mode. There is one continuous travel from having
   your nose over the wood to sitting back in the chair, and every angle
   between is a real position rather than a transition between states.

   LEANING IS NOT ZOOMING, and tying the two together is what broke the
   last two attempts. Zoom changes how big the table is; leaning changes
   what ANGLE you see it from — and a table you lean back from does not
   noticeably shrink, it foreshortens. So `lean` is its own number. The
   wheel spends it in order: zoom out until the whole table is on screen,
   and then keep going and your head comes down. Wheel in and your head
   goes back up first, then you zoom.

   That ordering is also the fix for "it enters for a moment then boots
   back to the table". The old code had a threshold that called standUp()
   when you leaned too far, so the very gesture that sat you down would,
   a notch later, throw you out. There is no threshold here and nothing
   to be thrown out of. */
const ZOOM_MIN  = 0.30;    /* the whole table on screen; past here you lean */
const TILT_FAR  = 78;      /* how far your head comes down */
const LENS_NEAR = 2400;

/* ── THE SEAT IS A PLACE, NOT THREE TUNED NUMBERS ─────────────
   The seated view used to be a tilt, a lens and a drop, each nudged until
   the picture looked right. Measured afterwards, the eye those three put
   you at was 1.17m ABOVE the table top and 0.92m back — a man standing
   over the table with his hands on it. That is why grumkata could not
   place the feeling: the framing said seated and the geometry said
   standing, and the moment he turned his head the geometry won.

   So the seat is stated instead, in the only terms that mean anything —
   how far back you are and how high your eye is — and the lens and the
   offset are SOLVED for it. Change these two numbers and you move your
   chair; nothing else needs touching, and whatever comes out is honest. */
const EYE_BACK = 1.24;     /* metres from the middle of the wood */
const EYE_UP   = 0.62;     /* metres above the top of it */

let lean = 0, seatDrop = 0, camU = 0;
function viewU() { return lock ? 0 : lean; }
/* Your head is only turned while you are IN the chair. Standing up over
   the wood squares the view back up on its own rather than leaving the
   room askew behind a table you are trying to work on — and the angle is
   remembered, so sitting back down puts you facing the bar again. */
function yawNow() { return YAW * camU; }

/* Sets the tilt, the lens and where the table sits for how far back you
   are. Applies nothing itself: apply() is also what the lock glide drives
   and the two must never write TILT in the same frame. */
/* ── WHERE YOUR EYE IS OVER THE WOOD ──────────────────────────
   The far end of the same travel. The table view is a tilt of 22, a lens
   of 2400 and no offset, and those put the eye somewhere specific — about
   four metres up and directly over the middle. Read it out rather than
   assume it, because it moves with the pan and the zoom. */
function tableEye() {
  if (!vp || !tbl) return { x: 0, y: 0, z: 8000 };
  const vy = (vp.clientHeight * ORIGIN_Y - tbl.offsetTop - T.y) / T.k;
  const vz = LENS_NEAR / T.k;
  const t = TILT3D * Math.PI / 180, c = Math.cos(t), sn = Math.sin(t);
  return { x: 0, y: vy * c + vz * sn - CY, z: -vy * sn + vz * c };
}

/* ── WHERE THE MIDDLE OF THE WOOD LANDS ON SCREEN ─────────────
   Given where your eye is and how far the wood is tilted, this is the
   pixel its middle projects to. Everything it needs is already in hand:
   the eye fixes the lens and the offset (holdEye), and those fix the
   projection. Worth having as its own line because the travel is going to
   be steered by it. */
function midOnScreen(E, deg) {
  const t = deg * Math.PI / 180, c = Math.cos(t), sn = Math.sin(t);
  const A = E.y + CY, B = E.z;
  const den = E.y * sn + B * c;
  const P = (vp ? vp.clientHeight : 900) * ORIGIN_Y;
  if (Math.abs(den) < 1e-6) return P;
  return P + T.k * (A * sn + B * c) * (B * sn - E.y * c) / den;
}

/* ── AND THE ANGLE THAT PUTS IT THERE ─────────────────────────
   grumkata: "the zoom from table to player view is weird as it feels like
   its curved".

   It was curved, and here is the curve. Traced through the travel, the
   middle of the wood ran down the screen 389, 446, 582, 737, 855, 900 —
   and then back UP to 868, 781, 686, 639. It dived past the bottom of the
   window and climbed back. Moving your eye in a straight line is not
   enough on its own, because the ANGLE is a second free hand and it was
   still being lerped blind.

   So the third thing gets stated too. The eye goes where it is told, the
   middle of the wood goes where it is told, and the angle is whatever
   satisfies both — found by halving the interval, which is quick, robust
   and cannot go anywhere silly because the answer is bracketed. Both ends
   are untouched: they are already consistent triples, so the solve returns
   exactly the angle they were built with. */
function tiltFor(E, want, guess) {
  const f = d => midOnScreen(E, d) - want;
  let lo = 6, hi = 104, flo = f(lo), fhi = f(hi);
  if (!(flo < 0 !== fhi < 0)) return guess;    /* not bracketed: keep the lerp */
  for (let i = 0; i < 34; i++) {
    const mid = (lo + hi) / 2, fm = f(mid);
    if ((fm < 0) === (flo < 0)) { lo = mid; flo = fm; } else { hi = mid; }
  }
  return (lo + hi) / 2;
}

function seatCam() {
  if (lock || anim) return false;
  const e = lean * lean * (3 - 2 * lean);
  /* Pitch is a delta on the tilt and it only exists once you are back in
     the chair: over the wood the angle is the work surface's, not yours. */
  camU = e;
  const base = TILT3D + (TILT_FAR - TILT3D) * e;
  /* what the lens and the offset have to be for the eye to be in the seat
     AT THIS ANGLE — which is what makes looking up a turn of the head
     rather than a crane shot */
  /* ── THE TRAVEL IS A MOVE, NOT TWO SLIDERS ────────────────
     grumkata: "when zooming out there is a moment where the table and
     everything vanishes".

     It did, and this is why. The lens and the offset were interpolated
     SEPARATELY — lens from 2400 toward the seated one, offset from nought
     toward the seated one — and those two numbers jointly decide where
     your eye is. Lerping them one at a time does not lerp the eye; it
     sends it along whatever path falls out of the arithmetic, and that
     path dived at the wood. Measured through the zoom-out, the table's
     projected width went 792, 834, 968, 1231, 1662: it BALLOONED past the
     width of the window, blotting out the entire tavern, and then came
     back. Which from the outside is everything vanishing.

     So interpolate the thing that actually matters — the eye — in a
     straight line from over the wood to the chair, and let holdEye say
     what lens and what offset put it there at each step. Both ends come
     out exactly as they were, because holdEye is the inverse of the
     reading that produced them. */
  const A = tableEye();
  const B = { x: 0, y: EYE_BACK * U_PER_M, z: EYE_UP * U_PER_M };
  const E = { x: 0, y: A.y + (B.y - A.y) * e, z: A.z + (B.z - A.z) * e };
  /* the two ends, as the two views actually frame them, and a straight
     line between — so the wood slides once, the way it should */
  const want = midOnScreen(A, TILT3D) +
               (midOnScreen(B, TILT_FAR) - midOnScreen(A, TILT3D)) * e;
  const solved = (e > 0.001 && e < 0.999) ? tiltFor(E, want, base) : base;
  TILT = Math.max(14, Math.min(TILT_CEIL, solved + PITCH * e));
  const seat = holdEye(E, TILT);
  PERSP = Math.round(seat.persp);
  seatDrop = seat.drop;
  if (vp) vp.style.perspective = PERSP + 'px';
  if (root.TableGL && root.TableGL.lens) root.TableGL.lens(PERSP);
  doc.body.classList.toggle('seated', lean > 0.5);
  return true;
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

/* ══ YOU ARE LOOKING AT THE TABLE, SO LOOK AT THE TABLE ════════
   grumkata: "when your looking at the table you can move around and see
   the tavern which is a nono".

   Panning was unbounded. Over the wood that is a work surface and you drag
   it about freely — but drag far enough and the wood leaves the screen and
   you are staring at a bar you cannot reach from there, which is neither
   of the two things this view is for.

   The rule is the one every photo viewer uses, and it has to be both
   halves or it is wrong in one regime or the other:

     · while the wood is BIGGER than the window, it must keep covering the
       window — you may go anywhere on it and nowhere off it;
     · while it is SMALLER, its middle stays near the middle of the window,
       so a fitted table cannot be shoved into a corner.

   It reads the slab's own rect rather than predicting it, because the rect
   is what the eye is actually complaining about and it already carries the
   tilt, the turn and the perspective. */
const PAN_SLACK = 0.06;      /* how far a small table may sit off-centre */
function holdOnTheTable() {
  if (lock || anim || viewU() > 0.5) return false;
  const slab = doc.querySelector('#tbl .slab');
  if (!slab || !vp) return false;
  const r = slab.getBoundingClientRect(), v = vp.getBoundingClientRect();
  if (!r.width || !v.width) return false;
  let dx = 0, dy = 0;
  const axis = (lo, hi, vlo, vhi) => {
    const size = hi - lo, vsize = vhi - vlo;
    if (size >= vsize) {                       /* bigger: keep it covering */
      if (lo > vlo) return vlo - lo;
      if (hi < vhi) return vhi - hi;
      return 0;
    }
    const mid = (lo + hi) / 2, vmid = (vlo + vhi) / 2, slack = vsize * PAN_SLACK;
    if (mid < vmid - slack) return (vmid - slack) - mid;
    if (mid > vmid + slack) return (vmid + slack) - mid;
    return 0;
  };
  dx = axis(r.left, r.right, v.left, v.right);
  dy = axis(r.top, r.bottom, v.top, v.bottom);
  if (!dx && !dy) return false;
  T.x += dx; T.y += dy;
  return true;
}

/* is any part of the wood still on screen? */
function slabVisible() {
  const s = doc.querySelector('#tbl .slab');
  if (!s || !vp) return true;
  const r = s.getBoundingClientRect(), v = vp.getBoundingClientRect();
  return r.right > v.left + 40 && r.left < v.right - 40 &&
         r.bottom > v.top + 40 && r.top < v.bottom - 40;
}

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
         gx: g.x - (+p.dataset.x || 0), gy: g.y - (+p.dataset.y || 0), moved: 0 };
  /* the whole drag is ONE undo, not one per pointermove */
  if (root.TableModel) root.TableModel.begin();
  dg.grouped = true;
  /* picking a piece up is also how you say which one you mean */
  if (root.TableModel && p.dataset.id) root.TableModel.select(p.dataset.id);
  e.preventDefault();
}
function startPan(e) {
  /* preventDefault below stops the browser moving focus, so a note you were
     writing in kept the caret after you clicked away onto bare wood — and
     never fired the blur that saves it. Let go of it explicitly. */
  const a = doc.activeElement;
  if (a && a !== doc.body && !a.closest('.t3-hud, .chatdock')) a.blur();

  vp.classList.add('grabbing');
  dg = { pan: 1, sx: e.clientX, sy: e.clientY, ox: T.x, oy: T.y,
         oyaw: YAW, otilt: TILT, opitch: PITCH };
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
  /* ── RESIZING MUST NOT THROW YOUR VIEW AWAY ───────────────────
     This was `resize -> fitTable`, so every time the window changed size
     — including every step of a drag-resize, and every maximise — the
     camera was re-framed onto the whole table and whatever you had
     panned and zoomed to was gone. Nothing on the table ever moved; the
     camera jumped, which looks exactly like everything sliding off the
     wood at once.

     #tbl is anchored to the viewport's top-left, so growing the window
     leaves the wood where it is and moves the CENTRE of the view away
     from it. Shifting the table by half the change keeps whatever you
     were looking at under the middle of the screen, at the zoom you
     chose. `Fit table` is still there for when you want a re-frame. */
  let lastVW = 0, lastVH = 0, rzT = 0;
  const noteSize = () => { if (vp) { lastVW = vp.clientWidth; lastVH = vp.clientHeight; } };
  noteSize();
  root.addEventListener('resize', () => {
    if (!vp) return;
    const w = vp.clientWidth, h = vp.clientHeight;
    if (lastVW && lastVH && (w !== lastVW || h !== lastVH)) {
      T.x += (w - lastVW) / 2;
      T.y += (h - lastVH) / 2;
    }
    lastVW = w; lastVH = h;
    apply();
    /* if the wood has ended up entirely off screen — a window shrunk to a
       sliver, a monitor swapped — fall back to a fit rather than leaving
       someone staring at the floor. Debounced, so a drag-resize settles
       once instead of fighting the pointer. */
    clearTimeout(rzT);
    rzT = setTimeout(() => { if (!slabVisible()) fitTable(); }, 220);
  });
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
      /* ── SEATED, DRAGGING LOOKS AROUND ────────────────────
         Panning a table you are sitting at makes no sense — you cannot
         slide the room. Sideways turns your head; up and down leans you
         over the wood or back off it, within the range a neck has. */
      /* Sat back, dragging turns your head — you cannot slide a room you
         are sitting in. Over the wood it still pans, because there it is
         a work surface and panning is what you want. The changeover is
         the same number everything else here reads. */
      if (viewU() > 0.5) {
        /* Bounded, because this is a neck. Unbounded yaw was half of what
           made turning feel like machinery: spin far enough and the room
           comes round again, which no seat does. */
        /* NEGATIVE, so that dragging left shows you what is on your left.
           The two halves of the scene now agree about which way a turn
           goes, and once they do, one of the two possible senses has to be
           chosen deliberately rather than inherited from a bug. */
        const y = dg.oyaw - (e.clientX - dg.sx) * 0.20;
        YAW = Math.max(-YAW_MAX, Math.min(YAW_MAX, y));
        /* and up and down, which there was no way to do at all */
        const p = dg.opitch - (e.clientY - dg.sy) * 0.11;
        PITCH = Math.max(-PITCH_DOWN, Math.min(PITCH_UP, p));
        seatCam();
        apply();
        return;
      }
      T.x = dg.ox + (e.clientX - dg.sx); T.y = dg.oy + (e.clientY - dg.sy);
      apply();
      /* AFTER apply, not before. The clamp reads the slab's own rect, and
         the rect only tells the truth once the transform it came from has
         been written — measuring first corrects for where the table was a
         frame ago, which on a fast drag is nowhere near where it is. The
         grab is rebased by however far it was pulled back, so the pointer
         does not bank up an offset that snaps loose later. */
      if (holdOnTheTable()) {
        dg.ox = T.x - (e.clientX - dg.sx);
        dg.oy = T.y - (e.clientY - dg.sy);
        apply();
      }
      checkBounds(); return;
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
    dg.moved = Math.max(dg.moved || 0, Math.hypot(e.clientX - dg.sx, e.clientY - dg.sy));
    dg.free = e.shiftKey;              /* Shift places off the grid */
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
      settle(dg.p);
      /* A PRESS THAT DID NOT TRAVEL IS A CLICK. It used to be a move of
         zero distance, which is why simply touching a piece to look at it
         counted as an edit. Under four pixels it only selects. */
      dg.free = dg.free || e.shiftKey;
      if ((dg.moved || 0) < 4) {
        dg.p.dataset.x = dg.ox; dg.p.dataset.y = dg.oy;
        placeProp(dg.p);
      } else if (root.TableProps) {
        root.TableProps.dropped(dg.p, e);
      }
      if (dg.grouped && root.TableModel) root.TableModel.end();
    }
    vp.classList.remove('grabbing'); dg = null;
  });

  root.addEventListener('keydown', e => {
    /* never steal a key from something being written in */
    const a = e.target;
    if (a && (a.matches && a.matches('input,textarea,select,[contenteditable="true"]'))) return;

    const M = root.TableModel;

    /* UNDO. There was none: the only thing the table could take back was
       the last item binned, so an accidental nudge or resize was for ever.
       That, more than anything else, is what made the table feel like
       something to be careful around. */
    const meta = e.ctrlKey || e.metaKey;
    if (meta && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      if (M) (e.shiftKey ? M.redo() : M.undo());
      return;
    }
    if (meta && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); if (M) M.redo(); return; }

    if (e.key === 'Escape') {
      /* one step at a time: out of the field, then the lock, then the selection */
      if (inField()) { leaveField(); return; }
      if (lock) { unlock(false); return; }
      if (M && M.state.sel) M.select(null);
      return;
    }

    /* everything below acts on the selected piece */
    if (!M || !M.state.sel) return;
    const t = M.get(M.state.sel); if (!t) return;

    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault(); M.bin(t.id); return;
    }
    const ARROW = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (ARROW[e.key]) {
      e.preventDefault();
      const [dx, dy] = ARROW[e.key];
      M.nudge(t.id, dx, dy, e.shiftKey);   /* Shift = one unit instead of one grid step */
      return;
    }
    /* depth, both ways — it only ever went up before */
    if (e.key === ']') { e.preventDefault(); M.raise(t.id); return; }
    if (e.key === '[') { e.preventDefault(); M.lower(t.id); return; }
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
    /* RESIZE IS OPT-IN NOW. It used to take the wheel whenever the pointer
       happened to be over a piece, with no modifier and no undo — so the
       ordinary act of zooming out from something you were reading shrank
       the thing you were reading instead, permanently. Hold Alt to size a
       piece; the wheel on its own always means zoom, everywhere. */
    if (e.altKey && scaleUnder(e)) return;
    /* the ceiling leaves room ABOVE the field threshold, or the gesture that
       enters the field is also the gesture that hits the stop */
    /* THE FLOOR OF THE ZOOM USED TO BE THE END OF THE ROAD. At 0.18 the
       wheel simply stopped and the table sat there small and pointless.
       That last stretch is now where you push your chair back, so it goes
       down to 0.045 — but only out of a lock, because a locked scene is a
       board being read and has no seat to sit in. */
    const inward = e.deltaY < 0;
    if (!lock) {
      /* out: shrink to the floor, then keep going and lean back.
         in:  sit up first, then zoom. One gesture, in order. */
      if (!inward && T.k <= ZOOM_MIN * 1.001 && lean < 1) {
        lean = Math.min(1, lean + 0.11); seatCam(); apply(); return;
      }
      if (inward && lean > 0) {
        lean = Math.max(0, lean - 0.11); seatCam(); apply(); return;
      }
    }
    const floor = lock ? .18 : ZOOM_MIN;
    const k = Math.min(lock ? 5.2 : 1.8, Math.max(floor, T.k * (inward ? 1.10 : 1 / 1.10)));
    const vr = vp.getBoundingClientRect();
    const px = e.clientX - vr.left, py = e.clientY - vr.top;
    T.x = px - (px - T.x) * (k / T.k); T.y = py - (py - T.y) * (k / T.k); T.k = k;
    apply();
    /* zooming out about a corner walks the table off screen just as surely
       as dragging does, so the same rule applies after a wheel */
    if (holdOnTheTable()) apply();
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
