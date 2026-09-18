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

   ── STANDING ORDERS (2026-09-17) ──────────────────────────────
   grumkata: "we also need to redo the options entirely".

   They were a web form wearing brass: a checkbox, a number spinner
   and a <select> whose chosen line ("Move freely") ran out of the
   panel. None of those three controls belongs at this table, and a
   native dropdown cannot be styled into one that does.

   So there are three controls now, and each is a thing rather than
   a widget:

     A YES IS A SEAL.   Fog of war is either sealed or it is not.
                        Pressing it stamps wax and throws gilt.
     A NUMBER IS A TALLY. Struck down or up by a lozenge on each
                        side, so mana never needs a keyboard.
     A CHOICE IS A ROW OF PENNONS. Every choice is visible at once,
                        with what it means written under the one
                        that is flying. Nothing is hidden behind a
                        closed list.

   The same three build the make-a-scene warrant, so setting a scene
   up and running it are visibly the same kind of act.
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
         <h3>A ${esc(def.name.toLowerCase())} scene</h3>
         <button class="sc-opts-x" data-sc="cancel" title="Never mind">&#10005;</button></div>
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
         <button class="sc-seal go" data-sc="ok" title="Seal it and set it down">
           <span class="sc-wax"></span><b>Set it down</b></button>
       </div>
     </div>`;

  /* a warrant's own pennons and tallies, same controls as the orders */
  wireControls(shell(), (key, v) => {
    draft[key] = v;
    paintMake();
  }, k => draft[k]);

  shell().querySelectorAll('[data-setup]').forEach(el => {
    el.addEventListener('input', () => {
      draft[el.dataset.setup] = el.type === 'checkbox' ? el.checked : el.value;
    });
  });

  /* the picture buttons */
  shell().querySelectorAll('[data-pick]').forEach(b => {
    b.addEventListener('click', () => {
      const key = b.dataset.pick;
      if (!root.Pictures) return;
      root.Pictures.ask(pic => {
        if (!pic || !pic.src) return;
        draft[key] = pic.src;
        draft[key + 'W'] = pic.w; draft[key + 'H'] = pic.h;
        const wrap = b.parentNode;
        const th = wrap.querySelector('.sc-pic-thumb');
        if (th) th.style.backgroundImage = 'url(' + pic.src + ')';
        const x = wrap.querySelector('.sc-drop'); if (x) x.hidden = false;
        b.innerHTML = 'Change the picture';
      });
    });
  });
  shell().querySelectorAll('[data-drop]').forEach(b => {
    b.addEventListener('click', () => {
      const key = b.dataset.drop;
      draft[key] = '';
      const wrap = b.parentNode;
      const th = wrap.querySelector('.sc-pic-thumb');
      if (th) th.style.backgroundImage = '';
      const p = wrap.querySelector('.sc-pick'); if (p) p.innerHTML = 'Choose a picture\u2026';
      b.hidden = true;
    });
  });
}

/* ══ THE THREE CONTROLS ═══════════════════════════════════════
   A seal, a tally, a row of pennons. Written once and used by both
   panels. `key` is what changed and `set` is told about it. */
function seal(key, on, attr) {
  return `<button type="button" class="sc-seal${on ? ' on' : ''}" ${attr}="${key}"
     role="switch" aria-checked="${on ? 'true' : 'false'}"
     title="${on ? 'Sealed — press to break it' : 'Press to seal it'}">
     <span class="sc-wax"></span><b>${on ? 'Sealed' : 'Open'}</b></button>`;
}
function tally(key, val, min, max, attr) {
  return `<span class="sc-tally">
    <button type="button" class="sc-step" data-step="-1" data-for="${key}">&minus;</button>
    <input class="sc-num" type="number" ${attr}="${key}" value="${esc(val)}"
      min="${min == null ? 0 : min}" max="${max == null ? 999 : max}">
    <button type="button" class="sc-step" data-step="1" data-for="${key}">+</button>
  </span>`;
}
function pennons(key, val, choices, attr) {
  return `<span class="sc-choice">${choices.map(c =>
    `<button type="button" class="sc-pen${c[0] === val ? ' on' : ''}"
       ${attr}="${key}" data-val="${esc(c[0])}">${esc(c[1])}</button>`).join('')}</span>`;
}

/* every seal, tally and pennon in `el`, wired to one setter */
function wireControls(el, set, get) {
  el.querySelectorAll('[data-val]').forEach(b =>
    b.addEventListener('click', () => set(b.dataset.opt || b.dataset.setup, b.dataset.val)));
  el.querySelectorAll('.sc-seal[data-opt],.sc-seal[data-setup]').forEach(b =>
    b.addEventListener('click', () => {
      const k = b.dataset.opt || b.dataset.setup;
      if (root.Herald) root.Herald.burstOn(b, 12);
      set(k, !get(k));
    }));
  el.querySelectorAll('.sc-step').forEach(b =>
    b.addEventListener('click', () => {
      const k = b.dataset.for;
      const inp = el.querySelector(`.sc-num[data-opt="${k}"],.sc-num[data-setup="${k}"]`);
      if (!inp) return;
      const lo = +inp.min, hi = +inp.max;
      const v = Math.max(lo, Math.min(hi, (parseInt(inp.value, 10) || 0) + (+b.dataset.step)));
      set(k, v);
    }));
  el.querySelectorAll('.sc-num').forEach(inp =>
    inp.addEventListener('change', () =>
      set(inp.dataset.opt || inp.dataset.setup, inp.value)));
}

function field(f, val) {
  const id = 'setup-' + f.key;
  let control;
  if (f.type === 'number') {
    control = tally(f.key, val, f.min, f.max, 'data-setup');
  } else if (f.type === 'model') {
    const list = (C().MODELS[f.from] || []);
    control = pennons(f.key, val, list.map(m => [m.id, m.name, m.note]), 'data-setup');
  } else if (f.type === 'image') {
    /* A PICTURE COMES OFF YOUR MACHINE, NOT OFF A URL.
       This was a text box asking you to paste a link — in an app that
       ships as one file opened from disk, where a link will not load.
       49-pictures.js already decodes, measures and shrinks a picture on
       the way in and every other part of the app uses it; the two scenes
       that most need a picture were the only two that could not get one. */
    const has = val && String(val).slice(0, 5) === 'data:';
    control = `<span class="sc-pic" id="${id}">
        <button type="button" class="sc-pick" data-pick="${f.key}">${
          has ? 'Change the picture' : 'Choose a picture&hellip;'}</button>
        <span class="sc-pic-thumb"${has ? ` style="background-image:url(${esc(val)})"` : ''}></span>
        <button type="button" class="sc-drop" data-drop="${f.key}"${has ? '' : ' hidden'}
          title="Take it off">&times;</button>
      </span>`;
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
  /* centred on the middle of the wood you are looking at, using the scene's
     own size — a combat sheet is 1180 wide and was landing half off the slab
     when every scene was assumed to be a 520px card */
  const sz = (C().SCENES[draftKind] || {}).size || { w: 520, h: 180 };
  const scene = T().put({
    kind: 'scene', scene: draftKind, setup: draft,
    x: Math.round(at.x - sz.w / 2), y: Math.round(at.y - sz.h / 2),
    w: sz.w, h: sz.h
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
       <button class="sc-opts-x" title="Close">&#10005;</button>
     </div>
     ${def.options.length ? `<div class="sc-opts-body">${
        def.options.map(k => optRow(k, C().OPTIONS[k], s.options[k])).join('')
      }</div>` : `<div class="sc-opts-none">This scene has nothing to set. It is a backdrop.</div>`}
     <div class="sc-opts-foot">Only you see these orders.</div>`;

  p.querySelector('.sc-opts-x').addEventListener('click', () => {
    dismissed = sceneId; p.hidden = true;
  });
  wireControls(p, (k, v) => {
    T().setOption(sceneId, k, v);
    showOptions(sceneId, true);
  }, k => T().get(sceneId).options[k]);
}

function optRow(key, def, val) {
  const chosen = def.type === 'choice' && def.choices.find(c => c[0] === val);
  /* A CHOICE TAKES THE WHOLE ROW. Three pennons beside a label is how the
     old <select> ran out of the panel; under it, they fit and all three can
     be read at once. */
  if (def.type === 'choice') {
    return `<div class="sc-opt wide">
      <div class="sc-opt-text"><b>${esc(def.label)}</b>
        <i>${esc(chosen ? chosen[2] : def.hint)}</i></div>
      ${pennons(key, val, def.choices, 'data-opt')}
    </div>`;
  }
  const control = def.type === 'bool'
    ? seal(key, !!val, 'data-opt')
    : tally(key, val, def.min, def.max, 'data-opt');
  return `<div class="sc-opt">
    <div class="sc-opt-text">
      <b>${esc(def.label)}</b>
      <i>${esc(def.hint)}</i>
    </div>
    ${control}
  </div>`;
}

function hideOptions() { const p = doc.getElementById('sc-opts'); if (p) p.hidden = true; }

root.SceneSetup = { make, close, showOptions, hideOptions };

})(window, document);
