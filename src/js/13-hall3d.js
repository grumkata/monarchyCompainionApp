/* ══════════════════════════════════════════════════════════════
   THE HALL — real geometry, real cloth, real dark.

   The castle is the Castle Pack from Assets/, a 26-piece modular kit baked to
   vertex arrays by bake_castle.py. The kit ships as a parts sheet, so the hall
   is COMPOSED here: an arcade down both sides, a gate at the end, drum towers
   beyond it, and nothing at all above — the ceiling is darkness, which is
   cheaper and better than modelling a roof nobody looks at.

   The banners are subdivided planes with a wind in the vertex shader. This is
   the thing SVG turbulence could not do: a real travelling wave running down
   the cloth, pinned at the rail, amplitude growing toward the hem, with the
   shading derived from the wave's own slope so the folds catch the light. The
   earlier version displaced the whole banner by isotropic noise, which is why
   it read as jelly rather than cloth.
══════════════════════════════════════════════════════════════ */
(function(root){
'use strict';

const V = { renderer:null, scene:null, cam:null, banners:[], t:0, torch:null,
            ray:new THREE.Raycaster(), pointer:new THREE.Vector2(-9,-9),
            aim:{x:0,y:0}, cur:{x:0,y:0}, hot:-1, onPick:null, reduced:false,
            locked:false };

/* ── materials for the kit ────────────────────────────────── */
function texture(dataURL, rep){
  const t = new THREE.Texture();
  const im = new Image();
  im.onload = () => { t.image = im; t.needsUpdate = true; };
  im.src = dataURL;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (rep) t.repeat.set(rep[0], rep[1]);
  return t;
}
let MAT;
function materials(){
  const C = root.CASTLE;
  MAT = {
    Walls: new THREE.MeshStandardMaterial({ map:texture(C.tex.Walls), color:0x585a5e,
             roughness:.97, metalness:.02 }),
    Iron:  new THREE.MeshStandardMaterial({ map:texture(C.tex.Iron), color:0x6a6a70,
             roughness:.55, metalness:.75 }),
    Glass_window: new THREE.MeshStandardMaterial({ map:texture(C.tex.Window_1),
             color:0xffbe74, roughness:.35, emissive:0xff9a38, emissiveIntensity:.45 })
  };
}

/* ── one part of the kit, as a mesh ───────────────────────── */
function part(id){
  const p = root.CASTLE.parts[id];
  const g = new THREE.Group();
  p.prims.forEach(pr => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pr.p, 3));
    geo.setAttribute('normal',   new THREE.Float32BufferAttribute(pr.n, 3));
    geo.setAttribute('uv',       new THREE.Float32BufferAttribute(pr.u, 2));
    geo.setIndex(pr.i);
    g.add(new THREE.Mesh(geo, MAT[pr.m] || MAT.Walls));
  });
  g.userData.size = p.size;
  return g;
}
function place(id, x, y, z, ry, s){
  const g = part(id);
  g.position.set(x, y, z);
  if (ry) g.rotation.y = ry;
  if (s)  g.scale.setScalar(s);
  V.scene.add(g);
  return g;
}

/* Where things go. When a built hall is present these are measured off it —
   the camera sits ON the lamp the author placed, pushed a little way in, and
   the banners hang under the corridor ceiling. Everything else is the
   stand-in's own numbers. */
const L = (function(){
  const C = root.CASTLE || {};
  if (!C.scene) return { built:false,
    cam:[0,2.55,13.4], look:[0,2.9,-8], rail:4.35, railZ:4.6, railW:9.4,
    spread:8.0, bw:1.16 };
  const m = (C.marks && C.marks.HemisphereLight) || [0, 4.4, 13.8];
  return { built:true,
    cam:[m[0], m[1] - 0.20, m[2] - 0.9],  /* on the lamp, a step in front of it */
    /* aimed high enough that the rail the banners hang from is in the frame —
       you should be able to see what they are hanging from */
    look:[0, m[1] + 1.05, -9],
    /* The corridor's inside faces are at x = ±3.0 and the roof is at 6.9. The
       rod is LONGER than the gap so both ends bury themselves in the stone —
       a rod that stops short with a knob on each end reads as a curtain pole.
       Five banners 1.19 wide on a 4.80 spread put the outer edges at x ±2.995,
       flush with the stone, with the cloth all but touching between them: the
       row is a wall of banners, not five flags with gaps of dark between. */
    rail:6.30, railZ:3.6, railW:6.60,
    spread:4.80, bw:1.19 };
})();

/* a finished castle, exported as one glb and flattened to world space by
   bake_castle.py. When one is present it replaces the composed arcade
   entirely — see claude/building-the-hall.md for how it is made. */
function builtHall(){
  const S = root.CASTLE.scene;
  Object.keys(S).forEach(name => {
    const m = S[name];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(m.p, 3));
    geo.setAttribute('normal',   new THREE.Float32BufferAttribute(m.n, 3));
    geo.setAttribute('uv',       new THREE.Float32BufferAttribute(m.u, 2));
    geo.setIndex(m.i);
    V.scene.add(new THREE.Mesh(geo, MAT[name] || MAT.Walls));
  });
}

/* ══ COMPOSING THE HALL ═══════════════════════════════════════ */
function hall(){
  const R = Math.PI/2, D = -4;        /* one bay is four units deep */
  const bays = 8;

  /* the floor, and it is not a flat fill either — the wall texture reads as
     flagstones at this scale and takes the torchlight properly */
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(48, 90),
    new THREE.MeshStandardMaterial({ map:texture(root.CASTLE.tex.Walls, [12, 22]),
      color:0x322e27, roughness:1 }));
  floor.rotation.x = -R; floor.position.z = -18;
  V.scene.add(floor);

  if (root.CASTLE.scene){ builtHall(); rail(); torches(); return; }

  for (let i = 0; i < bays; i++){
    const z = 6 + i*D;
    /* the arcade: a wall pierced by two arches, both sides, facing in */
    place('p23', -6.6, 0, z, 0);
    place('p23',  6.6, 0, z, 0);
    /* a second storey, and a parapet above that */
    place('p11', -6.6, 2.1, z, 0);
    place('p11',  6.6, 2.1, z, 0);
    place('p11', -6.6, 4.2, z, 0);
    place('p11',  6.6, 4.2, z, 0);
    place('p13', -6.8, 6.3, z, 0, .9);
    place('p13',  6.8, 6.3, z, 0, .9);
    /* windows in the upper storey — these are what the light comes through */
    if (i % 2 === 1){
      place('p25', -6.15, 2.55, z - 1.1, R, 1.05);
      place('p25',  6.15, 2.55, z + 1.1, R, 1.05);
    }
  }

  /* the far end: a gate, barred, with the night behind it */
  place('p16', -2.4, 0, -27.0, R, 1.9);
  place('p16',  2.4, 0, -27.0, R, 1.9);
  place('p08',  0,   0, -26.7, R, 2.6);        /* the portcullis */
  place('p13', -4.2, 3.6, -27.0, R, 1.3);
  place('p13',  4.2, 3.6, -27.0, R, 1.3);

  /* drum towers beyond it, with cone roofs, read as silhouette against the sky */
  [[-9.8,-30.0],[9.8,-30.0]].forEach(([x,z]) => {
    place('p14', x, 0,   z, 0, 2.1);
    place('p14', x, 4.2, z, 0, 2.1);
    place('p07', x, 8.4, z, 0, 2.1);
  });

  rail();
}

function rail(){
  const R = Math.PI/2;
  if (!L.built){
    const roof = new THREE.Mesh(new THREE.PlaneGeometry(30, 80),
      new THREE.MeshBasicMaterial({ color:0x080a0f }));
    roof.rotation.x = R; roof.position.set(0, 8.6, -18);
    V.scene.add(roof);
  }
  /* The rod the banners hang from. Iron, not polished brass: at metalness .85
     a thin cylinder under two point lights catches a hard specular line down
     its whole length and reads as plastic piping. Dark, rough, and thick
     enough to carry six metres of cloth. */
  const iron = new THREE.MeshStandardMaterial({ color:0x6b5a3c, roughness:.62,
                                                metalness:.55 });
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(.085,.085,L.railW,18), iron);
  bar.rotation.z = R; bar.position.set(0, L.rail, L.railZ);
  V.scene.add(bar);

  /* the collars it is socketed through, set a little in from each wall.
     No finials — the ends are inside the stone, which is where a rod that
     holds up a row of banners actually goes. */
  const inset = L.built ? 2.86 : L.railW/2 - 0.3;
  [-inset, inset].forEach(x => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(.135,.135,.20,18), iron);
    col.rotation.z = R;
    col.position.set(x, L.rail, L.railZ);
    V.scene.add(col);
  });
}

/* Brackets down the corridor walls. Each one is a small warm pool with its own
   flicker, and between them it is properly dark — which is the whole look. */
const TORCH = [];
function torches(){
  const spots = [[-2.86, 4.75, 10.4], [ 2.86, 4.75,  7.0],
                 [-2.86, 4.75,  3.4], [ 2.86, 4.75, -0.4],
                 [-2.86, 4.55, -4.4], [ 2.86, 4.55, -8.0]];
  spots.forEach((p, i) => {
    const lamp = new THREE.PointLight(0xff8f33, 1.9, 7.4, 2.15);
    lamp.position.set(p[0], p[1], p[2]);
    V.scene.add(lamp);
    /* NO FLAME MESH, and no bracket. The source stays off screen — what you
       see is the pool of light it throws on the wall and the way it breathes,
       which is all a torch is for here. A little emissive blob in the frame
       reads as a bug, not as fire. */
    TORCH.push({ lamp, ph:i*2.1, base:1.9 });
  });
}

/* ══ THE LIGHT ════════════════════════════════════════════════
   Dark, and lit from two directions that disagree: a warm torch close on the
   left, and the cold night coming up the hall through the gate. */
function light(){
  if (L.built){
    /* A dungeon: almost no ambient, so the torches are doing all of it and the
       gaps between them go black. The little that is there is cold, which is
       what makes the torchlight read as warm. */
    V.scene.fog = new THREE.FogExp2(0x03050a, 0.082);
    V.scene.add(new THREE.HemisphereLight(0x141c2c, 0x050403, .07));
    /* something is out beyond the far arch, and it is not friendly */
    const beyond = new THREE.PointLight(0x7d9fd6, 3.4, 17, 1.5);
    beyond.position.set(0, 4.0, -8.6);
    V.scene.add(beyond);
    const moon = new THREE.DirectionalLight(0x4a6a9c, .09);
    moon.position.set(-.3, .8, 1); V.scene.add(moon);
    return;
  }
  V.scene.fog = new THREE.FogExp2(0x04060b, 0.055);
  V.scene.add(new THREE.HemisphereLight(0x1a2438, 0x0a0806, .26));
  V.torch = new THREE.PointLight(0xffa24a, 7.0, 20, 1.9);
  V.torch.position.set(-4.6, 3.2, 7.4);
  V.scene.add(V.torch);
  V.flame = new THREE.Mesh(new THREE.SphereGeometry(.13, 12, 10),
    new THREE.MeshBasicMaterial({ color:0xffc477, fog:false }));
  V.flame.position.copy(V.torch.position);
  V.scene.add(V.flame);
  const t2 = new THREE.PointLight(0xff8c3a, 3.4, 15, 2);
  t2.position.set(5.4, 2.7, -1.5);
  V.scene.add(t2);
  const moon = new THREE.DirectionalLight(0x5d7cb4, .22);
  moon.position.set(-.4, .9, -3); V.scene.add(moon);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(46, 34),
    new THREE.MeshBasicMaterial({ color:0x0d1522, fog:false }));
  sky.position.set(0, 8, -36); V.scene.add(sky);
}

/* ══ THE BANNERS ══════════════════════════════════════════════ */
const VS = `
uniform float t; uniform float amp; uniform float ph;
varying vec2 vUv; varying vec3 vN; varying float vW; varying float vD;
void main(){
  vUv = uv;
  vec3 p = position;
  float y = 1.0 - uv.y;                       /* 0 at the rail, 1 at the hem */
  float k = 7.0;
  float w  = sin(y*k        - t*2.30 + ph);
  float w2 = sin(y*k*0.47   - t*1.40 + ph*1.7);
  float a  = amp * pow(y, 1.55);
  p.z += (w*0.62 + w2*0.38) * a;
  p.x += sin(t*0.66 + ph) * a * 0.22 * y;
  p.y -= a * 0.05 * abs(w);
  float dz = (cos(y*k - t*2.30 + ph)*k*0.62
            + cos(y*k*0.47 - t*1.40 + ph*1.7)*k*0.47*0.38) * a;
  vN = normalize(vec3(0.0, -dz, 1.0));
  vW = w*0.62 + w2*0.38;
  vec4 mv = modelViewMatrix * vec4(p,1.0);
  vD = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const FS = `
uniform sampler2D map; uniform vec3 lightPos; uniform vec3 lightCol;
uniform vec3 ambCol; uniform float lit;
varying vec2 vUv; varying vec3 vN; varying float vW; varying float vD;
void main(){
  vec4 c = texture2D(map, vUv);
  if (c.a < 0.45) discard;
  vec3 L = normalize(lightPos);
  float d = max(dot(normalize(vN), L), 0.0);
  vec3 col = c.rgb * (ambCol + lightCol * (0.30 + 0.85*d));
  col *= 0.80 + 0.20*vW;                       /* the fold's own shading */
  col *= mix(1.0, 1.22, lit);                  /* the one you are pointing at */
  float f = 1.0 - exp(-0.052*0.052*vD*vD);     /* into the dark with everything else */
  gl_FragColor = vec4(mix(col, vec3(0.02,0.028,0.045), f), 1.0);
}`;

function banner(def, i, n){
  const W = def.w || L.bw, H = (def.h || 2.5) * (L.built ? 0.80 : 1);
  const geo = new THREE.PlaneGeometry(W, H, 14, 30);
  geo.translate(0, -H/2, 0);                    /* pinned at the rail */
  const tex = new THREE.Texture();
  const im = new Image();
  im.onload = () => { tex.image = im; tex.needsUpdate = true; };
  im.src = def.url;
  tex.anisotropy = 8;
  const mat = new THREE.ShaderMaterial({
    vertexShader:VS, fragmentShader:FS, side:THREE.DoubleSide,
    uniforms:{ t:{value:0}, amp:{value:0.155}, ph:{value:i*1.7},
      map:{value:tex}, lightPos:{value:new THREE.Vector3(-.6,.55,1)},
      /* a banner nobody can take down hangs in shadow — it is not greyed out,
         it is simply not lit */
      lightCol:{value:new THREE.Color(def.dead ? 0x5a4c3c : 0xffb066)},
      ambCol:{value:new THREE.Color(def.dead ? 0x0b0e16 : 0x141b2b)}, lit:{value:0} }
  });
  const m = new THREE.Mesh(geo, mat);
  m.position.set(-L.spread/2 + L.spread*(i/(n-1)),
                 L.rail - 0.06 - (def.drop||0), L.railZ);
  m.userData = { i, def, base:m.position.y };
  V.scene.add(m);
  V.banners.push(m);

  /* Cords from the rod down to the head of the cloth. Without them a banner
     hanging lower than its neighbour looks like it is floating, and the rod
     looks like it is holding nothing — which is most of why the rail read
     wrong. Two per banner, so the head cannot appear to swing. */
  const drop = L.rail - m.position.y;
  if (drop > 0.01){
    const cord = new THREE.MeshStandardMaterial({ color:0x2a2118, roughness:.95 });
    [-W*0.34, W*0.34].forEach(dx => {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(.014,.014,drop+0.06,6), cord);
      c.position.set(m.position.x + dx, L.rail - (drop+0.06)/2, L.railZ);
      V.scene.add(c);
    });
  }
  return m;
}

/* ══ UP ═══════════════════════════════════════════════════════ */
function init(canvas, defs, onPick){
  V.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  V.onPick = onPick;
  V.renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
  V.renderer.setPixelRatio(Math.min(devicePixelRatio||1, 1.75));
  V.renderer.outputEncoding = THREE.sRGBEncoding;
  V.scene = new THREE.Scene();
  V.cam = new THREE.PerspectiveCamera(L.built ? 46 : 40, 1, .1, 140);
  V.cam.position.set(L.cam[0], L.cam[1], L.cam[2]);
  materials(); hall(); light();
  defs.forEach((d, i) => banner(d, i, defs.length));
  resize();
  addEventListener('resize', resize);
  addEventListener('pointermove', e => {
    V.pointer.x = (e.clientX/innerWidth)*2 - 1;
    V.pointer.y = -(e.clientY/innerHeight)*2 + 1;
    V.aim.x = (e.clientX/innerWidth - .5);
    V.aim.y = (e.clientY/innerHeight - .5);
  });
  requestAnimationFrame(loop);
}
function resize(){
  V.renderer.setSize(innerWidth, innerHeight, false);
  V.cam.aspect = innerWidth/innerHeight; V.cam.updateProjectionMatrix();
}

let gust = 0, nextGust = 5200;
function loop(ms){
  requestAnimationFrame(loop);
  if (V.asleep) return;                 /* a screen is over it: draw nothing */
  const t = V.t = ms*0.001;

  /* the gust comes through the door and runs down the line */
  if (ms > nextGust){ gust = 1; nextGust = ms + 7000 + Math.random()*9000; }
  gust *= 0.9915;

  /* parallax: the camera leans with the pointer, the arcade slides past */
  const k = V.reduced ? 0 : 1;
  V.cur.x += (V.aim.x - V.cur.x)*0.045;
  V.cur.y += (V.aim.y - V.cur.y)*0.045;
  /* You can turn. The head moves a little and the gaze moves a lot, which is
     how looking around a room actually works — the corridor swings past the
     banners instead of sliding. */
  const sway = L.built ? 0.95 : 2.0, lift = L.built ? 0.60 : 0.9;
  const turn = L.built ? 7.5 : 1.5, tilt = L.built ? 4.6 : 1.5;
  V.cam.position.x = L.cam[0] - V.cur.x*sway*k;
  V.cam.position.y = L.cam[1] - V.cur.y*lift*k;
  V.cam.lookAt(L.look[0] + V.cur.x*turn*k, L.look[1] - V.cur.y*tilt*k, L.look[2]);

  /* the torch is a flame, so it is never one brightness */
  TORCH.forEach(T => {
    const j = Math.sin(t*11.7 + T.ph)*0.5 + Math.sin(t*4.3 + T.ph*1.7)*0.8
            + Math.sin(t*27.1 + T.ph)*0.22;
    T.lamp.intensity = T.base + j*0.42;
  });
  if (V.flame){ const f = 0.9 + Math.sin(t*13.1)*0.14 + Math.sin(t*5.7)*0.1;
                V.flame.scale.setScalar(f); }
  if (V.torch) V.torch.intensity = 7.0 + Math.sin(t*11.3)*0.7 + Math.sin(t*4.1)*1.1
                                      + Math.sin(t*23.7)*0.3;

  /* what is the pointer on? Nothing, while a banner is down: the hall is
     behind a full-screen sheet and must not be reachable through it. */
  let hot = -1;
  if (!V.locked){
    V.ray.setFromCamera(V.pointer, V.cam);
    const hit = V.ray.intersectObjects(V.banners, false)[0];
    hot = hit ? hit.object.userData.i : -1;
  }
  if (hot !== V.hot){
    V.hot = hot;
    document.body.style.cursor = (hot >= 0 && !V.banners[hot].userData.def.dead)
      ? 'pointer' : 'default';
  }

  V.banners.forEach((m, i) => {
    const u = m.material.uniforms, d = m.userData;
    u.t.value = t;
    const lag = i*0.26;
    const g = gust * Math.max(0, Math.sin((t - lag)*2.0));
    u.amp.value += ((V.hot === i ? 0.26 : 0.155) + g*0.34 - u.amp.value)*0.06;
    u.lit.value += ((V.hot === i ? 1 : 0) - u.lit.value)*0.12;
    m.position.z += ((V.hot === i ? L.railZ + 0.42 : L.railZ) - m.position.z)*0.08;
  });

  V.renderer.render(V.scene, V.cam);
}

/* where a banner's hem is on screen, so the DOM plate can sit under it */
const _v = new THREE.Vector3();
function project(i){
  const m = V.banners[i]; if (!m) return null;
  _v.set(m.position.x, m.position.y - (m.userData.def.h || 2.5), m.position.z);
  _v.project(V.cam);
  return { x:(_v.x*0.5+0.5)*innerWidth, y:(-_v.y*0.5+0.5)*innerHeight,
           on: V.hot === i };
}
function hot(){ return V.hot; }
function setTexture(i, url){
  const m = V.banners[i]; if (!m) return;
  const im = new Image();
  im.onload = () => { m.material.uniforms.map.value.image = im;
                      m.material.uniforms.map.value.needsUpdate = true; };
  im.src = url;
}
addEventListener('click', () => {
  if (!V.locked && V.hot >= 0 && V.onPick) V.onPick(V.banners[V.hot].userData.def, V.hot);
});
function lock(on){
  V.locked = !!on;
  if (V.locked){ V.hot = -1; document.body.style.cursor = 'default'; }
}

/* the cloth falls over the hall and covers it completely, so once the fall has
   finished there is nothing to draw until it lifts again */
function sleep(on){ V.asleep = !!on; }
root.Hall = { init, project, hot, setTexture, lock, sleep };
})(window);
