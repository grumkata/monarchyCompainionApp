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
let shownId = null;          /* the scene the sheet was last set up for */
/* ── WRITTEN BY WHOEVER CHANGED IT, AND BY NOBODY ELSE ────────
   The turn is written back onto the scene only when THIS machine changed it
   — somebody here pressed End Turn, declared a move, asked for an ability.
   Every table renders the sheet all the time; if each of them wrote what it
   was showing, a table a moment behind would send the old phase straight
   back over the GM's End Turn. So what the scene last told us is kept, and
   only a difference from it is news. */
let heardFight = '';
const fightNow = () => (typeof S === 'undefined') ? '' :
  JSON.stringify([S.round, S.phase, S.sug || null, S.intent || null]);

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
  /* the ground slot by slot, and the ground the whole fight stands on — the
     mat is dressed in the terrain's colours (14-war.css), and the field is
     built from it (37-scene-field.js) */
  S.features = Array.isArray(t.features) ? t.features : [];
  S.terrain = root.TableContent.terrainOf(t.setup && t.setup.terrain);
  S.name = t.name || 'Combat';
  p.dataset.terrain = S.terrain;
  const cw = p.querySelector('.cwin');
  if (cw) { cw.dataset.terrain = S.terrain; matColours(cw, S.terrain); }
  /* ── THE SAME FIGHT, SHOWN AGAIN, IS STILL YOUR FIGHT ─────────
     This ran on every repaint of the wood, and at a live table the wood is
     repainted whenever anybody changes anything — so a player's selection,
     the ability bar open on their unit and the move they had just declared
     were all wiped by somebody else nudging a token. Only a DIFFERENT scene
     starts from nothing. What you are pointing at and holding is yours and
     is kept while it still exists. */
  const again = shownId === t.id;
  shownId = t.id;
  if (!again) { S.sel = null; S.drag = null; }
  /* ── AND WHOSE TURN IT IS IS THE TABLE'S ──────────────────────
     The round, the phase, the move a player has declared and the ability
     they have asked to use lived in THIS machine's `S` and nowhere else:
     every table counted its own rounds, and a player's "Declared" never
     reached the GM, who was the only one who could allow it. They ride on
     the scene now (`fight`), so they go wherever the scene goes. */
  const f = t.fight || {};
  S.round = Number.isFinite(+f.round) && +f.round > 0 ? +f.round : (again ? S.round : 1);
  S.phase = Number.isFinite(+f.phase) ? +f.phase : (again ? S.phase : 0);
  S.sug = f.sug || null;
  S.intent = f.intent || null;
  heardFight = fightNow();

  /* the combatants ARE the tokens homed in this scene — see 43-tokens.js */
  if (root.Tokens) root.Tokens.fill(t);
  if (S.sel && typeof entById === 'function' && !entById(S.sel)) S.sel = null;
  if (S.sug && typeof entById === 'function' && !entById(S.sug.id)) S.sug = null;

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

/* THE MAT IS THE GROUND. Its cloth, the two halves' washes and the ink its
   lines are named in come from the terrain's own row (21-table-content.js),
   written as custom properties 14-war.css paints with — so a new terrain is
   a new row and never a new rule. */
function matColours(node, id) {
  const t = root.TableContent.TERRAINS[id]; if (!t || !node) return;
  node.style.setProperty('--mat', t.mat.ground);
  node.style.setProperty('--mat-edge', t.mat.edge);
  node.style.setProperty('--mat-ink', t.mat.ink);
  node.style.setProperty('--mat-en', t.mat.en);
  node.style.setProperty('--mat-al', t.mat.al);
}

function hide() {
  const p = el(); if (!p) return;
  /* A FIGHT THAT ENDS UNDER YOU LETS YOU GO. The GM putting the scene away
     hid the sheet and left anybody locked onto it — or standing in its field
     — locked onto nothing: the field kept drawing a board that was gone, and
     the kit stayed hidden under it (13-table-ui.css hides it in the field). */
  if (root.Table3D && root.Table3D.locked === p) root.Table3D.unlock(true);
  p.style.display = 'none';
  shownId = null;
  if (root.Muster) root.Muster.paint();
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
    /* the tracker is the same fight, read the other way round */
    if (root.Muster) root.Muster.paint();
    /* app.js splices ents between lines; which line a token is in has to be
       written back onto the token or it is lost on reload */
    if (root.Tokens && root.TableModel) {
      const live = root.TableModel.activeScene();
      if (live && live.scene === 'combat') {
        root.Tokens.harvest(live);
        /* and the turn, written back onto the scene so it travels (show) */
        if (typeof S !== 'undefined' && live.id === shownId && fightNow() !== heardFight) {
          heardFight = fightNow();
          live.fight = { round: S.round, phase: S.phase,
                         sug: S.sug || null, intent: S.intent || null };
        }
      }
    }
    /* SOON, NOT NOW. save() writes the whole table out as JSON — pictures
       and all — and the sheet renders on every change anybody at the table
       makes to the fight, so at a busy table this was megabytes stringified
       synchronously many times a round. The model's own coalesced save is
       the same write, once, when the page is idle. */
    if (root.TableModel) (root.TableModel.saveSoon || root.TableModel.save).call(root.TableModel);
    /* AND THE TABLE HEARS ABOUT IT. grumkata: "moving tokens does not sync
       properly". A move on the combat sheet was written down here and told
       to nobody: this saves, it does not go through the model's change hook
       (it cannot — that hook repaints the wood, the repaint shows the sheet,
       and showing the sheet renders), so 60-board-net.js never heard that a
       unit had changed lines or taken a wound. The fight only reached the
       other tables when something ELSE on the wood happened to move. */
    if (root.BoardNet && root.BoardNet.soon) root.BoardNet.soon();
    return out;
  };
  wrapped.__saves = true;
  root.render = wrapped;
}

root.CombatScene = { show, hide, moved, el, hookSave, matColours };

})(window, document);
