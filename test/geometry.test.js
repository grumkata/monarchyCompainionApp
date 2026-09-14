/* geometry.test.js — the packed vertices still say what the bake said.
   Loads the REAL browser decoder (src/js/00-geo-runtime.js — the same file
   the page runs, not a reimplementation of it), feeds it the packed output,
   and compares every element against the original number literals.

   This is the check that matters: the packer verifies its own arithmetic in
   Node, but the browser runs a second implementation, and a disagreement
   between the two is precisely where a packed-asset bug would live. */
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..');
const { pack } = require(path.join(ROOT, 'tools/pack-geometry.js'));

const PACKS = {
  '01-castle-assets.js': 'CASTLE', '20-chest-asset.js': 'CHEST',
  '19-bin-asset.js': 'BIN3D', '17-wood-assets.js': 'WOOD',
  '18-bits-assets.js': 'BITS', '33-dice-assets.js': 'DICE_ASSETS',
  '35-kit-assets.js': 'KIT', '52-room-assets.js': 'ROOM',
  '53-tavern-assets.js': 'TAVERN'
};

/* A minimal THREE so the decoder's setIndex widening can install itself. */
function threeStub() {
  class BufferAttribute { constructor(a, n) { this.array = a; this.itemSize = n; } }
  class BufferGeometry { setIndex(i) { this.index = i; return this; } }
  return { BufferAttribute, BufferGeometry, REVISION: 'stub' };
}

function run(source, extra) {
  const sandbox = Object.assign({ window: null, atob: s => Buffer.from(s, 'base64').toString('binary'),
                                  ArrayBuffer, Uint8Array, Uint16Array, Uint32Array,
                                  Int8Array, Float32Array, __out: {} }, extra);
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  new vm.Script(source).runInContext(sandbox);
  return sandbox;
}

const runtime = fs.readFileSync(path.join(ROOT, 'src/js/00-geo-runtime.js'), 'utf8');
let grandWorst = {}, grandN = 0, fail = [];

for (const [file, name] of Object.entries(PACKS)) {
  const src = fs.readFileSync(path.join(ROOT, 'src/js', file), 'utf8');

  /* the originals, straight from the baked pack */
  const a = run(src + '\n;__out.v=(typeof ' + name + '!=="undefined")?' + name + ':window.' + name + ';');
  const orig = a.__out.v;

  /* the packed form, decoded by the browser's own decoder */
  const r = pack(src, name);
  if (!r || r.error) { fail.push(file + ': ' + (r && r.error)); continue; }
  const b = run(threeStubPrelude() + runtime + '\n' + r.js +
                '\n;__out.v=(typeof ' + name + '!=="undefined")?' + name + ':window.' + name + ';');
  const got = b.__out.v;

  /* walk both in lockstep */
  const worst = {}, counts = {};
  let prims = 0;
  const isPrim = o => o && typeof o === 'object' && !Array.isArray(o) &&
                      (Array.isArray(o.p) || ArrayBuffer.isView(o.p)) && o.p.length &&
                      typeof o.p[0] === 'number';
  (function cmp(x, y, where) {
    if (!x || typeof x !== 'object') return;
    if (isPrim(x)) {
      [[x, y]].forEach(([px, py], i) => {
        prims++;
        for (const f of ['p', 'n', 'u', 'i', 'ao', 'vc']) {
          const A = px[f], B = py[f];
          if (!A) continue;
          if (!B || A.length !== B.length) { fail.push(`${name}${where}[${i}].${f}: length ${A && A.length} vs ${B && B.length}`); continue; }
          counts[f] = (counts[f] || 0) + A.length;
          let bad = 0;
          for (let k = 0; k < A.length; k++) { const e = Math.abs(A[k] - B[k]); if (e > bad) bad = e; }
          /* scale positions and UVs by the prim's own extent, as the
             quantiser did — a millimetre means nothing on a wall and
             everything on a mug */
          let scale = 1;
          if (f === 'p' || f === 'u') {
            const st = f === 'p' ? 3 : 2;
            for (let c = 0; c < st; c++) {
              let lo = Infinity, hi = -Infinity;
              for (let k = c; k < A.length; k += st) { if (A[k] < lo) lo = A[k]; if (A[k] > hi) hi = A[k]; }
              if (hi - lo > scale - 1) scale = Math.max(scale, hi - lo);
            }
          }
          const rel = bad / (scale || 1);
          if (!(f in worst) || rel > worst[f]) worst[f] = rel;
          if (!(f in grandWorst) || rel > grandWorst[f]) grandWorst[f] = rel;
        }
      });
      return;
    }
    if (Array.isArray(x)) { x.forEach((v, i) => cmp(v, y[i], where + '[' + i + ']')); return; }
    for (const k in x) cmp(x[k], y[k], where + '.' + k);
  })(orig, got, '');

  grandN += prims;
  const t = Object.entries(counts).map(([f, n]) => f + ':' + n.toLocaleString()).join('  ');
  console.log(`  ${name.padEnd(12)} ${String(prims).padStart(3)} prims   ` +
    Object.entries(worst).map(([f, v]) => f + ' ' + v.toExponential(1)).join('  ').padEnd(46) + t);
}

function threeStubPrelude() {
  return `var THREE = { BufferAttribute: function(a,n){this.array=a;this.itemSize=n;},
                         BufferGeometry: function(){} };
          THREE.BufferGeometry.prototype.setIndex = function(i){ this.index=i; return this; };`;
}

console.log('\n  worst error, all packs:');
for (const [f, v] of Object.entries(grandWorst)) {
  const label = f === 'p' ? 'positions (of prim extent)' : f === 'n' ? 'normals (absolute)'
              : f === 'u' ? 'UVs (of prim extent)' : f === 'i' ? 'indices (absolute)' : f;
  console.log(`    ${f}  ${v.toExponential(2).padStart(9)}   ${label}`);
}
console.log('  ' + grandN + ' prims checked');
console.log(fail.length ? '\n  FAILURES:\n    ' + fail.slice(0, 10).join('\n    ') : '\n  no failures');
process.exit(fail.length ? 1 : 0);
