/* ══════════════════════════════════════════════════════════════
   67-inspector.js — THE ONE YOU HAVE HOLD OF.

   The bin was the only way to take something off the table that a
   mouse could find: carry it to a barrel in the corner of the wood and
   let go. grumkata: the chest and the bin "look mid", and they are
   gone. What replaces the bin is not another piece of furniture.

   Pick something up — press it — and it is selected, which it always
   was (23-table3d.js). The inspector is what a selection now SAYS: a
   small Sable bar at the foot of the table with the thing's name and
   what you can do to it —

     EDIT        its workbench (66-workbench.js), the same one it was
                 made on, changing it where it stands
     DUPLICATE   another one, beside it
     TURN        a quarter turn, or an eighth for a model
     REMOVE      off the table; Ctrl+Z puts it back

   Delete still removes, and carrying a piece back over the open
   toolbox still puts it away. This is the version you can see.

   Only for what you may touch (TableModel.mayTouch). A player at
   somebody else's table sees it for their own notes and lines and for
   nothing else.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const T = () => root.TableModel;
const esc = s => String(s == null ? '' : s)
  .replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

let bar = null, shownId = null;

const KIND = { token: 'Counter', note: 'Note', art: 'Picture', model: 'Model',
               page: 'Page', ink: 'Drawing', scene: 'Scene' };

function mount() {
  if (bar) return;
  bar = doc.createElement('div');
  bar.className = 'insp';
  bar.hidden = true;
  doc.body.appendChild(bar);
  bar.addEventListener('pointerdown', e => e.stopPropagation());
  bar.addEventListener('click', onClick);
  T().on((st, why) => {
    if (why === 'move' || why === 'raise') return;
    paint();
  });
  root.addEventListener('monarchy:where', paint);
  /* A DOUBLE CLICK ON A PIECE OPENS ITS BENCH — the name tag of a counter,
     or anywhere on a picture or a model. A note's double press is still
     writing on it (24-table-props.js), which is what a note is for. */
  doc.addEventListener('dblclick', e => {
    const p = e.target.closest && e.target.closest('#tbl .prop.t3-thing');
    if (!p || !p.dataset.id) return;
    if (p.classList.contains('t3-note') || p.classList.contains('t3-ink')) return;
    const t = T().get(p.dataset.id);
    if (!t || !T().mayUseBox() || !T().mayTouch(t)) return;
    if (t.kind === 'scene') return;
    e.preventDefault(); e.stopPropagation();
    edit(t.id);
  }, true);
}

function paint() {
  if (!bar) return;
  const t = T().selected();
  const atTable = doc.body.classList.contains('at-table');
  const may = !!t && atTable && (!T().mayTouch || T().mayTouch(t))
              && t.kind !== 'scene' && !doc.body.classList.contains('field-on');
  if (!may) { bar.hidden = true; shownId = null; return; }
  const box = T().mayUseBox();
  shownId = t.id;
  bar.hidden = false;
  const name = t.name || KIND[t.kind] || 'Thing';
  const turn = t.kind === 'art' || t.kind === 'page' || t.kind === 'model' || t.kind === 'note';
  bar.innerHTML =
    `<span class="insp-k">${esc(KIND[t.kind] || t.kind)}</span>
     <b class="insp-n">${esc(name)}</b>
     ${box && t.kind !== 'ink' ? `<button class="insp-b" data-i="edit" title="Change it  (double-click)">Edit</button>` : ''}
     ${box && t.kind !== 'ink' ? `<button class="insp-b" data-i="dup" title="Another one, beside it">Duplicate</button>` : ''}
     ${box && turn ? `<button class="insp-b" data-i="turn" title="Turn it">Turn</button>` : ''}
     ${t.kind === 'token' && t.in ? '' : ''}
     <button class="insp-b bad" data-i="bin" title="Take it off the table  (Delete)">Remove</button>
     <button class="insp-x" data-i="let" title="Let go of it  (Esc)">&#10005;</button>`;
}

function onClick(e) {
  const b = e.target.closest('[data-i]'); if (!b) return;
  const t = T().get(shownId); if (!t) { paint(); return; }
  const what = b.dataset.i;
  if (what === 'edit') { edit(t.id); return; }
  if (what === 'dup') {
    const c = T().duplicate(t.id);
    if (c) { T().select(c.id); said('Duplicated'); }
    return;
  }
  if (what === 'turn') {
    const step = t.kind === 'model' ? 45 : t.kind === 'note' ? 8 : 90;
    T().edit(t.id, { rot: (t.rot || 0) + step });
    return;
  }
  if (what === 'bin') {
    if (root.Workbench && root.Workbench.current && root.Workbench.current.id === t.id && root.Hand)
      root.Hand.closeBench(true);
    T().bin(t.id);
    said('Removed — Ctrl+Z brings it back');
    return;
  }
  if (what === 'let') T().select(null);
}

function edit(id) { if (root.Hand && root.Hand.editThing) root.Hand.editThing(id); }

/* the one line of feedback, in the toast the table already owns */
function said(text) {
  const el = doc.getElementById('toast');
  if (!el) return;
  el.textContent = text;
  el.classList.add('on', 'show');
  clearTimeout(said._t);
  said._t = setTimeout(() => el.classList.remove('on', 'show'), 1900);
}

root.Inspector = { mount, paint, edit, said };

})(window, document);
