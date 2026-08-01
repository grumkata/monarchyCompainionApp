/* ══ MULTI-SHEET: independent, simultaneously-editable character sheets ══

   Every sheet-side file (00 through roughly 08) was written against ONE
   fixed set of global ids (hp-cur, attr-str, id-name, ...) reached via
   bare document.getElementById calls, everywhere, on purpose - see
   PROJECT.md 2.2. Rewriting every one of those call sites to be
   instance-scoped would touch nearly the whole codebase and risk breaking
   the cross-file coupling that doc explicitly says is intentional, not
   tech debt.

   Instead: every field element inside a sheet instance's root carries
   BOTH its real id (when that instance is "active") and a permanent
   data-field mirror of that same id (added once, mechanically, to the
   template markup - see index.html). Only ONE sheet instance wears the
   real ids at any moment. claimSheetIds/releaseSheetIds move that
   ownership between instances, so every *existing* id-based function in
   00-08 keeps working completely unchanged for whichever instance most
   recently had a user interact with it - nothing in those files needed to
   change. Each instance's actual values always live in its own DOM
   subtree regardless of which one currently owns the ids; they are never
   shared or overwritten, just "wired live" one at a time.

   The one thing this needs care around: anything that WRITES via those
   ids on a timer (autosave) must be flushed against the OUTGOING instance
   before ids move to the incoming one, or a save could land in the wrong
   slot - see flushActiveSheetWrites(). Verified against a 2-instance test:
   independent values, correct save-slot targeting, no cross-contamination
   (see test/multi-sheet.test.js).

   KNOWN GAP, not addressed by this file: combat's HP-max mirroring
   (07-combat-window.js reading/writing page-1 vitals directly) and
   session-sync's player identity are still effectively tied to whichever
   instance is active when they fire, not to "the specific character a
   given combat chip represents." Fine for now since only one instance is
   ever the ids-owner at a time, but worth a real design pass before
   leaning on combat + multi-instance together. */

const _sheetInstances = []; // [{ winId, root, winEl }], in creation order
let _activeSheetRoot = null;
let _sheetInstanceSeq = 1;

function _sheetFieldEls(root) {
  return root.querySelectorAll('[data-field]');
}

function releaseSheetIds(root) {
  if (!root) return;
  _sheetFieldEls(root).forEach(el => el.removeAttribute('id'));
}

function claimSheetIds(root) {
  if (!root) return;
  _sheetFieldEls(root).forEach(el => { el.id = el.dataset.field; });
}

/* Forces the debounced autosave (08-saves-io.js) to run NOW, against
   whichever instance currently owns the ids - called right before we
   hand those ids to a different instance, so a pending write can never
   land in the wrong save slot. */
function flushActiveSheetWrites() {
  if (typeof _autosaveTimer === 'undefined' || !_autosaveTimer) return;
  clearTimeout(_autosaveTimer);
  _autosaveTimer = null;
  if (typeof _activeSaveId === 'undefined' || !_activeSaveId) return;
  const saves = getSaves();
  if (!saves[_activeSaveId]) return;
  saves[_activeSaveId].data = serializeSheet();
  saves[_activeSaveId].date = new Date().toLocaleDateString();
  _ls.set('monarchy_v3_saves', JSON.stringify(saves));
}

function activateSheetInstance(root) {
  if (!root || root === _activeSheetRoot) return;
  if (_activeSheetRoot) {
    flushActiveSheetWrites();
    // Stash THIS instance's own "which save is this" pointer before
    // letting go of the ids, so re-activating it later restores the
    // right save-slot/label instead of whatever the last-focused
    // instance happened to be pointed at.
    _activeSheetRoot.dataset.activeSaveId = (typeof _activeSaveId !== 'undefined' && _activeSaveId) || '';
    releaseSheetIds(_activeSheetRoot);
  }
  claimSheetIds(root);
  _activeSheetRoot = root;
  const restoredId = root.dataset.activeSaveId || null;
  const saves = getSaves();
  const name = restoredId && saves[restoredId] ? saves[restoredId].name : '';
  setActiveSave(restoredId, name);
}

function _wireSheetInstanceActivation(root, winEl) {
  // Capture phase, and on mousedown/focusin rather than click: this needs
  // to run BEFORE any click/input handler inside the window fires, so the
  // very first interaction after switching windows already targets the
  // right instance. No stray edit can land on the previously-active one.
  winEl.addEventListener('mousedown', () => activateSheetInstance(root), true);
  winEl.addEventListener('focusin', () => activateSheetInstance(root), true);
}

function _setSheetTitlebarLabel(winEl, name) {
  const span = winEl.querySelector('.window-titlebar > span');
  if (span) span.textContent = name ? ('\uD83D\uDCDC ' + name) : '\uD83D\uDCDC Character Sheet';
}

/* Clones the ORIGINAL sheet window's markup into a new, independent,
   fully-live WM window. opts: { blank, loadId, title } */
function createSheetInstance(opts) {
  opts = opts || {};
  const templateWin = document.querySelector('.table-window[data-window-id="sheet"]');
  const winId = 'sheet-' + (++_sheetInstanceSeq);

  const clone = templateWin.cloneNode(true);
  clone.setAttribute('data-window-id', winId);
  clone.removeAttribute('style'); // WM.register/applyRect sets its own inline position

  const clonedRoot = clone.querySelector('[data-sheet-root]');
  // A clone must never carry a second #sheet-root - only the original
  // template instance keeps that id, permanently (PROJECT.md rule 12).
  clonedRoot.removeAttribute('id');
  releaseSheetIds(clonedRoot); // unclaimed until this instance is activated

  templateWin.parentElement.appendChild(clone);

  WM.register(winId, {
    title: opts.title || 'Character Sheet',
    icon: '\uD83D\uDCDC',
    defaultRect: {
      x: 90 + (_sheetInstances.length * 30) % 300,
      y: 70 + (_sheetInstances.length * 30) % 220,
      w: 640, h: 700
    }
  });
  WM.enableScaling(winId, { rootSelector: '[data-sheet-root]', naturalWidth: 980 });

  _sheetInstances.push({ winId, root: clonedRoot, winEl: clone });
  _wireSheetInstanceActivation(clonedRoot, clone);

  activateSheetInstance(clonedRoot);
  if (opts.loadId) {
    const saves = getSaves(); const entry = saves[opts.loadId];
    if (entry) { restoreSheet(entry.data); setActiveSave(opts.loadId, entry.name); }
  } else {
    restoreSheet({ v: 4 }); // blank
  }
  _setSheetTitlebarLabel(clone, val('id-name'));
  WM.focus(winId);
  return clonedRoot;
}

/* Find an already-open instance for a given save id, if any - so opening
   a character that's already open focuses it instead of duplicating it. */
function findSheetInstanceForSave(saveId) {
  if (_activeSheetRoot && typeof _activeSaveId !== 'undefined' && _activeSaveId === saveId) {
    return _sheetInstances.find(inst => inst.root === _activeSheetRoot) || null;
  }
  return _sheetInstances.find(inst => inst.root.dataset.activeSaveId === saveId) || null;
}

/* Wire the ORIGINAL instance into the same system on load. It already
   owns the real ids from page load (that's just how the HTML parsed),
   so it becomes "active" with no extra claim step needed. */
document.addEventListener('DOMContentLoaded', function () {
  const originalRoot = document.getElementById('sheet-root'); // permanent id, never released
  const originalWinEl = document.querySelector('.table-window[data-window-id="sheet"]');
  if (!originalRoot || !originalWinEl) return;
  _sheetInstances.push({ winId: 'sheet', root: originalRoot, winEl: originalWinEl });
  _wireSheetInstanceActivation(originalRoot, originalWinEl);
  _activeSheetRoot = originalRoot;
});
