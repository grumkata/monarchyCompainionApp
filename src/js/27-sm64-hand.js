/* ══════════════════════════════════════════════════════════════
   27-sm64-hand.js — the parts of Super Mario 64's engine that do not
   carry over from C word for word, written by hand to do the same.

     objects     an object is the game's struct Object: its 0x50 words of
                 fields (object_fields.h) laid out as the game lays them, so
                 two names for one field read and write the same memory;
     scripts     the behaviour script interpreter (engine/behavior_script.c)
                 running the scripts from data/behavior_data.c (baked by
                 tools/bake_sm64.py into the course file);
     the frame   update_objects (game/object_list_processor.c): the lists in
                 the game's order, the dynamic collision cleared and reloaded,
                 the object collisions (game/object_collision.c);
     pointers    the helpers that write through a pointer take a reference
                 (REF / REFA / REFV, from tools/c2js.py).

   Super Mario 64 is (c) Nintendo; this is written again from its
   decompilation (github.com/n64decomp/sm64).
══════════════════════════════════════════════════════════════ */
(function (root) {
'use strict';
const SM64 = root.SM64, F = SM64.F = SM64.F || {}, W = SM64.W = SM64.W || {}, B = SM64.B = SM64.B || {};
const M = SM64.m, C = SM64.C;
const { s16, sins, coss, atan2s } = M;
/*CONSTS*/
const { ACTIVE_FLAG_ACTIVE, ACTIVE_FLAG_DEACTIVATED, ACTIVE_FLAG_FAR_AWAY, ACTIVE_FLAG_INITIATED_TIME_STOP, 
  ACTIVE_FLAG_IN_DIFFERENT_ROOM, ACTIVE_FLAG_UNIMPORTANT, ACTIVE_FLAG_UNK8, ACTIVE_FLAG_UNK9, ACTIVE_PARTICLE_DIRT, 
  ACTIVE_PARTICLE_DUST, ACTIVE_PARTICLE_H_STAR, ACTIVE_PARTICLE_LEAF, ACTIVE_PARTICLE_MIST_CIRCLE, 
  ACTIVE_PARTICLE_SPARKLES, ACTIVE_PARTICLE_TRIANGLE, ACTIVE_PARTICLE_V_STAR, ANIM_FLAG_BACKWARD, CUTSCENE_DIALOG, 
  DIALOG_RESPONSE_NONE, GRAPH_RENDER_ACTIVE, GRAPH_RENDER_BILLBOARD, GRAPH_RENDER_HAS_ANIMATION, 
  GRAPH_RENDER_INVISIBLE, HELD_FREE, INT_SUBTYPE_DELAY_INVINCIBILITY, MARIO_DIALOG_STATUS_SPEAK, MARIO_DIALOG_STOP, 
  MODEL_MIST, MODEL_NONE, MODEL_SPARKLES, NUM_OBJ_LISTS, OBJ_FLAG_ACTIVE_FROM_AFAR, OBJ_FLAG_COMPUTE_ANGLE_TO_MARIO, 
  OBJ_FLAG_COMPUTE_DIST_TO_MARIO, OBJ_FLAG_MOVE_XZ_USING_FVEL, OBJ_FLAG_MOVE_Y_WITH_TERMINAL_VEL, 
  OBJ_FLAG_PERSISTENT_RESPAWN, OBJ_FLAG_SET_FACE_ANGLE_TO_MOVE_ANGLE, OBJ_FLAG_SET_FACE_YAW_TO_MOVE_YAW, 
  OBJ_FLAG_SET_THROW_MATRIX_FROM_TRANSFORM, OBJ_FLAG_TRANSFORM_RELATIVE_TO_PARENT, OBJ_FLAG_UPDATE_GFX_POS_AND_ANGLE, 
  OBJ_LIST_DEFAULT, OBJ_LIST_DESTRUCTIVE, OBJ_LIST_GENACTOR, OBJ_LIST_LEVEL, OBJ_LIST_PLAYER, OBJ_LIST_POLELIKE, 
  OBJ_LIST_PUSHABLE, OBJ_LIST_SPAWNER, OBJ_LIST_SURFACE, OBJ_LIST_UNIMPORTANT, OBJ_MOVE_HIT_EDGE, OBJ_MOVE_HIT_WALL, 
  OBJ_MOVE_ON_GROUND, O_FACE_ANGLE_INDEX, O_POS_INDEX, PARTICLE_DIRT, PARTICLE_DUST, PARTICLE_HORIZONTAL_STAR, 
  PARTICLE_LEAF, PARTICLE_MIST_CIRCLE, PARTICLE_SPARKLES, PARTICLE_TRIANGLE, PARTICLE_VERTICAL_STAR, 
  RESPAWN_INFO_TYPE_32, TIME_STOP_ACTIVE, TIME_STOP_ALL_OBJECTS, TIME_STOP_ENABLED, TIME_STOP_MARIO_AND_DOORS, 
  TIME_STOP_MARIO_OPENED_DOOR, TIME_STOP_UNKNOWN_0 } = SM64.C;
/*END CONSTS*/

/* ══ REFERENCES and the small sums the ported code expects in SM64.m ═ */
Object.assign(M, {
  REF: (obj, field) => ({ get: () => obj[field], set: v => { obj[field] = v; } }),
  REFA: (arr, i) => ({ get: () => arr[i], set: v => { arr[i] = v; } }),
  REFV: (get, set) => ({ get, set }),
  s8: v => (v << 24) >> 24,
  max: (a, b) => (a > b ? a : b),
  min: (a, b) => (a < b ? a : b),
  abs: v => (v < 0 ? -v : v),
  approach_f32: (cur, target, inc, dec) => M.approach(cur, target, inc, dec),
  approach_s32: (cur, target, inc, dec) => M.approach(cur, target, inc, dec),
});
const { REF } = M;

/* ══ AN OBJECT ═════════════════════════════════════════════════ */
const PTR_KINDS = { S16P: 1, S32P: 1, ANIMS: 1, WAYPOINT: 1, CHAIN_SEGMENT: 1, OBJ: 1, SURFACE: 1, VPTR: 1, CVPTR: 1 };
function Obj() {
  const buf = new ArrayBuffer(0x50 * 4);
  this.raw = { f32: new Float32Array(buf), s32: new Int32Array(buf), u32: new Uint32Array(buf), s16: new Int16Array(buf) };
  this.ptr = new Array(0x50).fill(null);
  this.gfx = { pos: [0, 0, 0], angle: [0, 0, 0], scale: [1, 1, 1], flags: 0, model: null, throwMatrix: null,
               cameraToObject: [0, 0, 0], areaIndex: 1, activeAreaIndex: 1,
               anim: { id: -1, anim: null, frame: 0, accel: 0, assist: 0, yTrans: 0, timer: 0 } };
  this.parentObj = this; this.prevObj = null;
  this.collidedObjInteractTypes = 0; this.activeFlags = 0; this.numCollidedObjs = 0; this.collidedObjs = [null, null, null, null];
  this.curBhvCommand = null; this.bhvStackIndex = 0; this.bhvStack = []; this.bhvDelayTimer = 0; this.respawnInfoType = 0;
  this.hitboxRadius = 50; this.hitboxHeight = 100; this.hurtboxRadius = 0; this.hurtboxHeight = 0; this.hitboxDownOffset = 0;
  this.behavior = null; this.platform = null; this.collisionData = null;
  this.transform = mtxf_identity([[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  this.respawnInfo = null; this.list = 0;
}
for (const [name, [kind, i, sub]] of Object.entries(SM64.FIELDS)) {
  let get, set;
  if (kind === 'F32') { get = function () { return this.raw.f32[i]; }; set = function (v) { this.raw.f32[i] = v; }; }
  else if (kind === 'S32') { get = function () { return this.raw.s32[i]; }; set = function (v) { this.raw.s32[i] = v; }; }
  else if (kind === 'U32') { get = function () { return this.raw.u32[i]; }; set = function (v) { this.raw.u32[i] = v; }; }
  else if (kind === 'S16') {
    /* the N64 is big-endian: the first half of a word is its high 16 bits */
    const k = i * 2 + (1 - sub);
    get = function () { return this.raw.s16[k]; }; set = function (v) { this.raw.s16[k] = v; };
  } else if (PTR_KINDS[kind]) { get = function () { return this.ptr[i]; }; set = function (v) { this.ptr[i] = v; }; }
  else continue;
  Object.defineProperty(Obj.prototype, name, { get, set, configurable: true });
}
SM64.Obj = Obj;

/* ══ MATRICES the C code copies through pointers ═══════════════ */
function mtxf_identity(m) { for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) m[r][c] = r === c ? 1 : 0; return m; }
function mtxf_copy(dest, src) { for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) dest[r][c] = src[r][c]; }
function mtxf_to_mtx() {}
function vec3f_get_dist_and_angle(from, to, dist, pitch, yaw) {
  const x = to[0] - from[0], y = to[1] - from[1], z = to[2] - from[2];
  dist.set(Math.sqrt(x * x + y * y + z * z));
  pitch.set(atan2s(Math.sqrt(x * x + z * z), y));
  yaw.set(atan2s(z, x));
}

/* ══ RANDOM (behavior_script.c) ═══════════════════════════════ */
function random_u16() { return M.random.u16(); }
function random_float() { return M.random.float(); }
function random_sign() { return M.random.sign(); }

/* ══ THE OBJECT LISTS (spawn_object.c) ═════════════════════════ */
W.gObjectLists = [];
for (let i = 0; i < C.NUM_OBJ_LISTS; i++) W.gObjectLists.push([]);
function clear_objects() {
  for (const l of W.gObjectLists) l.length = 0;
  W.gMarioObject = null;
  W.gTimeStopState = 0;
}
function allocate_object(listIndex) {
  const obj = new Obj();
  obj.list = listIndex;
  W.gObjectLists[listIndex].push(obj);
  obj.activeFlags = ACTIVE_FLAG_ACTIVE | ACTIVE_FLAG_UNK8;
  obj.oIntangibleTimer = -1;
  obj.oDamageOrCoinValue = 0;
  obj.oHealth = 2048;
  obj.oCollisionDistance = 1000;
  obj.oDrawingDistance = 4000;
  obj.oDistanceToMario = 19000;
  obj.oRoom = -1;
  obj.gfx.flags &= ~GRAPH_RENDER_INVISIBLE;
  obj.gfx.pos = [-10000, -10000, -10000];
  return obj;
}
function snap_object_to_floor(obj) {
  obj.oFloorHeight = W.col.floorHeight(obj.oPosX, obj.oPosY, obj.oPosZ);
  if (obj.oFloorHeight + 2 > obj.oPosY && obj.oPosY > obj.oFloorHeight - 10) {
    obj.oPosY = obj.oFloorHeight;
    obj.oMoveFlags |= OBJ_MOVE_ON_GROUND;
  }
}
/* a behaviour: { name, list, cmds } — its first command, BEGIN(list), says which list it goes in */
function create_object(bhv) {
  if (!bhv) throw new Error('no such behaviour');
  const listIndex = bhv.list;
  const obj = allocate_object(listIndex);
  obj.curBhvCommand = { s: bhv.cmds, i: 0 };
  obj.behavior = bhv;
  if (listIndex === OBJ_LIST_UNIMPORTANT) obj.activeFlags |= ACTIVE_FLAG_UNIMPORTANT;
  if (listIndex === OBJ_LIST_GENACTOR || listIndex === OBJ_LIST_PUSHABLE || listIndex === OBJ_LIST_POLELIKE) snap_object_to_floor(obj);
  return obj;
}
function mark_obj_for_deletion(obj) { obj.activeFlags = ACTIVE_FLAG_DEACTIVATED; }
function unload_object(obj) {
  obj.activeFlags = ACTIVE_FLAG_DEACTIVATED;
  obj.prevObj = null;
  obj.gfx.throwMatrix = null;
  obj.gfx.flags &= ~(GRAPH_RENDER_BILLBOARD | GRAPH_RENDER_ACTIVE);
  const l = W.gObjectLists[obj.list], i = l.indexOf(obj);
  if (i >= 0) l.splice(i, 1);
  if (W.onUnload) W.onUnload(obj);
}

/* ══ THE OBJECT'S PICTURE (graph_node.c) ═══════════════════════ */
function geo_obj_init(gfx, model, pos, angle) {
  gfx.scale[0] = gfx.scale[1] = gfx.scale[2] = 1;
  gfx.pos[0] = pos[0]; gfx.pos[1] = pos[1]; gfx.pos[2] = pos[2];
  gfx.angle[0] = angle[0]; gfx.angle[1] = angle[1]; gfx.angle[2] = angle[2];
  gfx.model = model;
  gfx.throwMatrix = null;
  gfx.anim.anim = null;
  gfx.flags |= GRAPH_RENDER_ACTIVE | GRAPH_RENDER_HAS_ANIMATION;
  gfx.flags &= ~(GRAPH_RENDER_INVISIBLE | GRAPH_RENDER_BILLBOARD);
}
function animFrom(ref) { return ref && typeof ref.get === 'function' ? ref.get() : ref; }
function geo_obj_init_animation(gfx, ref) {
  const anim = animFrom(ref);
  if (gfx.anim.anim !== anim) {
    gfx.anim.anim = anim;
    gfx.anim.frame = anim.start + ((anim.flags & ANIM_FLAG_BACKWARD) ? 1 : -1);
    gfx.anim.accel = 0;
    gfx.anim.yTrans = 0;
  }
}
function geo_obj_init_animation_accel(gfx, ref, accel) {
  const anim = animFrom(ref);
  if (gfx.anim.anim !== anim) {
    gfx.anim.anim = anim;
    gfx.anim.yTrans = 0;
    gfx.anim.assist = anim.start * 65536 + ((anim.flags & ANIM_FLAG_BACKWARD) ? accel : -accel);
    gfx.anim.frame = gfx.anim.assist >> 16;
  }
  gfx.anim.accel = accel;
}
function obj_set_gfx_pos_from_pos(obj) { obj.gfx.pos[0] = obj.oPosX; obj.gfx.pos[1] = obj.oPosY; obj.gfx.pos[2] = obj.oPosZ; }
function cur_obj_init_animation(i) { const o = W.gCurrentObject; geo_obj_init_animation(o.gfx, o.oAnimations[i]); }
function cur_obj_init_animation_with_sound(i) { cur_obj_init_animation(i); W.gCurrentObject.oSoundStateID = i; }
function cur_obj_init_animation_with_accel_and_sound(i, accel) {
  const o = W.gCurrentObject;
  geo_obj_init_animation_accel(o.gfx, o.oAnimations[i], Math.trunc(accel * 65536));
  o.oSoundStateID = i;
}
function obj_init_animation_with_accel_and_sound(obj, i, accel) {
  geo_obj_init_animation_accel(obj.gfx, obj.oAnimations[i], Math.trunc(accel * 65536));
  obj.oSoundStateID = i;
}
function obj_init_animation_with_sound(obj, anims, i) {
  obj.oAnimations = anims;
  geo_obj_init_animation(obj.gfx, anims[i]);
  obj.oSoundStateID = i;
}
function cur_obj_enable_rendering_and_become_tangible(obj) { obj.gfx.flags |= GRAPH_RENDER_ACTIVE; obj.oIntangibleTimer = 0; }

/* ══ HELPERS THAT WALK THE LISTS (object_helpers.c) ════════════ */
function cur_obj_find_nearest_object_with_behavior(bhv, dist) {
  const o = W.gCurrentObject;
  let closest = null, min = 0x20000;
  for (const obj of W.gObjectLists[bhv.list]) {
    if (obj.behavior === bhv && obj.activeFlags !== ACTIVE_FLAG_DEACTIVATED && obj !== o) {
      const d = F.dist_between_objects(o, obj);
      if (d < min) { closest = obj; min = d; }
    }
  }
  if (dist) dist.set(min);
  return closest;
}
function find_unimportant_object() { return W.gObjectLists[OBJ_LIST_UNIMPORTANT][0] || null; }
function count_unimportant_objects() { return W.gObjectLists[OBJ_LIST_UNIMPORTANT].length; }
function count_objects_with_behavior(bhv) { return W.gObjectLists[bhv.list].filter(o => o.behavior === bhv).length; }
function cur_obj_find_nearby_held_actor(bhv, maxDist) {
  const o = W.gCurrentObject;
  for (const obj of W.gObjectLists[OBJ_LIST_GENACTOR]) {
    if (obj.behavior === bhv && obj.activeFlags !== ACTIVE_FLAG_DEACTIVATED && obj.oHeldState !== HELD_FREE
        && F.dist_between_objects(o, obj) < maxDist) return obj;
  }
  return null;
}
function cur_obj_has_behavior(bhv) { return W.gCurrentObject.behavior === bhv; }
function obj_has_behavior(obj, bhv) { return obj.behavior === bhv; }
function cur_obj_call_action_function(table) { table[W.gCurrentObject.oAction](); }
function cur_obj_set_action_table(table) { const o = W.gCurrentObject; o.oToxBoxActionTable = table; o.oToxBoxActionStep = 0; return table[0]; }
function is_item_in_array(item, arr) { for (const x of arr) { if (x === -1) break; if (x === item) return true; } return false; }
function cur_obj_check_frame_prior_current_frame(frames) {
  const f = W.gCurrentObject.gfx.anim.frame;
  for (const x of frames) { if (x === -1) break; if (x === f) return true; }
  return false;
}
function obj_get_field_if_unused() { return 0; }

/* ══ HELPERS THAT WRITE THROUGH POINTERS ═══════════════════════ */
function approach_f32_signed(v, target, inc) {
  let reached = false;
  v.set(v.get() + inc);
  if (inc >= 0) { if (v.get() > target) { v.set(target); reached = true; } }
  else if (v.get() < target) { v.set(target); reached = true; }
  return reached;
}
function apply_drag_to_value(v, drag) {
  const x = v.get();
  if (x !== 0) {
    const decel = x * x * (drag * 0.0001);
    if (x > 0) { v.set(x - decel); if (v.get() < 0.001) v.set(0); }
    else { v.set(x + decel); if (v.get() > -0.001) v.set(0); }
  }
}
function clear_move_flag(bits, flag) {
  if (bits.get() & flag) { bits.set(bits.get() & (flag ^ 0xFFFFFFFF)); return true; }
  return false;
}
function turn_obj_away_from_surface(velX, velZ, nX, nY, nZ, yawX, yawZ) {
  const d = nX * nX + nZ * nZ;
  yawX.set((nZ * nZ - nX * nX) * velX / d - 2 * velZ * (nX * nZ) / d);
  yawZ.set((nX * nX - nZ * nZ) * velZ / d - 2 * velX * (nX * nZ) / d);
}
function obj_orient_graph(obj, nx, ny, nz) {
  if (!W.sOrientObjWithFloor) return;
  if (obj.gfx.flags & GRAPH_RENDER_BILLBOARD) return;
  const m = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  F.mtxf_align_terrain_normal(m, [nx, ny, nz], [obj.oPosX, obj.oPosY + obj.oGraphYOffset, obj.oPosZ], obj.oFaceAngleYaw);
  obj.gfx.throwMatrix = m;
}
function calc_obj_friction(fr, ny) {
  const o = W.gCurrentObject;
  if (ny < 0.2 && o.oFriction < 0.9999) fr.set(0); else fr.set(o.oFriction);
}
function trigger_obj_dialog_when_facing(inDialog, dialogID, dist, actionArg) {
  const o = W.gCurrentObject;
  if ((F.is_point_within_radius_of_mario(o.oPosX, o.oPosY, o.oPosZ, Math.trunc(dist)) === true
       && F.obj_check_if_facing_toward_angle(o.oFaceAngleYaw, W.gMarioObject.gfx.angle[1] + 0x8000, 0x1000) === true
       && F.obj_check_if_facing_toward_angle(o.oMoveAngleYaw, o.oAngleToMario, 0x1000) === true)
      || inDialog.get() === 1 || inDialog.get() === true) {
    inDialog.set(1);
    if (F.set_mario_npc_dialog(actionArg) === MARIO_DIALOG_STATUS_SPEAK) {
      const r = F.cutscene_object_with_dialog(CUTSCENE_DIALOG, o, dialogID);
      if (r !== DIALOG_RESPONSE_NONE) { F.set_mario_npc_dialog(MARIO_DIALOG_STOP); inDialog.set(0); return r; }
      return 0;
    }
  }
  return 0;
}
function clamp_s16(v, lo, hi) {
  if (v.get() <= lo) v.set(lo); else if (v.get() >= hi) v.set(hi); else return false;
  return true;
}
const clamp_f32 = clamp_s16;
function approach_f32_ptr(p, target, delta) {
  if (p.get() > target) delta = -delta;
  p.set(p.get() + delta);
  if ((p.get() - target) * delta >= 0) { p.set(target); return true; }
  return false;
}
function obj_smooth_turn(angleVel, angle, target, prop, accel, minSpeed, maxSpeed) {
  const cur = s16(angle.get());
  angleVel.set(F.approach_s16_symmetric(angleVel.get(), (target - cur) * prop, accel));
  let speed = s16(Math.abs(angleVel.get()));
  const sp = M.REFV(() => speed, v => { speed = v; });
  clamp_s16(sp, minSpeed, maxSpeed);
  angle.set(F.approach_s16_symmetric(angle.get(), target, speed));
  return s16(angle.get()) === target;
}
function obj_grow_then_shrink(scaleVel, shootFireScale, endScale) {
  const o = W.gCurrentObject;
  if (o.oTimer < 2) {
    o.gfx.scale[0] += scaleVel.get();
    scaleVel.set(scaleVel.get() - 0.01);
    if (scaleVel.get() > -0.03) o.oTimer = 0;
  } else if (o.oTimer > 10) {
    if (approach_f32_ptr(M.REFA(o.gfx.scale, 0), endScale, 0.05)) return -1;
    if (scaleVel.get() !== 0 && o.gfx.scale[0] < shootFireScale) { scaleVel.set(0); return 1; }
  }
  return 0;
}
function oscillate_toward(value, vel, target, velCloseToZero, accel, slowdown) {
  const start = value.get();
  value.set(value.get() + Math.trunc(vel.get()));
  if (value.get() === target || ((value.get() - target) * (start - target) < 0 && vel.get() > -velCloseToZero && vel.get() < velCloseToZero)) {
    value.set(target); vel.set(0); return true;
  }
  if (value.get() >= target) accel = -accel;
  if (vel.get() * accel < 0) accel *= slowdown;
  vel.set(vel.get() + accel);
  return false;
}
function obj_update_blinking(timer, base, range, length) {
  if (timer.get() !== 0) timer.set(timer.get() - 1);
  else timer.set(F.random_linear_offset(base, range));
  W.gCurrentObject.oAnimState = timer.get() > length ? 0 : 1;
}
function obj_resolve_object_collisions(targetYaw) {
  const o = W.gCurrentObject;
  if (o.numCollidedObjs !== 0) {
    const other = o.collidedObjs[0];
    if (other !== W.gMarioObject) {
      const dx = other.oPosX - o.oPosX, dz = other.oPosZ - o.oPosZ;
      const angle = atan2s(dx, dz);          //! the game's own swapped arguments
      const r = o.hitboxRadius, ro = other.hitboxRadius, rel = r / (r + ro);
      const cx = o.oPosX + dx * rel, cz = o.oPosZ + dz * rel;
      o.oPosX = cx - r * coss(angle); o.oPosZ = cz - r * sins(angle);
      other.oPosX = cx + ro * coss(angle); other.oPosZ = cz + ro * sins(angle);
      if (targetYaw && F.abs_angle_diff(o.oMoveAngleYaw, angle) < 0x4000) {
        targetYaw.set(s16(angle - o.oMoveAngleYaw + angle + 0x8000));
        return true;
      }
    }
  }
  return false;
}
function obj_bounce_off_walls_edges_objects(targetYaw) {
  const o = W.gCurrentObject;
  if (o.oMoveFlags & OBJ_MOVE_HIT_WALL) targetYaw.set(F.cur_obj_reflect_move_angle_off_wall());
  else if (o.oMoveFlags & OBJ_MOVE_HIT_EDGE) targetYaw.set(s16(o.oMoveAngleYaw + 0x8000));
  else if (!obj_resolve_object_collisions(targetYaw)) return false;
  return true;
}

/* ══ PLATFORMS (platform_displacement.c's Mario-side pair) ═════ */
function get_mario_pos(x, y, z) { const p = W.gMarioStates[0].pos; x.set(p[0]); y.set(p[1]); z.set(p[2]); }
function set_mario_pos(x, y, z) { const p = W.gMarioStates[0].pos; p[0] = x; p[1] = y; p[2] = z; }

/* ══ COLLISION, as the C asks for it ═══════════════════════════ */
function find_floor(x, y, z, set) { const r = W.col.floor(x, y, z); if (set) set(r.s); return r.h; }
function find_floor_height(x, y, z) { return W.col.floorHeight(x, y, z); }
function find_ceil(x, y, z, set) { const r = W.col.ceil(x, y, z); if (set) set(r.s); return r.h; }
function find_floor_height_and_data(x, y, z, set) {
  const r = W.col.floor(x, y, z);
  if (set) set(r.s ? { normalX: r.s.nx, normalY: r.s.ny, normalZ: r.s.nz, originOffset: r.s.oo } : null);
  return r.h;
}
/* WallCollisionData: { x, y, z, offsetY, radius, numWalls, walls } */
function find_wall_collisions(d) {
  const n = W.col.walls(d);
  d.numWalls = d.walls.length;
  return n;
}
function f32_find_wall_collision(x, y, z, offY, radius) {
  const d = { x: x.get(), y: y.get(), z: z.get(), offsetY: offY, radius };
  const n = W.col.walls(d);
  x.set(d.x); y.set(d.y); z.set(d.z);
  return n;
}
function find_water_level() { return -11000; }
function find_poison_gas_level() { return -11000; }
/* load_object_collision_model (surface_load.c): the object's collision, moved to where it is, for this frame */
function load_object_collision_model() {
  const o = W.gCurrentObject;
  let marioDist = o.oDistanceToMario;
  const tangible = o.oCollisionDistance;
  if (o.oDistanceToMario === 19000) marioDist = F.dist_between_objects(o, W.gMarioObject);
  if (o.oCollisionDistance > 4000) o.oDrawingDistance = o.oCollisionDistance;
  if (!(W.gTimeStopState & TIME_STOP_ACTIVE) && marioDist < tangible && !(o.activeFlags & ACTIVE_FLAG_IN_DIFFERENT_ROOM)) {
    if (!o.gfx.throwMatrix) { o.gfx.throwMatrix = o.transform; F.obj_build_transform_from_pos_and_angle(o, O_POS_INDEX, O_FACE_ANGLE_INDEX); }
    const t = o.transform, s = o.gfx.scale;
    /* obj_apply_scale_to_matrix, then into the row-major array the collision wants */
    const m = [t[0][0] * s[0], t[0][1] * s[0], t[0][2] * s[0], 0, t[1][0] * s[1], t[1][1] * s[1], t[1][2] * s[1], 0,
               t[2][0] * s[2], t[2][1] * s[2], t[2][2] * s[2], 0, t[3][0], t[3][1], t[3][2], 1];
    W.col.loadObject(o, o.collisionData, m);
  }
  if (marioDist < o.oDrawingDistance) o.gfx.flags |= GRAPH_RENDER_ACTIVE;
  else o.gfx.flags &= ~GRAPH_RENDER_ACTIVE;
}

/* ══ THE BEHAVIOUR SCRIPTS (behavior_script.c) ═════════════════
   A script is a list of [command, ...arguments] as tools/bake_sm64.py read
   them out of data/behavior_data.c; a field is [kind, index] (object_fields.h);
   a place in a script is { s: the list, i: the command }. */
function fieldGet(o, f, asFloat) {
  const [kind, i, sub] = f;
  if (kind === 'F32') return asFloat ? o.raw.f32[i] : Math.trunc(o.raw.f32[i]);
  if (kind === 'S16') return o.raw.s16[i * 2 + (1 - (sub || 0))];
  return asFloat ? o.raw.s32[i] : o.raw.s32[i];
}
function cur_obj_set_float(o, f, v) { o.raw.f32[f[1]] = v; }
function cur_obj_get_float(o, f) { return o.raw.f32[f[1]]; }
function cur_obj_set_int(o, f, v) { o.raw.s32[f[1]] = v; }
function cur_obj_get_int(o, f) { return o.raw.s32[f[1]]; }

const BHV_CONTINUE = 0, BHV_BREAK = 1;
function bhvStep(o, pc) {
  const c = pc.s[pc.i];
  const a = c;
  switch (c[0]) {
    case 'BEGIN':
      if (o.behavior === B.bhvMessagePanel) o.oCollisionDistance = 150;
      pc.i++; return BHV_CONTINUE;
    case 'DELAY':
      if (o.bhvDelayTimer < a[1] - 1) o.bhvDelayTimer++;
      else { o.bhvDelayTimer = 0; pc.i++; }
      return BHV_BREAK;
    case 'DELAY_VAR': {
      const n = cur_obj_get_int(o, a[1]);
      if (o.bhvDelayTimer < n - 1) o.bhvDelayTimer++;
      else { o.bhvDelayTimer = 0; pc.i++; }
      return BHV_BREAK;
    }
    case 'CALL':
      o.bhvStack[o.bhvStackIndex++] = { s: pc.s, i: pc.i + 1 };
      { const t = B[a[1]]; pc.s = t.cmds; pc.i = 0; }
      return BHV_CONTINUE;
    case 'RETURN': { const r = o.bhvStack[--o.bhvStackIndex]; pc.s = r.s; pc.i = r.i; return BHV_CONTINUE; }
    case 'GOTO': { const t = B[a[1]]; pc.s = t.cmds; pc.i = a[2] || 0; return BHV_CONTINUE; }
    case 'BEGIN_REPEAT': case 'BEGIN_REPEAT_UNUSED':
      o.bhvStack[o.bhvStackIndex++] = { s: pc.s, i: pc.i + 1 };
      o.bhvStack[o.bhvStackIndex++] = a[1];
      pc.i++; return BHV_CONTINUE;
    case 'END_REPEAT': case 'END_REPEAT_CONTINUE': {
      let count = o.bhvStack[--o.bhvStackIndex];
      count--;
      if (count !== 0) {
        const r = o.bhvStack[--o.bhvStackIndex];
        o.bhvStack[o.bhvStackIndex++] = { s: r.s, i: r.i };
        o.bhvStack[o.bhvStackIndex++] = count;
        pc.s = r.s; pc.i = r.i;
      } else { o.bhvStackIndex--; pc.i++; }
      return c[0] === 'END_REPEAT' ? BHV_BREAK : BHV_CONTINUE;
    }
    case 'BEGIN_LOOP':
      o.bhvStack[o.bhvStackIndex++] = { s: pc.s, i: pc.i + 1 };
      pc.i++; return BHV_CONTINUE;
    case 'END_LOOP': {
      const r = o.bhvStack[--o.bhvStackIndex];
      pc.s = r.s; pc.i = r.i;
      o.bhvStack[o.bhvStackIndex++] = { s: r.s, i: r.i };
      return BHV_BREAK;
    }
    case 'BREAK': case 'BREAK_UNUSED': return BHV_BREAK;
    case 'CALL_NATIVE': {
      const fn = F[a[1]];
      if (!fn) { W.missing = W.missing || new Set(); if (!W.missing.has(a[1])) { W.missing.add(a[1]); console.warn('sm64: no ' + a[1]); } }
      else fn();
      pc.i++; return BHV_CONTINUE;
    }
    case 'ADD_FLOAT': cur_obj_set_float(o, a[1], cur_obj_get_float(o, a[1]) + a[2]); pc.i++; return BHV_CONTINUE;
    case 'SET_FLOAT': cur_obj_set_float(o, a[1], a[2]); pc.i++; return BHV_CONTINUE;
    case 'ADD_INT': cur_obj_set_int(o, a[1], cur_obj_get_int(o, a[1]) + s16(a[2])); pc.i++; return BHV_CONTINUE;
    case 'SET_INT': cur_obj_set_int(o, a[1], s16(a[2])); pc.i++; return BHV_CONTINUE;
    case 'SET_INT_UNUSED': cur_obj_set_int(o, a[1], a[2]); pc.i++; return BHV_CONTINUE;
    case 'OR_INT': cur_obj_set_int(o, a[1], cur_obj_get_int(o, a[1]) | (a[2] & 0xFFFF)); pc.i++; return BHV_CONTINUE;
    case 'BIT_CLEAR': cur_obj_set_int(o, a[1], cur_obj_get_int(o, a[1]) & ((a[2] & 0xFFFF) ^ 0xFFFF)); pc.i++; return BHV_CONTINUE;
    case 'SET_RANDOM_FLOAT': cur_obj_set_float(o, a[1], a[3] * random_float() + a[2]); pc.i++; return BHV_CONTINUE;
    case 'SET_RANDOM_INT': cur_obj_set_int(o, a[1], Math.trunc(a[3] * random_float()) + a[2]); pc.i++; return BHV_CONTINUE;
    case 'SET_INT_RAND_RSHIFT': cur_obj_set_int(o, a[1], (random_u16() >> a[3]) + a[2]); pc.i++; return BHV_CONTINUE;
    case 'ADD_RANDOM_FLOAT': cur_obj_set_float(o, a[1], cur_obj_get_float(o, a[1]) + a[2] + a[3] * random_float()); pc.i++; return BHV_CONTINUE;
    case 'ADD_INT_RAND_RSHIFT': { const r = random_u16(); cur_obj_set_int(o, a[1], cur_obj_get_int(o, a[1]) + a[2] + (r >> a[3])); pc.i++; return BHV_CONTINUE; }
    case 'SET_MODEL': o.gfx.model = W.gLoadedGraphNodes[a[1]] || null; pc.i++; return BHV_CONTINUE;
    case 'SPAWN_CHILD': { const ch = F.spawn_object_at_origin(o, 0, a[1], B[a[2]]); F.obj_copy_pos_and_angle(ch, o); pc.i++; return BHV_CONTINUE; }
    case 'SPAWN_OBJ': { const ch = F.spawn_object_at_origin(o, 0, a[1], B[a[2]]); F.obj_copy_pos_and_angle(ch, o); o.prevObj = ch; pc.i++; return BHV_CONTINUE; }
    case 'SPAWN_CHILD_WITH_PARAM': { const ch = F.spawn_object_at_origin(o, 0, a[2], B[a[3]]); F.obj_copy_pos_and_angle(ch, o); ch.oBhvParams2ndByte = a[1]; pc.i++; return BHV_CONTINUE; }
    case 'DEACTIVATE': o.activeFlags = ACTIVE_FLAG_DEACTIVATED; return BHV_BREAK;
    case 'DROP_TO_FLOOR':
      o.oPosY = W.col.floorHeight(o.oPosX, o.oPosY + 200, o.oPosZ);
      o.oMoveFlags |= OBJ_MOVE_ON_GROUND;
      pc.i++; return BHV_CONTINUE;
    case 'SUM_FLOAT': cur_obj_set_float(o, a[1], cur_obj_get_float(o, a[2]) + cur_obj_get_float(o, a[3])); pc.i++; return BHV_CONTINUE;
    case 'SUM_INT': cur_obj_set_int(o, a[1], cur_obj_get_int(o, a[2]) + cur_obj_get_int(o, a[3])); pc.i++; return BHV_CONTINUE;
    case 'BILLBOARD': o.gfx.flags |= GRAPH_RENDER_BILLBOARD; pc.i++; return BHV_CONTINUE;
    case 'HIDE': F.cur_obj_hide(); pc.i++; return BHV_CONTINUE;
    case 'SET_HITBOX': o.hitboxRadius = a[1]; o.hitboxHeight = a[2]; pc.i++; return BHV_CONTINUE;
    case 'SET_HURTBOX': o.hurtboxRadius = a[1]; o.hurtboxHeight = a[2]; pc.i++; return BHV_CONTINUE;
    case 'SET_HITBOX_WITH_OFFSET': o.hitboxRadius = a[1]; o.hitboxHeight = a[2]; o.hitboxDownOffset = a[3]; pc.i++; return BHV_CONTINUE;
    case 'LOAD_ANIMATIONS': o.ptr[a[1][1]] = W.animTable(a[2]); pc.i++; return BHV_CONTINUE;
    case 'ANIMATE': geo_obj_init_animation(o.gfx, o.oAnimations[a[1]]); pc.i++; return BHV_CONTINUE;
    case 'LOAD_COLLISION_DATA': o.collisionData = W.collision(a[1]); pc.i++; return BHV_CONTINUE;
    case 'SET_HOME': o.oHomeX = o.oPosX; o.oHomeY = o.oPosY; o.oHomeZ = o.oPosZ; pc.i++; return BHV_CONTINUE;
    case 'SET_INTERACT_TYPE': o.oInteractType = a[1]; pc.i++; return BHV_CONTINUE;
    case 'SET_INTERACT_SUBTYPE': o.oInteractionSubtype = a[1]; pc.i++; return BHV_CONTINUE;
    case 'SET_OBJ_PHYSICS':
      o.oWallHitboxRadius = a[1]; o.oGravity = a[2] / 100; o.oBounciness = a[3] / 100;
      o.oDragStrength = a[4] / 100; o.oFriction = a[5] / 100; o.oBuoyancy = a[6] / 100;
      pc.i++; return BHV_CONTINUE;
    case 'SCALE': F.cur_obj_scale(a[2] / 100); pc.i++; return BHV_CONTINUE;
    case 'PARENT_BIT_CLEAR': { const p = o.parentObj; p.raw.s32[a[1][1]] &= (a[2] ^ 0xFFFFFFFF); pc.i++; return BHV_CONTINUE; }
    case 'ANIMATE_TEXTURE': if ((W.gGlobalTimer % a[2]) === 0) cur_obj_set_int(o, a[1], cur_obj_get_int(o, a[1]) + 1); pc.i++; return BHV_CONTINUE;
    case 'DISABLE_RENDERING': o.gfx.flags &= ~GRAPH_RENDER_ACTIVE; pc.i++; return BHV_CONTINUE;
    case 'SPAWN_WATER_DROPLET': pc.i++; return BHV_CONTINUE;
    case 'CYLBOARD': o.gfx.flags |= GRAPH_RENDER_BILLBOARD; pc.i++; return BHV_CONTINUE;
    default: pc.i++; return BHV_CONTINUE;      /* the no-ops */
  }
}
function cur_obj_update() {
  const o = W.gCurrentObject;
  let flags = s16(o.oFlags), dist = 0;
  if (flags & OBJ_FLAG_COMPUTE_DIST_TO_MARIO) { o.oDistanceToMario = F.dist_between_objects(o, W.gMarioObject); dist = o.oDistanceToMario; }
  if (flags & OBJ_FLAG_COMPUTE_ANGLE_TO_MARIO) o.oAngleToMario = F.obj_angle_to_object(o, W.gMarioObject);
  if (o.oAction !== o.oPrevAction) { o.oTimer = 0; o.oSubAction = 0; o.oPrevAction = o.oAction; }
  const pc = o.curBhvCommand;
  let guard = 0;
  while (bhvStep(o, pc) === BHV_CONTINUE) {
    if (++guard > 10000) { console.warn('sm64: script runs on', o.behavior && o.behavior.name); break; }
  }
  if (o.oTimer < 0x3FFFFFFF) o.oTimer++;
  if (o.oAction !== o.oPrevAction) { o.oTimer = 0; o.oSubAction = 0; o.oPrevAction = o.oAction; }
  flags = s16(o.oFlags);
  if (flags & OBJ_FLAG_SET_FACE_ANGLE_TO_MOVE_ANGLE) F.obj_set_face_angle_to_move_angle(o);
  if (flags & OBJ_FLAG_SET_FACE_YAW_TO_MOVE_YAW) o.oFaceAngleYaw = o.oMoveAngleYaw;
  if (flags & OBJ_FLAG_MOVE_XZ_USING_FVEL) F.cur_obj_move_xz_using_fvel_and_yaw();
  if (flags & OBJ_FLAG_MOVE_Y_WITH_TERMINAL_VEL) F.cur_obj_move_y_with_terminal_vel();
  if (flags & OBJ_FLAG_TRANSFORM_RELATIVE_TO_PARENT) F.obj_build_transform_relative_to_parent(o);
  if (flags & OBJ_FLAG_SET_THROW_MATRIX_FROM_TRANSFORM) F.obj_set_throw_matrix_from_transform(o);
  if (flags & OBJ_FLAG_UPDATE_GFX_POS_AND_ANGLE) obj_update_gfx_pos_and_angle(o);
  if (o.oRoom === -1 && (flags & OBJ_FLAG_COMPUTE_DIST_TO_MARIO) && !o.collisionData) {
    if (!(flags & OBJ_FLAG_ACTIVE_FROM_AFAR)) {
      if (dist > o.oDrawingDistance) { o.gfx.flags &= ~GRAPH_RENDER_ACTIVE; o.activeFlags |= ACTIVE_FLAG_FAR_AWAY; }
      else if (o.oHeldState === HELD_FREE) { o.gfx.flags |= GRAPH_RENDER_ACTIVE; o.activeFlags &= ~ACTIVE_FLAG_FAR_AWAY; }
    }
  }
}
function obj_update_gfx_pos_and_angle(obj) {
  obj.gfx.pos[0] = obj.oPosX; obj.gfx.pos[1] = obj.oPosY + obj.oGraphYOffset; obj.gfx.pos[2] = obj.oPosZ;
  obj.gfx.angle[0] = obj.oFaceAnglePitch & 0xFFFF;
  obj.gfx.angle[1] = obj.oFaceAngleYaw & 0xFFFF;
  obj.gfx.angle[2] = obj.oFaceAngleRoll & 0xFFFF;
}

/* ══ OBJECT COLLISION (object_collision.c) ═════════════════════ */
function detect_object_hitbox_overlap(a, b) {
  const ay = a.oPosY - a.hitboxDownOffset, by = b.oPosY - b.hitboxDownOffset;
  const dx = a.oPosX - b.oPosX, dz = a.oPosZ - b.oPosZ;
  if (a.hitboxRadius + b.hitboxRadius > Math.sqrt(dx * dx + dz * dz)) {
    const at = a.hitboxHeight + ay, bt = b.hitboxHeight + by;
    if (ay > bt || at < by) return 0;
    if (a.numCollidedObjs >= 4 || b.numCollidedObjs >= 4) return 0;
    a.collidedObjs[a.numCollidedObjs] = b; b.collidedObjs[b.numCollidedObjs] = a;
    a.collidedObjInteractTypes |= b.oInteractType; b.collidedObjInteractTypes |= a.oInteractType;
    a.numCollidedObjs++; b.numCollidedObjs++;
    return 1;
  }
  return 0;
}
function detect_object_hurtbox_overlap(a, b) {
  const ay = a.oPosY - a.hitboxDownOffset, by = b.oPosY - b.hitboxDownOffset;
  const dx = a.oPosX - b.oPosX, dz = a.oPosZ - b.oPosZ;
  if (a === W.gMarioObject) b.oInteractionSubtype |= INT_SUBTYPE_DELAY_INVINCIBILITY;
  if (a.hurtboxRadius + b.hurtboxRadius > Math.sqrt(dx * dx + dz * dz)) {
    const at = a.hitboxHeight + ay, bt = b.hurtboxHeight + by;
    if (ay > bt || at < by) return 0;
    if (a === W.gMarioObject) b.oInteractionSubtype &= ~INT_SUBTYPE_DELAY_INVINCIBILITY;
    return 1;
  }
  return 0;
}
function clear_object_collision(list) {
  for (const o of list) {
    o.numCollidedObjs = 0; o.collidedObjInteractTypes = 0;
    if (o.oIntangibleTimer > 0) o.oIntangibleTimer--;
  }
}
function check_collision_in_list(a, list, from) {
  if (a.oIntangibleTimer !== 0) return;
  for (let i = from; i < list.length; i++) {
    const b = list[i];
    if (b.oIntangibleTimer === 0 && detect_object_hitbox_overlap(a, b) && b.hurtboxRadius !== 0) detect_object_hurtbox_overlap(a, b);
  }
}
function detect_object_collisions() {
  const L = W.gObjectLists;
  for (const k of [OBJ_LIST_POLELIKE, OBJ_LIST_PLAYER, OBJ_LIST_PUSHABLE, OBJ_LIST_GENACTOR, OBJ_LIST_LEVEL, OBJ_LIST_SURFACE, OBJ_LIST_DESTRUCTIVE]) clear_object_collision(L[k]);
  const pl = L[OBJ_LIST_PLAYER];
  for (let i = 0; i < pl.length; i++) {
    const a = pl[i];
    check_collision_in_list(a, pl, i + 1);
    for (const k of [OBJ_LIST_POLELIKE, OBJ_LIST_LEVEL, OBJ_LIST_GENACTOR, OBJ_LIST_PUSHABLE, OBJ_LIST_SURFACE, OBJ_LIST_DESTRUCTIVE]) check_collision_in_list(a, L[k], 0);
  }
  const de = L[OBJ_LIST_DESTRUCTIVE];
  for (let i = 0; i < de.length; i++) {
    const a = de[i];
    if (a.oDistanceToMario < 2000 && !(a.activeFlags & ACTIVE_FLAG_UNK9)) {
      check_collision_in_list(a, de, i + 1);
      for (const k of [OBJ_LIST_GENACTOR, OBJ_LIST_PUSHABLE, OBJ_LIST_SURFACE]) check_collision_in_list(a, L[k], 0);
    }
  }
  const pu = L[OBJ_LIST_PUSHABLE];
  for (let i = 0; i < pu.length; i++) check_collision_in_list(pu[i], pu, i + 1);
}

/* ══ THE FRAME (object_list_processor.c) ═══════════════════════ */
const PARTICLES = [
  [PARTICLE_DUST, ACTIVE_PARTICLE_DUST, MODEL_MIST, 'bhvMistParticleSpawner'],
  [PARTICLE_VERTICAL_STAR, ACTIVE_PARTICLE_V_STAR, MODEL_NONE, 'bhvVertStarParticleSpawner'],
  [PARTICLE_HORIZONTAL_STAR, ACTIVE_PARTICLE_H_STAR, MODEL_NONE, 'bhvHorStarParticleSpawner'],
  [PARTICLE_SPARKLES, ACTIVE_PARTICLE_SPARKLES, MODEL_SPARKLES, 'bhvSparkleParticleSpawner'],
  [PARTICLE_LEAF, ACTIVE_PARTICLE_LEAF, MODEL_NONE, 'bhvLeafParticleSpawner'],
  [PARTICLE_DIRT, ACTIVE_PARTICLE_DIRT, MODEL_NONE, 'bhvDirtParticleSpawner'],
  [PARTICLE_MIST_CIRCLE, ACTIVE_PARTICLE_MIST_CIRCLE, MODEL_NONE, 'bhvMistCircParticleSpawner'],
  [PARTICLE_TRIANGLE, ACTIVE_PARTICLE_TRIANGLE, MODEL_NONE, 'bhvTriangleParticleSpawner'],
];
function copy_mario_state_to_object() {
  const o = W.gCurrentObject, m = W.gMarioStates[0];
  o.oVelX = m.vel[0]; o.oVelY = m.vel[1]; o.oVelZ = m.vel[2];
  o.oPosX = m.pos[0]; o.oPosY = m.pos[1]; o.oPosZ = m.pos[2];
  o.oMoveAnglePitch = o.gfx.angle[0]; o.oMoveAngleYaw = o.gfx.angle[1]; o.oMoveAngleRoll = o.gfx.angle[2];
  o.oFaceAnglePitch = o.gfx.angle[0]; o.oFaceAngleYaw = o.gfx.angle[1]; o.oFaceAngleRoll = o.gfx.angle[2];
  o.oAngleVelPitch = m.angleVel[0]; o.oAngleVelYaw = m.angleVel[1]; o.oAngleVelRoll = m.angleVel[2];
}
function spawn_particle(flag, model, bhvName) {
  const o = W.gCurrentObject;
  if (!(o.oActiveParticleFlags & flag) && B[bhvName]) {
    o.oActiveParticleFlags |= flag;
    const p = F.spawn_object_at_origin(o, 0, model, B[bhvName]);
    F.obj_copy_pos_and_angle(p, o);
  }
}
function bhv_mario_update() {
  const pf = F.execute_mario_action(W.gMarioStates[0]);
  W.gCurrentObject.oMarioParticleFlags = pf;
  copy_mario_state_to_object();
  for (const [flag, active, model, bhv] of PARTICLES) if (pf & flag) spawn_particle(active, model, bhv);
}
const UPDATE_ORDER = [OBJ_LIST_SPAWNER, OBJ_LIST_SURFACE, OBJ_LIST_POLELIKE, OBJ_LIST_PLAYER, OBJ_LIST_PUSHABLE,
                      OBJ_LIST_GENACTOR, OBJ_LIST_DESTRUCTIVE, OBJ_LIST_LEVEL, OBJ_LIST_DEFAULT, OBJ_LIST_UNIMPORTANT];
function update_objects_in_list(list) {
  /* objects spawned during the update join the end of their list and are updated this frame, as in the game */
  for (let i = 0; i < list.length; i++) {
    const o = list[i];
    if (W.gTimeStopState & TIME_STOP_ACTIVE) {
      let unfrozen = false;
      if (!(W.gTimeStopState & TIME_STOP_ALL_OBJECTS)) {
        if (o === W.gMarioObject && !(W.gTimeStopState & TIME_STOP_MARIO_AND_DOORS)) unfrozen = true;
        if (o.activeFlags & (ACTIVE_FLAG_UNIMPORTANT | ACTIVE_FLAG_INITIATED_TIME_STOP)) unfrozen = true;
      }
      if (!unfrozen) { o.gfx.flags &= ~GRAPH_RENDER_HAS_ANIMATION; continue; }
    }
    W.gCurrentObject = o;
    o.gfx.flags |= GRAPH_RENDER_HAS_ANIMATION;
    cur_obj_update();
  }
}
function unload_deactivated_objects() {
  for (const k of UPDATE_ORDER) {
    const list = W.gObjectLists[k];
    for (let i = list.length - 1; i >= 0; i--) {
      const o = list[i];
      if ((o.activeFlags & ACTIVE_FLAG_ACTIVE) !== ACTIVE_FLAG_ACTIVE) {
        if (!(o.oFlags & OBJ_FLAG_PERSISTENT_RESPAWN) && o.respawnInfo) o.respawnInfo.dontRespawn = true;
        unload_object(o);
      }
    }
  }
  W.gTimeStopState &= ~TIME_STOP_UNKNOWN_0;
}
function update_objects() {
  W.gTimeStopState &= ~TIME_STOP_MARIO_OPENED_DOOR;
  W.col.forCamera = false;
  W.col.clearDynamic();
  update_objects_in_list(W.gObjectLists[OBJ_LIST_SPAWNER]);
  update_objects_in_list(W.gObjectLists[OBJ_LIST_SURFACE]);
  F.apply_mario_platform_displacement();
  detect_object_collisions();
  for (let i = 2; i < UPDATE_ORDER.length; i++) update_objects_in_list(W.gObjectLists[UPDATE_ORDER[i]]);
  unload_deactivated_objects();
  F.update_mario_platform();
  if (W.gTimeStopState & TIME_STOP_ENABLED) W.gTimeStopState |= TIME_STOP_ACTIVE;
  else W.gTimeStopState &= ~TIME_STOP_ACTIVE;
}

/* ══ SPAWNING (object_helpers.c's spawn_object_at_origin needs the models) ═ */
function spawn_object_at_origin(parent, unused, model, bhv) {
  const obj = create_object(bhv);
  obj.parentObj = parent;
  obj.gfx.areaIndex = parent.gfx.areaIndex;
  obj.gfx.activeAreaIndex = parent.gfx.areaIndex;
  geo_obj_init(obj.gfx, W.gLoadedGraphNodes[model] || null, [0, 0, 0], [0, 0, 0]);
  return obj;
}
/* objects the level places (spawn_objects_from_info): { bhv, model, pos, angle, params } */
function spawn_from_info(info) {
  if (info.dontRespawn) return null;
  const obj = create_object(B[info.bhv]);
  obj.oBhvParams = info.params >>> 0;
  obj.oBhvParams2ndByte = (info.params >>> 16) & 0xFF;
  obj.respawnInfoType = RESPAWN_INFO_TYPE_32;
  obj.respawnInfo = info;
  geo_obj_init(obj.gfx, W.gLoadedGraphNodes[info.model] || null, info.pos, info.angle);
  obj.oPosX = info.pos[0]; obj.oPosY = info.pos[1]; obj.oPosZ = info.pos[2];
  obj.oFaceAnglePitch = info.angle[0]; obj.oFaceAngleYaw = info.angle[1]; obj.oFaceAngleRoll = info.angle[2];
  obj.oMoveAnglePitch = info.angle[0]; obj.oMoveAngleYaw = info.angle[1]; obj.oMoveAngleRoll = info.angle[2];
  return obj;
}

/* ══ WHAT THE ENGINE ASKS OF THINGS THIS COURSE HAS NONE OF ════ */
const nothing = () => 0;
for (const n of ['play_sound', 'play_music', 'stop_background_music', 'fadeout_background_music', 'play_cap_music',
  'stop_cap_music', 'fadeout_cap_music', 'play_shell_music', 'stop_shell_music', 'play_cutscene_music', 'fadeout_level_music',
  'play_course_clear', 'play_power_star_jingle', 'play_puzzle_jingle', 'play_star_fanfare', 'play_toads_jingle',
  'play_peachs_jingle', 'play_race_fanfare', 'play_secondary_music', 'func_80321080', 'disable_background_sound',
  'enable_background_sound', 'lower_background_noise', 'raise_background_noise', 'set_sound_moving_speed', 'stop_sound',
  'stop_sounds_from_source', 'cur_obj_play_sound_1', 'cur_obj_play_sound_2', 'create_sound_spawner', 'play_sound_rand_spawn',
  'play_menu_sounds', 'seq_player_lower_volume', 'seq_player_unlower_volume', 'sound_banks_enable', 'sound_banks_disable',
  'override_viewport_and_clip', 'reset_cutscene_msg_fade', 'set_cutscene_message', 'set_menu_mode', 'load_level_init_text',
  'save_file_do_save', 'save_file_set_cap_pos', 'save_file_clear_flags', 'save_file_set_flags', 'play_transition',
  'cur_obj_play_sound_at_anim_range', 'spawn_mist_particles_variable', 'obj_set_speed_to_zero', 'enable_time_stop_including_mario',
  'disable_time_stop_including_mario', 'set_mario_npc_dialog_unused', 'stub_obj_list_processor_1']) {
  if (!F[n]) F[n] = nothing;
}
F.save_file_get_flags = () => 0;
F.save_file_get_total_star_count = () => W.gMarioStates[0] ? W.gMarioStates[0].numStars : 0;
F.save_file_get_star_flags = () => W.starFlags || 0;
F.save_file_collect_star_or_key = (coins, starIndex) => { W.starFlags = (W.starFlags || 0) | (1 << starIndex); };

Object.assign(F, {
  mtxf_identity, mtxf_copy, mtxf_to_mtx, vec3f_get_dist_and_angle, random_u16, random_float, random_sign,
  clear_objects, allocate_object, create_object, mark_obj_for_deletion, unload_object, geo_obj_init,
  geo_obj_init_animation, geo_obj_init_animation_accel, obj_set_gfx_pos_from_pos, cur_obj_init_animation,
  cur_obj_init_animation_with_sound, cur_obj_init_animation_with_accel_and_sound, obj_init_animation_with_accel_and_sound,
  obj_init_animation_with_sound, cur_obj_enable_rendering_and_become_tangible, cur_obj_find_nearest_object_with_behavior,
  find_unimportant_object, count_unimportant_objects, count_objects_with_behavior, cur_obj_find_nearby_held_actor,
  cur_obj_has_behavior, obj_has_behavior, cur_obj_call_action_function, cur_obj_set_action_table, is_item_in_array,
  cur_obj_check_frame_prior_current_frame, obj_get_field_if_unused, approach_f32_signed, apply_drag_to_value, clear_move_flag,
  turn_obj_away_from_surface, obj_orient_graph, calc_obj_friction, trigger_obj_dialog_when_facing, clamp_s16, clamp_f32,
  approach_f32_ptr, obj_smooth_turn, obj_grow_then_shrink, oscillate_toward, obj_update_blinking,
  obj_resolve_object_collisions, obj_bounce_off_walls_edges_objects, get_mario_pos, set_mario_pos, find_floor,
  find_floor_height, find_ceil, find_floor_height_and_data, find_wall_collisions, f32_find_wall_collision, find_water_level,
  find_poison_gas_level, load_object_collision_model, cur_obj_update, obj_update_gfx_pos_and_angle,
  detect_object_hitbox_overlap, detect_object_hurtbox_overlap, detect_object_collisions, bhv_mario_update, update_objects,
  spawn_object_at_origin, spawn_from_info, unload_deactivated_objects,
});

})(window);
