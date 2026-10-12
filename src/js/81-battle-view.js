/* ══════════════════════════════════════════════════════════════
   81-battle-view.js — THE BOARD, ON THE TABLE.

   A real three-dimensional board lies on the wood and is seen through the
   table's OWN camera (Table3D.camera), so it pans, zooms, tilts and turns with
   the wood and cannot drift off it: the same way the dice are drawn
   (34-gl-pieces.js). Not a CSS sheet tilted back and not a picture of one.

   What stands on it are the pictures a piece already wears (65-token-look.js):
   each figure stands up on a turned base ringed in its side's colour, leaning
   to face the eye. Their health, tokens and name are small labels that follow
   them (DOM, so they stay sharp).

   The scene itself is still a prop on the wood — `#combat-prop`, an empty box
   exactly the footprint of the board — so every piece of the table that works
   with props (placing, framing, locking in, the field's own camera) keeps
   working without a word of it changing.

   It draws what 80-battle.js holds and writes nothing but through it.
   82-battle-ui.js is the plate, the library, the setup and the keys; 83-token-fx.js is what
   each token looks like on the figure that carries it; 84-battle-rail.js is the rail of
   figures under the board and the mana.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const B = () => root.Battle;
const T = () => root.TableModel;
const D = () => root.Table3D;
const LOOK = () => root.TokenLook;
const TILT_STAGE = 40;                    /* the camera's angle for a fight, degrees from overhead */

/* ── the state every part of the view shares ── */
const V = {
  sel: null,            /* the piece you are pointing at */
  hover: null,          /* the piece under the pointer */
  prev: null,           /* ...once it has been there long enough to preview */
  buf: '', mode: 'hit', /* a number being typed, and whether it heals */
  names: false,         /* every name, not only the picked one's */
  ui: null,             /* 82-battle-ui.js */
  A: null,              /* the arrangement last drawn */
  pcs: new Map()
};
root.BattleView = V;

let booted = false, alive = false, raf = 0;
let cv, renderer, scene3, cam3, root3;
let ov;                                   /* the overlay layer (labels, hit areas, the card) */
let cur = null;                           /* the scene thing being shown */
let geo = null;                           /* its geometry */
const mats = {};
const Mfl = null;

/* ══ THREE ════════════════════════════════════════════════════ */
const L = c => new THREE.Color(c).convertSRGBToLinear();
const mesh = (g, m, x, y, z) => { const o = new THREE.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); return o; };
const M = (c, r, m, extra) => new THREE.MeshStandardMaterial(Object.assign({ color: L(c), roughness: r == null ? .8 : r, metalness: m || 0 }, extra || {}));
const mkCanvas = (w, h) => { const c = doc.createElement('canvas'); c.width = w; c.height = h; return c; };
const toTex = (c, rep, an) => {
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = an || 8;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  return t;
};
const lathe = (pts, seg) => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg || 40);

const woodCanvas = base => {
  const c = mkCanvas(256, 256), x = c.getContext('2d'); x.fillStyle = base; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 100; i++) {
    x.strokeStyle = 'rgba(' + (Math.random() < .5 ? '30,16,4' : '255,210,150') + ',' + (Math.random() * .11) + ')';
    x.lineWidth = 1 + Math.random() * 2.4; x.beginPath(); const y = Math.random() * 256; x.moveTo(0, y);
    x.bezierCurveTo(80, y + (Math.random() - .5) * 8, 170, y + (Math.random() - .5) * 8, 256, y + (Math.random() - .5) * 6); x.stroke();
  }
  return c;
};
/* a lane of felt: the ground's colour, a side's tint, a brass inlay, and the line's own name */
function laneCanvas(w, h, base, tint, label, ink) {
  const c = mkCanvas(w, h), x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, w, h);
  for (let i = 0; i < w * h / 90; i++) {
    x.fillStyle = 'rgba(' + (Math.random() < .5 ? '255,255,255' : '0,0,0') + ',' + (Math.random() * .1) + ')';
    x.fillRect(Math.random() * w, Math.random() * h, 1.6, 1.6);
  }
  /* woven: a fine cross-hatch, so the felt is cloth and not paint */
  x.fillStyle = 'rgba(0,0,0,.07)';
  for (let yy = 0; yy < h; yy += 4) x.fillRect(0, yy, w, 1);
  for (let xx = 0; xx < w; xx += 4) x.fillRect(xx, 0, 1, h);
  /* the felt is a little darker at both ends of the lane, and even between: a gradient across a tall
     lane that was round came out as a pale smear half way down */
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(0,0,0,.16)'); g.addColorStop(.22, 'rgba(0,0,0,0)'); g.addColorStop(.78, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.2)');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  if (tint) { x.fillStyle = tint; x.fillRect(0, 0, w, h); }
  const e = Math.round(Math.min(w, h) * .03);
  x.strokeStyle = 'rgba(232,195,95,.34)'; x.lineWidth = Math.max(2, Math.round(w * .008)); x.strokeRect(e, e, w - 2 * e, h - 2 * e);
  if (label) {
    const parts = String(label).toUpperCase().split(' ');
    const a = parts.shift(), b = parts.join(' ');
    x.textBaseline = 'middle'; x.textAlign = 'center';
    const put = (cy) => {
      x.fillStyle = ink;
      x.font = '700 ' + Math.round(w * .082) + 'px Cinzel, "Crimson Text", Georgia, serif';
      x.fillText(a, w / 2, cy);
      if (b) {                                         /* the line's own name, as big as the lane lets it be */
        let px = Math.round(w * .15);
        x.font = '700 ' + px + 'px Cinzel, "Crimson Text", Georgia, serif';
        const m = x.measureText(b).width, room = w * .86;
        if (m > room) { px = Math.floor(px * room / m); x.font = '700 ' + px + 'px Cinzel, "Crimson Text", Georgia, serif'; }
        x.fillText(b, w / 2, cy + w * .105);
      }
    };
    put(w * .12);                                       /* far end and near end: it is read from either */
    put(h - w * .24);
  }
  return c;
}
/* a lane's felt: the side's colour (a shade apart from its neighbour), a touch of the ground's own */
function laneColour(l, i, ground) {
  /* the ground's own colour (meadow green, desert sand, dungeon stone) with the side's colour in it, red for the enemy and blue for the allies, and a lane in two a shade apart */
  const tinted = mixHex(ground, l.side === 'en' ? '#a3232b' : '#27508f', .32);
  return mixHex(tinted, i % 2 ? '#000000' : '#ffffff', i % 2 ? .08 : .04);
}
const hexA = (h, a) => 'rgba(' + [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16)).join(',') + ',' + a + ')';
V.laneColour = laneColour;
const mixHex = (a, b, t) => {
  const pa = [1, 3, 5].map(k => parseInt(a.slice(k, k + 2), 16)), pb = [1, 3, 5].map(k => parseInt(b.slice(k, k + 2), 16));
  return '#' + pa.map((v, k) => Math.round(v + (pb[k] - v) * t).toString(16).padStart(2, '0')).join('');
};

/* ══ BOOT ═════════════════════════════════════════════════════ */
function boot() {
  if (booted) return true;
  if (typeof THREE === 'undefined') return false;
  try {
    cv = doc.createElement('canvas'); cv.id = 'bt-cv';
    renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
  } catch (e) { console.error('[monarchy] the board could not start:', e); return false; }
  doc.body.appendChild(cv);
  ov = doc.createElement('div'); ov.id = 'bt-ov'; doc.body.appendChild(ov);
  scene3 = new THREE.Scene();
  scene3.add(new THREE.HemisphereLight(L('#ffe9c8'), L('#33303c'), 1.0));
  const key = new THREE.DirectionalLight(L('#fff0d6'), 1.25); key.position.set(-500, 900, 800); scene3.add(key);
  const fill = new THREE.DirectionalLight(L('#9ab4e0'), 0.4); fill.position.set(700, 300, 400); scene3.add(fill);
  cam3 = new THREE.PerspectiveCamera(30, 1, 10, 40000);
  root3 = new THREE.Group(); root3.matrixAutoUpdate = false; scene3.add(root3);
  /* the board's lighting is its own: shadows are drawn, not computed */
  mats.blob = (() => {
    const c = mkCanvas(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 31);
    g.addColorStop(0, 'rgba(0,0,0,.8)'); g.addColorStop(.55, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
  })();
  root.addEventListener('resize', fit);
  fit();
  booted = true;
  return true;
}
function fit() {
  if (!renderer) return;
  const W = root.innerWidth, H = root.innerHeight;
  renderer.setSize(W, H, false); cv.style.width = W + 'px'; cv.style.height = H + 'px';
  cam3.aspect = W / H;
}

/* ══ WHERE THE BOARD IS ═══════════════════════════════════════
   Board-local (x across, y up, z toward you; the middle of the felt is 0,0,0)
   to the table's own units. The scene is a box on the wood; the board sits in
   it with a little headroom above and the controls' strip below. */
let BX = 0, BY = 0, RC = 1, RS = 0;
function place(s) {
  const g = geo, c = { x: s.x + s.w / 2, y: s.y + s.h / 2 };
  const r = ((s.rot || 0) * Math.PI) / 180; RC = Math.cos(r); RS = Math.sin(r);
  const off = B().G.HEAD + g.Hb / 2 - s.h / 2;                  /* the felt's middle, from the box's middle */
  BX = c.x - RS * off; BY = c.y + RC * off;
}
const toTable = (x, y, z) => [BX + RC * x - RS * z, BY + RS * x + RC * z, y];
const toBoard = (X, Y) => { const dx = X - BX, dy = Y - BY; return { x: RC * dx + RS * dy, z: -RS * dx + RC * dy }; };
/* ── TWO CAMERAS, ONE BOARD ───────────────────────────────────
   On the table the board is seen through the table's camera. Standing in the field
   (37-scene-field.js) the SAME pieces — the same figures, the same blows, the same tokens
   on them — are carried into the field's world and seen through ITS camera, so everything
   that asks "where is this on the screen" or "what is under the pointer" (the labels, the
   hit areas, the numbers, the drag) asks whichever camera is looking. */
let hosted = null;                                  /* the field's group, while it is showing the board */
const lens = () => (hosted && root.__field && root.__field.proj) || null;
const scr = (x, y, z) => { const F = lens(); if (F) return F.toScreen(x, y, z); const t = toTable(x, y, z); return D().toScreen(t[0], t[1], t[2]); };
V.toBoard = toBoard; V.toTable = toTable; V.scr = scr;

/* the point a screen position is over on the wood, in board terms */
V.boardAt = (sx, sy) => { const F = lens(); if (F) return F.boardAt(sx, sy); const q = D().screenToTable(sx, sy); return q ? toBoard(q.x, q.y) : null; };
/* is the pointer over the board itself (the felt and its frame)? the table asks, to frame the fight and go in */
V.overBoard = (sx, sy) => {
  if (!geo || !cur) return false;
  const q = D().screenToTable(sx, sy); if (!q) return false;
  const p = toBoard(q.x, q.y), G = B().G;
  return Math.abs(p.x) <= geo.bw / 2 + G.FRAME && Math.abs(p.z) <= geo.bh / 2 + G.FRAME;
};

/* ══ THE BOARD, BUILT ═════════════════════════════════════════ */
let boardGroup = null, boardSig = '', laneMeshes = [];
function disposeGroup(grp) {
  grp.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); }
  });
}
function terrainOf(s) { return root.TableContent.terrainOf(s.setup && s.setup.terrain); }

function buildBoard(s) {
  const Bt = B(), G = Bt.G, g = geo;
  if (boardGroup) { root3.remove(boardGroup); disposeGroup(boardGroup); }
  boardGroup = new THREE.Group(); root3.add(boardGroup); laneMeshes = [];
  boardGroup.visible = !hosted;                       /* the field has its own ground */
  const TC = root.TableContent.TERRAINS[terrainOf(s)];
  const bw = g.bw, bh = g.bh, Wf = bw + 2 * G.FRAME, Df = bh + 2 * G.FRAME;
  /* the wood, under and round the felt */
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(Wf + 300, Df + 300), new THREE.MeshBasicMaterial({ map: mats.blob, transparent: true, depthWrite: false, opacity: .85 }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(30, -7, 40); boardGroup.add(shadow);
  boardGroup.add(mesh(new THREE.BoxGeometry(Wf, 14, Df), M('#9a6a3a', .7, 0, { map: toTex(woodCanvas('#7a5230'), [3, 1]) }), 0, -3, 0));
  boardGroup.add(mesh(new THREE.BoxGeometry(Wf, 3, Df), M('#5a3c1e', .65, 0, { map: toTex(woodCanvas('#5a3c1e'), [3, 1]) }), 0, 5, 0));
  boardGroup.add(mesh(new THREE.BoxGeometry(bw + 14, 2.5, bh + 14), M('#120d08', 1), 0, 6.5, 0));
  /* the lanes */
  g.lines.forEach((l, i) => {
    const base = laneColour(l, i, TC.mat.ground);
    const ink = hexA(/^#[0-9a-f]{6}$/i.test(TC.mat.ink) ? TC.mat.ink : '#f4efe2', .86);
    const wpx = 320, hpx = Math.round(wpx * (bh - 6) / (G.LW - 6));
    const cnv = laneCanvas(wpx, hpx, base, null, (l.side === 'en' ? 'Enemy ' : 'Ally ') + l.label, ink);
    const m = new THREE.MeshStandardMaterial({ map: toTex(cnv, null, 8), roughness: .98, metalness: 0, emissive: new THREE.Color(0x000000) });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(G.LW - 6, bh - 6), m);
    pl.rotation.x = -Math.PI / 2; pl.position.set(Bt.lineX(g, i), 9, 0); boardGroup.add(pl); laneMeshes.push(pl);
  });
  /* The Line: brass, between the two frontlines */
  const eN = g.lines.filter(l => l.side === 'en').length;
  const xl = -bw / 2 + (g.n - eN) * G.LW;
  boardGroup.add(mesh(new THREE.BoxGeometry(9, 9, bh + 8), M('#e8c35f', .28, .5), xl, 11, 0));
  boardSig = sigOf(s);
}
const sigOf = s => [terrainOf(s), geo.width, geo.lines.map(l => l.key + ':' + l.label).join(',')].join('|');

/* ══ THE PICTURES ═════════════════════════════════════════════
   A cutout figure gets a light sticker edge so it reads against dark felt; a
   portrait (a rectangle with its own background) is cut to a round token. */
const texCache = new Map();
function figureTex(src, cut, cb) {
  const k = (cut ? 'c:' : 'p:') + src;
  const hit = texCache.get(k);
  if (hit) { if (hit.t) cb(hit); else hit.q.push(cb); return; }
  const rec = { t: null, a: .8, q: [cb] }; texCache.set(k, rec);
  const im = new Image();
  im.onload = () => {
    let out;
    if (cut) {
      const r = 5, w = im.width + r * 2, h = im.height + r * 2;
      const sil = mkCanvas(w, h), sx = sil.getContext('2d'); sx.drawImage(im, r, r);
      sx.globalCompositeOperation = 'source-in'; sx.fillStyle = '#f4e9c8'; sx.fillRect(0, 0, w, h);
      out = mkCanvas(w, h); const ox = out.getContext('2d');
      for (let a = 0; a < 16; a++) { const ang = a / 16 * Math.PI * 2; ox.drawImage(sil, Math.cos(ang) * r * .85, Math.sin(ang) * r * .85); }
      ox.drawImage(sil, 0, 0); ox.drawImage(im, r, r);
      /* the same picture with a fine dark line round it, for the field */
      const sil2 = mkCanvas(w, h), s2 = sil2.getContext('2d'); s2.drawImage(im, r, r);
      s2.globalCompositeOperation = 'source-in'; s2.fillStyle = 'rgba(30,22,16,.9)'; s2.fillRect(0, 0, w, h);
      const fo = mkCanvas(w, h), fx2 = fo.getContext('2d');
      for (let a = 0; a < 12; a++) { const ang = a / 12 * Math.PI * 2; fx2.drawImage(sil2, Math.cos(ang) * 1.8, Math.sin(ang) * 1.8); }
      fx2.drawImage(im, r, r);
      rec.field = fo;
    } else {
      const s = 256; out = mkCanvas(s, s); const ox = out.getContext('2d');
      ox.fillStyle = '#f4e9c8'; ox.beginPath(); ox.arc(s / 2, s / 2, s / 2 - 2, 0, 7); ox.fill();
      ox.save(); ox.beginPath(); ox.arc(s / 2, s / 2, s / 2 - 12, 0, 7); ox.clip();
      const k2 = Math.max((s - 24) / im.width, (s - 24) / im.height);
      ox.drawImage(im, s / 2 - im.width * k2 / 2, s / 2 - im.height * k2 / 2, im.width * k2, im.height * k2); ox.restore();
    }
    rec.t = toTex(out, null, 8); rec.a = out.width / out.height;
    if (rec.field) { rec.t.fieldTex = toTex(rec.field, null, 8); rec.field = null; }
    rec.q.splice(0).forEach(f => f(rec));
  };
  im.onerror = () => { rec.q.splice(0); };
  im.src = src;
}
function picOf(t, e) {
  const L2 = LOOK();
  const v = { src: t.src || e.pic || '', art: t.art || e.art || '', fig: t.fig || e.fig || '', side: e.side, entKind: e.kind, name: e.name };
  return L2 ? L2.pic(v) : { src: '', cut: false };
}

/* ══ PIECES ═══════════════════════════════════════════════════
   A unit stands on a round base; a large one on a bigger base with a gold rim. A
   formation stands on a slab that HUGS ITS MEN, inside its own line, and is drawn
   with the men it has left: all of them up to fifteen (so three left is three
   figures, close together and big, not three specks on a long board), and past that
   as many as keep the same proportion. Each figure breathes in its own time, and
   how it carries itself says how the formation feels: they stand as one when
   Unbreakable, fidget when Wavering, cower when Crumbling and run when Broken. */
const FORM_CAP = 15;
const LEAD_RANK = { Unbreakable: 5, Stable: 4, Wavering: 3, Crumbling: 2, Broken: 1 };
const slabPts = (hw, hd, n) => Array.from({ length: n }, (_, i) => {
  const a = i / n * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), k = 2 / 3.2;
  return [hw * Math.sign(c) * Math.pow(Math.abs(c), k), hd * Math.sign(s) * Math.pow(Math.abs(s), k)];
});
const tube = (pts, r, mat, y) => {
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(q => new THREE.Vector3(q[0], 0, q[1])), true), 96, r, 6, true), mat);
  m.position.y = y; return m;
};
/* the ring of light on the ground under a figure in the field: a bright edge, fading in to a breath of colour */
let DECAL = null;
function decalTex() {
  if (DECAL) return DECAL;
  const S = 256, c = mkCanvas(S, S), x = c.getContext('2d'), g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,.05)'); g.addColorStop(.6, 'rgba(255,255,255,.12)'); g.addColorStop(.78, 'rgba(255,255,255,1)');
  g.addColorStop(.84, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  DECAL = toTex(c, null, 8);
  return DECAL;
}
/* the base, its ring, the ring that says "picked" and the shadow: built to the size the piece's place gives it */
function footprint(pv, hw, hd) {
  const key = Math.round(hw) + 'x' + Math.round(hd);
  if (pv.fp === key) return; pv.fp = key; pv.hw = hw;
  ['base', 'ring', 'sel', 'rim'].forEach(k => { const o = pv[k]; if (o) { pv.g.remove(o); o.geometry.dispose(); pv[k] = null; } });
  const R = pv.R;
  if (pv.form) {
    const pts = slabPts(hw, hd, 64);
    const base = new THREE.Mesh(new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(q => new THREE.Vector2(q[0], q[1]))), { depth: 11, bevelEnabled: false }), pv.baseMat);
    base.rotation.x = -Math.PI / 2; pv.base = base;
    pv.ring = tube(pts, 3.4, pv.ringMat, 12);
    pv.sel = tube(slabPts(hw + 14, hd + 12, 64), 5, pv.selMat, 8);
  } else {
    pv.base = mesh(new THREE.CylinderGeometry(R, R * 1.07, 11, 44), pv.baseMat, 0, 5.5, 0);
    pv.ring = mesh(new THREE.TorusGeometry(R * .98, 4.6, 8, 64), pv.ringMat, 0, 12, 0); pv.ring.rotation.x = Math.PI / 2;
    pv.sel = mesh(new THREE.TorusGeometry(R * 1.36, 6, 8, 64), pv.selMat, 0, 8, 0); pv.sel.rotation.x = Math.PI / 2;
    if (pv.big) { pv.rim = mesh(new THREE.TorusGeometry(R * 1.14, 2.4, 6, 64), pv.rimMat, 0, 11, 0); pv.rim.rotation.x = Math.PI / 2; }
  }
  [pv.base, pv.ring, pv.sel, pv.rim].forEach(o => { if (o) pv.g.add(o); });
  pv.sel.visible = false;
  if (!pv.decal) {
    pv.decal = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: decalTex(), color: pv.ringMat.color.clone(), transparent: true, depthWrite: false, opacity: 0 }));
    pv.decal.rotation.x = -Math.PI / 2; pv.decal.visible = false; pv.g.add(pv.decal);
  }
  pv.decal.userData.sx = pv.form ? hw * 2 + 40 : R * 2.5; pv.decal.userData.sz = pv.form ? hd * 2 + 40 : R * 2.5;
  pv.shadow.userData.sx = pv.shadow.scale.x; pv.shadow.userData.sy = pv.shadow.scale.y;
  pv.shadow.scale.set(hw * 3.2, pv.form ? hd * 2.6 : hw * 3.2, 1);
}
function pieceView(p, ghost) {
  const t = p.t, e = p.e, G = B().G;
  const kind = e.kind, form = kind === 'form', big = kind === 'large';
  const pv = {
    id: t.id, x: p.x, z: p.z, tx: p.x, tz: p.z, lift: 0, hv: 0, drop: 0, pop: 1, flash: 0, jx: 0, vis: 1, born: performance.now(),
    big, form, snap: null, dragX: null, dragZ: null, fig: null, hd: 0, hw: 0, fh: 0, fx: null, fxSig: '', p, ghost: !!ghost
  };
  const g = new THREE.Group(); root3.add(g); pv.g = g;
  pv.R = form ? Math.min(G.LW / 2 - 12, 62) : G.BASE * (big ? 1.18 : 1);
  pv.H = G.FIG * (big ? 1.22 : 1);
  pv.hd = form ? 30 : 0;
  pv.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: mats.blob, transparent: true, depthWrite: false }));
  pv.shadow.rotation.x = -Math.PI / 2; pv.shadow.position.y = 1; g.add(pv.shadow);
  pv.baseMat = M('#3a2b1e', .55);
  pv.ringMat = M(e.side === 'en' ? '#d04a38' : '#4a82da', .35, .3);
  pv.selMat = new THREE.MeshBasicMaterial({ color: L('#f7d35a') });
  pv.rimMat = M('#e8c35f', .3, .5);
  footprint(pv, pv.R, pv.hd);
  /* the figure(s): one, or up to FORM_CAP on a formation's slab (all of them share one picture and one set of colours) */
  pv.mat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: .3, side: THREE.DoubleSide, depthWrite: false });     /* drawn far to near by pv.order, so the figure does not need to be tested against what it wears */
  pv.planes = [];
  const n = form ? FORM_CAP : 1;
  for (let i = 0; i < n; i++) {
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), pv.mat);
    pl.visible = false; g.add(pl);
    pv.planes.push({ pl, i, aspect: 0, cut: true, sw: 1, sh: 1, tx: 0, tz: 0, px: null, pz: 0, show: i === 0, dying: 0, born: 0, ph: i * 2.17 + (i * 7 % 5) * .31 });
  }
  /* what the tokens it carries look like on it */
  pv.fxp = new THREE.Group(); g.add(pv.fxp);
  pv.fxg = new THREE.Group(); pv.fxp.add(pv.fxg);
  if (ghost) return pv;                                   /* a ghost is only the figure: no labels, nothing to point at */
  /* the labels, which are DOM */
  const dom = pv.dom = {};
  dom.cap = el('bt-cap'); dom.cap.innerHTML = '<i class="bt-gh"></i><i class="bt-fl"></i><b></b><s class="bt-dn">&#10003;</s><s class="bt-nu"></s>';
  dom.fl = dom.cap.querySelector('.bt-fl'); dom.gh = dom.cap.querySelector('.bt-gh'); dom.cb = dom.cap.querySelector('b');
  dom.dn = dom.cap.querySelector('.bt-dn'); dom.nu = dom.cap.querySelector('.bt-nu');
  dom.ap = el('bt-ap'); dom.ap.innerHTML = '<u class="bt-aq" title="Quick action"></u><u class="bt-af" title="Full action"></u>';
  dom.mor = el('bt-mor'); dom.mor.style.display = 'none';
  dom.ch = el('bt-ch'); dom.nm = el('bt-nm'); dom.hit = el('bt-hit'); dom.hit.dataset.btId = t.id;
  dom.hit.addEventListener('pointerenter', () => V.ui && V.ui.hover(t.id, true));
  dom.hit.addEventListener('pointerleave', () => V.ui && V.ui.hover(t.id, false));
  dom.hit.addEventListener('pointerdown', ev => V.ui && V.ui.press(t.id, ev));
  dom.hit.addEventListener('wheel', wheelThrough, { passive: false });
  dom.hit.addEventListener('contextmenu', ev => { ev.preventDefault(); ev.stopPropagation(); V.ui && V.ui.context(t.id, ev); });
  return pv;
}
const jit = i => (((i * 53) % 7) - 3) * 1.1;
/* where each figure of a piece stands: a unit's is in the middle; a formation's are packed in ranks on a slab that fits them */
function planeLayout(pv) {
  const p = pv.p; if (!p) return;
  const e = p.e, G = B().G, q0 = pv.planes[0];
  const k = q0.cut === false ? .78 : 1, asp = q0.aspect || .62;
  if (!pv.form) {
    q0.show = true; q0.sh = pv.H * k; q0.sw = q0.sh * asp; q0.tx = q0.tz = 0;
    if (q0.px == null) { q0.px = 0; q0.pz = 0; }
    pv.fh = pv.H; return;
  }
  const total = Math.max(1, e.total | 0), alive = Math.max(0, Math.min(total, e.alive | 0));
  const n = alive <= 0 ? 0 : (total <= FORM_CAP ? alive : Math.max(1, Math.ceil(alive * FORM_CAP / total)));
  const span = p.span || 2 * G.SP;
  const STEPS = [[1, 1], [2, .9], [3, .82], [4, .74], [6, .66], [9, .58], [12, .52], [99, .47]];
  let fs = STEPS.find(r => n <= r[0])[1], plan = null;
  const want = Math.max(1, Math.min(n || 1, Math.round(Math.sqrt((n || 1) * 1.2))));      /* the ranks I would like: about as wide as they are deep */
  for (let tries = 0; tries < 12; tries++) {                       /* smaller figures until the ranks fit the line's room */
    const fh = G.FIG * fs * k, fw = fh * asp, dx = Math.max(fw * .64, 22), dz = Math.max(fh * .34, 20);
    const maxCols = Math.max(1, Math.floor((2 * pv.R - fw * .4) / dx));
    const cols = Math.min(maxCols, want);
    const rows = Math.max(1, Math.ceil((n || 1) / cols));
    plan = { fh, fw, dx, dz, cols, rows };
    if (cols >= want && rows * dz + fh * .4 <= span - 18) break;
    fs *= .92;
  }
  const { fh, fw, dx, dz, cols, rows } = plan;
  const hw = Math.min(pv.R, Math.max(36, ((cols - 1) * dx + fw) / 2 + 12));
  const hd = Math.max(28, ((rows - 1) * dz) / 2 + fh * .14 + 14);
  pv.hd = hd; pv.fh = fh;
  footprint(pv, hw, hd);
  pv.planKey = Math.round(hw / 5) + 'x' + Math.round(hd / 5) + 'x' + Math.round(fh / 5);
  const now = performance.now();
  pv.planes.forEach((q, i) => {
    const was = q.show;
    q.sw = fw; q.sh = fh;
    q.show = i < n;
    if (!q.show) { if (was && !q.dying) q.dying = now; return; }
    q.dying = 0;
    const r = Math.floor(i / cols), c = i % cols;
    const inRow = r === rows - 1 ? n - (rows - 1) * cols : cols;
    const stag = rows > 1 && cols > 1 ? (r % 2 ? .22 : -.22) * dx : 0;
    q.tx = (c - (inRow - 1) / 2) * dx + stag + jit(i);
    q.tz = (r - (rows - 1) / 2) * dz;
    if (q.px == null || !was) { q.px = q.tx; q.pz = q.tz; q.born = now; }       /* one that comes back pops in where it stands */
  });
}
function el(cls, parent) { const d = doc.createElement('div'); d.className = cls; (parent || ov).appendChild(d); return d; }
/* the table zooms on the wheel; a piece under the pointer must not swallow it */
function wheelThrough(ev) {
  const vp = doc.getElementById('vp'); if (!vp) return;
  ev.preventDefault();
  vp.dispatchEvent(new WheelEvent('wheel', { deltaX: ev.deltaX, deltaY: ev.deltaY, deltaMode: ev.deltaMode, clientX: ev.clientX, clientY: ev.clientY, ctrlKey: ev.ctrlKey, shiftKey: ev.shiftKey, bubbles: true, cancelable: true }));
}
V.wheelThrough = wheelThrough;

function killPiece(pv) {
  root3.remove(pv.g); disposeGroup(pv.g);
  if (pv.fx) pv.fx.dispose();
  [pv.dom.cap, pv.dom.ch, pv.dom.nm, pv.dom.hit, pv.dom.mor, pv.dom.ap].forEach(d => d.remove());
}

/* ── the figure's picture, set when it arrives ── */
function dress(pv, t, e) {
  const p = picOf(t, e);
  const key = (p.cut ? 'c:' : 'p:') + p.src + '|' + e.kind;
  if (pv.fig === key) return; pv.fig = key;
  if (!p.src) { pv.planes.forEach(q => { q.aspect = 0; q.pl.visible = false; }); return; }
  figureTex(p.src, p.cut, rec => {
    pv.mat.map = rec.t; pv.mat.needsUpdate = true;
    pv.planes.forEach(q => { q.aspect = rec.a; q.cut = p.cut; });
    planeLayout(pv);
  });
}

/* ══ GHOSTS ═══════════════════════════════════════════════════
   A figure that is only a picture of one: what the GM is carrying in from the rail, and the place it
   would stand if it were let go here (the same figure, faint). Drawn by the same code as a real piece,
   so what you see land is what lands. */
const ghosts = [];
let ghostN = 0;
V.makeGhost = (d, o) => {
  o = o || {};
  const G = B().G, kind = d.kind || 'unit';
  const e = { kind, side: d.side || 'al', name: d.name || '', hp: d.hp == null ? 1 : d.hp | 0, max: d.max != null ? d.max | 0 : (d.hp == null ? 1 : d.hp | 0), cond: [], lead: d.lead, leadership: d.leadership, hpea: d.hpea };
  if (kind === 'form') { e.total = Math.max(1, d.total | 0 || 10); e.alive = d.alive != null ? d.alive | 0 : e.total; }
  const t = { id: 'ghost' + (++ghostN), name: e.name, src: d.src || '', art: d.art || '', fig: d.fig || '' };
  const p = { t, e, x: o.x || 0, z: o.z || 0, span: o.span || 2 * G.SP };
  const gh = pieceView(p, true);
  gh.alpha = o.alpha == null ? 1 : o.alpha; gh.pop = o.pop == null ? 1 : o.pop; gh.rank = LEAD_RANK[e.lead] || 4;
  gh.x = gh.tx = o.x || 0; gh.z = gh.tz = o.z || 0;
  dress(gh, t, e); planeLayout(gh);
  ghosts.push(gh);
  return gh;
};
V.dropGhost = gh => {
  const i = ghosts.indexOf(gh); if (i >= 0) ghosts.splice(i, 1);
  root3.remove(gh.g); disposeGroup(gh.g);
};
/* which half of the board a line is in (null: no such line) */
const laneSide = key => { const l = key && geo && geo.lines.find(x => x.key === key); return l ? l.side : null; };
/* a figure in hand turns to face the middle from the half of the board it is over (null: where it stood) */
V.carrySide = (pv, side) => { pv.sideOver = side || null; };            /* which half it is over: it turns to face the middle; its ring is still whose it is */
/* where things would stand if the thing in hand were let go (null: nowhere in particular) */
V.shifts = null;
V.setPreview = slot => { V.shifts = slot ? slot.shifts : null; };

/* ══ KEEPING THE DRAWING IN STEP WITH THE TABLE ══════════════ */
let lastFight = null;
function sync() {
  if (!cur || !booted) return;
  const s = T().get(cur.id); if (!s) return;
  cur = s;
  B().prepare(s);
  geo = B().geometry(s);
  /* a board that grew or shrank (units per line) is a box of another size on the wood, and is framed again */
  const sized = geo.W + 'x' + geo.H;
  if (sized !== lastSize) { const was = lastSize; lastSize = sized; setFace(s, geo); if (was) frameSoon(); }
  place(s);
  if (sigOf(s) !== boardSig) buildBoard(s);
  const A = V.A = B().arrange(s);
  const flat = B().flat(A);
  const seen = new Set();
  const gm = B().isGM();
  flat.forEach(p => {
    seen.add(p.t.id);
    let pv = V.pcs.get(p.t.id);
    const e = p.e;
    if (!pv) {
      pv = pieceView(p); V.pcs.set(p.t.id, pv);
      /* arrives from above, once the first sight of the board is over */
      if (lastFight === s.id) { pv.drop = 140; pv.vis = 0; pv.pop = 1.25; pv.fresh = true; }
      const L0 = V.landing;
      if (L0 && performance.now() - L0.t < 900) { V.landing = null; pv.x = L0.x; pv.z = L0.z; pv.drop = L0.y; pv.vis = 1; pv.pop = 1; }
    }
    pv.tx = p.x; pv.tz = p.z; pv.p = p;
    planeLayout(pv);
    dress(pv, p.t, e);
    reflect(pv, p, gm);
  });
  V.pcs.forEach((pv, id) => { if (!seen.has(id)) { V.pcs.delete(id); fadeOut(pv); } });
  if (V.sel && !V.pcs.has(V.sel)) V.sel = null;
  lastFight = s.id;
  if (V.rail) V.rail.sync();
  if (V.ui) V.ui.synced(A);
}
const dying = [];
function fadeOut(pv) { pv.dying = performance.now(); dying.push(pv); }

/* what a piece's labels say, and the moments worth a flourish: a wound, a
   tick, a token, a fall. Diffed against what it was a moment ago, so a change
   somebody ELSE made at the table gets the same answer as your own. */
function reflect(pv, p, gm) {
  const e = p.e, was = pv.snap;
  const form = e.kind === 'form';
  const hp = form ? (e.alive | 0) : (e.hp | 0), max = form ? (e.total | 0) : (e.max | 0);
  const acts = B().actsOf(e);
  if (was && !pv.fresh) {
    if (hp < was.hp) { feedback(pv, 'hurt', was.hp - hp, hp, max); }
    else if (hp > was.hp) { feedback(pv, 'heal', hp - was.hp); }
    const wc = was.cond, nc = (e.cond || []).map(c => c.n + c.c).join(',');
    if (wc !== nc) feedback(pv, 'tokens');
    if (!was.done && acts.quick && acts.full) feedback(pv, 'done');
  }
  pv.fresh = false;
  const dom = pv.dom;
  const fr = max ? hp / max : 0;
  const col = fr > .6 ? '#5fb83e' : fr > .3 ? '#d9a232' : '#c8452c';
  dom.fl.style.cssText = 'width:' + (fr * 100) + '%;background:' + col;
  dom.gh.style.width = (fr * 100) + '%';
  /* a player always knows the other side's numbers exactly: the rules say so, so there is no setting for it */
  dom.cb.textContent = form ? (hp + '/' + max) : hp;
  const dig = (p.t.name || '').match(/(\d+)$/);
  dom.nu.style.display = dig ? '' : 'none'; dom.nu.textContent = dig ? dig[1] : '';
  dom.dn.style.display = (acts.quick && acts.full) ? '' : 'none';
  dom.ap.classList.toggle('bt-uq', acts.quick); dom.ap.classList.toggle('bt-uf', acts.full);
  dom.nm.textContent = p.t.name || e.name || '';
  /* the GM sees a hidden piece, but as a ghost: it is there, and the players cannot see it */
  const ghost = !!e.hidden && gm;
  dom.cap.classList.toggle('bt-ghost', ghost);
  const tk = e.cond || [];
  dom.ch.innerHTML = tk.slice(0, 3).map(c => chip(c)).join('') + (tk.length > 3 ? '<i class="bt-more">+' + (tk.length - 3) + '</i>' : '');
  pv.ringMat.color.set(L(e.side === 'en' ? '#d04a38' : '#4a82da'));
  if (pv.decal) pv.decal.material.color.copy(pv.ringMat.color);
  /* a formation: its morale as the NUMBER it is, in a colour that says where it stands on the ladder */
  if (form) {
    const lead = e.lead || 'Stable', num = e.leadership == null ? '' : (e.leadership | 0);
    dom.mor.className = 'bt-mor bt-m' + (LEAD_RANK[lead] || 4);
    const key = num + '|' + lead;
    if (dom.mor.dataset.k !== key) { dom.mor.dataset.k = key; dom.mor.innerHTML = '<i>Morale</i><b>' + num + '</b><u></u><u></u><u></u><u></u>'; }
    pv.rank = LEAD_RANK[lead] || 4;
  } else pv.rank = 4;
  /* what its tokens look like on it */
  const TF = root.TokenFx;
  if (TF) {
    const G = B().G, unit = pv.form ? G.FIG : pv.H;
    const sig = TF.sigOf(tk) + '|' + (pv.planKey || '');
    if (sig !== pv.fxSig) {
      pv.fxSig = sig;
      if (pv.fx) { pv.fx.dispose(); pv.fx = null; }
      if (tk.length) {
        pv.fx = TF.create(tk, { w: pv.form ? pv.hw / unit : .3, d: pv.form ? pv.hd / unit : .02, h: pv.form ? pv.fh / unit : 1, zFront: true });
        pv.fxg.add(pv.fx.group); pv.fxg.scale.setScalar(unit);
        const fh = pv.form ? pv.fh : pv.H;                               /* the pivot is the middle of the standee, so a tilt moves the head back where the picture's head is */
        pv.fxp.position.y = 12 + fh * .5; pv.fxg.position.y = -fh * .5;
      }
    }
  }
  pv.snap = { hp, cond: tk.map(c => c.n + c.c).join(','), done: !!(acts.quick && acts.full), hidden: !!e.hidden };
}
V.chipHTML = c => chip(c);
const GLY = () => root.TokenGlyph;
function chip(c) {
  const G2 = GLY();
  const inner = G2 ? G2.html(c.n, 25) : '<u class="bt-gl">' + c.n.slice(0, 2) + '</u>';
  return '<i class="bt-tkc" data-tk="' + c.n + '" data-c="' + c.c + '">' + inner + (c.c > 1 ? '<s>' + c.c + '</s>' : '') + '</i>';
}

/* ══ A BLOW, AS SEEN ═════════════════════════════════════════
   Several small things at once, each over in a moment, all of them scaled by how much was lost (tier 0 a scratch, 1 a
   wound, 2 a heavy blow, 3 what put it on the ground): a flash at the point of impact, a slash across the body, a ring going
   out over the felt, drops and sparks flying off under gravity, a dust of what it was standing on when it falls; the figure
   itself is thrown back, squashed and sprung (in animate()), the board shudders, the health capsule jolts, the number jumps.
   No sound, and nothing that lasts. */
const hitTex = {};
function htex(name) {
  if (hitTex[name]) return hitTex[name];
  const c = mkCanvas(128, 128), x = c.getContext('2d');
  if (name === 'burst') {
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.22, 'rgba(255,230,170,.9)'); g.addColorStop(.6, 'rgba(255,130,70,.25)'); g.addColorStop(1, 'rgba(255,90,40,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    x.translate(64, 64); x.fillStyle = 'rgba(255,255,255,.95)';
    for (let i = 0; i < 10; i++) { x.save(); x.rotate(i * Math.PI / 5 + .15); x.beginPath(); x.moveTo(0, -3.5); x.lineTo(62 - (i % 2) * 24, 0); x.lineTo(0, 3.5); x.closePath(); x.fill(); x.restore(); }
  } else if (name === 'slash') {
    x.translate(64, 64); x.rotate(-.75);
    const g = x.createLinearGradient(-62, 0, 62, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.3, 'rgba(255,255,255,1)'); g.addColorStop(.7, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.moveTo(-62, 0); x.quadraticCurveTo(0, -11, 62, 0); x.quadraticCurveTo(0, 11, -62, 0); x.fill();
  } else if (name === 'ring') {
    x.strokeStyle = '#fff'; x.lineWidth = 7; x.shadowColor = '#fff'; x.shadowBlur = 8; x.beginPath(); x.arc(64, 64, 52, 0, 7); x.stroke();
  } else {                                        /* 'drop' and 'dust': a soft blob */
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 62); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.5, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  }
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
  return (hitTex[name] = t);
}
const bursts = [];
function addBurst(o) {
  const m = new THREE.SpriteMaterial({ map: htex(o.tex), color: L(o.color || '#ffffff'), transparent: true, depthTest: false, depthWrite: false, blending: o.add === false ? THREE.NormalBlending : THREE.AdditiveBlending });
  const s = new THREE.Sprite(m); s.renderOrder = 100000; s.position.set(o.x, o.y, o.z); s.scale.set(o.size, o.sy || o.size, 1); m.rotation = o.rot || 0;
  root3.add(s);
  bursts.push({ s, t0: performance.now() + (o.delay || 0), dur: o.dur, o, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, started: false });
}
function spawnHit(pv, n, tier, now) {
  const H = pv.form ? pv.fh : pv.H, p0 = pv.g.position, dir = pv.joltDir || 1;
  const cx = p0.x, cy = p0.y + 8 + H * .55, cz = p0.z + 6;
  const k = [.7, 1, 1.35, 1.8][tier];
  addBurst({ tex: 'burst', x: cx, y: cy, z: cz, size: H * .8 * k, dur: 170 + tier * 30, color: tier === 3 ? '#ffd9a0' : '#ffe6c0', rot: Math.random() * 3 });
  if (tier >= 1) addBurst({ tex: 'slash', x: cx, y: cy, z: cz + 2, size: H * 1.15 * k, sy: H * 1.15 * k, dur: 210, color: '#ffffff', rot: (Math.random() - .5) * .7, delay: 20 });
  if (tier >= 1) addBurst({ tex: 'ring', x: cx, y: p0.y + 4, z: cz, size: H * .5 * k, sy: H * .17 * k, dur: 380 + tier * 40, color: tier === 3 ? '#ffd24a' : '#ff9a70', vx: 0, grow: 2.6 + tier * .5 });
  const nParts = 5 + tier * 5 + Math.min(6, n | 0);
  for (let i = 0; i < nParts; i++) {
    const a = (Math.random() - .5) * 2.4, sp = 90 + Math.random() * 190 * k;
    const blood = i % 3 !== 0;
    addBurst({ tex: 'drop', x: cx, y: cy + (Math.random() - .5) * H * .3, z: cz, size: (blood ? 5 : 4) + Math.random() * 5 * k, dur: 420 + Math.random() * 380,
      color: blood ? '#d4141c' : (tier >= 2 ? '#ffe9a0' : '#fff3d0'), add: !blood,
      vx: dir * (Math.cos(a) * sp * .8 + 30), vy: 120 + Math.random() * 230 * k, vz: Math.sin(a) * sp * .4, g: 700 });
  }
  if (tier === 3) for (let i = 0; i < 5; i++) addBurst({ tex: 'dust', x: cx + (Math.random() - .5) * 40, y: p0.y + 8, z: cz, size: 14 + Math.random() * 14, dur: 700, color: '#a89878', add: false, vx: (Math.random() - .5) * 60, vy: 30 + Math.random() * 40, vz: 0, delay: 220, fade: .6, grow: 2 });
}
function landPuff(pv) {
  if (V.ui && V.ui.reduced && V.ui.reduced()) return;
  const p0 = pv.g.position, R = pv.form ? Math.max(pv.hw || pv.R, 40) : pv.R;
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2 + Math.random() * .6, sp = 40 + Math.random() * 50;
    addBurst({ tex: 'dust', x: p0.x + Math.cos(a) * R * .6, y: 8, z: p0.z + Math.sin(a) * R * .4, size: 16 + Math.random() * 14, dur: 520 + Math.random() * 260,
      color: i % 3 ? '#cfc9a4' : '#a9bb72', add: false, vx: Math.cos(a) * sp, vy: 18 + Math.random() * 24, vz: Math.sin(a) * sp * .6, fade: .5, grow: 2.2 });
  }
}
function stepBursts(now, dt) {
  for (let i = bursts.length - 1; i >= 0; i--) {
    const b = bursts[i], u = (now - b.t0) / b.dur;
    if (u < 0) { b.s.visible = false; continue; }
    if (u >= 1) { root3.remove(b.s); b.s.material.dispose(); bursts.splice(i, 1); continue; }
    b.s.visible = true;
    const o = b.o;
    if (o.g) { b.vy -= o.g * dt; }
    b.s.position.x += b.vx * dt; b.s.position.y += b.vy * dt; b.s.position.z += b.vz * dt;
    const grow = o.grow ? 1 + (o.grow - 1) * u : 1 - .5 * u * (o.g ? 1 : 0);
    b.s.scale.set(o.size * grow, (o.sy || o.size) * grow, 1);
    b.s.material.opacity = (o.g ? (1 - u * u) : Math.pow(1 - u, 1.6)) * (o.fade == null ? 1 : o.fade);
  }
}

/* the little moments (pure presentation; no sound, and quick) */
const pops = [];
function feedback(pv, kind, n, hpNow, max) {
  if (V.ui && V.ui.reduced && V.ui.reduced()) return;
  const now = performance.now();
  if (kind === 'hurt') {
    pv.joltDir = (laneSide(pv.p && pv.p.line) || (pv.p && pv.p.e.side)) === 'en' ? 1 : -1;
    const sev = max ? Math.min(1, n / max) : .25;
    const tier = hpNow === 0 ? 3 : sev >= .34 ? 2 : sev >= .14 ? 1 : 0;
    pv.hitAt = now; pv.hitPow = [.55, .8, 1.05, 1.4][tier];
    if (hpNow === 0) pv.fallAt = now + 170;                                /* it is struck, THEN it falls */
    spawnHit(pv, n, tier, now);
    popNumber(pv, '−' + n, ['#ffab94', '#ff7a62', '#ff4634', '#ffd24a'][tier], tier);
    shake = Math.max(shake, [0, 1.6, 3.8, 7][tier]);
    if (pv.dom && pv.dom.cap) { const c = pv.dom.cap; c.classList.remove('bt-hurt'); void c.offsetWidth; c.classList.add('bt-hurt'); }
  } else if (kind === 'heal') { pv.lift = now; popNumber(pv, '+' + n, '#8ce07a', 0); }
  else if (kind === 'tokens') { pv.chipPop = now; }
  else if (kind === 'done') { pv.donePop = now; }
}
let shake = 0;
function popNumber(pv, text, color, tier) {
  const T2 = tier | 0, d = el('bt-pop' + (T2 ? ' bt-pop' + T2 : '')); d.textContent = text; d.style.color = color;
  pops.push({ pv, d, t0: performance.now(), dur: 900 + T2 * 140, tier: T2, dx: (Math.random() < .5 ? -1 : 1) * (10 + Math.random() * 16) });
}
V.pop = (id, text, color, delay) => {
  const pv = V.pcs.get(id); if (!pv) return;
  setTimeout(() => { if (V.pcs.get(id)) popNumber(pv, text, color); }, delay || 0);
};

/* ══ THE FRAME ════════════════════════════════════════════════ */
const Mfl4 = () => new THREE.Matrix4(), mfl = Mfl4(), mtb = Mfl4(), mst = Mfl4();
let lastT = 0;
function frame(now) {
  if (!alive) return;
  raf = requestAnimationFrame(frame);
  const dt = Math.min(.05, lastT ? (now - lastT) / 1000 : .016); lastT = now;
  const field = !!(root.__field && root.__field.on());
  ov.classList.toggle('bt-infield', field);
  if (V.ui) V.ui.field(field, now);
  if (hosted) return;                                /* the field draws the board now, and calls fieldTick in its own frame, after its camera has moved */
  if (field) return;                                 /* going in: the board stays as it is, under the field's veil, until the field takes it */
  cv.style.visibility = '';
  const c = D().camera(); if (!c) return;
  const P = c.persp, sh = shake * (Math.random() - .5); shake *= .86; if (shake < .05) shake = 0;
  const W = root.innerWidth, H = root.innerHeight;
  cam3.fov = 2 * Math.atan(H / (2 * P)) * 180 / Math.PI; cam3.aspect = W / H;
  cam3.near = Math.max(4, P * .05); cam3.far = P + 30000; cam3.position.set(0, 0, P);
  cam3.setViewOffset(W, H, W / 2 - (c.left + c.cx) + sh, H / 2 - (c.top + c.cy) + sh, W, H); cam3.updateProjectionMatrix();
  mfl.set(1, 0, 0, -c.cx, 0, -1, 0, c.cy, 0, 0, 1, 0, 0, 0, 0, 1);
  mtb.fromArray(c.m);
  /* board-local (x, y up, z toward you) -> the table's X, Y, Z, turned with the scene */
  mst.set(RC, 0, -RS, BX, RS, 0, RC, BY, 0, 1, 0, 0, 0, 0, 0, 1);
  root3.matrix.copy(mfl).multiply(mtb).multiply(mst); root3.matrixWorldNeedsUpdate = true;
  const tilt = Math.min(.95, (D().tiltDeg * Math.PI / 180) * .9);
  const yaw = -Math.atan2(RS, RC);
  const s = cur, Af = V.A, fight = Af ? Af.fight : { cover: false };
  const gm = B().isGM(), covered = fight.cover && !gm;
  if (V.drag) V.drag.frame(now, dt);
  /* far to near: whoever is nearer the viewer is drawn later, and so is over whoever is behind */
  { const all = []; V.pcs.forEach(pv => all.push(pv)); ghosts.forEach(gh => all.push(gh)); all.sort((a, b) => a.z - b.z); all.forEach((pv, i) => { pv.order = 100 + i * 4; }); }
  V.pcs.forEach(pv => animate(pv, now, dt, tilt, yaw, fight, gm, covered));
  stepBursts(now, dt);
  ghosts.forEach(gh => animate(gh, now, dt, tilt, yaw, fight, true, false));
  if (V.rail) V.rail.frame(now, dt, tilt, yaw, gm);
  stepDying(now);
  clothStep(fight, gm);
  renderer.render(scene3, cam3);
  layout(now, gm, covered);
  if (V.rail) V.rail.layout(now, gm);
  if (V.ui) V.ui.frame(now);
}

function stepDying(now) {
  for (let i = dying.length - 1; i >= 0; i--) {
    const pv = dying[i], u = Math.min(1, (now - pv.dying) / 260);
    pv.mat.opacity = 1 - u; if (pv.lit) pv.lit.opacity = 1 - u;
    [pv.dom.cap, pv.dom.ch, pv.dom.nm, pv.dom.mor, pv.dom.ap].forEach(d => { d.style.opacity = 1 - u; });
    pv.dom.hit.style.display = 'none';
    if (u >= 1) { dying.splice(i, 1); killPiece(pv); }
  }
}

/* ══ STANDING IN THE FIELD ════════════════════════════════════
   The field (37-scene-field.js) has taken the board into its world: the same pieces, drawn
   by its renderer, seen by its camera. Everything that moves them is the same as on the
   table; what changes is only that they stand straight up (there is no table to lean back
   from) and turn to whoever is looking, they stand in the grass rather than on wooden
   bases, and they cast real shadows in the field's sun. */
const DEPTH = new WeakMap();
let fieldLean = 0;
function fieldFrame(now, dt) {
  /* the table's own last picture of the board stays up under the field until the field covers it: it is the same picture */
  cv.style.visibility = doc.body.classList.contains('field-solid') ? 'hidden' : '';
  const P = root.__field && root.__field.proj; if (!P) return;
  const k = fieldLean = P.lean ? P.lean() : 0;
  const tT = k ? Math.min(.95, (D().tiltDeg * Math.PI / 180) * .9) * k : 0, yT = -Math.atan2(RS, RC);
  root3.matrix.identity(); root3.matrixWorldNeedsUpdate = true;
  const eye = P.eye();
  V.shakeNow = shake; shake *= .86; if (shake < .05) shake = 0;
  const Af = V.A, fight = Af ? Af.fight : { cover: false };
  const gm = B().isGM(), covered = fight.cover && !gm;
  if (V.drag) V.drag.frame(now, dt);
  { const all = []; V.pcs.forEach(pv => all.push(pv)); ghosts.forEach(gh => all.push(gh)); all.sort((a, b) => a.z - b.z); all.forEach((pv, i) => { pv.order = 100 + i * 4; }); }
  const turn = pv => { const f = Math.atan2(eye.x - pv.x, eye.z - pv.z) * .45; pv.fyaw = f + (yT - f) * k; };
  V.pcs.forEach(pv => { turn(pv); animate(pv, now, dt, tT, 0, fight, gm, covered); shadowed(pv); litBy(pv, k); sinkBase(pv, 1 - k); });
  stepBursts(now, dt);
  ghosts.forEach(gh => { turn(gh); animate(gh, now, dt, tT, 0, fight, true, false); });
  stepDying(now);
  if (cloth) cloth.visible = false;
  layout(now, gm, covered);
  if (V.ui) V.ui.frame(now);
}
/* in the field a figure stands in the grass, not on the table's turned base: the base goes, and its side's ring lies on the ground */
function sinkBase(pv, flat) {
  const down = flat * 14, hoops = flat < .98;
  [['base', 5.5], ['ring', 12], ['rim', 11]].forEach(([k, y]) => {
    const o = pv[k]; if (!o) return;
    if (o.userData.y0 == null) o.userData.y0 = o.position.y;
    o.visible = hoops; o.position.y = o.userData.y0 - down;
  });
  const sel = V.sel === pv.id;
  if (pv.sel && !hoops) pv.sel.visible = false;
  if (pv.decal) {
    const d = pv.decal, u = d.userData, t = performance.now() / 1000, pulse = sel ? 1 + .06 * Math.sin(t * 5) : 1;
    d.visible = flat > .02; d.position.y = 7;
    d.scale.set(u.sx * pulse, u.sz * pulse, 1);
    d.material.opacity = flat * (sel ? 1 : .8) * pv.vis;
    if (sel) d.material.color.copy(pv.ringMat.color).lerp(SELC, .55); else d.material.color.copy(pv.ringMat.color);
  }
  if (pv.shadow) {
    const u = pv.shadow.userData, k = 1 - .45 * flat;
    pv.shadow.material.opacity = 1 - .2 * flat;
    pv.shadow.position.y = 1 + 5 * flat;
    if (u.sx) pv.shadow.scale.set(u.sx * k, u.sy * k, 1);
  }
}
const SELC = new THREE.Color(1, .85, .35);
/* a printed card in a room is lit by the room: the same picture, on a material the candle and the lamp reach (and
   a little of its own, so a figure in shadow is still readable). The table's own material goes back when you leave. */
function litBy(pv, k) {
  const M = pv.mat;
  let Lm = pv.lit;
  if (!Lm) {
    Lm = pv.lit = new THREE.MeshLambertMaterial({ transparent: true, alphaTest: .3, side: THREE.DoubleSide, depthWrite: true, emissive: new THREE.Color(.16, .14, .12) });
    /* a picture turned to face the other way is the same picture: lit as its front */
    Lm.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('( gl_FrontFacing ) ? vIndirectFront : vIndirectBack', 'vIndirectFront').replace('( gl_FrontFacing ) ? vLightFront : vLightBack', 'vLightFront'); };
    Lm.customProgramCacheKey = () => 'fig-lit';
  }
  const fmap = M.map && M.map.fieldTex || M.map;
  if (Lm.map !== fmap) { Lm.map = fmap; Lm.emissiveMap = fmap; Lm.needsUpdate = true; }
  /* k: still as the table draws it (its own light, none of the field's), going over to the field's sun as it comes up */
  k = k || 0;
  Lm.color.copy(M.color).multiplyScalar((1 - k) * .4); Lm.emissive.copy(M.color).multiplyScalar(1.12 * (1 - k) + k);   /* over 1: the field's filmic curve takes the top off */   /* the hit flash, the red and the dimming are in the colour: they carry */ Lm.opacity = M.opacity;
  pv.planes.forEach(q => { if (q.pl.material !== Lm) { q.pl.material = Lm; q.pl.receiveShadow = true; } });
}
/* a figure's shadow is cut out by its own picture, or every one of them throws a card */
function shadowed(pv) {
  const map = pv.mat.map; if (!map) return;
  let dm = DEPTH.get(pv);
  if (!dm || dm.map !== map) {
    if (dm) dm.dispose();
    dm = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: .5 });
    DEPTH.set(pv, dm);
  }
  pv.planes.forEach(q => { q.pl.castShadow = true; q.pl.customDepthMaterial = dm; });
}
V.hostIn = grp => {
  if (!booted) return false;
  if (hosted === grp) return true;
  grp.add(root3); hosted = grp;
  root3.matrix.identity(); root3.matrixWorldNeedsUpdate = true;
  if (boardGroup) boardGroup.visible = false;
  boardFadeable(true);
  if (cloth) cloth.visible = false;
  if (V.rail) V.rail.hide();
  return true;
};
V.hostOut = () => {
  if (!hosted) return;
  hosted.remove(root3); scene3.add(root3); hosted = null;
  boardFadeable(false);
  if (boardGroup) { boardGroup.visible = true; boardGroup.position.y = 0; }
  V.pcs.forEach(pv => { sinkBase(pv, 0); pv.planes.forEach(q => { q.pl.castShadow = false; q.pl.receiveShadow = false; q.pl.material = pv.mat; }); });
  if (V.rail && cur) V.rail.show();
};
V.hosted = () => !!hosted;
/* for the field getting ready: the board and the pieces in its world for the length of fn (one picture, never shown), as
   they will be there — lit, shadowed, on the grass — and then straight back, before the table draws again */
V.warmIn = (grp, fn) => {
  if (!booted || hosted) { fn(); return; }
  const parent = root3.parent, m = root3.matrix.clone(), saved = [];
  grp.add(root3); root3.matrix.identity(); root3.matrixWorldNeedsUpdate = true;
  boardFadeable(true);
  V.pcs.forEach(pv => { pv.planes.forEach(q => saved.push([q.pl, q.pl.material, q.pl.castShadow, q.pl.receiveShadow, q.pl.customDepthMaterial])); shadowed(pv); litBy(pv, 0); sinkBase(pv, 1); });
  try { fn(); } finally {
    saved.forEach(([pl, mt, cs, rs, cd]) => { pl.material = mt; pl.castShadow = cs; pl.receiveShadow = rs; pl.customDepthMaterial = cd; });
    V.pcs.forEach(pv => sinkBase(pv, 0));
    boardFadeable(false);
    (parent || scene3).add(root3); root3.matrix.copy(m); root3.matrixWorldNeedsUpdate = true;
  }
};
/* THE TABLE'S VIEW OF THE BOARD, as the field needs it to take over without a seam: board units to the table camera's
   own space (window pixels, looking down -z), with its lens — the focal length in pixels is the CSS perspective, and the
   middle of the lens is where 23-table3d.js puts the perspective origin. Exactly what frame() draws the board through. */
V.tableView = () => {
  const c = D() && D().camera(); if (!c) return null;
  const m = new THREE.Matrix4().makeTranslation(0, 0, -c.persp)
    .multiply(new THREE.Matrix4().set(1, 0, 0, -c.cx, 0, -1, 0, c.cy, 0, 0, 1, 0, 0, 0, 0, 1))
    .multiply(new THREE.Matrix4().fromArray(c.m))
    .multiply(new THREE.Matrix4().set(RC, 0, -RS, BX, RS, 0, RC, BY, 0, 1, 0, 0, 0, 0, 0, 1));
  return { m, f: c.persp, px: c.left + c.cx, py: c.top + c.cy, tilt: Math.min(.95, (D().tiltDeg * Math.PI / 180) * .9), yaw: -Math.atan2(RS, RC) };
};
/* the board itself while the field is coming up out of it or going back into it: 0 is as it lies on the table, 1 is sunk
   out of sight under the meadow */
V.boardShow = sink => {
  if (!boardGroup || !hosted) return;
  const op = 1 - sink;
  boardGroup.visible = op > .004;
  boardGroup.position.y = -sink * 14;
  boardGroup.traverse(o => { const m = o.material; if (!m || m.userData.op0 == null) return; m.opacity = m.userData.op0 * op; });
};
/* the board's materials made able to fade (and given back as they were) */
function boardFadeable(on) {
  if (!boardGroup) return;
  boardGroup.traverse(o => {
    const m = o.material; if (!m) return;
    if (on) { if (m.userData.op0 == null) { m.userData.op0 = m.opacity; m.userData.tr0 = m.transparent; m.userData.dw0 = m.depthWrite; } m.transparent = true; }
    else if (m.userData.op0 != null) { m.opacity = m.userData.op0; m.transparent = m.userData.tr0; m.depthWrite = m.userData.dw0; m.userData.op0 = null; }
  });
}
let lastF = 0;
V.fieldTick = now => {
  if (!hosted || !alive) return;
  const dt = Math.min(.05, lastF ? (now - lastF) / 1000 : .016); lastF = now;
  fieldFrame(now, dt);
};

const ease = u => 1 - Math.pow(1 - u, 3);
const NOFX = { r: 1, g: 1, b: 1, a: 1, sag: 1, lean: 0, lie: 0, shake: 0, bob: 0, ghosts: 0 };
/* how a formation carries itself, by where it stands on the ladder (5 Unbreakable .. 1 Broken) */
const CARRY = {
  5: { amp: .018, per: 560, sync: true,  tint: [1.04, 1.05, 1.12], shake: 0,   hop: 0, lean: 0,   cower: 1,   away: 0,  alpha: 1 },
  4: { amp: .05,  per: 300, sync: false, tint: [1, 1, 1],          shake: 0,   hop: 0, lean: 0,   cower: 1,   away: 0,  alpha: 1 },
  3: { amp: .04,  per: 190, sync: false, tint: [1, 1, .93],        shake: 1.6, hop: 0, lean: .05, cower: .97, away: .3, alpha: 1 },
  2: { amp: .03,  per: 150, sync: false, tint: [.9, .86, .88],     shake: 2.6, hop: 0, lean: .15, cower: .88, away: .5, alpha: .96 },
  1: { amp: .025, per: 120, sync: false, tint: [.94, .88, .88],    shake: 3,   hop: 7, lean: .2,  cower: .94, away: 1,  alpha: .86 }
};
function animate(pv, now, dt, tilt, yaw, fight, gm, covered) {
  const p = pv.p; if (!p) return;
  const e = p.e, form = pv.form;
  const k = 1 - Math.exp(-dt * (pv.dragX != null ? (pv.slowUntil && now < pv.slowUntil ? 11 : 30) : 13));
  /* glide to the place it should stand (pushed aside, if something is about to be let go next to it); carried by the hand if it is */
  const shz = V.shifts && V.shifts[pv.id];
  const tx = pv.dragX != null ? pv.dragX : pv.tx, tz = pv.dragZ != null ? pv.dragZ : (shz != null ? shz : pv.tz);
  pv.x += (tx - pv.x) * k; pv.z += (tz - pv.z) * k;
  pv.drop += (0 - pv.drop) * (1 - Math.exp(-dt * 9));
  /* in the field, a figure set down kicks up a little dust and grass where it lands */
  if (hosted && !pv.ghost) {
    const up = pv.drop + (pv.carry || 0);
    if (pv.upWas > 16 && up <= 16) landPuff(pv);
    pv.upWas = up;
  }
  pv.vis += (1 - pv.vis) * (1 - Math.exp(-dt * 10));
  pv.pop += ((pv.popTo == null ? 1 : pv.popTo) - pv.pop) * (1 - Math.exp(-dt * 10));
  pv.carry = (pv.carry || 0) + ((pv.dragX != null ? 40 : 0) - (pv.carry || 0)) * (1 - Math.exp(-dt * 14));
  pv.sway = (pv.sway || 0) * (1 - Math.min(1, dt * 7));
  const hovered = V.hover === pv.id ? 18 : 0;
  pv.hv += (hovered - pv.hv) * (1 - Math.exp(-dt * 16));
  /* A HIT: thrown back along the line and settling with a wobble, squashed where it was struck and springing out of it, a hop
     for a hard one, white for an instant and then red. All of it scaled by how much of it was lost (pv.hitPow). */
  const hT = pv.hitAt ? now - pv.hitAt : 1e9, hitting = hT >= 0 && hT < 760, hu = hitting ? hT / 760 : 1, hPow = pv.hitPow || 1;
  const knock = hitting ? Math.sin(hu * 9.4) * Math.exp(-hu * 4.6) * 27 * hPow * (pv.joltDir || 1) : 0;
  const hop = hitting && hPow > .9 ? Math.sin(Math.min(1, hu / .34) * Math.PI) * 11 * (hPow - .8) : 0;
  const hSq = hitting ? Math.exp(-hu * 6.4) * Math.cos(hu * 21) : 0;                         /* 1 at the blow, then a few ever smaller bounces */
  const hLean = hitting ? -(pv.joltDir || 1) * .34 * hPow * Math.sin(hu * 8.2) * Math.exp(-hu * 4) : 0;
  const lifted = pv.lift ? Math.max(0, 1 - (now - pv.lift) / 280) : 0;
  const carried = pv.carry;
  /* up close (37-scene-field.js) the figure is a miniature on its own base on the diorama: it stands straight up (there is
     no table to lean back from), on the terrain's surface, and turns a little to whoever is looking */
  const fld = !!hosted, GY = fld ? 6 * fieldLean : 6, FOOT = fld ? 2.5 + 9.5 * fieldLean : 12;
  if (fld) yaw = pv.fyaw || 0;
  pv.g.position.set(pv.x + knock, GY + pv.hv + pv.drop + Math.sin(lifted * Math.PI) * 26 + carried + hop, pv.z);
  pv.g.scale.setScalar(pv.pop);
  pv.g.visible = !(covered || (p.e.hidden && !gm) || pv.hid);
  const flashW = hitting ? Math.max(0, 1 - hT / 100) : 0, flashR = hitting ? Math.max(0, 1 - hT / 460) : 0;       /* white, then red */
  const down = form ? !(e.alive | 0) : (e.hp | 0) <= 0;
  const fall = pv.fallAt ? Math.max(0, Math.min(1, (now - pv.fallAt) / 420)) : (down ? 1 : 0);
  const acts = B().actsOf(e), spent = acts.quick && acts.full;
  const dim = spent ? .55 : 1;
  const sel = V.sel === pv.id;
  const half = pv.sideOver || laneSide(pv.p && pv.p.line) || e.side;
  const face0 = half === 'en' ? -1 : 1;                /* whoever stands in the right-hand half faces the middle (the paintings face right) */
  const ord = pv.order || 100;
  const mod = pv.fx ? pv.fx.update(now / 1000, dt, face0, ord) : NOFX;
  const C = CARRY[pv.rank || 4] || CARRY[4], tt = now / 1000;
  if (pv.fx) { pv.fxp.rotation.x = -tilt; pv.fxp.rotation.y = yaw; }
  const fw = 1 + flashW * 1.9;
  pv.mat.color.setRGB(dim * fw * (1 + flashR * .3) * mod.r * C.tint[0], dim * fw * (1 - flashR * .52) * mod.g * C.tint[1], dim * fw * (1 - flashR * .58) * mod.b * C.tint[2]);
  pv.mat.opacity = pv.vis * (down ? .6 : 1) * ((e.hidden && gm) ? .4 : 1) * mod.a * C.alpha * (pv.alpha == null ? 1 : pv.alpha);
  pv.planes.forEach((q, i) => {
    let u = 1;
    if (q.dying) { u = Math.min(1, (now - q.dying) / 450); if (u >= 1) { q.dying = 0; q.pl.visible = false; return; } }
    q.pl.visible = !!((q.show || q.dying) && pv.mat.map && q.aspect);
    if (!q.pl.visible) return;
    if (q.px != null) { q.px += (q.tx - q.px) * k; q.pz += (q.tz - q.pz) * k; }
    /* in its own time: a formation is a crowd. Unbreakable men breathe together; the rest do not */
    const ph = C.sync ? 0 : q.ph;
    const st = Math.sin(now / (C.per + (C.sync ? 0 : i * 47)) + ph + pv.born * .0013);
    const amp = down ? 0 : (form ? C.amp : .03);
    let sx = (1 - amp * .85 * st) * (1 + .17 * hPow * hSq), sy = (1 + amp * st) * mod.sag * (form ? C.cower : 1) * (1 - .22 * hPow * hSq);
    /* a figure that was just lost falls over and is gone; one that came back pops in */
    let pop = 1, fallZ = 0;
    if (q.dying) { fallZ = 1.35 * ease(u); pop = 1 - u * u; }
    else if (q.born) { const b = Math.min(1, (now - q.born) / 320); if (b < 1) pop = ease(b) * (1 + .18 * Math.sin(b * Math.PI)); }
    /* which way it faces, and how it holds itself */
    let face = face0, lean = mod.lean, hop = 0, dx = 0;
    if (form && !down) {
      if (C.away >= 1) face = -face0;                                            /* Broken: they are running the other way */
      else if (C.away > 0 && Math.sin(tt * (.45 + (i % 3) * .11) + q.ph) > 1 - C.away) face = -face0;     /* Wavering, Crumbling: looking round for a way out */
      lean += C.lean * (.7 + .3 * Math.sin(tt * 2 + q.ph));                       /* toward their own rear: hunched, backing off */
      if (C.shake) dx += Math.sin(tt * (C.away >= 1 ? 22 : 13) + q.ph * 3) * C.shake;
      if (C.hop) hop = Math.abs(Math.sin(tt * 7.5 + q.ph)) * C.hop;
      if (C.away >= 1) dx += Math.sin(tt * .9 + q.ph) * 6;
    }
    dx += mod.shake * pv.H * Math.sin(now / 34 + q.ph * 5);
    const rz = (lean + mod.lie + fallZ) * face0 + (down && !form ? 1.45 * ease(fall) : 0) + pv.sway + hLean;
    q.pl.rotation.x = -tilt; q.pl.rotation.y = yaw; q.pl.rotation.z = rz; q.pl.renderOrder = ord;
    const w = q.sw * sx * pop, h = q.sh * sy * pop;
    q.pl.scale.set(face * w, h, 1);
    /* resting on the ground whichever way it is turned: a lying figure is as tall as it is wide */
    const cy = FOOT + (h * Math.abs(Math.cos(rz)) + w * Math.abs(Math.sin(rz))) / 2 + hop + mod.bob * pv.H + (sel ? 9 * (1 + Math.sin(now / 260)) / 2 : 0);
    q.pl.position.set((q.px || 0) + dx, cy, q.pz || 0);
  });
  /* afterimages: the figure again, behind itself, fainter each time (Swiftness) */
  const ng = mod.ghosts | 0;
  if (ng > 0 && pv.mat.map) {
    const gh = pv.gh || (pv.gh = { mats: [], meshes: [], geo: new THREE.PlaneGeometry(1, 1) });
    for (let k = 1; k <= 2; k++) {
      let mt = gh.mats[k - 1];
      if (!mt) mt = gh.mats[k - 1] = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, alphaTest: .05 });
      mt.map = pv.mat.map; mt.color.setRGB(.5, .82, 1); mt.opacity = pv.vis * (k === 1 ? .5 : .28) * (k <= ng ? 1 : 0); mt.depthTest = false;
      pv.planes.forEach((q, i) => {
        const key = (k - 1) * pv.planes.length + i;
        let m2 = gh.meshes[key];
        if (!m2) { m2 = gh.meshes[key] = new THREE.Mesh(gh.geo, mt); pv.g.add(m2); }
        m2.visible = k <= ng && q.pl.visible; if (!m2.visible) return;
        m2.position.set(q.pl.position.x - face0 * k * pv.H * .19, q.pl.position.y, q.pl.position.z - k * .6);
        m2.rotation.copy(q.pl.rotation); m2.scale.copy(q.pl.scale); m2.renderOrder = ord - 2;
      });
    }
  } else if (pv.gh) pv.gh.meshes.forEach(m2 => { m2.visible = false; });
  pv.sel.visible = sel;
}

/* the cloth over a fight that has not begun: lifted and dropped by the scene's own word */
function clothStep(fight, gm) {
  if (!cloth) return;
  const u = V.clothU == null ? 1 : V.clothU;
  cloth.visible = (fight.cover || u < 1) && u > 0.001 ? true : false;
  cloth.position.y = 24 + (1 - u) * 260;
  cloth.material.opacity = (gm ? .2 : .97) * Math.max(0, u);
}

/* ══ THE CLOTH ════════════════════════════════════════════════
   Until the first turn the board is under a cloth for the players (and
   see-through for the GM, who is setting it up). */
let cloth = null, clothSig = '';
function buildCloth() {
  const g = geo, G = B().G;
  const sig = g.bw + 'x' + g.bh;
  if (cloth && clothSig === sig) return; clothSig = sig;
  if (cloth) { root3.remove(cloth); disposeGroup(cloth); }
  const c = mkCanvas(768, 768 * (g.bh + 2 * G.FRAME) / (g.bw + 2 * G.FRAME)), x = c.getContext('2d');
  x.fillStyle = '#2b2a33'; x.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 9000; i++) { x.fillStyle = 'rgba(' + (Math.random() < .5 ? '255,255,255' : '0,0,0') + ',' + Math.random() * .08 + ')'; x.fillRect(Math.random() * c.width, Math.random() * c.height, 2, 2); }
  x.strokeStyle = 'rgba(232,195,95,.55)'; x.lineWidth = 6; x.strokeRect(24, 24, c.width - 48, c.height - 48);
  x.fillStyle = 'rgba(232,195,95,.88)'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = '700 ' + Math.round(c.width * .056) + 'px Cinzel, Georgia, serif'; x.fillText('THE FIGHT HAS NOT BEGUN', c.width / 2, c.height / 2 - 18);
    const Wf = g.bw + 2 * G.FRAME + 20, Df = g.bh + 2 * G.FRAME + 20;
  const geom = new THREE.PlaneGeometry(Wf, Df, 40, 28);
  const pa = geom.attributes.position;
  for (let i = 0; i < pa.count; i++) {
    const px = pa.getX(i), py = pa.getY(i), ex = Math.abs(px) / (Wf / 2), ey = Math.abs(py) / (Df / 2), e2 = Math.max(ex, ey);
    pa.setZ(i, 5 * Math.sin(px * .02 + 1.3) * Math.cos(py * .017) + (e2 > .9 ? -40 * (e2 - .9) / .1 : 0));
  }
  geom.computeVertexNormals();
  cloth = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({ map: toTex(c, null, 8), roughness: .96, transparent: true, opacity: .97, side: THREE.DoubleSide }));
  cloth.rotation.x = -Math.PI / 2; cloth.visible = false; root3.add(cloth);
}
V.clothTo = (to, ms) => {                   /* 1 = down, 0 = lifted */
  const from = V.clothU == null ? (to ? 0 : 1) : V.clothU, t0 = performance.now();
  (function step(now) {
    const u = Math.min(1, (now - t0) / (ms || 900)), e = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    V.clothU = from + (to - from) * e;
    if (u < 1) requestAnimationFrame(step); else V.clothU = to ? 1 : 0;
  })(t0);
};

/* ══ THE LABELS AND HIT AREAS, FOLLOWING THE FIGURES ═════════ */
const fmt = n => Math.round(n * 10) / 10;
function layout(now, gm, covered) {
  V.pcs.forEach(pv => {
    const dom = pv.dom, p = pv.p; if (!p) return;
    const show = !covered && !(p.e.hidden && !gm);
    const vis = show ? '' : 'none';
    if (dom.cap.style.display !== vis) { dom.cap.style.display = dom.ch.style.display = dom.nm.style.display = dom.hit.style.display = dom.ap.style.display = vis; }
    const mv = (show && pv.form) ? '' : 'none'; if (dom.mor.style.display !== mv) dom.mor.style.display = mv;
    if (!show) return;
    const o = pieceScreen(pv);
    if (!o) { dom.cap.style.display = dom.ch.style.display = dom.nm.style.display = dom.hit.style.display = dom.mor.style.display = dom.ap.style.display = 'none'; return; }
    const hit = pv.dragX != null ? o : (pieceScreen(pv, true) || o);
    const bw = o.bw, sz = Math.max(.7, Math.min(1.4, bw / 62));
    const op = pv.vis * (p.e.hp === p.e.max && !(p.e.cond || []).length ? .78 : 1);
    const capW = pv.form ? Math.max(56, Math.min(104, bw * .8)) : Math.max(40, Math.min(74, bw)) * (pv.big ? 1.15 : 1);
    dom.cap.style.opacity = op;
    dom.cap.style.width = fmt(capW) + 'px';
    const y0 = o.yn + bw * .06, sc = Math.max(.8, Math.min(1.2, bw / 80));
    dom.cap.style.transform = 'translate(' + fmt(o.x) + 'px,' + fmt(y0) + 'px) translate(-50%,0)';
    dom.ap.style.opacity = op;
    dom.ap.style.transform = 'translate(' + fmt(o.x) + 'px,' + fmt(y0 + 17 * sc) + 'px) translate(-50%,0) scale(' + fmt(sc) + ')';
    if (pv.form) {
      dom.mor.style.opacity = op;
      dom.mor.style.transform = 'translate(' + fmt(o.x) + 'px,' + fmt(y0 + 31 * sc) + 'px) translate(-50%,0) scale(' + fmt(Math.max(.8, Math.min(1.2, bw / 90))) + ')';
    }
    dom.ch.style.transform = 'translate(' + fmt(o.x + bw * .62) + 'px,' + fmt((o.yn + o.tf) / 2 - 28) + 'px) scale(' + fmt(Math.max(.75, Math.min(1.25, bw / 62))) + ')';
    const showName = V.names || V.hover === pv.id || V.sel === pv.id || !!p.e.pc;       /* a player's character always wears its name */
    const wearing = V.sel === pv.id && V.buf !== '';
    dom.nm.style.display = (showName && !wearing) ? '' : 'none';
    dom.nm.style.transform = 'translate(' + fmt(o.x) + 'px,' + fmt(o.tf - 2) + 'px) translate(-50%,-100%)'; dom.nm.style.fontSize = fmt(12 * sz) + 'px';
    dom.hit.style.transform = 'translate(' + fmt(hit.x - hit.bw * .48) + 'px,' + fmt(hit.tf + (hit.yn - hit.tf) * .06) + 'px)';
    dom.hit.style.width = fmt(hit.bw * .96) + 'px'; dom.hit.style.height = fmt((hit.yn - hit.tf) * .9) + 'px';
    dom.hit.style.zIndex = Math.round(hit.yn);
    pv.o = o; pv.op = op;
  });
  /* STANDING AMONG THEM, a figure in front hides the one behind it — and its labels must not float over the one in
     front as if it were not there. They fade (not vanish: the numbers are still everybody's to read), and come back
     the moment that figure is pointed at or picked. */
  if (hosted) {
    const seen = []; V.pcs.forEach(pv => { if (pv.o && pv.dom.cap.style.display !== 'none') seen.push(pv); });
    seen.forEach(a => {
      const cx = a.o.x, cy = a.o.yn + a.o.bw * .06 + 8;
      const behind = seen.some(b => b !== a && b.z > a.z + 20 && b.o.y > a.o.y &&
        Math.abs(cx - b.o.x) < (b.o.y - b.o.top) * .3 && cy > b.o.top + 8 && cy < b.o.y - 4);
      a.occ = (a.occ || 0) + ((behind && V.hover !== a.id && V.sel !== a.id ? 1 : 0) - (a.occ || 0)) * .3;
      const k = 1 - a.occ * .75;
      a.dom.cap.style.opacity = a.dom.ap.style.opacity = fmt(a.op * k);
      a.dom.ch.style.opacity = fmt(k);
      if (a.form) a.dom.mor.style.opacity = fmt(a.op * k);
    });
  } else V.pcs.forEach(pv => { if (pv.occ) { pv.occ = 0; pv.dom.ch.style.opacity = ''; } });
  for (let i = pops.length - 1; i >= 0; i--) {
    const q = pops[i], u = (now - q.t0) / q.dur;
    const o = q.pv.o;
    if (u >= 1 || !o) { q.d.remove(); pops.splice(i, 1); continue; }
    const T3 = q.tier | 0, pk = 1.4 + T3 * .32;
    /* it jumps up fast, hangs, then falls away a little to the side and fades: the big ones also shake as they land */
    const up = Math.sin(Math.min(1, u / .5) * Math.PI / 2), rise = (58 + T3 * 22) * up + 14 * Math.max(0, (u - .5) / .5), sway = q.dx * ease(Math.min(1, u * 1.4));
    const sc = u < .1 ? .3 + (u / .1) * (pk - .3) : u < .26 ? pk - (u - .1) / .16 * (pk - 1.05) : 1.05 - (u - .26) * .2;
    const jit = T3 >= 2 && u < .28 ? Math.sin(u * 190) * (3 + T3) * (1 - u / .28) : 0;
    q.d.style.opacity = u < .72 ? 1 : (1 - (u - .72) / .28);
    q.d.style.transform = 'translate(' + fmt(o.x + o.bw * .1 + sway + jit) + 'px,' + fmt(o.top + 10 - rise) + 'px) translate(-50%,-50%) scale(' + fmt(sc) + ')';
  }
}
/* where a piece is on the screen: its foot and head in the middle of it, the near foot and the far head (a
   formation is long), and how wide its base is. Where it IS (it may be gliding, dropping in, or lifted by a
   pointer), or where it is going to STAND (for what is clicked) */
function pieceScreen(pv, still) {
  const hh = (pv.form ? pv.fh : pv.H) + 14, R = pv.form ? Math.max(pv.R * .6, pv.hw || pv.R) : pv.R, D = pv.hd || 0;
  const px = still ? pv.tx : pv.g.position.x, py = still ? (hosted ? 0 : 6) : pv.g.position.y, pz = still ? pv.tz : pv.g.position.z;
  const foot = scr(px, py, pz), head = scr(px, py + hh, pz);
  const near = D ? scr(px, py, pz + D) : foot, far = D ? scr(px, py + hh, pz - D) : head;
  const l = scr(px - R, py, pz), r = scr(px + R, py, pz);
  if (!foot || !head || !l || !r || !near || !far) return null;
  return { x: foot.x, y: foot.y, top: head.y, yn: near.y, tf: far.y, bw: Math.abs(r.x - l.x) };
}
V.pieceScreen = (id, still) => { const pv = V.pcs.get(id); return pv ? pieceScreen(pv, still) : null; };

/* ══ SHOWING AND HIDING THE SCENE ════════════════════════════ */
function anchor() { return doc.getElementById('combat-prop'); }

/* the empty box on the wood that stands for the scene, sized to the board it holds */
function setFace(s, g) {
  const p = anchor(); if (!p) return;
  p.dataset.x = s.x; p.dataset.y = s.y; p.dataset.r = s.rot || 0;
  const face = p.querySelector('.face');
  if (face) { face.style.width = g.W + 'px'; face.style.height = g.H + 'px'; }
  if (D()) D().place(p);
}
function show(s) {
  const p = anchor(); if (!p) return;
  if (!boot()) return;
  B().prepare(s);
  const g = B().geometry(s);
  p.dataset.locked = s.locked ? '1' : '0'; p.dataset.rest = 8; p.dataset.tilt = TILT_STAGE; p.dataset.padr = 0; p.dataset.padb = 14;
  p.style.display = '';
  setFace(s, g);
  const nm = doc.getElementById('combat-name'); if (nm) nm.textContent = s.name || 'Combat';
  const first = !cur || cur.id !== s.id;
  const sized = g.W + 'x' + g.H, resized = !first && sized !== lastSize;
  lastSize = sized;
  cur = s; geo = g;
  if (first) {
    V.pcs.forEach(killPiece);
    ghosts.slice().forEach(V.dropGhost); V.shifts = null;
    if (V.rail) V.rail.reset();
    V.pcs.clear(); lastFight = null; V.sel = null; V.hover = null; V.prev = null; V.buf = ''; boardSig = ''; V.clothU = null;
  }
  place(s);
  buildCloth();
  sync();
  if (first && V.ui) V.ui.opened(s);
  if (!alive) { alive = true; lastT = 0; raf = requestAnimationFrame(frame); }
  cv.style.display = ''; ov.style.display = '';
  doc.body.classList.add('fight-on');
  /* a fight you sit down to is framed for you, once; and again if the board grew or shrank under you */
  if (V.rail && !hosted) V.rail.show();          /* in the field the rail is the table's, and stays put away */
  if (first || resized) frameSoon();
  if (root.__field && root.__field.preload) root.__field.preload();
}
let frameWant = null, lastSize = '';
function frameSoon() {
  if (frameWant) return;
  frameWant = requestAnimationFrame(() => requestAnimationFrame(() => {
    frameWant = null;
    const p = anchor(), d = D();
    if (!p || !d || p.style.display === 'none' || (root.__field && root.__field.on())) return;
    if (d.locked === p) { d.refit(); return; }
    d.lockIn(p);
  }));
}
function hide() {
  if (root.__field && root.__field.on()) root.__field.set(false);
  V.hostOut();
  const p = anchor();
  if (p) {
    if (D() && D().locked === p) D().unlock(true);
    p.style.display = 'none';
  }
  alive = false; cancelAnimationFrame(raf);
  if (V.rail) V.rail.hide();
  if (booted) { cv.style.display = 'none'; ov.style.display = 'none'; }
  cur = null; V.A = null; lastFight = null;
  doc.body.classList.remove('fight-on');
  if (V.ui && V.ui.closed) V.ui.closed();
}

/* the line, and the place in it, that a point on the screen is over: where a piece let go there would stand */
V.dropAt = (sx, sy) => {
  if (!geo || !V.A) return null;
  const p = V.boardAt(sx, sy); if (!p) return null;
  const li = B().lineAtX(geo, p.x);
  if (li < 0 || Math.abs(p.z) > geo.bh / 2 + 60) return null;
  return { line: geo.lines[li].key, index: B().indexAtZ(V.A.rows[li], p.z, null) };
};
V.show = show; V.hide = hide; V.sync = sync; V.frameSoon = frameSoon;
V.kit = { root3: () => root3, M, mesh, L, lathe, woodCanvas, toTex, figureTex, picOf, scr, disposeGroup, el, wheelThrough, slabPts, tube };
V.scene = () => cur; V.geo = () => geo; V.isUp = () => !!cur;
V.overlay = () => ov; V.laneMeshes = () => laneMeshes; V.pieceOf = id => V.pcs.get(id) || null;
V.mark = { feedback, pop: popNumber, bursts: () => bursts.length };
V.shake = n => { shake = Math.max(shake, n); };
V.hot = pv => pv;
V.TILT_STAGE = TILT_STAGE;

/* the board is shown or put away with the running scene (24-table-props.js) */
V.start = () => { if (B()) B().wire(); };
if (T()) { T().on((st, why) => { if (cur && why !== 'select' && why !== 'move' && why !== 'raise') { if (why === 'load') return; sync(); } }); }
root.addEventListener('beforeunload', () => { alive = false; });

})(window, document);
