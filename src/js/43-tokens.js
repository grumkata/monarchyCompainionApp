/* ══════════════════════════════════════════════════════════════
   43-tokens.js — A TOKEN HAS ONE HOME.

   From the-toolbox.md, and it is the whole design:

     "A token has one home. It is the character's body in the world
      — one object, one place at a time. On bare wood it is standing
      there; in the combat scene it is a combatant; in the
      exploration scene it is an explorer. Not made per scene, the
      way most VTTs do it."

   So there is ONE object. `kind:'token'` in the table's model, with
   a `.ent` on it — the combatant record app.js understands. When a
   token's home is a combat scene, that same `.ent` object is pushed
   into the line's `ents` array BY REFERENCE, which means every move
   app.js makes lands on the token itself. Nothing is copied, so
   nothing can drift.

   Why `.ent` and not the thing itself: app.js reads `e.kind` to
   size a piece ('unit' one slot, 'large' two, 'form' a tile), and
   the model reads `t.kind` to know it is a token. One field, two
   meanings — keeping them apart is a nested object, not a rename.
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
      /* their own picture, off the record, unless this counter was handed one */
      if (!spec.src && ent.pic) spec = Object.assign({}, spec, { src: ent.pic,
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
  t.info = spec.info || '';            /* whatever else is attached to it */
  t.lineKey = null;
  T().changed('token');
  return t;
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
  if (next.side != null) { e.side = next.side === 'en' ? 'en' : 'al';
                           if (t.in) t.lineKey = null; }
  if (next.entKind != null && t.source !== 'char') {
    e.kind = next.entKind;
    const sz = root.Figures
      ? root.Figures.sizeOf({ kind: 'token' }, { entKind: e.kind }) : null;
    if (sz && !t.in) { t.w = sz.w; t.h = sz.h; }
  }
  if (next.max != null && t.source !== 'char') {
    const gone = Math.max(0, e.max - e.hp);          /* keep the damage taken */
    e.max = Math.max(1, parseInt(next.max, 10) || 1);
    e.hp = Math.max(0, e.max - gone);
  }
  if (next.hp != null) e.hp = Math.max(0, Math.min(e.max, parseInt(next.hp, 10) || 0));
  /* A CHARACTER'S PICTURE BELONGS TO THE CHARACTER. Setting it on one of
     their counters sets it on the record, which then reaches every other
     counter of them and the chest's offer of them — rather than leaving four
     tokens of the same person wearing four different faces. */
  if ((next.src != null || next.art != null) && t.source === 'char' && t.char
      && root.Characters) {
    root.Characters.setPic(t.char, next.src == null ? t.src : next.src,
                                   next.art == null ? t.art : next.art);
  }
  if (next.src  != null) t.src  = next.src;
  if (next.art  != null) t.art  = next.art;
  if (next.info != null) t.info = String(next.info);
  T().changed('token-edit');
  if (typeof render === 'function' && t.in) render();
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
  if (hit) {
    T().changed('char');
    if (typeof render === 'function') render();
  }
}

/* every token that lives in this scene, in the order it was put down */
const inScene = id => T().state.things.filter(t => t.kind === 'token' && t.in === id);

/* ── the board, rebuilt from the tokens ───────────────────────
   Called whenever the running scene is (re)shown. The ents are the tokens'
   own `.ent` objects, so this is wiring, not copying. */
function fill(scene) {
  if (typeof S === 'undefined' || !S.lines) return;
  S.lines.forEach(l => { l.ents = []; });
  const byKey = {};
  S.lines.forEach(l => { byKey[l.key] = l; });

  inScene(scene.id).forEach(t => {
    if (!t.ent) return;
    t.ent.name = t.name;                       /* the thing's name is the name */
    t.ent.id = t.id;
    /* a token whose line was renamed away, or which has never been placed,
       falls in on its own side's frontline rather than vanishing */
    let l = byKey[t.lineKey];
    if (!l || l.side !== t.ent.side) {
      l = S.lines.filter(x => x.side === t.ent.side).slice(-1)[0] ||
          S.lines.filter(x => x.side === t.ent.side)[0];
    }
    if (!l) return;
    t.lineKey = l.key;
    l.ents.push(t.ent);
  });

  /* keep each rank in column order and inside the width */
  S.lines.forEach(l => {
    l.ents.sort((a, b) => (a.col == null ? 99 : a.col) - (b.col == null ? 99 : b.col));
    if (typeof packLine === 'function' && l.ents.some(e => e.col == null)) packLine(l);
  });
}

/* ── and written back ─────────────────────────────────────────
   app.js moves ents between lines by splicing arrays; which line a token is
   in is therefore array membership, which has to be recorded on the token or
   it is lost the moment the page reloads. */
function harvest(scene) {
  if (typeof S === 'undefined' || !S.lines || !scene) return;
  const home = {};
  S.lines.forEach(l => l.ents.forEach(e => { home[e.id] = l.key; }));
  inScene(scene.id).forEach(t => {
    if (home[t.id]) t.lineKey = home[t.id];
    else { t.in = null; t.lineKey = null; }     /* taken off the board entirely */
  });
}

/* ── putting one on the board ─────────────────────────────────
   Dropped on a line: that line becomes its home, on the side that line
   belongs to. A token dropped on the enemy half IS an enemy — the board is
   the statement, not a dropdown somewhere. */
function toLine(tokenId, sceneId, lineKey) {
  const t = T().get(tokenId); if (!t || t.kind !== 'token') return false;
  const l = (typeof S !== 'undefined' && S.lines || []).find(x => x.key === lineKey);
  if (!l) return false;
  t.in = sceneId; t.lineKey = lineKey;
  if (t.ent) { t.ent.side = l.side; t.ent.col = null; }
  T().changed('token-placed');
  return true;
}

/* off the board and back onto the wood, where it is just standing there */
function toWood(tokenId, x, y) {
  const t = T().get(tokenId); if (!t) return false;
  t.in = null; t.lineKey = null;
  if (t.ent) t.ent.col = null;
  if (x != null) { t.x = Math.round(x); t.y = Math.round(y); }
  T().changed('token-pulled');
  return true;
}

function rename(id, name) {
  const t = T().get(id); if (!t) return false;
  t.name = String(name || 'Token');
  if (t.ent) { t.ent.name = t.name; t.ent.mono = monoOf(t.name); }
  T().changed('rename'); return true;
}

function setSide(id, side) {
  const t = T().get(id); if (!t || !t.ent) return false;
  t.ent.side = side === 'en' ? 'en' : 'al';
  if (t.in) { t.lineKey = null; }              /* it has to fall in on its own side */
  T().changed('side'); return true;
}

root.Tokens = { make, edit, fill, harvest, toLine, toWood, rename, setSide, monoOf,
                inScene, recordOf, refresh };

})(window, document);
