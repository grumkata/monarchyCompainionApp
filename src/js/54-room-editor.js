/* ══════════════════════════════════════════════════════════════
   54-room-editor.js — PUT THE ROOM IN GRUMKATA'S HANDS.

   Three rounds of me placing tavern props by typing coordinates and
   checking the result through a screenshot every few minutes was not
   converging, and it was never going to: composing a room is a thing you
   do by looking, and I look slowly. He has eyes on it in real time.

   So the tavern stopped being code and became a list (TAVERN_PLAN in
   27-table-gl.js), and this is the panel that edits the list. Pick a
   piece, nudge it with the arrow keys, turn it, scale it, add another,
   delete one. It saves to this browser and survives a rebuild, so a
   layout is not lost the next time I touch the source.

   Deliberately not a gizmo in the 3D view. A gizmo needs picking, a
   transform handle, and a drag that works at two very different camera
   angles — a week of work to be worse than four arrow keys, because the
   thing being placed is usually a few centimetres from where it should
   be and you want it exact, not approximate.
============================================================== */
(function (root, doc) {
'use strict';

const GL = () => root.TableGL;
let panel = null, list = null, sel = -1, rows = null, kindSel = null;

const NUDGE = 0.05, BIG = 0.25, TURN = 15;

function open_() { return !!(panel && !panel.hidden); }
/* the tavern only exists at the table; in the hall this panel would be an
   unstyled list of furniture sitting on top of the roster */
function here() { return doc.body.classList.contains('at-table'); }

function load() { rows = GL().planRows(); }
function commit(save) { GL().setPlan(rows.map(r => Object.assign({}, r)), save); }

function label(r, i) {
  if (r.k === 'floor') return 'the floorboards';
  return r.m + '  (' + (+r.x).toFixed(2) + ', ' + (+r.z).toFixed(2) + ')';
}

function paint() {
  if (!list) return;
  list.innerHTML = '';
  rows.forEach((r, i) => {
    const b = doc.createElement('button');
    b.className = 're-row' + (i === sel ? ' on' : '');
    b.textContent = label(r, i);
    b.onclick = () => { sel = i; paint(); fields(); };
    list.appendChild(b);
  });
  const cur = rows[sel];
  const f = doc.getElementById('re-fields');
  if (f) f.hidden = !cur || cur.k === 'floor';
}

/* SIZE, WHEN SIZE IS THREE NUMBERS.
   A few rows in the plan are squashed on purpose — a roof beam is a wall
   log stretched long and thin — so they carry sx/sy/sz instead of one s.
   One "size" box still has to work on those, so it reads the mean of the
   three and writing to it rescales all three together, keeping the squash. */
function sizeOf(r) {
  if (r.sx != null) return Math.cbrt((r.sx || 1) * (r.sy || 1) * (r.sz || 1));
  return r.s == null ? 1 : r.s;
}
function setSize(r, v) {
  v = Math.max(0.02, v || 0);
  if (r.sx == null) { r.s = +v.toFixed(3); return; }
  const k = v / (sizeOf(r) || 1);
  r.sx = +((r.sx || 1) * k).toFixed(4);
  r.sy = +((r.sy || 1) * k).toFixed(4);
  r.sz = +((r.sz || 1) * k).toFixed(4);
}

function fields() {
  const r = rows[sel];
  if (!r || r.k === 'floor') return;
  const set = (id, v) => { const e = doc.getElementById(id); if (e) e.value = (+v).toFixed(2); };
  set('re-x', r.x); set('re-y', r.y || 0); set('re-z', r.z);
  set('re-r', r.r || 0); set('re-s', sizeOf(r));
}

function bump(k, d) {
  const r = rows[sel];
  if (!r || r.k === 'floor') return;
  r[k] = +(((+r[k]) || 0) + d).toFixed(3);
  commit(false); fields(); paint();
}

function add() {
  const v = kindSel.value;
  if (!v) return;
  const p = v.slice(0, 1), m = v.slice(2);
  rows.push({ p: p, m: m, x: 0, y: 0, z: -1.2, r: 0 });
  sel = rows.length - 1;
  commit(false); paint(); fields();
}

function mount() {
  if (panel || !GL() || !GL().planRows) return;
  load();

  panel = doc.createElement('div');
  panel.id = 'room-ed';
  panel.hidden = true;
  panel.innerHTML =
    '<div class="re-head">The Tavern<button class="re-x" id="re-close">✕</button></div>' +
    '<div class="re-list" id="re-list"></div>' +
    '<div class="re-fields" id="re-fields" hidden>' +
      '<label>across<input id="re-x" type="number" step="0.05"></label>' +
      '<label>depth<input id="re-z" type="number" step="0.05"></label>' +
      '<label>height<input id="re-y" type="number" step="0.05"></label>' +
      '<label>turn<input id="re-r" type="number" step="15"></label>' +
      '<label>size<input id="re-s" type="number" step="0.05"></label>' +
      '<div class="re-hint">arrows move it · <b>Shift</b> for bigger steps · ' +
      '<b>[</b> <b>]</b> turn · <b>PgUp/PgDn</b> raise · <b>Del</b> removes</div>' +
    '</div>' +
    '<div class="re-add"><select id="re-kind"></select>' +
      '<button id="re-addb">Add</button>' +
      '<button id="re-dup">Copy</button>' +
      '<button id="re-del">Delete</button></div>' +
    '<div class="re-foot"><button id="re-save">Save</button>' +
      '<button id="re-reset">Start over</button>' +
      '<button id="re-copy">Copy layout</button></div>';
  doc.body.appendChild(panel);
  list = doc.getElementById('re-list');

  kindSel = doc.getElementById('re-kind');
  const kinds = GL().planKinds();
  ['R', 'T'].forEach(p => {
    const g = doc.createElement('optgroup');
    g.label = p === 'R' ? 'the building' : 'the furnishings';
    kinds[p].forEach(m => {
      const o = doc.createElement('option');
      o.value = p + '|' + m; o.textContent = m;
      g.appendChild(o);
    });
    kindSel.appendChild(g);
  });

  doc.getElementById('re-close').onclick = () => toggle(false);
  doc.getElementById('re-addb').onclick = add;
  doc.getElementById('re-dup').onclick = () => {
    const r = rows[sel]; if (!r || r.k === 'floor') return;
    rows.push(Object.assign({}, r, { x: r.x + 0.4 }));
    sel = rows.length - 1; commit(false); paint(); fields();
  };
  doc.getElementById('re-del').onclick = () => {
    if (sel < 0 || rows[sel].k === 'floor') return;
    rows.splice(sel, 1); sel = Math.min(sel, rows.length - 1);
    commit(false); paint(); fields();
  };
  doc.getElementById('re-save').onclick = () => { commit(true); say('Layout saved'); };
  doc.getElementById('re-reset').onclick = () => {
    GL().resetPlan(); load(); sel = -1; paint(); say('Back to the shipped tavern');
  };
  doc.getElementById('re-copy').onclick = () => {
    const t = JSON.stringify(rows, null, 1);
    if (root.navigator && navigator.clipboard) navigator.clipboard.writeText(t);
    say('Layout copied — paste it to me and I will ship it as the default');
  };
  ['x', 'y', 'z', 'r', 's'].forEach(k => {
    const e = doc.getElementById('re-' + k);
    e.oninput = () => {
      const r = rows[sel]; if (!r || r.k === 'floor') return;
      const v = parseFloat(e.value);
      if (!isFinite(v)) return;
      if (k === 's') setSize(r, v); else r[k] = v;
      commit(false); paint();
    };
  });
}

function say(t) {
  const el = doc.getElementById('toast');
  if (!el) return;
  el.textContent = t; el.classList.add('on');
  clearTimeout(say._t); say._t = setTimeout(() => el.classList.remove('on'), 2200);
}

function key(e) {
  /* R opens it, and never while you are typing into something */
  if (!here()) return;
  const a = doc.activeElement, tag = a && a.tagName;
  const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
                 (a && a.isContentEditable);
  if (!typing && (e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault(); toggle(); return;
  }
  if (!open_() || typing || sel < 0) return;
  const d = e.shiftKey ? BIG : NUDGE;
  const K = {
    ArrowLeft:  () => bump('x', -d), ArrowRight: () => bump('x', d),
    ArrowUp:    () => bump('z', -d), ArrowDown:  () => bump('z', d),
    PageUp:     () => bump('y', d),  PageDown:   () => bump('y', -d),
    '[':        () => bump('r', -TURN), ']':     () => bump('r', TURN),
    Delete:     () => doc.getElementById('re-del').click(),
    Escape:     () => toggle(false)
  }[e.key];
  /* stopped as well as prevented: the arrows already nudge a prop on the
     wood and step through your hand, and both of those would fire too */
  if (K) { e.preventDefault(); e.stopPropagation(); K(); }
}

/* ── POINT AT IT AND IT TELLS YOU WHAT IT IS ──────────────────
   Three rounds of "there is a floating chair above the table" and three
   wrong guesses from me, each costing a build, a render and a reply. The
   room is merged into a handful of buffers so nothing can be picked out of
   the picture — but it is also a LIST, and every row's place is known, so
   each one can be projected to the screen and compared with where you
   clicked.

   With the panel open, click the thing. It selects it in the list, scrolls
   to it and names it in the toast, and then Del removes it. Which is the
   difference between describing a fault and fixing it. */
function pick(e) {
  if (!open_() || !here() || !rows) return;
  if (e.target && e.target.closest && e.target.closest('#room-ed')) return;
  const hits = root.__what && root.__what(e.clientX, e.clientY, 1);
  if (!hits || !hits.length) return;
  const h = hits[0];
  const i = rows.findIndex(r => r.m === h.m &&
    Math.abs((+r.x || 0) - h.at[0]) < 0.01 && Math.abs((+r.z || 0) - h.at[2]) < 0.01);
  if (i < 0) { say(h.m + ' — not part of the layout'); return; }
  sel = i; paint(); fields();
  const el = list && list.children[i];
  if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  say(h.m + '   at ' + h.at.join(', ') + '   ·  Del removes it');
}

function toggle(v) {
  if (!here()) return;
  if (!panel) mount();
  if (!panel) return;
  panel.hidden = (v == null) ? !panel.hidden : !v;
  if (!panel.hidden) { load(); paint(); fields(); }
}

/* The key listener is hung here rather than inside mount(), because mount()
   is what R has to be able to reach: if it only existed once the panel did,
   R could never build the panel. */
doc.addEventListener('keydown', key, true);
doc.addEventListener('click', pick, true);
root.RoomEditor = { toggle, mount, pick };
root.addEventListener('load', () => setTimeout(mount, 1200));

})(window, document);
