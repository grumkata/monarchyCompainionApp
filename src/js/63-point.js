/* ══════════════════════════════════════════════════════════════
   63-point.js — "THERE. THAT ONE."

   grumkata: players can "point at things on the table".

   A point is a ring on the wood, in your own colours, with your name on it,
   that everybody at the table sees for a few seconds and then is gone. It is
   not a thing on the table — nothing is left behind and nothing is saved —
   so it does not go through the board. It goes through your presence node
   (Session.point), which every client already writes and watches.

   With the Point tool out (the kit, or P), a click on the wood points
   there. Pointing never moves or selects anything.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const S = () => root.Session;
const D = () => root.Table3D;
/* how long a point stays on the wood, ms — one pulse, then gone. It was
   3.2s, and grumkata: "pointer lats for too long". Matches pingout in
   13-table-ui.css. */
const HOLD = 1500;

let on = false;
const seen = {};                 /* uid -> the last point of theirs drawn */
let primed = false;              /* the first roll-call is history, not news */

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeColour = c => /^#[0-9a-f]{3,8}$/i.test(String(c || '')) ? c : '#d8a31a';

function set(v) {
  on = !!v;
  doc.body.classList.toggle('pointing', on);
  root.dispatchEvent(new CustomEvent('monarchy:kit'));
}

/* your colour is your livery, the same one the chrome wears */
function myColour() {
  try {
    const arms = root.Shell && root.Shell.arms && root.Shell.arms();
    const c = arms && root.Heraldry && root.Heraldry.liveryOf && root.Heraldry.liveryOf(arms);
    if (c) return c;
  } catch (e) {}
  return '#d8a31a';
}
function myName() {
  try { return (JSON.parse(root.localStorage.getItem('monarchy.me.v1')) || {}).name || 'You'; }
  catch (e) { return 'You'; }
}

/* ── A RING ON THE WOOD ───────────────────────────────────────
   Lying flat on the table (23-table3d.js keeps t3-ping flat), in the same
   perspective as everything else, so it is on the spot rather than over it. */
function show(x, y, name, colour) {
  const tbl = doc.getElementById('tbl');
  if (!tbl || !D()) return;
  const el = doc.createElement('div');
  el.className = 'prop t3-ping';
  el.dataset.x = Math.round(x); el.dataset.y = Math.round(y);
  el.dataset.z = 70; el.dataset.r = 0;
  el.style.setProperty('--ping', safeColour(colour));
  el.innerHTML = `<div class="face ping-face"><i></i><i></i><i></i>
    <b>${esc(name || '')}</b></div>`;
  tbl.appendChild(el);
  D().place(el);
  setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, HOLD);
}

function pointAt(sx, sy) {
  const p = D().screenToTable(sx, sy);
  const c = myColour();
  show(p.x, p.y, myName(), c);
  if (S() && S().live) S().point(p.x, p.y, c);
}

/* ── EVERYBODY ELSE'S ─────────────────────────────────────────
   Read out of the roll-call. A point is drawn once, when its `k` is new —
   and not at all if it is old news: sitting down at a table where somebody
   pointed ten minutes ago should not show you where. */
function heard(members) {
  const me = S() && S().uid;
  (members || []).forEach(m => {
    const p = m && m.ping;
    if (!p || !p.k || m.uid === me) return;
    if (seen[m.uid] === p.k) return;
    seen[m.uid] = p.k;
    if (!primed) return;
    if (root.Net && root.Net.ageOf && root.Net.ageOf(p.at) > 10000) return;
    if (!doc.body.classList.contains('at-table')) return;
    show(p.x, p.y, m.name || 'Someone', p.c);
  });
  primed = true;
}

/* ── AND WHERE YOU ARE LOOKING ────────────────────────────────
   Your head's turn in the chair (23-table3d.js, __yaw — nought while you are
   leaning over the wood), sent when it has moved three degrees, five times a
   second at most. Everybody else turns your figure a little with it
   (27-table-gl.js faceSeats). */
let sentLook = 0;
function lookOut() {
  if (!S() || !S().live || !S().look || !doc.body.classList.contains('at-table')) return;
  const d = Math.round(root.__yaw ? root.__yaw() * 180 / Math.PI : 0);
  if (Math.abs(d - sentLook) < 3 && !(d === 0 && sentLook !== 0)) return;
  sentLook = d;
  S().look(d);
}

function mount() {
  root.setInterval(lookOut, 200);
  doc.addEventListener('pointerdown', e => {
    if (!on || e.button !== 0) return;
    if (!doc.body.classList.contains('at-table')) return;
    if (!e.target || !e.target.closest || !e.target.closest('#vp')) return;
    if (e.target.closest('.t3-hud, input, textarea, button')) return;
    e.preventDefault(); e.stopPropagation();
    pointAt(e.clientX, e.clientY);
  }, true);
  root.addEventListener('monarchy:session', e => {
    const d = e.detail || {};
    if (d.what === 'left' || d.what === 'closed' || d.what === 'joined' || d.what === 'hosting') {
      Object.keys(seen).forEach(k => delete seen[k]);
      primed = false;
    }
    if (d.members) heard(d.members);
  });
  root.addEventListener('monarchy:where', e => {
    if (!e.detail || e.detail.at !== 'table') set(false);
  });
}
if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', mount);
else mount();

root.Point = { set, show, pointAt, get on() { return on; } };

})(window, document);
