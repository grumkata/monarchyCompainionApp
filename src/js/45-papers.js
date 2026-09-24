/* ══════════════════════════════════════════════════════════════
   45-papers.js — A RECORD, LYING ON THE TABLE.

   It used to be a panel bolted to the right-hand edge of the screen:
   the-toolbox.md called papers "windows onto records, ON YOUR OWN
   END", and a fixed panel was the cheap reading of that.

   grumkata: "redo how paper is so its actually physically on the
   table". So a record is two things now, and they are the same
   record:

     THE SHEET   a real .prop on the wood at your end, laid slightly
                 askew the way a sheet of paper actually lies. It
                 pans, tilts and zooms with the table, it can be
                 shoved about, and at table zoom you can see that it
                 is your sheet — the plates, the numbers, the ink —
                 without being able to read a word of it. Which is
                 exactly what a character sheet across a table looks
                 like.

     THE READING a press picks it up: the sheet rises off the wood
                 to full size in front of you, where it can be read
                 and written on. Escape, the scrim, or its own mark
                 puts it back down on the spot it came from.

   The rise is a FLIP — the reader is measured where it will be and
   animated from where the sheet actually is on the wood, so the
   paper you pressed is the paper that comes up.

   Both are drawn by the SAME renderer the hall uses: `Sheet.render`
   for the markup, `Sheet.act`/`Sheet.setPath` for the two doors every
   change goes through. Nothing about the record is reimplemented
   here. 01-sheet.css is scoped to `.tp` at build time, so both the
   sheet on the wood and the reading wear it.

   Saving writes back to the hall's roster and then tells the board:
   a token IS this character, so changing Fortitude on the record
   changes the hit points of the piece standing on the line.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

let openId = null;     /* the record being read, if any */
let laidId = null;     /* the record lying on the wood */
let rec = null;

const el = () => doc.getElementById('tp');
const paper = () => doc.getElementById('tp-paper');
const current = () => rec;

/* ══ A4, AND AT YOUR OWN PLACE ═════════════════════════════════
   Two units are one millimetre on this table (23-table3d.js), so a sheet
   of paper is 420 x 594 and nothing else. It used to be 900 units wide —
   41cm, a drawing board — which is most of why "placing any paper" ate
   the table.

   And it lies at YOUR PLACE, not at a fixed corner: the table seats eight
   and each of them has a chair, a spot on the wood in front of it and a
   direction that spot is read from (22-table-model.js seatSpot). Your own
   seat is the near one unless you have said otherwise (Shell.seat()). */
const PAPER = { w: 210 * 2, h: 297 * 2 };
const AT_KEY = 'monarchy.papers.at';
function home() {
  const T = root.TableModel;
  const seats = (T && T.seats) ? T.seats() : [];
  const mine = seats[(root.Shell && root.Shell.seat) ? root.Shell.seat() : 0] || seats[0];
  if (!mine || !T.seatSpot) return { x: 2200 - PAPER.w / 2, y: 3300, r: 0 };
  const at = T.seatSpot(mine, T.R * 0.70);
  return { x: Math.round(at.x - PAPER.w / 2),
           y: Math.round(at.y - PAPER.h / 2),
           /* a hand's turn off square, because paper never lies straight */
           r: Math.round(at.r) - 2 };
}
function savedAt() {
  try { return Object.assign(home(), JSON.parse(root.localStorage.getItem(AT_KEY)) || {}); }
  catch (e) { return home(); }
}
function saveAt(p) {
  try {
    root.localStorage.setItem(AT_KEY, JSON.stringify({
      x: +p.dataset.x, y: +p.dataset.y, r: +p.dataset.r || 0 }));
  } catch (e) {}
}

/* ══ THE SHEET ON THE WOOD ════════════════════════════════════ */
function makePaper() {
  let p = paper();
  if (p) return p;
  const tbl = doc.getElementById('tbl');
  if (!tbl || !root.Table3D) return null;
  p = doc.createElement('div');
  p.id = 'tp-paper';
  p.className = 'prop tp tp-paper';
  const at = savedAt();
  p.dataset.x = at.x; p.dataset.y = at.y; p.dataset.r = at.r;
  /* rests above the mat: a sheet of paper lies ON whatever is under it */
  p.dataset.rest = 46; p.dataset.z = 46;
  p.innerHTML = '<div class="face tp-face"></div>';
  tbl.appendChild(p);

  /* A PRESS PICKS IT UP; A DRAG ONLY MOVES IT. 23-table3d.js already runs
     the drag (it is an ordinary prop), and it puts a piece back if the
     pointer travelled less than four pixels — so this only has to tell the
     two apart the same way the chest does. */
  let from = null;
  p.addEventListener('pointerdown', e => { from = { x: e.clientX, y: e.clientY }; });
  p.addEventListener('pointerup', e => {
    const near = from && Math.hypot(e.clientX - from.x, e.clientY - from.y) < 5;
    from = null;
    if (near) read(); else saveAt(p);
  });
  root.Table3D.place(p);
  return p;
}

function lay(id) {
  const r = root.Characters && root.Characters.get(id);
  if (!r || !root.Sheet) return;
  laidId = id;
  rec = root.Sheet.fill(r); rec.id = id;
  const p = makePaper();
  if (!p) return;
  p.hidden = false;
  paintPaper();
  root.Table3D.place(p);
}

function paintPaper() {
  const p = paper();
  if (!p || !rec) return;
  const face = p.querySelector('.tp-face');
  /* the sheet itself, at the size a sheet of paper is on this table */
  face.innerHTML = root.Sheet.render(rec);
}

/* take it off the table altogether */
function away() {
  const p = paper();
  if (p && p.parentNode) p.parentNode.removeChild(p);
  laidId = null;
  close();
}

/* ══ PICKING IT UP ════════════════════════════════════════════ */
function shell() {
  let p = el();
  if (p) return p;

  const scrim = doc.createElement('div');
  scrim.id = 'tp-scrim';
  scrim.hidden = true;
  scrim.addEventListener('pointerdown', e => { e.stopPropagation(); close(); });
  doc.body.appendChild(scrim);

  p = doc.createElement('aside');
  p.id = 'tp';
  p.className = 'tp';
  p.hidden = true;
  doc.body.appendChild(p);

  /* the two doors, scoped to this paper so the hall's handlers stay the
     hall's — same calls, same record, same rules */
  p.addEventListener('click', e => {
    if (e.target.closest('[data-tp-close]')) return close();
    if (e.target.closest('[data-tp-away]')) return away();
    const pick = e.target.closest('[data-tp-open]');
    if (pick) return open(pick.dataset.tpOpen);
    const r = current(); if (!r) return;
    const step = e.target.closest('[data-s]');
    const onField = e.target.dataset && e.target.dataset.p != null;
    if (step && !onField) {
      const out = root.Sheet.act(r, step.dataset.s, step.dataset.a || '');
      if (out) { if (out !== 'view') commit(r); paint(); }
    }
  });

  p.addEventListener('input', e => {
    const d = e.target.dataset || {};
    if (d.p == null) return;
    const r = current(); if (!r) return;
    root.Sheet.setPath(r, d.p, e.target.value);
    /* the leaf never redraws while you write — only the numbers that moved do,
       so the caret stays where you put it (menu2.js's own rule) */
    root.Sheet.repaintNumbers(r, p);
    /* Written through on every keystroke rather than debounced. A record is a
       few kilobytes and this is one localStorage write; the debounce bought
       nothing and cost the thing that matters — a change reaching the board. */
    commit(r);
  });

  /* the table listens for keys; a record you are writing in is not the table */
  p.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); close(); }
  });
  p.addEventListener('pointerdown', e => e.stopPropagation());
  p.addEventListener('wheel', e => e.stopPropagation());
  doc.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !el().hidden) { e.preventDefault(); close(); }
  });
  return p;
}

/* THE RISE. Measured where it is going, animated from where the sheet
   actually lies — so it is the paper you pressed that comes up, not a
   panel that appeared. */
function rise(node, from, back) {
  if (!from || !from.width) return;
  const to = node.getBoundingClientRect();
  if (!to.width) return;
  const s = Math.max(0.08, from.width / to.width);
  const dx = (from.left + from.width / 2) - (to.left + to.width / 2);
  const dy = (from.top + from.height / 2) - (to.top + to.height / 2);
  const there = { transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: 0.25 };
  const here = { transform: 'none', opacity: 1 };
  return node.animate(back ? [here, there] : [there, here],
    { duration: back ? 300 : 420, easing: back ? 'cubic-bezier(.5,0,.85,.4)'
                                               : 'cubic-bezier(.16,.84,.24,1)' });
}

function read() {
  if (!rec) return;
  const p = shell();
  const from = paper() && paper().getBoundingClientRect();
  openId = laidId;
  p.hidden = false;
  doc.getElementById('tp-scrim').hidden = false;
  doc.body.classList.add('reading');
  paint();
  rise(p, from);
}

/* ── which record ─────────────────────────────────────────────
   One character: lay it out and pick it up. Several: they are laid out to
   choose from, in the record's own hand rather than a dropdown. */
function pick() {
  const list = root.Characters ? root.Characters.roster() : [];
  if (!list.length) { toast('No characters yet — make one in the hall.'); return; }
  if (list.length === 1) return open(list[0].id);
  if (laidId) return read();            /* one is already at your end */
  const p = shell();
  p.hidden = false;
  doc.getElementById('tp-scrim').hidden = false;
  doc.body.classList.add('reading');
  openId = null; rec = null;
  p.innerHTML =
    `<div class="tp-head"><span class="plaque">Papers</span>
       <button class="tp-x" data-tp-close>&#10005;</button></div>
     <div class="tp-pickers">${list.map(c => {
        const d = root.Sheet.derived(root.Sheet.fill(c));
        return `<button class="tp-pick" data-tp-open="${c.id}">
          <b>${esc(root.Characters.nameOf(c))}</b>
          <i>${esc((c.who && c.who.species) || '')} ${esc((c.who && c.who.rank) || '')}</i>
          <span>${d.hp} health</span></button>`;
      }).join('')}</div>`;
}

function open(id) {
  lay(id);
  read();
}

function paint() {
  const p = el(); if (!p || !rec) return;
  p.innerHTML =
    `<div class="tp-head">
       <span class="plaque">${esc(root.Characters.nameOf(rec))}</span>
       <button class="tp-x" data-tp-away title="Take it off the table">&#8615;</button>
       <button class="tp-x" data-tp-close title="Put it back down (Esc)">&#10005;</button>
     </div>
     <div class="tp-leaf" id="tp-leaf">${root.Sheet.render(rec)}</div>`;
  fitLeaf();
}

/* THE RECORD IS 900 WIDE AND THE READING WAS NOT. The sheet is laid out at
   the width the hall draws it, and the reading was capped at 720 — so every
   record opened with a scrollbar along the bottom and its right-hand column
   cut off, which is most of what reads as broken about it. It is scaled to
   the reading's width instead (never up), the same way the sheet lying on
   the wood is scaled to the paper. */
function fitLeaf() {
  const leaf = doc.getElementById('tp-leaf');
  const sheet = leaf && leaf.firstElementChild;
  if (!sheet) return;
  sheet.style.zoom = '';
  const room = leaf.clientWidth - 32;           /* the leaf's own padding */
  const need = sheet.scrollWidth;
  if (room > 0 && need > room) sheet.style.zoom = (room / need).toFixed(4);
}
root.addEventListener('resize', () => { if (openId && el() && !el().hidden) fitLeaf(); });

function close() {
  const p = el(); if (!p || p.hidden) return;
  const to = paper() && paper().getBoundingClientRect();
  const a = rise(p, to, true);
  /* ON A TIMER, NOT ON THE ANIMATION'S OWN EVENT. `onfinish` is a promise
     that the compositor will get round to telling us, and in a headless
     run it does not — the sheet stayed up for ever. The animation is
     decoration; putting the paper down is state, so it is timed. */
  const done = () => {
    p.hidden = true;
    const s = doc.getElementById('tp-scrim'); if (s) s.hidden = true;
    doc.body.classList.remove('reading');
  };
  setTimeout(done, a ? 290 : 0);
  openId = null;
  /* the record stays laid out at your end — closing the reading is putting
     the sheet down, not taking it away (that is data-tp-away) */
  paintPaper();
}

function commit(r) {
  if (!r || !root.Characters) return;
  root.Characters.put(r);
  /* the piece on the line is this character; its hit points are the record's */
  if (root.Tokens) root.Tokens.refresh(r.id);
  paintPaper();
}

const esc = s => String(s == null ? '' : s)
  .replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
function toast(m) {
  const t = doc.getElementById('toast'); if (!t) return;
  t.textContent = m; t.classList.add('on');
  setTimeout(() => t.classList.remove('on'), 2200);
}

root.Papers = { pick, open, close, lay, read, away,
                get openId() { return openId; }, get laidId() { return laidId; } };

})(window, document);
