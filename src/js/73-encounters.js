/* ══════════════════════════════════════════════════════════════
   73-encounters.js — FIGHTS MADE BEFORE THE EVENING.

   grumkata: "preset combat scenes where gm makes a preset board and
   then bring it to the table for combat".

   Every fight used to be built at the table, in front of the players:
   put a scene down, then carry the enemy out of the box one counter at
   a time and drop each on its line. That is ten minutes of the GM
   setting up while everybody waits — and a prepared ambush is prepared
   because it should arrive all at once.

   So a fight on the table can be KEPT (the tray's Fights tab, +) and
   brought back in one move — out of the toolbox's Scenes, where every
   prepared fight is a tile — landing already dressed and already manned,
   so a good one can be run again another night. (There used to be a WAR
   ROOM to build them in ahead of time; it was cut for 1.1, and the saved
   fights it kept are untouched.)

   A prepared fight is DATA, and it is the same data a scene on the
   table is made of:

     { id, name, width, terrain,
       lines:    the scene's own lines, empty         (21-table-content.js)
       units:    [{ line, col, ...a counter's spec }] (43-tokens.js make)
       notes }
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const T = () => root.TableModel;
const C = () => root.TableContent;
const KEY = 'monarchy.encounters.v1';
const uid = () => 'enc' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ══ THE STORE ════════════════════════════════════════════════ */
let cache = null;
function all() {
  if (cache) return cache;
  try { const v = JSON.parse(root.localStorage.getItem(KEY)); cache = Array.isArray(v) ? v : []; }
  catch (e) { cache = []; }
  return cache;
}
function persist() {
  try { root.localStorage.setItem(KEY, JSON.stringify(all())); return true; }
  catch (e) { say('Could not keep that — the store is full'); return false; }
}
const list = () => all().slice().sort((a, b) => (b.changed || 0) - (a.changed || 0));
const get = id => all().find(e => e.id === id) || null;

/* a fight made from nothing: the rules' eight lines, the meadow, eight wide */
function blank(name) {
  return { id: uid(), name: name || 'A new fight', width: 8, terrain: 'meadow',
           lines: C().blankLines().map(l => ({ key: l.key, side: l.side, label: l.label,
                                                depth: l.depth, front: !!l.front })),
           units: [], notes: '', made: Date.now(), changed: Date.now() };
}
/* cleaned on the way in: a hand-edited or older copy still opens */
function clean(e) {
  const b = blank();
  const out = Object.assign(b, e || {});
  out.width = Math.max(3, Math.min(14, parseInt(out.width, 10) || 8));
  out.terrain = C().terrainOf(out.terrain);
  if (!Array.isArray(out.lines) || !out.lines.length) out.lines = b.lines;
  out.units = (Array.isArray(out.units) ? out.units : []).filter(u => u && out.lines.some(l => l.key === u.line));
  delete out.features;                    /* the ground's marks are gone (cover, water...): older copies still open */
  return out;
}
function save(e) {
  const c = clean(e);
  c.changed = Date.now();
  const i = all().findIndex(x => x.id === c.id);
  if (i >= 0) all()[i] = c; else all().push(c);
  persist();
  if (root.Hand) root.Hand.refresh();
  return c;
}
function rename(id, name) {
  const e = get(id), n = String(name || '').trim().slice(0, 40);
  if (!e || !n) return false;
  e.name = n; e.changed = Date.now(); persist();
  if (root.Hand) root.Hand.refresh();
  return true;
}
function remove(id) {
  const i = all().findIndex(x => x.id === id);
  if (i < 0) return false;
  all().splice(i, 1); persist();
  if (root.Hand) root.Hand.refresh();
  return true;
}

/* ══ FROM THE TABLE ═══════════════════════════════════════════
   The fight on the table, written down as a prepared one: its ground,
   its lines, where everybody stands and what they are. */
/* ── WHO GOES INTO A PREPARED FIGHT ────────────────────────────
   A fight saved off the table is going to be run again, another night,
   probably with a different party. So which of the counters standing on
   it belong in the saved copy is a real choice, not a detail:

     · a PLAYER'S CHARACTER (t.source === 'char') is tied to a record,
       and next time the record will have moved on — and it may be a
       different player's character in that seat altogether;
     · a unit that has been HURT would be saved hurt, and the next time
       the fight is brought out it would open with the enemy already
       half dead.

   keepInPreset decides the first; unitOf below writes the spec. */
function keepInPreset(t) {
  // TODO(grumkata): the rule for who is saved into a prepared fight.
  // Right now: everyone except player characters. You may want the players'
  // own positions kept (for a scripted ambush), or only enemies kept (so the
  // allies are always whoever turns up), or formations only.
  return t.source !== 'char';
}
function unitOf(t, line, col) {
  const e = t.ent || {};
  const u = { line, col, name: t.name, side: e.side, entKind: e.kind || 'unit',
           hpMax: e.max, bodies: e.total, hpea: e.hpea, dmg: e.dmg, skl: e.skl,
           def: e.def, lead: e.lead, leadership: e.leadership, look: t.look || 'standee',
           fig: t.fig || '', src: t.src || '', art: t.art || '', info: t.info || '' };
  ['sta', 'str', 'av', 'move'].forEach(k => { if (e[k] != null) u[k] = e[k]; });
  if ((e.cond || []).length) u.cond = e.cond.map(c => ({ n: c.n, c: c.c }));
  return u;
}
function fromScene(s, name) {
  if (!s || s.kind !== 'scene' || s.scene !== 'combat') return null;
  const e = blank(name || (s.name && s.name !== 'Combat' ? s.name : 'A fight kept ' + new Date().toLocaleDateString()));
  e.width = s.setup.width; e.terrain = s.setup.terrain;
  const A = root.Battle.arrange(s);
  e.lines = A.g.lines.map(l => ({ key: l.key, side: l.side, label: l.label, depth: l.depth, front: !!l.front }));
  /* who stands where, in the order they stand (the place in the line is its index) */
  A.rows.forEach(row => row.pieces.forEach((t, i) => { if (keepInPreset(t)) e.units.push(unitOf(t, row.line.key, i)); }));
  return save(e);
}

/* ══ TO THE TABLE ═════════════════════════════════════════════
   The whole fight, in one move: the scene fitted to the wood with its
   ground and width, its lines, its features, and a counter for every
   unit standing where it was put — then it is the fight that is running.
   A fight already running is stood down, not thrown away: it stays on
   the table as it was. */
function toTable(id, opts) {
  opts = opts || {};
  const e = get(id);
  if (!e || !T().mayUseBox()) return null;
  const def = C().SCENES.combat, sz = def.size;
  T().begin();
  let sc;
  try {
    sc = T().put({ kind: 'scene', scene: 'combat',
                   setup: { width: e.width, terrain: e.terrain },
                   name: (opts.name || e.name || 'Combat').slice(0, 40),
                   x: Math.round((T().TW - sz.w) / 2), y: Math.round((T().TH - sz.h) / 2),
                   w: sz.w, h: sz.h, locked: true });
    sc.lines = e.lines.map(l => Object.assign({}, l));
    (e.units || []).forEach(u => {
      if (!root.Tokens) return;
      const t = root.Tokens.make({
        source: u.entKind === 'form' ? 'form' : 'npc', name: u.name, side: u.side,
        entKind: u.entKind, hp: u.hpMax, max: u.hpMax, bodies: u.bodies, hpea: u.hpea,
        dmg: u.dmg, skl: u.skl, def: u.def, lead: u.lead, leadership: u.leadership, look: u.look, fig: u.fig,
        src: u.src, art: u.art, info: u.info, sta: u.sta, str: u.str, av: u.av, move: u.move, x: 0, y: 0 });
      t.in = sc.id; t.lineKey = u.line;
      if (t.ent) {
        const l = sc.lines.find(x => x.key === u.line);
        const ent = Object.assign({}, t.ent); delete ent.q; delete ent.f; delete ent.col;
        ent.ord = u.col == null ? 0 : u.col; ent.done = false; if (u.side) ent.side = u.side === 'en' ? 'en' : 'al';
        if (Array.isArray(u.cond) && u.cond.length) ent.cond = u.cond.map(c => ({ n: c.n, c: c.c }));
        t.ent = ent;
      }
    });
    T().activate(sc.id);
  } finally { T().end(); }
  T().changed('encounter');
  frameFight();
  say(e.name + ' is on the table');
  return sc;
}

function say(t) { if (root.Inspector) root.Inspector.said(t); }

/* the camera goes to the board, at the angle a fight is looked at from */
function frameFight() {
  if (root.BattleView) root.BattleView.frameSoon();
}

root.Encounters = { list, get, save, remove, rename, blank, fromScene, toTable, keepInPreset, KEY };

})(window, document);
