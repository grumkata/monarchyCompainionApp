/* ══════════════════════════════════════════════════════════════
   26-table-boot.js — starts the table.

   Last of the table files on purpose: everything it calls has to
   already be on `window`. Kept apart from the modules themselves
   so that loading them has no side effects and they stay testable.

   Order matters here. The viewport builds #vp and #tbl; the props
   need #tbl to exist before they can be drawn into it; the
   toolbox measures the shell's rails, which needs a laid-out
   viewport to sit clear of.
══════════════════════════════════════════════════════════════ */
(function (root, doc) {
'use strict';

function boot() {
  const surface = doc.getElementById('table-surface');
  if (!surface || !root.TableModel || !root.Table3D) return;

  /* one table for now; when tables are picked from the hall this
     takes the id it was opened with */
  const id = (new URLSearchParams(root.location.search)).get('table') || 'table';
  root.TableModel.load(id);

  /* the table is the screen while you are at it */
  doc.body.classList.add('at-table');

  root.Table3D.mount(surface);
  if (root.TableGL) root.TableGL.build();
  root.TableProps.mount();
  root.Toolbox.mount(surface);

  /* if a session hands out a role later, the box has to notice */
  root.addEventListener('monarchy:role', () => root.Toolbox.gate());
}

if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
else boot();

root.TableBoot = { boot };

})(window, document);
