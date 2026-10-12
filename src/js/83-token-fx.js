/* ══════════════════════════════════════════════════════════════
   83-token-fx.js — WHAT A TOKEN LOOKS LIKE ON THE ONE WHO HAS IT.

   Every token has something you can SEE happening to the figure that carries
   it: wounds weep on a bleeding one, flames climb a burning one, stars circle a
   stunned head, a heart beats over one with Determination, roots bind a rooted
   pair of feet, and a prone one is lying on the ground. So the table can be read
   without opening anything: you look at the figure.

   It is made of sprites (small pictures that always face you) and a few nudges
   to the standee itself (a tint, a droop, a lean, a lie-down, an afterimage),
   all drawn from the tokens' own names and counts, nothing stored. Shared by the
   board on the table (81-battle-view.js) and the field (37-scene-field.js): both
   stand a figure one unit tall and look at it, so an effect is built once, in
   "figure heights", and put on whatever carries it.

     TokenFx.create(cond, { w, d, h, zFront })  ->  { group, update(t, dt, face, order) -> mod, dispose() }
         cond   the piece's tokens, [{ n, c }]
         w, d   half the width and depth of what it stands on (a formation's slab), in figure heights
         h      how tall its figures are, as a fraction of a unit's
         face   which way the figure faces on screen (1 right, -1 left): trails go the other way
         order  where the piece is in the drawing order: what is behind it is drawn at order-1, what is in front at order+1
         zFront the host's effect space has +z toward the viewer (the table), so an effect with z < 0 is behind the figure
     mod = { r, g, b, a, sag, lean, lie, shake, bob, ghosts }  — what to do to the standee this frame
══════════════════════════════════════════════════════════════ */
(function (root) {
'use strict';

const fr = x => x - Math.floor(x);
const SZ = 1.8;                                   /* how big a sprite is drawn, against the numbers below: they are written for a figure one unit tall, and a drop that is a twentieth of one is a speck */
const TEXS = {};
const mkc = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const TSZ = { flame: 128, hex: 128, dome: 128, kite: 128, heart: 128, root: 128, runes: 128, gash: 128, eyeslash: 128 };   /* the ones with detail are drawn bigger; everything is authored on a 64 grid */

/* ── the pictures: white shapes on clear (tinted when used), a few in their own colours ── */
const DRAW = {
  dot(x) { const g = x.createRadialGradient(32, 32, 0, 32, 32, 31); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); },
  spark(x) {
    x.translate(32, 32); x.fillStyle = '#fff';
    [0, Math.PI / 2].forEach(a => { x.save(); x.rotate(a); x.beginPath(); x.moveTo(-30, 0); x.quadraticCurveTo(0, -3.5, 30, 0); x.quadraticCurveTo(0, 3.5, -30, 0); x.fill(); x.restore(); });
    const g = x.createRadialGradient(0, 0, 0, 0, 0, 12); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(-14, -14, 28, 28);
  },
  star(x) {
    x.translate(32, 33); x.fillStyle = '#fff'; x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = 3; x.lineJoin = 'round'; x.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 11 : 27; x[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
    x.closePath(); x.fill(); x.stroke();
  },
  drip(x) {                                       /* a long drop, point up, heavy at the bottom, with a shine */
    const g = x.createLinearGradient(0, 3, 0, 60); g.addColorStop(0, '#ff4a4f'); g.addColorStop(1, '#9a0510');
    x.fillStyle = g; x.beginPath(); x.moveTo(32, 3); x.bezierCurveTo(37, 20, 47, 37, 32, 59); x.bezierCurveTo(17, 37, 27, 20, 32, 3); x.fill();
    x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.ellipse(27.5, 40, 3, 8.5, .12, 0, 7); x.fill();
  },
  gash(x) {                                       /* a cut across the body: dark edge, red wet middle, a shine, a few flecks */
    x.scale(2, 2); x.lineCap = 'round';
    const cut = () => { x.beginPath(); x.moveTo(11, 53); x.quadraticCurveTo(30, 37, 53, 11); };
    x.strokeStyle = '#2a0004'; x.lineWidth = 9; cut(); x.stroke();
    x.strokeStyle = '#e01a24'; x.lineWidth = 5.5; cut(); x.stroke();
    x.strokeStyle = 'rgba(255,200,200,.7)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(19, 45); x.quadraticCurveTo(30, 36, 44, 21); x.stroke();
    x.fillStyle = '#e01a24'; [[8, 57, 2.4], [58, 8, 2], [36, 24, 1.5], [22, 42, 1.4]].forEach(([a, b, r]) => { x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); });
  },
  flame(x) {                                      /* a tongue of fire: soft red edge, orange body, a pale hot heart */
    x.scale(2, 2);
    const o = x.createLinearGradient(0, 63, 0, 1); o.addColorStop(0, 'rgba(255,205,70,1)'); o.addColorStop(.42, 'rgba(255,115,22,.96)'); o.addColorStop(.82, 'rgba(225,45,12,.6)'); o.addColorStop(1, 'rgba(150,18,0,0)');
    x.fillStyle = o; x.beginPath(); x.moveTo(32, 1); x.bezierCurveTo(35, 13, 55, 22, 53, 42); x.bezierCurveTo(51, 57, 40, 63, 32, 63); x.bezierCurveTo(24, 63, 13, 57, 11, 42); x.bezierCurveTo(9, 28, 22, 22, 26, 11); x.bezierCurveTo(28, 6, 30, 3, 32, 1); x.fill();
    const i = x.createLinearGradient(0, 62, 0, 20); i.addColorStop(0, 'rgba(255,255,235,1)'); i.addColorStop(.55, 'rgba(255,228,120,.96)'); i.addColorStop(1, 'rgba(255,170,40,0)');
    x.fillStyle = i; x.beginPath(); x.moveTo(32, 19); x.bezierCurveTo(37, 31, 46, 37, 44, 49); x.bezierCurveTo(42, 59, 22, 59, 20, 49); x.bezierCurveTo(19, 38, 30, 33, 32, 19); x.fill();
  },
  puff(x) { [[26, 34, 18], [40, 30, 16], [34, 42, 16], [22, 44, 11], [44, 42, 11]].forEach(([cx, cy, r]) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }); },
  swirl(x) { x.strokeStyle = '#fff'; x.lineWidth = 5; x.lineCap = 'round'; x.beginPath(); for (let a = 0; a < 4 * Math.PI; a += .2) { const r = 3 + a * 2.2; x[a ? 'lineTo' : 'moveTo'](32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } x.stroke(); },
  bang(x) { x.fillStyle = '#fff'; x.strokeStyle = 'rgba(0,0,0,.55)'; x.lineWidth = 4; x.beginPath(); x.moveTo(24, 6); x.lineTo(40, 6); x.lineTo(36, 40); x.lineTo(28, 40); x.closePath(); x.stroke(); x.fill(); x.beginPath(); x.arc(32, 52, 6, 0, 7); x.stroke(); x.fill(); },
  eyeslash(x) {                                   /* an eye with a red slash through it */
    x.scale(2, 2); x.lineCap = 'round'; x.lineJoin = 'round';
    x.fillStyle = 'rgba(255,255,255,.22)'; x.strokeStyle = '#fff'; x.lineWidth = 4;
    x.beginPath(); x.moveTo(5, 32); x.quadraticCurveTo(32, 5, 59, 32); x.quadraticCurveTo(32, 59, 5, 32); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(32, 32, 8.5, 0, 7); x.fill();
    x.strokeStyle = 'rgba(0,0,0,.6)'; x.lineWidth = 9; x.beginPath(); x.moveTo(11, 55); x.lineTo(53, 9); x.stroke();
    x.strokeStyle = '#ff3b3b'; x.lineWidth = 6; x.beginPath(); x.moveTo(11, 55); x.lineTo(53, 9); x.stroke();
  },
  shard(x) { x.fillStyle = '#fff'; x.beginPath(); x.moveTo(32, 3); x.lineTo(46, 34); x.lineTo(32, 61); x.lineTo(18, 34); x.closePath(); x.fill(); x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 2; x.beginPath(); x.moveTo(32, 3); x.lineTo(32, 61); x.stroke(); },
  hex(x) {                                        /* a lattice of plates, fading out toward the edge */
    x.save(); x.scale(2, 2);
    x.beginPath(); x.ellipse(32, 32, 27, 31, 0, 0, 7); x.clip();
    x.strokeStyle = '#fff'; x.lineWidth = 1.5;
    const r = 7.2, h = r * Math.sqrt(3) / 2;
    for (let col = -1; col < 10; col++) for (let row = -1; row < 10; row++) {
      const cx = col * r * 1.5, cy = row * h * 2 + (col & 1 ? h : 0);
      x.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 3 * k; x[k ? 'lineTo' : 'moveTo'](cx + r * Math.cos(a), cy + r * Math.sin(a)); } x.closePath(); x.stroke();
    }
    x.restore();
    x.globalCompositeOperation = 'destination-in';
    const g = x.createRadialGradient(64, 64, 20, 64, 64, 62); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.65, 'rgba(255,255,255,.75)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  },
  sweep(x) {                                      /* a soft slanted band of light, for a shine to cross a surface */
    const g = x.createLinearGradient(0, 0, 64, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    x.globalCompositeOperation = 'destination-in';
    const v = x.createLinearGradient(0, 0, 0, 64); v.addColorStop(0, 'rgba(255,255,255,0)'); v.addColorStop(.25, 'rgba(255,255,255,1)'); v.addColorStop(.75, 'rgba(255,255,255,1)'); v.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = v; x.fillRect(0, 0, 64, 64);
  },
  dome(x) {                                       /* a bubble: clear middle, a bright rim, a shine at the top */
    x.scale(2, 2);
    const g = x.createRadialGradient(32, 32, 12, 32, 32, 31); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.7, 'rgba(255,255,255,.09)'); g.addColorStop(.9, 'rgba(255,255,255,.7)'); g.addColorStop(.95, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    const s = x.createRadialGradient(21, 16, 0, 21, 16, 15); s.addColorStop(0, 'rgba(255,255,255,.9)'); s.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = s; x.fillRect(0, 0, 64, 64);
  },
  kite(x) {                                       /* a shield: a bright rim, a darker field, a cross, shaded to the lower right. Tinted gold or blue when used */
    x.scale(2, 2);
    const body = () => { x.beginPath(); x.moveTo(32, 2); x.lineTo(57, 10); x.lineTo(55, 34); x.quadraticCurveTo(51, 53, 32, 62); x.quadraticCurveTo(13, 53, 9, 34); x.lineTo(7, 10); x.closePath(); };
    body(); x.fillStyle = '#ffffff'; x.fill();
    x.save(); x.translate(32, 34); x.scale(.8, .8); x.translate(-32, -34); body(); x.fillStyle = '#b9b9b9'; x.fill(); x.restore();
    x.fillStyle = '#ffffff'; x.fillRect(29, 13, 6, 40); x.fillRect(17, 24, 30, 6);
    const g = x.createLinearGradient(8, 8, 56, 62); g.addColorStop(0, 'rgba(255,255,255,.4)'); g.addColorStop(.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.4)'); body(); x.fillStyle = g; x.fill();
    x.lineWidth = 2; x.strokeStyle = 'rgba(0,0,0,.55)'; body(); x.stroke();
  },
  arc(x) { x.lineCap = 'round'; x.shadowColor = '#fff'; x.shadowBlur = 8; x.strokeStyle = '#fff'; x.lineWidth = 6; x.beginPath(); x.arc(2, 32, 27, -1.1, 1.1); x.stroke(); x.lineWidth = 2.5; x.beginPath(); x.arc(2, 32, 20, -.95, .95); x.stroke(); },
  ring(x) { x.shadowColor = '#fff'; x.shadowBlur = 5; x.strokeStyle = '#fff'; x.lineWidth = 4.5; x.beginPath(); x.arc(32, 32, 26, 0, 7); x.stroke(); },
  runes(x) {                                      /* a circle of binding: rings, ticks and small marks (squashed flat, it lies on the ground) */
    x.scale(2, 2); x.shadowColor = '#fff'; x.shadowBlur = 4; x.strokeStyle = '#fff'; x.lineCap = 'round';
    x.lineWidth = 2.6; x.beginPath(); x.arc(32, 32, 28, 0, 7); x.stroke();
    x.lineWidth = 1.6; x.beginPath(); x.arc(32, 32, 20, 0, 7); x.stroke();
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; x.beginPath(); x.moveTo(32 + Math.cos(a) * 20, 32 + Math.sin(a) * 20); x.lineTo(32 + Math.cos(a) * 28, 32 + Math.sin(a) * 28); x.stroke(); }
    for (let i = 0; i < 8; i++) { const a = (i + .5) / 8 * Math.PI * 2, px = 32 + Math.cos(a) * 14, py = 32 + Math.sin(a) * 14; x.beginPath(); x.moveTo(px - 3, py - 3); x.lineTo(px + 3, py + 3); x.moveTo(px + 3, py - 3); x.lineTo(px - 3, py + 3); x.stroke(); }
  },
  bar2(x) {                                       /* an upright rod of light */
    const g = x.createLinearGradient(0, 0, 64, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    x.globalCompositeOperation = 'destination-in';
    const v = x.createLinearGradient(0, 0, 0, 64); v.addColorStop(0, 'rgba(255,255,255,0)'); v.addColorStop(.12, 'rgba(255,255,255,1)'); v.addColorStop(.88, 'rgba(255,255,255,1)'); v.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = v; x.fillRect(0, 0, 64, 64);
  },
  heart(x) {
    x.scale(2, 2);
    const path = () => { x.beginPath(); x.moveTo(32, 57); x.bezierCurveTo(3, 37, 5, 11, 22, 11); x.bezierCurveTo(28, 11, 31, 15, 32, 20); x.bezierCurveTo(33, 15, 36, 11, 42, 11); x.bezierCurveTo(59, 11, 61, 37, 32, 57); x.closePath(); };
    path(); x.fillStyle = '#fff'; x.fill();
    const g = x.createLinearGradient(0, 11, 0, 57); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.34)'); path(); x.fillStyle = g; x.fill();
    x.fillStyle = 'rgba(255,255,255,.85)'; x.beginPath(); x.ellipse(21, 22, 5, 3, -.7, 0, 7); x.fill();
  },
  root(x) {                                       /* a gnarled root climbing out of the ground, with a few green leaves (its own colours) */
    x.scale(2, 2); x.lineCap = 'round'; x.lineJoin = 'round';
    const path = () => { x.beginPath(); x.moveTo(30, 63); x.bezierCurveTo(26, 47, 45, 41, 36, 27); x.bezierCurveTo(31, 18, 41, 11, 47, 4); };
    const twig = () => { x.beginPath(); x.moveTo(37, 34); x.quadraticCurveTo(48, 36, 52, 30); x.moveTo(30, 52); x.quadraticCurveTo(18, 52, 14, 44); };
    x.strokeStyle = '#1d1209'; x.lineWidth = 12; path(); x.stroke(); x.lineWidth = 7; twig(); x.stroke();
    x.strokeStyle = '#6e4725'; x.lineWidth = 8.2; path(); x.stroke(); x.lineWidth = 4; twig(); x.stroke();
    x.strokeStyle = '#a77a45'; x.lineWidth = 2; path(); x.stroke();
    x.fillStyle = '#5da02c'; [[41, 21, 5.5, -.6], [27, 41, 5, 2.5], [49, 31, 4.5, -.2], [14, 44, 4.4, 2.9]].forEach(([a, b, r, rot]) => { x.save(); x.translate(a, b); x.rotate(rot); x.beginPath(); x.ellipse(0, 0, r * 1.7, r * .85, 0, 0, 7); x.fill(); x.restore(); });
  },
  cracks(x) {                                     /* turned earth: a dark patch with cracks running out of it */
    const g = x.createRadialGradient(32, 32, 4, 32, 32, 31); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(.6, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    x.strokeStyle = 'rgba(0,0,0,.7)'; x.lineWidth = 1.8; x.lineCap = 'round';
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + .3; x.beginPath(); x.moveTo(32 + Math.cos(a) * 6, 32 + Math.sin(a) * 6); x.lineTo(32 + Math.cos(a + .15) * 16, 32 + Math.sin(a + .15) * 16); x.lineTo(32 + Math.cos(a - .1) * 27, 32 + Math.sin(a - .1) * 27); x.stroke(); }
  },
  chev(x) { x.strokeStyle = '#fff'; x.lineWidth = 7; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath(); x.moveTo(12, 11); x.lineTo(32, 32); x.lineTo(12, 53); x.moveTo(34, 11); x.lineTo(54, 32); x.lineTo(34, 53); x.stroke(); },
  weaken(x) { x.fillStyle = '#fff'; x.beginPath(); x.moveTo(24, 6); x.lineTo(40, 6); x.lineTo(40, 32); x.lineTo(54, 32); x.lineTo(32, 58); x.lineTo(10, 32); x.lineTo(24, 32); x.closePath(); x.fill(); },
  target(x) { x.strokeStyle = '#fff'; x.lineWidth = 5; x.beginPath(); x.arc(32, 32, 22, 0, 7); x.stroke(); x.beginPath(); x.arc(32, 32, 8, 0, 7); x.stroke(); x.lineWidth = 4; x.beginPath(); x.moveTo(32, 2); x.lineTo(32, 16); x.moveTo(32, 48); x.lineTo(32, 62); x.moveTo(2, 32); x.lineTo(16, 32); x.moveTo(48, 32); x.lineTo(62, 32); x.stroke(); },
  speed(x) {                                      /* a streak with a soft blue edge, to be seen on bright ground */
    x.shadowColor = '#4aa8ff'; x.shadowBlur = 5;
    const g = x.createLinearGradient(0, 0, 64, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,1)'); x.fillStyle = g;
    x.beginPath(); x.moveTo(2, 32); x.lineTo(58, 26); x.lineTo(63, 32); x.lineTo(58, 38); x.closePath(); x.fill();
  },
  streak(x) { const g = x.createLinearGradient(0, 0, 64, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.6, 'rgba(255,255,255,.85)'); g.addColorStop(1, 'rgba(255,255,255,1)'); x.fillStyle = g; x.beginPath(); x.moveTo(0, 32); x.lineTo(60, 28); x.lineTo(64, 32); x.lineTo(60, 36); x.closePath(); x.fill(); }
};
function TEX(n) {
  if (TEXS[n]) return TEXS[n];
  const sz = TSZ[n] || 64, c = mkc(sz, sz), x = c.getContext('2d');
  DRAW[n](x);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
  return (TEXS[n] = t);
}
const lin = hex => new THREE.Color(hex).convertSRGBToLinear();

/* ── a little set of sprites, each placed by a function of time ── */
function sprites(c, o) {
  const ss = [];
  for (let i = 0; i < o.n; i++) {
    const m = new THREE.SpriteMaterial({ map: TEX(o.tex), color: lin(o.color || '#ffffff'), transparent: true, depthTest: false, depthWrite: false, blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending });
    const s = new THREE.Sprite(m); s.visible = false; c.grp.add(s); ss.push(s);
  }
  const q = {};
  return (t) => {
    for (let i = 0; i < o.n; i++) {
      q.x = 0; q.y = 0; q.z = 0; q.sx = .08; q.sy = null; q.a = 1; q.rot = 0;
      const u = fr(t * (o.rate || .6) + i / o.n + (o.off || 0));
      o.fn(q, u, i, t, c);
      const s = ss[i];
      if (q.a <= .015) { s.visible = false; continue; }
      s.visible = true;
      s.renderOrder = c.order + ((o.back || (c.zFront && q.z < -.004)) ? -1 : 1);
      s.position.set(q.x, q.y * c.h, q.z);
      s.scale.set(q.sx * c.h * SZ, (q.sy == null ? q.sx : q.sy) * c.h * SZ, 1);
      s.material.opacity = Math.min(1, q.a); s.material.rotation = q.rot;
    }
  };
}
/* where the i-th of n things stands on what the piece stands on */
const scatter = (i, w, d) => [(fr(i * .6180339 + .13) - .5) * 2 * w * .85, (fr(i * .381966 + .41) - .5) * 2 * d * .85];
const bell = u => Math.sin(u * Math.PI);
const sat = x => Math.max(0, Math.min(1, x));
const fade = (u, a, b) => sat(Math.min(u / a, (1 - u) / b));

/* ── the effects: name -> (context, count) -> update(t, dt, mod) ── */
const FX = {
  /* ····· what is done to them ····· */
  /* wounds that weep: cuts across the body, each running; a pool spreading on the ground */
  Bleed: (c, k) => {
    const nw = Math.min(1 + Math.ceil(k / 2), 3);
    const WOUNDS = [[-.09, .56], [.1, .36], [.0, .74]];
    const woundAt = i => WOUNDS[i % 3];
    const wounds = sprites(c, { tex: 'gash', n: nw, rate: .01, fn: (q, u, i, t) => { const [x, y] = woundAt(i); q.x = x; q.y = y; q.sx = .14; q.rot = .1 + (i % 3) * .14; q.a = .92 + .08 * Math.sin(t * 5 + i); } });
    const drips = sprites(c, { tex: 'drip', n: 3 + Math.min(k, 3), rate: .5, fn: (q, u, i) => { const [x, y] = woundAt(i % nw); q.x = x + (i % 2 ? .035 : -.03); q.y = y - u * u * y * .92; q.sx = .036; q.sy = .05 + u * .07; q.a = fade(u, .05, .22); } });
    const pool = sprites(c, { tex: 'dot', color: '#5a0509', back: true, n: 1, fn: q => { q.y = .025; q.sx = Math.max(.24, c.w * 1.2) + .02 * k; q.sy = .06; q.z = .02; q.a = .6; } });
    return (t, dt, m) => { pool(t); wounds(t); drips(t); m.r *= 1.04; m.g *= .94; m.b *= .94; };
  },
  Blight: (c, k) => { const up = sprites(c, { tex: 'puff', color: '#86cc34', n: 4 + Math.min(k, 3), rate: .22, fn: (q, u, i) => { const [x, z] = scatter(i, c.w, c.d); q.x = x + Math.sin(u * 7 + i) * .05; q.z = z; q.y = .1 + u * .8; q.sx = .12 + u * .14; q.a = bell(u) * .55; } });
    return (t, dt, m) => { up(t); m.r *= .9; m.g *= 1.06; m.b *= .78; }; },
  /* fire climbs the figure: tongues rise from the legs and the body, swell and die; embers go up; the ground glows */
  Fire: (c, k) => {
    const nt = 6 + Math.min(k, 4);
    const tongues = sprites(c, { tex: 'flame', n: nt, rate: 1.1, fn: (q, u, i, t) => {
      const col = (i % 3) - 1, row = Math.floor(i / 3), gro = Math.sin(Math.min(1, u * 1.2) * Math.PI);
      q.x = col * (.11 + c.w * .45) + Math.sin(t * 7 + i * 2.1) * .028 * (1 + u); q.z = (fr(i * .37) - .5) * c.d * 1.6;
      q.y = .03 + row * .2 + fr(i * .37) * .08 + u * .36;
      q.sx = (.12 + .08 * fr(i * .53)) * (.5 + .65 * gro); q.sy = (.18 + .14 * fr(i * .71)) * (.5 + .75 * gro);
      q.a = Math.min(1, bell(u) * 1.7) * .93; } });
    const feet = sprites(c, { tex: 'flame', n: 2, rate: 1.9, fn: (q, u, i, t) => { q.x = (i ? .09 : -.09) * (1 + c.w); q.y = .09; const f = 1 + .3 * Math.sin(t * 13 + i * 3); q.sx = .22 * f; q.sy = .3 * f; q.a = .95; } });
    const em = sprites(c, { tex: 'spark', color: '#ffb23a', add: true, n: 8, rate: .4, fn: (q, u, i) => { const [x, z] = scatter(i + 3, c.w, c.d); q.x = x + Math.sin(u * 9 + i) * .06; q.z = z; q.y = .25 + u * .95; q.sx = .055; q.a = fade(u, .12, .55) * .95; } });
    const gl = sprites(c, { tex: 'dot', color: '#ff6a18', add: true, back: true, n: 1, fn: (q, u, i, t) => { q.y = .35; q.sx = Math.max(1, c.w * 2.6); q.sy = 1; q.z = -.04; q.a = .26 + .1 * Math.sin(t * 13); } });
    return (t, dt, m) => { gl(t); feet(t); tongues(t); em(t); const f = Math.sin(t * 17) * .04; m.r *= 1.16 + f; m.g *= .95; m.b *= .78; };
  },
  Stun: c => { const up = sprites(c, { tex: 'star', color: '#ffe14a', n: 3, rate: .5, fn: (q, u, i, t) => { const a = u * Math.PI * 2, r = Math.max(.27, c.w * .7); q.x = Math.cos(a) * r; q.z = Math.sin(a) * (r * .45); q.y = 1.06; q.sx = .12; q.rot = t * 2; q.a = 1; } });
    return (t, dt, m) => { up(t); m.lean += Math.sin(t * 6) * .03; }; },
  Daze: c => { const up = sprites(c, { tex: 'swirl', color: '#cbb4ff', n: 2, rate: .1, fn: (q, u, i, t) => { q.x = (i ? .1 : -.1); q.y = 1.08 + .03 * Math.sin(t * 3 + i); q.sx = .2; q.rot = t * (i ? -5 : 5); q.a = .9; } });
    return (t, dt, m) => { up(t); m.lean += Math.sin(t * 1.9) * .075; m.r *= .94; m.g *= .94; }; },
  /* the dark closes in: black smoke going round the head, a crossed-out eye over it, the whole figure dimmed */
  Blind: c => {
    const veil = sprites(c, { tex: 'puff', color: '#0e0914', n: 6, rate: .01, fn: (q, u, i, t) => { const a = t * .85 + i * 1.0472, r = Math.max(.15, c.w * .55); q.x = Math.cos(a) * r; q.z = Math.sin(a) * r * .5; q.y = .8 + Math.sin(a * 1.7) * .06; q.sx = .24; q.a = .92; } });
    const eye = sprites(c, { tex: 'eyeslash', n: 1, fn: (q, u, i, t) => { q.y = 1.18 + .02 * Math.sin(t * 2.4); q.sx = .17; q.a = .95; } });
    return (t, dt, m) => { veil(t); eye(t); m.r *= .76; m.g *= .76; m.b *= .86; };
  },
  Weakened: c => { const up = sprites(c, { tex: 'weaken', color: '#8497c8', n: 3, rate: .3, fn: (q, u, i) => { const [x] = scatter(i, c.w, c.d); q.x = x * .6; q.y = 1.02 - u * .42; q.sx = .07; q.sy = .09; q.a = bell(u) * .85; } });
    return (t, dt, m) => { up(t); m.sag *= .93; m.lean += .05; m.r *= .84; m.g *= .88; m.b *= .96; }; },
  Vulnerable: c => { const up = sprites(c, { tex: 'target', color: '#ff3b2f', n: 1, fn: (q, u, i, t) => { q.y = 1.14 + .03 * Math.sin(t * 3); q.sx = .2; q.rot = t * 1.3; q.a = .6 + .35 * Math.sin(t * 5); } });
    return (t, dt, m) => { up(t); const p = .1 * Math.sin(t * 5); m.r *= 1.12 + p; m.g *= .88 - p * .4; m.b *= .88 - p * .4; }; },
  Brittle: c => {
    const sp = sprites(c, { tex: 'spark', color: '#ffffff', add: true, n: 3, rate: .9, fn: (q, u, i) => { const [x, z] = scatter(i + 5, c.w, c.d); q.x = x; q.z = z; q.y = .25 + fr(i * .53) * .55; q.sx = .12 * bell(u); q.rot = u * 3; q.a = bell(u); } });
    const sh = sprites(c, { tex: 'shard', color: '#bde8ff', n: 3, rate: .01, fn: (q, u, i) => { const [x, z] = scatter(i + 9, c.w, c.d); q.x = x; q.z = z; q.y = .05; q.sx = .05; q.sy = .1; q.rot = (i - 1) * .4; q.a = .9; } });
    return (t, dt, m) => { sp(t); sh(t); m.r *= .82; m.g *= .95; m.b *= 1.14; m.shake += .004; };
  },
  Winded: c => { const up = sprites(c, { tex: 'puff', color: '#f2f2f2', n: 3, rate: .5, fn: (q, u) => { q.x = .1 + u * .22; q.y = .8 + u * .05; q.sx = .05 + u * .1; q.a = fade(u, .15, .6) * .6; } });
    return (t, dt, m) => { up(t); m.sag *= 1 + Math.sin(t * 9) * .025; }; },
  Debilitated: c => { const up = sprites(c, { tex: 'puff', color: '#8a5fc0', n: 3, rate: .25, fn: (q, u, i) => { const [x, z] = scatter(i + 2, c.w, c.d); q.x = x; q.z = z; q.y = .2 + u * .6; q.sx = .1 + u * .08; q.a = bell(u) * .5; } });
    return (t, dt, m) => { up(t); m.sag *= .96; m.r *= .88; m.g *= .82; m.b *= 1.0; }; },
  Helpless: c => { const up = sprites(c, { tex: 'bang', color: '#f4f4f4', n: 1, fn: (q, u, i, t) => { q.y = 1.12 + .02 * Math.sin(t * 6); q.sx = .1; q.sy = .15; q.a = .55 + .4 * Math.sin(t * 4.5); } });
    return (t, dt, m) => { up(t); m.lean += .04; m.r *= .82; m.g *= .84; m.b *= .88; }; },
  Prone: c => { const up = sprites(c, { tex: 'puff', color: '#b7a37c', n: 2, rate: .35, fn: (q, u, i) => { q.x = (i ? .22 : -.22); q.y = .06 + u * .08; q.sx = .1 + u * .1; q.a = fade(u, .15, .6) * .45; } });
    return (t, dt, m) => { up(t); m.lie += 1.3; m.bob -= .12; }; },

  /* ····· what holds them ····· */
  /* roots burst out of turned earth and climb the legs from both sides */
  Rooted: c => {
    const earth = sprites(c, { tex: 'cracks', color: '#25170c', back: true, n: 1, fn: q => { q.y = .02; q.sx = Math.max(.42, c.w * 1.45); q.sy = .15; q.a = .9; } });
    const roots = sprites(c, { tex: 'root', n: 6, rate: .01, fn: (q, u, i, t) => {
      const side = i % 2 ? 1 : -1, k2 = Math.floor(i / 2);
      q.x = side * (Math.max(.1, c.w * .5) + k2 * .035); q.z = (k2 - 1) * .03;
      q.y = .21 + k2 * .06 + .008 * Math.sin(t * 1.3 + i);
      q.sx = side * .17; q.sy = .26 + k2 * .035; q.rot = side * (.2 + k2 * .12) + Math.sin(t * 1.1 + i) * .03; q.a = 1; } });
    return (t, dt, m) => { earth(t); roots(t); m.r *= .94; m.g *= 1.04; m.b *= .94; m.bob -= .01; };
  },
  /* a magic binding: a circle of runes on the ground and a cage of light round the figure */
  Immobilize: c => {
    const circ = sprites(c, { tex: 'runes', color: '#9fd8ff', add: true, back: true, n: 1, fn: (q, u, i, t) => { q.y = .03; q.sx = Math.max(.42, c.w * 1.45); q.sy = q.sx * .36; q.a = .66 + .25 * Math.sin(t * 3); } });
    const pulse = sprites(c, { tex: 'ring', color: '#c8ecff', add: true, back: true, n: 2, rate: .6, fn: (q, u) => { q.y = .03; q.sx = Math.max(.42, c.w * 1.45) * (.55 + .5 * u); q.sy = q.sx * .36; q.a = fade(u, .1, .85) * .6; } });
    const bars = sprites(c, { tex: 'bar2', color: '#b8e6ff', add: true, n: 6, rate: .01, fn: (q, u, i, t) => { const a = i / 6 * Math.PI * 2 + .3, r = Math.max(.24, c.w * .85); q.x = Math.cos(a) * r; q.z = Math.sin(a) * r * .4; q.y = .5; q.sx = .035; q.sy = .6; q.a = .5 + .3 * Math.sin(t * 4 + i * 1.7); } });
    const cap = sprites(c, { tex: 'ring', color: '#b8e6ff', add: true, n: 1, fn: (q, u, i, t) => { q.y = 1.0; q.sx = Math.max(.3, c.w * 1.0); q.sy = q.sx * .34; q.a = .5 + .25 * Math.sin(t * 3.4); } });
    return (t, dt, m) => { circ(t); pulse(t); bars(t); cap(t); m.r *= .92; m.g *= 1.02; m.b *= 1.07; };
  },
  Stealth: c => { const up = sprites(c, { tex: 'spark', color: '#e8f4ff', add: true, n: 4, rate: .7, fn: (q, u, i) => { const [x, z] = scatter(i + 7, c.w, c.d); q.x = x; q.z = z; q.y = .15 + fr(i * .61) * .7; q.sx = .08 * bell(u); q.rot = u * 2; q.a = bell(u) * .8; } });
    return (t, dt, m) => { up(t); m.a *= .42 + .08 * Math.sin(t * 3); }; },
  Taunt: c => {
    const gl = sprites(c, { tex: 'dot', color: '#ff2a2a', add: true, back: true, n: 1, fn: (q, u, i, t) => { q.y = .5; q.z = -.05; q.sx = Math.max(.9, c.w * 2.4); q.sy = 1; q.a = .22 + .1 * Math.sin(t * 4); } });
    const bg = sprites(c, { tex: 'bang', color: '#ff3030', n: 1, fn: (q, u, i, t) => { q.y = 1.14 + .04 * Math.sin(t * 5); q.sx = .11; q.sy = .17; q.a = 1; } });
    return (t, dt, m) => { gl(t); bg(t); };
  },
  Goad: c => {
    const gl = sprites(c, { tex: 'dot', color: '#ff9a1f', add: true, back: true, n: 1, fn: (q, u, i, t) => { q.y = .5; q.z = -.05; q.sx = Math.max(.8, c.w * 2.2); q.sy = .9; q.a = .16 + .08 * Math.sin(t * 5); } });
    const bg = sprites(c, { tex: 'bang', color: '#ff9a1f', n: 2, rate: .01, fn: (q, u, i, t) => { q.x = (i ? .07 : -.07); q.y = 1.14 + .04 * Math.sin(t * 5 + i); q.sx = .09; q.sy = .14; q.a = 1; } });
    return (t, dt, m) => { gl(t); bg(t); };
  },

  /* ····· what helps them ····· */
  /* steel skin: a lattice of plates over the body, a shine that sweeps across it now and then, hard glints */
  Hardened: c => {
    const skin = sprites(c, { tex: 'hex', color: '#d4e6ff', add: true, n: 1, fn: (q, u, i, t) => { q.y = .5; q.sx = Math.max(.4, c.w * 1.25); q.sy = .6; q.z = .01; q.a = .85 + .15 * Math.sin(t * 2); } });
    const sweep = sprites(c, { tex: 'sweep', color: '#ffffff', add: true, n: 1, rate: .36, fn: (q, u) => { const s = sat((u - .05) / .5); q.x = -.3 + s * .6; q.y = .5; q.sx = .1; q.sy = .56; q.rot = -.35; q.a = s > 0 && s < 1 ? Math.sin(s * Math.PI) : 0; } });
    const gl = sprites(c, { tex: 'spark', color: '#eaf3ff', add: true, n: 4, rate: .5, fn: (q, u, i) => { q.x = (fr(i * .618) - .5) * .5; q.y = .2 + fr(i * .39) * .6; q.sx = .13 * bell(u); q.rot = u * 2; q.a = bell(u); } });
    return (t, dt, m) => { skin(t); sweep(t); gl(t); const s = sat((fr(t * .36) - .05) / .5), shine = s > 0 && s < 1 ? Math.sin(s * Math.PI) * .38 : 0; m.r *= .88 + shine; m.g *= .95 + shine; m.b *= 1.12 + shine; };
  },
  /* a barrier of gold light all the way round: a bubble with a bright rim, a faint lattice, sparks going round the edge */
  Impenetrable: c => {
    const dome = sprites(c, { tex: 'dome', color: '#ffe590', add: true, n: 1, fn: (q, u, i, t) => { q.y = .52; q.sx = Math.max(.5, c.w * 1.55); q.sy = .72; q.z = .02; q.a = .62 + .14 * Math.sin(t * 2.4); } });
    const lat = sprites(c, { tex: 'hex', color: '#ffe9a0', add: true, n: 1, fn: (q, u, i, t) => { q.y = .52; q.sx = Math.max(.44, c.w * 1.4); q.sy = .64; q.z = .03; q.a = .26 + .08 * Math.sin(t * 3.1); } });
    const orb = sprites(c, { tex: 'spark', color: '#fff3c4', add: true, n: 5, rate: .3, fn: (q, u, i) => { const a = u * Math.PI * 2, rx = Math.max(.28, c.w * .95), ry = .5; q.x = Math.cos(a) * rx; q.y = .52 + Math.sin(a) * ry; q.z = .04; q.sx = .08; q.rot = u * 5; q.a = .95; } });
    return (t, dt, m) => { dome(t); lat(t); orb(t); m.r *= 1.04; m.g *= 1.02; m.b *= .9; };
  },
  Inspiration: c => {
    const gl = sprites(c, { tex: 'dot', color: '#ffd35a', add: true, back: true, n: 1, fn: (q, u, i, t) => { q.y = .5; q.z = -.05; q.sx = Math.max(.8, c.w * 2.2); q.sy = .9; q.a = .12 + .04 * Math.sin(t * 3); } });
    const sp = sprites(c, { tex: 'spark', color: '#ffd96a', add: true, n: 5, rate: .35, fn: (q, u, i) => { const [x, z] = scatter(i + 1, c.w, c.d); q.x = x; q.z = z; q.y = .1 + u * .95; q.sx = .08; q.a = bell(u); } });
    return (t, dt, m) => { gl(t); sp(t); };
  },
  'Greater Inspiration': c => {
    const gl = sprites(c, { tex: 'dot', color: '#ffe48a', add: true, back: true, n: 1, fn: (q, u, i, t) => { q.y = .5; q.z = -.05; q.sx = Math.max(1, c.w * 2.6); q.sy = 1.1; q.a = .24 + .08 * Math.sin(t * 4); } });
    const sp = sprites(c, { tex: 'spark', color: '#fff0a8', add: true, n: 9, rate: .45, fn: (q, u, i) => { const [x, z] = scatter(i + 1, c.w, c.d); q.x = x; q.z = z; q.y = .08 + u * 1.05; q.sx = .1; q.rot = u * 4; q.a = bell(u); } });
    return (t, dt, m) => { gl(t); sp(t); m.r *= 1.05; m.g *= 1.04; };
  },
  Dodge: c => { const up = sprites(c, { tex: 'streak', color: '#bfe2ff', add: true, n: 2, rate: .42, fn: (q, u, i) => { q.x = -.4 + u * .8; q.y = .38 + i * .22; q.sx = .34; q.sy = .05; q.a = bell(u) * .8; } });
    return (t, dt, m) => { up(t); }; },
  /* you are watched over: a silver shield over the head, rings of blue going out over the ground */
  Guarded: c => {
    const ring = sprites(c, { tex: 'ring', color: '#8cb8ff', add: true, back: true, n: 2, rate: .35, fn: (q, u) => { q.y = .035; q.sx = Math.max(.32, c.w * 1.1) * (.55 + .55 * u); q.sy = q.sx * .34; q.a = fade(u, .1, .9) * .85; } });
    const base = sprites(c, { tex: 'dot', color: '#4f86e8', add: true, back: true, n: 1, fn: q => { q.y = .03; q.sx = Math.max(.36, c.w * 1.2); q.sy = .12; q.a = .35; } });
    const sh = sprites(c, { tex: 'kite', color: '#b4ccf2', n: 1, fn: (q, u, i, t) => { q.y = 1.22 + .03 * Math.sin(t * 2.6); q.sx = .12; q.sy = .16; q.rot = .06 * Math.sin(t * 1.9); q.a = .97; } });
    return (t, dt, m) => { base(t); ring(t); sh(t); m.b *= 1.04; };
  },
  /* you hold the line for somebody: a great gold shield held up beside you, a bow of light in front of it */
  Guard: c => {
    const arc = sprites(c, { tex: 'arc', color: '#ffe9a0', add: true, n: 1, fn: (q, u, i, t) => { q.x = Math.min(.6, Math.max(.34, c.w + .2)); q.y = .52; q.sx = .24; q.sy = .5; q.a = .4 + .16 * Math.sin(t * 3); } });
    const sh = sprites(c, { tex: 'kite', color: '#f2c85c', n: 1, fn: (q, u, i, t) => { q.x = Math.min(.6, Math.max(.36, c.w + .14)); q.y = .5 + .03 * Math.sin(t * 2.2); q.sx = .22; q.sy = .29; q.rot = -.1 + .04 * Math.sin(t * 1.7); q.a = 1; } });
    const gl = sprites(c, { tex: 'spark', color: '#fff3c4', add: true, n: 2, rate: .5, fn: (q, u, i) => { q.x = Math.min(.6, Math.max(.36, c.w + .14)) + (i ? .06 : -.06); q.y = .36 + u * .3; q.sx = .1 * bell(u); q.a = bell(u); } });
    return (t, dt, m) => { arc(t); sh(t); gl(t); };
  },
  Crit: c => { const up = sprites(c, { tex: 'spark', color: '#ff4a3a', add: true, n: 1, fn: (q, u, i, t) => { q.x = .22; q.y = .62; q.sx = .26 * (.8 + .2 * Math.sin(t * 7)); q.rot = t * 2; q.a = .95; } });
    return (t, dt, m) => { up(t); }; },
  Riposte: c => { const up = sprites(c, { tex: 'spark', color: '#e4ecff', add: true, n: 2, rate: .6, fn: (q, u, i) => { q.x = .2 + i * .06; q.y = .55 + i * .1; q.sx = .2 * bell(u); q.rot = i ? 1.2 : -.4; q.a = bell(u); } });
    return (t, dt, m) => { up(t); }; },
  /* speed you cannot miss: long lines streaming off behind, chevrons, a trail of dust, afterimages of the figure itself, leaning into it */
  Swiftness: c => {
    const lines = sprites(c, { tex: 'speed', color: '#ffffff', n: 9, rate: 1.1, fn: (q, u, i) => { const f = c.face || 1; q.x = -f * (.2 + u * .55 + fr(i * .37) * .12); q.y = .08 + fr(i * .618) * .9; q.sx = f * .72; q.sy = .08; q.a = fade(u, .08, .6); } });
    const chev = sprites(c, { tex: 'chev', color: '#e8f4ff', n: 2, rate: .85, fn: (q, u, i) => { const f = c.face || 1; q.x = -f * (.4 + u * .25); q.y = .5 + (i ? .2 : -.2); q.sx = f * .2; q.a = bell(u); } });
    const dust = sprites(c, { tex: 'puff', color: '#d8cfba', n: 3, rate: .9, fn: (q, u, i) => { const f = c.face || 1; q.x = -f * (.16 + u * .5); q.y = .05 + u * .05; q.sx = .08 + u * .12; q.a = fade(u, .12, .6) * .55; } });
    return (t, dt, m) => { lines(t); chev(t); dust(t); m.lean += .1; m.ghosts = Math.max(m.ghosts, 2); m.r *= 1.02; m.g *= 1.05; m.b *= 1.1; };
  },
  /* a heart that will not stop: it beats over the head, rings go out over the ground with each beat, the figure flushes */
  Determination: c => {
    const beat = t => { const p = fr(t * .95); return Math.max(Math.exp(-Math.pow((p - .08) * 20, 2)), .7 * Math.exp(-Math.pow((p - .27) * 20, 2))); };      /* lub-dub */
    const halo = sprites(c, { tex: 'dot', color: '#ff4a3a', add: true, n: 1, fn: (q, u, i, t) => { const b = beat(t); q.y = 1.2; q.sx = .2 + .16 * b; q.a = .3 + .5 * b; } });
    const heart = sprites(c, { tex: 'heart', color: '#ff4b5c', n: 1, fn: (q, u, i, t) => { const b = beat(t); q.y = 1.2 + .015 * Math.sin(t * 2); q.sx = .15 * (1 + .38 * b); q.a = 1; } });
    const rip = sprites(c, { tex: 'ring', color: '#ff6a4a', add: true, back: true, n: 3, rate: .95, fn: (q, u) => { q.y = .035; q.sx = Math.max(.32, c.w * 1.1) * (.35 + .9 * u); q.sy = q.sx * .34; q.a = fade(u, .06, .94) * Math.pow(1 - u, 1.2) * .8; } });
    const em = sprites(c, { tex: 'spark', color: '#ffc59a', add: true, n: 4, rate: .3, fn: (q, u, i) => { q.x = (fr(i * .61) - .5) * .5; q.y = .1 + u * .95; q.sx = .06; q.a = bell(u) * .9; } });
    return (t, dt, m) => { rip(t); em(t); halo(t); heart(t); m.r *= 1.07; m.g *= .96; m.b *= .94; m.bob += .012 * beat(t); };
  }
};

/* ── putting them together on one piece ── */
function create(cond, o) {
  o = o || {};
  const grp = new THREE.Group();
  const c = { grp, w: o.w == null ? .3 : o.w, d: o.d == null ? .02 : o.d, h: o.h == null ? 1 : o.h, face: 1, order: 0, zFront: !!o.zFront };
  const ups = [];
  (cond || []).forEach(t => { const f = FX[t.n]; if (f && t.c > 0) ups.push(f(c, t.c)); });
  const m = { r: 1, g: 1, b: 1, a: 1, sag: 1, lean: 0, lie: 0, shake: 0, bob: 0, ghosts: 0 };
  return {
    group: grp, mod: m, count: ups.length,
    update(t, dt, face, order) {
      c.face = face || 1; c.order = order || 0;
      m.r = m.g = m.b = m.a = m.sag = 1; m.lean = m.lie = m.shake = m.bob = m.ghosts = 0;
      for (let i = 0; i < ups.length; i++) ups[i](t, dt, m);
      return m;
    },
    dispose() {
      grp.traverse(o2 => { if (o2.material) o2.material.dispose(); });
      if (grp.parent) grp.parent.remove(grp);
    }
  };
}
/* what makes two sets of tokens look different (the count only matters up to a few) */
const sigOf = cond => (cond || []).map(t => t.n + ':' + Math.min(t.c, 4)).join(',');

root.TokenFx = { create, sigOf, has: n => !!FX[n], names: () => Object.keys(FX) };
})(window);
