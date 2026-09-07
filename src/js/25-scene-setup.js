/* ══════════════════════════════════════════════════════════════
   23-scene-setup.js — MAKING A SCENE, AND RUNNING ONE.

   Two different kinds of decision, kept apart because they behave
   differently:

     SETUP    what the scene IS. Decided when it is made. Travels
              with a preset. Changing it is remaking the scene.
     OPTIONS  how the scene is being RUN. Live, any time, always
              to hand for the GM.

   Battlefield width is SETUP and lives on the scene — not on the
   table — because a campaign has many fights and they are not all
   the same size.

   Neither panel is an object on the wood. There is no private half
   of the table; the only things that differ per person are their
   own menus and papers, and these are menus.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const T = () => root.TableModel;
const C = () => root.TableContent;
const esc = s => String(s == null ? '' : s)
  .replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

let draft = null;      /* the scene being made */
let draftKind = null;
let dismissed = null;  /* the scene whose options the GM shut on purpose */

/* ══ MAKING ONE ═══════════════════════════════════════════════ */
function make(kind) {
  const def = C().SCENES[kind];
  if (!def) return;
  draftKind = kind;
  draft = C().defaultSetup(kind);
  paintMake();
  shell().hidden = false;
  const first = doc.querySelector('#sc-make [data-setup]');
  if (first) setTimeout(() => first.focus(), 30);
}

function shell() {
  let el = doc.getElementById('sc-make');
  if (el) return el;
  el = doc.createElement('div');
  el.id = 'sc-make';
  el.className = 'sc-modal';
  el.hidden = true;
  doc.body.appendChild(el);
  el.addEventListener('click', e => {
    if (e.target.dataset.sc === 'cancel' || e.target.classList.contains('sc-scrim')) close();
    if (e.target.dataset.sc === 'ok') commit();
  });
  doc.addEventListener('keydown', e => {
    if (el.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); commit(); }
  }, true);
  return el;
}
function close() { const el = doc.getElementById('sc-make'); if (el) el.hidden = true; draft = null; }

function paintMake() {
  const def = C().SCENES[draftKind];
  shell().innerHTML =
    `<div class="sc-scrim" data-sc="cancel"></div>
     <div class="sc-box" role="dialog" aria-modal="true">
       <div class="sc-head"><span class="sc-mark">${def.mark}</span>
         <h3>Make a ${esc(def.name.toLowerCase())} scene</h3></div>
       <div class="sc-blurb">${esc(def.blurb)}</div>
       <div class="sc-body">
         ${def.setup.map(f => field(f, draft[f.key])).join('')}
         ${def.fixed ? `<div class="sc-fixed">${
             Object.keys(def.fixed).map(k =>
               `<span><b>${def.fixed[k]}</b> ${esc(k)}</span>`).join('')
           } &mdash; set by the rules, not by you</div>` : ''}
       </div>
       <div class="sc-later">Its options — ${
         def.options.length
           ? def.options.map(k => esc(C().OPTIONS[k].label.toLowerCase())).join(', ')
           : 'it has none'
       } — stay to hand once it is on the table.</div>
       <div class="sc-foot">
         <button class="sc-btn" data-sc="cancel">Cancel</button>
         <button class="sc-btn go" data-sc="ok">Put it on the table</button>
       </div>
     </div>`;

  shell().querySelectorAll('[data-setup]').forEach(el => {
    el.addEventListener('input', () => {
      draft[el.dataset.setup] = el.type === 'checkbox' ? el.checked : el.value;
    });
  });
}

function field(f, val) {
  const id = 'setup-' + f.key;
  let control;
  if (f.type === 'number') {
    control = `<input id="${id}" data-setup="${f.key}" type="number"
       min="${f.min}" max="${f.max}" value="${esc(val)}">`;
  } else if (f.type === 'model') {
    const list = (C().MODELS[f.from] || []);
    control = `<select id="${id}" data-setup="${f.key}">${
      list.map(m => `<option value="${esc(m.id)}"${m.id === val ? ' selected' : ''}>${
        esc(m.name)}</option>`).join('')}</select>`;
  } else if (f.type === 'image') {
    control = `<input id="${id}" data-setup="${f.key}" type="text"
       placeholder="paste a link, or leave it and set it later" value="${esc(val)}">`;
  } else if (f.type === 'cast') {
    control = `<input id="${id}" data-setup="${f.key}" type="text"
       placeholder="names, separated by commas" value="${esc(val)}">`;
  } else {
    control = `<input id="${id}" data-setup="${f.key}" type="text" value="${esc(val)}">`;
  }
  return `<label class="sc-field" for="${id}">
    <span class="sc-lbl">${esc(f.label)}</span>
    ${control}
    ${f.hint ? `<span class="sc-hint">${esc(f.hint)}</span>` : ''}
  </label>`;
}

function commit() {
  if (!draft) return;
  const at = root.Table3D ? root.Table3D.middle() : { x: 1200, y: 780 };
  const scene = T().put({
    kind: 'scene', scene: draftKind, setup: draft,
    x: at.x - 260, y: at.y - 90, w: 520, h: 180
  });
  T().activate(scene.id);
  close();
  /* Deliberately NOT locking the camera into the new scene. Locking in is a
     gesture the GM makes (double right-click) when they want to read the
     board; doing it automatically on create yanked the view to 250% and lost
     the table the moment you put something on it. */
}

/* ══ RUNNING ONE — the options panel ══════════════════════════ */
function panel() {
  let el = doc.getElementById('sc-opts');
  if (el) return el;
  el = doc.createElement('aside');
  el.id = 'sc-opts';
  el.className = 'sc-opts';
  el.hidden = true;
  doc.body.appendChild(el);
  return el;
}

/* `ask` is true when the GM asked for this panel — made the scene, ran it,
   double-clicked it. It is false when the surface is merely repainting,
   which happens after every drag and every option change.

   Without that difference the ✕ did nothing lasting: the next repaint
   called this again and the panel came straight back. A close has to
   stay closed until the GM asks for it again. */
function showOptions(sceneId, ask) {
  const s = T().get(sceneId);
  const p = panel();
  if (!s || s.kind !== 'scene' || !T().mayUseBox()) { p.hidden = true; return; }
  if (ask) dismissed = null;
  else if (dismissed === sceneId) { p.hidden = true; return; }

  /* Do not rebuild the panel out from under someone using it — a repaint
     mid-edit would blow away the field they are typing in. */
  if (!ask && !p.hidden && p.dataset.scene === sceneId && p.contains(doc.activeElement)) return;

  const def = C().SCENES[s.scene];
  p.hidden = false;
  p.dataset.scene = sceneId;
  p.innerHTML =
    `<div class="sc-opts-head">
       <span class="sc-mark">${def.mark}</span>
       <div><b>${esc(s.name)}</b><i>${esc(def.name)} · ${
         def.setup.map(f => esc(f.label.toLowerCase()) + ' ' +
           esc(String(s.setup[f.key] || '—'))).join(' · ')}</i></div>
       <button class="sc-opts-x" title="Close">✕</button>
     </div>
     ${def.options.length ? `<div class="sc-opts-body">${
        def.options.map(k => optRow(k, C().OPTIONS[k], s.options[k])).join('')
      }</div>` : `<div class="sc-opts-none">This scene has nothing to set. It is a backdrop.</div>`}
     <div class="sc-opts-foot">Only you see this panel.</div>`;

  p.querySelector('.sc-opts-x').addEventListener('click', () => {
    dismissed = sceneId; p.hidden = true;
  });
  p.querySelectorAll('[data-opt]').forEach(el => {
    el.addEventListener('change', () => {
      const k = el.dataset.opt;
      const v = el.type === 'checkbox' ? el.checked : el.value;
      T().setOption(sceneId, k, v);
      showOptions(sceneId, true);
    });
  });
}

function optRow(key, def, val) {
  let control;
  if (def.type === 'bool') {
    control = `<label class="sc-switch">
      <input type="checkbox" data-opt="${key}"${val ? ' checked' : ''}>
      <span class="sc-slide"></span></label>`;
  } else if (def.type === 'number') {
    control = `<input class="sc-num" type="number" data-opt="${key}"
       min="${def.min}" max="${def.max}" value="${esc(val)}">`;
  } else {
    control = `<select class="sc-pick" data-opt="${key}">${
      def.choices.map(c => `<option value="${c[0]}"${c[0] === val ? ' selected' : ''}>${
        esc(c[1])}</option>`).join('')}</select>`;
  }
  const chosen = def.type === 'choice' && def.choices.find(c => c[0] === val);
  return `<div class="sc-opt">
    <div class="sc-opt-text">
      <b>${esc(def.label)}</b>
      <i>${esc(chosen ? chosen[2] : def.hint)}</i>
    </div>
    ${control}
  </div>`;
}

function hideOptions() { const p = doc.getElementById('sc-opts'); if (p) p.hidden = true; }

root.SceneSetup = { make, close, showOptions, hideOptions };

})(window, document);
