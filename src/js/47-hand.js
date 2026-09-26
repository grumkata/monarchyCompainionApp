/* ══════════════════════════════════════════════════════════════
   47-hand.js — THE TOOLBOX, AND WHAT IS IN YOUR HAND.

   grumkata, 2026-09-25: "remove the physical toolbox and bin they
   look mid", and "we need the ability to add things to the table to
   be more custmisable BEFORE Placing them".

   The case used to be the chest's open lid: a band across the bottom
   of the screen, the height of half the table, sitting on top of the
   wood you were trying to put things on. It is a DOCK now, at your
   left hand, the full height of the screen and only as wide as it
   needs to be — the table stays in view beside it, which is where you
   are going to put whatever you take out.

     THE KINDS   the same six, as tabs across the top: each drawn as a
                 real member of itself, each keyed 1-6.
     THE SHELF   the library's own groups as pennons, and a find well,
                 for the kinds that run to a hundred things.
     THE GRID    the things themselves, each drawn as itself with its
                 name under it.
     THE BENCH   choose one and you are not holding it yet: its
                 workbench opens in the dock (66-workbench.js), with the
                 thing large and every choice it has beside it. Take it
                 from there and it is in your hand over the wood.

   Two short-cuts for when you know what you want: DOUBLE-CLICK a tile
   to take it as it is, or DRAG it straight onto the wood.

   What is in your hand is still a real .prop inside #tbl, drawn by the
   browser's own perspective, with its shadow lying on the boards — the
   part of the old bar that was right, kept exactly.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const T = () => root.TableModel;
const D = () => root.Table3D;
const F = () => root.Figures;

const esc = s => String(s == null ? '' : s)
  .replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

let dock = null, kindsEl = null, shelf = null, find = null, grid = null, bench = null;
let foot = null, what = null, count = null, pill = null;
let held = null;             /* { offer, variant, vi } */
let kinds = [], sel = 0, openKind = null, opts = [];
let q = '', gsel = '';

/* ══ THE DOCK ═════════════════════════════════════════════════ */
function build() {
  if (dock) return dock;
  dock = doc.createElement('aside');
  dock.className = 'tbx';
  dock.id = 'tbx';
  dock.hidden = true;
  dock.innerHTML =
    `<header class="tbx-head">
       <span class="tbx-what" id="tbx-what">Toolbox</span>
       <span class="tbx-count" id="tbx-count"></span>
       <button class="tbx-x" id="tbx-x" title="Close the toolbox  (B)">&#10005;</button>
     </header>
     <nav class="tbx-kinds" id="tbx-kinds"></nav>
     <div class="tbx-shelf" id="tbx-shelf">
       <label class="tbx-find"><input id="tbx-q" type="search" placeholder="Find&hellip;"
              autocomplete="off" spellcheck="false"></label>
       <div class="tbx-tabs" id="tbx-tabs"></div>
     </div>
     <div class="tbx-grid" id="tbx-grid"></div>
     <section class="tbx-bench" id="tbx-bench" hidden></section>
     <footer class="tbx-foot" id="tbx-foot"></footer>
     <div class="tbx-drop"><span>Let go to put it away</span></div>`;
  doc.body.appendChild(dock);
  kindsEl = dock.querySelector('#tbx-kinds');
  shelf   = dock.querySelector('#tbx-shelf');
  find    = dock.querySelector('#tbx-q');
  grid    = dock.querySelector('#tbx-grid');
  bench   = dock.querySelector('#tbx-bench');
  foot    = dock.querySelector('#tbx-foot');
  what    = dock.querySelector('#tbx-what');
  count   = dock.querySelector('#tbx-count');
  dock.querySelector('#tbx-x').addEventListener('click', () => {
    if (root.Toolbox) root.Toolbox.shut();
  });
  /* typing in the box must never reach the table's own key handling — B
     would shut the box under your fingers halfway through a word */
  find.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); find.value = ''; q = ''; paintGrid(); find.blur(); }
  });
  find.addEventListener('input', () => { q = find.value.trim(); paintGrid(); });

  /* the dock is a control, never the table: nothing pressed on it pans, and
     the wheel over it scrolls it rather than zooming the wood beneath */
  dock.addEventListener('pointerdown', e => e.stopPropagation());
  dock.addEventListener('wheel', e => e.stopPropagation(), { passive: true });

  pill = doc.createElement('div');
  pill.className = 'tbx-pill';
  pill.hidden = true;
  doc.body.appendChild(pill);
  return dock;
}

function show(list, openId) {
  build();
  kinds = list.slice();
  dock.hidden = false;
  docked(true);
  paintKinds();
  /* it opens ON something — the first kind, or the one asked for */
  const n = openId ? Math.max(0, kinds.findIndex(k => k.id === openId)) : sel;
  pickKind(kinds[Math.min(n, kinds.length - 1)] || kinds[0]);
  paintFoot();
}

function hide() {
  if (!dock) return;
  closeBench();
  dock.hidden = true;
  docked(false);
}

/* THE DOCK NARROWS THE TABLE'S VIEW (14-war.css), which changes #vp without
   the window changing — so the table is told, the same way a window resize
   tells it, and keeps what you were looking at in the middle of what is left */
function docked(on) {
  const was = doc.body.classList.contains('tbx-on');
  doc.body.classList.toggle('tbx-on', !!on);
  if (was !== !!on) root.dispatchEvent(new Event('resize'));
}
const isUp = () => !!dock && !dock.hidden;

/* ── the kinds ── */
function paintKinds() {
  kindsEl.innerHTML = kinds.map((k, n) =>
    `<button class="tbx-kind" data-n="${n}" title="${esc(k.name)}  (${n + 1})">
       <span class="tbx-kfig">${F().html(k.fig, k.figv || {}, 40)}</span>
       <b>${esc(k.name)}</b>
     </button>`).join('');
  kindsEl.querySelectorAll('.tbx-kind').forEach(b =>
    b.addEventListener('click', () => { sel = +b.dataset.n; pickKind(kinds[sel]); }));
  markSel();
}
function markSel() {
  kindsEl && kindsEl.querySelectorAll('.tbx-kind').forEach((b, n) =>
    b.classList.toggle('on', !!openKind && kinds[n] && kinds[n].id === openKind.id));
}
function step(d) {
  if (!kinds.length) return;
  sel = (sel + d + kinds.length) % kinds.length;
  pickKind(kinds[sel]);
}

function pickKind(k) {
  if (!k) return;
  closeBench();
  openKind = k;
  sel = Math.max(0, kinds.indexOf(k));
  opts = root.Toolbox.options(k.id) || [];
  q = ''; gsel = '';
  if (find) find.value = '';
  what.textContent = k.name;
  paintGrid();
  markSel();
}

/* ══ THE SHELF ═════════════════════════════════════════════════
   Groups the library already keeps, as pennons; a find well; a count.
   A small kind — three notes — gets neither, because a search box over
   three things is a form, not a toolbox. */
const SHELF_AT = 10;
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
/* a custom tile ("a new person", "a picture from your computer") is never
   filtered away — it is the way to make the thing the list did not have */
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

function paintGrid() {
  const gs = groupsOf(opts);
  const big = opts.length > SHELF_AT;
  shelf.hidden = !(big || gs.length > 1);
  shelf.classList.toggle('findable', big);
  const tabs = dock.querySelector('#tbx-tabs');
  tabs.innerHTML = gs.length > 1
    ? [{ id: '', name: 'All', n: opts.length }].concat(gs).map(g =>
        `<button class="tbx-tab${g.id === gsel ? ' on' : ''}" data-g="${esc(g.id)}"
         >${esc(g.name)}<i>${g.n}</i></button>`).join('')
    : '';
  tabs.querySelectorAll('.tbx-tab').forEach(b =>
    b.addEventListener('click', () => { gsel = b.dataset.g; paintGrid(); grid.scrollTop = 0; }));

  const list = shown();
  count.textContent = list.length ? String(list.length) : '';
  grid.innerHTML = list.length ? list.map(o =>
    `<button class="tbx-tile${o.custom ? ' custom' : ''}" data-id="${esc(optKey(o))}"
             title="${esc(o.name || '')}">
       <span class="tbx-fig">${F().html(o, o.v || {}, 88)}</span>
       ${o.custom ? '<span class="tbx-plus"></span>' : ''}
       <i class="tbx-nm">${esc(o.name || '')}</i>
     </button>`).join('')
    : `<p class="tbx-none">Nothing here by that name.</p>`;
  grid.querySelectorAll('.tbx-tile').forEach(b => {
    const o = list.find(x => optKey(x) === b.dataset.id);
    if (o) wireTile(b, o);
  });
}
const optKey = o => o.id || ('custom:' + o.custom);

/* the shelf is rebuilt when what is IN it changes under you — a picture you
   just added, a character you just made — but never under an open bench */
function refresh() {
  if (!openKind || !isUp()) return;
  opts = root.Toolbox.options(openKind.id) || [];
  if (bench && !bench.hidden) return;
  paintGrid();
}

/* ══ A TILE: CHOOSE IT, DOUBLE-CLICK IT, OR DRAG IT OUT ════════ */
function wireTile(b, o) {
  let down = null;
  b.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    down = { x: e.clientX, y: e.clientY, id: e.pointerId, dragged: false };
  });
  b.addEventListener('pointermove', e => {
    if (!down || down.dragged) return;
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) < 8) return;
    /* DRAGGED OUT: straight into your hand, as it is. Only what can be
       put down as it stands — a custom tile has to be made first. */
    if (o.custom || o.act === 'open' || (o.act === 'make' && o.kind === 'scene')) return;
    down.dragged = true;
    grab(o, true);
    at(e.clientX, e.clientY);
  });
  b.addEventListener('pointerup', () => { down = null; });
  b.addEventListener('click', e => {
    if (e.detail > 1) return;               /* the second of a double click */
    choose(o);
  });
  b.addEventListener('dblclick', () => quick(o));
  b.addEventListener('pointerenter', () => tipOn(b, o.name));
  b.addEventListener('pointerleave', tipOff);
}

/* ONE CLICK OPENS THE BENCH. Everything the thing can be, decided while
   you look at it — before it is anywhere. */
function choose(o) {
  if (!o) return;
  if (o.act === 'open') { if (root.Papers) root.Papers.pick(); return; }
  if (o.custom === 'picture') {
    root.Pictures.ask(pic => {
      if (!pic) return;
      const kept = root.Library.art.add({ name: pic.name, src: pic.src, w: pic.w, h: pic.h });
      opts = root.Toolbox.options(openKind.id) || [];
      openBench(Object.assign({}, o, { custom: false, id: 'art:' + kept.id, name: pic.name,
        kind: 'art', v: { src: pic.src, w: pic.w, h: pic.h, art: kept.id } }));
    });
    return;
  }
  if (o.custom === 'npc' || o.custom === 'form') { openBench(root.Toolbox.blankToken(o.custom)); return; }
  openBench(o);
}

/* DOUBLE-CLICK TAKES IT AS IT IS, the way a palette works when you know
   what you want. A scene is set straight down; anything else is in your hand. */
function quick(o) {
  if (!o || o.custom || o.act === 'open') return;
  closeBench();
  if (o.act === 'make' && o.kind === 'scene') {
    root.Toolbox.take(o, null, null, Object.assign({}, o.v || {}));
    return;
  }
  grab(o);
}

/* ══ THE BENCH ═════════════════════════════════════════════════ */
function openBench(o) {
  if (!root.Workbench) { grab(o); return; }
  build();
  grid.hidden = true; shelf.hidden = true;
  bench.hidden = false;
  dock.classList.add('benching');
  root.Workbench.open(bench, { offer: o }, {
    take: (offer, v) => grab(offer, false, v),
    place: (offer, v) => {
      drop();
      const at = D() ? D().middle() : null;
      root.Toolbox.take(offer, at && at.x, at && at.y, v);
    },
    back: () => closeBench(true),
    changed: () => { if (held) { paintHeld(); paintFoot(); } }
  });
}
/* the same bench, for a thing already on the wood (67-inspector.js) */
function editThing(id) {
  if (!root.Workbench) return;
  if (!isUp() && root.Toolbox) root.Toolbox.open();
  build();
  grid.hidden = true; shelf.hidden = true;
  bench.hidden = false;
  dock.classList.add('benching');
  root.Workbench.open(bench, { id: id }, { back: () => closeBench(true) });
}
function closeBench(repaint) {
  if (!bench || bench.hidden) return;
  if (root.Workbench) root.Workbench.close();
  bench.hidden = true; bench.innerHTML = '';
  dock.classList.remove('benching');
  grid.hidden = false;
  if (repaint && openKind) { opts = root.Toolbox.options(openKind.id) || []; paintGrid(); }
  else shelf.hidden = !(opts.length > SHELF_AT || groupsOf(opts).length > 1);
}

/* ── the name of whatever you point at, once, beside it ── */
let tip = null;
function tipOn(el, text) {
  if (!text) return;
  if (!tip) { tip = doc.createElement('div'); tip.className = 'tbx-tip'; doc.body.appendChild(tip); }
  const r = el.getBoundingClientRect();
  tip.textContent = text;
  tip.style.left = Math.round(r.right + 8) + 'px';
  tip.style.top = Math.round(r.top + r.height / 2) + 'px';
  tip.classList.add('on');
}
function tipOff() { if (tip) tip.classList.remove('on'); }
function say(t) { /* the old bar's tip; the dock's foot says it now */ paintFoot(t); }

/* ══ THE FOOT, AND THE PILL ═════════════════════════════════════
   What is in your hand and what the pointer will do. In the dock's foot,
   and — because your eyes are on the wood, not on the dock — in a pill at
   the bottom of the table while you carry it. */
function paintFoot(extra) {
  if (!foot) return;
  if (!held) {
    foot.innerHTML = extra ? esc(extra)
      : 'Choose something to set it up &middot; double-click to take it as it is &middot; drag it onto the table';
    if (pill) pill.hidden = true;
    return;
  }
  const def = F().variantsFor(held.offer);
  const name = held.variant.name || held.offer.name || '';
  foot.innerHTML = `<b>${esc(name)}</b> is in your hand`;
  if (pill) {
    pill.hidden = false;
    pill.innerHTML = `<span class="tbx-pfig">${F().html(held.offer, held.variant, 34)}</span>
      <b>${esc(name)}</b><span>Click the table to set it down${
        def && def.list ? ' &middot; wheel to change it' : ''} &middot; Esc to stop</span>`;
  }
}

/* ══ VARIANTS, IN THE HAND ════════════════════════════════════ */
function startVariant(o) {
  const d = F().variantsFor(o);
  const base = Object.assign({}, o.v || {});
  if (d && d.list && base[d.field] === undefined) Object.assign(base, d.list[d.start || 0]);
  return base;
}
function cycle(d) {
  if (!held) return;
  const def = F().variantsFor(held.offer);
  if (!def || !def.list) return;
  const i = def.list.findIndex(x => x[def.field] === held.variant[def.field]);
  held.vi = ((i < 0 ? 0 : i) + d + def.list.length) % def.list.length;
  Object.assign(held.variant, def.list[held.vi]);
  paintHeld(); paintFoot();
  if (root.Workbench) root.Workbench.repaint();
}

/* ══ TAKING ONE OUT ═══════════════════════════════════════════ */
/* kept for anything that asks the hand directly: straight into your hand,
   with the maker's choices as they stand */
function take(o) {
  if (!o) return;
  if (o.act === 'open')  { if (root.Papers) root.Papers.pick(); return; }
  if (o.act === 'unbin') { T().unbin(o.ref); refresh(); return; }
  if (o.custom === 'npc' || o.custom === 'form') { grab(root.Toolbox.blankToken(o.custom)); return; }
  if (o.custom === 'picture') { choose(o); return; }
  grab(o);
}

/* `variant`, when given, is the workbench's own object — shared, so a change
   made on the bench while you are holding the thing changes what is in your
   hand */
function grab(o, dragging, variant) {
  const def = F().variantsFor(o);
  startFollow();
  held = { offer: o, variant: variant || startVariant(o),
           vi: def && def.list ? (def.start || 0) : -1, dragging: !!dragging };
  doc.body.classList.add('holding');
  makeHeld(); paintHeld(); paintFoot();
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
  /* A COUNTER IN YOUR HAND IS THE COUNTER THAT LANDS — its name tag on, and
     standing up, the same piece the wood will have a moment from now */
  if (held.offer.kind === 'token') {
    held.variant.plate = held.variant.name || held.offer.name || '';
    held.variant.stand = true;
  }
  const sz = F().sizeOf(held.offer, held.variant);
  const k = held.variant.scale && held.offer.kind !== 'token' ? +held.variant.scale : 1;
  const w = Math.round(sz.w * k), h = Math.round(sz.h * k);
  ghost.dataset.r = held.offer.kind === 'model' || held.offer.kind === 'token' ? 0 : (+held.variant.rot || 0);
  shade.dataset.r = ghost.dataset.r;
  ghost.innerHTML =
    `<div class="face hh-face" style="width:${w}px;height:${h}px">
       ${F().html(held.offer, held.variant, Math.min(w, h) * 0.96)}
     </div>`;
  shade.innerHTML = `<div class="face hh-shade" style="width:${w}px;height:${h}px"></div>`;
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
               && !overPanel(sx, sy);
  ghost.style.display = shade.style.display = over ? '' : 'none';
  float_.style.display = over ? 'none' : '';
  if (!over) { float_.style.left = sx + 'px'; float_.style.top = sy + 'px'; return; }

  const sz = F().sizeOf(held.offer, held.variant);
  const k = held.variant.scale && held.offer.kind !== 'token' ? +held.variant.scale : 1;
  const w = sz.w * k, h = sz.h * k;
  /* A SCENE DOES NOT GO WHERE YOU POINT. It is fitted to the slab and
     pinned there the moment it is made. */
  let x, y;
  if (held.offer.kind === 'scene') {
    x = Math.round((D().TW - sz.w) / 2);
    y = Math.round((D().TH - sz.h) / 2);
  } else {
    const p = D().screenToTable(sx, sy);
    x = Math.round(p.x - w / 2);
    y = Math.round(p.y - h / 2);
  }
  ghost.dataset.x = shade.dataset.x = x;
  ghost.dataset.y = shade.dataset.y = y;
  D().place(ghost); D().place(shade);
}

/* is the pointer over the dock (or the token maker, which floats beside
   it)? What is let go there is not put on the wood. */
function overPanel(x, y) {
  for (const el of [dock, root.TokenMaker && root.TokenMaker.el()]) {
    if (!el || el.hidden) continue;
    const r = el.getBoundingClientRect();
    if (!r.width) continue;
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return true;
  }
  return false;
}
/* 24-table-props.js lights the dock while a piece is carried over it */
function over(on) { if (dock) dock.classList.toggle('taking', !!on && isUp()); }

/* ══ PUTTING IT DOWN ══════════════════════════════════════════ */
function put(sx, sy) {
  if (!held) return false;
  const p = D().screenToTable(sx, sy);
  const o = held.offer, v = held.variant, vi = held.vi, dragged = held.dragging;
  drop(true);
  const made = root.Toolbox.take(o, p.x, p.y, v);
  /* a model or a picture keeps the scale it was set to on the bench */
  if (made && v.scale && +v.scale !== 1 && made.kind !== 'token' && made.kind !== 'scene')
    T().scaleTo(made.id, +v.scale);
  /* Mario Maker does not make you go back to the palette between bricks. You
     are still holding one — unless it was a scene, or you dragged it out of
     the box, which is putting ONE thing down. */
  if (o.kind !== 'scene' && o.act !== 'make' && !dragged) {
    grab(o, false, v); held.vi = vi; paintHeld(); paintFoot();
  }
  return true;
}

function drop(keepBench) {
  held = null;
  doc.body.classList.remove('holding');
  killHeld(); paintFoot();
  if (!keepBench && root.TokenMaker) root.TokenMaker.close();
}

/* ══ WIRING ═══════════════════════════════════════════════════ */
function mount() {
  build();

  /* A MODEL'S PREVIEW IS THE MODEL, and a texture decodes on its own time;
     repaint the tiles the moment they have landed */
  if (root.TableGL && root.TableGL.onTextures) {
    root.TableGL.onTextures(() => { refresh(); if (isUp()) paintKinds(); });
  }

  /* CAPTURE, because #vp's own pointerdown starts a pan and would eat the
     click that puts the thing down */
  doc.addEventListener('pointerdown', e => {
    if (!held) return;
    if (overPanel(e.clientX, e.clientY)) return;
    const vp = doc.getElementById('vp');
    if (!vp || vp.hidden) return;
    const r = vp.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right ||
        e.clientY < r.top  || e.clientY > r.bottom) return;
    if (e.target.closest && e.target.closest('.chatdock, .muster, .gmr, .kit, .insp, .tbx-pill')) return;
    if (e.button === 2) { e.preventDefault(); e.stopPropagation(); drop(); return; }
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    put(e.clientX, e.clientY);
  }, true);

  doc.addEventListener('pointermove', e => { if (held) at(e.clientX, e.clientY); });
  /* a tile dragged out is let go wherever the pointer is: on the wood it
     lands, over the dock it goes back */
  doc.addEventListener('pointerup', e => {
    if (!held || !held.dragging) return;
    const vp = doc.getElementById('vp');
    const r = vp && vp.getBoundingClientRect();
    const onWood = r && e.clientX >= r.left && e.clientX <= r.right &&
                   e.clientY >= r.top && e.clientY <= r.bottom && !overPanel(e.clientX, e.clientY);
    if (onWood) put(e.clientX, e.clientY); else drop();
  });
  doc.addEventListener('contextmenu', e => { if (held) { e.preventDefault(); drop(); } });

  doc.addEventListener('wheel', e => {
    if (!held) return;
    if (dock && dock.contains(e.target)) return;      /* the dock scrolls itself */
    e.preventDefault(); e.stopPropagation();
    cycle(e.deltaY > 0 ? 1 : -1);
  }, { capture: true, passive: false });

  doc.addEventListener('keydown', e => {
    const el = doc.activeElement, tag = el && el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
        (el && el.isContentEditable)) return;
    if (e.key === 'Escape' && held) { e.preventDefault(); drop(true); return; }
    if (!isUp()) return;
    if (e.key === 'Escape' && bench && !bench.hidden && !(root.Workbench && root.Workbench.editing())) {
      e.preventDefault(); closeBench(true); return;
    }
    /* one step at a time: what is in your hand, then the bench, then the box */
    if (e.key === 'Escape' && !e.defaultPrevented) {
      e.preventDefault();
      if (bench && !bench.hidden) closeBench(true);
      else if (root.Toolbox) root.Toolbox.shut();
      return;
    }
    if (e.key >= '1' && e.key <= '9' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const n = +e.key - 1;
      if (n < kinds.length) { e.preventDefault(); sel = n; pickKind(kinds[n]); }
      return;
    }
    /* the one key a box full of things needs: go to the find well */
    if (e.key === '/' && find && !shelf.hidden) { e.preventDefault(); find.focus(); find.select(); }
  });

  root.addEventListener('resize', () => { if (held) at(last.x, last.y); });
}

/* the table pans and zooms without telling anyone; re-place each frame —
   but only while something is in your hand */
let following = false;
function follow() {
  if (!(held && ghost)) { following = false; return; }
  requestAnimationFrame(follow);
  if (last.x >= 0) at(last.x, last.y);
}
function startFollow() {
  if (following) return;
  following = true;
  requestAnimationFrame(follow);
}

root.Hand = { mount, show, hide, isUp, take, grab, drop, put, refresh, say, step,
              choose, quick, openBench, editThing, closeBench, overPanel, over,
              repaint: () => { paintHeld(); paintFoot(); },
              get held() { return held; },
              get tray() { return openKind; },
              get el() { return dock; } };

})(window, document);
