/* ═══════════════════════════════════════════════════════════════
   37-scene-field.js — GOING INTO THE FIGHT.

   grumkata (2026-10-10): immersive mode is "an optional way to view the same board
   state, that's why to access it was always to zoom into it ... it should always be
   available just by zooming in"; and, of what it was: "why does zooming in far
   enough just bring you to a separate area", "immersive mode is supposed to change
   the scenery and look", "like something in a real 3D adventure RPG".

   So there is no cut and no other room. Wheel in on the fight until the board fills
   the window and keep going: this camera takes over EXACTLY where the table's was
   (the same lens, the same place, the same figures in the same spots), and comes
   down among them while the world grows out of the board — the felt sinks into
   grass, the wood turns to meadow, trees and hills and the sky come up around the
   fight (38-field-world.js). Wheel out and it goes back up into the table's own
   view and hands the board back to it, and the table carries on out.

   The pieces themselves are the table's: 81-battle-view.js hands them over (hostIn)
   and asks this camera where they are (`proj`), so their blows, falls, tokens,
   labels, hit areas, typed numbers and the drag all work in here.

   The turn is a banner on a pole behind the middle of the fight (the GM touches it);
   the mana is the table's own orb of light, over the allies.
═══════════════════════════════════════════════════════════════ */
(function () {
'use strict';
if (typeof THREE === 'undefined') return;

const CM = 20;                     /* board units in one of the field's: 81 works in the board's, this world in quarter-metres */
const C = h => new THREE.Color(h).convertSRGBToLinear();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const mkc = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const BV = () => window.BattleView;
const BT = () => window.Battle;
const hashStr = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

let F = null;
function boot() {
if (F) return F;

/* ══ THE RENDERER, AND WHAT IS DONE TO THE PICTURE ═════════════
   Drawn into a buffer of its own (multisampled, half-floats so the sun on a cloud
   may be brighter than white), then finished: a soft glow off what is bright, a
   filmic curve, a warm grade, a light vignette. While the world is still coming up
   out of the table (grow < 1) the finish fades in with it, so the first frame is
   drawn the way the table draws the board. */
const cv = mkc(2, 2); cv.id = 'gl2';
Object.assign(cv.style, { position: 'fixed', left: '0', top: '0', zIndex: 880, pointerEvents: 'none', display: 'none', opacity: '0' });
document.body.appendChild(cv);
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: false, powerPreference: 'high-performance' });
const PR = () => Math.min(window.devicePixelRatio || 1, 1.5);
renderer.setPixelRatio(PR());
renderer.outputEncoding = THREE.LinearEncoding;
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;
let shadowTick = 0;
const isGL2 = !!renderer.capabilities.isWebGL2;
const TYPE = isGL2 && renderer.extensions.has('EXT_color_buffer_float') ? THREE.HalfFloatType : THREE.UnsignedByteType;
const sceneTarget = () => {
  const o = { type: TYPE, format: THREE.RGBAFormat, depthBuffer: true, stencilBuffer: false };
  if (isGL2 && THREE.WebGLMultisampleRenderTarget) { const t = new THREE.WebGLMultisampleRenderTarget(4, 4, o); t.samples = 4; return t; }
  return new THREE.WebGLRenderTarget(4, 4, o);
};
const plainTarget = () => new THREE.WebGLRenderTarget(4, 4, { type: TYPE, format: THREE.RGBAFormat, depthBuffer: false, stencilBuffer: false });
const rt = { scene: sceneTarget(), bA: plainTarget(), bB: plainTarget() };
const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const brightMat = new THREE.ShaderMaterial({
  uniforms: { tIn: { value: null } }, vertexShader: VERT, depthTest: false, depthWrite: false,
  fragmentShader: `uniform sampler2D tIn; varying vec2 vUv;
    void main(){ vec3 c = texture2D(tIn, vUv).rgb; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(0.85, 2.2, l), 1.0); }`
});
const blurMat = new THREE.ShaderMaterial({
  uniforms: { tIn: { value: null }, uDir: { value: new THREE.Vector2() } }, vertexShader: VERT, depthTest: false, depthWrite: false,
  fragmentShader: `uniform sampler2D tIn; uniform vec2 uDir; varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tIn, vUv).rgb * 0.2270270270;
      c += texture2D(tIn, vUv + uDir * 1.3846153846).rgb * 0.3162162162; c += texture2D(tIn, vUv - uDir * 1.3846153846).rgb * 0.3162162162;
      c += texture2D(tIn, vUv + uDir * 3.2307692308).rgb * 0.0702702703; c += texture2D(tIn, vUv - uDir * 3.2307692308).rgb * 0.0702702703;
      gl_FragColor = vec4(c, 1.0);
    }`
});
const finishMat = new THREE.ShaderMaterial({
  uniforms: { tScene: { value: null }, tBloom: { value: null }, uBloom: { value: .32 }, uExpo: { value: 1.0 }, uVig: { value: .28 }, uLook: { value: 1 }, uAspect: { value: 1.5 }, uSat: { value: 1.0 }, uGrade: { value: new THREE.Vector3(1, 1, 1) } },
  vertexShader: VERT, depthTest: false, depthWrite: false,
  fragmentShader: `uniform sampler2D tScene, tBloom; uniform float uBloom, uExpo, uVig, uLook, uAspect, uSat; uniform vec3 uGrade; varying vec2 vUv;
    vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
    vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
    void main(){
      vec3 s = texture2D(tScene, vUv).rgb;
      vec3 c = s + texture2D(tBloom, vUv).rgb * uBloom * uLook;
      vec3 graded = aces(c * uExpo * mix(vec3(1.0), uGrade, uLook));
      float l = dot(graded, vec3(0.2126, 0.7152, 0.0722));
      graded = mix(vec3(l), graded, uSat);
      graded *= mix(vec3(0.95, 0.98, 1.05), vec3(1.04, 1.0, 0.94), smoothstep(0.05, 0.7, l));
      vec2 q = (vUv - 0.5) * vec2(uAspect, 1.0) / max(uAspect, 1.0);
      graded *= 1.0 - uVig * smoothstep(0.35, 0.95, length(q) * 1.25);
      /* at the very start the picture is the table's: no curve, no grade, as 81 draws the board */
      c = mix(clamp(s, 0.0, 1.0), graded, uLook);
      gl_FragColor = vec4(toSRGB(clamp(c, 0.0, 1.0)), 1.0);
    }`
});
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blurMat); quad.frustumCulled = false;
const quadScene = new THREE.Scene(); quadScene.add(quad);
const pass = (mat, target) => { quad.material = mat; renderer.setRenderTarget(target); renderer.render(quadScene, quadCam); };

const scene = new THREE.Scene();
scene.background = C('#140d08');
const W = window.FieldWorld.make({ scene, renderer });

/* the table's own lights, which the board and the figures are lit by at the moment this camera takes over from the
   table's; they go out as the sun comes up (81-battle-view.js lights its board with these, fixed to the view) */
const tableKey = new THREE.DirectionalLight(C('#fff0d6'), 1.25); scene.add(tableKey, tableKey.target);
const tableFill = new THREE.DirectionalLight(C('#9ab4e0'), .4); scene.add(tableFill, tableFill.target);
const tableHemi = new THREE.HemisphereLight(C('#ffe9c8'), C('#33303c'), 1); scene.add(tableHemi);
const orbLight = new THREE.PointLight(C('#9cc6ff'), 0, 40, 2); scene.add(orbLight);

/* the fight's own group: in the board's units (81-battle-view.js puts its pieces in it as they are), one of this world's
   to every twenty of them; the middle of the felt is the middle of the world, x across, z toward you */
const stage = new THREE.Group(); stage.scale.setScalar(1 / CM); scene.add(stage);

/* ══ THE BANNER: THE TURN ═════════════════════════════════════
   A tall standard behind the middle of the fight, between the two sides, its cloth
   moving in the wind: TURN and the number. The GM touches it for the next turn. */
const BAN = { canvas: mkc(512, 768), said: null, shown: null, flip: 0, hot: 0, glow: 0, w: 6.4, h: 8.6 };
BAN.tex = new THREE.CanvasTexture(BAN.canvas); BAN.tex.encoding = THREE.sRGBEncoding; BAN.tex.anisotropy = 8;
function drawBanner(text) {
  const c = BAN.canvas, x = c.getContext('2d'), Wc = c.width, Hc = c.height;
  x.clearRect(0, 0, Wc, Hc);
  /* the cloth: swallow-tailed at the foot */
  const tail = Hc * .86;
  const shape = () => { x.beginPath(); x.moveTo(0, 0); x.lineTo(Wc, 0); x.lineTo(Wc, Hc); x.lineTo(Wc / 2, tail); x.lineTo(0, Hc); x.closePath(); };
  shape();
  const g = x.createLinearGradient(0, 0, Wc, 0); g.addColorStop(0, '#16213d'); g.addColorStop(.5, '#22325a'); g.addColorStop(1, '#16213d');
  x.fillStyle = g; x.fill();
  /* the weave */
  x.save(); shape(); x.clip();
  for (let i = 0; i < 2600; i++) { x.fillStyle = 'rgba(' + (Math.random() < .5 ? '255,255,255' : '0,0,0') + ',' + (Math.random() * .05).toFixed(3) + ')'; x.fillRect(Math.random() * Wc, Math.random() * Hc, 2, 1); }
  x.restore();
  /* the gold border */
  x.save(); shape(); x.lineWidth = 34; x.strokeStyle = '#c9a43c'; x.stroke(); x.lineWidth = 6; x.strokeStyle = '#7d5f1c'; x.stroke(); x.restore();
  x.save(); x.beginPath(); x.moveTo(40, 40); x.lineTo(Wc - 40, 40); x.lineTo(Wc - 40, Hc - 70); x.lineTo(Wc / 2, tail - 50); x.lineTo(40, Hc - 70); x.closePath();
  x.lineWidth = 4; x.strokeStyle = 'rgba(214,180,90,.75)'; x.stroke(); x.restore();
  x.textAlign = 'center'; x.textBaseline = 'middle';
  const engrave = (t, font, cy, fill) => { x.font = font; x.fillStyle = 'rgba(0,0,0,.55)'; x.fillText(t, Wc / 2 + 3, cy + 4); x.fillStyle = fill; x.fillText(t, Wc / 2, cy); };
  const m = /^TURN (\d+)$/.exec(text || '');
  if (m) {
    engrave('TURN', '700 72px Cinzel, Georgia, serif', 170, '#e8c86a');
    engrave(m[1], '700 ' + (m[1].length > 2 ? 210 : 270) + 'px Cinzel, Georgia, serif', 390, '#f6dc8a');
  } else if (text) engrave(text, '700 92px Cinzel, Georgia, serif', 300, '#f6dc8a');
  else {
    /* a crown, for those who are only waiting */
    x.fillStyle = '#d8b452'; x.beginPath();
    const cx = Wc / 2, cy = 300; x.moveTo(cx - 120, cy + 60); x.lineTo(cx - 140, cy - 60); x.lineTo(cx - 70, cy); x.lineTo(cx, cy - 90); x.lineTo(cx + 70, cy); x.lineTo(cx + 140, cy - 60); x.lineTo(cx + 120, cy + 60); x.closePath(); x.fill();
  }
  BAN.tex.needsUpdate = true;
}
const banner = new THREE.Group();
(function () {
  const wood = new THREE.MeshStandardMaterial({ color: C('#5a3b22'), roughness: .8 });
  const gold = new THREE.MeshStandardMaterial({ color: C('#d4a63e'), roughness: .35, metalness: .9 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.16, .22, 15.5, 10), wood); pole.position.y = 7.75; banner.add(pole);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, BAN.w + .9, 8), wood); bar.rotation.z = Math.PI / 2; bar.position.y = 14.2; banner.add(bar);
  [-1, 1].forEach(s => { const k = new THREE.Mesh(new THREE.SphereGeometry(.2, 10, 8), gold); k.position.set(s * (BAN.w / 2 + .45), 14.2, 0); banner.add(k); });
  const tip = new THREE.Mesh(new THREE.ConeGeometry(.24, .9, 10), gold); tip.position.y = 15.9; banner.add(tip);
  const boss = new THREE.Mesh(new THREE.SphereGeometry(.28, 12, 10), gold); boss.position.y = 15.4; banner.add(boss);
  const g = new THREE.PlaneGeometry(BAN.w, BAN.h, 14, 20); g.translate(0, -BAN.h / 2, 0);
  const mat = new THREE.MeshLambertMaterial({ map: BAN.tex, emissiveMap: BAN.tex, transparent: true, alphaTest: .4, side: THREE.DoubleSide, emissive: new THREE.Color(.42, .42, .42) });
  mat.onBeforeCompile = sh => {
    sh.uniforms.uT = W.uniforms.uT; sh.uniforms.uWind = W.uniforms.uWind;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT; uniform float uWind;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float hang = clamp(-position.y / ${BAN.h.toFixed(2)}, 0.0, 1.0);
        transformed.z += (sin(uT * 2.1 + position.x * 0.7 - position.y * 0.45) * 0.32 + sin(uT * 3.3 + position.x * 1.3) * 0.12) * hang * uWind;
        transformed.x += sin(uT * 1.4 - position.y * 0.3) * 0.22 * hang * hang * uWind;`);
  };
  mat.customProgramCacheKey = () => 'fw-banner';
  const cloth = new THREE.Mesh(g, mat); cloth.position.set(0, 14.05, .05); banner.add(cloth);
  BAN.cloth = cloth; BAN.mat = mat;
  const dm = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: BAN.tex, alphaTest: .4 }); cloth.customDepthMaterial = dm;
  banner.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
})();
scene.add(banner);
const bannerText = () => { const A = BV().A, gm = BT().isGM(); return !A ? '' : A.fight.cover ? (gm ? 'BEGIN' : '') : 'TURN ' + A.fight.round; };

/* ══ THE MANA: THE TABLE'S OWN ORB, OVER THE ALLIES ═══════════ */
let orb = null, orbMana = -1;

/* the lines light under a figure being carried, as the felt does on the table */
const glows = new THREE.Group(); scene.add(glows);
function layGlows(g) {
  glows.children.slice().forEach(o => { glows.remove(o); o.geometry.dispose(); o.material.dispose(); });
  g.lines.forEach((l, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(BT().G.LW / CM - .3, g.bh / CM + .6), new THREE.MeshBasicMaterial({ color: C('#ffd25a'), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(BT().lineX(g, i) / CM, .12, 0); m.renderOrder = 5; glows.add(m);
  });
}
function stepGlows() {
  const lanes = BV().laneMeshes ? BV().laneMeshes() : [];
  glows.children.forEach((m, i) => {
    const L = lanes[i], hex = L && L.material && L.material.emissive ? L.material.emissive.getHex() : 0;
    m.material.opacity += ((hex ? .22 : 0) - m.material.opacity) * .3;
    if (hex) m.material.color.copy(C(((hex >> 16) & 255) > 64 ? '#ff5a3c' : '#ffd25a'));
  });
}

/* ══ WHERE THE BOARD BECOMES THE MEADOW ═══════════════════════
   As the felt goes into the grass (and comes back out of it on the way up), a drift of small warm lights rises off
   where the lanes were: the change is something that happens, not a cut. A hundred points, moved on the CPU. */
const SPK = (() => {
  const n = 110, g = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const c = mkc(64, 64), x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.3, 'rgba(255,240,200,.6)'); gr.addColorStop(1, 'rgba(255,230,180,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  const map = new THREE.CanvasTexture(c); map.encoding = THREE.sRGBEncoding;
  const mat = new THREE.PointsMaterial({ map, size: 1.5, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.visible = false; pts.renderOrder = 60;
  const p = []; for (let i = 0; i < n; i++) p.push({ x: 0, z: 0, d: 0, l: 1, v: 1, w: 0, k: 1 });
  return { pts, p, t0: 0, on: false, fired: '' };
})();
scene.add(SPK.pts);
function sparkFire(now, way) {
  if (!GEO || (BV().ui && BV().ui.reduced && BV().ui.reduced())) return;
  const hw = GEO.bw / CM / 2, hd = GEO.bh / CM / 2;
  SPK.p.forEach(q => { q.x = (Math.random() * 2 - 1) * hw; q.z = (Math.random() * 2 - 1) * hd; q.d = Math.random() * .55; q.l = .9 + Math.random() * .9; q.v = 2.2 + Math.random() * 3.5; q.w = Math.random() * 6.28; q.k = .55 + Math.random() * .45; });
  SPK.t0 = now; SPK.on = true; SPK.pts.visible = true; SPK.fired = way;
}
function sparkStep(now) {
  if (!SPK.on) return;
  const t = (now - SPK.t0) / 1000, P = SPK.pts.geometry.attributes.position, Cc = SPK.pts.geometry.attributes.color, warm = [2.6, 2.1, 1.2];   /* brighter than white: the glow takes them */
  let live = false;
  SPK.p.forEach((q, i) => {
    const u = (t - q.d) / q.l;
    if (u < 0 || u > 1) { P.setXYZ(i, 0, -999, 0); Cc.setXYZ(i, 0, 0, 0); if (u < 0) live = true; return; }
    live = true;
    const a = Math.sin(u * Math.PI) * q.k;
    P.setXYZ(i, q.x + Math.sin(t * 2 + q.w) * .5 * u, .4 + q.v * (1 - Math.pow(1 - u, 2)), q.z + Math.cos(t * 1.7 + q.w) * .5 * u);
    Cc.setXYZ(i, warm[0] * a, warm[1] * a, warm[2] * a);
  });
  P.needsUpdate = true; Cc.needsUpdate = true;
  if (!live) { SPK.on = false; SPK.pts.visible = false; }
}

/* ══ THE CAMERA ═══════════════════════════════════════════════
   A pose is where the eye is, which way it looks, and its lens: f, the focal
   length in pixels, and where on the view the middle of the lens falls. The table's
   view of the board is one of these (it is a perspective too: CSS's), so the two can
   be blended — that is the way in and out.

   Standing in the field: the whole fight from a little above, the land and the sky
   behind it; wheel in and you come down lower and closer, toward what you point at.
   Drag and the ground goes with the pointer. Out past the whole fight, you rise back
   into the table. The camera breathes a little, side to side, as a battle camera does. */
const camera = new THREE.PerspectiveCamera(38, 1.5, .3, 9000);
const CAM = { zoom: 1, pan: 0, look: 0 };
const ZMAX = 4.2, ZOUT = .78, FOV = 50, PITCH0 = 17 * Math.PI / 180, PITCH1 = 6 * Math.PI / 180;
const view = { x: 0, y: 0, w: 1, h: 1 };
const FIT = { dist: 100, fz: 0 };
let LAY = null, GEO = null, idleT = 0;
const camState = () => {
  const z = clamp(CAM.zoom, .6, ZMAX), u = clamp(Math.log(Math.max(1, z)) / Math.log(ZMAX), 0, 1), e = smooth(u);
  return { z, u, e, pitch: lerp(PITCH0, PITCH1, e), dist: FIT.dist / z, lift: lerp(2.6, 3.6, e), shift: lerp(.16, .04, e) };
};
const fOf = () => (view.h / 2) / Math.tan(FOV * Math.PI / 360);
const Q = () => ({ pos: new THREE.Vector3(), quat: new THREE.Quaternion(), f: 1, px: 0, py: 0 });
const LOOK = new THREE.Matrix4(), UPV = new THREE.Vector3(0, 1, 0), TGT = new THREE.Vector3();
/* the pose standing in the field, from CAM (and the camera's breathing) */
function battlePose(out, breathe) {
  const s = camState();
  const fx = CAM.pan, fz = FIT.fz + CAM.look, fy = s.lift;
  const yaw = breathe ? Math.sin(idleT * .21) * .035 + Math.sin(idleT * .13 + 1) * .015 : 0;
  const pitch = s.pitch + (breathe ? Math.sin(idleT * .17) * .006 : 0);
  let ex = fx + Math.sin(yaw) * Math.cos(pitch) * s.dist, ez = fz + Math.cos(yaw) * Math.cos(pitch) * s.dist, ey = fy + Math.sin(pitch) * s.dist;
  /* never into anything: the eye keeps above the ground */
  ey = Math.max(ey, W.heightAt(ex, ez) + 1.6);
  out.pos.set(ex, ey, ez);
  LOOK.lookAt(out.pos, TGT.set(fx, fy, fz), UPV); out.quat.setFromRotationMatrix(LOOK);
  out.f = fOf(); out.px = view.w / 2; out.py = view.h * (.5 + s.shift);
  return out;
}
/* the table's view of the board, in this world: 81 says how the table's camera sees the board (board units to its own
   space, in window pixels); scaled out, that is a camera here. Null if the table is not showing it. */
const M4 = new THREE.Matrix4(), S4 = new THREE.Matrix4(), M3 = new THREE.Matrix3(), SC = new THREE.Vector3();
function tablePose(out) {
  const tv = BV().tableView && BV().tableView(); if (!tv) return null;
  M4.copy(tv.m).multiply(S4.makeScale(CM, CM, CM));
  const det = M3.setFromMatrix4(M4).determinant(), s = Math.cbrt(Math.abs(det));
  if (!(s > 0)) return null;
  const e = M4.elements; for (let i = 0; i < 15; i++) if (i % 4 !== 3) e[i] /= s;
  M4.invert().decompose(out.pos, out.quat, SC);
  out.f = tv.f; out.px = tv.px - view.x; out.py = tv.py - view.y;
  out.tilt = tv.tilt; out.yaw = tv.yaw;
  return out;
}
/* between two poses: round the ground point each is looking at, so the fight stays in the picture all the way */
const A1 = new THREE.Vector3(), A2 = new THREE.Vector3(), FW = new THREE.Vector3(), OF1 = new THREE.Vector3(), OF2 = new THREE.Vector3();
function aimOf(p, out) {
  FW.set(0, 0, -1).applyQuaternion(p.quat);
  const d = FW.y < -.05 ? clamp(-p.pos.y / FW.y, 1, 400) : 80;
  return out.copy(p.pos).addScaledVector(FW, d);
}
function blendPose(a, b, u, out) {
  aimOf(a, A1); aimOf(b, A2);
  OF1.copy(a.pos).sub(A1); OF2.copy(b.pos).sub(A2);
  const d1 = OF1.length(), d2 = OF2.length();
  const p1 = Math.asin(clamp(OF1.y / d1, -1, 1)), p2 = Math.asin(clamp(OF2.y / d2, -1, 1));
  const y1 = Math.atan2(OF1.x, OF1.z); let y2 = Math.atan2(OF2.x, OF2.z);
  if (y2 - y1 > Math.PI) y2 -= Math.PI * 2; if (y1 - y2 > Math.PI) y2 += Math.PI * 2;
  const d = Math.exp(lerp(Math.log(d1), Math.log(d2), u)), pit = lerp(p1, p2, u), yw = lerp(y1, y2, u);
  A1.lerp(A2, u);
  out.pos.set(A1.x + Math.sin(yw) * Math.cos(pit) * d, A1.y + Math.sin(pit) * d, A1.z + Math.cos(yw) * Math.cos(pit) * d);
  out.quat.copy(a.quat).slerp(b.quat, u);
  out.f = Math.exp(lerp(Math.log(a.f), Math.log(b.f), u)); out.px = lerp(a.px, b.px, u); out.py = lerp(a.py, b.py, u);
  return out;
}
/* put a pose on the camera: its place, and a lens with its middle wherever the pose says */
function usePose(p) {
  camera.position.copy(p.pos); camera.quaternion.copy(p.quat); camera.updateMatrixWorld(true);
  const n = camera.near, fa = camera.far, w = view.w, h = view.h;
  camera.projectionMatrix.set(2 * p.f / w, 0, 1 - 2 * p.px / w, 0, 0, 2 * p.f / h, 2 * p.py / h - 1, 0, 0, 0, -(fa + n) / (fa - n), -2 * fa * n / (fa - n), 0, 0, -1, 0);
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
}
function fitCamera() {
  if (!GEO) return;
  const hw = GEO.bw / CM / 2 + 2, hd = GEO.bh / CM / 2;
  const pts = [[-hw, 0, hd + 3], [hw, 0, hd + 3], [-hw, 9, -hd - 1], [hw, 9, -hd - 1], [0, 17, -hd - 5], [-hw, 0, -hd], [hw, 0, -hd]];
  const V = new THREE.Vector3(), mx = .92, ylo = -.9, yhi = .42, p = Q();
  const save = { zoom: CAM.zoom, pan: CAM.pan, look: CAM.look };
  CAM.zoom = 1; CAM.pan = 0; CAM.look = 0;
  const over = () => { usePose(battlePose(p, false)); let o = 0, lo = 9, hi = -9; pts.forEach(q => { V.set(q[0], q[1], q[2]).project(camera); o = Math.max(o, Math.abs(V.x) / mx, V.y > yhi ? V.y / yhi : 0, V.y < ylo ? V.y / ylo : 0); lo = Math.min(lo, V.y); hi = Math.max(hi, V.y); }); return { o, mid: (lo + hi) / 2 - (ylo + yhi) / 2 }; };
  for (let k = 0; k < 4; k++) {
    let lo = 20, hi = 900;
    for (let i = 0; i < 30; i++) { FIT.dist = (lo + hi) / 2; if (over().o > 1) lo = FIT.dist; else hi = FIT.dist; }
    FIT.dist = hi;
    FIT.fz -= over().mid * FIT.dist * .3;
  }
  CAM.zoom = save.zoom; CAM.pan = save.pan; CAM.look = save.look;
}
function clampCam() {
  CAM.zoom = clamp(CAM.zoom, ZOUT - .02, ZMAX);
  if (!GEO) return;
  const free = Math.max(0, 1 - 1 / Math.max(1, CAM.zoom)), hw = GEO.bw / CM / 2, hd = GEO.bh / CM / 2;
  CAM.pan = clamp(CAM.pan, -(hw + 6) * free, (hw + 6) * free); CAM.look = clamp(CAM.look, -(hd + 8) * free, hd * free);
}
const RAY = new THREE.Raycaster(), NDC = new THREE.Vector2(), PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), HIT = new THREE.Vector3();
function groundAt(sx, sy) {
  NDC.set((sx - view.x) / view.w * 2 - 1, -((sy - view.y) / view.h) * 2 + 1);
  RAY.setFromCamera(NDC, camera);
  return RAY.ray.intersectPlane(PLANE, HIT) ? { x: HIT.x, z: HIT.z } : null;
}
const POSE = Q(), TMPP = Q(), FROM = Q(), TBL = Q();
let mode = 'off', modeT0 = 0, grow = 1, lean = 0, growFrom = 0, hold = null, over = null;
const DIVE = 1450, RISE = 1150;
function zoomAt(n, sx, sy) {
  if (mode === 'rise') { if (n > 0) setOn(true); return 'ok'; }
  const want = CAM.zoom * Math.pow(1.12, n);
  if (n < 0 && want < ZOUT && mode === 'in') return 'out';
  const a = sx != null && mode === 'in' ? groundAt(sx, sy) : null;
  CAM.zoom = clamp(want, ZOUT, ZMAX); clampCam();
  if (a) { usePose(battlePose(TMPP, true)); const b = groundAt(sx, sy); if (b) { CAM.pan += a.x - b.x; CAM.look += a.z - b.z; clampCam(); } }
  return 'ok';
}
function dragBy(st, dx, dy) {
  if (mode !== 'in') return;
  const s = camState(), wpp = s.dist / fOf();
  CAM.pan = st.pan - dx * wpp; CAM.look = st.look - dy * wpp / Math.max(.3, Math.sin(s.pitch));
  clampCam();
}
const PV = new THREE.Vector3();
const proj = {
  toScreen(x, y, z) {
    PV.set(x / CM, y / CM, z / CM).applyMatrix4(camera.matrixWorldInverse);
    if (PV.z > -camera.near) return null;
    PV.applyMatrix4(camera.projectionMatrix);
    return { x: view.x + (PV.x * .5 + .5) * view.w, y: view.y + (-PV.y * .5 + .5) * view.h };
  },
  boardAt(sx, sy) { const p = groundAt(sx, sy); return p ? { x: p.x * CM, z: p.z * CM } : null; },
  eye() { return { x: camera.position.x * CM, y: camera.position.y * CM, z: camera.position.z * CM }; },
  /* how far the figures still stand as they do on the table (tipped back to its camera): 1 at the handover, 0 in the field */
  lean: () => lean
};
const PW = new THREE.Vector3();
function onScreen(x, y, z) {
  PW.set(x, y, z).applyMatrix4(camera.matrixWorldInverse); if (PW.z > -camera.near) return null;
  PW.applyMatrix4(camera.projectionMatrix);
  return { x: view.x + (PW.x * .5 + .5) * view.w, y: view.y + (-PW.y * .5 + .5) * view.h };
}

/* ══ HOW MUCH IT DRAWS ════════════════════════════════════════
   As a game does: full quality to begin with, and if the machine cannot keep up, a little less smoothing of the
   edges first, then a little less resolution, until it moves smoothly. Measured over a second and a half at a
   time; it climbs back only when there is plenty of room, and never back to a level that has already failed. */
const QL = [{ samples: 4, scale: 1 }, { samples: 4, scale: .9 }, { samples: 4, scale: .82 }, { samples: 2, scale: .8 }];
const QUAL = { level: 0, floor: 0, t0: 0, n: 0, ms: 0, good: 0 };
function qualityTick(now, dtMs) {
  if (mode !== 'in' || dtMs > 250) { QUAL.t0 = 0; return; }
  if (!QUAL.t0) { QUAL.t0 = now; QUAL.n = 0; QUAL.ms = 0; return; }
  QUAL.n++; QUAL.ms += dtMs;
  if (now - QUAL.t0 < 1500) return;
  const avg = QUAL.ms / QUAL.n; QUAL.t0 = now; QUAL.n = 0; QUAL.ms = 0;
  if (avg > 1000 / 36 && QUAL.level < QL.length - 1) { QUAL.floor = Math.max(QUAL.floor, QUAL.level + 1); QUAL.level++; QUAL.good = 0; size(); }
  else if (avg < 1000 / 57 && QUAL.level > 0) { if (++QUAL.good >= 3 && QUAL.level - 1 >= QUAL.floor - 0) { QUAL.level--; QUAL.good = 0; size(); } }
  else QUAL.good = 0;
}

/* ══ SIZE ═════════════════════════════════════════════════════ */
function size() {
  const vp = document.getElementById('vp'), rr = vp && vp.getBoundingClientRect(), ok = rr && rr.width > 10 && rr.height > 10;
  view.x = ok ? Math.round(rr.left) : 0; view.y = ok ? Math.round(rr.top) : 0;
  view.w = ok ? Math.round(rr.width) : window.innerWidth; view.h = ok ? Math.round(rr.height) : window.innerHeight;
  const pr = PR(); renderer.setPixelRatio(pr); renderer.setSize(view.w, view.h, false);
  Object.assign(cv.style, { left: view.x + 'px', top: view.y + 'px', width: view.w + 'px', height: view.h + 'px' });
  const q = QL[QUAL.level], sc = q.scale;
  const Wd = Math.max(4, Math.round(view.w * pr * sc)), Hd = Math.max(4, Math.round(view.h * pr * sc));
  if (rt.scene.samples != null && rt.scene.samples !== q.samples) { rt.scene.samples = q.samples; rt.scene.dispose(); }
  rt.scene.setSize(Wd, Hd); rt.bA.setSize(Wd >> 2, Hd >> 2); rt.bB.setSize(Wd >> 2, Hd >> 2);
  camera.aspect = view.w / view.h;
  finishMat.uniforms.uAspect.value = camera.aspect;
  if (GEO) fitCamera();
}
window.addEventListener('resize', () => { if (mode !== 'off') size(); });
if (window.ResizeObserver) { const vp = document.getElementById('vp'); if (vp) new ResizeObserver(() => { if (mode !== 'off') size(); }).observe(vp); }

/* ══ MAKING THE PLACE FOR THIS FIGHT ══════════════════════════ */
let dressed = '';
/* dressGen builds the meadow a piece at a time (yielding between pieces); dress() runs it straight through. Only the
   newest build counts: one started while another was half done makes the old one give up. */
let buildTok = 0;
function dress() { const it = dressGen(); let r; do { r = it.next(); } while (!r.done); return r.value; }
function* dressGen() {
  const s = BV().scene && BV().scene(), g = BV().geo && BV().geo();
  if (!s || !g) return false;
  const key = (forced != null ? forced : s.id) + ':' + g.bw + 'x' + g.bh;
  GEO = g;
  if (key === dressed) return true;
  const tok = ++buildTok, it = W.buildGen(hashStr(String(forced != null ? forced : s.id || 'fight')), g.bw / CM, g.bh / CM);
  let r;
  while (!(r = it.next()).done) { yield; if (tok !== buildTok) return false; }
  LAY = r.value; dressed = key; warmed = '';
  /* the banner stands at the Line, behind the last of the fight */
  const nEn = g.lines.filter(l => l.side === 'en').length, lx = (-g.bw / 2 + (g.n - nEn) * BT().G.LW) / CM;
  banner.position.set(lx, W.heightAt(lx, -g.bh / CM / 2 - 4.5), -g.bh / CM / 2 - 4.5);
  layGlows(g);
  if (!orb && BV().rail && BV().rail.newOrb) { orb = BV().rail.newOrb(); orb.g.scale.setScalar(.75); stage.add(orb.g); }
  fitCamera();
  return true;
}

/* ══ GETTING READY BEFORE ANYONE ASKS ═══════════════════════
   grumkata: "it's really laggy on load". Going in the first time used to build the whole meadow (three seconds, then
   six tenths once the path was made quick) and then make every surface's shader on the card (another second) — in
   the middle of the zoom. So as soon as a fight is on the table it is got ready while nobody is looking, a little at a
   time in the moments the table is idle: the meadow built a piece at a time, every surface's shader made a few at a
   time, then one picture drawn out of sight with the figures standing in it (their pictures, the shadows and the
   finishing passes all sent to the card). Going in after that is only the zoom. */
let warmed = '';
function* prepare() {
  if (mode !== 'off') return;
  const d = dressGen(); let r;
  while (!(r = d.next()).done) { yield; if (mode !== 'off') return; }
  if (!r.value || warmed === dressed) return;
  const key = dressed;
  yield;
  if (mode !== 'off' || key !== dressed) return;
  size();
  battlePose(POSE, false); usePose(POSE);
  W.frame(0, 0, camera);
  /* the meadow's surfaces, a few at a time: the rest are set aside for a moment, in the same breath */
  const live = W.live, kids = live.children.slice();
  for (let i = 0; i < kids.length; i += 3) {
    if (mode !== 'off' || key !== dressed) { live.children = kids; return; }
    live.children = kids.slice(i, i + 3);
    try { renderer.compile(scene, camera); } finally { live.children = kids; }
    yield;
  }
  if (mode !== 'off' || key !== dressed) return;
  /* last, with the figures and the board standing in it: their surfaces made, then one picture drawn out of sight */
  BV().warmIn(stage, () => { W.setGrow(1); renderer.compile(scene, camera); });
  yield;
  if (mode !== 'off' || key !== dressed) return;
  BV().warmIn(stage, () => { W.setGrow(1); renderer.shadowMap.needsUpdate = true; render(1); });
  warmed = key;
}
const idle = fn => (window.requestIdleCallback ? window.requestIdleCallback(fn, { timeout: 1200 }) : setTimeout(fn, 50));
let prepIt = null;
function preload() {
  if (prepIt || mode !== 'off') return;
  prepIt = prepare();
  const step = () => {
    if (!prepIt) return;
    let r; try { r = prepIt.next(); } catch (e) { console.warn('[monarchy] getting the field ready:', e); r = { done: true }; }
    if (r.done) { prepIt = null; return; }
    idle(step);
  };
  idle(step);
}

/* ══ WHAT IS DOM: THE WAY BACK, THE BANNER'S AND THE ORB'S HANDLES ══ */
const veil = document.createElement('div'); veil.className = 'fld-veil'; document.body.appendChild(veil);
const back = document.createElement('button'); back.className = 'fld-back'; back.type = 'button';
back.title = 'Back to the table (Esc, or wheel out)';
back.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M10 6 4 12l6 6M4 12h11a5 5 0 0 1 5 5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Back to the table</span>';
back.addEventListener('click', () => { if (window.Table3D && window.Table3D.leaveField) window.Table3D.leaveField(true); else setOn(false); });
document.body.appendChild(back);
let turnHit = null, manaLbl = null, manaHit = null;
function handles() {
  if (turnHit) return;
  const ov = BV().overlay();
  turnHit = document.createElement('div'); turnHit.className = 'bt-hit bt-rbtn fld-turn';
  turnHit.dataset.tip = 'The turn|Click for the next turn (Space).';
  turnHit.addEventListener('click', () => BV().ui && BV().ui.turn && BV().ui.turn());
  turnHit.addEventListener('pointerenter', () => { BAN.hot = 1; }); turnHit.addEventListener('pointerleave', () => { BAN.hot = 0; });
  turnHit.addEventListener('wheel', ev => BV().wheelThrough(ev), { passive: false });
  manaLbl = document.createElement('div'); manaLbl.className = 'bt-manav fld-manav'; manaLbl.innerHTML = '<b>0</b><i>Mana</i>';
  manaLbl.addEventListener('click', () => BV().ui && BV().ui.editMana && BV().ui.editMana());
  manaLbl.addEventListener('wheel', ev => BV().wheelThrough(ev), { passive: false });
  manaHit = document.createElement('div'); manaHit.className = 'bt-hit fld-dish';
  manaHit.dataset.tip = 'Mana in the air|Click, and type how much.';
  manaHit.addEventListener('click', () => BV().ui && BV().ui.editMana && BV().ui.editMana());
  manaHit.addEventListener('wheel', ev => BV().wheelThrough(ev), { passive: false });
  [manaHit, manaLbl, turnHit].forEach(e => { e.style.display = 'none'; ov.appendChild(e); });
}
const box = (el, x, y, w, h, z) => { el.style.display = ''; el.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)'; el.style.width = Math.round(w) + 'px'; el.style.height = Math.round(h) + 'px'; if (z != null) el.style.zIndex = z; };
const hideHandles = () => [turnHit, manaHit, manaLbl].forEach(e => { if (e) e.style.display = 'none'; });

/* ══ ONE FRAME ════════════════════════════════════════════════ */
let alive = false, t0 = 0, lastTs = 0, solid = false;
const WP = new THREE.Vector3(), KEYDIR = new THREE.Vector3(), FILLDIR = new THREE.Vector3(), FEET = [];
function frame() {
  if (!alive) return;
  requestAnimationFrame(frame);
  const now = performance.now();
  if (!t0) t0 = now;
  const rawMs = lastTs ? now - lastTs : 16;
  const t = (now - t0) / 1000, dt = Math.min(.1, lastTs ? (now - lastTs) / 1000 : .016); lastTs = now;
  if (!hostOK) return;
  dress();
  qualityTick(now, rawMs);
  const V = BV(), A = V.A, gm = BT().isGM();
  idleT += dt * (V.drag && V.drag.active ? 0 : 1);
  /* where the camera is: going in, standing in it, or going back up into the table */
  let u = mode === 'dive' ? clamp((now - modeT0) / DIVE, 0, 1) : mode === 'rise' ? clamp((now - modeT0) / RISE, 0, 1) : 1;
  if (hold != null && (mode === 'dive' || mode === 'rise')) u = Math.min(hold, .999);
  battlePose(POSE, true);
  if (mode === 'dive') {
    const e = 1 - Math.pow(1 - u, 2.2);
    blendPose(FROM, POSE, e, TMPP); usePose(TMPP);
    grow = Math.max(growFrom, smooth(clamp(u / .78, 0, 1)));
    lean = Math.min(lean, 1 - smooth(clamp(u / .42, 0, 1)));
    if (u >= 1) { mode = 'in'; grow = 1; lean = 0; }
  } else if (mode === 'rise') {
    const tp = tablePose(TBL) ? TBL : FROM, e = 1 - Math.pow(1 - u, 2.2);
    blendPose(FROM, tp, e, TMPP); usePose(TMPP);
    grow = Math.min(growFrom, 1 - smooth(clamp(u / .9, 0, 1)));
    lean = smooth(clamp((u - .45) / .55, 0, 1));
  } else if (over) {
    /* the harness's free camera: an eye and a point to look at */
    POSE.pos.set(over[0], over[1], over[2]); LOOK.lookAt(POSE.pos, TGT.set(over[3], over[4], over[5]), UPV); POSE.quat.setFromRotationMatrix(LOOK); POSE.py = view.h / 2;
    usePose(POSE);
  } else {
    const sk = (V.shakeNow || 0) / CM * 1.2;
    if (sk) { POSE.pos.x += sk * (Math.random() - .5); POSE.pos.y += sk * (Math.random() - .5); }
    usePose(POSE);
  }
  W.setGrow(grow);
  const lit = smooth(clamp(grow * 1.4, 0, 1));
  finishMat.uniforms.uLook.value = lit;
  if (LAY && LAY.tod && LAY.tod.grade) finishMat.uniforms.uGrade.value.fromArray(LAY.tod.grade);
  /* the table's light, fixed to the view as 81 fixes it, going out as the day comes up */
  KEYDIR.set(-500, 900, 800).normalize().applyQuaternion(camera.quaternion); tableKey.position.copy(camera.position).addScaledVector(KEYDIR, 100); tableKey.target.position.copy(camera.position);
  FILLDIR.set(700, 300, 400).normalize().applyQuaternion(camera.quaternion); tableFill.position.copy(camera.position).addScaledVector(FILLDIR, 100); tableFill.target.position.copy(camera.position);
  tableHemi.position.set(0, 1, 0).applyQuaternion(camera.quaternion);
  tableKey.intensity = 1.25 * (1 - lit); tableFill.intensity = .4 * (1 - lit); tableHemi.intensity = 1 - lit;

  /* the board the table was showing, sinking into the grass as the meadow comes up round it */
  const sink = smooth(clamp((grow - .12) / .35, 0, 1));
  if (V.boardShow) V.boardShow(sink);
  if (mode === 'dive' && sink > .03 && SPK.fired !== 'in') sparkFire(now, 'in');
  if (mode === 'rise' && sink < .85 && SPK.fired !== 'out') sparkFire(now, 'out');
  sparkStep(now);
  /* the grass is pressed down where the figures stand */
  if (W.setFeet && V.pcs) {
    FEET.length = 0;
    V.pcs.forEach(pv => { if (!pv.g || !pv.g.visible || pv.dragX != null) return; const rx = (pv.form ? pv.hw : pv.R) / CM * 1.05, rz = (pv.form ? Math.max(pv.hd, pv.R * .6) : pv.R) / CM * 1.05; FEET.push([pv.x / CM, pv.z / CM, Math.max(.8, rx), Math.max(.8, rz)]); });
    W.setFeet(FEET);
  }
  V.fieldTick(now);
  W.frame(t, dt, camera);
  /* the turn */
  const said = bannerText();
  if (said !== BAN.said) { const first = BAN.said == null; BAN.said = said; if (first) { drawBanner(said); BAN.shown = said; } else BAN.flip = now; }
  if (BAN.flip) {
    const fu = (now - BAN.flip) / 700;
    if (fu >= .5 && BAN.shown !== BAN.said) { drawBanner(BAN.said); BAN.shown = BAN.said; }
    BAN.cloth.rotation.y = Math.sin(clamp(fu, 0, 1) * Math.PI) * Math.PI * (fu < .5 ? .5 : -.5) * (fu < .5 ? fu * 2 : (1 - fu) * 2);
    if (fu >= 1) { BAN.flip = 0; BAN.cloth.rotation.y = 0; }
  }
  BAN.glow = lerp(BAN.glow, BAN.hot && gm ? 1 : 0, .2);
  BAN.mat.emissive.setRGB(.42 + .45 * BAN.glow, .42 + .38 * BAN.glow, .42 + .1 * BAN.glow);
  banner.scale.setScalar(Math.max(.001, smooth(clamp((grow - .25) / .5, 0, 1))));
  /* the orb, over the allies' back */
  const mana = A ? A.options.mana : 0;
  if (orb && GEO) {
    if (mana !== orbMana) { if (orbMana >= 0) orb.popAt = now; orbMana = mana; }
    const G = BT().G, ox = -GEO.bw / 2 + G.LW * .5, oy = 240 + Math.sin(t * 1.1) * 8, oz = -GEO.bh / 2 - 40;
    orb.g.position.set(ox, oy, oz); orb.g.visible = grow > .5;
    const lv = orb.frame(now, mana);
    orbLight.position.set(ox / CM, oy / CM, oz / CM); orbLight.intensity = (.2 + 1.6 * lv) * grow; orbLight.color.copy(orb.core.material.color);
  }
  stepGlows();
  handles();
  if (A && GEO && mode === 'in') {
    BAN.cloth.updateMatrixWorld();
    const corner = (cu, cvv) => { WP.set(cu * BAN.w / 2, -BAN.h * (cvv + 1) / 2, 0); BAN.cloth.localToWorld(WP); return onScreen(WP.x, WP.y, WP.z); };
    const cs4 = [corner(-1, -1), corner(1, -1), corner(-1, .9), corner(1, .9)];
    if (gm && cs4.every(Boolean)) { const xs = cs4.map(p => p.x), ys = cs4.map(p => p.y); box(turnHit, Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 6); }
    else turnHit.style.display = 'none';
    const o = orb ? onScreen(orb.g.position.x / CM, orb.g.position.y / CM, orb.g.position.z / CM) : null;
    const o2 = orb ? onScreen(orb.g.position.x / CM + 3, orb.g.position.y / CM, orb.g.position.z / CM) : null;
    if (o && o2) {
      const w = clamp(Math.abs(o2.x - o.x) * 1.6, 40, 140);
      if (gm) box(manaHit, o.x - w / 2, o.y - w / 2, w, w, 7); else manaHit.style.display = 'none';
      const editing = V.rail && V.rail.input;
      manaLbl.style.display = editing ? 'none' : '';
      manaLbl.style.pointerEvents = gm ? '' : 'none';
      if (manaLbl.firstChild.textContent !== String(mana)) manaLbl.firstChild.textContent = mana;
      manaLbl.style.transform = 'translate(' + Math.round(o.x) + 'px,' + Math.round(o.y) + 'px) translate(-50%,-56%) scale(' + clamp(w / 90, .8, 1.4).toFixed(2) + ')';
      manaLbl.style.zIndex = 8;
      if (editing) editing.style.transform = 'translate(' + Math.round(o.x) + 'px,' + Math.round(o.y) + 'px) translate(-50%,-50%)';
    } else { manaHit.style.display = 'none'; manaLbl.style.display = 'none'; }
  } else hideHandles();
  back.style.left = (view.x + 16) + 'px'; back.style.top = (view.y + view.h - 54) + 'px'; back.style.opacity = smooth(clamp((grow - .4) / .5, 0, 1)).toFixed(2);
  /* the light's own camera follows where you look, so the shadows near you are sharp */
  render(lit);
  /* first frame drawn: let it show (the table's last picture of the board is still under it, the same picture) */
  if (mode === 'dive' && cv.style.opacity !== '1') { cv.style.transition = 'opacity 160ms linear'; cv.style.opacity = '1'; }
  if (mode === 'dive' && !solid && now - modeT0 > 220) { solid = true; document.body.classList.add('field-solid'); }
  if (mode === 'rise' && u >= 1) handBack();
}
function render(lit) {
  if ((shadowTick++ & 1) === 0 || mode !== 'in') renderer.shadowMap.needsUpdate = true;
  renderer.setRenderTarget(rt.scene); renderer.clear(); renderer.render(scene, camera);
  if (lit > .01) {
    brightMat.uniforms.tIn.value = rt.scene.texture; pass(brightMat, rt.bA);
    for (let i = 0; i < 2; i++) {
      blurMat.uniforms.tIn.value = rt.bA.texture; blurMat.uniforms.uDir.value.set((1 + i) / rt.bA.width, 0); pass(blurMat, rt.bB);
      blurMat.uniforms.tIn.value = rt.bB.texture; blurMat.uniforms.uDir.value.set(0, (1 + i) / rt.bA.height); pass(blurMat, rt.bA);
    }
  }
  const U = finishMat.uniforms;
  U.tScene.value = rt.scene.texture; U.tBloom.value = rt.bA.texture;
  pass(finishMat, null);
}

/* ══ GOING IN, AND COMING BACK OUT ════════════════════════════ */
let hostOK = false, fadeT = 0;
const reduced = () => !!(BV() && BV().ui && BV().ui.reduced && BV().ui.reduced());
function setOn(v) {
  v = !!v;
  if (v) {
    if (mode === 'dive' || mode === 'in') return;
    if (!(BV() && BV().isUp && BV().isUp())) return;
    enter();
  } else {
    if (mode === 'off' || mode === 'rise') return;
    rise();
  }
}
function enter() {
  clearTimeout(fadeT);
  size();
  const was = mode;
  if (was === 'off') {
    /* where you were pointing on the board is where you come down */
    const vr = view, aim = BV().boardAt(lastPtr ? lastPtr.x : vr.x + vr.w / 2, lastPtr ? lastPtr.y : vr.y + vr.h / 2);
    if (!dress()) return;
    const from = tablePose(FROM);
    hostOK = BV().hostIn(stage);
    if (!hostOK) return;
    CAM.zoom = 1.2; CAM.pan = 0; CAM.look = 0;
    if (aim) { const hw = GEO.bw / CM / 2, hd = GEO.bh / CM / 2; CAM.pan = clamp(aim.x / CM, -hw, hw) * .4; CAM.look = clamp(aim.z / CM, -hd, hd) * .3; }
    clampCam();
    if (!from) { battlePose(FROM, false); FROM.pos.y += 40; }
    grow = 0; growFrom = 0; lean = 1;
    cv.style.transition = 'none'; cv.style.opacity = '0'; cv.style.display = 'block';
  } else {
    /* turned round on the way back up: go back down from wherever the camera is */
    FROM.pos.copy(camera.position); FROM.quat.copy(camera.quaternion); FROM.f = TMPP.f; FROM.px = TMPP.px; FROM.py = TMPP.py;
    growFrom = grow;
  }
  mode = reduced() ? 'in' : 'dive'; modeT0 = performance.now(); QUAL.floor = 0;
  if (mode === 'in') { grow = 1; lean = 0; cv.style.opacity = '1'; }
  solid = mode === 'in';
  document.body.classList.add('field-on'); if (solid) document.body.classList.add('field-solid');
  if (window.__hudRender) window.__hudRender();
  t0 = t0 || 0; lastTs = 0;
  if (!alive) { alive = true; requestAnimationFrame(frame); }
}
function rise() {
  /* from wherever the camera is now, up into the table's view (23-table3d.js has put the table there, close over the
     board, under this canvas) */
  FROM.pos.copy(camera.position); FROM.quat.copy(camera.quaternion);
  const cur = mode === 'dive' ? TMPP : POSE; FROM.f = cur.f; FROM.px = cur.px; FROM.py = cur.py;
  growFrom = grow;
  mode = 'rise'; modeT0 = performance.now();
  hideHandles(); BAN.hot = 0;
  document.body.classList.remove('field-solid'); solid = false;
  if (reduced()) handBack();
}
/* the board goes back to the table: the last picture stays up over it for a moment, fading, and it is the same picture */
function handBack() {
  mode = 'off'; alive = false;
  BV().hostOut(); hostOK = false;
  document.body.classList.remove('field-on', 'field-solid');
  if (window.__hudRender) window.__hudRender();
  hideHandles();
  cv.style.transition = 'opacity 220ms linear'; cv.style.opacity = '0';
  fadeT = setTimeout(() => { if (mode === 'off') cv.style.display = 'none'; }, 260);
  if (onOut) { const f = onOut; onOut = null; f(); }
}
let onOut = null, lastPtr = null;
window.addEventListener('wheel', e => { lastPtr = { x: e.clientX, y: e.clientY }; }, { passive: true, capture: true });

return (F = { on: () => mode === 'dive' || mode === 'in' || mode === 'rise', set: (v, done) => { if (!v && done) onOut = done; setOn(v); }, preload, ready: () => !!warmed && warmed === dressed,
  cam: CAM, place: () => { clampCam(); }, zoomAt, dragBy, proj,
  live: () => hostOK,
  clock: () => ({ t: W.uniforms.uT.value, fade: hostOK ? 1 : 0 }),
  /* for the harness: what this fight's meadow is, and what the camera sees */
  peek: () => ({ mode, grow, lean, quality: QUAL.level, zoom: CAM.zoom, pan: CAM.pan, look: CAM.look, fit: FIT.dist, eye: camera.position.toArray().map(v => +v.toFixed(2)),
                 tod: LAY && LAY.tod && LAY.tod.el, ruin: LAY && LAY.ruinSide, ruinAt: LAY && LAY.ruin, crag: LAY && LAY.crag, fence: LAY && LAY.fence, bridge: LAY && LAY.bridge, sign: LAY && LAY.sign, log: LAY && LAY.log && { x: LAY.log.x, z: LAY.log.z }, grass: LAY && LAY.grassN, far: LAY && LAY.farN, lite: LAY && LAY.liteN, gl2: isGL2, half: TYPE === THREE.HalfFloatType }),
  knobs: { scene, world: W, finish: finishMat.uniforms, camera, CAM, banner, renderer, rt, render, cv, SPK, fire: () => sparkFire(performance.now(), 'x'), stage, usePose, battlePose, POSE, hold: v => { hold = v; }, quality: l => { if (l == null) return QUAL.level; QUAL.level = l; QUAL.floor = 99; size(); }, over: v => { over = v || null; }, redress: id => { dressed = ''; if (id != null) forced = id; } } });
}
let forced = null;

/* the handle the rest of the app holds. Asking whether the field is up, or putting it away, never builds it. */
/* a fight on the table: get its field ready, a moment after the table has settled (not under an automated browser —
   the test runs draw in software, where this is seconds of work nobody asked for; the harness calls it with force) */
let preT = 0;
window.__field = {
  preload: force => {
    if (!force && navigator.webdriver) return;
    clearTimeout(preT); preT = setTimeout(() => boot().preload(), force ? 0 : 1500);
  },
  ready: () => !!F && F.ready(),
  on: () => !!F && F.on(),
  set: (v, done) => { if (!v && !F) { if (done) done(); return; } boot().set(v, done); },
  pick: () => null,                               /* the figures are picked by their own hit areas, as on the table */
  aim: () => {},
  place: () => { if (F) F.place(); },
  zoomAt: (n, x, y) => (F ? F.zoomAt(n, x, y) : 'ok'),
  dragBy: (st, dx, dy) => { if (F) F.dragBy(st, dx, dy); },
  clock: () => (F ? F.clock() : null),
  peek: () => (F ? F.peek() : null),
  knobs: () => (F ? F.knobs : null),
  get proj() { return F && F.live() ? F.proj : null; },
  get cam() { return boot().cam; }
};
})();
