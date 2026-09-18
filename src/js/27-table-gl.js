/* ══════════════════════════════════════════════════════════════
   27-table-gl.js — THE THINGS ON THE TABLE THAT ARE REAL OBJECTS.

   Same trick gl.js uses for the counters, and the dice after them:
   a WebGL canvas over the table whose camera MIRRORS the page's CSS
   perspective exactly (perspective:2400px, perspective-origin
   50% 42%). A DOM element on the wood is measured every frame and
   the model is drawn at that rect — so the object pans, zooms and
   tilts with the table without knowing anything about the table.

   The chest is grumkata's AnimatedChest, baked by tools/bake_chest.py.
   Its lid hinges on the asset's own Bone using the OpenClose clip's
   own extreme keyframe. It is not a drawing of a chest.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

if (typeof THREE === 'undefined' || typeof CHEST === 'undefined') return;

/* THE LENS IS NOT A CONSTANT ANY MORE. It was 2400 for as long as this
   layer only ever looked at a table, and #vp's `perspective` said the same
   thing in CSS. Sitting down changes it: see the note on lens() below. The
   two must never disagree by so much as a pixel, so this is written from
   one place — 23-table3d.js sets the CSS and calls lens() with the same
   number in the same breath. */
let PERSP = 2400;
const ORIGIN = 0.42;
const tilt = () => (root.__tilt ? root.__tilt() : 22 * Math.PI / 180);
/* which way your head is turned — not to be confused with YAW below, which
   is the fixed quarter-turn a standing model needs to face the camera */
const headYaw = () => (root.__yaw ? root.__yaw() : 0);

/* The camera looks DOWN on this table, so a chest standing true on the board
   normal is seen from directly above — geometrically right and completely
   unreadable as a chest. That was the argument for LEAN, a further 33 degrees
   toward the viewer; it is gone, because the table is a real model now and
   anything standing at a different angle from the wood reads as sunk into it.
   The camera's own 22 degrees off vertical does that job honestly. */
/* the chest is turned off square, so you see its long side and one end rather than
   staring down the narrow end of it */
const YAW = -0.62;

/* ══ WHY THIS FILE STOPPED BEING FLAT ══════════════════════════
   grumkata: "they dont feel 3d, tokens dont look 3d, shadows and textures
   look flat".

   Three things were missing, and all three are about LIGHT, not geometry.

   1. NOTHING CAST A SHADOW. Every shadow on this table was a CSS
      radial-gradient blob pinned under the middle of an anchor: the same
      soft oval whatever the object was, at the same size whatever the
      zoom, and never falling ACROSS anything. A shadow is how you know
      two things are touching, and it is the whole of the difference
      between an object on a table and a picture of one. There is a real
      shadow map now, and the shadows land on the wood, on the combat
      sheet, and on each other.

   2. NOTHING WAS REFLECTING ANYTHING. Phong with three directional lights
      gives every surface exactly one highlight from one direction; a real
      room puts light on a thing from every direction at once, and the
      shape of THAT is what reads as material. The renderer builds a small
      environment out of the room this table is in — warm lamp above,
      cool bounce from the floor, dark walls — and every material samples
      it. Wood gets a broad soft sheen, iron gets a sharp one, painted
      pieces get the plastic-y band that painted wood actually has.

   3. THE OUTPUT WAS UNGRADED. Linear colour written straight to sRGB
      clips every highlight to a flat white plateau, which is exactly what
      "textures look flat" looks like. ACES filmic tone mapping rolls the
      top end off instead. */
/* BLAZON IN 3D. Every material in this room goes through here: banded
   light, the house ramp, and a gilt rim on anything with a fragment
   normal (09-blazon3d.js). One line per material, so nothing about how
   the room is built or lit had to change. */
const B3 = (m, o) => (root.Blazon3D ? root.Blazon3D.cel(m, o) : m);

let cv, renderer, scene, camera, W = 0, H = 0, OX = 0, OY = 0;
let shadowLight = null, catcher = null;
let chest = null, lidGroup = null, QS = null, QO = null;
let lidU = 0, lidWant = 0;
let bin = null;

function build() {
  cv = doc.createElement('canvas');
  cv.id = 'tgl';
  Object.assign(cv.style, { position:'fixed', inset:'0', zIndex:870, pointerEvents:'none' });
  doc.body.appendChild(cv);

  renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true });
  /* shader links stay off the frame the player is watching (09-blazon3d.js) */
  if (root.Blazon3D && root.Blazon3D.tune) root.Blazon3D.tune(renderer);
  dress(renderer);
  scene = new THREE.Scene();
  scene.environment = envFor(renderer);
  shadowLight = light(scene);

  /* ── THE SHADOW, AND WHAT CATCHES IT ──────────────────────
     This layer is two-and-a-half D: everything in it sits at z = 0 and is
     merely TILTED to match the table's plane, because each object's depth
     comes from the screen rect of the DOM anchor that stands for it. So
     the surface everything is standing on is not a tilted plane in here —
     it is the plane z = 0 itself, facing the camera.

     That is why the catcher is screen-parallel. It is a ShadowMaterial, so
     it paints NOTHING except the shadows that fall on it: the wood shows
     through, the combat sheet shows through, and a chest standing on the
     sheet darkens the sheet. Which is the point. A shadow that stops at
     the edge of the thing casting it is a sticker. */
  catcher = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
    new THREE.ShadowMaterial({ opacity: 0.42 }));
  catcher.position.z = -2;
  catcher.receiveShadow = true;
  scene.add(catcher);

  const body = new THREE.Group();
  body.add(mesh(CHEST.base), mesh(CHEST.hinge));
  lidGroup = new THREE.Group();
  lidGroup.position.fromArray(CHEST.pivot.t);
  lidGroup.scale.fromArray(CHEST.pivot.s);
  lidGroup.add(mesh(CHEST.lid));
  body.add(lidGroup);
  QS = new THREE.Quaternion().fromArray(CHEST.shut);
  QO = new THREE.Quaternion().fromArray(CHEST.open);
  lidGroup.quaternion.copy(QS);
  /* ON the wood, not half inside it. normalise() centres a model on its own
     middle by default, and stand() plants that origin on the table plane —
     so the chest and the bin were buried to the waist, which reads exactly
     like furniture that is not sitting on anything. A thing that STANDS on
     the board wants its feet at its origin, the same as every counter. */
  chest = normalise(body, false, true);
  casts(chest);
  scene.add(chest);

  /* ── THE BIN IS A BASKET ──────────────────────────────────
     It was the KayKit container: a shallow square tray in pale cream
     plastic, which on this table read as a takeaway lid somebody had left
     on the wood, and read as nothing whatever like a bin. A woven basket
     says what it is from across the room, needs no label, and comes out of
     the same WoodStuff pack the table does — so it belongs to the room
     instead of visiting from another one. */
  const bb = new THREE.Group();
  /* grumkata asked for a different one. An OPEN BARREL rather than a
     basket: staves and iron bands give it a hard silhouette from the near
     overhead angle this camera sits at, where a woven basket flattens into
     a ring, and the open top says "put things in me" without a label.
     Still the WoodStuff pack, so it is the same timber as the table. */
  const BINS = ['Barrel_A_Open', 'Barrel_B_Open', 'Basket_B', 'Basket_E'];
  let picked = null;
  if (typeof WOOD !== 'undefined') picked = BINS.find(n => WOOD[n]);
  if (picked) {
    bb.add(mesh(WOOD[picked].prims, WOOD_TEX, DRESS.basket));
  } else if (typeof BIN3D !== 'undefined') {
    bb.add(mesh(BIN3D.prims, BIN3D_TEX, DRESS.bin));
  }
  if (bb.children.length) {
    bin = casts(normalise(bb, false, true));   /* feet on the wood */
    scene.add(bin);
  }

  buildTable();
  sizeCam();
  root.addEventListener('resize', sizeCam);
  requestAnimationFrame(frame);
}

/* ══ THE TABLE ITSELF ══════════════════════════════════════════
   grumkata: "find a good looking circular table and replace the current table
   with that". Table_Round_A out of the WoodStuff pack — the calmest of the
   five round tops, which matters because everything else in this app has to
   sit on it and be read against it.

   IT IS DRAWN INTO ITS OWN CANVAS, and that canvas is INSIDE #vp, before
   #tbl. The main GL layer is z-index 870, above the props at 860 — perfect
   for a chest standing on the wood and fatal for the wood itself, which would
   have been painted over every piece on the table. Under-canvas, over-canvas,
   props in between.

   Where it goes is MEASURED, not calculated. Two markers sit in the plane at
   the ends of its horizontal diameter; their screen rects give the centre and
   the true on-screen width at that depth, and the model is put there at that
   size. Working it out from the transform instead means re-deriving the
   perspective divide by hand, which this project has already got wrong twice. */
let uCv, uRen, uScene, tableObj = null, uLight = null, uCatch = null;
function buildTable() {
  uCv = doc.getElementById('tglu');
  if (!uCv || typeof WOOD === 'undefined' || !WOOD.Table_Round_A) return;
  uRen = new THREE.WebGLRenderer({ canvas: uCv, alpha: true, antialias: true });
  if (root.Blazon3D && root.Blazon3D.tune) root.Blazon3D.tune(uRen);
  dress(uRen);
  uScene = new THREE.Scene();
  uScene.add(new THREE.AmbientLight(0xffe6c8, 0.10));
  uScene.environment = envFor(uRen);
  uLight = light(uScene);
  /* ── AND NO SHADOW CATCHER IN HERE ────────────────────────
     There was one, briefly, on the reasoning that the table should throw a
     shadow onto the floor. It cannot, and the reason is worth writing down:
     this layer is 2.5D. Everything in it sits at z = 0 and is only TILTED,
     so a screen-parallel catcher two units behind the table is not a floor
     four feet under it — it is a sheet of paper pressed against its back.
     The table promptly shadowed it across half its own width and drew a
     hard horizontal line down the middle of the wood.

     The floor is a CSS layer at translateZ(-520px) (#tblu in
     table-body.html) and the dark under the table belongs to it. In here
     the table only lights itself.

     The over-canvas catcher IS legitimate, and for the same reason in
     reverse: the things standing there are small, so a plane just behind
     their feet is exactly the surface they are standing on. */
  const body = new THREE.Group();
  /* THE WOOD TAKES THE BANDING GENTLY. It is the biggest, smoothest,
     nearest surface in the app and the only one carrying a soft shadow
     across it — at the room's own settings the steps turned that shadow
     into a torn silhouette. More bands, softer mix: the wood is stylised
     without the shadow on it becoming a shape. */
  body.add(mesh(WOOD.Table_Round_A.prims, WOOD_TEX, DRESS.timber,
                { room: 'tavern', steps: 9, tint: 0.20, hard: 0.26, rim: 0.10 }));
  /* TOP SURFACE AT THE ORIGIN, not the model's middle: the plane the pieces
     live on IS the table top, so that is the part that has to line up. */
  /* it casts (onto the pieces layer it never reaches, harmlessly) but above
     all it RECEIVES — a chest standing on the wood darkens the wood */
  tableObj = casts(normalise(body, true));
  uScene.add(tableObj);
  buildRoom();
}

/* ══ THE ROOM ══════════════════════════════════════════════════
   Everything above this line is two-and-a-half D: flat things at z = 0,
   tilted to match the table, positioned by measuring a DOM rect. The room
   is the first thing in here with real depth, and it works because it does
   not try to have a camera of its own.

   THE ROOM IS BOLTED TO THE TABLE. It is one group carrying exactly the
   table's rotation, position and scale, and everything inside it is laid
   out in METRES around a table top at y = 0 — floor three quarters of a
   metre below, ceiling two and a half above. So the room is not something
   the camera flies around; it is furniture attached to the wood. Tilt the
   table up and the room tilts with it, which from the viewer's side is
   indistinguishable from standing up and looking across the room, and
   costs nothing in matched projections — the thing this file has already
   paid for twice.

   Which also means the room can only be shown when the table is small on
   screen. A metre is `dia / TABLE_M` pixels, so at a working zoom the far
   wall is thousands of pixels behind the camera. That is not a limitation
   to design around; it IS the design — you see the room when you have
   pulled back far enough to be sitting in it. */
let roomGroup = null, overGroup = null, roomBuilt = false, seatedNow = false;
/* the wood's real size is stated once, by 23-table3d.js, and read here —
   two numbers that must agree and can drift apart is how the camera ended
   up with its chin on the table */
const TABLE_M = (root.Table3D && root.Table3D.TABLE_M) || 2.2;
const FLOOR_Y = -0.75;    /* table top to floor, in metres */
const WALL_H = 3.12;      /* the village kit's own wall height */
/* ── HOW BIG THE ROOM CAN BE AND STILL BE SEEN ────────────────
   It was 10m by 8m, and grumkata's "it goes table floor tavern" was the
   direct result: the table sits in the middle, so four metres of bare
   floorboards ran between it and the far wall with nothing on them — a
   band of empty floor across the middle of every shot.

   Worse, at this lens only about two metres either side of the table is
   ever IN frame, so a bar built down a wall five metres out was invisible
   no matter how well it was made. The room has to be the size of the view,
   not the size of a real tavern. Six by six: the hearth is two and a half
   metres away, close enough to fill the space behind the wood, and the
   side walls are near enough to be seen. */
const RX = 3, RZ = 3;

/* ══ ONE DRAW CALL PER MATERIAL, NOT PER PROP ══════════════════
   grumkata: "MAJOR Lag like i can barley look around type lag".

   Mine, and the cause is structural rather than a slow shader. Every
   `put()` used to build its own THREE.Group with its own Mesh and its own
   MeshStandardMaterial — so a room of sixty props was sixty draw calls
   and sixty material instances, each compiling its own shader against
   eight lights, every single frame. The GPU was not the problem; the
   number of times it was asked to start over was.

   The room is furniture. It never moves relative to itself. So it is
   COLLECTED first and MERGED second: every prim is transformed into room
   space at build time and concatenated into one geometry per texture, and
   the whole tavern goes out in about five draws instead of sixty.

   That is the difference between "barely look around" and moving. */
let hearth = null, fireCore = null, fireBath = null, fireSpill = null;
let chandelier = null, flamePool = null;

/* ══ A FLAME BELONGS TO THE THING THAT HOLDS IT ════════════════
   The chandelier taught this once already: its candle flames were nailed
   to the coordinates the chandelier happened to be at, so deleting it in
   the editor would have left six flames burning in clear air. The candles
   and candelabras had exactly the same fault waiting — grumkata moved the
   dresser candelabra down sixty centimetres and its flame would have
   stayed where the old one was.

   So the flames are found from the plan, every time the plan is built.
   A pool of sprites is made once (each one costs a canvas, a texture and
   a material, so rebuilding them per edit would leak the lot); laying the
   room out just places the ones it needs and hides the rest. */
const FLAME_TOP = {};          /* model -> how far up its own flame sits */
function topOf(p, m) {
  const k = p + '|' + m;
  if (FLAME_TOP[k] != null) return FLAME_TOP[k];
  const lib = p === 'T' ? (typeof TAVERN !== 'undefined' ? TAVERN : null)
                        : (typeof ROOM   !== 'undefined' ? ROOM   : null);
  const mm = lib && lib[m];
  let hi = 0;
  if (mm) for (const pr of mm.prims)
    for (let i = 1; i < pr.p.length; i += 3) if (pr.p[i] > hi) hi = pr.p[i];
  return (FLAME_TOP[k] = hi);
}
/* the models that are candles, and how many flames each one carries */
const WICKS = { Candle: 1, Candelabra: 3 };
function lightCandles(plan) {
  if (!flamePool) return;
  let n = 0;
  for (const row of plan) {
    const w = row.m && WICKS[row.m];
    if (!w) continue;
    const sc = row.sx != null ? row.sy : (row.s == null ? 1 : row.s);
    const y = FLOOR_Y + (row.y || 0) + topOf(row.p, row.m) * sc;
    /* one flame in the middle is enough for a candle; a candelabra reads
       better with its arms lit, spread across its own width */
    const th = (row.r || 0) * Math.PI / 180, C = Math.cos(th), S = Math.sin(th);
    for (let i = 0; i < w && n < flamePool.length; i++) {
      const off = w === 1 ? 0 : (i - (w - 1) / 2) * 0.26 * sc;
      const f = flamePool[n++];
      f.visible = true;
      f.position.set(row.x + off * C, y, row.z - off * S);
    }
  }
  for (let i = n; i < flamePool.length; i++) flamePool[i].visible = false;
}
/* the flames hang 1.03 below the model's own origin, which is where its
   candle cups are; everything else about them is the plan's business */
function aimChandelier(plan) {
  if (!chandelier) return;
  const row = plan && plan.find(r => r.m === 'Chandelier');
  chandelier.visible = !!row;
  if (row) chandelier.position.set(row.x, FLOOR_Y + (row.y || 0) - 1.03, row.z);
}
let candleLights = [], moteField = null;
const emberMats = [];
const lit = [];   /* every light whose `distance` is really written in metres */
/* A light's reach is written in metres here and pushed to world units in
   placeRoom(), because `distance` is read in world space and does not
   inherit the room group's scale the way a position does. */
function lamp(L, metres) { L.userData.m = metres; lit.push(L); return L; }

const BATCH = [];
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const _v3 = new THREE.Vector3(), _n3 = new THREE.Matrix3();

/* Collect a model. Nothing is built until flushRoom(). */
/* ══ WHERE A MODEL THINKS ITS MIDDLE IS ════════════════════════
   Two models in these packs are not built about their own centre, and
   both of them look broken because of it.

   The chair's geometry runs from -0.07 to +0.81 along its own x, so a
   chair placed at a spot stands 37cm to the side of that spot and turns
   about its own arm — which is why every chair in the old layout was
   inside the table it was supposed to be pulled up to, and why a player's
   chair sat a third of a metre off from their face and their banner.
   The door leaf is worse: it hangs entirely to one side of its origin,
   so a door placed in the middle of a doorway stands half a metre into
   the wall beside it.

   Fixed once, here, rather than by writing a correction into every row
   that uses them — a row says where a thing stands, and "where it
   stands" should mean the same thing for every model in the room. */
const PIVOT = { 'T|Chair': [-0.37, 0, 0], 'R|Door_2_Round': [-0.52, 0, 0] };
const _piv = new THREE.Matrix4();
function pivot(key, mat) {
  const v = PIVOT[key];
  if (v) mat.multiply(_piv.makeTranslation(v[0], v[1], v[2]));
  return mat;
}

function put(lib, book, name, dressing, x, y, z, ry, s) {
  const m = lib && lib[name];
  if (!m) return null;
  const sc = (s == null ? 1 : s);
  const mat = new THREE.Matrix4().compose(
    _v3.set(x, y, z),
    _q.setFromEuler(_e.set(0, ry || 0, 0)),
    new THREE.Vector3(sc, sc, sc));
  const rec = { prims: m.prims, book: book, dress: dressing,
                mat: mat, key: null };
  BATCH.push(rec);
  return rec;                      /* callers may still set rec.mat themselves */
}
/* the same, with a non-uniform scale — beams and banners need it */
function putS(lib, book, name, dressing, x, y, z, ry, sx, sy, sz) {
  const r = put(lib, book, name, dressing, x, y, z, ry, 1);
  if (r) r.mat.compose(_v3.set(x, y, z),
                       _q.setFromEuler(_e.set(0, ry || 0, 0)),
                       new THREE.Vector3(sx, sy, sz));
  return r;
}

function flushRoom(target, tag) {
  target = target || roomGroup;
  /* group by what they are made of: one bucket per texture per dressing */
  const buckets = new Map();
  for (const rec of BATCH) {
    for (const pr of rec.prims) {
      const key = (pr.t || '~') + '|' + rec.dress.wood.rough + '|' + rec.dress.wood.mul[0] +
                  '|' + (rec.dress.wood.emis ? 'e' : '');
      let bk = buckets.get(key);
      if (!bk) buckets.set(key, bk = { p: [], n: [], u: [], i: [], n0: 0,
                                       t: pr.t, book: rec.book, dress: rec.dress });
      const M = rec.mat;
      _n3.setFromMatrix4(M).invert().transpose();
      const P = pr.p, N = pr.n, U = pr.u;
      const base = bk.n0;
      for (let k = 0; k < P.length; k += 3) {
        _v3.set(P[k], P[k + 1], P[k + 2]).applyMatrix4(M);
        bk.p.push(_v3.x, _v3.y, _v3.z);
        if (N) { _v3.set(N[k], N[k + 1], N[k + 2]).applyMatrix3(_n3).normalize();
                 bk.n.push(_v3.x, _v3.y, _v3.z); }
        else bk.n.push(0, 1, 0);
      }
      const count = P.length / 3;
      if (U) for (let k = 0; k < U.length; k++) bk.u.push(U[k]);
      else for (let k = 0; k < count * 2; k++) bk.u.push(0);
      if (pr.i) for (let k = 0; k < pr.i.length; k++) bk.i.push(base + pr.i[k]);
      else for (let k = 0; k < count; k++) bk.i.push(base + k);
      bk.n0 += count;
    }
  }
  BATCH.length = 0;
  buckets.forEach(bk => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(bk.p, 3));
    g.setAttribute('normal',   new THREE.Float32BufferAttribute(bk.n, 3));
    g.setAttribute('uv',       new THREE.Float32BufferAttribute(bk.u, 2));
    g.setIndex(bk.n0 > 65535 ? new THREE.Uint32BufferAttribute(bk.i, 1)
                             : new THREE.Uint16BufferAttribute(bk.i, 1));
    g.computeBoundingSphere();
    const d = bk.t ? bk.dress.wood : bk.dress.metal;
    /* ── LAMBERT, NOT STANDARD ────────────────────────────
       This is the other half of the lag. MeshStandardMaterial runs a
       full physically-based BRDF and samples the environment map for
       EVERY FRAGMENT of every wall, times the number of lights in the
       scene. The room is matte plaster and old timber lit by a fire —
       there is no glossy highlight and no reflection to see, so all of
       that arithmetic was being paid for something invisible.

       Lambert is diffuse only. On a dark interior it is very nearly the
       same picture for a fraction of the fragment cost. The table, the
       chest and the counters keep Standard, because they are close to
       the eye and their sheen is the thing that makes them read as
       objects. */
    const mesh = new THREE.Mesh(g, B3(new THREE.MeshLambertMaterial({
      map: bk.t ? tex(bk.t, bk.book) : null,
      emissive: d.emis ? new THREE.Color().setRGB(d.emis[0], d.emis[1], d.emis[2])
                       : new THREE.Color(0, 0, 0),
      color: new THREE.Color().setRGB(d.mul[0], d.mul[1], d.mul[2]) }),
      /* scenery: banded and ramped, but no rim — an outline belongs to the
         things on the table, not to the walls behind them */
      { room: 'tavern', rim: 0, steps: 6, tint: 0.30, hard: 0.5 }));
    /* nothing in the room casts or receives: it is scenery, and one
       shadow map over sixty thousand triangles was a second cost as big
       as the draw calls */
    mesh.castShadow = mesh.receiveShadow = false;
    mesh.userData[tag || 'plan'] = 1;
    target.add(mesh);
  });
}

function lightRoom() {
  /* the floor of the exposure. Hemisphere rather than ambient, because it
     varies with the surface normal — a ceiling joist and a floorboard are
     not then the same flat grey. */
  roomGroup.add(new THREE.HemisphereLight(0x1b2436, 0x120c07, 0.13));

  hearth = new THREE.Group();
  hearth.position.set(0, FLOOR_Y + 0.55, -RZ + 0.55);
  roomGroup.add(hearth);

  fireCore = lamp(new THREE.PointLight(0xff8a2e, 3.4, 5.2, 2.0), 5.2);
  fireCore.position.set(0, 0, 0.15);

  fireBath = lamp(new THREE.PointLight(0xff6f26, 1.15, 11.0, 1.35), 11.0);

  /* The spot out of the fireplace mouth is gone too — with no shadow to
     carry it was a third light doing what the core already did. Four
     lights in the room now: sky, hearth core, hearth bath, moon. */
  fireSpill = fireCore;
  hearth.add(fireCore, fireBath);

  /* candles: small reach, no shadows, and each one gets its own phase in
     tickFire — two candles guttering in step is instantly fake */
  /* ONE candle light, not four. Each one multiplies the per-fragment
     cost of every surface in the room, and three of the four were doing
     no visible work that the glow sprites were not already doing for
     free. The sprites stay — you see the flames; you do not see which
     of them is a real light. */
  candleLights = [[0, 0.42, 0]]
    .map(p => {
      const l = lamp(new THREE.PointLight(0xffb46b, 0.62, 2.9, 2.0), 2.9);
      l.position.set(p[0], p[1], p[2]);
      roomGroup.add(l);
      return l;
    });

  /* ── AND ONE LAMP THAT IS ACTUALLY A LIGHT ───────────────
     The hearth is on the far wall, so everything on the near half of the
     room was lit by the moon and the sky term alone and read as an unlit
     corner of a different scene. One warm point at the right-hand lantern,
     with a short reach so it lights that wall and nothing else — cheap,
     and it is the difference between a room and a stage with one lamp
     pointed at it. */
  /* on the dresser, where there is now a candelabra for it to come from */
  const wall = lamp(new THREE.PointLight(0xffa14e, 1.35, 4.6, 2.0), 4.6);
  wall.position.set(2.45, FLOOR_Y + 2.40, -1.24);
  roomGroup.add(wall);

  /* THE ONE COLD SOURCE, through the windows on the back wall */
  const moon = new THREE.DirectionalLight(0x5d7cb4, 0.17);
  moon.position.set(3, 4, -6);
  roomGroup.add(moon);
}

/* ── FIRE THAT DOES NOT STROBE ────────────────────────────────
   Math.random() every frame is white noise at 60Hz, which is a fault
   light, not a fire — and it changes with the frame rate. Quake solved
   this in 1996 with a string of letters sampled at a fixed 10Hz, and it
   is still the best answer: 'a' is dark, 'm' is normal, 'z' is double.
   Sampled on its own clock and smoothstepped between samples, so it is
   frame-rate independent and never steps.

   Three modulations at three rates — the licks, the logs, and the draught
   — because any one of them alone reads as a flicker bug. And the colour
   moves with the brightness (dimmer is redder), and the source itself
   shifts a couple of centimetres, because moving shadows are most of what
   sells a fire. Brightness alone looks like a loose bulb. */
const FLICK = {
  fire:     'mmnmmommommnonmmonqnmmo',
  logs:     'nmonqnmomnmomomno',
  candle:   'mmmmmaaaaammmmmaaaaaabcdefgabcdefg',
  candleB:  'mmmaaaabcdefgmmmmaaaammmaamm'
};
function flick(name, t, hz) {
  const s = FLICK[name], f = t * (hz || 10), i = Math.floor(f), k = f - i;
  const a = (s.charCodeAt(i % s.length) - 97) / 12;
  const b = (s.charCodeAt((i + 1) % s.length) - 97) / 12;
  const e = k * k * (3 - 2 * k);
  return Math.max(0, Math.min(1.6, a + (b - a) * e));
}
const HOT = new THREE.Color(0xffb066), EMB = new THREE.Color(0xff4f18);
const I_CORE = 3.4, I_BATH = 1.15, I_SPILL = 2.1;
let fseed = Math.random() * 97, fireT = 0;

function tickFire(t) {
  if (!fireCore) return;
  const fast = flick('fire', t + fseed, 10);
  const slow = flick('logs', t * 0.55 + fseed, 10);
  const swell = 0.5 + 0.5 * Math.sin(t * 0.62 + fseed);
  const n = Math.min(1, 0.55 * fast + 0.30 * slow + 0.15 * swell);
  const amp = 0.17;

  fireCore.intensity  = I_CORE  * (1 - amp + amp * 2 * n);
  fireSpill.intensity = I_SPILL * (1 - amp * 0.8 + amp * 1.6 * n);
  fireBath.intensity  = I_BATH  * (0.93 + 0.07 * n);   /* the bath moves least */
  fireCore.color.copy(EMB).lerp(HOT, 0.30 + 0.70 * n);
  fireSpill.color.copy(fireCore.color);
  fireCore.position.x = Math.sin(t * 3.1 + fseed) * 0.02;
  fireCore.position.y = 0.10 + 0.05 * n;
  fireCore.position.z = 0.15 + Math.cos(t * 2.3 + fseed * 1.7) * 0.015;

  for (let i = 0; i < candleLights.length; i++) {
    const c = flick(i % 2 ? 'candle' : 'candleB', t * (0.9 + i * 0.07) + i * 3.7, 10);
    candleLights[i].intensity = 0.62 * (0.72 + 0.42 * c) * (c < 0.12 ? 0.55 : 1);
  }
  /* the coals breathe with the flicker, between a dull red and a bright
     orange — a value, not an intensity, so it cannot run away */
  const ek = 0.40 + 0.36 * n;
  for (const m of emberMats) m.color.setRGB(1.0 * ek, 0.38 * ek, 0.13 * ek);
  if (moteField) { moteField.position.y = Math.sin(t * 0.11) * 0.06;
                   moteField.rotation.y = t * 0.008; }
  /* the hangings take the hearth's own colour and the hearth's own breath,
     so the room's cloth is lit by the room's fire */
  for (const m of clothHangings) {
    m.uniforms.t.value = t;
    m.uniforms.lightCol.value.setRGB(1.0 * (0.62 + 0.30 * n),
                                     0.66 * (0.62 + 0.30 * n),
                                     0.38 * (0.62 + 0.30 * n));
  }
}

/* ══ THE ROOM IS DATA ══════════════════════════════════════════
   It used to be a hundred lines of put() calls, which meant only I could
   change it and only by editing source. grumkata, reasonably: "give me
   the 3d model made of individual parts, then give me a way to add the
   finishing touches".

   So the tavern is a LIST now. Every piece is one row — what it is, where
   it stands, which way it faces, how big — and the builder just reads the
   list. That single change is what makes the editor possible at all: the
   panel edits rows, the room rebuilds from rows, and a layout can be
   saved, shipped, or thrown away without touching a line of code.

   `over` marks anything that hangs ABOVE the table plane. This matters
   more than it sounds: looking down at the wood the eye is ON the table's
   normal, so a chandelier, a rafter or a banner overhead sits directly
   between you and the table. That is the "board looking thing covers my
   view" — hanging banners at two and a bit metres, seen from above, are
   a plank across the screen. Everything marked `over` fades out as you
   come down over the wood and returns as you sit back. */
const TAVERN_PLAN = [
  /* ── the shell ───────────────────────────────────────────────
     A wall module is 2m wide and 3.12 tall and its slab sits from -0.31
     to +0.10 of its own row, so a wall placed at 3 has its INNER FACE at
     2.90. That is the number everything else is measured against: the
     room you can actually stand in is 5.8 by 5.8. */
  { k:'floor' },
  { k:'ceil'  },
  { p:'R', m:'Wall_Plaster_Window_Wide_Round', x:-2, y:0, z:-3, r:0 },
  /* plain plaster, because the firebox is open at the back and this is the
     wall you look at through the flames — a timber grid there reads as the
     outside of the building seen through a hole in it */
  { p:'R', m:'Wall_Plaster_Straight',          x: 0, y:0, z:-3, r:0 },
  { p:'R', m:'Wall_Plaster_Window_Wide_Round', x: 2, y:0, z:-3, r:0 },
  { p:'R', m:'Wall_Plaster_WoodGrid',   x:-2, y:0, z:3, r:180 },
  { p:'R', m:'Wall_Plaster_Door_Round', x: 0, y:0, z:3, r:180 },
  { p:'R', m:'Wall_Plaster_WoodGrid',   x: 2, y:0, z:3, r:180 },
  { p:'R', m:'Wall_Plaster_WoodGrid', x:-3, y:0, z:-2, r:90 },
  { p:'R', m:'Wall_Plaster_Straight', x:-3, y:0, z: 0, r:90 },
  { p:'R', m:'Wall_Plaster_WoodGrid', x:-3, y:0, z: 2, r:90 },
  { p:'R', m:'Wall_Plaster_WoodGrid',          x: 3, y:0, z:-2, r:-90 },
  { p:'R', m:'Wall_Plaster_Straight',          x: 3, y:0, z: 0, r:-90 },
  { p:'R', m:'Wall_Plaster_Window_Wide_Round', x: 3, y:0, z: 2, r:-90 },
  { p:'R', m:'Corner_Interior_Big', x:-3, y:0, z:-3, r:0 },
  { p:'R', m:'Corner_Interior_Big', x: 3, y:0, z:-3, r:-90 },
  { p:'R', m:'Corner_Interior_Big', x: 3, y:0, z: 3, r:180 },
  { p:'R', m:'Corner_Interior_Big', x:-3, y:0, z: 3, r:90 },

  /* A WINDOW FRAME GOES IN A WINDOW. There were three frames and four
     holes, one of the frames was screwed to a solid wall, and all three
     sat at y:1.15 — which is on top of the sill height the model already
     carries, so they stood three quarters of a metre proud of the roof.
     One frame per hole, at y:0, where the model puts itself. */
  { p:'R', m:'Window_Wide_Round1', x:-2, y:0, z:-3, r:0 },
  { p:'R', m:'Window_Wide_Round1', x: 2, y:0, z:-3, r:0 },
  { p:'R', m:'Window_Wide_Round1', x: 3, y:0, z: 2, r:-90 },
  { p:'R', m:'Door_2_Round', x:0, y:0, z:2.95, r:180 },

  /* ── the roof you sit under ──────────────────────────────────
     Roof_Log is a ten-metre beam whose geometry starts 3.85 up its own
     axis, so at y:2.92 the "rafters" were sitting at 2.90 to 3.16 — above
     a ceiling at 2.37, in the dark outside the room, drawn every frame and
     visible never. Dropped to where a rafter goes, thinned, turned to run
     ACROSS the room, and braced into the side walls the way one is. */
  { p:'R', m:'Roof_Log', x:0, y:2.18, z:-2.2, r:90, sx:0.16, sy:0.16, sz:0.6, over:1 },
  { p:'R', m:'Roof_Log', x:0, y:2.18, z: 0,   r:90, sx:0.16, sy:0.16, sz:0.6, over:1 },
  { p:'R', m:'Roof_Log', x:0, y:2.18, z: 2.2, r:90, sx:0.16, sy:0.16, sz:0.6, over:1 },
  /* a brace goes UNDER the rafter it holds up, so these share the rafters'
     depths and stand off the ends of the wall furniture rather than through it */
  { p:'R', m:'Prop_Support', x:-2.9, y:0.20, z:-2.2, r: 90, sx:1, sy:1, sz:0.5, over:1 },
  { p:'R', m:'Prop_Support', x: 2.9, y:0.20, z:-2.2, r:-90, sx:1, sy:1, sz:0.5, over:1 },
  { p:'R', m:'Prop_Support', x:-2.9, y:0.20, z: 2.2, r: 90, sx:1, sy:1, sz:0.5, over:1 },
  { p:'R', m:'Prop_Support', x: 2.9, y:0.20, z: 2.2, r:-90, sx:1, sy:1, sz:0.5, over:1 },

  /* ── the hearth, dead ahead, the only bright thing ───────────
     Set INTO the wall rather than standing in front of it. The model is
     1.78 deep and the strip of floor between the far wall and the players'
     chairs is 1.15, so a fireplace that stands proud of the wall stands in
     somebody's lap. Its back goes through a solid wall, which nobody can
     see, and what is left in the room is a chimney breast. */
  { p:'T', m:'Fireplace', x:0, y:0, z:-2.62, r:0 },
  /* Over the middle of the fire and small enough to be a pot rather than a
     bath — it stood off to one side at 0.6 scale with its rim inside the
     masonry, which is the one place a cauldron must not be. */
  { p:'T', m:'Cauldron',  x:0, y:0.02, z:-2.24, r:0, s:0.45 },
  /* THE FIREWOOD WAS TWO LOOSE STICKS lying on the hearth floor, which
     reads as litter rather than as fuel. Firewood by a hearth is a STACK:
     six split lengths crossed in pairs the way you actually pile them,
     clear of the chimney breast and against the wall. */
  { p:'T', m:'FireLog', x:-1.95, y:0.045, z:-2.70, r:90, s:1 },
  { p:'T', m:'FireLog', x:-1.95, y:0.045, z:-2.58, r:90, s:1 },
  { p:'T', m:'FireLog', x:-1.95, y:0.045, z:-2.46, r:90, s:1 },
  { p:'T', m:'FireLog', x:-2.01, y:0.125, z:-2.64, r:90, s:1 },
  { p:'T', m:'FireLog', x:-2.01, y:0.125, z:-2.52, r:90, s:1 },
  { p:'T', m:'FireLog', x:-1.97, y:0.205, z:-2.58, r:90, s:1 },
  { p:'T', m:'CandleStand', x:-1.38, y:0,    z:-2.55, r:0 },
  { p:'T', m:'Candle',      x:-1.38, y:0.61, z:-2.55, r:0 },
  { p:'T', m:'CandleStand', x: 1.45, y:0,    z:-2.62, r:0 },
  { p:'T', m:'Candle',      x: 1.45, y:0.61, z:-2.62, r:0 },

  /* ── the bar, down the left wall ─────────────────────────────
     The counter is 1.0 deep, which is the whole of the strip, so its front
     edge lands at -1.90 and the stools have to stand off the ends where
     the room is wider — a stool at the middle of the counter would be
     1.35 from the middle of the table, i.e. inside the chairs. */
  { p:'T', m:'TableLong', x:-2.40, y:0, z:-1.24, r:90 },
  { p:'T', m:'TableLong', x:-2.40, y:0, z: 1.24, r:90 },
  /* DOWN, onto the bar they belong to. A Rack is a plank on two corbels,
     and at 1.90 it hung near enough to the roof that from a chair, looking
     up, its silhouette was a seat on two legs — grumkata: "it looks like
     there is a chair in the ceiling". Brought down to just clear of the
     bottles on the counter, where it reads as the shelf behind a bar. */
  { p:'T', m:'Rack', x:-2.88, y:1.62, z:-1.05, r:90 },
  { p:'T', m:'Rack', x:-2.88, y:1.62, z: 1.05, r:90 },
  { p:'T', m:'BarStool', x:-1.62, y:0, z:-2.08, r:16 },
  { p:'T', m:'BarStool', x:-1.62, y:0, z:-1.32, r:4 },
  { p:'T', m:'BarStool', x:-1.62, y:0, z: 1.32, r:-9 },
  { p:'T', m:'BarStool', x:-1.62, y:0, z: 2.08, r:-21 },
  /* on the counter — top is 0.85 up, so everything that stands on it is y:0.85 */
  { p:'T', m:'Jug',        x:-2.30, y:0.85, z:-1.72, r:34, s:0.7 },
  { p:'T', m:'BottleLong', x:-2.62, y:0.85, z:-1.42, r:0, s:0.8 },
  { p:'T', m:'BottleLong', x:-2.60, y:0.85, z:-1.22, r:40, s:0.8 },
  { p:'T', m:'BottleShort',x:-2.63, y:0.85, z:-0.98, r:0, s:0.8 },
  { p:'T', m:'CupMetal',   x:-2.22, y:0.85, z:-0.70, r:61, s:0.65 },
  { p:'T', m:'CupMetal',   x:-2.34, y:0.85, z:-0.44, r:-30, s:0.65 },
  { p:'T', m:'Candelabra', x:-2.52, y:0.85, z: 0.05, r:0, s:0.6 },
  { p:'T', m:'Plate',      x:-2.26, y:0.85, z: 0.62, r:0, s:0.8 },
  { p:'T', m:'Cheese',     x:-2.30, y:0.88, z: 0.62, r:17, s:0.45 },
  { p:'T', m:'Bowl',       x:-2.34, y:0.85, z: 1.42, r:0, s:0.8 },
  { p:'T', m:'Apple',      x:-2.34, y:0.93, z: 1.42, r:0, s:1 },
  { p:'T', m:'Apple',      x:-2.28, y:0.92, z: 1.48, r:40, s:1 },
  { p:'T', m:'CupCeramic', x:-2.20, y:0.85, z: 1.86, r:-52, s:0.8 },

  /* ── the right side is NOT the left side ─────────────────────
     grumkata: "it still has symmetry but it's still kinda mid". A tavern
     is not laid out in pairs, so this wall gets the things a bar does not
     have: the dresser, a bench with a stool pulled up to it, a barrel
     waiting to be tapped. */
  { p:'T', m:'Pantry', x:2.62, y:0, z:-1.24, r:-90 },
  { p:'T', m:'Bench',  x:2.74, y:0, z: 0.92, r:-90, s:0.8 },
  { p:'T', m:'Stool',  x:2.12, y:0, z: 0.66, r:-64, s:0.75 },
  { p:'T', m:'CupMetal', x:2.12, y:0.42, z:0.66, r:24, s:0.65 },
  { p:'T', m:'BarrelStand', x:2.42, y:0,    z:-2.44, r:0, s:0.8 },
  { p:'T', m:'Barrel',      x:2.42, y:0.16, z:-2.44, r:0, s:0.8 },

  /* ── the near wall: the way out, and what gets dumped by it ── */
  { p:'T', m:'Bench',     x:-1.55, y:0, z: 2.72, r:180, s:0.8 },
  { p:'T', m:'Barrel',    x: 1.42, y:0, z: 2.44, r:0, s:0.8 },
  { p:'T', m:'FlourSack', x: 2.34, y:0,    z: 2.44, r:24, s:1 },
  { p:'T', m:'FlourSack', x: 2.30, y:0.20, z: 2.36, r:-38, s:1 },

  /* No rug. It was the one prop in here trying to be a feature, it is
     almost entirely hidden by the table anyway, and grumkata is right that
     a bear skin in a common room is a bit much. Bare boards. */

  /* ── light you can see ───────────────────────────────────────
     Every one of these is a thing the lighting rig is coming FROM. They
     sit at 1.5 to 1.9 above the floor, which is eye height standing and
     above the head of anyone sitting — a wall lamp at table height is a
     lamp you knock over. */
  /* NO WALL SCONCES. The Lamp model is a two-armed bracket that reads as a
     small candelabra, and hung at head-and-a-half on bare plaster, glowing,
     with its fixing plate edge-on and invisible, every one of them looked
     like a candelabra stuck to the wall in mid-air — grumkata: "get rid of
     the candelbras floating on the shelves". They are gone. Light in this
     room now always comes off something that is standing on something. */
  { p:'T', m:'Candelabra', d:'glow', x: 2.55, y:1.50, z:-1.24, r:-90, s:0.6 },
  /* NO CHANDELIER. It hung over the middle of the table and it is the one
     thing grumkata took out when he was given the layout to edit — "a
     floating chair or something above the table", which a wheel of candle
     arms seen from underneath is a fair description of. This row is his
     answer, not a guess of mine: the shipped layout is now the one he sent
     back, and the only line it differs by is this one being gone. */
];


/* ── THE PLAN YOU ARE ACTUALLY LOOKING AT ─────────────────────
   The shipped layout unless a saved one exists, which is what lets the
   editor's work survive a reload without touching the build. */
/* ── AND THE KEY MOVES WHEN THE ROOM DOES ─────────────────────
   A saved layout overrides the shipped one completely, which is what makes
   the editor worth having and also a trap: fix a prop in the source and
   anyone holding a save from before the fix never sees it, and reports the
   same fault again. The key carries the layout's generation, so shipping a
   change to the room retires the saves that predate it. */
const PLAN_KEY = 'monarchy.tavern.v3';
let planCache = null;
function roomPlan() {
  if (planCache) return planCache;
  try {
    const raw = root.localStorage && root.localStorage.getItem(PLAN_KEY);
    if (raw) { const p = JSON.parse(raw); if (Array.isArray(p) && p.length) return (planCache = p); }
  } catch (e) {}
  return (planCache = TAVERN_PLAN.map(r => Object.assign({}, r)));
}
function setPlan(rows, save) {
  planCache = rows;
  if (save !== false) {
    try { root.localStorage.setItem(PLAN_KEY, JSON.stringify(rows)); } catch (e) {}
  }
  if (roomBuilt) { layRoom(); invalidate(10); }
}
function resetPlan() {
  planCache = null;
  try { root.localStorage.removeItem(PLAN_KEY); } catch (e) {}
  if (roomBuilt) { layRoom(); invalidate(10); }
}

function buildRoom() {
  if (roomBuilt || typeof ROOM === 'undefined') return;
  roomBuilt = true;
  roomGroup = new THREE.Group();
  roomGroup.visible = true;
  uScene.add(roomGroup);
  overGroup = new THREE.Group();
  roomGroup.add(overGroup);
  layRoom();
  fire();
  lightRoom();
  seatRoot = new THREE.Group();
  roomGroup.add(seatRoot);
  syncSeats();
  houseBanner();
}

/* ══ WHOSE TABLE THIS IS ═══════════════════════════════════════
   Your own arms, hung over the hearth on the far wall — the one thing in
   the room every seat can see, which is exactly why an inn hangs its
   colours there and not behind a chair. Your seat's banner is behind
   YOUR head; this is the one you actually look at all evening.

   Same cloth as the hall's banners (13-hall3d.js) and the seats', so it
   waves in the same wind and takes the same firelight. */
function houseBanner() {
  if (!roomGroup || !root.Hall || !root.Hall.cloth || !root.Heraldry) return;
  let src = '';
  try {
    const mine = root.Shell && root.Shell.arms && root.Shell.arms();
    /* the hem is the player's own now — armsSVG takes it off the record
       when it is not overridden here, so all that has to happen is to
       stop overriding it (16-menu.js, the Banner bench) */
    const svg = mine ? root.Heraldry.armsSVG(mine, { w: 220, h: 300 }) : '';
    if (svg) src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  } catch (e) { return; }
  if (!src) return;
  const W = 0.62, H = 0.92;
  const mat = root.Hall.cloth({ transparent: true, amp: 0.04, ph: 1.7, fogK: 0,
    lightPos: new THREE.Vector3(0.05, 0.4, 1), lightCol: 0xffb066, ambCol: 0x181109 });
  let hung = null;
  waiting++;
  mat.uniforms.map.value = new THREE.TextureLoader().load(src,
    () => { if (hung) hung.visible = true; landed(); }, undefined, landed);
  hung = new THREE.Mesh(new THREE.PlaneGeometry(W, H, 8, 14), mat);
  /* ON THE CHIMNEY BREAST, NOT ON THE WALL BEHIND IT. The fireplace is
     1.78 deep and set into the far wall, so its front face stands about a
     metre proud: a banner flat on the wall hangs INSIDE the masonry. And
     low enough to be in the picture from a chair — the first one was at
     2.34 and sat above the top of the frame. */
  hung.position.set(0, FLOOR_Y + 1.44, -1.66);
  hung.visible = false;
  clothHangings.push(mat);
  roomGroup.add(hung);
}

/* Read the plan and build it. Called again whenever the plan changes,
   which is what the editor leans on. */
function layRoom() {
  const R = ROOM, RB = ROOM_TEX;
  const T = (typeof TAVERN !== 'undefined') ? TAVERN : null;
  const TB = (typeof TAVERN_TEX !== 'undefined') ? TAVERN_TEX : null;
  /* ── CLEAR WHATEVER THE LAST PLAN BUILT, ALL OF IT ────────
     The geometry was always disposed here and the MATERIAL never was,
     which is a leak with a pedal on it: flushRoom mints a fresh
     MeshLambertMaterial for every bucket — twenty or thirty of them — and
     54-room-editor.js re-lays the whole room from `oninput`, so a single
     drag through a number field runs this dozens of times. A material the
     renderer has drawn holds a reference to its compiled program, and
     WebGLRenderer only lets that reference go on dispose(), so without
     this the page accumulates them until it is closed.

     The TEXTURE is deliberately left alone. It belongs to texCache, it is
     shared by every bucket that uses it and by the next lay of the room,
     and material.dispose() does not touch it — which is the behaviour
     wanted here, not an oversight. */
  const scrap = c => {
    c.geometry && c.geometry.dispose();
    const m = c.material;
    if (m) (Array.isArray(m) ? m : [m]).forEach(x => x && x.dispose && x.dispose());
  };
  for (let i = roomGroup.children.length - 1; i >= 0; i--) {
    const c = roomGroup.children[i];
    if (c.userData.plan) { roomGroup.remove(c); scrap(c); }
  }
  for (let i = overGroup.children.length - 1; i >= 0; i--) {
    const c = overGroup.children[i];
    overGroup.remove(c); scrap(c);
  }

  const plan = roomPlan();
  const over = [];
  for (const row of plan) {
    if (row.k === 'floor') {
      /* ── ONE WOOD, AND THAT IS THE WHOLE IDEA ─────────────
         This used to scatter Floor_WoodLight among the dark boards, on
         the theory that a real floor is not all one plank. The theory is
         fine and the scale is wrong: a tile here is TWO METRES square, so
         "a light board here and there" came out as a two-by-four-metre
         patch of paler wood lying down the middle of the room, directly
         under the table. grumkata has now reported it twice as "a
         different kinda board underneath the table compared to the rest
         of the room", and he is describing exactly what is there.

         The variety that survives at this scale is the GRAIN DIRECTION,
         which the quarter turn already gives for nothing. */
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        const h = ((i * 7 + j * 13) * 2654435761) >>> 0;
        put(R, RB, 'Floor_WoodDark',
            DRESS.room, i * 2, FLOOR_Y, j * 2, (h % 2) * Math.PI / 2);
      }
      continue;
    }
    if (row.k === 'ceil') {
      /* THE ROOM NEEDS A LID. There was none, so above the wall tops was
         open black: from a seat you looked across the room and the tavern
         simply stopped at head height with void over it, which is most of
         why the far wall never read as being indoors. It is the floor
         planking turned over — nine tiles, folded into the same merged
         geometry as everything else, so it costs one more bucket and no
         extra draw. */
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        const h = ((i * 11 + j * 5) * 2654435761) >>> 0;
        /* mirrored in y, which flips the normals down AND reverses the
           winding, so a floor tile becomes a ceiling seen from under it */
        if (putS(R, RB, 'Floor_WoodDark', DRESS.room,
                 i * 2, FLOOR_Y + WALL_H, j * 2, (h % 2) * Math.PI / 2, 1, -1, 1))
          over.push(BATCH.pop());     /* it is the most overhead thing there is */
      }
      continue;
    }
    const lib  = row.p === 'T' ? T : R;
    const book = row.p === 'T' ? TB : RB;
    if (!lib) continue;
    const dress = DRESS[row.d || (row.p === 'T' ? 'tavern' : 'room')] || DRESS.room;
    const ry = (row.r || 0) * Math.PI / 180;
    const rec = row.sx != null
      ? putS(lib, book, row.m, dress, row.x, FLOOR_Y + (row.y || 0), row.z, ry,
             row.sx, row.sy, row.sz)
      : put(lib, book, row.m, dress, row.x, FLOOR_Y + (row.y || 0), row.z, ry, row.s);
    if (rec) pivot(row.p + '|' + row.m, rec.mat);
    if (rec && row.over) over.push(BATCH.pop());
  }
  /* whatever the plan says about a chandelier is where its flames go, and
     no chandelier means no flames */
  aimChandelier(plan);
  lightCandles(plan);
  flushRoom(roomGroup, 'plan');
  /* the overhead pieces are batched separately so they can be faded out
     when you are looking straight down through where they hang */
  for (const rec of over) BATCH.push(rec);
  flushRoom(overGroup, 'over');
}

/* ══ THE PEOPLE AT THE TABLE ═══════════════════════════════════
   Each seat is three things: a chair at the rim, a flat cutout of
   whoever is in it standing up out of that chair, and a banner hanging
   on the wall behind them.

   The cutout is drawn the way combatants already are — an upright plane
   textured with the picture and shaped to the picture's own proportions
   when it decodes, so a portrait stays a portrait. That is deliberate:
   the same trick that makes a counter on the wood read as a person
   should make a person across the table read as one, and there is no
   reason for this app to have two answers to the same question.

   Flat, and unapologetically so. A flat cutout lit by firelight and seen
   across a room reads as somebody sitting there; a bad 3D figure reads
   as a bad 3D figure. Cardboard is the honest choice at this budget, and
   it is what a standee at a real table is anyway.

   They face the middle of the table, always — which is where you are.  */
let seatRoot = null, seatSig = '';
/* A CHAIR GOES BEHIND THE PERSON IN IT. The eye sits at TABLE_M/2 + 0.42
   (23-table3d.js); the chair is a little further out again, so your own is
   behind your head and everyone else's is across the wood — not a ring of
   chairs standing in front of you. */
const SEAT_R = TABLE_M / 2 + 0.56;
const SEAT_CHAIR = 0.78;      /* the pack's chair is 1.2m tall; a chair is 0.94 */
/* every hanging in the tavern, so the fire can light them all */
const clothHangings = [];
function banner(seat) {
  /* the seat's own image if it has one; YOUR OWN ARMS if not — the hall
     knows what you march under (42-shell.js), and a stranger's rolled
     coat behind your chair was the app forgetting who you are. A random
     roll is the last resort, so a seat is never a blank rectangle. */
  /* YOUR arms hang at YOUR place, and nowhere else. Eight seats all
     flying the same coat is not a table of eight houses, it is one
     player's colours printed eight times — and an empty chair has no
     house to fly. Everyone else's banner arrives with their seat once
     there is somebody in it. */
  let src = seat.banner;
  if (!src && seat.__mine && root.Heraldry) {
    try {
      const mine = root.Shell && root.Shell.arms && root.Shell.arms();
      /* the hem is the player's own now — armsSVG takes it off the record
       when it is not overridden here, so all that has to happen is to
       stop overriding it (16-menu.js, the Banner bench) */
    const svg = mine ? root.Heraldry.armsSVG(mine, { w: 220, h: 300 }) : '';
      if (svg) src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    } catch (e) { src = ''; }
  }
  if (!src) return null;

  /* ── THE HALL'S OWN CLOTH, HUNG IN HERE ──────────────────────
     grumkata: the two 3D scenes should "mix well with the style". They
     did not: the hall's banners are real cloth — a travelling wave down
     the weave, gold leaf on the Or that catches the light — and the
     tavern's were flat planes in a Standard material. Same app, same
     heraldry, two answers.

     So this is the HALL's material (13-hall3d.js `cloth`), lit by the
     fire instead of by a torch: tickFire() below pushes the hearth's own
     colour into it every frame, so the banners breathe with the flames.
     A few subdivisions only — these are 46cm of cloth across the room,
     not six metres down a corridor. */
  if (root.Hall && root.Hall.cloth) {
    const W = 0.46, H = 0.68;
    const mat = root.Hall.cloth({
      transparent: true, amp: 0.035, ph: Math.random() * 6.28,
      fogK: 0, lightPos: new THREE.Vector3(0.05, 0.45, 1),
      lightCol: 0xffb066, ambCol: 0x181109
    });
    waiting++;
    let hung = null;
    mat.uniforms.map.value = new THREE.TextureLoader().load(src,
      () => { if (hung) hung.visible = true; landed(); }, undefined, landed);
    hung = new THREE.Mesh(new THREE.PlaneGeometry(W, H, 8, 14), mat);
    hung.visible = false;
    clothHangings.push(mat);
    return hung;
  }
  /* STANDARD, NOT BASIC. A Basic material ignores every light in the
     room, so a banner painted in flat heraldic colour sat there glowing
     like a sticker pasted onto a dark photograph — brighter than the
     fire it was supposed to be lit by. Cloth in a firelit room is cloth:
     it takes the light, it is rough, and the corner it hangs in is dim. */
  /* and a shade under full, because heraldry is painted on cloth in a dark
     room — at full albedo three sheets of flat colour are the brightest
     thing in the picture and the fire stops being the subject */
  const mat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, transparent: true,
                                               alphaTest: 0.02, roughness: 0.96,
                                               color: new THREE.Color(0.72, 0.70, 0.66),
                                               metalness: 0, envMapIntensity: 0.3 });
  waiting++;
  let plane = null;
  mat.map = new THREE.TextureLoader().load(src,
    t => { if (plane) plane.visible = true; landed(); },
    undefined, landed);
  mat.map.encoding = THREE.sRGBEncoding;
  /* NOTHING UNTIL THERE IS SOMETHING. An unmapped MeshStandardMaterial is
     WHITE, so between the seat being built and the heraldry decoding there
     was a blank white sheet hanging in the room — and if the decode ever
     failed it stayed there. A banner with no picture yet is not a banner. */
  const m = plane = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.68), mat);
  m.visible = false;
  return m;
}

function buildSeat(seat) {
  const g = new THREE.Group();
  const T = (typeof TAVERN !== 'undefined') ? TAVERN : null;

  if (T && T.Chair) {
    const ch = mesh(T.Chair.prims, TAVERN_TEX, DRESS.tavern);
    /* ── AND LIT THE WAY THE ROOM IS LIT ──────────────────
       This chair kept coming out cream in a room of brown oak, and no
       amount of pulling its albedo down fixed it, because the albedo was
       never the problem: the room is merged into Lambert batches and a
       seat is built one at a time in Standard, which SAMPLES THE
       ENVIRONMENT MAP. That environment is a lit room, so every seat's
       chair was carrying an extra stop and a half of ambient that the
       identical chairs at the bar were not.

       Same material as the room, so the same chair looks like the same
       chair — and one less Standard shader to compile per seat. */
    ch.traverse(o => {
      if (!o.isMesh) return;
      const was = o.material;
      o.material = B3(new THREE.MeshLambertMaterial({ map: was.map, color: was.color }),
                      { room: 'tavern', rim: 0, steps: 6, tint: 0.30, hard: 0.5 });
      was.dispose();
      o.castShadow = false; o.receiveShadow = true;
    });
    /* 1.2m tall out of the pack, which next to a 1.2m-wide table is a
       throne; and built 37cm off its own centre, which put every player's
       chair a third of a metre to the left of their face. Both fixed here
       so a seat is a person in a chair rather than three things near
       each other. */
    ch.scale.setScalar(SEAT_CHAIR);
    ch.position.set(PIVOT['T|Chair'][0] * SEAT_CHAIR, FLOOR_Y, 0.16);
    g.add(ch);
  }

  if (seat.face) {
    /* and the same for a face: a person across the table is lit by the
       same hearth as the table is, or they read as a cut-out pasted on */
    const mat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, transparent: true,
                                                 alphaTest: 0.02, roughness: 0.92,
                                                 metalness: 0, envMapIntensity: 0.3 });
    waiting++;
    const card = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.78), mat);
    card.visible = false;            /* same rule: a face with no picture is not a face */
    mat.map = new THREE.TextureLoader().load(seat.face, t => {
      card.visible = true;
      /* THE PICTURE DECIDES THE SHAPE, not the other way round — the same
         rule the counters follow. Known the moment it decodes. */
      const im = t.image, ar = im && im.width ? im.height / im.width : 1.4;
      const w = 0.56;
      card.geometry.dispose();
      card.geometry = new THREE.PlaneGeometry(w, w * ar);
      card.position.y = FLOOR_Y + 0.40 + w * ar / 2;
      landed();
    }, undefined, landed);
    mat.map.encoding = THREE.sRGBEncoding;
    card.position.set(0, FLOOR_Y + 0.80, 0.02);
    g.add(card);
  }

  /* ── THE BANNER IS ON THE WALL ────────────────────────────
     It was hanging in the air a hand's breadth behind the chair, which
     reads as a placard someone is holding rather than a house's colours
     over their place. It belongs on the wall at the same bearing, high
     enough to be over their head — the chair is furniture, the banner is
     the room saying whose table this is. */
  /* BEHIND them, not in front of them. The offset was positive, and the
     seat faces the middle, so every banner was hung between its owner and
     you — a sheet of heraldry floating over the table, which is both the
     "no banner to be seen" and one of the things across the view. High
     enough to clear the chimney breast, low enough to clear the rafters. */
  const b = banner(seat);
  if (b) {
    /* Just behind their chair, not out on the wall. The wall was the tidier
       idea and it does not survive contact with the room: the bearing
       straight ahead is the chimney breast, so the far player's colours hung
       INSIDE the fireplace and could not be seen from anywhere. A banner a
       hand's breadth behind the person it belongs to is what the request
       actually asked for, and it works from every seat. */
    /* and low enough to be IN the picture. Seated, the eye is barely above
       the wood and a banner two metres up goes off the top of the frame —
       which is the same "no banner to be seen" by a different route. It
       hangs just over its owner's head, where you can read it. */
    /* and only just behind the chair, not out in the room: at 0.92 the far
       player's banner was inside the chimney breast, which is the wall
       problem again in miniature. Against the chair back it is visible from
       every seat and it is unambiguously THEIRS. */
    b.position.set(0, FLOOR_Y + 1.38, -0.48);
    g.add(b);
  }

  /* a candle in front of every seat, so a face is never in the dark */
  g.userData.lightAt = new THREE.Vector3(0, FLOOR_Y + 1.0, -0.18);
  return g;
}

function syncSeats() {
  if (!seatRoot || !root.TableModel) return;
  const seats = root.TableModel.seats ? root.TableModel.seats() : [];
  const sig = seats.map(s => s.id + '|' + s.at + '|' + (s.face || '').length +
                             '|' + (s.banner || '').length).join(',')
            + '|me' + ((root.Shell && root.Shell.seat) ? root.Shell.seat() : 0);
  if (sig === seatSig) return;
  seatSig = sig;
  while (seatRoot.children.length) seatRoot.remove(seatRoot.children[0]);
  const mineAt = (root.Shell && root.Shell.seat) ? root.Shell.seat() : 0;
  seats.forEach((s, i) => { s.__mine = (i === mineAt); });
  for (const s of seats) {
    s.__a = (s.at || 0) * Math.PI / 180;        /* buildSeat needs the bearing */
    const g = buildSeat(s);
    /* 0 is the far side of the table, clockwise from there. The near
       side is yours and is left empty by spaceSeats(). */
    const a = (s.at || 0) * Math.PI / 180;
    g.position.set(Math.sin(a) * SEAT_R, 0, -Math.cos(a) * SEAT_R);
    g.rotation.y = a;                 /* facing the middle, which is you */
    seatRoot.add(g);
  }
  invalidate(12);
}

/* ── SOMETHING TO LOOK AT ─────────────────────────────────────
   Every light in the rig above needs a thing it is coming FROM. A shadow
   with no visible source is what makes a competently lit room feel dead,
   and a warm blob in frame does more work than the light it casts.

   The flames are Basic, not Standard — a flame is not lit, it IS the
   light — and above all `toneMapped: false`, because ACES otherwise
   crushes them to a dull orange patch and you get paint instead of fire.
   The logs are Standard with emissive so they take the firelight AND
   glow, and their emissive breathes on the same clock as the light. */
function glow(colour, size) {
  const c = doc.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 1, 32, 32, 31);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,210,150,.55)');
  g.addColorStop(1, 'rgba(255,160,80,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(c), color: colour, toneMapped: false, fog: false,
    transparent: true, opacity: 0.6, depthWrite: false,
    blending: THREE.AdditiveBlending }));
  s.scale.setScalar(size);
  return s;
}

function fire() {
  const T = (typeof TAVERN !== 'undefined') ? TAVERN : null;

  /* the embers in the hearth: real geometry, really glowing */
  if (T && T.FireLog) {
    for (const p of [[-0.16, 0, 0.1], [0.15, 0.02, -0.05], [0, 0.09, 0.06]]) {
      const g = mesh(T.FireLog.prims, TAVERN_TEX, DRESS.tavern);
      g.traverse(o => {
        if (!o.isMesh) return;
        o.castShadow = o.receiveShadow = false;
        /* ── A COAL IS NOT LIT, IT IS THE LIGHT ───────────
           These were Standard with an emissive on top, sitting twenty
           centimetres from a point light of intensity 3.4 with inverse
           square falloff — so their diffuse term alone came out around
           eighty, the emissive added three more, and every channel
           clipped. The fire had a flat WHITE CARD lying in it.

           Basic takes no light at all, which is the honest description
           of a coal: its brightness is its own and tickFire sets it
           directly, so it glows and breathes and never clips. */
        o.material = new THREE.MeshBasicMaterial({
          map: o.material.map, color: 0xff6a22, toneMapped: false });
        emberMats.push(o.material);
      });
      g.position.set(p[0], FLOOR_Y + 0.05 + p[1], -RZ + 0.62 + p[2]);
      g.rotation.y = Math.random() * 3;
      g.scale.setScalar(0.85);
      roomGroup.add(g);
    }
  }
  /* the fire itself, and the halo that makes it feel like it is giving
     something off rather than sitting there */
  const f = glow(0xffa14e, 1.15);
  f.position.set(0, FLOOR_Y + 0.30, -RZ + 0.60);
  roomGroup.add(f);
  const f2 = glow(0xffd9a0, 0.42);
  f2.position.set(0, FLOOR_Y + 0.22, -RZ + 0.58);
  roomGroup.add(f2);

  /* ── A CHANDELIER IS LIT, IF THERE IS ONE ────────────────
     Six flames round the rim and a small warm light in the middle of
     them, because a dark wooden wheel in a dark roof is not a chandelier,
     it is a wheel.

     BUILT ONCE AND AIMED BY THE LAYOUT, not nailed to a coordinate. The
     first version hard-coded the position, so deleting the chandelier in
     the editor would have left six flames and a light burning in clear
     air over the table — the exact class of fault the flames were added
     to fix, reintroduced one layer down. layRoom() points this at
     whatever the plan says, or hides it when the plan has no chandelier
     in it at all, which is what it says now. */
  if (overGroup) {
    chandelier = new THREE.Group();
    chandelier.visible = false;
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      const c = glow(0xffc078, 0.13);
      c.position.set(Math.cos(a) * 0.26, 0.07, Math.sin(a) * 0.26);
      chandelier.add(c);
    }
    const ch = lamp(new THREE.PointLight(0xffb066, 0.5, 3.2, 2.0), 3.2);
    ch.position.set(0, 0, 0);
    chandelier.add(ch);
    overGroup.add(chandelier);
    aimChandelier(roomPlan());        /* and once now, since layRoom ran first */
  }

  /* the pool the plan draws its flames from — made once, placed by
     lightCandles() whenever the layout is built */
  flamePool = [];
  for (let i = 0; i < 16; i++) {
    const c = glow(0xffc078, 0.13);
    c.visible = false; c.userData.flame = 1;
    roomGroup.add(c); flamePool.push(c);
  }
  lightCandles(roomPlan());

  /* The one flame that isn't a room fitting: the candle standing on the
     table itself. Everything else that burns is a row in the layout, so
     lightCandles() puts its flame wherever the row moved to — hard-coded
     heights are exactly how you end up with a light hanging in clear air
     after someone edits the room. */
  {
    const c = glow(0xffc078, 0.14);
    c.position.set(0, 0.46, 0);
    roomGroup.add(c);
  }

  /* ── DUST ─────────────────────────────────────────────────
     Two hundred points, and the best atmosphere-per-byte in the whole
     room: they give the air something in it, so the far wall reads as
     far away rather than as a picture of a wall. */
  const N = 220, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3]     = (Math.random() - 0.5) * RX * 1.9;
    pos[i * 3 + 1] = FLOOR_Y + Math.random() * WALL_H * 0.85;
    pos[i * 3 + 2] = (Math.random() - 0.5) * RZ * 1.9;
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  moteField = new THREE.Points(dg, new THREE.PointsMaterial({
    color: 0xffc890, size: 0.008, sizeAttenuation: true, transparent: true,
    opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending,
    fog: false, toneMapped: false }));
  moteField.frustumCulled = false;
  roomGroup.add(moteField);
}

/* Bolt the room to the table: same tilt, same centre, and one metre is
   however many pixels a 1.2m table is wide right now. */
function placeRoom(wx, wy, wz, PX) {
  if (!roomGroup) return;
  /* ── THE ROOM TURNS WITH YOUR HEAD, AND THE OTHER WAY ─────
     Euler order XYZ means the Y rotation is applied first, in the room's
     OWN frame — a spin about the room's vertical, then the tilt, which is
     what the CSS side does with rotateX(TILT) rotateZ(YAW).

     NEGATED, and this was the bug underneath "if i turn too much i start
     moving in a weird way". CSS +z points OUT of the screen and GL +y
     points up it, and that handedness flips the sense of a turn between
     the two: the wood was rotating one way and the walls the other. It
     survived for as long as it did because the room is roughly symmetric
     and the table used to spin about its own middle, so a reversed room
     just looked like a room going past.

     It is not arguable now, because it is measurable: hold the camera and
     ask the ROOM where the camera is. Turn ninety degrees and the answer
     must not change by so much as a centimetre. With the sign the wrong
     way round the eye walked twice the angle through the furniture, which
     is precisely the feeling of being dragged sideways. */
  roomGroup.rotation.set(tableObj.rotation.x, -headYaw(), 0);
  roomGroup.position.set(wx, wy, wz);
  roomGroup.scale.setScalar(PX);
  /* A light's `distance` is read in WORLD units and does not inherit the
     group's scale the way its position does — so every reach written in
     metres up in lightRoom() has to be pushed through by hand whenever the
     zoom changes what a metre is worth. Miss this and the falloff is
     either the whole room or none of it. */
  if (PX !== litPX) {
    litPX = PX;
    for (const L of lit) L.distance = L.userData.m * PX;
    if (moteField) moteField.material.size = 0.008 * PX;
    if (uScene.fog) uScene.fog.density = FOG_M / PX;
  }
}
let litPX = 0;
const FOG_M = 0.062;   /* per metre: about 15% haze at six metres */

/* ══ THE LENS ══════════════════════════════════════════════════
   Zooming out does not walk you backwards. The eye sits a FIXED distance
   from the table plane — `perspective` in CSS, the camera's z in here —
   and zoom only changes how big the world is against it. So pulling the
   zoom down to 5% did not sit me at the table; it shrank the tavern until
   the eye was twenty-two metres above it, looking through an eleven-degree
   lens. A dollhouse seen from the ceiling, which is exactly what it looked
   like.

   Being IN a room is a short lens close up. So the perspective travels
   with the tilt: 2400px over the table, where a long lens keeps the wood
   honest and unwarped, down to about 700 in the chair, where the walls
   wrap round you and the far side of the room is something you look
   ACROSS rather than down at. Same move a camera makes when it stops
   photographing a board and starts sitting at it.

   fov = 2·atan(H / 2·PERSP), so shortening the lens widens the view — and
   because both halves of the picture read the same number, the CSS pieces
   and the GL room widen together. */
/* ── ONE RENDER, NOT FOUR ─────────────────────────
   This used to be the front of a post chain: the room into a half-float
   target, a bright-pass and two blurs for bloom, then a fullscreen grade
   doing ACES, split-toning, chromatic aberration, a vignette and grain.
   It is all gone, and it is worth saying why so nobody rebuilds it.

   It cost the whole frame. Measured rather than guessed: with the GL
   canvases hidden a look-around frame was 14ms; with them on, 3001ms —
   the pass, not the room. And it bought a grade the picture already had.
   #grade in table-body.html lays the same tone curve, the same warmth
   and the same vignette over the WHOLE composite, DOM pieces included,
   which a pass over the GL canvases alone could never reach, and it
   costs nothing because the compositor was going to draw that frame
   anyway. The bloom on the fire comes from the additive glow sprites
   instead: they were already there and they are two triangles each.

   The machinery outlived the decision. buildPost() stopped being called,
   so postReady was never true and this function had been taking the
   plain branch ever since — about a hundred and ninety lines of shader
   source and render targets sitting behind a condition that could not
   fire. That went, and so did a second copy of this function stranded
   above the file's own header, outside the IIFE, where its uRen and
   uScene did not even resolve. */
function drawUnder(t) {
  uRen.toneMapping = THREE.ACESFilmicToneMapping;
  uRen.outputEncoding = THREE.sRGBEncoding;
  uRen.setRenderTarget(null);
  uRen.render(uScene, camera);
}

function lens(p) {
  p = Math.max(260, Math.min(6000, p || 2400));
  if (Math.abs(p - PERSP) < 0.5) return;
  PERSP = p;
  /* the table mounts and fits itself before this layer has a renderer, and
     the fit sets the lens — so record it and let build() pick it up */
  if (!renderer) return;
  sizeCam();
  invalidate(6);
}

/* The room never hides now; this only trims the rig for how far back you
   are sitting. Called once per drawn frame from the view's own number. */
function showRoom(on) {
  if (!roomGroup || seatedNow === !!on) return;
  seatedNow = !!on;
  /* ── THE AIR, AND STANDING THE TABLE RIG DOWN ─────────────
     Fog is the cheapest depth cue there is and the reason a room reads as
     a room rather than a diorama: without it the far wall is exactly as
     crisp and contrasty as the mug in front of you, so the space has no
     size. It has to be a near-black WARM — roughly the colour of the
     darkest corner — because a mid-grey fog turns everything at depth
     into the same pale slab, which is the milk look.

     And the table's own rig has to come down. Three directionals at 0.95
     are right for reading a board from above and are exactly the flat
     fill that was making the room look like a box; while you are sitting
     in the room the hearth is the key and they are barely a fill. */
  uScene.fog = new THREE.FogExp2(0x140e09, FOG_M / (litPX || 600));
  uScene.background = new THREE.Color(0x140e09);
  invalidate(20);
}

/* ══ THE WOOD IS IN THE ROOM, SO THE ROOM LIGHTS IT ════════════
   grumkata: "the table seems somewhat out of place like its getting
   diffrent lighting from the rest of the tavern".

   It was, in two ways, and both were mine.

   The table keeps its own rig — three directionals and an ambient, aimed
   to read a board from above — and that rig was being cut to sixteen
   percent the instant you crossed half way and put back the instant you
   crossed it again. Sixteen percent of a studio key is still a key, and
   it comes from a direction that has nothing to do with the hearth, so
   the wood was lit by one thing and the room it stands in by another.

   And the table is a Standard material carrying an ENVIRONMENT MAP at
   full strength, while every surface of the room is Lambert with none.
   An environment map is an entire second lighting rig, invisible in the
   code and very visible on the wood: it is why the table sat in the
   tavern looking cut out and pasted on.

   Both now ride the travel continuously rather than snapping at a
   threshold — by the time you are in the chair the hearth is the only
   thing lighting the table, which is the whole point of a hearth. */
let rigLights = null, woodMats = null, overRig = null;
function roomLook(u) {
  if (!roomGroup) return;
  if (!rigLights) {
    rigLights = [];
    uScene.traverse(o => {
      if (o.isDirectionalLight && !roomGroup.getObjectById(o.id)) {
        if (o.userData.base === undefined) o.userData.base = o.intensity;
        rigLights.push(o);
      }
    });
  }
  if (!woodMats && tableObj) {
    woodMats = [];
    tableObj.traverse(o => {
      if (o.isMesh && o.material && o.material.envMapIntensity !== undefined) {
        if (o.material.userData.envBase === undefined)
          o.material.userData.envBase = o.material.envMapIntensity;
        woodMats.push(o.material);
      }
    });
  }
  const rig = 1 - 0.97 * u;
  for (const L of rigLights) L.intensity = L.userData.base * rig;
  /* The chest and the bin live in the OTHER scene, which the hearth does
     not reach at all, so their rig cannot be cut the way the table's is:
     cut it and they go black, which is the thing I was asked to stop doing
     in the first place. Down far enough that they stop glowing against a
     firelit room, and no further. */
  if (!overRig) {
    overRig = [];
    scene.traverse(o => { if (o.isDirectionalLight) {
      if (o.userData.base === undefined) o.userData.base = o.intensity;
      overRig.push(o); } });
  }
  const orig = 1 - 0.42 * u;
  for (const L of overRig) L.intensity = L.userData.base * orig;
  const env = 1 - 0.88 * u;
  for (const m of woodMats) m.envMapIntensity = m.userData.envBase * env;
}

/* ── THE TABLE IS TOLD, NOT MEASURED ──────────────────────────
   World (0,0,0) in this layer IS the perspective origin on the screen
   plane and the camera sits at z = PERSP looking down the axis — which
   means GL world and the CSS box are the same space, with y flipped. So a
   point the table layer reports at (x, y, depth) in page pixels goes
   straight in, and GL's own projection does the rest.

   The markers stay on the rim because other things read them, but nothing
   is ruled by them any more: two getBoundingClientRects a frame, and an
   answer that was only right on the optical axis. */
function placeTable() {
  if (!tableObj || !uRen) return;
  const l = doc.getElementById('tm-l'), r = doc.getElementById('tm-r');
  const vp = doc.getElementById('vp');
  if (!l || !r || !vp || vp.hidden) { tableObj.visible = false; return; }
  const a = l.getBoundingClientRect(), b = r.getBoundingClientRect();
  const dia = Math.hypot(b.left - a.left, b.top - a.top);
  if (!dia) { tableObj.visible = false; return; }
  tableObj.visible = true;
  /* ── AND UNPROJECTED THROUGH IT ───────────────────────────
     What the markers give is the table AS DRAWN: a midpoint and a width
     already divided by the perspective. GL is about to divide by its own,
     so what it wants is the table BEFORE that — which is the same numbers
     scaled back by the depth the table layer reports. At the wood, and
     looking straight ahead, the depth is nought and this is the identity
     it has always been. */
  const z = root.__stageZ ? root.__stageZ() : 0;
  const f = z ? Math.max(0.08, (PERSP - z) / PERSP) : 1;
  const cx = (a.left + b.left) / 2, cy = (a.top + b.top) / 2;
  const [sx, sy] = toWorld({ left: cx, top: cy, width: 0, height: 0 });
  const wx = sx * f, wy = sy * f, w = dia * f;
  /* the slab is round, so a spin about its own normal would be invisible —
     but the grain is not, and the grain turns with the room */
  tableObj.rotation.set(Math.PI / 2 - tilt(), -headYaw(), 0);
  tableObj.position.set(wx, wy, z);
  tableObj.scale.set(w, w, w);
  placeRoom(wx, wy, z, w / TABLE_M);
}

/* ══ THE ROOM, AS A REFLECTION ═════════════════════════════════
   Not a loaded HDR — a tiny scene of glowing panels, blurred into a cube
   map by three's own PMREM generator. Six surfaces is enough, because what
   a material needs from an environment is not detail, it is DIRECTION:
   something bright above, something warm and dim below where the table
   bounces light back, and dark to the sides. That is what makes a curved
   thing read as curved.

   Built per renderer, because a texture belongs to the WebGL context that
   made it and this file runs two. */
const envs = new WeakMap();
function envFor(ren) {
  if (envs.has(ren)) return envs.get(ren);
  const room = new THREE.Scene();
  const panel = (col, w, h, d, x, y, z, rx, ry) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
      new THREE.MeshBasicMaterial({ color: col, side: THREE.BackSide }));
    m.position.set(x, y, z);
    if (rx) m.rotation.x = rx;
    if (ry) m.rotation.y = ry;
    room.add(m);
  };
  /* the room itself: dark oak walls, so nothing washes out */
  panel(0x2a1d12, 24, 16, 24, 0, 4, 0);
  /* THE LAMP. One warm band over the table, which is the light this whole
     app is drawn under — see design-language.md. */
  const lamp = new THREE.Mesh(new THREE.PlaneGeometry(9, 5),
    new THREE.MeshBasicMaterial({ color: 0xffdcae }));
  lamp.position.set(-1.4, 9.4, 1.6); lamp.rotation.x = Math.PI / 2;
  room.add(lamp);
  /* a cold slot of daylight from one side, so metal has two tones in it */
  const win = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 6),
    new THREE.MeshBasicMaterial({ color: 0x6e86a4 }));
  win.position.set(9.6, 5, -1); win.rotation.y = -Math.PI / 2;
  room.add(win);
  /* and the bounce off the wood itself, which is most of what lights the
     UNDERSIDE of anything standing on it */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20),
    new THREE.MeshBasicMaterial({ color: 0x5a3a1e }));
  floor.position.y = -2.4; floor.rotation.x = -Math.PI / 2;
  room.add(floor);

  const pm = new THREE.PMREMGenerator(ren);
  pm.compileEquirectangularShader();
  const rt = pm.fromScene(room, 0.04);
  pm.dispose();
  room.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  envs.set(ren, rt.texture);
  return rt.texture;
}

/* ── HOW THE PICTURE IS GRADED ────────────────────────────────
   Writing linear light straight into an sRGB buffer clips everything above
   1.0 to the same white. Filmic tone mapping rolls it off instead, so a
   brass band has a highlight WITH SHAPE IN IT rather than a white patch —
   which is what "textures look flat" actually looks like. */
function dress(ren) {
  ren.outputEncoding = THREE.sRGBEncoding;
  ren.toneMapping = THREE.ACESFilmicToneMapping;
  /* UNDER ONE, deliberately. This table is lit by a single lamp in a dark
     hall — see design-language.md — and the first pass at this put the
     exposure over 1 with a 1.55 key on top, which turned a dark oak table
     into pale pine and the bin into a cream plastic tray. Filmic tone
     mapping is for the ROLL-OFF at the top end, not for making things
     brighter. */
  ren.toneMappingExposure = 0.92;
  ren.shadowMap.enabled = true;
  /* VARIANCE, NOT PCF. PCF gives a hard stepped edge — the first pass drew a
     crisp dark rectangle under the bin that read as a sticker of a shadow.
     Nothing on a table under a soft lamp has an edge like that. VSM blurs
     the map itself, so `radius` is a real penumbra. */
  ren.shadowMap.type = THREE.VSMShadowMap;
  /* ── AND IT IS NOT REDRAWN SIXTY TIMES A SECOND ───────────
     grumkata, twice: "MAJOR Lag like i can barley look around".

     This is the frame's biggest single item and it was being paid for
     nothing. A VSM map is rendered AND THEN BLURRED, so a 2048 map is
     about seventeen million texel operations every time it updates —
     more than the room, the bloom and the grade put together. And three
     updates it on every render by default.

     But the tavern is furniture: it does not move. What moves is the
     FIRE, and a fire changes the brightness of a light, not where
     anything is standing — the shadows it casts are the same shadows.
     So the map is updated when something actually moved, and a light-only
     change reuses the one already on the card. */
  ren.shadowMap.autoUpdate = false;
  ren.shadowMap.needsUpdate = true;
}

/* ── THE LAMP OVER THE TABLE ──────────────────────────────────
   One key with a shadow, one cool fill without. Two lights, because a
   second shadow from a second direction is how a room stops looking like a
   room and starts looking like a shop window. */
function light(sc) {
  /* ONE LAMP, AND THE ROOM. The environment built above is doing most of the
     work now — it is what puts light on a curved surface from every
     direction — so the lights here are only the DIRECTION: which way the
     highlight runs and which way the shadow falls. Turned up to studio
     levels they wash the environment out and everything goes pale, which is
     what the first pass at this did. */
  sc.add(new THREE.AmbientLight(0xffe6c8, 0.10));
  const key = new THREE.DirectionalLight(0xffeed0, 0.95);
  key.position.set(-760, 1180, 1150);
  key.castShadow = true;
  /* THE SHADOW CAMERA IS SET IN sizeCam(), because this layer measures in
     screen pixels and the box it has to cover is the viewport. */
  /* A COUNTER IS FORTY PIXELS TALL and the shadow map has to cover the whole
     viewport, so texels are the thing to watch: at 1024 over three thousand
     units a meeple's shadow was two texels wide and VSM's bleed correction
     ate it entirely. The chest cast one and nothing smaller did. */
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  /* and normalBias is in WORLD units — at 2.0 it pushed every small piece
     clean out of its own shadow */
  key.shadow.normalBias = 0.6;
  key.shadow.radius = 3.2;               /* a real penumbra, under VSM */
  sc.add(key, key.target);
  /* the cold slot of daylight the room has, so metal carries two tones */
  const fil = new THREE.DirectionalLight(0x8fabc8, 0.22);
  fil.position.set(950, 300, 700);
  sc.add(fil);
  /* and the bounce back off the wood, which is what lights an undercut */
  const back = new THREE.DirectionalLight(0xffc07a, 0.16);
  back.position.set(-260, -820, 700);
  sc.add(back);
  return key;
}

/* every mesh under here throws a shadow and takes one */
function casts(o) {
  o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return o;
}

/* ── HOW EACH MODEL IS DRESSED ────────────────────────────────
   Two assets from two different packs cannot both be lit right by one set of
   numbers, so each says what it is made of. `mul` multiplies the glTF base
   colour; `rough` and `metal` are what the surface DOES with light.

   ROUGHNESS IS THE WHOLE JOB. It is not a style setting — it is the only
   number that separates waxed oak from cast iron from painted wood, and
   getting it wrong is most of why everything here used to read as the same
   soft plastic. Iron is a metal with a tight highlight; wood is a
   dielectric with a broad one; the boardgame pieces are painted wood, which
   is a dielectric with a much tighter one because the paint is glossy. */
const DRESS = {
  /* AND ITS WOOD IS WOOD. The timber of the chest was at mul [1,1,1] —
     the atlas straight out of the pack, untouched — which under a studio
     key on a warm oak table came out a pale cold grey. Next to a tavern
     lit by a fire it was the one object in the picture that looked like it
     had been photographed somewhere else. Brought down and warmed to the
     oak it is standing on. */
  chest: { metal: { mul: [0.26, 0.23, 0.19], rough: 0.34, metalness: 1.0 },
           wood:  { mul: [0.60, 0.48, 0.36], rough: 0.68, metalness: 0.0 } },
  /* the KayKit container is a pale cream tray in its own atlas, which on
     dark oak under one warm lamp reads as a polystyrene box someone left on
     the table. Brought down and warmed until it belongs to the room. */
  bin:   { metal: { mul: [0.34, 0.29, 0.20], rough: 0.42, metalness: 0.9 },
           wood:  { mul: [0.34, 0.28, 0.19], rough: 0.62, metalness: 0.0 } },
  /* board-game bits are PAINTED wood: the colour is in the atlas already
     and all they want is the varnish, which is a tight dielectric highlight.
     This is what makes a meeple read as a solid object rather than a
     coloured shape. */
  bits:  { metal: { mul: [1, 1, 1], rough: 0.30, metalness: 0.0 },
           wood:  { mul: [1, 1, 1], rough: 0.30, metalness: 0.0 } },
  /* ── THE ROOM IS FURTHER AWAY THAN THE TABLE, AND MUST LOOK IT ──
     Both packs were authored for daylight, and dropped into a hall lit by
     one lamp over the wood they came out brighter than the table they are
     supposed to be standing behind — which reads as a painted backdrop
     rather than a room. Pulled down and warmed so the light falls off
     toward the walls, and left rough: plaster and old timber have no
     highlight to speak of, and giving them one is what makes a kit look
     like plastic. */
  room:  { metal: { mul: [0.20, 0.17, 0.14], rough: 0.95, metalness: 0.0 },
           wood:  { mul: [0.24, 0.20, 0.16], rough: 0.92, metalness: 0.0 } },
  /* the furniture is nearer the eye than the walls and catches the fire,
     so it keeps a little more of itself and a little more sheen */
  /* THE FRAME IS A SILHOUETTE. Almost no albedo left, so the posts and
     the banners on them go black against the fire instead of competing
     with it — which is the whole job of a framing element. */
  frame: { metal: { mul: [0.07, 0.06, 0.05], rough: 0.98, metalness: 0.0 },
           wood:  { mul: [0.09, 0.075, 0.06], rough: 0.97, metalness: 0.0 } },
  tavern:{ metal: { mul: [0.28, 0.25, 0.21], rough: 0.58, metalness: 0.60 },
           wood:  { mul: [0.34, 0.29, 0.23], rough: 0.74, metalness: 0.0 } },
  /* A LAMP HAS TO LOOK LIT. There are five lanterns on the walls and every
     one of them was a dark lump of tin, because a wall lamp in this room is
     a MODEL and the light in the room comes from somewhere else entirely.
     Emissive costs nothing — it is added after the lighting, not another
     light to evaluate — and it is the difference between a room with lamps
     in it and a room with lamp-shaped objects in it. */
  /* A SEAT'S CHAIR IS THE SAME CHAIR AS THE ONES AT THE BAR, and it was
     coming out cream while they came out oak — because the room is merged
     into Lambert batches with no environment map and a seat is built one
     at a time in Standard, which samples the room's own bright environment
     and lifts it two stops. Same wood, dressed to match what it is
     standing next to. */
  seat:  { metal: { mul: [0.17, 0.15, 0.12], rough: 0.72, metalness: 0.3 },
           wood:  { mul: [0.21, 0.18, 0.14], rough: 0.86, metalness: 0.0 } },
  glow:  { metal: { mul: [0.42, 0.36, 0.28], rough: 0.5, metalness: 0.5,
                    emis: [0.52, 0.29, 0.10] },
           wood:  { mul: [0.60, 0.48, 0.34], rough: 0.8, metalness: 0.0,
                    emis: [0.62, 0.36, 0.13] } },
  /* THE WOOD PACK IS PINE, AND THIS TABLE IS OAK. The atlas that came with
     it is a bright yellow-orange softwood — correct for the pack, wrong for
     a hall lit by one lamp, where it came out looking like a plastic toy.
     Brought down and pulled toward red-brown, which is what oil on oak
     does. Oiled, not varnished, so the sheen is broad. */
  timber:{ metal: { mul: [0.34, 0.30, 0.24], rough: 0.40, metalness: 0.85 },
           wood:  { mul: [0.58, 0.44, 0.33], rough: 0.62, metalness: 0.0 } },
  /* the bin. Wicker is MATTE — it is a thousand little edges and it scatters
     light in every direction, which is the opposite of the oiled tabletop it
     stands on, and that contrast is what stops it reading as a lump of the
     same table. Kept lighter than the wood for the same reason: a dark
     basket on dark oak is a hole. */
  basket:{ metal: { mul: [0.8, 0.7, 0.56], rough: 0.9, metalness: 0.0 },
           wood:  { mul: [0.88, 0.76, 0.6], rough: 0.9, metalness: 0.0 } }
};

/* Cached on the picture, not on the key. Several packs are drawn through this
   one function now and their key spaces are their own — the castle's "Walls"
   and the chest's "chest0" live in different books, and a cache keyed by name
   would have handed one pack's texture to the other. */
const texCache = {};
/* ── WAITING FOR THE PICTURES ─────────────────────────────────
   A data URI is still decoded ASYNCHRONOUSLY. The first attempt at a model's
   preview therefore rendered an untextured mesh — and then CACHED it, so
   nineteen of the twenty-three models in the box were permanently blank
   squares. Nothing was wrong with the models; the picture was taken before
   the film arrived. Count what is still in flight, refuse to keep a preview
   taken while anything is, and tell whoever is showing them when it is
   safe to ask again. */
let waiting = 0;
const settled = [];
function landed() {
  if (--waiting > 0) return;
  waiting = 0;
  const fns = settled.slice();
  fns.forEach(f => { try { f(); } catch (e) {} });
}
function onTextures(fn) { if (settled.indexOf(fn) < 0) settled.push(fn); }

/* ── AND THE COUNTER ALONE IS NOT ENOUGH ──────────────────────
   `waiting` counts REQUESTS, and a request is only made on a cache miss —
   so the second asker for a picture that is still in the air gets it
   straight back off texCache without the counter ever moving. If that
   asker is a preview, it sees waiting at nought, decides every texture has
   arrived, and caches a blank square for good: the very fault the note
   above says was fixed, through a hole in the fix.

   It was unreachable while the pictures were data URIs in the script,
   because the gap between the first ask and the picture landing was a
   microtask. They are files beside the page now and that gap is a disk
   read, which is wide enough to fall into every time.

   So readiness stops being a global count and becomes a fact about each
   texture. The counter stays — the render loop and onTextures still want
   to know whether anything at all is outstanding — but nothing decides
   what to KEEP by reading it any more. */
/* A set rather than a flag on the texture: THREE.Texture in r128 has no
   userData to hang one on, and absence-means-not-ready needs no initialiser
   and so cannot be raced by a load that finishes early. The callback is
   handed the texture itself, so nothing closes over a binding that may not
   be assigned yet either. */
const texDone = new WeakSet();
function texReady(t) { return !!t && texDone.has(t); }

function tex(k, book) {
  const src = (book || CHEST_TEX)[k];
  if (!src) return null;
  if (texCache[src]) return texCache[src];
  waiting++;
  const done = who => { if (who) texDone.add(who); landed(); };
  const t = new THREE.TextureLoader().load(src, done, undefined, () => done(texCache[src]));
  t.encoding = THREE.sRGBEncoding;
  t.flipY = false;                       /* glTF UVs, not canvas UVs */
  return (texCache[src] = t);
}

/* Every texture this group actually hangs on, arrived or not. A preview is
   only worth keeping when all of them have. */
function allTexReady(g) {
  let ok = true;
  g.traverse(o => {
    const m = o.material;
    if (!m) return;
    (Array.isArray(m) ? m : [m]).forEach(x => {
      if (x && x.map && !texReady(x.map)) ok = false;
    });
  });
  return ok;
}
function mesh(prims, book, dress, cel) {
  dress = dress || DRESS.chest;
  const g = new THREE.Group();
  for (const p of prims) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(p.p, 3));
    if (p.n) geo.setAttribute('normal', new THREE.Float32BufferAttribute(p.n, 3));
    else geo.computeVertexNormals();
    /* not every pack carries UVs — the castle's own scene is keyed by
       material and some of its prims are untextured */
    if (p.u) geo.setAttribute('uv', new THREE.Float32BufferAttribute(p.u, 2));
    if (p.i) geo.setIndex(p.i);
    geo.computeBoundingSphere();
    /* ── WHY THIS IS PHONG AND NOT LAMBERT ────────────────────
       The untextured parts (Metal, Hinges) carry only a glTF
       baseColorFactor, and the chest's is a linear 0.305 grey. Lambert
       has no specular at all, so under this table's lamp that grey came
       out as a flat light putty and the chest read as a white striped
       box — bands of pale plastic between the wood. Metal is not a
       colour, it is a HIGHLIGHT: the same grey with a tight warm
       specular on it reads as iron immediately. The wood keeps a very
       low, broad sheen, which is what waxed oak actually does.

       The base colour is also brought down: glTF's factor is linear and
       the renderer writes sRGB, which lifts 0.305 to about 0.59 on the
       way out — brighter than any ironwork on a chest has ever been. */
    /* THE NATURE KIT'S BAKED OCCLUSION, one grey channel expanded to three.
       Without it every surface is lit identically and the whole kit reads as
       moulded plastic — 37-scene-field.js learned this already and this file
       has to know it too, or a tree on the table looks nothing like the same
       tree in the field. */
    if (p.ao) {
      const c = new Float32Array(p.ao.length * 3);
      for (let n = 0; n < p.ao.length; n++) c[n*3] = c[n*3+1] = c[n*3+2] = p.ao[n];
      geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
    }
    const metal = !p.t;                    /* textured = wood, bare = ironwork */
    const d = metal ? dress.metal : dress.wood;
    const base = p.c || [1, 1, 1];
    const col = new THREE.Color().setRGB(
      base[0] * d.mul[0], base[1] * d.mul[1], base[2] * d.mul[2]);
    /* ── STANDARD, NOT PHONG ───────────────────────────────
       Phong has one highlight from one light and nothing else. A real
       surface is lit from every direction at once and its APPEARANCE is
       what it does with all of that — which is roughness and metalness,
       sampled against the room built in envFor(). Swapping this one
       material is most of the difference between "these look like
       objects" and "these look like drawings of objects". */
    const mat = B3(new THREE.MeshStandardMaterial({
      map: p.t ? tex(p.t, book) : null,
      color: col,
      vertexColors: !!p.ao,
      roughness: d.rough,
      metalness: d.metalness,
      envMapIntensity: metal ? (seatedNow ? 0.72 : 1.15) : (seatedNow ? 0.30 : 0.75),
      transparent: false,
      alphaTest: p.cut ? 0.5 : 0,
      /* foliage is a flat card whose SHAPE lives in the texture's alpha */
      side: p.cut ? THREE.DoubleSide : THREE.FrontSide }),
      cel || { room: 'tavern', steps: 6, tint: 0.24, hard: 0.5, rim: p.cut ? 0 : 0.16 });
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true; m.receiveShadow = true;
    g.add(m);
  }
  return g;
}

function sizeCam() {
  W = root.innerWidth; H = root.innerHeight;
  renderer.setPixelRatio(Math.min(root.devicePixelRatio, 2));
  renderer.setSize(W, H, false);
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  if (uRen) {
    uRen.setPixelRatio(Math.min(root.devicePixelRatio, 2));
    uRen.setSize(W, H, false);
    uCv.style.width = W + 'px'; uCv.style.height = H + 'px';
  }
  const fov = 2 * Math.atan(H / (2 * PERSP)) * 180 / Math.PI;
  /* ── ROOM FOR A ROOM ──────────────────────────────────────
     These were PERSP +/- 900, which is a slab either side of the table
     and was exactly right while this layer held nothing but flat pieces
     lying on it. A tavern is five metres of depth in both directions and
     the far wall fell straight out the back of the frustum. Widened to
     hold it; the ratio is still modest enough that the depth buffer has
     no trouble separating a cup from the table it stands on. */
  camera = new THREE.PerspectiveCamera(fov, W / H, 60, PERSP + 26000);
  /* THE EYE SITS ON THE VANISHING POINT, and where that is on the screen is
     what aim() works out. Everything in this layer is measured in screen
     pixels off the DOM, so world (0,0,0) IS the vanishing point on the
     table plane and the camera looks straight down the z axis at it. */
  camera.position.set(0, 0, PERSP);
  camera.lookAt(0, 0, 0);
  const _vp = doc.getElementById('vp');
  aim(_vp && !_vp.hidden ? _vp.getBoundingClientRect() : null, true);

  /* THE SHADOW CAMERA HAS TO COVER THE VIEWPORT, and this layer measures in
     screen pixels, so the box is the screen. Generous on the vertical
     because a standing figure is tall and its shadow is longer than it is. */
  if (shadowLight) {
    const c = shadowLight.shadow.camera;
    c.left = -W; c.right = W; c.top = H; c.bottom = -H * 1.4;
    c.near = 200; c.far = 4200;
    c.updateProjectionMatrix();
    shadowLight.target.position.set(0, 0, 0);
    shadowLight.target.updateMatrixWorld();
  }
  /* the plane the shadows land on: the whole screen, just behind the feet */
  /* and the plane the shadows land on goes with them */
  if (catcher) { catcher.scale.set(W * 6, H * 6, 1); }
  if (uCatch) { uCatch.scale.set(W * 6, H * 6, 1); }
  if (uLight) {
    const c = uLight.shadow.camera;
    c.left = -W; c.right = W; c.top = H; c.bottom = -H * 1.4;
    c.near = 200; c.far = 4200;
    c.updateProjectionMatrix();
    uLight.target.position.set(0, 0, 0);
    uLight.target.updateMatrixWorld();
  }
}

/* ── THE MODELS BELONG INSIDE THE TABLE, NOT OVER THE ROOM ────
   The wood is drawn into #tglu, which lives INSIDE #vp and is therefore
   clipped by it. The model canvas is not: it is fixed to the whole window
   at z-index 870 so it can paint over the pieces, which also means it
   paints over everything ELSE — pan the table right and the chest, the
   counters and the bin slide out from under the wood and carry on across
   the chat dock, still standing on a table that has stopped.

   They cannot simply move inside #vp: this layer measures in window
   coordinates, and #vp stops 300px short of the right edge, so a canvas
   fitted to #vp would have its whole projection shifted. Clipping is the
   honest fix — the canvas stays exactly where it is and the picture is
   trimmed to the hole the table is seen through.

   Recomputed from the live box rather than the stylesheet, because the
   dock comes and goes; the string is cached so the common case is a
   comparison rather than a style write. */
let clipStr = null;
function clipTo(vp, r) {
  if (!cv) return;
  if (!r) {
    if (clipStr !== 'none') { cv.style.clipPath = clipStr = 'none'; }
    return;
  }
  const want = 'inset(' + Math.round(r.top) + 'px ' + Math.round(W - r.right) +
               'px ' + Math.round(H - r.bottom) + 'px ' + Math.round(r.left) + 'px)';
  if (want !== clipStr) { cv.style.clipPath = clipStr = want; }
}

/* ══ TWO ENGINES, ONE EYE ══════════════════════════════════════
   THIS is the bug grumkata kept seeing and I kept mistaking for
   something else: "as I move the camera around and resize, things start
   moving off the table on their own."

   The table is drawn by two different renderers into the same picture.
   The pieces are CSS 3D — the browser projects them from #vp's
   `perspective-origin`. The models are WebGL — three.js projects them
   from the camera's axis, which lands in the middle of the canvas. Those
   are not the same point, and they were never made to be:

       #vp is fixed inset:0 with right:300px for the chat dock,
       so its box is 1200 x 950 and its origin, 50% 42%, is at (600, 399).
       The canvas is the whole window, 1500 x 950, so the GL axis
       sat at (750, 475).

   A hundred and fifty pixels apart across, seventy-six down. Measured,
   not reasoned: the numbers above are what the page reported.

   At the table surface it does not show, because this layer positions
   every model by measuring its DOM anchor — a point on the plane is put
   where the browser already put it, whatever the projection. But a model
   has HEIGHT, and height is where a projection speaks. Everything that
   stands up leaned toward the wrong vanishing point, and the lean is
   proportional to how tall the thing is ON SCREEN — so it grew every
   time the table was zoomed, and shifted every time the window was
   resized or the dock changed the shape of #vp. Pieces crept off their
   own bases exactly when the camera moved. Nothing was moving. The two
   halves of the picture disagreed about where the viewer was standing.

   The fix is to put the eye where CSS puts it. World (0,0,0) is defined
   as the vanishing point on the table plane, and the projection's
   principal point is pushed off the canvas centre onto that same screen
   position with setViewOffset — three.js renders the canvas as an
   off-centre window of a larger view, which is exactly an off-centre
   perspective origin. Read from the live box, so a dock that comes and
   goes re-aims rather than lying. */
let aimX = null, aimY = null;
function aim(r, force) {
  if (!camera) return;
  /* no viewport to read: fall back to the window, which is what the old
     code assumed unconditionally */
  const ox = r ? r.left + r.width * 0.5 : W * 0.5;
  const oy = r ? r.top + r.height * ORIGIN : H * ORIGIN;
  if (!force && ox === aimX && oy === aimY) return;
  aimX = ox; aimY = oy; OX = ox; OY = oy;
  camera.setViewOffset(W, H, W / 2 - ox, H / 2 - oy, W, H);
  camera.updateProjectionMatrix();
  invalidate(4);
}

/* ── PUT THE MODEL'S OWN MIDDLE AT ITS ORIGIN ─────────────────
   Every frame this file sets `position` to the centre of a DOM anchor and
   `scale` to that anchor's width. Both of those are lies unless the model's
   origin IS its middle and its longest side IS one unit — and the
   AnimatedChest's authoring origin is nowhere near the chest. The offset
   between the two scales with the model, so the chest sat neatly on its
   corner of the table at the fit zoom and then slid right out into the
   middle of the battlefield the moment the camera framed a scene. It was
   never the anchor that was wrong; it was the assumption about the asset.

   Wrapping rather than baking, because the bake is grumkata's asset
   pipeline and this is a rendering concern. Note the position is set in
   PRE-scale units: a node's local matrix is T * R * S, so its own scale
   does not apply to its own translation. */
function normalise(inner, topAtOrigin, feetAtOrigin) {
  const pivot = new THREE.Group();
  pivot.add(inner);
  const box = new THREE.Box3().setFromObject(inner);
  const c = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  /* a table's footprint is what has to match the plane, not its overall
     bounding cube — a tall table would otherwise come out too small */
  const span = topAtOrigin ? Math.max(size.x, size.z) : Math.max(size.x, size.y, size.z);
  const s = 1 / Math.max(span, 1e-6);
  inner.scale.setScalar(s);
  inner.position.set(-c.x * s,
    topAtOrigin  ? -box.max.y * s :
    feetAtOrigin ? -box.min.y * s : -c.y * s, -c.z * s);
  return pivot;
}

/* A DOM rect's centre in the layer's own coordinates. The origin is the
   vanishing point (see aim), so screen (OX, OY) is world (0, 0) and a
   pixel across is a unit across. */
const toWorld = r => [r.left + r.width / 2 - OX, OY - (r.top + r.height / 2)];

/* IS THIS ANCHOR ACTUALLY ON SCREEN?
   NOT offsetParent. offsetParent is null for EVERY position:fixed element,
   by specification — so the moment the bin was moved off the wood and pinned
   to the corner of the screen (grumkata: "perpetual UI on the players
   screen"), this test said it was hidden and the model stopped being drawn
   at all. That is the second time this exact assumption has cost a session;
   measure the box instead, which answers the question for both kinds of
   anchor. A display:none element, or one inside one, has no box. */
/* ── MEASURING AN ANCHOR, ONCE ────────────────────────────────
   This used to take a getBoundingClientRect AND a getComputedStyle, and
   then stand() took a SECOND rect of the same element immediately after
   — three forced style/layout flushes per object, sixty times a second,
   for every model on the table. That is the largest single cost in the
   table and it is paid whether anything moved or not.

   One rect, and the answer carries the measurement with it. An element
   that is display:none or visibility:hidden reports a zero-sized rect,
   so the width test already covers what getComputedStyle was asked. */
function rectOf(a) {
  if (!a || a.hidden) return null;
  const r = a.getBoundingClientRect();
  return (r.width && r.height) ? r : null;
}
function onScreen(a) { return !!rectOf(a); }

/* ── WHY A BOUNDING BOX IS THE WRONG RULER ────────────────────
   getBoundingClientRect gives the AXIS-ALIGNED box around a piece. The
   pieces are not axis-aligned: they lie in a plane tilted away from the
   camera inside a perspective, so each one projects to a TRAPEZOID — its
   near edge wider than its far edge — and the box around a trapezoid is
   wider than the trapezoid is.

   By how much depends on where the piece is. The spread between the two
   edges is multiplied by the distance from the vanishing point, so the
   further you pan a piece from the middle of the screen the wider its box
   gets, with the piece itself never changing size at all. Measured on a
   note at a fixed zoom: 108px in the middle of the screen, 129px panned
   right, 91px panned left. The GL layer set every model's scale straight
   from that number, so the chest and the bin — which sit off to the sides
   — swelled and shrank as the table moved under them. That is what
   grumkata saw: "whenever I move the table the toolbox and bin move extra
   ... they seem to grow".

   The fix is to stop measuring the box and measure the piece. The plane
   is tilted about X ONLY, so depth varies down a face and not across it:
   every point on a horizontal line through the middle of a piece is at
   the SAME depth, and that line projects to a straight segment whose
   width is the piece's true width on screen and whose ends are its true
   edges. So each anchor gets a hairline of zero height laid across it,
   and the browser projects that for us — no duplicated matrix maths, and
   it keeps working if the tilt or the perspective ever changes.

   Two of them, because a piece that STANDS UP is planted at the front
   edge of its footprint, and that edge is nearer the camera than the
   middle is — a second depth, needing its own line. */
const MARK = 'position:absolute;left:0;right:0;height:0;margin:0;padding:0;' +
             'border:0;background:none;pointer-events:none;visibility:hidden';
function markOf(el, foot) {
  const key = foot ? '_glFoot' : '_glMid';
  let m = el[key];
  if (!m || m.parentNode !== el) {
    m = doc.createElement('i');
    m.setAttribute('aria-hidden', 'true');
    m.style.cssText = MARK + ';top:' + (foot ? '100%' : '50%');
    el.appendChild(m);
    el[key] = m;
  }
  return m;
}

/* A hairline is positioned against its host, so the host has to BE a
   containing block or the line spans some ancestor instead and measures
   the wrong thing entirely. Every anchor on the wood already is one —
   `.prop` is absolute, so is `.fg-stand` — but this is not the sort of
   thing to assume, and asking costs one style read per element for as
   long as that element lives, not one per frame.

   Flat anchors — a slot in the tray, a piece in the hand — are welcome to
   the hairline too: with no tilt there is no trapezoid, so the line and
   the box agree and the answer is the same either way. */
function canMark(el) {
  if (el._glMarkable === undefined) {
    let ok = false;
    try { ok = root.getComputedStyle(el).position !== 'static'; } catch (e) {}
    el._glMarkable = ok;
  }
  return el._glMarkable;
}

/* Where a model should stand, and how big it should be, in the layer's own
   coordinates. Returns null when the anchor is not on screen. */
function anchorOf(el, foot) {
  const r = rectOf(el);
  if (!r) return null;
  const box = { x: r.left + r.width / 2,
                y: foot ? r.bottom : r.top + r.height / 2,
                w: r.width };
  if (!canMark(el)) return box;
  const mid = markOf(el, false).getBoundingClientRect();
  const at = foot ? markOf(el, true).getBoundingClientRect() : mid;
  /* a hairline that measures nothing means the piece has no box after all */
  if (!mid.width) return box;
  return { x: at.left + at.width / 2, y: at.top, w: mid.width };
}

/* the same, in world coordinates, ready to hand to a model */
function siteOf(el, foot) {
  const a = anchorOf(el, foot);
  if (!a) return null;
  a.wx = a.x - OX;
  a.wy = OY - a.y;
  return a;
}

/* draw one model over the rect of the DOM anchor that stands for it */
/* ── EVERYTHING ON THE WOOD SITS AT THE WOOD'S DEPTH ──────────
   grumkata: "on table view it looks like the toolbox and bin are floating
   on top of the table".

   Mine, and recent. Until the room arrived, the middle of the wood was at
   depth nought and so was everything standing on it — one plane, no
   argument. Then the wood was given its real depth (it is a third of the
   lens in front of the film even lying flat) and these were left behind at
   nought: a hundred and thirty pixels NEARER the camera than the surface
   they are supposed to be resting on. Their own shadows are cast on a
   catcher plane at that wrong depth too, so the shadow slides out from
   under the object, which is the exact visual cue for "this is hovering".

   Same arithmetic as the table: take the measured rect, which is already
   divided by the perspective, and scale it back by the depth it is really
   at. Screen position and screen size come out identical — what changes is
   that the thing is now standing on the floor it appears to stand on. */
function woodZ() { return root.__stageZ ? root.__stageZ() : 0; }
function woodF(z) { return z ? Math.max(0.08, (PERSP - z) / PERSP) : 1; }

function stand(obj, anchorId, lean, yaw, el, foot) {
  if (!obj) return;
  const a = el || (anchorId && doc.getElementById(anchorId));
  /* BY THE FEET, for anything that stands up. A piece normalised about its
     middle and planted at the middle of its anchor is half sunk into the
     wood; a standing figure has to touch the board at the front edge of the
     footprint reserved for it, which is where its own shadow is drawn. */
  const p = siteOf(a, foot);
  obj.visible = !!p;
  if (!p) return;
  obj.rotation.set(Math.PI / 2 - tilt() - lean, yaw, 0);
  const z = woodZ(), f = woodF(z);
  obj.position.set(p.wx * f, p.wy * f, z);
  const w = p.w * f;
  obj.scale.set(w, w, w);
}

/* ══ COUNTERS THAT STAND UP ════════════════════════════════════
   grumkata: "tokens still dont do what there supposed to do also they are
   flat for some weird ass reason". They were flat because they were a drawing
   of a disc — a circle with a letter in it, lying on the wood, seen from
   above. A counter on a table is a PIECE: it has a base and it stands up out
   of it, and that is the only reason you can tell at a glance where anybody
   is.

   So the disc is now an anchor like everything else here, and this layer
   stands the real thing on it: a meeple for a nameless body, a pawn for
   somebody with a record, a flag for a formation — in that side's colour, out
   of the boardgame bits pack. And if the counter has been given a face, the
   face is what stands: a printed standee on its own base, which is what a
   picture on a counter is at a real table.

   Driven off the DOM rather than off the model, deliberately. The same
   drawing is the piece on the wood, the piece in your hand and the piece in
   a tray slot, and all three want the real object — walking the elements
   that ask for one gets all three with no bookkeeping. */
const standees = new Map();
const STAND_LEAN = 0.52;
function bitFor(shape, side) {
  if (typeof BITS === 'undefined') return null;
  const c = side === 'en' ? 'red' : 'blue';
  return BITS[shape === 'flag' ? 'flag_A_' + c
            : shape === 'pawn' ? 'pawn_A_' + c
            : 'meeple_' + c] || null;
}

/* a picture standing on a base — the printed standee */
function standeeOf(src, side) {
  const g = new THREE.Group();
  let top = 0, cx = 0, cz = 0, wide = 1;
  const base = typeof BITS !== 'undefined'
    ? BITS[side === 'en' ? 'token_red' : 'token_blue'] : null;
  if (base) {
    const bm = mesh(base.prims, BITS_TEX, DRESS.bits);
    g.add(bm);
    const bb = new THREE.Box3().setFromObject(bm);
    top = bb.max.y; cx = (bb.min.x + bb.max.x) / 2; cz = (bb.min.z + bb.max.z) / 2;
    wide = Math.max(bb.max.x - bb.min.x, 1e-3);
  }
  /* THE CARD IS SHAPED BY THE PICTURE, not the other way round: a portrait
     stays a portrait. Its proportions are known the moment the image decodes,
     so the card is rebuilt to them then. */
  const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide,
                                            transparent: true, alphaTest: 0.02 });
  waiting++;
  mat.map = new THREE.TextureLoader().load(src, t => {
    const im = t.image, ar = im && im.width ? im.height / im.width : 1.3;
    card.geometry.dispose();
    card.geometry = new THREE.PlaneGeometry(wide, wide * ar);
    card.position.set(cx, top + wide * ar / 2, cz);
    landed();
  }, undefined, landed);
  mat.map.encoding = THREE.sRGBEncoding;
  const card = new THREE.Mesh(new THREE.PlaneGeometry(wide, wide * 1.3), mat);
  card.position.set(cx, top + wide * 0.65, cz);
  g.add(card);
  return g;
}

function buildStandee(el) {
  const parts = (el.dataset.stand || '').split('|');
  const shape = parts[0] || 'meep', side = parts[1] || 'al';
  const img = el.parentNode && el.parentNode.querySelector('.fg-disc img');
  const src = img ? img.getAttribute('src') : '';
  const sig = shape + '|' + side + '|' + (src ? src.length + ':' + src.slice(-24) : '');
  let inner = null;
  if (src) inner = standeeOf(src, side);
  else {
    const b = bitFor(shape, side);
    if (b) { inner = new THREE.Group(); inner.add(mesh(b.prims, BITS_TEX, DRESS.bits)); }
  }
  if (!inner) return null;
  const g = normalise(inner, false, true);      /* feet at the origin */
  scene.add(g);
  return { g: g, sig: sig };
}

function syncStandees() {
  if (!scene) return;
  const live = doc.querySelectorAll('.fg-stand[data-stand]');
  const seen = new Set();
  live.forEach(el => {
    seen.add(el);
    let e = standees.get(el);
    /* rebuild when what it IS changed — turned over to the other side, given
       a face, made into a formation */
    if (e && e.want !== undefined && e.want !== el.dataset.stand) e = null;
    if (!e) {
      const old = standees.get(el);
      if (old) { scene.remove(old.g); standees.delete(el); }
      const made = buildStandee(el);
      if (!made) return;
      made.want = el.dataset.stand;
      standees.set(el, made);
      e = made;
    }
    /* A STANDING FIGURE LEANS TOWARD YOU. This is the one place the old
       LEAN cheat was actually right: the chest and the wood have real
       footprints on the board and must share its angle exactly, but a meeple
       seen from a camera this close to overhead is a coloured blob, and the
       whole point of a piece is that you can tell what it is at a glance. A
       third of a right angle is enough to give it a silhouette. */
    stand(e.g, null, STAND_LEAN, 0, el, true);
  });
  standees.forEach((e, el) => {
    if (seen.has(el)) return;
    scene.remove(e.g); standees.delete(el);
  });
}

/* ══ THE MODELS SOMEBODY PUT ON THE TABLE ══════════════════════
   grumkata: "3d models dont work at all even though i have so many assets to
   use". They did not work because nothing drew them: a model on the wood was
   a CSS drawing of a grey box. It is the same trick as the chest — an
   invisible .prop is the anchor, and this layer paints the real thing over
   its rect every frame, so it pans, zooms and tilts with the table for free.

   Keyed by the THING's id, so moving one is free and only adding or removing
   one costs a build. */
const staged = {};
const DRESS_PLAIN = { metal: { mul: [1,1,1], rough: 0.44, metalness: 0.75 },
                      wood:  { mul: [1,1,1], rough: 0.66, metalness: 0.0 } };

function stageOne(id, modelId) {
  const m = root.Library && root.Library.models.get(modelId);
  if (!m) return null;
  const body = new THREE.Group();
  body.add(mesh(m.prims, m.tex, DRESS[m.dress] || DRESS_PLAIN));
  const g = normalise(body);
  scene.add(g);
  return { g: g, model: modelId };
}

/* called by the props layer whenever the set of models on the table changes */
function sync(list) {
  if (!scene) return;
  const want = {};
  (list || []).forEach(t => { want[t.id] = t.model; });
  Object.keys(staged).forEach(id => {
    if (want[id] === staged[id].model) return;
    scene.remove(staged[id].g); delete staged[id];
  });
  Object.keys(want).forEach(id => {
    if (staged[id]) return;
    const made = stageOne(id, want[id]);
    if (made) staged[id] = made;
  });
}

/* ══ A PICTURE OF A MODEL, FOR THE BOX ═════════════════════════
   grumkata: "toolbox previews should be previews not an artist
   interpretation". So a model's preview is the model, rendered once at boot
   into its own little canvas and cached — not a CSS drawing of a cube that
   happens to be grey.

   Its own renderer, deliberately: reading pixels back out of the live one
   means synchronising with the animation loop, and a 192px context costs
   almost nothing next to the one already running full-screen. */
let shot = null, shotCam = null, shotScene = null;
const thumbs = {};
function thumb(modelId, px) {
  px = px || 192;
  const key = modelId + '@' + px;
  if (thumbs[key]) return thumbs[key];
  const m = root.Library && root.Library.models.get(modelId);
  if (!m || typeof THREE === 'undefined') return null;
  ensureShot();
  return shotOf(m.prims, m.tex, DRESS[m.dress] || DRESS_PLAIN, key, px);
}

function ensureShot() {
  if (shot) return;
  const cv2 = doc.createElement('canvas');
  shot = new THREE.WebGLRenderer({ canvas: cv2, alpha: true, antialias: true,
                                   preserveDrawingBuffer: true });
  shot.outputEncoding = THREE.sRGBEncoding;
  shotScene = new THREE.Scene();
  shotScene.add(new THREE.AmbientLight(0xffeccd, 0.62));
  const k1 = new THREE.DirectionalLight(0xfff4dd, 0.9);  k1.position.set(-2, 3, 3);
  const k2 = new THREE.DirectionalLight(0x9ab4d0, 0.30); k2.position.set(3, 1, -2);
  shotScene.add(k1, k2);
  shotCam = new THREE.PerspectiveCamera(26, 1, 0.1, 40);
  /* three quarters on and a little above: the angle every parts catalogue
     has used since parts catalogues existed, because it shows depth. Close
     enough that a model normalised to one unit FILLS its little frame —
     further out and every preview is a speck in the middle of a slot. */
  shotCam.position.set(1.32, 1.02, 1.74);
  shotCam.lookAt(0, 0, 0);
}

/* the picture-taking half, so anything with prims can have a preview */
function shotOf(prims, book, dress, key, px) {
  shot.setSize(px, px, false);
  const body = new THREE.Group();
  body.add(mesh(prims, book, dress));
  const g = normalise(body);
  shotScene.add(g);
  let out = null;
  try { shot.render(shotScene, shotCam); out = shot.domElement.toDataURL('image/png'); }
  catch (e) { out = null; }
  /* only KEEP it if every texture THIS MODEL hangs on has arrived — asked
     of the group itself rather than of the global counter, which cannot
     see a picture that was already on its way when this asked for it */
  const keep = allTexReady(g);
  shotScene.remove(g);
  if (!keep) return out;
  return (thumbs[key] = out);
}

/* ── AND THE COUNTER IN A SLOT IS THE PIECE, TOO ──────────────
   grumkata, in the same breath as "toolbox previews should be previews not an
   artist interpretation": tokens "are flat". On the wood the real piece is
   stood on the counter's anchor — but a hotbar slot sits at z-index 1200 and
   the GL layer is at 870, so a standee drawn there would be behind the plank.
   A slot gets a photograph of the same piece instead, taken by the same
   camera that photographs every model in the box. */
function bit(shape, side, px) {
  px = px || 128;
  if (typeof BITS === 'undefined' || typeof THREE === 'undefined') return null;
  const b = bitFor(shape, side);
  if (!b) return null;
  const key = 'bit:' + shape + ':' + side + '@' + px;
  if (thumbs[key]) return thumbs[key];
  ensureShot();
  return shotOf(b.prims, BITS_TEX, DRESS.bits, key, px);
}

/* ── DRAWING ONLY WHEN THERE IS SOMETHING TO DRAW ─────────────
   The loop below used to run its whole body sixty times a second for
   ever: a DOM query and two layout reads per model, another pass over
   every standee, and TWO full WebGL renders — all of it whether the
   table had moved or not, and whether you were even looking at it.
   A table sitting still cost exactly as much as one being dragged.

   `invalidate()` marks a few frames as worth drawing. Everything that
   can change what the table looks like calls it: the camera, a piece
   moving, a repaint, a texture arriving, the window resizing.

   And there is a heartbeat. If some future change forgets to call
   invalidate, the cost is one stale half-second, not a frozen table —
   which is the right way round for a bug nobody has made yet. */
let dirty = 8, beat = 0, drawn = 0, overDrawn = false;
/* `lightOnly` means: draw another frame, but nothing has MOVED — so the
   shadow maps that are already on the card are still correct. The fire is
   the only caller, and it is the caller that runs twelve times a second
   for as long as you are in the room. */
let shadowDirty = true, shadowAt = 0;
function invalidate(n, lightOnly) {
  dirty = Math.max(dirty, n == null ? 4 : n);
  if (!lightOnly) shadowDirty = true;
}
/* Two seconds. Long enough that a still table costs almost nothing, short
   enough that a missed invalidate() shows up as a brief stale patch rather
   than a table that has stopped responding. */
const HEARTBEAT = 2000;

function frame(ts) {
  requestAnimationFrame(frame);
  if (!camera) return;
  /* NOT WHILE YOU ARE LOOKING AT THE HALL. The room is built before anyone
     asks for a table now (28-table-boot.js), which means this loop is alive
     from about a second after the app opens — and without this line it
     would spend the rest of your time in the hall measuring, standing and
     drawing thirty-seven thousand triangles of a room nobody can see, in
     the frames the hall and its screens need for their own animation.
     One class check is the whole price of not doing that. */
  if (!doc.body.classList.contains('at-table')) return;

  const busy = dirty > 0 || waiting > 0 || Math.abs(lidU - lidWant) > 0.001;
  if (!busy) {
    if ((ts || 0) - beat < HEARTBEAT) return;      /* nothing is moving: rest */
  }
  beat = ts || 0; drawn++;
  if (dirty > 0) dirty--;

  /* every model somebody put down, over the rect of its own anchor.
     The element is remembered rather than looked up again every frame —
     an attribute-selector query per model per frame is a real cost once
     there is more than a handful of them on the wood. */
  for (const id in staged) {
    const st = staged[id];
    if (!st.el || !st.el.isConnected) {
      st.el = doc.querySelector('.prop.t3-model[data-id="' + id + '"]');
    }
    stand(st.g, null, 0, 0.5, st.el);
  }

  syncStandees();

  const a = doc.getElementById('tb-anchor');
  const vp = doc.getElementById('vp');
  const vpr = (vp && !vp.hidden) ? vp.getBoundingClientRect() : null;
  clipTo(vp, vpr);
  aim(vpr);
  /* one measurement, not two — this took a rect through onScreen() and then
     another of the same element on the line below. And it is the anchor's
     own middle line now, not the box around its projection: see anchorOf. */
  /* ── AND THEY DO NOT STAND DOWN ───────────────────────────
     These used to be hidden the moment you leaned back, on the argument
     that they are tools for working the table from above and that the
     over-canvas has no depth test against the room, so seated they would
     paint over the tavern.

     grumkata, twice: "the toolbox and bin are still dissapearing". He is
     right and the argument was wrong. They are not a top-down affordance,
     they are the two things on the table you always need to be able to
     reach — and the clipping the argument was defending against was never
     the missing depth test. It was the room being drawn in the wrong
     place, which is fixed: the chest stands ON the wood, the room is
     BEHIND the wood, so nothing in the room is ever between you and it
     and there is nothing for the depth test to have decided. */
  const ar = (vp && !vp.hidden) ? siteOf(a, false) : null;
  chest.visible = !!ar;
  stand(bin, 'tb-bin-prop', 0, 0.5);

  if (ar) {
    const cx = ar.wx, cy = ar.wy;
    if (Math.abs(lidU - lidWant) > 0.001) invalidate(2);
    /* Stand it ON the board. gl.js calls this AXIS: a model whose up is +Y
       has to be tipped a quarter turn to stand on the board's normal, LESS
       the board's own tilt. Using -tilt alone (the board's angle) leaves the
       chest lying flat against the screen, facing the camera.

       NO EXTRA LEAN. There used to be one, tipping every model a further 33
       degrees toward the viewer "so you could see more of it" — a fudge from
       when the table was a flat CSS rectangle and nothing had a real surface
       to stand on. The wood is a real model now and it is placed at exactly
       this angle; anything standing on it that uses a different one is
       visibly sinking into it. */
    chest.rotation.set(Math.PI / 2 - tilt(), YAW, 0);
    const cz = woodZ(), cf = woodF(cz);
    chest.position.set(cx * cf, cy * cf, cz);
    /* the model is one unit on its longest side, so its screen size IS the
       anchor's width — it zooms with the table for free */
    const s = ar.w * cf;
    chest.scale.set(s, s, s);

    /* the lid eases rather than snapping; the asset's own two extremes */
    if (Math.abs(lidU - lidWant) > 0.001) {
      lidU += (lidWant - lidU) * 0.18;
      lidGroup.quaternion.copy(QS).slerp(QO, lidU);
    }
  }
  /* ── DON'T SWITCH CONTEXTS FOR AN EMPTY CANVAS ────────────
     This file runs TWO WebGL contexts — models over the pieces, wood and
     room under them — and switching between them is one of the more
     expensive things a frame can do on real hardware, whatever a software
     renderer says about it. Leaned back, the chest and the bin have stood
     down and the over-canvas often holds nothing at all; rendering an
     empty scene still pays the switch. So don't. */
  let over = chest.visible || (bin && bin.visible) || standees.size > 0;
  if (!over) for (const id in staged) { if (staged[id].g.visible) { over = true; break; } }
  /* half a second is the insurance: if some future change moves something
     without saying so, the shadow is stale for two frames rather than for
     ever, which is the right way round for a bug nobody has made yet */
  if ((ts || 0) - shadowAt > 500) shadowDirty = true;
  if (shadowDirty) {
    renderer.shadowMap.needsUpdate = true;
    if (uRen) uRen.shadowMap.needsUpdate = true;
    shadowAt = ts || 0;
  }
  const cz2 = woodZ();
  if (catcher) catcher.position.set(0, 0, cz2 - 2);
  if (uCatch) uCatch.position.set(0, 0, cz2 - 2);
  if (over) { renderer.render(scene, camera); overDrawn = true; }
  else if (overDrawn) { renderer.clear(); overDrawn = false; }
  if (uRen) {
    placeTable();
    /* a fire is never still, so while the room is up this layer never
       idles — that is the one thing worth the frames in here */
    const t = (ts || 0) / 1000;
    if (roomGroup) {
      const u = root.__viewU ? root.__viewU() : 0;
      showRoom(u > 0.5);
      roomLook(u);
      /* ── LOOKING THROUGH THE CEILING ──────────────────────
         Over the wood the eye is ON the table's normal, so anything
         hanging above the table — a chandelier, a rafter, a banner — is
         directly between you and the thing you are working on. That is
         the board across the view. They come in as you sit back and are
         gone by the time you are over the table. */
      /* ── AND THE ROOF COMES ON WHEN YOU ARE UNDER IT ──────
         This was a guessed number on the travel, and a guessed number is
         wrong at one end or the other: at 0.28 the eye is still well
         ABOVE the ridge, so the ceiling was switched on while you were
         looking down through where it is. What decides it is not how far
         through the move you are, it is whether your head is under the
         roof — which is a thing the table layer can simply be asked. */
      if (overGroup) {
        const up = root.__eye ? root.__eye().up : 9;
        overGroup.visible = up < (FLOOR_Y + WALL_H) - 0.15;
      }
      /* A FIRE AT TWELVE FRAMES A SECOND. It flickers on its own clock
         anyway (see the note on Quake light styles), so driving it at
         sixty only spent frames — and because it invalidated every one
         of them, the whole layer could never idle. */
      if (t - fireT > 0.083) { fireT = t; tickFire(t); invalidate(2, true); }
    }
    drawUnder(t);
  }
  shadowDirty = false;
}

function setOpen(v) { lidWant = v ? 1 : 0; invalidate(30); }

/* anything that changes the page can wake the loop without knowing how it
   works: a resize, a scroll, a press, a key */
['resize','scroll'].forEach(k => root.addEventListener(k, () => invalidate(6), true));
['pointerdown','pointermove','pointerup','wheel','keydown']
  .forEach(k => root.addEventListener(k, () => invalidate(6), { passive: true, capture: true }));

/* what the room editor needs: the plan, a way to replace it, and the
   list of everything that could go in it */
function planRows() { return roomPlan().map(r => Object.assign({}, r)); }
function planKinds() {
  const out = { R: [], T: [] };
  if (typeof ROOM !== 'undefined') out.R = Object.keys(ROOM).sort();
  if (typeof TAVERN !== 'undefined') out.T = Object.keys(TAVERN).sort();
  return out;
}
/* WHAT THE FRAME ACTUALLY COSTS. grumkata's lag is the one thing left
   that I cannot reproduce here — this container renders through a software
   rasteriser, so wall-clock timings measured in it say nothing about his
   machine. Draw calls, triangles, programs and lights do NOT depend on the
   renderer, so those are the numbers worth reading, and this is how. */
function glStats() {
  const one = (r, sc) => {
    if (!r) return null;
    const i = r.info;
    return { calls: i.render.calls, tris: i.render.triangles,
             geoms: i.memory.geometries, texs: i.memory.textures,
             programs: i.programs ? i.programs.length : -1,
             lights: sc ? sc.children.filter(o => o.isLight).length : -1 };
  };
  return { over: one(renderer, scene), under: one(uRen, uScene),
           roomLights: lit.length };
}
root.__glStats = glStats;
/* every flame that is currently alight, and where. A light burning in
   clear air is the one room bug that looks like magic rather than a
   mistake, so it should be one call to check for. */
root.__flames = () => {
  const out = [];
  if (flamePool) for (const f of flamePool) if (f.visible)
    out.push([+f.position.x.toFixed(2), +f.position.y.toFixed(2), +f.position.z.toFixed(2)]);
  return out;
};

/* ══ WHAT IS THAT THING ════════════════════════════════════════
   The room is merged into five buffers, so a raycast can only ever answer
   "the oak bucket" — useless for "what is that floating chair". But the
   room is also a LIST, and every row's place is known exactly, so each one
   can be pushed through the same transform the renderer uses and asked
   where it lands on screen.

   Point at a pixel, get the rows nearest it, nearest first. Three guesses
   at the same complaint is two too many; this is how it should have been
   settled the first time. */
root.__what = (sx, sy, n) => {
  if (!roomGroup || !camera) return [];
  const rows = roomPlan(), out = [], v = new THREE.Vector3();
  const W = root.innerWidth, H = root.innerHeight;
  roomGroup.updateMatrixWorld(true);
  for (const r of rows) {
    if (!r.m) continue;
    const lib = r.p === 'T' ? (typeof TAVERN !== 'undefined' ? TAVERN : null)
                            : (typeof ROOM   !== 'undefined' ? ROOM   : null);
    const mm = lib && lib[r.m];
    if (!mm) continue;
    /* the middle of the model's own box, so a tall thing reports its middle */
    let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    for (const pr of mm.prims) for (let i = 0; i < pr.p.length; i += 3)
      for (let k = 0; k < 3; k++) { const q = pr.p[i + k];
        if (q < lo[k]) lo[k] = q; if (q > hi[k]) hi[k] = q; }
    const sc = r.s == null ? 1 : r.s;
    const sx3 = r.sx != null ? r.sx : sc, sy3 = r.sy != null ? r.sy : sc,
          sz3 = r.sz != null ? r.sz : sc;
    const cx = (lo[0] + hi[0]) / 2 * sx3, cy = (lo[1] + hi[1]) / 2 * sy3,
          cz = (lo[2] + hi[2]) / 2 * sz3;
    const th = (r.r || 0) * Math.PI / 180, C = Math.cos(th), S = Math.sin(th);
    v.set(r.x + cx * C + cz * S, FLOOR_Y + (r.y || 0) + cy, r.z - cx * S + cz * C);
    roomGroup.localToWorld(v);
    v.project(camera);
    const px = (v.x * 0.5 + 0.5) * W, py = (-v.y * 0.5 + 0.5) * H;
    out.push({ m: r.m, at: [r.x, r.y || 0, r.z], over: r.over ? 1 : 0,
               px: Math.round(px), py: Math.round(py),
               d: Math.round(Math.hypot(px - sx, py - sy)) });
  }
  /* and the things that are not rows: the seats, and whatever hangs
     overhead, because a "floating chair" is exactly the sort of thing that
     would not be in the plan at all */
  const extra = (g, tag) => { if (!g) return;
    g.updateMatrixWorld(true);
    g.children.forEach((o, i) => {
      o.getWorldPosition(v); v.project(camera);
      const px = (v.x * 0.5 + 0.5) * W, py = (-v.y * 0.5 + 0.5) * H;
      out.push({ m: tag + '#' + i, at: [+o.position.x.toFixed(2),
                 +o.position.y.toFixed(2), +o.position.z.toFixed(2)], over: 0,
                 px: Math.round(px), py: Math.round(py),
                 d: Math.round(Math.hypot(px - sx, py - sy)) });
    });
  };
  extra(seatRoot, 'SEAT');
  extra(overGroup, 'OVERHEAD');
  if (chest && chest.visible) { chest.getWorldPosition(v); v.project(camera);
    out.push({ m: 'CHEST', at: [0,0,0], over: 0,
               px: Math.round((v.x*0.5+0.5)*W), py: Math.round((-v.y*0.5+0.5)*H),
               d: Math.round(Math.hypot((v.x*0.5+0.5)*W - sx, (-v.y*0.5+0.5)*H - sy)) }); }
  out.sort((a, b) => a.d - b.d);
  return out.slice(0, n || 6);
};
/* ══ IS THE EYE ACTUALLY FIXED IN THE ROOM? ════════════════════
   The test that found the reversed yaw, kept because it is the only
   honest way to ask the question. Everything else about a turn can look
   plausible while being wrong — the room is roughly symmetric, the table
   is round, and a scene sliding past at twice the rate reads as "weird"
   rather than as "the sign is inverted".

   So do not look at it: ask the ROOM where the camera is. Standing still
   and turning your head means that answer does not change, at any angle,
   ever. It came back (-0.05, 0.62, 1.24) at nought, at thirty-two and at
   sixty-four degrees, and that is the whole proof.

   It also reports how far off every seat is, in metres, which settles
   "that banner looks too close" without squinting at a screenshot. */
root.__near = () => {
  const out = [];
  if (roomGroup && camera) {
    const o = new THREE.Vector3().setFromMatrixPosition(roomGroup.matrixWorld);
    const e = roomGroup.worldToLocal(camera.position.clone());
    out.push({ seat: 'ROOM', at: 0, m: +(o.distanceTo(camera.position) / roomGroup.scale.x).toFixed(3),
               eyeInRoom: [+e.x.toFixed(2), +e.y.toFixed(2), +e.z.toFixed(2)],
               w: +roomGroup.scale.x.toFixed(1) });
  }
  if (!seatRoot || !camera) return out;
  const p = new THREE.Vector3();
  seatRoot.updateMatrixWorld(true);
  seatRoot.children.forEach((g, i) => g.traverse(o => {
    if (!o.isMesh) return;
    o.getWorldPosition(p);
    out.push({ seat: i, at: Math.round((g.rotation.y * 180 / Math.PI)),
               m: +(p.distanceTo(camera.position) / (roomGroup ? roomGroup.scale.x : 1)).toFixed(2),
               w: +(o.geometry.parameters ? (o.geometry.parameters.width || 0) : 0).toFixed(2) });
  }));
  return out;
};

/* ══ WARMING THE ROOM ═══════════════════════════════════
   Every material in here is compiled the first time something wearing it is
   drawn — which is the first frame of the table, i.e. the frame the player
   is watching, i.e. the hitch. `renderer.compile()` walks the scene and
   builds every program up front instead, so it can be done somewhere
   nobody is waiting: 28-table-boot.js runs it as its own step, under the
   cloth, with a frame either side of it.

   It is only half the fix. The other half is 09-blazon3d.js's `tune()`,
   which stops three.js dragging each link back onto the main thread —
   without that, moving the compile just moves the freeze. */
function warm() {
  try {
    if (renderer && scene && camera) { renderer.compile(scene, camera); renderer.render(scene, camera); }
    if (uRen && uScene && camera) { uRen.compile(uScene, camera); uRen.render(uScene, camera); }
  } catch (e) { /* a room that will not pre-compile still draws normally */ }
}
/* Pre-UPLOADING the textures as well was tried here (traverse the scene,
   renderer.initTexture on every map) and measured as nothing: the tavern's
   albedos are fetched asynchronously and mostly are not there yet when the
   room is warmed, so there was nothing to push. Left out rather than left
   in, since code that claims to do something it does not is worse than the
   half-second it was meant to save. */

root.TableGL = { build, warm, setOpen, sync, thumb, bit, onTextures, invalidate, showRoom, lens, syncSeats,
  planRows, planKinds, setPlan, resetPlan, defaultPlan: () => TAVERN_PLAN.map(r => Object.assign({}, r)),
  stats: glStats,
  get frames() { return drawn; },
  get waiting() { return waiting; },
  get ready() { return !!renderer; } };

})(window, document);
