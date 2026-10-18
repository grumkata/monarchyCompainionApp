/* ══════════════════════════════════════════════════════════════
   27-bob-world.js — WHAT LIVES IN BOB-OMB BATTLEFIELD.

   grumkata: "please actualy flesh out bobomb battleground to be like the
   og game ffs".

   Everything here stands where the game puts it: the course's own object
   lists, read out of the decompiled game (github.com/n64decomp/sm64:
   levels/bob/script.c, areas/1/macro.inc.c, the trees in collision.inc.c,
   the iron balls' paths in trajectory.inc.c, the signs' and the Buddies'
   words in text/us/dialogs.h) and baked into assets/bob/bob.js. This is
   the first act, "Big Bob-omb on the Summit":

     coins       the lines, the ring, the singles, and the eight red ones
                 (all eight: a star where the Star Marker is); a hundred: a
                 star over Mario; every coin a wedge of health back
     Bob-ombs    wandering, then, seeing you, fuse lit and coming; touch
                 or be near when they go and it costs two wedges. Picked up
                 and thrown, they go off where they land. They come back.
     Goombas     wandering, then charging; jump on them, or punch them
     the Chain Chomp  on its chain, lunging at you; pound its stake three
                 times and it breaks loose, smashes its gate and is gone —
                 and the star behind the gate can be had
     King Bob-omb on the summit: he says his piece, then comes for you.
                 Get behind him, B to pick him up, B to throw; three times
                 and he goes off, and leaves the star
     Buddies, signs  B to talk, B to read, in the game's own words
     the rest    trees, wooden posts (pound them down for coins), boxes
                 (break them), cannons shut in the ground, the iron balls
                 rolling down the mountain, a heart, a 1-up, the warps

   The characters are built from the same plain shapes the N64 ones are:
   none of the game's pictures are in here.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

if (typeof THREE === 'undefined') return;

const F = 30, TAU = Math.PI * 2;
const now = () => performance.now() / 1000;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), c01 = v => clamp(v, 0, 1);
const rnd = (a, b) => a + Math.random() * (b - a), lerp = (a, b, k) => a + (b - a) * k;
const wrap = a => { a = (a + Math.PI) % TAU; return (a < 0 ? a + TAU : a) - Math.PI; };
const deg = d => d * Math.PI / 180;
const FLAT = { nx: 0, ny: 1, nz: 0, type: 'SURFACE_NOT_SLIPPERY' };
const _v = new THREE.Vector3(), _w = new THREE.Vector3();

/* ══ PICTURES ══════════════════════════════════════════════════ */
const P = {};
function cv(w, h, draw) { const c = doc.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }
function tex(c) { const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; }
function pics() {
  if (P.coin) return P;
  const coin = (hi, mid, lo, rim) => tex(cv(64, 64, (x) => {
    let g = x.createRadialGradient(24, 22, 2, 32, 32, 30);
    g.addColorStop(0, hi); g.addColorStop(0.55, mid); g.addColorStop(1, lo);
    x.fillStyle = g; x.beginPath(); x.arc(32, 32, 29, 0, TAU); x.fill();
    x.lineWidth = 4; x.strokeStyle = rim; x.beginPath(); x.arc(32, 32, 23, 0, TAU); x.stroke();
    x.fillStyle = rim; x.fillRect(29, 18, 6, 28);
    x.fillStyle = hi; x.fillRect(30, 19, 2, 26);
  }));
  P.coin = coin('#fff7a8', '#ffcf1a', '#c98a00', '#a86c00');
  P.red = coin('#ffb0a0', '#f2281a', '#900c06', '#7c0a04');
  P.blue = coin('#cfe0ff', '#3c7cff', '#1a3c9c', '#123080');
  P.tree = tex(cv(128, 192, (x) => {
    x.fillStyle = '#6b4320'; x.fillRect(54, 120, 20, 72);
    x.fillStyle = '#4a2c12'; x.fillRect(66, 120, 8, 72);
    const blob = (cx, cy, r, c) => { const g = x.createRadialGradient(cx - r * 0.35, cy - r * 0.4, 2, cx, cy, r); g.addColorStop(0, '#8fe36a'); g.addColorStop(0.55, c); g.addColorStop(1, '#155a12'); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill(); };
    blob(64, 66, 52, '#2f9a28'); blob(40, 92, 30, '#2a8f24'); blob(88, 92, 30, '#2a8f24'); blob(64, 104, 30, '#2a8f24'); blob(64, 40, 34, '#38a830');
  }));
  P.heart = tex(cv(64, 64, (x) => {
    x.fillStyle = '#e8102a'; x.beginPath(); x.moveTo(32, 56); x.bezierCurveTo(4, 36, 6, 8, 32, 20); x.bezierCurveTo(58, 8, 60, 36, 32, 56); x.fill();
    x.fillStyle = 'rgba(255,255,255,.6)'; x.beginPath(); x.ellipse(21, 22, 6, 4, -0.6, 0, TAU); x.fill();
  }));
  P.oneup = tex(cv(64, 64, (x) => {
    x.fillStyle = '#f2e2c0'; x.fillRect(22, 34, 20, 22);
    x.fillStyle = '#1e1e1e'; x.fillRect(26, 40, 3, 8); x.fillRect(35, 40, 3, 8);
    x.fillStyle = '#28b228'; x.beginPath(); x.arc(32, 34, 26, Math.PI, 0); x.fill();
    x.fillStyle = '#fff'; [[22, 22, 7], [42, 22, 7], [32, 14, 5]].forEach(([a, b, c]) => { x.beginPath(); x.arc(a, b, c, 0, TAU); x.fill(); });
  }));
  P.spark = tex(cv(32, 32, (x) => {
    const g = x.createRadialGradient(16, 16, 0, 16, 16, 15); g.addColorStop(0, 'rgba(255,255,230,1)'); g.addColorStop(0.4, 'rgba(255,190,60,.9)'); g.addColorStop(1, 'rgba(255,90,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 32, 32);
  }));
  P.boom = tex(cv(64, 64, (x) => {
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 31); g.addColorStop(0, 'rgba(255,255,220,1)'); g.addColorStop(0.35, 'rgba(255,200,60,.95)'); g.addColorStop(0.7, 'rgba(240,90,20,.6)'); g.addColorStop(1, 'rgba(120,40,10,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  }));
  P.smoke = tex(cv(64, 64, (x) => {
    const g = x.createRadialGradient(28, 26, 2, 32, 32, 31); g.addColorStop(0, 'rgba(120,116,110,1)'); g.addColorStop(0.6, 'rgba(80,76,72,.85)'); g.addColorStop(1, 'rgba(60,58,56,0)');
    x.fillStyle = g; x.beginPath(); x.arc(32, 32, 31, 0, TAU); x.fill();
  }));
  P.cork = tex(cv(64, 64, (x) => {
    x.fillStyle = '#b8874a'; x.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 260; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(90,55,20,.55)' : 'rgba(240,200,140,.5)'; x.fillRect(rnd(0, 64), rnd(0, 64), rnd(1, 3), rnd(1, 3)); }
    x.strokeStyle = 'rgba(70,40,15,.8)'; x.lineWidth = 3; x.strokeRect(1.5, 1.5, 61, 61);
  }));
  P.sign = tex(cv(128, 96, (x) => {
    x.fillStyle = '#9a6a36'; x.fillRect(0, 0, 128, 96);
    for (let y = 8; y < 96; y += 14) { x.fillStyle = 'rgba(70,40,15,.35)'; x.fillRect(0, y, 128, 2); }
    x.fillStyle = 'rgba(40,22,8,.75)'; [24, 40, 56, 72].forEach(y => x.fillRect(18, y, rnd(70, 92), 4));
    x.strokeStyle = '#5a3412'; x.lineWidth = 6; x.strokeRect(3, 3, 122, 90);
  }));
  P.shadow = new THREE.CanvasTexture(cv(64, 64, (x) => {
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 31); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(0.75, 'rgba(0,0,0,.42)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  }));
  return P;
}
const sprite = (map, w, h, extra) => { const s = new THREE.Sprite(new THREE.SpriteMaterial(Object.assign({ map, transparent: true, alphaTest: 0.1 }, extra || {}))); s.scale.set(w, h, 1); return s; };
const lam = (c, o) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, o || {}));
const phong = (c, o) => new THREE.MeshPhongMaterial(Object.assign({ color: c, shininess: 70, specular: 0x555555 }, o || {}));

/* ══ THE CHARACTERS, IN PLAIN SHAPES ═══════════════════════════ */
function eye(r, x, y, z, pupil) {
  const g = new THREE.Group();
  const w = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), lam(0xffffff));
  w.scale.set(0.6, 1, 0.35); g.add(w);
  const p = new THREE.Mesh(new THREE.SphereGeometry(r * 0.42, 8, 6), lam(pupil || 0x101010));
  p.position.set(0, -r * 0.1, r * 0.3); p.scale.set(0.8, 1.2, 0.4); g.add(p);
  g.position.set(x, y, z); return g;
}
/* a Bob-omb (or, pink, a Buddy; or, three times the size and crowned, the King). Feet on y 0, facing +z. */
function bobomb(color, king) {
  const g = new THREE.Group(), s = king ? 3 : 1, body = new THREE.Group();
  const b = new THREE.Mesh(new THREE.SphereGeometry(55, 16, 12), phong(color));
  body.add(b);
  body.add(eye(15, -17, 8, 47), eye(15, 17, 8, 47));
  /* the wind-up key, on his back */
  const key = new THREE.Group();
  const kmat = phong(0xc8c8d0, { shininess: 90 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 26, 6), kmat); shaft.rotation.x = Math.PI / 2; shaft.position.z = -8; key.add(shaft);
  [-1, 1].forEach(sd => { const loop = new THREE.Mesh(new THREE.TorusGeometry(11, 4, 6, 12), kmat); loop.position.set(sd * 13, 0, -22); loop.rotation.y = Math.PI / 2; key.add(loop); });
  key.position.set(0, 8, -52); body.add(key);
  /* the fuse */
  const fuse = new THREE.Mesh(new THREE.CylinderGeometry(4, 5, 18, 6), lam(0xf2e6c8)); fuse.position.set(0, 62, 0); body.add(fuse);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(12, 14, 8, 10), phong(0x2a2a2e)); cap.position.set(0, 54, 0); body.add(cap);
  body.position.y = 62; g.add(body);
  const feet = [-1, 1].map(sd => { const f = new THREE.Mesh(new THREE.SphereGeometry(19, 10, 8), lam(0xffb81a)); f.scale.set(1, 0.55, 1.45); f.position.set(sd * 24, 9, 8); g.add(f); return f; });
  if (king) {
    /* the crown, the mustache, the gloves */
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(28, 30, 22, 10, 1, true), phong(0xffcf2a, { side: THREE.DoubleSide, shininess: 100 }));
    crown.position.set(0, 64, 0); body.add(crown);
    for (let i = 0; i < 6; i++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(7, 16, 6), phong(0xffcf2a)); const a = i / 6 * TAU; sp.position.set(Math.cos(a) * 26, 82, Math.sin(a) * 26); body.add(sp); }
    fuse.position.y = 90; cap.position.y = 72;
    [-1, 1].forEach(sd => { const m = new THREE.Mesh(new THREE.SphereGeometry(15, 10, 8), lam(0xffffff)); m.scale.set(1.5, 0.55, 0.6); m.position.set(sd * 14, -8, 50); m.rotation.z = -sd * 0.35; body.add(m); });
    [-1, 1].forEach(sd => { const br = new THREE.Mesh(new THREE.BoxGeometry(18, 4, 4), lam(0x101010)); br.position.set(sd * 17, 27, 50); br.rotation.z = sd * 0.4; body.add(br); });
    const hands = [-1, 1].map(sd => { const h = new THREE.Mesh(new THREE.SphereGeometry(15, 10, 8), lam(0xffffff)); h.position.set(sd * 62, 0, 10); body.add(h); return h; });
    g.userData.hands = hands;
  }
  g.scale.setScalar(s);
  Object.assign(g.userData, { body, key, fuse, feet, size: 62 * s });
  return g;
}
function goomba() {
  const g = new THREE.Group();
  const pts = []; for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI / 2; pts.push(new THREE.Vector2(Math.cos(a) * 72 + (i < 2 ? 4 : 0), Math.sin(a) * 66)); }
  pts.unshift(new THREE.Vector2(40, -6));
  const head = new THREE.Mesh(new THREE.LatheGeometry(pts, 14), lam(0x8c5a2a, { side: THREE.DoubleSide }));
  head.position.y = 62; g.add(head);
  const under = new THREE.Mesh(new THREE.CircleGeometry(72, 14), lam(0x5a3416, { side: THREE.DoubleSide })); under.rotation.x = Math.PI / 2; under.position.y = 62; g.add(under);
  g.add(eye(14, -20, 98, 56), eye(14, 20, 98, 56));
  [-1, 1].forEach(sd => { const br = new THREE.Mesh(new THREE.BoxGeometry(26, 6, 5), lam(0x101010)); br.position.set(sd * 21, 118, 54); br.rotation.z = sd * 0.45; g.add(br); });
  [-1, 1].forEach(sd => { const f = new THREE.Mesh(new THREE.ConeGeometry(5, 12, 5), lam(0xffffff)); f.position.set(sd * 14, 62, 66); f.rotation.x = Math.PI; g.add(f); });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(30, 34, 40, 10), lam(0xead09a)); body.position.y = 40; g.add(body);
  const feet = [-1, 1].map(sd => { const f = new THREE.Mesh(new THREE.SphereGeometry(20, 10, 8), lam(0x3a2010)); f.scale.set(1, 0.6, 1.35); f.position.set(sd * 24, 10, 6); g.add(f); return f; });
  g.userData.feet = feet; g.userData.size = 70;
  return g;
}
function chomp() {
  const g = new THREE.Group(), r = 170;
  const mat = phong(0x16161c, { shininess: 90, specular: 0x777777 });
  const top = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 10, 0, TAU, 0, Math.PI / 2), mat);
  const jaw = new THREE.Group(), bot = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 10, 0, TAU, Math.PI / 2, Math.PI / 2), mat);
  jaw.add(bot);
  const inside = lam(0xb0101a, { side: THREE.DoubleSide });
  const d1 = new THREE.Mesh(new THREE.CircleGeometry(r * 0.98, 18), inside); d1.rotation.x = Math.PI / 2; top.add(d1);
  const d2 = new THREE.Mesh(new THREE.CircleGeometry(r * 0.98, 18), inside); d2.rotation.x = -Math.PI / 2; jaw.add(d2);
  for (let i = 0; i < 9; i++) {
    const a = (i / 8 - 0.5) * 2.4;
    const t1 = new THREE.Mesh(new THREE.ConeGeometry(16, 34, 4), lam(0xffffff)); t1.position.set(Math.sin(a) * r * 0.9, -12, Math.cos(a) * r * 0.9); t1.rotation.x = Math.PI; top.add(t1);
    const t2 = new THREE.Mesh(new THREE.ConeGeometry(16, 34, 4), lam(0xffffff)); t2.position.set(Math.sin(a) * r * 0.9, 12, Math.cos(a) * r * 0.9); jaw.add(t2);
  }
  top.add(eye(44, -60, 88, 120, 0x101010), eye(44, 60, 88, 120, 0x101010));
  const head = new THREE.Group(); head.add(top, jaw); head.position.y = r; g.add(head);
  Object.assign(g.userData, { jaw, head, r });
  return g;
}
function shadowDisc(scene, w) { const s = new THREE.Mesh(new THREE.PlaneGeometry(w, w), new THREE.MeshBasicMaterial({ map: pics().shadow, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 })); s.rotation.x = -Math.PI / 2; s.renderOrder = 2; scene.add(s); return s; }

/* ══ BUILDING THE COURSE'S CAST ════════════════════════════════ */
let W = null;
function build(r, D) {
  pics();
  const G = D.game, sc = r.scene, col = r.col;
  W = r.wd = { r, coins: [], foes: [], solids: [], tops: [], signs: [], spr: [], stars: [], posts: [], warps: [], balls: [], spawners: [], fx: [], red: 0, redStar: null, hundred: false, star6: null, king: null, chompObj: null, gate: null, talk: G.talk };
  const ground = (x, y, z, up) => { const f = col.floor(x, (y || 0) + (up == null ? 400 : up), z); return f ? f.h : (y || 0); };
  const act1 = o => !o.acts || /ACT_1\b|ALL_ACTS/.test(o.acts);
  for (const o of G.objs) {
    const [x, y, z] = o.p, yaw = deg(o.yaw || 0);
    switch (o.k) {
      case 'bubble_tree': tree(x, ground(x, y, z), z); break;
      case 'yellow_coin_1': coin(x, y, z, 1); break;
      case 'coin_line_horizontal': for (let i = 0; i < 5; i++) { const cx = x + Math.sin(yaw) * i * 200, cz = z + Math.cos(yaw) * i * 200; coin(cx, ground(cx, y, cz, 300) + 50, cz, 1); } break;
      case 'coin_ring_horizontal': for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; coin(x + Math.cos(a) * 300, y, z + Math.sin(a) * 300, 1); } break;
      case 'coin_ring_vertical_flying': for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; coin(x + Math.cos(yaw) * Math.cos(a) * 300, y + Math.sin(a) * 300, z - Math.sin(yaw) * Math.cos(a) * 300, 1); } break;
      case 'red_coin': coin(x, y ? y + 50 : ground(x, 0, z) + 50, z, 2); break;
      case 'recovery_heart': heart(x, y, z); break;
      case '1up': oneUp(x, ground(x, y, z), z); break;
      case 'bobomb': case 'bobomb_stationary': foe('bobomb', x, ground(x, y, z), z, o.k === 'bobomb_stationary'); break;
      case 'goomba': foe('goomba', x, ground(x, y, z), z); break;
      case 'goomba_triplet_spawner': for (let i = 0; i < 3; i++) { const a = i / 3 * TAU, gx = x + Math.cos(a) * 160, gz = z + Math.sin(a) * 160; foe('goomba', gx, ground(gx, y, gz), gz); } break;
      case 'chain_chomp': chainChomp(x, ground(x, y, z), z); break;
      case 'wooden_post_1': post(x, ground(x, y, z), z); break;
      case 'wooden_signpost': sign(x, ground(x, y, z), z, yaw, (o.arg || '').replace('DIALOG_', '')); break;
      case 'breakable_box_small': box(x, ground(x, y, z), z, 140, 0); break;
      case 'breakable_box_no_coins': box(x, ground(x, y, z), z, 200, 0); break;
      case 'breakable_box_three_coins': box(x, ground(x, y, z), z, 200, 3); break;
      case 'box_wing_cap': case 'box_star_act_3': ghostBox(x, y, z); break;
      case 'cannon_closed': lid(x, ground(x, y, z, 60), z); break;
      case 'bhvChainChompGate': gate(x, y, z, yaw); break;
      case 'bhvBobombBuddy': if (act1(o)) buddy(x, ground(x, y, z), z, (o.arg.match(/DIALOG_(\d+)/) || [])[1]); break;
      case 'bhvBoBBowlingBallSpawner': if (act1(o)) W.spawners.push({ path: G.paths[/UPPER/.test(o.arg) ? 'metal_ball_path0' : 'metal_ball_path1'], next: rnd(1, 4) }); break;
      case 'bhvPitBowlingBall': if (act1(o)) pitBall(x, y, z); break;
      case 'bhvKingBobomb': if (act1(o)) king(x, y, z, yaw); break;
      case 'bhvHiddenRedCoinStar': W.redAt = new THREE.Vector3(x, y, z); marker(x, y, z); break;
      case 'bhvStar': W.star6 = star(x, y, z, 'Behind Chain Chomp\'s Gate'); break;
      case 'bhvSeesawPlatform': seesaw(x, y, z, yaw); break;
      case 'bhvCheckerboardElevatorGroup': lifts(x, y, z); break;
      case 'bhvOpenableGrill': grills(x, y, z, yaw); break;
      case 'bhvFloorSwitchGrills': W.grillSwitch = new THREE.Vector3(x, y, z); break;
      case 'bhvFadingWarp': W.warps.push({ id: (o.arg.match(/WARP_NODE_(\w+)/) || [])[1], p: new THREE.Vector3(x, ground(x, y, z, 200), z), yaw }); break;
    }
  }
  /* the warps go in pairs: 0B with 0C, 0D with 0E */
  const pair = { '0B': '0C', '0C': '0B', '0D': '0E', '0E': '0D' };
  W.warps.forEach(w => { w.to = W.warps.find(o => o.id === pair[w.id]); });
  hud(r);
}
function add(o) { W.r.scene.add(o); return o; }
function tree(x, y, z) {
  const s = add(new THREE.Mesh(new THREE.PlaneGeometry(460, 690), new THREE.MeshLambertMaterial({ map: P.tree, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide })));
  s.position.set(x, y + 345, z); s.userData.face = true; W.spr.push(s);
  W.solids.push({ x, z, r: 60, y0: y, y1: y + 690 });
}
function coin(x, y, z, v) {
  const s = add(sprite(v === 2 ? P.red : v === 5 ? P.blue : P.coin, 100, 100));
  s.position.set(x, y, z);
  W.coins.push({ s, p: s.position, v, ph: rnd(0, TAU), shadow: null });
}
function heart(x, y, z) { const s = add(sprite(P.heart, 140, 140)); s.position.set(x, y + 80, z); W.heart = { s, p: s.position, used: 0 }; }
function oneUp(x, y, z) { const s = add(sprite(P.oneup, 110, 110)); s.position.set(x, y + 55, z); W.oneup = { s, p: s.position, home: s.position.clone(), got: false }; }
function foe(kind, x, y, z, still) {
  const g = add(kind === 'goomba' ? goomba() : bobomb(0x1a1a24));
  g.position.set(x, y, z);
  const o = { kind, g, p: g.position, home: new THREE.Vector3(x, y, z), yaw: rnd(0, TAU), v: 0, vy: 0, state: 'wander', t: 0, still: !!still, dir: rnd(0, TAU), next: rnd(1, 3), lit: 0, ground: true, sh: shadowDisc(W.r.scene, kind === 'goomba' ? 150 : 130) };
  W.foes.push(o); return o;
}
function buddy(x, y, z, dlg) {
  const g = add(bobomb(0xff8fc0)); g.position.set(x, y, z);
  W.signs.push({ p: g.position, r: 170, text: dlg, buddy: g });
  W.solids.push({ x, z, r: 70, y0: y, y1: y + 130 });
  shadowDisc(W.r.scene, 130).position.set(x, y + 2, z);
}
function chainChomp(x, y, z) {
  const st = new THREE.Mesh(new THREE.CylinderGeometry(42, 42, 260, 10), lam(0x8a5a2a)); st.position.set(x, y + 100, z); add(st);
  const g = add(chomp()); g.position.set(x + 400, y, z);
  const links = []; for (let i = 0; i < 6; i++) { const l = add(new THREE.Mesh(new THREE.TorusGeometry(32, 10, 6, 12), phong(0x3a3a44))); links.push(l); }
  const o = { kind: 'chomp', g, p: g.position, post: new THREE.Vector3(x, y, z), stake: st, sink: 0, pounds: 0, state: 'idle', t: 0, v: new THREE.Vector3(), links, vy: 0, free: false, sh: shadowDisc(W.r.scene, 360) };
  W.chompObj = o;
  W.tops.push({ x, z, r: 50, get h() { return y + 230 - o.sink; }, post: o });
}
function post(x, y, z) {
  const m = add(new THREE.Mesh(new THREE.CylinderGeometry(55, 55, 260, 10), lam(0x9a6430))); m.position.set(x, y + 70, z);
  const top = new THREE.Mesh(new THREE.CircleGeometry(55, 10), lam(0x6a3c16)); top.rotation.x = -Math.PI / 2; top.position.y = 130.5; m.add(top);
  const o = { m, x, z, y, sink: 0 };
  W.posts.push(o);
  W.tops.push({ x, z, r: 58, get h() { return y + 200 - o.sink; }, post: o });
  W.solids.push({ x, z, r: 58, get y0() { return y; }, get y1() { return y + 200 - o.sink; } });
}
function sign(x, y, z, yaw, dlg) {
  const g = add(new THREE.Group()); g.position.set(x, y, z); g.rotation.y = yaw;
  const pole = new THREE.Mesh(new THREE.BoxGeometry(18, 120, 18), lam(0x7a4a1e)); pole.position.y = 60; g.add(pole);
  const board = new THREE.Mesh(new THREE.BoxGeometry(170, 110, 14), [lam(0x8a5a2a), lam(0x8a5a2a), lam(0x8a5a2a), lam(0x8a5a2a), new THREE.MeshLambertMaterial({ map: P.sign }), new THREE.MeshLambertMaterial({ map: P.sign })]);
  board.position.y = 150; g.add(board);
  W.signs.push({ p: g.position, r: 190, text: dlg, yaw });
  W.solids.push({ x, z, r: 45, y0: y, y1: y + 205 });
}
function box(x, y, z, s, coins) {
  const m = add(new THREE.Mesh(new THREE.BoxGeometry(s, s, s), new THREE.MeshLambertMaterial({ map: P.cork })));
  m.position.set(x, y + s / 2, z);
  const o = { m, x, z, y, s, coins, broken: false };
  W.boxes = W.boxes || []; W.boxes.push(o);
  W.tops.push({ x, z, r: s / 2, sq: true, get h() { return o.broken ? -1e9 : y + s; }, box: o });
  W.solids.push({ x, z, r: s / 2, sq: true, get y0() { return o.broken ? 1e9 : y; }, get y1() { return o.broken ? -1e9 : y + s - 2; } });
}
function ghostBox(x, y, z) {
  const m = add(new THREE.Mesh(new THREE.BoxGeometry(200, 200, 200), new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0.22, depthWrite: false })));
  m.position.set(x, y + 100, z);
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineDashedMaterial({ color: 0xffb0a0, dashSize: 20, gapSize: 14 })); e.computeLineDistances(); m.add(e);
}
function lid(x, y, z) {
  const m = add(new THREE.Mesh(new THREE.CylinderGeometry(115, 120, 20, 16), phong(0x30303a))); m.position.set(x, y + 4, z);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(110, 10, 6, 20), phong(0x8a8a96)); ring.rotation.x = Math.PI / 2; ring.position.y = 10; m.add(ring);
}
/* the Chomp's gate: the game's own (levels/bob/chain_chomp_gate), bars a thousand and twenty-three wide and 640 high */
function gate(x, y, z, yaw) {
  const g = add(new THREE.Group()); g.position.set(x, y, z); g.rotation.y = yaw;
  const model = W.r.n64('chain_chomp_gate');
  if (model) g.add(model);
  else {
    const mat = phong(0x5a5a64);
    for (let i = -4; i <= 4; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 320, 6), mat); b.position.set(i * 55, 160, 0); g.add(b); }
    [40, 280].forEach(h => { const b = new THREE.Mesh(new THREE.BoxGeometry(500, 20, 20), mat); b.position.set(0, h, 0); g.add(b); });
  }
  W.gate = { g, x, y, z, yaw, open: false, w: model ? 512 : 250 };
}
/* the seesaw by the Chomp's meadow: the game's own plank (levels/bob/seesaw_platform), 361 across, 1809 long and 51
   thick, tipping the way you stand on it */
function seesaw(x, y, z, yaw) {
  const model = W.r.n64('seesaw_platform');
  const L = model ? 1808 : 1100, Wd = model ? 360 : 300, top = model ? 51 : 0;
  const g = add(new THREE.Group()); g.position.set(x, y, z); g.rotation.y = yaw;
  if (model) g.add(model);
  else {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(Wd, 40, L), lam(0x8a5a2a)); plank.position.y = -20; g.add(plank);
    for (let i = -4; i <= 4; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(Wd + 4, 6, 14), lam(0x5a3412)); st.position.set(0, 1, i * 120); g.add(st); }
  }
  const o = { g, x, y, z, yaw, tilt: 0, L, Wd };
  W.seesaw = o;
  /* its top, as a floor: how high it is under (px, pz) for the tip it has now */
  W.tops.push({ fn(px, pz) {
    const c = Math.cos(yaw), s = Math.sin(yaw), dx = px - x, dz = pz - z;
    const across = dx * c - dz * s, along = dx * s + dz * c;
    if (Math.abs(across) > Wd / 2 || Math.abs(along) > L / 2) return null;
    return y + top + Math.tan(-o.tilt) * along;
  } });
}
/* the grills in the pit (grill_door.inc.c): two doors of bars hung 320 either side of the middle, the one turned
   round to meet the other; the purple switch beside them swings them open a quarter turn, over 64 frames */
function grills(x, y, z, yaw) {
  const doors = [[320, Math.PI, -1], [-320, 0, 1]].map(([dx, turn, sign]) => {
    const model = W.r.n64('grate_door');
    if (!model) return null;
    const g = add(new THREE.Group());
    g.position.set(x + Math.cos(yaw) * dx, y, z - Math.sin(yaw) * dx);
    g.rotation.y = yaw + turn; g.add(model);
    return { g, yaw0: g.rotation.y, sign };
  }).filter(Boolean);
  if (doors.length) W.grills = { x, y, z, yaw, doors, open: 0, w: 320 };
}
/* the checkerboard lifts below the cliff by the start: two, one going up as the other comes down */
function lifts(x, y, z) {
  const cv2 = cv(64, 64, (c) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { c.fillStyle = (i + j) % 2 ? '#e8e8e8' : '#2a2a2a'; c.fillRect(i * 16, j * 16, 16, 16); } });
  const t = tex(cv2); t.magFilter = THREE.NearestFilter;
  W.lifts = [0, 1].map(i => {
    const m = add(new THREE.Mesh(new THREE.BoxGeometry(300, 60, 300), new THREE.MeshLambertMaterial({ map: t })));
    const o = { m, x: x + (i ? 380 : 0), z, y0: y - 300, y1: y + 520, ph: i * Math.PI, h: y };
    m.position.set(o.x, o.h, o.z);
    W.tops.push({ x: o.x, z: o.z, r: 150, sq: true, get h() { return o.h + 30; } });
    return o;
  });
}
function marker(x, y, z) {
  /* the Star Marker: where the red coins' star will come, as a shadow of one */
  const s = starModel(); if (!s) return;
  s.position.set(x, y, z); s.traverse(o => { if (o.isMesh) { o.material = new THREE.MeshBasicMaterial({ color: 0x223355, transparent: true, opacity: 0.45, depthWrite: false }); } });
  add(s); W.markerObj = s;
}
function starModel() {
  const L = root.GOBLIN_LOOT && root.GOBLIN_LOOT.star;
  if (!L) return null;
  const g = new THREE.Group(), tl = new THREE.TextureLoader();
  for (const pr of L.prims) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pr.p, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(pr.n, 3));
    if (pr.u) geo.setAttribute('uv', new THREE.Float32BufferAttribute(pr.u, 2));
    geo.setIndex(pr.i);
    const tx = tl.load(L.tex[pr.t]); tx.encoding = THREE.sRGBEncoding; tx.flipY = false;
    g.add(new THREE.Mesh(geo, pr.k === 'matcap' ? new THREE.MeshMatcapMaterial({ matcap: tx }) : new THREE.MeshBasicMaterial({ map: tx, transparent: true })));
  }
  const b = new THREE.Box3().setFromObject(g), c = b.getCenter(new THREE.Vector3()), k = 220 / (b.max.y - b.min.y);
  g.children.forEach(m => m.position.sub(c)); g.scale.setScalar(k); g.rotation.y = -Math.PI / 2;
  const o = new THREE.Group(); o.add(g); return o;
}
function star(x, y, z, name) {
  const s = starModel(); if (!s) return null;
  s.position.set(x, y, z); add(s);
  const o = { s, p: s.position, name, got: false, y0: y };
  W.stars.push(o); return o;
}
function pitBall(x, y, z) { ball(null, new THREE.Vector3(x, y, z)); }
function ball(path, at) {
  const m = add(new THREE.Mesh(new THREE.SphereGeometry(120, 16, 12), phong(0x24242c, { shininess: 110, specular: 0x999999 })));
  const o = { m, p: m.position, path, i: 0, v: new THREE.Vector3(), pit: !path, home: at ? at.clone() : null, a: rnd(0, TAU), sh: shadowDisc(W.r.scene, 260) };
  if (path) m.position.set(path[0], path[1] + 120, path[2]); else m.position.copy(at).setY(at.y + 120);
  W.balls.push(o); return o;
}
function king(x, y, z, yaw) {
  const g = add(bobomb(0x1a1a24, true)); g.position.set(x, y, z); g.rotation.y = yaw;
  W.king = { g, p: g.position, home: new THREE.Vector3(x, y, z), yaw, hp: 3, state: 'wait', t: 0, v: new THREE.Vector3(), vy: 0, sh: shadowDisc(W.r.scene, 420) };
}

/* ══ EVERY FRAME ═══════════════════════════════════════════════ */
function step(r, t, dt) {
  if (!W) return;
  const m = r.m, mp = m.p, cam = r.cam;
  const mc = _v.set(mp.x, mp.y + 80, mp.z);
  /* billboards turn to the camera about their upright */
  for (const s of W.spr) s.rotation.y = Math.atan2(cam.position.x - s.position.x, cam.position.z - s.position.z);
  /* coins spin, and are taken */
  for (let i = W.coins.length - 1; i >= 0; i--) {
    const c = W.coins[i];
    c.s.scale.x = 100 * Math.max(0.12, Math.abs(Math.cos(t * 5 + c.ph)));
    if (c.p.distanceTo(mc) < 130 && m.act !== 'dead') {
      r.scene.remove(c.s); W.coins.splice(i, 1);
      r.api.coin(c.v, c.p);
      if (c.v === 2) { W.red++; popup(r, String(W.red), c.p, '#ff4a3a'); if (W.red === 8) redStar(r); }
      sparkle(r, c.p, c.v === 2 ? 0xff5040 : 0xffe060);
    }
  }
  /* the heart turns and heals; the 1-up hops after you */
  if (W.heart) { W.heart.s.material.rotation = 0; W.heart.s.scale.x = 140 * Math.abs(Math.cos(t * 3)); if (W.heart.p.distanceTo(mc) < 220 && t - W.heart.used > 1) { W.heart.used = t; r.api.heal(4); sparkle(r, W.heart.p, 0xff5070); } }
  if (W.oneup && !W.oneup.got) {
    const u = W.oneup; u.p.y = u.home.y + Math.abs(Math.sin(t * 4)) * 30;
    if (u.p.distanceTo(mc) < 140) { u.got = true; r.scene.remove(u.s); r.api.life(); popup(r, '1-UP', u.p, '#3cd23c'); }
  }
  for (const o of W.foes) foeStep(r, o, t, dt, mc);
  chompStep(r, t, dt, mc);
  kingStep(r, t, dt, mc);
  ballsStep(r, t, dt, mc);
  /* stars on their spot, turning; touched, they are got */
  for (const s of W.stars) {
    if (s.got) continue;
    s.s.rotation.y += dt * 2.4; s.p.y = s.y0 + Math.sin(t * 2.2) * 20;
    if (s.p.distanceTo(mc) < 200 && r.phase === 'play' && m.act !== 'dead') { s.got = true; r.scene.remove(s.s); r.api.star(s.p, s.name); }
  }
  if (W.markerObj) W.markerObj.rotation.y += dt * 1.2;
  /* the seesaw tips toward Mario's weight and back to level without him; the lifts go up and down */
  if (W.seesaw) {
    const o = W.seesaw, c = Math.cos(o.yaw), sn = Math.sin(o.yaw), along = (m.p.x - o.x) * sn + (m.p.z - o.z) * c, across = (m.p.x - o.x) * c - (m.p.z - o.z) * sn;
    const on = m.ground && Math.abs(across) < o.Wd / 2 && Math.abs(along) < o.L / 2 && Math.abs(m.p.y - o.y) < 300;
    const want = on ? clamp(along / (o.L / 2), -1, 1) * 0.32 : 0;
    o.tilt += (want - o.tilt) * Math.min(1, dt * 1.6);
    o.g.rotation.x = -o.tilt;                                       /* the end he stands on goes down */
  }
  if (W.lifts) for (const o of W.lifts) { o.h = lerp(o.y0, o.y1, 0.5 - 0.5 * Math.cos(t * 0.55 + o.ph)); o.m.position.y = o.h; }
  /* stand on the purple switch and the grills swing open, a quarter turn over 64 frames */
  if (W.grills) {
    const G = W.grills, sw = W.grillSwitch;
    if (!G.opening && sw && m.ground && Math.hypot(m.p.x - sw.x, m.p.z - sw.z) < 130 && Math.abs(m.p.y - sw.y) < 80) G.opening = true;
    if (G.opening && G.open < 1) { G.open = Math.min(1, G.open + dt * F / 64); for (const d of G.doors) d.g.rotation.y = d.yaw0 - d.sign * G.open * Math.PI / 2; }
  }
  /* the posts settle into the ground as they are pounded */
  for (const p of W.posts) p.m.position.y = p.y + 70 - p.sink;
  /* the warps: stand still on one for a moment and you come out at the other */
  warps(r, t, dt);
  fxStep(r, t, dt);
  hudStep(r, t);
}

/* ── the enemies ──────────────────────────────────────────────── */
function walk(r, o, dx, dz, dt) {
  const col = r.col, nx = o.p.x + dx * dt, nz = o.p.z + dz * dt;
  const f = col.floor(nx, o.p.y + 80, nz);
  /* not off a cliff, nor up a wall */
  if (!f || f.h < o.p.y - 120 || f.h > o.p.y + 80) return false;
  o.p.x = nx; o.p.z = nz; o.p.y = f.h;
  col.walls(o.p, o.p.y + 40, 50);
  return true;
}
function foeStep(r, o, t, dt, mc) {
  const m = r.m, g = o.g;
  if (o.state === 'gone') { o.t += dt; if (o.t > 6 && o.kind === 'bobomb') respawnFoe(r, o); return; }
  o.t += dt;
  const dx = m.p.x - o.p.x, dz = m.p.z - o.p.z, dist = Math.hypot(dx, dz), dy = m.p.y - o.p.y, toYaw = Math.atan2(dx, dz);
  const sees = dist < (o.kind === 'goomba' ? 1000 : 900) && Math.abs(dy) < 400 && m.act !== 'dead';
  if (o.state === 'held') { /* carried by Mario: on his hands */
    _w.set(m.p.x + Math.sin(m.yaw) * 70, m.p.y + 150, m.p.z + Math.cos(m.yaw) * 70); o.p.copy(_w); g.rotation.y = m.yaw;
    if (o.lit && t - o.lit > 3.5) explode(r, o);
  } else if (o.state === 'flying') {
    o.vy -= 3600 * dt; o.p.x += o.vel.x * dt; o.p.z += o.vel.z * dt; o.p.y += o.vy * dt;
    g.rotation.x += dt * 8;
    const f = r.col.floor(o.p.x, o.p.y + 80, o.p.z);
    if (f && o.p.y <= f.h && o.vy < 0) { o.p.y = f.h; g.rotation.x = 0; if (o.kind === 'bobomb') explode(r, o); else { o.state = 'wander'; } }
    if (o.p.y < -2000) { o.state = 'gone'; g.visible = false; o.t = 0; }
  } else if (o.state === 'squish') {
    g.scale.y = Math.max(0.15, 1 - o.t * 6);
    if (o.t > 0.5) { o.state = 'gone'; g.visible = false; o.sh.visible = false; o.t = 0; coin(o.p.x, o.p.y + 60, o.p.z, 1); }
  } else if (o.state === 'knocked') {
    o.vy -= 3600 * dt; o.p.addScaledVector(o.vel, dt); o.p.y += o.vy * dt; g.rotation.x -= dt * 10;
    const f = r.col.floor(o.p.x, o.p.y + 80, o.p.z);
    if (f && o.p.y <= f.h && o.vy < 0) {
      o.p.y = f.h; g.rotation.x = 0;
      if (o.kind === 'goomba') { o.state = 'gone'; g.visible = false; o.sh.visible = false; o.t = 0; puff(r, o.p, 0xffffff); coin(o.p.x, o.p.y + 60, o.p.z, 1); }
      else { o.state = 'chase'; o.lit = o.lit || t; }
    }
  } else {
    /* wandering, and, seeing Mario, coming for him (a Bob-omb with its fuse lit) */
    if (sees && !o.still && o.state !== 'chase') { o.state = 'chase'; if (o.kind === 'bobomb') o.lit = t; else o.hop = t; }
    if (o.kind === 'bobomb' && o.still && sees && dist < 500 && !o.lit) o.lit = t;
    if (o.state === 'chase' && (!sees || dist > 1600) && o.kind === 'goomba') o.state = 'wander';
    let sp = 0, want = o.dir;
    if (o.still) { sp = 0; want = toYaw; }
    else if (o.state === 'chase') { sp = o.kind === 'goomba' ? 10 * F : 6.5 * F; want = toYaw; if (o.hop && t - o.hop < 0.4) sp = 0; }
    else {
      sp = 3 * F; o.next -= dt;
      if (o.next < 0) { o.next = rnd(1.5, 4); o.dir = rnd(0, TAU); }
      if (o.p.distanceTo(o.home) > 700) o.dir = Math.atan2(o.home.x - o.p.x, o.home.z - o.p.z);
    }
    o.yaw = wrap(o.yaw + clamp(wrap(want - o.yaw), -5 * dt, 5 * dt));
    if (sp && !walk(r, o, Math.sin(o.yaw) * sp, Math.cos(o.yaw) * sp, dt)) { o.dir = wrap(o.dir + Math.PI * rnd(0.6, 1.4)); }
    g.rotation.y = o.yaw;
    /* feet stepping, key turning */
    const ph = t * (sp ? 12 : 3);
    g.userData.feet.forEach((f, i) => { f.position.z = 8 + Math.sin(ph + i * Math.PI) * (sp ? 14 : 2); f.position.y = 9 + Math.max(0, Math.sin(ph + i * Math.PI)) * (sp ? 8 : 0); });
    if (g.userData.key) g.userData.key.rotation.z = t * 3;
    if (o.hop && t - o.hop < 0.4) g.position.y = o.p.y + Math.sin((t - o.hop) / 0.4 * Math.PI) * 60;
    /* touching Mario */
    if (dist < 110 && Math.abs(dy + 0) < 140 && m.act !== 'dead') {
      if (o.kind === 'goomba' && m.vy < 0 && !m.ground && m.p.y > o.p.y + 50) stomp(r, o);
      else if (o.kind === 'goomba') r.api.damage(1, o.p);
      else if (o.lit) explode(r, o);
    }
    if (o.kind === 'bobomb' && o.lit && t - o.lit > 4.5) explode(r, o);
  }
  /* the fuse burning */
  if (o.kind === 'bobomb' && o.lit && o.state !== 'gone') { if (!o.spark) { o.spark = sprite(P.spark, 40, 40, { blending: THREE.AdditiveBlending, alphaTest: 0 }); g.userData.body.add(o.spark); o.spark.position.set(0, 74, 0); } o.spark.scale.setScalar(30 + Math.sin(t * 40) * 10); o.spark.visible = true; }
  if (o.sh) { const f = r.col.floor(o.p.x, o.p.y + 60, o.p.z); o.sh.visible = g.visible && !!f; if (f) o.sh.position.set(o.p.x, f.h + 2, o.p.z); }
}
function stomp(r, o) { o.state = 'squish'; o.t = 0; const m = r.m; m.vy = 34 * F; m.kind = 'jump'; m.airT = 0; m.cut = false; m.kicked = false; puff(r, o.p, 0xffffff); }
function explode(r, o) {
  if (o.state === 'gone') return;
  const m = r.m;
  boom(r, o.p.clone().setY(o.p.y + 60));
  if (m.held === o) m.held = null;
  if (m.p.distanceTo(o.p) < 300 && m.act !== 'dead') r.api.damage(2, o.p);
  o.state = 'gone'; o.g.visible = false; o.t = 0; o.lit = 0; if (o.spark) o.spark.visible = false; if (o.sh) o.sh.visible = false;
}
function respawnFoe(r, o) { o.p.copy(o.home); o.g.visible = true; o.g.scale.set(1, 1, 1); o.state = 'wander'; o.lit = 0; puff(r, o.p, 0xffffff); }

/* ── the Chain Chomp ──────────────────────────────────────────── */
function chompStep(r, t, dt, mc) {
  const o = W.chompObj; if (!o) return;
  const m = r.m, g = o.g, post = o.post;
  o.t += dt;
  const LEN = 760;
  const dx = m.p.x - post.x, dz = m.p.z - post.z, near = Math.hypot(dx, dz) < 1300 && Math.abs(m.p.y - post.y) < 500 && m.act !== 'dead';
  if (o.free) {
    /* loose: bounding off to its gate, through it, and away */
    if (o.state === 'tothegate') {
      const G = W.gate, to = _w.set(G.x - o.p.x, 0, G.z - o.p.z), d = to.length();
      o.p.addScaledVector(to.normalize(), 1600 * dt);
      o.hop = (o.hop || 0) + dt; g.position.y = o.p.y + Math.abs(Math.sin(o.hop * 5)) * 220;
      g.rotation.y = Math.atan2(G.x - o.p.x, G.z - o.p.z);
      if (d < 200 && !G.open) { G.open = true; G.fall = 0; boom(r, new THREE.Vector3(G.x, G.y + 150, G.z), true); r.api.shake(0.4); }
      if (G.open) { o.state = 'away'; o.awayT = 0; o.dir = g.rotation.y; }
    } else if (o.state === 'away') {
      o.awayT += dt; o.p.x += Math.sin(o.dir) * 1700 * dt; o.p.z += Math.cos(o.dir) * 1700 * dt; o.hop += dt;
      g.position.y = o.p.y + Math.abs(Math.sin(o.hop * 5)) * 260;
      if (o.awayT > 2.4) { g.visible = false; o.sh.visible = false; o.links.forEach(l => (l.visible = false)); o.state = 'gone'; }
    }
    if (o.state !== 'gone') { o.links.forEach((l, i) => { l.position.lerpVectors(o.stake.position, g.position, (i + 1) / 7).setY(g.position.y + 40); }); }
  } else {
    /* on its chain: hopping round its stake; seeing Mario, rearing back and lunging */
    if (o.state === 'idle') {
      o.next = (o.next || 0) - dt;
      if (o.next < 0) { o.next = rnd(0.8, 1.6); const a = rnd(0, TAU), d = rnd(200, 520); o.goal = new THREE.Vector3(post.x + Math.cos(a) * d, 0, post.z + Math.sin(a) * d); o.hopT = 0; }
      if (o.goal) { _w.set(o.goal.x - o.p.x, 0, o.goal.z - o.p.z); const d = _w.length(); if (d > 20) o.p.addScaledVector(_w.normalize(), Math.min(d, 500 * dt)); }
      o.hopT = (o.hopT || 0) + dt; g.position.y = o.p.y + Math.abs(Math.sin(o.hopT * 7)) * 60;
      if (near && o.t > 1) { o.state = 'rear'; o.t = 0; }
      const ty = Math.atan2(m.p.x - o.p.x, m.p.z - o.p.z); g.rotation.y = wrap(g.rotation.y + clamp(wrap(ty - g.rotation.y), -3 * dt, 3 * dt));
    } else if (o.state === 'rear') {
      const ty = Math.atan2(m.p.x - o.p.x, m.p.z - o.p.z); g.rotation.y = ty;
      g.userData.jaw.rotation.x = Math.min(0.9, o.t * 2);
      if (o.t > 0.6) { o.state = 'lunge'; o.t = 0; o.aim = new THREE.Vector3(m.p.x, 0, m.p.z); }
    } else if (o.state === 'lunge') {
      _w.set(o.aim.x - o.p.x, 0, o.aim.z - o.p.z); const d = _w.length();
      o.p.addScaledVector(_w.normalize(), Math.min(d, 3600 * dt));
      g.position.y = o.p.y + Math.sin(c01(o.t / 0.5) * Math.PI) * 120;
      g.userData.jaw.rotation.x = 0.9 - c01((o.t - 0.3) * 6) * 0.9;
      if (o.t > 0.7) { o.state = 'idle'; o.t = 0; }
    }
    /* never further from the stake than the chain */
    _w.set(o.p.x - post.x, 0, o.p.z - post.z); if (_w.length() > LEN) { _w.setLength(LEN); o.p.x = post.x + _w.x; o.p.z = post.z + _w.z; }
    const f = r.col.floor(o.p.x, o.p.y + 300, o.p.z); if (f) o.p.y = f.h;
    g.position.x = o.p.x; g.position.z = o.p.z;
    if (o.state === 'idle') g.userData.jaw.rotation.x = Math.max(0, Math.sin(t * 6)) * 0.3;
    o.links.forEach((l, i) => { const k = (i + 1) / 7; l.position.set(lerp(post.x, o.p.x, k), lerp(post.y + 30, g.position.y + 60, k) + Math.sin(k * Math.PI) * 30, lerp(post.z, o.p.z, k)); l.rotation.set(i % 2 ? Math.PI / 2 : 0, Math.atan2(o.p.x - post.x, o.p.z - post.z), 0); });
    /* its bite */
    const bd = _w.set(m.p.x - g.position.x, (m.p.y + 80) - (g.position.y + 170), m.p.z - g.position.z).length();
    if (bd < 230 && m.act !== 'dead') r.api.damage(o.state === 'lunge' ? 3 : 1, g.position);
  }
  o.stake.position.y = post.y + 100 - o.sink;
  if (o.sh) { o.sh.position.set(o.p.x, o.p.y + 2, o.p.z); }
}
/* ── King Bob-omb ─────────────────────────────────────────────── */
function kingStep(r, t, dt, mc) {
  const k = W.king; if (!k || k.state === 'gone') return;
  const m = r.m, g = k.g;
  k.t += dt;
  const dx = m.p.x - k.p.x, dz = m.p.z - k.p.z, dist = Math.hypot(dx, dz), toYaw = Math.atan2(dx, dz);
  const ud = g.userData;
  ud.feet.forEach((f, i) => { f.position.z = 8 + Math.sin(t * 6 + i * Math.PI) * (k.state === 'fight' ? 10 : 0); });
  if (ud.key) ud.key.rotation.z = t * 2;
  if (k.state === 'wait') {
    if (dist < 1400 && Math.abs(m.p.y - k.p.y) < 300 && m.ground && r.phase === 'play') { k.state = 'talk'; r.api.say('017', () => { k.state = 'fight'; k.t = 0; }); }
  } else if (k.state === 'fight') {
    /* coming for you, turning to face you; close enough in front, he has you */
    g.rotation.y = wrap(g.rotation.y + clamp(wrap(toYaw - g.rotation.y), -1.6 * dt, 1.6 * dt));
    const sp = (3 + (3 - k.hp) * 1.2) * F;
    if (dist > 220) { const yy = g.rotation.y; k.p.x += Math.sin(yy) * sp * dt; k.p.z += Math.cos(yy) * sp * dt; }
    const f = r.col.floor(k.p.x, k.p.y + 300, k.p.z); if (f) k.p.y = f.h;
    const front = Math.abs(wrap(toYaw - g.rotation.y)) < 0.7;
    if (dist < 260 && front && m.act !== 'dead' && m.held !== k && m.ground && k.t > 1) { k.state = 'grab'; k.t = 0; m.act = 'grabbed'; m.held = null; }
    if (k.p.y < k.home.y - 600) { k.state = 'return'; k.t = 0; k.from = k.p.clone(); }
  } else if (k.state === 'grab') {
    /* he has Mario over his head, spins, and throws */
    g.rotation.y += dt * (3 + k.t * 6);
    m.p.set(k.p.x + Math.sin(g.rotation.y) * 120, k.p.y + 420, k.p.z + Math.cos(g.rotation.y) * 120); m.yaw = g.rotation.y + Math.PI;
    if (k.t > 1.4) {
      k.state = 'fight'; k.t = 0;
      m.act = ''; m.ground = false; m.kind = 'thrown'; m.airT = 0; m.yaw = g.rotation.y + Math.PI; m.v = -50; m.vy = 52 * F; m.peak = m.p.y;
    }
  } else if (k.state === 'held') {
    /* lifted by Mario, over his head */
    k.p.set(m.p.x + Math.sin(m.yaw) * 40, m.p.y + 170, m.p.z + Math.cos(m.yaw) * 40); g.rotation.y = m.yaw;
  } else if (k.state === 'flying') {
    k.vy -= 3600 * dt; k.p.addScaledVector(k.v, dt); k.p.y += k.vy * dt; g.rotation.x += dt * 4;
    const f = r.col.floor(k.p.x, k.p.y + 300, k.p.z);
    if (f && k.p.y <= f.h && k.vy < 0) {
      k.p.y = f.h; g.rotation.x = 0; r.api.shake(0.5); puff(r, k.p, 0xffffff, 8);
      if (k.p.y > k.home.y - 300) { k.hp--; popup(r, k.hp > 0 ? 'OOF!' : '', k.p.clone().setY(k.p.y + 400), '#ffffff'); }
      if (k.hp <= 0) { k.state = 'beaten'; k.t = 0; r.api.say('116', () => { boom(r, k.p.clone().setY(k.p.y + 200), true); g.visible = false; k.sh.visible = false; k.state = 'gone'; star(k.home.x, k.home.y + 300, k.home.z, 'Big Bob-omb on the Summit'); }); }
      else { k.state = 'stunned'; k.t = 0; }
    }
    if (k.p.y < k.home.y - 1500) { k.state = 'return'; k.t = 0; k.from = k.p.clone(); }
  } else if (k.state === 'stunned') {
    g.rotation.z = Math.sin(k.t * 20) * 0.08 * (1 - k.t / 1.6);
    if (k.t > 1.6) { k.state = 'fight'; k.t = 0; g.rotation.z = 0; }
  } else if (k.state === 'return') {
    /* thrown off his mountain: he jumps back up onto it */
    const u = c01(k.t / 1.4);
    k.p.lerpVectors(k.from, k.home, u); k.p.y += Math.sin(u * Math.PI) * 1200;
    if (u >= 1) { k.p.copy(k.home); k.state = 'fight'; k.t = 0; r.api.shake(0.4); }
  }
  g.position.copy(k.p);
  const f = r.col.floor(k.p.x, k.p.y + 50, k.p.z); if (f) k.sh.position.set(k.p.x, f.h + 2, k.p.z);
}
/* ── the iron balls ───────────────────────────────────────────── */
function ballsStep(r, t, dt, mc) {
  for (const s of W.spawners) { s.next -= dt; if (s.next < 0 && s.path) { s.next = rnd(6, 9); ball(s.path); } }
  const m = r.m;
  for (let i = W.balls.length - 1; i >= 0; i--) {
    const b = W.balls[i];
    if (b.pit) {
      /* the pit's balls roll round and round it */
      b.a += dt * 1.1; b.p.set(b.home.x + Math.cos(b.a) * 260, b.home.y + 120, b.home.z + Math.sin(b.a) * 260);
      b.m.rotation.y = -b.a; b.m.rotation.x += dt * 3;
    } else {
      /* down the mountain along the game's own path, gathering speed */
      const P2 = b.path, n = P2.length / 3;
      if (b.i >= n - 1) { r.scene.remove(b.m); r.scene.remove(b.sh); W.balls.splice(i, 1); continue; }
      const tx = P2[(b.i + 1) * 3], ty = P2[(b.i + 1) * 3 + 1] + 120, tz = P2[(b.i + 1) * 3 + 2];
      _w.set(tx - b.p.x, ty - b.p.y, tz - b.p.z);
      const d = _w.length(), sp = Math.min(1500, 600 + (b.spd = (b.spd || 0) + dt * 220));
      if (d < sp * dt + 5) b.i++;
      else b.p.addScaledVector(_w.normalize(), sp * dt);
      b.m.rotation.x += sp * dt / 120;
      b.m.rotation.y = Math.atan2(tx - b.p.x, tz - b.p.z);
    }
    const f = r.col.floor(b.p.x, b.p.y, b.p.z); if (f) b.sh.position.set(b.p.x, f.h + 2, b.p.z);
    if (b.p.distanceTo(mc) < 190 && m.act !== 'dead') r.api.damage(2, b.p);
  }
}
/* ── the warps ────────────────────────────────────────────────── */
function warps(r, t, dt) {
  const m = r.m;
  for (const w of W.warps) {
    if (!w.to) continue;
    const on = m.ground && Math.hypot(m.p.x - w.p.x, m.p.z - w.p.z) < 90 && Math.abs(m.p.y - w.p.y) < 100 && m.v < 4;
    w.on = on ? (w.on || 0) + dt : 0;
    if (w.on > 0.5 && !W.warping) {
      W.warping = true; r.api.flash(0.6, () => { m.p.copy(w.to.p); m.yaw = w.to.yaw; r.camR.yaw = m.yaw + Math.PI; r.camR.tgt.copy(m.p); W.warping = false; w.on = 0; w.to.on = -2; });
    }
  }
}

/* ══ WHAT MARIO DOES TO THINGS (27-bob.js calls these) ═════════ */
function hit(r, kind, at, rad) {
  if (!W) return;
  for (const o of W.foes) {
    if (o.state === 'gone' || o.state === 'squish' || o.state === 'held' || o.state === 'flying') continue;
    if (o.p.distanceTo(at) > rad + 60 && (kind !== 'pound' || Math.hypot(o.p.x - at.x, o.p.z - at.z) > rad + 40)) continue;
    const a = Math.atan2(o.p.x - r.m.p.x, o.p.z - r.m.p.z);
    if (o.kind === 'goomba' && kind === 'pound') { stomp(r, o); continue; }
    o.state = 'knocked'; o.vel = new THREE.Vector3(Math.sin(a) * 900, 0, Math.cos(a) * 900); o.vy = 900;
    if (o.kind === 'bobomb') o.lit = o.lit || now();
    sparkle(r, at, 0xffffff);
  }
  if (W.boxes) for (const b of W.boxes) {
    if (b.broken) continue;
    const cx = b.x, cy = b.y + b.s / 2, cz = b.z;
    if (Math.abs(at.x - cx) < b.s / 2 + rad * 0.6 && Math.abs(at.z - cz) < b.s / 2 + rad * 0.6 && Math.abs(at.y - cy) < b.s / 2 + rad * 0.6) {
      b.broken = true; r.scene.remove(b.m); debris(r, new THREE.Vector3(cx, cy, cz));
      for (let i = 0; i < b.coins; i++) coin(cx + rnd(-80, 80), cy + 40, cz + rnd(-80, 80), 1);
    }
  }
  if (kind === 'pound') {
    /* a pound on the top of a post drives it in */
    for (const p of W.posts) {
      if (Math.hypot(at.x - p.x, at.z - p.z) < 80 && p.sink < 180) {
        p.sink = Math.min(180, p.sink + 60); puff(r, new THREE.Vector3(p.x, p.y, p.z), 0xd8c8a8);
        if (p.sink >= 180 && !p.paid) { p.paid = true; for (let i = 0; i < 5; i++) coin(p.x + Math.cos(i / 5 * TAU) * 160, p.y + 60, p.z + Math.sin(i / 5 * TAU) * 160, 1); }
      }
    }
    const c = W.chompObj;
    if (c && !c.free && Math.hypot(at.x - c.post.x, at.z - c.post.z) < 90) {
      c.pounds++; c.sink = Math.min(200, c.pounds * 66); r.api.shake(0.25);
      if (c.pounds >= 3) { c.free = true; c.state = 'tothegate'; popup(r, 'FREE!', c.p.clone().setY(c.p.y + 420), '#ffffff'); }
    }
  }
}
function grab(r) {
  if (!W) return null;
  const m = r.m;
  const k = W.king;
  if (k && (k.state === 'fight' || k.state === 'stunned') && m.p.distanceTo(k.p) < 330) {
    /* only from behind: Mario facing the way the King faces */
    const behind = Math.abs(wrap(Math.atan2(m.p.x - k.p.x, m.p.z - k.p.z) - k.g.rotation.y)) > 1.9;
    if (behind || k.state === 'stunned') { k.state = 'held'; return k; }
  }
  for (const o of W.foes) {
    if (o.kind !== 'bobomb' || (o.state !== 'wander' && o.state !== 'chase')) continue;
    const d = Math.hypot(o.p.x - m.p.x, o.p.z - m.p.z), a = Math.abs(wrap(Math.atan2(o.p.x - m.p.x, o.p.z - m.p.z) - m.yaw));
    if (d < 170 && a < 1.0 && Math.abs(o.p.y - m.p.y) < 120) { o.state = 'held'; o.lit = o.lit || now(); return o; }
  }
  return null;
}
function release(r, o, v) {
  if (o === W.king) { o.state = 'flying'; o.v = new THREE.Vector3(v.x * 0.7, 0, v.z * 0.7); o.vy = v.y * 0.8; return; }
  o.state = 'flying'; o.vel = new THREE.Vector3(v.x, 0, v.z); o.vy = v.y;
}
function floor(r, x, y, z) {
  if (!W) return null;
  let best = null;
  for (const s of W.tops) {
    if (s.fn) { const h = s.fn(x, z); if (h != null && h <= y + 1 && (!best || h > best.h)) best = { h, t: FLAT }; continue; }
    const inside = s.sq ? Math.abs(x - s.x) <= s.r && Math.abs(z - s.z) <= s.r : Math.hypot(x - s.x, z - s.z) <= s.r;
    if (!inside) continue;
    const h = s.h;
    if (h <= y + 1 && (!best || h > best.h)) best = { h, t: FLAT };
  }
  return best;
}
function solid(r, p) {
  if (!W) return;
  const y = p.y + 40;
  for (const s of W.solids) {
    if (y < s.y0 - 10 || p.y > s.y1 - 20) continue;
    if (s.sq) {
      const dx = p.x - s.x, dz = p.z - s.z, rr = s.r + 45;
      if (Math.abs(dx) < rr && Math.abs(dz) < rr) { if (rr - Math.abs(dx) < rr - Math.abs(dz)) p.x = s.x + Math.sign(dx || 1) * rr; else p.z = s.z + Math.sign(dz || 1) * rr; }
    } else {
      const dx = p.x - s.x, dz = p.z - s.z, d = Math.hypot(dx, dz), rr = s.r + 45;
      if (d < rr) { const k = rr / (d || 1); p.x = s.x + dx * k; p.z = s.z + dz * k; }
    }
  }
  /* the King is solid, and so is his gate until the Chomp has been through it */
  const k = W.king;
  if (k && k.g.visible && k.state !== 'held' && k.state !== 'grab') { const dx = p.x - k.p.x, dz = p.z - k.p.z, d = Math.hypot(dx, dz); if (d < 230 && Math.abs(p.y - k.p.y) < 400) { p.x = k.p.x + dx / (d || 1) * 230; p.z = k.p.z + dz / (d || 1) * 230; } }
  const G = W.gate;
  if (G && !G.open) bars(p, G, G.y + 330);
  /* and the grills, until they have swung */
  if (W.grills && !W.grills.open) bars(p, W.grills, W.grills.y + 640);
}
/* a straight run of bars `w` either side of (x, z), across its yaw: Mario is put back on the side he came from */
function bars(p, G, top) {
  const c = Math.cos(G.yaw), s = Math.sin(G.yaw), lx = (p.x - G.x) * c - (p.z - G.z) * s, lz = (p.x - G.x) * s + (p.z - G.z) * c;
  if (Math.abs(lx) < G.w && Math.abs(lz) < 60 && p.y < top) { const nz = Math.sign(lz || 1) * 60; p.x = G.x + lx * c + nz * s; p.z = G.z - lx * s + nz * c; }
}
function talk(r) {
  if (!W) return null;
  const m = r.m;
  for (const s of W.signs) {
    const d = Math.hypot(s.p.x - m.p.x, s.p.z - m.p.z), a = Math.abs(wrap(Math.atan2(s.p.x - m.p.x, s.p.z - m.p.z) - m.yaw));
    if (d < s.r && a < 1.2 && Math.abs(s.p.y - m.p.y) < 200 && W.talk[s.text]) return { text: s.text, done: null };
  }
  return null;
}

/* ══ FLOURISHES ════════════════════════════════════════════════ */
function fxSprite(r, map, at, life, from, to, extra) {
  const s = sprite(map, from, from, Object.assign({ depthWrite: false, alphaTest: 0 }, extra || {}));
  s.position.copy(at); r.scene.add(s);
  W.fx.push({ s, b: now(), life, from, to, vy: (extra && extra.vy) || 0 });
  return s;
}
function puff(r, at, col, n) { for (let i = 0; i < (n || 4); i++) fxSprite(r, P.smoke, at.clone().add(new THREE.Vector3(rnd(-60, 60), rnd(10, 60), rnd(-60, 60))), rnd(0.4, 0.7), 60, 180, { color: col || 0xffffff, vy: 80 }); }
function sparkle(r, at, col) { for (let i = 0; i < 6; i++) fxSprite(r, P.spark, at.clone().add(new THREE.Vector3(rnd(-70, 70), rnd(-50, 70), rnd(-70, 70))), rnd(0.25, 0.45), 50, 10, { color: col, blending: THREE.AdditiveBlending }); }
function boom(r, at, big) {
  fxSprite(r, P.boom, at, 0.45, 80, big ? 900 : 560, { blending: THREE.AdditiveBlending });
  for (let i = 0; i < (big ? 12 : 7); i++) fxSprite(r, P.smoke, at.clone().add(new THREE.Vector3(rnd(-120, 120), rnd(-40, 120), rnd(-120, 120))), rnd(0.7, 1.2), 120, big ? 420 : 300, { color: 0x888888, vy: 160 });
  r.api.shake(big ? 0.5 : 0.3);
}
function debris(r, at) { for (let i = 0; i < 8; i++) fxSprite(r, P.cork, at.clone().add(new THREE.Vector3(rnd(-80, 80), rnd(-60, 80), rnd(-80, 80))), rnd(0.5, 0.8), 50, 20, { vy: 300 }); }
function fxStep(r, t, dt) {
  const n = now();
  W.fx = W.fx.filter(f => {
    const k = (n - f.b) / f.life;
    if (k >= 1) { r.scene.remove(f.s); f.s.material.dispose(); return false; }
    f.s.scale.setScalar(lerp(f.from, f.to, 1 - Math.pow(1 - k, 2)));
    f.s.material.opacity = 1 - k;
    f.s.position.y += f.vy * dt;
    return true;
  });
  /* the gate, knocked flat */
  const G = W.gate; if (G && G.open && G.fall < 1) { G.fall = Math.min(1, G.fall + dt * 2); G.g.rotation.x = -G.fall * Math.PI / 2; G.g.position.y = G.y - G.fall * 20; }
}
function popup(r, text, at, color) {
  const el = doc.createElement('div'); el.className = 'bs-pop'; el.textContent = text; el.style.color = color;
  r.el.appendChild(el);
  W.pops = W.pops || []; W.pops.push({ el, at: at.clone(), b: now() });
}
function redStar(r) {
  if (!W.redAt) return;
  if (W.markerObj) { r.scene.remove(W.markerObj); W.markerObj = null; }
  const s = star(W.redAt.x, W.redAt.y, W.redAt.z, 'Find the 8 Red Coins');
  sparkle(r, W.redAt, 0xffe080); boom(r, W.redAt, false);
  r.api.say('RED', null, 'All 8 red coins! A Power Star appears by the Star Marker.');
  return s;
}

/* ══ THE HUD: lives, coins, stars, the power meter ═════════════ */
function hud(r) {
  const h = doc.createElement('div'); h.className = 'bs-hud';
  h.innerHTML = '<div class="hu-lives"><i class="ic-mario"></i><b>×4</b></div><div class="hu-coins"><i class="ic-coin"></i><b>×0</b></div>' +
    '<div class="hu-stars"><i class="ic-star">★</i><b>×0</b></div><canvas class="hu-power" width="140" height="140"></canvas>' +
    '<div class="bs-say"><p></p><i class="say-more">▼</i></div>';
  r.el.appendChild(h);
  W.hud = { h, lives: h.querySelector('.hu-lives b'), coins: h.querySelector('.hu-coins b'), stars: h.querySelector('.hu-stars b'), power: h.querySelector('.hu-power'), say: h.querySelector('.bs-say'), last: '' };
}
function hudStep(r, t) {
  const H = W.hud, g = r.game;
  if (!H) return;
  const sig = g.lives + '|' + g.coins + '|' + g.stars + '|' + g.hp;
  if (sig !== H.last) {
    /* the meter comes down when his health changes, not when a coin is got with it full */
    if (H.hp !== g.hp) { H.shownT = t; H.hp = g.hp; }
    H.last = sig;
    H.lives.textContent = '×' + g.lives; H.coins.textContent = '×' + g.coins; H.stars.textContent = '×' + g.stars;
    /* the power meter: eight wedges, blue to red as they go */
    const x = H.power.getContext('2d'), n = g.hp;
    x.clearRect(0, 0, 140, 140);
    x.fillStyle = '#1a2c6a'; x.beginPath(); x.arc(70, 70, 62, 0, TAU); x.fill();
    const col = n >= 7 ? '#2f7cff' : n >= 5 ? '#26c43a' : n >= 3 ? '#f2c21a' : '#f23a1a';
    for (let i = 0; i < 8; i++) {
      const a0 = -Math.PI / 2 + i / 8 * TAU, a1 = a0 + TAU / 8 - 0.06;
      x.fillStyle = i < n ? col : 'rgba(255,255,255,.08)';
      x.beginPath(); x.moveTo(70, 70); x.arc(70, 70, 56, a0, a1); x.closePath(); x.fill();
    }
    x.fillStyle = '#e8102a'; x.beginPath(); x.moveTo(70, 92); x.bezierCurveTo(44, 74, 46, 48, 70, 60); x.bezierCurveTo(94, 48, 96, 74, 70, 92); x.fill();
    x.strokeStyle = '#fff'; x.lineWidth = 4; x.beginPath(); x.arc(70, 70, 62, 0, TAU); x.stroke();
  }
  H.power.classList.toggle('on', g.hp < 8 || t - (H.shownT || 0) < 2.5 || (W.king && W.king.state !== 'wait' && W.king.state !== 'gone'));
  /* the numbers that float up off what was got */
  if (W.pops) W.pops = W.pops.filter(p => {
    const k = (now() - p.b) / 1.1;
    if (k >= 1) { p.el.remove(); return false; }
    _v.copy(p.at).setY(p.at.y + k * 160).project(r.cam);
    p.el.style.transform = 'translate(' + ((_v.x * 0.5 + 0.5) * r.W) + 'px,' + ((0.5 - _v.y * 0.5) * r.H) + 'px) translate(-50%,-50%) scale(' + (1 + 0.2 * Math.sin(k * Math.PI)) + ')';
    p.el.style.opacity = String(1 - k * k);
    return true;
  });
}

root.BobWorld = { build, step, hit, grab, release, floor, solid, talk, get W() { return W; }, text: id => (W && W.talk[id]) };

})(window, document);
