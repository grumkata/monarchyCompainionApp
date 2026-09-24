/* ══════════════════════════════════════════════════════════════
   58-sheets-net.js — THE SHEETS SOMEBODY PULLED ONTO THE WOOD.

   grumkata: "people should be able to connect ANNY number of charcter
   sheets to a table by pulling it there".

   Any number, and from anyone. A GM running four NPCs and a player with
   two characters are the same case, so there is no cap and no per-person
   allowance — 06-session.js stores them by sheet id under the table, and
   the only rule is that the one who brought a sheet is the one who can
   take it away again.

   ── WHERE THEY APPEAR IS EVERYWHERE ──────────────────────────
   The tempting design is a new panel: "sheets at this table", beside the
   ones you own. It is the wrong one. A character at the table is a
   character at the table — it should stand in the chest under People, it
   should make a counter, it should open as paper on the wood, and it
   should do all of that through the code that already does it for your
   own.

   So instead of a panel, this widens ONE function. `Characters.roster()`
   is where every one of those features gets its list, and it now answers
   with your own plus everybody's. Nothing downstream learned a new
   concept; the chest, the counters, the papers and the token maker all
   gained shared sheets without a line changing in any of them.

   ── AND WHOSE IS IT ──────────────────────────────────────────
   A shared sheet carries `__shared` and `__by`. That matters in exactly
   two places and nowhere else:

     WRITING   a change to a shared sheet goes to the TABLE, not to this
               browser's roster. Otherwise ten people would each quietly
               accumulate copies of each other's characters, and the one
               real change anybody made would be invisible to the rest.

     OWNING    the client that brought a sheet folds changes back into its
               own local record, so a GM adjusting a player's hit points
               is still there when that player goes home and opens the
               character on their own.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const S = () => root.Session;
const live = () => !!(S() && S().live);

let shared = {};        /* id -> the node from the wire */
let wrapped = false;

/* ── WIDENING THE ROSTER ──────────────────────────────────────
   Done once, and it survives 44-characters.js being reloaded because it
   captures the originals rather than the module. */
function wrap() {
  const C = root.Characters;
  if (!C || wrapped) return;
  wrapped = true;

  const rosterWas = C.roster;
  const getWas = C.get;
  const putWas = C.put;

  C.roster = function () {
    const mine = rosterWas.call(this) || [];
    if (!live()) return mine;
    const seen = {};
    mine.forEach(c => { seen[c.id] = 1; });
    /* yours first, in your own order, then everybody else's in the order
       they were brought — so the list you already knew does not reshuffle
       underneath you the moment somebody joins */
    const theirs = Object.keys(shared)
      .filter(id => !seen[id])
      .map(id => shared[id])
      .sort((a, b) => (a.at || 0) - (b.at || 0))
      .map(node => Object.assign({}, node.data, {
        id: node.id, __shared: true, __by: node.by, __byName: node.who
      }));
    return mine.concat(theirs);
  };

  C.get = function (id) {
    const own = getWas.call(this, id);
    if (own) return own;
    const node = live() && shared[id];
    if (!node) return null;
    return Object.assign({}, node.data, {
      id: node.id, __shared: true, __by: node.by, __byName: node.who
    });
  };

  C.put = function (rec) {
    if (!rec) return false;
    /* SOMEBODY ELSE'S CHARACTER DOES NOT GO IN YOUR DRAWER. It goes back
       to the table, where its owner and everyone else will see it. */
    if (rec.__shared && live()) {
      const clean = Object.assign({}, rec);
      delete clean.__shared; delete clean.__by; delete clean.__byName;
      return S().bring(clean), true;
    }
    const ok = putWas.call(this, rec);
    /* YOUR OWN CHARACTER, BROUGHT TO THE TABLE, IS STILL YOURS — and what
       you change on it has to reach the table too. It was saved at home and
       nowhere else, so the GM went on reading the sheet as it stood when you
       brought it. Sent a moment after you stop typing, not per keystroke. */
    const node = live() && rec.id && shared[rec.id];
    if (node && node.by === S().uid) resend(rec);
    return ok;
  };
}
let resendT = 0, resendRec = null;
function resend(rec) {
  resendRec = rec;
  clearTimeout(resendT);
  resendT = setTimeout(() => {
    const r = resendRec; resendRec = null;
    if (r && live() && shared[r.id]) S().bring(Object.assign({}, r));
  }, 700);
}

/* ── WHAT ARRIVES ─────────────────────────────────────────────
   And the one thing the owner does with it: keep their own copy current,
   so an evening's worth of damage is still there tomorrow. */
function took(list) {
  const next = {};
  (list || []).forEach(n => { if (n && n.id) next[n.id] = n; });
  const before = shared;
  shared = next;

  const C = root.Characters;
  if (C && S()) {
    Object.keys(next).forEach(id => {
      const n = next[id];
      if (n.by !== S().uid) return;                 /* not mine to keep */
      const was = before[id];
      if (was && JSON.stringify(was.data) === JSON.stringify(n.data)) return;
      /* mine, and changed by somebody at the table: write it home */
      try { root.Characters.put && putHome(n.data); } catch (e) {}
    });
  }
  root.dispatchEvent(new CustomEvent('monarchy:sheets', { detail: { sheets: mineAnd() } }));
  /* the chest may be open on the People shelf, showing a list that just
     grew by somebody else's character */
  if (root.Hand && root.Hand.refresh) root.Hand.refresh();
}
/* the original put, reached around the wrapper above */
function putHome(rec) {
  const C = root.Characters;
  const clean = Object.assign({}, rec);
  delete clean.__shared; delete clean.__by; delete clean.__byName;
  /* go through localStorage directly rather than C.put, which we have
     wrapped and which would send this straight back where it came from */
  try {
    const KEY = C.KEY;
    const list = JSON.parse(root.localStorage.getItem(KEY)) || [];
    const i = list.findIndex(x => x.id === clean.id);
    if (i >= 0) list[i] = clean; else list.push(clean);
    root.localStorage.setItem(KEY, JSON.stringify(list));
  } catch (e) {}
}
function mineAnd() {
  return Object.keys(shared).map(id => shared[id]);
}

/* ── PULLING ONE THERE ────────────────────────────────────────
   The verb the rest of the app calls. Given a record or an id, it puts
   that character on the table for everybody. */
function bring(idOrRec) {
  if (!live()) return Promise.resolve(null);
  const rec = (typeof idOrRec === 'string')
    ? (root.Characters && root.Characters.get(idOrRec)) : idOrRec;
  if (!rec) return Promise.resolve(null);
  if (rec.__shared) return Promise.resolve(rec.id);   /* already there */
  return S().bring(rec);
}
function takeBack(id) { return live() ? S().takeBack(id) : Promise.resolve(); }
const isShared = id => !!shared[id];
const broughtBy = id => (shared[id] || {}).who || '';

root.addEventListener('monarchy:session', e => {
  const d = e.detail || {};
  wrap();
  if (d.what === 'sheets') took(d.sheets);
  if (d.what === 'left' || d.what === 'closed') { shared = {}; }
});
if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', wrap);
else wrap();

root.SheetsNet = { bring, takeBack, isShared, broughtBy,
                   get shared() { return mineAnd(); } };

})(window, document);
