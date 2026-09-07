/* ══════════════════════════════════════════════════════════════
   50-token-maker.js — WHAT A COUNTER IS.

   grumkata, and this is the whole brief:

     "currently tokens suck completely — we can't choose image,
      stats or attached info, can't affect if it comes from a
      character sheet or if it's an NPC or even a formation, which
      is important, and generally it's messy"

   So: the counter is on screen at counter size, and everything
   about it is set BESIDE IT while you are still holding it. Change
   the name and the plate is engraved as you type. Give it a face
   and it is wearing that face before it lands. That is the same
   rule the rest of the box now follows — you choose while you hold,
   never after you place — applied to the one object that needed it
   most.

   Two ways in, one panel:

     · carrying one out of the chest, where it edits what is in
       your hand and nothing exists yet;
     · pressing the base plate of one already standing on the wood,
       where it edits the thing through Tokens.edit so the board and
       the sheet hear about it.

   A counter that came from a character record is deliberately half
   locked: its name and its maximum hit points are the RECORD's,
   through the rules, and a token that could disagree with its own
   sheet is the bug this whole join exists to prevent. Its side,
   its face and what is attached to it are still yours.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

let box = null, at = null;      /* at = { held } | { id } */

const esc = s => String(s == null ? '' : s)
  .replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

/* ── what we are looking at, whichever way we got here ── */
function read() {
  if (at && at.held) {
    const v = at.held.variant || {};
    return { name: v.name || at.held.offer.name || 'Someone',
             side: v.side || 'al', entKind: v.entKind || 'unit',
             max: v.hpMax == null ? 10 : v.hpMax,
             src: v.src || '', art: v.art || '', info: v.info || '',
             locked: false };
  }
  if (at && at.id && root.TableModel) {
    const t = root.TableModel.get(at.id);
    if (!t || !t.ent) return null;
    return { name: t.name, side: t.ent.side, entKind: t.ent.kind,
             max: t.ent.max, hp: t.ent.hp,
             src: t.src || '', art: t.art || '', info: t.info || '',
             locked: t.source === 'char' };
  }
  return null;
}

/* ── and the one door out ── */
let after = null;
function set(patch) {
  if (at && at.held) {
    const v = at.held.variant;
    if (patch.name != null) {
      v.name = patch.name; at.held.offer.name = patch.name;
      if (root.Hand) root.Hand.say(patch.name);      /* the bar keeps up */
    }
    if (patch.side != null) v.side = patch.side;
    if (patch.entKind != null) v.entKind = patch.entKind;
    if (patch.max != null) v.hpMax = Math.max(1, parseInt(patch.max, 10) || 1);
    if (patch.src != null) v.src = patch.src;
    if (patch.art != null) v.art = patch.art;
    if (patch.info != null) v.info = patch.info;
    if (after) after();
    return;
  }
  if (at && at.id && root.Tokens) root.Tokens.edit(at.id, patch);
}

/* ══ THE PANEL ════════════════════════════════════════════════ */
function el() { return box; }

function open(held, onChange) { at = { held: held }; after = onChange; paint(); }
function forThing(id) { at = { id: id }; after = null; paint(); }
function close() { at = null; after = null; if (box) box.hidden = true; }

const SIZES = [['unit', 'One'], ['large', 'Two'], ['form', 'A body']];

function paint() {
  const d = read();
  if (!d) { close(); return; }
  if (!box) {
    box = doc.createElement('div');
    box.className = 'tk-make';
    doc.body.appendChild(box);
    box.addEventListener('pointerdown', e => e.stopPropagation());
    box.addEventListener('wheel', e => e.stopPropagation());
  }
  box.hidden = false;

  const face = root.Figures ? root.Figures.html(
    { kind: 'token', name: d.name },
    { side: d.side, entKind: d.entKind, src: d.src, art: d.art }, 92) : '';

  box.innerHTML =
    `<div class="tk-make-head">
       <span class="tk-make-fig">${face}</span>
       <input class="tk-f-name" value="${esc(d.name)}" maxlength="28"
              placeholder="Who is this" ${d.locked ? 'readonly' : ''}>
       <button class="tk-make-x" title="Done">✕</button>
     </div>
     <div class="tk-make-body">
       <div class="tk-row">
         <span class="tk-lbl">Side</span>
         <span class="tk-sides">
           <button class="tk-pip al${d.side === 'al' ? ' on' : ''}" data-side="al"
                   title="Ally"></button>
           <button class="tk-pip en${d.side === 'en' ? ' on' : ''}" data-side="en"
                   title="Enemy"></button>
         </span>
       </div>
       <div class="tk-row">
         <span class="tk-lbl">Health</span>
         <input class="tk-f-max" type="number" min="1" max="999" value="${d.max}"
                ${d.locked ? 'readonly' : ''}>
         ${d.locked ? '<i class="tk-note">from their record</i>' : ''}
       </div>
       <div class="tk-row">
         <span class="tk-lbl">Stands on</span>
         <span class="tk-sizes">${SIZES.map(([k, n]) =>
           `<button class="tk-size${d.entKind === k ? ' on' : ''}" data-size="${k}"
                    ${d.locked ? 'disabled' : ''}>${n}</button>`).join('')}</span>
       </div>
       <div class="tk-row col">
         <span class="tk-lbl">Its face</span>
         <div class="tk-faces">
           <button class="tk-face none${!d.src && !d.art ? ' on' : ''}" data-face=""
                   title="No picture — its letters"></button>
           ${(root.Library ? root.Library.art.all() : []).slice(0, 60).map(a =>
             `<button class="tk-face${d.art === a.id ? ' on' : ''}" data-face="${esc(a.id)}"
                      title="${esc(a.name)}">${
                root.Figures ? root.Figures.html({ kind: 'art' }, { art: a.id }, 34) : ''
              }</button>`).join('')}
           <button class="tk-face own" data-own="1" title="A picture off your machine">
             <span class="tk-plus"></span></button>
         </div>
       </div>
       <div class="tk-row col">
         <span class="tk-lbl">Attached to it</span>
         <textarea class="tk-f-info" rows="3"
           placeholder="Anything you want to remember about them">${esc(d.info)}</textarea>
       </div>
     </div>`;

  const $ = q => box.querySelector(q);
  $('.tk-make-x').addEventListener('click', () => {
    if (at && at.held && root.Hand) root.Hand.say('');
    close();
  });
  const nm = $('.tk-f-name');
  if (!d.locked) nm.addEventListener('input', () => set({ name: nm.value }));
  const mx = $('.tk-f-max');
  if (!d.locked) mx.addEventListener('input', () => set({ max: mx.value }));
  const inf = $('.tk-f-info');
  inf.addEventListener('input', () => set({ info: inf.value }));
  /* typing must not reach the table, which reads single letters as gestures */
  box.querySelectorAll('input, textarea').forEach(i => {
    i.addEventListener('keydown', e => e.stopPropagation());
  });

  box.querySelectorAll('[data-side]').forEach(b =>
    b.addEventListener('click', () => { set({ side: b.dataset.side }); paint(); }));
  box.querySelectorAll('[data-size]').forEach(b =>
    b.addEventListener('click', () => { set({ entKind: b.dataset.size }); paint(); }));
  box.querySelectorAll('[data-face]').forEach(b =>
    b.addEventListener('click', () => {
      const id = b.dataset.face;
      const a = id && root.Library ? root.Library.art.get(id) : null;
      set({ art: id || '', src: (a && a.src) || '' });
      paint();
    }));
  const own = $('[data-own]');
  if (own) own.addEventListener('click', () => {
    root.Pictures.ask(pic => {
      if (!pic) return;
      const kept = root.Library.art.add({ name: pic.name, src: pic.src,
                                          w: pic.w, h: pic.h });
      if (root.Hand) root.Hand.refresh();
      set({ art: kept.id, src: pic.src });
      paint();
    });
  });
}

/* pressing the base plate of a counter already on the wood opens the same
   panel — "attached info" is not something you only get one chance at */
doc.addEventListener('dblclick', e => {
  const p = e.target.closest && e.target.closest('.fg-plate');
  if (!p) return;
  const t = e.target.closest('.prop.t3-token');
  if (!t || !t.dataset.id) return;
  e.preventDefault(); e.stopPropagation();
  forThing(t.dataset.id);
});

root.TokenMaker = { open, forThing, close, paint, el };

})(window, document);
