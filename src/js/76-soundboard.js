/* ══════════════════════════════════════════════════════════════
   76-soundboard.js — THE GM'S SOUND BOARD, BUILT BY THE GM.

   grumkata: "when i said add a sound board i did NOT mean you set a preset amount
   of sounds, what i meant was the gm can setup sounds for the sound board". The first
   version was eight buttons the app chose. This is the board the GM makes:

     · a pad is a name and the GM's OWN FILE — an mp3, ogg, wav — chosen from their
       computer. (It could once also be one of the app's own sounds — doors, blades,
       spells. The app has no sounds of its own now; see 75-audio.js.)
     · the board is the GM's, on the GM's machine, for every table they run: the
       pads in localStorage, the files in IndexedDB (a file is far too big for the
       small storage a page gets for its saves).
     · pressing a pad plays it here and at every seat. A library sound is sent as its
       name — everybody already has it. A file is sent to the table ONCE, when the
       table is hosted or the pad is added (tables/{word}/pads), and each pad press
       afterwards is only a few bytes naming it, the way the music note is.

   A SOUND ON THE BOARD IS A SHORT ONE. Under 700 KB (about half a minute of mp3), and
   the whole board under 6 MB, because every player downloads it. A song is not a
   sound effect: it goes to the music player.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const KEY = 'monarchy.pads.v1';
const MAX_PADS = 24, MAX_FILE = 700 * 1024, MAX_TOTAL = 6 * 1024 * 1024;

const S = () => root.Session;
const SND = () => root.Sound;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const kb = n => (n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');

let pads = [];                 /* { id, n, f:1, size, dur, vol } */
const data = {};               /* id -> data URL: the GM's own files, once read */
const bufs = {};               /* id -> AudioBuffer */
const heardPads = {};          /* a player's side: id -> { len, buf, p } */
const subs = [];

const uid = () => { let s = ''; while (s.length < 8) s += Math.random().toString(36).slice(2); return s.slice(0, 8).replace(/[^a-z0-9]/g, 'a'); };
const cleanName = (n, fb) => (String(n == null ? '' : n).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 40)) || fb || 'Sound';
const changed = () => subs.slice().forEach(f => { try { f(); } catch (e) {} });

/* ══ WHAT IS KEPT ═════════════════════════════════════════════ */
function load() {
  pads = [];
  try {
    const a = JSON.parse(root.localStorage.getItem(KEY));
    if (Array.isArray(a)) a.forEach(p => {
      /* a pad of one of the app's own sounds (there were such, once) has nothing to play any more */
      if (!p || p.lib || !p.f || typeof p.id !== 'string' || !/^[a-z0-9]{4,16}$/.test(p.id) || typeof p.n !== 'string' || pads.length >= MAX_PADS) return;
      pads.push({ id: p.id, n: cleanName(p.n), f: 1, size: +p.size || 0, dur: +p.dur || 0, vol: clamp(Math.round(+p.vol || 100), 5, 100) });
    });
  } catch (e) { pads = []; }
}
function save() { try { root.localStorage.setItem(KEY, JSON.stringify(pads)); } catch (e) {} }

/* the files: IndexedDB, one record per pad */
let dbP = null;
function db() {
  if (dbP) return dbP;
  dbP = new Promise((res, rej) => {
    let rq;
    try { rq = root.indexedDB.open('monarchy-pads', 1); } catch (e) { return rej(e); }
    rq.onupgradeneeded = () => rq.result.createObjectStore('files');
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error);
  });
  return dbP;
}
const idb = (mode, f) => db().then(d => new Promise((res, rej) => {
  const t = d.transaction('files', mode), r = f(t.objectStore('files'));
  t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
}));
const putFile = (id, url) => idb('readwrite', s => s.put(url, id));
const getFile = id => idb('readonly', s => s.get(id));
const delFile = id => idb('readwrite', s => s.delete(id));

function getData(p) {
  if (data[p.id]) return Promise.resolve(data[p.id]);
  return getFile(p.id).then(u => { if (u) data[p.id] = u; return u || null; }, () => null);
}
function getBuf(p) {
  if (bufs[p.id]) return Promise.resolve(bufs[p.id]);
  return getData(p).then(u => u && SND() ? SND().decodeData(u) : null).then(b => { if (b) bufs[p.id] = b; return b; });
}
const readUrl = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(f); });

/* ══ THE GM'S HANDS ═══════════════════════════════════════════ */
const list = () => pads.map(p => Object.assign({}, p));
const usage = () => ({ count: pads.length, bytes: pads.reduce((n, p) => n + (p.f ? p.size : 0), 0) });

/* adds a pad: { n, vol, file } — answers { pad } or { error } in plain words */
async function add(spec) {
  spec = spec || {};
  if (pads.length >= MAX_PADS) return { error: 'The board holds ' + MAX_PADS + ' sounds at most — take one off first.' };
  const pad = { id: uid(), n: cleanName(spec.n), vol: clamp(Math.round(+spec.vol || 100), 5, 100) };
  if (spec.file) {
    const f = spec.file;
    if (!/^audio\//i.test(f.type || '') && !/\.(mp3|ogg|oga|wav|m4a|aac|flac|opus|webm)$/i.test(f.name || ''))
      return { error: 'That is not a sound file — an mp3, ogg, wav or m4a.' };
    if (f.size > MAX_FILE)
      return { error: 'That file is ' + kb(f.size) + '. A board sound has to be under ' + kb(MAX_FILE) + ', about half a minute of mp3. For a song, use Play as music.' };
    if (usage().bytes + f.size > MAX_TOTAL)
      return { error: 'The board is full of sounds (' + kb(MAX_TOTAL) + '). Take one off first — every player downloads them.' };
    let url, buf;
    try { url = await readUrl(f); } catch (e) { return { error: 'I could not read that file.' }; }
    buf = SND() ? await SND().decodeData(url) : null;
    if (!buf) return { error: 'I could not play that as a sound. Try an mp3 or a wav.' };
    if (!spec.n) pad.n = cleanName(String(f.name || '').replace(/\.[^.]+$/, ''), 'Sound');
    try { await putFile(pad.id, url); } catch (e) { return { error: 'This computer would not keep the file.' }; }
    pad.f = 1; pad.size = f.size; pad.dur = Math.round(buf.duration * 10) / 10;
    data[pad.id] = url; bufs[pad.id] = buf;
  } else return { error: 'Choose a sound for it first.' };
  pads.push(pad); save(); changed();
  if (pad.f) pushOne(pad);
  return { pad: Object.assign({}, pad) };
}
function remove(id) {
  const i = pads.findIndex(p => p.id === id); if (i < 0) return false;
  const p = pads.splice(i, 1)[0];
  delete data[id]; delete bufs[id];
  if (p.f) { delFile(id).catch(() => {}); const s = S(); if (s && s.live && s.role === 'gm' && s.setPad) s.setPad(id, null); }
  save(); changed(); return true;
}
function rename(id, n) { const p = pads.find(x => x.id === id); if (!p) return false; p.n = cleanName(n, p.n); save(); changed(); return true; }
function setVol(id, v) { const p = pads.find(x => x.id === id); if (!p) return false; p.vol = clamp(Math.round(+v || 100), 5, 100); save(); return true; }

/* PRESSED: here, and at every seat */
function fire(id) {
  const p = pads.find(x => x.id === id); if (!p) return false;
  const v = p.vol / 100, s = S();
  getBuf(p).then(b => { if (b && SND()) SND().playBuf(b, v); });
  if (s && s.live && s.sendFx) s.sendFx('pad:' + p.id, v);
  return true;
}
/* a pad's sound by itself, to hear what you are adding */
function audition(id) {
  const p = pads.find(x => x.id === id); if (!p) return;
  getBuf(p).then(b => { if (b && SND()) SND().playBuf(b, p.vol / 100); });
}

/* ══ TO THE TABLE ═════════════════════════════════════════════ */
function pushOne(p) {
  const s = S(); if (!s || !s.live || s.role !== 'gm' || !s.setPad) return Promise.resolve(false);
  return getData(p).then(d => d ? s.setPad(p.id, { n: p.n, d }) : false);
}
/* every file pad, to a table that has just been hosted */
function sync() {
  const s = S(); if (!s || !s.live || s.role !== 'gm' || !s.setPads) return Promise.resolve(false);
  return Promise.all(pads.filter(p => p.f).map(p => getData(p).then(d => d ? [p, d] : null))).then(got => {
    const all = {}; got.forEach(g => { if (g) all[g[0].id] = { n: g[0].n, d: g[1] }; });
    return s.setPads(all);
  });
}
/* a player's side: what the GM's table holds is decoded ahead, so the press is instant */
function hear(node) {
  const ids = node && typeof node === 'object' ? Object.keys(node) : [];
  Object.keys(heardPads).forEach(id => { if (ids.indexOf(id) < 0) delete heardPads[id]; });
  ids.forEach(id => {
    const d = node[id] && node[id].d;
    if (typeof d !== 'string' || !/^[a-z0-9]{4,16}$/.test(id)) return;
    if (heardPads[id] && heardPads[id].len === d.length) return;
    const h = heardPads[id] = { len: d.length, buf: null, p: null };
    h.p = SND() ? SND().decodeData(d).then(b => { h.buf = b; return b; }) : Promise.resolve(null);
  });
}
function playRemote(id, v) {
  const h = heardPads[id]; if (!h || !SND()) return;
  (h.buf ? Promise.resolve(h.buf) : h.p).then(b => { if (b) SND().playBuf(b, v); });
}
/* ready the GM's own files before they are needed */
function warm() { pads.filter(p => p.f).forEach(p => { getBuf(p).catch(() => {}); }); }

/* THE GM PRESSED A PAD: only a pad this table holds, only if it is fresh (a client that sits
   down late is handed the last press and must not replay it), only once, and not at the GM's
   own machine, which played it as it was pressed */
let lastFx = '';
function heardFx(f) {
  if (!f || typeof f !== 'object' || typeof f.id !== 'string') return;
  const m = /^pad:([a-z0-9]{4,16})$/.exec(f.id); if (!m) return;
  if (f.n === lastFx) return;
  lastFx = f.n;
  if (!(root.Net && root.Net.ageOf) || root.Net.ageOf(f.at) > 3000) return;
  if (S() && S().role === 'gm') return;
  playRemote(m[1], typeof f.v === 'number' ? clamp(f.v, 0, 1) : 1);
}

function mount() {
  load();
  root.addEventListener('monarchy:session', e => {
    const d = e.detail || {};
    if (d.what === 'fx') heardFx(d.fx);
    else if (d.what === 'pads') hear(d.pads);
    else if (d.what === 'hosting') sync();
    else if (d.what === 'left' || d.what === 'closed') Object.keys(heardPads).forEach(id => { delete heardPads[id]; });
  });
}
if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', mount);
else mount();

root.Pads = { list, usage, add, remove, rename, setVol, fire, audition, sync, hear, playRemote, warm,
              onChange: f => { subs.push(f); },
              limits: { pads: MAX_PADS, file: MAX_FILE, total: MAX_TOTAL } };

})(window, document);
