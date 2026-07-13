'use strict';
/* ══════════════════════════════════════════════════════════════
   APP SHELL
   Title screen -> table scene handoff, plus the table's own control
   panel (create/open/save character, global theme). Wires into the
   EXISTING session-sync/saves-io functions rather than duplicating
   them — see PROJECT.md 3.10/3.11 for the full rundown.
══════════════════════════════════════════════════════════════ */

function dismissTitleScreen() {
  const el = document.getElementById('title-screen');
  if (el) el.classList.add('hidden');
}

function returnToTitle() {
  if (typeof _sessionRole !== 'undefined' && _sessionRole) {
    if (!confirm('Leave the current session and return to the title screen?')) return;
    leaveSession();
  }
  const el = document.getElementById('title-screen');
  if (el) el.classList.remove('hidden');
}

/* ---- Title screen entry points ----
   None of these open the sheet window automatically — the table
   starts empty; the player explicitly creates or opens a character
   from the left control panel once they're on the table. */
function titleOpenLocal() {
  dismissTitleScreen();
}

function _renderTitleServerSelect(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const servers = getServers();
  const prevValue = sel.value;
  sel.innerHTML = servers.map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');
  if (prevValue && servers.find(s => s.id === prevValue)) sel.value = prevValue;
}

function titleOpenHostModal() {
  _renderTitleServerSelect('title-host-server-sel');
  document.getElementById('title-host-modal').classList.add('show');
}
function titleOpenJoinModal() {
  _renderTitleServerSelect('title-join-server-sel');
  document.getElementById('title-join-modal').classList.add('show');
}
function titleCloseModal(id) {
  document.getElementById(id).classList.remove('show');
}

/* Manage Servers is opened from inside a title modal; when it closes,
   refresh whichever title select is currently open so new/renamed
   servers show up immediately. */
function titleManageServers(fromSelectId) {
  openServerManageModal();
  const check = setInterval(() => {
    const modal = document.getElementById('server-modal');
    if (modal && modal.style.display === 'none') {
      clearInterval(check);
      _renderTitleServerSelect(fromSelectId);
    }
  }, 300);
}

function _applyChosenServer(fromSelectId) {
  const chosen = document.getElementById(fromSelectId).value;
  const realSel = document.getElementById('session-server-sel');
  if (realSel && chosen) realSel.value = chosen;
}

function titleConfirmHost() {
  _applyChosenServer('title-host-server-sel');
  titleCloseModal('title-host-modal');
  dismissTitleScreen();
  startSession('gm');
}

function titleConfirmJoin() {
  _applyChosenServer('title-join-server-sel');
  titleCloseModal('title-join-modal');
  dismissTitleScreen();
  startSession('player');
}

/* ---- Table left-panel controls ---- */

function tableCreateCharacter() {
  if (typeof _activeSaveId !== 'undefined' && _activeSaveId) {
    if (!confirm('Start a new blank character? Any unsaved changes to the current one will be lost.')) return;
  }
  restoreSheet({ v: 3 });
  setActiveSave(null, '');
  WM.open('sheet');
  if (typeof syncCombatPage === 'function') syncCombatPage();
}

function tableOpenCharacterModal() {
  const saves = getSaves();
  const keys = Object.keys(saves).reverse();
  const listEl = document.getElementById('table-open-char-list');
  if (!keys.length) {
    listEl.innerHTML = '<div class="table-open-char-empty">No saved characters yet \u2014 use Create Character first.</div>';
  } else {
    listEl.innerHTML = keys.map(id => {
      const s = saves[id];
      return '<div class="table-open-char-entry" onclick="tableOpenCharacterConfirm(\'' + id + '\')">' +
        '<span class="table-open-char-name">' + esc(s.name) + '</span>' +
        '<span class="table-open-char-date">' + esc(s.date || '') + '</span></div>';
    }).join('');
  }
  document.getElementById('table-open-char-modal').classList.add('show');
}

function tableOpenCharacterConfirm(id) {
  titleCloseModal('table-open-char-modal');
  loadCharacter(id); // existing: confirms, restores, sets active save, toasts
  WM.open('sheet');
  if (typeof syncCombatPage === 'function') syncCombatPage();
}

function tableSaveAll() {
  if (typeof _activeSaveId !== 'undefined' && _activeSaveId) {
    quickSave();
  } else {
    openSaveModal();
  }
}

function tableToggleTheme() {
  toggleDarkMode(); // existing, global (document.body), see 12-app-utils.js
}

/* ---- Register the character sheet as the first table window ----
   startOpen:false — the table starts empty; Create/Open Character
   (above) are what actually bring the sheet window on screen. */
WM.register('sheet', {
  title: 'Character Sheet',
  icon: '\uD83D\uDCDC',
  defaultRect: { x: 60, y: 40, w: 720, h: 780 },
  minW: 380,
  minH: 340,
  startOpen: false
});

WM.enableScaling('sheet', { rootSelector: '#sheet-root', naturalWidth: 980 });
