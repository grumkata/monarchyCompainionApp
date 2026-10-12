/* ═══════════════════════════════════════════════════════════════
   THE DICE FORGE
   Every die on the wood is made here, in code, from the exact solid:
   a tetrahedron, cube, octahedron, pentagonal trapezohedron, dodecahedron
   and icosahedron, each with its edges rounded off and its numbers painted
   on its own faces (and the d6 given its pips). The coin is a thick coin
   with a crown on one side and a shield on the other.

   THIS REPLACED THE KAYKIT MODELS. grumkata: "the dice rn LOOK bad".
   They were one flat butter-yellow in a soft toy shape, orange numerals on
   yellow that read as an "h" for a 4, and the d10 and d12 were built apart
   from the rest and did not match. One builder makes the whole set now, so
   they cannot disagree.

   WHAT 34-gl-pieces.js GETS BACK is the one thing the throw needs of a die:
     group   the thing to draw
     lands   lands[v-1] = the outward normal of the face that shows v
             (a d4 is read at its apex, so for a d4 it is the corner;
              the coin is [Heads up, Tails down])
     geo     the shape, for the physics to measure
   The throw's numbers, its landing and its tests do not know or care how the
   faces were made — only that the face in lands[v-1] is the one painted v.

   HOW A ROUNDED SOLID IS MADE. The solid is shrunk a little, then every
   direction that could touch it (each face, two steps round each edge, each
   corner) gets a plane held `r` away from the shrunk solid. The body is the
   space inside all of those planes: flat faces where the numbers go, small
   facets where the edges roll off. The planes are cut against each other, so
   there is no mesh to sew and no vertex to get wrong.

   ONE TEXTURE PER KIND OF DIE holds a cell per face (the numeral, or the
   pips) and one plain cell for every facet between them. The same picture is
   the bump map, so the numerals are cut into the resin rather than printed on.
═══════════════════════════════════════════════════════════════ */
(function(){
const V3 = THREE.Vector3;
const v3 = (x, y, z) => new V3(x, y, z);

/* THE SET: dark red resin, gold ink. Change these two and the whole set follows. */
const RESIN = '#7a1320', INK = '#f3c95f';

/* how far the edges are rounded, and the distance from the middle to the nearest
   face (what the die stands on). The sizes are what the models this replaced had,
   so the throw keeps its feel. */
const ROUND = { 4: 0.05, 6: 0.11, 8: 0.06, 10: 0.05, 12: 0.07, 20: 0.05 };
const INRAD = { 4: 0.514, 6: 1.0, 8: 0.60, 12: 0.80, 20: 0.82 };       // the d10 keeps its own proportions

const PHI = (1 + Math.sqrt(5)) / 2;
const SIGNS = [-1, 1];
/* A SYSTEM FACE ON PURPOSE. The table's own display font (Cinzel) may not be loaded yet
   when a die is first drawn, and the picture is drawn once and kept: the dice would come
   out in whatever the browser fell back to, which is Georgia, whose figures hang below the
   line (3 4 5 7 9) and make a number look crooked. Cambria's sit level. */
const FONT = '"Cambria", "Times New Roman", serif';

/* ── the solids, by their corners ── */
function corners(kind){
  const V = [];
  if (kind === 4){
    [[1,1,1],[1,-1,-1],[-1,1,-1],[-1,-1,1]].forEach(a => V.push(v3(a[0], a[1], a[2])));
  } else if (kind === 6){
    SIGNS.forEach(x => SIGNS.forEach(y => SIGNS.forEach(z => V.push(v3(x, y, z)))));
  } else if (kind === 8){
    V.push(v3(1,0,0), v3(-1,0,0), v3(0,1,0), v3(0,-1,0), v3(0,0,1), v3(0,0,-1));
  } else if (kind === 12){
    SIGNS.forEach(x => SIGNS.forEach(y => SIGNS.forEach(z => V.push(v3(x, y, z)))));
    SIGNS.forEach(a => SIGNS.forEach(b => {
      V.push(v3(0, a / PHI, b * PHI), v3(a / PHI, b * PHI, 0), v3(b * PHI, 0, a / PHI));
    }));
  } else if (kind === 20){
    SIGNS.forEach(a => SIGNS.forEach(b => {
      V.push(v3(0, a, b * PHI), v3(a, b * PHI, 0), v3(b * PHI, 0, a));
    }));
  } else {
    /* d10: two apexes and a ten-point equator that zigzags up and down, cut into
       ten kites. The apex height is solved so each kite is flat — at any other
       height every "face" is two triangles at slightly different angles. */
    const R = 0.965, C = 0.106;
    const E = [];
    for (let j = 0; j < 10; j++){
      const a = j * Math.PI / 5;
      E.push(v3(Math.cos(a) * R, (j % 2 ? -C : C), Math.sin(a) * R));
    }
    const n = new V3().crossVectors(new V3().subVectors(E[1], E[0]), new V3().subVectors(E[2], E[0]));
    const H = E[0].y + (n.x * E[0].x + n.z * E[0].z) / n.y;
    V.push(v3(0, H, 0), v3(0, -H, 0), ...E);
  }
  return V;
}

/* the flat faces of a convex solid: every plane through three corners that has
   all the others on one side of it */
function faceNormals(V){
  const N = [];
  for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++) for (let k = j + 1; k < V.length; k++){
    const n = new V3().crossVectors(new V3().subVectors(V[j], V[i]), new V3().subVectors(V[k], V[i]));
    if (n.lengthSq() < 1e-10) continue;
    n.normalize();
    const d = n.dot(V[i]);
    let pos = 0, neg = 0;
    for (const v of V){ const e = n.dot(v) - d; if (e > 1e-6) pos++; else if (e < -1e-6) neg++; }
    if (pos && neg) continue;
    if (pos) n.negate();
    if (N.some(m => m.dot(n) > 0.9999)) continue;
    N.push(n);
  }
  return N;
}

/* the planes that cut the rounded body: [{n, d}], the first N.length of them being the faces */
function bodyPlanes(V, N, r){
  const d0 = Math.min(...N.map(n => Math.max(...V.map(v => v.dot(n)))));
  const s = (d0 - r) / d0;
  const Vi = V.map(v => v.clone().multiplyScalar(s));
  const planes = [];
  const add = u => {
    u = u.clone().normalize();
    let h = -Infinity;
    for (const v of Vi) h = Math.max(h, v.dot(u));
    const d = h + r;
    if (planes.some(p => p.n.dot(u) > 0.99999 && Math.abs(p.d - d) < 1e-6)) return;
    planes.push({ n: u, d });
  };
  N.forEach(n => add(n));
  /* two steps round every edge: a pair of faces that share two corners */
  const on = N.map(n => {
    const d = Math.max(...V.map(v => v.dot(n)));
    return V.map((v, i) => Math.abs(v.dot(n) - d) < 1e-4 ? i : -1).filter(i => i >= 0);
  });
  for (let a = 0; a < N.length; a++) for (let b = a + 1; b < N.length; b++){
    if (on[a].filter(i => on[b].includes(i)).length < 2) continue;
    [1 / 3, 2 / 3].forEach(t => add(N[a].clone().multiplyScalar(1 - t).addScaledVector(N[b], t)));
  }
  V.forEach(v => add(v));
  return { planes, on };
}

/* one plane's outline, with every other plane cut out of it */
function outline(i, planes){
  const { n, d } = planes[i];
  const t = Math.abs(n.x) < 0.9 ? v3(1, 0, 0) : v3(0, 1, 0);
  const u = new V3().crossVectors(n, t).normalize();
  const w = new V3().crossVectors(n, u);
  const c = n.clone().multiplyScalar(d), B = 40;
  let poly = [
    c.clone().addScaledVector(u, -B).addScaledVector(w, -B),
    c.clone().addScaledVector(u,  B).addScaledVector(w, -B),
    c.clone().addScaledVector(u,  B).addScaledVector(w,  B),
    c.clone().addScaledVector(u, -B).addScaledVector(w,  B)
  ];
  for (let j = 0; j < planes.length && poly.length >= 3; j++){
    if (j === i) continue;
    const m = planes[j].n, e = planes[j].d, out = [];
    for (let k = 0; k < poly.length; k++){
      const a = poly[k], b = poly[(k + 1) % poly.length];
      const da = m.dot(a) - e, db = m.dot(b) - e;
      if (da <= 1e-9) out.push(a);
      if ((da < -1e-9 && db > 1e-9) || (da > 1e-9 && db < -1e-9)) out.push(a.clone().lerp(b, da / (da - db)));
    }
    poly = out;
  }
  const clean = poly.filter((p, k) => p.distanceToSquared(poly[(k + 1) % poly.length]) > 1e-10);
  return clean.length >= 3 ? clean : null;
}

/* ── the pictures ── */
const mid = pts => pts.reduce((a, p) => a.add(p), new V3()).divideScalar(pts.length);

function pips(x, n, cx, cy, w){
  const o = 0.52 * w, pr = 0.2 * w;
  const at = {
    1: [[0, 0]], 2: [[-1, 1], [1, -1]], 3: [[-1, 1], [0, 0], [1, -1]],
    4: [[-1, 1], [1, 1], [-1, -1], [1, -1]], 5: [[-1, 1], [1, 1], [0, 0], [-1, -1], [1, -1]],
    6: [[-1, 1], [1, 1], [-1, 0], [1, 0], [-1, -1], [1, -1]]
  }[n];
  x.fillStyle = INK;
  at.forEach(p => { x.beginPath(); x.arc(cx + p[0] * o, cy - p[1] * o, n === 1 ? pr * 1.35 : pr, 0, 6.2832); x.fill(); });
}

function numeral(x, txt, cx, cy, size, rot){
  x.save();
  x.translate(cx, cy); if (rot) x.rotate(rot);
  x.fillStyle = INK; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = '700 ' + size + 'px ' + FONT;
  x.fillText(txt, 0, size * 0.04);
  if (txt === '6' || txt === '9'){ const w = size * 0.5; x.fillRect(-w / 2, size * 0.46, w, Math.max(2, size * 0.07)); }
  x.restore();
}

/* a die: its geometry, its picture, and which face is which */
function polyhedron(kind){
  const V = corners(kind);
  let N = faceNormals(V);
  if (kind === 6){
    /* 1 on +z, and 2 3 4 5 6 around so that opposite faces make seven and 1-2-3
       runs anticlockwise round a corner, as it does on a bought die */
    const want = [v3(0,0,1), v3(1,0,0), v3(0,1,0), v3(0,-1,0), v3(-1,0,0), v3(0,0,-1)];
    N = want.map(w => N.find(n => n.dot(w) > 0.99));
  }
  if (INRAD[kind]){
    const k = INRAD[kind] / Math.min(...N.map(n => Math.max(...V.map(v => v.dot(n)))));
    V.forEach(v => v.multiplyScalar(k));
  }
  const r = ROUND[kind];
  const { planes, on } = bodyPlanes(V, N, r);
  const polys = planes.map((p, i) => outline(i, planes));

  /* which number each face shows */
  const val = new Array(N.length).fill(0);
  if (kind === 6) N.forEach((n, i) => { val[i] = i + 1; });
  else if (kind === 10){
    let d = 0;
    N.forEach((n, i) => {
      if (val[i]) return;
      const o = N.findIndex(m => m.dot(n) < -0.999);
      val[i] = d || 10; val[o] = 9 - d; d++;
    });
  } else if (kind !== 4){
    let next = 1;
    N.forEach((n, i) => {
      if (val[i]) return;
      while (val.includes(next)) next++;
      const o = N.findIndex(m => m.dot(n) < -0.999);
      val[i] = next; if (o >= 0) val[o] = kind + 1 - next;
    });
  }

  /* each face's own two axes, for laying a numeral on it */
  const faces = N.map((n, i) => {
    const p = polys[i], c = mid(p);
    let ref = p[0];
    if (kind === 10) p.forEach(q => { if (Math.abs(q.y) > Math.abs(ref.y)) ref = q; });
    const up = new V3().subVectors(ref, c).normalize();
    const right = new V3().crossVectors(up, n);
    let rin = Infinity;
    for (let k = 0; k < p.length; k++){
      const a = p[k], b = p[(k + 1) % p.length];
      const e = new V3().subVectors(b, a).normalize();
      const q = new V3().subVectors(c, a);
      rin = Math.min(rin, q.addScaledVector(e, -q.dot(e)).length());
    }
    return { n, c, p, up, right, rin, cell: i };
  });
  let S = 0;
  faces.forEach(f => f.p.forEach(q => {
    const d = new V3().subVectors(q, f.c);
    S = Math.max(S, Math.abs(d.dot(f.right)), Math.abs(d.dot(f.up)));
  }));
  S *= 1.06;

  /* the picture: a cell for every face and one plain cell for every facet */
  const W = 1024, cells = faces.length + 1, cols = Math.ceil(Math.sqrt(cells)), cell = W / cols;
  const cv = document.createElement('canvas'); cv.width = cv.height = W;
  const x = cv.getContext('2d');
  x.fillStyle = RESIN; x.fillRect(0, 0, W, W);
  const k = cell / (2 * S);                                   // pixels per unit of the solid
  const origin = c => [(c % cols) * cell, Math.floor(c / cols) * cell];
  faces.forEach((f, i) => {
    const o = origin(f.cell), cx = o[0] + cell / 2, cy = o[1] + cell / 2, rp = f.rin * k;
    if (kind === 6) pips(x, val[i], cx, cy, rp);
    else if (kind === 4){
      on[i].forEach(vi => {
        const d = new V3().subVectors(V[vi], f.c);
        const px = d.dot(f.right) * k, py = d.dot(f.up) * k;
        numeral(x, String(vi + 1), cx + px * 0.56, cy - py * 0.56, rp * 1.0, Math.atan2(px, py));
      });
    } else {
      const txt = String(kind === 10 ? val[i] % 10 : val[i]);
      numeral(x, txt, cx, cy, Math.min(cell * 0.5, rp * (txt.length > 1 ? 1.2 : 1.7)));
    }
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.encoding = THREE.sRGBEncoding; tex.flipY = false; tex.anisotropy = 8;

  /* the mesh: every outline, fanned, flat-shaded, with its cell */
  const pos = [], nor = [], uv = [], idx = [];
  const blank = origin(faces.length);
  polys.forEach((p, i) => {
    if (!p) return;
    const f = faces[i], n = planes[i].n, base = pos.length / 3;
    p.forEach(q => {
      pos.push(q.x, q.y, q.z); nor.push(n.x, n.y, n.z);
      if (f){
        const d = new V3().subVectors(q, f.c), o = origin(f.cell);
        uv.push((o[0] + (0.5 + d.dot(f.right) / (2 * S)) * cell) / W, (o[1] + (0.5 - d.dot(f.up) / (2 * S)) * cell) / W);
      } else uv.push((blank[0] + cell / 2) / W, (blank[1] + cell / 2) / W);
    });
    for (let j = 1; j < p.length - 1; j++) idx.push(base, base + j, base + j + 1);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal',   new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);

  /* which way each result points: a face, or for a d4 the corner it is read at */
  const lands = new Array(kind);
  if (kind === 4) V.forEach((v, i) => { lands[i] = v.clone().normalize(); });
  else faces.forEach((f, i) => { lands[val[i] - 1] = f.n.clone(); });

  const mat = glaze(new THREE.MeshStandardMaterial({
    map: tex, bumpMap: tex, bumpScale: -1.2, roughness: 0.3, metalness: 0.06, envMapIntensity: 1.1 }));
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geo, mat));
  return { group, lands, geo };
}

/* ── the coin ── */
function emblem(face){
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d'), m = S / 2;
  const g = x.createRadialGradient(m, m, 20, m, m, m);
  g.addColorStop(0, '#d7a73a'); g.addColorStop(1, '#a87a1c');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  const gild = '#f6d77f', edge = '#7a520f';
  x.lineJoin = 'round';
  /* a ring of beads inside a plain ring. No lettering: at the size a coin is on the
     wood it is only noise. */
  x.fillStyle = gild;
  for (let a = 0; a < 6.2832; a += 6.2832 / 44){ x.beginPath(); x.arc(m + Math.cos(a) * 224, m + Math.sin(a) * 224, 9, 0, 6.2832); x.fill(); }
  x.lineWidth = 9; x.strokeStyle = gild;
  x.beginPath(); x.arc(m, m, 188, 0, 6.2832); x.stroke();
  x.lineWidth = 8; x.strokeStyle = edge; x.fillStyle = gild;
  if (face === 'heads'){
    /* a crown: three points, a band, three pearls on the points, three jewels on the band */
    x.save(); x.translate(m, m + 14); x.scale(1.2, 1.2);
    x.beginPath();
    x.moveTo(-100, 60); x.lineTo(-118, -50); x.lineTo(-58, 0); x.lineTo(0, -80);
    x.lineTo(58, 0); x.lineTo(118, -50); x.lineTo(100, 60); x.closePath();
    x.fill(); x.stroke();
    x.beginPath(); x.rect(-104, 44, 208, 44); x.fill(); x.stroke();
    [[-118, -62], [0, -94], [118, -62]].forEach(p => { x.beginPath(); x.arc(p[0], p[1], 15, 0, 6.2832); x.fill(); x.stroke(); });
    x.fillStyle = edge;
    [-60, 0, 60].forEach(px => { x.beginPath(); x.arc(px, 66, 11, 0, 6.2832); x.fill(); });
    x.restore();
  } else {
    /* a shield, with a cross */
    const shield = () => {
      x.beginPath();
      x.moveTo(-86, -104); x.lineTo(86, -104); x.lineTo(86, 8);
      x.bezierCurveTo(86, 74, 42, 108, 0, 128); x.bezierCurveTo(-42, 108, -86, 74, -86, 8);
      x.closePath();
    };
    x.save(); x.translate(m, m - 4); x.scale(1.2, 1.2);
    shield(); x.fill(); x.stroke();
    x.save(); shield(); x.clip();
    x.fillStyle = '#b8861f';
    x.fillRect(-19, -104, 38, 240); x.fillRect(-86, -62, 172, 38);
    x.restore();
    shield(); x.stroke();
    x.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
  return t;
}

function coin(){
  const h = 0.17, f = h - 0.03, RC = 0.80;
  /* the rim, drawn bottom to top so it faces outward: a raised ridge round the field */
  const rim = [[RC, -f], [0.83, -h], [0.92, -h], [0.975, -h * 0.8], [1.0, -h * 0.45],
               [1.0, h * 0.45], [0.975, h * 0.8], [0.92, h], [0.83, h], [RC, f]]
    .map(p => new THREE.Vector2(p[0], p[1]));
  const metal = (extra) => glaze(new THREE.MeshStandardMaterial(Object.assign(
    { color: 0xe3b24a, metalness: 0.85, roughness: 0.32, envMapIntensity: 1.25 }, extra)));
  const group = new THREE.Group();
  group.add(new THREE.Mesh(new THREE.LatheGeometry(rim, 56), metal()));
  const heads = emblem('heads'), tails = emblem('tails');
  const top = new THREE.Mesh(new THREE.CircleGeometry(RC, 56).rotateX(-Math.PI / 2),
    metal({ color: 0xffffff, map: heads, bumpMap: heads, bumpScale: 1.5 }));
  top.position.y = f;
  const bot = new THREE.Mesh(new THREE.CircleGeometry(RC, 56).rotateX(Math.PI / 2),
    metal({ color: 0xffffff, map: tails, bumpMap: tails, bumpScale: 1.5 }));
  bot.position.y = -f;
  group.add(top, bot);
  return { group, lands: [v3(0, 1, 0), v3(0, -1, 0)],
           geo: new THREE.CylinderGeometry(1, 1, 2 * h, 32) };          // what the physics measures
}

/* the table's banded light, where it is loaded (the same wrap 34-gl-pieces uses) */
const glaze = m => window.Blazon3D ? window.Blazon3D.cel(m, { room: 'tavern', steps: 5, tint: 0.16, rim: 0.26 }) : m;

window.DiceForge = {
  build: kind => kind === 'coin' ? coin() : polyhedron(kind)
};
})();
