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

const PERSP = 2400, ORIGIN = 0.42;
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
let cv, renderer, scene, camera, W = 0, H = 0, OY = 0;
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
  chest = normalise(body);
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
  if (typeof WOOD !== 'undefined' && WOOD.Basket_E) {
    bb.add(mesh(WOOD.Basket_E.prims, WOOD_TEX, DRESS.basket));
  } else if (typeof BIN3D !== 'undefined') {
    bb.add(mesh(BIN3D.prims, BIN3D_TEX, DRESS.bin));
  }
  if (bb.children.length) {
    bin = casts(normalise(bb));
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
  }
  OY = (0.5 - ORIGIN) * H;                       /* where CSS puts the vanishing point */
  const fov = 2 * Math.atan(H / (2 * PERSP)) * 180 / Math.PI;
  camera = new THREE.PerspectiveCamera(fov, W / H, PERSP - 900, PERSP + 900);
  camera.position.set(0, OY, PERSP);
  camera.lookAt(0, OY, 0);

  /* THE SHADOW CAMERA HAS TO COVER THE VIEWPORT, and this layer measures in
     screen pixels, so the box is the screen. Generous on the vertical
     because a standing figure is tall and its shadow is longer than it is. */
  if (shadowLight) {
    const c = shadowLight.shadow.camera;
    c.left = -W; c.right = W; c.top = H; c.bottom = -H * 1.4;
    c.near = 200; c.far = 4200;
    c.updateProjectionMatrix();
    shadowLight.target.position.set(0, OY, 0);
    shadowLight.target.updateMatrixWorld();
  }
  /* the plane the shadows land on: the whole screen, just behind the feet */
  if (catcher) { catcher.scale.set(W * 3, H * 3, 1); catcher.position.set(0, OY, -2); }
  if (uCatch) { uCatch.scale.set(W * 3, H * 3, 1); uCatch.position.set(0, OY, -2); }
  if (uLight) {
    const c = uLight.shadow.camera;
    c.left = -W; c.right = W; c.top = H; c.bottom = -H * 1.4;
    c.near = 200; c.far = 4200;
    c.updateProjectionMatrix();
    uLight.target.position.set(0, OY, 0);
    uLight.target.updateMatrixWorld();
  }
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

/* a DOM rect's centre, in the layer's own coordinates — gl.js's toWorld */
const toWorld = r => [r.left + r.width / 2 - W / 2, (H / 2 - (r.top + r.height / 2)) + OY];

/* IS THIS ANCHOR ACTUALLY ON SCREEN?
   NOT offsetParent. offsetParent is null for EVERY position:fixed element,
   by specification — so the moment the bin was moved off the wood and pinned
   to the corner of the screen (grumkata: "perpetual UI on the players
   screen"), this test said it was hidden and the model stopped being drawn
   at all. That is the second time this exact assumption has cost a session;
   measure the box instead, which answers the question for both kinds of
   anchor. A display:none element, or one inside one, has no box. */
function onScreen(a) {
  if (!a || a.hidden) return false;
  const r = a.getBoundingClientRect();
  if (!r.width || !r.height) return false;
  const cs = root.getComputedStyle(a);
  return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.01;
}

/* draw one model over the rect of the DOM anchor that stands for it */
function stand(obj, anchorId, lean, yaw, el, foot) {
  if (!obj) return;
  const a = el || (anchorId && doc.getElementById(anchorId));
  const on = onScreen(a);
  obj.visible = !!on;
  if (!on) return;
  const r = a.getBoundingClientRect();
  /* BY THE FEET, for anything that stands up. A piece normalised about its
     middle and planted at the middle of its anchor is half sunk into the
     wood; a standing figure has to touch the board at the bottom of the box
     that was reserved for it, which is where its own shadow is drawn. */
  const [cx, cy] = toWorld(foot
    ? { left: r.left, top: r.bottom, width: r.width, height: 0 } : r);
  obj.rotation.set(Math.PI / 2 - tilt() - lean, yaw, 0);
  obj.position.set(cx, cy, 0);
  const s = r.width;
  obj.scale.set(s, s, s);
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

function frame() {
  requestAnimationFrame(frame);
  if (!camera) return;

  /* every model somebody put down, over the rect of its own anchor */
  for (const id in staged) {
    stand(staged[id].g, null, 0, 0.5,
          doc.querySelector('.prop.t3-model[data-id="' + id + '"]'));
  }

  syncStandees();

  const a = doc.getElementById('tb-anchor');
  const vp = doc.getElementById('vp');
  const on = onScreen(a) && vp && !vp.hidden;
  chest.visible = !!on;
  stand(bin, 'tb-bin-prop', 0, 0.5);

  if (on) {
    const r = a.getBoundingClientRect();
    const [cx, cy] = toWorld(r);
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
    const s = r.width;
    chest.scale.set(s, s, s);

    /* the lid eases rather than snapping; the asset's own two extremes */
    if (Math.abs(lidU - lidWant) > 0.001) {
      lidU += (lidWant - lidU) * 0.18;
      lidGroup.quaternion.copy(QS).slerp(QO, lidU);
    }
  }
  renderer.render(scene, camera);
  if (uRen) { placeTable(); uRen.render(uScene, camera); }
}

function setOpen(v) { lidWant = v ? 1 : 0; }

root.TableGL = { build, setOpen, sync, thumb, bit, onTextures,
  get waiting() { return waiting; },
  get ready() { return !!renderer; } };

})(window, document);
