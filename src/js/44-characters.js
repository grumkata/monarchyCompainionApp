/* ══════════════════════════════════════════════════════════════
   44-characters.js — THE CHARACTERS, AT THE TABLE.

   The hall keeps the roster; the table needs to reach it. That
   join is the whole point and it did not exist: the chest offered
   a "Token" that was a blank counter with ten hit points and a
   name field, in an app whose entire subject is running characters
   through a game.

   From the-toolbox.md:

     "A token has one home. It is the CHARACTER'S BODY in the
      world — one object, one place at a time."

   So a token is not a thing you name after a character. It IS the
   character, standing somewhere. Its hit points are the record's
   derived hit points, by the rules, from Sheet.derived() — not a
   number typed twice that can drift.

   One store, no copy: the roster is localStorage under the hall's
   own key. Reading it here rather than duplicating it means a
   character edited in the hall is the same character at the table.
══════════════════════════════════════════════════════════════ */
(function (root) {
'use strict';

const KEY = 'monarchy.chars.v2';        /* menu2.js's own key — do not fork it */

function roster() {
  try {
    const v = JSON.parse(root.localStorage.getItem(KEY));
    return Array.isArray(v) ? v : [];
  } catch (e) { return []; }
}
function save(list) {
  try { root.localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
}
function get(id) { return roster().find(c => c.id === id) || null; }

/* write a changed record back into the roster the hall reads */
function put(rec) {
  if (!rec || !rec.id) return false;
  const list = roster();
  const i = list.findIndex(c => c.id === rec.id);
  rec.updated = Date.now();
  if (i < 0) list.push(rec); else list[i] = rec;
  save(list);
  return true;
}

/* a record's name lives in two places depending on how it was made */
const nameOf = c => (c && ((c.who && c.who.name) || c.name)) || 'Unnamed';

/* ── what a character is, as a piece on the board ──────────────
   Hit points come from the RULES via Sheet.derived — Health is
   ceil(FOR x AV + Resilience) — so a token cannot disagree with the
   record it is. `pc` is what app.js reads to stand a piece on a plinth. */
function combatant(c) {
  const d = (root.Sheet && root.Sheet.derived) ? root.Sheet.derived(root.Sheet.fill(c))
                                               : { hp: 10 };
  const nm = nameOf(c);
  return {
    id: null,                    /* filled in by the token that carries it */
    pic: (c && c.who && c.who.pic) || '',
    picArt: (c && c.who && c.who.picArt) || '',
    kind: 'unit',
    mono: (root.Tokens ? root.Tokens.monoOf(nm) : nm.slice(0, 2)).toUpperCase(),
    name: nm,
    hp: d.hp, max: d.hp,
    side: 'al',                  /* a character starts on your side of the Line */
    pc: true,
    cond: []
  };
}

/* ── THE PICTURE A CHARACTER WEARS ────────────────────────────
   Kept on the RECORD, not on the counter, so it follows them: onto every
   counter of them on every table, into the chest's own offer of them, and
   back to the hall. A picture set on one token of Aldric is Aldric's
   picture. */
function setPic(id, src, artId) {
  const rec = get(id); if (!rec) return false;
  rec.who = rec.who || {};
  rec.who.pic = src || '';
  rec.who.picArt = artId || '';
  put(rec);
  if (root.Tokens) root.Tokens.refresh(id);
  return true;
}

/* ── the chest's offer, one per character you have made ── */
function offers() {
  return roster().map(c => ({
    id: 'char:' + c.id,
    kind: 'token',
    char: c.id,
    name: nameOf(c),
    mark: '☗',
    act: 'place',
    blurb: 'Their body in the world. Drop it on a line to bring them into the fight.'
  }));
}

root.Characters = { roster, get, put, setPic, nameOf, combatant, offers, KEY };

})(window);
