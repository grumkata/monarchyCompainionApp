/* ══════════════════════════════════════════════════════════════
   47-hand.js — THE BAR, THE TRAY, AND WHAT IS IN YOUR HAND.

   grumkata, on the first version of this:

     "when taking an item from the toolbox you should select an
      object generalization then get a list of options + custom
      option and from there you place it — instead you have it in a
      very weird way, better but weird"

   So it is two steps, and they are the two steps a toolbox has:

     THE PLANK holds the KINDS. Scenes, people, art, models, papers.
     Six things, always the same six, so your hand learns where they
     are.

     THE TRAY opens above it holding the actual OPTIONS of that
     kind — every character you have made, every picture in the app,
     every model, each drawn as itself — and it ENDS in a custom
     slot: a picture off your own machine, an NPC you invent, a
     formation. That is the "+ custom option".

   Then you are holding it, and putting it down is one click on the
   wood. Three things make the holding work:

   1. THE HELD THING IS IN THE TABLE, NOT ON THE SCREEN. It is a
      real .prop inside #tbl, so the browser's own perspective draws
      it — correct through pan, zoom and tilt for free. Its position
      comes from inverting the pointer onto the wood with
      Table3D.screenToTable.

   2. ITS SHADOW IS A SECOND OBJECT LYING ON THE BOARDS. Height is
      the gap between a thing and its shadow.

   3. WHAT CAN STILL BE DECIDED IS DECIDED IN THE HAND. A
      battlefield's width cycles on the wheel and the board gets
      wider as you watch; a counter's side flips; an NPC's name,
      hit points and face are set in the maker beside it, live.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const T = () => root.TableModel;
const D = () => root.Table3D;
const F = () => root.Figures;

const esc = s => String(s == null ? '' : s)
  .replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

let bar = null, rack = null, slots = null, tip = null, tray = null, trayIn = null;
let shelf = null, tabs = null, find = null, count = null;
let held = null;             /* { offer, variant, vi } */
let kinds = [], sel = 0, openKind = null, opts = [];

/* ══ THE FURNITURE ════════════════════════════════════════════ */
function build() {
  if (bar) return bar;
  bar = doc.createElement('div');
  bar.className = 'hb';
  bar.innerHTML =
    `<div class="hb-tip" id="hb-tip"></div>
     <div class="hb-rack" id="hb-rack" hidden></div>
     <div class="hb-tray" id="hb-tray" hidden>
       <div class="hb-shelf" id="hb-shelf" hidden>
         <div class="hb-tabs" id="hb-tabs"></div>
         <label class="hb-find"><input id="hb-q" type="search" placeholder="Find\u2026"
                                       autocomplete="off" spellcheck="false"></label>
         <span class="hb-count" id="hb-count"></span>
       </div>
       <div class="hb-tray-in" id="hb-tray-in"></div>
     </div>
     <div class="hb-row"><div class="hb-slots" id="hb-slots"></div></div>`;
  doc.body.appendChild(bar);
  rack   = bar.querySelector('#hb-rack');
  slots  = bar.querySelector('#hb-slots');
  tip    = bar.querySelector('#hb-tip');
  tray   = bar.querySelector('#hb-tray');
  trayIn = bar.querySelector('#hb-tray-in');
  shelf  = bar.querySelector('#hb-shelf');
  tabs   = bar.querySelector('#hb-tabs');
  find   = bar.querySelector('#hb-q');
  count  = bar.querySelector('#hb-count');
  /* typing in the box must never reach the table's own key handling — B
     would shut the chest under your fingers halfway through a word */
  find.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); find.value = ''; paintTray(); }
  });
  find.addEventListener('input', () => { q = find.value.trim(); paintTray(true); });

  bar.addEventListener('pointerdown', e => e.stopPropagation());
  /* the wheel over the bar belongs to the bar: it cycles what you are
     holding, or scrolls the tray, and NEVER zooms the table underneath */
  bar.addEventListener('wheel', e => {
    if (held) { e.preventDefault(); e.stopPropagation(); cycle(e.deltaY > 0 ? 1 : -1); return; }
    if (tray.contains(e.target) && trayIn.scrollHeight > trayIn.clientHeight) {
      e.stopPropagation(); return;                 /* let the tray scroll itself */
    }
    e.preventDefault(); e.stopPropagation();
    step(e.deltaY > 0 ? 1 : -1);
  }, { passive: false });
  return bar;
}

function show(list, openId) {
  build();
  kinds = list.slice();
  sel = 0; openKind = null;
  paintKinds(); shutTray();
  bar.classList.add('up');
  /* the bin comes up with its own tray already open — there is only one kind
     of thing in a bin and making you press it first is a step for nothing */
  if (openId) {
    const n = kinds.findIndex(k => k.id === openId);
    if (n >= 0) { sel = n; pickKind(kinds[n]); }
  }
}

function hide() {
  if (!bar) return;
  bar.classList.remove('up');
  shutTray(); say('');
}
const isUp = () => !!bar && bar.classList.contains('up');

/* ── the plank ── */
function paintKinds() {
  slots.innerHTML = kinds.map((k, n) =>
    `<button class="hb-slot" data-n="${n}">
       <span class="hb-fig">${F().html(k.fig, k.figv || {}, 62)}</span>
       <i class="hb-key">${n + 1}</i>
     </button>`).join('');
  slots.querySelectorAll('.hb-slot').forEach(b => {
    const k = kinds[+b.dataset.n];
    b.addEventListener('pointerenter', () => say(k.name));
    b.addEventListener('pointerleave', () => say(held ? held.offer.name : ''));
    b.addEventListener('click', () => { sel = +b.dataset.n; pickKind(k); });
  });
  markSel();
}
function markSel() {
  slots.querySelectorAll('.hb-slot').forEach((b, n) =>
    b.classList.toggle('on', n === sel && !!openKind));
}
function step(d) {
  if (!kinds.length) return;
  sel = (sel + d + kinds.length) % kinds.length;
  pickKind(kinds[sel]);
}

/* ── the tray ── */
function pickKind(k) {
  if (!k) return;
  if (openKind && openKind.id === k.id) { shutTray(); return; }
  openKind = k;
  opts = root.Toolbox.options(k.id) || [];
  q = ''; gsel = '';
  if (find) find.value = '';
  paintTray();
  tray.hidden = false;
  markSel(); say(k.name);
}
function shutTray() {
  openKind = null; opts = []; q = ''; gsel = '';
  if (tray) { tray.hidden = true; trayIn.innerHTML = ''; }
  if (shelf) shelf.hidden = true;
  markSel();
}

/* ══ THE SHELF ═════════════════════════════════════════════════
   grumkata: "for art when selecting it some of it can be cutoff ALSO as we go
   on art and models will get more and more so the current setup wont work",
   and "generally using the toolbox ui is clunky to impossible most times".

   Both are the same fault. The tray was one flat wrap of 66px squares with a
   hard 212px ceiling on it, which is fine for the three kinds of note and
   hopeless the moment a list is a hundred and fourteen models long: no way to
   say what you are looking for, no way to say which shelf to look on, and the
   bottom two rows simply cut off.

   So a tray with more than a plank's worth in it becomes a SHELF: the groups
   the library already keeps, as tabs; a box to type into; a count so you know
   what you are looking at; and tiles big enough to be a picture of the thing
   with its name under it. Under that threshold nothing changes — three notes
   do not need a search box, and adding one would be the website UI this
   whole bar exists to stop being. */
const SHELF_AT = 14;
let q = '', gsel = '';

function groupsOf(list) {
  const seen = [], by = {};
  list.forEach(o => {
    const id = o.g || '';
    if (!id) return;
    if (!by[id]) { by[id] = 0; seen.push({ id: id, name: o.gn || id }); }
    by[id]++;
  });
  seen.forEach(g => { g.n = by[g.id]; });
  return seen;
}

/* what survives the tabs and the typing. A custom slot ("a picture off your
   machine", "someone else") is never filtered away — it is the way to make a
   thing that is not in the list yet, which is exactly what you want when the
   list did not have it. */
function shown() {
  const needle = q.toLowerCase();
  return opts.filter(o => {
    if (o.custom) return !gsel || (o.g || '') === gsel;
    if (gsel && (o.g || '') !== gsel) return false;
    if (!needle) return true;
    return (o.name || '').toLowerCase().indexOf(needle) >= 0
        || (o.gn || '').toLowerCase().indexOf(needle) >= 0;
  });
}

function paintTray(keepFocus) {
  const gs = groupsOf(opts);
  const browse = opts.length > SHELF_AT;
  tray.classList.toggle('browse', browse);
  shelf.hidden = !browse;

  if (browse) {
    tabs.innerHTML = [{ id: '', name: 'All', n: opts.length }].concat(gs).map(g =>
      `<button class="hb-tab${g.id === gsel ? ' on' : ''}" data-g="${g.id}"
       >${esc(g.name)}<i>${g.n}</i></button>`).join('');
    tabs.querySelectorAll('.hb-tab').forEach(b =>
      b.addEventListener('click', () => {
        gsel = b.dataset.g; paintTray(true);
        trayIn.scrollTop = 0;
      }));
  }

  const list = shown();
  if (browse) count.textContent = list.length + (list.length === 1 ? ' thing' : ' things');

  /* A CUSTOM SLOT STILL SHOWS THE THING IT MAKES — an enemy counter for
     someone else, an empty picture for one off your machine — with a small
     brass plus over it. A slot holding only a "+" is a menu item again. */
  trayIn.innerHTML = list.length ? list.map(o =>
    `<button class="hb-opt${o.custom ? ' custom' : ''}" data-id="${esc(optKey(o))}">
       <span class="hb-fig">${F().html(o, o.v || {}, browse ? 84 : 54)}</span>
       ${o.custom ? '<span class="hb-plus"></span>' : ''}
       ${browse ? `<i class="hb-nm">${esc(o.name || '')}</i>` : ''}
     </button>`).join('')
    : `<p class="hb-nowt">Nothing here by that name.</p>`;

  trayIn.querySelectorAll('.hb-opt').forEach(b => {
    const o = list.find(x => optKey(x) === b.dataset.id);
    if (!o) return;
    b.addEventListener('pointerenter', () => say(o.name));
    b.addEventListener('pointerleave', () => say(held ? held.offer.name : ''));
    b.addEventListener('click', () => take(o));
  });
  if (keepFocus && browse && doc.activeElement !== find) { /* typing keeps its place */ }
}
const optKey = o => o.id || ('custom:' + o.custom);

/* the tray is rebuilt when what is IN it changes under you — a picture you
   just added, a character you just made */
function refresh() { if (openKind) { opts = root.Toolbox.options(openKind.id) || []; paintTray(); } }

function say(t) { if (tip) { tip.textContent = t || ''; tip.classList.toggle('on', !!t); } }

/* ══ VARIANTS, IN THE HAND ════════════════════════════════════ */
function startVariant(o) {
  const d = F().variantsFor(o);
  const base = Object.assign({}, o.v || {});
  if (d && d.list) Object.assign(base, d.list[d.start || 0]);
  return base;
}
function cycle(d) {
  if (!held) return;
  const def = F().variantsFor(held.offer);
  if (!def || !def.list) return;
  held.vi = (held.vi + d + def.list.length) % def.list.length;
  Object.assign(held.variant, def.list[held.vi]);
  say(def.list[held.vi].name);
  paintRack(); paintHeld();
}
function paintRack() {
  if (!rack) return;
  const def = held && F().variantsFor(held.offer);
  if (!def || !def.list) { rack.hidden = true; rack.innerHTML = ''; return; }
  rack.hidden = false;
  rack.innerHTML = def.list.map((v, n) =>
    `<button class="hb-var${n === held.vi ? ' on' : ''}" data-v="${n}">
       ${F().html(held.offer, Object.assign({}, held.variant, v), 54)}</button>`).join('');
  rack.querySelectorAll('[data-v]').forEach(b =>
    b.addEventListener('click', () => {
      held.vi = +b.dataset.v;
      Object.assign(held.variant, def.list[held.vi]);
      paintRack(); paintHeld();
    }));
}

/* ══ TAKING ONE OUT ═══════════════════════════════════════════ */
function take(o) {
  if (!o) return;
  if (o.act === 'open')  { if (root.Papers) root.Papers.pick(); return; }
  if (o.act === 'unbin') { T().unbin(o.ref); refresh(); return; }

  /* ── THE CUSTOM SLOT ──────────────────────────────────────
     Asked for at the moment you reach for it, never after you have put
     something down. A picture is chosen off your machine and kept in the
     library so it is there next time; a person you invent is built beside
     the counter while you carry it. */
  if (o.custom === 'picture') {
    root.Pictures.ask(pic => {
      if (!pic) return;
      const kept = root.Library.art.add({ name: pic.name, src: pic.src,
                                          w: pic.w, h: pic.h });
      refresh();
      grab(Object.assign({}, o, { custom: false, name: pic.name,
                                  kind: o.kind || 'art',
                                  v: { src: pic.src, w: pic.w, h: pic.h, art: kept.id } }));
    });
    return;
  }
  if (o.custom === 'npc' || o.custom === 'form') {
    grab(root.Toolbox.blankToken(o.custom));
    if (root.TokenMaker) root.TokenMaker.open(held, () => { paintHeld(); paintRack(); });
    return;
  }
  grab(o);
  /* a person you invented keeps its maker open while you carry it */
  if (o.make && root.TokenMaker) root.TokenMaker.open(held, () => { paintHeld(); paintRack(); });
}

function grab(o) {
  const def = F().variantsFor(o);
  held = { offer: o, variant: startVariant(o),
           vi: def && def.list ? (def.start || 0) : -1 };
  doc.body.classList.add('holding');
  say(o.name);
  paintRack(); makeHeld(); paintHeld();
}

/* ══ WHAT YOU ARE HOLDING ═════════════════════════════════════ */
let ghost = null, shade = null, float_ = null;
function makeHeld() {
  const tbl = doc.getElementById('tbl');
  if (!tbl) return;
  killHeld();
  shade = doc.createElement('div');
  shade.className = 'prop hand-shade';
  shade.dataset.z = 1; shade.dataset.r = 0;
  tbl.appendChild(shade);
  ghost = doc.createElement('div');
  ghost.className = 'prop hand-hold';
  ghost.dataset.z = 150; ghost.dataset.r = 0;
  tbl.appendChild(ghost);
  float_ = doc.createElement('div');
  float_.className = 'hand-float';
  doc.body.appendChild(float_);
}
function killHeld() {
  [ghost, shade].forEach(e => { if (e && e.parentNode) e.parentNode.removeChild(e); });
  if (float_ && float_.parentNode) float_.parentNode.removeChild(float_);
  ghost = shade = float_ = null;
}

function paintHeld() {
  if (!held || !ghost) return;
  /* A COUNTER IN YOUR HAND WEARS ITS BASE PLATE, because the one that lands
     does — and "what you were holding is what lands" is the whole promise. */
  if (held.offer.kind === 'token') {
    held.variant.plate = held.variant.name || held.offer.name || '';
    /* AND IT STANDS UP IN YOUR HAND. The piece that lands is a real standing
       figure; a flat disc hovering over the wood and then a figure appearing
       when you let go is the same broken promise in the other direction. */
    held.variant.stand = true;
  }
  const sz = F().sizeOf(held.offer, held.variant);
  ghost.innerHTML =
    `<div class="face hh-face" style="width:${sz.w}px;height:${sz.h}px">
       ${F().html(held.offer, held.variant, Math.min(sz.w, sz.h) * 0.96)}
     </div>`;
  shade.innerHTML =
    `<div class="face hh-shade" style="width:${sz.w}px;height:${sz.h}px"></div>`;
  if (float_) float_.innerHTML = F().html(held.offer, held.variant, 74);
  at(last.x, last.y);
}

let last = { x: -1, y: -1 };
function at(sx, sy) {
  if (!held || !ghost) return;
  last = { x: sx, y: sy };
  const vp = doc.getElementById('vp');
  if (!vp || sx < 0) return;
  const r = vp.getBoundingClientRect();
  const over = sx >= r.left && sx <= r.right && sy >= r.top && sy <= r.bottom
               && !overBar(sx, sy);
  ghost.style.display = shade.style.display = over ? '' : 'none';
  float_.style.display = over ? 'none' : '';
  if (!over) { float_.style.left = sx + 'px'; float_.style.top = sy + 'px'; return; }

  const sz = F().sizeOf(held.offer, held.variant);
  /* A SCENE DOES NOT GO WHERE YOU POINT. It is fitted to the slab and pinned
     there the moment it is made, so while you hold one it already sits where
     it is going to land — you are looking at the answer, not a promise. */
  let x, y;
  if (held.offer.kind === 'scene') {
    x = Math.round((D().TW - sz.w) / 2);
    y = Math.round((D().TH - sz.h) / 2);
  } else {
    const p = D().screenToTable(sx, sy);
    x = Math.round(p.x - sz.w / 2);
    y = Math.round(p.y - sz.h / 2);
  }
  ghost.dataset.x = shade.dataset.x = x;
  ghost.dataset.y = shade.dataset.y = y;
  D().place(ghost); D().place(shade);
}

const overBar = (x, y) => {
  if (!isUp()) return false;
  for (const el of [tray, rack, bar.querySelector('.hb-row'),
                    root.TokenMaker && root.TokenMaker.el()]) {
    if (!el || el.hidden) continue;
    const r = el.getBoundingClientRect();
    if (!r.width) continue;
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return true;
  }
  return false;
};

/* ══ PUTTING IT DOWN ══════════════════════════════════════════ */
function put(sx, sy) {
  if (!held) return false;
  const p = D().screenToTable(sx, sy);
  const o = held.offer, v = held.variant, vi = held.vi;
  drop();
  root.Toolbox.take(o, p.x, p.y, v);
  /* Mario Maker does not make you go back to the palette between bricks. You
     are still holding one — unless it was a scene, and one of those is a
     whole evening rather than a brick. */
  if (o.kind !== 'scene' && o.act !== 'make') { grab(o); held.variant = v; held.vi = vi;
                                                paintRack(); paintHeld(); }
  return true;
}

function drop() {
  held = null;
  doc.body.classList.remove('holding');
  killHeld(); paintRack(); say('');
  if (root.TokenMaker) root.TokenMaker.close();
}

/* ══ WIRING ═══════════════════════════════════════════════════ */
function mount() {
  build();

  /* A MODEL'S PREVIEW IS THE MODEL, and a data URI decodes on its own time.
     The first tray of models is drawn before any of their textures have
     landed; this repaints it the moment they have, so the slots fill in
     rather than staying blank for the life of the session. */
  if (root.TableGL && root.TableGL.onTextures) {
    root.TableGL.onTextures(() => { refresh(); if (isUp()) paintKinds(); });
  }

  /* CAPTURE, because #vp's own pointerdown starts a pan and would eat the
     click that puts the thing down */
  doc.addEventListener('pointerdown', e => {
    if (!held) return;
    if (overBar(e.clientX, e.clientY)) return;
    const vp = doc.getElementById('vp');
    if (!vp || vp.hidden) return;
    const r = vp.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right ||
        e.clientY < r.top  || e.clientY > r.bottom) return;
    if (e.button === 2) { e.preventDefault(); e.stopPropagation(); drop(); return; }
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    put(e.clientX, e.clientY);
  }, true);

  doc.addEventListener('pointermove', e => { if (held) at(e.clientX, e.clientY); });
  doc.addEventListener('contextmenu', e => { if (held) { e.preventDefault(); drop(); } });

  doc.addEventListener('wheel', e => {
    if (!held) return;
    if (bar && bar.contains(e.target)) return;      /* the bar handles its own */
    e.preventDefault(); e.stopPropagation();
    cycle(e.deltaY > 0 ? 1 : -1);
  }, { capture: true, passive: false });

  doc.addEventListener('keydown', e => {
    const el = doc.activeElement, tag = el && el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
        (el && el.isContentEditable)) return;
    if (e.key === 'Escape' && held) { e.preventDefault(); drop(); return; }
    if (!isUp()) return;
    if (e.key >= '1' && e.key <= '9') {
      const n = +e.key - 1;
      if (n < kinds.length) { e.preventDefault(); sel = n; pickKind(kinds[n]); }
      return;
    }
    if (e.key === 'ArrowRight') { e.preventDefault(); held ? cycle(1)  : step(1); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); held ? cycle(-1) : step(-1); }
  });

  root.addEventListener('resize', () => { if (held) at(last.x, last.y); });
}

/* the table pans and zooms without telling anyone; re-place each frame */
function follow() {
  requestAnimationFrame(follow);
  if (held && ghost && last.x >= 0) at(last.x, last.y);
}
requestAnimationFrame(follow);

root.Hand = { mount, show, hide, isUp, take, grab, drop, put, refresh, say,
              repaint: () => { paintHeld(); paintRack(); },
              get held() { return held; },
              get tray() { return openKind; } };

})(window, document);
