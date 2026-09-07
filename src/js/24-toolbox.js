/* ══════════════════════════════════════════════════════════════
   22-toolbox.js — THE BOX AND THE BIN.

   A new table is empty besides these two. They are furniture, not
   contents: they are never in `things`, they cannot be moved into
   a scene, and the bin cannot eat itself.

   The box is the GM's, or anyone handed the assistant's key.

   One guard, learned the hard way on the purse: a thing you open
   a hundred times a session has to be fast. So it opens as an
   object AND answers to a key (B) and a search field.

   The chest is grumkata's AnimatedChest — the real asset, run
   through FBX2glTF and baked by tools/bake_chest.py, drawn by
   27-table-gl.js and hinged on its own Bone. What lives here is
   only its ANCHOR: an invisible .prop on the wood, at a table
   position, which the GL layer measures every frame. That is the
   same way proto anchors its dice, so the chest pans, zooms and
   tilts with the table without knowing the table exists.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const T = () => root.TableModel;
const C = () => root.TableContent;

let openShelf = 'scenes';
let query = '';

/* ── where the chest stands ───────────────────────────────────
   A table position, not a screen position: the chest sits ON the
   wood near the front-left of the slab, and you pan away from it
   like anything else. The slab is 2400 x 1560. */
const CHEST_AT = { x: 360, y: 1090, size: 320 };

function binSVG(full) {
  return `<svg class="tb-bin-art${full ? ' full' : ''}" viewBox="0 0 96 96" aria-hidden="true">
    <ellipse class="tb-shadow" cx="48" cy="88" rx="30" ry="5"/>
    <path class="tb-bin-lid"  d="M18 26 L78 26 L76 32 L20 32 Z"/>
    <rect class="tb-bin-grip" x="42" y="20" width="12" height="6" rx="2"/>
    <path class="tb-bin-body" d="M22 34 L74 34 L68 84 L28 84 Z"/>
    <path class="tb-bin-rib"  d="M36 36 L33 82 M48 36 L48 82 M60 36 L63 82"/>
  </svg>`;
}

/* ══ MOUNT ════════════════════════════════════════════════════ */
function mount(surface) {
  const tbl = doc.getElementById('tbl');
  if (!tbl || doc.getElementById('tb-anchor')) return;

  /* The anchor is a real .prop, so 22-table3d.js drags it like any other
     piece of the table and the GL layer just follows its rect. It draws
     nothing itself — the chest is the model. */
  const box = doc.createElement('div');
  box.className = 'prop tb-box';
  box.id = 'tb-anchor';
  box.dataset.x = CHEST_AT.x; box.dataset.y = CHEST_AT.y; box.dataset.z = 8; box.dataset.r = 0;
  box.innerHTML =
    `<div class="face tb-anchor-face grip" style="width:${CHEST_AT.size}px;height:${CHEST_AT.size}px"
          title="The toolbox  (B)"></div>
     <span class="tb-chest-lbl">Toolbox</span>`;
  tbl.appendChild(box);
  if (root.Table3D) root.Table3D.place(box);

  const bin = doc.createElement('div');
  bin.className = 'prop tb-bin';
  bin.id = 'tb-bin-prop';
  bin.dataset.x = 1960; bin.dataset.y = 1140; bin.dataset.z = 8; bin.dataset.r = 0;
  bin.innerHTML =
    `<div class="face tb-bin-face grip" title="The bin — what you take off the table waits here">
       ${binSVG(false)}<span class="tb-bin-count" id="tb-bin-count"></span>
     </div><span class="tb-bin-lbl">Bin</span>`;
  tbl.appendChild(bin);
  if (root.Table3D) root.Table3D.place(bin);

  const drawer = doc.createElement('div');
  drawer.className = 'tb-drawer';
  drawer.id = 'tb-drawer';
  drawer.hidden = true;
  doc.body.appendChild(drawer);

  /* a click that was not a drag opens it — the same element is the grip */
  hit(box, toggle);
  hit(bin, () => { openShelf = 'bin'; open(); });

  /* B opens the box, Escape shuts it — but never while typing */
  doc.addEventListener('keydown', e => {
    const el = doc.activeElement, tag = el && el.tagName;
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
                   (el && el.isContentEditable);
    if (e.key === 'Escape' && isOpen()) { e.preventDefault(); shut(); return; }
    if (typing) return;
    if ((e.key === 'b' || e.key === 'B') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault(); toggle();
    }
  });

  T().on(() => { if (isOpen()) paint(); paintBin(); });
  paintBin();
  gate();
}

/* A prop is draggable, so a press is only a CLICK if the pointer did not
   travel. Without this every attempt to shove the chest aside also opened it. */
function hit(el, fn) {
  let from = null;
  el.addEventListener('pointerdown', e => { from = { x: e.clientX, y: e.clientY }; });
  el.addEventListener('pointerup', e => {
    if (from && Math.hypot(e.clientX - from.x, e.clientY - from.y) < 5) fn();
    from = null;
  });
}

/* the box is the GM's; a player is not shown a door they cannot open */
function gate() {
  const may = T().mayUseBox();
  const b = doc.getElementById('tb-anchor');
  if (b) b.hidden = !may;
  const n = doc.getElementById('tb-bin-prop');
  if (n) n.hidden = !may;
  if (!may) shut();
}

const isOpen = () => { const d = doc.getElementById('tb-drawer'); return d && !d.hidden; };
function toggle() { isOpen() ? shut() : open(); }

function open() {
  const d = doc.getElementById('tb-drawer'); if (!d) return;
  if (!T().mayUseBox()) return;
  d.hidden = false;
  if (root.TableGL) root.TableGL.setOpen(true);
  paint();
  const f = doc.getElementById('tb-find');
  if (f) setTimeout(() => f.focus(), 20);
}
function shut() {
  const d = doc.getElementById('tb-drawer'); if (!d) return;
  d.hidden = true; query = '';
  if (root.TableGL) root.TableGL.setOpen(false);
}

/* ══ WHAT IS IN IT ════════════════════════════════════════════ */
function shelves() {
  return C().SHELVES.concat([{
    id: 'bin', name: 'Bin', note: 'What came off the table. Reach back in.',
    items: T().state.bin.map(t => ({
      id: 'unbin:' + t.id, kind: t.kind, act: 'unbin', ref: t.id,
      name: t.name || label(t), mark: markFor(t.kind),
      blurb: t.kind === 'scene' ? 'A ' + t.scene + ' scene' : ''
    }))
  }]);
}
const MARKS = { scene:'◈', token:'●', note:'✎', art:'❖', model:'♢', page:'☰', sheet:'☷' };
const markFor = k => MARKS[k] || '·';
const label = t => t.kind === 'scene'
  ? ((C().SCENES[t.scene] || {}).name || 'Scene')
  : (t.kind.charAt(0).toUpperCase() + t.kind.slice(1));

function paint() {
  const d = doc.getElementById('tb-drawer'); if (!d) return;
  const all = shelves();
  const shelf = all.find(s => s.id === openShelf) || all[0];
  const q = query.trim().toLowerCase();
  const items = q
    ? all.reduce((a, s) => a.concat(s.items), [])
         .filter(i => (i.name + ' ' + (i.blurb || '')).toLowerCase().includes(q))
    : shelf.items;

  d.innerHTML =
    `<div class="tb-head">
       <span class="tb-mark">✦</span>
       <div class="tb-tabs">${all.map(s =>
         `<button class="tb-tab${s.id === openShelf && !q ? ' on' : ''}"
                  data-shelf="${s.id}">${s.name}${
            s.id === 'bin' && s.items.length ? ' <b>' + s.items.length + '</b>' : ''}</button>`).join('')}
       </div>
       <input id="tb-find" class="tb-find" placeholder="search the box"
              spellcheck="false" autocomplete="off" value="${esc(query)}">
       <button class="tb-x" data-tb="shut" title="Escape">✕</button>
     </div>
     <div class="tb-note">${q ? 'Everything matching “' + esc(q) + '”' : esc(shelf.note || '')}</div>
     <div class="tb-grid">${
       items.length
         ? items.map(i => card(i)).join('')
         : `<div class="tb-empty">${q ? 'Nothing by that name.'
             : shelf.id === 'bin' ? 'The bin is empty.' : 'Nothing here yet.'}</div>`
     }</div>`;

  d.querySelectorAll('[data-shelf]').forEach(b =>
    b.addEventListener('click', () => { openShelf = b.dataset.shelf; query = ''; paint(); }));
  d.querySelector('[data-tb="shut"]').addEventListener('click', shut);
  const f = doc.getElementById('tb-find');
  f.addEventListener('input', () => { query = f.value; paint();
    const g = doc.getElementById('tb-find'); if (g) { g.focus(); g.selectionStart = g.value.length; } });
  d.querySelectorAll('[data-item]').forEach(b =>
    b.addEventListener('click', () => take(JSON.parse(b.dataset.item))));
}

function card(i) {
  return `<button class="tb-card" data-item='${esc(JSON.stringify(i))}'>
    <span class="tb-card-mark">${i.mark || '·'}</span>
    <span class="tb-card-body">
      <b>${esc(i.name)}</b>
      ${i.blurb ? `<i>${esc(i.blurb)}</i>` : ''}
    </span>
    <span class="tb-card-act">${
      i.act === 'make' ? 'Make' : i.act === 'unbin' ? 'Put back' :
      i.act === 'open' ? 'Open' : 'Place'}</span>
  </button>`;
}

/* ── taking something out ── */
function take(i) {
  if (i.act === 'unbin') { T().unbin(i.ref); paint(); return; }
  if (i.act === 'make' && i.kind === 'scene') {
    shut();
    root.SceneSetup.make(i.scene);
    return;
  }
  if (i.act === 'open') {
    shut();
    if (i.kind === 'sheet' && typeof root.tableOpenCharacterModal === 'function') {
      root.tableOpenCharacterModal();
    }
    return;
  }
  /* a piece is just put down, near the middle of the wood you are looking at */
  const at = root.Table3D ? root.Table3D.middle() : { x: 1200, y: 780 };
  T().put({ kind: i.kind, name: label({ kind: i.kind }),
            x: at.x - 130, y: at.y - 40, w: 260, h: 88 });
  shut();
}

function paintBin() {
  const c = doc.getElementById('tb-bin-count');
  if (!c) return;
  const n = T().state.bin.length;
  c.textContent = n ? n : '';
  const art = doc.querySelector('.tb-bin-art');
  if (art) art.classList.toggle('full', n > 0);
}

const esc = s => String(s == null ? '' : s)
  .replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

root.Toolbox = { mount, open, shut, toggle, isOpen, gate, paintBin };

})(window, document);
