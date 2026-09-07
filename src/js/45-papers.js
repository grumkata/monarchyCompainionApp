/* ══════════════════════════════════════════════════════════════
   45-papers.js — A RECORD, OPENED AT THE TABLE.

   From the-toolbox.md: papers are "windows onto records, ON YOUR
   OWN END" — not objects on the wood. Everyone sees the table the
   same; what differs is your menus and your papers. So this is a
   panel at the edge of the screen, not a prop.

   It is the SAME record the hall keeps and the same renderer the
   hall uses: `Sheet.render(rec)` for the markup, `Sheet.act` and
   `Sheet.setPath` for the two doors every change goes through.
   Nothing about the character record is reimplemented here — that
   file is 800 lines of working rules and it is not mine to fork.

   What is new is only the wiring, because menu2.js's own handlers
   are gated on the hall's screen state (`at === 'sheet'`) and will
   not fire out here.

   Saving writes back to the hall's roster, and then tells the
   board: a token IS this character, so changing Fortitude on the
   sheet changes the hit points of the piece standing on the line.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

let openId = null;

const el = () => doc.getElementById('tp');

function shell() {
  let p = el();
  if (p) return p;
  p = doc.createElement('aside');
  p.id = 'tp';
  p.className = 'tp';
  p.hidden = true;
  doc.body.appendChild(p);

  /* the two doors, scoped to this paper so the hall's handlers stay the
     hall's — same calls, same record, same rules */
  p.addEventListener('click', e => {
    if (e.target.closest('[data-tp-close]')) return close();
    const pick = e.target.closest('[data-tp-open]');
    if (pick) return open(pick.dataset.tpOpen);
    const rec = current(); if (!rec) return;
    const step = e.target.closest('[data-s]');
    const onField = e.target.dataset && e.target.dataset.p != null;
    if (step && !onField) {
      const out = root.Sheet.act(rec, step.dataset.s, step.dataset.a || '');
      if (out) { if (out !== 'view') commit(rec); paint(); }
    }
  });

  p.addEventListener('input', e => {
    const d = e.target.dataset || {};
    if (d.p == null) return;
    const rec = current(); if (!rec) return;
    root.Sheet.setPath(rec, d.p, e.target.value);
    /* the leaf never redraws while you write — only the numbers that moved do,
       so the caret stays where you put it (menu2.js's own rule) */
    root.Sheet.repaintNumbers(rec, p);
    /* Written through on every keystroke rather than debounced. A record is a
       few kilobytes and this is one localStorage write; the debounce bought
       nothing and cost the thing that matters — a change reaching the board. */
    commit(rec);
  });

  /* the table listens for keys; a record you are writing in is not the table */
  p.addEventListener('keydown', e => e.stopPropagation());
  p.addEventListener('pointerdown', e => e.stopPropagation());
  p.addEventListener('wheel', e => e.stopPropagation());
  return p;
}

let rec = null;
const current = () => rec;

function commit(r) {
  if (!r || !root.Characters) return;
  root.Characters.put(r);
  /* the piece on the line is this character; its hit points are the record's */
  if (root.Tokens) root.Tokens.refresh(r.id);
}

/* ── which record ─────────────────────────────────────────────
   One character: open it. Several: they are laid out to choose from, in the
   record's own hand rather than a dropdown. */
function pick() {
  const list = root.Characters ? root.Characters.roster() : [];
  if (!list.length) { toast('No characters yet — make one in the hall.'); return; }
  if (list.length === 1) return open(list[0].id);
  const p = shell();
  p.hidden = false;
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
  const r = root.Characters && root.Characters.get(id);
  if (!r || !root.Sheet) return;
  rec = root.Sheet.fill(r); rec.id = id;
  openId = id;
  const p = shell();
  p.hidden = false;
  paint();
}

function paint() {
  const p = el(); if (!p || !rec) return;
  p.innerHTML =
    `<div class="tp-head">
       <span class="plaque">${esc(root.Characters.nameOf(rec))}</span>
       <button class="tp-x" data-tp-close>&#10005;</button>
     </div>
     <div class="tp-leaf" id="tp-leaf">${root.Sheet.render(rec)}</div>`;
}

function close() { const p = el(); if (p) { p.hidden = true; } openId = null; rec = null; }

const esc = s => String(s == null ? '' : s)
  .replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
function toast(m) {
  const t = doc.getElementById('toast'); if (!t) return;
  t.textContent = m; t.classList.add('on');
  setTimeout(() => t.classList.remove('on'), 2200);
}

root.Papers = { pick, open, close, get openId() { return openId; } };

})(window, document);
