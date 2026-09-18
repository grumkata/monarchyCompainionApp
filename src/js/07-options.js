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
  cel: { d: 'full', of: ['off', 'soft', 'full'],
         t: 'Stylised 3D',
         w: 'The banded light, the house ramp and the gilt edge on every model. Off is plain lighting.',
         say: { off: 'Off', soft: 'Softened', full: 'Full' } },
  grade: { d: 'on', of: ['off', 'on'],
         t: 'Film grade',
         w: 'Warm light against cool shadow, a falloff at the edges, and moving grain over the lot.',
         say: { off: 'Off', on: 'On' } }
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

root.Options = { DEFS, KEYS, get, set, next, all, apply, reset,
                 celAmt, dump, weigh, forget, say: (k, v) => DEFS[k].say[v] };

if (doc.body) apply();
else doc.addEventListener('DOMContentLoaded', apply);

})(window, document);
