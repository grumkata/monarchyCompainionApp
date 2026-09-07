/* ══════════════════════════════════════════════════════════════
   25-toolbox.js — THE CHEST AND THE BIN.

   A new table is empty besides these two. They are furniture, not
   contents: never in `things`, and the bin cannot eat itself.
   The box is the GM's, or anyone handed the assistant's key.

   WHAT OPENING IT DOES, and this is the third answer to the same
   complaint, so it is written down properly this time.

   It used to lay nine labelled tiles on the wood. Before that it
   was a drawer with tabs and a search field. Both were menus with
   a table painted behind them, which is exactly what grumkata kept
   saying and kept being right about:

     "you are giving me website ui not game ui"

   Now the lid swings and a BAR comes up, holding pictures of the
   things themselves — 46-figures.js draws them, 47-hand.js runs
   the bar and the hand. You take one OUT of the chest and you are
   holding it over the wood. This file's job is only two things:
   standing the chest and the bin somewhere, and turning what you
   let go of into a thing on the table.

   The chest is grumkata's AnimatedChest — the real asset, run
   through FBX2glTF and baked by tools/bake_chest.py, drawn by
   27-table-gl.js and hinged on its own Bone. What lives here is
   only its ANCHOR: an invisible .prop on the wood which the GL
   layer measures every frame, the same way proto anchors its dice.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const T = () => root.TableModel;
const C = () => root.TableContent;

let open_ = false;

/* ── where the furniture stands ───────────────────────────────
   FURNITURE IS NOT CARGO. Locked to the wood and not draggable — the chest
   and the bin are part of the table, not things on it.

   BOTH ARE INSIDE THE CIRCLE. The table is round now (2600 across, centre at
   1300,1300, so anything further than 1300 from the middle is standing on
   thin air). The old corner positions were written for a square slab and put
   the chest 1541 units out — off the edge. These two sit ~990 out, on the
   left side of the wood, top and bottom, with room for their own footprint. */
const CHEST_AT = { x: 600, y: 600, size: 320 };
/* THE BIN IS ON THE TABLE. grumkata: "take the bin and remove it from being
   stuck to the screen instead imbed it into the table just like the chest
   bottom left is prefrable". It was screen-fixed because a bin pinned to the
   wood used to sail off the viewport whenever the camera framed a combat
   scene — that is no longer true: the camera is clamped to the table now
   (23-table3d.js inBounds), so the wood, and everything locked to it, stays
   reachable. It is the same real model over the same invisible anchor; only
   the anchor moved, from the screen's corner to the table's. */
const BIN_AT = { x: 600, y: 2000, size: 260 };

const MARKS = { scene:'◈', token:'●', note:'✎', art:'❖', model:'♢', page:'☰', sheet:'☷' };
const label = t => t.kind === 'scene'
  ? ((C().SCENES[t.scene] || {}).name || 'Scene')
  : (t.kind.charAt(0).toUpperCase() + t.kind.slice(1));

/* ══ MOUNT ════════════════════════════════════════════════════ */
function mount() {
  const tbl = doc.getElementById('tbl');
  if (!tbl || doc.getElementById('tb-anchor')) return;

  const box = doc.createElement('div');
  box.className = 'prop tb-box fixed';
  box.id = 'tb-anchor';
  box.dataset.x = CHEST_AT.x; box.dataset.y = CHEST_AT.y;
  /* FURNITURE STANDS PROUD. The table is preserve-3d, so hit testing walks
     the 3D scene: at z 8 the chest sat BEHIND the combat sheet's raised
     plaques (translateZ 38) wherever the two overlapped, and simply could not
     be clicked. It must always be reachable, so it sits above anything a
     scene can raise. */
  box.dataset.rest = 60; box.dataset.z = 60; box.dataset.r = 0;
  box.innerHTML =
    `<div class="face tb-anchor-face" title="The toolbox  (B)"
          style="width:${CHEST_AT.size}px;height:${CHEST_AT.size}px"></div>`;
  tbl.appendChild(box);
  root.Table3D.place(box);

  const bin = doc.createElement('div');
  bin.className = 'prop tb-bin fixed';
  bin.id = 'tb-bin-prop';
  bin.dataset.x = BIN_AT.x; bin.dataset.y = BIN_AT.y;
  /* stands as proud as the chest, and for the same reason: you have to be
     able to drop something into it even where a scene raises its plaques */
  bin.dataset.rest = 60; bin.dataset.z = 60; bin.dataset.r = 0;
  bin.innerHTML =
    `<div class="face tb-bin-face" title="Drop something here to be rid of it"
          style="width:${BIN_AT.size}px;height:${BIN_AT.size}px"></div>`;
  tbl.appendChild(bin);
  root.Table3D.place(bin);

  hit(box, toggle);

  /* B opens the box, Escape shuts it — but never while typing */
  doc.addEventListener('keydown', e => {
    const el = doc.activeElement, tag = el && el.tagName;
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
                   (el && el.isContentEditable);
    if (e.key === 'Escape' && open_ && !(root.Hand && root.Hand.held)) {
      e.preventDefault(); shut(); return;
    }
    if (typing) return;
    /* ── THE ONE STEP BACK ────────────────────────────────────
       The bin deletes now, and a delete you cannot take back is a trap.
       This is the whole of the bin's interface, and it is a keystroke —
       so there is nothing on the table to look at or get in the way of
       anything. */
    if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) {
      const back = T().undoBin();
      if (back) { e.preventDefault(); say((back.name || 'That') + ' — back on the table'); }
      return;
    }
    if ((e.key === 'b' || e.key === 'B') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault(); toggle();
    }
  });

  if (root.Hand) root.Hand.mount();
  T().on(() => { if (open_) refill(); });
  gate();
}

/* the one line of feedback the bin has, in the toast the table already owns */
function say(t) {
  const el = doc.getElementById('toast');
  if (!el) return;
  el.textContent = t;
  el.classList.add('on');
  clearTimeout(say._t);
  say._t = setTimeout(() => el.classList.remove('on'), 1900);
}

/* A prop is draggable, so a press is only a CLICK if the pointer did not
   travel. Without this every attempt to shove the chest aside also opened it. */
function hit(el, fn) {
  let from = null;
  el.addEventListener('pointerdown', e => { from = { x: e.clientX, y: e.clientY }; });
  el.addEventListener('pointerup', e => {
    if (from && Math.hypot(e.clientX - from.x, e.clientY - from.y) < 5) fn();
    from = null;
  });
}

/* the box is the GM's; a player is not shown a door they cannot open */
function gate() {
  const may = T().mayUseBox();
  const b = doc.getElementById('tb-anchor'); if (b) b.hidden = !may;
  const n = doc.getElementById('tb-bin-prop'); if (n) n.hidden = !may;
  if (!may) shut();
}

const isOpen = () => open_;
function toggle() { open_ ? shut() : open(); }

/* ══ WHAT IS IN THE CHEST — IN TWO STEPS ══════════════════════
   grumkata: "you should select an object generalization then get a list of
   options + custom option and from there you place it".

   So the plank holds SIX KINDS and never changes, which is what lets your
   hand learn where they are; picking one opens a tray of that kind's actual
   OPTIONS — every character you have made, every picture in the app, every
   model — each drawn as itself, ending in a slot that makes a new one.

   The figure on a kind's slot is a real member of that kind, not a symbol
   for it: the models slot is a render of an actual model, the art slot an
   actual picture. */
function KINDS() {
  const firstModel = (root.Library && root.Library.models.list()[0]) || null;
  const firstArt = (root.Library && root.Library.art.all()[0]) || null;
  return [
    { id: 'scenes', name: 'Scenes',
      fig: { kind: 'scene', scene: 'combat' }, figv: { width: 8 } },
    { id: 'people', name: 'People',
      fig: { kind: 'token', name: 'A B' }, figv: { side: 'al' } },
    { id: 'art',    name: 'Art',
      fig: { kind: 'art' }, figv: firstArt ? { art: firstArt.id } : {} },
    { id: 'models', name: 'Models',
      fig: { kind: 'model' }, figv: firstModel ? { model: firstModel.id } : {} },
    { id: 'papers', name: 'Papers',
      fig: { kind: 'page' }, figv: { rule: 'set' } },
    { id: 'notes',  name: 'Notes',
      fig: { kind: 'note' }, figv: { tint: 'cream' } }
  ];
}

/* the picture a character's counter wears, if they have been given one */
const faceOf = c => (c && c.who && c.who.pic) || '';
const artOf  = c => (c && c.who && c.who.picArt) || '';

function options(kind) {
  const L = root.Library;
  if (kind === 'bin') return binned();
  if (kind === 'scenes') {
    return Object.keys(C().SCENES).map(k => ({
      id: 'scene:' + k, kind: 'scene', scene: k, act: 'make',
      name: C().SCENES[k].name, v: { width: 8 }
    }));
  }

  if (kind === 'people') {
    const who = (root.Characters ? root.Characters.roster() : []).map(c => ({
      id: 'char:' + c.id, kind: 'token', char: c.id, act: 'place',
      name: root.Characters.nameOf(c),
      /* SOURCE IS PART OF WHAT IT LOOKS LIKE. A counter that IS a record
         stands as a pawn and wears its monogram; an NPC is a meeple and a
         formation is a standard. Saying so here is what lets the piece in
         the tray be the piece that lands. */
      v: { side: 'al', entKind: 'unit', source: 'char',
           src: faceOf(c), art: artOf(c) }
    }));
    /* ONE OF EACH THING A COUNTER CAN BE. A character is tied to a record and
       takes its hit points from it; an NPC and a formation are their own, and
       are built beside the counter while you carry it. */
    return who.concat([
      { custom: 'npc',  kind: 'token', name: 'Someone else',
        v: { side: 'en', entKind: 'unit', source: 'npc' } },
      { custom: 'form', kind: 'token', name: 'A formation',
        v: { side: 'en', entKind: 'form', source: 'form' } }
    ]);
  }

  /* ── THE TWO THAT GROW ────────────────────────────────────
     grumkata: "for art when selecting it some of it can be cutoff ALSO as we
     go on art and models will get more and more so the current setup wont
     work". Both of these are already past a hundred entries and both are
     meant to keep growing, so each option carries the SHELF it came off —
     47-hand.js turns those into the tabs and the search that make a hundred
     things findable instead of a wall to scroll. Nothing is written down
     twice: the shelves are 48-library.js's own groups. */
  if (kind === 'art') {
    const out = [];
    (L ? L.art.groups() : []).forEach(g => g.items.forEach(a => out.push({
      id: 'art:' + a.id, kind: 'art', act: 'place', name: a.name,
      g: g.id, gn: g.name,
      v: { art: a.id, src: a.src || '', w: a.w, h: a.h }
    })));
    return out.concat([
      { custom: 'picture', kind: 'art', name: 'A picture off your machine',
        g: 'yours', gn: 'Yours', v: {} }
    ]);
  }

  if (kind === 'models') {
    const out = [];
    (L ? L.models.groups() : []).forEach(g => g.items.forEach(m => out.push({
      id: 'model:' + m.id, kind: 'model', act: 'place', name: m.name,
      g: g.id, gn: g.name,
      v: { model: m.id }
    })));
    return out;
  }

  if (kind === 'papers') {
    return [
      { id: 'sheet', kind: 'sheet', act: 'open', name: 'Character record' },
      { id: 'page:set',   kind: 'page', act: 'place', name: 'A set page',  v: { rule: 'set' } },
      { id: 'page:ruled', kind: 'page', act: 'place', name: 'A ruled page', v: { rule: 'ruled' } },
      { id: 'page:plain', kind: 'page', act: 'place', name: 'A blank page', v: { rule: 'plain' } }
    ];
  }

  if (kind === 'notes') {
    return [
      { id: 'note:cream', kind: 'note', act: 'place', name: 'Paper',      v: { tint: 'cream' } },
      { id: 'note:blue',  kind: 'note', act: 'place', name: 'Blue paper', v: { tint: 'blue' } },
      { id: 'note:red',   kind: 'note', act: 'place', name: 'Red paper',  v: { tint: 'red' } }
    ];
  }
  return [];
}

/* a counter that is nobody yet, for the maker to fill in */
function blankToken(what) {
  const form = what === 'form';
  return {
    id: 'new:' + what, kind: 'token', act: 'place', make: what,
    name: form ? 'A formation' : 'Someone',
    v: { side: 'en', entKind: form ? 'form' : 'unit',
         hpMax: form ? 24 : 10, name: form ? 'Levies' : 'Someone',
         src: '', art: '', info: '' }
  };
}

/* everything placeable, flat — what the bin and anything asking "what does
   this chest hold" wants. The BAR does not use this; it works in two steps. */
function offerings() {
  const out = [];
  ['scenes', 'people', 'art', 'models', 'papers', 'notes']
    .forEach(k => options(k).forEach(o => { if (!o.custom) out.push(o); }));
  return out;
}

/* ── THE BIN HAS NO CONTENTS TO SHOW ─────────────────────────
   grumkata: "from the bin there should be no ui". There was a whole tray of
   binned things you could open and reach back into, which made the bin a
   second inventory to keep tidy. The bin holds one thing now, only long
   enough for Ctrl+Z, and nothing anywhere offers to show it — so this
   returns nothing and the "bin" kind is gone from the bar. */
function binned() { return []; }

function open() {
  if (open_ || !T().mayUseBox()) return;
  open_ = true;
  if (root.TableGL) root.TableGL.setOpen(true);
  if (root.Hand) root.Hand.show(KINDS());
}

function shut() {
  open_ = false;
  if (root.TableGL) root.TableGL.setOpen(false);
  if (root.Hand) { root.Hand.drop(); root.Hand.hide(); }
}

/* the bar is rebuilt when the roster or the bin changes under it */
function refill() { if (root.Hand && root.Hand.isUp()) root.Hand.refresh(); }

/* ══ TAKING SOMETHING OUT ═════════════════════════════════════
   `x,y` is the point on the wood you let go of it. `v` is what you chose
   while you were holding it — the battlefield's width, the picture, which
   side the counter is on. */
function take(i, x, y, v) {
  v = v || {};
  if (i.act === 'unbin') { T().unbin(i.ref); refill(); return; }
  const at = (x == null)
    ? (root.Table3D ? root.Table3D.middle() : { x: 1200, y: 780 })
    : { x: x, y: y };

  /* A SCENE LANDS FITTED ON THE SLAB, wherever you were pointing.
     grumkata: "on creation locked in place and fitted to the fucking table".
     Placing it at the middle of the view is why a combat sheet ended up
     hanging off: pan anywhere and "the centre of what I can see" stops being
     "the centre of the table". So it is centred on the wood and pinned;
     unpin it from its own title bar if you want it elsewhere. */
  if (i.act === 'make' && i.kind === 'scene') {
    shut();
    const def = C().SCENES[i.scene] || {};
    const sz = def.size || { w: 520, h: 180 };
    const setup = Object.assign(C().defaultSetup(i.scene), pick(v, 'setup', i));
    const sc = T().put({ kind: 'scene', scene: i.scene, setup: setup,
                         x: Math.round((root.Table3D.TW - sz.w) / 2),
                         y: Math.round((root.Table3D.TH - sz.h) / 2),
                         w: sz.w, h: sz.h, locked: true });
    T().activate(sc.id);
    /* and put the camera where the scene is, so you can see what you just put
       down. Two frames, not a timeout: the sheet has to have been laid out
       before it can be measured, and one rAF is the paint that lays it out. */
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const el = doc.getElementById('combat-prop');
      if (el && el.style.display !== 'none' && root.Table3D) root.Table3D.frame(el);
    }));
    return;
  }
  /* A record is a PAPER: it opens on your own end, not on the wood. */
  if (i.act === 'open') { shut(); if (root.Papers) root.Papers.pick(); return; }

  /* CENTRED ON THE POINT YOU LET GO OF IT — from the thing's own box, which
     for a picture is the picture's real proportions and for a model is what
     its library entry says it stands. Hard-coded half-sizes drifted the
     moment anything changed shape, and a piece that lands a hand's width
     from your cursor is a piece you did not put there. */
  const sz = root.Figures ? root.Figures.sizeOf(i, v) : { w: 300, h: 200 };
  const centred = { w: sz.w, h: sz.h,
                    x: Math.round(at.x - sz.w / 2),
                    y: Math.round(at.y - sz.h / 2) };

  /* ── A COUNTER IS ONE OF THREE THINGS ──────────────────────
     grumkata: it must matter "if it comes from a character sheet or if its
     an npc or even a formation". A character's counter is tied to the
     record and takes its hit points from the rules through it; the other
     two are their own, with whatever you gave them in the maker. */
  if (i.kind === 'token' && root.Tokens) {
    root.Tokens.make({
      source: i.char ? 'char' : (v.entKind === 'form' ? 'form' : 'npc'),
      char: i.char || null,
      name: i.char ? i.name : (v.name || i.name || 'Someone'),
      side: v.side || 'al',
      entKind: v.entKind || 'unit',
      hp: v.hpMax, max: v.hpMax,
      src: v.src || '', art: v.art || '', info: v.info || '',
      x: centred.x, y: centred.y, w: sz.w, h: sz.h });
    return;
  }

  const extra = Object.assign({ kind: i.kind, name: label({ kind: i.kind }) }, centred);
  if (i.kind === 'note')  { extra.text = ''; extra.tint = v.tint || 'cream'; }
  if (i.kind === 'page')  { extra.rule = v.rule || 'set'; }
  if (i.kind === 'model') { extra.model = v.model || null;
                            extra.name = modelName(v.model); }
  if (i.kind === 'art') {
    extra.src = v.src || '';
    extra.art = v.art || '';
    extra.name = i.name || 'Art';
    /* A LIBRARY PICTURE HAS NOT BEEN MEASURED YET — a charge is a vector and
       a pack entry is a data URI nobody decoded. Put it down square, then
       measure it and let the model correct the box. One repaint, and the
       picture is at its own proportions from the first frame you look at it. */
    if (extra.src && !(v.w && v.h) && root.Pictures) {
      const t = T().put(extra);
      root.Pictures.measure(extra.src, dim => {
        if (!dim) return;
        const f = root.Pictures.fit(dim.w, dim.h, 520);
        const still = T().get(t.id); if (!still) return;
        still.w = f.w; still.h = f.h;
        still.x = Math.round(at.x - f.w / 2);
        still.y = Math.round(at.y - f.h / 2);
        T().changed('measured');
      });
      return;
    }
  }
  T().put(extra);
}

const modelName = id => {
  const m = id && root.Library && root.Library.models.get(id);
  return m ? m.name : 'Model';
};

/* the fields of a chosen variant that belong to a scene's setup */
function pick(v, where, offer) {
  const def = root.Figures && root.Figures.variantsFor(offer);
  if (!def || def.of !== where) return {};
  const out = {};
  if (v[def.field] !== undefined) out[def.field] = v[def.field];
  return out;
}

/* the count badge is gone with the rest of the bin's interface; kept as a
   no-op because 22-table-model.js's listeners and the tests both call it */
function paintBin() {}

root.Toolbox = { mount, open, shut, toggle, isOpen, gate, paintBin, take,
                 offerings, options, blankToken, KINDS, CHEST_AT, BIN_AT };

})(window, document);
