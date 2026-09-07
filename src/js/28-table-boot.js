/* ══════════════════════════════════════════════════════════════
   26-table-boot.js — starts the table.

   Last of the table files on purpose: everything it calls has to
   already be on `window`. Kept apart from the modules themselves
   so that loading them has no side effects and they stay testable.

   Order matters: the viewport raises #vp and #tbl, the props need
   #tbl to exist before they can be drawn into it, and the toolbox
   puts its chest on the wood the props layer is about to paint.

   The table id comes off the URL because that is the contract the
   hall already uses — menu2.js sends you here with ?table=<id>.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

let booted = null;

function boot(tableId) {
  /* the table is proto's markup: #vp and #tbl are already in the page */
  if (!doc.getElementById('tbl') || !root.TableModel || !root.Table3D) return;

  /* The id comes from the hall, which knows which table you asked for.
     ?table= still works so a table can be opened straight from a link. */
  const id = tableId || (new URLSearchParams(root.location.search)).get('table') || 'table';

  if (booted === id) return;                 /* already standing */
  if (booted) { root.TableModel.load(id); root.TableProps.paint(); booted = id; return; }
  booted = id;
  root.TableModel.load(id);

  root.Table3D.mount();
  if (root.TableGL) root.TableGL.build();
  if (root.CombatScene) root.CombatScene.hookSave();
  root.TableProps.mount();
  root.Toolbox.mount();

  /* if a session hands out a role later, the box has to notice */
  root.addEventListener('monarchy:role', () => root.Toolbox.gate());
}

/* NOT booted on load: the app opens in the hall, and 42-shell.js raises the
   table the first time you walk into one — including straight in from
   ?table=<id>. Booting here as well would race it. */

root.TableBoot = { boot };

})(window, document);
