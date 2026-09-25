/* ══════════════════════════════════════════════════════════════
   62-pocket.js — NOTES YOU KEEP ON YOU.

   grumkata: players can "make notes (personal notes that only appear on
   your screen but can aslo be dragged on the table thne back into your
   hand you may also draw on a note)".

   So a note has two places to be, and where it is decides who sees it:

     IN YOUR POCKET   yours alone. It lives in this machine's own store,
                      never on the wire, and it is there on every table you
                      sit at, because it is yours and not the table's.
     ON THE WOOD      everybody's. Dragged out of the pocket onto the table
                      it becomes an ordinary note thing, with `by` on it so
                      you can still pick it up again — and dragged back onto
                      the pocket it leaves the table and is private again.

   Writing and drawing happen in your hand: open a note and it comes up to
   read, with a pen for words and a pen for pictures. The sketch is kept in
   the note's own square, 0-1000 each way, so it is the same drawing at any
   size the note is shown.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const KEY = 'monarchy.pocket.v1';
const T = () => root.TableModel;
const D = () => root.Table3D;
const S = () => root.Session;
const TINTS = ['cream', 'blue', 'red'];
const PENS = ['#241a10', '#b3202a', '#1f5fa8', '#2e7d3a'];

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => 'pk' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const live = () => !!(S() && S().live);

/* ── THE POCKET ITSELF ────────────────────────────────────── */
function list() {
  try { const v = JSON.parse(root.localStorage.getItem(KEY)); return Array.isArray(v) ? v : []; }
  catch (e) { return []; }
}
function save(l) {
  try { root.localStorage.setItem(KEY, JSON.stringify(l)); } catch (e) {}
  root.dispatchEvent(new CustomEvent('monarchy:pocket'));
}
const get = id => list().find(n => n.id === id) || null;
function add(fields) {
  const n = Object.assign({ id: uid(), text: '', tint: 'cream', sketch: [], at: Date.now() }, fields || {});
  const l = list(); l.unshift(n); save(l);
  return n;
}
function update(id, fields) {
  const l = list(), i = l.findIndex(n => n.id === id);
  if (i < 0) return null;
  l[i] = Object.assign(l[i], fields); save(l);
  return l[i];
}
function remove(id) { save(list().filter(n => n.id !== id)); }
const titleOf = n => (String(n.text || '').split('\n').find(s => s.trim()) || 'Note').trim().slice(0, 40);

/* ── A SKETCH, DRAWN ──────────────────────────────────────── */
const safePen = c => /^#[0-9a-f]{3,8}$/i.test(String(c || '')) ? c : PENS[0];
function sketchSVG(sk, cls) {
  const lines = (Array.isArray(sk) ? sk : []).map(s =>
    `<path d="${root.Ink ? root.Ink.pathOf(s.p) : ''}" stroke="${esc(safePen(s.c))}"
           stroke-width="${Math.max(2, Math.min(60, +s.w || 8))}"/>`).join('');
  return `<svg class="${cls || 'nt-sketch'}" viewBox="0 0 1000 1000" preserveAspectRatio="none">${lines}</svg>`;
}

/* the card in the pocket: the paper, its first words, and its drawing */
function card(n) {
  return `<span class="pk-card t-${esc(n.tint || 'cream')}" data-pk="${esc(n.id)}">
      <span class="pk-txt">${esc(String(n.text || '').slice(0, 140))}</span>
      ${n.sketch && n.sketch.length ? sketchSVG(n.sketch, 'pk-sk') : ''}
    </span>`;
}

/* ══ FROM THE POCKET TO THE WOOD ═════════════════════════════
   Press a card and drag it off the pocket: it follows the pointer, and let
   go over the table it lands there as a note everyone can see. Press and
   let go without moving and it opens instead. */
let drag = null;
function press(id, e) {
  if (e.button !== 0) return;
  e.preventDefault();
  drag = { id, sx: e.clientX, sy: e.clientY, moved: false, el: null };
}
function move(e) {
  if (!drag) return;
  if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6) return;
  if (!drag.moved) {
    drag.moved = true;
    const n = get(drag.id); if (!n) { drag = null; return; }
    drag.el = doc.createElement('div');
    drag.el.className = 'pk-float';
    drag.el.innerHTML = card(n);
    doc.body.appendChild(drag.el);
    doc.body.classList.add('pk-dragging');
  }
  drag.el.style.left = e.clientX + 'px';
  drag.el.style.top = e.clientY + 'px';
  drag.el.classList.toggle('over', overWood(e.clientX, e.clientY));
}
function release(e) {
  if (!drag) return;
  const d = drag; drag = null;
  doc.body.classList.remove('pk-dragging');
  if (d.el && d.el.parentNode) d.el.parentNode.removeChild(d.el);
  if (!d.moved) { open(d.id); return; }
  if (overWood(e.clientX, e.clientY)) lay(d.id, e.clientX, e.clientY);
  else if (!(root.Kit && root.Kit.over(e.clientX, e.clientY))) hint('Put it down on the table itself');
}
function hint(m) {
  const t = doc.getElementById('toast'); if (!t) return;
  t.textContent = m; t.classList.add('on');
  clearTimeout(hint._t); hint._t = setTimeout(() => t.classList.remove('on'), 1900);
}
/* ON THE WOOD, not merely over the window. The viewport is the whole screen
   and most of it, sat back in your chair, is the room — and a note let go
   over the wall was put where screenToTable said, which is a point on the
   plane of the table a long way past its rim: out of sight, and already gone
   from the pocket. grumkata: "player side notes disappear". */
function overWood(x, y) {
  const vp = doc.getElementById('vp');
  if (!vp || !doc.body.classList.contains('at-table')) return false;
  if (root.Kit && root.Kit.over(x, y)) return false;
  const r = vp.getBoundingClientRect();
  if (!(x >= r.left && x <= r.right && y >= r.top && y <= r.bottom)) return false;
  if (!D() || !D().onWood) return true;
  const p = D().screenToTable(x, y);
  return D().onWood(p.x, p.y, 60);
}
function lay(id, sx, sy) {
  const n = get(id); if (!n || !T()) return;
  const p = D().screenToTable(sx, sy);
  if (D().onWood && !D().onWood(p.x, p.y, 60)) return;   /* it stays in your pocket */
  const W = 200, H = 200;                    /* a 100mm square, like any note */
  T().put({ kind: 'note', name: titleOf(n), text: n.text || '', tint: n.tint || 'cream',
            sketch: n.sketch || [], by: live() ? S().uid : '',
            x: Math.round(p.x - W / 2), y: Math.round(p.y - H / 2), w: W, h: H });
  remove(id);
}

/* ══ FROM THE WOOD BACK INTO YOUR POCKET ═════════════════════
   24-table-props.js asks this when a note is let go over the pocket. Only
   a note you may touch — your own, or any of them if you are the GM. */
function pocket(t) {
  if (!t || t.kind !== 'note' || !T().mayTouch(t)) return false;
  add({ text: t.text || '', tint: t.tint || 'cream', sketch: t.sketch || [] });
  T().bin(t.id, true);
  return true;
}

/* ══ WHEN YOU GET UP FROM THE TABLE ══════════════════════════
   grumkata: "player side notes disappear". A note you laid on the wood left
   your pocket to go there, and your copy of that wood is emptied the moment
   you leave or the GM closes the table (60-board-net.js) — so every note
   you had not dragged back first was simply gone from this machine.

   60-board-net.js shows us the guest table one last time before it empties
   it. Whatever reclaimable() picks out of it goes back in your pocket. The
   table's own copy is not touched either way: a player leaving takes
   nothing off the GM's table.

   `things`  everything on your copy of the wood, the GM's pieces included
   `me`      your uid at this table — your own pieces carry it as `by`
   `why`     'left' (you got up; the game goes on without you)
             or 'closed' (the GM ended it; the table is gone for everyone)
   Returns the things to turn back into pocket notes. */
function reclaimable(things, me, why) {
  // TODO(grumkata): which of these come home with you?
  return [];
}
root.addEventListener('monarchy:guest-leaving', e => {
  const d = e.detail || {};
  const me = S() && S().uid;
  if (!me) return;
  reclaimable(d.things || [], me, d.why).forEach(t => {
    if (t && t.kind === 'note')
      add({ text: t.text || '', tint: t.tint || 'cream', sketch: Array.isArray(t.sketch) ? t.sketch : [] });
  });
});

/* ══ READING ONE, WRITING ON IT, DRAWING ON IT ═══════════════ */
let ed = null, edId = null, pen = PENS[0], mode = 'write', inkNow = null;
function shell() {
  if (ed) return ed;
  ed = doc.createElement('div');
  ed.id = 'pk-ed';
  ed.hidden = true;
  doc.body.appendChild(ed);
  ed.addEventListener('pointerdown', e => {
    if (e.target === ed) { e.stopPropagation(); return close(); }
    e.stopPropagation();
  });
  ed.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); close(); }
  });
  ed.addEventListener('wheel', e => e.stopPropagation());
  ed.addEventListener('click', onEdClick);
  return ed;
}
function open(id) {
  const n = get(id); if (!n) return;
  shell(); edId = id; mode = 'write';
  paintEd(n);
  ed.hidden = false;
  doc.body.classList.add('pk-reading');
  const ta = ed.querySelector('textarea'); if (ta) ta.focus();
}
function close() {
  if (!ed || ed.hidden) return;
  ed.hidden = true; edId = null; inkNow = null;
  doc.body.classList.remove('pk-reading');
}
const isOpen = () => !!ed && !ed.hidden;
function paintEd(n) {
  ed.innerHTML =
    `<div class="pk-sheet t-${esc(n.tint || 'cream')}${mode === 'draw' ? ' drawing' : ''}">
       <textarea spellcheck="false" placeholder="Write on it">${esc(n.text || '')}</textarea>
       <div class="pk-draw">${sketchSVG(n.sketch, 'pk-sk-big')}</div>
     </div>
     <div class="pk-bar">
       <button class="pk-b${mode === 'write' ? ' on' : ''}" data-pk-mode="write">Write</button>
       <button class="pk-b${mode === 'draw' ? ' on' : ''}" data-pk-mode="draw">Draw</button>
       <span class="pk-pens">${PENS.map(c =>
         `<button class="pk-pen${c === pen ? ' on' : ''}" data-pk-pen="${c}" style="--pen:${c}"></button>`).join('')}</span>
       <button class="pk-b" data-pk-do="unsketch">Clear drawing</button>
       <span class="pk-tints">${TINTS.map(t =>
         `<button class="pk-tint t-${t}${t === (n.tint || 'cream') ? ' on' : ''}" data-pk-tint="${t}"></button>`).join('')}</span>
       <button class="pk-b bad" data-pk-do="tear">Tear it up</button>
       <button class="pk-b gilt" data-pk-do="done">Done</button>
     </div>`;
  const ta = ed.querySelector('textarea');
  ta.addEventListener('input', () => { if (edId) update(edId, { text: ta.value }); });
  const pad = ed.querySelector('.pk-draw');
  pad.addEventListener('pointerdown', e => {
    if (mode !== 'draw') return;
    e.preventDefault();
    pad.setPointerCapture(e.pointerId);
    inkNow = { c: pen, w: 8, p: [] };
    addPoint(pad, e);
  });
  pad.addEventListener('pointermove', e => { if (inkNow) addPoint(pad, e); });
  const end = () => {
    if (!inkNow) return;
    const s = inkNow; inkNow = null;
    if (s.p.length < 2) return;
    const n2 = get(edId); if (!n2) return;
    update(edId, { sketch: (n2.sketch || []).concat([s]).slice(-200) });
    repaintSketch();
  };
  pad.addEventListener('pointerup', end);
  pad.addEventListener('pointercancel', end);
}
function addPoint(pad, e) {
  const r = pad.getBoundingClientRect();
  const x = Math.round((e.clientX - r.left) / r.width * 1000);
  const y = Math.round((e.clientY - r.top) / r.height * 1000);
  const p = inkNow.p, n = p.length;
  if (n && Math.hypot(x - p[n - 2], y - p[n - 1]) < 6) return;
  p.push(Math.max(0, Math.min(1000, x)), Math.max(0, Math.min(1000, y)));
  /* drawn as it goes: the finished strokes, and this one on top */
  const n0 = get(edId) || {};
  pad.innerHTML = sketchSVG((n0.sketch || []).concat([inkNow]), 'pk-sk-big');
}
function repaintSketch() {
  const n = get(edId); if (!n || !ed) return;
  const pad = ed.querySelector('.pk-draw');
  if (pad) pad.innerHTML = sketchSVG(n.sketch, 'pk-sk-big');
}
let tearArmed = 0;
function onEdClick(e) {
  const n = get(edId); if (!n) return;
  const m = e.target.closest('[data-pk-mode]');
  if (m) { mode = m.dataset.pkMode; return paintEd(get(edId)); }
  const p = e.target.closest('[data-pk-pen]');
  if (p) { pen = p.dataset.pkPen; mode = 'draw'; return paintEd(get(edId)); }
  const t = e.target.closest('[data-pk-tint]');
  if (t) { update(edId, { tint: t.dataset.pkTint }); return paintEd(get(edId)); }
  const d = e.target.closest('[data-pk-do]');
  if (!d) return;
  if (d.dataset.pkDo === 'done') return close();
  if (d.dataset.pkDo === 'unsketch') { update(edId, { sketch: [] }); return repaintSketch(); }
  if (d.dataset.pkDo === 'tear') {
    /* two presses, the way everything final in this app asks */
    if (Date.now() - tearArmed > 3000) { tearArmed = Date.now(); d.textContent = 'Press again'; return; }
    tearArmed = 0; remove(edId); close();
  }
}

function mount() {
  doc.addEventListener('pointermove', move);
  doc.addEventListener('pointerup', release);
  root.addEventListener('monarchy:where', e => {
    if (!e.detail || e.detail.at !== 'table') close();
  });
}
if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', mount);
else mount();

root.Pocket = { list, get, add, update, remove, card, press, open, close, isOpen,
                pocket, sketchSVG, titleOf, overWood, KEY };

})(window, document);
