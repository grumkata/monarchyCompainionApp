/* ══════════════════════════════════════════════════════════════
   27-sm64-gfx.js — drawing it the way the Nintendo 64 drew it.

   The models come out of tools/bake_sm64.py as the game's own display lists,
   played through: triangles grouped by the state they were drawn with. Here
   each group gets a shader that does what the N64's RSP and RDP did with it:

     light    the game's one light, fixed to the camera (up, right and
              towards you), on the normals the models carry, with the
              material's own ambient and diffuse colours; or, unlit, the
              colours painted on the vertices;
     colour   the RDP's colour combiner, (a - b) * c + d, with the inputs the
              display list chose (texel, shade, environment, primitive);
     texture  the game's texture coordinates, its wrap / mirror / clamp, its
              blur (bilinear, no mipmaps); and the shine on the star and the
              coins worked out from the normal, as texture-gen does;
     layers   drawn in the game's order: opaque, decals, cut-out, see-through.

   A model is its geo layout made into a tree of groups: animated parts the
   animations turn, switches (blinking eyes, a hand open or shut), billboards
   that face the camera, and the places things are held.
══════════════════════════════════════════════════════════════ */
(function (root) {
'use strict';
if (typeof THREE === 'undefined') return;
const SM64 = root.SM64 = root.SM64 || {};
const { ANG, s16 } = SM64.m;

/* ══ DATA ══════════════════════════════════════════════════════ */
function bytes(b64) {
  const s = atob(b64), a = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
  return a;
}
const i16 = b64 => { const b = bytes(b64); return new Int16Array(b.buffer, b.byteOffset, b.length >> 1); };
const u16a = b64 => { const b = bytes(b64); return new Uint16Array(b.buffer, b.byteOffset, b.length >> 1); };

/* ══ TEXTURES ══════════════════════════════════════════════════ */
const texCache = {};
function texture(D, name, cms, cmt) {
  const key = name + '|' + cms + '|' + cmt;
  if (texCache[key]) return texCache[key];
  const T = D.tex[name];
  let t;
  if (T && T.img) {
    const img = new Image();
    t = new THREE.Texture(img);
    img.onload = () => { t.needsUpdate = true; };
    img.src = T.img;
  } else {
    /* no picture for it: plain white, so the shading and the material's own colours still read */
    t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat);
    t.needsUpdate = true;
  }
  t.flipY = false;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
  const wrap = c => (c & 2 ? THREE.ClampToEdgeWrapping : c & 1 ? THREE.MirroredRepeatWrapping : THREE.RepeatWrapping);
  t.wrapS = wrap(cms); t.wrapT = wrap(cmt);
  t.encoding = THREE.LinearEncoding;
  return (texCache[key] = t);
}

/* ══ THE SHADER ════════════════════════════════════════════════ */
/* the combiner's inputs: 0 zero, 1 texel, 2 shade, 3 environment, 4 primitive, 5 texel alpha, 6 one, 7 combined */
const RGB = ['vec3(0.0)', 'tex.rgb', 'shade.rgb', 'env.rgb', 'prim.rgb', 'vec3(tex.a)', 'vec3(1.0)', 'vec3(1.0)'];
const A = ['0.0', 'tex.a', 'shade.a', 'env.a', 'prim.a', 'tex.a', '1.0', '1.0'];

const VERT = `
attribute vec2 st;
attribute vec4 cn;
uniform vec2 uvScale, uvOffset, genScale;
uniform vec3 amb, dif, lightDir;
uniform float lit, texgen;
varying vec2 vUv;
varying vec4 vShade;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  if (lit > 0.5) {
    vec3 n = cn.xyz * 255.0;
    n = mix(n, n - 256.0, step(127.5, n)) / 127.0;
    /* the light, taken into the model's own space as the RSP does, and laid on the model's normal */
    mat3 m = mat3(modelViewMatrix);
    vec3 l = normalize(vec3(dot(m[0], lightDir), dot(m[1], lightDir), dot(m[2], lightDir)));
    vShade = vec4(min(amb + dif * max(dot(n, l), 0.0), vec3(1.0)), cn.w);
    if (texgen > 0.5) {
      vec3 nv = normalize(m * n);
      vUv = vec2(nv.x + 1.0, -nv.y + 1.0) * 0.25 * genScale;
    } else vUv = st * uvScale + uvOffset;
  } else {
    vShade = cn;
    vUv = st * uvScale + uvOffset;
  }
  gl_Position = projectionMatrix * mv;
}`;

function fragShader(cc, alphaTest) {
  const c = `(${RGB[cc[0]]} - ${RGB[cc[1]]}) * ${RGB[cc[2]]} + ${RGB[cc[3]]}`;
  const a = `(${A[cc[4]]} - ${A[cc[5]]}) * ${A[cc[6]]} + ${A[cc[7]]}`;
  return `
uniform sampler2D map;
uniform vec4 env, prim;
uniform float hasMap, fade;
varying vec2 vUv;
varying vec4 vShade;
void main() {
  vec4 tex = hasMap > 0.5 ? texture2D(map, vUv) : vec4(1.0);
  vec4 shade = vShade;
  vec3 col = clamp(${c}, 0.0, 1.0);
  float alpha = clamp(${a}, 0.0, 1.0) * fade;
  ${alphaTest ? 'if (alpha < 0.5) discard;' : ''}
  gl_FragColor = vec4(col, alpha);
}`;
}

/* the light: 0x28, 0x28, 0x28 in the camera's own space, as every Lights1 in the game has it */
const LIGHT = new THREE.Vector3(1, 1, 1).normalize();
const matCache = {};
function material(D, mi, layer) {
  const key = mi + '|' + layer;
  if (matCache[key]) return matCache[key];
  const M = D.mats[mi], T = M.tex;
  const alphaTest = layer === 4;
  const blend = layer >= 5;
  const uniforms = {
    map: { value: T ? texture(D, T.name, T.cms, T.cmt) : null },
    hasMap: { value: T ? 1 : 0 },
    uvScale: { value: new THREE.Vector2(T ? T.sc[0] / 65536 / 32 / T.w : 0, T ? T.sc[1] / 65536 / 32 / T.h : 0) },
    uvOffset: { value: new THREE.Vector2(T ? -(T.uls / 4) / T.w : 0, T ? -(T.ult / 4) / T.h : 0) },
    genScale: { value: new THREE.Vector2(T ? T.sc[0] / 32 / T.w : 1, T ? T.sc[1] / 32 / T.h : 1) },
    amb: { value: new THREE.Vector3(M.amb[0] / 255, M.amb[1] / 255, M.amb[2] / 255) },
    dif: { value: new THREE.Vector3(M.dif[0] / 255, M.dif[1] / 255, M.dif[2] / 255) },
    lightDir: { value: LIGHT },
    lit: { value: M.light ? 1 : 0 },
    texgen: { value: M.texgen ? 1 : 0 },
    env: { value: new THREE.Vector4(M.env[0] / 255, M.env[1] / 255, M.env[2] / 255, M.env[3] / 255) },
    prim: { value: new THREE.Vector4(M.prim[0] / 255, M.prim[1] / 255, M.prim[2] / 255, M.prim[3] / 255) },
    fade: { value: 1 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, vertexShader: VERT, fragmentShader: fragShader(M.cc, alphaTest),
    transparent: blend, depthWrite: !blend,
    side: M.cull === 'back' ? THREE.FrontSide : M.cull === 'front' ? THREE.BackSide : THREE.DoubleSide,
  });
  if (layer === 2 || layer === 6) { mat.polygonOffset = true; mat.polygonOffsetFactor = -2; mat.polygonOffsetUnits = -4; }
  /* the N64 draws counter-clockwise faces as fronts too: three's FrontSide is the same */
  return (matCache[key] = mat);
}

/* ══ MESHES ════════════════════════════════════════════════════ */
const geoCache = {};
function meshGroups(D, mi) {
  if (geoCache[mi]) return geoCache[mi];
  const out = D.meshes[mi].map(g => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(Float32Array.from(i16(g.p)), 3));
    geo.setAttribute('st', new THREE.Float32BufferAttribute(Float32Array.from(i16(g.st)), 2));
    geo.setAttribute('cn', new THREE.BufferAttribute(bytes(g.c), 4, true));
    geo.computeBoundingSphere();
    return { geo, m: g.m };
  });
  return (geoCache[mi] = out);
}
function meshObject(D, mi, layer) {
  const grp = new THREE.Group();
  for (const g of meshGroups(D, mi)) {
    const mesh = new THREE.Mesh(g.geo, material(D, g.m, layer));
    mesh.renderOrder = layer;
    mesh.frustumCulled = true;
    grp.add(mesh);
  }
  return grp;
}

/* ══ ANIMATIONS ════════════════════════════════════════════════ */
const animCache = new Map();
function anim(a) {
  if (!a) return null;
  let r = animCache.get(a);
  if (!r) { r = { flags: a.flags, ydiv: a.ydiv, start: a.start, loopStart: a.loopStart, loopEnd: a.loopEnd, parts: a.parts, v: i16(a.v), i: u16a(a.i) }; animCache.set(a, r); }
  return r;
}
/* the value of attribute k (each a (count, offset) pair) at a frame */
function animValue(A, k, frame) {
  const n = A.i[k * 2], off = A.i[k * 2 + 1];
  return A.v[off + (frame < n ? frame : n - 1)];
}

/* ══ A MODEL ═══════════════════════════════════════════════════
   build(D, modelName) → an instance: { root (Object3D), parts, switches, bills, held, asm, shadow } */
function build(D, name) {
  const tree = D.models[name];
  if (!tree) return null;
  const inst = { root: new THREE.Group(), switches: [], bills: [], held: [], rot: [], shadow: null, top: null, name };
  inst.top = visit(D, tree, inst, inst.root);
  return inst;
}
function visit(D, n, inst, parent) {
  let g;
  const node = { k: n.k, c: [], n };
  switch (n.k) {
    case 'part':
      g = new THREE.Group(); g.position.set(n.p[0], n.p[1], n.p[2]); g.rotation.order = 'ZYX';
      node.base = n.p; break;
    case 'tr':
      g = new THREE.Group(); g.position.set(n.p[0], n.p[1], n.p[2]); g.rotation.order = 'YXZ';
      g.rotation.set(n.r[0] * ANG, n.r[1] * ANG, n.r[2] * ANG);
      node.r0 = n.r.slice();
      if (n.rotnode) inst.rot.push(node);
      break;
    case 'scale':
      g = new THREE.Group(); g.scale.setScalar(n.s); break;
    case 'bill':
      g = new THREE.Group(); g.position.set(n.p[0], n.p[1], n.p[2]); inst.bills.push(node); break;
    case 'switch':
      g = new THREE.Group(); node.fn = n.fn; node.sel = n.n || 0; inst.switches.push(node); break;
    case 'held':
      g = new THREE.Group(); g.position.set(n.p[0], n.p[1], n.p[2]); inst.held.push(node); break;
    case 'shadow':
      g = new THREE.Group(); inst.shadow = { type: n.type, solid: n.solid, s: n.s }; break;
    case 'asm':
      g = null; node.fn = n.fn; node.param = n.param; break;
    default:
      g = new THREE.Group();
  }
  node.g = g;
  if (g) {
    parent.add(g);
    if (n.mesh != null) g.add(meshObject(D, n.mesh, n.layer || 1));
  }
  let prevAsm = null;
  for (const c of n.c || []) {
    const cn = visit(D, c, inst, g || parent);
    node.c.push(cn);
    /* an asm node works on the node after it (the head turning, the torso tilting, the hand scaling) */
    if (prevAsm) { prevAsm.next = cn; prevAsm = null; }
    if (cn.k === 'asm') prevAsm = cn;
  }
  return node;
}

/* sets the switches, then lays the animation on the parts, as geo_process does each frame:
   the parts in the order the game meets them (a switch only takes the case it shows) */
function pose(inst, animInfo, sel) {
  for (const s of inst.switches) {
    const v = sel ? sel(s.fn, s) : 0;
    s.sel = v;
    s.c.forEach((c, i) => { if (c.g) c.g.visible = i === v; });
  }
  const A = animInfo && animInfo.anim;
  let type = 0, frame = 0, mult = 1, attr = 0;
  if (A && !(A.flags & 32)) {
    frame = animInfo.frame;
    type = A.flags & 8 ? 3 : A.flags & 16 ? 2 : A.flags & 64 ? 4 : 1;   // vertical, lateral, none, all
    mult = A.ydiv === 0 ? 1 : (animInfo.yTrans || A.ydiv) / A.ydiv;
  }
  const next = () => animValue(A, attr++, frame);
  const walk = node => {
    if (node.k === 'switch') { const c = node.c[node.sel]; if (c) walk(c); return; }
    if (node.k === 'part') {
      let x = node.base[0], y = node.base[1], z = node.base[2], rx = 0, ry = 0, rz = 0;
      if (type) {
        if (type === 1) { x += next() * mult; y += next() * mult; z += next() * mult; type = 5; }
        else if (type === 2) { x += next() * mult; attr++; z += next() * mult; type = 5; }
        else if (type === 3) { attr++; y += next() * mult; attr++; type = 5; }
        else if (type === 4) { attr += 3; type = 5; }
        rx = next(); ry = next(); rz = next();
      }
      node.g.position.set(x, y, z);
      node.g.rotation.set(rx * ANG, ry * ANG, rz * ANG);
    }
    for (const c of node.c) walk(c);
  };
  walk(inst.top);
}

/* billboards face the camera: their own place, the camera's turn, the object's scale */
const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _m = new THREE.Matrix4();
function faceCamera(inst, cam, scale) {
  for (const b of inst.bills) {
    const g = b.g;
    g.updateMatrix();
    g.parent.updateWorldMatrix(true, false);
    _p.copy(g.position).applyMatrix4(g.parent.matrixWorld);
    _s.set(scale, scale, scale);
    g.matrixWorld.compose(_p, cam.quaternion, _s);
    g.matrixAutoUpdate = false;
    /* its children follow from this */
    for (const ch of g.children) ch.updateMatrixWorld(true);
  }
}

/* advances an animation a frame, as geo_update_animation_frame does (16.16 steps when it is sped up) */
function stepAnim(ai) {
  const A = ai.anim;
  if (!A || (A.flags & 4)) return;
  let r;
  if (A.flags & 2) {
    r = ai.accel ? ai.assist - ai.accel : (ai.frame - 1) * 65536;
    if ((r >> 16) < A.loopStart) r = ((A.flags & 1 ? A.loopStart : A.loopEnd - 1) * 65536) + (r & 0xFFFF);
  } else {
    r = ai.accel ? ai.assist + ai.accel : (ai.frame + 1) * 65536;
    if ((r >> 16) >= A.loopEnd) r = ((A.flags & 1 ? A.loopEnd - 1 : A.loopStart) * 65536) + (r & 0xFFFF);
  }
  ai.assist = r;
  ai.frame = r >> 16;
}

SM64.gfx = { build, pose, faceCamera, stepAnim, anim, animValue, meshObject, material, texture, LIGHT };

})(window);
