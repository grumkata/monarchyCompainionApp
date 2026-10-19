/* ══════════════════════════════════════════════════════════════
   27-bob-rom.js — THE GAME'S OWN PICTURES, OUT OF THE PLAYER'S OWN GAME.

   grumkata: "DO NOT MAKE YOUR OWN ASSETS".

   Bob-omb Battlefield's shapes are the decompilation's (tools/bake-bob.js),
   but the decompilation has no pictures: they live in the cartridge. So,
   the way libsm64 does it, the course asks for the player's own copy of
   Super Mario 64 and reads them out of that: the course's textures, its
   sky. Nothing of the game's is shipped; assets/bob/bob.js carries only
   where each picture sits in each version of the ROM (from the
   decompilation's assets.json).

     the file     .z64, .v64 or .n64 (any byte order), checked against the
                  SHA-1 of the US, Japanese, European or Shindou release
     unpacking    MIO0, the game's own packing, as sm64tools/libmio0.c
                  undoes it
     the pictures RGBA16, RGBA32, IA16, IA8, IA4, I8 and I4, decoded as
                  sm64tools/n64graphics.c does; the sky's 64 tiles put
                  together as tools/skyconv.c does
     keeping      only the decoded pictures are kept (IndexedDB, this
                  machine), never the ROM, so it is asked for once; the
                  menu's Forget everything forgets them too
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

/* ══ BYTES ═════════════════════════════════════════════════════ */
/* a ROM in the console's own order (.z64: 80 37 12 40), from any of the three orders it is found in */
function bigEndian(u8) {
  if (u8.length < 0x1000) return null;
  const a = u8[0], b = u8[1], c = u8[2], d = u8[3];
  if (a === 0x80 && b === 0x37 && c === 0x12 && d === 0x40) return u8;
  const out = new Uint8Array(u8.length);
  if (a === 0x37 && b === 0x80 && c === 0x40 && d === 0x12) {          /* .v64: every pair swapped */
    for (let i = 0; i + 1 < u8.length; i += 2) { out[i] = u8[i + 1]; out[i + 1] = u8[i]; }
    return out;
  }
  if (a === 0x40 && b === 0x12 && c === 0x37 && d === 0x80) {          /* .n64: every word backwards */
    for (let i = 0; i + 3 < u8.length; i += 4) { out[i] = u8[i + 3]; out[i + 1] = u8[i + 2]; out[i + 2] = u8[i + 1]; out[i + 3] = u8[i]; }
    return out;
  }
  return null;
}
const u32 = (b, i) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;

/* MIO0: a bit for each byte out (1, the next plain byte; 0, a two-byte back-reference, 3 to 18 long, up to 4096 back) */
function mio0(rom, at) {
  if (rom[at] !== 0x4D || rom[at + 1] !== 0x49 || rom[at + 2] !== 0x4F || rom[at + 3] !== 0x30) throw new Error('no MIO0 block at ' + at);
  const size = u32(rom, at + 4), comp = at + u32(rom, at + 8), raw = at + u32(rom, at + 12);
  const out = new Uint8Array(size);
  let bit = 0, ci = 0, ri = 0, n = 0;
  while (n < size) {
    if (rom[at + 16 + (bit >> 3)] & (0x80 >> (bit & 7))) out[n++] = rom[raw + ri++];
    else {
      const v0 = rom[comp + ci], v1 = rom[comp + ci + 1]; ci += 2;
      const len = (v0 >> 4) + 3, back = ((v0 & 0x0F) << 8) + v1 + 1;
      for (let k = 0; k < len && n < size; k++, n++) out[n] = out[n - back];
    }
    bit++;
  }
  return out;
}

/* ══ PICTURES ══════════════════════════════════════════════════ */
const s5 = v => Math.floor(v * 255 / 31), s4 = v => v * 0x11, s3 = v => v * 0x24;
function decode(b, w, h, fmt) {
  const px = new Uint8ClampedArray(w * h * 4), n = w * h;
  const put = (i, r, g, bl, a) => { px[i * 4] = r; px[i * 4 + 1] = g; px[i * 4 + 2] = bl; px[i * 4 + 3] = a; };
  const nib = i => (i & 1 ? b[i >> 1] & 0xF : b[i >> 1] >> 4);
  for (let i = 0; i < n; i++) {
    switch (fmt) {
      case 'rgba16': { const hi = b[i * 2], lo = b[i * 2 + 1]; put(i, s5(hi >> 3), s5(((hi & 7) << 2) | (lo >> 6)), s5((lo >> 1) & 31), lo & 1 ? 255 : 0); break; }
      case 'rgba32': put(i, b[i * 4], b[i * 4 + 1], b[i * 4 + 2], b[i * 4 + 3]); break;
      case 'ia16': put(i, b[i * 2], b[i * 2], b[i * 2], b[i * 2 + 1]); break;
      case 'ia8': { const v = s4(b[i] >> 4); put(i, v, v, v, s4(b[i] & 15)); break; }
      case 'ia4': { const q = nib(i), v = s3(q >> 1); put(i, v, v, v, q & 1 ? 255 : 0); break; }
      /* intensity alone: the RDP reads it as the alpha too */
      case 'i8': put(i, b[i], b[i], b[i], b[i]); break;
      case 'i4': { const v = s4(nib(i)); put(i, v, v, v, v); break; }
      default: throw new Error('a picture in ' + fmt);
    }
  }
  return px;
}
function png(px, w, h) {
  const c = doc.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').putImageData(new ImageData(px, w, h), 0, 0);
  return c.toDataURL('image/png');
}
/* the sky: 64 tiles of 32x32 and then a table of 80 (8 rows of 10, the last two columns the first two again) saying
   which tile goes where; each tile gives 31 of its 32 rows and columns, the last being the next tile's first */
function sky(b) {
  const T = b.length - 80 * 4, W = 248, px = new Uint8ClampedArray(W * W * 4);
  const tiles = [];
  for (let at = 0; at < T; at += 2048) tiles.push(decode(b.subarray(at, at + 2048), 32, 32, 'rgba16'));
  const base = u32(b, T);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
    const tile = tiles[(u32(b, T + (i * 10 + j) * 4) - base) / 0x800];
    if (!tile) throw new Error('the sky\'s table points past its tiles');
    for (let y = 0; y < 31; y++) for (let x = 0; x < 31; x++) {
      const o = ((i * 31 + y) * W + j * 31 + x) * 4, s = (y * 32 + x) * 4;
      px[o] = tile[s]; px[o + 1] = tile[s + 1]; px[o + 2] = tile[s + 2]; px[o + 3] = tile[s + 3];
    }
  }
  return png(px, W, W);
}

/* ══ READING A ROM ═════════════════════════════════════════════ */
async function sha1(u8) {
  if (!(root.crypto && crypto.subtle)) return null;
  const h = new Uint8Array(await crypto.subtle.digest('SHA-1', u8));
  return Array.from(h, x => x.toString(16).padStart(2, '0')).join('');
}
/* which release this is: by its SHA-1, or (no hashing to be had: a page not served over https) by its header, as
   asm/rom_header.s writes it: the name, the region, and the version byte (3 for Shindou, named without its spaces) */
async function version(rom, R) {
  const h = await sha1(rom);
  if (h) return Object.keys(R.sha1).find(v => R.sha1[v] === h) || null;
  const name = String.fromCharCode(...rom.subarray(0x20, 0x34)).trim(), region = String.fromCharCode(rom[0x3E]), v = rom[0x3F];
  if (name === 'SUPERMARIO64' && region === 'J' && v === 3) return 'sh';
  if (name !== 'SUPER MARIO 64' || v !== 0) return null;
  return { E: 'us', P: 'eu', J: 'jp' }[region] || null;
}
/* the screen's small pictures (the HUD's letters, the dialog font, the power meter, the shadows) go on one sheet as
   well, so the page has one picture to wait for rather than three hundred */
const SHEET = /^texture_(hud_char|font_char|power_meter|shadow_quarter)/;
function sheet(list) {
  const W = 256, at = {};
  let x = 0, y = 0, row = 0;
  list.sort((a, b) => b[3] - a[3]);
  for (const [name, , w, h] of list) {
    if (x + w > W) { x = 0; y += row; row = 0; }
    at[name] = [x, y, w, h]; x += w; row = Math.max(row, h);
  }
  const H = y + row, px = new Uint8ClampedArray(W * H * 4);
  for (const [name, p, w, h] of list) {
    const [x0, y0] = at[name];
    for (let r = 0; r < h; r++) px.set(p.subarray(r * w * 4, (r + 1) * w * 4), ((y0 + r) * W + x0) * 4);
  }
  return { png: png(px, W, H), at };
}
/* every picture R lists, out of a ROM of release `ver` */
function extract(rom, ver, R) {
  const blocks = new Map();
  const bytes = (pos, size) => {
    if (pos.length === 2) {
      let b = blocks.get(pos[0]);
      if (!b) blocks.set(pos[0], b = mio0(rom, pos[0]));
      return b.subarray(pos[1], pos[1] + size);
    }
    return rom.subarray(pos[0], pos[0] + size);
  };
  const out = { ver, tex: {}, sky: null, sheet: null }, small = [];
  for (const [name, [fmt, w, h, size, at]] of Object.entries(R.tex)) {
    if (!at[ver]) continue;
    const px = decode(bytes(at[ver], size), w, h, fmt);
    out.tex[name] = png(px, w, h);
    if (SHEET.test(name)) small.push([name, px, w, h]);
  }
  if (small.length) out.sheet = sheet(small);
  if (R.sky && R.sky[1][ver]) out.sky = sky(bytes(R.sky[1][ver], R.sky[0]));
  return out;
}
async function fromFile(file, R) {
  const rom = bigEndian(new Uint8Array(await file.arrayBuffer()));
  if (!rom) throw new Error('That is not a Nintendo 64 ROM (.z64, .v64 or .n64).');
  const ver = await version(rom, R);
  if (!ver) throw new Error('That ROM is not Super Mario 64 as it was released (US, Japan, Europe or Shindou).');
  const out = extract(rom, ver, R);
  out.key = keyOf(R);
  keep(out);                                     /* in the background: the course need not wait for the disk */
  return out;
}

/* ══ KEEPING THE PICTURES ══════════════════════════════════════
   Under a key made of the list asked for, so a course that wants more
   pictures than were kept asks again rather than going without. */
const DB = 'monarchy-bob', STORE = 'rom';
function keyOf(R) { let h = 0; const s = 'sheet1' + JSON.stringify(R.tex) + JSON.stringify(R.sky); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return 'pictures-' + (h >>> 0).toString(36); }
function db() {
  return new Promise((ok, no) => {
    const q = indexedDB.open(DB, 1);
    q.onupgradeneeded = () => q.result.createObjectStore(STORE);
    q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error);
  });
}
/* a transaction over, however it ends: done, failed, or given up (a full disk shows only as an abort) */
const settled = (t, ok) => { t.oncomplete = t.onerror = t.onabort = ok; };
async function keep(out) {
  try {
    const d = await db();
    await new Promise(ok => { const t = d.transaction(STORE, 'readwrite'); settled(t, ok); t.objectStore(STORE).put(out, 'latest'); });
    d.close();
  } catch (e) { /* private window, or storage turned off: it is asked for again next time */ }
}
async function kept(R) {
  try {
    const d = await db();
    const v = await new Promise(ok => {
      const t = d.transaction(STORE), q = t.objectStore(STORE).get('latest');
      q.onsuccess = () => ok(q.result); q.onerror = () => ok(null); t.onabort = () => ok(null);
    });
    d.close();
    return v && v.key === keyOf(R) ? v : null;
  } catch (e) { return null; }
}
async function forget() {
  try {
    const d = await db();
    await new Promise(ok => { const t = d.transaction(STORE, 'readwrite'); settled(t, ok); t.objectStore(STORE).delete('latest'); });
    d.close();
  } catch (e) { /* nothing kept */ }
}

root.BobROM = { fromFile, kept, forget, _: { bigEndian, mio0, decode, sky, sheet, extract, version, keyOf } };

})(window, document);
