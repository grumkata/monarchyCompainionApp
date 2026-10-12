/* ══════════════════════════════════════════════════════════════
   80-battle.js — THE FIGHT, AS DATA.

   This replaces 32-combat-app.js, 40-combat-scene.js, 41-lines-edit.js and
   72-muster.js. Those four kept a second copy of the fight in a global `S`,
   drew it as a CSS sheet, and made every change by reaching into the arrays
   and calling render(). Nothing it did could be undone and half of it did not
   reach the other seats.

   There is no second copy here. The fight is what the TABLE already holds:

     the SCENE   a `kind:'scene', scene:'combat'` thing. It carries
                 lines   the lines, back to front, enemy half then ally half
                 setup   { width, terrain }
                 options { mana }
                 fight   { round, cover }   (a turn is just a number)
                 and its own footprint on the wood (x, y, w, h)
     the PIECES  `kind:'token'` things whose `in` is that scene. Each carries
                 `lineKey` (which line) and an `ent`: its name, health,
                 tokens, whether it has acted, its place in the line (`ord`).

   Every change goes through TableModel.patch, so every one is a single
   undoable step, goes over the wire like any other change to a thing (per
   piece, never the whole board), and is saved with the table.

   No DOM in this file. 81-battle-view.js draws it, 82-battle-ui.js drives
   it. The rules are never edited: damage goes through RULES.damageMods, the
   end of a round through RULES.tickTokens, the start of a fight through
   RULES.startingDodge.
══════════════════════════════════════════════════════════════ */
(function (root) {
'use strict';

const T = () => root.TableModel;
const C = () => root.TableContent;
const R = () => root.RULES;

/* ══ THE BOARD'S MEASUREMENTS ═════════════════════════════════
   Table units, two to the millimetre (23-table3d.js), so a line is 7.5 cm
   across and a slot 6.6 cm deep: a miniature's base is 4.6 cm.

   The lines stand side by side, allies on the left and enemies on the right
   with The Line between; the pieces in a line stand one behind another, down
   the screen. A board of eight lines and eight slots is about 66 cm across —
   it sits well inside a 2.2 m table, with room for the controls under it. */
const G = {
  LW: 144,        /* one line's width: eight of them and the wood round them are a little under a third of the table */
  SP: 132,        /* one slot's depth: what a full line shares out */
  SPMAX: 190,     /* the most room one piece is given, so a line of two or three is not crowded into a heap */
  FRAME: 64,      /* the wood round the felt */
  STRIP: 160,     /* the wood under the felt, for the rail of figures and the mana */
  MINW: 1120,     /* ...and the least width a board is given */
  BASE: 46,       /* a base's radius */
  FIG: 144,       /* a standee's height */
  HEAD: 150       /* the box above the felt, so a far figure's head is still inside it */
};
const WIDTH_MIN = 3, WIDTH_MAX = 14, WIDTH_DEFAULT = 8;

/* ══ THE SCENE ════════════════════════════════════════════════ */
function scene() {
  const m = T(); if (!m) return null;
  const s = m.activeScene();
  return s && s.scene === 'combat' ? s : null;
}
const clampN = (v, lo, hi, d) => { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };

/* THE LINES. There are always eight, four to a side, and nothing changes
   that: only how many a line holds. Whatever a scene was saved with, they come
   out as these eight (same keys, so a piece keeps its line), with the labels the
   rules use. Done IN PLACE and quietly, once: it is what is already there,
   tidied, not a change anybody made. */
const LINE_KEYS = ['e-back', 'e-supp', 'e-sec', 'e-front', 'a-front', 'a-sec', 'a-supp', 'a-back'];
const LINE_NAMES = ['Backline', 'Support', 'Secondary', 'Frontline', 'Frontline', 'Secondary', 'Support', 'Backline'];
function eightLines() {
  return LINE_KEYS.map((key, i) => {
    const en = i < 4, k = en ? i : 7 - i;           /* k: 0 for the backline .. 3 for the frontline */
    return { key, side: en ? 'en' : 'al', label: LINE_NAMES[i], depth: k, front: k === 3 };
  });
}
function normLines(s) {
  const out = eightLines();
  const same = Array.isArray(s.lines) && s.lines.length === 8 &&
    out.every((l, i) => { const o = s.lines[i]; return o && o.key === l.key && o.side === l.side && o.depth === l.depth
      && !!o.front === l.front && o.label === l.label && !o.ents; });
  if (!same) s.lines = out;
  return s.lines;
}

/* The fight's own state, with its defaults: which turn it is, and whether the board
   is still under the cloth. There are no phases: a turn is a turn. */
function fightOf(s) {
  const f = s.fight || {};
  return { round: Math.max(1, parseInt(f.round, 10) || 1), cover: !!f.cover };
}
function optionsOf(s) {
  const o = s.options || {};
  /* how much of the other side players see is not a setting: the rules say they know every number */
  return { mana: Math.max(0, parseInt(o.mana, 10) || 0) };
}

/* The scene's footprint on the wood and the board's own geometry, from its
   lines and its width. Pure. */
function geometry(s) {
  const lines = normLines(s);
  const n = lines.length;
  const width = clampN(s.setup && s.setup.width, WIDTH_MIN, WIDTH_MAX, WIDTH_DEFAULT);
  const bw = n * G.LW, bh = width * G.SP;
  const W = Math.max(bw + 2 * G.FRAME, G.MINW), Hb = bh + 2 * G.FRAME, H = G.HEAD + Hb + G.STRIP;
  return { lines, n, width, bw, bh, W, H, Hb };
}
/* where a line stands, across the board (centre of the felt = 0) */
const lineX = (g, i) => -g.bw / 2 + (g.n - 1 - i + 0.5) * G.LW;
const lineIndex = (g, key) => g.lines.findIndex(l => l.key === key);

/* ══ THE PIECES ═══════════════════════════════════════════════ */
const pieceThings = sid => T().state.things.filter(t => t.kind === 'token' && t.in === sid && t.ent);
const weightOf = e => (e.kind === 'unit' ? 1 : 2);

/* which line a piece is in: its own — ANY line, an ally may stand in the enemy's and a foe in the allies':
   whose a piece is, and where it stands, are two things — or, if that line is gone (a piece with
   none yet), the front of its own side, so nobody is ever drawn nowhere */
function lineFor(g, t) {
  let i = lineIndex(g, t.lineKey);
  if (i >= 0) return i;
  const mine = g.lines.map((l, k) => [l, k]).filter(([l]) => l.side === t.ent.side);
  const front = mine.find(([l]) => l.front) || mine[0];
  return front ? front[1] : 0;
}

/* Everything a view needs, in one pass: each line with its pieces in order and
   where each one stands (x, z on the board; the middle of the felt is 0,0). */
function arrange(s) {
  const g = geometry(s);
  const per = g.lines.map(l => ({ line: l, pieces: [] }));
  pieceThings(s.id).forEach(t => { per[lineFor(g, t)].pieces.push(t); });
  const hin = g.bh;
  per.forEach((row, i) => {
    row.pieces.sort((a, b) => ((a.ent.ord == null ? 1e9 : a.ent.ord) - (b.ent.ord == null ? 1e9 : b.ent.ord)) ||
                              (a.id < b.id ? -1 : 1));
    const total = row.pieces.reduce((n, t) => n + weightOf(t.ent), 0);
    const sp = total ? Math.min(G.SPMAX, hin / total) : G.SP;
    let cum = 0;
    row.x = lineX(g, i); row.sp = sp; row.total = total;
    row.placed = row.pieces.map((t, k) => {
      const w = weightOf(t.ent);
      const z = -total * sp / 2 + (cum + w / 2) * sp; cum += w;
      return { t, e: t.ent, x: row.x, z, w, span: w * sp, line: row.line.key, idx: k };
    });
  });
  return { s, g, rows: per, fight: fightOf(s), options: optionsOf(s) };
}
const flat = A => A.rows.reduce((a, r) => a.concat(r.placed), []);

/* the line (index) a point on the board is over, and where along it */
function lineAtX(g, x) {
  const i = g.n - 1 - Math.floor((x + g.bw / 2) / G.LW);
  return (i >= 0 && i < g.n) ? i : -1;
}
/* the slot a piece dropped at depth z would take among the others in a line */
function indexAtZ(row, z, exceptId) {
  const others = row.placed.filter(p => p.t.id !== exceptId);
  let k = 0;
  while (k < others.length && others[k].z < z) k++;
  return k;
}

/* ══ WHO MAY DO WHAT ══════════════════════════════════════════ */
const isGM = () => !!(T() && T().mayUseBox());
/* A player's own piece is the counter they put down themselves (64-kit.js
   stamps `by` on it) — the same rule as every other piece on the wood. */
function isMine(t) {
  if (!t || !T()) return false;
  if (isGM()) return true;
  return !!(T().playerMayTouch && T().playerMayTouch(t));
}
const fail = why => ({ ok: false, why });
const done = (o) => Object.assign({ ok: true }, o);

/* ══ CHANGING A PIECE ═════════════════════════════════════════
   Copy on write, one undo step each (the history keeps the old `ent` as its
   `before`, so it must never be mutated in place). */
function atomic(fn) { const m = T(); m.begin(); try { return fn(); } finally { m.end(); } }
function upd(t, f) { return T().patch(t.id, { ent: Object.assign({}, t.ent, f) }); }
const copyCond = e => (e.cond || []).map(c => ({ n: c.n, c: c.c }));

/* ══ WHAT A TOKEN DOES, BY ITSELF ═════════════════════════════
   The rules give some tokens a number (Hardened takes half of the next hit,
   Vulnerable a half again, Inspiration adds half to the next attack, Bleed hurts
   at the end of the turn) and some a plain fact (Rooted cannot move, Stun loses a
   turn). Those are applied here, to units AND formations, when they matter, so
   nobody at the table has to remember them. effectsOf says which are in play on
   a piece, for whoever wants to show it. */
const withId = t => Object.assign({}, t.ent, { id: t.id });
function effectsOf(e) {
  const defs = (R() && R().TOKENS) || {};
  return (Array.isArray(e) ? e : (e && e.cond) || []).map(c => {
    const d = defs[c.n] || {}, auto = [];
    if (d.damageTaken != null) auto.push('next hit ×' + d.damageTaken);
    if (d.damageDealt != null) auto.push('next attack ×' + d.damageDealt);
    if (d.tick) auto.push(c.c + ' damage at the end of the turn');
    if (c.n === 'Rooted' || c.n === 'Immobilize') auto.push('cannot be moved');
    if (c.n === 'Stun') auto.push('loses the next turn');
    return { n: c.n, c: c.c, text: d.text || '', auto: auto.join(' · ') };
  });
}
const stuckBy = e => ['Rooted', 'Immobilize'].find(n => (e.cond || []).some(c => c.n === n && c.c > 0)) || null;

/* what a hit WILL do, before it lands: the tokens on the target speak first
   (RULES.damageMods), and on the one who struck if there is one, then Ward takes
   what it can. For a formation the damage is what the rules call it at the
   formation, and bodies fall to it (formationHit) when it lands. Pure. */
function preview(e, amount, o) {
  o = o || {};
  const n = Math.max(0, Math.round(+amount) || 0);
  const te = e.id ? e : Object.assign({}, e, { id: '__target' });
  const ae = o.attacker ? (o.attacker.id ? o.attacker : Object.assign({}, o.attacker, { id: '__attacker' })) : null;
  let m = { dealt: 1, taken: 1, spend: [], why: [] };
  if (!o.ignore && R() && R().damageMods) m = R().damageMods(ae, te);
  const eff = Math.max(0, Math.round(n * m.dealt * m.taken));
  const spend = m.spend.filter(s => s.who === te.id).map(s => s.token);
  const spendA = ae ? m.spend.filter(s => s.who === ae.id).map(s => s.token) : [];
  if (e.kind === 'form') {
    const each = Math.max(1, parseInt(e.hpea, 10) || 1);
    return { n, eff, why: m.why.slice(), spend, spendA, ward: 0, form: true, alive: e.alive | 0,
             atRisk: o.aoe ? Math.floor(eff / each) : (eff > each ? 1 : 0) };
  }
  const ward = Math.min(e.ward | 0, eff);
  return { n, eff, why: m.why.slice(), spend, spendA, ward, hp: Math.max(0, (e.hp | 0) - (eff - ward)) };
}

function spendTokens(cond, names) {
  const out = cond.map(c => ({ n: c.n, c: c.c }));
  names.forEach(n => { const c = out.find(x => x.n === n); if (c) c.c -= 1; });
  return out.filter(c => c.c > 0);
}

/* A hit. o.from is the piece that struck (the GM has it picked and points at the
   target): its own tokens count too, and are used up. */
function hit(id, amount, o) {
  o = o || {};
  const t = T().get(id); if (!t || !t.ent) return fail('nobody there');
  if (!isMine(t)) return fail('not yours to change');
  const n = Math.max(0, Math.round(+amount) || 0);
  if (!n) return fail('nothing to take');
  const att = (o.from && o.from !== id && isGM()) ? T().get(o.from) : null;
  const e = withId(t);
  const p = preview(e, n, { ignore: o.ignore, aoe: o.aoe, attacker: att && att.ent ? withId(att) : null });
  let out;
  atomic(() => {
    if (e.kind === 'form') {
      const r = R().formationHit({ id: e.id, alive: e.alive | 0, hpea: e.hpea, def: e.def }, p.eff, { aoe: !!o.aoe }, o.rng);
      const alive = Math.max(0, (e.alive | 0) - r.dead);
      upd(t, { alive, cond: spendTokens(copyCond(e), p.spend) });
      out = done({ id, name: e.name, n, eff: p.eff, why: p.why, form: true, dead: r.dead, atRisk: r.atRisk, text: r.text,
                   saves: r.saves, alive, total: e.total | 0, down: alive === 0 && (e.alive | 0) > 0 });
    } else {
      const hp0 = e.hp | 0;
      const hp = Math.max(0, hp0 - (p.eff - p.ward));
      upd(t, { hp, ward: (e.ward | 0) - p.ward, cond: spendTokens(copyCond(e), p.spend) });
      out = done({ id, name: e.name, n, eff: p.eff, ward: p.ward, why: p.why, spent: p.spend,
                   from: hp0, hp, max: e.max | 0, down: hp === 0 && hp0 > 0 });
    }
    if (att && att.ent && p.spendA.length) upd(att, { cond: spendTokens(copyCond(att.ent), p.spendA) });
  });
  if (att && out) out.by = att.ent.name;
  return out;
}

function heal(id, amount) {
  const t = T().get(id); if (!t || !t.ent) return fail('nobody there');
  if (!isMine(t)) return fail('not yours to change');
  const e = t.ent, n = Math.max(0, Math.round(+amount) || 0);
  if (!n) return fail('nothing to give');
  if (e.kind === 'form') {
    const alive = Math.min(e.total | 0, (e.alive | 0) + n);
    atomic(() => upd(t, { alive }));
    return done({ id, name: e.name, n, form: true, alive, total: e.total | 0 });
  }
  const hp0 = e.hp | 0, hp = Math.min(e.max | 0, hp0 + n);
  atomic(() => upd(t, { hp }));
  return done({ id, name: e.name, n, eff: hp - hp0, from: hp0, hp, max: e.max | 0 });
}

/* a token, one more or one fewer. Known names only: a typo must not invent a
   condition the rules have never heard of. */
function token(id, name, delta) {
  const t = T().get(id); if (!t || !t.ent) return fail('nobody there');
  if (!isMine(t)) return fail('not yours to change');
  if (!R() || !R().TOKENS[name]) return fail('no such token');
  const cond = copyCond(t.ent);
  const c = cond.find(x => x.n === name);
  if (c) c.c += delta | 0; else if ((delta | 0) > 0) cond.push({ n: name, c: delta | 0 });
  const next = cond.filter(x => x.c > 0);
  atomic(() => upd(t, { cond: next }));
  const now = next.find(x => x.n === name);
  return done({ id, name: t.ent.name, token: name, count: now ? now.c : 0, delta: delta | 0 });
}

/* What a piece has spent of its turn: one quick action and one full action (the rules'
   own; a full one can be given up for a second quick, which is the GM marking both).
   "Has acted" is both of them spent. A piece saved with only "done" has spent both. */
const actsOf = e => ({ quick: e.qa != null ? !!e.qa : !!e.done, full: e.fa != null ? !!e.fa : !!e.done });
function setAct(id, which, v) {
  const t = T().get(id); if (!t || !t.ent) return fail('nobody there');
  if (!isMine(t)) return fail('not yours to change');
  if (which !== 'quick' && which !== 'full') return fail('no such action');
  const a = actsOf(t.ent);
  a[which] = v == null ? !a[which] : !!v;
  atomic(() => upd(t, { qa: a.quick, fa: a.full, done: a.quick && a.full }));
  return done({ id, quick: a.quick, full: a.full, done: a.quick && a.full });
}
/* the whole turn at once: both spent, or both free */
function setDone(id, v) {
  const t = T().get(id); if (!t || !t.ent) return fail('nobody there');
  if (!isMine(t)) return fail('not yours to change');
  const want = v == null ? !(actsOf(t.ent).quick && actsOf(t.ent).full) : !!v;
  atomic(() => upd(t, { qa: want, fa: want, done: want }));
  return done({ id, done: want, quick: want, full: want });
}

/* hide a piece from the players: they do not see it at all until it is shown again */
function setHidden(id, v) {
  const t = T().get(id); if (!t || !t.ent) return fail('nobody there');
  if (!isGM()) return fail('the GM\'s call');
  const want = v == null ? !t.ent.hidden : !!v;
  atomic(() => upd(t, { hidden: want }));
  return done({ id, hidden: want });
}

/* the numbers a unit is fought with, typed in: GM for anyone, a player for their own */
const NUM = { sta: [0, 99], str: [0, 99], av: [0, 99], move: [0, 9], ward: [0, 999], exh: [0, 99], alive: [0, 999] };
function setVital(id, key, value) {
  const t = T().get(id); if (!t || !t.ent) return fail('nobody there');
  if (!isMine(t)) return fail('not yours to change');
  let r = NUM[key]; if (!r) return fail('no such number');
  const f = {};
  if (key === 'alive') {                                        /* how many of a formation are standing */
    if (t.ent.kind !== 'form') return fail('not a formation');
    r = [0, t.ent.total | 0];
    f.alive = Math.max(r[0], Math.min(r[1], parseInt(value, 10) || 0));
  } else if (value === '' || value == null) f[key] = null;
  else f[key] = Math.max(r[0], Math.min(r[1], parseInt(value, 10) || 0));
  atomic(() => upd(t, f));
  return done({ id, key, value: f[key] });
}
/* A formation's MORALE is a number out of a hundred (its leadership: a d100 is rolled under it) and
   a place on the ladder the rules lay down: Stable, Wavering, Crumbling, Broken, or Unbreakable
   (leadership 100, which never tests). The number is set by hand; the ladder moves when a test
   fails or two pass in a row (testMorale), or by hand. */
const LADDER = ['Stable', 'Wavering', 'Crumbling', 'Broken'];
function setLead(id, lead) {
  const t = T().get(id); if (!t || !t.ent || t.ent.kind !== 'form') return fail('not a formation');
  if (!isGM()) return fail('the GM\'s call');
  const L = (root.Tokens && root.Tokens.LEADS) || ['Unbreakable', 'Stable', 'Wavering', 'Crumbling', 'Broken'];
  if (L.indexOf(lead) < 0) return fail('no such morale');
  const f = { lead, leadFails: Math.max(0, LADDER.indexOf(lead)), leadStreak: 0, routed: false };
  if (lead === 'Unbreakable') f.leadership = 100;
  atomic(() => upd(t, f));
  return done({ id, lead });
}
function setMorale(id, n) {
  const t = T().get(id); if (!t || !t.ent || t.ent.kind !== 'form') return fail('not a formation');
  if (!isGM()) return fail('the GM\'s call');
  const v = Math.max(0, Math.min(100, parseInt(n, 10) || 0));
  const f = { leadership: v };
  if (v >= 100) f.lead = 'Unbreakable';
  else if (t.ent.lead === 'Unbreakable') { f.lead = 'Stable'; f.leadFails = 0; f.leadStreak = 0; }
  atomic(() => upd(t, f));
  return done({ id, morale: v });
}
/* a morale test, by the rules: d100 under the number; a fail steps down the ladder, two passes in a row step back up */
function testMorale(id, rng) {
  const t = T().get(id); if (!t || !t.ent || t.ent.kind !== 'form') return fail('not a formation');
  if (!isGM()) return fail('the GM\'s call');
  if (!R() || !R().leadershipTest) return fail('no rules to roll with');
  const e = t.ent;
  const out = R().leadershipTest({ id, leadership: e.leadership | 0, leadFails: e.leadFails | 0, leadStreak: e.leadStreak | 0, unbreakable: e.lead === 'Unbreakable' }, rng);
  const state = e.lead === 'Unbreakable' ? 'Unbreakable' : (out.shattered ? 'Broken' : out.state);
  atomic(() => upd(t, { lead: state, leadFails: out.fails | 0, leadStreak: out.streak | 0, routed: !!out.routed }));
  return done({ id, name: t.name || e.name, roll: out.roll, vs: e.leadership | 0, pass: !!out.pass, state, routed: !!out.routed, notes: out.notes || [] });
}

/* A formation's attack, by the rules: one d6 per living body, hits at its Attack Skill,
   damage hits x Attack Value, thrown at a whole line. Rolled here and told; it is
   the GM's to apply to whoever stands in that line. */
function formationAttack(id) {
  const t = T().get(id); if (!t || !t.ent || t.ent.kind !== 'form') return fail('not a formation');
  if (!isGM()) return fail("the GM's call");
  if (!R() || !R().formationAttack) return fail('no rules to roll with');
  const e = t.ent, skill = parseInt(String(e.skl), 10);
  const r = R().formationAttack({ alive: e.alive | 0, attackSkill: Number.isFinite(skill) ? skill : 4, attackValue: Math.max(1, parseInt(e.dmg, 10) || 1) });
  return done({ id, name: t.name || e.name, text: r.text, hits: r.hits, damage: r.damage, dice: r.dice, spread: r.spread });
}

/* ══ WHERE A PIECE STANDS ═════════════════════════════════════
   Into a line, at a place in it. `index` is among the line's OTHER pieces.
   Order is a number, so putting one between two is a halving, not a reshuffle
   of everybody — and nobody else's piece is written to. */
function nextOrd(row, index, exceptId) {
  const others = row.pieces.filter(t => t.id !== exceptId);
  const ord = t => (t.ent.ord == null ? 0 : t.ent.ord);
  if (!others.length) return 0;
  if (index <= 0) return ord(others[0]) - 1;
  if (index >= others.length) return ord(others[others.length - 1]) + 1;
  return (ord(others[index - 1]) + ord(others[index])) / 2;
}
/* ══ HOW MANY A LINE HOLDS ════════════════════════════════════
   A line holds `width` places; a unit takes one and a big one or a formation
   takes two. Asked for a line that is full, a piece goes to the next one back
   from it, then the next one forward, in that half of the board — and if the
   whole half is full, nowhere. */
function roomIn(A, i) { return Math.max(0, A.g.width - A.rows[i].total); }
function nextRoom(A, half, wantKey, w) {
  const idx = A.g.lines.map((l, k) => k).filter(k => A.g.lines[k].side === half);
  const order = half === 'en' ? idx.slice().reverse() : idx;      /* front .. back */
  let at = order.findIndex(k => A.g.lines[k].key === wantKey); if (at < 0) at = 0;
  const tryOrder = order.slice(at).concat(order.slice(0, at).reverse());
  const hit = tryOrder.find(k => roomIn(A, k) >= w);
  return hit == null ? -1 : hit;
}
/* Where a piece of weight w would stand at \`index\` among a line's OTHER pieces, and where each of those
   would be pushed to make room: for showing it before it is let go. \`exceptId\` is the piece being moved
   (so it is not counted twice in its own line). Pure. */
function slotLayout(A, li, index, weight, exceptId) {
  const row = A.rows[li], others = row.pieces.filter(t => t.id !== exceptId);
  const list = others.map(t => ({ id: t.id, w: weightOf(t.ent) }));
  const at = Math.max(0, Math.min(list.length, index == null ? list.length : index));
  list.splice(at, 0, { id: null, w: weight });
  const total = list.reduce((n, q) => n + q.w, 0), sp = Math.min(G.SPMAX, A.g.bh / total);
  let cum = 0, z = 0; const shifts = {};
  list.forEach(q => { const zz = -total * sp / 2 + (cum + q.w / 2) * sp; cum += q.w; if (q.id) shifts[q.id] = zz; else z = zz; });
  return { x: row.x, z, sp, shifts, at };
}
function move(id, lineKey, index, o) {
  const t = T().get(id); if (!t || !t.ent) return fail('nobody there');
  if (!isGM()) return fail('the GM moves the pieces');
  const s = scene(); if (!s || t.in !== s.id) return fail('not in the fight');
  const A = arrange(s), i = lineIndex(A.g, lineKey);
  if (i < 0) return fail('no such line');
  const row = A.rows[i];
  if (t.lineKey !== lineKey && roomIn(A, i) < weightOf(t.ent)) return fail('that line is full');
  const stuck = t.lineKey !== lineKey && !(o && o.force) && stuckBy(t.ent);
  if (stuck) return fail((t.ent.name || 'It') + ' is ' + stuck + ' and cannot move');
  const at = index == null ? row.pieces.filter(x => x.id !== id).length : index;
  const ord = nextOrd(row, at, id);
  const same = t.lineKey === lineKey && t.ent.ord === ord;
  if (same) return done({ id, line: lineKey, same: true });
  /* where it stands is the line's; whose it is stays its own (an ally may stand in the enemy's line) */
  atomic(() => {
    T().patch(id, { lineKey, ent: Object.assign({}, t.ent, { ord }) });
  });
  return done({ id, name: t.ent.name, line: lineKey, label: row.line.label, side: t.ent.side });
}
/* whose it is: the GM's call (a charmed foe, an ally who turns), and it does not move it */
function setSide(id, side) {
  const t = T().get(id); if (!t || !t.ent) return fail('nobody there');
  if (!isGM()) return fail('the GM\'s call');
  const s = scene(); if (!s || t.in !== s.id) return fail('not in the fight');
  const v = side === 'en' ? 'en' : 'al';
  if (t.ent.side === v) return done({ id, side: v, same: true });
  atomic(() => T().patch(id, { ent: Object.assign({}, t.ent, { side: v }) }));
  return done({ id, name: t.ent.name, side: v });
}

/* ══ BRINGING PIECES ON AND TAKING THEM OFF ═══════════════════
   A spec is what 43-tokens.js's make() takes, plus `cond`. Several at once is
   one undo. They arrive at the front of their side (or where they are put),
   after whoever is there. */
const FRONT_OF = (g, side) => { const m = g.lines.filter(l => l.side === side); return (m.find(l => l.front) || m[0]).key; };

function deployOne(s, spec, o) {
  o = o || {};
  const A = arrange(s);
  const side = o.side || spec.side || 'en';                       /* whose it is */
  let want = o.line || FRONT_OF(A.g, side);                      /* where it is put: any line, whoever's it is */
  let li = lineIndex(A.g, want);
  if (li < 0) { want = FRONT_OF(A.g, side); li = lineIndex(A.g, want); }
  li = nextRoom(A, A.g.lines[li].side, want, spec.entKind && spec.entKind !== 'unit' ? 2 : 1);
  if (li < 0) return null;
  const key = A.g.lines[li].key, row = A.rows[li];
  const mk = { x: 0, y: 0, side, name: spec.name, entKind: spec.entKind || 'unit',
               source: spec.char ? 'char' : ((spec.entKind === 'form') ? 'form' : 'npc'),
               look: spec.look === 'coin' ? 'coin' : 'standee', fig: spec.fig || '',
               src: spec.src || '', art: spec.art || '', info: spec.info || '' };
  ['char', 'hp', 'max', 'sta', 'str', 'av', 'move', 'bodies', 'hpea', 'dmg', 'skl', 'def', 'lead', 'leadership', 'by']
    .forEach(k => { if (spec[k] != null && spec[k] !== '') mk[k] = spec[k]; });
  const t = root.Tokens.make(mk);
  const e = Object.assign({}, t.ent);
  delete e.q; delete e.f; delete e.col; delete e.acted;
  e.side = side; e.done = false; e.qa = false; e.fa = false;
  e.ord = o.index != null ? nextOrd(row, o.index)
        : (row.pieces.length ? Math.max.apply(null, row.pieces.map(x => x.ent.ord || 0)) + 1 : 0);
  if (Array.isArray(spec.cond) && spec.cond.length) e.cond = spec.cond.map(c => ({ n: c.n, c: c.c }));
  if (spec.ward) e.ward = spec.ward | 0;
  t.ent = e; t.in = s.id; t.lineKey = key; t.locked = false;
  return t;
}

/* "Grave Serjeant" on a board that already has one becomes 1 and 2 */
function namesFor(s, base, n) {
  const esc = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('^' + esc + '(?: (\\d+))?$', 'i');
  const have = pieceThings(s.id).filter(t => re.test(t.name || ''));
  let top = have.reduce((m, t) => { const r = /(\d+)$/.exec(t.name || ''); return Math.max(m, r ? +r[1] : 1); }, 0);
  const numberedNow = have.length > 0 || n > 1;
  const rename = (numberedNow && have.length === 1 && !/\d+$/.test(have[0].name || '')) ? have[0] : null;
  if (rename) top = Math.max(top, 1);
  return { rename, names: Array.from({ length: n }, (_, i) => (numberedNow ? base + ' ' + (top + 1 + i) : base)) };
}
function deploy(spec, o) {
  o = o || {};
  const s = scene(); if (!s) return fail('no fight is running');
  if (!isGM()) return fail('the GM brings pieces in');
  const n = Math.max(1, Math.min(20, parseInt(o.n, 10) || 1));
  const base = String(spec.name || 'Someone').replace(/\s+\d+$/, '').slice(0, 32);
  const made = [];
  atomic(() => {
    const nm = namesFor(s, base, n);
    if (nm.rename) T().patch(nm.rename.id, { name: base + ' 1', ent: Object.assign({}, nm.rename.ent, { name: base + ' 1' }) });
    nm.names.forEach(name => { const t = deployOne(s, Object.assign({}, spec, { name }), o); if (t) made.push(t); });
  });
  T().changed('put');
  if (!made.length) return fail('that side is full');
  return done({ made: made.map(t => t.id), names: made.map(t => t.name), left: n - made.length });
}
/* a whole prepared fight on to the board, each piece to its own line */
function deployFight(units) {
  const s = scene(); if (!s) return fail('no fight is running');
  if (!isGM()) return fail('the GM brings pieces in');
  const made = [];
  atomic(() => {
    (units || []).forEach(u => {
      const key = s.lines && s.lines.some(l => l.key === u.line) ? u.line : null;
      const t = deployOne(s, Object.assign({}, u, { hp: u.hpMax != null ? u.hpMax : u.hp, max: u.hpMax != null ? u.hpMax : u.max }), { line: key, side: u.side });
      if (t) made.push(t);
    });
  });
  T().changed('put');
  return done({ made: made.map(t => t.id), n: made.length, left: (units || []).length - made.length });
}

/* A counter from the bare wood let go over a line joins the fight there; a
   piece pulled off the board goes back to standing on the wood where it was
   let go. One undo step each. */
function bring(id, lineKey, index) {
  const t = T().get(id); if (!t || t.kind !== 'token' || !t.ent) return fail('nobody there');
  if (!isGM()) return fail('the GM brings pieces in');
  const s = scene(); if (!s) return fail('no fight is running');
  const A = arrange(s), i = lineIndex(A.g, lineKey);
  if (i < 0) return fail('no such line');
  const row = A.rows[i];
  if (roomIn(A, i) < weightOf(t.ent)) return fail('that line is full');
  const e = Object.assign({}, t.ent); delete e.q; delete e.f; delete e.col; delete e.acted;
  e.done = false; e.qa = false; e.fa = false; e.ord = nextOrd(row, index == null ? row.pieces.length : index, id);
  atomic(() => T().patch(id, { in: s.id, lineKey, ent: e }));
  T().changed('put');
  return done({ id, name: t.name, line: lineKey, side: e.side });
}
function release(id, x, y) {
  const t = T().get(id); if (!t) return fail('nobody there');
  if (!isGM()) return fail('the GM takes pieces off');
  const e = t.ent ? Object.assign({}, t.ent) : null; if (e) { delete e.ord; }
  atomic(() => T().patch(id, Object.assign({ in: null, lineKey: null }, x != null ? { x: Math.round(x), y: Math.round(y) } : {}, e ? { ent: e } : {})));
  T().changed('put');
  return done({ id });
}

/* everybody off the board at once (one undo step brings them all back) */
function clear() {
  const s = scene(); if (!s) return fail('no fight is running');
  if (!isGM()) return fail("the GM's call");
  const ids = pieceThings(s.id).map(t => t.id);
  if (!ids.length) return fail('the board is already empty');
  atomic(() => ids.forEach(id => T().bin(id)));
  T().changed('put');
  return done({ n: ids.length });
}

/* off the field: binned, so Ctrl+Z puts it back */
function remove(id) {
  const t = T().get(id); if (!t || !t.ent) return fail('nobody there');
  if (!isGM()) return fail('the GM takes pieces off');
  const name = t.ent.name;
  const ok = T().bin(id);
  return ok ? done({ id, name }) : fail('kept');
}

/* ══ THE TURN ═════════════════════════════════════════════════ */
function setFight(s, f) { return T().patch(s.id, { fight: Object.assign(fightOf(s), f) }); }

/* Next turn. While the board is under the cloth that lifts it and starts turn one.
   Otherwise the turn ends, and what the rules say happens at the end of a turn
   happens to everybody in one undo step: Bleed, Blight and Fire go off and step
   down (a unit takes the damage, a formation loses bodies to it), the tokens that
   last a turn come off, two Daze become a Stun — and then the new turn begins:
   nobody has acted, and whoever is Stunned loses it and uses the Stun up. Returns
   what happened, for whoever shows it. */
function nextTurn() {
  const s = scene(); if (!s) return fail('no fight is running');
  if (!isGM()) return fail("the GM's call");
  if (fightOf(s).cover) return begin();
  return endTurn();
}
function endTurn() {
  const s = scene(); if (!s) return fail('no fight is running');
  if (!isGM()) return fail("the GM's call");
  const f = fightOf(s), ticks = [], lost = [];
  atomic(() => {
    pieceThings(s.id).forEach(t => {
      const e = withId(t), form = e.kind === 'form';
      let hp = e.hp | 0, alive = e.alive | 0, cond = copyCond(e), touched = !!(e.done || e.qa || e.fa);
      const out = R() && R().tickTokens ? R().tickTokens(e) : null;
      if (out && out.changes && out.changes.length) {
        touched = true;
        out.changes.forEach(c => {
          if (c.op !== 'token') return;
          const x = cond.find(q => q.n === c.token);
          if (x) x.c += c.delta | 0; else if ((c.delta | 0) > 0) cond.push({ n: c.token, c: c.delta | 0 });
        });
        cond = cond.filter(q => q.c > 0);
        if (out.damage) {
          if (form) {
            const r = R().formationHit({ id: e.id, alive, hpea: e.hpea, def: e.def }, out.damage, { aoe: true });
            ticks.push({ id: t.id, name: e.name, form: true, from: alive, hp: Math.max(0, alive - r.dead), damage: out.damage | 0, dead: r.dead, notes: out.notes || [] });
            alive = Math.max(0, alive - r.dead);
          } else {
            const from = hp; hp = Math.max(0, hp - out.damage);
            ticks.push({ id: t.id, name: e.name, from, hp, damage: out.damage | 0, notes: out.notes || [] });
          }
        }
      }
      const next = { done: false, qa: false, fa: false };
      const stun = cond.find(c => c.n === 'Stun');
      if (stun) { next.done = true; next.qa = true; next.fa = true; stun.c -= 1; cond = cond.filter(c => c.c > 0); lost.push({ id: t.id, name: e.name }); touched = true; }
      if (!touched) return;
      next.cond = cond;
      if (form) next.alive = alive; else next.hp = hp;
      upd(t, next);
    });
    setFight(s, { round: f.round + 1 });
  });
  return done({ round: f.round + 1, turned: true, ticks, lost });
}

/* The first Next turn lifts the cloth, hands out starting Dodge by Dexterity (the
   rules' own table) and starts turn one. */
function begin() {
  const s = scene(); if (!s) return fail('no fight is running');
  if (!isGM()) return fail("the GM's call");
  const given = [];
  atomic(() => {
    pieceThings(s.id).forEach(t => {
      const e = t.ent;
      if (!e.pc || !t.char || !root.Characters || !R() || !R().startingDodge) return;
      const raw = root.Characters.get(t.char);
      const rec = raw && root.Sheet && root.Sheet.fill ? root.Sheet.fill(raw) : raw;
      const dex = rec && rec.attr ? +rec.attr.dex || 0 : null;
      if (dex == null) return;
      const d = R().startingDodge({ attrs: { dexterity: dex } });
      if (!d) return;
      const cond = copyCond(e), c = cond.find(x => x.n === 'Dodge');
      if (c) c.c += d; else cond.push({ n: 'Dodge', c: d });
      upd(t, { cond });
      given.push({ id: t.id, name: e.name, n: d });
    });
    setFight(s, { round: 1, cover: false });
  });
  return done({ began: true, round: 1, given });
}

function setCover(v) {
  const s = scene(); if (!s) return fail('no fight is running');
  if (!isGM()) return fail('the GM\'s call');
  atomic(() => setFight(s, { cover: !!v }));
  return done({ cover: !!v });
}

/* mana in the air: the number is typed straight in (the shared pool both armies draw on) */
function setMana(n) {
  const s = scene(); if (!s) return fail('no fight is running');
  if (!isGM()) return fail('the GM\'s call');
  const v = Math.max(0, Math.min(999, parseInt(n, 10) || 0));
  atomic(() => T().patch(s.id, { options: Object.assign({}, s.options || {}, { mana: v }) }));
  return done({ mana: v });
}
/* ══ THE BOARD ITSELF ═════════════════════════════════════════
   How many a line holds and the ground are what the scene IS, so changing them
   is one undo step too — and the scene's footprint on the wood follows, about
   its own middle, so it never creeps. The eight lines never change. */
function refit(s, setup) {
  const g = geometry({ id: s.id, lines: s.lines, setup, scene: 'combat' });
  const cx = s.x + (s.w || g.W) / 2, cy = s.y + (s.h || g.H) / 2;
  return { lines: g.lines, setup, w: g.W, h: g.H, x: Math.round(cx - g.W / 2), y: Math.round(cy - g.H / 2) };
}
/* how many a line holds. A line with more than that already in it keeps them
   (nobody is thrown off the board); it just takes no more. */
function setWidth(n) {
  const s = scene(); if (!s) return fail('no fight is running');
  if (!isGM()) return fail("the GM's call");
  const width = clampN(n, WIDTH_MIN, WIDTH_MAX, WIDTH_DEFAULT);
  atomic(() => T().patch(s.id, refit(s, Object.assign({}, s.setup || {}, { width }))));
  return done({ width });
}
/* ══ MAKING A SCENE READY ═════════════════════════════════════
   A scene put down from the box has its footprint from its own lines and
   width, not the old sheet's. */
function prepare(s) {
  if (!s || s.scene !== 'combat') return s;
  const g = geometry(s);
  if (!s.fight) s.fight = { round: 1, cover: false };
  if (!s.options) s.options = {};
  const cx = (s.x || 0) + (s.w || g.W) / 2, cy = (s.y || 0) + (s.h || g.H) / 2;
  if (s.w !== g.W || s.h !== g.H) {
    s.w = g.W; s.h = g.H;
    s.x = Math.round(cx - g.W / 2); s.y = Math.round(cy - g.H / 2);
  }
  /* a piece saved with the old sheet's columns and action pips: keep its place
     in its line, drop what no longer means anything */
  pieceThings(s.id).forEach(t => {
    const e = t.ent;
    if (e.ord == null) e.ord = e.col == null ? 0 : e.col;
    if (e.qa == null && ('q' in e || 'f' in e)) { e.qa = e.q === false; e.fa = e.f === false; }
    if (e.done == null) e.done = e.q === false && e.f === false;
    if ('q' in e || 'f' in e || 'col' in e || 'acted' in e) { delete e.q; delete e.f; delete e.col; delete e.acted; }
  });
  return s;
}

/* ══ WHAT THE FIELD READS ═════════════════════════════════════
   37-scene-field.js stands the same fight up as a landscape, and was written
   against the old sheet's `S`. This is the same shape, computed from the
   table: lines with their pieces (`col` is the slot, counted across the
   width), the width, the terrain, the features and what is picked. */
let picked = null, ver = 0, fedAt = -1, fedOut = null;
function feed() {
  if (fedOut && fedAt === ver) return fedOut;
  fedOut = feedNow(); fedAt = ver; return fedOut;
}
function feedNow() {
  const s = scene();
  if (!s) return { lines: [], width: 8, sel: null, terrain: 'meadow', features: [], round: 1, mana: 0, name: 'Combat' };
  const A = arrange(s);
  /* what the players may see: nothing under the cloth, and nothing the GM has hidden */
  const gm = isGM(), veiled = !gm && A.fight.cover;
  const seen = t => !veiled && (gm || !t.ent.hidden);
  const lines = A.rows.map(row => {
    const shown = row.pieces.filter(seen);
    const used = shown.reduce((n, t) => n + weightOf(t.ent), 0);
    let col = Math.max(0, (A.g.width - used) >> 1);
    return { key: row.line.key, side: row.line.side, label: row.line.label, depth: row.line.depth, front: row.line.front,
      ents: shown.map(t => {
        const e = Object.assign({}, t.ent, { id: t.id, name: t.name || t.ent.name, col, acted: !!t.ent.done,
                                              pic: t.src || t.ent.pic || '', art: t.art || t.ent.art || '',
                                              fig: t.fig || t.ent.fig || '', look: t.look === 'coin' ? 'coin' : 'standee' });
        col += weightOf(t.ent);
        return e;
      }) };
  });
  return { lines, width: A.g.width, sel: picked, terrain: C().terrainOf(s.setup && s.setup.terrain),
           features: [], round: A.fight.round, mana: A.options.mana,
           name: s.name || 'Combat' };
}
function pick(id) { picked = id || null; ver++; listeners.forEach(f => { try { f('pick', picked); } catch (e) {} }); }
const picks = () => picked;

/* ══ THE GM'S OWN PEOPLE ══════════════════════════════════════
   Monsters made ahead of time, kept on THIS machine for the next fight: a
   name, a side, a picture, health, what they begin with. (Saved fights are
   73-encounters.js's, and are kept in the same way.) */
const LIBKEY = 'monarchy.npcs.v1';
let libCache = null;
function libAll() {
  if (libCache) return libCache;
  let raw = null;
  try { raw = root.localStorage.getItem(LIBKEY); } catch (e) {}
  try { const v = JSON.parse(raw); libCache = Array.isArray(v) ? v : []; }
  catch (e) { libCache = []; }
  /* An earlier build stocked the library with six people nobody asked for. Whoever still has those
     untouched has them taken away, once; anything they made or changed stays. */
  const gone = { 'st-spear': 'Spearman', 'st-axe': 'Axeman', 'st-archer': 'Archer', 'st-skel': 'Skeleton', 'st-horde': 'Skeleton Horde', 'st-lich': 'Lich' };
  const kept = libCache.filter(t => !(t && gone[t.id] === t.name));
  if (kept.length !== libCache.length) { libCache = kept; libWrite(); }
  return libCache;
}
function libWrite() { try { root.localStorage.setItem(LIBKEY, JSON.stringify(libAll())); return true; } catch (e) { return false; } }
/* a picture of the GM's own goes WITH the piece (its data), so every seat can draw it without having the art shelf */
const ownSrc = id => { const a = id && root.Library && root.Library.art && root.Library.art.get(id); return (a && a.src) || ''; };
const lib = {
  list: () => libAll().slice(),
  get: id => libAll().find(x => x.id === id) || null,
  blank() {
    return { id: 'npc' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
             name: 'New monster', side: 'en', entKind: 'unit', hp: 10, fig: '', src: '', art: '', cond: [],
             bodies: 10, hpea: 1, dmg: 2, skl: '4+', def: '—', lead: 'Stable', leadership: 60 };
  },
  save(tpl) {
    const t = Object.assign(lib.blank(), tpl);
    t.name = String(t.name || 'Unnamed').slice(0, 32);
    t.side = t.side === 'al' ? 'al' : 'en';
    t.entKind = ['unit', 'large', 'form'].indexOf(t.entKind) >= 0 ? t.entKind : 'unit';
    t.hp = Math.max(1, Math.min(999, parseInt(t.hp, 10) || 1));
    t.leadership = t.lead === 'Unbreakable' ? 100 : Math.max(0, Math.min(100, parseInt(t.leadership, 10) || 0));
    t.cond = (t.cond || []).filter(c => c && c.n && c.c > 0).map(c => ({ n: c.n, c: c.c }));
    const i = libAll().findIndex(x => x.id === t.id);
    if (i >= 0) libAll()[i] = t; else libAll().push(t);
    libWrite(); told('lib');
    return t;
  },
  /* a piece standing on the board, kept as a monster to bring in again (hurt and tokens left behind) */
  fromPiece(id) {
    const t = T().get(id); if (!t || !t.ent) return null;
    const e = t.ent, base = String(t.name || e.name || 'Someone').replace(/\s+\d+$/, '');
    const keep = {};
    ['sta', 'str', 'av', 'move', 'hpea', 'dmg', 'skl', 'def', 'lead', 'leadership'].forEach(k => { if (e[k] != null && e[k] !== '') keep[k] = e[k]; });
    if (e.kind === 'form') keep.bodies = e.total || e.alive || 1;
    return lib.save(Object.assign(keep, { name: base, side: e.side, entKind: e.kind, hp: e.max || e.hp || 1,
      fig: t.fig || e.fig || '', src: t.src || '', art: t.art || e.art || '', cond: [] }));
  },
  remove(id) { const i = libAll().findIndex(x => x.id === id); if (i < 0) return false; libAll().splice(i, 1); libWrite(); told('lib'); return true; },
  /* a template as the spec make() takes */
  spec(t) {
    return { name: t.name, side: t.side, entKind: t.entKind, hp: t.hp, max: t.hp, look: 'standee',
             fig: t.fig || '', src: t.src || ownSrc(t.art), art: t.art || '', cond: t.cond || [],
             bodies: t.bodies, hpea: t.hpea, dmg: t.dmg, skl: t.skl, def: t.def, lead: t.lead, leadership: t.leadership,
             sta: t.sta, str: t.str, av: t.av, move: t.move };
  }
};

/* ══ HEARING ABOUT IT ═════════════════════════════════════════ */
const listeners = [];
function told(why, x) { listeners.forEach(f => { try { f(why, x); } catch (e) {} }); }
function on(fn) { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; }
let wired = false;
function wire() {
  if (wired || !T()) return; wired = true;
  T().on((st, why) => { ver++; listeners.forEach(f => { try { f(why, st); } catch (e) {} }); });
}
if (T()) wire();

const Battle = {
  G, WIDTH_MIN, WIDTH_MAX, WIDTH_DEFAULT, LINE_KEYS,
  scene, geometry, arrange, flat, lineX, lineAtX, indexAtZ, lineIndex, weightOf, fightOf, optionsOf,
  isGM, isMine, preview, prepare, normLines,
  hit, heal, token, setDone, setAct, actsOf, setHidden, setSide, setVital, setLead, setMorale, testMorale, formationAttack,
  move, deploy, deployFight, remove, clear, bring, release, slotLayout,
  nextTurn, endTurn, begin, setCover, setMana,
  setWidth, roomIn, nextRoom, effectsOf,
  feed, pick, picks, lib, on, wire
};
root.Battle = Battle;
if (typeof module !== 'undefined' && module.exports) module.exports = Battle;

})(typeof window !== 'undefined' ? window : globalThis);
