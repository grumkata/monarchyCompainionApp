'use strict';
/* ══════════════════════════════════════════════════════════════
   APP SHELL
   Title screen -> table scene handoff. Registers the character
   sheet as the first table window and wires the title screen's
   three entry points into the EXISTING session-sync system
   (startSession/getServers) rather than duplicating that logic.
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

/* ---- Title screen: Open Local Table (no session) ---- */
function titleOpenLocal() {
  dismissTitleScreen();
  WM.open('sheet');
}

/* ---- Shared server-picker rendering for the host/join modals ---- */
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
  WM.open('sheet');
  startSession('gm');
}

function titleConfirmJoin() {
  _applyChosenServer('title-join-server-sel');
  titleCloseModal('title-join-modal');
  dismissTitleScreen();
  WM.open('sheet');
  startSession('player');
}

/* ---- Register the character sheet as the first table window ---- */
WM.register('sheet', {
  title: 'Character Sheet',
  icon: '\uD83D\uDCDC',
  defaultRect: { x: 60, y: 40, w: 720, h: 780 },
  minW: 380,
  minH: 340,
  startOpen: true
});
