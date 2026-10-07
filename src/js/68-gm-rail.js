/* ══════════════════════════════════════════════════════════════
   68-gm-rail.js — THE GM'S HANDS.

   With the chest gone from the wood there has to be a way to reach the
   box that you can SEE — B is fine for the second evening and useless
   for the first. The players have their kit down the left edge
   (64-kit.js); the GM gets the same rail, in the same place, holding
   the GM's two things:

     THE TOOLBOX    everything that goes on the table, and its Audio tab —
                    music, video and the sound board                  (B)
     THE FIGHT      the combat tracker, while a fight is on          (F)

   (M opens the Toolbox on its Audio tab. Music was a button of its own here
   until grumkata said it should not be a separate thing from the toolbox.)

   One rail on each side of the table and never both: the kit is shown
   to a player, this to whoever holds the box (TableModel.mayUseBox).
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const T = () => root.TableModel;

const ICON = {
  box:   '<svg viewBox="0 0 24 24"><path d="M3.5 9.5h17v10h-17z"/><path d="M3.5 9.5l2.2-4h12.6l2.2 4M9.5 13h5"/></svg>',
  fight: '<svg viewBox="0 0 24 24"><path d="M5 19l9.5-9.5M14.5 4.5l5 5-2.2 2.2-5-5z"/><path d="M19 19L9.5 9.5M9.5 4.5l-5 5 2.2 2.2 5-5z"/></svg>'
};
const NAMES = { box: 'Toolbox  (B)', fight: 'The fight  (F)' };

let el = null;

function mount() {
  if (el) return;
  el = doc.createElement('div');
  el.className = 'gmr';
  el.innerHTML = ['box', 'fight'].map(k =>
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
    if ((e.key === 'f' || e.key === 'F') && fightOn()) { e.preventDefault(); press('fight'); }
    if (e.key === 'm' || e.key === 'M') { e.preventDefault(); press('music'); }      /* the Toolbox, on Audio */
  });
  T().on((st, why) => { if (why !== 'move' && why !== 'select' && why !== 'raise') paint(); });
  root.addEventListener('monarchy:session', paint);
  root.addEventListener('monarchy:where', paint);
  paint();
}

const fightOn = () => { const s = T().activeScene(); return !!(s && s.scene === 'combat'); };

function press(k) {
  if (k === 'box') {
    if (root.Toolbox) root.Toolbox.toggle();           /* it borrows the muster's dock, and gives it back */
  } else if (k === 'fight') {
    if (root.Toolbox && root.Toolbox.isOpen()) {
      root.Toolbox.shut();
      if (root.Muster && !root.Muster.isOpen()) root.Muster.open();
    } else if (root.Muster) root.Muster.toggle();
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
             : k === 'fight' ? !!(root.Muster && root.Muster.isOpen())
             : false;
    b.classList.toggle('on', on);
    if (k === 'fight') b.hidden = !fightOn();
  });
}

root.GmRail = { mount, paint, press };

})(window, document);
