/* ══════════════════════════════════════════════════════════════
   64-kit.js — WHAT YOU BROUGHT TO THE TABLE.

   grumkata: "as a player you cant acess gm tools but you can still pullout
   any charcters sheets youve connected with your self as well as draw on the
   table if allowed by gm, make notes [...] or point at things on the table".

   The chest is the GM's (25-toolbox.js): scenes, people, pictures, models.
   This is the PLAYER'S — the four things a player at somebody else's table
   does with their own hands. The GM does not see it (see isPlayer below):

     SHEETS   your characters. Read one (it comes up as paper at your place,
              45-papers.js), and at a live table bring it to the table for
              the GM or take it home again (58-sheets-net.js).
     NOTES    your pocket (62-pocket.js): private notes, written and drawn
              on in your hand, dragged onto the wood to show everyone, and
              dragged back onto this to take them home.
     DRAW     a pen on the wood (61-ink.js), when the GM allows it.
     POINT    a ring where you click, on everybody's table (63-point.js).

   A rail down the left edge, one card beside it. Keys: N, D, P; Escape puts
   whatever is out away before the table menu hears it.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const T = () => root.TableModel;
const S = () => root.Session;
const C = () => root.Characters;
const live = () => !!(S() && S().live);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ICON = {
  sheets: '<svg viewBox="0 0 24 24"><path d="M6 2.5h8.5L19 7v14.5H6z"/><path d="M14.5 2.5V7H19M9 11h7M9 14h7M9 17h4.5"/></svg>',
  notes:  '<svg viewBox="0 0 24 24"><path d="M4 4h16v11l-5 5H4z"/><path d="M15 20v-5h5M7.5 9h9M7.5 12.5h6"/></svg>',
  draw:   '<svg viewBox="0 0 24 24"><path d="M4 20l1.2-4.6L16.6 4a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8z"/><path d="M14.5 6.1l3.4 3.4"/></svg>',
  point:  '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.6"/></svg>'
};
const NAMES = { sheets: 'Your characters  (C)', notes: 'Your notes  (N)',
                draw: 'Draw  (D)', point: 'Point  (P)' };

let el = null, rail = null, card = null;
let panel = null;             /* null | 'sheets' | 'notes' | 'draw' */

function mount() {
  if (el) return;
  el = doc.createElement('div');
  el.className = 'kit';
  el.innerHTML = `<div class="kit-rail">${['sheets', 'notes', 'draw', 'point'].map(k =>
      `<button class="kit-b" data-kit="${k}" title="${NAMES[k]}">${ICON[k]}</button>`).join('')}</div>
    <div class="kit-card" hidden></div>`;
  doc.body.appendChild(el);
  rail = el.querySelector('.kit-rail');
  card = el.querySelector('.kit-card');

  /* the kit is a control, never the table: nothing pressed on it pans */
  el.addEventListener('pointerdown', e => {
    e.stopPropagation();
    const pk = e.target.closest('[data-pk]');
    if (pk && root.Pocket) root.Pocket.press(pk.dataset.pk, e);
    const cd = e.target.closest('[data-cdrag]');
    if (cd) pressChar(cd.dataset.cdrag, e);
  });
  doc.addEventListener('pointermove', moveChar);
  doc.addEventListener('pointerup', releaseChar);
  el.addEventListener('wheel', e => e.stopPropagation());
  el.addEventListener('click', onClick);

  doc.addEventListener('keydown', onKey);
  ['monarchy:kit', 'monarchy:pocket', 'monarchy:sheets', 'monarchy:opts']
    .forEach(ev => root.addEventListener(ev, paint));
  /* NOT EVERY SESSION EVENT. The roll-call fires on every heartbeat and now
     on every turn of somebody's head (63-point.js), and redrawing the card
     each time lost whatever the pointer was hovering. Only the ones that
     change what the kit is: arriving, leaving, and the GM's permissions. */
  const MATTERS = { hosting: 1, joined: 1, left: 1, closed: 1, meta: 1, sheets: 1 };
  root.addEventListener('monarchy:session', e => {
    if (MATTERS[(e.detail || {}).what]) paint();
  });
  root.addEventListener('monarchy:where', e => {
    if (!e.detail || e.detail.at !== 'table') close();
    paint();
  });
  paint();
}

/* ══ WHAT IS SHOWING ═══════════════════════════════════════════ */
/* ── A PLAYER'S, NOT THE GM'S ─────────────────────────────────
   grumkata: "the gm shouldnt see player ui and vice versa". The kit was
   everybody's; it is a player's now, and the GM has the chest. Alone at your
   own table you are its GM (TableModel.mayUseBox), so the kit is there only
   at somebody else's table. `is-player` on the body is how the stylesheets
   hide the GM's own furniture from a player (13-table-ui.css). */
const isPlayer = () => !!(T() && T().mayUseBox && !T().mayUseBox());
function paint() {
  if (!el) return;
  const player = isPlayer();
  doc.body.classList.toggle('is-player', player);
  el.hidden = !player;
  if (!player) {
    panel = null; card.hidden = true; card.innerHTML = '';
    /* a pen or a pointer left out when you stop being a player is put away
       — without repainting from here, since putting them away repaints */
    if (root.Ink && root.Ink.tool) return root.Ink.set(null);
    if (root.Point && root.Point.on) return root.Point.set(false);
    return;
  }
  const canDraw = !!(root.Ink && root.Ink.allowed());
  const tool = root.Ink && root.Ink.tool;
  rail.querySelectorAll('.kit-b').forEach(b => {
    const k = b.dataset.kit;
    const on = (k === 'point') ? !!(root.Point && root.Point.on)
             : (k === 'draw') ? !!tool
             : panel === k;
    b.classList.toggle('on', on);
    /* no pen for a player the GM has not handed one to */
    if (k === 'draw') b.hidden = !canDraw;
  });
  if (panel === 'draw' && !tool) panel = null;
  card.hidden = !panel;
  if (!panel) { card.innerHTML = ''; return; }
  card.innerHTML = panel === 'sheets' ? sheetsCard()
                 : panel === 'notes'  ? notesCard()
                 : drawCard();
  card.dataset.panel = panel;
}

/* ── SHEETS ── */
function mine() {
  return (C() ? C().roster() : []).filter(c => !c.__shared);
}
function sheetsCard() {
  const own = mine();
  const at = root.SheetsNet ? root.SheetsNet.shared : [];
  const here = id => at.some(n => n.id === id);
  const rows = own.length ? own.map(c => {
      const brought = live() && here(c.id);
      return `<div class="kit-row">
        <span class="kit-nm kit-grab" data-cdrag="${esc(c.id)}" title="Drag onto the table"><b>${esc(C().nameOf(c))}</b>
          <i>${esc([c.who && c.who.species, c.who && c.who.rank].filter(Boolean).join(' · '))}</i></span>
        <button class="kit-chip" data-read="${esc(c.id)}">Read</button>
        ${live() ? `<button class="kit-chip${brought ? ' on' : ''}" data-bring="${esc(c.id)}"
            >${brought ? 'At the table' : 'Bring'}</button>` : ''}
      </div>`; }).join('')
    : `<p class="kit-none">No characters yet</p>`;
  /* the GM reads what everybody brought */
  return `<div class="kit-h">Your characters</div>${rows}${
    own.length ? '<p class="kit-none kit-tip">Drag one onto the table to put them down</p>' : ''}`;
}

/* ══ A CHARACTER, ONTO THE WOOD ════════════════════════════════
   grumkata: "players cant put sheet on table". They could bring one — which
   sent it to the GM and put nothing anywhere anybody could see — and read
   one, which laid it at their own place on their own screen only. What a
   character IS on the wood, for everyone, is their counter (43-tokens.js):
   the GM puts one down by taking it out of the chest, and this is the same
   thing for a player, with the same gesture the pocket already uses. It
   carries `by`, so it is theirs to move (TableModel.playerMayTouch), and its
   sheet comes to the table with it, as the chest's does (25-toolbox.js
   alsoBring). */
let cdrag = null;
function pressChar(id, e) {
  if (e.button !== 0) return;
  e.preventDefault();
  cdrag = { id, sx: e.clientX, sy: e.clientY, moved: false, el: null };
}
function moveChar(e) {
  if (!cdrag) return;
  if (!cdrag.moved && Math.hypot(e.clientX - cdrag.sx, e.clientY - cdrag.sy) < 6) return;
  if (!cdrag.moved) {
    const rec = C() && C().get(cdrag.id);
    if (!rec) { cdrag = null; return; }
    cdrag.moved = true;
    cdrag.el = doc.createElement('div');
    cdrag.el.className = 'kit-float';
    cdrag.el.textContent = C().nameOf(rec);
    doc.body.appendChild(cdrag.el);
    doc.body.classList.add('pk-dragging');
  }
  cdrag.el.style.left = e.clientX + 'px';
  cdrag.el.style.top = e.clientY + 'px';
  cdrag.el.classList.toggle('over', !!(root.Pocket && root.Pocket.overWood(e.clientX, e.clientY)));
}
function releaseChar(e) {
  if (!cdrag) return;
  const d = cdrag; cdrag = null;
  doc.body.classList.remove('pk-dragging');
  if (d.el && d.el.parentNode) d.el.parentNode.removeChild(d.el);
  if (d.moved && root.Pocket && root.Pocket.overWood(e.clientX, e.clientY)) placeChar(d.id, e.clientX, e.clientY);
}
function placeChar(id, sx, sy) {
  const D = root.Table3D, Tk = root.Tokens;
  const rec = C() && C().get(id);
  if (!D || !Tk || !rec) return;
  const p = D.screenToTable(sx, sy);
  const sz = root.Figures ? root.Figures.sizeOf({ kind: 'token' }, { entKind: 'unit' })
                          : { w: 150, h: 182 };
  if (live() && root.SheetsNet) root.SheetsNet.bring(id);
  Tk.make({ source: 'char', char: id, name: C().nameOf(rec), side: 'al',
            by: live() ? S().uid : '',
            x: Math.round(p.x - sz.w / 2), y: Math.round(p.y - sz.h / 2), w: sz.w, h: sz.h });
  paint();
}

/* ── NOTES ── */
function notesCard() {
  const l = root.Pocket ? root.Pocket.list() : [];
  return `<div class="kit-h">Your notes<button class="kit-chip" data-do="newnote">New</button></div>
    <div class="kit-notes">${l.map(n => root.Pocket.card(n)).join('') ||
      '<p class="kit-none">Nothing in your pocket</p>'}</div>`;
}

/* ── DRAW ── */
function drawCard() {
  const I = root.Ink;
  return `<div class="kit-h">Draw</div>
    <div class="kit-swatches">${I.COLOURS.map(c =>
      `<button class="kit-sw${c === I.colour && I.tool === 'draw' ? ' on' : ''}" data-ink="${c}"
         style="--sw:${c}"></button>`).join('')}</div>
    <div class="kit-chips">${I.WIDTHS.map(w =>
      `<button class="kit-chip${w.w === I.width ? ' on' : ''}" data-wid="${w.w}">
         <span class="kit-wid" style="--w:${Math.max(2, w.w / 2.5)}px"></span></button>`).join('')}
      <button class="kit-chip${I.tool === 'erase' ? ' on' : ''}" data-do="erase">Rub out</button></div>
    <div class="kit-chips">
      <button class="kit-chip" data-do="clearmine">Clear mine</button></div>`;
}

/* ══ DOING THINGS ═══════════════════════════════════════════════ */
function toggle(k) {
  const I = root.Ink, P = root.Point;
  if (k === 'point') {
    const was = P && P.on;
    if (I) I.set(null);
    panel = null;
    if (P) P.set(!was);
    return paint();
  }
  if (k === 'draw') {
    if (P) P.set(false);
    if (I && I.tool) { I.set(null); panel = null; }
    else if (I && I.allowed()) { I.set('draw'); panel = 'draw'; }
    return paint();
  }
  /* sheets and notes are cards; opening one puts the pen and the pointer down */
  if (I && I.tool) I.set(null);
  if (P && P.on) P.set(false);
  panel = (panel === k) ? null : k;
  paint();
}
function close() {
  if (root.Ink && root.Ink.tool) root.Ink.set(null);
  if (root.Point && root.Point.on) root.Point.set(false);
  panel = null;
  paint();
}
const busy = () => !!panel || !!(root.Ink && root.Ink.tool) || !!(root.Point && root.Point.on);

function onClick(e) {
  const b = e.target.closest('[data-kit]');
  if (b) return toggle(b.dataset.kit);
  const r = e.target.closest('[data-read]');
  if (r && root.Papers) { root.Papers.open(r.dataset.read); return; }
  const br = e.target.closest('[data-bring]');
  if (br && root.SheetsNet) {
    const id = br.dataset.bring;
    const p = root.SheetsNet.isShared(id) ? root.SheetsNet.takeBack(id) : root.SheetsNet.bring(id);
    br.classList.add('busy');
    Promise.resolve(p).then(paint, paint);
    return;
  }
  const ink = e.target.closest('[data-ink]');
  if (ink) { root.Ink.colour = ink.dataset.ink; root.Ink.set('draw'); return paint(); }
  const wid = e.target.closest('[data-wid]');
  if (wid) { root.Ink.width = +wid.dataset.wid; if (root.Ink.tool !== 'draw') root.Ink.set('draw');
             return paint(); }
  const d = e.target.closest('[data-do]');
  if (!d) return;
  if (d.dataset.do === 'newnote' && root.Pocket) { const n = root.Pocket.add({}); root.Pocket.open(n.id); return; }
  if (d.dataset.do === 'erase') { root.Ink.set(root.Ink.tool === 'erase' ? 'draw' : 'erase'); return paint(); }
  if (d.dataset.do === 'clearmine') { root.Ink.clear(false); return; }
}

function onKey(e) {
  if (!doc.body.classList.contains('at-table') || !isPlayer()) return;
  const a = doc.activeElement, tag = a && a.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (a && a.isContentEditable)) return;
  if (root.Pocket && root.Pocket.isOpen()) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'Escape' && busy()) { e.preventDefault(); close(); return; }
  const k = { c: 'sheets', C: 'sheets', n: 'notes', N: 'notes', d: 'draw', D: 'draw',
              p: 'point', P: 'point' }[e.key];
  if (!k) return;
  if (k === 'draw' && !(root.Ink && root.Ink.allowed())) return;
  e.preventDefault(); toggle(k);
}

/* is this point on the kit? The pocket's drag asks, so a card let go over
   the kit is not put on the table, and a note dragged off the table onto
   the kit goes into your pocket (24-table-props.js dropped). */
function over(x, y) {
  if (!el) return false;
  for (const part of [rail, card]) {
    if (!part || part.hidden) continue;
    const r = part.getBoundingClientRect();
    if (r.width && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return true;
  }
  return false;
}
/* a note being dragged off the table lights the pocket up under it */
function hover(x, y, isNote) {
  if (!el) return;
  el.classList.toggle('catching', !!isNote && over(x, y));
}

if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', mount);
else mount();

root.Kit = { toggle, close, busy, over, hover, paint,
             get panel() { return panel; } };

})(window, document);
