/* ══════════════════════════════════════════════════════════════
   23-table-props.js — WHAT STANDS ON THE WOOD.

   The model says what is on the table; this turns each of those
   into a `.prop` — proto's own object: positioned in table units
   by data-x/data-y, lifted off the surface by data-z, turned by
   data-r, and given real thickness by the `.side` extrusions.

   It holds no state. The model is the only source of truth, which
   is why a reload puts every piece back exactly where it was.

   Everyone sees the same table. Nothing here is hidden from a
   player — only menus and papers live on your own end.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const T = () => root.TableModel;
const C = () => root.TableContent;
const D = () => root.Table3D;
const esc = s => String(s == null ? '' : s)
  .replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

const MARKS = { scene:'◈', token:'●', note:'✎', art:'❖', model:'♢', page:'☰', sheet:'☷' };

function mount() {
  T().on(paint);
  paint();
}

function paint() {
  const tbl = doc.getElementById('tbl');
  if (!tbl) return;
  const st = T().state;

  /* Only the props that ARE model things. The toolbox chest and the bin are
     props too — they live on the wood like everything else — and a bare
     `.prop` selector here deleted them on the first repaint, which is why
     putting a scene down made the chest vanish. */
  tbl.querySelectorAll('.prop.t3-thing').forEach(p => p.remove());

  st.things.slice().sort((a, b) => a.z - b.z).forEach(t => {
    const el = doc.createElement('div');
    el.className = 'prop t3-thing t3-' + t.kind + (st.active === t.id ? ' live' : '');
    el.dataset.id = t.id;
    el.dataset.x = t.x; el.dataset.y = t.y;
    el.dataset.z = 8;   el.dataset.r = t.rot || 0;
    el.style.setProperty('--pt', (t.kind === 'scene' ? 13 : 9) + 'px');
    el.style.zIndex = 10 + t.z;
    el.innerHTML = face(t, st);
    tbl.appendChild(el);
    D().place(el);
    wire(el, t);
  });

  /* the running scene's live controls follow whatever is running */
  const act = T().activeScene();
  if (act && root.SceneSetup) root.SceneSetup.showOptions(act.id);
  else if (root.SceneSetup) root.SceneSetup.hideOptions();
}

function face(t, st) {
  const def = t.kind === 'scene' ? C().SCENES[t.scene] : null;
  const live = st.active === t.id;
  const w = Math.round((t.w || 260) * (t.scale || 1));

  const inner = def
    ? `<div class="t3-title grip">
         <span class="t3-m">${def.mark}</span><b>${esc(t.name)}</b>
         ${live ? '<em class="t3-live">running</em>'
                : '<button class="t3-run" data-run="1">Run this</button>'}
       </div>
       <div class="t3-body">
         ${def.setup.map(f => `<span class="t3-chip"><i>${esc(f.label)}</i>${
             esc(String(t.setup[f.key] === '' || t.setup[f.key] == null ? '—' : t.setup[f.key]))
           }</span>`).join('')}
         ${def.fixed ? Object.keys(def.fixed).map(k =>
             `<span class="t3-chip fixed"><i>${esc(k)}</i>${def.fixed[k]}</span>`).join('') : ''}
       </div>
       <div class="t3-foot">${
         T().inside(t.id).length
           ? T().inside(t.id).length + ' in this scene'
           : 'nothing in it yet'}</div>`
    : `<div class="t3-title grip">
         <span class="t3-m">${MARKS[t.kind] || '·'}</span><b>${esc(t.name || t.kind)}</b>
       </div>
       <div class="t3-piece">${
         t.in ? `in ${esc((T().get(t.in) || {}).name || 'a scene')}` : 'on the wood'}</div>`;

  return `<div class="face t3-face" style="width:${w}px">
            ${inner}
            <span class="side f"></span><span class="side r"></span>
            <span class="side l"></span><span class="side b"></span>
          </div>`;
}

function wire(el, t) {
  const run = el.querySelector('[data-run]');
  if (run) run.addEventListener('click', e => { e.stopPropagation(); T().activate(t.id); });
  /* raising is the model's business, so the order survives a reload —
     22-table3d.js also bumps a live z-index while you drag, which is
     only for the duration of the drag */
  el.addEventListener('pointerdown', () => T().raise(t.id));
}

/* ── the bin, while something is over it ─────────────────────── */
function dragging(el, ev) {
  const bin = doc.querySelector('.tb-bin');
  if (bin) bin.classList.toggle('over', overBin(ev));
}

/* ── letting go ──────────────────────────────────────────────
   Where it lands is the model's to record; dropping it ON something is
   the only thing that changes what a piece IS. */
function dropped(el, ev) {
  const id = el.dataset.id;
  const t = T().get(id);
  const bin = doc.querySelector('.tb-bin');
  if (bin) bin.classList.remove('over');
  if (!t) return;

  if (overBin(ev)) { T().bin(id); return; }

  T().move(id, parseFloat(el.dataset.x), parseFloat(el.dataset.y));

  if (t.kind !== 'scene') {
    const over = sceneUnder(ev, id);
    T().homeTo(id, over ? over.id : null);
  }
}

function overBin(ev) {
  const b = doc.querySelector('.tb-bin');
  if (!b || b.hidden) return false;
  const r = b.getBoundingClientRect();
  return ev.clientX >= r.left && ev.clientX <= r.right &&
         ev.clientY >= r.top && ev.clientY <= r.bottom;
}

function sceneUnder(ev, notId) {
  for (const el of doc.elementsFromPoint(ev.clientX, ev.clientY)) {
    const p = el.closest && el.closest('.prop.t3-scene');
    if (p && p.dataset.id !== notId) return T().get(p.dataset.id);
  }
  return null;
}

root.TableProps = { mount, paint, dragging, dropped };

})(window, document);
