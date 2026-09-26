/* ══════════════════════════════════════════════════════════════
   68-gm-rail.js — THE GM'S HANDS.

   With the chest gone from the wood there has to be a way to reach the
   box that you can SEE — B is fine for the second evening and useless
   for the first. The players have their kit down the left edge
   (64-kit.js); the GM gets the same rail, in the same place, holding
   the GM's three things:

     THE TOOLBOX    everything that goes on the table          (B)
     THE FIGHT      the combat tracker, while a fight is on     (F)
     THE WAR ROOM   fights prepared ahead of time              (E)

   One rail on each side of the table and never both: the kit is shown
   to a player, this to whoever holds the box (TableModel.mayUseBox).
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const T = () => root.TableModel;

const ICON = {
  box:   '<svg viewBox="0 0 24 24"><path d="M3.5 9.5h17v10h-17z"/><path d="M3.5 9.5l2.2-4h12.6l2.2 4M9.5 13h5"/></svg>',
  fight: '<svg viewBox="0 0 24 24"><path d="M5 19l9.5-9.5M14.5 4.5l5 5-2.2 2.2-5-5z"/><path d="M19 19L9.5 9.5M9.5 4.5l-5 5 2.2 2.2 5-5z"/></svg>',
  war:   '<svg viewBox="0 0 24 24"><path d="M4 20V5.5l5-1.5 6 2 5-1.5V19l-5 1.5-6-2z"/><path d="M9 4v14.5M15 6v14.5"/></svg>'
};
const NAMES = { box: 'Toolbox  (B)', fight: 'The fight  (F)', war: 'Prepared fights  (E)' };

let el = null;

function mount() {
  if (el) return;
  el = doc.createElement('div');
  el.className = 'gmr';
  el.innerHTML = ['box', 'fight', 'war'].map(k =>
    `<button class="gmr-b" data-g="${k}" title="${NAMES[k]}">${ICON[k]}<span>${
      k === 'box' ? 'Toolbox' : k === 'fight' ? 'Fight' : 'Prepared'}</span></button>`).join('');
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
    if (e.key === 'e' || e.key === 'E') { e.preventDefault(); press('war'); }
    if ((e.key === 'f' || e.key === 'F') && fightOn()) { e.preventDefault(); press('fight'); }
  });
  T().on((st, why) => { if (why !== 'move' && why !== 'select' && why !== 'raise') paint(); });
  root.addEventListener('monarchy:session', paint);
  root.addEventListener('monarchy:where', paint);
  paint();
}

const fightOn = () => { const s = T().activeScene(); return !!(s && s.scene === 'combat'); };

function press(k) {
  if (k === 'box') {
    if (root.Muster && root.Muster.isOpen()) root.Muster.close();
    if (root.Toolbox) root.Toolbox.toggle();
  } else if (k === 'fight') {
    if (root.Toolbox && root.Toolbox.isOpen()) root.Toolbox.shut();
    if (root.Muster) root.Muster.toggle();
  } else if (k === 'war') {
    if (root.Encounters) root.Encounters.room();
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
