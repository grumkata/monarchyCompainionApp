/* ══════════════════════════════════════════════════════════════
   27-sm64-core.js — the game's arithmetic and its collision.

   The star (27-bob.js) drops you into Bob-omb Battlefield as Super Mario 64
   plays it. These files are that game's own workings, written again in
   JavaScript from its decompilation (github.com/n64decomp/sm64): here, the
   angles and the sums it does them with (engine/math_util.c), and how it
   finds the floor, the ceiling and the walls around anything
   (engine/surface_collision.c, engine/surface_load.c) — the same 16 by 16
   grid of cells, the same order of surfaces, the same 78-unit reach, so
   that Mario stands, slides, bonks and falls exactly where he would.

   Everything is in the game's own units (Mario is about 160 tall) and runs
   at the game's 30 steps a second; the frames in between are drawn by
   easing from one step to the next (27-sm64-gfx.js).
══════════════════════════════════════════════════════════════ */
(function (root) {
'use strict';

const SM64 = root.SM64 = root.SM64 || {};

/* ══ NUMBERS ═══════════════════════════════════════════════════
   An angle is a 16-bit number: 0x10000 is the whole way round. */
const s16 = v => (v << 16) >> 16;
const u16 = v => v & 0xFFFF;
const ANG = Math.PI * 2 / 65536;
const sins = a => Math.sin(a * ANG);
const coss = a => Math.cos(a * ANG);
/* atan2s(y, x): the game takes (z, x) to an angle with 0 along +z */
const atan2s = (y, x) => s16(Math.round(Math.atan2(x, y) / ANG));
const sqr = x => x * x;
const approach = (cur, target, inc, dec) => {
  if (cur < target) { cur += inc; if (cur > target) cur = target; }
  else { cur -= dec; if (cur < target) cur = target; }
  return cur;
};
/* approach_s32 on 16-bit angles (the game wraps them as it goes) */
const approachS16 = (cur, target, inc, dec) => {
  let d = s16(target - cur);
  if (d > 0) { d -= inc; if (d < 0) d = 0; }
  else if (d < 0) { d += dec; if (d > 0) d = 0; }
  return s16(target - d);
};
const approachF = (cur, target, inc, dec) => approach(cur, target, inc, dec);
/* approach_f32_symmetric / approach_s16_symmetric (obj helpers) */
const approachSym = (cur, target, inc) => {
  const d = target - cur;
  inc = Math.abs(inc);
  if (d >= 0) return d > inc ? cur + inc : target;
  return d < -inc ? cur - inc : target;
};
const approachS16Sym = (cur, target, inc) => {
  const d = s16(target - cur);
  inc = Math.abs(inc);
  if (d >= 0) return d > inc ? s16(cur + inc) : s16(target);
  return d < -inc ? s16(cur - inc) : s16(target);
};
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const random = (() => {
  /* random_u16 as the game has it, so that what it scatters is scattered the same way */
  let seed = 0;
  const u16r = () => {
    if (seed === 22026) seed = 0;
    let t1 = ((seed & 0x00FF) << 8) ^ seed;
    seed = ((t1 & 0xFF) << 8) | ((t1 & 0xFF00) >> 8);
    t1 = ((t1 & 0x00FF) << 1) ^ seed;
    let t2 = (t1 >> 1) ^ 0xFF80;
    if ((t1 & 1) === 0) {
      if (t2 === 43605) seed = 0;
      else seed = t2 ^ 0x1FF4;
    } else seed = t2 ^ 0x8180;
    return seed & 0xFFFF;
  };
  return { u16: u16r, float: () => u16r() / 65536, sign: () => (u16r() >= 0x7FFF ? 1 : -1) };
})();

SM64.m = { s16, u16, ANG, sins, coss, atan2s, sqr, approach, approachS16, approachF, approachSym, approachS16Sym, clamp, random };

/* ══ SURFACE TYPES the game acts on (include/surface_terrains.h) ═ */
const ST = SM64.ST = {
  DEFAULT: 0x00, BURNING: 0x01, HANGABLE: 0x05, SLOW: 0x09, DEATH_PLANE: 0x0A, CLOSE_CAMERA: 0x0B, WATER: 0x0D,
  FLOWING_WATER: 0x0E, INTANGIBLE: 0x12, VERY_SLIPPERY: 0x13, SLIPPERY: 0x14, NOT_SLIPPERY: 0x15,
  WALL_MISC: 0x28, NOISE_DEFAULT: 0x29, NOISE_SLIPPERY: 0x2A, HORIZONTAL_WIND: 0x2C, ICE: 0x2E, HARD: 0x30,
  WARP: 0x32, HARD_SLIPPERY: 0x35, HARD_VERY_SLIPPERY: 0x36, HARD_NOT_SLIPPERY: 0x37, VERTICAL_WIND: 0x38,
  BOSS_FIGHT_CAMERA: 0x65, CAMERA_FREE_ROAM: 0x66, CAMERA_8_DIR: 0x69, CAMERA_MIDDLE: 0x6E,
  CAMERA_ROTATE_RIGHT: 0x6F, CAMERA_ROTATE_LEFT: 0x70, CAMERA_BOUNDARY: 0x72, NOISE_VERY_SLIPPERY_73: 0x73,
  NOISE_VERY_SLIPPERY_74: 0x74, NOISE_VERY_SLIPPERY: 0x75, NO_CAM_COLLISION: 0x76, NO_CAM_COLLISION_77: 0x77,
  NO_CAM_COL_VERY_SLIPPERY: 0x78, NO_CAM_COL_SLIPPERY: 0x79, SWITCH: 0x7A, VANISH_CAP_WALLS: 0x7B,
};
const FLAG_DYNAMIC = 1, FLAG_NO_CAM = 2, FLAG_X_PROJ = 8;
SM64.SURF = { DYNAMIC: FLAG_DYNAMIC, NO_CAM: FLAG_NO_CAM, X_PROJ: FLAG_X_PROJ };

/* ══ COLLISION ═════════════════════════════════════════════════ */
const MAX = 0x2000, CELL = 0x400, CELLS = 16, FLOOR_LOWER_LIMIT = -11000, CELL_HEIGHT_LIMIT = 20000;
const FLOORS = 0, CEILS = 1, WALLS = 2;

const hasForce = t => t === 0x04 || t === 0x0E || t === 0x24 || t === 0x25 || t === 0x27 || t === 0x2C || t === 0x2D;
const noCam = t => (t === 0x76 || t === 0x77 || t === 0x78 || t === 0x7A ? FLAG_NO_CAM : 0);

function cells() { const c = []; for (let i = 0; i < CELLS * CELLS; i++) c.push([[], [], []]); return c; }

function makeSurface(x1, y1, z1, x2, y2, z2, x3, y3, z3) {
  /* (v2 - v1) x (v3 - v2), as the game has it */
  let nx = (y2 - y1) * (z3 - z2) - (z2 - z1) * (y3 - y2);
  let ny = (z2 - z1) * (x3 - x2) - (x2 - x1) * (z3 - z2);
  let nz = (x2 - x1) * (y3 - y2) - (y2 - y1) * (x3 - x2);
  let mag = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (mag < 0.0001) return null;
  mag = Math.fround(1 / mag);
  nx *= mag; ny *= mag; nz *= mag;
  return {
    v1: [x1, y1, z1], v2: [x2, y2, z2], v3: [x3, y3, z3],
    nx, ny, nz, oo: -(nx * x1 + ny * y1 + nz * z1),
    lowerY: Math.min(y1, y2, y3) - 5, upperY: Math.max(y1, y2, y3) + 5,
    type: 0, force: 0, flags: 0, object: null,
  };
}

function lowerCell(c) {
  c += MAX; if (c < 0) c = 0;
  let i = (c / CELL) | 0;
  if (c % CELL < 50) i--;
  return i < 0 ? 0 : i;
}
function upperCell(c) {
  c += MAX; if (c < 0) c = 0;
  let i = (c / CELL) | 0;
  if (c % CELL > CELL - 50) i++;
  return i > CELLS - 1 ? CELLS - 1 : i;
}

function addToCell(part, cx, cz, s) {
  let list, dir;
  if (s.ny > 0.01) { list = part[cz * CELLS + cx][FLOORS]; dir = 1; }
  else if (s.ny < -0.01) { list = part[cz * CELLS + cx][CEILS]; dir = -1; }
  else {
    list = part[cz * CELLS + cx][WALLS]; dir = 0;
    if (s.nx < -0.707 || s.nx > 0.707) s.flags |= FLAG_X_PROJ;
  }
  /* sorted by the height of the first vertex (highest floors first, lowest ceilings first) */
  const pri = s16(s.v1[1] * dir);
  let i = 0;
  while (i < list.length && !(pri > s16(list[i].v1[1] * dir))) i++;
  list.splice(i, 0, s);
}

function addSurface(part, s) {
  const minX = Math.min(s.v1[0], s.v2[0], s.v3[0]), maxX = Math.max(s.v1[0], s.v2[0], s.v3[0]);
  const minZ = Math.min(s.v1[2], s.v2[2], s.v3[2]), maxZ = Math.max(s.v1[2], s.v2[2], s.v3[2]);
  const x0 = lowerCell(minX), x1 = upperCell(maxX), z0 = lowerCell(minZ), z1 = upperCell(maxZ);
  for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) addToCell(part, cx, cz, s);
}

class Collision {
  constructor() {
    this.stat = cells();
    this.dyn = cells();
    this.forCamera = false;
    this.includeIntangible = false;
    this.surfaces = [];
  }
  /* the level's own collision: vertices, and triangles of [a, b, c, type, force] */
  loadStatic(V, T) {
    for (const t of T) {
      const a = V[t[0]], b = V[t[1]], c = V[t[2]];
      const s = makeSurface(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
      if (!s) continue;
      s.type = t[3]; s.flags = noCam(t[3]); s.force = hasForce(t[3]) ? (t[4] || 0) : 0;
      this.surfaces.push(s);
      addSurface(this.stat, s);
    }
  }
  clearDynamic() { for (const c of this.dyn) { c[0].length = 0; c[1].length = 0; c[2].length = 0; } }
  /* an object's collision, moved to where it stands this frame (load_object_collision_model) */
  loadObject(obj, col, m) {
    const V = col.v.map(p => [
      s16(Math.trunc(p[0] * m[0] + p[1] * m[4] + p[2] * m[8] + m[12])),
      s16(Math.trunc(p[0] * m[1] + p[1] * m[5] + p[2] * m[9] + m[13])),
      s16(Math.trunc(p[0] * m[2] + p[1] * m[6] + p[2] * m[10] + m[14])),
    ]);
    for (const t of col.t) {
      const a = V[t[0]], b = V[t[1]], c = V[t[2]];
      const s = makeSurface(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
      if (!s) continue;
      s.object = obj; s.type = t[3]; s.force = hasForce(t[3]) ? (t[4] || 0) : 0;
      s.flags |= noCam(t[3]) | FLAG_DYNAMIC;
      addSurface(this.dyn, s);
    }
  }

  /* ── walls ── */
  wallsFrom(list, d) {
    let radius = d.radius > 200 ? 200 : d.radius, n = 0;
    const x = d.x, y = d.y + d.offsetY, z = d.z;
    for (const s of list) {
      if (y < s.lowerY || y > s.upperY) continue;
      const off = s.nx * x + s.ny * y + s.nz * z + s.oo;
      if (off < -radius || off > radius) continue;
      const px = x, pz = z;
      let w1, w2, w3;
      const y1 = s.v1[1], y2 = s.v2[1], y3 = s.v3[1];
      if (s.flags & FLAG_X_PROJ) {
        w1 = -s.v1[2]; w2 = -s.v2[2]; w3 = -s.v3[2];
        if (s.nx > 0) {
          if ((y1 - y) * (w2 - w1) - (w1 - -pz) * (y2 - y1) > 0) continue;
          if ((y2 - y) * (w3 - w2) - (w2 - -pz) * (y3 - y2) > 0) continue;
          if ((y3 - y) * (w1 - w3) - (w3 - -pz) * (y1 - y3) > 0) continue;
        } else {
          if ((y1 - y) * (w2 - w1) - (w1 - -pz) * (y2 - y1) < 0) continue;
          if ((y2 - y) * (w3 - w2) - (w2 - -pz) * (y3 - y2) < 0) continue;
          if ((y3 - y) * (w1 - w3) - (w3 - -pz) * (y1 - y3) < 0) continue;
        }
      } else {
        w1 = s.v1[0]; w2 = s.v2[0]; w3 = s.v3[0];
        if (s.nz > 0) {
          if ((y1 - y) * (w2 - w1) - (w1 - px) * (y2 - y1) > 0) continue;
          if ((y2 - y) * (w3 - w2) - (w2 - px) * (y3 - y2) > 0) continue;
          if ((y3 - y) * (w1 - w3) - (w3 - px) * (y1 - y3) > 0) continue;
        } else {
          if ((y1 - y) * (w2 - w1) - (w1 - px) * (y2 - y1) < 0) continue;
          if ((y2 - y) * (w3 - w2) - (w2 - px) * (y3 - y2) < 0) continue;
          if ((y3 - y) * (w1 - w3) - (w3 - px) * (y1 - y3) < 0) continue;
        }
      }
      if (this.forCamera) { if (s.flags & FLAG_NO_CAM) continue; }
      else if (s.type === ST.CAMERA_BOUNDARY) continue;
      d.x += s.nx * (radius - off);
      d.z += s.nz * (radius - off);
      if (d.walls.length < 4) d.walls.push(s);
      n++;
    }
    return n;
  }
  /* find_wall_collisions: d = { x, y, z, offsetY, radius } → pushes x and z out, d.walls the walls touched */
  walls(d) {
    d.walls = [];
    const x = s16(Math.trunc(d.x)), z = s16(Math.trunc(d.z));
    if (x <= -MAX || x >= MAX || z <= -MAX || z >= MAX) return 0;
    const cx = ((x + MAX) / CELL | 0) & 15, cz = ((z + MAX) / CELL | 0) & 15;
    let n = this.wallsFrom(this.dyn[cz * CELLS + cx][WALLS], d);
    n += this.wallsFrom(this.stat[cz * CELLS + cx][WALLS], d);
    return n;
  }
  /* f32_find_wall_collision: pushes the point out of the walls, returns how many it touched */
  wallPush(p, offsetY, radius) {
    const d = { x: p.x, y: p.y, z: p.z, offsetY, radius };
    const n = this.walls(d);
    p.x = d.x; p.z = d.z;
    return n;
  }

  /* ── ceilings ── */
  ceilFrom(list, x, y, z, out) {
    for (const s of list) {
      const x1 = s.v1[0], z1 = s.v1[2], x2 = s.v2[0], z2 = s.v2[2];
      if ((z1 - z) * (x2 - x1) - (x1 - x) * (z2 - z1) > 0) continue;
      const x3 = s.v3[0], z3 = s.v3[2];
      if ((z2 - z) * (x3 - x2) - (x2 - x) * (z3 - z2) > 0) continue;
      if ((z3 - z) * (x1 - x3) - (x3 - x) * (z1 - z3) > 0) continue;
      if (this.forCamera) { if (s.flags & FLAG_NO_CAM) continue; }
      else if (s.type === ST.CAMERA_BOUNDARY) continue;
      if (s.ny === 0) continue;
      const h = -(x * s.nx + s.nz * z + s.oo) / s.ny;
      if (y - (h - -78) > 0) continue;
      out.h = h;
      return s;
    }
    return null;
  }
  /* find_ceil → { h, s } */
  ceil(px, py, pz) {
    const x = s16(Math.trunc(px)), y = s16(Math.trunc(py)), z = s16(Math.trunc(pz));
    const r = { h: CELL_HEIGHT_LIMIT, s: null };
    if (x <= -MAX || x >= MAX || z <= -MAX || z >= MAX) return r;
    const cx = ((x + MAX) / CELL | 0) & 15, cz = ((z + MAX) / CELL | 0) & 15;
    const dh = { h: CELL_HEIGHT_LIMIT }, sh = { h: CELL_HEIGHT_LIMIT };
    const dc = this.ceilFrom(this.dyn[cz * CELLS + cx][CEILS], x, y, z, dh);
    const sc = this.ceilFrom(this.stat[cz * CELLS + cx][CEILS], x, y, z, sh);
    r.s = sc; r.h = sh.h;
    if (dh.h < r.h) { r.s = dc; r.h = dh.h; }
    return r;
  }

  /* ── floors ── */
  floorFrom(list, x, y, z, out) {
    for (const s of list) {
      const x1 = s.v1[0], z1 = s.v1[2], x2 = s.v2[0], z2 = s.v2[2];
      if ((z1 - z) * (x2 - x1) - (x1 - x) * (z2 - z1) < 0) continue;
      const x3 = s.v3[0], z3 = s.v3[2];
      if ((z2 - z) * (x3 - x2) - (x2 - x) * (z3 - z2) < 0) continue;
      if ((z3 - z) * (x1 - x3) - (x3 - x) * (z1 - z3) < 0) continue;
      if (this.forCamera) { if (s.flags & FLAG_NO_CAM) continue; }
      else if (s.type === ST.CAMERA_BOUNDARY) continue;
      if (s.ny === 0) continue;
      const h = -(x * s.nx + s.nz * z + s.oo) / s.ny;
      if (y - (h + -78) < 0) continue;
      out.h = h;
      return s;
    }
    return null;
  }
  /* find_floor → { h, s } */
  floor(px, py, pz) {
    const x = s16(Math.trunc(px)), y = s16(Math.trunc(py)), z = s16(Math.trunc(pz));
    const r = { h: FLOOR_LOWER_LIMIT, s: null };
    if (x <= -MAX || x >= MAX || z <= -MAX || z >= MAX) return r;
    const cx = ((x + MAX) / CELL | 0) & 15, cz = ((z + MAX) / CELL | 0) & 15;
    const dh = { h: FLOOR_LOWER_LIMIT }, sh = { h: FLOOR_LOWER_LIMIT };
    const df = this.floorFrom(this.dyn[cz * CELLS + cx][FLOORS], x, y, z, dh);
    const list = this.stat[cz * CELLS + cx][FLOORS];
    let sf = this.floorFrom(list, x, y, z, sh);
    if (!this.includeIntangible) {
      if (sf && sf.type === ST.INTANGIBLE) sf = this.floorFrom(list, x, (sh.h - 200) | 0, z, sh);
    } else this.includeIntangible = false;
    r.s = sf; r.h = sh.h;
    if (dh.h > r.h) { r.s = df; r.h = dh.h; }
    return r;
  }
  floorHeight(x, y, z) { return this.floor(x, y, z).h; }
}
SM64.Collision = Collision;
SM64.LIMITS = { FLOOR_LOWER_LIMIT, CELL_HEIGHT_LIMIT, MAX };

})(window);
