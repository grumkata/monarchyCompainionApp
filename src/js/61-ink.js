/* ══════════════════════════════════════════════════════════════
   61-ink.js — DRAWING ON THE WOOD.

   grumkata: a player can "draw on the table if allowed by gm".

   A line drawn on the table is a THING on the table, kind 'ink', and that
   one decision does most of the work: it saves with the table, it undoes
   with Ctrl+Z, and it reaches everybody through the same per-thing board
   sync as a counter or a note (60-board-net.js) without a line of its own
   networking. It is locked where it was drawn — a line is not a piece to
   push about — and it carries who drew it (`by`), which is what lets a
   player rub out their own lines and nobody else's (TableModel.mayTouch).

   WHO MAY DRAW: the GM always, and alone at your own table you are the GM.
   At a live table a player may draw only while the GM allows it, which is a
   flag on the table's meta that only the host can write (Session.allow).

   The points are table units — two to the millimetre — stored relative to
   the stroke's own box, so the prop that draws it is only as big as the line.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const T = () => root.TableModel;
const D = () => root.Table3D;
const S = () => root.Session;

/* the inks you can pick from: a few that read on oak and on parchment */
const COLOURS = ['#1d1510', '#f4ecd8', '#b3202a', '#1f5fa8', '#2e7d3a', '#d8a31a'];
const WIDTHS = [{ id: 'fine', w: 5 }, { id: 'pen', w: 10 }, { id: 'brush', w: 22 }];

let tool = null;             /* null | 'draw' | 'erase' */
let colour = COLOURS[0];
let width = WIDTHS[1].w;
let stroke = null;           /* { pts:[x,y,...], el } while the pen is down */

const live = () => !!(S() && S().live);
function allowed() {
  if (!T() || !T().mayUseBox) return false;
  if (T().mayUseBox()) return true;
  return live() && S().allowed && S().allowed('draw');
}

function set(t) {
  if (t && !allowed()) t = null;
  tool = t || null;
  doc.body.classList.toggle('inking', tool === 'draw');
  doc.body.classList.toggle('erasing', tool === 'erase');
  root.dispatchEvent(new CustomEvent('monarchy:kit'));
}

/* ── THE LINE ITSELF ──────────────────────────────────────────
   Quadratic curves through the midpoints, which is the cheapest smoothing
   that does not make a hand-drawn line look like a polygon. */
function pathOf(p) {
  if (!p || p.length < 2) return '';
  if (p.length < 4) return `M${p[0]} ${p[1]}l0.1 0`;
  let d = `M${p[0]} ${p[1]}`;
  for (let i = 2; i < p.length - 2; i += 2) {
    const mx = (p[i] + p[i + 2]) / 2, my = (p[i + 1] + p[i + 3]) / 2;
    d += `Q${p[i]} ${p[i + 1]} ${mx} ${my}`;
  }
  return d + `L${p[p.length - 2]} ${p[p.length - 1]}`;
}
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/* only a colour, never anything a hostile board could put in an attribute */
const safeColour = c => /^#[0-9a-f]{3,8}$/i.test(String(c || '')) ? c : COLOURS[0];

/* what 24-table-props.js puts in an ink thing's face. The wide transparent
   twin is what an eraser hits: a two-millimetre line is too thin to find. */
function svg(t) {
  const d = pathOf(t.pts);
  const w = Math.max(1, Math.min(60, +t.wid || 10));
  return `<svg class="ink" width="${t.w}" height="${t.h}" viewBox="0 0 ${t.w} ${t.h}">
    <path class="ink-hit" d="${d}" stroke-width="${w + 26}"/>
    <path class="ink-line" d="${d}" stroke="${esc(safeColour(t.col))}" stroke-width="${w}"/>
  </svg>`;
}

/* ── PUTTING THE PEN DOWN ─────────────────────────────────────
   Taken in the capture phase, before 23-table3d.js can read the press as
   the start of a pan: with the pen out, dragging the wood draws on it. */
function overTable(e) {
  const vp = doc.getElementById('vp');
  if (!vp || !doc.body.classList.contains('at-table')) return false;
  if (!e.target || !e.target.closest || !e.target.closest('#vp')) return false;
  return !e.target.closest('.t3-hud, input, textarea, button');
}

function begin(e) {
  const p = D().screenToTable(e.clientX, e.clientY);
  stroke = { pts: [p.x, p.y], el: null };
  const tbl = doc.getElementById('tbl');
  const el = doc.createElement('div');
  el.className = 'prop t3-ink ink-live';
  el.dataset.z = 14; el.dataset.r = 0;
  tbl.appendChild(el);
  stroke.el = el;
  paintLive();
}
function extend(e) {
  if (!stroke) return;
  const p = D().screenToTable(e.clientX, e.clientY);
  const n = stroke.pts.length;
  /* a point every couple of millimetres is plenty, and keeps a long line
     from being thousands of numbers on the wire */
  if (Math.hypot(p.x - stroke.pts[n - 2], p.y - stroke.pts[n - 1]) < 5) return;
  if (n >= 3000) return;
  stroke.pts.push(p.x, p.y);
  paintLive();
}
function boxOf(pts, pad) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < pts.length; i += 2) {
    x0 = Math.min(x0, pts[i]); x1 = Math.max(x1, pts[i]);
    y0 = Math.min(y0, pts[i + 1]); y1 = Math.max(y1, pts[i + 1]);
  }
  return { x: Math.floor(x0 - pad), y: Math.floor(y0 - pad),
           w: Math.ceil(x1 - x0 + pad * 2), h: Math.ceil(y1 - y0 + pad * 2) };
}
const relative = (pts, b) => pts.map((v, i) => Math.round(v - (i % 2 ? b.y : b.x)));
function paintLive() {
  if (!stroke || !stroke.el) return;
  const b = boxOf(stroke.pts, width);
  stroke.el.dataset.x = b.x; stroke.el.dataset.y = b.y;
  stroke.el.innerHTML = `<div class="face t3-bare">${svg({
    pts: relative(stroke.pts, b), w: b.w, h: b.h, col: colour, wid: width })}</div>`;
  D().place(stroke.el);
}
function finish() {
  if (!stroke) return;
  const s = stroke; stroke = null;
  if (s.el && s.el.parentNode) s.el.parentNode.removeChild(s.el);
  if (!allowed()) return;
  const b = boxOf(s.pts, width);
  const me = S() || {};
  let name = 'Drawing';
  try { name = 'Drawn by ' + ((JSON.parse(root.localStorage.getItem('monarchy.me.v1')) || {}).name || 'someone'); }
  catch (e) {}
  T().put({ kind: 'ink', name, x: b.x, y: b.y, w: b.w, h: b.h,
            pts: relative(s.pts, b), col: colour, wid: width,
            by: live() ? me.uid : '', locked: true });
}

/* ── RUBBING OUT ──────────────────────────────────────────────
   One line at a time, and only yours unless you are the GM. */
function eraseAt(e) {
  const p = e.target && e.target.closest && e.target.closest('.prop.t3-ink');
  if (!p || !p.dataset.id) return false;
  const t = T().get(p.dataset.id);
  if (!t || !T().mayTouch(t)) return false;
  T().bin(t.id, true);
  return true;
}
function clear(all) {
  const mine = t => t.kind === 'ink' && (all ? T().mayUseBox() : T().mayTouch(t) &&
                                               (!live() || t.by === S().uid));
  const gone = T().all().filter(mine);
  if (!gone.length) return 0;
  T().begin();
  gone.forEach(t => T().bin(t.id, true));
  T().end();
  return gone.length;
}

function mount() {
  doc.addEventListener('pointerdown', e => {
    if (!tool || e.button !== 0 || !overTable(e)) return;
    if (!allowed()) { set(null); return; }
    e.preventDefault(); e.stopPropagation();
    if (tool === 'erase') { eraseAt(e); return; }
    begin(e);
  }, true);
  doc.addEventListener('pointermove', e => { if (stroke) extend(e); });
  doc.addEventListener('pointerup', () => { if (stroke) finish(); });
  root.addEventListener('blur', () => { if (stroke) finish(); });
  /* the GM can take the pen away mid-evening, and leaving a table ends it */
  root.addEventListener('monarchy:session', () => { if (tool && !allowed()) set(null); });
  root.addEventListener('monarchy:where', e => {
    if (!e.detail || e.detail.at !== 'table') set(null);
  });
}
if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', mount);
else mount();

root.Ink = { COLOURS, WIDTHS, svg, pathOf, allowed, set, clear,
             get tool() { return tool; },
             get colour() { return colour; }, set colour(c) { colour = safeColour(c); },
             get width() { return width; }, set width(w) { width = +w || width; } };

})(window, document);
