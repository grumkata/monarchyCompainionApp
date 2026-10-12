/* ═══════════════════════════════════════════════════════════════
   38-field-world.js — WHERE THE FIGHT HAPPENS.

   grumkata (2026-10-10), on the two field views before this one: "it still just
   generally looks horrible", "immersive mode is supposed to change the scenery and
   look to make the game more immersive", "like something in a real 3D adventure
   RPG" — with three pictures to aim at: Dragon Quest XI's battles in a meadow and
   in a ruin, and a painted stylised valley.

   So this is a place, not a board. A sunlit meadow with the fight in the middle
   of it: lush grass that moves in the wind, flowers, broad trees with soft painted
   crowns, mossy boulders, a broken ruin on one side, a path, hills climbing away
   with woods on them, blue mountains behind, a deep sky with clouds going over.
   One place for now (the GM will make their own later), and never twice the same:
   the fight's id seeds where everything stands, the light of the day, the trees'
   colours.

   Everything is made here, in code, in one style — painted, saturated, soft — so
   nothing looks borrowed from somewhere else.

   Units: one is 25 cm (a figure, 7.2 high, is a person). The fight's middle is the
   origin, x across (allies left), z toward whoever is looking, y up.

   37-scene-field.js owns the renderer, the camera and the way in and out; this
   makes the world and keeps it alive (wind, clouds, light). `grow` (0..1) is the
   world unfolding out of the table: at 0 it is a dark room with the board in it,
   at 1 it is noon in the meadow.
═══════════════════════════════════════════════════════════════ */
(function () {
'use strict';
if (typeof THREE === 'undefined') return;

const C = h => new THREE.Color(h).convertSRGBToLinear();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const mkc = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const rng = seed => { let s = (seed >>> 0) || 1; return () => (s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296; };
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

/* value noise, seeded */
function hash2(x, y, s) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 2246822519)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}
function noise2(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = smooth(x - xi), fy = smooth(y - yi);
  return lerp(lerp(hash2(xi, yi, s), hash2(xi + 1, yi, s), fx), lerp(hash2(xi, yi + 1, s), hash2(xi + 1, yi + 1, s), fx), fy) * 2 - 1;
}
const fbm2 = (x, y, s, o) => { let v = 0, a = .5, f = 1; for (let i = 0; i < (o || 4); i++) { v += a * noise2(x * f, y * f, s + i * 31); a *= .5; f *= 2.07; } return v; };
function hash3(x, y, z, s) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1274126177) + Math.imul(s, 2246822519)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}
function noise3(x, y, z, s) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const fx = smooth(x - xi), fy = smooth(y - yi), fz = smooth(z - zi);
  const c = (a, b, d) => hash3(xi + a, yi + b, zi + d, s);
  return lerp(lerp(lerp(c(0, 0, 0), c(1, 0, 0), fx), lerp(c(0, 1, 0), c(1, 1, 0), fx), fy),
              lerp(lerp(c(0, 0, 1), c(1, 0, 1), fx), lerp(c(0, 1, 1), c(1, 1, 1), fx), fy), fz) * 2 - 1;
}
const fbm3 = (x, y, z, s, o) => { let v = 0, a = .5, f = 1; for (let i = 0; i < (o || 3); i++) { v += a * noise3(x * f, y * f, z * f, s + i * 17); a *= .5; f *= 2.03; } return v; };

/* ══ THE SHADER PIECES EVERY SURFACE SHARES ═════════════════════
   Noise, the wind, and the world's growing: a thing at distance d from the
   fight comes up a little after the things nearer it, so the meadow unrolls
   outward from the figures and the hills come last. */
const GL_NOISE = `
float fwH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float fwN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(fwH(i), fwH(i + vec2(1.0, 0.0)), f.x), mix(fwH(i + vec2(0.0, 1.0)), fwH(i + vec2(1.0, 1.0)), f.x), f.y); }
float fwF(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * fwN(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }
`;
const GL_GROW = `
uniform float uGrow; uniform float uT; uniform float uWind;
float fwGrow(vec3 root){ float d = clamp(length(root.xz) / 700.0, 0.0, 1.0); return clamp((uGrow - 0.45 * d) / 0.55, 0.0, 1.0); }
float fwPop(float w){ return w <= 0.0 ? 0.0 : 1.0 - pow(1.0 - w, 3.0) + sin(w * 3.14159) * 0.1; }
float fwCloud(vec2 xz){ return smoothstep(0.45, 0.7, fwF(xz * 0.004 + vec2(uT * 0.006, uT * 0.0025))); }
vec2 fwSway(vec3 w){ float g = sin(uT * 1.35 + w.x * 0.11 + w.z * 0.07) * 0.6 + sin(uT * 2.3 + w.x * 0.31 - w.z * 0.23) * 0.25 + (fwN(w.xz * 0.02 + vec2(uT * 0.12, 0.0)) - 0.5) * 1.2;
  return vec2(0.8, 0.35) * g * uWind; }
`;
const U = { uGrow: { value: 1 }, uT: { value: 0 }, uWind: { value: 1 } };

/* inject into a built-in material, keeping its light, shadow and fog */
const GL_DEF = '#define GRASS_NEAR 75.0\n#define GRASS_FAR 125.0\n';
function patch(mat, key, o) {
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U, o.uniforms || {});
    let v = sh.vertexShader, f = sh.fragmentShader;
    v = v.replace('#include <common>', '#include <common>\n' + GL_DEF + GL_NOISE + GL_GROW + (o.vh || ''));
    if (o.vn) v = v.replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n' + o.vn);
    if (o.vp) v = v.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + o.vp);
    if (o.ve) v = v.replace('#include <fog_vertex>', '#include <fog_vertex>\n' + o.ve);
    if (o.vproj) v = v.replace('#include <project_vertex>', o.vproj);
    f = f.replace('#include <common>', '#include <common>\n' + GL_NOISE + 'uniform float uGrow; uniform float uT;\nfloat fwCloud(vec2 xz){ return smoothstep(0.45, 0.7, fwF(xz * 0.004 + vec2(uT * 0.006, uT * 0.0025))); }\n' + (o.fh || ''));
    if (o.fc) f = f.replace('#include <color_fragment>', '#include <color_fragment>\n' + o.fc);
    if (o.fo) f = f.replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );', o.fo + '\ngl_FragColor = vec4( outgoingLight, diffuseColor.a );');
    /* a blade, a leaf, a petal: both its faces are lit the same, as the surface it is part of (its normal is that surface's) */
    if (o.same) f = f.replace('( gl_FrontFacing ) ? vIndirectFront : vIndirectBack', 'vIndirectFront').replace('( gl_FrontFacing ) ? vLightFront : vLightBack', 'vLightFront');
    sh.vertexShader = v; sh.fragmentShader = f;
  };
  mat.customProgramCacheKey = () => 'fw-' + key;
  return mat;
}
/* the root a part grows from: an instance's own place, or the attribute a merged piece carries */
const ROOT_I = 'vec3 fwRoot = (modelMatrix * vec4(instanceMatrix[3].xyz, 1.0)).xyz;';
const ROOT_A = 'vec3 fwRoot = (modelMatrix * vec4(aRoot, 1.0)).xyz;';

/* ══ PAINTED TEXTURES ═══════════════════════════════════════════ */
const toTex = (c, srgb, rep) => {
  const t = new THREE.CanvasTexture(c);
  if (srgb !== false) t.encoding = THREE.sRGBEncoding;
  t.anisotropy = 8;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
};
/* a spray of leaves, white and greys (the crown's own colour is laid over it): what a crown is made of */
function leafSpray(seed, n, broad) {
  /* a clump of leaves, drawn back to front: the ones at the back of the clump darker, the ones in front lighter, all of
     them inside a ragged round so the card reads as a handful of foliage, not as leaves scattered on paper */
  const S = 256, c = mkc(S, S), x = c.getContext('2d'), r = rng(seed);
  const leaves = [];
  for (let i = 0; i < n; i++) {
    const a = r() * 6.283, d = Math.pow(r(), .75) * S * .3, depth = r();
    leaves.push({ cx: S / 2 + Math.cos(a) * d, cy: S / 2 + Math.sin(a) * d * .9, a, depth });
  }
  leaves.sort((p, q) => p.depth - q.depth);
  leaves.forEach(L => {
    const len = S * (.075 + r() * .05) * (broad ? 1.15 : 1), wid = len * (broad ? .55 : .42) * (.85 + r() * .3);
    x.save(); x.translate(L.cx, L.cy); x.rotate(L.a + (r() - .5) * 1.1);   /* laid round the clump, not pointing out of it: a round, scalloped edge */
    const v = Math.round(120 + 135 * (.25 + .75 * L.depth) * (.85 + r() * .15)), hi = Math.min(255, v + 34), lo = Math.max(0, v - 46);
    const g = x.createLinearGradient(-wid / 2, -len / 2, wid / 2, len / 2);
    g.addColorStop(0, 'rgb(' + hi + ',' + hi + ',' + hi + ')'); g.addColorStop(.5, 'rgb(' + v + ',' + v + ',' + v + ')'); g.addColorStop(1, 'rgb(' + lo + ',' + lo + ',' + lo + ')');
    x.fillStyle = g;
    x.beginPath(); x.moveTo(0, -len / 2);
    x.bezierCurveTo(wid * .62, -len * .3, wid * .55, len * .22, 0, len / 2);
    x.bezierCurveTo(-wid * .55, len * .22, -wid * .62, -len * .3, 0, -len / 2); x.fill();
    x.restore();
  });
  const t = toTex(c); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
/* bark: streaks down the trunk, lighter ridges and dark cracks */
function barkTex(seed, base, light, dark, birch) {
  const W = 128, H = 256, c = mkc(W, H), x = c.getContext('2d'), r = rng(seed);
  x.fillStyle = base; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 90; i++) {
    const px = r() * W, w = 1 + r() * 4, len = 30 + r() * 120, py = r() * H;
    x.fillStyle = (r() < .5 ? light : dark).replace('A', (.12 + r() * .25).toFixed(2));
    x.fillRect(px, py, w, len); x.fillRect(px - W, py, w, len); x.fillRect(px, py - H, w, len);
  }
  if (birch) for (let i = 0; i < 26; i++) { x.fillStyle = 'rgba(30,26,22,' + (.5 + r() * .4).toFixed(2) + ')'; const py = r() * H, w = 6 + r() * 26; x.fillRect(r() * W, py, w, 2 + r() * 4); }
  return toTex(c, true, true);
}
/* a soft round light, for the motes in the air */
function moteTex() {
  const c = mkc(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,250,220,.55)'); g.addColorStop(1, 'rgba(255,240,200,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return toTex(c);
}

/* ══ SHAPES ═══════════════════════════════════════════════════ */
/* weld a geometry's matching corners, so a lump pushed about by noise stays one smooth skin */
function weld(g) {
  const p = g.attributes.position, map = new Map(), idx = [], pos = [];
  for (let i = 0; i < p.count; i++) {
    const k = Math.round(p.getX(i) * 1e4) + ',' + Math.round(p.getY(i) * 1e4) + ',' + Math.round(p.getZ(i) * 1e4);
    let j = map.get(k);
    if (j == null) { j = pos.length / 3; map.set(k, j); pos.push(p.getX(i), p.getY(i), p.getZ(i)); }
    idx.push(j);
  }
  const o = new THREE.BufferGeometry();
  o.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); o.setIndex(idx);
  return o;
}
/* many geometries, one: positions, normals, colours and (if asked) the root each part grows from */
function merge(parts, withRoot) {
  let nv = 0, ni = 0;
  parts.forEach(p => { nv += p.g.attributes.position.count; ni += p.g.index ? p.g.index.count : p.g.attributes.position.count; });
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
  const root = withRoot ? new Float32Array(nv * 3) : null, idx = new Uint32Array(ni);
  let o = 0, oi = 0;
  parts.forEach(p => {
    const g = p.g, P = g.attributes.position, N = g.attributes.normal, Cc = g.attributes.color, Uu = g.attributes.uv, n = P.count;
    for (let i = 0; i < n; i++) {
      pos[(o + i) * 3] = P.getX(i); pos[(o + i) * 3 + 1] = P.getY(i); pos[(o + i) * 3 + 2] = P.getZ(i);
      if (N) { nor[(o + i) * 3] = N.getX(i); nor[(o + i) * 3 + 1] = N.getY(i); nor[(o + i) * 3 + 2] = N.getZ(i); }
      if (Cc) { col[(o + i) * 3] = Cc.getX(i); col[(o + i) * 3 + 1] = Cc.getY(i); col[(o + i) * 3 + 2] = Cc.getZ(i); }
      else { col[(o + i) * 3] = col[(o + i) * 3 + 1] = col[(o + i) * 3 + 2] = 1; }
      if (Uu) { uv[(o + i) * 2] = Uu.getX(i); uv[(o + i) * 2 + 1] = Uu.getY(i); }
      if (root) { root[(o + i) * 3] = p.root.x; root[(o + i) * 3 + 1] = p.root.y; root[(o + i) * 3 + 2] = p.root.z; }
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) idx[oi + i] = g.index.getX(i) + o;
    else for (let i = 0; i < n; i++) idx[oi + i] = o + i;
    o += n; oi += g.index ? g.index.count : n;
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (root) out.setAttribute('aRoot', new THREE.BufferAttribute(root, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}
const paint = (g, fn) => {
  const p = g.attributes.position, n = g.attributes.normal, c = new Float32Array(p.count * 3), t = new THREE.Color();
  for (let i = 0; i < p.count; i++) { fn(t, p.getX(i), p.getY(i), p.getZ(i), n ? n.getY(i) : 1, i); c[i * 3] = t.r; c[i * 3 + 1] = t.g; c[i * 3 + 2] = t.b; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
};

/* a tube along points, its radius at each: trunks and boughs */
function tube(pts, rads, sides) {
  const pos = [], idx = [], uv = [], N = pts.length;
  const up = V3(0, 1, 0), t = V3(), a = V3(), b = V3();
  for (let i = 0; i < N; i++) {
    const p = pts[i];
    t.copy(pts[Math.min(N - 1, i + 1)]).sub(pts[Math.max(0, i - 1)]).normalize();
    a.copy(Math.abs(t.y) > .9 ? V3(1, 0, 0) : up).cross(t).normalize(); b.copy(t).cross(a).normalize();
    for (let k = 0; k <= sides; k++) {
      const ang = k / sides * Math.PI * 2, c = Math.cos(ang), s = Math.sin(ang);
      pos.push(p.x + (a.x * c + b.x * s) * rads[i], p.y + (a.y * c + b.y * s) * rads[i], p.z + (a.z * c + b.z * s) * rads[i]);
      uv.push(k / sides, i / (N - 1) * 3);
    }
  }
  for (let i = 0; i < N - 1; i++) for (let k = 0; k < sides; k++) {
    const q = i * (sides + 1) + k, w = q + sides + 1;
    idx.push(q, w, q + 1, q + 1, w, w + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
const bezier = (a, b, c, n) => { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push(V3(u * u * a.x + 2 * u * t * b.x + t * t * c.x, u * u * a.y + 2 * u * t * b.y + t * t * c.y, u * u * a.z + 2 * u * t * b.z + t * t * c.z)); } return o; };

/* leaf cards filling a ball: each a little square of the spray, turned any way, its normal pointing out of the
   whole crown (so the crown is lit as one soft mass, the way a painter would), darker toward the heart and underneath */
/* how light a point of a crown is: dark in its heart and underneath, light on its top and its outside */
const crownShade = (rel, crownR, jit) => clamp(.62 + .48 * clamp(rel.y / crownR * .75 + .42, 0, 1) * (.55 + .45 * clamp(rel.length() / crownR, 0, 1)) + jit, .58, 1.1);
function cardBall(out, centre, rad, crown, n, size, r, tone) {
  const q = new THREE.Quaternion(), q2 = new THREE.Quaternion(), corner = [[-1, -1], [1, -1], [1, 1], [-1, 1]], Z = V3(0, 0, 1);
  for (let i = 0; i < n; i++) {
    /* on the skin of the ball (a little in and out of it), facing out of it, turned any way in its own plane */
    const u = r() * 2 - 1, ph = r() * 6.283, s = Math.sqrt(1 - u * u), dir = V3(Math.cos(ph) * s, u * .85, Math.sin(ph) * s).normalize();
    const d = rad * (.62 + r() * .38);
    const c = V3(centre.x + dir.x * d, centre.y + dir.y * d, centre.z + dir.z * d);
    const facing = dir.clone().add(V3(r() - .5, r() - .5, r() - .5).multiplyScalar(.8)).normalize();
    q.setFromUnitVectors(Z, facing); q2.setFromAxisAngle(Z, r() * 6.283); q.multiply(q2);
    const sz = size * (.8 + r() * .5), base = out.pos.length / 3;
    const rel = c.clone().sub(crown.c);
    const nrm = rel.clone().normalize(); nrm.y += .3; nrm.normalize();
    const shade = crownShade(rel, crown.r, (r() - .5) * .12);
    const tu = (r() < .5 ? 0 : .5), tv = (r() < .5 ? 0 : .5);
    const rot = r() * 6.283, cr = Math.cos(rot), sr = Math.sin(rot);
    corner.forEach(cn => {
      const ox = cn[0] * sz / 2, oy = cn[1] * sz / 2;
      out.pos.push(c.x, c.y, c.z); out.nor.push(nrm.x, nrm.y, nrm.z);
      out.off.push(ox * cr - oy * sr, ox * sr + oy * cr);
      out.uv.push(tu + (cn[0] + 1) * .25, tv + (cn[1] + 1) * .25);
      out.col.push(shade * tone[0], shade * tone[1], shade * tone[2]);
      out.root.push(crown.root.x, crown.root.y, crown.root.z);
    });
    out.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
}
const cardsOut = () => ({ pos: [], nor: [], uv: [], col: [], root: [], idx: [], off: [] });
/* the solid heart of one ball of leaves: a lumpy sphere, lit as part of the whole crown */
function coreBall(centre, rad, crown, seed, detail) {
  const g = weld(new THREE.IcosahedronGeometry(1, detail)), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + .26 * fbm3(x * 2.1, y * 2.1, z * 2.1, seed, 3);
    p.setXYZ(i, centre.x + x * rad * k, centre.y + y * rad * k * .88, centre.z + z * rad * k);
  }
  const nor = new Float32Array(p.count * 3), col = new Float32Array(p.count * 3), v = V3(0, 0, 0);
  for (let i = 0; i < p.count; i++) {
    v.set(p.getX(i), p.getY(i), p.getZ(i)).sub(crown.c);
    const sh = crownShade(v, crown.r, 0) * .94;
    const n = v.clone().normalize(); n.y += .3; n.normalize();
    nor[i * 3] = n.x; nor[i * 3 + 1] = n.y; nor[i * 3 + 2] = n.z;
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = sh;
  }
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
function cardsGeo(o) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(o.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(o.nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(o.uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(o.col, 3));
  g.setAttribute('aRoot', new THREE.Float32BufferAttribute(o.root, 3));
  g.setAttribute('aOff', new THREE.Float32BufferAttribute(o.off, 2));
  g.setIndex(o.idx);
  return g;
}

/* ══ TREES ════════════════════════════════════════════════════
   A tree is a trunk that forks into boughs, each bough ending in a ball of
   leaf cards; the balls together are the crown. Kinds: a broad oak, a smaller
   round tree, a tall birch with a light airy crown, and a bush (crown only). */
const TREE_KINDS = {
  oak:   { h: 30, tr: 1.15, cr: 10.5, balls: 7, card: 4.6, lean: .9, bark: 'oak' },
  round: { h: 20, tr: .8,  cr: 7.2,  balls: 5, card: 3.6, lean: .7, bark: 'oak' },
  birch: { h: 34, tr: .55, cr: 5.6,  balls: 6, card: 3.0, lean: .5, bark: 'birch', tall: true },
  bush:  { h: 3.4, tr: 0,  cr: 3.4,  balls: 3, card: 2.3, lean: 0, bark: null },
  lite:  { h: 15, tr: .7, cr: 7.6,  balls: 3, card: 4.6, lean: .4, bark: 'oak', lite: .16, low: true }
};
function makeTree(kind, seed) {
  const K = TREE_KINDS[kind], r = rng(seed), out = cardsOut(), parts = [];
  const H = K.h * (.85 + r() * .3);
  const root = V3(0, 0, 0);
  if (kind === 'bush') {
    const crown = { c: V3(0, K.cr * .5, 0), r: K.cr, root }, cores = [];
    for (let i = 0; i < K.balls; i++) {
      const a = i / K.balls * 6.283 + r(), c = V3(Math.cos(a) * K.cr * .38, K.cr * (.4 + r() * .2), Math.sin(a) * K.cr * .38), rr = K.cr * (.55 + r() * .15);
      cardBall(out, c, rr, crown, 16, K.card, r, [1, 1, 1]); cores.push(coreBall(c, rr * .82, crown, seed + i, 1));
    }
    const top = V3(0, K.cr * .72, 0);
    cardBall(out, top, K.cr * .55, crown, 14, K.card, r, [1, 1, 1]); cores.push(coreBall(top, K.cr * .45, crown, seed + 9, 1));
    return { leaves: cardsGeo(out), core: merge(cores.map(g => ({ g })), false), trunk: null, h: K.cr * 1.5 };
  }
  /* the trunk: up, with a bend, thickest at the foot (a flare into the roots) */
  const topY = H * (K.tall ? .7 : K.low ? .3 : .5);
  const top = V3((r() - .5) * K.lean * 3, topY, (r() - .5) * K.lean * 3);
  const mid = V3(top.x * .3 + (r() - .5) * K.lean * 2, topY * .5, top.z * .3 + (r() - .5) * K.lean * 2);
  const tp = bezier(V3(0, -.6, 0), mid, top, 10);
  const trads = tp.map((p, i) => { const u = i / (tp.length - 1); return K.tr * (1 - u * .55) * (1 + Math.pow(1 - u, 6) * .9); });
  parts.push({ g: tube(K.lite ? tp.filter((_, i) => i % 5 === 0) : tp, K.lite ? trads.filter((_, i) => i % 5 === 0) : trads, K.lite ? 5 : 9), root });
  /* the crown: balls on a dome over the top of the trunk */
  const cc = V3(top.x, topY + K.cr * (K.tall ? .9 : .62), top.z);
  const crown = K.tall ? { c: V3(top.x, (topY * .82 + H + K.cr * .4) / 2, top.z), r: (H + K.cr * .4 - topY * .82) / 2 + K.cr * .5, root } : { c: cc, r: K.cr * 1.25, root };
  const balls = [];
  if (K.tall) {
    for (let i = 0; i < K.balls; i++) {
      const u = i / (K.balls - 1), a = r() * 6.283, rr = K.cr * (.12 + .22 * Math.sin(u * Math.PI));
      balls.push({ c: V3(top.x + Math.cos(a) * rr, topY * .86 + u * (H - topY * .86 + K.cr * .2), top.z + Math.sin(a) * rr), r: K.cr * (.95 + r() * .14) * (1 - u * .38) * (.75 + .35 * Math.sin(u * Math.PI + .3)) });
    }
  } else {
    balls.push({ c: cc.clone().add(V3(0, K.cr * .25, 0)), r: K.cr * .72 });
    for (let i = 0; i < K.balls - 1; i++) {
      const a = i / (K.balls - 1) * 6.283 + r() * .6, el = .05 + r() * .55;
      balls.push({ c: V3(cc.x + Math.cos(a) * Math.cos(el) * K.cr * .78, cc.y + Math.sin(el) * K.cr * .5 - K.cr * .12, cc.z + Math.sin(a) * Math.cos(el) * K.cr * .78), r: K.cr * (.48 + r() * .2) });
    }
  }
  /* boughs from the upper trunk out to each ball */
  balls.forEach((b, i) => {
    if ((i === 0 && !K.tall) || K.lite) return;
    const from = tp[Math.floor(tp.length * (.62 + r() * .3))].clone();
    const to = b.c.clone().lerp(cc, .25); to.y -= b.r * .2;
    const via = from.clone().lerp(to, .5); via.y += 1.2;
    const bp = bezier(from, via, to, 5);
    parts.push({ g: tube(bp, bp.map((_, k) => K.tr * .42 * (1 - k / bp.length * .7)), 6), root });
  });
  const cores = [];
  balls.forEach((b, i) => {
    const n = Math.round(24 * Math.pow(b.r / 4.2, 2) * (K.tall ? 1.3 : 1) * (K.lite ? K.lite : 1.5));
    cardBall(out, b.c, b.r, crown, n, K.card * (K.lite ? 1.05 : .9), r, [1, 1, 1]);
    cores.push(coreBall(b.c, b.r * (K.lite ? .92 : K.tall ? .58 : .72), crown, seed + i * 7, K.lite ? 1 : 2));
  });
  const trunk = merge(parts.map(p => ({ g: paint(p.g, (t, x, y) => { const v = .5 + .5 * clamp(y / (H * .45), 0, 1); t.setRGB(v, v, v); }), root: p.root })), false);
  return { leaves: cardsGeo(out), core: merge(cores.map(g => ({ g })), false), trunk, h: H };
}

/* ══ ROCKS ════════════════════════════════════════════════════
   A boulder: a lump, cut flat in a few places (the faces a chisel or the weather
   left), softly shaded, warm grey, the tops taking moss and grass. */
function rockGeo(seed, flat) {
  const g = weld(new THREE.IcosahedronGeometry(1, 3)), p = g.attributes.position, r = rng(seed);
  const cuts = []; for (let i = 0; i < 5; i++) { const n = V3(r() - .5, (r() - .2) * .9, r() - .5).normalize(); cuts.push({ n, d: .62 + r() * .22 }); }
  for (let i = 0; i < p.count; i++) {
    const v = V3(p.getX(i), p.getY(i), p.getZ(i));
    let k = 1 + .22 * fbm3(v.x * 1.3, v.y * 1.3, v.z * 1.3, seed, 3) + .05 * noise3(v.x * 5, v.y * 5, v.z * 5, seed + 3);
    v.multiplyScalar(k);
    cuts.forEach(c => { const d = v.dot(c.n); if (d > c.d) v.addScaledVector(c.n, (c.d - d) * .85); });
    if (v.y < -.25) v.y = -.25 - (v.y + .25) * .2;
    v.y *= flat || .72;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}
/* a block with its edges worn round, a little chipped */
function roundBox(w, h, d, b, r) {
  const g = new THREE.BoxGeometry(w, h, d, 4, 4, 4), p = g.attributes.position;
  const hx = w / 2 - b, hy = h / 2 - b, hz = d / 2 - b, v = new THREE.Vector3(), q = new THREE.Vector3(), sd = (r() * 1e6) | 0;
  for (let i = 0; i < p.count; i++) {
    v.set(p.getX(i), p.getY(i), p.getZ(i));
    q.set(clamp(v.x, -hx, hx), clamp(v.y, -hy, hy), clamp(v.z, -hz, hz));
    v.sub(q); const l = v.length(); if (l > 1e-6) v.multiplyScalar(b / l);
    v.add(q);
    const k = 1 + .05 * noise3(v.x * 1.7, v.y * 1.7, v.z * 1.7, sd);
    p.setXYZ(i, v.x * k, v.y * k, v.z * k);
  }
  const o = weld(g.toNonIndexed()); o.computeVertexNormals();
  return o;
}
/* the tavern's dark wood, the table under the board: what the meadow is at the moment it starts growing */
const WOOD = C('#3a2717');

/* ══ THE WORLD ════════════════════════════════════════════════ */
function make(ctx) {
  const { scene, renderer } = ctx;
  const world = new THREE.Group(); world.name = 'world'; scene.add(world);
  const live = new THREE.Group(); world.add(live);           /* what is rebuilt for each fight */

  /* ── light ── */
  const hemi = new THREE.HemisphereLight(C('#cfe6ff'), C('#5c6e34'), .62); scene.add(hemi);
  const sun = new THREE.DirectionalLight(C('#fff0d8'), 1.55);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .04;
  const SC = sun.shadow.camera; SC.left = -88; SC.right = 88; SC.top = 88; SC.bottom = -88; SC.near = 1; SC.far = 600;
  scene.add(sun, sun.target);
  const fog = new THREE.FogExp2(C('#cfe3ee'), .00125); scene.fog = fog;

  /* ── the sky ── */
  const skyU = {
    uZen: { value: C('#2c78d0') }, uMid: { value: C('#6db0ec') }, uHor: { value: C('#d6eaf2') }, uLow: { value: C('#b9d3dc') },
    uSunDir: { value: V3(0, 1, 0) }, uSunCol: { value: C('#fff1d0') }, uDark: { value: C('#140d08') },
    uCloud: { value: .55 }, uGrow: U.uGrow, uT: U.uT
  };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(7000, 48, 24), new THREE.ShaderMaterial({
    uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
    fragmentShader: GL_NOISE + `uniform vec3 uZen, uMid, uHor, uLow, uSunDir, uSunCol, uDark; uniform float uCloud, uGrow, uT; varying vec3 vD;
      float cl(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * fwN(p); p = p * 2.07 + 9.3; a *= 0.5; } return v + 0.03; }
      void main(){
        vec3 d = normalize(vD); float h = d.y;
        vec3 c = mix(uHor, uMid, smoothstep(0.0, 0.2, h));
        c = mix(c, uZen, smoothstep(0.16, 0.8, h));
        c = mix(c, uLow, smoothstep(0.0, -0.06, h));
        float sd = max(dot(d, uSunDir), 0.0);
        c += uSunCol * (pow(sd, 5.0) * 0.18 + pow(sd, 90.0) * 0.6 + smoothstep(0.9993, 0.9997, sd) * 8.0);
        if (h > 0.0) {
          vec2 p = d.xz / (h + 0.14) * 1.15 + vec2(uT * 0.0045, uT * 0.0018);
          float n = cl(p * 1.25);
          float edge = smoothstep(0.47, 0.66, n);
          float c2 = smoothstep(0.02, 0.22, h) * uCloud;
          float n2 = cl(p * 1.25 + uSunDir.xz * 0.09);
          float lit = clamp(0.62 + (n - n2) * 5.0, 0.0, 1.0);
          vec3 cc = mix(vec3(0.58, 0.66, 0.8), vec3(1.04, 1.02, 0.98), lit) + uSunCol * pow(sd, 4.0) * 0.35;
          c = mix(c, cc, edge * c2);
          /* thin streaks high up, the way the wind draws them */
          float st = smoothstep(0.6, 0.85, fwN(vec2(p.x * 0.35 + p.y * 0.9, p.y * 6.0 - p.x * 2.0))) * smoothstep(0.25, 0.6, h) * 0.22 * uCloud;
          c = mix(c, vec3(1.0), st);
        }
        gl_FragColor = vec4(mix(uDark, c, uGrow), 1.0);
      }`
  }));
  sky.renderOrder = 40; sky.frustumCulled = false; world.add(sky);

  /* ── shared materials ── */
  const leafMaps = [leafSpray(11, 150, true), leafSpray(23, 170, false)];
  const barks = { oak: barkTex(5, '#5b4a3c', 'rgba(140,124,104,A)', 'rgba(36,28,22,A)'), birch: barkTex(9, '#e9e4d8', 'rgba(255,255,255,A)', 'rgba(150,140,128,A)', true) };
  const M = {};
  /* the ground: its own colours (painted per point, the noise finer than the points), cloud shadows going over */
  M.ground = patch(new THREE.MeshLambertMaterial({ vertexColors: true }), 'ground', {
    vh: 'attribute float aGrassy; attribute float aPath; varying vec3 vW; varying float vG; varying float vUnder; varying float vBare;',
    vp: `vec3 fwRoot = (modelMatrix * vec4(position.x, 0.0, position.z, 1.0)).xyz; vG = fwGrow(fwRoot); transformed.y *= smoothstep(0.0, 1.0, vG); vW = fwRoot;
         vUnder = aGrassy * (1.0 - smoothstep(GRASS_NEAR, GRASS_FAR, distance(cameraPosition.xz, fwRoot.xz))) * smoothstep(0.2, 0.9, vG);
         vBare = aPath;`,
    fh: 'varying vec3 vW; varying float vG; varying float vUnder; varying float vBare; uniform vec3 uWood;',
    fc: `float n1 = fwF(vW.xz * 0.06), n2 = fwN(vW.xz * 0.7);
         diffuseColor.rgb *= 0.9 + 0.16 * n1 + 0.06 * (n2 - 0.5);
         diffuseColor.rgb *= 1.0 - 0.2 * fwCloud(vW.xz);
         diffuseColor.rgb *= mix(1.0, 0.8, vUnder);
         float bare = vBare;
         vec2 gc = floor(vW.xz * 6.0), gf = fract(vW.xz * 6.0) - 0.5 + (vec2(fwH(gc + 1.7), fwH(gc + 5.3)) - 0.5) * 0.4;
         float dn = fwN(vW.xz * 1.1), grit = step(0.8, fwH(gc)) * (1.0 - smoothstep(0.12, 0.26, length(gf)));
         diffuseColor.rgb *= mix(1.0, 0.88 + 0.22 * dn, bare);
         diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.25, 1.2, 1.12), grit * bare * 0.55);
         diffuseColor.rgb = mix(uWood, diffuseColor.rgb, smoothstep(0.0, 0.35, vG));   /* green under the board before the board goes */`,
    uniforms: { uWood: { value: WOOD } }
  });
  /* grass blades: lit as the ground they grow from (so a field reads as one surface), darker at the root, bright at the tips,
     bending in the wind, coming up out of the ground as the world grows */
  const FEET_N = 48;
  const feet = []; for (let i = 0; i < FEET_N; i++) feet.push(new THREE.Vector4(0, 0, 1, 1));
  const footU = { uFeet: { value: feet }, uNFeet: { value: 0 } };
  const grassMat = trample => patch(new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), trample ? 'grassT' : 'grass', { same: true,
    uniforms: Object.assign({ uTipCol: { value: C('#c9dc6a') } }, trample ? footU : {}),
    vh: 'attribute vec2 aTip; varying float vTip; varying float vGust; varying float vVar; varying float vTr; varying float vCl;' + (trample ? 'uniform vec4 uFeet[' + FEET_N + ']; uniform float uNFeet;' : ''),
    vn: 'objectNormal = vec3(0.0, 1.0, 0.0);',
    vp: ROOT_I + ` float gw = fwGrow(fwRoot); float hgt = position.y; vTip = aTip.x; vVar = aTip.y; vTr = 0.0; vCl = fwCloud(fwRoot.xz);
         float df = 1.0 - smoothstep(GRASS_NEAR, GRASS_FAR, distance(cameraPosition.xz, fwRoot.xz));
         vGust = smoothstep(0.55, 0.85, fwN(fwRoot.xz * 0.045 - vec2(uT * 0.22, uT * 0.09)));
         transformed *= df; transformed.y *= gw;
         ${trample ? `
         vec2 away = vec2(0.0);
         for (int i = 0; i < ${FEET_N}; i++) {
           if (float(i) >= uNFeet) break;
           vec4 ft = uFeet[i]; vec2 d = fwRoot.xz - ft.xy; float l = length(d / ft.zw);
           float k = 1.0 - smoothstep(0.5, 1.2, l);
           if (k > vTr) { vTr = k; away = d / max(length(d), 0.001); }
         }
         transformed.y *= 1.0 - 0.55 * vTr;
         transformed.xz += away * vTr * hgt * 0.5;` : ''}
         vec2 sw = fwSway(fwRoot) * (0.55 + 0.45 * fwN(fwRoot.xz * 0.3)) * (1.0 + vGust * 0.9) * (1.0 - vTr);
         transformed.xz += sw * hgt * hgt * 0.3;
         transformed.y -= length(sw) * hgt * hgt * 0.06;`,
    fh: 'varying float vTip; varying float vGust; varying float vVar; varying float vTr; varying float vCl; uniform vec3 uTipCol;',
    fc: `float t2 = vTip * vTip;
         diffuseColor.rgb *= mix(0.74, 1.04, vTip) * (0.95 + 0.1 * vVar);
         diffuseColor.rgb = mix(diffuseColor.rgb, uTipCol * (0.85 + 0.25 * vVar), t2 * 0.32);
         diffuseColor.rgb *= (1.0 + 0.12 * vGust * vTip) * (1.0 - 0.3 * vTr * (1.0 - 0.5 * vTip)) * (1.0 - 0.2 * vCl);`,
    fo: 'outgoingLight += diffuseColor.rgb * 0.07 * vTip;'
  });
  M.grass = grassMat(false); M.grassT = grassMat(true);
  /* leaves: the spray, coloured per tree, lit through the crown's own round normals, bending in the wind */
  const leafMat = (map, key) => patch(new THREE.MeshLambertMaterial({ map, vertexColors: true, alphaTest: .42, alphaToCoverage: true, side: THREE.DoubleSide }), key, { same: true,
    vproj: `vec4 mvPosition = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
        float isc = length(instanceMatrix[0].xyz);
      #else
        float isc = 1.0;
      #endif
      mvPosition = modelViewMatrix * mvPosition;
      mvPosition.xy += aOff * isc * lw;
      gl_Position = projectionMatrix * mvPosition;`,
    vh: 'attribute vec3 aRoot; attribute vec2 aOff; varying float vCl;',
    fh: 'varying float vCl;',
    fc: 'diffuseColor.rgb *= 1.0 - 0.2 * vCl;',
    vp: ROOT_I + ` float lw = fwPop(fwGrow(fwRoot)); vCl = fwCloud(fwRoot.xz);
         vec3 wp = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
         vec2 sw = fwSway(wp) * 0.22 * clamp(position.y / 12.0, 0.0, 1.5);
         transformed.xz += sw + vec2(sin(uT * 2.6 + wp.y * 0.9 + wp.x), cos(uT * 2.2 + wp.z * 0.8)) * 0.07;
         transformed *= lw;`,
    fo: 'outgoingLight += diffuseColor.rgb * 0.14;'
  });
  M.leavesA = leafMat(leafMaps[0], 'leavesA');
  /* the heart of a crown: the same colour, swaying with its leaves */
  M.crown = patch(new THREE.MeshLambertMaterial({ vertexColors: true }), 'crown', {
    vh: 'varying float vCl; varying vec3 vLP;', fh: 'varying float vCl; varying vec3 vLP;',
    fc: `float c1 = fwN(vLP.xz * 0.55 + vLP.y * 0.45), c2 = fwN(vec2(vLP.x * 2.2 - vLP.y * 1.7, vLP.z * 2.2 + vLP.y * 1.3)), c3 = fwN(vLP.xy * 5.0 + vLP.zz * 3.0);
         diffuseColor.rgb *= (0.8 + 0.32 * c1) * (0.9 + 0.2 * c2) * (0.94 + 0.12 * c3);
         diffuseColor.rgb *= 1.0 - 0.2 * vCl;`,
    ve: 'vLP = position;',
    vp: ROOT_I + ` float lw = fwPop(fwGrow(fwRoot)); vCl = fwCloud(fwRoot.xz);
         vec3 wp = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
         transformed.xz += fwSway(wp) * 0.22 * clamp(position.y / 12.0, 0.0, 1.5);
         transformed *= lw;`,
    fo: 'outgoingLight += diffuseColor.rgb * 0.1;'
  });
  M.leavesB = leafMat(leafMaps[1], 'leavesB');
  const barkMat = (map, key) => patch(new THREE.MeshStandardMaterial({ map, vertexColors: true, roughness: .92 }), key, {
    vp: ROOT_I + ' transformed *= fwPop(fwGrow(fwRoot));'
  });
  M.oak = barkMat(barks.oak, 'oak'); M.birch = barkMat(barks.birch, 'birch');
  /* worked wood: weathered grey-brown, the grain along it */
  M.timber = patch(new THREE.MeshStandardMaterial({ map: barkTex(17, '#7a6450', 'rgba(170,150,124,A)', 'rgba(52,40,30,A)'), vertexColors: true, roughness: .9 }), 'timber', {
    vh: 'attribute vec3 aRoot;',
    vp: ROOT_A + ' transformed = (transformed - aRoot) * fwPop(fwGrow(fwRoot)) + aRoot;'
  });
  /* rock and stone: their own colours; whatever faces up takes moss */
  const mossy = (key, inst, moss) => patch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .93 }), key, {
    vh: (inst ? '' : 'attribute vec3 aRoot;\n') + 'varying vec3 vWN; varying vec3 vWP; varying float vRY;',
    vp: (inst ? ROOT_I : ROOT_A) + ' transformed = (transformed - (' + (inst ? 'vec3(0.0)' : 'aRoot') + ')) * fwPop(fwGrow(fwRoot)) + ' + (inst ? 'vec3(0.0)' : 'aRoot') + ';',
    ve: 'vWN = normalize(mat3(modelMatrix) * ' + (inst ? 'mat3(instanceMatrix) * ' : '') + 'objectNormal); vWP = (modelMatrix * ' + (inst ? 'instanceMatrix * ' : '') + 'vec4(transformed, 1.0)).xyz; vRY = fwRoot.y;',
    fh: 'varying vec3 vWN; varying vec3 vWP; varying float vRY; uniform vec3 uMoss;',
    fc: `float g = fwF(vWP.xz * 0.9 + vWP.y * 0.7), g2 = fwF(vec2(vWP.x * 3.0 + vWP.z * 3.0, vWP.y * 0.6));
         float m = smoothstep(${inst ? '0.86, 0.98' : '0.55, 0.85'}, vWN.y + (fwF(vWP.xz * 0.35 + vWP.y * 0.2) - 0.5) * 0.35);
         float foot = (1.0 - smoothstep(0.0, 2.2, vWP.y - vRY + (g - 0.5) * 2.0)) * ${inst ? '0.0' : '0.8'};
         diffuseColor.rgb *= (0.8 + 0.4 * g) * (0.86 + 0.18 * g2);
         diffuseColor.rgb = mix(diffuseColor.rgb, uMoss * (0.75 + 0.45 * g), clamp(m * ${moss} + foot, 0.0, 1.0));`,
    uniforms: { uMoss: { value: C('#4f6f36') } }
  });
  M.rock = mossy('rock', true, '.6');
  M.stone = mossy('stone', false, '.75');
  /* far trees: a blob on a stick, many of them */
  M.far = patch(new THREE.MeshLambertMaterial({ vertexColors: true }), 'far', {
    vp: ROOT_I + ' transformed *= fwPop(fwGrow(fwRoot));'
  });
  /* flowers: a little star of petals on a stem */
  M.flower = patch(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), 'flower', { same: true,
    vh: 'attribute float aPetal; varying float vPetal;',
    fh: 'varying float vPetal;',
    fc: 'diffuseColor.rgb = vPetal < 0.5 ? vec3(0.09, 0.2, 0.05) : vPetal > 1.5 ? vec3(0.95, 0.68, 0.08) : diffuseColor.rgb;',
    vn: 'objectNormal = vec3(0.0, 1.0, 0.0);',
    vp: ROOT_I + ` float gw = fwGrow(fwRoot); transformed *= gw; vPetal = aPetal;
         transformed.xz += fwSway(fwRoot) * position.y * position.y * 0.25;`,
    fo: 'outgoingLight += diffuseColor.rgb * (vPetal > 0.5 ? 0.3 : 0.05);'
  });
  /* a mushroom: aPart says stem (-1), cap (1) or spot (2); the cap is the instance's colour */
  M.shroom = patch(new THREE.MeshLambertMaterial({ vertexColors: true }), 'shroom', {
    vh: 'attribute float aPart; varying float vPart;', fh: 'varying float vPart;',
    vp: ROOT_I + ' vPart = aPart; transformed *= fwPop(fwGrow(fwRoot));',
    fc: 'diffuseColor.rgb = vPart < 0.0 ? vec3(0.86, 0.8, 0.68) : vPart > 1.5 ? vec3(0.95, 0.93, 0.88) : diffuseColor.rgb;',
    fo: 'outgoingLight += diffuseColor.rgb * 0.12;'
  });
  /* the mountains: lit by the sun, lost in the haze with height and distance */
  const mtnMat = (rock, green, haze, snow, hz) => new THREE.ShaderMaterial({
    uniforms: { uRock: { value: C(rock) }, uGreen: { value: C(green) }, uHaze: { value: C(haze) }, uSnow: { value: C('#f3f6fb') }, uSnowLine: { value: snow }, uHazeK: { value: hz },
                uSunDir: { value: V3(0, 1, 0) }, uDark: skyU.uDark, uGrow: U.uGrow },
    fog: false,
    vertexShader: `varying vec3 vN; varying vec3 vW; uniform float uGrow;
      void main(){ vN = normalize(mat3(modelMatrix) * normal); vec3 p = position; p.y = (p.y + 80.0) * smoothstep(0.35, 1.0, uGrow) - 80.0;
        vW = (modelMatrix * vec4(p, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }`,
    fragmentShader: GL_NOISE + `uniform vec3 uRock, uGreen, uHaze, uSnow, uSunDir, uDark; uniform float uSnowLine, uHazeK, uGrow; varying vec3 vN; varying vec3 vW;
      void main(){
        vec3 n = normalize(vN);
        float l = max(dot(n, uSunDir), 0.0);
        float st = fwF(vW.xz * 0.007 + vec2(vW.y * 0.004));
        float steep = 1.0 - n.y;
        vec3 base = mix(uGreen, uRock, smoothstep(0.18, 0.42, steep + (st - 0.5) * 0.35));
        base = mix(base, uRock, smoothstep(220.0, 520.0, vW.y + (st - 0.5) * 120.0) * 0.7);
        base *= 0.86 + 0.28 * st;
        float sn = smoothstep(uSnowLine - 30.0, uSnowLine + 50.0, vW.y + (st - 0.5) * 200.0) * smoothstep(0.38, 0.62, n.y + 0.1);
        base = mix(base, uSnow, sn);
        vec3 shade = mix(base, vec3(0.32, 0.4, 0.58), 0.55) * 0.62, lit = base * vec3(1.08, 1.03, 0.94) * 1.18;
        vec3 c = mix(shade, lit, smoothstep(0.05, 0.6, l));
        float hz = uHazeK * (1.0 - 0.5 * smoothstep(-60.0, 700.0, vW.y));
        c = mix(c, uHaze, clamp(hz, 0.0, 1.0));
        gl_FragColor = vec4(mix(uDark, c, smoothstep(0.35, 1.0, uGrow)), 1.0);
      }`
  });
  M.mtnNear = mtnMat('#7c8a8e', '#4c7a44', '#b8d0e0', 99999, .34);
  M.mtnFar = mtnMat('#7a8aa6', '#5a7c6a', '#c0d4e6', 700, .46);
  /* the brook's water */
  M.water = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide,
    uniforms: { uT: U.uT, uGrow: U.uGrow, uFlow: { value: 1 }, uSunDir: skyU.uSunDir, uSunCol: skyU.uSunCol, uSky: skyU.uMid, uHor: skyU.uHor,
                uDeep: { value: C('#1a5466') }, uShallow: { value: C('#2f7f86') }, uFogC: { value: C('#cfe3ee') }, uFogD: { value: 0 } },
    vertexShader: `varying vec2 vUv; varying vec3 vW;
      void main(){ vUv = uv; vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: GL_NOISE + `uniform float uT, uGrow, uFlow, uFogD; uniform vec3 uSunDir, uSunCol, uSky, uHor, uDeep, uShallow, uFogC; varying vec2 vUv; varying vec3 vW;
      void main(){
        float across = abs(vUv.y - 0.5) * 2.0;
        vec2 fl = vec2(vUv.x * 5.0 - uT * 0.75 * uFlow, vUv.y * 2.6);
        float n1 = fwN(fl * 1.4), n2 = fwN(fl * 3.1 + 7.0), n3 = fwN(vec2(vUv.x * 9.0 - uT * 1.3 * uFlow, vUv.y * 9.0));
        vec3 N = normalize(vec3((n1 - 0.5) * 0.45 + (n3 - 0.5) * 0.2, 1.0, (n2 - 0.5) * 0.4));
        vec3 V = normalize(cameraPosition - vW);
        float fres = pow(1.0 - max(dot(V, N), 0.0), 3.0);
        vec3 base = mix(uDeep, uShallow, smoothstep(0.25, 1.0, across));
        vec3 R = reflect(-V, N);
        vec3 sky = uSky * (0.78 + 0.3 * clamp(R.y * 2.0, 0.0, 1.0));
        vec3 col = mix(base, sky, 0.14 + 0.42 * fres);
        col += uSunCol * pow(max(dot(R, uSunDir), 0.0), 140.0) * 2.4;
        col += vec3(0.85, 0.95, 1.0) * smoothstep(0.75, 0.95, fwN(vec2(vUv.x * 11.0 - uT * 1.7 * uFlow, vUv.y * 16.0))) * 0.1 * (1.0 - across);
        float foam = smoothstep(0.8, 0.98, across + (fwN(fl * 3.2) - 0.5) * 0.3);
        col = mix(col, vec3(0.86, 0.92, 0.92), foam * 0.5);
        float fd = length(vW - cameraPosition); col = mix(col, uFogC, 1.0 - exp(-uFogD * uFogD * fd * fd));
        gl_FragColor = vec4(col, (0.86 + 0.12 * fres) * smoothstep(0.6, 1.0, uGrow));
      }`
  });
  /* the motes in the air */
  M.mote = new THREE.PointsMaterial({ map: moteTex(), size: .26, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: C('#fff6d8'), opacity: .8 });

  /* shadows cut out by the leaves, not thrown by the cards */
  const leafDepth = map => new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: .48 });
  const DEPTH = { A: leafDepth(leafMaps[0]), B: leafDepth(leafMaps[1]) };

  /* ── geometries made once ── */
  const G = {};
  G.tree = {
    oak: [makeTree('oak', 101), makeTree('oak', 202)],
    round: [makeTree('round', 303), makeTree('round', 404)],
    birch: [makeTree('birch', 505), makeTree('birch', 606)],
    bush: [makeTree('bush', 707), makeTree('bush', 808)],
    lite: [makeTree('lite', 909), makeTree('lite', 919)]
  };
  G.rocks = [1, 2, 3, 4, 5].map(i => paint(rockGeo(i * 97), (t, x, y, z, ny, i2) => {
    const v = .68 + .32 * (fbm3(x * 2, y * 2, z * 2, i * 7, 2) * .5 + .5), band = .92 + .08 * Math.sin(y * 9 + fbm3(x * 3, 0, z * 3, i, 2) * 3);
    t.copy(C(i % 2 ? '#a19a8c' : '#958f85')).multiplyScalar(v * band * (ny < -.2 ? .6 : ny > .5 ? 1.08 : 1));
  }));
  /* a grass clump: blades from one root, curved, the colour's red channel says how far up the blade (the shader reads it) */
  G.clump = (() => {
    const r = rng(42), pos = [], tip = [], idx = [];
    for (let b = 0; b < 9; b++) {
      const a = r() * 6.283, rr = Math.pow(r(), .7) * .6, ox = Math.cos(a) * rr, oz = Math.sin(a) * rr;
      const dir = a + (r() - .5) * 1.4, lean = .1 + r() * .32 + rr * .35, h = .5 + r() * .5, w = .05 + r() * .028, v = r();
      const dx = Math.cos(dir), dz = Math.sin(dir), fa = r() * 6.283, px = -Math.sin(fa) * w, pz = Math.cos(fa) * w;
      const o = pos.length / 3;
      [[0, 1], [.5, .7], [1, 0]].forEach(([u, k]) => {
        const bend = lean * u * u, x = ox + dx * bend, z = oz + dz * bend, y = h * u * (1 - .12 * u * lean);
        if (k > 0) { pos.push(x - px * k, y, z - pz * k, x + px * k, y, z + pz * k); tip.push(u, v, u, v); }
        else { pos.push(x, y, z); tip.push(1, v); }
      });
      idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2, o + 2, o + 3, o + 4);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aTip', new THREE.Float32BufferAttribute(tip, 2));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
    g.setIndex(idx);
    return g;
  })();
  /* the same, thinner, for the meadow further off: half the blades, a little broader */
  G.clumpLo = (() => {
    const r = rng(43), pos = [], tip = [], idx = [];
    for (let b = 0; b < 6; b++) {
      const a = r() * 6.283, rr = Math.pow(r(), .7) * .6, ox = Math.cos(a) * rr, oz = Math.sin(a) * rr;
      const dir = a + (r() - .5) * 1.4, lean = .1 + r() * .3 + rr * .3, h = .55 + r() * .45, w = .075 + r() * .03, v = r();
      const dx = Math.cos(dir), dz = Math.sin(dir), fa = r() * 6.283, px = -Math.sin(fa) * w, pz = Math.cos(fa) * w;
      const o = pos.length / 3;
      [[0, 1], [1, 0]].forEach(([u, k]) => {
        const bend = lean * u * u, x = ox + dx * bend, z = oz + dz * bend, y = h * u;
        if (k > 0) { pos.push(x - px, y, z - pz, x + px, y, z + pz); tip.push(u, v, u, v); }
        else { pos.push(x, y, z); tip.push(1, v); }
      });
      idx.push(o, o + 1, o + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aTip', new THREE.Float32BufferAttribute(tip, 2));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
    g.setIndex(idx);
    return g;
  })();
  /* a flower: five petals round a heart, on a stem */
  G.flower = (() => {
    const pos = [], col = [], idx = [], pet = [], H = 1.25;
    pos.push(-.035, 0, 0, .035, 0, 0, 0, H, 0); col.push(1, 1, 1, 1, 1, 1, 1, 1, 1); pet.push(0, 0, 0); idx.push(0, 1, 2);
    /* the petals: a fan whose edge swells into five round lobes */
    const c0 = pos.length / 3, N = 25; pos.push(0, H + .03, 0); col.push(1, 1, 1); pet.push(1);
    for (let i = 0; i <= N; i++) {
      const a = i / N * 6.283, rr = .14 + .2 * Math.pow(Math.abs(Math.cos(a * 2.5)), .7);
      pos.push(Math.cos(a) * rr, H + .02 + rr * .25, Math.sin(a) * rr); col.push(1, 1, 1); pet.push(1);
    }
    for (let i = 0; i < N; i++) idx.push(c0, c0 + 1 + i, c0 + 2 + i);
    /* the heart: a small yellow disc over the petals */
    const h0 = pos.length / 3; pos.push(0, H + .07, 0); col.push(1.6, 1.25, .25); pet.push(2);
    for (let i = 0; i <= 8; i++) { const a = i / 8 * 6.283; pos.push(Math.cos(a) * .075, H + .06, Math.sin(a) * .075); col.push(1.4, 1.05, .2); pet.push(2); }
    for (let i = 0; i < 8; i++) idx.push(h0, h0 + 1 + i, h0 + 2 + i);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('aPetal', new THREE.Float32BufferAttribute(pet, 1));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
    g.setIndex(idx);
    return g;
  })();
  G.shroom = (() => {
    const st = new THREE.CylinderGeometry(.16, .2, .9, 8); st.translate(0, .45, 0);
    const cap = new THREE.SphereGeometry(.55, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2); cap.scale(1, .72, 1); cap.translate(0, .82, 0);
    const under = new THREE.CircleGeometry(.55, 12); under.rotateX(Math.PI / 2); under.translate(0, .82, 0);
    const g = merge([{ g: st }, { g: cap }, { g: under }], false);
    const n1 = st.attributes.position.count, n2 = cap.attributes.position.count, part = new Float32Array(g.attributes.position.count), p = g.attributes.position;
    for (let i = 0; i < part.length; i++) {
      if (i < n1 || i >= n1 + n2) { part[i] = -1; continue; }
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      part[i] = (Math.sin(x * 9) * Math.sin(z * 9) > .5 && y > 1) ? 2 : 1;
    }
    g.setAttribute('aPart', new THREE.BufferAttribute(part, 1));
    return g;
  })();
  /* a far tree: a soft lump of crown on a short trunk */
  G.far = (() => {
    const crown = weld(new THREE.DodecahedronGeometry(1, 0)), p = crown.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + .16 * noise3(x * 2.2, y * 2.2, z * 2.2, 5); p.setXYZ(i, x * k * 3.6, y * k * 4.0 + 7.4, z * k * 3.6); }
    crown.computeVertexNormals();
    paint(crown, (t, x, y) => { const v = .5 + .55 * clamp((y - 4) / 8, 0, 1); t.setRGB(v, v, v); });
    const tr = new THREE.CylinderGeometry(.35, .5, 4.5, 4, 1, true); tr.translate(0, 2.2, 0);
    paint(tr, t => t.setRGB(.28, .2, .14));
    return merge([{ g: crown }, { g: tr }], false);
  })();

  /* ══ BUILD ONE FIGHT'S MEADOW ═══════════════════════════════ */
  let LAY = null;
  const TOD = {
    day:     { grade: [1, 1, 1], el: 44, az: 72, sun: '#fff0d6', si: 1.75, hemi: .62, zen: '#2a6fcc', mid: '#62a8e8', hor: '#cfe6f2', haze: '#c4dcea', cloud: .75 },
    morning: { grade: [.98, 1.0, 1.04], el: 30, az: -66, sun: '#ffecc8', si: 1.7, hemi: .64, zen: '#3a7ed2', mid: '#7cb8e8', hor: '#e0ecf0', haze: '#cfe0ea', cloud: .6 },
    golden:  { grade: [1.1, .99, .82], el: 21, az: 80, sun: '#ffbd72', si: 1.95, hemi: .5, zen: '#4673ba', mid: '#8eb0d4', hor: '#f4cfa2', haze: '#e6ccb0', cloud: .8, warm: 1 }
  };
  const PALS = {
    grass: { deep: '#36632a', mid: '#4f8434', sun: '#76a142', dry: '#959a52', path: '#bea172', pathD: '#8c714a', earth: '#7a6544', rock: '#8a8577' }
  };
  function dispose(g) {
    g.traverse(o => { if (o.isInstancedMesh || o.isMesh || o.isPoints) { if (o.userData.own) o.geometry.dispose(); } });
    g.clear();
  }
  /* the whole meadow at once (going in before it was ready), or a piece at a time (buildGen: getting ready while the
     table is being played) */
  function build(seed, W, D) { const it = buildGen(seed, W, D); let r; do { r = it.next(); } while (!r.done); return r.value; }
  function* buildGen(seed, W, D) {
    dispose(live);
    const r = rng(seed), hw = W / 2, hd = D / 2;
    const tod = TOD[['day', 'day', 'morning', 'golden'][(r() * 4) | 0]];
    const pal = PALS.grass;
    const P = { seed, W, D, hw, hd, tod };
    P.ruinSide = r() < .5 ? -1 : 1;
    P.valleyX = (r() - .5) * 260;
    P.autumn = r() < .4 ? .2 + r() * .35 : 0;
    /* ── the shape of the land ── */
    const padOut = (x, z) => Math.hypot(Math.max(0, Math.abs(x) - (hw + 7)), Math.max(0, Math.abs(z) - (hd + 7)));
    const path = []; {
      const side = -P.ruinSide, a = r() * 6;
      const ctrl = [V3(P.valleyX * 1.4, 0, -1400), V3(P.valleyX * .6, 0, -420), V3(P.valleyX * .2 + side * 20, 0, -150), V3(side * (hw * .3), 0, -hd - 16),
                    V3(side * (hw + 22), 0, -hd * .2), V3(side * (hw + 60), 0, hd * .6), V3(side * 320, 0, hd + 120)];
      for (let i = 0; i < ctrl.length - 1; i++) for (let k = 0; k < 12; k++) {
        const u = k / 12, p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
        const cr = (a0, a1, a2, a3) => .5 * (2 * a1 + (-a0 + a2) * u + (2 * a0 - 5 * a1 + 4 * a2 - a3) * u * u + (-a0 + 3 * a1 - 3 * a2 + a3) * u * u * u);
        path.push([cr(p0.x, p1.x, p2.x, p3.x) + Math.sin(i * 3 + k * .4 + a) * 1.5, cr(p0.z, p1.z, p2.z, p3.z)]);
      }
    }
    const PCAP = 32, PG = { cs: 16 };
    {
      let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9;
      path.forEach(p => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); });
      PG.x0 = x0 - PCAP; PG.z0 = z0 - PCAP; PG.nx = Math.ceil((x1 - x0 + 2 * PCAP) / PG.cs) + 1; PG.nz = Math.ceil((z1 - z0 + 2 * PCAP) / PG.cs) + 1;
      PG.cells = new Array(PG.nx * PG.nz);
      for (let s = 0; s < path.length - 1; s++) {
        const a = path[s], b = path[s + 1];
        const i0 = Math.floor((Math.min(a[0], b[0]) - PCAP - PG.x0) / PG.cs), i1 = Math.floor((Math.max(a[0], b[0]) + PCAP - PG.x0) / PG.cs);
        const j0 = Math.floor((Math.min(a[1], b[1]) - PCAP - PG.z0) / PG.cs), j1 = Math.floor((Math.max(a[1], b[1]) + PCAP - PG.z0) / PG.cs);
        for (let j = Math.max(0, j0); j <= Math.min(PG.nz - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(PG.nx - 1, i1); i++) (PG.cells[j * PG.nx + i] || (PG.cells[j * PG.nx + i] = [])).push(s);
      }
    }
    const pathD = (x, z) => {
      const i = Math.floor((x - PG.x0) / PG.cs), j = Math.floor((z - PG.z0) / PG.cs);
      if (i < 0 || j < 0 || i >= PG.nx || j >= PG.nz) return PCAP;
      const list = PG.cells[j * PG.nx + i]; if (!list) return PCAP;
      let best = PCAP;
      for (let k = 0; k < list.length; k++) {
        const s = list[k], ax = path[s][0], az = path[s][1], bx = path[s + 1][0], bz = path[s + 1][1];
        const vx = bx - ax, vz = bz - az, t = clamp(((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz || 1), 0, 1);
        const d = Math.hypot(x - ax - vx * t, z - az - vz * t); if (d < best) best = d;
      }
      return best;
    };
    P.pathD = pathD;
    /* THE BROOK runs across the back of the meadow, at the foot of the hills, bending away into them at both sides;
       the path crosses it by a bridge. It is a line z(x), so how far a point is from it is cheap to know. */
    const BK = { zb: -hd - 90 - r() * 12, ph: r() * 6.28, flow: r() < .5 ? -1 : 1 };
    const bkZ = x => BK.zb + Math.sin(x * .018 + BK.ph) * 9 + Math.sin(x * .047 + BK.ph * 2) * 3.5 - Math.max(0, Math.abs(x) - 140) * .35;
    const bkDZ = x => .162 * Math.cos(x * .018 + BK.ph) + .1645 * Math.cos(x * .047 + BK.ph * 2) - (Math.abs(x) > 140 ? .35 * Math.sign(x) : 0);
    const bkW = x => 4.4 + 1.5 * Math.sin(x * .031 + BK.ph * 3);                 /* half its width */
    const brookD = (x, z) => Math.abs(z - bkZ(x)) / Math.sqrt(1 + bkDZ(x) * bkDZ(x));
    const nearBrook = (x, z, m) => brookD(x, z) < bkW(x) + (m || 0);
    P.brook = { z: bkZ, w: bkW, d: brookD };
    const heightRaw = (x, z) => {
      const d = padOut(x, z);
      const m = smooth(clamp(d / 16, 0, 1));
      let h = m * 1.5 * fbm2(x * .028, z * .028, seed, 3);
      const back = Math.max(0, -z - hd - 14), side = Math.max(0, Math.abs(x) - hw - 22), front = Math.max(0, z - hd - 30);
      const away = Math.hypot(side, back);
      let rise = 24 * Math.pow(Math.max(0, away - 12) / 110, 1.45) * (.7 + .3 * (fbm2(x * .007, z * .007, seed + 5, 3) + 1));
      rise = rise / (1 + rise / 260) ;
      rise *= 1 - .65 * Math.exp(-Math.pow((x - P.valleyX * clamp(back / 400, 0, 1)) / (110 + back * .35), 2)) * smooth(clamp(back / 90, 0, 1));
      rise += smooth(clamp((away - 420) / 600, 0, 1)) * (40 + 60 * fbm2(x * .0016, z * .0016, seed + 9, 3));
      h += rise - Math.min(front, 60) * .06 + Math.max(0, front - 140) * .25;
      /* the path is a little sunk into the land, worn */
      const pd = pathD(x, z); if (pd < 4) h -= .25 * smooth(1 - pd / 4) * m;
      return h;
    };
    const heightAt = (x, z) => {
      let h = heightRaw(x, z);
      const bd = brookD(x, z), w = bkW(x);
      if (bd < w + 9) {
        const hc = heightRaw(x, bkZ(x));
        h = lerp(h, hc, 1 - smooth(clamp((bd - w) / 9, 0, 1)));
        h -= 1.7 * (1 - smooth(clamp((bd - w * .55) / (w * .45 + 2.4), 0, 1)));
      }
      return h;
    };
    BK.level = x => heightRaw(x, bkZ(x)) - .9;
    P.heightAt = heightAt;
    P.padOut = padOut;
    LAY = P;
    /* THE MEADOW'S COLOUR at a point: big soft patches of deeper and sunnier green, now and then a drift of drier grass,
       a shade fresher where the fight has trodden it. The ground is painted with it and every blade grows out of it, so
       the field is one surface however close you come. */
    const fDeep = C('#3a6a2c'), fMid = C('#548d36'), fSun = C('#7cae42'), fDry = C('#a2ab55'), fFresh = C('#66a03c');
    const fieldCol = (x, z, out) => {
      const n1 = fbm2(x * .012, z * .012, seed + 21, 3) * .5 + .5, n2 = fbm2(x * .04, z * .04, seed + 22, 2) * .5 + .5, n3 = fbm2(x * .1, z * .1, seed + 24, 2) * .5 + .5;
      out.copy(fMid).lerp(fSun, smooth(clamp(n1 * 1.5 - .3, 0, 1)) * .85);
      out.lerp(fDeep, smooth(clamp((.48 - n2) * 2.6, 0, 1)) * .75);
      out.lerp(fDry, smooth(clamp((n2 - .72) * 3.2, 0, 1)) * .5 * smooth(clamp((n1 - .35) * 3, 0, 1)));
      out.multiplyScalar(.95 + .1 * n3);
      const pd = padOut(x, z); if (pd < 8) out.lerp(fFresh, .22 * (1 - pd / 8));
      if (P.occAt) { const o = P.occAt(x, z); if (o > 0) out.multiplyScalar(1 - .55 * o).lerp(fDeep, o * .25); }
      return out;
    };
    P.fieldCol = fieldCol;
    /* where the grass grows (the ground under it is in its shade) */
    const grassy = (x, z) => {
      const dist = Math.hypot(x, z * 1.2);
      if (z < -150 || z > hd + 75 || Math.abs(x) > 130) return 0;
      return (1 - smooth(clamp((dist - 140) / 25, 0, 1))) * smooth(clamp((pathD(x, z) - 2) / 2, 0, 1)) * smooth(clamp((brookD(x, z) - bkW(x) - .6) / 1.4, 0, 1));
    };

    /* ── light and sky for the time of day ── */
    const el = tod.el * Math.PI / 180, az = tod.az * Math.PI / 180;
    const sd = V3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).normalize();
    P.sunDir = sd;
    sun.position.copy(sd).multiplyScalar(300).add(V3(0, 0, -10)); sun.target.position.set(0, 0, -10);
    sun.color.copy(C(tod.sun)); P.si = tod.si; P.hemi = tod.hemi;
    skyU.uSunDir.value.copy(sd); skyU.uSunCol.value.copy(C(tod.sun));
    skyU.uZen.value.copy(C(tod.zen)); skyU.uMid.value.copy(C(tod.mid)); skyU.uHor.value.copy(C(tod.hor)); skyU.uLow.value.copy(C(tod.haze));
    skyU.uCloud.value = tod.cloud;
    P.haze = C(tod.haze);
    M.mtnNear.uniforms.uSunDir.value.copy(sd); M.mtnFar.uniforms.uSunDir.value.copy(sd);
    M.mtnNear.uniforms.uHaze.value.copy(C(tod.haze)); M.mtnFar.uniforms.uHaze.value.copy(C(tod.haze)).lerp(C(tod.hor), .35);

    /* ── the ground ── */
    {
      /* fine (2.4 units) out to the hills, the brook and the bridge; coarse only far off */
      const N = 321, half = (N - 1) / 2, A = 380, B = 2600 - A;
      const sx = u => Math.sign(u) * (A * Math.abs(u) + B * Math.pow(Math.abs(u), 6));
      const pos = new Float32Array(N * N * 3), col = new Float32Array(N * N * 3), gr = new Float32Array(N * N), pa = new Float32Array(N * N), idx = [];
      const cBank = C('#4e5634'), cBed = C('#3a4a3c'), cFar = C('#335f36'), cDeep = C(pal.deep), cMid = C(pal.mid), cSun = C(pal.sun), cDry = C(pal.dry), cPath = C(pal.path), cPathD = C(pal.pathD), cEarth = C(pal.earth), cRock = C(pal.rock);
      const t = new THREE.Color(), t2 = new THREE.Color();
      const GX = new Float32Array(N); for (let i = 0; i < N; i++) GX[i] = sx(i / half - 1);
      for (let j = 0; j < N; j++) { for (let i = 0; i < N; i++) { const k = j * N + i; pos[k * 3] = GX[i]; pos[k * 3 + 1] = heightAt(GX[i], GX[j]); pos[k * 3 + 2] = GX[j]; } if (j % 80 === 79) yield; }
      const hAt = (i, j) => pos[(clamp(j, 0, N - 1) * N + clamp(i, 0, N - 1)) * 3 + 1];
      for (let j = 0; j < N; j++) { if (j && j % 64 === 0) yield; for (let i = 0; i < N; i++) {
        const x = GX[i], z = GX[j], k = j * N + i;
        const dxw = GX[Math.min(N - 1, i + 1)] - GX[Math.max(0, i - 1)], dzw = GX[Math.min(N - 1, j + 1)] - GX[Math.max(0, j - 1)];
        const sl = Math.hypot((hAt(i + 1, j) - hAt(i - 1, j)) / dxw, (hAt(i, j + 1) - hAt(i, j - 1)) / dzw);
        fieldCol(x, z, t);
        const far = smooth(clamp((Math.hypot(x, z) - 110) / 600, 0, 1)), n3 = fbm2(x * .004, z * .004, seed + 23, 3) * .5 + .5;
        t.lerp(cFar, far * (.4 + .45 * n3));
        t.lerp(cDry, far * smooth(clamp((n3 - .62) * 3, 0, 1)) * .35);
        gr[k] = grassy(x, z);
        /* steep ground shows its earth, steeper its rock */
        t.lerp(cEarth, smooth(clamp((sl - .55) * 2.5, 0, 1)) * .8);
        t.lerp(cRock, smooth(clamp((sl - 1.1) * 2, 0, 1)) * .85);
        { const bd = brookD(x, z), w = bkW(x); if (bd < w + 3) { t.lerp(cBank, (1 - smooth(clamp((bd - w) / 3, 0, 1))) * .75); if (bd < w) t.lerp(cBed, 1 - bd / w); } }
        const pdd = pathD(x, z), pw = 2.4 + 2 * clamp(-z / 600, 0, 1) * 6;
        pa[k] = smooth(clamp((pw + 1.4 - pdd) / 1.6, 0, 1)); if (pdd < pw + 1.4) { t2.copy(cPath).lerp(cPathD, clamp(.5 + fbm2(x * .3, z * .3, seed + 3, 2), 0, 1) * .6); t.lerp(t2, smooth(clamp((pw + 1.4 - pdd) / 1.6, 0, 1)) * (.85 + .15 * noise2(x * .9, z * .9, seed))); }
        col[k * 3] = t.r; col[k * 3 + 1] = t.g; col[k * 3 + 2] = t.b;
      } }
      for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) { const a = j * N + i, b = a + 1, c = a + N, d = c + 1; idx.push(a, c, b, b, c, d); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.setAttribute('aGrassy', new THREE.BufferAttribute(gr, 1)); g.setAttribute('aPath', new THREE.BufferAttribute(pa, 1));
      g.setIndex(idx); g.computeVertexNormals();
      const ground = new THREE.Mesh(g, M.ground); ground.receiveShadow = true; ground.userData.own = 1; ground.renderOrder = 20;
      live.add(ground); P.ground = ground;
    }

    /* ── the brook's water: a ribbon along its line, at the water's own level ── */
    {
      const pos = [], uv = [], idx = [], N = 220, COLS = 5; let s = 0, px = null, pz = null;
      for (let i = 0; i <= N; i++) {
        const x = lerp(-420, 420, i / N) * BK.flow, z = bkZ(x), dz = bkDZ(x), l = Math.hypot(1, dz), nx = -dz / l * BK.flow, nz = 1 / l * BK.flow, w = bkW(x) + 1.6, y = BK.level(x);
        if (px != null) s += Math.hypot(x - px, z - pz); px = x; pz = z;
        for (let k = 0; k < COLS; k++) { const v = k / (COLS - 1), o = (v - .5) * 2 * w; pos.push(x + nx * o, y, z + nz * o); uv.push(s / 9, v); }
      }
      for (let i = 0; i < N; i++) for (let k = 0; k < COLS - 1; k++) { const a = i * COLS + k, b = a + 1, c = a + COLS, d = c + 1; idx.push(a, c, b, b, c, d); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
      const water = new THREE.Mesh(g, M.water); water.userData.own = 1; water.frustumCulled = false; water.renderOrder = 10;
      live.add(water); P.water = water;
    }

    /* ── WHAT SHADES THE GROUND: a coarse grid the trees, the rocks and the ruin darken (the sky they hide), read back by
       the ground's colour and every blade of grass ── */
    const OG = { x0: -300, z0: -380, cs: 2, nx: 300, nz: 300 };
    OG.a = new Float32Array(OG.nx * OG.nz);
    const occAdd = (x, z, rad, k) => {
      const i0 = Math.max(0, Math.floor((x - rad - OG.x0) / OG.cs)), i1 = Math.min(OG.nx - 1, Math.ceil((x + rad - OG.x0) / OG.cs));
      const j0 = Math.max(0, Math.floor((z - rad - OG.z0) / OG.cs)), j1 = Math.min(OG.nz - 1, Math.ceil((z + rad - OG.z0) / OG.cs));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const d = Math.hypot(OG.x0 + i * OG.cs - x, OG.z0 + j * OG.cs - z) / rad; if (d >= 1) continue;
        const v = k * smooth(1 - d), o = j * OG.nx + i; OG.a[o] = 1 - (1 - OG.a[o]) * (1 - v);
      }
    };
    const occAt = (x, z) => {
      const fx = (x - OG.x0) / OG.cs, fz = (z - OG.z0) / OG.cs, i = Math.floor(fx), j = Math.floor(fz);
      if (i < 0 || j < 0 || i >= OG.nx - 1 || j >= OG.nz - 1) return 0;
      const u = fx - i, v = fz - j, a = OG.a, o = j * OG.nx + i;
      return lerp(lerp(a[o], a[o + 1], u), lerp(a[o + OG.nx], a[o + OG.nx + 1], u), v);
    };
    P.occAt = occAt;

    yield;
    /* ── what stands where (planned before it is placed, so nothing stands in anything) ── */
    const taken = [];
    const free = (x, z, rad) => !taken.some(o => Math.hypot(x - o.x, z - o.z) < rad + o.r);
    const take = (x, z, rad) => taken.push({ x, z, r: rad });
    const inView = (x, z, m) => z > hd - 4 && Math.abs(x) < hw + (m || 26) && z < hd + 140;   /* between the fight and you: keep it clear */
    const okSpot = (x, z, rad) => padOut(x, z) > rad + 2 && !inView(x, z) && pathD(x, z) > rad + 3 && !nearBrook(x, z, rad + 3) && free(x, z, rad);

    /* the ruin, on one side, a little behind the fight's middle */
    {
      const s = P.ruinSide, rx = s * (hw * .55 + r() * 14), rz = -hd - 20 - r() * 12, ang = s * (.15 + r() * .25);
      P.ruinGreen = buildRuin(live, rx, rz, ang, rng(seed + 77), heightAt, occAdd);
      take(rx, rz, 18);
      P.ruin = { x: rx, z: rz };
    }
    /* the rocks: a great outcrop behind the fight across from the ruin, another up on the hills, boulders round the edge of the meadow, stones in the grass */
    const rocks = [];
    const rockAt = (x, z, s, sy) => { rocks.push({ x, y: heightAt(x, z) - s * .18, z, s, sy: sy || 1, rot: r() * 6.28, k: (r() * 5) | 0 }); occAdd(x, z, s * 1.5, .45); };
    {
      const s = -P.ruinSide, cx = s * (hw + 26 + r() * 22), big = 11 + r() * 5;
      let cz = -hd - 38 - r() * 26; while (brookD(cx, cz) < big * 2.3 + bkW(cx) && cz < -hd - 20) cz += 2;
      rockAt(cx, cz, big * .72, 3 + r() * .6);
      rockAt(cx + s * big * .55, cz + big * .25, big * .55, 2.4 + r() * .5);
      rockAt(cx - s * big * .5, cz - big * .2, big * .6, 2.6 + r() * .6);
      for (let i = 0; i < 6; i++) { const a = r() * 6.28, d = big * (.7 + r() * .8); rockAt(cx + Math.cos(a) * d * 1.2, cz + Math.sin(a) * d * .7, big * (.25 + r() * .3), 1.4 + r() * 1.2); }
      for (let i = 0; i < 6; i++) { const a = r() * 6.28, d = big * (1.4 + r()); rockAt(cx + Math.cos(a) * d, cz + Math.sin(a) * d * .8, 1 + r() * 2.2); }
      take(cx, cz, big * 2.2); take(cx - s * big, cz + big * 1.6, big * 1.4);
      P.crag = { x: cx, z: cz };
    }
    for (let o = 0; o < 2 + (r() * 2 | 0); o++) {
      const side = o % 2 ? -P.ruinSide : (r() < .5 ? -1 : 1);
      const cx = side * (hw + 40 + r() * 120), cz = -hd - 50 - r() * 140;
      if (!free(cx, cz, 20)) continue;
      take(cx, cz, 24);
      const big = 9 + r() * 7;
      for (let i = 0; i < 6 + (r() * 5 | 0); i++) {
        const a = r() * 6.28, d = r() * big * 1.1;
        rockAt(cx + Math.cos(a) * d, cz + Math.sin(a) * d * .7, big * (.45 + r() * .65) * (i === 0 ? 1.35 : 1), 1.1 + r() * .6);
      }
    }
    for (let i = 0; i < 26; i++) {
      const a = r() * 6.28, d = 40 + r() * 120, x = Math.cos(a) * d * 1.3, z = Math.sin(a) * d - 10;
      if (!okSpot(x, z, 4)) continue;
      const s = 1.6 + r() * 3.8; rockAt(x, z, s); take(x, z, s * 1.2);
      if (r() < .6) rockAt(x + (r() - .5) * s * 2, z + (r() - .5) * s * 2, s * (.3 + r() * .3));
    }
    for (let i = 0; i < 70; i++) {
      const x = (r() - .5) * 220, z = -130 + r() * (hd + 200);
      if (padOut(x, z) < 1.5 || pathD(x, z) < 2 || nearBrook(x, z, 1)) continue;
      if (inView(x, z, 0) && r() < .7) continue;
      rockAt(x, z, .35 + r() * .7);
    }
    /* stones along the brook, some half in the water */
    for (let i = 0; i < 70; i++) {
      const x = (r() - .5) * 320, side = r() < .5 ? -1 : 1, w = bkW(x), z = bkZ(x) + side * (w * (.7 + r() * .7));
      if (pathD(x, z) < 6) continue;
      const s = .4 + r() * (r() < .15 ? 2.2 : .9);
      rocks.push({ x, y: Math.min(heightAt(x, z), BK.level(x)) - s * .3, z, s, sy: .55 + r() * .3, rot: r() * 6.28, k: (r() * 5) | 0 });
    }
    /* pebbles along the path's edges, thicker where it bends */
    for (let i = 0; i < path.length - 1; i++) {
      const [ax, az] = path[i], [bx, bz] = path[i + 1];
      if (Math.hypot(ax, az) > 260) continue;
      const len = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / (len || 1), nz = (bx - ax) / (len || 1);
      const pw = 2.4 + 2 * clamp(-az / 600, 0, 1) * 6;
      for (let k = 0; k < 3; k++) {
        const u = r(), side = r() < .5 ? -1 : 1, off = pw + .4 + r() * 1.6;
        const x = ax + (bx - ax) * u + nx * side * off, z = az + (bz - az) * u + nz * side * off;
        if (padOut(x, z) < 2) continue;
        rockAt(x, z, .25 + r() * .5, .7);
      }
    }
    {
      const groups = [[], [], [], [], []];
      rocks.forEach(o => groups[o.k].push(o));
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      groups.forEach((list, k) => {
        if (!list.length) return;
        const im = new THREE.InstancedMesh(G.rocks[k], M.rock, list.length);
        list.forEach((o, i) => { e.set(0, o.rot, 0); q.setFromEuler(e); m4.compose(V3(o.x, o.y, o.z), q, V3(o.s, o.s * o.sy, o.s)); im.setMatrixAt(i, m4); });
        im.castShadow = true; im.receiveShadow = true;
        live.add(im);
      });
    }
    yield;
    /* ── what people left here ── */
    {
      const parts = [], caps = [];
      const box = (w, h, d, x, y, z, ry, rz, rx, shade, root) => {
        const g = roundBox(w, h, d, Math.min(w, h, d) * .2, r);
        const s = shade || 1; paint(g, (t, X, Y, Z, ny) => t.setRGB(s * (ny < -.5 ? .55 : 1), s * (ny < -.5 ? .55 : 1), s * (ny < -.5 ? .55 : 1)));
        if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz); g.rotateY(ry || 0); g.translate(x, y, z);
        parts.push({ g, root });
      };
      /* a point on the path, a little way out behind the fight, and which way the path runs there */
      const onPath = zWant => {
        let best = 0; path.forEach((p, i) => { if (Math.abs(p[1] - zWant) < Math.abs(path[best][1] - zWant)) best = i; });
        const a = path[Math.max(0, best - 1)], b = path[Math.min(path.length - 1, best + 1)];
        return { x: path[best][0], z: path[best][1], ang: Math.atan2(b[0] - a[0], b[1] - a[1]) };
      };
      /* the fence: posts and two rails, along one side of the path, a rail down here and there */
      {
        const p0 = onPath(-hd - 54 - r() * 6), side = r() < .5 ? -1 : 1, n = 5 + (r() * 3 | 0), step = 4.2;
        const nx = Math.cos(p0.ang), nz = -Math.sin(p0.ang), dx = Math.sin(p0.ang), dz = Math.cos(p0.ang);
        const root = V3(p0.x, heightAt(p0.x, p0.z), p0.z);
        let prev = null;
        for (let i = 0; i < n; i++) {
          const along = (i - n / 2) * step, off = side * (2.4 + 2 * clamp(-p0.z / 600, 0, 1) * 6 + 2.2);
          const x = p0.x + dx * along + nx * off, z = p0.z + dz * along + nz * off, y = heightAt(x, z);
          if (padOut(x, z) < 4 || nearBrook(x, z, 3)) { prev = null; continue; }
          const lean = (r() - .5) * .12, ht = 2.6 + r() * .4;
          box(.42, ht, .42, x, y + ht / 2 - .3, z, r(), lean, (r() - .5) * .08, .85 + r() * .2, root);
          caps.push([x, z]);
          if (prev && r() < .85) {
            const mx = (x + prev.x) / 2, mz = (z + prev.z) / 2, my = (y + prev.y) / 2, len = Math.hypot(x - prev.x, z - prev.z) + .5, a = Math.atan2(x - prev.x, z - prev.z);
            box(.26, .3, len, mx, my + 1.9, mz, a, 0, (r() - .5) * .05, .9 + r() * .2, root);
            if (r() < .75) box(.26, .3, len, mx, my + 1.0, mz, a, 0, (r() - .5) * .05, .9 + r() * .2, root);
            else box(.26, .3, len, mx + nx * side * .9, heightAt(mx, mz) + .2, mz + nz * side * .9, a + (r() - .5) * .5, 0, 0, .8, root);   /* fallen */
          }
          prev = { x, y, z };
        }
        caps.forEach(c => occAdd(c[0], c[1], 1.6, .3));
        P.fence = { x: p0.x, z: p0.z };
      }
      /* the signpost: where the path leaves the meadow, two boards pointing two ways */
      {
        const p0 = onPath(-hd - 30 - r() * 10), side = r() < .5 ? -1 : 1;
        const off = side * (2.4 + 2 * clamp(-p0.z / 600, 0, 1) * 6 + 1.6);
        const x = p0.x + Math.cos(p0.ang) * off, z = p0.z - Math.sin(p0.ang) * off, y = heightAt(x, z);
        const root = V3(x, y, z);
        box(.4, 5.4, .4, x, y + 2.4, z, r(), (r() - .5) * .06, 0, .95, root);
        const b1 = p0.ang + Math.PI / 2 + (r() - .5) * .4, b2 = b1 + Math.PI * (.7 + r() * .3);
        [[b1, 4.3], [b2, 3.5]].forEach(([a, hy]) => {
          const len = 2.6, cx = x + Math.sin(a) * len * .45, cz = z + Math.cos(a) * len * .45;
          box(.14, .62, len, cx, y + hy, cz, a, 0, (r() - .5) * .1, 1.05, root);
        });
        occAdd(x, z, 1.5, .3);
        P.sign = { x, z };
      }
      /* the fallen log, at the foot of a tree off one side of the fight; mushrooms in its shade */
      {
        const s = r() < .5 ? -1 : 1, x = s * (hw + 14 + r() * 8), z = -hd * .2 + (r() - .5) * hd * .6, len = 9 + r() * 4, a = (r() - .5) * 1.2 + Math.PI / 2;
        const y = heightAt(x, z), root = V3(x, y, z), R = .95 + r() * .25;
        const pts = [], rads = [];
        for (let i = 0; i <= 8; i++) { const u = i / 8 - .5; pts.push(V3(x + Math.sin(a) * u * len, y + R * .78 + Math.sin(u * 3) * .12, z + Math.cos(a) * u * len)); rads.push(R * (1 - .1 * Math.abs(u) + .06 * Math.sin(i * 2.1))); }
        const lg = tube(pts, rads, 12);
        paint(lg, (t, X, Y, Z, ny) => { const v = ny > .55 ? 1.25 : ny < -.3 ? .6 : 1.05; t.setRGB(v, v, v); });
        parts.push({ g: lg, root });
        /* the cut ends: pale rings */
        [0, pts.length - 1].forEach(k => {
          const c = new THREE.CircleGeometry(rads[k], 14), p = pts[k], q = pts[k === 0 ? 1 : k - 1];
          c.lookAt(V3(p.x - q.x, p.y - q.y, p.z - q.z)); c.translate(p.x, p.y, p.z);
          const cu = c.attributes.uv; for (let i = 0; i < cu.count; i++) cu.setXY(i, .5, .5);
          paint(c, (t, X, Y, Z) => { const d = Math.hypot(X - p.x, Y - p.y, Z - p.z) / rads[k]; const v = d > .86 ? .7 : 1.45 - .12 * Math.sin(d * 22); t.setRGB(v, v * .9, v * .7); });
          parts.push({ g: c, root });
        });
        occAdd(x, z, len * .6, .35);
        P.log = { x, z, a, len, R };
        /* moss along its top, a few ferns of grass at its foot: bushes do it */
        P.logGreen = [];
        for (let i = 0; i < 4; i++) { const u = (r() - .5) * len * .8; P.logGreen.push({ x: x + Math.sin(a) * u, z: z + Math.cos(a) * u, y: y + R * 1.55, s: .14 + r() * .08 }); }
        /* mushrooms */
        P.shrooms = [];
        for (let i = 0; i < 9; i++) { const u = (r() - .5) * len, side2 = r() < .5 ? -1 : 1; P.shrooms.push({ x: x + Math.sin(a) * u + Math.cos(a) * side2 * (R + .4 + r() * .6), z: z + Math.cos(a) * u - Math.sin(a) * side2 * (R + .4 + r() * .6), s: .3 + r() * .35 }); }
      }
      /* the bridge: a deck of planks arched over the water on two beams, a rail each side */
      {
        let best = 1e9, bx = 0, bz = 0, ang = 0;
        for (let i = 0; i < path.length - 1; i++) for (let k = 0; k <= 12; k++) {
          const t = k / 12, x = lerp(path[i][0], path[i + 1][0], t), z = lerp(path[i][1], path[i + 1][1], t), d = brookD(x, z);
          if (d < best) { best = d; bx = x; bz = z; ang = Math.atan2(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]); }
        }
        if (best < 3) {
          const root = V3(bx, BK.level(bx), bz), w = bkW(bx), L = 2 * (w + 3.2), W2 = 5.8;
          const dx = Math.sin(ang), dz = Math.cos(ang), cx2 = Math.cos(ang), cz2 = -Math.sin(ang);
          const yA = heightAt(bx - dx * L / 2, bz - dz * L / 2) + .15, yB = heightAt(bx + dx * L / 2, bz + dz * L / 2) + .15;
          const top = Math.max(yA, yB, BK.level(bx) + 1.6) + .9;
          const yAt = t => lerp(yA, yB, t) + (top - lerp(yA, yB, .5)) * Math.sin(Math.PI * t);
          const np = Math.round(L / .62);
          for (let i = 0; i < np; i++) {
            const t = (i + .5) / np, x = bx + dx * (t - .5) * L, z = bz + dz * (t - .5) * L, slope = Math.atan2(yAt(Math.min(1, t + .02)) - yAt(Math.max(0, t - .02)), L * .04);
            box(W2 + (r() - .5) * .3, .22, .56, x + cx2 * (r() - .5) * .2, yAt(t), z + cz2 * (r() - .5) * .2, ang + (r() - .5) * .04, 0, 0, .85 + r() * .3, root);
            void slope;
          }
          /* the beams under the deck, in short lengths that follow its arch */
          [-1, 1].forEach(sd => {
            for (let i = 0; i < 8; i++) {
              const t0 = i / 8, t1 = (i + 1) / 8, tm = (t0 + t1) / 2, x = bx + dx * (tm - .5) * L + cx2 * sd * W2 * .36, z = bz + dz * (tm - .5) * L + cz2 * sd * W2 * .36;
              const rise = yAt(t1) - yAt(t0), seg = L / 8;
              box(.4, .5, Math.hypot(seg, rise) + .1, x, yAt(tm) - .35, z, ang, 0, -Math.atan2(rise, seg), .7, root);
            }
            /* posts and a rail */
            const posts = [0, .25, .5, .75, 1];
            posts.forEach(t => { const x = bx + dx * (t - .5) * L * .96 + cx2 * sd * W2 * .48, z = bz + dz * (t - .5) * L * .96 + cz2 * sd * W2 * .48; box(.3, 2.2, .3, x, yAt(t) + 1.0, z, ang + (r() - .5) * .1, 0, 0, .9, root); });
            for (let i = 0; i < 4; i++) {
              const t0 = posts[i], t1 = posts[i + 1], tm = (t0 + t1) / 2, x = bx + dx * (tm - .5) * L * .96 + cx2 * sd * W2 * .48, z = bz + dz * (tm - .5) * L * .96 + cz2 * sd * W2 * .48;
              const rise = yAt(t1) - yAt(t0), seg = L * .96 / 4;
              box(.22, .26, Math.hypot(seg, rise) + .2, x, yAt(tm) + 2.0, z, ang, 0, -Math.atan2(rise, seg), 1.05, root);
            }
          });
          P.bridge = { x: bx, z: bz };
        }
      }
      if (parts.length) {
        const g = merge(parts, true);
        const m = new THREE.Mesh(g, M.timber); m.castShadow = true; m.receiveShadow = true; m.userData.own = 1; live.add(m);
      }
      /* the mushrooms: a cap on a stem, red with white spots or brown */
      if (P.shrooms && P.shrooms.length) {
        const im = new THREE.InstancedMesh(G.shroom, M.shroom, P.shrooms.length);
        const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
        P.shrooms.forEach((o, i) => { e.set((r() - .5) * .3, r() * 6.28, (r() - .5) * .3); q.setFromEuler(e); m4.compose(V3(o.x, heightAt(o.x, o.z) - .05, o.z), q, V3(o.s, o.s, o.s)); im.setMatrixAt(i, m4); im.setColorAt(i, r() < .6 ? C('#c8402c') : C('#a87a4c')); });
        im.castShadow = true; im.receiveShadow = true; live.add(im);
      }
    }
    yield;
    /* the trees */
    const trees = { oak: [], round: [], birch: [], bush: [], lite: [] };
    const leafCol = deep => {
      if (P.autumn && r() < P.autumn) return C(['#d47530', '#e0a23e', '#c2522c', '#d9b84c'][(r() * 4) | 0]).multiplyScalar(deep ? .8 : 1);
      return C(deep ? ['#3f7230', '#4a7d33', '#36662b', '#557f36'][(r() * 4) | 0] : ['#56902e', '#64a033', '#4a8230', '#73a83a', '#45793a'][(r() * 5) | 0]);
    };
    const CR = { oak: 13, round: 9, birch: 6, bush: 3.6, lite: 9 };
    const plant = (kind, x, z, s, colr) => { trees[kind].push({ x, y: heightAt(x, z) - .3, z, s, rot: r() * 6.28, v: (r() * 2) | 0, c: colr || leafCol() }); occAdd(x, z, CR[kind] * s, kind === 'bush' ? .4 : .36); };
    /* framing the fight: a few big ones at its sides and behind */
    const near = [[-1, -.4], [1, -.5], [-1, .5], [1, .4], [-.4, -1], [.5, -1], [-1.05, -1], [1.05, -1]];
    near.forEach(([sx, sz], i) => {
      if (r() < .25) return;
      for (let tries = 0; tries < 8; tries++) {
        const x = sx * (hw + 26 + r() * 30) + (r() - .5) * 10, z = sz * (hd + 18 + r() * 36) + (r() - .5) * 14;
        if (!okSpot(x, z, 7)) continue;
        /* not where its shadow would lie across the fight: the fight is in the sun */
        const ch = 20, shx = x - sd.x / sd.y * ch, shz = z - sd.z / sd.y * ch;
        if (padOut(shx, shz) < 12 || padOut((x + shx) / 2, (z + shz) / 2) < 8) continue;
        const kind = r() < .55 ? 'oak' : r() < .5 ? 'round' : 'birch';
        plant(kind, x, z, .9 + r() * .35); take(x, z, kind === 'oak' ? 9 : 6);
        break;
      }
    });
    /* the woods on the hills, in clumps */
    for (let cl = 0; cl < 16; cl++) {
      const a = Math.PI * (1.05 + r() * .9), d = 110 + r() * 260;
      const cx = Math.cos(a) * d * 1.25, cz = Math.sin(a) * d * .9 - hd;
      if (Math.abs(cx - P.valleyX * clamp(-cz / 400, 0, 1)) < 60 && cz < -150) continue;
      const n = 3 + (r() * 6 | 0);
      for (let i = 0; i < n; i++) {
        const x = cx + (r() - .5) * 40, z = cz + (r() - .5) * 30;
        if (!okSpot(x, z, 5)) continue;
        plant(r() < .5 ? 'oak' : r() < .6 ? 'round' : 'birch', x, z, .8 + r() * .5); take(x, z, 5);
      }
    }
    /* bushes along the edges and under the trees */
    for (let i = 0; i < 44; i++) {
      const a = r() * 6.28, d = 36 + r() * 110, x = Math.cos(a) * d * 1.35, z = Math.sin(a) * d * .9 - 8;
      if (!okSpot(x, z, 2.5)) continue;
      plant('bush', x, z, .7 + r() * .7, C(['#4f8c2c', '#5a9832', '#477f2a', '#6aa23a'][(r() * 4) | 0]));
    }
    /* moss and small bushes on the ruin and round its feet */
    (P.logGreen || []).forEach(o => { trees.bush.push({ x: o.x, y: o.y - .5, z: o.z, s: o.s, rot: r() * 6.28, v: (r() * 2) | 0, c: C(['#5a8a32', '#4c7d2c'][(r() * 2) | 0]) }); });
    (P.ruinGreen || []).forEach(o => { trees.bush.push({ x: o.x, y: o.y - .25, z: o.z, s: o.s * (.8 + r() * .4), rot: r() * 6.28, v: (r() * 2) | 0, c: C(['#56872e', '#4c7d2c', '#62913a'][(r() * 3) | 0]) }); });
    /* the bottom corners of the picture, in front of the fight: wild flowers, taller grass */
    P.frame = [];
    [-1, 1].forEach(s => { for (let k = 0; k < 3; k++) P.frame.push({ x: s * (hw * (.55 + r() * .55)), z: hd + 10 + r() * 22, n: 22 + (r() * 14 | 0) }); });
    /* framing in front of you: a bush or two at the very corners, low */
    [-1, 1].forEach(s => { if (r() < .7) { const x = s * (hw + 30 + r() * 20), z = hd + 22 + r() * 25; plant('bush', x, z, 1 + r() * .5); } });
    /* the far woods: woods, the crowns packed so they touch, on the hills all round the back */
    {
      const list = [];
      for (let cl = 0; cl < 46; cl++) {
        const a = Math.PI * (.92 + r() * 1.16), d = 260 + r() * 900;
        const cx = Math.cos(a) * d * 1.15, cz = Math.sin(a) * d - hd;
        if (cz > -150 && Math.abs(cx) < 260) continue;
        const rx = 40 + r() * 110 + d * .08, rz = 25 + r() * 60 + d * .04, ang = r() * 3.14, s0 = 1.7 + d / 700;
        const sp = (d < 430 ? 7.4 : 5.8) * s0, ca = Math.cos(ang), sa = Math.sin(ang);
        for (let gx = -rx; gx <= rx; gx += sp) for (let gz = -rz; gz <= rz; gz += sp * .85) {
          const e2 = (gx * gx) / (rx * rx) + (gz * gz) / (rz * rz) + noise2(gx * .03, gz * .03, seed + cl) * .35;
          if (e2 > 1) continue;
          const x = cx + gx * ca - gz * sa + (r() - .5) * sp * 1.15, z = cz + gx * sa + gz * ca + (r() - .5) * sp * 1.15;
          if (padOut(x, z) < 60 || pathD(x, z) < 8 || nearBrook(x, z, 8)) continue;
          if (d < 430) { const s = s0 * .95 * (.8 + r() * .45) * (1.1 - e2 * .3); trees.lite.push({ x, y: heightAt(x, z) - .8, z, s, rot: r() * 6.28, v: (r() * 2) | 0, c: leafCol(true) }); occAdd(x, z, 10 * s, .32); continue; }
          list.push({ x, z, s: s0 * (.75 + r() * .55) * (1.1 - e2 * .35) });
        }
      }
      const im = new THREE.InstancedMesh(G.far, M.far, Math.max(1, list.length));
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
      const greens = ['#3e6e2a', '#356326', '#4a7a30', '#2f5a24', '#557f34'].map(C), autumns = ['#b8682a', '#c8913a', '#a44c26', '#c9a640'].map(C);
      list.forEach((o, i) => {
        e.set(0, r() * 6.28, 0); q.setFromEuler(e);
        m4.compose(V3(o.x, heightAt(o.x, o.z) - .8, o.z), q, V3(o.s, o.s * (.85 + r() * .45), o.s)); im.setMatrixAt(i, m4);
        c.copy(greens[(r() * greens.length) | 0]);
        if (P.autumn && r() < P.autumn * .8) c.copy(autumns[(r() * autumns.length) | 0]);
        im.setColorAt(i, c.multiplyScalar(.9 + r() * .2));
      });
      im.count = list.length; im.receiveShadow = false; live.add(im);
      P.farN = list.length;
    }
    {
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), TC = new THREE.Color();
      Object.keys(trees).forEach(kind => {
        [0, 1].forEach(v => {
          const list = trees[kind].filter(t => t.v === v); if (!list.length) return;
          const T = G.tree[kind][v];
          const lm = new THREE.InstancedMesh(T.leaves, v ? M.leavesB : M.leavesA, list.length);
          lm.customDepthMaterial = v ? DEPTH.B : DEPTH.A;
          const tm = T.trunk ? new THREE.InstancedMesh(T.trunk, kind === 'birch' ? M.birch : M.oak, list.length) : null;
          const cm = new THREE.InstancedMesh(T.core, M.crown, list.length);
          list.forEach((o, i) => {
            e.set(0, o.rot, 0); q.setFromEuler(e); m4.compose(V3(o.x, o.y, o.z), q, V3(o.s, o.s, o.s));
            lm.setMatrixAt(i, m4); lm.setColorAt(i, o.c);
            cm.setMatrixAt(i, m4); cm.setColorAt(i, TC.copy(o.c).multiplyScalar(kind === 'lite' ? .92 : .66));
            if (tm) { tm.setMatrixAt(i, m4); tm.setColorAt(i, TC.setRGB(1, 1, 1).multiplyScalar(kind === 'lite' ? .42 : 1)); }
          });
          const near2 = kind !== 'lite' && list.some(o => Math.hypot(o.x, o.z) < 140);
          lm.castShadow = false; lm.receiveShadow = true; live.add(lm);    /* the crown's heart throws its shadow: a card facing the eye cannot */
          cm.castShadow = near2; cm.receiveShadow = true; live.add(cm);
          if (tm) { tm.castShadow = near2; tm.receiveShadow = true; live.add(tm); }
        });
      });
    }
    yield;
    /* the grass: short and fine where the fight stands (and pressed down round each figure), long and full round it,
       none on the path, every clump the colour of the ground it grows from */
    {
      const pad = [], out = [], far = [];
      const add = (list, x, z, h, w) => { list.push({ x, z, h, w, y: heightAt(x, z) - .04, rot: r() * 6.28 }); };
      for (let z = -hd - 9; z < hd + 9; z += .86) for (let x = -hw - 9; x < hw + 9; x += .86) {
        const jx = x + (r() - .5) * .86, jz = z + (r() - .5) * .86;
        if (pathD(jx, jz) < 2) continue;
        add(pad, jx, jz, .3 + r() * .14 + .2 * (fbm2(jx * .09, jz * .09, seed + 4, 2) * .5 + .5), .85 + r() * .3);
      }
      for (let z = -150; z < hd + 75; z += 1.5) for (let x = -130; x < 130; x += 1.5) {
        const jx = x + (r() - .5) * 1.5, jz = z + (r() - .5) * 1.5;
        const po = padOut(jx, jz); if (po < 1.6) continue;
        if (grassy(jx, jz) < .5 + r() * .4) continue;
        const pd = pathD(jx, jz), bd = brookD(jx, jz) - bkW(jx);
        const tall = clamp(po / 14, 0, 1) * (.7 + .6 * (fbm2(jx * .05, jz * .05, seed + 8, 2) * .5 + .5));
        let tall2 = tall * (jz > hd ? .3 + .7 * smooth(clamp((Math.abs(jx) - hw - 10) / 30, 0, 1)) : 1);   /* low between you and the fight */
        (P.frame || []).forEach(o => { const d = Math.hypot(jx - o.x, (jz - o.z) * 1.3); if (d < 9) tall2 = Math.max(tall2, .9 * smooth(1 - d / 9)); });
        if (bd < 4.5) tall2 = Math.max(tall2, 1.5 * smooth(clamp((4.5 - bd) / 2.5, 0, 1)));      /* reeds along the brook */
        add(Math.hypot(jx, jz - 10) > 55 ? far : out, jx, jz, (.45 + r() * .25) * (1 + tall2 * 1.5) * (pd < 4.5 ? .55 + .1 * pd : 1), 1.3 + r() * .4);
      }
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
      const mesh = (list, mat, geo) => {
        const im = new THREE.InstancedMesh(geo || G.clump, mat, Math.max(1, list.length));
        list.forEach((o, i) => {
          e.set(0, o.rot, 0); q.setFromEuler(e); m4.compose(V3(o.x, o.y, o.z), q, V3(o.w * 1.25, o.h * 1.5, o.w * 1.25)); im.setMatrixAt(i, m4);
          im.setColorAt(i, fieldCol(o.x, o.z, c));
        });
        im.count = list.length; im.receiveShadow = true; im.frustumCulled = false; live.add(im);
        return im;
      };
      mesh(pad, M.grassT); mesh(out, M.grass); mesh(far, M.grass, G.clumpLo);
      P.grassN = pad.length + out.length + far.length;
    }
    yield;
    /* the flowers: in drifts, a few out on the fight's own ground */
    {
      const list = [], cols = [['#ffffff', '#f4f0e6'], ['#f6d63e', '#f2c22c'], ['#f08cb4', '#e66a9c'], ['#8f8ef0', '#6e78e2'], ['#ff8a5c', '#f06a48']];
      (P.frame || []).forEach(o => {
        const col = cols[(r() * cols.length) | 0];
        for (let i = 0; i < o.n; i++) { const x = o.x + (r() - .5) * 9, z = o.z + (r() - .5) * 7; if (pathD(x, z) < 2.5 || nearBrook(x, z, 1.2)) continue; list.push({ x, z, s: .75 + r() * .45, c: C(col[(r() * 2) | 0]) }); }
      });
      for (let d = 0; d < 12; d++) {
        const cx = (r() - .5) * (W + 50), cz = hd + 8 + r() * 40, col = cols[(r() * cols.length) | 0], n = 26 + (r() * 30 | 0), sp = 4 + r() * 6;
        for (let i = 0; i < n; i++) { const x = cx + (r() - .5) * sp * 2, z = cz + (r() - .5) * sp * 1.4; if (pathD(x, z) < 2.5 || nearBrook(x, z, 1.2)) continue; list.push({ x, z, s: .7 + r() * .4, c: C(col[(r() * 2) | 0]) }); }
      }
      for (let d = 0; d < 70; d++) {
        const near3 = d < 40, cx = (r() - .5) * (near3 ? 130 : 220), cz = near3 ? -hd - 30 + r() * (D + 70) : -120 + r() * (hd + 170);
        const col = cols[(r() * cols.length) | 0], n = 18 + (r() * 40 | 0), sp = 3 + r() * 7;
        for (let i = 0; i < n; i++) {
          const x = cx + (r() - .5) * sp * 2, z = cz + (r() - .5) * sp * 2, po = padOut(x, z);
          if (pathD(x, z) < 2.5 || nearBrook(x, z, 1.2)) continue;
          if (po < 1 && r() < .82) continue;
          list.push({ x, z, s: (po < 1 ? .45 : .65) + r() * .35, c: C(col[(r() * 2) | 0]) });
        }
      }
      const im = new THREE.InstancedMesh(G.flower, M.flower, Math.max(1, list.length));
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      list.forEach((o, i) => { e.set((r() - .5) * .3, r() * 6.28, (r() - .5) * .3); q.setFromEuler(e); m4.compose(V3(o.x, heightAt(o.x, o.z) - .05, o.z), q, V3(o.s, o.s * (1.1 + r() * .9), o.s)); im.setMatrixAt(i, m4); im.setColorAt(i, o.c); });
      im.count = list.length; im.receiveShadow = true; im.frustumCulled = false; live.add(im);
    }
    yield;
    /* the mountains, far behind, two ranges */
    live.add(range(r, 1250, 2150, 620, M.mtnNear, -2.75, -.4, seed + 400));
    live.add(range(r, 2600, 4000, 900, M.mtnFar, -2.95, -.2, seed + 500));
    /* the motes: seeds and pollen hanging in the light */
    {
      const n = 380, pos = new Float32Array(n * 3), ph = new Float32Array(n);
      for (let i = 0; i < n; i++) { pos[i * 3] = (r() - .5) * 150; pos[i * 3 + 1] = .5 + r() * 14; pos[i * 3 + 2] = -80 + r() * (hd + 75); ph[i] = r() * 100; }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pts = new THREE.Points(g, M.mote); pts.userData.own = 1; pts.userData.ph = ph; pts.userData.base = pos.slice(); pts.frustumCulled = false;
      live.add(pts); P.motes = pts;
    }
    P.liteN = trees.lite.length;
    P.nearTrees = ['oak', 'round', 'birch'].reduce((a, k) => a.concat(trees[k]), []).filter(o => Math.hypot(o.x, o.z) < 110).sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
    life(P, rng(seed + 3030));
    /* the ground under what was placed on it, in its shade */
    {
      const g = P.ground.geometry, pos = g.attributes.position, col = g.attributes.color, dk = C('#2c5226');
      for (let i = 0; i < pos.count; i++) {
        const o = occAt(pos.getX(i), pos.getZ(i)); if (o <= 0) continue;
        const m = 1 - .5 * o;
        col.setXYZ(i, lerp(col.getX(i) * m, dk.r, o * .25), lerp(col.getY(i) * m, dk.g, o * .25), lerp(col.getZ(i) * m, dk.b, o * .25));
      }
      col.needsUpdate = true;
    }
    /* an instanced mesh is culled by its first copy's bounds (r128): spread over the world, they must never be */
    live.traverse(o => { if (o.isInstancedMesh) { o.frustumCulled = false; o.instanceMatrix.needsUpdate = true; if (o.instanceColor) o.instanceColor.needsUpdate = true; } });
    return P;
  }

  /* a mountain range: a band of land far behind, thrown up into ridges (ridged noise: sharp crests, soft valleys) */
  function range(r, R0, R1, hMax, mat, a0, a1, sd) {
    const NA = 260, NR = 40, pos = [], idx = [];
    for (let j = 0; j <= NR; j++) {
      const v = j / NR, rho = lerp(R0, R1, v);
      for (let i = 0; i <= NA; i++) {
        const a = lerp(a0, a1, i / NA), x = Math.cos(a) * rho, z = Math.sin(a) * rho;
        let h = 0, amp = 1, fq = 1 / 700, w = 1;
        for (let o = 0; o < 6; o++) { let n = 1 - Math.abs(noise2(x * fq, z * fq, sd + o * 13)); n *= n; h += n * amp * w; w = clamp(n * 1.7, 0, 1); amp *= .5; fq *= 2.07; }
        const env = Math.pow(Math.sin(Math.PI * clamp((v - .03) / .94, 0, 1)), .65);
        const big = .5 + .5 * (fbm2(x / 2400, z / 2400, sd + 99, 2) * .5 + .5);
        pos.push(x, hMax * h * .6 * env * big - 70, z);
      }
    }
    for (let j = 0; j < NR; j++) for (let i = 0; i < NA; i++) { const q = j * (NA + 1) + i, w = q + NA + 1; idx.push(q, q + 1, w, q + 1, w + 1, w); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.userData.own = 1; m.frustumCulled = false; m.renderOrder = 30;
    return m;
  }

  /* A RUIN: what is left of a gatehouse wall. Big dressed blocks, each its own size and shade, worn round at the
     edges, set a little out of true; the wall broken off along a ragged line that falls away from the gate; the gate's
     arch with a stone or two gone from it; a column standing to half its height, another fallen in drums; the blocks
     that came down lying half-sunk in the grass. Returns where green things grow on it and round it. */
  function buildRuin(into, x0, z0, ang, r, heightAt, occAdd) {
    const parts = [], green = [], ca = Math.cos(ang), sa = Math.sin(ang);
    const at = (lx, lz) => [x0 + lx * ca - lz * sa, z0 + lx * sa + lz * ca];
    const root = V3(x0, heightAt(x0, z0), z0);
    const shades = ['#b4ab9c', '#a59e90', '#bab3a4', '#9d968a', '#b0a493', '#aaa294', '#c0b8a8'];
    const stoneCol = () => C(shades[(r() * shades.length) | 0]).multiplyScalar(.86 + r() * .18);
    /* the footing: the lowest ground along the wall, so no block is buried and none floats */
    let foot = 1e9; for (let lx = -16; lx <= 16; lx += 2) { const [wx, wz] = at(lx, 0); foot = Math.min(foot, heightAt(wx, wz)); }
    const block = (lx, ly, lz, w, h, d, rot, tilt, roll, onGround) => {
      const g = roundBox(w, h, d, Math.min(w, h, d) * (.13 + r() * .08), r);
      const c = stoneCol();
      paint(g, (t, x, y, z, ny) => { t.copy(c).multiplyScalar((ny < -.5 ? .5 : .9 + .1 * ny) * (.92 + .14 * noise3(x * 2.1, y * 2.1, z * 2.1, 77))); });
      const [wx, wz] = at(lx, lz), wy = (onGround ? heightAt(wx, wz) : foot) + ly;
      if (roll) g.rotateX(roll);
      g.rotateZ(tilt || 0); g.rotateY(ang + (rot || 0)); g.translate(wx, wy, wz);
      parts.push({ g, root });
    };
    /* the wall: rows of blocks, the gate in the middle of it */
    const len = 24 + r() * 8, rows = 5 + (r() * 2 | 0), span = 5.2 + r() * 1.2, pier = 2.4;
    const rowH = []; for (let i = 0; i < rows; i++) rowH.push(1.55 + r() * .55);
    const rowY = []; { let y = 0; rowH.forEach(h => { rowY.push(y); y += h; }); }
    const wallTop = rowY[rows - 1] + rowH[rows - 1];
    const gateL = -span / 2 - pier, gateR = span / 2 + pier, fall = .6 + .35 * r(), nseed = (r() * 1e5) | 0;
    /* how high the wall still stands at a point along it: highest at the gate, falling away, broken in steps */
    const keepTo = lx => {
      if (lx > gateL - .2 && lx < gateR + .2) return wallTop;
      const away = (lx < 0 ? gateL - lx : lx - gateR) / (len / 2 - span / 2);
      return wallTop * clamp(1.05 - away * fall + .35 * noise2(lx * .35, 3, nseed) - (hash2(Math.round(lx * .5), 3, nseed) < .14 ? .35 : 0), 0, 1);
    };
    for (let row = 0; row < rows; row++) {
      let lx = -len / 2 + (row % 2 ? 1.1 : 0) + r() * .6;
      while (lx < len / 2) {
        const w = 2.2 + r() * 1.6, cx = lx + w / 2;
        lx += w + .1;
        if (cx > gateL + pier * .5 && cx < gateR - pier * .5) continue;       /* the gateway */
        if (rowY[row] + rowH[row] * .5 > keepTo(cx)) continue;               /* broken off above here */
        if (row >= rows - 2 && row > 0 && r() < .06) continue;               /* a stone gone, near the top */
        const wx = Math.min(w, len / 2 - lx + w + .1) - .12;
        if (wx < .8) continue;
        block(cx + (r() - .5) * .08, rowY[row] + rowH[row] / 2 - .1, (r() - .5) * .16, wx, rowH[row] - .12, 2.3 + r() * .25, (r() - .5) * .025, (r() - .5) * .02);
        if (rowY[row] + rowH[row] * 1.5 > keepTo(cx) && r() < .55) green.push({ l: [cx + (r() - .5) * w * .5, 0], y: rowY[row] + rowH[row] - .2, s: .32 + r() * .2 });
      }
    }
    /* the piers either side of the gate, a little proud of the wall, and the arch between them */
    [-1, 1].forEach(sd => {
      const px = sd * (span / 2 + pier / 2);
      rowH.forEach((h, row) => block(px, rowY[row] + h / 2 - .1, 0, pier - .1, h - .1, 2.8, (r() - .5) * .02, 0));
      block(px, wallTop + .25, 0, pier + .4, .6, 3.1, 0, 0);                     /* the impost */
    });
    const nv = 9, rise = span / 2 + .2, missing = 1 + (r() * (nv - 2) | 0);
    for (let i = 0; i < nv; i++) {
      if (i === missing || (i === missing + 1 && r() < .5)) continue;
      const a = Math.PI * (1 - (i + .5) / nv), px = Math.cos(a) * (span / 2 + .55), py = wallTop + .55 + Math.sin(a) * rise;
      block(px, py, 0, 1.15, Math.PI * (span / 2 + .55) / nv * 1.05, 2.5, 0, a - Math.PI / 2);
    }
    if (r() < .7) { green.push({ l: [-span / 2 - pier / 2, 0], y: wallTop + .5, s: .5 }); }
    green.push({ l: [span / 2 + pier / 2, 0], y: wallTop + .5, s: .38 + r() * .2 });
    /* a column: its base, its drums, broken off */
    const column = (lx, lz, n, fallen, rot) => {
      const R = 1.05;
      if (!fallen) {
        const b = new THREE.CylinderGeometry(R * 1.35, R * 1.45, .7, 18); const c = stoneCol();
        paint(b, (t, x, y, z, ny) => t.copy(c).multiplyScalar(ny < -.5 ? .5 : 1));
        b.translate(0, .35, 0); const [wx, wz] = at(lx, lz); b.translate(wx, Math.min(foot, heightAt(wx, wz)) - .15, wz); parts.push({ g: b, root });
      }
      for (let i = 0; i < n; i++) {
        const g = new THREE.CylinderGeometry(R * (1 - i * .02), R * (1.02 - i * .02), 2.1, 18, 1); const c = stoneCol();
        const top = i === n - 1 && !fallen;
        if (top) { const p = g.attributes.position; for (let k = 0; k < p.count; k++) if (p.getY(k) > 0) p.setY(k, p.getY(k) - .7 * (noise2(p.getX(k) * 2, p.getZ(k) * 2, 5) * .5 + .5)); g.computeVertexNormals(); }
        paint(g, (t, x, y, z, ny) => t.copy(c).multiplyScalar(ny < -.5 ? .5 : 1));
        if (fallen) { g.rotateZ(Math.PI / 2); g.rotateY((r() - .5) * .5); g.translate(i * 2.25 + (r() - .5) * .5, R * .82, (r() - .5) * .9); g.rotateY(rot); }
        else g.translate((r() - .5) * .05, .7 + 1.05 + i * 2.12, (r() - .5) * .05);
        const [wx, wz] = at(lx, lz); g.translate(wx, (fallen ? heightAt(wx, wz) : Math.min(foot, heightAt(wx, wz))) - .2, wz);
        parts.push({ g, root });
      }
      if (!fallen) green.push({ l: [lx, lz + 1], y: 0, s: .42 });
    };
    column(-len / 2 - 3.5, 5 + r() * 2, 2 + (r() * 2 | 0), false);
    column(len / 2 + 2.5, 6 + r() * 3, 3, true, -.4 + r() * .3);
    /* what came down, in the grass at the wall's feet: both sides, more on the side the wall is lowest */
    for (let i = 0; i < 16; i++) {
      const lx = (r() - .5) * len * 1.25, side = r() < .65 ? 1 : -1, lz = side * (2.4 + r() * 5.5);
      const s = .8 + r() * .7;
      block(lx, .25 * s, lz, (1.8 + r() * 1.4) * s, (1.1 + r() * .5) * s, (1.5 + r() * .9) * s, r() * 3, (r() - .5) * .45, (r() - .5) * .4, true);
      if (r() < .45) green.push({ l: [lx + (r() - .5) * 2, lz + (r() - .5) * 2], y: 0, s: .3 + r() * .25 });
    }
    const g = merge(parts, true);
    const m = new THREE.Mesh(g, M.stone); m.castShadow = true; m.receiveShadow = true; m.userData.own = 1;
    into.add(m);
    /* the shade along its feet */
    if (occAdd) for (let lx = -len / 2; lx <= len / 2; lx += 2) { const [wx, wz] = at(lx, 0); occAdd(wx, wz, 4.5, keepTo(lx) > 1 ? .5 : .25); }
    return green.map(o => { const [wx, wz] = at(o.l[0], o.l[1]); return { x: wx, z: wz, y: o.y > 0 ? foot + o.y : heightAt(wx, wz), s: o.s }; });
  }

  /* ── LIFE ──────────────────────────────────────────────────────
     A meadow is not still. Butterflies go from flower to flower round the edge of the fight; a few birds wheel
     very high up over the hills; now and then a leaf comes down off a tree and drifts with the wind. All of it
     small, slow and quiet: something for the eye to find, never something that pulls it off the fight. */
  const LIFE = { bf: [], birds: [], leaves: [] };
  /* a butterfly: two wings hinged on the body (the shader flaps them) */
  G.wings = (() => {
    const pos = [], side = [], idx = [];
    [-1, 1].forEach(s => {
      const o = pos.length / 3;
      /* a forewing and a hindwing, as one shape */
      [[0, 0, .05], [s * .55, 0, .38], [s * .75, 0, .05], [s * .5, 0, -.32], [0, 0, -.18]].forEach(p => { pos.push(p[0], p[1], p[2]); side.push(s); });
      idx.push(o, o + 1, o + 2, o, o + 2, o + 3, o, o + 3, o + 4);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
    g.setIndex(idx);
    return g;
  })();
  M.wings = patch(new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), 'wings', { same: true,
    vh: 'attribute float aSide;',
    vp: ROOT_I + ` float ph = fwH(fwRoot.xz) * 6.28 + uT * (14.0 + 6.0 * fwH(fwRoot.zx));
         float flap = 0.25 + 0.95 * abs(sin(ph));
         float a = flap * aSide; float x = transformed.x;
         transformed.x = x * cos(a); transformed.y = abs(x) * sin(abs(a));
         transformed *= smoothstep(0.6, 1.0, uGrow);`,
    fo: 'outgoingLight += diffuseColor.rgb * 0.35;'
  });
  /* a bird far off: a shallow V, flapping slowly, dark against the sky */
  G.bird = (() => {
    const pos = [-1.4, .25, 0, -.6, .05, .18, 0, 0, 0, 0, 0, -.25, .6, .05, .18, 1.4, .25, 0];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
    g.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4, 2, 4, 5]);
    return g;
  })();
  M.bird = patch(new THREE.MeshBasicMaterial({ color: C('#3a4252'), side: THREE.DoubleSide, fog: false }), 'bird', {
    vp: ROOT_I + ` float ph = fwH(fwRoot.xz) * 6.28 + uT * 5.5;
         float w = sin(ph) * 0.55 * smoothstep(0.0, 0.3, abs(transformed.x));
         transformed.y += w * abs(transformed.x);
         transformed *= smoothstep(0.7, 1.0, uGrow);`
  });
  /* a leaf: a little card, coloured by the instance */
  G.leaf = (() => { const g = new THREE.PlaneGeometry(.42, .3); return g; })();
  M.leaf = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, map: (() => { const c = mkc(64, 48), x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.beginPath(); x.moveTo(4, 24); x.bezierCurveTo(18, 2, 46, 4, 60, 24); x.bezierCurveTo(46, 44, 18, 46, 4, 24); x.fill(); x.strokeStyle = 'rgba(120,120,120,.6)'; x.lineWidth = 2; x.beginPath(); x.moveTo(6, 24); x.lineTo(58, 24); x.stroke(); return toTex(c); })(), alphaTest: .4 });
  function life(P, r) {
    const hw = P.hw, hd = P.hd;
    /* butterflies: each has a home (a patch of flowers off the fight) and wanders round it */
    const nB = 9;
    const bf = new THREE.InstancedMesh(G.wings, M.wings, nB);
    const bc = ['#ffffff', '#f7e27a', '#f5b04a', '#9ac8ff', '#ffffff', '#f7e27a'].map(C);
    LIFE.bf = [];
    for (let i = 0; i < nB; i++) {
      let hx, hz; for (let k = 0; k < 20; k++) { hx = (r() - .5) * (P.W + 70); hz = -hd - 25 + r() * (P.D + 60); if (P.padOut(hx, hz) > 4 && P.pathD(hx, hz) > 3) break; }
      LIFE.bf.push({ hx, hz, ph: r() * 100, sp: .35 + r() * .3, rad: 4 + r() * 7, s: .55 + r() * .3 });
      bf.setColorAt(i, bc[i % bc.length]);
    }
    bf.frustumCulled = false; bf.castShadow = false; live.add(bf); LIFE.bfMesh = bf;
    /* birds: a loose flock wheeling over the hills behind */
    const nb = 6, bm = new THREE.InstancedMesh(G.bird, M.bird, nb);
    LIFE.birds = [];
    const cx = (r() - .5) * 200, cz = -260 - r() * 120, cy = 70 + r() * 30;
    for (let i = 0; i < nb; i++) LIFE.birds.push({ cx: cx + (r() - .5) * 40, cz: cz + (r() - .5) * 40, cy: cy + (r() - .5) * 14, rad: 30 + r() * 30, sp: .07 + r() * .03, ph: r() * 6.28, s: 1.5 + r() * .6 });
    bm.frustumCulled = false; live.add(bm); LIFE.birdMesh = bm;
    /* leaves: off the trees nearest the fight */
    const nL = 26, lm = new THREE.InstancedMesh(G.leaf, M.leaf, nL);
    LIFE.leaves = []; LIFE.trees = (P.nearTrees || []).slice(0, 12);
    for (let i = 0; i < nL; i++) {
      LIFE.leaves.push({ t: r() * 12, life: 9 + r() * 6, from: null, ph: r() * 6.28, spin: 1 + r() * 2 });
      lm.setColorAt(i, P.autumn && r() < .6 ? C(['#d47530', '#e0a23e', '#c2522c'][(r() * 3) | 0]) : C(['#6a9a34', '#86a83e', '#a3a548'][(r() * 3) | 0]));
    }
    lm.frustumCulled = false; live.add(lm); LIFE.leafMesh = lm;
    LIFE.r = r;
  }
  const LM4 = new THREE.Matrix4(), LQ = new THREE.Quaternion(), LE = new THREE.Euler(), LP = new THREE.Vector3(), LS = new THREE.Vector3();
  function lifeStep(t, dt) {
    if (!LAY || !LIFE.bfMesh) return;
    const wind = U.uWind.value;
    LIFE.bf.forEach((b, i) => {
      const u = t * b.sp + b.ph;
      const x = b.hx + Math.sin(u) * b.rad + Math.sin(u * 2.3) * b.rad * .35, z = b.hz + Math.cos(u * .8) * b.rad * .7 + Math.sin(u * 3.1) * 1.2;
      const y = LAY.heightAt(x, z) + 1.2 + .9 * Math.abs(Math.sin(u * 1.7)) + .35 * Math.sin(t * 9 + i);
      const dx = Math.cos(u) * b.rad + Math.cos(u * 2.3) * b.rad * .8, dz = -Math.sin(u * .8) * b.rad * .56;
      LE.set(Math.sin(t * 7 + i) * .15, Math.atan2(dx, dz), 0); LQ.setFromEuler(LE);
      LM4.compose(LP.set(x, y, z), LQ, LS.setScalar(b.s)); LIFE.bfMesh.setMatrixAt(i, LM4);
    });
    LIFE.bfMesh.instanceMatrix.needsUpdate = true;
    LIFE.birds.forEach((b, i) => {
      const a = t * b.sp + b.ph, x = b.cx + Math.cos(a) * b.rad, z = b.cz + Math.sin(a) * b.rad * .6, y = b.cy + Math.sin(a * 2) * 3;
      LE.set(0, -a, Math.sin(a) * .2); LQ.setFromEuler(LE);
      LM4.compose(LP.set(x, y, z), LQ, LS.setScalar(b.s)); LIFE.birdMesh.setMatrixAt(i, LM4);
    });
    LIFE.birdMesh.instanceMatrix.needsUpdate = true;
    const trees = LIFE.trees, r = LIFE.r;
    LIFE.leaves.forEach((l, i) => {
      l.t += dt;
      if (!l.from || l.t > l.life) {
        const tr = trees.length ? trees[(r() * trees.length) | 0] : { x: (r() - .5) * 120, z: -60, y: 0, s: 1 };
        l.from = { x: tr.x + (r() - .5) * 14 * tr.s, y: tr.y + (14 + r() * 10) * tr.s, z: tr.z + (r() - .5) * 14 * tr.s };
        l.t = 0; l.life = 8 + r() * 6;
      }
      const k = l.t, fall = Math.min(l.from.y - LAY.heightAt(l.from.x, l.from.z) - .1, k * 1.4);
      const x = l.from.x + k * 2.2 * wind + Math.sin(k * 1.3 + l.ph) * 1.6, z = l.from.z + k * .9 * wind + Math.cos(k * 1.1 + l.ph) * 1.2;
      const ground = fall >= l.from.y - LAY.heightAt(l.from.x, l.from.z) - .15;
      LE.set(ground ? -Math.PI / 2 : k * l.spin + l.ph, ground ? l.ph : k * l.spin * .7, ground ? 0 : Math.sin(k * 2 + l.ph)); LQ.setFromEuler(LE);
      const fade = Math.min(1, k / .6, Math.max(0, (l.life - k) / 1.5)) * smooth(clamp((U.uGrow.value - .7) / .3, 0, 1));
      LM4.compose(LP.set(x, l.from.y - fall, z), LQ, LS.setScalar(fade * 1.4)); LIFE.leafMesh.setMatrixAt(i, LM4);
    });
    LIFE.leafMesh.instanceMatrix.needsUpdate = true;
  }

  /* ── every frame ── */
  const camPos = new THREE.Vector3();
  function frame(t, dt, camera) {
    U.uT.value = t;
    camera.getWorldPosition(camPos); sky.position.copy(camPos);
    lifeStep(t, dt);
    M.water.uniforms.uFogC.value.copy(fog.color); M.water.uniforms.uFogD.value = fog.density;
    if (LAY && LAY.motes) {
      const p = LAY.motes.geometry.attributes.position, b = LAY.motes.userData.base, ph = LAY.motes.userData.ph;
      for (let i = 0; i < ph.length; i++) {
        const k = ph[i];
        p.array[i * 3] = b[i * 3] + Math.sin(t * .21 + k) * 3 + t * .35 % 150 * 0;
        p.array[i * 3 + 1] = b[i * 3 + 1] + Math.sin(t * .37 + k * 1.7) * 1.2;
        p.array[i * 3 + 2] = b[i * 3 + 2] + Math.cos(t * .17 + k * .7) * 3;
      }
      p.needsUpdate = true;
      M.mote.opacity = .7 * clamp(U.uGrow.value * 2 - 1, 0, 1);
    }
  }
  /* how far the world has come up out of the table: the light comes with it */
  function setGrow(g) {
    U.uGrow.value = g;
    if (!LAY) return;
    const e = smooth(clamp(g, 0, 1));
    sun.intensity = lerp(.25, LAY.si, e);
    hemi.intensity = lerp(.35, LAY.hemi, e);
    hemi.color.copy(C('#7a5a40')).lerp(C(LAY.tod.warm ? '#d8d4e8' : '#c4dcff'), e);
    hemi.groundColor.copy(C('#1c120a')).lerp(C('#6e7a40'), e);
    fog.color.copy(skyU.uDark.value).lerp(LAY.haze, e);
    fog.density = lerp(0, .00105, e);
  }

  /* where the figures stand (x, z, and the reach of their feet across and along, in the world's units) */
  function setFeet(list) {
    const n = Math.min(FEET_N, list.length);
    for (let i = 0; i < n; i++) feet[i].set(list[i][0], list[i][1], list[i][2], list[i][3]);
    footU.uNFeet.value = n;
  }
  return { group: world, live, sun, hemi, build, buildGen, frame, setGrow, setFeet, uniforms: U, get lay() { return LAY; }, heightAt: (x, z) => (LAY ? LAY.heightAt(x, z) : 0) };
}

window.FieldWorld = { make };
})();
