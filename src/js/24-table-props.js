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

/* THE DOUBLE PRESS THAT OPENS A NOTE IS COUNTED OUT HERE, not on the element.
   Letting go of a note ends in TableModel.homeTo, which is not one of the
   cheap changes, so the whole prop is rebuilt between the first press and the
   second — and a counter living on the element was thrown away with it every
   single time. Keyed by the thing's id, which survives the rebuild. */
let tap = { id: null, t: 0, x: 0, y: 0 };

function mount() {
  T().on(paint);
  paint();
}

/* Changes that only move a thing are applied IN PLACE. Rebuilding the props
   for them detached the very element the pointer was pressing on — `raise`
   fires on pointerdown, so grabbing anything threw InvalidStateError from
   setPointerCapture and no prop could be dragged at all. */
const CHEAP = { raise: 1, move: 1, scale: 1 };

function paint(state, why) {
  if (why && CHEAP[why] && restyle()) return;
  repaint();
}

function restyle() {
  const tbl = doc.getElementById('tbl');
  if (!tbl) return false;
  const st = T().state;
  const live = T().activeScene();
  let all = true;
  st.things.forEach(t => {
    /* the two things that are deliberately NOT props on the wood: a token
       standing on a board, and the running combat scene (it IS the sheet) */
    if (t.kind === 'token' && t.in) return;
    if (live && t.id === live.id && t.scene === 'combat') return;
    const el = tbl.querySelector(`.prop.t3-thing[data-id="${t.id}"]`);
    if (!el) { all = false; return; }
    el.style.zIndex = 10 + t.z;
    el.dataset.x = t.x; el.dataset.y = t.y;
    /* resize the face where it stands, rather than rebuilding it — see the
       note on data-w0 in repaint(). The drawing inside is scaled with it, so
       a picture stays its own shape and a counter's plate stays legible. */
    const f = el.querySelector('.face');
    if (f && el.dataset.w0) {
      const k = t.scale || 1;
      f.style.width = Math.round(+el.dataset.w0 * k) + 'px';
      /* only the faces that were given a height keep one — a note's is set
         by what is written on it and must stay that way */
      if (f.style.height) f.style.height = Math.round(+el.dataset.h0 * k) + 'px';
      const box = f.querySelector('.fgbox');
      if (box && box.dataset.k0) {
        box.style.transform = 'translate(-50%,-50%) scale(' +
          (+box.dataset.k0 * k).toFixed(4) + ')';
      }
    }
    if (!el.classList.contains('lift')) D().place(el);
  });
  return all;
}

function repaint() {
  const tbl = doc.getElementById('tbl');
  if (!tbl) return;
  const st = T().state;

  /* Only the props that ARE model things. The toolbox chest and the bin are
     props too — they live on the wood like everything else — and a bare
     `.prop` selector here deleted them on the first repaint, which is why
     putting a scene down made the chest vanish. */
  tbl.querySelectorAll('.prop.t3-thing').forEach(p => p.remove());

  /* The running combat scene is not drawn as a card — it IS the battlefield
     sheet that already lives in the page. Anything else still gets a card,
     because exploration and stage have no interior yet and saying so plainly
     beats drawing a convincing-looking box that does nothing. */
  const live = T().activeScene();
  if (live && live.scene === 'combat' && root.CombatScene) root.CombatScene.show(live);
  else if (root.CombatScene) root.CombatScene.hide();

  st.things.slice().sort((a, b) => a.z - b.z).forEach(t => {
    if (t.id === (live && live.id) && t.scene === 'combat') return;
    /* a token whose home is a scene is not on the wood — it is standing on
       that scene's board, drawn there. One object, one place. */
    if (t.kind === 'token' && t.in) return;
    const el = doc.createElement('div');
    el.className = 'prop t3-thing t3-' + t.kind + (st.active === t.id ? ' live' : '');
    el.dataset.id = t.id;
    el.dataset.x = t.x; el.dataset.y = t.y;
    el.dataset.r = t.rot || 0;
    /* HOW HIGH IT STANDS, and this is not decoration. The table is
       transform-style:preserve-3d, so hit testing walks the 3D scene rather
       than the flattened boxes — a thing at translateZ(8px) sitting over the
       combat sheet is BEHIND that sheet's raised plaques (translateZ(38px))
       and cannot be clicked at all, however high its z-index. A token has to
       stand proud of the board it stands on. */
    el.dataset.rest = t.kind === 'token' ? 44 : 8;
    el.dataset.z = el.dataset.rest;
    el.dataset.locked = t.locked ? '1' : '0';
    el.style.setProperty('--pt', (t.kind === 'scene' ? 13 : 9) + 'px');
    el.style.zIndex = 10 + t.z;
    /* WHAT SIZE IT IS AT 100%. The wheel resizes a piece (23-table3d.js
       scaleUnder), and a resize must not rebuild the element — it happens
       forty times in one gesture and every rebuild throws away the GL
       object standing on it. So the natural size is recorded here once and
       restyle() scales the face from it in place. */
    el.dataset.w0 = t.w || 260;
    el.dataset.h0 = t.h || (t.kind === 'token' ? 182 : 200);
    el.innerHTML = face(t, st);
    tbl.appendChild(el);
    D().place(el);
    wire(el, t);
  });

  /* every model on the wood, handed to the layer that can actually draw it */
  if (root.TableGL && root.TableGL.sync) {
    root.TableGL.sync(st.things.filter(t => t.kind === 'model' && t.model)
                               .map(t => ({ id: t.id, model: t.model })));
  }

  /* the running scene's live controls follow whatever is running */
  const act = T().activeScene();
  if (act && root.SceneSetup) root.SceneSetup.showOptions(act.id);
  else if (root.SceneSetup) root.SceneSetup.hideOptions();
}

function face(t, st) {
  const def = t.kind === 'scene' ? C().SCENES[t.scene] : null;
  const live = st.active === t.id;
  const w = Math.round((t.w || 260) * (t.scale || 1));

  /* ── A SCENE ON THE WOOD IS THE SCENE ────────────────────────
     It used to be a brown card listing its own settings back at you,
     which is a form lying on a table. A map put down is the MAP —
     the picture chosen while it was still in your hand — and a stage
     is its backdrop with the people standing on it. Pressing it runs
     it; there is no "Run this" button, because pressing the thing is
     how you use the thing. The only text left is the round count on
     a scene that has people in it, and that is a number, not a name. */
  const inner = def
    ? `<div class="t3-sc grip${live ? ' on' : ''}" data-run="${t.id}">
         ${root.Figures ? root.Figures.html(
             { kind: 'scene', scene: t.scene },
             { map: t.setup.map, backdrop: t.setup.backdrop, width: t.setup.width },
             Math.min(w, Math.round((t.h || 620) * (t.scale || 1))) * 0.94) : ''}
         <span class="t3-sc-rim"></span>
       </div>`
    /* ── THE WHOLE NOTE IS THE HANDLE ──────────────────────────
       It used to be draggable only by its title bar, which is NINE PIXELS
       TALL at the fit zoom — and the body underneath it called
       stopPropagation on pointerdown, so a press anywhere else on the note
       did nothing at all. Between them there was almost nowhere on a note you
       could actually take hold of, and a press that misses pans the table
       instead. That is the whole of "dragging an item desynced, you drag
       faster than it moves and it's hard to use": most presses were never
       grabbing the piece in the first place.

       So the piece is the handle, everywhere, like every other piece on this
       table. Writing on it is a DOUBLE click, which is how you open a label
       on a physical thing rather than how you push it about. */
    : t.kind === 'note'
    ? `<div class="t3-title grip">
         <span class="t3-m">✎</span>
         <b class="nt-name" data-rename="${t.id}" title="Click to rename">${esc(t.name)}</b>
       </div>
       <div class="nt-body grip" data-note="${t.id}" contenteditable="false"
            spellcheck="false" title="Double-click to write on it"
       >${esc(t.text || '')}</div>`
    /* ── A COUNTER, NOT A CARD ABOUT ONE ───────────────────────
       It was a brown card with a small blue circle, a name and a button
       reading "Ally" — which is nothing like the moulded counter you were
       holding a second earlier, and "what you were holding is what lands"
       is the entire promise the chest now makes. It is the SAME drawing
       46-figures.js put in your hand, with its brass base plate: the name
       engraved on the front of the base the way it is on a painted
       miniature, its hit points beside it, and the little enamel pip that
       turns it over to the other side. */
    : t.kind === 'token'
    ? `<div class="tkn grip" data-side="${t.ent ? t.ent.side : 'al'}"
            data-source="${esc(t.source || 'npc')}">${
         root.Figures ? root.Figures.html(
           { kind: 'token', name: t.name },
           { side: t.ent ? t.ent.side : 'al', plate: t.name, id: t.id,
             entKind: t.ent ? t.ent.kind : 'unit',
             /* it is a PIECE on the wood, not a drawing of one: 27-table-gl.js
                stands the real figure on the anchor this asks for */
             stand: true, source: t.source || 'npc',
             src: t.src || '', art: t.art || '',
             hp: t.ent ? t.ent.hp + '/' + t.ent.max : '' },
           Math.min(w, Math.round((t.h || 182) * (t.scale || 1))) * 0.96) : ''
       }</div>`
    : null;

  /* ── the pieces that ARE a picture of themselves ──────────────
     Art, a page and a model were three identical brown cards with a
     word on them, which is what grumkata meant by "creation of items
     sucks ... you grab a piece of art and then separately choose the
     art after placing it". They are drawn by 46-figures.js — the SAME
     drawing that was in your hand a moment ago, so what you were
     holding is literally what landed. */
  if (inner === null) {
    const h = Math.round((t.h || 200) * (t.scale || 1));
    const F = root.Figures;

    /* ── A MODEL IS AN ANCHOR AND NOTHING ELSE ─────────────────
       grumkata: "3d models dont work at all even though i have so many
       assets to use". They did not work because nothing DREW them — a model
       on the wood was a CSS drawing of a grey box. Same trick as the chest
       now: this face is empty and invisible, 27-table-gl.js measures its
       rect every frame and paints the real asset over it. All that is left
       here is the shadow it throws, which has to be CSS because it lies on
       the wood and the wood is a DOM element. */
    if (t.kind === 'model') {
      return `<div class="face t3-face t3-bare t3-mdl-face"
                   style="width:${w}px;height:${h}px">
                <div class="t3-mdl-grab grip"></div>
                <span class="t3-mdl-shade"></span>
              </div>`;
    }

    /* ── A PICTURE IS ITS OWN SHAPE ────────────────────────────
       grumkata: "artwork not autofitting to the image, also having a border
       for some weird reason". The frame is gone and the prop's box is the
       picture's own proportions — set when it was taken out of the box, from
       the decoded image rather than from a guess. */
    const body = t.kind === 'art'
      ? `<div class="t3-pic grip">${
           t.src ? `<img alt="" src="${esc(t.src)}">`
                 : (F ? F.html({ kind:'art' }, {}, Math.min(w, h) * .8) : '')}</div>`
      : `<div class="t3-fig grip">${
           F ? F.html({ kind: t.kind, scene: t.scene },
                      { rule: t.rule, tint: t.tint }, Math.min(w, h) * .84) : ''}</div>`;
    return `<div class="face t3-face t3-bare" style="width:${w}px;height:${h}px">
              ${body}
              <span class="side f"></span><span class="side r"></span>
              <span class="side l"></span><span class="side b"></span>
            </div>`;
  }

  /* a scene is bare too — the drawing IS the face, so a brown card behind it
     would only be a card with a picture stuck on it */
  const bare = t.kind === 'scene' || t.kind === 'token';
  const hh = Math.round((t.h || (t.kind === 'token' ? 182 : bare ? 620 : 200))
                        * (t.scale || 1));
  return `<div class="face t3-face${bare ? ' t3-bare' : ''}${
            t.kind === 'note' ? ' nt-' + esc(t.tint || 'cream') : ''
          }" style="width:${w}px${bare ? ';height:' + hh + 'px' : ''}">
            ${inner}
            <span class="side f"></span><span class="side r"></span>
            <span class="side l"></span><span class="side b"></span>
          </div>`;
}

function wire(el, t) {
  /* A note is a thing you WRITE ON. Typing goes straight to the model on the
     way out of the field, and the keys are kept away from the table — app.js
     and the toolbox both listen on the document, and B would have opened the
     chest in the middle of a sentence. */
  const note = el.querySelector('[data-note]');
  if (note) {
    /* keys only reach the note while you are actually writing on it — app.js
       and the toolbox both listen on the document, and B would have opened
       the chest in the middle of a sentence */
    note.addEventListener('keydown', e => {
      if (note.isContentEditable) e.stopPropagation();
    });
    /* ── OPENING IT IS THE SECOND PRESS, COUNTED HERE ──────────
       Not a `dblclick` listener. Picking the note up calls preventDefault on
       pointerdown, which is what stops the browser selecting text while you
       drag — and it also suppresses the compatibility click pair, so the
       dblclick never arrived and the note could never be opened at all.
       Counting the presses ourselves is the only version that works with
       both. This listener is on the note, so it runs before the table's. */
    const open = () => {
      note.setAttribute('contenteditable', 'true');
      note.classList.remove('grip');
      el.classList.add('writing');
      note.focus();
      const r = doc.createRange(); r.selectNodeContents(note); r.collapse(false);
      const sel = root.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    };
    note.addEventListener('pointerdown', e => {
      if (note.isContentEditable) { e.stopPropagation(); return; }
      const now = performance.now();
      if (tap.id === t.id && now - tap.t < 450 &&
          Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 7) {
        tap = { id: null, t: 0, x: 0, y: 0 };
        e.preventDefault(); e.stopPropagation();
        open();
        return;
      }
      tap = { id: t.id, t: now, x: e.clientX, y: e.clientY };
      /* and the press goes on to the table, so the note can be picked up */
    });
    note.addEventListener('dblclick', e => e.preventDefault());
    note.addEventListener('blur', () => {
      note.setAttribute('contenteditable', 'false');
      note.classList.add('grip');
      el.classList.remove('writing');
      const t2 = T().get(t.id); if (!t2) return;
      const v = note.innerText.replace(/\u00a0/g, ' ');
      if (v !== (t2.text || '')) { t2.text = v; T().changed('note'); }
    });
  }

  /* PRESSING THE THING IS HOW YOU USE THE THING. A dormant scene is run by
     pressing it, not by finding a small button called "Run this" in its
     corner — but only if the pointer did not travel, or shoving one aside
     would also start it. */
  const run = el.querySelector('[data-run]');
  if (run) {
    let from = null;
    run.addEventListener('pointerdown', e => { from = { x: e.clientX, y: e.clientY }; });
    run.addEventListener('pointerup', e => {
      const near = from && Math.hypot(e.clientX - from.x, e.clientY - from.y) < 5;
      from = null;
      if (near && T().state.active !== t.id) { e.stopPropagation(); T().activate(t.id); }
    });
  }
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

  /* DROPPED ON A LINE. This is how a token becomes a combatant: the line you
     let go over is its home and its side, because the board is the statement.
     Checked before the generic scene test — a line is inside a scene, so the
     coarser answer would win and the token would land nowhere in particular. */
  if (t.kind === 'token') {
    const line = lineUnder(ev);
    const live = T().activeScene();
    if (line && live && live.scene === 'combat' && root.Tokens) {
      root.Tokens.toLine(id, live.id, line);
      return;
    }
    if (t.in && root.Tokens) root.Tokens.toWood(id,
      parseFloat(el.dataset.x), parseFloat(el.dataset.y));
  }

  if (t.kind !== 'scene') {
    const over = sceneUnder(ev, id);
    T().homeTo(id, over ? over.id : null);
  }
}

/* which rank the pointer is over, if any */
function lineUnder(ev) {
  for (const el of doc.elementsFromPoint(ev.clientX, ev.clientY)) {
    const l = el.closest && el.closest('#field .line');
    if (l && l.dataset.line) return l.dataset.line;
  }
  return null;
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

root.TableProps = { mount, paint, repaint, dragging, dropped };

})(window, document);
