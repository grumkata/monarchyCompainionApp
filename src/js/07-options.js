/* ══════════════════════════════════════════════════════════════
   07-options.js — WHAT YOU HAVE ASKED THE APP TO BE.

   Two things, and they are the two that change what the app IS rather than
   what is in it: how hard the 3D is stylised, and whether the film grade
   sits over the top of it. Both have to reach BOTH halves of the app — the
   hall and the table are one document (42-shell.js), so a setting that only
   knew about one of them would half-apply.

   THERE IS NO MOTION SETTING. There was, briefly: Full / Swift / Calm, added
   because transitions felt laggy. grumkata: "remove the motion setteings
   [...] and actually fix the loading screens and transitions". He is right
   that it was the wrong answer — a speed dial on a broken animation is an
   apology, not a fix, and it asks the player to manage a problem that is the
   app's to solve. `prefers-reduced-motion` is still honoured, because that
   is an accessibility preference the player has already expressed to their
   own system and is nobody's to override.

   Loaded before anything that reads it. 09-blazon3d.js asks for the cel
   strength as it builds its materials; everything else is a class on the
   document and a `monarchy:opts` event for the parts that are not CSS.

   NOTHING HERE IS A PREFERENCE ABOUT CONTENT. Where you sit, what your arms
   are, which tables you have — those live with the thing they describe
   (Shell.seat, monarchy.me.v1, monarchy.tables.v3). This is only the app's
   own behaviour, which is why it is the only thing safe to reset on its own.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const KEY = 'monarchy.opts.v1';

/* Every key this app has ever written, for "take a copy of everything" and
   for "forget everything". Kept HERE rather than in the menu because the
   menu is the hall's and half of these are the table's — and a list that
   lives next to only half of what it names goes stale. The two prefixed
   ones are per-table and are matched, not compared. */
const KEYS = ['monarchy.opts.v1', 'monarchy.me.v1', 'monarchy.tables.v3',
  'monarchy.chars.v2', 'monarchy.seat.v1', 'monarchy.papers.at',
  'monarchy.presets.v1', 'monarchy.art.v1', 'monarchy.tavern.v3',
  'monarchy.character'];
const PREFIX = /^monarchy\.table\./;

/* ── what each one means, and what it is allowed to be ────────
   Written out rather than inferred, because the settings screen draws
   itself from this: a new option is one entry here and one line of
   apply(), and it appears on the screen with its own words. */
const DEFS = {
  /* ── DISPLAY ── */
  cel:   { g: 'Display', d: 'full', of: ['off', 'soft', 'full'],
           t: 'Stylised 3D', say: { off: 'Off', soft: 'Softened', full: 'Full' } },
  grade: { g: 'Display', d: 'on', of: ['off', 'on'],
           t: 'Film grade', say: { off: 'Off', on: 'On' } },
  /* Chromium scales the whole document, canvases included, and every 3D
     layer here already re-measures on resize — so this is one property
     rather than a font-size scheme that would miss half the app. */
  scale: { g: 'Display', d: '100', of: ['90', '100', '110', '125', '150'],
           t: 'Interface size',
           say: { '90': '90%', '100': '100%', '110': '110%', '125': '125%', '150': '150%' } },

  /* ── THE TABLE ── */
  snap:  { g: 'The table', d: 'on', of: ['off', 'on'],
           t: 'Snap to the grid', say: { off: 'Off', on: 'On' } },
  dice:  { g: 'The table', d: 'on', of: ['off', 'on'],
           t: 'Throw dice on the wood', say: { off: 'Off', on: 'On' } },
  bin:   { g: 'The table', d: 'off', of: ['off', 'on'],
           t: 'Ask before binning', say: { off: 'Off', on: 'On' } }
};

let vals = read();
function read() {
  let saved = {};
  try { saved = JSON.parse(root.localStorage.getItem(KEY)) || {}; } catch (e) {}
  const out = {};
  Object.keys(DEFS).forEach(k => {
    out[k] = DEFS[k].of.indexOf(saved[k]) >= 0 ? saved[k] : DEFS[k].d;
  });
  return out;
}
function write() {
  try { root.localStorage.setItem(KEY, JSON.stringify(vals)); } catch (e) {}
}

const get = k => vals[k];
const all = () => Object.assign({}, vals);

/* how much of the cel shader is mixed in — 09-blazon3d.js multiplies its
   own per-material amount by this, so "soft" softens everything by the
   same proportion rather than flattening the strong ones to the weak */
const CEL_AMT = { off: 0, soft: 0.45, full: 1 };
const celAmt = () => CEL_AMT[vals.cel];

function apply() {
  const b = doc.body;
  if (b) b.classList.toggle('nograde', vals.grade === 'off');
  if (root.Blazon3D && root.Blazon3D.strength) root.Blazon3D.strength(celAmt());
  /* the whole document, canvases and all. Every 3D layer in this app already
     listens for resize and re-measures, which is what makes this safe to do
     with one property instead of a font scheme that would miss the wood. */
  try { doc.documentElement.style.zoom = (+vals.scale / 100) || 1; } catch (e) {}
  /* the grid a piece lands on. 0 is "wherever you put it", which is what
     Shift already does per-drag (23-table3d.js) — this is that, kept. */
  if (root.TableModel) root.TableModel.GRID = (vals.snap === 'on') ? 20 : 0;
  root.dispatchEvent(new CustomEvent('monarchy:opts-applied'));
}

function set(k, v) {
  if (!DEFS[k] || DEFS[k].of.indexOf(v) < 0) return vals[k];
  vals[k] = v; write(); apply();
  root.dispatchEvent(new CustomEvent('monarchy:opts', { detail: { key: k, value: v } }));
  return v;
}
/* the next value round the ring — a setting with three states is a thing you
   press, not a thing you pick from a list */
function next(k) {
  const d = DEFS[k]; if (!d) return null;
  return set(k, d.of[(d.of.indexOf(vals[k]) + 1) % d.of.length]);
}
function reset() {
  try { root.localStorage.removeItem(KEY); } catch (e) {}
  vals = read();
  apply();
  root.dispatchEvent(new CustomEvent('monarchy:opts', { detail: { key: '*', value: null } }));
}

/* ── everything this app has put in the browser, as one object ── */
function dump() {
  const out = {};
  try {
    for (let i = 0; i < root.localStorage.length; i++) {
      const k = root.localStorage.key(i);
      if (KEYS.indexOf(k) >= 0 || PREFIX.test(k)) {
        try { out[k] = JSON.parse(root.localStorage.getItem(k)); }
        catch (e) { out[k] = root.localStorage.getItem(k); }
      }
    }
  } catch (e) {}
  return out;
}
/* how many keys and roughly how many bytes, for the settings screen to be
   honest about what it is holding */
function weigh() {
  let n = 0, bytes = 0;
  try {
    for (let i = 0; i < root.localStorage.length; i++) {
      const k = root.localStorage.key(i);
      if (KEYS.indexOf(k) >= 0 || PREFIX.test(k)) {
        n++; bytes += (root.localStorage.getItem(k) || '').length + k.length;
      }
    }
  } catch (e) {}
  return { keys: n, bytes };
}
/* Removes only what this app wrote — a shared origin is somebody else's
   store as well, so localStorage.clear() is never the right call. */
function forget() {
  const doomed = [];
  try {
    for (let i = 0; i < root.localStorage.length; i++) {
      const k = root.localStorage.key(i);
      if (KEYS.indexOf(k) >= 0 || PREFIX.test(k)) doomed.push(k);
    }
    doomed.forEach(k => root.localStorage.removeItem(k));
  } catch (e) {}
  return doomed.length;
}

/* the groups, in the order they are declared, so the screen is laid out by
   this file rather than by a second list somewhere else that can drift */
function groups() {
  const out = [];
  Object.keys(DEFS).forEach(k => {
    const g = DEFS[k].g || 'Look';
    let row = out.find(x => x.name === g);
    if (!row) out.push(row = { name: g, keys: [] });
    row.keys.push(k);
  });
  return out;
}

root.Options = { DEFS, KEYS, groups, get, set, next, all, apply, reset,
                 celAmt, dump, weigh, forget, say: (k, v) => DEFS[k].say[v] };

if (doc.body) apply();
else doc.addEventListener('DOMContentLoaded', apply);

})(window, document);
