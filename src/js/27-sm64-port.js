/* ══════════════════════════════════════════════════════════════
   27-sm64-port.js — Super Mario 64's own code for Mario, the things he
   touches and the objects in his course, carried over from the C of its
   decompilation (github.com/n64decomp/sm64) by tools/port_sm64.py; the
   few functions that do not carry over word for word are in
   27-sm64-hand.js. Generated: change the tools, not this file.
══════════════════════════════════════════════════════════════ */
/* the arithmetic: ported from the Super Mario 64 decompilation (github.com/n64decomp/sm64): src/engine/math_util.c */
(function (root) {
'use strict';
const SM64 = root.SM64, F = SM64.F = SM64.F || {}, W = SM64.W = SM64.W || {}, B = SM64.B = SM64.B || {};
const { s16, s8, sins, coss, atan2s, sqr, approach_f32, approach_s32, max, min, abs, REF, REFA, REFV } = SM64.m;
/*CONSTS*/
/*END CONSTS*/

W.gSplineKeyframe = null;
W.gSplineKeyframeFraction = 0;
W.gSplineState = 0;
function vec3f_copy(dest, src) {
    dest[0] = src[0];
    dest[1] = src[1];
    dest[2] = src[2];
    return REFV(() => dest, $ => dest = $); 
}
function vec3f_set(dest, x, y, z) {
    dest[0] = x;
    dest[1] = y;
    dest[2] = z;
    return REFV(() => dest, $ => dest = $); 
}
function vec3f_add(dest, a) {
    dest[0] += a[0];
    dest[1] += a[1];
    dest[2] += a[2];
    return REFV(() => dest, $ => dest = $); 
}
function vec3f_sum(dest, a, b) {
    dest[0] = a[0] + b[0];
    dest[1] = a[1] + b[1];
    dest[2] = a[2] + b[2];
    return REFV(() => dest, $ => dest = $); 
}
function vec3s_copy(dest, src) {
    dest[0] = src[0];
    dest[1] = src[1];
    dest[2] = src[2];
    return REFV(() => dest, $ => dest = $); 
}
function vec3s_set(dest, x, y, z) {
    dest[0] = x;
    dest[1] = y;
    dest[2] = z;
    return REFV(() => dest, $ => dest = $); 
}
function vec3s_add(dest, a) {
    dest[0] += a[0];
    dest[1] += a[1];
    dest[2] += a[2];
    return REFV(() => dest, $ => dest = $); 
}
function vec3s_sum(dest, a, b) {
    dest[0] = a[0] + b[0];
    dest[1] = a[1] + b[1];
    dest[2] = a[2] + b[2];
    return REFV(() => dest, $ => dest = $); 
}
function vec3s_sub(dest, a) {
    dest[0] -= a[0];
    dest[1] -= a[1];
    dest[2] -= a[2];
    return REFV(() => dest, $ => dest = $); 
}
function vec3s_to_vec3f(dest, a) {
    dest[0] = a[0];
    dest[1] = a[1];
    dest[2] = a[2];
    return REFV(() => dest, $ => dest = $); 
}
function vec3f_to_vec3s(dest, a) {
    dest[0] = a[0] + ((a[0] > 0) ? 0.5 : -0.5);
    dest[1] = a[1] + ((a[1] > 0) ? 0.5 : -0.5);
    dest[2] = a[2] + ((a[2] > 0) ? 0.5 : -0.5);
    return REFV(() => dest, $ => dest = $); 
}
function find_vector_perpendicular_to_plane(dest, a, b, c) {
    dest[0] = (b[1] - a[1]) * (c[2] - b[2]) - (c[1] - b[1]) * (b[2] - a[2]);
    dest[1] = (b[2] - a[2]) * (c[0] - b[0]) - (c[2] - b[2]) * (b[0] - a[0]);
    dest[2] = (b[0] - a[0]) * (c[1] - b[1]) - (c[0] - b[0]) * (b[1] - a[1]);
    return REFV(() => dest, $ => dest = $); 
}
function vec3f_cross(dest, a, b) {
    dest[0] = a[1] * b[2] - b[1] * a[2];
    dest[1] = a[2] * b[0] - b[2] * a[0];
    dest[2] = a[0] * b[1] - b[0] * a[1];
    return REFV(() => dest, $ => dest = $); 
}
function vec3f_normalize(dest) {
    let invsqrt = 1.0 / Math.sqrt(dest[0] * dest[0] + dest[1] * dest[1] + dest[2] * dest[2]);
    dest[0] *= invsqrt;
    dest[1] *= invsqrt;
    dest[2] *= invsqrt;
    return REFV(() => dest, $ => dest = $); 
}
function mtxf_translate(dest, b) {
    F.mtxf_identity(dest);
    dest[3][0] = b[0];
    dest[3][1] = b[1];
    dest[3][2] = b[2];
}
function mtxf_lookat(mtx, from, to, roll) {
    let invLength = 0;
    let dx = 0;
    let dz = 0;
    let xColY = 0;
    let yColY = 0;
    let zColY = 0;
    let xColZ = 0;
    let yColZ = 0;
    let zColZ = 0;
    let xColX = 0;
    let yColX = 0;
    let zColX = 0;
    dx = to[0] - from[0];
    dz = to[2] - from[2];
    invLength = -1.0 / Math.sqrt(dx * dx + dz * dz);
    dx *= invLength;
    dz *= invLength;
    yColY = coss(roll);
    xColY = sins(roll) * dz;
    zColY = -sins(roll) * dx;
    xColZ = to[0] - from[0];
    yColZ = to[1] - from[1];
    zColZ = to[2] - from[2];
    invLength = -1.0 / Math.sqrt(xColZ * xColZ + yColZ * yColZ + zColZ * zColZ);
    xColZ *= invLength;
    yColZ *= invLength;
    zColZ *= invLength;
    xColX = yColY * zColZ - zColY * yColZ;
    yColX = zColY * xColZ - xColY * zColZ;
    zColX = xColY * yColZ - yColY * xColZ;
    invLength = 1.0 / Math.sqrt(xColX * xColX + yColX * yColX + zColX * zColX);
    xColX *= invLength;
    yColX *= invLength;
    zColX *= invLength;
    xColY = yColZ * zColX - zColZ * yColX;
    yColY = zColZ * xColX - xColZ * zColX;
    zColY = xColZ * yColX - yColZ * xColX;
    invLength = 1.0 / Math.sqrt(xColY * xColY + yColY * yColY + zColY * zColY);
    xColY *= invLength;
    yColY *= invLength;
    zColY *= invLength;
    mtx[0][0] = xColX;
    mtx[1][0] = yColX;
    mtx[2][0] = zColX;
    mtx[3][0] = -(from[0] * xColX + from[1] * yColX + from[2] * zColX);
    mtx[0][1] = xColY;
    mtx[1][1] = yColY;
    mtx[2][1] = zColY;
    mtx[3][1] = -(from[0] * xColY + from[1] * yColY + from[2] * zColY);
    mtx[0][2] = xColZ;
    mtx[1][2] = yColZ;
    mtx[2][2] = zColZ;
    mtx[3][2] = -(from[0] * xColZ + from[1] * yColZ + from[2] * zColZ);
    mtx[0][3] = 0;
    mtx[1][3] = 0;
    mtx[2][3] = 0;
    mtx[3][3] = 1;
}
function mtxf_rotate_zxy_and_translate(dest, translate, rotate) {
    let sx = sins(rotate[0]);
    let cx = coss(rotate[0]);
    let sy = sins(rotate[1]);
    let cy = coss(rotate[1]);
    let sz = sins(rotate[2]);
    let cz = coss(rotate[2]);
    dest[0][0] = cy * cz + sx * sy * sz;
    dest[1][0] = -cy * sz + sx * sy * cz;
    dest[2][0] = cx * sy;
    dest[3][0] = translate[0];
    dest[0][1] = cx * sz;
    dest[1][1] = cx * cz;
    dest[2][1] = -sx;
    dest[3][1] = translate[1];
    dest[0][2] = -sy * cz + sx * cy * sz;
    dest[1][2] = sy * sz + sx * cy * cz;
    dest[2][2] = cx * cy;
    dest[3][2] = translate[2];
    dest[0][3] = dest[1][3] = dest[2][3] = 0.0;
    dest[3][3] = 1.0;
}
function mtxf_rotate_xyz_and_translate(dest, b, c) {
    let sx = sins(c[0]);
    let cx = coss(c[0]);
    let sy = sins(c[1]);
    let cy = coss(c[1]);
    let sz = sins(c[2]);
    let cz = coss(c[2]);
    dest[0][0] = cy * cz;
    dest[0][1] = cy * sz;
    dest[0][2] = -sy;
    dest[0][3] = 0;
    dest[1][0] = sx * sy * cz - cx * sz;
    dest[1][1] = sx * sy * sz + cx * cz;
    dest[1][2] = sx * cy;
    dest[1][3] = 0;
    dest[2][0] = cx * sy * cz + sx * sz;
    dest[2][1] = cx * sy * sz - sx * cz;
    dest[2][2] = cx * cy;
    dest[2][3] = 0;
    dest[3][0] = b[0];
    dest[3][1] = b[1];
    dest[3][2] = b[2];
    dest[3][3] = 1;
}
function mtxf_billboard(dest, mtx, position, angle) {
    dest[0][0] = coss(angle);
    dest[0][1] = sins(angle);
    dest[0][2] = 0;
    dest[0][3] = 0;
    dest[1][0] = -dest[0][1];
    dest[1][1] = dest[0][0];
    dest[1][2] = 0;
    dest[1][3] = 0;
    dest[2][0] = 0;
    dest[2][1] = 0;
    dest[2][2] = 1;
    dest[2][3] = 0;
    dest[3][0] =
        mtx[0][0] * position[0] + mtx[1][0] * position[1] + mtx[2][0] * position[2] + mtx[3][0];
    dest[3][1] =
        mtx[0][1] * position[0] + mtx[1][1] * position[1] + mtx[2][1] * position[2] + mtx[3][1];
    dest[3][2] =
        mtx[0][2] * position[0] + mtx[1][2] * position[1] + mtx[2][2] * position[2] + mtx[3][2];
    dest[3][3] = 1;
}
function mtxf_align_terrain_normal(dest, upDir, pos, yaw) {
    let lateralDir = [0, 0, 0];
    let leftDir = [0, 0, 0];
    let forwardDir = [0, 0, 0];
    vec3f_set(lateralDir, sins(yaw), 0, coss(yaw));
    vec3f_normalize(upDir);
    vec3f_cross(leftDir, upDir, lateralDir);
    vec3f_normalize(leftDir);
    vec3f_cross(forwardDir, leftDir, upDir);
    vec3f_normalize(forwardDir);
    dest[0][0] = leftDir[0];
    dest[0][1] = leftDir[1];
    dest[0][2] = leftDir[2];
    dest[3][0] = pos[0];
    dest[1][0] = upDir[0];
    dest[1][1] = upDir[1];
    dest[1][2] = upDir[2];
    dest[3][1] = pos[1];
    dest[2][0] = forwardDir[0];
    dest[2][1] = forwardDir[1];
    dest[2][2] = forwardDir[2];
    dest[3][2] = pos[2];
    dest[0][3] = 0.0;
    dest[1][3] = 0.0;
    dest[2][3] = 0.0;
    dest[3][3] = 1.0;
}
function mtxf_align_terrain_triangle(mtx, pos, yaw, radius) {
    let sp74 = null;
    let point0 = [0, 0, 0];
    let point1 = [0, 0, 0];
    let point2 = [0, 0, 0];
    let forward = [0, 0, 0];
    let xColumn = [0, 0, 0];
    let yColumn = [0, 0, 0];
    let zColumn = [0, 0, 0];
    let avgY = 0;
    let minY = -radius * 3;
    point0[0] = pos[0] + radius * sins(yaw + 0x2AAA);
    point0[2] = pos[2] + radius * coss(yaw + 0x2AAA);
    point1[0] = pos[0] + radius * sins(yaw + 0x8000);
    point1[2] = pos[2] + radius * coss(yaw + 0x8000);
    point2[0] = pos[0] + radius * sins(yaw + 0xD555);
    point2[2] = pos[2] + radius * coss(yaw + 0xD555);
    point0[1] = F.find_floor(point0[0], pos[1] + 150, point0[2], $ => sp74 = $);
    point1[1] = F.find_floor(point1[0], pos[1] + 150, point1[2], $ => sp74 = $);
    point2[1] = F.find_floor(point2[0], pos[1] + 150, point2[2], $ => sp74 = $);
    if (point0[1] - pos[1] < minY) {
        point0[1] = pos[1];
    }
    if (point1[1] - pos[1] < minY) {
        point1[1] = pos[1];
    }
    if (point2[1] - pos[1] < minY) {
        point2[1] = pos[1];
    }
    avgY = (point0[1] + point1[1] + point2[1]) / 3;
    vec3f_set(forward, sins(yaw), 0, coss(yaw));
    find_vector_perpendicular_to_plane(yColumn, point0, point1, point2);
    vec3f_normalize(yColumn);
    vec3f_cross(xColumn, yColumn, forward);
    vec3f_normalize(xColumn);
    vec3f_cross(zColumn, xColumn, yColumn);
    vec3f_normalize(zColumn);
    mtx[0][0] = xColumn[0];
    mtx[0][1] = xColumn[1];
    mtx[0][2] = xColumn[2];
    mtx[3][0] = pos[0];
    mtx[1][0] = yColumn[0];
    mtx[1][1] = yColumn[1];
    mtx[1][2] = yColumn[2];
    mtx[3][1] = (avgY < pos[1]) ? pos[1] : avgY;
    mtx[2][0] = zColumn[0];
    mtx[2][1] = zColumn[1];
    mtx[2][2] = zColumn[2];
    mtx[3][2] = pos[2];
    mtx[0][3] = 0;
    mtx[1][3] = 0;
    mtx[2][3] = 0;
    mtx[3][3] = 1;
}
function mtxf_mul(dest, a, b) {
    let temp = [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];
    let entry0 = 0;
    let entry1 = 0;
    let entry2 = 0;
    entry0 = a[0][0];
    entry1 = a[0][1];
    entry2 = a[0][2];
    temp[0][0] = entry0 * b[0][0] + entry1 * b[1][0] + entry2 * b[2][0];
    temp[0][1] = entry0 * b[0][1] + entry1 * b[1][1] + entry2 * b[2][1];
    temp[0][2] = entry0 * b[0][2] + entry1 * b[1][2] + entry2 * b[2][2];
    entry0 = a[1][0];
    entry1 = a[1][1];
    entry2 = a[1][2];
    temp[1][0] = entry0 * b[0][0] + entry1 * b[1][0] + entry2 * b[2][0];
    temp[1][1] = entry0 * b[0][1] + entry1 * b[1][1] + entry2 * b[2][1];
    temp[1][2] = entry0 * b[0][2] + entry1 * b[1][2] + entry2 * b[2][2];
    entry0 = a[2][0];
    entry1 = a[2][1];
    entry2 = a[2][2];
    temp[2][0] = entry0 * b[0][0] + entry1 * b[1][0] + entry2 * b[2][0];
    temp[2][1] = entry0 * b[0][1] + entry1 * b[1][1] + entry2 * b[2][1];
    temp[2][2] = entry0 * b[0][2] + entry1 * b[1][2] + entry2 * b[2][2];
    entry0 = a[3][0];
    entry1 = a[3][1];
    entry2 = a[3][2];
    temp[3][0] = entry0 * b[0][0] + entry1 * b[1][0] + entry2 * b[2][0] + b[3][0];
    temp[3][1] = entry0 * b[0][1] + entry1 * b[1][1] + entry2 * b[2][1] + b[3][1];
    temp[3][2] = entry0 * b[0][2] + entry1 * b[1][2] + entry2 * b[2][2] + b[3][2];
    temp[0][3] = temp[1][3] = temp[2][3] = 0;
    temp[3][3] = 1;
    F.mtxf_copy(dest, temp);
}
function mtxf_scale_vec3f(dest, mtx, s) {
    let i = 0;
    for (i = 0; i < 4; i++) {
        dest[0][i] = mtx[0][i] * s[0];
        dest[1][i] = mtx[1][i] * s[1];
        dest[2][i] = mtx[2][i] * s[2];
        dest[3][i] = mtx[3][i];
    }
}
function mtxf_mul_vec3s(mtx, b) {
    let x = b[0];
    let y = b[1];
    let z = b[2];
    b[0] = x * mtx[0][0] + y * mtx[1][0] + z * mtx[2][0] + mtx[3][0];
    b[1] = x * mtx[0][1] + y * mtx[1][1] + z * mtx[2][1] + mtx[3][1];
    b[2] = x * mtx[0][2] + y * mtx[1][2] + z * mtx[2][2] + mtx[3][2];
}
function mtxf_rotate_xy(mtx, angle) {
    let temp = [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];
    F.mtxf_identity(temp);
    temp[0][0] = coss(angle);
    temp[0][1] = sins(angle);
    temp[1][0] = -temp[0][1];
    temp[1][1] = temp[0][0];
    F.mtxf_to_mtx(mtx, temp);
}
function get_pos_from_transform_mtx(dest, objMtx, camMtx) {
    let camX = camMtx[3][0] * camMtx[0][0] + camMtx[3][1] * camMtx[0][1] + camMtx[3][2] * camMtx[0][2];
    let camY = camMtx[3][0] * camMtx[1][0] + camMtx[3][1] * camMtx[1][1] + camMtx[3][2] * camMtx[1][2];
    let camZ = camMtx[3][0] * camMtx[2][0] + camMtx[3][1] * camMtx[2][1] + camMtx[3][2] * camMtx[2][2];
    dest[0] =
        objMtx[3][0] * camMtx[0][0] + objMtx[3][1] * camMtx[0][1] + objMtx[3][2] * camMtx[0][2] - camX;
    dest[1] =
        objMtx[3][0] * camMtx[1][0] + objMtx[3][1] * camMtx[1][1] + objMtx[3][2] * camMtx[1][2] - camY;
    dest[2] =
        objMtx[3][0] * camMtx[2][0] + objMtx[3][1] * camMtx[2][1] + objMtx[3][2] * camMtx[2][2] - camZ;
}
function vec3f_set_dist_and_angle(from, to, dist, pitch, yaw) {
    to[0] = from[0] + dist * coss(pitch) * sins(yaw);
    to[1] = from[1] + dist * sins(pitch);
    to[2] = from[2] + dist * coss(pitch) * coss(yaw);
}
const CURVE_BEGIN_1 = 1;
const CURVE_BEGIN_2 = 2;
const CURVE_MIDDLE = 3;
const CURVE_END_1 = 4;
const CURVE_END_2 = 5;
function spline_get_weights(result, t, c) {
    let tinv = 1 - t;
    let tinv2 = tinv * tinv;
    let tinv3 = tinv2 * tinv;
    let t2 = t * t;
    let t3 = t2 * t;
    switch (W.gSplineState) {
        case CURVE_BEGIN_1:
            result[0] = tinv3;
            result[1] = t3 * 1.75 - t2 * 4.5 + t * 3.0;
            result[2] = -t3 * (11 / 12.0) + t2 * 1.5;
            result[3] = t3 * (1 / 6.0);
            break;
        case CURVE_BEGIN_2:
            result[0] = tinv3 * 0.25;
            result[1] = t3 * (7 / 12.0) - t2 * 1.25 + t * 0.25 + (7 / 12.0);
            result[2] = -t3 * 0.5 + t2 * 0.5 + t * 0.5 + (1 / 6.0);
            result[3] = t3 * (1 / 6.0);
            break;
        case CURVE_MIDDLE:
            result[0] = tinv3 * (1 / 6.0);
            result[1] = t3 * 0.5 - t2 + (4 / 6.0);
            result[2] = -t3 * 0.5 + t2 * 0.5 + t * 0.5 + (1 / 6.0);
            result[3] = t3 * (1 / 6.0);
            break;
        case CURVE_END_1:
            result[0] = tinv3 * (1 / 6.0);
            result[1] = -tinv3 * 0.5 + tinv2 * 0.5 + tinv * 0.5 + (1 / 6.0);
            result[2] = tinv3 * (7 / 12.0) - tinv2 * 1.25 + tinv * 0.25 + (7 / 12.0);
            result[3] = t3 * 0.25;
            break;
        case CURVE_END_2:
            result[0] = tinv3 * (1 / 6.0);
            result[1] = -tinv3 * (11 / 12.0) + tinv2 * 1.5;
            result[2] = tinv3 * 1.75 - tinv2 * 4.5 + tinv * 3.0;
            result[3] = t3;
            break;
    }
}
function anim_spline_init(keyFrames) {
    W.gSplineKeyframe = keyFrames;
    W.gSplineKeyframeFraction = 0;
    W.gSplineState = 1;
}
function anim_spline_poll(result) {
    let weights = 0;
    let i = 0;
    let hasEnded = false;
    vec3f_copy(result, W.gVec3fZero);
    spline_get_weights(weights, W.gSplineKeyframeFraction, W.gSplineState);
    for (i = 0; i < 4; i++) {
        result[0] += weights[i] * W.gSplineKeyframe[i][1];
        result[1] += weights[i] * W.gSplineKeyframe[i][2];
        result[2] += weights[i] * W.gSplineKeyframe[i][3];
    }
    if ((W.gSplineKeyframeFraction += W.gSplineKeyframe[0][0] / 1000.0) >= 1) {
        W.gSplineKeyframe++;
        W.gSplineKeyframeFraction--;
        switch (W.gSplineState) {
            case CURVE_END_2:
                hasEnded = true;
                break;
            case CURVE_MIDDLE:
                if (W.gSplineKeyframe[2][0] == 0) {
                    W.gSplineState = CURVE_END_1;
                }
                break;
            default:
                W.gSplineState++;
                break;
        }
    }
    return hasEnded;
}

Object.assign(F, { vec3f_copy, vec3f_set, vec3f_add, vec3f_sum, vec3s_copy, vec3s_set, vec3s_add, vec3s_sum, vec3s_sub, vec3s_to_vec3f, vec3f_to_vec3s, find_vector_perpendicular_to_plane, vec3f_cross, vec3f_normalize, mtxf_translate, mtxf_lookat, mtxf_rotate_zxy_and_translate, mtxf_rotate_xyz_and_translate, mtxf_billboard, mtxf_align_terrain_normal, mtxf_align_terrain_triangle, mtxf_mul, mtxf_scale_vec3f, mtxf_mul_vec3s, mtxf_rotate_xy, get_pos_from_transform_mtx, vec3f_set_dist_and_angle, spline_get_weights, anim_spline_init, anim_spline_poll });

})(window);

/* object helpers: ported from the Super Mario 64 decompilation (github.com/n64decomp/sm64): src/game/object_helpers.c */
(function (root) {
'use strict';
const SM64 = root.SM64, F = SM64.F = SM64.F || {}, W = SM64.W = SM64.W || {}, B = SM64.B = SM64.B || {};
const { s16, s8, sins, coss, atan2s, sqr, approach_f32, approach_s32, max, min, REF, REFA, REFV } = SM64.m;
/*CONSTS*/
const { ACTIVE_FLAG_DEACTIVATED, ACTIVE_FLAG_FAR_AWAY, ACTIVE_FLAG_INITIATED_TIME_STOP, 
  ACTIVE_FLAG_IN_DIFFERENT_ROOM, ACTIVE_FLAG_UNK10, ACT_DIVE_SLIDE, ACT_FLAG_AIR, ACT_GROUND_POUND_LAND, 
  ACT_READING_NPC_DIALOG, ANIM_FLAG_NOLOOP, ATTACK_PUNCH, A_BUTTON, CUTSCENE_CAP_SWITCH_PRESS, DEBUG_PAGE_ENEMYINFO, 
  DIALOG_FLAG_TEXT_DEFAULT, DIALOG_FLAG_TEXT_RESPONSE, DIALOG_FLAG_TIME_STOP_ENABLED, DIALOG_FLAG_TURN_TO_MARIO, 
  DIALOG_NONE, DIALOG_RESPONSE_NONE, DIALOG_RESPONSE_NOT_DEFINED, DIALOG_STATUS_DISABLE_TIME_STOP, 
  DIALOG_STATUS_ENABLE_TIME_STOP, DIALOG_STATUS_INTERRUPT, DIALOG_STATUS_START_DIALOG, DIALOG_STATUS_STOP_DIALOG, 
  FLOOR_LOWER_LIMIT, FLOOR_LOWER_LIMIT_MISC, GRAPH_RENDER_ACTIVE, GRAPH_RENDER_BILLBOARD, GRAPH_RENDER_INVISIBLE, 
  HELD_DROPPED, HELD_FREE, HELD_HELD, HELD_THROWN, INT_STATUS_GRABBED_MARIO, INT_STATUS_INTERACTED, 
  INT_STATUS_TOUCHED_BOB_OMB, INT_STATUS_WAS_ATTACKED, INT_SUBTYPE_HOLDABLE_NPC, LEVEL_BBH, LEVEL_CASTLE, LEVEL_HMC, 
  MARIO_DIALOG_STATUS_SPEAK, MARIO_DIALOG_STOP, MODEL_BLUE_COIN, MODEL_DIRT_ANIMATION, MODEL_STAR, MODEL_YELLOW_COIN, 
  OBJECT_POOL_CAPACITY, OBJ_FLAG_0020, OBJ_FLAG_30, OBJ_FLAG_HOLDABLE, OBJ_FLAG_SET_THROW_MATRIX_FROM_TRANSFORM, 
  OBJ_FLAG_TRANSFORM_RELATIVE_TO_PARENT, OBJ_LIST_DEFAULT, OBJ_MOVE_ABOVE_DEATH_BARRIER, OBJ_MOVE_ABOVE_LAVA, 
  OBJ_MOVE_AT_WATER_SURFACE, OBJ_MOVE_BOUNCE, OBJ_MOVE_ENTERED_WATER, OBJ_MOVE_HIT_EDGE, OBJ_MOVE_HIT_WALL, 
  OBJ_MOVE_IN_AIR, OBJ_MOVE_LANDED, OBJ_MOVE_LEAVING_WATER, OBJ_MOVE_LEFT_GROUND, OBJ_MOVE_MASK_IN_WATER, 
  OBJ_MOVE_MASK_ON_GROUND, OBJ_MOVE_ON_GROUND, OBJ_MOVE_UNDERWATER_OFF_GROUND, OBJ_MOVE_UNDERWATER_ON_GROUND, 
  O_FACE_ANGLE_INDEX, O_FACE_ANGLE_PITCH_INDEX, O_FACE_ANGLE_YAW_INDEX, O_MOVE_ANGLE_INDEX, O_MOVE_ANGLE_PITCH_INDEX, 
  O_MOVE_ANGLE_YAW_INDEX, O_PARENT_RELATIVE_POS_INDEX, O_POS_INDEX, PATH_NONE, PATH_REACHED_END, 
  PATH_REACHED_WAYPOINT, SURFACE_BURNING, SURFACE_DEATH_PLANE, TIME_STOP_ENABLED, TIME_STOP_MARIO_AND_DOORS, 
  TOX_BOX_ACT_TABLE_END, WATER_DROPLET_FLAG_RAND_ANGLE, WATER_DROPLET_FLAG_RAND_ANGLE_INCR, 
  WATER_DROPLET_FLAG_RAND_ANGLE_INCR_PLUS_8000, WATER_DROPLET_FLAG_RAND_OFFSET_XYZ, 
  WATER_DROPLET_FLAG_RAND_OFFSET_XZ, WATER_DROPLET_FLAG_SET_Y_TO_WATER_LEVEL, WAYPOINT_FLAGS_END, 
  WAYPOINT_FLAGS_INITIALIZED } = SM64.C;
/*END CONSTS*/

let sBBHStairJiggleOffsets = [-8, 8, -4, 4];
let sPowersOfTwo = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80];
let sLevelsWithRooms = [LEVEL_BBH, LEVEL_CASTLE, LEVEL_HMC, -1];
const o = W.gCurrentObject;
function obj_update_pos_from_parent_transformation(a0, a1) {
    let spC = a1.oParentRelativePosX;
    let sp8 = a1.oParentRelativePosY;
    let sp4 = a1.oParentRelativePosZ;
    a1.oPosX = spC * a0[0][0] + sp8 * a0[1][0] + sp4 * a0[2][0] + a0[3][0];
    a1.oPosY = spC * a0[0][1] + sp8 * a0[1][1] + sp4 * a0[2][1] + a0[3][1];
    a1.oPosZ = spC * a0[0][2] + sp8 * a0[1][2] + sp4 * a0[2][2] + a0[3][2];
}
function obj_apply_scale_to_matrix(obj, dst, src) {
    dst[0][0] = src[0][0] * obj.gfx.scale[0];
    dst[1][0] = src[1][0] * obj.gfx.scale[1];
    dst[2][0] = src[2][0] * obj.gfx.scale[2];
    dst[3][0] = src[3][0];
    dst[0][1] = src[0][1] * obj.gfx.scale[0];
    dst[1][1] = src[1][1] * obj.gfx.scale[1];
    dst[2][1] = src[2][1] * obj.gfx.scale[2];
    dst[3][1] = src[3][1];
    dst[0][2] = src[0][2] * obj.gfx.scale[0];
    dst[1][2] = src[1][2] * obj.gfx.scale[1];
    dst[2][2] = src[2][2] * obj.gfx.scale[2];
    dst[3][2] = src[3][2];
    dst[0][3] = src[0][3];
    dst[1][3] = src[1][3];
    dst[2][3] = src[2][3];
    dst[3][3] = src[3][3];
}
function create_transformation_from_matrices(a0, a1, a2) {
    let spC = 0, sp8 = 0, sp4 = 0;
    spC = a2[3][0] * a2[0][0] + a2[3][1] * a2[0][1] + a2[3][2] * a2[0][2];
    sp8 = a2[3][0] * a2[1][0] + a2[3][1] * a2[1][1] + a2[3][2] * a2[1][2];
    sp4 = a2[3][0] * a2[2][0] + a2[3][1] * a2[2][1] + a2[3][2] * a2[2][2];
    a0[0][0] = a1[0][0] * a2[0][0] + a1[0][1] * a2[0][1] + a1[0][2] * a2[0][2];
    a0[0][1] = a1[0][0] * a2[1][0] + a1[0][1] * a2[1][1] + a1[0][2] * a2[1][2];
    a0[0][2] = a1[0][0] * a2[2][0] + a1[0][1] * a2[2][1] + a1[0][2] * a2[2][2];
    a0[1][0] = a1[1][0] * a2[0][0] + a1[1][1] * a2[0][1] + a1[1][2] * a2[0][2];
    a0[1][1] = a1[1][0] * a2[1][0] + a1[1][1] * a2[1][1] + a1[1][2] * a2[1][2];
    a0[1][2] = a1[1][0] * a2[2][0] + a1[1][1] * a2[2][1] + a1[1][2] * a2[2][2];
    a0[2][0] = a1[2][0] * a2[0][0] + a1[2][1] * a2[0][1] + a1[2][2] * a2[0][2];
    a0[2][1] = a1[2][0] * a2[1][0] + a1[2][1] * a2[1][1] + a1[2][2] * a2[1][2];
    a0[2][2] = a1[2][0] * a2[2][0] + a1[2][1] * a2[2][1] + a1[2][2] * a2[2][2];
    a0[3][0] = a1[3][0] * a2[0][0] + a1[3][1] * a2[0][1] + a1[3][2] * a2[0][2] - spC;
    a0[3][1] = a1[3][0] * a2[1][0] + a1[3][1] * a2[1][1] + a1[3][2] * a2[1][2] - sp8;
    a0[3][2] = a1[3][0] * a2[2][0] + a1[3][1] * a2[2][1] + a1[3][2] * a2[2][2] - sp4;
    a0[0][3] = 0.0;
    a0[1][3] = 0.0;
    a0[2][3] = 0.0;
    a0[3][3] = 1.0;
}
function obj_set_held_state(obj, heldBehavior) {
    const o = W.gCurrentObject;
    obj.parentObj = o;
    if (obj.oFlags & OBJ_FLAG_HOLDABLE) {
        if (heldBehavior ==B.bhvCarrySomething3) {
            obj.oHeldState = HELD_HELD;
        }
        if (heldBehavior ==B.bhvCarrySomething5) {
            obj.oHeldState = HELD_THROWN;
        }
        if (heldBehavior ==B.bhvCarrySomething4) {
            obj.oHeldState = HELD_DROPPED;
        }
    } else {
        obj.curBhvCommand = heldBehavior;
        obj.bhvStackIndex = 0;
    }
}
function lateral_dist_between_objects(obj1, obj2) {
    let dx = obj1.oPosX - obj2.oPosX;
    let dz = obj1.oPosZ - obj2.oPosZ;
    return Math.sqrt(dx * dx + dz * dz);
}
function dist_between_objects(obj1, obj2) {
    let dx = obj1.oPosX - obj2.oPosX;
    let dy = obj1.oPosY - obj2.oPosY;
    let dz = obj1.oPosZ - obj2.oPosZ;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
function cur_obj_forward_vel_approach_upward(target, increment) {
    const o = W.gCurrentObject;
    if (o.oForwardVel >= target) {
        o.oForwardVel = target;
    } else {
        o.oForwardVel += increment;
    }
}
function approach_f32_symmetric(value, target, increment) {
    let dist = 0;
    if ((dist = target - value) >= 0.0) {
        if (dist > increment) {
            value += increment;
        } else {
            value = target;
        }
    } else {
        if (dist < -increment) {
            value -= increment;
        } else {
            value = target;
        }
    }
    return value;
}
function approach_s16_symmetric(value, target, increment) {
    let dist = s16(target - value);
    if (dist >= 0) {
        if (dist > increment) {
            value = s16(value + (increment));
        } else {
            value = s16(target);
        }
    } else {
        if (dist < -increment) {
            value = s16(value - (increment));
        } else {
            value = s16(target);
        }
    }
    return value;
}
function cur_obj_rotate_yaw_toward(target, increment) {
    const o = W.gCurrentObject;
    let startYaw = 0;
    startYaw = s16(s16(o.oMoveAngleYaw));
    o.oMoveAngleYaw = approach_s16_symmetric(o.oMoveAngleYaw, target, increment);
    if ((o.oAngleVelYaw = s16((s16(o.oMoveAngleYaw) - startYaw))) == 0) {
        return true;
    } else {
        return false;
    }
}
function obj_angle_to_object(obj1, obj2) {
    let z1 = 0, x1 = 0, z2 = 0, x2 = 0;
    let angle = 0;
    z1 = obj1.oPosZ; z2 = obj2.oPosZ; 
    x1 = obj1.oPosX; x2 = obj2.oPosX;
    angle = s16(atan2s(z2 - z1, x2 - x1));
    return angle;
}
function obj_turn_toward_object(obj, target, angleIndex, turnAmount) {
    const o = W.gCurrentObject;
    let a = 0, b = 0, c = 0, d = 0;
    let filler = new Array(4).fill(0);
    let targetAngle = 0, startAngle = 0;
    switch (angleIndex) {
        case O_MOVE_ANGLE_PITCH_INDEX:
        case O_FACE_ANGLE_PITCH_INDEX:
            a = target.oPosX - obj.oPosX;
            c = target.oPosZ - obj.oPosZ;
            a = Math.sqrt(a * a + c * c);
            b = -obj.oPosY;
            d = -target.oPosY;
            targetAngle = s16(atan2s(a, d - b));
            break;
        case O_MOVE_ANGLE_YAW_INDEX:
        case O_FACE_ANGLE_YAW_INDEX:
            a = obj.oPosZ;
            c = target.oPosZ;
            b = obj.oPosX;
            d = target.oPosX;
            targetAngle = s16(atan2s(c - a, d - b));
            break;
    }
    startAngle = s16(o.rawData.asU32[angleIndex]);
    o.rawData.asU32[angleIndex] = approach_s16_symmetric(startAngle, targetAngle, turnAmount);
    return targetAngle;
}
function obj_set_parent_relative_pos(obj, relX, relY, relZ) {
    obj.oParentRelativePosX = relX;
    obj.oParentRelativePosY = relY;
    obj.oParentRelativePosZ = relZ;
}
function obj_set_pos(obj, x, y, z) {
    obj.oPosX = x;
    obj.oPosY = y;
    obj.oPosZ = z;
}
function obj_set_angle(obj, pitch, yaw, roll) {
    obj.oFaceAnglePitch = pitch;
    obj.oFaceAngleYaw = yaw;
    obj.oFaceAngleRoll = roll;
    obj.oMoveAnglePitch = pitch;
    obj.oMoveAngleYaw = yaw;
    obj.oMoveAngleRoll = roll;
}
function spawn_object_abs_with_rot(parent, uselessArg, model, behavior, x, y, z, pitch, yaw, roll) {
    let newObj = spawn_object_at_origin(parent, uselessArg, model, behavior);
    obj_set_pos(newObj, x, y, z);
    obj_set_angle(newObj, pitch, yaw, roll);
    return newObj;
}
function spawn_object_rel_with_rot(parent, model, behavior, xOff, yOff, zOff, pitch, yaw, roll) {
    let newObj = spawn_object_at_origin(parent, 0, model, behavior);
    newObj.oFlags |= OBJ_FLAG_TRANSFORM_RELATIVE_TO_PARENT;
    obj_set_parent_relative_pos(newObj, xOff, yOff, zOff);
    obj_set_angle(newObj, pitch, yaw, zOff); 
    return newObj;
}
function spawn_obj_with_transform_flags(sp20, model, sp28) {
    let sp1C = spawn_object(sp20, model, sp28);
    sp1C.oFlags |= OBJ_FLAG_0020 | OBJ_FLAG_SET_THROW_MATRIX_FROM_TRANSFORM;
    return sp1C;
}
function spawn_water_droplet(parent, params) {
    let randomScale = 0;
    let newObj = spawn_object(parent, params.model, params.behavior);
    if (params.flags & WATER_DROPLET_FLAG_RAND_ANGLE) {
        newObj.oMoveAngleYaw = F.random_u16();
    }
    if (params.flags & WATER_DROPLET_FLAG_RAND_ANGLE_INCR_PLUS_8000) {
        newObj.oMoveAngleYaw = s16((newObj.oMoveAngleYaw + 0x8000))
                                + s16(random_f32_around_zero(params.moveAngleRange));
    }
    if (params.flags & WATER_DROPLET_FLAG_RAND_ANGLE_INCR) {
        newObj.oMoveAngleYaw =
            s16(newObj.oMoveAngleYaw) + s16(random_f32_around_zero(params.moveAngleRange));
    }
    if (params.flags & WATER_DROPLET_FLAG_SET_Y_TO_WATER_LEVEL) {
        newObj.oPosY = F.find_water_level(newObj.oPosX, newObj.oPosZ);
    }
    if (params.flags & WATER_DROPLET_FLAG_RAND_OFFSET_XZ) {
        obj_translate_xz_random(newObj, params.moveRange);
    }
    if (params.flags & WATER_DROPLET_FLAG_RAND_OFFSET_XYZ) {
        obj_translate_xyz_random(newObj, params.moveRange);
    }
    newObj.oForwardVel = F.random_float() * params.randForwardVelScale + params.randForwardVelOffset;
    newObj.oVelY = F.random_float() * params.randYVelScale + params.randYVelOffset;
    randomScale = F.random_float() * params.randSizeScale + params.randSizeOffset;
    obj_scale(newObj, randomScale);
    return newObj;
}
function spawn_object_at_origin(parent, unusedArg, model, behavior) {
    let obj = null;
    let behaviorAddr = null;
    behaviorAddr = behavior;
    obj = create_object(behaviorAddr);
    obj.parentObj = parent;
    obj.gfx.areaIndex = parent.gfx.areaIndex;
    obj.gfx.activeAreaIndex = parent.gfx.areaIndex;
    F.geo_obj_init(obj.header.gfx, W.gLoadedGraphNodes[model], W.gVec3fZero, W.gVec3sZero);
    return obj;
}
function spawn_object(parent, model, behavior) {
    let obj = spawn_object_at_origin(parent, 0, model, behavior);
    obj_copy_pos_and_angle(obj, parent);
    return obj;
}
function try_to_spawn_object(offsetY, scale, parent, model, behavior) {
    let obj = null;
    if (W.gFreeObjectList.next != null) {
        obj = spawn_object(parent, model, behavior);
        obj.oPosY += offsetY;
        obj_scale(obj, scale);
        return obj;
    } else {
        return null;
    }
}
function spawn_object_with_scale(parent, model, behavior, scale) {
    let obj = spawn_object_at_origin(parent, 0, model, behavior);
    obj_copy_pos_and_angle(obj, parent);
    obj_scale(obj, scale);
    return obj;
}
function obj_build_relative_transform(obj) {
    obj_build_transform_from_pos_and_angle(obj, O_PARENT_RELATIVE_POS_INDEX, O_FACE_ANGLE_INDEX);
    obj_translate_local(obj, O_POS_INDEX, O_PARENT_RELATIVE_POS_INDEX);
}
function spawn_object_relative(behaviorParam, relativePosX, relativePosY, relativePosZ, parent, model, behavior) {
    let obj = spawn_object_at_origin(parent, 0, model, behavior);
    obj_copy_pos_and_angle(obj, parent);
    obj_set_parent_relative_pos(obj, relativePosX, relativePosY, relativePosZ);
    obj_build_relative_transform(obj);
    obj.oBhvParams2ndByte = behaviorParam;
    obj.oBhvParams = (behaviorParam & 0xFF) << 16;
    return obj;
}
function spawn_object_relative_with_scale(behaviorParam, relativePosX, relativePosY, relativePosZ, scale, parent, model, behavior) {
    let obj = spawn_object_relative(behaviorParam, relativePosX, relativePosY, relativePosZ, parent, model, behavior);
    obj_scale(obj, scale);
    return obj;
}
function cur_obj_move_using_vel() {
    const o = W.gCurrentObject;
    o.oPosX += o.oVelX;
    o.oPosY += o.oVelY;
    o.oPosZ += o.oVelZ;
}
function obj_copy_graph_y_offset(dst, src) {
    dst.oGraphYOffset = src.oGraphYOffset;
}
function obj_copy_pos_and_angle(dst, src) {
    obj_copy_pos(dst, src);
    obj_copy_angle(dst, src);
}
function obj_copy_pos(dst, src) {
    dst.oPosX = src.oPosX;
    dst.oPosY = src.oPosY;
    dst.oPosZ = src.oPosZ;
}
function obj_copy_angle(dst, src) {
    dst.oMoveAnglePitch = src.oMoveAnglePitch;
    dst.oMoveAngleYaw = src.oMoveAngleYaw;
    dst.oMoveAngleRoll = src.oMoveAngleRoll;
    dst.oFaceAnglePitch = src.oFaceAnglePitch;
    dst.oFaceAngleYaw = src.oFaceAngleYaw;
    dst.oFaceAngleRoll = src.oFaceAngleRoll;
}
function obj_init_animation(obj, animIndex) {
    const o = W.gCurrentObject;
    let anims = o.oAnimations;
    F.geo_obj_init_animation(obj.header.gfx, REFA(anims, animIndex));
}
function linear_mtxf_mul_vec3f(m, dst, v) {
    let i = 0;
    for (i = 0; i < 3; i++) {
        dst[i] = m[0][i] * v[0] + m[1][i] * v[1] + m[2][i] * v[2];
    }
}
function linear_mtxf_transpose_mul_vec3f(m, dst, v) {
    let i = 0;
    for (i = 0; i < 3; i++) {
        dst[i] = m[i][0] * v[0] + m[i][1] * v[1] + m[i][2] * v[2];
    }
}
function obj_apply_scale_to_transform(obj) {
    let scaleX = obj.gfx.scale[0];
    let scaleY = obj.gfx.scale[1];
    let scaleZ = obj.gfx.scale[2];
    obj.transform[0][0] *= scaleX;
    obj.transform[0][1] *= scaleX;
    obj.transform[0][2] *= scaleX;
    obj.transform[1][0] *= scaleY;
    obj.transform[1][1] *= scaleY;
    obj.transform[1][2] *= scaleY;
    obj.transform[2][0] *= scaleZ;
    obj.transform[2][1] *= scaleZ;
    obj.transform[2][2] *= scaleZ;
}
function obj_copy_scale(dst, src) {
    dst.gfx.scale[0] = src.gfx.scale[0];
    dst.gfx.scale[1] = src.gfx.scale[1];
    dst.gfx.scale[2] = src.gfx.scale[2];
}
function obj_scale_xyz(obj, xScale, yScale, zScale) {
    obj.gfx.scale[0] = xScale;
    obj.gfx.scale[1] = yScale;
    obj.gfx.scale[2] = zScale;
}
function obj_scale(obj, scale) {
    obj.gfx.scale[0] = scale;
    obj.gfx.scale[1] = scale;
    obj.gfx.scale[2] = scale;
}
function cur_obj_scale(scale) {
    const o = W.gCurrentObject;
    o.gfx.scale[0] = scale;
    o.gfx.scale[1] = scale;
    o.gfx.scale[2] = scale;
}
function obj_init_animation_with_sound(obj, animations, animIndex) {
    let anims = animations;
    obj.oAnimations = animations;
    F.geo_obj_init_animation(obj.header.gfx, REFA(anims, animIndex));
    obj.oSoundStateID = animIndex;
}
function cur_obj_enable_rendering() {
    const o = W.gCurrentObject;
    o.gfx.flags |= GRAPH_RENDER_ACTIVE;
}
function cur_obj_disable_rendering_and_become_intangible(obj) {
    obj.gfx.flags &= ~GRAPH_RENDER_ACTIVE;
    obj.oIntangibleTimer = -1;
}
function cur_obj_disable_rendering() {
    const o = W.gCurrentObject;
    o.gfx.flags &= ~GRAPH_RENDER_ACTIVE;
}
function cur_obj_unhide() {
    const o = W.gCurrentObject;
    o.gfx.flags &= ~GRAPH_RENDER_INVISIBLE;
}
function cur_obj_hide() {
    const o = W.gCurrentObject;
    o.gfx.flags |= GRAPH_RENDER_INVISIBLE;
}
function cur_obj_set_pos_relative(other, dleft, dy, dforward) {
    const o = W.gCurrentObject;
    let facingZ = coss(other.oMoveAngleYaw);
    let facingX = sins(other.oMoveAngleYaw);
    let dz = dforward * facingZ - dleft * facingX;
    let dx = dforward * facingX + dleft * facingZ;
    o.oMoveAngleYaw = other.oMoveAngleYaw;
    o.oPosX = other.oPosX + dx;
    o.oPosY = other.oPosY + dy;
    o.oPosZ = other.oPosZ + dz;
}
function cur_obj_set_pos_relative_to_parent(dleft, dy, dforward) {
    const o = W.gCurrentObject;
    cur_obj_set_pos_relative(o.parentObj, dleft, dy, dforward);
}
function cur_obj_enable_rendering_2() {
    cur_obj_enable_rendering();
}
function cur_obj_unused_init_on_floor() {
    const o = W.gCurrentObject;
    cur_obj_enable_rendering();
    o.oPosY = F.find_floor_height(o.oPosX, o.oPosY, o.oPosZ);
    if (o.oPosY < FLOOR_LOWER_LIMIT_MISC) {
        cur_obj_set_pos_relative_to_parent(0, 0, -70);
        o.oPosY = F.find_floor_height(o.oPosX, o.oPosY, o.oPosZ);
    }
}
function obj_set_face_angle_to_move_angle(obj) {
    obj.oFaceAnglePitch = obj.oMoveAnglePitch;
    obj.oFaceAngleYaw = obj.oMoveAngleYaw;
    obj.oFaceAngleRoll = obj.oMoveAngleRoll;
}
function get_object_list_from_behavior(behavior) {
    let objectList = 0;
    if ((behavior[0] >> 24) == 0) {
        objectList = (behavior[0] >> 16) & 0xFFFF;
    } else {
        objectList = OBJ_LIST_DEFAULT;
    }
    return objectList;
}
function cur_obj_nearest_object_with_behavior(behavior) {
    let obj = null;
    let dist = 0;
    obj = cur_obj_find_nearest_object_with_behavior(behavior, REFV(() => dist, $ => dist = $));
    return obj;
}
function cur_obj_dist_to_nearest_object_with_behavior(behavior) {
    let obj = null;
    let dist = 0;
    obj = cur_obj_find_nearest_object_with_behavior(behavior, REFV(() => dist, $ => dist = $));
    if (obj == null) {
        dist = 15000.0;
    }
    return dist;
}
function cur_obj_reset_timer_and_subaction() {
    const o = W.gCurrentObject;
    o.oTimer = 0;
    o.oSubAction = 0;
}
function cur_obj_change_action(action) {
    const o = W.gCurrentObject;
    o.oAction = action;
    o.oPrevAction = action;
    cur_obj_reset_timer_and_subaction();
}
function cur_obj_set_vel_from_mario_vel(objBaseForwardVel, multiplier) {
    const o = W.gCurrentObject;
    let marioForwardVel = W.gMarioStates[0].forwardVel;
    let objForwardVel = objBaseForwardVel * multiplier;
    if (marioForwardVel < objForwardVel) {
        o.oForwardVel = objForwardVel;
    } else {
        o.oForwardVel = marioForwardVel * multiplier;
    }
}
function cur_obj_reverse_animation() {
    const o = W.gCurrentObject;
    if (o.gfx.anim.frame >= 0) {
        o.gfx.anim.frame--;
    }
}
function cur_obj_extend_animation_if_at_end() {
    const o = W.gCurrentObject;
    let animFrame = o.gfx.anim.frame;
    let sp0 = o.gfx.anim.anim.loopEnd - 2;
    if (animFrame == sp0) {
        o.gfx.anim.frame--;
    }
}
function cur_obj_check_if_near_animation_end() {
    const o = W.gCurrentObject;
    let animFlags = Math.trunc(o.gfx.anim.anim.flags);
    let animFrame = o.gfx.anim.frame;
    let nearLoopEnd = o.gfx.anim.anim.loopEnd - 2;
    let isNearEnd = false;
    if (animFlags & ANIM_FLAG_NOLOOP && nearLoopEnd + 1 == animFrame) {
        isNearEnd = true;
    }
    if (animFrame == nearLoopEnd) {
        isNearEnd = true;
    }
    return isNearEnd;
}
function cur_obj_check_if_at_animation_end() {
    const o = W.gCurrentObject;
    let animFrame = o.gfx.anim.frame;
    let lastFrame = o.gfx.anim.anim.loopEnd - 1;
    if (animFrame == lastFrame) {
        return true;
    } else {
        return false;
    }
}
function cur_obj_check_anim_frame(frame) {
    const o = W.gCurrentObject;
    let animFrame = o.gfx.anim.frame;
    if (animFrame == frame) {
        return true;
    } else {
        return false;
    }
}
function cur_obj_check_anim_frame_in_range(startFrame, rangeLength) {
    const o = W.gCurrentObject;
    let animFrame = o.gfx.anim.frame;
    if (animFrame >= startFrame && animFrame < startFrame + rangeLength) {
        return true;
    } else {
        return false;
    }
}
function mario_is_in_air_action() {
    if (W.gMarioStates[0].action & ACT_FLAG_AIR) {
        return true;
    } else {
        return false;
    }
}
function mario_is_dive_sliding() {
    if (W.gMarioStates[0].action == ACT_DIVE_SLIDE) {
        return true;
    } else {
        return false;
    }
}
function cur_obj_set_y_vel_and_animation(yVel, animIndex) {
    const o = W.gCurrentObject;
    o.oVelY = yVel;
    F.cur_obj_init_animation_with_sound(animIndex);
}
function cur_obj_unrender_set_action_and_anim(animIndex, action) {
    const o = W.gCurrentObject;
    cur_obj_become_intangible();
    cur_obj_disable_rendering();
    if (animIndex >= 0) {
        F.cur_obj_init_animation_with_sound(animIndex);
    }
    o.oAction = action;
}
function cur_obj_move_after_thrown_or_dropped(forwardVel, velY) {
    const o = W.gCurrentObject;
    o.oMoveFlags = 0;
    o.oFloorHeight = F.find_floor_height(o.oPosX, o.oPosY + 160.0, o.oPosZ);
    if (o.oFloorHeight > o.oPosY) {
        o.oPosY = o.oFloorHeight;
    } else if (o.oFloorHeight < FLOOR_LOWER_LIMIT_MISC) {
        obj_copy_pos(o, W.gMarioObject);
        o.oFloorHeight = F.find_floor_height(o.oPosX, o.oPosY, o.oPosZ);
    }
    o.oForwardVel = forwardVel;
    o.oVelY = velY;
    if (o.oForwardVel != 0) {
        cur_obj_move_y( -4.0,  -0.1,  2.0);
    }
}
function cur_obj_get_thrown_or_placed(forwardVel, velY, thrownAction) {
    const o = W.gCurrentObject;
    if (o.behavior ==B.bhvBowser) {
        cur_obj_set_pos_relative_to_parent(-41.684, 85.859, 321.577);
    } else {
    }
    cur_obj_become_tangible();
    cur_obj_enable_rendering();
    o.oHeldState = HELD_FREE;
    if ((o.oInteractionSubtype & INT_SUBTYPE_HOLDABLE_NPC) || forwardVel == 0.0) {
        cur_obj_move_after_thrown_or_dropped(0.0, 0.0);
    } else {
        o.oAction = thrownAction;
        cur_obj_move_after_thrown_or_dropped(forwardVel, velY);
    }
}
function cur_obj_get_dropped() {
    const o = W.gCurrentObject;
    cur_obj_become_tangible();
    cur_obj_enable_rendering();
    o.oHeldState = HELD_FREE;
    cur_obj_move_after_thrown_or_dropped(0.0, 0.0);
}
function cur_obj_set_model(modelID) {
    const o = W.gCurrentObject;
    o.gfx.sharedChild = W.gLoadedGraphNodes[modelID];
}
function mario_set_flag(flag) {
    W.gMarioStates[0].flags |= flag;
}
function cur_obj_clear_interact_status_flag(flag) {
    const o = W.gCurrentObject;
    if (o.oInteractStatus & flag) {
        o.oInteractStatus &= flag ^ 0xFFFFFFFF;
        return true;
    }
    return false;
}
function obj_mark_for_deletion(obj) {
    obj.activeFlags = ACTIVE_FLAG_DEACTIVATED;
}
function cur_obj_disable() {
    cur_obj_disable_rendering();
    cur_obj_hide();
    cur_obj_become_intangible();
}
function cur_obj_become_intangible() {
    const o = W.gCurrentObject;
    o.oIntangibleTimer = -1;
}
function cur_obj_become_tangible() {
    const o = W.gCurrentObject;
    o.oIntangibleTimer = 0;
}
function obj_become_tangible(obj) {
    obj.oIntangibleTimer = 0;
}
function cur_obj_update_floor_height() {
    const o = W.gCurrentObject;
    let floor = null;
    o.oFloorHeight = F.find_floor(o.oPosX, o.oPosY, o.oPosZ, $ => floor = $);
}
function cur_obj_update_floor_height_and_get_floor() {
    const o = W.gCurrentObject;
    let floor = null;
    o.oFloorHeight = F.find_floor(o.oPosX, o.oPosY, o.oPosZ, $ => floor = $);
    return floor;
}
function cur_obj_apply_drag_xz(dragStrength) {
    const o = W.gCurrentObject;
    F.apply_drag_to_value(REF(o, 'oVelX'), dragStrength);
    F.apply_drag_to_value(REF(o, 'oVelZ'), dragStrength);
}
function cur_obj_move_xz(steepSlopeNormalY, careAboutEdgesAndSteepSlopes) {
    let intendedFloor = null;
    let intendedX = o.oPosX + o.oVelX;
    let intendedZ = o.oPosZ + o.oVelZ;
    let intendedFloorHeight = F.find_floor(intendedX, o.oPosY, intendedZ, $ => intendedFloor = $);
    let deltaFloorHeight = intendedFloorHeight - o.oFloorHeight;
    let filler = new Array(4).fill(0);
    let ny = 0;
    o.oMoveFlags &= ~OBJ_MOVE_HIT_EDGE;
    if (o.oRoom != -1 && intendedFloor != null) {
        if (intendedFloor.room != 0 && o.oRoom != intendedFloor.room && intendedFloor.room != 18) {
            return false;
        }
    }
    if (intendedFloorHeight < FLOOR_LOWER_LIMIT_MISC) {
        o.oMoveFlags |= OBJ_MOVE_HIT_EDGE;
        return false;
    } else if (deltaFloorHeight < 5.0) {
        if (!careAboutEdgesAndSteepSlopes) {
            o.oPosX = intendedX;
            o.oPosZ = intendedZ;
            return true;
        } else if (deltaFloorHeight < -50.0 && (o.oMoveFlags & OBJ_MOVE_ON_GROUND)) {
            o.oMoveFlags |= OBJ_MOVE_HIT_EDGE;
            return false;
        } else if (intendedFloor.ny > steepSlopeNormalY) {
            o.oPosX = intendedX;
            o.oPosZ = intendedZ;
            return true;
        } else {
            o.oMoveFlags |= OBJ_MOVE_HIT_EDGE;
            return false;
        }
    } else if ((ny = intendedFloor.ny) > steepSlopeNormalY || o.oPosY > intendedFloorHeight) {
        o.oPosX = intendedX;
        o.oPosZ = intendedZ;
    }
    return false;
}
function cur_obj_move_update_underwater_flags() {
    const o = W.gCurrentObject;
    let decelY = (Math.sqrt(o.oVelY * o.oVelY) * (o.oDragStrength * 7.0)) / 100.0;
    if (o.oVelY > 0) {
        o.oVelY -= decelY;
    } else {
        o.oVelY += decelY;
    }
    if (o.oPosY < o.oFloorHeight) {
        o.oPosY = o.oFloorHeight;
        o.oMoveFlags |= OBJ_MOVE_UNDERWATER_ON_GROUND;
    } else {
        o.oMoveFlags |= OBJ_MOVE_UNDERWATER_OFF_GROUND;
    }
}
function cur_obj_move_update_ground_air_flags(gravity, bounciness) {
    const o = W.gCurrentObject;
    o.oMoveFlags &= ~OBJ_MOVE_BOUNCE;
    if (o.oPosY < o.oFloorHeight) {
        if (!(o.oMoveFlags & OBJ_MOVE_ON_GROUND)) {
            if (F.clear_move_flag(REF(o, 'oMoveFlags'), OBJ_MOVE_LANDED)) {
                o.oMoveFlags |= OBJ_MOVE_ON_GROUND;
            } else {
                o.oMoveFlags |= OBJ_MOVE_LANDED;
            }
        }
        o.oPosY = o.oFloorHeight;
        if (o.oVelY < 0.0) {
            o.oVelY *= bounciness;
        }
        if (o.oVelY > 5.0) {
            o.oMoveFlags |= OBJ_MOVE_BOUNCE;
        }
    } else {
        o.oMoveFlags &= ~OBJ_MOVE_LANDED;
        if (F.clear_move_flag(REF(o, 'oMoveFlags'), OBJ_MOVE_ON_GROUND)) {
            o.oMoveFlags |= OBJ_MOVE_LEFT_GROUND;
        }
    }
    o.oMoveFlags &= ~OBJ_MOVE_MASK_IN_WATER;
}
function cur_obj_move_y_and_get_water_level(gravity, buoyancy) {
    const o = W.gCurrentObject;
    let waterLevel = 0;
    o.oVelY += gravity + buoyancy;
    if (o.oVelY < -78.0) {
        o.oVelY = -78.0;
    }
    o.oPosY += o.oVelY;
    if (o.activeFlags & ACTIVE_FLAG_UNK10) {
        waterLevel = FLOOR_LOWER_LIMIT;
    } else {
        waterLevel = F.find_water_level(o.oPosX, o.oPosZ);
    }
    return waterLevel;
}
function cur_obj_move_y(gravity, bounciness, buoyancy) {
    const o = W.gCurrentObject;
    let waterLevel = 0;
    o.oMoveFlags &= ~OBJ_MOVE_LEFT_GROUND;
    if (o.oMoveFlags & OBJ_MOVE_AT_WATER_SURFACE) {
        if (o.oVelY > 5.0) {
            o.oMoveFlags &= ~OBJ_MOVE_MASK_IN_WATER;
            o.oMoveFlags |= OBJ_MOVE_LEAVING_WATER;
        }
    }
    if (!(o.oMoveFlags & OBJ_MOVE_MASK_IN_WATER)) {
        waterLevel = cur_obj_move_y_and_get_water_level(gravity, 0.0);
        if (o.oPosY > waterLevel) {
            cur_obj_move_update_ground_air_flags(gravity, bounciness);
        } else {
            o.oMoveFlags |= OBJ_MOVE_ENTERED_WATER;
            o.oMoveFlags &= ~OBJ_MOVE_MASK_ON_GROUND;
        }
    } else {
        o.oMoveFlags &= ~OBJ_MOVE_ENTERED_WATER;
        waterLevel = cur_obj_move_y_and_get_water_level(gravity, buoyancy);
        if (o.oPosY < waterLevel) {
            cur_obj_move_update_underwater_flags();
        } else {
            if (o.oPosY < o.oFloorHeight) {
                o.oPosY = o.oFloorHeight;
                o.oMoveFlags &= ~OBJ_MOVE_MASK_IN_WATER;
            } else {
                o.oPosY = waterLevel;
                o.oVelY = 0.0;
                o.oMoveFlags &= ~(OBJ_MOVE_UNDERWATER_OFF_GROUND | OBJ_MOVE_UNDERWATER_ON_GROUND);
                o.oMoveFlags |= OBJ_MOVE_AT_WATER_SURFACE;
            }
        }
    }
    if (o.oMoveFlags & (OBJ_MOVE_MASK_ON_GROUND | OBJ_MOVE_AT_WATER_SURFACE | OBJ_MOVE_UNDERWATER_OFF_GROUND)) {
        o.oMoveFlags &= ~OBJ_MOVE_IN_AIR;
    } else {
        o.oMoveFlags |= OBJ_MOVE_IN_AIR;
    }
}
function stub_obj_helpers_1() {
}
function cur_obj_unused_resolve_wall_collisions(offsetY, radius) {
    const o = W.gCurrentObject;
    if (radius > 0.1) {
        F.f32_find_wall_collision(REF(o, 'oPosX'), REF(o, 'oPosY'), REF(o, 'oPosZ'), offsetY, radius);
    }
}
function abs_angle_diff(x0, x1) {
    let diff = s16(x1 - x0);
    if (diff == -0x8000) {
        diff = s16(-0x7FFF);
    }
    if (diff < 0) {
        diff = s16(-diff);
    }
    return diff;
}
function cur_obj_move_xz_using_fvel_and_yaw() {
    const o = W.gCurrentObject;
    o.oVelX = o.oForwardVel * sins(o.oMoveAngleYaw);
    o.oVelZ = o.oForwardVel * coss(o.oMoveAngleYaw);
    o.oPosX += o.oVelX;
    o.oPosZ += o.oVelZ;
}
function cur_obj_move_y_with_terminal_vel() {
    const o = W.gCurrentObject;
    if (o.oVelY < -70.0) {
        o.oVelY = -70.0;
    }
    o.oPosY += o.oVelY;
}
function cur_obj_compute_vel_xz() {
    const o = W.gCurrentObject;
    o.oVelX = o.oForwardVel * sins(o.oMoveAngleYaw);
    o.oVelZ = o.oForwardVel * coss(o.oMoveAngleYaw);
}
function increment_velocity_toward_range(value, center, zeroThreshold, increment) {
    let relative = 0;
    if ((relative = value - center) > 0) {
        if (relative < zeroThreshold) {
            return 0.0;
        } else {
            return -increment;
        }
    } else {
        if (relative > -zeroThreshold) {
            return 0.0;
        } else {
            return increment;
        }
    }
}
function obj_check_if_collided_with_object(obj1, obj2) {
    let i = 0;
    for (i = 0; i < obj1.numCollidedObjs; i++) {
        if (obj1.collidedObjs[i] == obj2) {
            return true;
        }
    }
    return false;
}
function cur_obj_set_behavior(behavior) {
    const o = W.gCurrentObject;
    o.behavior = behavior;
}
function obj_set_behavior(obj, behavior) {
    obj.behavior = behavior;
}
function cur_obj_lateral_dist_from_mario_to_home() {
    const o = W.gCurrentObject;
    let dist = 0;
    let dx = o.oHomeX - W.gMarioObject.oPosX;
    let dz = o.oHomeZ - W.gMarioObject.oPosZ;
    dist = Math.sqrt(dx * dx + dz * dz);
    return dist;
}
function cur_obj_lateral_dist_to_home() {
    const o = W.gCurrentObject;
    let dist = 0;
    let dx = o.oHomeX - o.oPosX;
    let dz = o.oHomeZ - o.oPosZ;
    dist = Math.sqrt(dx * dx + dz * dz);
    return dist;
}
function cur_obj_outside_home_square(halfLength) {
    const o = W.gCurrentObject;
    if (o.oHomeX - halfLength > o.oPosX) {
        return true;
    }
    if (o.oHomeX + halfLength < o.oPosX) {
        return true;
    }
    if (o.oHomeZ - halfLength > o.oPosZ) {
        return true;
    }
    if (o.oHomeZ + halfLength < o.oPosZ) {
        return true;
    }
    return false;
}
function cur_obj_outside_home_rectangle(minX, maxX, minZ, maxZ) {
    const o = W.gCurrentObject;
    if (o.oHomeX + minX > o.oPosX) {
        return true;
    }
    if (o.oHomeX + maxX < o.oPosX) {
        return true;
    }
    if (o.oHomeZ + minZ > o.oPosZ) {
        return true;
    }
    if (o.oHomeZ + maxZ < o.oPosZ) {
        return true;
    }
    return false;
}
function cur_obj_set_pos_to_home() {
    const o = W.gCurrentObject;
    o.oPosX = o.oHomeX;
    o.oPosY = o.oHomeY;
    o.oPosZ = o.oHomeZ;
}
function cur_obj_set_pos_to_home_and_stop() {
    const o = W.gCurrentObject;
    cur_obj_set_pos_to_home();
    o.oForwardVel = 0.0;
    o.oVelY = 0.0;
}
function cur_obj_shake_y(amount) {
    const o = W.gCurrentObject;
    if (o.oTimer % 2 == 0) {
        o.oPosY += amount;
    } else {
        o.oPosY -= amount;
    }
}
function cur_obj_start_cam_event(obj, cameraEvent) {
    const o = W.gCurrentObject;
    W.gPlayerCameraState.cameraEvent = s16(cameraEvent);
    W.gSecondCameraFocus = o;
}
function set_mario_interact_true_if_in_range(arg0, arg1, range) {
    const o = W.gCurrentObject;
    if (o.oDistanceToMario < range) {
        W.gMarioObject.oInteractStatus = true;
    }
}
function obj_set_billboard(obj) {
    obj.gfx.flags |= GRAPH_RENDER_BILLBOARD;
}
function cur_obj_set_hitbox_radius_and_height(radius, height) {
    const o = W.gCurrentObject;
    o.hitboxRadius = radius;
    o.hitboxHeight = height;
}
function cur_obj_set_hurtbox_radius_and_height(radius, height) {
    const o = W.gCurrentObject;
    o.hurtboxRadius = radius;
    o.hurtboxHeight = height;
}
function obj_spawn_loot_coins(obj, numCoins, baseVelY, coinBehavior, posJitter, model) {
    let i = 0;
    let spawnHeight = 0;
    let floor = null;
    let coin = null;
    spawnHeight = F.find_floor(obj.oPosX, obj.oPosY, obj.oPosZ, $ => floor = $);
    if (obj.oPosY - spawnHeight > 100.0) {
        spawnHeight = obj.oPosY;
    }
    for (i = 0; i < numCoins; i++) {
        if (obj.oNumLootCoins <= 0) {
            break;
        }
        obj.oNumLootCoins--;
        coin = spawn_object(obj, model, coinBehavior);
        obj_translate_xz_random(coin, posJitter);
        coin.oPosY = spawnHeight;
        coin.oCoinBaseVelY = baseVelY;
    }
}
function obj_spawn_loot_blue_coins(obj, numCoins, baseVelY, posJitter) {
    obj_spawn_loot_coins(obj, numCoins, baseVelY,B.bhvBlueCoinJumping, posJitter, MODEL_BLUE_COIN);
}
function obj_spawn_loot_yellow_coins(obj, numCoins, baseVelY) {
    obj_spawn_loot_coins(obj, numCoins, baseVelY,B.bhvSingleCoinGetsSpawned, 0, MODEL_YELLOW_COIN);
}
function cur_obj_spawn_loot_coin_at_mario_pos() {
    const o = W.gCurrentObject;
    let coin = null;
    if (o.oNumLootCoins <= 0) {
        return;
    }
    o.oNumLootCoins--;
    coin = spawn_object(o, MODEL_YELLOW_COIN,B.bhvSingleCoinGetsSpawned);
    coin.oVelY = 30.0;
    obj_copy_pos(coin, W.gMarioObject);
}
function cur_obj_abs_y_dist_to_home() {
    const o = W.gCurrentObject;
    let dist = o.oHomeY - o.oPosY;
    if (dist < 0) {
        dist = -dist;
    }
    return dist;
}
function cur_obj_advance_looping_anim() {
    const o = W.gCurrentObject;
    let animFrame = o.gfx.anim.frame;
    let loopEnd = o.gfx.anim.anim.loopEnd;
    let result = 0;
    if (animFrame < 0) {
        animFrame = 0;
    } else if (loopEnd - 1 == animFrame) {
        animFrame = 0;
    } else {
        animFrame++;
    }
    result = (animFrame << 16) / loopEnd;
    return result;
}
function cur_obj_detect_steep_floor(steepAngleDegrees) {
    let intendedFloor = null;
    let intendedX = 0, intendedFloorHeight = 0, intendedZ = 0;
    let deltaFloorHeight = 0;
    let steepNormalY = coss(s16((steepAngleDegrees * (0x10000 / 360))));
    if (o.oForwardVel != 0.0) {
        let endedX = o.oPosX + o.oVelX;
        let endedZ = o.oPosZ + o.oVelZ;
        let endedFloorHeight = F.find_floor(intendedX, o.oPosY, intendedZ, $ => intendedFloor = $);
        deltaFloorHeight = intendedFloorHeight - o.oFloorHeight;
        if (intendedFloorHeight < FLOOR_LOWER_LIMIT_MISC) {
            o.oWallAngle = o.oMoveAngleYaw + 0x8000;
            return 2;
        } else if (intendedFloor.ny < steepNormalY && deltaFloorHeight > 0 && intendedFloorHeight > o.oPosY) {
            o.oWallAngle = atan2s(intendedFloor.nz, intendedFloor.nx);
            return 1;
        } else {
            return 0;
        }
    }
    return 0;
}
function cur_obj_resolve_wall_collisions() {
    const o = W.gCurrentObject;
    let numCollisions = 0;
    let wall = null;
    let collisionData = {};
    let offsetY = 10.0;
    let radius = o.oWallHitboxRadius;
    if (radius > 0.1) {
        collisionData.offsetY = offsetY;
        collisionData.radius = radius;
        collisionData.x = s16(o.oPosX);
        collisionData.y = s16(o.oPosY);
        collisionData.z = s16(o.oPosZ);
        numCollisions = F.find_wall_collisions(collisionData);
        if (numCollisions != 0) {
            o.oPosX = collisionData.x;
            o.oPosY = collisionData.y;
            o.oPosZ = collisionData.z;
            wall = collisionData.walls[collisionData.numWalls - 1];
            o.oWallAngle = atan2s(wall.nz, wall.nx);
            if (abs_angle_diff(o.oWallAngle, o.oMoveAngleYaw) > 0x4000) {
                return true;
            } else {
                return false;
            }
        }
    }
    return false;
}
function cur_obj_update_floor() {
    const o = W.gCurrentObject;
    let floor = cur_obj_update_floor_height_and_get_floor();
    o.oFloor = floor;
    if (floor != null) {
        if (floor.type == SURFACE_BURNING) {
            o.oMoveFlags |= OBJ_MOVE_ABOVE_LAVA;
        }
        else if (floor.type == SURFACE_DEATH_PLANE) {
            o.oMoveFlags |= OBJ_MOVE_ABOVE_DEATH_BARRIER;
        }
        o.oFloorType = floor.type;
        o.oFloorRoom = floor.room;
    } else {
        o.oFloorType = 0;
        o.oFloorRoom = 0;
    }
}
function cur_obj_update_floor_and_resolve_wall_collisions(steepSlopeDegrees) {
    const o = W.gCurrentObject;
    o.oMoveFlags &= ~(OBJ_MOVE_ABOVE_LAVA | OBJ_MOVE_ABOVE_DEATH_BARRIER);
    if (o.activeFlags & (ACTIVE_FLAG_FAR_AWAY | ACTIVE_FLAG_IN_DIFFERENT_ROOM)) {
        cur_obj_update_floor();
        o.oMoveFlags &= ~(OBJ_MOVE_HIT_WALL | OBJ_MOVE_MASK_IN_WATER);
        if (o.oPosY > o.oFloorHeight) {
            o.oMoveFlags |= OBJ_MOVE_IN_AIR;
        }
    } else {
        o.oMoveFlags &= ~OBJ_MOVE_HIT_WALL;
        if (cur_obj_resolve_wall_collisions()) {
            o.oMoveFlags |= OBJ_MOVE_HIT_WALL;
        }
        cur_obj_update_floor();
        if (o.oPosY > o.oFloorHeight) {
            o.oMoveFlags |= OBJ_MOVE_IN_AIR;
        }
        if (cur_obj_detect_steep_floor(steepSlopeDegrees)) {
            o.oMoveFlags |= OBJ_MOVE_HIT_WALL;
        }
    }
}
function cur_obj_update_floor_and_walls() {
    cur_obj_update_floor_and_resolve_wall_collisions(60);
}
function cur_obj_move_standard(steepSlopeAngleDegrees) {
    const o = W.gCurrentObject;
    let gravity = o.oGravity;
    let bounciness = o.oBounciness;
    let buoyancy = o.oBuoyancy;
    let dragStrength = o.oDragStrength;
    let steepSlopeNormalY = 0;
    let careAboutEdgesAndSteepSlopes = false;
    let negativeSpeed = false;
    if (!(o.activeFlags & (ACTIVE_FLAG_FAR_AWAY | ACTIVE_FLAG_IN_DIFFERENT_ROOM))) {
        if (steepSlopeAngleDegrees < 0) {
            careAboutEdgesAndSteepSlopes = true; steepSlopeAngleDegrees = -steepSlopeAngleDegrees;
        }
        steepSlopeNormalY = coss(steepSlopeAngleDegrees * (0x10000 / 360));
        cur_obj_compute_vel_xz();
        cur_obj_apply_drag_xz(dragStrength);
        cur_obj_move_xz(steepSlopeNormalY, careAboutEdgesAndSteepSlopes);
        cur_obj_move_y(gravity, bounciness, buoyancy);
        if (o.oForwardVel < 0.0) {
            negativeSpeed = true;
        }
        o.oForwardVel = Math.sqrt(sqr(o.oVelX) + sqr(o.oVelZ));
        if (negativeSpeed == true) {
            o.oForwardVel = -o.oForwardVel;
        }
    }
}
function cur_obj_within_12k_bounds() {
    const o = W.gCurrentObject;
    if (o.oPosX < -12000.0 || 12000.0 < o.oPosX) {
        return false;
    }
    if (o.oPosY < -12000.0 || 12000.0 < o.oPosY) {
        return false;
    }
    if (o.oPosZ < -12000.0 || 12000.0 < o.oPosZ) {
        return false;
    }
    return true;
}
function cur_obj_move_using_vel_and_gravity() {
    const o = W.gCurrentObject;
    if (cur_obj_within_12k_bounds()) {
        o.oPosX += o.oVelX;
        o.oPosZ += o.oVelZ;
        o.oVelY += o.oGravity; 
        o.oPosY += o.oVelY;
    }
}
function cur_obj_move_using_fvel_and_gravity() {
    cur_obj_compute_vel_xz();
    cur_obj_move_using_vel_and_gravity(); 
}
function obj_set_pos_relative(obj, other, dleft, dy, dforward) {
    let facingZ = coss(other.oMoveAngleYaw);
    let facingX = sins(other.oMoveAngleYaw);
    let dz = dforward * facingZ - dleft * facingX;
    let dx = dforward * facingX + dleft * facingZ;
    obj.oMoveAngleYaw = other.oMoveAngleYaw;
    obj.oPosX = other.oPosX + dx;
    obj.oPosY = other.oPosY + dy;
    obj.oPosZ = other.oPosZ + dz;
}
function cur_obj_angle_to_home() {
    const o = W.gCurrentObject;
    let angle = 0;
    let dx = o.oHomeX - o.oPosX;
    let dz = o.oHomeZ - o.oPosZ;
    angle = s16(atan2s(dz, dx));
    return angle;
}
function obj_set_gfx_pos_at_obj_pos(obj1, obj2) {
    obj1.gfx.pos[0] = obj2.oPosX;
    obj1.gfx.pos[1] = obj2.oPosY + obj2.oGraphYOffset;
    obj1.gfx.pos[2] = obj2.oPosZ;
    obj1.gfx.angle[0] = s16(obj2.oMoveAnglePitch & 0xFFFF);
    obj1.gfx.angle[1] = s16(obj2.oMoveAngleYaw & 0xFFFF);
    obj1.gfx.angle[2] = s16(obj2.oMoveAngleRoll & 0xFFFF);
}
function obj_translate_local(obj, posIndex, localTranslateIndex) {
    let dx = obj.rawData.asF32[localTranslateIndex + 0];
    let dy = obj.rawData.asF32[localTranslateIndex + 1];
    let dz = obj.rawData.asF32[localTranslateIndex + 2];
    obj.rawData.asF32[posIndex + 0] +=
        obj.transform[0][0] * dx + obj.transform[1][0] * dy + obj.transform[2][0] * dz;
    obj.rawData.asF32[posIndex + 1] +=
        obj.transform[0][1] * dx + obj.transform[1][1] * dy + obj.transform[2][1] * dz;
    obj.rawData.asF32[posIndex + 2] +=
        obj.transform[0][2] * dx + obj.transform[1][2] * dy + obj.transform[2][2] * dz;
}
function obj_build_transform_from_pos_and_angle(obj, posIndex, angleIndex) {
    let translate = new Array(3).fill(0);
    let rotation = new Array(3).fill(0);
    translate[0] = obj.rawData.asF32[posIndex + 0];
    translate[1] = obj.rawData.asF32[posIndex + 1];
    translate[2] = obj.rawData.asF32[posIndex + 2];
    rotation[0] = obj.rawData.asS32[angleIndex + 0];
    rotation[1] = obj.rawData.asS32[angleIndex + 1];
    rotation[2] = obj.rawData.asS32[angleIndex + 2];
    F.mtxf_rotate_zxy_and_translate(obj.transform, translate, rotation);
}
function obj_set_throw_matrix_from_transform(obj) {
    if (obj.oFlags & OBJ_FLAG_0020) {
        obj_build_transform_from_pos_and_angle(obj, O_POS_INDEX, O_FACE_ANGLE_INDEX);
        obj_apply_scale_to_transform(obj);
    }
    obj.gfx.throwMatrix = obj.transform;
    cur_obj_scale(1.0);
}
function obj_build_transform_relative_to_parent(obj) {
    let parent = obj.parentObj;
    obj_build_transform_from_pos_and_angle(obj, O_PARENT_RELATIVE_POS_INDEX, O_FACE_ANGLE_INDEX);
    obj_apply_scale_to_transform(obj);
    F.mtxf_mul(obj.transform, obj.transform, parent.transform);
    obj.oPosX = obj.transform[3][0];
    obj.oPosY = obj.transform[3][1];
    obj.oPosZ = obj.transform[3][2];
    obj.gfx.throwMatrix = obj.transform;
    cur_obj_scale(1.0);
}
function obj_create_transform_from_self(obj) {
    obj.oFlags &= ~OBJ_FLAG_TRANSFORM_RELATIVE_TO_PARENT;
    obj.oFlags |= OBJ_FLAG_SET_THROW_MATRIX_FROM_TRANSFORM;
    obj.transform[3][0] = obj.oPosX;
    obj.transform[3][1] = obj.oPosY;
    obj.transform[3][2] = obj.oPosZ;
}
function cur_obj_rotate_move_angle_using_vel() {
    const o = W.gCurrentObject;
    o.oMoveAnglePitch += o.oAngleVelPitch;
    o.oMoveAngleYaw += o.oAngleVelYaw;
    o.oMoveAngleRoll += o.oAngleVelRoll;
}
function cur_obj_rotate_face_angle_using_vel() {
    const o = W.gCurrentObject;
    o.oFaceAnglePitch += o.oAngleVelPitch;
    o.oFaceAngleYaw += o.oAngleVelYaw;
    o.oFaceAngleRoll += o.oAngleVelRoll;
}
function cur_obj_set_face_angle_to_move_angle() {
    const o = W.gCurrentObject;
    o.oFaceAnglePitch = o.oMoveAnglePitch;
    o.oFaceAngleYaw = o.oMoveAngleYaw;
    o.oFaceAngleRoll = o.oMoveAngleRoll;
}
function cur_obj_follow_path(unusedArg) {
    const o = W.gCurrentObject;
    let startWaypoint = null;
    let lastWaypoint = null;
    let targetWaypoint = null;
    let prevToNextX = 0, prevToNextY = 0, prevToNextZ = 0;
    let filler = new Array(4).fill(0);
    let objToNextXZ = 0;
    let objToNextX = 0, objToNextY = 0, objToNextZ = 0;
    if (o.oPathedPrevWaypointFlags == 0) {
        o.oPathedPrevWaypoint = o.oPathedStartWaypoint;
        o.oPathedPrevWaypointFlags = WAYPOINT_FLAGS_INITIALIZED;
    }
    startWaypoint = o.oPathedStartWaypoint;
    lastWaypoint = o.oPathedPrevWaypoint;
    if ((lastWaypoint + 1).flags != WAYPOINT_FLAGS_END) {
        targetWaypoint = lastWaypoint + 1;
    } else {
        targetWaypoint = startWaypoint;
    }
    o.oPathedPrevWaypointFlags = lastWaypoint.flags | WAYPOINT_FLAGS_INITIALIZED;
    prevToNextX = targetWaypoint.pos[0] - lastWaypoint.pos[0];
    prevToNextY = targetWaypoint.pos[1] - lastWaypoint.pos[1];
    prevToNextZ = targetWaypoint.pos[2] - lastWaypoint.pos[2];
    objToNextX = targetWaypoint.pos[0] - o.oPosX;
    objToNextY = targetWaypoint.pos[1] - o.oPosY;
    objToNextZ = targetWaypoint.pos[2] - o.oPosZ;
    objToNextXZ = Math.sqrt(sqr(objToNextX) + sqr(objToNextZ));
    o.oPathedTargetYaw = atan2s(objToNextZ, objToNextX);
    o.oPathedTargetPitch = atan2s(objToNextXZ, -objToNextY);
    if (prevToNextX * objToNextX + prevToNextY * objToNextY + prevToNextZ * objToNextZ <= 0.0) {
        o.oPathedPrevWaypoint = targetWaypoint;
        if ((targetWaypoint + 1).flags == WAYPOINT_FLAGS_END) {
            return PATH_REACHED_END;
        } else {
            return PATH_REACHED_WAYPOINT;
        }
    }
    return PATH_NONE;
}
function chain_segment_init(segment) {
    segment.posX = 0.0;
    segment.posY = 0.0;
    segment.posZ = 0.0;
    segment.pitch = 0;
    segment.yaw = 0;
    segment.roll = 0;
}
function random_f32_around_zero(diameter) {
    return F.random_float() * diameter - diameter / 2;
}
function obj_scale_random(obj, rangeLength, minScale) {
    let scale = F.random_float() * rangeLength + minScale;
    obj_scale_xyz(obj, scale, scale, scale);
}
function obj_translate_xyz_random(obj, rangeLength) {
    obj.oPosX += F.random_float() * rangeLength - rangeLength * 0.5;
    obj.oPosY += F.random_float() * rangeLength - rangeLength * 0.5;
    obj.oPosZ += F.random_float() * rangeLength - rangeLength * 0.5;
}
function obj_translate_xz_random(obj, rangeLength) {
    obj.oPosX += F.random_float() * rangeLength - rangeLength * 0.5;
    obj.oPosZ += F.random_float() * rangeLength - rangeLength * 0.5;
}
function obj_build_vel_from_transform(obj) {
    let up = obj.oUpVel;
    let left = obj.oLeftVel;
    let forward = obj.oForwardVel;
    obj.oVelX = obj.transform[0][0] * up + obj.transform[1][0] * left + obj.transform[2][0] * forward;
    obj.oVelY = obj.transform[0][1] * up + obj.transform[1][1] * left + obj.transform[2][1] * forward;
    obj.oVelZ = obj.transform[0][2] * up + obj.transform[1][2] * left + obj.transform[2][2] * forward;
}
function cur_obj_set_pos_via_transform() {
    const o = W.gCurrentObject;
    obj_build_transform_from_pos_and_angle(o, O_PARENT_RELATIVE_POS_INDEX, O_MOVE_ANGLE_INDEX);
    obj_build_vel_from_transform(o);
    o.oPosX += o.oVelX;
    o.oPosY += o.oVelY;
    o.oPosZ += o.oVelZ;
}
function cur_obj_reflect_move_angle_off_wall() {
    const o = W.gCurrentObject;
    let angle = s16(o.oWallAngle - (s16(o.oMoveAngleYaw) - s16(o.oWallAngle)) + 0x8000);
    return angle;
}
function cur_obj_spawn_particles(info) {
    const o = W.gCurrentObject;
    let particle = null;
    let i = 0;
    let scale = 0;
    let numParticles = info.count;
    if ((W.gPrevFrameObjectCount > (OBJECT_POOL_CAPACITY - 90)) && numParticles > 10) {
        numParticles = 10;
    }
    if (W.gPrevFrameObjectCount > (OBJECT_POOL_CAPACITY - 30)) {
        numParticles = 0;
    }
    for (i = 0; i < numParticles; i++) {
        scale = F.random_float() * (info.sizeRange * 0.1) + info.sizeBase * 0.1;
        particle = spawn_object(o, info.model,B.bhvWhitePuffExplosion);
        particle.oBhvParams2ndByte = info.bhvParam;
        particle.oMoveAngleYaw = F.random_u16();
        particle.oGravity = info.gravity;
        particle.oDragStrength = info.dragStrength;
        particle.oPosY += info.offsetY;
        particle.oForwardVel = F.random_float() * info.forwardVelRange + info.forwardVelBase;
        particle.oVelY = F.random_float() * info.velYRange + info.velYBase;
        obj_scale_xyz(particle, scale, scale, scale);
    }
}
function obj_set_hitbox(obj, hitbox) {
    if (!(obj.oFlags & OBJ_FLAG_30)) {
        obj.oFlags |= OBJ_FLAG_30;
        obj.oInteractType = hitbox.interactType;
        obj.oDamageOrCoinValue = hitbox.damageOrCoinValue;
        obj.oHealth = hitbox.health;
        obj.oNumLootCoins = hitbox.numLootCoins;
        cur_obj_become_tangible();
    }
    obj.hitboxRadius = obj.gfx.scale[0] * hitbox.radius;
    obj.hitboxHeight = obj.gfx.scale[1] * hitbox.height;
    obj.hurtboxRadius = obj.gfx.scale[0] * hitbox.hurtboxRadius;
    obj.hurtboxHeight = obj.gfx.scale[1] * hitbox.hurtboxHeight;
    obj.hitboxDownOffset = obj.gfx.scale[1] * hitbox.downOffset;
}
function signum_positive(x) {
    if (x >= 0) {
        return 1;
    } else {
        return -1;
    }
}
function abs(x) {
    if (x >= 0) {
        return x;
    } else {
        return -x;
    }
}
function absi(x) {
    if (x >= 0) {
        return x;
    } else {
        return -x;
    }
}
function cur_obj_wait_then_blink(timeUntilBlinking, numBlinks) {
    const o = W.gCurrentObject;
    let done = false;
    let timeBlinking = 0;
    if (o.oTimer >= timeUntilBlinking) {
        if ((timeBlinking = o.oTimer - timeUntilBlinking) % 2 != 0) {
            o.gfx.flags |= GRAPH_RENDER_INVISIBLE;
            if (timeBlinking / 2 > numBlinks) {
                done = true;
            }
        } else {
            o.gfx.flags &= ~GRAPH_RENDER_INVISIBLE;
        }
    }
    return done;
}
function cur_obj_is_mario_ground_pounding_platform() {
    const o = W.gCurrentObject;
    if (W.gMarioObject.platform == o) {
        if (W.gMarioStates[0].action == ACT_GROUND_POUND_LAND) {
            return true;
        }
    }
    return false;
}
function spawn_mist_particles() {
    F.spawn_mist_particles_variable(0, 0, 46.0);
}
function spawn_mist_particles_with_sound(soundMagic) {
    F.spawn_mist_particles_variable(0, 0, 46.0);
    create_sound_spawner(soundMagic);
}
function cur_obj_push_mario_away(radius) {
    const o = W.gCurrentObject;
    let marioRelX = W.gMarioObject.oPosX - o.oPosX;
    let marioRelZ = W.gMarioObject.oPosZ - o.oPosZ;
    let marioDist = Math.sqrt(sqr(marioRelX) + sqr(marioRelZ));
    if (marioDist < radius) {
        W.gMarioStates[0].pos[0] += (radius - marioDist) / radius * marioRelX;
        W.gMarioStates[0].pos[2] += (radius - marioDist) / radius * marioRelZ;
    }
}
function cur_obj_push_mario_away_from_cylinder(radius, extentY) {
    const o = W.gCurrentObject;
    let marioRelY = W.gMarioObject.oPosY - o.oPosY;
    if (marioRelY < 0.0) {
        marioRelY = -marioRelY;
    }
    if (marioRelY < extentY) {
        cur_obj_push_mario_away(radius);
    }
}
function bhv_dust_smoke_loop() {
    const o = W.gCurrentObject;
    o.oPosX += o.oVelX;
    o.oPosY += o.oVelY;
    o.oPosZ += o.oVelZ;
    if (o.oSmokeTimer == 10) {
        obj_mark_for_deletion(o);
    }
    o.oSmokeTimer++;
}
function stub_obj_helpers_2() {
}
function cur_obj_progress_action_table() {
    const o = W.gCurrentObject;
    let nextAction = 0;
    let actionTable = o.oToxBoxActionTable;
    let nextActionIndex = o.oToxBoxActionStep + 1;
    if (actionTable[nextActionIndex] != TOX_BOX_ACT_TABLE_END) {
        nextAction = actionTable[nextActionIndex];
        o.oToxBoxActionStep++;
    } else {
        nextAction = actionTable[0];
        o.oToxBoxActionStep = 0;
    }
    return nextAction;
}
function stub_obj_helpers_3(arg0, arg1) {
}
function cur_obj_scale_over_time(a0, a1, sp10, sp14) {
    const o = W.gCurrentObject;
    let sp4 = sp14 - sp10;
    let sp0 = o.oTimer / a1;
    if (a0 & 0x01) {
        o.gfx.scale[0] = sp4 * sp0 + sp10;
    }
    if (a0 & 0x02) {
        o.gfx.scale[1] = sp4 * sp0 + sp10;
    }
    if (a0 & 0x04) {
        o.gfx.scale[2] = sp4 * sp0 + sp10;
    }
}
function cur_obj_set_pos_to_home_with_debug() {
    const o = W.gCurrentObject;
    o.oPosX = o.oHomeX + W.gDebugInfo[DEBUG_PAGE_ENEMYINFO][0];
    o.oPosY = o.oHomeY + W.gDebugInfo[DEBUG_PAGE_ENEMYINFO][1];
    o.oPosZ = o.oHomeZ + W.gDebugInfo[DEBUG_PAGE_ENEMYINFO][2];
    cur_obj_scale(W.gDebugInfo[DEBUG_PAGE_ENEMYINFO][3] / 100.0 + 1.0);
}
function stub_obj_helpers_4() {
}
function cur_obj_is_mario_on_platform() {
    const o = W.gCurrentObject;
    if (W.gMarioObject.platform == o) {
        return true;
    } else {
        return false;
    }
}
function cur_obj_shake_y_until(cycles, amount) {
    const o = W.gCurrentObject;
    if (o.oTimer % 2 != 0) {
        o.oPosY -= amount;
    } else {
        o.oPosY += amount;
    }
    if (o.oTimer == cycles * 2) {
        return true;
    } else {
        return false;
    }
}
function jiggle_bbh_stair(a0) {
    const o = W.gCurrentObject;
    if (a0 >= 4 || a0 < 0) {
        return true;
    }
    o.oPosY += sBBHStairJiggleOffsets[a0];
    return false;
}
function spawn_star_with_no_lvl_exit(sp20, sp24) {
    const o = W.gCurrentObject;
    let sp1C = spawn_object(o, MODEL_STAR,B.bhvSpawnedStarNoLevelExit);
    sp1C.oSparkleSpawnUnk1B0 = sp24;
    sp1C.oBhvParams = o.oBhvParams;
    sp1C.oBhvParams2ndByte = sp20;
    return sp1C;
}
function spawn_base_star_with_no_lvl_exit() {
    spawn_star_with_no_lvl_exit(0, 0);
}
function bit_shift_left(a0) {
    return sPowersOfTwo[a0];
}
function cur_obj_mario_far_away() {
    const o = W.gCurrentObject;
    let dx = o.oHomeX - W.gMarioObject.oPosX;
    let dy = o.oHomeY - W.gMarioObject.oPosY;
    let dz = o.oHomeZ - W.gMarioObject.oPosZ;
    let marioDistToHome = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (o.oDistanceToMario > 2000.0 && marioDistToHome > 2000.0) {
        return true;
    } else {
        return false;
    }
}
function is_mario_moving_fast_or_in_air(speedThreshold) {
    if (W.gMarioStates[0].forwardVel > speedThreshold) {
        return true;
    }
    if (W.gMarioStates[0].action & ACT_FLAG_AIR) {
        return true;
    } else {
        return false;
    }
}
function stub_obj_helpers_5() {
}
function bhv_init_room() {
    const o = W.gCurrentObject;
    let floor = null;
    let floorHeight = 0;
    if (F.is_item_in_array(W.gCurrLevelNum, sLevelsWithRooms)) {
        floorHeight = F.find_floor(o.oPosX, o.oPosY, o.oPosZ, $ => floor = $);
        if (floor != null) {
            if (floor.room != 0) {
                o.oRoom = floor.room;
            } else {
                F.find_floor(o.oPosX, floorHeight - 100.0, o.oPosZ, $ => floor = $);
                if (floor != null) {
                    o.oRoom = floor.room;
                }
            }
        }
    } else {
        o.oRoom = -1;
    }
}
function cur_obj_enable_rendering_if_mario_in_room() {
    const o = W.gCurrentObject;
    let marioInRoom = 0;
    if (o.oRoom != -1 && W.gMarioCurrentRoom != 0) {
        if (W.gMarioCurrentRoom == o.oRoom) {
            marioInRoom = true;
        } else if (W.gDoorAdjacentRooms[W.gMarioCurrentRoom][0] == o.oRoom) {
            marioInRoom = true;
        } else if (W.gDoorAdjacentRooms[W.gMarioCurrentRoom][1] == o.oRoom) {
            marioInRoom = true;
        } else {
            marioInRoom = false;
        }
        if (marioInRoom) {
            cur_obj_enable_rendering();
            o.activeFlags &= ~ACTIVE_FLAG_IN_DIFFERENT_ROOM;
            W.gNumRoomedObjectsInMarioRoom++;
        } else {
            cur_obj_disable_rendering();
            o.activeFlags |= ACTIVE_FLAG_IN_DIFFERENT_ROOM;
            W.gNumRoomedObjectsNotInMarioRoom++;
        }
    }
}
function cur_obj_set_hitbox_and_die_if_attacked(hitbox, deathSound, noLootCoins) {
    const o = W.gCurrentObject;
    let interacted = false;
    obj_set_hitbox(o, hitbox);
    if (noLootCoins) {
        o.oNumLootCoins = 0;
    }
    if (o.oInteractStatus & INT_STATUS_INTERACTED) {
        if (o.oInteractStatus & INT_STATUS_WAS_ATTACKED) {
            spawn_mist_particles();
            obj_spawn_loot_yellow_coins(o, o.oNumLootCoins, 20.0);
            obj_mark_for_deletion(o);
            create_sound_spawner(deathSound);
        } else {
            let eracted = true;
        }
    }
    o.oInteractStatus = 0;
    return interacted;
}
function obj_explode_and_spawn_coins(mistParticleSize, sp1C) {
    const o = W.gCurrentObject;
    F.spawn_mist_particles_variable(0, 0, mistParticleSize);
    F.spawn_triangle_break_particles(30, MODEL_DIRT_ANIMATION, 3.0, 4);
    obj_mark_for_deletion(o);
    if (sp1C == 1) {
        obj_spawn_loot_yellow_coins(o, o.oNumLootCoins, 20.0);
    } else if (sp1C == 2) {
        obj_spawn_loot_blue_coins(o, o.oNumLootCoins, 20.0, 150);
    }
}
function obj_set_collision_data(obj, segAddr) {
    obj.collisionData = segAddr;
}
function cur_obj_if_hit_wall_bounce_away() {
    const o = W.gCurrentObject;
    if (o.oMoveFlags & OBJ_MOVE_HIT_WALL) {
        o.oMoveAngleYaw = o.oWallAngle;
    }
}
function cur_obj_hide_if_mario_far_away_y(distY) {
    const o = W.gCurrentObject;
    if (Math.abs(o.oPosY - W.gMarioObject.oPosY) < distY) {
        cur_obj_unhide();
        return false;
    } else {
        cur_obj_hide();
        return true;
    }
}
function obj_is_hidden(obj) {
    if (obj.gfx.flags & GRAPH_RENDER_INVISIBLE) {
        return true;
    } else {
        return false;
    }
}
function enable_time_stop() {
    W.gTimeStopState |= TIME_STOP_ENABLED;
}
function disable_time_stop() {
    W.gTimeStopState &= ~TIME_STOP_ENABLED;
}
function set_time_stop_flags(flags) {
    W.gTimeStopState |= flags;
}
function clear_time_stop_flags(flags) {
    W.gTimeStopState = W.gTimeStopState & (flags ^ 0xFFFFFFFF);
}
function cur_obj_can_mario_activate_textbox(radius, height, unused) {
    if (o.oDistanceToMario < 1500.0) {
        let latDistToMario = lateral_dist_between_objects(o, W.gMarioObject);
        let angleFromMario = s16(obj_angle_to_object(W.gMarioObject, o));
        if (latDistToMario < radius && o.oPosY < W.gMarioObject.oPosY + 160.0 && W.gMarioObject.oPosY < o.oPosY + height && !(W.gMarioStates[0].action & ACT_FLAG_AIR) && F.mario_ready_to_speak()) {
            return true;
        }
    }
    return false;
}
function cur_obj_can_mario_activate_textbox_2(radius, height) {
    return cur_obj_can_mario_activate_textbox(radius, height, 0x1000);
}
function cur_obj_end_dialog(dialogFlags, dialogResult) {
    const o = W.gCurrentObject;
    o.oDialogResponse = dialogResult;
    o.oDialogState++;
    if (!(dialogFlags & DIALOG_FLAG_TIME_STOP_ENABLED)) {
        F.set_mario_npc_dialog(MARIO_DIALOG_STOP);
    }
}
function cur_obj_update_dialog(actionArg, dialogFlags, dialogID, unused) {
    const o = W.gCurrentObject;
    let dialogResponse = DIALOG_RESPONSE_NONE;
    let doneTurning = true;
    switch (o.oDialogState) {
        case DIALOG_STATUS_ENABLE_TIME_STOP:
            if (W.gMarioState.health >= 0x100) {
                W.gTimeStopState |= TIME_STOP_ENABLED;
                o.activeFlags |= ACTIVE_FLAG_INITIATED_TIME_STOP;
                o.oDialogState++;
            }
            break;
        case DIALOG_STATUS_INTERRUPT:
            if (F.set_mario_npc_dialog(actionArg) == MARIO_DIALOG_STATUS_SPEAK) {
                o.oDialogState++;
            }
            break;
        case DIALOG_STATUS_START_DIALOG:
            if (dialogFlags & DIALOG_FLAG_TEXT_RESPONSE) {
                F.create_dialog_box_with_response(dialogID);
            } else if (dialogFlags & DIALOG_FLAG_TEXT_DEFAULT) {
                F.create_dialog_box(dialogID);
            }
            o.oDialogState++;
            break;
        case DIALOG_STATUS_STOP_DIALOG:
            if (dialogFlags & DIALOG_FLAG_TEXT_RESPONSE) {
                if (W.gDialogResponse != DIALOG_RESPONSE_NONE) {
                    cur_obj_end_dialog(dialogFlags, W.gDialogResponse);
                }
            } else if (dialogFlags & DIALOG_FLAG_TEXT_DEFAULT) {
                if (F.get_dialog_id() == DIALOG_NONE) {
                    cur_obj_end_dialog(dialogFlags, DIALOG_RESPONSE_NOT_DEFINED);
                }
            } else {
                cur_obj_end_dialog(dialogFlags, DIALOG_RESPONSE_NOT_DEFINED);
            }
            break;
        case DIALOG_STATUS_DISABLE_TIME_STOP:
            if (W.gMarioState.action != ACT_READING_NPC_DIALOG || (dialogFlags & DIALOG_FLAG_TIME_STOP_ENABLED)) {
                W.gTimeStopState &= ~TIME_STOP_ENABLED;
                o.activeFlags &= ~ACTIVE_FLAG_INITIATED_TIME_STOP;
                dialogResponse = o.oDialogResponse;
                o.oDialogState = DIALOG_STATUS_ENABLE_TIME_STOP;
            }
            break;
        default:
            o.oDialogState = DIALOG_STATUS_ENABLE_TIME_STOP;
            break;
    }
    return dialogResponse;
}
function cur_obj_update_dialog_with_cutscene(actionArg, dialogFlags, cutsceneTable, dialogID) {
    const o = W.gCurrentObject;
    let dialogResponse = DIALOG_RESPONSE_NONE;
    let doneTurning = true;
    switch (o.oDialogState) {
        case DIALOG_STATUS_ENABLE_TIME_STOP:
            if (W.gMarioState.health >= 0x0100) {
                W.gTimeStopState |= TIME_STOP_ENABLED;
                o.activeFlags |= ACTIVE_FLAG_INITIATED_TIME_STOP;
                o.oDialogState++;
                o.oDialogResponse = DIALOG_RESPONSE_NONE;
            }
            break;
        case DIALOG_STATUS_INTERRUPT:
            if (dialogFlags & DIALOG_FLAG_TURN_TO_MARIO) {
                doneTurning = cur_obj_rotate_yaw_toward(obj_angle_to_object(o, W.gMarioObject), 0x800);
                if (o.oDialogResponse >= 33) {
                    doneTurning = true;
                }
            }
            if (F.set_mario_npc_dialog(actionArg) == MARIO_DIALOG_STATUS_SPEAK && doneTurning) {
                o.oDialogResponse = 0;
                o.oDialogState++;
            } else {
                o.oDialogResponse++; 
            }
            break;
        case DIALOG_STATUS_START_DIALOG:
            if (cutsceneTable == CUTSCENE_CAP_SWITCH_PRESS) {
                if ((o.oDialogResponse = F.cutscene_object_without_dialog(cutsceneTable, o))) {
                    o.oDialogState++;
                }
            } else {
                if ((o.oDialogResponse = F.cutscene_object_with_dialog(cutsceneTable, o, dialogID))) {
                    o.oDialogState++;
                }
            }
            break;
        case DIALOG_STATUS_STOP_DIALOG:
            if (dialogFlags & DIALOG_FLAG_TIME_STOP_ENABLED) {
                dialogResponse = o.oDialogResponse;
                o.oDialogState = DIALOG_STATUS_ENABLE_TIME_STOP;
            } else if (W.gMarioState.action != ACT_READING_NPC_DIALOG) {
                W.gTimeStopState &= ~TIME_STOP_ENABLED;
                o.activeFlags &= ~ACTIVE_FLAG_INITIATED_TIME_STOP;
                dialogResponse = o.oDialogResponse;
                o.oDialogState = DIALOG_STATUS_ENABLE_TIME_STOP;
            } else {
                F.set_mario_npc_dialog(MARIO_DIALOG_STOP);
            }
            break;
    }
    return dialogResponse;
}
function cur_obj_has_model(modelID) {
    const o = W.gCurrentObject;
    if (o.gfx.sharedChild == W.gLoadedGraphNodes[modelID]) {
        return true;
    } else {
        return false;
    }
}
function cur_obj_align_gfx_with_floor() {
    const o = W.gCurrentObject;
    let floor = null;
    let floorNormal = [0, 0, 0];
    let position = [0, 0, 0];
    position[0] = o.oPosX;
    position[1] = o.oPosY;
    position[2] = o.oPosZ;
    F.find_floor(position[0], position[1], position[2], $ => floor = $);
    if (floor != null) {
        floorNormal[0] = floor.nx;
        floorNormal[1] = floor.ny;
        floorNormal[2] = floor.nz;
        F.mtxf_align_terrain_normal(o.transform, floorNormal, position, o.oFaceAngleYaw);
        o.gfx.throwMatrix = o.transform;
    }
}
function mario_is_within_rectangle(minX, maxX, minZ, maxZ) {
    if (W.gMarioObject.oPosX < minX || maxX < W.gMarioObject.oPosX) {
        return false;
    }
    if (W.gMarioObject.oPosZ < minZ || maxZ < W.gMarioObject.oPosZ) {
        return false;
    }
    return true;
}
function cur_obj_shake_screen(shake) {
    const o = W.gCurrentObject;
    F.set_camera_shake_from_point(shake, o.oPosX, o.oPosY, o.oPosZ);
}
function obj_attack_collided_from_other_object(obj) {
    let numCollidedObjs = 0;
    let other = null;
    let touchedOtherObject = false;
    numCollidedObjs = obj.numCollidedObjs;
    if (numCollidedObjs != 0) {
        other = obj.collidedObjs[0];
        if (other != W.gMarioObject) {
            other.oInteractStatus |= ATTACK_PUNCH | INT_STATUS_WAS_ATTACKED | INT_STATUS_INTERACTED
                                      | INT_STATUS_TOUCHED_BOB_OMB;
            touchedOtherObject = true;
        }
    }
    return touchedOtherObject;
}
function cur_obj_was_attacked_or_ground_pounded() {
    const o = W.gCurrentObject;
    let attacked = false;
    if ((o.oInteractStatus & INT_STATUS_INTERACTED) && (o.oInteractStatus & INT_STATUS_WAS_ATTACKED)) {
        attacked = true;
    }
    if (cur_obj_is_mario_ground_pounding_platform()) {
        attacked = true;
    }
    o.oInteractStatus = 0;
    return attacked;
}
function obj_copy_behavior_params(dst, src) {
    dst.oBhvParams = src.oBhvParams;
    dst.oBhvParams2ndByte = src.oBhvParams2ndByte;
}
function cur_obj_init_animation_and_anim_frame(animIndex, animFrame) {
    const o = W.gCurrentObject;
    F.cur_obj_init_animation_with_sound(animIndex);
    o.gfx.anim.frame = animFrame;
}
function cur_obj_init_animation_and_check_if_near_end(animIndex) {
    F.cur_obj_init_animation_with_sound(animIndex);
    return cur_obj_check_if_near_animation_end();
}
function cur_obj_init_animation_and_extend_if_at_end(animIndex) {
    F.cur_obj_init_animation_with_sound(animIndex);
    cur_obj_extend_animation_if_at_end();
}
function cur_obj_check_grabbed_mario() {
    const o = W.gCurrentObject;
    if (o.oInteractStatus & INT_STATUS_GRABBED_MARIO) {
        o.oKingBobombUnk88 = 1;
        cur_obj_become_intangible();
        return true;
    }
    return false;
}
function player_performed_grab_escape_action() {
    let grabReleaseState = 0;
    let result = false;
    if (W.gPlayer1Controller.stickMag < 30.0) {
        grabReleaseState = 0;
    }
    if (grabReleaseState == 0 && W.gPlayer1Controller.stickMag > 40.0) {
        grabReleaseState = 1;
        result = true;
    }
    if (W.gPlayer1Controller.buttonPressed & A_BUTTON) {
        result = true;
    }
    return result;
}
function cur_obj_unused_play_footstep_sound(animFrame1, animFrame2, sound) {
    if (cur_obj_check_anim_frame(animFrame1) || cur_obj_check_anim_frame(animFrame2)) {
        cur_obj_play_sound_2(sound);
    }
}
function enable_time_stop_including_mario() {
    const o = W.gCurrentObject;
    W.gTimeStopState |= TIME_STOP_ENABLED | TIME_STOP_MARIO_AND_DOORS;
    o.activeFlags |= ACTIVE_FLAG_INITIATED_TIME_STOP;
}
function disable_time_stop_including_mario() {
    const o = W.gCurrentObject;
    W.gTimeStopState &= ~(TIME_STOP_ENABLED | TIME_STOP_MARIO_AND_DOORS);
    o.activeFlags &= ~ACTIVE_FLAG_INITIATED_TIME_STOP;
}
function cur_obj_check_interacted() {
    const o = W.gCurrentObject;
    if (o.oInteractStatus & INT_STATUS_INTERACTED) {
        o.oInteractStatus = 0;
        return true;
    } else {
        return false;
    }
}
function cur_obj_spawn_loot_blue_coin() {
    const o = W.gCurrentObject;
    if (o.oNumLootCoins >= 5) {
        spawn_object(o, MODEL_BLUE_COIN,B.bhvSpawnedBlueCoin);
        o.oNumLootCoins -= 5;
    }
}
function cur_obj_spawn_star_at_y_offset(targetX, targetY, targetZ, offsetY) {
    const o = W.gCurrentObject;
    let objectPosY = o.oPosY;
    o.oPosY += offsetY + W.gDebugInfo[DEBUG_PAGE_ENEMYINFO][0];
    F.spawn_default_star(targetX, targetY, targetZ);
    o.oPosY = objectPosY;
}

Object.assign(F, { obj_update_pos_from_parent_transformation, obj_apply_scale_to_matrix, create_transformation_from_matrices, obj_set_held_state, lateral_dist_between_objects, dist_between_objects, cur_obj_forward_vel_approach_upward, approach_f32_symmetric, approach_s16_symmetric, cur_obj_rotate_yaw_toward, obj_angle_to_object, obj_turn_toward_object, obj_set_parent_relative_pos, obj_set_pos, obj_set_angle, spawn_object_abs_with_rot, spawn_object_rel_with_rot, spawn_obj_with_transform_flags, spawn_water_droplet, spawn_object_at_origin, spawn_object, try_to_spawn_object, spawn_object_with_scale, obj_build_relative_transform, spawn_object_relative, spawn_object_relative_with_scale, cur_obj_move_using_vel, obj_copy_graph_y_offset, obj_copy_pos_and_angle, obj_copy_pos, obj_copy_angle, obj_init_animation, linear_mtxf_mul_vec3f, linear_mtxf_transpose_mul_vec3f, obj_apply_scale_to_transform, obj_copy_scale, obj_scale_xyz, obj_scale, cur_obj_scale, obj_init_animation_with_sound, cur_obj_enable_rendering, cur_obj_disable_rendering_and_become_intangible, cur_obj_disable_rendering, cur_obj_unhide, cur_obj_hide, cur_obj_set_pos_relative, cur_obj_set_pos_relative_to_parent, cur_obj_enable_rendering_2, cur_obj_unused_init_on_floor, obj_set_face_angle_to_move_angle, get_object_list_from_behavior, cur_obj_nearest_object_with_behavior, cur_obj_dist_to_nearest_object_with_behavior, cur_obj_reset_timer_and_subaction, cur_obj_change_action, cur_obj_set_vel_from_mario_vel, cur_obj_reverse_animation, cur_obj_extend_animation_if_at_end, cur_obj_check_if_near_animation_end, cur_obj_check_if_at_animation_end, cur_obj_check_anim_frame, cur_obj_check_anim_frame_in_range, mario_is_in_air_action, mario_is_dive_sliding, cur_obj_set_y_vel_and_animation, cur_obj_unrender_set_action_and_anim, cur_obj_move_after_thrown_or_dropped, cur_obj_get_thrown_or_placed, cur_obj_get_dropped, cur_obj_set_model, mario_set_flag, cur_obj_clear_interact_status_flag, obj_mark_for_deletion, cur_obj_disable, cur_obj_become_intangible, cur_obj_become_tangible, obj_become_tangible, cur_obj_update_floor_height, cur_obj_update_floor_height_and_get_floor, cur_obj_apply_drag_xz, cur_obj_move_xz, cur_obj_move_update_underwater_flags, cur_obj_move_update_ground_air_flags, cur_obj_move_y_and_get_water_level, cur_obj_move_y, stub_obj_helpers_1, cur_obj_unused_resolve_wall_collisions, abs_angle_diff, cur_obj_move_xz_using_fvel_and_yaw, cur_obj_move_y_with_terminal_vel, cur_obj_compute_vel_xz, increment_velocity_toward_range, obj_check_if_collided_with_object, cur_obj_set_behavior, obj_set_behavior, cur_obj_lateral_dist_from_mario_to_home, cur_obj_lateral_dist_to_home, cur_obj_outside_home_square, cur_obj_outside_home_rectangle, cur_obj_set_pos_to_home, cur_obj_set_pos_to_home_and_stop, cur_obj_shake_y, cur_obj_start_cam_event, set_mario_interact_true_if_in_range, obj_set_billboard, cur_obj_set_hitbox_radius_and_height, cur_obj_set_hurtbox_radius_and_height, obj_spawn_loot_coins, obj_spawn_loot_blue_coins, obj_spawn_loot_yellow_coins, cur_obj_spawn_loot_coin_at_mario_pos, cur_obj_abs_y_dist_to_home, cur_obj_advance_looping_anim, cur_obj_detect_steep_floor, cur_obj_resolve_wall_collisions, cur_obj_update_floor, cur_obj_update_floor_and_resolve_wall_collisions, cur_obj_update_floor_and_walls, cur_obj_move_standard, cur_obj_within_12k_bounds, cur_obj_move_using_vel_and_gravity, cur_obj_move_using_fvel_and_gravity, obj_set_pos_relative, cur_obj_angle_to_home, obj_set_gfx_pos_at_obj_pos, obj_translate_local, obj_build_transform_from_pos_and_angle, obj_set_throw_matrix_from_transform, obj_build_transform_relative_to_parent, obj_create_transform_from_self, cur_obj_rotate_move_angle_using_vel, cur_obj_rotate_face_angle_using_vel, cur_obj_set_face_angle_to_move_angle, cur_obj_follow_path, chain_segment_init, random_f32_around_zero, obj_scale_random, obj_translate_xyz_random, obj_translate_xz_random, obj_build_vel_from_transform, cur_obj_set_pos_via_transform, cur_obj_reflect_move_angle_off_wall, cur_obj_spawn_particles, obj_set_hitbox, signum_positive, abs, absi, cur_obj_wait_then_blink, cur_obj_is_mario_ground_pounding_platform, spawn_mist_particles, spawn_mist_particles_with_sound, cur_obj_push_mario_away, cur_obj_push_mario_away_from_cylinder, bhv_dust_smoke_loop, stub_obj_helpers_2, cur_obj_progress_action_table, stub_obj_helpers_3, cur_obj_scale_over_time, cur_obj_set_pos_to_home_with_debug, stub_obj_helpers_4, cur_obj_is_mario_on_platform, cur_obj_shake_y_until, jiggle_bbh_stair, spawn_star_with_no_lvl_exit, spawn_base_star_with_no_lvl_exit, bit_shift_left, cur_obj_mario_far_away, is_mario_moving_fast_or_in_air, stub_obj_helpers_5, bhv_init_room, cur_obj_enable_rendering_if_mario_in_room, cur_obj_set_hitbox_and_die_if_attacked, obj_explode_and_spawn_coins, obj_set_collision_data, cur_obj_if_hit_wall_bounce_away, cur_obj_hide_if_mario_far_away_y, obj_is_hidden, enable_time_stop, disable_time_stop, set_time_stop_flags, clear_time_stop_flags, cur_obj_can_mario_activate_textbox, cur_obj_can_mario_activate_textbox_2, cur_obj_end_dialog, cur_obj_update_dialog, cur_obj_update_dialog_with_cutscene, cur_obj_has_model, cur_obj_align_gfx_with_floor, mario_is_within_rectangle, cur_obj_shake_screen, obj_attack_collided_from_other_object, cur_obj_was_attacked_or_ground_pounded, obj_copy_behavior_params, cur_obj_init_animation_and_anim_frame, cur_obj_init_animation_and_check_if_near_end, cur_obj_init_animation_and_extend_if_at_end, cur_obj_check_grabbed_mario, player_performed_grab_escape_action, cur_obj_unused_play_footstep_sound, enable_time_stop_including_mario, disable_time_stop_including_mario, cur_obj_check_interacted, cur_obj_spawn_loot_blue_coin, cur_obj_spawn_star_at_y_offset });

})(window);

/* how objects move: ported from the Super Mario 64 decompilation (github.com/n64decomp/sm64): src/game/obj_behaviors.c */
(function (root) {
'use strict';
const SM64 = root.SM64, F = SM64.F = SM64.F || {}, W = SM64.W = SM64.W || {}, B = SM64.B = SM64.B || {};
const { s16, s8, sins, coss, atan2s, sqr, approach_f32, approach_s32, max, min, abs, REF, REFA, REFV } = SM64.m;
/*CONSTS*/
const { ACTIVE_FLAG_DEACTIVATED, ACTIVE_FLAG_INITIATED_TIME_STOP, ACTIVE_FLAG_UNK9, AMP_ACT_ATTACK_COOLDOWN, 
  AMP_ACT_IDLE, AMP_BP_ROT_RADIUS_0, AMP_BP_ROT_RADIUS_200, AMP_BP_ROT_RADIUS_300, AMP_BP_ROT_RADIUS_400, 
  BBALL_ACT_INITIALIZE, BBALL_ACT_ROLL, BBALL_BP_STYPE_BOB_LOWER, BBALL_BP_STYPE_BOB_UPPER, BBALL_BP_STYPE_THI_LARGE, 
  BBALL_BP_STYPE_THI_SMALL, BBALL_BP_STYPE_TTM, BOBOMB_ACT_CHASE_MARIO, BOBOMB_ACT_DEATH_PLANE_DEATH, 
  BOBOMB_ACT_EXPLODE, BOBOMB_ACT_LAUNCHED, BOBOMB_ACT_LAVA_DEATH, BOBOMB_ACT_PATROL, BOBOMB_BP_STYPE_GENERIC, 
  BOBOMB_BUDDY_ACT_IDLE, BOBOMB_BUDDY_ACT_TALK, BOBOMB_BUDDY_ACT_TURN_TO_TALK, BOBOMB_BUDDY_BP_STYPE_GENERIC, 
  BOBOMB_BUDDY_CANNON_OPENED, BOBOMB_BUDDY_CANNON_OPENING, BOBOMB_BUDDY_CANNON_STOP_TALKING, 
  BOBOMB_BUDDY_CANNON_UNOPENED, BOBOMB_BUDDY_HAS_TALKED, BOBOMB_BUDDY_ROLE_ADVICE, BOBOMB_BUDDY_ROLE_CANNON, 
  CANNON_TRAP_DOOR_ACT_CAM_ZOOM, CANNON_TRAP_DOOR_ACT_CLOSED, CANNON_TRAP_DOOR_ACT_OPEN, 
  CANNON_TRAP_DOOR_ACT_OPENING, CELEB_STAR_ACT_FACE_CAMERA, CELEB_STAR_ACT_SPIN_AROUND_MARIO, COURSE_BBH, COURSE_BOB, 
  COURSE_JRB, COURSE_NUM_TO_INDEX, COURSE_SL, COURSE_SSL, COURSE_TTM, CUTSCENE_DIALOG, CUTSCENE_PREPARE_CANNON, 
  CUTSCENE_RED_COIN_STAR_SPAWN, CUTSCENE_STAR_SPAWN, DIALOG_004, DIALOG_047, DIALOG_105, DIALOG_106, 
  DIALOG_RESPONSE_NONE, FLOOR_LOWER_LIMIT_MISC, FREE_BBALL_ACT_IDLE, FREE_BBALL_ACT_RESET, FREE_BBALL_ACT_ROLL, 
  GRAPH_RENDER_INVISIBLE, HELD_DROPPED, HELD_FREE, HELD_HELD, HELD_THROWN, HOMING_AMP_ACT_APPEAR, 
  HOMING_AMP_ACT_ATTACK_COOLDOWN, HOMING_AMP_ACT_CHASE, HOMING_AMP_ACT_GIVE_UP, HOMING_AMP_ACT_INACTIVE, 
  INTERACT_CAP, INTERACT_COIN, INTERACT_DAMAGE, INTERACT_GRABBABLE, INTERACT_SHOCK, INTERACT_STAR_OR_KEY, 
  INT_STATUS_HIT_MINE, INT_STATUS_INTERACTED, INT_STATUS_MARIO_DROP_OBJECT, INT_STATUS_MARIO_KNOCKBACK_DMG, 
  INT_STATUS_TOUCHED_BOB_OMB, INT_SUBTYPE_KICKABLE, INT_SUBTYPE_NO_EXIT, INT_SUBTYPE_NPC, MARIO_DIALOG_LOOK_FRONT, 
  MARIO_DIALOG_STATUS_SPEAK, MARIO_DIALOG_STOP, MODEL_1UP, MODEL_BLACK_BOBOMB, MODEL_BOWLING_BALL, 
  MODEL_BOWSER_FLAMES, MODEL_BOWSER_SMOKE, MODEL_BREAKABLE_BOX_SMALL, MODEL_CANNON_BASE, MODEL_DIRT_ANIMATION, 
  MODEL_EXPLOSION, MODEL_IDLE_WATER_WAVE, MODEL_NONE, MODEL_NUMBER, MODEL_SMALL_WATER_SPLASH, MODEL_SMOKE, 
  MODEL_SPARKLES, MODEL_STAR, MODEL_TRANSPARENT_STAR, MODEL_WHITE_PARTICLE_SMALL, MODEL_YELLOW_COIN, 
  MOV_BCOIN_ACT_MOVING, MOV_BCOIN_ACT_STILL, MOV_YCOIN_ACT_BLINKING, MOV_YCOIN_ACT_DEATH_PLANE_DEATH, 
  MOV_YCOIN_ACT_IDLE, MOV_YCOIN_ACT_LAVA_DEATH, OBJ_ACT_DEATH_PLANE_DEATH, OBJ_ACT_LAVA_DEATH, 
  OBJ_FLAG_SET_FACE_YAW_TO_MOVE_YAW, ONE_UP_BP_BEAT_BITDW_BOWSER, ONE_UP_BP_BEAT_BITFS_BOWSER, PATH_REACHED_END, 
  SAVE_FLAG_CAP_ON_GROUND, SAVE_FLAG_CAP_ON_KLEPTO, SAVE_FLAG_CAP_ON_MR_BLIZZARD, SAVE_FLAG_CAP_ON_UKIKI, 
  SAVE_FLAG_HAVE_KEY_1, SAVE_FLAG_HAVE_KEY_2, SAVE_FLAG_UNLOCKED_BASEMENT_DOOR, SAVE_FLAG_UNLOCKED_UPSTAIRS_DOOR, 
  SHAKE_ENV_EXPLOSION, SHAKE_POS_BOWLING_BALL, SHAKE_POS_LARGE, SOUND_ACTION_READ_SIGN, SOUND_AIR_AMP_BUZZ, 
  SOUND_AIR_BOBOMB_LIT_FUSE, SOUND_ENV_SLIDING, SOUND_ENV_STAR, SOUND_ENV_UNKNOWN2, SOUND_GENERAL2_1UP_APPEAR, 
  SOUND_GENERAL2_BOBOMB_EXPLOSION, SOUND_GENERAL_BOWSER_BOMB_EXPLOSION, SOUND_GENERAL_BOX_LANDING_2, 
  SOUND_GENERAL_BREAK_BOX, SOUND_GENERAL_CANNON_UP, SOUND_GENERAL_COIN_DROP, SOUND_GENERAL_COLLECT_1UP, 
  SOUND_GENERAL_QUIET_POUND1_LOWPRIO, SOUND_GENERAL_STAR_APPEARS, SOUND_MENU_COLLECT_RED_COIN, 
  SOUND_MENU_COLLECT_SECRET, SOUND_OBJ_BOBOMB_WALK, SOUND_OBJ_BULLY_EXPLODE_2, SOUND_OBJ_DIVING_INTO_WATER, 
  SURFACE_BURNING, SURFACE_DEATH_PLANE, SURFACE_DEEP_MOVING_QUICKSAND, SURFACE_DEEP_QUICKSAND, 
  SURFACE_INSTANT_MOVING_QUICKSAND, SURFACE_INSTANT_QUICKSAND, SURFACE_MOVING_QUICKSAND, SURFACE_QUICKSAND, 
  SURFACE_SHALLOW_MOVING_QUICKSAND, SURFACE_SHALLOW_QUICKSAND, TIME_STOP_ENABLED, TIME_STOP_MARIO_AND_DOORS, 
  TRAJECTORY_END, TRAJECTORY_POS } = SM64.C;
/*END CONSTS*/

const o = W.gCurrentObject;
const OBJ_COL_FLAG_GROUNDED = (1 << 0);
const OBJ_COL_FLAG_HIT_WALL = (1 << 1);
const OBJ_COL_FLAG_UNDERWATER = (1 << 2);
const OBJ_COL_FLAG_NO_Y_VEL = (1 << 3);
const OBJ_COL_FLAGS_LANDED = (OBJ_COL_FLAG_GROUNDED | OBJ_COL_FLAG_NO_Y_VEL);
let sObjFloor = null;
let sOrientObjWithFloor = true;
let sPrevCheckMarioRoom = 0;
let sYoshiDead = false;
letW.SYM('ccm_seg7_trajectory_snowman') = null;
letW.SYM('inside_castle_seg7_trajectory_mips') = null;
function set_yoshi_as_not_dead() {
    sYoshiDead = false;
}
function absf_2(f) {
    if (f < 0) {
        f *= -1.0;
    }
    return f;
}
function obj_find_wall(objNewX, objY, objNewZ, objVelX, objVelZ) {
    const o = W.gCurrentObject;
    let hitbox = {};
    let wall_nX = 0, wall_nY = 0, wall_nZ = 0, objVelXCopy = 0, objVelZCopy = 0, objYawX = 0, objYawZ = 0;
    hitbox.x = objNewX;
    hitbox.y = objY;
    hitbox.z = objNewZ;
    hitbox.offsetY = o.hitboxHeight / 2;
    hitbox.radius = o.hitboxRadius;
    if (F.find_wall_collisions(hitbox) != 0) {
        o.oPosX = hitbox.x;
        o.oPosY = hitbox.y;
        o.oPosZ = hitbox.z;
        wall_nX = hitbox.walls[0].nx;
        wall_nY = hitbox.walls[0].ny;
        wall_nZ = hitbox.walls[0].nz;
        objVelXCopy = objVelX;
        objVelZCopy = objVelZ;
        F.turn_obj_away_from_surface(objVelXCopy, objVelZCopy, wall_nX, wall_nY, wall_nZ, REFV(() => objYawX, $ => objYawX = $), REFV(() => objYawZ, $ => objYawZ = $));
        o.oMoveAngleYaw = atan2s(objYawZ, objYawX);
        return false;
    }
    return true;
}
function turn_obj_away_from_steep_floor(objFloor, floorY, objVelX, objVelZ) {
    const o = W.gCurrentObject;
    let floor_nX = 0, floor_nY = 0, floor_nZ = 0, objVelXCopy = 0, objVelZCopy = 0, objYawX = 0, objYawZ = 0;
    if (objFloor == null) {
        o.oMoveAngleYaw += 32767.999200000002; 
        return false;
    }
    floor_nX = objFloor.nx;
    floor_nY = objFloor.ny;
    floor_nZ = objFloor.nz;
    if (floor_nY < 0.5 && floorY > o.oPosY) {
        objVelXCopy = objVelX;
        objVelZCopy = objVelZ;
        F.turn_obj_away_from_surface(objVelXCopy, objVelZCopy, floor_nX, floor_nY, floor_nZ, REFV(() => objYawX, $ => objYawX = $), REFV(() => objYawZ, $ => objYawZ = $));
        o.oMoveAngleYaw = atan2s(objYawZ, objYawX);
        return false;
    }
    return true;
}
function calc_new_obj_vel_and_pos_y(objFloor, objFloorY, objVelX, objVelZ) {
    const o = W.gCurrentObject;
    let floor_nX = objFloor.nx;
    let floor_nY = objFloor.ny;
    let floor_nZ = objFloor.nz;
    let objFriction = 0;
    o.oVelY -= o.oGravity;
    if (o.oVelY > 75.0) {
        o.oVelY = 75.0;
    }
    if (o.oVelY < -75.0) {
        o.oVelY = -75.0;
    }
    o.oPosY += o.oVelY;
    if (o.oPosY < objFloorY) {
        o.oPosY = objFloorY;
        if (o.oVelY < -17.5) {
            o.oVelY = -(o.oVelY / 2);
        } else {
            o.oVelY = 0;
        }
    }
    if (Math.trunc(o.oPosY) >= Math.trunc(objFloorY) && Math.trunc(o.oPosY) < Math.trunc(objFloorY) + 37) {
        F.obj_orient_graph(o, floor_nX, floor_nY, floor_nZ);
        objVelX += floor_nX * (floor_nX * floor_nX + floor_nZ * floor_nZ)
                   / (floor_nX * floor_nX + floor_nY * floor_nY + floor_nZ * floor_nZ) * o.oGravity
                   * 2;
        objVelZ += floor_nZ * (floor_nX * floor_nX + floor_nZ * floor_nZ)
                   / (floor_nX * floor_nX + floor_nY * floor_nY + floor_nZ * floor_nZ) * o.oGravity
                   * 2;
        if (objVelX < 0.000001 && objVelX > -0.000001) {
            objVelX = 0;
        }
        if (objVelZ < 0.000001 && objVelZ > -0.000001) {
            objVelZ = 0;
        }
        if (objVelX != 0 || objVelZ != 0) {
            o.oMoveAngleYaw = atan2s(objVelZ, objVelX);
        }
        F.calc_obj_friction(REFV(() => objFriction, $ => objFriction = $), floor_nY);
        o.oForwardVel = Math.sqrt(objVelX * objVelX + objVelZ * objVelZ) * objFriction;
    }
}
function calc_new_obj_vel_and_pos_y_underwater(objFloor, floorY, objVelX, objVelZ, waterY) {
    const o = W.gCurrentObject;
    let floor_nX = objFloor.nx;
    let floor_nY = objFloor.ny;
    let floor_nZ = objFloor.nz;
    let netYAccel = (1.0 - o.oBuoyancy) * (-1.0 * o.oGravity);
    o.oVelY -= netYAccel;
    if (o.oVelY > 75.0) {
        o.oVelY = 75.0;
    }
    if (o.oVelY < -75.0) {
        o.oVelY = -75.0;
    }
    o.oPosY += o.oVelY;
    if (o.oPosY < floorY) {
        o.oPosY = floorY;
        if (o.oVelY < -17.5) {
            o.oVelY = -(o.oVelY / 2);
        } else {
            o.oVelY = 0;
        }
    }
    if (o.oForwardVel > 12.5 && (waterY + 30.0) > o.oPosY && (waterY - 30.0) < o.oPosY) {
        o.oVelY = -o.oVelY;
    }
    if (Math.trunc(o.oPosY) >= Math.trunc(floorY) && Math.trunc(o.oPosY) < Math.trunc(floorY) + 37) {
        F.obj_orient_graph(o, floor_nX, floor_nY, floor_nZ);
        objVelX += floor_nX * (floor_nX * floor_nX + floor_nZ * floor_nZ)
                   / (floor_nX * floor_nX + floor_nY * floor_nY + floor_nZ * floor_nZ) * netYAccel * 2;
        objVelZ += floor_nZ * (floor_nX * floor_nX + floor_nZ * floor_nZ)
                   / (floor_nX * floor_nX + floor_nY * floor_nY + floor_nZ * floor_nZ) * netYAccel * 2;
    }
    if (objVelX < 0.000001 && objVelX > -0.000001) {
        objVelX = 0;
    }
    if (objVelZ < 0.000001 && objVelZ > -0.000001) {
        objVelZ = 0;
    }
    if (o.oVelY < 0.000001 && o.oVelY > -0.000001) {
        o.oVelY = 0;
    }
    if (objVelX != 0 || objVelZ != 0) {
        o.oMoveAngleYaw = atan2s(objVelZ, objVelX);
    }
    o.oForwardVel = Math.sqrt(objVelX * objVelX + objVelZ * objVelZ) * 0.8;
    o.oVelY *= 0.8;
}
function obj_update_pos_vel_xz() {
    const o = W.gCurrentObject;
    let xVel = o.oForwardVel * sins(o.oMoveAngleYaw);
    let zVel = o.oForwardVel * coss(o.oMoveAngleYaw);
    o.oPosX += xVel;
    o.oPosZ += zVel;
}
function obj_splash(waterY, objY) {
    const o = W.gCurrentObject;
    let globalTimer = W.gGlobalTimer;
    if ((waterY + 30) > o.oPosY && o.oPosY > (waterY - 30)) {
        spawn_object(o, MODEL_IDLE_WATER_WAVE,B.bhvObjectWaterWave);
        if (o.oVelY < -20.0) {
            cur_obj_play_sound_2(SOUND_OBJ_DIVING_INTO_WATER);
        }
    }
    if ((objY + 50) < waterY && !(globalTimer & 31)) {
        spawn_object(o, MODEL_WHITE_PARTICLE_SMALL,B.bhvObjectBubble);
    }
}
function object_step() {
    const o = W.gCurrentObject;
    let objX = o.oPosX;
    let objY = o.oPosY;
    let objZ = o.oPosZ;
    let floorY = 0;
    let waterY = FLOOR_LOWER_LIMIT_MISC;
    let objVelX = o.oForwardVel * sins(o.oMoveAngleYaw);
    let objVelZ = o.oForwardVel * coss(o.oMoveAngleYaw);
    let collisionFlags = s16(0);
    if (obj_find_wall(objX + objVelX, objY, objZ + objVelZ, objVelX, objVelZ) == 0) {
        collisionFlags = s16(collisionFlags + (OBJ_COL_FLAG_HIT_WALL));
    }
    floorY = F.find_floor(objX + objVelX, objY, objZ + objVelZ, $ => sObjFloor = $);
    if (turn_obj_away_from_steep_floor(sObjFloor, floorY, objVelX, objVelZ) == 1) {
        waterY = F.find_water_level(objX + objVelX, objZ + objVelZ);
        if (waterY > objY) {
            calc_new_obj_vel_and_pos_y_underwater(sObjFloor, floorY, objVelX, objVelZ, waterY);
            collisionFlags = s16(collisionFlags + (OBJ_COL_FLAG_UNDERWATER));
        } else {
            calc_new_obj_vel_and_pos_y(sObjFloor, floorY, objVelX, objVelZ);
        }
    } else {
        collisionFlags +=
            ((collisionFlags & OBJ_COL_FLAG_HIT_WALL) ^ OBJ_COL_FLAG_HIT_WALL);
    }
    obj_update_pos_vel_xz();
    if (Math.trunc(o.oPosY) == Math.trunc(floorY)) {
        collisionFlags = s16(collisionFlags + (OBJ_COL_FLAG_GROUNDED));
    }
    if (Math.trunc(o.oVelY) == 0) {
        collisionFlags = s16(collisionFlags + (OBJ_COL_FLAG_NO_Y_VEL));
    }
    obj_splash(Math.trunc(waterY), Math.trunc(o.oPosY));
    return collisionFlags;
}
function object_step_without_floor_orient() {
    let collisionFlags = s16(0);
    sOrientObjWithFloor = false;
    collisionFlags = s16(object_step());
    sOrientObjWithFloor = true;
    return collisionFlags;
}
function obj_move_xyz_using_fvel_and_yaw(obj) {
    const o = W.gCurrentObject;
    o.oVelX = obj.oForwardVel * sins(obj.oMoveAngleYaw);
    o.oVelZ = obj.oForwardVel * coss(obj.oMoveAngleYaw);
    obj.oPosX += o.oVelX;
    obj.oPosY += obj.oVelY;
    obj.oPosZ += o.oVelZ;
}
function is_point_within_radius_of_mario(x, y, z, dist) {
    let mGfxX = W.gMarioObject.gfx.pos[0];
    let mGfxY = W.gMarioObject.gfx.pos[1];
    let mGfxZ = W.gMarioObject.gfx.pos[2];
    if ((x - mGfxX) * (x - mGfxX) + (y - mGfxY) * (y - mGfxY) + (z - mGfxZ) * (z - mGfxZ) < (dist * dist)) {
        return true;
    }
    return false;
}
function is_point_close_to_object(obj, x, y, z, dist) {
    let objX = obj.oPosX;
    let objY = obj.oPosY;
    let objZ = obj.oPosZ;
    if ((x - objX) * (x - objX) + (y - objY) * (y - objY) + (z - objZ) * (z - objZ) < (dist * dist)) {
        return true;
    }
    return false;
}
function set_object_visibility(obj, dist) {
    let objX = obj.oPosX;
    let objY = obj.oPosY;
    let objZ = obj.oPosZ;
    if (is_point_within_radius_of_mario(objX, objY, objZ, dist) == true) {
        obj.gfx.flags &= ~GRAPH_RENDER_INVISIBLE;
    } else {
        obj.gfx.flags |= GRAPH_RENDER_INVISIBLE;
    }
}
function obj_return_home_if_safe(obj, homeX, y, homeZ, dist) {
    let homeDistX = homeX - obj.oPosX;
    let homeDistZ = homeZ - obj.oPosZ;
    let angleTowardsHome = s16(atan2s(homeDistZ, homeDistX));
    if (is_point_within_radius_of_mario(homeX, y, homeZ, dist) == true) {
        return true;
    } else {
        obj.oMoveAngleYaw = F.approach_s16_symmetric(obj.oMoveAngleYaw, angleTowardsHome, 320);
    }
    return false;
}
function obj_return_and_displace_home(obj, homeX, homeY, homeZ, baseDisp) {
    let angleToNewHome = 0;
    let homeDistX = 0, homeDistZ = 0;
    if (Math.trunc((F.random_float() * 50.0)) == 0) {
        obj.oHomeX = (baseDisp * 2) * F.random_float() - baseDisp + homeX;
        obj.oHomeZ = (baseDisp * 2) * F.random_float() - baseDisp + homeZ;
    }
    homeDistX = obj.oHomeX - obj.oPosX;
    homeDistZ = obj.oHomeZ - obj.oPosZ;
    angleToNewHome = s16(atan2s(homeDistZ, homeDistX));
    obj.oMoveAngleYaw = F.approach_s16_symmetric(obj.oMoveAngleYaw, angleToNewHome, 320);
}
function obj_check_if_facing_toward_angle(base, goal, range) {
    let dAngle = s16(((goal) & 0xFFFF) - ((base) & 0xFFFF));
    if ((sins(-range) < sins(dAngle)) && (sins(dAngle) < sins(range)) && (coss(dAngle) > 0)) {
        return true;
    }
    return false;
}
function obj_find_wall_displacement(dist, x, y, z, radius) {
    let hitbox = {};
    let filler = new Array(32).fill(0);
    hitbox.x = x;
    hitbox.y = y;
    hitbox.z = z;
    hitbox.offsetY = 10.0;
    hitbox.radius = radius;
    if (F.find_wall_collisions(hitbox) != 0) {
        dist[0] = hitbox.x - x;
        dist[1] = hitbox.y - y;
        dist[2] = hitbox.z - z;
        return true;
    } else {
        return false;
    }
}
function obj_spawn_yellow_coins(obj, nCoins) {
    let coin = null;
    let count = 0;
    for (count = 0; count < nCoins; count++) {
        coin = spawn_object(obj, MODEL_YELLOW_COIN,B.bhvMovingYellowCoin);
        coin.oForwardVel = F.random_float() * 20;
        coin.oVelY = F.random_float() * 40 + 20;
        coin.oMoveAngleYaw = F.random_u16();
    }
}
function obj_flicker_and_disappear(obj, lifeSpan) {
    if (obj.oTimer < lifeSpan) {
        return false;
    }
    if (obj.oTimer < lifeSpan + 40) {
        if (obj.oTimer % 2 != 0) {
            obj.gfx.flags |= GRAPH_RENDER_INVISIBLE;
        } else {
            obj.gfx.flags &= ~GRAPH_RENDER_INVISIBLE;
        }
    } else {
        obj.activeFlags = ACTIVE_FLAG_DEACTIVATED;
        return true;
    }
    return false;
}
function current_mario_room_check(room) {
    let result = 0;
    if (W.gMarioCurrentRoom == 0) {
        if (room == sPrevCheckMarioRoom) {
            return true;
        } else {
            return false;
        }
    } else {
        if (room == W.gMarioCurrentRoom) {
            result = s16(true);
        } else {
            result = s16(false);
        }
        sPrevCheckMarioRoom = W.gMarioCurrentRoom;
    }
    return result;
}
function obj_check_floor_death(collisionFlags, floor) {
    const o = W.gCurrentObject;
    if (floor == null) {
        return;
    }
    if ((collisionFlags & OBJ_COL_FLAG_GROUNDED) == OBJ_COL_FLAG_GROUNDED) {
        switch (floor.type) {
            case SURFACE_BURNING:
                o.oAction = OBJ_ACT_LAVA_DEATH;
                break;
            case SURFACE_DEATH_PLANE:
                o.oAction = OBJ_ACT_DEATH_PLANE_DEATH;
                break;
            default:
                break;
        }
    }
}
function obj_lava_death() {
    const o = W.gCurrentObject;
    let deathSmoke = null;
    if (o.oTimer > 30) {
        o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
        return true;
    } else {
        o.oPosY -= 10.0;
    }
    if ((o.oTimer % 8) == 0) {
        cur_obj_play_sound_2(SOUND_OBJ_BULLY_EXPLODE_2);
        deathSmoke = spawn_object(o, MODEL_SMOKE,B.bhvBobombBullyDeathSmoke);
        deathSmoke.oPosX += F.random_float() * 20.0;
        deathSmoke.oPosY += F.random_float() * 20.0;
        deathSmoke.oPosZ += F.random_float() * 20.0;
        deathSmoke.oForwardVel = F.random_float() * 10.0;
    }
    return false;
}
function spawn_orange_number(bhvParam, relX, relY, relZ) {
    const o = W.gCurrentObject;
    let orangeNumber = null;
    if (bhvParam >= 10) {
        return;
    }
    orangeNumber = spawn_object_relative(bhvParam, relX, relY, relZ, o, MODEL_NUMBER,B.bhvOrangeNumber);
    orangeNumber.oPosY += 25.0;
}
let sDebugSequenceTracker = 0;
let sDebugTimer = 0;
function debug_sequence_tracker(debugInputSequence) {
    if (debugInputSequence[sDebugSequenceTracker] == 0) {
        sDebugSequenceTracker = 0;
        return true;
    }
    if (debugInputSequence[sDebugSequenceTracker] & W.gPlayer3Controller.buttonPressed) {
        sDebugSequenceTracker++;
        sDebugTimer = 0;
    } else if (sDebugTimer == 10 || W.gPlayer3Controller.buttonPressed != 0) {
        sDebugSequenceTracker = 0;
        sDebugTimer = 0;
        return false;
    }
    sDebugTimer++;
    return false;
}
let sMovingYellowCoinHitbox = { interactType: INTERACT_COIN, downOffset: 0, damageOrCoinValue: 1, health: 0, numLootCoins: 0, radius: 100, height: 64, hurtboxRadius: 0, hurtboxHeight: 0 };
let sMovingBlueCoinHitbox = { interactType: INTERACT_COIN, downOffset: 0, damageOrCoinValue: 5, health: 0, numLootCoins: 0, radius: 100, height: 64, hurtboxRadius: 0, hurtboxHeight: 0 };
function moving_coin_flicker() {
    const o = W.gCurrentObject;
    let collisionFlags = 0;
    F.coin_step(REFV(() => collisionFlags, $ => collisionFlags = $));
    obj_flicker_and_disappear(o, 0);
}
function coin_collected() {
    const o = W.gCurrentObject;
    spawn_object(o, MODEL_SPARKLES,B.bhvGoldenCoinSparkles);
    o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
}
function bhv_moving_yellow_coin_init() {
    const o = W.gCurrentObject;
    o.oGravity = 3.0;
    o.oFriction = 1.0;
    o.oBuoyancy = 1.5;
    F.obj_set_hitbox(o, sMovingYellowCoinHitbox);
}
function bhv_moving_yellow_coin_loop() {
    const o = W.gCurrentObject;
    let collisionFlags = 0;
    switch (o.oAction) {
        case MOV_YCOIN_ACT_IDLE:
            F.coin_step(REFV(() => collisionFlags, $ => collisionFlags = $));
            if (o.oTimer < 10) {
                F.cur_obj_become_intangible();
            } else {
                F.cur_obj_become_tangible();
            }
            if (o.oTimer > 300) {
                o.oAction = MOV_YCOIN_ACT_BLINKING;
            }
            break;
        case MOV_YCOIN_ACT_BLINKING:
            moving_coin_flicker();
            break;
        case MOV_YCOIN_ACT_LAVA_DEATH:
            o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
            break;
        case MOV_YCOIN_ACT_DEATH_PLANE_DEATH:
            o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
            break;
    }
    if (o.oInteractStatus & INT_STATUS_INTERACTED) {
        coin_collected();
        o.oInteractStatus = 0;
    }
}
function bhv_moving_blue_coin_init() {
    const o = W.gCurrentObject;
    o.oGravity = 5.0;
    o.oFriction = 1.0;
    o.oBuoyancy = 1.5;
    F.obj_set_hitbox(o, sMovingBlueCoinHitbox);
}
function bhv_moving_blue_coin_loop() {
    const o = W.gCurrentObject;
    let collisionFlags = 0;
    switch (o.oAction) {
        case MOV_BCOIN_ACT_STILL:
            if (is_point_within_radius_of_mario(o.oPosX, o.oPosY, o.oPosZ, 1500)) {
                o.oAction = MOV_BCOIN_ACT_MOVING;
            }
            break;
        case MOV_BCOIN_ACT_MOVING:
            collisionFlags = s16(object_step());
            if (collisionFlags & OBJ_COL_FLAG_GROUNDED) {
                o.oForwardVel += 25.0;
                if (!(collisionFlags & OBJ_COL_FLAG_NO_Y_VEL)) {
                    cur_obj_play_sound_2(SOUND_GENERAL_COIN_DROP);
                }
            } else {
                o.oForwardVel *= 0.98;
            }
            if (o.oForwardVel > 75.0) {
                o.oForwardVel = 75.0;
            }
            obj_flicker_and_disappear(o, 600);
            break;
    }
    if (o.oInteractStatus & INT_STATUS_INTERACTED) {
        coin_collected();
        o.oInteractStatus = 0;
    }
}
function bhv_blue_coin_sliding_jumping_init() {
    const o = W.gCurrentObject;
    o.oGravity = 3.0;
    o.oFriction = 0.98;
    o.oBuoyancy = 1.5;
    F.obj_set_hitbox(o, sMovingBlueCoinHitbox);
}
function blue_coin_sliding_away_from_mario() {
    const o = W.gCurrentObject;
    let collisionFlags = 0;
    o.oForwardVel = 15.0;
    o.oMoveAngleYaw = o.oAngleToMario + 0x8000;
    if (F.coin_step(REFV(() => collisionFlags, $ => collisionFlags = $))) {
        o.oVelY += 18.0;
    }
    if (collisionFlags & OBJ_COL_FLAG_HIT_WALL) {
        o.oAction = 3;
    }
    if (!is_point_within_radius_of_mario(o.oPosX, o.oPosY, o.oPosZ, 1000)) {
        o.oAction = 2;
    }
}
function blue_coin_sliding_slow_down() {
    const o = W.gCurrentObject;
    let collisionFlags = 0;
    F.coin_step(REFV(() => collisionFlags, $ => collisionFlags = $));
    if (is_point_within_radius_of_mario(o.oPosX, o.oPosY, o.oPosZ, 500) == true) {
        o.oAction = 1;
    }
    if (o.oTimer > 150) {
        o.oAction = 3;
    }
}
function bhv_blue_coin_sliding_loop() {
    const o = W.gCurrentObject;
    let collisionFlags = 0;
    switch (o.oAction) {
        case 0:
            if (is_point_within_radius_of_mario(o.oPosX, o.oPosY, o.oPosZ, 500) == true) {
                o.oAction = 1;
            }
            set_object_visibility(o, 3000);
            break;
        case 1:
            blue_coin_sliding_away_from_mario();
            break;
        case 2:
            blue_coin_sliding_slow_down();
            set_object_visibility(o, 3000);
            break;
        case 3:
            F.coin_step(REFV(() => collisionFlags, $ => collisionFlags = $));
            if (o.oTimer > 60) {
                o.oAction = 4;
            }
            break;
        case 4:
            moving_coin_flicker();
            break;
        case 100:
            o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
            break;
        case 101:
            o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
            break;
    }
    if (o.oInteractStatus & INT_STATUS_INTERACTED) {
        coin_collected();
        o.oInteractStatus = 0;
    }
}
function bhv_blue_coin_jumping_loop() {
    const o = W.gCurrentObject;
    let collisionFlags = 0;
    switch (o.oAction) {
        case 0:
            if (o.oTimer == 0) {
                F.cur_obj_become_intangible();
                o.oVelY = 50.0;
            }
            object_step();
            if (o.oTimer == 15) {
                F.cur_obj_become_tangible();
                o.oAction = 1;
            }
            break;
        case 1:
            blue_coin_sliding_away_from_mario();
            break;
        case 2:
            blue_coin_sliding_slow_down();
            set_object_visibility(o, 3000);
            break;
        case 3:
            F.coin_step(REFV(() => collisionFlags, $ => collisionFlags = $));
            if (o.oTimer > 60) {
                o.oAction = 4;
            }
            break;
        case 4:
            moving_coin_flicker();
            break;
    }
    if (o.oInteractStatus & INT_STATUS_INTERACTED) {
        coin_collected();
        o.oInteractStatus = 0;
    }
}
let sBobombHitbox = { interactType: INTERACT_GRABBABLE, downOffset: 0, damageOrCoinValue: 0, health: 0, numLootCoins: 0, radius: 65, height: 113, hurtboxRadius: 0, hurtboxHeight: 0 };
function bhv_bobomb_init() {
    const o = W.gCurrentObject;
    o.oGravity = 2.5;
    o.oFriction = 0.8;
    o.oBuoyancy = 1.3;
    o.oInteractionSubtype = INT_SUBTYPE_KICKABLE;
}
function bobomb_spawn_coin() {
    const o = W.gCurrentObject;
    if (!((o.oBhvParams >> 8) & 0x01)) {
        obj_spawn_yellow_coins(o, 1);
        o.oBhvParams = 0x100;
        F.set_object_respawn_info_bits(o, 1);
    }
}
function bobomb_act_explode() {
    const o = W.gCurrentObject;
    if (o.oTimer < 5) {
        F.cur_obj_scale(1.0 + o.oTimer / 5.0);
    } else {
        let explosion = spawn_object(o, MODEL_EXPLOSION,B.bhvExplosion);
        explosion.oGraphYOffset += 100.0;
        bobomb_spawn_coin();
        create_respawner(MODEL_BLACK_BOBOMB,B.bhvBobomb, 3000);
        o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
    }
}
function bobomb_check_interactions() {
    const o = W.gCurrentObject;
    F.obj_set_hitbox(o, sBobombHitbox);
    if (o.oInteractStatus & INT_STATUS_INTERACTED) {
        if (o.oInteractStatus & INT_STATUS_MARIO_KNOCKBACK_DMG) {
            o.oMoveAngleYaw = W.gMarioObject.gfx.angle[1];
            o.oForwardVel = 25.0;
            o.oVelY = 30.0;
            o.oAction = BOBOMB_ACT_LAUNCHED;
        }
        if (o.oInteractStatus & INT_STATUS_TOUCHED_BOB_OMB) {
            o.oAction = BOBOMB_ACT_EXPLODE;
        }
        o.oInteractStatus = 0;
    }
    if (F.obj_attack_collided_from_other_object(o) == true) {
        o.oAction = BOBOMB_ACT_EXPLODE;
    }
}
function bobomb_act_patrol() {
    const o = W.gCurrentObject;
    let filler = new Array(4).fill(0);
    let animFrame = s16(o.gfx.anim.frame);
    let collisionFlags = 0;
    o.oForwardVel = 5.0;
    collisionFlags = s16(object_step());
    if ((obj_return_home_if_safe(o, o.oHomeX, o.oHomeY, o.oHomeZ, 400) == true) && (obj_check_if_facing_toward_angle(o.oMoveAngleYaw, o.oAngleToMario, 0x2000) == true)) {
        o.oBobombFuseLit = 1;
        o.oAction = BOBOMB_ACT_CHASE_MARIO;
    }
    obj_check_floor_death(collisionFlags, sObjFloor);
}
function bobomb_act_chase_mario() {
    const o = W.gCurrentObject;
    let filler = new Array(4).fill(0);
    let animFrame = s16(++o.gfx.anim.frame);
    let collisionFlags = 0;
    o.oForwardVel = 20.0;
    collisionFlags = s16(object_step());
    if (animFrame == 5 || animFrame == 16) {
        cur_obj_play_sound_2(SOUND_OBJ_BOBOMB_WALK);
    }
    F.obj_turn_toward_object(o, W.gMarioObject, 16, 0x800);
    obj_check_floor_death(collisionFlags, sObjFloor);
}
function bobomb_act_launched() {
    const o = W.gCurrentObject;
    let collisionFlags = s16(0);
    collisionFlags = s16(object_step());
    if ((collisionFlags & OBJ_COL_FLAG_GROUNDED) == OBJ_COL_FLAG_GROUNDED) {
        o.oAction = BOBOMB_ACT_EXPLODE;
    }
}
function generic_bobomb_free_loop() {
    const o = W.gCurrentObject;
    switch (o.oAction) {
        case BOBOMB_ACT_PATROL:
            bobomb_act_patrol();
            break;
        case BOBOMB_ACT_LAUNCHED:
            bobomb_act_launched();
            break;
        case BOBOMB_ACT_CHASE_MARIO:
            bobomb_act_chase_mario();
            break;
        case BOBOMB_ACT_EXPLODE:
            bobomb_act_explode();
            break;
        case BOBOMB_ACT_LAVA_DEATH:
            if (obj_lava_death() == true) {
                create_respawner(MODEL_BLACK_BOBOMB,B.bhvBobomb, 3000);
            }
            break;
        case BOBOMB_ACT_DEATH_PLANE_DEATH:
            o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
            create_respawner(MODEL_BLACK_BOBOMB,B.bhvBobomb, 3000);
            break;
    }
    bobomb_check_interactions();
    if (o.oBobombFuseTimer > 150) {
        o.oAction = 3;
    }
}
function stationary_bobomb_free_loop() {
    const o = W.gCurrentObject;
    switch (o.oAction) {
        case BOBOMB_ACT_LAUNCHED:
            bobomb_act_launched();
            break;
        case BOBOMB_ACT_EXPLODE:
            bobomb_act_explode();
            break;
        case BOBOMB_ACT_LAVA_DEATH:
            if (obj_lava_death() == true) {
                create_respawner(MODEL_BLACK_BOBOMB,B.bhvBobomb, 3000);
            }
            break;
        case BOBOMB_ACT_DEATH_PLANE_DEATH:
            o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
            create_respawner(MODEL_BLACK_BOBOMB,B.bhvBobomb, 3000);
            break;
    }
    bobomb_check_interactions();
    if (o.oBobombFuseTimer > 150) {
        o.oAction = 3;
    }
}
function bobomb_free_loop() {
    const o = W.gCurrentObject;
    if (o.oBhvParams2ndByte == BOBOMB_BP_STYPE_GENERIC) {
        generic_bobomb_free_loop();
    } else {
        stationary_bobomb_free_loop();
    }
}
function bobomb_held_loop() {
    const o = W.gCurrentObject;
    o.gfx.flags |= GRAPH_RENDER_INVISIBLE;
    F.cur_obj_init_animation(1);
    F.cur_obj_set_pos_relative(W.gMarioObject, 0, 60.0, 100.0);
    o.oBobombFuseLit = 1;
    if (o.oBobombFuseTimer > 150) {
        W.gMarioObject.oInteractStatus |= INT_STATUS_MARIO_DROP_OBJECT;
        o.oAction = BOBOMB_ACT_EXPLODE;
    }
}
function bobomb_dropped_loop() {
    const o = W.gCurrentObject;
    F.cur_obj_get_dropped();
    o.gfx.flags &= ~GRAPH_RENDER_INVISIBLE;
    F.cur_obj_init_animation(0);
    o.oHeldState = 0;
    o.oAction = BOBOMB_ACT_PATROL;
}
function bobomb_thrown_loop() {
    const o = W.gCurrentObject;
    F.cur_obj_enable_rendering_2();
    o.gfx.flags &= ~GRAPH_RENDER_INVISIBLE;
    o.oHeldState = 0;
    o.oFlags &= ~OBJ_FLAG_SET_FACE_YAW_TO_MOVE_YAW;
    o.oForwardVel = 25.0;
    o.oVelY = 20.0;
    o.oAction = BOBOMB_ACT_LAUNCHED;
}
function bhv_bobomb_loop() {
    const o = W.gCurrentObject;
    let dustPeriodMinus1 = 0;
    if (is_point_within_radius_of_mario(o.oPosX, o.oPosY, o.oPosZ, 4000)) {
        switch (o.oHeldState) {
            case HELD_FREE:
                bobomb_free_loop();
                break;
            case HELD_HELD:
                bobomb_held_loop();
                break;
            case HELD_THROWN:
                bobomb_thrown_loop();
                break;
            case HELD_DROPPED:
                bobomb_dropped_loop();
                break;
        }
        F.curr_obj_random_blink(REF(o, 'oBobombBlinkTimer'));
        if (o.oBobombFuseLit == 1) {
            if (o.oBobombFuseTimer > 120) {
                dustPeriodMinus1 = 1;
            } else {
                dustPeriodMinus1 = 7;
            }
            if (!(dustPeriodMinus1 & o.oBobombFuseTimer)) {
                spawn_object(o, MODEL_SMOKE,B.bhvBobombFuseSmoke);
            }
            cur_obj_play_sound_1(SOUND_AIR_BOBOMB_LIT_FUSE);
            o.oBobombFuseTimer++;
        }
    }
}
function bhv_bobomb_fuse_smoke_init() {
    const o = W.gCurrentObject;
    o.oPosX += Math.trunc((F.random_float() * 80.0)) - 40;
    o.oPosY += Math.trunc((F.random_float() * 80.0)) + 60;
    o.oPosZ += Math.trunc((F.random_float() * 80.0)) - 40;
    F.cur_obj_scale(1.2);
}
function bhv_bobomb_buddy_init() {
    const o = W.gCurrentObject;
    o.oGravity = 2.5;
    o.oFriction = 0.8;
    o.oBuoyancy = 1.3;
    o.oInteractionSubtype = INT_SUBTYPE_NPC;
}
function bobomb_buddy_act_idle() {
    const o = W.gCurrentObject;
    let filler = new Array(4).fill(0);
    let animFrame = s16(o.gfx.anim.frame);
    let collisionFlags = s16(0);
    o.oBobombBuddyPosXCopy = o.oPosX;
    o.oBobombBuddyPosYCopy = o.oPosY;
    o.oBobombBuddyPosZCopy = o.oPosZ;
    collisionFlags = s16(object_step());
    if (animFrame == 5 || animFrame == 16) {
        cur_obj_play_sound_2(SOUND_OBJ_BOBOMB_WALK);
    }
    if (o.oDistanceToMario < 1000.0) {
        o.oMoveAngleYaw = F.approach_s16_symmetric(o.oMoveAngleYaw, o.oAngleToMario, 0x140);
    }
    if (o.oInteractStatus == INT_STATUS_INTERACTED) {
        o.oAction = BOBOMB_BUDDY_ACT_TURN_TO_TALK;
    }
}
function bobomb_buddy_cannon_dialog(dialogFirstText, dialogSecondText) {
    const o = W.gCurrentObject;
    let cannonClosed = null;
    let buddyText = 0, cutscene = 0;
    switch (o.oBobombBuddyCannonStatus) {
        case BOBOMB_BUDDY_CANNON_UNOPENED:
            buddyText = s16(F.cutscene_object_with_dialog(CUTSCENE_DIALOG, o, dialogFirstText));
            if (buddyText != DIALOG_RESPONSE_NONE) {
                F.save_file_set_cannon_unlocked();
                cannonClosed = F.cur_obj_nearest_object_with_behavior(B.bhvCannonClosed);
                if (cannonClosed != null) {
                    o.oBobombBuddyCannonStatus = BOBOMB_BUDDY_CANNON_OPENING;
                } else {
                    o.oBobombBuddyCannonStatus = BOBOMB_BUDDY_CANNON_STOP_TALKING;
                }
            }
            break;
        case BOBOMB_BUDDY_CANNON_OPENING:
            cannonClosed = F.cur_obj_nearest_object_with_behavior(B.bhvCannonClosed);
            cutscene = s16(F.cutscene_object(CUTSCENE_PREPARE_CANNON, cannonClosed));
            if (cutscene == -1) {
                o.oBobombBuddyCannonStatus = BOBOMB_BUDDY_CANNON_OPENED;
            }
            break;
        case BOBOMB_BUDDY_CANNON_OPENED:
            buddyText = s16(F.cutscene_object_with_dialog(CUTSCENE_DIALOG, o, dialogSecondText));
            if (buddyText != DIALOG_RESPONSE_NONE) {
                o.oBobombBuddyCannonStatus = BOBOMB_BUDDY_CANNON_STOP_TALKING;
            }
            break;
        case BOBOMB_BUDDY_CANNON_STOP_TALKING:
            F.set_mario_npc_dialog(MARIO_DIALOG_STOP);
            o.activeFlags &= ~ACTIVE_FLAG_INITIATED_TIME_STOP;
            o.oBobombBuddyHasTalkedToMario = BOBOMB_BUDDY_HAS_TALKED;
            o.oInteractStatus = 0;
            o.oAction = BOBOMB_BUDDY_ACT_IDLE;
            o.oBobombBuddyCannonStatus = BOBOMB_BUDDY_CANNON_OPENED;
            break;
    }
}
function bobomb_buddy_act_talk() {
    const o = W.gCurrentObject;
    if (F.set_mario_npc_dialog(MARIO_DIALOG_LOOK_FRONT) == MARIO_DIALOG_STATUS_SPEAK) {
        o.activeFlags |= ACTIVE_FLAG_INITIATED_TIME_STOP;
        switch (o.oBobombBuddyRole) {
            case BOBOMB_BUDDY_ROLE_ADVICE:
                if (F.cutscene_object_with_dialog(CUTSCENE_DIALOG, o, o.oBhvParams2ndByte) != BOBOMB_BUDDY_BP_STYPE_GENERIC) {
                    F.set_mario_npc_dialog(MARIO_DIALOG_STOP);
                    o.activeFlags &= ~ACTIVE_FLAG_INITIATED_TIME_STOP;
                    o.oBobombBuddyHasTalkedToMario = BOBOMB_BUDDY_HAS_TALKED;
                    o.oInteractStatus = 0;
                    o.oAction = BOBOMB_BUDDY_ACT_IDLE;
                }
                break;
            case BOBOMB_BUDDY_ROLE_CANNON:
                if (W.gCurrCourseNum == COURSE_BOB) {
                    bobomb_buddy_cannon_dialog(DIALOG_004, DIALOG_105);
                } else {
                    bobomb_buddy_cannon_dialog(DIALOG_047, DIALOG_106);
                }
                break;
        }
    }
}
function bobomb_buddy_act_turn_to_talk() {
    const o = W.gCurrentObject;
    let animFrame = s16(o.gfx.anim.frame);
    if (animFrame == 5 || animFrame == 16) {
        cur_obj_play_sound_2(SOUND_OBJ_BOBOMB_WALK);
    }
    o.oMoveAngleYaw = F.approach_s16_symmetric(o.oMoveAngleYaw, o.oAngleToMario, 0x1000);
    if (s16(o.oMoveAngleYaw) == s16(o.oAngleToMario)) {
        o.oAction = BOBOMB_BUDDY_ACT_TALK;
    }
    cur_obj_play_sound_2(SOUND_ACTION_READ_SIGN);
}
function bobomb_buddy_actions() {
    const o = W.gCurrentObject;
    switch (o.oAction) {
        case BOBOMB_BUDDY_ACT_IDLE:
            bobomb_buddy_act_idle();
            break;
        case BOBOMB_BUDDY_ACT_TURN_TO_TALK:
            bobomb_buddy_act_turn_to_talk();
            break;
        case BOBOMB_BUDDY_ACT_TALK:
            bobomb_buddy_act_talk();
            break;
    }
    set_object_visibility(o, 3000);
}
function bhv_bobomb_buddy_loop() {
    const o = W.gCurrentObject;
    bobomb_buddy_actions();
    F.curr_obj_random_blink(REF(o, 'oBobombBuddyBlinkTimer'));
    o.oInteractStatus = 0;
}
function bhv_cannon_closed_init() {
    const o = W.gCurrentObject;
    if (F.save_file_is_cannon_unlocked() == true) {
        let cannon = spawn_object(o, MODEL_CANNON_BASE,B.bhvCannon);
        cannon.oBhvParams2ndByte = o.oBhvParams2ndByte;
        cannon.oPosX = o.oHomeX;
        cannon.oPosY = o.oHomeY;
        cannon.oPosZ = o.oHomeZ;
        o.oAction = CANNON_TRAP_DOOR_ACT_OPEN;
        o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
    }
}
function cannon_door_act_opening() {
    const o = W.gCurrentObject;
    if (o.oTimer == 0) {
        cur_obj_play_sound_2(SOUND_GENERAL_CANNON_UP);
    }
    if (o.oTimer < 30) {
        o.oVelY = -0.5;
        o.oPosY += o.oVelY;
        o.oVelX = 0.0;
    } else {
        if (o.oTimer == 80) {
            bhv_cannon_closed_init();
            return;
        }
        o.oVelX = 4.0;
        o.oVelY = 0.0;
        o.oPosX += o.oVelX;
    }
}
function bhv_cannon_closed_loop() {
    const o = W.gCurrentObject;
    switch (o.oAction) {
        case CANNON_TRAP_DOOR_ACT_CLOSED:
            o.oVelX = 0.0;
            o.oVelY = 0.0;
            o.oDrawingDistance = 4000.0;
            if (F.save_file_is_cannon_unlocked() == true) {
                o.oAction = CANNON_TRAP_DOOR_ACT_CAM_ZOOM;
            }
            break;
        case CANNON_TRAP_DOOR_ACT_CAM_ZOOM:
            if (o.oTimer == 60) {
                o.oAction = CANNON_TRAP_DOOR_ACT_OPENING;
            }
            o.oDrawingDistance = 20000.0;
            break;
        case CANNON_TRAP_DOOR_ACT_OPENING:
            cannon_door_act_opening();
            break;
    }
}
let sAmpHitbox = { interactType: INTERACT_SHOCK, downOffset: 40, damageOrCoinValue: 1, health: 0, numLootCoins: 0, radius: 40, height: 50, hurtboxRadius: 50, hurtboxHeight: 60 };
function bhv_homing_amp_init() {
    const o = W.gCurrentObject;
    o.oHomeX = o.oPosX;
    o.oHomeY = o.oPosY;
    o.oHomeZ = o.oPosZ;
    o.oGravity = 0.0;
    o.oFriction = 1.0;
    o.oBuoyancy = 1.0;
    o.oHomingAmpAvgY = o.oHomeY;
    F.cur_obj_scale(0.1);
    o.gfx.flags |= GRAPH_RENDER_INVISIBLE;
}
function check_amp_attack() {
    const o = W.gCurrentObject;
    F.obj_set_hitbox(o, sAmpHitbox);
    if (o.oInteractStatus & INT_STATUS_INTERACTED) {
        if (o.oInteractStatus & INT_STATUS_INTERACTED) {
            o.oAction = AMP_ACT_ATTACK_COOLDOWN;
        }
        o.oInteractStatus = 0;
    }
}
function homing_amp_appear_loop() {
    const o = W.gCurrentObject;
    let relativeTargetX = W.gLakituState.goalPos[0] - o.oPosX;
    let relativeTargetZ = W.gLakituState.goalPos[2] - o.oPosZ;
    let targetYaw = s16(atan2s(relativeTargetZ, relativeTargetX));
    o.oMoveAngleYaw = F.approach_s16_symmetric(o.oMoveAngleYaw, targetYaw, 0x1000);
    if (o.oTimer < 30) {
        F.cur_obj_scale(0.1 + 0.9 * (o.oTimer / 30.0));
    } else {
        o.oAnimState = 1;
    }
    if (o.oTimer > 90) {
        F.cur_obj_scale(1.0);
        o.oAction = HOMING_AMP_ACT_CHASE;
        o.oAmpYPhase = 0;
    }
}
function homing_amp_chase_loop() {
    const o = W.gCurrentObject;
    if ((o.oAngleToMario - 0x400 < o.oMoveAngleYaw) && (o.oMoveAngleYaw < o.oAngleToMario + 0x400)) {
        o.oHomingAmpLockedOn = true;
        o.oTimer = 0;
    }
    if (o.oHomingAmpLockedOn == true) {
        o.oForwardVel = 15.0;
        if (o.oHomingAmpAvgY > W.gMarioObject.gfx.pos[1] + 150.0) {
            o.oHomingAmpAvgY -= 10.0;
        } else {
            o.oHomingAmpAvgY = W.gMarioObject.gfx.pos[1] + 150.0;
        }
        if (o.oTimer > 30) {
            o.oHomingAmpLockedOn = false;
        }
    } else {
        o.oForwardVel = 10.0;
        F.obj_turn_toward_object(o, W.gMarioObject, 16, 0x400);
        if (o.oHomingAmpAvgY < W.gMarioObject.gfx.pos[1] + 250.0) {
            o.oHomingAmpAvgY += 10.0;
        }
    }
    o.oPosY = o.oHomingAmpAvgY + sins(o.oAmpYPhase * 0x400) * 20.0;
    check_amp_attack();
    if (!is_point_within_radius_of_mario(o.oHomeX, o.oHomeY, o.oHomeZ, 1500)) {
        o.oAction = HOMING_AMP_ACT_GIVE_UP;
    }
}
function homing_amp_give_up_loop() {
    const o = W.gCurrentObject;
    let filler = new Array(8).fill(0);
    o.oForwardVel = 15.0;
    if (o.oTimer > 150) {
        o.oPosX = o.oHomeX;
        o.oPosY = o.oHomeY;
        o.oPosZ = o.oHomeZ;
        o.gfx.flags |= GRAPH_RENDER_INVISIBLE;
        o.oAction = HOMING_AMP_ACT_INACTIVE;
        o.oAnimState = 0;
        o.oForwardVel = 0.0;
        o.oHomingAmpAvgY = o.oHomeY;
    }
}
function amp_attack_cooldown_loop() {
    const o = W.gCurrentObject;
    o.gfx.anim.frame += 2;
    o.oForwardVel = 0.0;
    F.cur_obj_become_intangible();
    if (o.oTimer > 30) {
        o.oAnimState = 0;
    }
    if (o.oTimer > 90) {
        o.oAnimState = 1;
        F.cur_obj_become_tangible();
        o.oAction = HOMING_AMP_ACT_CHASE;
    }
}
function bhv_homing_amp_loop() {
    const o = W.gCurrentObject;
    switch (o.oAction) {
        case HOMING_AMP_ACT_INACTIVE:
            if (is_point_within_radius_of_mario(o.oHomeX, o.oHomeY, o.oHomeZ, 800) == true) {
                o.oAction = HOMING_AMP_ACT_APPEAR;
                o.gfx.flags &= ~GRAPH_RENDER_INVISIBLE;
            }
            break;
        case HOMING_AMP_ACT_APPEAR:
            homing_amp_appear_loop();
            break;
        case HOMING_AMP_ACT_CHASE:
            homing_amp_chase_loop();
            cur_obj_play_sound_1(SOUND_AIR_AMP_BUZZ);
            break;
        case HOMING_AMP_ACT_GIVE_UP:
            homing_amp_give_up_loop();
            break;
        case HOMING_AMP_ACT_ATTACK_COOLDOWN:
            amp_attack_cooldown_loop();
            break;
    }
    object_step();
    o.oAmpYPhase++;
}
function bhv_circling_amp_init() {
    const o = W.gCurrentObject;
    o.oHomeX = o.oPosX;
    o.oHomeY = o.oPosY;
    o.oHomeZ = o.oPosZ;
    o.oAnimState = 1;
    switch (o.oBhvParams2ndByte) {
        case AMP_BP_ROT_RADIUS_200:
            o.oAmpRadiusOfRotation = 200.0;
            break;
        case AMP_BP_ROT_RADIUS_300:
            o.oAmpRadiusOfRotation = 300.0;
            break;
        case AMP_BP_ROT_RADIUS_400:
            o.oAmpRadiusOfRotation = 400.0;
            break;
        case AMP_BP_ROT_RADIUS_0:
            break;
    }
    o.oMoveAngleYaw = F.random_u16();
    o.oAction = AMP_ACT_IDLE;
}
function fixed_circling_amp_idle_loop() {
    const o = W.gCurrentObject;
    let xToMario = W.gMarioObject.gfx.pos[0] - o.oPosX;
    let yToMario = W.gMarioObject.gfx.pos[1] + 120.0 - o.oPosY;
    let zToMario = W.gMarioObject.gfx.pos[2] - o.oPosZ;
    let vAngleToMario = s16(atan2s(Math.sqrt(xToMario * xToMario + zToMario * zToMario), -yToMario));
    F.obj_turn_toward_object(o, W.gMarioObject, 19, 0x1000);
    o.oFaceAnglePitch = F.approach_s16_symmetric(o.oFaceAnglePitch, vAngleToMario, 0x1000);
    o.oPosY = o.oHomeY + coss(o.oAmpYPhase * 0x458) * 20.0;
    check_amp_attack();
    o.oAmpYPhase++;
}
function circling_amp_idle_loop() {
    const o = W.gCurrentObject;
    o.oPosX = o.oHomeX + sins(o.oMoveAngleYaw) * o.oAmpRadiusOfRotation;
    o.oPosZ = o.oHomeZ + coss(o.oMoveAngleYaw) * o.oAmpRadiusOfRotation;
    o.oPosY = o.oHomeY + coss(o.oAmpYPhase * 0x8B0) * 30.0;
    o.oMoveAngleYaw += 0x400;
    o.oFaceAngleYaw = o.oMoveAngleYaw + 0x4000;
    check_amp_attack();
    o.oAmpYPhase++;
    cur_obj_play_sound_1(SOUND_AIR_AMP_BUZZ);
}
function bhv_circling_amp_loop() {
    const o = W.gCurrentObject;
    switch (o.oAction) {
        case AMP_ACT_IDLE:
            if (o.oBhvParams2ndByte == AMP_BP_ROT_RADIUS_0) {
                fixed_circling_amp_idle_loop();
            } else {
                circling_amp_idle_loop();
            }
            break;
        case AMP_ACT_ATTACK_COOLDOWN:
            amp_attack_cooldown_loop();
            break;
    }
}
function bhv_explosion_init() {
    const o = W.gCurrentObject;
    create_sound_spawner(SOUND_GENERAL2_BOBOMB_EXPLOSION);
    F.set_environmental_camera_shake(SHAKE_ENV_EXPLOSION);
    o.oOpacity = 255;
}
function bhv_explosion_loop() {
    const o = W.gCurrentObject;
    let i = 0;
    if (o.oTimer == 9) {
        if (F.find_water_level(o.oPosX, o.oPosZ) > o.oPosY) {
            for (i = 0; i < 40; i++) {
                spawn_object(o, MODEL_WHITE_PARTICLE_SMALL,B.bhvBobombExplosionBubble);
            }
        } else {
            spawn_object(o, MODEL_SMOKE,B.bhvBobombBullyDeathSmoke);
        }
        o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
    }
    o.oOpacity -= 14;
    F.cur_obj_scale(o.oTimer / 9.0 + 1.0);
}
function bhv_bobomb_bully_death_smoke_init() {
    const o = W.gCurrentObject;
    o.oPosY -= 300.0;
    F.cur_obj_scale(10.0);
}
function bhv_bobomb_explosion_bubble_init() {
    const o = W.gCurrentObject;
    F.obj_scale_xyz(o, 2.0, 2.0, 1.0);
    o.oBobombExpBubGfxExpRateX = Math.trunc((F.random_float() * 2048.0)) + 0x800;
    o.oBobombExpBubGfxExpRateY = Math.trunc((F.random_float() * 2048.0)) + 0x800;
    o.oTimer = F.random_float() * 10.0;
    o.oVelY = Math.trunc((F.random_float() * 4.0)) + 4;
}
function bhv_bobomb_explosion_bubble_loop() {
    const o = W.gCurrentObject;
    let waterY = W.gMarioStates[0].waterLevel;
    o.gfx.scale[0] = sins(o.oBobombExpBubGfxScaleFacX) * 0.5 + 2.0;
    o.oBobombExpBubGfxScaleFacX += o.oBobombExpBubGfxExpRateX;
    o.gfx.scale[1] = sins(o.oBobombExpBubGfxScaleFacY) * 0.5 + 2.0;
    o.oBobombExpBubGfxScaleFacY += o.oBobombExpBubGfxExpRateY;
    if (o.oPosY > waterY) {
        o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
        o.oPosY += 5.0;
        spawn_object(o, MODEL_SMALL_WATER_SPLASH,B.bhvObjectWaterSplash);
    }
    if (o.oTimer > 60) {
        o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
    }
    o.oPosY += o.oVelY;
    o.oTimer++;
}
function bhv_respawner_loop() {
    if (!is_point_within_radius_of_mario(o.oPosX, o.oPosY, o.oPosZ, o.oRespawnerMinSpawnDist)) {
        let spawnedObject = spawn_object(o, o.oRespawnerModelToRespawn, o.oRespawnerBehaviorToRespawn);
        spawnedObject.oBhvParams = o.oBhvParams;
        o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
    }
}
function create_respawner(model, behToSpawn, minSpawnDist) {
    let respawner = spawn_object_abs_with_rot(o, 0, MODEL_NONE,B.bhvRespawner, o.oHomeX, o.oHomeY, o.oHomeZ, 0, 0, 0);
    respawner.oBhvParams = o.oBhvParams;
    respawner.oRespawnerModelToRespawn = model;
    respawner.oRespawnerMinSpawnDist = minSpawnDist;
    respawner.oRespawnerBehaviorToRespawn = behToSpawn;
}
function bhv_bowser_bomb_loop() {
    const o = W.gCurrentObject;
    if (F.obj_check_if_collided_with_object(o, W.gMarioObject) == true) {
        o.oInteractStatus &= ~INT_STATUS_INTERACTED;
        spawn_object(o, MODEL_EXPLOSION,B.bhvExplosion);
        o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
    }
    if (o.oInteractStatus & INT_STATUS_HIT_MINE) {
        spawn_object(o, MODEL_BOWSER_FLAMES,B.bhvBowserBombExplosion);
        create_sound_spawner(SOUND_GENERAL_BOWSER_BOMB_EXPLOSION);
        F.set_camera_shake_from_point(SHAKE_POS_LARGE, o.oPosX, o.oPosY, o.oPosZ);
        o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
    }
    set_object_visibility(o, 7000);
}
function bhv_bowser_bomb_explosion_loop() {
    const o = W.gCurrentObject;
    F.cur_obj_scale(o.oTimer / 14.0 * 9.0 + 1.0);
    if ((o.oTimer % 4 == 0) && (o.oTimer < 20)) {
        let mineSmoke = spawn_object(o, MODEL_BOWSER_SMOKE,B.bhvBowserBombSmoke);
        mineSmoke.oPosX += F.random_float() * 600.0 - 400.0;
        mineSmoke.oPosZ += F.random_float() * 600.0 - 400.0;
        mineSmoke.oVelY += F.random_float() * 10.0;
    }
    if (o.oTimer % 2 == 0) {
        o.oAnimState++;
    }
    if (o.oTimer == 28) {
        o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
    }
}
function bhv_bowser_bomb_smoke_loop() {
    const o = W.gCurrentObject;
    F.cur_obj_scale(o.oTimer / 14.0 * 9.0 + 1.0);
    if (o.oTimer % 2 == 0) {
        o.oAnimState++;
    }
    o.oOpacity -= 10;
    if (o.oOpacity < 10) {
        o.oOpacity = 0;
    }
    o.oPosY += o.oVelY;
    if (o.oTimer == 28) {
        o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
    }
}
function bhv_celebration_star_init() {
    const o = W.gCurrentObject;
    o.oHomeX = W.gMarioObject.gfx.pos[0];
    o.oPosY = W.gMarioObject.gfx.pos[1] + 30.0;
    o.oHomeZ = W.gMarioObject.gfx.pos[2];
    o.oMoveAngleYaw = W.gMarioObject.gfx.angle[1] + 0x8000;
    o.oCelebStarDiameterOfRotation = 100;
    o.gfx.sharedChild = W.gLoadedGraphNodes[MODEL_STAR];
    F.cur_obj_scale(0.4);
    o.oFaceAnglePitch = 0;
    o.oFaceAngleRoll = 0;
}
function celeb_star_act_spin_around_mario() {
    const o = W.gCurrentObject;
    o.oPosX = o.oHomeX + sins(o.oMoveAngleYaw) * (o.oCelebStarDiameterOfRotation / 2);
    o.oPosZ = o.oHomeZ + coss(o.oMoveAngleYaw) * (o.oCelebStarDiameterOfRotation / 2);
    o.oPosY += 5.0;
    o.oFaceAngleYaw += 0x1000;
    o.oMoveAngleYaw += 0x2000;
    if (o.oTimer == 40) {
        o.oAction = CELEB_STAR_ACT_FACE_CAMERA;
    }
    if (o.oTimer < 35) {
        spawn_object(o, MODEL_SPARKLES,B.bhvCelebrationStarSparkle);
        o.oCelebStarDiameterOfRotation++;
    } else {
        o.oCelebStarDiameterOfRotation -= 20;
    }
}
function celeb_star_act_face_camera() {
    const o = W.gCurrentObject;
    if (o.oTimer < 10) {
        F.cur_obj_scale(o.oTimer / 10.0);
        o.oFaceAngleYaw += 0x1000;
    } else {
        o.oFaceAngleYaw = W.gMarioObject.gfx.angle[1];
    }
    if (o.oTimer == 59) {
        o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
    }
}
function bhv_celebration_star_loop() {
    const o = W.gCurrentObject;
    switch (o.oAction) {
        case CELEB_STAR_ACT_SPIN_AROUND_MARIO:
            celeb_star_act_spin_around_mario();
            break;
        case CELEB_STAR_ACT_FACE_CAMERA:
            celeb_star_act_face_camera();
            break;
    }
}
function bhv_celebration_star_sparkle_loop() {
    const o = W.gCurrentObject;
    o.oPosY -= 15.0;
    if (o.oTimer == 12) {
        o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
    }
}
function bhv_star_key_collection_puff_spawner_loop() {
    const o = W.gCurrentObject;
    F.spawn_mist_particles_variable(0, 10, 30.0);
    o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
}
let sBowlingBallHitbox = { interactType: INTERACT_DAMAGE, downOffset: 0, damageOrCoinValue: 2, health: 0, numLootCoins: 0, radius: 100, height: 150, hurtboxRadius: 0, hurtboxHeight: 0 };
let sTHIHugeMetalBallTraj = [TRAJECTORY_POS(0,  -4786,   101, -2166), TRAJECTORY_POS(1,  -5000,    81, -2753), TRAJECTORY_POS(2,  -5040,    33, -3846), TRAJECTORY_POS(3,  -4966,    38, -4966), TRAJECTORY_POS(4,  -4013,  -259, -4893), TRAJECTORY_POS(5,  -2573, -1019, -4780), TRAJECTORY_POS(6,  -1053, -1399, -4806), TRAJECTORY_POS(7,    760, -1637, -4833), TRAJECTORY_POS(8,   2866, -2047, -4886), TRAJECTORY_POS(9,   3386, -6546, -4833), TRAJECTORY_END()];
let sTHITinyMetalBallTraj = [TRAJECTORY_POS(0,  -1476,    29,  -680), TRAJECTORY_POS(1,  -1492,    14, -1072), TRAJECTORY_POS(2,  -1500,     3, -1331), TRAJECTORY_POS(3,  -1374,   -17, -1527), TRAJECTORY_POS(4,  -1178,   -83, -1496), TRAJECTORY_POS(5,   -292,  -424, -1425), TRAJECTORY_POS(6,    250,  -491, -1433), TRAJECTORY_POS(7,    862,  -613, -1449), TRAJECTORY_POS(8,   1058, -1960, -1449), TRAJECTORY_END()];
function bhv_bowling_ball_init() {
    const o = W.gCurrentObject;
    o.oGravity = 5.5;
    o.oFriction = 1.0;
    o.oBuoyancy = 2.0;
}
function bowling_ball_set_hitbox() {
    const o = W.gCurrentObject;
    F.obj_set_hitbox(o, sBowlingBallHitbox);
    if (o.oInteractStatus & INT_STATUS_INTERACTED) {
        o.oInteractStatus = 0;
    }
}
function bowling_ball_set_waypoints() {
    const o = W.gCurrentObject;
    switch (o.oBhvParams2ndByte) {
        case BBALL_BP_STYPE_BOB_UPPER:
            o.oPathedStartWaypoint =W.SYM('bob_seg7_metal_ball_path0');
            break;
        case BBALL_BP_STYPE_TTM:
            o.oPathedStartWaypoint =W.SYM('ttm_seg7_trajectory_070170A0');
            break;
        case BBALL_BP_STYPE_BOB_LOWER:
            o.oPathedStartWaypoint =W.SYM('bob_seg7_metal_ball_path1');
            break;
        case BBALL_BP_STYPE_THI_LARGE:
            o.oPathedStartWaypoint = sTHIHugeMetalBallTraj;
            break;
        case BBALL_BP_STYPE_THI_SMALL:
            o.oPathedStartWaypoint = sTHITinyMetalBallTraj;
            break;
    }
}
function bhv_bowling_ball_roll_loop() {
    const o = W.gCurrentObject;
    let collisionFlags = 0;
    let followStatus = 0;
    bowling_ball_set_waypoints();
    collisionFlags = s16(object_step());
    followStatus = F.cur_obj_follow_path(followStatus);
    o.oBowlingBallTargetYaw = o.oPathedTargetYaw;
    o.oMoveAngleYaw = F.approach_s16_symmetric(o.oMoveAngleYaw, o.oBowlingBallTargetYaw, 0x400);
    if (o.oForwardVel > 70.0) {
        o.oForwardVel = 70.0;
    }
    bowling_ball_set_hitbox();
    if (followStatus == PATH_REACHED_END) {
        if (is_point_within_radius_of_mario(o.oPosX, o.oPosY, o.oPosZ, 7000)) {
            F.spawn_mist_particles();
            F.spawn_mist_particles_variable(0, 0, 92.0);
        }
        o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
    }
    if ((collisionFlags & OBJ_COL_FLAG_GROUNDED) && (o.oVelY > 5.0)) {
        cur_obj_play_sound_2(SOUND_GENERAL_QUIET_POUND1_LOWPRIO);
    }
}
function bhv_bowling_ball_initialize_loop() {
    const o = W.gCurrentObject;
    let followStatus = 0;
    bowling_ball_set_waypoints();
    followStatus = F.cur_obj_follow_path(followStatus);
    o.oMoveAngleYaw = o.oPathedTargetYaw;
    switch (o.oBhvParams2ndByte) {
        case BBALL_BP_STYPE_BOB_UPPER:
            o.oForwardVel = 20.0;
            break;
        case BBALL_BP_STYPE_TTM:
            o.oForwardVel = 10.0;
            break;
        case BBALL_BP_STYPE_BOB_LOWER:
            o.oForwardVel = 20.0;
            break;
        case BBALL_BP_STYPE_THI_LARGE:
            o.oForwardVel = 25.0;
            break;
        case BBALL_BP_STYPE_THI_SMALL:
            o.oForwardVel = 10.0;
            F.cur_obj_scale(0.3);
            o.oGraphYOffset = 39.0;
            break;
    }
}
function bhv_bowling_ball_loop() {
    const o = W.gCurrentObject;
    switch (o.oAction) {
        case BBALL_ACT_INITIALIZE:
            o.oAction = BBALL_ACT_ROLL;
            bhv_bowling_ball_initialize_loop();
            break;
        case BBALL_ACT_ROLL:
            bhv_bowling_ball_roll_loop();
            break;
    }
    if (o.oBhvParams2ndByte != BBALL_BP_STYPE_THI_SMALL) {
        F.set_camera_shake_from_point(SHAKE_POS_BOWLING_BALL, o.oPosX, o.oPosY, o.oPosZ);
    }
    set_object_visibility(o, 4000);
}
function bhv_generic_bowling_ball_spawner_init() {
    const o = W.gCurrentObject;
    switch (o.oBhvParams2ndByte) {
        case BBALL_BP_STYPE_BOB_UPPER:
            o.oBBallSpawnerMaxSpawnDist = 7000.0;
            o.oBBallSpawnerSpawnOdds = 2.0;
            break;
        case BBALL_BP_STYPE_TTM:
            o.oBBallSpawnerMaxSpawnDist = 8000.0;
            o.oBBallSpawnerSpawnOdds = 1.0;
            break;
        case BBALL_BP_STYPE_BOB_LOWER:
            o.oBBallSpawnerMaxSpawnDist = 6000.0;
            o.oBBallSpawnerSpawnOdds = 2.0;
            break;
    }
}
function bhv_generic_bowling_ball_spawner_loop() {
    const o = W.gCurrentObject;
    if (o.oTimer == 256) {
        o.oTimer = 0;
    }
    if (is_point_within_radius_of_mario(o.oPosX, o.oPosY, o.oPosZ, 1000) || o.oPosY < W.gMarioObject.gfx.pos[1]) {
        return;
    }
    if ((o.oTimer & o.oBBallSpawnerPeriodMinus1) == 0) { 
        if (is_point_within_radius_of_mario(o.oPosX, o.oPosY, o.oPosZ, o.oBBallSpawnerMaxSpawnDist) && Math.trunc((F.random_float() * o.oBBallSpawnerSpawnOdds)) == 0) {
            let bowlingBall = spawn_object(o, MODEL_BOWLING_BALL,B.bhvBowlingBall);
            bowlingBall.oBhvParams2ndByte = o.oBhvParams2ndByte;
        }
    }
}
function bhv_thi_bowling_ball_spawner_loop() {
    const o = W.gCurrentObject;
    if (o.oTimer == 256) {
        o.oTimer = 0;
    }
    if (is_point_within_radius_of_mario(o.oPosX, o.oPosY, o.oPosZ, 800) || o.oPosY < W.gMarioObject.gfx.pos[1]) {
        return;
    }
    if ((o.oTimer % 64) == 0) {
        if (is_point_within_radius_of_mario(o.oPosX, o.oPosY, o.oPosZ, 12000) && Math.trunc((F.random_float() * 1.5)) == 0) {
            let bowlingBall = spawn_object(o, MODEL_BOWLING_BALL,B.bhvBowlingBall);
            bowlingBall.oBhvParams2ndByte = o.oBhvParams2ndByte;
        }
    }
}
function bhv_bob_pit_bowling_ball_init() {
    const o = W.gCurrentObject;
    o.oGravity = 12.0;
    o.oFriction = 1.0;
    o.oBuoyancy = 2.0;
}
function bhv_bob_pit_bowling_ball_loop() {
    const o = W.gCurrentObject;
    let sp1c = null;
    let collisionFlags = s16(object_step());
    F.find_floor_height_and_data(o.oPosX, o.oPosY, o.oPosZ, $ => sp1c = $);
    if ((sp1c.normalX == 0) && (sp1c.normalZ == 0)) {
        o.oForwardVel = 28.0;
    }
    bowling_ball_set_hitbox();
    F.set_camera_shake_from_point(SHAKE_POS_BOWLING_BALL, o.oPosX, o.oPosY, o.oPosZ);
    cur_obj_play_sound_1(SOUND_ENV_UNKNOWN2);
    set_object_visibility(o, 3000);
}
function bhv_free_bowling_ball_init() {
    const o = W.gCurrentObject;
    o.oGravity = 5.5;
    o.oFriction = 1.0;
    o.oBuoyancy = 2.0;
    o.oHomeX = o.oPosX;
    o.oHomeY = o.oPosY;
    o.oHomeZ = o.oPosZ;
    o.oForwardVel = 0;
    o.oMoveAngleYaw = 0;
}
function bhv_free_bowling_ball_roll_loop() {
    const o = W.gCurrentObject;
    let collisionFlags = s16(object_step());
    bowling_ball_set_hitbox();
    if (o.oForwardVel > 10.0) {
        F.set_camera_shake_from_point(SHAKE_POS_BOWLING_BALL, o.oPosX, o.oPosY, o.oPosZ);
        cur_obj_play_sound_1(SOUND_ENV_UNKNOWN2);
    }
    if ((collisionFlags & OBJ_COL_FLAG_GROUNDED) && !(collisionFlags & OBJ_COL_FLAGS_LANDED)) {
        cur_obj_play_sound_2(SOUND_GENERAL_QUIET_POUND1_LOWPRIO);
    }
    if (!is_point_within_radius_of_mario(o.oPosX, o.oPosY, o.oPosZ, 6000)) {
        o.gfx.flags |= GRAPH_RENDER_INVISIBLE;
        F.cur_obj_become_intangible();
        o.oPosX = o.oHomeX;
        o.oPosY = o.oHomeY;
        o.oPosZ = o.oHomeZ;
        bhv_free_bowling_ball_init();
        o.oAction = FREE_BBALL_ACT_RESET;
    }
}
function bhv_free_bowling_ball_loop() {
    const o = W.gCurrentObject;
    o.oGravity = 5.5;
    switch (o.oAction) {
        case FREE_BBALL_ACT_IDLE:
            if (is_point_within_radius_of_mario(o.oPosX, o.oPosY, o.oPosZ, 3000)) {
                o.oAction = FREE_BBALL_ACT_ROLL;
                o.gfx.flags &= ~GRAPH_RENDER_INVISIBLE;
                F.cur_obj_become_tangible();
            }
            break;
        case FREE_BBALL_ACT_ROLL:
            bhv_free_bowling_ball_roll_loop();
            break;
        case FREE_BBALL_ACT_RESET:
            if (is_point_within_radius_of_mario(o.oPosX, o.oPosY, o.oPosZ, 5000)) {
                o.oAction = FREE_BBALL_ACT_IDLE;
            }
            break;
    }
}
let sCapHitbox = { interactType: INTERACT_CAP, downOffset: 0, damageOrCoinValue: 0, health: 0, numLootCoins: 0, radius: 80, height: 80, hurtboxRadius: 90, hurtboxHeight: 90 };
function cap_set_hitbox() {
    const o = W.gCurrentObject;
    F.obj_set_hitbox(o, sCapHitbox);
    if (o.oInteractStatus & INT_STATUS_INTERACTED) {
        o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
        o.oInteractStatus = 0;
        return true;
    }
    return false;
}
function cap_despawn() {
    const o = W.gCurrentObject;
    if (o.oTimer > 300) {
        obj_flicker_and_disappear(o, 300);
    }
}
function cap_check_quicksand() {
    const o = W.gCurrentObject;
    if (sObjFloor == null) {
        return;
    }
    switch (sObjFloor.type) {
        case SURFACE_DEATH_PLANE:
            o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
            break;
        case SURFACE_SHALLOW_QUICKSAND:
        case SURFACE_DEEP_QUICKSAND:
        case SURFACE_QUICKSAND:
            o.oAction = 10;
            o.oForwardVel = 0.0;
            break;
        case SURFACE_DEEP_MOVING_QUICKSAND:
        case SURFACE_SHALLOW_MOVING_QUICKSAND:
        case SURFACE_MOVING_QUICKSAND:
            o.oAction = 11;
            o.oMoveAngleYaw = (sObjFloor.force & 0xFF) << 8;
            o.oForwardVel = 8 + 2 * (0 - ((sObjFloor.force & 0xFF00) >> 8));
            break;
        case SURFACE_INSTANT_QUICKSAND:
            o.oAction = 12;
            o.oForwardVel = 0.0;
            break;
        case SURFACE_INSTANT_MOVING_QUICKSAND:
            o.oAction = 13;
            o.oMoveAngleYaw = (sObjFloor.force & 0xFF) << 8;
            o.oForwardVel = 8 + 2 * (0 - ((sObjFloor.force & 0xFF00) >> 8));
            break;
    }
}
function cap_sink_quicksand() {
    const o = W.gCurrentObject;
    switch (o.oAction) {
        case 10:
            if (o.oTimer < 10) {
                o.oGraphYOffset += -1.0;
                o.oFaceAnglePitch = 0x2000;
            }
            break;
        case 11:
            if (o.oTimer < 10) {
                o.oGraphYOffset += -3.0;
            }
            o.oFaceAnglePitch = 0x2000;
            break;
        case 12:
            o.oGraphYOffset += -1.0;
            if (o.oTimer > 20) {
                o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
            }
            break;
        case 13:
            o.oGraphYOffset += -6.0;
            if (o.oTimer > 20) {
                o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
            }
            o.oFaceAnglePitch = 0x2000;
            break;
    }
    cap_check_quicksand();
}
function bhv_wing_cap_init() {
    const o = W.gCurrentObject;
    o.oGravity = 1.2;
    o.oFriction = 0.999;
    o.oBuoyancy = 0.9;
    o.oOpacity = 255;
}
function cap_scale_vertically() {
    const o = W.gCurrentObject;
    o.oCapUnkF8 += 0x2000;
    o.gfx.scale[1] = coss(o.oCapUnkF8) * 0.3 + 0.7;
    if (o.oCapUnkF8 == 0x10000) {
        o.oCapUnkF8 = 0;
        o.oCapUnkF4 = 2;
    }
}
function wing_vanish_cap_act_0() {
    const o = W.gCurrentObject;
    let collisionFlags = 0;
    o.oFaceAngleYaw += o.oForwardVel * 128.0;
    collisionFlags = s16(object_step());
    if (collisionFlags & OBJ_COL_FLAG_GROUNDED) {
        cap_check_quicksand();
        if (o.oVelY != 0.0) {
            o.oCapUnkF4 = 1;
            o.oVelY = 0.0;
        }
    }
    if (o.oCapUnkF4 == 1) {
        cap_scale_vertically();
    }
}
function bhv_wing_vanish_cap_loop() {
    const o = W.gCurrentObject;
    switch (o.oAction) {
        case 0:
            wing_vanish_cap_act_0();
            break;
        default:
            object_step();
            cap_sink_quicksand();
            break;
    }
    if (o.oTimer > 20) {
        F.cur_obj_become_tangible();
    }
    cap_despawn();
    cap_set_hitbox();
}
function bhv_metal_cap_init() {
    const o = W.gCurrentObject;
    o.oGravity = 2.4;
    o.oFriction = 0.999;
    o.oBuoyancy = 1.5;
    o.oOpacity = 255;
}
function metal_cap_act_0() {
    const o = W.gCurrentObject;
    let collisionFlags = 0;
    o.oFaceAngleYaw += o.oForwardVel * 128.0;
    collisionFlags = s16(object_step());
    if (collisionFlags & OBJ_COL_FLAG_GROUNDED) {
        cap_check_quicksand();
    }
}
function bhv_metal_cap_loop() {
    const o = W.gCurrentObject;
    switch (o.oAction) {
        case 0:
            metal_cap_act_0();
            break;
        default:
            object_step();
            cap_sink_quicksand();
            break;
    }
    if (o.oTimer > 20) {
        F.cur_obj_become_tangible();
    }
    cap_set_hitbox();
    cap_despawn();
}
function bhv_normal_cap_init() {
    const o = W.gCurrentObject;
    o.oGravity = 0.7;
    o.oFriction = 0.89;
    o.oBuoyancy = 0.9;
    o.oOpacity = 255;
    F.save_file_set_cap_pos(o.oPosX, o.oPosY, o.oPosZ);
}
function normal_cap_set_save_flags() {
    F.save_file_clear_flags(SAVE_FLAG_CAP_ON_GROUND);
    switch (W.gCurrCourseNum) {
        case COURSE_SSL:
            F.save_file_set_flags(SAVE_FLAG_CAP_ON_KLEPTO);
            break;
        case COURSE_SL:
            F.save_file_set_flags(SAVE_FLAG_CAP_ON_MR_BLIZZARD);
            break;
        case COURSE_TTM:
            F.save_file_set_flags(SAVE_FLAG_CAP_ON_UKIKI);
            break;
        default:
            F.save_file_set_flags(SAVE_FLAG_CAP_ON_KLEPTO);
            break;
    }
}
function normal_cap_act_0() {
    const o = W.gCurrentObject;
    let collisionFlags = 0;
    o.oFaceAngleYaw += o.oForwardVel * 128.0;
    o.oFaceAnglePitch += o.oForwardVel * 80.0;
    collisionFlags = s16(object_step());
    if (collisionFlags & OBJ_COL_FLAG_GROUNDED) {
        cap_check_quicksand();
        if (o.oVelY != 0.0) {
            o.oCapUnkF4 = 1;
            o.oVelY = 0.0;
            o.oFaceAnglePitch = 0;
        }
    }
    if (o.oCapUnkF4 == 1) {
        cap_scale_vertically();
    }
}
function bhv_normal_cap_loop() {
    const o = W.gCurrentObject;
    switch (o.oAction) {
        case 0:
            normal_cap_act_0();
            break;
        default:
            object_step();
            cap_sink_quicksand();
            break;
    }
    if (Math.trunc(o.oForwardVel) != 0) {
        F.save_file_set_cap_pos(o.oPosX, o.oPosY, o.oPosZ);
    }
    if (o.activeFlags == ACTIVE_FLAG_DEACTIVATED) {
        normal_cap_set_save_flags();
    }
    if (cap_set_hitbox() == true) {
        F.save_file_clear_flags(SAVE_FLAG_CAP_ON_GROUND);
    }
}
function bhv_vanish_cap_init() {
    const o = W.gCurrentObject;
    o.oGravity = 1.2;
    o.oFriction = 0.999;
    o.oBuoyancy = 0.9;
    o.oOpacity = 150;
}
let sCollectStarHitbox = { interactType: INTERACT_STAR_OR_KEY, downOffset: 0, damageOrCoinValue: 0, health: 0, numLootCoins: 0, radius: 80, height: 50, hurtboxRadius: 0, hurtboxHeight: 0 };
function bhv_collect_star_init() {
    const o = W.gCurrentObject;
    let starIndex = (o.oBhvParams >> 24) & 0xFF;
    let currentLevelStarFlags = (F.save_file_get_star_flags(W.gCurrSaveFileNum - 1, COURSE_NUM_TO_INDEX(W.gCurrCourseNum))) & 0xFF;
    if (currentLevelStarFlags & (1 << starIndex)) {
        o.gfx.sharedChild = W.gLoadedGraphNodes[MODEL_TRANSPARENT_STAR];
    } else {
        o.gfx.sharedChild = W.gLoadedGraphNodes[MODEL_STAR];
    }
    F.obj_set_hitbox(o, sCollectStarHitbox);
}
function bhv_collect_star_loop() {
    const o = W.gCurrentObject;
    o.oFaceAngleYaw += 0x800;
    if (o.oInteractStatus & INT_STATUS_INTERACTED) {
        F.mark_obj_for_deletion(o);
        o.oInteractStatus = 0;
    }
}
function bhv_star_spawn_init() {
    const o = W.gCurrentObject;
    o.oMoveAngleYaw = atan2s(o.oHomeZ - o.oPosZ, o.oHomeX - o.oPosX);
    o.oStarSpawnDisFromHome = Math.sqrt(sqr(o.oHomeX - o.oPosX) + sqr(o.oHomeZ - o.oPosZ));
    o.oVelY = (o.oHomeY - o.oPosY) / 30.0;
    o.oForwardVel = o.oStarSpawnDisFromHome / 30.0;
    o.oStarSpawnUnkFC = o.oPosY;
    if (o.oBhvParams2ndByte == 0 || W.gCurrCourseNum == COURSE_BBH) {
        F.cutscene_object(CUTSCENE_STAR_SPAWN, o);
    } else {
        F.cutscene_object(CUTSCENE_RED_COIN_STAR_SPAWN, o);
    }
    F.set_time_stop_flags(TIME_STOP_ENABLED | TIME_STOP_MARIO_AND_DOORS);
    o.activeFlags |= ACTIVE_FLAG_INITIATED_TIME_STOP;
    F.cur_obj_become_intangible();
}
function bhv_star_spawn_loop() {
    const o = W.gCurrentObject;
    switch (o.oAction) {
        case 0:
            o.oFaceAngleYaw += 0x1000;
            if (o.oTimer > 20) {
                o.oAction = 1;
            }
            break;
        case 1:
            obj_move_xyz_using_fvel_and_yaw(o);
            o.oStarSpawnUnkFC += o.oVelY;
            o.oPosY = o.oStarSpawnUnkFC + sins((o.oTimer * 0x8000) / 30) * 400.0;
            o.oFaceAngleYaw += 0x1000;
            spawn_object(o, MODEL_NONE,B.bhvSparkleSpawn);
            cur_obj_play_sound_1(SOUND_ENV_STAR);
            if (o.oTimer == 30) {
                o.oAction = 2;
                o.oForwardVel = 0;
                play_power_star_jingle(true);
            }
            break;
        case 2:
            if (o.oTimer < 20) {
                o.oVelY = 20 - o.oTimer;
            } else {
                o.oVelY = -10.0;
            }
            spawn_object(o, MODEL_NONE,B.bhvSparkleSpawn);
            obj_move_xyz_using_fvel_and_yaw(o);
            o.oFaceAngleYaw = o.oFaceAngleYaw - o.oTimer * 0x10 + 0x1000;
            cur_obj_play_sound_1(SOUND_ENV_STAR);
            if (o.oPosY < o.oHomeY) {
                cur_obj_play_sound_2(SOUND_GENERAL_STAR_APPEARS);
                F.cur_obj_become_tangible();
                o.oPosY = o.oHomeY;
                o.oAction = 3;
            }
            break;
        case 3:
            o.oFaceAngleYaw += 0x800;
            if (o.oTimer == 20) {
                W.gObjCutsceneDone = true;
                F.clear_time_stop_flags(TIME_STOP_ENABLED | TIME_STOP_MARIO_AND_DOORS);
                o.activeFlags &= ~ACTIVE_FLAG_INITIATED_TIME_STOP;
            }
            if (o.oInteractStatus & INT_STATUS_INTERACTED) {
                F.mark_obj_for_deletion(o);
                o.oInteractStatus = 0;
            }
            break;
    }
}
function spawn_star(star, homeX, homeY, homeZ) {
    const o = W.gCurrentObject;
    star = spawn_object_abs_with_rot(o, 0, MODEL_STAR,B.bhvStarSpawnCoordinates, o.oPosX, o.oPosY, o.oPosZ, 0, 0, 0);
    star.oBhvParams = o.oBhvParams;
    star.oHomeX = homeX;
    star.oHomeY = homeY;
    star.oHomeZ = homeZ;
    star.oFaceAnglePitch = 0;
    star.oFaceAngleRoll = 0;
    return star;
}
function spawn_default_star(homeX, homeY, homeZ) {
    let star = spawn_star(star, homeX, homeY, homeZ);
    star.oBhvParams2ndByte = 0;
}
function spawn_red_coin_cutscene_star(homeX, homeY, homeZ) {
    let star = spawn_star(star, homeX, homeY, homeZ);
    star.oBhvParams2ndByte = 1;
}
function spawn_no_exit_star(homeX, homeY, homeZ) {
    let star = spawn_star(star, homeX, homeY, homeZ);
    star.oBhvParams2ndByte = 1;
    star.oInteractionSubtype |= INT_SUBTYPE_NO_EXIT;
}
function bhv_hidden_red_coin_star_init() {
    let count = 0;
    if (W.gCurrCourseNum != COURSE_JRB) {
        spawn_object(o, MODEL_TRANSPARENT_STAR,B.bhvRedCoinStarMarker);
    }
    count = s16(F.count_objects_with_behavior(B.bhvRedCoin));
    if (count == 0) {
        let star = spawn_object_abs_with_rot(o, 0, MODEL_STAR,B.bhvStar, o.oPosX, o.oPosY, o.oPosZ, 0, 0, 0);
        star.oBhvParams = o.oBhvParams;
        o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
    }
    o.oHiddenStarTriggerCounter = 8 - count;
}
function bhv_hidden_red_coin_star_loop() {
    const o = W.gCurrentObject;
    W.gRedCoinsCollected = o.oHiddenStarTriggerCounter;
    switch (o.oAction) {
        case 0:
            if (o.oHiddenStarTriggerCounter == 8) {
                o.oAction = 1;
            }
            break;
        case 1:
            if (o.oTimer > 2) {
                spawn_red_coin_cutscene_star(o.oPosX, o.oPosY, o.oPosZ);
                F.spawn_mist_particles();
                o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
            }
            break;
    }
}
let sRedCoinHitbox = { interactType: INTERACT_COIN, downOffset: 0, damageOrCoinValue: 2, health: 0, numLootCoins: 0, radius: 100, height: 64, hurtboxRadius: 0, hurtboxHeight: 0 };
function bhv_red_coin_init() {
    let dummyFloor = null;
    let floorHeight = F.find_floor(o.oPosX, o.oPosY, o.oPosZ, $ => dummyFloor = $);
    let hiddenRedCoinStar = null;
    if ((hiddenRedCoinStar = F.cur_obj_nearest_object_with_behavior(B.bhvHiddenRedCoinStar)) != null) {
        o.parentObj = hiddenRedCoinStar;
    } else if ((hiddenRedCoinStar = F.cur_obj_nearest_object_with_behavior(B.bhvBowserCourseRedCoinStar)) != null) {
        o.parentObj = hiddenRedCoinStar;
    } else {
        o.parentObj = null;
    }
    F.obj_set_hitbox(o, sRedCoinHitbox);
}
function bhv_red_coin_loop() {
    const o = W.gCurrentObject;
    if (o.oInteractStatus & INT_STATUS_INTERACTED) {
        if (o.parentObj != null) {
            o.parentObj.oHiddenStarTriggerCounter++;
            if (o.parentObj.oHiddenStarTriggerCounter != 8) {
                spawn_orange_number(o.parentObj.oHiddenStarTriggerCounter, 0, 0, 0);
            }
            play_sound(SOUND_MENU_COLLECT_RED_COIN + ((((o.parentObj.oHiddenStarTriggerCounter) & 0xFF) - 1) << 16), W.gGlobalSoundSource);
        }
        coin_collected();
        o.oInteractStatus = 0;
    }
}
function bhv_hidden_star_init() {
    let count = s16(F.count_objects_with_behavior(B.bhvHiddenStarTrigger));
    if (count == 0) {
        let star = spawn_object_abs_with_rot(o, 0, MODEL_STAR,B.bhvStar, o.oPosX, o.oPosY, o.oPosZ, 0, 0, 0);
        star.oBhvParams = o.oBhvParams;
        o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
    }
    o.oHiddenStarTriggerCounter = 5 - count;
}
function bhv_hidden_star_loop() {
    const o = W.gCurrentObject;
    switch (o.oAction) {
        case 0:
            if (o.oHiddenStarTriggerCounter == 5) {
                o.oAction = 1;
            }
            break;
        case 1:
            if (o.oTimer > 2) {
                spawn_red_coin_cutscene_star(o.oPosX, o.oPosY, o.oPosZ);
                F.spawn_mist_particles();
                o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
            }
            break;
    }
}
function bhv_hidden_star_trigger_loop() {
    const o = W.gCurrentObject;
    if (F.obj_check_if_collided_with_object(o, W.gMarioObject) == true) {
        let hiddenStar = F.cur_obj_nearest_object_with_behavior(B.bhvHiddenStar);
        if (hiddenStar != null) {
            hiddenStar.oHiddenStarTriggerCounter++;
            if (hiddenStar.oHiddenStarTriggerCounter != 5) {
                spawn_orange_number(hiddenStar.oHiddenStarTriggerCounter, 0, 0, 0);
            }
            play_sound(SOUND_MENU_COLLECT_SECRET + ((((hiddenStar.oHiddenStarTriggerCounter) & 0xFF) - 1) << 16), W.gGlobalSoundSource);
        }
        o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
    }
}
function bhv_bowser_course_red_coin_star_loop() {
    const o = W.gCurrentObject;
    W.gRedCoinsCollected = o.oHiddenStarTriggerCounter;
    switch (o.oAction) {
        case 0:
            if (o.oHiddenStarTriggerCounter == 8) {
                o.oAction = 1;
            }
            break;
        case 1:
            if (o.oTimer > 2) {
                spawn_no_exit_star(o.oPosX, o.oPosY, o.oPosZ);
                F.spawn_mist_particles();
                o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
            }
            break;
    }
}
function bhv_1up_interact() {
    const o = W.gCurrentObject;
    let filler = new Array(4).fill(0);
    if (F.obj_check_if_collided_with_object(o, W.gMarioObject) == true) {
        play_sound(SOUND_GENERAL_COLLECT_1UP, W.gGlobalSoundSource);
        W.gMarioState.numLives++;
        o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
    }
}
function bhv_1up_common_init() {
    const o = W.gCurrentObject;
    o.oMoveAnglePitch = -0x4000;
    o.oGravity = 3.0;
    o.oFriction = 1.0;
    o.oBuoyancy = 1.0;
}
function bhv_1up_init() {
    const o = W.gCurrentObject;
    bhv_1up_common_init();
    if (o.oBhvParams2ndByte == ONE_UP_BP_BEAT_BITDW_BOWSER) {
        if (!(F.save_file_get_flags() & (SAVE_FLAG_HAVE_KEY_1 | SAVE_FLAG_UNLOCKED_BASEMENT_DOOR))) {
            o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
        }
    } else if (o.oBhvParams2ndByte == ONE_UP_BP_BEAT_BITFS_BOWSER) {
        if (!(F.save_file_get_flags() & (SAVE_FLAG_HAVE_KEY_2 | SAVE_FLAG_UNLOCKED_UPSTAIRS_DOOR))) {
            o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
        }
    }
}
function one_up_loop_in_air() {
    const o = W.gCurrentObject;
    if (o.oTimer < 5) {
        o.oVelY = 40.0;
    } else {
        o.oAngleVelPitch = -0x1000;
        o.oMoveAnglePitch += o.oAngleVelPitch;
        o.oVelY = coss(o.oMoveAnglePitch) * 30.0 + 2.0;
        o.oForwardVel = -sins(o.oMoveAnglePitch) * 30.0;
    }
}
function pole_1up_move_towards_mario() {
    const o = W.gCurrentObject;
    let sp34 = W.gMarioObject.gfx.pos[0] - o.oPosX;
    let sp30 = W.gMarioObject.gfx.pos[1] + 120.0 - o.oPosY;
    let sp2C = W.gMarioObject.gfx.pos[2] - o.oPosZ;
    let sp2A = s16(atan2s(Math.sqrt(sqr(sp34) + sqr(sp2C)), sp30));
    F.obj_turn_toward_object(o, W.gMarioObject, 16, 0x1000);
    o.oMoveAnglePitch = F.approach_s16_symmetric(o.oMoveAnglePitch, sp2A, 0x1000);
    o.oVelY = sins(o.oMoveAnglePitch) * 30.0;
    o.oForwardVel = coss(o.oMoveAnglePitch) * 30.0;
    bhv_1up_interact();
}
function one_up_move_away_from_mario(collisionFlags) {
    const o = W.gCurrentObject;
    o.oForwardVel = 8.0;
    o.oMoveAngleYaw = o.oAngleToMario + 0x8000;
    bhv_1up_interact();
    if (collisionFlags & OBJ_COL_FLAG_HIT_WALL) {
        o.oAction = 2;
    }
    if (!is_point_within_radius_of_mario(o.oPosX, o.oPosY, o.oPosZ, 3000)) {
        o.oAction = 2;
    }
}
function bhv_1up_walking_loop() {
    const o = W.gCurrentObject;
    object_step();
    switch (o.oAction) {
        case 0:
            if (o.oTimer > 17) {
                spawn_object(o, MODEL_NONE,B.bhvSparkleSpawn);
            }
            if (o.oTimer == 0) {
                play_sound(SOUND_GENERAL2_1UP_APPEAR, W.gGlobalSoundSource);
            }
            one_up_loop_in_air();
            if (o.oTimer == 37) {
                F.cur_obj_become_tangible();
                o.oAction = 1;
                o.oForwardVel = 2.0;
            }
            break;
        case 1:
            if (o.oTimer > 300) {
                o.oAction = 2;
            }
            bhv_1up_interact();
            break;
        case 2:
            obj_flicker_and_disappear(o, 30);
            bhv_1up_interact();
            break;
    }
    set_object_visibility(o, 3000);
}
function bhv_1up_running_away_loop() {
    const o = W.gCurrentObject;
    let collisionFlags = s16(object_step());
    switch (o.oAction) {
        case 0:
            if (o.oTimer > 17) {
                spawn_object(o, MODEL_NONE,B.bhvSparkleSpawn);
            }
            if (o.oTimer == 0) {
                play_sound(SOUND_GENERAL2_1UP_APPEAR, W.gGlobalSoundSource);
            }
            one_up_loop_in_air();
            if (o.oTimer == 37) {
                F.cur_obj_become_tangible();
                o.oAction = 1;
                o.oForwardVel = 8.0;
            }
            break;
        case 1:
            spawn_object(o, MODEL_NONE,B.bhvSparkleSpawn);
            one_up_move_away_from_mario(collisionFlags);
            break;
        case 2:
            obj_flicker_and_disappear(o, 30);
            bhv_1up_interact();
            break;
    }
    set_object_visibility(o, 3000);
}
function sliding_1up_move() {
    const o = W.gCurrentObject;
    let collisionFlags = s16(object_step());
    if (collisionFlags & OBJ_COL_FLAG_GROUNDED) {
        o.oForwardVel += 25.0;
        o.oVelY = 0.0;
    } else {
        o.oForwardVel *= 0.98;
    }
    if (o.oForwardVel > 40.0) {
        o.oForwardVel = 40.0;
    }
    if (!is_point_within_radius_of_mario(o.oPosX, o.oPosY, o.oPosZ, 5000)) {
        o.oAction = 2;
    }
}
function bhv_1up_sliding_loop() {
    const o = W.gCurrentObject;
    switch (o.oAction) {
        case 0:
            set_object_visibility(o, 3000);
            if (is_point_within_radius_of_mario(o.oPosX, o.oPosY, o.oPosZ, 1000)) {
                o.oAction = 1;
            }
            break;
        case 1:
            sliding_1up_move();
            break;
        case 2:
            obj_flicker_and_disappear(o, 30);
            bhv_1up_interact();
            break;
    }
    bhv_1up_interact();
    spawn_object(o, MODEL_NONE,B.bhvSparkleSpawn);
}
function bhv_1up_loop() {
    const o = W.gCurrentObject;
    bhv_1up_interact();
    set_object_visibility(o, 3000);
}
function bhv_1up_jump_on_approach_loop() {
    const o = W.gCurrentObject;
    let collisionFlags = 0;
    switch (o.oAction) {
        case 0:
            if (is_point_within_radius_of_mario(o.oPosX, o.oPosY, o.oPosZ, 1000)) {
                o.oVelY = 40.0;
                o.oAction = 1;
            }
            break;
        case 1:
            collisionFlags = s16(object_step());
            one_up_move_away_from_mario(collisionFlags);
            spawn_object(o, MODEL_NONE,B.bhvSparkleSpawn);
            break;
        case 2:
            collisionFlags = s16(object_step());
            bhv_1up_interact();
            obj_flicker_and_disappear(o, 30);
            break;
    }
    set_object_visibility(o, 3000);
}
function bhv_1up_hidden_loop() {
    const o = W.gCurrentObject;
    let collisionFlags = 0;
    switch (o.oAction) {
        case 0:
            o.gfx.flags |= GRAPH_RENDER_INVISIBLE;
            if (o.oHidden1UpNumTouchedTriggers == o.oBhvParams2ndByte) {
                o.oVelY = 40.0;
                o.oAction = 3;
                o.gfx.flags &= ~GRAPH_RENDER_INVISIBLE;
                play_sound(SOUND_GENERAL2_1UP_APPEAR, W.gGlobalSoundSource);
            }
            break;
        case 1:
            collisionFlags = s16(object_step());
            one_up_move_away_from_mario(collisionFlags);
            spawn_object(o, MODEL_NONE,B.bhvSparkleSpawn);
            break;
        case 2:
            collisionFlags = s16(object_step());
            bhv_1up_interact();
            obj_flicker_and_disappear(o, 30);
            break;
        case 3:
            collisionFlags = s16(object_step());
            if (o.oTimer > 17) {
                spawn_object(o, MODEL_NONE,B.bhvSparkleSpawn);
            }
            one_up_loop_in_air();
            if (o.oTimer == 37) {
                F.cur_obj_become_tangible();
                o.oAction = 1;
                o.oForwardVel = 8.0;
            }
            break;
    }
}
function bhv_1up_hidden_trigger_loop() {
    const o = W.gCurrentObject;
    if (F.obj_check_if_collided_with_object(o, W.gMarioObject) == true) {
        let hidden1Up = F.cur_obj_nearest_object_with_behavior(B.bhvHidden1Up);
        if (hidden1Up != null) {
            hidden1Up.oHidden1UpNumTouchedTriggers++;
        }
        o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
    }
}
function bhv_1up_hidden_in_pole_loop() {
    const o = W.gCurrentObject;
    let collisionFlags = 0;
    switch (o.oAction) {
        case 0:
            o.gfx.flags |= GRAPH_RENDER_INVISIBLE;
            if (o.oHidden1UpNumTouchedTriggers == o.oBhvParams2ndByte) {
                o.oVelY = 40.0;
                o.oAction = 3;
                o.gfx.flags &= ~GRAPH_RENDER_INVISIBLE;
                play_sound(SOUND_GENERAL2_1UP_APPEAR, W.gGlobalSoundSource);
            }
            break;
        case 1:
            pole_1up_move_towards_mario();
            collisionFlags = s16(object_step());
            break;
        case 3:
            collisionFlags = s16(object_step());
            if (o.oTimer > 17) {
                spawn_object(o, MODEL_NONE,B.bhvSparkleSpawn);
            }
            one_up_loop_in_air();
            if (o.oTimer == 37) {
                F.cur_obj_become_tangible();
                o.oAction = 1;
                o.oForwardVel = 10.0;
            }
            break;
    }
}
function bhv_1up_hidden_in_pole_trigger_loop() {
    const o = W.gCurrentObject;
    if (F.obj_check_if_collided_with_object(o, W.gMarioObject) == true) {
        let hidden1Up = F.cur_obj_nearest_object_with_behavior(B.bhvHidden1UpInPole);
        if (hidden1Up != null) {
            hidden1Up.oHidden1UpNumTouchedTriggers++;
        }
        o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
    }
}
function bhv_1up_hidden_in_pole_spawner_loop() {
    const o = W.gCurrentObject;
    if (is_point_within_radius_of_mario(o.oPosX, o.oPosY, o.oPosZ, 700)) {
        let i = 0;
        spawn_object_relative(2, 0, 50, 0, o, MODEL_1UP,B.bhvHidden1UpInPole);
        for (i = 0; i <= 1; i++) {
            spawn_object_relative(0, 0, i * -200, 0, o, MODEL_NONE,B.bhvHidden1UpInPoleTrigger);
        }
        o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
    }
}
let sBreakableBoxSmallHitbox = { interactType: INTERACT_GRABBABLE, downOffset: 20, damageOrCoinValue: 0, health: 1, numLootCoins: 0, radius: 150, height: 250, hurtboxRadius: 150, hurtboxHeight: 250 };
function bhv_breakable_box_small_init() {
    const o = W.gCurrentObject;
    o.oGravity = 2.5;
    o.oFriction = 0.99;
    o.oBuoyancy = 1.4;
    F.cur_obj_scale(0.4);
    F.obj_set_hitbox(o, sBreakableBoxSmallHitbox);
    o.oAnimState = 1;
    o.activeFlags |= ACTIVE_FLAG_UNK9;
}
function small_breakable_box_spawn_dust() {
    const o = W.gCurrentObject;
    let sp24 = spawn_object(o, MODEL_SMOKE,B.bhvSmoke);
    sp24.oPosX += Math.trunc((F.random_float() * 80.0)) - 40;
    sp24.oPosZ += Math.trunc((F.random_float() * 80.0)) - 40;
}
function small_breakable_box_act_move() {
    const o = W.gCurrentObject;
    let collisionFlags = s16(object_step());
    F.obj_attack_collided_from_other_object(o);
    if (collisionFlags == OBJ_COL_FLAG_GROUNDED) {
        cur_obj_play_sound_2(SOUND_GENERAL_BOX_LANDING_2);
    }
    if (collisionFlags & OBJ_COL_FLAG_GROUNDED) {
        if (o.oForwardVel > 20.0) {
            cur_obj_play_sound_2(SOUND_ENV_SLIDING);
            small_breakable_box_spawn_dust();
        }
    }
    if (collisionFlags & OBJ_COL_FLAG_HIT_WALL) {
        F.spawn_mist_particles();
        F.spawn_triangle_break_particles(20, MODEL_DIRT_ANIMATION, 0.7, 3);
        obj_spawn_yellow_coins(o, 3);
        create_sound_spawner(SOUND_GENERAL_BREAK_BOX);
        o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
    }
    obj_check_floor_death(collisionFlags, sObjFloor);
}
function breakable_box_small_released_loop() {
    const o = W.gCurrentObject;
    o.oBreakableBoxSmallFramesSinceReleased++;
    if (o.oBreakableBoxSmallFramesSinceReleased > 810) {
        if (o.oBreakableBoxSmallFramesSinceReleased & 1) {
            o.gfx.flags |= GRAPH_RENDER_INVISIBLE;
        } else {
            o.gfx.flags &= ~GRAPH_RENDER_INVISIBLE;
        }
    }
    if (o.oBreakableBoxSmallFramesSinceReleased > 900) {
        create_respawner(MODEL_BREAKABLE_BOX_SMALL,B.bhvBreakableBoxSmall, 3000);
        o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
    }
}
function breakable_box_small_idle_loop() {
    const o = W.gCurrentObject;
    switch (o.oAction) {
        case 0:
            small_breakable_box_act_move();
            break;
        case 100:
            obj_lava_death();
            break;
        case 101:
            o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
            create_respawner(MODEL_BREAKABLE_BOX_SMALL,B.bhvBreakableBoxSmall, 3000);
            break;
    }
    if (o.oBreakableBoxSmallReleased == true) {
        breakable_box_small_released_loop();
    }
}
function breakable_box_small_get_dropped() {
    const o = W.gCurrentObject;
    F.cur_obj_become_tangible();
    F.cur_obj_enable_rendering();
    F.cur_obj_get_dropped();
    o.gfx.flags &= ~GRAPH_RENDER_INVISIBLE;
    o.oHeldState = 0;
    o.oBreakableBoxSmallReleased = true;
    o.oBreakableBoxSmallFramesSinceReleased = 0;
}
function breakable_box_small_get_thrown() {
    const o = W.gCurrentObject;
    F.cur_obj_become_tangible();
    F.cur_obj_enable_rendering_2();
    F.cur_obj_enable_rendering();
    o.gfx.flags &= ~GRAPH_RENDER_INVISIBLE;
    o.oHeldState = 0;
    o.oFlags &= ~OBJ_FLAG_SET_FACE_YAW_TO_MOVE_YAW;
    o.oForwardVel = 40.0;
    o.oVelY = 20.0;
    o.oBreakableBoxSmallReleased = true;
    o.oBreakableBoxSmallFramesSinceReleased = 0;
    o.activeFlags &= ~ACTIVE_FLAG_UNK9;
}
function bhv_breakable_box_small_loop() {
    const o = W.gCurrentObject;
    switch (o.oHeldState) {
        case 0:
            breakable_box_small_idle_loop();
            break;
        case 1:
            F.cur_obj_disable_rendering();
            F.cur_obj_become_intangible();
            break;
        case 2:
            breakable_box_small_get_thrown();
            break;
        case 3:
            breakable_box_small_get_dropped();
            break;
    }
    o.oInteractStatus = 0;
}

Object.assign(F, { set_yoshi_as_not_dead, absf_2, obj_find_wall, turn_obj_away_from_steep_floor, calc_new_obj_vel_and_pos_y, calc_new_obj_vel_and_pos_y_underwater, obj_update_pos_vel_xz, obj_splash, object_step, object_step_without_floor_orient, obj_move_xyz_using_fvel_and_yaw, is_point_within_radius_of_mario, is_point_close_to_object, set_object_visibility, obj_return_home_if_safe, obj_return_and_displace_home, obj_check_if_facing_toward_angle, obj_find_wall_displacement, obj_spawn_yellow_coins, obj_flicker_and_disappear, current_mario_room_check, obj_check_floor_death, obj_lava_death, spawn_orange_number, debug_sequence_tracker, moving_coin_flicker, coin_collected, bhv_moving_yellow_coin_init, bhv_moving_yellow_coin_loop, bhv_moving_blue_coin_init, bhv_moving_blue_coin_loop, bhv_blue_coin_sliding_jumping_init, blue_coin_sliding_away_from_mario, blue_coin_sliding_slow_down, bhv_blue_coin_sliding_loop, bhv_blue_coin_jumping_loop, bhv_bobomb_init, bobomb_spawn_coin, bobomb_act_explode, bobomb_check_interactions, bobomb_act_patrol, bobomb_act_chase_mario, bobomb_act_launched, generic_bobomb_free_loop, stationary_bobomb_free_loop, bobomb_free_loop, bobomb_held_loop, bobomb_dropped_loop, bobomb_thrown_loop, bhv_bobomb_loop, bhv_bobomb_fuse_smoke_init, bhv_bobomb_buddy_init, bobomb_buddy_act_idle, bobomb_buddy_cannon_dialog, bobomb_buddy_act_talk, bobomb_buddy_act_turn_to_talk, bobomb_buddy_actions, bhv_bobomb_buddy_loop, bhv_cannon_closed_init, cannon_door_act_opening, bhv_cannon_closed_loop, bhv_homing_amp_init, check_amp_attack, homing_amp_appear_loop, homing_amp_chase_loop, homing_amp_give_up_loop, amp_attack_cooldown_loop, bhv_homing_amp_loop, bhv_circling_amp_init, fixed_circling_amp_idle_loop, circling_amp_idle_loop, bhv_circling_amp_loop, bhv_explosion_init, bhv_explosion_loop, bhv_bobomb_bully_death_smoke_init, bhv_bobomb_explosion_bubble_init, bhv_bobomb_explosion_bubble_loop, bhv_respawner_loop, create_respawner, bhv_bowser_bomb_loop, bhv_bowser_bomb_explosion_loop, bhv_bowser_bomb_smoke_loop, bhv_celebration_star_init, celeb_star_act_spin_around_mario, celeb_star_act_face_camera, bhv_celebration_star_loop, bhv_celebration_star_sparkle_loop, bhv_star_key_collection_puff_spawner_loop, bhv_bowling_ball_init, bowling_ball_set_hitbox, bowling_ball_set_waypoints, bhv_bowling_ball_roll_loop, bhv_bowling_ball_initialize_loop, bhv_bowling_ball_loop, bhv_generic_bowling_ball_spawner_init, bhv_generic_bowling_ball_spawner_loop, bhv_thi_bowling_ball_spawner_loop, bhv_bob_pit_bowling_ball_init, bhv_bob_pit_bowling_ball_loop, bhv_free_bowling_ball_init, bhv_free_bowling_ball_roll_loop, bhv_free_bowling_ball_loop, cap_set_hitbox, cap_despawn, cap_check_quicksand, cap_sink_quicksand, bhv_wing_cap_init, cap_scale_vertically, wing_vanish_cap_act_0, bhv_wing_vanish_cap_loop, bhv_metal_cap_init, metal_cap_act_0, bhv_metal_cap_loop, bhv_normal_cap_init, normal_cap_set_save_flags, normal_cap_act_0, bhv_normal_cap_loop, bhv_vanish_cap_init, bhv_collect_star_init, bhv_collect_star_loop, bhv_star_spawn_init, bhv_star_spawn_loop, spawn_star, spawn_default_star, spawn_red_coin_cutscene_star, spawn_no_exit_star, bhv_hidden_red_coin_star_init, bhv_hidden_red_coin_star_loop, bhv_red_coin_init, bhv_red_coin_loop, bhv_hidden_star_init, bhv_hidden_star_loop, bhv_hidden_star_trigger_loop, bhv_bowser_course_red_coin_star_loop, bhv_1up_interact, bhv_1up_common_init, bhv_1up_init, one_up_loop_in_air, pole_1up_move_towards_mario, one_up_move_away_from_mario, bhv_1up_walking_loop, bhv_1up_running_away_loop, sliding_1up_move, bhv_1up_sliding_loop, bhv_1up_loop, bhv_1up_jump_on_approach_loop, bhv_1up_hidden_loop, bhv_1up_hidden_trigger_loop, bhv_1up_hidden_in_pole_loop, bhv_1up_hidden_in_pole_trigger_loop, bhv_1up_hidden_in_pole_spawner_loop, bhv_breakable_box_small_init, small_breakable_box_spawn_dust, small_breakable_box_act_move, breakable_box_small_released_loop, breakable_box_small_idle_loop, breakable_box_small_get_dropped, breakable_box_small_get_thrown, bhv_breakable_box_small_loop });

})(window);

/* more of how objects move: ported from the Super Mario 64 decompilation (github.com/n64decomp/sm64): src/game/obj_behaviors_2.c */
(function (root) {
'use strict';
const SM64 = root.SM64, F = SM64.F = SM64.F || {}, W = SM64.W = SM64.W || {}, B = SM64.B = SM64.B || {};
const { s16, s8, sins, coss, atan2s, sqr, approach_f32, approach_s32, max, min, abs, REF, REFA, REFV } = SM64.m;
/*CONSTS*/
const { ACTIVATED_BF_PLAT_BP_MASK_TYPE, ACTIVATED_BF_PLAT_TYPE_BITFS_ELEVATOR, 
  ACTIVATED_BF_PLAT_TYPE_BITS_ARROW_PLAT, ACTIVE_FLAG_IN_DIFFERENT_ROOM, ATTACK_FAST_ATTACK, 
  ATTACK_HANDLER_DIE_IF_HEALTH_NON_POSITIVE, ATTACK_HANDLER_KNOCKBACK, ATTACK_HANDLER_NOP, 
  ATTACK_HANDLER_SET_SPEED_TO_ZERO, ATTACK_HANDLER_SPECIAL_HUGE_GOOMBA_WEAKLY_ATTACKED, 
  ATTACK_HANDLER_SPECIAL_KOOPA_LOSE_SHELL, ATTACK_HANDLER_SPECIAL_WIGGLER_JUMPED_ON, ATTACK_HANDLER_SQUISHED, 
  ATTACK_HANDLER_SQUISHED_WITH_BLUE_COIN, ATTACK_KICK_OR_TRIP, CUTSCENE_RACE_DIALOG, DIALOG_FLAG_TIME_STOP_ENABLED, 
  DIALOG_FLAG_TURN_TO_MARIO, DIALOG_RESPONSE_NO, GOOMBA_ACT_ATTACKED_MARIO, GOOMBA_ACT_JUMP, GOOMBA_ACT_WALK, 
  GOOMBA_BP_SIZE_MASK, GOOMBA_BP_TRIPLET_RESPAWN_FLAG_MASK, GOOMBA_SIZE_TINY, GOOMBA_TRIPLET_SPAWNER_ACT_UNLOADED, 
  GOOMBA_TRIPLET_SPAWNER_BP_EXTRA_GOOMBAS_MASK, GRAPH_RENDER_ACTIVE, GRAPH_RENDER_INVISIBLE, INTERACT_BOUNCE_TOP, 
  INT_STATUS_ATTACKED_MARIO, INT_STATUS_ATTACK_MASK, INT_STATUS_INTERACTED, MARIO_DIALOG_LOOK_UP, MARIO_DIALOG_STOP, 
  MODEL_BLUE_COIN, MODEL_CANNON_BARREL, MODEL_GOOMBA, MODEL_TRAJECTORY_MARKER_BALL, MODEL_WATER_BOMB, 
  OBJ_ACT_HORIZONTAL_KNOCKBACK, OBJ_ACT_SQUISHED, OBJ_ACT_VERTICAL_KNOCKBACK, OBJ_FLAG_SET_FACE_YAW_TO_MOVE_YAW, 
  OBJ_MOVE_ABOVE_LAVA, OBJ_MOVE_ENTERED_WATER, OBJ_MOVE_HIT_WALL, OBJ_MOVE_IN_AIR, OBJ_MOVE_MASK_IN_WATER, 
  OBJ_MOVE_MASK_ON_GROUND, OBJ_MOVE_UNDERWATER_ON_GROUND, O_MOVE_ANGLE_PITCH_INDEX, PLATFORM_ON_TRACK_ACT_FALL, 
  PLATFORM_ON_TRACK_ACT_INIT, PLATFORM_ON_TRACK_ACT_MOVE_ALONG_TRACK, PLATFORM_ON_TRACK_ACT_PAUSE_BRIEFLY, 
  PLATFORM_ON_TRACK_ACT_WAIT_FOR_MARIO, PLATFORM_ON_TRACK_BP_DONT_DISAPPEAR, PLATFORM_ON_TRACK_BP_DONT_TURN_ROLL, 
  PLATFORM_ON_TRACK_BP_DONT_TURN_YAW, PLATFORM_ON_TRACK_BP_MASK_PATH, PLATFORM_ON_TRACK_BP_MASK_TYPE, 
  PLATFORM_ON_TRACK_BP_RETURN_TO_START, PLATFORM_ON_TRACK_TYPE_CARPET, PLATFORM_ON_TRACK_TYPE_CHECKERED, 
  PLATFORM_ON_TRACK_TYPE_SKI_LIFT, SHAKE_POS_MEDIUM, SOUND_ENV_BOAT_ROCKING1, SOUND_ENV_ELEVATOR1, 
  SOUND_ENV_ELEVATOR3, SOUND_GENERAL_HEART_SPIN, SOUND_GENERAL_UNKNOWN4_LOWPRIO, SOUND_OBJ_CANNON4, 
  SOUND_OBJ_DEFAULT_DEATH, SOUND_OBJ_DIVING_INTO_WATER, SOUND_OBJ_DIVING_IN_WATER, SOUND_OBJ_ENEMY_DEATH_HIGH, 
  SOUND_OBJ_ENEMY_DEATH_LOW, SOUND_OBJ_GOOMBA_ALERT, SOUND_OBJ_GOOMBA_WALK, SOUND_OBJ_STOMPED, WAYPOINT_FLAGS_END, 
  WAYPOINT_FLAGS_PLATFORM_ON_TRACK_PAUSE } = SM64.C;
/*END CONSTS*/

const POS_OP_SAVE_POSITION = 0;
const POS_OP_COMPUTE_VELOCITY = 1;
const POS_OP_RESTORE_POSITION = 2;
const o = W.gCurrentObject;
let sNumActiveFirePiranhaPlants = 0;
let sNumKilledFirePiranhaPlants = 0;
let sObjSavedPosX = 0;
let sObjSavedPosY = 0;
let sObjSavedPosZ = 0;
let sMontyMoleHoleList = null;
let sMontyMoleKillStreak = 0;
let sMontyMoleLastKilledPosX = 0;
let sMontyMoleLastKilledPosY = 0;
let sMontyMoleLastKilledPosZ = 0;
let sMasterTreadmill = null;
function obj_is_rendering_enabled() {
    const o = W.gCurrentObject;
    if (o.gfx.flags & GRAPH_RENDER_ACTIVE) {
        return true;
    } else {
        return false;
    }
}
function obj_get_pitch_from_vel() {
    const o = W.gCurrentObject;
    return -atan2s(o.oForwardVel, o.oVelY);
}
function obj_update_race_proposition_dialog(dialogID) {
    let dialogResponse = F.cur_obj_update_dialog_with_cutscene(MARIO_DIALOG_LOOK_UP, (DIALOG_FLAG_TURN_TO_MARIO | DIALOG_FLAG_TIME_STOP_ENABLED), CUTSCENE_RACE_DIALOG, dialogID);
    if (dialogResponse == DIALOG_RESPONSE_NO) {
        F.set_mario_npc_dialog(MARIO_DIALOG_STOP);
        F.disable_time_stop_including_mario();
    }
    return dialogResponse;
}
function obj_set_dist_from_home(distFromHome) {
    const o = W.gCurrentObject;
    o.oPosX = o.oHomeX + distFromHome * coss(o.oMoveAngleYaw);
    o.oPosZ = o.oHomeZ + distFromHome * sins(o.oMoveAngleYaw);
}
function obj_is_near_to_and_facing_mario(maxDist, maxAngleDiff) {
    const o = W.gCurrentObject;
    if (o.oDistanceToMario < maxDist && F.abs_angle_diff(o.oMoveAngleYaw, o.oAngleToMario) < maxAngleDiff) {
        return true;
    }
    return false;
}
function obj_perform_position_op(op) {
    const o = W.gCurrentObject;
    switch (op) {
        case POS_OP_SAVE_POSITION:
            sObjSavedPosX = o.oPosX;
            sObjSavedPosY = o.oPosY;
            sObjSavedPosZ = o.oPosZ;
            break;
        case POS_OP_COMPUTE_VELOCITY:
            o.oVelX = o.oPosX - sObjSavedPosX;
            o.oVelY = o.oPosY - sObjSavedPosY;
            o.oVelZ = o.oPosZ - sObjSavedPosZ;
            break;
        case POS_OP_RESTORE_POSITION:
            o.oPosX = sObjSavedPosX;
            o.oPosY = sObjSavedPosY;
            o.oPosZ = sObjSavedPosZ;
            break;
    }
}
function platform_on_track_update_pos_or_spawn_ball(ballIndex, x, y, z) {
    const o = W.gCurrentObject;
    let trackBall = null;
    let initialPrevWaypoint = null;
    let nextWaypoint = null;
    let prevWaypoint = null;
    let filler = new Array(4).fill(0);
    let amountToMove = 0;
    let dx = 0;
    let dy = 0;
    let dz = 0;
    let distToNextWaypoint = 0;
    if (ballIndex == 0 || ((((o.oBhvParams >> 16)) & 0xFFFF) & 0x0080)) {
        initialPrevWaypoint = o.oPlatformOnTrackPrevWaypoint;
        nextWaypoint = initialPrevWaypoint;
        if (ballIndex != 0) {
            amountToMove = 300.0 * ballIndex;
        } else {
            obj_perform_position_op(POS_OP_SAVE_POSITION);
            o.oPlatformOnTrackPrevWaypointFlags = 0;
            amountToMove = o.oForwardVel;
        }
        do {
            prevWaypoint = nextWaypoint;
            nextWaypoint++;
            if (nextWaypoint.flags == WAYPOINT_FLAGS_END) {
                if (ballIndex == 0) {
                    o.oPlatformOnTrackPrevWaypointFlags = WAYPOINT_FLAGS_END;
                }
                if (((((o.oBhvParams >> 16)) & 0xFFFF) & PLATFORM_ON_TRACK_BP_RETURN_TO_START)) {
                    nextWaypoint = o.oPlatformOnTrackStartWaypoint;
                } else {
                    return;
                }
            }
            dx = nextWaypoint.pos[0] - x;
            dy = nextWaypoint.pos[1] - y;
            dz = nextWaypoint.pos[2] - z;
            distToNextWaypoint = Math.sqrt(dx * dx + dy * dy + dz * dz);
            amountToMove -= distToNextWaypoint;
            x += dx;
            y += dy;
            z += dz;
        } while (amountToMove > 0.0);
        distToNextWaypoint = amountToMove / distToNextWaypoint;
        x += dx * distToNextWaypoint;
        y += dy * distToNextWaypoint;
        z += dz * distToNextWaypoint;
        if (ballIndex != 0) {
            trackBall = spawn_object_relative(o.oPlatformOnTrackBaseBallIndex + ballIndex, 0, 0, 0, o, MODEL_TRAJECTORY_MARKER_BALL,B.bhvTrackBall);
            if (trackBall != null) {
                trackBall.oPosX = x;
                trackBall.oPosY = y;
                trackBall.oPosZ = z;
            }
        } else {
            if (prevWaypoint != initialPrevWaypoint) {
                if (o.oPlatformOnTrackPrevWaypointFlags == 0) {
                    o.oPlatformOnTrackPrevWaypointFlags = initialPrevWaypoint.flags;
                }
                o.oPlatformOnTrackPrevWaypoint = prevWaypoint;
            }
            o.oPosX = x;
            o.oPosY = y;
            o.oPosZ = z;
            obj_perform_position_op(POS_OP_COMPUTE_VELOCITY);
            o.oPlatformOnTrackPitch =
                atan2s(Math.sqrt(o.oVelX * o.oVelX + o.oVelZ * o.oVelZ), -o.oVelY);
            o.oPlatformOnTrackYaw = atan2s(o.oVelZ, o.oVelX);
        }
    }
}
function cur_obj_spin_all_dimensions(arg0, arg1) {
    const o = W.gCurrentObject;
    let val24 = 0;
    let val20 = 0;
    let val1C = 0;
    let c = 0;
    let s = 0;
    let val10 = 0;
    let val0C = 0;
    let val08 = 0;
    let val04 = 0;
    let val00 = 0;
    if (o.oForwardVel == 0.0) {
        val24 = val20 = val1C = 0.0;
        if (o.oMoveFlags & OBJ_MOVE_IN_AIR) {
            val20 = 50.0;
        } else {
            if (o.oFaceAnglePitch < 0) {
                val1C = -arg0;
            } else if (o.oFaceAnglePitch > 0) {
                val1C = arg0;
            }
            if (o.oFaceAngleRoll < 0) {
                val24 = -arg1;
            } else if (o.oFaceAngleRoll > 0) {
                val24 = arg1;
            }
        }
        c = coss(o.oFaceAnglePitch);
        s = sins(o.oFaceAnglePitch);
        val08 = val1C * c + val20 * s;
        val0C = val20 * c - val1C * s;
        c = coss(o.oFaceAngleRoll);
        s = sins(o.oFaceAngleRoll);
        val04 = val24 * c + val0C * s;
        val0C = val0C * c - val24 * s;
        c = coss(o.oFaceAngleYaw);
        s = sins(o.oFaceAngleYaw);
        val10 = val04 * c - val08 * s;
        val08 = val08 * c + val04 * s;
        val04 = val24 * c - val1C * s;
        val00 = val1C * c + val24 * s;
        o.oPosX = o.oHomeX - val04 + val10;
        o.oGraphYOffset = val20 - val0C;
        o.oPosZ = o.oHomeZ + val00 - val08;
    }
}
function obj_rotate_yaw_and_bounce_off_walls(targetYaw, turnAmount) {
    const o = W.gCurrentObject;
    if (o.oMoveFlags & OBJ_MOVE_HIT_WALL) {
        targetYaw = s16(F.cur_obj_reflect_move_angle_off_wall());
    }
    F.cur_obj_rotate_yaw_toward(targetYaw, turnAmount);
}
function obj_get_pitch_to_home(latDistToHome) {
    const o = W.gCurrentObject;
    return atan2s(latDistToHome, o.oPosY - o.oHomeY);
}
function obj_compute_vel_from_move_pitch(speed) {
    const o = W.gCurrentObject;
    o.oForwardVel = speed * coss(o.oMoveAnglePitch);
    o.oVelY = speed * -sins(o.oMoveAnglePitch);
}
function cur_obj_init_anim_extend(arg0) {
    F.cur_obj_init_animation_with_sound(arg0);
    cur_obj_extend_animation_if_at_end();
}
function cur_obj_init_anim_and_check_if_end(arg0) {
    F.cur_obj_init_animation_with_sound(arg0);
    return F.cur_obj_check_if_near_animation_end();
}
function cur_obj_init_anim_check_frame(arg0, arg1) {
    F.cur_obj_init_animation_with_sound(arg0);
    return F.cur_obj_check_anim_frame(arg1);
}
function cur_obj_set_anim_if_at_end(arg0) {
    if (F.cur_obj_check_if_at_animation_end()) {
        F.cur_obj_init_animation_with_sound(arg0);
        return true;
    }
    return false;
}
function cur_obj_play_sound_at_anim_range(arg0, arg1, sound) {
    const o = W.gCurrentObject;
    let val04 = 0;
    if ((val04 = o.gfx.anim.accel / 0x10000) <= 0) {
        val04 = 1;
    }
    if (F.cur_obj_check_anim_frame_in_range(arg0, val04) || F.cur_obj_check_anim_frame_in_range(arg1, val04)) {
        cur_obj_play_sound_2(sound);
        return true;
    }
    return false;
}
function obj_turn_pitch_toward_mario(targetOffsetY, turnAmount) {
    const o = W.gCurrentObject;
    let targetPitch = 0;
    o.oPosY -= targetOffsetY;
    targetPitch = s16(F.obj_turn_toward_object(o, W.gMarioObject, O_MOVE_ANGLE_PITCH_INDEX, turnAmount));
    o.oPosY += targetOffsetY;
    return targetPitch;
}
function obj_forward_vel_approach(target, delta) {
    const o = W.gCurrentObject;
    return F.approach_f32_ptr(REF(o, 'oForwardVel'), target, delta);
}
function obj_y_vel_approach(target, delta) {
    const o = W.gCurrentObject;
    return F.approach_f32_ptr(REF(o, 'oVelY'), target, delta);
}
function obj_move_pitch_approach(target, delta) {
    const o = W.gCurrentObject;
    o.oMoveAnglePitch = F.approach_s16_symmetric(o.oMoveAnglePitch, target, delta);
    if (s16(o.oMoveAnglePitch) == target) {
        return true;
    }
    return false;
}
function obj_face_pitch_approach(targetPitch, deltaPitch) {
    const o = W.gCurrentObject;
    o.oFaceAnglePitch = F.approach_s16_symmetric(o.oFaceAnglePitch, targetPitch, deltaPitch);
    if (s16(o.oFaceAnglePitch) == targetPitch) {
        return true;
    }
    return false;
}
function obj_face_yaw_approach(targetYaw, deltaYaw) {
    const o = W.gCurrentObject;
    o.oFaceAngleYaw = F.approach_s16_symmetric(o.oFaceAngleYaw, targetYaw, deltaYaw);
    if (s16(o.oFaceAngleYaw) == targetYaw) {
        return true;
    }
    return false;
}
function obj_face_roll_approach(targetRoll, deltaRoll) {
    const o = W.gCurrentObject;
    o.oFaceAngleRoll = F.approach_s16_symmetric(o.oFaceAngleRoll, targetRoll, deltaRoll);
    if (s16(o.oFaceAngleRoll) == targetRoll) {
        return true;
    }
    return false;
}
function obj_roll_to_match_yaw_turn(targetYaw, maxRoll, rollSpeed) {
    const o = W.gCurrentObject;
    let targetRoll = s16(o.oMoveAngleYaw - targetYaw);
    F.clamp_s16(REFV(() => targetRoll, $ => targetRoll = $), -maxRoll, maxRoll);
    obj_face_roll_approach(targetRoll, rollSpeed);
}
function random_linear_offset(base, range) {
    return base + s16((range * F.random_float()));
}
function random_mod_offset(base, step, mod) {
    return base + step * (F.random_u16() % mod);
}
function obj_random_fixed_turn(delta) {
    const o = W.gCurrentObject;
    return o.oMoveAngleYaw + s16(F.random_sign()) * delta;
}
function obj_resolve_collisions_and_turn(targetYaw, turnSpeed) {
    F.obj_resolve_object_collisions(null);
    if (F.cur_obj_rotate_yaw_toward(targetYaw, turnSpeed)) {
        return false;
    } else {
        return true;
    }
}
function obj_die_if_health_non_positive() {
    const o = W.gCurrentObject;
    if (o.oHealth <= 0) {
        if (o.oDeathSound == 0) {
            F.spawn_mist_particles_with_sound(SOUND_OBJ_DEFAULT_DEATH);
        } else if (o.oDeathSound > 0) {
            F.spawn_mist_particles_with_sound(o.oDeathSound);
        } else {
            F.spawn_mist_particles();
        }
        if (o.oNumLootCoins < 0) {
            spawn_object(o, MODEL_BLUE_COIN,B.bhvSpawnedBlueCoin);
        } else {
            F.obj_spawn_loot_yellow_coins(o, o.oNumLootCoins, 20.0);
        }
        F.obj_spawn_loot_yellow_coins(o, o.oNumLootCoins, 20.0);
        if (o.oHealth < 0) {
            F.cur_obj_hide();
            F.cur_obj_become_intangible();
        } else {
            F.obj_mark_for_deletion(o);
        }
    }
}
function obj_unused_die() {
    const o = W.gCurrentObject;
    o.oHealth = 0;
    obj_die_if_health_non_positive();
}
function obj_set_knockback_action(attackType) {
    const o = W.gCurrentObject;
    switch (attackType) {
        case ATTACK_KICK_OR_TRIP:
        case ATTACK_FAST_ATTACK:
            o.oAction = OBJ_ACT_VERTICAL_KNOCKBACK;
            o.oForwardVel = 20.0;
            o.oVelY = 50.0;
            break;
        default:
            o.oAction = OBJ_ACT_HORIZONTAL_KNOCKBACK;
            o.oForwardVel = 50.0;
            o.oVelY = 30.0;
            break;
    }
    o.oFlags &= ~OBJ_FLAG_SET_FACE_YAW_TO_MOVE_YAW;
    o.oMoveAngleYaw = F.obj_angle_to_object(W.gMarioObject, o);
}
function obj_set_squished_action() {
    const o = W.gCurrentObject;
    cur_obj_play_sound_2(SOUND_OBJ_STOMPED);
    o.oAction = OBJ_ACT_SQUISHED;
}
function obj_die_if_above_lava_and_health_non_positive() {
    const o = W.gCurrentObject;
    if (o.oMoveFlags & OBJ_MOVE_UNDERWATER_ON_GROUND) {
        if (o.oGravity + o.oBuoyancy > 0.0 || F.find_water_level(o.oPosX, o.oPosZ) - o.oPosY < 150.0) {
            return false;
        }
    } else if (!(o.oMoveFlags & OBJ_MOVE_ABOVE_LAVA)) {
        if (o.oMoveFlags & OBJ_MOVE_ENTERED_WATER) {
            if (o.oWallHitboxRadius < 200.0) {
                cur_obj_play_sound_2(SOUND_OBJ_DIVING_INTO_WATER);
            } else {
                cur_obj_play_sound_2(SOUND_OBJ_DIVING_IN_WATER);
            }
        }
        return false;
    }
    obj_die_if_health_non_positive();
    return true;
}
function obj_handle_attacks(hitbox, attackedMarioAction, attackHandlers) {
    const o = W.gCurrentObject;
    let attackType = 0;
    F.obj_set_hitbox(o, hitbox);
    if (obj_die_if_above_lava_and_health_non_positive()) {
        return 1;
    } else if (o.oInteractStatus & INT_STATUS_INTERACTED) {
        if (o.oInteractStatus & INT_STATUS_ATTACKED_MARIO) {
            if (o.oAction != attackedMarioAction) {
                o.oAction = attackedMarioAction;
                o.oTimer = 0;
            }
        } else {
            attackType = o.oInteractStatus & INT_STATUS_ATTACK_MASK;
            switch (attackHandlers[attackType - 1]) {
                case ATTACK_HANDLER_NOP:
                    break;
                case ATTACK_HANDLER_DIE_IF_HEALTH_NON_POSITIVE:
                    obj_die_if_health_non_positive();
                    break;
                case ATTACK_HANDLER_KNOCKBACK:
                    obj_set_knockback_action(attackType);
                    break;
                case ATTACK_HANDLER_SQUISHED:
                    obj_set_squished_action();
                    break;
                case ATTACK_HANDLER_SPECIAL_KOOPA_LOSE_SHELL:
                    F.shelled_koopa_attack_handler(attackType);
                    break;
                case ATTACK_HANDLER_SET_SPEED_TO_ZERO:
                    F.obj_set_speed_to_zero();
                    break;
                case ATTACK_HANDLER_SPECIAL_WIGGLER_JUMPED_ON:
                    F.wiggler_jumped_on_attack_handler();
                    break;
                case ATTACK_HANDLER_SPECIAL_HUGE_GOOMBA_WEAKLY_ATTACKED:
                    huge_goomba_weakly_attacked();
                    break;
                case ATTACK_HANDLER_SQUISHED_WITH_BLUE_COIN:
                    o.oNumLootCoins = -1;
                    obj_set_squished_action();
                    break;
            }
            o.oInteractStatus = 0;
            return attackType;
        }
    }
    o.oInteractStatus = 0;
    return 0;
}
function obj_act_knockback(baseScale) {
    const o = W.gCurrentObject;
    F.cur_obj_update_floor_and_walls();
    if (o.gfx.anim.anim != null) {
        cur_obj_extend_animation_if_at_end();
    }
    if ((o.oMoveFlags & (OBJ_MOVE_MASK_ON_GROUND | OBJ_MOVE_MASK_IN_WATER | OBJ_MOVE_HIT_WALL | OBJ_MOVE_ABOVE_LAVA)) || (o.oAction == OBJ_ACT_VERTICAL_KNOCKBACK && o.oTimer >= 9)) {
        obj_die_if_health_non_positive();
    }
    F.cur_obj_move_standard(-78);
}
function obj_act_squished(baseScale) {
    const o = W.gCurrentObject;
    let targetScaleY = baseScale * 0.3;
    F.cur_obj_update_floor_and_walls();
    if (o.gfx.anim.anim != null) {
        cur_obj_extend_animation_if_at_end();
    }
    if (F.approach_f32_ptr(REFA(o.gfx.scale, 1), targetScaleY, baseScale * 0.14)) {
        o.gfx.scale[0] = o.gfx.scale[2] = baseScale * 2.0 - o.gfx.scale[1];
        if (o.oTimer > 15) {
            obj_die_if_health_non_positive();
        }
    }
    o.oForwardVel = 0.0;
    F.cur_obj_move_standard(-78);
}
function obj_update_standard_actions(scale) {
    const o = W.gCurrentObject;
    if (o.oAction < 100) {
        return true;
    } else {
        F.cur_obj_become_intangible();
        switch (o.oAction) {
            case OBJ_ACT_HORIZONTAL_KNOCKBACK:
            case OBJ_ACT_VERTICAL_KNOCKBACK:
                obj_act_knockback(scale);
                break;
            case OBJ_ACT_SQUISHED:
                obj_act_squished(scale);
                break;
        }
        return false;
    }
}
function obj_check_attacks(hitbox, attackedMarioAction) {
    const o = W.gCurrentObject;
    let attackType = 0;
    F.obj_set_hitbox(o, hitbox);
    if (obj_die_if_above_lava_and_health_non_positive()) {
        return 1;
    } else if (o.oInteractStatus & INT_STATUS_INTERACTED) {
        if (o.oInteractStatus & INT_STATUS_ATTACKED_MARIO) {
            if (o.oAction != attackedMarioAction) {
                o.oAction = attackedMarioAction;
                o.oTimer = 0;
            }
        } else {
            attackType = o.oInteractStatus & INT_STATUS_ATTACK_MASK;
            obj_die_if_health_non_positive();
            o.oInteractStatus = 0;
            return attackType;
        }
    }
    o.oInteractStatus = 0;
    return 0;
}
function obj_move_for_one_second(endAction) {
    const o = W.gCurrentObject;
    F.cur_obj_update_floor_and_walls();
    cur_obj_extend_animation_if_at_end();
    if (o.oTimer > 30) {
        o.oAction = endAction;
        return true;
    }
    F.cur_obj_move_standard(-78);
    return false;
}
function treat_far_home_as_mario(threshold) {
    const o = W.gCurrentObject;
    let dx = o.oHomeX - o.oPosX;
    let dy = o.oHomeY - o.oPosY;
    let dz = o.oHomeZ - o.oPosZ;
    let distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (distance > threshold) {
        o.oAngleToMario = atan2s(dz, dx);
        o.oDistanceToMario = 25000.0;
    } else {
        dx = o.oHomeX - W.gMarioObject.oPosX;
        dy = o.oHomeY - W.gMarioObject.oPosY;
        dz = o.oHomeZ - W.gMarioObject.oPosZ;
        distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (distance > threshold) {
            o.oDistanceToMario = 20000.0;
        }
    }
}
let sGoombaHitbox = { interactType: INTERACT_BOUNCE_TOP, downOffset: 0, damageOrCoinValue: 1, health: 0, numLootCoins: 1, radius: 72, height: 50, hurtboxRadius: 42, hurtboxHeight: 40 };
let sGoombaProperties = { scale: [1.5, SOUND_OBJ_ENEMY_DEATH_HIGH, 4000, 1], deathSound: [3.5, SOUND_OBJ_ENEMY_DEATH_LOW, 4000, 2], drawDistance: [0.5, SOUND_OBJ_ENEMY_DEATH_HIGH, 1500, 0] };
let sGoombaAttackHandlers = [[ATTACK_HANDLER_KNOCKBACK, ATTACK_HANDLER_KNOCKBACK, ATTACK_HANDLER_SQUISHED, ATTACK_HANDLER_SQUISHED, ATTACK_HANDLER_KNOCKBACK, ATTACK_HANDLER_KNOCKBACK], [ATTACK_HANDLER_SPECIAL_HUGE_GOOMBA_WEAKLY_ATTACKED, ATTACK_HANDLER_SPECIAL_HUGE_GOOMBA_WEAKLY_ATTACKED, ATTACK_HANDLER_SQUISHED, ATTACK_HANDLER_SQUISHED_WITH_BLUE_COIN, ATTACK_HANDLER_SPECIAL_HUGE_GOOMBA_WEAKLY_ATTACKED, ATTACK_HANDLER_SPECIAL_HUGE_GOOMBA_WEAKLY_ATTACKED]];
function bhv_goomba_triplet_spawner_update() {
    const o = W.gCurrentObject;
    let filler1 = new Array(4).fill(0);
    let goombaFlag = 0;
    let filler2 = new Array(2).fill(0);
    let angle = 0;
    if (o.oAction == GOOMBA_TRIPLET_SPAWNER_ACT_UNLOADED) {
        if (o.oDistanceToMario < 3000.0) {
            let dAngle = 0x10000 / (((o.oBhvParams2ndByte & GOOMBA_TRIPLET_SPAWNER_BP_EXTRA_GOOMBAS_MASK) >> 2) + 3);
            for (angle = 0, goombaFlag = 1 << 8; angle < 0xFFFF; angle += dAngle, goombaFlag <<= 1) {
                if (!(o.oBhvParams & goombaFlag)) {
                    let dx = s16(500.0 * coss(angle));
                    let dz = s16(500.0 * sins(angle));
                    spawn_object_relative((o.oBhvParams2ndByte & GOOMBA_BP_SIZE_MASK) | (goombaFlag >> 6), dx, 0, dz, o, MODEL_GOOMBA,B.bhvGoomba);
                }
            }
            o.oAction++;
        }
    } else if (o.oDistanceToMario > 4000.0) {
        o.oAction = GOOMBA_TRIPLET_SPAWNER_ACT_UNLOADED;
    }
}
function bhv_goomba_init() {
    const o = W.gCurrentObject;
    o.oGoombaSize = o.oBhvParams2ndByte & GOOMBA_BP_SIZE_MASK;
    o.oGoombaScale = sGoombaProperties[o.oGoombaSize].scale;
    o.oDeathSound = sGoombaProperties[o.oGoombaSize].deathSound;
    F.obj_set_hitbox(o, sGoombaHitbox);
    o.oDrawingDistance = sGoombaProperties[o.oGoombaSize].drawDistance;
    o.oDamageOrCoinValue = sGoombaProperties[o.oGoombaSize].damage;
    o.oGravity = -8.0 / 3.0 * o.oGoombaScale;
}
function goomba_begin_jump() {
    const o = W.gCurrentObject;
    cur_obj_play_sound_2(SOUND_OBJ_GOOMBA_ALERT);
    o.oAction = GOOMBA_ACT_JUMP;
    o.oForwardVel = 0.0;
    o.oVelY = 50.0 / 3.0 * o.oGoombaScale;
}
function mark_goomba_as_dead() {
    const o = W.gCurrentObject;
    if (o.parentObj != o) {
        F.set_object_respawn_info_bits( o.parentObj, (o.oBhvParams2ndByte & GOOMBA_BP_TRIPLET_RESPAWN_FLAG_MASK) >> 2);
        o.parentObj.oBhvParams =
            o.parentObj.oBhvParams | (o.oBhvParams2ndByte & GOOMBA_BP_TRIPLET_RESPAWN_FLAG_MASK) << 6;
    }
}
function goomba_act_walk() {
    const o = W.gCurrentObject;
    treat_far_home_as_mario(1000.0);
    obj_forward_vel_approach(o.oGoombaRelativeSpeed * o.oGoombaScale, 0.4);
    if (o.oGoombaRelativeSpeed > 4.0 / 3.0) {
        cur_obj_play_sound_at_anim_range(2, 17, SOUND_OBJ_GOOMBA_WALK);
    }
    if (o.oGoombaTurningAwayFromWall) {
        o.oGoombaTurningAwayFromWall = obj_resolve_collisions_and_turn(o.oGoombaTargetYaw, 0x200);
    } else {
        if (o.oDistanceToMario >= 25000.0) {
            o.oGoombaTargetYaw = o.oAngleToMario;
            o.oGoombaWalkTimer = random_linear_offset(20, 30);
        }
        if (!(o.oGoombaTurningAwayFromWall = F.obj_bounce_off_walls_edges_objects(REF(o, 'oGoombaTargetYaw')))) {
            if (o.oDistanceToMario < 500.0) {
                if (o.oGoombaRelativeSpeed <= 2.0) {
                    goomba_begin_jump();
                }
                o.oGoombaTargetYaw = o.oAngleToMario;
                o.oGoombaRelativeSpeed = 20.0;
            } else {
                o.oGoombaRelativeSpeed = 4.0 / 3.0;
                if (o.oGoombaWalkTimer != 0) {
                    o.oGoombaWalkTimer--;
                } else {
                    if (F.random_u16() & 3) {
                        o.oGoombaTargetYaw = obj_random_fixed_turn(0x2000);
                        o.oGoombaWalkTimer = random_linear_offset(100, 100);
                    } else {
                        goomba_begin_jump();
                        o.oGoombaTargetYaw = obj_random_fixed_turn(0x6000);
                    }
                }
            }
        }
        F.cur_obj_rotate_yaw_toward(o.oGoombaTargetYaw, 0x200);
    }
}
function goomba_act_attacked_mario() {
    const o = W.gCurrentObject;
    if (o.oGoombaSize == GOOMBA_SIZE_TINY) {
        mark_goomba_as_dead();
        o.oNumLootCoins = 0;
        obj_die_if_health_non_positive();
    } else {
        goomba_begin_jump();
        o.oGoombaTargetYaw = o.oAngleToMario;
        o.oGoombaTurningAwayFromWall = false;
    }
}
function goomba_act_jump() {
    const o = W.gCurrentObject;
    F.obj_resolve_object_collisions(null);
    if (o.oMoveFlags & OBJ_MOVE_MASK_ON_GROUND) {
        o.oAction = GOOMBA_ACT_WALK;
    } else {
        F.cur_obj_rotate_yaw_toward(o.oGoombaTargetYaw, 0x800);
    }
}
function huge_goomba_weakly_attacked() {
    const o = W.gCurrentObject;
    o.oAction = GOOMBA_ACT_ATTACKED_MARIO;
}
function bhv_goomba_update() {
    const o = W.gCurrentObject;
    let animSpeed = 0;
    if (obj_update_standard_actions(o.oGoombaScale)) {
        if (o.parentObj != o) {
            if (o.parentObj.oAction == GOOMBA_TRIPLET_SPAWNER_ACT_UNLOADED) {
                F.obj_mark_for_deletion(o);
            }
        }
        F.cur_obj_scale(o.oGoombaScale);
        F.obj_update_blinking(REF(o, 'oGoombaBlinkTimer'), 30, 50, 5);
        F.cur_obj_update_floor_and_walls();
        if ((animSpeed = o.oForwardVel / o.oGoombaScale * 0.4) < 1.0) {
            animSpeed = 1.0;
        }
        F.cur_obj_init_animation_with_accel_and_sound(0, animSpeed);
        switch (o.oAction) {
            case GOOMBA_ACT_WALK:
                goomba_act_walk();
                break;
            case GOOMBA_ACT_ATTACKED_MARIO:
                goomba_act_attacked_mario();
                break;
            case GOOMBA_ACT_JUMP:
                goomba_act_jump();
                break;
        }
        if (obj_handle_attacks(sGoombaHitbox, GOOMBA_ACT_ATTACKED_MARIO, sGoombaAttackHandlers[o.oGoombaSize & 1])) {
            mark_goomba_as_dead();
        }
        F.cur_obj_move_standard(-78);
    } else {
        o.oAnimState = 1;
    }
}
let sPlatformOnTrackCollisionModels = [W.SYM('rr_seg7_collision_07029038'),W.SYM('ccm_seg7_collision_070163F8'),W.SYM('checkerboard_platform_seg8_collision_0800D710'),W.SYM('bitfs_seg7_collision_070157E0')];
let sPlatformOnTrackPaths = [W.SYM('rr_seg7_trajectory_0702EC3C'),W.SYM('rr_seg7_trajectory_0702ECC0'),W.SYM('ccm_seg7_trajectory_0701669C'),W.SYM('bitfs_seg7_trajectory_070159AC'),W.SYM('hmc_seg7_trajectory_0702B86C'),W.SYM('lll_seg7_trajectory_0702856C'),W.SYM('lll_seg7_trajectory_07028660'),W.SYM('rr_seg7_trajectory_0702ED9C'),W.SYM('rr_seg7_trajectory_0702EEE0')];
function platform_on_track_reset() {
    const o = W.gCurrentObject;
    o.oAction = PLATFORM_ON_TRACK_ACT_INIT;
    o.oPlatformOnTrackBaseBallIndex += 99;
}
function platform_on_track_mario_not_on_platform() {
    const o = W.gCurrentObject;
    if (!((((o.oBhvParams >> 16)) & 0xFFFF) & PLATFORM_ON_TRACK_BP_DONT_DISAPPEAR)) {
        if (F.cur_obj_wait_then_blink(150, 40)) {
            platform_on_track_reset();
            o.gfx.flags &= ~GRAPH_RENDER_INVISIBLE;
        }
    }
}
function bhv_platform_on_track_init() {
    const o = W.gCurrentObject;
    if (!(o.activeFlags & ACTIVE_FLAG_IN_DIFFERENT_ROOM)) {
        let pathIndex = s16((((o.oBhvParams >> 16)) & 0xFFFF) & PLATFORM_ON_TRACK_BP_MASK_PATH);
        o.oPlatformOnTrackType = ((((o.oBhvParams >> 16)) & 0xFFFF) & PLATFORM_ON_TRACK_BP_MASK_TYPE) >> 4;
        o.oPlatformOnTrackIsNotSkiLift = o.oPlatformOnTrackType - PLATFORM_ON_TRACK_TYPE_SKI_LIFT;
        o.collisionData =
            sPlatformOnTrackCollisionModels[o.oPlatformOnTrackType];
        o.oPlatformOnTrackStartWaypoint = sPlatformOnTrackPaths[pathIndex];
        o.oPlatformOnTrackIsNotHMC = pathIndex - 4;
        o.oBhvParams2ndByte = o.oMoveAngleYaw; 
        if (o.oPlatformOnTrackType == PLATFORM_ON_TRACK_TYPE_CHECKERED) {
            o.gfx.scale[1] = 2.0;
        }
    }
}
function platform_on_track_act_init() {
    const o = W.gCurrentObject;
    let i = 0;
    o.oPlatformOnTrackPrevWaypoint = o.oPlatformOnTrackStartWaypoint;
    o.oPlatformOnTrackPrevWaypointFlags = 0;
    o.oPlatformOnTrackBaseBallIndex = 0;
    o.oPosX = o.oHomeX = o.oPlatformOnTrackStartWaypoint.pos[0];
    o.oPosY = o.oHomeY = o.oPlatformOnTrackStartWaypoint.pos[1];
    o.oPosZ = o.oHomeZ = o.oPlatformOnTrackStartWaypoint.pos[2];
    o.oFaceAngleYaw = o.oBhvParams2ndByte;
    o.oForwardVel = o.oVelX = o.oVelY = o.oVelZ = o.oPlatformOnTrackDistMovedSinceLastBall = 0.0;
    o.oPlatformOnTrackWasStoodOn = false;
    if (o.oPlatformOnTrackIsNotSkiLift) {
        o.oFaceAngleRoll = 0;
    }
    for (i = 1; i < 6; i++) {
        platform_on_track_update_pos_or_spawn_ball(i, o.oHomeX, o.oHomeY, o.oHomeZ);
    }
    o.oAction = PLATFORM_ON_TRACK_ACT_WAIT_FOR_MARIO;
}
function platform_on_track_act_wait_for_mario() {
    const o = W.gCurrentObject;
    if (W.gMarioObject.platform == o) {
        if (o.oTimer > 20) {
            o.oAction = PLATFORM_ON_TRACK_ACT_MOVE_ALONG_TRACK;
        }
    } else {
        if (o.activeFlags & ACTIVE_FLAG_IN_DIFFERENT_ROOM) {
            platform_on_track_reset();
        }
        o.oTimer = 0;
    }
}
function platform_on_track_act_move_along_track() {
    let initialAngle = 0;
    if (!o.oPlatformOnTrackIsNotSkiLift) {
        cur_obj_play_sound_1(SOUND_ENV_ELEVATOR3);
    } else if (!o.oPlatformOnTrackIsNotHMC) {
        cur_obj_play_sound_1(SOUND_ENV_ELEVATOR1);
    }
    if (o.oPlatformOnTrackPrevWaypointFlags == WAYPOINT_FLAGS_END && !((((o.oBhvParams >> 16)) & 0xFFFF) & PLATFORM_ON_TRACK_BP_RETURN_TO_START)) {
        o.oAction = PLATFORM_ON_TRACK_ACT_FALL;
    } else {
        if (o.oPlatformOnTrackPrevWaypointFlags != 0 && !o.oPlatformOnTrackIsNotSkiLift) {
            if (o.oPlatformOnTrackPrevWaypointFlags == WAYPOINT_FLAGS_END || o.oPlatformOnTrackPrevWaypointFlags == WAYPOINT_FLAGS_PLATFORM_ON_TRACK_PAUSE) {
                cur_obj_play_sound_2(SOUND_GENERAL_UNKNOWN4_LOWPRIO);
                o.oForwardVel = 0.0;
                if (o.oPlatformOnTrackPrevWaypointFlags == WAYPOINT_FLAGS_END) {
                    o.oAction = PLATFORM_ON_TRACK_ACT_INIT;
                } else {
                    o.oAction = PLATFORM_ON_TRACK_ACT_PAUSE_BRIEFLY;
                }
            }
        } else {
            if (!o.oPlatformOnTrackIsNotSkiLift) {
                obj_forward_vel_approach(10.0, 0.1);
            } else {
                o.oForwardVel = 10.0;
            }
            if (F.approach_f32_ptr(REF(o, 'oPlatformOnTrackDistMovedSinceLastBall'), 300.0, o.oForwardVel)) {
                o.oPlatformOnTrackDistMovedSinceLastBall -= 300.0;
                o.oHomeX = o.oPosX;
                o.oHomeY = o.oPosY;
                o.oHomeZ = o.oPosZ;
                o.oPlatformOnTrackBaseBallIndex = (((o.oPlatformOnTrackBaseBallIndex + 1)) & 0xFFFF);
                platform_on_track_update_pos_or_spawn_ball(5, o.oHomeX, o.oHomeY, o.oHomeZ);
            }
        }
        platform_on_track_update_pos_or_spawn_ball(0, o.oPosX, o.oPosY, o.oPosZ);
        o.oMoveAnglePitch = o.oPlatformOnTrackPitch;
        o.oMoveAngleYaw = o.oPlatformOnTrackYaw;
        if (!((((o.oBhvParams >> 16)) & 0xFFFF) & PLATFORM_ON_TRACK_BP_DONT_TURN_YAW)) {
            let targetFaceYaw = s16(o.oMoveAngleYaw + 0x4000);
            let yawSpeed = s16(F.abs_angle_diff(targetFaceYaw, o.oFaceAngleYaw) / 20);
            initialAngle = s16(o.oFaceAngleYaw);
            F.clamp_s16(REFV(() => yawSpeed, $ => yawSpeed = $), 100, 500);
            obj_face_yaw_approach(targetFaceYaw, yawSpeed);
            o.oAngleVelYaw = s16(o.oFaceAngleYaw) - initialAngle;
        }
        if (((((o.oBhvParams >> 16)) & 0xFFFF) & PLATFORM_ON_TRACK_BP_DONT_TURN_ROLL)) {
            let rollSpeed = s16(F.abs_angle_diff(o.oMoveAnglePitch, o.oFaceAngleRoll) / 20);
            initialAngle = s16(o.oFaceAngleRoll);
            F.clamp_s16(REFV(() => rollSpeed, $ => rollSpeed = $), 100, 500);
            obj_face_roll_approach(o.oMoveAnglePitch, rollSpeed);
            o.oAngleVelRoll = s16(o.oFaceAngleRoll) - initialAngle;
        }
    }
    if (W.gMarioObject.platform != o) {
        platform_on_track_mario_not_on_platform();
    } else {
        o.oTimer = 0;
        o.gfx.flags &= ~GRAPH_RENDER_INVISIBLE;
    }
}
function platform_on_track_act_pause_briefly() {
    const o = W.gCurrentObject;
    if (o.oTimer > 20) {
        o.oAction = PLATFORM_ON_TRACK_ACT_MOVE_ALONG_TRACK;
    }
}
function platform_on_track_act_fall() {
    const o = W.gCurrentObject;
    F.cur_obj_move_using_vel_and_gravity();
    if (W.gMarioObject.platform != o) {
        platform_on_track_mario_not_on_platform();
    } else {
        o.oTimer = 0;
    }
}
function platform_on_track_rock_ski_lift() {
    const o = W.gCurrentObject;
    let targetRoll = 0;
    let initialRoll = o.oFaceAngleRoll;
    o.oFaceAngleRoll += Math.trunc(o.oPlatformOnTrackSkiLiftRollVel);
    if (W.gMarioObject.platform == o) {
        targetRoll = o.oForwardVel * sins(o.oMoveAngleYaw) * -50.0
                     + Math.trunc((o.oDistanceToMario * sins(o.oAngleToMario - o.oFaceAngleYaw) * -4.0));
    }
    F.oscillate_toward( REF(o, 'oFaceAngleRoll'), REF(o, 'oPlatformOnTrackSkiLiftRollVel'), targetRoll, 5.0, 6.0, 1.5);
    F.clamp_f32(REF(o, 'oPlatformOnTrackSkiLiftRollVel'), -100.0, 100.0);
}
function bhv_platform_on_track_update() {
    const o = W.gCurrentObject;
    switch (o.oAction) {
        case PLATFORM_ON_TRACK_ACT_INIT:
            platform_on_track_act_init();
            break;
        case PLATFORM_ON_TRACK_ACT_WAIT_FOR_MARIO:
            platform_on_track_act_wait_for_mario();
            break;
        case PLATFORM_ON_TRACK_ACT_MOVE_ALONG_TRACK:
            platform_on_track_act_move_along_track();
            break;
        case PLATFORM_ON_TRACK_ACT_PAUSE_BRIEFLY:
            platform_on_track_act_pause_briefly();
            break;
        case PLATFORM_ON_TRACK_ACT_FALL:
            platform_on_track_act_fall();
            break;
    }
    if (!o.oPlatformOnTrackIsNotSkiLift) {
        platform_on_track_rock_ski_lift();
    } else if (o.oPlatformOnTrackType == PLATFORM_ON_TRACK_TYPE_CARPET) {
        if (!o.oPlatformOnTrackWasStoodOn && W.gMarioObject.platform == o) {
            o.oPlatformOnTrackOffsetY = -8.0;
            o.oPlatformOnTrackWasStoodOn = true;
        }
        F.approach_f32_ptr(REF(o, 'oPlatformOnTrackOffsetY'), 0.0, 0.5);
        o.oPosY += o.oPlatformOnTrackOffsetY;
    }
}
function bhv_track_ball_update() {
    const o = W.gCurrentObject;
    let relativeIndex = s16(s16(o.oBhvParams2ndByte) - s16(o.parentObj.oPlatformOnTrackBaseBallIndex) - 1);
    if (relativeIndex < 1 || relativeIndex > 5) {
        F.obj_mark_for_deletion(o);
    }
}
let sSeesawPlatformCollisionModels = [W.SYM('bitdw_seg7_collision_0700F70C'),W.SYM('bits_seg7_collision_0701ADD8'),W.SYM('bits_seg7_collision_0701AE5C'),W.SYM('bob_seg7_collision_bridge'),W.SYM('bitfs_seg7_collision_07015928'),W.SYM('rr_seg7_collision_07029750'),W.SYM('rr_seg7_collision_07029858'),W.SYM('vcutm_seg7_collision_0700AC44')];
function bhv_seesaw_platform_init() {
    const o = W.gCurrentObject;
    o.collisionData = sSeesawPlatformCollisionModels[o.oBhvParams2ndByte];
    if (o.oBhvParams2ndByte == 2) {
        o.oCollisionDistance = 2000.0;
    }
}
function bhv_seesaw_platform_update() {
    const o = W.gCurrentObject;
    let startPitch = o.oFaceAnglePitch;
    o.oFaceAnglePitch += Math.trunc(o.oSeesawPlatformPitchVel);
    if (Math.abs(o.oSeesawPlatformPitchVel) > 10.0) {
        cur_obj_play_sound_1(SOUND_ENV_BOAT_ROCKING1);
    }
    if (W.gMarioObject.platform == o) {
        let rotation = o.oDistanceToMario * coss(o.oAngleToMario - o.oMoveAngleYaw);
        let filler = new Array(4).fill(0);
        if (o.oSeesawPlatformPitchVel * rotation < 0) {
            rotation *= 0.04;
        } else {
            rotation *= 0.02;
        }
        o.oSeesawPlatformPitchVel += rotation;
        F.clamp_f32(REF(o, 'oSeesawPlatformPitchVel'), -50.0, 50.0);
    } else {
        F.oscillate_toward( REF(o, 'oFaceAnglePitch'), REF(o, 'oSeesawPlatformPitchVel'), 0.0, 6.0, 3.0, 3.0);
    }
}
let sActivatedBackAndForthPlatformCollisionModels = [W.SYM('bits_seg7_collision_0701AD54'),W.SYM('bitfs_seg7_collision_070157E0'),W.SYM('bitfs_seg7_collision_07015124')];
function bhv_activated_back_and_forth_platform_init() {
    const o = W.gCurrentObject;
    let platformType = ((((o.oBhvParams >> 16)) & 0xFFFF) & ACTIVATED_BF_PLAT_BP_MASK_TYPE) >> 8;
    if (platformType != ACTIVATED_BF_PLAT_TYPE_BITS_ARROW_PLAT) {
        o.oActivatedBackAndForthPlatformFlipRotation = 0;
    } else {
        o.oActivatedBackAndForthPlatformFlipRotation = 0x8000;
    }
    o.collisionData =
        sActivatedBackAndForthPlatformCollisionModels[platformType];
    o.oActivatedBackAndForthPlatformMaxOffset = 50.0 * ((((o.oBhvParams >> 16)) & 0xFFFF) & 0x007F);
    if (platformType == ACTIVATED_BF_PLAT_TYPE_BITFS_ELEVATOR) {
        o.oActivatedBackAndForthPlatformMaxOffset -= 12.0;
    }
    o.oActivatedBackAndForthPlatformVertical = (((o.oBhvParams >> 16)) & 0xFFFF) & 0x0080;
    o.oActivatedBackAndForthPlatformStartYaw = o.oFaceAngleYaw;
}
function bhv_activated_back_and_forth_platform_update() {
    const o = W.gCurrentObject;
    let filler = new Array(12).fill(0);
    if (W.gMarioObject.platform == o) {
        o.oVelY = -6.0;
    } else {
        o.oVelY = 6.0;
    }
    if (o.oActivatedBackAndForthPlatformVel != 0.0) {
        if (o.oActivatedBackAndForthPlatformCountdown != 0) {
            o.oActivatedBackAndForthPlatformCountdown--;
        } else {
            o.oActivatedBackAndForthPlatformOffset += o.oActivatedBackAndForthPlatformVel;
            if (F.clamp_f32(REF(o, 'oActivatedBackAndForthPlatformOffset'), 0.0, o.oActivatedBackAndForthPlatformMaxOffset) || (o.oActivatedBackAndForthPlatformVel > 0.0 && o.oDistanceToMario > 3000.0)) {
                o.oActivatedBackAndForthPlatformCountdown = 20;
                if (o.oVelY < 0.0 || o.oActivatedBackAndForthPlatformVel > 0.0) {
                    o.oActivatedBackAndForthPlatformVel = -o.oActivatedBackAndForthPlatformVel;
                } else {
                    o.oActivatedBackAndForthPlatformVel = 0.0;
                }
                o.oFaceAngleYaw += o.oActivatedBackAndForthPlatformFlipRotation;
            }
        }
    } else {
        if (o.oVelY < 0.0) {
            o.oActivatedBackAndForthPlatformVel = 10.0;
        }
        o.oActivatedBackAndForthPlatformCountdown = 20;
    }
    obj_perform_position_op(POS_OP_SAVE_POSITION);
    if (o.oActivatedBackAndForthPlatformVertical != false) {
        o.oPosY = o.oHomeY + o.oActivatedBackAndForthPlatformOffset;
    } else {
        o.oPosY += o.oVelY;
        F.clamp_f32(REF(o, 'oPosY'), o.oHomeY - 20.0, o.oHomeY);
        obj_set_dist_from_home(-o.oActivatedBackAndForthPlatformOffset);
    }
    obj_perform_position_op(POS_OP_COMPUTE_VELOCITY);
}
let sRecoveryHeartHitbox = { interactType: 0, downOffset: 0, damageOrCoinValue: 0, health: 0, numLootCoins: 0, radius: 50, height: 50, hurtboxRadius: 50, hurtboxHeight: 50 };
function bhv_recovery_heart_loop() {
    const o = W.gCurrentObject;
    F.obj_set_hitbox(o, sRecoveryHeartHitbox);
    if (F.obj_check_if_collided_with_object(o, W.gMarioObject)) {
        if (o.oSpinningHeartPlayedSound == 0) {
            cur_obj_play_sound_2(SOUND_GENERAL_HEART_SPIN);
            o.oSpinningHeartPlayedSound++;
        }
        o.oAngleVelYaw = Math.trunc((200.0 * W.gMarioStates[0].forwardVel)) + 1000;
    } else {
        o.oSpinningHeartPlayedSound = 0;
        if ((o.oAngleVelYaw -= 50) < 400) {
            o.oAngleVelYaw = 400;
            o.oSpinningHeartTotalSpin = 0;
        }
    }
    if ((o.oSpinningHeartTotalSpin += o.oAngleVelYaw) >= 0x10000) {
        W.gMarioStates[0].healCounter += 4;
        o.oSpinningHeartTotalSpin -= 0x10000;
    }
    o.oFaceAngleYaw += o.oAngleVelYaw;
}
function bhv_bubble_cannon_barrel_loop() {
    const o = W.gCurrentObject;
    if (o.parentObj.oAction == 2) {
        F.obj_mark_for_deletion(o);
    } else {
        o.oMoveAngleYaw = o.parentObj.oFaceAngleYaw;
        o.oMoveAnglePitch = o.parentObj.oMoveAnglePitch + 0x4000;
        o.oFaceAnglePitch = o.parentObj.oMoveAnglePitch;
        if ((o.oCannonBarrelBubblesUnkF4 += o.oForwardVel) > 0.0) {
            F.cur_obj_set_pos_via_transform();
            obj_forward_vel_approach(-5.0, 18.0);
        } else {
            o.oCannonBarrelBubblesUnkF4 = 0.0;
            F.obj_copy_pos(o, o.parentObj);
            if (o.parentObj.oWaterCannonUnkF4 != 0) {
                if (o.oForwardVel == 0.0) {
                    let waterBomb = null;
                    o.oForwardVel = 35.0;
                    waterBomb = spawn_object(o, MODEL_WATER_BOMB,B.bhvWaterBomb);
                    if (waterBomb != null) {
                        waterBomb.oForwardVel = -100.0;
                        waterBomb.gfx.scale[1] = 1.7;
                    }
                    F.set_camera_shake_from_point(SHAKE_POS_MEDIUM, o.oPosX, o.oPosY, o.oPosZ);
                }
            } else {
                o.oForwardVel = 0.0;
            }
        }
    }
}
function water_bomb_cannon_act_0() {
    const o = W.gCurrentObject;
    if (o.oDistanceToMario < 2000.0) {
        spawn_object(o, MODEL_CANNON_BARREL,B.bhvCannonBarrelBubbles);
        F.cur_obj_unhide();
        o.oAction = 1;
        o.oMoveAnglePitch = o.oWaterCannonUnkFC = 0x1C00;
    }
}
function water_bomb_cannon_act_1() {
    const o = W.gCurrentObject;
    if (o.oDistanceToMario > 2500.0) {
        o.oAction = 2;
    } else if (o.oBhvParams2ndByte == 0) {
        if (o.oWaterCannonUnkF4 != 0) {
            o.oWaterCannonUnkF4--;
        } else {
            obj_move_pitch_approach(o.oWaterCannonUnkFC, 0x80);
            obj_face_yaw_approach(o.oWaterCannonUnk100, 0x100);
            if (s16(o.oFaceAngleYaw) == s16(o.oWaterCannonUnk100)) {
                if (o.oWaterCannonUnkF8 != 0) {
                    o.oWaterCannonUnkF8--;
                } else {
                    cur_obj_play_sound_2(SOUND_OBJ_CANNON4);
                    o.oWaterCannonUnkF4 = 70;
                    o.oWaterCannonUnkFC = 0x1000 + 0x400 * (F.random_u16() & 0x03);
                    o.oWaterCannonUnk100 = -0x2000 + o.oMoveAngleYaw + 0x1000 * (F.random_u16() % 5);
                    o.oWaterCannonUnkF8 = 60;
                }
            }
        }
    }
}
function water_bomb_cannon_act_2() {
    const o = W.gCurrentObject;
    F.cur_obj_hide();
    o.oAction = 0;
}
function bhv_water_bomb_cannon_loop() {
    const o = W.gCurrentObject;
    F.cur_obj_push_mario_away_from_cylinder(220.0, 300.0);
    switch (o.oAction) {
        case 0:
            water_bomb_cannon_act_0();
            break;
        case 1:
            water_bomb_cannon_act_1();
            break;
        case 2:
            water_bomb_cannon_act_2();
            break;
    }
}
function obj_spit_fire(relativePosX, relativePosY, relativePosZ, scale, model, startSpeed, endSpeed, movePitch) {
    let obj = spawn_object_relative_with_scale(1, relativePosX, relativePosY, relativePosZ, scale, o, model,B.bhvSmallPiranhaFlame);
    if (obj != null) {
        obj.oSmallPiranhaFlameStartSpeed = startSpeed;
        obj.oSmallPiranhaFlameEndSpeed = endSpeed;
        obj.oSmallPiranhaFlameModel = model;
        obj.oMoveAnglePitch = movePitch;
    }
}
function bhv_red_coin_star_marker_init() {
    const o = W.gCurrentObject;
    o.gfx.scale[2] = 0.75;
}

Object.assign(F, { obj_is_rendering_enabled, obj_get_pitch_from_vel, obj_update_race_proposition_dialog, obj_set_dist_from_home, obj_is_near_to_and_facing_mario, obj_perform_position_op, platform_on_track_update_pos_or_spawn_ball, cur_obj_spin_all_dimensions, obj_rotate_yaw_and_bounce_off_walls, obj_get_pitch_to_home, obj_compute_vel_from_move_pitch, cur_obj_init_anim_extend, cur_obj_init_anim_and_check_if_end, cur_obj_init_anim_check_frame, cur_obj_set_anim_if_at_end, cur_obj_play_sound_at_anim_range, obj_turn_pitch_toward_mario, obj_forward_vel_approach, obj_y_vel_approach, obj_move_pitch_approach, obj_face_pitch_approach, obj_face_yaw_approach, obj_face_roll_approach, obj_roll_to_match_yaw_turn, random_linear_offset, random_mod_offset, obj_random_fixed_turn, obj_resolve_collisions_and_turn, obj_die_if_health_non_positive, obj_unused_die, obj_set_knockback_action, obj_set_squished_action, obj_die_if_above_lava_and_health_non_positive, obj_handle_attacks, obj_act_knockback, obj_act_squished, obj_update_standard_actions, obj_check_attacks, obj_move_for_one_second, treat_far_home_as_mario, bhv_goomba_triplet_spawner_update, bhv_goomba_init, goomba_begin_jump, mark_goomba_as_dead, goomba_act_walk, goomba_act_attacked_mario, goomba_act_jump, huge_goomba_weakly_attacked, bhv_goomba_update, platform_on_track_reset, platform_on_track_mario_not_on_platform, bhv_platform_on_track_init, platform_on_track_act_init, platform_on_track_act_wait_for_mario, platform_on_track_act_move_along_track, platform_on_track_act_pause_briefly, platform_on_track_act_fall, platform_on_track_rock_ski_lift, bhv_platform_on_track_update, bhv_track_ball_update, bhv_seesaw_platform_init, bhv_seesaw_platform_update, bhv_activated_back_and_forth_platform_init, bhv_activated_back_and_forth_platform_update, bhv_recovery_heart_loop, bhv_bubble_cannon_barrel_loop, water_bomb_cannon_act_0, water_bomb_cannon_act_1, water_bomb_cannon_act_2, bhv_water_bomb_cannon_loop, obj_spit_fire, bhv_red_coin_star_marker_init });

})(window);

/* platforms: ported from the Super Mario 64 decompilation (github.com/n64decomp/sm64): src/game/platform_displacement.c */
(function (root) {
'use strict';
const SM64 = root.SM64, F = SM64.F = SM64.F || {}, W = SM64.W = SM64.W || {}, B = SM64.B = SM64.B || {};
const { s16, s8, sins, coss, atan2s, sqr, approach_f32, approach_s32, max, min, abs, REF, REFA, REFV } = SM64.m;
/*CONSTS*/
const { TIME_STOP_ACTIVE } = SM64.C;
/*END CONSTS*/

let D_8032FEC0 = 0;
let unused_8032FEC4 = [0];
W.gMarioPlatform = null;
function update_mario_platform() {
    let floor = null;
    let filler = new Array(4).fill(0);
    let marioX = 0;
    let marioY = 0;
    let marioZ = 0;
    let floorHeight = 0;
    let awayFromFloor = 0;
    if (W.gMarioObject == null) {
        return;
    }
    marioX = W.gMarioObject.oPosX;
    marioY = W.gMarioObject.oPosY;
    marioZ = W.gMarioObject.oPosZ;
    floorHeight = F.find_floor(marioX, marioY, marioZ, $ => floor = $);
    if (Math.abs(marioY - floorHeight) < 4.0) {
        awayFromFloor = 0;
    } else {
        awayFromFloor = 1;
    }
    switch (awayFromFloor) {
        case 1:
            W.gMarioPlatform = null;
            W.gMarioObject.platform = null;
            break;
        case 0:
            if (floor != null && floor.object != null) {
                W.gMarioPlatform = floor.object;
                W.gMarioObject.platform = floor.object;
            } else {
                W.gMarioPlatform = null;
                W.gMarioObject.platform = null;
            }
            break;
    }
}
function apply_platform_displacement(isMario, platform) {
    let x = 0;
    let y = 0;
    let z = 0;
    let platformPosX = 0;
    let platformPosY = 0;
    let platformPosZ = 0;
    let currentObjectOffset = [0, 0, 0];
    let relativeOffset = [0, 0, 0];
    let newObjectOffset = [0, 0, 0];
    let rotation = [0, 0, 0];
    let unusedPitch = 0;
    let unusedRoll = 0;
    let unusedYaw = 0;
    let displaceMatrix = new Array(4).fill(0);
    rotation[0] = platform.oAngleVelPitch;
    rotation[1] = platform.oAngleVelYaw;
    rotation[2] = platform.oAngleVelRoll;
    if (isMario) {
        D_8032FEC0 = 0;
        F.get_mario_pos(REFV(() => x, $ => x = $), REFV(() => y, $ => y = $), REFV(() => z, $ => z = $));
    } else {
        x = W.gCurrentObject.oPosX;
        y = W.gCurrentObject.oPosY;
        z = W.gCurrentObject.oPosZ;
    }
    x += platform.oVelX;
    z += platform.oVelZ;
    if (rotation[0] != 0 || rotation[1] != 0 || rotation[2] != 0) {
        unusedPitch = s16(rotation[0]);
        unusedRoll = s16(rotation[2]);
        unusedYaw = s16(platform.oFaceAngleYaw);
        if (isMario) {
            W.gMarioStates[0].faceAngle[1] += rotation[1];
        }
        platformPosX = platform.oPosX;
        platformPosY = platform.oPosY;
        platformPosZ = platform.oPosZ;
        currentObjectOffset[0] = x - platformPosX;
        currentObjectOffset[1] = y - platformPosY;
        currentObjectOffset[2] = z - platformPosZ;
        rotation[0] = platform.oFaceAnglePitch - platform.oAngleVelPitch;
        rotation[1] = platform.oFaceAngleYaw - platform.oAngleVelYaw;
        rotation[2] = platform.oFaceAngleRoll - platform.oAngleVelRoll;
        F.mtxf_rotate_zxy_and_translate(displaceMatrix, currentObjectOffset, rotation);
        F.linear_mtxf_transpose_mul_vec3f(displaceMatrix, relativeOffset, currentObjectOffset);
        rotation[0] = platform.oFaceAnglePitch;
        rotation[1] = platform.oFaceAngleYaw;
        rotation[2] = platform.oFaceAngleRoll;
        F.mtxf_rotate_zxy_and_translate(displaceMatrix, currentObjectOffset, rotation);
        F.linear_mtxf_mul_vec3f(displaceMatrix, newObjectOffset, relativeOffset);
        x = platformPosX + newObjectOffset[0];
        y = platformPosY + newObjectOffset[1];
        z = platformPosZ + newObjectOffset[2];
    }
    if (isMario) {
        F.set_mario_pos(x, y, z);
    } else {
        W.gCurrentObject.oPosX = x;
        W.gCurrentObject.oPosY = y;
        W.gCurrentObject.oPosZ = z;
    }
}
function apply_mario_platform_displacement() {
    let platform = W.gMarioPlatform;
    if (!(W.gTimeStopState & TIME_STOP_ACTIVE) && W.gMarioObject != null && platform != null) {
        apply_platform_displacement(true, platform);
    }
}
function clear_mario_platform() {
    W.gMarioPlatform = null;
}

Object.assign(F, { update_mario_platform, apply_platform_displacement, apply_mario_platform_displacement, clear_mario_platform });

})(window);

/* what Mario touches: ported from the Super Mario 64 decompilation (github.com/n64decomp/sm64): src/game/interaction.c */
(function (root) {
'use strict';
const SM64 = root.SM64, F = SM64.F = SM64.F || {}, W = SM64.W = SM64.W || {}, B = SM64.B = SM64.B || {};
const { s16, s8, sins, coss, atan2s, sqr, approach_f32, approach_s32, max, min, abs, REF, REFA, REFV } = SM64.m;
/*CONSTS*/
const { ACT_BACKWARD_AIR_KB, ACT_BACKWARD_GROUND_KB, ACT_BACKWARD_WATER_KB, ACT_BBH_ENTER_JUMP, ACT_BBH_ENTER_SPIN, 
  ACT_BURNING_FALL, ACT_BURNING_JUMP, ACT_CAUGHT_IN_WHIRLPOOL, ACT_CROUCHING, ACT_DECELERATING, ACT_DISAPPEARED, 
  ACT_DIVE, ACT_DIVE_PICKING_UP, ACT_DIVE_SLIDE, ACT_EATEN_BY_BUBBA, ACT_EMERGE_FROM_PIPE, ACT_ENTERING_STAR_DOOR, 
  ACT_FALL_AFTER_STAR_GRAB, ACT_FLAG_AIR, ACT_FLAG_ATTACKING, ACT_FLAG_DIVING, ACT_FLAG_HANGING, ACT_FLAG_IDLE, 
  ACT_FLAG_INTANGIBLE, ACT_FLAG_INVULNERABLE, ACT_FLAG_METAL_WATER, ACT_FLAG_ON_POLE, ACT_FLAG_RIDING_SHELL, 
  ACT_FLAG_SHORT_HITBOX, ACT_FLAG_SWIMMING, ACT_FLYING, ACT_FORWARD_AIR_KB, ACT_FORWARD_GROUND_KB, 
  ACT_FORWARD_WATER_KB, ACT_GETTING_BLOWN, ACT_GRABBED, ACT_GRAB_POLE_FAST, ACT_GRAB_POLE_SLOW, ACT_GROUND_POUND, 
  ACT_GROUND_POUND_LAND, ACT_GROUP_CUTSCENE, ACT_GROUP_MASK, ACT_HARD_BACKWARD_AIR_KB, ACT_HARD_BACKWARD_GROUND_KB, 
  ACT_HARD_FORWARD_AIR_KB, ACT_HARD_FORWARD_GROUND_KB, ACT_HOLD_WALKING, ACT_IDLE, ACT_ID_MASK, ACT_IN_CANNON, 
  ACT_JUMBO_STAR_CUTSCENE, ACT_JUMP_KICK, ACT_LAVA_BOOST, ACT_MOVE_PUNCHING, ACT_PANTING, ACT_PICKING_UP, 
  ACT_PICKING_UP_BOWSER, ACT_PULLING_DOOR, ACT_PUNCHING, ACT_PUSHING_DOOR, ACT_PUTTING_ON_CAP, 
  ACT_READING_AUTOMATIC_DIALOG, ACT_READING_SIGN, ACT_RIDING_HOOT, ACT_RIDING_SHELL_GROUND, ACT_SHOCKED, 
  ACT_SHOT_FROM_CANNON, ACT_SLIDE_KICK, ACT_SLIDE_KICK_SLIDE, ACT_SOFT_BACKWARD_GROUND_KB, 
  ACT_SOFT_FORWARD_GROUND_KB, ACT_SQUISHED, ACT_STANDING_AGAINST_WALL, ACT_STAR_DANCE_EXIT, ACT_STAR_DANCE_NO_EXIT, 
  ACT_STAR_DANCE_WATER, ACT_TELEPORT_FADE_IN, ACT_TELEPORT_FADE_OUT, ACT_TORNADO_TWIRLING, ACT_TWIRLING, 
  ACT_TWIRL_LAND, ACT_UNLOCKING_KEY_DOOR, ACT_UNLOCKING_STAR_DOOR, ACT_WAITING_FOR_DIALOG, ACT_WALKING, 
  ACT_WATER_JUMP, ACT_WATER_SHOCKED, ARRAY_COUNT, ATTACK_FAST_ATTACK, ATTACK_FROM_ABOVE, ATTACK_FROM_BELOW, 
  ATTACK_GROUND_POUND_OR_TWIRL, ATTACK_KICK_OR_TRIP, ATTACK_PUNCH, COURSE_IS_MAIN_COURSE, COURSE_MAX, COURSE_MIN, 
  DIALOG_022, DIALOG_023, DIALOG_024, DIALOG_025, DIALOG_026, DIALOG_027, DIALOG_028, DIALOG_029, 
  HUD_DISPLAY_FLAG_TIMER, INPUT_A_PRESSED, INPUT_B_PRESSED, INPUT_INTERACT_OBJ_GRABBABLE, INTERACT_BBH_ENTRANCE, 
  INTERACT_BOUNCE_TOP, INTERACT_BOUNCE_TOP2, INTERACT_BREAKABLE, INTERACT_BULLY, INTERACT_CANNON_BASE, INTERACT_CAP, 
  INTERACT_CLAM_OR_BUBBA, INTERACT_COIN, INTERACT_DAMAGE, INTERACT_DOOR, INTERACT_FLAME, INTERACT_GRABBABLE, 
  INTERACT_HIT_FROM_BELOW, INTERACT_HOOT, INTERACT_IGLOO_BARRIER, INTERACT_KOOPA, INTERACT_KOOPA_SHELL, 
  INTERACT_MR_BLIZZARD, INTERACT_POLE, INTERACT_SHOCK, INTERACT_SNUFIT_BULLET, INTERACT_STAR_OR_KEY, 
  INTERACT_STRONG_WIND, INTERACT_TEXT, INTERACT_TORNADO, INTERACT_UNKNOWN_08, INTERACT_WARP, INTERACT_WARP_DOOR, 
  INTERACT_WATER_RING, INTERACT_WHIRLPOOL, INT_STATUS_ATTACKED_MARIO, INT_STATUS_GRABBED_MARIO, 
  INT_STATUS_INTERACTED, INT_STATUS_STOP_RIDING, INT_STATUS_WAS_ATTACKED, INT_SUBTYPE_BIG_KNOCKBACK, 
  INT_SUBTYPE_DELAY_INVINCIBILITY, INT_SUBTYPE_EATS_MARIO, INT_SUBTYPE_FADING_WARP, INT_SUBTYPE_GRABS_MARIO, 
  INT_SUBTYPE_GRAND_STAR, INT_SUBTYPE_KICKABLE, INT_SUBTYPE_NOT_GRABBABLE, INT_SUBTYPE_NO_EXIT, INT_SUBTYPE_NPC, 
  INT_SUBTYPE_SIGN, INT_SUBTYPE_STAR_DOOR, INT_SUBTYPE_TWIRL_BOUNCE, MARIO_CAPS, MARIO_CAP_IN_HAND, 
  MARIO_CAP_ON_HEAD, MARIO_KICKING, MARIO_METAL_CAP, MARIO_NORMAL_CAP, MARIO_PUNCHING, MARIO_TRIPPING, 
  MARIO_UNKNOWN_08, MARIO_UNKNOWN_18, MARIO_VANISH_CAP, MARIO_WING_CAP, MODEL_MARIOS_CAP, MODEL_NONE, 
  PARTICLE_TRIANGLE, SAVE_FLAG_CAP_ON_KLEPTO, SAVE_FLAG_CAP_ON_UKIKI, SAVE_FLAG_HAVE_KEY_1, SAVE_FLAG_HAVE_KEY_2, 
  SAVE_FLAG_UNLOCKED_50_STAR_DOOR, SAVE_FLAG_UNLOCKED_BASEMENT_DOOR, SAVE_FLAG_UNLOCKED_BITDW_DOOR, 
  SAVE_FLAG_UNLOCKED_BITFS_DOOR, SAVE_FLAG_UNLOCKED_CCM_DOOR, SAVE_FLAG_UNLOCKED_JRB_DOOR, 
  SAVE_FLAG_UNLOCKED_PSS_DOOR, SAVE_FLAG_UNLOCKED_UPSTAIRS_DOOR, SAVE_FLAG_UNLOCKED_WF_DOOR, SEQUENCE_ARGS, 
  SEQ_EVENT_METAL_CAP, SEQ_EVENT_POWERUP, SHAKE_ATTACK, SHAKE_HIT_FROM_BELOW, SHAKE_LARGE_DAMAGE, SHAKE_MED_DAMAGE, 
  SHAKE_SMALL_DAMAGE, SOUND_ACTION_BOUNCE_OFF_OBJECT, SOUND_ACTION_HIT_2, SOUND_ACTION_UNKNOWN458, 
  SOUND_GENERAL_FLAME_OUT, SOUND_MARIO_ATTACKED, SOUND_MARIO_EEUH, SOUND_MARIO_HERE_WE_GO, SOUND_MARIO_ON_FIRE, 
  SOUND_MARIO_OOOF, SOUND_MARIO_TWIRL_BOUNCE, SOUND_MARIO_WAAAOOOW, SOUND_MENU_ENTER_HOLE, SOUND_MENU_ENTER_PIPE, 
  SOUND_MENU_STAR_SOUND, SOUND_OBJ_BULLY_METAL, STAR_INDEX_100_COINS, STAR_INDEX_ACT_2, SURFACE_BURNING, 
  SURFACE_DEATH_PLANE, SURFACE_TIMER_END, SURFACE_TIMER_START, SURFACE_VERTICAL_WIND, SURFACE_WARP, 
  TIMER_CONTROL_SHOW, TIMER_CONTROL_START, TIMER_CONTROL_STOP, WARP_OP_WARP_FLOOR, WARP_OP_WARP_OBJECT } = SM64.C;
/*END CONSTS*/

const INT_GROUND_POUND_OR_TWIRL = (1 << 0);
const INT_PUNCH = (1 << 1);
const INT_KICK = (1 << 2);
const INT_TRIP = (1 << 3);
const INT_SLIDE_KICK = (1 << 4);
const INT_FAST_ATTACK_OR_SHELL = (1 << 5);
const INT_HIT_FROM_ABOVE = (1 << 6);
const INT_HIT_FROM_BELOW = (1 << 7);
const INT_ATTACK_NOT_FROM_BELOW = (INT_GROUND_POUND_OR_TWIRL | INT_PUNCH | INT_KICK | INT_TRIP | INT_SLIDE_KICK       | INT_FAST_ATTACK_OR_SHELL | INT_HIT_FROM_ABOVE);
const INT_ANY_ATTACK = (INT_GROUND_POUND_OR_TWIRL | INT_PUNCH | INT_KICK | INT_TRIP | INT_SLIDE_KICK       | INT_FAST_ATTACK_OR_SHELL | INT_HIT_FROM_ABOVE | INT_HIT_FROM_BELOW);
const INT_ATTACK_NOT_WEAK_FROM_ABOVE = (INT_GROUND_POUND_OR_TWIRL | INT_PUNCH | INT_KICK | INT_TRIP | INT_HIT_FROM_BELOW);
let sDelayInvincTimer = 0;
let sInvulnerable = 0;
let sInteractionHandlers = { interactType: [INTERACT_COIN, interact_coin], f1: [INTERACT_WATER_RING, interact_water_ring], f2: [INTERACT_STAR_OR_KEY, interact_star_or_key], f3: [INTERACT_BBH_ENTRANCE, interact_bbh_entrance], f4: [INTERACT_WARP, interact_warp], f5: [INTERACT_WARP_DOOR, interact_warp_door], f6: [INTERACT_DOOR, interact_door], f7: [INTERACT_CANNON_BASE, interact_cannon_base], f8: [INTERACT_IGLOO_BARRIER, interact_igloo_barrier], f9: [INTERACT_TORNADO, interact_tornado], f10: [INTERACT_WHIRLPOOL, interact_whirlpool], f11: [INTERACT_STRONG_WIND, interact_strong_wind], f12: [INTERACT_FLAME, interact_flame], f13: [INTERACT_SNUFIT_BULLET, interact_snufit_bullet], f14: [INTERACT_CLAM_OR_BUBBA, interact_clam_or_bubba], f15: [INTERACT_BULLY, interact_bully], f16: [INTERACT_SHOCK, interact_shock], f17: [INTERACT_BOUNCE_TOP2, interact_bounce_top], f18: [INTERACT_MR_BLIZZARD, interact_mr_blizzard], f19: [INTERACT_HIT_FROM_BELOW, interact_hit_from_below], f20: [INTERACT_BOUNCE_TOP, interact_bounce_top], f21: [INTERACT_DAMAGE, interact_damage], f22: [INTERACT_POLE, interact_pole], f23: [INTERACT_HOOT, interact_hoot], f24: [INTERACT_BREAKABLE, interact_breakable], f25: [INTERACT_KOOPA, interact_bounce_top], f26: [INTERACT_KOOPA_SHELL, interact_koopa_shell], f27: [INTERACT_UNKNOWN_08, interact_unknown_08], f28: [INTERACT_CAP, interact_cap], f29: [INTERACT_GRABBABLE, interact_grabbable], f30: [INTERACT_TEXT, interact_text] };
let sForwardKnockbackActions = [[ACT_SOFT_FORWARD_GROUND_KB, ACT_FORWARD_GROUND_KB, ACT_HARD_FORWARD_GROUND_KB], [ACT_FORWARD_AIR_KB, ACT_FORWARD_AIR_KB, ACT_HARD_FORWARD_AIR_KB], [ACT_FORWARD_WATER_KB, ACT_FORWARD_WATER_KB, ACT_FORWARD_WATER_KB]];
let sBackwardKnockbackActions = [[ACT_SOFT_BACKWARD_GROUND_KB, ACT_BACKWARD_GROUND_KB, ACT_HARD_BACKWARD_GROUND_KB], [ACT_BACKWARD_AIR_KB, ACT_BACKWARD_AIR_KB, ACT_HARD_BACKWARD_AIR_KB], [ACT_BACKWARD_WATER_KB, ACT_BACKWARD_WATER_KB, ACT_BACKWARD_WATER_KB]];
let sDisplayingDoorText = false;
let sJustTeleported = false;
let sPSSSlideStarted = false;
function get_mario_cap_flag(capObject) {
    let script = virtual_to_segmented(0x13, capObject.behavior);
    if (script ==B.bhvNormalCap) {
        return MARIO_NORMAL_CAP;
    } else if (script ==B.bhvMetalCap) {
        return MARIO_METAL_CAP;
    } else if (script ==B.bhvWingCap) {
        return MARIO_WING_CAP;
    } else if (script ==B.bhvVanishCap) {
        return MARIO_VANISH_CAP;
    }
    return 0;
}
function object_facing_mario(m, o, angleRange) {
    let dx = m.pos[0] - o.oPosX;
    let dz = m.pos[2] - o.oPosZ;
    let angleToMario = s16(atan2s(dz, dx));
    let dAngle = s16(angleToMario - o.oMoveAngleYaw);
    if (-angleRange <= dAngle && dAngle <= angleRange) {
        return true;
    }
    return false;
}
function mario_obj_angle_to_object(m, o) {
    let dx = o.oPosX - m.pos[0];
    let dz = o.oPosZ - m.pos[2];
    return atan2s(dz, dx);
}
function determine_interaction(m, o) {
    let interaction = 0;
    let action = m.action;
    if (action & ACT_FLAG_ATTACKING) {
        if (action == ACT_PUNCHING || action == ACT_MOVE_PUNCHING || action == ACT_JUMP_KICK) {
            let dYawToObject = s16(mario_obj_angle_to_object(m, o) - m.faceAngle[1]);
            if (m.flags & MARIO_PUNCHING) {
                if (-0x2AAA <= dYawToObject && dYawToObject <= 0x2AAA) {
                    let eraction = INT_PUNCH;
                }
            }
            if (m.flags & MARIO_KICKING) {
                if (-0x2AAA <= dYawToObject && dYawToObject <= 0x2AAA) {
                    let eraction = INT_KICK;
                }
            }
            if (m.flags & MARIO_TRIPPING) {
                if (-0x4000 <= dYawToObject && dYawToObject <= 0x4000) {
                    let eraction = INT_TRIP;
                }
            }
        } else if (action == ACT_GROUND_POUND || action == ACT_TWIRLING) {
            if (m.vel[1] < 0.0) {
                let eraction = INT_GROUND_POUND_OR_TWIRL;
            }
        } else if (action == ACT_GROUND_POUND_LAND || action == ACT_TWIRL_LAND) {
            if (m.vel[1] < 0.0 && m.actionState == 0) {
                let eraction = INT_GROUND_POUND_OR_TWIRL;
            }
        } else if (action == ACT_SLIDE_KICK || action == ACT_SLIDE_KICK_SLIDE) {
            let eraction = INT_SLIDE_KICK;
        } else if (action & ACT_FLAG_RIDING_SHELL) {
            let eraction = INT_FAST_ATTACK_OR_SHELL;
        } else if (m.forwardVel <= -26.0 || 26.0 <= m.forwardVel) {
            let eraction = INT_FAST_ATTACK_OR_SHELL;
        }
    }
    if (interaction == 0 && (action & ACT_FLAG_AIR)) {
        if (m.vel[1] < 0.0) {
            if (m.pos[1] > o.oPosY) {
                let eraction = INT_HIT_FROM_ABOVE;
            }
        } else {
            if (m.pos[1] < o.oPosY) {
                let eraction = INT_HIT_FROM_BELOW;
            }
        }
    }
    return interaction;
}
function attack_object(o, interaction) {
    let attackType = 0;
    switch (interaction) {
        case INT_GROUND_POUND_OR_TWIRL:
            attackType = ATTACK_GROUND_POUND_OR_TWIRL;
            break;
        case INT_PUNCH:
            attackType = ATTACK_PUNCH;
            break;
        case INT_KICK:
        case INT_TRIP:
            attackType = ATTACK_KICK_OR_TRIP;
            break;
        case INT_SLIDE_KICK:
        case INT_FAST_ATTACK_OR_SHELL:
            attackType = ATTACK_FAST_ATTACK;
            break;
        case INT_HIT_FROM_ABOVE:
            attackType = ATTACK_FROM_ABOVE;
            break;
        case INT_HIT_FROM_BELOW:
            attackType = ATTACK_FROM_BELOW;
            break;
    }
    o.oInteractStatus = attackType + (INT_STATUS_INTERACTED | INT_STATUS_WAS_ATTACKED);
    return attackType;
}
function mario_stop_riding_object(m) {
    if (m.riddenObj != null) {
        m.riddenObj.oInteractStatus = INT_STATUS_STOP_RIDING;
        F.stop_shell_music();
        m.riddenObj = null;
    }
}
function mario_grab_used_object(m) {
    if (m.heldObj == null) {
        m.heldObj = m.usedObj;
        F.obj_set_held_state(m.heldObj,B.bhvCarrySomething3);
    }
}
function mario_drop_held_object(m) {
    if (m.heldObj != null) {
        if (m.heldObj.behavior ==B.bhvKoopaShellUnderwater) {
            F.stop_shell_music();
        }
        F.obj_set_held_state(m.heldObj,B.bhvCarrySomething4);
        m.heldObj.oPosX = m.marioBodyState.heldObjLastPosition[0];
        m.heldObj.oPosY = m.pos[1];
        m.heldObj.oPosZ = m.marioBodyState.heldObjLastPosition[2];
        m.heldObj.oMoveAngleYaw = m.faceAngle[1];
        m.heldObj = null;
    }
}
function mario_throw_held_object(m) {
    if (m.heldObj != null) {
        if (m.heldObj.behavior ==B.bhvKoopaShellUnderwater) {
            F.stop_shell_music();
        }
        F.obj_set_held_state(m.heldObj,B.bhvCarrySomething5);
        m.heldObj.oPosX = m.marioBodyState.heldObjLastPosition[0] + 32.0 * sins(m.faceAngle[1]);
        m.heldObj.oPosY = m.marioBodyState.heldObjLastPosition[1];
        m.heldObj.oPosZ = m.marioBodyState.heldObjLastPosition[2] + 32.0 * coss(m.faceAngle[1]);
        m.heldObj.oMoveAngleYaw = m.faceAngle[1];
        m.heldObj = null;
    }
}
function mario_stop_riding_and_holding(m) {
    mario_drop_held_object(m);
    mario_stop_riding_object(m);
    if (m.action == ACT_RIDING_HOOT) {
        m.usedObj.oInteractStatus = false;
        m.usedObj.oHootMarioReleaseTime = W.gGlobalTimer;
    }
}
function does_mario_have_normal_cap_on_head(m) {
    return (m.flags & (MARIO_CAPS | MARIO_CAP_ON_HEAD)) == (MARIO_NORMAL_CAP | MARIO_CAP_ON_HEAD);
}
function mario_blow_off_cap(m, capSpeed) {
    let capObject = null;
    if (does_mario_have_normal_cap_on_head(m)) {
        F.save_file_set_cap_pos(m.pos[0], m.pos[1], m.pos[2]);
        m.flags &= ~(MARIO_NORMAL_CAP | MARIO_CAP_ON_HEAD);
        capObject = spawn_object(m.marioObj, MODEL_MARIOS_CAP,B.bhvNormalCap);
        capObject.oPosY += (m.action & ACT_FLAG_SHORT_HITBOX) ? 120.0 : 180.0;
        capObject.oForwardVel = capSpeed;
        capObject.oMoveAngleYaw = s16((m.faceAngle[1] + 0x400));
        if (m.forwardVel < 0.0) {
            capObject.oMoveAngleYaw = s16((capObject.oMoveAngleYaw + 0x8000));
        }
    }
}
function mario_lose_cap_to_enemy(arg) {
    let wasWearingCap = false;
    if (does_mario_have_normal_cap_on_head(W.gMarioState)) {
        F.save_file_set_flags(arg == 1 ? SAVE_FLAG_CAP_ON_KLEPTO : SAVE_FLAG_CAP_ON_UKIKI);
        W.gMarioState.flags &= ~(MARIO_NORMAL_CAP | MARIO_CAP_ON_HEAD);
        wasWearingCap = true;
    }
    return wasWearingCap;
}
function mario_retrieve_cap() {
    mario_drop_held_object(W.gMarioState);
    F.save_file_clear_flags(SAVE_FLAG_CAP_ON_KLEPTO | SAVE_FLAG_CAP_ON_UKIKI);
    W.gMarioState.flags &= ~MARIO_CAP_ON_HEAD;
    W.gMarioState.flags |= MARIO_NORMAL_CAP | MARIO_CAP_IN_HAND;
}
function able_to_grab_object(m, o) {
    let action = m.action;
    if (action == ACT_DIVE_SLIDE || action == ACT_DIVE) {
        if (!(o.oInteractionSubtype & INT_SUBTYPE_GRABS_MARIO)) {
            return true;
        }
    } else if (action == ACT_PUNCHING || action == ACT_MOVE_PUNCHING) {
        if (m.actionArg < 2) {
            return true;
        }
    }
    return false;
}
function mario_get_collided_object(m, interactType) {
    let i = 0;
    let object = null;
    for (i = 0; i < m.marioObj.numCollidedObjs; i++) {
        object = m.marioObj.collidedObjs[i];
        if (object.oInteractType == interactType) {
            return object;
        }
    }
    return null;
}
function mario_check_object_grab(m) {
    let result = false;
    let script = null;
    if (m.input & INPUT_INTERACT_OBJ_GRABBABLE) {
        script = virtual_to_segmented(0x13, m.interactObj.behavior);
        if (script ==B.bhvBowser) {
            let facingDYaw = s16(m.faceAngle[1] - m.interactObj.oMoveAngleYaw);
            if (facingDYaw >= -0x5555 && facingDYaw <= 0x5555) {
                m.faceAngle[1] = s16(m.interactObj.oMoveAngleYaw);
                m.usedObj = m.interactObj;
                result = F.set_mario_action(m, ACT_PICKING_UP_BOWSER, 0);
            }
        } else {
            let facingDYaw = s16(mario_obj_angle_to_object(m, m.interactObj) - m.faceAngle[1]);
            if (facingDYaw >= -0x2AAA && facingDYaw <= 0x2AAA) {
                m.usedObj = m.interactObj;
                if (!(m.action & ACT_FLAG_AIR)) {
                    F.set_mario_action( m, (m.action & ACT_FLAG_DIVING) ? ACT_DIVE_PICKING_UP : ACT_PICKING_UP, 0);
                }
                result = true;
            }
        }
    }
    return result;
}
function bully_knock_back_mario(mario) {
    let marioData = {};
    let bullyData = {};
    let newMarioYaw = 0;
    let newBullyYaw = 0;
    let marioDYaw = 0;
    let bullyDYaw = 0;
    let bonkAction = 0;
    let bully = mario.interactObj;
    let bullyToMarioRatio = bully.hitboxRadius * 3 / 53;
    let marioToBullyRatio = 53.0 / bully.hitboxRadius;
    init_bully_collision_data(marioData, mario.pos[0], mario.pos[2], mario.forwardVel, mario.faceAngle[1], bullyToMarioRatio, 52.0);
    init_bully_collision_data(bullyData, bully.oPosX, bully.oPosZ, bully.oForwardVel, bully.oMoveAngleYaw, marioToBullyRatio, bully.hitboxRadius + 2.0);
    if (mario.forwardVel != 0.0) {
        F.transfer_bully_speed(marioData, bullyData);
    } else {
        F.transfer_bully_speed(bullyData, marioData);
    }
    newMarioYaw = s16(atan2s(marioData.velZ, marioData.velX));
    newBullyYaw = s16(atan2s(bullyData.velZ, bullyData.velX));
    marioDYaw = s16(newMarioYaw - mario.faceAngle[1]);
    bullyDYaw = s16(newBullyYaw - bully.oMoveAngleYaw);
    mario.faceAngle[1] = newMarioYaw;
    mario.forwardVel = Math.sqrt(marioData.velX * marioData.velX + marioData.velZ * marioData.velZ);
    mario.pos[0] = marioData.posX;
    mario.pos[2] = marioData.posZ;
    bully.oMoveAngleYaw = newBullyYaw;
    bully.oForwardVel = Math.sqrt(bullyData.velX * bullyData.velX + bullyData.velZ * bullyData.velZ);
    bully.oPosX = bullyData.posX;
    bully.oPosZ = bullyData.posZ;
    if (marioDYaw < -0x4000 || marioDYaw > 0x4000) {
        mario.faceAngle[1] += 0x8000;
        mario.forwardVel *= -1.0;
        if (mario.action & ACT_FLAG_AIR) {
            bonkAction = ACT_BACKWARD_AIR_KB;
        } else {
            bonkAction = ACT_SOFT_BACKWARD_GROUND_KB;
        }
    } else {
        if (mario.action & ACT_FLAG_AIR) {
            bonkAction = ACT_FORWARD_AIR_KB;
        } else {
            bonkAction = ACT_SOFT_FORWARD_GROUND_KB;
        }
    }
    return bonkAction;
}
function bounce_off_object(m, o, velY) {
    m.pos[1] = o.oPosY + o.hitboxHeight;
    m.vel[1] = velY;
    m.flags &= ~MARIO_UNKNOWN_08;
    play_sound(SOUND_ACTION_BOUNCE_OFF_OBJECT, m.marioObj.gfx.cameraToObject);
}
function hit_object_from_below(m, o) {
    m.vel[1] = 0.0;
    F.set_camera_shake_from_hit(SHAKE_HIT_FROM_BELOW);
}
function unused_determine_knockback_action(m) {
    let bonkAction = 0;
    let angleToObject = s16(mario_obj_angle_to_object(m, m.interactObj));
    let facingDYaw = s16(angleToObject - m.faceAngle[1]);
    if (m.forwardVel < 16.0) {
        m.forwardVel = 16.0;
    }
    m.faceAngle[1] = s16(angleToObject);
    if (facingDYaw >= -0x4000 && facingDYaw <= 0x4000) {
        m.forwardVel *= -1.0;
        if (m.action & (ACT_FLAG_AIR | ACT_FLAG_ON_POLE | ACT_FLAG_HANGING)) {
            bonkAction = ACT_BACKWARD_AIR_KB;
        } else {
            bonkAction = ACT_SOFT_BACKWARD_GROUND_KB;
        }
    } else {
        m.faceAngle[1] = s16(m.faceAngle[1] + (0x8000));
        if (m.action & (ACT_FLAG_AIR | ACT_FLAG_ON_POLE | ACT_FLAG_HANGING)) {
            bonkAction = ACT_FORWARD_AIR_KB;
        } else {
            bonkAction = ACT_SOFT_FORWARD_GROUND_KB;
        }
    }
    return bonkAction;
}
function determine_knockback_action(m, arg) {
    let bonkAction = 0;
    let terrainIndex = s16(0);
    let strengthIndex = s16(0);
    let angleToObject = s16(mario_obj_angle_to_object(m, m.interactObj));
    let facingDYaw = s16(angleToObject - m.faceAngle[1]);
    let remainingHealth = s16(m.health - 0x40 * m.hurtCounter);
    if (m.action & (ACT_FLAG_SWIMMING | ACT_FLAG_METAL_WATER)) {
        terrainIndex = s16(2);
    } else if (m.action & (ACT_FLAG_AIR | ACT_FLAG_ON_POLE | ACT_FLAG_HANGING)) {
        terrainIndex = s16(1);
    }
    if (remainingHealth < 0x100) {
        strengthIndex = s16(2);
    } else if (m.interactObj.oDamageOrCoinValue >= 4) {
        strengthIndex = s16(2);
    } else if (m.interactObj.oDamageOrCoinValue >= 2) {
        strengthIndex = s16(1);
    }
    m.faceAngle[1] = s16(angleToObject);
    if (terrainIndex == 2) {
        if (m.forwardVel < 28.0) {
            F.mario_set_forward_vel(m, 28.0);
        }
        if (m.pos[1] >= m.interactObj.oPosY) {
            if (m.vel[1] < 20.0) {
                m.vel[1] = 20.0;
            }
        } else {
            if (m.vel[1] > 0.0) {
                m.vel[1] = 0.0;
            }
        }
    } else {
        if (m.forwardVel < 16.0) {
            F.mario_set_forward_vel(m, 16.0);
        }
    }
    if (-0x4000 <= facingDYaw && facingDYaw <= 0x4000) {
        m.forwardVel *= -1.0;
        bonkAction = sBackwardKnockbackActions[terrainIndex][strengthIndex];
    } else {
        m.faceAngle[1] = s16(m.faceAngle[1] + (0x8000));
        bonkAction = sForwardKnockbackActions[terrainIndex][strengthIndex];
    }
    return bonkAction;
}
function push_mario_out_of_object(m, o, padding) {
    let minDistance = o.hitboxRadius + m.marioObj.hitboxRadius + padding;
    let offsetX = m.pos[0] - o.oPosX;
    let offsetZ = m.pos[2] - o.oPosZ;
    let distance = Math.sqrt(offsetX * offsetX + offsetZ * offsetZ);
    if (distance < minDistance) {
        let floor = null;
        let pushAngle = 0;
        let newMarioX = 0;
        let newMarioZ = 0;
        if (distance == 0.0) {
            pushAngle = s16(m.faceAngle[1]);
        } else {
            pushAngle = s16(atan2s(offsetZ, offsetX));
        }
        newMarioX = o.oPosX + minDistance * sins(pushAngle);
        newMarioZ = o.oPosZ + minDistance * coss(pushAngle);
        F.f32_find_wall_collision(REFV(() => newMarioX, $ => newMarioX = $), REFA(m.pos, 1), REFV(() => newMarioZ, $ => newMarioZ = $), 60.0, 50.0);
        F.find_floor(newMarioX, m.pos[1], newMarioZ, $ => floor = $);
        if (floor != null) {
            m.pos[0] = newMarioX;
            m.pos[2] = newMarioZ;
        }
    }
}
function bounce_back_from_attack(m, interaction) {
    if (interaction & (INT_PUNCH | INT_KICK | INT_TRIP)) {
        if (m.action == ACT_PUNCHING) {
            m.action = ACT_MOVE_PUNCHING;
        }
        if (m.action & ACT_FLAG_AIR) {
            F.mario_set_forward_vel(m, -16.0);
        } else {
            F.mario_set_forward_vel(m, -48.0);
        }
        F.set_camera_shake_from_hit(SHAKE_ATTACK);
        m.particleFlags |= PARTICLE_TRIANGLE;
    }
    if (interaction & (INT_PUNCH | INT_KICK | INT_TRIP | INT_FAST_ATTACK_OR_SHELL)) {
        play_sound(SOUND_ACTION_HIT_2, m.marioObj.gfx.cameraToObject);
    }
}
function should_push_or_pull_door(m, o) {
    let dx = o.oPosX - m.pos[0];
    let dz = o.oPosZ - m.pos[2];
    let dYaw = s16(o.oMoveAngleYaw - atan2s(dz, dx));
    return (dYaw >= -0x4000 && dYaw <= 0x4000) ? 0x00000001 : 0x00000002;
}
function take_damage_from_interact_object(m) {
    let shake = 0;
    let damage = m.interactObj.oDamageOrCoinValue;
    if (damage >= 4) {
        shake = SHAKE_LARGE_DAMAGE;
    } else if (damage >= 2) {
        shake = SHAKE_MED_DAMAGE;
    } else {
        shake = SHAKE_SMALL_DAMAGE;
    }
    if (!(m.flags & MARIO_CAP_ON_HEAD)) {
        damage += (damage + 1) / 2;
    }
    if (m.flags & MARIO_METAL_CAP) {
        damage = 0;
    }
    m.hurtCounter += 4 * damage;
    F.set_camera_shake_from_hit(shake);
    return damage;
}
function take_damage_and_knock_back(m, o) {
    let damage = 0;
    if (!sInvulnerable && !(m.flags & MARIO_VANISH_CAP) && !(o.oInteractionSubtype & INT_SUBTYPE_DELAY_INVINCIBILITY)) {
        o.oInteractStatus = INT_STATUS_INTERACTED | INT_STATUS_ATTACKED_MARIO;
        m.interactObj = o;
        damage = take_damage_from_interact_object(m);
        if (o.oInteractionSubtype & INT_SUBTYPE_BIG_KNOCKBACK) {
            m.forwardVel = 40.0;
        }
        if (o.oDamageOrCoinValue > 0) {
            play_sound(SOUND_MARIO_ATTACKED, m.marioObj.gfx.cameraToObject);
        }
        F.update_mario_sound_and_camera(m);
        return F.drop_and_set_mario_action(m, determine_knockback_action(m, o.oDamageOrCoinValue), damage);
    }
    return false;
}
function reset_mario_pitch(m) {
    if (m.action == ACT_WATER_JUMP || m.action == ACT_SHOT_FROM_CANNON || m.action == ACT_FLYING) {
        F.set_camera_mode(m.area.camera, m.area.camera.defMode, 1);
        m.faceAngle[0] = s16(0);
    }
}
function interact_coin(m, interactType, o) {
    m.numCoins += o.oDamageOrCoinValue;
    m.healCounter += 4 * o.oDamageOrCoinValue;
    o.oInteractStatus = INT_STATUS_INTERACTED;
    if (COURSE_IS_MAIN_COURSE(W.gCurrCourseNum) && m.numCoins - o.oDamageOrCoinValue < 100 && m.numCoins >= 100) {
        F.bhv_spawn_star_no_level_exit(STAR_INDEX_100_COINS);
    }
    return false;
}
function interact_water_ring(m, interactType, o) {
    m.healCounter += 4 * o.oDamageOrCoinValue;
    o.oInteractStatus = INT_STATUS_INTERACTED;
    return false;
}
function interact_star_or_key(m, interactType, o) {
    let starIndex = 0;
    let starGrabAction = ACT_STAR_DANCE_EXIT;
    let noExit = (o.oInteractionSubtype & INT_SUBTYPE_NO_EXIT) != 0;
    let grandStar = (o.oInteractionSubtype & INT_SUBTYPE_GRAND_STAR) != 0;
    if (m.health >= 0x100) {
        mario_stop_riding_and_holding(m);
        if (!noExit) {
            m.hurtCounter = 0;
            m.healCounter = 0;
            if (m.capTimer > 1) {
                m.capTimer = 1;
            }
        }
        if (noExit) {
            starGrabAction = ACT_STAR_DANCE_NO_EXIT;
        }
        if (m.action & ACT_FLAG_SWIMMING) {
            starGrabAction = ACT_STAR_DANCE_WATER;
        }
        if (m.action & ACT_FLAG_METAL_WATER) {
            starGrabAction = ACT_STAR_DANCE_WATER;
        }
        if (m.action & ACT_FLAG_AIR) {
            starGrabAction = ACT_FALL_AFTER_STAR_GRAB;
        }
        spawn_object(o, MODEL_NONE,B.bhvStarKeyCollectionPuffSpawner);
        o.oInteractStatus = INT_STATUS_INTERACTED;
        m.interactObj = o;
        m.usedObj = o;
        starIndex = (o.oBhvParams >> 24) & 0x1F;
        F.save_file_collect_star_or_key(m.numCoins, starIndex);
        m.numStars =
            F.save_file_get_total_star_count(W.gCurrSaveFileNum - 1, COURSE_MIN - 1, COURSE_MAX - 1);
        if (!noExit) {
            drop_queued_background_music();
            F.fadeout_level_music(126);
        }
        play_sound(SOUND_MENU_STAR_SOUND, m.marioObj.gfx.cameraToObject);
        F.update_mario_sound_and_camera(m);
        if (grandStar) {
            return F.set_mario_action(m, ACT_JUMBO_STAR_CUTSCENE, 0);
        }
        return F.set_mario_action(m, starGrabAction, noExit + 2 * grandStar);
    }
    return false;
}
function interact_bbh_entrance(m, interactType, o) {
    if (m.action != ACT_BBH_ENTER_SPIN && m.action != ACT_BBH_ENTER_JUMP) {
        mario_stop_riding_and_holding(m);
        o.oInteractStatus = INT_STATUS_INTERACTED;
        m.interactObj = o;
        m.usedObj = o;
        if (m.action & ACT_FLAG_AIR) {
            return F.set_mario_action(m, ACT_BBH_ENTER_SPIN, 0);
        }
        return F.set_mario_action(m, ACT_BBH_ENTER_JUMP, 0);
    }
    return false;
}
function interact_warp(m, interactType, o) {
    let action = 0;
    if (o.oInteractionSubtype & INT_SUBTYPE_FADING_WARP) {
        action = m.action;
        if (action == ACT_TELEPORT_FADE_IN) {
            sJustTeleported = true;
        } else if (!sJustTeleported) {
            if (action == ACT_IDLE || action == ACT_PANTING || action == ACT_STANDING_AGAINST_WALL || action == ACT_CROUCHING) {
                m.interactObj = o;
                m.usedObj = o;
                sJustTeleported = true;
                return F.set_mario_action(m, ACT_TELEPORT_FADE_OUT, 0);
            }
        }
    } else {
        if (m.action != ACT_EMERGE_FROM_PIPE) {
            o.oInteractStatus = INT_STATUS_INTERACTED;
            m.interactObj = o;
            m.usedObj = o;
            play_sound(o.collisionData ==W.SYM('warp_pipe_seg3_collision_03009AC8') ? SOUND_MENU_ENTER_PIPE : SOUND_MENU_ENTER_HOLE, m.marioObj.gfx.cameraToObject);
            mario_stop_riding_object(m);
            return F.set_mario_action(m, ACT_DISAPPEARED, (WARP_OP_WARP_OBJECT << 16) + 2);
        }
    }
    return false;
}
function interact_warp_door(m, interactType, o) {
    let doorAction = 0;
    let saveFlags = F.save_file_get_flags();
    let warpDoorId = s16(o.oBhvParams >> 24);
    let actionArg = 0;
    if (m.action == ACT_WALKING || m.action == ACT_DECELERATING) {
        if (warpDoorId == 1 && !(saveFlags & SAVE_FLAG_UNLOCKED_UPSTAIRS_DOOR)) {
            if (!(saveFlags & SAVE_FLAG_HAVE_KEY_2)) {
                if (!sDisplayingDoorText) {
                    F.set_mario_action(m, ACT_READING_AUTOMATIC_DIALOG, (saveFlags & SAVE_FLAG_HAVE_KEY_1) ? DIALOG_023 : DIALOG_022);
                }
                sDisplayingDoorText = true;
                return false;
            }
            doorAction = ACT_UNLOCKING_KEY_DOOR;
        }
        if (warpDoorId == 2 && !(saveFlags & SAVE_FLAG_UNLOCKED_BASEMENT_DOOR)) {
            if (!(saveFlags & SAVE_FLAG_HAVE_KEY_1)) {
                if (!sDisplayingDoorText) {
                    F.set_mario_action(m, ACT_READING_AUTOMATIC_DIALOG, (saveFlags & SAVE_FLAG_HAVE_KEY_2) ? DIALOG_023 : DIALOG_022);
                }
                sDisplayingDoorText = true;
                return false;
            }
            doorAction = ACT_UNLOCKING_KEY_DOOR;
        }
        if (m.action == ACT_WALKING || m.action == ACT_DECELERATING) {
            actionArg = should_push_or_pull_door(m, o) + 0x00000004;
            if (doorAction == 0) {
                if (actionArg & 0x00000001) {
                    doorAction = ACT_PULLING_DOOR;
                } else {
                    doorAction = ACT_PUSHING_DOOR;
                }
            }
            m.interactObj = o;
            m.usedObj = o;
            return F.set_mario_action(m, doorAction, actionArg);
        }
    }
    return false;
}
function get_door_save_file_flag(door) {
    let saveFileFlag = 0;
    let requiredNumStars = s16(door.oBhvParams >> 24);
    let isCCMDoor = s16(door.oPosX < 0.0);
    let isPSSDoor = s16(door.oPosY > 500.0);
    switch (requiredNumStars) {
        case 1:
            if (isPSSDoor) {
                saveFileFlag = SAVE_FLAG_UNLOCKED_PSS_DOOR;
            } else {
                saveFileFlag = SAVE_FLAG_UNLOCKED_WF_DOOR;
            }
            break;
        case 3:
            if (isCCMDoor) {
                saveFileFlag = SAVE_FLAG_UNLOCKED_CCM_DOOR;
            } else {
                saveFileFlag = SAVE_FLAG_UNLOCKED_JRB_DOOR;
            }
            break;
        case 8:
            saveFileFlag = SAVE_FLAG_UNLOCKED_BITDW_DOOR;
            break;
        case 30:
            saveFileFlag = SAVE_FLAG_UNLOCKED_BITFS_DOOR;
            break;
        case 50:
            saveFileFlag = SAVE_FLAG_UNLOCKED_50_STAR_DOOR;
            break;
    }
    return saveFileFlag;
}
function interact_door(m, interactType, o) {
    let requiredNumStars = s16(o.oBhvParams >> 24);
    let numStars = s16(F.save_file_get_total_star_count(W.gCurrSaveFileNum - 1, COURSE_MIN - 1, COURSE_MAX - 1));
    if (m.action == ACT_WALKING || m.action == ACT_DECELERATING) {
        if (numStars >= requiredNumStars) {
            let actionArg = should_push_or_pull_door(m, o);
            let enterDoorAction = 0;
            let doorSaveFileFlag = 0;
            if (actionArg & 0x00000001) {
                enterDoorAction = ACT_PULLING_DOOR;
            } else {
                enterDoorAction = ACT_PUSHING_DOOR;
            }
            doorSaveFileFlag = get_door_save_file_flag(o);
            m.interactObj = o;
            m.usedObj = o;
            if (o.oInteractionSubtype & INT_SUBTYPE_STAR_DOOR) {
                enterDoorAction = ACT_ENTERING_STAR_DOOR;
            }
            if (doorSaveFileFlag != 0 && !(F.save_file_get_flags() & doorSaveFileFlag)) {
                enterDoorAction = ACT_UNLOCKING_STAR_DOOR;
            }
            return F.set_mario_action(m, enterDoorAction, actionArg);
        } else if (!sDisplayingDoorText) {
            let text = DIALOG_022 << 16;
            switch (requiredNumStars) {
                case 1:
                    text = DIALOG_024 << 16;
                    break;
                case 3:
                    text = DIALOG_025 << 16;
                    break;
                case 8:
                    text = DIALOG_026 << 16;
                    break;
                case 30:
                    text = DIALOG_027 << 16;
                    break;
                case 50:
                    text = DIALOG_028 << 16;
                    break;
                case 70:
                    text = DIALOG_029 << 16;
                    break;
            }
            text += requiredNumStars - numStars;
            sDisplayingDoorText = true;
            return F.set_mario_action(m, ACT_READING_AUTOMATIC_DIALOG, text);
        }
    } else if (m.action == ACT_IDLE && sDisplayingDoorText == true && requiredNumStars == 70) {
        m.interactObj = o;
        m.usedObj = o;
        return F.set_mario_action(m, ACT_ENTERING_STAR_DOOR, should_push_or_pull_door(m, o));
    }
    return false;
}
function interact_cannon_base(m, interactType, o) {
    if (m.action != ACT_IN_CANNON) {
        mario_stop_riding_and_holding(m);
        o.oInteractStatus = INT_STATUS_INTERACTED;
        m.interactObj = o;
        m.usedObj = o;
        return F.set_mario_action(m, ACT_IN_CANNON, 0);
    }
    return false;
}
function interact_igloo_barrier(m, interactType, o) {
    m.interactObj = o;
    m.usedObj = o;
    push_mario_out_of_object(m, o, 5.0);
    return false;
}
function interact_tornado(m, interactType, o) {
    let marioObj = m.marioObj;
    if (m.action != ACT_TORNADO_TWIRLING && m.action != ACT_SQUISHED) {
        mario_stop_riding_and_holding(m);
        F.mario_set_forward_vel(m, 0.0);
        F.update_mario_sound_and_camera(m);
        o.oInteractStatus = INT_STATUS_INTERACTED;
        m.interactObj = o;
        m.usedObj = o;
        marioObj.oMarioTornadoYawVel = 0x400;
        marioObj.oMarioTornadoPosY = m.pos[1] - o.oPosY;
        play_sound(SOUND_MARIO_WAAAOOOW, m.marioObj.gfx.cameraToObject);
        return F.set_mario_action(m, ACT_TORNADO_TWIRLING, m.action == ACT_TWIRLING);
    }
    return false;
}
function interact_whirlpool(m, interactType, o) {
    let marioObj = m.marioObj;
    if (m.action != ACT_CAUGHT_IN_WHIRLPOOL) {
        mario_stop_riding_and_holding(m);
        o.oInteractStatus = INT_STATUS_INTERACTED;
        m.interactObj = o;
        m.usedObj = o;
        m.forwardVel = 0.0;
        marioObj.oMarioWhirlpoolPosY = m.pos[1] - o.oPosY;
        play_sound(SOUND_MARIO_WAAAOOOW, m.marioObj.gfx.cameraToObject);
        return F.set_mario_action(m, ACT_CAUGHT_IN_WHIRLPOOL, 0);
    }
    return false;
}
function interact_strong_wind(m, interactType, o) {
    let marioObj = m.marioObj;
    if (m.action != ACT_GETTING_BLOWN) {
        mario_stop_riding_and_holding(m);
        o.oInteractStatus = INT_STATUS_INTERACTED;
        m.interactObj = o;
        m.usedObj = o;
        m.faceAngle[1] = s16(o.oMoveAngleYaw + 0x8000);
        m.gettingBlownGravity = 0.4;
        m.forwardVel = -24.0;
        m.vel[1] = 12.0;
        play_sound(SOUND_MARIO_WAAAOOOW, m.marioObj.gfx.cameraToObject);
        F.update_mario_sound_and_camera(m);
        return F.set_mario_action(m, ACT_GETTING_BLOWN, 0);
    }
    return false;
}
function interact_flame(m, interactType, o) {
    let burningAction = ACT_BURNING_JUMP;
    if (!sInvulnerable && !(m.flags & MARIO_METAL_CAP) && !(m.flags & MARIO_VANISH_CAP) && !(o.oInteractionSubtype & INT_SUBTYPE_DELAY_INVINCIBILITY)) {
        o.oInteractStatus = INT_STATUS_INTERACTED;
        m.interactObj = o;
        if ((m.action & (ACT_FLAG_SWIMMING | ACT_FLAG_METAL_WATER)) || m.waterLevel - m.pos[1] > 50.0) {
            play_sound(SOUND_GENERAL_FLAME_OUT, m.marioObj.gfx.cameraToObject);
        } else {
            m.marioObj.oMarioBurnTimer = 0;
            F.update_mario_sound_and_camera(m);
            play_sound(SOUND_MARIO_ON_FIRE, m.marioObj.gfx.cameraToObject);
            if ((m.action & ACT_FLAG_AIR) && m.vel[1] <= 0.0) {
                burningAction = ACT_BURNING_FALL;
            }
            return F.drop_and_set_mario_action(m, burningAction, 1);
        }
    }
    return false;
}
function interact_snufit_bullet(m, interactType, o) {
    if (!sInvulnerable && !(m.flags & MARIO_VANISH_CAP)) {
        if (m.flags & MARIO_METAL_CAP) {
            o.oInteractStatus = INT_STATUS_INTERACTED | INT_STATUS_WAS_ATTACKED;
            play_sound(SOUND_ACTION_UNKNOWN458, m.marioObj.gfx.cameraToObject);
        } else {
            o.oInteractStatus = INT_STATUS_INTERACTED | INT_STATUS_ATTACKED_MARIO;
            m.interactObj = o;
            take_damage_from_interact_object(m);
            play_sound(SOUND_MARIO_ATTACKED, m.marioObj.gfx.cameraToObject);
            F.update_mario_sound_and_camera(m);
            return F.drop_and_set_mario_action(m, determine_knockback_action(m, o.oDamageOrCoinValue), o.oDamageOrCoinValue);
        }
    }
    if (!(o.oInteractionSubtype & INT_SUBTYPE_DELAY_INVINCIBILITY)) {
        sDelayInvincTimer = true;
    }
    return false;
}
function interact_clam_or_bubba(m, interactType, o) {
    if (o.oInteractionSubtype & INT_SUBTYPE_EATS_MARIO) {
        o.oInteractStatus = INT_STATUS_INTERACTED;
        m.interactObj = o;
        return F.set_mario_action(m, ACT_EATEN_BY_BUBBA, 0);
    } else if (take_damage_and_knock_back(m, o)) {
        return true;
    }
    if (!(o.oInteractionSubtype & INT_SUBTYPE_DELAY_INVINCIBILITY)) {
        sDelayInvincTimer = true;
    }
    return true;
}
function interact_bully(m, interactType, o) {
    let filler = new Array(4).fill(0);
    let interaction = 0;
    if (m.flags & MARIO_METAL_CAP) {
        let eraction = INT_FAST_ATTACK_OR_SHELL;
    } else {
        let eraction = determine_interaction(m, o);
    }
    m.interactObj = o;
    if (interaction & INT_ATTACK_NOT_FROM_BELOW) {
        push_mario_out_of_object(m, o, 5.0);
        m.forwardVel = -16.0;
        o.oMoveAngleYaw = m.faceAngle[1];
        o.oForwardVel = 3392.0 / o.hitboxRadius;
        attack_object(o, interaction);
        bounce_back_from_attack(m, interaction);
        return true;
    }
    else if (!sInvulnerable && !(m.flags & MARIO_VANISH_CAP) && !(o.oInteractionSubtype & INT_SUBTYPE_DELAY_INVINCIBILITY)) {
        o.oInteractStatus = INT_STATUS_INTERACTED;
        m.invincTimer = 2;
        F.update_mario_sound_and_camera(m);
        play_sound(SOUND_MARIO_EEUH, m.marioObj.gfx.cameraToObject);
        play_sound(SOUND_OBJ_BULLY_METAL, m.marioObj.gfx.cameraToObject);
        push_mario_out_of_object(m, o, 5.0);
        F.drop_and_set_mario_action(m, bully_knock_back_mario(m), 0);
        return true;
    }
    return false;
}
function interact_shock(m, interactType, o) {
    if (!sInvulnerable && !(m.flags & MARIO_VANISH_CAP) && !(o.oInteractionSubtype & INT_SUBTYPE_DELAY_INVINCIBILITY)) {
        let actionArg = (m.action & (ACT_FLAG_AIR | ACT_FLAG_ON_POLE | ACT_FLAG_HANGING)) == 0;
        o.oInteractStatus = INT_STATUS_INTERACTED | INT_STATUS_ATTACKED_MARIO;
        m.interactObj = o;
        take_damage_from_interact_object(m);
        play_sound(SOUND_MARIO_ATTACKED, m.marioObj.gfx.cameraToObject);
        if (m.action & (ACT_FLAG_SWIMMING | ACT_FLAG_METAL_WATER)) {
            return F.drop_and_set_mario_action(m, ACT_WATER_SHOCKED, 0);
        } else {
            F.update_mario_sound_and_camera(m);
            return F.drop_and_set_mario_action(m, ACT_SHOCKED, actionArg);
        }
    }
    if (!(o.oInteractionSubtype & INT_SUBTYPE_DELAY_INVINCIBILITY)) {
        sDelayInvincTimer = true;
    }
    return false;
}
function interact_stub(m, interactType, o) {
    if (!(o.oInteractionSubtype & INT_SUBTYPE_DELAY_INVINCIBILITY)) {
        sDelayInvincTimer = true;
    }
    return false;
}
function interact_mr_blizzard(m, interactType, o) {
    if (take_damage_and_knock_back(m, o)) {
        return true;
    }
    if (!(o.oInteractionSubtype & INT_SUBTYPE_DELAY_INVINCIBILITY)) {
        sDelayInvincTimer = true;
    }
    return false;
}
function interact_hit_from_below(m, interactType, o) {
    let filler = new Array(4).fill(0);
    let interaction = 0;
    if (m.flags & MARIO_METAL_CAP) {
        let eraction = INT_FAST_ATTACK_OR_SHELL;
    } else {
        let eraction = determine_interaction(m, o);
    }
    if (interaction & INT_ANY_ATTACK) {
        attack_object(o, interaction);
        bounce_back_from_attack(m, interaction);
        if (interaction & INT_HIT_FROM_BELOW) {
            hit_object_from_below(m, o);
        }
        if (interaction & INT_HIT_FROM_ABOVE) {
            if (o.oInteractionSubtype & INT_SUBTYPE_TWIRL_BOUNCE) {
                bounce_off_object(m, o, 80.0);
                reset_mario_pitch(m);
                play_sound(SOUND_MARIO_TWIRL_BOUNCE, m.marioObj.gfx.cameraToObject);
                return F.drop_and_set_mario_action(m, ACT_TWIRLING, 0);
            } else {
                bounce_off_object(m, o, 30.0);
            }
        }
    } else if (take_damage_and_knock_back(m, o)) {
        return true;
    }
    if (!(o.oInteractionSubtype & INT_SUBTYPE_DELAY_INVINCIBILITY)) {
        sDelayInvincTimer = true;
    }
    return false;
}
function interact_bounce_top(m, interactType, o) {
    let interaction = 0;
    if (m.flags & MARIO_METAL_CAP) {
        let eraction = INT_FAST_ATTACK_OR_SHELL;
    } else {
        let eraction = determine_interaction(m, o);
    }
    if (interaction & INT_ATTACK_NOT_FROM_BELOW) {
        attack_object(o, interaction);
        bounce_back_from_attack(m, interaction);
        if (interaction & INT_HIT_FROM_ABOVE) {
            if (o.oInteractionSubtype & INT_SUBTYPE_TWIRL_BOUNCE) {
                bounce_off_object(m, o, 80.0);
                reset_mario_pitch(m);
                play_sound(SOUND_MARIO_TWIRL_BOUNCE, m.marioObj.gfx.cameraToObject);
                return F.drop_and_set_mario_action(m, ACT_TWIRLING, 0);
            } else {
                bounce_off_object(m, o, 30.0);
            }
        }
    } else if (take_damage_and_knock_back(m, o)) {
        return true;
    }
    if (!(o.oInteractionSubtype & INT_SUBTYPE_DELAY_INVINCIBILITY)) {
        sDelayInvincTimer = true;
    }
    return false;
}
function interact_unknown_08(m, interactType, o) {
    let interaction = determine_interaction(m, o);
    if (interaction & INT_PUNCH) {
        o.oInteractStatus = INT_STATUS_INTERACTED | INT_STATUS_WAS_ATTACKED | ATTACK_PUNCH;
        bounce_back_from_attack(m, interaction);
    } else if (take_damage_and_knock_back(m, o)) {
        return true;
    }
    if (!(o.oInteractionSubtype & INT_SUBTYPE_DELAY_INVINCIBILITY)) {
        sDelayInvincTimer = true;
    }
    return false;
}
function interact_damage(m, interactType, o) {
    if (take_damage_and_knock_back(m, o)) {
        return true;
    }
    if (!(o.oInteractionSubtype & INT_SUBTYPE_DELAY_INVINCIBILITY)) {
        sDelayInvincTimer = true;
    }
    return false;
}
function interact_breakable(m, interactType, o) {
    let interaction = determine_interaction(m, o);
    if (interaction & INT_ATTACK_NOT_WEAK_FROM_ABOVE) {
        attack_object(o, interaction);
        bounce_back_from_attack(m, interaction);
        m.interactObj = o;
        switch (interaction) {
            case INT_HIT_FROM_ABOVE:
                bounce_off_object(m, o, 30.0); 
                break;
            case INT_HIT_FROM_BELOW:
                hit_object_from_below(m, o);
                break;
        }
        return true;
    }
    return false;
}
function interact_koopa_shell(m, interactType, o) {
    if (!(m.action & ACT_FLAG_RIDING_SHELL)) {
        let interaction = determine_interaction(m, o);
        if (interaction == INT_HIT_FROM_ABOVE || m.action == ACT_WALKING || m.action == ACT_HOLD_WALKING) {
            m.interactObj = o;
            m.usedObj = o;
            m.riddenObj = o;
            attack_object(o, interaction);
            F.update_mario_sound_and_camera(m);
            F.play_shell_music();
            mario_drop_held_object(m);
            return F.set_mario_action(m, ACT_RIDING_SHELL_GROUND, 0);
        }
        push_mario_out_of_object(m, o, 2.0);
    }
    return false;
}
function check_object_grab_mario(m, interactType, o) {
    if ((!(m.action & (ACT_FLAG_AIR | ACT_FLAG_INVULNERABLE | ACT_FLAG_ATTACKING)) || !sInvulnerable) && (o.oInteractionSubtype & INT_SUBTYPE_GRABS_MARIO)) {
        if (object_facing_mario(m, o, 0x2AAA)) {
            mario_stop_riding_and_holding(m);
            o.oInteractStatus = INT_STATUS_INTERACTED | INT_STATUS_GRABBED_MARIO;
            m.faceAngle[1] = s16(o.oMoveAngleYaw);
            m.interactObj = o;
            m.usedObj = o;
            F.update_mario_sound_and_camera(m);
            play_sound(SOUND_MARIO_OOOF, m.marioObj.gfx.cameraToObject);
            return F.set_mario_action(m, ACT_GRABBED, 0);
        }
    }
    push_mario_out_of_object(m, o, -5.0);
    return false;
}
function interact_pole(m, interactType, o) {
    let actionId = m.action & ACT_ID_MASK;
    if (actionId >= 0x080 && actionId < 0x0A0) {
        if (!(m.prevAction & ACT_FLAG_ON_POLE) || m.usedObj != o) {
            let lowSpeed = (m.forwardVel <= 10.0);
            let marioObj = m.marioObj;
            mario_stop_riding_and_holding(m);
            m.interactObj = o;
            m.usedObj = o;
            m.vel[1] = 0.0;
            m.forwardVel = 0.0;
            marioObj.oMarioPoleUnk108 = 0;
            marioObj.oMarioPoleYawVel = 0;
            marioObj.oMarioPolePos = m.pos[1] - o.oPosY;
            if (lowSpeed) {
                return F.set_mario_action(m, ACT_GRAB_POLE_SLOW, 0);
            }
            marioObj.oMarioPoleYawVel = Math.trunc((m.forwardVel * 0x100 + 0x1000));
            reset_mario_pitch(m);
            return F.set_mario_action(m, ACT_GRAB_POLE_FAST, 0);
        }
    }
    return false;
}
function interact_hoot(m, interactType, o) {
    let actionId = m.action & ACT_ID_MASK;
    if (actionId >= 0x080 && actionId < 0x098 && (W.gGlobalTimer - m.usedObj.oHootMarioReleaseTime > 30)) {
        mario_stop_riding_and_holding(m);
        o.oInteractStatus = true; 
        m.interactObj = o;
        m.usedObj = o;
        F.update_mario_sound_and_camera(m);
        return F.set_mario_action(m, ACT_RIDING_HOOT, 0);
    }
    return false;
}
function interact_cap(m, interactType, o) {
    let capFlag = get_mario_cap_flag(o);
    let capMusic = (0) & 0xFFFF;
    let capTime = (0) & 0xFFFF;
    if (m.action != ACT_GETTING_BLOWN && capFlag != 0) {
        m.interactObj = o;
        o.oInteractStatus = INT_STATUS_INTERACTED;
        m.flags &= ~MARIO_CAP_ON_HEAD & ~MARIO_CAP_IN_HAND;
        m.flags |= capFlag;
        switch (capFlag) {
            case MARIO_VANISH_CAP:
                capTime = 600;
                capMusic = SEQUENCE_ARGS(4, SEQ_EVENT_POWERUP);
                break;
            case MARIO_METAL_CAP:
                capTime = 600;
                capMusic = SEQUENCE_ARGS(4, SEQ_EVENT_METAL_CAP);
                break;
            case MARIO_WING_CAP:
                capTime = 1800;
                capMusic = SEQUENCE_ARGS(4, SEQ_EVENT_POWERUP);
                break;
        }
        if (capTime > m.capTimer) {
            m.capTimer = capTime;
        }
        if ((m.action & ACT_FLAG_IDLE) || m.action == ACT_WALKING) {
            m.flags |= MARIO_CAP_IN_HAND;
            F.set_mario_action(m, ACT_PUTTING_ON_CAP, 0);
        } else {
            m.flags |= MARIO_CAP_ON_HEAD;
        }
        play_sound(SOUND_MENU_STAR_SOUND, m.marioObj.gfx.cameraToObject);
        play_sound(SOUND_MARIO_HERE_WE_GO, m.marioObj.gfx.cameraToObject);
        if (capMusic != 0) {
            F.play_cap_music(capMusic);
        }
        return true;
    }
    return false;
}
function interact_grabbable(m, interactType, o) {
    let script = virtual_to_segmented(0x13, o.behavior);
    if (o.oInteractionSubtype & INT_SUBTYPE_KICKABLE) {
        let interaction = determine_interaction(m, o);
        if (interaction & (INT_KICK | INT_TRIP)) {
            attack_object(o, interaction);
            bounce_back_from_attack(m, interaction);
            return false;
        }
    }
    if ((o.oInteractionSubtype & INT_SUBTYPE_GRABS_MARIO)) {
        if (check_object_grab_mario(m, interactType, o)) {
            return true;
        }
    }
    if (able_to_grab_object(m, o)) {
        if (!(o.oInteractionSubtype & INT_SUBTYPE_NOT_GRABBABLE)) {
            m.interactObj = o;
            m.input |= INPUT_INTERACT_OBJ_GRABBABLE;
            return true;
        }
    }
    if (script !=B.bhvBowser) {
        push_mario_out_of_object(m, o, -5.0);
    }
    return false;
}
function mario_can_talk(m, arg) {
    let val6 = 0;
    if ((m.action & ACT_FLAG_IDLE) != 0x00000000) {
        return true;
    }
    if (m.action == ACT_WALKING) {
        if (arg) {
            return true;
        }
        val6 = s16(m.marioObj.gfx.anim.id);
        if (val6 == 0x0080 || val6 == 0x007F || val6 == 0x006C) {
            return true;
        }
    }
    return false;
}
const READ_MASK = (INPUT_B_PRESSED | INPUT_A_PRESSED);
const SIGN_RANGE = 0x4000;
function check_read_sign(m, o) {
    if ((m.input & READ_MASK) && mario_can_talk(m, 0) && object_facing_mario(m, o, SIGN_RANGE)) {
        let facingDYaw = s16(s16((o.oMoveAngleYaw + 0x8000)) - m.faceAngle[1]);
        if (facingDYaw >= -SIGN_RANGE && facingDYaw <= SIGN_RANGE) {
            let targetX = o.oPosX + 105.0 * sins(o.oMoveAngleYaw);
            let targetZ = o.oPosZ + 105.0 * coss(o.oMoveAngleYaw);
            m.marioObj.oMarioReadingSignDYaw = facingDYaw;
            m.marioObj.oMarioReadingSignDPosX = targetX - m.pos[0];
            m.marioObj.oMarioReadingSignDPosZ = targetZ - m.pos[2];
            m.interactObj = o;
            m.usedObj = o;
            return F.set_mario_action(m, ACT_READING_SIGN, 0);
        }
    }
    return false;
}
function check_npc_talk(m, o) {
    if ((m.input & READ_MASK) && mario_can_talk(m, 1)) {
        let facingDYaw = s16(mario_obj_angle_to_object(m, o) - m.faceAngle[1]);
        if (facingDYaw >= -0x4000 && facingDYaw <= 0x4000) {
            o.oInteractStatus = INT_STATUS_INTERACTED;
            m.interactObj = o;
            m.usedObj = o;
            push_mario_out_of_object(m, o, -10.0);
            return F.set_mario_action(m, ACT_WAITING_FOR_DIALOG, 0);
        }
    }
    push_mario_out_of_object(m, o, -10.0);
    return false;
}
function interact_text(m, interactType, o) {
    let interact = false;
    if (o.oInteractionSubtype & INT_SUBTYPE_SIGN) {
        let eract = F.check_read_sign(m, o);
    } else if (o.oInteractionSubtype & INT_SUBTYPE_NPC) {
        let eract = check_npc_talk(m, o);
    } else {
        push_mario_out_of_object(m, o, 2.0);
    }
    return interact;
}
function check_kick_or_punch_wall(m) {
    if (m.flags & (MARIO_PUNCHING | MARIO_KICKING | MARIO_TRIPPING)) {
        let detector = [0, 0, 0];
        detector[0] = m.pos[0] + 50.0 * sins(m.faceAngle[1]);
        detector[2] = m.pos[2] + 50.0 * coss(m.faceAngle[1]);
        detector[1] = m.pos[1];
        if (resolve_and_return_wall_collisions(detector, 80.0, 5.0) != null) {
            if (m.action != ACT_MOVE_PUNCHING || m.forwardVel >= 0.0) {
                if (m.action == ACT_PUNCHING) {
                    m.action = ACT_MOVE_PUNCHING;
                }
                F.mario_set_forward_vel(m, -48.0);
                play_sound(SOUND_ACTION_HIT_2, m.marioObj.gfx.cameraToObject);
                m.particleFlags |= PARTICLE_TRIANGLE;
            } else if (m.action & ACT_FLAG_AIR) {
                F.mario_set_forward_vel(m, -16.0);
                play_sound(SOUND_ACTION_HIT_2, m.marioObj.gfx.cameraToObject);
                m.particleFlags |= PARTICLE_TRIANGLE;
            }
        }
    }
}
function mario_process_interactions(m) {
    sDelayInvincTimer = false;
    sInvulnerable = (m.action & ACT_FLAG_INVULNERABLE) || m.invincTimer != 0;
    if (!(m.action & ACT_FLAG_INTANGIBLE) && m.collidedObjInteractTypes != 0) {
        let i = 0;
        for (i = 0; i < ARRAY_COUNT(sInteractionHandlers); i++) {
            let interactType = sInteractionHandlers[i].interactType;
            if (m.collidedObjInteractTypes & interactType) {
                let object = mario_get_collided_object(m, interactType);
                m.collidedObjInteractTypes &= ~interactType;
                if (!(object.oInteractStatus & INT_STATUS_INTERACTED)) {
                    if (sInteractionHandlers[i].handler(m, interactType, object)) {
                        break;
                    }
                }
            }
        }
    }
    if (m.invincTimer > 0 && !sDelayInvincTimer) {
        m.invincTimer--;
    }
    check_kick_or_punch_wall(m);
    m.flags &= ~MARIO_PUNCHING & ~MARIO_KICKING & ~MARIO_TRIPPING;
    if (!(m.marioObj.collidedObjInteractTypes & (INTERACT_WARP_DOOR | INTERACT_DOOR))) {
        sDisplayingDoorText = false;
    }
    if (!(m.marioObj.collidedObjInteractTypes & INTERACT_WARP)) {
        sJustTeleported = false;
    }
}
function check_death_barrier(m) {
    if (m.pos[1] < m.floorHeight + 2048.0) {
        if (F.level_trigger_warp(m, WARP_OP_WARP_FLOOR) == 20 && !(m.flags & MARIO_UNKNOWN_18)) {
            play_sound(SOUND_MARIO_WAAAOOOW, m.marioObj.gfx.cameraToObject);
        }
    }
}
function check_lava_boost(m) {
    if (!(m.action & ACT_FLAG_RIDING_SHELL) && m.pos[1] < m.floorHeight + 10.0) {
        if (!(m.flags & MARIO_METAL_CAP)) {
            m.hurtCounter += (m.flags & MARIO_CAP_ON_HEAD) ? 12 : 18;
        }
        F.update_mario_sound_and_camera(m);
        F.drop_and_set_mario_action(m, ACT_LAVA_BOOST, 0);
    }
}
function pss_begin_slide(m) {
    if (!(W.gHudDisplay.flags & HUD_DISPLAY_FLAG_TIMER)) {
        F.level_control_timer(TIMER_CONTROL_SHOW);
        F.level_control_timer(TIMER_CONTROL_START);
        sPSSSlideStarted = true;
    }
}
function pss_end_slide(m) {
    if (sPSSSlideStarted) {
        let slideTime = (F.level_control_timer(TIMER_CONTROL_STOP)) & 0xFFFF;
        if (slideTime < 630) {
            m.marioObj.oBhvParams = (STAR_INDEX_ACT_2 << 24);
            F.spawn_default_star(-6358.0, -4300.0, 4700.0);
        }
        sPSSSlideStarted = false;
    }
}
function mario_handle_special_floors(m) {
    if ((m.action & ACT_GROUP_MASK) == ACT_GROUP_CUTSCENE) {
        return;
    }
    if (m.floor != null) {
        let floorType = m.floor.type;
        switch (floorType) {
            case SURFACE_DEATH_PLANE:
            case SURFACE_VERTICAL_WIND:
                check_death_barrier(m);
                break;
            case SURFACE_WARP:
                F.level_trigger_warp(m, WARP_OP_WARP_FLOOR);
                break;
            case SURFACE_TIMER_START:
                pss_begin_slide(m);
                break;
            case SURFACE_TIMER_END:
                pss_end_slide(m);
                break;
        }
        if (!(m.action & ACT_FLAG_AIR) && !(m.action & ACT_FLAG_SWIMMING)) {
            switch (floorType) {
                case SURFACE_BURNING:
                    check_lava_boost(m);
                    break;
            }
        }
    }
}

Object.assign(F, { get_mario_cap_flag, object_facing_mario, mario_obj_angle_to_object, determine_interaction, attack_object, mario_stop_riding_object, mario_grab_used_object, mario_drop_held_object, mario_throw_held_object, mario_stop_riding_and_holding, does_mario_have_normal_cap_on_head, mario_blow_off_cap, mario_lose_cap_to_enemy, mario_retrieve_cap, able_to_grab_object, mario_get_collided_object, mario_check_object_grab, bully_knock_back_mario, bounce_off_object, hit_object_from_below, unused_determine_knockback_action, determine_knockback_action, push_mario_out_of_object, bounce_back_from_attack, should_push_or_pull_door, take_damage_from_interact_object, take_damage_and_knock_back, reset_mario_pitch, interact_coin, interact_water_ring, interact_star_or_key, interact_bbh_entrance, interact_warp, interact_warp_door, get_door_save_file_flag, interact_door, interact_cannon_base, interact_igloo_barrier, interact_tornado, interact_whirlpool, interact_strong_wind, interact_flame, interact_snufit_bullet, interact_clam_or_bubba, interact_bully, interact_shock, interact_stub, interact_mr_blizzard, interact_hit_from_below, interact_bounce_top, interact_unknown_08, interact_damage, interact_breakable, interact_koopa_shell, check_object_grab_mario, interact_pole, interact_hoot, interact_cap, interact_grabbable, mario_can_talk, check_read_sign, check_npc_talk, interact_text, check_kick_or_punch_wall, mario_process_interactions, check_death_barrier, check_lava_boost, pss_begin_slide, pss_end_slide, mario_handle_special_floors });

})(window);

/* Mario standing: ported from the Super Mario 64 decompilation (github.com/n64decomp/sm64): src/game/mario_actions_stationary.c */
(function (root) {
'use strict';
const SM64 = root.SM64, F = SM64.F = SM64.F || {}, W = SM64.W = SM64.W || {}, B = SM64.B = SM64.B || {};
const { s16, s8, sins, coss, atan2s, sqr, approach_f32, approach_s32, max, min, abs, REF, REFA, REFV } = SM64.m;
/*CONSTS*/
const { ACT_AIR_THROW_LAND, ACT_BACKFLIP, ACT_BACKFLIP_LAND_STOP, ACT_BACKWARD_GROUND_KB, ACT_BEGIN_SLIDING, 
  ACT_BRAKING_STOP, ACT_BUTT_SLIDE, ACT_BUTT_SLIDE_STOP, ACT_COUGHING, ACT_CRAWLING, ACT_CRAZY_BOX_BOUNCE, 
  ACT_CROUCHING, ACT_DOUBLE_JUMP_LAND_STOP, ACT_FIRST_PERSON, ACT_FREEFALL, ACT_FREEFALL_LAND_STOP, 
  ACT_GROUND_POUND_LAND, ACT_HEAVY_THROW, ACT_HOLD_BEGIN_SLIDING, ACT_HOLD_BUTT_SLIDE_STOP, ACT_HOLD_FREEFALL, 
  ACT_HOLD_FREEFALL_LAND_STOP, ACT_HOLD_HEAVY_IDLE, ACT_HOLD_HEAVY_WALKING, ACT_HOLD_IDLE, ACT_HOLD_JUMP, 
  ACT_HOLD_JUMP_LAND_STOP, ACT_HOLD_PANTING_UNUSED, ACT_HOLD_WALKING, ACT_IDLE, ACT_IN_QUICKSAND, ACT_JUMP, 
  ACT_JUMP_LAND_STOP, ACT_LAVA_BOOST_LAND, ACT_LONG_JUMP_LAND_STOP, ACT_PANTING, ACT_PLACING_DOWN, ACT_PUNCHING, 
  ACT_SHIVERING, ACT_SHOCKED, ACT_SHOCKWAVE_BOUNCE, ACT_SIDE_FLIP_LAND_STOP, ACT_SLEEPING, ACT_SLIDE_KICK_SLIDE_STOP, 
  ACT_SPAWN_SPIN_LANDING, ACT_SQUISHED, ACT_STANDING_AGAINST_WALL, ACT_STANDING_DEATH, ACT_START_CRAWLING, 
  ACT_START_CROUCHING, ACT_START_SLEEPING, ACT_STOP_CRAWLING, ACT_STOP_CROUCHING, ACT_THROWING, 
  ACT_TRIPLE_JUMP_LAND_STOP, ACT_TWIRL_LAND, ACT_UNKNOWN_0002020E, ACT_WAKING_UP, ACT_WALKING, CAMERA_MODE_C_UP, 
  COURSE_MAX, COURSE_MIN, INPUT_ABOVE_SLIDE, INPUT_A_PRESSED, INPUT_B_PRESSED, INPUT_FIRST_PERSON, 
  INPUT_IN_POISON_GAS, INPUT_IN_WATER, INPUT_NONZERO_ANALOG, INPUT_OFF_FLOOR, INPUT_SQUISHED, INPUT_STOMPED, 
  INPUT_Z_DOWN, INPUT_Z_PRESSED, INT_STATUS_MARIO_DROP_OBJECT, INT_STATUS_MARIO_KNOCKBACK_DMG, 
  INT_STATUS_MARIO_SHOCKWAVE, INT_SUBTYPE_DROP_IMMEDIATELY, MARIO_ACTION_SOUND_PLAYED, MARIO_ANIM_A_POSE, 
  MARIO_ANIM_COUGHING, MARIO_ANIM_CROUCHING, MARIO_ANIM_CROUCH_FROM_FAST_LONGJUMP, MARIO_ANIM_CROUCH_FROM_SLIDE_KICK, 
  MARIO_ANIM_CROUCH_FROM_SLOW_LONGJUMP, MARIO_ANIM_DYING_IN_QUICKSAND, MARIO_ANIM_FALL_LAND_WITH_LIGHT_OBJ, 
  MARIO_ANIM_FIRST_PERSON, MARIO_ANIM_GENERAL_LAND, MARIO_ANIM_GROUND_POUND_LANDING, MARIO_ANIM_IDLE_HEAD_CENTER, 
  MARIO_ANIM_IDLE_HEAD_LEFT, MARIO_ANIM_IDLE_HEAD_RIGHT, MARIO_ANIM_IDLE_HEAVY_OBJ, MARIO_ANIM_IDLE_IN_QUICKSAND, 
  MARIO_ANIM_IDLE_WITH_LIGHT_OBJ, MARIO_ANIM_JUMP_LAND_WITH_LIGHT_OBJ, MARIO_ANIM_LAND_FROM_DOUBLE_JUMP, 
  MARIO_ANIM_LAND_FROM_SINGLE_JUMP, MARIO_ANIM_SHIVERING, MARIO_ANIM_SHIVERING_RETURN_TO_IDLE, 
  MARIO_ANIM_SHIVERING_WARMING_HAND, MARIO_ANIM_SLEEP_IDLE, MARIO_ANIM_SLEEP_LYING, MARIO_ANIM_SLEEP_START_LYING, 
  MARIO_ANIM_SLIDEFLIP_LAND, MARIO_ANIM_STAND_AGAINST_WALL, MARIO_ANIM_STAND_UP_FROM_LAVA_BOOST, 
  MARIO_ANIM_STAND_UP_FROM_SLIDING_WITH_LIGHT_OBJ, MARIO_ANIM_START_CRAWLING, MARIO_ANIM_START_CROUCHING, 
  MARIO_ANIM_START_SLEEP_IDLE, MARIO_ANIM_START_SLEEP_SCRATCH, MARIO_ANIM_START_SLEEP_SITTING, 
  MARIO_ANIM_START_SLEEP_YAWN, MARIO_ANIM_STOP_CRAWLING, MARIO_ANIM_STOP_CROUCHING, MARIO_ANIM_STOP_SKID, 
  MARIO_ANIM_STOP_SLIDE, MARIO_ANIM_THROW_LIGHT_OBJECT, MARIO_ANIM_TRIPLE_JUMP_LAND, MARIO_ANIM_TWIRL_LAND, 
  MARIO_ANIM_WAKE_FROM_LYING, MARIO_ANIM_WAKE_FROM_SLEEP, MARIO_ANIM_WALK_PANTING, MARIO_EYES_CLOSED, 
  MARIO_EYES_HALF_CLOSED, PARTICLE_BREATH, PARTICLE_IDLE_WATER_WAVE, SOUND_ACTION_CLAP_HANDS_COLD, 
  SOUND_ACTION_PAT_BACK, SOUND_ACTION_TERRAIN_BODY_HIT_GROUND, SOUND_ACTION_TERRAIN_LANDING, SOUND_MARIO_COUGHING1, 
  SOUND_MARIO_COUGHING2, SOUND_MARIO_COUGHING3, SOUND_MARIO_IMA_TIRED, SOUND_MARIO_PANTING, SOUND_MARIO_PANTING_COLD, 
  SOUND_MARIO_SNORING1, SOUND_MARIO_SNORING2, SOUND_MARIO_SNORING3, SOUND_MARIO_YAWNING, SURFACE_FLAG_DYNAMIC, 
  SURFACE_LOOK_UP_WARP, TERRAIN_MASK, TERRAIN_SNOW, WARP_OP_UNKNOWN_01 } = SM64.C;
/*END CONSTS*/

function check_common_idle_cancels(m) {
    F.mario_drop_held_object(m);
    if (m.floor.ny < 0.29237169) {
        return F.mario_push_off_steep_floor(m, ACT_FREEFALL, 0);
    }
    if (m.input & INPUT_STOMPED) {
        return F.set_mario_action(m, ACT_SHOCKWAVE_BOUNCE, 0);
    }
    if (m.input & INPUT_A_PRESSED) {
        return F.set_jumping_action(m, ACT_JUMP, 0);
    }
    if (m.input & INPUT_OFF_FLOOR) {
        return F.set_mario_action(m, ACT_FREEFALL, 0);
    }
    if (m.input & INPUT_ABOVE_SLIDE) {
        return F.set_mario_action(m, ACT_BEGIN_SLIDING, 0);
    }
    if (m.input & INPUT_FIRST_PERSON) {
        return F.set_mario_action(m, ACT_FIRST_PERSON, 0);
    }
    if (m.input & INPUT_NONZERO_ANALOG) {
        m.faceAngle[1] = s16(s16(m.intendedYaw));
        return F.set_mario_action(m, ACT_WALKING, 0);
    }
    if (m.input & INPUT_B_PRESSED) {
        return F.set_mario_action(m, ACT_PUNCHING, 0);
    }
    if (m.input & INPUT_Z_DOWN) {
        return F.set_mario_action(m, ACT_START_CROUCHING, 0);
    }
    return false;
}
function check_common_hold_idle_cancels(m) {
    if (m.floor.ny < 0.29237169) {
        return F.mario_push_off_steep_floor(m, ACT_HOLD_FREEFALL, 0);
    }
    if (m.heldObj.oInteractionSubtype & INT_SUBTYPE_DROP_IMMEDIATELY) {
        m.heldObj.oInteractionSubtype =
            Math.trunc((m.heldObj.oInteractionSubtype & ~INT_SUBTYPE_DROP_IMMEDIATELY));
        return F.set_mario_action(m, ACT_PLACING_DOWN, 0);
    }
    if (m.input & INPUT_STOMPED) {
        return F.drop_and_set_mario_action(m, ACT_SHOCKWAVE_BOUNCE, 0);
    }
    if (m.input & INPUT_A_PRESSED) {
        return F.set_jumping_action(m, ACT_HOLD_JUMP, 0);
    }
    if (m.input & INPUT_OFF_FLOOR) {
        return F.set_mario_action(m, ACT_HOLD_FREEFALL, 0);
    }
    if (m.input & INPUT_ABOVE_SLIDE) {
        return F.set_mario_action(m, ACT_HOLD_BEGIN_SLIDING, 0);
    }
    if (m.input & INPUT_NONZERO_ANALOG) {
        m.faceAngle[1] = s16(s16(m.intendedYaw));
        return F.set_mario_action(m, ACT_HOLD_WALKING, 0);
    }
    if (m.input & INPUT_B_PRESSED) {
        return F.set_mario_action(m, ACT_THROWING, 0);
    }
    if (m.input & INPUT_Z_DOWN) {
        return F.drop_and_set_mario_action(m, ACT_START_CROUCHING, 0);
    }
    return false;
}
function act_idle(m) {
    if (m.quicksandDepth > 30.0) {
        return F.set_mario_action(m, ACT_IN_QUICKSAND, 0);
    }
    if (m.input & INPUT_IN_POISON_GAS) {
        return F.set_mario_action(m, ACT_COUGHING, 0);
    }
    if (!(m.actionArg & 1) && m.health < 0x300) {
        return F.set_mario_action(m, ACT_PANTING, 0);
    }
    if (check_common_idle_cancels(m)) {
        return true;
    }
    if (m.actionState == 3) {
        if ((m.area.terrainType & TERRAIN_MASK) == TERRAIN_SNOW) {
            return F.set_mario_action(m, ACT_SHIVERING, 0);
        } else {
            return F.set_mario_action(m, ACT_START_SLEEPING, 0);
        }
    }
    if (m.actionArg & 1) {
        F.set_mario_animation(m, MARIO_ANIM_STAND_AGAINST_WALL);
    } else {
        switch (m.actionState) {
            case 0:
                F.set_mario_animation(m, MARIO_ANIM_IDLE_HEAD_LEFT);
                break;
            case 1:
                F.set_mario_animation(m, MARIO_ANIM_IDLE_HEAD_RIGHT);
                break;
            case 2:
                F.set_mario_animation(m, MARIO_ANIM_IDLE_HEAD_CENTER);
                break;
        }
        if (F.is_anim_at_end(m)) {
            if (++m.actionState == 3) {
                let deltaYOfFloorBehindMario = m.pos[1] - F.find_floor_height_relative_polar(m, -0x8000, 60.0);
                if (deltaYOfFloorBehindMario < -24.0 || 24.0 < deltaYOfFloorBehindMario || m.floor.flags & SURFACE_FLAG_DYNAMIC) {
                    m.actionState = 0;
                } else {
                    m.actionTimer++;
                    if (m.actionTimer < 10) {
                        m.actionState = 0;
                    }
                }
            }
        }
    }
    F.stationary_ground_step(m);
    return false;
}
function play_anim_sound(m, actionState, animFrame, sound) {
    if (m.actionState == actionState && m.marioObj.gfx.anim.frame == animFrame) {
        play_sound(sound, m.marioObj.gfx.cameraToObject);
    }
}
function act_start_sleeping(m) {
    let animFrame = 0;
    if (check_common_idle_cancels(m)) {
        return true;
    }
    if (m.quicksandDepth > 30.0) {
        return F.set_mario_action(m, ACT_IN_QUICKSAND, 0);
    }
    if (m.actionState == 4) {
        return F.set_mario_action(m, ACT_SLEEPING, 0);
    }
    switch (m.actionState) {
        case 0:
            animFrame =
            F.set_mario_animation(m, MARIO_ANIM_START_SLEEP_IDLE);
            break;
        case 1:
            animFrame =
            F.set_mario_animation(m, MARIO_ANIM_START_SLEEP_SCRATCH);
            break;
        case 2:
            animFrame =
            F.set_mario_animation(m, MARIO_ANIM_START_SLEEP_YAWN);
            m.marioBodyState.eyeState = MARIO_EYES_HALF_CLOSED;
            break;
        case 3:
            animFrame =
            F.set_mario_animation(m, MARIO_ANIM_START_SLEEP_SITTING);
            m.marioBodyState.eyeState = MARIO_EYES_HALF_CLOSED;
            break;
    }
    play_anim_sound(m, 1, 41, SOUND_ACTION_PAT_BACK);
    play_anim_sound(m, 1, 49, SOUND_ACTION_PAT_BACK);
    play_anim_sound(m, 3, 15, m.terrainSoundAddend + SOUND_ACTION_TERRAIN_BODY_HIT_GROUND);
    if (F.is_anim_at_end(m)) {
        m.actionState++;
    }
    if (m.actionState == 2 && animFrame == -1) {
        play_sound(SOUND_MARIO_YAWNING, m.marioObj.gfx.cameraToObject);
    }
    if (m.actionState == 1 && animFrame == -1) {
        play_sound(SOUND_MARIO_IMA_TIRED, m.marioObj.gfx.cameraToObject);
    }
    F.stationary_ground_step(m);
    return false;
}
function act_sleeping(m) {
    let animFrame = 0;
    if (m.input & (INPUT_NONZERO_ANALOG | INPUT_A_PRESSED | INPUT_OFF_FLOOR | INPUT_ABOVE_SLIDE | INPUT_FIRST_PERSON | INPUT_STOMPED | INPUT_B_PRESSED | INPUT_Z_PRESSED)) {
        return F.set_mario_action(m, ACT_WAKING_UP, m.actionState);
    }
    if (m.quicksandDepth > 30.0) {
        return F.set_mario_action(m, ACT_WAKING_UP, m.actionState);
    }
    if (m.pos[1] - F.find_floor_height_relative_polar(m, -0x8000, 60.0) > 24.0) {
        return F.set_mario_action(m, ACT_WAKING_UP, m.actionState);
    }
    m.marioBodyState.eyeState = MARIO_EYES_CLOSED;
    F.stationary_ground_step(m);
    switch (m.actionState) {
        case 0:
            animFrame = F.set_mario_animation(m, MARIO_ANIM_SLEEP_IDLE);
            if (animFrame == -1 && !m.actionTimer) {
                F.lower_background_noise(2);
            }
            if (animFrame == 2) {
                play_sound(SOUND_MARIO_SNORING1, m.marioObj.gfx.cameraToObject);
            }
            if (animFrame == 20) {
                play_sound(SOUND_MARIO_SNORING2, m.marioObj.gfx.cameraToObject);
            }
            if (F.is_anim_at_end(m)) {
                m.actionTimer++;
                if (m.actionTimer > 45) {
                    m.actionState++;
                }
            }
            break;
        case 1:
            if (F.set_mario_animation(m, MARIO_ANIM_SLEEP_START_LYING) == 18) {
                F.play_mario_heavy_landing_sound(m, SOUND_ACTION_TERRAIN_BODY_HIT_GROUND);
            }
            if (F.is_anim_at_end(m)) {
                m.actionState++;
            }
            break;
        case 2:
            animFrame = F.set_mario_animation(m, MARIO_ANIM_SLEEP_LYING);
            F.play_sound_if_no_flag(m, SOUND_MARIO_SNORING3, MARIO_ACTION_SOUND_PLAYED);
            break;
    }
    return false;
}
function act_waking_up(m) {
    if (!m.actionTimer) {
        stop_sound(SOUND_MARIO_SNORING1, m.marioObj.gfx.cameraToObject);
        stop_sound(SOUND_MARIO_SNORING2, m.marioObj.gfx.cameraToObject);
        stop_sound(SOUND_MARIO_SNORING3, m.marioObj.gfx.cameraToObject);
        F.raise_background_noise(2);
    }
    if (m.input & INPUT_STOMPED) {
        return F.set_mario_action(m, ACT_SHOCKWAVE_BOUNCE, 0);
    }
    if (m.input & INPUT_OFF_FLOOR) {
        return F.set_mario_action(m, ACT_FREEFALL, 0);
    }
    if (m.input & INPUT_ABOVE_SLIDE) {
        return F.set_mario_action(m, ACT_BEGIN_SLIDING, 0);
    }
    m.actionTimer++;
    if (m.actionTimer > 20) {
        return F.set_mario_action(m, ACT_IDLE, 0);
    }
    F.stationary_ground_step(m);
    F.set_mario_animation(m, !m.actionArg ? MARIO_ANIM_WAKE_FROM_SLEEP : MARIO_ANIM_WAKE_FROM_LYING);
    return false;
}
function act_shivering(m) {
    let animFrame = 0;
    if (m.input & INPUT_STOMPED) {
        return F.set_mario_action(m, ACT_SHOCKWAVE_BOUNCE, 0);
    }
    if (m.input & INPUT_OFF_FLOOR) {
        return F.set_mario_action(m, ACT_FREEFALL, 0);
    }
    if (m.input & INPUT_ABOVE_SLIDE) {
        return F.set_mario_action(m, ACT_BEGIN_SLIDING, 0);
    }
    if (m.input & (INPUT_NONZERO_ANALOG | INPUT_A_PRESSED | INPUT_OFF_FLOOR | INPUT_ABOVE_SLIDE | INPUT_FIRST_PERSON | INPUT_STOMPED | INPUT_B_PRESSED | INPUT_Z_PRESSED)) {
        m.actionState = 2;
    }
    F.stationary_ground_step(m);
    switch (m.actionState) {
        case 0:
            animFrame = F.set_mario_animation(m, MARIO_ANIM_SHIVERING_WARMING_HAND);
            if (animFrame == 49) {
                m.particleFlags |= PARTICLE_BREATH;
                play_sound(SOUND_MARIO_PANTING_COLD, m.marioObj.gfx.cameraToObject);
            }
            if (animFrame == 7 || animFrame == 81) {
                play_sound(SOUND_ACTION_CLAP_HANDS_COLD, m.marioObj.gfx.cameraToObject);
            }
            if (F.is_anim_past_end(m)) {
                m.actionState = 1;
            }
            break;
        case 1:
            animFrame = F.set_mario_animation(m, MARIO_ANIM_SHIVERING);
            if (animFrame == 9 || animFrame == 25 || animFrame == 44) {
                play_sound(SOUND_ACTION_CLAP_HANDS_COLD, m.marioObj.gfx.cameraToObject);
            }
            break;
        case 2:
            F.set_mario_animation(m, MARIO_ANIM_SHIVERING_RETURN_TO_IDLE);
            if (F.is_anim_past_end(m)) {
                F.set_mario_action(m, ACT_IDLE, 0);
            }
            break;
    }
    return false;
}
function act_coughing(m) {
    let animFrame = 0;
    if (check_common_idle_cancels(m)) {
        return true;
    }
    F.stationary_ground_step(m);
    animFrame = F.set_mario_animation(m, MARIO_ANIM_COUGHING);
    if (animFrame == 25 || animFrame == 35) {
        play_sound(SOUND_MARIO_COUGHING3, m.marioObj.gfx.cameraToObject);
    }
    if (animFrame == 50 || animFrame == 58) {
        play_sound(SOUND_MARIO_COUGHING2, m.marioObj.gfx.cameraToObject);
    }
    if (animFrame == 71 || animFrame == 80) {
        play_sound(SOUND_MARIO_COUGHING1, m.marioObj.gfx.cameraToObject);
    }
    return false;
}
function act_hold_idle(m) {
    if (REFV(() =>B.bhvJumpingBox, $ =>B.bhvJumpingBox = $) == m.heldObj.behavior) {
        return F.set_mario_action(m, ACT_CRAZY_BOX_BOUNCE, 0);
    }
    if (m.marioObj.oInteractStatus & INT_STATUS_MARIO_DROP_OBJECT) {
        return F.drop_and_set_mario_action(m, ACT_IDLE, 0);
    }
    if (m.quicksandDepth > 30.0) {
        return F.drop_and_set_mario_action(m, ACT_IN_QUICKSAND, 0);
    }
    if (check_common_hold_idle_cancels(m)) {
        return true;
    }
    F.stationary_ground_step(m);
    F.set_mario_animation(m, MARIO_ANIM_IDLE_WITH_LIGHT_OBJ);
    return false;
}
function act_hold_heavy_idle(m) {
    if (m.input & INPUT_STOMPED) {
        return F.drop_and_set_mario_action(m, ACT_SHOCKWAVE_BOUNCE, 0);
    }
    if (m.input & INPUT_OFF_FLOOR) {
        return F.drop_and_set_mario_action(m, ACT_FREEFALL, 0);
    }
    if (m.input & INPUT_ABOVE_SLIDE) {
        return F.drop_and_set_mario_action(m, ACT_BEGIN_SLIDING, 0);
    }
    if (m.input & INPUT_NONZERO_ANALOG) {
        return F.set_mario_action(m, ACT_HOLD_HEAVY_WALKING, 0);
    }
    if (m.input & INPUT_B_PRESSED) {
        return F.set_mario_action(m, ACT_HEAVY_THROW, 0);
    }
    F.stationary_ground_step(m);
    F.set_mario_animation(m, MARIO_ANIM_IDLE_HEAVY_OBJ);
    return false;
}
function act_standing_against_wall(m) {
    if (m.input & INPUT_STOMPED) {
        return F.set_mario_action(m, ACT_SHOCKWAVE_BOUNCE, 0);
    }
    if (m.input & (INPUT_NONZERO_ANALOG | INPUT_A_PRESSED | INPUT_OFF_FLOOR | INPUT_ABOVE_SLIDE)) {
        return F.check_common_action_exits(m);
    }
    if (m.input & INPUT_FIRST_PERSON) {
        return F.set_mario_action(m, ACT_FIRST_PERSON, 0);
    }
    if (m.input & INPUT_B_PRESSED) {
        return F.set_mario_action(m, ACT_PUNCHING, 0);
    }
    F.set_mario_animation(m, MARIO_ANIM_STAND_AGAINST_WALL);
    F.stationary_ground_step(m);
    return false;
}
function act_in_quicksand(m) {
    if (m.quicksandDepth < 30.0) {
        return F.set_mario_action(m, ACT_IDLE, 0);
    }
    if (check_common_idle_cancels(m)) {
        return true;
    }
    if (m.quicksandDepth > 70.0) {
        F.set_mario_animation(m, MARIO_ANIM_DYING_IN_QUICKSAND);
    } else {
        F.set_mario_animation(m, MARIO_ANIM_IDLE_IN_QUICKSAND);
    }
    F.stationary_ground_step(m);
    return false;
}
function act_crouching(m) {
    if (m.input & INPUT_STOMPED) {
        return F.set_mario_action(m, ACT_SHOCKWAVE_BOUNCE, 0);
    }
    if (m.input & INPUT_A_PRESSED) {
        return F.set_jumping_action(m, ACT_BACKFLIP, 0);
    }
    if (m.input & INPUT_OFF_FLOOR) {
        return F.set_mario_action(m, ACT_FREEFALL, 0);
    }
    if (m.input & INPUT_ABOVE_SLIDE) {
        return F.set_mario_action(m, ACT_BEGIN_SLIDING, 0);
    }
    if (m.input & INPUT_FIRST_PERSON) {
        return F.set_mario_action(m, ACT_STOP_CROUCHING, 0);
    }
    if (!(m.input & INPUT_Z_DOWN)) {
        return F.set_mario_action(m, ACT_STOP_CROUCHING, 0);
    }
    if (m.input & INPUT_NONZERO_ANALOG) {
        return F.set_mario_action(m, ACT_START_CRAWLING, 0);
    }
    if (m.input & INPUT_B_PRESSED) {
        return F.set_mario_action(m, ACT_PUNCHING, 9);
    }
    F.stationary_ground_step(m);
    F.set_mario_animation(m, MARIO_ANIM_CROUCHING);
    return false;
}
function act_panting(m) {
    if (m.input & INPUT_STOMPED) {
        return F.set_mario_action(m, ACT_SHOCKWAVE_BOUNCE, 0);
    }
    if (m.health >= 0x500) {
        return F.set_mario_action(m, ACT_IDLE, 0);
    }
    if (check_common_idle_cancels(m)) {
        return true;
    }
    if (F.set_mario_animation(m, MARIO_ANIM_WALK_PANTING) == 1) {
        play_sound(SOUND_MARIO_PANTING + ((W.gAudioRandom % 3) << 0x10), m.marioObj.gfx.cameraToObject);
    }
    F.stationary_ground_step(m);
    m.marioBodyState.eyeState = MARIO_EYES_HALF_CLOSED;
    return false;
}
function act_hold_panting_unused(m) {
    if (m.marioObj.oInteractStatus & INT_STATUS_MARIO_DROP_OBJECT) {
        return F.drop_and_set_mario_action(m, ACT_PANTING, 0);
    }
    if (m.input & INPUT_STOMPED) {
        return F.drop_and_set_mario_action(m, ACT_SHOCKWAVE_BOUNCE, 0);
    }
    if (m.health >= 0x500) {
        return F.set_mario_action(m, ACT_HOLD_IDLE, 0);
    }
    if (check_common_hold_idle_cancels(m)) {
        return true;
    }
    F.set_mario_animation(m, MARIO_ANIM_WALK_PANTING);
    F.stationary_ground_step(m);
    m.marioBodyState.eyeState = MARIO_EYES_HALF_CLOSED;
    return false;
}
function stopping_step(m, animID, action) {
    F.stationary_ground_step(m);
    F.set_mario_animation(m, animID);
    if (F.is_anim_at_end(m)) {
        F.set_mario_action(m, action, 0);
    }
}
function act_braking_stop(m) {
    if (m.input & INPUT_STOMPED) {
        return F.set_mario_action(m, ACT_SHOCKWAVE_BOUNCE, 0);
    }
    if (m.input & INPUT_OFF_FLOOR) {
        return F.set_mario_action(m, ACT_FREEFALL, 0);
    }
    if (m.input & INPUT_B_PRESSED) {
        return F.set_mario_action(m, ACT_PUNCHING, 0);
    }
    if (!(m.input & INPUT_FIRST_PERSON) && m.input & (INPUT_NONZERO_ANALOG | INPUT_A_PRESSED | INPUT_OFF_FLOOR | INPUT_ABOVE_SLIDE)) {
        return F.check_common_action_exits(m);
    }
    stopping_step(m, MARIO_ANIM_STOP_SKID, ACT_IDLE);
    return false;
}
function act_butt_slide_stop(m) {
    if (m.input & INPUT_STOMPED) {
        return F.set_mario_action(m, ACT_SHOCKWAVE_BOUNCE, 0);
    }
    if (m.input & (INPUT_NONZERO_ANALOG | INPUT_A_PRESSED | INPUT_OFF_FLOOR | INPUT_ABOVE_SLIDE)) {
        return F.check_common_action_exits(m);
    }
    stopping_step(m, MARIO_ANIM_STOP_SLIDE, ACT_IDLE);
    if (m.marioObj.gfx.anim.frame == 6) {
        F.play_mario_landing_sound(m, SOUND_ACTION_TERRAIN_LANDING);
    }
    return false;
}
function act_hold_butt_slide_stop(m) {
    if (m.marioObj.oInteractStatus & INT_STATUS_MARIO_DROP_OBJECT) {
        return F.drop_and_set_mario_action(m, ACT_IDLE, 0);
    }
    if (m.input & INPUT_STOMPED) {
        return F.drop_and_set_mario_action(m, ACT_SHOCKWAVE_BOUNCE, 0);
    }
    if (m.input & (INPUT_NONZERO_ANALOG | INPUT_A_PRESSED | INPUT_OFF_FLOOR | INPUT_ABOVE_SLIDE)) {
        return F.check_common_hold_action_exits(m);
    }
    if (m.input & INPUT_B_PRESSED) {
        return F.set_mario_action(m, ACT_THROWING, 0);
    }
    stopping_step(m, MARIO_ANIM_STAND_UP_FROM_SLIDING_WITH_LIGHT_OBJ, ACT_HOLD_IDLE);
    return false;
}
function act_slide_kick_slide_stop(m) {
    if (m.input & INPUT_STOMPED) {
        return F.drop_and_set_mario_action(m, ACT_SHOCKWAVE_BOUNCE, 0);
    }
    if (m.input & INPUT_OFF_FLOOR) {
        return F.drop_and_set_mario_action(m, ACT_FREEFALL, 0);
    }
    stopping_step(m, MARIO_ANIM_CROUCH_FROM_SLIDE_KICK, ACT_CROUCHING);
    return false;
}
function act_start_crouching(m) {
    if (m.input & INPUT_STOMPED) {
        return F.set_mario_action(m, ACT_SHOCKWAVE_BOUNCE, 0);
    }
    if (m.input & INPUT_OFF_FLOOR) {
        return F.set_mario_action(m, ACT_FREEFALL, 0);
    }
    if (m.input & INPUT_A_PRESSED) {
        return F.set_jumping_action(m, ACT_BACKFLIP, 0);
    }
    if (m.input & INPUT_ABOVE_SLIDE) {
        return F.set_mario_action(m, ACT_BEGIN_SLIDING, 0);
    }
    F.stationary_ground_step(m);
    F.set_mario_animation(m, MARIO_ANIM_START_CROUCHING);
    if (F.is_anim_past_end(m)) {
        F.set_mario_action(m, ACT_CROUCHING, 0);
    }
    return false;
}
function act_stop_crouching(m) {
    if (m.input & INPUT_STOMPED) {
        return F.set_mario_action(m, ACT_SHOCKWAVE_BOUNCE, 0);
    }
    if (m.input & INPUT_OFF_FLOOR) {
        return F.set_mario_action(m, ACT_FREEFALL, 0);
    }
    if (m.input & INPUT_A_PRESSED) {
        return F.set_jumping_action(m, ACT_BACKFLIP, 0);
    }
    if (m.input & INPUT_ABOVE_SLIDE) {
        return F.set_mario_action(m, ACT_BEGIN_SLIDING, 0);
    }
    F.stationary_ground_step(m);
    F.set_mario_animation(m, MARIO_ANIM_STOP_CROUCHING);
    if (F.is_anim_past_end(m)) {
        F.set_mario_action(m, ACT_IDLE, 0);
    }
    return false;
}
function act_start_crawling(m) {
    if (m.input & INPUT_FIRST_PERSON) {
        return F.set_mario_action(m, ACT_STOP_CROUCHING, 0);
    }
    if (m.input & INPUT_OFF_FLOOR) {
        return F.set_mario_action(m, ACT_FREEFALL, 0);
    }
    if (m.input & INPUT_STOMPED) {
        return F.set_mario_action(m, ACT_SHOCKWAVE_BOUNCE, 0);
    }
    if (m.input & INPUT_ABOVE_SLIDE) {
        return F.set_mario_action(m, ACT_BEGIN_SLIDING, 0);
    }
    F.stationary_ground_step(m);
    F.set_mario_animation(m, MARIO_ANIM_START_CRAWLING);
    if (F.is_anim_past_end(m)) {
        F.set_mario_action(m, ACT_CRAWLING, 0);
    }
    return false;
}
function act_stop_crawling(m) {
    if (m.input & INPUT_STOMPED) {
        return F.set_mario_action(m, ACT_SHOCKWAVE_BOUNCE, 0);
    }
    if (m.input & INPUT_OFF_FLOOR) {
        return F.set_mario_action(m, ACT_FREEFALL, 0);
    }
    if (m.input & INPUT_ABOVE_SLIDE) {
        return F.set_mario_action(m, ACT_BEGIN_SLIDING, 0);
    }
    F.stationary_ground_step(m);
    F.set_mario_animation(m, MARIO_ANIM_STOP_CRAWLING);
    if (F.is_anim_past_end(m)) {
        F.set_mario_action(m, ACT_CROUCHING, 0);
    }
    return false;
}
function act_shockwave_bounce(m) {
    let sp1E = 0;
    let sp18 = 0;
    if (m.marioObj.oInteractStatus & INT_STATUS_MARIO_SHOCKWAVE) {
        return F.hurt_and_set_mario_action(m, ACT_SHOCKED, 0, 4);
    }
    if (m.actionTimer == 0) {
        if (m.marioObj.oInteractStatus & INT_STATUS_MARIO_KNOCKBACK_DMG) {
            return F.hurt_and_set_mario_action(m, ACT_BACKWARD_GROUND_KB, 0, 0xc);
        }
    }
    if (++m.actionTimer == 48) {
        return F.set_mario_action(m, ACT_IDLE, 0);
    }
    sp1E = s16((m.actionTimer % 16) << 12);
    sp18 = (((6 - m.actionTimer / 8) * 8.0) + 4.0);
    F.mario_set_forward_vel(m, 0);
    vec3f_set(m.vel, 0.0, 0.0, 0.0);
    if (sins(sp1E) >= 0.0) {
        m.pos[1] = sins(sp1E) * sp18 + m.floorHeight;
    } else {
        m.pos[1] = m.floorHeight - sins(sp1E) * sp18;
    }
    vec3f_copy(m.marioObj.gfx.pos, m.pos);
    vec3s_set(m.marioObj.gfx.angle, 0, m.faceAngle[1], 0);
    F.set_mario_animation(m, MARIO_ANIM_A_POSE);
    return false;
}
function landing_step(m, arg1, action) {
    F.stationary_ground_step(m);
    F.set_mario_animation(m, arg1);
    if (F.is_anim_at_end(m)) {
        return F.set_mario_action(m, action, 0);
    }
    return false;
}
function check_common_landing_cancels(m, action) {
    if (m.input & INPUT_STOMPED) {
        return F.set_mario_action(m, ACT_SHOCKWAVE_BOUNCE, 0);
    }
    if (m.input & INPUT_FIRST_PERSON) {
        return F.set_mario_action(m, ACT_IDLE, 0);
    }
    if (m.input & INPUT_A_PRESSED) {
        if (!action) {
            return F.set_jump_from_landing(m);
        } else {
            return F.set_jumping_action(m, action, 0);
        }
    }
    if (m.input & (INPUT_NONZERO_ANALOG | INPUT_A_PRESSED | INPUT_OFF_FLOOR | INPUT_ABOVE_SLIDE)) {
        return F.check_common_action_exits(m);
    }
    if (m.input & INPUT_B_PRESSED) {
        return F.set_mario_action(m, ACT_PUNCHING, 0);
    }
    return false;
}
function act_jump_land_stop(m) {
    if (check_common_landing_cancels(m, 0)) {
        return true;
    }
    landing_step(m, MARIO_ANIM_LAND_FROM_SINGLE_JUMP, ACT_IDLE);
    return false;
}
function act_double_jump_land_stop(m) {
    if (check_common_landing_cancels(m, 0)) {
        return true;
    }
    landing_step(m, MARIO_ANIM_LAND_FROM_DOUBLE_JUMP, ACT_IDLE);
    return false;
}
function act_side_flip_land_stop(m) {
    if (check_common_landing_cancels(m, 0)) {
        return true;
    }
    landing_step(m, MARIO_ANIM_SLIDEFLIP_LAND, ACT_IDLE);
    m.marioObj.gfx.angle[1] = s16(m.marioObj.gfx.angle[1] + (0x8000));
    return false;
}
function act_freefall_land_stop(m) {
    if (check_common_landing_cancels(m, 0)) {
        return true;
    }
    landing_step(m, MARIO_ANIM_GENERAL_LAND, ACT_IDLE);
    return false;
}
function act_triple_jump_land_stop(m) {
    if (check_common_landing_cancels(m, ACT_JUMP)) {
        return true;
    }
    landing_step(m, MARIO_ANIM_TRIPLE_JUMP_LAND, ACT_IDLE);
    return false;
}
function act_backflip_land_stop(m) {
    if (!(m.input & INPUT_Z_DOWN) || m.marioObj.gfx.anim.frame >= 6) {
        m.input &= ~INPUT_A_PRESSED;
    }
    if (check_common_landing_cancels(m, ACT_BACKFLIP)) {
        return true;
    }
    landing_step(m, MARIO_ANIM_TRIPLE_JUMP_LAND, ACT_IDLE);
    return false;
}
function act_lava_boost_land(m) {
    m.input &= ~(INPUT_FIRST_PERSON | INPUT_B_PRESSED);
    if (check_common_landing_cancels(m, 0)) {
        return true;
    }
    landing_step(m, MARIO_ANIM_STAND_UP_FROM_LAVA_BOOST, ACT_IDLE);
    return false;
}
function act_long_jump_land_stop(m) {
    m.input &= ~INPUT_B_PRESSED;
    if (check_common_landing_cancels(m, ACT_JUMP)) {
        return true;
    }
    landing_step(m, !m.marioObj.oMarioLongJumpIsSlow ? MARIO_ANIM_CROUCH_FROM_FAST_LONGJUMP : MARIO_ANIM_CROUCH_FROM_SLOW_LONGJUMP, ACT_CROUCHING);
    return false;
}
function act_hold_jump_land_stop(m) {
    if (m.marioObj.oInteractStatus & INT_STATUS_MARIO_DROP_OBJECT) {
        return F.drop_and_set_mario_action(m, ACT_IDLE, 0);
    }
    if (m.input & INPUT_STOMPED) {
        return F.drop_and_set_mario_action(m, ACT_SHOCKWAVE_BOUNCE, 0);
    }
    if (m.input & (INPUT_NONZERO_ANALOG | INPUT_A_PRESSED | INPUT_OFF_FLOOR | INPUT_ABOVE_SLIDE)) {
        return F.check_common_hold_action_exits(m);
    }
    if (m.input & INPUT_B_PRESSED) {
        return F.set_mario_action(m, ACT_THROWING, 0);
    }
    landing_step(m, MARIO_ANIM_JUMP_LAND_WITH_LIGHT_OBJ, ACT_HOLD_IDLE);
    return false;
}
function act_hold_freefall_land_stop(m) {
    if (m.marioObj.oInteractStatus & INT_STATUS_MARIO_DROP_OBJECT) {
        return F.drop_and_set_mario_action(m, ACT_IDLE, 0);
    }
    if (m.input & INPUT_STOMPED) {
        return F.drop_and_set_mario_action(m, ACT_SHOCKWAVE_BOUNCE, 0);
    }
    if (m.input & (INPUT_NONZERO_ANALOG | INPUT_A_PRESSED | INPUT_OFF_FLOOR | INPUT_ABOVE_SLIDE)) {
        return F.check_common_hold_action_exits(m);
    }
    if (m.input & INPUT_B_PRESSED) {
        return F.set_mario_action(m, ACT_THROWING, 0);
    }
    landing_step(m, MARIO_ANIM_FALL_LAND_WITH_LIGHT_OBJ, ACT_HOLD_IDLE);
    return false;
}
function act_air_throw_land(m) {
    if (m.input & INPUT_STOMPED) {
        return F.set_mario_action(m, ACT_SHOCKWAVE_BOUNCE, 0);
    }
    if (m.input & INPUT_OFF_FLOOR) {
        return F.set_mario_action(m, ACT_FREEFALL, 0);
    }
    if (++m.actionTimer == 4) {
        F.mario_throw_held_object(m);
    }
    landing_step(m, MARIO_ANIM_THROW_LIGHT_OBJECT, ACT_IDLE);
    return false;
}
function act_twirl_land(m) {
    m.actionState = 1;
    if (m.input & INPUT_STOMPED) {
        return F.set_mario_action(m, ACT_SHOCKWAVE_BOUNCE, 0);
    }
    if (m.input & INPUT_OFF_FLOOR) {
        return F.set_mario_action(m, ACT_FREEFALL, 0);
    }
    F.stationary_ground_step(m);
    F.set_mario_animation(m, MARIO_ANIM_TWIRL_LAND);
    if (m.angleVel[1] > 0) {
        m.angleVel[1] = s16(m.angleVel[1] - (0x400));
        if (m.angleVel[1] < 0) {
            m.angleVel[1] = s16(0);
        }
        m.twirlYaw = s16(m.twirlYaw + (m.angleVel[1]));
    }
    m.marioObj.gfx.angle[1] = s16(m.marioObj.gfx.angle[1] + (m.twirlYaw));
    if (F.is_anim_at_end(m) && m.angleVel[1] == 0) {
        m.faceAngle[1] = s16(m.faceAngle[1] + (m.twirlYaw));
        F.set_mario_action(m, ACT_IDLE, 0);
    }
    return false;
}
function act_ground_pound_land(m) {
    m.actionState = 1;
    if (m.input & INPUT_STOMPED) {
        return F.drop_and_set_mario_action(m, ACT_SHOCKWAVE_BOUNCE, 0);
    }
    if (m.input & INPUT_OFF_FLOOR) {
        return F.set_mario_action(m, ACT_FREEFALL, 0);
    }
    if (m.input & INPUT_ABOVE_SLIDE) {
        return F.set_mario_action(m, ACT_BUTT_SLIDE, 0);
    }
    landing_step(m, MARIO_ANIM_GROUND_POUND_LANDING, ACT_BUTT_SLIDE_STOP);
    return false;
}
function act_first_person(m) {
    let sp1C = (m.input & (INPUT_OFF_FLOOR | INPUT_ABOVE_SLIDE | INPUT_STOMPED)) != 0;
    if (m.actionState == 0) {
        F.lower_background_noise(2);
        F.set_camera_mode(m.area.camera, CAMERA_MODE_C_UP, 0x10);
        m.actionState = 1;
    } else if (!(m.input & INPUT_FIRST_PERSON) || sp1C) {
        F.raise_background_noise(2);
        F.set_camera_mode(m.area.camera, -1, 1);
        return F.set_mario_action(m, ACT_IDLE, 0);
    }
    if (m.floor.type == SURFACE_LOOK_UP_WARP && F.save_file_get_total_star_count(W.gCurrSaveFileNum - 1, COURSE_MIN - 1, COURSE_MAX - 1) >= 10) {
        let sp1A = s16(m.statusForCamera.headRotation[0]);
        let sp18 = s16(((m.statusForCamera.headRotation[1] * 4) / 3) + m.faceAngle[1]);
        if (sp1A == -0x1800 && (sp18 < -0x6FFF || sp18 >= 0x7000)) {
            F.level_trigger_warp(m, WARP_OP_UNKNOWN_01);
        }
    }
    F.stationary_ground_step(m);
    F.set_mario_animation(m, MARIO_ANIM_FIRST_PERSON);
    return false;
}
function check_common_stationary_cancels(m) {
    if (m.pos[1] < m.waterLevel - 100) {
        if (m.action == ACT_SPAWN_SPIN_LANDING) {
            F.load_level_init_text(0);
        }
        F.update_mario_sound_and_camera(m);
        return F.set_water_plunge_action(m);
    }
    if (m.input & INPUT_SQUISHED) {
        F.update_mario_sound_and_camera(m);
        return F.drop_and_set_mario_action(m, ACT_SQUISHED, 0);
    }
    if (m.action != ACT_UNKNOWN_0002020E) {
        if (m.health < 0x100) {
            F.update_mario_sound_and_camera(m);
            return F.drop_and_set_mario_action(m, ACT_STANDING_DEATH, 0);
        }
    }
    return false;
}
function mario_execute_stationary_action(m) {
    let cancel = 0;
    if (check_common_stationary_cancels(m)) {
        return true;
    }
    if (F.mario_update_quicksand(m, 0.5)) {
        return true;
    }
    switch (m.action) {
        case ACT_IDLE:                    cancel = act_idle(m);                             break;
        case ACT_START_SLEEPING:          cancel = act_start_sleeping(m);                   break;
        case ACT_SLEEPING:                cancel = act_sleeping(m);                         break;
        case ACT_WAKING_UP:               cancel = act_waking_up(m);                        break;
        case ACT_PANTING:                 cancel = act_panting(m);                          break;
        case ACT_HOLD_PANTING_UNUSED:     cancel = act_hold_panting_unused(m);              break;
        case ACT_HOLD_IDLE:               cancel = act_hold_idle(m);                        break;
        case ACT_HOLD_HEAVY_IDLE:         cancel = act_hold_heavy_idle(m);                  break;
        case ACT_IN_QUICKSAND:            cancel = act_in_quicksand(m);                     break;
        case ACT_STANDING_AGAINST_WALL:   cancel = act_standing_against_wall(m);            break;
        case ACT_COUGHING:                cancel = act_coughing(m);                         break;
        case ACT_SHIVERING:               cancel = act_shivering(m);                        break;
        case ACT_CROUCHING:               cancel = act_crouching(m);                        break;
        case ACT_START_CROUCHING:         cancel = act_start_crouching(m);                  break;
        case ACT_STOP_CROUCHING:          cancel = act_stop_crouching(m);                   break;
        case ACT_START_CRAWLING:          cancel = act_start_crawling(m);                   break;
        case ACT_STOP_CRAWLING:           cancel = act_stop_crawling(m);                    break;
        case ACT_SLIDE_KICK_SLIDE_STOP:   cancel = act_slide_kick_slide_stop(m);            break;
        case ACT_SHOCKWAVE_BOUNCE:        cancel = act_shockwave_bounce(m);                 break;
        case ACT_FIRST_PERSON:            cancel = act_first_person(m);                     break;
        case ACT_JUMP_LAND_STOP:          cancel = act_jump_land_stop(m);                   break;
        case ACT_DOUBLE_JUMP_LAND_STOP:   cancel = act_double_jump_land_stop(m);            break;
        case ACT_FREEFALL_LAND_STOP:      cancel = act_freefall_land_stop(m);               break;
        case ACT_SIDE_FLIP_LAND_STOP:     cancel = act_side_flip_land_stop(m);              break;
        case ACT_HOLD_JUMP_LAND_STOP:     cancel = act_hold_jump_land_stop(m);              break;
        case ACT_HOLD_FREEFALL_LAND_STOP: cancel = act_hold_freefall_land_stop(m);          break;
        case ACT_AIR_THROW_LAND:          cancel = act_air_throw_land(m);                   break;
        case ACT_LAVA_BOOST_LAND:         cancel = act_lava_boost_land(m);                  break;
        case ACT_TWIRL_LAND:              cancel = act_twirl_land(m);                       break;
        case ACT_TRIPLE_JUMP_LAND_STOP:   cancel = act_triple_jump_land_stop(m);            break;
        case ACT_BACKFLIP_LAND_STOP:      cancel = act_backflip_land_stop(m);               break;
        case ACT_LONG_JUMP_LAND_STOP:     cancel = act_long_jump_land_stop(m);              break;
        case ACT_GROUND_POUND_LAND:       cancel = act_ground_pound_land(m);                break;
        case ACT_BRAKING_STOP:            cancel = act_braking_stop(m);                     break;
        case ACT_BUTT_SLIDE_STOP:         cancel = act_butt_slide_stop(m);                  break;
        case ACT_HOLD_BUTT_SLIDE_STOP:    cancel = act_hold_butt_slide_stop(m);             break;
    }
    if (!cancel && (m.input & INPUT_IN_WATER)) {
        m.particleFlags |= PARTICLE_IDLE_WATER_WAVE;
    }
    return cancel;
}

Object.assign(F, { check_common_idle_cancels, check_common_hold_idle_cancels, act_idle, play_anim_sound, act_start_sleeping, act_sleeping, act_waking_up, act_shivering, act_coughing, act_hold_idle, act_hold_heavy_idle, act_standing_against_wall, act_in_quicksand, act_crouching, act_panting, act_hold_panting_unused, stopping_step, act_braking_stop, act_butt_slide_stop, act_hold_butt_slide_stop, act_slide_kick_slide_stop, act_start_crouching, act_stop_crouching, act_start_crawling, act_stop_crawling, act_shockwave_bounce, landing_step, check_common_landing_cancels, act_jump_land_stop, act_double_jump_land_stop, act_side_flip_land_stop, act_freefall_land_stop, act_triple_jump_land_stop, act_backflip_land_stop, act_lava_boost_land, act_long_jump_land_stop, act_hold_jump_land_stop, act_hold_freefall_land_stop, act_air_throw_land, act_twirl_land, act_ground_pound_land, act_first_person, check_common_stationary_cancels, mario_execute_stationary_action });

})(window);

/* Mario moving: ported from the Super Mario 64 decompilation (github.com/n64decomp/sm64): src/game/mario_actions_moving.c */
(function (root) {
'use strict';
const SM64 = root.SM64, F = SM64.F = SM64.F || {}, W = SM64.W = SM64.W || {}, B = SM64.B = SM64.B || {};
const { s16, s8, sins, coss, atan2s, sqr, approach_f32, approach_s32, max, min, abs, REF, REFA, REFV } = SM64.m;
/*CONSTS*/
const { ACT_BACKFLIP, ACT_BACKFLIP_LAND, ACT_BACKFLIP_LAND_STOP, ACT_BACKWARD_AIR_KB, ACT_BACKWARD_GROUND_KB, 
  ACT_BACKWARD_ROLLOUT, ACT_BEGIN_SLIDING, ACT_BRAKING, ACT_BRAKING_STOP, ACT_BURNING_FALL, ACT_BURNING_GROUND, 
  ACT_BURNING_JUMP, ACT_BUTT_SLIDE, ACT_BUTT_SLIDE_AIR, ACT_BUTT_SLIDE_STOP, ACT_CRAWLING, ACT_CRAZY_BOX_BOUNCE, 
  ACT_CROUCHING, ACT_CROUCH_SLIDE, ACT_DEATH_EXIT_LAND, ACT_DEATH_ON_BACK, ACT_DEATH_ON_STOMACH, ACT_DECELERATING, 
  ACT_DIVE, ACT_DIVE_PICKING_UP, ACT_DIVE_SLIDE, ACT_DOUBLE_JUMP, ACT_DOUBLE_JUMP_LAND, ACT_DOUBLE_JUMP_LAND_STOP, 
  ACT_FINISH_TURNING_AROUND, ACT_FLAG_INVULNERABLE, ACT_FLYING_TRIPLE_JUMP, ACT_FORWARD_AIR_KB, 
  ACT_FORWARD_GROUND_KB, ACT_FORWARD_ROLLOUT, ACT_FREEFALL, ACT_FREEFALL_LAND, ACT_FREEFALL_LAND_STOP, 
  ACT_GROUND_BONK, ACT_HARD_BACKWARD_GROUND_KB, ACT_HARD_FORWARD_GROUND_KB, ACT_HEAVY_THROW, ACT_HOLD_BEGIN_SLIDING, 
  ACT_HOLD_BUTT_SLIDE, ACT_HOLD_BUTT_SLIDE_AIR, ACT_HOLD_BUTT_SLIDE_STOP, ACT_HOLD_DECELERATING, ACT_HOLD_FREEFALL, 
  ACT_HOLD_FREEFALL_LAND, ACT_HOLD_FREEFALL_LAND_STOP, ACT_HOLD_HEAVY_IDLE, ACT_HOLD_HEAVY_WALKING, ACT_HOLD_IDLE, 
  ACT_HOLD_JUMP, ACT_HOLD_JUMP_LAND, ACT_HOLD_JUMP_LAND_STOP, ACT_HOLD_QUICKSAND_JUMP_LAND, ACT_HOLD_STOMACH_SLIDE, 
  ACT_HOLD_WALKING, ACT_IDLE, ACT_JUMP, ACT_JUMP_KICK, ACT_JUMP_LAND, ACT_JUMP_LAND_STOP, ACT_LEDGE_CLIMB_DOWN, 
  ACT_LONG_JUMP, ACT_LONG_JUMP_LAND, ACT_LONG_JUMP_LAND_STOP, ACT_MOVE_PUNCHING, ACT_QUICKSAND_JUMP_LAND, 
  ACT_RIDING_SHELL_FALL, ACT_RIDING_SHELL_GROUND, ACT_RIDING_SHELL_JUMP, ACT_SHOCKWAVE_BOUNCE, ACT_SIDE_FLIP, 
  ACT_SIDE_FLIP_LAND, ACT_SIDE_FLIP_LAND_STOP, ACT_SLIDE_KICK, ACT_SLIDE_KICK_SLIDE, ACT_SLIDE_KICK_SLIDE_STOP, 
  ACT_SOFT_BACKWARD_GROUND_KB, ACT_SOFT_FORWARD_GROUND_KB, ACT_SPECIAL_DEATH_EXIT, ACT_SQUISHED, 
  ACT_STANDING_AGAINST_WALL, ACT_STANDING_DEATH, ACT_STOMACH_SLIDE, ACT_STOMACH_SLIDE_STOP, ACT_STOP_CRAWLING, 
  ACT_THROWING, ACT_TRIPLE_JUMP, ACT_TRIPLE_JUMP_LAND, ACT_TRIPLE_JUMP_LAND_STOP, ACT_TURNING_AROUND, 
  ACT_UNINITIALIZED, ACT_WALKING, GRAB_POS_LIGHT_OBJ, GROUND_STEP_HIT_WALL, GROUND_STEP_LEFT_GROUND, 
  GROUND_STEP_NONE, INPUT_ABOVE_SLIDE, INPUT_A_DOWN, INPUT_A_PRESSED, INPUT_B_PRESSED, INPUT_FIRST_PERSON, 
  INPUT_IN_WATER, INPUT_NONZERO_ANALOG, INPUT_OFF_FLOOR, INPUT_SQUISHED, INPUT_STOMPED, INPUT_UNKNOWN_5, 
  INPUT_Z_DOWN, INPUT_Z_PRESSED, INT_STATUS_MARIO_DROP_OBJECT, MARIO_ANIM_BACKWARD_KB, MARIO_ANIM_CLIMB_DOWN_LEDGE, 
  MARIO_ANIM_CRAWLING, MARIO_ANIM_CROUCH_FROM_FAST_LONGJUMP, MARIO_ANIM_CROUCH_FROM_SLOW_LONGJUMP, MARIO_ANIM_DIVE, 
  MARIO_ANIM_FALL_LAND_WITH_LIGHT_OBJ, MARIO_ANIM_FALL_OVER_BACKWARDS, MARIO_ANIM_FORWARD_KB, 
  MARIO_ANIM_GENERAL_FALL, MARIO_ANIM_GENERAL_LAND, MARIO_ANIM_GROUND_BONK, MARIO_ANIM_IDLE_HEAD_LEFT, 
  MARIO_ANIM_IDLE_WITH_LIGHT_OBJ, MARIO_ANIM_JUMP_LAND_WITH_LIGHT_OBJ, MARIO_ANIM_JUMP_WITH_LIGHT_OBJ, 
  MARIO_ANIM_LAND_FROM_DOUBLE_JUMP, MARIO_ANIM_LAND_FROM_SINGLE_JUMP, MARIO_ANIM_LAND_ON_STOMACH, 
  MARIO_ANIM_MOVE_IN_QUICKSAND, MARIO_ANIM_PUSHING, MARIO_ANIM_RIDING_SHELL, MARIO_ANIM_RUNNING, 
  MARIO_ANIM_RUN_WITH_LIGHT_OBJ, MARIO_ANIM_SIDESTEP_LEFT, MARIO_ANIM_SIDESTEP_RIGHT, MARIO_ANIM_SINGLE_JUMP, 
  MARIO_ANIM_SKID_ON_GROUND, MARIO_ANIM_SLIDE, MARIO_ANIM_SLIDEFLIP_LAND, MARIO_ANIM_SLIDE_DIVE, 
  MARIO_ANIM_SLIDE_KICK, MARIO_ANIM_SLIDING_ON_BOTTOM_WITH_LIGHT_OBJ, MARIO_ANIM_SLOW_WALK_WITH_LIGHT_OBJ, 
  MARIO_ANIM_SOFT_BACK_KB, MARIO_ANIM_SOFT_FRONT_KB, MARIO_ANIM_START_CROUCHING, MARIO_ANIM_START_RIDING_SHELL, 
  MARIO_ANIM_START_TIPTOE, MARIO_ANIM_TIPTOE, MARIO_ANIM_TRIPLE_JUMP_LAND, MARIO_ANIM_TURNING_PART1, 
  MARIO_ANIM_TURNING_PART2, MARIO_ANIM_WALKING, MARIO_ANIM_WALK_WITH_HEAVY_OBJ, MARIO_ANIM_WALK_WITH_LIGHT_OBJ, 
  MARIO_EYES_DEAD, MARIO_MARIO_SOUND_PLAYED, MARIO_METAL_CAP, MARIO_UNKNOWN_31, MARIO_WING_CAP, PARTICLE_DUST, 
  PARTICLE_FIRE, PARTICLE_VERTICAL_STAR, PARTICLE_WAVE_TRAIL, SOUND_ACTION_BONK, SOUND_ACTION_METAL_BONK, 
  SOUND_ACTION_METAL_STEP, SOUND_ACTION_METAL_STEP_TIPTOE, SOUND_ACTION_QUICKSAND_STEP, 
  SOUND_ACTION_TERRAIN_BODY_HIT_GROUND, SOUND_ACTION_TERRAIN_LANDING, SOUND_ACTION_TERRAIN_STEP, 
  SOUND_ACTION_TERRAIN_STEP_TIPTOE, SOUND_GENERAL_FLAME_OUT, SOUND_MARIO_ATTACKED, SOUND_MARIO_HAHA, 
  SOUND_MARIO_HOOHOO, SOUND_MARIO_MAMA_MIA, SOUND_MARIO_OOOF2, SOUND_MARIO_UH2_2, SOUND_MOVING_LAVA_BURN, 
  SOUND_MOVING_RIDING_SHELL_LAVA, SOUND_MOVING_TERRAIN_RIDING_SHELL, SOUND_MOVING_TERRAIN_SLIDE, SURFACE_BURNING, 
  SURFACE_CLASS_NOT_SLIPPERY, SURFACE_CLASS_SLIPPERY, SURFACE_CLASS_VERY_SLIPPERY, SURFACE_MOVING_QUICKSAND, 
  SURFACE_SHALLOW_QUICKSAND, SURFACE_SLOW, TERRAIN_MASK, TERRAIN_SLIDE } = SM64.C;
/*END CONSTS*/

let sJumpLandAction = { numFrames: 4, unk02: 5, verySteepAction: ACT_FREEFALL, endAction: ACT_JUMP_LAND_STOP, aPressedAction: ACT_DOUBLE_JUMP, offFloorAction: ACT_FREEFALL, slideAction: ACT_BEGIN_SLIDING };
let sFreefallLandAction = { numFrames: 4, unk02: 5, verySteepAction: ACT_FREEFALL, endAction: ACT_FREEFALL_LAND_STOP, aPressedAction: ACT_DOUBLE_JUMP, offFloorAction: ACT_FREEFALL, slideAction: ACT_BEGIN_SLIDING };
let sSideFlipLandAction = { numFrames: 4, unk02: 5, verySteepAction: ACT_FREEFALL, endAction: ACT_SIDE_FLIP_LAND_STOP, aPressedAction: ACT_DOUBLE_JUMP, offFloorAction: ACT_FREEFALL, slideAction: ACT_BEGIN_SLIDING };
let sHoldJumpLandAction = { numFrames: 4, unk02: 5, verySteepAction: ACT_HOLD_FREEFALL, endAction: ACT_HOLD_JUMP_LAND_STOP, aPressedAction: ACT_HOLD_JUMP, offFloorAction: ACT_HOLD_FREEFALL, slideAction: ACT_HOLD_BEGIN_SLIDING };
let sHoldFreefallLandAction = { numFrames: 4, unk02: 5, verySteepAction: ACT_HOLD_FREEFALL, endAction: ACT_HOLD_FREEFALL_LAND_STOP, aPressedAction: ACT_HOLD_JUMP, offFloorAction: ACT_HOLD_FREEFALL, slideAction: ACT_HOLD_BEGIN_SLIDING };
let sLongJumpLandAction = { numFrames: 6, unk02: 5, verySteepAction: ACT_FREEFALL, endAction: ACT_LONG_JUMP_LAND_STOP, aPressedAction: ACT_LONG_JUMP, offFloorAction: ACT_FREEFALL, slideAction: ACT_BEGIN_SLIDING };
let sDoubleJumpLandAction = { numFrames: 4, unk02: 5, verySteepAction: ACT_FREEFALL, endAction: ACT_DOUBLE_JUMP_LAND_STOP, aPressedAction: ACT_JUMP, offFloorAction: ACT_FREEFALL, slideAction: ACT_BEGIN_SLIDING };
let sTripleJumpLandAction = { numFrames: 4, unk02: 0, verySteepAction: ACT_FREEFALL, endAction: ACT_TRIPLE_JUMP_LAND_STOP, aPressedAction: ACT_UNINITIALIZED, offFloorAction: ACT_FREEFALL, slideAction: ACT_BEGIN_SLIDING };
let sBackflipLandAction = { numFrames: 4, unk02: 0, verySteepAction: ACT_FREEFALL, endAction: ACT_BACKFLIP_LAND_STOP, aPressedAction: ACT_BACKFLIP, offFloorAction: ACT_FREEFALL, slideAction: ACT_BEGIN_SLIDING };
let sFloorAlignMatrix = new Array(2).fill(0);
function tilt_body_running(m) {
    let pitch = s16(F.find_floor_slope(m, 0));
    pitch = s16(pitch * m.forwardVel / 40.0);
    return -pitch;
}
function play_step_sound(m, frame1, frame2) {
    if (F.is_anim_past_frame(m, frame1) || F.is_anim_past_frame(m, frame2)) {
        if (m.flags & MARIO_METAL_CAP) {
            if (m.marioObj.gfx.anim.id == MARIO_ANIM_TIPTOE) {
                F.play_sound_and_spawn_particles(m, SOUND_ACTION_METAL_STEP_TIPTOE, 0);
            } else {
                F.play_sound_and_spawn_particles(m, SOUND_ACTION_METAL_STEP, 0);
            }
        } else if (m.quicksandDepth > 50.0) {
            play_sound(SOUND_ACTION_QUICKSAND_STEP, m.marioObj.gfx.cameraToObject);
        } else if (m.marioObj.gfx.anim.id == MARIO_ANIM_TIPTOE) {
            F.play_sound_and_spawn_particles(m, SOUND_ACTION_TERRAIN_STEP_TIPTOE, 0);
        } else {
            F.play_sound_and_spawn_particles(m, SOUND_ACTION_TERRAIN_STEP, 0);
        }
    }
}
function align_with_floor(m) {
    m.pos[1] = m.floorHeight;
    F.mtxf_align_terrain_triangle(sFloorAlignMatrix[m.unk00], m.pos, m.faceAngle[1], 40.0);
    m.marioObj.gfx.throwMatrix = REFA(sFloorAlignMatrix, m.unk00);
}
function begin_walking_action(m, forwardVel, action, actionArg) {
    m.faceAngle[1] = s16(m.intendedYaw);
    F.mario_set_forward_vel(m, forwardVel);
    return F.set_mario_action(m, action, actionArg);
}
function check_ledge_climb_down(m) {
    let wallCols = {};
    let floor = null;
    let floorHeight = 0;
    let wall = null;
    let wallAngle = 0;
    let wallDYaw = 0;
    if (m.forwardVel < 10.0) {
        wallCols.x = m.pos[0];
        wallCols.y = m.pos[1];
        wallCols.z = m.pos[2];
        wallCols.radius = 10.0;
        wallCols.offsetY = -10.0;
        if (F.find_wall_collisions(wallCols) != 0) {
            floorHeight = F.find_floor(wallCols.x, wallCols.y, wallCols.z, $ => floor = $);
            if (floor != null && (wallCols.y - floorHeight > 160.0)) {
                wall = wallCols.walls[wallCols.numWalls - 1];
                wallAngle = s16(atan2s(wall.nz, wall.nx));
                wallDYaw = s16(wallAngle - m.faceAngle[1]);
                if (wallDYaw > -0x4000 && wallDYaw < 0x4000) {
                    m.pos[0] = wallCols.x - 20.0 * wall.nx;
                    m.pos[2] = wallCols.z - 20.0 * wall.nz;
                    m.faceAngle[0] = s16(0);
                    m.faceAngle[1] = s16(wallAngle + 0x8000);
                    F.set_mario_action(m, ACT_LEDGE_CLIMB_DOWN, 0);
                    F.set_mario_animation(m, MARIO_ANIM_CLIMB_DOWN_LEDGE);
                }
            }
        }
    }
}
function slide_bonk(m, fastAction, slowAction) {
    if (m.forwardVel > 16.0) {
        F.mario_bonk_reflection(m, true);
        F.drop_and_set_mario_action(m, fastAction, 0);
    } else {
        F.mario_set_forward_vel(m, 0.0);
        F.set_mario_action(m, slowAction, 0);
    }
}
function set_triple_jump_action(m, action, actionArg) {
    if (m.flags & MARIO_WING_CAP) {
        return F.set_mario_action(m, ACT_FLYING_TRIPLE_JUMP, 0);
    } else if (m.forwardVel > 20.0) {
        return F.set_mario_action(m, ACT_TRIPLE_JUMP, 0);
    } else {
        return F.set_mario_action(m, ACT_JUMP, 0);
    }
    return false;
}
function update_sliding_angle(m, accel, lossFactor) {
    let newFacingDYaw = 0;
    let facingDYaw = 0;
    let floor = m.floor;
    let slopeAngle = s16(atan2s(floor.nz, floor.nx));
    let steepness = Math.sqrt(floor.nx * floor.nx + floor.nz * floor.nz);
    let normalY = floor.ny;
    m.slideVelX += accel * steepness * sins(slopeAngle);
    m.slideVelZ += accel * steepness * coss(slopeAngle);
    m.slideVelX *= lossFactor;
    m.slideVelZ *= lossFactor;
    m.slideYaw = s16(atan2s(m.slideVelZ, m.slideVelX));
    facingDYaw = s16(m.faceAngle[1] - m.slideYaw);
    newFacingDYaw = facingDYaw;
    if (newFacingDYaw > 0 && newFacingDYaw <= 0x4000) {
        if ((newFacingDYaw -= 0x200) < 0) {
            newFacingDYaw = 0;
        }
    } else if (newFacingDYaw > -0x4000 && newFacingDYaw < 0) {
        if ((newFacingDYaw += 0x200) > 0) {
            newFacingDYaw = 0;
        }
    } else if (newFacingDYaw > 0x4000 && newFacingDYaw < 0x8000) {
        if ((newFacingDYaw += 0x200) > 0x8000) {
            newFacingDYaw = 0x8000;
        }
    } else if (newFacingDYaw > -0x8000 && newFacingDYaw < -0x4000) {
        if ((newFacingDYaw -= 0x200) < -0x8000) {
            newFacingDYaw = -0x8000;
        }
    }
    m.faceAngle[1] = s16(m.slideYaw + newFacingDYaw);
    m.vel[0] = m.slideVelX;
    m.vel[1] = 0.0;
    m.vel[2] = m.slideVelZ;
    F.mario_update_moving_sand(m);
    F.mario_update_windy_ground(m);
    m.forwardVel = Math.sqrt(m.slideVelX * m.slideVelX + m.slideVelZ * m.slideVelZ);
    if (m.forwardVel > 100.0) {
        m.slideVelX = m.slideVelX * 100.0 / m.forwardVel;
        m.slideVelZ = m.slideVelZ * 100.0 / m.forwardVel;
    }
    if (newFacingDYaw < -0x4000 || newFacingDYaw > 0x4000) {
        m.forwardVel *= -1.0;
    }
}
function update_sliding(m, stopSpeed) {
    let lossFactor = 0;
    let accel = 0;
    let oldSpeed = 0;
    let newSpeed = 0;
    let stopped = false;
    let intendedDYaw = s16(m.intendedYaw - m.slideYaw);
    let forward = coss(intendedDYaw);
    let sideward = sins(intendedDYaw);
    if (forward < 0.0 && m.forwardVel >= 0.0) {
        forward *= 0.5 + 0.5 * m.forwardVel / 100.0;
    }
    switch (F.mario_get_floor_class(m)) {
        case SURFACE_CLASS_VERY_SLIPPERY:
            accel = 10.0;
            lossFactor = m.intendedMag / 32.0 * forward * 0.02 + 0.98;
            break;
        case SURFACE_CLASS_SLIPPERY:
            accel = 8.0;
            lossFactor = m.intendedMag / 32.0 * forward * 0.02 + 0.96;
            break;
        default:
            accel = 7.0;
            lossFactor = m.intendedMag / 32.0 * forward * 0.02 + 0.92;
            break;
        case SURFACE_CLASS_NOT_SLIPPERY:
            accel = 5.0;
            lossFactor = m.intendedMag / 32.0 * forward * 0.02 + 0.92;
            break;
    }
    oldSpeed = Math.sqrt(m.slideVelX * m.slideVelX + m.slideVelZ * m.slideVelZ);
    m.slideVelX += m.slideVelZ * (m.intendedMag / 32.0) * sideward * 0.05;
    m.slideVelZ -= m.slideVelX * (m.intendedMag / 32.0) * sideward * 0.05;
    newSpeed = Math.sqrt(m.slideVelX * m.slideVelX + m.slideVelZ * m.slideVelZ);
    if (oldSpeed > 0.0 && newSpeed > 0.0) {
        m.slideVelX = m.slideVelX * oldSpeed / newSpeed;
        m.slideVelZ = m.slideVelZ * oldSpeed / newSpeed;
    }
    update_sliding_angle(m, accel, lossFactor);
    if (!F.mario_floor_is_slope(m) && m.forwardVel * m.forwardVel < stopSpeed * stopSpeed) {
        F.mario_set_forward_vel(m, 0.0);
        stopped = true;
    }
    return stopped;
}
function apply_slope_accel(m) {
    let slopeAccel = 0;
    let floor = m.floor;
    let steepness = Math.sqrt(floor.nx * floor.nx + floor.nz * floor.nz);
    let normalY = floor.ny;
    let floorDYaw = s16(m.floorAngle - m.faceAngle[1]);
    if (F.mario_floor_is_slope(m)) {
        let slopeClass = s16(0);
        if (m.action != ACT_SOFT_BACKWARD_GROUND_KB && m.action != ACT_SOFT_FORWARD_GROUND_KB) {
            slopeClass = s16(F.mario_get_floor_class(m));
        }
        switch (slopeClass) {
            case SURFACE_CLASS_VERY_SLIPPERY:
                slopeAccel = 5.3;
                break;
            case SURFACE_CLASS_SLIPPERY:
                slopeAccel = 2.7;
                break;
            default:
                slopeAccel = 1.7;
                break;
            case SURFACE_CLASS_NOT_SLIPPERY:
                slopeAccel = 0.0;
                break;
        }
        if (floorDYaw > -0x4000 && floorDYaw < 0x4000) {
            m.forwardVel += slopeAccel * steepness;
        } else {
            m.forwardVel -= slopeAccel * steepness;
        }
    }
    m.slideYaw = s16(m.faceAngle[1]);
    m.slideVelX = m.forwardVel * sins(m.faceAngle[1]);
    m.slideVelZ = m.forwardVel * coss(m.faceAngle[1]);
    m.vel[0] = m.slideVelX;
    m.vel[1] = 0.0;
    m.vel[2] = m.slideVelZ;
    F.mario_update_moving_sand(m);
    F.mario_update_windy_ground(m);
}
function apply_landing_accel(m, frictionFactor) {
    let stopped = false;
    apply_slope_accel(m);
    if (!F.mario_floor_is_slope(m)) {
        m.forwardVel *= frictionFactor;
        if (m.forwardVel * m.forwardVel < 1.0) {
            F.mario_set_forward_vel(m, 0.0);
            stopped = true;
        }
    }
    return stopped;
}
function update_shell_speed(m) {
    let maxTargetSpeed = 0;
    let targetSpeed = 0;
    if (m.floorHeight < m.waterLevel) {
        m.floorHeight = m.waterLevel;
        m.floor = W.gWaterSurfacePseudoFloor;
        m.floor.oo = m.waterLevel; 
    }
    if (m.floor != null && m.floor.type == SURFACE_SLOW) {
        maxTargetSpeed = 48.0;
    } else {
        maxTargetSpeed = 64.0;
    }
    targetSpeed = m.intendedMag * 2.0;
    if (targetSpeed > maxTargetSpeed) {
        targetSpeed = maxTargetSpeed;
    }
    if (targetSpeed < 24.0) {
        targetSpeed = 24.0;
    }
    if (m.forwardVel <= 0.0) {
        m.forwardVel += 1.1;
    } else if (m.forwardVel <= targetSpeed) {
        m.forwardVel += 1.1 - m.forwardVel / 58.0;
    } else if (m.floor.ny >= 0.95) {
        m.forwardVel -= 1.0;
    }
    if (m.forwardVel > 64.0) {
        m.forwardVel = 64.0;
    }
    m.faceAngle[1] =
        m.intendedYaw - approach_s32(s16((m.intendedYaw - m.faceAngle[1])), 0, 0x800, 0x800);
    apply_slope_accel(m);
}
function apply_slope_decel(m, decelCoef) {
    let decel = 0;
    let stopped = false;
    switch (F.mario_get_floor_class(m)) {
        case SURFACE_CLASS_VERY_SLIPPERY:
            decel = decelCoef * 0.2;
            break;
        case SURFACE_CLASS_SLIPPERY:
            decel = decelCoef * 0.7;
            break;
        default:
            decel = decelCoef * 2.0;
            break;
        case SURFACE_CLASS_NOT_SLIPPERY:
            decel = decelCoef * 3.0;
            break;
    }
    if ((m.forwardVel = approach_f32(m.forwardVel, 0.0, decel, decel)) == 0.0) {
        stopped = true;
    }
    apply_slope_accel(m);
    return stopped;
}
function update_decelerating_speed(m) {
    let stopped = false;
    if ((m.forwardVel = approach_f32(m.forwardVel, 0.0, 1.0, 1.0)) == 0.0) {
        stopped = true;
    }
    F.mario_set_forward_vel(m, m.forwardVel);
    F.mario_update_moving_sand(m);
    F.mario_update_windy_ground(m);
    return stopped;
}
function update_walking_speed(m) {
    let maxTargetSpeed = 0;
    let targetSpeed = 0;
    if (m.floor != null && m.floor.type == SURFACE_SLOW) {
        maxTargetSpeed = 24.0;
    } else {
        maxTargetSpeed = 32.0;
    }
    targetSpeed = m.intendedMag < maxTargetSpeed ? m.intendedMag : maxTargetSpeed;
    if (m.quicksandDepth > 10.0) {
        targetSpeed *= 6.25 / m.quicksandDepth;
    }
    if (m.forwardVel <= 0.0) {
        m.forwardVel += 1.1;
    } else if (m.forwardVel <= targetSpeed) {
        m.forwardVel += 1.1 - m.forwardVel / 43.0;
    } else if (m.floor.ny >= 0.95) {
        m.forwardVel -= 1.0;
    }
    if (m.forwardVel > 48.0) {
        m.forwardVel = 48.0;
    }
    m.faceAngle[1] =
        m.intendedYaw - approach_s32(s16((m.intendedYaw - m.faceAngle[1])), 0, 0x800, 0x800);
    apply_slope_accel(m);
}
function should_begin_sliding(m) {
    if (m.input & INPUT_ABOVE_SLIDE) {
        let slideLevel = (m.area.terrainType & TERRAIN_MASK) == TERRAIN_SLIDE;
        let movingBackward = m.forwardVel <= -1.0;
        if (slideLevel || movingBackward || F.mario_facing_downhill(m, false)) {
            return true;
        }
    }
    return false;
}
function analog_stick_held_back(m) {
    let intendedDYaw = s16(m.intendedYaw - m.faceAngle[1]);
    return intendedDYaw < -0x471C || intendedDYaw > 0x471C;
}
function check_ground_dive_or_punch(m) {
    let filler = new Array(4).fill(0);
    if (m.input & INPUT_B_PRESSED) {
        if (m.forwardVel >= 29.0 && m.controller.stickMag > 48.0) {
            m.vel[1] = 20.0;
            return F.set_mario_action(m, ACT_DIVE, 1);
        }
        return F.set_mario_action(m, ACT_MOVE_PUNCHING, 0);
    }
    return false;
}
function begin_braking_action(m) {
    F.mario_drop_held_object(m);
    if (m.actionState == 1) {
        m.faceAngle[1] = s16(m.actionArg);
        return F.set_mario_action(m, ACT_STANDING_AGAINST_WALL, 0);
    }
    if (m.forwardVel >= 16.0 && m.floor.ny >= 0.17364818) {
        return F.set_mario_action(m, ACT_BRAKING, 0);
    }
    return F.set_mario_action(m, ACT_DECELERATING, 0);
}
function anim_and_audio_for_walk(m) {
    let val14 = 0;
    let marioObj = m.marioObj;
    let val0C = true;
    let targetPitch = s16(0);
    let val04 = 0;
    val04 = m.intendedMag > m.forwardVel ? m.intendedMag : m.forwardVel;
    if (val04 < 4.0) {
        val04 = 4.0;
    }
    if (m.quicksandDepth > 50.0) {
        val14 = Math.trunc((val04 / 4.0 * 0x10000));
        F.set_mario_anim_with_accel(m, MARIO_ANIM_MOVE_IN_QUICKSAND, val14);
        play_step_sound(m, 19, 93);
        m.actionTimer = 0;
    } else {
        while (val0C) {
            switch (m.actionTimer) {
                case 0:
                    if (val04 > 8.0) {
                        m.actionTimer = 2;
                    } else {
                        if ((val14 = Math.trunc((val04 / 4.0 * 0x10000))) < 0x1000) {
                            val14 = 0x1000;
                        }
                        F.set_mario_anim_with_accel(m, MARIO_ANIM_START_TIPTOE, val14);
                        play_step_sound(m, 7, 22);
                        if (F.is_anim_past_frame(m, 23)) {
                            m.actionTimer = 2;
                        }
                        val0C = false;
                    }
                    break;
                case 1:
                    if (val04 > 8.0) {
                        m.actionTimer = 2;
                    } else {
                        if ((val14 = Math.trunc((val04 * 0x10000))) < 0x1000) {
                            val14 = 0x1000;
                        }
                        F.set_mario_anim_with_accel(m, MARIO_ANIM_TIPTOE, val14);
                        play_step_sound(m, 14, 72);
                        val0C = false;
                    }
                    break;
                case 2:
                    if (val04 < 5.0) {
                        m.actionTimer = 1;
                    } else if (val04 > 22.0) {
                        m.actionTimer = 3;
                    } else {
                        val14 = Math.trunc((val04 / 4.0 * 0x10000));
                        F.set_mario_anim_with_accel(m, MARIO_ANIM_WALKING, val14);
                        play_step_sound(m, 10, 49);
                        val0C = false;
                    }
                    break;
                case 3:
                    if (val04 < 18.0) {
                        m.actionTimer = 2;
                    } else {
                        val14 = Math.trunc((val04 / 4.0 * 0x10000));
                        F.set_mario_anim_with_accel(m, MARIO_ANIM_RUNNING, val14);
                        play_step_sound(m, 9, 45);
                        targetPitch = s16(tilt_body_running(m));
                        val0C = false;
                    }
                    break;
            }
        }
    }
    marioObj.oMarioWalkingPitch =
        s16(approach_s32(marioObj.oMarioWalkingPitch, targetPitch, 0x800, 0x800));
    marioObj.gfx.angle[0] = s16(marioObj.oMarioWalkingPitch);
}
function anim_and_audio_for_hold_walk(m) {
    let val0C = 0;
    let val08 = true;
    let val04 = 0;
    val04 = m.intendedMag > m.forwardVel ? m.intendedMag : m.forwardVel;
    if (val04 < 2.0) {
        val04 = 2.0;
    }
    while (val08) {
        switch (m.actionTimer) {
            case 0:
                if (val04 > 6.0) {
                    m.actionTimer = 1;
                } else {
                    val0C = Math.trunc((val04 * 0x10000));
                    F.set_mario_anim_with_accel(m, MARIO_ANIM_SLOW_WALK_WITH_LIGHT_OBJ, val0C);
                    play_step_sound(m, 12, 62);
                    val08 = false;
                }
                break;
            case 1:
                if (val04 < 3.0) {
                    m.actionTimer = 0;
                } else if (val04 > 11.0) {
                    m.actionTimer = 2;
                } else {
                    val0C = Math.trunc((val04 * 0x10000));
                    F.set_mario_anim_with_accel(m, MARIO_ANIM_WALK_WITH_LIGHT_OBJ, val0C);
                    play_step_sound(m, 12, 62);
                    val08 = false;
                }
                break;
            case 2:
                if (val04 < 8.0) {
                    m.actionTimer = 1;
                } else {
                    val0C = Math.trunc((val04 / 2.0 * 0x10000));
                    F.set_mario_anim_with_accel(m, MARIO_ANIM_RUN_WITH_LIGHT_OBJ, val0C);
                    play_step_sound(m, 10, 49);
                    val08 = false;
                }
                break;
        }
    }
}
function anim_and_audio_for_heavy_walk(m) {
    let val04 = Math.trunc((m.intendedMag * 0x10000));
    F.set_mario_anim_with_accel(m, MARIO_ANIM_WALK_WITH_HEAVY_OBJ, val04);
    play_step_sound(m, 26, 79);
}
function push_or_sidle_wall(m, startPos) {
    let wallAngle = 0;
    let dWallAngle = 0;
    let dx = m.pos[0] - startPos[0];
    let dz = m.pos[2] - startPos[2];
    let movedDistance = Math.sqrt(dx * dx + dz * dz);
    let val04 = Math.trunc((movedDistance * 2.0 * 0x10000));
    if (m.forwardVel > 6.0) {
        F.mario_set_forward_vel(m, 6.0);
    }
    if (m.wall != null) {
        wallAngle = s16(atan2s(m.wall.nz, m.wall.nx));
        dWallAngle = s16(wallAngle - m.faceAngle[1]);
    }
    if (m.wall == null || dWallAngle <= -0x71C8 || dWallAngle >= 0x71C8) {
        m.flags |= MARIO_UNKNOWN_31;
        F.set_mario_animation(m, MARIO_ANIM_PUSHING);
        play_step_sound(m, 6, 18);
    } else {
        if (dWallAngle < 0) {
            F.set_mario_anim_with_accel(m, MARIO_ANIM_SIDESTEP_RIGHT, val04);
        } else {
            F.set_mario_anim_with_accel(m, MARIO_ANIM_SIDESTEP_LEFT, val04);
        }
        if (m.marioObj.gfx.anim.frame < 20) {
            play_sound(SOUND_MOVING_TERRAIN_SLIDE + m.terrainSoundAddend, m.marioObj.gfx.cameraToObject);
            m.particleFlags |= PARTICLE_DUST;
        }
        m.actionState = 1;
        m.actionArg = wallAngle + 0x8000;
        m.marioObj.gfx.angle[1] = s16(wallAngle + 0x8000);
        m.marioObj.gfx.angle[2] = s16(F.find_floor_slope(m, 0x4000));
    }
}
function tilt_body_walking(m, startYaw) {
    let val0C = m.marioBodyState;
    let marioObj = m.marioObj;
    let animID = s16(m.marioObj.gfx.anim.id);
    if (animID == MARIO_ANIM_WALKING || animID == MARIO_ANIM_RUNNING) {
        let dYaw = s16(m.faceAngle[1] - startYaw);
        let val02 = s16(-s16((dYaw * m.forwardVel / 12.0)));
        let val00 = s16(s16((m.forwardVel * 170.0)));
        if (val02 > 0x1555) {
            val02 = s16(0x1555);
        }
        if (val02 < -0x1555) {
            val02 = s16(-0x1555);
        }
        if (val00 > 0x1555) {
            val00 = s16(0x1555);
        }
        if (val00 < 0) {
            val00 = s16(0);
        }
        val0C.torsoAngle[2] = s16(approach_s32(val0C.torsoAngle[2], val02, 0x400, 0x400));
        val0C.torsoAngle[0] = s16(approach_s32(val0C.torsoAngle[0], val00, 0x400, 0x400));
    } else {
        val0C.torsoAngle[2] = s16(0);
        val0C.torsoAngle[0] = s16(0);
    }
}
function tilt_body_ground_shell(m, startYaw) {
    let val0C = m.marioBodyState;
    let marioObj = m.marioObj;
    let dYaw = s16(m.faceAngle[1] - startYaw);
    let val04 = s16(-s16((dYaw * m.forwardVel / 12.0)));
    let val02 = s16(s16((m.forwardVel * 170.0)));
    if (val04 > 0x1800) {
        val04 = s16(0x1800);
    }
    if (val04 < -0x1800) {
        val04 = s16(-0x1800);
    }
    if (val02 > 0x1000) {
        val02 = s16(0x1000);
    }
    if (val02 < 0) {
        val02 = s16(0);
    }
    val0C.torsoAngle[2] = s16(approach_s32(val0C.torsoAngle[2], val04, 0x200, 0x200));
    val0C.torsoAngle[0] = s16(approach_s32(val0C.torsoAngle[0], val02, 0x200, 0x200));
    val0C.headAngle[2] = s16(-val0C.torsoAngle[2]);
    marioObj.gfx.angle[2] = s16(val0C.torsoAngle[2]);
    marioObj.gfx.pos[1] += 45.0;
}
function act_walking(m) {
    let startPos = [0, 0, 0];
    let startYaw = s16(m.faceAngle[1]);
    F.mario_drop_held_object(m);
    if (should_begin_sliding(m)) {
        return F.set_mario_action(m, ACT_BEGIN_SLIDING, 0);
    }
    if (m.input & INPUT_FIRST_PERSON) {
        return begin_braking_action(m);
    }
    if (m.input & INPUT_A_PRESSED) {
        return F.set_jump_from_landing(m);
    }
    if (check_ground_dive_or_punch(m)) {
        return true;
    }
    if (m.input & INPUT_UNKNOWN_5) {
        return begin_braking_action(m);
    }
    if (analog_stick_held_back(m) && m.forwardVel >= 16.0) {
        return F.set_mario_action(m, ACT_TURNING_AROUND, 0);
    }
    if (m.input & INPUT_Z_PRESSED) {
        return F.set_mario_action(m, ACT_CROUCH_SLIDE, 0);
    }
    m.actionState = 0;
    vec3f_copy(startPos, m.pos);
    update_walking_speed(m);
    switch (F.perform_ground_step(m)) {
        case GROUND_STEP_LEFT_GROUND:
            F.set_mario_action(m, ACT_FREEFALL, 0);
            F.set_mario_animation(m, MARIO_ANIM_GENERAL_FALL);
            break;
        case GROUND_STEP_NONE:
            anim_and_audio_for_walk(m);
            if (m.intendedMag - m.forwardVel > 16.0) {
                m.particleFlags |= PARTICLE_DUST;
            }
            break;
        case GROUND_STEP_HIT_WALL:
            push_or_sidle_wall(m, startPos);
            m.actionTimer = 0;
            break;
    }
    check_ledge_climb_down(m);
    tilt_body_walking(m, startYaw);
    return false;
}
function act_move_punching(m) {
    if (should_begin_sliding(m)) {
        return F.set_mario_action(m, ACT_BEGIN_SLIDING, 0);
    }
    if (m.actionState == 0 && (m.input & INPUT_A_DOWN)) {
        return F.set_mario_action(m, ACT_JUMP_KICK, 0);
    }
    m.actionState = 1;
    F.mario_update_punch_sequence(m);
    if (m.forwardVel >= 0.0) {
        apply_slope_decel(m, 0.5);
    } else {
        if ((m.forwardVel += 8.0) >= 0.0) {
            m.forwardVel = 0.0;
        }
        apply_slope_accel(m);
    }
    switch (F.perform_ground_step(m)) {
        case GROUND_STEP_LEFT_GROUND:
            F.set_mario_action(m, ACT_FREEFALL, 0);
            break;
        case GROUND_STEP_NONE:
            m.particleFlags |= PARTICLE_DUST;
            break;
    }
    return false;
}
function act_hold_walking(m) {
    if (m.heldObj.behavior ==B.bhvJumpingBox) {
        return F.set_mario_action(m, ACT_CRAZY_BOX_BOUNCE, 0);
    }
    if (m.marioObj.oInteractStatus & INT_STATUS_MARIO_DROP_OBJECT) {
        return F.drop_and_set_mario_action(m, ACT_WALKING, 0);
    }
    if (should_begin_sliding(m)) {
        return F.set_mario_action(m, ACT_HOLD_BEGIN_SLIDING, 0);
    }
    if (m.input & INPUT_B_PRESSED) {
        return F.set_mario_action(m, ACT_THROWING, 0);
    }
    if (m.input & INPUT_A_PRESSED) {
        return F.set_jumping_action(m, ACT_HOLD_JUMP, 0);
    }
    if (m.input & INPUT_UNKNOWN_5) {
        return F.set_mario_action(m, ACT_HOLD_DECELERATING, 0);
    }
    if (m.input & INPUT_Z_PRESSED) {
        return F.drop_and_set_mario_action(m, ACT_CROUCH_SLIDE, 0);
    }
    m.intendedMag *= 0.4;
    update_walking_speed(m);
    switch (F.perform_ground_step(m)) {
        case GROUND_STEP_LEFT_GROUND:
            F.set_mario_action(m, ACT_HOLD_FREEFALL, 0);
            break;
        case GROUND_STEP_HIT_WALL:
            if (m.forwardVel > 16.0) {
                F.mario_set_forward_vel(m, 16.0);
            }
            break;
    }
    anim_and_audio_for_hold_walk(m);
    if (0.4 * m.intendedMag - m.forwardVel > 10.0) {
        m.particleFlags |= PARTICLE_DUST;
    }
    return false;
}
function act_hold_heavy_walking(m) {
    if (m.input & INPUT_B_PRESSED) {
        return F.set_mario_action(m, ACT_HEAVY_THROW, 0);
    }
    if (should_begin_sliding(m)) {
        return F.drop_and_set_mario_action(m, ACT_BEGIN_SLIDING, 0);
    }
    if (m.input & INPUT_UNKNOWN_5) {
        return F.set_mario_action(m, ACT_HOLD_HEAVY_IDLE, 0);
    }
    m.intendedMag *= 0.1;
    update_walking_speed(m);
    switch (F.perform_ground_step(m)) {
        case GROUND_STEP_LEFT_GROUND:
            F.drop_and_set_mario_action(m, ACT_FREEFALL, 0);
            break;
        case GROUND_STEP_HIT_WALL:
            if (m.forwardVel > 10.0) {
                F.mario_set_forward_vel(m, 10.0);
            }
            break;
    }
    anim_and_audio_for_heavy_walk(m);
    return false;
}
function act_turning_around(m) {
    if (m.input & INPUT_ABOVE_SLIDE) {
        return F.set_mario_action(m, ACT_BEGIN_SLIDING, 0);
    }
    if (m.input & INPUT_A_PRESSED) {
        return F.set_jumping_action(m, ACT_SIDE_FLIP, 0);
    }
    if (m.input & INPUT_UNKNOWN_5) {
        return F.set_mario_action(m, ACT_BRAKING, 0);
    }
    if (!analog_stick_held_back(m)) {
        return F.set_mario_action(m, ACT_WALKING, 0);
    }
    if (apply_slope_decel(m, 2.0)) {
        return begin_walking_action(m, 8.0, ACT_FINISH_TURNING_AROUND, 0);
    }
    play_sound(SOUND_MOVING_TERRAIN_SLIDE + m.terrainSoundAddend, m.marioObj.gfx.cameraToObject);
    F.adjust_sound_for_speed(m);
    switch (F.perform_ground_step(m)) {
        case GROUND_STEP_LEFT_GROUND:
            F.set_mario_action(m, ACT_FREEFALL, 0);
            break;
        case GROUND_STEP_NONE:
            m.particleFlags |= PARTICLE_DUST;
            break;
    }
    if (m.forwardVel >= 18.0) {
        F.set_mario_animation(m, MARIO_ANIM_TURNING_PART1);
    } else {
        F.set_mario_animation(m, MARIO_ANIM_TURNING_PART2);
        if (F.is_anim_at_end(m)) {
            if (m.forwardVel > 0.0) {
                begin_walking_action(m, -m.forwardVel, ACT_WALKING, 0);
            } else {
                begin_walking_action(m, 8.0, ACT_WALKING, 0);
            }
        }
    }
    return false;
}
function act_finish_turning_around(m) {
    if (m.input & INPUT_ABOVE_SLIDE) {
        return F.set_mario_action(m, ACT_BEGIN_SLIDING, 0);
    }
    if (m.input & INPUT_A_PRESSED) {
        return F.set_jumping_action(m, ACT_SIDE_FLIP, 0);
    }
    update_walking_speed(m);
    F.set_mario_animation(m, MARIO_ANIM_TURNING_PART2);
    if (F.perform_ground_step(m) == GROUND_STEP_LEFT_GROUND) {
        F.set_mario_action(m, ACT_FREEFALL, 0);
    }
    if (F.is_anim_at_end(m)) {
        F.set_mario_action(m, ACT_WALKING, 0);
    }
    m.marioObj.gfx.angle[1] = s16(m.marioObj.gfx.angle[1] + (0x8000));
    return false;
}
function act_braking(m) {
    if (!(m.input & INPUT_FIRST_PERSON) && (m.input & (INPUT_NONZERO_ANALOG | INPUT_A_PRESSED | INPUT_OFF_FLOOR | INPUT_ABOVE_SLIDE))) {
        return F.check_common_action_exits(m);
    }
    if (apply_slope_decel(m, 2.0)) {
        return F.set_mario_action(m, ACT_BRAKING_STOP, 0);
    }
    if (m.input & INPUT_B_PRESSED) {
        return F.set_mario_action(m, ACT_MOVE_PUNCHING, 0);
    }
    switch (F.perform_ground_step(m)) {
        case GROUND_STEP_LEFT_GROUND:
            F.set_mario_action(m, ACT_FREEFALL, 0);
            break;
        case GROUND_STEP_NONE:
            m.particleFlags |= PARTICLE_DUST;
            break;
        case GROUND_STEP_HIT_WALL:
            slide_bonk(m, ACT_BACKWARD_GROUND_KB, ACT_BRAKING_STOP);
            break;
    }
    play_sound(SOUND_MOVING_TERRAIN_SLIDE + m.terrainSoundAddend, m.marioObj.gfx.cameraToObject);
    F.adjust_sound_for_speed(m);
    F.set_mario_animation(m, MARIO_ANIM_SKID_ON_GROUND);
    return false;
}
function act_decelerating(m) {
    let val0C = 0;
    let slopeClass = s16(F.mario_get_floor_class(m));
    if (!(m.input & INPUT_FIRST_PERSON)) {
        if (should_begin_sliding(m)) {
            return F.set_mario_action(m, ACT_BEGIN_SLIDING, 0);
        }
        if (m.input & INPUT_A_PRESSED) {
            return F.set_jump_from_landing(m);
        }
        if (check_ground_dive_or_punch(m)) {
            return true;
        }
        if (m.input & INPUT_NONZERO_ANALOG) {
            return F.set_mario_action(m, ACT_WALKING, 0);
        }
        if (m.input & INPUT_Z_PRESSED) {
            return F.set_mario_action(m, ACT_CROUCH_SLIDE, 0);
        }
    }
    if (update_decelerating_speed(m)) {
        return F.set_mario_action(m, ACT_IDLE, 0);
    }
    switch (F.perform_ground_step(m)) {
        case GROUND_STEP_LEFT_GROUND:
            F.set_mario_action(m, ACT_FREEFALL, 0);
            break;
        case GROUND_STEP_HIT_WALL:
            if (slopeClass == SURFACE_CLASS_VERY_SLIPPERY) {
                F.mario_bonk_reflection(m, true);
            } else {
                F.mario_set_forward_vel(m, 0.0);
            }
            break;
    }
    if (slopeClass == SURFACE_CLASS_VERY_SLIPPERY) {
        F.set_mario_animation(m, MARIO_ANIM_IDLE_HEAD_LEFT);
        play_sound(SOUND_MOVING_TERRAIN_SLIDE + m.terrainSoundAddend, m.marioObj.gfx.cameraToObject);
        F.adjust_sound_for_speed(m);
        m.particleFlags |= PARTICLE_DUST;
    } else {
        if ((val0C = Math.trunc((m.forwardVel / 4.0 * 0x10000))) < 0x1000) {
            val0C = 0x1000;
        }
        F.set_mario_anim_with_accel(m, MARIO_ANIM_WALKING, val0C);
        play_step_sound(m, 10, 49);
    }
    return false;
}
function act_hold_decelerating(m) {
    let val0C = 0;
    let slopeClass = s16(F.mario_get_floor_class(m));
    if (m.marioObj.oInteractStatus & INT_STATUS_MARIO_DROP_OBJECT) {
        return F.drop_and_set_mario_action(m, ACT_WALKING, 0);
    }
    if (should_begin_sliding(m)) {
        return F.set_mario_action(m, ACT_HOLD_BEGIN_SLIDING, 0);
    }
    if (m.input & INPUT_B_PRESSED) {
        return F.set_mario_action(m, ACT_THROWING, 0);
    }
    if (m.input & INPUT_A_PRESSED) {
        return F.set_jumping_action(m, ACT_HOLD_JUMP, 0);
    }
    if (m.input & INPUT_Z_PRESSED) {
        return F.drop_and_set_mario_action(m, ACT_CROUCH_SLIDE, 0);
    }
    if (m.input & INPUT_NONZERO_ANALOG) {
        return F.set_mario_action(m, ACT_HOLD_WALKING, 0);
    }
    if (update_decelerating_speed(m)) {
        return F.set_mario_action(m, ACT_HOLD_IDLE, 0);
    }
    m.intendedMag *= 0.4;
    switch (F.perform_ground_step(m)) {
        case GROUND_STEP_LEFT_GROUND:
            F.set_mario_action(m, ACT_HOLD_FREEFALL, 0);
            break;
        case GROUND_STEP_HIT_WALL:
            if (slopeClass == SURFACE_CLASS_VERY_SLIPPERY) {
                F.mario_bonk_reflection(m, true);
            } else {
                F.mario_set_forward_vel(m, 0.0);
            }
            break;
    }
    if (slopeClass == SURFACE_CLASS_VERY_SLIPPERY) {
        F.set_mario_animation(m, MARIO_ANIM_IDLE_WITH_LIGHT_OBJ);
        play_sound(SOUND_MOVING_TERRAIN_SLIDE + m.terrainSoundAddend, m.marioObj.gfx.cameraToObject);
        F.adjust_sound_for_speed(m);
        m.particleFlags |= PARTICLE_DUST;
    } else {
        if ((val0C = Math.trunc((m.forwardVel * 0x10000))) < 0x1000) {
            val0C = 0x1000;
        }
        F.set_mario_anim_with_accel(m, MARIO_ANIM_WALK_WITH_LIGHT_OBJ, val0C);
        play_step_sound(m, 12, 62);
    }
    return false;
}
function act_riding_shell_ground(m) {
    let startYaw = s16(m.faceAngle[1]);
    if (m.input & INPUT_A_PRESSED) {
        return F.set_mario_action(m, ACT_RIDING_SHELL_JUMP, 0);
    }
    if (m.input & INPUT_Z_PRESSED) {
        F.mario_stop_riding_object(m);
        if (m.forwardVel < 24.0) {
            F.mario_set_forward_vel(m, 24.0);
        }
        return F.set_mario_action(m, ACT_CROUCH_SLIDE, 0);
    }
    update_shell_speed(m);
    F.set_mario_animation(m, m.actionArg == 0 ? MARIO_ANIM_START_RIDING_SHELL : MARIO_ANIM_RIDING_SHELL);
    switch (F.perform_ground_step(m)) {
        case GROUND_STEP_LEFT_GROUND:
            F.set_mario_action(m, ACT_RIDING_SHELL_FALL, 0);
            break;
        case GROUND_STEP_HIT_WALL:
            F.mario_stop_riding_object(m);
            play_sound(m.flags & MARIO_METAL_CAP ? SOUND_ACTION_METAL_BONK : SOUND_ACTION_BONK, m.marioObj.gfx.cameraToObject);
            m.particleFlags |= PARTICLE_VERTICAL_STAR;
            F.set_mario_action(m, ACT_BACKWARD_GROUND_KB, 0);
            break;
    }
    tilt_body_ground_shell(m, startYaw);
    if (m.floor.type == SURFACE_BURNING) {
        play_sound(SOUND_MOVING_RIDING_SHELL_LAVA, m.marioObj.gfx.cameraToObject);
    } else {
        play_sound(SOUND_MOVING_TERRAIN_RIDING_SHELL + m.terrainSoundAddend, m.marioObj.gfx.cameraToObject);
    }
    F.adjust_sound_for_speed(m);
    return false;
}
function act_crawling(m) {
    let val04 = 0;
    if (should_begin_sliding(m)) {
        return F.set_mario_action(m, ACT_BEGIN_SLIDING, 0);
    }
    if (m.input & INPUT_FIRST_PERSON) {
        return F.set_mario_action(m, ACT_STOP_CRAWLING, 0);
    }
    if (m.input & INPUT_A_PRESSED) {
        return F.set_jumping_action(m, ACT_JUMP, 0);
    }
    if (check_ground_dive_or_punch(m)) {
        return true;
    }
    if (m.input & INPUT_UNKNOWN_5) {
        return F.set_mario_action(m, ACT_STOP_CRAWLING, 0);
    }
    if (!(m.input & INPUT_Z_DOWN)) {
        return F.set_mario_action(m, ACT_STOP_CRAWLING, 0);
    }
    m.intendedMag *= 0.1;
    update_walking_speed(m);
    switch (F.perform_ground_step(m)) {
        case GROUND_STEP_LEFT_GROUND:
            F.set_mario_action(m, ACT_FREEFALL, 0);
            break;
        case GROUND_STEP_HIT_WALL:
            if (m.forwardVel > 10.0) {
                F.mario_set_forward_vel(m, 10.0);
            }
        case GROUND_STEP_NONE:
            align_with_floor(m);
            break;
    }
    val04 = Math.trunc((m.intendedMag * 2.0 * 0x10000));
    F.set_mario_anim_with_accel(m, MARIO_ANIM_CRAWLING, val04);
    play_step_sound(m, 26, 79);
    return false;
}
function act_burning_ground(m) {
    if (m.input & INPUT_A_PRESSED) {
        return F.set_mario_action(m, ACT_BURNING_JUMP, 0);
    }
    m.marioObj.oMarioBurnTimer += 2;
    if (m.marioObj.oMarioBurnTimer > 160) {
        return F.set_mario_action(m, ACT_WALKING, 0);
    }
    if (m.waterLevel - m.floorHeight > 50.0) {
        play_sound(SOUND_GENERAL_FLAME_OUT, m.marioObj.gfx.cameraToObject);
        return F.set_mario_action(m, ACT_WALKING, 0);
    }
    if (m.forwardVel < 8.0) {
        m.forwardVel = 8.0;
    }
    if (m.forwardVel > 48.0) {
        m.forwardVel = 48.0;
    }
    m.forwardVel = approach_f32(m.forwardVel, 32.0, 4.0, 1.0);
    if (m.input & INPUT_NONZERO_ANALOG) {
        m.faceAngle[1] =
            m.intendedYaw - approach_s32(s16((m.intendedYaw - m.faceAngle[1])), 0, 0x600, 0x600);
    }
    apply_slope_accel(m);
    if (F.perform_ground_step(m) == GROUND_STEP_LEFT_GROUND) {
        F.set_mario_action(m, ACT_BURNING_FALL, 0);
    }
    F.set_mario_anim_with_accel(m, MARIO_ANIM_RUNNING, Math.trunc((m.forwardVel / 2.0 * 0x10000)));
    play_step_sound(m, 9, 45);
    m.particleFlags |= PARTICLE_FIRE;
    play_sound(SOUND_MOVING_LAVA_BURN, m.marioObj.gfx.cameraToObject);
    m.health -= 10;
    if (m.health < 0x100) {
        F.set_mario_action(m, ACT_STANDING_DEATH, 0);
    }
    m.marioBodyState.eyeState = MARIO_EYES_DEAD;
    return false;
}
function tilt_body_butt_slide(m) {
    let intendedDYaw = s16(m.intendedYaw - m.faceAngle[1]);
    m.marioBodyState.torsoAngle[0] = s16(Math.trunc((5461.3335 * m.intendedMag / 32.0 * coss(intendedDYaw))));
    m.marioBodyState.torsoAngle[2] = s16(Math.trunc((-(5461.3335 * m.intendedMag / 32.0 * sins(intendedDYaw)))));
}
function common_slide_action(m, endAction, airAction, animation) {
    let pos = [0, 0, 0];
    vec3f_copy(pos, m.pos);
    play_sound(SOUND_MOVING_TERRAIN_SLIDE + m.terrainSoundAddend, m.marioObj.gfx.cameraToObject);
    F.adjust_sound_for_speed(m);
    switch (F.perform_ground_step(m)) {
        case GROUND_STEP_LEFT_GROUND:
            F.set_mario_action(m, airAction, 0);
            if (m.forwardVel < -50.0 || 50.0 < m.forwardVel) {
                play_sound(SOUND_MARIO_HOOHOO, m.marioObj.gfx.cameraToObject);
            }
            break;
        case GROUND_STEP_NONE:
            F.set_mario_animation(m, animation);
            align_with_floor(m);
            m.particleFlags |= PARTICLE_DUST;
            break;
        case GROUND_STEP_HIT_WALL:
            if (!F.mario_floor_is_slippery(m)) {
                if (m.forwardVel > 16.0) {
                    m.particleFlags |= PARTICLE_VERTICAL_STAR;
                }
                slide_bonk(m, ACT_GROUND_BONK, endAction);
            } else if (m.wall != null) {
                let wallAngle = s16(atan2s(m.wall.nz, m.wall.nx));
                let slideSpeed = Math.sqrt(m.slideVelX * m.slideVelX + m.slideVelZ * m.slideVelZ);
                if ((slideSpeed *= 0.9) < 4.0) {
                    slideSpeed = 4.0;
                }
                m.slideYaw = s16(wallAngle - s16((m.slideYaw - wallAngle)) + 0x8000);
                m.vel[0] = m.slideVelX = slideSpeed * sins(m.slideYaw);
                m.vel[2] = m.slideVelZ = slideSpeed * coss(m.slideYaw);
            }
            align_with_floor(m);
            break;
    }
}
function common_slide_action_with_jump(m, stopAction, jumpAction, airAction, animation) {
    if (m.actionTimer == 5) {
        if (m.input & INPUT_A_PRESSED) {
            return F.set_jumping_action(m, jumpAction, 0);
        }
    } else {
        m.actionTimer++;
    }
    if (update_sliding(m, 4.0)) {
        return F.set_mario_action(m, stopAction, 0);
    }
    common_slide_action(m, stopAction, airAction, animation);
    return false;
}
function act_butt_slide(m) {
    let cancel = common_slide_action_with_jump(m, ACT_BUTT_SLIDE_STOP, ACT_JUMP, ACT_BUTT_SLIDE_AIR, MARIO_ANIM_SLIDE);
    tilt_body_butt_slide(m);
    return cancel;
}
function act_hold_butt_slide(m) {
    let cancel = 0;
    if (m.marioObj.oInteractStatus & INT_STATUS_MARIO_DROP_OBJECT) {
        return F.drop_and_set_mario_action(m, ACT_BUTT_SLIDE, 0);
    }
    cancel = common_slide_action_with_jump(m, ACT_HOLD_BUTT_SLIDE_STOP, ACT_HOLD_JUMP, ACT_HOLD_BUTT_SLIDE_AIR, MARIO_ANIM_SLIDING_ON_BOTTOM_WITH_LIGHT_OBJ);
    tilt_body_butt_slide(m);
    return cancel;
}
function act_crouch_slide(m) {
    let cancel = 0;
    if (m.input & INPUT_ABOVE_SLIDE) {
        return F.set_mario_action(m, ACT_BUTT_SLIDE, 0);
    }
    if (m.actionTimer < 30) {
        m.actionTimer++;
        if (m.input & INPUT_A_PRESSED) {
            if (m.forwardVel > 10.0) {
                return F.set_jumping_action(m, ACT_LONG_JUMP, 0);
            }
        }
    }
    if (m.input & INPUT_B_PRESSED) {
        if (m.forwardVel >= 10.0) {
            return F.set_mario_action(m, ACT_SLIDE_KICK, 0);
        } else {
            return F.set_mario_action(m, ACT_MOVE_PUNCHING, 0x0009);
        }
    }
    if (m.input & INPUT_A_PRESSED) {
        return F.set_jumping_action(m, ACT_JUMP, 0);
    }
    if (m.input & INPUT_FIRST_PERSON) {
        return F.set_mario_action(m, ACT_BRAKING, 0);
    }
    cancel = common_slide_action_with_jump(m, ACT_CROUCHING, ACT_JUMP, ACT_FREEFALL, MARIO_ANIM_START_CROUCHING);
    return cancel;
}
function act_slide_kick_slide(m) {
    if (m.input & INPUT_A_PRESSED) {
        return F.set_jumping_action(m, ACT_FORWARD_ROLLOUT, 0);
    }
    F.set_mario_animation(m, MARIO_ANIM_SLIDE_KICK);
    if (F.is_anim_at_end(m) && m.forwardVel < 1.0) {
        return F.set_mario_action(m, ACT_SLIDE_KICK_SLIDE_STOP, 0);
    }
    update_sliding(m, 1.0);
    switch (F.perform_ground_step(m)) {
        case GROUND_STEP_LEFT_GROUND:
            F.set_mario_action(m, ACT_FREEFALL, 2);
            break;
        case GROUND_STEP_HIT_WALL:
            F.mario_bonk_reflection(m, true);
            m.particleFlags |= PARTICLE_VERTICAL_STAR;
            F.set_mario_action(m, ACT_BACKWARD_GROUND_KB, 0);
            break;
    }
    play_sound(SOUND_MOVING_TERRAIN_SLIDE + m.terrainSoundAddend, m.marioObj.gfx.cameraToObject);
    m.particleFlags |= PARTICLE_DUST;
    return false;
}
function stomach_slide_action(m, stopAction, airAction, animation) {
    if (m.actionTimer == 5) {
        if (!(m.input & INPUT_ABOVE_SLIDE) && (m.input & (INPUT_A_PRESSED | INPUT_B_PRESSED))) {
            return F.drop_and_set_mario_action( m, m.forwardVel >= 0.0 ? ACT_FORWARD_ROLLOUT : ACT_BACKWARD_ROLLOUT, 0);
        }
    } else {
        m.actionTimer++;
    }
    if (update_sliding(m, 4.0)) {
        return F.set_mario_action(m, stopAction, 0);
    }
    common_slide_action(m, stopAction, airAction, animation);
    return false;
}
function act_stomach_slide(m) {
    let cancel = stomach_slide_action(m, ACT_STOMACH_SLIDE_STOP, ACT_FREEFALL, MARIO_ANIM_SLIDE_DIVE);
    return cancel;
}
function act_hold_stomach_slide(m) {
    let cancel = 0;
    if (m.marioObj.oInteractStatus & INT_STATUS_MARIO_DROP_OBJECT) {
        return F.drop_and_set_mario_action(m, ACT_STOMACH_SLIDE, 0);
    }
    cancel = stomach_slide_action(m, ACT_DIVE_PICKING_UP, ACT_HOLD_FREEFALL, MARIO_ANIM_SLIDE_DIVE);
    return cancel;
}
function act_dive_slide(m) {
    if (!(m.input & INPUT_ABOVE_SLIDE) && (m.input & (INPUT_A_PRESSED | INPUT_B_PRESSED))) {
        return F.set_mario_action(m, m.forwardVel > 0.0 ? ACT_FORWARD_ROLLOUT : ACT_BACKWARD_ROLLOUT, 0);
    }
    F.play_mario_landing_sound_once(m, SOUND_ACTION_TERRAIN_BODY_HIT_GROUND);
    if (update_sliding(m, 8.0) && F.is_anim_at_end(m)) {
        F.mario_set_forward_vel(m, 0.0);
        F.set_mario_action(m, ACT_STOMACH_SLIDE_STOP, 0);
    }
    if (F.mario_check_object_grab(m)) {
        F.mario_grab_used_object(m);
        m.marioBodyState.grabPos = GRAB_POS_LIGHT_OBJ;
        return true;
    }
    common_slide_action(m, ACT_STOMACH_SLIDE_STOP, ACT_FREEFALL, MARIO_ANIM_DIVE);
    return false;
}
function common_ground_knockback_action(m, animation, arg2, arg3, arg4) {
    let animFrame = 0;
    if (arg3) {
        F.play_mario_heavy_landing_sound_once(m, SOUND_ACTION_TERRAIN_BODY_HIT_GROUND);
    }
    if (arg4 > 0) {
        F.play_sound_if_no_flag(m, SOUND_MARIO_ATTACKED, MARIO_MARIO_SOUND_PLAYED);
    } else {
        F.play_sound_if_no_flag(m, SOUND_MARIO_OOOF2, MARIO_MARIO_SOUND_PLAYED);
    }
    if (m.forwardVel > 32.0) {
        m.forwardVel = 32.0;
    }
    if (m.forwardVel < -32.0) {
        m.forwardVel = -32.0;
    }
    animFrame = F.set_mario_animation(m, animation);
    if (animFrame < arg2) {
        apply_landing_accel(m, 0.9);
    } else if (m.forwardVel >= 0.0) {
        F.mario_set_forward_vel(m, 0.1);
    } else {
        F.mario_set_forward_vel(m, -0.1);
    }
    if (F.perform_ground_step(m) == GROUND_STEP_LEFT_GROUND) {
        if (m.forwardVel >= 0.0) {
            F.set_mario_action(m, ACT_FORWARD_AIR_KB, arg4);
        } else {
            F.set_mario_action(m, ACT_BACKWARD_AIR_KB, arg4);
        }
    } else if (F.is_anim_at_end(m)) {
        if (m.health < 0x100) {
            F.set_mario_action(m, ACT_STANDING_DEATH, 0);
        } else {
            if (arg4 > 0) {
                m.invincTimer = 30;
            }
            F.set_mario_action(m, ACT_IDLE, 0);
        }
    }
    return animFrame;
}
function act_hard_backward_ground_kb(m) {
    let animFrame = common_ground_knockback_action(m, MARIO_ANIM_FALL_OVER_BACKWARDS, 43, true, m.actionArg);
    if (animFrame == 43 && m.health < 0x100) {
        F.set_mario_action(m, ACT_DEATH_ON_BACK, 0);
    }
    if (animFrame == 54 && m.prevAction == ACT_SPECIAL_DEATH_EXIT) {
        play_sound(SOUND_MARIO_MAMA_MIA, m.marioObj.gfx.cameraToObject);
    }
    if (animFrame == 69) {
        F.play_mario_landing_sound_once(m, SOUND_ACTION_TERRAIN_LANDING);
    }
    return false;
}
function act_hard_forward_ground_kb(m) {
    let animFrame = common_ground_knockback_action(m, MARIO_ANIM_LAND_ON_STOMACH, 21, true, m.actionArg);
    if (animFrame == 23 && m.health < 0x100) {
        F.set_mario_action(m, ACT_DEATH_ON_STOMACH, 0);
    }
    return false;
}
function act_backward_ground_kb(m) {
    common_ground_knockback_action(m, MARIO_ANIM_BACKWARD_KB, 22, true, m.actionArg);
    return false;
}
function act_forward_ground_kb(m) {
    common_ground_knockback_action(m, MARIO_ANIM_FORWARD_KB, 20, true, m.actionArg);
    return false;
}
function act_soft_backward_ground_kb(m) {
    common_ground_knockback_action(m, MARIO_ANIM_SOFT_BACK_KB, 100, false, m.actionArg);
    return false;
}
function act_soft_forward_ground_kb(m) {
    common_ground_knockback_action(m, MARIO_ANIM_SOFT_FRONT_KB, 100, false, m.actionArg);
    return false;
}
function act_ground_bonk(m) {
    let animFrame = common_ground_knockback_action(m, MARIO_ANIM_GROUND_BONK, 32, true, m.actionArg);
    if (animFrame == 32) {
        F.play_mario_landing_sound(m, SOUND_ACTION_TERRAIN_LANDING);
    }
    return false;
}
function act_death_exit_land(m) {
    let animFrame = 0;
    apply_landing_accel(m, 0.9);
    F.play_mario_heavy_landing_sound_once(m, SOUND_ACTION_TERRAIN_BODY_HIT_GROUND);
    animFrame = F.set_mario_animation(m, MARIO_ANIM_FALL_OVER_BACKWARDS);
    if (animFrame == 54) {
        play_sound(SOUND_MARIO_MAMA_MIA, m.marioObj.gfx.cameraToObject);
    }
    if (animFrame == 68) {
        F.play_mario_landing_sound(m, SOUND_ACTION_TERRAIN_LANDING);
    }
    if (F.is_anim_at_end(m)) {
        F.set_mario_action(m, ACT_IDLE, 0);
    }
    return false;
}
function common_landing_action(m, animation, airAction) {
    let stepResult = 0;
    if (m.input & INPUT_NONZERO_ANALOG) {
        apply_landing_accel(m, 0.98);
    } else if (m.forwardVel >= 16.0) {
        apply_slope_decel(m, 2.0);
    } else {
        m.vel[1] = 0.0;
    }
    stepResult = F.perform_ground_step(m);
    switch (stepResult) {
        case GROUND_STEP_LEFT_GROUND:
            F.set_mario_action(m, airAction, 0);
            break;
        case GROUND_STEP_HIT_WALL:
            F.set_mario_animation(m, MARIO_ANIM_PUSHING);
            break;
    }
    if (m.forwardVel > 16.0) {
        m.particleFlags |= PARTICLE_DUST;
    }
    F.set_mario_animation(m, animation);
    F.play_mario_landing_sound_once(m, SOUND_ACTION_TERRAIN_LANDING);
    if (m.floor.type >= SURFACE_SHALLOW_QUICKSAND && m.floor.type <= SURFACE_MOVING_QUICKSAND) {
        m.quicksandDepth += (4 - m.actionTimer) * 3.5 - 0.5;
    }
    return stepResult;
}
function common_landing_cancels(m, landingAction, setAPressAction) {
    if (m.floor.ny < 0.2923717) {
        return F.mario_push_off_steep_floor(m, landingAction.verySteepAction, 0);
    }
    m.doubleJumpTimer = landingAction.unk02;
    if (should_begin_sliding(m)) {
        return F.set_mario_action(m, landingAction.slideAction, 0);
    }
    if (m.input & INPUT_FIRST_PERSON) {
        return F.set_mario_action(m, landingAction.endAction, 0);
    }
    if (++m.actionTimer >= landingAction.numFrames) {
        return F.set_mario_action(m, landingAction.endAction, 0);
    }
    if (m.input & INPUT_A_PRESSED) {
        return setAPressAction(m, landingAction.aPressedAction, 0);
    }
    if (m.input & INPUT_OFF_FLOOR) {
        return F.set_mario_action(m, landingAction.offFloorAction, 0);
    }
    return false;
}
function act_jump_land(m) {
    if (common_landing_cancels(m, sJumpLandAction, F.set_jumping_action)) {
        return true;
    }
    common_landing_action(m, MARIO_ANIM_LAND_FROM_SINGLE_JUMP, ACT_FREEFALL);
    return false;
}
function act_freefall_land(m) {
    if (common_landing_cancels(m, sFreefallLandAction, F.set_jumping_action)) {
        return true;
    }
    common_landing_action(m, MARIO_ANIM_GENERAL_LAND, ACT_FREEFALL);
    return false;
}
function act_side_flip_land(m) {
    if (common_landing_cancels(m, sSideFlipLandAction, F.set_jumping_action)) {
        return true;
    }
    if (common_landing_action(m, MARIO_ANIM_SLIDEFLIP_LAND, ACT_FREEFALL) != GROUND_STEP_HIT_WALL) {
        m.marioObj.gfx.angle[1] = s16(m.marioObj.gfx.angle[1] + (0x8000));
    }
    return false;
}
function act_hold_jump_land(m) {
    if (m.marioObj.oInteractStatus & INT_STATUS_MARIO_DROP_OBJECT) {
        return F.drop_and_set_mario_action(m, ACT_JUMP_LAND_STOP, 0);
    }
    if (common_landing_cancels(m, sHoldJumpLandAction, F.set_jumping_action)) {
        return true;
    }
    common_landing_action(m, MARIO_ANIM_JUMP_LAND_WITH_LIGHT_OBJ, ACT_HOLD_FREEFALL);
    return false;
}
function act_hold_freefall_land(m) {
    if (m.marioObj.oInteractStatus & INT_STATUS_MARIO_DROP_OBJECT) {
        return F.drop_and_set_mario_action(m, ACT_FREEFALL_LAND_STOP, 0);
    }
    if (common_landing_cancels(m, sHoldFreefallLandAction, F.set_jumping_action)) {
        return true;
    }
    common_landing_action(m, MARIO_ANIM_FALL_LAND_WITH_LIGHT_OBJ, ACT_HOLD_FREEFALL);
    return false;
}
function act_long_jump_land(m) {
    if (!(m.input & INPUT_Z_DOWN)) {
        m.input &= ~INPUT_A_PRESSED;
    }
    if (common_landing_cancels(m, sLongJumpLandAction, F.set_jumping_action)) {
        return true;
    }
    if (!(m.input & INPUT_NONZERO_ANALOG)) {
        F.play_sound_if_no_flag(m, SOUND_MARIO_UH2_2, MARIO_MARIO_SOUND_PLAYED);
    }
    common_landing_action(m, !m.marioObj.oMarioLongJumpIsSlow ? MARIO_ANIM_CROUCH_FROM_FAST_LONGJUMP : MARIO_ANIM_CROUCH_FROM_SLOW_LONGJUMP, ACT_FREEFALL);
    return false;
}
function act_double_jump_land(m) {
    if (common_landing_cancels(m, sDoubleJumpLandAction, set_triple_jump_action)) {
        return true;
    }
    common_landing_action(m, MARIO_ANIM_LAND_FROM_DOUBLE_JUMP, ACT_FREEFALL);
    return false;
}
function act_triple_jump_land(m) {
    m.input &= ~INPUT_A_PRESSED;
    if (common_landing_cancels(m, sTripleJumpLandAction, F.set_jumping_action)) {
        return true;
    }
    if (!(m.input & INPUT_NONZERO_ANALOG)) {
        F.play_sound_if_no_flag(m, SOUND_MARIO_HAHA, MARIO_MARIO_SOUND_PLAYED);
    }
    common_landing_action(m, MARIO_ANIM_TRIPLE_JUMP_LAND, ACT_FREEFALL);
    return false;
}
function act_backflip_land(m) {
    if (!(m.input & INPUT_Z_DOWN)) {
        m.input &= ~INPUT_A_PRESSED;
    }
    if (common_landing_cancels(m, sBackflipLandAction, F.set_jumping_action)) {
        return true;
    }
    if (!(m.input & INPUT_NONZERO_ANALOG)) {
        F.play_sound_if_no_flag(m, SOUND_MARIO_HAHA, MARIO_MARIO_SOUND_PLAYED);
    }
    common_landing_action(m, MARIO_ANIM_TRIPLE_JUMP_LAND, ACT_FREEFALL);
    return false;
}
function quicksand_jump_land_action(m, animation1, animation2, endAction, airAction) {
    if (m.actionTimer++ < 6) {
        m.quicksandDepth -= (7 - m.actionTimer) * 0.8;
        if (m.quicksandDepth < 1.0) {
            m.quicksandDepth = 1.1;
        }
        F.play_mario_jump_sound(m);
        F.set_mario_animation(m, animation1);
    } else {
        if (m.actionTimer >= 13) {
            return F.set_mario_action(m, endAction, 0);
        }
        F.set_mario_animation(m, animation2);
    }
    apply_landing_accel(m, 0.95);
    if (F.perform_ground_step(m) == GROUND_STEP_LEFT_GROUND) {
        F.set_mario_action(m, airAction, 0);
    }
    return false;
}
function act_quicksand_jump_land(m) {
    let cancel = quicksand_jump_land_action(m, MARIO_ANIM_SINGLE_JUMP, MARIO_ANIM_LAND_FROM_SINGLE_JUMP, ACT_JUMP_LAND_STOP, ACT_FREEFALL);
    return cancel;
}
function act_hold_quicksand_jump_land(m) {
    let cancel = quicksand_jump_land_action(m, MARIO_ANIM_JUMP_WITH_LIGHT_OBJ, MARIO_ANIM_JUMP_LAND_WITH_LIGHT_OBJ, ACT_HOLD_JUMP_LAND_STOP, ACT_HOLD_FREEFALL);
    return cancel;
}
function check_common_moving_cancels(m) {
    if (m.pos[1] < m.waterLevel - 100) {
        return F.set_water_plunge_action(m);
    }
    if (!(m.action & ACT_FLAG_INVULNERABLE) && (m.input & INPUT_STOMPED)) {
        return F.drop_and_set_mario_action(m, ACT_SHOCKWAVE_BOUNCE, 0);
    }
    if (m.input & INPUT_SQUISHED) {
        return F.drop_and_set_mario_action(m, ACT_SQUISHED, 0);
    }
    if (!(m.action & ACT_FLAG_INVULNERABLE)) {
        if (m.health < 0x100) {
            return F.drop_and_set_mario_action(m, ACT_STANDING_DEATH, 0);
        }
    }
    return false;
}
function mario_execute_moving_action(m) {
    let cancel = 0;
    if (check_common_moving_cancels(m)) {
        return true;
    }
    if (F.mario_update_quicksand(m, 0.25)) {
        return true;
    }
    switch (m.action) {
        case ACT_WALKING:                  cancel = act_walking(m);                  break;
        case ACT_HOLD_WALKING:             cancel = act_hold_walking(m);             break;
        case ACT_HOLD_HEAVY_WALKING:       cancel = act_hold_heavy_walking(m);       break;
        case ACT_TURNING_AROUND:           cancel = act_turning_around(m);           break;
        case ACT_FINISH_TURNING_AROUND:    cancel = act_finish_turning_around(m);    break;
        case ACT_BRAKING:                  cancel = act_braking(m);                  break;
        case ACT_RIDING_SHELL_GROUND:      cancel = act_riding_shell_ground(m);      break;
        case ACT_CRAWLING:                 cancel = act_crawling(m);                 break;
        case ACT_BURNING_GROUND:           cancel = act_burning_ground(m);           break;
        case ACT_DECELERATING:             cancel = act_decelerating(m);             break;
        case ACT_HOLD_DECELERATING:        cancel = act_hold_decelerating(m);        break;
        case ACT_BUTT_SLIDE:               cancel = act_butt_slide(m);               break;
        case ACT_STOMACH_SLIDE:            cancel = act_stomach_slide(m);            break;
        case ACT_HOLD_BUTT_SLIDE:          cancel = act_hold_butt_slide(m);          break;
        case ACT_HOLD_STOMACH_SLIDE:       cancel = act_hold_stomach_slide(m);       break;
        case ACT_DIVE_SLIDE:               cancel = act_dive_slide(m);               break;
        case ACT_MOVE_PUNCHING:            cancel = act_move_punching(m);            break;
        case ACT_CROUCH_SLIDE:             cancel = act_crouch_slide(m);             break;
        case ACT_SLIDE_KICK_SLIDE:         cancel = act_slide_kick_slide(m);         break;
        case ACT_HARD_BACKWARD_GROUND_KB:  cancel = act_hard_backward_ground_kb(m);  break;
        case ACT_HARD_FORWARD_GROUND_KB:   cancel = act_hard_forward_ground_kb(m);   break;
        case ACT_BACKWARD_GROUND_KB:       cancel = act_backward_ground_kb(m);       break;
        case ACT_FORWARD_GROUND_KB:        cancel = act_forward_ground_kb(m);        break;
        case ACT_SOFT_BACKWARD_GROUND_KB:  cancel = act_soft_backward_ground_kb(m);  break;
        case ACT_SOFT_FORWARD_GROUND_KB:   cancel = act_soft_forward_ground_kb(m);   break;
        case ACT_GROUND_BONK:              cancel = act_ground_bonk(m);              break;
        case ACT_DEATH_EXIT_LAND:          cancel = act_death_exit_land(m);          break;
        case ACT_JUMP_LAND:                cancel = act_jump_land(m);                break;
        case ACT_FREEFALL_LAND:            cancel = act_freefall_land(m);            break;
        case ACT_DOUBLE_JUMP_LAND:         cancel = act_double_jump_land(m);         break;
        case ACT_SIDE_FLIP_LAND:           cancel = act_side_flip_land(m);           break;
        case ACT_HOLD_JUMP_LAND:           cancel = act_hold_jump_land(m);           break;
        case ACT_HOLD_FREEFALL_LAND:       cancel = act_hold_freefall_land(m);       break;
        case ACT_TRIPLE_JUMP_LAND:         cancel = act_triple_jump_land(m);         break;
        case ACT_BACKFLIP_LAND:            cancel = act_backflip_land(m);            break;
        case ACT_QUICKSAND_JUMP_LAND:      cancel = act_quicksand_jump_land(m);      break;
        case ACT_HOLD_QUICKSAND_JUMP_LAND: cancel = act_hold_quicksand_jump_land(m); break;
        case ACT_LONG_JUMP_LAND:           cancel = act_long_jump_land(m);           break;
    }
    if (!cancel && (m.input & INPUT_IN_WATER)) {
        m.particleFlags |= PARTICLE_WAVE_TRAIL;
        m.particleFlags &= ~PARTICLE_DUST;
    }
    return cancel;
}

Object.assign(F, { tilt_body_running, play_step_sound, align_with_floor, begin_walking_action, check_ledge_climb_down, slide_bonk, set_triple_jump_action, update_sliding_angle, update_sliding, apply_slope_accel, apply_landing_accel, update_shell_speed, apply_slope_decel, update_decelerating_speed, update_walking_speed, should_begin_sliding, analog_stick_held_back, check_ground_dive_or_punch, begin_braking_action, anim_and_audio_for_walk, anim_and_audio_for_hold_walk, anim_and_audio_for_heavy_walk, push_or_sidle_wall, tilt_body_walking, tilt_body_ground_shell, act_walking, act_move_punching, act_hold_walking, act_hold_heavy_walking, act_turning_around, act_finish_turning_around, act_braking, act_decelerating, act_hold_decelerating, act_riding_shell_ground, act_crawling, act_burning_ground, tilt_body_butt_slide, common_slide_action, common_slide_action_with_jump, act_butt_slide, act_hold_butt_slide, act_crouch_slide, act_slide_kick_slide, stomach_slide_action, act_stomach_slide, act_hold_stomach_slide, act_dive_slide, common_ground_knockback_action, act_hard_backward_ground_kb, act_hard_forward_ground_kb, act_backward_ground_kb, act_forward_ground_kb, act_soft_backward_ground_kb, act_soft_forward_ground_kb, act_ground_bonk, act_death_exit_land, common_landing_action, common_landing_cancels, act_jump_land, act_freefall_land, act_side_flip_land, act_hold_jump_land, act_hold_freefall_land, act_long_jump_land, act_double_jump_land, act_triple_jump_land, act_backflip_land, quicksand_jump_land_action, act_quicksand_jump_land, act_hold_quicksand_jump_land, check_common_moving_cancels, mario_execute_moving_action });

})(window);

/* Mario in the air: ported from the Super Mario 64 decompilation (github.com/n64decomp/sm64): src/game/mario_actions_airborne.c */
(function (root) {
'use strict';
const SM64 = root.SM64, F = SM64.F = SM64.F || {}, W = SM64.W = SM64.W || {}, B = SM64.B = SM64.B || {};
const { s16, s8, sins, coss, atan2s, sqr, approach_f32, approach_s32, max, min, abs, REF, REFA, REFV } = SM64.m;
/*CONSTS*/
const { ACT_AIR_HIT_WALL, ACT_AIR_THROW, ACT_AIR_THROW_LAND, ACT_BACKFLIP, ACT_BACKFLIP_LAND, ACT_BACKWARD_AIR_KB, 
  ACT_BACKWARD_GROUND_KB, ACT_BACKWARD_ROLLOUT, ACT_BEGIN_SLIDING, ACT_BURNING_FALL, ACT_BURNING_GROUND, 
  ACT_BURNING_JUMP, ACT_BUTT_SLIDE, ACT_BUTT_SLIDE_AIR, ACT_BUTT_STUCK_IN_GROUND, ACT_CRAZY_BOX_BOUNCE, ACT_DIVE, 
  ACT_DIVE_PICKING_UP, ACT_DIVE_SLIDE, ACT_DOUBLE_JUMP, ACT_DOUBLE_JUMP_LAND, ACT_FEET_STUCK_IN_GROUND, 
  ACT_FLAG_ALLOW_VERTICAL_WIND_ACTION, ACT_FLAG_INVULNERABLE, ACT_FLYING, ACT_FLYING_TRIPLE_JUMP, ACT_FORWARD_AIR_KB, 
  ACT_FORWARD_GROUND_KB, ACT_FORWARD_ROLLOUT, ACT_FREEFALL, ACT_FREEFALL_LAND, ACT_FREEFALL_LAND_STOP, 
  ACT_GETTING_BLOWN, ACT_GROUND_POUND, ACT_GROUND_POUND_LAND, ACT_HARD_BACKWARD_AIR_KB, ACT_HARD_BACKWARD_GROUND_KB, 
  ACT_HARD_FORWARD_AIR_KB, ACT_HARD_FORWARD_GROUND_KB, ACT_HEAD_STUCK_IN_GROUND, ACT_HOLD_BUTT_SLIDE, 
  ACT_HOLD_BUTT_SLIDE_AIR, ACT_HOLD_FREEFALL, ACT_HOLD_FREEFALL_LAND, ACT_HOLD_JUMP, ACT_HOLD_JUMP_LAND, 
  ACT_HOLD_WATER_JUMP, ACT_JUMP, ACT_JUMP_KICK, ACT_JUMP_LAND, ACT_LAVA_BOOST, ACT_LAVA_BOOST_LAND, ACT_LEDGE_GRAB, 
  ACT_LONG_JUMP, ACT_LONG_JUMP_LAND, ACT_RIDING_HOOT, ACT_RIDING_SHELL_FALL, ACT_RIDING_SHELL_GROUND, 
  ACT_RIDING_SHELL_JUMP, ACT_SHOT_FROM_CANNON, ACT_SIDE_FLIP, ACT_SIDE_FLIP_LAND, ACT_SLIDE_KICK, 
  ACT_SLIDE_KICK_SLIDE, ACT_SOFT_BONK, ACT_SPECIAL_TRIPLE_JUMP, ACT_SQUISHED, ACT_START_HANGING, ACT_STEEP_JUMP, 
  ACT_STOMACH_SLIDE, ACT_THROWN_BACKWARD, ACT_THROWN_FORWARD, ACT_TOP_OF_POLE_JUMP, ACT_TRIPLE_JUMP, 
  ACT_TRIPLE_JUMP_LAND, ACT_TWIRLING, ACT_TWIRL_LAND, ACT_VERTICAL_WIND, ACT_WALL_KICK_AIR, ACT_WATER_JUMP, 
  AIR_STEP_CHECK_HANG, AIR_STEP_CHECK_LEDGE_GRAB, AIR_STEP_GRABBED_CEILING, AIR_STEP_GRABBED_LEDGE, 
  AIR_STEP_HIT_LAVA_WALL, AIR_STEP_HIT_WALL, AIR_STEP_LANDED, AIR_STEP_NONE, CAMERA_MODE_BEHIND_MARIO, 
  CAM_EVENT_SHOT_FROM_CANNON, GRAB_POS_LIGHT_OBJ, INPUT_A_DOWN, INPUT_A_PRESSED, INPUT_B_PRESSED, 
  INPUT_NONZERO_ANALOG, INPUT_SQUISHED, INPUT_Z_PRESSED, INT_STATUS_MARIO_DROP_OBJECT, INT_STATUS_MARIO_UNK7, 
  INT_STATUS_STOP_RIDING, INT_SUBTYPE_HOLDABLE_NPC, MARIO_ACTION_SOUND_PLAYED, MARIO_ANIM_AIRBORNE_ON_STOMACH, 
  MARIO_ANIM_AIR_FORWARD_KB, MARIO_ANIM_AIR_KICK, MARIO_ANIM_BACKFLIP, MARIO_ANIM_BACKWARD_AIR_KB, 
  MARIO_ANIM_BACKWARD_SPINNING, MARIO_ANIM_DIVE, MARIO_ANIM_DOUBLE_JUMP_FALL, MARIO_ANIM_DOUBLE_JUMP_RISE, 
  MARIO_ANIM_FALL_FROM_SLIDE, MARIO_ANIM_FALL_FROM_SLIDE_KICK, MARIO_ANIM_FALL_FROM_SLIDING_WITH_LIGHT_OBJ, 
  MARIO_ANIM_FALL_WITH_LIGHT_OBJ, MARIO_ANIM_FAST_LONGJUMP, MARIO_ANIM_FIRE_LAVA_BURN, MARIO_ANIM_FLY_FROM_CANNON, 
  MARIO_ANIM_FORWARD_SPINNING, MARIO_ANIM_FORWARD_SPINNING_FLIP, MARIO_ANIM_GENERAL_FALL, MARIO_ANIM_GROUND_POUND, 
  MARIO_ANIM_HANDSTAND_JUMP, MARIO_ANIM_HANG_ON_CEILING, MARIO_ANIM_HANG_ON_OWL, MARIO_ANIM_IDLE_ON_LEDGE, 
  MARIO_ANIM_JUMP_RIDING_SHELL, MARIO_ANIM_JUMP_WITH_LIGHT_OBJ, MARIO_ANIM_SINGLE_JUMP, MARIO_ANIM_SLIDE, 
  MARIO_ANIM_SLIDEFLIP, MARIO_ANIM_SLIDEJUMP, MARIO_ANIM_SLIDE_KICK, MARIO_ANIM_SLIDING_ON_BOTTOM_WITH_LIGHT_OBJ, 
  MARIO_ANIM_SLOW_LONGJUMP, MARIO_ANIM_START_GROUND_POUND, MARIO_ANIM_START_TWIRL, MARIO_ANIM_START_WALLKICK, 
  MARIO_ANIM_THROW_LIGHT_OBJECT, MARIO_ANIM_TRIPLE_JUMP, MARIO_ANIM_TRIPLE_JUMP_FLY, 
  MARIO_ANIM_TRIPLE_JUMP_GROUND_POUND, MARIO_ANIM_TWIRL, MARIO_ANIM_WING_CAP_FLY, MARIO_CAP_ON_HEAD, MARIO_EYES_DEAD, 
  MARIO_KICKING, MARIO_MARIO_SOUND_PLAYED, MARIO_METAL_CAP, MARIO_UNKNOWN_18, MARIO_WING_CAP, PARTICLE_DUST, 
  PARTICLE_FIRE, PARTICLE_HORIZONTAL_STAR, PARTICLE_MIST_CIRCLE, PARTICLE_SPARKLES, PARTICLE_VERTICAL_STAR, 
  SHAKE_FALL_DAMAGE, SHAKE_GROUND_POUND, SOUND_ACTION_BONK, SOUND_ACTION_FLYING_FAST, SOUND_ACTION_HIT, 
  SOUND_ACTION_METAL_BONK, SOUND_ACTION_SIDE_FLIP_UNK, SOUND_ACTION_SPIN, SOUND_ACTION_TERRAIN_BODY_HIT_GROUND, 
  SOUND_ACTION_TERRAIN_HEAVY_LANDING, SOUND_ACTION_TERRAIN_JUMP, SOUND_ACTION_TERRAIN_LANDING, SOUND_ACTION_THROW, 
  SOUND_ACTION_TWIRL, SOUND_ACTION_UNKNOWN432, SOUND_GENERAL_BOING1, SOUND_GENERAL_BOING2, SOUND_MARIO_ATTACKED, 
  SOUND_MARIO_DOH, SOUND_MARIO_GROUND_POUND_WAH, SOUND_MARIO_HERE_WE_GO, SOUND_MARIO_HOOHOO, SOUND_MARIO_ON_FIRE, 
  SOUND_MARIO_OOOF2, SOUND_MARIO_PUNCH_HOO, SOUND_MARIO_UH, SOUND_MARIO_WAAAOOOW, SOUND_MARIO_WAH2, 
  SOUND_MARIO_YAHOO, SOUND_MARIO_YAHOO_WAHA_YIPPEE, SOUND_MARIO_YAH_WAH_HOO, SOUND_MOVING_FLYING, 
  SOUND_MOVING_LAVA_BURN, SURFACE_BURNING, SURFACE_HORIZONTAL_WIND, SURFACE_IS_NOT_HARD, SURFACE_VERTICAL_WIND, 
  TERRAIN_MASK, TERRAIN_SAND, TERRAIN_SNOW, WARP_OP_DEATH } = SM64.C;
/*END CONSTS*/

function play_flip_sounds(m, frame1, frame2, frame3) {
    let animFrame = m.marioObj.gfx.anim.frame;
    if (animFrame == frame1 || animFrame == frame2 || animFrame == frame3) {
        play_sound(SOUND_ACTION_SPIN, m.marioObj.gfx.cameraToObject);
    }
}
function play_far_fall_sound(m) {
    let action = m.action;
    if (!(action & ACT_FLAG_INVULNERABLE) && action != ACT_TWIRLING && action != ACT_FLYING && !(m.flags & MARIO_UNKNOWN_18)) {
        if (m.peakHeight - m.pos[1] > 1150.0) {
            play_sound(SOUND_MARIO_WAAAOOOW, m.marioObj.gfx.cameraToObject);
            m.flags |= MARIO_UNKNOWN_18;
        }
    }
}
function play_knockback_sound(m) {
    if (m.actionArg == 0 && (m.forwardVel <= -28.0 || m.forwardVel >= 28.0)) {
        F.play_sound_if_no_flag(m, SOUND_MARIO_DOH, MARIO_MARIO_SOUND_PLAYED);
    } else {
        F.play_sound_if_no_flag(m, SOUND_MARIO_UH, MARIO_MARIO_SOUND_PLAYED);
    }
}
function lava_boost_on_wall(m) {
    m.faceAngle[1] = s16(atan2s(m.wall.nz, m.wall.nx));
    if (m.forwardVel < 24.0) {
        m.forwardVel = 24.0;
    }
    if (!(m.flags & MARIO_METAL_CAP)) {
        m.hurtCounter += (m.flags & MARIO_CAP_ON_HEAD) ? 12 : 18;
    }
    play_sound(SOUND_MARIO_ON_FIRE, m.marioObj.gfx.cameraToObject);
    F.update_mario_sound_and_camera(m);
    return F.drop_and_set_mario_action(m, ACT_LAVA_BOOST, 1);
}
function check_fall_damage(m, hardFallAction) {
    let fallHeight = 0;
    let damageHeight = 0;
    fallHeight = m.peakHeight - m.pos[1];
    if (m.actionState == ACT_GROUND_POUND) {
        damageHeight = 600.0;
    } else {
        damageHeight = 1150.0;
    }
    if (m.action != ACT_TWIRLING && m.floor.type != SURFACE_BURNING) {
        if (m.vel[1] < -55.0) {
            if (fallHeight > 3000.0) {
                m.hurtCounter += (m.flags & MARIO_CAP_ON_HEAD) ? 16 : 24;
                F.set_camera_shake_from_hit(SHAKE_FALL_DAMAGE);
                play_sound(SOUND_MARIO_ATTACKED, m.marioObj.gfx.cameraToObject);
                return F.drop_and_set_mario_action(m, hardFallAction, 4);
            } else if (fallHeight > damageHeight && !F.mario_floor_is_slippery(m)) {
                m.hurtCounter += (m.flags & MARIO_CAP_ON_HEAD) ? 8 : 12;
                m.squishTimer = 30;
                F.set_camera_shake_from_hit(SHAKE_FALL_DAMAGE);
                play_sound(SOUND_MARIO_ATTACKED, m.marioObj.gfx.cameraToObject);
            }
        }
    }
    return false;
}
function check_kick_or_dive_in_air(m) {
    if (m.input & INPUT_B_PRESSED) {
        return F.set_mario_action(m, m.forwardVel > 28.0 ? ACT_DIVE : ACT_JUMP_KICK, 0);
    }
    return false;
}
function should_get_stuck_in_ground(m) {
    let terrainType = m.area.terrainType & TERRAIN_MASK;
    let floor = m.floor;
    let flags = floor.flags;
    let type = floor.type;
    if (floor != null && (terrainType == TERRAIN_SNOW || terrainType == TERRAIN_SAND) && type != SURFACE_BURNING && SURFACE_IS_NOT_HARD(type)) {
        if (!(flags & 0x01) && m.peakHeight - m.pos[1] > 1000.0 && floor.ny >= 0.8660254) {
            return true;
        }
    }
    return false;
}
function check_fall_damage_or_get_stuck(m, hardFallAction) {
    if (should_get_stuck_in_ground(m)) {
        play_sound(SOUND_MARIO_OOOF2, m.marioObj.gfx.cameraToObject);
        m.particleFlags |= PARTICLE_MIST_CIRCLE;
        F.drop_and_set_mario_action(m, ACT_FEET_STUCK_IN_GROUND, 0);
        return true;
    }
    return check_fall_damage(m, hardFallAction);
}
function check_horizontal_wind(m) {
    let floor = null;
    let speed = 0;
    let pushAngle = 0;
    floor = m.floor;
    if (floor.type == SURFACE_HORIZONTAL_WIND) {
        pushAngle = s16(floor.force << 8);
        m.slideVelX += 1.2 * sins(pushAngle);
        m.slideVelZ += 1.2 * coss(pushAngle);
        speed = Math.sqrt(m.slideVelX * m.slideVelX + m.slideVelZ * m.slideVelZ);
        if (speed > 48.0) {
            m.slideVelX = m.slideVelX * 48.0 / speed;
            m.slideVelZ = m.slideVelZ * 48.0 / speed;
            speed = 32.0; 
        } else if (speed > 32.0) {
            speed = 32.0;
        }
        m.vel[0] = m.slideVelX;
        m.vel[2] = m.slideVelZ;
        m.slideYaw = s16(atan2s(m.slideVelZ, m.slideVelX));
        m.forwardVel = speed * coss(m.faceAngle[1] - m.slideYaw);
        return true;
    }
    return false;
}
function update_air_with_turn(m) {
    let dragThreshold = 0;
    let intendedDYaw = 0;
    let intendedMag = 0;
    if (!check_horizontal_wind(m)) {
        dragThreshold = m.action == ACT_LONG_JUMP ? 48.0 : 32.0;
        m.forwardVel = approach_f32(m.forwardVel, 0.0, 0.35, 0.35);
        if (m.input & INPUT_NONZERO_ANALOG) {
            let endedDYaw = m.intendedYaw - m.faceAngle[1];
            let endedMag = m.intendedMag / 32.0;
            m.forwardVel += 1.5 * coss(intendedDYaw) * intendedMag;
            m.faceAngle[1] = s16(m.faceAngle[1] + (512.0 * sins(intendedDYaw) * intendedMag));
        }
        if (m.forwardVel > dragThreshold) {
            m.forwardVel -= 1.0;
        }
        if (m.forwardVel < -16.0) {
            m.forwardVel += 2.0;
        }
        m.vel[0] = m.slideVelX = m.forwardVel * sins(m.faceAngle[1]);
        m.vel[2] = m.slideVelZ = m.forwardVel * coss(m.faceAngle[1]);
    }
}
function update_air_without_turn(m) {
    let sidewaysSpeed = 0.0;
    let dragThreshold = 0;
    let intendedDYaw = 0;
    let intendedMag = 0;
    if (!check_horizontal_wind(m)) {
        dragThreshold = m.action == ACT_LONG_JUMP ? 48.0 : 32.0;
        m.forwardVel = approach_f32(m.forwardVel, 0.0, 0.35, 0.35);
        if (m.input & INPUT_NONZERO_ANALOG) {
            let endedDYaw = m.intendedYaw - m.faceAngle[1];
            let endedMag = m.intendedMag / 32.0;
            m.forwardVel += intendedMag * coss(intendedDYaw) * 1.5;
            sidewaysSpeed = intendedMag * sins(intendedDYaw) * 10.0;
        }
        if (m.forwardVel > dragThreshold) {
            m.forwardVel -= 1.0;
        }
        if (m.forwardVel < -16.0) {
            m.forwardVel += 2.0;
        }
        m.slideVelX = m.forwardVel * sins(m.faceAngle[1]);
        m.slideVelZ = m.forwardVel * coss(m.faceAngle[1]);
        m.slideVelX += sidewaysSpeed * sins(m.faceAngle[1] + 0x4000);
        m.slideVelZ += sidewaysSpeed * coss(m.faceAngle[1] + 0x4000);
        m.vel[0] = m.slideVelX;
        m.vel[2] = m.slideVelZ;
    }
}
function update_lava_boost_or_twirling(m) {
    let intendedDYaw = 0;
    let intendedMag = 0;
    if (m.input & INPUT_NONZERO_ANALOG) {
        let endedDYaw = m.intendedYaw - m.faceAngle[1];
        let endedMag = m.intendedMag / 32.0;
        m.forwardVel += coss(intendedDYaw) * intendedMag;
        m.faceAngle[1] = s16(m.faceAngle[1] + (sins(intendedDYaw) * intendedMag * 1024.0));
        if (m.forwardVel < 0.0) {
            m.faceAngle[1] = s16(m.faceAngle[1] + (0x8000));
            m.forwardVel *= -1.0;
        }
        if (m.forwardVel > 32.0) {
            m.forwardVel -= 2.0;
        }
    }
    m.vel[0] = m.slideVelX = m.forwardVel * sins(m.faceAngle[1]);
    m.vel[2] = m.slideVelZ = m.forwardVel * coss(m.faceAngle[1]);
}
function update_flying_yaw(m) {
    let targetYawVel = s16(-s16((m.controller.stickX * (m.forwardVel / 4.0))));
    if (targetYawVel > 0) {
        if (m.angleVel[1] < 0) {
            m.angleVel[1] = s16(m.angleVel[1] + (0x40));
            if (m.angleVel[1] > 0x10) {
                m.angleVel[1] = s16(0x10);
            }
        } else {
            m.angleVel[1] = s16(approach_s32(m.angleVel[1], targetYawVel, 0x10, 0x20));
        }
    } else if (targetYawVel < 0) {
        if (m.angleVel[1] > 0) {
            m.angleVel[1] = s16(m.angleVel[1] - (0x40));
            if (m.angleVel[1] < -0x10) {
                m.angleVel[1] = s16(-0x10);
            }
        } else {
            m.angleVel[1] = s16(approach_s32(m.angleVel[1], targetYawVel, 0x20, 0x10));
        }
    } else {
        m.angleVel[1] = s16(approach_s32(m.angleVel[1], 0, 0x40, 0x40));
    }
    m.faceAngle[1] = s16(m.faceAngle[1] + (m.angleVel[1]));
    m.faceAngle[2] = s16(20 * -m.angleVel[1]);
}
function update_flying_pitch(m) {
    let targetPitchVel = s16(-s16((m.controller.stickY * (m.forwardVel / 5.0))));
    if (targetPitchVel > 0) {
        if (m.angleVel[0] < 0) {
            m.angleVel[0] = s16(m.angleVel[0] + (0x40));
            if (m.angleVel[0] > 0x20) {
                m.angleVel[0] = s16(0x20);
            }
        } else {
            m.angleVel[0] = s16(approach_s32(m.angleVel[0], targetPitchVel, 0x20, 0x40));
        }
    } else if (targetPitchVel < 0) {
        if (m.angleVel[0] > 0) {
            m.angleVel[0] = s16(m.angleVel[0] - (0x40));
            if (m.angleVel[0] < -0x20) {
                m.angleVel[0] = s16(-0x20);
            }
        } else {
            m.angleVel[0] = s16(approach_s32(m.angleVel[0], targetPitchVel, 0x40, 0x20));
        }
    } else {
        m.angleVel[0] = s16(approach_s32(m.angleVel[0], 0, 0x40, 0x40));
    }
}
function update_flying(m) {
    let filler = new Array(4).fill(0);
    update_flying_pitch(m);
    update_flying_yaw(m);
    m.forwardVel -= 2.0 * (m.faceAngle[0] / 0x4000) + 0.1;
    m.forwardVel -= 0.5 * (1.0 - coss(m.angleVel[1]));
    if (m.forwardVel < 0.0) {
        m.forwardVel = 0.0;
    }
    if (m.forwardVel > 16.0) {
        m.faceAngle[0] = s16(m.faceAngle[0] + ((m.forwardVel - 32.0) * 6.0));
    } else if (m.forwardVel > 4.0) {
        m.faceAngle[0] = s16(m.faceAngle[0] + ((m.forwardVel - 32.0) * 10.0));
    } else {
        m.faceAngle[0] = s16(m.faceAngle[0] - (0x400));
    }
    m.faceAngle[0] = s16(m.faceAngle[0] + (m.angleVel[0]));
    if (m.faceAngle[0] > 0x2AAA) {
        m.faceAngle[0] = s16(0x2AAA);
    }
    if (m.faceAngle[0] < -0x2AAA) {
        m.faceAngle[0] = s16(-0x2AAA);
    }
    m.vel[0] = m.forwardVel * coss(m.faceAngle[0]) * sins(m.faceAngle[1]);
    m.vel[1] = m.forwardVel * sins(m.faceAngle[0]);
    m.vel[2] = m.forwardVel * coss(m.faceAngle[0]) * coss(m.faceAngle[1]);
    m.slideVelX = m.vel[0];
    m.slideVelZ = m.vel[2];
}
function common_air_action_step(m, landAction, animation, stepArg) {
    let stepResult = 0;
    update_air_without_turn(m);
    stepResult = F.perform_air_step(m, stepArg);
    switch (stepResult) {
        case AIR_STEP_NONE:
            F.set_mario_animation(m, animation);
            break;
        case AIR_STEP_LANDED:
            if (!check_fall_damage_or_get_stuck(m, ACT_HARD_BACKWARD_GROUND_KB)) {
                F.set_mario_action(m, landAction, 0);
            }
            break;
        case AIR_STEP_HIT_WALL:
            F.set_mario_animation(m, animation);
            if (m.forwardVel > 16.0) {
                F.mario_bonk_reflection(m, false);
                m.faceAngle[1] = s16(m.faceAngle[1] + (0x8000));
                if (m.wall != null) {
                    F.set_mario_action(m, ACT_AIR_HIT_WALL, 0);
                } else {
                    if (m.vel[1] > 0.0) {
                        m.vel[1] = 0.0;
                    }
                    if (m.forwardVel >= 38.0) {
                        m.particleFlags |= PARTICLE_VERTICAL_STAR;
                        F.set_mario_action(m, ACT_BACKWARD_AIR_KB, 0);
                    } else {
                        if (m.forwardVel > 8.0) {
                            F.mario_set_forward_vel(m, -8.0);
                        }
                        return F.set_mario_action(m, ACT_SOFT_BONK, 0);
                    }
                }
            } else {
                F.mario_set_forward_vel(m, 0.0);
            }
            break;
        case AIR_STEP_GRABBED_LEDGE:
            F.set_mario_animation(m, MARIO_ANIM_IDLE_ON_LEDGE);
            F.drop_and_set_mario_action(m, ACT_LEDGE_GRAB, 0);
            break;
        case AIR_STEP_GRABBED_CEILING:
            F.set_mario_action(m, ACT_START_HANGING, 0);
            break;
        case AIR_STEP_HIT_LAVA_WALL:
            lava_boost_on_wall(m);
            break;
    }
    return stepResult;
}
function act_jump(m) {
    if (check_kick_or_dive_in_air(m)) {
        return true;
    }
    if (m.input & INPUT_Z_PRESSED) {
        return F.set_mario_action(m, ACT_GROUND_POUND, 0);
    }
    F.play_mario_sound(m, SOUND_ACTION_TERRAIN_JUMP, 0);
    common_air_action_step(m, ACT_JUMP_LAND, MARIO_ANIM_SINGLE_JUMP, AIR_STEP_CHECK_LEDGE_GRAB | AIR_STEP_CHECK_HANG);
    return false;
}
function act_double_jump(m) {
    let animation = (m.vel[1] >= 0.0) ? MARIO_ANIM_DOUBLE_JUMP_RISE : MARIO_ANIM_DOUBLE_JUMP_FALL;
    if (check_kick_or_dive_in_air(m)) {
        return true;
    }
    if (m.input & INPUT_Z_PRESSED) {
        return F.set_mario_action(m, ACT_GROUND_POUND, 0);
    }
    F.play_mario_sound(m, SOUND_ACTION_TERRAIN_JUMP, SOUND_MARIO_HOOHOO);
    common_air_action_step(m, ACT_DOUBLE_JUMP_LAND, animation, AIR_STEP_CHECK_LEDGE_GRAB | AIR_STEP_CHECK_HANG);
    return false;
}
function act_triple_jump(m) {
    if (W.gSpecialTripleJump) {
        return F.set_mario_action(m, ACT_SPECIAL_TRIPLE_JUMP, 0);
    }
    if (m.input & INPUT_B_PRESSED) {
        return F.set_mario_action(m, ACT_DIVE, 0);
    }
    if (m.input & INPUT_Z_PRESSED) {
        return F.set_mario_action(m, ACT_GROUND_POUND, 0);
    }
    F.play_mario_sound(m, SOUND_ACTION_TERRAIN_JUMP, 0);
    common_air_action_step(m, ACT_TRIPLE_JUMP_LAND, MARIO_ANIM_TRIPLE_JUMP, 0);
    play_flip_sounds(m, 2, 8, 20);
    return false;
}
function act_backflip(m) {
    if (m.input & INPUT_Z_PRESSED) {
        return F.set_mario_action(m, ACT_GROUND_POUND, 0);
    }
    F.play_mario_sound(m, SOUND_ACTION_TERRAIN_JUMP, SOUND_MARIO_YAH_WAH_HOO);
    common_air_action_step(m, ACT_BACKFLIP_LAND, MARIO_ANIM_BACKFLIP, 0);
    play_flip_sounds(m, 2, 3, 17);
    return false;
}
function act_freefall(m) {
    let animation = 0;
    if (m.input & INPUT_B_PRESSED) {
        return F.set_mario_action(m, ACT_DIVE, 0);
    }
    if (m.input & INPUT_Z_PRESSED) {
        return F.set_mario_action(m, ACT_GROUND_POUND, 0);
    }
    switch (m.actionArg) {
        case 0:
            animation = MARIO_ANIM_GENERAL_FALL;
            break;
        case 1:
            animation = MARIO_ANIM_FALL_FROM_SLIDE;
            break;
        case 2:
            animation = MARIO_ANIM_FALL_FROM_SLIDE_KICK;
            break;
    }
    common_air_action_step(m, ACT_FREEFALL_LAND, animation, AIR_STEP_CHECK_LEDGE_GRAB);
    return false;
}
function act_hold_jump(m) {
    if (m.marioObj.oInteractStatus & INT_STATUS_MARIO_DROP_OBJECT) {
        return F.drop_and_set_mario_action(m, ACT_FREEFALL, 0);
    }
    if ((m.input & INPUT_B_PRESSED) && !(m.heldObj.oInteractionSubtype & INT_SUBTYPE_HOLDABLE_NPC)) {
        return F.set_mario_action(m, ACT_AIR_THROW, 0);
    }
    if (m.input & INPUT_Z_PRESSED) {
        return F.drop_and_set_mario_action(m, ACT_GROUND_POUND, 0);
    }
    F.play_mario_sound(m, SOUND_ACTION_TERRAIN_JUMP, 0);
    common_air_action_step(m, ACT_HOLD_JUMP_LAND, MARIO_ANIM_JUMP_WITH_LIGHT_OBJ, AIR_STEP_CHECK_LEDGE_GRAB);
    return false;
}
function act_hold_freefall(m) {
    let animation = 0;
    if (m.actionArg == 0) {
        animation = MARIO_ANIM_FALL_WITH_LIGHT_OBJ;
    } else {
        animation = MARIO_ANIM_FALL_FROM_SLIDING_WITH_LIGHT_OBJ;
    }
    if (m.marioObj.oInteractStatus & INT_STATUS_MARIO_DROP_OBJECT) {
        return F.drop_and_set_mario_action(m, ACT_FREEFALL, 0);
    }
    if ((m.input & INPUT_B_PRESSED) && !(m.heldObj.oInteractionSubtype & INT_SUBTYPE_HOLDABLE_NPC)) {
        return F.set_mario_action(m, ACT_AIR_THROW, 0);
    }
    if (m.input & INPUT_Z_PRESSED) {
        return F.drop_and_set_mario_action(m, ACT_GROUND_POUND, 0);
    }
    common_air_action_step(m, ACT_HOLD_FREEFALL_LAND, animation, AIR_STEP_CHECK_LEDGE_GRAB);
    return false;
}
function act_side_flip(m) {
    if (m.input & INPUT_B_PRESSED) {
        return F.set_mario_action(m, ACT_DIVE, 0);
    }
    if (m.input & INPUT_Z_PRESSED) {
        return F.set_mario_action(m, ACT_GROUND_POUND, 0);
    }
    F.play_mario_sound(m, SOUND_ACTION_TERRAIN_JUMP, 0);
    if (common_air_action_step(m, ACT_SIDE_FLIP_LAND, MARIO_ANIM_SLIDEFLIP, AIR_STEP_CHECK_LEDGE_GRAB) != AIR_STEP_GRABBED_LEDGE) {
        m.marioObj.gfx.angle[1] = s16(m.marioObj.gfx.angle[1] + (0x8000));
    }
    if (m.marioObj.gfx.anim.frame == 6) play_sound(SOUND_ACTION_SIDE_FLIP_UNK, m.marioObj.gfx.cameraToObject);
    return false;
}
function act_wall_kick_air(m) {
    if (m.input & INPUT_B_PRESSED) {
        return F.set_mario_action(m, ACT_DIVE, 0);
    }
    if (m.input & INPUT_Z_PRESSED) {
        return F.set_mario_action(m, ACT_GROUND_POUND, 0);
    }
    F.play_mario_jump_sound(m);
    common_air_action_step(m, ACT_JUMP_LAND, MARIO_ANIM_SLIDEJUMP, AIR_STEP_CHECK_LEDGE_GRAB);
    return false;
}
function act_long_jump(m) {
    let animation = 0;
    if (!m.marioObj.oMarioLongJumpIsSlow) {
        animation = MARIO_ANIM_FAST_LONGJUMP;
    } else {
        animation = MARIO_ANIM_SLOW_LONGJUMP;
    }
    F.play_mario_sound(m, SOUND_ACTION_TERRAIN_JUMP, SOUND_MARIO_YAHOO);
    if (m.floor.type == SURFACE_VERTICAL_WIND && m.actionState == 0) {
        play_sound(SOUND_MARIO_HERE_WE_GO, m.marioObj.gfx.cameraToObject);
        m.actionState = 1;
    }
    common_air_action_step(m, ACT_LONG_JUMP_LAND, animation, AIR_STEP_CHECK_LEDGE_GRAB);
    return false;
}
function act_riding_shell_air(m) {
    F.play_mario_sound(m, SOUND_ACTION_TERRAIN_JUMP, 0);
    F.set_mario_animation(m, MARIO_ANIM_JUMP_RIDING_SHELL);
    update_air_without_turn(m);
    switch (F.perform_air_step(m, 0)) {
        case AIR_STEP_LANDED:
            F.set_mario_action(m, ACT_RIDING_SHELL_GROUND, 1);
            break;
        case AIR_STEP_HIT_WALL:
            F.mario_set_forward_vel(m, 0.0);
            break;
        case AIR_STEP_HIT_LAVA_WALL:
            lava_boost_on_wall(m);
            break;
    }
    m.marioObj.gfx.pos[1] += 42.0;
    return false;
}
function act_twirling(m) {
    let startTwirlYaw = s16(m.twirlYaw);
    let yawVelTarget = 0;
    if (m.input & INPUT_A_DOWN) {
        yawVelTarget = s16(0x2000);
    } else {
        yawVelTarget = s16(0x1800);
    }
    m.angleVel[1] = s16(approach_s32(m.angleVel[1], yawVelTarget, 0x200, 0x200));
    m.twirlYaw = s16(m.twirlYaw + (m.angleVel[1]));
    F.set_mario_animation(m, m.actionArg == 0 ? MARIO_ANIM_START_TWIRL : MARIO_ANIM_TWIRL);
    if (F.is_anim_past_end(m)) {
        m.actionArg = 1;
    }
    if (startTwirlYaw > m.twirlYaw) {
        play_sound(SOUND_ACTION_TWIRL, m.marioObj.gfx.cameraToObject);
    }
    update_lava_boost_or_twirling(m);
    switch (F.perform_air_step(m, 0)) {
        case AIR_STEP_LANDED:
            F.set_mario_action(m, ACT_TWIRL_LAND, 0);
            break;
        case AIR_STEP_HIT_WALL:
            F.mario_bonk_reflection(m, false);
            break;
        case AIR_STEP_HIT_LAVA_WALL:
            lava_boost_on_wall(m);
            break;
    }
    m.marioObj.gfx.angle[1] = s16(m.marioObj.gfx.angle[1] + (m.twirlYaw));
    return false;
}
function act_dive(m) {
    if (m.actionArg == 0) {
        F.play_mario_sound(m, SOUND_ACTION_THROW, SOUND_MARIO_HOOHOO);
    } else {
        F.play_mario_sound(m, SOUND_ACTION_TERRAIN_JUMP, 0);
    }
    F.set_mario_animation(m, MARIO_ANIM_DIVE);
    if (F.mario_check_object_grab(m)) {
        F.mario_grab_used_object(m);
        m.marioBodyState.grabPos = GRAB_POS_LIGHT_OBJ;
        if (m.action != ACT_DIVE) {
            return true;
        }
    }
    update_air_without_turn(m);
    switch (F.perform_air_step(m, 0)) {
        case AIR_STEP_NONE:
            if (m.vel[1] < 0.0 && m.faceAngle[0] > -0x2AAA) {
                m.faceAngle[0] = s16(m.faceAngle[0] - (0x200));
                if (m.faceAngle[0] < -0x2AAA) {
                    m.faceAngle[0] = s16(-0x2AAA);
                }
            }
            m.marioObj.gfx.angle[0] = s16(-m.faceAngle[0]);
            break;
        case AIR_STEP_LANDED:
            if (should_get_stuck_in_ground(m) && m.faceAngle[0] == -0x2AAA) {
                play_sound(SOUND_MARIO_OOOF2, m.marioObj.gfx.cameraToObject);
                m.particleFlags |= PARTICLE_MIST_CIRCLE;
                F.drop_and_set_mario_action(m, ACT_HEAD_STUCK_IN_GROUND, 0);
            } else if (!check_fall_damage(m, ACT_HARD_FORWARD_GROUND_KB)) {
                if (m.heldObj == null) {
                    F.set_mario_action(m, ACT_DIVE_SLIDE, 0);
                } else {
                    F.set_mario_action(m, ACT_DIVE_PICKING_UP, 0);
                }
            }
            m.faceAngle[0] = s16(0);
            break;
        case AIR_STEP_HIT_WALL:
            F.mario_bonk_reflection(m, true);
            m.faceAngle[0] = s16(0);
            if (m.vel[1] > 0.0) {
                m.vel[1] = 0.0;
            }
            m.particleFlags |= PARTICLE_VERTICAL_STAR;
            F.drop_and_set_mario_action(m, ACT_BACKWARD_AIR_KB, 0);
            break;
        case AIR_STEP_HIT_LAVA_WALL:
            lava_boost_on_wall(m);
            break;
    }
    return false;
}
function act_air_throw(m) {
    if (++(m.actionTimer) == 4) {
        F.mario_throw_held_object(m);
    }
    F.play_sound_if_no_flag(m, SOUND_MARIO_WAH2, MARIO_MARIO_SOUND_PLAYED);
    F.set_mario_animation(m, MARIO_ANIM_THROW_LIGHT_OBJECT);
    update_air_without_turn(m);
    switch (F.perform_air_step(m, 0)) {
        case AIR_STEP_LANDED:
            if (!check_fall_damage_or_get_stuck(m, ACT_HARD_BACKWARD_GROUND_KB)) {
                m.action = ACT_AIR_THROW_LAND;
            }
            break;
        case AIR_STEP_HIT_WALL:
            F.mario_set_forward_vel(m, 0.0);
            break;
        case AIR_STEP_HIT_LAVA_WALL:
            lava_boost_on_wall(m);
            break;
    }
    return false;
}
function act_water_jump(m) {
    if (m.forwardVel < 15.0) {
        F.mario_set_forward_vel(m, 15.0);
    }
    F.play_mario_sound(m, SOUND_ACTION_UNKNOWN432, 0);
    F.set_mario_animation(m, MARIO_ANIM_SINGLE_JUMP);
    switch (F.perform_air_step(m, AIR_STEP_CHECK_LEDGE_GRAB)) {
        case AIR_STEP_LANDED:
            F.set_mario_action(m, ACT_JUMP_LAND, 0);
            F.set_camera_mode(m.area.camera, m.area.camera.defMode, 1);
            break;
        case AIR_STEP_HIT_WALL:
            F.mario_set_forward_vel(m, 15.0);
            break;
        case AIR_STEP_GRABBED_LEDGE:
            F.set_mario_animation(m, MARIO_ANIM_IDLE_ON_LEDGE);
            F.set_mario_action(m, ACT_LEDGE_GRAB, 0);
            F.set_camera_mode(m.area.camera, m.area.camera.defMode, 1);
            break;
        case AIR_STEP_HIT_LAVA_WALL:
            lava_boost_on_wall(m);
            break;
    }
    return false;
}
function act_hold_water_jump(m) {
    if (m.marioObj.oInteractStatus & INT_STATUS_MARIO_DROP_OBJECT) {
        return F.drop_and_set_mario_action(m, ACT_FREEFALL, 0);
    }
    if (m.forwardVel < 15.0) {
        F.mario_set_forward_vel(m, 15.0);
    }
    F.play_mario_sound(m, SOUND_ACTION_UNKNOWN432, 0);
    F.set_mario_animation(m, MARIO_ANIM_JUMP_WITH_LIGHT_OBJ);
    switch (F.perform_air_step(m, 0)) {
        case AIR_STEP_LANDED:
            F.set_mario_action(m, ACT_HOLD_JUMP_LAND, 0);
            F.set_camera_mode(m.area.camera, m.area.camera.defMode, 1);
            break;
        case AIR_STEP_HIT_WALL:
            F.mario_set_forward_vel(m, 15.0);
            break;
        case AIR_STEP_HIT_LAVA_WALL:
            lava_boost_on_wall(m);
            break;
    }
    return false;
}
function act_steep_jump(m) {
    if (m.input & INPUT_B_PRESSED) {
        return F.set_mario_action(m, ACT_DIVE, 0);
    }
    F.play_mario_sound(m, SOUND_ACTION_TERRAIN_JUMP, 0);
    F.mario_set_forward_vel(m, 0.98 * m.forwardVel);
    switch (F.perform_air_step(m, 0)) {
        case AIR_STEP_LANDED:
            if (!check_fall_damage_or_get_stuck(m, ACT_HARD_BACKWARD_GROUND_KB)) {
                m.faceAngle[0] = s16(0);
                F.set_mario_action(m, m.forwardVel < 0.0 ? ACT_BEGIN_SLIDING : ACT_JUMP_LAND, 0);
            }
            break;
        case AIR_STEP_HIT_WALL:
            F.mario_set_forward_vel(m, 0.0);
            break;
        case AIR_STEP_HIT_LAVA_WALL:
            lava_boost_on_wall(m);
            break;
    }
    F.set_mario_animation(m, MARIO_ANIM_SINGLE_JUMP);
    m.marioObj.gfx.angle[1] = s16(m.marioObj.oMarioSteepJumpYaw);
    return false;
}
function act_ground_pound(m) {
    let stepResult = 0;
    let yOffset = 0;
    F.play_sound_if_no_flag(m, SOUND_ACTION_THROW, MARIO_ACTION_SOUND_PLAYED);
    if (m.actionState == 0) {
        if (m.actionTimer < 10) {
            yOffset = 20 - 2 * m.actionTimer;
            if (m.pos[1] + yOffset + 160.0 < m.ceilHeight) {
                m.pos[1] += yOffset;
                m.peakHeight = m.pos[1];
                vec3f_copy(m.marioObj.gfx.pos, m.pos);
            }
        }
        m.vel[1] = -50.0;
        F.mario_set_forward_vel(m, 0.0);
        F.set_mario_animation(m, m.actionArg == 0 ? MARIO_ANIM_START_GROUND_POUND : MARIO_ANIM_TRIPLE_JUMP_GROUND_POUND);
        if (m.actionTimer == 0) {
            play_sound(SOUND_ACTION_SPIN, m.marioObj.gfx.cameraToObject);
        }
        m.actionTimer++;
        if (m.actionTimer >= m.marioObj.gfx.anim.anim.loopEnd + 4) {
            play_sound(SOUND_MARIO_GROUND_POUND_WAH, m.marioObj.gfx.cameraToObject);
            m.actionState = 1;
        }
    } else {
        F.set_mario_animation(m, MARIO_ANIM_GROUND_POUND);
        stepResult = F.perform_air_step(m, 0);
        if (stepResult == AIR_STEP_LANDED) {
            if (should_get_stuck_in_ground(m)) {
                play_sound(SOUND_MARIO_OOOF2, m.marioObj.gfx.cameraToObject);
                m.particleFlags |= PARTICLE_MIST_CIRCLE;
                F.set_mario_action(m, ACT_BUTT_STUCK_IN_GROUND, 0);
            } else {
                F.play_mario_heavy_landing_sound(m, SOUND_ACTION_TERRAIN_HEAVY_LANDING);
                if (!check_fall_damage(m, ACT_HARD_BACKWARD_GROUND_KB)) {
                    m.particleFlags |= PARTICLE_MIST_CIRCLE | PARTICLE_HORIZONTAL_STAR;
                    F.set_mario_action(m, ACT_GROUND_POUND_LAND, 0);
                }
            }
            F.set_camera_shake_from_hit(SHAKE_GROUND_POUND);
        } else if (stepResult == AIR_STEP_HIT_WALL) {
            F.mario_set_forward_vel(m, -16.0);
            if (m.vel[1] > 0.0) {
                m.vel[1] = 0.0;
            }
            m.particleFlags |= PARTICLE_VERTICAL_STAR;
            F.set_mario_action(m, ACT_BACKWARD_AIR_KB, 0);
        }
    }
    return false;
}
function act_burning_jump(m) {
    F.play_mario_sound(m, SOUND_ACTION_TERRAIN_JUMP, m.actionArg == 0 ? 0 : -1);
    F.mario_set_forward_vel(m, m.forwardVel);
    if (F.perform_air_step(m, 0) == AIR_STEP_LANDED) {
        F.play_mario_landing_sound(m, SOUND_ACTION_TERRAIN_LANDING);
        F.set_mario_action(m, ACT_BURNING_GROUND, 0);
    }
    F.set_mario_animation(m, m.actionArg == 0 ? MARIO_ANIM_SINGLE_JUMP : MARIO_ANIM_FIRE_LAVA_BURN);
    m.particleFlags |= PARTICLE_FIRE;
    play_sound(SOUND_MOVING_LAVA_BURN, m.marioObj.gfx.cameraToObject);
    m.marioObj.oMarioBurnTimer += 3;
    m.health -= 10;
    if (m.health < 0x100) {
        m.health = 0xFF;
    }
    return false;
}
function act_burning_fall(m) {
    F.mario_set_forward_vel(m, m.forwardVel);
    if (F.perform_air_step(m, 0) == AIR_STEP_LANDED) {
        F.play_mario_landing_sound(m, SOUND_ACTION_TERRAIN_LANDING);
        F.set_mario_action(m, ACT_BURNING_GROUND, 0);
    }
    F.set_mario_animation(m, MARIO_ANIM_GENERAL_FALL);
    m.particleFlags |= PARTICLE_FIRE;
    m.marioObj.oMarioBurnTimer += 3;
    m.health -= 10;
    if (m.health < 0x100) {
        m.health = 0xFF;
    }
    return false;
}
function act_crazy_box_bounce(m) {
    let minSpeed = 0;
    if (m.actionTimer == 0) {
        switch (m.actionArg) {
            case 0:
                m.vel[1] = 45.0;
                minSpeed = 32.0;
                break;
            case 1:
                m.vel[1] = 60.0;
                minSpeed = 36.0;
                break;
            case 2:
                m.vel[1] = 100.0;
                minSpeed = 48.0;
                break;
        }
        play_sound(minSpeed < 40.0 ? SOUND_GENERAL_BOING1 : SOUND_GENERAL_BOING2, m.marioObj.gfx.cameraToObject);
        if (m.forwardVel < minSpeed) {
            F.mario_set_forward_vel(m, minSpeed);
        }
        m.actionTimer = 1;
    }
    F.play_mario_sound(m, SOUND_ACTION_TERRAIN_JUMP, 0);
    F.set_mario_animation(m, MARIO_ANIM_DIVE);
    update_air_without_turn(m);
    switch (F.perform_air_step(m, 0)) {
        case AIR_STEP_LANDED:
            if (m.actionArg < 2) {
                F.set_mario_action(m, ACT_CRAZY_BOX_BOUNCE, m.actionArg + 1);
            } else {
                m.heldObj.oInteractStatus = INT_STATUS_STOP_RIDING;
                m.heldObj = null;
                F.set_mario_action(m, ACT_STOMACH_SLIDE, 0);
            }
            m.particleFlags |= PARTICLE_MIST_CIRCLE;
            break;
        case AIR_STEP_HIT_WALL:
            F.mario_bonk_reflection(m, false);
            break;
        case AIR_STEP_HIT_LAVA_WALL:
            lava_boost_on_wall(m);
            break;
    }
    m.marioObj.gfx.angle[0] = s16(atan2s(m.forwardVel, -m.vel[1]));
    return false;
}
function common_air_knockback_step(m, landAction, hardFallAction, animation, speed) {
    let stepResult = 0;
    F.mario_set_forward_vel(m, speed);
    stepResult = F.perform_air_step(m, 0);
    switch (stepResult) {
        case AIR_STEP_NONE:
            F.set_mario_animation(m, animation);
            break;
        case AIR_STEP_LANDED:
            if (!check_fall_damage_or_get_stuck(m, hardFallAction)) {
                if (m.action == ACT_THROWN_FORWARD || m.action == ACT_THROWN_BACKWARD) {
                    F.set_mario_action(m, landAction, m.hurtCounter);
                } else {
                    F.set_mario_action(m, landAction, m.actionArg);
                }
            }
            break;
        case AIR_STEP_HIT_WALL:
            F.set_mario_animation(m, MARIO_ANIM_BACKWARD_AIR_KB);
            F.mario_bonk_reflection(m, false);
            if (m.vel[1] > 0.0) {
                m.vel[1] = 0.0;
            }
            F.mario_set_forward_vel(m, -speed);
            break;
        case AIR_STEP_HIT_LAVA_WALL:
            lava_boost_on_wall(m);
            break;
    }
    return stepResult;
}
function check_wall_kick(m) {
    if ((m.input & INPUT_A_PRESSED) && m.wallKickTimer != 0 && m.prevAction == ACT_AIR_HIT_WALL) {
        m.faceAngle[1] = s16(m.faceAngle[1] + (0x8000));
        return F.set_mario_action(m, ACT_WALL_KICK_AIR, 0);
    }
    return false;
}
function act_backward_air_kb(m) {
    if (check_wall_kick(m)) {
        return true;
    }
    play_knockback_sound(m);
    common_air_knockback_step(m, ACT_BACKWARD_GROUND_KB, ACT_HARD_BACKWARD_GROUND_KB, 0x0002, -16.0);
    return false;
}
function act_forward_air_kb(m) {
    if (check_wall_kick(m)) {
        return true;
    }
    play_knockback_sound(m);
    common_air_knockback_step(m, ACT_FORWARD_GROUND_KB, ACT_HARD_FORWARD_GROUND_KB, 0x002D, 16.0);
    return false;
}
function act_hard_backward_air_kb(m) {
    play_knockback_sound(m);
    common_air_knockback_step(m, ACT_HARD_BACKWARD_GROUND_KB, ACT_HARD_BACKWARD_GROUND_KB, 0x0002, -16.0);
    return false;
}
function act_hard_forward_air_kb(m) {
    play_knockback_sound(m);
    common_air_knockback_step(m, ACT_HARD_FORWARD_GROUND_KB, ACT_HARD_FORWARD_GROUND_KB, 0x002D, 16.0);
    return false;
}
function act_thrown_backward(m) {
    let landAction = 0;
    if (m.actionArg != 0) {
        landAction = ACT_HARD_BACKWARD_GROUND_KB;
    } else {
        landAction = ACT_BACKWARD_GROUND_KB;
    }
    F.play_sound_if_no_flag(m, SOUND_MARIO_WAAAOOOW, MARIO_MARIO_SOUND_PLAYED);
    common_air_knockback_step(m, landAction, ACT_HARD_BACKWARD_GROUND_KB, 0x0002, m.forwardVel);
    m.forwardVel *= 0.98;
    return false;
}
function act_thrown_forward(m) {
    let pitch = 0;
    let landAction = 0;
    if (m.actionArg != 0) {
        landAction = ACT_HARD_FORWARD_GROUND_KB;
    } else {
        landAction = ACT_FORWARD_GROUND_KB;
    }
    F.play_sound_if_no_flag(m, SOUND_MARIO_WAAAOOOW, MARIO_MARIO_SOUND_PLAYED);
    if (common_air_knockback_step(m, landAction, ACT_HARD_FORWARD_GROUND_KB, 0x002D, m.forwardVel) == AIR_STEP_NONE) {
        pitch = s16(atan2s(m.forwardVel, -m.vel[1]));
        if (pitch > 0x1800) {
            pitch = s16(0x1800);
        }
        m.marioObj.gfx.angle[0] = s16(pitch + 0x1800);
    }
    m.forwardVel *= 0.98;
    return false;
}
function act_soft_bonk(m) {
    if (check_wall_kick(m)) {
        return true;
    }
    play_knockback_sound(m);
    common_air_knockback_step(m, ACT_FREEFALL_LAND, ACT_HARD_BACKWARD_GROUND_KB, 0x0056, m.forwardVel);
    return false;
}
function act_getting_blown(m) {
    if (m.actionState == 0) {
        if (m.forwardVel > -60.0) {
            m.forwardVel -= 6.0;
        } else {
            m.actionState = 1;
        }
    } else {
        if (m.forwardVel < -16.0) {
            m.forwardVel += 0.8;
        }
        if (m.vel[1] < 0.0 && m.gettingBlownGravity < 4.0) {
            m.gettingBlownGravity += 0.05;
        }
    }
    if (++(m.actionTimer) == 20) {
        F.mario_blow_off_cap(m, 50.0);
    }
    F.mario_set_forward_vel(m, m.forwardVel);
    F.set_mario_animation(m, MARIO_ANIM_BACKWARD_AIR_KB);
    switch (F.perform_air_step(m, 0)) {
        case AIR_STEP_LANDED:
            F.set_mario_action(m, ACT_HARD_BACKWARD_AIR_KB, 0);
            break;
        case AIR_STEP_HIT_WALL:
            F.set_mario_animation(m, MARIO_ANIM_AIR_FORWARD_KB);
            F.mario_bonk_reflection(m, false);
            if (m.vel[1] > 0.0) {
                m.vel[1] = 0.0;
            }
            F.mario_set_forward_vel(m, -m.forwardVel);
            break;
    }
    return false;
}
function act_air_hit_wall(m) {
    if (m.heldObj != null) {
        F.mario_drop_held_object(m);
    }
    if (++(m.actionTimer) <= 2) {
        if (m.input & INPUT_A_PRESSED) {
            m.vel[1] = 52.0;
            m.faceAngle[1] = s16(m.faceAngle[1] + (0x8000));
            return F.set_mario_action(m, ACT_WALL_KICK_AIR, 0);
        }
    } else if (m.forwardVel >= 38.0) {
        m.wallKickTimer = 5;
        if (m.vel[1] > 0.0) {
            m.vel[1] = 0.0;
        }
        m.particleFlags |= PARTICLE_VERTICAL_STAR;
        return F.set_mario_action(m, ACT_BACKWARD_AIR_KB, 0);
    } else {
        m.wallKickTimer = 5;
        if (m.vel[1] > 0.0) {
            m.vel[1] = 0.0;
        }
        if (m.forwardVel > 8.0) {
            F.mario_set_forward_vel(m, -8.0);
        }
        return F.set_mario_action(m, ACT_SOFT_BONK, 0);
    }
    F.set_mario_animation(m, MARIO_ANIM_START_WALLKICK);
}
function act_forward_rollout(m) {
    if (m.actionState == 0) {
        m.vel[1] = 30.0;
        m.actionState = 1;
    }
    F.play_mario_sound(m, SOUND_ACTION_TERRAIN_JUMP, 0);
    update_air_without_turn(m);
    switch (F.perform_air_step(m, 0)) {
        case AIR_STEP_NONE:
            if (m.actionState == 1) {
                if (F.set_mario_animation(m, MARIO_ANIM_FORWARD_SPINNING) == 4) {
                    play_sound(SOUND_ACTION_SPIN, m.marioObj.gfx.cameraToObject);
                }
            } else {
                F.set_mario_animation(m, MARIO_ANIM_GENERAL_FALL);
            }
            break;
        case AIR_STEP_LANDED:
            F.set_mario_action(m, ACT_FREEFALL_LAND_STOP, 0);
            F.play_mario_landing_sound(m, SOUND_ACTION_TERRAIN_LANDING);
            break;
        case AIR_STEP_HIT_WALL:
            F.mario_set_forward_vel(m, 0.0);
            break;
        case AIR_STEP_HIT_LAVA_WALL:
            lava_boost_on_wall(m);
            break;
    }
    if (m.actionState == 1 && F.is_anim_past_end(m)) {
        m.actionState = 2;
    }
    return false;
}
function act_backward_rollout(m) {
    if (m.actionState == 0) {
        m.vel[1] = 30.0;
        m.actionState = 1;
    }
    F.play_mario_sound(m, SOUND_ACTION_TERRAIN_JUMP, 0);
    update_air_without_turn(m);
    switch (F.perform_air_step(m, 0)) {
        case AIR_STEP_NONE:
            if (m.actionState == 1) {
                if (F.set_mario_animation(m, MARIO_ANIM_BACKWARD_SPINNING) == 4) {
                    play_sound(SOUND_ACTION_SPIN, m.marioObj.gfx.cameraToObject);
                }
            } else {
                F.set_mario_animation(m, MARIO_ANIM_GENERAL_FALL);
            }
            break;
        case AIR_STEP_LANDED:
            F.set_mario_action(m, ACT_FREEFALL_LAND_STOP, 0);
            F.play_mario_landing_sound(m, SOUND_ACTION_TERRAIN_LANDING);
            break;
        case AIR_STEP_HIT_WALL:
            F.mario_set_forward_vel(m, 0.0);
            break;
        case AIR_STEP_HIT_LAVA_WALL:
            lava_boost_on_wall(m);
            break;
    }
    if (m.actionState == 1 && m.marioObj.gfx.anim.frame == 2) {
        m.actionState = 2;
    }
    return false;
}
function act_butt_slide_air(m) {
    if (++(m.actionTimer) > 30 && m.pos[1] - m.floorHeight > 500.0) {
        return F.set_mario_action(m, ACT_FREEFALL, 1);
    }
    update_air_with_turn(m);
    switch (F.perform_air_step(m, 0)) {
        case AIR_STEP_LANDED:
            if (m.actionState == 0 && m.vel[1] < 0.0 && m.floor.ny >= 0.9848077) {
                m.vel[1] = -m.vel[1] / 2.0;
                m.actionState = 1;
            } else {
                F.set_mario_action(m, ACT_BUTT_SLIDE, 0);
            }
            F.play_mario_landing_sound(m, SOUND_ACTION_TERRAIN_LANDING);
            break;
        case AIR_STEP_HIT_WALL:
            if (m.vel[1] > 0.0) {
                m.vel[1] = 0.0;
            }
            m.particleFlags |= PARTICLE_VERTICAL_STAR;
            F.set_mario_action(m, ACT_BACKWARD_AIR_KB, 0);
            break;
        case AIR_STEP_HIT_LAVA_WALL:
            lava_boost_on_wall(m);
            break;
    }
    F.set_mario_animation(m, MARIO_ANIM_SLIDE);
    return false;
}
function act_hold_butt_slide_air(m) {
    if (m.marioObj.oInteractStatus & INT_STATUS_MARIO_DROP_OBJECT) {
        return F.drop_and_set_mario_action(m, ACT_HOLD_FREEFALL, 1);
    }
    if (++m.actionTimer > 30 && m.pos[1] - m.floorHeight > 500.0) {
        return F.set_mario_action(m, ACT_HOLD_FREEFALL, 1);
    }
    update_air_with_turn(m);
    switch (F.perform_air_step(m, 0)) {
        case AIR_STEP_LANDED:
            if (m.actionState == 0 && m.vel[1] < 0.0 && m.floor.ny >= 0.9848077) {
                m.vel[1] = -m.vel[1] / 2.0;
                m.actionState = 1;
            } else {
                F.set_mario_action(m, ACT_HOLD_BUTT_SLIDE, 0);
            }
            F.play_mario_landing_sound(m, SOUND_ACTION_TERRAIN_LANDING);
            break;
        case AIR_STEP_HIT_WALL:
            if (m.vel[1] > 0.0) {
                m.vel[1] = 0.0;
            }
            F.mario_drop_held_object(m);
            m.particleFlags |= PARTICLE_VERTICAL_STAR;
            F.set_mario_action(m, ACT_BACKWARD_AIR_KB, 0);
            break;
        case AIR_STEP_HIT_LAVA_WALL:
            lava_boost_on_wall(m);
            break;
    }
    F.set_mario_animation(m, MARIO_ANIM_SLIDING_ON_BOTTOM_WITH_LIGHT_OBJ);
    return false;
}
function act_lava_boost(m) {
        F.play_sound_if_no_flag(m, SOUND_MARIO_ON_FIRE, MARIO_MARIO_SOUND_PLAYED);
    if (!(m.input & INPUT_NONZERO_ANALOG)) {
        m.forwardVel = approach_f32(m.forwardVel, 0.0, 0.35, 0.35);
    }
    update_lava_boost_or_twirling(m);
    switch (F.perform_air_step(m, 0)) {
        case AIR_STEP_LANDED:
            if (m.floor.type == SURFACE_BURNING) {
                m.actionState = 0;
                if (!(m.flags & MARIO_METAL_CAP)) {
                    m.hurtCounter += (m.flags & MARIO_CAP_ON_HEAD) ? 12 : 18;
                }
                m.vel[1] = 84.0;
                play_sound(SOUND_MARIO_ON_FIRE, m.marioObj.gfx.cameraToObject);
            } else {
                F.play_mario_heavy_landing_sound(m, SOUND_ACTION_TERRAIN_BODY_HIT_GROUND);
                if (m.actionState < 2 && m.vel[1] < 0.0) {
                    m.vel[1] = -m.vel[1] * 0.4;
                    F.mario_set_forward_vel(m, m.forwardVel * 0.5);
                    m.actionState++;
                } else {
                    F.set_mario_action(m, ACT_LAVA_BOOST_LAND, 0);
                }
            }
            break;
        case AIR_STEP_HIT_WALL:
            F.mario_bonk_reflection(m, false);
            break;
        case AIR_STEP_HIT_LAVA_WALL:
            lava_boost_on_wall(m);
            break;
    }
    F.set_mario_animation(m, MARIO_ANIM_FIRE_LAVA_BURN);
    if ((m.area.terrainType & TERRAIN_MASK) != TERRAIN_SNOW && !(m.flags & MARIO_METAL_CAP) && m.vel[1] > 0.0) {
        m.particleFlags |= PARTICLE_FIRE;
        if (m.actionState == 0) {
            play_sound(SOUND_MOVING_LAVA_BURN, m.marioObj.gfx.cameraToObject);
        }
    }
    if (m.health < 0x100) {
        F.level_trigger_warp(m, WARP_OP_DEATH);
    }
    m.marioBodyState.eyeState = MARIO_EYES_DEAD;
    return false;
}
function act_slide_kick(m) {
    if (m.actionState == 0 && m.actionTimer == 0) {
        F.play_mario_sound(m, SOUND_ACTION_TERRAIN_JUMP, SOUND_MARIO_HOOHOO);
        F.set_mario_animation(m, MARIO_ANIM_SLIDE_KICK);
    }
    if (++(m.actionTimer) > 30 && m.pos[1] - m.floorHeight > 500.0) {
        return F.set_mario_action(m, ACT_FREEFALL, 2);
    }
    update_air_without_turn(m);
    switch (F.perform_air_step(m, 0)) {
        case AIR_STEP_NONE:
            if (m.actionState == 0) {
                m.marioObj.gfx.angle[0] = s16(atan2s(m.forwardVel, -m.vel[1]));
                if (m.marioObj.gfx.angle[0] > 0x1800) {
                    m.marioObj.gfx.angle[0] = s16(0x1800);
                }
            }
            break;
        case AIR_STEP_LANDED:
            if (m.actionState == 0 && m.vel[1] < 0.0) {
                m.vel[1] = -m.vel[1] / 2.0;
                m.actionState = 1;
                m.actionTimer = 0;
            } else {
                F.set_mario_action(m, ACT_SLIDE_KICK_SLIDE, 0);
            }
            F.play_mario_landing_sound(m, SOUND_ACTION_TERRAIN_LANDING);
            break;
        case AIR_STEP_HIT_WALL:
            if (m.vel[1] > 0.0) {
                m.vel[1] = 0.0;
            }
            m.particleFlags |= PARTICLE_VERTICAL_STAR;
            F.set_mario_action(m, ACT_BACKWARD_AIR_KB, 0);
            break;
        case AIR_STEP_HIT_LAVA_WALL:
            lava_boost_on_wall(m);
            break;
    }
    return false;
}
function act_jump_kick(m) {
    let animFrame = 0;
    if (m.actionState == 0) {
        F.play_sound_if_no_flag(m, SOUND_MARIO_PUNCH_HOO, MARIO_ACTION_SOUND_PLAYED);
        m.marioObj.gfx.anim.id = -1;
        F.set_mario_animation(m, MARIO_ANIM_AIR_KICK);
        m.actionState = 1;
    }
    animFrame = m.marioObj.gfx.anim.frame;
    if (animFrame == 0) {
        m.marioBodyState.punchState = (2 << 6) | 6;
    }
    if (animFrame >= 0 && animFrame < 8) {
        m.flags |= MARIO_KICKING;
    }
    update_air_without_turn(m);
    switch (F.perform_air_step(m, 0)) {
        case AIR_STEP_LANDED:
            if (!check_fall_damage_or_get_stuck(m, ACT_HARD_BACKWARD_GROUND_KB)) {
                F.set_mario_action(m, ACT_FREEFALL_LAND, 0);
            }
            break;
        case AIR_STEP_HIT_WALL:
            F.mario_set_forward_vel(m, 0.0);
            break;
    }
    return false;
}
function act_shot_from_cannon(m) {
    if (m.area.camera.mode != CAMERA_MODE_BEHIND_MARIO) {
        m.statusForCamera.cameraEvent = CAM_EVENT_SHOT_FROM_CANNON;
    }
    F.mario_set_forward_vel(m, m.forwardVel);
    F.play_sound_if_no_flag(m, SOUND_MARIO_YAHOO, MARIO_MARIO_SOUND_PLAYED);
    switch (F.perform_air_step(m, 0)) {
        case AIR_STEP_NONE:
            F.set_mario_animation(m, MARIO_ANIM_AIRBORNE_ON_STOMACH);
            m.faceAngle[0] = s16(atan2s(m.forwardVel, m.vel[1]));
            m.marioObj.gfx.angle[0] = s16(-m.faceAngle[0]);
            break;
        case AIR_STEP_LANDED:
            F.set_mario_action(m, ACT_DIVE_SLIDE, 0);
            m.faceAngle[0] = s16(0);
            F.set_camera_mode(m.area.camera, m.area.camera.defMode, 1);
            break;
        case AIR_STEP_HIT_WALL:
            F.mario_set_forward_vel(m, -16.0);
            m.faceAngle[0] = s16(0);
            if (m.vel[1] > 0.0) {
                m.vel[1] = 0.0;
            }
            m.particleFlags |= PARTICLE_VERTICAL_STAR;
            F.set_mario_action(m, ACT_BACKWARD_AIR_KB, 0);
            F.set_camera_mode(m.area.camera, m.area.camera.defMode, 1);
            break;
        case AIR_STEP_HIT_LAVA_WALL:
            lava_boost_on_wall(m);
            break;
    }
    if ((m.flags & MARIO_WING_CAP) && m.vel[1] < 0.0) {
        F.set_mario_action(m, ACT_FLYING, 0);
    }
    if ((m.forwardVel -= 0.05) < 10.0) {
        F.mario_set_forward_vel(m, 10.0);
    }
    if (m.vel[1] > 0.0) {
        m.particleFlags |= PARTICLE_DUST;
    }
    return false;
}
function act_flying(m) {
    let startPitch = s16(m.faceAngle[0]);
    if (m.input & INPUT_Z_PRESSED) {
        if (m.area.camera.mode == CAMERA_MODE_BEHIND_MARIO) {
            F.set_camera_mode(m.area.camera, m.area.camera.defMode, 1);
        }
        return F.set_mario_action(m, ACT_GROUND_POUND, 1);
    }
    if (!(m.flags & MARIO_WING_CAP)) {
        if (m.area.camera.mode == CAMERA_MODE_BEHIND_MARIO) {
            F.set_camera_mode(m.area.camera, m.area.camera.defMode, 1);
        }
        return F.set_mario_action(m, ACT_FREEFALL, 0);
    }
    if (m.area.camera.mode != CAMERA_MODE_BEHIND_MARIO) {
        F.set_camera_mode(m.area.camera, CAMERA_MODE_BEHIND_MARIO, 1);
    }
    if (m.actionState == 0) {
        if (m.actionArg == 0) {
            F.set_mario_animation(m, MARIO_ANIM_FLY_FROM_CANNON);
        } else {
            F.set_mario_animation(m, MARIO_ANIM_FORWARD_SPINNING_FLIP);
            if (m.marioObj.gfx.anim.frame == 1) {
                play_sound(SOUND_ACTION_SPIN, m.marioObj.gfx.cameraToObject);
            }
        }
        if (F.is_anim_at_end(m)) {
            if (m.actionArg == 2) {
                F.load_level_init_text(0);
                m.actionArg = 1;
            }
            F.set_mario_animation(m, MARIO_ANIM_WING_CAP_FLY);
            m.actionState = 1;
        }
    }
    update_flying(m);
    switch (F.perform_air_step(m, 0)) {
        case AIR_STEP_NONE:
            m.marioObj.gfx.angle[0] = s16(-m.faceAngle[0]);
            m.marioObj.gfx.angle[2] = s16(m.faceAngle[2]);
            m.actionTimer = 0;
            break;
        case AIR_STEP_LANDED:
            F.set_mario_action(m, ACT_DIVE_SLIDE, 0);
            F.set_mario_animation(m, MARIO_ANIM_DIVE);
            F.set_anim_to_frame(m, 7);
            m.faceAngle[0] = s16(0);
            F.set_camera_mode(m.area.camera, m.area.camera.defMode, 1);
            break;
        case AIR_STEP_HIT_WALL:
            if (m.wall != null) {
                F.mario_set_forward_vel(m, -16.0);
                m.faceAngle[0] = s16(0);
                if (m.vel[1] > 0.0) {
                    m.vel[1] = 0.0;
                }
                play_sound((m.flags & MARIO_METAL_CAP) ? SOUND_ACTION_METAL_BONK : SOUND_ACTION_BONK, m.marioObj.gfx.cameraToObject);
                m.particleFlags |= PARTICLE_VERTICAL_STAR;
                F.set_mario_action(m, ACT_BACKWARD_AIR_KB, 0);
                F.set_camera_mode(m.area.camera, m.area.camera.defMode, 1);
            } else {
                if (m.actionTimer++ == 0) {
                    play_sound(SOUND_ACTION_HIT, m.marioObj.gfx.cameraToObject);
                }
                if (m.actionTimer == 30) {
                    m.actionTimer = 0;
                }
                m.faceAngle[0] = s16(m.faceAngle[0] - (0x200));
                if (m.faceAngle[0] < -0x2AAA) {
                    m.faceAngle[0] = s16(-0x2AAA);
                }
                m.marioObj.gfx.angle[0] = s16(-m.faceAngle[0]);
                m.marioObj.gfx.angle[2] = s16(m.faceAngle[2]);
            }
            break;
        case AIR_STEP_HIT_LAVA_WALL:
            lava_boost_on_wall(m);
            break;
    }
    if (m.faceAngle[0] > 0x800 && m.forwardVel >= 48.0) {
        m.particleFlags |= PARTICLE_DUST;
    }
    if (startPitch <= 0 && m.faceAngle[0] > 0 && m.forwardVel >= 48.0) {
        play_sound(SOUND_ACTION_FLYING_FAST, m.marioObj.gfx.cameraToObject);
        play_sound(SOUND_MARIO_YAHOO_WAHA_YIPPEE + ((W.gAudioRandom % 5) << 16), m.marioObj.gfx.cameraToObject);
    }
    play_sound(SOUND_MOVING_FLYING, m.marioObj.gfx.cameraToObject);
    F.adjust_sound_for_speed(m);
    return false;
}
function act_riding_hoot(m) {
    if (!(m.input & INPUT_A_DOWN) || (m.marioObj.oInteractStatus & INT_STATUS_MARIO_UNK7)) {
        m.usedObj.oInteractStatus = 0;
        m.usedObj.oHootMarioReleaseTime = W.gGlobalTimer;
        F.play_sound_if_no_flag(m, SOUND_MARIO_UH, MARIO_MARIO_SOUND_PLAYED);
        return F.set_mario_action(m, ACT_FREEFALL, 0);
    }
    m.pos[0] = m.usedObj.oPosX;
    m.pos[1] = m.usedObj.oPosY - 92.5;
    m.pos[2] = m.usedObj.oPosZ;
    m.faceAngle[1] = s16(0x4000 - m.usedObj.oMoveAngleYaw);
    if (m.actionState == 0) {
        F.set_mario_animation(m, MARIO_ANIM_HANG_ON_CEILING);
        if (F.is_anim_at_end(m)) {
            F.set_mario_animation(m, MARIO_ANIM_HANG_ON_OWL);
            m.actionState = 1;
        }
    }
    vec3f_set(m.vel, 0.0, 0.0, 0.0);
    vec3f_set(m.marioObj.gfx.pos, m.pos[0], m.pos[1], m.pos[2]);
    vec3s_set(m.marioObj.gfx.angle, 0, 0x4000 - m.faceAngle[1], 0);
    return false;
}
function act_flying_triple_jump(m) {
    if (m.input & (INPUT_B_PRESSED | INPUT_Z_PRESSED)) {
        if (m.area.camera.mode == CAMERA_MODE_BEHIND_MARIO) {
            F.set_camera_mode(m.area.camera, m.area.camera.defMode, 1);
        }
        if (m.input & INPUT_B_PRESSED) {
            return F.set_mario_action(m, ACT_DIVE, 0);
        } else {
            return F.set_mario_action(m, ACT_GROUND_POUND, 0);
        }
    }
    F.play_mario_sound(m, SOUND_ACTION_TERRAIN_JUMP, SOUND_MARIO_YAHOO);
    if (m.actionState == 0) {
        F.set_mario_animation(m, MARIO_ANIM_TRIPLE_JUMP_FLY);
        if (m.marioObj.gfx.anim.frame == 7) {
            play_sound(SOUND_ACTION_SPIN, m.marioObj.gfx.cameraToObject);
        }
        if (F.is_anim_past_end(m)) {
            F.set_mario_animation(m, MARIO_ANIM_FORWARD_SPINNING);
            m.actionState = 1;
        }
    }
    if (m.actionState == 1 && m.marioObj.gfx.anim.frame == 1) {
        play_sound(SOUND_ACTION_SPIN, m.marioObj.gfx.cameraToObject);
    }
    if (m.vel[1] < 4.0) {
        if (m.area.camera.mode != CAMERA_MODE_BEHIND_MARIO) {
            F.set_camera_mode(m.area.camera, CAMERA_MODE_BEHIND_MARIO, 1);
        }
        if (m.forwardVel < 32.0) {
            F.mario_set_forward_vel(m, 32.0);
        }
        F.set_mario_action(m, ACT_FLYING, 1);
    }
    if (m.actionTimer++ == 10 && m.area.camera.mode != CAMERA_MODE_BEHIND_MARIO) {
        F.set_camera_mode(m.area.camera, CAMERA_MODE_BEHIND_MARIO, 1);
    }
    update_air_without_turn(m);
    switch (F.perform_air_step(m, 0)) {
        case AIR_STEP_LANDED:
            if (!check_fall_damage_or_get_stuck(m, ACT_HARD_BACKWARD_GROUND_KB)) {
                F.set_mario_action(m, ACT_DOUBLE_JUMP_LAND, 0);
            }
            break;
        case AIR_STEP_HIT_WALL:
            F.mario_bonk_reflection(m, false);
            break;
        case AIR_STEP_HIT_LAVA_WALL:
            lava_boost_on_wall(m);
            break;
    }
    return false;
}
function act_top_of_pole_jump(m) {
    F.play_mario_jump_sound(m);
    common_air_action_step(m, ACT_FREEFALL_LAND, MARIO_ANIM_HANDSTAND_JUMP, AIR_STEP_CHECK_LEDGE_GRAB);
    return false;
}
function act_vertical_wind(m) {
    let intendedDYaw = s16(m.intendedYaw - m.faceAngle[1]);
    let intendedMag = m.intendedMag / 32.0;
    F.play_sound_if_no_flag(m, SOUND_MARIO_HERE_WE_GO, MARIO_MARIO_SOUND_PLAYED);
    if (m.actionState == 0) {
        F.set_mario_animation(m, MARIO_ANIM_FORWARD_SPINNING_FLIP);
        if (m.marioObj.gfx.anim.frame == 1) {
            play_sound(SOUND_ACTION_SPIN, m.marioObj.gfx.cameraToObject);
        }
        if (F.is_anim_past_end(m)) {
            m.actionState = 1;
        }
    } else {
        F.set_mario_animation(m, MARIO_ANIM_AIRBORNE_ON_STOMACH);
    }
    update_air_without_turn(m);
    switch (F.perform_air_step(m, 0)) {
        case AIR_STEP_LANDED:
            F.set_mario_action(m, ACT_DIVE_SLIDE, 0);
            break;
        case AIR_STEP_HIT_WALL:
            F.mario_set_forward_vel(m, -16.0);
            break;
    }
    m.marioObj.gfx.angle[0] = s16(s16((6144.0 * intendedMag * coss(intendedDYaw))));
    m.marioObj.gfx.angle[2] = s16(s16((-4096.0 * intendedMag * sins(intendedDYaw))));
    return false;
}
function act_special_triple_jump(m) {
    if (m.input & INPUT_B_PRESSED) {
        return F.set_mario_action(m, ACT_DIVE, 0);
    }
    if (m.input & INPUT_Z_PRESSED) {
        return F.set_mario_action(m, ACT_GROUND_POUND, 0);
    }
    F.play_mario_sound(m, SOUND_ACTION_TERRAIN_JUMP, SOUND_MARIO_YAHOO);
    update_air_without_turn(m);
    switch (F.perform_air_step(m, 0)) {
        case AIR_STEP_LANDED:
            if (m.actionState++ == 0) {
                m.vel[1] = 42.0;
            } else {
                F.set_mario_action(m, ACT_FREEFALL_LAND_STOP, 0);
            }
            F.play_mario_landing_sound(m, SOUND_ACTION_TERRAIN_LANDING);
            break;
        case AIR_STEP_HIT_WALL:
            F.mario_bonk_reflection(m, true);
            break;
    }
    if (m.actionState == 0 || m.vel[1] > 0.0) {
        if (F.set_mario_animation(m, MARIO_ANIM_FORWARD_SPINNING) == 0) {
            play_sound(SOUND_ACTION_SPIN, m.marioObj.gfx.cameraToObject);
        }
    } else {
        F.set_mario_animation(m, MARIO_ANIM_GENERAL_FALL);
    }
    m.particleFlags |= PARTICLE_SPARKLES;
    return false;
}
function check_common_airborne_cancels(m) {
    if (m.pos[1] < m.waterLevel - 100) {
        return F.set_water_plunge_action(m);
    }
    if (m.input & INPUT_SQUISHED) {
        return F.drop_and_set_mario_action(m, ACT_SQUISHED, 0);
    }
    if (m.floor.type == SURFACE_VERTICAL_WIND && (m.action & ACT_FLAG_ALLOW_VERTICAL_WIND_ACTION)) {
        return F.drop_and_set_mario_action(m, ACT_VERTICAL_WIND, 0);
    }
    m.quicksandDepth = 0.0;
    return false;
}
function mario_execute_airborne_action(m) {
    let cancel = 0;
    if (check_common_airborne_cancels(m)) {
        return true;
    }
    play_far_fall_sound(m);
    switch (m.action) {
        case ACT_JUMP:                 cancel = act_jump(m);                 break;
        case ACT_DOUBLE_JUMP:          cancel = act_double_jump(m);          break;
        case ACT_FREEFALL:             cancel = act_freefall(m);             break;
        case ACT_HOLD_JUMP:            cancel = act_hold_jump(m);            break;
        case ACT_HOLD_FREEFALL:        cancel = act_hold_freefall(m);        break;
        case ACT_SIDE_FLIP:            cancel = act_side_flip(m);            break;
        case ACT_WALL_KICK_AIR:        cancel = act_wall_kick_air(m);        break;
        case ACT_TWIRLING:             cancel = act_twirling(m);             break;
        case ACT_WATER_JUMP:           cancel = act_water_jump(m);           break;
        case ACT_HOLD_WATER_JUMP:      cancel = act_hold_water_jump(m);      break;
        case ACT_STEEP_JUMP:           cancel = act_steep_jump(m);           break;
        case ACT_BURNING_JUMP:         cancel = act_burning_jump(m);         break;
        case ACT_BURNING_FALL:         cancel = act_burning_fall(m);         break;
        case ACT_TRIPLE_JUMP:          cancel = act_triple_jump(m);          break;
        case ACT_BACKFLIP:             cancel = act_backflip(m);             break;
        case ACT_LONG_JUMP:            cancel = act_long_jump(m);            break;
        case ACT_RIDING_SHELL_JUMP:
        case ACT_RIDING_SHELL_FALL:    cancel = act_riding_shell_air(m);     break;
        case ACT_DIVE:                 cancel = act_dive(m);                 break;
        case ACT_AIR_THROW:            cancel = act_air_throw(m);            break;
        case ACT_BACKWARD_AIR_KB:      cancel = act_backward_air_kb(m);      break;
        case ACT_FORWARD_AIR_KB:       cancel = act_forward_air_kb(m);       break;
        case ACT_HARD_FORWARD_AIR_KB:  cancel = act_hard_forward_air_kb(m);  break;
        case ACT_HARD_BACKWARD_AIR_KB: cancel = act_hard_backward_air_kb(m); break;
        case ACT_SOFT_BONK:            cancel = act_soft_bonk(m);            break;
        case ACT_AIR_HIT_WALL:         cancel = act_air_hit_wall(m);         break;
        case ACT_FORWARD_ROLLOUT:      cancel = act_forward_rollout(m);      break;
        case ACT_SHOT_FROM_CANNON:     cancel = act_shot_from_cannon(m);     break;
        case ACT_BUTT_SLIDE_AIR:       cancel = act_butt_slide_air(m);       break;
        case ACT_HOLD_BUTT_SLIDE_AIR:  cancel = act_hold_butt_slide_air(m);  break;
        case ACT_LAVA_BOOST:           cancel = act_lava_boost(m);           break;
        case ACT_GETTING_BLOWN:        cancel = act_getting_blown(m);        break;
        case ACT_BACKWARD_ROLLOUT:     cancel = act_backward_rollout(m);     break;
        case ACT_CRAZY_BOX_BOUNCE:     cancel = act_crazy_box_bounce(m);     break;
        case ACT_SPECIAL_TRIPLE_JUMP:  cancel = act_special_triple_jump(m);  break;
        case ACT_GROUND_POUND:         cancel = act_ground_pound(m);         break;
        case ACT_THROWN_FORWARD:       cancel = act_thrown_forward(m);       break;
        case ACT_THROWN_BACKWARD:      cancel = act_thrown_backward(m);      break;
        case ACT_FLYING_TRIPLE_JUMP:   cancel = act_flying_triple_jump(m);   break;
        case ACT_SLIDE_KICK:           cancel = act_slide_kick(m);           break;
        case ACT_JUMP_KICK:            cancel = act_jump_kick(m);            break;
        case ACT_FLYING:               cancel = act_flying(m);               break;
        case ACT_RIDING_HOOT:          cancel = act_riding_hoot(m);          break;
        case ACT_TOP_OF_POLE_JUMP:     cancel = act_top_of_pole_jump(m);     break;
        case ACT_VERTICAL_WIND:        cancel = act_vertical_wind(m);        break;
    }
    return cancel;
}

Object.assign(F, { play_flip_sounds, play_far_fall_sound, play_knockback_sound, lava_boost_on_wall, check_fall_damage, check_kick_or_dive_in_air, should_get_stuck_in_ground, check_fall_damage_or_get_stuck, check_horizontal_wind, update_air_with_turn, update_air_without_turn, update_lava_boost_or_twirling, update_flying_yaw, update_flying_pitch, update_flying, common_air_action_step, act_jump, act_double_jump, act_triple_jump, act_backflip, act_freefall, act_hold_jump, act_hold_freefall, act_side_flip, act_wall_kick_air, act_long_jump, act_riding_shell_air, act_twirling, act_dive, act_air_throw, act_water_jump, act_hold_water_jump, act_steep_jump, act_ground_pound, act_burning_jump, act_burning_fall, act_crazy_box_bounce, common_air_knockback_step, check_wall_kick, act_backward_air_kb, act_forward_air_kb, act_hard_backward_air_kb, act_hard_forward_air_kb, act_thrown_backward, act_thrown_forward, act_soft_bonk, act_getting_blown, act_air_hit_wall, act_forward_rollout, act_backward_rollout, act_butt_slide_air, act_hold_butt_slide_air, act_lava_boost, act_slide_kick, act_jump_kick, act_shot_from_cannon, act_flying, act_riding_hoot, act_flying_triple_jump, act_top_of_pole_jump, act_vertical_wind, act_special_triple_jump, check_common_airborne_cancels, mario_execute_airborne_action });

})(window);

/* Mario holding things: ported from the Super Mario 64 decompilation (github.com/n64decomp/sm64): src/game/mario_actions_object.c */
(function (root) {
'use strict';
const SM64 = root.SM64, F = SM64.F = SM64.F || {}, W = SM64.W = SM64.W || {}, B = SM64.B = SM64.B || {};
const { s16, s8, sins, coss, atan2s, sqr, approach_f32, approach_s32, max, min, abs, REF, REFA, REFV } = SM64.m;
/*CONSTS*/
const { ACT_BEGIN_SLIDING, ACT_CROUCHING, ACT_CROUCH_SLIDE, ACT_DIVE_PICKING_UP, ACT_FLAG_MOVING, ACT_FREEFALL, 
  ACT_HEAVY_THROW, ACT_HOLDING_BOWSER, ACT_HOLD_HEAVY_IDLE, ACT_HOLD_IDLE, ACT_IDLE, ACT_JUMP_KICK, ACT_PICKING_UP, 
  ACT_PICKING_UP_BOWSER, ACT_PLACING_DOWN, ACT_PUNCHING, ACT_RELEASING_BOWSER, ACT_SHOCKWAVE_BOUNCE, ACT_SQUISHED, 
  ACT_STANDING_DEATH, ACT_STOMACH_SLIDE_STOP, ACT_THROWING, ACT_WALKING, GRAB_POS_BOWSER, GRAB_POS_HEAVY_OBJ, 
  GRAB_POS_LIGHT_OBJ, INPUT_ABOVE_SLIDE, INPUT_A_DOWN, INPUT_A_PRESSED, INPUT_B_PRESSED, INPUT_IN_WATER, 
  INPUT_NONZERO_ANALOG, INPUT_OFF_FLOOR, INPUT_SQUISHED, INPUT_STOMPED, INT_SUBTYPE_GRABS_MARIO, 
  INT_SUBTYPE_HOLDABLE_NPC, MARIO_ACTION_SOUND_PLAYED, MARIO_ANIM_BREAKDANCE, MARIO_ANIM_FIRST_PUNCH, 
  MARIO_ANIM_FIRST_PUNCH_FAST, MARIO_ANIM_GRAB_BOWSER, MARIO_ANIM_GRAB_HEAVY_OBJECT, MARIO_ANIM_GROUND_KICK, 
  MARIO_ANIM_GROUND_THROW, MARIO_ANIM_HEAVY_THROW, MARIO_ANIM_HOLDING_BOWSER, MARIO_ANIM_PICK_UP_LIGHT_OBJ, 
  MARIO_ANIM_PLACE_LIGHT_OBJ, MARIO_ANIM_RELEASE_BOWSER, MARIO_ANIM_SECOND_PUNCH, MARIO_ANIM_SECOND_PUNCH_FAST, 
  MARIO_ANIM_SLOW_LAND_FROM_DIVE, MARIO_ANIM_STOP_SLIDE_LIGHT_OBJ, MARIO_ANIM_SWINGING_BOWSER, MARIO_KICKING, 
  MARIO_MARIO_SOUND_PLAYED, MARIO_PUNCHING, MARIO_TRIPPING, PARTICLE_IDLE_WATER_WAVE, SOUND_ACTION_THROW, 
  SOUND_MARIO_HERE_WE_GO, SOUND_MARIO_HRMM, SOUND_MARIO_PUNCH_HOO, SOUND_MARIO_PUNCH_WAH, SOUND_MARIO_PUNCH_YAH, 
  SOUND_MARIO_SO_LONGA_BOWSER, SOUND_MARIO_WAH2, SOUND_OBJ_BOWSER_SPINNING } = SM64.C;
/*END CONSTS*/

let sPunchingForwardVelocities = [0, 1, 1, 2, 3, 5, 7, 10];
function animated_stationary_ground_step(m, animation, endAction) {
    F.stationary_ground_step(m);
    F.set_mario_animation(m, animation);
    if (F.is_anim_at_end(m)) {
        F.set_mario_action(m, endAction, 0);
    }
}
function mario_update_punch_sequence(m) {
    let endAction = 0, crouchEndAction = 0;
    let animFrame = 0;
    if (m.action & ACT_FLAG_MOVING) {
        endAction = ACT_WALKING, crouchEndAction = ACT_CROUCH_SLIDE;
    } else {
        endAction = ACT_IDLE, crouchEndAction = ACT_CROUCHING;
    }
    switch (m.actionArg) {
        case 0:
            play_sound(SOUND_MARIO_PUNCH_YAH, m.marioObj.gfx.cameraToObject);
        case 1:
            F.set_mario_animation(m, MARIO_ANIM_FIRST_PUNCH);
            if (F.is_anim_past_end(m)) {
                m.actionArg = 2;
            } else {
                m.actionArg = 1;
            }
            if (m.marioObj.gfx.anim.frame >= 2) {
                if (F.mario_check_object_grab(m)) {
                    return true;
                }
                m.flags |= MARIO_PUNCHING;
            }
            if (m.actionArg == 2) {
                m.marioBodyState.punchState = (0 << 6) | 4;
            }
            break;
        case 2:
            F.set_mario_animation(m, MARIO_ANIM_FIRST_PUNCH_FAST);
            if (m.marioObj.gfx.anim.frame <= 0) {
                m.flags |= MARIO_PUNCHING;
            }
            if (m.input & INPUT_B_PRESSED) {
                m.actionArg = 3;
            }
            if (F.is_anim_at_end(m)) {
                F.set_mario_action(m, endAction, 0);
            }
            break;
        case 3:
            play_sound(SOUND_MARIO_PUNCH_WAH, m.marioObj.gfx.cameraToObject);
        case 4:
            F.set_mario_animation(m, MARIO_ANIM_SECOND_PUNCH);
            if (F.is_anim_past_end(m)) {
                m.actionArg = 5;
            } else {
                m.actionArg = 4;
            }
            if (m.marioObj.gfx.anim.frame > 0) {
                m.flags |= MARIO_PUNCHING;
            }
            if (m.actionArg == 5) {
                m.marioBodyState.punchState = (1 << 6) | 4;
            }
            break;
        case 5:
            F.set_mario_animation(m, MARIO_ANIM_SECOND_PUNCH_FAST);
            if (m.marioObj.gfx.anim.frame <= 0) {
                m.flags |= MARIO_PUNCHING;
            }
            if (m.input & INPUT_B_PRESSED) {
                m.actionArg = 6;
            }
            if (F.is_anim_at_end(m)) {
                F.set_mario_action(m, endAction, 0);
            }
            break;
        case 6:
            F.play_mario_action_sound(m, SOUND_MARIO_PUNCH_HOO, 1);
            animFrame = F.set_mario_animation(m, MARIO_ANIM_GROUND_KICK);
            if (animFrame == 0) {
                m.marioBodyState.punchState = (2 << 6) | 6;
            }
            if (animFrame >= 0 && animFrame < 8) {
                m.flags |= MARIO_KICKING;
            }
            if (F.is_anim_at_end(m)) {
                F.set_mario_action(m, endAction, 0);
            }
            break;
        case 9:
            F.play_mario_action_sound(m, SOUND_MARIO_PUNCH_HOO, 1);
            F.set_mario_animation(m, MARIO_ANIM_BREAKDANCE);
            animFrame = m.marioObj.gfx.anim.frame;
            if (animFrame >= 2 && animFrame < 8) {
                m.flags |= MARIO_TRIPPING;
            }
            if (F.is_anim_at_end(m)) {
                F.set_mario_action(m, crouchEndAction, 0);
            }
            break;
    }
    return false;
}
function act_punching(m) {
    if (m.input & INPUT_STOMPED) {
        return F.drop_and_set_mario_action(m, ACT_SHOCKWAVE_BOUNCE, 0);
    }
    if (m.input & (INPUT_NONZERO_ANALOG | INPUT_A_PRESSED | INPUT_OFF_FLOOR | INPUT_ABOVE_SLIDE)) {
        return F.check_common_action_exits(m);
    }
    if (m.actionState == 0 && (m.input & INPUT_A_DOWN)) {
        return F.set_mario_action(m, ACT_JUMP_KICK, 0);
    }
    m.actionState = 1;
    if (m.actionArg == 0) {
        m.actionTimer = 7;
    }
    F.mario_set_forward_vel(m, sPunchingForwardVelocities[m.actionTimer]);
    if (m.actionTimer > 0) {
        m.actionTimer--;
    }
    mario_update_punch_sequence(m);
    F.perform_ground_step(m);
    return false;
}
function act_picking_up(m) {
    if (m.input & INPUT_STOMPED) {
        return F.drop_and_set_mario_action(m, ACT_SHOCKWAVE_BOUNCE, 0);
    }
    if (m.input & INPUT_OFF_FLOOR) {
        return F.drop_and_set_mario_action(m, ACT_FREEFALL, 0);
    }
    if (m.actionState == 0 && F.is_anim_at_end(m)) {
        F.mario_grab_used_object(m);
        F.play_sound_if_no_flag(m, SOUND_MARIO_HRMM, MARIO_MARIO_SOUND_PLAYED);
        m.actionState = 1;
    }
    if (m.actionState == 1) {
        if (m.heldObj.oInteractionSubtype & INT_SUBTYPE_GRABS_MARIO) {
            m.marioBodyState.grabPos = GRAB_POS_HEAVY_OBJ;
            F.set_mario_animation(m, MARIO_ANIM_GRAB_HEAVY_OBJECT);
            if (F.is_anim_at_end(m)) {
                F.set_mario_action(m, ACT_HOLD_HEAVY_IDLE, 0);
            }
        } else {
            m.marioBodyState.grabPos = GRAB_POS_LIGHT_OBJ;
            F.set_mario_animation(m, MARIO_ANIM_PICK_UP_LIGHT_OBJ);
            if (F.is_anim_at_end(m)) {
                F.set_mario_action(m, ACT_HOLD_IDLE, 0);
            }
        }
    }
    F.stationary_ground_step(m);
    return false;
}
function act_dive_picking_up(m) {
    if (m.input & INPUT_STOMPED) {
        return F.drop_and_set_mario_action(m, ACT_SHOCKWAVE_BOUNCE, 0);
    }
    if (m.input & INPUT_OFF_FLOOR) {
        return F.set_mario_action(m, ACT_FREEFALL, 0);
    }
    if (m.input & INPUT_ABOVE_SLIDE) {
        return F.set_mario_action(m, ACT_BEGIN_SLIDING, 0);
    }
    animated_stationary_ground_step(m, MARIO_ANIM_STOP_SLIDE_LIGHT_OBJ, ACT_HOLD_IDLE);
    return false;
}
function act_placing_down(m) {
    if (m.input & INPUT_STOMPED) {
        return F.drop_and_set_mario_action(m, ACT_SHOCKWAVE_BOUNCE, 0);
    }
    if (m.input & INPUT_OFF_FLOOR) {
        return F.drop_and_set_mario_action(m, ACT_FREEFALL, 0);
    }
    if (++m.actionTimer == 8) {
        F.mario_drop_held_object(m);
    }
    animated_stationary_ground_step(m, MARIO_ANIM_PLACE_LIGHT_OBJ, ACT_IDLE);
    return false;
}
function act_throwing(m) {
    if (m.heldObj && (m.heldObj.oInteractionSubtype & INT_SUBTYPE_HOLDABLE_NPC)) {
        return F.set_mario_action(m, ACT_PLACING_DOWN, 0);
    }
    if (m.input & INPUT_STOMPED) {
        return F.drop_and_set_mario_action(m, ACT_SHOCKWAVE_BOUNCE, 0);
    }
    if (m.input & INPUT_OFF_FLOOR) {
        return F.drop_and_set_mario_action(m, ACT_FREEFALL, 0);
    }
    if (++m.actionTimer == 7) {
        F.mario_throw_held_object(m);
        F.play_sound_if_no_flag(m, SOUND_MARIO_WAH2, MARIO_MARIO_SOUND_PLAYED);
        F.play_sound_if_no_flag(m, SOUND_ACTION_THROW, MARIO_ACTION_SOUND_PLAYED);
    }
    animated_stationary_ground_step(m, MARIO_ANIM_GROUND_THROW, ACT_IDLE);
    return false;
}
function act_heavy_throw(m) {
    if (m.input & INPUT_STOMPED) {
        return F.drop_and_set_mario_action(m, ACT_SHOCKWAVE_BOUNCE, 0);
    }
    if (m.input & INPUT_OFF_FLOOR) {
        return F.drop_and_set_mario_action(m, ACT_FREEFALL, 0);
    }
    if (++m.actionTimer == 13) {
        F.mario_drop_held_object(m);
        F.play_sound_if_no_flag(m, SOUND_MARIO_WAH2, MARIO_MARIO_SOUND_PLAYED);
        F.play_sound_if_no_flag(m, SOUND_ACTION_THROW, MARIO_ACTION_SOUND_PLAYED);
    }
    animated_stationary_ground_step(m, MARIO_ANIM_HEAVY_THROW, ACT_IDLE);
    return false;
}
function act_stomach_slide_stop(m) {
    if (m.input & INPUT_STOMPED) {
        return F.set_mario_action(m, ACT_SHOCKWAVE_BOUNCE, 0);
    }
    if (m.input & INPUT_OFF_FLOOR) {
        return F.set_mario_action(m, ACT_FREEFALL, 0);
    }
    if (m.input & INPUT_ABOVE_SLIDE) {
        return F.set_mario_action(m, ACT_BEGIN_SLIDING, 0);
    }
    animated_stationary_ground_step(m, MARIO_ANIM_SLOW_LAND_FROM_DIVE, ACT_IDLE);
    return false;
}
function act_picking_up_bowser(m) {
    if (m.actionState == 0) {
        m.actionState = 1;
        m.angleVel[1] = s16(0);
        m.marioBodyState.grabPos = GRAB_POS_BOWSER;
        F.mario_grab_used_object(m);
        play_sound(SOUND_MARIO_HRMM, m.marioObj.gfx.cameraToObject);
    }
    F.set_mario_animation(m, MARIO_ANIM_GRAB_BOWSER);
    if (F.is_anim_at_end(m)) {
        F.set_mario_action(m, ACT_HOLDING_BOWSER, 0);
    }
    F.stationary_ground_step(m);
    return false;
}
function act_holding_bowser(m) {
    let spin = 0;
    if (m.input & INPUT_B_PRESSED) {
        if (m.angleVel[1] <= -0xE00 || m.angleVel[1] >= 0xE00) {
            play_sound(SOUND_MARIO_SO_LONGA_BOWSER, m.marioObj.gfx.cameraToObject);
        } else {
            play_sound(SOUND_MARIO_HERE_WE_GO, m.marioObj.gfx.cameraToObject);
        }
        return F.set_mario_action(m, ACT_RELEASING_BOWSER, 0);
    }
    if (m.angleVel[1] == 0) {
        if (m.actionTimer++ > 120) {
            return F.set_mario_action(m, ACT_RELEASING_BOWSER, 1);
        }
        F.set_mario_animation(m, MARIO_ANIM_HOLDING_BOWSER);
    } else {
        m.actionTimer = 0;
        F.set_mario_animation(m, MARIO_ANIM_SWINGING_BOWSER);
    }
    if (m.intendedMag > 20.0) {
        if (m.actionArg == 0) {
            m.actionArg = 1;
            m.twirlYaw = s16(m.intendedYaw);
        } else {
            spin = s16(s16((m.intendedYaw - m.twirlYaw)) / 0x80);
            if (spin < -0x80) {
                spin = s16(-0x80);
            }
            if (spin > 0x80) {
                spin = s16(0x80);
            }
            m.twirlYaw = s16(m.intendedYaw);
            m.angleVel[1] = s16(m.angleVel[1] + (spin));
            if (m.angleVel[1] > 0x1000) {
                m.angleVel[1] = s16(0x1000);
            }
            if (m.angleVel[1] < -0x1000) {
                m.angleVel[1] = s16(-0x1000);
            }
        }
    } else {
        m.actionArg = 0;
        m.angleVel[1] = s16(approach_s32(m.angleVel[1], 0, 64, 64));
    }
    spin = s16(m.faceAngle[1]);
    m.faceAngle[1] = s16(m.faceAngle[1] + (m.angleVel[1]));
    if (m.angleVel[1] <= -0x100 && spin < m.faceAngle[1]) {
        play_sound(SOUND_OBJ_BOWSER_SPINNING, m.marioObj.gfx.cameraToObject);
    }
    if (m.angleVel[1] >= 0x100 && spin > m.faceAngle[1]) {
        play_sound(SOUND_OBJ_BOWSER_SPINNING, m.marioObj.gfx.cameraToObject);
    }
    F.stationary_ground_step(m);
    if (m.angleVel[1] >= 0) {
        m.marioObj.gfx.angle[0] = s16(-m.angleVel[1]);
    } else {
        m.marioObj.gfx.angle[0] = s16(m.angleVel[1]);
    }
    return false;
}
function act_releasing_bowser(m) {
    if (++m.actionTimer == 1) {
        if (m.actionArg == 0) {
            F.mario_throw_held_object(m);
        } else {
            F.mario_drop_held_object(m);
        }
    }
    m.angleVel[1] = s16(0);
    animated_stationary_ground_step(m, MARIO_ANIM_RELEASE_BOWSER, ACT_IDLE);
    return false;
}
function check_common_object_cancels(m) {
    let waterSurface = m.waterLevel - 100;
    if (m.pos[1] < waterSurface) {
        return F.set_water_plunge_action(m);
    }
    if (m.input & INPUT_SQUISHED) {
        return F.drop_and_set_mario_action(m, ACT_SQUISHED, 0);
    }
    if (m.health < 0x100) {
        return F.drop_and_set_mario_action(m, ACT_STANDING_DEATH, 0);
    }
    return false;
}
function mario_execute_object_action(m) {
    let cancel = 0;
    if (check_common_object_cancels(m)) {
        return true;
    }
    if (F.mario_update_quicksand(m, 0.5)) {
        return true;
    }
    switch (m.action) {
        case ACT_PUNCHING:           cancel = act_punching(m);           break;
        case ACT_PICKING_UP:         cancel = act_picking_up(m);         break;
        case ACT_DIVE_PICKING_UP:    cancel = act_dive_picking_up(m);    break;
        case ACT_STOMACH_SLIDE_STOP: cancel = act_stomach_slide_stop(m); break;
        case ACT_PLACING_DOWN:       cancel = act_placing_down(m);       break;
        case ACT_THROWING:           cancel = act_throwing(m);           break;
        case ACT_HEAVY_THROW:        cancel = act_heavy_throw(m);        break;
        case ACT_PICKING_UP_BOWSER:  cancel = act_picking_up_bowser(m);  break;
        case ACT_HOLDING_BOWSER:     cancel = act_holding_bowser(m);     break;
        case ACT_RELEASING_BOWSER:   cancel = act_releasing_bowser(m);   break;
    }
    if (!cancel && (m.input & INPUT_IN_WATER)) {
        m.particleFlags |= PARTICLE_IDLE_WATER_WAVE;
    }
    return cancel;
}

Object.assign(F, { animated_stationary_ground_step, mario_update_punch_sequence, act_punching, act_picking_up, act_dive_picking_up, act_placing_down, act_throwing, act_heavy_throw, act_stomach_slide_stop, act_picking_up_bowser, act_holding_bowser, act_releasing_bowser, check_common_object_cancels, mario_execute_object_action });

})(window);

/* Mario on ledges, poles and trees: ported from the Super Mario 64 decompilation (github.com/n64decomp/sm64): src/game/mario_actions_automatic.c */
(function (root) {
'use strict';
const SM64 = root.SM64, F = SM64.F = SM64.F || {}, W = SM64.W = SM64.W || {}, B = SM64.B = SM64.B || {};
const { s16, s8, sins, coss, atan2s, sqr, approach_f32, approach_s32, max, min, abs, REF, REFA, REFV } = SM64.m;
/*CONSTS*/
const { ACT_CLIMBING_POLE, ACT_FREEFALL, ACT_GRABBED, ACT_GRAB_POLE_FAST, ACT_GRAB_POLE_SLOW, ACT_GROUND_POUND, 
  ACT_HANGING, ACT_HANG_MOVING, ACT_HOLDING_POLE, ACT_IDLE, ACT_IN_CANNON, ACT_LEDGE_CLIMB_DOWN, 
  ACT_LEDGE_CLIMB_FAST, ACT_LEDGE_CLIMB_SLOW_1, ACT_LEDGE_CLIMB_SLOW_2, ACT_LEDGE_GRAB, ACT_SHOT_FROM_CANNON, 
  ACT_SOFT_BONK, ACT_START_HANGING, ACT_THROWN_BACKWARD, ACT_THROWN_FORWARD, ACT_TOP_OF_POLE, ACT_TOP_OF_POLE_JUMP, 
  ACT_TOP_OF_POLE_TRANSITION, ACT_TORNADO_TWIRLING, ACT_TWIRLING, ACT_WALL_KICK_AIR, CAM_EVENT_CANNON, 
  GRAPH_RENDER_ACTIVE, INPUT_ABOVE_SLIDE, INPUT_A_DOWN, INPUT_A_PRESSED, INPUT_NONZERO_ANALOG, INPUT_OFF_FLOOR, 
  INPUT_STOMPED, INPUT_UNKNOWN_5, INPUT_Z_PRESSED, INT_STATUS_INTERACTED, INT_STATUS_MARIO_KNOCKBACK_DMG, 
  INT_STATUS_MARIO_UNK2, INT_STATUS_MARIO_UNK6, LEVEL_SSL, MARIO_ACTION_SOUND_PLAYED, MARIO_ANIM_BEING_GRABBED, 
  MARIO_ANIM_CLIMB_DOWN_LEDGE, MARIO_ANIM_CLIMB_UP_POLE, MARIO_ANIM_DIVE, MARIO_ANIM_FAST_LEDGE_GRAB, 
  MARIO_ANIM_GRAB_POLE_SHORT, MARIO_ANIM_GRAB_POLE_SWING_PART1, MARIO_ANIM_GRAB_POLE_SWING_PART2, 
  MARIO_ANIM_HANDSTAND_IDLE, MARIO_ANIM_HANDSTAND_LEFT, MARIO_ANIM_HANDSTAND_RIGHT, MARIO_ANIM_HANG_ON_CEILING, 
  MARIO_ANIM_IDLE_HEAD_LEFT, MARIO_ANIM_IDLE_ON_LEDGE, MARIO_ANIM_IDLE_ON_POLE, MARIO_ANIM_MOVE_ON_WIRE_NET_LEFT, 
  MARIO_ANIM_MOVE_ON_WIRE_NET_RIGHT, MARIO_ANIM_RETURN_FROM_HANDSTAND, MARIO_ANIM_SLOW_LEDGE_GRAB, 
  MARIO_ANIM_START_HANDSTAND, MARIO_ANIM_START_TWIRL, MARIO_ANIM_TWIRL, MARIO_CAP_ON_HEAD, MARIO_MARIO_SOUND_PLAYED, 
  MARIO_UNKNOWN_25, PARTICLE_LEAF, SOUND_ACTION_CLIMB_UP_POLE, SOUND_ACTION_CLIMB_UP_TREE, SOUND_ACTION_FLYING_FAST, 
  SOUND_ACTION_HANGING_STEP, SOUND_ACTION_TERRAIN_LANDING, SOUND_ACTION_TWIRL, SOUND_BANK_MOVING, SOUND_MARIO_EEUH, 
  SOUND_MARIO_UH2, SOUND_MARIO_WHOA, SOUND_MOVING_AIM_CANNON, SOUND_MOVING_SLIDE_DOWN_POLE, 
  SOUND_MOVING_SLIDE_DOWN_TREE, SOUND_OBJ_POUNDING_CANNON, SURFACE_HANGABLE } = SM64.C;
/*END CONSTS*/

const POLE_NONE = 0;
const POLE_TOUCHED_FLOOR = 1;
const POLE_FELL_OFF = 2;
const HANG_NONE = 0;
const HANG_HIT_CEIL_OR_OOB = 1;
const HANG_LEFT_CEIL = 2;
function add_tree_leaf_particles(m) {
    let leafHeight = 0;
    if (m.usedObj.behavior ==B.bhvTree) {
        if (W.gCurrLevelNum == LEVEL_SSL) {
            leafHeight = 250.0;
        } else {
            leafHeight = 100.0;
        }
        if (m.pos[1] - m.floorHeight > leafHeight) {
            m.particleFlags |= PARTICLE_LEAF;
        }
    }
}
function play_climbing_sounds(m, b) {
    let isOnTree = (m.usedObj.behavior ==B.bhvTree);
    if (b == 1) {
        if (F.is_anim_past_frame(m, 1)) {
            play_sound(isOnTree ? SOUND_ACTION_CLIMB_UP_TREE : SOUND_ACTION_CLIMB_UP_POLE, m.marioObj.gfx.cameraToObject);
        }
    } else {
        play_sound(isOnTree ? SOUND_MOVING_SLIDE_DOWN_TREE : SOUND_MOVING_SLIDE_DOWN_POLE, m.marioObj.gfx.cameraToObject);
    }
}
function set_pole_position(m, offsetY) {
    let filler = new Array(12).fill(0);
    let floor = null;
    let ceil = null;
    let floorHeight = 0;
    let ceilHeight = 0;
    let collided = 0;
    let result = POLE_NONE;
    let poleTop = m.usedObj.hitboxHeight - 100.0;
    let marioObj = m.marioObj;
    if (marioObj.oMarioPolePos > poleTop) {
        marioObj.oMarioPolePos = poleTop;
    }
    m.pos[0] = m.usedObj.oPosX;
    m.pos[2] = m.usedObj.oPosZ;
    m.pos[1] = m.usedObj.oPosY + marioObj.oMarioPolePos + offsetY;
    collided = F.f32_find_wall_collision(REFA(m.pos, 0), REFA(m.pos, 1), REFA(m.pos, 2), 60.0, 50.0);
    collided |= F.f32_find_wall_collision(REFA(m.pos, 0), REFA(m.pos, 1), REFA(m.pos, 2), 30.0, 24.0);
    ceilHeight = F.vec3f_find_ceil(m.pos, m.pos[1], $ => ceil = $);
    if (m.pos[1] > ceilHeight - 160.0) {
        m.pos[1] = ceilHeight - 160.0;
        marioObj.oMarioPolePos = m.pos[1] - m.usedObj.oPosY;
    }
    floorHeight = F.find_floor(m.pos[0], m.pos[1], m.pos[2], $ => floor = $);
    if (m.pos[1] < floorHeight) {
        m.pos[1] = floorHeight;
        F.set_mario_action(m, ACT_IDLE, 0);
        result = POLE_TOUCHED_FLOOR;
    } else if (marioObj.oMarioPolePos < -m.usedObj.hitboxDownOffset) {
        m.pos[1] = m.usedObj.oPosY - m.usedObj.hitboxDownOffset;
        F.set_mario_action(m, ACT_FREEFALL, 0);
        result = POLE_FELL_OFF;
    } else if (collided) {
        if (m.pos[1] > floorHeight + 20.0) {
            m.forwardVel = -2.0;
            F.set_mario_action(m, ACT_SOFT_BONK, 0);
            result = POLE_FELL_OFF;
        } else {
            F.set_mario_action(m, ACT_IDLE, 0);
            result = POLE_TOUCHED_FLOOR;
        }
    }
    vec3f_copy(m.marioObj.gfx.pos, m.pos);
    vec3s_set(m.marioObj.gfx.angle, m.usedObj.oMoveAnglePitch, m.faceAngle[1], m.usedObj.oMoveAngleRoll);
    return result;
}
function act_holding_pole(m) {
    let marioObj = m.marioObj;
    if ((m.input & INPUT_Z_PRESSED) || m.health < 0x100) {
        add_tree_leaf_particles(m);
        m.forwardVel = -2.0;
        return F.set_mario_action(m, ACT_SOFT_BONK, 0);
    }
    if (m.input & INPUT_A_PRESSED) {
        add_tree_leaf_particles(m);
        m.faceAngle[1] = s16(m.faceAngle[1] + (0x8000));
        return F.set_mario_action(m, ACT_WALL_KICK_AIR, 0);
    }
    if (m.controller.stickY > 16.0) {
        let poleTop = m.usedObj.hitboxHeight - 100.0;
        let poleBehavior = virtual_to_segmented(0x13, m.usedObj.behavior);
        if (marioObj.oMarioPolePos < poleTop - 0.4) {
            return F.set_mario_action(m, ACT_CLIMBING_POLE, 0);
        }
        if (poleBehavior !=B.bhvGiantPole && m.controller.stickY > 50.0) {
            return F.set_mario_action(m, ACT_TOP_OF_POLE_TRANSITION, 0);
        }
    }
    if (m.controller.stickY < -16.0) {
        marioObj.oMarioPoleYawVel -= m.controller.stickY * 2;
        if (marioObj.oMarioPoleYawVel > 0x1000) {
            marioObj.oMarioPoleYawVel = 0x1000;
        }
        m.faceAngle[1] = s16(m.faceAngle[1] + (marioObj.oMarioPoleYawVel));
        marioObj.oMarioPolePos -= marioObj.oMarioPoleYawVel / 0x100;
        if (m.usedObj.behavior ==B.bhvTree) {
            if (m.pos[1] - m.floorHeight > 100.0) {
                m.particleFlags |= PARTICLE_LEAF;
            }
        }
        play_climbing_sounds(m, 2);
        set_sound_moving_speed(SOUND_BANK_MOVING, marioObj.oMarioPoleYawVel / 0x100 * 2);
    } else {
        marioObj.oMarioPoleYawVel = 0;
        m.faceAngle[1] = s16(m.faceAngle[1] - (m.controller.stickX * 16.0));
    }
    if (set_pole_position(m, 0.0) == POLE_NONE) {
        F.set_mario_animation(m, MARIO_ANIM_IDLE_ON_POLE);
    }
    return false;
}
function act_climbing_pole(m) {
    let sp24 = 0;
    let marioObj = m.marioObj;
    let cameraAngle = s16(m.area.camera.yaw);
    if (m.health < 0x100) {
        add_tree_leaf_particles(m);
        m.forwardVel = -2.0;
        return F.set_mario_action(m, ACT_SOFT_BONK, 0);
    }
    if (m.input & INPUT_A_PRESSED) {
        add_tree_leaf_particles(m);
        m.faceAngle[1] = s16(m.faceAngle[1] + (0x8000));
        return F.set_mario_action(m, ACT_WALL_KICK_AIR, 0);
    }
    if (m.controller.stickY < 8.0) {
        return F.set_mario_action(m, ACT_HOLDING_POLE, 0);
    }
    marioObj.oMarioPolePos += m.controller.stickY / 8.0;
    marioObj.oMarioPoleYawVel = 0;
    m.faceAngle[1] = s16(cameraAngle - approach_s32(s16((cameraAngle - m.faceAngle[1])), 0, 0x400, 0x400));
    if (set_pole_position(m, 0.0) == POLE_NONE) {
        sp24 = m.controller.stickY / 4.0 * 0x10000;
        F.set_mario_anim_with_accel(m, MARIO_ANIM_CLIMB_UP_POLE, sp24);
        add_tree_leaf_particles(m);
        play_climbing_sounds(m, 1);
    }
    return false;
}
function act_grab_pole_slow(m) {
    F.play_sound_if_no_flag(m, SOUND_MARIO_WHOA, MARIO_MARIO_SOUND_PLAYED);
    if (set_pole_position(m, 0.0) == POLE_NONE) {
        F.set_mario_animation(m, MARIO_ANIM_GRAB_POLE_SHORT);
        if (F.is_anim_at_end(m)) {
            F.set_mario_action(m, ACT_HOLDING_POLE, 0);
        }
        add_tree_leaf_particles(m);
    }
    return false;
}
function act_grab_pole_fast(m) {
    let marioObj = m.marioObj;
    F.play_sound_if_no_flag(m, SOUND_MARIO_WHOA, MARIO_MARIO_SOUND_PLAYED);
    m.faceAngle[1] = s16(m.faceAngle[1] + (marioObj.oMarioPoleYawVel));
    marioObj.oMarioPoleYawVel = marioObj.oMarioPoleYawVel * 8 / 10;
    if (set_pole_position(m, 0.0) == POLE_NONE) {
        if (marioObj.oMarioPoleYawVel > 0x800) {
            F.set_mario_animation(m, MARIO_ANIM_GRAB_POLE_SWING_PART1);
        } else {
            F.set_mario_animation(m, MARIO_ANIM_GRAB_POLE_SWING_PART2);
            if (F.is_anim_at_end(m)) {
                marioObj.oMarioPoleYawVel = 0;
                F.set_mario_action(m, ACT_HOLDING_POLE, 0);
            }
        }
        add_tree_leaf_particles(m);
    }
    return false;
}
function act_top_of_pole_transition(m) {
    let marioObj = m.marioObj;
    marioObj.oMarioPoleYawVel = 0;
    if (m.actionArg == 0) {
        F.set_mario_animation(m, MARIO_ANIM_START_HANDSTAND);
        if (F.is_anim_at_end(m)) {
            return F.set_mario_action(m, ACT_TOP_OF_POLE, 0);
        }
    } else {
        F.set_mario_animation(m, MARIO_ANIM_RETURN_FROM_HANDSTAND);
        if (m.marioObj.gfx.anim.frame == 0) {
            return F.set_mario_action(m, ACT_HOLDING_POLE, 0);
        }
    }
    set_pole_position(m, F.return_mario_anim_y_translation(m));
    return false;
}
function act_top_of_pole(m) {
    let marioObj = m.marioObj;
    if (m.input & INPUT_A_PRESSED) {
        return F.set_mario_action(m, ACT_TOP_OF_POLE_JUMP, 0);
    }
    if (m.controller.stickY < -16.0) {
        return F.set_mario_action(m, ACT_TOP_OF_POLE_TRANSITION, 1);
    }
    m.faceAngle[1] = s16(m.faceAngle[1] - (m.controller.stickX * 16.0));
    F.set_mario_animation(m, MARIO_ANIM_HANDSTAND_IDLE);
    set_pole_position(m, F.return_mario_anim_y_translation(m));
    return false;
}
function perform_hanging_step(m, nextPos) {
    let filler = new Array(4).fill(0);
    let ceil = null;
    let floor = null;
    let ceilHeight = 0;
    let floorHeight = 0;
    let ceilOffset = 0;
    m.wall = resolve_and_return_wall_collisions(nextPos, 50.0, 50.0);
    floorHeight = F.find_floor(nextPos[0], nextPos[1], nextPos[2], $ => floor = $);
    ceilHeight = F.vec3f_find_ceil(nextPos, floorHeight, $ => ceil = $);
    if (floor == null) {
        return HANG_HIT_CEIL_OR_OOB;
    }
    if (ceil == null) {
        return HANG_LEFT_CEIL;
    }
    if (ceilHeight - floorHeight <= 160.0) {
        return HANG_HIT_CEIL_OR_OOB;
    }
    if (ceil.type != SURFACE_HANGABLE) {
        return HANG_LEFT_CEIL;
    }
    ceilOffset = ceilHeight - (nextPos[1] + 160.0);
    if (ceilOffset < -30.0) {
        return HANG_HIT_CEIL_OR_OOB;
    }
    if (ceilOffset > 30.0) {
        return HANG_LEFT_CEIL;
    }
    nextPos[1] = m.ceilHeight - 160.0;
    vec3f_copy(m.pos, nextPos);
    m.floor = floor;
    m.floorHeight = floorHeight;
    m.ceil = ceil;
    m.ceilHeight = ceilHeight;
    return HANG_NONE;
}
function update_hang_moving(m) {
    let stepResult = 0;
    let nextPos = [0, 0, 0];
    let maxSpeed = 4.0;
    m.forwardVel += 1.0;
    if (m.forwardVel > maxSpeed) {
        m.forwardVel = maxSpeed;
    }
    m.faceAngle[1] =
        m.intendedYaw - approach_s32(s16((m.intendedYaw - m.faceAngle[1])), 0, 0x800, 0x800);
    m.slideYaw = s16(m.faceAngle[1]);
    m.slideVelX = m.forwardVel * sins(m.faceAngle[1]);
    m.slideVelZ = m.forwardVel * coss(m.faceAngle[1]);
    m.vel[0] = m.slideVelX;
    m.vel[1] = 0.0;
    m.vel[2] = m.slideVelZ;
    nextPos[0] = m.pos[0] - m.ceil.ny * m.vel[0];
    nextPos[2] = m.pos[2] - m.ceil.ny * m.vel[2];
    nextPos[1] = m.pos[1];
    stepResult = perform_hanging_step(m, nextPos);
    vec3f_copy(m.marioObj.gfx.pos, m.pos);
    vec3s_set(m.marioObj.gfx.angle, 0, m.faceAngle[1], 0);
    return stepResult;
}
function update_hang_stationary(m) {
    m.forwardVel = 0.0;
    m.slideVelX = 0.0;
    m.slideVelZ = 0.0;
    m.pos[1] = m.ceilHeight - 160.0;
    vec3f_copy(m.vel, W.gVec3fZero);
    vec3f_copy(m.marioObj.gfx.pos, m.pos);
}
function act_start_hanging(m) {
    m.actionTimer++;
    if ((m.input & INPUT_NONZERO_ANALOG) && m.actionTimer >= 31) {
        return F.set_mario_action(m, ACT_HANGING, 0);
    }
    if (!(m.input & INPUT_A_DOWN)) {
        return F.set_mario_action(m, ACT_FREEFALL, 0);
    }
    if (m.input & INPUT_Z_PRESSED) {
        return F.set_mario_action(m, ACT_GROUND_POUND, 0);
    }
    if (m.ceil.type != SURFACE_HANGABLE) {
        return F.set_mario_action(m, ACT_FREEFALL, 0);
    }
    F.set_mario_animation(m, MARIO_ANIM_HANG_ON_CEILING);
    F.play_sound_if_no_flag(m, SOUND_ACTION_HANGING_STEP, MARIO_ACTION_SOUND_PLAYED);
    update_hang_stationary(m);
    if (F.is_anim_at_end(m)) {
        F.set_mario_action(m, ACT_HANGING, 0);
    }
    return false;
}
function act_hanging(m) {
    if (m.input & INPUT_NONZERO_ANALOG) {
        return F.set_mario_action(m, ACT_HANG_MOVING, m.actionArg);
    }
    if (!(m.input & INPUT_A_DOWN)) {
        return F.set_mario_action(m, ACT_FREEFALL, 0);
    }
    if (m.input & INPUT_Z_PRESSED) {
        return F.set_mario_action(m, ACT_GROUND_POUND, 0);
    }
    if (m.ceil.type != SURFACE_HANGABLE) {
        return F.set_mario_action(m, ACT_FREEFALL, 0);
    }
    if (m.actionArg & 1) {
        F.set_mario_animation(m, MARIO_ANIM_HANDSTAND_LEFT);
    } else {
        F.set_mario_animation(m, MARIO_ANIM_HANDSTAND_RIGHT);
    }
    update_hang_stationary(m);
    return false;
}
function act_hang_moving(m) {
    if (!(m.input & INPUT_A_DOWN)) {
        return F.set_mario_action(m, ACT_FREEFALL, 0);
    }
    if (m.input & INPUT_Z_PRESSED) {
        return F.set_mario_action(m, ACT_GROUND_POUND, 0);
    }
    if (m.ceil.type != SURFACE_HANGABLE) {
        return F.set_mario_action(m, ACT_FREEFALL, 0);
    }
    if (m.actionArg & 1) {
        F.set_mario_animation(m, MARIO_ANIM_MOVE_ON_WIRE_NET_RIGHT);
    } else {
        F.set_mario_animation(m, MARIO_ANIM_MOVE_ON_WIRE_NET_LEFT);
    }
    if (m.marioObj.gfx.anim.frame == 12) {
        play_sound(SOUND_ACTION_HANGING_STEP, m.marioObj.gfx.cameraToObject);
    }
    if (F.is_anim_past_end(m)) {
        m.actionArg ^= 1;
        if (m.input & INPUT_UNKNOWN_5) {
            return F.set_mario_action(m, ACT_HANGING, m.actionArg);
        }
    }
    if (update_hang_moving(m) == HANG_LEFT_CEIL) {
        F.set_mario_action(m, ACT_FREEFALL, 0);
    }
    return false;
}
function let_go_of_ledge(m) {
    let floorHeight = 0;
    let floor = null;
    m.vel[1] = 0.0;
    m.forwardVel = -8.0;
    m.pos[0] -= 60.0 * sins(m.faceAngle[1]);
    m.pos[2] -= 60.0 * coss(m.faceAngle[1]);
    floorHeight = F.find_floor(m.pos[0], m.pos[1], m.pos[2], $ => floor = $);
    if (floorHeight < m.pos[1] - 100.0) {
        m.pos[1] -= 100.0;
    } else {
        m.pos[1] = floorHeight;
    }
    return F.set_mario_action(m, ACT_SOFT_BONK, 0);
}
function climb_up_ledge(m) {
    F.set_mario_animation(m, MARIO_ANIM_IDLE_HEAD_LEFT);
    m.pos[0] += 14.0 * sins(m.faceAngle[1]);
    m.pos[2] += 14.0 * coss(m.faceAngle[1]);
    vec3f_copy(m.marioObj.gfx.pos, m.pos);
}
function update_ledge_climb_camera(m) {
    let sp4 = 0;
    if (m.actionTimer < 14) {
        sp4 = m.actionTimer;
    } else {
        sp4 = 14.0;
    }
    m.statusForCamera.pos[0] = m.pos[0] + sp4 * sins(m.faceAngle[1]);
    m.statusForCamera.pos[2] = m.pos[2] + sp4 * coss(m.faceAngle[1]);
    m.statusForCamera.pos[1] = m.pos[1];
    m.actionTimer++;
    m.flags |= MARIO_UNKNOWN_25;
}
function update_ledge_climb(m, animation, endAction) {
    F.stop_and_set_height_to_floor(m);
    F.set_mario_animation(m, animation);
    if (F.is_anim_at_end(m)) {
        F.set_mario_action(m, endAction, 0);
        if (endAction == ACT_IDLE) {
            climb_up_ledge(m);
        }
    }
}
function act_ledge_grab(m) {
    let heightAboveFloor = 0;
    let intendedDYaw = s16(m.intendedYaw - m.faceAngle[1]);
    let hasSpaceForMario = (m.ceilHeight - m.floorHeight >= 160.0);
    if (m.actionTimer < 10) {
        m.actionTimer++;
    }
    if (m.floor.ny < 0.9063078) {
        return let_go_of_ledge(m);
    }
    if (m.input & (INPUT_Z_PRESSED | INPUT_OFF_FLOOR)) {
        return let_go_of_ledge(m);
    }
    if ((m.input & INPUT_A_PRESSED) && hasSpaceForMario) {
        return F.set_mario_action(m, ACT_LEDGE_CLIMB_FAST, 0);
    }
    if (m.input & INPUT_STOMPED) {
        if (m.marioObj.oInteractStatus & INT_STATUS_MARIO_KNOCKBACK_DMG) {
            m.hurtCounter += (m.flags & MARIO_CAP_ON_HEAD) ? 12 : 18;
        }
        return let_go_of_ledge(m);
    }
    if (m.actionTimer == 10 && (m.input & INPUT_NONZERO_ANALOG) ) {
        if (intendedDYaw >= -0x4000 && intendedDYaw <= 0x4000) {
            if (hasSpaceForMario) {
                return F.set_mario_action(m, ACT_LEDGE_CLIMB_SLOW_1, 0);
            }
        } else {
            return let_go_of_ledge(m);
        }
    }
    heightAboveFloor = m.pos[1] - F.find_floor_height_relative_polar(m, -0x8000, 30.0);
    if (hasSpaceForMario && heightAboveFloor < 100.0) {
        return F.set_mario_action(m, ACT_LEDGE_CLIMB_FAST, 0);
    }
    if (m.actionArg == 0) {
        F.play_sound_if_no_flag(m, SOUND_MARIO_WHOA, MARIO_MARIO_SOUND_PLAYED);
    }
    F.stop_and_set_height_to_floor(m);
    F.set_mario_animation(m, MARIO_ANIM_IDLE_ON_LEDGE);
    return false;
}
function act_ledge_climb_slow(m) {
    if (m.input & INPUT_OFF_FLOOR) {
        return let_go_of_ledge(m);
    }
    if (m.actionTimer >= 28 && (m.input & (INPUT_NONZERO_ANALOG | INPUT_A_PRESSED | INPUT_OFF_FLOOR | INPUT_ABOVE_SLIDE))) {
        climb_up_ledge(m);
        return F.check_common_action_exits(m);
    }
    if (m.actionTimer == 10) {
        F.play_sound_if_no_flag(m, SOUND_MARIO_EEUH, MARIO_MARIO_SOUND_PLAYED);
    }
    update_ledge_climb(m, MARIO_ANIM_SLOW_LEDGE_GRAB, ACT_IDLE);
    update_ledge_climb_camera(m);
    if (m.marioObj.gfx.anim.frame == 17) {
        m.action = ACT_LEDGE_CLIMB_SLOW_2;
    }
    return false;
}
function act_ledge_climb_down(m) {
    if (m.input & INPUT_OFF_FLOOR) {
        return let_go_of_ledge(m);
    }
    F.play_sound_if_no_flag(m, SOUND_MARIO_WHOA, MARIO_MARIO_SOUND_PLAYED);
    update_ledge_climb(m, MARIO_ANIM_CLIMB_DOWN_LEDGE, ACT_LEDGE_GRAB);
    m.actionArg = 1;
    return false;
}
function act_ledge_climb_fast(m) {
    if (m.input & INPUT_OFF_FLOOR) {
        return let_go_of_ledge(m);
    }
    F.play_sound_if_no_flag(m, SOUND_MARIO_UH2, MARIO_MARIO_SOUND_PLAYED);
    update_ledge_climb(m, MARIO_ANIM_FAST_LEDGE_GRAB, ACT_IDLE);
    if (m.marioObj.gfx.anim.frame == 8) {
        F.play_mario_landing_sound(m, SOUND_ACTION_TERRAIN_LANDING);
    }
    update_ledge_climb_camera(m);
    return false;
}
function act_grabbed(m) {
    if (m.marioObj.oInteractStatus & INT_STATUS_MARIO_UNK2) {
        let thrown = (m.marioObj.oInteractStatus & INT_STATUS_MARIO_UNK6) == 0;
        m.faceAngle[1] = s16(m.usedObj.oMoveAngleYaw);
        vec3f_copy(m.pos, m.marioObj.gfx.pos);
        return F.set_mario_action(m, (m.forwardVel >= 0.0) ? ACT_THROWN_FORWARD : ACT_THROWN_BACKWARD, thrown);
    }
    F.set_mario_animation(m, MARIO_ANIM_BEING_GRABBED);
    return false;
}
function act_in_cannon(m) {
    let marioObj = m.marioObj;
    let startFacePitch = s16(m.faceAngle[0]);
    let startFaceYaw = s16(m.faceAngle[1]);
    switch (m.actionState) {
        case 0:
            m.marioObj.gfx.flags &= ~GRAPH_RENDER_ACTIVE;
            m.usedObj.oInteractStatus = INT_STATUS_INTERACTED;
            m.statusForCamera.cameraEvent = CAM_EVENT_CANNON;
            m.statusForCamera.usedObj = m.usedObj;
            vec3f_set(m.vel, 0.0, 0.0, 0.0);
            m.pos[0] = m.usedObj.oPosX;
            m.pos[1] = m.usedObj.oPosY + 350.0;
            m.pos[2] = m.usedObj.oPosZ;
            m.forwardVel = 0.0;
            m.actionState = 1;
            break;
        case 1:
            if (m.usedObj.oAction == 1) {
                m.faceAngle[0] = s16(m.usedObj.oMoveAnglePitch);
                m.faceAngle[1] = s16(m.usedObj.oMoveAngleYaw);
                marioObj.oMarioCannonObjectYaw = m.usedObj.oMoveAngleYaw;
                marioObj.oMarioCannonInputYaw = 0;
                m.actionState = 2;
            }
            break;
        case 2:
            m.faceAngle[0] = s16(m.faceAngle[0] - (s16((m.controller.stickY * 10.0))));
            marioObj.oMarioCannonInputYaw -= s16((m.controller.stickX * 10.0));
            if (m.faceAngle[0] > 0x38E3) {
                m.faceAngle[0] = s16(0x38E3);
            }
            if (m.faceAngle[0] < 0) {
                m.faceAngle[0] = s16(0);
            }
            if (marioObj.oMarioCannonInputYaw > 0x4000) {
                marioObj.oMarioCannonInputYaw = 0x4000;
            }
            if (marioObj.oMarioCannonInputYaw < -0x4000) {
                marioObj.oMarioCannonInputYaw = -0x4000;
            }
            m.faceAngle[1] = s16(marioObj.oMarioCannonObjectYaw + marioObj.oMarioCannonInputYaw);
            if (m.input & INPUT_A_PRESSED) {
                m.forwardVel = 100.0 * coss(m.faceAngle[0]);
                m.vel[1] = 100.0 * sins(m.faceAngle[0]);
                m.pos[0] += 120.0 * coss(m.faceAngle[0]) * sins(m.faceAngle[1]);
                m.pos[1] += 120.0 * sins(m.faceAngle[0]);
                m.pos[2] += 120.0 * coss(m.faceAngle[0]) * coss(m.faceAngle[1]);
                play_sound(SOUND_ACTION_FLYING_FAST, m.marioObj.gfx.cameraToObject);
                play_sound(SOUND_OBJ_POUNDING_CANNON, m.marioObj.gfx.cameraToObject);
                m.marioObj.gfx.flags |= GRAPH_RENDER_ACTIVE;
                F.set_mario_action(m, ACT_SHOT_FROM_CANNON, 0);
                m.usedObj.oAction = 2;
                return false;
            } else if (m.faceAngle[0] != startFacePitch || m.faceAngle[1] != startFaceYaw) {
                play_sound(SOUND_MOVING_AIM_CANNON, m.marioObj.gfx.cameraToObject);
            }
    }
    vec3f_copy(m.marioObj.gfx.pos, m.pos);
    vec3s_set(m.marioObj.gfx.angle, 0, m.faceAngle[1], 0);
    F.set_mario_animation(m, MARIO_ANIM_DIVE);
    return false;
}
function act_tornado_twirling(m) {
    let floor = null;
    let nextPos = [0, 0, 0];
    let sinAngleVel = 0;
    let cosAngleVel = 0;
    let floorHeight = 0;
    let marioObj = m.marioObj;
    let usedObj = m.usedObj;
    let prevTwirlYaw = s16(m.twirlYaw);
    let dx = (m.pos[0] - usedObj.oPosX) * 0.95;
    let dz = (m.pos[2] - usedObj.oPosZ) * 0.95;
    if (m.vel[1] < 60.0) {
        m.vel[1] += 1.0;
    }
    if ((marioObj.oMarioTornadoPosY += m.vel[1]) < 0.0) {
        marioObj.oMarioTornadoPosY = 0.0;
    }
    if (marioObj.oMarioTornadoPosY > usedObj.hitboxHeight) {
        if (m.vel[1] < 20.0) {
            m.vel[1] = 20.0;
        }
        return F.set_mario_action(m, ACT_TWIRLING, 1);
    }
    if (m.angleVel[1] < 0x3000) {
        m.angleVel[1] = s16(m.angleVel[1] + (0x100));
    }
    if (marioObj.oMarioTornadoYawVel < 0x1000) {
        marioObj.oMarioTornadoYawVel += 0x100;
    }
    m.twirlYaw = s16(m.twirlYaw + (m.angleVel[1]));
    sinAngleVel = sins(marioObj.oMarioTornadoYawVel);
    cosAngleVel = coss(marioObj.oMarioTornadoYawVel);
    nextPos[0] = usedObj.oPosX + dx * cosAngleVel + dz * sinAngleVel;
    nextPos[2] = usedObj.oPosZ - dx * sinAngleVel + dz * cosAngleVel;
    nextPos[1] = usedObj.oPosY + marioObj.oMarioTornadoPosY;
    F.f32_find_wall_collision(REFA(nextPos, 0), REFA(nextPos, 1), REFA(nextPos, 2), 60.0, 50.0);
    floorHeight = F.find_floor(nextPos[0], nextPos[1], nextPos[2], $ => floor = $);
    if (floor != null) {
        m.floor = floor;
        m.floorHeight = floorHeight;
        vec3f_copy(m.pos, nextPos);
    } else {
        if (nextPos[1] >= m.floorHeight) {
            m.pos[1] = nextPos[1];
        } else {
            m.pos[1] = m.floorHeight;
        }
    }
    m.actionTimer++;
    F.set_mario_animation(m, (m.actionArg == 0) ? MARIO_ANIM_START_TWIRL : MARIO_ANIM_TWIRL);
    if (F.is_anim_past_end(m)) {
        m.actionArg = 1;
    }
    if (prevTwirlYaw > m.twirlYaw) {
        play_sound(SOUND_ACTION_TWIRL, m.marioObj.gfx.cameraToObject);
    }
    vec3f_copy(m.marioObj.gfx.pos, m.pos);
    vec3s_set(m.marioObj.gfx.angle, 0, m.faceAngle[1] + m.twirlYaw, 0);
    return false;
}
function check_common_automatic_cancels(m) {
    if (m.pos[1] < m.waterLevel - 100) {
        return F.set_water_plunge_action(m);
    }
    return false;
}
function mario_execute_automatic_action(m) {
    let cancel = 0;
    if (check_common_automatic_cancels(m)) {
        return true;
    }
    m.quicksandDepth = 0.0;
    switch (m.action) {
        case ACT_HOLDING_POLE:           cancel = act_holding_pole(m);           break;
        case ACT_GRAB_POLE_SLOW:         cancel = act_grab_pole_slow(m);         break;
        case ACT_GRAB_POLE_FAST:         cancel = act_grab_pole_fast(m);         break;
        case ACT_CLIMBING_POLE:          cancel = act_climbing_pole(m);          break;
        case ACT_TOP_OF_POLE_TRANSITION: cancel = act_top_of_pole_transition(m); break;
        case ACT_TOP_OF_POLE:            cancel = act_top_of_pole(m);            break;
        case ACT_START_HANGING:          cancel = act_start_hanging(m);          break;
        case ACT_HANGING:                cancel = act_hanging(m);                break;
        case ACT_HANG_MOVING:            cancel = act_hang_moving(m);            break;
        case ACT_LEDGE_GRAB:             cancel = act_ledge_grab(m);             break;
        case ACT_LEDGE_CLIMB_SLOW_1:     cancel = act_ledge_climb_slow(m);       break;
        case ACT_LEDGE_CLIMB_SLOW_2:     cancel = act_ledge_climb_slow(m);       break;
        case ACT_LEDGE_CLIMB_DOWN:       cancel = act_ledge_climb_down(m);       break;
        case ACT_LEDGE_CLIMB_FAST:       cancel = act_ledge_climb_fast(m);       break;
        case ACT_GRABBED:                cancel = act_grabbed(m);                break;
        case ACT_IN_CANNON:              cancel = act_in_cannon(m);              break;
        case ACT_TORNADO_TWIRLING:       cancel = act_tornado_twirling(m);       break;
    }
    return cancel;
}

Object.assign(F, { add_tree_leaf_particles, play_climbing_sounds, set_pole_position, act_holding_pole, act_climbing_pole, act_grab_pole_slow, act_grab_pole_fast, act_top_of_pole_transition, act_top_of_pole, perform_hanging_step, update_hang_moving, update_hang_stationary, act_start_hanging, act_hanging, act_hang_moving, let_go_of_ledge, climb_up_ledge, update_ledge_climb_camera, update_ledge_climb, act_ledge_grab, act_ledge_climb_slow, act_ledge_climb_down, act_ledge_climb_fast, act_grabbed, act_in_cannon, act_tornado_twirling, check_common_automatic_cancels, mario_execute_automatic_action });

})(window);

/* Mario in cutscenes: ported from the Super Mario 64 decompilation (github.com/n64decomp/sm64): src/game/mario_actions_cutscene.c */
(function (root) {
'use strict';
const SM64 = root.SM64, F = SM64.F = SM64.F || {}, W = SM64.W = SM64.W || {}, B = SM64.B = SM64.B || {};
const { s16, s8, sins, coss, atan2s, sqr, approach_f32, approach_s32, max, min, abs, REF, REFA, REFV } = SM64.m;
/*CONSTS*/
const { ACT_BBH_ENTER_JUMP, ACT_BBH_ENTER_SPIN, ACT_BUTT_STUCK_IN_GROUND, ACT_CREDITS_CUTSCENE, ACT_CROUCHING, 
  ACT_DEATH_EXIT, ACT_DEATH_EXIT_LAND, ACT_DEATH_ON_BACK, ACT_DEATH_ON_STOMACH, ACT_DEBUG_FREE_MOVE, ACT_DISAPPEARED, 
  ACT_EATEN_BY_BUBBA, ACT_ELECTROCUTION, ACT_EMERGE_FROM_PIPE, ACT_END_PEACH_CUTSCENE, ACT_END_WAVING_CUTSCENE, 
  ACT_ENTERING_STAR_DOOR, ACT_EXIT_AIRBORNE, ACT_EXIT_LAND_SAVE_DIALOG, ACT_FALLING_DEATH_EXIT, 
  ACT_FALLING_EXIT_AIRBORNE, ACT_FALL_AFTER_STAR_GRAB, ACT_FEET_STUCK_IN_GROUND, ACT_FIRST_PERSON, 
  ACT_FLAG_INVULNERABLE, ACT_FLAG_RIDING_SHELL, ACT_FREEFALL, ACT_FREEFALL_LAND_STOP, ACT_GROUND_POUND_LAND, 
  ACT_GROUP_MASK, ACT_GROUP_MOVING, ACT_GROUP_STATIONARY, ACT_HARD_BACKWARD_GROUND_KB, ACT_HEAD_STUCK_IN_GROUND, 
  ACT_HOLD_IDLE, ACT_IDLE, ACT_INTRO_CUTSCENE, ACT_JUMBO_STAR_CUTSCENE, ACT_JUMP_LAND_STOP, ACT_PULLING_DOOR, 
  ACT_PUSHING_DOOR, ACT_PUTTING_ON_CAP, ACT_QUICKSAND_DEATH, ACT_READING_AUTOMATIC_DIALOG, ACT_READING_NPC_DIALOG, 
  ACT_READING_SIGN, ACT_SHOCKED, ACT_SPAWN_NO_SPIN_AIRBORNE, ACT_SPAWN_NO_SPIN_LANDING, ACT_SPAWN_SPIN_AIRBORNE, 
  ACT_SPAWN_SPIN_LANDING, ACT_SPECIAL_DEATH_EXIT, ACT_SPECIAL_EXIT_AIRBORNE, ACT_SQUISHED, ACT_STANDING_DEATH, 
  ACT_STAR_DANCE_EXIT, ACT_STAR_DANCE_NO_EXIT, ACT_STAR_DANCE_WATER, ACT_SUFFOCATION, ACT_TELEPORT_FADE_IN, 
  ACT_TELEPORT_FADE_OUT, ACT_UNLOCKING_KEY_DOOR, ACT_UNLOCKING_STAR_DOOR, ACT_UNUSED_DEATH_EXIT, 
  ACT_WAITING_FOR_DIALOG, ACT_WALKING, ACT_WARP_DOOR_SPAWN, ACT_WATER_IDLE, AIR_STEP_LANDED, ARRAY_COUNT, A_BUTTON, 
  B_BUTTON, CAMERA_MODE_BEHIND_MARIO, CAMERA_MODE_WATER_SURFACE, CAM_EVENT_START_CREDITS, CAM_EVENT_START_ENDING, 
  CAM_EVENT_START_END_WAVING, CAM_EVENT_START_GRAND_STAR, CAM_EVENT_START_INTRO, CAM_MOVE_C_UP_MODE, COURSE_BITDW, 
  COURSE_BITFS, DIALOG_013, DIALOG_014, DIALOG_021, DIALOG_038, DIALOG_141, DIALOG_RESPONSE_NONE, 
  DIALOG_RESPONSE_YES, D_JPAD, GET_HIGH_U16_OF_32, GET_LOW_U16_OF_32, GFX_DIMENSIONS_ASPECT_RATIO, 
  GFX_DIMENSIONS_RECT_FROM_LEFT_EDGE, GFX_DIMENSIONS_RECT_FROM_RIGHT_EDGE, GRAPH_RENDER_ACTIVE, 
  GRAPH_RENDER_INVISIBLE, GROUND_STEP_LEFT_GROUND, HUD_DISPLAY_DEFAULT, HUD_DISPLAY_NONE, INPUT_A_DOWN, 
  INPUT_A_PRESSED, INPUT_IN_POISON_GAS, INPUT_IN_WATER, INT_STATUS_UNK16, INT_STATUS_UNK17, INT_STATUS_UNK18, 
  INT_STATUS_UNK19, LEVEL_BOWSER_1, LEVEL_BOWSER_2, LEVEL_CASTLE, LEVEL_THI, L_TRIG, MARIO_ACTION_SOUND_PLAYED, 
  MARIO_ANIM_A_POSE, MARIO_ANIM_BACKWARD_AIR_KB, MARIO_ANIM_BOTTOM_STUCK_IN_GROUND, 
  MARIO_ANIM_CREDITS_LOOK_BACK_THEN_RUN, MARIO_ANIM_CREDITS_LOOK_UP, MARIO_ANIM_CREDITS_LOWER_HAND, 
  MARIO_ANIM_CREDITS_PEACE_SIGN, MARIO_ANIM_CREDITS_RAISE_HAND, MARIO_ANIM_CREDITS_RETURN_FROM_LOOK_UP, 
  MARIO_ANIM_CREDITS_START_WALK_LOOK_UP, MARIO_ANIM_CREDITS_TAKE_OFF_CAP, MARIO_ANIM_CREDITS_WAVING, 
  MARIO_ANIM_CROUCHING, MARIO_ANIM_DIVE, MARIO_ANIM_DOUBLE_JUMP_RISE, MARIO_ANIM_DYING_FALL_OVER, 
  MARIO_ANIM_DYING_IN_QUICKSAND, MARIO_ANIM_DYING_ON_BACK, MARIO_ANIM_DYING_ON_STOMACH, MARIO_ANIM_ELECTROCUTION, 
  MARIO_ANIM_FINAL_BOWSER_RAISE_HAND_SPIN, MARIO_ANIM_FINAL_BOWSER_WING_CAP_TAKE_OFF, MARIO_ANIM_FIRST_PERSON, 
  MARIO_ANIM_FORWARD_SPINNING, MARIO_ANIM_GENERAL_FALL, MARIO_ANIM_GENERAL_LAND, MARIO_ANIM_HEAD_STUCK_IN_GROUND, 
  MARIO_ANIM_IDLE_WITH_LIGHT_OBJ, MARIO_ANIM_LAND_FROM_SINGLE_JUMP, MARIO_ANIM_LEGS_STUCK_IN_GROUND, 
  MARIO_ANIM_MISSING_CAP, MARIO_ANIM_PULL_DOOR_WALK_IN, MARIO_ANIM_PUSH_DOOR_WALK_IN, MARIO_ANIM_PUT_CAP_ON, 
  MARIO_ANIM_RETURN_FROM_STAR_DANCE, MARIO_ANIM_RETURN_FROM_WATER_STAR_DANCE, MARIO_ANIM_RETURN_STAR_APPROACH_DOOR, 
  MARIO_ANIM_RUNNING, MARIO_ANIM_SHOCKED, MARIO_ANIM_SINGLE_JUMP, MARIO_ANIM_STAR_DANCE, MARIO_ANIM_SUFFOCATING, 
  MARIO_ANIM_SUMMON_STAR, MARIO_ANIM_TAKE_CAP_OFF_THEN_ON, MARIO_ANIM_THROW_CATCH_KEY, MARIO_ANIM_UNLOCK_DOOR, 
  MARIO_ANIM_WALKING, MARIO_ANIM_WATER_IDLE, MARIO_ANIM_WATER_STAR_DANCE, MARIO_ANIM_WING_CAP_FLY, MARIO_CAP_IN_HAND, 
  MARIO_CAP_ON_HEAD, MARIO_DIALOG_LOOK_DOWN, MARIO_DIALOG_LOOK_UP, MARIO_DIALOG_STATUS_NONE, 
  MARIO_DIALOG_STATUS_SPEAK, MARIO_DIALOG_STATUS_START, MARIO_DIALOG_STOP, MARIO_EYES_CLOSED, MARIO_EYES_DEAD, 
  MARIO_EYES_HALF_CLOSED, MARIO_EYES_OPEN, MARIO_HAND_OPEN, MARIO_HAND_PEACE_SIGN, MARIO_HAND_RIGHT_OPEN, 
  MARIO_MARIO_SOUND_PLAYED, MARIO_METAL_CAP, MARIO_METAL_SHOCK, MARIO_TELEPORTING, MARIO_UNKNOWN_08, MARIO_WING_CAP, 
  MENU_MODE_RENDER_COURSE_COMPLETE_SCREEN, MENU_OPT_NONE, MODEL_BOWSER_KEY_CUTSCENE, MODEL_CASTLE_GROUNDS_WARP_PIPE, 
  MODEL_NONE, MODEL_PEACH, MODEL_STAR, MODEL_TOAD, PARTICLE_BUBBLE, PARTICLE_DUST, PARTICLE_IDLE_WATER_WAVE, 
  PARTICLE_SPARKLES, PARTICLE_WATER_SPLASH, SAVE_FLAG_HAVE_KEY_1, SAVE_FLAG_HAVE_KEY_2, 
  SAVE_FLAG_UNLOCKED_BASEMENT_DOOR, SAVE_FLAG_UNLOCKED_UPSTAIRS_DOOR, SEQUENCE_ARGS, SEQ_EVENT_CUTSCENE_COLLECT_KEY, 
  SEQ_EVENT_CUTSCENE_COLLECT_STAR, SEQ_EVENT_CUTSCENE_CREDITS, SEQ_EVENT_CUTSCENE_ENDING, SEQ_EVENT_CUTSCENE_VICTORY, 
  SEQ_LEVEL_INSIDE_CASTLE, SEQ_PLAYER_ENV, SEQ_PLAYER_LEVEL, SEQ_PLAYER_SFX, SHAKE_SHOCK, SOUND_ACTION_BRUSH_HAIR, 
  SOUND_ACTION_HIT_3, SOUND_ACTION_KEY_SWISH, SOUND_ACTION_METAL_JUMP, SOUND_ACTION_PAT_BACK, SOUND_ACTION_READ_SIGN, 
  SOUND_ACTION_SHRINK_INTO_BBH, SOUND_ACTION_SPIN, SOUND_ACTION_TELEPORT, SOUND_ACTION_TERRAIN_BODY_HIT_GROUND, 
  SOUND_ACTION_TERRAIN_JUMP, SOUND_ACTION_TERRAIN_LANDING, SOUND_ACTION_TERRAIN_STUCK_IN_GROUND, 
  SOUND_ACTION_UNKNOWN430, SOUND_ACTION_UNKNOWN43D, SOUND_ACTION_UNKNOWN43E, SOUND_ACTION_UNKNOWN45C, 
  SOUND_ACTION_UNSTUCK_FROM_GROUND, SOUND_AIR_PEACH_TWINKLE, SOUND_BANKS_DISABLED_DURING_INTRO_CUTSCENE, 
  SOUND_GENERAL_DOOR_INSERT_KEY, SOUND_GENERAL_DOOR_TURN_KEY, SOUND_MARIO_ATTACKED, SOUND_MARIO_DYING, 
  SOUND_MARIO_HAHA, SOUND_MARIO_HERE_WE_GO, SOUND_MARIO_HOOHOO, SOUND_MARIO_OOOF2, SOUND_MARIO_WAAAOOOW, 
  SOUND_MARIO_YAHOO, SOUND_MARIO_YAH_WAH_HOO, SOUND_MENU_ENTER_PIPE, SOUND_MENU_EXIT_PIPE, SOUND_MENU_STAR_SOUND, 
  SOUND_MOVING_QUICKSAND_DEATH, SOUND_MOVING_SHOCKED, SOUND_PEACH_BAKE_A_CAKE, SOUND_PEACH_FOR_MARIO, 
  SOUND_PEACH_MARIO, SOUND_PEACH_MARIO2, SOUND_PEACH_POWER_OF_THE_STARS, SOUND_PEACH_SOMETHING_SPECIAL, 
  SOUND_PEACH_THANKS_TO_YOU, SOUND_PEACH_THANK_YOU_MARIO, SURFACE_INSTANT_QUICKSAND, U_JPAD, WARP_OP_CREDITS_END, 
  WARP_OP_CREDITS_NEXT, WARP_OP_CREDITS_START, WARP_OP_DEATH, WARP_OP_STAR_EXIT, WARP_OP_TELEPORT, 
  WARP_OP_UNKNOWN_02, WARP_OP_WARP_DOOR, WARP_TRANSITION_FADE_FROM_COLOR, WARP_TRANSITION_FADE_INTO_COLOR } = SM64.C;
/*END CONSTS*/

let sIntroWarpPipeObj = null;
let sEndPeachObj = null;
let sEndRightToadObj = null;
let sEndLeftToadObj = null;
let sEndJumboStarObj = null;
let sUnused = 0;
let sEndPeachAnimation = 0;
let sEndToadAnims = new Array(2).fill(0);
let sEndCutsceneVp = [[[640, 480, 511, 0], [640, 480, 511, 0]]];
let sDispCreditsEntry = null;
let D_8032CBE4 = 0;
let D_8032CBE8 = 0;
let D_8032CBEC = [2, 3, 2, 1, 2, 3, 2];
let sStarsNeededForDialog = [1, 3, 8, 30, 50, 70];
let sJumboStarKeyframes = [[20, 0, 678, -2916], [30, 0, 680, -3500], [40, 1000, 700, -4000], [50, 2500, 750, -3500], [50, 3500, 800, -2000], [50, 4000, 850, 0], [50, 3500, 900, 2000], [50, 2000, 950, 3500], [50, 0, 1000, 4000], [50, -2000, 1050, 3500], [50, -3500, 1100, 2000], [50, -4000, 1150, 0], [50, -3500, 1200, -2000], [50, -2000, 1250, -3500], [50, 0, 1300, -4000], [50, 2000, 1350, -3500], [50, 3500, 1400, -2000], [50, 4000, 1450, 0], [50, 3500, 1500, 2000], [50, 2000, 1600, 3500], [50, 0, 1700, 4000], [50, -2000, 1800, 3500], [50, -3500, 1900, 2000], [30, -4000, 2000, 0], [0, -3500, 2100, -2000], [0, -2000, 2200, -3500], [0, 0, 2300, -4000]];
const CREDIT_TEXT_MARGIN_X = ((s32)(GFX_DIMENSIONS_ASPECT_RATIO * 21));
const CREDIT_TEXT_X_LEFT = GFX_DIMENSIONS_RECT_FROM_LEFT_EDGE(CREDIT_TEXT_MARGIN_X);
const CREDIT_TEXT_X_RIGHT = GFX_DIMENSIONS_RECT_FROM_RIGHT_EDGE(CREDIT_TEXT_MARGIN_X);
function bhv_end_peach_loop() {
    F.cur_obj_init_animation_with_sound(sEndPeachAnimation);
    if (F.cur_obj_check_if_near_animation_end()) {
        if (sEndPeachAnimation < 3 || sEndPeachAnimation == 6 || sEndPeachAnimation == 7) {
            sEndPeachAnimation++;
        }
    }
}
function bhv_end_toad_loop() {
    let toadAnimIndex = (W.gCurrentObject.oPosX >= 0.0);
    F.cur_obj_init_animation_with_sound(sEndToadAnims[toadAnimIndex]);
    if (F.cur_obj_check_if_near_animation_end()) {
        if (sEndToadAnims[toadAnimIndex] == 0 || sEndToadAnims[toadAnimIndex] == 2) {
            sEndToadAnims[toadAnimIndex]++;
        }
    }
}
function geo_switch_peach_eyes(run, node, a2) {
    let switchCase = node;
    let timer = 0;
    if (run == true) {
        if (D_8032CBE4 == 0) {
            timer = s16((W.gAreaUpdateCounter + 0x20) >> 1 & 0x1F);
            if (timer < 7) {
                switchCase.selectedCase = D_8032CBE8 * 4 + D_8032CBEC[timer];
            } else {
                switchCase.selectedCase = D_8032CBE8 * 4 + 1;
            }
        } else {
            switchCase.selectedCase = D_8032CBE8 * 4 + D_8032CBE4 - 1;
        }
    }
    return 0;
}
function get_star_collection_dialog(m) {
    let i = 0;
    let dialogID = 0;
    let numStarsRequired = 0;
    for (i = 0; i < ARRAY_COUNT(sStarsNeededForDialog); i++) {
        numStarsRequired = sStarsNeededForDialog[i];
        if (m.prevNumStarsForDialog < numStarsRequired && m.numStars >= numStarsRequired) {
            dialogID = i + DIALOG_141;
            break;
        }
    }
    m.prevNumStarsForDialog = m.numStars;
    return dialogID;
}
function spawn_obj_at_mario_rel_yaw(m, model, behavior, relYaw) {
    let o = spawn_object(m.marioObj, model, behavior);
    o.oFaceAngleYaw = m.faceAngle[1] + relYaw;
    o.oPosX = m.pos[0];
    o.oPosY = m.pos[1];
    o.oPosZ = m.pos[2];
    return o;
}
function cutscene_take_cap_off(m) {
    m.flags &= ~MARIO_CAP_ON_HEAD;
    m.flags |= MARIO_CAP_IN_HAND;
    play_sound(SOUND_ACTION_UNKNOWN43D, m.marioObj.gfx.cameraToObject);
}
function cutscene_put_cap_on(m) {
    m.flags &= ~MARIO_CAP_IN_HAND;
    m.flags |= MARIO_CAP_ON_HEAD;
    play_sound(SOUND_ACTION_UNKNOWN43E, m.marioObj.gfx.cameraToObject);
}
function mario_ready_to_speak() {
    let actionGroup = W.gMarioState.action & ACT_GROUP_MASK;
    let isReadyToSpeak = false;
    if ((W.gMarioState.action == ACT_WAITING_FOR_DIALOG || actionGroup == ACT_GROUP_STATIONARY || actionGroup == ACT_GROUP_MOVING) && (!(W.gMarioState.action & (ACT_FLAG_RIDING_SHELL | ACT_FLAG_INVULNERABLE)) && W.gMarioState.action != ACT_FIRST_PERSON)) {
        isReadyToSpeak = true;
    }
    return isReadyToSpeak;
}
function set_mario_npc_dialog(actionArg) {
    let dialogState = MARIO_DIALOG_STATUS_NONE;
    if (W.gMarioState.action == ACT_READING_NPC_DIALOG) {
        if (W.gMarioState.actionState < 8) {
            dialogState = MARIO_DIALOG_STATUS_START; 
        }
        if (W.gMarioState.actionState == 8) {
            if (actionArg == MARIO_DIALOG_STOP) {
                W.gMarioState.actionState++; 
            } else {
                dialogState = MARIO_DIALOG_STATUS_SPEAK;
            }
        }
    } else if (actionArg != 0 && mario_ready_to_speak()) {
        W.gMarioState.usedObj = W.gCurrentObject;
        F.set_mario_action(W.gMarioState, ACT_READING_NPC_DIALOG, actionArg);
        dialogState = MARIO_DIALOG_STATUS_START; 
    }
    return dialogState;
}
function act_reading_npc_dialog(m) {
    let headTurnAmount = 0;
    let angleToNPC = 0;
    if (m.actionArg == MARIO_DIALOG_LOOK_UP) {
        headTurnAmount = -1024;
    }
    if (m.actionArg == MARIO_DIALOG_LOOK_DOWN) {
        headTurnAmount = 384;
    }
    if (m.actionState < 8) {
        angleToNPC = s16(F.mario_obj_angle_to_object(m, m.usedObj));
        m.faceAngle[1] =
            angleToNPC - approach_s32((angleToNPC - m.faceAngle[1]) << 16 >> 16, 0, 2048, 2048);
        m.actionTimer += headTurnAmount;
        F.set_mario_animation(m, m.heldObj == null ? MARIO_ANIM_FIRST_PERSON : MARIO_ANIM_IDLE_WITH_LIGHT_OBJ);
    } else if (m.actionState >= 9 && m.actionState < 17) {
        m.actionTimer -= headTurnAmount;
    } else if (m.actionState == 23) {
        if (m.flags & MARIO_CAP_IN_HAND) {
            F.set_mario_action(m, ACT_PUTTING_ON_CAP, 0);
        } else {
            F.set_mario_action(m, m.heldObj == null ? ACT_IDLE : ACT_HOLD_IDLE, 0);
        }
    }
    vec3f_copy(m.marioObj.gfx.pos, m.pos);
    vec3s_set(m.marioObj.gfx.angle, 0, m.faceAngle[1], 0);
    vec3s_set(m.marioBodyState.headAngle, m.actionTimer, 0, 0);
    if (m.actionState != 8) {
        m.actionState++;
    }
    return false;
}
function act_waiting_for_dialog(m) {
    F.set_mario_animation(m, m.heldObj == null ? MARIO_ANIM_FIRST_PERSON : MARIO_ANIM_IDLE_WITH_LIGHT_OBJ);
    vec3f_copy(m.marioObj.gfx.pos, m.pos);
    vec3s_set(m.marioObj.gfx.angle, 0, m.faceAngle[1], 0);
    return false;
}
function act_disappeared(m) {
    F.set_mario_animation(m, MARIO_ANIM_A_POSE);
    F.stop_and_set_height_to_floor(m);
    m.marioObj.gfx.flags &= ~GRAPH_RENDER_ACTIVE;
    if (m.actionArg) {
        m.actionArg--;
        if ((m.actionArg & 0xFFFF) == 0) {
            F.level_trigger_warp(m, m.actionArg >> 16);
        }
    }
    return false;
}
function act_reading_automatic_dialog(m) {
    let actionArg = 0;
    m.actionState++;
    if (m.actionState == 2) {
        F.enable_time_stop();
    }
    if (m.actionState < 9) {
        F.set_mario_animation(m, m.prevAction == ACT_STAR_DANCE_WATER ? MARIO_ANIM_WATER_IDLE : MARIO_ANIM_FIRST_PERSON);
        m.actionTimer -= 1024;
    } else {
        if (m.actionState == 9) {
            actionArg = m.actionArg;
            if (GET_HIGH_U16_OF_32(actionArg) == 0) {
                F.create_dialog_box(GET_LOW_U16_OF_32(actionArg));
            } else {
                F.create_dialog_box_with_var(GET_HIGH_U16_OF_32(actionArg), GET_LOW_U16_OF_32(actionArg));
            }
        }
        else if (m.actionState == 10) {
            if (F.get_dialog_id() >= 0) {
                m.actionState--;
            }
        }
        else if (m.actionState < 19) {
            m.actionTimer += 1024;
        }
        else if (m.actionState == 25) {
            F.disable_time_stop();
            if (W.gNeverEnteredCastle) {
                W.gNeverEnteredCastle = false;
                F.play_cutscene_music(SEQUENCE_ARGS(0, SEQ_LEVEL_INSIDE_CASTLE));
            }
            if (m.prevAction == ACT_STAR_DANCE_WATER) {
                F.set_mario_action(m, ACT_WATER_IDLE, 0); 
            } else {
                F.set_mario_action(m, m.prevAction == ACT_UNLOCKING_STAR_DOOR ? ACT_WALKING : ACT_IDLE, 0);
            }
        }
    }
    vec3s_set(m.marioBodyState.headAngle, m.actionTimer, 0, 0);
    return false;
}
function act_reading_sign(m) {
    let marioObj = m.marioObj;
    F.play_sound_if_no_flag(m, SOUND_ACTION_READ_SIGN, MARIO_ACTION_SOUND_PLAYED);
    switch (m.actionState) {
        case 0:
            F.trigger_cutscene_dialog(1);
            F.enable_time_stop();
            F.set_mario_animation(m, MARIO_ANIM_FIRST_PERSON);
            m.actionState = 1;
        case 1:
            m.faceAngle[1] = s16(m.faceAngle[1] + (marioObj.oMarioPoleUnk108 / 11));
            m.pos[0] += marioObj.oMarioReadingSignDPosX / 11.0;
            m.pos[2] += marioObj.oMarioReadingSignDPosZ / 11.0;
            if (m.actionTimer++ == 10) {
                F.create_dialog_inverted_box(m.usedObj.oBhvParams2ndByte);
                m.actionState = 2;
            }
            break;
        case 2:
            if (W.gCamera.cutscene == 0) {
                F.disable_time_stop();
                F.set_mario_action(m, ACT_IDLE, 0);
            }
            break;
    }
    vec3f_copy(marioObj.gfx.pos, m.pos);
    vec3s_set(marioObj.gfx.angle, 0, m.faceAngle[1], 0);
    return false;
}
function act_debug_free_move(m) {
    let surf = null;
    let floorHeight = 0;
    let pos = [0, 0, 0];
    let speed = 0;
    let action = 0;
    speed = W.gPlayer1Controller.buttonDown & B_BUTTON ? 4 : 1;
    if (W.gPlayer1Controller.buttonDown & L_TRIG) {
        speed = 0.01;
    }
    F.set_mario_animation(m, MARIO_ANIM_A_POSE);
    vec3f_copy(pos, m.pos);
    if (W.gPlayer1Controller.buttonDown & U_JPAD) {
        pos[1] += 16.0 * speed;
    }
    if (W.gPlayer1Controller.buttonDown & D_JPAD) {
        pos[1] -= 16.0 * speed;
    }
    if (m.intendedMag > 0) {
        pos[0] += 32.0 * speed * sins(m.intendedYaw);
        pos[2] += 32.0 * speed * coss(m.intendedYaw);
    }
    resolve_and_return_wall_collisions(pos, 60.0, 50.0);
    floorHeight = F.find_floor(pos[0], pos[1], pos[2], $ => surf = $);
    if (surf != null) {
        if (pos[1] < floorHeight) {
            pos[1] = floorHeight;
        }
        vec3f_copy(m.pos, pos);
    }
    m.faceAngle[1] = s16(m.intendedYaw);
    vec3f_copy(m.marioObj.gfx.pos, m.pos);
    vec3s_set(m.marioObj.gfx.angle, 0, m.faceAngle[1], 0);
    if (W.gPlayer1Controller.buttonPressed == A_BUTTON) {
        if (m.pos[1] <= m.waterLevel - 100) {
            action = ACT_WATER_IDLE;
        } else {
            action = ACT_IDLE;
        }
        F.set_mario_action(m, action, 0);
    }
    return false;
}
function general_star_dance_handler(m, isInWater) {
    let dialogID = 0;
    if (m.actionState == 0) {
        switch (++m.actionTimer) {
            case 1:
                spawn_object(m.marioObj, MODEL_STAR,B.bhvCelebrationStar);
                F.disable_background_sound();
                if (m.actionArg & 1) {
                    play_course_clear();
                } else {
                    if (W.gCurrLevelNum == LEVEL_BOWSER_1 || W.gCurrLevelNum == LEVEL_BOWSER_2) {
                        play_music(SEQ_PLAYER_ENV, SEQUENCE_ARGS(15, SEQ_EVENT_CUTSCENE_COLLECT_KEY), 0);
                    } else {
                        play_music(SEQ_PLAYER_ENV, SEQUENCE_ARGS(15, SEQ_EVENT_CUTSCENE_COLLECT_STAR), 0);
                    }
                }
                break;
            case 42:
                play_sound(SOUND_MARIO_HERE_WE_GO, m.marioObj.gfx.cameraToObject);
                break;
            case 80:
                if (!(m.actionArg & 1)) {
                    F.level_trigger_warp(m, WARP_OP_STAR_EXIT);
                } else {
                    F.enable_time_stop();
                    F.create_dialog_box_with_response(W.gLastCompletedStarNum == 7 ? DIALOG_013 : DIALOG_014);
                    m.actionState = 1;
                }
                break;
        }
    } else if (m.actionState == 1 && W.gDialogResponse != DIALOG_RESPONSE_NONE) {
        if (W.gDialogResponse == DIALOG_RESPONSE_YES) {
            F.save_file_do_save(W.gCurrSaveFileNum - 1);
        }
        m.actionState = 2;
    } else if (m.actionState == 2 && F.is_anim_at_end(m)) {
        F.disable_time_stop();
        F.enable_background_sound();
        dialogID = get_star_collection_dialog(m);
        if (dialogID) {
            F.set_mario_action(m, ACT_READING_AUTOMATIC_DIALOG, dialogID);
        } else {
            F.set_mario_action(m, isInWater ? ACT_WATER_IDLE : ACT_IDLE, 0);
        }
    }
}
function act_star_dance(m) {
    m.faceAngle[1] = s16(m.area.camera.yaw);
    F.set_mario_animation(m, m.actionState == 2 ? MARIO_ANIM_RETURN_FROM_STAR_DANCE : MARIO_ANIM_STAR_DANCE);
    general_star_dance_handler(m, 0);
    if (m.actionState != 2 && m.actionTimer >= 40) {
        m.marioBodyState.handState = MARIO_HAND_PEACE_SIGN;
    }
    F.stop_and_set_height_to_floor(m);
    return false;
}
function act_star_dance_water(m) {
    m.faceAngle[1] = s16(m.area.camera.yaw);
    F.set_mario_animation(m, m.actionState == 2 ? MARIO_ANIM_RETURN_FROM_WATER_STAR_DANCE : MARIO_ANIM_WATER_STAR_DANCE);
    vec3f_copy(m.marioObj.gfx.pos, m.pos);
    vec3s_set(m.marioObj.gfx.angle, 0, m.faceAngle[1], 0);
    general_star_dance_handler(m, 1);
    if (m.actionState != 2 && m.actionTimer >= 62) {
        m.marioBodyState.handState = MARIO_HAND_PEACE_SIGN;
    }
    return false;
}
function act_fall_after_star_grab(m) {
    if (m.pos[1] < m.waterLevel - 130) {
        play_sound(SOUND_ACTION_UNKNOWN430, m.marioObj.gfx.cameraToObject);
        m.particleFlags |= PARTICLE_WATER_SPLASH;
        return F.set_mario_action(m, ACT_STAR_DANCE_WATER, m.actionArg);
    }
    if (F.perform_air_step(m, 1) == AIR_STEP_LANDED) {
        F.play_mario_landing_sound(m, SOUND_ACTION_TERRAIN_LANDING);
        F.set_mario_action(m, m.actionArg & 1 ? ACT_STAR_DANCE_NO_EXIT : ACT_STAR_DANCE_EXIT, m.actionArg);
    }
    F.set_mario_animation(m, MARIO_ANIM_GENERAL_FALL);
    return false;
}
function common_death_handler(m, animation, frameToDeathWarp) {
    let animFrame = F.set_mario_animation(m, animation);
    if (animFrame == frameToDeathWarp) {
        F.level_trigger_warp(m, WARP_OP_DEATH);
    }
    m.marioBodyState.eyeState = MARIO_EYES_DEAD;
    F.stop_and_set_height_to_floor(m);
    return animFrame;
}
function act_standing_death(m) {
    if (m.input & INPUT_IN_POISON_GAS) {
        return F.set_mario_action(m, ACT_SUFFOCATION, 0);
    }
    F.play_sound_if_no_flag(m, SOUND_MARIO_DYING, MARIO_ACTION_SOUND_PLAYED);
    common_death_handler(m, MARIO_ANIM_DYING_FALL_OVER, 80);
    if (m.marioObj.gfx.anim.frame == 77) {
        F.play_mario_landing_sound(m, SOUND_ACTION_TERRAIN_BODY_HIT_GROUND);
    }
    return false;
}
function act_electrocution(m) {
    F.play_sound_if_no_flag(m, SOUND_MARIO_DYING, MARIO_ACTION_SOUND_PLAYED);
    common_death_handler(m, MARIO_ANIM_ELECTROCUTION, 43);
    return false;
}
function act_suffocation(m) {
    F.play_sound_if_no_flag(m, SOUND_MARIO_DYING, MARIO_ACTION_SOUND_PLAYED);
    common_death_handler(m, MARIO_ANIM_SUFFOCATING, 86);
    return false;
}
function act_death_on_back(m) {
    F.play_sound_if_no_flag(m, SOUND_MARIO_DYING, MARIO_ACTION_SOUND_PLAYED);
    if (common_death_handler(m, MARIO_ANIM_DYING_ON_BACK, 54) == 40) {
        F.play_mario_heavy_landing_sound(m, SOUND_ACTION_TERRAIN_BODY_HIT_GROUND);
    }
    return false;
}
function act_death_on_stomach(m) {
    F.play_sound_if_no_flag(m, SOUND_MARIO_DYING, MARIO_ACTION_SOUND_PLAYED);
    if (common_death_handler(m, MARIO_ANIM_DYING_ON_STOMACH, 37) == 37) {
        F.play_mario_heavy_landing_sound(m, SOUND_ACTION_TERRAIN_BODY_HIT_GROUND);
    }
    return false;
}
function act_quicksand_death(m) {
    if (m.actionState == 0) {
        F.set_mario_animation(m, MARIO_ANIM_DYING_IN_QUICKSAND);
        F.set_anim_to_frame(m, 60);
        m.actionState = 1;
    }
    if (m.actionState == 1) {
        if (m.quicksandDepth >= 100.0) {
            F.play_sound_if_no_flag(m, SOUND_MARIO_WAAAOOOW, MARIO_ACTION_SOUND_PLAYED);
        }
        if ((m.quicksandDepth += 5.0) >= 180.0) {
            F.level_trigger_warp(m, WARP_OP_DEATH);
            m.actionState = 2;
        }
    }
    F.stationary_ground_step(m);
    play_sound(SOUND_MOVING_QUICKSAND_DEATH, m.marioObj.gfx.cameraToObject);
    return false;
}
function act_eaten_by_bubba(m) {
    F.play_sound_if_no_flag(m, SOUND_MARIO_DYING, MARIO_ACTION_SOUND_PLAYED);
    F.set_mario_animation(m, MARIO_ANIM_A_POSE);
    m.marioObj.gfx.flags &= ~GRAPH_RENDER_ACTIVE;
    m.health = 0xFF;
    if (m.actionTimer++ == 60) {
        F.level_trigger_warp(m, WARP_OP_DEATH);
    }
    return false;
}
function launch_mario_until_land(m, endAction, animation, forwardVel) {
    let airStepLanded = 0;
    F.mario_set_forward_vel(m, forwardVel);
    F.set_mario_animation(m, animation);
    airStepLanded = (F.perform_air_step(m, 0) == AIR_STEP_LANDED);
    if (airStepLanded) {
        F.set_mario_action(m, endAction, 0);
    }
    return airStepLanded;
}
function act_unlocking_key_door(m) {
    m.faceAngle[1] = s16(m.usedObj.oMoveAngleYaw);
    m.pos[0] = m.usedObj.oPosX + coss(m.faceAngle[1]) * 75.0;
    m.pos[2] = m.usedObj.oPosZ + sins(m.faceAngle[1]) * 75.0;
    if (m.actionArg & 2) {
        m.faceAngle[1] = s16(m.faceAngle[1] + (0x8000));
    }
    if (m.actionTimer == 0) {
        spawn_obj_at_mario_rel_yaw(m, MODEL_BOWSER_KEY_CUTSCENE,B.bhvBowserKeyUnlockDoor, 0);
        F.set_mario_animation(m, MARIO_ANIM_UNLOCK_DOOR);
    }
    switch (m.marioObj.gfx.anim.frame) {
        case 79:
            play_sound(SOUND_GENERAL_DOOR_INSERT_KEY, m.marioObj.gfx.cameraToObject);
            break;
        case 111:
            play_sound(SOUND_GENERAL_DOOR_TURN_KEY, m.marioObj.gfx.cameraToObject);
            break;
    }
    F.update_mario_pos_for_anim(m);
    F.stop_and_set_height_to_floor(m);
    if (F.is_anim_at_end(m)) {
        if (m.usedObj.oBhvParams >> 24 == 1) {
            F.save_file_set_flags(SAVE_FLAG_UNLOCKED_UPSTAIRS_DOOR);
            F.save_file_clear_flags(SAVE_FLAG_HAVE_KEY_2);
        } else {
            F.save_file_set_flags(SAVE_FLAG_UNLOCKED_BASEMENT_DOOR);
            F.save_file_clear_flags(SAVE_FLAG_HAVE_KEY_1);
        }
        F.set_mario_action(m, ACT_WALKING, 0);
    }
    m.actionTimer++;
    return false;
}
function act_unlocking_star_door(m) {
    switch (m.actionState) {
        case 0:
            m.faceAngle[1] = s16(m.usedObj.oMoveAngleYaw);
            if (m.actionArg & 2) {
                m.faceAngle[1] = s16(m.faceAngle[1] + (0x8000));
            }
            m.marioObj.oMarioReadingSignDPosX = m.pos[0];
            m.marioObj.oMarioReadingSignDPosZ = m.pos[2];
            F.set_mario_animation(m, MARIO_ANIM_SUMMON_STAR);
            m.actionState++;
            break;
        case 1:
            if (F.is_anim_at_end(m)) {
                spawn_object(m.marioObj, MODEL_STAR,B.bhvUnlockDoorStar);
                m.actionState++;
            }
            break;
        case 2:
            if (m.actionTimer++ == 70) {
                F.set_mario_animation(m, MARIO_ANIM_RETURN_STAR_APPROACH_DOOR);
                m.actionState++;
            }
            break;
        case 3:
            if (F.is_anim_at_end(m)) {
                F.save_file_set_flags(F.get_door_save_file_flag(m.usedObj));
                F.set_mario_action(m, ACT_READING_AUTOMATIC_DIALOG, DIALOG_038);
            }
            break;
    }
    m.pos[0] = m.marioObj.oMarioReadingSignDPosX;
    m.pos[2] = m.marioObj.oMarioReadingSignDPosZ;
    F.update_mario_pos_for_anim(m);
    F.stop_and_set_height_to_floor(m);
    return false;
}
function act_entering_star_door(m) {
    let targetDX = 0;
    let targetDZ = 0;
    let targetAngle = 0;
    if (m.actionTimer++ == 0) {
        m.interactObj.oInteractStatus = INT_STATUS_UNK16;
        targetAngle = s16(m.usedObj.oMoveAngleYaw + 0x1555);
        if (m.actionArg & 2) {
            targetAngle = s16(targetAngle + (0x5556));
        }
        targetDX = m.usedObj.oPosX + 150.0 * sins(targetAngle) - m.pos[0];
        targetDZ = m.usedObj.oPosZ + 150.0 * coss(targetAngle) - m.pos[2];
        m.marioObj.oMarioReadingSignDPosX = targetDX / 20.0;
        m.marioObj.oMarioReadingSignDPosZ = targetDZ / 20.0;
        m.faceAngle[1] = s16(atan2s(targetDZ, targetDX));
    }
    if (m.actionTimer < 15) {
        F.set_mario_animation(m, MARIO_ANIM_FIRST_PERSON);
    }
    else if (m.actionTimer < 35) {
        m.pos[0] += m.marioObj.oMarioReadingSignDPosX;
        m.pos[2] += m.marioObj.oMarioReadingSignDPosZ;
        F.set_mario_anim_with_accel(m, MARIO_ANIM_WALKING, 0x00028000);
    }
    else {
        m.faceAngle[1] = s16(m.usedObj.oMoveAngleYaw);
        if (m.actionArg & 2) {
            m.faceAngle[1] = s16(m.faceAngle[1] + (0x8000));
        }
        m.pos[0] += 12.0 * sins(m.faceAngle[1]);
        m.pos[2] += 12.0 * coss(m.faceAngle[1]);
        F.set_mario_anim_with_accel(m, MARIO_ANIM_WALKING, 0x00028000);
    }
    F.stop_and_set_height_to_floor(m);
    if (m.actionTimer == 48) {
        F.set_mario_action(m, ACT_IDLE, 0);
    }
    return false;
}
function act_going_through_door(m) {
    if (m.actionTimer == 0) {
        if (m.actionArg & 1) {
            m.interactObj.oInteractStatus = INT_STATUS_UNK16;
            F.set_mario_animation(m, MARIO_ANIM_PULL_DOOR_WALK_IN);
        } else {
            m.interactObj.oInteractStatus = INT_STATUS_UNK17;
            F.set_mario_animation(m, MARIO_ANIM_PUSH_DOOR_WALK_IN);
        }
    }
    m.faceAngle[1] = s16(m.usedObj.oMoveAngleYaw);
    m.pos[0] = m.usedObj.oPosX;
    m.pos[2] = m.usedObj.oPosZ;
    F.update_mario_pos_for_anim(m);
    F.stop_and_set_height_to_floor(m);
    if (m.actionArg & 4) {
        if (m.actionTimer == 16) {
            F.level_trigger_warp(m, WARP_OP_WARP_DOOR);
        }
    } else if (F.is_anim_at_end(m)) {
        if (m.actionArg & 2) {
            m.faceAngle[1] = s16(m.faceAngle[1] + (0x8000));
        }
        F.set_mario_action(m, ACT_IDLE, 0);
    }
    m.actionTimer++;
    return false;
}
function act_warp_door_spawn(m) {
    if (m.actionState == 0) {
        m.actionState = 1;
        if (m.actionArg & 1) {
            m.usedObj.oInteractStatus = INT_STATUS_UNK18;
        } else {
            m.usedObj.oInteractStatus = INT_STATUS_UNK19;
        }
    } else if (m.usedObj.oAction == 0) {
        if (W.gNeverEnteredCastle == true && W.gCurrLevelNum == LEVEL_CASTLE) {
            F.set_mario_action(m, ACT_READING_AUTOMATIC_DIALOG, DIALOG_021);
        } else {
            F.set_mario_action(m, ACT_IDLE, 0);
        }
    }
    F.set_mario_animation(m, MARIO_ANIM_FIRST_PERSON);
    F.stop_and_set_height_to_floor(m);
    return false;
}
function act_emerge_from_pipe(m) {
    let marioObj = m.marioObj;
    if (m.actionTimer++ < 11) {
        marioObj.gfx.flags &= ~GRAPH_RENDER_ACTIVE;
        return false;
    }
    marioObj.gfx.flags |= GRAPH_RENDER_ACTIVE;
    F.play_sound_if_no_flag(m, SOUND_MARIO_YAHOO, MARIO_MARIO_SOUND_PLAYED);
    if (W.gCurrLevelNum == LEVEL_THI) {
        if (W.gCurrAreaIndex == 2) {
            F.play_sound_if_no_flag(m, SOUND_MENU_EXIT_PIPE, MARIO_ACTION_SOUND_PLAYED);
        } else {
            F.play_sound_if_no_flag(m, SOUND_MENU_ENTER_PIPE, MARIO_ACTION_SOUND_PLAYED);
        }
    }
    if (launch_mario_until_land(m, ACT_JUMP_LAND_STOP, MARIO_ANIM_SINGLE_JUMP, 8.0)) {
        F.mario_set_forward_vel(m, 0.0);
        F.play_mario_landing_sound(m, SOUND_ACTION_TERRAIN_LANDING);
    }
    return false;
}
function act_spawn_spin_airborne(m) {
    if (m.pos[1] < m.waterLevel - 100) {
        F.load_level_init_text(0);
        return F.set_water_plunge_action(m);
    }
    F.mario_set_forward_vel(m, m.forwardVel);
    if (F.perform_air_step(m, 0.0) == AIR_STEP_LANDED) {
        F.play_mario_landing_sound(m, SOUND_ACTION_TERRAIN_LANDING);
        F.set_mario_action(m, ACT_SPAWN_SPIN_LANDING, 0);
    }
    if (m.actionState == 0 && m.pos[1] - m.floorHeight > 300.0) {
        if (F.set_mario_animation(m, MARIO_ANIM_FORWARD_SPINNING) == 0) { 
            play_sound(SOUND_ACTION_SPIN, m.marioObj.gfx.cameraToObject);
        }
    }
    else {
        m.actionState = 1;
        F.set_mario_animation(m, MARIO_ANIM_GENERAL_FALL);
    }
    return false;
}
function act_spawn_spin_landing(m) {
    F.stop_and_set_height_to_floor(m);
    F.set_mario_animation(m, MARIO_ANIM_GENERAL_LAND);
    if (F.is_anim_at_end(m)) {
        F.load_level_init_text(0);
        F.set_mario_action(m, ACT_IDLE, 0);
    }
    return false;
}
function act_exit_airborne(m) {
    if (15 < m.actionTimer++ && launch_mario_until_land(m, ACT_EXIT_LAND_SAVE_DIALOG, MARIO_ANIM_GENERAL_FALL, -32.0)) {
        m.healCounter = 31;
    }
    m.marioObj.gfx.angle[1] = s16(m.marioObj.gfx.angle[1] + (0x8000));
    m.particleFlags |= PARTICLE_SPARKLES;
    return false;
}
function act_falling_exit_airborne(m) {
    if (launch_mario_until_land(m, ACT_EXIT_LAND_SAVE_DIALOG, MARIO_ANIM_GENERAL_FALL, 0.0)) {
        m.healCounter = 31;
    }
    m.marioObj.gfx.angle[1] = s16(m.marioObj.gfx.angle[1] + (0x8000));
    m.particleFlags |= PARTICLE_SPARKLES;
    return false;
}
function act_exit_land_save_dialog(m) {
    let animFrame = 0;
    F.stationary_ground_step(m);
    F.play_mario_landing_sound_once(m, SOUND_ACTION_TERRAIN_LANDING);
    switch (m.actionState) {
        case 0:
            F.set_mario_animation(m, m.actionArg == 0 ? MARIO_ANIM_GENERAL_LAND : MARIO_ANIM_LAND_FROM_SINGLE_JUMP);
            if (F.is_anim_past_end(m)) {
                if (W.gLastCompletedCourseNum != COURSE_BITDW && W.gLastCompletedCourseNum != COURSE_BITFS) {
                    F.enable_time_stop();
                }
                F.set_menu_mode(MENU_MODE_RENDER_COURSE_COMPLETE_SCREEN);
                W.gSaveOptSelectIndex = MENU_OPT_NONE;
                m.actionState = 3; 
                if (!(m.flags & MARIO_CAP_ON_HEAD)) {
                    m.actionState = 2; 
                }
                if (W.gLastCompletedCourseNum == COURSE_BITDW || W.gLastCompletedCourseNum == COURSE_BITFS) {
                    m.actionState = 1; 
                }
            }
            break;
        case 1:
            animFrame = F.set_mario_animation(m, MARIO_ANIM_THROW_CATCH_KEY);
            switch (animFrame) {
                case -1:
                    spawn_obj_at_mario_rel_yaw(m, MODEL_BOWSER_KEY_CUTSCENE,B.bhvBowserKeyCourseExit, -32768);
                case 67:
                    play_sound(SOUND_ACTION_KEY_SWISH, m.marioObj.gfx.cameraToObject);
                case 83:
                    play_sound(SOUND_ACTION_PAT_BACK, m.marioObj.gfx.cameraToObject);
                case 111:
                    play_sound(SOUND_ACTION_UNKNOWN45C, m.marioObj.gfx.cameraToObject);
            }
            F.handle_save_menu(m);
            break;
        case 2:
            animFrame = F.set_mario_animation(m, MARIO_ANIM_MISSING_CAP);
            if ((animFrame >= 18 && animFrame < 55) || (animFrame >= 112 && animFrame < 134)) {
                m.marioBodyState.handState = MARIO_HAND_OPEN;
            }
            if (!(animFrame < 109) && animFrame < 154) {
                m.marioBodyState.eyeState = MARIO_EYES_HALF_CLOSED;
            }
            F.handle_save_menu(m);
            break;
        case 3:
            animFrame = F.set_mario_animation(m, MARIO_ANIM_TAKE_CAP_OFF_THEN_ON);
            switch (animFrame) {
                case 12:
                    cutscene_take_cap_off(m);
                    break;
                case 37:
                case 53:
                    play_sound(SOUND_ACTION_BRUSH_HAIR, m.marioObj.gfx.cameraToObject);
                    break;
                case 82:
                    cutscene_put_cap_on(m);
                    break;
            }
            F.handle_save_menu(m);
            break;
    }
    m.marioObj.gfx.angle[1] = s16(m.marioObj.gfx.angle[1] + (0x8000));
    return false;
}
function act_death_exit(m) {
    if (15 < m.actionTimer++ && launch_mario_until_land(m, ACT_DEATH_EXIT_LAND, MARIO_ANIM_GENERAL_FALL, -32.0)) {
        play_sound(SOUND_MARIO_OOOF2, m.marioObj.gfx.cameraToObject);
        m.numLives--;
        m.healCounter = 31;
    }
    m.health = 0x0100;
    return false;
}
function act_unused_death_exit(m) {
    if (launch_mario_until_land(m, ACT_FREEFALL_LAND_STOP, MARIO_ANIM_GENERAL_FALL, 0.0)) {
        play_sound(SOUND_MARIO_OOOF2, m.marioObj.gfx.cameraToObject);
        m.numLives--;
        m.healCounter = 31;
    }
    m.health = 0x0100;
    return false;
}
function act_falling_death_exit(m) {
    if (launch_mario_until_land(m, ACT_DEATH_EXIT_LAND, MARIO_ANIM_GENERAL_FALL, 0.0)) {
        play_sound(SOUND_MARIO_OOOF2, m.marioObj.gfx.cameraToObject);
        m.numLives--;
        m.healCounter = 31;
    }
    m.health = 0x0100;
    return false;
}
function act_special_exit_airborne(m) {
    let marioObj = m.marioObj;
    F.play_sound_if_no_flag(m, SOUND_MARIO_YAHOO, MARIO_MARIO_SOUND_PLAYED);
    if (m.actionTimer++ < 11) {
        marioObj.gfx.flags &= ~GRAPH_RENDER_ACTIVE;
        return false;
    }
    if (launch_mario_until_land(m, ACT_EXIT_LAND_SAVE_DIALOG, MARIO_ANIM_SINGLE_JUMP, -24.0)) {
        m.healCounter = 31;
        m.actionArg = 1;
    }
    m.particleFlags |= PARTICLE_SPARKLES;
    marioObj.gfx.angle[1] = s16(marioObj.gfx.angle[1] + (0x8000));
    marioObj.gfx.flags |= GRAPH_RENDER_ACTIVE;
    return false;
}
function act_special_death_exit(m) {
    let marioObj = m.marioObj;
    if (m.actionTimer++ < 11) {
        marioObj.gfx.flags &= ~GRAPH_RENDER_ACTIVE;
        return false;
    }
    if (launch_mario_until_land(m, ACT_HARD_BACKWARD_GROUND_KB, MARIO_ANIM_BACKWARD_AIR_KB, -24.0)) {
        m.numLives--;
        m.healCounter = 31;
    }
    marioObj.gfx.flags |= GRAPH_RENDER_ACTIVE;
    m.health = 0x0100;
    return false;
}
function act_spawn_no_spin_airborne(m) {
    launch_mario_until_land(m, ACT_SPAWN_NO_SPIN_LANDING, MARIO_ANIM_GENERAL_FALL, 0.0);
    if (m.pos[1] < m.waterLevel - 100) {
        F.set_water_plunge_action(m);
    }
    return false;
}
function act_spawn_no_spin_landing(m) {
    F.play_mario_landing_sound_once(m, SOUND_ACTION_TERRAIN_LANDING);
    F.set_mario_animation(m, MARIO_ANIM_GENERAL_LAND);
    F.stop_and_set_height_to_floor(m);
    if (F.is_anim_at_end(m)) {
        F.load_level_init_text(0);
        F.set_mario_action(m, ACT_IDLE, 0);
    }
    return false;
}
function act_bbh_enter_spin(m) {
    let floorDist = 0;
    let scale = 0;
    let cageDX = 0;
    let cageDZ = 0;
    let cageDist = 0;
    let forwardVel = 0;
    cageDX = m.usedObj.oPosX - m.pos[0];
    cageDZ = m.usedObj.oPosZ - m.pos[2];
    cageDist = Math.sqrt(cageDX * cageDX + cageDZ * cageDZ);
    if (cageDist > 20.0) {
        forwardVel = 10.0;
    } else {
        forwardVel = cageDist / 2.0;
    }
    if (forwardVel < 0.5) {
        forwardVel = 0.0;
    }
    switch (m.actionState) {
        case 0:
            floorDist = 512.0 - (m.pos[1] - m.floorHeight);
            m.vel[1] = floorDist > 0 ? Math.sqrt(4.0 * floorDist + 1.0) - 1.0 : 2.0;
            m.actionState = 1;
            m.actionTimer = 100;
        case 1:
            m.faceAngle[1] = s16(atan2s(cageDZ, cageDX));
            F.mario_set_forward_vel(m, forwardVel);
            if (F.set_mario_animation(m, MARIO_ANIM_FORWARD_SPINNING) == 0) {
                play_sound(SOUND_ACTION_SPIN, m.marioObj.gfx.cameraToObject);
            }
            m.flags &= ~MARIO_UNKNOWN_08;
            F.perform_air_step(m, 0);
            if (m.vel[1] <= 0) {
                m.actionState = 2;
            }
            break;
        case 2:
        case 3:
            m.faceAngle[1] = s16(atan2s(cageDZ, cageDX));
            F.mario_set_forward_vel(m, forwardVel);
            m.flags &= ~MARIO_UNKNOWN_08;
            if (F.perform_air_step(m, 0) == AIR_STEP_LANDED) {
                F.level_trigger_warp(m, WARP_OP_UNKNOWN_02);
                m.actionState = 4;
            }
            if (m.actionState == 2) {
                if (m.marioObj.gfx.anim.frame == 0) {
                    m.actionState = 3;
                }
            } else {
                F.play_sound_if_no_flag(m, SOUND_ACTION_SHRINK_INTO_BBH, MARIO_ACTION_SOUND_PLAYED);
                F.set_mario_animation(m, MARIO_ANIM_DIVE);
                m.marioObj.gfx.angle[0] = s16(atan2s(m.forwardVel, -m.vel[1]));
            }
            m.squishTimer = 0xFF;
            if (m.actionTimer >= 11) {
                m.actionTimer -= 6;
                scale = m.actionTimer / 100.0;
                vec3f_set(m.marioObj.gfx.scale, scale, scale, scale);
            }
            break;
        case 4:
            F.stop_and_set_height_to_floor(m);
            m.marioObj.gfx.flags |= GRAPH_RENDER_INVISIBLE;
            break;
    }
    return false;
}
function act_bbh_enter_jump(m) {
    let cageDX = 0;
    let cageDZ = 0;
    let cageDist = 0;
    F.play_mario_action_sound( m, m.flags & MARIO_METAL_CAP ? SOUND_ACTION_METAL_JUMP : SOUND_ACTION_TERRAIN_JUMP, 1);
    F.play_mario_jump_sound(m);
    if (m.actionState == 0) {
        cageDX = m.usedObj.oPosX - m.pos[0];
        cageDZ = m.usedObj.oPosZ - m.pos[2];
        cageDist = Math.sqrt(cageDX * cageDX + cageDZ * cageDZ);
        m.vel[1] = 60.0;
        m.faceAngle[1] = s16(atan2s(cageDZ, cageDX));
        F.mario_set_forward_vel(m, cageDist / 20.0);
        m.flags &= ~MARIO_UNKNOWN_08;
        m.actionState = 1;
    }
    F.set_mario_animation(m, MARIO_ANIM_DOUBLE_JUMP_RISE);
    F.perform_air_step(m, 0);
    if (m.vel[1] <= 0.0) {
        F.set_mario_action(m, ACT_BBH_ENTER_SPIN, 0);
    }
    return false;
}
function act_teleport_fade_out(m) {
    F.play_sound_if_no_flag(m, SOUND_ACTION_TELEPORT, MARIO_ACTION_SOUND_PLAYED);
    F.set_mario_animation(m, m.prevAction == ACT_CROUCHING ? MARIO_ANIM_CROUCHING : MARIO_ANIM_FIRST_PERSON);
    m.flags |= MARIO_TELEPORTING;
    if (m.actionTimer < 32) {
        m.fadeWarpOpacity = (-m.actionTimer << 3) + 0xF8;
    }
    if (m.actionTimer++ == 20) {
        F.level_trigger_warp(m, WARP_OP_TELEPORT);
    }
    F.stop_and_set_height_to_floor(m);
    return false;
}
function act_teleport_fade_in(m) {
    F.play_sound_if_no_flag(m, SOUND_ACTION_TELEPORT, MARIO_ACTION_SOUND_PLAYED);
    F.set_mario_animation(m, MARIO_ANIM_FIRST_PERSON);
    if (m.actionTimer < 32) {
        m.flags |= MARIO_TELEPORTING;
        m.fadeWarpOpacity = m.actionTimer << 3;
    } else {
        m.flags &= ~MARIO_TELEPORTING;
    }
    if (m.actionTimer++ == 32) {
        if (m.pos[1] < m.waterLevel - 100) {
            if (m.area.camera.mode != CAMERA_MODE_WATER_SURFACE) {
                F.set_camera_mode(m.area.camera, CAMERA_MODE_WATER_SURFACE, 1);
            }
            F.set_mario_action(m, ACT_WATER_IDLE, 0);
        } else {
            F.set_mario_action(m, ACT_IDLE, 0);
        }
    }
    F.stop_and_set_height_to_floor(m);
    return false;
}
function act_shocked(m) {
    F.play_sound_if_no_flag(m, SOUND_MARIO_WAAAOOOW, MARIO_ACTION_SOUND_PLAYED);
    play_sound(SOUND_MOVING_SHOCKED, m.marioObj.gfx.cameraToObject);
    F.set_camera_shake_from_hit(SHAKE_SHOCK);
    if (F.set_mario_animation(m, MARIO_ANIM_SHOCKED) == 0) {
        m.actionTimer++;
        m.flags |= MARIO_METAL_SHOCK;
    }
    if (m.actionArg == 0) {
        F.mario_set_forward_vel(m, 0.0);
        if (F.perform_air_step(m, 1) == AIR_STEP_LANDED) {
            F.play_mario_landing_sound(m, SOUND_ACTION_TERRAIN_LANDING);
            m.actionArg = 1;
        }
    } else {
        if (m.actionTimer >= 6) {
            m.invincTimer = 30;
            F.set_mario_action(m, m.health < 0x0100 ? ACT_ELECTROCUTION : ACT_IDLE, 0);
        }
        F.stop_and_set_height_to_floor(m);
    }
    return false;
}
function act_squished(m) {
    let filler = new Array(4).fill(0);
    let squishAmount = 0;
    let spaceUnderCeil = 0;
    let surfAngle = 0;
    let underSteepSurf = false;
    if ((spaceUnderCeil = m.ceilHeight - m.floorHeight) < 0) {
        spaceUnderCeil = 0;
    }
    switch (m.actionState) {
        case 0:
            if (spaceUnderCeil > 160.0) {
                m.squishTimer = 0;
                return F.set_mario_action(m, ACT_IDLE, 0);
            }
            m.squishTimer = 0xFF;
            if (spaceUnderCeil >= 10.1) {
                squishAmount = spaceUnderCeil / 160.0;
                vec3f_set(m.marioObj.gfx.scale, 2.0 - squishAmount, squishAmount, 2.0 - squishAmount);
            } else {
                if (!(m.flags & MARIO_METAL_CAP) && m.invincTimer == 0) {
                    m.hurtCounter += m.flags & MARIO_CAP_ON_HEAD ? 12 : 18;
                    F.play_sound_if_no_flag(m, SOUND_MARIO_ATTACKED, MARIO_MARIO_SOUND_PLAYED);
                }
                vec3f_set(m.marioObj.gfx.scale, 1.8, 0.05, 1.8);
                m.actionState = 1;
            }
            break;
        case 1:
            if (spaceUnderCeil >= 30.0) {
                m.actionState = 2;
            }
            break;
        case 2:
            m.actionTimer++;
            if (m.actionTimer >= 15) {
                if (m.health < 0x0100) {
                    F.level_trigger_warp(m, WARP_OP_DEATH);
                    F.set_mario_action(m, ACT_DISAPPEARED, 0);
                } else if (m.hurtCounter == 0) {
                    m.squishTimer = 30;
                    F.set_mario_action(m, ACT_IDLE, 0);
                }
            }
            break;
    }
    if (m.floor != null && m.floor.ny < 0.5) {
        surfAngle = s16(atan2s(m.floor.nz, m.floor.nx));
        underSteepSurf = true;
    }
    if (m.ceil != null && -0.5 < m.ceil.ny) {
        surfAngle = s16(atan2s(m.ceil.nz, m.ceil.nx));
        underSteepSurf = true;
    }
    if (underSteepSurf) {
        m.vel[0] = sins(surfAngle) * 10.0;
        m.vel[2] = coss(surfAngle) * 10.0;
        m.vel[1] = 0;
        if (F.perform_ground_step(m) == GROUND_STEP_LEFT_GROUND) {
            m.squishTimer = 0;
            F.set_mario_action(m, ACT_IDLE, 0);
            return false;
        }
    }
    if (m.actionArg++ > 300) {
        m.health = 0x00FF;
        m.hurtCounter = 0;
        F.level_trigger_warp(m, WARP_OP_DEATH);
        F.set_mario_action(m, ACT_DISAPPEARED, 0);
    }
    F.stop_and_set_height_to_floor(m);
    F.set_mario_animation(m, MARIO_ANIM_A_POSE);
    return false;
}
function act_putting_on_cap(m) {
    let animFrame = F.set_mario_animation(m, MARIO_ANIM_PUT_CAP_ON);
    if (animFrame == 0) {
        F.enable_time_stop();
    }
    if (animFrame == 28) {
        cutscene_put_cap_on(m);
    }
    if (F.is_anim_at_end(m)) {
        F.set_mario_action(m, ACT_IDLE, 0);
        F.disable_time_stop();
    }
    F.stationary_ground_step(m);
    return false;
}
function stuck_in_ground_handler(m, animation, unstuckFrame, target2, target3, endAction) {
    let animFrame = F.set_mario_animation(m, animation);
    if (m.input & INPUT_A_PRESSED) {
        m.actionTimer++;
        if (m.actionTimer >= 5 && animFrame < unstuckFrame - 1) {
            animFrame = unstuckFrame - 1;
            F.set_anim_to_frame(m, animFrame);
        }
    }
    F.stop_and_set_height_to_floor(m);
    if (animFrame == -1) {
        F.play_sound_and_spawn_particles(m, SOUND_ACTION_TERRAIN_STUCK_IN_GROUND, 1);
    } else if (animFrame == unstuckFrame) {
        F.play_sound_and_spawn_particles(m, SOUND_ACTION_UNSTUCK_FROM_GROUND, 1);
    } else if (animFrame == target2 || animFrame == target3) {
        F.play_mario_landing_sound(m, SOUND_ACTION_TERRAIN_LANDING);
    }
    if (F.is_anim_at_end(m)) {
        F.set_mario_action(m, endAction, 0);
    }
}
function act_head_stuck_in_ground(m) {
    stuck_in_ground_handler(m, MARIO_ANIM_HEAD_STUCK_IN_GROUND, 96, 105, 135, ACT_IDLE);
    return false;
}
function act_butt_stuck_in_ground(m) {
    stuck_in_ground_handler(m, MARIO_ANIM_BOTTOM_STUCK_IN_GROUND, 127, 136, -2, ACT_GROUND_POUND_LAND);
    return false;
}
function act_feet_stuck_in_ground(m) {
    stuck_in_ground_handler(m, MARIO_ANIM_LEGS_STUCK_IN_GROUND, 116, 129, -2, ACT_IDLE);
    return false;
}
function advance_cutscene_step(m) {
    m.actionState = 0;
    m.actionTimer = 0;
    m.actionArg++;
}
function intro_cutscene_hide_hud_and_mario(m) {
    W.gHudDisplay.flags = HUD_DISPLAY_NONE;
    m.statusForCamera.cameraEvent = CAM_EVENT_START_INTRO;
    m.marioObj.gfx.flags &= ~GRAPH_RENDER_ACTIVE;
    advance_cutscene_step(m);
}
const TIMER_SPAWN_PIPE = 37;
function intro_cutscene_peach_lakitu_scene(m) {
    if (s16(m.statusForCamera.cameraEvent) != CAM_EVENT_START_INTRO) {
        if (m.actionTimer++ == TIMER_SPAWN_PIPE) {
            sIntroWarpPipeObj =
                spawn_object_abs_with_rot(W.gCurrentObject, 0, MODEL_CASTLE_GROUNDS_WARP_PIPE,B.bhvStaticObject, -1328, 60, 4664, 0, 180, 0);
            advance_cutscene_step(m);
        }
    }
}
const TIMER_RAISE_PIPE = 38;
function intro_cutscene_raise_pipe(m) {
    sIntroWarpPipeObj.oPosY = F.camera_approach_f32_symmetric(sIntroWarpPipeObj.oPosY, 260.0, 10.0);
    if (m.actionTimer == 0) {
        play_sound(SOUND_MENU_EXIT_PIPE, sIntroWarpPipeObj.gfx.cameraToObject);
    }
    if (m.actionTimer++ == TIMER_RAISE_PIPE) {
        m.vel[1] = 60.0;
        advance_cutscene_step(m);
    }
}
function intro_cutscene_jump_out_of_pipe(m) {
    if (m.actionTimer == 25) {
        W.gHudDisplay.flags = HUD_DISPLAY_DEFAULT;
    }
    if (m.actionTimer++ >= 118) {
        m.marioObj.gfx.flags |= GRAPH_RENDER_ACTIVE;
        F.play_sound_if_no_flag(m, SOUND_MARIO_YAHOO, MARIO_MARIO_SOUND_PLAYED);
        F.play_sound_if_no_flag(m, SOUND_ACTION_HIT_3, MARIO_ACTION_SOUND_PLAYED);
        F.set_mario_animation(m, MARIO_ANIM_SINGLE_JUMP);
        F.mario_set_forward_vel(m, 10.0);
        if (F.perform_air_step(m, 0) == AIR_STEP_LANDED) {
            sound_banks_enable(SEQ_PLAYER_SFX, SOUND_BANKS_DISABLED_DURING_INTRO_CUTSCENE);
            F.play_mario_landing_sound(m, SOUND_ACTION_TERRAIN_LANDING);
            play_sound(SOUND_MARIO_HAHA, m.marioObj.gfx.cameraToObject);
            advance_cutscene_step(m);
        }
    }
}
function intro_cutscene_land_outside_pipe(m) {
    F.set_mario_animation(m, MARIO_ANIM_LAND_FROM_SINGLE_JUMP);
    if (F.is_anim_at_end(m)) {
        advance_cutscene_step(m);
    }
    F.stop_and_set_height_to_floor(m);
}
function intro_cutscene_lower_pipe(m) {
    if (m.actionTimer++ == 0) {
        play_sound(SOUND_MENU_ENTER_PIPE, sIntroWarpPipeObj.gfx.cameraToObject);
        F.set_mario_animation(m, MARIO_ANIM_FIRST_PERSON);
    }
    sIntroWarpPipeObj.oPosY -= 5.0;
    if (sIntroWarpPipeObj.oPosY <= 50.0) {
        F.obj_mark_for_deletion(sIntroWarpPipeObj);
        advance_cutscene_step(m);
    }
    F.stop_and_set_height_to_floor(m);
}
function intro_cutscene_set_mario_to_idle(m) {
    if (W.gCamera.cutscene == 0) {
        W.gCameraMovementFlags &= ~CAM_MOVE_C_UP_MODE;
        F.set_mario_action(m, ACT_IDLE, 0);
    }
    F.stop_and_set_height_to_floor(m);
}
const INTRO_CUTSCENE_HIDE_HUD_AND_MARIO = 0;
const INTRO_CUTSCENE_PEACH_LAKITU_SCENE = INTRO_CUTSCENE_HIDE_HUD_AND_MARIO + 1;
const INTRO_CUTSCENE_RAISE_PIPE = INTRO_CUTSCENE_PEACH_LAKITU_SCENE + 1;
const INTRO_CUTSCENE_JUMP_OUT_OF_PIPE = INTRO_CUTSCENE_RAISE_PIPE + 1;
const INTRO_CUTSCENE_LAND_OUTSIDE_PIPE = INTRO_CUTSCENE_JUMP_OUT_OF_PIPE + 1;
const INTRO_CUTSCENE_LOWER_PIPE = INTRO_CUTSCENE_LAND_OUTSIDE_PIPE + 1;
const INTRO_CUTSCENE_SET_MARIO_TO_IDLE = INTRO_CUTSCENE_LOWER_PIPE + 1;
function act_intro_cutscene(m) {
    switch (m.actionArg) {
        case INTRO_CUTSCENE_HIDE_HUD_AND_MARIO:
            intro_cutscene_hide_hud_and_mario(m);
            break;
        case INTRO_CUTSCENE_PEACH_LAKITU_SCENE:
            intro_cutscene_peach_lakitu_scene(m);
            break;
        case INTRO_CUTSCENE_RAISE_PIPE:
            intro_cutscene_raise_pipe(m);
            break;
        case INTRO_CUTSCENE_JUMP_OUT_OF_PIPE:
            intro_cutscene_jump_out_of_pipe(m);
            break;
        case INTRO_CUTSCENE_LAND_OUTSIDE_PIPE:
            intro_cutscene_land_outside_pipe(m);
            break;
        case INTRO_CUTSCENE_LOWER_PIPE:
            intro_cutscene_lower_pipe(m);
            break;
        case INTRO_CUTSCENE_SET_MARIO_TO_IDLE:
            intro_cutscene_set_mario_to_idle(m);
            break;
    }
    return false;
}
function jumbo_star_cutscene_falling(m) {
    if (m.actionState == 0) {
        m.input |= INPUT_A_DOWN;
        m.flags |= (MARIO_WING_CAP | MARIO_CAP_ON_HEAD);
        m.faceAngle[1] = s16(-0x8000);
        m.pos[0] = 0.0;
        m.pos[2] = 0.0;
        F.mario_set_forward_vel(m, 0.0);
        F.set_mario_animation(m, MARIO_ANIM_GENERAL_FALL);
        if (F.perform_air_step(m, 1) == AIR_STEP_LANDED) {
            F.play_cutscene_music(SEQUENCE_ARGS(15, SEQ_EVENT_CUTSCENE_VICTORY));
            F.play_mario_landing_sound(m, SOUND_ACTION_TERRAIN_LANDING);
            m.actionState++;
        }
    } else {
        F.set_mario_animation(m, MARIO_ANIM_GENERAL_LAND);
        if (F.is_anim_at_end(m)) {
            m.statusForCamera.cameraEvent = CAM_EVENT_START_GRAND_STAR;
            advance_cutscene_step(m);
        }
    }
}
function jumbo_star_cutscene_taking_off(m) {
    let marioObj = m.marioObj;
    let animFrame = 0;
    if (m.actionState == 0) {
        F.set_mario_animation(m, MARIO_ANIM_FINAL_BOWSER_RAISE_HAND_SPIN);
        marioObj.rawData.asF32[0x22] = 0.0;
        if (F.is_anim_past_end(m)) {
            F.play_mario_landing_sound(m, SOUND_ACTION_TERRAIN_LANDING);
            m.actionState++;
        }
    } else {
        animFrame = F.set_mario_animation(m, MARIO_ANIM_FINAL_BOWSER_WING_CAP_TAKE_OFF);
        if (animFrame == 3 || animFrame == 28 || animFrame == 60) {
            F.play_sound_and_spawn_particles(m, SOUND_ACTION_TERRAIN_JUMP, 1);
        }
        if (animFrame >= 3) {
            marioObj.rawData.asF32[0x22] -= 32.0;
        }
        switch (animFrame) {
            case 3:
                play_sound(SOUND_MARIO_YAH_WAH_HOO + (W.gAudioRandom % 3 << 16), m.marioObj.gfx.cameraToObject);
                break;
            case 28:
                play_sound(SOUND_MARIO_HOOHOO, m.marioObj.gfx.cameraToObject);
                break;
            case 60:
                play_sound(SOUND_MARIO_YAHOO, m.marioObj.gfx.cameraToObject);
                break;
        }
        m.particleFlags |= PARTICLE_SPARKLES;
        if (F.is_anim_past_end(m)) {
            advance_cutscene_step(m);
        }
    }
    vec3f_set(m.pos, 0.0, 307.0, marioObj.rawData.asF32[0x22]);
    F.update_mario_pos_for_anim(m);
    vec3f_copy(marioObj.gfx.pos, m.pos);
    vec3s_set(marioObj.gfx.angle, 0, m.faceAngle[1], 0);
    return false;
}
function jumbo_star_cutscene_flying(m) {
    let targetPos = [0, 0, 0];
    let marioObj = m.marioObj;
    let targetDX = 0;
    let targetDY = 0;
    let targetDZ = 0;
    let targetHyp = 0;
    let targetAngle = 0;
    switch (m.actionState) {
        case 0:
            F.set_mario_animation(m, MARIO_ANIM_WING_CAP_FLY);
            F.anim_spline_init(sJumboStarKeyframes);
            m.actionState++;
        case 1:
            if (F.anim_spline_poll(targetPos)) {
                F.set_mario_action(m, ACT_FREEFALL, 0);
                m.actionState++;
            } else {
                targetDX = targetPos[0] - m.pos[0];
                targetDY = targetPos[1] - m.pos[1];
                targetDZ = targetPos[2] - m.pos[2];
                targetHyp = Math.sqrt(targetDX * targetDX + targetDZ * targetDZ);
                targetAngle = s16(atan2s(targetDZ, targetDX));
                vec3f_copy(m.pos, targetPos);
                m.marioObj.gfx.angle[0] = s16(-atan2s(targetHyp, targetDY));
                m.marioObj.gfx.angle[1] = s16(targetAngle);
                m.marioObj.gfx.angle[2] = s16(((m.faceAngle[1] - targetAngle) << 16 >> 16) * 20);
                m.faceAngle[1] = s16(targetAngle);
            }
            break;
        case 2:
            F.set_mario_action(m, ACT_FREEFALL, 0);
            break;
    }
    m.marioBodyState.handState = MARIO_HAND_RIGHT_OPEN;
    vec3f_copy(m.marioObj.gfx.pos, m.pos);
    m.particleFlags |= PARTICLE_SPARKLES;
    if (m.actionTimer++ == 500) {
        F.level_trigger_warp(m, WARP_OP_CREDITS_START);
    }
    return false;
}
const JUMBO_STAR_CUTSCENE_FALLING = 0;
const JUMBO_STAR_CUTSCENE_TAKING_OFF = JUMBO_STAR_CUTSCENE_FALLING + 1;
const JUMBO_STAR_CUTSCENE_FLYING = JUMBO_STAR_CUTSCENE_TAKING_OFF + 1;
function act_jumbo_star_cutscene(m) {
    switch (m.actionArg) {
        case JUMBO_STAR_CUTSCENE_FALLING:
            jumbo_star_cutscene_falling(m);
            break;
        case JUMBO_STAR_CUTSCENE_TAKING_OFF:
            jumbo_star_cutscene_taking_off(m);
            break;
        case JUMBO_STAR_CUTSCENE_FLYING:
            jumbo_star_cutscene_flying(m);
            break;
    }
    return false;
}
function generate_yellow_sparkles(x, y, z, radius) {
    let sSparkleGenTheta = 0;
    let sSparkleGenPhi = 0;
    let offsetX = s16(radius * coss(sSparkleGenTheta) * sins(sSparkleGenPhi));
    let offsetY = s16(radius * sins(sSparkleGenTheta));
    let offsetZ = s16(radius * coss(sSparkleGenTheta) * coss(sSparkleGenPhi));
    spawn_object_abs_with_rot(W.gCurrentObject, 0, MODEL_NONE,B.bhvSparkleSpawn, x + offsetX, y + offsetY, z + offsetZ, 0, 0, 0);
    offsetX = s16(offsetX * 4 / 3);
    offsetX = s16(offsetY * 4 / 3);
    offsetX = s16(offsetZ * 4 / 3);
    spawn_object_abs_with_rot(W.gCurrentObject, 0, MODEL_NONE,B.bhvSparkleSpawn, x - offsetX, y - offsetY, z - offsetZ, 0, 0, 0);
    sSparkleGenTheta += 0x3800;
    sSparkleGenPhi += 0x6000;
}
function end_obj_set_visual_pos(o) {
    let surf = null;
    let sp24 = [0, 0, 0];
    let sp20 = 0;
    let sp1C = 0;
    let sp18 = 0;
    F.find_mario_anim_flags_and_translation(o, o.gfx.angle[1], sp24);
    sp20 = o.gfx.pos[0] + sp24[0];
    sp1C = o.gfx.pos[1] + 10.0;
    sp18 = o.gfx.pos[2] + sp24[2];
    return F.find_floor(sp20, sp1C, sp18, $ => surf = $);
}
function end_peach_cutscene_mario_falling(m) {
    if (m.actionTimer == 1) {
        m.statusForCamera.cameraEvent = CAM_EVENT_START_ENDING;
    }
    m.input |= INPUT_A_DOWN;
    m.flags |= (MARIO_WING_CAP | MARIO_CAP_ON_HEAD);
    F.set_mario_animation(m, MARIO_ANIM_GENERAL_FALL);
    F.mario_set_forward_vel(m, 0.0);
    if (F.perform_air_step(m, 0) == AIR_STEP_LANDED) {
        F.play_mario_landing_sound(m, SOUND_ACTION_TERRAIN_LANDING);
        advance_cutscene_step(m);
    }
}
function end_peach_cutscene_mario_landing(m) {
    F.set_mario_animation(m, MARIO_ANIM_GENERAL_LAND);
    F.stop_and_set_height_to_floor(m);
    if (F.is_anim_at_end(m)) {
        m.capTimer = 60;
        sEndJumboStarObj = spawn_object_abs_with_rot(W.gCurrentObject, 0, MODEL_STAR,B.bhvStaticObject, 0, 2528, -1800, 0, 0, 0);
        F.obj_scale(sEndJumboStarObj, 3.0);
        advance_cutscene_step(m);
    }
}
function end_peach_cutscene_summon_jumbo_star(m) {
    F.set_mario_animation(m, m.actionState == 0 ? MARIO_ANIM_CREDITS_RAISE_HAND : MARIO_ANIM_CREDITS_LOWER_HAND);
    if (m.actionState == 0 && F.is_anim_past_end(m)) {
        m.actionState++;
    }
    if (m.actionTimer == 90) {
        F.play_cutscene_music(SEQUENCE_ARGS(0, SEQ_EVENT_CUTSCENE_ENDING));
    }
    if (m.actionTimer == 255) {
        advance_cutscene_step(m);
    }
    sEndJumboStarObj.oFaceAngleYaw += 0x400;
    generate_yellow_sparkles(0, 2528, -1800, 250.0);
    play_sound(SOUND_AIR_PEACH_TWINKLE, sEndJumboStarObj.gfx.cameraToObject);
}
const TIMER_FADE_IN_PEACH = 276;
const TIMER_DESCEND_PEACH = 355;
function end_peach_cutscene_spawn_peach(m) {
    if (m.actionTimer == 1) {
        F.play_transition(WARP_TRANSITION_FADE_INTO_COLOR, 14, 255, 255, 255);
    }
    if (m.actionTimer == 2) {
        play_sound(SOUND_MENU_STAR_SOUND, W.gGlobalSoundSource);
    }
    if (m.actionTimer == 44) {
        F.play_transition(WARP_TRANSITION_FADE_FROM_COLOR, 192, 255, 255, 255);
    }
    if (m.actionTimer == 40) {
        F.obj_mark_for_deletion(sEndJumboStarObj);
        sEndPeachObj = spawn_object_abs_with_rot(W.gCurrentObject, 0, MODEL_PEACH,B.bhvEndPeach, 0, 2428, -1300, 0, 0, 0);
        W.gCutsceneFocus = sEndPeachObj;
        sEndRightToadObj = spawn_object_abs_with_rot(W.gCurrentObject, 0, MODEL_TOAD,B.bhvEndToad, 200, 906, -1290, 0, 0, 0);
        sEndLeftToadObj = spawn_object_abs_with_rot(W.gCurrentObject, 0, MODEL_TOAD,B.bhvEndToad, -200, 906, -1290, 0, 0, 0);
        sEndPeachObj.oOpacity = 127;
        sEndRightToadObj.oOpacity = 255;
        sEndLeftToadObj.oOpacity = 255;
        D_8032CBE4 = 4;
        sEndPeachAnimation = 4;
        sEndToadAnims[0] = 4;
        sEndToadAnims[1] = 5;
    }
    if (m.actionTimer >= TIMER_FADE_IN_PEACH) {
        sEndPeachObj.oOpacity = F.camera_approach_f32_symmetric(sEndPeachObj.oOpacity, 255.0, 2.0);
    }
    if (m.actionTimer >= 40) {
        generate_yellow_sparkles(0, 2628, -1300, 150.0);
    }
    if (m.actionTimer == TIMER_DESCEND_PEACH) {
        advance_cutscene_step(m);
    }
    if (m.actionTimer >= 40) {
        play_sound(SOUND_AIR_PEACH_TWINKLE, sEndPeachObj.gfx.cameraToObject);
    }
}
const TIMER_RUN_TO_PEACH = 584;
function end_peach_cutscene_descend_peach(m) {
    generate_yellow_sparkles(0, sEndPeachObj.oPosY, -1300, 150.0);
    if (sEndPeachObj.oPosY >= 1300.0) {
        if (m.actionState < 60) {
            m.actionState += 5;
        }
    } else {
        if (m.actionState >= 27) {
            m.actionState -= 2;
        }
        F.set_mario_animation(m, MARIO_ANIM_CREDITS_RETURN_FROM_LOOK_UP);
    }
    if ((sEndPeachObj.oPosY -= m.actionState / 10) <= 907.0) {
        sEndPeachObj.oPosY = 906.0;
    }
    play_sound(SOUND_AIR_PEACH_TWINKLE, sEndPeachObj.gfx.cameraToObject);
    if (m.actionTimer >= TIMER_RUN_TO_PEACH) {
        advance_cutscene_step(m);
    }
}
function end_peach_cutscene_run_to_peach(m) {
    let surf = null;
    if (m.actionTimer == 22) {
        sEndPeachAnimation = 5;
    }
    if ((m.pos[2] -= 20.0) <= -1181.0) {
        m.pos[2] = -1180.0;
        advance_cutscene_step(m);
    }
    m.pos[1] = F.find_floor(m.pos[0], m.pos[1], m.pos[2], $ => surf = $);
    F.set_mario_anim_with_accel(m, MARIO_ANIM_RUNNING, 0x00080000);
    F.play_step_sound(m, 9, 45);
    vec3f_copy(m.marioObj.gfx.pos, m.pos);
    m.particleFlags |= PARTICLE_DUST;
}
function end_peach_cutscene_dialog_1(m) {
    let animFrame = F.set_mario_animation(m, m.actionState == 0 ? MARIO_ANIM_CREDITS_TAKE_OFF_CAP : MARIO_ANIM_CREDITS_LOOK_UP);
    if (m.actionState == 0) {
        if (animFrame == 8) {
            cutscene_take_cap_off(m);
        }
        if (F.is_anim_at_end(m)) {
            m.actionState++;
        }
    }
    switch (m.actionTimer) {
        case 80:
            sEndPeachAnimation = 6;
            break;
        case 81:
            D_8032CBE4 = 3;
            break;
        case 145:
            D_8032CBE4 = 2;
            break;
        case 228:
            D_8032CBE4 = 1;
            D_8032CBE8 = 1;
            break;
        case 230:
            F.set_cutscene_message(160, 227, 0, 30);
            seq_player_lower_volume(SEQ_PLAYER_LEVEL, 60, 40);
            play_sound(SOUND_PEACH_MARIO, sEndPeachObj.gfx.cameraToObject);
            break;
        case 275:
            D_8032CBE4 = 0;
            D_8032CBE8 = 0;
            break;
        case 290:
            F.set_cutscene_message(160, 227, 1, 60);
            play_sound(SOUND_PEACH_POWER_OF_THE_STARS, sEndPeachObj.gfx.cameraToObject);
            break;
        case 480:
            advance_cutscene_step(m);
            break;
    }
}
const TIMER_SOMETHING_SPECIAL = 130;
const TIMER_PEACH_KISS = 200;
function end_peach_cutscene_dialog_2(m) {
    sEndPeachAnimation = 9;
    switch (m.actionTimer) {
        case 29:
            F.set_cutscene_message(160, 227, 2, 30);
            play_sound(SOUND_PEACH_THANKS_TO_YOU, sEndPeachObj.gfx.cameraToObject);
            break;
        case 45:
            D_8032CBE8 = 1;
            break;
        case 75:
            F.set_cutscene_message(160, 227, 3, 30);
            play_sound(SOUND_PEACH_THANK_YOU_MARIO, sEndPeachObj.gfx.cameraToObject);
            break;
        case TIMER_SOMETHING_SPECIAL:
            F.set_cutscene_message(160, 227, 4, 40);
            play_sound(SOUND_PEACH_SOMETHING_SPECIAL, sEndPeachObj.gfx.cameraToObject);
            break;
        case TIMER_PEACH_KISS:
            advance_cutscene_step(m);
            break;
    }
}
let sMarioBlinkOverride = [MARIO_EYES_HALF_CLOSED, MARIO_EYES_HALF_CLOSED, MARIO_EYES_CLOSED, MARIO_EYES_CLOSED, MARIO_EYES_HALF_CLOSED, MARIO_EYES_HALF_CLOSED, MARIO_EYES_OPEN, MARIO_EYES_OPEN, MARIO_EYES_HALF_CLOSED, MARIO_EYES_HALF_CLOSED, MARIO_EYES_CLOSED, MARIO_EYES_CLOSED, MARIO_EYES_HALF_CLOSED, MARIO_EYES_HALF_CLOSED, MARIO_EYES_OPEN, MARIO_EYES_OPEN, MARIO_EYES_HALF_CLOSED, MARIO_EYES_HALF_CLOSED, MARIO_EYES_CLOSED, MARIO_EYES_CLOSED];
function end_peach_cutscene_kiss_from_peach(m) {
    sEndPeachAnimation = 10;
    if (m.actionTimer >= 90) {
        m.marioBodyState.eyeState =
            m.actionTimer < 110 ? sMarioBlinkOverride[m.actionTimer - 90] : MARIO_EYES_HALF_CLOSED;
    }
    switch (m.actionTimer) {
        case 8:
            D_8032CBE8 = 0;
            break;
        case 10:
            D_8032CBE4 = 3;
            break;
        case 50:
            D_8032CBE4 = 4;
            break;
        case 75:
            m.marioBodyState.eyeState = MARIO_EYES_HALF_CLOSED;
            break;
        case 76:
            m.marioBodyState.eyeState = MARIO_EYES_CLOSED;
            break;
        case 100:
            D_8032CBE4 = 3;
            break;
        case 136:
            D_8032CBE4 = 0;
            break;
        case 140:
            advance_cutscene_step(m);
            break;
    }
}
function end_peach_cutscene_star_dance(m) {
    let animFrame = F.set_mario_animation(m, MARIO_ANIM_CREDITS_PEACE_SIGN);
    if (animFrame == 77) {
        cutscene_put_cap_on(m);
    }
    if (animFrame == 88) {
        play_sound(SOUND_MARIO_HERE_WE_GO, m.marioObj.gfx.cameraToObject);
    }
    if (animFrame >= 98) {
        m.marioBodyState.handState = MARIO_HAND_PEACE_SIGN;
    }
    if (m.actionTimer < 52) {
        m.marioBodyState.eyeState = MARIO_EYES_HALF_CLOSED;
    }
    switch (m.actionTimer) {
        case 70:
            D_8032CBE4 = 1;
            break;
        case 86:
            D_8032CBE4 = 2;
            break;
        case 90:
            D_8032CBE4 = 3;
            break;
        case 120:
            D_8032CBE4 = 0;
            break;
        case 140:
            seq_player_unlower_volume(SEQ_PLAYER_LEVEL, 60);
            F.play_cutscene_music(SEQUENCE_ARGS(15, SEQ_EVENT_CUTSCENE_CREDITS));
            break;
        case 142:
            advance_cutscene_step(m);
            break;
    }
}
function end_peach_cutscene_dialog_3(m) {
    F.set_mario_animation(m, MARIO_ANIM_FIRST_PERSON);
    sEndPeachObj.oPosY = end_obj_set_visual_pos(sEndPeachObj);
    sEndRightToadObj.oPosY = end_obj_set_visual_pos(sEndRightToadObj);
    sEndLeftToadObj.oPosY = end_obj_set_visual_pos(sEndLeftToadObj);
    switch (m.actionTimer) {
        case 1:
            sEndPeachAnimation = 0;
            sEndToadAnims[0] = 0;
            sEndToadAnims[1] = 2;
            D_8032CBE8 = 1;
            F.set_cutscene_message(160, 227, 5, 30);
            play_sound(SOUND_PEACH_BAKE_A_CAKE, sEndPeachObj.gfx.cameraToObject);
            break;
        case 55:
            F.set_cutscene_message(160, 227, 6, 40);
            break;
        case 130:
            F.set_cutscene_message(160, 227, 7, 50);
            play_sound(SOUND_PEACH_FOR_MARIO, sEndPeachObj.gfx.cameraToObject);
            break;
    }
    if (m.actionTimer == 350) {
        advance_cutscene_step(m);
    }
}
function end_peach_cutscene_run_to_castle(m) {
    F.set_mario_animation(m, m.actionState == 0 ? MARIO_ANIM_CREDITS_START_WALK_LOOK_UP : MARIO_ANIM_CREDITS_LOOK_BACK_THEN_RUN);
    m.marioObj.gfx.pos[1] = end_obj_set_visual_pos(m.marioObj);
    if (m.actionState == 0 && F.is_anim_past_end(m)) {
        m.actionState = 1;
    }
    if (m.actionTimer == 95) {
        F.set_cutscene_message(160, 227, 0, 40);
        play_sound(SOUND_PEACH_MARIO2, sEndPeachObj.gfx.cameraToObject);
    }
    if (m.actionTimer == 389) {
        advance_cutscene_step(m);
    }
}
function end_peach_cutscene_fade_out(m) {
    if (m.actionState == 0) {
        F.level_trigger_warp(m, WARP_OP_CREDITS_NEXT);
        W.gPaintingMarioYEntry = 1500.0; 
        m.actionState = 1;
    }
}
const END_PEACH_CUTSCENE_MARIO_FALLING = 0;
const END_PEACH_CUTSCENE_MARIO_LANDING = END_PEACH_CUTSCENE_MARIO_FALLING + 1;
const END_PEACH_CUTSCENE_SUMMON_JUMBO_STAR = END_PEACH_CUTSCENE_MARIO_LANDING + 1;
const END_PEACH_CUTSCENE_SPAWN_PEACH = END_PEACH_CUTSCENE_SUMMON_JUMBO_STAR + 1;
const END_PEACH_CUTSCENE_DESCEND_PEACH = END_PEACH_CUTSCENE_SPAWN_PEACH + 1;
const END_PEACH_CUTSCENE_RUN_TO_PEACH = END_PEACH_CUTSCENE_DESCEND_PEACH + 1;
const END_PEACH_CUTSCENE_DIALOG_1 = END_PEACH_CUTSCENE_RUN_TO_PEACH + 1;
const END_PEACH_CUTSCENE_DIALOG_2 = END_PEACH_CUTSCENE_DIALOG_1 + 1;
const END_PEACH_CUTSCENE_KISS_FROM_PEACH = END_PEACH_CUTSCENE_DIALOG_2 + 1;
const END_PEACH_CUTSCENE_STAR_DANCE = END_PEACH_CUTSCENE_KISS_FROM_PEACH + 1;
const END_PEACH_CUTSCENE_DIALOG_3 = END_PEACH_CUTSCENE_STAR_DANCE + 1;
const END_PEACH_CUTSCENE_RUN_TO_CASTLE = END_PEACH_CUTSCENE_DIALOG_3 + 1;
const END_PEACH_CUTSCENE_FADE_OUT = END_PEACH_CUTSCENE_RUN_TO_CASTLE + 1;
function act_end_peach_cutscene(m) {
    switch (m.actionArg) {
        case END_PEACH_CUTSCENE_MARIO_FALLING:
            end_peach_cutscene_mario_falling(m);
            break;
        case END_PEACH_CUTSCENE_MARIO_LANDING:
            end_peach_cutscene_mario_landing(m);
            break;
        case END_PEACH_CUTSCENE_SUMMON_JUMBO_STAR:
            end_peach_cutscene_summon_jumbo_star(m);
            break;
        case END_PEACH_CUTSCENE_SPAWN_PEACH:
            end_peach_cutscene_spawn_peach(m);
            break;
        case END_PEACH_CUTSCENE_DESCEND_PEACH:
            end_peach_cutscene_descend_peach(m);
            break;
        case END_PEACH_CUTSCENE_RUN_TO_PEACH:
            end_peach_cutscene_run_to_peach(m);
            break;
        case END_PEACH_CUTSCENE_DIALOG_1:
            end_peach_cutscene_dialog_1(m);
            break;
        case END_PEACH_CUTSCENE_DIALOG_2:
            end_peach_cutscene_dialog_2(m);
            break;
        case END_PEACH_CUTSCENE_KISS_FROM_PEACH:
            end_peach_cutscene_kiss_from_peach(m);
            break;
        case END_PEACH_CUTSCENE_STAR_DANCE:
            end_peach_cutscene_star_dance(m);
            break;
        case END_PEACH_CUTSCENE_DIALOG_3:
            end_peach_cutscene_dialog_3(m);
            break;
        case END_PEACH_CUTSCENE_RUN_TO_CASTLE:
            end_peach_cutscene_run_to_castle(m);
            break;
        case END_PEACH_CUTSCENE_FADE_OUT:
            end_peach_cutscene_fade_out(m);
            break;
    }
    m.actionTimer++;
    sEndCutsceneVp.vp.vscale[0] = 640;
    sEndCutsceneVp.vp.vscale[1] = 360;
    sEndCutsceneVp.vp.vtrans[0] = 640;
    sEndCutsceneVp.vp.vtrans[1] = 480;
    F.override_viewport_and_clip(null, sEndCutsceneVp, 0, 0, 0);
    return false;
}
const TIMER_CREDITS_SHOW = 61;
const TIMER_CREDITS_PROGRESS = 90;
const TIMER_CREDITS_WARP = 200;
function act_credits_cutscene(m) {
    let width = 0;
    let height = 0;
    m.statusForCamera.cameraEvent = CAM_EVENT_START_CREDITS;
    if (m.pos[1] < m.waterLevel - 100) {
        if (m.area.camera.mode != CAMERA_MODE_BEHIND_MARIO) {
            F.set_camera_mode(m.area.camera, CAMERA_MODE_BEHIND_MARIO, 1);
        }
        F.set_mario_animation(m, MARIO_ANIM_WATER_IDLE);
        vec3f_copy(m.marioObj.gfx.pos, m.pos);
        vec3s_copy(m.marioObj.gfx.angle, m.faceAngle);
        m.particleFlags |= PARTICLE_BUBBLE;
    } else {
        F.set_mario_animation(m, MARIO_ANIM_FIRST_PERSON);
        if (m.actionTimer > 0) {
            F.stop_and_set_height_to_floor(m);
        }
    }
    if (m.actionTimer >= TIMER_CREDITS_SHOW) {
        if (m.actionState < 40) {
            m.actionState += 2;
        }
        width = m.actionState * 640 / 100;
        height = m.actionState * 480 / 100;
        sEndCutsceneVp.vp.vscale[0] = 640 - width;
        sEndCutsceneVp.vp.vscale[1] = 480 - height;
        sEndCutsceneVp.vp.vtrans[0] =
            (W.gCurrCreditsEntry.unk02 & 0x10 ? width : -width) * 56 / 100 + 640;
        sEndCutsceneVp.vp.vtrans[1] =
            (W.gCurrCreditsEntry.unk02 & 0x20 ? height : -height) * 66 / 100 + 480;
        F.override_viewport_and_clip(sEndCutsceneVp, 0, 0, 0, 0);
    }
    if (m.actionTimer == TIMER_CREDITS_PROGRESS) {
        F.reset_cutscene_msg_fade();
    }
    if (m.actionTimer >= TIMER_CREDITS_PROGRESS) {
        sDispCreditsEntry = W.gCurrCreditsEntry;
    }
    if (m.actionTimer++ == TIMER_CREDITS_WARP) {
        F.level_trigger_warp(m, WARP_OP_CREDITS_NEXT);
    }
    m.marioObj.gfx.angle[1] = s16(m.marioObj.gfx.angle[1] + ((W.gCurrCreditsEntry.unk02 & 0xC0) << 8));
    return false;
}
function act_end_waving_cutscene(m) {
    if (m.actionState == 0) {
        m.statusForCamera.cameraEvent = CAM_EVENT_START_END_WAVING;
        sEndPeachObj = spawn_object_abs_with_rot(W.gCurrentObject, 0, MODEL_PEACH,B.bhvEndPeach, 60, 906, -1180, 0, 0, 0);
        sEndRightToadObj = spawn_object_abs_with_rot(W.gCurrentObject, 0, MODEL_TOAD,B.bhvEndToad, 180, 906, -1170, 0, 0, 0);
        sEndLeftToadObj = spawn_object_abs_with_rot(W.gCurrentObject, 0, MODEL_TOAD,B.bhvEndToad, -180, 906, -1170, 0, 0, 0);
        sEndPeachObj.oOpacity = 255;
        sEndRightToadObj.oOpacity = 255;
        sEndLeftToadObj.oOpacity = 255;
        sEndPeachAnimation = 11;
        sEndToadAnims[0] = 6;
        sEndToadAnims[1] = 7;
        m.actionState = 1;
    }
    F.set_mario_animation(m, MARIO_ANIM_CREDITS_WAVING);
    F.stop_and_set_height_to_floor(m);
    m.marioObj.gfx.angle[1] = s16(m.marioObj.gfx.angle[1] + (0x8000));
    m.marioObj.gfx.pos[0] -= 60.0;
    m.marioBodyState.handState = MARIO_HAND_RIGHT_OPEN;
    if (m.actionTimer++ == 300) {
        F.level_trigger_warp(m, WARP_OP_CREDITS_END);
    }
    return false;
}
function check_for_instant_quicksand(m) {
    if (m.floor.type == SURFACE_INSTANT_QUICKSAND && m.action & ACT_FLAG_INVULNERABLE && m.action != ACT_QUICKSAND_DEATH) {
        F.update_mario_sound_and_camera(m);
        return F.drop_and_set_mario_action(m, ACT_QUICKSAND_DEATH, 0);
    }
    return false;
}
function mario_execute_cutscene_action(m) {
    let cancel = 0;
    if (check_for_instant_quicksand(m)) {
        return true;
    }
    switch (m.action) {
        case ACT_DISAPPEARED:                cancel = act_disappeared(m);                break;
        case ACT_INTRO_CUTSCENE:             cancel = act_intro_cutscene(m);             break;
        case ACT_STAR_DANCE_EXIT:            cancel = act_star_dance(m);                 break;
        case ACT_STAR_DANCE_NO_EXIT:         cancel = act_star_dance(m);                 break;
        case ACT_STAR_DANCE_WATER:           cancel = act_star_dance_water(m);           break;
        case ACT_FALL_AFTER_STAR_GRAB:       cancel = act_fall_after_star_grab(m);       break;
        case ACT_READING_AUTOMATIC_DIALOG:   cancel = act_reading_automatic_dialog(m);   break;
        case ACT_READING_NPC_DIALOG:         cancel = act_reading_npc_dialog(m);         break;
        case ACT_DEBUG_FREE_MOVE:            cancel = act_debug_free_move(m);            break;
        case ACT_READING_SIGN:               cancel = act_reading_sign(m);               break;
        case ACT_JUMBO_STAR_CUTSCENE:        cancel = act_jumbo_star_cutscene(m);        break;
        case ACT_WAITING_FOR_DIALOG:         cancel = act_waiting_for_dialog(m);         break;
        case ACT_STANDING_DEATH:             cancel = act_standing_death(m);             break;
        case ACT_QUICKSAND_DEATH:            cancel = act_quicksand_death(m);            break;
        case ACT_ELECTROCUTION:              cancel = act_electrocution(m);              break;
        case ACT_SUFFOCATION:                cancel = act_suffocation(m);                break;
        case ACT_DEATH_ON_STOMACH:           cancel = act_death_on_stomach(m);           break;
        case ACT_DEATH_ON_BACK:              cancel = act_death_on_back(m);              break;
        case ACT_EATEN_BY_BUBBA:             cancel = act_eaten_by_bubba(m);             break;
        case ACT_END_PEACH_CUTSCENE:         cancel = act_end_peach_cutscene(m);         break;
        case ACT_CREDITS_CUTSCENE:           cancel = act_credits_cutscene(m);           break;
        case ACT_END_WAVING_CUTSCENE:        cancel = act_end_waving_cutscene(m);        break;
        case ACT_PULLING_DOOR:
        case ACT_PUSHING_DOOR:               cancel = act_going_through_door(m);         break;
        case ACT_WARP_DOOR_SPAWN:            cancel = act_warp_door_spawn(m);            break;
        case ACT_EMERGE_FROM_PIPE:           cancel = act_emerge_from_pipe(m);           break;
        case ACT_SPAWN_SPIN_AIRBORNE:        cancel = act_spawn_spin_airborne(m);        break;
        case ACT_SPAWN_SPIN_LANDING:         cancel = act_spawn_spin_landing(m);         break;
        case ACT_EXIT_AIRBORNE:              cancel = act_exit_airborne(m);              break;
        case ACT_EXIT_LAND_SAVE_DIALOG:      cancel = act_exit_land_save_dialog(m);      break;
        case ACT_DEATH_EXIT:                 cancel = act_death_exit(m);                 break;
        case ACT_UNUSED_DEATH_EXIT:          cancel = act_unused_death_exit(m);          break;
        case ACT_FALLING_DEATH_EXIT:         cancel = act_falling_death_exit(m);         break;
        case ACT_SPECIAL_EXIT_AIRBORNE:      cancel = act_special_exit_airborne(m);      break;
        case ACT_SPECIAL_DEATH_EXIT:         cancel = act_special_death_exit(m);         break;
        case ACT_FALLING_EXIT_AIRBORNE:      cancel = act_falling_exit_airborne(m);      break;
        case ACT_UNLOCKING_KEY_DOOR:         cancel = act_unlocking_key_door(m);         break;
        case ACT_UNLOCKING_STAR_DOOR:        cancel = act_unlocking_star_door(m);        break;
        case ACT_ENTERING_STAR_DOOR:         cancel = act_entering_star_door(m);         break;
        case ACT_SPAWN_NO_SPIN_AIRBORNE:     cancel = act_spawn_no_spin_airborne(m);     break;
        case ACT_SPAWN_NO_SPIN_LANDING:      cancel = act_spawn_no_spin_landing(m);      break;
        case ACT_BBH_ENTER_JUMP:             cancel = act_bbh_enter_jump(m);             break;
        case ACT_BBH_ENTER_SPIN:             cancel = act_bbh_enter_spin(m);             break;
        case ACT_TELEPORT_FADE_OUT:          cancel = act_teleport_fade_out(m);          break;
        case ACT_TELEPORT_FADE_IN:           cancel = act_teleport_fade_in(m);           break;
        case ACT_SHOCKED:                    cancel = act_shocked(m);                    break;
        case ACT_SQUISHED:                   cancel = act_squished(m);                   break;
        case ACT_HEAD_STUCK_IN_GROUND:       cancel = act_head_stuck_in_ground(m);       break;
        case ACT_BUTT_STUCK_IN_GROUND:       cancel = act_butt_stuck_in_ground(m);       break;
        case ACT_FEET_STUCK_IN_GROUND:       cancel = act_feet_stuck_in_ground(m);       break;
        case ACT_PUTTING_ON_CAP:             cancel = act_putting_on_cap(m);             break;
    }
    if (!cancel && (m.input & INPUT_IN_WATER)) {
        m.particleFlags |= PARTICLE_IDLE_WATER_WAVE;
    }
    return cancel;
}

Object.assign(F, { bhv_end_peach_loop, bhv_end_toad_loop, geo_switch_peach_eyes, get_star_collection_dialog, spawn_obj_at_mario_rel_yaw, cutscene_take_cap_off, cutscene_put_cap_on, mario_ready_to_speak, set_mario_npc_dialog, act_reading_npc_dialog, act_waiting_for_dialog, act_disappeared, act_reading_automatic_dialog, act_reading_sign, act_debug_free_move, general_star_dance_handler, act_star_dance, act_star_dance_water, act_fall_after_star_grab, common_death_handler, act_standing_death, act_electrocution, act_suffocation, act_death_on_back, act_death_on_stomach, act_quicksand_death, act_eaten_by_bubba, launch_mario_until_land, act_unlocking_key_door, act_unlocking_star_door, act_entering_star_door, act_going_through_door, act_warp_door_spawn, act_emerge_from_pipe, act_spawn_spin_airborne, act_spawn_spin_landing, act_exit_airborne, act_falling_exit_airborne, act_exit_land_save_dialog, act_death_exit, act_unused_death_exit, act_falling_death_exit, act_special_exit_airborne, act_special_death_exit, act_spawn_no_spin_airborne, act_spawn_no_spin_landing, act_bbh_enter_spin, act_bbh_enter_jump, act_teleport_fade_out, act_teleport_fade_in, act_shocked, act_squished, act_putting_on_cap, stuck_in_ground_handler, act_head_stuck_in_ground, act_butt_stuck_in_ground, act_feet_stuck_in_ground, advance_cutscene_step, intro_cutscene_hide_hud_and_mario, intro_cutscene_peach_lakitu_scene, intro_cutscene_raise_pipe, intro_cutscene_jump_out_of_pipe, intro_cutscene_land_outside_pipe, intro_cutscene_lower_pipe, intro_cutscene_set_mario_to_idle, act_intro_cutscene, jumbo_star_cutscene_falling, jumbo_star_cutscene_taking_off, jumbo_star_cutscene_flying, act_jumbo_star_cutscene, generate_yellow_sparkles, end_obj_set_visual_pos, end_peach_cutscene_mario_falling, end_peach_cutscene_mario_landing, end_peach_cutscene_summon_jumbo_star, end_peach_cutscene_spawn_peach, end_peach_cutscene_descend_peach, end_peach_cutscene_run_to_peach, end_peach_cutscene_dialog_1, end_peach_cutscene_dialog_2, end_peach_cutscene_kiss_from_peach, end_peach_cutscene_star_dance, end_peach_cutscene_dialog_3, end_peach_cutscene_run_to_castle, end_peach_cutscene_fade_out, act_end_peach_cutscene, act_credits_cutscene, act_end_waving_cutscene, check_for_instant_quicksand, mario_execute_cutscene_action });

})(window);

/* the objects' behaviours: ported from the Super Mario 64 decompilation (github.com/n64decomp/sm64): src/game/behavior_actions.c */
(function (root) {
'use strict';
const SM64 = root.SM64, F = SM64.F = SM64.F || {}, W = SM64.W = SM64.W || {}, B = SM64.B = SM64.B || {};
const { s16, s8, sins, coss, atan2s, sqr, approach_f32, approach_s32, max, min, abs, REF, REFA, REFV } = SM64.m;
/*CONSTS*/
const { ACTIVE_FLAG_DEACTIVATED, ACTIVE_FLAG_DITHERED_ALPHA, ACTIVE_FLAG_INITIATED_TIME_STOP, ACTIVE_PARTICLE_DIRT, 
  ACTIVE_PARTICLE_FIRE, ACTIVE_PARTICLE_IDLE_WATER_WAVE, ACTIVE_PARTICLE_LEAF, ACTIVE_PARTICLE_MIST_CIRCLE, 
  ACTIVE_PARTICLE_SNOW, BOO_DEATH_STATUS_DYING, BOWSER_ACT_BIG_JUMP, BOWSER_ACT_BREATH_FIRE, BOWSER_ACT_CHARGE_MARIO, 
  BOWSER_ACT_DANCE, BOWSER_ACT_DEAD, BOWSER_ACT_DEFAULT, BOWSER_ACT_HIT_EDGE, BOWSER_ACT_HIT_MINE, 
  BOWSER_ACT_INTRO_WALK, BOWSER_ACT_JUMP_ONTO_STAGE, BOWSER_ACT_QUICK_JUMP, BOWSER_ACT_SPIT_FIRE_INTO_SKY, 
  BOWSER_ACT_SPIT_FIRE_ONTO_FLOOR, BOWSER_ACT_TAIL_DEFAULT, BOWSER_ACT_TAIL_THROWN, BOWSER_ACT_TAIL_TOUCHED_MARIO, 
  BOWSER_ACT_TELEPORT, BOWSER_ACT_THROWN, BOWSER_ACT_TILT_LAVA_PLATFORM, BOWSER_ACT_TURN_FROM_EDGE, BOWSER_ACT_WAIT, 
  BOWSER_ACT_WALK_TO_MARIO, BOWSER_ANIM_BREATH, BOWSER_ANIM_BREATH_QUICK, BOWSER_ANIM_BREATH_UP, BOWSER_ANIM_DANCE, 
  BOWSER_ANIM_EDGE_MOVE, BOWSER_ANIM_EDGE_STOP, BOWSER_ANIM_FLIP, BOWSER_ANIM_FLIP_DOWN, BOWSER_ANIM_GRABBED, 
  BOWSER_ANIM_IDLE, BOWSER_ANIM_JUMP_START, BOWSER_ANIM_JUMP_STOP, BOWSER_ANIM_LAY_DOWN, 
  BOWSER_ANIM_LOOK_DOWN_STOP_WALK, BOWSER_ANIM_LOOK_UP_START_WALK, BOWSER_ANIM_RUN, BOWSER_ANIM_RUN_SLIP, 
  BOWSER_ANIM_RUN_START, BOWSER_ANIM_RUN_STOP, BOWSER_ANIM_SHAKING, BOWSER_ANIM_SLOW_GAIT, BOWSER_ANIM_STAND_UP, 
  BOWSER_ANIM_STAND_UP_FROM_FLIP, BOWSER_BP_BITDW, BOWSER_BP_BITFS, BOWSER_BP_BITS, BOWSER_CAM_ACT_IDLE, 
  BOWSER_CAM_ACT_WALK, BOWSER_GRAB_STATUS_GRABBED, BOWSER_GRAB_STATUS_HOLDING, BOWSER_GRAB_STATUS_NONE, 
  BOWSER_STATUS_ANGLE_CENTER, BOWSER_STATUS_ANGLE_MARIO, BOWSER_STATUS_BIG_JUMP, BOWSER_STATUS_DIST_CENTER, 
  BOWSER_STATUS_DIST_MARIO, BOWSER_STATUS_FIRE_SKY, BOWSER_SUB_ACT_CHARGE_END, BOWSER_SUB_ACT_CHARGE_RUN, 
  BOWSER_SUB_ACT_CHARGE_SLIP, BOWSER_SUB_ACT_CHARGE_START, BOWSER_SUB_ACT_DEAD_BOUNCE, 
  BOWSER_SUB_ACT_DEAD_DEFAULT_END, BOWSER_SUB_ACT_DEAD_DEFAULT_END_OVER, BOWSER_SUB_ACT_DEAD_FINAL_END, 
  BOWSER_SUB_ACT_DEAD_FINAL_END_OVER, BOWSER_SUB_ACT_DEAD_FLY_BACK, BOWSER_SUB_ACT_DEAD_WAIT, 
  BOWSER_SUB_ACT_HIT_MINE_FALL, BOWSER_SUB_ACT_HIT_MINE_START, BOWSER_SUB_ACT_HIT_MINE_STOP, 
  BOWSER_SUB_ACT_JUMP_ON_STAGE_IDLE, BOWSER_SUB_ACT_JUMP_ON_STAGE_LAND, BOWSER_SUB_ACT_JUMP_ON_STAGE_START, 
  BOWSER_SUB_ACT_JUMP_ON_STAGE_STOP, BOWSER_SUB_ACT_TELEPORT_MOVE, BOWSER_SUB_ACT_TELEPORT_START, 
  BOWSER_SUB_ACT_TELEPORT_STOP, BREAKABLE_BOX_BP_3_COINS, BREAKABLE_BOX_BP_5_COINS, BREAKABLE_BOX_BP_GIANT, 
  BREAKABLE_BOX_BP_NO_COINS, CAM_EVENT_BOWSER_INIT, CAM_EVENT_BOWSER_JUMP, COIN_FORMATION_ACT_IDLE, 
  COIN_FORMATION_ACT_RESPAWN_COINS, COIN_FORMATION_ACT_SPAWN_COINS, COIN_FORMATION_BP_ARROW, 
  COIN_FORMATION_BP_FLAG_FLYING, COIN_FORMATION_BP_FLAG_MASK, COIN_FORMATION_BP_LINE_HORIZONTAL, 
  COIN_FORMATION_BP_LINE_VERTICAL, COIN_FORMATION_BP_RING_HORIZONTAL, COIN_FORMATION_BP_RING_VERTICAL, 
  COURSE_NUM_TO_INDEX, CUTSCENE_DIALOG, CUTSCENE_STAR_SPAWN, DEBUG_PAGE_EFFECTINFO, DEBUG_PAGE_ENEMYINFO, DIALOG_017, 
  DIALOG_116, DIALOG_119, DIALOG_120, DIALOG_121, DIALOG_128, DIALOG_163, DIALOG_FLAG_TEXT_DEFAULT, 
  DIALOG_FLAG_TIME_STOP_ENABLED, DIALOG_FLAG_TURN_TO_MARIO, EXCLAMATION_BOX_ANIM_STATE_DEFAULT, 
  EXCLAMATION_BOX_BP_1UP_RUNNING_AWAY, EXCLAMATION_BOX_BP_1UP_WALKING, EXCLAMATION_BOX_BP_END, 
  EXCLAMATION_BOX_BP_KOOPA_SHELL, EXCLAMATION_BOX_BP_METAL_CAP, EXCLAMATION_BOX_BP_ONE_COIN, 
  EXCLAMATION_BOX_BP_SPECIAL_CAP_END, EXCLAMATION_BOX_BP_STAR_ACT_1, EXCLAMATION_BOX_BP_STAR_ACT_2, 
  EXCLAMATION_BOX_BP_STAR_ACT_3, EXCLAMATION_BOX_BP_STAR_ACT_4, EXCLAMATION_BOX_BP_STAR_ACT_5, 
  EXCLAMATION_BOX_BP_STAR_ACT_6, EXCLAMATION_BOX_BP_TEN_COINS, EXCLAMATION_BOX_BP_THREE_COINS, 
  EXCLAMATION_BOX_BP_VANISH_CAP, EXCLAMATION_BOX_BP_WING_CAP, FLOOR_LOWER_LIMIT, FLOOR_LOWER_LIMIT_MISC, 
  GEO_CONTEXT_RENDER, GRAPH_RENDER_ACTIVE, GRAPH_RENDER_BILLBOARD, HELD_DROPPED, HELD_FREE, HELD_HELD, HELD_THROWN, 
  HIDDEN_OBJECT_ACT_ACTIVE, HIDDEN_OBJECT_ACT_INACTIVE, HIDDEN_OBJECT_BP_BREAKABLE_BOX, INTERACT_BREAKABLE, 
  INTERACT_COIN, INTERACT_DAMAGE, INTERACT_FLAME, INTERACT_GRABBABLE, INTERACT_KOOPA_SHELL, INTERACT_STAR_OR_KEY, 
  INTERACT_TEXT, INT_STATUS_GRABBED_MARIO, INT_STATUS_HIT_MINE, INT_STATUS_INTERACTED, 
  INT_STATUS_MARIO_KNOCKBACK_DMG, INT_STATUS_MARIO_SHOCKWAVE, INT_STATUS_MARIO_STUNNED, INT_STATUS_MARIO_UNK2, 
  INT_STATUS_MARIO_UNK6, INT_STATUS_STOP_RIDING, INT_STATUS_TOUCHED_BOB_OMB, INT_SUBTYPE_GRABS_MARIO, 
  INT_SUBTYPE_NO_EXIT, LEVEL_BBH, LEVEL_BOWSER_2, LEVEL_BOWSER_3, LEVEL_CCM, LEVEL_SL, MARIO_DIALOG_LOOK_UP, 
  MARIO_DIALOG_STOP, MARIO_PUNCHING, MARIO_UNKNOWN_13, MARIO_UNKNOWN_31, MODEL_1UP, MODEL_BLUE_COIN, 
  MODEL_BLUE_FLAME, MODEL_BOB_BARS_GRILLS, MODEL_BOWSER_KEY, MODEL_BOWSER_NO_SHADOW, MODEL_BOWSER_WAVE, 
  MODEL_BREAKABLE_BOX_SMALL, MODEL_BURN_SMOKE, MODEL_CARTOON_STAR, MODEL_CHECKERBOARD_PLATFORM, MODEL_DIRT_ANIMATION, 
  MODEL_EXCLAMATION_BOX, MODEL_EXCLAMATION_BOX_OUTLINE, MODEL_EXCLAMATION_POINT, MODEL_FISH, MODEL_HMC_RED_GRILLS, 
  MODEL_KOOPA_SHELL, MODEL_LEAVES, MODEL_MARIOS_CAP, MODEL_MARIOS_METAL_CAP, MODEL_MARIOS_WING_CAP, MODEL_MIST, 
  MODEL_NONE, MODEL_PURPLE_SWITCH, MODEL_RED_FLAME, MODEL_SAND_DUST, MODEL_SL_CRACKED_ICE_CHUNK, 
  MODEL_SMALL_WATER_SPLASH, MODEL_SMOKE, MODEL_SPARKLES, MODEL_SPARKLES_ANIMATION, MODEL_STAR, 
  MODEL_TRANSPARENT_STAR, MODEL_WAVE_TRAIL, MODEL_WHITE_PARTICLE_DL, MODEL_WHITE_PARTICLE_SMALL, MODEL_YELLOW_COIN, 
  MODEL_YELLOW_COIN_NO_SHADOW, NO_SOUND, OBJECT_POOL_CAPACITY, OBJ_FLAG_HOLDABLE, OBJ_FLAG_PERSISTENT_RESPAWN, 
  OBJ_MOVE_ABOVE_DEATH_BARRIER, OBJ_MOVE_ABOVE_LAVA, OBJ_MOVE_BOUNCE, OBJ_MOVE_HIT_EDGE, OBJ_MOVE_HIT_WALL, 
  OBJ_MOVE_LANDED, OBJ_MOVE_MASK_IN_WATER, OBJ_MOVE_ON_GROUND, OPENABLE_GRILL_BP_BOB, PURPLE_SWITCH_ACT_IDLE, 
  PURPLE_SWITCH_ACT_PRESSED, PURPLE_SWITCH_ACT_TICKING, PURPLE_SWITCH_ACT_UNPRESSED, 
  PURPLE_SWITCH_ACT_WAIT_FOR_MARIO_TO_GET_OFF, SAVE_FLAG_HAVE_METAL_CAP, SAVE_FLAG_HAVE_VANISH_CAP, 
  SAVE_FLAG_HAVE_WING_CAP, SEQUENCE_ARGS, SEQ_EVENT_BOSS, SEQ_PLAYER_LEVEL, SHAKE_POS_SMALL, 
  SOUND_AIR_BOWSER_SPIT_FIRE, SOUND_AIR_CHUCKYA_MOVE, SOUND_ENV_ELEVATOR4, SOUND_ENV_METAL_BOX_PUSH, 
  SOUND_ENV_MOVING_BIG_PLATFORM, SOUND_ENV_STAR, SOUND_GENERAL2_BOWSER_EXPLODE, SOUND_GENERAL2_BOWSER_KEY, 
  SOUND_GENERAL2_PURPLE_SWITCH, SOUND_GENERAL2_STAR_APPEARS, SOUND_GENERAL2_SWITCH_TICK_FAST, 
  SOUND_GENERAL2_SWITCH_TICK_SLOW, SOUND_GENERAL_BREAK_BOX, SOUND_GENERAL_CAGE_OPEN, SOUND_GENERAL_COIN_DROP, 
  SOUND_GENERAL_COIN_SPURT, SOUND_GENERAL_GRAND_STAR, SOUND_GENERAL_GRAND_STAR_JUMP, SOUND_GENERAL_UNKNOWN3, 
  SOUND_OBJ2_BOWSER_ROAR, SOUND_OBJ2_BOWSER_TELEPORT, SOUND_OBJ2_KING_BOBOMB_DAMAGE, SOUND_OBJ_BOWSER_DEFEATED, 
  SOUND_OBJ_BOWSER_INHALING, SOUND_OBJ_BOWSER_TAIL_PICKUP, SOUND_OBJ_BOWSER_WALK, SOUND_OBJ_CANNON1, 
  SOUND_OBJ_CANNON2, SOUND_OBJ_CANNON3, SOUND_OBJ_CHUCKYA_DEATH, SOUND_OBJ_FLAME_BLOWN, SOUND_OBJ_KING_BOBOMB, 
  SOUND_OBJ_KING_BOBOMB_JUMP, SOUND_OBJ_KING_WHOMP_DEATH, SOUND_OBJ_POUNDING1_HIGHPRIO, SOUND_OBJ_UNKNOWN3, 
  SOUND_OBJ_UNKNOWN4, STAR_INDEX_ACT_1, STAR_INDEX_ACT_2, STAR_INDEX_ACT_3, STAR_INDEX_ACT_4, STAR_INDEX_ACT_5, 
  STAR_INDEX_ACT_6, SURFACE_BURNING, SURFACE_DEATH_PLANE, SURFACE_FLAG_DYNAMIC, TIME_STOP_ENABLED, 
  TIME_STOP_MARIO_AND_DOORS, WATER_DROPLET_FLAG_RAND_ANGLE, WATER_DROPLET_FLAG_RAND_ANGLE_INCR_PLUS_8000, 
  WATER_DROPLET_FLAG_SET_Y_TO_WATER_LEVEL } = SM64.C;
/*END CONSTS*/

const o = W.gCurrentObject;
let sCapSaveFlags = [SAVE_FLAG_HAVE_WING_CAP, SAVE_FLAG_HAVE_METAL_CAP, SAVE_FLAG_HAVE_VANISH_CAP];
let sBooHitRotations = [6047, 5664, 5292, 4934, 4587, 4254, 3933, 3624, 3329, 3046, 2775, 2517, 2271, 2039, 1818, 1611, 1416, 1233, 1063, 906, 761, 629, 509, 402, 308, 226, 157, 100, 56, 25, 4, 0];
function bhv_bobomb_anchor_mario_loop() {
    common_anchor_mario_behavior(50.0, 50.0, INT_STATUS_MARIO_UNK6);
}
function king_bobomb_act_0() {
    const o = W.gCurrentObject;
    o.oForwardVel = 0.0;
    o.oVelY = 0.0;
    if (o.oSubAction == 0) {
        F.cur_obj_become_intangible();
        W.gSecondCameraFocus = o;
        F.cur_obj_init_animation_with_sound(5);
        F.cur_obj_set_pos_to_home();
        o.oHealth = 3;
        if (F.cur_obj_can_mario_activate_textbox_2(500.0, 100.0)) {
            o.oSubAction++;
            seq_player_lower_volume(SEQ_PLAYER_LEVEL, 60, 40);
        }
    } else if (F.cur_obj_update_dialog_with_cutscene(MARIO_DIALOG_LOOK_UP, DIALOG_FLAG_TURN_TO_MARIO, CUTSCENE_DIALOG, DIALOG_017)) {
        o.oAction = 2;
        o.oFlags |= OBJ_FLAG_HOLDABLE;
    }
}
function mario_is_far_below_object(arg0) {
    const o = W.gCurrentObject;
    if (arg0 < o.oPosY - W.gMarioObject.oPosY) {
        return true;
    } else {
        return false;
    }
}
function king_bobomb_act_2() {
    const o = W.gCurrentObject;
    F.cur_obj_become_tangible();
    if (o.oPosY - o.oHomeY < -100.0) { 
        o.oAction = 5;
        F.cur_obj_become_intangible();
    }
    if (o.oKingBobombUnk100 == 0) {
        if (F.cur_obj_check_anim_frame(15)) {
            F.cur_obj_shake_screen(SHAKE_POS_SMALL);
        }
        if (F.cur_obj_init_animation_and_check_if_near_end(4)) {
            o.oKingBobombUnk100++;
        }
    } else {
        if (o.oKingBobombUnk100 == 1) {
            F.cur_obj_init_animation_and_anim_frame(11, 7);
            o.oKingBobombUnk100 = 2;
        } else {
            F.cur_obj_init_animation_with_sound(11);
        }
        if (o.oKingBobombUnk108 == 0) {
            o.oForwardVel = 3.0;
            F.cur_obj_rotate_yaw_toward(o.oAngleToMario, 0x100);
        } else {
            o.oForwardVel = 0.0;
            o.oKingBobombUnk108--;
        }
    }
    if (F.cur_obj_check_grabbed_mario()) {
        o.oAction = 3;
    }
    if (mario_is_far_below_object(1200.0)) {
        o.oAction = 0;
        stop_background_music(SEQUENCE_ARGS(4, SEQ_EVENT_BOSS));
    }
}
function king_bobomb_act_3() {
    const o = W.gCurrentObject;
    if (o.oSubAction == 0) {
        o.oForwardVel = 0.0;
        o.oKingBobombUnk104 = 0;
        o.oKingBobombUnkFC = 0;
        if (o.oTimer == 0) {
            cur_obj_play_sound_2(SOUND_OBJ_UNKNOWN3);
        }
        if (F.cur_obj_init_animation_and_check_if_near_end(0)) {
            o.oSubAction++;
            F.cur_obj_init_animation_and_anim_frame(1, 0);
        }
    } else if (o.oSubAction == 1) {
        F.cur_obj_init_animation_with_sound(1);
        o.oKingBobombUnkFC += F.player_performed_grab_escape_action();
        print_debug_bottom_up("%d", o.oKingBobombUnkFC);
        if (o.oKingBobombUnkFC > 10) {
            o.oKingBobombUnk88 = 3;
            o.oAction = 2;
            o.oKingBobombUnk108 = 35;
            o.oInteractStatus &= ~INT_STATUS_GRABBED_MARIO;
        } else {
            o.oForwardVel = 3.0;
            if (o.oKingBobombUnk104 > 20 && F.cur_obj_rotate_yaw_toward(0, 0x400)) {
                o.oSubAction++;
                F.cur_obj_init_animation_and_anim_frame(9, 22);
            }
        }
        o.oKingBobombUnk104++;
    } else {
        F.cur_obj_init_animation_with_sound(9);
        if (F.cur_obj_check_anim_frame(31)) {
            o.oKingBobombUnk88 = 2;
            cur_obj_play_sound_2(SOUND_OBJ_UNKNOWN4);
        } else if (F.cur_obj_check_if_near_animation_end()) {
            o.oAction = 1;
            o.oInteractStatus &= ~INT_STATUS_GRABBED_MARIO;
        }
    }
}
function king_bobomb_act_1() {
    const o = W.gCurrentObject;
    o.oForwardVel = 0.0;
    o.oVelY = 0.0;
    F.cur_obj_init_animation_with_sound(11);
    o.oMoveAngleYaw = F.approach_s16_symmetric(o.oMoveAngleYaw, o.oAngleToMario, 0x200);
    if (o.oDistanceToMario < 2500.0) {
        o.oAction = 2;
    }
    if (mario_is_far_below_object(1200.0)) {
        o.oAction = 0;
        stop_background_music(SEQUENCE_ARGS(4, SEQ_EVENT_BOSS));
    }
}
function king_bobomb_act_6() {
    const o = W.gCurrentObject;
    if (o.oSubAction == 0) {
        if (o.oTimer == 0) {
            o.oKingBobombUnk104 = 0;
            cur_obj_play_sound_2(SOUND_OBJ_KING_BOBOMB);
            cur_obj_play_sound_2(SOUND_OBJ2_KING_BOBOMB_DAMAGE);
            F.cur_obj_shake_screen(SHAKE_POS_SMALL);
            spawn_mist_particles_variable(0, 0, 100.0);
            o.oInteractType = INTERACT_DAMAGE;
            F.cur_obj_become_tangible();
        }
        if (F.cur_obj_init_animation_and_check_if_near_end(2)) {
            o.oKingBobombUnk104++;
        }
        if (o.oKingBobombUnk104 > 3) {
            o.oSubAction++;
        }
    } else if (o.oSubAction == 1) {
        if (F.cur_obj_init_animation_and_check_if_near_end(10)) {
            o.oSubAction++;
            o.oInteractType = INTERACT_GRABBABLE;
            F.cur_obj_become_intangible();
        }
    } else {
        F.cur_obj_init_animation_with_sound(11);
        if (F.cur_obj_rotate_yaw_toward(o.oAngleToMario, 0x800) == true) {
            o.oAction = 2;
        }
    }
}
function king_bobomb_act_7() {
    const o = W.gCurrentObject;
    F.cur_obj_init_animation_with_sound(2);
    if (F.cur_obj_update_dialog_with_cutscene(MARIO_DIALOG_LOOK_UP, DIALOG_FLAG_TEXT_DEFAULT, CUTSCENE_DIALOG, DIALOG_116)) {
        create_sound_spawner(SOUND_OBJ_KING_WHOMP_DEATH);
        F.cur_obj_hide();
        F.cur_obj_become_intangible();
        spawn_mist_particles_variable(0, 0, 200.0);
        spawn_triangle_break_particles(20, MODEL_DIRT_ANIMATION, 3.0, 4);
        F.cur_obj_shake_screen(SHAKE_POS_SMALL);
        F.cur_obj_spawn_star_at_y_offset(2000.0, 4500.0, -4500.0, 200.0);
        o.oAction = 8;
    }
}
function king_bobomb_act_8() {
    const o = W.gCurrentObject;
    if (o.oTimer == 60) {
        stop_background_music(SEQUENCE_ARGS(4, SEQ_EVENT_BOSS));
    }
}
function king_bobomb_act_4() {
    const o = W.gCurrentObject;
    if (o.oPosY - o.oHomeY > -100.0) { 
        if (o.oMoveFlags & OBJ_MOVE_LANDED) {
            o.oHealth--;
            o.oForwardVel = 0.0;
            o.oVelY = 0.0;
            cur_obj_play_sound_2(SOUND_OBJ_KING_BOBOMB);
            if (o.oHealth != 0) {
                o.oAction = 6;
            } else {
                o.oAction = 7;
            }
        }
    } else if (o.oSubAction == 0) {
        if (o.oMoveFlags & OBJ_MOVE_ON_GROUND) {
            o.oForwardVel = 0.0;
            o.oVelY = 0.0;
            o.oSubAction++;
        } else if (o.oMoveFlags & OBJ_MOVE_LANDED) {
            cur_obj_play_sound_2(SOUND_OBJ_KING_BOBOMB);
        }
    } else {
        if (F.cur_obj_init_animation_and_check_if_near_end(10)) {
            o.oAction = 5; 
        }
        o.oSubAction++;
    }
}
function king_bobomb_act_5() {
    const o = W.gCurrentObject;
    switch (o.oSubAction) {
        case 0:
            if (o.oTimer == 0) {
                cur_obj_play_sound_2(SOUND_OBJ_KING_BOBOMB_JUMP);
            }
            o.oKingBobombUnkF8 = 1;
            F.cur_obj_init_animation_and_extend_if_at_end(8);
            o.oMoveAngleYaw = F.cur_obj_angle_to_home();
            if (o.oPosY < o.oHomeY) {
                o.oVelY = 100.0;
            } else {
                arc_to_goal_pos(REF(o, 'oHomeX'), REF(o, 'oPosX'), 100.0, -4.0);
                o.oSubAction++;
            }
            break;
        case 1:
            F.cur_obj_init_animation_and_extend_if_at_end(8);
            if (o.oVelY < 0 && o.oPosY < o.oHomeY) {
                o.oPosY = o.oHomeY;
                o.oVelY = 0;
                o.oForwardVel = 0;
                o.oGravity = -4.0;
                o.oKingBobombUnkF8 = 0;
                F.cur_obj_init_animation_with_sound(7);
                cur_obj_play_sound_2(SOUND_OBJ_KING_BOBOMB);
                F.cur_obj_shake_screen(SHAKE_POS_SMALL);
                o.oSubAction++;
            }
            break;
        case 2:
            if (F.cur_obj_init_animation_and_check_if_near_end(7)) {
                o.oSubAction++;
            }
            break;
        case 3:
            if (mario_is_far_below_object(1200.0)) {
                o.oAction = 0;
                stop_background_music(SEQUENCE_ARGS(4, SEQ_EVENT_BOSS));
            }
            if (F.cur_obj_can_mario_activate_textbox_2(500.0, 100.0)) {
                o.oSubAction++;
            }
            break;
        case 4:
            if (F.cur_obj_update_dialog_with_cutscene(MARIO_DIALOG_LOOK_UP, DIALOG_FLAG_TURN_TO_MARIO, CUTSCENE_DIALOG, DIALOG_128)) {
                o.oAction = 2;
            }
            break;
    }
}
let sKingBobombActions = [king_bobomb_act_0, king_bobomb_act_1, king_bobomb_act_2, king_bobomb_act_3, king_bobomb_act_4, king_bobomb_act_5, king_bobomb_act_6, king_bobomb_act_7, king_bobomb_act_8];
let sKingBobombSoundStates = [[0, 0, 0, NO_SOUND], [1, 1, 20, SOUND_OBJ_POUNDING1_HIGHPRIO], [0, 0, 0, NO_SOUND], [0, 0, 0, NO_SOUND], [1, 15, -1, SOUND_OBJ_POUNDING1_HIGHPRIO], [0, 0, 0, NO_SOUND], [0, 0, 0, NO_SOUND], [0, 0, 0, NO_SOUND], [0, 0, 0, NO_SOUND], [1, 33, -1, SOUND_OBJ_POUNDING1_HIGHPRIO], [0, 0, 0, NO_SOUND], [1, 1, 15, SOUND_OBJ_POUNDING1_HIGHPRIO]];
function king_bobomb_move() {
    const o = W.gCurrentObject;
    F.cur_obj_update_floor_and_walls();
    if (o.oKingBobombUnkF8 == 0) {
        F.cur_obj_move_standard(-78);
    } else {
        F.cur_obj_move_using_fvel_and_gravity();
    }
    F.cur_obj_call_action_function(sKingBobombActions);
    exec_anim_sound_state(sKingBobombSoundStates);
    if (o.oDistanceToMario < 5000.0) {
        F.cur_obj_enable_rendering();
    } else {
        F.cur_obj_disable_rendering();
    }
}
function bhv_king_bobomb_loop() {
    const o = W.gCurrentObject;
    let sp34 = 20.0;
    let sp30 = 50.0;
    let filler = new Array(8).fill(0);
    o.oInteractionSubtype |= INT_SUBTYPE_GRABS_MARIO;
    switch (o.oHeldState) {
        case HELD_FREE:
            king_bobomb_move();
            break;
        case HELD_HELD:
            F.cur_obj_unrender_set_action_and_anim(6, 1);
            break;
        case HELD_THROWN:
        case HELD_DROPPED:
            F.cur_obj_get_thrown_or_placed(sp34, sp30, 4);
            F.cur_obj_become_intangible();
            o.oPosY += 20.0;
            break;
    }
    o.oInteractStatus = 0;
}
function bhv_cannon_base_unused_loop() {
    const o = W.gCurrentObject;
    o.oPosY += o.oVelY;
}
function opened_cannon_act_0() {
    const o = W.gCurrentObject;
    if (o.oTimer == 0) {
        o.oInteractStatus = 0;
        o.oPosX = o.oHomeX;
        o.oPosY = o.oHomeY;
        o.oPosZ = o.oHomeZ;
        o.oMoveAnglePitch = 0;
        o.oMoveAngleYaw = s16((o.oBhvParams2ndByte << 8));
        o.oCannonUnkF4 = 0;
        o.oCannonUnk10C = false;
        F.cur_obj_enable_rendering();
        F.cur_obj_become_tangible();
    }
    if (o.oDistanceToMario < 500.0) {
        F.cur_obj_become_tangible();
        F.cur_obj_enable_rendering();
        if ((o.oInteractStatus & INT_STATUS_INTERACTED) && !(o.oInteractStatus & INT_STATUS_TOUCHED_BOB_OMB)) {
            o.oAction = 4;
            o.oCannonUnk10C = true;
            o.oCannonUnkF8 = 1;
        } else {
            o.oInteractStatus = 0;
        }
    } else {
        F.cur_obj_become_intangible();
        F.cur_obj_disable_rendering();
        o.oCannonUnk10C = false;
    }
}
function opened_cannon_act_4() {
    const o = W.gCurrentObject;
    if (o.oTimer == 0) {
        cur_obj_play_sound_2(SOUND_OBJ_CANNON1);
    }
    o.oPosY += 5.0;
    o.oPosX += ((o.oTimer / 2 & 1) - 0.5) * 2;
    o.oPosZ += ((o.oTimer / 2 & 1) - 0.5) * 2;
    if (o.oTimer > 67) {
        o.oPosX += ((o.oTimer / 2 & 1) - 0.5) * 4;
        o.oPosZ += ((o.oTimer / 2 & 1) - 0.5) * 4;
        o.oAction = 6;
    }
}
function opened_cannon_act_6() {
    const o = W.gCurrentObject;
    if (o.oTimer == 0) {
        cur_obj_play_sound_2(SOUND_OBJ_CANNON2);
    }
    if (o.oTimer < 4) {
        o.oPosX += ((o.oTimer / 2 & 1) - 0.5) * 4.0;
        o.oPosZ += ((o.oTimer / 2 & 1) - 0.5) * 4.0;
    } else {
        if (o.oTimer < 6) {
        } else {
            if (o.oTimer < 22) {
                o.oMoveAngleYaw =
                    sins(o.oCannonUnkF4) * 0x4000 + (s16((o.oBhvParams2ndByte << 8)));
                o.oCannonUnkF4 += 0x400;
            } else if (o.oTimer < 26) {
            } else {
                o.oCannonUnkF4 = 0;
                o.oAction = 5;
            }
        }
    }
}
function opened_cannon_act_5() {
    const o = W.gCurrentObject;
    if (o.oTimer == 0) {
        cur_obj_play_sound_2(SOUND_OBJ_CANNON3);
    }
    if (o.oTimer < 4) {
    } else {
        if (o.oTimer < 20) {
            o.oCannonUnkF4 += 0x400;
            o.oMoveAnglePitch = sins(o.oCannonUnkF4) * 0x2000;
        } else if (o.oTimer < 25) {
        } else {
            o.oAction = 1;
        }
    }
}
function opened_cannon_act_1() {
    const o = W.gCurrentObject;
    let filler = new Array(4).fill(0);
    F.cur_obj_become_intangible();
    F.cur_obj_disable_rendering();
    o.oCannonUnk10C = false;
    W.gMarioShotFromCannon = true;
}
function opened_cannon_act_2() {
    const o = W.gCurrentObject;
    o.oAction = 3;
}
function opened_cannon_act_3() {
    const o = W.gCurrentObject;
    let filler = new Array(4).fill(0);
    if (o.oTimer > 3) {
        o.oAction = 0;
    }
}
let sOpenedCannonActions = [opened_cannon_act_0, opened_cannon_act_1, opened_cannon_act_2, opened_cannon_act_3, opened_cannon_act_4, opened_cannon_act_5, opened_cannon_act_6];
function bhv_cannon_base_loop() {
    const o = W.gCurrentObject;
    F.cur_obj_call_action_function(sOpenedCannonActions);
    if (o.oCannonUnkF8 != 0) {
        o.oCannonUnkF8++;
    }
    o.oInteractStatus = 0;
}
function bhv_cannon_barrel_loop() {
    const o = W.gCurrentObject;
    let parent = o.parentObj;
    if (parent.gfx.flags & GRAPH_RENDER_ACTIVE) {
        F.cur_obj_enable_rendering();
        F.obj_copy_pos(o, o.parentObj);
        o.oMoveAngleYaw = o.parentObj.oMoveAngleYaw;
        o.oFaceAnglePitch = o.parentObj.oMoveAnglePitch;
    } else {
        F.cur_obj_disable_rendering();
    }
}
let sUnusedChuckyaData = { unk0: [2, 0., 1.], unk4: [2, 10., 1.], unk8: [2, 20., 1.], f3: [2, 20., 1.], f4: [8, 10., 1.] };
function common_anchor_mario_behavior(sp28, sp2C, sp30) {
    const o = W.gCurrentObject;
    switch (o.parentObj.oChuckyaUnk88) {
        case 0:
            break;
        case 1:
            F.obj_set_gfx_pos_at_obj_pos(W.gMarioObject, o);
            break;
        case 2:
            W.gMarioObject.oInteractStatus |= (INT_STATUS_MARIO_UNK2 + sp30);
            W.gMarioStates[0].forwardVel = sp28;
            W.gMarioStates[0].vel[1] = sp2C;
            o.parentObj.oChuckyaUnk88 = 0;
            break;
        case 3:
            W.gMarioObject.oInteractStatus |= (INT_STATUS_MARIO_UNK2 | INT_STATUS_MARIO_UNK6);
            W.gMarioStates[0].forwardVel = 10.0;
            W.gMarioStates[0].vel[1] = 10.0;
            o.parentObj.oChuckyaUnk88 = 0;
            break;
    }
    o.oMoveAngleYaw = o.parentObj.oMoveAngleYaw;
    if (o.parentObj.activeFlags == ACTIVE_FLAG_DEACTIVATED) {
        F.obj_mark_for_deletion(o);
    }
}
function bhv_chuckya_anchor_mario_loop() {
    common_anchor_mario_behavior(40.0, 40.0, INT_STATUS_MARIO_UNK6);
}
function unknown_chuckya_function(sp20, sp24, sp28, sp2C) {
    const o = W.gCurrentObject;
    let sp1C = 0;
    if (o.oChuckyaUnkF8 != 4) {
        if (sp24 < F.cur_obj_lateral_dist_from_mario_to_home()) {
            if (F.cur_obj_lateral_dist_to_home() < 200.0) {
                sp1C = 0;
            } else {
                sp1C = 1;
                o.oAngleToMario = F.cur_obj_angle_to_home();
            }
        } else if (o.oDistanceToMario > sp28) {
            if (W.gGlobalTimer % sp2C == 0) {
                o.oAngleToMario = F.obj_angle_to_object(o, W.gMarioObject);
            }
            sp1C = 2;
        } else {
            sp1C = 3;
        }
        if (sp20 && F.update_angle_from_move_flags(REF(o, 'oAngleToMario'))) {
            sp1C = 4;
            o.oChuckyaUnkF8 = 4;
        }
    } else {
        sp1C = 4;
    }
    return sp1C;
}
function chuckya_act_0() {
    const o = W.gCurrentObject;
    let sp3C = 0;
    let filler = new Array(16).fill(0);
    let sp28 = 0;
    if (o.oTimer == 0) {
        o.oChuckyaUnkFC = 0;
    }
    o.oAngleToMario = F.obj_angle_to_object(o, W.gMarioObject);
    switch (sp28 = o.oSubAction) {
        case 0:
            o.oForwardVel = 0.0;
            if (F.cur_obj_lateral_dist_from_mario_to_home() < 2000.0) {
                F.cur_obj_rotate_yaw_toward(o.oAngleToMario, 0x400);
                if (o.oChuckyaUnkFC > 40 || F.abs_angle_diff(o.oMoveAngleYaw, o.oAngleToMario) < 0x1000) {
                    o.oSubAction = 1;
                }
            } else {
                o.oSubAction = 3;
            }
            break;
        case 1:
            F.approach_forward_vel(REF(o, 'oForwardVel'), 30.0, 4.0);
            if (F.abs_angle_diff(o.oMoveAngleYaw, o.oAngleToMario) > 0x4000) {
                o.oSubAction = 2;
            }
            if (F.cur_obj_lateral_dist_from_mario_to_home() > 2000.0) {
                o.oSubAction = 3;
            }
            break;
        case 2:
            F.approach_forward_vel(REF(o, 'oForwardVel'), 0, 4.0);
            if (o.oChuckyaUnkFC > 48) {
                o.oSubAction = 0;
            }
            break;
        case 3:
            if (F.cur_obj_lateral_dist_to_home() < 500.0) {
                o.oForwardVel = 0.0;
            } else {
                F.approach_forward_vel(REF(o, 'oForwardVel'), 10.0, 4.0);
                o.oAngleToMario = F.cur_obj_angle_to_home();
                F.cur_obj_rotate_yaw_toward(o.oAngleToMario, 0x800);
            }
            if (F.cur_obj_lateral_dist_from_mario_to_home() < 1900.0) {
                o.oSubAction = 0;
            }
            break;
    }
    if (o.oSubAction != sp28) {
        o.oChuckyaUnkFC = 0;
    } else {
        o.oChuckyaUnkFC++;
    }
    F.cur_obj_init_animation_with_sound(4);
    if (o.oForwardVel > 1.0) {
        cur_obj_play_sound_1(SOUND_AIR_CHUCKYA_MOVE);
    }
    print_debug_bottom_up("fg %d", sp3C);
    print_debug_bottom_up("sp %d", o.oForwardVel);
}
function chuckya_act_1() {
    const o = W.gCurrentObject;
    if (o.oSubAction == 0) {
        if (F.cur_obj_init_animation_and_check_if_near_end(0)) {
            o.oSubAction++;
        }
        o.oChuckyaUnkFC = F.random_float() * 30.0 + 10.0;
        o.oChuckyaUnk100 = 0;
        o.oForwardVel = 0.0;
    } else {
        if (o.oSubAction == 1) {
            o.oChuckyaUnk100 += F.player_performed_grab_escape_action();
            print_debug_bottom_up("%d", o.oChuckyaUnk100);
            if (o.oChuckyaUnk100 > 10) {
                o.oChuckyaUnk88 = 3;
                o.oAction = 3;
                o.oInteractStatus &= ~INT_STATUS_GRABBED_MARIO;
            } else {
                F.cur_obj_init_animation_with_sound(1);
                o.oMoveAngleYaw += INT_STATUS_GRABBED_MARIO;
                if (o.oChuckyaUnkFC-- < 0 && (check_if_moving_over_floor(50.0, 150.0) || o.oChuckyaUnkFC < -16)) {
                    o.oSubAction++;
                }
            }
        } else {
            F.cur_obj_init_animation_with_sound(3);
            if (F.cur_obj_check_anim_frame(18)) {
                cur_obj_play_sound_2(SOUND_OBJ_UNKNOWN4);
                o.oChuckyaUnk88 = 2;
                o.oAction = 3;
                o.oInteractStatus &= ~INT_STATUS_GRABBED_MARIO;
            }
        }
    }
}
function chuckya_act_3() {
    const o = W.gCurrentObject;
    o.oForwardVel = 0.0;
    o.oVelY = 0.0;
    F.cur_obj_init_animation_with_sound(4);
    if (o.oTimer > 100) {
        o.oAction = 0;
    }
}
function chuckya_act_2() {
    const o = W.gCurrentObject;
    if (o.oMoveFlags & (OBJ_MOVE_HIT_WALL | OBJ_MOVE_MASK_IN_WATER | OBJ_MOVE_LANDED)) {
        F.obj_mark_for_deletion(o);
        F.obj_spawn_loot_yellow_coins(o, 5, 20.0);
        F.spawn_mist_particles_with_sound(SOUND_OBJ_CHUCKYA_DEATH);
    }
}
let sChuckyaActions = [chuckya_act_0, chuckya_act_1, chuckya_act_2, chuckya_act_3];
function chuckya_move() {
    const o = W.gCurrentObject;
    F.cur_obj_update_floor_and_walls();
    F.cur_obj_call_action_function(sChuckyaActions);
    F.cur_obj_move_standard(-30);
    if (o.oInteractStatus & INT_STATUS_GRABBED_MARIO) {
        o.oAction = 1;
        o.oChuckyaUnk88 = 1;
        cur_obj_play_sound_2(SOUND_OBJ_UNKNOWN3);
    }
}
function bhv_chuckya_loop() {
    const o = W.gCurrentObject;
    let sp2C = 20.0;
    let sp28 = 50.0;
    F.cur_obj_scale(2.0);
    o.oInteractionSubtype |= INT_SUBTYPE_GRABS_MARIO;
    switch (o.oHeldState) {
        case HELD_FREE:
            chuckya_move();
            break;
        case HELD_HELD:
            F.cur_obj_unrender_set_action_and_anim(2, 0);
            break;
        case HELD_THROWN:
        case HELD_DROPPED:
            F.cur_obj_get_thrown_or_placed(sp2C, sp28, 2);
            break;
    }
    o.oInteractStatus = 0;
    print_debug_bottom_up("md %d", o.oAction);
}
function bhv_warp_loop() {
    const o = W.gCurrentObject;
    if (o.oTimer == 0) {
        let bhvParams1stByte = ((o.oBhvParams >> 24) & 0xFF) & 0xFFFF;
        if (bhvParams1stByte == 0x00) {
            o.hitboxRadius = 50.0;
        } else if (bhvParams1stByte == 0xFF) {
            o.hitboxRadius = 10000.0;
        } else {
            o.hitboxRadius = bhvParams1stByte * 10.0;
        }
        o.hitboxHeight = 50.0;
    }
    o.oInteractStatus = 0;
}
function bhv_fading_warp_loop() {
    const o = W.gCurrentObject;
    if (o.oTimer == 0) {
        let bhvParams1stByte = ((o.oBhvParams >> 24) & 0xFF) & 0xFFFF;
        if (bhvParams1stByte == 0x00) {
            o.hitboxRadius = 85.0;
        } else if (bhvParams1stByte == 0xFF) {
            o.hitboxRadius = 10000.0;
        } else {
            o.hitboxRadius = bhvParams1stByte * 10.0;
        }
        o.hitboxHeight = 50.0;
    }
    o.oInteractStatus = 0;
}
let sMistParticles = { bhvParam: 2, count: 20, model: MODEL_MIST, offsetY: 0, forwardVelBase: 40, forwardVelRange: 5, velYBase: 30, velYRange: 20, gravity: 252, dragStrength: 30, sizeBase: 330.0, sizeRange: 10.0 };
function spawn_mist_particles_variable(count, offsetY, size) {
    sMistParticles.sizeBase = size;
    sMistParticles.sizeRange = size / 20.0;
    sMistParticles.offsetY = offsetY;
    if (count == 0) {
        sMistParticles.count = 20;
    } else if (count > 20) {
        sMistParticles.count = count;
    } else {
        sMistParticles.count = 4;
    }
    F.cur_obj_spawn_particles(sMistParticles);
}
let sSparkleSpawnStarHitbox = { interactType: INTERACT_STAR_OR_KEY, downOffset: 0, damageOrCoinValue: 0, health: 0, numLootCoins: 0, radius: 80, height: 50, hurtboxRadius: 0, hurtboxHeight: 0 };
function bhv_spawned_star_init() {
    const o = W.gCurrentObject;
    let starIndex = 0;
    if (!(o.oInteractionSubtype & INT_SUBTYPE_NO_EXIT)) {
        o.oBhvParams = o.parentObj.oBhvParams;
    }
    starIndex = (o.oBhvParams >> 24) & 0xFF;
    if (F.bit_shift_left(starIndex) & F.save_file_get_star_flags(W.gCurrSaveFileNum - 1, COURSE_NUM_TO_INDEX(W.gCurrCourseNum))) {
        F.cur_obj_set_model(MODEL_TRANSPARENT_STAR);
    }
    cur_obj_play_sound_2(SOUND_GENERAL2_STAR_APPEARS);
}
function set_sparkle_spawn_star_hitbox() {
    const o = W.gCurrentObject;
    F.obj_set_hitbox(o, sSparkleSpawnStarHitbox);
    if (o.oInteractStatus & INT_STATUS_INTERACTED) {
        F.mark_obj_for_deletion(o);
        o.oInteractStatus = 0;
    }
}
function set_home_to_mario() {
    const o = W.gCurrentObject;
    let sp1C = 0;
    let sp18 = 0;
    o.oHomeX = W.gMarioObject.oPosX;
    o.oHomeZ = W.gMarioObject.oPosZ;
    o.oHomeY = W.gMarioObject.oPosY;
    o.oHomeY += 250.0;
    o.oPosY = o.oHomeY;
    sp1C = o.oHomeX - o.oPosX;
    sp18 = o.oHomeZ - o.oPosZ;
    o.oForwardVel = Math.sqrt(sp1C * sp1C + sp18 * sp18) / 23.0;
}
function set_y_home_to_pos() {
    const o = W.gCurrentObject;
    o.oForwardVel = 0.0;
    o.oHomeY = o.oPosY;
}
function slow_star_rotation() {
    const o = W.gCurrentObject;
    if (o.oAngleVelYaw > 0x400) {
        o.oAngleVelYaw -= 0x40;
    }
}
function bhv_spawned_star_loop() {
    const o = W.gCurrentObject;
    if (o.oAction == 0) {
        if (o.oTimer == 0) {
            F.cutscene_object(CUTSCENE_STAR_SPAWN, o);
            F.set_time_stop_flags(TIME_STOP_ENABLED | TIME_STOP_MARIO_AND_DOORS);
            o.activeFlags |= ACTIVE_FLAG_INITIATED_TIME_STOP;
            o.oAngleVelYaw = 0x800;
            if (o.oBhvParams2ndByte == 0) {
                set_home_to_mario();
            } else {
                set_y_home_to_pos();
            }
            o.oMoveAngleYaw = F.cur_obj_angle_to_home();
            o.oVelY = 50.0;
            o.oGravity = -4.0;
            F.spawn_mist_particles();
        }
        cur_obj_play_sound_1(SOUND_ENV_STAR);
        spawn_object(o, MODEL_NONE,B.bhvSparkleSpawn);
        if (o.oVelY < 0 && o.oPosY < o.oHomeY) {
            o.oAction++;
            o.oForwardVel = 0;
            o.oVelY = 20.0;
            o.oGravity = -1.0;
            if (o.oInteractionSubtype & INT_SUBTYPE_NO_EXIT) {
                play_power_star_jingle(true);
            } else {
                play_power_star_jingle(true);
            }
        }
    } else if (o.oAction == 1) {
        if (o.oVelY < -4.0) {
            o.oVelY = -4.0;
        }
        if (o.oVelY < 0 && o.oPosY < o.oHomeY) {
            W.gObjCutsceneDone = true;
            o.oVelY = 0;
            o.oGravity = 0;
            o.oAction++;
        }
        spawn_object(o, MODEL_NONE,B.bhvSparkleSpawn);
    } else if (o.oAction == 2) {
        if (W.gCamera.cutscene == 0 && W.gRecentCutscene == 0) {
            F.clear_time_stop_flags(TIME_STOP_ENABLED | TIME_STOP_MARIO_AND_DOORS);
            o.activeFlags &= ~ACTIVE_FLAG_INITIATED_TIME_STOP;
            o.oAction++;
        }
    } else {
        set_sparkle_spawn_star_hitbox();
        slow_star_rotation();
    }
    F.cur_obj_move_using_fvel_and_gravity();
    o.oFaceAngleYaw += o.oAngleVelYaw;
    o.oInteractStatus = 0;
}
function bhv_spawn_star_no_level_exit(starIndex) {
    const o = W.gCurrentObject;
    let star = spawn_object(o, MODEL_STAR,B.bhvSpawnedStarNoLevelExit);
    star.oBhvParams = starIndex << 24;
    star.oInteractionSubtype = INT_SUBTYPE_NO_EXIT;
    F.obj_set_angle(star, 0, 0, 0);
}
let sYellowCoinHitbox = { interactType: INTERACT_COIN, downOffset: 0, damageOrCoinValue: 1, health: 0, numLootCoins: 0, radius: 100, height: 64, hurtboxRadius: 0, hurtboxHeight: 0 };
function bhv_coin_sparkles_init() {
    const o = W.gCurrentObject;
    if (o.oInteractStatus & INT_STATUS_INTERACTED && !(o.oInteractStatus & INT_STATUS_TOUCHED_BOB_OMB)) {
        spawn_object(o, MODEL_SPARKLES,B.bhvGoldenCoinSparkles);
        F.obj_mark_for_deletion(o);
        return true;
    }
    o.oInteractStatus = 0;
    return false;
}
function bhv_yellow_coin_init() {
    const o = W.gCurrentObject;
    F.cur_obj_set_behavior(B.bhvYellowCoin);
    F.obj_set_hitbox(o, sYellowCoinHitbox);
    F.bhv_init_room();
    F.cur_obj_update_floor_height();
    if (500.0 < Math.abs(o.oPosY - o.oFloorHeight)) {
        F.cur_obj_set_model(MODEL_YELLOW_COIN_NO_SHADOW);
    }
    if (o.oFloorHeight < FLOOR_LOWER_LIMIT_MISC) {
        F.obj_mark_for_deletion(o);
    }
}
function bhv_yellow_coin_loop() {
    const o = W.gCurrentObject;
    bhv_coin_sparkles_init();
    o.oAnimState++;
}
function bhv_temp_coin_loop() {
    const o = W.gCurrentObject;
    o.oAnimState++;
    if (F.cur_obj_wait_then_blink(200, 20)) {
        F.obj_mark_for_deletion(o);
    }
    bhv_coin_sparkles_init();
}
function bhv_spawned_coin_init() {
    const o = W.gCurrentObject;
    o.oVelY = F.random_float() * 10.0 + 30.0 + o.oCoinBaseVelY;
    o.oForwardVel = F.random_float() * 10.0;
    o.oMoveAngleYaw = F.random_u16();
    F.cur_obj_set_behavior(B.bhvYellowCoin);
    F.obj_set_hitbox(o, sYellowCoinHitbox);
    F.cur_obj_become_intangible();
}
function bhv_spawned_coin_loop() {
    const o = W.gCurrentObject;
    let floor = null;
    F.cur_obj_update_floor_and_walls();
    F.cur_obj_if_hit_wall_bounce_away();
    F.cur_obj_move_standard(-62);
    if ((floor = o.oFloor) != null) {
        if (o.oMoveFlags & OBJ_MOVE_ON_GROUND) {
            o.oSubAction = 1;
        }
        if (o.oSubAction == 1) {
            o.oBounciness = 0;
            if (floor.ny < 0.9) {
                let sp1A = s16(atan2s(floor.nz, floor.nx));
                F.cur_obj_rotate_yaw_toward(sp1A, 0x400);
            }
        }
    }
    if (o.oTimer == 0) {
        cur_obj_play_sound_2(SOUND_GENERAL_COIN_SPURT);
    }
    if (o.oVelY < 0.0) {
        F.cur_obj_become_tangible();
    }
    if (o.oMoveFlags & OBJ_MOVE_LANDED) {
        if (o.oMoveFlags & (OBJ_MOVE_ABOVE_DEATH_BARRIER | OBJ_MOVE_ABOVE_LAVA))
        {
            F.obj_mark_for_deletion(o);
        }
    }
    if (o.oMoveFlags & OBJ_MOVE_BOUNCE) {
        if (o.oCoinNumBounceSoundPlayed < 5) {
            cur_obj_play_sound_2(SOUND_GENERAL_COIN_DROP);
        }
        o.oCoinNumBounceSoundPlayed++;
    }
    if (F.cur_obj_wait_then_blink(400, 20)) {
        F.obj_mark_for_deletion(o);
    }
    bhv_coin_sparkles_init();
}
function bhv_coin_formation_spawn_loop() {
    const o = W.gCurrentObject;
    if (o.oTimer == 0) {
        F.cur_obj_set_behavior(B.bhvYellowCoin);
        F.obj_set_hitbox(o, sYellowCoinHitbox);
        F.bhv_init_room();
        if (o.oCoinOnGround) {
            o.oPosY += 300.0;
            F.cur_obj_update_floor_height();
            if (o.oPosY < o.oFloorHeight || o.oFloorHeight < FLOOR_LOWER_LIMIT_MISC) {
                F.obj_mark_for_deletion(o);
            } else {
                o.oPosY = o.oFloorHeight;
            }
        } else {
            F.cur_obj_update_floor_height();
            if (Math.abs(o.oPosY - o.oFloorHeight) > 250.0) {
                F.cur_obj_set_model(MODEL_YELLOW_COIN_NO_SHADOW);
            }
        }
    } else {
        if (bhv_coin_sparkles_init()) {
            o.parentObj.oCoinCollectedFlags |= F.bit_shift_left(o.oBhvParams2ndByte);
        }
        o.oAnimState++;
    }
    if (o.parentObj.oAction == COIN_FORMATION_ACT_RESPAWN_COINS) {
        F.obj_mark_for_deletion(o);
    }
}
let sCoinArrowPositions = [[0, -150], [0, -50], [0, 50], [0, 150], [-50, 100], [-100, 50], [50, 100], [100, 50]];
function spawn_coin_in_formation(coinIndex, coinFormationFlags) {
    const o = W.gCurrentObject;
    let coinSpawner = null;
    let pos = [0, 0, 0];
    let setSpawner = true;
    let onGround = true;
    pos[0] = pos[1] = pos[2] = 0;
    switch (coinFormationFlags & COIN_FORMATION_BP_FLAG_MASK) {
        case COIN_FORMATION_BP_LINE_HORIZONTAL:
            pos[2] = 160 * (coinIndex - 2);
            if (coinIndex > 4) {
                setSpawner = false;
            }
            break;
        case COIN_FORMATION_BP_LINE_VERTICAL:
            onGround = false;
            pos[1] = 160 * coinIndex * 0.8; 
            if (coinIndex > 4) {
                setSpawner = false;
            }
            break;
        case COIN_FORMATION_BP_RING_HORIZONTAL:
            pos[0] = sins(coinIndex << 13) * 300.0;
            pos[2] = coss(coinIndex << 13) * 300.0;
            break;
        case COIN_FORMATION_BP_RING_VERTICAL:
            onGround = false;
            pos[0] = coss(coinIndex << 13) * 200.0;
            pos[1] = sins(coinIndex << 13) * 200.0 + 200.0;
            break;
        case COIN_FORMATION_BP_ARROW:
            pos[0] = sCoinArrowPositions[coinIndex][0];
            pos[2] = sCoinArrowPositions[coinIndex][1];
            break;
    }
    if (coinFormationFlags & COIN_FORMATION_BP_FLAG_FLYING) {
        onGround = false;
    }
    if (setSpawner) {
        coinSpawner = spawn_object_relative(coinIndex, pos[0], pos[1], pos[2], o, MODEL_YELLOW_COIN,B.bhvCoinFormationSpawn);
        coinSpawner.oCoinOnGround = onGround;
    }
}
function bhv_coin_formation_init() {
    const o = W.gCurrentObject;
    o.oCoinCollectedFlags = (o.oBhvParams >> 8) & 0xFF;
}
function bhv_coin_formation_loop() {
    const o = W.gCurrentObject;
    let coinIndex = 0;
    switch (o.oAction) {
        case COIN_FORMATION_ACT_SPAWN_COINS:
            if (o.oDistanceToMario < 2000.0) {
                for (coinIndex = 0; coinIndex <= 7; coinIndex++) {
                    if (!(o.oCoinCollectedFlags & (1 << coinIndex))) {
                        spawn_coin_in_formation(coinIndex, o.oBhvParams2ndByte);
                    }
                }
                o.oAction++;
            }
            break;
        case COIN_FORMATION_ACT_IDLE:
            if (o.oDistanceToMario > 2100.0) {
                o.oAction++;
            }
            break;
        case COIN_FORMATION_ACT_RESPAWN_COINS:
            o.oAction = COIN_FORMATION_ACT_SPAWN_COINS;
            break;
    }
    F.set_object_respawn_info_bits(o, o.oCoinCollectedFlags & 0xFF);
}
function coin_inside_boo_act_1() {
    const o = W.gCurrentObject;
    F.cur_obj_update_floor_and_walls();
    F.cur_obj_if_hit_wall_bounce_away();
    if (o.oMoveFlags & OBJ_MOVE_BOUNCE) {
        cur_obj_play_sound_2(SOUND_GENERAL_COIN_DROP);
    }
    if (o.oTimer > 90 || (o.oMoveFlags & OBJ_MOVE_LANDED)) {
        F.obj_set_hitbox(o, sYellowCoinHitbox);
        F.cur_obj_become_tangible();
        F.cur_obj_set_behavior(B.bhvYellowCoin);
    }
    F.cur_obj_move_standard(-30);
    bhv_coin_sparkles_init();
    if (F.cur_obj_has_model(MODEL_BLUE_COIN)) {
        o.oDamageOrCoinValue = 5;
    }
    if (F.cur_obj_wait_then_blink(400, 20)) {
        F.obj_mark_for_deletion(o);
    }
}
function coin_inside_boo_act_0() {
    const o = W.gCurrentObject;
    let sp26 = 0;
    let sp20 = 0;
    let parent = o.parentObj;
    F.cur_obj_become_intangible();
    if (o.oTimer == 0 && W.gCurrLevelNum == LEVEL_BBH) {
        F.cur_obj_set_model(MODEL_BLUE_COIN);
        F.cur_obj_scale(0.7);
    }
    F.obj_copy_pos(o, parent);
    if (parent.oBooDeathStatus == BOO_DEATH_STATUS_DYING) {
        o.oAction = 1;
        sp26 = s16(W.gMarioObject.oMoveAngleYaw);
        sp20 = 3.0;
        o.oVelX = sins(sp26) * sp20;
        o.oVelZ = coss(sp26) * sp20;
        o.oVelY = 35.0;
    }
}
let sCoinInsideBooActions = [coin_inside_boo_act_0, coin_inside_boo_act_1];
function bhv_coin_inside_boo_loop() {
    F.cur_obj_call_action_function(sCoinInsideBooActions);
}
function bhv_coin_sparkles_loop() {
    F.cur_obj_scale(0.6);
}
function bhv_golden_coin_sparkles_loop() {
    const o = W.gCurrentObject;
    let sparkles = null;
    let filler = new Array(4).fill(0);
    let sp24 = 30.0;
    sparkles = spawn_object(o, MODEL_SPARKLES,B.bhvCoinSparkles);
    sparkles.oPosX += F.random_float() * sp24 - sp24 / 2;
    sparkles.oPosZ += F.random_float() * sp24 - sp24 / 2;
}
let sTinyTriMovementParams = [0xD000, 0, 0x3000, 0, 0xDE67, 0x2199, 0x2199, 0x2199, 0xDE67, 0xDE67, 0x2199, 0xDE67];
let sTinyStarMovementParams = [0xE000, 0, 0, 0, 0x2000, 0, 0xE99A, 0x1666, 0x1666, 0x1666, 0xE99A, 0xE99A, 0x1666, 0xE99A];
function bhv_punch_tiny_triangle_loop() {
    const o = W.gCurrentObject;
    if (o.oTimer == 0) {
        let sp1E = s16(o.oMoveAngleYaw);
        o.oCollisionParticleUnkF4 = 1.28;
        F.cur_obj_set_pos_relative(W.gMarioObject, 0.0, 60.0, 100.0);
        o.oMoveAngleYaw = sp1E;
    }
    F.cur_obj_move_using_fvel_and_gravity();
    o.oAnimState = 5;
    F.cur_obj_scale(o.oCollisionParticleUnkF4);
    o.oCollisionParticleUnkF4 -= 0.2;
    if (W.gDebugInfo[DEBUG_PAGE_EFFECTINFO][0] + 6 < o.oTimer) {
        F.obj_mark_for_deletion(o);
    }
}
function bhv_punch_tiny_triangle_init() {
    const o = W.gCurrentObject;
    let i = 0;
    let filler = new Array(4).fill(0);
    for (i = 0; i < 6; i++) {
        let triangle = spawn_object(o, MODEL_DIRT_ANIMATION,B.bhvPunchTinyTriangle);
        triangle.oMoveAngleYaw = W.gMarioObject.oMoveAngleYaw + sTinyTriMovementParams[2 * i] + 0x8000;
        triangle.oVelY = sins(sTinyTriMovementParams[2 * i + 1]) * 25.0;
        triangle.oForwardVel = coss(sTinyTriMovementParams[2 * i + 1]) * 25.0;
    }
}
function bhv_wall_tiny_star_particle_loop() {
    const o = W.gCurrentObject;
    if (o.oTimer == 0) {
        let sp1E = s16(o.oMoveAngleYaw);
        o.oCollisionParticleUnkF4 = 0.28;
        F.cur_obj_set_pos_relative(W.gMarioObject, 0.0, 30.0, 110.0);
        o.oMoveAngleYaw = sp1E;
    }
    F.cur_obj_move_using_fvel_and_gravity();
    o.oAnimState = 4;
    F.cur_obj_scale(o.oCollisionParticleUnkF4);
    o.oCollisionParticleUnkF4 -= 0.015;
}
function bhv_tiny_star_particles_init() {
    const o = W.gCurrentObject;
    let i = 0;
    let filler = new Array(4).fill(0);
    for (i = 0; i < 7; i++) {
        let particle = spawn_object(o, MODEL_CARTOON_STAR,B.bhvWallTinyStarParticle);
        particle.oMoveAngleYaw = W.gMarioObject.oMoveAngleYaw + sTinyStarMovementParams[2 * i] + 0x8000;
        particle.oVelY = sins(sTinyStarMovementParams[2 * i + 1]) * 25.0;
        particle.oForwardVel = coss(sTinyStarMovementParams[2 * i + 1]) * 25.0;
    }
}
function bhv_pound_tiny_star_particle_loop() {
    const o = W.gCurrentObject;
    if (o.oTimer == 0) {
        o.oCollisionParticleUnkF4 = 0.28;
        o.oForwardVel = 25.0;
        o.oPosY -= 20.0;
        o.oVelY = 14.0;
    }
    F.cur_obj_move_using_fvel_and_gravity();
    o.oAnimState = 4;
    F.cur_obj_scale(o.oCollisionParticleUnkF4);
    o.oCollisionParticleUnkF4 -= 0.015;
}
function bhv_pound_tiny_star_particle_init() {
    const o = W.gCurrentObject;
    let sp24 = 0;
    let sp20 = 8;
    for (sp24 = 0; sp24 < sp20; sp24++) {
        let particle = spawn_object(o, MODEL_CARTOON_STAR,B.bhvPoundTinyStarParticle);
        particle.oMoveAngleYaw = (sp24 * 65536) / sp20;
    }
}
function spawn_triangle_break_particles(numTris, triModel, triSize, triAnimState) {
    const o = W.gCurrentObject;
    let triangle = null;
    let i = 0;
    for (i = 0; i < numTris; i++) {
        triangle = spawn_object(o, triModel,B.bhvBreakBoxTriangle);
        triangle.oAnimState = triAnimState;
        triangle.oPosY += 100.0;
        triangle.oMoveAngleYaw = F.random_u16();
        triangle.oFaceAngleYaw = triangle.oMoveAngleYaw;
        triangle.oFaceAnglePitch = F.random_u16();
        triangle.oVelY = F.random_f32_around_zero(50.0);
        if (triModel == MODEL_DIRT_ANIMATION || triModel == MODEL_SL_CRACKED_ICE_CHUNK) {
            triangle.oAngleVelPitch = 0xF00;
            triangle.oAngleVelYaw = 0x500;
            triangle.oForwardVel = 30.0;
        } else {
            triangle.oAngleVelPitch = 0x80 * Math.trunc((F.random_float() + 50.0));
            triangle.oForwardVel = 30.0;
        }
        F.obj_scale(triangle, triSize);
    }
}
function bhv_pound_white_puffs_init() {
    clear_particle_flags(ACTIVE_PARTICLE_MIST_CIRCLE);
    spawn_mist_from_global();
}
let sGlobalMistParticles = { bhvParam: 3, count: 20, model: MODEL_MIST, offsetY: 20, forwardVelBase: 10, forwardVelRange: 5, velYBase: 0, velYRange: 0, gravity: 0, dragStrength: 30, sizeBase: 30.0, sizeRange: 1.5 };
function spawn_mist_from_global() {
    F.cur_obj_spawn_particles(sGlobalMistParticles);
}
let sSandParticles = { bhvParam: 0, count: 5, model: MODEL_SAND_DUST, offsetY: 0, forwardVelBase: 0, forwardVelRange: 20, velYBase: 20, velYRange: 0, gravity: 252, dragStrength: 30, sizeBase: 5.0, sizeRange: 2.0 };
function bhv_ground_sand_init() {
    clear_particle_flags(ACTIVE_PARTICLE_DIRT);
    F.cur_obj_spawn_particles(sSandParticles);
}
let sSmokeMovementParams = [2, -8, 1, 4];
function spawn_smoke_with_velocity() {
    const o = W.gCurrentObject;
    let smoke = spawn_object_with_scale(o, MODEL_SMOKE,B.bhvWhitePuffSmoke2, 1.0);
    smoke.oForwardVel = sSmokeMovementParams[0];
    smoke.oVelY = sSmokeMovementParams[1];
    smoke.oGravity = sSmokeMovementParams[2];
    F.obj_translate_xyz_random(smoke, sSmokeMovementParams[3]);
}
function clear_particle_flags(flags) {
    const o = W.gCurrentObject;
    o.parentObj.oActiveParticleFlags &= flags ^ 0xFFFFFFFF; 
}
let sSnowParticles = { bhvParam: 0, count: 5, model: MODEL_WHITE_PARTICLE_DL, offsetY: 0, forwardVelBase: 0, forwardVelRange: 20, velYBase: 20, velYRange: 0, gravity: 252, dragStrength: 30, sizeBase: 2.0, sizeRange: 2.0 };
function bhv_ground_snow_init() {
    clear_particle_flags(ACTIVE_PARTICLE_SNOW);
    F.cur_obj_spawn_particles(sSnowParticles);
}
let sBowserShockwaveHitPoints = [1.9, 2.4, 4.0, 4.8];
function bhv_bowser_shock_wave_loop() {
    const o = W.gCurrentObject;
    let distMin1 = 0, distMax1 = 0, distMin2 = 0, distMax2 = 0;
    let fadeFrames = s16(70);
    o.oBowserShockWaveScale = o.oTimer * 10;
    F.cur_obj_scale(o.oBowserShockWaveScale);
    if (W.gGlobalTimer % 3 != 0) {
        o.oOpacity--;
    }
    if (o.oTimer > fadeFrames) {
        o.oOpacity -= 5;
    }
    if (o.oOpacity <= 0) {
        F.obj_mark_for_deletion(o);
    }
    if (o.oTimer < fadeFrames && !F.mario_is_in_air_action()) {
        distMin1 = o.oBowserShockWaveScale * sBowserShockwaveHitPoints[0];
        distMax1 = o.oBowserShockWaveScale * sBowserShockwaveHitPoints[1];
        distMin2 = o.oBowserShockWaveScale * sBowserShockwaveHitPoints[2];
        distMax2 = o.oBowserShockWaveScale * sBowserShockwaveHitPoints[3];
        if ((distMin1 < o.oDistanceToMario && o.oDistanceToMario < distMax1) || (distMin2 < o.oDistanceToMario && o.oDistanceToMario < distMax2)) {
            W.gMarioObject.oInteractStatus |= INT_STATUS_MARIO_SHOCKWAVE;
        }
    }
}
function bhv_black_smoke_upward_loop() {
    const o = W.gCurrentObject;
    spawn_object_with_scale(o, MODEL_BURN_SMOKE,B.bhvBlackSmokeBowser, o.gfx.scale[0]);
}
function bhv_black_smoke_bowser_loop() {
    const o = W.gCurrentObject;
    if (o.oTimer == 0) {
        o.oForwardVel = F.random_float() * 2 + 0.5;
        o.oMoveAngleYaw = F.random_u16();
        o.oVelY = 8.0;
        o.oBlackSmokeBowserUnkF4 = o.gfx.scale[0];
    }
    o.oMoveAngleYaw += o.oAngleVelYaw;
    o.oPosY += o.oVelY;
}
function bhv_black_smoke_mario_loop() {
    const o = W.gCurrentObject;
    if (o.oTimer == 0) {
        F.cur_obj_set_pos_relative(W.gMarioObject, 0, 0, -30.0);
        o.oForwardVel = F.random_float() * 2 + 0.5;
        o.oMoveAngleYaw = (W.gMarioObject.oMoveAngleYaw + 0x7000) + F.random_float() * 8192.0;
        o.oVelY = 8.0;
    }
    o.oMoveAngleYaw += o.oAngleVelYaw;
    o.oPosY += o.oVelY;
}
function bhv_flame_mario_loop() {
    const o = W.gCurrentObject;
    F.cur_obj_scale(2.0);
    if (o.oTimer != 0) {
        if (o.oTimer & 1) {
            spawn_object(o, MODEL_BURN_SMOKE,B.bhvBlackSmokeMario);
        }
    }
    W.gMarioObject.prevObj = o; 
    F.obj_set_parent_relative_pos(o, 40, -120, 0);
    if (!(W.gMarioObject.oMarioParticleFlags & ACTIVE_PARTICLE_FIRE)) {
        o.parentObj.oActiveParticleFlags &= ~ACTIVE_PARTICLE_FIRE;
        F.obj_mark_for_deletion(o);
        W.gMarioObject.prevObj = null;
    }
}
function bhv_tree_snow_or_leaf_loop() {
    const o = W.gCurrentObject;
    F.cur_obj_update_floor_height();
    if (o.oTimer == 0) {
        o.oAngleVelPitch = (F.random_float() - 0.5) * 0x1000;
        o.oAngleVelRoll = (F.random_float() - 0.5) * 0x1000;
        o.oTreeSnowOrLeafUnkF8 = 4;
        o.oTreeSnowOrLeafUnkFC = F.random_float() * 0x400 + 0x600;
    }
    if (o.oPosY < o.oFloorHeight) {
        F.obj_mark_for_deletion(o);
    }
    if (o.oFloorHeight < FLOOR_LOWER_LIMIT) {
        F.obj_mark_for_deletion(o);
    }
    if (o.oTimer > 100) {
        F.obj_mark_for_deletion(o);
    }
    if (W.gPrevFrameObjectCount > (OBJECT_POOL_CAPACITY - 28)) {
        F.obj_mark_for_deletion(o);
    }
    o.oFaceAnglePitch += o.oAngleVelPitch;
    o.oFaceAngleRoll += o.oAngleVelRoll;
    o.oVelY += -3.0;
    if (o.oVelY < -8.0) {
        o.oVelY = -8.0;
    }
    if (o.oForwardVel > 0) {
        o.oForwardVel -= 0.3;
    } else {
        o.oForwardVel = 0;
    }
    o.oPosX += sins(o.oMoveAngleYaw) * sins(o.oTreeSnowOrLeafUnkF4) * o.oTreeSnowOrLeafUnkF8;
    o.oPosZ += coss(o.oMoveAngleYaw) * sins(o.oTreeSnowOrLeafUnkF4) * o.oTreeSnowOrLeafUnkF8;
    o.oTreeSnowOrLeafUnkF4 += o.oTreeSnowOrLeafUnkFC;
    o.oPosY += o.oVelY;
}
function bhv_snow_leaf_particle_spawn_init() {
    const o = W.gCurrentObject;
    let obj = null;
    let filler1 = new Array(4).fill(0);
    let isSnow = 0;
    let scale = 0;
    let filler2 = new Array(4).fill(0);
    W.gMarioObject.oActiveParticleFlags &= ~ACTIVE_PARTICLE_LEAF;
    if (W.gCurrLevelNum == LEVEL_CCM || W.gCurrLevelNum == LEVEL_SL) {
        isSnow = true;
    } else {
        isSnow = false;
    }
    if (isSnow) {
        if (F.random_float() < 0.5) {
            obj = spawn_object(o, MODEL_WHITE_PARTICLE_DL,B.bhvTreeSnow);
            scale = F.random_float();
            F.obj_scale_xyz(obj, scale, scale, scale);
            obj.oMoveAngleYaw = F.random_u16();
            obj.oForwardVel = F.random_float() * 5.0;
            obj.oVelY = F.random_float() * 15.0;
        }
    } else {
        if (F.random_float() < 0.3) {
            obj = spawn_object(o, MODEL_LEAVES,B.bhvTreeLeaf);
            scale = F.random_float() * 3.0;
            F.obj_scale_xyz(obj, scale, scale, scale);
            obj.oMoveAngleYaw = F.random_u16();
            obj.oForwardVel = F.random_float() * 5.0 + 5.0;
            obj.oVelY = F.random_float() * 15.0;
            obj.oFaceAnglePitch = F.random_u16();
            obj.oFaceAngleRoll = F.random_u16();
            obj.oFaceAngleYaw = F.random_u16();
        }
    }
}
function bhv_purple_switch_loop() {
    const o = W.gCurrentObject;
    let filler = new Array(4).fill(0);
    switch (o.oAction) {
        case PURPLE_SWITCH_ACT_IDLE:
            F.cur_obj_set_model(MODEL_PURPLE_SWITCH);
            F.cur_obj_scale(1.5);
            if (W.gMarioObject.platform == o && !(W.gMarioStates[0].action & MARIO_UNKNOWN_13)) {
                if (F.lateral_dist_between_objects(o, W.gMarioObject) < 127.5) {
                    o.oAction = PURPLE_SWITCH_ACT_PRESSED;
                }
            }
            break;
        case PURPLE_SWITCH_ACT_PRESSED:
            F.cur_obj_scale_over_time(2, 3, 1.5, 0.2);
            if (o.oTimer == 3) {
                cur_obj_play_sound_2(SOUND_GENERAL2_PURPLE_SWITCH);
                o.oAction = PURPLE_SWITCH_ACT_TICKING;
                F.cur_obj_shake_screen(SHAKE_POS_SMALL);
            }
            break;
        case PURPLE_SWITCH_ACT_TICKING:
            if (o.oBhvParams2ndByte != 0) {
                if (o.oBhvParams2ndByte == 1 && W.gMarioObject.platform != o) {
                    o.oAction++;
                } else {
                    if (o.oTimer < 360) {
                        play_sound(SOUND_GENERAL2_SWITCH_TICK_FAST, W.gGlobalSoundSource);
                    } else {
                        play_sound(SOUND_GENERAL2_SWITCH_TICK_SLOW, W.gGlobalSoundSource);
                    }
                    if (o.oTimer > 400) {
                        o.oAction = PURPLE_SWITCH_ACT_WAIT_FOR_MARIO_TO_GET_OFF;
                    }
                }
            }
            break;
        case PURPLE_SWITCH_ACT_UNPRESSED:
            F.cur_obj_scale_over_time(2, 3, 0.2, 1.5);
            if (o.oTimer == 3) {
                o.oAction = PURPLE_SWITCH_ACT_IDLE;
            }
            break;
        case PURPLE_SWITCH_ACT_WAIT_FOR_MARIO_TO_GET_OFF:
            if (!F.cur_obj_is_mario_on_platform()) {
                o.oAction = PURPLE_SWITCH_ACT_UNPRESSED;
            }
            break;
    }
}
let sMetalBoxHitbox = { interactType: 0, downOffset: 0, damageOrCoinValue: 0, health: 1, numLootCoins: 0, radius: 220, height: 300, hurtboxRadius: 220, hurtboxHeight: 300 };
function check_if_moving_over_floor(a0, a1) {
    const o = W.gCurrentObject;
    let sp24 = null;
    let sp20 = o.oPosX + sins(o.oMoveAngleYaw) * a1;
    let floorHeight = 0;
    let sp18 = o.oPosZ + coss(o.oMoveAngleYaw) * a1;
    floorHeight = F.find_floor(sp20, o.oPosY, sp18, $ => sp24 = $);
    if (Math.abs(floorHeight - o.oPosY) < a0) {
        return true;
    } else {
        return false;
    }
}
function bhv_pushable_loop() {
    const o = W.gCurrentObject;
    let unused = 0;
    F.obj_set_hitbox(o, sMetalBoxHitbox);
    o.oForwardVel = 0.0;
    if (F.obj_check_if_collided_with_object(o, W.gMarioObject) && (W.gMarioStates[0].flags & MARIO_UNKNOWN_31)) {
        let sp1C = s16(F.obj_angle_to_object(o, W.gMarioObject));
        if (F.abs_angle_diff(sp1C, W.gMarioObject.oMoveAngleYaw) > 0x4000) {
            o.oMoveAngleYaw = s16(((W.gMarioObject.oMoveAngleYaw + 0x2000) & 0xC000));
            if (check_if_moving_over_floor(8.0, 150.0)) {
                o.oForwardVel = 4.0;
                cur_obj_play_sound_1(SOUND_ENV_METAL_BOX_PUSH);
            }
        }
    }
    F.cur_obj_move_using_fvel_and_gravity();
}
let sBreakableBoxHitbox = { interactType: INTERACT_BREAKABLE, downOffset: 20, damageOrCoinValue: 0, health: 1, numLootCoins: 0, radius: 150, height: 200, hurtboxRadius: 150, hurtboxHeight: 200 };
function breakable_box_init() {
    const o = W.gCurrentObject;
    o.oHiddenObjectPurpleSwitch = null;
    o.oAnimState = 1;
    switch (o.oBhvParams2ndByte) {
        case BREAKABLE_BOX_BP_NO_COINS:
            o.oNumLootCoins = 0;
            break;
        case BREAKABLE_BOX_BP_3_COINS:
            o.oNumLootCoins = 3;
            break;
        case BREAKABLE_BOX_BP_5_COINS:
            o.oNumLootCoins = 5;
            break;
        case BREAKABLE_BOX_BP_GIANT:
            F.cur_obj_scale(1.5);
            break;
    }
}
function hidden_breakable_box_actions() {
    const o = W.gCurrentObject;
    let purpleSwitch = null;
    F.obj_set_hitbox(o, sBreakableBoxHitbox);
    F.cur_obj_set_model(MODEL_BREAKABLE_BOX_SMALL);
    if (o.oAction == HIDDEN_OBJECT_ACT_INACTIVE) {
        F.cur_obj_disable_rendering();
        F.cur_obj_become_intangible();
        if (o.oTimer == 0) {
            breakable_box_init();
        }
        if (o.oHiddenObjectPurpleSwitch == null) {
            o.oHiddenObjectPurpleSwitch =
                F.cur_obj_nearest_object_with_behavior(B.bhvFloorSwitchHiddenObjects);
        }
        if ((purpleSwitch = o.oHiddenObjectPurpleSwitch) != null) {
            if (purpleSwitch.oAction == PURPLE_SWITCH_ACT_TICKING) {
                o.oAction++;
                F.cur_obj_enable_rendering();
                F.cur_obj_unhide();
            }
        }
    } else if (o.oAction == HIDDEN_OBJECT_ACT_ACTIVE) {
        F.cur_obj_become_tangible();
        if (F.cur_obj_wait_then_blink(360, 20)) {
            o.oAction = HIDDEN_OBJECT_ACT_INACTIVE;
        }
        if (F.cur_obj_was_attacked_or_ground_pounded()) {
            F.spawn_mist_particles();
            spawn_triangle_break_particles(30, MODEL_DIRT_ANIMATION, 3.0, 4);
            o.oAction++;
            cur_obj_play_sound_2(SOUND_GENERAL_BREAK_BOX);
        }
        F.load_object_collision_model();
    } else { 
        F.cur_obj_become_intangible();
        F.cur_obj_disable_rendering();
        o.oInteractStatus = 0;
        if ((purpleSwitch = o.oHiddenObjectPurpleSwitch) != null) {
            if (purpleSwitch.oAction == PURPLE_SWITCH_ACT_IDLE) {
                o.oAction = HIDDEN_OBJECT_ACT_INACTIVE;
            }
        }
    }
}
function hidden_wdw_platform_actions() {
    const o = W.gCurrentObject;
    let purpleSwitch = null;
    F.obj_set_collision_data(o,W.SYM('wdw_seg7_collision_07018528'));
    if (o.oAction == HIDDEN_OBJECT_ACT_INACTIVE) {
        F.cur_obj_disable_rendering();
        F.cur_obj_become_intangible();
        if (o.oHiddenObjectPurpleSwitch == null) {
            o.oHiddenObjectPurpleSwitch =
                F.cur_obj_nearest_object_with_behavior(B.bhvFloorSwitchHiddenObjects);
        }
        if ((purpleSwitch = o.oHiddenObjectPurpleSwitch) != null) {
            if (purpleSwitch.oAction == PURPLE_SWITCH_ACT_TICKING) {
                o.oAction++;
                F.cur_obj_enable_rendering();
                F.cur_obj_unhide();
            }
        }
    } else { 
        F.cur_obj_become_tangible();
        if (F.cur_obj_wait_then_blink(360, 20)) {
            o.oAction = HIDDEN_OBJECT_ACT_INACTIVE;
        }
        F.load_object_collision_model();
    }
}
function bhv_hidden_object_loop() {
    const o = W.gCurrentObject;
    if (o.oBhvParams2ndByte == HIDDEN_OBJECT_BP_BREAKABLE_BOX) {
        hidden_breakable_box_actions();
    } else {
        hidden_wdw_platform_actions();
    }
}
function bhv_breakable_box_loop() {
    const o = W.gCurrentObject;
    F.obj_set_hitbox(o, sBreakableBoxHitbox);
    F.cur_obj_set_model(MODEL_BREAKABLE_BOX_SMALL);
    if (o.oTimer == 0) {
        breakable_box_init();
    }
    if (F.cur_obj_was_attacked_or_ground_pounded()) {
        F.obj_explode_and_spawn_coins(46.0, 1);
        create_sound_spawner(SOUND_GENERAL_BREAK_BOX);
    }
}
function spawn_sparkle_particles(n, a1, a2, r) {
    const o = W.gCurrentObject;
    let D_8035FF10 = 0;
    let i = 0;
    let separation = s16(0x10000 / n);
    for (i = 0; i < n; i++) {
        spawn_object_relative(0, sins(D_8035FF10 + i * separation) * a1, (i + 1) * a2, coss(D_8035FF10 + i * separation) * a1, o, MODEL_NONE,B.bhvSparkleSpawn);
    }
    D_8035FF10 = s16(D_8035FF10 + (r * 0x100));
}
function arc_to_goal_pos(a0, a1, yVel, gravity) {
    const o = W.gCurrentObject;
    let dx = a0[0] - a1[0];
    let dz = a0[2] - a1[2];
    let planarDist = Math.sqrt(dx * dx + dz * dz);
    let time = 0;
    o.oMoveAngleYaw = atan2s(dz, dx);
    o.oVelY = yVel;
    o.oGravity = gravity;
    time = -2.0 / o.oGravity * yVel - 1.0;
    o.oForwardVel = planarDist / time;
    return time;
}
function grand_star_zero_velocity() {
    const o = W.gCurrentObject;
    o.oGravity = 0.0;
    o.oVelY = 0.0;
    o.oForwardVel = 0.0;
}
function bhv_grand_star_loop() {
    const o = W.gCurrentObject;
    let filler = new Array(4).fill(0);
    let sp28 = [0, 0, 0];
    sp28[0] = sp28[1] = sp28[2] = 0.0;
    if (o.oAction == 0) {
        if (o.oTimer == 0) {
            F.obj_set_angle(o, 0, 0, 0);
            o.oAngleVelYaw = 0x400;
            cur_obj_play_sound_2(SOUND_GENERAL2_STAR_APPEARS);
        }
        if (o.oTimer > 70) {
            o.oAction++;
        }
        spawn_sparkle_particles(3, 200, 80, -60);
    } else if (o.oAction == 1) {
        if (o.oTimer == 0) {
            cur_obj_play_sound_2(SOUND_GENERAL_GRAND_STAR);
            F.cutscene_object(CUTSCENE_STAR_SPAWN, o);
            o.oGrandStarUnk108 = arc_to_goal_pos(sp28, REF(o, 'oPosX'), 80.0, -2.0);
        }
        F.cur_obj_move_using_fvel_and_gravity();
        if (o.oSubAction == 0) {
            if (o.oPosY < o.oHomeY) {
                o.oPosY = o.oHomeY;
                o.oVelY = 60.0;
                o.oForwardVel = 0.0;
                o.oSubAction++;
                cur_obj_play_sound_2(SOUND_GENERAL_GRAND_STAR_JUMP);
            }
        } else if (o.oVelY < 0.0 && o.oPosY < o.oHomeY + 200.0) {
            o.oPosY = o.oHomeY + 200.0;
            grand_star_zero_velocity();
            W.gObjCutsceneDone = true;
            F.set_mario_npc_dialog(MARIO_DIALOG_STOP);
            o.oAction++;
            o.oInteractStatus = 0;
            cur_obj_play_sound_2(SOUND_GENERAL_GRAND_STAR_JUMP);
        }
        spawn_sparkle_particles(3, 200, 80, -60);
    } else {
        F.cur_obj_become_tangible();
        if (o.oInteractStatus & INT_STATUS_INTERACTED) {
            F.obj_mark_for_deletion(o);
            o.oInteractStatus = 0;
        }
    }
    if (o.oAngleVelYaw > 0x400) {
        o.oAngleVelYaw -= 0x100;
    }
    o.oFaceAngleYaw += o.oAngleVelYaw;
    F.cur_obj_scale(2.0);
    o.oGraphYOffset = 110.0;
}
let sBowserKeyHitbox = { interactType: INTERACT_STAR_OR_KEY, downOffset: 0, damageOrCoinValue: 0, health: 0, numLootCoins: 0, radius: 160, height: 100, hurtboxRadius: 160, hurtboxHeight: 100 };
function bhv_bowser_key_loop() {
    const o = W.gCurrentObject;
    F.cur_obj_scale(0.5);
    if (o.oAngleVelYaw > 0x400) {
        o.oAngleVelYaw -= 0x100;
    }
    o.oFaceAngleYaw += o.oAngleVelYaw;
    o.oFaceAngleRoll = -0x4000;
    o.oGraphYOffset = 165.0;
    if (o.oAction == 0) {
        if (o.oTimer == 0) {
            o.oVelY = 70.0;
        }
        spawn_sparkle_particles(3, 200, 80, -60);
        spawn_object(o, MODEL_NONE,B.bhvSparkleSpawn);
        F.cur_obj_update_floor_and_walls();
        F.cur_obj_move_standard(78);
        if (o.oMoveFlags & OBJ_MOVE_ON_GROUND) {
            o.oAction++;
        } else if (o.oMoveFlags & OBJ_MOVE_LANDED) {
            cur_obj_play_sound_2(SOUND_GENERAL_UNKNOWN3);
        }
    } else {
        F.obj_set_hitbox(o, sBowserKeyHitbox);
        if (o.oInteractStatus & INT_STATUS_INTERACTED) {
            F.mark_obj_for_deletion(o);
            o.oInteractStatus = 0;
        }
    }
}
function bowser_tail_anchor_act_default() {
    const o = W.gCurrentObject;
    let bowser = o.parentObj;
    F.cur_obj_become_tangible();
    F.cur_obj_scale(1.0);
    if (bowser.oAction == BOWSER_ACT_TILT_LAVA_PLATFORM) {
        bowser.oIntangibleTimer = -1;
    } else if (F.obj_check_if_collided_with_object(o, W.gMarioObject)) {
        bowser.oIntangibleTimer = 0;
        o.oAction = BOWSER_ACT_TAIL_TOUCHED_MARIO;
    } else {
        bowser.oIntangibleTimer = -1;
    }
}
function bowser_tail_anchor_thrown() {
    const o = W.gCurrentObject;
    if (o.oTimer > 30) {
        o.oAction = BOWSER_ACT_TAIL_DEFAULT;
    }
}
function bowser_tail_anchor_act_touched_mario() {
    const o = W.gCurrentObject;
    if (o.parentObj.oAction == BOWSER_ACT_TILT_LAVA_PLATFORM) {
        o.parentObj.oIntangibleTimer = -1;
        o.oAction = BOWSER_ACT_TAIL_DEFAULT;
    }
    F.cur_obj_become_intangible();
}
let sBowserTailAnchorActions = [bowser_tail_anchor_act_default, bowser_tail_anchor_thrown, bowser_tail_anchor_act_touched_mario];
function bhv_bowser_tail_anchor_loop() {
    const o = W.gCurrentObject;
    F.cur_obj_call_action_function(sBowserTailAnchorActions);
    o.oParentRelativePosX = 90.0;
    if (o.parentObj.oAction == BOWSER_ACT_DEAD) {
        o.parentObj.oIntangibleTimer = -1;
    }
    o.oInteractStatus = 0;
}
function bhv_bowser_flame_spawn_loop() {
    const o = W.gCurrentObject;
    let bowser = o.parentObj;
    let animFrame = 0;
    let posX = 0;
    let posZ = 0;
    let cossYaw = coss(bowser.oMoveAngleYaw);
    let sinsYaw = sins(bowser.oMoveAngleYaw);
    let data = dBowserFlamesOrientationValues;
    if (bowser.oSoundStateID == BOWSER_ANIM_BREATH) {
        animFrame = bowser.gfx.anim.frame + 1.0;
        if (bowser.gfx.anim.anim.loopEnd == animFrame) {
            animFrame = 0;
        }
        if (animFrame > 45 && animFrame < 85) {
            cur_obj_play_sound_1(SOUND_AIR_BOWSER_SPIT_FIRE);
            posX = data[5 * animFrame];
            posZ = data[5 * animFrame + 2];
            o.oPosX = bowser.oPosX + (posZ * sinsYaw + posX * cossYaw);
            o.oPosY = bowser.oPosY + data[5 * animFrame + 1];
            o.oPosZ = bowser.oPosZ + (posZ * cossYaw - posX * sinsYaw);
            o.oMoveAnglePitch = data[5 * animFrame + 4] + 0xC00;
            o.oMoveAngleYaw = data[5 * animFrame + 3] + s16(bowser.oMoveAngleYaw);
            if (!(animFrame & 1)) {
                spawn_object(o, MODEL_RED_FLAME,B.bhvFlameMovingForwardGrowing);
            }
        }
    }
}
function bhv_bowser_body_anchor_loop() {
    const o = W.gCurrentObject;
    F.obj_copy_pos_and_angle(o, o.parentObj);
    if (o.parentObj.oAction == BOWSER_ACT_DEAD) {
        o.oInteractType = INTERACT_TEXT;
    } else {
        o.oInteractType = INTERACT_DAMAGE;
        if (o.parentObj.oOpacity < 100) {
            F.cur_obj_become_intangible();
        } else {
            F.cur_obj_become_tangible();
        }
    }
    if (o.parentObj.oHeldState != HELD_FREE) {
        F.cur_obj_become_intangible();
    }
    o.oInteractStatus = 0;
}
function bowser_spawn_shockwave() {
    const o = W.gCurrentObject;
    if (o.oBhvParams2ndByte == BOWSER_BP_BITS) {
        let wave = spawn_object(o, MODEL_BOWSER_WAVE,B.bhvBowserShockWave);
        wave.oPosY = o.oFloorHeight;
        return true;
    }
    return false;
}
function bowser_set_anim_look_up_and_walk() {
    const o = W.gCurrentObject;
    F.cur_obj_init_animation_with_sound(BOWSER_ANIM_LOOK_UP_START_WALK);
    if (F.cur_obj_check_anim_frame(21)) {
        o.oForwardVel = 3.0;
    }
    if (F.cur_obj_check_if_near_animation_end()) {
        return true;
    } else {
        return false;
    }
}
function bowser_set_anim_slow_gait() {
    const o = W.gCurrentObject;
    o.oForwardVel = 3.0;
    F.cur_obj_init_animation_with_sound(BOWSER_ANIM_SLOW_GAIT);
    if (F.cur_obj_check_if_near_animation_end()) {
        return true;
    } else {
        return false;
    }
}
function bowser_set_anim_look_down_stop_walk() {
    const o = W.gCurrentObject;
    F.cur_obj_init_animation_with_sound(BOWSER_ANIM_LOOK_DOWN_STOP_WALK);
    if (F.cur_obj_check_anim_frame(20)) {
        o.oForwardVel = 0.0;
    }
    if (F.cur_obj_check_if_near_animation_end()) {
        return true;
    } else {
        return false;
    }
}
function bowser_init_camera_actions() {
    const o = W.gCurrentObject;
    if (o.oBowserCamAct == BOWSER_CAM_ACT_IDLE) {
        o.oAction = BOWSER_ACT_WAIT;
    } else if (o.oBowserCamAct == BOWSER_CAM_ACT_WALK) {
        o.oAction = BOWSER_ACT_INTRO_WALK;
    } else if (o.oBhvParams2ndByte == BOWSER_BP_BITFS) {
        o.oAction = BOWSER_ACT_BIG_JUMP;
    } else {
        o.oAction = BOWSER_ACT_DEFAULT;
    }
}
function bowser_act_wait() {
    const o = W.gCurrentObject;
    o.oForwardVel = 0.0;
    F.cur_obj_init_animation_with_sound(BOWSER_ANIM_IDLE);
    bowser_init_camera_actions();
}
function bowser_act_intro_walk() {
    const o = W.gCurrentObject;
    if (o.oSubAction == 0) {
        if (bowser_set_anim_look_up_and_walk()) {
            o.oSubAction++;
        }
    } else if (o.oSubAction == 1) {
        if (bowser_set_anim_slow_gait()) {
            o.oSubAction++;
        }
    } else if (bowser_set_anim_look_down_stop_walk()) {
        if (o.oBowserCamAct == BOWSER_CAM_ACT_WALK) {
            o.oBowserCamAct = BOWSER_CAM_ACT_IDLE;
        }
        bowser_init_camera_actions();
    }
}
let sBowserDebugActions = [BOWSER_ACT_CHARGE_MARIO, BOWSER_ACT_SPIT_FIRE_INTO_SKY, BOWSER_ACT_SPIT_FIRE_ONTO_FLOOR, BOWSER_ACT_HIT_MINE, BOWSER_ACT_BIG_JUMP, BOWSER_ACT_WALK_TO_MARIO, BOWSER_ACT_BREATH_FIRE, BOWSER_ACT_DEAD, BOWSER_ACT_DANCE, BOWSER_ACT_TELEPORT, BOWSER_ACT_QUICK_JUMP, BOWSER_ACT_TILT_LAVA_PLATFORM, BOWSER_ACT_DANCE, BOWSER_ACT_DANCE, BOWSER_ACT_DANCE, BOWSER_ACT_DANCE];
function bowser_debug_actions() {
    const o = W.gCurrentObject;
    if (W.gDebugInfo[DEBUG_PAGE_ENEMYINFO][1] != 0) {
        o.oAction = sBowserDebugActions[W.gDebugInfo[DEBUG_PAGE_ENEMYINFO][2] & 0x0F];
        W.gDebugInfo[DEBUG_PAGE_ENEMYINFO][1] = 0;
    }
}
function bowser_bitdw_actions() {
    const o = W.gCurrentObject;
    let rand = F.random_float();
    if (!o.oBowserIsReacting) {
        if (o.oBowserStatus & BOWSER_STATUS_ANGLE_MARIO) {
            if (o.oDistanceToMario < 1500.0) { 
                o.oAction = BOWSER_ACT_BREATH_FIRE;
            } else { 
                o.oAction = BOWSER_ACT_QUICK_JUMP;
            }
        } else {
            o.oAction = BOWSER_ACT_WALK_TO_MARIO;
        }
        o.oBowserIsReacting++;
    } else {
        o.oBowserIsReacting = false;
        if (W.gCurrDemoInput == null) { 
            if (rand < 0.1) {
                o.oAction = BOWSER_ACT_DANCE; 
            } else {
                o.oAction = BOWSER_ACT_WALK_TO_MARIO; 
            }
        } else {
            o.oAction = BOWSER_ACT_WALK_TO_MARIO;
        }
    }
}
function bowser_bitfs_actions() {
    const o = W.gCurrentObject;
    let rand = F.random_float();
    if (!o.oBowserIsReacting) {
        if (o.oBowserStatus & BOWSER_STATUS_ANGLE_MARIO) {
            if (o.oDistanceToMario < 1300.0) {  
                if (rand < 0.5) { 
                    o.oAction = BOWSER_ACT_TELEPORT;
                } else {
                    o.oAction = BOWSER_ACT_SPIT_FIRE_ONTO_FLOOR;
                }
            } else { 
                o.oAction = BOWSER_ACT_CHARGE_MARIO;
                if (500.0 < o.oBowserDistToCenter && o.oBowserDistToCenter < 1500.0 && rand < 0.5) {
                    o.oAction = BOWSER_ACT_BIG_JUMP;
                }
            }
        } else {
            o.oAction = BOWSER_ACT_WALK_TO_MARIO;
        }
        o.oBowserIsReacting++;
    } else {
        o.oBowserIsReacting = false;
        o.oAction = BOWSER_ACT_WALK_TO_MARIO;
    }
}
function bowser_bits_action_list() {
    const o = W.gCurrentObject;
    let rand = F.random_float();
    if (o.oBowserStatus & BOWSER_STATUS_ANGLE_MARIO) {
        if (o.oDistanceToMario < 1000.0) { 
            if (rand < 0.4) {
                o.oAction = BOWSER_ACT_SPIT_FIRE_ONTO_FLOOR; 
            } else if (rand < 0.8) {
                o.oAction = BOWSER_ACT_SPIT_FIRE_INTO_SKY; 
            } else {
                o.oAction = BOWSER_ACT_BREATH_FIRE;
            }
        } else { 
            if (rand < 0.5) {
                o.oAction = BOWSER_ACT_BIG_JUMP; 
            } else {
                o.oAction = BOWSER_ACT_CHARGE_MARIO;
            }
        }
    } else {
        o.oAction = BOWSER_ACT_WALK_TO_MARIO;
    }
}
function bowser_set_act_big_jump() {
    const o = W.gCurrentObject;
    o.oAction = BOWSER_ACT_BIG_JUMP;
}
function bowser_bits_actions() {
    const o = W.gCurrentObject;
    switch (o.oBowserIsReacting) {
        case false:
            if (o.oBowserBitSJustJump == false) {
                bowser_bits_action_list();
            } else {
                bowser_set_act_big_jump();
            }
            o.oBowserIsReacting = true;
            break;
        case true:
            o.oBowserIsReacting = false;
            o.oAction = BOWSER_ACT_WALK_TO_MARIO;
            break;
    }
}
function bowser_act_idle() {
    const o = W.gCurrentObject;
    if (F.cur_obj_init_animation_and_check_if_near_end(BOWSER_ANIM_IDLE)) {
        o.oAction = BOWSER_ACT_DEFAULT;
    }
}
function bowser_act_default() {
    const o = W.gCurrentObject;
    o.oBowserEyesShut = false;
    F.cur_obj_init_animation_with_sound(BOWSER_ANIM_IDLE);
    o.oAngleVelYaw = 0;
    o.oForwardVel = 0.0;
    o.oVelY = 0.0;
    if (o.oBhvParams2ndByte == BOWSER_BP_BITDW) {
        bowser_bitdw_actions();
    } else if (o.oBhvParams2ndByte == BOWSER_BP_BITFS) {
        bowser_bitfs_actions();
    } else { 
        bowser_bits_actions();
    }
}
function bowser_act_breath_fire() {
    const o = W.gCurrentObject;
    o.oForwardVel = 0.0;
    if (o.oTimer == 0) {
        cur_obj_play_sound_2(SOUND_OBJ_BOWSER_INHALING);
    }
    if (F.cur_obj_init_animation_and_check_if_near_end(BOWSER_ANIM_BREATH)) {
        o.oAction = BOWSER_ACT_DEFAULT;
    }
}
function bowser_act_walk_to_mario() {
    let facing = 0;
    let turnSpeed = 0;
    let angleFromMario = s16(F.abs_angle_diff(o.oMoveAngleYaw, o.oAngleToMario));
    if (o.oBhvParams2ndByte == BOWSER_BP_BITFS) {
        turnSpeed = s16(0x400);
    } else { 
        if (o.oHealth >= 3) {
            turnSpeed = s16(0x400);
        } else if (o.oHealth == 2) {
            turnSpeed = s16(0x300);
        } else { 
            turnSpeed = s16(0x200);
        }
    }
    facing = F.cur_obj_rotate_yaw_toward(o.oAngleToMario, turnSpeed);
    if (o.oSubAction == 0) {
        o.oBowserTimer = 0;
        if (bowser_set_anim_look_up_and_walk()) {
            o.oSubAction++;
        }
    } else if (o.oSubAction == 1) {
        if (bowser_set_anim_slow_gait()) {
            o.oBowserTimer++;
            if (o.oBowserStatus & BOWSER_STATUS_FIRE_SKY) {
                if (o.oBowserTimer > 4) {
                    o.oBowserStatus &= ~BOWSER_STATUS_FIRE_SKY;
                }
            } else if (angleFromMario < 0x2000) {
                o.oSubAction++;
            }
        }
    } else if (bowser_set_anim_look_down_stop_walk()) {
        o.oAction = BOWSER_ACT_DEFAULT;
    }
}
function bowser_act_teleport() {
    const o = W.gCurrentObject;
    switch (o.oSubAction) {
        case BOWSER_SUB_ACT_TELEPORT_START:
            F.cur_obj_become_intangible();
            o.oBowserTargetOpacity = 0;
            o.oBowserTimer = 30; 
            if (o.oTimer == 0) {
                cur_obj_play_sound_2(SOUND_OBJ2_BOWSER_TELEPORT);
            }
            if (o.oOpacity == 0) {
                o.oSubAction++;
                o.oMoveAngleYaw = o.oAngleToMario;
            }
            break;
        case BOWSER_SUB_ACT_TELEPORT_MOVE:
            if (o.oBowserTimer--) {
                o.oForwardVel = 100.0;
            } else {
                o.oSubAction = BOWSER_SUB_ACT_TELEPORT_STOP;
                o.oMoveAngleYaw = o.oAngleToMario; 
            }
            if (F.abs_angle_diff(o.oMoveAngleYaw, o.oAngleToMario) > 0x4000) {
                if (o.oDistanceToMario > 500.0) {
                    o.oSubAction = BOWSER_SUB_ACT_TELEPORT_STOP;
                    o.oMoveAngleYaw = o.oAngleToMario; 
                    cur_obj_play_sound_2(SOUND_OBJ2_BOWSER_TELEPORT);
                }
            }
            break;
        case BOWSER_SUB_ACT_TELEPORT_STOP:
            o.oForwardVel = 0.0; 
            o.oBowserTargetOpacity = 255;
            if (o.oOpacity == 255) {
                o.oAction = BOWSER_ACT_DEFAULT;
            }
            F.cur_obj_become_tangible();
            break;
    }
}
function bowser_act_spit_fire_into_sky() {
    const o = W.gCurrentObject;
    let animFrame = 0;
    F.cur_obj_init_animation_with_sound(BOWSER_ANIM_BREATH_UP);
    animFrame = o.gfx.anim.frame;
    if (animFrame > 24 && animFrame < 36) {
        cur_obj_play_sound_1(SOUND_AIR_BOWSER_SPIT_FIRE);
        if (animFrame == 35) { 
            spawn_object_relative(1, 0, 400, 100, o, MODEL_RED_FLAME,B.bhvBlueBowserFlame);
        } else { 
            spawn_object_relative(0, 0, 400, 100, o, MODEL_RED_FLAME,B.bhvBlueBowserFlame);
        }
    }
    if (F.cur_obj_check_if_near_animation_end()) {
        o.oAction = BOWSER_ACT_DEFAULT;
    }
    o.oBowserStatus |= BOWSER_STATUS_FIRE_SKY;
}
function bowser_act_hit_mine() {
    const o = W.gCurrentObject;
    if (o.oTimer == 0) {
        o.oForwardVel = -400.0;
        o.oVelY = 100.0;
        o.oMoveAngleYaw = o.oBowserAngleToCenter + 0x8000;
        o.oBowserEyesShut = true; 
    }
    if (o.oSubAction == BOWSER_SUB_ACT_HIT_MINE_START) {
        F.cur_obj_init_animation_with_sound(BOWSER_ANIM_FLIP);
        o.oSubAction++;
        o.oBowserTimer = 0;
    } else if (o.oSubAction == BOWSER_SUB_ACT_HIT_MINE_FALL) {
        F.cur_obj_init_animation_with_sound(BOWSER_ANIM_FLIP);
        cur_obj_extend_animation_if_at_end();
        F.bowser_bounce_effects(REF(o, 'oBowserTimer'));
        if (o.oBowserTimer > 2) {
            F.cur_obj_init_animation_with_sound(BOWSER_ANIM_STAND_UP_FROM_FLIP);
            o.oVelY = 0.0;
            o.oForwardVel = 0.0;
            o.oSubAction++;
        }
    } else if (o.oSubAction == BOWSER_SUB_ACT_HIT_MINE_STOP) {
        if (F.cur_obj_check_if_near_animation_end()) {
            if (o.oHealth == 1) {
                o.oAction = BOWSER_ACT_DANCE;
            } else {
                o.oAction = BOWSER_ACT_DEFAULT;
            }
            o.oBowserEyesShut = false; 
        }
    } else {
    }
}
function bowser_set_anim_jump() {
    F.cur_obj_init_animation_with_sound(BOWSER_ANIM_JUMP_START);
    if (F.cur_obj_check_anim_frame(11)) {
        return true;
    } else {
        return false;
    }
}
function bowser_land() {
    const o = W.gCurrentObject;
    if (o.oMoveFlags & OBJ_MOVE_LANDED) {
        o.oForwardVel = 0.0;
        o.oVelY = 0.0;
        spawn_mist_particles_variable(0, 0, 60.0);
        F.cur_obj_init_animation_with_sound(BOWSER_ANIM_JUMP_STOP);
        o.gfx.anim.frame = 0;
        F.cur_obj_start_cam_event(o, CAM_EVENT_BOWSER_JUMP);
        if (o.oBhvParams2ndByte == BOWSER_BP_BITDW) {
            if (o.oDistanceToMario < 850.0) {
                W.gMarioObject.oInteractStatus |= INT_STATUS_MARIO_KNOCKBACK_DMG;
            } else {
                W.gMarioObject.oInteractStatus |= INT_STATUS_MARIO_STUNNED;
            }
        }
        return true;
    } else {
        return false;
    }
}
function bowser_short_second_hop() {
    const o = W.gCurrentObject;
    if (o.oBhvParams2ndByte == BOWSER_BP_BITS && o.oBowserStatus & BOWSER_STATUS_BIG_JUMP) {
        if (o.oBowserDistToCenter > 1000.0) {
            o.oForwardVel = 60.0;
        }
    }
}
function bowser_act_big_jump() {
    const o = W.gCurrentObject;
    let filler = new Array(4).fill(0);
    if (o.oSubAction == 0) {
        if (bowser_set_anim_jump()) {
            if (o.oBhvParams2ndByte == BOWSER_BP_BITS && o.oBowserStatus & BOWSER_STATUS_BIG_JUMP) {
                o.oVelY = 70.0;
            } else {
                o.oVelY = 80.0;
            }
            o.oBowserTimer = 0;
            bowser_short_second_hop();
            o.oSubAction++;
        }
    } else if (o.oSubAction == 1) {
        if (bowser_land()) {
            o.oBowserStatus &= ~BOWSER_STATUS_BIG_JUMP;
            o.oForwardVel = 0.0;
            o.oSubAction++;
            bowser_spawn_shockwave();
            if (o.oBhvParams2ndByte == BOWSER_BP_BITFS) {
                o.oAction = BOWSER_ACT_TILT_LAVA_PLATFORM;
            }
        } else {
        }
    } else if (F.cur_obj_check_if_near_animation_end()) {
        o.oAction = BOWSER_ACT_DEFAULT;
    }
}
let sBowserVelYAir = [60];
let sBowserFVelAir = [50];
function bowser_act_quick_jump() {
    const o = W.gCurrentObject;
    let velY = sBowserVelYAir[0];
    let fVel = sBowserFVelAir[0];
    if (o.oSubAction == 0) {
        if (bowser_set_anim_jump()) {
            o.oVelY = velY;
            o.oForwardVel = fVel;
            o.oBowserTimer = 0;
            o.oSubAction++;
        }
    } else if (o.oSubAction == 1) {
        if (bowser_land()) {
            o.oSubAction++;
        }
    } else if (F.cur_obj_check_if_near_animation_end()) {
        o.oAction = BOWSER_ACT_DEFAULT;
    }
}
function bowser_act_hit_edge() {
    const o = W.gCurrentObject;
    o.oForwardVel = 0.0;
    if (o.oTimer == 0) {
        o.oBowserTimer = 0;
    }
    switch (o.oSubAction) {
        case 0:
            F.cur_obj_init_animation_with_sound(BOWSER_ANIM_EDGE_MOVE);
            if (F.cur_obj_check_if_near_animation_end()) {
                o.oBowserTimer++;
            }
            if (o.oBowserTimer > 0) {
                o.oSubAction++;
            }
            break;
        case 1:
            F.cur_obj_init_animation_with_sound(BOWSER_ANIM_EDGE_STOP);
            if (F.cur_obj_check_if_near_animation_end()) {
                o.oAction = BOWSER_ACT_TURN_FROM_EDGE;
            }
            break;
    }
}
function bowser_act_spit_fire_onto_floor() {
    const o = W.gCurrentObject;
    if (W.gHudDisplay.wedges < 4) {
        o.oBowserRandSplitFloor = 3;
    } else {
        o.oBowserRandSplitFloor = F.random_float() * 3.0 + 1.0;
    }
    F.cur_obj_init_animation_with_sound(BOWSER_ANIM_BREATH_QUICK);
    if (F.cur_obj_check_anim_frame(5)) {
        F.obj_spit_fire(0, 200, 180, 7.0, MODEL_RED_FLAME, 30.0, 10.0, 0x1000);
    }
    if (F.cur_obj_check_if_near_animation_end()) {
        o.oSubAction++;
    }
    if (o.oSubAction >= o.oBowserRandSplitFloor) {
        o.oAction = BOWSER_ACT_DEFAULT;
    }
}
function bowser_turn_on_timer(time, yaw) {
    const o = W.gCurrentObject;
    if (o.oSubAction == 0) {
        if (F.cur_obj_init_animation_and_check_if_near_end(BOWSER_ANIM_LOOK_UP_START_WALK)) {
            o.oSubAction++;
        }
    } else if (o.oSubAction == 1) {
        if (F.cur_obj_init_animation_and_check_if_near_end(BOWSER_ANIM_LOOK_DOWN_STOP_WALK)) {
            o.oSubAction++;
        }
    } else {
        F.cur_obj_init_animation_with_sound(BOWSER_ANIM_IDLE);
    }
    o.oForwardVel = 0.0;
    o.oMoveAngleYaw += yaw;
    if (o.oTimer >= time) {
        return true;
    } else {
        return false;
    }
}
function bowser_act_turn_from_edge() {
    const o = W.gCurrentObject;
    if (bowser_turn_on_timer(63, 0x200)) {
        o.oAction = BOWSER_ACT_DEFAULT;
    }
}
function bowser_act_charge_mario() {
    const o = W.gCurrentObject;
    let time = 0;
    if (o.oTimer == 0) {
        o.oForwardVel = 0.0;
    }
    switch (o.oSubAction) {
        case BOWSER_SUB_ACT_CHARGE_START:
            o.oBowserTimer = 0;
            if (F.cur_obj_init_animation_and_check_if_near_end(BOWSER_ANIM_RUN_START)) {
                o.oSubAction = BOWSER_SUB_ACT_CHARGE_RUN;
            }
            break;
        case BOWSER_SUB_ACT_CHARGE_RUN:
            o.oForwardVel = 50.0;
            if (F.cur_obj_init_animation_and_check_if_near_end(BOWSER_ANIM_RUN)) {
                o.oBowserTimer++;
                if (o.oBowserTimer >= 6) {
                    o.oSubAction = BOWSER_SUB_ACT_CHARGE_SLIP;
                }
                if (o.oBowserTimer >= 2) {
                    if (F.abs_angle_diff(o.oAngleToMario, o.oMoveAngleYaw) > 0x2000) {
                        o.oSubAction = BOWSER_SUB_ACT_CHARGE_SLIP;
                    }
                }
            }
            F.cur_obj_rotate_yaw_toward(o.oAngleToMario, 0x200);
            break;
        case BOWSER_SUB_ACT_CHARGE_SLIP:
            o.oBowserTimer = 0;
            F.cur_obj_init_animation_with_sound(BOWSER_ANIM_RUN_SLIP);
            spawn_object_relative_with_scale(0, 100, -50, 0, 3.0, o, MODEL_SMOKE,B.bhvWhitePuffSmoke2);
            spawn_object_relative_with_scale(0, -100, -50, 0, 3.0, o, MODEL_SMOKE,B.bhvWhitePuffSmoke2);
            if (F.approach_f32_signed(REF(o, 'oForwardVel'), 0, -1.0)) {
                o.oSubAction = BOWSER_SUB_ACT_CHARGE_END;
            }
            cur_obj_extend_animation_if_at_end();
            break;
        case BOWSER_SUB_ACT_CHARGE_END:
            o.oForwardVel = 0.0;
            F.cur_obj_init_animation_with_sound(BOWSER_ANIM_RUN_STOP);
            if (F.cur_obj_check_if_near_animation_end()) {
                if (o.oBhvParams2ndByte == BOWSER_BP_BITS) {
                    time = 10;
                } else {
                    time = 30;
                }
                if (o.oBowserTimer > time) {
                    o.oAction = BOWSER_ACT_DEFAULT;
                }
                o.oBowserTimer++;
            }
            cur_obj_extend_animation_if_at_end();
            break;
    }
    if (o.oMoveFlags & OBJ_MOVE_HIT_EDGE) {
        o.oAction = BOWSER_ACT_HIT_EDGE;
    }
}
function bowser_check_hit_mine() {
    let mine = null;
    let dist = 0;
    mine = cur_obj_find_nearest_object_with_behavior(B.bhvBowserBomb, REFV(() => dist, $ => dist = $));
    if (mine != null && dist < 800.0) {
        mine.oInteractStatus |= INT_STATUS_HIT_MINE;
        return true;
    }
    return false;
}
function bowser_act_thrown() {
    const o = W.gCurrentObject;
    let filler = new Array(4).fill(0);
    if (o.oTimer < 2) {
        o.oBowserTimer = 0;
    }
    if (o.oSubAction == 0) {
        F.cur_obj_init_animation_with_sound(BOWSER_ANIM_SHAKING);
        F.bowser_bounce_effects(REF(o, 'oBowserTimer'));
        if (o.oMoveFlags & OBJ_MOVE_ON_GROUND) {
            o.oForwardVel = 0.0;
            o.oSubAction++; 
        }
    } else if (F.cur_obj_init_animation_and_check_if_near_end(BOWSER_ANIM_STAND_UP)) {
        o.oAction = BOWSER_ACT_DEFAULT;
    }
    if (bowser_check_hit_mine()) {
        o.oHealth--;
        if (o.oHealth <= 0) {
            o.oAction = BOWSER_ACT_DEAD;
        } else {
            o.oAction = BOWSER_ACT_HIT_MINE;
        }
    }
}
function bowser_set_goal_invisible() {
    const o = W.gCurrentObject;
    o.oBowserTargetOpacity = 0;
    if (o.oOpacity == 0) {
        o.oForwardVel = 0.0;
        o.oVelY = 0.0;
        o.oPosY = o.oHomeY - 1000.0;
    }
}
function bowser_act_jump_onto_stage() {
    const o = W.gCurrentObject;
    let onDynamicFloor = 0;
    let filler = new Array(4).fill(0);
    let floor = o.oFloor;
    if (floor != null && floor.flags & SURFACE_FLAG_DYNAMIC) {
        onDynamicFloor = true;
    } else {
        onDynamicFloor = false;
    }
    o.oBowserStatus |= BOWSER_STATUS_BIG_JUMP;
    switch (o.oSubAction) {
        case BOWSER_SUB_ACT_JUMP_ON_STAGE_IDLE:
            if (o.oTimer == 0) {
                o.oFaceAnglePitch = 0;
                o.oFaceAngleRoll = 0;
            } 
            o.oFaceAnglePitch += 0x800;
            o.oFaceAngleRoll += 0x800;
            if (!(o.oFaceAnglePitch & 0xFFFF)) {
                o.oSubAction++;
            }
            bowser_set_goal_invisible();
            break;
        case BOWSER_SUB_ACT_JUMP_ON_STAGE_START:
            F.cur_obj_init_animation_with_sound(BOWSER_ANIM_JUMP_START);
            if (F.cur_obj_check_anim_frame(11)) {
                o.oMoveAngleYaw = o.oBowserAngleToCenter;
                o.oVelY = 150.0;
                o.oBowserTargetOpacity = 255;
                o.oBowserTimer = 0;
                o.oSubAction++;
            } else {
                bowser_set_goal_invisible();
            }
            break;
        case BOWSER_SUB_ACT_JUMP_ON_STAGE_LAND:
            if (o.oPosY > o.oHomeY) {
                o.oDragStrength = 0.0;
                if (o.oBowserDistToCenter < 2500.0) {
                    if (Math.abs(o.oFloorHeight - o.oHomeY) < 100.0) {
                        F.approach_f32_signed(REF(o, 'oForwardVel'), 0, -5.0);
                    } else {
                        F.cur_obj_forward_vel_approach_upward(150.0, 2.0);
                    }
                } else {
                    F.cur_obj_forward_vel_approach_upward(150.0, 2.0);
                }
            }
            if (bowser_land()) {
                o.oDragStrength = 10.0;
                o.oSubAction++;
                if (onDynamicFloor == false) {
                    bowser_spawn_shockwave();
                } else if (o.oBhvParams2ndByte == BOWSER_BP_BITS) {
                    o.oAction = BOWSER_ACT_BIG_JUMP;
                }
                if (o.oBhvParams2ndByte == BOWSER_BP_BITFS) {
                    o.oAction = BOWSER_ACT_TILT_LAVA_PLATFORM;
                }
            }
            if (o.oVelY < 0.0 && o.oPosY < o.oHomeY - 300.0) {
                o.oPosZ = 0.0, o.oPosX = o.oPosZ;
                o.oPosY = o.oHomeY + 2000.0;
                o.oVelY = 0.0;
            }
            break;
        case BOWSER_SUB_ACT_JUMP_ON_STAGE_STOP:
            if (F.cur_obj_check_if_near_animation_end()) {
                o.oAction = BOWSER_ACT_DEFAULT;
                o.oBowserStatus &= ~BOWSER_STATUS_BIG_JUMP;
                cur_obj_extend_animation_if_at_end();
            }
            break;
    }
    print_debug_bottom_up("sp %d", o.oForwardVel);
}
let sBowserDanceStepNoises = [24, 42, 60, -1];
function bowser_act_dance() {
    const o = W.gCurrentObject;
    if (F.is_item_in_array(o.oTimer, sBowserDanceStepNoises)) {
        cur_obj_play_sound_2(SOUND_OBJ_BOWSER_WALK);
    }
    if (F.cur_obj_init_animation_and_check_if_near_end(BOWSER_ANIM_DANCE)) {
        o.oAction = BOWSER_ACT_DEFAULT;
    }
}
function bowser_spawn_collectable() {
    const o = W.gCurrentObject;
    if (o.oBhvParams2ndByte == BOWSER_BP_BITS) {
        W.gSecondCameraFocus = spawn_object(o, MODEL_STAR,B.bhvGrandStar);
    } else {
        W.gSecondCameraFocus = spawn_object(o, MODEL_BOWSER_KEY,B.bhvBowserKey);
        cur_obj_play_sound_2(SOUND_GENERAL2_BOWSER_KEY);
    }
    W.gSecondCameraFocus.oAngleVelYaw = o.oAngleVelYaw;
}
function bowser_fly_back_dead() {
    const o = W.gCurrentObject;
    F.cur_obj_init_animation_with_sound(BOWSER_ANIM_FLIP_DOWN);
    if (o.oBhvParams2ndByte == BOWSER_BP_BITS) {
        o.oForwardVel = -400.0;
    } else {
        o.oForwardVel = -200.0;
    }
    o.oVelY = 100.0;
    o.oMoveAngleYaw = o.oBowserAngleToCenter + 0x8000;
    o.oBowserTimer = 0;
    o.oSubAction++; 
}
function bowser_dead_bounce() {
    const o = W.gCurrentObject;
    o.oBowserEyesShut = true; 
    F.bowser_bounce_effects(REF(o, 'oBowserTimer'));
    if (o.oMoveFlags & OBJ_MOVE_LANDED) {
        cur_obj_play_sound_2(SOUND_OBJ_BOWSER_WALK);
    }
    if (o.oMoveFlags & OBJ_MOVE_ON_GROUND) {
        o.oForwardVel = 0.0;
        o.oSubAction++; 
    }
}
function bowser_dead_wait_for_mario() {
    const o = W.gCurrentObject;
    let ret = false;
    F.cur_obj_become_intangible();
    if (F.cur_obj_init_animation_and_check_if_near_end(BOWSER_ANIM_LAY_DOWN) && o.oDistanceToMario < 700.0 && F.abs_angle_diff(W.gMarioObject.oMoveAngleYaw, o.oAngleToMario) > 0x6000) {
        ret = true;
    }
    cur_obj_extend_animation_if_at_end();
    o.oBowserTimer = 0;
    return ret;
}
function bowser_dead_twirl_up() {
    const o = W.gCurrentObject;
    let ret = false;
    if (o.gfx.scale[0] < 0.8) {
        o.oAngleVelYaw += 0x80;
    }
    if (o.gfx.scale[0] > 0.2) {
        o.gfx.scale[0] = o.gfx.scale[0] - 0.02;
        o.gfx.scale[2] = o.gfx.scale[2] - 0.02;
    } else {
        o.gfx.scale[1] = o.gfx.scale[1] - 0.01;
        o.oVelY = 20.0;
        o.oGravity = 0.0;
    }
    if (o.gfx.scale[1] < 0.5) {
        ret = true;
    }
    o.oMoveAngleYaw += o.oAngleVelYaw;
    if (o.oOpacity >= 3) {
        o.oOpacity -= 2;
    }
    return ret;
}
function bowser_dead_hide() {
    const o = W.gCurrentObject;
    F.cur_obj_scale(0);
    o.oForwardVel = 0;
    o.oVelY = 0;
    o.oGravity = 0;
}
let sBowserDefeatedDialogText = [DIALOG_119, DIALOG_120, DIALOG_121];
function bowser_dead_default_stage_ending() {
    const o = W.gCurrentObject;
    let ret = false;
    if (o.oBowserTimer < 2) {
        if (o.oBowserTimer == 0) {
            seq_player_lower_volume(SEQ_PLAYER_LEVEL, 60, 40);
            o.oBowserTimer++;
        }
        if (F.cur_obj_update_dialog(MARIO_DIALOG_LOOK_UP, (DIALOG_FLAG_TEXT_DEFAULT | DIALOG_FLAG_TIME_STOP_ENABLED), sBowserDefeatedDialogText[o.oBhvParams2ndByte], 0)) {
            o.oBowserTimer++;
            cur_obj_play_sound_2(SOUND_GENERAL2_BOWSER_EXPLODE);
            seq_player_unlower_volume(SEQ_PLAYER_LEVEL, 60);
            seq_player_fade_out(SEQ_PLAYER_LEVEL, 1);
        }
    } else if (bowser_dead_twirl_up()) {
        bowser_dead_hide();
        spawn_triangle_break_particles(20, MODEL_YELLOW_COIN, 1.0, 0);
        bowser_spawn_collectable();
        F.set_mario_npc_dialog(MARIO_DIALOG_STOP);
        ret = true;
    }
    return ret;
}
function bowser_dead_final_stage_ending() {
    const o = W.gCurrentObject;
    let filler = new Array(4).fill(0);
    let ret = false;
    let dialogID = 0;
    if (o.oBowserTimer < 2) {
        if (W.gHudDisplay.stars < 120) {
            dialogID = DIALOG_121;
        } else {
            dialogID = DIALOG_163;
        }
        if (o.oBowserTimer == 0) {
            seq_player_lower_volume(SEQ_PLAYER_LEVEL, 60, 40);
            o.oBowserTimer++;
        }
        if (F.cur_obj_update_dialog(MARIO_DIALOG_LOOK_UP, (DIALOG_FLAG_TEXT_DEFAULT | DIALOG_FLAG_TIME_STOP_ENABLED), dialogID, 0)) {
            F.cur_obj_set_model(MODEL_BOWSER_NO_SHADOW);
            seq_player_unlower_volume(SEQ_PLAYER_LEVEL, 60);
            seq_player_fade_out(SEQ_PLAYER_LEVEL, 1);
            bowser_spawn_collectable();
            o.oBowserTimer++;
        }
    } else if (o.oOpacity > 4) {
        o.oOpacity -= 4;
    } else {
        bowser_dead_hide();
        ret = true;
    }
    return ret;
}
function bowser_act_dead() {
    const o = W.gCurrentObject;
    switch (o.oSubAction) {
        case BOWSER_SUB_ACT_DEAD_FLY_BACK:
            bowser_fly_back_dead();
            break;
        case BOWSER_SUB_ACT_DEAD_BOUNCE:
            bowser_dead_bounce();
            break;
        case BOWSER_SUB_ACT_DEAD_WAIT:
            if (bowser_dead_wait_for_mario()) {
                o.oBowserTimer = 0;
                if (o.oBhvParams2ndByte == BOWSER_BP_BITS) {
                    o.oSubAction = BOWSER_SUB_ACT_DEAD_FINAL_END;
                } else {
                    o.activeFlags |= ACTIVE_FLAG_DITHERED_ALPHA;
                    o.oSubAction++; 
                }
            }
            break;
        case BOWSER_SUB_ACT_DEAD_DEFAULT_END:
            if (bowser_dead_default_stage_ending()) {
                o.oSubAction++; 
            }
            break;
        case BOWSER_SUB_ACT_DEAD_DEFAULT_END_OVER:
            break;
        case BOWSER_SUB_ACT_DEAD_FINAL_END:
            if (bowser_dead_final_stage_ending()) {
                o.oSubAction++; 
            }
            break;
        case BOWSER_SUB_ACT_DEAD_FINAL_END_OVER:
            break;
    }
}
function bowser_tilt_platform(platform, angSpeed) {
    const o = W.gCurrentObject;
    let angle = s16(o.oBowserAngleToCenter + 0x8000);
    platform.oAngleVelPitch = coss(angle) * angSpeed;
    platform.oAngleVelRoll = -sins(angle) * angSpeed;
}
let sBowsertiltPlatformData = { flag: [1, 10, 40], angSpeed: [0, 0, 74], time: [-1, -10, 114], f3: [1, -20, 134], f4: [-1, 20, 154], f5: [1, 40, 164], f6: [-1, -40, 174], f7: [1, -80, 179], f8: [-1, 80, 184], f9: [1, 160, 186], f10: [-1, -160, 186], f11: [1, 0, 0] };
function bowser_act_tilt_lava_platform() {
    const o = W.gCurrentObject;
    let platform = F.cur_obj_nearest_object_with_behavior(B.bhvTiltingBowserLavaPlatform);
    let angle = s16(o.oBowserAngleToCenter + 0x8000);
    let angSpeed = 0;
    let filler = new Array(4).fill(0);
    if (platform == null) {
        o.oAction = BOWSER_ACT_DEFAULT;
    } else {
        let i = 0;
        let isNotTilting = true;
        while (sBowsertiltPlatformData[i].time != 0) {
            if (o.oTimer < sBowsertiltPlatformData[i].time) {
                angSpeed = s16(sBowsertiltPlatformData[i].angSpeed);
                if (sBowsertiltPlatformData[i].flag > 0) {
                    angSpeed = s16((sBowsertiltPlatformData[i].time - o.oTimer - 1) * angSpeed);
                } else { 
                    angSpeed = s16((o.oTimer - sBowsertiltPlatformData[i - 1].time) * angSpeed);
                }
                bowser_tilt_platform(platform, angSpeed);
                if (angSpeed != 0) {
                    play_sound(SOUND_ENV_MOVING_BIG_PLATFORM, platform.gfx.cameraToObject);
                }
                isNotTilting = false;
                break;
            }
            i++;
        }
        if (isNotTilting) {
            o.oAction = BOWSER_ACT_DEFAULT;
            platform.oAngleVelPitch = 0;
            platform.oAngleVelRoll = 0;
            platform.oFaceAnglePitch = 0;
            platform.oFaceAngleRoll = 0;
        }
    }
    cur_obj_extend_animation_if_at_end();
}
function bowser_check_fallen_off_stage() {
    const o = W.gCurrentObject;
    if (o.oAction != BOWSER_ACT_JUMP_ONTO_STAGE && o.oAction != BOWSER_ACT_TILT_LAVA_PLATFORM) {
        if (o.oPosY < o.oHomeY - 1000.0) {
            return true;
        }
        if (o.oMoveFlags & OBJ_MOVE_LANDED) {
            if (o.oFloorType == SURFACE_BURNING) {
                return true;
            }
            if (o.oFloorType == SURFACE_DEATH_PLANE) {
                return true;
            }
        }
    }
    return false;
}
let sBowserActions = [bowser_act_default, bowser_act_thrown, bowser_act_jump_onto_stage, bowser_act_dance, bowser_act_dead, bowser_act_wait, bowser_act_intro_walk, bowser_act_charge_mario, bowser_act_spit_fire_into_sky, bowser_act_spit_fire_onto_floor, bowser_act_hit_edge, bowser_act_turn_from_edge, bowser_act_hit_mine, bowser_act_big_jump, bowser_act_walk_to_mario, bowser_act_breath_fire, bowser_act_teleport, bowser_act_quick_jump, bowser_act_idle, bowser_act_tilt_lava_platform];
let sBowserSoundStates = [[0, 0, 0, NO_SOUND], [0, 0, 0, NO_SOUND], [0, 0, 0, NO_SOUND], [0, 0, 0, NO_SOUND], [0, 0, 0, NO_SOUND], [0, 0, 0, NO_SOUND], [0, 0, 0, NO_SOUND], [0, 0, 0, NO_SOUND], [1, 0, -1, SOUND_OBJ_BOWSER_WALK], [1, 0, -1, SOUND_OBJ2_BOWSER_ROAR], [1, 0, -1, SOUND_OBJ2_BOWSER_ROAR], [0, 0, 0, NO_SOUND], [0, 0, 0, NO_SOUND], [1, 20, 40, SOUND_OBJ_BOWSER_WALK], [1, 20, -1, SOUND_OBJ_BOWSER_WALK], [1, 20, 40, SOUND_OBJ_BOWSER_WALK], [1, 0, -1, SOUND_OBJ_BOWSER_TAIL_PICKUP], [1, 0, -1, SOUND_OBJ_BOWSER_DEFEATED], [1, 8, -1, SOUND_OBJ_BOWSER_WALK], [1, 8, 17, SOUND_OBJ_BOWSER_WALK], [1, 8, -10, SOUND_OBJ_BOWSER_WALK], [0, 0, 0, NO_SOUND], [1, 5, -1, SOUND_OBJ_FLAME_BLOWN], [0, 0, 0, NO_SOUND], [0, 0, 0, NO_SOUND], [1, 0, -1, SOUND_OBJ_BOWSER_TAIL_PICKUP], [1, 0, -1, SOUND_OBJ2_BOWSER_ROAR]];
let sBowserRainbowLight = [false, false, true];
let sBowserHealth = [1, 1, 3];
function bowser_free_update() {
    const o = W.gCurrentObject;
    let floor = null;
    let platform = null;
    let floorHeight = 0;
    if ((platform = o.platform) != null) {
        F.apply_platform_displacement(false, platform);
    }
    o.oBowserGrabbedStatus = BOWSER_GRAB_STATUS_NONE;
    F.cur_obj_update_floor_and_walls();
    F.cur_obj_call_action_function(sBowserActions);
    F.cur_obj_move_standard(-78);
    if (bowser_check_fallen_off_stage()) {
        o.oAction = BOWSER_ACT_JUMP_ONTO_STAGE;
    }
    floorHeight = F.find_floor(o.oPosX, o.oPosY, o.oPosZ, $ => floor = $);
    if ((floor != null) && (floor.object != null)) {
        o.platform = floor.object;
    } else {
        o.platform = null;
    }
    exec_anim_sound_state(sBowserSoundStates);
}
function bowser_held_update() {
    const o = W.gCurrentObject;
    o.oBowserStatus &= ~BOWSER_STATUS_FIRE_SKY;
    F.cur_obj_become_intangible();
    switch (o.oBowserGrabbedStatus) {
        case BOWSER_GRAB_STATUS_NONE:
            cur_obj_play_sound_2(SOUND_OBJ_BOWSER_TAIL_PICKUP);
            F.cur_obj_unrender_set_action_and_anim(BOWSER_ANIM_GRABBED, BOWSER_ACT_THROWN);
            o.oBowserGrabbedStatus++;
            break;
        case BOWSER_GRAB_STATUS_GRABBED:
            if (F.cur_obj_check_if_near_animation_end()) {
                F.cur_obj_init_animation_with_sound(BOWSER_ANIM_SHAKING);
                o.oBowserGrabbedStatus++;
            }
            break;
        case BOWSER_GRAB_STATUS_HOLDING:
            break;
    }
    o.oMoveFlags = 0;
    o.oBowserHeldAnglePitch = W.gMarioObject.oMoveAnglePitch;
    o.oBowserHeldAngleVelYaw = W.gMarioObject.oAngleVelYaw;
    o.oMoveAngleYaw = W.gMarioObject.oMoveAngleYaw;
}
function bowser_thrown_dropped_update() {
    const o = W.gCurrentObject;
    let swingSpd = 0;
    o.oBowserGrabbedStatus = BOWSER_GRAB_STATUS_NONE;
    F.cur_obj_get_thrown_or_placed(1.0, 1.0, BOWSER_ACT_THROWN);
    swingSpd = o.oBowserHeldAngleVelYaw / 3000.0 * 70.0;
    if (swingSpd < 0.0) {
        swingSpd = -swingSpd;
    }
    if (swingSpd > 90.0) {
        swingSpd *= 2.5;
    }
    o.oForwardVel = coss(o.oBowserHeldAnglePitch) * swingSpd;
    o.oVelY = -sins(o.oBowserHeldAnglePitch) * swingSpd;
    F.cur_obj_become_intangible();
    o.prevObj.oAction = BOWSER_ACT_TAIL_THROWN; 
    o.prevObj.oTimer = 0;
    o.prevObj.oSubAction = 0; 
    o.oTimer = 0;
    o.oSubAction = 0;
}
function bhv_bowser_loop() {
    const o = W.gCurrentObject;
    let angleToMario = 0;
    let angleToCenter = 0;
    o.oBowserDistToCenter = Math.sqrt(o.oPosX * o.oPosX + o.oPosZ * o.oPosZ);
    o.oBowserAngleToCenter = atan2s(0.0 - o.oPosZ, 0.0 - o.oPosX);
    angleToMario = s16(F.abs_angle_diff(o.oMoveAngleYaw, o.oAngleToMario));
    angleToCenter = s16(F.abs_angle_diff(o.oMoveAngleYaw, o.oBowserAngleToCenter));
    o.oBowserStatus &= ~0xFF;
    if (angleToMario < 0x2000) {
        o.oBowserStatus |= BOWSER_STATUS_ANGLE_MARIO;
    }
    if (angleToCenter < 0x3800) {
        o.oBowserStatus |= BOWSER_STATUS_ANGLE_CENTER; 
    }
    if (o.oBowserDistToCenter < 1000.0) {
        o.oBowserStatus |= BOWSER_STATUS_DIST_CENTER; 
    }
    if (o.oDistanceToMario < 850.0) {
        o.oBowserStatus |= BOWSER_STATUS_DIST_MARIO; 
    }
    switch (o.oHeldState) {
        case HELD_FREE:
            bowser_free_update();
            break;
        case HELD_HELD:
            bowser_held_update();
            break;
        case HELD_THROWN:
            bowser_thrown_dropped_update();
            break;
        case HELD_DROPPED:
            bowser_thrown_dropped_update();
            break;
    }
    F.cur_obj_align_gfx_with_floor();
    if (o.oAction != BOWSER_ACT_DEAD) {
        if (o.oBowserTargetOpacity != o.oOpacity) {
            if (o.oBowserTargetOpacity > o.oOpacity) {
                o.oOpacity += 20;
                if (o.oOpacity > 255) {
                    o.oOpacity = 255;
                }
            } else {
                o.oOpacity -= 20;
                if (o.oOpacity < 0) {
                    o.oOpacity = 0;
                }
            }
        }
    }
}
function bhv_bowser_init() {
    const o = W.gCurrentObject;
    let level = 0;
    o.oBowserIsReacting = true;
    o.oOpacity = 255;
    o.oBowserTargetOpacity = 255;
    if (W.gCurrLevelNum == LEVEL_BOWSER_2) {
        level = BOWSER_BP_BITFS;
    } else if (W.gCurrLevelNum == LEVEL_BOWSER_3) {
        level = BOWSER_BP_BITS;
    } else { 
        level = BOWSER_BP_BITDW;
    }
    o.oBhvParams2ndByte = level;
    o.oBowserRainbowLight = sBowserRainbowLight[level];
    o.oHealth = sBowserHealth[level];
    F.cur_obj_start_cam_event(o, CAM_EVENT_BOWSER_INIT);
    o.oAction = BOWSER_ACT_WAIT;
    o.oBowserEyesTimer = 0;
    o.oBowserEyesShut = false;
}
const BOWSER_EYES_OPEN = 0;
const BOWSER_EYES_HALF_CLOSED = BOWSER_EYES_OPEN + 1;
const BOWSER_EYES_CLOSED = BOWSER_EYES_HALF_CLOSED + 1;
const BOWSER_EYES_LEFT = BOWSER_EYES_CLOSED + 1;
const BOWSER_EYES_FAR_LEFT = BOWSER_EYES_LEFT + 1;
const BOWSER_EYES_RIGHT = BOWSER_EYES_FAR_LEFT + 1;
const BOWSER_EYES_FAR_RIGHT = BOWSER_EYES_RIGHT + 1;
const BOWSER_EYES_DERP = BOWSER_EYES_FAR_RIGHT + 1;
const BOWSER_EYES_CROSS = BOWSER_EYES_DERP + 1;
const BOWSER_EYES_RESET = BOWSER_EYES_CROSS + 1;
function bowser_open_eye_switch(obj, switchCase) {
    let eyeCase = 0;
    let angleFromMario = 0;
    angleFromMario = s16(F.abs_angle_diff(obj.oMoveAngleYaw, obj.oAngleToMario));
    eyeCase = switchCase.selectedCase;
    switch (eyeCase) {
        case BOWSER_EYES_OPEN:
            if (angleFromMario > 0x2000) {
                if (obj.oAngleVelYaw > 0) {
                    switchCase.selectedCase = BOWSER_EYES_RIGHT;
                }
                if (obj.oAngleVelYaw < 0) {
                    switchCase.selectedCase = BOWSER_EYES_LEFT;
                }
            }
            if (obj.oBowserEyesTimer > 50) {
                switchCase.selectedCase = BOWSER_EYES_HALF_CLOSED;
            }
            break;
        case BOWSER_EYES_HALF_CLOSED:
            if (obj.oBowserEyesTimer > 2) {
                switchCase.selectedCase = BOWSER_EYES_CLOSED;
            }
            break;
        case BOWSER_EYES_CLOSED:
            if (obj.oBowserEyesTimer > 2) {
                switchCase.selectedCase = BOWSER_EYES_RESET;
            }
            break;
        case BOWSER_EYES_RESET:
            if (obj.oBowserEyesTimer > 2) {
                switchCase.selectedCase = BOWSER_EYES_OPEN;
            }
            break;
        case BOWSER_EYES_RIGHT:
            if (obj.oBowserEyesTimer > 2) {
                switchCase.selectedCase = BOWSER_EYES_FAR_RIGHT;
                if (obj.oAngleVelYaw <= 0) {
                    switchCase.selectedCase = BOWSER_EYES_OPEN;
                }
            }
            break;
        case BOWSER_EYES_FAR_RIGHT:
            if (obj.oAngleVelYaw <= 0) {
                switchCase.selectedCase = BOWSER_EYES_RIGHT;
            }
            break;
        case BOWSER_EYES_LEFT:
            if (obj.oBowserEyesTimer > 2) {
                switchCase.selectedCase = BOWSER_EYES_FAR_LEFT;
                if (obj.oAngleVelYaw >= 0) {
                    switchCase.selectedCase = BOWSER_EYES_OPEN;
                }
            }
            break;
        case BOWSER_EYES_FAR_LEFT:
            if (obj.oAngleVelYaw >= 0) {
                switchCase.selectedCase = BOWSER_EYES_LEFT;
            }
            break;
        default:
            switchCase.selectedCase = BOWSER_EYES_OPEN;
    }
    if (switchCase.selectedCase != eyeCase) {
        obj.oBowserEyesTimer = -1;
    }
}
function geo_switch_bowser_eyes(callContext, node, mtx) {
    let eyeShut = 0;
    let filler = new Array(4).fill(0);
    let obj = W.gCurGraphNodeObject;
    let switchCase = node;
    if (callContext == GEO_CONTEXT_RENDER) {
        if (W.gCurGraphNodeHeldObject != null) {
            obj = W.gCurGraphNodeHeldObject.objNode;
        }
        switch (eyeShut = obj.oBowserEyesShut) {
            case false: 
                bowser_open_eye_switch(obj, switchCase);
                break;
            case true: 
                switchCase.selectedCase = BOWSER_EYES_CLOSED;
                break;
        }
        obj.oBowserEyesTimer++;
    }
    return null;
}
let sGrowingBowserFlameHitbox = { interactType: INTERACT_FLAME, downOffset: 20, damageOrCoinValue: 1, health: 0, numLootCoins: 0, radius: 10, height: 40, hurtboxRadius: 0, hurtboxHeight: 0 };
let sBowserFlameHitbox = { interactType: INTERACT_FLAME, downOffset: 0, damageOrCoinValue: 1, health: 0, numLootCoins: 0, radius: 10, height: 40, hurtboxRadius: 0, hurtboxHeight: 0 };
function bowser_flame_despawn() {
    const o = W.gCurrentObject;
    F.obj_mark_for_deletion(o);
    spawn_object_with_scale(o, MODEL_NONE,B.bhvBlackSmokeUpward, 1.0);
    if (F.random_float() < 0.1) {
        spawn_object(o, MODEL_YELLOW_COIN,B.bhvTemporaryYellowCoin);
    }
}
function bowser_flame_should_despawn(maxTime) {
    const o = W.gCurrentObject;
    if (maxTime < o.oTimer) {
        return true;
    }
    if (o.oFloorType == SURFACE_BURNING) {
        return true;
    }
    if (o.oFloorType == SURFACE_DEATH_PLANE) {
        return true;
    }
    return false;
}
function bhv_flame_bowser_init() {
    const o = W.gCurrentObject;
    o.oAnimState = Math.trunc((F.random_float() * 10.0));
    o.oMoveAngleYaw = F.random_u16();
    o.oVelY = F.random_float() < 0.2 ? 80.0 : 20.0;
    o.oForwardVel = 10.0;
    o.oGravity = -1.0;
    o.oFlameScale = F.random_float() + 1.0;
}
function bhv_flame_large_burning_out_init() {
    const o = W.gCurrentObject;
    o.oAnimState = Math.trunc((F.random_float() * 10.0));
    o.oMoveAngleYaw = F.random_u16();
    o.oVelY = 10.0;
    o.oForwardVel = 0.0;
    o.oFlameScale = 7.0;
}
function bowser_flame_move() {
    const o = W.gCurrentObject;
    let timer = ((o.oFlameSpeedTimerOffset + W.gGlobalTimer) & 0x3F) << 10;
    o.oPosX += sins(o.oMoveAngleYaw) * sins(timer) * 4.0;
    o.oPosZ += coss(o.oMoveAngleYaw) * sins(timer) * 4.0;
}
function bhv_flame_bowser_loop() {
    const o = W.gCurrentObject;
    F.cur_obj_update_floor_and_walls();
    F.cur_obj_move_standard(78);
    if (o.oVelY < -4.0) {
        o.oVelY = -4.0;
    }
    if (o.oAction == 0) {
        F.cur_obj_become_intangible();
        bowser_flame_move();
        if (o.oMoveFlags & OBJ_MOVE_LANDED) {
            o.oAction++;
            if (F.cur_obj_has_behavior(B.bhvFlameLargeBurningOut)) {
                o.oFlameScale = 8.0;
            } else {
                o.oFlameScale = F.random_float() * 2 + 6.0;
            }
            o.oForwardVel = 0;
            o.oVelY = 0;
            o.oGravity = 0;
        }
    } else {
        F.cur_obj_become_tangible();
        if (o.oTimer > o.oFlameScale * 10 + 5.0) {
            o.oFlameScale -= 0.15;
            if (o.oFlameScale <= 0) {
                bowser_flame_despawn();
            }
        }
    }
    F.cur_obj_scale(o.oFlameScale);
    o.oGraphYOffset = o.gfx.scale[1] * 14.0;
    F.obj_set_hitbox(o, sBowserFlameHitbox);
}
function bhv_flame_moving_forward_growing_init() {
    const o = W.gCurrentObject;
    o.oForwardVel = 30.0;
    F.obj_translate_xz_random(o, 80.0);
    o.oAnimState = Math.trunc((F.random_float() * 10.0));
    o.oFlameScale = 3.0;
}
function bhv_flame_moving_forward_growing_loop() {
    const o = W.gCurrentObject;
    let filler = new Array(4).fill(0);
    let flame = null;
    F.obj_set_hitbox(o, sGrowingBowserFlameHitbox);
    o.oFlameScale = o.oFlameScale + 0.5;
    F.cur_obj_scale(o.oFlameScale);
    if (o.oMoveAnglePitch > 0x800) {
        o.oMoveAnglePitch -= 0x200;
    }
    F.cur_obj_set_pos_via_transform();
    F.cur_obj_update_floor_height();
    if (o.oFlameScale > 30.0) {
        F.obj_mark_for_deletion(o);
    }
    if (o.oPosY < o.oFloorHeight) {
        o.oPosY = o.oFloorHeight;
        flame = spawn_object(o, MODEL_RED_FLAME,B.bhvFlameBowser);
        F.obj_mark_for_deletion(o);
    }
}
function bhv_flame_floating_landing_init() {
    const o = W.gCurrentObject;
    o.oAnimState = Math.trunc((F.random_float() * 10.0));
    o.oMoveAngleYaw = F.random_u16();
    if (o.oBhvParams2ndByte != 0) {
        o.oForwardVel = F.random_float() * 5.0;
    } else {
        o.oForwardVel = F.random_float() * 70.0;
    }
    o.oVelY = F.random_float() * 20.0;
    o.oGravity = -1.0;
    o.oFlameSpeedTimerOffset = F.random_float() * 64.0;
}
let sFlameFloatingYLimit = [-8.0, -6.0, -3.0];
function bhv_flame_floating_landing_loop() {
    const o = W.gCurrentObject;
    let filler = new Array(4).fill(0);
    F.cur_obj_update_floor_and_walls();
    F.cur_obj_move_standard(78);
    bowser_flame_move();
    if (bowser_flame_should_despawn(900)) {
        F.obj_mark_for_deletion(o);
    }
    if (o.oVelY < sFlameFloatingYLimit[o.oBhvParams2ndByte]) {
        o.oVelY = sFlameFloatingYLimit[o.oBhvParams2ndByte];
    }
    if (o.oMoveFlags & OBJ_MOVE_LANDED) {
        if (o.oBhvParams2ndByte == 0) {
            spawn_object(o, MODEL_RED_FLAME,B.bhvFlameLargeBurningOut);
        } else {
            spawn_object(o, MODEL_NONE,B.bhvBlueFlamesGroup); 
        }
        F.obj_mark_for_deletion(o);
    }
    o.oGraphYOffset = o.gfx.scale[1] * 14.0;
}
function bhv_blue_bowser_flame_init() {
    const o = W.gCurrentObject;
    F.obj_translate_xz_random(o, 80.0);
    o.oAnimState = Math.trunc((F.random_float() * 10.0));
    o.oVelY = 7.0;
    o.oForwardVel = 35.0;
    o.oFlameScale = 3.0;
    o.oFlameUnusedRand = F.random_float() * 0.5;
    o.oGravity = 1.0;
    o.oFlameSpeedTimerOffset = Math.trunc((F.random_float() * 64.0));
}
function bhv_blue_bowser_flame_loop() {
    const o = W.gCurrentObject;
    let i = 0;
    F.obj_set_hitbox(o, sGrowingBowserFlameHitbox);
    if (o.oFlameScale < 16.0) {
        o.oFlameScale = o.oFlameScale + 0.5;
    }
    F.cur_obj_scale(o.oFlameScale);
    F.cur_obj_update_floor_and_walls();
    F.cur_obj_move_standard(78);
    if (o.oTimer > 20) {
        if (o.oBhvParams2ndByte == 0) {
            for (i = 0; i < 3; i++) {
                spawn_object_relative_with_scale(0, 0, 0, 0, 5.0, o, MODEL_RED_FLAME,B.bhvFlameFloatingLanding);
            }
        } else {
            spawn_object_relative_with_scale(1, 0, 0, 0, 8.0, o, MODEL_BLUE_FLAME,B.bhvFlameFloatingLanding);
            spawn_object_relative_with_scale(2, 0, 0, 0, 8.0, o, MODEL_BLUE_FLAME,B.bhvFlameFloatingLanding);
        }
        F.obj_mark_for_deletion(o);
    }
}
function bhv_flame_bouncing_init() {
    const o = W.gCurrentObject;
    o.oAnimState = Math.trunc((F.random_float() * 10.0));
    o.oVelY = 30.0;
    o.oForwardVel = 20.0;
    o.oFlameScale = o.gfx.scale[0];
    o.oFlameSpeedTimerOffset = Math.trunc((F.random_float() * 64.0));
}
function bhv_flame_bouncing_loop() {
    const o = W.gCurrentObject;
    let bowser = null;
    if (o.oTimer == 0) {
        o.oFlameBowser = F.cur_obj_nearest_object_with_behavior(B.bhvBowser);
    }
    bowser = o.oFlameBowser;
    o.oForwardVel = 15.0;
    o.oBounciness = -1.0;
    F.cur_obj_scale(o.oFlameScale);
    F.obj_set_hitbox(o, sGrowingBowserFlameHitbox);
    F.cur_obj_update_floor_and_walls();
    F.cur_obj_move_standard(78);
    if (bowser_flame_should_despawn(300)) {
        F.obj_mark_for_deletion(o);
    }
    if (bowser != null) {
        if (bowser.oHeldState == HELD_FREE) {
            if (F.lateral_dist_between_objects(o, bowser) < 300.0) {
                F.obj_mark_for_deletion(o);
            }
        }
    }
}
function bhv_blue_flames_group_loop() {
    const o = W.gCurrentObject;
    let flame = null;
    let i = 0;
    if (o.oTimer == 0) {
        o.oMoveAngleYaw = F.obj_angle_to_object(o, W.gMarioObject);
        o.oBlueFlameNextScale = 5.0;
    }
    if (o.oTimer < 16) {
        if (!(o.oTimer & 1)) {
            for (i = 0; i < 3; i++) {
                flame = spawn_object(o, MODEL_BLUE_FLAME,B.bhvFlameBouncing);
                flame.oMoveAngleYaw += i * 0x5555;
                flame.gfx.scale[0] = o.oBlueFlameNextScale;
            }
            o.oBlueFlameNextScale -= 0.5;
        }
    } else {
        F.obj_mark_for_deletion(o);
    }
}
function vec3f_copy_2(dest, src) {
    dest[0] = src[0];
    dest[1] = src[1];
    dest[2] = src[2];
}
let D_8032F754 = { unk0: [145, [0.7, 1.5, 0.7], 7.0], unk1: [235, [1.2, 2.0, 1.2], 11.6] };
function bhv_checkerboard_elevator_group_init() {
    const o = W.gCurrentObject;
    let sp3C = 0;
    let sp38 = 0;
    let sp34 = 0;
    let i = 0;
    let sp2C = null;
    if (o.oBhvParams2ndByte == 0) {
        o.oBhvParams2ndByte = 65;
    }
    sp3C = o.oBhvParams2ndByte * 10;
    sp34 = (o.oBhvParams >> 24) & 0xFF;
    for (i = 0; i <= 1; i++) {
        if (i == 0) {
            sp38 = -D_8032F754[sp34].unk0;
        } else {
            sp38 = D_8032F754[sp34].unk0;
        }
        sp2C = spawn_object_relative(i, 0, i * sp3C, sp38, o, MODEL_CHECKERBOARD_PLATFORM,B.bhvCheckerboardPlatformSub);
        sp2C.oCheckerBoardPlatformUnk1AC = D_8032F754[sp34].unk2;
        vec3f_copy_2(sp2C.gfx.scale, D_8032F754[sp34].unk1);
    }
}
function checkerboard_plat_act_move_y(unused, vel, a2) {
    const o = W.gCurrentObject;
    o.oMoveAnglePitch = 0;
    o.oAngleVelPitch = 0;
    o.oForwardVel = 0.0;
    o.oVelY = vel;
    if (o.oTimer > a2) {
        o.oAction++;
    }
}
function checkerboard_plat_act_rotate(a0, a1) {
    const o = W.gCurrentObject;
    o.oVelY = 0.0;
    o.oAngleVelPitch = a1;
    if (o.oTimer + 1 == 0x8000 / F.absi(a1)) {
        o.oAction = a0;
    }
    o.oCheckerBoardPlatformUnkF8 = a0;
}
function bhv_checkerboard_platform_init() {
    const o = W.gCurrentObject;
    o.oCheckerBoardPlatformUnkFC = o.parentObj.oBhvParams2ndByte;
}
function bhv_checkerboard_platform_loop() {
    const o = W.gCurrentObject;
    let sp24 = o.oCheckerBoardPlatformUnk1AC;
    o.oCheckerBoardPlatformUnkF8 = 0;
    if (o.oDistanceToMario < 1000.0) {
        cur_obj_play_sound_1(SOUND_ENV_ELEVATOR4);
    }
    switch (o.oAction) {
        case 0:
            if (o.oBhvParams2ndByte == 0) {
                o.oAction = 1;
            } else {
                o.oAction = 3;
            }
            break;
        case 1:
            checkerboard_plat_act_move_y(2, 10.0, o.oCheckerBoardPlatformUnkFC);
            break;
        case 2:
            checkerboard_plat_act_rotate(3, 512);
            break;
        case 3:
            checkerboard_plat_act_move_y(4, -10.0, o.oCheckerBoardPlatformUnkFC);
            break;
        case 4:
            checkerboard_plat_act_rotate(1, -512);
            break;
    }
    o.oMoveAnglePitch += F.absi(o.oAngleVelPitch);
    o.oFaceAnglePitch += F.absi(o.oAngleVelPitch);
    o.oFaceAngleYaw = o.oMoveAngleYaw;
    if (o.oMoveAnglePitch != 0) {
        o.oForwardVel = F.signum_positive(o.oAngleVelPitch) * sins(o.oMoveAnglePitch) * sp24;
        o.oVelY = F.signum_positive(o.oAngleVelPitch) * coss(o.oMoveAnglePitch) * sp24;
    }
    if (o.oCheckerBoardPlatformUnkF8 == 1) {
        o.oAngleVelPitch = 0;
        o.oFaceAnglePitch &= ~0x7FFF;
        F.cur_obj_move_using_fvel_and_gravity();
    } else {
        F.cur_obj_move_using_fvel_and_gravity();
    }
    F.load_object_collision_model();
}
let sKoopaShellHitbox = { interactType: INTERACT_KOOPA_SHELL, downOffset: 0, damageOrCoinValue: 4, health: 1, numLootCoins: 1, radius: 50, height: 50, hurtboxRadius: 50, hurtboxHeight: 50 };
function koopa_shell_spawn_water_drop() {
    const o = W.gCurrentObject;
    let filler = new Array(4).fill(0);
    spawn_object(o, MODEL_WAVE_TRAIL,B.bhvObjectWaveTrail);
    if (W.gMarioStates[0].forwardVel > 10.0) {
        let drop = spawn_object_with_scale(o, MODEL_WHITE_PARTICLE_SMALL,B.bhvWaterDroplet, 1.5);
        drop.oVelY = F.random_float() * 30.0;
        F.obj_translate_xz_random(drop, 110.0);
    }
}
function bhv_koopa_shell_flame_loop() {
    const o = W.gCurrentObject;
    if (o.oTimer == 0) {
        o.oMoveAngleYaw = F.random_u16();
        o.oVelY = F.random_float() * 30.0;
        o.oGravity = -4.0;
        o.oAnimState = F.random_float() * 10.0;
        F.obj_translate_xz_random(o, 110.0);
        o.oKoopaShellFlameScale = 4.0;
    }
    F.cur_obj_update_floor_height();
    F.cur_obj_move_using_fvel_and_gravity();
    if (o.oFloorHeight > o.oPosY || o.oTimer > 10) {
        F.obj_mark_for_deletion(o);
    }
    o.oKoopaShellFlameScale += -0.3;
    F.cur_obj_scale(o.oKoopaShellFlameScale);
}
function bhv_koopa_shell_flame_spawn() {
    const o = W.gCurrentObject;
    let i = 0;
    for (i = 0; i < 2; i++) {
        spawn_object(o, MODEL_RED_FLAME,B.bhvKoopaShellFlame);
    }
}
function koopa_shell_spawn_sparkles(a) {
    const o = W.gCurrentObject;
    let sp1C = spawn_object(o, MODEL_NONE,B.bhvSparkleSpawn);
    sp1C.oPosY += a;
}
function bhv_koopa_shell_loop() {
    const o = W.gCurrentObject;
    let sp34 = null;
    F.obj_set_hitbox(o, sKoopaShellHitbox);
    F.cur_obj_scale(1.0);
    switch (o.oAction) {
        case 0:
            F.cur_obj_update_floor_and_walls();
            F.cur_obj_if_hit_wall_bounce_away();
            if (o.oInteractStatus & INT_STATUS_INTERACTED) {
                o.oAction++;
            }
            o.oFaceAngleYaw += 0x1000;
            F.cur_obj_move_standard(-20);
            koopa_shell_spawn_sparkles(10.0);
            break;
        case 1:
            F.obj_copy_pos(o, W.gMarioObject);
            sp34 = cur_obj_update_floor_height_and_get_floor();
            if (Math.abs(F.find_water_level(o.oPosX, o.oPosZ) - o.oPosY) < 10.0) {
                koopa_shell_spawn_water_drop();
            } else if (Math.abs(o.oPosY - o.oFloorHeight) < 5.0) {
                if (sp34 != null && sp34.type == 1) {
                    bhv_koopa_shell_flame_spawn();
                } else {
                    koopa_shell_spawn_sparkles(10.0);
                }
            } else {
                koopa_shell_spawn_sparkles(10.0);
            }
            o.oFaceAngleYaw = W.gMarioObject.oMoveAngleYaw;
            if (o.oInteractStatus & INT_STATUS_STOP_RIDING) {
                F.obj_mark_for_deletion(o);
                F.spawn_mist_particles();
                o.oAction = 0;
            }
            break;
    }
    o.oInteractStatus = 0;
}
function set_obj_anim_with_accel_and_sound(a0, a1, a2) {
    const o = W.gCurrentObject;
    let sp1C = 0;
    if ((sp1C = o.gfx.anim.accel / 0x10000) == 0) {
        sp1C = 1.0;
    }
    if (F.cur_obj_check_anim_frame_in_range(a0, sp1C) || F.cur_obj_check_anim_frame_in_range(a1, sp1C)) {
        cur_obj_play_sound_2(a2);
        return true;
    }
    return false;
}
let sExclamationBoxHitbox = { interactType: INTERACT_BREAKABLE, downOffset: 5, damageOrCoinValue: 0, health: 1, numLootCoins: 0, radius: 40, height: 30, hurtboxRadius: 40, hurtboxHeight: 30 };
let sExclamationBoxContents = { id: [EXCLAMATION_BOX_BP_WING_CAP, 0, 0, MODEL_MARIOS_WING_CAP,B.bhvWingCap], unused: [EXCLAMATION_BOX_BP_METAL_CAP, 0, 0, MODEL_MARIOS_METAL_CAP,B.bhvMetalCap], bhvParams1stByte: [EXCLAMATION_BOX_BP_VANISH_CAP, 0, 0, MODEL_MARIOS_CAP,B.bhvVanishCap], model: [EXCLAMATION_BOX_BP_KOOPA_SHELL, 0, 0, MODEL_KOOPA_SHELL,B.bhvKoopaShell], behavior: [EXCLAMATION_BOX_BP_ONE_COIN, 0, 0, MODEL_YELLOW_COIN,B.bhvSingleCoinGetsSpawned], f5: [EXCLAMATION_BOX_BP_THREE_COINS, 0, 0, MODEL_NONE,B.bhvThreeCoinsSpawn], f6: [EXCLAMATION_BOX_BP_TEN_COINS, 0, 0, MODEL_NONE,B.bhvTenCoinsSpawn], f7: [EXCLAMATION_BOX_BP_1UP_WALKING, 0, 0, MODEL_1UP, bhv1UpWalking], f8: [EXCLAMATION_BOX_BP_STAR_ACT_1, 0, STAR_INDEX_ACT_1, MODEL_STAR,B.bhvSpawnedStar], f9: [EXCLAMATION_BOX_BP_1UP_RUNNING_AWAY, 0, 0, MODEL_1UP, bhv1UpRunningAway], f10: [EXCLAMATION_BOX_BP_STAR_ACT_2, 0, STAR_INDEX_ACT_2, MODEL_STAR,B.bhvSpawnedStar], f11: [EXCLAMATION_BOX_BP_STAR_ACT_3, 0, STAR_INDEX_ACT_3, MODEL_STAR,B.bhvSpawnedStar], f12: [EXCLAMATION_BOX_BP_STAR_ACT_4, 0, STAR_INDEX_ACT_4, MODEL_STAR,B.bhvSpawnedStar], f13: [EXCLAMATION_BOX_BP_STAR_ACT_5, 0, STAR_INDEX_ACT_5, MODEL_STAR,B.bhvSpawnedStar], f14: [EXCLAMATION_BOX_BP_STAR_ACT_6, 0, STAR_INDEX_ACT_6, MODEL_STAR,B.bhvSpawnedStar], f15: [EXCLAMATION_BOX_BP_END, 0, 0, MODEL_NONE, null] };
function bhv_rotating_exclamation_box_loop() {
    const o = W.gCurrentObject;
    if (o.parentObj.oAction != 1) {
        F.obj_mark_for_deletion(o);
    }
}
function exclamation_box_act_0() {
    const o = W.gCurrentObject;
    if (o.oBhvParams2ndByte <= EXCLAMATION_BOX_BP_SPECIAL_CAP_END) {
        o.oAnimState = o.oBhvParams2ndByte;
        if ((F.save_file_get_flags() & sCapSaveFlags[o.oBhvParams2ndByte]) || ((o.oBhvParams >> 24) & 0xFF)) {
            o.oAction = 2;
        } else {
            o.oAction = 1;
        }
    } else {
        o.oAnimState = EXCLAMATION_BOX_ANIM_STATE_DEFAULT;
        o.oAction = 2;
    }
}
function exclamation_box_act_1() {
    const o = W.gCurrentObject;
    F.cur_obj_become_intangible();
    if (o.oTimer == 0) {
        spawn_object(o, MODEL_EXCLAMATION_POINT,B.bhvRotatingExclamationMark);
        F.cur_obj_set_model(MODEL_EXCLAMATION_BOX_OUTLINE);
    }
    if ((F.save_file_get_flags() & sCapSaveFlags[o.oBhvParams2ndByte]) || ((o.oBhvParams >> 24) & 0xFF)) {
        o.oAction = 2;
        F.cur_obj_set_model(MODEL_EXCLAMATION_BOX);
    }
}
function exclamation_box_act_2() {
    const o = W.gCurrentObject;
    F.obj_set_hitbox(o, sExclamationBoxHitbox);
    if (o.oTimer == 0) {
        F.cur_obj_unhide();
        F.cur_obj_become_tangible();
        o.oInteractStatus = 0;
        o.oPosY = o.oHomeY;
        o.oGraphYOffset = 0.0;
    }
    if (F.cur_obj_was_attacked_or_ground_pounded()) {
        F.cur_obj_become_intangible();
        o.oExclamationBoxUnkFC = 0x4000;
        o.oVelY = 30.0;
        o.oGravity = -8.0;
        o.oFloorHeight = o.oPosY;
        o.oAction = 3;
    }
    F.load_object_collision_model();
}
function exclamation_box_act_3() {
    const o = W.gCurrentObject;
    let filler = new Array(4).fill(0);
    F.cur_obj_move_using_fvel_and_gravity();
    if (o.oVelY < 0.0) {
        o.oVelY = 0.0;
        o.oGravity = 0.0;
    }
    o.oExclamationBoxUnkF8 = (sins(o.oExclamationBoxUnkFC) + 1.0) * 0.3 + 0.0;
    o.oExclamationBoxUnkF4 = (-sins(o.oExclamationBoxUnkFC) + 1.0) * 0.5 + 1.0;
    o.oGraphYOffset = (-sins(o.oExclamationBoxUnkFC) + 1.0) * 26.0;
    o.oExclamationBoxUnkFC += 0x1000;
    o.gfx.scale[0] = o.oExclamationBoxUnkF4 * 2.0;
    o.gfx.scale[1] = o.oExclamationBoxUnkF8 * 2.0;
    o.gfx.scale[2] = o.oExclamationBoxUnkF4 * 2.0;
    if (o.oTimer == 7) {
        o.oAction = 4;
    }
}
function exclamation_box_spawn_contents(contents, targetContentsID) {
    const o = W.gCurrentObject;
    let contentsObj = null;
    while (contents.id != EXCLAMATION_BOX_BP_END) {
        if (targetContentsID == contents.id) {
            contentsObj = spawn_object(o, contents.model, contents.behavior);
            contentsObj.oVelY = 20.0;
            contentsObj.oForwardVel = 3.0;
            contentsObj.oMoveAngleYaw = W.gMarioObject.oMoveAngleYaw;
            o.oBhvParams |= contents.bhvParams1stByte << 24;
            if (contents.model == MODEL_STAR) {
                o.oFlags |= OBJ_FLAG_PERSISTENT_RESPAWN;
            }
            break;
        }
        contents++;
    }
}
function exclamation_box_act_4() {
    const o = W.gCurrentObject;
    exclamation_box_spawn_contents(sExclamationBoxContents, o.oBhvParams2ndByte);
    spawn_mist_particles_variable(0, 0, 46.0);
    spawn_triangle_break_particles(20, MODEL_CARTOON_STAR, 0.3, o.oAnimState);
    create_sound_spawner(SOUND_GENERAL_BREAK_BOX);
    if (o.oBhvParams2ndByte <= EXCLAMATION_BOX_BP_SPECIAL_CAP_END) {
        o.oAction = 5;
        F.cur_obj_hide();
    } else {
        F.obj_mark_for_deletion(o);
    }
}
function exclamation_box_act_5() {
    const o = W.gCurrentObject;
    if (o.oTimer > 300) {
        o.oAction = 2;
    }
}
let sExclamationBoxActions = [exclamation_box_act_0, exclamation_box_act_1, exclamation_box_act_2, exclamation_box_act_3, exclamation_box_act_4, exclamation_box_act_5];
function bhv_exclamation_box_loop() {
    F.cur_obj_scale(2.0);
    F.cur_obj_call_action_function(sExclamationBoxActions);
}
function bhv_white_puff_1_loop() {
    const o = W.gCurrentObject;
    let sp1C = 0.1;
    let sp18 = 0.5;
    if (o.oTimer == 0) {
        F.obj_translate_xz_random(o, 40.0);
        o.oPosY += 30.0;
    }
    F.cur_obj_scale(o.oTimer * sp18 + sp1C);
    o.oOpacity = 50;
    F.cur_obj_move_using_fvel_and_gravity();
    if (o.oTimer > 4) {
        F.obj_mark_for_deletion(o);
    }
}
function bhv_white_puff_2_loop() {
    const o = W.gCurrentObject;
    if (o.oTimer == 0) {
        F.obj_translate_xz_random(o, 40.0);
    }
}
W.gOpenableGrills = { halfWidth: [320, MODEL_BOB_BARS_GRILLS,W.SYM('bob_seg7_collision_gate')], modelID: [410, MODEL_HMC_RED_GRILLS,W.SYM('hmc_seg7_collision_0702B65C')] };
function bhv_openable_cage_door_loop() {
    const o = W.gCurrentObject;
    if (o.oAction == 0) {
        if (o.parentObj.oOpenableGrillUnk88 != 0) {
            o.oAction++;
        }
    } else if (o.oAction == 1) {
        if (o.oTimer < 64) {
            o.oMoveAngleYaw -= o.oBhvParams2ndByte * 0x100;
        } else {
            o.oAction++;
        }
    }
}
function bhv_openable_grill_loop() {
    const o = W.gCurrentObject;
    let obj = null;
    let grillIdx = 0;
    switch (o.oAction) {
        case 0:
            grillIdx = o.oBhvParams2ndByte;
            obj = spawn_object_relative(-1, W.gOpenableGrills[grillIdx].halfWidth, 0, 0, o, W.gOpenableGrills[grillIdx].modelID,B.bhvOpenableCageDoor);
            obj.oMoveAngleYaw += 0x8000;
            F.obj_set_collision_data(obj, W.gOpenableGrills[grillIdx].collision);
            obj = spawn_object_relative(1, -W.gOpenableGrills[grillIdx].halfWidth, 0, 0, o, W.gOpenableGrills[grillIdx].modelID,B.bhvOpenableCageDoor);
            F.obj_set_collision_data(obj, W.gOpenableGrills[grillIdx].collision);
            o.oAction++;
            break;
        case 1:
            if ((o.oOpenableGrillPurpleSwitch = F.cur_obj_nearest_object_with_behavior(B.bhvFloorSwitchGrills)) != null) {
                o.oAction++;
            }
            break;
        case 2:
            obj = o.oOpenableGrillPurpleSwitch;
            if (obj.oAction == PURPLE_SWITCH_ACT_TICKING) {
                o.oOpenableGrillUnk88 = 2;
                cur_obj_play_sound_2(SOUND_GENERAL_CAGE_OPEN);
                o.oAction++;
                if (o.oBhvParams2ndByte != OPENABLE_GRILL_BP_BOB) {
                    play_puzzle_jingle();
                }
            }
            break;
        case 3:
            break;
    }
}
function bhv_pole_base_loop() {
    const o = W.gCurrentObject;
    if (o.oPosY - 10.0 < W.gMarioObject.oPosY && W.gMarioObject.oPosY < o.oPosY + o.hitboxHeight + 30.0) {
        if (o.oTimer > 10 && !(W.gMarioStates[0].action & MARIO_PUNCHING)) {
            F.cur_obj_push_mario_away(70.0);
        }
    }
}
function bhv_sparkle_spawn_loop() {
    let sparkle = try_to_spawn_object(0, 1.0, o, MODEL_SPARKLES_ANIMATION,B.bhvSparkle);
    if (sparkle != null) {
        F.obj_translate_xyz_random(sparkle, 90.0);
        F.obj_scale_random(sparkle, 1.0, 0.0);
    }
    if (o.oTimer > 1) {
        F.obj_mark_for_deletion(o);
    }
}
let sWaterSplashDropletParams = { flags: WATER_DROPLET_FLAG_RAND_ANGLE, model: MODEL_WHITE_PARTICLE_SMALL, behavior:B.bhvWaterDroplet, moveAngleRange: 0, moveRange: 0, randForwardVelOffset: 5.0, randForwardVelScale: 3.0, randYVelOffset: 30.0, randYVelScale: 20.0, randSizeOffset: 0.5, randSizeScale: 1.0 };
W.gShallowWaterSplashDropletParams = { flags: WATER_DROPLET_FLAG_RAND_ANGLE | WATER_DROPLET_FLAG_SET_Y_TO_WATER_LEVEL, model: MODEL_WHITE_PARTICLE_SMALL, behavior:B.bhvWaterDroplet, moveAngleRange: 0, moveRange: 0, randForwardVelOffset: 2.0, randForwardVelScale: 3.0, randYVelOffset: 20.0, randYVelScale: 20.0, randSizeOffset: 0.5, randSizeScale: 1.0 };
let sWaterDropletFishParams = { flags: WATER_DROPLET_FLAG_RAND_ANGLE | WATER_DROPLET_FLAG_SET_Y_TO_WATER_LEVEL, model: MODEL_FISH, behavior:B.bhvWaterDroplet, moveAngleRange: 0, moveRange: 0, randForwardVelOffset: 2.0, randForwardVelScale: 3.0, randYVelOffset: 20.0, randYVelScale: 20.0, randSizeOffset: 1.0, randSizeScale: 0.0 };
W.gShallowWaterWaveDropletParams = { flags: WATER_DROPLET_FLAG_RAND_ANGLE_INCR_PLUS_8000 | WATER_DROPLET_FLAG_RAND_ANGLE | WATER_DROPLET_FLAG_SET_Y_TO_WATER_LEVEL, model: MODEL_WHITE_PARTICLE_SMALL, behavior:B.bhvWaterDroplet, moveAngleRange: 0x6000, moveRange: 0, randForwardVelOffset: 2.0, randForwardVelScale: 8.0, randYVelOffset: 10.0, randYVelScale: 10.0, randSizeOffset: 0.5, randSizeScale: 1.0 };
function bhv_water_splash_spawn_droplets() {
    const o = W.gCurrentObject;
    let i = 0;
    if (o.oTimer == 0) {
        o.oPosY = F.find_water_level(o.oPosX, o.oPosZ);
    }
    if (o.oPosY > FLOOR_LOWER_LIMIT_MISC) { 
        for (i = 0; i < 3; i++) {
            spawn_water_droplet(o, sWaterSplashDropletParams);
        }
    }
}
function bhv_water_droplet_loop() {
    let filler = new Array(4).fill(0);
    let waterLevel = F.find_water_level(o.oPosX, o.oPosZ);
    if (o.oTimer == 0) {
        if (F.cur_obj_has_model(MODEL_FISH)) {
            o.gfx.flags &= ~GRAPH_RENDER_BILLBOARD;
        } else {
            o.gfx.flags |= GRAPH_RENDER_BILLBOARD;
        }
        o.oFaceAngleYaw = F.random_u16();
    }
    o.oVelY -= 4.0;
    o.oPosY += o.oVelY;
    if (o.oVelY < 0.0) {
        if (waterLevel > o.oPosY) {
            try_to_spawn_object(0, 1.0, o, MODEL_SMALL_WATER_SPLASH,B.bhvWaterDropletSplash);
            F.obj_mark_for_deletion(o);
        } else if (o.oTimer > 20) {
            F.obj_mark_for_deletion(o);
        }
    }
    if (waterLevel < FLOOR_LOWER_LIMIT_MISC) {
        F.obj_mark_for_deletion(o);
    }
}
function bhv_idle_water_wave_loop() {
    const o = W.gCurrentObject;
    F.obj_copy_pos(o, W.gMarioObject);
    o.oPosY = W.gMarioStates[0].waterLevel + 5;
    if (!(W.gMarioObject.oMarioParticleFlags & ACTIVE_PARTICLE_IDLE_WATER_WAVE)) {
        W.gMarioObject.oActiveParticleFlags &= ((~ACTIVE_PARTICLE_IDLE_WATER_WAVE) & 0xFFFF);
        o.activeFlags = ACTIVE_FLAG_DEACTIVATED;
    }
}
function bhv_water_droplet_splash_init() {
    F.cur_obj_scale(F.random_float() + 1.5);
}
function bhv_bubble_splash_init() {
    let waterLevel = F.find_water_level(o.oPosX, o.oPosZ);
    F.obj_scale_xyz(o, 0.5, 1.0, 0.5);
    o.oPosY = waterLevel + 5.0;
}
function bhv_shallow_water_splash_init() {
    const o = W.gCurrentObject;
    if ((F.random_u16() & 0xFF) <= 0) { 
        let fishObj = spawn_water_droplet(o, sWaterDropletFishParams);
        F.obj_init_animation_with_sound(fishObj,W.SYM('blue_fish_seg3_anims_0301C2B0'), 0);
    }
}
function bhv_wave_trail_shrink() {
    let waterLevel = F.find_water_level(o.oPosX, o.oPosZ);
    if ((o.oTimer == 0) && (W.gGlobalTimer & 1)) {
        F.obj_mark_for_deletion(o);
    }
    o.oPosY = waterLevel + 5.0;
    if (o.oTimer == 0) {
        o.oWaveTrailSize = o.gfx.scale[0];
    }
    if (o.oAnimState > 3) {
        o.oWaveTrailSize = o.oWaveTrailSize - 0.1; 
        if (o.oWaveTrailSize < 0.0) {
            o.oWaveTrailSize = 0.0;
        }
        o.gfx.scale[0] = o.oWaveTrailSize;
        o.gfx.scale[2] = o.oWaveTrailSize;
    }
}

Object.assign(F, { bhv_bobomb_anchor_mario_loop, king_bobomb_act_0, mario_is_far_below_object, king_bobomb_act_2, king_bobomb_act_3, king_bobomb_act_1, king_bobomb_act_6, king_bobomb_act_7, king_bobomb_act_8, king_bobomb_act_4, king_bobomb_act_5, king_bobomb_move, bhv_king_bobomb_loop, bhv_cannon_base_unused_loop, opened_cannon_act_0, opened_cannon_act_4, opened_cannon_act_6, opened_cannon_act_5, opened_cannon_act_1, opened_cannon_act_2, opened_cannon_act_3, bhv_cannon_base_loop, bhv_cannon_barrel_loop, common_anchor_mario_behavior, bhv_chuckya_anchor_mario_loop, unknown_chuckya_function, chuckya_act_0, chuckya_act_1, chuckya_act_3, chuckya_act_2, chuckya_move, bhv_chuckya_loop, bhv_warp_loop, bhv_fading_warp_loop, spawn_mist_particles_variable, bhv_spawned_star_init, set_sparkle_spawn_star_hitbox, set_home_to_mario, set_y_home_to_pos, slow_star_rotation, bhv_spawned_star_loop, bhv_spawn_star_no_level_exit, bhv_coin_sparkles_init, bhv_yellow_coin_init, bhv_yellow_coin_loop, bhv_temp_coin_loop, bhv_spawned_coin_init, bhv_spawned_coin_loop, bhv_coin_formation_spawn_loop, spawn_coin_in_formation, bhv_coin_formation_init, bhv_coin_formation_loop, coin_inside_boo_act_1, coin_inside_boo_act_0, bhv_coin_inside_boo_loop, bhv_coin_sparkles_loop, bhv_golden_coin_sparkles_loop, bhv_punch_tiny_triangle_loop, bhv_punch_tiny_triangle_init, bhv_wall_tiny_star_particle_loop, bhv_tiny_star_particles_init, bhv_pound_tiny_star_particle_loop, bhv_pound_tiny_star_particle_init, spawn_triangle_break_particles, bhv_pound_white_puffs_init, spawn_mist_from_global, bhv_ground_sand_init, spawn_smoke_with_velocity, clear_particle_flags, bhv_ground_snow_init, bhv_bowser_shock_wave_loop, bhv_black_smoke_upward_loop, bhv_black_smoke_bowser_loop, bhv_black_smoke_mario_loop, bhv_flame_mario_loop, bhv_tree_snow_or_leaf_loop, bhv_snow_leaf_particle_spawn_init, bhv_purple_switch_loop, check_if_moving_over_floor, bhv_pushable_loop, breakable_box_init, hidden_breakable_box_actions, hidden_wdw_platform_actions, bhv_hidden_object_loop, bhv_breakable_box_loop, spawn_sparkle_particles, arc_to_goal_pos, grand_star_zero_velocity, bhv_grand_star_loop, bhv_bowser_key_loop, bowser_tail_anchor_act_default, bowser_tail_anchor_thrown, bowser_tail_anchor_act_touched_mario, bhv_bowser_tail_anchor_loop, bhv_bowser_flame_spawn_loop, bhv_bowser_body_anchor_loop, bowser_spawn_shockwave, bowser_set_anim_look_up_and_walk, bowser_set_anim_slow_gait, bowser_set_anim_look_down_stop_walk, bowser_init_camera_actions, bowser_act_wait, bowser_act_intro_walk, bowser_debug_actions, bowser_bitdw_actions, bowser_bitfs_actions, bowser_bits_action_list, bowser_set_act_big_jump, bowser_bits_actions, bowser_act_idle, bowser_act_default, bowser_act_breath_fire, bowser_act_walk_to_mario, bowser_act_teleport, bowser_act_spit_fire_into_sky, bowser_act_hit_mine, bowser_set_anim_jump, bowser_land, bowser_short_second_hop, bowser_act_big_jump, bowser_act_quick_jump, bowser_act_hit_edge, bowser_act_spit_fire_onto_floor, bowser_turn_on_timer, bowser_act_turn_from_edge, bowser_act_charge_mario, bowser_check_hit_mine, bowser_act_thrown, bowser_set_goal_invisible, bowser_act_jump_onto_stage, bowser_act_dance, bowser_spawn_collectable, bowser_fly_back_dead, bowser_dead_bounce, bowser_dead_wait_for_mario, bowser_dead_twirl_up, bowser_dead_hide, bowser_dead_default_stage_ending, bowser_dead_final_stage_ending, bowser_act_dead, bowser_tilt_platform, bowser_act_tilt_lava_platform, bowser_check_fallen_off_stage, bowser_free_update, bowser_held_update, bowser_thrown_dropped_update, bhv_bowser_loop, bhv_bowser_init, bowser_open_eye_switch, geo_switch_bowser_eyes, bowser_flame_despawn, bowser_flame_should_despawn, bhv_flame_bowser_init, bhv_flame_large_burning_out_init, bowser_flame_move, bhv_flame_bowser_loop, bhv_flame_moving_forward_growing_init, bhv_flame_moving_forward_growing_loop, bhv_flame_floating_landing_init, bhv_flame_floating_landing_loop, bhv_blue_bowser_flame_init, bhv_blue_bowser_flame_loop, bhv_flame_bouncing_init, bhv_flame_bouncing_loop, bhv_blue_flames_group_loop, vec3f_copy_2, bhv_checkerboard_elevator_group_init, checkerboard_plat_act_move_y, checkerboard_plat_act_rotate, bhv_checkerboard_platform_init, bhv_checkerboard_platform_loop, koopa_shell_spawn_water_drop, bhv_koopa_shell_flame_loop, bhv_koopa_shell_flame_spawn, koopa_shell_spawn_sparkles, bhv_koopa_shell_loop, set_obj_anim_with_accel_and_sound, bhv_rotating_exclamation_box_loop, exclamation_box_act_0, exclamation_box_act_1, exclamation_box_act_2, exclamation_box_act_3, exclamation_box_spawn_contents, exclamation_box_act_4, exclamation_box_act_5, bhv_exclamation_box_loop, bhv_white_puff_1_loop, bhv_white_puff_2_loop, bhv_openable_cage_door_loop, bhv_openable_grill_loop, bhv_pole_base_loop, bhv_sparkle_spawn_loop, bhv_water_splash_spawn_droplets, bhv_water_droplet_loop, bhv_idle_water_wave_loop, bhv_water_droplet_splash_init, bhv_bubble_splash_init, bhv_shallow_water_splash_init, bhv_wave_trail_shrink });

})(window);
