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
  body.add(mesh(WOOD.Table_Round_A.prims, WOOD_TEX, DRESS.timber));
  /* TOP SURFACE AT THE ORIGIN, not the model's middle: the plane the pieces
     live on IS the table top, so that is the part that has to line up. */
  /* it casts (onto the pieces layer it never reaches, harmlessly) but above
     all it RECEIVES — a chest standing on the wood darkens the wood */
  tableObj = casts(normalise(body, true));
  uScene.add(tableObj);
  buildRoom();
  buildPost();
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
let roomGroup = null, roomBuilt = false;
const TABLE_M = 1.2;      /* the round table is about four feet across */
const FLOOR_Y = -0.75;    /* table top to floor, in metres */
const WALL_H = 3.12;      /* the village kit's own wall height */
const RX = 5, RZ = 4;     /* half-width and half-depth of the room */

/* one model out of a baked pack, placed in metres. `s` scales the model
   itself, for kits that were authored at a different size to this one. */
function put(lib, book, name, dressing, x, y, z, ry, s) {
  const m = lib && lib[name];
  if (!m) return null;
  const g = mesh(m.prims, book, dressing);
  g.position.set(x, y, z);
  if (ry) g.rotation.y = ry;
  if (s) g.scale.setScalar(s);
  /* NO SHADOWS IN THE ROOM. Thirty objects casting into one shadow map
     buys a slightly darker corner and costs a frame; the room reads off
     its own baked textures and the lamp above the table. */
  g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  roomGroup.add(g);
  return g;
}

/* ══ LIGHTING A ROOM, WHICH IS NOT LIGHTING A TABLE ════════════
   The table is lit by three directionals and a little ambient, which is
   correct for a board seen from above: you want every square as legible
   as every other square. Point that same rig at a room and you get the
   thing grumkata called lackluster — a lit box, every corner as bright as
   the hearth, nothing anywhere to look at.

   THE SINGLE BIGGEST CAUSE, and it is a one-line bug in disguise. This is
   three r128, whose punctual falloff reads:

       if ( cutoffDistance > 0.0 && decayExponent > 0.0 )
         return pow( saturate( -lightDistance / cutoffDistance + 1.0 ), decayExponent );
       return 1.0;                    // <- PointLight's default distance is 0

   A light with no `distance` returns 1.0 at EVERY distance. Not a steep
   falloff, not a subtle one: none at all. So every lamp in a naive rig
   floods the whole room evenly and no amount of fiddling with intensity
   will ever make a dark corner. Every light in here carries an explicit
   reach, and every reach is SHORTER THAN THE ROOM, which is what leaves
   the corners to the hearth and the moon.

   The hearth is three lights, not one, and that split is most of the
   warmth: a small bright core that casts the shadows, a wide dim bath at
   low decay that makes the room feel warm without making it feel lit, and
   a spot out of the fireplace mouth so the light has somewhere it is
   coming FROM. Only the spot casts — one 2D shadow map instead of a point
   light's six cube faces.

   And one cold source. Without it an orange room is a sepia photograph;
   blue shadows are what make firelight read as hot.

   Distances are in metres and pushed to world units in placeRoom(), since
   this layer measures in pixels and a metre is however many pixels a 1.2m
   table happens to be right now. */
let hearth = null, fireCore = null, fireBath = null, fireSpill = null;
let candleLights = [], moteField = null, emberMats = [];
const lit = [];   /* everything whose `distance` is really metres */

function lamp(L, metres) { L.userData.m = metres; lit.push(L); return L; }

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

  fireSpill = lamp(new THREE.SpotLight(0xff8f38, 2.1, 8.0, 1.15, 0.75, 1.6), 8.0);
  fireSpill.position.set(0, 0.1, 0.2);
  fireSpill.target.position.set(0.4, -0.9, 3.4);
  fireSpill.castShadow = true;
  fireSpill.shadow.mapSize.set(1024, 1024);
  fireSpill.shadow.bias = -0.0012;
  fireSpill.shadow.radius = 3;
  hearth.add(fireCore, fireBath, fireSpill, fireSpill.target);

  /* candles: small reach, no shadows, and each one gets its own phase in
     tickFire — two candles guttering in step is instantly fake */
  candleLights = [[0, 0.42, 0], [-RX + 1.0, FLOOR_Y + 1.15, -2.8],
                  [RX - 1.5, FLOOR_Y + 1.05, -2.9], [-RX + 0.5, FLOOR_Y + 1.9, 1.2]]
    .map(p => {
      const l = lamp(new THREE.PointLight(0xffb46b, 0.62, 2.9, 2.0), 2.9);
      l.position.set(p[0], p[1], p[2]);
      roomGroup.add(l);
      return l;
    });

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
let fseed = Math.random() * 97;

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
  for (const m of emberMats) m.emissiveIntensity = 1.6 + 1.1 * n;
  if (moteField) { moteField.position.y = Math.sin(t * 0.11) * 0.06;
                   moteField.rotation.y = t * 0.008; }
}

function buildRoom() {
  if (roomBuilt || typeof ROOM === 'undefined') return;
  roomBuilt = true;
  roomGroup = new THREE.Group();
  roomGroup.visible = false;
  uScene.add(roomGroup);

  const R = ROOM, RB = ROOM_TEX;
  const T = (typeof TAVERN !== 'undefined') ? TAVERN : null;
  const TB = (typeof TAVERN_TEX !== 'undefined') ? TAVERN_TEX : null;
  const dr = DRESS.room, dt = DRESS.tavern;
  const HALF = Math.PI / 2;

  /* ── FLOOR AND CEILING ────────────────────────────────────
     The kit's floor tile is 2m square, so the room is a whole number of
     them: five across, four deep. The ceiling is the same tile turned
     over — a plank ceiling is what a plank floor looks like from below,
     and the beams under it are what sell the height. */
  for (let i = -2; i <= 2; i++) {
    for (let j = -2; j <= 1; j++) {
      const x = i * 2, z = j * 2 + 1;
      /* NOT a checkerboard. Alternating the two floor tiles reads as a
         chess board the moment you can see more than four of them —
         which is exactly what a tavern floor must not look like. The
         light boards are scattered thinly instead, and every tile gets a
         quarter turn, so the planking runs different ways like real
         boards laid by someone in a hurry. */
      const hash = ((i * 7 + j * 13) * 2654435761) >>> 0;
      put(R, RB, (hash % 5 === 0) ? 'Floor_WoodLight' : 'Floor_WoodDark',
          dr, x, FLOOR_Y, z, (hash % 2) * Math.PI / 2);
      /* NO CEILING OVER YOUR OWN HEAD. The nearest rows are behind and
         above the eye in a real room — you do not see your own ceiling,
         you see the far one. Drawing them put a featureless brown band
         across the top third of the frame and hid everything the room
         had to offer. */
      if (j <= 0) put(R, RB, 'Floor_WoodDark', dr, x, FLOOR_Y + WALL_H, z, Math.PI);
    }
  }
  /* beams, running the depth of the room under the boards */
  for (let i = -2; i <= 2; i++) {
    const b = put(R, RB, 'Roof_Log', dr, i * 2, FLOOR_Y + WALL_H - 0.20, -1.4, 0);
    if (b) b.scale.set(0.19, 0.19, 0.78);
  }

  /* ── THE FOUR WALLS ───────────────────────────────────────
     Wall pieces are 2m wide and stand from y = 0 up, so they sit on the
     floor and reach the ceiling exactly. The variety is deliberate: a
     tavern with five identical wall panels behind it reads as a corridor.
     Windows go on the long walls, the door on the short one. */
  const back = ['Wall_Plaster_WoodGrid', 'Wall_Plaster_Window_Wide_Round',
                'Wall_Plaster_WoodGrid', 'Wall_Plaster_Window_Wide_Round',
                'Wall_Plaster_WoodGrid'];
  const front = ['Wall_Plaster_Straight', 'Wall_Plaster_WoodGrid',
                 'Wall_Plaster_Door_Round', 'Wall_Plaster_WoodGrid',
                 'Wall_Plaster_Straight'];
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * 2;
    put(R, RB, back[i], dr, x, FLOOR_Y, -RZ, 0);
    put(R, RB, front[i], dr, x, FLOOR_Y, RZ, Math.PI);
    put(R, RB, 'Wall_BottomCover', dr, x, FLOOR_Y, -RZ + 0.22, 0);
  }
  const side = ['Wall_Plaster_WoodGrid', 'Wall_Plaster_Window_Wide_Round',
                'Wall_Plaster_WoodGrid', 'Wall_Plaster_Straight'];
  for (let j = 0; j < 4; j++) {
    const z = (j - 2) * 2 + 1;
    put(R, RB, side[j], dr, -RX, FLOOR_Y, z, HALF);
    put(R, RB, side[3 - j], dr, RX, FLOOR_Y, z, -HALF);
  }
  /* the corners, which are what stop four flat walls reading as a box */
  [[-RX, -RZ, 0], [RX, -RZ, -HALF], [RX, RZ, Math.PI], [-RX, RZ, HALF]]
    .forEach(c => put(R, RB, 'Corner_Interior_Big', dr, c[0], FLOOR_Y, c[1], c[2]));
  /* window frames and shutters, in the holes the wall pieces left */
  [[-2, -RZ, 0], [2, -RZ, 0], [-RX, 1, HALF], [RX, -1, -HALF]].forEach(w => {
    put(R, RB, 'Window_Wide_Round1', dr, w[0], FLOOR_Y + 1.15, w[1], w[2]);
    put(R, RB, 'WindowShutters_Wide_Round_Open', dr, w[0], FLOOR_Y + 1.15, w[1], w[2]);
  });
  put(R, RB, 'Door_2_Round', dr, 0, FLOOR_Y, RZ - 0.12, Math.PI);

  if (!T) return;

  /* ── WHAT MAKES IT A TAVERN AND NOT A ROOM ────────────────
     A hearth you can see the fire in, drink where drink is kept, and
     something overhead. Everything else is dressing, and dressing is
     what stops the corners looking swept. */
  put(T, TB, 'Fireplace',   dt,  0,     FLOOR_Y, -RZ + 0.45, 0);
  put(T, TB, 'FireLog',     dt,  0,     FLOOR_Y + 0.05, -RZ + 0.75, 0.4);
  put(T, TB, 'Cauldron',    dt,  0.85,  FLOOR_Y, -RZ + 0.7, -0.5);
  put(T, TB, 'Chandelier',  dt,  0,     FLOOR_Y + WALL_H - 0.55, 0, 0);

  put(T, TB, 'Rack',        dt, -RX + 0.35, FLOOR_Y, -1.4, HALF);
  put(T, TB, 'Pantry',      dt, -RX + 0.35, FLOOR_Y,  1.2, HALF);
  put(T, TB, 'Barrel',      dt,  RX - 0.6,  FLOOR_Y,  2.6, -0.4);
  put(T, TB, 'BarrelStand', dt,  RX - 0.6,  FLOOR_Y,  1.5, -0.2);
  put(T, TB, 'FlourSack',   dt, -RX + 0.7,  FLOOR_Y,  2.9, 0.8);

  put(T, TB, 'TableLong',   dt,  RX - 1.5,  FLOOR_Y, -2.2, HALF);
  put(T, TB, 'Bench',       dt,  RX - 2.4,  FLOOR_Y, -2.2, HALF);
  put(T, TB, 'BarStool',    dt,  RX - 2.3,  FLOOR_Y,  0.3, 0);
  put(T, TB, 'Stool',       dt, -RX + 1.5,  FLOOR_Y,  2.4, 0.6);

  put(T, TB, 'Jug',         dt,  RX - 1.5,  FLOOR_Y + 0.78, -2.6, 0.3);
  put(T, TB, 'CupMetal',    dt,  RX - 1.35, FLOOR_Y + 0.78, -2.1, 0);
  put(T, TB, 'BottleLong',  dt,  RX - 1.65, FLOOR_Y + 0.78, -1.7, 0);
  put(T, TB, 'Plate',       dt,  RX - 1.4,  FLOOR_Y + 0.78, -1.3, 0);
  put(T, TB, 'Rug',         dt,  0,         FLOOR_Y + 0.01, 0.6, 0.2);
  put(T, TB, 'CandleStand', dt, -RX + 1.0,  FLOOR_Y, -2.8, 0);
  put(T, TB, 'Candelabra',  dt,  RX - 1.5,  FLOOR_Y + 0.78, -2.9, 0);

  fire();
  lightRoom();
  seatRoot = new THREE.Group();
  roomGroup.add(seatRoot);
  syncSeats();
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
const SEAT_R = 1.02;          /* how far out the chairs sit, in metres */
const BANNER_R = 3.55;        /* the banners are on the WALL, not on the chair */

function banner(seat) {
  /* the seat's own image if it has one; the character's arms if not,
     drawn by the hall's heraldry so a seat is never a blank rectangle */
  let src = seat.banner;
  if (!src && root.Heraldry && root.Heraldry.roll) {
    try {
      const svg = root.Heraldry.armsSVG(root.Heraldry.roll(), { w: 220, h: 300 });
      src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    } catch (e) { src = ''; }
  }
  if (!src) return null;
  /* STANDARD, NOT BASIC. A Basic material ignores every light in the
     room, so a banner painted in flat heraldic colour sat there glowing
     like a sticker pasted onto a dark photograph — brighter than the
     fire it was supposed to be lit by. Cloth in a firelit room is cloth:
     it takes the light, it is rough, and the corner it hangs in is dim. */
  const mat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, transparent: true,
                                               alphaTest: 0.02, roughness: 0.96,
                                               metalness: 0, envMapIntensity: 0.3 });
  waiting++;
  mat.map = new THREE.TextureLoader().load(src, landed, undefined, landed);
  mat.map.encoding = THREE.sRGBEncoding;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 1.15), mat);
  return m;
}

function buildSeat(seat) {
  const g = new THREE.Group();
  const T = (typeof TAVERN !== 'undefined') ? TAVERN : null;

  if (T && T.Chair) {
    const ch = mesh(T.Chair.prims, TAVERN_TEX, DRESS.tavern);
    ch.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } });
    ch.position.set(0, FLOOR_Y, 0.16);
    g.add(ch);
  }

  if (seat.face) {
    /* and the same for a face: a person across the table is lit by the
       same hearth as the table is, or they read as a cut-out pasted on */
    const mat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, transparent: true,
                                                 alphaTest: 0.02, roughness: 0.92,
                                                 metalness: 0, envMapIntensity: 0.3 });
    waiting++;
    const card = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.12), mat);
    mat.map = new THREE.TextureLoader().load(seat.face, t => {
      /* THE PICTURE DECIDES THE SHAPE, not the other way round — the same
         rule the counters follow. Known the moment it decodes. */
      const im = t.image, ar = im && im.width ? im.height / im.width : 1.4;
      const w = 0.82;
      card.geometry.dispose();
      card.geometry = new THREE.PlaneGeometry(w, w * ar);
      card.position.y = FLOOR_Y + 0.34 + w * ar / 2;
      landed();
    }, undefined, landed);
    mat.map.encoding = THREE.sRGBEncoding;
    card.position.set(0, FLOOR_Y + 0.92, 0.02);
    g.add(card);
  }

  /* ── THE BANNER IS ON THE WALL ────────────────────────────
     It was hanging in the air a hand's breadth behind the chair, which
     reads as a placard someone is holding rather than a house's colours
     over their place. It belongs on the wall at the same bearing, high
     enough to be over their head — the chair is furniture, the banner is
     the room saying whose table this is. */
  const b = banner(seat);
  if (b) {
    b.position.set(0, FLOOR_Y + 2.05, BANNER_R - SEAT_R);
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
                             '|' + (s.banner || '').length).join(',');
  if (sig === seatSig) return;
  seatSig = sig;
  while (seatRoot.children.length) seatRoot.remove(seatRoot.children[0]);
  for (const s of seats) {
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
        o.material = new THREE.MeshStandardMaterial({
          map: o.material.map, color: 0x3a1c0c, roughness: 0.95, metalness: 0,
          emissive: 0xff4a12, emissiveIntensity: 2.2 });
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

  /* a candle flame over each of the small lights */
  [[0, 0.46, 0], [-RX + 1.0, FLOOR_Y + 1.19, -2.8],
   [RX - 1.5, FLOOR_Y + 1.09, -2.9]].forEach(p => {
    const c = glow(0xffc078, 0.14);
    c.position.set(p[0], p[1], p[2]);
    roomGroup.add(c);
  });

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
    color: 0xffc890, size: 0.016, sizeAttenuation: true, transparent: true,
    opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending,
    fog: false, toneMapped: false }));
  moteField.frustumCulled = false;
  roomGroup.add(moteField);
}

/* Bolt the room to the table: same tilt, same centre, and one metre is
   however many pixels a 1.2m table is wide right now. */
function placeRoom(wx, wy, dia) {
  if (!roomGroup) return;
  roomGroup.rotation.copy(tableObj.rotation);
  roomGroup.position.set(wx, wy, 0);
  const PX = dia / TABLE_M;
  roomGroup.scale.setScalar(PX);
  /* A light's `distance` is read in WORLD units and does not inherit the
     group's scale the way its position does — so every reach written in
     metres up in lightRoom() has to be pushed through by hand whenever the
     zoom changes what a metre is worth. Miss this and the falloff is
     either the whole room or none of it. */
  if (PX !== litPX) {
    litPX = PX;
    for (const L of lit) L.distance = L.userData.m * PX;
    if (fireSpill) {
      const c = fireSpill.shadow.camera;
      c.near = 0.25 * PX; c.far = 9 * PX; c.updateProjectionMatrix();
      fireSpill.shadow.normalBias = 0.02 * PX;
    }
    if (moteField) moteField.material.size = 0.016 * PX;
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
/* ══ THE GRADE, IN A SHADER ════════════════════════════════════
   The CSS grade over the whole app (see #grade in table-body.html) is the
   right tool for the composite, because the picture is half DOM. It is
   the wrong tool for FIRE. A blend mode cannot know that the hearth is
   ten times brighter than the wall behind it — by the time CSS sees the
   frame, both are just pixels somewhere under 1.0, and a flame that
   cannot blow out is a painting of a flame.

   So the room gets its own pass, in GL, where the values are still
   linear and still allowed above 1. Three draws:

     1. the room, into a half-float target with tone mapping OFF, so a
        hot ember stays at 3.0 instead of being crushed to 0.78
     2. a bright-pass and blur at quarter resolution, twice (H then V) —
        this is the bloom, and it is cheap because it is small
     3. one fullscreen shader that adds the bloom in LINEAR light, runs
        ACES, split-tones, vignettes and grains, and writes sRGB

   Adding bloom BEFORE the curve rather than after is the whole
   difference between light spilling and a grey wash laid over the image.

   Only while the room is up. Zoomed in on the wood there is nothing to
   bloom and the table wants the plain, honest path. */
let rtScene = null, rtA = null, rtB = null, quadCam = null, quadScene = null,
    quadMesh = null, blurMat = null, gradeMat = null, postReady = false;

const QUAD_VS = `varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }`;

/* bright-pass and separable blur in one shader; uPre switches the
   threshold on for the first (horizontal) pass only. GLSL ES 1.00 — no
   array constructors, no dynamic indexing, so it runs on WebGL1 too. */
const BLUR_FS = `
uniform sampler2D tSrc; uniform vec2 uDir; uniform float uPre;
uniform float uThresh; uniform float uKnee;
varying vec2 vUv;
vec3 tap( vec2 uv ){
  vec3 c = texture2D( tSrc, uv ).rgb;
  if ( uPre < 0.5 ) return c;
  float l = max( c.r, max( c.g, c.b ) );
  float s = clamp( l - uThresh + uKnee, 0.0, 2.0 * uKnee );
  s = s * s / ( 4.0 * uKnee + 0.0001 );
  return c * max( s, l - uThresh ) / max( l, 0.0001 );
}
void main(){
  vec3 s  = tap( vUv ) * 0.227027;
  s += ( tap( vUv + uDir ) + tap( vUv - uDir ) ) * 0.194595;
  s += ( tap( vUv + uDir * 2.0 ) + tap( vUv - uDir * 2.0 ) ) * 0.121622;
  s += ( tap( vUv + uDir * 3.0 ) + tap( vUv - uDir * 3.0 ) ) * 0.054054;
  s += ( tap( vUv + uDir * 4.0 ) + tap( vUv - uDir * 4.0 ) ) * 0.016216;
  gl_FragColor = vec4( s, 1.0 );
}`;

const GRADE_FS = `
uniform sampler2D tScene; uniform sampler2D tBloom;
uniform float uTime, uExposure, uBloom, uSplit, uContrast, uPivot, uSat;
uniform float uVigIn, uVigOut, uVigDark, uGrain, uCA;
uniform vec3 uWarm, uCool;
varying vec2 vUv;
const vec3 LUMA = vec3( 0.2126, 0.7152, 0.0722 );

float hash12( vec2 p ){
  vec3 p3 = fract( vec3( p.xyx ) * 0.1031 );
  p3 += dot( p3, p3.yzx + 33.33 );
  return fract( ( p3.x + p3.y ) * p3.z );
}
/* Narkowicz's ACES fit. The SHOULDER is the point: it is what stops a
   flame being a flat white blob with a hard edge. */
vec3 aces( vec3 x ){
  return clamp( ( x * ( 2.51 * x + 0.03 ) ) / ( x * ( 2.43 * x + 0.59 ) + 0.14 ), 0.0, 1.0 );
}
void main(){
  vec2 d = vUv - 0.5;
  float r = length( d ) * 1.41421;

  /* radial chromatic aberration — the centre stays clean and only the
     corners fringe, which is what a real lens does. A uniform shift
     across the whole frame reads as a broken one. */
  float ca = uCA * r * r;
  vec3 col;
  col.r = texture2D( tScene, vUv - d * ca ).r;
  col.g = texture2D( tScene, vUv ).g;
  col.b = texture2D( tScene, vUv + d * ca ).b;

  col += texture2D( tBloom, vUv ).rgb * uBloom;   /* linear, before the curve */
  col = aces( col * uExposure );

  /* SPLIT TONE: shadows cool, highlights warm. Without this an
     orange-lit room is a sepia photograph; blue shadows are what make
     firelight read as hot. */
  float l = dot( col, LUMA );
  col *= mix( uCool, uWarm, smoothstep( uSplit - 0.30, uSplit + 0.30, l ) );

  col = clamp( ( col - uPivot ) * uContrast + uPivot + 0.004, 0.0, 1.0 );
  float g = dot( col, LUMA );
  col = mix( vec3( g ), col, uSat );

  col *= mix( 1.0 - uVigDark, 1.0, smoothstep( uVigOut, uVigIn, r ) );

  /* grain weighted away from the highlights, so the fire stays clean and
     the dark corners get the tooth. Even grain looks like a dirty screen. */
  float n = hash12( gl_FragCoord.xy + fract( uTime * 0.61 ) * vec2( 137.31, 91.77 ) );
  col += ( n - 0.5 ) * uGrain * ( 1.0 - abs( l * 2.0 - 1.0 ) );

  /* sRGB BY HAND. Three prepends its encoding helpers to a ShaderMaterial
     and LinearTosRGB() is nominally there, but relying on it means the
     whole picture silently comes out dark and over-saturated the day that
     changes — which is exactly what it looked like the first time. The
     transfer function is four lines; own it. */
  vec3 lo = col * 12.92;
  vec3 hi = 1.055 * pow( max( col, vec3( 0.0031308 ) ), vec3( 1.0 / 2.4 ) ) - 0.055;
  col = mix( lo, hi, step( vec3( 0.0031308 ), col ) );
  gl_FragColor = vec4( col, 1.0 );
}`;

function buildPost() {
  if (postReady || !uRen) return;
  postReady = true;
  quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  quadScene = new THREE.Scene();
  quadMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
  quadMesh.frustumCulled = false;
  quadScene.add(quadMesh);

  blurMat = new THREE.ShaderMaterial({
    uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() },
                uPre: { value: 1 }, uThresh: { value: 0.75 }, uKnee: { value: 0.35 } },
    vertexShader: QUAD_VS, fragmentShader: BLUR_FS,
    depthTest: false, depthWrite: false });

  gradeMat = new THREE.ShaderMaterial({
    uniforms: {
      tScene: { value: null }, tBloom: { value: null }, uTime: { value: 0 },
      uExposure: { value: 1.25 }, uBloom: { value: 0.42 },
      uWarm: { value: new THREE.Vector3(1.035, 0.995, 0.945) },
      uCool: { value: new THREE.Vector3(0.930, 0.965, 1.055) },
      uSplit: { value: 0.45 }, uContrast: { value: 1.045 }, uPivot: { value: 0.38 },
      uSat: { value: 1.02 }, uVigIn: { value: 0.30 }, uVigOut: { value: 0.98 },
      uVigDark: { value: 0.52 }, uGrain: { value: 0.013 }, uCA: { value: 0.0009 } },
    vertexShader: QUAD_VS, fragmentShader: GRADE_FS,
    depthTest: false, depthWrite: false });
  sizePost();
}

function sizePost() {
  if (!postReady) return;
  /* half float where we can get it, because the whole point is values
     above 1.0 surviving as far as the bloom */
  const hdr = uRen.capabilities.isWebGL2 ||
              !!uRen.extensions.get('OES_texture_half_float_linear');
  const opt = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat,
                type: hdr ? THREE.HalfFloatType : THREE.UnsignedByteType,
                encoding: THREE.LinearEncoding, stencilBuffer: false };
  const q = 4, bw = Math.max(1, (W / q) | 0), bh = Math.max(1, (H / q) | 0);
  if (rtScene) { rtScene.dispose(); rtA.dispose(); rtB.dispose(); }
  rtScene = new THREE.WebGLRenderTarget(W, H, Object.assign({ depthBuffer: true }, opt));
  rtA = new THREE.WebGLRenderTarget(bw, bh, Object.assign({ depthBuffer: false }, opt));
  rtB = new THREE.WebGLRenderTarget(bw, bh, Object.assign({ depthBuffer: false }, opt));
}

function blit(mat, target) {
  quadMesh.material = mat;
  uRen.setRenderTarget(target || null);
  uRen.clear();
  uRen.render(quadScene, quadCam);
}

/* the whole pass, or the plain render when there is no room to grade */
function drawUnder(t) {
  const on = roomGroup && roomGroup.visible;
  if (!on || !postReady) {
    uRen.toneMapping = THREE.ACESFilmicToneMapping;
    uRen.outputEncoding = THREE.sRGBEncoding;
    uRen.setRenderTarget(null);
    uRen.render(uScene, camera);
    return;
  }
  /* tone mapping and encoding are OURS from here: three would otherwise
     crush the highlights before the bloom ever sees them, and silently
     drop outputEncoding the moment we render into a target anyway. */
  uRen.toneMapping = THREE.NoToneMapping;
  uRen.outputEncoding = THREE.LinearEncoding;
  uRen.setRenderTarget(rtScene);
  uRen.clear();
  uRen.render(uScene, camera);

  const tw = 1 / rtA.width, th = 1 / rtA.height;
  blurMat.uniforms.tSrc.value = rtScene.texture;
  blurMat.uniforms.uPre.value = 1;
  blurMat.uniforms.uDir.value.set(tw * 1.4, 0);
  blit(blurMat, rtA);

  blurMat.uniforms.tSrc.value = rtA.texture;
  blurMat.uniforms.uPre.value = 0;
  blurMat.uniforms.uDir.value.set(0, th * 1.4);
  blit(blurMat, rtB);

  gradeMat.uniforms.tScene.value = rtScene.texture;
  gradeMat.uniforms.tBloom.value = rtB.texture;
  gradeMat.uniforms.uTime.value = t;
  blit(gradeMat, null);
}

function lens(p) {
  p = Math.max(260, Math.min(6000, p || 2400));
  if (Math.abs(p - PERSP) < 0.5) return;
  PERSP = p;
  sizeCam();
  invalidate(6);
}

function showRoom(on) {
  if (!roomGroup || roomGroup.visible === !!on) return;
  roomGroup.visible = !!on;
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
  if (on) {
    uScene.fog = new THREE.FogExp2(0x140e09, FOG_M / (litPX || 600));
    uScene.background = new THREE.Color(0x140e09);
  } else {
    uScene.fog = null;
    uScene.background = null;
  }
  uScene.traverse(o => {
    if (o.isDirectionalLight && o.userData.base === undefined) o.userData.base = o.intensity;
    if (o.isDirectionalLight && !roomGroup.getObjectById(o.id))
      o.intensity = on ? o.userData.base * 0.16 : o.userData.base;
  });
  invalidate(20);
}

function placeTable() {
  if (!tableObj || !uRen) return;
  const l = doc.getElementById('tm-l'), r = doc.getElementById('tm-r');
  const vp = doc.getElementById('vp');
  if (!l || !r || !vp || vp.hidden) { tableObj.visible = false; return; }
  const a = l.getBoundingClientRect(), b = r.getBoundingClientRect();
  const dia = Math.hypot(b.left - a.left, b.top - a.top);
  if (!dia) { tableObj.visible = false; return; }
  tableObj.visible = true;
  const cx = (a.left + b.left) / 2, cy = (a.top + b.top) / 2;
  const [wx, wy] = toWorld({ left: cx, top: cy, width: 0, height: 0 });
  tableObj.rotation.set(Math.PI / 2 - tilt(), 0, 0);
  tableObj.position.set(wx, wy, 0);
  tableObj.scale.set(dia, dia, dia);
  placeRoom(wx, wy, dia);
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
  chest: { metal: { mul: [0.30, 0.28, 0.26], rough: 0.34, metalness: 1.0 },
           wood:  { mul: [1, 1, 1],          rough: 0.68, metalness: 0.0 } },
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
  room:  { metal: { mul: [0.42, 0.38, 0.33], rough: 0.92, metalness: 0.0 },
           wood:  { mul: [0.50, 0.44, 0.37], rough: 0.88, metalness: 0.0 } },
  /* the furniture is nearer the eye than the walls and catches the fire,
     so it keeps a little more of itself and a little more sheen */
  tavern:{ metal: { mul: [0.46, 0.42, 0.36], rough: 0.62, metalness: 0.55 },
           wood:  { mul: [0.62, 0.55, 0.46], rough: 0.72, metalness: 0.0 } },
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

function tex(k, book) {
  const src = (book || CHEST_TEX)[k];
  if (!src) return null;
  if (texCache[src]) return texCache[src];
  waiting++;
  const t = new THREE.TextureLoader().load(src, landed, undefined, landed);
  t.encoding = THREE.sRGBEncoding;
  t.flipY = false;                       /* glTF UVs, not canvas UVs */
  return (texCache[src] = t);
}
function mesh(prims, book, dress) {
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
    const mat = new THREE.MeshStandardMaterial({
      map: p.t ? tex(p.t, book) : null,
      color: col,
      vertexColors: !!p.ao,
      roughness: d.rough,
      metalness: d.metalness,
      envMapIntensity: metal ? 1.15 : 0.75,
      transparent: false,
      alphaTest: p.cut ? 0.5 : 0,
      /* foliage is a flat card whose SHAPE lives in the texture's alpha */
      side: p.cut ? THREE.DoubleSide : THREE.FrontSide });
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
    sizePost();
  }
  const fov = 2 * Math.atan(H / (2 * PERSP)) * 180 / Math.PI;
  /* ── ROOM FOR A ROOM ──────────────────────────────────────
     These were PERSP +/- 900, which is a slab either side of the table
     and was exactly right while this layer held nothing but flat pieces
     lying on it. A tavern is five metres of depth in both directions and
     the far wall fell straight out the back of the frustum. Widened to
     hold it; the ratio is still modest enough that the depth buffer has
     no trouble separating a cup from the table it stands on. */
  camera = new THREE.PerspectiveCamera(fov, W / H, 300, PERSP + 2800);
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
  if (catcher) { catcher.scale.set(W * 3, H * 3, 1); catcher.position.set(0, 0, -2); }
  if (uCatch) { uCatch.scale.set(W * 3, H * 3, 1); uCatch.position.set(0, 0, -2); }
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
  obj.position.set(p.wx, p.wy, 0);
  obj.scale.set(p.w, p.w, p.w);
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
  shotScene.remove(g);
  /* only KEEP it if every texture it needs had already arrived */
  if (waiting > 0) return out;
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
let dirty = 8, beat = 0, drawn = 0;
function invalidate(n) { dirty = Math.max(dirty, n == null ? 4 : n); }
/* Two seconds. Long enough that a still table costs almost nothing, short
   enough that a missed invalidate() shows up as a brief stale patch rather
   than a table that has stopped responding. */
const HEARTBEAT = 2000;

function frame(ts) {
  requestAnimationFrame(frame);
  if (!camera) return;

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
    chest.position.set(cx, cy, 0);
    /* the model is one unit on its longest side, so its screen size IS the
       anchor's width — it zooms with the table for free */
    const s = ar.w;
    chest.scale.set(s, s, s);

    /* the lid eases rather than snapping; the asset's own two extremes */
    if (Math.abs(lidU - lidWant) > 0.001) {
      lidU += (lidWant - lidU) * 0.18;
      lidGroup.quaternion.copy(QS).slerp(QO, lidU);
    }
  }
  renderer.render(scene, camera);
  if (uRen) {
    placeTable();
    /* a fire is never still, so while the room is up this layer never
       idles — that is the one thing worth the frames in here */
    const t = (ts || 0) / 1000;
    if (roomGroup && roomGroup.visible) { tickFire(t); invalidate(2); }
    drawUnder(t);
  }
}

function setOpen(v) { lidWant = v ? 1 : 0; invalidate(30); }

/* anything that changes the page can wake the loop without knowing how it
   works: a resize, a scroll, a press, a key */
['resize','scroll'].forEach(k => root.addEventListener(k, () => invalidate(6), true));
['pointerdown','pointermove','pointerup','wheel','keydown']
  .forEach(k => root.addEventListener(k, () => invalidate(6), { passive: true, capture: true }));

root.TableGL = { build, setOpen, sync, thumb, bit, onTextures, invalidate, showRoom, lens, syncSeats,
  get frames() { return drawn; },
  get waiting() { return waiting; },
  get ready() { return !!renderer; } };

})(window, document);
