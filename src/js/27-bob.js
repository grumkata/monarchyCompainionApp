/* ══════════════════════════════════════════════════════════════
   27-bob.js — THE STAR.

   grumkata: "when you click the mario star another super cool transition
   happens and you are put into bobomb battlefield with nice smooth
   keyboard controls".

   The Power Star among the goblin's treasure (27-goblin.js) calls
   BobStar.enter with where it is on the screen. Then:

     the grab     it spins up, light pours off it, and it flies at you;
     the star     it fills the screen white, and the course opens out of a
                  star-shaped hole the way Mario 64 opens a course;
     the course   Lakitu's swoop down over Bob-omb Battlefield while its
                  name drops in, and Mario falls in from the sky;
     the summit   a Power Star waits on the top of the mountain. Take it and
                  you get the fanfare pose and are sent home; Esc sends you
                  home any time. Home is the star iris again, closing on
                  Mario and opening on the tavern.

   Not Mario 64 itself (that is Nintendo's, and needs the game): the course
   as the game draws it and Mario's own model (tools/bake_bob.py, in
   assets/bob/, loaded the first time the star is pressed), with movement,
   collision, camera and animation written here, on the game's own numbers
   — 30 frames a second turned into seconds — so a jump is a Mario jump.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

if (typeof THREE === 'undefined') return;

const now = () => performance.now() / 1000;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), c01 = v => clamp(v, 0, 1);
const smooth = k => k * k * (3 - 2 * k), easeOut = k => 1 - Math.pow(1 - k, 3), easeIn = k => k * k * k;
const lerp = (a, b, k) => a + (b - a) * k, rnd = (a, b) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;
const wrap = a => { a = (a + Math.PI) % TAU; return (a < 0 ? a + TAU : a) - Math.PI; };

/* THE GAME'S OWN NUMBERS, read out of the decompiled source (github.com/n64decomp/sm64: mario_actions_moving.c,
   mario_actions_airborne.c, mario_step.c, mario.c), in the course's own units (Mario is 160 tall). They are per frame
   at 30 frames a second; F turns them into seconds where seconds are wanted. Written again here, not copied. */
const F = 30;
const G = 4 * F * F, FALL = 75 * F, RUN = 32 * F;                 /* gravity 4 a frame, falling at most 75; running 32 */
const JUMP = [42 * F, 52 * F, 69 * F], CARRY = [0.25 * F, 0.25 * F, 0];   /* single, double, triple: up, and a share of his speed */
const TURN = 0x800 / 65536 * TAU, BACK = 0x471C / 65536 * TAU;   /* turning 0x800 a frame; "held back" past 0x471C (100 degrees) */
const CHAIN = 6 / F;                                              /* five frames to chain the next jump, and one for the keyboard */
const MARIO_H = 160, R = 50;

/* ══ THE COURSE AND MARIO, FETCHED ONCE ════════════════════════ */
let data = null;
function load() {
  if (data) return Promise.resolve(data);
  return new Promise((ok, no) => {
    const go = () => (root.__BOB ? ok(data = root.__BOB) : no(new Error('the course file is not there')));
    if (root.__BOB) { go(); return; }
    const s = doc.createElement('script');
    s.src = 'assets/bob/bob.js';
    s.onload = go; s.onerror = () => no(new Error('the course file is not there'));
    doc.head.appendChild(s);
  });
}

/* ══ COLLISION ═════════════════════════════════════════════════
   The course's own triangles, sorted into floors (facing up), walls (near
   upright) and ceilings, on a grid a fifth of a course wide. A floor under
   a point is the highest one at or below it; a wall pushes Mario out of it
   at his knees and his chest, the way the game checks twice. */
const CELL = 1024;
function collider(prims) {
  const T = [], grid = new Map();
  const key = (i, j) => i * 4096 + j;
  for (const p of prims) {
    const P = p.p;
    for (let k = 0; k < p.i.length; k += 3) {
      const a = p.i[k] * 3, b = p.i[k + 1] * 3, c = p.i[k + 2] * 3;
      const t = { ax: P[a], ay: P[a + 1], az: P[a + 2], bx: P[b], by: P[b + 1], bz: P[b + 2], cx: P[c], cy: P[c + 1], cz: P[c + 2] };
      let nx = (t.by - t.ay) * (t.cz - t.az) - (t.bz - t.az) * (t.cy - t.ay);
      let ny = (t.bz - t.az) * (t.cx - t.ax) - (t.bx - t.ax) * (t.cz - t.az);
      let nz = (t.bx - t.ax) * (t.cy - t.ay) - (t.by - t.ay) * (t.cx - t.ax);
      const l = Math.hypot(nx, ny, nz);
      if (l < 1e-6) continue;
      t.nx = nx / l; t.ny = ny / l; t.nz = nz / l; t.d = -(t.nx * t.ax + t.ny * t.ay + t.nz * t.az);
      /* the game's own split (0.01 either side of upright), where the game's collision is what is being read */
      const lim = p.ty ? 0.01 : 0.3;
      t.kind = t.ny > lim ? 'floor' : t.ny < -lim ? 'ceil' : 'wall';
      t.type = p.ty ? p.ty[k / 3] : '';
      t.minY = Math.min(t.ay, t.by, t.cy); t.maxY = Math.max(t.ay, t.by, t.cy);
      T.push(t);
      const pad = t.kind === 'wall' ? R + 10 : 0;
      const i0 = Math.floor((Math.min(t.ax, t.bx, t.cx) - pad) / CELL), i1 = Math.floor((Math.max(t.ax, t.bx, t.cx) + pad) / CELL);
      const j0 = Math.floor((Math.min(t.az, t.bz, t.cz) - pad) / CELL), j1 = Math.floor((Math.max(t.az, t.bz, t.cz) + pad) / CELL);
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
        const k2 = key(i, j); let cell = grid.get(k2);
        if (!cell) grid.set(k2, cell = []);
        cell.push(t);
      }
    }
  }
  const at = (x, z) => grid.get(key(Math.floor(x / CELL), Math.floor(z / CELL))) || [];
  /* is (x, z) inside the triangle, seen from above */
  const inside = (t, x, z) => {
    const d1 = (x - t.bx) * (t.az - t.bz) - (t.ax - t.bx) * (z - t.bz);
    const d2 = (x - t.cx) * (t.bz - t.cz) - (t.bx - t.cx) * (z - t.cz);
    const d3 = (x - t.ax) * (t.cz - t.az) - (t.cx - t.ax) * (z - t.az);
    return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
  };
  const floor = (x, y, z) => {
    let best = null, bh = -Infinity;
    for (const t of at(x, z)) {
      if (t.kind !== 'floor' || t.minY > y + 1 || !inside(t, x, z)) continue;
      const h = -(t.nx * x + t.nz * z + t.d) / t.ny;
      if (h <= y + 1 && h > bh) { bh = h; best = t; }
    }
    return best ? { h: bh, t: best } : null;
  };
  const ceil = (x, y, z) => {
    let bh = Infinity;
    for (const t of at(x, z)) {
      if (t.kind !== 'ceil' || t.maxY < y || !inside(t, x, z)) continue;
      const h = -(t.nx * x + t.nz * z + t.d) / t.ny;
      if (h >= y && h < bh) bh = h;
    }
    return bh;
  };
  /* walls: pushes p (x, z, at height y) out of anything nearer than r, and says whether it touched */
  const cp = new THREE.Vector3(), tri = new THREE.Triangle(), pt = new THREE.Vector3();
  const walls = (p, y, r) => {
    let hit = false;
    for (const t of at(p.x, p.z)) {
      if (t.kind !== 'wall' || y < t.minY - 5 || y > t.maxY + 5) continue;
      tri.a.set(t.ax, t.ay, t.az); tri.b.set(t.bx, t.by, t.bz); tri.c.set(t.cx, t.cy, t.cz);
      pt.set(p.x, y, p.z);
      tri.closestPointToPoint(pt, cp);
      const dx = p.x - cp.x, dz = p.z - cp.z, dy = y - cp.y, d = Math.hypot(dx, dz);
      if (Math.abs(dy) > r * 0.9 || d >= r) continue;
      /* out along the wall's own facing, flattened: steady along a long wall, never through it */
      let hx = t.nx, hz = t.nz;
      const hl = Math.hypot(hx, hz) || 1; hx /= hl; hz /= hl;
      if (dx * hx + dz * hz < 0) { hx = -hx; hz = -hz; }
      const push = r - (d > 0.01 ? (dx * hx + dz * hz) : 0);
      if (push > 0) { p.x += hx * push; p.z += hz * push; hit = true; }
    }
    return hit;
  };
  /* how far along the line from a to b the first thing in the way is (1: nothing): for the camera */
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), pv = new THREE.Vector3(), tv = new THREE.Vector3(), qv = new THREE.Vector3(), dv = new THREE.Vector3();
  const ray = (a, b) => {
    dv.subVectors(b, a);
    const len = Math.hypot(dv.x, dv.z), steps = Math.max(1, Math.ceil(len / (CELL * 0.5))), seen = new Set();
    let best = 1;
    for (let s = 0; s <= steps; s++) {
      for (const t of at(a.x + dv.x * s / steps, a.z + dv.z * s / steps)) {
        if (seen.has(t)) continue; seen.add(t);
        e1.set(t.bx - t.ax, t.by - t.ay, t.bz - t.az); e2.set(t.cx - t.ax, t.cy - t.ay, t.cz - t.az);
        pv.crossVectors(dv, e2);
        const det = e1.dot(pv);
        if (Math.abs(det) < 1e-9) continue;
        tv.set(a.x - t.ax, a.y - t.ay, a.z - t.az);
        const u = tv.dot(pv) / det; if (u < 0 || u > 1) continue;
        qv.crossVectors(tv, e1);
        const v = dv.dot(qv) / det; if (v < 0 || u + v > 1) continue;
        const k = e2.dot(qv) / det;
        if (k > 0 && k < best) best = k;
      }
    }
    return best;
  };
  return { T, floor, ceil, walls, ray };
}

/* ══ THE PICTURES ══════════════════════════════════════════════ */
function canvas(w, h, draw) { const c = doc.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }
function texOf(c) { const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; }
const PIC = {};
function pics() {
  if (PIC.ball) return PIC;
  PIC.ball = texOf(canvas(64, 64, (x) => {
    const g = x.createRadialGradient(28, 26, 2, 32, 32, 31);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.6, 'rgba(236,232,224,.9)'); g.addColorStop(1, 'rgba(220,214,204,0)');
    x.fillStyle = g; x.beginPath(); x.arc(32, 32, 31, 0, 7); x.fill();
  }));
  PIC.shadow = new THREE.CanvasTexture(canvas(64, 64, (x) => {
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 31);
    g.addColorStop(0, 'rgba(0,0,0,.62)'); g.addColorStop(0.7, 'rgba(0,0,0,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  }));
  PIC.glint = texOf(canvas(64, 64, (x) => {
    let g = x.createRadialGradient(32, 32, 0, 32, 32, 14);
    g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(1, 'rgba(255,230,150,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    x.globalCompositeOperation = 'lighter'; x.fillStyle = 'rgba(255,250,220,.95)';
    x.beginPath(); x.moveTo(0, 32); x.lineTo(32, 29); x.lineTo(64, 32); x.lineTo(32, 35); x.fill();
    x.beginPath(); x.moveTo(32, 0); x.lineTo(35, 32); x.lineTo(32, 64); x.lineTo(29, 32); x.fill();
  }));
  /* the sky: Bob-omb Battlefield's blue, deeper overhead, and soft heaps of cloud round the horizon */
  PIC.cloud = texOf(canvas(256, 128, (x, w, h) => {
    for (let i = 0; i < 14; i++) {
      const cx = rnd(40, w - 40), cy = rnd(55, 95), r = rnd(22, 46);
      const g = x.createRadialGradient(cx - r * 0.3, cy - r * 0.4, 2, cx, cy, r);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.75, 'rgba(244,248,255,.95)'); g.addColorStop(1, 'rgba(235,242,255,0)');
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
    }
  }));
  return PIC;
}

/* ══ BUILDING THE COURSE ═══════════════════════════════════════
   The game's own display lists for it (tools/bake-bob.js reads them out of
   the decompilation), drawn the way the N64 drew them, because that is what
   makes it look like Bob-omb Battlefield and not like a model of it:

     light    one light, fixed to the CAMERA — 0x28, 0x28, 0x28 in its own
              space, up and right and towards you — on the normals the
              course carries, at the course's own ambient (0x66) and
              diffuse (0xff), clamped before the texture is laid on. So the
              cliffs that face you are bright orange and the ones that face
              away are dark, and that turns as you turn the camera.
     flat     the parts the game drew flat-shaded (the fences' posts) take
              one shade per triangle, as the baker left them;
     colour   texel times shade (MODULATERGB / IA), or the texel alone for
              the fences (DECALRGBA), worked in the N64's own numbers: no
              conversion of the pictures in or of the colours out;
     fog      grey (160, 160, 160), from 980 to 1000 of the depth range of
              the game's 100-to-30000 frustum: nothing near you, a haze
              over the far side of the course;
     layers   opaque, then the fences cut out, then the trees' shadows laid
              over the grass. */
const N64_LIGHT = new THREE.Vector3(1, 1, 1).normalize();
const N64_FOG = new THREE.Vector3(160 / 255, 160 / 255, 160 / 255);
const N64_VERT = `
attribute vec4 cn;
uniform float lit, fogOn;
uniform vec3 amb, dif, lightDir;
varying vec2 vUv;
varying vec4 vShade;
varying float vFog;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  if (lit > 0.5) {
    vec3 n = cn.xyz * 255.0;
    n = mix(n, n - 256.0, step(127.5, n)) / 127.0;
    vShade = vec4(min(amb + dif * max(dot(normalMatrix * n, lightDir), 0.0), vec3(1.0)), 1.0);
  } else vShade = cn;
  vUv = uv;
  /* the RSP's fog: depth after projection through near 100, far 30000, times 6400, less 6144, over 255 */
  vFog = fogOn * clamp(1.17181 - 5036.4 / max(-mv.z, 1.0), 0.0, 1.0);
  gl_Position = projectionMatrix * mv;
}`;
const N64_FRAG = `
uniform sampler2D map;
uniform float hasMap, cutout;
uniform int cc;
uniform vec4 env;
uniform vec3 fogColor;
varying vec2 vUv;
varying vec4 vShade;
varying float vFog;
void main() {
  vec4 tex = hasMap > 0.5 ? texture2D(map, vUv) : vec4(1.0);
  vec4 c;
  if (cc == 1) c = vec4(tex.rgb * vShade.rgb, vShade.a);           /* MODULATERGB */
  else if (cc == 2) c = tex * vShade;                              /* MODULATEIA */
  else if (cc == 3) c = tex;                                       /* DECALRGBA */
  else if (cc == 4) c = tex * vShade;                              /* MODULATERGBA */
  else if (cc == 5) c = vec4(tex.rgb, tex.a * env.a);              /* DECALFADEA */
  else if (cc == 6) c = vec4(vShade.rgb, env.a);                   /* SHADEFADEA */
  else if (cc == 7) c = vec4(mix(vShade.rgb, tex.rgb, tex.a), env.a);     /* BLENDRGBFADEA */
  else if (cc == 8) c = vec4(mix(vShade.rgb, tex.rgb, tex.a), vShade.a);  /* BLENDRGBA */
  else if (cc == 9) c = vec4(tex.rgb, env.a);                      /* DECALFADE */
  else if (cc == 10) c = vec4(tex.rgb * vShade.rgb, tex.a * env.a); /* MODULATERGBFADEA */
  else c = vShade;                                                 /* SHADE */
  if (cutout > 0.5 && c.a < 0.5) discard;
  gl_FragColor = vec4(mix(c.rgb, fogColor, vFog), c.a);
}`;
const N64_CC = { MODULATERGB: 1, MODULATEIA: 2, DECALRGBA: 3, MODULATERGBA: 4, DECALFADEA: 5, SHADEFADEA: 6, BLENDRGBFADEA: 7,
                 BLENDRGBA: 8, DECALFADE: 9, MODULATERGBFADEA: 10, SHADE: 0 };
/* a picture for a baked group: the player's own game's (27-bob-rom.js) when it has been read, else the one that came
   with the earlier model; the trees' shadows have no such copy, so they take the shadow already here for Mario */
const wrapOf = c => (c & 2 ? THREE.ClampToEdgeWrapping : c & 1 ? THREE.MirroredRepeatWrapping : THREE.RepeatWrapping);
function n64Tex(D, m) {
  if (!m.tex) return null;
  const cache = D.texCache || (D.texCache = {}), key = m.tex + '|' + m.cms + '|' + m.cmt;
  if (cache[key]) return cache[key];
  const url = (D.romTex && D.romTex[m.tex]) || (D.level.tex && D.level.tex[m.tex]);
  let t;
  if (url) t = new THREE.TextureLoader().load(url);
  else { t = pics().shadow.clone(); t.needsUpdate = true; }
  t.flipY = false;
  t.encoding = THREE.LinearEncoding;
  t.wrapS = wrapOf(m.cms); t.wrapT = wrapOf(m.cmt);
  t.anisotropy = 8;
  return (cache[key] = t);
}
/* the baked groups as meshes: the course, or one of its own objects (the gate, the seesaw, the grills) */
function n64Model(D, groups) {
  const g = new THREE.Group(), all = D.n64Mats || (D.n64Mats = []);
  for (const p of groups) {
    const m = p.m, geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(p.p, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(p.u, 2));
    geo.setAttribute('cn', new THREE.BufferAttribute(new Uint8Array(p.c), 4, true));
    geo.setIndex(p.i);
    geo.computeBoundingSphere();
    const map = n64Tex(D, m), blend = m.layer >= 5;
    const mat = new THREE.ShaderMaterial({
      vertexShader: N64_VERT, fragmentShader: N64_FRAG,
      uniforms: {
        map: { value: map }, hasMap: { value: map ? 1 : 0 }, cutout: { value: m.layer === 4 ? 1 : 0 }, cc: { value: N64_CC[m.cc] || 0 },
        lit: { value: m.lit }, fogOn: { value: m.fog }, lightDir: { value: N64_LIGHT }, fogColor: { value: N64_FOG },
        amb: { value: new THREE.Vector3(...(m.amb || [0, 0, 0]).map(v => v / 255)) },
        dif: { value: new THREE.Vector3(...(m.dif || [0, 0, 0]).map(v => v / 255)) },
        env: { value: new THREE.Vector4(...(m.env || [255, 255, 255, 255]).map(v => v / 255)) },
      },
      side: m.cull ? THREE.FrontSide : THREE.DoubleSide,
      transparent: blend, depthWrite: !blend,
    });
    /* decals sit on the surface they are painted over */
    if (m.layer === 2 || m.layer === 6) { mat.polygonOffset = true; mat.polygonOffsetFactor = -2; mat.polygonOffsetUnits = -4; }
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = m.layer;
    g.add(mesh);
    all.push({ mat, m });
  }
  return g;
}
/* ══ THE CAST'S OWN MODELS ═════════════════════════════════════
   Everything that lives in the course, as the game builds it (the baker
   makes each geo layout a tree): animated parts the game's own
   animations turn, billboards, switches (a Bob-omb's blink, a coin's
   eight turns, an explosion's frames), scales and display lists. Only
   built once the player's own pictures are in (27-bob-rom.js): without
   them these would be grey, and the course keeps what it had.

   cast(r, key, holder)  a model in `holder` (the object's own group, which
                         its behaviour moves); its billboards face the
                         camera at the holder's scale, as geo.c's do
   inst.play(i, speed)   animation i of the model's table, from its first
                         frame, at `speed` (1: the game's 30 a second)
   inst.state            the switches' case (the game's oAnimState) */
function cast(r, key, holder, opts) {
  const D = data, C = D && D.cast && D.cast[key];
  if (!C || !D.romTex) return null;
  const inst = { key, C, root: new THREE.Group(), holder, top: null, bills: [], switches: [], anim: -1, fr: 0, speed: 1, state: 0,
                 billboard: !!(opts && opts.billboard) };
  const visit = (n, parent) => {
    const node = { k: n.k, c: [], n }, g = new THREE.Group();
    if (n.k === 'scale') g.scale.setScalar(n.s);
    if (n.k === 'part') { g.position.fromArray(n.p); g.rotation.order = 'ZYX'; }
    /* a fixed turn (geo.c's rotation and translation-rotation nodes: mtxf_rotate_zxy_and_translate), or a held thing's
       place; the wing cap's wings are only shown with the wing cap */
    if (n.k === 'tr') { g.position.fromArray(n.p); g.rotation.order = 'YXZ'; g.rotation.set(n.r[0] * TAU / 65536, n.r[1] * TAU / 65536, n.r[2] * TAU / 65536); if (n.wing) g.visible = false; }
    if (n.k === 'held') g.position.fromArray(n.p);
    if (n.k === 'bill') inst.bills.push(node);
    if (n.k === 'switch') inst.switches.push(node);
    if (n.dl) {
      /* each display list built once a visit and shared (geometry and material) by every copy of the model */
      const T = D.castTpl || (D.castTpl = {}), id = key + '|' + n.dl;
      g.add((T[id] || (T[id] = n64Model(D, C.dls[n.dl]))).clone());
    }
    node.g = g; parent.add(g);
    for (const c of n.c) node.c.push(visit(c, g));
    return node;
  };
  inst.top = visit(C.tree, inst.root);
  inst.play = (i, speed) => {
    if (speed != null) inst.speed = speed;
    if (i === inst.anim) return;
    const A = C.anims && C.anims[i];
    inst.anim = A ? i : -1; inst.fr = A ? A.start : 0;
  };
  holder.add(inst.root);
  (r.castInsts || (r.castInsts = [])).push(inst);
  castPose(inst, 0);
  return inst;
}
/* the frame on, and the pose laid on: switches set, then the animation's values taken in the order the game takes
   them (the root's translation first, then three turns for each animated part it meets, a switch only giving the
   case it shows) */
function castPose(inst, dt) {
  const A = inst.anim !== -1 ? inst.C.anims[inst.anim] : null;      /* by number, or by name (Mario's) */
  inst.done = false;
  if (A) {
    inst.fr += dt * F * inst.speed;
    if (inst.fr >= A.loopEnd - 1) inst.done = true;
    if (inst.fr >= A.loopEnd) inst.fr = A.flags & 1 ? A.loopEnd - 1 : A.loopStart + ((inst.fr - A.loopStart) % Math.max(1, A.loopEnd - A.loopStart));
  }
  inst.clock = (inst.clock || 0) + dt * F;
  const pick = s => { const v = inst.pick ? inst.pick(s.n.fn, s.n) : null; return Math.min(v == null ? inst.state : v, s.c.length - 1); };
  for (const s of inst.switches) { s.sel = pick(s); s.c.forEach((c, i) => { c.g.visible = i === s.sel; }); }
  const frame = Math.floor(inst.fr);
  let type = 0, attr = 0;
  if (A && !(A.flags & 32)) type = A.flags & 8 ? 3 : A.flags & 16 ? 2 : A.flags & 64 ? 4 : 1;
  const val = () => { const k = attr++, n = A.i[k * 2], o = A.i[k * 2 + 1]; return A.v[o + (frame < n ? frame : n - 1)]; };
  const ANG = TAU / 65536;
  const walk = node => {
    if (node.k === 'switch') { const c = node.c[node.sel]; if (c) walk(c); return; }
    if (node.k === 'part' && type) {
      const p = node.n.p;
      let x = p[0], y = p[1], z = p[2];
      if (type === 1) { x += val(); y += val(); z += val(); }
      else if (type === 2) { x += val(); attr++; z += val(); }
      else if (type === 3) { attr++; y += val(); attr++; }
      else if (type === 4) attr += 3;
      type = 5;
      node.g.position.set(x, y, z);
      node.g.rotation.set(val() * ANG, val() * ANG, val() * ANG);
    }
    for (const c of node.c) walk(c);
  };
  walk(inst.top);
}
/* billboards: where their place in the model puts them, turned square to the camera and at the object's own scale
   (mtxf_billboard drops every scale above them; geo_process_billboard puts back only the object's) */
const _bp = new THREE.Vector3(), _bs = new THREE.Vector3(), _bm = new THREE.Matrix4(), _bi = new THREE.Matrix4();
function castFace(inst, cam) {
  const h = inst.holder;
  h.updateMatrixWorld(true);
  _bs.copy(h.scale);
  const face = g => {
    g.parent.updateMatrixWorld(false);
    _bp.copy(g.position).applyMatrix4(g.parent.matrixWorld);
    _bm.compose(_bp, cam.quaternion, _bs);
    g.matrix.copy(_bi.copy(g.parent.matrixWorld).invert()).multiply(_bm);
    g.matrixAutoUpdate = false;
    g.updateMatrixWorld(true);
  };
  if (inst.billboard) face(inst.root);
  for (const b of inst.bills) if (b.g.parent) face(b.g);
}
function castStep(r, dt) {
  if (!r.castInsts) return;
  r.castInsts = r.castInsts.filter(inst => {
    let on = true, o = inst.root;
    for (; o.parent; o = o.parent) if (!o.visible) on = false;
    if (o !== r.scene) return false;                               /* taken out of the course: done with */
    castPose(inst, dt);
    if (on) castFace(inst, r.cam);
    return true;
  });
}

/* the player's own pictures have come in: every course material takes its picture again */
function retexture(D) {
  const old = D.texCache || {};
  D.texCache = {};
  for (const { mat, m } of D.n64Mats || []) {
    const t = n64Tex(D, m);
    mat.uniforms.map.value = t; mat.uniforms.hasMap.value = t ? 1 : 0;
  }
  for (const t of Object.values(old)) t.dispose();
}
function course(D) { return n64Model(D, D.level.groups); }
/* the sky with no game to read the real one out of: a painted blue, and clouds round the horizon */
function sky(scene) {
  const grp = new THREE.Group(); scene.add(grp);
  const geo = new THREE.SphereGeometry(60000, 32, 16), col = [], top = new THREE.Color('#3f74de'), hor = new THREE.Color('#bfe0ff'), low = new THREE.Color('#9cc8f5');
  const P = geo.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const y = P.getY(i) / 60000, c = y > 0 ? hor.clone().lerp(top, Math.pow(y, 0.6)) : hor.clone().lerp(low, Math.min(1, -y * 4));
    col.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const s = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false, fog: false }));
  s.renderOrder = -10; grp.add(s);
  const P2 = pics();
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * TAU + rnd(-0.15, 0.15), d = 38000;
    const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: P2.cloud, transparent: true, depthWrite: false, fog: false, opacity: rnd(0.75, 0.95) }));
    c.position.set(Math.sin(a) * d, rnd(1500, 5200), Math.cos(a) * d); c.scale.set(rnd(9000, 15000), rnd(4000, 6000), 1); c.renderOrder = -9;
    grp.add(c);
  }
  return grp;
}
/* ══ THE REAL SKY ══════════════════════════════════════════════
   Bob-omb Battlefield's own (the "water" sky, out of the player's game),
   drawn the way src/game/skybox.c draws it: not a dome round the course
   but a flat picture behind everything, slid by where the camera looks.
   The game's picture is 8 by 8 tiles, each 160 by 120 on a 320 by 240
   screen: once round for a whole turn of the camera (the game works it
   out as if the view were 90 degrees across), four of those pixels to a
   degree of looking up or down, and the view's top edge 600 up from the
   bottom of its 960 when it looks level. A wider screen than the game's
   4:3 sees further round, at the same scale. */
const SKY_VERT = `
varying vec2 vS;
void main() { vS = vec2(position.x * 0.5 + 0.5, 0.5 - position.y * 0.5); gl_Position = vec4(position.xy, 1.0, 1.0); }`;
const SKY_FRAG = `
uniform sampler2D map;
uniform vec3 at;
varying vec2 vS;
void main() {
  float x = at.x + 160.0 + (vS.x - 0.5) * 240.0 * at.z, y = at.y - vS.y * 240.0;
  gl_FragColor = texture2D(map, vec2(fract(x / 1280.0), clamp((960.0 - y) / 960.0, 0.0, 1.0)));
}`;
function realSky(r, url) {
  const t = new THREE.TextureLoader().load(url);
  t.flipY = false; t.encoding = THREE.LinearEncoding; t.generateMipmaps = false;
  t.minFilter = t.magFilter = THREE.LinearFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, depthTest: false, depthWrite: false,
    uniforms: { map: { value: t }, at: { value: new THREE.Vector3() } },
  }));
  m.frustumCulled = false; m.renderOrder = -100;
  if (r.skyObj) r.skyObj.visible = false;
  if (r.realSky) { r.scene.remove(r.realSky); r.realSky.material.uniforms.map.value.dispose(); }
  r.scene.add(r.realSky = m);
}
/* skybox.c's sums, for where the camera is looking now */
const _look = new THREE.Vector3();
function skyStep(r) {
  if (!r.realSky) return;
  const f = r.cam.getWorldDirection(_look), U = 65536;
  const yaw = ((Math.round(Math.atan2(f.x, f.z) / TAU * U) % U) + U) % U;
  let sx = Math.floor(1280 * yaw / U + 0.5);
  if (sx > 1280) sx -= Math.floor(sx / 1280) * 1280;
  const pitch = Math.atan2(f.y, Math.hypot(f.x, f.z)) * 180 / Math.PI;
  const sy = clamp(Math.round(4 * pitch) + 600, 240, 960);
  r.realSky.material.uniforms.at.value.set(1280 - sx, sy, r.W / r.H);
}

/* ══ MARIO ═════════════════════════════════════════════════════
   His own model, a puppet of sixteen rigid parts on a fifteen-bone frame,
   lit by the sun. Every pose below is written as turns of his limbs about
   HIS axes (x across him, his left; y up; z the way he faces), and turned
   into each bone's own frame through the pose he was built in. */
function mario(D) {
  const tl = new THREE.TextureLoader();
  const t = tl.load(D.mario.tex); t.encoding = THREE.sRGBEncoding; t.flipY = false;
  const mat = new THREE.MeshLambertMaterial({ map: t });
  const bones = D.mario.bones.map(b => {
    const o = new THREE.Object3D(); o.name = b.name;
    new THREE.Matrix4().fromArray(b.m).decompose(o.position, o.quaternion, o.scale);
    o.userData.q0 = o.quaternion.clone();
    return o;
  });
  const rig = new THREE.Group();
  D.mario.bones.forEach((b, i) => (b.parent >= 0 ? bones[b.parent] : rig).add(bones[i]));
  for (const p of D.mario.parts) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(p.p, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(p.n, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(p.u, 2));
    bones[p.bone].add(new THREE.Mesh(geo, mat));
  }
  rig.updateMatrixWorld(true);
  const wq = new THREE.Quaternion();
  bones.forEach(b => { b.getWorldQuaternion(wq); b.userData.w = wq.clone(); b.userData.wi = wq.clone().invert(); });
  const box = new THREE.Box3().setFromObject(rig);
  const s = MARIO_H / (box.max.y - box.min.y);
  const body = new THREE.Group();                 /* stands with his feet on its origin, facing its +z */
  rig.scale.setScalar(s); rig.position.y = -box.min.y * s;
  body.add(rig);
  const by = {}; bones.forEach(b => { by[b.name] = b; });
  return { body, rig, by, s, y0: rig.position.y };
}
/* turn a bone by (x, y, z) radians about Mario's own axes, on top of the pose he was built in */
const _e = new THREE.Euler(), _q = new THREE.Quaternion();
function pose(M, name, x, y, z) {
  const b = M.by[name];
  if (!b) return;
  _q.setFromEuler(_e.set(x || 0, y || 0, z || 0, 'XYZ'));
  b.quaternion.copy(b.userData.q0).multiply(b.userData.wi.clone().multiply(_q).multiply(b.userData.w));
}

/* ══ GOING IN ══════════════════════════════════════════════════ */
let run = null;
function enter(box, star, back) {
  if (run) return;
  const el = doc.createElement('div');
  el.id = 'bob-star';
  el.innerHTML = '<canvas class="bs-gl"></canvas><canvas class="bs-fx"></canvas>' +
    '<div class="bs-title"><div class="bs-name"></div><div class="bs-sub"></div></div>' +
    '<div class="bs-got">YOU GOT A STAR!</div>' +
    '<div class="bs-keys"><span><b>WASD</b> run</span><span><b>Space</b> jump (land and again: double, triple)</span><span><b>J</b> or click: punch, grab, throw, read, talk</span>' +
    '<span><b>Shift</b> crouch; in the air, ground pound</span>' +
    '<span><b>Q</b> / <b>E</b> or drag turn the camera</span><span><b>Esc</b> back to the tavern</span></div>' +
    '<button class="bs-leave" type="button">Back to the tavern</button>' +
    '<button class="bs-rom" type="button" title="The course\'s textures and sky, and the pictures Mario and the rest of the cast are drawn with, are read out of your own copy of Super Mario 64, the way libsm64 does it. Only the pictures are kept, on this computer; the ROM is not.">Real textures: use my SM64 ROM</button>' +
    '<input class="bs-romfile" type="file" accept=".z64,.n64,.v64,.rom,.bin" hidden><div class="bs-romsay"></div>';
  doc.body.appendChild(el);
  const gl = el.querySelector('.bs-gl'), fx = el.querySelector('.bs-fx');
  const ren = new THREE.WebGLRenderer({ canvas: gl, antialias: true, alpha: true });
  ren.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2));
  ren.outputEncoding = THREE.sRGBEncoding;
  ren.setClearColor(0x000000, 0);
  const r = run = {
    el, gl, fx, f: fx.getContext('2d'), ren, back, box, starData: star, t0: now(), last: now(), phase: 'grab',
    keys: new Set(), pressed: new Set(), sprites: [],
    /* the star as it leaves the table: its own little scene over the tavern */
    s2: new THREE.Scene(), cam2: new THREE.PerspectiveCamera(40, 1, 1, 5000),
  };
  r.s2.add(new THREE.AmbientLight(0xffffff, 1));
  r.star2 = starModel(star);
  r.s2.add(r.star2);
  size(r);
  el.querySelector('.bs-leave').addEventListener('click', () => leave());
  /* the player's own game, for the real pictures: picked, or dropped anywhere on the course */
  const romFile = el.querySelector('.bs-romfile');
  el.querySelector('.bs-rom').addEventListener('click', () => romFile.click());
  romFile.addEventListener('change', () => { const f = romFile.files && romFile.files[0]; romFile.value = ''; if (f) readRom(r, f); });
  el.addEventListener('dragover', e => { if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) e.preventDefault(); });
  el.addEventListener('drop', e => { const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) { e.preventDefault(); readRom(r, f); } });
  el.addEventListener('pointerdown', e => { if (e.target.closest('.bs-leave, .bs-rom')) return; r.drag = { x: e.clientX, y: e.clientY, moved: 0 }; e.preventDefault(); });
  root.addEventListener('pointermove', r.onMove = e => { if (!r.drag || !r.camR) return; const dx = e.clientX - r.drag.x, dy = e.clientY - r.drag.y; r.drag.moved += Math.abs(dx) + Math.abs(dy); r.camR.yaw -= dx * 0.006; r.camR.pitch = clamp(r.camR.pitch + dy * 0.004, -0.15, 1.1); r.drag.x = e.clientX; r.drag.y = e.clientY; if (r.drag.moved > 6) r.camR.manual = (now() - r.t0); });
  root.addEventListener('pointerup', r.onUp = e => { if (r.drag && r.drag.moved < 6 && e.button === 0 && r.phase === 'play') r.pressed.add('Mouse'); r.drag = null; });
  el.addEventListener('wheel', e => { e.preventDefault(); e.stopPropagation(); if (r.camR) r.camR.dist = clamp(r.camR.dist * (e.deltaY > 0 ? 1.08 : 0.93), 520, 1900); }, { passive: false });
  el.addEventListener('contextmenu', e => e.preventDefault());
  load().then(D => { if (run === r) world(r, D); }).catch(err => { if (run === r) r.fail = String(err && err.message || err); });
  requestAnimationFrame(loop);
}
function size(r) {
  const d = Math.min(root.devicePixelRatio || 1, 2), W = root.innerWidth, H = root.innerHeight;
  r.W = W; r.H = H; r.d = d;
  r.ren.setSize(W, H, false); r.gl.style.width = W + 'px'; r.gl.style.height = H + 'px';
  r.fx.width = Math.round(W * d); r.fx.height = Math.round(H * d);
  r.cam2.aspect = W / H; r.cam2.updateProjectionMatrix();
  if (r.cam) { r.cam.aspect = W / H; r.cam.updateProjectionMatrix(); }
}
root.addEventListener('resize', () => { if (run) size(run); });

/* the Power Star, from the treasure's own model: gold read off the way it faces (the game's sheen), eyes painted on */
function starModel(L) {
  const g = new THREE.Group(), tl = new THREE.TextureLoader();
  for (const pr of L.prims) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pr.p, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(pr.n, 3));
    if (pr.u) geo.setAttribute('uv', new THREE.Float32BufferAttribute(pr.u, 2));
    geo.setIndex(pr.i);
    const tx = tl.load(L.tex[pr.t]); tx.encoding = THREE.sRGBEncoding; tx.flipY = false;
    const mat = pr.k === 'matcap' ? new THREE.MeshMatcapMaterial({ matcap: tx }) : new THREE.MeshBasicMaterial({ map: tx, transparent: true });
    g.add(new THREE.Mesh(geo, mat));
  }
  const b = new THREE.Box3().setFromObject(g), c = b.getCenter(new THREE.Vector3()), s = 1 / (b.max.y - b.min.y);
  g.children.forEach(m => m.position.sub(c));
  const o = new THREE.Group(); o.add(g); g.scale.setScalar(s);
  /* the model faces +x (it was turned for the wall); the star faces +z here */
  g.rotation.y = -Math.PI / 2;
  return o;                                                          /* one unit tall, about its middle */
}

/* ══ THE COURSE IS BUILT (as soon as the file is in) ═══════════ */
function world(r, D) {
  const scene = r.scene = new THREE.Scene();
  /* the course does its own fog (the N64's, above); this is the nearest straight-line match to it for Mario and the
     cast, applied after the colours are out, as the N64's is: grey, nothing near, most of the way at the far side */
  scene.fog = new THREE.Fog(0xa0a0a0, 4300, 17000);
  r.skyObj = sky(scene);
  D.n64Mats = []; D.castTpl = {};
  scene.add(course(D));
  /* the game's own collision for the course (its surface types and all), not the picture of it */
  const C = D.game.col, ty = C.t.map(x => C.types[x[3]]);
  r.col = collider([{ p: C.v, i: C.t.flatMap(x => [x[0], x[1], x[2]]), ty }]);
  const M = r.M = mario(D);
  scene.add(M.body);
  /* the game's 45 degrees, and its one light riding with the camera (up, right, towards you) for Mario and the cast
     as for the course; half as much again from all round, as Mario's own lights have it */
  r.cam = new THREE.PerspectiveCamera(45, r.W / r.H, 20, 90000);
  scene.add(r.cam);
  scene.add(new THREE.AmbientLight(0xffffff, 0.42));
  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.copy(N64_LIGHT); r.cam.add(sun); r.cam.add(sun.target);
  /* his round shadow, laid on whatever is under him */
  const P = pics();
  r.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: P.shadow, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
  r.shadow.renderOrder = 2; scene.add(r.shadow);
  /* where the game puts him: falling in, spinning, over the corner by the Bob-omb Buddies */
  const sp = D.game.spawn, f = r.col.floor(sp.p[0], 20000, sp.p[2]);
  r.spawn = new THREE.Vector3(sp.p[0], f ? f.h : sp.p[1], sp.p[2]);
  r.spawnYaw = sp.yaw * Math.PI / 180;
  r.m = { p: r.spawn.clone().add(new THREE.Vector3(0, 1000, 0)), vy: 0, v: 0, side: 0, speed: 0, yaw: r.spawnYaw,
          ground: false, chain: 0, last: -9, landT: -9, airT: 0, cut: false, floorN: 1, squash: 0, skid: 0, run: 0, dust: 0,
          kind: 'fall', spawned: false, spinIn: true, act: '', actT: 0, inv: 0, peak: 0, held: null, push: new THREE.Vector3() };
  r.camR = { yaw: r.spawnYaw + Math.PI, pitch: 0.32, dist: 1050, manual: -9, tgt: r.spawn.clone().setY(r.spawn.y + 140) };
  r.game = { hp: 8, coins: 0, lives: 4, stars: 0 };
  r.api = api(r);
  /* the course's own object models (the gate, the seesaw, the grills), drawn as the course is */
  r.n64 = name => (D.objs && D.objs[name] ? n64Model(D, D.objs[name]) : null);
  r.castInsts = [];
  r.cast = (key, holder, opts) => cast(r, key, holder, opts);
  r.castReady = () => !!(D.cast && D.romTex);
  if (root.BobWorld) root.BobWorld.build(r, D);
  r.ready = true;
  /* the real pictures, if this computer has read them out of the player's game before */
  if (D.romTex) useRom(r, { tex: D.romTex, sky: D.romSky });
  else if (root.BobROM && D.rom) root.BobROM.kept(D.rom).then(out => {
    if (run !== r) return;
    if (out) useRom(r, out);
    /* none kept: say, once the course is open, what the button in the corner is for */
    else setTimeout(() => { if (run === r && !r.romTried && !r.el.classList.contains('rom-on')) romSay(r, 'Choose your own copy of Super Mario 64 (bottom right) and the course, its sky, Mario and everything in it are drawn with the game\'s own textures, models and animations.'); }, 6500);
  });
}

/* ══ THE PLAYER'S OWN GAME ═════════════════════════════════════
   27-bob-rom.js reads the pictures out of it; here they are put on. */
const RELEASE = { us: 'US', jp: 'Japanese', eu: 'European', sh: 'Shindou' };
function readRom(r, file) {
  const D = data;
  if (!D || !D.rom || !root.BobROM || r.el.classList.contains('rom-busy')) return;
  r.romTried = true;
  romSay(r, 'Reading ' + file.name + '\u2026');
  r.el.classList.add('rom-busy');
  root.BobROM.fromFile(file, D.rom)
    .then(out => { if (run !== r) return; useRom(r, out); romSay(r, 'Bob-omb Battlefield is now drawn with your ' + (RELEASE[out.ver] || '') + ' cartridge\'s own textures, sky, Mario and cast. Only the pictures are kept, on this computer; the ROM is not.'); })
    .catch(err => { if (run === r) romSay(r, (err && err.message) || String(err)); })
    .then(() => r.el.classList.remove('rom-busy'));
}
function useRom(r, out) {
  const D = data;
  D.romTex = out.tex; D.romSky = out.sky;
  retexture(D);
  if (out.sky) realSky(r, out.sky);
  realMario(r);
  r.el.classList.add('rom-on');
  if (root.BobWorld && root.BobWorld.rom) root.BobWorld.rom(r, D);
}
function romSay(r, text) {
  const n = r.el.querySelector('.bs-romsay');
  n.textContent = text; n.classList.add('on');
  clearTimeout(r.romSayT); r.romSayT = setTimeout(() => n.classList.remove('on'), 6500);
}
/* what the things in the course can do to Mario (27-bob-world.js) */
function api(r) {
  const g = () => r.game, m = () => r.m;
  return {
    damage(n, from) {
      const M = m();
      if (M.inv > 0 || M.act === 'dead' || r.phase !== 'play' || M.act === 'grabbed') return;
      g().hp = Math.max(0, g().hp - n);
      if (M.held && root.BobWorld) { root.BobWorld.release(r, M.held, { x: 0, y: 300, z: 0 }); M.held = null; }
      if (g().hp === 0) { die(r); return; }
      /* knocked back, away from what hit him, and a moment when nothing more can */
      M.inv = 2.2;
      if (from) M.yaw = Math.atan2(from.x - M.p.x, from.z - M.p.z);
      M.ground = false; M.kind = 'hurt'; M.airT = 0; M.vy = 22 * F; M.v = -16; M.side = 0; M.act = ''; M.peak = M.p.y;
      r.shake = Math.max(r.shake || 0, 0.25);
    },
    coin(v) {
      const G = g(), before = G.coins;
      G.coins += v; G.hp = Math.min(8, G.hp + v);
      /* every fifty a life, and a hundred is a star */
      if (Math.floor(G.coins / 50) > Math.floor(before / 50)) this.life();
      if (G.coins >= 100 && !r.hundred) { r.hundred = true; const M = m(); spawnStar(r, M.p.x, M.p.y + 450, M.p.z, '100 Coins'); }
    },
    heal(n) { g().hp = Math.min(8, g().hp + n); },
    life() { g().lives++; },
    star(p, name) { got(r, (now() - r.t0) / (root.__bobSlow || 1), name); },
    say(id, done, raw) { say(r, id, done, raw); },
    shake(d) { r.shake = Math.max(r.shake || 0, d); },
    flash(d, mid) { r.flashT = now(); r.flashD = d; r.flashMid = mid; },
  };
}
function spawnStar(r, x, y, z, name) {
  const W = root.BobWorld && root.BobWorld.W;
  if (!W) return;
  /* the world module's own star, so that it turns and can be taken like the others */
  const s = starModel(r.starData); s.scale.setScalar(220); s.position.set(x, y, z); r.scene.add(s);
  W.stars.push({ s, p: s.position, name, got: false, y0: y });
}
function die(r) {
  const M = r.m;
  M.act = 'dead'; M.actT = 0; M.v = 0; M.held = null;
  r.game.lives = Math.max(0, r.game.lives - 1);
  setTimeout(() => {
    if (run !== r) return;
    r.api.flash(0.9, () => { r.game.hp = 8; if (r.game.lives === 0) r.game.lives = 4; M.act = ''; respawn(r); M.spinIn = true; });
  }, 1600);
}

/* ══ WHAT IS SAID ══════════════════════════════════════════════
   The game's own box: dark, rounded, the words coming a letter at a time,
   a page of four (or five) lines at a time, Space or J for the next. The
   game's buttons are put into the keys that do the same here. */
const BUTTONS = [[/\[A\]/g, 'Space'], [/\[B\]/g, 'J'], [/\[Z\]/g, 'Shift'], [/\[R\]/g, 'Q / E'], [/\[C\][▲▼◀▶]?/g, 'Q / E'], [/[『』]/g, '"']];
function say(r, id, done, raw) {
  const W = root.BobWorld && root.BobWorld.W, box = W && W.hud && W.hud.say;
  if (!box) return;
  const T = raw ? { text: raw, lines: 4 } : root.BobWorld.text(id);
  if (!T) { if (done) done(); return; }
  let text = T.text;
  BUTTONS.forEach(([re, to]) => { text = text.replace(re, to); });
  const lines = text.split('\n'), pages = [];
  for (let i = 0; i < lines.length; i += T.lines) pages.push(lines.slice(i, i + T.lines).join('\n').replace(/^\n+|\n+$/g, ''));
  r.dlg = { pages: pages.filter(p => p.trim()), i: 0, n: 0, t: now(), done, box, p: box.querySelector('p') };
  r.m.act = 'talk'; r.m.v = 0;
  box.classList.add('on');
}
function sayStep(r) {
  const d = r.dlg;
  if (!d) return;
  const page = d.pages[d.i] || '';
  d.n = Math.min(page.length, Math.floor((now() - d.t) * 60));
  d.p.textContent = page.slice(0, d.n);
  d.box.classList.toggle('more', d.n >= page.length);
  if (took(r, KEYS_A.concat(KEYS_B))) {
    if (d.n < page.length) d.t = now() - 999;
    else if (++d.i < d.pages.length) { d.t = now(); }
    else { d.box.classList.remove('on', 'more'); r.dlg = null; r.m.act = ''; if (d.done) d.done(); }
  }
}

/* ══ EVERY FRAME ═══════════════════════════════════════════════ */
function loop() {
  const r = run;
  if (!r) return;
  requestAnimationFrame(loop);
  const slow = root.__bobSlow || 1;                               /* for looking at it frame by frame (a test sets it) */
  const t = (now() - r.t0) / slow, dt = Math.min(0.05, now() - r.last) / slow;
  r.last = now();
  const f = r.f, d = r.d, W = r.W, H = r.H;
  f.setTransform(d, 0, 0, d, 0, 0); f.clearRect(0, 0, W, H);
  const C = { x: (r.box.left + r.box.right) / 2, y: (r.box.top + r.box.bottom) / 2, s: Math.max(16, r.box.bottom - r.box.top) };

  if (r.phase === 'grab' || r.phase === 'fly') {
    /* the star over the tavern, in its own little scene: spinning up where it stood, then rushing at you */
    const k = t / 0.75, k2 = c01((t - 0.75) / 0.6);
    const e = easeIn(k2), spin = t * (6 + 22 * c01(k)) + 30 * e * e;
    const x = lerp(C.x, W / 2, smooth(c01(k2 * 1.4))), y = lerp(C.y, H / 2, smooth(c01(k2 * 1.4))) - Math.sin(Math.PI * c01(k)) * C.s * 0.25 * (1 - k2);
    /* place it so it covers `px` pixels at that spot */
    const px = C.s * (1 + 0.25 * smooth(c01(k))) * (1 + 24 * e * e);
    const dist = 400, fov = r.cam2.fov * Math.PI / 180, unit = (2 * dist * Math.tan(fov / 2)) / H;
    r.star2.position.set((x - W / 2) * unit, -(y - H / 2) * unit, -dist);
    r.star2.scale.setScalar(px * unit);
    r.star2.rotation.y = spin;
    /* the light pouring off it */
    rays(f, x, y, px * (1.4 + 2.5 * c01(k)), t, 0.25 + 0.6 * c01(k) + 0.4 * e);
    if (Math.random() < 0.7) r.sprites.push({ x: x + rnd(-1, 1) * px, y: y + rnd(-1, 1) * px, b: t, l: rnd(0.3, 0.6), s: rnd(6, 16) });
    twinkles(f, r, t);
    r.ren.setClearColor(0x000000, 0); r.ren.render(r.s2, r.cam2);
    if (t > 0.75 && r.phase === 'grab') r.phase = 'fly';
    if (k2 >= 1) { r.phase = 'white'; r.p0 = t; }
    if (k2 > 0.7) { f.fillStyle = 'rgba(255,255,255,' + ((k2 - 0.7) / 0.3).toFixed(3) + ')'; f.fillRect(0, 0, W, H); }
  } else if (r.phase === 'white') {
    r.ren.clear();
    f.fillStyle = '#fff'; f.fillRect(0, 0, W, H);
    if (r.fail) { note(r, 'The course would not load: ' + r.fail + '.'); if (t - r.p0 > 2) leave(); }
    else if (r.ready && t - r.p0 > 0.25) { r.phase = 'open'; r.p0 = t; r.flyT = t; }
  } else {
    if (r.ready) step(r, t, dt);
    if (r.phase === 'open') {
      /* the course, through a star-shaped hole opening from the middle, on white */
      const k = c01((t - r.p0) / 1.1), rad = Math.hypot(W, H) * 0.95 * easeIn(k) + 2;
      starHole(f, W / 2, H / 2, rad, t * 1.2, '#fff');
      if (k >= 1) { r.phase = 'intro'; r.p0 = t; title(r, true); }
    } else if (r.phase === 'out') {
      /* closing on Mario, then black, then the star hole opening on the tavern */
      const k = (t - r.p0) / 0.95;
      if (k < 1) {
        const at = r.irisAt || { x: W / 2, y: H / 2 }, rad = Math.hypot(W, H) * (1 - easeOut(c01(k)));
        starHole(f, at.x, at.y, rad, -t * 1.2, '#000');
      } else {
        if (!r.home) {
          r.home = true; r.ren.setClearColor(0x000000, 0); r.el.classList.add('home');
          r.el.querySelector('.bs-got').classList.remove('on');      /* the words go with the dark */
          if (r.back) r.back();
        }
        const k2 = c01((k - 1) / 0.9), rad = Math.hypot(W, H) * easeIn(k2) + 2;
        r.ren.clear();
        starHole(f, C.x, C.y, rad, t * 1.2, '#000');
        if (k2 >= 1) finish();
        return;
      }
    }
    if (r.phase === 'intro' && t - r.p0 > 4.4) { r.phase = 'play'; r.el.classList.add('play'); title(r, false); }
    if (r.ready && !r.home) { castStep(r, dt); skyStep(r); r.ren.render(r.scene, r.cam); }
    twinkles(f, r, t);
    if (r.flashT) {
      const k = (now() - r.flashT) / r.flashD;
      if (k >= 0.5 && r.flashMid) { const mid = r.flashMid; r.flashMid = null; mid(); }
      if (k >= 1) r.flashT = 0;
      else { f.fillStyle = 'rgba(255,255,255,' + (1 - Math.abs(k * 2 - 1)).toFixed(3) + ')'; f.fillRect(0, 0, W, H); }
    }
  }
}

/* ══ MARIO, MOVING ═════════════════════════════════════════════ */
const _v = new THREE.Vector3(), _cam = new THREE.Vector3();
function step(r, t, dt) {
  const m = r.m, col = r.col;
  sayStep(r);
  /* fixed steps, so a jump is the same jump however the frames fall */
  r.acc = (r.acc || 0) + dt;
  let n = 0;
  while (r.acc >= 1 / 120 && n++ < 12) { r.acc -= 1 / 120; physics(r, t, 1 / 120); }
  if (m.act === 'dead') m.actT += dt;
  animate(r, t, dt);
  camera(r, t, dt);
  if (root.BobWorld) root.BobWorld.step(r, t, dt);
  /* the shadow on the ground under him */
  const fl = col.floor(m.p.x, m.p.y + 20, m.p.z);
  if (fl && m.spawned) {
    const hgt = m.p.y - fl.h, s = 110 * clamp(1 - hgt / 2500, 0.35, 1);
    r.shadow.visible = true;
    r.shadow.position.set(m.p.x, fl.h + 3, m.p.z);
    r.shadow.lookAt(m.p.x + fl.t.nx, fl.h + 3 + fl.t.ny, m.p.z + fl.t.nz);
    r.shadow.scale.set(s, s, 1);
    r.shadow.material.opacity = clamp(1 - hgt / 3000, 0.35, 1);
  } else r.shadow.visible = false;
  stepSprites(r, t, dt);
}
function intent(r) {
  const k = r.keys;
  let fwd = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
  let side = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
  if (r.phase !== 'play') fwd = side = 0;
  const mag = Math.min(1, Math.hypot(fwd, side));
  if (!mag) return null;
  const fa = r.camR.yaw + Math.PI;                                  /* the way the camera looks */
  const x = Math.sin(fa) * fwd - Math.cos(fa) * side, z = Math.cos(fa) * fwd + Math.sin(fa) * side;
  return { yaw: Math.atan2(x, z), mag };
}
/* the buttons, as the game has them: A jumps, B punches (and grabs, throws, reads, talks), Z crouches (and, in the
   air, pounds the ground) */
const KEYS_A = ['Space'], KEYS_B = ['KeyJ', 'KeyK', 'Mouse'], KEYS_Z = ['ShiftLeft', 'ShiftRight', 'KeyL'];
const took = (r, list) => { let hit = false; for (const k of list) if (r.pressed.has(k)) { r.pressed.delete(k); hit = true; } return hit; };
const holding = (r, list) => list.some(k => r.keys.has(k));

/* ══ MARIO, MOVING ═════════════════════════════════════════════
   The ground and the air, on the game's own numbers (see the top of the
   file), and the rest of his moves: B punches twice and kicks, grabs what
   can be grabbed and throws it, kicks in the air, and dives at a run; Z
   crouches, slides at a run, and in the air spins and pounds the ground; Z
   and A at a run is the long jump, crouching still it is the backflip, and A
   in the middle of a skid round is the side flip. */
function physics(r, t, dt) {
  const m = r.m, col = r.col, W = root.BobWorld, want = intent(r);
  if (!m.spawned) return;
  const fr = dt * F;
  const live = r.phase === 'play' && m.act !== 'talk' && m.act !== 'dead' && m.act !== 'grabbed';
  const A = live && took(r, KEYS_A), B = live && took(r, KEYS_B), Zp = live && took(r, KEYS_Z);
  const Ah = r.keys.has('Space'), Zh = live && holding(r, KEYS_Z);
  if (!live) { r.pressed.clear(); }
  m.inv = Math.max(0, m.inv - dt);
  if (m.act === 'grabbed') return;                                /* King Bob-omb has him; the King moves him */
  if (m.ground) {
    const dYaw = want ? wrap(want.yaw - m.yaw) : 0;
    m.actT += dt;
    if (m.act === 'dead') { m.v = 0; }
    else if (m.act === 'hurt') { m.v = Math.min(0, m.v + 2 * fr); if (m.actT > 0.45) m.act = ''; }
    else if (m.act === 'punch') {
      /* a punch, a second, a kick: each a short lunge, the next one queued by B while this one is out */
      m.v = Math.max(0, m.v - 2 * fr);
      if (m.actT > 0.08 && m.actT < 0.2 && !m.hitDone) { m.hitDone = true; if (W) W.hit(r, m.punchN === 2 ? 'kick' : 'punch', ahead(m, 70), 110); }
      if (B && m.actT > 0.12 && m.punchN < 2) { m.punchN++; m.actT = 0; m.hitDone = false; m.v = Math.max(m.v, 6); }
      if (m.actT > (m.punchN === 2 ? 0.42 : 0.3)) m.act = '';
    } else if (m.act === 'throw') { m.v = Math.max(0, m.v - 2 * fr); if (m.actT > 0.3) m.act = ''; }
    else if (m.act === 'poundland') { m.v = 0; if (m.actT > 0.35) m.act = ''; }
    else if (m.act === 'slide') {
      /* on his belly after a dive, or crouched and skidding after Z at a run: slowing at 1.5 a frame */
      m.v = Math.max(0, m.v - 1.5 * fr);
      if (A && m.slideCrouch && m.v > 10) longJump(r);
      else if (A && !m.slideCrouch) { m.act = ''; jumpFrom(r, t, 0); }
      else if (m.v === 0) m.act = m.slideCrouch && Zh ? 'crouch' : '';
    } else if (Zh && !m.held) {
      if (m.act !== 'crouch' && m.v > 10) { m.act = 'slide'; m.slideCrouch = true; m.actT = 0; }
      else {
        m.act = 'crouch';
        m.v = Math.max(0, m.v - 3 * fr);
        if (A) { if (m.v < 4) backflip(r); else longJump(r); }
      }
    } else {
      if (m.act === 'crouch') m.act = '';
      if (m.skid > 0) {
        /* turning round, or braking: sliding to a stop at 4 a frame, and then (turning) facing the new way at 8 */
        m.v = Math.max(0, m.v - 4 * fr);
        if (A && m.skid === 2) { sideflip(r, want); }
        else if (m.v === 0) {
          if (m.skid === 2 && want) { m.yaw = want.yaw; m.v = 8; }
          m.skid = 0;
        } else if (m.skid === 2 && (!want || Math.abs(dYaw) <= BACK)) m.skid = 0;
        else if (m.skid === 1 && want && Math.abs(dYaw) <= BACK) m.skid = 0;
      } else if (want) {
        if (Math.abs(dYaw) > BACK && m.v >= 16 && !m.held) m.skid = 2;
        else {
          /* the game's walk: 1.1 a frame, less the faster he goes; a turn of 0x800 a frame. Carrying, slower. */
          const top = (m.held ? 0.5 : 1) * 32 * want.mag;
          if (m.v <= 0) m.v += 1.1 * fr;
          else if (m.v <= top) m.v = Math.min(top, m.v + (1.1 - m.v / 43) * fr);
          else m.v = Math.max(top, m.v - 1 * fr);
          m.yaw = wrap(m.yaw + clamp(dYaw, -TURN * fr, TURN * fr));
        }
      } else if (m.v >= 16 && !m.held) m.skid = 1;
      else m.v = Math.max(0, m.v - 1 * fr);
      if (m.skid === 0 && m.act === '') {
        if (B) {
          const talk = W && W.talk(r);
          if (talk) { r.api.say(talk.text, talk.done); }
          else if (m.held) throwIt(r);
          else {
            const g = W && W.grab(r);
            if (g) { m.held = g; m.act = 'throw'; m.actT = 0.15; }
            else if (m.v > 28) dive(r, true);
            else { m.act = 'punch'; m.punchN = 0; m.actT = 0; m.hitDone = false; m.v = Math.max(m.v, 6); }
          }
        } else if (A) jumpFrom(r, t, null);
      }
    }
  } else {
    /* the air: no turning; pushing on adds or takes forward speed, sideways drifts */
    m.airT += dt;
    if (m.kind === 'pound') {
      /* the spin, held in the air, and then straight down */
      m.v = 0; m.side = 0;
      if (m.airT < 0.28) { m.vy = 0; } else m.vy = -FALL * 1.1;
    } else if (m.kind !== 'hurt' && m.kind !== 'thrown') {
      m.v = m.v > 0 ? Math.max(0, m.v - 0.35 * fr) : Math.min(0, m.v + 0.35 * fr);
      m.side = 0;
      if (want && m.kind !== 'dive') {
        const dYaw = wrap(want.yaw - m.yaw);
        m.v += want.mag * Math.cos(dYaw) * 1.5 * fr;
        m.side = want.mag * Math.sin(dYaw) * 10;
      }
      const cap = m.kind === 'longjump' ? 48 : 32;
      if (m.v > cap) m.v -= 1 * fr;
      if (m.v < -16 && m.kind !== 'backflip') m.v += 2 * fr;
      if (m.cut && !Ah && m.vy > 20 * F) { m.vy /= 4; m.cut = false; }
      if (B && !m.held && !m.kicked && m.kind !== 'dive') {
        if (m.v > 28 && m.kind !== 'longjump') dive(r, false);
        else {
          /* the jump kick: from a jump, a double or a fall; the flips keep their own shape */
          m.kicked = true; m.kickT = t;
          if (/^(jump|jump2|fall)$/.test(m.kind)) m.kind = 'kick';
          if (W) W.hit(r, 'kick', ahead(m, 50, 40), 120);
        }
      } else if (B && m.held) throwIt(r);
      if (Zp && !m.held && m.kind !== 'dive') { m.kind = 'pound'; m.airT = 0; m.vy = 0; }
    }
    const g = m.kind === 'longjump' ? 2 : 4;
    if (m.kind !== 'pound') m.vy = Math.max(-FALL, m.vy - g * F * F * dt);
    m.peak = Math.max(m.peak, m.p.y);
  }
  /* to units a second, along his facing (and, in the air, across it) */
  const ns = m.ground && m.floorN ? m.floorN : 1;
  const vx = (Math.sin(m.yaw) * m.v * ns + (m.ground ? 0 : Math.cos(m.yaw) * m.side)) * F + m.push.x;
  const vz = (Math.cos(m.yaw) * m.v * ns - (m.ground ? 0 : Math.sin(m.yaw) * m.side)) * F + m.push.z;
  m.push.multiplyScalar(Math.exp(-6 * dt));
  const p = m.p, ox = p.x, oz = p.z;
  p.x += vx * dt; p.z += vz * dt;
  const floorAt = (y) => {
    const a = col.floor(p.x, y, p.z), b = W ? W.floor(r, p.x, y, p.z) : null;
    return a && b ? (b.h > a.h ? b : a) : a || b;
  };
  if (m.ground) {
    /* up a step of up to 78, down one of up to 100, and off anything further */
    const f = floorAt(p.y + 78);
    if (!f) { p.x = ox; p.z = oz; m.v = 0; }                     /* the edge of the world: nothing to stand on */
    else if (f.h < p.y - 100) { m.ground = false; m.vy = 0; m.kind = 'fall'; m.airT = 0; m.side = 0; m.cut = false; m.kicked = false; m.peak = p.y; if (m.act !== 'dead') m.act = ''; }
    else if (col.ceil(p.x, f.h + 20, p.z) < f.h + MARIO_H) { p.x = ox; p.z = oz; m.v = 0; }   /* no room to stand */
    else {
      p.y = f.h; m.floorN = f.t.ny; m.floorT = f.t;
      /* too steep to stand on (the slipperier the surface, the less it takes): down it he goes */
      if (f.t.ny < slideAt(f.t)) { p.x += f.t.nx * 900 * dt; p.z += f.t.nz * 900 * dt; m.v *= 0.97; }
      if (f.carry) { p.x += f.carry.x; p.y += f.carry.y; p.z += f.carry.z; }
    }
  } else {
    p.y += m.vy * dt;
    if (m.vy > 0) { const c = col.ceil(p.x, p.y + 20, p.z); if (c < p.y + MARIO_H) { p.y = c - MARIO_H; m.vy = 0; } }
    const f = floorAt(p.y + 78);
    if (f && p.y <= f.h && m.vy <= 0) land(r, t, f);
  }
  /* the walls: at 30 and 60 on the ground, 30 and 150 in the air, 50 out; and whatever stands in the course */
  const hit = col.walls(p, p.y + 30, R) + col.walls(p, p.y + (m.ground ? 60 : 150), R);
  if (W) W.solid(r, p);
  if (hit && m.ground) m.v *= 0.985;
  if (hit && m.kind === 'dive') m.v = Math.min(m.v, 8);
  /* off the edge of the course: back where he came in, a little the worse for it */
  if (p.y < -3000) { r.api.damage(3, null); respawn(r); }
  m.run += m.v * F * dt;
  m.speed = m.v * F;
  if (m.ground && m.v > 22 && (m.dust -= dt) < 0) { m.dust = 0.09; puff(r, p, 1, 55); }
}
function slideAt(t) {
  const ty = t.type || '';
  if (/VERY_SLIPPERY/.test(ty)) return 0.98;
  if (/SLIPPERY/.test(ty) && !/NOT_SLIPPERY/.test(ty)) return 0.9;
  if (/NOT_SLIPPERY/.test(ty)) return 0.2;
  return 0.7;
}
function ahead(m, d, up) { return new THREE.Vector3(m.p.x + Math.sin(m.yaw) * d, m.p.y + (up || 70), m.p.z + Math.cos(m.yaw) * d); }
function jumpFrom(r, t, force) {
  const m = r.m;
  /* the game's jump from the ground: a double within five frames of landing, a triple off a double at speed */
  const soon = t - m.landT < CHAIN;
  let kind = force != null ? force : !soon ? 0 : m.last === 1 ? (m.v > 20 ? 2 : 0) : m.last === 0 || m.last === -1 ? 1 : 0;
  if (m.held) kind = 0;
  m.chain = kind; m.vy = JUMP[kind] + m.v * CARRY[kind]; m.v *= 0.8;
  air(r, ['jump', 'jump2', 'jump3'][kind]); m.cut = kind < 2;
  puff(r, m.p, 3, 70);
}
function air(r, kind) { const m = r.m; m.ground = false; m.kind = kind; m.airT = 0; m.skid = 0; m.act = ''; m.kicked = false; m.cut = false; m.peak = m.p.y; }
function longJump(r) { const m = r.m; m.vy = 30 * F; m.v = Math.min(48, m.v * 1.5); air(r, 'longjump'); puff(r, m.p, 3, 70); }
function backflip(r) { const m = r.m; m.vy = 62 * F; m.v = -16; air(r, 'backflip'); puff(r, m.p, 3, 70); }
function sideflip(r, want) { const m = r.m; if (want) m.yaw = want.yaw; m.vy = 62 * F; m.v = 8; air(r, 'sideflip'); puff(r, m.p, 3, 70); }
function dive(r, fromGround) {
  const m = r.m;
  m.v = Math.min(48, m.v + 15); if (fromGround) m.vy = 0.25 * m.v * F * 0.5; else m.vy = Math.max(m.vy, 0);
  air(r, 'dive');
  if (root.BobWorld) root.BobWorld.hit(r, 'dive', ahead(m, 60, 50), 130);
}
function throwIt(r) {
  const m = r.m, o = m.held;
  m.held = null; m.act = 'throw'; m.actT = 0;
  if (root.BobWorld && o) root.BobWorld.release(r, o, { x: Math.sin(m.yaw) * (14 + m.v) * F, y: (m.ground ? 25 : 10) * F, z: Math.cos(m.yaw) * (14 + m.v) * F });
}
function land(r, t, f) {
  const m = r.m, p = m.p, W = root.BobWorld;
  p.y = f.h; m.ground = true; m.floorN = f.t.ny; m.floorT = f.t; m.squash = 1; m.side = 0;
  const fell = m.peak - p.y, kind = m.kind, vy = m.vy;
  m.landT = t;
  /* what he landed from decides what the next jump can be */
  m.last = kind === 'jump' || kind === 'kick' ? 0 : kind === 'jump2' ? 1 : kind === 'fall' ? -1 : 2;
  m.vy = 0; m.kind = 'run'; m.actT = 0; m.act = '';
  if (kind === 'pound') { m.act = 'poundland'; r.api.shake(0.25); puff(r, p, 8, 120); if (W) W.hit(r, 'pound', p.clone().setY(p.y + 10), 140); }
  else if (kind === 'dive') { m.act = 'slide'; m.slideCrouch = false; }
  else if (kind === 'hurt' || kind === 'thrown') { m.act = 'hurt'; m.v = Math.min(m.v, 0); }
  else if (vy < -900 || fell > 400) puff(r, p, 5, 90);
  /* a long way down is a hard landing (the game's 1150) */
  if (fell > 1150 && kind !== 'pound' && kind !== 'thrown') r.api.damage(3, null);
  if (W && W.stomp) W.stomp(r, kind);
}
function respawn(r) {
  const m = r.m;
  m.p.copy(r.spawn).add(_v.set(0, 1000, 0)); m.vy = 0; m.v = 0; m.side = 0; m.yaw = r.spawnYaw;
  air(r, 'fall'); m.inv = 2; m.held = null; m.push.set(0, 0, 0);
  r.camR.yaw = m.yaw + Math.PI;
}

/* ══ MARIO, POSED ══════════════════════════════════════════════
   A run that quickens with his speed and a lean into it; the jump with a
   fist up, the double with both, the triple a somersault forward, the
   backflip one backward, the side flip a cartwheel; the long jump and the
   dive flat out; the ground pound a spin and a tuck; punches and the kick;
   crouching; carrying with both arms up; knocked back; and, still,
   breathing. */
/* ══ THE REAL MARIO ════════════════════════════════════════════
   With the player's own game read, Mario is the game's own Mario
   (actors/mario: his full-detail body, his own animations out of
   assets/anims), in place of the model he came with: moved exactly as
   before, but drawn in the animation the game plays for what he is
   doing (mario_actions_*.c), at the speed it plays it (walking and
   running at a quarter of his speed a frame), with his own blink, his
   fists, open hands round what he carries and the peace sign at a star. */
const BLINK = [1, 2, 1, 0, 1, 2, 1];
function realMario(r) {
  if (r.realM || !data || !data.cast || !data.cast.mario) return;
  const h = new THREE.Group();
  r.M.body.add(h);
  const I = cast(r, 'mario', h);
  if (!I) { r.M.body.remove(h); return; }
  r.realM = I; r.M.rig.visible = false;
  I.hand = 0; I.eyes = 0; I.look = 0;
  /* geo_switch_mario_eyes, _hand, _cap_on_off */
  I.pick = (fn, n) => {
    if (fn === 'geo_switch_mario_eyes') { if (I.eyes) return I.eyes - 1; const b = ((n.n * 32 + Math.floor(I.clock)) >> 1) & 31; return b < 7 ? BLINK[b] : 0; }
    if (fn === 'geo_switch_mario_hand') return I.hand === 0 ? 0 : n.n === 0 ? (I.hand < 5 ? I.hand : 1) : (I.hand < 2 ? I.hand : 0);
    if (fn === 'geo_switch_mario_cap_on_off') return 0;
    return null;
  };
  I.play('IDLE_HEAD_LEFT', 1);
}
const LOOKS = ['IDLE_HEAD_LEFT', 'IDLE_HEAD_RIGHT', 'IDLE_HEAD_CENTER'];
function animateReal(r, t, dt) {
  const I = r.realM, m = r.m, held = !!m.held, fwd = m.speed / F;
  let A, sp = 1;
  I.hand = held ? 1 : r.cheer ? 2 : 0;
  I.eyes = m.act === 'dead' ? 8 : 0;
  if (m.act === 'dead') A = 'DYING_FALL_OVER';
  else if (r.cheer) A = 'STAR_DANCE';
  else if (m.act === 'grabbed') A = 'BEING_GRABBED';
  else if (!m.ground) {
    const k = m.kind;
    A = k === 'jump3' ? 'TRIPLE_JUMP' : k === 'backflip' ? 'BACKFLIP' : k === 'sideflip' ? 'SLIDEFLIP'
      : k === 'longjump' ? (fwd > 16 ? 'FAST_LONGJUMP' : 'SLOW_LONGJUMP') : k === 'dive' ? 'DIVE'
      : k === 'pound' ? (m.airT < 0.3 ? 'START_GROUND_POUND' : 'GROUND_POUND') : k === 'kick' ? 'AIR_KICK'
      : k === 'hurt' || k === 'thrown' ? 'BACKWARD_AIR_KB'
      : k === 'jump2' ? (m.vy > 0 ? 'DOUBLE_JUMP_RISE' : 'DOUBLE_JUMP_FALL')
      : k === 'jump' ? (held ? 'JUMP_WITH_LIGHT_OBJ' : 'SINGLE_JUMP') : held ? 'FALL_WITH_LIGHT_OBJ' : 'GENERAL_FALL';
  } else if (m.act === 'punch') A = ['FIRST_PUNCH', 'SECOND_PUNCH', 'GROUND_KICK'][m.punchN] || 'FIRST_PUNCH';
  else if (m.act === 'throw') A = 'GROUND_THROW';
  else if (m.act === 'crouch' || (m.act === 'slide' && m.slideCrouch)) A = 'CROUCHING';
  else if (m.act === 'slide') A = 'SLIDE_DIVE';
  else if (m.act === 'poundland') A = 'GROUND_POUND_LANDING';
  else if (m.act === 'hurt') A = 'BACKWARD_AIR_KB';
  else if (m.skid > 0) A = 'SKID_ON_GROUND';
  else if (m.speed > 30) {
    sp = Math.max(0.1, fwd / 4);
    A = held ? (fwd < 10 ? 'WALK_WITH_LIGHT_OBJ' : 'RUN_WITH_LIGHT_OBJ') : fwd < 8 ? 'TIPTOE' : fwd < 18 ? 'WALKING' : 'RUNNING';
  } else if (held) A = 'IDLE_WITH_LIGHT_OBJ';
  else {
    /* standing: a look left, a look right, a look ahead, and again (act_idle) */
    if (!LOOKS.includes(I.anim)) I.look = 0;
    else if (I.done) { I.look = (I.look + 1) % 3; I.anim = -1; }
    A = LOOKS[I.look];
  }
  if (A !== I.anim) I.play(A, sp); else I.speed = sp;
  /* coming in from the sky, spinning down; and squashed a little on a hard landing, as the model he came with was */
  const sq = Math.sin(m.squash * Math.PI) * 0.16, h = I.holder;
  h.scale.set(1 + sq * 0.6, 1 - sq, 1 + sq * 0.6);
  h.rotation.set(0, m.spinIn && !m.ground ? m.airT * 14 : 0, 0);
}
function animate(r, t, dt) {
  const M = r.M, m = r.m;
  /* blinking while he cannot be hurt again */
  M.body.visible = m.spawned && !(m.inv > 0 && Math.floor(t * 14) % 2 && m.act !== 'dead');
  M.body.position.copy(m.p);
  M.body.rotation.set(0, m.yaw, 0);
  m.squash = Math.max(0, m.squash - dt * 6);
  const sq = Math.sin(m.squash * Math.PI) * 0.16;
  M.rig.scale.set(M.s * (1 + sq * 0.6), M.s * (1 - sq), M.s * (1 + sq * 0.6));
  const sp = c01(m.speed / RUN), ph = m.run / 260;
  const A = {};
  const set = (b, x, y, z) => { A[b] = [x || 0, y || 0, z || 0]; };
  set('UpperArm.L', 0, 0, -0.72); set('UpperArm.R', 0, 0, 0.72);
  let rx = 0, rz = 0, ry = 0, lift = 0;
  const air = !m.ground && m.act !== 'grabbed';
  if (m.act === 'dead') {
    rx = -1.45; lift = -40;
    set('UpperArm.L', 0, 0, -1.6); set('UpperArm.R', 0, 0, 1.6);
  } else if (m.act === 'grabbed') {
    const w = Math.sin(t * 16) * 0.5;
    set('UpperArm.L', -1 + w, 0, -0.4); set('UpperArm.R', -1 - w, 0, 0.4); set('UpperLeg.L', w); set('UpperLeg.R', -w);
  } else if (air) {
    const k = m.kind, up = m.vy > 0;
    if (k === 'jump3') { set('UpperLeg.L', -1.2); set('UpperLeg.R', -1.2); set('LowerLeg.L', 1.6); set('LowerLeg.R', 1.6); set('UpperArm.L', -0.4, 0, -0.3); set('UpperArm.R', -0.4, 0, 0.3); set('Spine2', 0.4); rx = c01(m.airT / 0.85) * TAU; }
    else if (k === 'backflip') { set('UpperLeg.L', -1.1); set('UpperLeg.R', -1.1); set('LowerLeg.L', 1.5); set('LowerLeg.R', 1.5); set('UpperArm.L', -2.5, 0, -0.4); set('UpperArm.R', -2.5, 0, 0.4); rx = -c01(m.airT / 0.95) * TAU; }
    else if (k === 'sideflip') { set('UpperArm.L', 0, 0, -1.7); set('UpperArm.R', 0, 0, 1.7); set('UpperLeg.L', -0.4); set('UpperLeg.R', 0.2); rz = c01(m.airT / 0.85) * TAU; }
    else if (k === 'longjump' || k === 'dive') { rx = 1.35; set('UpperArm.L', -2.9, 0, -0.15); set('UpperArm.R', -2.9, 0, 0.15); set('UpperLeg.L', 0.25); set('UpperLeg.R', 0.25); }
    else if (k === 'pound') {
      if (m.airT < 0.28) rx = (m.airT / 0.28) * TAU;
      set('UpperLeg.L', -1.4); set('UpperLeg.R', -1.4); set('LowerLeg.L', 1.9); set('LowerLeg.R', 1.9); set('UpperArm.L', -0.6, 0, -0.9); set('UpperArm.R', -0.6, 0, 0.9); set('Spine2', 0.5);
    } else if (k === 'kick') { set('UpperLeg.R', -1.5); set('LowerLeg.R', 0.1); set('UpperLeg.L', 0.3); set('LowerLeg.L', 0.8); set('UpperArm.L', -0.6, 0, -1.2); set('UpperArm.R', 0.4, 0, 1.1); set('Spine2', -0.25); }
    else if (k === 'hurt' || k === 'thrown') { rx = k === 'thrown' ? -m.airT * 7 : -0.5; set('UpperArm.L', -1.4, 0, -1.1); set('UpperArm.R', -1.4, 0, 1.1); set('UpperLeg.L', -0.6); set('UpperLeg.R', -0.2); }
    else if (k === 'jump2') { set('UpperArm.L', -2.6, 0, -0.3); set('UpperArm.R', -2.6, 0, 0.3); set('UpperLeg.L', -0.7); set('LowerLeg.L', 1.1); set('UpperLeg.R', 0.25); }
    else if (k === 'jump' && up) { set('UpperArm.R', -2.7, 0, 0.2); set('UpperArm.L', 0.3, 0, -0.9); set('UpperLeg.L', -0.8); set('LowerLeg.L', 1.2); set('UpperLeg.R', 0.2); set('LowerLeg.R', 0.3); }
    else { const w = Math.sin(t * 14) * 0.25; set('UpperArm.L', -0.4 + w, 0, -0.2); set('UpperArm.R', -0.4 - w, 0, 0.2); set('UpperLeg.L', -0.3); set('UpperLeg.R', 0.1); set('LowerLeg.L', 0.5); set('LowerLeg.R', 0.2); }
  } else if (m.act === 'punch') {
    const k = c01(m.actT / 0.12), back = 1 - k;
    if (m.punchN === 0) { set('UpperArm.R', -1.55 * k, -0.3, 0.3); set('LowerArm.R', -0.3 * back); set('UpperArm.L', 0.3, 0, -0.9); set('Spine2', 0.1, -0.35 * k); }
    else if (m.punchN === 1) { set('UpperArm.L', -1.55 * k, 0.3, -0.3); set('LowerArm.L', -0.3 * back); set('UpperArm.R', 0.3, 0, 0.9); set('Spine2', 0.1, 0.35 * k); }
    else { set('UpperLeg.R', -1.6 * k); set('UpperLeg.L', 0.2); set('Spine2', -0.3 * k); set('UpperArm.L', -0.5, 0, -1.2); set('UpperArm.R', 0.3, 0, 1.2); }
  } else if (m.act === 'throw') {
    const k = c01(m.actT / 0.3);
    set('UpperArm.L', -2.6 + 1.8 * k, 0, -0.3); set('UpperArm.R', -2.6 + 1.8 * k, 0, 0.3); set('Spine2', 0.3 * k);
  } else if (m.act === 'crouch' || (m.act === 'slide' && m.slideCrouch)) {
    lift = -36; set('UpperLeg.L', -1.0); set('UpperLeg.R', -1.0); set('LowerLeg.L', 1.6); set('LowerLeg.R', 1.6); set('Spine2', 0.35); set('UpperArm.L', -0.5, 0, -0.6); set('UpperArm.R', -0.5, 0, 0.6);
  } else if (m.act === 'slide') { rx = 1.4; lift = -50; set('UpperArm.L', -2.9, 0, -0.2); set('UpperArm.R', -2.9, 0, 0.2); }
  else if (m.act === 'poundland') { lift = -40 * (1 - c01(m.actT / 0.35)); set('UpperLeg.L', -1.0); set('UpperLeg.R', -1.0); set('LowerLeg.L', 1.6); set('LowerLeg.R', 1.6); set('UpperArm.L', 0.2, 0, -1.4); set('UpperArm.R', 0.2, 0, 1.4); }
  else if (m.act === 'hurt') { rx = -0.35; set('UpperArm.L', -1.0, 0, -1.2); set('UpperArm.R', -1.0, 0, 1.2); }
  else if (m.skid > 0) { set('Spine2', -0.35); set('UpperLeg.L', -0.6); set('UpperLeg.R', -0.2); set('LowerLeg.L', 0.5); set('UpperArm.L', -0.5, 0, -0.4); set('UpperArm.R', -0.5, 0, 0.4); }
  else if (m.speed > 30) {
    const s = Math.sin(ph * TAU), c = Math.cos(ph * TAU), amp = 0.35 + 0.6 * sp;
    set('UpperLeg.L', -s * amp); set('UpperLeg.R', s * amp);
    set('LowerLeg.L', Math.max(0, c) * 1.1 * amp); set('LowerLeg.R', Math.max(0, -c) * 1.1 * amp);
    set('Foot.L', -0.2 * s * amp); set('Foot.R', 0.2 * s * amp);
    set('UpperArm.L', s * amp * 0.9, 0, -0.85); set('UpperArm.R', -s * amp * 0.9, 0, 0.85);
    set('LowerArm.L', -0.9 * sp - 0.2); set('LowerArm.R', -0.9 * sp - 0.2);
    set('Spine2', 0.12 + 0.24 * sp, s * 0.12 * sp); set('Head', -0.12 * sp);
    lift = Math.abs(c) * 9 * sp;
  } else {
    const b = Math.sin(t * 2.4);
    set('Spine2', b * 0.03); set('Head', b * 0.04, Math.sin(t * 0.7) * 0.25);
    set('UpperArm.L', 0, 0, -0.78 - b * 0.03); set('UpperArm.R', 0, 0, 0.78 + b * 0.03);
  }
  /* carrying: both arms up under it, whatever the legs are doing */
  if (m.held && m.act !== 'throw') { set('UpperArm.L', -2.8, 0, -0.35); set('UpperArm.R', -2.8, 0, 0.35); set('LowerArm.L', -0.3); set('LowerArm.R', -0.3); }
  if (r.cheer) {
    const k = t - r.cheer;
    set('UpperArm.L', -2.9, 0, -0.35); set('UpperArm.R', -2.9, 0, 0.35); set('LowerArm.L', -0.3); set('LowerArm.R', -0.3);
    set('UpperLeg.L', -0.15); set('UpperLeg.R', 0.15); set('Head', -0.25);
    lift = Math.max(0, Math.sin(Math.min(k, 0.6) / 0.6 * Math.PI)) * 60; rx = 0; rz = 0;
  }
  /* coming in from the sky, spinning down as the game brings him in */
  if (m.spinIn && !m.ground) ry = m.airT * 14;
  if (m.ground) m.spinIn = false;
  if (r.realM) animateReal(r, t, dt);
  M.rig.position.y = M.y0 + lift;
  M.rig.rotation.set(rx, ry, rz);
  const k = 1 - Math.exp(-dt * 18);
  for (const name in M.by) {
    const want = A[name] || [0, 0, 0], cur = M.by[name].userData.cur || [0, 0, 0];
    const nx = cur[0] + (want[0] - cur[0]) * k, ny = cur[1] + (want[1] - cur[1]) * k, nz = cur[2] + (want[2] - cur[2]) * k;
    M.by[name].userData.cur = [nx, ny, nz];
    pose(M, name, nx, ny, nz);
  }
}

/* ══ THE CAMERA ════════════════════════════════════════════════
   Lakitu's swoop down over the course at the start; then behind Mario,
   following with a little lag, coming round behind him by itself as he
   runs unless you have turned it yourself lately, and never under the
   ground. */
function camera(r, t, dt) {
  const c = r.camR, m = r.m, cam = r.cam;
  if (r.keys.has('KeyQ')) { c.yaw += 2.4 * dt; c.manual = t; }
  if (r.keys.has('KeyE')) { c.yaw -= 2.4 * dt; c.manual = t; }
  if (r.phase === 'play' && m.speed > 200 && t - c.manual > 1.2 && !r.cheer && m.act !== 'grabbed') {
    const behind = m.yaw + Math.PI, diff = wrap(behind - c.yaw);
    c.yaw = wrap(c.yaw + diff * Math.min(1, dt * 1.1 * c01(m.speed / RUN)));
  }
  const want = m.spawned ? _v.set(m.p.x, m.p.y + 140, m.p.z) : _v.copy(r.spawn).setY(r.spawn.y + 140);
  c.tgt.lerp(want, 1 - Math.exp(-dt * (m.ground ? 9 : 5)));
  const hd = Math.cos(c.pitch) * c.dist;
  let x = c.tgt.x + Math.sin(c.yaw) * hd, y = c.tgt.y + Math.sin(c.pitch) * c.dist + 120, z = c.tgt.z + Math.cos(c.yaw) * hd;
  /* never under the ground, nor behind a hill between him and you */
  for (let i = 1; i <= 6; i++) {
    const k = i / 6, px = lerp(c.tgt.x, x, k), pz = lerp(c.tgt.z, z, k);
    const f = r.col.floor(px, 30000, pz);
    if (f) { const need = f.h + 120 - lerp(c.tgt.y, y, k); if (need > 0) y += need / k * 0.5; }
  }
  /* and never through a wall: if the course is in the way, the camera comes in to this side of it (Lakitu does) */
  if (r.col.ray) {
    let hit = r.col.ray(c.tgt, _cam.set(x, y, z));
    /* hemmed in behind: up and over him instead, looking down, the way Lakitu rises over a wall */
    if (hit < 0.6) {
      for (const up of [500, 1000]) {
        const h2 = r.col.ray(c.tgt, _cam.set(x, y + up, z));
        if (h2 > hit + 0.15) { y += up * Math.min(1, (h2 - hit) * 2); hit = r.col.ray(c.tgt, _cam.set(x, y, z)); break; }
      }
    }
    const want = hit < 1 ? Math.max(0.3, hit - 0.06) : 1;
    c.pull = c.pull == null ? want : want < c.pull ? want : c.pull + (want - c.pull) * Math.min(1, dt * 3);
    x = lerp(c.tgt.x, x, c.pull); y = lerp(c.tgt.y, y, c.pull); z = lerp(c.tgt.z, z, c.pull);
  }
  /* Lakitu bringing the camera down onto him */
  if (r.flyT != null && t - r.flyT < 4.6) {
    const k = smooth(c01((t - r.flyT) / 4.4));
    const a = c.yaw + (1 - k) * 2.6, dd = lerp(9000, hd, k);
    x = lerp(c.tgt.x + Math.sin(a) * dd, x, k); z = lerp(c.tgt.z + Math.cos(a) * dd, z, k); y = lerp(c.tgt.y + 5200, y, k);
    if (k > 0.55 && !m.spawned) m.spawned = true;
  }
  if (r.shake > 0) { const k = r.shake * 60; x += rnd(-k, k); y += rnd(-k, k); z += rnd(-k, k); r.shake = Math.max(0, r.shake - dt); }
  cam.position.set(x, y, z);
  cam.lookAt(c.tgt.x, c.tgt.y, c.tgt.z);
  if (r.irisFollow) { _v.copy(r.m.p).setY(r.m.p.y + 90).project(cam); r.irisAt = { x: (_v.x * 0.5 + 0.5) * r.W, y: (0.5 - _v.y * 0.5) * r.H }; }
}

/* ══ LITTLE THINGS ═════════════════════════════════════════════ */
function puff(r, p, n, size) {
  const P = pics();
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: P.ball, transparent: true, depthWrite: false, opacity: 0, color: 0xf3ede2 }));
    const a = rnd(0, TAU);
    s.position.set(p.x + Math.cos(a) * size * 0.5, p.y + rnd(10, 40), p.z + Math.sin(a) * size * 0.5);
    s.userData = { b: now(), l: rnd(0.35, 0.55), s: size * rnd(0.8, 1.3), vx: Math.cos(a) * size * 1.5, vz: Math.sin(a) * size * 1.5, y0: s.position.y };
    r.scene.add(s); r.sprites.push({ g: s });
  }
}
function spark(r, p, spread) {
  const P = pics();
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: P.glint, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0 }));
  s.position.set(p.x + rnd(-1, 1) * spread, p.y + rnd(-1, 1) * spread, p.z + rnd(-1, 1) * spread);
  s.userData = { b: now(), l: rnd(0.4, 0.7), s: rnd(60, 120), glint: true };
  r.scene.add(s); r.sprites.push({ g: s });
}
function stepSprites(r, t, dt) {
  const n = now();
  r.sprites = r.sprites.filter(o => {
    if (!o.g) return true;                                         /* the 2D ones are the canvas's */
    const s = o.g, u = s.userData, k = (n - u.b) / u.l;
    if (k >= 1) { r.scene.remove(s); s.material.dispose(); return false; }
    if (u.glint) { const w = Math.sin(Math.PI * k); s.scale.setScalar(u.s * (0.2 + 0.8 * w)); s.material.opacity = w; s.material.rotation = k * 2; }
    else {
      s.scale.setScalar(u.s * (0.5 + 0.7 * easeOut(k)));
      s.material.opacity = 0.85 * (1 - k);
      s.position.x += u.vx * dt; s.position.z += u.vz * dt; s.position.y = u.y0 + 30 * k;
    }
    return true;
  });
}
/* twinkles on the flat canvas (the star's own light, over the tavern) */
function twinkles(f, r, t) {
  f.globalCompositeOperation = 'lighter';
  r.sprites = r.sprites.filter(o => {
    if (o.g) return true;
    const k = (t - o.b) / o.l;
    if (k >= 1 || k < 0) return k < 0;
    const w = Math.sin(Math.PI * k), s = o.s * (0.3 + w);
    const g = f.createRadialGradient(o.x, o.y, 0, o.x, o.y, s);
    g.addColorStop(0, 'rgba(255,252,220,' + w.toFixed(2) + ')'); g.addColorStop(1, 'rgba(255,220,120,0)');
    f.fillStyle = g; f.fillRect(o.x - s, o.y - s, s * 2, s * 2);
    f.fillStyle = 'rgba(255,250,230,' + (w * 0.9).toFixed(2) + ')';
    f.fillRect(o.x - s * 1.6, o.y - 0.7, s * 3.2, 1.4); f.fillRect(o.x - 0.7, o.y - s * 1.6, 1.4, s * 3.2);
    return true;
  });
  f.globalCompositeOperation = 'source-over';
}
/* the light off a Power Star: soft rays turning slowly behind it */
function rays(f, x, y, rad, t, a) {
  f.save(); f.translate(x, y); f.rotate(t * 0.6);
  f.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 12; i++) {
    f.rotate(TAU / 12);
    const g = f.createLinearGradient(0, 0, rad, 0);
    g.addColorStop(0, 'rgba(255,240,170,' + (0.5 * a).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,210,90,0)');
    f.fillStyle = g; f.beginPath(); f.moveTo(0, 0); f.lineTo(rad, -rad * 0.09); f.lineTo(rad, rad * 0.09); f.closePath(); f.fill();
  }
  const g = f.createRadialGradient(0, 0, 0, 0, 0, rad * 0.5);
  g.addColorStop(0, 'rgba(255,248,210,' + (0.7 * a).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,220,120,0)');
  f.fillStyle = g; f.beginPath(); f.arc(0, 0, rad * 0.5, 0, TAU); f.fill();
  f.restore();
}
/* everything but a five-pointed star of radius rad at (x, y), filled with `col` */
function starHole(f, x, y, rad, spin, col) {
  f.fillStyle = col;
  f.beginPath();
  f.rect(0, 0, f.canvas.width, f.canvas.height);
  for (let i = 0; i <= 10; i++) {
    const a = spin - Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? rad * 0.46 : rad;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i === 0) f.moveTo(px, py); else f.lineTo(px, py);
  }
  f.closePath();
  f.fill('evenodd');
}
function title(r, on) {
  const t = r.el.querySelector('.bs-title');
  if (on) {
    const name = t.querySelector('.bs-name'), sub = t.querySelector('.bs-sub');
    name.innerHTML = ''; sub.textContent = '★ 1   BIG BOB-OMB ON THE SUMMIT';
    'BOB-OMB BATTLEFIELD'.split('').forEach((ch, i) => {
      const s = doc.createElement('span'); s.textContent = ch === ' ' ? ' ' : ch; s.style.animationDelay = (0.2 + i * 0.045) + 's';
      name.appendChild(s);
    });
    t.classList.add('on');
  } else t.classList.remove('on');
}
function note(r, text) { const n = r.el.querySelector('.bs-got'); n.textContent = text; n.classList.add('on', 'small'); }

/* ══ THE STAR ON THE SUMMIT ═══════════════════════════════════ */
function got(r, t, name) {
  r.phase = 'got'; r.cheer = t; r.m.v = 0; r.m.speed = 0; r.m.held = null;
  r.game.stars++;
  const g = r.el.querySelector('.bs-got');
  g.innerHTML = 'YOU GOT A STAR!' + (name ? '<small>' + name + '</small>' : '');
  g.classList.add('on');
  r.el.classList.remove('play');
  setTimeout(() => { if (run === r) leave(); }, 3000);
}

/* ══ KEYS: all of them are the course's while it is up ═════════ */
function onKey(e) {
  const r = run;
  if (!r) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (e.type === 'keydown') {
    if (e.code === 'Escape') { leave(); return; }
    if (!e.repeat) r.pressed.add(e.code);
    r.keys.add(e.code);
  } else r.keys.delete(e.code);
}
root.addEventListener('keydown', onKey, true);
root.addEventListener('keyup', onKey, true);
root.addEventListener('blur', () => { if (run) run.keys.clear(); });

/* ══ COMING HOME ═══════════════════════════════════════════════ */
function leave() {
  const r = run;
  if (!r || r.phase === 'out') return;
  if (!r.ready || r.phase === 'grab' || r.phase === 'fly' || r.phase === 'white') { r.phase = 'out'; r.p0 = (now() - r.t0) - 0.95; r.irisAt = null; return; }
  r.phase = 'out'; r.p0 = (now() - r.t0) / (root.__bobSlow || 1); r.irisFollow = true;
  title(r, false); r.el.classList.remove('play');
  r.keys.clear();
}
function finish() {
  const r = run;
  run = null;
  root.removeEventListener('pointermove', r.onMove); root.removeEventListener('pointerup', r.onUp);
  r.ren.dispose();
  r.el.remove();
}

root.BobStar = { enter, leave, get on() { return !!run; }, get _run() { return run; },      /* _run, _face: for the tests */
                 _face: () => { if (run) for (const i of run.castInsts || []) castFace(i, run.cam); } };

})(window, document);
