/* ══════════════════════════════════════════════════════════════
   25-toolbox.js — WHAT THE BOX HOLDS, AND TAKING THINGS OUT OF IT.

   grumkata, 2026-09-25: "first remove the physical toolbox and bin
   they look mid. second we need the ability to add things to the
   table to be more custmisable BEFORE Placing them."

   So there is no chest standing on the wood and no barrel beside it.
   The box is on the SCREEN, docked at your left hand (47-hand.js), and
   it opens with B or the GM's rail (68-gm-rail.js). Choosing a thing
   opens its WORKBENCH (66-workbench.js) — every choice that thing has,
   made while you look at it — and only then is it in your hand over
   the wood. Putting something away is carrying it back over the open
   box, or the inspector's Remove, or Delete (67-inspector.js).

   This file is the half with no interface: what there is to take out,
   and turning what you let go of into a thing on the table. The box is
   the GM's, or anyone handed the assistant's key.

   The public shape is unchanged — options(kind), take(offer, x, y, v),
   KINDS(), blankToken(), open/shut/toggle, gate — so everything that
   asked the chest for something asks the box the same way.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const T = () => root.TableModel;
const C = () => root.TableContent;

let open_ = false;

const label = t => t.kind === 'scene'
  ? ((C().SCENES[t.scene] || {}).name || 'Scene')
  : (t.kind.charAt(0).toUpperCase() + t.kind.slice(1));

/* ══ MOUNT ════════════════════════════════════════════════════ */
function mount() {
  if (mount.done) return;
  mount.done = true;

  doc.addEventListener('keydown', e => {
    const el = doc.activeElement, tag = el && el.tagName;
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
                   (el && el.isContentEditable);
    if (typing) return;
    if (!doc.body.classList.contains('at-table')) return;
    if ((e.key === 'b' || e.key === 'B') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault(); toggle();
    }
  });

  if (root.Hand) root.Hand.mount();
  T().on((st, why) => { if (open_ && why !== 'select' && why !== 'move') refill(); });
  /* THE ROLE ARRIVES WITH THE SESSION, AFTER THE BOX IS UP — so the gate is
     asked again every time the session moves: joining shuts it, leaving
     opens it back up. */
  root.addEventListener('monarchy:session', gate);
  root.addEventListener('monarchy:where', e => {
    if ((!e.detail || e.detail.at !== 'table') && (open_ || (root.Hand && root.Hand.held))) shut();
  });
  gate();
}

/* the box is the GM's; a player is not shown a door they cannot open */
function gate() {
  const may = T().mayUseBox();
  doc.body.classList.toggle('may-box', may);
  if (root.GmRail) root.GmRail.paint();
  if (!may && (open_ || (root.Hand && root.Hand.held))) shut();
}

const isOpen = () => open_;
function toggle() { open_ ? shut() : open(); }

/* ══ THE SIX KINDS ════════════════════════════════════════════
   The same six the chest held, in the same order, keyed 1-6. Each is
   drawn as a real member of itself on its tab. */
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
  if (kind === 'bin') return [];
  if (kind === 'scenes') {
    const out = Object.keys(C().SCENES).map(k => ({
      id: 'scene:' + k, kind: 'scene', scene: k, act: 'make',
      name: C().SCENES[k].name, g: 'new', gn: 'New',
      v: k === 'combat' ? { width: 8, terrain: 'meadow' } : {}
    }));
    /* ── AND THE FIGHTS YOU MADE EARLIER ─────────────────────
       grumkata: "preset combat scenes where gm makes a preset board and
       then bring it to the table". A saved encounter is a scene you take
       out of the box like any other — already dressed, already manned. */
    const E = root.Encounters;
    (E ? E.list() : []).forEach(e => out.push({
      id: 'enc:' + e.id, kind: 'scene', scene: 'combat', act: 'make', enc: e.id,
      name: e.name || 'An encounter', g: 'prepared', gn: 'Prepared',
      v: { width: e.width, terrain: e.terrain, name: e.name, preset: e.id }
    }));
    return out;
  }

  if (kind === 'people') {
    const who = (root.Characters ? root.Characters.roster() : []).map(c => ({
      id: 'char:' + c.id, kind: 'token', char: c.id, act: 'place',
      name: root.Characters.nameOf(c), g: 'characters', gn: 'Characters',
      v: { side: 'al', entKind: 'unit', source: 'char', look: 'standee',
           name: root.Characters.nameOf(c), src: faceOf(c), art: artOf(c) }
    }));
    /* ONE OF EACH THING A COUNTER CAN BE. A character is tied to a record and
       takes its hit points from it; an NPC and a formation are their own, and
       are built on the workbench before they are anywhere else. */
    return who.concat([
      { custom: 'npc',  kind: 'token', name: 'A new person', g: 'new', gn: 'New',
        v: { side: 'en', entKind: 'unit', source: 'npc', look: 'standee' } },
      { custom: 'form', kind: 'token', name: 'A new formation', g: 'new', gn: 'New',
        v: { side: 'en', entKind: 'form', source: 'form', look: 'standee' } }
    ]);
  }

  /* ── THE TWO THAT GROW ────────────────────────────────────
     Both of these are past a hundred entries and meant to keep growing, so
     each option carries the SHELF it came off — 47-hand.js turns those into
     the pennons and the search that make a hundred things findable. */
  if (kind === 'art') {
    const out = [];
    (L ? L.art.groups() : []).forEach(g => g.items.forEach(a => out.push({
      id: 'art:' + a.id, kind: 'art', act: 'place', name: a.name,
      g: g.id, gn: g.name,
      v: { art: a.id, src: a.src || '', w: a.w, h: a.h }
    })));
    return out.concat([
      { custom: 'picture', kind: 'art', name: 'A picture from your computer',
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

/* a counter that is nobody yet, for the workbench to fill in */
function blankToken(what) {
  const form = what === 'form';
  return {
    id: 'new:' + what, kind: 'token', act: 'place', make: what,
    name: form ? 'A formation' : 'Someone',
    v: { side: 'en', entKind: form ? 'form' : 'unit', look: 'standee',
         hpMax: form ? 24 : 10, name: form ? 'Levies' : 'Someone',
         bodies: form ? 10 : undefined,
         src: '', art: '', fig: '', info: '' }
  };
}

/* everything placeable, flat */
function offerings() {
  const out = [];
  ['scenes', 'people', 'art', 'models', 'papers', 'notes']
    .forEach(k => options(k).forEach(o => { if (!o.custom) out.push(o); }));
  return out;
}

function open() {
  if (open_ || !T().mayUseBox()) return;
  /* the box and the muster share the dock at your left hand */
  if (root.Muster && root.Muster.isOpen()) root.Muster.close();
  open_ = true;
  doc.body.classList.add('box-open');
  if (root.Hand) root.Hand.show(KINDS());
  if (root.GmRail) root.GmRail.paint();
}

function shut() {
  open_ = false;
  doc.body.classList.remove('box-open');
  if (root.Hand) { root.Hand.drop(); root.Hand.hide(); }
  if (root.GmRail) root.GmRail.paint();
}

/* the shelf is rebuilt when the roster or the library changes under it */
function refill() { if (root.Hand && root.Hand.isUp()) root.Hand.refresh(); }

/* ══ TAKING SOMETHING OUT ═════════════════════════════════════
   `x,y` is the point on the wood you let go of it. `v` is everything you
   chose on the workbench — the battlefield's width and ground, the picture,
   which side the counter is on and what it is wearing. */
/* ── AND A CHARACTER PUT ON THE WOOD IS AT THE TABLE ──────────
   grumkata: "people should be able to connect ANNY number of charcter
   sheets to a table by pulling it there". Placing a character at a live
   table brings its sheet with it. */
function alsoBring(i) {
  if (!i || i.kind !== 'token' || !i.char) return;
  if (root.SheetsNet) root.SheetsNet.bring(i.char);
}

function take(i, x, y, v) {
  v = v || {};
  if (!T().mayUseBox()) { shut(); return null; }
  alsoBring(i);
  if (i.act === 'unbin') { T().unbin(i.ref); refill(); return null; }
  const at = (x == null)
    ? (root.Table3D ? root.Table3D.middle() : { x: 1200, y: 780 })
    : { x: x, y: y };

  /* A SCENE LANDS FITTED ON THE SLAB. grumkata: "on creation locked in place
     and fitted to the fucking table". */
  if (i.act === 'make' && i.kind === 'scene') {
    if (root.Hand) root.Hand.drop();
    /* a PREPARED fight is the Encounters' to lay out — lines, men, ground */
    const pre = v.preset || i.enc;
    if (pre && root.Encounters) {
      const sc = root.Encounters.toTable(pre, { name: v.name });
      if (sc) afterScene();
      return sc;
    }
    const def = C().SCENES[i.scene] || {};
    const sz = def.size || { w: 520, h: 180 };
    const setup = Object.assign(C().defaultSetup(i.scene), pickSetup(i.scene, v));
    const sc = T().put({ kind: 'scene', scene: i.scene, setup: setup,
                         name: (v.name || '').trim() || undefined,
                         x: Math.round((root.Table3D.TW - sz.w) / 2),
                         y: Math.round((root.Table3D.TH - sz.h) / 2),
                         w: sz.w, h: sz.h, locked: true });
    T().activate(sc.id);
    afterScene();
    return sc;
  }
  /* A record is a PAPER: it opens on your own end, not on the wood. */
  if (i.act === 'open') { if (root.Papers) root.Papers.pick(); return null; }

  /* CENTRED ON THE POINT YOU LET GO OF IT — from the thing's own box. */
  const sz = root.Figures ? root.Figures.sizeOf(i, v) : { w: 300, h: 200 };
  const centred = { w: sz.w, h: sz.h,
                    x: Math.round(at.x - sz.w / 2),
                    y: Math.round(at.y - sz.h / 2) };

  /* ── A COUNTER IS ONE OF THREE THINGS ──────────────────────
     A character's counter is tied to the record and takes its hit points
     from the rules through it; the other two are their own, with whatever
     you gave them on the workbench. */
  if (i.kind === 'token' && root.Tokens) {
    return root.Tokens.make({
      source: i.char ? 'char' : (v.entKind === 'form' ? 'form' : 'npc'),
      char: i.char || null,
      name: i.char ? i.name : (v.name || i.name || 'Someone'),
      side: v.side || 'al',
      entKind: v.entKind || 'unit',
      hp: v.hpMax, max: v.hpMax,
      bodies: v.bodies, hpea: v.hpea, dmg: v.dmg, skl: v.skl, def: v.def, lead: v.lead,
      look: v.look || 'standee', fig: v.fig || '',
      src: v.src || '', art: v.art || '', info: v.info || '',
      x: centred.x, y: centred.y, w: sz.w, h: sz.h });
  }

  const extra = Object.assign({ kind: i.kind, name: label({ kind: i.kind }) }, centred);
  if (v.rot) extra.rot = ((Math.round(+v.rot) % 360) + 360) % 360;
  if (v.scale && +v.scale !== 1) extra.scale = Math.max(0.25, Math.min(4, +v.scale));
  if (i.kind === 'note')  { extra.text = v.text || ''; extra.tint = v.tint || 'cream';
                            if (v.title) extra.name = String(v.title).slice(0, 40); }
  if (i.kind === 'page')  { extra.rule = v.rule || 'set';
                            if (v.title) extra.name = String(v.title).slice(0, 40); }
  if (i.kind === 'model') { extra.model = v.model || null;
                            extra.name = modelName(v.model); }
  if (i.kind === 'art') {
    extra.src = v.src || '';
    extra.art = v.art || '';
    extra.name = i.name || 'Art';
    /* A LIBRARY PICTURE HAS NOT BEEN MEASURED YET. Put it down square, then
       measure it and let the model correct the box. */
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
      return t;
    }
  }
  return T().put(extra);
}

/* the camera goes to the scene you just made, so you can see it — two
   frames, because the sheet has to have been laid out to be measured */
function afterScene() {
  /* the muster first: it narrows the table's view, and the fight has to be
     framed in the view that is left (73-encounters.js has the same order) */
  if (root.Muster) root.Muster.open();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const el = doc.getElementById('combat-prop');
    if (el && el.style.display !== 'none' && root.Table3D) root.Table3D.frame(el);
  }));
}

const modelName = id => {
  const m = id && root.Library && root.Library.models.get(id);
  return m ? m.name : 'Model';
};

/* the fields of what was chosen that belong to a scene's setup — asked of
   the scene's own declaration, so nothing is written twice */
function pickSetup(kind, v) {
  const def = C().SCENES[kind];
  const out = {};
  if (!def) return out;
  def.setup.forEach(f => { if (v[f.key] !== undefined && v[f.key] !== '') out[f.key] = v[f.key]; });
  return out;
}

/* the count badge is gone with the rest of the bin; kept as a no-op because
   older callers still call it */
function paintBin() {}

root.Toolbox = { mount, open, shut, toggle, isOpen, gate, paintBin, take,
                 offerings, options, blankToken, KINDS };

})(window, document);
