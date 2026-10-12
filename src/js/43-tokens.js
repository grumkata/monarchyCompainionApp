/* ══════════════════════════════════════════════════════════════
   43-tokens.js — A TOKEN HAS ONE HOME.

   From the-toolbox.md, and it is the whole design:

     "A token has one home. It is the character's body in the world
      — one object, one place at a time. On bare wood it is standing
      there; in the combat scene it is a combatant; in the
      exploration scene it is an explorer. Not made per scene, the
      way most VTTs do it."

   So there is ONE object. `kind:'token'` in the table's model, with
   a `.ent` on it — the combatant record the fight reads. When a token's
   home is a combat scene (`t.in`, `t.lineKey`), THAT is the piece on the
   board: 80-battle.js reads it where it stands and changes it through the
   model, so nothing is copied and nothing can drift.

   Why `.ent` and not the thing itself: the fight reads `e.kind` to size a
   piece ('unit' one slot, 'large' two, 'form' a tile), and the model reads
   `t.kind` to know it is a token. One field, two meanings — keeping them
   apart is a nested object, not a rename.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const T = () => root.TableModel;

/* the two letters on the counter, from the name, the way the demo's are */
function monoOf(name) {
  const w = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!w.length) return '??';
  if (w.length === 1) return w[0].slice(0, 2).toUpperCase();
  return (w[0][0] + w[1][0]).toUpperCase();
}

/* ── a fresh token ─────────────────────────────────────────────
   Two kinds, and only one of them is anonymous:

   · `spec.char` — this token IS that character. Its name and its
     hit points come from the record, through the rules, so they
     cannot drift from the sheet. This is the normal case; a table
     is mostly the people at it.
   · no char — a nameless body for an NPC the GM is improvising.  */
function make(spec) {
  spec = spec || {};

  /* ── WHERE THIS COUNTER COMES FROM ─────────────────────────
     grumkata: it has to matter "if it comes from a character sheet or if
     its an npc or even a formation, which is important". Three sources,
     and the difference is real rather than cosmetic:

       char — it IS that record. Its hit points are the record's derived
              hit points, by the rules, so the counter and the sheet cannot
              disagree; edit the sheet and the counter changes.
       npc  — its own, with whatever you gave it. Nothing behind it.
       form — a body of troops. app.js sizes a formation across several
              slots and a formation is not a person, so it stands wider and
              carries its own strength.                                    */
  let ent, name, source = spec.source || (spec.char ? 'char' : 'npc');
  if (spec.char && root.Characters) {
    const rec = root.Characters.get(spec.char);
    if (rec) {
      ent = root.Characters.combatant(rec); name = ent.name; source = 'char';
      /* their own picture, off the record, unless this counter was handed one
         — or was deliberately dressed as one of the painted figures */
      if (!spec.src && !spec.fig && ent.pic) spec = Object.assign({}, spec, { src: ent.pic,
                                                                              art: ent.picArt });
    }
  }
  if (!ent) {
    name = spec.name || (source === 'form' ? 'A formation' : 'Someone');
    const hp = spec.max == null ? (spec.hp == null ? (source === 'form' ? 24 : 10) : spec.hp)
                                : spec.max;
    ent = {
      kind: spec.entKind || (source === 'form' ? 'form' : 'unit'),   /* unit | large | form */
      mono: spec.mono || monoOf(name),
      name,
      hp: spec.hp == null ? hp : spec.hp,
      max: hp,
      side: spec.side || (source === 'char' ? 'al' : 'en'),
      pc: false,
      cond: []
    };
  }
  if (spec.side) ent.side = spec.side;
  /* stamina, stress, armour and movement, if the bench was given them */
  if (ent.kind !== 'form') ['sta', 'str', 'av', 'move'].forEach(k => {
    if (spec[k] == null || spec[k] === '') return;
    const x = parseInt(spec[k], 10);
    if (Number.isFinite(x)) ent[k] = Math.max(0, Math.min(99, x));
  });
  /* ── A FORMATION IS A BODY OF TROOPS, WITH ITS OWN NUMBERS ──────
     This was the whole of the "straight up dont work" formation: a counter
     made as one got the fields of a PERSON — hp, max — and none of the six
     32-combat-app.js draws a formation with, so it came out on the board as
     "undefined/undefined, Hit undefined, Dmg undefined". A formation counts
     BODIES, and hits, harms and holds as a body; those are its fields, with
     the demo levy's numbers as the default. */
  if (ent.kind === 'form') formFields(ent, spec);
  /* ── AND WHAT IT LOOKS LIKE TRAVELS WITH IT ─────────────────────
     The combatant is what the board and the field read, and they have to
     show the same person the counter on the wood is wearing. */
  ent.look = spec.look === 'coin' ? 'coin' : 'standee';
  ent.fig = spec.fig || ent.fig || '';

  /* its box is the counter's own, from 46-figures.js, so the thing that
     lands is exactly the size of the thing that was in your hand */
  const sz = root.Figures
    ? root.Figures.sizeOf({ kind: 'token' }, { entKind: ent.kind })
    : { w: 150, h: 182 };
  const t = T().put(Object.assign({ kind: 'token', name, w: sz.w, h: sz.h },
                                  spec, { name }));
  ent.id = t.id;
  t.ent = ent;
  t.source = source;
  t.char = spec.char || null;          /* the record it is the body of */
  t.src  = spec.src || '';             /* its face, as a picture */
  t.art  = spec.art || '';             /* or as an entry in the art library */
  t.fig  = spec.fig || '';             /* or one of the painted figures */
  t.look = ent.look;                   /* standing up, or lying flat as a coin */
  t.info = spec.info || '';            /* whatever else is attached to it */
  t.lineKey = null;
  ent.pic = t.src; ent.art = t.art;
  T().changed('token');
  return t;
}

/* the six numbers a formation is drawn and fought with, each only where it
   is missing — an edit that sets one must not reset the other five */
const LEADS = ['Unbreakable', 'Stable', 'Wavering', 'Crumbling', 'Broken'];
function formFields(ent, spec) {
  spec = spec || {};
  const n = (v, d, lo, hi) => {
    const x = parseInt(v, 10);
    return Number.isFinite(x) ? Math.max(lo, Math.min(hi, x)) : d;
  };
  if (spec.bodies != null || ent.total == null) {
    const was = ent.total, gone = was != null && ent.alive != null ? was - ent.alive : 0;
    ent.total = n(spec.bodies, ent.total != null ? ent.total : 10, 1, 60);
    ent.alive = Math.max(0, ent.total - gone);
  }
  if (spec.hpea != null || ent.hpea == null) ent.hpea = n(spec.hpea, ent.hpea != null ? ent.hpea : 1, 1, 99);
  if (spec.dmg  != null || ent.dmg  == null) ent.dmg  = n(spec.dmg,  ent.dmg  != null ? ent.dmg  : 2, 0, 99);
  if (spec.skl  != null || ent.skl  == null) ent.skl  = String(spec.skl != null ? spec.skl : (ent.skl || '4+')).slice(0, 4);
  if (spec.def  != null || ent.def  == null) ent.def  = String(spec.def != null ? spec.def : (ent.def || '—')).slice(0, 4) || '—';
  if (spec.lead != null || ent.lead == null)
    ent.lead = LEADS.indexOf(spec.lead) >= 0 ? spec.lead : (ent.lead || 'Stable');
  if (spec.leadership != null || ent.leadership == null)
    ent.leadership = ent.lead === 'Unbreakable' ? 100 : n(spec.leadership, ent.leadership != null ? ent.leadership : 60, 0, 100);
  if (ent.leadFails == null) ent.leadFails = Math.max(0, ['Stable', 'Wavering', 'Crumbling', 'Broken'].indexOf(ent.lead));
  if (ent.leadStreak == null) ent.leadStreak = 0;
  if (ent.move == null) ent.move = 1;
}

/* ── EVERYTHING ABOUT A COUNTER THAT CAN BE CHANGED ───────────
   One door, so nothing can set a token's hit points without the ent hearing
   about it. A counter that came from a record keeps taking its maximum from
   the record — you may bruise it, not rewrite it. */
function edit(id, next) {
  const t = T().get(id); if (!t || t.kind !== 'token') return false;
  const e = t.ent; if (!e) return false;
  if (next.name != null) { t.name = String(next.name) || t.name;
                           e.name = t.name; e.mono = monoOf(t.name); }
  if (next.side != null) e.side = next.side === 'en' ? 'en' : 'al';          /* whose it is; where it stands is its line's, and stays */
  if (next.entKind != null && t.source !== 'char') {
    e.kind = next.entKind;
    if (e.kind === 'form') formFields(e, next);
    const sz = root.Figures
      ? root.Figures.sizeOf({ kind: 'token' }, { entKind: e.kind }) : null;
    if (sz && !t.in) { t.w = sz.w; t.h = sz.h; }
  }
  if (e.kind === 'form' && ['bodies', 'hpea', 'dmg', 'skl', 'def', 'lead']
        .some(k => next[k] != null)) formFields(e, next);
  if (next.look != null) { t.look = next.look === 'coin' ? 'coin' : 'standee'; e.look = t.look; }
  if (next.fig != null) { t.fig = String(next.fig); e.fig = t.fig; }
  if (next.max != null && t.source !== 'char') {
    const gone = Math.max(0, e.max - e.hp);          /* keep the damage taken */
    e.max = Math.max(1, parseInt(next.max, 10) || 1);
    e.hp = Math.max(0, e.max - gone);
  }
  if (next.hp != null) e.hp = Math.max(0, Math.min(e.max, parseInt(next.hp, 10) || 0));
  /* THE REST OF WHAT A UNIT IS FOUGHT WITH, as numbers the GM can type: stamina
     and stress as they stand now, armour, and movement in lines. Blank takes
     the number away rather than making it zero. */
  ['sta', 'str', 'av', 'move'].forEach(k => {
    if (next[k] == null) return;
    if (next[k] === '') { delete e[k]; return; }
    e[k] = Math.max(0, Math.min(99, parseInt(next[k], 10) || 0));
  });
  /* A CHARACTER'S PICTURE BELONGS TO THE CHARACTER. Setting it on one of
     their counters sets it on the record, which then reaches every other
     counter of them and the chest's offer of them — rather than leaving four
     tokens of the same person wearing four different faces. */
  /* ...but only when it IS a picture. Dressing one counter as a painted
     figure clears that counter's own picture and must not reach through and
     wipe the portrait off their record. */
  if ((next.src || next.art) && t.source === 'char' && t.char
      && root.Characters) {
    root.Characters.setPic(t.char, next.src == null ? t.src : next.src,
                                   next.art == null ? t.art : next.art);
  }
  if (next.src  != null) { t.src = next.src; e.pic = t.src; }
  if (next.art  != null) { t.art = next.art; e.art = t.art; }
  if (next.info != null) t.info = String(next.info);
  T().changed('token-edit');
  return true;
}

/* the record behind a token, if it has one */
function recordOf(id) {
  const t = T().get(id);
  return (t && t.char && root.Characters) ? root.Characters.get(t.char) : null;
}

/* A character's hit points are the record's, so an edit to the sheet has to
   reach the board. Called when a record is saved at the table. */
function refresh(charId) {
  if (!root.Characters) return;
  const rec = root.Characters.get(charId); if (!rec) return;
  const fresh = root.Characters.combatant(rec);
  let hit = false;
  T().state.things.forEach(t => {
    if (t.kind !== 'token' || t.char !== charId || !t.ent) return;
    const gone = t.ent.max - t.ent.hp;            /* keep the damage it has taken */
    t.name = fresh.name;
    t.src = fresh.pic || ''; t.art = fresh.picArt || '';
    t.ent.name = fresh.name; t.ent.mono = fresh.mono;
    t.ent.pic = fresh.pic; t.ent.picArt = fresh.picArt;
    t.ent.max = fresh.max;
    t.ent.hp = Math.max(0, fresh.max - gone);
    hit = true;
  });
  if (hit) T().changed('char');
}

/* every token that lives in this scene, in the order it was put down */
const inScene = id => T().state.things.filter(t => t.kind === 'token' && t.in === id);

function rename(id, name) {
  const t = T().get(id); if (!t) return false;
  t.name = String(name || 'Token');
  if (t.ent) { t.ent.name = t.name; t.ent.mono = monoOf(t.name); }
  T().changed('rename'); return true;
}

function setSide(id, side) {
  const t = T().get(id); if (!t || !t.ent) return false;
  t.ent.side = side === 'en' ? 'en' : 'al';                    /* whose it is; where it stands stays */
  T().changed('side'); return true;
}

root.Tokens = { make, edit, rename, setSide, monoOf, inScene, recordOf, refresh, formFields, LEADS };

})(window, document);
