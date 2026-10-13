/* ══════════════════════════════════════════════════════════════
   68-gm-rail.js — THE GM'S HANDS.

   With the chest gone from the wood there has to be a way to reach the
   box that you can SEE — B is fine for the second evening and useless
   for the first. The players have their kit down the left edge
   (64-kit.js); the GM gets the same rail, in the same place, holding
   the GM's one thing (the fight has no button of its own: double-click the board):

     THE TOOLBOX    everything that goes on the table, and its Audio tab —
                    music, video and the sound board                  (B)

   (M opens the Toolbox on its Audio tab. Music was a button of its own here
   until grumkata said it should not be a separate thing from the toolbox.)

   One rail on each side of the table and never both: the kit is shown
   to a player, this to whoever holds the box (TableModel.mayUseBox).
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const T = () => root.TableModel;

const ICON = {
  /* a coffer, banded and locked: the charge for what the toolbox holds (64-kit.js, CHARGES) */
  box:   '<svg viewBox="0 0 24 24"><path fill-rule="evenodd" d="M2.5 10.2C2.5 6.3 6.6 3.8 12 3.8s9.5 2.5 9.5 6.4z M2.5 11.6h19v8.6h-19z M10.6 13h2.8v4h-2.8z M6.3 4.9h1.2v5.3H6.3z M16.5 4.9h1.2v5.3h-1.2z M6.3 11.6h1.2v8.6H6.3z M16.5 11.6h1.2v8.6h-1.2z"/></svg>'
};
const NAMES = { box: 'Toolbox  (B)' };

let el = null;

function mount() {
  if (el) return;
  el = doc.createElement('div');
  el.className = 'gmr';
  el.innerHTML = ['box'].map(k =>
    `<button class="gmr-b" data-g="${k}" title="${NAMES[k]}">${ICON[k]}<span>${
      k === 'box' ? 'Toolbox' : 'Fight'}</span></button>`).join('');
  doc.body.appendChild(el);
  el.addEventListener('pointerdown', e => e.stopPropagation());
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-g]'); if (!b) return;
    press(b.dataset.g);
  });
  doc.addEventListener('keydown', e => {
    const a = doc.activeElement, tag = a && a.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (a && a.isContentEditable)) return;
    if (!doc.body.classList.contains('at-table') || !T().mayUseBox()) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'm' || e.key === 'M') { e.preventDefault(); press('music'); }      /* the Toolbox, on Audio */
  });
  T().on((st, why) => { if (why !== 'move' && why !== 'select' && why !== 'raise') paint(); });
  root.addEventListener('monarchy:session', paint);
  root.addEventListener('monarchy:where', paint);
  paint();
}

function press(k) {
  if (k === 'box') {
    if (root.Toolbox) root.Toolbox.toggle();           /* it takes the left of the view, and the board is framed in what is left */
  } else if (k === 'music') {
    if (root.Music) root.Music.toggle();               /* the Toolbox, turned to its Audio tab */
  }
  paint();
}

function paint() {
  if (!el) return;
  const gm = !!(T() && T().mayUseBox());
  el.hidden = !gm;
  if (!gm) return;
  el.querySelectorAll('.gmr-b').forEach(b => {
    const k = b.dataset.g;
    const on = k === 'box' ? !!(root.Toolbox && root.Toolbox.isOpen())
             : false;
    b.classList.toggle('on', on);
  });
}

root.GmRail = { mount, paint, press };

})(window, document);
