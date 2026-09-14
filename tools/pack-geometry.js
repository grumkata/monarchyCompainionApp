/* ══════════════════════════════════════════════════════════════
   pack-geometry.js — turns a baked pack's number literals into binary.

   WHAT IS WRONG WITH THE BAKED FORM
   ─────────────────────────────────
   tools/bake*.py writes vertices as decimal text inside a JavaScript object
   literal:

       "p":[0.4399,1.2643,-0.4406,0.4399,1.2643,-0.4406, ...]

   Every one of those numbers costs about seven characters, and every one of
   them is read by the JAVASCRIPT PARSER — the most general and most
   expensive text reader in the browser — to produce a double, which is then
   copied into a Float32Array and immediately truncated back to a float.
   Five megabytes of source to fill about a megabyte and a half of buffer.

   WHAT THIS WRITES INSTEAD
   ────────────────────────
   One binary blob per pack, base64'd once, and a JSON skeleton in which
   every array has become a descriptor saying where it lives in the blob and
   how to read it. At load:

     · ONE atob() for the whole pack, instead of the parser walking 5 MB;
     · JSON.parse for the skeleton — a far simpler grammar than JavaScript,
       and V8 reads it about twice as fast;
     · and then TYPED ARRAY VIEWS. An index buffer is not decoded at all,
       it is pointed at.

   PRECISION, AND WHY IT IS NOT A COMPROMISE
   ─────────────────────────────────────────
   Positions are 16-bit, normalised to each prim's OWN bounding box, so the
   error is that box over 65535 — on the two-metre table, three hundredths of
   a millimetre. Normals are 8-bit: they are renormalised in the shader and
   the eye does not resolve a degree of shading error on a barrel. UVs are
   16-bit over their own range.

   None of that is taken on trust. Every array is decoded straight back by
   the same arithmetic the browser will use and compared against the numbers
   it replaced, and pack() REFUSES to return a pack whose worst error is
   over tolerance — a bad quantisation fails the build instead of shipping
   as a subtly wrong barrel.

   ONLY THE GEOMETRY LITERAL IS TOUCHED. The replacement is spliced over
   that one span of the file, so the texture book beside it — and anything
   else the pack declares — comes through byte for byte. The pack files on
   disk are never written to: this runs in build.js, in memory, so re-baking
   a pack with the Python tools stays safe.
══════════════════════════════════════════════════════════════ */
'use strict';

const vm = require('vm');

/* Kinds. src/js/xx-geo-runtime.js must agree with these exactly. */
const F32 = 0;   // raw float32, viewed in place (unused today, kept for shape)
const I16 = 1;   // 16 bits per component over that component's own range
const I8N = 2;   // normals: 8 bits per component over [-1, 1]
const U16 = 3;   // indices, viewed in place
const U32 = 4;   // indices, viewed in place
const U8N = 5;   // one scalar channel (ao, vc) over its own range

/* Which fields get which treatment. Anything not named here is left exactly
   as it was — colours, material names, texture keys, the lot. */
const PLAN = {
  p:  { kind: I16, stride: 3 },
  n:  { kind: I8N, stride: 3 },
  u:  { kind: I16, stride: 2 },
  ao: { kind: U8N, stride: 1 },
  vc: { kind: U8N, stride: 1 },
  i:  { kind: U16, stride: 1 },   // promoted to U32 when it does not fit
};

/* Tolerances in the units the field is measured in. A position is judged
   against the SIZE OF ITS OWN PRIM, not an absolute distance — a millimetre
   is nothing on a wall and everything on a mug. */
const TOL_REL_POS = 1 / 20000;   // of the prim's own longest edge
const TOL_NORMAL  = 0.02;        // about 1.1 degrees
const TOL_REL_UV  = 1 / 20000;   // of the prim's own UV extent
const TOL_SCALAR  = 1 / 200;

// ── the blob ────────────────────────────────────────────────────
class Blob {
  constructor() { this.parts = []; this.at = 0; }
  /* Every array starts on a 4-byte boundary so the decoder can view it in
     place: a Float32Array or Uint32Array view whose byte offset is not a
     multiple of its element size throws, and getting it wrong is silent
     right up until it is not. */
  put(buf) {
    const pad = (4 - (this.at % 4)) % 4;
    if (pad) { this.parts.push(Buffer.alloc(pad)); this.at += pad; }
    const off = this.at;
    this.parts.push(buf);
    this.at += buf.length;
    return off;
  }
  done() { return Buffer.concat(this.parts); }
}

function minmax(a, stride, c) {
  let lo = Infinity, hi = -Infinity;
  for (let i = c; i < a.length; i += stride) {
    const v = a[i];
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return lo === Infinity ? [0, 0] : [lo, hi];
}

function extent(a, stride) {
  let worst = 0;
  for (let c = 0; c < stride; c++) {
    const [lo, hi] = minmax(a, stride, c);
    if (hi - lo > worst) worst = hi - lo;
  }
  return worst || 1;
}

/* Trip parameters are written as JSON text; full doubles would hand back
   some of what was just saved. Nine significant figures is well under a
   float's own precision, so this cannot be what loses accuracy. */
const short = x => Number(x.toPrecision(9));

function encodeArray(blob, src, plan) {
  const n = src.length;

  if (plan.kind === U16) {
    let max = 0;
    for (let i = 0; i < n; i++) if (src[i] > max) max = src[i];
    const wide = max > 65535;
    const buf = Buffer.alloc(n * (wide ? 4 : 2));
    for (let i = 0; i < n; i++) {
      if (wide) buf.writeUInt32LE(src[i], i * 4); else buf.writeUInt16LE(src[i], i * 2);
    }
    return { $: wide ? U32 : U16, o: blob.put(buf), n };
  }

  if (plan.kind === I8N) {
    const buf = Buffer.alloc(n);
    for (let i = 0; i < n; i++) {
      buf.writeInt8(Math.round(Math.max(-1, Math.min(1, src[i])) * 127), i);
    }
    return { $: I8N, o: blob.put(buf), n };
  }

  if (plan.kind === U8N) {
    const [lo, hi] = minmax(src, 1, 0);
    const sp = hi - lo;
    const buf = Buffer.alloc(n);
    for (let i = 0; i < n; i++) {
      buf.writeUInt8(sp > 0 ? Math.round(((src[i] - lo) / sp) * 255) : 0, i);
    }
    return { $: U8N, o: blob.put(buf), n, lo: [short(lo)], sp: [short(sp)] };
  }

  const stride = plan.stride, lo = [], sp = [];
  for (let c = 0; c < stride; c++) {
    const [a, b] = minmax(src, stride, c);
    lo.push(short(a)); sp.push(short(b - a));
  }
  const buf = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    const c = i % stride, span = sp[c];
    buf.writeUInt16LE(span > 0 ? Math.round(((src[i] - lo[c]) / span) * 65535) : 0, i * 2);
  }
  return { $: I16, o: blob.put(buf), n, lo, sp };
}

/* Decode exactly the way the runtime will, so the check is testing the real
   thing and not a second opinion about it. */
function decodeArray(bin, d) {
  const base = bin.byteOffset + d.o;
  if (!d.n) return [];
  if (d.$ === U16) return new Uint16Array(bin.buffer, base, d.n);
  if (d.$ === U32) return new Uint32Array(bin.buffer, base, d.n);
  const out = new Float32Array(d.n);
  if (d.$ === I8N) {
    const s = new Int8Array(bin.buffer, base, d.n);
    for (let i = 0; i < d.n; i++) out[i] = s[i] / 127;
    return out;
  }
  if (d.$ === U8N) {
    const s = new Uint8Array(bin.buffer, base, d.n);
    const lo = d.lo[0], sp = d.sp[0];
    for (let i = 0; i < d.n; i++) out[i] = lo + (s[i] / 255) * sp;
    return out;
  }
  const s = new Uint16Array(bin.buffer, base, d.n);
  const st = d.lo.length;
  for (let i = 0; i < d.n; i++) {
    const c = i % st;
    out[i] = d.lo[c] + (s[i] / 65535) * d.sp[c];
  }
  return out;
}

// ── finding the literal in the source ───────────────────────────
/* The span of the object literal assigned to `name`, so the replacement can
   be spliced over exactly that and nothing else. */
function literalSpan(src, name) {
  /* Both forms the bakers emit: `const WOOD = {` and `window.CASTLE={`. The
     leading guard stops WOOD matching inside WOOD_TEX or a comment's prose. */
  const decl = new RegExp('(^|[^\\w$])(?:window\\s*\\.\\s*)?' + name + '\\s*=\\s*\\{', 'm');
  const m = decl.exec(src);
  if (!m) return null;
  const open = src.indexOf('{', m.index);
  let depth = 0, inStr = false, esc = false;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{') depth++;
    else if (c === '}') { if (--depth === 0) return [open, i + 1]; }
  }
  return null;
}

/* Run the emitted file the way the browser will — with the REAL decoder,
   src/js/00-geo-runtime.js, not a copy of it — and count how many prims
   came back as typed arrays. Anything still a plain Array is a prim the
   splice missed. */
let RUNTIME = null;
function probe(js, name) {
  if (RUNTIME === null) {
    try {
      RUNTIME = require('fs').readFileSync(
        require('path').join(__dirname, '..', 'src/js/00-geo-runtime.js'), 'utf8');
    } catch (e) { RUNTIME = ''; }
  }
  if (!RUNTIME) return { error: 'could not be checked: 00-geo-runtime.js is missing' };

  const sandbox = {
    atob: s => Buffer.from(s, 'base64').toString('binary'),
    ArrayBuffer, Uint8Array, Uint16Array, Uint32Array, Int8Array, Float32Array,
    /* enough THREE for the decoder's setIndex widening to install itself */
    THREE: { BufferAttribute: function (a, n) { this.array = a; this.itemSize = n; },
             BufferGeometry: function () {} },
    __out: {}
  };
  sandbox.THREE.BufferGeometry.prototype.setIndex = function (i) { this.index = i; return this; };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  try {
    new vm.Script(RUNTIME + '\n' + js +
      '\n;__out.v=(typeof ' + name + '!=="undefined")?' + name + ':window.' + name + ';',
      { filename: 'packed:' + name }).runInContext(sandbox);
  } catch (e) { return { error: 'would not run (' + e.message + ')' }; }

  let packed = 0, plain = 0;
  (function walk(o) {
    if (!o || typeof o !== 'object') return;
    if (!Array.isArray(o) && o.p && o.p.length && typeof o.p[0] === 'number') {
      if (ArrayBuffer.isView(o.p)) packed++; else plain++;
      return;
    }
    if (Array.isArray(o)) { o.forEach(walk); return; }
    for (const k in o) walk(o[k]);
  })(sandbox.__out.v);
  return { packed, plain };
}

/*
 * pack(source, name) -> { js, stats } | { error } | null
 *
 * `source` is the pack file's text, `name` the geometry global it declares.
 * Returns the whole file back with only that literal replaced.
 */
function pack(source, name) {
  /* Run the pack to get the real object. Every one of these files is a
     single assignment of data with no side effects, so this is simply the
     cheapest correct parser available. */
  const sandbox = { window: {}, __out: {} };
  vm.createContext(sandbox);
  /* The grab line matters. A pack written `const WOOD = {...}` creates a
     LEXICAL binding, which lives in the script's own scope and never appears
     on the context object — read sandbox.WOOD afterwards and it is undefined,
     which is exactly how the first version of this quietly packed nothing.
     A statement appended to the same script can still see it. */
  try {
    new vm.Script(source + '\n;__out.v=(typeof ' + name + '!=="undefined")?' +
                  name + ':(window&&window.' + name + ');')
      .runInContext(sandbox);
  } catch (e) { return { error: 'would not run: ' + e.message }; }

  const obj = sandbox.__out.v;
  if (obj === undefined || obj === null) return { error: 'declares no ' + name };

  const span = literalSpan(source, name);
  if (!span) return { error: 'cannot find the literal for ' + name };

  const blob = new Blob();
  const checks = [];                       /* verified after the blob is whole */
  const stats = { arrays: 0, numbers: 0, wasText: 0, prims: 0 };

  function doPrim(pr, where) {
    stats.prims++;
    /* The yardstick for this prim's own error, measured before anything is
       replaced. */
    const posScale = Array.isArray(pr.p) && pr.p.length ? extent(pr.p, 3) : 1;
    const uvScale  = Array.isArray(pr.u) && pr.u.length ? extent(pr.u, 2) : 1;
    for (const f in PLAN) {
      const src = pr[f];
      if (!Array.isArray(src) || !src.length) continue;
      const d = encodeArray(blob, src, PLAN[f]);
      stats.arrays++;
      stats.numbers += src.length;
      stats.wasText += JSON.stringify(src).length;
      checks.push({ d, src, f, where,
        tol: f === 'p' ? TOL_REL_POS * posScale
           : f === 'n' ? TOL_NORMAL
           : f === 'u' ? TOL_REL_UV * uvScale
           : f === 'i' ? 0
           :             TOL_SCALAR });
      pr[f] = d;
    }
  }

  /* ── FINDING THE PRIMS ────────────────────────────────────
     By SHAPE, not by the name of whatever holds them. The packs do not
     agree on a layout: TAVERN and WOOD hang theirs off `.prims`, CASTLE
     nests that again under `.parts`, CHEST keys arrays of them by part
     name ("base", "lid") with no wrapper at all, and DICE_ASSETS makes
     each die's prim the value itself. Looking for `.prims` found the
     first two and silently skipped the other two — which is exactly what
     the first version of this did.

     A prim is anything carrying a numeric `p`. Nothing else in these
     files does. */
  const isPrim = o => o && typeof o === 'object' && !Array.isArray(o) &&
                      Array.isArray(o.p) && o.p.length && typeof o.p[0] === 'number';
  (function walk(o, where) {
    if (!o || typeof o !== 'object') return;
    if (isPrim(o)) { doPrim(o, where); return; }
    if (Array.isArray(o)) { o.forEach((v, i) => walk(v, where + '[' + i + ']')); return; }
    for (const k in o) walk(o[k], where + '.' + k);
  })(obj, name);

  if (!stats.arrays) return null;

  /* ── the check ─────────────────────────────────────────────
     Once, over the finished blob. Doing it per array would mean
     concatenating the whole thing on every array, which is quadratic and
     was in fact the first version of this file. */
  const bin = blob.done();
  const worst = {};
  for (const c of checks) {
    const back = decodeArray(bin, c.d);
    let bad = 0;
    for (let i = 0; i < c.src.length; i++) {
      const e = Math.abs(back[i] - c.src[i]);
      if (e > bad) bad = e;
    }
    if (bad > c.tol) {
      return { error: `${c.where}.${c.f}: worst error ${bad.toExponential(2)} ` +
                      `over tolerance ${c.tol.toExponential(2)}` };
    }
    const rel = c.f === 'p' || c.f === 'u' ? bad / (c.tol / (c.f === 'p' ? TOL_REL_POS : TOL_REL_UV)) : bad;
    if (!(c.f in worst) || rel > worst[c.f]) worst[c.f] = rel;
  }

  const b64 = bin.toString('base64');
  stats.nowText = b64.length + JSON.stringify(obj).length;
  stats.worst = worst;

  const js = source.slice(0, span[0]) +
             '__geo(' + JSON.stringify(obj) + ',__geoBlob("' + b64 + '"))' +
             source.slice(span[1]);

  /* ── AND THE EMITTED FILE HAS TO ACTUALLY BE THE PACKED ONE ──
     Everything above checks the NUMBERS, in memory. Nothing above checks
     the TEXT, and the text is spliced: literalSpan finds the literal with
     a regex over the whole file and takes the first match, so prose in a
     header comment reading `TAVERN = {`, or a future baker emitting a
     second assignment, cuts the wrong span.

     Parsing the result is not enough, and it is worth saying why, because
     parsing it was the first fix and it did not work. Splice into the
     middle of a COMMENT and the output parses perfectly — the blob lands
     in the comment, the real literal below it is untouched, and you get a
     file that behaves correctly, is bigger than it started, and reports a
     saving. Silent, and invisible to every other net: the element-wise
     check is testing the in-memory object, build.js's try/catch only sees
     throws from in here, and build.js writes dist/monarchy.html regardless.

     So run the emitted file and look at what it actually defines. If the
     splice landed, every prim's `p` comes back a Float32Array from the
     decoder; if it landed anywhere else, the original literal is still in
     force and `p` is a plain Array. That distinction catches both the
     broken splice and the silent one. */
  const seen = probe(js, name);
  if (seen.error) return { error: 'packed output ' + seen.error };
  if (seen.packed !== stats.prims) {
    return { error: `splice did not take — ${seen.packed} of ${stats.prims} prims ` +
                    `came back packed; literalSpan cut the wrong span ` +
                    `(prose reading "${name} = {" in a comment will do this)` };
  }

  return { js, stats };
}

module.exports = { pack };
