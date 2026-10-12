/* ══════════════════════════════════════════════════════════════
   27-sm64-mario.js — Mario: his state, his inputs, his steps.

   Super Mario 64's game/mario.c and game/mario_step.c, written again in
   JavaScript from the decompilation (github.com/n64decomp/sm64), function
   for function under the game's own names: how the stick and the buttons
   become intent, how the floor under him is classed (slippery, steep), how
   an action is entered (a double jump's 52 up and a quarter of his speed,
   a long jump's 30 and half as fast again), and how each frame he moves in
   four quarter steps against the walls, the floor and the ceiling.

   The actions themselves (standing, moving, in the air, holding, on a
   ledge or a tree, the cutscenes) are in the files after this one; they
   add to SM64.Mario.
══════════════════════════════════════════════════════════════ */
(function (root) {
'use strict';
const SM64 = root.SM64;
const { s16, sins, coss, atan2s } = SM64.m;
/*CONSTS*/
const { ACT_BACKFLIP, ACT_BBH_ENTER_SPIN, ACT_BEGIN_SLIDING, ACT_BURNING_JUMP, ACT_BUTT_SLIDE, ACT_CRAWLING, 
  ACT_DIVE, ACT_DOUBLE_JUMP, ACT_DOUBLE_JUMP_LAND, ACT_EMERGE_FROM_PIPE, ACT_FALL_AFTER_STAR_GRAB, ACT_FIRST_PERSON, 
  ACT_FLAG_AIR, ACT_FLAG_ALLOW_FIRST_PERSON, ACT_FLAG_CONTROL_JUMP_HEIGHT, ACT_FLAG_INTANGIBLE, 
  ACT_FLAG_INVULNERABLE, ACT_FLAG_METAL_WATER, ACT_FLAG_SHORT_HITBOX, ACT_FLAG_SWIMMING, ACT_FLYING, 
  ACT_FLYING_TRIPLE_JUMP, ACT_FREEFALL, ACT_FREEFALL_LAND, ACT_GETTING_BLOWN, ACT_GROUP_AIRBORNE, 
  ACT_GROUP_AUTOMATIC, ACT_GROUP_CUTSCENE, ACT_GROUP_MASK, ACT_GROUP_MOVING, ACT_GROUP_OBJECT, ACT_GROUP_STATIONARY, 
  ACT_GROUP_SUBMERGED, ACT_HOLD_BEGIN_SLIDING, ACT_HOLD_BUTT_SLIDE, ACT_HOLD_FREEFALL, ACT_HOLD_JUMP, 
  ACT_HOLD_STOMACH_SLIDE, ACT_HOLD_WALKING, ACT_HOLD_WATER_JUMP, ACT_IDLE, ACT_IN_CANNON, ACT_JUMP, ACT_JUMP_KICK, 
  ACT_JUMP_LAND, ACT_LAVA_BOOST, ACT_LONG_JUMP, ACT_READING_AUTOMATIC_DIALOG, ACT_READING_NPC_DIALOG, 
  ACT_READING_SIGN, ACT_RIDING_SHELL_JUMP, ACT_SHOT_FROM_CANNON, ACT_SIDE_FLIP, ACT_SIDE_FLIP_LAND_STOP, 
  ACT_SLIDE_KICK, ACT_SPAWN_SPIN_AIRBORNE, ACT_SPECIAL_DEATH_EXIT, ACT_SPECIAL_EXIT_AIRBORNE, ACT_STEEP_JUMP, 
  ACT_STOMACH_SLIDE, ACT_TOP_OF_POLE_JUMP, ACT_TRIPLE_JUMP, ACT_TWIRLING, ACT_WALKING, ACT_WALL_KICK_AIR, 
  ACT_WATER_JUMP, AIR_STEP_CHECK_HANG, AIR_STEP_CHECK_LEDGE_GRAB, AIR_STEP_GRABBED_CEILING, AIR_STEP_GRABBED_LEDGE, 
  AIR_STEP_HIT_LAVA_WALL, AIR_STEP_HIT_WALL, AIR_STEP_LANDED, AIR_STEP_NONE, ANIM_FLAG_2, ANIM_FLAG_6, 
  ANIM_FLAG_BACKWARD, ANIM_FLAG_HOR_TRANS, ANIM_FLAG_VERT_TRANS, A_BUTTON, B_BUTTON, CAMERA_MODE_BEHIND_MARIO, 
  CAMERA_MODE_WATER_SURFACE, CAM_MOVE_C_UP_MODE, GRAPH_RENDER_INVISIBLE, GROUND_STEP_HIT_WALL, 
  GROUND_STEP_HIT_WALL_CONTINUE_QSTEPS, GROUND_STEP_HIT_WALL_STOP_QSTEPS, GROUND_STEP_LEFT_GROUND, GROUND_STEP_NONE, 
  INPUT_ABOVE_SLIDE, INPUT_A_DOWN, INPUT_A_PRESSED, INPUT_B_PRESSED, INPUT_FIRST_PERSON, INPUT_IN_WATER, 
  INPUT_NONZERO_ANALOG, INPUT_OFF_FLOOR, INPUT_SQUISHED, INPUT_STOMPED, INPUT_UNKNOWN_5, INPUT_Z_DOWN, 
  INPUT_Z_PRESSED, INT_STATUS_MARIO_KNOCKBACK_DMG, INT_STATUS_MARIO_SHOCKWAVE, INT_STATUS_MARIO_STUNNED, 
  MARIO_ACTION_SOUND_PLAYED, MARIO_CAPS, MARIO_CAP_IN_HAND, MARIO_CAP_ON_HEAD, MARIO_EYES_BLINK, MARIO_HAND_FISTS, 
  MARIO_HAND_HOLDING_CAP, MARIO_HAND_HOLDING_WING_CAP, MARIO_HAS_DEFAULT_CAP_OFF, MARIO_HAS_DEFAULT_CAP_ON, 
  MARIO_HAS_WING_CAP_ON, MARIO_MARIO_SOUND_PLAYED, MARIO_METAL_CAP, MARIO_METAL_SHOCK, MARIO_NORMAL_CAP, 
  MARIO_SPECIAL_CAPS, MARIO_TELEPORTING, MARIO_UNKNOWN_08, MARIO_UNKNOWN_18, MARIO_UNKNOWN_25, MARIO_UNKNOWN_30, 
  MARIO_VANISH_CAP, MARIO_WING_CAP, MODEL_STATE_METAL, MODEL_STATE_NOISE_ALPHA, PARTICLE_DIRT, 
  PARTICLE_SHALLOW_WATER_SPLASH, PARTICLE_SHALLOW_WATER_WAVE, PARTICLE_SNOW, SOUND_ACTION_TERRAIN_JUMP, 
  SOUND_TERRAIN_DEFAULT, SOUND_TERRAIN_SAND, SOUND_TERRAIN_SNOW, SOUND_TERRAIN_WATER, SURFACE_BURNING, 
  SURFACE_CLASS_DEFAULT, SURFACE_CLASS_NOT_SLIPPERY, SURFACE_CLASS_SLIPPERY, SURFACE_CLASS_VERY_SLIPPERY, 
  SURFACE_HANGABLE, SURFACE_HARD_NOT_SLIPPERY, SURFACE_HARD_SLIPPERY, SURFACE_HARD_VERY_SLIPPERY, SURFACE_ICE, 
  SURFACE_NOISE_SLIPPERY, SURFACE_NOISE_VERY_SLIPPERY, SURFACE_NOISE_VERY_SLIPPERY_73, 
  SURFACE_NOISE_VERY_SLIPPERY_74, SURFACE_NOT_SLIPPERY, SURFACE_NO_CAM_COL_SLIPPERY, 
  SURFACE_NO_CAM_COL_VERY_SLIPPERY, SURFACE_SLIPPERY, SURFACE_SWITCH, SURFACE_VERY_SLIPPERY, TERRAIN_MASK, 
  TERRAIN_SLIDE, WARP_OP_DEATH, Z_TRIG } = SM64.C;
/*END CONSTS*/

const W = SM64.W = SM64.W || {};     /* the world: collision, camera, objects (filled in by 27-bob.js) */
const F = SM64.F = SM64.F || {};     /* every ported function, by its name in the game */
const Mario = SM64.Mario = SM64.Mario || {};
const noop = () => {};
const play_sound = noop;             /* no sounds (grumkata: no sounds in the app) */

/* ══ ANIMATIONS (mario.c) ═════════════════════════════════════ */
function animInfo(m) { return m.marioObj.gfx.anim; }
function is_anim_at_end(m) { const a = animInfo(m); return (a.frame + 1) === a.anim.loopEnd; }
function is_anim_past_end(m) { const a = animInfo(m); return a.frame >= (a.anim.loopEnd - 2); }
function set_mario_animation(m, id) {
  const a = animInfo(m), target = W.marioAnim(id);
  if (a.id !== id) {
    a.id = id; a.anim = target; a.accel = 0; a.yTrans = m.unkB0;
    if (target.flags & ANIM_FLAG_2) a.frame = target.start;
    else if (target.flags & ANIM_FLAG_BACKWARD) a.frame = target.start + 1;
    else a.frame = target.start - 1;
  }
  return a.frame;
}
function set_mario_anim_with_accel(m, id, accel) {
  const a = animInfo(m), target = W.marioAnim(id);
  if (a.id !== id) {
    a.id = id; a.anim = target; a.yTrans = m.unkB0;
    if (target.flags & ANIM_FLAG_2) a.assist = target.start * 65536;
    else if (target.flags & ANIM_FLAG_BACKWARD) a.assist = target.start * 65536 + accel;
    else a.assist = target.start * 65536 - accel;
    a.frame = a.assist >> 16;
  }
  a.accel = accel;
  return a.frame;
}
function set_anim_to_frame(m, frame) {
  const a = animInfo(m);
  if (a.accel !== 0) {
    if (a.anim.flags & ANIM_FLAG_BACKWARD) a.assist = frame * 65536 + a.accel;
    else a.assist = frame * 65536 - a.accel;
  } else {
    if (a.anim.flags & ANIM_FLAG_BACKWARD) a.frame = frame + 1;
    else a.frame = frame - 1;
  }
}
function is_anim_past_frame(m, frame) {
  const a = animInfo(m), acc = frame * 65536;
  if (a.accel !== 0) {
    if (a.anim.flags & ANIM_FLAG_BACKWARD) return a.assist > acc && acc >= a.assist - a.accel;
    return a.assist < acc && acc <= a.assist + a.accel;
  }
  if (a.anim.flags & ANIM_FLAG_BACKWARD) return a.frame === frame + 1;
  return a.frame + 1 === frame;
}
/* the animation's own movement this frame (the frame it would step to), turned by yaw */
function find_mario_anim_flags_and_translation(obj, yaw, t) {
  const a = obj.gfx.anim, A = a.anim;
  const frame = W.peekAnimFrame(a);
  let k = 0;
  const val = () => SM64.gfx.animValue(A, k++, frame);
  const s = sins(yaw), c = coss(yaw);
  const dx = val() / 4, ty = val() / 4, dz = val() / 4;
  t[0] = Math.trunc(dx * c + dz * s);
  t[1] = Math.trunc(ty);
  t[2] = Math.trunc(-dx * s + dz * c);
  return A.flags;
}
function update_mario_pos_for_anim(m) {
  const t = [0, 0, 0];
  const flags = find_mario_anim_flags_and_translation(m.marioObj, m.faceAngle[1], t);
  if (flags & (ANIM_FLAG_HOR_TRANS | ANIM_FLAG_6)) { m.pos[0] += t[0]; m.pos[2] += t[2]; }
  if (flags & (ANIM_FLAG_VERT_TRANS | ANIM_FLAG_6)) m.pos[1] += t[1];
}
function return_mario_anim_y_translation(m) {
  const t = [0, 0, 0];
  find_mario_anim_flags_and_translation(m.marioObj, 0, t);
  return t[1];
}

/* ══ SOUNDS: the flags they set still matter (particles too) ═══ */
function play_sound_if_no_flag(m, bits, flags) { if (!(m.flags & flags)) m.flags |= flags; }
function play_mario_jump_sound(m) { if (!(m.flags & MARIO_MARIO_SOUND_PLAYED)) m.flags |= MARIO_MARIO_SOUND_PLAYED; }
function adjust_sound_for_speed() {}
function play_sound_and_spawn_particles(m, bits, wave) {
  if (m.terrainSoundAddend === (SOUND_TERRAIN_WATER << 16)) {
    m.particleFlags |= wave !== 0 ? PARTICLE_SHALLOW_WATER_SPLASH : PARTICLE_SHALLOW_WATER_WAVE;
  } else if (m.terrainSoundAddend === (SOUND_TERRAIN_SAND << 16)) m.particleFlags |= PARTICLE_DIRT;
  else if (m.terrainSoundAddend === (SOUND_TERRAIN_SNOW << 16)) m.particleFlags |= PARTICLE_SNOW;
}
function play_mario_action_sound(m, bits, wave) {
  if (!(m.flags & MARIO_ACTION_SOUND_PLAYED)) { play_sound_and_spawn_particles(m, bits, wave); m.flags |= MARIO_ACTION_SOUND_PLAYED; }
}
function play_mario_landing_sound(m, bits) { play_sound_and_spawn_particles(m, bits, 1); }
function play_mario_landing_sound_once(m, bits) { play_mario_action_sound(m, bits, 1); }
function play_mario_heavy_landing_sound(m, bits) { play_sound_and_spawn_particles(m, bits, 1); }
function play_mario_heavy_landing_sound_once(m, bits) { play_mario_action_sound(m, bits, 1); }
function play_mario_sound(m, actionSound, marioSound) {
  if (actionSound === SOUND_ACTION_TERRAIN_JUMP) play_mario_action_sound(m, actionSound, 1);
  else play_sound_if_no_flag(m, actionSound, MARIO_ACTION_SOUND_PLAYED);
  if (marioSound === 0) play_mario_jump_sound(m);
  if (marioSound !== -1) play_sound_if_no_flag(m, marioSound, MARIO_MARIO_SOUND_PLAYED);
}

/* ══ THE FLOOR (mario.c) ══════════════════════════════════════ */
function mario_set_forward_vel(m, v) {
  m.forwardVel = v;
  m.slideVelX = sins(m.faceAngle[1]) * v;
  m.slideVelZ = coss(m.faceAngle[1]) * v;
  m.vel[0] = m.slideVelX;
  m.vel[2] = m.slideVelZ;
}
function mario_get_floor_class(m) {
  let c = (m.area.terrainType & TERRAIN_MASK) === TERRAIN_SLIDE ? SURFACE_CLASS_VERY_SLIPPERY : SURFACE_CLASS_DEFAULT;
  if (m.floor) {
    switch (m.floor.type) {
      case SURFACE_NOT_SLIPPERY: case SURFACE_HARD_NOT_SLIPPERY: case SURFACE_SWITCH:
        c = SURFACE_CLASS_NOT_SLIPPERY; break;
      case SURFACE_SLIPPERY: case SURFACE_NOISE_SLIPPERY: case SURFACE_HARD_SLIPPERY: case SURFACE_NO_CAM_COL_SLIPPERY:
        c = SURFACE_CLASS_SLIPPERY; break;
      case SURFACE_VERY_SLIPPERY: case SURFACE_ICE: case SURFACE_HARD_VERY_SLIPPERY: case SURFACE_NOISE_VERY_SLIPPERY_73:
      case SURFACE_NOISE_VERY_SLIPPERY_74: case SURFACE_NOISE_VERY_SLIPPERY: case SURFACE_NO_CAM_COL_VERY_SLIPPERY:
        c = SURFACE_CLASS_VERY_SLIPPERY; break;
    }
  }
  if (m.action === ACT_CRAWLING && m.floor.ny > 0.5 && c === SURFACE_CLASS_DEFAULT) c = SURFACE_CLASS_NOT_SLIPPERY;
  return c;
}
function mario_get_terrain_sound_addend(m) {
  /* only whether he is in water or on sand matters here (particles) */
  if (m.floor) {
    if (m.floorHeight < m.waterLevel - 10) return SOUND_TERRAIN_WATER << 16;
  }
  return SOUND_TERRAIN_DEFAULT << 16;
}
function resolve_and_return_wall_collisions(pos, offset, radius) {
  const d = { x: pos[0], y: pos[1], z: pos[2], radius, offsetY: offset };
  let wall = null;
  if (W.col.walls(d)) wall = d.walls[d.walls.length - 1];
  pos[0] = d.x; pos[1] = d.y; pos[2] = d.z;
  return wall;
}
function vec3f_find_ceil(pos, height, out) {
  const r = W.col.ceil(pos[0], height + 80, pos[2]);
  if (out) out.s = r.s;
  return r.h;
}
function mario_facing_downhill(m, turnYaw) {
  let face = m.faceAngle[1];
  if (turnYaw && m.forwardVel < 0) face = s16(face + 0x8000);
  face = s16(m.floorAngle - face);
  return -0x4000 < face && face < 0x4000;
}
function mario_floor_is_slippery(m) {
  let ny;
  if ((m.area.terrainType & TERRAIN_MASK) === TERRAIN_SLIDE && m.floor.ny < 0.9998477) return true;
  switch (mario_get_floor_class(m)) {
    case SURFACE_VERY_SLIPPERY: ny = 0.9848077; break;
    case SURFACE_SLIPPERY: ny = 0.9396926; break;
    default: ny = 0.7880108; break;
    case SURFACE_NOT_SLIPPERY: ny = 0; break;
  }
  return m.floor.ny <= ny;
}
function mario_floor_is_slope(m) {
  let ny;
  if ((m.area.terrainType & TERRAIN_MASK) === TERRAIN_SLIDE && m.floor.ny < 0.9998477) return true;
  switch (mario_get_floor_class(m)) {
    case SURFACE_VERY_SLIPPERY: ny = 0.9961947; break;
    case SURFACE_SLIPPERY: ny = 0.9848077; break;
    default: ny = 0.9659258; break;
    case SURFACE_NOT_SLIPPERY: ny = 0.9396926; break;
  }
  return m.floor.ny <= ny;
}
function mario_floor_is_steep(m) {
  let ny;
  if (!mario_facing_downhill(m, false)) {
    switch (mario_get_floor_class(m)) {
      case SURFACE_VERY_SLIPPERY: ny = 0.9659258; break;
      case SURFACE_SLIPPERY: ny = 0.9396926; break;
      default: ny = 0.8660254; break;
      case SURFACE_NOT_SLIPPERY: ny = 0.8660254; break;
    }
    return m.floor.ny <= ny;
  }
  return false;
}
function find_floor_height_relative_polar(m, angle, dist) {
  const y = sins(m.faceAngle[1] + angle) * dist, x = coss(m.faceAngle[1] + angle) * dist;
  return W.col.floorHeight(m.pos[0] + y, m.pos[1] + 100, m.pos[2] + x);
}
function find_floor_slope(m, yawOffset) {
  const x = sins(m.faceAngle[1] + yawOffset) * 5, z = coss(m.faceAngle[1] + yawOffset) * 5;
  const fwd = W.col.floorHeight(m.pos[0] + x, m.pos[1] + 100, m.pos[2] + z);
  const back = W.col.floorHeight(m.pos[0] - x, m.pos[1] + 100, m.pos[2] - z);
  const fd = fwd - m.pos[1], bd = m.pos[1] - back;
  return fd * fd < bd * bd ? atan2s(5, fd) : atan2s(5, bd);
}
function update_mario_sound_and_camera(m) {
  const action = m.action, cam = m.area.camera;
  if (action === ACT_FIRST_PERSON) { W.gCameraMovementFlags &= ~CAM_MOVE_C_UP_MODE; F.set_camera_mode(cam, -1, 1); }
  if (!(action & (ACT_FLAG_SWIMMING | ACT_FLAG_METAL_WATER))) {
    if (cam.mode === CAMERA_MODE_BEHIND_MARIO || cam.mode === CAMERA_MODE_WATER_SURFACE) F.set_camera_mode(cam, cam.defMode, 1);
  }
}
function set_steep_jump_action(m) {
  m.marioObj.oMarioSteepJumpYaw = m.faceAngle[1];
  if (m.forwardVel > 0) {
    const angleTemp = s16(m.floorAngle + 0x8000);
    const faceTemp = s16(m.faceAngle[1] - angleTemp);
    const y = sins(faceTemp) * m.forwardVel, x = coss(faceTemp) * m.forwardVel * 0.75;
    m.forwardVel = Math.sqrt(y * y + x * x);
    m.faceAngle[1] = s16(atan2s(x, y) + angleTemp);
  }
  drop_and_set_mario_action(m, ACT_STEEP_JUMP, 0);
}
function set_mario_y_vel_based_on_fspeed(m, initial, mult) {
  m.vel[1] = initial + m.forwardVel * mult;
  if (m.squishTimer !== 0 || m.quicksandDepth > 1) m.vel[1] *= 0.5;
}

/* ══ ENTERING AN ACTION (mario.c) ═════════════════════════════ */
function set_mario_action_airborne(m, action, arg) {
  if ((m.squishTimer !== 0 || m.quicksandDepth >= 1) && (action === ACT_DOUBLE_JUMP || action === ACT_TWIRLING)) action = ACT_JUMP;
  switch (action) {
    case ACT_DOUBLE_JUMP: set_mario_y_vel_based_on_fspeed(m, 52, 0.25); m.forwardVel *= 0.8; break;
    case ACT_BACKFLIP: animInfo(m).id = -1; m.forwardVel = -16; set_mario_y_vel_based_on_fspeed(m, 62, 0); break;
    case ACT_TRIPLE_JUMP: set_mario_y_vel_based_on_fspeed(m, 69, 0); m.forwardVel *= 0.8; break;
    case ACT_FLYING_TRIPLE_JUMP: set_mario_y_vel_based_on_fspeed(m, 82, 0); break;
    case ACT_WATER_JUMP: case ACT_HOLD_WATER_JUMP: if (arg === 0) set_mario_y_vel_based_on_fspeed(m, 42, 0); break;
    case ACT_BURNING_JUMP: m.vel[1] = 31.5; m.forwardVel = 8; break;
    case ACT_RIDING_SHELL_JUMP: set_mario_y_vel_based_on_fspeed(m, 42, 0.25); break;
    case ACT_JUMP: case ACT_HOLD_JUMP:
      animInfo(m).id = -1; set_mario_y_vel_based_on_fspeed(m, 42, 0.25); m.forwardVel *= 0.8; break;
    case ACT_WALL_KICK_AIR: case ACT_TOP_OF_POLE_JUMP:
      set_mario_y_vel_based_on_fspeed(m, 62, 0); if (m.forwardVel < 24) m.forwardVel = 24; m.wallKickTimer = 0; break;
    case ACT_SIDE_FLIP: set_mario_y_vel_based_on_fspeed(m, 62, 0); m.forwardVel = 8; m.faceAngle[1] = m.intendedYaw; break;
    case ACT_STEEP_JUMP: animInfo(m).id = -1; set_mario_y_vel_based_on_fspeed(m, 42, 0.25); m.faceAngle[0] = -0x2000; break;
    case ACT_LAVA_BOOST: m.vel[1] = 84; if (arg === 0) m.forwardVel = 0; break;
    case ACT_DIVE: { let v = m.forwardVel + 15; if (v > 48) v = 48; mario_set_forward_vel(m, v); break; }
    case ACT_LONG_JUMP:
      animInfo(m).id = -1; set_mario_y_vel_based_on_fspeed(m, 30, 0);
      m.marioObj.oMarioLongJumpIsSlow = m.forwardVel > 16 ? 0 : 1;
      if ((m.forwardVel *= 1.5) > 48) m.forwardVel = 48;
      break;
    case ACT_SLIDE_KICK: m.vel[1] = 12; if (m.forwardVel < 32) m.forwardVel = 32; break;
    case ACT_JUMP_KICK: m.vel[1] = 20; break;
  }
  m.peakHeight = m.pos[1];
  m.flags |= MARIO_UNKNOWN_08;
  return action;
}
function set_mario_action_moving(m, action) {
  const floorClass = mario_get_floor_class(m), fv = m.forwardVel, mag = Math.min(m.intendedMag, 8);
  switch (action) {
    case ACT_WALKING:
      if (floorClass !== SURFACE_CLASS_VERY_SLIPPERY && 0 <= fv && fv < mag) m.forwardVel = mag;
      m.marioObj.oMarioWalkingPitch = 0;
      break;
    case ACT_HOLD_WALKING: if (0 <= fv && fv < mag / 2) m.forwardVel = mag / 2; break;
    case ACT_BEGIN_SLIDING: action = mario_facing_downhill(m, false) ? ACT_BUTT_SLIDE : ACT_STOMACH_SLIDE; break;
    case ACT_HOLD_BEGIN_SLIDING: action = mario_facing_downhill(m, false) ? ACT_HOLD_BUTT_SLIDE : ACT_HOLD_STOMACH_SLIDE; break;
  }
  return action;
}
function set_mario_action_cutscene(m, action) {
  switch (action) {
    case ACT_EMERGE_FROM_PIPE: m.vel[1] = 52; break;
    case ACT_FALL_AFTER_STAR_GRAB: mario_set_forward_vel(m, 0); break;
    case ACT_SPAWN_SPIN_AIRBORNE: mario_set_forward_vel(m, 2); break;
    case ACT_SPECIAL_EXIT_AIRBORNE: case ACT_SPECIAL_DEATH_EXIT: m.vel[1] = 64; break;
  }
  return action;
}
function set_mario_action(m, action, arg) {
  switch (action & ACT_GROUP_MASK) {
    case ACT_GROUP_MOVING: action = set_mario_action_moving(m, action, arg); break;
    case ACT_GROUP_AIRBORNE: action = set_mario_action_airborne(m, action, arg); break;
    case ACT_GROUP_CUTSCENE: action = set_mario_action_cutscene(m, action, arg); break;
  }
  m.flags &= ~(MARIO_ACTION_SOUND_PLAYED | MARIO_MARIO_SOUND_PLAYED);
  if (!(m.action & ACT_FLAG_AIR)) m.flags &= ~MARIO_UNKNOWN_18;
  m.prevAction = m.action;
  m.action = action;
  m.actionArg = arg || 0;
  m.actionState = 0;
  m.actionTimer = 0;
  return true;
}
function set_jump_from_landing(m) {
  if (mario_floor_is_steep(m)) set_steep_jump_action(m);
  else if (m.doubleJumpTimer === 0 || m.squishTimer !== 0) set_mario_action(m, ACT_JUMP, 0);
  else {
    switch (m.prevAction) {
      case ACT_JUMP_LAND: case ACT_FREEFALL_LAND: case ACT_SIDE_FLIP_LAND_STOP: set_mario_action(m, ACT_DOUBLE_JUMP, 0); break;
      case ACT_DOUBLE_JUMP_LAND:
        if (m.flags & MARIO_WING_CAP) set_mario_action(m, ACT_FLYING_TRIPLE_JUMP, 0);
        else if (m.forwardVel > 20) set_mario_action(m, ACT_TRIPLE_JUMP, 0);
        else set_mario_action(m, ACT_JUMP, 0);
        break;
      default: set_mario_action(m, ACT_JUMP, 0);
    }
  }
  m.doubleJumpTimer = 0;
  return true;
}
function set_jumping_action(m, action, arg) {
  if (mario_floor_is_steep(m)) set_steep_jump_action(m);
  else set_mario_action(m, action, arg);
  return true;
}
function drop_and_set_mario_action(m, action, arg) { F.mario_stop_riding_and_holding(m); return set_mario_action(m, action, arg); }
function hurt_and_set_mario_action(m, action, arg, hurt) { m.hurtCounter = hurt; return set_mario_action(m, action, arg); }
function check_common_action_exits(m) {
  if (m.input & INPUT_A_PRESSED) return set_mario_action(m, ACT_JUMP, 0);
  if (m.input & INPUT_OFF_FLOOR) return set_mario_action(m, ACT_FREEFALL, 0);
  if (m.input & INPUT_NONZERO_ANALOG) return set_mario_action(m, ACT_WALKING, 0);
  if (m.input & INPUT_ABOVE_SLIDE) return set_mario_action(m, ACT_BEGIN_SLIDING, 0);
  return false;
}
function check_common_hold_action_exits(m) {
  if (m.input & INPUT_A_PRESSED) return set_mario_action(m, ACT_HOLD_JUMP, 0);
  if (m.input & INPUT_OFF_FLOOR) return set_mario_action(m, ACT_HOLD_FREEFALL, 0);
  if (m.input & INPUT_NONZERO_ANALOG) return set_mario_action(m, ACT_HOLD_WALKING, 0);
  if (m.input & INPUT_ABOVE_SLIDE) return set_mario_action(m, ACT_HOLD_BEGIN_SLIDING, 0);
  return false;
}
const SQUISH = [0x46, 0x32, 0x32, 0x3C, 0x46, 0x50, 0x50, 0x3C, 0x28, 0x14, 0x14, 0x1E, 0x32, 0x3C, 0x3C, 0x28];
function squish_mario_model(m) {
  const sc = m.marioObj.gfx.scale;
  if (m.squishTimer !== 0xFF) {
    if (m.squishTimer === 0) { sc[0] = sc[1] = sc[2] = 1; }
    else if (m.squishTimer <= 16) {
      m.squishTimer--;
      sc[1] = 1 - (SQUISH[15 - m.squishTimer] * 0.6) / 100;
      sc[0] = (SQUISH[15 - m.squishTimer] * 0.4) / 100 + 1;
      sc[2] = sc[0];
    } else { m.squishTimer--; sc[0] = 1.4; sc[1] = 0.4; sc[2] = 1.4; }
  }
}

/* ══ INPUTS (mario.c) ═════════════════════════════════════════ */
function update_mario_button_inputs(m) {
  const c = m.controller;
  if (c.buttonPressed & A_BUTTON) m.input |= INPUT_A_PRESSED;
  if (c.buttonDown & A_BUTTON) m.input |= INPUT_A_DOWN;
  if (m.squishTimer === 0) {
    if (c.buttonPressed & B_BUTTON) m.input |= INPUT_B_PRESSED;
    if (c.buttonDown & Z_TRIG) m.input |= INPUT_Z_DOWN;
    if (c.buttonPressed & Z_TRIG) m.input |= INPUT_Z_PRESSED;
  }
  if (m.input & INPUT_A_PRESSED) m.framesSinceA = 0; else if (m.framesSinceA < 0xFF) m.framesSinceA++;
  if (m.input & INPUT_B_PRESSED) m.framesSinceB = 0; else if (m.framesSinceB < 0xFF) m.framesSinceB++;
}
function update_mario_joystick_inputs(m) {
  const c = m.controller;
  const mag = ((c.stickMag / 64) * (c.stickMag / 64)) * 64;
  m.intendedMag = m.squishTimer === 0 ? mag / 2 : mag / 8;
  if (m.intendedMag > 0) {
    m.intendedYaw = s16(atan2s(-c.stickY, c.stickX) + m.area.camera.yaw);
    m.input |= INPUT_NONZERO_ANALOG;
  } else m.intendedYaw = m.faceAngle[1];
}
function update_mario_geometry_inputs(m) {
  const p = { x: m.pos[0], y: m.pos[1], z: m.pos[2] };
  W.col.wallPush(p, 60, 50);
  W.col.wallPush(p, 30, 24);
  m.pos[0] = p.x; m.pos[2] = p.z;
  let f = W.col.floor(m.pos[0], m.pos[1], m.pos[2]);
  m.floorHeight = f.h; m.floor = f.s;
  if (!m.floor) {
    m.pos[0] = m.marioObj.gfx.pos[0]; m.pos[1] = m.marioObj.gfx.pos[1]; m.pos[2] = m.marioObj.gfx.pos[2];
    f = W.col.floor(m.pos[0], m.pos[1], m.pos[2]);
    m.floorHeight = f.h; m.floor = f.s;
  }
  const ceil = {};
  m.ceilHeight = vec3f_find_ceil(m.pos, m.floorHeight, ceil);
  m.ceil = ceil.s;
  m.waterLevel = F.find_water_level(m.pos[0], m.pos[2]);
  if (m.floor) {
    m.floorAngle = atan2s(m.floor.nz, m.floor.nx);
    m.terrainSoundAddend = mario_get_terrain_sound_addend(m);
    if (m.pos[1] > m.waterLevel - 40 && mario_floor_is_slippery(m)) m.input |= INPUT_ABOVE_SLIDE;
    if ((m.floor.flags & SM64.SURF.DYNAMIC) || (m.ceil && (m.ceil.flags & SM64.SURF.DYNAMIC))) {
      const d = m.ceilHeight - m.floorHeight;
      if (0 <= d && d <= 150) m.input |= INPUT_SQUISHED;
    }
    if (m.pos[1] > m.floorHeight + 100) m.input |= INPUT_OFF_FLOOR;
    if (m.pos[1] < m.waterLevel - 10) m.input |= INPUT_IN_WATER;
  } else F.level_trigger_warp(m, WARP_OP_DEATH);
}
function update_mario_inputs(m) {
  m.particleFlags = 0;
  m.input = 0;
  m.collidedObjInteractTypes = m.marioObj.collidedObjInteractTypes;
  m.flags &= 0xFFFFFF;
  update_mario_button_inputs(m);
  update_mario_joystick_inputs(m);
  update_mario_geometry_inputs(m);
  if (W.gCameraMovementFlags & CAM_MOVE_C_UP_MODE) {
    if (m.action & ACT_FLAG_ALLOW_FIRST_PERSON) m.input |= INPUT_FIRST_PERSON;
    else W.gCameraMovementFlags &= ~CAM_MOVE_C_UP_MODE;
  }
  if (!(m.input & (INPUT_NONZERO_ANALOG | INPUT_A_PRESSED))) m.input |= INPUT_UNKNOWN_5;
  if (m.marioObj.oInteractStatus & (INT_STATUS_MARIO_STUNNED | INT_STATUS_MARIO_KNOCKBACK_DMG | INT_STATUS_MARIO_SHOCKWAVE)) m.input |= INPUT_STOMPED;
  if (m.wallKickTimer > 0) m.wallKickTimer--;
  if (m.doubleJumpTimer > 0) m.doubleJumpTimer--;
}
function update_mario_health(m) {
  if (m.health >= 0x100) {
    if (m.healCounter > 0) { m.health += 0x40; m.healCounter--; }
    if (m.hurtCounter > 0) { m.health -= 0x40; m.hurtCounter--; }
    if (m.health > 0x880) m.health = 0x880;
    if (m.health < 0x100) m.health = 0xFF;
  }
}
function update_mario_info_for_cam(m) {
  m.marioBodyState.action = m.action;
  const s = m.statusForCamera;
  s.action = m.action;
  s.faceAngle[0] = m.faceAngle[0]; s.faceAngle[1] = m.faceAngle[1]; s.faceAngle[2] = m.faceAngle[2];
  if (!(m.flags & MARIO_UNKNOWN_25)) { s.pos[0] = m.pos[0]; s.pos[1] = m.pos[1]; s.pos[2] = m.pos[2]; }
}
function mario_reset_bodystate(m) {
  const b = m.marioBodyState;
  b.capState = MARIO_HAS_DEFAULT_CAP_OFF;
  b.eyeState = MARIO_EYES_BLINK;
  b.handState = MARIO_HAND_FISTS;
  b.modelState = 0;
  b.wingFlutter = false;
  m.flags &= ~MARIO_METAL_SHOCK;
}
function update_and_return_cap_flags(m) {
  let flags = m.flags;
  if (m.capTimer > 0) {
    const a = m.action;
    if (m.capTimer <= 60 || (a !== ACT_READING_AUTOMATIC_DIALOG && a !== ACT_READING_NPC_DIALOG && a !== ACT_READING_SIGN && a !== ACT_IN_CANNON)) m.capTimer--;
    if (m.capTimer === 0) { m.flags &= ~MARIO_SPECIAL_CAPS; if (!(m.flags & MARIO_CAPS)) m.flags &= ~MARIO_CAP_ON_HEAD; }
    /* the cap flickering off in its last two seconds (0x4444449249255555 read a bit a frame) */
    if (m.capTimer < 64) {
      const bits = 0x4444449249255555n;
      if ((bits >> BigInt(m.capTimer)) & 1n) { flags &= ~MARIO_SPECIAL_CAPS; if (!(flags & MARIO_CAPS)) flags &= ~MARIO_CAP_ON_HEAD; }
    }
  }
  return flags;
}
function mario_update_hitbox_and_cap_model(m) {
  const b = m.marioBodyState, flags = update_and_return_cap_flags(m);
  if (flags & MARIO_VANISH_CAP) b.modelState = MODEL_STATE_NOISE_ALPHA;
  if (flags & MARIO_METAL_CAP) b.modelState |= MODEL_STATE_METAL;
  if (flags & MARIO_METAL_SHOCK) b.modelState |= MODEL_STATE_METAL;
  if (m.invincTimer >= 3 && (W.gGlobalTimer & 1)) m.marioObj.gfx.flags |= GRAPH_RENDER_INVISIBLE;
  if (flags & MARIO_CAP_IN_HAND) b.handState = flags & MARIO_WING_CAP ? MARIO_HAND_HOLDING_WING_CAP : MARIO_HAND_HOLDING_CAP;
  if (flags & MARIO_CAP_ON_HEAD) b.capState = flags & MARIO_WING_CAP ? MARIO_HAS_WING_CAP_ON : MARIO_HAS_DEFAULT_CAP_ON;
  m.marioObj.hitboxHeight = m.action & ACT_FLAG_SHORT_HITBOX ? 100 : 160;
  if ((m.flags & MARIO_TELEPORTING) && m.fadeWarpOpacity !== 0xFF) { b.modelState &= ~0xFF; b.modelState |= 0x100 | m.fadeWarpOpacity; }
}

/* ══ THE FRAME (mario.c execute_mario_action) ═════════════════ */
function execute_mario_action(m) {
  if (!m.action) return 0;
  m.marioObj.gfx.flags &= ~GRAPH_RENDER_INVISIBLE;
  mario_reset_bodystate(m);
  update_mario_inputs(m);
  F.mario_handle_special_floors(m);
  F.mario_process_interactions(m);
  if (!m.floor) return 0;
  let inLoop = true, guard = 0;
  while (inLoop && guard++ < 16) {
    switch (m.action & ACT_GROUP_MASK) {
      case ACT_GROUP_STATIONARY: inLoop = F.mario_execute_stationary_action(m); break;
      case ACT_GROUP_MOVING: inLoop = F.mario_execute_moving_action(m); break;
      case ACT_GROUP_AIRBORNE: inLoop = F.mario_execute_airborne_action(m); break;
      case ACT_GROUP_SUBMERGED: set_mario_action(m, ACT_IDLE, 0); inLoop = true; break;
      case ACT_GROUP_CUTSCENE: inLoop = F.mario_execute_cutscene_action(m); break;
      case ACT_GROUP_AUTOMATIC: inLoop = F.mario_execute_automatic_action(m); break;
      case ACT_GROUP_OBJECT: inLoop = F.mario_execute_object_action(m); break;
      default: inLoop = false;
    }
  }
  squish_mario_model(m);
  update_mario_health(m);
  update_mario_info_for_cam(m);
  mario_update_hitbox_and_cap_model(m);
  m.marioObj.oInteractStatus = 0;
  return m.particleFlags;
}

/* a new Mario where the level puts him (init_mario, init_mario_from_save_file) */
function create(obj, area, spawn) {
  const m = {
    unk00: 0, input: 0, flags: MARIO_NORMAL_CAP | MARIO_CAP_ON_HEAD, particleFlags: 0, action: 0, prevAction: 0,
    terrainSoundAddend: 0, actionState: 0, actionTimer: 0, actionArg: 0, intendedMag: 0, intendedYaw: 0,
    invincTimer: 0, framesSinceA: 0xFF, framesSinceB: 0xFF, wallKickTimer: 0, doubleJumpTimer: 0,
    faceAngle: [0, spawn.yaw, 0], angleVel: [0, 0, 0], slideYaw: 0, twirlYaw: 0,
    pos: spawn.pos.slice(), vel: [0, 0, 0], forwardVel: 0, slideVelX: 0, slideVelZ: 0,
    wall: null, ceil: null, floor: null, ceilHeight: 0, floorHeight: 0, floorAngle: 0, waterLevel: -11000,
    interactObj: null, heldObj: null, usedObj: null, riddenObj: null, marioObj: obj, area,
    statusForCamera: { action: 0, pos: [0, 0, 0], faceAngle: [0, 0, 0], headRotation: [0, 0, 0], usedObj: null, cameraEvent: 0 },
    marioBodyState: { action: 0, capState: 0, eyeState: 0, handState: 0, wingFlutter: false, modelState: 0, grabPos: 0,
                      punchState: 0, torsoAngle: [0, 0, 0], headAngle: [0, 0, 0], heldObjLastPosition: [0, 0, 0] },
    controller: { stickX: 0, stickY: 0, stickMag: 0, buttonDown: 0, buttonPressed: 0 },
    collidedObjInteractTypes: 0, numCoins: 0, numStars: 0, numKeys: 0, numLives: 4, health: 0x880, unkB0: 0xBD,
    hurtCounter: 0, healCounter: 0, squishTimer: 0, fadeWarpOpacity: 0, capTimer: 0, prevNumStarsForDialog: 0,
    peakHeight: 0, quicksandDepth: 0, gettingBlownGravity: 0,
  };
  obj.gfx.anim.id = -1;
  const f = W.col.floor(m.pos[0], m.pos[1], m.pos[2]);
  m.floorHeight = f.h; m.floor = f.s;
  if (m.pos[1] < m.floorHeight) m.pos[1] = m.floorHeight;
  obj.gfx.pos[1] = m.pos[1];
  m.action = ACT_IDLE;
  mario_reset_bodystate(m);
  update_mario_info_for_cam(m);
  obj.oPosX = m.pos[0]; obj.oPosY = m.pos[1]; obj.oPosZ = m.pos[2];
  obj.oMoveAnglePitch = m.faceAngle[0]; obj.oMoveAngleYaw = m.faceAngle[1]; obj.oMoveAngleRoll = m.faceAngle[2];
  obj.gfx.pos = m.pos.slice();
  obj.gfx.angle = [0, m.faceAngle[1], 0];
  return m;
}

/* ══ STEPS (mario_step.c) ═════════════════════════════════════ */
function mario_bonk_reflection(m, negateSpeed) {
  if (m.wall) {
    const wa = atan2s(m.wall.nz, m.wall.nx);
    m.faceAngle[1] = s16(wa - s16(m.faceAngle[1] - wa));
  }
  if (negateSpeed) mario_set_forward_vel(m, -m.forwardVel);
  else m.faceAngle[1] = s16(m.faceAngle[1] + 0x8000);
}
function mario_update_quicksand(m) { m.quicksandDepth = 0; return false; }   /* no quicksand in Bob-omb Battlefield */
function mario_push_off_steep_floor(m, action, arg) {
  const d = s16(m.floorAngle - m.faceAngle[1]);
  if (d > -0x4000 && d < 0x4000) { m.forwardVel = 16; m.faceAngle[1] = m.floorAngle; }
  else { m.forwardVel = -16; m.faceAngle[1] = s16(m.floorAngle + 0x8000); }
  return set_mario_action(m, action, arg);
}
function mario_update_moving_sand() { return false; }
function mario_update_windy_ground() { return false; }
function stop_and_set_height_to_floor(m) {
  mario_set_forward_vel(m, 0);
  m.vel[1] = 0;
  m.pos[1] = m.floorHeight;
  const g = m.marioObj.gfx;
  g.pos[0] = m.pos[0]; g.pos[1] = m.pos[1]; g.pos[2] = m.pos[2];
  g.angle[0] = 0; g.angle[1] = m.faceAngle[1]; g.angle[2] = 0;
}
function stationary_ground_step(m) {
  mario_set_forward_vel(m, 0);
  let take = mario_update_moving_sand(m);
  take |= mario_update_windy_ground(m);
  if (take) return perform_ground_step(m);
  m.pos[1] = m.floorHeight;
  const g = m.marioObj.gfx;
  g.pos[0] = m.pos[0]; g.pos[1] = m.pos[1]; g.pos[2] = m.pos[2];
  g.angle[0] = 0; g.angle[1] = m.faceAngle[1]; g.angle[2] = 0;
  return GROUND_STEP_NONE;
}
function perform_ground_quarter_step(m, next) {
  resolve_and_return_wall_collisions(next, 30, 24);
  const upperWall = resolve_and_return_wall_collisions(next, 60, 50);
  const f = W.col.floor(next[0], next[1], next[2]);
  const floorHeight = f.h, floor = f.s;
  const ceilHeight = vec3f_find_ceil(next, floorHeight, null);
  m.wall = upperWall;
  if (!floor) return GROUND_STEP_HIT_WALL_STOP_QSTEPS;
  if (next[1] > floorHeight + 100) {
    if (next[1] + 160 >= ceilHeight) return GROUND_STEP_HIT_WALL_STOP_QSTEPS;
    m.pos[0] = next[0]; m.pos[1] = next[1]; m.pos[2] = next[2];
    m.floor = floor; m.floorHeight = floorHeight;
    return GROUND_STEP_LEFT_GROUND;
  }
  if (floorHeight + 160 >= ceilHeight) return GROUND_STEP_HIT_WALL_STOP_QSTEPS;
  m.pos[0] = next[0]; m.pos[1] = floorHeight; m.pos[2] = next[2];
  m.floor = floor; m.floorHeight = floorHeight;
  if (upperWall) {
    const d = s16(atan2s(upperWall.nz, upperWall.nx) - m.faceAngle[1]);
    if (d >= 0x2AAA && d <= 0x5555) return GROUND_STEP_NONE;
    if (d <= -0x2AAA && d >= -0x5555) return GROUND_STEP_NONE;
    return GROUND_STEP_HIT_WALL_CONTINUE_QSTEPS;
  }
  return GROUND_STEP_NONE;
}
function perform_ground_step(m) {
  let r = GROUND_STEP_NONE;
  for (let i = 0; i < 4; i++) {
    const next = [m.pos[0] + m.floor.ny * (m.vel[0] / 4), m.pos[1], m.pos[2] + m.floor.ny * (m.vel[2] / 4)];
    r = perform_ground_quarter_step(m, next);
    if (r === GROUND_STEP_LEFT_GROUND || r === GROUND_STEP_HIT_WALL_STOP_QSTEPS) break;
  }
  m.terrainSoundAddend = mario_get_terrain_sound_addend(m);
  const g = m.marioObj.gfx;
  g.pos[0] = m.pos[0]; g.pos[1] = m.pos[1]; g.pos[2] = m.pos[2];
  g.angle[0] = 0; g.angle[1] = m.faceAngle[1]; g.angle[2] = 0;
  if (r === GROUND_STEP_HIT_WALL_CONTINUE_QSTEPS) r = GROUND_STEP_HIT_WALL;
  return r;
}
function check_ledge_grab(m, wall, intended, next) {
  if (m.vel[1] > 0) return false;
  const dx = next[0] - intended[0], dz = next[2] - intended[2];
  if (dx * m.vel[0] + dz * m.vel[2] > 0) return false;
  const lx = next[0] - wall.nx * 60, lz = next[2] - wall.nz * 60;
  const lf = W.col.floor(lx, next[1] + 160, lz);
  if (lf.h - next[1] <= 100) return false;
  m.pos[0] = lx; m.pos[1] = lf.h; m.pos[2] = lz;
  m.floor = lf.s; m.floorHeight = lf.h;
  m.floorAngle = atan2s(lf.s.nz, lf.s.nx);
  m.faceAngle[0] = 0;
  m.faceAngle[1] = s16(atan2s(wall.nz, wall.nx) + 0x8000);
  return true;
}
function perform_air_quarter_step(m, intended, stepArg) {
  const next = intended.slice();
  const upperWall = resolve_and_return_wall_collisions(next, 150, 50);
  const lowerWall = resolve_and_return_wall_collisions(next, 30, 50);
  const f = W.col.floor(next[0], next[1], next[2]);
  const floorHeight = f.h, floor = f.s;
  const ceilHeight = vec3f_find_ceil(next, floorHeight, null);
  m.wall = null;
  if (!floor) {
    if (next[1] <= m.floorHeight) { m.pos[1] = m.floorHeight; return AIR_STEP_LANDED; }
    m.pos[1] = next[1];
    return AIR_STEP_HIT_WALL;
  }
  if (next[1] <= floorHeight) {
    if (ceilHeight - floorHeight > 160) { m.pos[0] = next[0]; m.pos[2] = next[2]; m.floor = floor; m.floorHeight = floorHeight; }
    m.pos[1] = floorHeight;
    return AIR_STEP_LANDED;
  }
  if (next[1] + 160 > ceilHeight) {
    if (m.vel[1] >= 0) {
      m.vel[1] = 0;
      if ((stepArg & AIR_STEP_CHECK_HANG) && m.ceil && m.ceil.type === SURFACE_HANGABLE) return AIR_STEP_GRABBED_CEILING;
      return AIR_STEP_NONE;
    }
    if (next[1] <= m.floorHeight) { m.pos[1] = m.floorHeight; return AIR_STEP_LANDED; }
    m.pos[1] = next[1];
    return AIR_STEP_HIT_WALL;
  }
  if ((stepArg & AIR_STEP_CHECK_LEDGE_GRAB) && !upperWall && lowerWall) {
    if (check_ledge_grab(m, lowerWall, intended, next)) return AIR_STEP_GRABBED_LEDGE;
    m.pos[0] = next[0]; m.pos[1] = next[1]; m.pos[2] = next[2];
    m.floor = floor; m.floorHeight = floorHeight;
    return AIR_STEP_NONE;
  }
  m.pos[0] = next[0]; m.pos[1] = next[1]; m.pos[2] = next[2];
  m.floor = floor; m.floorHeight = floorHeight;
  if (upperWall || lowerWall) {
    m.wall = upperWall || lowerWall;
    const d = s16(atan2s(m.wall.nz, m.wall.nx) - m.faceAngle[1]);
    if (m.wall.type === SURFACE_BURNING) return AIR_STEP_HIT_LAVA_WALL;
    if (d < -0x6000 || d > 0x6000) { m.flags |= MARIO_UNKNOWN_30; return AIR_STEP_HIT_WALL; }
  }
  return AIR_STEP_NONE;
}
function apply_twirl_gravity(m) {
  let heavy = 1;
  if (m.angleVel[1] > 1024) heavy = 1024 / m.angleVel[1];
  const term = -75 * heavy;
  m.vel[1] -= 4 * heavy;
  if (m.vel[1] < term) m.vel[1] = term;
}
function should_strengthen_gravity_for_jump_ascent(m) {
  if (!(m.flags & MARIO_UNKNOWN_08)) return false;
  if (m.action & (ACT_FLAG_INTANGIBLE | ACT_FLAG_INVULNERABLE)) return false;
  if (!(m.input & INPUT_A_DOWN) && m.vel[1] > 20) return (m.action & ACT_FLAG_CONTROL_JUMP_HEIGHT) !== 0;
  return false;
}
function apply_gravity(m) {
  if (m.action === ACT_TWIRLING && m.vel[1] < 0) apply_twirl_gravity(m);
  else if (m.action === ACT_SHOT_FROM_CANNON) { m.vel[1] -= 1; if (m.vel[1] < -75) m.vel[1] = -75; }
  else if (m.action === ACT_LONG_JUMP || m.action === ACT_SLIDE_KICK || m.action === ACT_BBH_ENTER_SPIN) { m.vel[1] -= 2; if (m.vel[1] < -75) m.vel[1] = -75; }
  else if (m.action === ACT_LAVA_BOOST || m.action === ACT_FALL_AFTER_STAR_GRAB) { m.vel[1] -= 3.2; if (m.vel[1] < -65) m.vel[1] = -65; }
  else if (m.action === ACT_GETTING_BLOWN) { m.vel[1] -= m.gettingBlownGravity; if (m.vel[1] < -75) m.vel[1] = -75; }
  else if (should_strengthen_gravity_for_jump_ascent(m)) m.vel[1] /= 4;
  else if (m.action & ACT_FLAG_METAL_WATER) { m.vel[1] -= 1.6; if (m.vel[1] < -16) m.vel[1] = -16; }
  else if ((m.flags & MARIO_WING_CAP) && m.vel[1] < 0 && (m.input & INPUT_A_DOWN)) {
    m.marioBodyState.wingFlutter = true;
    m.vel[1] -= 2;
    if (m.vel[1] < -37.5) { if ((m.vel[1] += 4) > -37.5) m.vel[1] = -37.5; }
  } else { m.vel[1] -= 4; if (m.vel[1] < -75) m.vel[1] = -75; }
}
function perform_air_step(m, stepArg) {
  let r = AIR_STEP_NONE;
  m.wall = null;
  for (let i = 0; i < 4; i++) {
    const intended = [m.pos[0] + m.vel[0] / 4, m.pos[1] + m.vel[1] / 4, m.pos[2] + m.vel[2] / 4];
    const q = perform_air_quarter_step(m, intended, stepArg || 0);
    if (q !== AIR_STEP_NONE) r = q;
    if (q === AIR_STEP_LANDED || q === AIR_STEP_GRABBED_LEDGE || q === AIR_STEP_GRABBED_CEILING || q === AIR_STEP_HIT_LAVA_WALL) break;
  }
  if (m.vel[1] >= 0) m.peakHeight = m.pos[1];
  m.terrainSoundAddend = mario_get_terrain_sound_addend(m);
  if (m.action !== ACT_FLYING) apply_gravity(m);
  const g = m.marioObj.gfx;
  g.pos[0] = m.pos[0]; g.pos[1] = m.pos[1]; g.pos[2] = m.pos[2];
  g.angle[0] = 0; g.angle[1] = m.faceAngle[1]; g.angle[2] = 0;
  return r;
}
function set_vel_from_pitch_and_yaw(m) {
  m.vel[0] = m.forwardVel * coss(m.faceAngle[0]) * sins(m.faceAngle[1]);
  m.vel[1] = m.forwardVel * sins(m.faceAngle[0]);
  m.vel[2] = m.forwardVel * coss(m.faceAngle[0]) * coss(m.faceAngle[1]);
}
function set_vel_from_yaw(m) {
  m.vel[0] = m.slideVelX = m.forwardVel * sins(m.faceAngle[1]);
  m.vel[1] = 0;
  m.vel[2] = m.slideVelZ = m.forwardVel * coss(m.faceAngle[1]);
}

Object.assign(Mario, {
  is_anim_at_end, is_anim_past_end, set_mario_animation, set_mario_anim_with_accel, set_anim_to_frame,
  is_anim_past_frame, update_mario_pos_for_anim, return_mario_anim_y_translation, play_sound_if_no_flag,
  play_mario_jump_sound, adjust_sound_for_speed, play_sound_and_spawn_particles, play_mario_action_sound,
  play_mario_landing_sound, play_mario_landing_sound_once, play_mario_heavy_landing_sound,
  play_mario_heavy_landing_sound_once, play_mario_sound, play_sound, mario_set_forward_vel, mario_get_floor_class,
  resolve_and_return_wall_collisions, vec3f_find_ceil, mario_facing_downhill, mario_floor_is_slippery,
  mario_floor_is_slope, mario_floor_is_steep, find_floor_height_relative_polar, find_floor_slope,
  update_mario_sound_and_camera, set_steep_jump_action, set_mario_action, set_jump_from_landing, set_jumping_action,
  drop_and_set_mario_action, hurt_and_set_mario_action, check_common_action_exits, check_common_hold_action_exits,
  execute_mario_action, create, mario_bonk_reflection, mario_update_quicksand, mario_push_off_steep_floor,
  stop_and_set_height_to_floor, stationary_ground_step, perform_ground_step, perform_air_step, apply_gravity,
  set_vel_from_pitch_and_yaw, set_vel_from_yaw, mario_update_moving_sand, mario_update_windy_ground,
  find_mario_anim_flags_and_translation, squish_mario_model, update_mario_inputs, update_mario_health,
});
for (const k in Mario) if (k !== 'create') F[k] = Mario[k];

})(window);
