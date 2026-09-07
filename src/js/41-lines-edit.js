/* ══════════════════════════════════════════════════════════════
   41-lines-edit.js — THE LINES ARE YOURS.

   Eight lines is where a fight starts, not what it is stuck with.
   A line can be renamed, added or taken away while the fight is
   running, because a GM who wants a fifth rank or a line called
   "the bridge" should not have to want it before making the scene.

   Done ON THE SHEET, not in a panel. Click a line's name and it
   becomes an input; the rail at the end of each side adds one; a
   line you can remove says so only when it is empty, because
   deleting a rank with soldiers standing in it is not an edit, it
   is an accident.

   Nothing here reaches into app.js. It edits S.lines — which is the
   scene's own array in the table's model — and calls app.js's own
   render(). That is the entire contract.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const esc = s => String(s == null ? '' : s)
  .replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

const lines = () => (typeof S !== 'undefined' && S.lines) || [];
const ofSide = sd => lines().filter(l => l.side === sd);
const draw = () => { if (typeof render === 'function') render(); };

let uidn = 0;
const key = sd => sd[0] + 'x' + (Date.now().toString(36)) + (++uidn).toString(36);

/* depth is distance from your own backline, so it has to be renumbered
   whenever the set changes — it is what move speed is measured in */
function renumber() {
  ['en', 'al'].forEach(sd => {
    const ls = ofSide(sd);
    ls.forEach((l, i) => { l.depth = i; l.front = (i === ls.length - 1); });
  });
}

function add(sd) {
  const ls = ofSide(sd);
  const l = { key: key(sd), side: sd, label: 'New line', depth: ls.length, ents: [] };
  const all = lines();
  /* enemy lines run back-to-front down the page and ally lines front-to-back
     up it, so "one more line" goes on opposite ends of the array */
  if (sd === 'en') all.splice(all.indexOf(ls[ls.length - 1]) + 1, 0, l);
  else all.splice(all.indexOf(ls[0]), 0, l);
  renumber(); draw();
  setTimeout(() => rename(l.key), 30);
}

function drop(k) {
  const all = lines(), i = all.findIndex(l => l.key === k);
  if (i < 0) return;
  if (all[i].ents.length) return;                 /* never with soldiers on it */
  if (ofSide(all[i].side).length <= 1) return;    /* a side needs one line */
  all.splice(i, 1); renumber(); draw();
}

function rename(k) {
  const tab = doc.querySelector(`.line[data-line="${k}"] .tab`);
  if (!tab) return;
  const span = tab.querySelector('.ln-name');
  if (!span) return;
  const l = lines().find(x => x.key === k); if (!l) return;
  span.outerHTML = `<input class="ln-in" value="${esc(l.label)}" maxlength="24">`;
  const inp = tab.querySelector('.ln-in');
  inp.focus(); inp.select();
  const done = keep => {
    if (done.did) return; done.did = true;
    const v = inp.value.trim();
    if (keep && v) l.label = v;
    draw();
  };
  inp.addEventListener('keydown', e => {
    e.stopPropagation();                       /* app.js owns a lot of keys */
    if (e.key === 'Enter') done(true);
    if (e.key === 'Escape') done(false);
  });
  inp.addEventListener('blur', () => done(true));
  inp.addEventListener('pointerdown', e => e.stopPropagation());
}

/* ── the controls, put back after every render ─────────────────
   render() rebuilds #field wholesale, so these are re-injected rather than
   bound once. The listeners themselves are delegated on the document and
   survive it. */
function decorate() {
  doc.querySelectorAll('#field .line').forEach(el => {
    const l = lines().find(x => x.key === el.dataset.line);
    if (!l) return;
    const tab = el.querySelector('.tab');
    if (!tab || tab.querySelector('.ln-name')) return;
    const spans = tab.querySelectorAll('span');
    const nameSpan = spans[spans.length - 1];
    if (!nameSpan || nameSpan.classList.contains('depth')) return;
    nameSpan.classList.add('ln-name');
    nameSpan.title = 'Click to rename this line';
    if (!l.ents.length && ofSide(l.side).length > 1) {
      const x = doc.createElement('button');
      x.className = 'ln-x'; x.dataset.drop = l.key;
      x.title = 'Remove this line'; x.textContent = '×';
      tab.appendChild(x);
    }
  });

  /* a selected combatant that is a token can be taken back off the board —
     the same object, put back on the wood */
  const bar = doc.getElementById('selbar');
  if (bar && typeof S !== 'undefined' && S.sel && !bar.querySelector('.tk-off')) {
    const t = root.TableModel && root.TableModel.get(S.sel);
    if (t && t.kind === 'token') {
      const b = doc.createElement('button');
      b.className = 'tk-off'; b.dataset.off = S.sel;
      b.textContent = 'Off the board';
      b.title = 'Take it back to the wood — it is the same token';
      bar.appendChild(b);
    }
  }

  ['en', 'al'].forEach(sd => {
    const half = doc.querySelector('#field .half.' + sd);
    if (!half || half.querySelector('.ln-add')) return;
    const b = doc.createElement('button');
    b.className = 'ln-add'; b.dataset.add = sd;
    b.textContent = '+ line';
    b.title = 'Add a line to this side';
    half.appendChild(b);
  });
}

/* ── the token's own controls, on the token ────────────────────
   Renaming and side live ON the counter, not in a panel: a token is a light
   thing and its two facts should cost one click each. */
doc.addEventListener('click', e => {
  const sd = e.target.closest('[data-side-of]');
  if (sd && root.Tokens) {
    e.preventDefault(); e.stopPropagation();
    const t = root.TableModel.get(sd.dataset.sideOf);
    return root.Tokens.setSide(sd.dataset.sideOf,
      t && t.ent && t.ent.side === 'en' ? 'al' : 'en');
  }
  const rn = e.target.closest('[data-rename]');
  if (rn) { e.preventDefault(); e.stopPropagation(); return renameToken(rn.dataset.rename, rn); }
  const off = e.target.closest('[data-off]');
  if (off && root.Tokens) {
    e.preventDefault(); e.stopPropagation();
    const at = root.Table3D ? root.Table3D.middle() : { x: 1200, y: 780 };
    const b = root.Figures ? root.Figures.sizeOf({ kind: 'token' }) : { w: 150, h: 182 };
    root.Tokens.toWood(off.dataset.off, at.x - b.w / 2, at.y - b.h / 2);
    if (typeof S !== 'undefined') S.sel = null;
    if (typeof render === 'function') render();
    return;
  }
}, true);

function renameToken(id, node) {
  const t = root.TableModel && root.TableModel.get(id); if (!t) return;
  node.outerHTML = `<input class="tkn-in" value="${esc(t.name)}" maxlength="28">`;
  const inp = doc.querySelector('.tkn-in'); if (!inp) return;
  inp.focus(); inp.select();
  const done = keep => {
    if (done.did) return; done.did = true;
    if (keep && inp.value.trim()) root.Tokens.rename(id, inp.value.trim());
    else if (root.TableProps) root.TableProps.paint();
  };
  inp.addEventListener('keydown', ev => {
    ev.stopPropagation();
    if (ev.key === 'Enter') done(true);
    if (ev.key === 'Escape') done(false);
  });
  inp.addEventListener('blur', () => done(true));
  inp.addEventListener('pointerdown', ev => ev.stopPropagation());
}

doc.addEventListener('click', e => {
  const a = e.target.closest('[data-add]');
  if (a) { e.preventDefault(); e.stopPropagation(); return add(a.dataset.add); }
  const d = e.target.closest('[data-drop]');
  if (d) { e.preventDefault(); e.stopPropagation(); return drop(d.dataset.drop); }
  const n = e.target.closest('.ln-name');
  if (n) {
    const line = n.closest('.line');
    if (line) { e.preventDefault(); e.stopPropagation(); rename(line.dataset.line); }
  }
}, true);

root.LinesEdit = { decorate, add, drop, rename, renumber };

})(window, document);
