/* ═══════════════════════════════════════════════════════════════
   THE PIECES
   The HTML combat sheet is untouched and still owns layout, hit
   testing and every interaction. This layer only DRAWS the playing
   pieces: moulded plastic counters and large-unit shields, lit, with
   a contact shadow lying in the plane of the table.

   The camera mirrors the page's CSS perspective exactly
   (perspective:2400px, perspective-origin:50% 42%), so a piece placed
   at an element's on-screen rect lands precisely where the DOM put
   it — the board can pan, zoom and re-layout freely and the pieces
   follow without knowing anything about the table.

   Text is never drawn here. Anything with live values stays DOM.
═══════════════════════════════════════════════════════════════ */
(function(){
/* If ANYTHING in here throws, every piece disappears — the DOM tokens are
   transparent because this layer paints them. That is not an acceptable failure,
   so the whole module is guarded: on any error the page falls back to the flat
   2D pieces it had before, and says why in the corner rather than silently
   showing a board full of empty sockets. */
function glFailed(err){
  document.body.classList.add('no-gl');
  console.error('[monarchy] piece layer failed, falling back to 2D:', err);
  let n = document.getElementById('glerr');
  if (!n){
    n = document.createElement('div'); n.id = 'glerr'; n.className = 'glerr';
    document.body.appendChild(n);
  }
  n.textContent = '3D pieces unavailable — ' + ((err && err.message) || err);
}
try {
/* The table's tilt is LIVE, not a constant — locking a scene in lays the table
   flat, and every piece has to lie down with it. Read it each frame and rebuild
   the board basis when it moves. */
let TILT = 22 * Math.PI/180;
let AXIS = Math.PI/2 - TILT;       // stands a +Y-axis solid on the board's normal
const PERSP  = 2400;               // CSS perspective
const ORIGIN = 0.42;               // CSS perspective-origin Y
const THICK  = 0.62;               // counter height as a fraction of its radius
const BASE_R = 1.30, BASE_H = 0.30;// the plinth a player character stands on

const cv = document.createElement('canvas');
cv.id = 'gl';
Object.assign(cv.style,{position:'fixed',inset:'0',zIndex:900,pointerEvents:'none'});
document.body.appendChild(cv);

const renderer = new THREE.WebGLRenderer({canvas:cv, alpha:true, antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputEncoding = THREE.sRGBEncoding;
const scene = new THREE.Scene();
let camera, W = 0, H = 0, OY = 0, dirty = 3;

function sizeCam(){
  W = innerWidth; H = innerHeight;
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.setSize(W,H,false);
  cv.style.width = W+'px'; cv.style.height = H+'px';  // setSize(...,false) leaves CSS size alone
  OY = (0.5 - ORIGIN) * H;                            // where CSS puts the vanishing point
  const fov = 2*Math.atan(H/(2*PERSP)) * 180/Math.PI;
  /* Everything sits within a couple of hundred units of z=0, so clamp the
     frustum hard — it buys the depth precision the gloss layer needs. */
  camera = new THREE.PerspectiveCamera(fov, W/H, PERSP-700, PERSP+700);
  camera.position.set(0, OY, PERSP);
  camera.lookAt(0, OY, 0);
  dirty = 3;
}

/* ── light: warm key from upper left, cool bounce, low front fill ── */
scene.add(new THREE.AmbientLight(0xffe9c8, 0.52));
const key = new THREE.DirectionalLight(0xfff2d8, 0.62); key.position.set(-700, 820, 1100);
const fil = new THREE.DirectionalLight(0x93b6d8, 0.24); fil.position.set( 800, 260,  700);
const low = new THREE.DirectionalLight(0xffd8a2, 0.50); low.position.set(-200,-760, 1400);
scene.add(key, fil, low);

/* ── the room the plastic reflects: a lamp band over a dark floor ── */
(function(){
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const x = c.getContext('2d');
  /* Mostly dark, with ONE bright band. A generally bright room averages out to
     an even wash once the sample is blurred, which greys the print instead of
     putting a highlight on it. */
  const g = x.createLinearGradient(0,0,0,128);
  g.addColorStop(0,'#100e0b'); g.addColorStop(.30,'#171410');
  g.addColorStop(.355,'#fff8e8'); g.addColorStop(.415,'#fff8e8');
  g.addColorStop(.47,'#221c15'); g.addColorStop(1,'#070505');
  x.fillStyle = g; x.fillRect(0,0,256,128);
  const w = x.createRadialGradient(74,48,6,74,48,62);
  w.addColorStop(0,'rgba(255,253,246,.85)'); w.addColorStop(1,'rgba(255,253,246,0)');
  x.fillStyle = w; x.fillRect(0,0,256,128);
  const t = new THREE.CanvasTexture(c);
  t.encoding = THREE.sRGBEncoding;
  t.mapping = THREE.EquirectangularReflectionMapping;
  const pm = new THREE.PMREMGenerator(renderer); pm.compileEquirectangularShader();
  scene.environment = pm.fromEquirectangular(t).texture;
  t.dispose(); pm.dispose();
})();

/* ── geometry ──────────────────────────────────────────────────
   Counter: a turned rim with flat printed caps, so the silhouette has
   a moulded edge instead of a hard cylinder.                        */
const PROF = [[0.965,0.50],[1.00,0.435],[1.00,-0.435],[0.965,-0.50]]
  .map(p => new THREE.Vector2(p[0], p[1]));
const RIM  = new THREE.LatheGeometry(PROF, 64);
const CAP  = new THREE.CircleGeometry(0.965, 64);   // meets the rim — no seam

/* Bends a flat face's NORMALS outward without touching its shape. A dead-flat
   face samples the environment in one direction, so the gloss came out as an
   even wash that greyed the print. Domed normals sweep the reflection across
   the face instead, which is what a highlight actually is. */
function dome(geo, amount){
  const p = geo.attributes.position, n = geo.attributes.normal;
  let R = 0;
  for (let i=0; i<p.count; i++) R = Math.max(R, Math.hypot(p.getX(i), p.getY(i)));
  R = R || 1;
  const v = new THREE.Vector3();
  for (let i=0; i<p.count; i++){
    v.set(p.getX(i)/R*amount, p.getY(i)/R*amount, 1).normalize();
    n.setXYZ(i, v.x, v.y, v.z);
  }
  n.needsUpdate = true;
  return geo;
}
const GLOSS = dome(new THREE.CircleGeometry(0.94, 64), 0.46);

/* Shield: the same heater silhouette the 2D large-unit token uses,
   extruded and bevelled. 66 x 74 in the sheet, so 0.892 : 1. */
const SW = 66/74;
const HEATER = [[0,0],[1,0],[1,.54],[.92,.71],[.74,.88],[.5,1],[.26,.88],[.08,.71],[0,.54]];
const SHIELD = (function(){
  const s = new THREE.Shape();
  HEATER.forEach((p,i) => {
    const x = (p[0]-0.5)*SW, y = 0.5-p[1];
    i ? s.lineTo(x,y) : s.moveTo(x,y);
  });
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s,{depth:0.44, bevelEnabled:true,
    bevelThickness:0.022, bevelSize:0.009, bevelSegments:2, curveSegments:1});
  return {solid:g, flat:dome(new THREE.ShapeGeometry(s), 0.46)};
})();

/* Formations are NOT drawn here. A tile is flat and straight-edged, so CSS 3D
   extrudes it perfectly well — and keeping it in the DOM means it shares the
   plate's own 3D context instead of being matched to it. Matching it here meant
   fighting a perspective mismatch (a tilted rect's bounding box is a trapezoid,
   so its centre is not the centre) and covering the name plaque that rides the
   plate's edge. See table3d.css, "A FORMATION IS A BLOCK".                    */

/* ── contact shadow: a soft ellipse lying IN the table plane ── */
const shTex = (function(){
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64,64,2,64,64,64);
  g.addColorStop(0,'rgba(0,0,0,.78)'); g.addColorStop(.38,'rgba(0,0,0,.48)');
  g.addColorStop(.70,'rgba(0,0,0,.16)'); g.addColorStop(1,'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0,0,128,128);
  return new THREE.CanvasTexture(c);
})();
const shMat = new THREE.MeshBasicMaterial({map:shTex,transparent:true,depthWrite:false});
const shMatSoft = new THREE.MeshBasicMaterial({map:shTex,transparent:true,depthWrite:false,opacity:.62});
const shGeo = new THREE.PlaneGeometry(1,1);

/* ── materials ──────────────────────────────────────────────────
   The printed face is UNLIT: it is artwork, and it has to match the
   token on the sheet exactly — a lit face washes the dark field out
   to grey. The plastic sheen is a separate additive pass over it, so
   the piece can be glossy without the print drifting.              */
const capCache = {}, capMat = {}, sideMat = {}, shieldMat = {};

function capTexture(mono, ring, face, ink){
  const k = 'c|'+mono+'|'+ring+'|'+face;
  if (capCache[k]) return capCache[k];
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = face; x.beginPath(); x.arc(128,128,128,0,7); x.fill();
  const g = x.createRadialGradient(128,84,14,128,128,134);
  g.addColorStop(0,'rgba(255,236,204,.09)'); g.addColorStop(1,'rgba(0,0,0,.30)');
  x.fillStyle = g; x.beginPath(); x.arc(128,128,128,0,7); x.fill();
  x.strokeStyle = ring; x.lineWidth = 13;
  x.beginPath(); x.arc(128,128,121,0,7); x.stroke();
  x.fillStyle = ink;
  x.font = '700 82px Cinzel, Georgia, serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(mono, 128, 133);
  const t = new THREE.CanvasTexture(c);
  t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
  return (capCache[k] = t);
}

function heaterPath(x, s, cw, ch){
  x.beginPath();
  HEATER.forEach((p,i) => {
    const px = (0.5 + (p[0]-0.5)*s) * cw, py = (0.46 + (p[1]-0.46)*s) * ch;
    i ? x.lineTo(px,py) : x.moveTo(px,py);
  });
  x.closePath();
}
function shieldTexture(mono, ring, face, ink, band){
  const k = 's|'+mono+'|'+ring+'|'+face;
  if (capCache[k]) return capCache[k];
  const cw = 228, ch = 256;
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const x = c.getContext('2d');
  x.fillStyle = ring; x.fillRect(0,0,cw,ch);                 // the geometry is the silhouette
  x.fillStyle = band; heaterPath(x,0.94,cw,ch); x.fill();
  x.fillStyle = face; heaterPath(x,0.845,cw,ch); x.fill();
  const g = x.createLinearGradient(0,20,0,ch);
  g.addColorStop(0,'rgba(255,238,208,.12)'); g.addColorStop(.5,'rgba(0,0,0,0)');
  g.addColorStop(1,'rgba(0,0,0,.34)');
  heaterPath(x,0.845,cw,ch); x.fillStyle = g; x.fill();
  x.fillStyle = ink;
  x.font = '700 74px Cinzel, Georgia, serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(mono, cw/2, ch*0.42);
  const t = new THREE.CanvasTexture(c);
  t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
  /* the shape spans -SW/2..SW/2 in x and -0.5..0.5 in y, and ExtrudeGeometry
     hands those straight through as uv, so map them back onto 0..1 */
  t.repeat.set(1/SW, 1); t.offset.set(0.5, 0.5);
  return (capCache[k] = t);
}

function matCap(mono, c){
  const k = 'c|'+mono+'|'+c.ring+'|'+c.face;
  return capMat[k] || (capMat[k] = new THREE.MeshBasicMaterial(
    {map:capTexture(mono,c.ring,c.face,c.ink)}));
}
function matShield(mono, c){
  const k = 's|'+mono+'|'+c.ring+'|'+c.face;
  return shieldMat[k] || (shieldMat[k] = new THREE.MeshBasicMaterial(
    {map:shieldTexture(mono,c.ring,c.face,c.ink,c.band)}));
}
/* The lights total roughly 2x, so a colour picked by eye renders about twice as
   bright as it looks in a swatch. Darken deliberately rather than fighting it. */
/* convertSRGBToLinear is not optional. This build of three treats a Color as
   already-linear and then gamma-encodes on output, so every hex was rendering
   about a stop and a half brighter than its swatch — which is why a dark red
   side kept coming out salmon. */
function matSolid(hex, rough, env){
  if (env === undefined) env = .55;
  const k = hex+'|'+rough+'|'+env;
  return sideMat[k] || (sideMat[k] = new THREE.MeshStandardMaterial(
    {color:new THREE.Color(hex).convertSRGBToLinear(),
     roughness:rough, metalness:.06, envMapIntensity:env}));
}
/* pure specular, black albedo, added over the print — this is the plastic */
function glossMat(){
  return new THREE.MeshStandardMaterial({color:0x000000, roughness:.38, metalness:0,
    envMapIntensity:0.95, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false});
}

const PAL = {
  dark:{
    'en-e':{ring:'#c8452c',face:'#20100d',side:'#6e2415',ink:'#f2e0bd',band:'#5a4020'},
    'al-e':{ring:'#4b8fb4',face:'#0e1a26',side:'#255d78',ink:'#e6eef5',band:'#5a4020'},
    'pc'  :{ring:'#e0b455',face:'#221a0e',side:'#8f6d26',ink:'#fbeec9',band:'#5a4020'},
    'sel' :{ring:'#f7d271',face:'#2c210f',side:'#b08a35',ink:'#fff4d4',band:'#6b4d26'},
    'dead':{ring:'#6b6055',face:'#171512',side:'#3c352d',ink:'#8d8377',band:'#3a3128'},
    'nope':{ring:'#e8563a',face:'#2a100b',side:'#8c2a18',ink:'#ffd9cd',band:'#5a4020'},
    'aim' :{ring:'#ffd97a',face:'#3d2e11',side:'#c79a3c',ink:'#fff6dd',band:'#7a5a24'},
    'dim' :{ring:'#4a453d',face:'#15130f',side:'#2c2822',ink:'#6b6558',band:'#332e26'},
    plinth:'#a8863c'
  },
  light:{
    'en-e':{ring:'#8f2a19',face:'#bda684',side:'#7d5324',ink:'#3d2410',band:'#8a6432'},
    'al-e':{ring:'#2a5674',face:'#b6a488',side:'#6f5a34',ink:'#22303c',band:'#8a6432'},
    'pc'  :{ring:'#8a6a24',face:'#cbb389',side:'#8a6432',ink:'#33240c',band:'#a07a3a'},
    'sel' :{ring:'#c08f1e',face:'#d3bb8c',side:'#9a7638',ink:'#33240c',band:'#a07a3a'},
    'dead':{ring:'#6e6455',face:'#a89a80',side:'#6f6250',ink:'#554b3a',band:'#6f6250'},
    'nope':{ring:'#c03a1e',face:'#c9a992',side:'#8c3a20',ink:'#4a1a0c',band:'#8a6432'},
    'aim' :{ring:'#b8860f',face:'#eddaa2',side:'#a07a3a',ink:'#33240c',band:'#a07a3a'},
    'dim' :{ring:'#8a8172',face:'#b3a992',side:'#7d7565',ink:'#6a6353',band:'#7d7565'},
    plinth:'#9c7c38'
  }
};
function PALETTE(){ return PAL[document.body.classList.contains('dark') ? 'dark' : 'light']; }

/* ── the pool ─────────────────────────────────────────────────── */
const pool = [];
function piece(i){
  if (pool[i]) return pool[i];

  const disc = new THREE.Group();                      // round counter
  const rimM = new THREE.Mesh(RIM, matSolid('#8a6432',.44));
  const capM = new THREE.Mesh(CAP, matSolid('#8a6432',.44));
  const botM = new THREE.Mesh(CAP, matSolid('#2a1c0d',.6));
  const glsM = new THREE.Mesh(GLOSS, glossMat());
  capM.position.y =  0.5;  capM.rotation.x = -Math.PI/2;
  glsM.position.y =  0.52; glsM.rotation.x = -Math.PI/2; glsM.renderOrder = 2;
  botM.position.y = -0.5;  botM.rotation.x =  Math.PI/2;
  disc.add(rimM, capM, botM, glsM);
  scene.add(disc);

  const shl = new THREE.Group();                       // large-unit shield
  const shlM = new THREE.Mesh(SHIELD.solid, [matSolid('#8a6432',.44), matSolid('#5a4020',.5)]);
  const shlG = new THREE.Mesh(SHIELD.flat, glossMat());
  shlG.position.z = 0.470; shlG.scale.set(.965,.965,1);
  shlG.renderOrder = 2;                                // the same plastic sheen
  shl.add(shlM, shlG);
  shl.visible = false;
  scene.add(shl);

  const plinth = new THREE.Group();                    // player-character base
  const plM = new THREE.Mesh(RIM, matSolid('#a8863c',.34));
  const plT = new THREE.Mesh(CAP, matSolid('#a8863c',.34));
  plT.position.y = 0.5; plT.rotation.x = -Math.PI/2;
  plinth.add(plM, plT);
  plinth.visible = false;
  scene.add(plinth);

  const sh = new THREE.Mesh(shGeo, shMat);
  sh.renderOrder = -1;
  scene.add(sh);

  return (pool[i] = {disc, rimM, capM, botM, glsM, shl, shlM, shlG, plinth, plM, plT, sh});
}

/* ═══════════════════════════════════════════════════════════════
   DICE
   The d4, d6, d8, d20 and the coin are the KayKit BoardGameBits
   models, baked into the page as plain vertex arrays at build time
   (see bake_dice.py) — no loader, no fetch, one file.

   Their face -> number tables were CALIBRATED, not guessed: each
   model's triangles were grouped into real faces by normal, each
   face's UV island was cropped out of the texture, and the numerals
   were read off a contact sheet. So when the app says a d20 rolled 17,
   the 17 is the face actually pointing at the ceiling.

   The pack has no d10 or d12, so those two are built here to match.

   The RESULT is rolled first, with Math.random, and the tumble is then
   choreographed to land on it. That order matters: the number is
   honest, the animation is only presentation.
═══════════════════════════════════════════════════════════════ */

const UP = new THREE.Vector3(0, Math.sin(TILT), Math.cos(TILT));   // the table's normal

const BODY = '#fab051', INK = '#8c4a10';                           // sampled off the pack

const texCache = {};
function diceTexture(uri){
  if (texCache[uri]) return texCache[uri];
  const t = new THREE.TextureLoader().load(uri, mark);
  t.encoding = THREE.sRGBEncoding;
  t.flipY = false;                       // glTF UVs put the origin top-left
  t.anisotropy = 8;
  return (texCache[uri] = t);
}

function geoFrom(m){
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(m.p, 3));
  g.setAttribute('uv',       new THREE.Float32BufferAttribute(m.u, 2));
  g.setAttribute('normal',   new THREE.Float32BufferAttribute(m.n, 3));
  g.setIndex(m.i);
  return g;
}

/* Real faces of a convex solid, found by grouping triangles on their normal —
   the same routine the calibration used, so the tables line up. */
function facesOf(geo){
  const pos = geo.attributes.position, ix = geo.index;
  const out = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const ab = new THREE.Vector3(), ac = new THREE.Vector3(), n = new THREE.Vector3();
  const count = ix ? ix.count : pos.count;
  for (let i = 0; i < count; i += 3){
    const i0 = ix ? ix.getX(i) : i, i1 = ix ? ix.getX(i+1) : i+1, i2 = ix ? ix.getX(i+2) : i+2;
    a.fromBufferAttribute(pos,i0); b.fromBufferAttribute(pos,i1); c.fromBufferAttribute(pos,i2);
    ab.subVectors(b,a); ac.subVectors(c,a); n.crossVectors(ab,ac);
    const area = n.length() / 2;
    if (area < 1e-9) continue;
    n.divideScalar(area * 2);
    let f = out.find(g => g.n.dot(n) > 0.995);
    if (!f){ f = {n:n.clone(), a:0, c:new THREE.Vector3(), w:0}; out.push(f); }
    f.n.multiplyScalar(f.a).addScaledVector(n, area).normalize();
    f.a += area;
    f.c.add(a).add(b).add(c); f.w += 3;
  }
  out.forEach(f => f.c.divideScalar(f.w));
  return out.sort((x,y) => y.a - x.a);
}

/* ── the two shapes the pack does not have ──────────────────────
   Built to sit beside the KayKit dice rather than beside each other:
   same body colour, same ink, numerals on planes just off each face so
   they stay crisp instead of stretching over a UV. */
function trapezohedron(){
  /* PolyhedronGeometry projects every vertex onto a sphere, which turns a
     trapezohedron into a blob — so this is built by hand: two apexes and a
     ten-vertex equator that alternates between two heights, cut into ten kites.
     The kites are only PLANAR at one proportion (apex height = 9.4721 x the
     equator's zigzag, for a unit equator); at any other, each "face" is two
     triangles with different normals and the numbering falls apart. */
  const R = 0.965, C = 0.106, H = C * 9.4721;
  const T = [0, H, 0], B = [0, -H, 0], E = [];
  for (let j = 0; j < 10; j++){
    const a = j * Math.PI / 5;
    E.push([Math.cos(a)*R, (j % 2 ? -C : C), Math.sin(a)*R]);
  }
  const kites = [];
  for (let k = 0; k < 5; k++){
    kites.push([T, E[(2*k)%10],   E[(2*k+1)%10], E[(2*k+2)%10]]);
    kites.push([B, E[(2*k+1)%10], E[(2*k+2)%10], E[(2*k+3)%10]]);
  }
  const pos = [], nor = [];
  const v = (a,b) => [b[0]-a[0], b[1]-a[1], b[2]-a[2]];
  kites.forEach(q => {
    [[0,1,2],[0,2,3]].forEach(t => {
      let a = q[t[0]], b = q[t[1]], c = q[t[2]];
      const ab = v(a,b), ac = v(a,c);
      let n = [ab[1]*ac[2]-ab[2]*ac[1], ab[2]*ac[0]-ab[0]*ac[2], ab[0]*ac[1]-ab[1]*ac[0]];
      const mid = [(a[0]+b[0]+c[0])/3, (a[1]+b[1]+c[1])/3, (a[2]+b[2]+c[2])/3];
      if (n[0]*mid[0] + n[1]*mid[1] + n[2]*mid[2] < 0){       // keep the winding outward
        [b, c] = [c, b];
        n = n.map(x => -x);
      }
      const L = Math.hypot(n[0],n[1],n[2]) || 1;
      [a,b,c].forEach(p => { pos.push(p[0],p[1],p[2]); nor.push(n[0]/L, n[1]/L, n[2]/L); });
    });
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal',   new THREE.Float32BufferAttribute(nor, 3));
  return g;
}

const NUMTEX = {};
function numeralTex(txt){
  if (NUMTEX[txt]) return NUMTEX[txt];
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d');
  x.fillStyle = INK; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = '700 ' + (txt.length > 1 ? 62 : 80) + 'px Cinzel, Georgia, serif';
  x.fillText(txt, S/2, S/2 + 2);
  if (txt === '6' || txt === '9') x.fillRect(S/2-22, S/2+34, 44, 5);
  const t = new THREE.CanvasTexture(c);
  t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
  return (NUMTEX[txt] = t);
}
const markGeo = new THREE.PlaneGeometry(1,1);
function markMesh(tex, size, at, normal){
  const m = new THREE.Mesh(markGeo, new THREE.MeshBasicMaterial(
    {map:tex, transparent:true, depthWrite:false}));
  m.scale.set(size, size, 1);
  m.position.copy(at).addScaledVector(normal, 0.06);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), normal);
  const ref = new THREE.Vector3(0,1,0).addScaledVector(normal, -normal.y);
  if (ref.lengthSq() > 1e-4){
    ref.normalize().applyQuaternion(m.quaternion.clone().invert());
    m.rotateZ(-Math.atan2(ref.x, ref.y));
  }
  return m;
}

const DIE = {};
function buildDie(kind){
  if (DIE[kind]) return DIE[kind];
  const group = new THREE.Group();
  let lands = [];

  const asset = DICE_ASSETS[String(kind)];
  if (asset){
    const geo = geoFrom(asset);
    const mat = new THREE.MeshStandardMaterial({
      map: diceTexture(DICE_TEX[asset.t]),
      roughness: .38, metalness: kind === 'coin' ? .55 : .04, envMapIntensity: 1.0});
    group.add(new THREE.Mesh(geo, mat));

    if (kind === 'coin'){
      lands = [new THREE.Vector3(0,1,0), new THREE.Vector3(0,-1,0)];
    } else if (kind === 4){
      /* a d4 is read at the APEX, so what lands is a corner. Take the four
         extreme vertices from the model and match them to the calibration. */
      const pos = geo.attributes.position, pts = [], v = new THREE.Vector3();
      for (let i=0;i<pos.count;i++){
        v.fromBufferAttribute(pos,i);
        if (v.length() > 0.9 && !pts.some(w => w.distanceTo(v) < 0.4)) pts.push(v.clone());
      }
      lands = new Array(4);
      asset.c.forEach(c => {
        const want = new THREE.Vector3(c[0],c[1],c[2]).normalize();
        let best = null, bd = -2;
        pts.forEach(p => { const d = p.clone().normalize().dot(want); if (d > bd){ bd = d; best = p; } });
        if (best) lands[c[3]-1] = best.clone().normalize();
      });
    } else {
      const faces = facesOf(geo);
      lands = new Array(kind);
      asset.f.forEach(row => {
        const want = new THREE.Vector3(row[0],row[1],row[2]).normalize();
        let best = null, bd = -2;
        faces.forEach(f => { const d = f.n.dot(want); if (d > bd){ bd = d; best = f; } });
        if (best) lands[row[3]-1] = best.n.clone();
      });
    }
    return (DIE[kind] = {group, lands});
  }

  /* ── hand-built d10 and d12 ── */
  const geo = kind === 10 ? trapezohedron() : new THREE.DodecahedronGeometry(1.0);
  group.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color:new THREE.Color(BODY).convertSRGBToLinear(),
    roughness:.38, metalness:.04, envMapIntensity:1.0})));
  const faces = facesOf(geo);
  const num = new Array(faces.length).fill(0);
  let next = 1;
  faces.forEach((f,i) => {
    if (num[i]) return;
    const opp = faces.findIndex(g => g.n.dot(f.n) < -0.985);
    num[i] = next;
    if (opp >= 0) num[opp] = kind + 1 - next;
    next++;
    while (next <= kind && num.includes(next)) next++;
  });
  lands = new Array(kind);
  faces.forEach((f,i) => {
    const val = num[i];
    group.add(markMesh(numeralTex(kind === 10 ? String(val % 10) : String(val)),
                       kind === 10 ? 0.58 : 0.66, f.c, f.n));
    lands[val-1] = f.n.clone();
  });
  return (DIE[kind] = {group, lands});
}

/* ── live dice: a small rigid-body sim ─────────────────────────
   Scripted arcs read as stiff because nothing is ever surprised. So the
   dice are actually thrown: gravity, bounce, friction, walls, and dice
   knocking into each other. All of it runs in the TRAY'S OWN UNITS — a
   flat (x,y) on the board plus a height along the board normal — which
   keeps the maths 2D-simple and means pan and zoom cost nothing.

   The result is still decided before the throw. What the sim decides is
   only where a die ends up and how it got there; when one finally slows
   down it rocks over to its result face by the SHORTEST path from
   wherever it happens to be lying, so settling reads as the die tipping
   onto a face rather than snapping to one.
═══════════════════════════════════════════════════════════════ */
const rolling = [];
let diceAnchor = null, restClock = 0, simAcc = 0;

const G       = 2600;   // table units / s², tuned to the tray, not to Earth
const BOUNCE  = 0.42;   // how much of the fall comes back
const SLIDE   = 0.86;   // speed kept through a real impact
const IMPACT  = 90;     // below this, contact is resting — NOT a bounce
const ROLLFRIC= 0.5;    // viscous part of the felt's drag
const MU      = 0.30;   // Coulomb part — this is what makes a die STOP
const ANGMU   = 26;     // rad/s^2, likewise for the spin
const AIRDRAG = 0.18;
const SPINDRAG= 1.1;
const WALL    = 0.62;
const HIT     = 0.5;    // die on die
const ROLLCPL = 7;      // how hard motion drives spin, so they roll not slide
const SLEEP_V = 22, SLEEP_W = 1.4, SETTLE_T = 0.20;
const HOLD = 2.2, FADE = 0.85;

/* board basis: right, up-table, and the normal — the sim's three axes */
const BX = new THREE.Vector3(1,0,0);
const BY = new THREE.Vector3(0, Math.cos(TILT), -Math.sin(TILT));
const BN = new THREE.Vector3(0, Math.sin(TILT),  Math.cos(TILT));
const BOARDQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), BN);

/* Called whenever the page's tilt changes. Rebuilds every derived axis, and
   re-derives the resting orientation of any die already lying down — a die that
   settled at 22 degrees is not settled at 0. */
function setTilt(t){
  TILT = t; AXIS = Math.PI/2 - TILT;
  UP.set(0, Math.sin(TILT), Math.cos(TILT));
  BY.set(0, Math.cos(TILT), -Math.sin(TILT));
  BN.copy(UP);
  BOARDQ.setFromUnitVectors(new THREE.Vector3(0,1,0), BN);
  rolling.forEach(d => {
    if (!d.endQ) return;
    d.endQ = restingQuat(d);
    if (d.asleep) d.q.copy(d.endQ);
  });
  dirty = 3;
}

function trayHalf(){
  const w = (diceAnchor && diceAnchor.offsetWidth)  || 620;
  const h = (diceAnchor && diceAnchor.offsetHeight) || 400;
  return {x:w/2, y:h/2};
}

function spawnDie(kind, result, i, total){
  const proto = buildDie(kind);
  const obj = proto.group.clone(true);
  obj.traverse(o => { if (o.material){ o.material = o.material.clone(); o.material.transparent = true; } });
  scene.add(obj);

  const idx  = kind === 'coin' ? (result === 'Heads' ? 0 : 1) : result - 1;
  const land = proto.lands[idx] || proto.lands[0] || new THREE.Vector3(0,1,0);

  /* a fistful shrinks so it still fits the tray */
  const size = Math.min(30, Math.max(13, 30 * Math.sqrt(7 / Math.max(1,total))));
  const R = trayHalf();
  const rad = size * (kind === 'coin' ? 0.72 : 0.66);

  /* Thrown in over the near edge, fanning up-table — spread the launch across
     the width and vary every component, or a handful arrives as one clump and
     lands in a tidy diagonal, which is the other way fake dice give themselves
     away. */
  const lane = total > 1 ? (i / (total-1) - 0.5) : (Math.random()-.5);
  rolling.push({
    obj, land, rad, size, kind,
    x: (lane * 0.62 - 0.12) * R.x * 2 + (Math.random()-.5) * size * 2,
    y: -R.y * (1.10 + Math.random() * 0.30),
    h:  size * (3.4 + Math.random() * 3.0),
    vx: -60 + lane * 260 + (Math.random()-.5) * 320,
    vy: 430 + Math.random() * 300,
    vh: 70 + Math.random() * 170,
    w: new THREE.Vector3(Math.random()-.5, Math.random()-.5, Math.random()-.5)
         .normalize().multiplyScalar(19 + Math.random()*16),
    q: new THREE.Quaternion().setFromEuler(new THREE.Euler(
         Math.random()*6, Math.random()*6, Math.random()*6)),
    slow: 0, asleep: false, endQ: null, blend: 0,
    delay: i * 0.045, t: 0
  });
  restClock = 0;
}

/* the resting orientation nearest to how the die is already lying: put the
   result face on the board normal, then pick the yaw that turns it least */
function restingQuat(d){
  const rest = new THREE.Quaternion().setFromUnitVectors(d.land, new THREE.Vector3(0,1,0));
  const A = BOARDQ.clone().invert().multiply(d.q).multiply(rest.clone().invert());
  const th = 2 * Math.atan2(A.y, A.w);                     // twist about the board normal
  const yaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), th);
  return BOARDQ.clone().multiply(yaw).multiply(rest);
}

const _q = new THREE.Quaternion(), _v = new THREE.Vector3();
function simStep(dt){
  const R = trayHalf();
  const live = rolling.filter(d => d.t >= d.delay);

  live.forEach(d => {
    if (d.asleep) return;
    const grounded = d.h <= d.rad + 0.5;

    d.vh -= G * dt;
    d.h  += d.vh * dt;
    if (d.h < d.rad){
      d.h = d.rad;
      /* Only a real impact costs speed and spin. Resting contact must not, or
         the felt bills the die 120 times a second and it stops dead. */
      if (d.vh < -IMPACT){
        d.vh = -d.vh * BOUNCE;
        d.vx *= SLIDE; d.vy *= SLIDE;
        d.w.multiplyScalar(0.86);
        d.w.addScaledVector(BY, d.vx * 0.012).addScaledVector(BX, -d.vy * 0.012);
      } else if (d.vh < 0) d.vh = 0;
    }
    const drag = grounded ? ROLLFRIC : AIRDRAG;
    const f = Math.max(0, 1 - drag * dt);
    d.vx *= f; d.vy *= f;
    d.x += d.vx * dt; d.y += d.vy * dt;
    d.w.multiplyScalar(Math.max(0, 1 - (grounded ? SPINDRAG : 0.3) * dt));
    if (grounded){
      /* Coulomb friction, not just viscous drag. Viscous decay is asymptotic, so
         a die spends a second creeping to a halt at a speed you can barely see;
         a constant deceleration brings it to an actual stop, the way felt does. */
      const sp = Math.hypot(d.vx, d.vy), dv = MU * G * dt;
      if (sp <= dv){ d.vx = 0; d.vy = 0; }
      else { const r = (sp - dv) / sp; d.vx *= r; d.vy *= r; }
      const wl2 = d.w.length(), dw = ANGMU * dt;
      if (wl2 <= dw) d.w.set(0,0,0);
      else d.w.multiplyScalar((wl2 - dw) / wl2);
      /* motion drives spin: omega = (n x v) / r. Without this a die slides across
         the tray facing one way, which is the tell that it is fake. */
      if (sp > 6){
        _v.set(0,0,0).addScaledVector(BY, d.vx / d.rad).addScaledVector(BX, -d.vy / d.rad);
        d.w.lerp(_v, Math.min(1, ROLLCPL * dt));
      }
    }

    /* walls */
    if (d.x < -R.x + d.rad){ d.x = -R.x + d.rad; d.vx = Math.abs(d.vx)*WALL; d.w.z -= d.vx*0.03; }
    if (d.x >  R.x - d.rad){ d.x =  R.x - d.rad; d.vx = -Math.abs(d.vx)*WALL; d.w.z += d.vx*0.03; }
    if (d.y < -R.y + d.rad){ d.y = -R.y + d.rad; d.vy = Math.abs(d.vy)*WALL; d.w.x += d.vy*0.03; }
    if (d.y >  R.y - d.rad){ d.y =  R.y - d.rad; d.vy = -Math.abs(d.vy)*WALL; d.w.x -= d.vy*0.03; }
  });

  /* die on die — equal mass, so the impulse is just the closing speed split */
  for (let a = 0; a < live.length; a++){
    for (let b = a+1; b < live.length; b++){
      const A = live[a], B = live[b];
      if (Math.abs(A.h - B.h) > A.rad + B.rad) continue;
      let nx = B.x - A.x, ny = B.y - A.y;
      let dist = Math.hypot(nx, ny);
      const min = A.rad + B.rad;
      if (dist >= min) continue;
      if (dist < 1e-4){ nx = 1; ny = 0; dist = 1e-4; }
      nx /= dist; ny /= dist;
      const push = (min - dist) / 2 + 0.01;
      A.x -= nx*push; A.y -= ny*push; B.x += nx*push; B.y += ny*push;
      const rel = (B.vx - A.vx)*nx + (B.vy - A.vy)*ny;
      if (rel > 0) continue;                                // already separating
      const j = -(1 + HIT) * rel / 2;
      A.vx -= j*nx; A.vy -= j*ny; B.vx += j*nx; B.vy += j*ny;
      const kick = Math.min(14, Math.abs(j) * 0.05);
      A.w.x += ny*kick; A.w.z -= nx*kick;
      B.w.x -= ny*kick; B.w.z += nx*kick;
      A.asleep = B.asleep = false; A.slow = B.slow = 0;
      if (A.blend > 0) A.blend = 0;
      if (B.blend > 0) B.blend = 0;
    }
  }

  /* spin, then settle */
  live.forEach(d => {
    if (d.asleep) return;
    const wl = d.w.length();
    if (wl > 1e-5){
      _q.setFromAxisAngle(_v.copy(d.w).normalize(), wl * dt);
      d.q.premultiply(_q);
    }
    const still = d.h <= d.rad + 0.5 && Math.hypot(d.vx, d.vy) < SLEEP_V && wl < SLEEP_W;
    d.slow = still ? d.slow + dt : 0;
    if (d.slow > SETTLE_T){
      if (!d.endQ) d.endQ = restingQuat(d);
      d.blend = Math.min(1, d.blend + dt / 0.30);
      d.q.slerp(d.endQ, d.blend < 1 ? 1 - Math.pow(1 - d.blend, 3) : 1);
      const ease = Math.max(0, 1 - 9 * dt);
      d.w.multiplyScalar(ease); d.vx *= ease; d.vy *= ease;
      if (d.blend >= 1){ d.asleep = true; d.vx = d.vy = 0; d.w.set(0,0,0); }
    }
  });
}

function stepDice(dt, anchor){
  if (!rolling.length) return;
  const TWu = (diceAnchor && diceAnchor.offsetWidth) || 620;
  const k  = anchor ? anchor.width / TWu : 0.55;
  const cx = anchor ? anchor.left + anchor.width/2 - W/2 : 0;
  const cy = anchor ? (H/2 - (anchor.top + anchor.height/2)) + OY : OY;

  rolling.forEach(d => d.t += dt);
  /* fixed sub-steps: a bounce resolved at a variable rate is a bounce that
     behaves differently on every machine */
  simAcc = Math.min(simAcc + dt, 0.1);
  while (simAcc >= 1/120){ simStep(1/120); simAcc -= 1/120; }

  const allAsleep = rolling.every(d => d.asleep);
  restClock = allAsleep ? restClock + dt : 0;

  for (let i = rolling.length - 1; i >= 0; i--){
    const d = rolling[i];
    if (d.t < d.delay){ d.obj.visible = false; continue; }
    d.obj.visible = true;
    d.obj.scale.setScalar(d.size * k);
    d.obj.quaternion.copy(d.q);
    _v.set(0,0,0).addScaledVector(BX, d.x).addScaledVector(BY, d.y).addScaledVector(BN, d.h);
    d.obj.position.set(cx + _v.x*k, cy + _v.y*k, _v.z*k);

    if (restClock > HOLD){
      const o = 1 - (restClock - HOLD) / FADE;
      if (o <= 0){
        scene.remove(d.obj);
        d.obj.traverse(x => { if (x.material) x.material.dispose(); });
        rolling.splice(i,1); continue;
      }
      d.obj.traverse(x => { if (x.material) x.material.opacity = o; });
    }
  }
}

window.GLDice = {
  spawn(list){ list.forEach((d,i) => spawnDie(d.kind, d.result, i, list.length)); mark(); },
  busy(){ return rolling.length > 0; },
  /* every settled die reports how squarely its declared face is pointing at the
     ceiling — 1.0 means the number the chat printed is the number on top */
  /* runs the sim in fixed slices with the clock held, so a throw can be
     filmed or traced at exact times instead of at whatever rate rAF managed */
  _advance(sec){
    for (let n = Math.round(sec * 120); n > 0; n--){
      rolling.forEach(d => d.t += 1/120);
      simStep(1/120);
    }
    if (rolling.every(d => d.asleep)) restClock += sec;
    mark();
  },
  _trace(){ return rolling.map(d => ({
    h:+d.h.toFixed(1), x:+d.x.toFixed(0), y:+d.y.toFixed(0),
    v:+Math.hypot(d.vx,d.vy).toFixed(0), w:+d.w.length().toFixed(1), z:d.asleep?1:0 })); },
  audit(){ return rolling.map(d => ({
    kind:d.kind, asleep:d.asleep,
    up:+d.land.clone().applyQuaternion(d.q).dot(BN).toFixed(4),
    inTray: Math.abs(d.x) <= trayHalf().x + 1 && Math.abs(d.y) <= trayHalf().y + 1
  })); },
  /* Lays every requested face out in a fixed grid, held still, so the tables
     can be checked against a photograph instead of trusted. */
  _calib(list, cols, cell){
    cols = cols || 10; cell = cell || 100;
    const board = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), UP);
    list.forEach((d,i) => {
      const p = buildDie(d.kind), o = p.group.clone(true);
      const land = p.lands[d.kind === 'coin' ? (d.result === 'Heads' ? 0 : 1) : d.result-1];
      if (!land){ console.warn('no landing for', d.kind, d.result); return; }
      o.quaternion.copy(board).multiply(
        new THREE.Quaternion().setFromUnitVectors(land, new THREE.Vector3(0,1,0)));
      o.scale.setScalar(cell*0.42);
      const col = i % cols, row = Math.floor(i / cols);
      o.position.set((col - (cols-1)/2) * cell,
                     OY + (list.length/cols/2 - row) * cell * 0.92, 30);
      scene.add(o);
    });
    mark();
  }
};

/* ── only touch layout when something actually moved ── */
function mark(){ dirty = 3; }
addEventListener('resize', sizeCam);
addEventListener('wheel', mark, {passive:true});
addEventListener('pointermove', mark, {passive:true});
addEventListener('pointerdown', mark, {passive:true});
addEventListener('pointerup', mark, {passive:true});
addEventListener('keydown', mark);
new MutationObserver(mark).observe(document.body,
  {subtree:true, childList:true, attributes:true, attributeFilter:['class','style']});

/* A player character keeps its side's colours — the plinth under the piece is
   what says "player", so allegiance never stops reading. */
function kindOf(ent){
  /* While a card is held over the board, every piece is either something it
     can be put on or something it cannot. That is a piece STATE, so it is
     painted here rather than faked with a DOM overlay the canvas would cover
     anyway. `sel` beats `aimno`: the piece doing the aiming is rarely a legal
     target for its own card, and dimming yourself while you aim is nonsense. */
  return ent.classList.contains('aimok') ? 'aim'
       : ent.classList.contains('sel')   ? 'sel'
       : ent.classList.contains('aimno') ? 'dim'
       : ent.classList.contains('spent') ? 'dead'
       : ent.classList.contains('en-e')  ? 'en-e' : 'al-e';
}
const ON = (r) => !(r.width < 3 || r.bottom < -120 || r.top > H+120 || r.right < -120 || r.left > W+120);
const toWorld = (r) => [r.left + r.width/2 - W/2, (H/2 - (r.top + r.height/2)) + OY];

let lastT = 0, frameFails = 0;
function frame(ts){ try { _frame(ts); } catch (err){
    if (++frameFails > 6) glFailed(err); else console.error('[monarchy] frame:', err);
    requestAnimationFrame(frame); } }
function _frame(ts){
  requestAnimationFrame(frame);
  const dt = lastT ? Math.min(0.1, (ts - lastT)/1000) : 0;
  lastT = ts || 0;
  if (window.__carry) dirty = 2;
  /* a CSS animation on a piece's DOM box moves the piece, because that box is
     what this layer reads — but it fires no events and mutates nothing, so the
     dirty flag never trips. app.js sets __animUntil while one is running. */
  if (window.__animUntil && (ts || 0) < window.__animUntil) dirty = 2;
  if (rolling.length){
    stepDice(window.__diceFrozen ? 0 : dt, diceAnchor && diceAnchor.getBoundingClientRect());
    dirty = 2;
  }
  if (dirty <= 0) return;
  dirty--;
  if (frameFails > 6) return;
  /* the field draws its own army out of its own scene, so this layer stands
     down entirely rather than painting counters nobody can see */
  if (document.body.classList.contains('field-on')){ renderer.clear(); return; }

  const t = window.__tilt ? window.__tilt() : TILT;
  if (Math.abs(t - TILT) > 1e-5) setTilt(t);

  const P = PALETTE();
  let n = 0;

  document.querySelectorAll('.cwin .tok, .cwin .shield').forEach(el => {
    const r = el.getBoundingClientRect();
    if (!ON(r)) return;
    const ent = el.closest('.ent');
    if (ent.classList.contains('ghost')) return;   // a proposal stays flat
    let kind = kindOf(ent);
    /* a refused piece is shaken by app.js, which moves it here for free because
       this layer reads its box — but the shake alone is easy to miss on a busy
       board, so the ring goes red for the length of it too */
    if (ent.classList.contains('nope')) kind = 'nope';
    const c = P[kind] || P[kindOf(ent)];
    const isPC = ent.classList.contains('pc');
    const p = piece(n++);
    /* set every frame, not at creation: the pool is reused and the tilt moves */
    p.disc.rotation.x = p.plinth.rotation.x = AXIS;
    p.shl.rotation.x = p.sh.rotation.x = -TILT;
    const mono = (el.textContent || '').trim().slice(0,2).toUpperCase();
    let [cx, cy] = toWorld(r);

    /* ── carried ──
       The piece being dragged leaves its socket and rides the cursor, lifted
       off the board with its shadow left behind on the felt. Nothing about the
       mechanics changes; the DOM element it came from is still where it was and
       still owns the drop. */
    const carry = window.__carry;
    const held = carry && ent.dataset.id === carry.id;
    let lift = 0, hold = 1;
    if (held){
      carry.t = Math.min(1, (carry.t || 0) + 0.16);
      const e = 1 - Math.pow(1 - carry.t, 3);
      const tx = carry.x - W/2, ty = (H/2 - carry.y) + OY;
      cx += (tx - cx) * e; cy += (ty - cy) * e;
      lift = 34 * e * (r.width / 44);          // scales with the zoom
      /* looked at straight on (a locked-in scene) a lift is only a shadow, so
         give the held piece a little size too — it has to read either way */
      hold = 1 + 0.10 * e;
    }
    let foot;                                    // silhouette radius, for the shadow

    if (el.classList.contains('shield')){
      p.disc.visible = false;
      /* the geometry spans 0.484 in local z (depth 0.44 + a bevel each side),
         so this works out at a real thickness of about 0.35 x the shield */
      const hgt = r.width * hold / SW, dep = hgt * 0.72;
      p.shlM.material = [matShield(mono, c), matSolid(c.side,.44)];
      p.shl.scale.set(hgt, hgt, dep);
      p.shl.visible = true;
      foot = isPC ? hgt*0.56 : hgt*0.45;
      const base = isPC ? hgt*0.13 : 0;
      p.shl.position.set(cx, cy + (base+lift)*Math.sin(TILT), (base+lift)*Math.cos(TILT));
      if (isPC){
        p.plinth.scale.set(hgt*0.56, base, hgt*0.56);
        p.plinth.position.set(cx, cy + (base/2+lift)*Math.sin(TILT), (base/2+lift)*Math.cos(TILT));
        p.plM.material = p.plT.material = matSolid(kind==='dead'?c.side:P.plinth,.34);
        p.plinth.visible = true;
      } else p.plinth.visible = false;
    } else {
      p.shl.visible = false;
      const rad = r.width * hold * 0.50, h = rad * THICK;
      const base = isPC ? rad * BASE_H : 0;
      p.capM.material = matCap(mono, c);
      p.rimM.material = p.botM.material = matSolid(c.side,.40);
      p.disc.scale.set(rad, h, rad);
      const up = base + h/2 + lift;
      p.disc.position.set(cx, cy + up*Math.sin(TILT), up*Math.cos(TILT));
      p.disc.visible = true;
      foot = isPC ? rad*BASE_R : rad;
      if (isPC){
        p.plinth.scale.set(rad*BASE_R, base, rad*BASE_R);
        p.plinth.position.set(cx, cy + (base/2+lift)*Math.sin(TILT), (base/2+lift)*Math.cos(TILT));
        p.plM.material = p.plT.material = matSolid(kind==='dead'?c.side:P.plinth,.34);
        p.plinth.visible = true;
      } else p.plinth.visible = false;
    }

    /* A lifted piece throws a bigger, softer shadow, and it stays on the felt —
       that gap is the whole reason you can see it is off the board. */
    const spread = 1 + lift / 46;
    const off = foot*0.34*spread;                // the key is up and to the left
    p.sh.scale.set(foot*3.3*spread, foot*3.3*spread, 1);
    p.sh.position.set(cx + off*0.62, cy - off*Math.cos(TILT), -off*Math.sin(TILT) - 1);
    p.sh.material = held ? shMatSoft : shMat;
    p.sh.visible = true;
  });

  for (let i=n; i<pool.length; i++){
    const p = pool[i];
    p.disc.visible = p.shl.visible = p.plinth.visible = p.sh.visible = false;
  }
  renderer.render(scene, camera);
}

diceAnchor = document.querySelector('.dicetray');
sizeCam();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(()=>{
  for (const k in capCache) delete capCache[k];
  for (const k in capMat)   delete capMat[k];
  for (const k in shieldMat) delete shieldMat[k];
  mark();
});
frame();
} catch (err) { glFailed(err); }
})();
