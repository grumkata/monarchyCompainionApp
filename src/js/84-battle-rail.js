/* ══════════════════════════════════════════════════════════════
   84-battle-rail.js — THE THINGS ON THE WOOD ROUND THE BOARD.

   Everything you reach for in a fight is an object on the table, made of the same
   wood and brass and the same figures as the board, not a button on the screen:

     THE PLAQUE (everyone's)   a brass-rimmed plaque set into the board's far frame,
                               over The Line, that says TURN 3. The GM touches it for
                               the next turn. It says BEGIN while the cloth is down.
     THE COG   (the GM's)      a brass plate in the frame's corner: the board's settings.
     THE RAIL  (the GM's)      along the near edge: a standing figure for every character at
                               the table who is not on the board yet (first, each one of
                               their own) and then every monster the GM has kept. PICK ONE
                               UP AND CARRY IT TO A LINE, any line, whoever's it is (a click
                               opens its card to change it). A unit is a figure on a round
                               base, a LARGE one taller on a gold-rimmed base, a FORMATION
                               three small figures on a slab. More than fit and it scrolls.
                               At its end, two brass plates: a plus (a new monster) and a
                               banner (the kept fights). There is no "bring everybody".
     THE MANA  (everyone's)    a ball of light floating at the rail's end, with the number
                               in it. The more mana, the brighter and whiter it burns. Click
                               it and type the number.

   They are drawn by the board's own renderer (81-battle-view.js lends its tools through
   V.kit); what pressing them DOES is 82-battle-ui.js's and 85-battle-drag.js's.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const V = root.BattleView;
if (!V || !V.kit) return;
const K = V.kit;
const B = () => root.Battle;
const T = () => root.TableModel;

const RD = 112, PITCH = 96, TOPY = 8;               /* the rail's depth, a figure's room along it, and the height things stand at */
const KIND = { unit: 'Unit', large: 'Large', form: 'Formation' };
const S = {
  group: null, dish: null, rail: null, items: [], minis: [], sig: '', geoKey: '', scroll: 0, mana: -1, lvl: null, arrows: [],
  label: null, dishHit: null, input: null, built: false, hotNow: false
};
V.rail = S;

/* where everything stands, in board terms (the middle of the felt is 0, 0) */
function dims() {
  const g = V.geo(), G = B().G, Wf = g.bw + 2 * G.FRAME;
  return { g, G, Wf, z: g.bh / 2 + G.FRAME + 14 + RD / 2, zTop: -(g.bh / 2 + G.FRAME / 2) - 8,
    xL: -Wf / 2 + 235, xR: Wf / 2 - 160, xDish: -Wf / 2 + 112,
    xPlus: Wf / 2 - 108, xFlag: Wf / 2 - 46, xCog: Wf / 2 - 40,
    xLine: -g.bw / 2 + (g.n - g.lines.filter(l => l.side === 'en').length) * G.LW };
}

/* ══ WHO IS ON THE RAIL ═══════════════════════════════════════ */
function items() {
  const out = [];
  const sc = V.scene(), C = root.Characters;
  if (sc && C) {
    const here = new Set(T().state.things.filter(t => t.kind === 'token' && t.in === sc.id && t.char).map(t => t.char));
    C.roster().forEach(c => { if (here.has(c.id)) return; out.push({ id: c.id, char: true, name: C.nameOf(c), side: 'al', kind: 'unit', src: (c.who && c.who.pic) || '', art: (c.who && c.who.picArt) || '' }); });
  }
  B().lib.list().forEach(t => out.push({ id: t.id, lib: true, name: t.name, side: t.side, kind: t.entKind, src: t.src, art: t.art, fig: t.fig, hp: t.hp, bodies: t.bodies }));
  return out;
}
const sigOf = list => list.map(i => [i.id, i.name, i.side, i.kind, i.fig, i.src ? i.src.length : 0, i.art, i.bodies].join(':')).join('|');

/* ══ THE BRASS: plates with a picture engraved on them ════════ */
const mkc = (w, h) => { const c = doc.createElement('canvas'); c.width = w; c.height = h; return c; };
const GLYPH = {
  plus(x) { x.fillRect(54, 28, 20, 72); x.fillRect(28, 54, 72, 20); },
  banner(x) { x.fillRect(40, 24, 8, 84); x.beginPath(); x.moveTo(48, 28); x.lineTo(98, 40); x.lineTo(48, 62); x.closePath(); x.fill(); },
  cog(x) {
    x.translate(64, 64); x.beginPath();
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = i % 2 ? 30 : 42; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    x.closePath(); x.fill(); x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.arc(0, 0, 14, 0, 7); x.fill();
  }
};
function brassTex(glyph) {
  const c = mkc(128, 128), x = c.getContext('2d');
  const g = x.createRadialGradient(46, 42, 6, 64, 64, 70); g.addColorStop(0, '#f4dc8a'); g.addColorStop(.5, '#d9ad3c'); g.addColorStop(1, '#8f6616');
  x.fillStyle = g; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill();
  x.strokeStyle = 'rgba(60,36,6,.55)'; x.lineWidth = 3; x.beginPath(); x.arc(64, 64, 54, 0, 7); x.stroke();
  const gl = mkc(128, 128), gx = gl.getContext('2d'); gx.fillStyle = '#3a2509'; GLYPH[glyph](gx);
  x.save(); x.translate(1.5, 1.5); x.globalAlpha = .5; x.drawImage(gl, 0, 0); x.restore();           /* a little highlight below the cut */
  x.drawImage(gl, 0, 0);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; return t;
}
function brassPlate(glyph) {
  const g = new THREE.Group();
  const side = K.M('#9a7424', .35, .5), top = new THREE.MeshStandardMaterial({ map: brassTex(glyph), roughness: .4, metalness: .35, transparent: false });
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(28, 30, 7, 36), [side, top, side]);
  cyl.position.y = 3.5; g.add(cyl);
  return g;
}

/* the plaque: a brass rim, dark wood, and what it says painted on it */
const PLQ = { w: 640, h: 160, text: null, flip: 0 };
function drawPlaque(text) {
  const c = PLQ.canvas || (PLQ.canvas = mkc(PLQ.w, PLQ.h)), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, PLQ.h); g.addColorStop(0, '#34200f'); g.addColorStop(1, '#22150a');
  x.fillStyle = g; x.fillRect(0, 0, PLQ.w, PLQ.h);
  for (let i = 0; i < 90; i++) { x.strokeStyle = 'rgba(' + (Math.random() < .5 ? '10,5,0' : '255,210,150') + ',' + (Math.random() * .07) + ')'; x.lineWidth = 1 + Math.random() * 2; const y = Math.random() * PLQ.h; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(200, y + (Math.random() - .5) * 8, 440, y + (Math.random() - .5) * 8, PLQ.w, y); x.stroke(); }
  x.strokeStyle = 'rgba(232,195,95,.75)'; x.lineWidth = 5; x.strokeRect(14, 14, PLQ.w - 28, PLQ.h - 28);
  x.textBaseline = 'middle'; x.textAlign = 'center';
  const m = /^TURN (\d+)$/.exec(text || '');
  if (m) {
    x.font = '700 70px Cinzel, "Palatino Linotype", Georgia, serif'; x.fillStyle = '#e8c35f'; x.fillText('TURN', 200, 84);
    x.font = '700 134px "Barlow Condensed", "Bahnschrift", "Arial Narrow", sans-serif'; x.lineWidth = 8; x.strokeStyle = '#150d05'; x.strokeText(m[1], 470, 88); x.fillStyle = '#f4efe2'; x.fillText(m[1], 470, 88);
  } else if (text) {
    x.font = '700 76px Cinzel, "Palatino Linotype", Georgia, serif'; x.lineWidth = 8; x.strokeStyle = '#150d05'; x.strokeText(text, PLQ.w / 2, 84); x.fillStyle = '#e8c35f'; x.fillText(text, PLQ.w / 2, 84);
  }
  if (PLQ.tex) PLQ.tex.needsUpdate = true;
}

/* ══ BUILDING ═════════════════════════════════════════════════ */
function ensure() {
  if (S.built) return;
  S.built = true;
  const root3 = K.root3();
  S.group = new THREE.Group(); root3.add(S.group);
  S.rail = new THREE.Group(); S.group.add(S.rail);
  S.dish = new THREE.Group(); S.group.add(S.dish);
  S.minisG = new THREE.Group(); S.rail.add(S.minisG);
  S.frameG = new THREE.Group(); S.group.add(S.frameG);
  S.label = K.el('bt-manav'); S.label.innerHTML = '<b>0</b><i>Mana</i>';
  S.dishHit = K.el('bt-hit bt-dish'); S.dishHit.dataset.tip = 'Mana in the air|Click, and type how much.';
  S.dishHit.addEventListener('click', () => V.ui && V.ui.editMana && V.ui.editMana());
  S.dishHit.addEventListener('wheel', K.wheelThrough, { passive: false });
  S.label.addEventListener('click', () => V.ui && V.ui.editMana && V.ui.editMana());
  [-1, 1].forEach(dir => {
    const a = K.el('bt-hit bt-rarr'); a.textContent = dir < 0 ? '‹' : '›'; a.dataset.dir = dir;
    a.addEventListener('click', () => scrollBy(dir)); a.addEventListener('wheel', ev => { ev.preventDefault(); scrollBy(ev.deltaY > 0 ? 1 : -1); }, { passive: false });
    S.arrows.push(a);
  });
  /* the three brass plates at the rail's end */
  const brass = (glyph, tip, act) => {
    const m = brassPlate(glyph); S.rail.add(m);
    const h = K.el('bt-hit bt-rbtn'); h.dataset.tip = tip; h.dataset.railAct = act;
    h.addEventListener('wheel', K.wheelThrough, { passive: false });
    return { m, h };
  };
  S.plus = brass('plus', 'A new monster|Click to make one.', 'new');
  S.flag = brass('banner', 'Kept fights|Click to open them.', 'fights');
  S.divider = K.mesh(new THREE.BoxGeometry(3, 4, 64), K.M('#c9a227', .4, .5), 0, TOPY - 2, 0); S.rail.add(S.divider);          /* between the party and the monsters */
  S.plus.h.addEventListener('click', () => V.ui && V.ui.railAct && V.ui.railAct('new', S.plus.h));
  S.flag.h.addEventListener('click', () => V.ui && V.ui.railAct && V.ui.railAct('fights', S.flag.h));
  /* the cog and the plaque, set into the board's frame */
  S.cog = brassPlate('cog'); S.frameG.add(S.cog);
  S.cogHit = K.el('bt-hit bt-rbtn'); S.cogHit.dataset.tip = 'The board|Units per line, the ground, the cloth.';
  S.cogHit.addEventListener('click', () => V.ui && V.ui.cogClick && V.ui.cogClick(S.cogHit));
  S.cogHit.addEventListener('wheel', K.wheelThrough, { passive: false });
  S.plaque = new THREE.Group(); S.frameG.add(S.plaque);
  S.plaque.add(K.mesh(new THREE.BoxGeometry(252, 6, 74), K.M('#b28a2c', .35, .55), 0, 9, 0));
  S.plaque.add(K.mesh(new THREE.BoxGeometry(236, 7, 60), K.M('#22150a', .8), 0, 10.5, 0));
  PLQ.tex = new THREE.CanvasTexture(mkc(1, 1)); drawPlaque(null);
  PLQ.tex = new THREE.CanvasTexture(PLQ.canvas); PLQ.tex.encoding = THREE.sRGBEncoding; PLQ.tex.anisotropy = 8;
  S.face = new THREE.Mesh(new THREE.PlaneGeometry(216, 54), new THREE.MeshStandardMaterial({ map: PLQ.tex, roughness: .6, metalness: .1 }));
  S.face.rotation.x = -Math.PI / 2; S.face.position.y = 14.3; S.plaque.add(S.face);
  S.plaqueHit = K.el('bt-hit bt-rbtn'); S.plaqueHit.dataset.tip = 'The turn|Click for the next turn (Space).';
  S.plaqueHit.addEventListener('click', () => V.ui && V.ui.turn && V.ui.turn());
  S.plaqueHit.addEventListener('wheel', K.wheelThrough, { passive: false });
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(() => { PLQ.text = null; });
}

/* the wood itself: the rail, and the plinth the dish stands on when the rail is the GM's alone */
function buildWood() {
  const d = dims(), key = Math.round(d.Wf) + 'x' + Math.round(d.z);
  if (S.geoKey === key) return; S.geoKey = key;
  [S.wood].forEach(o => { if (o) { S.group.remove(o); K.disposeGroup(o); } });
  const wood = () => K.M('#9a6a3a', .7, 0, { map: K.toTex(K.woodCanvas('#7a5230'), [3, 1]) });
  S.wood = new THREE.Group();
  S.wood.add(K.mesh(new THREE.BoxGeometry(d.Wf, 14, RD), wood(), 0, -3, d.z));
  S.inlay = K.mesh(new THREE.BoxGeometry(d.Wf - 36, 2.5, RD - 28), K.M('#1c140d', 1), 0, 4.8, d.z);
  S.wood.add(S.inlay);
  S.wood.add(K.mesh(new THREE.BoxGeometry(d.Wf, 6, 8), K.M('#5a3c1e', .65), 0, 6, d.z + RD / 2 - 4));
  S.group.add(S.wood);
  dishMesh(d);
}
function dishMesh(d) { orbMesh(d); }
/* ══ THE MANA: A BALL OF LIGHT, FLOATING ══════════════════════
   Nothing to pick up: a ball of light in the air at the rail's end. At nothing it is a small, dim, deep blue ember;
   the more mana there is, the brighter, bigger and whiter it burns, with more motes of light going round it. It
   breathes, bobs, and jumps when the number changes. */
const ORB = { tex: null, ball: null, c0: null, c1: null, c2: null, tmp: null, a: null };
function orbTex() {
  if (ORB.tex) return ORB.tex;
  const c = mkc(128, 128), x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.18, 'rgba(255,255,255,.9)'); g.addColorStop(.42, 'rgba(255,255,255,.32)'); g.addColorStop(.75, 'rgba(255,255,255,.07)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  ORB.c0 = K.L('#1f4fc4'); ORB.c1 = K.L('#78adff'); ORB.c2 = K.L('#ffffff'); ORB.tmp = new THREE.Color(); ORB.a = new THREE.Color();
  return (ORB.tex = new THREE.CanvasTexture(c));
}
/* the body of the ball: a glassy sphere with a bright rim, so it reads as a thing and not as a smear of light */
function ballTex() {
  if (ORB.ball) return ORB.ball;
  const c = mkc(128, 128), x = c.getContext('2d');
  const g = x.createRadialGradient(50, 46, 4, 64, 64, 60);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.5, 'rgba(255,255,255,.82)'); g.addColorStop(.86, 'rgba(255,255,255,.55)'); g.addColorStop(.96, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill();
  const s = x.createRadialGradient(44, 38, 0, 44, 38, 16); s.addColorStop(0, 'rgba(255,255,255,.95)'); s.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = s; x.fillRect(0, 0, 128, 128);
  return (ORB.ball = new THREE.CanvasTexture(c));
}
/* one orb: its sprites and how it burns. The rail has one; the field (37-scene-field.js) floats another over the
   allies' side, the same thing at the same size, so it is the same orb wherever you stand */
function newOrb() {
  const o = { g: new THREE.Group(), lvl: null, t: 0, popAt: 0 };
  const mk = (ball) => { const m = new THREE.SpriteMaterial({ map: ball ? ballTex() : orbTex(), transparent: true, depthWrite: false, blending: ball ? THREE.NormalBlending : THREE.AdditiveBlending }); const s = new THREE.Sprite(m); o.g.add(s); return s; };
  o.halo = mk(); o.ball = mk(true); o.glow = mk(); o.core = mk();
  o.motes = []; for (let i = 0; i < 7; i++) { const s = mk(); s.userData.ph = i * .897; o.motes.push(s); }
  o.frame = (now, mana) => burn(o, now, mana);
  o.dispose = () => K.disposeGroup(o.g);
  return o;
}
S.newOrb = newOrb;
function orbMesh(d) {
  if (S.orb) { S.dish.remove(S.orb.g); S.orb.dispose(); }
  S.orb = newOrb(); S.orbG = S.orb.g;
  S.orbHalo = S.orb.halo; S.orbBall = S.orb.ball; S.orbGlow = S.orb.glow; S.orbCore = S.orb.core; S.orbMotes = S.orb.motes;
  S.dish.add(S.orbG);
  S.dish.position.set(d.xDish, TOPY + 66, d.z); S.mana = -1;
}
function orbPop() { S.popAt = performance.now(); if (S.orb) S.orb.popAt = S.popAt; }
/* the colour at a level: deep blue -> bright blue -> white */
function orbCol(out, lv, whiten) {
  out.copy(ORB.c0).lerp(ORB.c1, Math.min(1, lv * 1.5));
  const w = Math.max(0, Math.min(1, (lv - .25) / .75 + (whiten || 0)));
  return out.lerp(ORB.c2, w);
}
function burn(o, now, mana) {
  const t = now / 1000;
  const want = mana > 0 ? 1 - Math.exp(-mana / 14) : 0;          /* 0 at nothing, .51 at ten, .76 at twenty, .88 at thirty, .94 at forty: it keeps getting brighter */
  const rdt = o.t ? Math.min(.5, (now - o.t) / 1000) : 0; o.t = now;               /* real time between frames, so it settles at the same speed on a slow machine */
  o.lvl = o.lvl == null ? want : o.lvl + (want - o.lvl) * Math.min(1, rdt * 3.2);
  const lv = o.lvl, jump = o.popAt ? Math.max(0, 1 - (now - o.popAt) / 340) : 0;
  const br = 1 + .06 * Math.sin(t * 1.7) + .16 * Math.sin(jump * Math.PI);
  const floor = mana > 0 ? 1 : .6;                                 /* an empty orb is a faint ember, not gone */
  const set = (s, size, op, col) => { s.scale.set(size, size, 1); s.material.opacity = Math.max(0, Math.min(1, op)); s.material.color.copy(col); };
  set(o.halo, (84 + 170 * lv) * br, (.24 + .5 * lv) * floor, orbCol(ORB.tmp, lv, 0));
  set(o.ball, (44 + 38 * lv) * br, (.88 + .12 * lv) * floor, orbCol(ORB.tmp, lv, .08 + .45 * lv));
  set(o.glow, (48 + 80 * lv) * br, (.5 + .5 * lv) * floor, orbCol(ORB.a, lv, .05 + .3 * lv));
  set(o.core, (14 + 26 * lv) * br, (.55 + .45 * lv) * floor, orbCol(ORB.tmp, lv, .15 + .35 * lv));
  const n = Math.round(lv * 7);
  o.motes.forEach((s, i) => {
    s.visible = i < n;
    if (!s.visible) return;
    const a = t * (.75 + i * .06) + s.userData.ph, r = (38 + 40 * lv) * br;
    s.position.set(Math.cos(a) * r, Math.sin(a * 1.3) * r * .32, Math.sin(a) * r * .45);
    s.scale.set(11 + 7 * lv, 11 + 7 * lv, 1); s.material.opacity = .45 + .45 * lv; s.material.color.copy(ORB.c2);
  });
  return lv;
}
function orbFrame(now, dt) {
  S.dish.position.y = TOPY + 66 + Math.sin(now / 1000 * 1.1) * 5;
  S.lvl = burn(S.orb, now, S.mana);
  S.orbLevel = S.lvl;
}
S.orbState = () => ({ mana: S.mana, level: S.lvl == null ? 0 : S.lvl, size: S.orbHalo ? S.orbHalo.scale.x : 0, opacity: S.orbHalo ? S.orbHalo.material.opacity : 0, r: S.orbCore ? S.orbCore.material.color.r : 0, g: S.orbCore ? S.orbCore.material.color.g : 0, b: S.orbCore ? S.orbCore.material.color.b : 0 });

/* ══ THE FIGURES ON THE RAIL ══════════════════════════════════ */
function buildMini(it) {
  const g = new THREE.Group(), kind = it.kind, form = kind === 'form', big = kind === 'large';
  const ringCol = it.side === 'en' ? '#d04a38' : '#4a82da';
  const baseMat = K.M('#3a2b1e', .55), ringMat = K.M(ringCol, .35, .3);
  const H = big ? 98 : form ? 56 : 76, R = big ? 32 : form ? 46 : 26;
  if (form) {
    const pts = K.slabPts(46, 27, 48);
    const base = new THREE.Mesh(new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(q => new THREE.Vector2(q[0], q[1]))), { depth: 7, bevelEnabled: false }), baseMat);
    base.rotation.x = -Math.PI / 2; g.add(base);
    g.add(K.tube(pts, 2.6, ringMat, 8));
  } else {
    g.add(K.mesh(new THREE.CylinderGeometry(R, R * 1.07, 7, 36), baseMat, 0, 3.5, 0));
    const ring = K.mesh(new THREE.TorusGeometry(R * .98, 3, 8, 40), ringMat, 0, 8, 0); ring.rotation.x = Math.PI / 2; g.add(ring);
    if (big) { const rim = K.mesh(new THREE.TorusGeometry(R * 1.14, 1.8, 6, 40), K.M('#e8c35f', .3, .5), 0, 7, 0); rim.rotation.x = Math.PI / 2; g.add(rim); }
  }
  const mat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: .3, side: THREE.DoubleSide });
  const spots = form ? [[-17, 6, 0], [1, -9, 1], [19, 5, 2]] : [[0, 0, 0]];
  const planes = spots.map(([ox, oz, i]) => { const pl = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); pl.visible = false; g.add(pl); return { pl, ox, oz, i }; });
  const pic = K.picOf({ src: it.src, art: it.art, fig: it.fig }, { side: it.side, kind: it.kind, name: it.name });
  const mini = { it, g, mat, planes, H, R, form, hov: 0, aspect: 0, born: performance.now(), dimmed: false };
  if (pic.src) K.figureTex(pic.src, pic.cut, rec => {
    mat.map = rec.t; mat.needsUpdate = true;
    const h = (form ? 54 : H) * (pic.cut ? 1 : .78);
    planes.forEach(q => { q.pl.scale.set(h * rec.a, h, 1); q.w = h * rec.a; q.h = h; q.pl.visible = true; });
    mini.aspect = rec.a;
  });
  S.minisG.add(g);
  /* its hit area and its name, which are DOM. Pressing it picks it up; a press that does not travel opens its card */
  mini.hit = K.el('bt-hit bt-mini'); mini.hit.dataset[it.char ? 'char' : 'lib'] = it.id;
  mini.hit.dataset.tip = it.name + '|' + KIND[kind] + ' · ' + (it.char ? 'at the table' : (it.side === 'en' ? 'enemy' : 'ally')) + (it.hp && !form ? ' · ' + it.hp + ' hp' : '') + (form && it.bodies ? ' · ' + it.bodies + ' strong' : '') + '. Carry it to a line, any line. Click to change it.';
  mini.hit.addEventListener('pointerdown', ev => { if (V.drag) V.drag.press('spec', { item: it, el: mini.hit }, ev); });
  mini.hit.addEventListener('wheel', ev => { ev.preventDefault(); scrollBy(ev.deltaY > 0 ? 1 : -1); }, { passive: false });
  mini.tag = K.el('bt-tag bt-mn'); mini.tag.textContent = it.name;
  return mini;
}
function killMini(m) { S.minisG.remove(m.g); K.disposeGroup(m.g); m.hit.remove(); m.tag.remove(); }

function rebuild() {
  const list = items(), sig = sigOf(list);
  if (sig === S.sig) return; S.sig = sig;
  S.minis.forEach(killMini); S.minis = list.map(buildMini);
  const cap = capacity();
  S.scroll = Math.max(0, Math.min(S.scroll, Math.max(0, S.minis.length - cap)));
}
const capacity = () => { const d = dims(); return Math.max(1, Math.floor((d.xR - d.xL) / PITCH)); };
function scrollBy(dir) {
  const cap = capacity(), max = Math.max(0, S.minis.filter(m => !m.gone).length - cap);
  S.scroll = Math.max(0, Math.min(max, S.scroll + dir));
}

/* ══ WHAT CARRYING THINGS ASKS OF IT ══════════════════════════ */
const miniOf = item => S.minis.find(m => m.it.id === item.id && !!m.it.char === !!item.char);
/* a monster you carry leaves a hollow ring (there are more where it came from); a player's character you carry is OFF the rail, and the rest close up */
S.dim = (item, on) => { const m = miniOf(item); if (!m) return; if (m.it.char) m.gone = !!on; else m.dimmed = !!on; };
S.said = () => PLQ.text;
S.hitOf = item => { const m = miniOf(item); return m ? m.hit : null; };
S.posOf = item => { const m = miniOf(item), d = dims(); return { x: m && m.homeX != null ? m.homeX : d.xL, z: d.z - 6 }; };
/* is a point on the board's wood over the rail? (a figure let go there goes back in its box) */
S.overRail = pos => { const d = dims(); return pos.z > d.g.bh / 2 + d.G.FRAME + 4 && pos.z < d.z + RD / 2 + 50 && Math.abs(pos.x) < d.Wf / 2 + 20; };
S.hot = on => { if (S.inlay && S.hotNow !== !!on) { S.hotNow = !!on; S.inlay.material.emissive.setHex(on ? 0x6a1810 : 0x000000); } };

/* ══ THE VIEW CALLS THESE ═════════════════════════════════════ */
S.sync = function () {
  if (!V.scene() || !V.geo()) return;
  ensure(); buildWood();
  rebuild();
  const A = V.A;
  const m = A ? A.options.mana : 0;
  if (m !== S.mana) { const first = S.mana < 0; S.mana = m; if (!first) orbPop(); S.label.firstChild.textContent = m; }
};
/* what the plaque says: the turn, or that the fight is waiting to begin. Looked at every frame, so it is never left blank or behind */
function plaqueTick(gm) {
  const A = V.A, text = !A ? '' : A.fight.cover ? (gm ? 'BEGIN' : '') : 'TURN ' + A.fight.round;
  if (text === PLQ.text) return;
  const first = PLQ.text == null;
  PLQ.text = text;
  if (first || (V.ui && V.ui.reduced && V.ui.reduced())) { drawPlaque(text); PLQ.shown = text; PLQ.flip = 0; }
  else PLQ.flip = performance.now();
}
S.frame = function (now, dt, tilt, yaw, gm) {
  if (!S.built || !V.scene()) return;
  plaqueTick(gm);
  const d = dims();
  S.rail.visible = gm; S.wood.visible = gm;
  /* the plaque and the cog sit in the far frame; the plaque turns over when the number changes */
  S.plaque.position.set(d.xLine, 0, d.zTop);
  S.cog.position.set(d.xCog, 8, d.zTop); S.cog.visible = gm;
  if (PLQ.flip) {
    const u = (now - PLQ.flip) / 320;
    if (u >= 1) { PLQ.flip = 0; S.face.scale.y = 1; S.face.position.y = 14.3; }
    else {
      if (u >= .45 && PLQ.text !== PLQ.shown) { drawPlaque(PLQ.text); PLQ.shown = PLQ.text; }
      const s = u < .45 ? 1 - u / .45 : (u - .45) / .55;
      S.face.scale.y = Math.max(.02, s); S.face.position.y = 14.3 + (1 - s) * 5;
    }
  } else if (PLQ.shown !== PLQ.text) { drawPlaque(PLQ.text); PLQ.shown = PLQ.text; }
  /* the figures along the rail, from where it is scrolled to */
  const cap = capacity(), t = now / 1000;
  let slot = 0;
  S.minis.forEach((m, i) => {
    const home = d.xL + PITCH / 2 + (i - S.scroll) * PITCH;           /* where it stands when everybody is on the rail */
    m.homeX = home;
    m.slot = m.gone ? -1 : slot++;
    const at = m.slot - S.scroll, on = !m.gone && at >= 0 && at < cap;
    m.g.visible = on; m.on = on;
    if (!on) return;
    const x = d.xL + PITCH / 2 + at * PITCH;
    m.px = m.px == null ? x : m.px + (x - m.px) * Math.min(1, dt * 11);     /* they close up smoothly when one is picked up */
    const hop = m.hit.matches(':hover') ? 9 : 0;
    m.lift = (m.lift || 0) + (hop - (m.lift || 0)) * Math.min(1, dt * 14);
    const pop = Math.min(1, (now - m.born) / 260);
    m.g.position.set(m.px, TOPY + m.lift, d.z - 6); m.g.scale.setScalar(.6 + .4 * pop);
    m.mat.opacity = m.dimmed ? .28 : 1;
    m.x = m.px;
    m.planes.forEach(q => {
      q.pl.rotation.x = -tilt; q.pl.rotation.y = yaw;
      const br = 1 + .02 * Math.sin(t * 1.9 + (m.it.id.length + q.i) * 1.3), h = (q.h || 1) * br;
      q.pl.scale.y = h; q.pl.scale.x = (m.it.side === 'en' ? -1 : 1) * (q.w || 1) * (2 - br);
      q.pl.position.set(q.ox, 8 + h / 2, q.oz);
    });
  });
  { const nAll = S.minis.filter(m => !m.gone).length, nCh = S.minis.filter(m => m.it.char && !m.gone).length, bx = d.xL + (nCh - S.scroll) * PITCH;
    S.divider.visible = gm && nCh > 0 && nCh < nAll && bx > d.xL + 10 && bx < d.xR - 10; S.divider.position.set(bx, TOPY - 2, d.z - 6); }
  [[S.plus, d.xPlus], [S.flag, d.xFlag]].forEach(([o, x]) => { o.m.position.set(x, TOPY - 4, d.z - 6); o.m.visible = gm; });
  orbFrame(now, dt);
  S.hasMore = S.minis.filter(m => !m.gone).length > cap;
};
S.layout = function (now, gm) {
  if (!S.built || !V.scene()) return;
  const d = dims(), cap = capacity();
  const at = (x, y) => K.scr(x, y, d.z - 6);
  const place = (el, x, y, w, h) => { el.style.display = ''; el.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)'; el.style.width = Math.round(w) + 'px'; el.style.height = Math.round(h) + 'px'; };
  const none = el => { if (el.style.display !== 'none') el.style.display = 'none'; };
  /* the orb: its hit area is a disc round it, and the number is in it */
  const oc = K.scr(d.xDish, TOPY + 66, d.z), ol = K.scr(d.xDish - 70, TOPY + 66, d.z), orr = K.scr(d.xDish + 70, TOPY + 66, d.z);
  if (oc && ol && orr) {
    const w = Math.max(40, Math.abs(orr.x - ol.x));
    place(S.dishHit, oc.x - w / 2, oc.y - w / 2, w, w);
    S.dishHit.style.pointerEvents = gm ? '' : 'none';
    S.dishHit.style.zIndex = Math.round(oc.y);
    S.label.style.display = S.input ? 'none' : '';
    S.label.style.transform = 'translate(' + Math.round(oc.x) + 'px,' + Math.round(oc.y) + 'px) translate(-50%,-56%) scale(' + Math.max(.8, Math.min(1.5, w / 100)).toFixed(2) + ')';
    S.label.style.zIndex = Math.round(oc.y) + 1;
    if (S.input) S.input.style.transform = 'translate(' + Math.round(oc.x) + 'px,' + Math.round(oc.y) + 'px) translate(-50%,-50%)';
  }
  /* the plaque and the cog, in the far frame */
  {
    const p0 = K.scr(d.xLine, 12, d.zTop), a = K.scr(d.xLine - 126, 12, d.zTop), b = K.scr(d.xLine + 126, 12, d.zTop), c = K.scr(d.xLine, 12, d.zTop - 37), e = K.scr(d.xLine, 12, d.zTop + 37);
    if (gm && p0 && a && b && c && e) { place(S.plaqueHit, a.x, Math.min(c.y, e.y), Math.abs(b.x - a.x), Math.abs(e.y - c.y) + 4); S.plaqueHit.style.zIndex = 5; } else none(S.plaqueHit);
    const q0 = K.scr(d.xCog, 12, d.zTop), q1 = K.scr(d.xCog - 30, 12, d.zTop), q2 = K.scr(d.xCog + 30, 12, d.zTop);
    if (gm && q0 && q1 && q2) { const w = Math.abs(q2.x - q1.x); place(S.cogHit, q0.x - w / 2, q0.y - w * .45, w, w * .9); S.cogHit.style.zIndex = 5; } else none(S.cogHit);
  }
  /* the figures */
  S.minis.forEach(m => {
    if (!gm || !m.on) { none(m.hit); none(m.tag); return; }
    const foot = at(m.x, TOPY), head = at(m.x, TOPY + m.H + 12), l = at(m.x - m.R, TOPY), r = at(m.x + m.R, TOPY);
    if (!foot || !head || !l || !r) { none(m.hit); none(m.tag); return; }
    const w = Math.abs(r.x - l.x);
    place(m.hit, foot.x - w * .85, head.y - 4, w * 1.7, foot.y - head.y + 22);
    m.hit.style.zIndex = Math.round(foot.y);
    m.tag.style.display = '';
    const sz = Math.max(9, Math.min(12, w / 5));
    m.tag.style.fontSize = sz.toFixed(1) + 'px'; m.tag.style.maxWidth = Math.round(w * 1.7) + 'px';
    m.tag.style.transform = 'translate(' + Math.round(foot.x) + 'px,' + Math.round(foot.y + 3) + 'px) translate(-50%,0)';
  });
  /* the three brass plates at the end, and the arrows */
  [[S.plus, d.xPlus], [S.flag, d.xFlag]].forEach(([o, x]) => {
    if (!gm) { none(o.h); return; }
    const foot = at(x, TOPY), head = at(x, TOPY + 40), l = at(x - 30, TOPY), r = at(x + 30, TOPY);
    if (!foot || !head || !l || !r) { none(o.h); return; }   /* any of them behind you: the head turned right round */
    const w = Math.abs(r.x - l.x); place(o.h, foot.x - w * .55, head.y - 4, w * 1.1, foot.y - head.y + 10); o.h.style.zIndex = Math.round(foot.y);
  });
  S.arrows.forEach(a => {
    const nn = S.minis.filter(m => !m.gone).length, dir = +a.dataset.dir, over = nn > cap;
    if (!gm || !over || (dir < 0 && S.scroll <= 0) || (dir > 0 && S.scroll >= nn - cap)) { none(a); return; }
    const x = dir < 0 ? d.xL - 6 : d.xR + 6, p = at(x, TOPY + 30), q = at(x - 14, TOPY + 30), q2 = at(x + 14, TOPY + 30);
    if (!p || !q || !q2) { none(a); return; }
    const w = Math.max(18, Math.abs(q2.x - q.x)); place(a, p.x - w / 2, p.y - w * .75, w, w * 1.5); a.style.zIndex = Math.round(p.y); a.style.fontSize = Math.round(w * 1.1) + 'px'; a.style.lineHeight = Math.round(w * 1.5) + 'px';
  });
};
S.hide = function () {
  if (!S.built) return;
  S.group.visible = false;
  S.minis.forEach(m => { m.hit.style.display = 'none'; m.tag.style.display = 'none'; });
  [S.dishHit, S.label, S.plaqueHit, S.cogHit, S.plus.h, S.flag.h].concat(S.arrows).forEach(e => { e.style.display = 'none'; });
};
S.show = function () { if (S.built) S.group.visible = true; S.sig = ''; S.geoKey = ''; PLQ.text = null; PLQ.shown = null; };
/* the table was left: forget the figures, they are the next fight's to stand */
S.reset = function () { S.minis.forEach(killMini); S.minis = []; S.sig = ''; S.mana = -1; S.scroll = 0; PLQ.text = null; PLQ.shown = null; };

/* what the library does reaches the rail the moment it happens */
if (B()) B().on(why => { if (why === 'lib' && V.scene && V.scene()) { try { S.sync(); } catch (e) {} } });
})(window, document);
