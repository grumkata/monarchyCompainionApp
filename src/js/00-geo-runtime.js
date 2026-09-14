/* ══════════════════════════════════════════════════════════════
   00-geo-runtime.js — reading the packed geometry back.

   Loaded before any pack, and before nothing else needs it. The other half
   of this is tools/pack-geometry.js, which build.js runs over each pack on
   the way in; the two files share a numbering and MUST be changed together.

   Nothing in the app knows this happened. A prim still has .p, .n, .u, .i
   and they still hold the same numbers — they simply arrive as typed arrays
   over one decoded blob instead of as five megabytes of decimal text the
   JavaScript parser had to read one digit at a time.
══════════════════════════════════════════════════════════════ */
(function (root) {
'use strict';

/* Must match tools/pack-geometry.js */
var F32 = 0, I16 = 1, I8N = 2, U16 = 3, U32 = 4, U8N = 5;

/* base64 -> bytes. This is the one linear pass over the pack, and it is the
   whole reason the packed form is faster: atob does in a tight native loop
   what the JS parser was doing with a general-purpose tokeniser. */
root.__geoBlob = function (b64) {
  var s = atob(b64), n = s.length, b = new Uint8Array(n);
  for (var i = 0; i < n; i++) b[i] = s.charCodeAt(i);
  return b;
};

function read(bin, d) {
  var base = bin.byteOffset + d.o, n = d.n, i, out;
  if (!n) return [];

  /* Indices are not decoded at all — the bytes ARE the buffer the card
     wants, so this is a view over them and costs nothing. */
  if (d.$ === U16) return new Uint16Array(bin.buffer, base, n);
  if (d.$ === U32) return new Uint32Array(bin.buffer, base, n);
  if (d.$ === F32) return new Float32Array(bin.buffer, base, n);

  out = new Float32Array(n);
  if (d.$ === I8N) {
    var s8 = new Int8Array(bin.buffer, base, n);
    for (i = 0; i < n; i++) out[i] = s8[i] / 127;
    return out;
  }
  if (d.$ === U8N) {
    var u8 = new Uint8Array(bin.buffer, base, n);
    var lo0 = d.lo[0], sp0 = d.sp[0];
    for (i = 0; i < n; i++) out[i] = lo0 + (u8[i] / 255) * sp0;
    return out;
  }
  /* I16, per component of the stride, over that component's own range */
  var s16 = new Uint16Array(bin.buffer, base, n), lo = d.lo, sp = d.sp, st = lo.length;
  if (st === 3) {                        /* unrolled: this is most of the work */
    var l0 = lo[0], l1 = lo[1], l2 = lo[2], p0 = sp[0] / 65535, p1 = sp[1] / 65535, p2 = sp[2] / 65535;
    for (i = 0; i < n; i += 3) {
      out[i]     = l0 + s16[i]     * p0;
      out[i + 1] = l1 + s16[i + 1] * p1;
      out[i + 2] = l2 + s16[i + 2] * p2;
    }
  } else if (st === 2) {
    var m0 = lo[0], m1 = lo[1], q0 = sp[0] / 65535, q1 = sp[1] / 65535;
    for (i = 0; i < n; i += 2) {
      out[i]     = m0 + s16[i]     * q0;
      out[i + 1] = m1 + s16[i + 1] * q1;
    }
  } else {
    for (i = 0; i < n; i++) { var c = i % st; out[i] = lo[c] + (s16[i] / 65535) * (sp[c] / 1); }
  }
  return out;
}

/* Walk the skeleton and swap every descriptor for the array it stands for.
   A descriptor is an object carrying `$`; nothing else in a pack is. */
root.__geo = function (obj, bin) {
  (function walk(o) {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) {
      for (var j = 0; j < o.length; j++) walk(o[j]);
      return;
    }
    for (var k in o) {
      var v = o[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && typeof v.$ === 'number') o[k] = read(bin, v);
      else walk(v);
    }
  })(obj);
  return obj;
};

/* ── ONE WIDENING, AND WHY IT IS SAFE ─────────────────────────
   BufferGeometry.setIndex only wraps its argument when Array.isArray says
   so; anything else it assigns STRAIGHT to .index. Hand it a Uint16Array
   and you get a geometry whose index is a bare typed array — no itemSize,
   no version, no count — and the renderer draws nothing. There are five
   setIndex calls across this app and every one of them now gets its
   indices as a view, so rather than five identical wrappers at the call
   sites, the method learns the case here.

   This can only widen: a typed array reaching setIndex today produces a
   geometry that does not draw, so there is no behaviour to preserve. */
if (root.THREE && THREE.BufferGeometry) {
  var proto = THREE.BufferGeometry.prototype, was = proto.setIndex;
  proto.setIndex = function (index) {
    if (index && ArrayBuffer.isView(index) && !(index instanceof THREE.BufferAttribute)) {
      this.index = new THREE.BufferAttribute(index, 1);
      return this;
    }
    return was.call(this, index);
  };
}

})(typeof window !== 'undefined' ? window : this);
