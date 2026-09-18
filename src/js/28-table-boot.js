/* ══════════════════════════════════════════════════════════════
   28-table-boot.js — starts the table.

   Last of the table files on purpose: everything it calls has to
   already be on `window`. Kept apart from the modules themselves
   so that loading them has no side effects and they stay testable.

   Order matters: the viewport raises #vp and #tbl, the props need
   #tbl to exist before they can be drawn into it, and the toolbox
   puts its chest on the wood the props layer is about to paint.

   The table id comes off the URL because that is the contract the
   hall already uses — menu2.js sends you here with ?table=<id>.

   ══ RAISING THE ROOM, AND LAYING THE TABLE ════════════════════
   grumkata: going from the menu to the table is laggy.

   It was, and measuring it split the boot cleanly in two:

     THE ROOM   Table3D.mount, TableGL.build, TableGL.warm — the viewport,
                sixty thousand triangles of tavern, and every shader in it.
                About 320ms of work on this machine, and it is the whole of
                the hitch. None of it reads TableModel: the room is the same
                room whichever table you are opening.
     THE TABLE  TableModel.load, TableProps.mount, Toolbox.mount — a
                millisecond and a half, and the only part that knows which
                table you asked for.

   Because the room does not depend on the table, it does not have to wait
   for you to ask for one. `warm()` raises it while you are still standing
   in the hall looking at the banners, where 320ms costs nothing, and by the
   time you take one down there is nothing left to do but lay the wood.

   A NOTE ON WHAT DID NOT WORK, so it is not tried again: the first attempt
   ran the boot a piece per frame under the cloth, on the theory that the
   browser cannot draw during a synchronous call. Measured on the actual GPU
   it was WORSE — 981ms of frozen frames against 449ms, and five stutters
   instead of two — because each piece still blocked, and the frames between
   them only added waiting. (The software renderer the browser tests use says
   the opposite, loudly. It compiles shaders on the CPU and cannot defer
   anything, so it is not evidence about a real machine.) Moving the work is
   worth more than slicing it.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

let booted = null;      /* the table whose props are on the wood */
let raised = false;     /* the room is up, with or without a table in it */

const ready = () => !!(doc.getElementById('tbl') && root.TableModel && root.Table3D);
const idFor = t => t || (new URLSearchParams(root.location.search)).get('table') || 'table';
const tryTo = f => { try { f(); } catch (e) { console.error(e); } };

/* ══ THE ROOM ══════════════════════════════════════════════════
   Everything here is independent of which table you are opening, which is
   exactly why it can be done early. Safe to call from the hall: #vp is
   display:none there, so the viewport measures itself at zero — 42-shell.js
   already re-fits after the swap for precisely that reason. */
function raiseRoom(alsoCompile) {
  if (raised || !ready()) return false;
  raised = true;
  tryTo(() => root.Table3D.mount());
  tryTo(() => { if (root.TableGL) root.TableGL.build(); });
  /* ONLY WHEN NOBODY IS WAITING. Linking every shader in the room and
     drawing one frame of it is the most expensive thing in the app, and
     that is exactly why it must not be added to a click. On the idle path
     it is free; on the click path it would be a bill the old code never
     charged — which is the regression the first version of this shipped
     with, and what grumkata felt as the transition being "basically
     skipped". Left undone here, the room compiles as it draws, exactly as
     it always did. */
  if (alsoCompile) tryTo(() => { if (root.TableGL && root.TableGL.warm) root.TableGL.warm(); });
  return true;
}
/* from the hall, with time to spare */
function warm() { return raiseRoom(true); }

/* ══ THE TABLE ═════════════════════════════════════════════════
   Whatever this does is done inside the Bend's `mid`, with the cover down
   and its animation stopped for the whole of it — so the ONLY rule here is
   that it stays short. Anything that can be done earlier belongs in
   raiseRoom above; anything that can be done later belongs after the cover
   has lifted. */
function boot(tableId) {
  if (!ready()) return;
  const id = idFor(tableId);
  if (booted === id) return;                 /* already standing */
  raiseRoom(false);                          /* a no-op if the hall got there first */

  if (booted) {                              /* a different table onto the same wood */
    tryTo(() => { root.TableModel.load(id); root.TableProps.paint(); });
    booted = id;
    return;
  }
  booted = id;
  tryTo(() => root.TableModel.load(id));
  tryTo(() => { if (root.CombatScene) root.CombatScene.hookSave(); });
  tryTo(() => root.TableProps.mount());
  tryTo(() => root.Toolbox.mount());
  /* if a session hands out a role later, the box has to notice */
  root.addEventListener('monarchy:role', () => root.Toolbox.gate());
}

/* NOT booted on load: the app opens in the hall, and 42-shell.js raises the
   table the first time you walk into one — including straight in from
   ?table=<id>. Booting here as well would race it. */

root.TableBoot = { boot, warm,
                   get standing() { return booted; },
                   get raised() { return raised; } };

})(window, document);
