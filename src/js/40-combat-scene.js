/* ══════════════════════════════════════════════════════════════
   40-combat-scene.js — THE BRIDGE.

   A combat scene in the table's model is not a card describing a
   fight. It IS proto's battlefield sheet: #combat-prop, the .cwin
   with its eight lines, its counters drawn by the GL layer, its
   selection bar, its end-turn. That sheet already exists and works;
   this only decides WHEN it is on the table and what it is set to.

   Loaded after 32-combat-app.js because it reads that file's `S`
   and calls its `render()` — both of which are global there, and
   deliberately left global rather than wrapped, since app.js is
   grumkata's file and not mine to restructure.

   The setup a scene was made with becomes S.width; the options it
   is being run with become S.mana and the rest. That is the whole
   point of setup-vs-options: one describes the fight, the other
   describes how it is being run.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

const el = () => doc.getElementById('combat-prop');

/* Nothing here touches the board's contents. The lines, the units and every
   rule about them are app.js's and rules.js's; if this file ever starts
   knowing what a Hollow Knight is, it has gone wrong. */
function show(t) {
  const p = el(); if (!p) return;

  p.dataset.x = t.x; p.dataset.y = t.y; p.dataset.r = t.rot || 0;
  p.dataset.locked = t.locked ? '1' : '0';
  p.dataset.rest = 8;
  p.style.display = '';
  if (root.Table3D) root.Table3D.place(p);

  const nm = doc.getElementById('combat-name');
  if (nm) nm.textContent = t.name || 'Combat';

  if (typeof S === 'undefined') return;

  /* THE SCENE OWNS ITS BOARD. app.js ships a demo army so its drop rules can
     be tested; that is a fixture, not a starting state. A scene made from the
     box starts empty and keeps its own lines, and S.lines is a REFERENCE to
     that array — so every move app.js makes lands in the model and survives a
     reload without a single line of syncing code. */
  if (!Array.isArray(t.lines)) t.lines = root.TableContent.blankLines();
  S.lines = t.lines;
  S.sel = null; S.drag = null; S.sug = null; S.intent = null;

  /* the combatants ARE the tokens homed in this scene — see 43-tokens.js */
  if (root.Tokens) root.Tokens.fill(t);

  const w = parseInt(t.setup && t.setup.width, 10);
  const changed = Number.isFinite(w) && w !== S.width;
  if (Number.isFinite(w)) S.width = w;
  if (t.options && Number.isFinite(+t.options.mana)) S.mana = +t.options.mana;

  /* A narrower field can leave a rank over its cap, so lines are re-packed
     when the width actually moves — not on every repaint, which would shove
     units the GM had deliberately placed. */
  if (changed && typeof packLine === 'function') S.lines.forEach(packLine);
  if (typeof render === 'function') render();
}

function hide() {
  const p = el(); if (p) p.style.display = 'none';
}

/* the sheet is dragged by its own title bar, like any prop — so the model has
   to hear about it, or the position is lost on reload */
function moved(id) {
  const p = el(); if (!p || !root.TableModel) return;
  root.TableModel.move(id, parseFloat(p.dataset.x), parseFloat(p.dataset.y));
}

/* Everything app.js does ends in render(). Wrapping it is how the table's
   model hears about a move without app.js having to know the model exists —
   a function declaration at global scope IS a window property, so reassigning
   it changes what app.js's own bare `render()` calls resolve to. */
function hookSave() {
  if (typeof root.render !== 'function' || root.render.__saves) return;
  const inner = root.render;
  const wrapped = function () {
    const out = inner.apply(this, arguments);
    if (root.LinesEdit) root.LinesEdit.decorate();
    /* app.js splices ents between lines; which line a token is in has to be
       written back onto the token or it is lost on reload */
    if (root.Tokens && root.TableModel) {
      const live = root.TableModel.activeScene();
      if (live && live.scene === 'combat') root.Tokens.harvest(live);
    }
    if (root.TableModel) root.TableModel.save();
    return out;
  };
  wrapped.__saves = true;
  root.render = wrapped;
}

root.CombatScene = { show, hide, moved, el, hookSave };

})(window, document);
