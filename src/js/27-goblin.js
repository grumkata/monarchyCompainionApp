/* ══════════════════════════════════════════════════════════════
   27-goblin.js — THE CHEESE, AND WHO LIVES IN IT.

   grumkata: "if you click the cheese it will shake a bit and if you click
   the cheese 3 times in a row it will shake allot and a goblin will appear
   jumping back and forth from foot too foot in a puff of confetti and if
   you click the goblin a dialog box will show up". And then: "make it so
   it can only happen once and once he gives you the treasure 3 appear on
   the side table leaning against the wall where the cheese used to be (it
   dissapears in a puff of smoke)".

   The cheese is the wheel on the long table by the left wall, which you
   see when you sit back and look round. 27-table-gl.js stands it on its
   own, out of the merged room, so it can move. Press it and it wobbles;
   press it three times running and it jumps, and a goblin bursts out of
   the top of it in confetti and lands beside it, hopping from foot to
   foot. Press him and he speaks. When he has said his piece the cheese
   goes up in smoke, his treasure stands where it was, and he goes the way
   he came. That happens once a sitting: after it the treasure is simply
   there, until the app is closed and the cheese is back again.

   He is drawn here, in code, as sixteen pictures of one hop, and stands in
   the room on the same card a person at the table stands on, lit the same
   way. Nobody else at the table sees him: he is yours.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

if (typeof THREE === 'undefined') return;

/* the goblin, drawn in a 200 x 250 box with his feet on y = 244. ph is where he is in one hop from foot to foot
   and back (0..1): lean > 0 is his weight on the right foot (yours), the left one up. o.blink shuts his eyes;
   o.shut closes his jaw, for the moments between words when he is talking. */
function drawGoblin(x, ph, o) {
  o = o || {};
  const f = ph * Math.PI * 2, lean = Math.sin(f), up = 1 - Math.abs(lean);
  const lL = Math.max(0, lean), lR = Math.max(0, -lean);
  const OL = '#1b3210', SK = '#78bd3f', SKD = '#4f8a27', SKL = '#a9dd6c';
  x.lineJoin = 'round'; x.lineCap = 'round';
  const skin = (cx, cy, r) => {
    const g = x.createRadialGradient(cx - r * .35, cy - r * .45, r * .1, cx, cy, r * 1.15);
    g.addColorStop(0, SKL); g.addColorStop(.45, SK); g.addColorStop(1, SKD);
    return g;
  };
  const line = (w, c) => { x.lineWidth = w; x.strokeStyle = c; x.stroke(); };
  const fillOut = (fs, w) => { x.fillStyle = fs; x.fill(); line(w || 3, OL); };
  /* a limb: an outline stroke, then the skin stroke inside it */
  const limb = (pts, w) => {
    x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]);
    line(w + 4.5, OL); line(w, SK);
  };
  const hx = 100 + lean * 6, hy = 182 - up * 2;

  /* ── legs and feet: the planted one straight under him, the other drawn up ── */
  const leg = (side, lift) => {
    const hip = [hx + side * 10, hy - 2];
    /* standing: knee bowed out, foot flat under him. up: knee out and high, the shin hanging under it */
    const k0 = [hip[0] + side * 13, hip[1] + 32], f0 = [100 + side * 23 + lean * 2, 241];
    const k1 = [hip[0] + side * 22, hip[1] + 14], f1 = [hip[0] + side * 17, hip[1] + 40];
    const mix = (a, b) => [a[0] + (b[0] - a[0]) * lift, a[1] + (b[1] - a[1]) * lift];
    const knee = mix(k0, k1), foot = mix(f0, f1);
    limb([hip, knee, [foot[0] - side * 2, foot[1] - 4]], 7.5);
    x.beginPath(); x.arc(knee[0], knee[1], 4.2, 0, 7); fillOut(skin(knee[0], knee[1], 4.2), 2.3);
    /* the foot: long, toes out, tipped down when it is off the ground */
    x.save(); x.translate(foot[0], foot[1]); x.rotate(side * lift * .45); x.scale(side, 1);
    x.beginPath(); x.ellipse(5, 0, 15, 6.5, 0, 0, 7); fillOut(skin(3, -2, 14), 2.5);
    for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(18 + i * .5, -3.5 + i * 3.6, 3.6, 0, 7); fillOut(skin(18, -4 + i * 3.6, 4), 2.2); }
    x.restore();
  };
  leg(-1, lL); leg(1, lR);

  /* ── everything above the hips leans a little away from the foot that is up ── */
  x.save(); x.translate(hx, hy); x.rotate(-lean * .07);

  /* the ears, behind the head, flapping with the hop */
  const ear = side => {
    x.save(); x.translate(0, -112); x.scale(side, 1); x.rotate(-up * .07 + (side * lean) * .05);
    x.beginPath(); x.moveTo(-36, -22); x.quadraticCurveTo(-63, -37, -85, -49); x.quadraticCurveTo(-72, -10, -36, 12); x.closePath();
    fillOut(skin(-60, -24, 34), 3);
    x.beginPath(); x.moveTo(-42, -14); x.quadraticCurveTo(-62, -30, -79, -41); x.quadraticCurveTo(-66, -12, -42, 4); x.closePath();
    const g = x.createLinearGradient(-80, -40, -42, 0); g.addColorStop(0, '#f2a59b'); g.addColorStop(1, '#c86f6e');
    x.fillStyle = g; x.fill();
    x.restore();
  };
  ear(-1); ear(1);

  /* the neck, the body: skinny, pot-bellied */
  x.beginPath(); x.rect(-7, -78, 14, 20); fillOut(SKD, 2.5);
  x.beginPath(); x.moveTo(-15, -64); x.bezierCurveTo(-27, -50, -31, -20, -20, -2); x.lineTo(20, -2); x.bezierCurveTo(31, -20, 27, -50, 15, -64); x.closePath();
  fillOut(skin(-4, -36, 32), 3);
  x.beginPath(); x.moveTo(-9, -50); x.quadraticCurveTo(-4, -46, -1, -48); x.moveTo(9, -50); x.quadraticCurveTo(4, -46, 1, -48); line(1.8, OL);
  x.beginPath(); x.arc(0, -20, 2.2, .3, 2.8); line(1.8, OL);

  /* the loincloth, ragged at the hem, and the rope that holds it up */
  x.beginPath(); x.moveTo(-23, -12); x.quadraticCurveTo(0, -8, 23, -12); x.lineTo(28, 14);
  const hem = [[24, 20], [19, 15], [14, 25], [8, 18], [2, 28], [-4, 19], [-10, 26], [-15, 17], [-21, 23], [-25, 15]];
  hem.forEach(p => x.lineTo(p[0], p[1] + Math.sin(f * 2 + p[0]) * 1.2));
  x.lineTo(-28, 14); x.closePath();
  const lc = x.createLinearGradient(-20, -12, 20, 26); lc.addColorStop(0, '#3e60aa'); lc.addColorStop(1, '#22386f');
  fillOut(lc, 3);
  x.beginPath(); x.moveTo(-12, -6); x.lineTo(-9, 14); x.moveTo(6, -6); x.lineTo(9, 18); x.moveTo(17, -8); x.lineTo(20, 10); line(1.6, '#1a2b55');
  x.beginPath(); x.moveTo(-24, -12); x.quadraticCurveTo(0, -6, 24, -12); line(8.5, OL); line(5.5, '#8a5a2b');
  for (let i = -20; i <= 20; i += 5) { x.beginPath(); x.moveTo(i - 1.5, -12.5 + Math.abs(i) * .05); x.lineTo(i + 1.5, -8.5 + Math.abs(i) * .05); line(1.2, '#5e3a17'); }
  x.beginPath(); x.moveTo(-9, -9); x.quadraticCurveTo(-13, 0, -11, 9); x.moveTo(-7, -9); x.quadraticCurveTo(-5, 1, -6, 7); line(5.5, OL); line(3, '#8a5a2b');
  x.beginPath(); x.arc(-8, -9, 4.2, 0, 7); fillOut('#8a5a2b', 2.2);

  /* ── the head ── */
  x.save(); x.translate(0, -112); x.rotate(lean * .05);
  x.beginPath(); x.moveTo(0, -44); x.bezierCurveTo(31, -44, 47, -26, 46, -4); x.bezierCurveTo(45, 20, 30, 42, 0, 45); x.bezierCurveTo(-30, 42, -45, 20, -46, -4); x.bezierCurveTo(-47, -26, -31, -44, 0, -44); x.closePath();
  fillOut(skin(-6, -10, 50), 3.2);
  /* spots */
  x.fillStyle = 'rgba(62,112,30,.55)';
  [[-22, -32, 4.2], [-12, -38, 2.6], [20, -34, 3.4], [30, -24, 2.4], [-34, 6, 3], [33, 10, 3.6], [26, 24, 2.2], [-6, -30, 2]].forEach(s => { x.beginPath(); x.arc(s[0], s[1], s[2], 0, 7); x.fill(); });
  /* the eyes: big, red, and up to something */
  const eye = side => {
    x.save(); x.translate(side * 17, -7);
    if (o.blink) {
      /* shut: the lid all the way down, creased in a smile */
      x.beginPath(); x.ellipse(0, 0, 13, 11.5, side * .12, 0, 7); x.fillStyle = SKD; x.fill(); line(2.6, OL);
      x.beginPath(); x.moveTo(-12, 0); x.quadraticCurveTo(0, 7, 12, 0); line(2.8, OL);
      x.restore(); return;
    }
    x.beginPath(); x.ellipse(0, 0, 13, 11.5, side * .12, 0, 7); x.fillStyle = '#fff6df'; x.fill();
    x.save(); x.clip();
    x.beginPath(); x.arc(-side * 3, 2, 7.2, 0, 7); x.fillStyle = '#c3161c'; x.fill();
    x.beginPath(); x.arc(-side * 3, 2, 7.2, 0, 7); line(1.4, '#5a0a0c');
    x.beginPath(); x.arc(-side * 3.4, 2.4, 3.3, 0, 7); x.fillStyle = '#140404'; x.fill();
    x.beginPath(); x.arc(-side * 1.2, -.6, 1.9, 0, 7); x.fillStyle = '#fff'; x.fill();
    /* the lid, slanted down to the middle: that is the whole of the mischief */
    x.beginPath(); x.moveTo(-16, -16); x.lineTo(16, -16); x.lineTo(16, side > 0 ? -9 : -2); x.lineTo(-16, side > 0 ? -2 : -9); x.closePath();
    x.fillStyle = SKD; x.fill();
    x.beginPath(); x.moveTo(-16, side > 0 ? -2 : -9); x.lineTo(16, side > 0 ? -9 : -2); line(2.6, OL);
    x.restore();
    x.beginPath(); x.ellipse(0, 0, 13, 11.5, side * .12, 0, 7); line(2.6, OL);
    x.restore();
  };
  eye(-1); eye(1);
  /* the brows, a heavy V */
  x.beginPath(); x.moveTo(-33, -26); x.quadraticCurveTo(-20, -27, -5, -16); x.moveTo(33, -26); x.quadraticCurveTo(20, -27, 5, -16); line(7, OL); line(3.6, SKD);
  /* the grin, ear to ear, with teeth in it (the jaw up, between words) */
  const mb = o.shut ? 33 : 44;
  x.save();
  x.beginPath(); x.moveTo(-29, 17); x.quadraticCurveTo(0, 29, 29, 17); x.quadraticCurveTo(18, mb, 0, mb); x.quadraticCurveTo(-18, mb, -29, 17); x.closePath();
  x.fillStyle = '#5b0f17'; x.fill();
  x.save(); x.clip();
  x.beginPath(); x.ellipse(0, mb - 2, 13, 7, 0, 0, 7); x.fillStyle = '#d65a6b'; x.fill();
  x.fillStyle = '#fffbe9'; x.strokeStyle = '#8b8160'; x.lineWidth = 1;
  for (let i = -24; i <= 22; i += 6.5) {
    const ty = 17 + (1 - (i / 29) ** 2) * 6 - 1.5;
    x.beginPath(); x.moveTo(i, ty - 3); x.lineTo(i + 6.5, ty - 3); x.lineTo(i + 3.2, ty + 5.5); x.closePath(); x.fill(); x.stroke();
  }
  [[-19, 1], [16, 1]].forEach(([fx2]) => { x.beginPath(); x.moveTo(fx2, mb - 3); x.lineTo(fx2 + 6, mb - 3); x.lineTo(fx2 + 3, mb - 13); x.closePath(); x.fill(); x.stroke(); });
  x.restore();
  x.beginPath(); x.moveTo(-29, 17); x.quadraticCurveTo(0, 29, 29, 17); x.quadraticCurveTo(18, mb, 0, mb); x.quadraticCurveTo(-18, mb, -29, 17); x.closePath(); line(2.8, OL);
  x.restore();
  x.beginPath(); x.moveTo(-31, 12); x.quadraticCurveTo(-34, 18, -30, 23); x.moveTo(31, 12); x.quadraticCurveTo(34, 18, 30, 23); line(2, OL);
  /* the nose, long and hooked over the grin */
  x.beginPath(); x.moveTo(-5, -6); x.quadraticCurveTo(-7, 6, -12, 13); x.quadraticCurveTo(-9, 22, 1, 21); x.quadraticCurveTo(11, 20, 9, 12); x.quadraticCurveTo(5, 5, 5, -6);
  const ng = x.createLinearGradient(-10, 0, 10, 20); ng.addColorStop(0, SKL); ng.addColorStop(1, SK);
  x.fillStyle = ng; x.fill(); x.beginPath(); x.moveTo(-5, -4); x.quadraticCurveTo(-7, 6, -12, 13); x.quadraticCurveTo(-9, 22, 1, 21); x.quadraticCurveTo(11, 20, 9, 12); line(2.6, OL);
  x.beginPath(); x.arc(-4, 16, 2, .5, 3.4); line(1.8, OL);
  x.restore();

  /* ── the arms, in front: skinny, clawed, swinging against the legs ── */
  const arm = (side, sw) => {
    const s = [side * 15, -58], e = [side * (37 + sw * 3), -38 + sw * 9], h = [side * (47 - sw * 4), -70 + sw * 16];
    limb([s, e, h], 6.5);
    x.save(); x.translate(h[0], h[1]); x.scale(side, 1); x.rotate(-.5 + sw * .25);
    for (let i = 0; i < 4; i++) {
      const a = -1.1 + i * .48, fx2 = Math.cos(a) * 15, fy2 = Math.sin(a) * 15;
      x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(Math.cos(a - .2) * 10, Math.sin(a - .2) * 10, fx2, fy2);
      line(6.5, OL); line(3.2, SK);
      x.beginPath(); x.moveTo(fx2, fy2); x.lineTo(fx2 + Math.cos(a + .9) * 4.5, fy2 + Math.sin(a + .9) * 4.5); line(3.4, OL); line(1.6, '#f3ead0');
    }
    x.beginPath(); x.arc(0, 0, 7, 0, 7); fillOut(skin(0, 0, 7), 2.4);
    x.restore();
  };
  arm(-1, -lean); arm(1, lean);
  x.restore();
}

const N = 16, HOP = 0.62, TALL = 0.42, LEAP = 0.62;   /* pictures in a hop; seconds a hop takes; his height in
                                                        metres; seconds his jump out of the cheese takes */
/* what he says, a line at a time. A word with a class says it in its own way (13-table-ui.css): the giggle
   giggles, the treasure is slimy. */
const LINES = [
  [['TeeHeeHee', 'gig'], [" You've Found Me!"]],
  [['For That You Have Earned My '], ['Slimy Goblin Treasure', 'goo']],
];
/* IT HAPPENS ONCE A SITTING. grumkata: "on each restart the goblin should reappear obviously". Once he has handed his
   treasure over the cheese is gone and the treasure stays where it was until the app is closed; open it again and the
   cheese is back, with him in it. Nothing is written down. (It was, for a while: that old mark is wiped here, so a
   copy that kept it gets its cheese back.) */
let done = false;
try { root.localStorage.removeItem('monarchy.goblin'); } catch (e) {}
const remember = () => { done = true; };

const egg = () => (root.TableGL && root.TableGL.egg ? root.TableGL.egg() : null);
const now = () => performance.now() / 1000;
const _v = new THREE.Vector3();
const spring = k => 1 + 2.9 * Math.pow(k - 1, 3) + 1.9 * Math.pow(k - 1, 2);   /* out, with an overshoot */
const easeIn = k => k * k * k, easeOut = k => 1 - Math.pow(1 - k, 3);
const smooth = k => k * k * (3 - 2 * k), clamp = k => Math.max(0, Math.min(1, k));
const rnd = (a, b) => a + Math.random() * (b - a);

/* the hop, drawn once and kept: as he is, with his eyes shut (a blink), and with his jaw up (talking). The blink
   and the jaw are half as many pictures — nobody counts the frames of a blink. */
const pics = {};
function hop(kind) {
  kind = kind || 'base';
  if (pics[kind]) return pics[kind];
  const n = kind === 'base' ? N : N / 2, o = { blink: kind === 'blink', shut: kind === 'shut' };
  const set = pics[kind] = [];
  for (let i = 0; i < n; i++) {
    const c = doc.createElement('canvas'); c.width = 256; c.height = 320;
    const x = c.getContext('2d'); x.scale(256 / 200, 320 / 250);
    drawGoblin(x, i / n, o);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
    set.push(t);
  }
  return set;
}
const picAt = (kind, ph) => { const set = hop(kind); return set[Math.floor(ph * set.length) % set.length]; };

/* ══ PRESSING THINGS IN THE ROOM ═══════════════════════════════
   Only a press on the room itself (#vp, where nothing of the table's is
   under the pointer), and only a press: a drag there turns your head. */
let down = null;
const onRoom = t => t && (t.id === 'vp' || t.id === 'tglu');
root.addEventListener('pointerdown', e => {
  down = e.button === 0 && onRoom(e.target) ? { x: e.clientX, y: e.clientY, t: now() } : null;
}, true);
root.addEventListener('pointerup', e => {
  const d = down; down = null;
  if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6 && now() - d.t < 0.6) press(e.clientX, e.clientY);
}, true);
/* a hand over him once he can be pressed, and over his treasure (the cheese gives nothing away) */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const aimAt = (E, px, py) => { ndc.set(px / root.innerWidth * 2 - 1, 1 - py / root.innerHeight * 2); ray.setFromCamera(ndc, E.camera); };
root.addEventListener('pointermove', e => {
  const vp = doc.getElementById('vp');
  if (!vp) return;
  let over = false, on = null;
  const him = gob && !gob.gave && now() > gob.land;
  /* not while the view is being dragged round */
  const E = onRoom(e.target) && !e.buttons && (him || lootMeshes.length) ? egg() : null;
  if (E) {
    aimAt(E, e.clientX, e.clientY);
    if (him) over = ray.intersectObject(gob.mesh, false).length > 0;
    if (!over && lootMeshes.length) { const h = ray.intersectObjects(lootMeshes, false)[0]; on = h ? h.object.userData.treasure : null; }
  }
  hot = on;
  over = over || !!on;
  if (vp.classList.contains('gob-hover') !== over) vp.classList.toggle('gob-hover', over);
}, { passive: true });
doc.addEventListener('mouseleave', () => { hot = null; });

let taps = 0, lastTap = 0, shake = null, due = 0, gob = null;
function press(px, py) {
  const E = egg();
  if (!E) return;
  aimAt(E, px, py);
  /* the nearest solid thing under the pointer, so a cheese behind a stool is behind the stool */
  const solid = [];
  E.room.traverseVisible(o => { if (o.isMesh && !o.userData.noHit) solid.push(o); });
  const hit = ray.intersectObjects(solid, false)[0];
  if (!hit) return;
  const t = now();
  if (hit.object.userData.treasure) { clickLoot(hit.object.userData.treasure, t); return; }
  if (gob && hit.object === gob.mesh) { if (say) advance(t); else talk(t); return; }
  if (hit.object.parent !== E.cheese || done || (gob && gob.gave)) return;
  taps = t - lastTap < 0.9 ? taps + 1 : 1;
  lastTap = t;
  const big = taps >= 3 && !gob && !due;
  if (big) { taps = 0; due = t + 0.55; }
  shake = { t0: t, y0: shake ? shake.y0 : E.cheese.position.y, x0: shake ? shake.x0 : E.cheese.position.x,
            dur: big ? 1.3 : 0.5, a: big ? 0.16 : 0.06, f: big ? 38 : 34, jog: big ? 0.012 : 0.007, hop: big ? 0.07 : 0 };
}

/* ══ THE CHEESE SHAKES ═════════════════════════════════════════
   Jogged side to side and tipped, and squashed like something soft; a hard
   shake also jumps it off the plate, tipping only while it is in the air so
   it never sinks into the board. */
function wobble(E, t) {
  const c = E.cheese, k = (t - shake.t0) / shake.dur;
  if (k >= 1) { c.rotation.set(0, 0, 0); c.scale.set(1, 1, 1); c.position.y = shake.y0; c.position.x = shake.x0; shake = null; return; }
  const d = (1 - k) * (1 - k), w = (t - shake.t0) * shake.f, up = Math.abs(Math.sin(w / 2));
  c.position.x = shake.x0 + Math.sin(w * 1.1) * shake.jog * d;
  c.position.y = shake.y0 + up * shake.hop * d;
  const tip = shake.hop ? up : 1;
  c.rotation.x = Math.sin(w) * shake.a * d * tip;
  c.rotation.z = Math.sin(w * 1.3 + 1) * shake.a * d * tip;
  const sq = shake.hop ? (up - 0.35) * 0.16 * d : -0.07 * Math.sin(Math.PI * clamp(k * 3)) ;
  c.scale.set(1 - sq * 0.5, 1 + sq, 1 - sq * 0.5);
}

/* ══ HE COMES OUT OF THE CHEESE ════════════════════════════════
   At the top of its last big jump he bursts out of the top of it in
   confetti, sails over and lands on the table beside it (between it and
   the apples), and starts to hop from foot to foot. */
function summon(E, t) {
  const c = E.cheese, y = shake ? shake.y0 : c.position.y;
  const at = new THREE.Vector3(c.position.x, y - 0.03, c.position.z + 0.4);
  const from = new THREE.Vector3(c.position.x, y + 0.02, c.position.z);
  const mat = E.card(); mat.map = hop()[4];
  hop('blink');                                      /* ready before the first blink */
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(TALL * 0.8, TALL).translate(0, TALL * (0.5 - 6 / 250), 0), mat);
  mesh.position.copy(from); mesh.scale.setScalar(0.001);
  const shadow = E.foot(); shadow.userData.noHit = 1; shadow.scale.setScalar(0.001);
  shadow.position.set(at.x, at.y + 0.003, at.z);
  E.room.add(mesh, shadow);
  gob = { mesh, shadow, at, from, t0: t, land: t + LEAP, landed: false, bye: 0, gave: 0, poof: 0, shown: 0 };
  burst(E, _v.set(from.x, y + 0.12, from.z), t, PER);
  puff(E, _v.set(from.x, y + 0.1, from.z), t, 6, 0.2);
}
function dance(E, t) {
  const g = gob, m = g.mesh;
  let s = 1, q = 0, pic, air = 0;
  if (t < g.land) {
    /* the jump: out, over, down */
    const u = (t - g.t0) / LEAP, h = smooth(u);
    m.position.set(g.from.x + (g.at.x - g.from.x) * h, g.from.y + (g.at.y - g.from.y) * u + Math.sin(Math.PI * u) * 0.2,
                   g.from.z + (g.at.z - g.from.z) * h);
    s = 0.25 + 0.75 * easeOut(clamp(u * 1.7));
    q = -0.12 * Math.sin(Math.PI * clamp(u * 1.5));        /* stretched as he flies */
    pic = hop()[4];
  } else {
    if (!g.landed) { g.landed = true; puff(E, g.at, t, 4, 0.12); g.blink = t + rnd(1.2, 2.5); }
    const k = t - g.land, ph = (k / HOP) % 1, sw = Math.abs(Math.sin(ph * Math.PI * 2));
    /* talking: his jaw goes up and down while the words are still coming. Blinking: every few seconds, briefly */
    const talking = say && !say.out && say.shown < say.chars.length && t > say.when[0];
    if (t > g.blink + 0.13) g.blink = t + rnd(2.2, 4.5);
    pic = talking && Math.floor(t * 11) % 2 ? picAt('shut', ph) : t > g.blink ? picAt('blink', ph) : picAt('base', ph);
    /* in the air as he changes feet, down on each one, and squashed a little as he lands */
    air = (1 - sw) * 0.045;
    q = 0.05 * Math.pow(sw, 10) + (k < 0.2 ? 0.18 * (1 - k / 0.2) : 0);
    /* and a jump for joy as the treasure appears */
    if (g.poof) { const j = (t - g.poof) / 0.55; if (j < 1) { air += Math.sin(Math.PI * j) * 0.085; q -= 0.08 * Math.sin(Math.PI * j); } }
    m.position.set(g.at.x, g.at.y + air, g.at.z);
  }
  if (g.bye) {
    const b = (t - g.bye) / 0.32;
    if (b >= 1) { E.room.remove(m, g.shadow); m.geometry.dispose(); m.material.dispose(); g.shadow.material.dispose(); gob = null; return; }
    s *= 1 - b * b;
  }
  m.material.map = pic;
  m.scale.set(Math.max(0.001, s * (1 + q * 0.5)), Math.max(0.001, s * (1 - q)), 1);
  /* turned to you about his upright, as the people at the table are */
  E.room.worldToLocal(_v.copy(E.camera.position));
  m.rotation.y = Math.atan2(_v.x - g.at.x, _v.z - g.at.z);
  /* shaking with it while he giggles */
  const gig = say && say.line === 0 && !say.out ? clamp(((say.when[9] || 0) + 0.7 - t) / 0.4) * clamp((t - say.when[0]) * 8) : 0;
  m.rotation.z = Math.sin(t * 47) * 0.07 * gig;
  const sh = (g.landed ? s : 0) * (1 - air * 6);
  g.shadow.scale.set(Math.max(0.001, 0.18 * sh), Math.max(0.001, 0.3 * sh), 1);
}

/* ══ CONFETTI, SMOKE AND GLINTS ════════════════════════════════
   Paper flung up out of where he is: it flutters down, lies on the table
   (or the floor, past its edge) for a while, and shrinks away. One pool;
   each burst takes the next part of it. Smoke is a cluster of soft balls
   that swell and thin; a glint is a four-pointed twinkle. */
const PAPER = ['#e8433a', '#f2c230', '#3f8ee8', '#5cc65a', '#ef6fb0', '#f5f0e6', '#a46be0', '#ff9a3c'];
const PER = 80;
let bits = null, sprites = [];
const dummy = new THREE.Object3D();
function burst(E, at, t, n) {
  if (!bits) {
    const all = PER * 2, mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.016, 0.028),
      new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), all);
    mesh.userData.noHit = 1; mesh.frustumCulled = false;
    const col = new THREE.Color();
    dummy.scale.setScalar(0); dummy.updateMatrix();
    for (let i = 0; i < all; i++) { mesh.setColorAt(i, col.set(PAPER[i % PAPER.length]).convertSRGBToLinear()); mesh.setMatrixAt(i, dummy.matrix); }
    bits = { mesh, next: 0, q: Array.from({ length: all }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), t0: -1, down: 0, top: 0, x0: 0 })) };
  }
  if (bits.mesh.parent !== E.room) E.room.add(bits.mesh);
  bits.mesh.visible = true;
  const top = gob ? gob.at.y : at.y;
  for (let j = 0; j < n; j++) {
    const q = bits.q[(bits.next + j) % bits.q.length], a = Math.random() * Math.PI * 2, sp = rnd(0.3, 1);
    q.p.set(at.x + rnd(-0.04, 0.04), at.y + rnd(0, 0.12), at.z + rnd(-0.04, 0.04));
    q.v.set(Math.cos(a) * sp, rnd(0.8, 1.7), Math.sin(a) * sp);
    q.r.set(rnd(0, 6), rnd(0, 6), rnd(0, 6));
    q.w.set(rnd(-9, 9), rnd(-9, 9), rnd(-9, 9));
    q.t0 = t; q.down = 0; q.top = top; q.x0 = at.x;
  }
  bits.next = (bits.next + n) % bits.q.length;
}
function flutter(t, dt) {
  let live = 0;
  bits.q.forEach((q, i) => {
    if (q.t0 < 0) return;
    const age = t - q.t0;
    if (!q.down) {
      q.v.y -= 3.4 * dt;
      q.v.multiplyScalar(Math.exp(-1.8 * dt));
      q.p.addScaledVector(q.v, dt);
      q.p.x += Math.sin(t * 7 + i) * 0.06 * dt;
      q.p.z += Math.cos(t * 6 + i * 1.7) * 0.06 * dt;
      q.r.x += q.w.x * dt; q.r.y += q.w.y * dt; q.r.z += q.w.z * dt;
      /* ponytail: "on the table" is the long table's depth either side of the cheese; a table under the cheese
         anywhere else in the room would want the plan asked instead */
      const floor = q.p.x > q.x0 - 0.58 && q.p.x < q.x0 + 0.38 ? q.top : q.top - 0.85;
      if (q.p.y <= floor + 0.002 && q.v.y < 0) { q.p.y = floor + 0.002; q.down = t; q.r.set(-Math.PI / 2, 0, rnd(0, 6)); }
    }
    const gone = Math.max(age - 9, q.down ? t - q.down - 6 : -1);
    const s = gone > 0 ? Math.max(0, 1 - gone / 0.6) : 1;
    if (s <= 0) q.t0 = -1; else live++;
    dummy.position.copy(q.p); dummy.rotation.copy(q.r); dummy.scale.setScalar(s); dummy.updateMatrix();
    bits.mesh.setMatrixAt(i, dummy.matrix);
  });
  bits.mesh.instanceMatrix.needsUpdate = true;
  if (!live) bits.mesh.visible = false;
  return live > 0;
}
/* the two little pictures the smoke and the glints are made of */
let ballTex = null, glintTex = null, emberTex = null;
function pictures() {
  if (ballTex) return;
  let c = doc.createElement('canvas'); c.width = c.height = 128;
  let x = c.getContext('2d');
  /* a ball of cartoon smoke: round, soft at the rim, lit from above */
  let g = x.createRadialGradient(54, 48, 4, 64, 64, 62);
  g.addColorStop(0, 'rgba(255,253,248,1)'); g.addColorStop(0.55, 'rgba(232,226,216,.95)');
  g.addColorStop(0.82, 'rgba(196,188,176,.7)'); g.addColorStop(1, 'rgba(180,170,160,0)');
  x.fillStyle = g; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill();
  ballTex = new THREE.CanvasTexture(c); ballTex.encoding = THREE.sRGBEncoding;
  c = doc.createElement('canvas'); c.width = c.height = 128; x = c.getContext('2d');
  g = x.createRadialGradient(64, 64, 0, 64, 64, 30);
  g.addColorStop(0, 'rgba(255,250,225,1)'); g.addColorStop(1, 'rgba(255,220,140,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  x.globalCompositeOperation = 'lighter';
  [[1, 0.09], [0, 0.09]].forEach(([hz]) => {
    const lg = hz ? x.createLinearGradient(0, 64, 128, 64) : x.createLinearGradient(64, 0, 64, 128);
    lg.addColorStop(0, 'rgba(255,230,160,0)'); lg.addColorStop(0.5, 'rgba(255,252,235,1)'); lg.addColorStop(1, 'rgba(255,230,160,0)');
    x.fillStyle = lg;
    x.beginPath();
    if (hz) { x.moveTo(0, 64); x.lineTo(64, 60); x.lineTo(128, 64); x.lineTo(64, 68); }
    else { x.moveTo(64, 0); x.lineTo(68, 64); x.lineTo(64, 128); x.lineTo(60, 64); }
    x.fill();
  });
  glintTex = new THREE.CanvasTexture(c); glintTex.encoding = THREE.sRGBEncoding;
  /* a soft hot spot, coloured by whoever uses it */
  c = doc.createElement('canvas'); c.width = c.height = 64; x = c.getContext('2d');
  g = x.createRadialGradient(32, 32, 0, 32, 32, 31);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  emberTex = new THREE.CanvasTexture(c);
}
/* n balls of smoke round `at`, each swelling to about `size` across */
function puff(E, at, t, n, size) {
  pictures();
  for (let i = 0; i < n; i++) {
    /* tinted to the room's own light, or it glows like a lamp in a dark tavern */
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ballTex, color: 0xcdbfa9, transparent: true, depthWrite: false, opacity: 0 }));
    const a = Math.random() * Math.PI * 2, r = rnd(0.2, 0.55) * size;
    s.position.set(at.x + Math.cos(a) * r, at.y + rnd(0.15, 0.6) * size, at.z + Math.sin(a) * r);
    s.material.rotation = rnd(0, 6);
    s.userData = { kind: 'smoke', t0: t + rnd(0, 0.07), life: rnd(0.55, 0.9), size: size * rnd(0.6, 1.1), rise: rnd(0.05, 0.14) * size, y0: s.position.y };
    E.room.add(s); sprites.push(s);
  }
}
function glint(E, at, t, size, delay) {
  pictures();
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glintTex, transparent: true, depthWrite: false, opacity: 0,
                                                         blending: THREE.AdditiveBlending, fog: false }));
  s.position.copy(at);
  s.userData = { kind: 'glint', t0: t + (delay || 0), life: rnd(0.45, 0.7), size, spin: rnd(-1.5, 1.5) };
  E.room.add(s); sprites.push(s);
}
function stepSprites(E, t) {
  sprites = sprites.filter(s => {
    const d = s.userData, k = (t - d.t0) / d.life;
    if (k >= 1) { E.room.remove(s); s.material.dispose(); return false; }
    if (k < 0) { s.material.opacity = 0; return true; }
    if (d.kind === 'smoke') {
      s.scale.setScalar(d.size * (0.35 + 0.65 * easeOut(k)));
      s.material.opacity = 0.92 * clamp(k * 8) * (1 - easeIn(k));
      s.position.y = d.y0 + d.rise * easeOut(k);
    } else if (d.kind === 'ember') {
      /* rising off the hot case, flickering out */
      s.scale.setScalar(d.size * (1 - k * 0.6));
      s.material.opacity = Math.min(1, k * 6) * (1 - k) * (0.7 + 0.3 * Math.sin(t * 40 + d.drift * 9));
      s.position.set(d.x0 + Math.sin(k * 5 + d.drift * 3) * 0.008, d.y0 + k * 0.09, d.z0 + d.drift * k * 0.02);
    } else {
      const w = Math.sin(Math.PI * k);
      s.scale.setScalar(d.size * (0.2 + 0.8 * w));
      s.material.opacity = w;
      s.material.rotation = d.spin * k;
    }
    return true;
  });
  return sprites.length > 0;
}

/* ══ HIS TREASURE ══════════════════════════════════════════════
   The cheese goes in a puff of smoke, and where it stood the three things
   he had in there come up one after another, leaning against the wall at
   the back of the table, each with a puff and a twinkle. They stay. Now and
   then one of them catches the light. */
/* where each one stands, from the cheese's own spot: along the wall (dz), how tall it is, how far it leans back
   against the wall, and which way it faces. The models are baked into GOBLIN_LOOT (27-goblin-loot.js). */
const SPOTS = [
  { k: 'star', dz: 0.07, tall: 0.17, lean: 0.10, yaw: 0, up: 0.8 },
  { k: 'cd', dz: -0.14, tall: 0.16, lean: 0.20, yaw: 0, up: 0.7 },
  { k: 'gun', dz: -0.34, tall: 0.78, lean: 0.30, yaw: 0, up: 0.3 },
];
let loot = null, lootMeshes = [], gleam = 0, hot = null;
const SHADE = { star: [0.075, 0.21], cd: [0.055, 0.18], gun: [0.09, 0.08] };   /* its shadow, out from the wall by along it */
const DYE = new THREE.Color(0.34, 0.29, 0.23);
const TAU = Math.PI * 2;
const easeIO = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
function lootModel(L) {
  const g = new THREE.Group(), box = new THREE.Box3(), parts = {};
  for (const pr of L.prims) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pr.p, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(pr.n, 3));
    if (pr.u) geo.setAttribute('uv', new THREE.Float32BufferAttribute(pr.u, 2));
    geo.setIndex(pr.i);
    /* the star's gold is the game's own sheen, read off the way it faces you (a matcap: the N64 did the same);
       its eyes are flat paint; everything else is lit by the room */
    const col = new THREE.Color(pr.c || '#ffffff').convertSRGBToLinear();
    /* lit things take the dye every prop in the tavern takes (27-table-gl.js DRESS.tavern): the room is lit hard
       and its colours brought down to meet it, and a shotgun at full colour beside them reads as bleached */
    if (!pr.k) col.multiply(DYE);
    const mat = pr.k === 'matcap' ? new THREE.MeshMatcapMaterial({ color: col })
              : pr.k === 'basic' ? new THREE.MeshBasicMaterial({ color: col })
              : new THREE.MeshStandardMaterial({ color: col, roughness: pr.r == null ? 0.7 : pr.r, metalness: pr.m || 0,
                                                 /* the room's reflections, not the table's studio: as the wood's are, sat back (27-table-gl.js roomLook) */
                                                 envMapIntensity: 0.2 });
    if (pr.a != null) { mat.transparent = true; mat.opacity = pr.a; mat.depthWrite = pr.a >= 1; }
    if (pr.d) mat.side = THREE.DoubleSide;
    if (pr.t && L.tex && L.tex[pr.t]) {
      const tx = new THREE.TextureLoader().load(L.tex[pr.t], () => { const T = root.TableGL; if (T && T.invalidate) T.invalidate(3); });
      tx.encoding = THREE.sRGBEncoding; tx.flipY = false;
      if (pr.k === 'matcap') mat.matcap = tx; else mat.map = tx;
    }
    const mesh = new THREE.Mesh(geo, mat);
    if (pr.a != null && pr.a < 1) mesh.renderOrder = 2;     /* the clear plastic after what is behind it */
    if (pr.part) parts[pr.part] = mesh;
    g.add(mesh);
  }
  box.setFromObject(g);
  return { g, box, parts };
}
function placeLoot(E, t, pop) {
  const LOOT = root.GOBLIN_LOOT;
  const c = E.cheese, base = c.position.y - 0.03, wall = c.position.x - 0.53;
  loot = []; lootMeshes = [];
  SPOTS.forEach((sp, i) => {
    if (!LOOT || !LOOT[sp.k]) return;
    const { g, box, parts } = lootModel(LOOT[sp.k]);
    const size = box.getSize(new THREE.Vector3()), k = sp.tall / size.y;
    /* stood on its own foot, its middle over the spot */
    const inner = new THREE.Group();
    g.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
    inner.add(g); inner.scale.setScalar(k); inner.rotation.y = sp.yaw;
    /* leaning back against the wall: the foot out from it by as much as the lean takes the top in */
    const o = new THREE.Group();
    o.add(inner);
    const x0 = wall + Math.sin(sp.lean) * sp.tall + 0.02;
    o.rotation.z = sp.lean;
    o.position.set(x0, base, c.position.z + sp.dz);
    o.userData = { kind: sp.k, inner, g, parts, yaw: sp.yaw, lean: sp.lean, up: sp.up, x0, y0: base, tall: sp.tall, k,
                   at: new THREE.Vector3(x0 - Math.sin(sp.lean) * sp.tall * 0.5, base + sp.tall * 0.55, c.position.z + sp.dz),
                   pop: pop ? t + 0.45 + i * 0.24 : 0, h: 0, a: 0, w: 0, was: false, ev: 0 };
    o.traverse(m => { if (m.isMesh) { m.userData.treasure = o; lootMeshes.push(m); } });
    /* a soft dark patch where it touches the table, which pales as it lifts off */
    const sh = E.foot();
    sh.userData.noHit = 1; sh.userData.s = SHADE[sp.k];
    sh.position.set(x0 - Math.sin(sp.lean) * sp.tall * 0.22, base + 0.002, c.position.z + sp.dz);
    E.room.add(sh); o.userData.shadow = sh;
    /* the Doom case smoulders while you hold your hand over it */
    if (sp.k === 'cd') {
      pictures();
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: emberTex, color: 0xff4a12, transparent: true, depthWrite: false,
                                                                opacity: 0, blending: THREE.AdditiveBlending, fog: false }));
      glow.scale.setScalar(0.42); glow.position.set(-0.035, sp.tall * 0.5, 0); glow.renderOrder = 1;
      o.add(glow); o.userData.glow = glow;
    }
    if (pop) o.scale.setScalar(0.001);
    E.room.add(o); loot.push(o);
  });
  gleam = t + rnd(2, 4);
}

/* ══ UNDER YOUR HAND ═══════════════════════════════════════════
   Each of the three comes up off the wall a little when the pointer is on
   it, and does its own thing:

     the star     spins, the way a star waiting to be collected spins, and
                  twinkles; let go, it slows and comes round to face you;
                  pressed, it jumps for joy in a burst of sparkle
     the CD       turns over once to show you both sides, and the Doom on
                  its front smoulders red behind it; pressed, it takes you in
     the shotgun  racks: the grip goes back and forward and a spent red shell
                  jumps out of the side and clatters onto the table */
function stepLoot(E, t, dt) {
  let busy = false;
  for (const o of loot) {
    const u = o.userData, sh = u.shadow, ss = o.scale.x * (1 - 0.3 * smooth(u.h));
    sh.visible = o.visible;
    sh.scale.set(Math.max(0.001, u.shadow.userData.s[0] * ss), Math.max(0.001, u.shadow.userData.s[1] * ss), 1);
    sh.material.opacity = 1 - 0.6 * smooth(u.h);
    if (u.pop) {
      if (t < u.pop) { busy = true; continue; }
      if (!u.popped) {
        u.popped = true;
        puff(E, _v.copy(u.at).setY(o.position.y), t, 5, 0.16);
        for (let i = 0; i < 4; i++) glint(E, _v.copy(u.at).add(new THREE.Vector3(0, rnd(-0.06, 0.08), rnd(-0.08, 0.08))), t, rnd(0.06, 0.11), 0.15 + i * 0.12);
      }
      const k = (t - u.pop) / 0.5;
      o.scale.setScalar(k >= 1 ? 1 : Math.max(0.001, spring(k)));
      if (k >= 1) u.pop = 0; else { busy = true; continue; }
    }
    const want = o === hot ? 1 : 0;
    if (want && !u.was) u.start = t;                      /* the moment the hand arrived */
    u.was = !!want;
    u.h += (want - u.h) * Math.min(1, dt * (want ? 9 : 5));
    if (Math.abs(want - u.h) < 0.002) u.h = want;
    const h = smooth(u.h);
    /* up off the wall: straighter, raised, a finger's width out into the room */
    o.rotation.z = u.lean * (1 - u.up * h);
    o.position.set(u.x0 + 0.022 * h, u.y0 + 0.032 * h, o.position.z);
    if (ANIM[u.kind](E, o, u, t, dt, h, want)) busy = true;
    if (u.h > 0) busy = true;
  }
  /* now and then, one of them catches the light */
  if (loot.length && t > gleam) {
    const o = loot[Math.floor(Math.random() * loot.length)];
    glint(E, _v.copy(o.userData.at).add(new THREE.Vector3(0, rnd(-0.3, 0.4) * o.userData.tall, rnd(-0.04, 0.04))), t, rnd(0.05, 0.08), 0);
    gleam = t + rnd(2.5, 5.5);
  }
  if (shells.length && stepShells(E, t, dt)) busy = true;
  return busy;
}
/* a point on a treasure, in the room: (across its face, up it, out of it), in metres of the thing as it stands */
function onLoot(o, x, y, z) {
  _v.set(z, y, x).divideScalar(o.userData.k);
  o.userData.inner.localToWorld(_v);
  return o.parent.worldToLocal(_v);
}
const ANIM = {
  star(E, o, u, t, dt, h, want) {
    /* jumping for joy, when pressed: up and down, and spun hard */
    let jump = 0;
    if (u.ev) {
      const k = (t - u.ev) / 0.95;
      if (k >= 1) u.ev = 0;
      else jump = Math.sin(Math.PI * k) * 0.11 * (1 - k * 0.3);
    }
    if (want || u.ev) { u.w += ((u.ev ? 16 : 4.4) - u.w) * Math.min(1, dt * (u.ev ? 6 : 3)); u.goal = null; }
    else if (u.w > 0) {
      /* let go: slows so as to stop exactly facing you */
      if (u.goal == null) u.goal = Math.ceil((u.a + u.w * u.w / 12 + 0.3) / TAU) * TAU;
      const d = u.goal - u.a;
      u.w = Math.min(u.w, Math.sqrt(Math.max(0, 12 * d)));
      if (d < 0.003 || u.w < 0.01) { u.a = u.goal; u.w = 0; }
    }
    u.a += u.w * dt;
    if (!u.w && u.a > 1000) u.a %= TAU;
    u.inner.rotation.y = u.yaw + u.a;
    o.position.y += Math.sin(t * 3.1) * 0.006 * h + jump;
    /* twinkling round it while it spins */
    if ((want || u.ev) && t > (u.tw || 0)) {
      u.tw = t + (u.ev ? 0.05 : 0.17);
      const a = rnd(0, TAU), r = rnd(0.06, 0.12);
      glint(E, onLoot(o, Math.cos(a) * r, 0.09 + Math.sin(a) * r, rnd(-0.02, 0.04)), t, rnd(0.03, 0.06), 0);
    }
    return u.w > 0 || !!u.ev;
  },
  cd(E, o, u, t, dt, h, want) {
    /* turned over once to show its back, each time the hand comes to it */
    if (want && u.start === t) u.flip = t;
    let a = 0;
    if (u.flip) {
      const k = (t - u.flip) / 0.95;
      if (k >= 1) u.flip = 0; else a = TAU * easeIO(k);
    }
    u.inner.rotation.y = u.yaw + a + Math.sin(t * 2.2) * 0.1 * h * (u.flip ? 0 : 1);
    /* hell, behind it */
    const glow = u.glow;
    glow.material.opacity = h * (0.5 + 0.22 * Math.sin(t * 6.3) + 0.12 * Math.sin(t * 15.7));
    glow.scale.setScalar(0.36 + 0.05 * Math.sin(t * 4.1) + 0.06 * h);
    if (want && t > (u.tw || 0)) {
      u.tw = t + 0.22;
      ember(E, onLoot(o, rnd(-0.07, 0.07), rnd(0, 0.06), -0.02), t);
    }
    return !!u.flip;
  },
  gun(E, o, u, t, dt, h, want) {
    /* racked when the hand arrives, and again when pressed */
    if (want && u.start === t) u.ev = t + 0.15;
    let back = 0, kick = 0;
    if (u.ev && t >= u.ev) {
      const k = (t - u.ev) / 0.46;
      if (k >= 1) u.ev = 0;
      else {
        back = k < 0.36 ? easeOut(k / 0.36) : 1 - easeIn((k - 0.36) / 0.64);
        kick = Math.sin(Math.PI * clamp(k * 1.6)) * (1 - k);
        if (k >= 0.36 && !u.ejected) { u.ejected = true; eject(E, o, t); }
      }
    }
    if (!u.ev) u.ejected = false;
    const grip = u.parts.pump;
    if (grip) grip.position.y = -0.42 * back;
    u.inner.rotation.y = u.yaw + Math.sin(t * 1.7) * 0.06 * h;
    o.rotation.z -= 0.035 * kick;
    return !!u.ev;
  },
};
function clickLoot(o, t) {
  const u = o.userData;
  if (u.pop) return;
  if (u.kind === 'star') {
    /* into Bob-omb Battlefield (27-bob.js): the star leaves the table and flies at you, so the one here steps aside
       and comes back, in a puff, when you do */
    if (root.BobStar && !root.BobStar.on && !(root.DoomCD && root.DoomCD.on)) {
      const E = egg(), r = screenBox(E, o);
      hot = null; o.visible = false;
      root.BobStar.enter(r, root.GOBLIN_LOOT.star, () => {
        const E2 = egg(), t2 = now();
        o.visible = true;
        if (!E2) return;
        puff(E2, _v.copy(u.at), t2, 7, 0.16);
        for (let i = 0; i < 6; i++) glint(E2, _v.copy(u.at).add(new THREE.Vector3(0, rnd(-0.05, 0.08), rnd(-0.08, 0.08))), t2, rnd(0.05, 0.09), 0.1 + i * 0.07);
        u.ev = t2;
      });
    } else u.ev = t;
    return;
  }
  if (u.kind === 'gun') { if (!u.ev) u.ev = t; return; }
  if (u.kind === 'cd' && root.DoomCD && !root.DoomCD.on && !(root.BobStar && root.BobStar.on)) {
    const E = egg(), r = screenBox(E, o);
    hot = null;
    /* in through the cover (27-doom.js), which is drawn over the case from the first moment, so the case itself
       steps aside; and when you come back out, it spits you out in a puff */
    o.visible = false;
    root.DoomCD.enter(r, root.GOBLIN_LOOT.cd.tex.cover, () => {
      const E2 = egg(), t2 = now();
      o.visible = true;
      if (!E2) return;
      puff(E2, _v.copy(u.at), t2, 7, 0.16);
      for (let i = 0; i < 5; i++) glint(E2, _v.copy(u.at).add(new THREE.Vector3(0, rnd(-0.05, 0.07), rnd(-0.07, 0.07))), t2, rnd(0.05, 0.09), 0.1 + i * 0.08);
      u.flip = t2;
    });
  }
}
/* where a treasure is on the screen, as a box (the thing itself: not the glow behind it) */
function screenBox(E, o) {
  o.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(o.userData.inner), c = [];
  for (let i = 0; i < 8; i++) {
    _v.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).project(E.camera);
    c.push([(_v.x * 0.5 + 0.5) * root.innerWidth, (0.5 - _v.y * 0.5) * root.innerHeight]);
  }
  const xs = c.map(p => p[0]), ys = c.map(p => p[1]);
  return { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) };
}

/* ══ EMBERS AND SHELLS ═════════════════════════════════════════ */
function ember(E, at, t) {
  pictures();
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: emberTex, color: 0xff7a26, transparent: true, depthWrite: false,
                                                         opacity: 0, blending: THREE.AdditiveBlending, fog: false }));
  s.position.copy(at);
  s.userData = { kind: 'ember', t0: t, life: rnd(0.8, 1.3), size: rnd(0.012, 0.022), y0: at.y, x0: at.x, z0: at.z, drift: rnd(-1, 1) };
  E.room.add(s); sprites.push(s);
}
/* a spent shotgun shell: red paper, brass base. It jumps out of the side of the gun, falls, bounces once on the
   table and lies there a while before it goes. Never more than a handful at once. */
let shells = [], shellParts = null;
function eject(E, o, t) {
  if (!shellParts) {
    const red = new THREE.MeshStandardMaterial({ color: new THREE.Color('#c0261b').convertSRGBToLinear().multiply(DYE).multiplyScalar(1.6), roughness: 0.55, envMapIntensity: 0.2 });
    const brass = new THREE.MeshStandardMaterial({ color: new THREE.Color('#d9ab4a').convertSRGBToLinear().multiply(DYE).multiplyScalar(1.6), roughness: 0.3, metalness: 0.8, envMapIntensity: 0.4 });
    shellParts = { body: new THREE.CylinderGeometry(0.0085, 0.0085, 0.03, 12).translate(0, 0.006, 0), cap: new THREE.CylinderGeometry(0.009, 0.009, 0.009, 12).translate(0, -0.0135, 0), red, brass };
  }
  if (shells.length >= 6) { const old = shells.shift(); E.room.remove(old); }
  const s = new THREE.Group();
  s.add(new THREE.Mesh(shellParts.body, shellParts.red), new THREE.Mesh(shellParts.cap, shellParts.brass));
  s.position.copy(onLoot(o, 0, o.userData.tall * 0.4, 0.03));
  s.rotation.set(rnd(0, 6), rnd(0, 6), rnd(0, 6));
  s.userData = { v: new THREE.Vector3(rnd(0.5, 0.8), rnd(0.6, 0.9), rnd(-0.25, 0.25)), w: new THREE.Vector3(rnd(-14, 14), rnd(-4, 4), rnd(-14, 14)),
                 floor: o.userData.y0 + 0.009, bounced: false, rest: 0, t0: t };
  E.room.add(s); shells.push(s);
}
function stepShells(E, t, dt) {
  shells = shells.filter(s => {
    const u = s.userData;
    if (!u.rest) {
      u.v.y -= 9.8 * dt;
      s.position.addScaledVector(u.v, dt);
      s.rotation.x += u.w.x * dt; s.rotation.y += u.w.y * dt; s.rotation.z += u.w.z * dt;
      if (s.position.y <= u.floor && u.v.y < 0) {
        s.position.y = u.floor;
        if (!u.bounced) { u.bounced = true; u.v.multiplyScalar(0.35); u.v.y = -u.v.y; u.w.multiplyScalar(0.4); }
        else { u.rest = t; s.rotation.set(Math.PI / 2, rnd(0, 6), 0, 'YXZ'); }
      }
    }
    const gone = u.rest ? t - u.rest - 7 : -1;
    if (gone > 0) {
      const k = 1 - gone / 0.5;
      if (k <= 0) { E.room.remove(s); return false; }
      s.scale.setScalar(k);
    }
    return true;
  });
  return shells.some(s => !s.userData.rest || t - s.userData.rest > 7);
}
/* the handing over: the words are done; the cheese goes, the treasure comes, he goes */
function give(E, t) {
  const g = gob, k = t - g.gave;
  if (k < 0) return;
  const c = E.cheese;
  if (!g.poof) {
    g.poof = t; remember();
    puff(E, _v.set(c.position.x, c.position.y + 0.02, c.position.z), t, 14, 0.34);
    placeLoot(E, t, true);
  }
  const u = (t - g.poof) / 0.26;
  if (c.visible) {
    if (u >= 1) { c.visible = false; c.scale.set(1, 1, 1); c.rotation.set(0, 0, 0); }
    else { const s = 1 - easeIn(u) * 0.97; c.scale.set(s * (1 + u * 0.3), s, s * (1 + u * 0.3)); c.rotation.y = u * 1.4; }
  }
  if (!g.bye && k > 1.9) { g.bye = t; burst(E, _v.set(g.at.x, g.at.y + 0.1, g.at.z), t, PER); puff(E, g.at, t, 6, 0.2); }
}

/* ══ WHAT HE SAYS ══════════════════════════════════════════════
   A speech bubble out of his mouth, inked like he is and following him
   about as you look round. The words come a letter at a time and each one
   pops in; a press finishes the line, the next moves on, and after the last
   the bubble closes and he hands the treasure over.

   The bubble and its tail are one drawn outline (an SVG path worked out
   every frame from where his mouth is on the screen), with the words laid
   over it in the page. Each line is laid out in full before it starts, so
   the bubble is its final size from the first letter and nothing reflows. */
let say = null;
const NS = 'http://www.w3.org/2000/svg';
function talk(t) {
  if (!gob || gob.gave || gob.bye || say || t < gob.land) return;
  const box = doc.createElement('div');
  box.id = 'gob-say'; box.className = 'on'; box.hidden = true;      /* shown only at the table (13-table-ui.css) */
  box.innerHTML = '<div class="gs-in"><svg><defs><linearGradient id="gs-paper" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#f1e3c2"/></linearGradient></defs>' +
    '<path class="gs-drop"/><path class="gs-body"/></svg><div class="gs-txt"></div></div>';
  doc.body.appendChild(box);
  const q = s => box.querySelector(s);
  say = { box, inn: q('.gs-in'), body: q('.gs-body'), drop: q('.gs-drop'), txt: q('.gs-txt'), t0: t, out: 0, w: 0, h: 0 };
  say.txt.addEventListener('pointerdown', e => e.stopPropagation());
  say.txt.addEventListener('click', () => advance(now()));
  line(0, t);
}
function line(i, t) {
  const s = say;
  s.line = i; s.chars = []; s.when = []; s.shown = 0; s.lt = t;
  s.txt.textContent = '';
  let at = t + (i ? 0.1 : 0.3), n = 0;
  for (const [text, cls] of LINES[i]) {
    const part = doc.createElement('span');
    if (cls) part.className = cls;
    text.split(/( )/).forEach(word => {
      if (!word) return;
      if (word === ' ') { part.appendChild(doc.createTextNode(' ')); at += 0.03; return; }
      const w = doc.createElement('span'); w.className = 'w';
      for (const ch of word) {
        const c = doc.createElement('span'), g = doc.createElement('span');
        c.className = 'c'; g.textContent = ch; g.style.setProperty('--i', n++);
        c.appendChild(g); w.appendChild(c);
        s.chars.push(c); s.when.push(at);
        at += /[!,.]/.test(ch) ? 0.28 : 0.036;
      }
      part.appendChild(w);
    });
    s.txt.appendChild(part);
  }
  s.more = doc.createElement('i'); s.more.className = 'gs-more';
  s.txt.appendChild(s.more);
  s.w0 = s.w; s.h0 = s.h;
  s.w = s.txt.offsetWidth; s.h = s.txt.offsetHeight;
}
function advance(t) {
  const s = say;
  if (!s || s.out) return;
  if (s.shown < s.chars.length) { s.when = s.when.map(() => t); return; }        /* finish the line */
  if (s.line < LINES.length - 1) { line(s.line + 1, t); return; }
  s.out = t;                                                                     /* and done */
  if (gob) gob.gave = t + 0.25;
  const vp = doc.getElementById('vp');
  if (vp) vp.classList.remove('gob-hover');
}
/* and from the keyboard: Enter or Space moves him on, unless something is being written in */
root.addEventListener('keydown', e => {
  if (!say || say.out || (e.key !== 'Enter' && e.key !== ' ')) return;
  const a = e.target;
  if (a && a.matches && a.matches('input,textarea,select,[contenteditable="true"]')) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (!e.repeat) advance(now());
}, true);
/* a point in front of him (lx across, ly up, metres, about where he stands) on the screen */
function onScreen(E, lx, ly) {
  const g = gob, ry = g.mesh.rotation.y;
  _v.set(g.at.x + Math.cos(ry) * lx, g.at.y + ly, g.at.z - Math.sin(ry) * lx);
  E.room.localToWorld(_v); _v.project(E.camera);
  return { x: (_v.x * 0.5 + 0.5) * root.innerWidth, y: (0.5 - _v.y * 0.5) * root.innerHeight, ok: _v.z < 1 };
}
function speak(E, t) {
  const s = say;
  if (s.out && t - s.out > 0.2) { s.box.remove(); say = null; return; }
  while (s.shown < s.chars.length && t >= s.when[s.shown]) s.chars[s.shown++].classList.add('on');
  s.more.classList.toggle('on', s.shown >= s.chars.length);
  if (!gob) return;
  /* the side of him with more room, inside the view */
  const vp = doc.getElementById('vp'), R = vp ? vp.getBoundingClientRect() : { left: 0, top: 0, right: root.innerWidth, bottom: root.innerHeight };
  const mouth = onScreen(E, 0, 0.27), side = mouth.x < (R.left + R.right) / 2 ? 1 : -1;
  const tip = onScreen(E, 0.1 * side, 0.29), corner = onScreen(E, 0.15 * side, 0.47);
  const k = smooth(clamp((t - s.lt) / 0.22)), w = s.w0 ? s.w0 + (s.w - s.w0) * k : s.w, h = s.h0 ? s.h0 + (s.h - s.h0) * k : s.h;
  let x = side > 0 ? corner.x : corner.x - w, y = corner.y - h;
  x = Math.max(R.left + 10, Math.min(R.right - w - 10, x));
  y = Math.max(R.top + 10, Math.min(R.bottom - h - 10, y));
  s.txt.style.left = x + 'px'; s.txt.style.top = y + 'px';
  /* the outline: a rounded box, and the tail let out of its bottom edge towards his mouth */
  const r = Math.min(20, h / 2), b = y + h, tw = 12;
  const bx = Math.max(x + r + tw + 2, Math.min(x + w - r - tw - 2, side > 0 ? x + 36 : x + w - 36));
  const T = { x: tip.x, y: Math.max(b + 14, tip.y) }, my = b + (T.y - b) * 0.45;
  const d = `M${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${b - r}Q${x + w},${b} ${x + w - r},${b}` +
            `H${bx + tw}Q${bx + tw * 0.4 + (T.x - bx) * 0.3},${my} ${T.x},${T.y}Q${bx - tw * 0.2 + (T.x - bx) * 0.25},${my} ${bx - tw},${b}` +
            `H${x + r}Q${x},${b} ${x},${b - r}V${y + r}Q${x},${y} ${x + r},${y}Z`;
  s.body.setAttribute('d', d); s.drop.setAttribute('d', d);
  /* it springs out of his mouth, and shrinks back into it */
  const open = spring(clamp((t - s.t0) / 0.38)), shut = s.out ? 1 - easeIn(clamp((t - s.out) / 0.2)) : 1;
  const sc = Math.max(0.01, open * shut);
  s.inn.style.transformOrigin = T.x + 'px ' + T.y + 'px';
  s.inn.style.transform = 'scale(' + sc.toFixed(3) + ')';
  s.inn.style.opacity = tip.ok ? '' : '0';
}

/* ══ EVERY FRAME THE ROOM IS DRAWN (27-table-gl.js) ════════════
   Says whether anything here is still moving, so the room keeps drawing. */
let last = 0;
function tick(t) {
  const E = egg();
  if (!E) return false;
  const dt = Math.min(0.05, Math.max(0, t - last));
  last = t;
  let busy = false;
  if (shake) { wobble(E, t); busy = true; }
  if (due && t >= due) { due = 0; summon(E, t); }
  if (due) busy = true;
  if (gob && gob.gave) give(E, t);
  if (gob) { dance(E, t); busy = true; }
  if (say) { speak(E, t); busy = true; }
  if (loot && stepLoot(E, t, dt)) busy = true;
  if (bits && bits.mesh.visible && flutter(t, dt)) busy = true;
  if (sprites.length && stepSprites(E, t)) busy = true;
  return busy;
}

/* for trying it again without restarting: puts the cheese back and takes the treasure away */
function reset() {
  done = false;
  const E = egg();
  if (E) { E.cheese.visible = true; (loot || []).forEach(o => E.room.remove(o, o.userData.shadow)); shells.forEach(x => E.room.remove(x)); }
  shells = []; lootMeshes = []; hot = null;
  loot = null;
}

root.Goblin = { tick, reset };

})(window, document);
