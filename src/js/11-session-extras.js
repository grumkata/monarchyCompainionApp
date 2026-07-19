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

/* ══ CONNECTED PLAYERS & CHIP LINKING ══ */
let _playerName = '';
let _connectedPlayers = {};

function getMyPlayerName() {
  if (_playerName) return _playerName;
  const sheetName = val('id-name');
  if (sheetName && sheetName.trim()) { _playerName = sheetName.trim(); return _playerName; }
  const name = prompt('Enter your player name (displayed on the battlefield):');
  if (name && name.trim()) {
    _playerName = name.trim();
    const nameEl = document.getElementById('id-name');
    if (nameEl && !nameEl.value.trim()) nameEl.value = _playerName;
  }
  return _playerName || 'Player';
}
