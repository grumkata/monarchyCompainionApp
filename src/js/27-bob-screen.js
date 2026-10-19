/* ══════════════════════════════════════════════════════════════
   27-bob-screen.js — WHAT THE GAME DRAWS ON THE GLASS: the HUD, the
   power meter, the dialog box, in the game's own pictures.

   Once the player's ROM is in (27-bob-rom.js), the counters, the meter and
   the words are drawn the way the game draws them, on a screen of its size
   (240 lines, pixels left square and unsmoothed), from the decompilation:

     the HUD        hud.c / print.c: 16x16 glyphs of main_hud_lut, 12 apart,
                    lives at 22, coins at 168, stars 78 from the right edge,
                    the camera's icons at the bottom right; the coins count
                    up one every other frame
     power meter    hud.c: its two halves and the pre-drawn wedge picture for
                    the health left, dropping to 166 when hurt, rising back,
                    going up and off when the health is full again
     dialog box     ingame_menu.c: each dialog's lines, left and top
                    (text/us/dialogs.h), the box half see-through (black for
                    who speaks, white for signs), the US font's 8x16 cells
                    with each letter's own advance, a page at a time, the
                    box turning in (or zooming, for signs), the text rolling
                    up between pages, the arrow blinking

   Wider than 4:3, the left and right counters keep to the edges and the
   rest to the middle 320, as the PC ports of the game lay it out. The
   logic runs at the game's 30 frames a second. Without a ROM nothing here
   draws, and the page's own counters and box stay (27-bob-world.js); the
   US font is only in the US cartridge, so the others keep the page's box.

   And the shadows under everything, as shadow.c makes them: each model's
   GEO_SHADOW (how wide, how dark, round or square) times its scale,
   shrinking to half and paling to 120 over the first 600 units of height,
   a circle laid on the slope under it or a square flat and turned with the
   object, in the game's quarter-circle and quarter-square pictures
   mirrored four ways once the ROM is in.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const FPS = 30, OPENING = 0, OPEN = 1, SCROLLING = 2, CLOSING = 3;
const HIDDEN = 0, EMPHASIZED = 1, DEEMPHASIZING = 2, HIDING = 3, VISIBLE = 4;
const THE = [0x37, 0x2B, 0x28], YOU = [0x3C, 0x32, 0x38];

/* ══ THE PICTURES ══════════════════════════════════════════════
   Cut from the one sheet 27-bob-rom.js puts the screen's pictures on. */
function picture(url) {
  return new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('a picture would not load')); i.src = url; });
}
function canvas(w, h) { const c = doc.createElement('canvas'); c.width = w; c.height = h; return c; }
async function cutter(sheet) {
  const img = await picture(sheet.png), c = canvas(img.width, img.height), x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  const all = x.getImageData(0, 0, img.width, img.height);
  return name => {
    const a = sheet.at[name];
    if (!a) return null;
    const [x0, y0, w, h] = a, P = new ImageData(w, h);
    for (let r = 0; r < h; r++) P.data.set(all.data.subarray(((y0 + r) * all.width + x0) * 4, ((y0 + r) * all.width + x0 + w) * 4), r * w * 4);
    return P;
  };
}
/* the alpha is a bit: drawn or not */
function hard(P) {
  const c = canvas(P.width, P.height);
  for (let i = 3; i < P.data.length; i += 4) P.data[i] = P.data[i] >= 128 ? 255 : 0;
  c.getContext('2d').putImageData(P, 0, 0);
  return c;
}
/* a font cell: kept on its side, 16 across and 8 down (vertex_ia8_char's s runs up the letter, t right to left),
   stood up as 8x16; white as the game's white text has it (the intensity), and black for the signs' */
function glyph(P) {
  return [0, 1].map(k => {
    const c = canvas(8, 16), x = c.getContext('2d'), G = x.createImageData(8, 16);
    for (let r = 0; r < 16; r++) for (let col = 0; col < 8; col++) {
      const s = ((7 - col) * 16 + (15 - r)) * 4, d = (r * 8 + col) * 4, v = k ? 0 : P.data[s];
      G.data[d] = G.data[d + 1] = G.data[d + 2] = v; G.data[d + 3] = P.data[s + 3] >= 128 ? 255 : 0;
    }
    x.putImageData(G, 0, 0);
    return c;
  });
}
/* a shadow's picture: a quarter, drawn out from the centre (texel 0) and mirrored, as the tile's MIRROR addressing reads it */
function quarter(P) {
  const c = canvas(32, 32), x = c.getContext('2d'), F = x.createImageData(32, 32);
  const m = j => (j < 16 ? 15 - j : j - 16);
  for (let j = 0; j < 32; j++) for (let k = 0; k < 32; k++) {
    const s = (m(j) * 16 + m(k)) * 4, d = (j * 32 + k) * 4;
    for (let q = 0; q < 4; q++) F.data[d + q] = P.data[s + q];
  }
  x.putImageData(F, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.generateMipmaps = false; t.minFilter = t.magFilter = THREE.LinearFilter;
  return t;
}
function load(cut) {
  const B = root.__BOB.screen, one = n => { const P = n && cut(n); return P ? hard(P) : null; };
  const P = {
    hud: B.hud.map(one), camera: B.camera.map(one), wedges: B.wedges.map(one),
    left: one('texture_power_meter_left_side'), right: one('texture_power_meter_right_side'), font: null
  };
  /* the US font is only in the US cartridge */
  if (B.font.filter(Boolean).every(n => cut(n))) P.font = B.font.map(n => (n ? glyph(cut(n)) : null));
  return P;
}

/* ══ THE SCREEN ════════════════════════════════════════════════ */
function make(r) {
  const cv = canvas(320, 240); cv.className = 'bs-n64';
  r.el.appendChild(cv);
  r.scr = { cv, x: cv.getContext('2d'), pics: null, f: 0, t0: 0, coins: 0, meter: { anim: HIDDEN, y: 166, stored: 8, timer: 0, hurt: 0, hp: 8 }, talk: null };
}
async function rom(r, sheet) {
  const S = r.scr;
  if (!S || !sheet || !root.__BOB.screen) return;
  let cut;
  try { cut = await cutter(sheet); } catch (e) { return; }
  const c = cut('texture_shadow_quarter_circle'), q = cut('texture_shadow_quarter_square');
  if (c && q) {
    r.shadowMaps = [quarter(c), quarter(q)];
    for (const m of r.shadows || []) { m.material.map = r.shadowMaps[m.userData.shadow.sq ? 1 : 0]; m.material.needsUpdate = true; }
  }
  const P = load(cut);
  if (!P.hud[0]) return;
  S.pics = P;
  S.coins = r.game ? r.game.coins : 0;
  r.el.classList.add('n64-hud');
  if (P.font) r.el.classList.add('n64-talk');
}
const on = r => !!(r.scr && r.scr.pics);
const talks = r => !!(r.scr && r.scr.pics && r.scr.pics.font);

/* ══ ONE FRAME OF THE GAME ═════════════════════════════════════ */
function frame(r) {
  const S = r.scr, g = r.game;
  /* update_hud_values: the coins count up one every other frame */
  if (S.coins > g.coins) S.coins = g.coins;
  else if (S.coins < g.coins && (S.f & 1)) S.coins++;
  meter(r);
  if (S.talk) talkFrame(r);
  S.f++;
}
/* hud.c render_hud_power_meter, as it goes frame by frame */
function meter(r) {
  const M = r.scr.meter, w = Math.max(0, Math.min(8, r.game.hp));
  /* hurtCounter: a wedge goes every 4 frames, and the meter is emphasized while they go */
  if (w < M.hp) M.hurt += 4 * (M.hp - w);
  M.hp = w;
  const emph = M.hurt > 0;
  if (M.hurt > 0) M.hurt--;
  if (M.anim !== HIDING) {
    if (w < 8 && M.stored === 8 && M.anim === HIDDEN) { M.anim = EMPHASIZED; M.y = 166; }
    if (w === 8 && M.stored === 7) M.timer = 0;
    if (w === 8 && M.timer > 45) M.anim = HIDING;
    M.stored = w;
  }
  if (M.anim === HIDDEN) return;
  if (M.anim === EMPHASIZED) { if (!emph) { if (M.timer === 45) M.anim = DEEMPHASIZING; } else M.timer = 0; }
  else if (M.anim === DEEMPHASIZING) {
    const v = M.y > 195 ? 1 : M.y > 190 ? 2 : M.y > 180 ? 3 : 5;
    M.y += v; if (M.y > 200) { M.y = 200; M.anim = VISIBLE; }
  } else if (M.anim === HIDING) { M.y += 20; if (M.y > 300) { M.anim = HIDDEN; M.timer = 0; } }
  M.timer++;
}

/* ══ DRAWING ═══════════════════════════════════════════════════ */
function draw(r, t) {
  const S = r.scr;
  if (!on(r)) return;
  /* the game's frames, from the time gone by */
  if (!S.t0) S.t0 = t - S.f / FPS;
  for (let n = 0; S.f < Math.floor((t - S.t0) * FPS) && n < 8; n++) frame(r);
  if (S.f < Math.floor((t - S.t0) * FPS)) S.t0 = t - S.f / FPS;
  /* as tall as the game's picture, as wide as the window lets it be */
  const vw = Math.max(320, Math.round(240 * r.W / Math.max(1, r.H)));
  if (S.cv.width !== vw) S.cv.width = vw;
  const x = S.x, ox = Math.floor((vw - 320) / 2), P = S.pics, g = r.game;
  x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, vw, 240); x.imageSmoothingEnabled = false;
  if (r.phase === 'play' || S.talk) {
    /* the scissor the HUD is drawn in: rows 8 to 231 */
    x.save(); x.beginPath(); x.rect(0, 8, vw, 224); x.clip();
    powerMeter(x, ox, P, S.meter, g);
    cameraIcons(x, vw, P);
    x.restore();
    /* the labels go on last, over the meter */
    label(x, P, 22, 209, ',');
    label(x, P, 38, 209, '*');
    label(x, P, 54, 209, String(g.lives));
    label(x, P, ox + 168, 209, '+');
    label(x, P, ox + 184, 209, '*');
    label(x, P, ox + 198, 209, String(S.coins));
    const sx = vw - 78, few = g.stars < 100;
    label(x, P, sx, 209, '-');
    if (few) label(x, P, sx + 16, 209, '*');
    label(x, P, few ? sx + 30 : sx + 16, 209, String(g.stars));
  }
  if (S.talk) talkDraw(x, ox, P, S);
}
/* print.c: a label's y is from the bottom of the screen; each place 12 along, the glyph 16 */
function label(x, P, at, y, s) {
  for (let j = 0; j < s.length; j++) {
    const c = s.charCodeAt(j);
    const i = c >= 48 && c <= 57 ? c - 48 : c >= 65 && c <= 90 ? c - 55 : c >= 97 && c <= 122 ? c - 87
      : { 42: 50, 43: 51, 44: 52, 45: 53 }[c];
    const img = i === undefined ? null : P.hud[i];
    if (img) x.drawImage(img, at + j * 12, 224 - y);
  }
}
/* render_dl_power_meter: the halves at (140, y) counting up from the bottom, the wedges over them */
function powerMeter(x, ox, P, M, g) {
  if (M.anim === HIDDEN || !P.left) return;
  const top = 240 - M.y, w = Math.max(0, Math.min(8, g.hp));
  x.drawImage(P.left, 0, 0, 31, 63, ox + 108, top - 32, 32, 64);
  x.drawImage(P.right, 0, 0, 32, 63, ox + 140, top - 32, 32, 64);
  if (w > 0 && P.wedges[w - 1]) x.drawImage(P.wedges[w - 1], 0, 0, 31, 31, ox + 124, top - 16, 31, 32);
}
/* render_hud_camera_status: the camera and Lakitu behind Mario, at the right edge */
function cameraIcons(x, vw, P) {
  if (P.camera[0]) x.drawImage(P.camera[0], vw - 54, 205);
  if (P.camera[2]) x.drawImage(P.camera[2], vw - 38, 205);
}

/* ══ THE DIALOG BOX ════════════════════════════════════════════ */
/* textconv's way: the longest of up to three characters the charmap has, each to its byte */
function encode(text) {
  const C = root.__BOB.screen.chars, out = [];
  const cps = Array.from(text);
  for (let i = 0; i < cps.length;) {
    let n = 3;
    while (n > 0 && C[cps.slice(i, i + n).join('')] === undefined) n--;
    if (n) { out.push(C[cps.slice(i, i + n).join('')]); i += n; } else i++;
  }
  out.push(0xFF);
  return out;
}
function talk(r, id, text, zoom, done) {
  const box = root.__BOB.screen.talk[id];
  if (!talks(r) || !box) return false;
  r.scr.talk = { L: box[0], left: box[1], width: box[2], zoom: !!zoom, bytes: encode(text), state: OPENING, angle: 90, scale: 19,
                 scrollY: 0, page: 0, next: 0, press: false, done, over: false };
  return true;
}
function press(r) { if (r.scr && r.scr.talk) r.scr.talk.press = true; }
/* render_dialog_entries: the state first, then the frame drawn as it leaves it */
function talkFrame(r) {
  const d = r.scr.talk, L = d.L;
  if (d.over) { r.scr.talk = null; if (d.done) d.done(); return; }
  if (d.state === OPENING) {
    if (d.zoom) { d.angle -= 10; d.scale -= 2; } else { d.angle -= 7.5; d.scale -= 1.5; }
    if (d.angle === 0) d.state = OPEN;
  } else if (d.state === OPEN) {
    d.angle = 0;
    if (d.press) d.state = d.next === -1 ? CLOSING : SCROLLING;
  } else if (d.state === SCROLLING) {
    d.scrollY += 2 * L;
    if (d.scrollY >= 16 * L) { d.page = d.next; d.state = OPEN; d.scrollY = 0; }
  } else if (d.state === CLOSING) {
    d.angle += 10; d.scale += 2;
    if (d.angle === 90) d.over = true;                       /* still drawn this frame */
  }
  d.press = false;
  d.lay = layout(d);
  if (d.state === OPEN) d.next = d.lay.next;
}
/* handle_dialog_text_and_pages: where each letter goes, from the start of the page */
function layout(d) {
  const W = root.__BOB.screen.widths, total = d.state === SCROLLING ? 2 * d.L + 1 : d.L + 1, out = [];
  let line = 1, pen = 0, xm = 1, i = d.page, end = false;
  const put = c => { pen += 5 * (xm - 1); out.push([c, pen, line]); pen += W[c]; xm = 1; };
  for (;;) {
    const c = d.bytes[i];
    if (c === 0xFF || c === undefined) { end = true; break; }
    if (c === 0xFE) { line++; if (line === total) { i++; break; } pen = 0; xm = 1; }
    else if (c === 0x9E) xm++;
    else if (c === 0xD0) xm += 2;
    else if (c === 0xD1 || c === 0xD2) { pen += 5 * (xm - 1); xm = 1; for (const k of c === 0xD1 ? THE : YOU) { out.push([k, pen, line]); pen += W[k]; } }
    else if (c !== 0xF0 && c !== 0xF1 && c !== 0xE0) put(c);
    i++;
  }
  return { glyphs: out, next: end ? -1 : i };
}
function talkDraw(x, ox, P, S) {
  const d = S.talk, L = d.L, lay = d.lay;
  if (!lay) return;
  /* the game's y runs up from the bottom: put that right once, and every transform after reads as it does in C */
  const base = () => { x.setTransform(1, 0, 0, -1, ox, 240); x.translate(d.left, d.width); };
  const moving = d.state === OPENING || d.state === CLOSING;
  const boxM = () => {
    base();
    if (!moving) return;
    if (d.zoom) { x.translate(65 - 65 / d.scale, 40 / d.scale - 40); x.scale(1 / d.scale, 1 / d.scale); }
    else { x.scale(1 / d.scale, 1 / d.scale); x.rotate(4 * d.angle * Math.PI / 180); }
  };
  /* the box: 130x80 grown to the lines, half see-through */
  x.save(); x.beginPath(); x.rect(0, 8, x.canvas.width, 224); x.clip();
  boxM(); x.translate(-7, 5); x.scale(1.1, L / 5 + 0.1);
  x.fillStyle = d.zoom ? 'rgba(255,255,255,0.588)' : 'rgba(0,0,0,0.588)';
  x.fillRect(0, -80, 130, 80);
  x.restore();
  /* the words, clipped to the box's lines */
  x.save();
  x.setTransform(1, 0, 0, 1, 0, 0); x.beginPath(); x.rect(ox + d.left, 240 - d.width, 132, 16 * L); x.clip();
  boxM(); if (d.state === SCROLLING) x.translate(0, d.scrollY);
  for (const [c, pen, line] of lay.glyphs) {
    const gl = P.font[c];
    if (!gl) continue;
    x.save(); x.translate(pen, 2 - 16 * line + 16); x.scale(1, -1); x.drawImage(gl[d.zoom ? 1 : 0], 0, 0); x.restore();
  }
  x.restore();
  /* the arrow for the next page, blinking */
  if (d.next !== -1 && d.state === OPEN && !(S.f & 8)) {
    x.save(); base(); x.translate(118, 5 - 16 * L); x.scale(0.8, 0.8); x.rotate(-Math.PI / 2);
    x.fillStyle = d.zoom ? '#000' : '#fff';
    x.beginPath(); x.moveTo(0, 0); x.lineTo(8, 8); x.lineTo(0, 16); x.closePath(); x.fill();
    x.restore();
  }
  x.setTransform(1, 0, 0, 1, 0, 0);
}

/* ══ SHADOWS ═══════════════════════════════════════════════════ */
/* the GEO_SHADOW in a model's geo layout, as the baker kept it */
function shadowNode(key) {
  const walk = n => (!n ? null : n.k === 'shadow' && n.s ? n : (n.c || []).reduce((a, c) => a || walk(c), null));
  const C = root.__BOB.cast && root.__BOB.cast[key];
  return C ? walk(C.tree || C) : null;
}
function shadow(r, key, scale, standIn) {
  const n = (typeof key === 'string' ? shadowNode(key) : key) || { type: 'SHADOW_CIRCLE_4_VERTS', solid: 180, s: 100 };
  const geo = new THREE.PlaneGeometry(1, 1), uv = geo.attributes.uv;
  /* s and t from -15 to 15 texels, texel centres on the whole numbers */
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) > 0.5 ? 31.5 / 32 : 1.5 / 32, uv.getY(i) > 0.5 ? 31.5 / 32 : 1.5 / 32);
  const sq = /SQUARE/.test(n.type || '');
  const map = r.shadowMaps ? r.shadowMaps[sq ? 1 : 0] : standIn;
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
  m.renderOrder = 2; m.visible = false;
  m.userData.shadow = { d: Math.trunc(n.s * (scale || 1)), sol: n.solid, sq, perm: /PERMANENT/.test(n.type || '') };
  r.scene.add(m); (r.shadows || (r.shadows = [])).push(m);
  return m;
}
/* create_shadow_below_xyz: on the floor under (x, y, z) (the highest one no more than 78 above it) */
function shade(m, x, y, z, col, on, yaw) {
  if (!m) return;
  const S = m.userData.shadow, f = on ? col.floor(x, y + 78, z) : null;
  if (!f || f.h < -10000 || !(f.t.ny > 0)) { m.visible = false; return; }
  const h = Math.max(0, y - f.h), k = Math.min(h, 600) / 600;
  let size = S.d, sol = S.sol;
  if (S.sq) {
    /* a square stays level, the size it is (or shrinking, if it may), turned with the object */
    if (!S.perm) size = S.d * (1 - 0.5 * k);
    m.position.set(x, f.h + 1, z); m.rotation.set(-Math.PI / 2, 0, yaw || 0, 'YXZ');
  } else {
    size = S.d * (1 - 0.5 * k);
    if (sol >= 121) sol = Math.trunc((120 - sol) * k + sol);
    m.position.set(x, f.h + 1, z); m.lookAt(x + f.t.nx, f.h + 1 + f.t.ny, z + f.t.nz);
  }
  m.scale.set(size, size, 1);
  m.material.opacity = sol / 255;
  m.visible = true;
}

root.BobScreen = { make, rom, draw, talk, press, on, talks, shadow, shade, _: { encode, layout, glyph, shadowNode } };

})(window, document);
