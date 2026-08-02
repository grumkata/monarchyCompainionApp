/* ══ FOG OF WAR ══
   GM-side toggle lives in the sheet's Multiplayer tab; the actual
   #fog-overlay it drives now lives in the Combat window, reached the
   same way it always was — direct DOM access, since both are part of
   the same document regardless of which table window they render in. */
function toggleFog(enabled) {
  const statusEl = document.getElementById('gm-fog-status');
  if (statusEl) statusEl.style.display = enabled ? 'block' : 'none';
  clearTimeout(_pushTimer); _pushTimer = setTimeout(pushBattlefield, 300);
  showToast(enabled ? '🌫 Battlefield hidden from players' : '✓ Battlefield visible to players');
}

/* ══ GLOBAL MANA ══
   GM adjusts from the Multiplayer tab (global-mana-val); the
   player-facing readout (global-mana-player-val) lives in the Combat
   window — same reasoning as fog, above. */
let _globalMana = 0;
let _globalManaVisible = true;

function adjGlobalMana(delta) {
  _globalMana = Math.max(0, _globalMana + delta);
  const el = document.getElementById('global-mana-val');
  if (el) el.textContent = _globalMana;
  // Also update the player-facing display if present
  const playerEl = document.getElementById('global-mana-player-val');
  if (playerEl) playerEl.textContent = _globalMana;
  clearTimeout(_pushTimer); _pushTimer = setTimeout(pushBattlefield, 200); // faster for mana
}

// Called on mana visibility checkbox change , DON'T reset mana value
document.addEventListener('DOMContentLoaded', function() {
  const cb = document.getElementById('gm-mana-visible');
  if (cb) cb.addEventListener('change', function() {
    _globalManaVisible = this.checked;
    clearTimeout(_pushTimer); _pushTimer = setTimeout(pushBattlefield, 300);
  });
});

/* ══ CONNECTED PLAYERS & CHIP LINKING ══
   Player identity is now a real embedded input (player-identity-bar in
   index.html), not a prompt() popup. It is deliberately a separate concept
   from the character's in-fiction name on Page I - "Jake" playing "Sir
   Reginald". Persisted locally so it survives a restart; pushed out to
   other players the same way the rest of buildPlayerVitalsPayload() is
   (see 09-session-sync.js). */
let _playerName = '';
let _playerAvatar = '';
let _connectedPlayers = {};
const DEFAULT_PLAYER_AVATAR = 'assets/images/tokens/_default-ally.svg';

function getMyPlayerName() {
  if (_playerName) return _playerName;
  const stored = _ls.get('monarchy_player_name');
  if (stored) { _playerName = stored; return _playerName; }
  const sheetName = val('id-name');
  if (sheetName && sheetName.trim()) return sheetName.trim(); // fallback only, not persisted as _playerName
  return 'Player';
}

function setMyPlayerName(value) {
  _playerName = (value || '').trim();
  _ls.set('monarchy_player_name', _playerName);
  if (typeof scheduleAutosave === 'function') { /* no-op hook point; identity isn't sheet data */ }
  if (typeof _pushTimer !== 'undefined') { clearTimeout(_pushTimer); _pushTimer = setTimeout(() => { if (typeof pushBattlefield === 'function') pushBattlefield(); }, 400); }
}

function getMyPlayerAvatar() {
  if (_playerAvatar) return _playerAvatar;
  const stored = _ls.get('monarchy_player_avatar');
  return stored || '';
}

function handleAvatarFileChosen(inputEl) {
  const file = inputEl.files && inputEl.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { showToast('That\u2019s not an image file'); return; }
  const reader = new FileReader();
  reader.onload = function () {
    _playerAvatar = reader.result; // data: URL - self-contained, no separate asset file needed
    _ls.set('monarchy_player_avatar', _playerAvatar);
    const img = document.getElementById('player-avatar-img');
    if (img) img.src = _playerAvatar;
    if (typeof _pushTimer !== 'undefined') { clearTimeout(_pushTimer); _pushTimer = setTimeout(() => { if (typeof pushBattlefield === 'function') pushBattlefield(); }, 400); }
  };
  reader.readAsDataURL(file);
}

/* Restore any previously-chosen identity on load - real files/values, no
   CSS or emoji stand-in, per the same asset-first rule as everything
   else touching a game-facing visual. */
document.addEventListener('DOMContentLoaded', function () {
  const nameEl = document.getElementById('player-username-input');
  const storedName = _ls.get('monarchy_player_name');
  if (nameEl && storedName) nameEl.value = storedName;
  _playerName = storedName || '';

  const img = document.getElementById('player-avatar-img');
  const storedAvatar = _ls.get('monarchy_player_avatar');
  if (img) img.src = storedAvatar || DEFAULT_PLAYER_AVATAR;
  _playerAvatar = storedAvatar || '';
});

/* ══ GM TOOLS PANEL: expand/collapse ══
   Used to be reachable only by switching to the "Multiplayer" tab, which
   hid Page I/II entirely while looking at it. Now it's a section within
   the always-visible embedded panel, collapsed by default so a player who
   never GMs doesn't carry that vertical space permanently. */
function setGmToolsPanelExpanded(expanded) {
  const panel  = document.getElementById('gm-tools-panel');
  const toggle = document.getElementById('gm-tools-toggle');
  if (panel)  panel.classList.toggle('expanded', expanded);
  if (toggle) {
    toggle.textContent = (expanded ? '\u25be' : '\u25b8') + ' GM Tools';
    toggle.style.display = (typeof _sessionRole !== 'undefined' && _sessionRole === 'gm') ? '' : 'none';
  }
}

function toggleGmToolsPanel() {
  const panel = document.getElementById('gm-tools-panel');
  setGmToolsPanelExpanded(panel ? !panel.classList.contains('expanded') : true);
}
